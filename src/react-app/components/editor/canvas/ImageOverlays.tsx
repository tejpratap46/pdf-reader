import { FC, MouseEvent } from "react";
import { ImageItem } from "../../../types/editor";
import {
  IcoRotateCw,
  IcoRotateCcw,
  IcoTrash,
  IcoCopy,
  IcoLock,
  IcoUnlock,
} from "../../common/Icons";

export type ResizeHandleType = "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w";

interface ImageOverlaysProps {
  images: ImageItem[];
  selectedImageId: string | null;
  setSelectedImageId: (id: string | null) => void;
  startDrag: (e: MouseEvent, id: string, type: "text" | "image", initialX: number, initialY: number) => void;
  draggingId: string | null;
  startResizeImage: (e: MouseEvent, id: string, handle: ResizeHandleType, img: ImageItem) => void;
  resizingImageId: string | null;
  startRotateImage: (e: MouseEvent, id: string, initialRotation: number) => void;
  rotatingImageId: string | null;
  currentRotateAngle: number | null;
  updateImage: (id: string, updates: Partial<ImageItem>, pushToHistory?: boolean) => void;
  duplicateImage: (id: string) => void;
  removeImage: (id: string) => void;
}

export const ImageOverlays: FC<ImageOverlaysProps> = ({
  images,
  selectedImageId,
  setSelectedImageId,
  startDrag,
  draggingId,
  startResizeImage,
  resizingImageId,
  startRotateImage,
  rotatingImageId,
  currentRotateAngle,
  updateImage,
  duplicateImage,
  removeImage,
}) => {
  return (
    <>
      {images.map((img) => {
        const isSelected = selectedImageId === img.id;
        const isDragging = draggingId === img.id;
        const isResizing = resizingImageId === img.id;
        const isRotating = rotatingImageId === img.id;
        const isActive = isSelected || isDragging || isResizing || isRotating;
        const rotation = isRotating && currentRotateAngle !== null ? currentRotateAngle : (img.rotation || 0);
        const lockAspect = img.lockAspectRatio !== false; // default to true

        return (
          <div
            key={img.id}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImageId(img.id);
            }}
            onMouseDown={(e) => {
              setSelectedImageId(img.id);
              startDrag(e, img.id, "image", img.x, img.y);
            }}
            className={`absolute z-20 group select-none ${
              isActive
                ? "ring-2 ring-amber-500 border-2 border-amber-500 bg-amber-500/10 shadow-2xl z-30"
                : "border-2 border-dashed border-amber-500/60 hover:border-amber-500 hover:bg-amber-500/10 cursor-grab"
            } ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            style={{
              left: `${img.x}%`,
              top: `${img.y}%`,
              width: `${img.width}%`,
              height: `${img.height}%`,
              transform: `rotate(${rotation}deg)`,
              transformOrigin: "center center",
              touchAction: "none",
            }}
          >
            {/* Image Preview Content */}
            <img
              src={img.dataUrl}
              alt="overlay"
              className="w-full h-full object-contain pointer-events-none select-none drop-shadow-sm"
              draggable={false}
            />

            {/* Live Angle Indicator Badge when rotating */}
            {isRotating && (
              <div
                className="absolute -top-12 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-slate-900/95 border border-amber-500 text-amber-400 font-mono text-[11px] font-bold shadow-xl pointer-events-none z-40 whitespace-nowrap flex items-center gap-1"
                style={{ transform: `rotate(${-rotation}deg)` }}
              >
                <IcoRotateCw size={12} />
                <span>{Math.round(rotation)}°</span>
              </div>
            )}

            {/* Dimensions Badge when resizing */}
            {isResizing && (
              <div
                className="absolute -bottom-9 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900/95 border border-amber-500/80 text-amber-300 font-mono text-[10px] font-semibold shadow-xl pointer-events-none z-40 whitespace-nowrap"
                style={{ transform: `rotate(${-rotation}deg)` }}
              >
                {Math.round(img.width)}% × {Math.round(img.height)}%
              </div>
            )}

            {/* Interactive Handles (Visible when selected/active) */}
            {isActive && (
              <>
                {/* 1. Rotation Stem Line & Knob */}
                <div className="absolute left-1/2 -top-6 w-[2px] h-6 -translate-x-1/2 bg-amber-500 pointer-events-none" />
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startRotateImage(e, img.id, img.rotation || 0);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    updateImage(img.id, { rotation: 0 });
                  }}
                  title="Drag to rotate • Shift to snap • Double-click to reset"
                  className="absolute left-1/2 -top-8 -translate-x-1/2 w-6 h-6 rounded-full bg-white text-slate-800 border-2 border-amber-500 shadow-md cursor-grab active:cursor-grabbing hover:scale-125 transition-transform flex items-center justify-center pointer-events-auto z-40"
                >
                  <IcoRotateCw size={12} />
                </div>

                {/* 2. Corner Resize Handles */}
                {/* NW (Top-Left) */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startResizeImage(e, img.id, "nw", img);
                  }}
                  title="Resize Top-Left"
                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-amber-500 rounded-sm shadow cursor-nwse-resize hover:scale-125 transition-transform pointer-events-auto z-40"
                />

                {/* NE (Top-Right) */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startResizeImage(e, img.id, "ne", img);
                  }}
                  title="Resize Top-Right"
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-amber-500 rounded-sm shadow cursor-nesw-resize hover:scale-125 transition-transform pointer-events-auto z-40"
                />

                {/* SE (Bottom-Right) */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startResizeImage(e, img.id, "se", img);
                  }}
                  title="Resize Bottom-Right"
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-amber-500 rounded-sm shadow cursor-nwse-resize hover:scale-125 transition-transform pointer-events-auto z-40"
                />

                {/* SW (Bottom-Left) */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startResizeImage(e, img.id, "sw", img);
                  }}
                  title="Resize Bottom-Left"
                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-amber-500 rounded-sm shadow cursor-nesw-resize hover:scale-125 transition-transform pointer-events-auto z-40"
                />

                {/* 3. Edge Resize Handles */}
                {/* N (Top) */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startResizeImage(e, img.id, "n", img);
                  }}
                  title="Resize Height (Top)"
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-amber-500 rounded-sm shadow-sm cursor-ns-resize hover:scale-125 transition-transform pointer-events-auto z-40"
                />

                {/* S (Bottom) */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startResizeImage(e, img.id, "s", img);
                  }}
                  title="Resize Height (Bottom)"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-amber-500 rounded-sm shadow-sm cursor-ns-resize hover:scale-125 transition-transform pointer-events-auto z-40"
                />

                {/* W (Left) */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startResizeImage(e, img.id, "w", img);
                  }}
                  title="Resize Width (Left)"
                  className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-4 bg-white border border-amber-500 rounded-sm shadow-sm cursor-ew-resize hover:scale-125 transition-transform pointer-events-auto z-40"
                />

                {/* E (Right) */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startResizeImage(e, img.id, "e", img);
                  }}
                  title="Resize Width (Right)"
                  className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-4 bg-white border border-amber-500 rounded-sm shadow-sm cursor-ew-resize hover:scale-125 transition-transform pointer-events-auto z-40"
                />

                {/* 4. Quick Action Floating Toolbar (Upright) */}
                {!isRotating && !isResizing && (
                  <div
                    className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 backdrop-blur-md px-2 py-1 rounded-none border border-amber-500/50 text-[11px] font-mono text-white shadow-2xl pointer-events-auto z-50 whitespace-nowrap"
                    style={{ transform: `rotate(${-rotation}deg)` }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Rotate -90 */}
                    <button
                      onClick={() => {
                        const nextRot = (((img.rotation || 0) - 90) % 360 + 360) % 360;
                        updateImage(img.id, { rotation: nextRot });
                      }}
                      title="Rotate 90° counter-clockwise"
                      className="p-1 rounded-none hover:bg-slate-700 active:bg-amber-500 transition-colors text-amber-400"
                    >
                      <IcoRotateCcw size={13} />
                    </button>

                    {/* Rotate +90 */}
                    <button
                      onClick={() => {
                        const nextRot = (((img.rotation || 0) + 90) % 360 + 360) % 360;
                        updateImage(img.id, { rotation: nextRot });
                      }}
                      title="Rotate 90° clockwise"
                      className="p-1 rounded-none hover:bg-slate-700 active:bg-amber-500 transition-colors text-amber-400"
                    >
                      <IcoRotateCw size={13} />
                    </button>

                    {/* Reset rotation if rotated */}
                    {(img.rotation || 0) % 360 !== 0 && (
                      <button
                        onClick={() => updateImage(img.id, { rotation: 0 })}
                        title="Reset rotation to 0°"
                        className="px-1.5 py-0.5 rounded-none bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-white font-mono text-[10px] font-bold"
                      >
                        0°
                      </button>
                    )}

                    <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />

                    {/* Aspect Ratio Lock Toggle */}
                    <button
                      onClick={() => updateImage(img.id, { lockAspectRatio: !lockAspect })}
                      title={lockAspect ? "Aspect ratio locked (click to unlock)" : "Aspect ratio unlocked (click to lock)"}
                      className={`p-1 rounded-none transition-colors ${
                        lockAspect ? "text-amber-400 hover:bg-amber-500/20" : "text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {lockAspect ? <IcoLock size={12} /> : <IcoUnlock size={12} />}
                    </button>

                    {/* Duplicate */}
                    <button
                      onClick={() => duplicateImage(img.id)}
                      title="Duplicate image"
                      className="p-1 rounded-none hover:bg-slate-700 active:bg-amber-500 transition-colors text-slate-300"
                    >
                      <IcoCopy size={13} />
                    </button>

                    <div className="w-[1px] h-3.5 bg-slate-700 mx-0.5" />

                    {/* Remove */}
                    <button
                      onClick={() => removeImage(img.id)}
                      title="Remove image"
                      className="p-1 rounded-none hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors font-bold"
                    >
                      <IcoTrash />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Quick Remove Button on Hover when not selected */}
            {!isActive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(img.id);
                }}
                title="Remove image"
                className="absolute -top-2.5 -right-2.5 hidden group-hover:flex w-5 h-5 rounded-none border border-red-700 bg-red-500 text-white items-center justify-center text-[10px] font-mono shadow-xs font-bold hover:bg-red-600 z-30"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
    </>
  );
};
