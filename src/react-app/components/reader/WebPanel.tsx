import { FC, useState, KeyboardEvent } from "react";
import { useDark, useThemeMode } from "../../hooks/useTheme";
import { SectionTitle } from "../common/Primitives";
import { IcoGlobe, IcoLoader, IcoX } from "../common/Icons";

interface WebPanelProps {
  onLoad: (url: string) => void;
  loading: boolean;
  loaded: boolean;
  title: string;
  error: string;
  onClear: () => void;
}

export const WebPanel: FC<WebPanelProps> = ({ onLoad, loading, loaded, title, error, onClear }) => {
  const d = useDark();
  const themeMode = useThemeMode();
  const isAmoled = themeMode === "amoled";
  const [url, setUrl] = useState("");
  const submit = () => {
    const u = url.trim();
    if (u) onLoad(u.startsWith("http") ? u : `https://${u}`);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <SectionTitle>
        <span className="flex items-center gap-1.5">
          <IcoGlobe size={13} />
          Web Article URL
        </span>
      </SectionTitle>

      {/* URL input row */}
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <span
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: d ? "#64748b" : "#94a3b8" }}
          >
            <IcoGlobe size={14} />
          </span>
          <input
            type="url"
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && submit()}
            className="w-full rounded-none text-xs pl-8 pr-2.5 py-2 font-mono focus:outline-none focus:border-amber-500 transition-colors border shadow-2xs"
            style={{
              borderColor: isAmoled ? "#27272a" : d ? "#374151" : "#deded9",
              background: isAmoled ? "#09090b" : d ? "#1e293b" : "#ffffff",
              color: d ? "#f1f5f9" : "#0f172a",
            }}
          />
        </div>
        <button
          onClick={submit}
          disabled={loading || !url.trim()}
          className="flex items-center gap-1.5 rounded-none px-3.5 py-2 text-xs font-mono font-bold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shadow-xs cursor-pointer border border-amber-600 bg-amber-500 hover:bg-amber-600"
        >
          {loading ? (
            <span className="animate-spin inline-block">
              <IcoLoader size={13} />
            </span>
          ) : (
            "[ FETCH ]"
          )}
        </button>
      </div>

      {/* Error Feedback */}
      {error && (
        <div
          className="rounded-none px-3 py-2 text-xs flex items-start gap-2 border animate-fadeIn"
          style={{
            background: isAmoled ? "rgba(239,68,68,0.1)" : d ? "rgba(239,68,68,0.12)" : "#fef2f2",
            color: d ? "#fca5a5" : "#dc2626",
            borderColor: d ? "rgba(239,68,68,0.3)" : "#fecaca",
          }}
        >
          <span className="shrink-0 mt-0.5 text-red-500">⚠</span>
          <span className="text-[11px] font-mono leading-relaxed">{error}</span>
        </div>
      )}

      {/* Loaded page card */}
      {loaded && !error && (
        <div
          className="rounded-none px-3 py-2.5 flex items-center justify-between gap-2 border shadow-2xs transition-colors"
          style={{
            background: isAmoled ? "rgba(245,158,11,0.1)" : d ? "rgba(245,158,11,0.08)" : "rgba(254,243,199,0.7)",
            borderColor: isAmoled ? "rgba(245,158,11,0.3)" : d ? "rgba(245,158,11,0.25)" : "#fde68a",
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-amber-500 shrink-0">
              <IcoGlobe size={14} />
            </span>
            <span
              className="text-xs font-bold truncate"
              style={{ color: isAmoled ? "#fbbf24" : d ? "#fbbf24" : "#92400e" }}
            >
              {title}
            </span>
          </div>
          <button
            onClick={onClear}
            className="p-1 rounded-none hover:bg-amber-500/20 text-amber-500 hover:text-amber-600 transition-colors cursor-pointer shrink-0"
            title="Clear loaded article"
          >
            <IcoX size={13} />
          </button>
        </div>
      )}

      {/* Helper text */}
      {!loaded && !error && !loading && (
        <p className="text-[10px] leading-relaxed px-0.5" style={{ color: d ? "#64748b" : "#94a3b8" }}>
          Extract article text directly and listen with fluid browser speech narration.
        </p>
      )}
    </div>
  );
};

