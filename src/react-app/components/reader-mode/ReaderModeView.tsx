import { FC, useState, useMemo, useRef, useEffect, useCallback, RefObject, Fragment } from "react";
import { SourceMode, TtsState, ReaderTypographyConfig } from "../../types/reader";
import { SearchMatch, SearchOptions } from "../../types/search";
import { useDark, useThemeMode } from "../../hooks/useTheme";
import { ReaderParagraph } from "./ReaderParagraph";
import { ReaderAiPlaceholder } from "./ReaderAiPlaceholder";
import { SearchBar } from "../reader/SearchBar";
import { TtsVoiceModal } from "../reader/TtsVoiceModal";
import {
  IcoSearch,
  IcoBookOpen,
  IcoType,
  IcoUpload,
  IcoMarkdown,
  IcoFile,
  IcoGlobe,
  IcoStop,
  IcoPlay,
  IcoPause,
  IcoSkipBack,
  IcoSkipForward,
  IcoVolume,
  IcoVolume1,
  IcoVolumeX,
} from "../common/Icons";

interface ReaderModeViewProps {
  sourceMode: SourceMode;
  docTitle: string;
  docMarkdown: string;
  paragraphs: string[];
  activePara: number;
  activeCharOffset: number;
  paraProgress: number;
  ttsState: TtsState;
  startReading: (i: number) => void;
  pauseTts: () => void;
  stopTts: (u?: boolean) => void;
  seekTo: (pi: number, ratio: number) => void;
  voices: SpeechSynthesisVoice[];
  selectedVoice: string;
  setSelectedVoice: (v: string) => void;
  ttsRate: number;
  setTtsRate: (r: number) => void;
  ttsPitch: number;
  setTtsPitch: (p: number) => void;
  ttsVolume: number;
  setTtsVolume: (v: number) => void;

  // Loading states
  isLoading?: boolean;
  isExtractingMarkdown?: boolean;
  pdfLoading?: boolean;
  webLoading?: boolean;

  // Page Breaks
  pageBreakIndices?: number[];
  pageNumberMap?: Record<number, number>;

  // File loading
  fileInputRef: RefObject<HTMLInputElement | null>;
  onLoadSample?: () => void;
  onExportMarkdown?: () => void;

  // Search
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
  searchMatches?: SearchMatch[];

  // Styles
  border: string;
  bgInput: string;
  bgCanvas: string;
  textMain: string;
  textMut: string;
}

