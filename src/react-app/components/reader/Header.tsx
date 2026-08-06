import { FC } from "react";
import { SourceMode, TtsState, Theme, BeforeInstallPromptEvent } from "../../types/reader";
import { useDark } from "../../hooks/useTheme";
import { ThemeDropdown } from "../common/ThemeDropdown";
import { IcoPanel, IcoGlobe, IcoFile, IcoDownload, IcoArrowR } from "../common/Icons";

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (fn: (o: boolean) => boolean) => void;
  displayTitle: string;
  sourceMode: SourceMode;
  installPrompt: BeforeInstallPromptEvent | null;
  setInstallPrompt: (v: BeforeInstallPromptEvent | null) => void;
  isStandalone: boolean;
  autoNextPage: boolean;
  ttsState: TtsState;
  theme: Theme;
  setTheme: (t: Theme) => void;
  border: string;
  bgCard: string;
  bgHover: string;
  textMut: string;
}

export const Header: FC<HeaderProps> = ({
  sidebarOpen,
  setSidebarOpen,
  displayTitle,
  sourceMode,
  installPrompt,
  setInstallPrompt,
  isStandalone,
  autoNextPage,
  ttsState,
  theme,
  setTheme,
  border,
  bgCard,
  bgHover,
  textMut,
}) => {
  const d = useDark();

  const statusDot = ttsState === "playing" ? "#4ade80" : ttsState === "paused" ? "#f59e0b" : d ? "#4b5563" : "#9ca3af";
  const statusGlow = ttsState === "playing" ? "0 0 6px #4ade80" : "none";
  const statusLabel = ttsState === "idle" ? "Ready" : ttsState === "playing" ? "Speaking" : "Paused";
  const statusColor = ttsState === "playing" ? (d ? "#4ade80" : "#16a34a") : ttsState === "paused" ? "#f59e0b" : d ? "#6b7280" : "#9ca3af";
  const statusBC = ttsState === "playing" ? "rgba(74,222,128,0.3)" : ttsState === "paused" ? "rgba(245,158,11,0.3)" : d ? "#374151" : "#e5e7eb";

  return (
    <header className="flex items-center justify-between px-5 py-2.5 shrink-0" style={{ borderBottom: `1px solid ${border}`, background: bgCard }}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          title={`${sidebarOpen ? "Hide" : "Show"} sidebar`}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: textMut }}
          onMouseEnter={(e) => (e.currentTarget.style.background = bgHover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <IcoPanel />
        </button>
        <div className="h-8 w-px" style={{ background: border }} />
        <div>
          <h1 className="text-base font-bold tracking-wider text-amber-500 leading-none">FOLIO</h1>
          <p className="text-[9px] uppercase tracking-[0.2em] leading-none mt-0.5" style={{ color: textMut }}>
            PDF &amp; Web Reader
          </p>
        </div>
        <div className="h-8 w-px" style={{ background: border }} />
        {displayTitle ? (
          <span
            className="flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 max-w-[240px]"
            style={{ color: textMut, background: bgHover, border: `1px solid ${border}` }}
          >
            {sourceMode === "web" ? <IcoGlobe /> : <IcoFile />}
            <span className="truncate">{displayTitle}</span>
          </span>
        ) : (
          <span className="text-xs" style={{ color: textMut }}>
            No document open
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {installPrompt && (
          <button
            onClick={async () => {
              installPrompt.prompt();
              const choice = await installPrompt.userChoice;
              if (choice?.outcome === "accepted") {
                setInstallPrompt(null);
              }
            }}
            title="Install Folio App on your OS"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-all duration-200 hover:scale-105 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#ffffff" }}
          >
            <IcoDownload /> Install App
          </button>
        )}
        {isStandalone && (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border"
            style={{ color: "#34d399", borderColor: "rgba(52,211,153,0.3)", background: d ? "rgba(16,185,129,0.1)" : "rgba(236,253,245,1)" }}
          >
            ✓ PWA App
          </span>
        )}
        {autoNextPage && ttsState !== "idle" && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
            style={{ color: "#818cf8", borderColor: "rgba(129,140,248,0.3)", background: d ? "rgba(99,102,241,0.1)" : "rgba(238,242,255,1)" }}
          >
            <IcoArrowR /> Auto-next
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border" style={{ color: statusColor, borderColor: statusBC }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusDot, boxShadow: statusGlow }} />
          {statusLabel}
        </span>
        <ThemeDropdown theme={theme} setTheme={setTheme} />
      </div>
    </header>
  );
};
