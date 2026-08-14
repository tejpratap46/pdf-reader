import { PDFDocument, rgb, degrees, StandardFonts, PDFFont } from "pdf-lib";
import type { PageState, DrawStroke } from "../types/editor";

export interface PdfExportWorkerRequest {
  id: string;
  type: "EXPORT_PDF";
  payload: {
    pdfBuffer: ArrayBuffer;
    pages: PageState[];
  };
}

export interface PdfExportProgressMessage {
  id: string;
  type: "EXPORT_PROGRESS";
  progress: number; // 0 to 1
  stage: string;
}

export interface PdfExportSuccessMessage {
  id: string;
  type: "EXPORT_SUCCESS";
  payload: {
    pdfBuffer: ArrayBuffer;
    byteOffset: number;
    byteLength: number;
  };
}

export interface PdfExportErrorMessage {
  id: string;
  type: "EXPORT_ERROR";
  error: string;
}

export type PdfExportWorkerMessageIn = PdfExportWorkerRequest;
export type PdfExportWorkerMessageOut =
  | PdfExportProgressMessage
  | PdfExportSuccessMessage
  | PdfExportErrorMessage;

/**
 * Sanitizes text to prevent WinAnsi encoding crashes with standard PDF fonts
 */
function sanitizeTextForStandardFont(text: string): string {
  if (!text) return "";
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2014/g, "--")
    .replace(/\u2013/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "*")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x00-\xFF]/g, "?");
}

/**
 * Converts a data URL or URL into Uint8Array without fetch overhead for base64
 */
