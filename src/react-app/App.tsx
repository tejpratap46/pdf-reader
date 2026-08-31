import { useState, useEffect, useRef, useCallback, useMemo, ReactElement, lazy, Suspense } from "react";
import { SourceMode, ViewMode, TtsState, PageSize, BeforeInstallPromptEvent, AppMode } from "./types/reader";
import { DEFAULT_HEADER_PCT, DEFAULT_FOOTER_PCT, CORS_PROXY } from "./constants/reader";
import { splitParagraphs, getParagraphStarts, snapToWord, extractTextFromHtml } from "./utils/textExtractor";
import { usePdfJs } from "./hooks/usePdfJs";
import { useTheme, DarkCtx, ThemeCtx } from "./hooks/useTheme";
import { useAudioKeepAlive } from "./hooks/useAudioKeepAlive";
import { useMediaSession } from "./hooks/useMediaSession";
import { useResizableSidebar } from "./hooks/useResizableSidebar";
import { useDocumentSearch } from "./hooks/useDocumentSearch";
import { Header } from "./components/reader/Header";
import { Sidebar } from "./components/reader/Sidebar";
import { PdfViewer } from "./components/reader/PdfViewer";
import { convertBytesToMarkdown, convertWebToMarkdown } from "./utils/markdownExport";

// Lazy-loaded Mode Views for memory and performance optimization
const PdfEditor = lazy(() => import("./PdfEditor").then((m) => ({ default: m.PdfEditor })));
const ReaderModeView = lazy(() => import("./components/reader-mode/ReaderModeView"));
const AiChatSidebar = lazy(() => import("./components/ai/AiChatSidebar").then((m) => ({ default: m.AiChatSidebar })));
const MarkdownExportModal = lazy(() => import("./components/common/MarkdownExportModal").then((m) => ({ default: m.MarkdownExportModal })));
import {
  clearTokenCache,
  getAllPagesTokenCount,
  setAllPagesTokenCount,
  setPageTokenCount,
  setCachedTokenCount,
} from "./utils/tokenCache";
import {
  getSavedVoiceName,
  saveTtsVoicePreference,
  getSavedTtsRate,
  saveTtsRate,
  getSavedTtsPitch,
  saveTtsPitch,
  getSavedTtsVolume,
  saveTtsVolume,
  getSavedAutoNext,
  saveAutoNext,
  resolveBestVoice,
  saveReaderPosition,
  getSavedReaderPosition,
} from "./utils/ttsUtils";
import { IcoChevR, IcoSparklesFilled } from "./components/common/Icons";

function getInitialScale(): number {
  if (typeof window === "undefined") return 1.2;
  const width = window.innerWidth;
  if (width < 480) return 0.65;
  if (width < 768) return 0.85;
  if (width < 1024) return 1.05;
  if (width < 1440) return 1.2;
  return 1.35;
}

