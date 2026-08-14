import { PDFDocument } from "pdf-lib";
import init, {
  toMarkdownBytes,
  formatFromBytes,
  formatFromExtension,
  formatFromPath,
  Format,
  ConvertErrorCode,
} from "@firecrawl/anydoc-wasm";
import anydocWasmUrl from "@firecrawl/anydoc-wasm/anydoc_wasm_bg.wasm?url";

let isWasmInitialized = false;
let initPromise: Promise<void> | null = null;

export async function ensureAnydocWasm(): Promise<void> {
  if (isWasmInitialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      // List of candidate URLs to locate the wasm binary
      const candidates: string[] = [
        anydocWasmUrl,
        "/anydoc_wasm_bg.wasm",
      ];

      try {
        const importMetaUrl = new URL(/* @vite-ignore */ "anydoc_wasm_bg.wasm", import.meta.url).href;
        if (!candidates.includes(importMetaUrl)) {
          candidates.push(importMetaUrl);
        }
      } catch {
        // Ignore if import.meta.url cannot be resolved
      }

      let lastError: unknown = null;

      for (const url of candidates) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const buffer = await res.arrayBuffer();
            // Passing pre-fetched ArrayBuffer directly avoids instantiateStreaming HTTP status/MIME errors
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
        `Failed to initialize WebAssembly document parser: ${
          lastError instanceof Error ? lastError.message : "WASM binary could not be loaded"
        }`
      );
    })();
  }
  return initPromise;
}

export interface MarkdownExportResult {
  markdown: string;
  detectedFormat?: Format;
  stats: MarkdownStats;
  sourceType: "pdf" | "document" | "web";
  pagesLabel?: string;
}

export interface MarkdownStats {
  characters: number;
  words: number;
  lines: number;
  estimatedTokens: number;
  headingCount: number;
  tableCount: number;
  codeBlockCount: number;
}

export function computeMarkdownStats(text: string): MarkdownStats {
  const characters = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lines = text.length ? text.split("\n").length : 0;
  // Standard token heuristic for LLMs (approx 4 chars or 0.75 words per token)
  const estimatedTokens = Math.ceil(characters / 4);

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

/**
 * Extract only selected pages from PDF bytes into a new PDF byte buffer
 */
export async function extractPdfPages(
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

/**
 * Parses user input page range like "1-3, 5, 8-10" into array of 1-indexed numbers
 */
export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr.trim() || rangeStr.trim().toLowerCase() === "all") {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const result = new Set<number>();
  const parts = rangeStr.split(/[,;\s]+/).filter(Boolean);

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = parseInt(startStr.trim(), 10);
      const end = parseInt(endStr.trim(), 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalPages, Math.max(start, end));
        for (let i = min; i <= max; i++) {
          result.add(i);
        }
      }
    } else {
      const num = parseInt(part.trim(), 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        result.add(num);
      }
    }
  }

  const list = Array.from(result).sort((a, b) => a - b);
  return list.length > 0 ? list : Array.from({ length: totalPages }, (_, i) => i + 1);
}

/**
 * Formats a list of page numbers into a readable range string like "1-3, 5, 8-10"
 */
export function formatPageListSummary(pages: number[]): string {
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

/**
 * Convert binary document bytes (PDF, DOCX, XLSX, EPUB, PPTX, etc.) to GitHub Flavored Markdown
 * using @firecrawl/anydoc-wasm WebAssembly bindings. Supports page selection for PDFs.
 */
export async function convertBytesToMarkdown(
  bytes: Uint8Array,
  fileName?: string,
  selectedPages?: number[]
): Promise<MarkdownExportResult> {
  await ensureAnydocWasm();

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
      console.warn("Could not extract subset of pages, converting full document:", e);
    }
  }

  try {
    const markdown = toMarkdownBytes(bytesToConvert, detectedFormat || null);
    const stats = computeMarkdownStats(markdown);

    return {
      markdown,
      detectedFormat,
      stats,
      sourceType: detectedFormat === "pdf" ? "pdf" : "document",
      pagesLabel,
    };
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

    const enhancedError = new Error(message) as Error & { code?: ConvertErrorCode };
    enhancedError.code = code;
    throw enhancedError;
  }
}

/**
 * Generate Markdown for web-extracted articles/pages
 */
export function convertWebToMarkdown(
  title: string,
  url: string,
  paragraphs: string[]
): MarkdownExportResult {
  const mdParts: string[] = [];

  if (title) {
    mdParts.push(`# ${title.trim()}\n`);
  }
  if (url) {
    mdParts.push(`> Source: [${url}](${url})\n`);
  }

  if (paragraphs.length > 0) {
    mdParts.push(paragraphs.map((p) => p.trim()).filter(Boolean).join("\n\n"));
  } else {
    mdParts.push("_No readable content extracted._");
  }

  const markdown = mdParts.join("\n");
  const stats = computeMarkdownStats(markdown);

  return {
    markdown,
    stats,
    sourceType: "web",
  };
}

/**
 * Trigger download of Markdown file in browser
 */
export function downloadMarkdownFile(content: string, suggestedFileName: string): void {
  let baseName = suggestedFileName.replace(/\.[^/.]+$/, "");
  if (!baseName || baseName === "Untitled") {
    baseName = "document";
  }
  const fullFileName = `${baseName}.md`;

  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fullFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Helper to build LLM-ready prompts for AI integration
 */
export function formatForLLMPrompt(
  markdown: string,
  mode: "summary" | "qa" | "extract" | "raw" = "raw",
  docTitle?: string
): string {
  const docHeading = docTitle ? `DOCUMENT: ${docTitle}\n` : "";

  switch (mode) {
    case "summary":
      return `Please provide a comprehensive summary with key takeaways and bullet points for the following document:\n\n${docHeading}\`\`\`markdown\n${markdown}\n\`\`\``;
    case "qa":
      return `Answer the following questions based strictly on the provided document content:\n\n${docHeading}\`\`\`markdown\n${markdown}\n\`\`\`\n\nQuestion: `;
    case "extract":
      return `Extract all key entities, tables, dates, action items, and structural data from the document below as JSON:\n\n${docHeading}\`\`\`markdown\n${markdown}\n\`\`\``;
    case "raw":
    default:
      return markdown;
  }
}
