import { FC, useState, useRef, useEffect, useCallback, ChangeEvent } from "react";
import { IcoX, IcoPen, IcoText, IcoUpload, IcoUndo, IcoTrash, IcoCheck } from "../common/Icons";

interface SignatureModalProps {
  showSigModal: boolean;
  setShowSigModal: (v: boolean) => void;
  onSaveSignature: (signatureDataUrl: string, aspectRatio: number) => void;
  bgCard: string;
  border: string;
  isDark?: boolean;
}

interface SigPoint {
  x: number;
  y: number;
  time: number;
  pressure?: number;
}

interface SigStroke {
  points: SigPoint[];
  color: string;
  baseWidth: number;
}

const INK_COLORS = [
  { id: "black", label: "Black", hex: "#0f172a" },
  { id: "blue", label: "Ink Blue", hex: "#1d4ed8" },
  { id: "navy", label: "Navy", hex: "#1e3a8a" },
  { id: "crimson", label: "Crimson", hex: "#b91c1c" },
];

const STROKE_WIDTHS = [
  { id: "fine", label: "Fine", value: 2 },
  { id: "regular", label: "Regular", value: 3.5 },
  { id: "bold", label: "Bold", value: 5.5 },
];

const FONT_STYLES = [
  { id: "caveat", name: "Modern Hand", font: "'Caveat', cursive", size: 44 },
  { id: "dancing", name: "Flowing Script", font: "'Dancing Script', cursive", size: 40 },
  { id: "greatvibes", name: "Classic Calligraphy", font: "'Great Vibes', cursive", size: 46 },
  { id: "brush", name: "Brush Cursive", font: "'Brush Script MT', 'Segoe Script', cursive", size: 42 },
];

