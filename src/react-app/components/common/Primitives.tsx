import { FC, ReactNode } from "react";
import { useDark, dk } from "../../hooks/useTheme";

export const Divider: FC = () => {
  const d = useDark();
  return <div className={`h-px my-1 ${dk("bg-gray-200", "bg-gray-800", d)}`} />;
};

export const SectionTitle: FC<{ children: ReactNode }> = ({ children }) => (
  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500 mb-0.5">{children}</p>
);

export const IconBtn: FC<{ onClick: () => void; disabled?: boolean; title?: string; children: ReactNode }> = ({
  onClick,
  disabled,
  title,
  children,
}) => {
  const d = useDark();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center justify-center rounded-md border p-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${dk(
        "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900",
        "border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-gray-100",
        d
      )}`}
    >
      {children}
    </button>
  );
};

export const Switch: FC<{ checked: boolean; onCheckedChange: (v: boolean) => void }> = ({ checked, onCheckedChange }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => onCheckedChange(!checked)}
    className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
    style={{ background: checked ? "#f59e0b" : "#d1d5db" }}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
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
  return (
    <div className="flex items-start gap-3">
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      <label htmlFor={id} className="flex flex-col gap-0.5 cursor-pointer" onClick={() => onCheckedChange(!checked)}>
        <span className={`text-sm font-medium leading-none ${dk("text-gray-800", "text-gray-200", d)}`}>{label}</span>
        {description && <span className={`text-xs leading-relaxed ${dk("text-gray-500", "text-gray-400", d)}`}>{description}</span>}
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
  return (
    <div className={`flex flex-col gap-2 transition-opacity ${disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}`}>
      <div className={`flex justify-between text-xs ${dk("text-gray-500", "text-gray-400", d)}`}>
        <span>{label}</span>
        <span className="font-mono tabular-nums text-amber-500">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={`w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed accent-amber-500 ${dk("bg-gray-200", "bg-gray-700", d)}`}
      />
    </div>
  );
};
