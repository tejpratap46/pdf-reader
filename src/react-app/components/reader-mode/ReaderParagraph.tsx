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
      className={`group relative flex items-start gap-3 sm:gap-4 py-3.5 px-3 sm:px-5 rounded-none border-l-2 border-r border-t border-b transition-colors duration-150 ${
        isActive
          ? isAmoled
            ? "bg-zinc-950/80 border-l-amber-500 border-r-zinc-800 border-t-zinc-800 border-b-zinc-800 shadow-md"
            : isDark
            ? "bg-slate-900/80 border-l-amber-500 border-r-slate-800 border-t-slate-800 border-b-slate-800 shadow-md"
            : "bg-amber-50/70 border-l-amber-500 border-r-stone-200 border-t-stone-200 border-b-stone-200 shadow-sm"
          : isMatch
          ? isDark
            ? "bg-amber-950/30 border-l-amber-500 border-r-amber-900/40 border-t-amber-900/40 border-b-amber-900/40"
            : "bg-amber-100/50 border-l-amber-500 border-r-amber-300 border-t-amber-300 border-b-amber-300"
          : isAmoled
          ? "border-transparent hover:border-zinc-800 hover:bg-zinc-900/40"
          : isDark
          ? "border-transparent hover:border-slate-800 hover:bg-slate-900/40"
          : "border-transparent hover:border-stone-200 hover:bg-stone-100/70"
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
          className={`w-7 h-7 rounded-none border flex items-center justify-center transition-colors cursor-pointer shadow-2xs ${
            isSpeaking
              ? "bg-amber-500 border-amber-600 text-white shadow-xs"
              : isPaused || isRestoredIdle
              ? "bg-amber-500/20 text-amber-500 border-amber-500"
              : "opacity-40 group-hover:opacity-100 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500 hover:text-white border-amber-500/30"
          }`}
        >
          {isSpeaking ? (
            <IcoPause size={13} />
          ) : (
            <span className="ml-0.5">
              <IcoPlay size={12} />
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
            <span className="text-[9px] font-mono text-amber-500 font-bold tracking-widest uppercase">
              {ttsState === "paused"
                ? "[ PAUSED ]"
                : ttsState === "playing"
                ? "[ READING NOW ]"
                : "[ LAST READ LOCATION ]"}
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
                      className="bg-amber-400/40 dark:bg-amber-400/35 text-inherit rounded-none px-1 py-0.5 font-semibold transition-colors duration-75 shadow-xs"
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
