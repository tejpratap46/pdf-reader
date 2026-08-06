import { FC, MouseEvent } from "react";
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
}

export const TextOverlays: FC<TextOverlaysProps> = ({
  texts,
  startDrag,
  draggingId,
  resizingTextId,
  scale,
  updateText,
  removeText,
  startResizeText,
}) => {
  return (
    <>
      {texts.map((t) => (
        <div
          key={t.id}
          onMouseDown={(e) => startDrag(e, t.id, "text", t.x, t.y)}
          className={`absolute z-20 border-2 border-dashed p-2 rounded select-none group cursor-grab active:cursor-grabbing ${
            draggingId === t.id || resizingTextId === t.id
              ? "border-amber-500 bg-amber-500/20 shadow-xl scale-105"
              : "border-amber-500/60 bg-amber-500/10 hover:border-amber-500 hover:bg-amber-500/20"
          }`}
          style={{
            left: `${t.x}%`,
            top: `${t.y}%`,
            fontSize: `${t.fontSize * scale}px`,
            color: t.color,
            fontWeight: t.isBold ? "bold" : "normal",
            fontFamily: "sans-serif",
            touchAction: "none",
          }}
        >
          <span className="pointer-events-none">{t.text}</span>

          {/* Top Bar Quick Controls on Hover */}
          <div className="absolute -top-7 left-0 hidden group-hover:flex items-center gap-1 bg-slate-900/90 backdrop-blur-md px-1.5 py-0.5 rounded border border-amber-500/40 text-[10px] text-white shadow-lg pointer-events-auto z-30">
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateText(t.id, { fontSize: Math.max(8, t.fontSize - 2) });
              }}
              title="Decrease font size"
              className="px-1.5 py-0.5 rounded hover:bg-amber-500 font-bold"
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
              className="px-1.5 py-0.5 rounded hover:bg-amber-500 font-bold"
            >
              A+
            </button>
          </div>

          {/* Remove Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeText(t.id);
            }}
            title="Remove text box"
            className="absolute -top-3 -right-3 hidden group-hover:flex w-5 h-5 rounded-full bg-red-500 text-white items-center justify-center text-[10px] shadow font-bold hover:bg-red-600 pointer-events-auto z-30"
          >
            ✕
          </button>

          {/* Bottom Right Resizer Handle */}
          <div
            onMouseDown={(e) => startResizeText(e, t.id, t.fontSize)}
            title="Drag to resize text box"
            className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow cursor-nwse-resize hover:scale-125 transition-transform flex items-center justify-center pointer-events-auto z-30"
          >
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
          </div>
        </div>
      ))}
    </>
  );
};
