import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import { PageState } from "../types/editor";
import { pdfExportWorkerClient } from "../services/pdfExportWorkerClient";

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
 * Main-thread fallback compiler for PDF modifications in environments where Web Workers are restricted.
 */
async function compilePdfMainThread(
  pdfFileBytes: Uint8Array,
  pages: PageState[],
  onProgress?: (progress: number, stage: string) => void
): Promise<Uint8Array> {
  onProgress?.(0.05, "Loading original document...");
  const srcDoc = await PDFDocument.load(pdfFileBytes, { ignoreEncryption: true });
  const outDoc = await PDFDocument.create();

  const helveticaFont = await outDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await outDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaItalic = await outDoc.embedFont(StandardFonts.HelveticaOblique);
  const helveticaBoldItalic = await outDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  const timesFont = await outDoc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await outDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await outDoc.embedFont(StandardFonts.TimesRomanItalic);
  const timesBoldItalic = await outDoc.embedFont(StandardFonts.TimesRomanBoldItalic);

  const courierFont = await outDoc.embedFont(StandardFonts.Courier);
  const courierBold = await outDoc.embedFont(StandardFonts.CourierBold);
  const courierItalic = await outDoc.embedFont(StandardFonts.CourierOblique);
  const courierBoldItalic = await outDoc.embedFont(StandardFonts.CourierBoldOblique);

  const getPdfFont = (fontFamily: string | undefined, isBold: boolean, isItalic: boolean) => {
    const fam = (fontFamily || "").toLowerCase();
    if (
      fam.includes("times") ||
      fam.includes("serif") ||
      fam.includes("roman") ||
      fam.includes("georgia") ||
      fam.includes("cambria") ||
      fam.includes("garamond")
    ) {
      if (isBold && isItalic) return timesBoldItalic;
      if (isBold) return timesBold;
      if (isItalic) return timesItalic;
      return timesFont;
    }
    if (
      fam.includes("courier") ||
      fam.includes("mono") ||
      fam.includes("consolas") ||
      fam.includes("code")
    ) {
      if (isBold && isItalic) return courierBoldItalic;
      if (isBold) return courierBold;
      if (isItalic) return courierItalic;
      return courierFont;
    }
    if (isBold && isItalic) return helveticaBoldItalic;
    if (isBold) return helveticaBold;
    if (isItalic) return helveticaItalic;
    return helveticaFont;
  };

  const totalPages = pages.length;

  // Loop over current edited page array
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

    // 1. Draw rasterized pen/highlighter strokes layer if present
    if (pgState.strokes.length > 0) {
      const offCanvas = document.createElement("canvas");
      offCanvas.width = pWidth * 2; // high-res
      offCanvas.height = pHeight * 2;
      const offCtx = offCanvas.getContext("2d");
      if (offCtx) {
        offCtx.scale(2, 2);
        pgState.strokes.forEach((st) => {
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

        const strokeDataUrl = offCanvas.toDataURL("image/png");
        const strokeImgBytes = await fetch(strokeDataUrl).then((res) => res.arrayBuffer());
        const embeddedStrokeImg = await outDoc.embedPng(strokeImgBytes);
        pdfPage.drawImage(embeddedStrokeImg, {
          x: 0,
          y: 0,
          width: pWidth,
          height: pHeight,
        });
      }
    }

    // 2. Draw text overlays (including background cover rectangles for original text edits)
    for (const txt of pgState.texts) {
      const fontToUse = getPdfFont(txt.fontFamily, txt.isBold, !!txt.isItalic);
      const cleanText = sanitizeTextForStandardFont(txt.text);

      const pdfX = (txt.x / 100) * pWidth;
      const textH = fontToUse.heightAtSize(txt.fontSize);
      const textW = fontToUse.widthOfTextAtSize(cleanText, txt.fontSize);
      const pdfY = pHeight - (txt.y / 100) * pHeight - txt.fontSize * 0.78;

      // Draw background cover rectangle if present (e.g. to whiteout original text)
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
    for (const stp of pgState.stamps) {
      const hex = stp.color.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16) / 255 || 0.8;
      const g = parseInt(hex.substring(2, 4), 16) / 255 || 0.1;
      const b = parseInt(hex.substring(4, 6), 16) / 255 || 0.1;

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
    for (const img of pgState.images) {
      try {
        const imgBytes = await fetch(img.dataUrl).then((res) => res.arrayBuffer());
        const embeddedImg = img.isPng
          ? await outDoc.embedPng(imgBytes)
          : await outDoc.embedJpg(imgBytes);

        const imgW = (img.width / 100) * pWidth;
        const imgH = (img.height / 100) * pHeight;
        const rawRot = img.rotation || 0;
        const normalizedRot = ((rawRot % 360) + 360) % 360;

        if (normalizedRot !== 0) {
          // Center of the image in PDF coordinates
          const normCx = (img.x + img.width / 2) / 100;
          const normCy = (img.y + img.height / 2) / 100;
          const pdfCx = normCx * pWidth;
          const pdfCy = pHeight - normCy * pHeight;

          // In PDF coordinates (where Y is pointing up), clockwise rotation is -normalizedRot
          const rad = (-normalizedRot * Math.PI) / 180;
          const cosA = Math.cos(rad);
          const sinA = Math.sin(rad);

          // Center relative to the unrotated lower-left origin (0, 0)
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
        console.error("Error embedding image onto PDF:", e);
      }
    }
  }

  onProgress?.(0.92, "Generating final PDF file...");
  const finalBytes = await outDoc.save();
  onProgress?.(1.0, "Done");
  return finalBytes;
}

/**
 * Compiles edited PDF bytes, preferentially in a background Web Worker with automatic fallback to main thread.
 */
export async function exportPdfBytes(
  pdfFileBytes: Uint8Array,
  pages: PageState[],
  onProgress?: (progress: number, stage: string) => void
): Promise<Uint8Array> {
  try {
    return await pdfExportWorkerClient.exportPdf(pdfFileBytes, pages, onProgress);
  } catch (workerErr) {
    console.warn("PDF Web Worker export failed or unavailable, falling back to main thread:", workerErr);
    return await compilePdfMainThread(pdfFileBytes, pages, onProgress);
  }
}

/**
 * Triggers a browser download for the provided PDF binary buffer with safe asynchronous blob URL lifecycle
 */
export function downloadPdfBlob(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".pdf")
    ? fileName.replace(/\.pdf$/i, "-edited.pdf")
    : `${fileName}-edited.pdf`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // ignore cleanup errors
    }
  }, 1500);
}

/**
 * High-level helper for exporting and saving edited PDF documents.
 */
export async function exportPdfHelper(
  pdfFileBytes: Uint8Array,
  fileName: string,
  pages: PageState[],
  downloadOnly: boolean,
  onSave: (newPdfBytes: Uint8Array, newFileName?: string) => void,
  onProgress?: (progress: number, stage: string) => void
): Promise<void> {
  const finalBytes = await exportPdfBytes(pdfFileBytes, pages, onProgress);

  if (downloadOnly) {
    downloadPdfBlob(finalBytes, fileName);
  } else {
    const newFileName = fileName.endsWith("-edited.pdf")
      ? fileName
      : fileName.replace(/\.pdf$/i, "-edited.pdf");
    onSave(finalBytes, newFileName);
  }
}
