import { FC, useEffect, useState, useRef, MouseEvent } from "react";
import { OriginalTextSelectionInfo } from "../../../types/editor";

export interface ParsedTextLine {
  id: string;
  text: string;
  x: number; // %
  y: number; // %
  width: number; // %
  height: number; // %
  fontSize: number; // unscaled pt
  isBold: boolean;
  isItalic: boolean;
  fontFamily: string;
  pxX: number;
  pxY: number;
  pxW: number;
  pxH: number;
}

interface CanvasTextSelectorProps {
  pdfJsDoc: any;
  activeOriginalIndex: number | null;
  activeRotation: number;
  scale: number;
  tool: "pen" | "highlighter" | "eraser" | "select";
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  selectionInfo: OriginalTextSelectionInfo | null;
  onTextSelected: (info: OriginalTextSelectionInfo | null) => void;
  onEditOriginalText: (info: OriginalTextSelectionInfo) => void;
}

/**
 * Samples the dominant foreground text color and background color from the canvas
 * within a given pixel bounding box.
 */
function sampleCanvasColors(
  canvas: HTMLCanvasElement | null,
  pxX: number,
  pxY: number,
  pxW: number,
  pxH: number
): { textColor: string; bgColor: string } {
  if (!canvas || pxW <= 0 || pxH <= 0) {
    return { textColor: "#0f172a", bgColor: "#ffffff" };
  }

  try {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { textColor: "#0f172a", bgColor: "#ffffff" };

    const clX = Math.max(0, Math.min(canvas.width - 1, pxX));
    const clY = Math.max(0, Math.min(canvas.height - 1, pxY));
    const clW = Math.max(1, Math.min(canvas.width - clX, pxW));
    const clH = Math.max(1, Math.min(canvas.height - clY, pxH));

    const imgData = ctx.getImageData(clX, clY, clW, clH);
    const data = imgData.data;

    let bgR = 255, bgG = 255, bgB = 255;
    const cornerIndices = [
      0,
      (clW - 1) * 4,
      ((clH - 1) * clW) * 4,
      ((clH - 1) * clW + (clW - 1)) * 4,
    ];

    let cornerRSum = 0, cornerGSum = 0, cornerBSum = 0, cornerCount = 0;
    for (const idx of cornerIndices) {
      if (idx < data.length - 3 && data[idx + 3] > 100) {
        cornerRSum += data[idx];
        cornerGSum += data[idx + 1];
        cornerBSum += data[idx + 2];
        cornerCount++;
      }
    }
    if (cornerCount > 0) {
      bgR = Math.round(cornerRSum / cornerCount);
      bgG = Math.round(cornerGSum / cornerCount);
      bgB = Math.round(cornerBSum / cornerCount);
    }

    let fgRSum = 0, fgGSum = 0, fgBSum = 0, fgCount = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 50) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const diffFromBg = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
      if (diffFromBg > 60) {
        fgRSum += r;
        fgGSum += g;
        fgBSum += b;
        fgCount++;
      }
    }

    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    const bgHex = `#${toHex(bgR)}${toHex(bgG)}${toHex(bgB)}`;

    if (fgCount > 0) {
      const avgR = Math.round(fgRSum / fgCount);
      const avgG = Math.round(fgGSum / fgCount);
      const avgB = Math.round(fgBSum / fgCount);
      return { textColor: `#${toHex(avgR)}${toHex(avgG)}${toHex(avgB)}`, bgColor: bgHex };
    }

    return { textColor: "#0f172a", bgColor: bgHex };
  } catch {
    return { textColor: "#0f172a", bgColor: "#ffffff" };
  }
}

