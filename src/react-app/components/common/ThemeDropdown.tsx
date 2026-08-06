import { FC, useState, useRef, useEffect } from "react";
import { Theme } from "../../types/reader";
import { useDark, dk } from "../../hooks/useTheme";
import { IcoSun, IcoMoon, IcoMonitor, IcoCheck } from "./Icons";

export const ThemeDropdown: FC<{ theme: Theme; setTheme: (t: Theme) => void }> = ({ theme, setTheme }) => {
  const d = useDark();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const opts: { value: Theme; label: string; Icon: FC }[] = [
    { value: "light", label: "Light", Icon: IcoSun },
    { value: "dark", label: "Dark", Icon: IcoMoon },
    { value: "system", label: "System", Icon: IcoMonitor },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Toggle theme"
        className={`flex items-center justify-center rounded-md border p-1.5 transition-colors ${dk(
          "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900",
          "border-gray-700 bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-gray-100",
          d
        )}`}
      >
        {d ? <IcoMoon /> : <IcoSun />}
      </button>
      {open && (
        <div
          className={`absolute right-0 top-full mt-1.5 w-36 rounded-lg border shadow-xl z-50 overflow-hidden ${dk(
            "border-gray-200 bg-white",
            "border-gray-700 bg-gray-900",
            d
          )}`}
        >
          {opts.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => {
                setTheme(value);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                theme === value
                  ? "text-amber-500"
                  : dk("text-gray-700 hover:bg-gray-100", "text-gray-300 hover:bg-gray-800", d)
              }`}
              style={theme === value ? { background: d ? "rgba(245,158,11,0.1)" : "rgba(254,243,199,0.6)" } : {}}
            >
              <Icon />
              <span className="flex-1 text-left">{label}</span>
              {theme === value && <IcoCheck />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
