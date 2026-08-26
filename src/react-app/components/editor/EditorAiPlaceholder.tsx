import { FC } from "react";
import { EditorAiProps } from "../../types/reader";

/**
 * Editor Mode AI Architecture Slot
 * Provides a clean interface and container for editor-specific AI features
 * (e.g. AI-assisted form fill, visual table extraction, smart redaction, OCR rewrite).
 * Hidden by default per design specification; ready for future activation.
 */
export const EditorAiPlaceholder: FC<EditorAiProps> = ({
  pdfBytes,
  fileName,
  activePageIndex,
  totalPages,
  isVisible = false,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      data-testid="editor-ai-container"
      className="hidden flex-col gap-3 p-3 rounded-xl border bg-card text-card-foreground"
      data-file-name={fileName}
      data-has-bytes={Boolean(pdfBytes)}
      data-active-page={activePageIndex}
      data-total-pages={totalPages}
    >
      {/* Ready for Editor AI feature extensions */}
    </div>
  );
};
