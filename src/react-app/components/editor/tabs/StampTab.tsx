import { FC } from "react";
import { PageState } from "../../../types/editor";
import { IcoTrash } from "../../common/Icons";

interface StampTabProps {
  addStampToPage: (preset?: string) => void;
  stampText: string;
  setStampText: (t: string) => void;
  stampColor: string;
  setStampColor: (c: string) => void;
  stampOpacity: number;
  setStampOpacity: (o: number) => void;
  stampRotation: number;
  setStampRotation: (r: number) => void;
  removeStamp: (id: string) => void;
  activePage?: PageState;
  border: string;
  bgInput: string;
  bgSide: string;
  textMain: string;
  textMut: string;
}

export const StampTab: FC<StampTabProps> = ({
  addStampToPage,
  stampText,
  setStampText,
  stampColor,
  setStampColor,
  stampOpacity,
  setStampOpacity,
  stampRotation,
  setStampRotation,
  removeStamp,
  activePage,
  border,
  bgInput,
  bgSide,
  textMain,
  textMut,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Stamps &amp; Watermarks</span>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-400">Quick Presets</span>
        <div className="grid grid-cols-2 gap-2">
          {["CONFIDENTIAL", "APPROVED", "DRAFT", "SAMPLE", "URGENT", "DO NOT COPY"].map((p) => (
            <button
              key={p}
              onClick={() => addStampToPage(p)}
              className="py-2 px-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-bold tracking-wider hover:bg-red-500/20 transition-all"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3 rounded-lg border" style={{ borderColor: border, background: bgInput }}>
        <span className="text-xs font-semibold">Custom Watermark</span>
        <input
          type="text"
          value={stampText}
          onChange={(e) => setStampText(e.target.value)}
          className="w-full p-2 rounded text-xs border focus:outline-none"
          style={{ background: bgSide, color: textMain, borderColor: border }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: textMut }}>
            Color
          </span>
          <input
            type="color"
            value={stampColor}
            onChange={(e) => setStampColor(e.target.value)}
            className="w-8 h-8 rounded border cursor-pointer bg-transparent"
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span style={{ color: textMut }}>Opacity</span>
            <span>{Math.round(stampOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={0.9}
            step={0.05}
            value={stampOpacity}
            onChange={(e) => setStampOpacity(parseFloat(e.target.value))}
            className="w-full accent-amber-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs">
            <span style={{ color: textMut }}>Angle</span>
            <span>{stampRotation}°</span>
          </div>
          <input
            type="range"
            min={-90}
            max={90}
            step={5}
            value={stampRotation}
            onChange={(e) => setStampRotation(parseInt(e.target.value))}
            className="w-full accent-amber-500"
          />
        </div>
        <button
          onClick={() => addStampToPage()}
          className="w-full py-2 rounded-lg bg-amber-500 text-white text-xs font-bold shadow hover:bg-amber-600 transition-all"
        >
          + Add Custom Watermark
        </button>
      </div>

      {activePage && activePage.stamps.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-400">Active Stamps</span>
          {activePage.stamps.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-2 rounded bg-slate-800 border border-slate-700 text-xs">
              <span className="font-bold tracking-wider" style={{ color: s.color }}>
                {s.text}
              </span>
              <button onClick={() => removeStamp(s.id)} className="text-red-400 hover:text-red-300">
                <IcoTrash />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