export const CanvasTextSelector: FC<CanvasTextSelectorProps> = ({
  pdfJsDoc,
  activeOriginalIndex,
  activeRotation,
  scale,
  tool,
  canvasRef,
  selectionInfo,
  onTextSelected,
  onEditOriginalText,
}) => {
  const [textLines, setTextLines] = useState<ParsedTextLine[]>([]);
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drag selection box state
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);

  // Extract PDF text items from PDF.js document (without rendering any DOM text)
  useEffect(() => {
    if (!pdfJsDoc || activeOriginalIndex === null) {
      setTextLines([]);
      return;
    }

    const pageIndex = activeOriginalIndex;
    let active = true;

    async function extractTextContent() {
      try {
        const pdfPage = await pdfJsDoc.getPage(pageIndex + 1);
        if (!active) return;

        const baseVp = pdfPage.getViewport({ scale: 1, rotation: activeRotation });
        const targetWidth = Math.min(800, baseVp.width) * scale;
        const targetScale = targetWidth / pdfPage.getViewport({ scale: 1, rotation: 0 }).width;
        const vp = pdfPage.getViewport({ scale: targetScale, rotation: activeRotation });

        const textContent = await pdfPage.getTextContent();
        if (!active) return;

        const styles = textContent.styles || {};
        const rawItems: {
          str: string;
          x: number;
          y: number;
          width: number;
          height: number;
          fontSize: number;
          isBold: boolean;
          isItalic: boolean;
          fontFamily: string;
          pxX: number;
          pxY: number;
          pxW: number;
          pxH: number;
        }[] = [];

        for (const item of textContent.items) {
          if (!item.str || !item.str.trim()) continue;

          const tx = item.transform[4];
          const ty = item.transform[5];
          const [vx, vy] = vp.convertToViewportPoint(tx, ty);

          // Exact original PDF font size in PDF points (user units)
          const pdfFontSize = Math.round(
            Math.hypot(item.transform[2], item.transform[3]) ||
            Math.hypot(item.transform[0], item.transform[1]) ||
            12
          );

          // Scaled font height in viewport pixels
          const fontHeightPx = pdfFontSize * targetScale;
          const itemWidthPx = Math.max(6, (item.width || 0) * targetScale);
          const fontAscentPx = fontHeightPx * 0.78;

          const itemStyle = styles[item.fontName] || {};
          const styleFamily = (itemStyle.fontFamily || "").toLowerCase();
          const fontName = (item.fontName || "").toLowerCase();

          let fontFamily = "sans-serif";
          if (
            styleFamily.includes("serif") ||
            fontName.includes("times") ||
            fontName.includes("serif") ||
            fontName.includes("roman") ||
            fontName.includes("georgia") ||
            fontName.includes("cambria") ||
            fontName.includes("garamond") ||
            fontName.includes("palatino") ||
            fontName.includes("minion")
          ) {
            fontFamily = "serif";
          } else if (
            styleFamily.includes("mono") ||
            fontName.includes("courier") ||
            fontName.includes("mono") ||
            fontName.includes("consolas") ||
            fontName.includes("menlo")
          ) {
            fontFamily = "monospace";
          } else {
            fontFamily = "sans-serif";
          }

          const isBold =
            fontName.includes("bold") ||
            fontName.includes("black") ||
            fontName.includes("heavy") ||
            fontName.includes("semibold") ||
            fontName.includes("medium");
          const isItalic = fontName.includes("italic") || fontName.includes("oblique");

          const xPct = (vx / vp.width) * 100;
          const yPct = ((vy - fontAscentPx) / vp.height) * 100;
          const wPct = (itemWidthPx / vp.width) * 100;
          const hPct = (fontHeightPx / vp.height) * 100;

          rawItems.push({
            str: item.str,
            x: xPct,
            y: yPct,
            width: wPct,
            height: hPct,
            fontSize: pdfFontSize,
            isBold,
            isItalic,
            fontFamily,
            pxX: vx,
            pxY: vy - fontAscentPx,
            pxW: itemWidthPx,
            pxH: fontHeightPx,
          });
        }

        // Group adjacent items on the same horizontal line into lines
        const lines: ParsedTextLine[] = [];
        rawItems.sort((a, b) => Math.abs(a.y - b.y) > 0.5 ? a.y - b.y : a.x - b.x);

        for (const item of rawItems) {
          const lastLine = lines[lines.length - 1];
          if (
            lastLine &&
            Math.abs(lastLine.y - item.y) < 1.2 &&
            item.x >= lastLine.x &&
            item.x - (lastLine.x + lastLine.width) < 5.0
          ) {
            const newEndX = Math.max(lastLine.x + lastLine.width, item.x + item.width);
            lastLine.text += (lastLine.text.endsWith(" ") || item.str.startsWith(" ") ? "" : " ") + item.str;
            lastLine.width = newEndX - lastLine.x;
            lastLine.height = Math.max(lastLine.height, item.height);
            lastLine.fontSize = Math.max(lastLine.fontSize, item.fontSize);
            lastLine.isBold = lastLine.isBold || item.isBold;
            lastLine.isItalic = lastLine.isItalic || item.isItalic;
            if (item.fontFamily !== "sans-serif") lastLine.fontFamily = item.fontFamily;
            lastLine.pxW = Math.max(lastLine.pxW, (item.pxX + item.pxW) - lastLine.pxX);
          } else {
            lines.push({
              id: `line-${lines.length}-${Date.now()}`,
              text: item.str,
              x: item.x,
              y: item.y,
              width: item.width,
              height: item.height,
              fontSize: item.fontSize,
              isBold: item.isBold,
              isItalic: item.isItalic,
              fontFamily: item.fontFamily,
              pxX: item.pxX,
              pxY: item.pxY,
              pxW: item.pxW,
              pxH: item.pxH,
            });
          }
        }

        setTextLines(lines);
      } catch (err) {
        console.warn("Failed to parse PDF text content:", err);
      }
    }

    extractTextContent();

    return () => {
      active = false;
    };
  }, [pdfJsDoc, activeOriginalIndex, activeRotation, scale]);

  if (tool !== "select") return null;

  // Handle clicking a text line to select it
  const handleSelectLine = (line: ParsedTextLine, e: MouseEvent) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const clientLeft = containerRect.left + (line.x / 100) * containerRect.width;
    const clientTop = containerRect.top + (line.y / 100) * containerRect.height;
    const clientWidth = (line.width / 100) * containerRect.width;
    const clientHeight = (line.height / 100) * containerRect.height;

    // Sample actual canvas colors (foreground text color and background cover color)
    const canvas = canvasRef.current;
    let textColor = "#0f172a";
    let bgColor = "#ffffff";
    if (canvas) {
      const colors = sampleCanvasColors(
        canvas,
        (line.x / 100) * canvas.width,
        (line.y / 100) * canvas.height,
        (line.width / 100) * canvas.width,
        (line.height / 100) * canvas.height
      );
      textColor = colors.textColor;
      bgColor = colors.bgColor;
    }

    const info: OriginalTextSelectionInfo = {
      text: line.text,
      x: line.x,
      y: line.y,
      width: line.width,
      height: line.height,
      fontSize: line.fontSize,
      color: textColor,
      isBold: line.isBold,
      isItalic: line.isItalic,
      backgroundColor: bgColor,
      fontFamily: line.fontFamily,
      clientRect: {
        left: clientLeft,
        top: clientTop,
        right: clientLeft + clientWidth,
        bottom: clientTop + clientHeight,
        width: clientWidth,
        height: clientHeight,
      },
    };

    onTextSelected(info);
  };

  // Double-clicking directly triggers edit on that text line
  const handleDoubleClickLine = (line: ParsedTextLine, e: MouseEvent) => {
    e.stopPropagation();
    handleSelectLine(line, e);
    setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const clientLeft = containerRect.left + (line.x / 100) * containerRect.width;
      const clientTop = containerRect.top + (line.y / 100) * containerRect.height;
      const clientWidth = (line.width / 100) * containerRect.width;
      const clientHeight = (line.height / 100) * containerRect.height;

      const colors = sampleCanvasColors(
        canvasRef.current,
        (line.x / 100) * (canvasRef.current?.width || 600),
        (line.y / 100) * (canvasRef.current?.height || 800),
        (line.width / 100) * (canvasRef.current?.width || 600),
        (line.height / 100) * (canvasRef.current?.height || 800)
      );

      onEditOriginalText({
        text: line.text,
        x: line.x,
        y: line.y,
        width: line.width,
        height: line.height,
        fontSize: line.fontSize,
        color: colors.textColor,
        isBold: line.isBold,
        isItalic: line.isItalic,
        backgroundColor: colors.bgColor,
        fontFamily: line.fontFamily,
        clientRect: {
          left: clientLeft,
          top: clientTop,
          right: clientLeft + clientWidth,
          bottom: clientTop + clientHeight,
          width: clientWidth,
          height: clientHeight,
        },
      });
    }, 20);
  };

  // Drag-to-select multiple text lines
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target !== containerRef.current) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setIsDragSelecting(true);
    setDragStart({ x, y });
    setDragCurrent({ x, y });
    onTextSelected(null);
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragSelecting || !dragStart || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setDragCurrent({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDragSelecting || !dragStart || !dragCurrent || !containerRef.current) {
      setIsDragSelecting(false);
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    const minX = Math.min(dragStart.x, dragCurrent.x);
    const maxX = Math.max(dragStart.x, dragCurrent.x);
    const minY = Math.min(dragStart.y, dragCurrent.y);
    const maxY = Math.max(dragStart.y, dragCurrent.y);

    setIsDragSelecting(false);
    setDragStart(null);
    setDragCurrent(null);

    // If drag was tiny, treat as click
    if (maxX - minX < 1.0 && maxY - minY < 1.0) return;

    // Find all text lines intersected by the drag box
    const selected = textLines.filter(
      (l) => l.x + l.width >= minX && l.x <= maxX && l.y + l.height >= minY && l.y <= maxY
    );

    if (selected.length === 0) return;

    const combinedText = selected.map((s) => s.text).join(" ");
    const boxMinX = Math.min(...selected.map((s) => s.x));
    const boxMaxX = Math.max(...selected.map((s) => s.x + s.width));
    const boxMinY = Math.min(...selected.map((s) => s.y));
    const boxMaxY = Math.max(...selected.map((s) => s.y + s.height));
    const maxFontSize = Math.max(...selected.map((s) => s.fontSize));
    const isAnyBold = selected.some((s) => s.isBold);
    const isAnyItalic = selected.some((s) => s.isItalic);

    const containerRect = containerRef.current.getBoundingClientRect();
    const clientLeft = containerRect.left + (boxMinX / 100) * containerRect.width;
    const clientTop = containerRect.top + (boxMinY / 100) * containerRect.height;
    const clientWidth = ((boxMaxX - boxMinX) / 100) * containerRect.width;
    const clientHeight = ((boxMaxY - boxMinY) / 100) * containerRect.height;

    const colors = sampleCanvasColors(
      canvasRef.current,
      (boxMinX / 100) * (canvasRef.current?.width || 600),
      (boxMinY / 100) * (canvasRef.current?.height || 800),
      ((boxMaxX - boxMinX) / 100) * (canvasRef.current?.width || 600),
      ((boxMaxY - boxMinY) / 100) * (canvasRef.current?.height || 800)
    );

    onTextSelected({
      text: combinedText,
      x: boxMinX,
      y: boxMinY,
      width: boxMaxX - boxMinX,
      height: boxMaxY - boxMinY,
      fontSize: maxFontSize,
      color: colors.textColor,
      isBold: isAnyBold,
      isItalic: isAnyItalic,
      backgroundColor: colors.bgColor,
      fontFamily: "sans-serif",
      clientRect: {
        left: clientLeft,
        top: clientTop,
        right: clientLeft + clientWidth,
        bottom: clientTop + clientHeight,
        width: clientWidth,
        height: clientHeight,
      },
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="absolute inset-0 z-10 select-none overflow-hidden cursor-default"
      style={{ touchAction: "none" }}
    >
      {/* Interactive hover and click targets for each text line (WITHOUT text nodes) */}
      {textLines.map((line) => {
        const isHovered = hoveredLineId === line.id;
        const isSelected =
          selectionInfo &&
          Math.abs(selectionInfo.x - line.x) < 0.5 &&
          Math.abs(selectionInfo.y - line.y) < 0.5;

        return (
          <div
            key={line.id}
            onClick={(e) => handleSelectLine(line, e)}
            onDoubleClick={(e) => handleDoubleClickLine(line, e)}
            onMouseEnter={() => setHoveredLineId(line.id)}
            onMouseLeave={() => setHoveredLineId(null)}
            title="Click to select or double-click to edit original text"
            className={`absolute rounded transition-all duration-100 cursor-pointer ${
              isSelected
                ? "border-2 border-amber-500 bg-amber-500/25 ring-2 ring-amber-500/30 shadow-md"
                : isHovered
                ? "border border-amber-400 bg-amber-500/15 shadow-sm"
                : "border border-transparent hover:border-amber-400/80 hover:bg-amber-500/10"
            }`}
            style={{
              left: `${line.x}%`,
              top: `${line.y}%`,
              width: `${line.width}%`,
              height: `${line.height}%`,
            }}
          />
        );
      })}

      {/* Drag selection rectangle preview */}
      {isDragSelecting && dragStart && dragCurrent && (
        <div
          className="absolute border-2 border-amber-500 bg-amber-500/20 rounded pointer-events-none"
          style={{
            left: `${Math.min(dragStart.x, dragCurrent.x)}%`,
            top: `${Math.min(dragStart.y, dragCurrent.y)}%`,
            width: `${Math.abs(dragCurrent.x - dragStart.x)}%`,
            height: `${Math.abs(dragCurrent.y - dragStart.y)}%`,
          }}
        />
      )}
    </div>
  );
};
