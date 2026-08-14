import { PDFDocument } from "pdf-lib";
import { estimateTokenCount } from "tokenx";
import type { Format, ConvertErrorCode } from "@firecrawl/anydoc-wasm";
import {
  anydocWorkerClient,
  MarkdownExportResult,
  MarkdownStats,
} from "../services/anydocWorkerClient";

export type { Format, ConvertErrorCode, MarkdownExportResult, MarkdownStats };

/**
 * Warms up and initializes the background Web Worker with anydoc-wasm
 */
export async function ensureAnydocWasm(): Promise<void> {
  return anydocWorkerClient.init();
}

/**
 * Computes token, word, line, and markdown syntax structure statistics
 */
export function computeMarkdownStats(text: string): MarkdownStats {
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
 * using @firecrawl/anydoc-wasm inside a dedicated background Web Worker for non-blocking performance.
 * Supports page selection for PDFs.
 */
export async function convertBytesToMarkdown(
  bytes: Uint8Array,
  fileName?: string,
  selectedPages?: number[]
): Promise<MarkdownExportResult> {
  return anydocWorkerClient.convertBytesToMarkdown(bytes, fileName, selectedPages);
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
