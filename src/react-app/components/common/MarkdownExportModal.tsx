import { FC, useState, useEffect, useMemo, useCallback } from "react";
import { marked } from "marked";
import { useDark, useThemeMode } from "../../hooks/useTheme";
import {
  MarkdownExportResult,
  convertBytesToMarkdown,
  convertWebToMarkdown,
  downloadMarkdownFile,
  formatForLLMPrompt,
  parsePageRange,
  formatPageListSummary,
} from "../../utils/markdownExport";
import {
  IcoX,
  IcoDownload,
  IcoClipboard,
  IcoCheck,
  IcoMarkdown,
  IcoSparkles,
  IcoCode,
  IcoEye,
  IcoLoader,
} from "./Icons";

interface MarkdownExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBytes: Uint8Array | null;
  fileName: string;
  sourceMode: "pdf" | "web";
  currentPage?: number;
  totalPages?: number;
  webTitle?: string;
  webUrl?: string;
  webParagraphs?: string[];
}

type PageSelectionMode = "all" | "current" | "custom";

export const MarkdownExportModal: FC<MarkdownExportModalProps> = ({
  isOpen,
  onClose,
  pdfBytes,
  fileName,
  sourceMode,
  currentPage = 1,
  totalPages = 1,
  webTitle = "",
  webUrl = "",
  webParagraphs = [],
}) => {
  const isDark = useDark();
  const themeMode = useThemeMode();
  const isAmoled = themeMode === "amoled";
  const [activeTab, setActiveTab] = useState<"preview" | "raw" | "ai">("preview");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MarkdownExportResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [promptCopied, setPromptCopied] = useState<string | null>(null);

  // Page Selection State for PDFs
  const [pageSelectionMode, setPageSelectionMode] = useState<PageSelectionMode>("all");
  const [customRangeInput, setCustomRangeInput] = useState<string>("");

  const docTitle = sourceMode === "web" ? (webTitle || "Web Page") : (fileName || "Document.pdf");

  // Compute selected page numbers based on current mode
  const selectedPages = useMemo<number[]>(() => {
    if (sourceMode !== "pdf" || totalPages <= 1) return [];

    if (pageSelectionMode === "all") {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (pageSelectionMode === "current") {
      const validCurrent = Math.max(1, Math.min(currentPage, totalPages));
      return [validCurrent];
    }
    if (pageSelectionMode === "custom") {
      return parsePageRange(customRangeInput, totalPages);
    }
    return [];
  }, [sourceMode, totalPages, pageSelectionMode, currentPage, customRangeInput]);

  const selectedPagesSummary = useMemo(() => {
    if (sourceMode !== "pdf" || totalPages <= 1) return "";
    if (pageSelectionMode === "all") return `All Pages (1–${totalPages})`;
    if (pageSelectionMode === "current") return `Page ${currentPage}`;
    return selectedPages.length > 0 ? `Pages ${formatPageListSummary(selectedPages)}` : "None";
  }, [sourceMode, totalPages, pageSelectionMode, currentPage, selectedPages]);

  // Execute Markdown extraction
  const executeConversion = useCallback(
    async (pagesToConvert: number[]) => {
      setLoading(true);
      setError(null);

      try {
        if (sourceMode === "pdf" && pdfBytes) {
          const isSubset = pagesToConvert.length > 0 && pagesToConvert.length < totalPages;
          const res = await convertBytesToMarkdown(
            pdfBytes,
            fileName,
            isSubset ? pagesToConvert : undefined
          );
          setResult(res);
          setLoading(false);
        } else if (sourceMode === "web") {
          const res = convertWebToMarkdown(webTitle, webUrl, webParagraphs);
          setResult(res);
          setLoading(false);
        } else {
          throw new Error("No document content available to convert.");
        }
      } catch (err: unknown) {
        console.error("Markdown conversion error:", err);
        const msg = err instanceof Error ? err.message : "Failed to convert document to Markdown.";
        setError(msg);
        setLoading(false);
      }
    },
    [sourceMode, pdfBytes, fileName, totalPages, webTitle, webUrl, webParagraphs]
  );

  // Initial load when modal opens
  useEffect(() => {
    if (!isOpen) {
      setResult(null);
      setError(null);
      setPageSelectionMode("all");
      setCustomRangeInput("");
      return;
    }

    executeConversion(selectedPages);
  }, [isOpen]); // Only trigger on modal open, selection change triggers handleApplySelection

  const handleApplySelection = () => {
    executeConversion(selectedPages);
  };

  const handleTogglePageChip = (pageNum: number) => {
    const current = new Set(selectedPages);
    if (current.has(pageNum)) {
      current.delete(pageNum);
    } else {
      current.add(pageNum);
    }
    const updated = Array.from(current).sort((a, b) => a - b);
    setPageSelectionMode("custom");
    setCustomRangeInput(formatPageListSummary(updated));
  };

  const handleCopyMarkdown = async () => {
    if (!result?.markdown) return;
    await navigator.clipboard.writeText(result.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPrompt = async (mode: "summary" | "qa" | "extract" | "action") => {
    if (!result?.markdown) return;
    const promptText = formatForLLMPrompt(result.markdown, mode === "action" ? "raw" : mode, docTitle);
    const finalPrompt = mode === "action"
      ? `Please analyze this document and provide: 1) Executive Summary, 2) Key Decisions/Takeaways, 3) Action Items with Owners/Deadlines if any:\n\nDOCUMENT: ${docTitle}\n\`\`\`markdown\n${result.markdown}\n\`\`\``
      : promptText;

    await navigator.clipboard.writeText(finalPrompt);
    setPromptCopied(mode);
    setTimeout(() => setPromptCopied(null), 2000);
  };

  const handleDownload = () => {
    if (!result?.markdown) return;
    let baseName = (sourceMode === "web" ? (webTitle || "web-article") : fileName).replace(/\.[^/.]+$/, "");
    if (sourceMode === "pdf" && selectedPages.length > 0 && selectedPages.length < totalPages) {
      baseName += `-pages-${formatPageListSummary(selectedPages).replace(/,\s*/g, "_")}`;
    }
    downloadMarkdownFile(result.markdown, baseName);
  };

  if (!isOpen) return null;

  // Color tokens
  const bgModal = isAmoled ? "#000000" : isDark ? "#0f172a" : "#ffffff";
  const bgCard = isAmoled ? "#09090b" : isDark ? "#1e293b" : "#f8fafc";
  const bgInner = isAmoled ? "#000000" : isDark ? "#0b0f19" : "#ffffff";
  const borderCol = isAmoled ? "#27272a" : isDark ? "#334155" : "#e2e8f0";
  const textMain = isAmoled ? "#ffffff" : isDark ? "#f8fafc" : "#0f172a";
  const textMut = isAmoled ? "#a1a1aa" : isDark ? "#94a3b8" : "#64748b";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      style={{ background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border transition-all animate-in fade-in zoom-in-95 duration-200"
        style={{ background: bgModal, borderColor: borderCol, color: textMain }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: borderCol, background: bgCard }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-md">
              <IcoMarkdown size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold leading-tight">Export as Markdown</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <IcoSparkles size={11} /> LLM Ready
                </span>
                {result?.detectedFormat && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {result.detectedFormat}
                  </span>
                )}
                {result?.pagesLabel && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {result.pagesLabel}
                  </span>
                )}
              </div>
              <p className="text-xs truncate max-w-md mt-0.5" style={{ color: textMut }}>
                Powered by <code className="text-amber-400 font-mono text-[11px]">@firecrawl/anydoc-wasm</code> · {docTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:opacity-80 transition-colors cursor-pointer"
              style={{ color: textMut }}
              title="Close modal"
            >
              <IcoX size={16} />
            </button>
          </div>
        </div>

        {/* Page Selection Bar (Only for multi-page PDFs) */}
        {sourceMode === "pdf" && totalPages > 1 && (
          <div
            className="px-6 py-3 border-b flex flex-col gap-2.5 shrink-0"
            style={{ borderColor: borderCol, background: isAmoled ? "#000000" : isDark ? "#131b2e" : "#f1f5f9" }}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-500">Page Selection:</span>
                <div
                  className="flex items-center p-0.5 rounded-lg border text-xs"
                  style={{ borderColor: borderCol, background: bgCard }}
                >
                  <button
                    onClick={() => {
                      setPageSelectionMode("all");
                    }}
                    className={`px-2.5 py-1 rounded font-medium transition-all cursor-pointer ${
                      pageSelectionMode === "all"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "hover:text-amber-400"
                    }`}
                    style={pageSelectionMode !== "all" ? { color: textMut } : undefined}
                  >
                    All Pages ({totalPages})
                  </button>
                  <button
                    onClick={() => {
                      setPageSelectionMode("current");
                    }}
                    className={`px-2.5 py-1 rounded font-medium transition-all cursor-pointer ${
                      pageSelectionMode === "current"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "hover:text-amber-400"
                    }`}
                    style={pageSelectionMode !== "current" ? { color: textMut } : undefined}
                  >
                    Current Page ({currentPage})
                  </button>
                  <button
                    onClick={() => {
                      setPageSelectionMode("custom");
                      if (!customRangeInput) setCustomRangeInput(`1-${Math.min(3, totalPages)}`);
                    }}
                    className={`px-2.5 py-1 rounded font-medium transition-all cursor-pointer ${
                      pageSelectionMode === "custom"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "hover:text-amber-400"
                    }`}
                    style={pageSelectionMode !== "custom" ? { color: textMut } : undefined}
                  >
                    Custom Range
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium" style={{ color: textMut }}>
                  Selected: <strong className="text-amber-400">{selectedPages.length}</strong> of {totalPages} pages ({selectedPagesSummary})
                </span>
                <button
                  onClick={handleApplySelection}
                  disabled={loading || selectedPages.length === 0}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white shadow transition-all cursor-pointer"
                >
                  {loading ? "Converting…" : "Re-convert Selection"}
                </button>
              </div>
            </div>

            {/* Custom Range Input & Quick Selector */}
            {pageSelectionMode === "custom" && (
              <div className="flex items-center gap-3 pt-1 flex-wrap">
                <div className="flex items-center gap-1.5 flex-1 min-w-[240px]">
                  <label htmlFor="custom-range-input" className="text-xs shrink-0" style={{ color: textMut }}>
                    Pages:
                  </label>
                  <input
                    id="custom-range-input"
                    type="text"
                    value={customRangeInput}
                    onChange={(e) => setCustomRangeInput(e.target.value)}
                    placeholder="e.g. 1-3, 5, 7-10"
                    className="flex-1 px-3 py-1 text-xs rounded-lg border font-mono focus:outline-none focus:border-amber-500"
                    style={{ background: bgInner, borderColor: borderCol, color: textMain }}
                  />
                </div>

                {/* Quick Page Click Chips (if total pages <= 30) */}
                {totalPages <= 30 && (
                  <div className="flex items-center gap-1 overflow-x-auto max-w-full py-0.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                      const isSelected = selectedPages.includes(p);
                      return (
                        <button
                          key={p}
                          onClick={() => handleTogglePageChip(p)}
                          className={`w-6 h-6 rounded text-[11px] font-bold font-mono transition-all cursor-pointer ${
                            isSelected
                              ? "bg-amber-500 text-white shadow-xs"
                              : "border hover:border-amber-400"
                          }`}
                          style={
                            !isSelected
                              ? { borderColor: borderCol, background: bgCard, color: textMut }
                              : undefined
                          }
                          title={`Toggle page ${p}`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Loading / Error States */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500 animate-spin">
              <IcoLoader size={32} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">
                Converting {selectedPagesSummary || "document"} to Markdown…
              </p>
              <p className="text-xs mt-1" style={{ color: textMut }}>
                Extracting high-fidelity structure &amp; tables via in-browser WebAssembly
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 gap-3 text-center">
            <div className="p-3 rounded-full bg-red-500/10 text-red-400 text-2xl">⚠️</div>
            <h4 className="text-base font-bold text-red-400">Conversion Failed</h4>
            <p className="text-xs max-w-md" style={{ color: textMut }}>
              {error}
            </p>
            <button
              onClick={() => executeConversion(selectedPages)}
              className="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-all cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : result ? (
          <>
            {/* Stats & Token Context Banner */}
            <div
              className="px-6 py-2.5 border-b flex items-center justify-between flex-wrap gap-3 shrink-0"
              style={{ borderColor: borderCol, background: isAmoled ? "#000000" : isDark ? "#090d16" : "#f8fafc" }}
            >
              <div className="flex items-center gap-4 text-xs font-medium flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-amber-400">~{result.stats.estimatedTokens.toLocaleString()}</span>
                  <span style={{ color: textMut }}>est. LLM Tokens</span>
                </div>
                <div className="w-px h-3.5" style={{ background: borderCol }} />
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{result.stats.words.toLocaleString()}</span>
                  <span style={{ color: textMut }}>words</span>
                </div>
                <div className="w-px h-3.5" style={{ background: borderCol }} />
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{result.stats.characters.toLocaleString()}</span>
                  <span style={{ color: textMut }}>characters</span>
                </div>
                {result.stats.headingCount > 0 && (
                  <>
                    <div className="w-px h-3.5" style={{ background: borderCol }} />
                    <span style={{ color: textMut }}>
                      {result.stats.headingCount} headings
                    </span>
                  </>
                )}
                {result.stats.tableCount > 0 && (
                  <>
                    <div className="w-px h-3.5" style={{ background: borderCol }} />
                    <span className="text-amber-400 font-semibold">
                      {result.stats.tableCount} tables
                    </span>
                  </>
                )}
              </div>

              {/* Tab Switcher */}
              <div
                className="flex items-center p-0.5 rounded-lg border text-xs"
                style={{ borderColor: borderCol, background: bgCard }}
              >
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    activeTab === "preview"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "hover:text-amber-400"
                  }`}
                  style={activeTab !== "preview" ? { color: textMut } : undefined}
                >
                  <IcoEye size={13} /> Rendered Preview
                </button>
                <button
                  onClick={() => setActiveTab("raw")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    activeTab === "raw"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "hover:text-amber-400"
                  }`}
                  style={activeTab !== "raw" ? { color: textMut } : undefined}
                >
                  <IcoCode size={13} /> Raw GFM
                </button>
                <button
                  onClick={() => setActiveTab("ai")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    activeTab === "ai"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "hover:text-amber-400"
                  }`}
                  style={activeTab !== "ai" ? { color: textMut } : undefined}
                >
                  <IcoSparkles size={13} /> AI Prompts
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 min-h-[320px] max-h-[520px]">
              {activeTab === "preview" && (
                <div
                  className="p-6 rounded-xl border select-text selection:bg-amber-500/30 overflow-x-auto"
                  style={{ background: bgInner, borderColor: borderCol }}
                >
                  {result.markdown ? (
                    <EnhancedMarkdownRenderView text={result.markdown} isDark={isDark} />
                  ) : (
                    <p className="italic text-center py-8" style={{ color: textMut }}>No content generated</p>
                  )}
                </div>
              )}

              {activeTab === "raw" && (
                <div
                  className="rounded-xl border overflow-hidden font-mono text-xs select-text selection:bg-amber-500/30"
                  style={{ background: bgInner, borderColor: borderCol }}
                >
                  <div
                    className="px-4 py-2 border-b flex items-center justify-between text-[11px]"
                    style={{ borderColor: borderCol, background: bgCard, color: textMut }}
                  >
                    <span>GitHub-Flavored Markdown (GFM)</span>
                    <span>{result.stats.lines} lines</span>
                  </div>
                  <pre
                    className="p-4 overflow-x-auto whitespace-pre font-mono leading-relaxed"
                    style={{ color: isDark ? "#e2e8f0" : "#1e293b" }}
                  >
                    {result.markdown}
                  </pre>
                </div>
              )}

              {activeTab === "ai" && (
                <div className="flex flex-col gap-4">
                  <div
                    className="p-4 rounded-xl border flex items-start gap-3"
                    style={{ background: isDark ? "rgba(245,158,11,0.06)" : "rgba(254,243,199,0.5)", borderColor: "rgba(245,158,11,0.3)" }}
                  >
                    <div className="text-amber-500 mt-0.5">
                      <IcoSparkles size={18} />
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-amber-500">Ready for LLM &amp; AI Pipelines</p>
                      <p className="mt-0.5" style={{ color: textMut }}>
                        The extracted Markdown preserves structural tables, document hierarchy, and clean text, making it ideal for feeding directly into OpenAI (GPT-4o), Anthropic (Claude), Google Gemini, DeepSeek, or Cloudflare Workers AI.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <PromptCard
                      title="Executive Summary &amp; Key Takeaways"
                      desc="Structured summary with core insights, conclusions, and bullet points."
                      isDark={isDark}
                      copied={promptCopied === "summary"}
                      onCopy={() => handleCopyPrompt("summary")}
                    />
                    <PromptCard
                      title="Q&amp;A &amp; Knowledge Retrieval"
                      desc="Context-injected prompt to answer specific questions accurately."
                      isDark={isDark}
                      copied={promptCopied === "qa"}
                      onCopy={() => handleCopyPrompt("qa")}
                    />
                    <PromptCard
                      title="Structured JSON &amp; Entity Extraction"
                      desc="Extract dates, numbers, entities, and tables into JSON."
                      isDark={isDark}
                      copied={promptCopied === "extract"}
                      onCopy={() => handleCopyPrompt("extract")}
                    />
                    <PromptCard
                      title="Action Items &amp; Next Steps"
                      desc="Extract checklists, tasks, assigned owners, and deliverables."
                      isDark={isDark}
                      copied={promptCopied === "action"}
                      onCopy={() => handleCopyPrompt("action")}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div
              className="flex items-center justify-between px-6 py-4 border-t shrink-0 flex-wrap gap-3"
              style={{ borderColor: borderCol, background: bgCard }}
            >
              <div className="flex items-center gap-2 text-xs" style={{ color: textMut }}>
                <span>Exporting: <code className="font-mono text-amber-400">{selectedPagesSummary || docTitle}</code></span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 cursor-pointer hover:border-amber-400"
                  style={{
                    borderColor: copied ? "#22c55e" : borderCol,
                    background: copied ? "rgba(34,197,94,0.1)" : bgInner,
                    color: copied ? "#22c55e" : textMain,
                  }}
                >
                  {copied ? <IcoCheck size={14} /> : <IcoClipboard size={14} />}
                  {copied ? "Copied Markdown!" : "Copy to Clipboard"}
                </button>

                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                >
                  <IcoDownload size={14} /> Download .md
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

/* Subcomponents */
const PromptCard: FC<{
  title: string;
  desc: string;
  isDark: boolean;
  copied: boolean;
  onCopy: () => void;
}> = ({ title, desc, isDark, copied, onCopy }) => {
  return (
    <div
      className="p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all hover:border-amber-500/50"
      style={{
        background: isDark ? "#111827" : "#ffffff",
        borderColor: isDark ? "#374151" : "#e5e7eb",
      }}
    >
      <div>
        <h4 className="text-xs font-bold text-amber-500">{title}</h4>
        <p className="text-[11px] mt-1" style={{ color: isDark ? "#9ca3af" : "#64748b" }}>
          {desc}
        </p>
      </div>
      <button
        onClick={onCopy}
        className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer"
        style={{
          borderColor: copied ? "#22c55e" : isDark ? "#4b5563" : "#d1d5db",
          background: copied ? "rgba(34,197,94,0.15)" : isDark ? "#1f2937" : "#f3f4f6",
          color: copied ? "#22c55e" : isDark ? "#f3f4f6" : "#1f2937",
        }}
      >
        {copied ? <IcoCheck size={12} /> : <IcoClipboard size={12} />}
        {copied ? "Prompt Copied!" : "Copy LLM Prompt"}
      </button>
    </div>
  );
};

/**
 * High-Fidelity GitHub Flavored Markdown Renderer powered by `marked`
 */
const EnhancedMarkdownRenderView: FC<{ text: string; isDark: boolean }> = ({ text, isDark }) => {
  const htmlContent = useMemo(() => {
    try {
      marked.setOptions({
        gfm: true,
        breaks: true,
      });
      return marked.parse(text) as string;
    } catch (e) {
      console.error("Marked parsing error:", e);
      return `<pre>${text}</pre>`;
    }
  }, [text]);

  const css = `
    .gfm-preview-content {
      font-size: 13.5px;
      line-height: 1.75;
      color: ${isDark ? "#e2e8f0" : "#1e293b"};
    }
    .gfm-preview-content h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #f59e0b;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
      border-bottom: 1px solid ${isDark ? "#334155" : "#e2e8f0"};
      padding-bottom: 0.35rem;
    }
    .gfm-preview-content h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: ${isDark ? "#fbbf24" : "#d97706"};
      margin-top: 1.25rem;
      margin-bottom: 0.5rem;
      border-bottom: 1px solid ${isDark ? "#1e293b" : "#f1f5f9"};
      padding-bottom: 0.25rem;
    }
    .gfm-preview-content h3 {
      font-size: 1.05rem;
      font-weight: 600;
      color: ${isDark ? "#fde68a" : "#b45309"};
      margin-top: 1rem;
      margin-bottom: 0.5rem;
    }
    .gfm-preview-content h4, .gfm-preview-content h5, .gfm-preview-content h6 {
      font-size: 0.95rem;
      font-weight: 600;
      margin-top: 0.75rem;
      margin-bottom: 0.35rem;
    }
    .gfm-preview-content p {
      margin-top: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .gfm-preview-content a {
      color: #f59e0b;
      text-decoration: none;
      border-bottom: 1px dashed #f59e0b;
      transition: all 0.15s ease;
    }
    .gfm-preview-content a:hover {
      border-bottom-style: solid;
      color: #d97706;
    }
    .gfm-preview-content blockquote {
      border-left: 4px solid #f59e0b;
      background: ${isDark ? "rgba(245, 158, 11, 0.07)" : "rgba(254, 243, 199, 0.5)"};
      padding: 0.5rem 1rem;
      margin: 0.75rem 0;
      border-radius: 0 8px 8px 0;
      font-style: italic;
      color: ${isDark ? "#cbd5e1" : "#475569"};
    }
    .gfm-preview-content ul {
      list-style-type: disc;
      padding-left: 1.5rem;
      margin: 0.5rem 0 0.75rem 0;
    }
    .gfm-preview-content ol {
      list-style-type: decimal;
      padding-left: 1.5rem;
      margin: 0.5rem 0 0.75rem 0;
    }
    .gfm-preview-content li {
      margin-bottom: 0.25rem;
    }
    .gfm-preview-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
      font-size: 12.5px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid ${isDark ? "#334155" : "#e2e8f0"};
    }
    .gfm-preview-content thead {
      background: ${isDark ? "#1e293b" : "#f1f5f9"};
      border-bottom: 2px solid ${isDark ? "#475569" : "#cbd5e1"};
    }
    .gfm-preview-content th {
      padding: 8px 12px;
      font-weight: 700;
      text-align: left;
      color: ${isDark ? "#f8fafc" : "#0f172a"};
      border: 1px solid ${isDark ? "#334155" : "#e2e8f0"};
    }
    .gfm-preview-content td {
      padding: 8px 12px;
      border: 1px solid ${isDark ? "#334155" : "#e2e8f0"};
    }
    .gfm-preview-content tr:nth-child(even) {
      background: ${isDark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.02)"};
    }
    .gfm-preview-content tr:hover {
      background: ${isDark ? "rgba(245, 158, 11, 0.08)" : "rgba(254, 243, 199, 0.4)"};
    }
    .gfm-preview-content code:not(pre code) {
      background: ${isDark ? "rgba(245, 158, 11, 0.12)" : "rgba(245, 158, 11, 0.15)"};
      color: ${isDark ? "#fbbf24" : "#b45309"};
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.85em;
      border: 1px solid ${isDark ? "rgba(245, 158, 11, 0.25)" : "rgba(245, 158, 11, 0.3)"};
    }
    .gfm-preview-content pre {
      background: ${isDark ? "#070b13" : "#0f172a"};
      color: #f8fafc;
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 0.75rem 0;
      border: 1px solid ${isDark ? "#1e293b" : "#334155"};
      font-family: monospace;
      font-size: 12px;
      line-height: 1.6;
    }
    .gfm-preview-content pre code {
      background: transparent;
      padding: 0;
      border: none;
      color: inherit;
    }
    .gfm-preview-content hr {
      border: 0;
      height: 1px;
      background: ${isDark ? "#334155" : "#e2e8f0"};
      margin: 1.5rem 0;
    }
    .gfm-preview-content input[type="checkbox"] {
      margin-right: 0.5rem;
      accent-color: #f59e0b;
    }
  `;

  return (
    <div className="relative">
      <style>{css}</style>
      <div
        className="gfm-preview-content"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
};
