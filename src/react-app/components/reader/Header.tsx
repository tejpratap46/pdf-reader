import { FC } from "react";
import { SourceMode, TtsState, Theme, BeforeInstallPromptEvent } from "../../types/reader";
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
} from "../common/Icons";

interface HeaderProps {
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
          className="p-1.5 rounded-lg transition-all duration-150 active:scale-95 cursor-pointer flex items-center justify-center border"
          style={{
            borderColor: sidebarOpen ? (d ? "rgba(245, 158, 11, 0.4)" : "rgba(245, 158, 11, 0.5)") : border,
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

        {/* Wordmark Emblem */}
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 flex items-center justify-center text-white shadow-sm shadow-amber-500/20 shrink-0">
            <IcoBookOpen size={15} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <h1 className="text-sm font-extrabold tracking-[0.15em] text-amber-500 uppercase">
                FOLIO
              </h1>
              <span
                className="text-[8px] font-bold uppercase tracking-[0.2em] px-1 py-0.5 rounded"
                style={{
                  background: isAmoled ? "#18181b" : d ? "#1f2937" : "#f1f5f9",
                  color: textMut,
                }}
              >
                STUDIO
              </span>
            </div>
            <p className="text-[9px] font-medium tracking-wider mt-0.5 opacity-60" style={{ color: textMut }}>
              Reading &amp; TTS Engine
            </p>
          </div>
        </div>

        <div className="h-6 w-px mx-1 hidden sm:block" style={{ background: border }} />

        {/* Open Document Pill */}
        {displayTitle ? (
          <span
            className="flex items-center gap-2 text-xs rounded-full px-3 py-1 max-w-[180px] sm:max-w-[280px] shadow-2xs border transition-all"
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
            className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full"
            style={{
              color: textMut,
              background: isAmoled ? "#09090b" : d ? "#1e293b" : "#f1f5f9",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
            Studio Ready
          </span>
        )}
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
            title="Install Folio App on your OS"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#ffffff",
            }}
          >
            <IcoDownload size={13} />
            <span className="hidden sm:inline">Install App</span>
          </button>
        )}

        {isStandalone && (
          <span
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border"
            style={{
              color: "#10b981",
              borderColor: "rgba(16, 185, 129, 0.3)",
              background: isAmoled ? "rgba(16, 185, 129, 0.12)" : d ? "rgba(16, 185, 129, 0.1)" : "rgba(236, 253, 245, 1)",
            }}
          >
            ✓ PWA App
          </span>
        )}

        {/* Auto-next Status Indicator */}
        {autoNextPage && ttsState !== "idle" && (
          <span
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border"
            style={{
              color: "#818cf8",
              borderColor: "rgba(129, 140, 248, 0.3)",
              background: isAmoled ? "rgba(99, 102, 241, 0.12)" : d ? "rgba(99, 102, 241, 0.1)" : "rgba(238, 242, 255, 1)",
            }}
          >
            <IcoArrowR size={12} /> Auto-next
          </span>
        )}

        {/* Audio State Status Pill */}
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all"
          style={{
            color: statusColor,
            borderColor: statusBC,
            background: statusBg,
          }}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
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
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer border"
            style={{
              background: isSearchOpen
                ? "linear-gradient(135deg, #f59e0b, #d97706)"
                : isAmoled
                ? "rgba(245, 158, 11, 0.12)"
                : d
                ? "rgba(245, 158, 11, 0.1)"
                : "rgba(254, 243, 199, 0.8)",
              borderColor: isSearchOpen
                ? "transparent"
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
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer border"
            style={{
              background: aiSidebarOpen
                ? "linear-gradient(135deg, #2563eb, #7c3aed)"
                : isAmoled
                ? "rgba(37, 99, 235, 0.15)"
                : d
                ? "rgba(37, 99, 235, 0.12)"
                : "rgba(239, 246, 255, 0.9)",
              borderColor: aiSidebarOpen
                ? "transparent"
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


