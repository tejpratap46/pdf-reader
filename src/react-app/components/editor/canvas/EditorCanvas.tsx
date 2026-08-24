import { FC, RefObject, MouseEvent, useRef } from "react";
import { PageState, TextItem, ImageItem, OriginalTextSelectionInfo } from "../../../types/editor";
import { TextOverlays } from "./TextOverlays";
import { StampOverlays } from "./StampOverlays";
import { ImageOverlays, ResizeHandleType } from "./ImageOverlays";
import { CanvasTextSelector } from "./CanvasTextSelector";
import { TextSelectionToolbar } from "./TextSelectionToolbar";
import { useThemeMode, getPdfFilter } from "../../../hooks/useTheme";

interface EditorCanvasProps {
  previewContainerRef: RefObject<HTMLDivElement | null>;
  loading: boolean;
  activePage?: PageState;
  pdfJsDoc: any;
  activeOriginalIndex: number | null;
  activeRotation: number;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  drawOverlayRef: RefObject<HTMLCanvasElement | null>;
  tool: "pen" | "highlighter" | "eraser" | "select";
  handleMouseDown: (e: MouseEvent<HTMLCanvasElement>) => void;
  handleMouseMove: (e: MouseEvent<HTMLCanvasElement>) => void;
  handleMouseUp: () => void;
  startDrag: (e: MouseEvent, id: string, type: "text" | "image", initialX: number, initialY: number) => void;
  draggingId: string | null;
  resizingTextId: string | null;
  scale: number;
  updateText: (textId: string, updates: Partial<TextItem>) => void;
  removeText: (textId: string) => void;
  startResizeText: (e: MouseEvent, id: string, currentFontSize: number) => void;
  editingTextId: string | null;
  setEditingTextId: (id: string | null) => void;
  selectionInfo: OriginalTextSelectionInfo | null;
  setSelectionInfo: (info: OriginalTextSelectionInfo | null) => void;
  onEditOriginalText: (info: OriginalTextSelectionInfo) => void;
  selectedImageId: string | null;
  setSelectedImageId: (id: string | null) => void;
  startResizeImage: (e: MouseEvent, id: string, handle: ResizeHandleType, img: ImageItem) => void;
  resizingImageId: string | null;
  startRotateImage: (e: MouseEvent, id: string, initialRotation: number) => void;
  rotatingImageId: string | null;
  currentRotateAngle: number | null;
  updateImage: (id: string, updates: Partial<ImageItem>, pushToHistory?: boolean) => void;
  duplicateImage: (id: string) => void;
  removeImage: (id: string) => void;
  isDark: boolean;
}

export const EditorCanvas: FC<EditorCanvasProps> = ({
  previewContainerRef,
  loading,
  activePage,
  pdfJsDoc,
  activeOriginalIndex,
  activeRotation,
  canvasRef,
  drawOverlayRef,
  tool,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  startDrag,
  draggingId,
  resizingTextId,
  scale,
  updateText,
  removeText,
  startResizeText,
  editingTextId,
  setEditingTextId,
  selectionInfo,
  setSelectionInfo,
  onEditOriginalText,
  selectedImageId,
  setSelectedImageId,
  startResizeImage,
  resizingImageId,
  startRotateImage,
  rotatingImageId,
  currentRotateAngle,
  updateImage,
  duplicateImage,
  removeImage,
  isDark,
}) => {
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  const themeMode = useThemeMode();
  const isAmoled = themeMode === "amoled";

  return (
    <main
      ref={previewContainerRef}
      onClick={() => {
        setSelectedImageId(null);
      }}
      className="flex-1 overflow-auto flex items-center justify-center p-8 relative"
      style={{ background: isAmoled ? "#000000" : isDark ? "#040711" : "#e2e8f0" }}
    >
      {loading && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-amber-500 uppercase tracking-widest">Opening Editor...</span>
        </div>
      )}

      {!loading && activePage && (
        <div
          ref={pageContainerRef}
          className="relative shadow-2xl rounded-lg overflow-hidden"
          style={{
            width: canvasRef.current?.width || 600,
            height: canvasRef.current?.height || 800,
            background: isAmoled ? "#000000" : isDark ? "#1e293b" : "#ffffff",
            border: `1px solid ${isAmoled ? "#27272a" : isDark ? "#334155" : "#e2e8f0"}`,
          }}
          onClick={(e) => {
            // Clicking canvas itself deselects image if not clicked on an image
            if (e.target === e.currentTarget || e.target === canvasRef.current || e.target === drawOverlayRef.current) {
              setSelectedImageId(null);
            }
          }}
        >
          {/* PDF Background Canvas */}
          <canvas
            ref={canvasRef}
            className="block"
            style={{
              filter: getPdfFilter(themeMode),
              background: isAmoled ? "#000000" : isDark ? "#1e293b" : "#ffffff",
            }}
          />

          {/* Interactive Canvas Text Selection (directly mapped to PDF items with zero duplicate DOM text) */}
          <CanvasTextSelector
            pdfJsDoc={pdfJsDoc}
            activeOriginalIndex={activeOriginalIndex}
            activeRotation={activeRotation}
            scale={scale}
            tool={tool}
            canvasRef={canvasRef}
            selectionInfo={selectionInfo}
            onTextSelected={setSelectionInfo}
            onEditOriginalText={onEditOriginalText}
          />

          {/* Drawing Overlay Canvas */}
          <canvas
            ref={drawOverlayRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`absolute inset-0 z-10 ${tool !== "select" ? "cursor-crosshair pointer-events-auto" : "cursor-default pointer-events-none"}`}
          />

          {/* Text Overlays Interactive Layer */}
          <TextOverlays
            texts={activePage.texts}
            startDrag={startDrag}
            draggingId={draggingId}
            resizingTextId={resizingTextId}
            scale={scale}
            updateText={updateText}
            removeText={removeText}
            startResizeText={startResizeText}
            editingTextId={editingTextId}
            setEditingTextId={setEditingTextId}
          />

          {/* Watermark / Stamp Overlays Layer */}
          <StampOverlays stamps={activePage.stamps} />

          {/* Image Overlays Layer */}
          <ImageOverlays
            images={activePage.images}
            selectedImageId={selectedImageId}
            setSelectedImageId={setSelectedImageId}
            startDrag={startDrag}
            draggingId={draggingId}
            startResizeImage={startResizeImage}
            resizingImageId={resizingImageId}
            startRotateImage={startRotateImage}
            rotatingImageId={rotatingImageId}
            currentRotateAngle={currentRotateAngle}
            updateImage={updateImage}
            duplicateImage={duplicateImage}
            removeImage={removeImage}
          />

          {/* Floating Action Pill for Selected Text */}
          <TextSelectionToolbar
            selectionInfo={selectionInfo}
            onEditOriginalText={onEditOriginalText}
            onClearSelection={() => setSelectionInfo(null)}
            isDark={isDark}
            pageContainerRef={pageContainerRef}
          />
        </div>
      )}
    </main>
  );
};