export const ReaderModeView: FC<ReaderModeViewProps> = ({
  sourceMode,
  docTitle,
  docMarkdown,
  paragraphs,
  activePara,
  activeCharOffset,
  paraProgress,
  ttsState,
  startReading,
  pauseTts,
  stopTts,
  seekTo,
  voices,
  selectedVoice,
  setSelectedVoice,
  ttsRate,
  setTtsRate,
  ttsPitch,
  setTtsPitch,
  ttsVolume,
  setTtsVolume,
  isLoading = false,
  isExtractingMarkdown = false,
  pdfLoading = false,
  webLoading = false,
  pageBreakIndices = [],
  pageNumberMap = {},
  fileInputRef,
  onLoadSample,
  onExportMarkdown,
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
  searchMatches = [],
  border,
  bgInput,
  bgCanvas,
  textMain,
  textMut,
}) => {
  const isDark = useDark();
  const themeMode = useThemeMode();
  const isAmoled = themeMode === "amoled";

  // Typography Preferences
  const [typography, setTypography] = useState<ReaderTypographyConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("pdf_reader_typography") || localStorage.getItem("folio_reader_typography");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      fontFamily: "serif",
      fontSize: "base",
      contentWidth: "normal",
      lineHeight: "relaxed",
    };
  });

  const [showTypographyMenu, setShowTypographyMenu] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const updateTypography = (next: Partial<ReaderTypographyConfig>) => {
    setTypography((prev) => {
      const updated = { ...prev, ...next };
      try {
        localStorage.setItem("pdf_reader_typography", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Font family styles
  const fontFamilyClass =
    typography.fontFamily === "serif"
      ? "font-serif tracking-normal"
      : typography.fontFamily === "mono"
      ? "font-mono text-[0.92em]"
      : "font-sans tracking-normal";

  // Font size styles
  const fontSizeClass =
    typography.fontSize === "sm"
      ? "text-sm"
      : typography.fontSize === "lg"
      ? "text-lg"
      : typography.fontSize === "xl"
      ? "text-xl"
      : "text-base";

  // Line height styles
  const lineHeightClass =
    typography.lineHeight === "loose"
      ? "leading-loose"
      : typography.lineHeight === "normal"
      ? "leading-normal"
      : "leading-relaxed";

  // Content width constraints
  const maxWidthClass =
    typography.contentWidth === "compact"
      ? "max-w-2xl"
      : typography.contentWidth === "wide"
      ? "max-w-5xl"
      : "max-w-3xl";

  const isContentGenerating = isLoading || isExtractingMarkdown || pdfLoading || webLoading;

  // Document Reading Stats
  const totalWords = useMemo(() => {
    return paragraphs.reduce((acc, p) => acc + (p.trim() ? p.trim().split(/\s+/).length : 0), 0);
  }, [paragraphs]);

  const estReadMinutes = useMemo(() => {
    return Math.max(1, Math.ceil(totalWords / 200));
  }, [totalWords]);

  const hasDocument = paragraphs.length > 0 || Boolean(docMarkdown);

  // Auto-scroll active paragraph into view
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (activePara < 0 || !containerRef.current) return;
    const el = containerRef.current.querySelector<HTMLElement>(`[data-para="${activePara}"]`);
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activePara]);

  // Paragraph navigation handlers for the bottom reader dock
  const onPrevPara = useCallback(() => {
    if (paragraphs.length === 0) return;
    const current = activePara >= 0 ? activePara : 0;
    const prev = Math.max(0, current - 1);
    startReading(prev);
  }, [paragraphs, activePara, startReading]);

  const onNextPara = useCallback(() => {
    if (paragraphs.length === 0) return;
    const current = activePara >= 0 ? activePara : -1;
    const next = Math.min(paragraphs.length - 1, current + 1);
    startReading(next);
  }, [paragraphs, activePara, startReading]);

  const handleBottomPlayPause = useCallback(() => {
    pauseTts();
  }, [pauseTts]);

  // Volume state & mute toggle for bottom bar
  const [showVolumePopover, setShowVolumePopover] = useState(false);
  const prevVolumeRef = useRef(ttsVolume > 0 ? ttsVolume : 1);

  const toggleMute = useCallback(() => {
    if (ttsVolume > 0) {
      prevVolumeRef.current = ttsVolume;
      setTtsVolume(0);
    } else {
      setTtsVolume(prevVolumeRef.current || 1);
    }
  }, [ttsVolume, setTtsVolume]);

  return (
    <main
      className="flex-1 flex flex-col relative overflow-hidden transition-colors select-text"
      style={{ background: bgCanvas }}
    >
      {/* Top Floating Reader Bar: Typography, Page Navigation, TTS Quickbar */}
      <div
        className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-2.5 border-b backdrop-blur-md z-20 transition-colors"
        style={{
          borderColor: border,
          background: isAmoled
            ? "rgba(0, 0, 0, 0.92)"
            : isDark
            ? "rgba(15, 23, 42, 0.9)"
            : "rgba(255, 255, 255, 0.94)",
        }}
      >
        {/* Left: Mode Badge & Document Meta */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-2xs">
            <IcoBookOpen size={13} />
            <span>Reader Mode</span>
          </div>

          {isContentGenerating ? (
            <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <span>Generating content...</span>
            </div>
          ) : hasDocument ? (
            <span className="hidden md:inline-flex items-center gap-2 text-xs" style={{ color: textMut }}>
              <span>{totalWords.toLocaleString()} words</span>
              <span>•</span>
              <span>~{estReadMinutes} min read</span>
            </span>
          ) : null}
        </div>

        {/* Right: Typography Controls, Voice, Search */}
        <div className="flex items-center gap-2">
          {/* Typography Adjuster Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTypographyMenu((v) => !v)}
              title="Adjust Reading Typography"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                borderColor: showTypographyMenu ? "#f59e0b" : border,
                background: showTypographyMenu ? (isDark ? "rgba(245,158,11,0.15)" : "rgba(254,243,199,0.8)") : bgInput,
                color: showTypographyMenu ? "#f59e0b" : textMain,
              }}
            >
              <IcoType size={14} />
              <span className="hidden sm:inline">Appearance</span>
            </button>

            {showTypographyMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-72 p-4 rounded-2xl border shadow-xl backdrop-blur-xl z-50 animate-scaleUp text-xs flex flex-col gap-3.5"
                style={{
                  background: isAmoled ? "rgba(10, 10, 12, 0.98)" : isDark ? "rgba(17, 24, 39, 0.98)" : "rgba(255, 255, 255, 0.98)",
                  borderColor: border,
                  color: textMain,
                }}
              >
                <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: border }}>
                  <span className="font-bold text-xs">Reading Settings</span>
                  <button
                    onClick={() => setShowTypographyMenu(false)}
                    className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Font Family */}
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5" style={{ color: textMut }}>
                    Font Family
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "serif", label: "Serif", font: "font-serif" },
                      { id: "sans", label: "Sans", font: "font-sans" },
                      { id: "mono", label: "Mono", font: "font-mono" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => updateTypography({ fontFamily: f.id as any })}
                        className={`py-1.5 rounded-lg border text-center font-medium transition-all cursor-pointer ${f.font} ${
                          typography.fontFamily === f.id
                            ? "border-amber-500 bg-amber-500/15 text-amber-500 font-bold"
                            : "hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                        style={{ borderColor: typography.fontFamily === f.id ? "#f59e0b" : border }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5" style={{ color: textMut }}>
                    Font Size
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { id: "sm", label: "S" },
                      { id: "base", label: "M" },
                      { id: "lg", label: "L" },
                      { id: "xl", label: "XL" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => updateTypography({ fontSize: s.id as any })}
                        className={`py-1 rounded-lg border text-center font-bold transition-all cursor-pointer ${
                          typography.fontSize === s.id
                            ? "border-amber-500 bg-amber-500/15 text-amber-500"
                            : "hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                        style={{ borderColor: typography.fontSize === s.id ? "#f59e0b" : border }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Width */}
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5" style={{ color: textMut }}>
                    Column Width
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "compact", label: "Compact" },
                      { id: "normal", label: "Standard" },
                      { id: "wide", label: "Wide" },
                    ].map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => updateTypography({ contentWidth: w.id as any })}
                        className={`py-1.5 rounded-lg border text-center font-medium transition-all cursor-pointer ${
                          typography.contentWidth === w.id
                            ? "border-amber-500 bg-amber-500/15 text-amber-500 font-bold"
                            : "hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                        style={{ borderColor: typography.contentWidth === w.id ? "#f59e0b" : border }}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Line Spacing */}
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5" style={{ color: textMut }}>
                    Line Spacing
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "normal", label: "Compact" },
                      { id: "relaxed", label: "Standard" },
                      { id: "loose", label: "Loose" },
                    ].map((lh) => (
                      <button
                        key={lh.id}
                        type="button"
                        onClick={() => updateTypography({ lineHeight: lh.id as any })}
                        className={`py-1.5 rounded-lg border text-center font-medium transition-all cursor-pointer ${
                          typography.lineHeight === lh.id
                            ? "border-amber-500 bg-amber-500/15 text-amber-500 font-bold"
                            : "hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                        style={{ borderColor: typography.lineHeight === lh.id ? "#f59e0b" : border }}
                      >
                        {lh.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pitch & Volume Sliders */}
                <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: border }}>
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold mb-1" style={{ color: textMut }}>
                      <span>Voice Pitch</span>
                      <span className="font-mono">{ttsPitch}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={1.5}
                      step={0.1}
                      value={ttsPitch}
                      onChange={(e) => setTtsPitch(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold mb-1" style={{ color: textMut }}>
                      <span>Volume</span>
                      <span className="font-mono">{Math.round(ttsVolume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={ttsVolume}
                      onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TTS Reading Controls (Play/Pause/Resume, Stop, Speed) */}
          {hasDocument && (
            <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-1.5 py-1 rounded-xl shadow-2xs">
              {/* Play / Pause Toggle Button */}
              <button
                type="button"
                onClick={pauseTts}
                title={
                  ttsState === "playing"
                    ? "Pause Narration (Space)"
                    : ttsState === "paused"
                    ? "Resume Narration (Space)"
                    : activePara >= 0
                    ? `Resume Narration at Para ${activePara + 1} (Space)`
                    : "Start Narration (Space)"
                }
                className={`p-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                  ttsState === "playing"
                    ? "bg-amber-500 text-white shadow-xs scale-105"
                    : ttsState === "paused"
                    ? "bg-amber-500/20 text-amber-500 border border-amber-500/50 ring-1 ring-amber-500/30"
                    : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 hover:scale-105"
                }`}
              >
                {ttsState === "playing" ? <IcoPause size={13} /> : <IcoPlay size={13} />}
              </button>

              {/* Stop Narration */}
              {ttsState !== "idle" && (
                <button
                  type="button"
                  onClick={() => stopTts()}
                  title="Stop Narration (Escape)"
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  <IcoStop size={13} />
                </button>
              )}

              {/* Speed Button */}
              <button
                type="button"
                onClick={() => {
                  const rates = [1, 1.25, 1.5, 1.75, 2];
                  const nextIdx = (rates.indexOf(ttsRate) + 1) % rates.length;
                  setTtsRate(rates[nextIdx >= 0 ? nextIdx : 0]);
                }}
                title="Playback speed"
                className="text-[11px] font-bold text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded hover:bg-amber-500/20 transition-colors cursor-pointer"
              >
                {ttsRate}x
              </button>
            </div>
          )}

          {/* Voice Selector */}
          <button
            type="button"
            onClick={() => setShowVoiceModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:scale-105 active:scale-95 cursor-pointer"
            style={{ borderColor: border, background: bgInput, color: textMain }}
          >
            <span>🎙️</span>
            <span className="max-w-[100px] truncate">{selectedVoice ? selectedVoice.split(" ")[0] : "Voice"}</span>
          </button>

          {/* Search Trigger */}
          {hasDocument && (
            <button
              onClick={() => (isSearchOpen ? onCloseSearch?.() : onOpenSearch?.())}
              title="Search in document (Ctrl+F)"
              className="p-1.5 rounded-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                borderColor: isSearchOpen ? "#f59e0b" : border,
                background: isSearchOpen ? "rgba(245,158,11,0.15)" : bgInput,
                color: isSearchOpen ? "#f59e0b" : textMut,
              }}
            >
              <IcoSearch size={15} />
            </button>
          )}

          {/* Markdown Export */}
          {hasDocument && onExportMarkdown && (
            <button
              onClick={onExportMarkdown}
              title="Export formatted Markdown"
              className="p-1.5 rounded-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer text-amber-500"
              style={{ borderColor: border, background: bgInput }}
            >
              <IcoMarkdown size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Floating Document Search Bar */}
      {isSearchOpen && (
        <SearchBar
          isOpen={isSearchOpen}
          onClose={onCloseSearch || (() => {})}
          query={searchQuery}
          onQueryChange={setSearchQuery || (() => {})}
          isSearching={isSearching}
          totalMatches={totalMatches}
          activeMatchIndex={activeMatchIndex}
          onNextMatch={onNextMatch || (() => {})}
          onPrevMatch={onPrevMatch || (() => {})}
          options={searchOptions}
          onToggleMatchCase={onToggleMatchCase || (() => {})}
          onToggleWholeWord={onToggleWholeWord || (() => {})}
        />
      )}

      {/* Main Document Reading Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10 flex flex-col items-center custom-scrollbar"
      >
        {isContentGenerating && paragraphs.length === 0 ? (
          /* High-Craft Loading Skeleton State */
          <div className={`w-full ${maxWidthClass} transition-all duration-200 animate-fadeIn`}>
            {/* Header Skeleton Card */}
            <div className="mb-8 pb-6 border-b" style={{ borderColor: border }}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    {sourceMode === "web"
                      ? "Fetching & Ingesting Article..."
                      : isExtractingMarkdown
                      ? "Generating Document Markdown..."
                      : "Formatting Document Content..."}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Preparing Reader
                </span>
              </div>

              {/* Title Skeleton */}
              <div className="h-8 sm:h-10 w-4/5 rounded-xl bg-black/10 dark:bg-white/10 animate-pulse mb-4" />

              {/* Meta Pill Skeletons */}
              <div className="flex items-center gap-3">
                <div className="h-3.5 w-24 rounded-md bg-black/10 dark:bg-white/10 animate-pulse" />
                <div className="h-3.5 w-16 rounded-md bg-black/10 dark:bg-white/10 animate-pulse" />
                <div className="h-3.5 w-28 rounded-md bg-black/10 dark:bg-white/10 animate-pulse" />
              </div>
            </div>

            {/* Paragraph Shimmer Skeletons */}
            <div className="flex flex-col gap-4">
              {[
                [100, 96, 92, 68],
                [98, 94, 90, 85, 45],
                [95, 98, 92, 70],
                [100, 92, 88, 55],
                [96, 94, 91, 80, 40],
              ].map((lines, pIdx) => (
                <div
                  key={pIdx}
                  className="p-5 sm:p-6 rounded-2xl border transition-all"
                  style={{
                    borderColor: isAmoled ? "#1a1a20" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                    background: isAmoled ? "#070709" : isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.7)",
                  }}
                >
                  {/* Paragraph gutter action bar placeholder */}
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-amber-500/20 animate-pulse" />
                      <div className="h-3 w-16 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
                    </div>
                    <div className="h-3 w-12 rounded bg-black/10 dark:bg-white/10 animate-pulse" />
                  </div>

                  {/* Skeleton lines */}
                  <div className="flex flex-col gap-2.5">
                    {lines.map((widthPct, lIdx) => (
                      <div
                        key={lIdx}
                        className="h-4 rounded-md bg-black/10 dark:bg-white/10 animate-pulse"
                        style={{
                          width: `${widthPct}%`,
                          animationDelay: `${pIdx * 120 + lIdx * 40}ms`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : hasDocument ? (
          <article className={`w-full ${maxWidthClass} transition-all duration-200`}>
            {/* Header Title Section */}
            <div className="mb-8 pb-6 border-b" style={{ borderColor: border }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-500">
                  {sourceMode === "web" ? <IcoGlobe size={16} /> : <IcoFile size={16} />}
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  {sourceMode === "web" ? "Web Article" : "Document"}
                </span>
              </div>

              <h1
                className={`text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-3 ${fontFamilyClass}`}
                style={{ color: textMain }}
              >
                {docTitle || "Untitled Document"}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: textMut }}>
                <span>{paragraphs.length} paragraphs</span>
                <span>•</span>
                <span>{totalWords.toLocaleString()} words</span>
                <span>•</span>
                <span>~{estReadMinutes} min reading time</span>
                {ttsState === "playing" ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Reading Active {activePara >= 0 ? `(Para ${activePara + 1})` : ""}</span>
                  </span>
                ) : ttsState === "paused" && activePara >= 0 ? (
                  <span className="inline-flex items-center gap-1.5 font-bold text-amber-500">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Paused at Para {activePara + 1}</span>
                  </span>
                ) : activePara >= 0 ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                    <span>Last Read Location: Para {activePara + 1}</span>
                  </span>
                ) : null}
              </div>
            </div>

            {/* Paragraphs List with Left-Gutter Controls and Live Spoken Word Highlighting */}
            <div className="flex flex-col gap-3">
              {paragraphs.map((p, idx) => {
                const isActive = activePara === idx;
                const isMatch =
                  Boolean(searchMatches) &&
                  searchMatches.some(
                    (m) => m.paragraphIndex === idx && m.globalIndex === activeMatchIndex
                  );
                const isPageBreak = pageBreakIndices.includes(idx);
                const pageNum = pageNumberMap[idx];

                return (
                  <Fragment key={idx}>
                    {isPageBreak && (
                      <div
                        className="relative my-8 flex items-center justify-center select-none"
                        aria-hidden="true"
                      >
                        <hr className="w-full border-t" style={{ borderColor: border }} />
                        {pageNum ? (
                          <div
                            className="absolute px-3 py-0.5 text-[10px] font-bold tracking-widest uppercase rounded-full border shadow-2xs flex items-center gap-1.5"
                            style={{
                              background: isAmoled ? "#000000" : isDark ? "#0f172a" : "#ffffff",
                              borderColor: border,
                              color: textMut,
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80" />
                            <span>Page {pageNum}</span>
                          </div>
                        ) : null}
                      </div>
                    )}
                    <ReaderParagraph
                      index={idx}
                      text={p}
                      isActive={isActive}
                      ttsState={ttsState}
                      activeCharOffset={isActive ? activeCharOffset : 0}
                      paraProgress={isActive ? paraProgress : 0}
                      onPlay={startReading}
                      onPause={pauseTts}
                      onSeek={seekTo}
                      isDark={isDark}
                      isAmoled={isAmoled}
                      textMain={textMain}
                      textMut={textMut}
                      fontSizeClass={fontSizeClass}
                      fontFamilyClass={fontFamilyClass}
                      lineHeightClass={lineHeightClass}
                      isMatch={isMatch}
                    />
                  </Fragment>
                );
              })}
            </div>

            {/* End of Document Section */}
            <div className="mt-12 pt-8 border-t flex flex-col items-center gap-2 text-center" style={{ borderColor: border }}>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <IcoBookOpen size={14} />
                <span>End of Document</span>
              </div>
              <p className="text-xs" style={{ color: textMut }}>
                Full document loaded ({paragraphs.length} paragraphs • {totalWords.toLocaleString()} words)
              </p>
            </div>
          </article>
        ) : (
          /* Empty State Desk */
          <div className="flex flex-col items-center justify-center max-w-xl w-full my-auto py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-gradient-to-tr from-amber-500/20 to-amber-400/20 text-amber-500 shadow-inner">
              <IcoBookOpen size={30} />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2" style={{ color: textMain }}>
              Reader Sanctuary
            </h2>
            <p className="text-sm mb-8" style={{ color: textMut }}>
              Drop a PDF or document to experience distraction-free reading with synchronized voice narration and live word-level tracking.
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-8 rounded-2xl border-2 border-dashed transition-all hover:border-amber-500 cursor-pointer mb-6"
              style={{
                borderColor: isAmoled ? "#27272a" : isDark ? "#374151" : "#d1d5db",
                background: isAmoled ? "rgba(255,255,255,0.02)" : isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.8)",
              }}
            >
              <div className="flex flex-col items-center gap-3">
                <IcoUpload size={24} />
                <span className="text-sm font-bold" style={{ color: textMain }}>Choose Document</span>
                <span className="text-xs" style={{ color: textMut }}>PDF, DOCX, EPUB, TXT</span>
              </div>
            </div>

            {onLoadSample && (
              <button
                type="button"
                onClick={onLoadSample}
                className="px-4 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer"
                style={{ borderColor: border, background: bgInput, color: textMain }}
              >
                Load Sample Guide ✨
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Floating Reader Player Dock */}
      {hasDocument && paragraphs.length > 0 && (
        <div
          className="shrink-0 sticky bottom-0 z-30 px-3 sm:px-6 py-2.5 sm:py-3 border-t backdrop-blur-xl transition-all select-none"
          style={{
            borderColor: border,
            background: isAmoled
              ? "rgba(0, 0, 0, 0.94)"
              : isDark
              ? "rgba(15, 23, 42, 0.92)"
              : "rgba(255, 255, 255, 0.95)",
            boxShadow: isDark
              ? "0 -4px 24px rgba(0, 0, 0, 0.4)"
              : "0 -4px 20px rgba(0, 0, 0, 0.06)",
          }}
        >
          {/* Top subtle reading progress line across the document */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-black/5 dark:bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300 ease-out"
              style={{
                width: `${
                  paragraphs.length > 0
                    ? Math.round(
                        ((Math.max(0, activePara) + (ttsState !== "idle" ? paraProgress : 0)) /
                          paragraphs.length) *
                          100
                      )
                    : 0
                }%`,
              }}
            />
          </div>

          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
            {/* Left: Paragraph info and active snippet */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => {
                  if (activePara >= 0 && containerRef.current) {
                    const el = containerRef.current.querySelector<HTMLElement>(`[data-para="${activePara}"]`);
                    el?.scrollIntoView({ block: "center", behavior: "smooth" });
                  }
                }}
                title="Scroll to active paragraph"
                className="flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs font-semibold hover:border-amber-500/50 transition-all cursor-pointer truncate shadow-2xs"
                style={{ borderColor: border, background: bgInput, color: textMain }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background:
                      ttsState === "playing"
                        ? "#22c55e"
                        : ttsState === "paused"
                        ? "#f59e0b"
                        : activePara >= 0
                        ? "#f59e0b"
                        : textMut,
                    boxShadow: ttsState === "playing" ? "0 0 8px #22c55e" : undefined,
                  }}
                />
                <span className="font-mono text-[11px] whitespace-nowrap">
                  {activePara >= 0 ? `Para ${activePara + 1} / ${paragraphs.length}` : `Ready (${paragraphs.length} paras)`}
                </span>
              </button>

              {/* Active paragraph preview snippet */}
              {activePara >= 0 && paragraphs[activePara] && (
                <span
                  className="hidden md:inline-block text-xs truncate max-w-[200px] lg:max-w-[340px] italic opacity-80"
                  style={{ color: textMut }}
                  title={paragraphs[activePara]}
                >
                  "{paragraphs[activePara]}"
                </span>
              )}
            </div>

            {/* Center: Main Playback & Paragraph Skip Controls */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Skip to Previous Paragraph */}
              <button
                type="button"
                onClick={onPrevPara}
                disabled={activePara <= 0}
                title="Previous Paragraph (Alt+Up or [)"
                aria-label="Skip to previous paragraph"
                className="p-2 sm:p-2.5 rounded-full border transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-2xs"
                style={{
                  borderColor: border,
                  background: bgInput,
                  color: textMain,
                }}
              >
                <IcoSkipBack size={15} />
              </button>

              {/* Main Play / Pause Button */}
              <button
                type="button"
                onClick={handleBottomPlayPause}
                title={
                  ttsState === "playing"
                    ? "Pause Narration (Space)"
                    : ttsState === "paused"
                    ? "Resume Narration (Space)"
                    : activePara >= 0
                    ? `Resume Narration at Para ${activePara + 1} (Space)`
                    : "Start Narration (Space)"
                }
                aria-label={ttsState === "playing" ? "Pause reading" : "Play reading"}
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md ${
                  ttsState === "playing"
                    ? "bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-amber-500/25 scale-105"
                    : ttsState === "paused"
                    ? "bg-amber-500/20 text-amber-500 border border-amber-500/60 ring-2 ring-amber-500/20 hover:bg-amber-500 hover:text-white"
                    : "bg-amber-500 text-white hover:bg-amber-600 hover:scale-105 shadow-amber-500/20"
                }`}
              >
                {ttsState === "playing" ? (
                  <IcoPause size={17} />
                ) : (
                  <span className="ml-0.5">
                    <IcoPlay size={16} />
                  </span>
                )}
              </button>

              {/* Skip to Next Paragraph */}
              <button
                type="button"
                onClick={onNextPara}
                disabled={activePara >= paragraphs.length - 1}
                title="Next Paragraph (Alt+Down or ])"
                aria-label="Skip to next paragraph"
                className="p-2 sm:p-2.5 rounded-full border transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer shadow-2xs"
                style={{
                  borderColor: border,
                  background: bgInput,
                  color: textMain,
                }}
              >
                <IcoSkipForward size={15} />
              </button>
            </div>

            {/* Right: Volume, Speed & Stop Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Real-time Volume Control Widget */}
              <div className="relative flex items-center">
                {/* Desktop / Tablet: Inline Volume Pill */}
                <div
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border transition-all shadow-2xs group hover:border-amber-500/40"
                  style={{ borderColor: border, background: bgInput, color: textMain }}
                >
                  <button
                    type="button"
                    onClick={toggleMute}
                    title={ttsVolume === 0 ? "Unmute (Click)" : "Mute (Click)"}
                    aria-label={ttsVolume === 0 ? "Unmute narration" : "Mute narration"}
                    className="cursor-pointer text-amber-600 dark:text-amber-400 hover:scale-110 active:scale-95 transition-transform"
                  >
                    {ttsVolume === 0 ? (
                      <IcoVolumeX size={15} />
                    ) : ttsVolume < 0.5 ? (
                      <IcoVolume1 size={15} />
                    ) : (
                      <IcoVolume size={15} />
                    )}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={ttsVolume}
                    onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                    title={`Volume: ${Math.round(ttsVolume * 100)}%`}
                    aria-label="Narration volume"
                    className="w-16 sm:w-20 lg:w-24 h-1.5 accent-amber-500 rounded-lg cursor-pointer bg-black/10 dark:bg-white/15"
                  />

                  <span className="font-mono text-[10px] w-7 text-right select-none opacity-80" style={{ color: textMut }}>
                    {Math.round(ttsVolume * 100)}%
                  </span>
                </div>

                {/* Mobile / Small Screen: Popover Volume Button */}
                <div className="relative md:hidden">
                  <button
                    type="button"
                    onClick={() => setShowVolumePopover((v) => !v)}
                    title={`Volume: ${Math.round(ttsVolume * 100)}%`}
                    aria-label="Adjust narration volume"
                    className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer shadow-2xs ${
                      showVolumePopover || ttsVolume === 0
                        ? "border-amber-500 bg-amber-500/15 text-amber-500"
                        : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                    }`}
                    style={{ borderColor: showVolumePopover ? "#f59e0b" : border, background: bgInput }}
                  >
                    {ttsVolume === 0 ? (
                      <IcoVolumeX size={14} />
                    ) : ttsVolume < 0.5 ? (
                      <IcoVolume1 size={14} />
                    ) : (
                      <IcoVolume size={14} />
                    )}
                  </button>

                  {/* Popover slider on mobile */}
                  {showVolumePopover && (
                    <div
                      className="absolute bottom-full right-0 mb-2 p-3 rounded-2xl border shadow-xl backdrop-blur-xl z-50 flex flex-col items-center gap-2 animate-scaleUp"
                      style={{
                        background: isAmoled
                          ? "rgba(10, 10, 12, 0.98)"
                          : isDark
                          ? "rgba(17, 24, 39, 0.98)"
                          : "rgba(255, 255, 255, 0.98)",
                        borderColor: border,
                        color: textMain,
                      }}
                    >
                      <div className="flex items-center justify-between w-full gap-3 text-xs font-semibold">
                        <span className="text-[11px]" style={{ color: textMut }}>Volume</span>
                        <span className="font-mono text-amber-500 font-bold">{Math.round(ttsVolume * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={toggleMute}
                          className="p-1 text-amber-500 hover:bg-amber-500/10 rounded-lg cursor-pointer"
                        >
                          {ttsVolume === 0 ? <IcoVolumeX size={14} /> : <IcoVolume size={14} />}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={ttsVolume}
                          onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                          className="w-28 h-1.5 accent-amber-500 rounded-lg cursor-pointer bg-black/10 dark:bg-white/15"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Speed Cycler Button */}
              <button
                type="button"
                onClick={() => {
                  const rates = [1, 1.25, 1.5, 1.75, 2];
                  const nextIdx = (rates.indexOf(ttsRate) + 1) % rates.length;
                  setTtsRate(rates[nextIdx >= 0 ? nextIdx : 0]);
                }}
                title="Playback speed"
                className="px-2.5 py-1 rounded-xl text-xs font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs"
                style={{
                  borderColor: border,
                  background: bgInput,
                  color: ttsState === "playing" ? "#f59e0b" : textMain,
                }}
              >
                <span>{ttsRate}x</span>
              </button>

              {/* Stop button when active */}
              {ttsState !== "idle" && (
                <button
                  type="button"
                  onClick={() => stopTts()}
                  title="Stop Narration (Escape)"
                  aria-label="Stop narration"
                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/15 border border-rose-500/20 transition-all active:scale-95 cursor-pointer shadow-2xs"
                >
                  <IcoStop size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reader AI Architecture Slot (Hidden for now, ready for future AI capabilities) */}
      <ReaderAiPlaceholder
        docTitle={docTitle}
        markdown={docMarkdown}
        sourceMode={sourceMode}
        isVisible={false}
      />

      {/* Voice Selection Modal */}
      <TtsVoiceModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        voices={voices}
        selectedVoice={selectedVoice}
        onSelectVoice={setSelectedVoice}
        ttsRate={ttsRate}
        ttsPitch={ttsPitch}
        ttsVolume={ttsVolume}
      />
    </main>
  );
};
export default ReaderModeView;
