import { FC } from "react";
import { PageState, TextItem } from "../../../types/editor";
import { IcoTrash } from "../../common/Icons";

interface TextTabProps {
  newText: string;
  setNewText: (t: string) => void;
  textFontSize: number;
  setTextFontSize: (s: number) => void;
  textColor: string;
  setTextColor: (c: string) => void;
  textBold: boolean;
  setTextBold: (b: boolean) => void;
  addTextToPage: () => void;
  activePage?: PageState;
  updateText: (textId: string, updates: Partial<TextItem>) => void;
  removeText: (textId: string) => void;
  border: string;
  bgInput: string;
  bgSide: string;
  textMain: string;
  textMut: string;
}

export const TextTab: FC<TextTabProps> = ({
  newText,
  setNewText,
  textFontSize,
  setTextFontSize,
  textColor,
  setTextColor,
  textBold,
  setTextBold,
  addTextToPage,
  activePage,
  updateText,
  removeText,
  border,
  bgInput,
  bgSide,
  textMain,
  textMut,
}) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Help banner for selecting original text */}
      <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs flex flex-col gap-1">
        <span className="font-bold text-amber-500 flex items-center gap-1">
          💡 Select & Edit Original Text
        </span>
        <p className="text-[11px] leading-relaxed" style={{ color: textMut }}>
          Highlight any text on the page canvas to quickly edit it with matching font size, color, and formatting!
        </p>
      </div>

      <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Add Text Box</span>

      <div className="flex flex-col gap-3 p-3 rounded-lg border" style={{ borderColor: border, background: bgInput }}>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold" style={{ color: textMut }}>
            Text Content
          </label>
          <textarea
            rows={3}
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="w-full p-2 rounded text-xs border focus:outline-none focus:border-amber-500"
            style={{ background: bgSide, color: textMain, borderColor: border }}
            placeholder="Type text here..."
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: textMut }}>
            Font Size
          </span>
          <input
            type="number"
            min={8}
            max={140}
            value={textFontSize}
            onChange={(e) => setTextFontSize(parseInt(e.target.value) || 16)}
            className="w-16 p-1 rounded text-xs border text-center font-mono"
            style={{ background: bgSide, color: textMain, borderColor: border }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: textMut }}>
            Text Color
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono" style={{ color: textMut }}>
              {textColor}
            </span>
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-8 h-8 rounded border cursor-pointer bg-transparent"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: textMut }}>
            Style
          </span>
          <button
            onClick={() => setTextBold(!textBold)}
            className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${
              textBold ? "bg-amber-500 text-white border-amber-500" : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            Bold
          </button>
        </div>

        <button
          onClick={addTextToPage}
          className="w-full py-2 rounded-lg bg-amber-500 text-white text-xs font-bold shadow hover:bg-amber-600 transition-all mt-1 cursor-pointer"
        >
          + Place Text on Page
        </button>
      </div>

      {/* Placed / Edited Texts List */}
      {activePage && activePage.texts.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <span className="text-xs font-semibold" style={{ color: textMut }}>
            Page Texts & Edits ({activePage.texts.length})
          </span>
          {activePage.texts.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-2 p-2.5 rounded-lg border text-xs transition-all"
              style={{
                background: bgInput,
                borderColor: t.isOriginalEdit ? "rgba(245, 158, 11, 0.4)" : border,
              }}
            >
              <div className="flex items-center justify-between gap-1.5">
                {t.isOriginalEdit && (
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500 text-white shrink-0">
                    Original Edit
                  </span>
                )}
                <input
                  type="text"
                  value={t.text}
                  onChange={(e) => updateText(t.id, { text: e.target.value })}
                  className="px-2 py-1 rounded text-xs border font-medium focus:outline-none focus:border-amber-500 flex-1 min-w-0"
                  style={{ background: bgSide, color: textMain, borderColor: border }}
                />
                <button
                  onClick={() => removeText(t.id)}
                  title="Remove text"
                  className="text-red-400 hover:text-red-300 p-1 cursor-pointer shrink-0"
                >
                  <IcoTrash />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px]" style={{ color: textMut }}>
                {/* Font Family selector */}
                <select
                  value={
                    t.fontFamily?.includes("serif")
                      ? "serif"
                      : t.fontFamily?.includes("mono")
                      ? "monospace"
                      : "sans-serif"
                  }
                  onChange={(e) => updateText(t.id, { fontFamily: e.target.value })}
                  className="px-1.5 py-0.5 rounded text-[10px] border font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
                  style={{ background: bgSide, color: textMain, borderColor: border }}
                >
                  <option value="sans-serif">Sans (Helvetica)</option>
                  <option value="serif">Serif (Times)</option>
                  <option value="monospace">Mono (Courier)</option>
                </select>

                {/* Font Size controls */}
                <div className="flex items-center gap-1">
                  <span>Size:</span>
                  <button
                    onClick={() => updateText(t.id, { fontSize: Math.max(8, t.fontSize - 1) })}
                    className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-amber-500 text-white font-bold cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono text-amber-500 font-semibold px-0.5">{t.fontSize}pt</span>
                  <button
                    onClick={() => updateText(t.id, { fontSize: Math.min(140, t.fontSize + 1) })}
                    className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-amber-500 text-white font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Styling and color controls */}
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1" title="Text Color">
                    <input
                      type="color"
                      value={t.color}
                      onChange={(e) => updateText(t.id, { color: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>

                  <button
                    onClick={() => updateText(t.id, { isBold: !t.isBold })}
                    title="Toggle Bold"
                    className={`px-1.5 py-0.5 rounded font-bold border cursor-pointer ${
                      t.isBold ? "bg-amber-500 text-white border-amber-500" : "bg-slate-700 text-slate-300 border-slate-600"
                    }`}
                  >
                    B
                  </button>

                  <button
                    onClick={() => updateText(t.id, { isItalic: !t.isItalic })}
                    title="Toggle Italic"
                    className={`px-1.5 py-0.5 rounded italic font-serif border cursor-pointer ${
                      t.isItalic ? "bg-amber-500 text-white border-amber-500" : "bg-slate-700 text-slate-300 border-slate-600"
                    }`}
                  >
                    I
                  </button>

                  {/* Cover Background toggle */}
                  <button
                    onClick={() =>
                      updateText(t.id, {
                        backgroundColor: t.backgroundColor && t.backgroundColor !== "transparent" ? "transparent" : "#ffffff",
                      })
                    }
                    title={
                      t.backgroundColor && t.backgroundColor !== "transparent"
                        ? "Background cover enabled (whiteout under text)"
                        : "Transparent background"
                    }
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                      t.backgroundColor && t.backgroundColor !== "transparent"
                        ? "bg-amber-500/20 text-amber-400 border-amber-500"
                        : "bg-slate-700 text-slate-400 border-slate-600"
                    }`}
                  >
                    Cover
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
