import { useState, useEffect, useRef, useCallback, FC, ChangeEvent, DragEvent, ReactNode } from "react";

// ─── PDF.js bootstrap ───────────────────────────────────────────────────────
const PDFJS_URL    = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

declare global {
  interface Window {
    pdfjsLib: any;
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}

function usePdfJs(): boolean {
  const [ready, setReady] = useState<boolean>(false);
  useEffect(() => {
    if (window.pdfjsLib) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = PDFJS_URL;
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      setReady(true);
    };
    document.head.appendChild(s);
  }, []);
  return ready;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const DEFAULT_HEADER_PCT = 10;
const DEFAULT_FOOTER_PCT = 10;

type TtsState = "idle" | "playing" | "paused";

// ─── SVG Icon helper ─────────────────────────────────────────────────────────
interface IconProps { d: string; size?: number; }
const Icon: FC<IconProps> = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const UploadIcon:   FC = () => <Icon size={28} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />;
const PlayIcon:     FC = () => <Icon d="M5 3l14 9-14 9V3z" />;
const PauseIcon:    FC = () => <Icon d="M6 4h4v16H6zM14 4h4v16h-4z" />;
const StopIcon:     FC = () => <Icon d="M6 6h12v12H6z" />;
const ChevronLeft:  FC = () => <Icon d="M15 18l-6-6 6-6" />;
const ChevronRight: FC = () => <Icon d="M9 18l6-6-6-6" />;
const ZoomIn:       FC = () => <Icon d="M11 5a6 6 0 1 0 0 12A6 6 0 0 0 11 5zm10 10l-3-3M11 8v6M8 11h6" />;
const ZoomOut:      FC = () => <Icon d="M11 5a6 6 0 1 0 0 12A6 6 0 0 0 11 5zm10 10l-3-3M8 11h6" />;
const SpeakerIcon:  FC = () => <Icon d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />;
const NextPageIcon: FC = () => <Icon d="M5 12h14M15 6l6 6-6 6M19 4v16" />;

// ─── Text helpers ─────────────────────────────────────────────────────────────
const splitParagraphs = (text: string): string[] => {
  const sentences = text.match(/[^.!?]+[.!?]+["']?\s*/g) ?? [text];
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += 3)
    chunks.push(sentences.slice(i, i + 3).join("").trim());
  return chunks.filter(p => p.length > 10);
};

const getParagraphStarts = (paras: string[]): number[] => {
  const starts: number[] = [];
  let pos = 0;
  for (const p of paras) { starts.push(pos); pos += p.length + 1; }
  return starts;
};

// ─── Toggle (checkbox) ────────────────────────────────────────────────────────
interface ToggleProps {
  checked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  label: React.ReactNode;
  sublabel?: string | null;
  color?: string;
}
const Toggle: FC<ToggleProps> = ({ checked, onChange, label, sublabel, color = "#c9a84c" }) => (
  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", userSelect: "none" }}>
    <div style={{ position: "relative", flexShrink: 0, marginTop: 2 }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ opacity: 0, position: "absolute", width: 0, height: 0 }} />
      <div style={{
        width: 16, height: 16, borderRadius: 4,
        border: `2px solid ${checked ? color : "#333"}`,
        background: checked ? color : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s"
      }}>
        {checked && <svg width={10} height={10} viewBox="0 0 12 12" fill="none" stroke="#0a0a0c" strokeWidth={2.5}><path d="M2 6l3 3 5-5" /></svg>}
      </div>
    </div>
    <div>
      <div style={{ fontSize: 12, color: checked ? "#e8e6e0" : "#666", transition: "color 0.15s" }}>{label}</div>
      {sublabel && <div style={{ fontSize: 10, color: "#444", lineHeight: 1.5, marginTop: 2 }}>{sublabel}</div>}
    </div>
  </label>
);

// ─── HF block ─────────────────────────────────────────────────────────────────
interface HFBlockProps {
  label: string;
  text: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
  badgeColor: string;
}
const HFBlock: FC<HFBlockProps> = ({ label, text, checked, onToggle, badgeColor }) => (
  <div style={{
    background: text ? "#111116" : "#0d0d10",
    border: `1px solid ${text ? "#2a2a38" : "#1a1a1f"}`,
    borderRadius: 6, padding: "10px 12px"
  }}>
    <Toggle
      checked={checked}
      onChange={e => onToggle(e.target.checked)}
      label={
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize: 9, fontFamily: "monospace", letterSpacing: "0.1em",
            color: badgeColor, border: `1px solid ${badgeColor}`,
            borderRadius: 3, padding: "1px 5px", textTransform: "uppercase"
          }}>{label}</span>
          {!text && <span style={{ fontSize: 10, color: "#383838" }}>not detected</span>}
        </span>
      }
      color={badgeColor}
    />
    {text && (
      <div style={{
        fontSize: 10, color: "#555", fontStyle: "italic", lineHeight: 1.5, marginTop: 6,
        maxHeight: 52, overflow: "hidden", textOverflow: "ellipsis",
        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical"
      } as React.CSSProperties} title={text}>{text}</div>
    )}
  </div>
);

