import { FC } from "react";
import { PageState } from "../../../types/editor";
import {
  IcoPlus,
  IcoMoveUp,
  IcoMoveDown,
  IcoRotateCw,
  IcoCopy,
  IcoTrash,
} from "../../common/Icons";

interface PagesTabProps {
  pages: PageState[];
  activePageIndex: number;
  setActivePageIndex: (i: number) => void;
  addBlankPage: () => void;
  movePage: (from: number, to: number) => void;
  rotatePage: (index: number) => void;
  duplicatePage: (index: number) => void;
  deletePage: (index: number) => void;
  bgInput: string;
  textMut: string;
}

export const PagesTab: FC<PagesTabProps> = ({
  pages,
  activePageIndex,
  setActivePageIndex,
  addBlankPage,
  movePage,
  rotatePage,
  duplicatePage,
  deletePage,
  bgInput,
  textMut,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Document Pages ({pages.length})</span>
        <button
          onClick={addBlankPage}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 text-white text-xs font-semibold shadow hover:bg-amber-600 transition-colors"
        >
          <IcoPlus /> Add Blank Page
        </button>
      </div>

      <div className="flex flex-col gap-2 mt-1">
        {pages.map((pg, idx) => (
          <div
            key={pg.id}
            onClick={() => setActivePageIndex(idx)}
            className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
              activePageIndex === idx ? "border-amber-500 bg-amber-500/10 shadow-sm" : "border-slate-700 hover:border-slate-500"
            }`}
            style={{ background: activePageIndex === idx ? undefined : bgInput }}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                  activePageIndex === idx ? "bg-amber-500 text-white" : "bg-slate-700 text-slate-300"
                }`}
              >
                {idx + 1}
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-medium">Page {idx + 1}</span>
                <span className="text-[10px]" style={{ color: textMut }}>
                  {pg.rotation !== 0 ? `Rotated ${pg.rotation}°` : "Standard Portrait"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  movePage(idx, idx - 1);
                }}
                disabled={idx === 0}
                title="Move up"
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
              >
                <IcoMoveUp />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  movePage(idx, idx + 1);
                }}
                disabled={idx === pages.length - 1}
                title="Move down"
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30"
              >
                <IcoMoveDown />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  rotatePage(idx);
                }}
                title="Rotate 90°"
                className="p-1 text-slate-400 hover:text-amber-400"
              >
                <IcoRotateCw />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  duplicatePage(idx);
                }}
                title="Duplicate page"
                className="p-1 text-slate-400 hover:text-amber-400"
              >
                <IcoCopy />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deletePage(idx);
                }}
                disabled={pages.length <= 1}
                title="Delete page"
                className="p-1 text-slate-400 hover:text-red-400 disabled:opacity-30"
              >
                <IcoTrash />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
