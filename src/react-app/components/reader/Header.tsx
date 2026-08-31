import { FC } from "react";
import { SourceMode, TtsState, Theme, BeforeInstallPromptEvent, AppMode } from "../../types/reader";
import { useDark, useThemeMode } from "../../hooks/useTheme";
import { ThemeDropdown } from "../common/ThemeDropdown";
import { UserMenu } from "../auth/UserMenu";
import {
  IcoPanel,
  IcoGlobe,
  IcoFile,
  IcoDownload,
  IcoArrowR,
  IcoSparklesFilled,
  IcoSearch,
  IcoBookOpen,
  IcoEye,
  IcoEdit,
} from "../common/Icons";

interface HeaderProps {
  activeMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  canOpenEditor?: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (fn: (o: boolean) => boolean) => void;
  aiSidebarOpen?: boolean;
  setAiSidebarOpen?: (fn: (o: boolean) => boolean) => void;
  isSearchOpen?: boolean;
  onOpenSearch?: () => void;
  onCloseSearch?: () => void;
  hasDocument?: boolean;
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
  activeMode = "viewer",
  onModeChange,
  canOpenEditor = true,
  sidebarOpen,
  setSidebarOpen,
  aiSidebarOpen,
  setAiSidebarOpen,
  isSearchOpen = false,
  onOpenSearch,
  onCloseSearch,
  hasDocument = false,
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
  const themeMode = useThemeMode();
  const isAmoled = themeMode === "amoled";

  const statusDot =
    ttsState === "playing"
      ? "#22c55e"
      : ttsState === "paused"
      ? "#f59e0b"
      : d
      ? "#64748b"
      : "#94a3b8";

  const statusLabel =
    ttsState === "idle"
      ? "Ready"
      : ttsState === "playing"
      ? "Speaking"
      : "Paused";

  const statusColor =
    ttsState === "playing"
      ? d
        ? "#4ade80"
        : "#16a34a"
      : ttsState === "paused"
      ? "#f59e0b"
      : d
      ? "#94a3b8"
      : "#64748b";

  const statusBg =
    ttsState === "playing"
      ? isAmoled
        ? "rgba(34, 197, 94, 0.12)"
        : d
        ? "rgba(34, 197, 94, 0.1)"
        : "rgba(220, 252, 231, 0.8)"
      : ttsState === "paused"
      ? isAmoled
        ? "rgba(245, 158, 11, 0.12)"
        : d
        ? "rgba(245, 158, 11, 0.1)"
        : "rgba(254, 243, 199, 0.8)"
      : "transparent";

  const statusBC =
    ttsState === "playing"
      ? "rgba(34, 197, 94, 0.3)"
      : ttsState === "paused"
      ? "rgba(245, 158, 11, 0.3)"
      : isAmoled
      ? "#27272a"
      : d
      ? "#334155"
      : "#e2e8f0";

