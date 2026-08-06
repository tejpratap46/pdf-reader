import { FC, useState, useRef } from "react";
import { TtsState } from "../../types/reader";
import { useDark, dk } from "../../hooks/useTheme";

interface SeekBarProps {
  progress: number;
  ttsState: TtsState;
  onSeek: (ratio: number) => void;
}

export const SeekBar: FC<SeekBarProps> = ({ progress, ttsState, onSeek }) => {
  const d = useDark();
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
        className="relative flex-1 h-2 rounded-full cursor-pointer"
        style={{ background: dk("#e5e7eb", "#374151", d) }}
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
          style={{ width: pct, background: ttsState === "paused" ? "#f59e0b99" : "#f59e0b" }}
        />
        <div
          className="absolute top-1/2 w-3.5 h-3.5 rounded-full bg-amber-500 shadow-md border-2 border-white transition-all duration-75"
          style={{
            left: pct,
            transform: "translateX(-50%) translateY(-50%)",
            boxShadow: dragging ? "0 0 0 3px rgba(245,158,11,0.3)" : undefined,
          }}
        />
      </div>
      <span className="text-[10px] font-mono tabular-nums text-amber-500 w-8 text-right shrink-0">{displayed}%</span>
    </div>
  );
};
