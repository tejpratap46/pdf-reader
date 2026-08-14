import { FC, useState } from "react";
import { useDark } from "../../hooks/useTheme";

interface SidebarResizerProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onDoubleClick?: () => void;
  isDragging: boolean;
  currentWidth: number;
  side?: "left" | "right";
}

export const SidebarResizer: FC<SidebarResizerProps> = ({
  onMouseDown,
  onTouchStart,
  onDoubleClick,
  isDragging,
  currentWidth,
  side = "left",
}) => {
  const isDark = useDark();
  const [isHovered, setIsHovered] = useState(false);

  const isLeftSidebar = side === "left";

  return (
    <div
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Drag to resize sidebar • Double-click to reset"
      className={`absolute top-0 bottom-0 w-2.5 z-30 cursor-col-resize select-none flex items-center justify-center transition-colors group ${
        isLeftSidebar ? "right-0" : "left-0"
      }`}
      style={{
        transform: isLeftSidebar ? "translateX(50%)" : "translateX(-50%)",
      }}
    >
      {/* Visual resize line */}
      <div
        className={`w-[2px] h-full transition-all duration-150 ${
          isDragging
            ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] w-[3px]"
            : isHovered
            ? "bg-amber-400/80 shadow-[0_0_6px_rgba(245,158,11,0.4)]"
            : "bg-transparent group-hover:bg-amber-400/50"
        }`}
      />

      {/* Grip pill indicator */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 w-4 h-9 rounded-full flex flex-col items-center justify-center gap-1 border transition-all duration-200 pointer-events-none shadow-sm ${
          isDragging || isHovered
            ? "opacity-100 scale-100"
            : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
        }`}
        style={{
          background: isDark ? "#1e293b" : "#ffffff",
          borderColor: isDragging || isHovered ? "#f59e0b" : isDark ? "#334155" : "#e2e8f0",
          color: isDragging || isHovered ? "#f59e0b" : isDark ? "#94a3b8" : "#64748b",
        }}
      >
        <div className="w-1 h-1 rounded-full bg-current opacity-80" />
        <div className="w-1 h-1 rounded-full bg-current opacity-80" />
        <div className="w-1 h-1 rounded-full bg-current opacity-80" />
      </div>

      {/* Floating Width Indicator Tooltip when dragging */}
      {isDragging && (
        <div
          className={`absolute top-8 ${
            isLeftSidebar ? "left-4" : "right-4"
          } px-2 py-1 rounded-md text-[11px] font-mono font-bold text-white shadow-lg pointer-events-none z-50 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100`}
          style={{
            background: "rgba(15, 23, 42, 0.92)",
            border: "1px solid rgba(245, 158, 11, 0.5)",
            backdropFilter: "blur(4px)",
          }}
        >
          {Math.round(currentWidth)}px
        </div>
      )}
    </div>
  );
};