export const SignatureModal: FC<SignatureModalProps> = ({
  showSigModal,
  setShowSigModal,
  onSaveSignature,
  bgCard,
  border,
  isDark = true,
}) => {
  const [activeTab, setActiveTab] = useState<"draw" | "type" | "upload">("draw");
  const [selectedColor, setSelectedColor] = useState<string>("#0f172a");
  const [selectedWidth, setSelectedWidth] = useState<number>(3.5);
  const [hasDrawn, setHasDrawn] = useState<boolean>(false);

  // Type signature state
  const [typedName, setTypedName] = useState<string>("John Doe");
  const [selectedFont, setSelectedFont] = useState<string>("caveat");

  // Upload signature state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [removeBg, setRemoveBg] = useState<boolean>(true);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  // Draw Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const strokesRef = useRef<SigStroke[]>([]);
  const currentStrokeRef = useRef<SigPoint[]>([]);

  // Setup High-DPI canvas
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, []);

  // Redraw all strokes with smooth Bézier interpolation
  const redrawStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    // Draw baseline guideline
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = isDark ? "rgba(148, 163, 184, 0.25)" : "rgba(148, 163, 184, 0.4)";
    ctx.lineWidth = 1;
    const lineY = rect.height - 38;
    ctx.moveTo(30, lineY);
    ctx.lineTo(rect.width - 30, lineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw "✕" signature indicator mark
    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = isDark ? "rgba(148, 163, 184, 0.4)" : "rgba(148, 163, 184, 0.6)";
    ctx.fillText("✕", 20, lineY + 1);

    // Render strokes
    for (const stroke of strokesRef.current) {
      if (stroke.points.length === 0) continue;

      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (stroke.points.length === 1) {
        ctx.beginPath();
        ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.baseWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      if (stroke.points.length === 2) {
        ctx.lineWidth = stroke.baseWidth;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        ctx.lineTo(stroke.points[1].x, stroke.points[1].y);
        ctx.stroke();
        continue;
      }

      // Smooth Bézier Spline interpolation
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const p0 = stroke.points[i - 1];
        const p1 = stroke.points[i];
        const p2 = stroke.points[i + 1];

        const mid1X = (p0.x + p1.x) / 2;
        const mid1Y = (p0.y + p1.y) / 2;
        const mid2X = (p1.x + p2.x) / 2;
        const mid2Y = (p1.y + p2.y) / 2;

        // Calculate velocity for subtle dynamic width
        const dt = Math.max(1, p2.time - p1.time);
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const velocity = dist / dt;
        const widthModifier = Math.max(0.7, Math.min(1.3, 1.15 - velocity * 0.05));
        const dynamicWidth = stroke.baseWidth * widthModifier;

        ctx.lineWidth = dynamicWidth;
        ctx.beginPath();
        ctx.moveTo(mid1X, mid1Y);
        ctx.quadraticCurveTo(p1.x, p1.y, mid2X, mid2Y);
        ctx.stroke();
      }
    }

    ctx.restore();
    setHasDrawn(strokesRef.current.length > 0);
  }, [isDark]);

  useEffect(() => {
    if (showSigModal && activeTab === "draw") {
      // Small timeout to ensure DOM rect is measured accurately
      const timer = setTimeout(() => {
        initCanvas();
        redrawStrokes();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showSigModal, activeTab, initCanvas, redrawStrokes]);

  // Pointer event handlers for ultra-smooth 120 FPS drawing
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const point: SigPoint = { x, y, time: performance.now(), pressure: e.pressure };

    currentStrokeRef.current = [point];

    // Draw initial dot
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = selectedColor;
      ctx.beginPath();
      ctx.arc(x, y, selectedWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newPoint: SigPoint = { x, y, time: performance.now(), pressure: e.pressure };

    const strokePoints = currentStrokeRef.current;
    strokePoints.push(newPoint);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const count = strokePoints.length;
    if (count < 3) {
      if (count === 2) {
        ctx.strokeStyle = selectedColor;
        ctx.lineWidth = selectedWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(strokePoints[0].x, strokePoints[0].y);
        ctx.lineTo(strokePoints[1].x, strokePoints[1].y);
        ctx.stroke();
      }
      return;
    }

    // Real-time incremental Bézier segment
    const p0 = strokePoints[count - 3];
    const p1 = strokePoints[count - 2];
    const p2 = strokePoints[count - 1];

    const mid1X = (p0.x + p1.x) / 2;
    const mid1Y = (p0.y + p1.y) / 2;
    const mid2X = (p1.x + p2.x) / 2;
    const mid2Y = (p1.y + p2.y) / 2;

    const dt = Math.max(1, p2.time - p1.time);
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const velocity = dist / dt;
    const widthModifier = Math.max(0.7, Math.min(1.3, 1.15 - velocity * 0.05));
    const dynamicWidth = selectedWidth * widthModifier;

    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = dynamicWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(mid1X, mid1Y);
    ctx.quadraticCurveTo(p1.x, p1.y, mid2X, mid2Y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (currentStrokeRef.current.length > 0) {
      strokesRef.current.push({
        points: [...currentStrokeRef.current],
        color: selectedColor,
        baseWidth: selectedWidth,
      });
      currentStrokeRef.current = [];
      redrawStrokes();
    }
  };

  const undoLastStroke = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    redrawStrokes();
  };

  const clearCanvas = () => {
    strokesRef.current = [];
    currentStrokeRef.current = [];
    redrawStrokes();
  };

  // Crop canvas transparent padding for a tight, high-res signature box
  const cropCanvasToSignature = (sourceCanvas: HTMLCanvasElement): { dataUrl: string; aspect: number } => {
    const ctx = sourceCanvas.getContext("2d");
    if (!ctx) return { dataUrl: sourceCanvas.toDataURL("image/png"), aspect: sourceCanvas.width / sourceCanvas.height };

    const dpr = window.devicePixelRatio || 1;
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    // Scan bounding box of drawn ink
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let minX = width, minY = height, maxX = 0, maxY = 0;
    let hasInk = false;

    // Skip baseline by only scanning alpha and checking if near baseline color
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const a = data[idx + 3];
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Ensure we are detecting the ink stroke (not empty background)
        if (a > 30 && !(r > 240 && g > 240 && b > 240)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          hasInk = true;
        }
      }
    }

    if (!hasInk || maxX <= minX || maxY <= minY) {
      return { dataUrl: sourceCanvas.toDataURL("image/png"), aspect: width / height };
    }

    const pad = Math.round(12 * dpr);
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(width - cropX, (maxX - minX) + pad * 2);
    const cropH = Math.min(height - cropY, (maxY - minY) + pad * 2);

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext("2d");

    if (cropCtx) {
      cropCtx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    }

    return {
      dataUrl: cropCanvas.toDataURL("image/png"),
      aspect: cropW / cropH,
    };
  };

  // Generate typed signature image
  const generateTypedSignature = (): { dataUrl: string; aspect: number } => {
    const canvas = document.createElement("canvas");
    const dpr = 2; // high-res
    const fontObj = FONT_STYLES.find((f) => f.id === selectedFont) || FONT_STYLES[0];
    const text = typedName.trim() || "Signature";

    canvas.width = 600 * dpr;
    canvas.height = 200 * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { dataUrl: "", aspect: 2.5 };

    ctx.scale(dpr, dpr);
    ctx.font = `${fontObj.size}px ${fontObj.font}`;
    ctx.fillStyle = selectedColor;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    ctx.fillText(text, 300, 100);

    return cropCanvasToSignature(canvas);
  };

  // Handle image upload with optional white background removal
  const handleSignatureUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);

        if (removeBg) {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            // Remove white/near-white paper backgrounds
            if (r > 200 && g > 200 && b > 200) {
              const luminance = (r + g + b) / 3;
              const alphaRatio = Math.max(0, (255 - luminance) / 55);
              d[i + 3] = Math.round(d[i + 3] * alphaRatio);
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }

        const cropped = cropCanvasToSignature(canvas);
        setUploadedImage(cropped.dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleInsert = () => {
    if (activeTab === "draw") {
      const canvas = canvasRef.current;
      if (!canvas || strokesRef.current.length === 0) return;
      const { dataUrl, aspect } = cropCanvasToSignature(canvas);
      onSaveSignature(dataUrl, aspect);
    } else if (activeTab === "type") {
      const { dataUrl, aspect } = generateTypedSignature();
      if (dataUrl) onSaveSignature(dataUrl, aspect);
    } else if (activeTab === "upload" && uploadedImage) {
      const tempImg = new Image();
      tempImg.onload = () => {
        const aspect = (tempImg.naturalWidth || 200) / (tempImg.naturalHeight || 80);
        onSaveSignature(uploadedImage, aspect);
      };
      tempImg.src = uploadedImage;
    }
    setShowSigModal(false);
  };

  if (!showSigModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        className="flex flex-col gap-4 p-5 rounded-2xl border shadow-2xl w-full max-w-[540px] transition-all"
        style={{ background: bgCard, borderColor: border }}
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <IcoPen />
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-100">Digital Signature</span>
              <span className="text-[11px] text-slate-400">Draw, type, or upload your personalized signature</span>
            </div>
          </div>
          <button
            onClick={() => setShowSigModal(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <IcoX size={16} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("draw")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
              activeTab === "draw"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <IcoPen /> Draw
          </button>
          <button
            onClick={() => setActiveTab("type")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
              activeTab === "type"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <IcoText /> Type
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
              activeTab === "upload"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <IcoUpload size={14} /> Upload
          </button>
        </div>

        {/* TAB 1: DRAW SIGNATURE */}
        {activeTab === "draw" && (
          <div className="flex flex-col gap-3">
            {/* Canvas Container */}
            <div className="relative border-2 border-dashed rounded-xl overflow-hidden bg-white shadow-inner select-none touch-none cursor-crosshair">
              <canvas
                ref={canvasRef}
                className="w-full h-[200px] block"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onPointerCancel={handlePointerUp}
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-medium tracking-wide">
                  Sign here with mouse, finger, or stylus
                </div>
              )}
            </div>

            {/* Drawing Controls Bar */}
            <div className="flex items-center justify-between gap-3 text-xs">
              {/* Color Presets */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-semibold mr-0.5">Ink:</span>
                {INK_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedColor(c.hex)}
                    title={c.label}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      selectedColor === c.hex
                        ? "border-amber-500 scale-110 shadow"
                        : "border-transparent hover:scale-105 opacity-80"
                    }`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>

              {/* Stroke Width Selector */}
              <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400 font-semibold mr-1">Pen:</span>
                {STROKE_WIDTHS.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setSelectedWidth(w.value)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      selectedWidth === w.value
                        ? "bg-amber-500 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>

              {/* Undo & Clear */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={undoLastStroke}
                  disabled={!hasDrawn}
                  title="Undo last stroke"
                  className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <IcoUndo />
                </button>
                <button
                  onClick={clearCanvas}
                  disabled={!hasDrawn}
                  title="Clear all"
                  className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-red-400 hover:text-red-300 hover:bg-red-500/20 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <IcoTrash />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TYPE SIGNATURE */}
        {activeTab === "type" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-400">Type Your Name</label>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Enter full name..."
                maxLength={40}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>

            {/* Font Style Options */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-400">Select Signature Style</span>
              <div className="grid grid-cols-2 gap-2">
                {FONT_STYLES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFont(f.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border bg-white text-slate-900 transition-all ${
                      selectedFont === f.id
                        ? "border-amber-500 ring-2 ring-amber-500/40 shadow-lg scale-[1.02]"
                        : "border-slate-300 hover:border-amber-400 opacity-90"
                    }`}
                  >
                    <span className="text-xs font-semibold text-slate-500 tracking-wider mb-1">
                      {f.name}
                    </span>
                    <span
                      className="text-2xl leading-none text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis max-w-full px-1"
                      style={{ fontFamily: f.font, color: selectedColor }}
                    >
                      {typedName.trim() || "Signature"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Presets for Typed Signature */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 font-semibold mr-1">Ink Color:</span>
              {INK_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedColor(c.hex)}
                  title={c.label}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    selectedColor === c.hex
                      ? "border-amber-500 scale-110 shadow"
                      : "border-transparent hover:scale-105 opacity-80"
                  }`}
                  style={{ background: c.hex }}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: UPLOAD SIGNATURE */}
        {activeTab === "upload" && (
          <div className="flex flex-col gap-3">
            <div
              onClick={() => uploadInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-700 hover:border-amber-500/80 rounded-xl bg-slate-900/60 hover:bg-slate-900 cursor-pointer transition-all text-center"
            >
              <div className="p-3 rounded-full bg-amber-500/10 text-amber-400">
                <IcoUpload size={22} />
              </div>
              <span className="text-xs font-bold text-slate-200">
                {uploadedImage ? "Change Signature Image" : "Upload Scanned Signature (PNG/JPG)"}
              </span>
              <span className="text-[11px] text-slate-400">
                Drop your signature file here or click to browse
              </span>
            </div>

            <input
              ref={uploadInputRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              className="hidden"
              onChange={handleSignatureUpload}
            />

            {uploadedImage && (
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs font-semibold text-slate-400">Preview</span>
                <div className="flex items-center justify-center p-3 rounded-lg bg-white overflow-hidden max-h-32">
                  <img src={uploadedImage} alt="signature preview" className="max-h-24 object-contain" />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={removeBg}
                    onChange={(e) => setRemoveBg(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <span>Automatically transparentize white background</span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Footer Action Buttons */}
        <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: border }}>
          <button
            onClick={() => setShowSigModal(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={
              (activeTab === "draw" && !hasDrawn) ||
              (activeTab === "type" && !typedName.trim()) ||
              (activeTab === "upload" && !uploadedImage)
            }
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-white shadow-lg hover:bg-amber-600 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all"
          >
            <IcoCheck size={14} /> Insert Signature
          </button>
        </div>
      </div>
    </div>
  );
};
