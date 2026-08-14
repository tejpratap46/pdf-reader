import React, { useState, useEffect, useRef, FC, ChangeEvent } from "react";
import {
  PdfEditorProps,
  Point,
  DrawStroke,
  TextItem,
  ImageItem,
  StampItem,
  PageState,
  TabMode,
} from "./types/editor";
import { exportPdfHelper } from "./utils/pdfExport";
import { EditorHeader } from "./components/editor/EditorHeader";
import { EditorSidebar } from "./components/editor/EditorSidebar";
import { EditorCanvas } from "./components/editor/canvas/EditorCanvas";
import { SignatureModal } from "./components/editor/SignatureModal";
import { useResizableSidebar } from "./hooks/useResizableSidebar";
import { IcoChevR } from "./components/common/Icons";

export const PdfEditor: FC<PdfEditorProps> = ({
  pdfFileBytes,
  fileName,
  onClose,
  onSave,
  isDark,
}) => {
  const [pages, setPages] = useState<PageState[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<TabMode>("pages");
  const [pdfJsDoc, setPdfJsDoc] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  /* Resizable & Collapsible Editor Sidebar */
  const {
    width: sidebarWidth,
    isOpen: sidebarOpen,
    isDragging: isSidebarDragging,
    setIsOpen: setSidebarOpen,
    resetWidth: resetSidebarWidth,
    handleMouseDown: handleSidebarMouseDown,
    handleTouchStart: handleSidebarTouchStart,
  } = useResizableSidebar({
    storageKeyPrefix: "folio_editor_sidebar",
    defaultWidth: 320,
    minWidth: 260,
    maxWidth: 700,
    collapseThreshold: 140,
    defaultOpen: true,
  });

  /* Keyboard shortcut: Ctrl+B / Cmd+B */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setSidebarOpen]);
  const [scale, setScale] = useState<number>(1.0);

  // Drawing tool controls
  const [tool, setTool] = useState<"pen" | "highlighter" | "eraser" | "select">("select");
  const [penColor, setPenColor] = useState<string>("#ef4444");
  const [penSize, setPenSize] = useState<number>(3);
  const [highlighterColor, setHighlighterColor] = useState<string>("#fef08a");
  const [highlighterSize, setHighlighterSize] = useState<number>(18);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);

  // Text tool controls
  const [newText, setNewText] = useState<string>("Sample Text");
  const [textFontSize, setTextFontSize] = useState<number>(20);
  const [textColor, setTextColor] = useState<string>("#0f172a");
  const [textBold, setTextBold] = useState<boolean>(true);

  // Watermark/Stamp controls
  const [stampText, setStampText] = useState<string>("CONFIDENTIAL");
  const [stampColor, setStampColor] = useState<string>("#dc2626");
  const [stampOpacity, setStampOpacity] = useState<number>(0.25);
  const [stampRotation, setStampRotation] = useState<number>(-30);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showSigModal, setShowSigModal] = useState<boolean>(false);

  // Overlay Dragging State
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<"text" | "image" | null>(null);
  const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; initialX: number; initialY: number }>({
    mouseX: 0,
    mouseY: 0,
    initialX: 0,
    initialY: 0,
  });

  const startDrag = (
    e: React.MouseEvent,
    id: string,
    type: "text" | "image",
    initialX: number,
    initialY: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingId(id);
    setDragType(type);
    setDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX,
      initialY,
    });
  };

  // Overlay Resizing State
  const [resizingTextId, setResizingTextId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ mouseX: number; mouseY: number; initialSize: number }>({
    mouseX: 0,
    mouseY: 0,
    initialSize: 16,
  });

  const startResizeText = (e: React.MouseEvent, id: string, currentFontSize: number) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingTextId(id);
    setResizeStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialSize: currentFontSize,
    });
  };

  // History for undo
  const [history, setHistory] = useState<PageState[][]>([]);

  const pushHistory = (newPages: PageState[]) => {
    setHistory((prev) => [...prev.slice(-15), newPages]);
  };

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setPages(prev);
  };

  // 1. Initial load of PDF using PDF.js for rendering previews
  useEffect(() => {
    let active = true;
    async function initPdf() {
      try {
        setLoading(true);
        if (!window.pdfjsLib) {
          console.error("PDF.js library not available on window");
          setLoading(false);
          return;
        }
        const doc = await window.pdfjsLib.getDocument({
          data: pdfFileBytes.buffer.slice(pdfFileBytes.byteOffset, pdfFileBytes.byteOffset + pdfFileBytes.byteLength),
        }).promise;
        if (!active) return;
        setPdfJsDoc(doc);

        const initialPages: PageState[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const vp = page.getViewport({ scale: 1 });
          initialPages.push({
            id: `page-${i}-${Date.now()}`,
            originalIndex: i - 1,
            rotation: 0,
            width: vp.width,
            height: vp.height,
            strokes: [],
            texts: [],
            images: [],
            stamps: [],
          });
        }
        setPages(initialPages);
        setActivePageIndex(0);
      } catch (err) {
        console.error("Error loading PDF for editor:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    initPdf();
    return () => {
      active = false;
    };
  }, [pdfFileBytes]);

  const activePage = pages[activePageIndex];
  const activeOriginalIndex = activePage?.originalIndex ?? null;
  const activeRotation = activePage?.rotation ?? 0;
  const activeStrokes = activePage?.strokes;

  // Render PDF.js page onto background canvas
  useEffect(() => {
    if (!pdfJsDoc || !canvasRef.current) return;
    let cancelled = false;

    async function renderPage() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (activeOriginalIndex !== null && pdfJsDoc) {
        try {
          const pdfPage = await pdfJsDoc.getPage(activeOriginalIndex + 1);
          if (cancelled) return;

          const baseVp = pdfPage.getViewport({ scale: 1, rotation: activeRotation });
          const targetWidth = Math.min(800, baseVp.width) * scale;
          const targetScale = targetWidth / pdfPage.getViewport({ scale: 1, rotation: 0 }).width;
          const vp = pdfPage.getViewport({ scale: targetScale, rotation: activeRotation });

          canvas.width = vp.width;
          canvas.height = vp.height;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            await pdfPage.render({ canvasContext: ctx, viewport: vp }).promise;
          }
        } catch (e) {
          console.error("Error rendering PDF canvas:", e);
        }
      } else {
        // Blank page
        const width = 600 * scale;
        const height = 800 * scale;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
        }
      }
    }

    renderPage();
    return () => {
      cancelled = true;
    };
  }, [pdfJsDoc, activePageIndex, activeOriginalIndex, activeRotation, scale]);

  // Render strokes onto draw overlay canvas
  useEffect(() => {
    const canvas = drawOverlayRef.current;
    const bgCanvas = canvasRef.current;
    if (!canvas || !bgCanvas || !activePage) return;

    canvas.width = bgCanvas.width;
    canvas.height = bgCanvas.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;

    const drawStrokeOnCtx = (stroke: DrawStroke) => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size * scale;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = stroke.opacity;

      ctx.moveTo((stroke.points[0].x / 100) * w, (stroke.points[0].y / 100) * h);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo((stroke.points[i].x / 100) * w, (stroke.points[i].y / 100) * h);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    };

    (activeStrokes || []).forEach(drawStrokeOnCtx);

    if (currentStroke.length > 1) {
      const activeColor = tool === "highlighter" ? highlighterColor : penColor;
      const activeSize = tool === "highlighter" ? highlighterSize : penSize;
      const activeOpacity = tool === "highlighter" ? 0.35 : 1.0;

      drawStrokeOnCtx({
        id: "temp",
        points: currentStroke,
        color: activeColor,
        size: activeSize,
        opacity: activeOpacity,
      });
    }
  }, [activeStrokes, activePage?.id, currentStroke, scale, tool, penColor, penSize, highlighterColor, highlighterSize]);

  // Drawing Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === "select") return;
    const canvas = drawOverlayRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    setIsDrawing(true);
    setCurrentStroke([{ x: xPct, y: yPct }]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool === "select") return;
    const canvas = drawOverlayRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    setCurrentStroke((prev) => [...prev, { x: xPct, y: yPct }]);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke.length > 1 && activePage) {
      pushHistory(pages);
      const strokeColor = tool === "highlighter" ? highlighterColor : penColor;
      const strokeSize = tool === "highlighter" ? highlighterSize : penSize;
      const opacity = tool === "highlighter" ? 0.35 : 1.0;

      const newStroke: DrawStroke = {
        id: `stroke-${Date.now()}`,
        points: currentStroke,
        color: strokeColor,
        size: strokeSize,
        opacity,
      };

      setPages((prevPages) =>
        prevPages.map((pg, idx) =>
          idx === activePageIndex
            ? { ...pg, strokes: [...pg.strokes, newStroke] }
            : pg
        )
      );
    }
    setCurrentStroke([]);
  };

  // Dragging Effect for Overlay Movement
  useEffect(() => {
    if (!draggingId || !dragType) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const bgCanvas = canvasRef.current;
      if (!bgCanvas) return;
      const rect = bgCanvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const deltaXPct = ((e.clientX - dragStart.mouseX) / rect.width) * 100;
      const deltaYPct = ((e.clientY - dragStart.mouseY) / rect.height) * 100;

      const newX = Math.max(0, Math.min(95, dragStart.initialX + deltaXPct));
      const newY = Math.max(0, Math.min(95, dragStart.initialY + deltaYPct));

      setPages((prevPages) =>
        prevPages.map((pg, i) => {
          if (i !== activePageIndex) return pg;
          if (dragType === "text") {
            return {
              ...pg,
              texts: pg.texts.map((t) => (t.id === draggingId ? { ...t, x: newX, y: newY } : t)),
            };
          } else if (dragType === "image") {
            return {
              ...pg,
              images: pg.images.map((img) => (img.id === draggingId ? { ...img, x: newX, y: newY } : img)),
            };
          }
          return pg;
        })
      );
    };

    const handleGlobalMouseUp = () => {
      setDraggingId(null);
      setDragType(null);
      pushHistory(pages);
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [draggingId, dragType, dragStart, activePageIndex, pages]);

  // Resizing Effect for Text Box Movement
  useEffect(() => {
    if (!resizingTextId) return;

    const handleResizeMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.mouseX;
      const deltaY = e.clientY - resizeStart.mouseY;
      const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
      const newSize = Math.max(8, Math.min(140, Math.round(resizeStart.initialSize + delta * 0.3)));

      setPages((prevPages) =>
        prevPages.map((pg, i) => {
          if (i !== activePageIndex) return pg;
          return {
            ...pg,
            texts: pg.texts.map((t) => (t.id === resizingTextId ? { ...t, fontSize: newSize } : t)),
          };
        })
      );
    };

    const handleResizeMouseUp = () => {
      setResizingTextId(null);
      pushHistory(pages);
    };

    window.addEventListener("mousemove", handleResizeMouseMove);
    window.addEventListener("mouseup", handleResizeMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleResizeMouseMove);
      window.removeEventListener("mouseup", handleResizeMouseUp);
    };
  }, [resizingTextId, resizeStart, activePageIndex, pages]);

  // Page Actions
  const rotatePage = (index: number) => {
    pushHistory(pages);
    setPages((prev) =>
      prev.map((pg, i) => (i === index ? { ...pg, rotation: (pg.rotation + 90) % 360 } : pg))
    );
  };

  const deletePage = (index: number) => {
    if (pages.length <= 1) return;
    pushHistory(pages);
    setPages((prev) => prev.filter((_, i) => i !== index));
    if (activePageIndex >= index && activePageIndex > 0) {
      setActivePageIndex((a) => a - 1);
    }
  };

  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    pushHistory(pages);
    setPages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
    setActivePageIndex(toIndex);
  };

  const addBlankPage = () => {
    pushHistory(pages);
    const newPg: PageState = {
      id: `blank-${Date.now()}`,
      originalIndex: null,
      rotation: 0,
      width: 612,
      height: 792,
      strokes: [],
      texts: [],
      images: [],
      stamps: [],
    };
    setPages((prev) => [...prev, newPg]);
    setActivePageIndex(pages.length);
  };

  const duplicatePage = (index: number) => {
    const target = pages[index];
    if (!target) return;
    pushHistory(pages);
    const copy: PageState = {
      ...target,
      id: `dup-${Date.now()}`,
      strokes: [...target.strokes],
      texts: [...target.texts],
      images: [...target.images],
      stamps: [...target.stamps],
    };
    setPages((prev) => [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)]);
    setActivePageIndex(index + 1);
  };

  // Text Actions
  const addTextToPage = () => {
    if (!newText.trim() || !activePage) return;
    pushHistory(pages);
    const textObj: TextItem = {
      id: `text-${Date.now()}`,
      text: newText,
      x: 35,
      y: 35,
      fontSize: textFontSize,
      color: textColor,
      isBold: textBold,
    };
    setPages((prev) =>
      prev.map((pg, i) => (i === activePageIndex ? { ...pg, texts: [...pg.texts, textObj] } : pg))
    );
  };

  const updateText = (textId: string, updates: Partial<TextItem>) => {
    setPages((prev) =>
      prev.map((pg, i) =>
        i === activePageIndex
          ? {
              ...pg,
              texts: pg.texts.map((t) => (t.id === textId ? { ...t, ...updates } : t)),
            }
          : pg
      )
    );
  };

  const removeText = (textId: string) => {
    pushHistory(pages);
    setPages((prev) =>
      prev.map((pg, i) => (i === activePageIndex ? { ...pg, texts: pg.texts.filter((t) => t.id !== textId) } : pg))
    );
  };

  // Stamp Actions
  const addStampToPage = (preset?: string) => {
    if (!activePage) return;
    pushHistory(pages);
    const textToUse = preset || stampText;
    const stampObj: StampItem = {
      id: `stamp-${Date.now()}`,
      text: textToUse,
      color: stampColor,
      opacity: stampOpacity,
      rotation: stampRotation,
    };
    setPages((prev) =>
      prev.map((pg, i) => (i === activePageIndex ? { ...pg, stamps: [...pg.stamps, stampObj] } : pg))
    );
  };

  const removeStamp = (stampId: string) => {
    pushHistory(pages);
    setPages((prev) =>
      prev.map((pg, i) => (i === activePageIndex ? { ...pg, stamps: pg.stamps.filter((s) => s.id !== stampId) } : pg))
    );
  };

  // Image / Signature Actions
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePage) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      pushHistory(pages);
      const isPng = file.type === "image/png" || dataUrl.startsWith("data:image/png");
      const imgObj: ImageItem = {
        id: `img-${Date.now()}`,
        dataUrl,
        isPng,
        x: 30,
        y: 30,
        width: 30,
        height: 20,
      };
      setPages((prev) =>
        prev.map((pg, i) => (i === activePageIndex ? { ...pg, images: [...pg.images, imgObj] } : pg))
      );
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (imgId: string) => {
    pushHistory(pages);
    setPages((prev) =>
      prev.map((pg, i) => (i === activePageIndex ? { ...pg, images: pg.images.filter((img) => img.id !== imgId) } : pg))
    );
  };

  // Signature Modal Handlers
  const [sigDrawing, setSigDrawing] = useState(false);
  const saveSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas || !activePage) return;
    const dataUrl = canvas.toDataURL("image/png");

    pushHistory(pages);
    const imgObj: ImageItem = {
      id: `sig-${Date.now()}`,
      dataUrl,
      isPng: true,
      x: 35,
      y: 65,
      width: 30,
      height: 15,
    };
    setPages((prev) =>
      prev.map((pg, i) => (i === activePageIndex ? { ...pg, images: [...pg.images, imgObj] } : pg))
    );
    setShowSigModal(false);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const exportPdf = async (downloadOnly = false) => {
    try {
      setSaving(true);
      await exportPdfHelper(pdfFileBytes, fileName, pages, downloadOnly, onSave);
    } catch (err) {
      console.error("Failed to export modified PDF:", err);
      alert("Error saving PDF file. Please check console logs.");
    } finally {
      setSaving(false);
    }
  };

  // UI Styling Tokens
  const bg = isDark ? "#090d16" : "#f8fafc";
  const bgCard = isDark ? "#111827" : "#ffffff";
  const bgSide = isDark ? "#0f172a" : "#ffffff";
  const border = isDark ? "#1e293b" : "#e2e8f0";
  const textMain = isDark ? "#f8fafc" : "#0f172a";
  const textMut = isDark ? "#94a3b8" : "#64748b";
  const bgInput = isDark ? "#1e293b" : "#ffffff";

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden font-sans select-none" style={{ background: bg, color: textMain }}>
      <EditorHeader
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        fileName={fileName}
        onClose={onClose}
        historyLength={history.length}
        undo={undo}
        activePageIndex={activePageIndex}
        setActivePageIndex={setActivePageIndex}
        pagesLength={pages.length}
        scale={scale}
        setScale={setScale}
        exportPdf={exportPdf}
        saving={saving}
        border={border}
        bgCard={bgCard}
        bgInput={bgInput}
        textMain={textMain}
      />

      <div className="relative flex flex-1 overflow-hidden">
        {/* Floating trigger button to expand sidebar when collapsed */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            title="Expand tools (Ctrl+B)"
            className="absolute left-3 top-3 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shadow-md border backdrop-blur-md transition-all duration-200 hover:scale-105 hover:shadow-lg group cursor-pointer"
            style={{
              background: isDark ? "rgba(30, 41, 59, 0.9)" : "rgba(255, 255, 255, 0.92)",
              borderColor: isDark ? "rgba(245, 158, 11, 0.4)" : "#fbbf24",
              color: textMain,
            }}
          >
            <span className="text-amber-500 transition-transform duration-150 group-hover:translate-x-0.5">
              <IcoChevR size={14} />
            </span>
            <span className="text-xs font-semibold text-amber-500">Tools</span>
          </button>
        )}

        <EditorSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarWidth={sidebarWidth}
          isDragging={isSidebarDragging}
          onResizeMouseDown={handleSidebarMouseDown}
          onResizeTouchStart={handleSidebarTouchStart}
          onResetWidth={resetSidebarWidth}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tool={tool}
          setTool={setTool}
          pages={pages}
          activePageIndex={activePageIndex}
          setActivePageIndex={setActivePageIndex}
          addBlankPage={addBlankPage}
          movePage={movePage}
          rotatePage={rotatePage}
          duplicatePage={duplicatePage}
          deletePage={deletePage}
          penColor={penColor}
          setPenColor={setPenColor}
          penSize={penSize}
          setPenSize={setPenSize}
          highlighterColor={highlighterColor}
          setHighlighterColor={setHighlighterColor}
          highlighterSize={highlighterSize}
          setHighlighterSize={setHighlighterSize}
          newText={newText}
          setNewText={setNewText}
          textFontSize={textFontSize}
          setTextFontSize={setTextFontSize}
          textColor={textColor}
          setTextColor={setTextColor}
          textBold={textBold}
          setTextBold={setTextBold}
          addTextToPage={addTextToPage}
          activePage={activePage}
          updateText={updateText}
          removeText={removeText}
          addStampToPage={addStampToPage}
          stampText={stampText}
          setStampText={setStampText}
          stampColor={stampColor}
          setStampColor={setStampColor}
          stampOpacity={stampOpacity}
          setStampOpacity={setStampOpacity}
          stampRotation={stampRotation}
          setStampRotation={setStampRotation}
          removeStamp={removeStamp}
          fileInputRef={fileInputRef}
          handleImageUpload={handleImageUpload}
          setShowSigModal={setShowSigModal}
          removeImage={removeImage}
          isDark={isDark}
          border={border}
          bgSide={bgSide}
          bgInput={bgInput}
          textMain={textMain}
          textMut={textMut}
        />

        <EditorCanvas
          previewContainerRef={previewContainerRef}
          loading={loading}
          activePage={activePage}
          canvasRef={canvasRef}
          drawOverlayRef={drawOverlayRef}
          tool={tool}
          handleMouseDown={handleMouseDown}
          handleMouseMove={handleMouseMove}
          handleMouseUp={handleMouseUp}
          startDrag={startDrag}
          draggingId={draggingId}
          resizingTextId={resizingTextId}
          scale={scale}
          updateText={updateText}
          removeText={removeText}
          startResizeText={startResizeText}
          removeImage={removeImage}
          isDark={isDark}
        />
      </div>

      <SignatureModal
        showSigModal={showSigModal}
        setShowSigModal={setShowSigModal}
        signatureCanvasRef={signatureCanvasRef}
        sigDrawing={sigDrawing}
        setSigDrawing={setSigDrawing}
        clearSignature={clearSignature}
        saveSignature={saveSignature}
        bgCard={bgCard}
        border={border}
      />
    </div>
  );
};
