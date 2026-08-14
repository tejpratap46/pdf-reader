import { FC, RefObject, ChangeEvent } from "react";
import { TabMode, PageState, TextItem } from "../../types/editor";
import { IcoPages, IcoPen, IcoText, IcoStamp, IcoImage, IcoChevL } from "../common/Icons";
import { SidebarResizer } from "../reader/SidebarResizer";
import { PagesTab } from "./tabs/PagesTab";
import { DrawTab } from "./tabs/DrawTab";
import { TextTab } from "./tabs/TextTab";
import { StampTab } from "./tabs/StampTab";
import { ImagesTab } from "./tabs/ImagesTab";

interface EditorSidebarProps {
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean | ((prev: boolean) => boolean)) => void;
  sidebarWidth?: number;
  isDragging?: boolean;
  onResizeMouseDown?: (e: React.MouseEvent) => void;
  onResizeTouchStart?: (e: React.TouchEvent) => void;
  onResetWidth?: () => void;
  activeTab: TabMode;
  setActiveTab: (t: TabMode) => void;
  tool: "pen" | "highlighter" | "eraser" | "select";
  setTool: (t: "pen" | "highlighter" | "eraser" | "select") => void;

  // Pages tab props
  pages: PageState[];
  activePageIndex: number;
  setActivePageIndex: (i: number) => void;
  addBlankPage: () => void;
  movePage: (from: number, to: number) => void;
  rotatePage: (index: number) => void;
  duplicatePage: (index: number) => void;
  deletePage: (index: number) => void;

  // Draw tab props
  penColor: string;
  setPenColor: (c: string) => void;
  penSize: number;
  setPenSize: (s: number) => void;
  highlighterColor: string;
  setHighlighterColor: (c: string) => void;
  highlighterSize: number;
  setHighlighterSize: (s: number) => void;

  // Text tab props
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

  // Stamp tab props
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

  // Images tab props
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  setShowSigModal: (v: boolean) => void;
  removeImage: (imgId: string) => void;

  // Style tokens
  isDark: boolean;
  border: string;
  bgSide: string;
  bgInput: string;
  textMain: string;
  textMut: string;
}

export const EditorSidebar: FC<EditorSidebarProps> = ({
  sidebarOpen = true,
  setSidebarOpen,
  sidebarWidth = 320,
  isDragging = false,
  onResizeMouseDown,
  onResizeTouchStart,
  onResetWidth,
  activeTab,
  setActiveTab,
  tool,
  setTool,
  pages,
  activePageIndex,
  setActivePageIndex,
  addBlankPage,
  movePage,
  rotatePage,
  duplicatePage,
  deletePage,
  penColor,
  setPenColor,
  penSize,
  setPenSize,
  highlighterColor,
  setHighlighterColor,
  highlighterSize,
  setHighlighterSize,
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
  fileInputRef,
  handleImageUpload,
  setShowSigModal,
  removeImage,
  isDark,
  border,
  bgSide,
  bgInput,
  textMain,
  textMut,
}) => {
  return (
    <aside
      className={`relative flex flex-col shrink-0 overflow-hidden ${
        isDragging ? "" : "transition-[width] duration-300 ease-out"
      }`}
      style={{
        width: sidebarOpen ? sidebarWidth : 0,
        borderRight: sidebarOpen ? `1px solid ${border}` : "none",
        background: bgSide,
      }}
    >
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col"
        style={{
          width: Math.max(260, sidebarWidth),
          minWidth: 260,
        }}
      >
        {/* Navigation Tabs */}
        <div className="flex items-center border-b overflow-x-auto p-1 gap-1" style={{ borderColor: border, background: isDark ? "#0f172a" : "#f1f5f9" }}>
          {[
            { id: "pages", label: "Pages", icon: <IcoPages /> },
            { id: "draw", label: "Draw", icon: <IcoPen /> },
            { id: "text", label: "Text", icon: <IcoText /> },
            { id: "stamps", label: "Stamp", icon: <IcoStamp /> },
            { id: "images", label: "Images", icon: <IcoImage /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as TabMode);
                if (t.id === "draw" && tool === "select") setTool("pen");
                if (t.id !== "draw") setTool("select");
              }}
              className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                activeTab === t.id ? "bg-amber-500 text-white shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
          {setSidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              title="Collapse tools (Ctrl+B)"
              className="p-2 rounded-md text-slate-400 hover:text-slate-200 transition-colors cursor-pointer shrink-0"
            >
              <IcoChevL size={14} />
            </button>
          )}
        </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {activeTab === "pages" && (
          <PagesTab
            pages={pages}
            activePageIndex={activePageIndex}
            setActivePageIndex={setActivePageIndex}
            addBlankPage={addBlankPage}
            movePage={movePage}
            rotatePage={rotatePage}
            duplicatePage={duplicatePage}
            deletePage={deletePage}
            bgInput={bgInput}
            textMut={textMut}
          />
        )}

        {activeTab === "draw" && (
          <DrawTab
            tool={tool}
            setTool={setTool}
            penColor={penColor}
            setPenColor={setPenColor}
            penSize={penSize}
            setPenSize={setPenSize}
            highlighterColor={highlighterColor}
            setHighlighterColor={setHighlighterColor}
            highlighterSize={highlighterSize}
            setHighlighterSize={setHighlighterSize}
            border={border}
            bgInput={bgInput}
            textMut={textMut}
          />
        )}

        {activeTab === "text" && (
          <TextTab
            newText={newText}
            setNewText={setNewText}
            textFontSize={textFontSize}
            setTextFontSize={setTextFontSize}
            textColor={textColor}
            setTextColor={setTextColor}
            textBold={textBold}
            setTextBold={setTextBold}
            addTextToPage={addTextToPage}
            activePage={activePage}
            updateText={updateText}
            removeText={removeText}
            border={border}
            bgInput={bgInput}
            bgSide={bgSide}
            textMain={textMain}
            textMut={textMut}
          />
        )}

        {activeTab === "stamps" && (
          <StampTab
            addStampToPage={addStampToPage}
            stampText={stampText}
            setStampText={setStampText}
            stampColor={stampColor}
            setStampColor={setStampColor}
            stampOpacity={stampOpacity}
            setStampOpacity={setStampOpacity}
            stampRotation={stampRotation}
            setStampRotation={setStampRotation}
            removeStamp={removeStamp}
            activePage={activePage}
            border={border}
            bgInput={bgInput}
            bgSide={bgSide}
            textMain={textMain}
            textMut={textMut}
          />
        )}

        {activeTab === "images" && (
          <ImagesTab
            fileInputRef={fileInputRef}
            handleImageUpload={handleImageUpload}
            setShowSigModal={setShowSigModal}
            activePage={activePage}
            removeImage={removeImage}
          />
        )}
        </div>
      </div>

      {/* Resize Handle */}
      {sidebarOpen && onResizeMouseDown && onResizeTouchStart && (
        <SidebarResizer
          onMouseDown={onResizeMouseDown}
          onTouchStart={onResizeTouchStart}
          onDoubleClick={onResetWidth}
          isDragging={!!isDragging}
          currentWidth={sidebarWidth}
        />
      )}
    </aside>
  );
};
