/**
 * TypeScript Declarations for Chrome Built-in AI (Prompt API, Summarizer API, LanguageModel)
 * Reference: https://developer.chrome.com/docs/ai/built-in/overview
 */

export type AICapabilityAvailability =
  | "readily"
  | "after-download"
  | "downloadable"
  | "downloading"
  | "no"
  | "unavailable"
  | "available";

export interface AICapabilities {
  available: AICapabilityAvailability;
  defaultTopK?: number;
  maxTopK?: number;
  defaultTemperature?: number;
  maxTemperature?: number;
}

export interface AIModelDownloadProgressEvent extends Event {
  loaded: number;
  total?: number;
}

export interface AILanguageModelPromptOptions {
  signal?: AbortSignal;
  context?: string;
  responseConstraint?: unknown;
}

export interface AILanguageModelCreateOptions {
  signal?: AbortSignal;
  systemPrompt?: string;
  initialPrompts?: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  topK?: number;
  expectedInputs?: Array<{
    type: "text" | "image" | "audio";
    languages?: string[];
  }>;
  expectedOutputs?: Array<{
    type: "text";
    languages?: string[];
  }>;
  monitor?: (monitorTarget: EventTarget) => void;
}

export interface AILanguageModelSession {
  prompt(input: string | Array<{ role: string; content: string }>, options?: AILanguageModelPromptOptions): Promise<string>;
  promptStreaming(input: string | Array<{ role: string; content: string }>, options?: AILanguageModelPromptOptions): AsyncIterable<string> | ReadableStream<string>;
  countPromptTokens?(input: string): Promise<number>;
  tokensSoFar?: number;
  maxTokens?: number;
  tokensLeft?: number;
  clone?(): Promise<AILanguageModelSession>;
  destroy(): void;
}

export interface AILanguageModelFactory {
  availability?(options?: AILanguageModelCreateOptions): Promise<AICapabilityAvailability>;
  capabilities?(): Promise<AICapabilities>;
  params?(): Promise<{
    defaultTopK: number;
    maxTopK: number;
    defaultTemperature: number;
    maxTemperature: number;
  }>;
  create(options?: AILanguageModelCreateOptions): Promise<AILanguageModelSession>;
}

export interface AISummarizerCreateOptions {
  signal?: AbortSignal;
  type?: "key-points" | "tldr" | "teaser" | "headline";
  format?: "markdown" | "plain-text";
  length?: "short" | "medium" | "long";
  sharedContext?: string;
  monitor?: (monitorTarget: EventTarget) => void;
}

export interface AISummarizerSession {
  summarize(text: string, options?: { context?: string; signal?: AbortSignal }): Promise<string>;
  summarizeStreaming?(text: string, options?: { context?: string; signal?: AbortSignal }): AsyncIterable<string> | ReadableStream<string>;
  ready?: Promise<void>;
  destroy(): void;
}

export interface AISummarizerFactory {
  availability?(options?: AISummarizerCreateOptions): Promise<AICapabilityAvailability>;
  capabilities?(): Promise<AICapabilities>;
  create(options?: AISummarizerCreateOptions): Promise<AISummarizerSession>;
}

export interface ChromeAIObject {
  languageModel?: AILanguageModelFactory;
  assistant?: AILanguageModelFactory; // Legacy Canary naming
  summarizer?: AISummarizerFactory;
  writer?: unknown;
  rewriter?: unknown;
}

declare global {
  interface Window {
    ai?: ChromeAIObject;
    LanguageModel?: AILanguageModelFactory;
    Summarizer?: AISummarizerFactory;
  }
}