async function dataUrlToUint8Array(dataUrl: string): Promise<Uint8Array> {
  if (dataUrl.startsWith("data:")) {
    const commaIndex = dataUrl.indexOf(",");
    if (commaIndex !== -1) {
      const base64 = dataUrl.substring(commaIndex + 1);
      try {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      } catch {
        // Fallback to fetch if atob fails on URL-encoded data
      }
    }
  }
  const res = await fetch(dataUrl);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * Font cache to lazily embed only standard fonts that are actually used
 */
class LazyFontManager {
  private fontMap = new Map<StandardFonts, Promise<PDFFont>>();

  constructor(private doc: PDFDocument) {}

  public async getFont(fontFamily: string | undefined, isBold: boolean, isItalic: boolean): Promise<PDFFont> {
    const fam = (fontFamily || "").toLowerCase();
    let fontName: StandardFonts;

    if (
      fam.includes("times") ||
      fam.includes("serif") ||
      fam.includes("roman") ||
      fam.includes("georgia") ||
      fam.includes("cambria") ||
      fam.includes("garamond")
    ) {
      if (isBold && isItalic) fontName = StandardFonts.TimesRomanBoldItalic;
      else if (isBold) fontName = StandardFonts.TimesRomanBold;
      else if (isItalic) fontName = StandardFonts.TimesRomanItalic;
      else fontName = StandardFonts.TimesRoman;
    } else if (
      fam.includes("courier") ||
      fam.includes("mono") ||
      fam.includes("consolas") ||
      fam.includes("code")
    ) {
      if (isBold && isItalic) fontName = StandardFonts.CourierBoldOblique;
      else if (isBold) fontName = StandardFonts.CourierBold;
      else if (isItalic) fontName = StandardFonts.CourierOblique;
      else fontName = StandardFonts.Courier;
    } else {
      if (isBold && isItalic) fontName = StandardFonts.HelveticaBoldOblique;
      else if (isBold) fontName = StandardFonts.HelveticaBold;
      else if (isItalic) fontName = StandardFonts.HelveticaOblique;
      else fontName = StandardFonts.Helvetica;
    }

    if (!this.fontMap.has(fontName)) {
      this.fontMap.set(fontName, this.doc.embedFont(fontName));
    }
    return this.fontMap.get(fontName)!;
  }

  public async getStandardFont(fontName: StandardFonts): Promise<PDFFont> {
    if (!this.fontMap.has(fontName)) {
      this.fontMap.set(fontName, this.doc.embedFont(fontName));
    }
    return this.fontMap.get(fontName)!;
  }
}

/**
 * Rasterize drawing and highlighter strokes using high-resolution OffscreenCanvas
 */
async function rasterizeStrokesToPng(
  strokes: DrawStroke[],
  pWidth: number,
  pHeight: number
): Promise<Uint8Array | null> {
  if (!strokes || strokes.length === 0) return null;
  if (typeof OffscreenCanvas === "undefined") return null;

  try {
    const scaleFactor = 2; // 2x high resolution
    const canvasWidth = Math.max(1, Math.round(pWidth * scaleFactor));
    const canvasHeight = Math.max(1, Math.round(pHeight * scaleFactor));

    const offCanvas = new OffscreenCanvas(canvasWidth, canvasHeight);
    const offCtx = offCanvas.getContext("2d");
    if (!offCtx) return null;

    offCtx.scale(scaleFactor, scaleFactor);

    strokes.forEach((st) => {
      if (st.points.length < 2) return;
      offCtx.beginPath();
      offCtx.strokeStyle = st.color;
      offCtx.lineWidth = st.size;
      offCtx.lineCap = "round";
      offCtx.lineJoin = "round";
      offCtx.globalAlpha = st.opacity;

      offCtx.moveTo((st.points[0].x / 100) * pWidth, (st.points[0].y / 100) * pHeight);
      for (let i = 1; i < st.points.length; i++) {
        offCtx.lineTo((st.points[i].x / 100) * pWidth, (st.points[i].y / 100) * pHeight);
      }
      offCtx.stroke();
      offCtx.globalAlpha = 1.0;
    });

    const blob = await offCanvas.convertToBlob({ type: "image/png" });
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (err) {
    console.error("Worker error rasterizing strokes with OffscreenCanvas:", err);
    return null;
  }
}

/**
 * Compile and render the modified PDF document in background
 */
async function compileEditedPdf(
  pdfBytes: Uint8Array,
  pages: PageState[],
  onProgress?: (progress: number, stage: string) => void
): Promise<Uint8Array> {
  onProgress?.(0.05, "Loading original document...");
  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const outDoc = await PDFDocument.create();
  const fontManager = new LazyFontManager(outDoc);

  const totalPages = pages.length;

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pgState = pages[pageIdx];
    const pageProgressBase = 0.1 + (pageIdx / Math.max(1, totalPages)) * 0.75;
    onProgress?.(
      pageProgressBase,
      `Processing page ${pageIdx + 1} of ${totalPages}...`
    );

    let pdfPage: ReturnType<typeof outDoc.addPage>;

    if (pgState.originalIndex !== null) {
      const [copied] = await outDoc.copyPages(srcDoc, [pgState.originalIndex]);
      pdfPage = outDoc.addPage(copied);
      if (pgState.rotation !== 0) {
        const currentRot = pdfPage.getRotation().angle;
        pdfPage.setRotation(degrees((currentRot + pgState.rotation) % 360));
      }
    } else {
      pdfPage = outDoc.addPage([pgState.width, pgState.height]);
    }

    const { width: pWidth, height: pHeight } = pdfPage.getSize();

    // 1. Draw strokes
    if (pgState.strokes && pgState.strokes.length > 0) {
      const strokePngBytes = await rasterizeStrokesToPng(pgState.strokes, pWidth, pHeight);
      if (strokePngBytes) {
        const embeddedStrokeImg = await outDoc.embedPng(strokePngBytes);
        pdfPage.drawImage(embeddedStrokeImg, {
          x: 0,
          y: 0,
          width: pWidth,
          height: pHeight,
        });
      }
    }

    // 2. Draw text overlays (including whiteout cover boxes)
    for (const txt of pgState.texts || []) {
      const fontToUse = await fontManager.getFont(txt.fontFamily, txt.isBold, !!txt.isItalic);
      const cleanText = sanitizeTextForStandardFont(txt.text);

      const pdfX = (txt.x / 100) * pWidth;
      const textH = fontToUse.heightAtSize(txt.fontSize);
      const textW = fontToUse.widthOfTextAtSize(cleanText, txt.fontSize);
      const pdfY = pHeight - (txt.y / 100) * pHeight - txt.fontSize * 0.78;

      // Draw background cover rectangle if present
      if (txt.backgroundColor && txt.backgroundColor !== "transparent") {
        const bgHex = txt.backgroundColor.replace("#", "");
        const bgR = parseInt(bgHex.substring(0, 2), 16) / 255 || 1;
        const bgG = parseInt(bgHex.substring(2, 4), 16) / 255 || 1;
        const bgB = parseInt(bgHex.substring(4, 6), 16) / 255 || 1;

        const boxW = Math.max(textW + 3, txt.width ? (txt.width / 100) * pWidth : textW + 3);
        const boxH = Math.max(textH + 2, txt.height ? (txt.height / 100) * pHeight : textH + 2);
        const boxX = pdfX - 0.5;
        const boxY = pHeight - (txt.y / 100) * pHeight - boxH;

        pdfPage.drawRectangle({
          x: boxX,
          y: boxY,
          width: boxW,
          height: boxH,
          color: rgb(bgR, bgG, bgB),
        });
      }

      // Parse HEX color to RGB
      const hex = txt.color.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
      const g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
      const b = parseInt(hex.substring(4, 6), 16) / 255 || 0;

      pdfPage.drawText(cleanText, {
        x: pdfX,
        y: pdfY,
        size: txt.fontSize,
        font: fontToUse,
        color: rgb(r, g, b),
      });
    }

    // 3. Draw Watermark / Stamps
    for (const stp of pgState.stamps || []) {
      const hex = stp.color.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16) / 255 || 0.8;
      const g = parseInt(hex.substring(2, 4), 16) / 255 || 0.1;
      const b = parseInt(hex.substring(4, 6), 16) / 255 || 0.1;

      const helveticaBold = await fontManager.getStandardFont(StandardFonts.HelveticaBold);
      const cleanStampText = sanitizeTextForStandardFont(stp.text);

      pdfPage.drawText(cleanStampText, {
        x: pWidth * 0.25,
        y: pHeight * 0.5,
        size: 42,
        font: helveticaBold,
        color: rgb(r, g, b),
        rotate: degrees(stp.rotation),
        opacity: stp.opacity,
      });
    }

    // 4. Draw Image / Signature overlays
    for (const img of pgState.images || []) {
      try {
        const imgBytes = await dataUrlToUint8Array(img.dataUrl);
        const embeddedImg = img.isPng
          ? await outDoc.embedPng(imgBytes)
          : await outDoc.embedJpg(imgBytes);

        const imgW = (img.width / 100) * pWidth;
        const imgH = (img.height / 100) * pHeight;
        const rawRot = img.rotation || 0;
        const normalizedRot = ((rawRot % 360) + 360) % 360;

        if (normalizedRot !== 0) {
          const normCx = (img.x + img.width / 2) / 100;
          const normCy = (img.y + img.height / 2) / 100;
          const pdfCx = normCx * pWidth;
          const pdfCy = pHeight - normCy * pHeight;

          const rad = (-normalizedRot * Math.PI) / 180;
          const cosA = Math.cos(rad);
          const sinA = Math.sin(rad);

          const cxRel = (imgW / 2) * cosA - (imgH / 2) * sinA;
          const cyRel = (imgW / 2) * sinA + (imgH / 2) * cosA;

          const pdfX = pdfCx - cxRel;
          const pdfY = pdfCy - cyRel;

          pdfPage.drawImage(embeddedImg, {
            x: pdfX,
            y: pdfY,
            width: imgW,
            height: imgH,
            rotate: degrees(-normalizedRot),
          });
        } else {
          const imgX = (img.x / 100) * pWidth;
          const imgY = pHeight - (img.y / 100) * pHeight - imgH;

          pdfPage.drawImage(embeddedImg, {
            x: imgX,
            y: imgY,
            width: imgW,
            height: imgH,
          });
        }
      } catch (e) {
        console.error("Worker error embedding image onto PDF:", e);
      }
    }
  }

  onProgress?.(0.92, "Generating final PDF file...");
  const finalBytes = await outDoc.save();
  return finalBytes;
}

