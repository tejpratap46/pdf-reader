import { FC } from "react";
import { ReaderAiProps } from "../../types/reader";

/**
 * Reader Mode AI Architecture Slot
 * Provides a clean interface and container for reader-specific AI features
 * (e.g. paragraph summarization, vocabulary explainer, inline Q&A).
 * Hidden by default per design specification; ready for instant activation.
 */
export const ReaderAiPlaceholder: FC<ReaderAiProps> = ({
  docTitle,
  markdown,
  currentPageMarkdown,
  sourceMode,
  isVisible = false,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      data-testid="reader-ai-container"
      className="hidden flex-col gap-4 p-4 rounded-2xl border bg-card text-card-foreground shadow-sm transition-all"
      data-doc-title={docTitle}
      data-doc-length={markdown.length}
      data-page-length={currentPageMarkdown?.length ?? 0}
      data-source-mode={sourceMode}
    >
      {/* Ready for Reader AI feature extensions */}
    </div>
  );
};
