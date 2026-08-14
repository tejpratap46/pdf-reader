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
  OriginalTextSelectionInfo,
} from "./types/editor";
import { exportPdfHelper } from "./utils/pdfExport";
import { EditorHeader } from "./components/editor/EditorHeader";
import { EditorSidebar } from "./components/editor/EditorSidebar";
import { EditorCanvas } from "./components/editor/canvas/EditorCanvas";
import { ResizeHandleType } from "./components/editor/canvas/ImageOverlays";
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
  const [savingAction, setSavingAction] = useState<"save" | "download" | null>(null);
  const [saveProgress, setSaveProgress] = useState<{ progress: number; stage: string } | null>(null);

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

  // Original Text Selection & Inline Editing State
  const [selectionInfo, setSelectionInfo] = useState<OriginalTextSelectionInfo | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

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

  // Image Selection, Resizing & Rotation State
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [resizingImage, setResizingImage] = useState<{
    id: string;
    handle: ResizeHandleType;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
    lockAspect: boolean;
    aspectRatio: number;
  } | null>(null);
  const [rotatingImage, setRotatingImage] = useState<{
    id: string;
    centerX: number;
    centerY: number;
    startMouseAngle: number;
    initialRotation: number;
  } | null>(null);
  const [currentRotateAngle, setCurrentRotateAngle] = useState<number | null>(null);

  const startResizeImage = (
    e: React.MouseEvent,
    id: string,
    handle: ResizeHandleType,
    img: ImageItem
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedImageId(id);
    setResizingImage({
      id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialX: img.x,
      initialY: img.y,
      initialW: img.width,
      initialH: img.height,
      lockAspect: img.lockAspectRatio !== false,
      aspectRatio: (img.width || 30) / (img.height || 20),
    });
  };

  const startRotateImage = (
    e: React.MouseEvent,
    id: string,
    initialRotation: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const targetImg = activePage?.images.find((img) => img.id === id);
    if (!targetImg) return;

    setSelectedImageId(id);
    const rect = canvasEl.getBoundingClientRect();
    const cx = rect.left + ((targetImg.x + targetImg.width / 2) / 100) * rect.width;
    const cy = rect.top + ((targetImg.y + targetImg.height / 2) / 100) * rect.height;

    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const mouseAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;

    setRotatingImage({
      id,
      centerX: cx,
      centerY: cy,
      startMouseAngle: mouseAngle,
      initialRotation: initialRotation || 0,
    });
    setCurrentRotateAngle(initialRotation || 0);
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

  // Resizing Effect for Image Overlays
  useEffect(() => {
    if (!resizingImage) return;

    const handleResizeMouseMove = (e: MouseEvent) => {
      const bgCanvas = canvasRef.current;
      if (!bgCanvas) return;
      const rect = bgCanvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const deltaXPct = ((e.clientX - resizingImage.startX) / rect.width) * 100;
      const deltaYPct = ((e.clientY - resizingImage.startY) / rect.height) * 100;

      let newX = resizingImage.initialX;
      let newY = resizingImage.initialY;
      let newW = resizingImage.initialW;
      let newH = resizingImage.initialH;
      const isLocked = resizingImage.lockAspect || e.shiftKey;
      const ratio = resizingImage.aspectRatio;

      switch (resizingImage.handle) {
        case "se": {
          newW = Math.max(5, Math.min(100 - resizingImage.initialX, resizingImage.initialW + deltaXPct));
          newH = Math.max(5, Math.min(100 - resizingImage.initialY, resizingImage.initialH + deltaYPct));
          if (isLocked) {
            newH = Math.max(5, Math.min(100 - resizingImage.initialY, newW / ratio));
            newW = newH * ratio;
          }
          break;
        }
        case "sw": {
          const rawW = resizingImage.initialW - deltaXPct;
          newW = Math.max(5, Math.min(resizingImage.initialX + resizingImage.initialW, rawW));
          newX = resizingImage.initialX + (resizingImage.initialW - newW);
          newH = Math.max(5, Math.min(100 - resizingImage.initialY, resizingImage.initialH + deltaYPct));
          if (isLocked) {
            newH = Math.max(5, Math.min(100 - resizingImage.initialY, newW / ratio));
          }
          break;
        }
        case "ne": {
          newW = Math.max(5, Math.min(100 - resizingImage.initialX, resizingImage.initialW + deltaXPct));
          const rawH = resizingImage.initialH - deltaYPct;
          newH = Math.max(5, Math.min(resizingImage.initialY + resizingImage.initialH, rawH));
          newY = resizingImage.initialY + (resizingImage.initialH - newH);
          if (isLocked) {
            newW = Math.max(5, Math.min(100 - resizingImage.initialX, newH * ratio));
          }
          break;
        }
        case "nw": {
          const rawW = resizingImage.initialW - deltaXPct;
          newW = Math.max(5, Math.min(resizingImage.initialX + resizingImage.initialW, rawW));
          newX = resizingImage.initialX + (resizingImage.initialW - newW);
          const rawH = resizingImage.initialH - deltaYPct;
          newH = Math.max(5, Math.min(resizingImage.initialY + resizingImage.initialH, rawH));
          newY = resizingImage.initialY + (resizingImage.initialH - newH);
          if (isLocked) {
            newW = Math.max(5, newH * ratio);
            newX = resizingImage.initialX + resizingImage.initialW - newW;
          }
          break;
        }
        case "e": {
          newW = Math.max(5, Math.min(100 - resizingImage.initialX, resizingImage.initialW + deltaXPct));
          break;
        }
        case "w": {
          const rawW = resizingImage.initialW - deltaXPct;
          newW = Math.max(5, Math.min(resizingImage.initialX + resizingImage.initialW, rawW));
          newX = resizingImage.initialX + (resizingImage.initialW - newW);
          break;
        }
        case "s": {
          newH = Math.max(5, Math.min(100 - resizingImage.initialY, resizingImage.initialH + deltaYPct));
          break;
        }
        case "n": {
          const rawH = resizingImage.initialH - deltaYPct;
          newH = Math.max(5, Math.min(resizingImage.initialY + resizingImage.initialH, rawH));
          newY = resizingImage.initialY + (resizingImage.initialH - newH);
          break;
        }
      }

      setPages((prevPages) =>
        prevPages.map((pg, i) => {
          if (i !== activePageIndex) return pg;
          return {
            ...pg,
            images: pg.images.map((img) =>
              img.id === resizingImage.id
                ? {
                    ...img,
                    x: Math.round(newX * 10) / 10,
                    y: Math.round(newY * 10) / 10,
                    width: Math.round(newW * 10) / 10,
                    height: Math.round(newH * 10) / 10,
                  }
                : img
            ),
          };
        })
      );
    };

    const handleResizeMouseUp = () => {
      setResizingImage(null);
      pushHistory(pages);
    };

    window.addEventListener("mousemove", handleResizeMouseMove);
    window.addEventListener("mouseup", handleResizeMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleResizeMouseMove);
      window.removeEventListener("mouseup", handleResizeMouseUp);
    };
  }, [resizingImage, activePageIndex, pages]);

  // Rotating Effect for Image Overlays
  useEffect(() => {
    if (!rotatingImage) return;

    const handleRotateMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - rotatingImage.centerX;
      const dy = e.clientY - rotatingImage.centerY;
      const currentMouseAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      const deltaAngle = currentMouseAngle - rotatingImage.startMouseAngle;
      const rawRot = rotatingImage.initialRotation + deltaAngle;
      let normalized = ((rawRot % 360) + 360) % 360;

      // Snapping to standard angles
      const snapAngles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
      const snapThreshold = e.shiftKey ? 12 : 4;
      for (const sa of snapAngles) {
        if (Math.abs(normalized - sa) <= snapThreshold || Math.abs(normalized - (sa - 360)) <= snapThreshold) {
          normalized = sa % 360;
          break;
        }
      }

      setCurrentRotateAngle(Math.round(normalized));

      setPages((prevPages) =>
        prevPages.map((pg, i) => {
          if (i !== activePageIndex) return pg;
          return {
            ...pg,
            images: pg.images.map((img) =>
              img.id === rotatingImage.id
                ? { ...img, rotation: Math.round(normalized) }
                : img
            ),
          };
        })
      );
    };

    const handleRotateMouseUp = () => {
      setRotatingImage(null);
      setCurrentRotateAngle(null);
      pushHistory(pages);
    };

    window.addEventListener("mousemove", handleRotateMouseMove);
    window.addEventListener("mouseup", handleRotateMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleRotateMouseMove);
      window.removeEventListener("mouseup", handleRotateMouseUp);
    };
  }, [rotatingImage, activePageIndex, pages]);

  // Keyboard Shortcuts (Delete, Nudge, Rotate, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if (selectedImageId && activePage) {
        const curImg = activePage.images.find((img) => img.id === selectedImageId);
        if (!curImg) return;

        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          removeImage(selectedImageId);
          setSelectedImageId(null);
        } else if (e.key === "Escape") {
          setSelectedImageId(null);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          const step = e.shiftKey ? 5 : 1;
          updateImage(selectedImageId, { x: Math.max(0, curImg.x - step) });
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          const step = e.shiftKey ? 5 : 1;
          updateImage(selectedImageId, { x: Math.min(100 - curImg.width, curImg.x + step) });
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const step = e.shiftKey ? 5 : 1;
          updateImage(selectedImageId, { y: Math.max(0, curImg.y - step) });
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          const step = e.shiftKey ? 5 : 1;
          updateImage(selectedImageId, { y: Math.min(100 - curImg.height, curImg.y + step) });
        } else if (e.key === "[" || e.key === "{") {
          e.preventDefault();
          const nextRot = (((curImg.rotation || 0) - (e.shiftKey ? 45 : 15)) % 360 + 360) % 360;
          updateImage(selectedImageId, { rotation: nextRot });
        } else if (e.key === "]" || e.key === "}") {
          e.preventDefault();
          const nextRot = (((curImg.rotation || 0) + (e.shiftKey ? 45 : 15)) % 360 + 360) % 360;
          updateImage(selectedImageId, { rotation: nextRot });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImageId, activePage, pages]);

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

  const handleEditOriginalText = (info: OriginalTextSelectionInfo) => {
    if (!activePage) return;
    pushHistory(pages);

    const textObj: TextItem = {
      id: `text-${Date.now()}`,
      text: info.text,
      x: Math.round(info.x * 100) / 100,
      y: Math.round(info.y * 100) / 100,
      width: Math.round(info.width * 100) / 100,
      height: Math.round(info.height * 100) / 100,
      fontSize: info.fontSize,
      color: info.color,
      isBold: info.isBold,
      isItalic: info.isItalic,
      backgroundColor: info.backgroundColor || "#ffffff",
      fontFamily: info.fontFamily || "sans-serif",
      isOriginalEdit: true,
    };

    setPages((prev) =>
      prev.map((pg, i) => (i === activePageIndex ? { ...pg, texts: [...pg.texts, textObj] } : pg))
    );

    setSelectionInfo(null);
    window.getSelection()?.removeAllRanges();
    setEditingTextId(textObj.id);
    setActiveTab("text");
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
  const updateImage = (imgId: string, updates: Partial<ImageItem>, pushToHistory = true) => {
    if (pushToHistory) pushHistory(pages);
    setPages((prev) =>
      prev.map((pg, i) =>
        i === activePageIndex
          ? {
              ...pg,
              images: pg.images.map((img) => (img.id === imgId ? { ...img, ...updates } : img)),
            }
          : pg
      )
    );
  };

  const duplicateImage = (imgId: string) => {
    const targetImg = activePage?.images.find((img) => img.id === imgId);
    if (!targetImg) return;
    pushHistory(pages);
    const newImg: ImageItem = {
      ...targetImg,
      id: `img-${Date.now()}`,
      x: Math.min(85, targetImg.x + 4),
      y: Math.min(85, targetImg.y + 4),
    };
    setPages((prev) =>
      prev.map((pg, i) => (i === activePageIndex ? { ...pg, images: [...pg.images, newImg] } : pg))
    );
    setSelectedImageId(newImg.id);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePage) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const tempImg = new Image();
      tempImg.onload = () => {
        pushHistory(pages);
        const isPng = file.type === "image/png" || dataUrl.startsWith("data:image/png");
        const naturalAspect = tempImg.naturalWidth / (tempImg.naturalHeight || 1);
        const pageW = canvasRef.current?.width || 600;
        const pageH = canvasRef.current?.height || 800;
        const pageAspect = pageW / pageH;

        const width = 32;
        let height = Math.round((width * pageAspect) / naturalAspect);
        if (height > 60) height = 60;
        if (height < 5) height = 5;

        const imgObj: ImageItem = {
          id: `img-${Date.now()}`,
          dataUrl,
          isPng,
          x: Math.max(5, Math.round(50 - width / 2)),
          y: Math.max(5, Math.round(50 - height / 2)),
          width,
          height,
          rotation: 0,
          lockAspectRatio: true,
        };
        setPages((prev) =>
          prev.map((pg, i) => (i === activePageIndex ? { ...pg, images: [...pg.images, imgObj] } : pg))
        );
        setSelectedImageId(imgObj.id);
        setActiveTab("images");
      };
      tempImg.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeImage = (imgId: string) => {
    pushHistory(pages);
    setPages((prev) =>
      prev.map((pg, i) => (i === activePageIndex ? { ...pg, images: pg.images.filter((img) => img.id !== imgId) } : pg))
    );
    if (selectedImageId === imgId) {
      setSelectedImageId(null);
    }
  };

  // Signature Modal Handler
  const handleSaveSignature = (dataUrl: string, aspect: number) => {
    if (!activePage) return;
    pushHistory(pages);
    const pageW = canvasRef.current?.width || 600;
    const pageH = canvasRef.current?.height || 800;
    const pageAspect = pageW / pageH;

    const width = 28;
    const height = Math.max(6, Math.min(30, Math.round((width * pageAspect) / (aspect || 2.5))));

    const imgObj: ImageItem = {
      id: `sig-${Date.now()}`,
      dataUrl,
      isPng: true,
      x: Math.max(5, Math.round(50 - width / 2)),
      y: 65,
      width,
      height,
      rotation: 0,
      lockAspectRatio: true,
    };
    setPages((prev) =>
      prev.map((pg, i) => (i === activePageIndex ? { ...pg, images: [...pg.images, imgObj] } : pg))
    );
    setSelectedImageId(imgObj.id);
  };

  const exportPdf = async (downloadOnly = false) => {
    try {
      setSaving(true);
      setSavingAction(downloadOnly ? "download" : "save");
      setSaveProgress({ progress: 0.05, stage: "Starting export..." });
      await exportPdfHelper(
        pdfFileBytes,
        fileName,
        pages,
        downloadOnly,
        onSave,
        (progress, stage) => {
          setSaveProgress({ progress, stage });
        }
      );
    } catch (err) {
      console.error("Failed to export modified PDF:", err);
      alert("Error saving PDF file. Please check console logs.");
    } finally {
      setSaving(false);
      setSavingAction(null);
      setSaveProgress(null);
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
        savingAction={savingAction}
        saveProgress={saveProgress}
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
          selectedImageId={selectedImageId}
          setSelectedImageId={setSelectedImageId}
          updateImage={updateImage}
          duplicateImage={duplicateImage}
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
          pdfJsDoc={pdfJsDoc}
          activeOriginalIndex={activeOriginalIndex}
          activeRotation={activeRotation}
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
          editingTextId={editingTextId}
          setEditingTextId={setEditingTextId}
          selectionInfo={selectionInfo}
          setSelectionInfo={setSelectionInfo}
          onEditOriginalText={handleEditOriginalText}
          selectedImageId={selectedImageId}
          setSelectedImageId={setSelectedImageId}
          startResizeImage={startResizeImage}
          resizingImageId={resizingImage?.id || null}
          startRotateImage={startRotateImage}
          rotatingImageId={rotatingImage?.id || null}
          currentRotateAngle={currentRotateAngle}
          updateImage={updateImage}
          duplicateImage={duplicateImage}
          removeImage={removeImage}
          isDark={isDark}
        />
      </div>

      <SignatureModal
        showSigModal={showSigModal}
        setShowSigModal={setShowSigModal}
        onSaveSignature={handleSaveSignature}
        bgCard={bgCard}
        border={border}
        isDark={isDark}
      />
    </div>
  );
};
