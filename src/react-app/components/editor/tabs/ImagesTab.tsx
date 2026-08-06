import { FC, RefObject, ChangeEvent } from "react";
import { PageState } from "../../../types/editor";
import { IcoImage, IcoSignature, IcoTrash } from "../../common/Icons";

interface ImagesTabProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleImageUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  setShowSigModal: (v: boolean) => void;
  activePage?: PageState;
  removeImage: (imgId: string) => void;
}

export const ImagesTab: FC<ImagesTabProps> = ({
  fileInputRef,
  handleImageUpload,
  setShowSigModal,
  activePage,
  removeImage,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Images &amp; Signatures</span>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-amber-500/50 bg-amber-500/10 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-all"
      >
        <IcoImage /> Upload Image (PNG/JPEG)
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg"
        className="hidden"
        onChange={handleImageUpload}
      />

      <button
        onClick={() => setShowSigModal(true)}
        className="flex items-center justify-center gap-2 py-3 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 transition-all"
      >
        <IcoSignature /> Draw Digital Signature
      </button>

      {activePage && activePage.images.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <span className="text-xs font-semibold text-slate-400">Embedded Images/Signatures</span>
          {activePage.images.map((img, i) => (
            <div key={img.id} className="flex items-center justify-between p-2 rounded bg-slate-800 border border-slate-700">
              <img src={img.dataUrl} alt="embedded" className="h-10 w-16 object-contain rounded bg-white p-0.5" />
              <span className="text-xs text-slate-400">Image #{i + 1}</span>
              <button onClick={() => removeImage(img.id)} className="text-red-400 hover:text-red-300">
                <IcoTrash />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
