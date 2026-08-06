import { FC, RefObject } from "react";
import { IcoX } from "../common/Icons";

interface SignatureModalProps {
  showSigModal: boolean;
  setShowSigModal: (v: boolean) => void;
  signatureCanvasRef: RefObject<HTMLCanvasElement | null>;
  sigDrawing: boolean;
  setSigDrawing: (v: boolean) => void;
  clearSignature: () => void;
  saveSignature: () => void;
  bgCard: string;
  border: string;
}

export const SignatureModal: FC<SignatureModalProps> = ({
  showSigModal,
  setShowSigModal,
  signatureCanvasRef,
  sigDrawing,
  setSigDrawing,
  clearSignature,
  saveSignature,
  bgCard,
  border,
}) => {
  if (!showSigModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col gap-4 p-6 rounded-2xl border shadow-2xl w-[450px]" style={{ background: bgCard, borderColor: border }}>
        <div className="flex justify-between items-center">
          <span className="text-base font-bold text-amber-500">Draw Your Signature</span>
          <button onClick={() => setShowSigModal(false)} className="text-slate-400 hover:text-white">
            <IcoX />
          </button>
        </div>

        <div className="border-2 border-dashed rounded-xl overflow-hidden bg-white cursor-crosshair">
          <canvas
            ref={signatureCanvasRef}
            width={400}
            height={180}
            onMouseDown={(e) => {
              setSigDrawing(true);
              const ctx = signatureCanvasRef.current?.getContext("2d");
              if (ctx) {
                const rect = signatureCanvasRef.current!.getBoundingClientRect();
                ctx.beginPath();
                ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
              }
            }}
            onMouseMove={(e) => {
              if (!sigDrawing) return;
              const ctx = signatureCanvasRef.current?.getContext("2d");
              if (ctx) {
                const rect = signatureCanvasRef.current!.getBoundingClientRect();
                ctx.lineWidth = 3;
                ctx.strokeStyle = "#0f172a";
                ctx.lineCap = "round";
                ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                ctx.stroke();
              }
            }}
            onMouseUp={() => setSigDrawing(false)}
            onMouseLeave={() => setSigDrawing(false)}
          />
        </div>

        <div className="flex justify-between items-center gap-2">
          <button onClick={clearSignature} className="px-3 py-1.5 rounded-lg text-xs font-medium border text-slate-400 hover:text-white border-slate-700">
            Clear Canvas
          </button>
          <div className="flex gap-2">
            <button onClick={() => setShowSigModal(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium border text-slate-400 hover:text-white border-slate-700">
              Cancel
            </button>
            <button onClick={saveSignature} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white shadow hover:bg-amber-600">
              Insert Signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