// ─── Keep-alive ref type ──────────────────────────────────────────────────────
interface KeepAlive { ctx: AudioContext; src: AudioBufferSourceNode; }

// ─── Main component ───────────────────────────────────────────────────────────
export default function PDFReader(): ReactNode {
  const pdfReady      = usePdfJs();
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const paraListRef   = useRef<HTMLDivElement>(null);
  const keepAliveRef  = useRef<KeepAlive | null>(null);
  const autoNextRef   = useRef<boolean>(false);
  const pendingAutoPlay = useRef<boolean>(false);

  const [pdfDoc,        setPdfDoc]        = useState<any>(null);
  const [pageNum,       setPageNum]       = useState<number>(1);
  const [totalPages,    setTotalPages]    = useState<number>(0);
  const [scale,         setScale]         = useState<number>(1.4);
  const [fileName,      setFileName]      = useState<string>("");
  const [paragraphs,    setParagraphs]    = useState<string[]>([]);
  const [headerText,    setHeaderText]    = useState<string>("");
  const [footerText,    setFooterText]    = useState<string>("");
  const [ttsState,      setTtsState]      = useState<TtsState>("idle");
  const [ttsRate,       setTtsRate]       = useState<number>(1);
  const [ttsPitch,      setTtsPitch]      = useState<number>(1);
  const [voices,        setVoices]        = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [activePara,    setActivePara]    = useState<number>(-1);
  const [autoNextPage,  setAutoNextPage]  = useState<boolean>(false);
  const [readHeader,    setReadHeader]    = useState<boolean>(false);
  const [readFooter,    setReadFooter]    = useState<boolean>(false);
  const [headerPct,     setHeaderPct]     = useState<number>(DEFAULT_HEADER_PCT);
  const [footerPct,     setFooterPct]     = useState<number>(DEFAULT_FOOTER_PCT);
  const [dragging,      setDragging]      = useState<boolean>(false);
  const [rendering,     setRendering]     = useState<boolean>(false);
  const [pdfLoading,    setPdfLoading]    = useState<boolean>(false);
  const [sidebarOpen,   setSidebarOpen]   = useState<boolean>(true);

  // ── SEO: dynamic document title ──────────────────────────────────────────
  useEffect(() => {
    document.title = fileName
      ? `${fileName} – Folio PDF Reader`
      : "Folio – Free Online PDF Reader with Text-to-Speech";

    // Upsert a <meta name="description"> tag
    const upsertMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
      el.content = content;
    };
    upsertMeta(
      "description",
      fileName
        ? `Reading "${fileName}" in Folio – free browser PDF reader with text-to-speech, auto page advance and header/footer controls.`
        : "Folio is a free, privacy-first PDF reader that runs entirely in your browser. Read PDFs aloud with text-to-speech, auto-advance pages, and skip headers/footers — no uploads, no tracking."
    );
    upsertMeta("robots", "index, follow");
  }, [fileName]);

  // ── Voices ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length) { setVoices(v); setSelectedVoice(v[0]?.name ?? ""); }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // ── Page text extraction ──────────────────────────────────────────────────
  const extractPageText = useCallback(async (page: any, hPct: number, fPct: number) => {
    const pgH: number = page.getViewport({ scale: 1 }).height;
    const headerMin = pgH * (1 - hPct / 100);
    const footerMax = pgH * (fPct / 100);
    const content = await page.getTextContent();
    const hItems: string[] = [], fItems: string[] = [], bItems: string[] = [];
    for (const item of content.items as any[]) {
      if (!item.str?.trim()) continue;
      const y: number = item.transform[5];
      if (y >= headerMin) hItems.push(item.str);
      else if (y <= footerMax) fItems.push(item.str);
      else bItems.push(item.str);
    }
    return {
      header: hItems.join(" ").trim(),
      footer: fItems.join(" ").trim(),
      body:   bItems.join(" ").trim(),
    };
  }, []);

  // ── Render page ───────────────────────────────────────────────────────────
  const renderPage = useCallback(async (doc: any, num: number, sc: number, hPct: number, fPct: number) => {
    if (!doc || !canvasRef.current) return;
    setRendering(true);
    try {
      const page = await doc.getPage(num);
      const vp   = page.getViewport({ scale: sc });
      const canvas = canvasRef.current;
      canvas.height = vp.height; canvas.width = vp.width;
      await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
      const { header, footer, body } = await extractPageText(page, hPct, fPct);
      setHeaderText(header);
      setFooterText(footer);
      setParagraphs(splitParagraphs(body));
    } finally { setRendering(false); }
  }, [extractPageText]);

  useEffect(() => {
    if (pdfDoc) renderPage(pdfDoc, pageNum, scale, headerPct, footerPct);
  }, [pdfDoc, pageNum, scale, headerPct, footerPct, renderPage]);

  // ── Scroll active para into view ──────────────────────────────────────────
  useEffect(() => {
    if (activePara < 0 || !paraListRef.current) return;
    paraListRef.current.querySelector<HTMLElement>(`[data-para="${activePara}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activePara]);

  // ── Audio keep-alive (prevents TTS cut-off on mobile) ────────────────────
  const startKeepAlive = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true; src.connect(ctx.destination); src.start();
      keepAliveRef.current = { ctx, src };
    } catch (_) {}
  };
  const stopKeepAlive = () => {
    try { keepAliveRef.current?.src.stop(); keepAliveRef.current?.ctx.close(); } catch (_) {}
    keepAliveRef.current = null;
  };

  // ── Load PDF ──────────────────────────────────────────────────────────────
  const loadPdf = async (file: File) => {
    if (!pdfReady) return;
    stopTts(false);
    setPdfLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const doc = await window.pdfjsLib.getDocument({ data: buf }).promise;
      setPdfDoc(doc); setTotalPages(doc.numPages); setPageNum(1); setFileName(file.name);
    } finally { setPdfLoading(false); }
  };

  const handleFile = (file?: File) => { if (file?.type === "application/pdf") loadPdf(file); };

  // ── Stop TTS ──────────────────────────────────────────────────────────────
  const stopTts = (userInitiated = true) => {
    if (userInitiated) autoNextRef.current = false;
    window.speechSynthesis.cancel();
    stopKeepAlive();
    setTtsState("idle");
    setActivePara(-1);
  };

  // ── Auto-next page trigger ────────────────────────────────────────────────
  const doAutoNext = useCallback(() => {
    setPageNum(p => { pendingAutoPlay.current = true; return p + 1; });
  }, []);

  // ── Start reading from paragraph index ────────────────────────────────────
  const startReading = useCallback((fromIdx: number) => {
    if (!paragraphs.length) return;
    window.speechSynthesis.cancel();
    stopKeepAlive();
    const idx = Math.max(0, Math.min(fromIdx, paragraphs.length - 1));
    setActivePara(idx);
    autoNextRef.current = false;
    startKeepAlive();

    const parts: string[] = [];
    if (readHeader && headerText && idx === 0) parts.push(headerText);
    parts.push(paragraphs.slice(idx).join(" "));
    if (readFooter && footerText) parts.push(footerText);
    const text = parts.join(" ").trim();
    if (!text) { setTtsState("idle"); setActivePara(-1); return; }

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = ttsRate; utter.pitch = ttsPitch;
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) utter.voice = voice;

    const paraStarts = getParagraphStarts(paragraphs);
    const headerOffset = (readHeader && headerText && idx === 0) ? headerText.length + 1 : 0;

    utter.onboundary = (e: SpeechSynthesisEvent) => {
      if (e.name !== "word") return;
      const charInBody = e.charIndex - headerOffset;
      if (charInBody < 0) return;
      let cur = idx;
      for (let i = idx; i < paragraphs.length; i++) {
        if (paraStarts[i] - paraStarts[idx] <= charInBody) cur = i; else break;
      }
      setActivePara(cur);
    };
    utter.onend = () => {
      stopKeepAlive(); setTtsState("idle"); setActivePara(-1);
      if (autoNextRef.current) { autoNextRef.current = false; doAutoNext(); }
    };
    utter.onerror = () => { stopKeepAlive(); setTtsState("idle"); setActivePara(-1); autoNextRef.current = false; };

    autoNextRef.current = autoNextPage;
    window.speechSynthesis.speak(utter);
    setTtsState("playing");
  }, [paragraphs, headerText, footerText, readHeader, readFooter, ttsRate, ttsPitch, voices, selectedVoice, autoNextPage, doAutoNext]);

  // ── Auto-play after page change ───────────────────────────────────────────
  useEffect(() => {
    if (pendingAutoPlay.current && paragraphs.length > 0) {
      pendingAutoPlay.current = false;
      startReading(0);
    }
  }, [paragraphs, startReading]);

  const pauseTts = () => {
    if (ttsState === "playing")  { window.speechSynthesis.pause();  setTtsState("paused"); }
    else if (ttsState === "paused") { window.speechSynthesis.resume(); setTtsState("playing"); }
  };
  const prevPage = () => { if (pageNum > 1)          { stopTts(); setPageNum(p => p - 1); } };
  const nextPage = () => { if (pageNum < totalPages) { stopTts(); setPageNum(p => p + 1); } };

  // ── Styles ────────────────────────────────────────────────────────────────
  const s = {
    root:        { minHeight: "100vh", background: "#0d0d0f", color: "#e8e6e0", fontFamily: "'Georgia','Times New Roman',serif", display: "flex", flexDirection: "column" as const },
    header:      { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderBottom: "1px solid #1e1e22", background: "#0a0a0c" },
    logo:        { fontFamily: "'Georgia',serif", fontSize: 20, fontWeight: 700, letterSpacing: "0.08em", color: "#c9a84c", textTransform: "uppercase" as const },
    subtitle:    { fontSize: 11, color: "#555", letterSpacing: "0.18em", textTransform: "uppercase" as const },
    fileName:    { fontSize: 13, color: "#888", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
    body:        { display: "flex", flex: 1, overflow: "hidden", position: "relative" as const },
    sidebar:     { width: sidebarOpen ? 310 : 0, minWidth: sidebarOpen ? 310 : 0, background: "#0a0a0c", borderRight: sidebarOpen ? "1px solid #1e1e22" : "none", display: "flex", flexDirection: "column" as const, padding: sidebarOpen ? "24px 20px" : 0, gap: 20, overflowY: "auto" as const, overflowX: "hidden" as const, transition: "all 0.25s ease" },
    toggleBtn:   { position: "absolute" as const, left: sidebarOpen ? 298 : 8, top: "50%", transform: "translateY(-50%)", zIndex: 10, background: "#1a1a1f", border: "1px solid #2a2a30", color: "#888", borderRadius: 6, width: 24, height: 48, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "left 0.25s ease", fontSize: 10 },
    secTitle:    { fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: "#c9a84c", marginBottom: 12, fontFamily: "'Georgia',serif" },
    uploadZone:  { border: `2px dashed ${dragging ? "#c9a84c" : "#2a2a30"}`, borderRadius: 8, padding: "28px 16px", textAlign: "center" as const, cursor: "pointer", transition: "all 0.2s", background: dragging ? "rgba(201,168,76,0.05)" : "transparent" },
    uploadText:  { fontSize: 12, color: "#666", marginTop: 10, lineHeight: 1.6 },
    ttsButtons:  { display: "flex", gap: 8, marginBottom: 14 },
    ttsBtn:      (active: boolean, color = "#c9a84c") => ({ flex: 1, padding: "10px 0", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "'Georgia',serif", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s", background: active ? color : "#1a1a1f", color: active ? "#0a0a0c" : "#888" }),
    sliderGroup: { display: "flex", flexDirection: "column" as const, gap: 6, marginBottom: 10 },
    sliderLabel: { fontSize: 11, color: "#666", display: "flex", justifyContent: "space-between" },
    slider:      { width: "100%", accentColor: "#c9a84c", cursor: "pointer" },
    select:      { width: "100%", background: "#1a1a1f", color: "#e8e6e0", border: "1px solid #2a2a30", borderRadius: 6, padding: "8px 10px", fontSize: 12, fontFamily: "'Georgia',serif", cursor: "pointer", marginBottom: 10 },
    paraList:    { display: "flex", flexDirection: "column" as const, gap: 4, maxHeight: 260, overflowY: "auto" as const, paddingRight: 4 },
    paraItem:    (active: boolean) => ({ padding: "8px 10px", borderRadius: 6, fontSize: 11, lineHeight: 1.65, cursor: "pointer", transition: "all 0.2s", borderLeft: `3px solid ${active ? "#c9a84c" : "transparent"}`, background: active ? "rgba(201,168,76,0.1)" : "transparent", color: active ? "#e8e6e0" : "#555", userSelect: "none" as const }),
    viewer:      { flex: 1, display: "flex", flexDirection: "column" as const, overflow: "hidden" },
    toolbar:     { display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "12px 24px", borderBottom: "1px solid #1e1e22", background: "#0a0a0c" },
    navBtn:      (dis: boolean) => ({ background: "none", border: "1px solid #2a2a30", color: dis ? "#333" : "#aaa", borderRadius: 6, padding: "6px 10px", cursor: dis ? "not-allowed" as const : "pointer" as const, display: "flex", alignItems: "center" }),
    pageInput:   { width: 44, background: "#1a1a1f", border: "1px solid #2a2a30", color: "#e8e6e0", borderRadius: 4, padding: "4px 6px", textAlign: "center" as const, fontSize: 13, fontFamily: "'Georgia',serif" },
    zoomBtn:     { background: "none", border: "1px solid #2a2a30", color: "#aaa", borderRadius: 6, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center" },
    canvasWrap:  { flex: 1, overflow: "auto", display: "flex", justifyContent: "center", padding: 28, background: "#111114" },
    canvasInner: { filter: rendering ? "opacity(0.5)" : "opacity(1)", transition: "filter 0.15s", boxShadow: "0 8px 40px rgba(0,0,0,0.6)" },
    emptyState:  { flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 16, color: "#444" },
    statusRow:   { display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#555", letterSpacing: "0.1em" },
    statusDot:   (st: TtsState) => ({ width: 8, height: 8, borderRadius: "50%", background: st === "playing" ? "#4caf50" : st === "paused" ? "#c9a84c" : "#333", boxShadow: st === "playing" ? "0 0 6px #4caf50" : "none", transition: "all 0.3s" }),
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a30; border-radius: 2px; }
      `}</style>

      {/* ── Top bar ── */}
      <header style={s.header}>
        <div>
          <div style={s.logo}>Folio</div>
          <div style={s.subtitle}>PDF Reader</div>
        </div>
        {fileName && <div style={s.fileName}>📄 {fileName}</div>}
        <div style={s.statusRow}>
          <div style={s.statusDot(ttsState)} />
          {ttsState === "idle" ? "Ready" : ttsState === "playing" ? "Speaking" : "Paused"}
          {autoNextPage && ttsState !== "idle" && <span style={{ color: "#c9a84c", fontSize: 10 }}>· Auto-next ON</span>}
        </div>
      </header>

      <div style={s.body}>
        <button style={s.toggleBtn} onClick={() => setSidebarOpen(o => !o)}>{sidebarOpen ? "◀" : "▶"}</button>

        {/* ── Sidebar ── */}
        <aside style={s.sidebar}>

          {/* Upload */}
          <div>
            <div style={s.secTitle}>Document</div>
            <div style={s.uploadZone}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e: DragEvent) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e: DragEvent) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}>
              <UploadIcon />
              <div style={s.uploadText}>{pdfReady ? "Drop a PDF here\nor click to browse" : "Loading PDF engine…"}</div>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleFile(e.target.files?.[0])} />
          </div>

          {/* TTS */}
          <div>
            <div style={s.secTitle}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><SpeakerIcon />Text-to-Speech</span></div>
            <div style={s.ttsButtons}>
              <button style={s.ttsBtn(ttsState === "playing", "#4caf50")}
                onClick={ttsState === "idle" ? () => startReading(0) : pauseTts} disabled={!pdfDoc}>
                {ttsState === "paused"  ? <><PlayIcon />Resume</>
                : ttsState === "playing" ? <><PauseIcon />Pause</>
                : <><PlayIcon />Read Page</>}
              </button>
              <button style={s.ttsBtn(false)} onClick={() => stopTts(true)} disabled={ttsState === "idle"}><StopIcon /></button>
            </div>
            {voices.length > 0 && (() => {
              const offline = voices.filter(v => v.localService);
              const online  = voices.filter(v => !v.localService);
              return (
                <select style={s.select} value={selectedVoice} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedVoice(e.target.value)}>
                  {offline.length > 0 && <optgroup label="📴 Offline">{offline.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}</optgroup>}
                  {online.length  > 0 && <optgroup label="🌐 Online" >{online.map(v  => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}</optgroup>}
                </select>
              );
            })()}
            <div style={s.sliderGroup}>
              <div style={s.sliderLabel}><span>Speed</span><span style={{ color: "#c9a84c" }}>{ttsRate.toFixed(1)}×</span></div>
              <input type="range" min="0.5" max="2" step="0.1" value={ttsRate} style={s.slider} onChange={(e: ChangeEvent<HTMLInputElement>) => setTtsRate(parseFloat(e.target.value))} />
            </div>
            <div style={s.sliderGroup}>
              <div style={s.sliderLabel}><span>Pitch</span><span style={{ color: "#c9a84c" }}>{ttsPitch.toFixed(1)}</span></div>
              <input type="range" min="0.5" max="2" step="0.1" value={ttsPitch} style={s.slider} onChange={(e: ChangeEvent<HTMLInputElement>) => setTtsPitch(parseFloat(e.target.value))} />
            </div>
          </div>

          {/* Playback options */}
          <div>
            <div style={s.secTitle}>Playback Options</div>
            <Toggle
              checked={autoNextPage}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAutoNextPage(e.target.checked)}
              label="Auto-advance pages"
              sublabel="Automatically turn to the next page when reading finishes"
              color="#7b8fff"
            />
          </div>

          {/* Header & Footer */}
          <div>
            <div style={s.secTitle}>Header &amp; Footer</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <HFBlock label="Header" text={headerText} checked={readHeader} onToggle={setReadHeader} badgeColor="#c9a84c" />
              <HFBlock label="Footer" text={footerText} checked={readFooter} onToggle={setReadFooter} badgeColor="#888" />
              {!headerText && !footerText && pdfDoc && (
                <div style={{ fontSize: 11, color: "#383838", textAlign: "center", padding: "4px 0" }}>No header or footer detected on this page</div>
              )}

              {/* Detection zone sliders */}
              <div style={{ background: "#0f0f13", border: "1px solid #1e1e22", borderRadius: 6, padding: "12px 12px 8px" }}>
                <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 10 }}>Detection Zones</div>
                <div style={s.sliderGroup}>
                  <div style={s.sliderLabel}>
                    <span style={{ color: "#c9a84c" }}>▲ Header zone</span>
                    <span style={{ color: "#c9a84c", fontVariantNumeric: "tabular-nums" }}>{headerPct}%</span>
                  </div>
                  <input type="range" min="2" max="35" step="1" value={headerPct} style={s.slider}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setHeaderPct(Number(e.target.value))} />
                </div>
                <div style={s.sliderGroup}>
                  <div style={s.sliderLabel}>
                    <span style={{ color: "#888" }}>▼ Footer zone</span>
                    <span style={{ color: "#888", fontVariantNumeric: "tabular-nums" }}>{footerPct}%</span>
                  </div>
                  <input type="range" min="2" max="35" step="1" value={footerPct}
                    style={{ ...s.slider, accentColor: "#888" }}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFooterPct(Number(e.target.value))} />
                </div>
                <div style={{ fontSize: 10, color: "#333", lineHeight: 1.5 }}>
                  Applies to all pages. Increase if content is cut off; decrease if body text is wrongly detected.
                </div>
              </div>
            </div>
          </div>

          {/* Paragraph list */}
          {paragraphs.length > 0 && (
            <div style={{ flex: 1, minHeight: 0 }}>
              <div style={s.secTitle}>Page Content ({paragraphs.length} paragraphs)</div>
              <div ref={paraListRef} style={s.paraList}>
                {paragraphs.map((p, i) => (
                  <div key={i} data-para={i} style={s.paraItem(activePara === i)} onClick={() => startReading(i)} title="Click to read from here">
                    {activePara === i && <span style={{ fontSize: 9, color: "#c9a84c", letterSpacing: "0.1em", display: "block", marginBottom: 3 }}>▶ NOW READING</span>}
                    {p}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── Main viewer ── */}
        <main style={s.viewer}>
          {pdfDoc && !pdfLoading && (
            <div style={s.toolbar}>
              <button style={s.navBtn(pageNum <= 1)} onClick={prevPage} disabled={pageNum <= 1}><ChevronLeft /></button>
              <div style={{ fontSize: 13, color: "#888", minWidth: 100, textAlign: "center" }}>
                <input type="number" style={s.pageInput} value={pageNum} min={1} max={totalPages}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => { const v = parseInt(e.target.value); if (v >= 1 && v <= totalPages) { stopTts(); setPageNum(v); } }} />
                <span style={{ marginLeft: 6 }}>/ {totalPages}</span>
              </div>
              <button style={s.navBtn(pageNum >= totalPages)} onClick={nextPage} disabled={pageNum >= totalPages}><ChevronRight /></button>
              <div style={{ width: 1, height: 20, background: "#2a2a30", margin: "0 6px" }} />
              <button style={s.zoomBtn} onClick={() => setScale(sc => Math.min(sc + 0.2, 3))}><ZoomIn /></button>
              <span style={{ fontSize: 12, color: "#666", minWidth: 44, textAlign: "center" }}>{Math.round(scale * 100)}%</span>
              <button style={s.zoomBtn} onClick={() => setScale(sc => Math.max(sc - 0.2, 0.5))}><ZoomOut /></button>
              {autoNextPage && (
                <div style={{ marginLeft: 8, display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#7b8fff", border: "1px solid #2a2a40", borderRadius: 6, padding: "5px 10px" }}>
                  <NextPageIcon /><span>Auto-next</span>
                </div>
              )}
            </div>
          )}

          <div style={s.canvasWrap}>
            {pdfLoading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, flex: 1 }}>
                <div style={{ position: "relative", width: 64, height: 64 }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ position: "absolute", borderRadius: "50%", border: "2px solid transparent", borderTopColor: `rgba(201,168,76,${1 - i * 0.22})`, width: 64 - i*14, height: 64 - i*14, top: i*7, left: i*7, animation: `spin ${0.9 + i*0.15}s linear infinite`, animationDirection: i % 2 === 0 ? "normal" : "reverse" }} />
                  ))}
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#c9a84c", letterSpacing: "0.12em", textTransform: "uppercase" }}>Loading document</div>
                  <div style={{ fontSize: 11, color: "#444", marginTop: 6 }}>{fileName}</div>
                </div>
              </div>
            ) : pdfDoc ? (
              <div style={s.canvasInner}><canvas ref={canvasRef} /></div>
            ) : (
              <div style={s.emptyState}>
                <div style={{ fontSize: 48, opacity: 0.15 }}>📖</div>
                <div style={{ fontFamily: "'Georgia',serif", fontSize: 22, color: "#333", letterSpacing: "0.04em" }}>No document open</div>
                <div style={{ fontSize: 13, color: "#444", letterSpacing: "0.06em" }}>Upload a PDF from the sidebar to begin</div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}