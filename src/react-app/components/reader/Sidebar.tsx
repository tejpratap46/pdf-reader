import { FC, RefObject, ChangeEvent, DragEvent } from "react";
import { SourceMode, TtsState } from "../../types/reader";
import { useDark } from "../../hooks/useTheme";
import { Divider, SectionTitle, IconBtn, SwitchRow, SliderRow } from "../common/Primitives";
import { WebPanel } from "./WebPanel";
import { HFCard } from "./HFCard";
import { Waveform } from "../common/Waveform";
import { SeekBar } from "../common/SeekBar";
import { SidebarResizer } from "./SidebarResizer";
import { TtsVoiceSelector } from "./TtsVoiceSelector";
import {
  IcoFile,
  IcoGlobe,
  IcoUpload,
  IcoEdit,
  IcoPlay,
  IcoPause,
  IcoStop,
  IcoChevL,
} from "../common/Icons";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen?: (open: boolean | ((prev: boolean) => boolean)) => void;
  sidebarWidth?: number;
  isDragging?: boolean;
  onResizeMouseDown?: (e: React.MouseEvent) => void;
  onResizeTouchStart?: (e: React.TouchEvent) => void;
  onResetWidth?: () => void;
  sourceMode: SourceMode;
  setSourceMode: (m: SourceMode) => void;
  pdfReady: boolean;
  pdfDoc: any;
  pdfBytes: Uint8Array | null;
  setIsEditorOpen: (v: boolean) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFile: (file?: File) => void;
  localDrag: boolean;
  setLocalDrag: (v: boolean) => void;

  // Web props
  fetchWebPage: (url: string) => void;
  webLoading: boolean;
  webLoaded: boolean;
  webTitle: string;
  webError: string;
  clearWeb: () => void;

  // TTS props
  hasContent: boolean;
  ttsState: TtsState;
  startReading: (i: number) => void;
  pauseTts: () => void;
  stopTts: (u?: boolean) => void;
  voices: SpeechSynthesisVoice[];
  selectedVoice: string;
  setSelectedVoice: (v: string) => void;
  ttsRate: number;
  setTtsRate: (r: number) => void;
  ttsPitch: number;
  setTtsPitch: (p: number) => void;
  ttsVolume: number;
  setTtsVolume: (v: number) => void;
  autoNextPage: boolean;
  setAutoNextPage: (v: boolean) => void;

  // Header/Footer props
  headerText: string;
  readHeader: boolean;
  setReadHeader: (v: boolean) => void;
  headerPct: number;
  setHeaderPct: (v: number) => void;
  footerText: string;
  readFooter: boolean;
  setReadFooter: (v: boolean) => void;
  footerPct: number;
  setFooterPct: (v: number) => void;

  // Paragraph list props
  paragraphs: string[];
  activePara: number;
  paraProgress: number;
  seekTo: (pi: number, ratio: number) => void;
  paraListRef: RefObject<HTMLDivElement | null>;

  // Style tokens
  border: string;
  bgSide: string;
  bgInput: string;
  bgHover: string;
  textMain: string;
  textMut: string;
}

