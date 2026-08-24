import { FC, useState, useRef } from "react";
import { TtsState } from "../../types/reader";
import { useDark, useThemeMode, dk } from "../../hooks/useTheme";

interface SeekBarProps {
  progress: number;
  ttsState: TtsState;
  onSeek: (ratio: number) => void;
}

export const SeekBar: FC<SeekBarProps> = ({ progress, ttsState, onSeek }) => {
  const d = useDark();
  const themeMode = useThemeMode();
  const isAmoled = themeMode === "amoled";

  const [dragging, setDragging] = useState(false);
  const [dragVal, setDragVal] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const displayed = dragging ? dragVal : Math.round(progress * 100);
  const pct = `${displayed}%`;

  const getRatio = (cx: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    return r ? Math.max(0, Math.min(1, (cx - r.left) / r.width)) : 0;
  };

  return (
    <div className="flex items-center gap-2 mt-2 select-none" onClick={(e) => e.stopPropagation()}>
      <div
        ref={trackRef}
        className="relative flex-1 h-2 rounded-full cursor-pointer group"
        style={{
          background: isAmoled
            ? "#1c1c21"
            : dk("#e2e8f0", "#1e293b", d),
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          setDragVal(Math.round(getRatio(e.clientX) * 100));
        }}
        onPointerMove={(e) => {
          if (dragging) setDragVal(Math.round(getRatio(e.clientX) * 100));
        }}
        onPointerUp={(e) => {
          if (!dragging) return;
          setDragging(false);
          onSeek(getRatio(e.clientX));
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-75"
          style={{
            width: pct,
            background:
              ttsState === "paused"
                ? "linear-gradient(90deg, #d97706, #f59e0b)"
                : "linear-gradient(90deg, #f59e0b, #fbbf24)",
          }}
        />
        <div
          className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-amber-500 shadow-md border-2 border-white dark:border-slate-900 transition-all duration-75 group-hover:scale-125"
          style={{
            left: pct,
            transform: "translateX(-50%) translateY(-50%)",
            boxShadow: dragging
              ? "0 0 0 4px rgba(245,158,11,0.35)"
              : "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </div>
      <span className="text-[10px] font-mono font-bold tabular-nums text-amber-500 w-8 text-right shrink-0">
        {displayed}%
      </span>
    </div>
  );
};

