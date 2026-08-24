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
    <div className="flex flex-col gap-3">
      <SectionTitle>
        <span className="flex items-center gap-1.5">
          <IcoGlobe />
          Web Page
        </span>
      </SectionTitle>

      {/* URL input row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: d ? "#6b7280" : "#9ca3af" }}>
            <IcoGlobe />
          </span>
          <input
            type="url"
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && submit()}
            className="w-full rounded-md text-xs pl-8 pr-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
            style={{ border: `1px solid ${isAmoled ? "#27272a" : d ? "#374151" : "#e5e7eb"}`, background: isAmoled ? "#09090b" : d ? "#1f2937" : "#fff", color: d ? "#f3f4f6" : "#111827" }}
          />
        </div>
        <button
          onClick={submit}
          disabled={loading || !url.trim()}
          className="flex items-center gap-1 rounded-md px-3 text-xs font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          style={{ background: "#f59e0b" }}
        >
          {loading ? <span className="animate-spin inline-block"><IcoLoader /></span> : "Fetch"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-md px-3 py-2 text-xs flex items-start gap-2"
          style={{
            background: d ? "rgba(239,68,68,0.1)" : "#fef2f2",
            color: d ? "#fca5a5" : "#dc2626",
            border: `1px solid ${d ? "rgba(239,68,68,0.25)" : "#fecaca"}`,
          }}
        >
          <span className="shrink-0 mt-0.5">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Loaded page info */}
      {loaded && !error && (
        <div
          className="rounded-md px-3 py-2 flex items-center justify-between gap-2"
          style={{
            background: d ? "rgba(245,158,11,0.08)" : "rgba(254,243,199,0.6)",
            border: `1px solid ${d ? "rgba(245,158,11,0.2)" : "#fde68a"}`,
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <IcoGlobe />
            <span className="text-xs font-medium truncate text-amber-600" style={{ color: d ? "#fbbf24" : "#92400e" }}>
              {title}
            </span>
          </div>
          <button onClick={onClear} className="shrink-0 text-amber-500 hover:text-amber-700 transition-colors">
            <IcoX />
          </button>
        </div>
      )}

      {/* Hint */}
      {!loaded && !error && !loading && (
        <p className="text-[10px] leading-relaxed" style={{ color: d ? "#6b7280" : "#9ca3af" }}>
          Enter any article or blog URL. The page text will be extracted and read aloud using the TTS engine.
          <br />
          <span className="text-amber-500/70">Note: Some sites block external access.</span>
        </p>
      )}
    </div>
  );
};
