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
      <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Add Text Annotation</span>

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
            min={10}
            max={72}
            value={textFontSize}
            onChange={(e) => setTextFontSize(parseInt(e.target.value) || 16)}
            className="w-16 p-1 rounded text-xs border text-center"
            style={{ background: bgSide, color: textMain, borderColor: border }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: textMut }}>
            Text Color
          </span>
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="w-8 h-8 rounded border cursor-pointer bg-transparent"
          />
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
          className="w-full py-2 rounded-lg bg-amber-500 text-white text-xs font-bold shadow hover:bg-amber-600 transition-all mt-1"
        >
          + Place Text on Page
        </button>
      </div>

      {/* Placed Texts List */}
      {activePage && activePage.texts.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <span className="text-xs font-semibold text-slate-400">Placed Text Boxes ({activePage.texts.length})</span>
          {activePage.texts.map((t) => (
            <div key={t.id} className="flex flex-col gap-2 p-2.5 rounded bg-slate-800 border border-slate-700 text-xs">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={t.text}
                  onChange={(e) => updateText(t.id, { text: e.target.value })}
                  className="bg-slate-900 text-slate-100 px-2 py-1 rounded text-xs border border-slate-700 font-medium focus:outline-none focus:border-amber-500 flex-1 mr-2"
                />
                <button onClick={() => removeText(t.id)} className="text-red-400 hover:text-red-300 p-1">
                  <IcoTrash />
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span>Size:</span>
                  <button
                    onClick={() => updateText(t.id, { fontSize: Math.max(8, t.fontSize - 2) })}
                    className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-amber-500 text-white font-bold"
                  >
                    -
                  </button>
                  <span className="font-mono text-amber-400 font-semibold">{t.fontSize}px</span>
                  <button
                    onClick={() => updateText(t.id, { fontSize: Math.min(140, t.fontSize + 2) })}
                    className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-amber-500 text-white font-bold"
                  >
                    +
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={t.color}
                    onChange={(e) => updateText(t.id, { color: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                  />
                  <button
                    onClick={() => updateText(t.id, { isBold: !t.isBold })}
                    className={`px-1.5 py-0.5 rounded font-bold border ${
                      t.isBold ? "bg-amber-500 text-white border-amber-500" : "bg-slate-700 text-slate-400 border-slate-600"
                    }`}
                  >
                    B
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
