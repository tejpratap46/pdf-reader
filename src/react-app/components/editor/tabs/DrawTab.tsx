import { FC } from "react";
import { IcoPen, IcoHighlighter } from "../../common/Icons";

interface DrawTabProps {
  tool: "pen" | "highlighter" | "eraser" | "select";
  setTool: (t: "pen" | "highlighter" | "eraser" | "select") => void;
  penColor: string;
  setPenColor: (c: string) => void;
  penSize: number;
  setPenSize: (s: number) => void;
  highlighterColor: string;
  setHighlighterColor: (c: string) => void;
  highlighterSize: number;
  setHighlighterSize: (s: number) => void;
  border: string;
  bgInput: string;
  textMut: string;
}

export const DrawTab: FC<DrawTabProps> = ({
  tool,
  setTool,
  penColor,
  setPenColor,
  penSize,
  setPenSize,
  highlighterColor,
  setHighlighterColor,
  highlighterSize,
  setHighlighterSize,
  border,
  bgInput,
  textMut,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Freehand &amp; Highlighter</span>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setTool("pen")}
          className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
            tool === "pen" ? "border-amber-500 bg-amber-500 text-white" : "border-slate-700 bg-slate-800 text-slate-300"
          }`}
        >
          <IcoPen /> Pen Tool
        </button>
        <button
          onClick={() => setTool("highlighter")}
          className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
            tool === "highlighter" ? "border-amber-500 bg-amber-500 text-white" : "border-slate-700 bg-slate-800 text-slate-300"
          }`}
        >
          <IcoHighlighter /> Highlighter
        </button>
      </div>

      {tool === "pen" && (
        <div className="flex flex-col gap-3 p-3 rounded-lg border" style={{ borderColor: border, background: bgInput }}>
          <span className="text-xs font-semibold">Pen Color &amp; Size</span>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: textMut }}>
              Color
            </span>
            <input
              type="color"
              value={penColor}
              onChange={(e) => setPenColor(e.target.value)}
              className="w-8 h-8 rounded border cursor-pointer bg-transparent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span style={{ color: textMut }}>Stroke Size</span>
              <span>{penSize}px</span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              value={penSize}
              onChange={(e) => setPenSize(parseInt(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>
        </div>
      )}

      {tool === "highlighter" && (
        <div className="flex flex-col gap-3 p-3 rounded-lg border" style={{ borderColor: border, background: bgInput }}>
          <span className="text-xs font-semibold">Highlighter Options</span>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: textMut }}>
              Color
            </span>
            <div className="flex gap-1.5">
              {["#fef08a", "#bbf7d0", "#bae6fd", "#fbcfe8"].map((c) => (
                <button
                  key={c}
                  onClick={() => setHighlighterColor(c)}
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ background: c, borderColor: highlighterColor === c ? "#f59e0b" : "transparent" }}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span style={{ color: textMut }}>Width</span>
              <span>{highlighterSize}px</span>
            </div>
            <input
              type="range"
              min={10}
              max={40}
              value={highlighterSize}
              onChange={(e) => setHighlighterSize(parseInt(e.target.value))}
              className="w-full accent-amber-500"
            />
          </div>
        </div>
      )}

      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400">
        💡 <strong>Tip:</strong> Click and drag directly on the PDF preview page to draw lines or highlight text.
      </div>
    </div>
  );
};
