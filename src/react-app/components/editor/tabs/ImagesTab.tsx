import { FC, RefObject, ChangeEvent } from "react";
import { PageState, ImageItem } from "../../../types/editor";
import {
  IcoImage,
  IcoSignature,
  IcoTrash,
  IcoRotateCw,
  IcoRotateCcw,
  IcoCopy,
  IcoLock,
  IcoUnlock,
} from "../../common/Icons";

interface ImagesTabProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  setShowSigModal: (v: boolean) => void;
  activePage?: PageState;
  selectedImageId: string | null;
  setSelectedImageId: (id: string | null) => void;
  updateImage: (imgId: string, updates: Partial<ImageItem>, pushToHistory?: boolean) => void;
  duplicateImage: (imgId: string) => void;
  removeImage: (imgId: string) => void;
  border: string;
  bgInput: string;
  bgSide: string;
  textMain: string;
  textMut: string;
}

export const ImagesTab: FC<ImagesTabProps> = ({
  fileInputRef,
  handleImageUpload,
  setShowSigModal,
  activePage,
  selectedImageId,
  setSelectedImageId,
  updateImage,
  duplicateImage,
  removeImage,
  border,
  bgInput,
  bgSide,
  textMain,
  textMut,
}) => {
  const selectedImage = activePage?.images.find((img) => img.id === selectedImageId);
  const selectedIndex = selectedImage && activePage ? activePage.images.indexOf(selectedImage) : -1;

  const handleWidthChange = (newWidth: number) => {
    if (!selectedImage) return;
    const clampedW = Math.max(5, Math.min(100, newWidth));
    if (selectedImage.lockAspectRatio !== false) {
      const ratio = (selectedImage.width || 30) / (selectedImage.height || 20);
      const newHeight = Math.max(5, Math.min(100, Math.round(clampedW / ratio)));
      updateImage(selectedImage.id, { width: clampedW, height: newHeight });
    } else {
      updateImage(selectedImage.id, { width: clampedW });
    }
  };

  const handleHeightChange = (newHeight: number) => {
    if (!selectedImage) return;
    const clampedH = Math.max(5, Math.min(100, newHeight));
    if (selectedImage.lockAspectRatio !== false) {
      const ratio = (selectedImage.width || 30) / (selectedImage.height || 20);
      const newWidth = Math.max(5, Math.min(100, Math.round(clampedH * ratio)));
      updateImage(selectedImage.id, { width: newWidth, height: clampedH });
    } else {
      updateImage(selectedImage.id, { height: clampedH });
    }
  };

  const centerImage = () => {
    if (!selectedImage) return;
    const newX = Math.max(0, Math.round(50 - selectedImage.width / 2));
    const newY = Math.max(0, Math.round(50 - selectedImage.height / 2));
    updateImage(selectedImage.id, { x: newX, y: newY });
  };

  const scaleByPercent = (pct: number) => {
    if (!selectedImage) return;
    const newWidth = Math.max(5, Math.min(100, Math.round(selectedImage.width * (pct / 100))));
    const newHeight = Math.max(5, Math.min(100, Math.round(selectedImage.height * (pct / 100))));
    updateImage(selectedImage.id, { width: newWidth, height: newHeight });
  };

  return (
    <div className="flex flex-col gap-4">
      <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-500">[ IMAGES &amp; SIGNATURES ]</span>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-none border-2 border-dashed border-amber-500/50 bg-amber-500/10 text-amber-400 text-xs font-mono font-bold hover:bg-amber-500/20 transition-colors text-center cursor-pointer"
        >
          <IcoImage /> [ UPLOAD IMAGE ]
        </button>
        <button
          onClick={() => setShowSigModal(true)}
          className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-none border border-slate-700 bg-slate-800 text-slate-200 text-xs font-mono font-bold hover:bg-slate-700 transition-colors text-center cursor-pointer"
        >
          <IcoSignature /> [ SIGNATURE ]
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Selected Image Controls */}
      {selectedImage && (
        <div
          className="flex flex-col gap-3.5 p-3.5 rounded-none border border-amber-500/50 bg-slate-800/80 shadow-md relative"
          style={{ background: bgInput, borderColor: border }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: border }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-none bg-slate-900 border border-slate-700 p-0.5 flex items-center justify-center overflow-hidden">
                <img src={selectedImage.dataUrl} alt="selected" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-mono font-bold text-amber-400">
                  Image #{selectedIndex + 1}
                </span>
                <span className="text-[10px] font-mono" style={{ color: textMut }}>
                  {Math.round(selectedImage.width)}% × {Math.round(selectedImage.height)}% • {Math.round(selectedImage.rotation || 0)}°
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => duplicateImage(selectedImage.id)}
                title="Duplicate Image"
                className="p-1.5 rounded-none bg-slate-700 hover:bg-amber-500 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <IcoCopy size={13} />
              </button>
              <button
                onClick={() => removeImage(selectedImage.id)}
                title="Delete Image"
                className="p-1.5 rounded-none bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
              >
                <IcoTrash />
              </button>
            </div>
          </div>

          {/* 1. Rotation Controls */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold" style={{ color: textMain }}>
                Rotation Angle
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={-360}
                  max={360}
                  value={Math.round(selectedImage.rotation || 0)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    updateImage(selectedImage.id, { rotation: val });
                  }}
                  className="w-14 px-1.5 py-0.5 rounded-none text-xs border text-center font-mono focus:outline-none focus:border-amber-500"
                  style={{ background: bgSide, color: textMain, borderColor: border }}
                />
                <span className="text-xs font-mono font-bold" style={{ color: textMut }}>
                  °
                </span>
              </div>
            </div>

            {/* Rotation Slider */}
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={((((selectedImage.rotation || 0) + 180) % 360) + 360) % 360 - 180}
              onChange={(e) => updateImage(selectedImage.id, { rotation: parseInt(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />

            {/* Quick Rotate Preset Buttons */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              <button
                onClick={() => {
                  const r = (((selectedImage.rotation || 0) - 90) % 360 + 360) % 360;
                  updateImage(selectedImage.id, { rotation: r });
                }}
                title="Rotate 90° counter-clockwise"
                className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-none bg-slate-700 hover:bg-amber-500 text-slate-200 hover:text-white text-[11px] font-mono font-bold transition-colors cursor-pointer"
              >
                <IcoRotateCcw size={12} /> -90°
              </button>
              <button
                onClick={() => {
                  const r = (((selectedImage.rotation || 0) + 90) % 360 + 360) % 360;
                  updateImage(selectedImage.id, { rotation: r });
                }}
                title="Rotate 90° clockwise"
                className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-none bg-slate-700 hover:bg-amber-500 text-slate-200 hover:text-white text-[11px] font-mono font-bold transition-colors cursor-pointer"
              >
                <IcoRotateCw size={12} /> +90°
              </button>
              <button
                onClick={() => {
                  const r = (((selectedImage.rotation || 0) + 180) % 360 + 360) % 360;
                  updateImage(selectedImage.id, { rotation: r });
                }}
                title="Rotate 180°"
                className="flex items-center justify-center py-1.5 px-1 rounded-none bg-slate-700 hover:bg-amber-500 text-slate-200 hover:text-white text-[11px] font-mono font-bold transition-colors cursor-pointer"
              >
                180°
              </button>
              <button
                onClick={() => updateImage(selectedImage.id, { rotation: 0 })}
                title="Reset angle to 0°"
                className={`flex items-center justify-center py-1.5 px-1 rounded-none text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                  (selectedImage.rotation || 0) % 360 !== 0
                    ? "bg-amber-500 text-white hover:bg-amber-600"
                    : "bg-slate-700/50 text-slate-400"
                }`}
              >
                Reset
              </button>
            </div>
          </div>

          <div className="h-[1px]" style={{ background: border }} />

          {/* 2. Size & Proportions Controls */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold" style={{ color: textMain }}>
                Dimensions
              </span>
              <button
                onClick={() => updateImage(selectedImage.id, { lockAspectRatio: selectedImage.lockAspectRatio === false ? true : false })}
                className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-none border transition-colors cursor-pointer ${
                  selectedImage.lockAspectRatio !== false
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
                title="Toggle Aspect Ratio Lock"
              >
                {selectedImage.lockAspectRatio !== false ? (
                  <>
                    <IcoLock size={11} /> Locked
                  </>
                ) : (
                  <>
                    <IcoUnlock size={11} /> Free
                  </>
                )}
              </button>
            </div>

            {/* Width Slider & Input */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-mono" style={{ color: textMut }}>
                <span>Width (% page)</span>
                <span className="font-mono text-amber-400 font-bold">{Math.round(selectedImage.width)}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                value={Math.round(selectedImage.width)}
                onChange={(e) => handleWidthChange(parseInt(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Height Slider & Input */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-mono" style={{ color: textMut }}>
                <span>Height (% page)</span>
                <span className="font-mono text-amber-400 font-bold">{Math.round(selectedImage.height)}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                value={Math.round(selectedImage.height)}
                onChange={(e) => handleHeightChange(parseInt(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Quick Scale Presets */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              <button
                onClick={() => scaleByPercent(75)}
                className="py-1 px-1 rounded-none bg-slate-700 hover:bg-amber-500 text-slate-200 hover:text-white text-[10px] font-mono font-bold transition-colors text-center cursor-pointer"
              >
                -25%
              </button>
              <button
                onClick={() => scaleByPercent(125)}
                className="py-1 px-1 rounded-none bg-slate-700 hover:bg-amber-500 text-slate-200 hover:text-white text-[10px] font-mono font-bold transition-colors text-center cursor-pointer"
              >
                +25%
              </button>
              <button
                onClick={() => updateImage(selectedImage.id, { width: 40, height: 30 })}
                className="py-1 px-1 rounded-none bg-slate-700 hover:bg-amber-500 text-slate-200 hover:text-white text-[10px] font-mono font-bold transition-colors text-center cursor-pointer"
              >
                Default
              </button>
              <button
                onClick={centerImage}
                className="py-1 px-1 rounded-none bg-slate-700 hover:bg-amber-500 text-slate-200 hover:text-white text-[10px] font-mono font-bold transition-colors text-center cursor-pointer"
              >
                Center
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Images / Signatures List on current page */}
      {activePage && activePage.images.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase" style={{ color: textMut }}>
              [ PAGE IMAGES ({activePage.images.length}) ]
            </span>
            {selectedImageId && (
              <button
                onClick={() => setSelectedImageId(null)}
                className="text-[11px] font-mono text-amber-400 hover:underline cursor-pointer"
              >
                Deselect
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-0.5">
            {activePage.images.map((img, i) => {
              const isSelected = selectedImageId === img.id;
              return (
                <div
                  key={img.id}
                  onClick={() => setSelectedImageId(img.id)}
                  className={`flex items-center justify-between p-2 rounded-none border transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-amber-500/15 border-amber-500 shadow-xs"
                      : "bg-slate-800 hover:bg-slate-700/80 border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-12 rounded-none bg-slate-900 border border-slate-700 p-0.5 flex items-center justify-center overflow-hidden">
                      <img src={img.dataUrl} alt="thumb" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-xs font-mono font-bold ${isSelected ? "text-amber-400" : "text-slate-200"}`}>
                        Image #{i + 1}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {Math.round(img.width)}% × {Math.round(img.height)}%
                        {(img.rotation || 0) % 360 !== 0 && ` • ${Math.round(img.rotation || 0)}°`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateImage(img.id);
                      }}
                      title="Duplicate"
                      className="p-1 rounded-none text-slate-400 hover:text-slate-200 hover:bg-slate-600 transition-colors cursor-pointer"
                    >
                      <IcoCopy size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(img.id);
                      }}
                      title="Delete"
                      className="p-1 rounded-none text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors cursor-pointer"
                    >
                      <IcoTrash />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
