import { useState, useEffect, useRef, useCallback, FC, ChangeEvent, DragEvent, createContext, useContext, ReactNode } from "react";

/* ── PDF.js ─────────────────────────────────────────────────────────── */
const PDFJS_URL    = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
declare global { interface Window { pdfjsLib: any; webkitAudioContext: typeof AudioContext; } }

function usePdfJs(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.pdfjsLib) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = PDFJS_URL;
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; setReady(true); };
    document.head.appendChild(s);
  }, []);
  return ready;
}

/* ── Theme ──────────────────────────────────────────────────────────── */
type Theme = "light" | "dark" | "system";

function useTheme(): [boolean, Theme, (t: Theme) => void] {
  const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolve = (t: Theme) => t === "dark" || (t === "system" && prefersDark());

  const [theme,  setThemeState] = useState<Theme>(() => {
    try { return (localStorage.getItem("folio-theme") as Theme) || "system"; } catch { return "system"; }
  });
  const [isDark, setIsDark] = useState(() => resolve(theme));

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    setIsDark(resolve(t));
    try { localStorage.setItem("folio-theme", t); } catch {}
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = () => setIsDark(prefersDark());
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [theme]);

  return [isDark, theme, setTheme];
}

/* ── Theme context so sub-components can read isDark ─────────────────── */
const DarkCtx = createContext(false);
const useDark = () => useContext(DarkCtx);

/* ── Colour helper — picks light or dark Tailwind class ────────────── */
const dk = (light: string, dark: string, isDark: boolean) => isDark ? dark : light;

/* ── Constants ──────────────────────────────────────────────────────── */
const DEFAULT_HEADER_PCT = 10;
const DEFAULT_FOOTER_PCT = 10;
type TtsState = "idle" | "playing" | "paused";

/* ── Icons ──────────────────────────────────────────────────────────── */
const Ico: FC<{ d: string; size?: number }> = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const IcoUpload  = () => <Ico size={32} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />;
const IcoPlay    = () => <Ico d="M5 3l14 9-14 9V3z" />;
const IcoPause   = () => <Ico d="M6 4h4v16H6zM14 4h4v16h-4z" />;
const IcoStop    = () => <Ico d="M6 6h12v12H6z" />;
const IcoChevL   = () => <Ico d="M15 18l-6-6 6-6" />;
const IcoChevR   = () => <Ico d="M9 18l6-6-6-6" />;
const IcoZoomIn  = () => <Ico d="M11 5a6 6 0 1 0 0 12A6 6 0 0 0 11 5zm10 10l-3-3M11 8v6M8 11h6" />;
const IcoZoomOut = () => <Ico d="M11 5a6 6 0 1 0 0 12A6 6 0 0 0 11 5zm10 10l-3-3M8 11h6" />;
const IcoVolume  = () => <Ico d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />;
const IcoArrowR  = () => <Ico d="M5 12h14M15 6l6 6-6 6M19 4v16" />;
const IcoPanel   = () => <Ico d="M3 3h18v18H3zM9 3v18" />;
const IcoFile    = () => <Ico d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" />;
const IcoSun     = () => <Ico d="M12 3v1M12 20v1M4.22 4.22l.7.7M18.36 18.36l.7.7M3 12h1M20 12h1M4.22 19.78l.7-.7M18.36 5.64l.7-.7M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z" />;
const IcoMoon    = () => <Ico d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />;
const IcoMonitor = () => <Ico d="M2 3h20v14H2zM8 21h8M12 17v4" />;
const IcoCheck   = () => <Ico size={14} d="M20 6L9 17l-5-5" />;

/* ── Text helpers ───────────────────────────────────────────────────── */
const splitParagraphs = (text: string): string[] => {
  const sentences = text.match(/[^.!?]+[.!?]+["']?\s*/g) ?? [text];
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += 3)
    chunks.push(sentences.slice(i, i + 3).join("").trim());
  return chunks.filter(p => p.length > 10);
};
const getParagraphStarts = (paras: string[]): number[] => {
  const s: number[] = []; let pos = 0;
  for (const p of paras) { s.push(pos); pos += p.length + 1; }
  return s;
};

/* ── Primitives ─────────────────────────────────────────────────────── */

const Divider = () => {
  const d = useDark();
  return <div className={`h-px my-1 ${dk("bg-gray-200", "bg-gray-800", d)}`} />;
};

const SectionTitle: FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500 mb-0.5">{children}</p>
);


