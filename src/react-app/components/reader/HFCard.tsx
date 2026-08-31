import { FC } from "react";
import { useDark, useThemeMode, dk } from "../../hooks/useTheme";
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
  const themeMode = useThemeMode();
  const isAmoled = themeMode === "amoled";
  const isH = zone === "Header";

  return (
    <div
      className="rounded-none border p-3 flex flex-col gap-2.5 transition-colors"
      style={{
        background: isAmoled
          ? "#09090b"
          : dk("#fbfbfa", "#161b22", d),
        borderColor: isAmoled
          ? "#27272a"
          : dk("#deded9", "#273142", d),
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Switch checked={checked} onCheckedChange={onCheckedChange} />
          <span
            className={`text-[9px] font-mono font-bold uppercase tracking-widest border rounded-none px-2 py-0.5 ${
              isH ? "text-amber-500 border-amber-500/40 bg-amber-500/10" : "text-slate-400 border-slate-400/40 bg-slate-400/10"
            }`}
          >
            {zone}
          </span>
          {!text && (
            <span className={`text-[10px] italic ${dk("text-slate-400", "text-slate-500", d)}`}>
              none detected
            </span>
          )}
        </div>
        <span className={`text-xs font-mono font-bold tabular-nums ${isH ? "text-amber-500" : "text-slate-400"}`}>
          {pct}%
        </span>
      </div>
      {text && (
        <p className={`text-[11px] italic leading-relaxed line-clamp-2 px-1 ${dk("text-slate-500", "text-slate-400", d)}`}>
          "{text}"
        </p>
      )}
      <SliderRow
        label={`Zone (${isH ? "Top" : "Bottom"} margin)`}
        value={pct}
        min={2}
        max={35}
        step={1}
        onChange={onPct}
        display={`${pct}%`}
      />
    </div>
  );
};

