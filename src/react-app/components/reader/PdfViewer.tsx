import { FC, RefObject, ChangeEvent } from "react";
import { SourceMode, ViewMode, PageSize, TtsState } from "../../types/reader";
import { SearchMatch, SearchOptions } from "../../types/search";
import { useDark, useThemeMode, getPdfFilter, dk } from "../../hooks/useTheme";
import { IconBtn } from "../common/Primitives";
import { PdfPageCard } from "./PdfPageCard";
import { SearchBar } from "./SearchBar";
import { Waveform } from "../common/Waveform";
import { SeekBar } from "../common/SeekBar";
import {
  IcoChevL,
  IcoChevR,
  IcoScrollMode,
  IcoSingleMode,
  IcoZoomIn,
  IcoZoomOut,
  IcoFitWidth,
  IcoEdit,
  IcoArrowR,
  IcoGlobe,
  IcoLoader,
  IcoUpload,
  IcoMarkdown,
  IcoSparkles,
  IcoSearch,
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
  setScale: (fn: ((s: number) => number) | number) => void;
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
  onExportMarkdown?: () => void;
  onLoadSample?: () => void;

  // Search props
  isSearchOpen?: boolean;
  onOpenSearch?: () => void;
  onCloseSearch?: () => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  isSearching?: boolean;
  searchOptions?: SearchOptions;
  onToggleMatchCase?: () => void;
  onToggleWholeWord?: () => void;
  activeMatchIndex?: number;
  totalMatches?: number;
  onNextMatch?: () => void;
  onPrevMatch?: () => void;
  getPageMatches?: (pageNum: number) => SearchMatch[];
  searchMatches?: SearchMatch[];

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
  onExportMarkdown,
  onLoadSample,
  isSearchOpen = false,
  onOpenSearch,
  onCloseSearch,
  searchQuery = "",
  setSearchQuery,
  isSearching = false,
  searchOptions = { matchCase: false, wholeWord: false },
  onToggleMatchCase,
  onToggleWholeWord,
  activeMatchIndex = -1,
  totalMatches = 0,
  onNextMatch,
  onPrevMatch,
  getPageMatches,
  searchMatches = [],
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
  const themeMode = useThemeMode();
  const isAmoled = themeMode === "amoled";
  const showPdfView = sourceMode === "pdf" && (pdfDoc || pdfLoading);

  return (
    <main className="flex flex-col flex-1 overflow-hidden">
      {/* PDF Toolbar */}
      {showPdfView && !pdfLoading && (
        <div
          className="flex items-center justify-center gap-2 sm:gap-3 px-4 py-2 shrink-0 flex-wrap select-none z-20 backdrop-blur-md transition-colors"
          style={{
            borderBottom: `1px solid ${border}`,
            background: isAmoled ? "rgba(0,0,0,0.9)" : d ? "rgba(17,24,39,0.9)" : "rgba(255,255,255,0.92)",
          }}
        >
          {/* Page Navigation */}
          <div className="flex items-center gap-1">
            <IconBtn onClick={prevPage} disabled={pageNum <= 1} title="Previous page">
              <IcoChevL size={15} />
            </IconBtn>
            <div className="flex items-center gap-1 text-xs font-mono px-1">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageNum}
                className="w-12 rounded-none text-center text-xs py-1 font-mono font-bold focus:outline-none focus:border-amber-500 transition-colors"
                style={{
                  border: `1px solid ${border}`,
                  background: bgInput,
                  color: textMain,
                }}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const v = parseInt(e.target.value);
                  if (v >= 1 && v <= totalPages) changePage(v);
                }}
              />
              <span className="opacity-60 font-mono">/</span>
              <span className="font-semibold font-mono" style={{ color: textMut }}>{totalPages}</span>
            </div>
            <IconBtn onClick={nextPage} disabled={pageNum >= totalPages} title="Next page">
              <IcoChevR size={15} />
            </IconBtn>
          </div>

          <div className="w-px h-5 mx-0.5" style={{ background: border }} />

          {/* View Mode Switch */}
          <div
            className="flex items-center gap-0.5 border rounded-none p-0.5"
            style={{ borderColor: border, background: bgInput }}
          >
            <button
              onClick={() => setViewMode("scroll")}
              title="Continuous Scroll Mode"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-none transition-colors cursor-pointer border ${
                viewMode === "scroll"
                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                  : dk("text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-500/10", "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-500/10", d)
              }`}
            >
              <IcoScrollMode />
              <span className="hidden sm:inline">Continuous</span>
            </button>
            <button
              onClick={() => setViewMode("single")}
              title="Single Page Mode"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-none transition-colors cursor-pointer border ${
                viewMode === "single"
                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                  : dk("text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-500/10", "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-500/10", d)
              }`}
            >
              <IcoSingleMode />
              <span className="hidden sm:inline">Single</span>
            </button>
          </div>

          <div className="w-px h-5 mx-0.5" style={{ background: border }} />

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <IconBtn
              onClick={() => setScale((s: number) => Math.min(Number((s + 0.15).toFixed(2)), 3))}
              title="Zoom In"
            >
              <IcoZoomIn size={15} />
            </IconBtn>
            <button
              onClick={() =>
                setScale(() => {
                  if (typeof window === "undefined") return 1.2;
                  const w = window.innerWidth;
                  if (w < 480) return 0.65;
                  if (w < 768) return 0.85;
                  if (w < 1024) return 1.05;
                  return 1.25;
                })
              }
              title="Reset Zoom (Fit to width)"
              className="text-xs font-mono font-bold px-2 py-1 rounded-none transition-colors cursor-pointer"
              style={{ background: bgInput, color: textMain, border: `1px solid ${border}` }}
            >
              {Math.round(scale * 100)}%
            </button>
            <IconBtn
              onClick={() => setScale((s: number) => Math.max(Number((s - 0.15).toFixed(2)), 0.35))}
              title="Zoom Out"
            >
              <IcoZoomOut size={15} />
            </IconBtn>
            <IconBtn
              onClick={() =>
                setScale(() => {
                  if (typeof window === "undefined") return 1.2;
                  const w = window.innerWidth;
                  if (w < 480) return 0.65;
                  if (w < 768) return 0.85;
                  if (w < 1024) return 1.05;
                  return 1.25;
                })
              }
              title="Auto Width"
            >
              <IcoFitWidth size={15} />
            </IconBtn>
          </div>

          <div className="w-px h-5 mx-0.5" style={{ background: border }} />

          {/* Search Action */}
          <button
            onClick={() => (isSearchOpen ? onCloseSearch?.() : onOpenSearch?.())}
            title="Find in document (Ctrl+F)"
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-none border transition-colors cursor-pointer shadow-xs ${
              isSearchOpen
                ? "bg-amber-500 text-white border-amber-600"
                : isAmoled
                ? "bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-white"
                : d
                ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <IcoSearch size={13} />
            <span>Find</span>
            {totalMatches > 0 && searchQuery && (
              <span
                className={`px-1.5 py-0.2 rounded-none text-[10px] font-mono font-bold border ${
                  isSearchOpen ? "bg-white text-amber-600 border-white" : "bg-amber-500 text-white border-amber-600"
                }`}
              >
                {totalMatches}
              </span>
            )}
          </button>

          {/* Fullscreen PDF Markup Studio Button */}
          {pdfBytes && (
            <button
              onClick={() => setIsEditorOpen(true)}
              title="Open Fullscreen PDF Editor & Markup Studio"
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-none bg-amber-500 hover:bg-amber-600 border border-amber-600 text-white shadow-xs transition-colors cursor-pointer"
            >
              <IcoEdit size={13} />
              <span>[ EDIT PDF ]</span>
            </button>
          )}

          {/* Export Markdown Button */}
          {pdfBytes && onExportMarkdown && (
            <button
              onClick={onExportMarkdown}
              title="Export to Clean Markdown (AI & LLM-Ready)"
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-none border transition-colors cursor-pointer shadow-2xs hover:border-amber-500"
              style={{
                borderColor: d ? "rgba(245,158,11,0.5)" : "rgba(245,158,11,0.6)",
                background: d ? "rgba(245,158,11,0.1)" : "rgba(254,243,199,0.7)",
                color: "#f59e0b",
              }}
            >
              <IcoMarkdown size={13} />
              <span>Export MD</span>
              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-none text-[9px] font-mono font-bold bg-amber-500 text-white uppercase tracking-wider">
                <IcoSparkles size={8} /> AI
              </span>
            </button>
          )}

          {autoNextPage && (
            <span
              className="ml-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[11px] font-mono font-semibold border"
              style={{
                color: "#818cf8",
                borderColor: "rgba(129,140,248,0.3)",
                background: d ? "rgba(99,102,241,0.1)" : "rgba(238,242,255,1)",
              }}
            >
              <IcoArrowR size={11} /> Auto-turn
            </span>
          )}
        </div>
      )}

      {/* Main Viewer Canvas / Scroll Area */}
      <div ref={scrollContainerRef} className="relative flex-1 overflow-auto" style={{ background: bgCanvas }}>
        {/* Floating Search Bar Widget */}
        {isSearchOpen && (
          <SearchBar
            isOpen={isSearchOpen}
            onClose={onCloseSearch || (() => {})}
            query={searchQuery}
            onQueryChange={setSearchQuery || (() => {})}
            isSearching={isSearching}
            options={searchOptions}
            onToggleMatchCase={onToggleMatchCase || (() => {})}
            onToggleWholeWord={onToggleWholeWord || (() => {})}
            activeMatchIndex={activeMatchIndex}
            totalMatches={totalMatches}
            onNextMatch={onNextMatch || (() => {})}
            onPrevMatch={onPrevMatch || (() => {})}
          />
        )}

        {/* PDF Loading Spinner */}
        {pdfLoading && (
          <div className="flex flex-col items-center justify-center gap-5 min-h-full py-16">
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
            <div className="text-center">
              <p className="text-sm font-bold text-amber-500 tracking-widest uppercase">
                Rendering Document
              </p>
              <p className="text-xs mt-1" style={{ color: textMut }}>
                Decoding PDF pages in WebAssembly sandbox...
              </p>
            </div>
          </div>
        )}

        {/* Continuous Vertical Scroll View Mode */}
        {!pdfLoading && showPdfView && viewMode === "scroll" && (
          <div className="flex flex-col items-center gap-6 sm:gap-8 py-6 sm:py-8 px-2 sm:px-4 min-w-full w-max mx-auto min-h-full">
            {Array.from({ length: totalPages }, (_, idx) => {
              const pNum = idx + 1;
              return (
                <div
                  key={pNum}
                  ref={(el) => {
                    if (pageRefs.current) pageRefs.current[pNum] = el;
                  }}
                  className="w-full flex justify-center min-w-fit"
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
                    pageMatches={getPageMatches ? getPageMatches(pNum) : []}
                    activeMatchIndex={activeMatchIndex}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Floating Jumper / Indicator overlay for Continuous Scroll Mode */}
        {!pdfLoading && showPdfView && viewMode === "scroll" && totalPages > 1 && (
          <div className="sticky bottom-6 flex justify-end px-4 sm:px-8 pointer-events-none z-20">
            <div
              className="pointer-events-auto flex items-center gap-2.5 px-3 py-1.5 rounded-none border backdrop-blur-md transition-colors shadow-lg"
              style={{
                background: isAmoled ? "rgba(0,0,0,0.92)" : d ? "rgba(15,23,42,0.9)" : "rgba(255,255,255,0.94)",
                borderColor: isAmoled ? "rgba(245,158,11,0.5)" : d ? "rgba(245,158,11,0.4)" : "#deded9",
              }}
            >
              <span className="text-xs font-mono font-bold text-amber-500">
                [ PAGE {pageNum} / {totalPages} ]
              </span>
              <div className="w-px h-3.5" style={{ background: isAmoled ? "#27272a" : d ? "#334155" : "#deded9" }} />
              <button
                onClick={() => changePage(1)}
                title="Scroll to first page"
                className="text-xs font-mono font-semibold flex items-center gap-1 transition-colors hover:text-amber-500 cursor-pointer"
                style={{ color: textMut }}
              >
                ↑ TOP
              </button>
            </div>
          </div>
        )}

        {/* Single Page View Mode */}
        {!pdfLoading && showPdfView && viewMode === "single" && (
          <div className="flex justify-center p-3 sm:p-6 md:p-8 min-h-full items-center min-w-full w-max mx-auto">
            <div
              className={`relative shadow-2xl transition-opacity duration-150 rounded-none overflow-hidden max-w-full ${rendering ? "opacity-50" : "opacity-100"}`}
              style={{
                background: isAmoled ? "#000000" : d ? "#1e293b" : "#ffffff",
                border: `1px solid ${isAmoled ? "#27272a" : border}`,
              }}
            >
              <canvas
                ref={canvasRef}
                className="block rounded-none overflow-hidden max-w-full h-auto object-contain"
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  filter: getPdfFilter(themeMode),
                  background: isAmoled ? "#000000" : d ? "#1e293b" : "#ffffff",
                }}
              />
              {/* Search Highlights Overlay for Current Page */}
              {getPageMatches && getPageMatches(pageNum).length > 0 && (
                <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-none">
                  {getPageMatches(pageNum).map((match) => {
                    const isActiveMatch = match.globalIndex === activeMatchIndex;
                    return match.rects.map((rect, rIdx) => (
                      <div
                        key={`${match.id}-${rIdx}`}
                        id={isActiveMatch && rIdx === 0 ? `search-match-${match.globalIndex}` : undefined}
                        className={`absolute transition-all duration-150 ${
                          isActiveMatch
                            ? "bg-amber-500/80 ring-2 ring-amber-400 shadow-md rounded-none z-20 animate-pulse"
                            : "bg-yellow-300/45 dark:bg-yellow-400/35 border border-yellow-500/50 rounded-none z-10"
                        }`}
                        style={{
                          left: `${rect.x}%`,
                          top: `${rect.y}%`,
                          width: `${rect.width}%`,
                          height: `${rect.height}%`,
                        }}
                      />
                    ));
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Web Mode or Welcome Studio Desk */}
        {!showPdfView && !pdfLoading && (
          <div className="flex justify-center p-4 sm:p-8 min-h-full">
            {/* Web Mode: Article Reader View */}
            {sourceMode === "web" && webLoaded && (
              <div className="w-full max-w-3xl flex flex-col gap-2 py-4">
                <div className="mb-6 p-5 rounded-none border backdrop-blur-md" style={{ borderColor: border, background: bgCard }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-amber-500">
                      <IcoGlobe size={16} />
                    </span>
                    <a
                      href={webUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs truncate underline underline-offset-4 hover:text-amber-500 transition-colors font-mono"
                      style={{ color: textMut }}
                    >
                      {webUrl}
                    </a>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight" style={{ color: textMain }}>
                    {webTitle}
                  </h2>
                </div>

                <div className="flex flex-col gap-2">
                  {paragraphs.map((p, i) => {
                    const active = activePara === i;
                    const isMatchingPara =
                      searchMatches &&
                      searchMatches.some(
                        (m) => m.paragraphIndex === i && m.globalIndex === activeMatchIndex
                      );

                    return (
                      <div
                        key={i}
                        id={`web-para-${i}`}
                        className={`py-3.5 px-5 rounded-none mb-1 text-sm leading-relaxed transition-colors cursor-pointer border-l-2 border-r border-t border-b ${
                          isMatchingPara ? "ring-2 ring-amber-400 shadow-md" : ""
                        }`}
                        style={{
                          borderLeftColor: active || isMatchingPara ? "#f59e0b" : border,
                          borderTopColor: border,
                          borderRightColor: border,
                          borderBottomColor: border,
                          background: isMatchingPara
                            ? d ? "rgba(245,158,11,0.18)" : "rgba(254,243,199,0.8)"
                            : active
                            ? d ? "rgba(245,158,11,0.1)" : "rgba(254,243,199,0.6)"
                            : isAmoled
                            ? "rgba(255,255,255,0.03)"
                            : d ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.85)",
                          color: active || isMatchingPara ? textMain : textMut,
                        }}
                        onClick={() => !active && startReading(i)}
                        onMouseEnter={(e) => {
                          if (!active && !isMatchingPara)
                            (e.currentTarget as HTMLElement).style.background = isAmoled ? "rgba(255,255,255,0.06)" : d ? "rgba(255,255,255,0.04)" : bgHover;
                        }}
                        onMouseLeave={(e) => {
                          if (!active && !isMatchingPara)
                            (e.currentTarget as HTMLElement).style.background = isAmoled ? "rgba(255,255,255,0.03)" : d ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.85)";
                        }}
                      >
                        {active && (
                          <span className="flex items-center gap-2 mb-2">
                            <Waveform paused={ttsState === "paused"} />
                            <span className="text-[9px] font-mono text-amber-500 font-bold tracking-widest uppercase">
                              {ttsState === "paused" ? "[ PAUSED ]" : "[ NOW READING ]"}
                            </span>
                          </span>
                        )}
                        <p className="leading-relaxed">{p}</p>
                        {active && <SeekBar progress={paraProgress} ttsState={ttsState} onSeek={(r) => seekTo(i, r)} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Web Mode Loading */}
            {sourceMode === "web" && webLoading && (
              <div className="flex flex-col items-center justify-center gap-4 flex-1">
                <div className="text-amber-500 animate-spin">
                  <IcoLoader size={28} />
                </div>
                <p className="text-sm font-bold text-amber-500 font-mono">[ FETCHING ARTICLE... ]</p>
                <p className="text-xs font-mono" style={{ color: textMut }}>
                  {webUrl}
                </p>
              </div>
            )}

            {/* Welcome Studio Desk (Empty State) */}
            {!webLoading && !showPdfView && !(sourceMode === "web" && webLoaded) && (
              <div className="flex flex-col items-center justify-center max-w-3xl w-full my-auto py-8 px-4 text-center">
                {/* Editorial Badge */}
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-none text-xs font-mono font-bold tracking-wider uppercase border mb-4 shadow-2xs"
                  style={{
                    background: isAmoled ? "rgba(245,158,11,0.12)" : d ? "rgba(245,158,11,0.1)" : "rgba(254,243,199,0.8)",
                    borderColor: isAmoled ? "rgba(245,158,11,0.4)" : d ? "rgba(245,158,11,0.3)" : "#fde68a",
                    color: "#f59e0b",
                  }}
                >
                  <IcoSparkles size={13} />
                  <span>[ PRIVACY-FIRST DOCUMENT STUDIO ]</span>
                </div>

                {/* Hero Title */}
                <h2
                  className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-3"
                  style={{ color: textMain }}
                >
                  The Art of Deep Reading &amp; Narration
                </h2>

                <p className="text-sm sm:text-base max-w-xl mb-8 leading-relaxed" style={{ color: textMut }}>
                  Open PDFs, Word docs, EPUBs, or web articles. Experience synchronized voice narration, local AI intelligence, and precision editing without uploading a single byte.
                </p>

                {/* Interactive Dropzone Desk */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full max-w-xl p-8 rounded-none border-2 border-dashed transition-colors hover:border-amber-500 cursor-pointer group shadow-sm hover:shadow-md mb-8"
                  style={{
                    borderColor: isAmoled ? "#27272a" : d ? "#374151" : "#d1d5db",
                    background: isAmoled
                      ? "rgba(255,255,255,0.02)"
                      : d
                      ? "rgba(255,255,255,0.02)"
                      : "rgba(255,255,255,0.8)",
                  }}
                >
                  <div className="w-14 h-14 rounded-none border mx-auto mb-4 flex items-center justify-center bg-amber-500/10 text-amber-500 group-hover:scale-105 transition-transform" style={{ borderColor: border }}>
                    <IcoUpload size={26} />
                  </div>

                  <p className="text-base font-bold mb-1 font-mono uppercase tracking-wider" style={{ color: textMain }}>
                    [ DROP YOUR DOCUMENT HERE ]
                  </p>
                  <p className="text-xs mb-4 font-mono" style={{ color: textMut }}>
                    Supports PDF, DOCX, EPUB, XLSX, CSV, RTF &amp; ODT
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-4 py-2 rounded-none text-xs font-bold text-white border border-amber-600 shadow-xs transition-colors cursor-pointer"
                      style={{ background: "#f59e0b" }}
                    >
                      [ BROWSE DOCUMENT ]
                    </button>

                    {onLoadSample && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoadSample();
                        }}
                        className="px-4 py-2 rounded-none text-xs font-bold border transition-colors cursor-pointer"
                        style={{
                          borderColor: border,
                          background: bgInput,
                          color: textMain,
                        }}
                      >
                        [ EXPLORE DEMO DOC ✨ ]
                      </button>
                    )}
                  </div>
                </div>

                {/* 4 Feature Spotlight Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl text-left">
                  <div
                    className="p-3.5 rounded-none border transition-colors"
                    style={{ borderColor: border, background: isAmoled ? "#09090b" : bgCard }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-amber-500 font-bold text-sm">🎙️</span>
                      <h4 className="text-xs font-bold font-mono uppercase" style={{ color: textMain }}>
                        Voice Narration
                      </h4>
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: textMut }}>
                      Follows sentences with live word-level tracking, pitch and speed control, and automatic page turns.
                    </p>
                  </div>

                  <div
                    className="p-3.5 rounded-none border transition-colors"
                    style={{ borderColor: border, background: isAmoled ? "#09090b" : bgCard }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-blue-500 font-bold text-sm">🧠</span>
                      <h4 className="text-xs font-bold font-mono uppercase" style={{ color: textMain }}>
                        Local &amp; Cloud AI
                      </h4>
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: textMut }}>
                      Query full documents or target pages using Chrome Built-in Nano or Gemini 3.7 Flash.
                    </p>
                  </div>

                  <div
                    className="p-3.5 rounded-none border transition-colors"
                    style={{ borderColor: border, background: isAmoled ? "#09090b" : bgCard }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-emerald-500 font-bold text-sm">✍️</span>
                      <h4 className="text-xs font-bold font-mono uppercase" style={{ color: textMain }}>
                        Markup Studio
                      </h4>
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: textMut }}>
                      Highlight text, insert custom signatures, stamp watermarks, and reorder pages in fullscreen.
                    </p>
                  </div>

                  <div
                    className="p-3.5 rounded-none border transition-colors"
                    style={{ borderColor: border, background: isAmoled ? "#09090b" : bgCard }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-violet-500 font-bold text-sm">🔒</span>
                      <h4 className="text-xs font-bold font-mono uppercase" style={{ color: textMain }}>
                        Zero-Upload Privacy
                      </h4>
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: textMut }}>
                      100% WebAssembly powered. Files are rendered locally on your device without server tracking.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

