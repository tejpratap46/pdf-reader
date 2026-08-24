import { FC, useRef, useState, useEffect, RefObject } from "react";
import { PageSize, ResolvedTheme } from "../../types/reader";
import { SearchMatch } from "../../types/search";
import { useThemeMode, getPdfFilter } from "../../hooks/useTheme";

interface PdfPageCardProps {
  doc: any;
  pageNum: number;
  totalPages: number;
  scale: number;
  isActive: boolean;
  pageSize?: PageSize;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onPageClick: (pageNum: number) => void;
  dark: boolean;
  themeMode?: ResolvedTheme;
  pageMatches?: SearchMatch[];
  activeMatchIndex?: number;
}

export const PdfPageCard: FC<PdfPageCardProps> = ({
  doc,
  pageNum,
  totalPages,
  scale,
  isActive,
  pageSize,
  scrollContainerRef,
  onPageClick,
  dark,
  themeMode: propThemeMode,
  pageMatches = [],
  activeMatchIndex = -1,
}) => {
  const contextThemeMode = useThemeMode();
  const resolvedTheme = propThemeMode || contextThemeMode;
  const isAmoled = resolvedTheme === "amoled";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const [rendering, setRendering] = useState(false);

  const aspectRatio = pageSize?.aspectRatio || 612 / 792;
  const baseWidth = Math.min(850, pageSize?.width || 612);
  const scaledWidth = Math.round(baseWidth * scale);
  const scaledHeight = Math.round(scaledWidth / aspectRatio);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const el = containerRef.current;
    if (!container || !el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setIsNearViewport(true);
        }
      },
      {
        root: container,
        rootMargin: "800px 0px 800px 0px",
        threshold: 0,
      }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollContainerRef]);

  useEffect(() => {
    if (!isNearViewport || !doc || !canvasRef.current) return;
    let active = true;
    setRendering(true);

    doc.getPage(pageNum)
      .then((page: any) => {
        if (!active || !canvasRef.current) return;
        const targetScale = scaledWidth / page.getViewport({ scale: 1 }).width;
        const vp = page.getViewport({ scale: targetScale });
        const canvas = canvasRef.current;
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        page.render({ canvasContext: ctx, viewport: vp })
          .promise.then(() => {
            if (active) setRendering(false);
          })
          .catch(() => {
            if (active) setRendering(false);
          });
      })
      .catch(() => {
        if (active) setRendering(false);
      });

    return () => {
      active = false;
    };
  }, [doc, pageNum, scaledWidth, isNearViewport]);

  return (
    <div
      ref={containerRef}
      data-page-num={pageNum}
      onClick={() => onPageClick(pageNum)}
      className={`relative flex flex-col items-center group transition-all duration-200 rounded-xl overflow-hidden ${
        isActive ? "ring-2 ring-amber-500 shadow-2xl" : "shadow-lg hover:shadow-xl opacity-95 hover:opacity-100"
      }`}
      style={{
        width: "100%",
        maxWidth: scaledWidth,
        background: isAmoled ? "#000000" : dark ? "#1e293b" : "#ffffff",
        border: `1px solid ${isActive ? "#f59e0b" : isAmoled ? "#27272a" : dark ? "#334155" : "#e2e8f0"}`,
      }}
    >
      {/* Top Header Badge */}
      <div
        className="w-full flex items-center justify-between px-3 sm:px-4 py-2 border-b select-none transition-colors"
        style={{
          borderColor: isAmoled ? "#1e1e24" : dark ? "#334155" : "#f1f5f9",
          background: isActive
            ? isAmoled
              ? "rgba(245,158,11,0.16)"
              : dark
              ? "rgba(245,158,11,0.12)"
              : "rgba(254,243,199,0.7)"
            : isAmoled
            ? "rgba(0,0,0,0.85)"
            : dark
            ? "rgba(15,23,42,0.6)"
            : "rgba(248,250,252,0.8)",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
              isActive
                ? "bg-amber-500 text-white"
                : isAmoled
                ? "bg-zinc-900 text-zinc-400 border border-zinc-800"
                : dark
                ? "bg-slate-800 text-slate-400"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            Page {pageNum}
          </span>
          {isActive && <span className="text-[10px] text-amber-500 font-semibold tracking-wider uppercase">Active</span>}
        </div>
        <span className="text-[11px] font-mono" style={{ color: isAmoled ? "#71717a" : dark ? "#94a3b8" : "#64748b" }}>
          {pageNum} / {totalPages}
        </span>
      </div>

      {/* Canvas view or Loading placeholder */}
      <div className="relative w-full flex items-center justify-center overflow-hidden">
        {!isNearViewport && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 w-full" style={{ minHeight: Math.min(scaledHeight, 300) }}>
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-amber-500/80 font-medium">Page {pageNum}</span>
          </div>
        )}

        {isNearViewport && (
          <div className="relative w-full flex items-center justify-center">
            {rendering && (
              <div
                className="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-[1px]"
                style={{ background: isAmoled ? "rgba(0,0,0,0.5)" : dark ? "rgba(15,23,42,0.3)" : "rgba(255,255,255,0.3)" }}
              >
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500 text-white text-xs font-medium shadow-lg">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Rendering page {pageNum}...
                </div>
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="block w-full h-auto object-contain transition-opacity duration-150"
              style={{
                maxWidth: "100%",
                height: "auto",
                opacity: rendering ? 0.6 : 1,
                filter: getPdfFilter(resolvedTheme),
                background: isAmoled ? "#000000" : dark ? "#1e293b" : "#ffffff",
              }}
            />

            {/* Search Highlights Overlay */}
            {pageMatches && pageMatches.length > 0 && (
              <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                {pageMatches.map((match) => {
                  const isActiveMatch = match.globalIndex === activeMatchIndex;
                  return match.rects.map((rect, rIdx) => (
                    <div
                      key={`${match.id}-${rIdx}`}
                      id={isActiveMatch && rIdx === 0 ? `search-match-${match.globalIndex}` : undefined}
                      className={`absolute transition-all duration-150 ${
                        isActiveMatch
                          ? "bg-amber-500/80 ring-2 ring-amber-400 shadow-md rounded-[2px] z-20 animate-pulse"
                          : "bg-yellow-300/45 dark:bg-yellow-400/35 border border-yellow-500/50 rounded-[2px] z-10"
                      }`}
                      style={{
                        left: `${rect.x}%`,
                        top: `${rect.y}%`,
                        width: `${rect.width}%`,
                        height: `${rect.height}%`,
                      }}
                    />
                  ));
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

