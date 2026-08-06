import { FC, RefObject, ChangeEvent } from "react";
import { SourceMode, ViewMode, PageSize, TtsState } from "../../types/reader";
import { useDark, dk } from "../../hooks/useTheme";
import { IconBtn } from "../common/Primitives";
import { PdfPageCard } from "./PdfPageCard";
import { Waveform } from "../common/Waveform";
import { SeekBar } from "../common/SeekBar";
import {
  IcoChevL,
  IcoChevR,
  IcoScrollMode,
  IcoSingleMode,
  IcoZoomIn,
  IcoZoomOut,
  IcoEdit,
  IcoArrowR,
  IcoGlobe,
  IcoLoader,
  IcoUpload,
} from "../common/Icons";

interface PdfViewerProps {
  sourceMode: SourceMode;
  viewMode: ViewMode;
  setViewMode: (vm: ViewMode) => void;
  pdfDoc: any;
  pdfLoading: boolean;
  pdfBytes: Uint8Array | null;
  pageNum: number;
  totalPages: number;
  scale: number;
  setScale: (fn: (s: number) => number) => void;
  prevPage: () => void;
  nextPage: () => void;
  changePage: (num: number) => void;
  autoNextPage: boolean;
  pageSizes: PageSize[];
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  pageRefs: RefObject<Record<number, HTMLDivElement | null>>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  rendering: boolean;
  setIsEditorOpen: (v: boolean) => void;

  // Web view props
  webUrl: string;
  webTitle: string;
  webLoading: boolean;
  webLoaded: boolean;
  paragraphs: string[];
  activePara: number;
  ttsState: TtsState;
  paraProgress: number;
  startReading: (i: number) => void;
  seekTo: (pi: number, ratio: number) => void;

  // Style tokens
  border: string;
  bgCard: string;
  bgInput: string;
  bgHover: string;
  bgCanvas: string;
  textMain: string;
  textMut: string;
}

