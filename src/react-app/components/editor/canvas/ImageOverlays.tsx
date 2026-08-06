import { FC, MouseEvent } from "react";
import { ImageItem } from "../../../types/editor";

interface ImageOverlaysProps {
  images: ImageItem[];
  startDrag: (e: MouseEvent, id: string, type: "text" | "image", initialX: number, initialY: number) => void;
  draggingId: string | null;
  removeImage: (id: string) => void;
}

export const ImageOverlays: FC<ImageOverlaysProps> = ({ images, startDrag, draggingId, removeImage }) => {
  return (
    <>
      {images.map((img) => (
        <div
          key={img.id}
          onMouseDown={(e) => startDrag(e, img.id, "image", img.x, img.y)}
          className={`absolute z-20 border-2 border-dashed rounded group select-none cursor-grab active:cursor-grabbing transition-all ${
            draggingId === img.id ? "border-amber-500 bg-amber-500/20 shadow-xl scale-105" : "border-amber-500/70 hover:border-amber-500 hover:bg-amber-500/10"
          }`}
          style={{
            left: `${img.x}%`,
            top: `${img.y}%`,
            width: `${img.width}%`,
            height: `${img.height}%`,
            touchAction: "none",
          }}
        >
          <img src={img.dataUrl} alt="overlay" className="w-full h-full object-contain pointer-events-none" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeImage(img.id);
            }}
            title="Remove image"
            className="absolute -top-3 -right-3 hidden group-hover:flex w-5 h-5 rounded-full bg-red-500 text-white items-center justify-center text-[10px] shadow font-bold hover:bg-red-600"
          >
            ✕
          </button>
        </div>
      ))}
    </>
  );
};
