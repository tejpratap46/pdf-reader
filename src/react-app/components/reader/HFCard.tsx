import { FC } from "react";
import { useDark, dk } from "../../hooks/useTheme";
import { Switch, SliderRow } from "../common/Primitives";

interface HFCardProps {
  zone: "Header" | "Footer";
  text: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  pct: number;
  onPct: (v: number) => void;
}

export const HFCard: FC<HFCardProps> = ({ zone, text, checked, onCheckedChange, pct, onPct }) => {
  const d = useDark();
  const isH = zone === "Header";

  return (
    <div className={`rounded-lg border p-3 flex flex-col gap-2.5 ${dk("border-gray-200 bg-gray-50", "border-gray-800 bg-gray-900", d)}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Switch checked={checked} onCheckedChange={onCheckedChange} />
          <span
            className={`text-[9px] font-mono uppercase tracking-widest border rounded px-1.5 py-0.5 ${isH ? "text-amber-500" : "text-gray-400"}`}
            style={{ borderColor: isH ? "#f59e0b" : "#6b7280" }}
          >
            {zone}
          </span>
          {!text && <span className={`text-[10px] ${dk("text-gray-400", "text-gray-600", d)}`}>not detected</span>}
        </div>
        <span className={`text-xs font-mono tabular-nums ${isH ? "text-amber-500" : "text-gray-400"}`}>{pct}%</span>
      </div>
      {text && <p className={`text-[10px] italic leading-relaxed line-clamp-2 ${dk("text-gray-400", "text-gray-500", d)}`}>{text}</p>}
      <SliderRow label={`Zone (${isH ? "top" : "bottom"} of page)`} value={pct} min={2} max={35} step={1} onChange={onPct} display={`${pct}%`} />
    </div>
  );
};
