export type Theme = "light" | "dark" | "amoled" | "system";
export type ResolvedTheme = "light" | "dark" | "amoled";
export type TtsState = "idle" | "playing" | "paused";
export type SourceMode = "pdf" | "web";
export type ViewMode = "scroll" | "single";
export type AppMode = "viewer" | "reader" | "editor";

export interface PageSize {
  width: number;
  height: number;
  aspectRatio: number;
}

export interface KeepAlive {
  ctx: AudioContext;
  src: AudioBufferSourceNode;
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface TtsWordBoundary {
  paraIndex: number;
  charIndex: number;
  charLength?: number;
  word?: string;
}

export interface ReaderTypographyConfig {
  fontFamily: "sans" | "serif" | "mono";
  fontSize: "sm" | "base" | "lg" | "xl";
  contentWidth: "compact" | "normal" | "wide";
  lineHeight: "normal" | "relaxed" | "loose";
}

export interface ReaderAiProps {
  docTitle: string;
  markdown: string;
  currentPageMarkdown?: string;
  sourceMode: SourceMode;
  isVisible?: boolean;
}

export interface EditorAiProps {
  pdfBytes: Uint8Array | null;
  fileName: string;
  activePageIndex: number;
  totalPages: number;
  isVisible?: boolean;
}

