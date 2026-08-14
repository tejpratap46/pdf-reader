import init, {
  toMarkdownBytes,
  formatFromBytes,
  formatFromExtension,
  formatFromPath,
  Format,
  ConvertErrorCode,
} from "@firecrawl/anydoc-wasm";
import anydocWasmUrl from "@firecrawl/anydoc-wasm/anydoc_wasm_bg.wasm?url";
import { PDFDocument } from "pdf-lib";
import { estimateTokenCount } from "tokenx";

// Types for background worker communication
export interface MarkdownStats {
  characters: number;
  words: number;
  lines: number;
  estimatedTokens: number;
  headingCount: number;
  tableCount: number;
  codeBlockCount: number;
}

export interface MarkdownExportResult {
  markdown: string;
  detectedFormat?: Format;
  stats: MarkdownStats;
  sourceType: "pdf" | "document" | "web";
  pagesLabel?: string;
}

export type AnydocWorkerMessageIn =
  | {
      id: string;
      type: "INIT";
    }
  | {
      id: string;
      type: "CONVERT";
      payload: {
        bytes: Uint8Array;
        fileName?: string;
        selectedPages?: number[];
      };
    };

export type AnydocWorkerMessageOut =
  | {
      id: string;
      type: "INIT_SUCCESS";
    }
  | {
      id: string;
      type: "CONVERT_SUCCESS";
      payload: MarkdownExportResult;
    }
  | {
      id: string;
      type: "ERROR";
      error: string;
      code?: ConvertErrorCode;
    };

let isWasmInitialized = false;
let initPromise: Promise<void> | null = null;

async function ensureAnydocWasm(): Promise<void> {
  if (isWasmInitialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      const candidates: string[] = [anydocWasmUrl, "/anydoc_wasm_bg.wasm"];

      try {
        if (typeof self !== "undefined" && self.location) {
          const originUrl = new URL(anydocWasmUrl, self.location.origin).href;
          if (!candidates.includes(originUrl)) {
            candidates.unshift(originUrl);
          }
        }
      } catch {
        // ignore resolution error
      }

      let lastError: unknown = null;

      for (const url of candidates) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const buffer = await res.arrayBuffer();
            await init({ module_or_path: buffer });
            isWasmInitialized = true;
            return;
          }
        } catch (e) {
          lastError = e;
        }
      }

      // Fallback: try default init
      try {
        await init();
        isWasmInitialized = true;
        return;
      } catch (e) {
        lastError = e;
      }

      throw new Error(
        `Failed to initialize WebAssembly document parser in background worker: ${
          lastError instanceof Error ? lastError.message : "WASM binary could not be loaded"
        }`
      );
    })();
  }
  return initPromise;
}

function computeMarkdownStats(text: string): MarkdownStats {
  const characters = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lines = text.length ? text.split("\n").length : 0;
  const estimatedTokens = estimateTokenCount(text);

  const headingCount = (text.match(/^#{1,6}\s+/gm) || []).length;
  const tableCount = (text.match(/\|[\s\S]*?\|[\s\S]*?\n\|[-:\s|]+\|/g) || []).length;
  const codeBlockCount = (text.match(/```[\s\S]*?```/g) || []).length;

  return {
    characters,
    words,
    lines,
    estimatedTokens,
    headingCount,
    tableCount,
    codeBlockCount,
  };
}

async function extractPdfPages(
  pdfBytes: Uint8Array,
  pageNumbers: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const total = srcDoc.getPageCount();
  const validPages = Array.from(new Set(pageNumbers))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= total)
    .sort((a, b) => a - b);

  if (validPages.length === 0 || validPages.length === total) {
    return pdfBytes;
  }

  const outDoc = await PDFDocument.create();
  const copiedPages = await outDoc.copyPages(
    srcDoc,
    validPages.map((n) => n - 1)
  );
  copiedPages.forEach((page) => outDoc.addPage(page));
  return await outDoc.save();
}

function formatPageListSummary(pages: number[]): string {
  if (pages.length === 0) return "";
  const sorted = Array.from(new Set(pages)).sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(", ");
}

self.onmessage = async (e: MessageEvent<AnydocWorkerMessageIn>) => {
  const data = e.data;
  if (!data || !data.id) return;

  if (data.type === "INIT") {
    try {
      await ensureAnydocWasm();
      const response: AnydocWorkerMessageOut = {
        id: data.id,
        type: "INIT_SUCCESS",
      };
      self.postMessage(response);
    } catch (err) {
      const response: AnydocWorkerMessageOut = {
        id: data.id,
        type: "ERROR",
        error: err instanceof Error ? err.message : "Initialization failed",
      };
      self.postMessage(response);
    }
    return;
  }

  if (data.type === "CONVERT") {
    try {
      await ensureAnydocWasm();

      const { bytes, fileName, selectedPages } = data.payload;
      let detectedFormat: Format | undefined = formatFromBytes(bytes);
      if (!detectedFormat && fileName) {
        detectedFormat = formatFromPath(fileName) || formatFromExtension(fileName);
      }

      let bytesToConvert = bytes;
      let pagesLabel: string | undefined;

      // If specific pages are requested for a PDF, extract subset before converting
      if ((detectedFormat === "pdf" || !detectedFormat) && selectedPages && selectedPages.length > 0) {
        try {
          const subset = await extractPdfPages(bytes, selectedPages);
          bytesToConvert = subset;
          pagesLabel = `Pages ${formatPageListSummary(selectedPages)}`;
        } catch (e) {
          console.warn("Could not extract subset of pages in worker, converting full document:", e);
        }
      }

      const markdown = toMarkdownBytes(bytesToConvert, detectedFormat || null);
      const stats = computeMarkdownStats(markdown);

      const result: MarkdownExportResult = {
        markdown,
        detectedFormat,
        stats,
        sourceType: detectedFormat === "pdf" ? "pdf" : "document",
        pagesLabel,
      };

      const response: AnydocWorkerMessageOut = {
        id: data.id,
        type: "CONVERT_SUCCESS",
        payload: result,
      };
      self.postMessage(response);
    } catch (err: unknown) {
      const errorObj = err as { code?: ConvertErrorCode; message?: string } | undefined;
      const code: ConvertErrorCode | undefined = errorObj?.code;
      let message = errorObj?.message || "Failed to convert document to Markdown.";

      if (code === "encrypted") {
        message = "The document is password-protected or encrypted.";
      } else if (code === "unsupported") {
        message = "The document format is unsupported or contains only scanned images without OCR text.";
      } else if (code === "malformed") {
        message = "The document is corrupted or malformed.";
      } else if (code === "resourceLimit") {
        message = "Document exceeded safety decompression limits.";
      }

      const response: AnydocWorkerMessageOut = {
        id: data.id,
        type: "ERROR",
        error: message,
        code,
      };
      self.postMessage(response);
    }
  }
};
