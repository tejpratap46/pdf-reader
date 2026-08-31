import { FC, ReactNode } from "react";
import { useDark, useThemeMode, dk } from "../../hooks/useTheme";

export const Divider: FC = () => {
  const d = useDark();
  const themeMode = useThemeMode();
  const isAmoled = themeMode === "amoled";
  return (
    <div
      className="h-px my-2 w-full transition-colors"
      style={{
        background: isAmoled
          ? "#27272a"
          : d
          ? "#273142"
          : "#deded9",
      }}
    />
  );
};

export const SectionTitle: FC<{ children: ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-1.5 mb-1.5 select-none">
    <span className="w-1.5 h-1.5 rounded-none bg-amber-500 shrink-0" />
    <p className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-amber-500 leading-none">
      {children}
    </p>
  </div>
);

export const IconBtn: FC<{
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: ReactNode;
  active?: boolean;
}> = ({ onClick, disabled, title, children, active }) => {
  const d = useDark();
  const themeMode = useThemeMode();
  const isAmoled = themeMode === "amoled";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center justify-center rounded-none border p-1.5 transition-colors duration-100 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer ${
        active
          ? "bg-amber-500 text-white border-amber-500"
          : isAmoled
          ? "border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900 hover:text-white hover:border-zinc-700"
          : dk(
              "border-slate-300/90 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 hover:border-slate-400",
              "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100 hover:border-slate-700",
              d
            )
      }`}
    >
      {children}
    </button>
  );
};

export const Switch: FC<{ checked: boolean; onCheckedChange: (v: boolean) => void }> = ({
  checked,
  onCheckedChange,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onCheckedChange(!checked)}
    className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-none border transition-colors duration-150 focus:outline-none p-[2px]"
    style={{
      background: checked ? "#f59e0b" : "rgba(156, 163, 175, 0.2)",
      borderColor: checked ? "#d97706" : "rgba(156, 163, 175, 0.4)",
    }}
  >
    <span
      className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-none bg-white shadow-xs transform transition-transform duration-150 ease-out ${
        checked ? "translate-x-4" : "translate-x-0"
      }`}
    />
  </button>
);

export const SwitchRow: FC<{
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}> = ({ id, label, description, checked, onCheckedChange }) => {
  const d = useDark();
  const themeMode = useThemeMode();
  const isAmoled = themeMode === "amoled";

  return (
    <div
      className="flex items-start gap-3 p-2 rounded-none border transition-colors cursor-pointer"
      onClick={() => onCheckedChange(!checked)}
      style={{
        borderColor: checked
          ? isAmoled
            ? "rgba(245, 158, 11, 0.5)"
            : "rgba(245, 158, 11, 0.4)"
          : "transparent",
        background: checked
          ? isAmoled
            ? "rgba(245, 158, 11, 0.08)"
            : d
            ? "rgba(245, 158, 11, 0.06)"
            : "rgba(245, 158, 11, 0.05)"
          : "transparent",
      }}
    >
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      <label
        htmlFor={id}
        className="flex flex-col gap-0.5 cursor-pointer select-none"
      >
        <span className={`text-xs font-semibold leading-tight ${dk("text-slate-800", "text-slate-100", d)}`}>
          {label}
        </span>
        {description && (
          <span className={`text-[11px] leading-normal ${dk("text-slate-500", "text-slate-400", d)}`}>
            {description}
          </span>
        )}
      </label>
    </div>
  );
};

export const SliderRow: FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: string;
  disabled?: boolean;
}> = ({ label, value, min, max, step, onChange, display, disabled = false }) => {
  const d = useDark();
  const themeMode = useThemeMode();
  const isAmoled = themeMode === "amoled";

  return (
    <div
      className={`flex flex-col gap-1.5 transition-opacity ${
        disabled ? "opacity-35 cursor-not-allowed pointer-events-none" : ""
      }`}
    >
      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${dk("text-slate-600", "text-slate-400", d)}`}>{label}</span>
        <span
          className={`font-mono text-[11px] px-1.5 py-0.5 rounded-none font-bold ${
            isAmoled
              ? "bg-zinc-900 text-amber-400 border border-zinc-800"
              : d
              ? "bg-slate-800 text-amber-400 border border-slate-700"
              : "bg-amber-50 text-amber-700 border border-amber-200/80"
          }`}
        >
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full h-1.5 rounded-none appearance-none cursor-pointer disabled:cursor-not-allowed accent-amber-500 ${
          isAmoled ? "bg-zinc-800" : dk("bg-slate-200", "bg-slate-700", d)
        }`}
      />
    </div>
  );
};

