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
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-500">[ PAGES: {pages.length} ]</span>
        <button
          onClick={addBlankPage}
          className="flex items-center gap-1 px-2.5 py-1 rounded-none border border-amber-600 bg-amber-500 text-white text-xs font-mono font-bold shadow-xs hover:bg-amber-600 transition-colors cursor-pointer"
        >
          <IcoPlus /> [ ADD PAGE ]
        </button>
      </div>

      <div className="flex flex-col gap-1.5 mt-1">
        {pages.map((pg, idx) => (
          <div
            key={pg.id}
            onClick={() => setActivePageIndex(idx)}
            className={`flex items-center justify-between p-2.5 rounded-none border transition-colors cursor-pointer ${
              activePageIndex === idx ? "border-amber-500 bg-amber-500/10 shadow-xs" : "border-slate-800 hover:border-slate-600"
            }`}
            style={{ background: activePageIndex === idx ? undefined : bgInput }}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-6 h-6 rounded-none border flex items-center justify-center text-xs font-mono font-bold ${
                  activePageIndex === idx ? "bg-amber-500 border-amber-600 text-white" : "bg-slate-800 border-slate-700 text-slate-300"
                }`}
              >
                {idx + 1}
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-mono font-medium">Page {idx + 1}</span>
                <span className="text-[10px] font-mono" style={{ color: textMut }}>
                  {pg.rotation !== 0 ? `Rotated ${pg.rotation}°` : "Standard Portrait"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  movePage(idx, idx - 1);
                }}
                disabled={idx === 0}
                title="Move up"
                className="p-1 rounded-none text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
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
                className="p-1 rounded-none text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
              >
                <IcoMoveDown />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  rotatePage(idx);
                }}
                title="Rotate 90°"
                className="p-1 rounded-none text-slate-400 hover:text-amber-400 cursor-pointer"
              >
                <IcoRotateCw />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  duplicatePage(idx);
                }}
                title="Duplicate page"
                className="p-1 rounded-none text-slate-400 hover:text-amber-400 cursor-pointer"
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
                className="p-1 rounded-none text-slate-400 hover:text-red-400 disabled:opacity-30 cursor-pointer"
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
