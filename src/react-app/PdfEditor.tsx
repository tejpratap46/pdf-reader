import React, { useState, useEffect, useRef, FC, ChangeEvent } from "react";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";

/* ── Icons for PDF Editor ────────────────────────────────────────────── */
const Ico: FC<{ d: string; size?: number }> = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const IcoX = () => <Ico d="M18 6L6 18M6 6l12 12" />;
const IcoSave = () => <Ico d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8" />;
const IcoDownload = () => <Ico d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />;
const IcoRotateCw = () => <Ico d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />;
const IcoTrash = () => <Ico d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />;
const IcoPlus = () => <Ico d="M12 5v14M5 12h14" />;
const IcoCopy = () => <Ico d="M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2m-6 12h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" />;
const IcoMoveUp = () => <Ico d="M12 19V5M5 12l7-7 7 7" />;
const IcoMoveDown = () => <Ico d="M12 5v14M5 12l7 7 7-7" />;
const IcoText = () => <Ico d="M4 7V4h16v3M9 20h6M12 4v16" />;
const IcoPen = () => <Ico d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />;
const IcoHighlighter = () => <Ico d="M9 11l-6 6v3h3l6-6m-3-3l6-6 4 4-6 6m-4-4l4 4" />;
const IcoStamp = () => <Ico d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />;
const IcoImage = () => <Ico d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm11.5 6l-5-5L4 20" />;
const IcoSignature = () => <Ico d="M16 3l4 4L8 19H4v-4L16 3z" />;
const IcoZoomIn = () => <Ico d="M11 5a6 6 0 1 0 0 12A6 6 0 0 0 11 5zm10 10l-3-3M11 8v6M8 11h6" />;
const IcoZoomOut = () => <Ico d="M11 5a6 6 0 1 0 0 12A6 6 0 0 0 11 5zm10 10l-3-3M8 11h6" />;
const IcoChevL = () => <Ico d="M15 18l-6-6 6-6" />;
const IcoChevR = () => <Ico d="M9 18l6-6-6-6" />;
const IcoPages = () => <Ico d="M4 6h16M4 12h16M4 18h16" />;
const IcoUndo = () => <Ico d="M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />;

/* ── Types & Interfaces ──────────────────────────────────────────────── */
export interface PdfEditorProps {
  pdfFileBytes: Uint8Array;
  fileName: string;
  onClose: () => void;
  onSave: (newPdfBytes: Uint8Array, newFileName?: string) => void;
  isDark: boolean;
}

interface Point { x: number; y: number; }
interface DrawStroke {
  id: string;
  points: Point[];
  color: string;
  size: number;
  opacity: number;
}

interface TextItem {
  id: string;
  text: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  fontSize: number;
  color: string;
  isBold: boolean;
}

interface ImageItem {
  id: string;
  dataUrl: string;
  isPng: boolean;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  width: number; // percentage of page width
  height: number; // percentage of page height
}

interface StampItem {
  id: string;
  text: string;
  color: string;
  opacity: number;
  rotation: number; // degrees
}

interface PageState {
  id: string;
  originalIndex: number | null; // null if newly added blank page
  rotation: number; // 0, 90, 180, 270
  width: number;
  height: number;
  strokes: DrawStroke[];
  texts: TextItem[];
  images: ImageItem[];
  stamps: StampItem[];
}

