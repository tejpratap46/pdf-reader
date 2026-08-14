import { FC } from "react";
import {
  IcoX,
  IcoUndo,
  IcoChevL,
  IcoChevR,
  IcoZoomOut,
  IcoZoomIn,
  IcoDownload,
  IcoSave,
  IcoPanel,
} from "../common/Icons";

interface EditorHeaderProps {
  sidebarOpen?: boolean;
  setSidebarOpen?: (fn: (o: boolean) => boolean) => void;
  fileName: string;
  onClose: () => void;
  historyLength: number;
  undo: () => void;
  activePageIndex: number;
  setActivePageIndex: (fn: (p: number) => number) => void;
  pagesLength: number;
  scale: number;
  setScale: (fn: (s: number) => number) => void;
  exportPdf: (downloadOnly: boolean) => void;
  saving: boolean;
  savingAction?: "save" | "download" | null;
  saveProgress?: { progress: number; stage: string } | null;
  border: string;
  bgCard: string;
  bgInput: string;
  textMain: string;
}

export const EditorHeader: FC<EditorHeaderProps> = ({
  sidebarOpen,
  setSidebarOpen,
  fileName,
  onClose,
  historyLength,
  undo,
  activePageIndex,
  setActivePageIndex,
  pagesLength,
  scale,
  setScale,
  exportPdf,
  saving,
  savingAction,
  saveProgress,
  border,
  bgCard,
  bgInput,
  textMain,
}) => {
  const percentText = saveProgress ? `${Math.round(saveProgress.progress * 100)}%` : "";

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b shrink-0 shadow-md backdrop-blur-lg" style={{ background: bgCard, borderColor: border }}>
      <div className="flex items-center gap-3">
        {setSidebarOpen && (
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            title={`${sidebarOpen ? "Collapse" : "Expand"} sidebar (Ctrl+B)`}
            className="p-1.5 rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center border"
            style={{
              borderColor: border,
              color: sidebarOpen ? "#f59e0b" : textMain,
              background: sidebarOpen ? "rgba(245, 158, 11, 0.12)" : bgInput,
            }}
          >
            <IcoPanel />
          </button>
        )}
        <button
          onClick={onClose}
          disabled={saving}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer disabled:opacity-50"
          style={{ borderColor: border, background: bgInput, color: textMain }}
        >
          <IcoX /> Exit Editor
        </button>
        <div className="h-6 w-px" style={{ background: border }} />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500 text-white uppercase tracking-wider">
              PDF Editor
            </span>
            <span className="text-sm font-semibold truncate max-w-[200px] sm:max-w-[350px]" style={{ color: textMain }}>
              {fileName}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Controls */}
      <div className="hidden md:flex items-center gap-2">
        <button
          disabled={historyLength === 0 || saving}
          onClick={undo}
          title="Undo"
          className="p-2 rounded-lg border transition-colors disabled:opacity-40 cursor-pointer"
          style={{ borderColor: border, background: bgInput, color: textMain }}
        >
          <IcoUndo />
        </button>

        <div className="h-6 w-px mx-1" style={{ background: border }} />

        {/* Page Switcher */}
        <div className="flex items-center gap-1 text-xs">
          <button
            disabled={activePageIndex === 0 || saving}
            onClick={() => setActivePageIndex((p) => Math.max(0, p - 1))}
            className="p-1.5 rounded-md border disabled:opacity-40 cursor-pointer"
            style={{ borderColor: border, background: bgInput }}
          >
            <IcoChevL />
          </button>
          <span className="font-mono px-2">
            Page {activePageIndex + 1} / {pagesLength}
          </span>
          <button
            disabled={activePageIndex === pagesLength - 1 || saving}
            onClick={() => setActivePageIndex((p) => Math.min(pagesLength - 1, p + 1))}
            className="p-1.5 rounded-md border disabled:opacity-40 cursor-pointer"
            style={{ borderColor: border, background: bgInput }}
          >
            <IcoChevR />
          </button>
        </div>

        <div className="h-6 w-px mx-1" style={{ background: border }} />

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button
            disabled={saving}
            onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
            className="p-1.5 rounded-md border disabled:opacity-50 cursor-pointer"
            style={{ borderColor: border, background: bgInput }}
          >
            <IcoZoomOut />
          </button>
          <span className="font-mono text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
          <button
            disabled={saving}
            onClick={() => setScale((s) => Math.min(2.5, s + 0.1))}
            className="p-1.5 rounded-md border disabled:opacity-50 cursor-pointer"
            style={{ borderColor: border, background: bgInput }}
          >
            <IcoZoomIn />
          </button>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5">
        {saving && saveProgress?.stage && (
          <span className="hidden lg:inline text-xs font-medium text-amber-500 truncate max-w-[200px]">
            {saveProgress.stage}
          </span>
        )}
        <button
          onClick={() => exportPdf(true)}
          disabled={saving}
          title="Download edited PDF to your device"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
          style={{ borderColor: border, background: bgInput, color: textMain }}
        >
          {saving && savingAction === "download" ? (
            <span className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <IcoDownload />
          )}
          {saving && savingAction === "download"
            ? `Downloading (${percentText || "..."})`
            : "Download PDF"}
        </button>
        <button
          onClick={() => exportPdf(false)}
          disabled={saving}
          title="Apply edits and save to reader view"
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-75 disabled:hover:scale-100 cursor-pointer"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
        >
          {saving && savingAction === "save" ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <IcoSave />
          )}
          {saving && savingAction === "save"
            ? `Saving (${percentText || "..."})`
            : "Apply & Save"}
        </button>
      </div>
    </header>
  );
};