const IconBtn: FC<{ onClick: () => void; disabled?: boolean; title?: string; children: React.ReactNode }> = ({ onClick, disabled, title, children }) => {
  const d = useDark();
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`flex items-center justify-center rounded-md border p-1.5 transition-colors
        disabled:opacity-40 disabled:cursor-not-allowed
        ${dk("border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900",
             "border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-gray-100", d)}`}>
      {children}
    </button>
  );
};

const Switch: FC<{ checked: boolean; onCheckedChange: (v: boolean) => void }> = ({ checked, onCheckedChange }) => (
  <button role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent
      transition-colors duration-200 focus:outline-none ${checked ? "bg-amber-500" : "bg-gray-300"}`}
    style={!checked ? { background: "#d1d5db" } : {}}>
    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0"}`} />
  </button>
);

const SwitchRow: FC<{ id: string; label: string; description?: string; checked: boolean; onCheckedChange: (v: boolean) => void }> = ({ id, label, description, checked, onCheckedChange }) => {
  const d = useDark();
  return (
    <div className="flex items-start gap-3">
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      <label htmlFor={id} className="flex flex-col gap-0.5 cursor-pointer" onClick={() => onCheckedChange(!checked)}>
        <span className={`text-sm font-medium leading-none ${dk("text-gray-800", "text-gray-200", d)}`}>{label}</span>
        {description && <span className={`text-xs leading-relaxed ${dk("text-gray-500", "text-gray-400", d)}`}>{description}</span>}
      </label>
    </div>
  );
};

const SliderRow: FC<{ label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; display: string }> = ({ label, value, min, max, step, onChange, display }) => {
  const d = useDark();
  return (
    <div className="flex flex-col gap-2">
      <div className={`flex justify-between text-xs ${dk("text-gray-500", "text-gray-400", d)}`}>
        <span>{label}</span>
        <span className="font-mono tabular-nums text-amber-500">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className={`w-full h-1.5 rounded-full appearance-none cursor-pointer accent-amber-500 ${dk("bg-gray-200", "bg-gray-700", d)}`} />
    </div>
  );
};