  return (
    <header
      className="flex items-center justify-between px-4 sm:px-6 py-2.5 shrink-0 z-30 transition-colors backdrop-blur-md"
      style={{
        borderBottom: `1px solid ${border}`,
        background: isAmoled ? "rgba(0, 0, 0, 0.96)" : d ? "rgba(17, 24, 39, 0.95)" : "rgba(255, 255, 255, 0.96)",
      }}
    >
      {/* Brand & Left Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          title={`${sidebarOpen ? "Collapse" : "Expand"} sidebar (Ctrl+B)`}
          className="p-1.5 rounded-none transition-colors duration-150 cursor-pointer flex items-center justify-center border"
          style={{
            borderColor: sidebarOpen ? (d ? "rgba(245, 158, 11, 0.5)" : "rgba(245, 158, 11, 0.6)") : border,
            color: sidebarOpen ? "#f59e0b" : textMut,
            background: sidebarOpen
              ? isAmoled
                ? "rgba(245, 158, 11, 0.12)"
                : d
                ? "rgba(245, 158, 11, 0.1)"
                : "rgba(254, 243, 199, 0.6)"
              : "transparent",
          }}
          onMouseEnter={(e) => {
            if (!sidebarOpen) (e.currentTarget as HTMLElement).style.background = bgHover;
          }}
          onMouseLeave={(e) => {
            if (!sidebarOpen) (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <IcoPanel size={16} />
        </button>

        <div className="h-6 w-px mx-1 hidden sm:block" style={{ background: border }} />

        {/* App Branding with Yellow Icon */}
        <div className="flex items-center gap-2 select-none">
          <img
            src="/favicon.svg"
            alt="PDF Reader"
            className="w-5 h-5 rounded-xs shrink-0 drop-shadow-xs"
          />
          <span className="hidden sm:inline-block font-mono font-bold text-xs uppercase tracking-wider text-amber-500">
            PDF Reader
          </span>
        </div>

        {/* Open Document Tag */}
        {displayTitle ? (
          <span
            className="hidden lg:flex items-center gap-2 text-xs rounded-none px-2.5 py-1 max-w-[180px] sm:max-w-[240px] border transition-all font-mono"
            style={{
              color: d ? "#f1f5f9" : "#1e293b",
              background: isAmoled ? "#09090b" : d ? "#1e293b" : "#f8fafc",
              borderColor: border,
            }}
          >
            <span className="text-amber-500 shrink-0">
              {sourceMode === "web" ? <IcoGlobe size={13} /> : <IcoFile size={13} />}
            </span>
            <span className="truncate font-medium text-xs">{displayTitle}</span>
          </span>
        ) : (
          <span
            className="hidden xl:inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-none border"
            style={{
              color: textMut,
              background: isAmoled ? "#09090b" : d ? "#1e293b" : "#f1f5f9",
              borderColor: border,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-none bg-emerald-500" />
            [ STUDIO READY ]
          </span>
        )}
      </div>

      {/* Center: Mode Switcher Segmented Control (Viewer | Reader | Editor) */}
      <div
        className="flex items-center p-0.5 rounded-none border select-none transition-all"
        style={{
          background: isAmoled ? "#0a0a0c" : d ? "#0f172a" : "#f1f5f9",
          borderColor: border,
        }}
      >
        {[
          {
            id: "viewer",
            label: "Viewer",
            icon: <IcoEye size={13} />,
            desc: "Default on-device PDF viewer & AI companion (Alt+1)",
            disabled: false,
          },
          {
            id: "reader",
            label: "Reader",
            icon: <IcoBookOpen size={13} />,
            desc: "Distraction-free Markdown reading with word-highlighted TTS (Alt+2)",
            disabled: false,
          },
          {
            id: "editor",
            label: "Editor",
            icon: <IcoEdit size={13} />,
            desc: canOpenEditor
              ? "PDF Studio annotations, stamps, signatures & page management (Alt+3)"
              : "Open a PDF document first to enable Editor mode",
            disabled: !canOpenEditor,
          },
        ].map((item) => {
          const isActive = activeMode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              onClick={() => onModeChange(item.id as AppMode)}
              title={item.desc}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-none text-xs font-semibold transition-colors duration-100 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed border ${
                isActive
                  ? "bg-amber-500 text-white border-amber-600 font-bold shadow-xs"
                  : "border-transparent hover:text-amber-500 hover:bg-slate-500/10"
              }`}
              style={{
                color: isActive ? "#ffffff" : textMut,
              }}
            >
              <span className={isActive ? "text-white" : ""}>{item.icon}</span>
              <span className="inline">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* PWA Install */}
        {installPrompt && (
          <button
            onClick={async () => {
              installPrompt.prompt();
              const choice = await installPrompt.userChoice;
              if (choice?.outcome === "accepted") {
                setInstallPrompt(null);
              }
            }}
            title="Install Pdf Reader App on your OS"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-xs font-bold border border-amber-600 shadow-xs transition-colors cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#ffffff",
            }}
          >
            <IcoDownload size={13} />
            <span className="hidden sm:inline">[ INSTALL APP ]</span>
          </button>
        )}

        {isStandalone && (
          <span
            className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-mono font-bold uppercase border"
            style={{
              color: "#10b981",
              borderColor: "rgba(16, 185, 129, 0.3)",
              background: isAmoled ? "rgba(16, 185, 129, 0.12)" : d ? "rgba(16, 185, 129, 0.1)" : "rgba(236, 253, 245, 1)",
            }}
          >
            [ PWA ]
          </span>
        )}

        {/* Auto-next Status Indicator */}
        {autoNextPage && ttsState !== "idle" && (
          <span
            className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-mono font-medium border"
            style={{
              color: "#818cf8",
              borderColor: "rgba(129, 140, 248, 0.3)",
              background: isAmoled ? "rgba(99, 102, 241, 0.12)" : d ? "rgba(99, 102, 241, 0.1)" : "rgba(238, 242, 255, 1)",
            }}
          >
            <IcoArrowR size={11} /> Auto-turn
          </span>
        )}

        {/* Audio State Status Badge */}
        <span
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-none text-[10px] font-mono font-bold uppercase border transition-all"
          style={{
            color: statusColor,
            borderColor: statusBC,
            background: statusBg,
          }}
        >
          <span
            className={`w-1.5 h-1.5 rounded-none ${
              ttsState === "playing" ? "animate-ping opacity-80" : ""
            }`}
            style={{ background: statusDot }}
          />
          <span>{statusLabel}</span>
        </span>

        {/* Search Trigger Button */}
        {hasDocument && (onOpenSearch || onCloseSearch) && (
          <button
            onClick={() => (isSearchOpen ? onCloseSearch?.() : onOpenSearch?.())}
            title={`${isSearchOpen ? "Close" : "Open"} Search (Ctrl+F)`}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-none text-xs font-semibold shadow-xs transition-colors cursor-pointer border"
            style={{
              background: isSearchOpen
                ? "#f59e0b"
                : isAmoled
                ? "rgba(245, 158, 11, 0.12)"
                : d
                ? "rgba(245, 158, 11, 0.1)"
                : "rgba(254, 243, 199, 0.8)",
              borderColor: isSearchOpen
                ? "#d97706"
                : isAmoled
                ? "rgba(245, 158, 11, 0.5)"
                : d
                ? "rgba(245, 158, 11, 0.4)"
                : "rgba(245, 158, 11, 0.3)",
              color: isSearchOpen ? "#ffffff" : d ? "#fbbf24" : "#b45309",
            }}
          >
            <IcoSearch size={13} />
            <span className="hidden sm:inline">Find</span>
          </button>
        )}

        {/* Ask AI Trigger Button */}
        {hasDocument && setAiSidebarOpen && (
          <button
            onClick={() => setAiSidebarOpen((o) => !o)}
            title={`${aiSidebarOpen ? "Close" : "Open"} AI Chat (Ctrl+J)`}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-none text-xs font-semibold shadow-xs transition-colors cursor-pointer border"
            style={{
              background: aiSidebarOpen
                ? "#2563eb"
                : isAmoled
                ? "rgba(37, 99, 235, 0.15)"
                : d
                ? "rgba(37, 99, 235, 0.12)"
                : "rgba(239, 246, 255, 0.9)",
              borderColor: aiSidebarOpen
                ? "#1d4ed8"
                : isAmoled
                ? "rgba(37, 99, 235, 0.5)"
                : d
                ? "rgba(37, 99, 235, 0.4)"
                : "rgba(59, 130, 246, 0.3)",
              color: aiSidebarOpen ? "#ffffff" : d ? "#93c5fd" : "#1d4ed8",
            }}
          >
            <IcoSparklesFilled size={13} />
            <span>Ask AI</span>
          </button>
        )}

        {/* Theme Picker */}
        <ThemeDropdown theme={theme} setTheme={setTheme} />

        {/* User Profile */}
        <UserMenu border={border} bgCard={bgCard} bgHover={bgHover} textMut={textMut} />
      </div>
    </header>
  );
};


