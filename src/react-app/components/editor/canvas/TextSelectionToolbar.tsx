import { FC, useState, useEffect } from "react";
import { OriginalTextSelectionInfo } from "../../../types/editor";
import { IcoEdit } from "../../common/Icons";

interface TextSelectionToolbarProps {
  selectionInfo: OriginalTextSelectionInfo | null;
  onEditOriginalText: (info: OriginalTextSelectionInfo) => void;
  onClearSelection: () => void;
  isDark: boolean;
  pageContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const TextSelectionToolbar: FC<TextSelectionToolbarProps> = ({
  selectionInfo,
  onEditOriginalText,
  onClearSelection,
  isDark,
  pageContainerRef,
}) => {
  const [copied, setCopied] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!selectionInfo || !pageContainerRef.current) {
      setCoords(null);
      return;
    }

    const containerRect = pageContainerRef.current.getBoundingClientRect();
    const selRect = selectionInfo.clientRect;

    // Calculate position relative to container
    const midX = selRect.left + selRect.width / 2 - containerRect.left;
    let topY = selRect.top - containerRect.top - 46; // 46px above selection

    // If too close to top of page container, place below selection
    if (topY < 10) {
      topY = selRect.bottom - containerRect.top + 10;
    }

    setCoords({
      x: Math.max(120, Math.min(containerRect.width - 120, midX)),
      y: topY,
    });
  }, [selectionInfo, pageContainerRef]);

  if (!selectionInfo || !coords) return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(selectionInfo.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditOriginalText(selectionInfo);
  };

  const bg = isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.98)";
  const border = isDark ? "rgba(245, 158, 11, 0.5)" : "#f59e0b";
  const textMain = isDark ? "#f8fafc" : "#0f172a";

  return (
    <div
      className="absolute z-40 flex items-center gap-1.5 px-2 py-1.5 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-150 animate-in fade-in zoom-in-95 select-none"
      style={{
        left: `${coords.x}px`,
        top: `${coords.y}px`,
        transform: "translateX(-50%)",
        background: bg,
        borderColor: border,
        color: textMain,
        boxShadow: isDark
          ? "0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6), 0 0 15px rgba(245, 158, 11, 0.2)"
          : "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 15px rgba(245, 158, 11, 0.2)",
      }}
    >
      {/* Detected format info badge */}
      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-[10px] font-mono font-semibold text-amber-500">
        <span>{selectionInfo.fontSize}pt</span>
        <span className="capitalize">{selectionInfo.fontFamily || "sans"}</span>
        {selectionInfo.isBold && <span className="font-bold">B</span>}
        {selectionInfo.isItalic && <span className="italic">I</span>}
        <span
          className="w-2.5 h-2.5 rounded-full border border-black/20 inline-block ml-0.5"
          style={{ background: selectionInfo.color }}
          title={`Color: ${selectionInfo.color}`}
        />
      </div>

      <div className="w-px h-4 bg-slate-500/30" />

      {/* Main Edit Text Button */}
      <button
        onClick={handleEdit}
        title="Edit this original text (replaces in-place with matching formatting)"
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold shadow-md transition-all duration-150 cursor-pointer"
      >
        <IcoEdit size={13} />
        <span>Edit Text</span>
      </button>

      {/* Copy Button */}
      <button
        onClick={handleCopy}
        title="Copy selected text"
        className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-500/20 active:scale-95 text-xs font-medium transition-colors cursor-pointer"
      >
        {copied ? (
          <span className="text-emerald-400 font-bold">✓ Copied</span>
        ) : (
          <span>📋 Copy</span>
        )}
      </button>

      {/* Dismiss Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClearSelection();
        }}
        title="Close selection menu"
        className="p-1 rounded-md hover:bg-red-500/20 hover:text-red-400 text-slate-400 transition-colors text-xs cursor-pointer ml-0.5"
      >
        ✕
      </button>
    </div>
  );
};
