import { FC, useState, useRef, useEffect } from "react";
import { Theme, ResolvedTheme } from "../../types/reader";
import { useDark, useThemeMode, dk } from "../../hooks/useTheme";
import { IcoSun, IcoMoon, IcoAmoled, IcoMonitor, IcoCheck } from "./Icons";

export const ThemeDropdown: FC<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolvedTheme?: ResolvedTheme;
}> = ({ theme, setTheme, resolvedTheme: propResolvedTheme }) => {
  const d = useDark();
  const contextThemeMode = useThemeMode();
  const resolvedTheme = propResolvedTheme || contextThemeMode;
  const isAmoled = resolvedTheme === "amoled";

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const opts: { value: Theme; label: string; Icon: FC<{ size?: number }> }[] = [
    { value: "light", label: "Light", Icon: IcoSun },
    { value: "dark", label: "Dark", Icon: IcoMoon },
    { value: "amoled", label: "AMOLED Black", Icon: IcoAmoled },
    { value: "system", label: "System", Icon: IcoMonitor },
  ];

  const CurrentIcon = () => {
    if (theme === "amoled") return <IcoAmoled />;
    if (theme === "dark") return <IcoMoon />;
    if (theme === "light") return <IcoSun />;
    // System
    if (resolvedTheme === "amoled") return <IcoAmoled />;
    if (resolvedTheme === "dark" || d) return <IcoMoon />;
    return <IcoSun />;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
        className={`flex items-center justify-center rounded-md border p-1.5 transition-colors ${
          isAmoled
            ? "border-zinc-800 bg-black text-gray-300 hover:bg-zinc-900 hover:text-white"
            : dk(
                "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                "border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-gray-100",
                d
              )
        }`}
      >
        <CurrentIcon />
      </button>
      {open && (
        <div
          className={`absolute right-0 top-full mt-1.5 w-44 rounded-xl border shadow-2xl z-50 overflow-hidden ${
            isAmoled
              ? "border-zinc-800 bg-black/95 backdrop-blur-md"
              : dk("border-gray-200 bg-white", "border-gray-700 bg-gray-900/95 backdrop-blur-md", d)
          }`}
        >
          {opts.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => {
                setTheme(value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                theme === value
                  ? "text-amber-500 font-semibold"
                  : isAmoled
                  ? "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                  : dk("text-gray-700 hover:bg-gray-100", "text-gray-300 hover:bg-gray-800", d)
              }`}
              style={
                theme === value
                  ? { background: d ? "rgba(245,158,11,0.12)" : "rgba(254,243,199,0.6)" }
                  : {}
              }
            >
              <Icon size={15} />
              <span className="flex-1 text-left">{label}</span>
              {theme === value && <IcoCheck size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