// Background Worker Message Handler
self.onmessage = async (e: MessageEvent<PdfExportWorkerMessageIn>) => {
  const data = e.data;
  if (!data || !data.id) return;

  if (data.type === "EXPORT_PDF") {
    try {
      const { pdfBuffer, pages } = data.payload;
      const pdfBytes = new Uint8Array(pdfBuffer);

      const finalBytes = await compileEditedPdf(
        pdfBytes,
        pages,
        (progress, stage) => {
          const progressMsg: PdfExportProgressMessage = {
            id: data.id,
            type: "EXPORT_PROGRESS",
            progress,
            stage,
          };
          self.postMessage(progressMsg);
        }
      );

      // Post progress 100%
      const doneProgressMsg: PdfExportProgressMessage = {
        id: data.id,
        type: "EXPORT_PROGRESS",
        progress: 1.0,
        stage: "Done",
      };
      self.postMessage(doneProgressMsg);

      // Create a clean standalone buffer to transfer
      const standaloneBuffer = finalBytes.buffer.slice(
        finalBytes.byteOffset,
        finalBytes.byteOffset + finalBytes.byteLength
      );

      const successMsg: PdfExportSuccessMessage = {
        id: data.id,
        type: "EXPORT_SUCCESS",
        payload: {
          pdfBuffer: standaloneBuffer,
          byteOffset: 0,
          byteLength: standaloneBuffer.byteLength,
        },
      };

      // Transfer the underlying ArrayBuffer zero-copy
      (self as any).postMessage(successMsg, [standaloneBuffer]);
    } catch (err) {
      console.error("PDF export worker failed:", err);
      const errorMsg: PdfExportErrorMessage = {
        id: data.id,
        type: "EXPORT_ERROR",
        error: err instanceof Error ? err.message : "Failed to compile edited PDF",
      };
      self.postMessage(errorMsg);
    }
  }
};
