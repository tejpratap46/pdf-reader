import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import { PageState } from "../types/editor";

export async function exportPdfHelper(
  pdfFileBytes: Uint8Array,
  fileName: string,
  pages: PageState[],
  downloadOnly: boolean,
  onSave: (newPdfBytes: Uint8Array, newFileName?: string) => void
): Promise<void> {
  const srcDoc = await PDFDocument.load(pdfFileBytes, { ignoreEncryption: true });
  const outDoc = await PDFDocument.create();

  const helveticaFont = await outDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await outDoc.embedFont(StandardFonts.HelveticaBold);

  // Loop over current edited page array
  for (const pgState of pages) {
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

    // 2. Draw text overlays
    for (const txt of pgState.texts) {
      const fontToUse = txt.isBold ? helveticaBold : helveticaFont;
      const pdfX = (txt.x / 100) * pWidth;
      const pdfY = pHeight - (txt.y / 100) * pHeight; // Invert Y for PDF coordinate system

      // Parse HEX color to RGB
      const hex = txt.color.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
      const g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
      const b = parseInt(hex.substring(4, 6), 16) / 255 || 0;

      pdfPage.drawText(txt.text, {
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

      pdfPage.drawText(stp.text, {
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

  // Generate modified PDF Uint8Array
  const finalBytes = await outDoc.save();

  if (downloadOnly) {
    const blob = new Blob([finalBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName.endsWith(".pdf") ? fileName.replace(".pdf", "-edited.pdf") : `${fileName}-edited.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    onSave(finalBytes, fileName.endsWith("-edited.pdf") ? fileName : fileName.replace(".pdf", "-edited.pdf"));
  }
}