export const Sidebar: FC<SidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  sidebarWidth = 320,
  isDragging = false,
  onResizeMouseDown,
  onResizeTouchStart,
  onResetWidth,
  sourceMode,
  setSourceMode,
  pdfReady,
  pdfDoc,
  pdfBytes,
  setIsEditorOpen,
  fileInputRef,
  handleFile,
  localDrag,
  setLocalDrag,
  fetchWebPage,
  webLoading,
  webLoaded,
  webTitle,
  webError,
  clearWeb,
  hasContent,
  ttsState,
  startReading,
  pauseTts,
  stopTts,
  voices,
  selectedVoice,
  setSelectedVoice,
  ttsRate,
  setTtsRate,
  ttsPitch,
  setTtsPitch,
  ttsVolume,
  setTtsVolume,
  autoNextPage,
  setAutoNextPage,
  headerText,
  readHeader,
  setReadHeader,
  headerPct,
  setHeaderPct,
  footerText,
  readFooter,
  setReadFooter,
  footerPct,
  setFooterPct,
  paragraphs,
  activePara,
  paraProgress,
  seekTo,
  paraListRef,
  border,
  bgSide,
  bgInput,
  bgHover,
  textMain,
  textMut,
}) => {
  const d = useDark();

  return (
    <aside
      className={`relative flex flex-col shrink-0 overflow-hidden ${
        isDragging ? "" : "transition-[width] duration-300 ease-out"
      }`}
      style={{
        width: sidebarOpen ? sidebarWidth : 0,
        borderRight: sidebarOpen ? `1px solid ${border}` : "none",
        background: bgSide,
      }}
    >
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col"
        style={{
          width: Math.max(240, sidebarWidth),
          minWidth: 240,
        }}
      >
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          {/* Source tabs & Collapse Button */}
          <div className="flex items-center gap-2">
            <div
              className="flex-1 flex rounded-none p-0.5 gap-0.5 border"
              style={{ background: bgInput, borderColor: border }}
            >
              {(["pdf", "web"] as SourceMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setSourceMode(m)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-none text-xs font-semibold transition-colors cursor-pointer border"
                  style={
                    sourceMode === m
                      ? {
                          background: d ? "#27272a" : "#ffffff",
                          color: "#f59e0b",
                          borderColor: border,
                        }
                      : { background: "transparent", color: textMut, borderColor: "transparent" }
                  }
                >
                  {m === "pdf" ? (
                    <>
                      <IcoFile size={13} /> PDF &amp; Docs
                    </>
                  ) : (
                    <>
                      <IcoGlobe size={13} /> Web Article
                    </>
                  )}
                </button>
              ))}
            </div>
            {setSidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                title="Collapse sidebar (Ctrl+B)"
                className="p-1.5 rounded-none transition-colors cursor-pointer shrink-0 border"
                style={{ color: textMut, borderColor: border, background: bgInput }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = bgHover;
                  (e.currentTarget as HTMLElement).style.color = textMain;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = bgInput;
                  (e.currentTarget as HTMLElement).style.color = textMut;
                }}
              >
                <IcoChevL size={15} />
              </button>
            )}
          </div>

          {/* PDF panel */}
          {sourceMode === "pdf" && (
            <div className="flex flex-col gap-2.5">
              <SectionTitle>Document File</SectionTitle>
              <div
                className="rounded-none border-2 border-dashed p-4 text-center cursor-pointer transition-colors group"
                style={{
                  borderColor: localDrag ? "#f59e0b" : d ? "#374151" : "#d1d5db",
                  background: localDrag
                    ? d
                      ? "rgba(245,158,11,0.08)"
                      : "rgba(254,243,199,0.6)"
                    : d
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(255,255,255,0.6)",
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e: DragEvent) => {
                  e.preventDefault();
                  setLocalDrag(true);
                }}
                onDragLeave={() => setLocalDrag(false)}
                onDrop={(e: DragEvent) => {
                  e.preventDefault();
                  setLocalDrag(false);
                  handleFile(e.dataTransfer.files[0]);
                }}
              >
                <div
                  className="w-10 h-10 rounded-none border mx-auto mb-2 flex items-center justify-center transition-colors"
                  style={{
                    borderColor: border,
                    background: d ? "rgba(245,158,11,0.12)" : "rgba(254,243,199,0.8)",
                    color: "#f59e0b",
                  }}
                >
                  <IcoUpload size={18} />
                </div>
                <p className="text-xs font-semibold leading-relaxed" style={{ color: textMain }}>
                  {pdfReady ? "Drop document or browse" : "Loading PDF engine…"}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1 mt-1.5">
                  {["PDF", "DOCX", "EPUB", "XLSX", "CSV"].map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-none border"
                      style={{
                        background: d ? "#1f2937" : "#f1f5f9",
                        borderColor: border,
                        color: textMut,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {pdfBytes && pdfDoc && (
                <button
                  onClick={() => setIsEditorOpen(true)}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-none bg-amber-500 hover:bg-amber-600 border border-amber-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <IcoEdit size={13} />
                  <span>[ OPEN PDF STUDIO ]</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.epub,.odt,.rtf,.xlsx,.ods,.odp,.csv"
                className="hidden"
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleFile(e.target.files?.[0])}
              />
            </div>
          )}

          {/* Web panel */}
          {sourceMode === "web" && (
            <WebPanel
              onLoad={fetchWebPage}
              loading={webLoading}
              loaded={webLoaded}
              title={webTitle}
              error={webError}
              onClear={clearWeb}
            />
          )}

          <Divider />

          {/* TTS Controls */}
          <div className="flex flex-col gap-3">
            <SectionTitle>Text-to-Speech Studio</SectionTitle>

            {/* Main Audio Action Bar */}
            <div className="flex gap-2">
              <button
                disabled={!hasContent}
                onClick={ttsState === "idle" ? () => startReading(0) : pauseTts}
                title={
                  ttsState === "playing"
                    ? "Pause Narration (Space)"
                    : ttsState === "paused"
                    ? "Resume Reading (Space)"
                    : "Start Reading (Space)"
                }
                className="flex-1 flex items-center justify-center gap-2 rounded-none py-2 px-4 text-xs font-bold tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-white border shadow-xs cursor-pointer"
                style={{
                  background:
                    ttsState === "playing"
                      ? "#059669"
                      : ttsState === "paused"
                      ? "#f59e0b"
                      : "#f59e0b",
                  borderColor:
                    ttsState === "playing"
                      ? "#047857"
                      : "#d97706",
                }}
              >
                {ttsState === "paused" ? (
                  <>
                    <IcoPlay size={14} /> Resume Reading
                  </>
                ) : ttsState === "playing" ? (
                  <>
                    <IcoPause size={14} /> Pause Narration
                  </>
                ) : (
                  <>
                    <IcoPlay size={14} /> Read {sourceMode === "web" ? "Article" : "Document"}
                  </>
                )}
              </button>

              <IconBtn
                onClick={() => stopTts(true)}
                disabled={ttsState === "idle"}
                title="Stop Narration"
              >
                <IcoStop size={15} />
              </IconBtn>
            </div>

            {/* Voice Selector Card */}
            <TtsVoiceSelector
              voices={voices}
              selectedVoice={selectedVoice}
              onSelectVoice={setSelectedVoice}
              ttsRate={ttsRate}
              ttsPitch={ttsPitch}
              ttsVolume={ttsVolume}
              border={border}
              bgInput={bgInput}
              bgHover={bgHover}
              textMain={textMain}
              textMut={textMut}
            />

            {/* Audio Modulation Sliders */}
            <div className="flex flex-col gap-2.5 pt-1">
              <SliderRow
                label="Volume"
                value={ttsVolume}
                min={0}
                max={1}
                step={0.05}
                onChange={setTtsVolume}
                display={`${Math.round(ttsVolume * 100)}%`}
                disabled={ttsState === "playing"}
              />
              <SliderRow
                label="Speed Rate"
                value={ttsRate}
                min={0.5}
                max={2}
                step={0.1}
                onChange={setTtsRate}
                display={`${ttsRate.toFixed(1)}×`}
                disabled={ttsState === "playing"}
              />
              <SliderRow
                label="Pitch"
                value={ttsPitch}
                min={0.5}
                max={2}
                step={0.1}
                onChange={setTtsPitch}
                display={ttsPitch.toFixed(1)}
                disabled={ttsState === "playing"}
              />
            </div>
          </div>

          <Divider />

          {/* Playback Automation */}
          <div className="flex flex-col gap-2">
            <SectionTitle>Playback Automation</SectionTitle>
            <SwitchRow
              id="auto-next"
              label="Auto-advance pages"
              checked={autoNextPage}
              onCheckedChange={setAutoNextPage}
              description="Automatically turn to the next page when narration completes"
            />
          </div>

          {/* PDF-only: Header & Footer exclusions */}
          {sourceMode === "pdf" && (
            <>
              <Divider />
              <div className="flex flex-col gap-2.5">
                <SectionTitle>Header &amp; Footer Zones</SectionTitle>
                <HFCard
                  zone="Header"
                  text={headerText}
                  checked={readHeader}
                  onCheckedChange={setReadHeader}
                  pct={headerPct}
                  onPct={setHeaderPct}
                />
                <HFCard
                  zone="Footer"
                  text={footerText}
                  checked={readFooter}
                  onCheckedChange={setReadFooter}
                  pct={footerPct}
                  onPct={setFooterPct}
                />
                {!headerText && !footerText && pdfDoc && (
                  <p className="text-[11px] text-center italic" style={{ color: textMut }}>
                    No recurring header or footer detected
                  </p>
                )}
              </div>
            </>
          )}

          {/* Paragraph list */}
          {hasContent && (
            <>
              <Divider />
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <SectionTitle>
                    {sourceMode === "web" ? "Article" : "Page"} Content
                  </SectionTitle>
                  <span
                    className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-none border"
                    style={{ background: bgInput, borderColor: border, color: textMut }}
                  >
                    {paragraphs.length} paragraphs
                  </span>
                </div>

                <div ref={paraListRef} className="flex flex-col gap-1 mt-1">
                  {paragraphs.map((p, i) => {
                    const active = activePara === i;
                    return (
                      <div
                        key={i}
                        data-para={i}
                        className={`w-full text-left px-3 py-2.5 rounded-none text-xs leading-relaxed transition-colors cursor-pointer border-l-2 border-r border-t border-b ${
                          active ? "shadow-xs" : ""
                        }`}
                        style={{
                          borderLeftColor: active ? "#f59e0b" : "transparent",
                          borderTopColor: active ? (d ? "#374151" : "#e2e8f0") : "transparent",
                          borderRightColor: active ? (d ? "#374151" : "#e2e8f0") : "transparent",
                          borderBottomColor: active ? (d ? "#374151" : "#e2e8f0") : "transparent",
                          color: active ? textMain : textMut,
                          background: active
                            ? d
                              ? "rgba(245,158,11,0.12)"
                              : "rgba(254,243,199,0.75)"
                            : "transparent",
                        }}
                        onClick={() => !active && startReading(i)}
                        onMouseEnter={(e) => {
                          if (!active) (e.currentTarget as HTMLElement).style.background = bgHover;
                        }}
                        onMouseLeave={(e) => {
                          if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                      >
                        {active && (
                          <span className="flex items-center gap-2 mb-1.5">
                            <Waveform paused={ttsState === "paused"} />
                            <span className="text-[9px] font-mono text-amber-500 font-bold tracking-widest uppercase">
                              {ttsState === "paused" ? "[ PAUSED ]" : "[ NOW READING ]"}
                            </span>
                          </span>
                        )}
                        <span className="line-clamp-4">{p}</span>
                        {active && (
                          <SeekBar
                            progress={paraProgress}
                            ttsState={ttsState}
                            onSeek={(r) => seekTo(i, r)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Resize Handle */}
      {sidebarOpen && onResizeMouseDown && onResizeTouchStart && (
        <SidebarResizer
          onMouseDown={onResizeMouseDown}
          onTouchStart={onResizeTouchStart}
          onDoubleClick={onResetWidth}
          isDragging={!!isDragging}
          currentWidth={sidebarWidth}
        />
      )}
    </aside>
  );
};

