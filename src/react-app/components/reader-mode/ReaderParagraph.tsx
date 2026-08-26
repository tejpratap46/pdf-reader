import React, { FC, useMemo, memo } from "react";
import { TtsState } from "../../types/reader";
import { IcoPlay, IcoPause } from "../common/Icons";
import { Waveform } from "../common/Waveform";
import { SeekBar } from "../common/SeekBar";

interface ReaderParagraphProps {
  index: number;
  text: string;
  isActive: boolean;
  ttsState: TtsState;
  activeCharOffset: number;
  paraProgress: number;
  onPlay: (index: number) => void;
  onPause: () => void;
  onSeek: (index: number, ratio: number) => void;
  isDark: boolean;
  isAmoled: boolean;
  textMain: string;
  textMut: string;
  fontSizeClass: string;
  fontFamilyClass: string;
  lineHeightClass: string;
  isMatch?: boolean;
}

interface WordToken {
  word: string;
  start: number;
  end: number;
}

export const ReaderParagraph: FC<ReaderParagraphProps> = memo(({
  index,
  text,
  isActive,
  ttsState,
  activeCharOffset,
  paraProgress,
  onPlay,
  onPause,
  onSeek,
  isDark,
  isAmoled,
  textMain,
  textMut,
  fontSizeClass,
  fontFamilyClass,
  lineHeightClass,
  isMatch = false,
}) => {
  // Tokenize text into words with start and end offsets for real-time word-level highlighting
  const wordTokens = useMemo<WordToken[]>(() => {
    if (!isActive) return [];
    const tokens: WordToken[] = [];
    const regex = /\S+/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      tokens.push({
        word: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
    return tokens;
  }, [text, isActive]);

  // Find currently spoken word index based on activeCharOffset
  const currentWordIndex = useMemo<number>(() => {
    if (!isActive || wordTokens.length === 0) return -1;
    for (let i = 0; i < wordTokens.length; i++) {
      const token = wordTokens[i];
      if (activeCharOffset >= token.start && activeCharOffset <= token.end) {
        return i;
      }
      // If char offset is between this word and the next
      if (i < wordTokens.length - 1 && activeCharOffset > token.end && activeCharOffset < wordTokens[i + 1].start) {
        return i;
      }
    }
    // Fallback: if offset exceeds last word
    if (activeCharOffset >= wordTokens[wordTokens.length - 1].start) {
      return wordTokens.length - 1;
    }
    return 0;
  }, [isActive, wordTokens, activeCharOffset]);

  const isSpeaking = isActive && ttsState === "playing";
  const isPaused = isActive && ttsState === "paused";
  const isRestoredIdle = isActive && ttsState === "idle" && activeCharOffset > 0;

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) {
      onPause();
    } else if (isPaused) {
      onPause();
    } else {
      onPlay(index);
    }
  };

  return (
    <div
      id={`reader-para-${index}`}
      data-para={index}
      className={`group relative flex items-start gap-3 sm:gap-4 py-3.5 px-3 sm:px-5 rounded-2xl transition-all duration-200 ${
        isActive
          ? isAmoled
            ? "bg-zinc-950/80 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/5"
            : isDark
            ? "bg-slate-900/80 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/5"
            : "bg-amber-50/70 ring-1 ring-amber-400/50 shadow-md shadow-amber-500/5"
          : isMatch
          ? isDark
            ? "bg-amber-950/30 ring-1 ring-amber-500/30"
            : "bg-amber-100/50 ring-1 ring-amber-300"
          : isAmoled
          ? "hover:bg-zinc-900/40"
          : isDark
          ? "hover:bg-slate-900/40"
          : "hover:bg-stone-100/70"
      }`}
    >
      {/* Left Gutter: Play / Pause Button */}
      <div className="pt-0.5 shrink-0 select-none">
        <button
          type="button"
          onClick={handleTogglePlay}
          title={
            isSpeaking
              ? "Pause reading (Space)"
              : isPaused
              ? "Resume reading (Space)"
              : isRestoredIdle
              ? "Resume from last location (Space)"
              : "Read paragraph"
          }
          aria-label={
            isSpeaking
              ? "Pause narration"
              : isPaused || isRestoredIdle
              ? "Resume narration from saved position"
              : "Play narration from this paragraph"
          }
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-2xs ${
            isSpeaking
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/30 scale-105"
              : isPaused || isRestoredIdle
              ? "bg-amber-500/20 text-amber-500 border border-amber-500/50 scale-100 ring-2 ring-amber-500/20"
              : "opacity-40 group-hover:opacity-100 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500 hover:text-white border border-amber-500/20 hover:scale-105"
          }`}
        >
          {isSpeaking ? (
            <IcoPause size={14} />
          ) : (
            <span className="ml-0.5">
              <IcoPlay size={13} />
            </span>
          )}
        </button>
      </div>

      {/* Paragraph Content */}
      <div className="flex-1 min-w-0">
        {/* Active Narration Badge */}
        {isActive && (
          <div className="flex items-center gap-2 mb-2 select-none animate-fadeIn">
            <Waveform paused={ttsState !== "playing"} />
            <span className="text-[10px] text-amber-500 font-extrabold tracking-widest uppercase">
              {ttsState === "paused"
                ? "Paused"
                : ttsState === "playing"
                ? "Reading Now"
                : "Last Read Location"}
            </span>
          </div>
        )}

        {/* Text with live word-level highlighting */}
        <p
          className={`${fontFamilyClass} ${fontSizeClass} ${lineHeightClass} transition-colors duration-150 select-text`}
          style={{ color: isActive ? textMain : textMut }}
        >
          {isActive && wordTokens.length > 0 ? (
            wordTokens.map((token, wIdx) => {
              const isCurrentWord = wIdx === currentWordIndex;
              return (
                <React.Fragment key={wIdx}>
                  {isCurrentWord ? (
                    <mark
                      className="bg-amber-400/40 dark:bg-amber-400/35 text-inherit rounded px-1 py-0.5 font-semibold transition-all duration-75 shadow-xs"
                      style={{
                        outline: isDark ? "1px solid rgba(245, 158, 11, 0.6)" : "1px solid rgba(245, 158, 11, 0.5)",
                      }}
                    >
                      {token.word}
                    </mark>
                  ) : (
                    <span>{token.word}</span>
                  )}
                  {wIdx < wordTokens.length - 1 ? " " : ""}
                </React.Fragment>
              );
            })
          ) : (
            text
          )}
        </p>

        {/* Progress Seek Bar when active */}
        {isActive && (
          <div className="mt-3">
            <SeekBar
              progress={paraProgress}
              ttsState={ttsState}
              onSeek={(r) => onSeek(index, r)}
            />
          </div>
        )}
      </div>
    </div>
  );
});
ReaderParagraph.displayName = "ReaderParagraph";
