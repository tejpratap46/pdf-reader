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
  IcoVolume,
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
        <div className="flex flex-col gap-5 p-5">
          {/* Source tabs & Collapse Button */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex rounded-lg p-0.5 gap-0.5" style={{ background: d ? "#1f2937" : "#f3f4f6" }}>
              {(["pdf", "web"] as SourceMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setSourceMode(m)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer"
                  style={
                    sourceMode === m
                      ? { background: d ? "#111827" : "#fff", color: "#f59e0b", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                      : { background: "transparent", color: textMut }
                  }
                >
                  {m === "pdf" ? (
                    <>
                      <IcoFile /> PDF
                    </>
                  ) : (
                    <>
                      <IcoGlobe /> Web Page
                    </>
                  )}
                </button>
              ))}
            </div>
            {setSidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                title="Collapse sidebar (Ctrl+B)"
                className="p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                style={{ color: textMut }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = bgHover;
                  (e.currentTarget as HTMLElement).style.color = textMain;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = textMut;
                }}
              >
                <IcoChevL size={16} />
              </button>
            )}
          </div>

          {/* PDF panel */}
          {sourceMode === "pdf" && (
            <div className="flex flex-col gap-3">
              <SectionTitle>Document</SectionTitle>
              <div
                className="rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200"
                style={{
                  borderColor: localDrag ? "#f59e0b" : d ? "#374151" : "#e5e7eb",
                  background: localDrag ? (d ? "rgba(245,158,11,0.08)" : "rgba(254,243,199,0.6)") : "transparent",
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
                <div className="flex justify-center mb-2" style={{ color: textMut }}>
                  <IcoUpload />
                </div>
                <p className="text-xs leading-relaxed" style={{ color: textMut }}>
                  {pdfReady ? "Drop a PDF or document here or click to browse" : "Loading PDF engine…"}
                </p>
                <p className="text-[10px] mt-1 opacity-70" style={{ color: textMut }}>
                  PDF, DOCX, EPUB, XLSX, CSV, RTF, ODT
                </p>
              </div>
              {pdfBytes && pdfDoc && (
                <button
                  onClick={() => setIsEditorOpen(true)}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <IcoEdit /> Open Fullscreen PDF Editor
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
            <WebPanel onLoad={fetchWebPage} loading={webLoading} loaded={webLoaded} title={webTitle} error={webError} onClear={clearWeb} />
          )}

          <Divider />

          {/* TTS Controls */}
          <div className="flex flex-col gap-4">
            <SectionTitle>
              <span className="flex items-center gap-1.5">
                <IcoVolume /> Text-to-Speech
              </span>
            </SectionTitle>
            <div className="flex gap-2">
              <button
                disabled={!hasContent}
                onClick={ttsState === "idle" ? () => startReading(0) : pauseTts}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-white"
                style={{ background: ttsState === "playing" ? "#22c55e" : "#f59e0b" }}
              >
                {ttsState === "paused" ? (
                  <>
                    <IcoPlay /> Resume
                  </>
                ) : ttsState === "playing" ? (
                  <>
                    <IcoPause /> Pause
                  </>
                ) : (
                  <>
                    <IcoPlay /> Read {sourceMode === "web" ? "Page" : "PDF"}
                  </>
                )}
              </button>
              <IconBtn onClick={() => stopTts(true)} disabled={ttsState === "idle"} title="Stop">
                <IcoStop />
              </IconBtn>
            </div>
            <TtsVoiceSelector
              voices={voices}
              selectedVoice={selectedVoice}
              onSelectVoice={setSelectedVoice}
              ttsRate={ttsRate}
              ttsPitch={ttsPitch}
              border={border}
              bgInput={bgInput}
              bgHover={bgHover}
              textMain={textMain}
              textMut={textMut}
            />
            <SliderRow label="Speed" value={ttsRate} min={0.5} max={2} step={0.1} onChange={setTtsRate} display={`${ttsRate.toFixed(1)}×`} />
            <SliderRow label="Pitch" value={ttsPitch} min={0.5} max={2} step={0.1} onChange={setTtsPitch} display={ttsPitch.toFixed(1)} />
          </div>

          <Divider />

          {/* Playback */}
          <div className="flex flex-col gap-3">
            <SectionTitle>Playback</SectionTitle>
            <SwitchRow
              id="auto-next"
              label="Auto-advance pages"
              checked={autoNextPage}
              onCheckedChange={setAutoNextPage}
              description="Turn to the next page automatically when reading finishes"
            />
          </div>

          {/* PDF-only: Header & Footer */}
          {sourceMode === "pdf" && (
            <>
              <Divider />
              <div className="flex flex-col gap-3">
                <SectionTitle>Header &amp; Footer</SectionTitle>
                <HFCard zone="Header" text={headerText} checked={readHeader} onCheckedChange={setReadHeader} pct={headerPct} onPct={setHeaderPct} />
                <HFCard zone="Footer" text={footerText} checked={readFooter} onCheckedChange={setReadFooter} pct={footerPct} onPct={setFooterPct} />
                {!headerText && !footerText && pdfDoc && <p className="text-[11px] text-center" style={{ color: textMut }}>No header or footer detected</p>}
              </div>
            </>
          )}

          {/* Paragraph list */}
          {hasContent && (
            <>
              <Divider />
              <div className="flex flex-col gap-2">
                <SectionTitle>
                  {sourceMode === "web" ? "Article" : "Page"} Content · {paragraphs.length} paragraphs
                </SectionTitle>
                <div ref={paraListRef} className="flex flex-col gap-0.5">
                  {paragraphs.map((p, i) => {
                    const active = activePara === i;
                    return (
                      <div
                        key={i}
                        data-para={i}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs leading-relaxed border-l-2 transition-all duration-150 cursor-pointer"
                        style={{
                          borderLeftColor: active ? "#f59e0b" : "transparent",
                          color: active ? textMain : textMut,
                          background: active ? (d ? "rgba(245,158,11,0.1)" : "rgba(254,243,199,0.6)") : "transparent",
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
