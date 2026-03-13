import { useState, useEffect, useRef, useCallback } from "react";

const PDFJS_URL    = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

function usePdfJs() {
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

const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const UploadIcon  = () => <Icon size={28} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />;
const PlayIcon    = () => <Icon d="M5 3l14 9-14 9V3z" />;
const PauseIcon   = () => <Icon d="M6 4h4v16H6zM14 4h4v16h-4z" />;
const StopIcon    = () => <Icon d="M6 6h12v12H6z" />;
const ChevronLeft  = () => <Icon d="M15 18l-6-6 6-6" />;
const ChevronRight = () => <Icon d="M9 18l6-6-6-6" />;
const ZoomIn  = () => <Icon d="M11 5a6 6 0 1 0 0 12A6 6 0 0 0 11 5zm10 10l-3-3M11 8v6M8 11h6" />;
const ZoomOut = () => <Icon d="M11 5a6 6 0 1 0 0 12A6 6 0 0 0 11 5zm10 10l-3-3M8 11h6" />;
const SpeakerIcon = () => <Icon d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />;

const splitParagraphs = (text) => {
  const sentences = text.match(/[^.!?]+[.!?]+["']?\s*/g) ?? [text];
  const chunks = [];
  for (let i = 0; i < sentences.length; i += 3)
    chunks.push(sentences.slice(i, i + 3).join("").trim());
  return chunks.filter(p => p.length > 10);
};

const getParagraphStarts = (paras) => {
  const starts = []; let pos = 0;
  for (const p of paras) { starts.push(pos); pos += p.length + 1; }
  return starts;
};

export default function PDFReader() {
  const pdfReady     = usePdfJs();
  const canvasRef    = useRef(null);
  const fileInputRef = useRef(null);
  const paraListRef  = useRef(null);
  const keepAliveRef = useRef(null);

  const [pdfDoc,        setPdfDoc]        = useState(null);
  const [pageNum,       setPageNum]       = useState(1);
  const [totalPages,    setTotalPages]    = useState(0);
  const [scale,         setScale]         = useState(1.4);
  const [fileName,      setFileName]      = useState("");
  const [paragraphs,    setParagraphs]    = useState([]);
  const [ttsState,      setTtsState]      = useState("idle");
  const [ttsRate,       setTtsRate]       = useState(1);
  const [ttsPitch,      setTtsPitch]      = useState(1);
  const [voices,        setVoices]        = useState([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [dragging,      setDragging]      = useState(false);
  const [rendering,     setRendering]     = useState(false);
  const [pdfLoading,    setPdfLoading]    = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [activePara,    setActivePara]    = useState(-1);

  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length) { setVoices(v); setSelectedVoice(v[0]?.name ?? ""); }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const renderPage = useCallback(async (doc, num, sc) => {
    if (!doc || !canvasRef.current) return;
    setRendering(true);
    try {
      const page = await doc.getPage(num);
      const vp   = page.getViewport({ scale: sc });
      const canvas = canvasRef.current;
      canvas.height = vp.height; canvas.width = vp.width;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
      const content = await page.getTextContent();
      const text = content.items.map(i => i.str).join(" ");
      setParagraphs(splitParagraphs(text));
    } finally { setRendering(false); }
  }, []);

  useEffect(() => { if (pdfDoc) renderPage(pdfDoc, pageNum, scale); }, [pdfDoc, pageNum, scale, renderPage]);

  useEffect(() => {
    if (activePara < 0 || !paraListRef.current) return;
    const el = paraListRef.current.querySelector(`[data-para="${activePara}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activePara]);

  const startKeepAlive = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      src.connect(ctx.destination); src.start();
      keepAliveRef.current = { ctx, src };
    } catch (e) {}
  };

  const stopKeepAlive = () => {
    try { keepAliveRef.current?.src.stop(); keepAliveRef.current?.ctx.close(); } catch (e) {}
    keepAliveRef.current = null;
  };

  const loadPdf = async (file) => {
    if (!pdfReady || !file) return;
    stopTts();
    setPdfLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const doc = await window.pdfjsLib.getDocument({ data: buf }).promise;
      setPdfDoc(doc); setTotalPages(doc.numPages); setPageNum(1); setFileName(file.name);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleFile = (file) => { if (file?.type === "application/pdf") loadPdf(file); };

  const stopTts = () => {
    window.speechSynthesis.cancel();
    stopKeepAlive();
    setTtsState("idle");
    setActivePara(-1);
  };

  const playFrom = (fromIdx) => {
    if (!paragraphs.length) return;
    stopTts();
    const idx = Math.max(0, Math.min(fromIdx, paragraphs.length - 1));
    setActivePara(idx);
    startKeepAlive();

    const paraStarts = getParagraphStarts(paragraphs);
    const sliceText  = paragraphs.slice(idx).join(" ");
    const utter      = new SpeechSynthesisUtterance(sliceText);
    utter.rate = ttsRate; utter.pitch = ttsPitch;
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) utter.voice = voice;

    utter.onboundary = (e) => {
      if (e.name !== "word") return;
      const globalChar = paraStarts[idx] + e.charIndex;
      let cur = idx;
      for (let i = idx; i < paragraphs.length; i++) {
        if (paraStarts[i] <= globalChar) cur = i; else break;
      }
      setActivePara(cur);
    };
    utter.onend   = () => { stopKeepAlive(); setTtsState("idle"); setActivePara(-1); };
    utter.onerror = () => { stopKeepAlive(); setTtsState("idle"); setActivePara(-1); };

    window.speechSynthesis.speak(utter);
    setTtsState("playing");
  };

  const pauseTts = () => {
    if (ttsState === "playing") { window.speechSynthesis.pause(); setTtsState("paused"); }
    else if (ttsState === "paused") { window.speechSynthesis.resume(); setTtsState("playing"); }
  };

  const prevPage = () => { if (pageNum > 1)          { stopTts(); setPageNum(p => p - 1); } };
  const nextPage = () => { if (pageNum < totalPages) { stopTts(); setPageNum(p => p + 1); } };

  const s = {
    root:        { minHeight: "100vh", background: "#0d0d0f", color: "#e8e6e0", fontFamily: "'Georgia','Times New Roman',serif", display: "flex", flexDirection: "column" },
    header:      { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderBottom: "1px solid #1e1e22", background: "#0a0a0c" },
    logo:        { fontFamily: "'Georgia',serif", fontSize: 20, fontWeight: 700, letterSpacing: "0.08em", color: "#c9a84c", textTransform: "uppercase" },
    subtitle:    { fontSize: 11, color: "#555", letterSpacing: "0.18em", textTransform: "uppercase" },
    fileName:    { fontSize: 13, color: "#888", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    body:        { display: "flex", flex: 1, overflow: "hidden", position: "relative" },
    sidebar:     { width: sidebarOpen ? 300 : 0, minWidth: sidebarOpen ? 300 : 0, background: "#0a0a0c", borderRight: sidebarOpen ? "1px solid #1e1e22" : "none", display: "flex", flexDirection: "column", padding: sidebarOpen ? "24px 20px" : 0, gap: 20, overflowY: "auto", overflowX: "hidden", transition: "width 0.25s ease, min-width 0.25s ease, padding 0.25s ease" },
    toggleBtn:   { position: "absolute", left: sidebarOpen ? 288 : 8, top: "50%", transform: "translateY(-50%)", zIndex: 10, background: "#1a1a1f", border: "1px solid #2a2a30", color: "#888", borderRadius: 6, width: 24, height: 48, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "left 0.25s ease", fontSize: 10 },
    secTitle:    { fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "#c9a84c", marginBottom: 12, fontFamily: "'Georgia',serif" },
    uploadZone:  { border: `2px dashed ${dragging ? "#c9a84c" : "#2a2a30"}`, borderRadius: 8, padding: "28px 16px", textAlign: "center", cursor: "pointer", transition: "all 0.2s", background: dragging ? "rgba(201,168,76,0.05)" : "transparent" },
    uploadText:  { fontSize: 12, color: "#666", marginTop: 10, lineHeight: 1.6 },
    ttsButtons:  { display: "flex", gap: 8, marginBottom: 14 },
    ttsBtn:      (active, color = "#c9a84c") => ({ flex: 1, padding: "10px 0", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "'Georgia',serif", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s", background: active ? color : "#1a1a1f", color: active ? "#0a0a0c" : "#888" }),
    sliderGroup: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 },
    sliderLabel: { fontSize: 11, color: "#666", display: "flex", justifyContent: "space-between" },
    slider:      { width: "100%", accentColor: "#c9a84c", cursor: "pointer" },
    select:      { width: "100%", background: "#1a1a1f", color: "#e8e6e0", border: "1px solid #2a2a30", borderRadius: 6, padding: "8px 10px", fontSize: 12, fontFamily: "'Georgia',serif", cursor: "pointer", marginBottom: 10 },
    paraList:    { display: "flex", flexDirection: "column", gap: 4, maxHeight: 340, overflowY: "auto", paddingRight: 4 },
    paraItem:    (active) => ({ padding: "8px 10px", borderRadius: 6, fontSize: 11, lineHeight: 1.65, cursor: "pointer", transition: "all 0.2s", borderLeft: `3px solid ${active ? "#c9a84c" : "transparent"}`, background: active ? "rgba(201,168,76,0.1)" : "transparent", color: active ? "#e8e6e0" : "#555", userSelect: "none" }),
    viewer:      { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
    toolbar:     { display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "12px 24px", borderBottom: "1px solid #1e1e22", background: "#0a0a0c" },
    navBtn:      (dis) => ({ background: "none", border: "1px solid #2a2a30", color: dis ? "#333" : "#aaa", borderRadius: 6, padding: "6px 10px", cursor: dis ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }),
    pageInfo:    { fontSize: 13, color: "#888", minWidth: 100, textAlign: "center" },
    pageInput:   { width: 44, background: "#1a1a1f", border: "1px solid #2a2a30", color: "#e8e6e0", borderRadius: 4, padding: "4px 6px", textAlign: "center", fontSize: 13, fontFamily: "'Georgia',serif" },
    zoomBtn:     { background: "none", border: "1px solid #2a2a30", color: "#aaa", borderRadius: 6, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center" },
    canvasWrap:  { flex: 1, overflow: "auto", display: "flex", justifyContent: "center", padding: 28, background: "#111114" },
    canvasInner: { filter: rendering ? "opacity(0.5)" : "opacity(1)", transition: "filter 0.15s", boxShadow: "0 8px 40px rgba(0,0,0,0.6)" },
    emptyState:  { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "#444" },
    statusRow:   { display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#555", letterSpacing: "0.1em" },
    statusDot:   (st) => ({ width: 8, height: 8, borderRadius: "50%", background: st === "playing" ? "#4caf50" : st === "paused" ? "#c9a84c" : "#333", boxShadow: st === "playing" ? "0 0 6px #4caf50" : "none", transition: "all 0.3s" }),
  };

  return (
    <div style={s.root}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <header style={s.header}>
        <div><div style={s.logo}>Folio</div><div style={s.subtitle}>PDF Reader</div></div>
        {fileName && <div style={s.fileName}>📄 {fileName}</div>}
        <div style={s.statusRow}>
          <div style={s.statusDot(ttsState)} />
          {ttsState === "idle" ? "Ready" : ttsState === "playing" ? "Speaking" : "Paused"}
        </div>
      </header>

      <div style={s.body}>
        <button style={s.toggleBtn} onClick={() => setSidebarOpen(o => !o)}>
          {sidebarOpen ? "◀" : "▶"}
        </button>

        <aside style={s.sidebar}>
          <div>
            <div style={s.secTitle}>Document</div>
            <div style={s.uploadZone}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}>
              <UploadIcon />
              <div style={s.uploadText}>{pdfReady ? "Drop a PDF here\nor click to browse" : "Loading PDF engine…"}</div>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files?.[0])} />
          </div>

          <div>
            <div style={s.secTitle}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><SpeakerIcon />Text-to-Speech</span></div>
            <div style={s.ttsButtons}>
              <button style={s.ttsBtn(ttsState === "playing", "#4caf50")}
                onClick={ttsState === "idle" ? () => playFrom(0) : pauseTts} disabled={!pdfDoc}>
                {ttsState === "paused"  ? <><PlayIcon />Resume</>  :
                 ttsState === "playing" ? <><PauseIcon />Pause</> :
                                          <><PlayIcon />Read All</>}
              </button>
              <button style={s.ttsBtn(false)} onClick={stopTts} disabled={ttsState === "idle"}><StopIcon /></button>
            </div>
            {voices.length > 0 && (
              <select style={s.select} value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)}>
                {voices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
              </select>
            )}
            <div style={s.sliderGroup}>
              <div style={s.sliderLabel}><span>Speed</span><span style={{ color: "#c9a84c" }}>{ttsRate.toFixed(1)}×</span></div>
              <input type="range" min="0.5" max="2" step="0.1" value={ttsRate} style={s.slider} onChange={(e) => setTtsRate(parseFloat(e.target.value))} />
            </div>
            <div style={s.sliderGroup}>
              <div style={s.sliderLabel}><span>Pitch</span><span style={{ color: "#c9a84c" }}>{ttsPitch.toFixed(1)}</span></div>
              <input type="range" min="0.5" max="2" step="0.1" value={ttsPitch} style={s.slider} onChange={(e) => setTtsPitch(parseFloat(e.target.value))} />
            </div>
          </div>

          {paragraphs.length > 0 && (
            <div style={{ flex: 1, minHeight: 0 }}>
              <div style={s.secTitle}>Page Content ({paragraphs.length} paragraphs)</div>
              <div ref={paraListRef} style={s.paraList}>
                {paragraphs.map((p, i) => (
                  <div key={i} data-para={i} style={s.paraItem(activePara === i)} onClick={() => playFrom(i)} title="Click to read from here">
                    {activePara === i && <span style={{ fontSize: 9, color: "#c9a84c", letterSpacing: "0.1em", display: "block", marginBottom: 3 }}>▶ NOW READING</span>}
                    {p}
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <main style={s.viewer}>
          {pdfDoc && !pdfLoading && (
            <div style={s.toolbar}>
              <button style={s.navBtn(pageNum <= 1)} onClick={prevPage} disabled={pageNum <= 1}><ChevronLeft /></button>
              <div style={s.pageInfo}>
                <input type="number" style={s.pageInput} value={pageNum} min={1} max={totalPages}
                  onChange={(e) => { const v = parseInt(e.target.value); if (v >= 1 && v <= totalPages) { stopTts(); setPageNum(v); } }} />
                <span style={{ marginLeft: 6 }}>/ {totalPages}</span>
              </div>
              <button style={s.navBtn(pageNum >= totalPages)} onClick={nextPage} disabled={pageNum >= totalPages}><ChevronRight /></button>
              <div style={{ width: 1, height: 20, background: "#2a2a30", margin: "0 6px" }} />
              <button style={s.zoomBtn} onClick={() => setScale(sc => Math.min(sc + 0.2, 3))}><ZoomIn /></button>
              <span style={{ fontSize: 12, color: "#666", minWidth: 44, textAlign: "center" }}>{Math.round(scale * 100)}%</span>
              <button style={s.zoomBtn} onClick={() => setScale(sc => Math.max(sc - 0.2, 0.5))}><ZoomOut /></button>
            </div>
          )}

          <div style={s.canvasWrap}>
            {pdfLoading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, flex: 1 }}>
                <div style={{ position: "relative", width: 64, height: 64 }}>
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} style={{
                      position: "absolute", borderRadius: "50%",
                      border: "2px solid transparent",
                      borderTopColor: `rgba(201,168,76,${1 - i * 0.22})`,
                      width: 64 - i * 14, height: 64 - i * 14,
                      top: i * 7, left: i * 7,
                      animation: `spin ${0.9 + i * 0.15}s linear infinite`,
                      animationDirection: i % 2 === 0 ? "normal" : "reverse",
                    }} />
                  ))}
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#c9a84c", letterSpacing: "0.12em", textTransform: "uppercase" }}>Loading document</div>
                  <div style={{ fontSize: 11, color: "#444", marginTop: 6, letterSpacing: "0.08em" }}>{fileName}</div>
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