interface HFCardProps { zone: "Header" | "Footer"; text: string; checked: boolean; onCheckedChange: (v: boolean) => void; pct: number; onPct: (v: number) => void; }
const HFCard: FC<HFCardProps> = ({ zone, text, checked, onCheckedChange, pct, onPct }) => {
  const d = useDark();
  const isHeader = zone === "Header";
  const col = isHeader ? "text-amber-500 border-amber-500" : "text-gray-400 border-gray-500";
  return (
    <div className={`rounded-lg border p-3 flex flex-col gap-2.5 ${dk("border-gray-200 bg-gray-50", "border-gray-800 bg-gray-900", d)}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Switch checked={checked} onCheckedChange={onCheckedChange} />
          <span className={`text-[9px] font-mono uppercase tracking-widest border rounded px-1.5 py-0.5 ${col}`}
            style={{ borderColor: isHeader ? "#f59e0b" : "#6b7280" }}>{zone}</span>
          {!text && <span className={`text-[10px] ${dk("text-gray-400", "text-gray-600", d)}`}>not detected</span>}
        </div>
        <span className={`text-xs font-mono tabular-nums ${isHeader ? "text-amber-500" : "text-gray-400"}`}>{pct}%</span>
      </div>
      {text && <p className={`text-[10px] italic leading-relaxed line-clamp-2 ${dk("text-gray-400", "text-gray-500", d)}`}>{text}</p>}
      <SliderRow label={`Zone (${isHeader ? "top" : "bottom"} of page)`}
        value={pct} min={2} max={35} step={1} onChange={onPct} display={`${pct}%`} />
    </div>
  );
};

const ThemeDropdown: FC<{ theme: Theme; setTheme: (t: Theme) => void }> = ({ theme, setTheme }) => {
  const d = useDark();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const options: { value: Theme; label: string; Icon: FC }[] = [
    { value: "light",  label: "Light",  Icon: IcoSun },
    { value: "dark",   label: "Dark",   Icon: IcoMoon },
    { value: "system", label: "System", Icon: IcoMonitor },
  ];
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} title="Toggle theme"
        className={`flex items-center justify-center rounded-md border p-1.5 transition-colors
          ${dk("border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900",
               "border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-gray-100", d)}`}>
        {d ? <IcoMoon /> : <IcoSun />}
      </button>
      {open && (
        <div className={`absolute right-0 top-full mt-1.5 w-36 rounded-lg border shadow-xl z-50 overflow-hidden
          ${dk("border-gray-200 bg-white", "border-gray-700 bg-gray-900", d)}`}>
          {options.map(({ value, label, Icon }) => (
            <button key={value} onClick={() => { setTheme(value); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors
                ${theme === value
                  ? "text-amber-500 bg-amber-50"
                  : dk("text-gray-700 hover:bg-gray-100", "text-gray-300 hover:bg-gray-800", d)}`}
              style={theme === value && d ? { background: "rgba(245,158,11,0.1)", color: "#f59e0b" } : {}}>
              <Icon /><span className="flex-1 text-left">{label}</span>
              {theme === value && <IcoCheck />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Keep-alive type ────────────────────────────────────────────────── */
interface KeepAlive { ctx: AudioContext; src: AudioBufferSourceNode; }

/* ══════════════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════════════ */
export default function PDFReader(): ReactNode {
  const pdfReady = usePdfJs();
  const [isDark, theme, setTheme] = useTheme();
  const d = isDark; // shorthand

  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const paraListRef     = useRef<HTMLDivElement>(null);
  const keepAliveRef    = useRef<KeepAlive | null>(null);
  const autoNextRef     = useRef(false);
  const pendingAutoPlay = useRef(false);
  const dragCounterRef  = useRef(0);

  const [pdfDoc,        setPdfDoc]        = useState<any>(null);
  const [pageNum,       setPageNum]       = useState(1);
  const [totalPages,    setTotalPages]    = useState(0);
  const [scale,         setScale]         = useState(1.4);
  const [fileName,      setFileName]      = useState("");
  const [paragraphs,    setParagraphs]    = useState<string[]>([]);
  const [headerText,    setHeaderText]    = useState("");
  const [footerText,    setFooterText]    = useState("");
  const [ttsState,      setTtsState]      = useState<TtsState>("idle");
  const [ttsRate,       setTtsRate]       = useState(1);
  const [ttsPitch,      setTtsPitch]      = useState(1);
  const [voices,        setVoices]        = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [activePara,    setActivePara]    = useState(-1);
  const [autoNextPage,  setAutoNextPage]  = useState(false);
  const [readHeader,    setReadHeader]    = useState(false);
  const [readFooter,    setReadFooter]    = useState(false);
  const [headerPct,     setHeaderPct]     = useState(DEFAULT_HEADER_PCT);
  const [footerPct,     setFooterPct]     = useState(DEFAULT_FOOTER_PCT);
  const [localDrag,     setLocalDrag]     = useState(false);
  const [globalDrag,    setGlobalDrag]    = useState(false);
  const [rendering,     setRendering]     = useState(false);
  const [pdfLoading,    setPdfLoading]    = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);

  /* SEO */
  useEffect(() => {
    document.title = fileName ? `${fileName} – Folio PDF Reader` : "Folio – Free Online PDF Reader with Text-to-Speech";
  }, [fileName]);

  /* Voices */
  useEffect(() => {
    const load = () => { const v = window.speechSynthesis.getVoices(); if (v.length) { setVoices(v); setSelectedVoice(v[0]?.name ?? ""); } };
    load(); window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  /* Global drag-and-drop */
  useEffect(() => {
    const onDragEnter = (e: globalThis.DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      dragCounterRef.current += 1; setGlobalDrag(true);
    };
    const onDragLeave = () => {
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) setGlobalDrag(false);
    };
    const onDragOver  = (e: globalThis.DragEvent) => e.preventDefault();
    const onDrop = (e: globalThis.DragEvent) => {
      e.preventDefault(); dragCounterRef.current = 0; setGlobalDrag(false);
      handleFile(e.dataTransfer?.files[0]);
    };
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover",  onDragOver);
    window.addEventListener("drop",      onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover",  onDragOver);
      window.removeEventListener("drop",      onDrop);
    };
  }, []);

  /* Page text extraction */
  const extractPageText = useCallback(async (page: any, hPct: number, fPct: number) => {
    const pgH: number = page.getViewport({ scale: 1 }).height;
    const headerMin = pgH * (1 - hPct / 100), footerMax = pgH * (fPct / 100);
    const { items } = await page.getTextContent();
    const hI: string[] = [], fI: string[] = [], bI: string[] = [];
    for (const item of items as any[]) {
      if (!item.str?.trim()) continue;
      const y: number = item.transform[5];
      if (y >= headerMin) hI.push(item.str); else if (y <= footerMax) fI.push(item.str); else bI.push(item.str);
    }
    return { header: hI.join(" ").trim(), footer: fI.join(" ").trim(), body: bI.join(" ").trim() };
  }, []);

  /* Render page */
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
      setHeaderText(header); setFooterText(footer); setParagraphs(splitParagraphs(body));
    } finally { setRendering(false); }
  }, [extractPageText]);

  useEffect(() => { if (pdfDoc) renderPage(pdfDoc, pageNum, scale, headerPct, footerPct); },
    [pdfDoc, pageNum, scale, headerPct, footerPct, renderPage]);

  useEffect(() => {
    if (activePara < 0 || !paraListRef.current) return;
    paraListRef.current.querySelector<HTMLElement>(`[data-para="${activePara}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activePara]);

  /* Keep-alive audio */
  const startKeepAlive = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx(), buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true; src.connect(ctx.destination); src.start();
      keepAliveRef.current = { ctx, src };
    } catch (_) {}
  };
  const stopKeepAlive = () => {
    try { keepAliveRef.current?.src.stop(); keepAliveRef.current?.ctx.close(); } catch (_) {}
    keepAliveRef.current = null;
  };

  /* Load PDF */
  const loadPdf = async (file: File) => {
    if (!pdfReady) return;
    stopTts(false); setPdfLoading(true);
    try {
      const doc = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      setPdfDoc(doc); setTotalPages(doc.numPages); setPageNum(1); setFileName(file.name);
    } finally { setPdfLoading(false); }
  };
  const handleFile = (file?: File) => { if (file?.type === "application/pdf") loadPdf(file); };

  /* TTS */
  const stopTts = (userInitiated = true) => {
    if (userInitiated) autoNextRef.current = false;
    window.speechSynthesis.cancel(); stopKeepAlive();
    setTtsState("idle"); setActivePara(-1);
  };
  const doAutoNext = useCallback(() => {
    setPageNum(p => { pendingAutoPlay.current = true; return p + 1; });
  }, []);
  const startReading = useCallback((fromIdx: number) => {
    if (!paragraphs.length) return;
    window.speechSynthesis.cancel(); stopKeepAlive();
    const idx = Math.max(0, Math.min(fromIdx, paragraphs.length - 1));
    setActivePara(idx); autoNextRef.current = false; startKeepAlive();
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
    const headerOff = (readHeader && headerText && idx === 0) ? headerText.length + 1 : 0;
    utter.onboundary = (e: SpeechSynthesisEvent) => {
      if (e.name !== "word") return;
      const c = e.charIndex - headerOff; if (c < 0) return;
      let cur = idx;
      for (let i = idx; i < paragraphs.length; i++) { if (paraStarts[i] - paraStarts[idx] <= c) cur = i; else break; }
      setActivePara(cur);
    };
    utter.onend  = () => { stopKeepAlive(); setTtsState("idle"); setActivePara(-1); if (autoNextRef.current) { autoNextRef.current = false; doAutoNext(); } };
    utter.onerror = () => { stopKeepAlive(); setTtsState("idle"); setActivePara(-1); autoNextRef.current = false; };
    autoNextRef.current = autoNextPage;
    window.speechSynthesis.speak(utter);
    setTtsState("playing");
  }, [paragraphs, headerText, footerText, readHeader, readFooter, ttsRate, ttsPitch, voices, selectedVoice, autoNextPage, doAutoNext]);

  useEffect(() => {
    if (pendingAutoPlay.current && paragraphs.length > 0) { pendingAutoPlay.current = false; startReading(0); }
  }, [paragraphs, startReading]);

  const pauseTts = () => {
    if (ttsState === "playing") { window.speechSynthesis.pause(); setTtsState("paused"); }
    else if (ttsState === "paused") { window.speechSynthesis.resume(); setTtsState("playing"); }
  };
  const prevPage = () => { if (pageNum > 1)          { stopTts(); setPageNum(p => p - 1); } };
  const nextPage = () => { if (pageNum < totalPages) { stopTts(); setPageNum(p => p + 1); } };

  const offline = voices.filter(v => v.localService);
  const online  = voices.filter(v => !v.localService);

  /* Status badge colours */
  const statusDot   = ttsState === "playing" ? "#4ade80" : ttsState === "paused" ? "#f59e0b" : d ? "#4b5563" : "#9ca3af";
  const statusGlow  = ttsState === "playing" ? "0 0 6px #4ade80" : "none";
  const statusLabel = ttsState === "idle" ? "Ready" : ttsState === "playing" ? "Speaking" : "Paused";
  const statusColor = ttsState === "playing" ? (d ? "#4ade80" : "#16a34a") : ttsState === "paused" ? "#f59e0b" : d ? "#6b7280" : "#9ca3af";
  const statusBorderColor = ttsState === "playing" ? "rgba(74,222,128,0.3)" : ttsState === "paused" ? "rgba(245,158,11,0.3)" : d ? "#374151" : "#e5e7eb";

  /* Shared inline colour tokens */
  const bg       = d ? "#030712" : "#ffffff";
  const bgCard   = d ? "#111827" : "#ffffff";
  const bgSide   = d ? "#0f172a" : "#f9fafb";
  const border   = d ? "#1f2937" : "#e5e7eb";
  const textMain = d ? "#f3f4f6" : "#111827";
  const textMut  = d ? "#9ca3af" : "#6b7280";
  const bgInput  = d ? "#1f2937" : "#ffffff";
  const bgHover  = d ? "#1f2937" : "#f3f4f6";
  const bgCanvas = d ? "#0f172a" : "#f3f4f6";

  return (
    <DarkCtx.Provider value={isDark}>
    <div className="h-screen flex flex-col overflow-hidden transition-colors duration-200"
      style={{ background: bg, color: textMain }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin linear infinite; }
        input[type=range] { height: 6px; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:#f59e0b; cursor:pointer; margin-top:-4px; }
        input[type=range]::-moz-range-thumb { width:14px; height:14px; border-radius:50%; background:#f59e0b; cursor:pointer; border:none; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${d ? "#374151" : "#d1d5db"}; border-radius: 2px; }
      `}</style>

      {/* ── Global drag overlay ─────────────────────────────────────── */}
      {globalDrag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl border-2 border-dashed border-amber-400 px-16 py-12 flex flex-col items-center gap-4 shadow-2xl animate-pulse"
            style={{ background: "rgba(245,158,11,0.08)" }}>
            <div className="text-amber-400"><IcoUpload /></div>
            <div className="text-center">
              <p className="text-xl font-semibold text-amber-400">Drop your PDF here</p>
              <p className="text-sm mt-1" style={{ color: textMut }}>Release to open the document</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-2.5 shrink-0"
        style={{ borderBottom: `1px solid ${border}`, background: bgCard }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(o => !o)} title={`${sidebarOpen ? "Hide" : "Show"} sidebar`}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: textMut }}
            onMouseEnter={e => (e.currentTarget.style.background = bgHover)}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <IcoPanel />
          </button>
          <div className="h-8 w-px" style={{ background: border }} />
          <div>
            <h1 className="text-base font-bold tracking-wider text-amber-500 leading-none">FOLIO</h1>
            <p className="text-[9px] uppercase tracking-[0.2em] leading-none mt-0.5" style={{ color: textMut }}>PDF Reader</p>
          </div>
          <div className="h-8 w-px" style={{ background: border }} />
          {fileName
            ? <span className="flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 max-w-[220px]"
                style={{ color: textMut, background: bgHover, border: `1px solid ${border}` }}>
                <IcoFile /><span className="truncate">{fileName}</span>
              </span>
            : <span className="text-xs" style={{ color: textMut }}>No document open</span>}
        </div>

        <div className="flex items-center gap-2.5">
          {autoNextPage && ttsState !== "idle" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
              style={{ color: "#818cf8", borderColor: "rgba(129,140,248,0.3)", background: d ? "rgba(99,102,241,0.1)" : "rgba(238,242,255,1)" }}>
              <IcoArrowR />Auto-next
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border"
            style={{ color: statusColor, borderColor: statusBorderColor, background: "transparent" }}>
            <span className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ background: statusDot, boxShadow: statusGlow }} />
            {statusLabel}
          </span>
          <ThemeDropdown theme={theme} setTheme={setTheme} />
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside className="flex flex-col shrink-0 overflow-hidden transition-all duration-300"
          style={{ width: sidebarOpen ? 320 : 0, borderRight: `1px solid ${border}`, background: bgSide }}>
          <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ width: 320 }}>
            <div className="flex flex-col gap-5 p-5">

              {/* Upload */}
              <div className="flex flex-col gap-3">
                <SectionTitle>Document</SectionTitle>
                <div
                  className="rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200"
                  style={{ borderColor: localDrag ? "#f59e0b" : d ? "#374151" : "#e5e7eb", background: localDrag ? (d ? "rgba(245,158,11,0.08)" : "rgba(254,243,199,0.6)") : "transparent" }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e: DragEvent) => { e.preventDefault(); setLocalDrag(true); }}
                  onDragLeave={() => setLocalDrag(false)}
                  onDrop={(e: DragEvent) => { e.preventDefault(); setLocalDrag(false); handleFile(e.dataTransfer.files[0]); }}>
                  <div className="flex justify-center mb-2" style={{ color: textMut }}><IcoUpload /></div>
                  <p className="text-xs leading-relaxed" style={{ color: textMut }}>
                    {pdfReady ? "Drop a PDF here or click to browse" : "Loading PDF engine…"}
                  </p>
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handleFile(e.target.files?.[0])} />
              </div>

              <Divider />

              {/* TTS */}
              <div className="flex flex-col gap-4">
                <SectionTitle><span className="flex items-center gap-1.5"><IcoVolume />Text-to-Speech</span></SectionTitle>
                <div className="flex gap-2">
                  <button disabled={!pdfDoc}
                    onClick={ttsState === "idle" ? () => startReading(0) : pauseTts}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-white"
                    style={{ background: ttsState === "playing" ? "#22c55e" : "#f59e0b" }}>
                    {ttsState === "paused"  ? <><IcoPlay />Resume</>
                    : ttsState === "playing" ? <><IcoPause />Pause</>
                    : <><IcoPlay />Read Page</>}
                  </button>
                  <IconBtn onClick={() => stopTts(true)} disabled={ttsState === "idle"} title="Stop"><IcoStop /></IconBtn>
                </div>

                {voices.length > 0 && (
                  <select value={selectedVoice} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedVoice(e.target.value)}
                    className="w-full rounded-md text-xs px-2.5 py-2 cursor-pointer focus:outline-none"
                    style={{ border: `1px solid ${border}`, background: bgInput, color: textMain }}>
                    {offline.length > 0 && <optgroup label="📴 Offline">{offline.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}</optgroup>}
                    {online.length  > 0 && <optgroup label="🌐 Online" >{online.map(v  => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}</optgroup>}
                  </select>
                )}

                <SliderRow label="Speed" value={ttsRate} min={0.5} max={2} step={0.1} onChange={setTtsRate} display={`${ttsRate.toFixed(1)}×`} />
                <SliderRow label="Pitch" value={ttsPitch} min={0.5} max={2} step={0.1} onChange={setTtsPitch} display={ttsPitch.toFixed(1)} />
              </div>

              <Divider />

              {/* Playback */}
              <div className="flex flex-col gap-3">
                <SectionTitle>Playback</SectionTitle>
                <SwitchRow id="auto-next" label="Auto-advance pages" checked={autoNextPage} onCheckedChange={setAutoNextPage}
                  description="Turn to the next page automatically when reading finishes" />
              </div>

              <Divider />

              {/* Header & Footer */}
              <div className="flex flex-col gap-3">
                <SectionTitle>Header &amp; Footer</SectionTitle>
                <HFCard zone="Header" text={headerText} checked={readHeader} onCheckedChange={setReadHeader} pct={headerPct} onPct={setHeaderPct} />
                <HFCard zone="Footer" text={footerText} checked={readFooter} onCheckedChange={setReadFooter} pct={footerPct} onPct={setFooterPct} />
                {!headerText && !footerText && pdfDoc && (
                  <p className="text-[11px] text-center" style={{ color: textMut }}>No header or footer detected on this page</p>
                )}
              </div>

              {/* Paragraphs */}
              {paragraphs.length > 0 && (
                <>
                  <Divider />
                  <div className="flex flex-col gap-2">
                    <SectionTitle>Page Content · {paragraphs.length} paragraphs</SectionTitle>
                    <div ref={paraListRef} className="flex flex-col gap-0.5">
                      {paragraphs.map((p, i) => {
                        const active = activePara === i;
                        return (
                          <button key={i} data-para={i} onClick={() => startReading(i)}
                            className="w-full text-left px-3 py-2 rounded-lg text-xs leading-relaxed border-l-2 transition-all duration-150"
                            style={{
                              borderLeftColor: active ? "#f59e0b" : "transparent",
                              background: active ? (d ? "rgba(245,158,11,0.1)" : "rgba(254,243,199,0.6)") : "transparent",
                              color: active ? textMain : textMut,
                            }}
                            onMouseEnter={e => { if (!active) e.currentTarget.style.background = bgHover; }}
                            onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                            {active && <span className="block text-[9px] text-amber-500 font-semibold tracking-widest uppercase mb-0.5">▶ Now Reading</span>}
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* ── Viewer ───────────────────────────────────────────────── */}
        <main className="flex flex-col flex-1 overflow-hidden">

          {pdfDoc && !pdfLoading && (
            <div className="flex items-center justify-center gap-2 px-5 py-2 shrink-0 flex-wrap"
              style={{ borderBottom: `1px solid ${border}`, background: bgCard }}>
              <IconBtn onClick={prevPage} disabled={pageNum <= 1} title="Previous page"><IcoChevL /></IconBtn>
              <div className="flex items-center gap-1.5 text-sm" style={{ color: textMut }}>
                <input type="number" min={1} max={totalPages} value={pageNum}
                  className="w-12 rounded-md text-center text-sm py-1 focus:outline-none"
                  style={{ border: `1px solid ${border}`, background: bgInput, color: textMain }}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => { const v = parseInt(e.target.value); if (v >= 1 && v <= totalPages) { stopTts(); setPageNum(v); } }} />
                <span>/ {totalPages}</span>
              </div>
              <IconBtn onClick={nextPage} disabled={pageNum >= totalPages} title="Next page"><IcoChevR /></IconBtn>

              <div className="w-px h-5 mx-1" style={{ background: border }} />

              <IconBtn onClick={() => setScale(s => Math.min(s + 0.2, 3))} title="Zoom in"><IcoZoomIn /></IconBtn>
              <span className="text-xs font-mono tabular-nums w-12 text-center" style={{ color: textMut }}>{Math.round(scale * 100)}%</span>
              <IconBtn onClick={() => setScale(s => Math.max(s - 0.2, 0.5))} title="Zoom out"><IcoZoomOut /></IconBtn>

              {autoNextPage && (
                <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
                  style={{ color: "#818cf8", borderColor: "rgba(129,140,248,0.3)", background: d ? "rgba(99,102,241,0.1)" : "rgba(238,242,255,1)" }}>
                  <IcoArrowR />Auto-next
                </span>
              )}
            </div>
          )}

          <div className="flex-1 overflow-auto" style={{ background: bgCanvas }}>
            <div className="flex justify-center p-8 min-h-full">
              {pdfLoading ? (
                <div className="flex flex-col items-center justify-center gap-6 flex-1">
                  <div className="relative w-16 h-16">
                    {[0,1,2,3].map(i => (
                      <div key={i} className="absolute rounded-full spin border-2 border-transparent"
                        style={{ borderTopColor: `rgba(245,158,11,${1 - i * 0.22})`,
                          width: 64 - i*14, height: 64 - i*14, top: i*7, left: i*7,
                          animationDuration: `${0.9 + i*0.15}s`,
                          animationDirection: i % 2 === 0 ? "normal" : "reverse" }} />
                    ))}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-amber-500 uppercase tracking-widest">Loading document</p>
                    <p className="text-xs mt-1" style={{ color: textMut }}>{fileName}</p>
                  </div>
                </div>
              ) : pdfDoc ? (
                <div className={`shadow-2xl transition-opacity duration-150 ${rendering ? "opacity-50" : "opacity-100"}`}>
                  <canvas ref={canvasRef} className="block" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 flex-1">
                  <span className="text-7xl select-none" style={{ opacity: 0.12 }}>📖</span>
                  <div className="text-center">
                    <p className="text-xl font-semibold" style={{ color: textMut }}>No document open</p>
                    <p className="text-sm mt-1" style={{ color: textMut }}>Upload a PDF from the sidebar to begin</p>
                  </div>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="mt-2 flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors"
                    style={{ border: `1px solid ${border}`, background: bgCard, color: textMain }}
                    onMouseEnter={e => (e.currentTarget.style.background = bgHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = bgCard)}>
                    <IcoUpload />Browse for PDF
                  </button>
                  <input ref={fileInputRef} type="file" accept=".pdf" className="hidden"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleFile(e.target.files?.[0])} />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
    </DarkCtx.Provider>
  );
}