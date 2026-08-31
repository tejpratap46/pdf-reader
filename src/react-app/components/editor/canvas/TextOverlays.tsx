import { FC, MouseEvent, useState, useRef, useEffect } from "react";
import { TextItem } from "../../../types/editor";

interface TextOverlaysProps {
  texts: TextItem[];
  startDrag: (e: MouseEvent, id: string, type: "text" | "image", initialX: number, initialY: number) => void;
  draggingId: string | null;
  resizingTextId: string | null;
  scale: number;
  updateText: (textId: string, updates: Partial<TextItem>) => void;
  removeText: (textId: string) => void;
  startResizeText: (e: MouseEvent, id: string, currentFontSize: number) => void;
  editingTextId?: string | null;
  setEditingTextId?: (id: string | null) => void;
}

const getCssFontFamily = (fam?: string) => {
  const f = (fam || "").toLowerCase();
  if (f.includes("times") || f.includes("serif") || f.includes("roman") || f.includes("georgia") || f.includes("cambria") || f.includes("garamond")) {
    return 'ui-serif, Georgia, "Times New Roman", Times, serif';
  }
  if (f.includes("courier") || f.includes("mono") || f.includes("consolas") || f.includes("code")) {
    return 'ui-monospace, "Courier New", Courier, monospace';
  }
  return 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
};

export const TextOverlays: FC<TextOverlaysProps> = ({
  texts,
  startDrag,
  draggingId,
  resizingTextId,
  scale,
  updateText,
  removeText,
  startResizeText,
  editingTextId,
  setEditingTextId,
}) => {
  const [internalEditingId, setInternalEditingId] = useState<string | null>(null);
  const activeEditId = editingTextId !== undefined ? editingTextId : internalEditingId;
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSetEditing = (id: string | null) => {
    if (setEditingTextId) {
      setEditingTextId(id);
    } else {
      setInternalEditingId(id);
    }
  };

  useEffect(() => {
    if (activeEditId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [activeEditId]);

  return (
    <>
      {texts.map((t) => {
        const isEditing = activeEditId === t.id;
        const isOriginal = t.isOriginalEdit;
        const bgFill = t.backgroundColor || (isOriginal ? "#ffffff" : "transparent");
        const resolvedFont = getCssFontFamily(t.fontFamily);

        return (
          <div
            key={t.id}
            onMouseDown={(e) => {
              if (isEditing) return;
              startDrag(e, t.id, "text", t.x, t.y);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              handleSetEditing(t.id);
            }}
            className={`absolute z-20 rounded select-none group transition-shadow ${
              isEditing
                ? "border-2 border-amber-500 shadow-2xl ring-2 ring-amber-500/40"
                : draggingId === t.id || resizingTextId === t.id
                ? "border-2 border-amber-500 bg-amber-500/20 shadow-xl scale-105"
                : isOriginal
                ? "border border-amber-400/40 hover:border-amber-500 shadow-sm cursor-grab active:cursor-grabbing"
                : "border-2 border-dashed border-amber-500/60 bg-amber-500/10 hover:border-amber-500 hover:bg-amber-500/20 cursor-grab active:cursor-grabbing"
            }`}
            style={{
              left: `${t.x}%`,
              top: `${t.y}%`,
              minWidth: t.width ? `${t.width}%` : "20px",
              minHeight: t.height ? `${t.height}%` : undefined,
              fontSize: `${t.fontSize * scale}px`,
              lineHeight: 1.0,
              color: t.color,
              fontWeight: t.isBold ? "bold" : "normal",
              fontStyle: t.isItalic ? "italic" : "normal",
              fontFamily: resolvedFont,
              backgroundColor: bgFill,
              padding: isOriginal ? "0px 1px" : "4px 6px",
              boxSizing: "border-box",
              touchAction: "none",
            }}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={t.text}
                onChange={(e) => updateText(t.id, { text: e.target.value })}
                onBlur={() => handleSetEditing(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") {
                    handleSetEditing(null);
                  }
                }}
                className="bg-transparent border-none outline-none w-full p-0 m-0 block"
                style={{
                  fontSize: `${t.fontSize * scale}px`,
                  lineHeight: 1.0,
                  color: t.color,
                  fontWeight: t.isBold ? "bold" : "normal",
                  fontStyle: t.isItalic ? "italic" : "normal",
                  fontFamily: resolvedFont,
                  width: "100%",
                  minWidth: `${Math.max(60, t.text.length * (t.fontSize * scale * 0.6))}px`,
                }}
              />
            ) : (
              <span className="pointer-events-none whitespace-pre-wrap block leading-none">{t.text}</span>
            )}

            {/* Top Bar Quick Controls on Hover (when not inline editing) */}
            {!isEditing && (
              <div className="absolute -top-8 left-0 hidden group-hover:flex items-center gap-1 bg-slate-950/95 backdrop-blur-md px-2 py-1 rounded-none border border-amber-500/50 text-[10px] font-mono text-white shadow-xl pointer-events-auto z-30">
                {isOriginal && (
                  <span className="text-[9px] font-mono font-semibold text-amber-400 bg-amber-500/20 px-1 py-0.2 rounded-none mr-0.5">
                    [ORIGINAL]
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetEditing(t.id);
                  }}
                  title="Edit text inline"
                  className="px-1.5 py-0.5 rounded-none hover:bg-amber-500 text-amber-300 hover:text-white font-mono font-semibold transition-colors"
                >
                  ✏️ Edit
                </button>
                <div className="w-px h-3 bg-slate-700 mx-0.5" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateText(t.id, { fontSize: Math.max(8, t.fontSize - 2) });
                  }}
                  title="Decrease font size"
                  className="px-1.5 py-0.5 rounded-none hover:bg-amber-500 font-mono font-bold transition-colors"
                >
                  A-
                </button>
                <span className="font-mono text-[9px] text-amber-400">{t.fontSize}px</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateText(t.id, { fontSize: Math.min(140, t.fontSize + 2) });
                  }}
                  title="Increase font size"
                  className="px-1.5 py-0.5 rounded-none hover:bg-amber-500 font-mono font-bold transition-colors"
                >
                  A+
                </button>
                <div className="w-px h-3 bg-slate-700 mx-0.5" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateText(t.id, { isBold: !t.isBold });
                  }}
                  title="Toggle Bold"
                  className={`px-1.5 py-0.5 rounded-none font-mono font-bold transition-colors ${
                    t.isBold ? "bg-amber-500 text-white" : "hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  B
                </button>
              </div>
            )}

            {/* Remove Button */}
            {!isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeText(t.id);
                }}
                title="Remove text box"
                className="absolute -top-3 -right-3 hidden group-hover:flex w-5 h-5 rounded-none border border-red-700 bg-red-500 text-white items-center justify-center text-[10px] font-mono shadow-xs font-bold hover:bg-red-600 pointer-events-auto z-30 cursor-pointer"
              >
                ✕
              </button>
            )}

            {/* Bottom Right Resizer Handle */}
            {!isEditing && (
              <div
                onMouseDown={(e) => startResizeText(e, t.id, t.fontSize)}
                title="Drag to resize text font size"
                className="absolute -bottom-2 -right-2 w-3.5 h-3.5 rounded-none bg-amber-500 border border-white shadow-xs cursor-nwse-resize hover:scale-125 transition-transform flex items-center justify-center pointer-events-auto z-30"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-none" />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