export default function PDFReader(): ReactElement {
  const pdfReady = usePdfJs();
  const [isDark, theme, setTheme, resolvedTheme] = useTheme();
  const { startKeepAlive, stopKeepAlive } = useAudioKeepAlive();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const paraListRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const autoNextRef = useRef(false);
  const pendingAutoPlay = useRef(false);
  const dragCounterRef = useRef(0);
  const isProgrammaticScrollingRef = useRef(false);
  const pendingFileRef = useRef<File | null>(null);

  /* PWA state */
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  /* App Modes: "viewer" (Default) | "reader" (Markdown + Word-highlight TTS) | "editor" (PDF studio) */
  const [activeMode, setActiveMode] = useState<AppMode>("viewer");

  /* Source mode & View Mode */
  const [sourceMode, setSourceMode] = useState<SourceMode>("pdf");
  const [viewMode, setViewMode] = useState<ViewMode>("scroll");
  const [webUrl, setWebUrl] = useState("");
  const [webTitle, setWebTitle] = useState("");
  const [webLoading, setWebLoading] = useState(false);
  const [webError, setWebError] = useState("");
  const [webLoaded, setWebLoaded] = useState(false);

  /* PDF state */
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState<number>(() => getInitialScale());
  const [pageSizes, setPageSizes] = useState<PageSize[]>([]);
  const [fileName, setFileName] = useState("");
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [headerPct, setHeaderPct] = useState(DEFAULT_HEADER_PCT);
  const [footerPct, setFooterPct] = useState(DEFAULT_FOOTER_PCT);
  const [readHeader, setReadHeader] = useState(false);
  const [readFooter, setReadFooter] = useState(false);
  const [localDrag, setLocalDrag] = useState(false);
  const [globalDrag, setGlobalDrag] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pageTextLoading, setPageTextLoading] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [isMarkdownModalOpen, setIsMarkdownModalOpen] = useState(false);

  /* AI Context & Document Markdown */
  const [docMarkdown, setDocMarkdown] = useState<string>("");
  const [currentPageMarkdown, setCurrentPageMarkdown] = useState<string>("");
  const [isExtractingMarkdown, setIsExtractingMarkdown] = useState(false);
  const pageMarkdownCacheRef = useRef<Map<number, string>>(new Map());
  const pendingPageMarkdownRequestsRef = useRef<Map<number, Promise<string>>>(new Map());

  /* TTS State */
  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [fullDocParagraphs, setFullDocParagraphs] = useState<string[]>([]);
  const [pageBreakIndices, setPageBreakIndices] = useState<number[]>([]);
  const [pageNumberMap, setPageNumberMap] = useState<Record<number, number>>({});
  const [fullDocLoading, setFullDocLoading] = useState<boolean>(false);
  const [ttsState, setTtsState] = useState<TtsState>("idle");
  const [ttsRate, setTtsRateState] = useState<number>(() => getSavedTtsRate());
  const [ttsPitch, setTtsPitchState] = useState<number>(() => getSavedTtsPitch());
  const [ttsVolume, setTtsVolumeState] = useState<number>(() => getSavedTtsVolume());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoiceState] = useState<string>(() => getSavedVoiceName());
  const [activePara, setActivePara] = useState(-1);
  const [activeCharOffset, setActiveCharOffset] = useState(0);
  const [paraProgress, setParaProgress] = useState(0);
  const [autoNextPage, setAutoNextPageState] = useState<boolean>(() => getSavedAutoNext());

  const ttsRateRef = useRef<number>(ttsRate);
  const ttsPitchRef = useRef<number>(ttsPitch);
  const ttsVolumeRef = useRef<number>(ttsVolume);
  const selectedVoiceRef = useRef<string>(selectedVoice);
  const ttsStateRef = useRef<TtsState>("idle");
  const currentReadingPosRef = useRef<{ paraIndex: number; charOffset: number }>({ paraIndex: 0, charOffset: 0 });
  const restartTimerRef = useRef<number | null>(null);
  const activeUtteranceIdRef = useRef<number>(0);

  /* Current active document key for caching and position persistence */
  const currentDocKey = useMemo(() => {
    if (sourceMode === "pdf") {
      return fileName || (pdfBytes ? `pdf_${pdfBytes.length}` : "document");
    }
    if (sourceMode === "web") {
      return webUrl || webTitle || "web_article";
    }
    return "document";
  }, [sourceMode, fileName, pdfBytes, webUrl, webTitle]);

  /* Restore saved reader mode play/pause location when reader mode or document is ready */
  useEffect(() => {
    if (activeMode === "reader" && ttsStateRef.current === "idle") {
      const currentParas = fullDocParagraphs.length > 0 ? fullDocParagraphs : paragraphs;
      if (currentParas.length > 0 && currentDocKey) {
        const saved = getSavedReaderPosition(currentDocKey);
        if (saved && saved.paraIndex >= 0 && saved.paraIndex < currentParas.length) {
          currentReadingPosRef.current = { paraIndex: saved.paraIndex, charOffset: saved.charOffset };
          if (activePara < 0) {
            setActivePara(saved.paraIndex);
            setActiveCharOffset(saved.charOffset);
            setParaProgress(saved.progress ?? 0);
          }
        }
      }
    }
  }, [activeMode, fullDocParagraphs, paragraphs, currentDocKey, activePara]);

  /* Clear single-page markdown and token cache when document changes */
  useEffect(() => {
    pageMarkdownCacheRef.current.clear();
    pendingPageMarkdownRequestsRef.current.clear();
    clearTokenCache();
    setCurrentPageMarkdown("");
  }, [pdfBytes, fileName]);

  /* Synchronize current page markdown from memory cache on page change without eager recalculation */
  useEffect(() => {
    if (pageMarkdownCacheRef.current.has(pageNum)) {
      setCurrentPageMarkdown(pageMarkdownCacheRef.current.get(pageNum)!);
    } else if (sourceMode === "web" && paragraphs.length > 0) {
      const res = convertWebToMarkdown(webTitle, webUrl, paragraphs);
      setCurrentPageMarkdown(res.markdown || "");
    } else {
      setCurrentPageMarkdown("");
    }
  }, [pageNum, sourceMode, webTitle, webUrl, paragraphs]);

  /* On-demand generator for single page markdown with in-memory caching */
  const getPageMarkdown = useCallback(
    async (targetPage: number): Promise<string> => {
      // 1. Check in-memory cache
      if (pageMarkdownCacheRef.current.has(targetPage)) {
        return pageMarkdownCacheRef.current.get(targetPage)!;
      }

      // 2. Check in-flight promise to avoid duplicate concurrent extractions
      if (pendingPageMarkdownRequestsRef.current.has(targetPage)) {
        return pendingPageMarkdownRequestsRef.current.get(targetPage)!;
      }

      // 3. Web mode fallback
      if (sourceMode === "web") {
        if (paragraphs.length > 0) {
          const res = convertWebToMarkdown(webTitle, webUrl, paragraphs);
          const md = res.markdown || "";
          pageMarkdownCacheRef.current.set(targetPage, md);
          return md;
        }
        return "";
      }

      // 4. PDF mode extraction via background worker
      if (sourceMode === "pdf" && pdfBytes && targetPage >= 1) {
        const docKey = fileName || "document";
        const promise = (async () => {
          try {
            const res = await convertBytesToMarkdown(pdfBytes, fileName, [targetPage]);
            const md = res.markdown || "";
            pageMarkdownCacheRef.current.set(targetPage, md);
            if (res.stats && typeof res.stats.estimatedTokens === "number") {
              setPageTokenCount(docKey, targetPage, res.stats.estimatedTokens);
              setCachedTokenCount(md, res.stats.estimatedTokens);
            }
            if (targetPage === pageNum) {
              setCurrentPageMarkdown(md);
            }
            return md;
          } catch (err) {
            console.warn(`Single page ${targetPage} markdown extraction failed:`, err);
            const fallbackMd = paragraphs.length > 0 ? paragraphs.join("\n\n") : "";
            pageMarkdownCacheRef.current.set(targetPage, fallbackMd);
            return fallbackMd;
          } finally {
            pendingPageMarkdownRequestsRef.current.delete(targetPage);
          }
        })();

        pendingPageMarkdownRequestsRef.current.set(targetPage, promise);
        return promise;
      }

      return "";
    },
    [sourceMode, pdfBytes, fileName, pageNum, webTitle, webUrl, paragraphs]
  );

  /* Resizable & Collapsible Left Sidebar (Reader / TTS) */
  const {
    width: sidebarWidth,
    isOpen: sidebarOpen,
    isDragging: isSidebarDragging,
    setIsOpen: setSidebarOpen,
    resetWidth: resetSidebarWidth,
    handleMouseDown: handleSidebarMouseDown,
    handleTouchStart: handleSidebarTouchStart,
  } = useResizableSidebar({
    storageKeyPrefix: "pdf_reader_sidebar",
    defaultWidth: 320,
    minWidth: 240,
    maxWidth: 720,
    collapseThreshold: 140,
    defaultOpen: typeof window !== "undefined" ? window.innerWidth >= 768 : true,
    side: "left",
  });

  /* Resizable & Collapsible Right Sidebar (Firebase AI Chat) */
  const {
    width: aiSidebarWidth,
    isOpen: aiSidebarOpen,
    isDragging: isAiSidebarDragging,
    setIsOpen: setAiSidebarOpen,
    resetWidth: resetAiSidebarWidth,
    handleMouseDown: handleAiSidebarMouseDown,
    handleTouchStart: handleAiSidebarTouchStart,
  } = useResizableSidebar({
    storageKeyPrefix: "pdf_reader_ai_sidebar",
    defaultWidth: 360,
    minWidth: 260,
    maxWidth: 720,
    collapseThreshold: 150,
    defaultOpen: typeof window !== "undefined" ? window.innerWidth >= 1280 : false,
    side: "right",
  });

  const hasDocument = sourceMode === "pdf" ? !!(pdfDoc && pdfBytes) : webLoaded;


  /* Extract and cache document Markdown using anydoc-wasm for AI context (runs once per loaded document) */
  useEffect(() => {
    let isMounted = true;
    const docKey = sourceMode === "web" ? (webTitle || "web-article") : (fileName || "document");

    if (sourceMode === "pdf" && pdfBytes) {
      // Avoid redundant extraction if document markdown is already generated for this file
      if (getAllPagesTokenCount(docKey) !== undefined && docMarkdown) {
        return;
      }
      setIsExtractingMarkdown(true);
      convertBytesToMarkdown(pdfBytes, fileName)
        .then((res) => {
          if (isMounted) {
            const md = res.markdown || "";
            setDocMarkdown(md);
            setIsExtractingMarkdown(false);
            // Cache total token count for all pages
            if (res.stats && typeof res.stats.estimatedTokens === "number") {
              setAllPagesTokenCount(docKey, res.stats.estimatedTokens);
              setCachedTokenCount(md, res.stats.estimatedTokens);
            }
          }
        })
        .catch((err) => {
          console.warn("Markdown extraction for AI context failed:", err);
          if (isMounted) {
            setIsExtractingMarkdown(false);
          }
        });
    } else if (sourceMode === "web" && webLoaded) {
      if (getAllPagesTokenCount(docKey) !== undefined && docMarkdown) {
        return;
      }
      const res = convertWebToMarkdown(webTitle, webUrl, paragraphs);
      const md = res.markdown || "";
      setDocMarkdown(md);
      setIsExtractingMarkdown(false);
      if (res.stats && typeof res.stats.estimatedTokens === "number") {
        setAllPagesTokenCount(docKey, res.stats.estimatedTokens);
        setCachedTokenCount(md, res.stats.estimatedTokens);
      }
    } else if (!pdfBytes && !webLoaded) {
      setDocMarkdown("");
      setIsExtractingMarkdown(false);
    }
    return () => {
      isMounted = false;
    };
  }, [sourceMode, pdfBytes, fileName, webTitle, webUrl, webLoaded]);

  /* SEO */
  useEffect(() => {
    const name = sourceMode === "web" ? webTitle : fileName;
    document.title = name ? `${name} – Pdf Reader` : "Pdf Reader – Free PDF & Web Reader with Text-to-Speech";
  }, [fileName, webTitle, sourceMode]);

  /* Voices */
  useEffect(() => {
    const load = () => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setVoices(v);
        setSelectedVoiceState((prevVoice) => {
          const resolved = resolveBestVoice(v, prevVoice);
          const bestName = resolved?.name ?? "";
          if (bestName) {
            saveTtsVoicePreference(bestName, resolved?.lang);
            selectedVoiceRef.current = bestName;
          }
          return bestName;
        });
      }
    };
    load();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = load;
    }
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  /* Global drag */
  useEffect(() => {
    const onDE = (e: globalThis.DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      dragCounterRef.current++;
      setGlobalDrag(true);
    };
    const onDL = () => {
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (!dragCounterRef.current) setGlobalDrag(false);
    };
    const onDO = (e: globalThis.DragEvent) => e.preventDefault();
    const onDrop = (e: globalThis.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setGlobalDrag(false);
      handleFile(e.dataTransfer?.files[0]);
    };
    window.addEventListener("dragenter", onDE);
    window.addEventListener("dragleave", onDL);
    window.addEventListener("dragover", onDO);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDE);
      window.removeEventListener("dragleave", onDL);
      window.removeEventListener("dragover", onDO);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  /* Scroll active para */
  useEffect(() => {
    if (activePara < 0 || !paraListRef.current) return;
    paraListRef.current.querySelector<HTMLElement>(`[data-para="${activePara}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activePara]);

  /* PDF page extraction */
  const extractPageText = useCallback(async (page: any, hPct: number, fPct: number) => {
    const pgH: number = page.getViewport({ scale: 1 }).height;
    const headerMin = pgH * (1 - hPct / 100);
    const footerMax = pgH * (fPct / 100);
    const { items } = await page.getTextContent();
    const hI: string[] = [];
    const fI: string[] = [];
    const bI: string[] = [];
    for (const item of items as any[]) {
      if (!item.str?.trim()) continue;
      const y: number = item.transform[5];
      if (y >= headerMin) hI.push(item.str);
      else if (y <= footerMax) fI.push(item.str);
      else bI.push(item.str);
    }
    return { header: hI.join(" ").trim(), footer: fI.join(" ").trim(), body: bI.join(" ").trim() };
  }, []);

  const loadPageText = useCallback(
    async (doc: any, num: number, hPct: number, fPct: number) => {
      if (!doc || num < 1 || num > doc.numPages) return;
      setPageTextLoading(true);
      try {
        const page = await doc.getPage(num);
        const { header, footer, body } = await extractPageText(page, hPct, fPct);
        setHeaderText(header);
        setFooterText(footer);
        setParagraphs(splitParagraphs(body));
      } catch (_) {
      } finally {
        setPageTextLoading(false);
      }
    },
    [extractPageText]
  );

  useEffect(() => {
    if (pdfDoc && sourceMode === "pdf") {
      loadPageText(pdfDoc, pageNum, headerPct, footerPct);
    }
  }, [pdfDoc, pageNum, headerPct, footerPct, loadPageText, sourceMode]);

  /* Extract full document paragraphs across all pages for Reader Mode */
  useEffect(() => {
    let isMounted = true;
    if (pdfDoc && sourceMode === "pdf") {
      setFullDocLoading(true);
      (async () => {
        try {
          const allParas: string[] = [];
          const breakIndices: number[] = [];
          const numMap: Record<number, number> = {};

          for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const { body } = await extractPageText(page, headerPct, footerPct);
            if (body.trim()) {
              const pageParas = splitParagraphs(body);
              if (pageParas.length > 0) {
                if (i > 1 && allParas.length > 0) {
                  breakIndices.push(allParas.length);
                  numMap[allParas.length] = i;
                }
                allParas.push(...pageParas);
              }
            }
          }
          if (isMounted) {
            setFullDocParagraphs(allParas);
            setPageBreakIndices(breakIndices);
            setPageNumberMap(numMap);
          }
        } catch (err) {
          console.warn("Failed to extract full document paragraphs:", err);
        } finally {
          if (isMounted) {
            setFullDocLoading(false);
          }
        }
      })();
    } else if (sourceMode === "web" && paragraphs.length > 0) {
      setFullDocParagraphs(paragraphs);
      setPageBreakIndices([]);
      setPageNumberMap({});
      setFullDocLoading(false);
    } else if (!pdfDoc && !webLoaded) {
      setFullDocParagraphs([]);
      setPageBreakIndices([]);
      setPageNumberMap({});
      setFullDocLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [pdfDoc, headerPct, footerPct, sourceMode, paragraphs, extractPageText, webLoaded]);

  /* Single page canvas rendering (for Single page view mode) */
  const renderSinglePage = useCallback(async (doc: any, num: number, sc: number) => {
    if (!doc || !canvasRef.current) return;
    setRendering(true);
    try {
      const page = await doc.getPage(num);
      const vp = page.getViewport({ scale: sc });
      const canvas = canvasRef.current;
      canvas.height = vp.height;
      canvas.width = vp.width;
      await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
    } finally {
      setRendering(false);
    }
  }, []);

  useEffect(() => {
    if (pdfDoc && sourceMode === "pdf" && viewMode === "single") {
      renderSinglePage(pdfDoc, pageNum, scale);
    }
  }, [pdfDoc, pageNum, scale, viewMode, sourceMode, renderSinglePage]);

  /* Smooth scroll to specific page in vertical scroll mode */
  const scrollToPage = useCallback((num: number) => {
    const el = pageRefs.current[num];
    if (!el || !scrollContainerRef.current) return;
    isProgrammaticScrollingRef.current = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      isProgrammaticScrollingRef.current = false;
    }, 600);
  }, []);

  /* Continuous Scroll Observer - Tracks the most visible page in the viewport */
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || viewMode !== "scroll" || sourceMode !== "pdf" || !totalPages) return;

    let rafId: number | null = null;

    const onScroll = () => {
      if (isProgrammaticScrollingRef.current) return;

      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect();
        if (containerRect.height === 0) return;

        let maxVisibleHeight = 0;
        let mostVisiblePage = pageNum;

        for (let i = 1; i <= totalPages; i++) {
          const el = pageRefs.current[i];
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          const visibleTop = Math.max(containerRect.top, rect.top);
          const visibleBottom = Math.min(containerRect.bottom, rect.bottom);
          const visibleHeight = Math.max(0, visibleBottom - visibleTop);

          if (visibleHeight > maxVisibleHeight) {
            maxVisibleHeight = visibleHeight;
            mostVisiblePage = i;
          }
        }

        if (mostVisiblePage !== pageNum && mostVisiblePage >= 1 && mostVisiblePage <= totalPages) {
          setPageNum(mostVisiblePage);
        }
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [viewMode, sourceMode, totalPages, pageNum]);

  const stopTts = useCallback(
    (_userTriggered?: boolean) => {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      activeUtteranceIdRef.current++;
      autoNextRef.current = false;
      pendingAutoPlay.current = false;
      ttsStateRef.current = "idle";
      setTtsState("idle");
      window.speechSynthesis.cancel();
      stopKeepAlive();
      setActivePara(-1);
      setActiveCharOffset(0);
      setParaProgress(0);
    },
    [stopKeepAlive]
  );

  /* PDF load */
  const loadPdf = useCallback(
    async (file: File) => {
      if (!window.pdfjsLib) {
        pendingFileRef.current = file;
        return;
      }
      stopTts(false);
      setPdfLoading(true);
      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        setPdfBytes(bytes);

        const doc = await window.pdfjsLib.getDocument({ data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }).promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setPageNum(1);
        setFileName(file.name);
        setSourceMode("pdf");
        setWebLoaded(false);
        setWebTitle("");
        setWebError("");

        const sizes: PageSize[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          try {
            const p = await doc.getPage(i);
            const vp = p.getViewport({ scale: 1 });
            sizes.push({ width: vp.width, height: vp.height, aspectRatio: vp.width / vp.height });
          } catch {
            sizes.push({ width: 612, height: 792, aspectRatio: 612 / 792 });
          }
        }
        setPageSizes(sizes);
      } finally {
        setPdfLoading(false);
      }
    },
    [stopTts]
  );

  const handleSaveEditedPdf = (newBytes: Uint8Array, newName?: string) => {
    const copy = new Uint8Array(
      newBytes.buffer.slice(newBytes.byteOffset, newBytes.byteOffset + newBytes.byteLength)
    );
    setPdfBytes(copy);
    const blob = new Blob([copy], { type: "application/pdf" });
    const nameToUse = newName || fileName || "edited.pdf";
    const file = new File([blob], nameToUse, { type: "application/pdf" });
    setActiveMode("viewer");
    loadPdf(file);
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      loadPdf(file);
    } else {
      stopTts(false);
      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        setPdfBytes(bytes);
        setFileName(file.name);
        setPdfDoc(null);
        setTotalPages(1);
        setPageNum(1);
        setSourceMode("pdf");
        setWebLoaded(false);
        setWebTitle("");
        setWebError("");
        const res = await convertBytesToMarkdown(bytes, file.name);
        if (res.markdown) {
          const rawParas = res.markdown
            .split(/\n\n+/)
            .map((p) => p.replace(/[#*`_>]/g, "").trim())
            .filter((p) => p.length > 5);
          setParagraphs(rawParas.length > 0 ? rawParas : [res.markdown]);
        }
        setIsMarkdownModalOpen(true);
      } catch (err) {
        console.error("Document conversion error:", err);
      }
    }
  };

  const handleLoadSampleDocument = async () => {
    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const sampleDoc = await PDFDocument.create();
      const page = sampleDoc.addPage([595.28, 841.89]); // A4
      const fontBold = await sampleDoc.embedFont(StandardFonts.HelveticaBold);
      const fontRegular = await sampleDoc.embedFont(StandardFonts.Helvetica);
      const fontItalic = await sampleDoc.embedFont(StandardFonts.HelveticaOblique);

      // Header Brand
      page.drawText("PDF READER", {
        x: 50,
        y: 775,
        size: 20,
        font: fontBold,
        color: rgb(0.85, 0.47, 0.04), // amber/gold
      });

      page.drawText("The Art of Deep Reading, Narration & Document Intelligence", {
        x: 50,
        y: 752,
        size: 11,
        font: fontItalic,
        color: rgb(0.4, 0.45, 0.52),
      });

      page.drawLine({
        start: { x: 50, y: 736 },
        end: { x: 545, y: 736 },
        thickness: 1.5,
        color: rgb(0.85, 0.86, 0.9),
      });

      const sections = [
        {
          heading: "1. Welcome to your Browser-Native Reading Sanctuary",
          body: "Pdf Reader is an in-browser document studio designed for deep focus, fluid speech narration, and local AI intelligence. Every file you open remains 100% private, executed locally in a client-side WebAssembly environment without sending data to external servers.",
        },
        {
          heading: "2. Synchronized Text-to-Speech Narration",
          body: "Click 'Read Document' in the left sidebar to activate speech synthesis. Pdf Reader highlights each paragraph in real-time as it is spoken. You can modulate reading speed, pitch, and choose from dozens of natural voices.",
        },
        {
          heading: "3. Dual AI Intelligence (Local & Cloud)",
          body: "Press Ctrl+J to open the AI Chat companion. You can query this entire document or focus on individual pages using on-device Chrome Gemini Nano or Cloud Gemini 3.7 Flash with instant citations.",
        },
        {
          heading: "4. Fullscreen Markup & Annotation Studio",
          body: "Click 'Edit PDF' in the top toolbar to annotate, draw, sign, stamp, or reorganize pages effortlessly before exporting a pristine PDF.",
        },
      ];

      let curY = 705;
      for (const sec of sections) {
        page.drawText(sec.heading, {
          x: 50,
          y: curY,
          size: 11.5,
          font: fontBold,
          color: rgb(0.12, 0.15, 0.2),
        });
        curY -= 18;

        page.drawText(sec.body, {
          x: 50,
          y: curY,
          size: 10,
          font: fontRegular,
          color: rgb(0.25, 0.28, 0.35),
          maxWidth: 495,
          lineHeight: 15,
        });
        curY -= 62;
      }

      const pdfBytesData = await sampleDoc.save();
      const blob = new Blob([pdfBytesData], { type: "application/pdf" });
      const sampleFile = new File([blob], "Pdf_Reader_Guide.pdf", { type: "application/pdf" });
      loadPdf(sampleFile);
    } catch (err) {
      console.error("Failed to generate sample PDF:", err);
    }
  };

  /* PWA launch handling & install prompt */
  useEffect(() => {
    if (pdfReady && pendingFileRef.current) {
      const f = pendingFileRef.current;
      pendingFileRef.current = null;
      loadPdf(f);
    }
  }, [pdfReady, loadPdf]);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone) {
      setIsStandalone(true);
    }

    const handleInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleInstall);

    if ("launchQueue" in window && window.launchQueue) {
      window.launchQueue.setConsumer(async (launchParams) => {
        if (!launchParams.files || !launchParams.files.length) return;
        for (const handle of launchParams.files) {
          if (handle.kind === "file") {
            try {
              const file = await handle.getFile();
              if (file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
                if (window.pdfjsLib) {
                  loadPdf(file);
                } else {
                  pendingFileRef.current = file;
                }
              }
            } catch (err) {
              console.error("Error loading launched file from OS:", err);
            }
          }
        }
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstall);
    };
  }, [loadPdf]);

  /* Web page fetch */
  const fetchWebPage = async (url: string) => {
    stopTts(false);
    setWebLoading(true);
    setWebError("");
    setWebLoaded(false);
    setWebUrl(url);
    try {
      const res = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}`;
        try {
          const errData = await res.json();
          if (errData?.error) errorMsg = errData.error;
        } catch {
          // ignore JSON parse error for error response
        }
        throw new Error(errorMsg);
      }
      const json = await res.json();
      const html: string = json.html || json.contents;
      if (!html) throw new Error("Empty response – the site may block access.");
      const { title, paragraphs: paras } = extractTextFromHtml(html);
      if (!paras.length) throw new Error("No readable text found on this page.");
      setWebTitle(title);
      setParagraphs(paras);
      setWebLoaded(true);
      setSourceMode("web");
      setPdfDoc(null);
      setFileName("");
    } catch (err: unknown) {
      const error = err as Error;
      setWebError(error.message || "Failed to fetch webpage");
    } finally {
      setWebLoading(false);
    }
  };

  const clearWeb = () => {
    setWebLoaded(false);
    setWebTitle("");
    setWebError("");
    setParagraphs([]);
    stopTts();
  };

  const changePage = useCallback(
    (num: number) => {
      if (num >= 1 && num <= totalPages) {
        stopTts();
        setPageNum(num);
        if (viewMode === "scroll") {
          scrollToPage(num);
        }
      }
    },
    [totalPages, viewMode, scrollToPage, stopTts]
  );

  /* Document Search in PDF / Web */
  const {
    isOpen: isSearchOpen,
    openSearch,
    closeSearch,
    searchQuery,
    setSearchQuery,
    isSearching,
    options: searchOptions,
    setMatchCase,
    setWholeWord,
    matches: searchMatches,
    totalMatches,
    activeMatchIndex,
    goToNextMatch,
    goToPrevMatch,
    getPageMatches,
  } = useDocumentSearch({
    sourceMode,
    pdfDoc,
    pdfBytes,
    totalPages,
    currentPage: pageNum,
    paragraphs,
    onNavigateToPage: changePage,
  });

  const doAutoNext = useCallback(() => {
    setPageNum((p) => {
      const next = p + 1;
      pendingAutoPlay.current = true;
      if (viewMode === "scroll") {
        scrollToPage(next);
      }
      return next;
    });
  }, [viewMode, scrollToPage]);

  /* TTS core */
  const buildAndSpeak = useCallback(
    (fromIdx: number, charOffset = 0) => {
      const currentParas = (activeMode === "reader" && fullDocParagraphs.length > 0) ? fullDocParagraphs : paragraphs;
      if (!currentParas.length) return;
      const utterId = ++activeUtteranceIdRef.current;
      window.speechSynthesis.cancel();
      stopKeepAlive();
      const startPara = currentParas[fromIdx] ?? "";
      const slicedFirst = startPara.slice(charOffset);
      const restParas = currentParas.slice(fromIdx + 1);
      const parts: string[] = [];
      if (readHeader && headerText && fromIdx === 0 && charOffset === 0 && sourceMode === "pdf" && activeMode !== "reader") parts.push(headerText);
      parts.push(slicedFirst, ...restParas);
      if (readFooter && footerText && sourceMode === "pdf" && activeMode !== "reader") parts.push(footerText);
      const text = parts.join(" ").trim();
      if (!text) {
        setTtsState("idle");
        ttsStateRef.current = "idle";
        setActivePara(-1);
        setParaProgress(0);
        currentReadingPosRef.current = { paraIndex: 0, charOffset: 0 };
        return;
      }
      const headerOff = parts[0] === headerText ? headerText.length + 1 : 0;
      const localParas = [slicedFirst, ...restParas];
      const localStarts = getParagraphStarts(localParas);
      setActivePara(fromIdx);
      setActiveCharOffset(charOffset);
      currentReadingPosRef.current = { paraIndex: fromIdx, charOffset };
      const initialProgress = charOffset / (startPara.length || 1);
      setParaProgress(initialProgress);
      if (activeMode === "reader" && currentDocKey) {
        saveReaderPosition(currentDocKey, {
          paraIndex: fromIdx,
          charOffset,
          progress: initialProgress,
        });
      }
      startKeepAlive();
      autoNextRef.current = false;
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = ttsRateRef.current;
      utter.pitch = ttsPitchRef.current;
      utter.volume = ttsVolumeRef.current;
      const voice = voices.find((v) => v.name === selectedVoiceRef.current) || resolveBestVoice(voices, selectedVoiceRef.current);
      if (voice) utter.voice = voice;
      utter.onboundary = (e: SpeechSynthesisEvent) => {
        if (activeUtteranceIdRef.current !== utterId) return;
        if (e.name !== "word") return;
        const c = e.charIndex - headerOff;
        if (c < 0) return;
        let li = 0;
        for (let i = 0; i < localParas.length; i++) {
          if (localStarts[i] <= c) li = i;
          else break;
        }
        const actualIdx = fromIdx + li;
        setActivePara(actualIdx);
        const charInLocal = c - localStarts[li];
        const actualCharOffset = li === 0 ? charOffset + charInLocal : charInLocal;
        currentReadingPosRef.current = { paraIndex: actualIdx, charOffset: actualCharOffset };
        setActiveCharOffset(actualCharOffset);
        const fullParaText = currentParas[actualIdx] ?? "";
        const wordProgress = Math.min(1, actualCharOffset / (fullParaText.length || 1));
        setParaProgress(wordProgress);
        if (activeMode === "reader" && currentDocKey) {
          saveReaderPosition(currentDocKey, {
            paraIndex: actualIdx,
            charOffset: actualCharOffset,
            progress: wordProgress,
          });
        }
      };
      utter.onend = () => {
        if (activeUtteranceIdRef.current !== utterId) return;
        if (ttsStateRef.current !== "playing") return;
        stopKeepAlive();
        setTtsState("idle");
        ttsStateRef.current = "idle";
        setActivePara(-1);
        setActiveCharOffset(0);
        setParaProgress(0);
        currentReadingPosRef.current = { paraIndex: 0, charOffset: 0 };
        if (autoNextRef.current && activeMode !== "reader") {
          autoNextRef.current = false;
          doAutoNext();
        }
      };
      utter.onerror = () => {
        if (activeUtteranceIdRef.current !== utterId) return;
        if (ttsStateRef.current !== "playing") return;
        stopKeepAlive();
        setTtsState("idle");
        ttsStateRef.current = "idle";
        setActivePara(-1);
        setActiveCharOffset(0);
        setParaProgress(0);
        autoNextRef.current = false;
      };
      autoNextRef.current = autoNextPage;
      window.speechSynthesis.speak(utter);
      setTtsState("playing");
      ttsStateRef.current = "playing";
    },
    [paragraphs, fullDocParagraphs, activeMode, headerText, footerText, readHeader, readFooter, sourceMode, voices, autoNextPage, startKeepAlive, stopKeepAlive, doAutoNext, currentDocKey]
  );

  const restartPlaybackDebounced = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (ttsStateRef.current !== "playing") {
      return;
    }
    restartTimerRef.current = window.setTimeout(() => {
      if (ttsStateRef.current === "playing") {
        const currentParas = (activeMode === "reader" && fullDocParagraphs.length > 0) ? fullDocParagraphs : paragraphs;
        const { paraIndex, charOffset } = currentReadingPosRef.current;
        const pIdx = Math.max(0, Math.min(currentParas.length - 1, paraIndex));
        const targetText = currentParas[pIdx] ?? "";
        const snappedOffset = snapToWord(targetText, charOffset);
        buildAndSpeak(pIdx, snappedOffset);
      }
    }, 120);
  }, [paragraphs, fullDocParagraphs, activeMode, buildAndSpeak]);

  const setSelectedVoice = useCallback((v: string) => {
    setSelectedVoiceState(v);
    selectedVoiceRef.current = v;
    const matched = voices.find((item) => item.name === v);
    saveTtsVoicePreference(v, matched?.lang);
    if (ttsStateRef.current === "playing") {
      restartPlaybackDebounced();
    }
  }, [voices, restartPlaybackDebounced]);

  const setTtsRate = useCallback((r: number) => {
    setTtsRateState(r);
    ttsRateRef.current = r;
    saveTtsRate(r);
    if (ttsStateRef.current === "playing") {
      restartPlaybackDebounced();
    }
  }, [restartPlaybackDebounced]);

  const setTtsPitch = useCallback((p: number) => {
    setTtsPitchState(p);
    ttsPitchRef.current = p;
    saveTtsPitch(p);
    if (ttsStateRef.current === "playing") {
      restartPlaybackDebounced();
    }
  }, [restartPlaybackDebounced]);

  const setTtsVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setTtsVolumeState(clamped);
    ttsVolumeRef.current = clamped;
    saveTtsVolume(clamped);
    if (ttsStateRef.current === "playing") {
      restartPlaybackDebounced();
    }
  }, [restartPlaybackDebounced]);

  const setAutoNextPage = useCallback((a: boolean) => {
    setAutoNextPageState(a);
    saveAutoNext(a);
  }, []);

  const startReading = useCallback(
    (i: number, offset?: number) => {
      const currentParas = (activeMode === "reader" && fullDocParagraphs.length > 0) ? fullDocParagraphs : paragraphs;
      if (!currentParas.length) return;
      const targetText = currentParas[i] ?? "";
      if (offset !== undefined) {
        buildAndSpeak(i, snapToWord(targetText, offset));
        return;
      }
      if (
        (ttsStateRef.current === "paused" || ttsStateRef.current === "idle") &&
        currentReadingPosRef.current.paraIndex === i &&
        currentReadingPosRef.current.charOffset > 0
      ) {
        buildAndSpeak(i, snapToWord(targetText, currentReadingPosRef.current.charOffset));
        return;
      }
      if (activeMode === "reader" && currentDocKey) {
        const saved = getSavedReaderPosition(currentDocKey);
        if (saved && saved.paraIndex === i && saved.charOffset > 0) {
          buildAndSpeak(i, snapToWord(targetText, saved.charOffset));
          return;
        }
      }
      buildAndSpeak(i, 0);
    },
    [paragraphs, fullDocParagraphs, activeMode, buildAndSpeak, currentDocKey]
  );
  const seekTo = useCallback(
    (pi: number, ratio: number) => {
      const currentParas = (activeMode === "reader" && fullDocParagraphs.length > 0) ? fullDocParagraphs : paragraphs;
      const t = currentParas[pi] ?? "";
      buildAndSpeak(pi, snapToWord(t, Math.floor(ratio * t.length)));
    },
    [paragraphs, fullDocParagraphs, activeMode, buildAndSpeak]
  );

  useEffect(() => {
    const currentParas = (activeMode === "reader" && fullDocParagraphs.length > 0) ? fullDocParagraphs : paragraphs;
    if (pendingAutoPlay.current && currentParas.length > 0) {
      pendingAutoPlay.current = false;
      startReading(0);
    }
  }, [paragraphs, fullDocParagraphs, activeMode, startReading]);

  const pauseTts = () => {
    const currentParas = (activeMode === "reader" && fullDocParagraphs.length > 0) ? fullDocParagraphs : paragraphs;
    if (ttsStateRef.current === "playing" || ttsState === "playing") {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      activeUtteranceIdRef.current++;
      autoNextRef.current = false;
      pendingAutoPlay.current = false;
      ttsStateRef.current = "paused";
      setTtsState("paused");
      window.speechSynthesis.cancel();
      stopKeepAlive();
      if (activeMode === "reader" && currentDocKey) {
        saveReaderPosition(currentDocKey, {
          paraIndex: currentReadingPosRef.current.paraIndex,
          charOffset: currentReadingPosRef.current.charOffset,
          progress: paraProgress,
        });
      }
    } else if (ttsStateRef.current === "paused" || ttsState === "paused") {
      const { paraIndex, charOffset } = currentReadingPosRef.current;
      const pIdx = Math.max(0, Math.min(currentParas.length - 1, paraIndex));
      const targetText = currentParas[pIdx] ?? "";
      const snapped = snapToWord(targetText, charOffset);
      buildAndSpeak(pIdx, snapped);
    } else if (currentParas.length > 0) {
      if (activeMode === "reader" && currentDocKey) {
        const saved = getSavedReaderPosition(currentDocKey);
        if (saved && saved.paraIndex >= 0 && saved.paraIndex < currentParas.length) {
          const pIdx = saved.paraIndex;
          const targetText = currentParas[pIdx] ?? "";
          const snapped = snapToWord(targetText, saved.charOffset || 0);
          buildAndSpeak(pIdx, snapped);
          return;
        }
      }
      const pIdx = activePara >= 0 ? activePara : 0;
      const targetText = currentParas[pIdx] ?? "";
      const snapped = snapToWord(targetText, activeCharOffset > 0 ? activeCharOffset : 0);
      buildAndSpeak(pIdx, snapped);
    }
  };

  const prevPage = () => changePage(pageNum - 1);
  const nextPage = () => changePage(pageNum + 1);

  /* MediaSession PWA API Integration (Lock screen playback, background keepalive, OS media controls) */
  const handleMediaSessionPrev = useCallback(() => {
    const currentParas = (activeMode === "reader" && fullDocParagraphs.length > 0) ? fullDocParagraphs : paragraphs;
    if (!currentParas.length) return;
    if (activeMode === "reader" || sourceMode === "web") {
      const current = activePara >= 0 ? activePara : 0;
      const prev = Math.max(0, current - 1);
      startReading(prev, 0);
    } else {
      if (activePara > 0) {
        startReading(activePara - 1, 0);
      } else if (pageNum > 1) {
        changePage(pageNum - 1);
        pendingAutoPlay.current = true;
      } else {
        startReading(0, 0);
      }
    }
  }, [activeMode, fullDocParagraphs, paragraphs, sourceMode, activePara, pageNum, startReading, changePage]);

  const handleMediaSessionNext = useCallback(() => {
    const currentParas = (activeMode === "reader" && fullDocParagraphs.length > 0) ? fullDocParagraphs : paragraphs;
    if (!currentParas.length) return;
    if (activeMode === "reader" || sourceMode === "web") {
      const current = activePara >= 0 ? activePara : -1;
      const next = Math.min(currentParas.length - 1, current + 1);
      startReading(next, 0);
    } else {
      if (activePara >= 0 && activePara < currentParas.length - 1) {
        startReading(activePara + 1, 0);
      } else if (pageNum < totalPages) {
        changePage(pageNum + 1);
        pendingAutoPlay.current = true;
      }
    }
  }, [activeMode, fullDocParagraphs, paragraphs, sourceMode, activePara, pageNum, totalPages, startReading, changePage]);

  const handleMediaSessionPlay = useCallback(() => {
    if (ttsState === "paused" || ttsState === "idle") {
      pauseTts();
    }
  }, [ttsState, pauseTts]);

  const handleMediaSessionPause = useCallback(() => {
    if (ttsState === "playing") {
      pauseTts();
    }
  }, [ttsState, pauseTts]);

  const handleMediaSessionStop = useCallback(() => {
    stopTts(true);
  }, [stopTts]);

  const docName = sourceMode === "web" ? (webTitle || "Web Article") : (fileName || "PDF Document");
  const totalParas = (activeMode === "reader" && fullDocParagraphs.length > 0) ? fullDocParagraphs.length : paragraphs.length;
  const currentParaDisplay = activePara >= 0 ? activePara + 1 : 1;

  let mediaSubtitle = "";
  if (activeMode === "reader") {
    mediaSubtitle = totalParas > 0 ? `Paragraph ${currentParaDisplay} of ${totalParas}` : "Reader Mode";
  } else if (sourceMode === "pdf" && totalPages > 1) {
    mediaSubtitle = `Page ${pageNum} of ${totalPages}${totalParas > 0 ? ` • Para ${currentParaDisplay} of ${totalParas}` : ""}`;
  } else {
    mediaSubtitle = totalParas > 0 ? `Paragraph ${currentParaDisplay} of ${totalParas}` : "PDF Reader";
  }

  useMediaSession({
    title: docName,
    artist: mediaSubtitle,
    album: "PDF Reader",
    ttsState,
    playbackRate: ttsRate,
    activePara: activePara >= 0 ? activePara : 0,
    totalParagraphs: totalParas,
    paraProgress,
    onPlay: handleMediaSessionPlay,
    onPause: handleMediaSessionPause,
    onPrev: handleMediaSessionPrev,
    onNext: handleMediaSessionNext,
    onSeekBackward: handleMediaSessionPrev,
    onSeekForward: handleMediaSessionNext,
    onStop: handleMediaSessionStop,
  });

  /* Global Keyboard shortcuts: Space (Play/Pause TTS), ArrowLeft/Right (Page navigation), Ctrl+F (Search), Ctrl+B, Ctrl+J, Alt+1/2/3 */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      // Global Ctrl+F / Cmd+F shortcut to open search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        if (hasDocument) {
          e.preventDefault();
          openSearch();
        }
        return;
      }

      // Escape shortcut to close search
      if (e.key === "Escape" && isSearchOpen) {
        e.preventDefault();
        closeSearch();
        return;
      }

      // F3 / Shift+F3 or Ctrl+G / Ctrl+Shift+G to jump between search matches
      if (e.key === "F3" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g")) {
        if (isSearchOpen && totalMatches > 0) {
          e.preventDefault();
          if (e.shiftKey) {
            goToPrevMatch();
          } else {
            goToNextMatch();
          }
        }
        return;
      }

      // Ignore regular typing keys when focused inside inputs, textareas, or editable elements
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      // Alt+1 / Alt+2 / Alt+3 Mode Switcher shortcuts
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === "1") {
          e.preventDefault();
          setActiveMode("viewer");
          return;
        }
        if (e.key === "2") {
          e.preventDefault();
          setActiveMode("reader");
          return;
        }
        if (e.key === "3") {
          e.preventDefault();
          if (pdfBytes) setActiveMode("editor");
          return;
        }
      }

      // Space key shortcut to play/pause TTS reading (viewer & reader mode)
      if (
        (e.code === "Space" || e.key === " " || e.key === "Spacebar") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        activeMode !== "editor"
      ) {
        const currentParas = (activeMode === "reader" && fullDocParagraphs.length > 0) ? fullDocParagraphs : paragraphs;
        if (hasDocument && currentParas.length > 0) {
          e.preventDefault();
          pauseTts();
          return;
        }
      }

      // Paragraph skipping in reader mode ([ and ] or Alt+Up and Alt+Down)
      if (activeMode === "reader") {
        const currentParas = fullDocParagraphs.length > 0 ? fullDocParagraphs : paragraphs;
        if (currentParas.length > 0) {
          if (
            (e.key === "[" && !e.ctrlKey && !e.metaKey) ||
            (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowLeft"))
          ) {
            e.preventDefault();
            const current = activePara >= 0 ? activePara : 0;
            const prev = Math.max(0, current - 1);
            startReading(prev, 0);
            return;
          }
          if (
            (e.key === "]" && !e.ctrlKey && !e.metaKey) ||
            (e.altKey && (e.key === "ArrowDown" || e.key === "ArrowRight"))
          ) {
            e.preventDefault();
            const current = activePara >= 0 ? activePara : -1;
            const next = Math.min(currentParas.length - 1, current + 1);
            startReading(next, 0);
            return;
          }
        }
      }

      // ArrowLeft / PageUp: Previous page in PDF viewer mode
      if (
        (e.key === "ArrowLeft" || e.key === "PageUp") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        activeMode === "viewer"
      ) {
        if (sourceMode === "pdf" && totalPages > 1 && pageNum > 1) {
          e.preventDefault();
          changePage(pageNum - 1);
          return;
        }
      }

      // ArrowRight / PageDown: Next page in PDF viewer mode
      if (
        (e.key === "ArrowRight" || e.key === "PageDown") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        activeMode === "viewer"
      ) {
        if (sourceMode === "pdf" && totalPages > 1 && pageNum < totalPages) {
          e.preventDefault();
          changePage(pageNum + 1);
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        if (hasDocument) {
          setAiSidebarOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    setSidebarOpen,
    setAiSidebarOpen,
    hasDocument,
    isSearchOpen,
    openSearch,
    closeSearch,
    totalMatches,
    goToNextMatch,
    goToPrevMatch,
    pdfBytes,
    activeMode,
    paragraphs.length,
    pauseTts,
    sourceMode,
    totalPages,
    pageNum,
    changePage,
  ]);

  /* Colour tokens */
  const isAmoled = resolvedTheme === "amoled";
  const d = isDark;
  const bg = isAmoled ? "#000000" : d ? "#0b0e14" : "#fbfaf8";
  const bgCard = isAmoled ? "#000000" : d ? "#111622" : "#ffffff";
  const bgSide = isAmoled ? "#050507" : d ? "#0e121b" : "#f4f2ed";
  const border = isAmoled ? "#1c1c21" : d ? "#1d2433" : "#e6e3da";
  const textMain = isAmoled ? "#ffffff" : d ? "#f0f3f9" : "#17181c";
  const textMut = isAmoled ? "#9e9ea7" : d ? "#828da0" : "#69665e";
  const bgInput = isAmoled ? "#0a0a0c" : d ? "#161c2b" : "#ffffff";
  const bgHover = isAmoled ? "#141418" : d ? "#1b2336" : "#eceae4";
  const bgCanvas = isAmoled ? "#000000" : d ? "#080a0f" : "#f2efe9";

  const displayTitle = sourceMode === "web" ? webTitle : fileName;
  const hasContent = paragraphs.length > 0;

  return (
    <DarkCtx.Provider value={isDark}>
      <ThemeCtx.Provider value={resolvedTheme}>
        <div className="h-screen flex flex-col overflow-hidden transition-colors duration-200" style={{ background: bg, color: textMain }}>
          <style>{`
            @keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin linear infinite}
            @keyframes bar1{0%,100%{height:4px}50%{height:14px}}
            @keyframes bar2{0%,100%{height:10px}50%{height:4px}}
            @keyframes bar3{0%,100%{height:14px}50%{height:6px}}
            @keyframes bar4{0%,100%{height:6px}50%{height:14px}}
            @keyframes bar5{0%,100%{height:8px}50%{height:3px}}
            .wavebar{display:inline-block;width:3px;border-radius:2px;background:#f59e0b}
            .wavebar.paused{animation-play-state:paused!important}
            .wb1{animation:bar1 0.7s ease-in-out infinite}.wb2{animation:bar2 0.5s ease-in-out infinite .1s}
            .wb3{animation:bar3 0.6s ease-in-out infinite .2s}.wb4{animation:bar4 0.8s ease-in-out infinite .05s}
            .wb5{animation:bar5 .55s ease-in-out infinite .15s}
            input[type=range]{height:6px}
            input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#f59e0b;cursor:pointer;margin-top:-4px}
            input[type=range]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#f59e0b;cursor:pointer;border:none}
            ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}
            ::-webkit-scrollbar-thumb{background:${isAmoled ? "#27272a" : d ? "#374151" : "#d1d5db"};border-radius:2px}
          `}</style>

          {/* Global drag overlay */}
          {globalDrag && (
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
              <div className="rounded-2xl border-2 border-dashed border-amber-400 px-16 py-12 flex flex-col items-center gap-4 shadow-2xl animate-pulse" style={{ background: "rgba(245,158,11,0.08)" }}>
                <div className="text-amber-400">📖</div>
                <p className="text-xl font-semibold text-amber-400">Drop your PDF here</p>
                <p className="text-sm" style={{ color: textMut }}>
                  Release to open the document
                </p>
              </div>
            </div>
          )}

          {/* Header with 3-Mode Switcher */}
          <Header
            activeMode={activeMode}
            onModeChange={(m) => {
              if (m === "editor" && !pdfBytes) return;
              setActiveMode(m);
            }}
            canOpenEditor={Boolean(pdfBytes)}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            aiSidebarOpen={aiSidebarOpen}
            setAiSidebarOpen={setAiSidebarOpen}
            isSearchOpen={isSearchOpen}
            onOpenSearch={openSearch}
            onCloseSearch={closeSearch}
            hasDocument={hasDocument}
            displayTitle={displayTitle}
            sourceMode={sourceMode}
            installPrompt={installPrompt}
            setInstallPrompt={setInstallPrompt}
            isStandalone={isStandalone}
            autoNextPage={autoNextPage}
            ttsState={ttsState}
            theme={theme}
            setTheme={setTheme}
            border={border}
            bgCard={bgCard}
            bgHover={bgHover}
            textMut={textMut}
          />

          {/* 1. Mode: Editor (PDF Studio Fullscreen Editor) */}
          {activeMode === "editor" && pdfBytes ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <Suspense
                fallback={
                  <div className="flex-1 flex items-center justify-center gap-3" style={{ background: bgCanvas }}>
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-semibold text-amber-500">Loading PDF Studio Editor...</span>
                  </div>
                }
              >
                <PdfEditor
                  pdfFileBytes={pdfBytes}
                  fileName={fileName}
                  onClose={() => setActiveMode("viewer")}
                  onSave={handleSaveEditedPdf}
                  isDark={isDark}
                />
              </Suspense>
            </div>
          ) : activeMode === "reader" ? (
            /* 2. Mode: Reader (Clean Markdown View + Left-Gutter TTS + Live Word Highlighting) */
            <div className="flex-1 flex flex-col overflow-hidden">
              <Suspense
                fallback={
                  <div className="flex-1 flex items-center justify-center gap-3" style={{ background: bgCanvas }}>
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-semibold text-amber-500">Preparing Reader View...</span>
                  </div>
                }
              >
                <ReaderModeView
                  sourceMode={sourceMode}
                  docTitle={displayTitle}
                  docMarkdown={docMarkdown}
                  paragraphs={fullDocParagraphs.length > 0 ? fullDocParagraphs : paragraphs}
                  activePara={activePara}
                  activeCharOffset={activeCharOffset}
                  paraProgress={paraProgress}
                  ttsState={ttsState}
                  startReading={startReading}
                  pauseTts={pauseTts}
                  stopTts={stopTts}
                  seekTo={seekTo}
                  voices={voices}
                  selectedVoice={selectedVoice}
                  setSelectedVoice={setSelectedVoice}
                  ttsRate={ttsRate}
                  setTtsRate={setTtsRate}
                  ttsPitch={ttsPitch}
                  setTtsPitch={setTtsPitch}
                  ttsVolume={ttsVolume}
                  setTtsVolume={setTtsVolume}
                  isLoading={pdfLoading || webLoading || isExtractingMarkdown || pageTextLoading || (sourceMode === "pdf" && fullDocLoading && fullDocParagraphs.length === 0)}
                  isExtractingMarkdown={isExtractingMarkdown}
                  pdfLoading={pdfLoading}
                  webLoading={webLoading}
                  pageBreakIndices={pageBreakIndices}
                  pageNumberMap={pageNumberMap}
                  fileInputRef={fileInputRef}
                  onLoadSample={handleLoadSampleDocument}
                  onExportMarkdown={() => setIsMarkdownModalOpen(true)}
                  isSearchOpen={isSearchOpen}
                  onOpenSearch={openSearch}
                  onCloseSearch={closeSearch}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  isSearching={isSearching}
                  searchOptions={searchOptions}
                  onToggleMatchCase={() => setMatchCase((v) => !v)}
                  onToggleWholeWord={() => setWholeWord((v) => !v)}
                  activeMatchIndex={activeMatchIndex}
                  totalMatches={totalMatches}
                  onNextMatch={goToNextMatch}
                  onPrevMatch={goToPrevMatch}
                  searchMatches={searchMatches}
                  border={border}
                  bgInput={bgInput}
                  bgCanvas={bgCanvas}
                  textMain={textMain}
                  textMut={textMut}
                />
              </Suspense>
            </div>
          ) : (
            /* 3. Mode: Viewer (Default On-Device PDF Viewer & AI Companion) */
            <div className="relative flex flex-1 overflow-hidden">
              {/* Floating trigger button to expand Left sidebar when collapsed */}
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  title="Expand left sidebar (Ctrl+B)"
                  className="absolute left-3 top-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-md border backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 group cursor-pointer"
                  style={{
                    background: isAmoled ? "rgba(0, 0, 0, 0.95)" : isDark ? "rgba(30, 41, 59, 0.9)" : "rgba(255, 255, 255, 0.94)",
                    borderColor: isAmoled ? "rgba(245, 158, 11, 0.5)" : isDark ? "rgba(245, 158, 11, 0.4)" : "#fbbf24",
                    color: textMain,
                  }}
                >
                  <span className="text-amber-500 transition-transform duration-150 group-hover:translate-x-0.5">
                    <IcoChevR size={13} />
                  </span>
                  <span className="text-xs font-bold text-amber-500">Sidebar</span>
                </button>
              )}

              {/* Left Sidebar (Document & TTS Controls) */}
              <Sidebar
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                sidebarWidth={sidebarWidth}
                isDragging={isSidebarDragging}
                onResizeMouseDown={handleSidebarMouseDown}
                onResizeTouchStart={handleSidebarTouchStart}
                onResetWidth={resetSidebarWidth}
                sourceMode={sourceMode}
                setSourceMode={setSourceMode}
                pdfReady={pdfReady}
                pdfDoc={pdfDoc}
                pdfBytes={pdfBytes}
                setIsEditorOpen={(open) => setActiveMode(open ? "editor" : "viewer")}
                fileInputRef={fileInputRef}
                handleFile={handleFile}
                localDrag={localDrag}
                setLocalDrag={setLocalDrag}
                fetchWebPage={fetchWebPage}
                webLoading={webLoading}
                webLoaded={webLoaded}
                webTitle={webTitle}
                webError={webError}
                clearWeb={clearWeb}
                hasContent={hasContent}
                ttsState={ttsState}
                startReading={startReading}
                pauseTts={pauseTts}
                stopTts={stopTts}
                voices={voices}
                selectedVoice={selectedVoice}
                setSelectedVoice={setSelectedVoice}
                ttsRate={ttsRate}
                setTtsRate={setTtsRate}
                ttsPitch={ttsPitch}
                setTtsPitch={setTtsPitch}
                ttsVolume={ttsVolume}
                setTtsVolume={setTtsVolume}
                autoNextPage={autoNextPage}
                setAutoNextPage={setAutoNextPage}
                headerText={headerText}
                readHeader={readHeader}
                setReadHeader={setReadHeader}
                headerPct={headerPct}
                setHeaderPct={setHeaderPct}
                footerText={footerText}
                readFooter={readFooter}
                setReadFooter={setReadFooter}
                footerPct={footerPct}
                setFooterPct={setFooterPct}
                paragraphs={paragraphs}
                activePara={activePara}
                paraProgress={paraProgress}
                seekTo={seekTo}
                paraListRef={paraListRef}
                border={border}
                bgSide={bgSide}
                bgInput={bgInput}
                bgHover={bgHover}
                textMain={textMain}
                textMut={textMut}
              />

              {/* Main viewer */}
              <PdfViewer
                sourceMode={sourceMode}
                viewMode={viewMode}
                setViewMode={setViewMode}
                pdfDoc={pdfDoc}
                pdfLoading={pdfLoading}
                pdfBytes={pdfBytes}
                pageNum={pageNum}
                totalPages={totalPages}
                scale={scale}
                setScale={setScale}
                prevPage={prevPage}
                nextPage={nextPage}
                changePage={changePage}
                autoNextPage={autoNextPage}
                pageSizes={pageSizes}
                scrollContainerRef={scrollContainerRef}
                pageRefs={pageRefs}
                canvasRef={canvasRef}
                fileInputRef={fileInputRef}
                rendering={rendering}
                setIsEditorOpen={(open) => setActiveMode(open ? "editor" : "viewer")}
                onExportMarkdown={() => setIsMarkdownModalOpen(true)}
                onLoadSample={handleLoadSampleDocument}
                isSearchOpen={isSearchOpen}
                onOpenSearch={openSearch}
                onCloseSearch={closeSearch}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isSearching={isSearching}
                searchOptions={searchOptions}
                onToggleMatchCase={() => setMatchCase((v) => !v)}
                onToggleWholeWord={() => setWholeWord((v) => !v)}
                activeMatchIndex={activeMatchIndex}
                totalMatches={totalMatches}
                onNextMatch={goToNextMatch}
                onPrevMatch={goToPrevMatch}
                getPageMatches={getPageMatches}
                searchMatches={searchMatches}
                webUrl={webUrl}
                webTitle={webTitle}
                webLoading={webLoading}
                webLoaded={webLoaded}
                paragraphs={paragraphs}
                activePara={activePara}
                ttsState={ttsState}
                paraProgress={paraProgress}
                startReading={startReading}
                seekTo={seekTo}
                border={border}
                bgCard={bgCard}
                bgInput={bgInput}
                bgHover={bgHover}
                bgCanvas={bgCanvas}
                textMain={textMain}
                textMut={textMut}
              />

              {/* Right Sidebar (Firebase AI Chat & Document Intelligence) - Shown only after document is loaded */}
              {hasDocument && (
                <Suspense fallback={null}>
                  <AiChatSidebar
                    sidebarOpen={aiSidebarOpen}
                    setSidebarOpen={setAiSidebarOpen}
                    sidebarWidth={aiSidebarWidth}
                    isDragging={isAiSidebarDragging}
                    onResizeMouseDown={handleAiSidebarMouseDown}
                    onResizeTouchStart={handleAiSidebarTouchStart}
                    onResetWidth={resetAiSidebarWidth}
                    docTitle={sourceMode === "web" ? webTitle : fileName}
                    docMarkdown={docMarkdown}
                    currentPageMarkdown={currentPageMarkdown}
                    getPageMarkdown={getPageMarkdown}
                    isExtractingMarkdown={isExtractingMarkdown}
                    currentPage={pageNum}
                    totalPages={totalPages}
                    sourceMode={sourceMode}
                    voices={voices}
                    selectedVoice={selectedVoice}
                    ttsRate={ttsRate}
                    ttsPitch={ttsPitch}
                    ttsVolume={ttsVolume}
                    border={border}
                    bgSide={bgSide}
                    bgInput={bgInput}
                    bgHover={bgHover}
                    textMain={textMain}
                    textMut={textMut}
                  />
                </Suspense>
              )}

              {/* Floating trigger button to expand AI sidebar when collapsed - Shown only after document is loaded */}
              {hasDocument && !aiSidebarOpen && (
                <button
                  onClick={() => setAiSidebarOpen(true)}
                  title="Expand AI Chat (Ctrl+J)"
                  className="absolute right-3 top-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-md border backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 group cursor-pointer"
                  style={{
                    background: isAmoled
                      ? "rgba(0, 0, 0, 0.95)"
                      : isDark
                      ? "rgba(30, 41, 59, 0.9)"
                      : "rgba(255, 255, 255, 0.94)",
                    borderColor: isAmoled
                      ? "rgba(37, 99, 235, 0.5)"
                      : isDark
                      ? "rgba(66, 133, 244, 0.4)"
                      : "#60a5fa",
                    color: textMain,
                  }}
                >
                  <span className="text-blue-500 transition-transform duration-150 group-hover:scale-110">
                    <IcoSparklesFilled size={13} />
                  </span>
                  <span className="text-xs font-bold text-blue-500">Ask AI</span>
                </button>
              )}
            </div>
          )}
        </div>
        {isMarkdownModalOpen && (
          <Suspense fallback={null}>
            <MarkdownExportModal
              isOpen={isMarkdownModalOpen}
              onClose={() => setIsMarkdownModalOpen(false)}
              pdfBytes={pdfBytes}
              fileName={fileName}
              sourceMode={sourceMode}
              currentPage={pageNum}
              totalPages={totalPages}
              webTitle={webTitle}
              webUrl={webUrl}
              webParagraphs={paragraphs}
            />
          </Suspense>
        )}
      </ThemeCtx.Provider>
    </DarkCtx.Provider>
  );
}