type TabMode = "pages" | "text" | "draw" | "stamps" | "images";

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
  const [pdfJsDoc, setPdfJsDoc] = useState<{ getPage: (n: number) => Promise<{ getViewport: (opt: { scale: number; rotation?: number }) => { width: number; height: number }; render: (params: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> } }> } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
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

  // Canvas ref for drawing & preview
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
        const doc = await window.pdfjsLib.getDocument({ data: pdfFileBytes.buffer.slice(pdfFileBytes.byteOffset, pdfFileBytes.byteOffset + pdfFileBytes.byteLength) }).promise;
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
    return () => { active = false; };
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
    return () => { cancelled = true; };
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

    // Helper to draw stroke
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

    // Draw saved strokes
    (activeStrokes || []).forEach(drawStrokeOnCtx);

    // Draw current active stroke
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


  /* ── Drawing Mouse Handlers ────────────────────────────────────────── */
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

  /* ── Dragging Effect for Overlay Movement ──────────────────────────── */
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

  /* ── Resizing Effect for Text Box Movement ──────────────────────────── */
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



  /* ── Page Manipulation Actions ─────────────────────────────────────── */
  const rotatePage = (index: number) => {
    pushHistory(pages);
    setPages((prev) =>
      prev.map((pg, i) =>
        i === index ? { ...pg, rotation: (pg.rotation + 90) % 360 } : pg
      )
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
    setPages((prev) => [
      ...prev.slice(0, index + 1),
      copy,
      ...prev.slice(index + 1),
    ]);
    setActivePageIndex(index + 1);
  };

  /* ── Text Actions ─────────────────────────────────────────────────── */
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
      prev.map((pg, i) =>
        i === activePageIndex ? { ...pg, texts: [...pg.texts, textObj] } : pg
      )
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
      prev.map((pg, i) =>
        i === activePageIndex
          ? { ...pg, texts: pg.texts.filter((t) => t.id !== textId) }
          : pg
      )
    );
  };


  /* ── Stamp/Watermark Actions ──────────────────────────────────────── */
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
      prev.map((pg, i) =>
        i === activePageIndex
          ? { ...pg, stamps: [...pg.stamps, stampObj] }
          : pg
      )
    );
  };

  const removeStamp = (stampId: string) => {
    pushHistory(pages);
    setPages((prev) =>
      prev.map((pg, i) =>
        i === activePageIndex
          ? { ...pg, stamps: pg.stamps.filter((s) => s.id !== stampId) }
          : pg
      )
    );
  };

  /* ── Image/Signature Actions ────────────────────────────────────── */
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
        prev.map((pg, i) =>
          i === activePageIndex ? { ...pg, images: [...pg.images, imgObj] } : pg
        )
      );
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (imgId: string) => {
    pushHistory(pages);
    setPages((prev) =>
      prev.map((pg, i) =>
        i === activePageIndex
          ? { ...pg, images: pg.images.filter((img) => img.id !== imgId) }
          : pg
      )
    );
  };

  /* ── Signature Modal Draw ────────────────────────────────────────── */
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
      prev.map((pg, i) =>
        i === activePageIndex ? { ...pg, images: [...pg.images, imgObj] } : pg
      )
    );
    setShowSigModal(false);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  /* ── Save / Export using pdf-lib ──────────────────────────────────── */
  const exportPdf = async (downloadOnly = false) => {
    try {
      setSaving(true);
      const srcDoc = await PDFDocument.load(pdfFileBytes, { ignoreEncryption: true });
      const outDoc = await PDFDocument.create();

      const helveticaFont = await outDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await outDoc.embedFont(StandardFonts.HelveticaBold);

      // Loop over current edited page array
      for (const pgState of pages) {
        let pdfPage: ReturnType<typeof outDoc.addPage>;

        if (pgState.originalIndex !== null) {
          const [copied] = await outDoc.copyPages(srcDoc, [pgState.originalIndex]);
          pdfPage = outDoc.addPage(copied);
          if (pgState.rotation !== 0) {
            const currentRot = pdfPage.getRotation().angle;
            pdfPage.setRotation(degrees((currentRot + pgState.rotation) % 360));
          }
        } else {
          pdfPage = outDoc.addPage([pgState.width, pgState.height]);
        }

        const { width: pWidth, height: pHeight } = pdfPage.getSize();

        // 1. Draw rasterized pen/highlighter strokes layer if present
        if (pgState.strokes.length > 0) {
          const offCanvas = document.createElement("canvas");
          offCanvas.width = pWidth * 2; // high-res
          offCanvas.height = pHeight * 2;
          const offCtx = offCanvas.getContext("2d");
          if (offCtx) {
            offCtx.scale(2, 2);
            pgState.strokes.forEach((st) => {
              if (st.points.length < 2) return;
              offCtx.beginPath();
              offCtx.strokeStyle = st.color;
              offCtx.lineWidth = st.size;
              offCtx.lineCap = "round";
              offCtx.lineJoin = "round";
              offCtx.globalAlpha = st.opacity;

              offCtx.moveTo((st.points[0].x / 100) * pWidth, (st.points[0].y / 100) * pHeight);
              for (let i = 1; i < st.points.length; i++) {
                offCtx.lineTo((st.points[i].x / 100) * pWidth, (st.points[i].y / 100) * pHeight);
              }
              offCtx.stroke();
              offCtx.globalAlpha = 1.0;
            });

            const strokeDataUrl = offCanvas.toDataURL("image/png");
            const strokeImgBytes = await fetch(strokeDataUrl).then((res) => res.arrayBuffer());
            const embeddedStrokeImg = await outDoc.embedPng(strokeImgBytes);
            pdfPage.drawImage(embeddedStrokeImg, {
              x: 0,
              y: 0,
              width: pWidth,
              height: pHeight,
            });
          }
        }

        // 2. Draw text overlays
        for (const txt of pgState.texts) {
          const fontToUse = txt.isBold ? helveticaBold : helveticaFont;
          const pdfX = (txt.x / 100) * pWidth;
          const pdfY = pHeight - (txt.y / 100) * pHeight; // Invert Y for PDF coordinate system

          // Parse HEX color to RGB
          const hex = txt.color.replace("#", "");
          const r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
          const g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
          const b = parseInt(hex.substring(4, 6), 16) / 255 || 0;

          pdfPage.drawText(txt.text, {
            x: pdfX,
            y: pdfY,
            size: txt.fontSize,
            font: fontToUse,
            color: rgb(r, g, b),
          });
        }

        // 3. Draw Watermark / Stamps
        for (const stp of pgState.stamps) {
          const hex = stp.color.replace("#", "");
          const r = parseInt(hex.substring(0, 2), 16) / 255 || 0.8;
          const g = parseInt(hex.substring(2, 4), 16) / 255 || 0.1;
          const b = parseInt(hex.substring(4, 6), 16) / 255 || 0.1;

          pdfPage.drawText(stp.text, {
            x: pWidth * 0.25,
            y: pHeight * 0.5,
            size: 42,
            font: helveticaBold,
            color: rgb(r, g, b),
            rotate: degrees(stp.rotation),
            opacity: stp.opacity,
          });
        }

        // 4. Draw Image / Signature overlays
        for (const img of pgState.images) {
          try {
            const imgBytes = await fetch(img.dataUrl).then((res) => res.arrayBuffer());
            const embeddedImg = img.isPng
              ? await outDoc.embedPng(imgBytes)
              : await outDoc.embedJpg(imgBytes);

            const imgW = (img.width / 100) * pWidth;
            const imgH = (img.height / 100) * pHeight;
            const imgX = (img.x / 100) * pWidth;
            const imgY = pHeight - (img.y / 100) * pHeight - imgH;

            pdfPage.drawImage(embeddedImg, {
              x: imgX,
              y: imgY,
              width: imgW,
              height: imgH,
            });
          } catch (e) {
            console.error("Error embedding image onto PDF:", e);
          }
        }
      }

      // Generate modified PDF Uint8Array
      const finalBytes = await outDoc.save();

      if (downloadOnly) {
        const blob = new Blob([finalBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName.endsWith(".pdf") ? fileName.replace(".pdf", "-edited.pdf") : `${fileName}-edited.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        onSave(finalBytes, fileName.endsWith("-edited.pdf") ? fileName : fileName.replace(".pdf", "-edited.pdf"));
      }
    } catch (err) {
      console.error("Failed to export modified PDF:", err);
      alert("Error saving PDF file. Please check console logs.");
    } finally {
      setSaving(false);
    }
  };

  /* ── UI Styling Tokens ─────────────────────────────────────────────── */
  const bg = isDark ? "#090d16" : "#f8fafc";
  const bgCard = isDark ? "#111827" : "#ffffff";
  const bgSide = isDark ? "#0f172a" : "#ffffff";
  const border = isDark ? "#1e293b" : "#e2e8f0";
  const textMain = isDark ? "#f8fafc" : "#0f172a";
  const textMut = isDark ? "#94a3b8" : "#64748b";
  const bgInput = isDark ? "#1e293b" : "#ffffff";

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden font-sans select-none" style={{ background: bg, color: textMain }}>
      {/* Top Header Navigation */}
      <header className="flex items-center justify-between px-5 py-3 border-b shrink-0 shadow-md backdrop-blur-lg" style={{ background: bgCard, borderColor: border }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150"
            style={{ borderColor: border, background: bgInput, color: textMain }}
          >
            <IcoX /> Exit Editor
          </button>
          <div className="h-6 w-px" style={{ background: border }} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500 text-white uppercase tracking-wider">
                PDF Editor
              </span>
              <span className="text-sm font-semibold truncate max-w-[200px] sm:max-w-[350px]" style={{ color: textMain }}>
                {fileName}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Controls */}
        <div className="hidden md:flex items-center gap-2">
          <button
            disabled={history.length === 0}
            onClick={undo}
            title="Undo"
            className="p-2 rounded-lg border transition-colors disabled:opacity-40"
            style={{ borderColor: border, background: bgInput, color: textMain }}
          >
            <IcoUndo />
          </button>

          <div className="h-6 w-px mx-1" style={{ background: border }} />

          {/* Page Switcher */}
          <div className="flex items-center gap-1 text-xs">
            <button
              disabled={activePageIndex === 0}
              onClick={() => setActivePageIndex((p) => Math.max(0, p - 1))}
              className="p-1.5 rounded-md border disabled:opacity-40"
              style={{ borderColor: border, background: bgInput }}
            >
              <IcoChevL />
            </button>
            <span className="font-mono px-2">
              Page {activePageIndex + 1} / {pages.length}
            </span>
            <button
              disabled={activePageIndex === pages.length - 1}
              onClick={() => setActivePageIndex((p) => Math.min(pages.length - 1, p + 1))}
              className="p-1.5 rounded-md border disabled:opacity-40"
              style={{ borderColor: border, background: bgInput }}
            >
              <IcoChevR />
            </button>
          </div>

          <div className="h-6 w-px mx-1" style={{ background: border }} />

          {/* Zoom */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
              className="p-1.5 rounded-md border"
              style={{ borderColor: border, background: bgInput }}
            >
              <IcoZoomOut />
            </button>
            <span className="font-mono text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale((s) => Math.min(2.5, s + 0.1))}
              className="p-1.5 rounded-md border"
              style={{ borderColor: border, background: bgInput }}
            >
              <IcoZoomIn />
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => exportPdf(true)}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 hover:bg-slate-800"
            style={{ borderColor: border, background: bgInput, color: textMain }}
          >
            <IcoDownload /> Download
          </button>
          <button
            onClick={() => exportPdf(false)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg transition-all duration-200 hover:scale-105"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <IcoSave />
            )}
            {saving ? "Saving PDF..." : "Apply & Save"}
          </button>
        </div>
      </header>

      {/* Main Workspace split into Sidebar and Canvas */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Tools */}
        <aside className="w-80 flex flex-col border-r shrink-0 overflow-hidden" style={{ background: bgSide, borderColor: border }}>
          {/* Navigation Tabs */}
          <div className="flex border-b overflow-x-auto p-1 gap-1" style={{ borderColor: border, background: isDark ? "#0f172a" : "#f1f5f9" }}>
            {[
              { id: "pages", label: "Pages", icon: <IcoPages /> },
              { id: "draw", label: "Draw", icon: <IcoPen /> },
              { id: "text", label: "Text", icon: <IcoText /> },
              { id: "stamps", label: "Stamp", icon: <IcoStamp /> },
              { id: "images", label: "Images", icon: <IcoImage /> },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id as TabMode);
                  if (t.id === "draw" && tool === "select") setTool("pen");
                  if (t.id !== "draw") setTool("select");
                }}
                className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-md text-[11px] font-medium transition-all ${
                  activeTab === t.id
                    ? "bg-amber-500 text-white shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {/* 1. Pages Tab */}
            {activeTab === "pages" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Document Pages ({pages.length})</span>
                  <button
                    onClick={addBlankPage}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 text-white text-xs font-semibold shadow hover:bg-amber-600 transition-colors"
                  >
                    <IcoPlus /> Add Blank Page
                  </button>
                </div>

                <div className="flex flex-col gap-2 mt-1">
                  {pages.map((pg, idx) => (
                    <div
                      key={pg.id}
                      onClick={() => setActivePageIndex(idx)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                        activePageIndex === idx
                          ? "border-amber-500 bg-amber-500/10 shadow-sm"
                          : "border-slate-700 hover:border-slate-500"
                      }`}
                      style={{ background: activePageIndex === idx ? undefined : bgInput }}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                          activePageIndex === idx ? "bg-amber-500 text-white" : "bg-slate-700 text-slate-300"
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">Page {idx + 1}</span>
                          <span className="text-[10px]" style={{ color: textMut }}>
                            {pg.rotation !== 0 ? `Rotated ${pg.rotation}°` : "Standard Portrait"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); movePage(idx, idx - 1); }}
                          disabled={idx === 0}
                          title="Move up"
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                        >
                          <IcoMoveUp />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); movePage(idx, idx + 1); }}
                          disabled={idx === pages.length - 1}
                          title="Move down"
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
                        >
                          <IcoMoveDown />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); rotatePage(idx); }}
                          title="Rotate 90°"
                          className="p-1 text-slate-400 hover:text-amber-400"
                        >
                          <IcoRotateCw />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); duplicatePage(idx); }}
                          title="Duplicate page"
                          className="p-1 text-slate-400 hover:text-amber-400"
                        >
                          <IcoCopy />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deletePage(idx); }}
                          disabled={pages.length <= 1}
                          title="Delete page"
                          className="p-1 text-slate-400 hover:text-red-400 disabled:opacity-30"
                        >
                          <IcoTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Drawing Tab */}
            {activeTab === "draw" && (
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Freehand &amp; Highlighter</span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTool("pen")}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      tool === "pen"
                        ? "border-amber-500 bg-amber-500 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-300"
                    }`}
                  >
                    <IcoPen /> Pen Tool
                  </button>
                  <button
                    onClick={() => setTool("highlighter")}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      tool === "highlighter"
                        ? "border-amber-500 bg-amber-500 text-white"
                        : "border-slate-700 bg-slate-800 text-slate-300"
                    }`}
                  >
                    <IcoHighlighter /> Highlighter
                  </button>
                </div>

                {tool === "pen" && (
                  <div className="flex flex-col gap-3 p-3 rounded-lg border" style={{ borderColor: border, background: bgInput }}>
                    <span className="text-xs font-semibold">Pen Color &amp; Size</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: textMut }}>Color</span>
                      <input
                        type="color"
                        value={penColor}
                        onChange={(e) => setPenColor(e.target.value)}
                        className="w-8 h-8 rounded border cursor-pointer bg-transparent"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span style={{ color: textMut }}>Stroke Size</span>
                        <span>{penSize}px</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={20}
                        value={penSize}
                        onChange={(e) => setPenSize(parseInt(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                    </div>
                  </div>
                )}

                {tool === "highlighter" && (
                  <div className="flex flex-col gap-3 p-3 rounded-lg border" style={{ borderColor: border, background: bgInput }}>
                    <span className="text-xs font-semibold">Highlighter Options</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: textMut }}>Color</span>
                      <div className="flex gap-1.5">
                        {["#fef08a", "#bbf7d0", "#bae6fd", "#fbcfe8"].map((c) => (
                          <button
                            key={c}
                            onClick={() => setHighlighterColor(c)}
                            className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                            style={{ background: c, borderColor: highlighterColor === c ? "#f59e0b" : "transparent" }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs">
                        <span style={{ color: textMut }}>Width</span>
                        <span>{highlighterSize}px</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={40}
                        value={highlighterSize}
                        onChange={(e) => setHighlighterSize(parseInt(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400">
                  💡 <strong>Tip:</strong> Click and drag directly on the PDF preview page to draw lines or highlight text.
                </div>
              </div>
            )}

            {/* 3. Text Overlay Tab */}
            {activeTab === "text" && (
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Add Text Annotation</span>

                <div className="flex flex-col gap-3 p-3 rounded-lg border" style={{ borderColor: border, background: bgInput }}>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold" style={{ color: textMut }}>Text Content</label>
                    <textarea
                      rows={3}
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      className="w-full p-2 rounded text-xs border focus:outline-none focus:border-amber-500"
                      style={{ background: bgSide, color: textMain, borderColor: border }}
                      placeholder="Type text here..."
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: textMut }}>Font Size</span>
                    <input
                      type="number"
                      min={10}
                      max={72}
                      value={textFontSize}
                      onChange={(e) => setTextFontSize(parseInt(e.target.value) || 16)}
                      className="w-16 p-1 rounded text-xs border text-center"
                      style={{ background: bgSide, color: textMain, borderColor: border }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: textMut }}>Text Color</span>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-8 h-8 rounded border cursor-pointer bg-transparent"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: textMut }}>Style</span>
                    <button
                      onClick={() => setTextBold(!textBold)}
                      className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${
                        textBold ? "bg-amber-500 text-white border-amber-500" : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      Bold
                    </button>
                  </div>

                  <button
                    onClick={addTextToPage}
                    className="w-full py-2 rounded-lg bg-amber-500 text-white text-xs font-bold shadow hover:bg-amber-600 transition-all mt-1"
                  >
                    + Place Text on Page
                  </button>
                </div>

                {/* Placed Texts List */}
                {activePage?.texts.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2">
                    <span className="text-xs font-semibold text-slate-400">Placed Text Boxes ({activePage.texts.length})</span>
                    {activePage.texts.map((t) => (
                      <div key={t.id} className="flex flex-col gap-2 p-2.5 rounded bg-slate-800 border border-slate-700 text-xs">
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={t.text}
                            onChange={(e) => updateText(t.id, { text: e.target.value })}
                            className="bg-slate-900 text-slate-100 px-2 py-1 rounded text-xs border border-slate-700 font-medium focus:outline-none focus:border-amber-500 flex-1 mr-2"
                          />
                          <button onClick={() => removeText(t.id)} className="text-red-400 hover:text-red-300 p-1">
                            <IcoTrash />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <span>Size:</span>
                            <button
                              onClick={() => updateText(t.id, { fontSize: Math.max(8, t.fontSize - 2) })}
                              className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-amber-500 text-white font-bold"
                            >
                              -
                            </button>
                            <span className="font-mono text-amber-400 font-semibold">{t.fontSize}px</span>
                            <button
                              onClick={() => updateText(t.id, { fontSize: Math.min(140, t.fontSize + 2) })}
                              className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-amber-500 text-white font-bold"
                            >
                              +
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={t.color}
                              onChange={(e) => updateText(t.id, { color: e.target.value })}
                              className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                            />
                            <button
                              onClick={() => updateText(t.id, { isBold: !t.isBold })}
                              className={`px-1.5 py-0.5 rounded font-bold border ${t.isBold ? "bg-amber-500 text-white border-amber-500" : "bg-slate-700 text-slate-400 border-slate-600"}`}
                            >
                              B
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}

            {/* 4. Stamp / Watermark Tab */}
            {activeTab === "stamps" && (
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Stamps &amp; Watermarks</span>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-slate-400">Quick Presets</span>
                  <div className="grid grid-cols-2 gap-2">
                    {["CONFIDENTIAL", "APPROVED", "DRAFT", "SAMPLE", "URGENT", "DO NOT COPY"].map((p) => (
                      <button
                        key={p}
                        onClick={() => addStampToPage(p)}
                        className="py-2 px-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-bold tracking-wider hover:bg-red-500/20 transition-all"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-3 rounded-lg border" style={{ borderColor: border, background: bgInput }}>
                  <span className="text-xs font-semibold">Custom Watermark</span>
                  <input
                    type="text"
                    value={stampText}
                    onChange={(e) => setStampText(e.target.value)}
                    className="w-full p-2 rounded text-xs border focus:outline-none"
                    style={{ background: bgSide, color: textMain, borderColor: border }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: textMut }}>Color</span>
                    <input
                      type="color"
                      value={stampColor}
                      onChange={(e) => setStampColor(e.target.value)}
                      className="w-8 h-8 rounded border cursor-pointer bg-transparent"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span style={{ color: textMut }}>Opacity</span>
                      <span>{Math.round(stampOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={0.9}
                      step={0.05}
                      value={stampOpacity}
                      onChange={(e) => setStampOpacity(parseFloat(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span style={{ color: textMut }}>Angle</span>
                      <span>{stampRotation}°</span>
                    </div>
                    <input
                      type="range"
                      min={-90}
                      max={90}
                      step={5}
                      value={stampRotation}
                      onChange={(e) => setStampRotation(parseInt(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                  <button
                    onClick={() => addStampToPage()}
                    className="w-full py-2 rounded-lg bg-amber-500 text-white text-xs font-bold shadow hover:bg-amber-600 transition-all"
                  >
                    + Add Custom Watermark
                  </button>
                </div>

                {activePage?.stamps.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-slate-400">Active Stamps</span>
                    {activePage.stamps.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-2 rounded bg-slate-800 border border-slate-700 text-xs">
                        <span className="font-bold tracking-wider" style={{ color: s.color }}>{s.text}</span>
                        <button onClick={() => removeStamp(s.id)} className="text-red-400 hover:text-red-300">
                          <IcoTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. Image & Signature Tab */}
            {activeTab === "images" && (
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Images &amp; Signatures</span>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-amber-500/50 bg-amber-500/10 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-all"
                >
                  <IcoImage /> Upload Image (PNG/JPEG)
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                <button
                  onClick={() => setShowSigModal(true)}
                  className="flex items-center justify-center gap-2 py-3 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition-all"
                >
                  <IcoSignature /> Draw Digital Signature
                </button>

                {activePage?.images.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2">
                    <span className="text-xs font-semibold text-slate-400">Embedded Images/Signatures</span>
                    {activePage.images.map((img, i) => (
                      <div key={img.id} className="flex items-center justify-between p-2 rounded bg-slate-800 border border-slate-700">
                        <img src={img.dataUrl} alt="embedded" className="h-10 w-16 object-contain rounded bg-white p-0.5" />
                        <span className="text-xs text-slate-400">Image #{i + 1}</span>
                        <button onClick={() => removeImage(img.id)} className="text-red-400 hover:text-red-300">
                          <IcoTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Center: Live Editor Canvas Viewport */}
        <main
          ref={previewContainerRef}
          className="flex-1 overflow-auto flex items-center justify-center p-8 relative"
          style={{ background: isDark ? "#040711" : "#e2e8f0" }}
        >
          {loading && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-amber-500 uppercase tracking-widest">Opening Editor...</span>
            </div>
          )}

          {!loading && activePage && (
            <div
              className="relative shadow-2xl rounded-lg overflow-hidden"
              style={{
                width: canvasRef.current?.width || 600,
                height: canvasRef.current?.height || 800,
                background: "#ffffff",
              }}
            >
              {/* PDF Background Canvas */}
              <canvas ref={canvasRef} className="block" />

              {/* Drawing Overlay Canvas */}
              <canvas
                ref={drawOverlayRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className={`absolute inset-0 z-10 ${tool !== "select" ? "cursor-crosshair pointer-events-auto" : "cursor-default pointer-events-none"}`}
              />

              {/* Text Overlays Interactive Layer */}
              {activePage.texts.map((t) => (
                <div
                  key={t.id}
                  onMouseDown={(e) => startDrag(e, t.id, "text", t.x, t.y)}
                  className={`absolute z-20 border-2 border-dashed p-2 rounded select-none group cursor-grab active:cursor-grabbing ${
                    draggingId === t.id || resizingTextId === t.id
                      ? "border-amber-500 bg-amber-500/20 shadow-xl scale-105"
                      : "border-amber-500/60 bg-amber-500/10 hover:border-amber-500 hover:bg-amber-500/20"
                  }`}
                  style={{
                    left: `${t.x}%`,
                    top: `${t.y}%`,
                    fontSize: `${t.fontSize * scale}px`,
                    color: t.color,
                    fontWeight: t.isBold ? "bold" : "normal",
                    fontFamily: "sans-serif",
                    touchAction: "none",
                  }}
                >
                  <span className="pointer-events-none">{t.text}</span>

                  {/* Top Bar Quick Controls on Hover */}
                  <div className="absolute -top-7 left-0 hidden group-hover:flex items-center gap-1 bg-slate-900/90 backdrop-blur-md px-1.5 py-0.5 rounded border border-amber-500/40 text-[10px] text-white shadow-lg pointer-events-auto z-30">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateText(t.id, { fontSize: Math.max(8, t.fontSize - 2) });
                      }}
                      title="Decrease font size"
                      className="px-1.5 py-0.5 rounded hover:bg-amber-500 font-bold"
                    >
                      A-
                    </button>
                    <span className="font-mono text-[9px] text-amber-400">{t.fontSize}px</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateText(t.id, { fontSize: Math.min(140, t.fontSize + 2) });
                      }}
                      title="Increase font size"
                      className="px-1.5 py-0.5 rounded hover:bg-amber-500 font-bold"
                    >
                      A+
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeText(t.id);
                    }}
                    title="Remove text box"
                    className="absolute -top-3 -right-3 hidden group-hover:flex w-5 h-5 rounded-full bg-red-500 text-white items-center justify-center text-[10px] shadow font-bold hover:bg-red-600 pointer-events-auto z-30"
                  >
                    ✕
                  </button>

                  {/* Bottom Right Resizer Handle */}
                  <div
                    onMouseDown={(e) => startResizeText(e, t.id, t.fontSize)}
                    title="Drag to resize text box"
                    className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow cursor-nwse-resize hover:scale-125 transition-transform flex items-center justify-center pointer-events-auto z-30"
                  >
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  </div>
                </div>
              ))}


              {/* Watermark / Stamp Overlays Layer */}
              {activePage.stamps.map((stp) => (
                <div
                  key={stp.id}
                  className="absolute z-10 pointer-events-none flex items-center justify-center inset-0"
                >
                  <span
                    className="text-4xl font-extrabold tracking-widest select-none uppercase px-6 py-2 border-4 border-dashed rounded-2xl"
                    style={{
                      color: stp.color,
                      borderColor: stp.color,
                      opacity: stp.opacity,
                      transform: `rotate(${stp.rotation}deg)`,
                    }}
                  >
                    {stp.text}
                  </span>
                </div>
              ))}

              {/* Image Overlays Layer */}
              {activePage.images.map((img) => (
                <div
                  key={img.id}
                  onMouseDown={(e) => startDrag(e, img.id, "image", img.x, img.y)}
                  className={`absolute z-20 border-2 border-dashed rounded group select-none cursor-grab active:cursor-grabbing transition-all ${
                    draggingId === img.id
                      ? "border-amber-500 bg-amber-500/20 shadow-xl scale-105"
                      : "border-amber-500/70 hover:border-amber-500 hover:bg-amber-500/10"
                  }`}
                  style={{
                    left: `${img.x}%`,
                    top: `${img.y}%`,
                    width: `${img.width}%`,
                    height: `${img.height}%`,
                    touchAction: "none",
                  }}
                >
                  <img src={img.dataUrl} alt="overlay" className="w-full h-full object-contain pointer-events-none" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(img.id);
                    }}
                    title="Remove image"
                    className="absolute -top-3 -right-3 hidden group-hover:flex w-5 h-5 rounded-full bg-red-500 text-white items-center justify-center text-[10px] shadow font-bold hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}

            </div>
          )}
        </main>
      </div>

      {/* Signature Modal */}
      {showSigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col gap-4 p-6 rounded-2xl border shadow-2xl w-[450px]" style={{ background: bgCard, borderColor: border }}>
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-amber-500">Draw Your Signature</span>
              <button onClick={() => setShowSigModal(false)} className="text-slate-400 hover:text-white">
                <IcoX />
              </button>
            </div>

            <div className="border-2 border-dashed rounded-xl overflow-hidden bg-white cursor-crosshair">
              <canvas
                ref={signatureCanvasRef}
                width={400}
                height={180}
                onMouseDown={(e) => {
                  setSigDrawing(true);
                  const ctx = signatureCanvasRef.current?.getContext("2d");
                  if (ctx) {
                    const rect = signatureCanvasRef.current!.getBoundingClientRect();
                    ctx.beginPath();
                    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                  }
                }}
                onMouseMove={(e) => {
                  if (!sigDrawing) return;
                  const ctx = signatureCanvasRef.current?.getContext("2d");
                  if (ctx) {
                    const rect = signatureCanvasRef.current!.getBoundingClientRect();
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = "#0f172a";
                    ctx.lineCap = "round";
                    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                    ctx.stroke();
                  }
                }}
                onMouseUp={() => setSigDrawing(false)}
                onMouseLeave={() => setSigDrawing(false)}
              />
            </div>

            <div className="flex justify-between items-center gap-2">
              <button onClick={clearSignature} className="px-3 py-1.5 rounded-lg text-xs font-medium border text-slate-400 hover:text-white border-slate-700">
                Clear Canvas
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowSigModal(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium border text-slate-400 hover:text-white border-slate-700">
                  Cancel
                </button>
                <button onClick={saveSignature} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white shadow hover:bg-amber-600">
                  Insert Signature
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
