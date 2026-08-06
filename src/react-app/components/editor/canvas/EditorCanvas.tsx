import { FC, RefObject, MouseEvent } from "react";
import { PageState, TextItem } from "../../../types/editor";
import { TextOverlays } from "./TextOverlays";
import { StampOverlays } from "./StampOverlays";
import { ImageOverlays } from "./ImageOverlays";

interface EditorCanvasProps {
  previewContainerRef: RefObject<HTMLDivElement | null>;
  loading: boolean;
  activePage?: PageState;
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
  removeImage: (id: string) => void;
  isDark: boolean;
}

export const EditorCanvas: FC<EditorCanvasProps> = ({
  previewContainerRef,
  loading,
  activePage,
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
  removeImage,
  isDark,
}) => {
  return (
    <main
      ref={previewContainerRef}
      className="flex-1 overflow-auto flex items-center justify-center p-8 relative"
      style={{ background: isDark ? "#040711" : "#e2e8f0" }}
    >
      {loading && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-amber-500 uppercase tracking-widest">Opening Editor...</span>
        </div>
      )}

      {!loading && activePage && (
        <div
          className="relative shadow-2xl rounded-lg overflow-hidden"
          style={{
            width: canvasRef.current?.width || 600,
            height: canvasRef.current?.height || 800,
            background: "#ffffff",
          }}
        >
          {/* PDF Background Canvas */}
          <canvas ref={canvasRef} className="block" />

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
          />

          {/* Watermark / Stamp Overlays Layer */}
          <StampOverlays stamps={activePage.stamps} />

          {/* Image Overlays Layer */}
          <ImageOverlays images={activePage.images} startDrag={startDrag} draggingId={draggingId} removeImage={removeImage} />
        </div>
      )}
    </main>
  );
};
