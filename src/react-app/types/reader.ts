export type Theme = "light" | "dark" | "system";
export type TtsState = "idle" | "playing" | "paused";
export type SourceMode = "pdf" | "web";
export type ViewMode = "scroll" | "single";

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