export const PdfViewer: FC<PdfViewerProps> = ({
  sourceMode,
  viewMode,
  setViewMode,
  pdfDoc,
  pdfLoading,
  pdfBytes,
  pageNum,
  totalPages,
  scale,
  setScale,
  prevPage,
  nextPage,
  changePage,
  autoNextPage,
  pageSizes,
  scrollContainerRef,
  pageRefs,
  canvasRef,
  fileInputRef,
  rendering,
  setIsEditorOpen,
  webUrl,
  webTitle,
  webLoading,
  webLoaded,
  paragraphs,
  activePara,
  ttsState,
  paraProgress,
  startReading,
  seekTo,
  border,
  bgCard,
  bgInput,
  bgHover,
  bgCanvas,
  textMain,
  textMut,
}) => {
  const d = useDark();
  const showPdfView = sourceMode === "pdf" && (pdfDoc || pdfLoading);

  return (
    <main className="flex flex-col flex-1 overflow-hidden">
      {/* PDF toolbar */}
      {showPdfView && !pdfLoading && (
        <div
          className="flex items-center justify-center gap-2.5 px-5 py-2 shrink-0 flex-wrap select-none"
          style={{ borderBottom: `1px solid ${border}`, background: bgCard }}
        >
          <IconBtn onClick={prevPage} disabled={pageNum <= 1} title="Previous page">
            <IcoChevL />
          </IconBtn>
          <div className="flex items-center gap-1.5 text-sm" style={{ color: textMut }}>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageNum}
              className="w-12 rounded-md text-center text-sm py-1 focus:outline-none"
              style={{ border: `1px solid ${border}`, background: bgInput, color: textMain }}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const v = parseInt(e.target.value);
                if (v >= 1 && v <= totalPages) changePage(v);
              }}
            />
            <span>/ {totalPages}</span>
          </div>
          <IconBtn onClick={nextPage} disabled={pageNum >= totalPages} title="Next page">
            <IcoChevR />
          </IconBtn>

          <div className="w-px h-5 mx-1" style={{ background: border }} />

          {/* View Mode Segment Switch */}
          <div className="flex items-center gap-0.5 border rounded-md p-0.5" style={{ borderColor: border, background: bgInput }}>
            <button
              onClick={() => setViewMode("scroll")}
              title="Continuous Vertical Scroll Mode"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === "scroll" ? "bg-amber-500 text-white shadow-sm" : dk("text-gray-400 hover:text-gray-200", "text-gray-600 hover:text-gray-900", d)
              }`}
            >
              <IcoScrollMode />
              <span className="hidden sm:inline">Continuous</span>
            </button>
            <button
              onClick={() => setViewMode("single")}
              title="Single Page View Mode"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                viewMode === "single" ? "bg-amber-500 text-white shadow-sm" : dk("text-gray-400 hover:text-gray-200", "text-gray-600 hover:text-gray-900", d)
              }`}
            >
              <IcoSingleMode />
              <span className="hidden sm:inline">Single</span>
            </button>
          </div>

          <div className="w-px h-5 mx-1" style={{ background: border }} />

          {/* Zoom Controls */}
          <IconBtn onClick={() => setScale((s) => Math.min(s + 0.2, 3))} title="Zoom in">
            <IcoZoomIn />
          </IconBtn>
          <span className="text-xs font-mono tabular-nums w-12 text-center" style={{ color: textMut }}>
            {Math.round(scale * 100)}%
          </span>
          <IconBtn onClick={() => setScale((s) => Math.max(s - 0.2, 0.5))} title="Zoom out">
            <IcoZoomOut />
          </IconBtn>

          <div className="w-px h-5 mx-1" style={{ background: border }} />

          {/* Edit PDF Button */}
          {pdfBytes && (
            <button
              onClick={() => setIsEditorOpen(true)}
              title="Edit PDF (Fullscreen Editor Mode)"
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-all duration-150 cursor-pointer"
            >
              <IcoEdit />
              <span>Edit PDF</span>
            </button>
          )}

          {autoNextPage && (
            <span
              className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
              style={{ color: "#818cf8", borderColor: "rgba(129,140,248,0.3)", background: d ? "rgba(99,102,241,0.1)" : "rgba(238,242,255,1)" }}
            >
              <IcoArrowR /> Auto-next
            </span>
          )}
        </div>
      )}

      <div ref={scrollContainerRef} className="relative flex-1 overflow-auto" style={{ background: bgCanvas }}>
        {/* PDF loading spinner */}
        {pdfLoading && (
          <div className="flex flex-col items-center justify-center gap-6 min-h-full py-16">
            <div className="relative w-16 h-16">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="absolute rounded-full spin border-2 border-transparent"
                  style={{
                    borderTopColor: `rgba(245,158,11,${1 - i * 0.22})`,
                    width: 64 - i * 14,
                    height: 64 - i * 14,
                    top: i * 7,
                    left: i * 7,
                    animationDuration: `${0.9 + i * 0.15}s`,
                    animationDirection: i % 2 === 0 ? "normal" : "reverse",
                  }}
                />
              ))}
            </div>
            <p className="text-sm font-semibold text-amber-500 uppercase tracking-widest">Loading document</p>
          </div>
        )}

        {/* Continuous Vertical Scroll View Mode */}
        {!pdfLoading && showPdfView && viewMode === "scroll" && (
          <div className="flex flex-col items-center gap-8 py-8 px-4 w-full min-h-full">
            {Array.from({ length: totalPages }, (_, idx) => {
              const pNum = idx + 1;
              return (
                <div
                  key={pNum}
                  ref={(el) => {
                    if (pageRefs.current) pageRefs.current[pNum] = el;
                  }}
                  className="w-full flex justify-center"
                >
                  <PdfPageCard
                    doc={pdfDoc}
                    pageNum={pNum}
                    totalPages={totalPages}
                    scale={scale}
                    isActive={pageNum === pNum}
                    pageSize={pageSizes[idx]}
                    scrollContainerRef={scrollContainerRef}
                    onPageClick={changePage}
                    dark={d}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Floating Jumper / Indicator overlay for Continuous Scroll Mode */}
        {!pdfLoading && showPdfView && viewMode === "scroll" && totalPages > 1 && (
          <div className="sticky bottom-6 flex justify-end px-8 pointer-events-none z-20">
            <div
              className="pointer-events-auto flex items-center gap-2.5 px-3 py-1.5 rounded-full border backdrop-blur-md transition-all duration-200"
              style={{
                background: d ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.9)",
                borderColor: d ? "rgba(245,158,11,0.4)" : "#fde68a",
                boxShadow: d ? "0 10px 25px -5px rgba(0, 0, 0, 0.5)" : "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
              }}
            >
              <span className="text-xs font-mono font-semibold text-amber-500">
                Page {pageNum} <span className="opacity-50">/</span> {totalPages}
              </span>
              <div className="w-px h-3.5" style={{ background: d ? "#334155" : "#e2e8f0" }} />
              <button
                onClick={() => changePage(1)}
                title="Scroll to top"
                className="text-xs font-medium flex items-center gap-1 transition-colors hover:text-amber-500"
                style={{ color: textMut }}
              >
                ↑ Top
              </button>
            </div>
          </div>
        )}

        {/* Single Page View Mode */}
        {!pdfLoading && showPdfView && viewMode === "single" && (
          <div className="flex justify-center p-8 min-h-full items-center">
            <div className={`shadow-2xl transition-opacity duration-150 ${rendering ? "opacity-50" : "opacity-100"}`}>
              <canvas ref={canvasRef} className="block rounded-lg overflow-hidden" style={{ border: `1px solid ${border}` }} />
            </div>
          </div>
        )}

        {/* Web mode or empty state */}
        {!showPdfView && !pdfLoading && (
          <div className="flex justify-center p-8 min-h-full">
            {/* Web mode: article view */}
            {sourceMode === "web" && webLoaded && (
              <div className="w-full max-w-2xl flex flex-col gap-0">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-amber-500">
                      <IcoGlobe />
                    </span>
                    <a href={webUrl} target="_blank" rel="noreferrer" className="text-xs truncate underline underline-offset-2" style={{ color: textMut }}>
                      {webUrl}
                    </a>
                  </div>
                  <h2 className="text-xl font-bold leading-snug" style={{ color: textMain }}>
                    {webTitle}
                  </h2>
                </div>
                {paragraphs.map((p, i) => {
                  const active = activePara === i;
                  return (
                    <div
                      key={i}
                      className="py-3 px-4 rounded-lg mb-1.5 text-sm leading-relaxed transition-all duration-150 cursor-pointer border-l-2"
                      style={{
                        borderLeftColor: active ? "#f59e0b" : "transparent",
                        background: active
                          ? d ? "rgba(245,158,11,0.08)" : "rgba(254,243,199,0.5)"
                          : d ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.8)",
                        color: active ? textMain : textMut,
                      }}
                      onClick={() => !active && startReading(i)}
                      onMouseEnter={(e) => {
                        if (!active) (e.currentTarget as HTMLElement).style.background = d ? "rgba(255,255,255,0.04)" : bgHover;
                      }}
                      onMouseLeave={(e) => {
                        if (!active) (e.currentTarget as HTMLElement).style.background = d ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.8)";
                      }}
                    >
                      {active && (
                        <span className="flex items-center gap-2 mb-2">
                          <Waveform paused={ttsState === "paused"} />
                          <span className="text-[9px] text-amber-500 font-semibold tracking-widest uppercase">
                            {ttsState === "paused" ? "Paused" : "Now Reading"}
                          </span>
                        </span>
                      )}
                      {p}
                      {active && <SeekBar progress={paraProgress} ttsState={ttsState} onSeek={(r) => seekTo(i, r)} />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Web mode: loading */}
            {sourceMode === "web" && webLoading && (
              <div className="flex flex-col items-center justify-center gap-4 flex-1">
                <div className="text-amber-500 animate-spin">
                  <IcoLoader />
                </div>
                <p className="text-sm font-medium text-amber-500">Fetching pages…</p>
                <p className="text-xs" style={{ color: textMut }}>
                  {webUrl}
                </p>
              </div>
            )}

            {/* Empty state */}
            {!webLoading && !showPdfView && !(sourceMode === "web" && webLoaded) && (
              <div className="flex flex-col items-center justify-center gap-4 flex-1">
                <span className="text-7xl select-none" style={{ opacity: 0.12 }}>
                  📖
                </span>
                <div className="text-center">
                  <p className="text-xl font-semibold" style={{ color: textMut }}>
                    Nothing to read yet
                  </p>
                  <p className="text-sm mt-1" style={{ color: textMut }}>
                    {sourceMode === "pdf" ? "Upload a PDF from the sidebar" : "Enter a URL in the sidebar to fetch a web page"}
                  </p>
                </div>
                {sourceMode === "pdf" && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors"
                    style={{ border: `1px solid ${border}`, background: bgCard, color: textMain }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = bgHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = bgCard)}
                  >
                    <IcoUpload />
                    Browse for PDF
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};
