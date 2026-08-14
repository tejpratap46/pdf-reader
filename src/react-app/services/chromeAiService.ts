import {
  AICapabilityAvailability,
  AILanguageModelFactory,
  AILanguageModelSession,
  AISummarizerFactory,
  AISummarizerSession,
} from "../types/chrome-ai";
import { StreamCallbacks } from "./aiService";

export type {
  AICapabilityAvailability,
  AILanguageModelFactory,
  AILanguageModelSession,
  AISummarizerFactory,
  AISummarizerSession,
};

export interface ChromeAiAvailabilityStatus {
  isSupported: boolean;
  status: AICapabilityAvailability | "not-supported";
  message: string;
  hasSummarizerApi: boolean;
  defaultTopK?: number;
  maxTopK?: number;
  defaultTemperature?: number;
  maxTemperature?: number;
}

export interface ChromeAiSessionOptions {
  docTitle?: string;
  docMarkdown: string;
  pageContext?: { current: number; total: number };
  scope?: "full" | "page";
  temperature?: number;
  topK?: number;
  onDownloadProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/**
 * Returns the global Chrome LanguageModel factory if supported.
 * Handles both modern `LanguageModel` / `window.ai.languageModel` and legacy `window.ai.assistant`.
 */
export function getChromeLanguageModelFactory(): AILanguageModelFactory | null {
  if (typeof window === "undefined") return null;

  if (typeof window.LanguageModel !== "undefined" && typeof window.LanguageModel.create === "function") {
    return window.LanguageModel;
  }

  if (window.ai?.languageModel && typeof window.ai.languageModel.create === "function") {
    return window.ai.languageModel;
  }

  if (window.ai?.assistant && typeof window.ai.assistant.create === "function") {
    return window.ai.assistant;
  }

  return null;
}

/**
 * Returns the global Chrome Summarizer factory if supported.
 */
export function getChromeSummarizerFactory(): AISummarizerFactory | null {
  if (typeof window === "undefined") return null;

  if (typeof window.Summarizer !== "undefined" && typeof window.Summarizer.create === "function") {
    return window.Summarizer;
  }

  if (window.ai?.summarizer && typeof window.ai.summarizer.create === "function") {
    return window.ai.summarizer;
  }

  return null;
}

/**
 * Checks whether Chrome Built-in AI is available, downloadable, or unsupported in the current browser.
 */
export async function checkChromeAiAvailability(): Promise<ChromeAiAvailabilityStatus> {
  const factory = getChromeLanguageModelFactory();
  const summarizerFactory = getChromeSummarizerFactory();

  if (!factory) {
    return {
      isSupported: false,
      status: "not-supported",
      message: "Chrome Built-in AI is not detected in your browser. Enable chrome://flags/#prompt-api-for-gemini-nano to use on-device Gemini Nano.",
      hasSummarizerApi: !!summarizerFactory,
    };
  }

  let status: AICapabilityAvailability = "unavailable";
  let defaultTopK: number | undefined;
  let maxTopK: number | undefined;
  let defaultTemperature: number | undefined;
  let maxTemperature: number | undefined;

  try {
    if (typeof factory.availability === "function") {
      status = await factory.availability();
    } else if (typeof factory.capabilities === "function") {
      const caps = await factory.capabilities();
      status = caps.available;
      defaultTopK = caps.defaultTopK;
      maxTopK = caps.maxTopK;
      defaultTemperature = caps.defaultTemperature;
      maxTemperature = caps.maxTemperature;
    } else {
      status = "readily";
    }

    if (typeof factory.params === "function") {
      const params = await factory.params();
      defaultTopK = params.defaultTopK;
      maxTopK = params.maxTopK;
      defaultTemperature = params.defaultTemperature;
      maxTemperature = params.maxTemperature;
    }
  } catch (err) {
    console.warn("Error probing Chrome Built-in AI capabilities:", err);
    status = "unavailable";
  }

  let message = "";
  let isSupported = false;

  switch (status) {
    case "readily":
    case "available":
      isSupported = true;
      message = "On-device Gemini Nano is ready to use instantly (100% private, no internet or login required).";
      break;
    case "after-download":
    case "downloadable":
      isSupported = true;
      message = "On-device Gemini Nano is available and will download directly to your browser on first prompt.";
      break;
    case "downloading":
      isSupported = true;
      message = "Gemini Nano model is currently downloading in the browser background.";
      break;
    case "no":
    case "unavailable":
    default:
      isSupported = false;
      message = "Built-in AI is not enabled or device hardware requirements are not met. Check chrome://flags and chrome://on-device-internals.";
      break;
  }

  return {
    isSupported,
    status,
    message,
    hasSummarizerApi: !!summarizerFactory,
    defaultTopK,
    maxTopK,
    defaultTemperature,
    maxTemperature,
  };
}

/**
 * Builds the compact system instruction prompt optimized for Chrome Gemini Nano's fast prefill.
 * Gemini Nano on-device prefill is fastest when context is under 8,000 characters.
 */
export function buildChromeAiSystemPrompt(options: {
  docTitle?: string;
  docMarkdown: string;
  pageContext?: { current: number; total: number };
  scope?: "full" | "page";
}): string {
  const { docTitle, docMarkdown, pageContext, scope = "full" } = options;
  const isSinglePage = scope === "page" && pageContext;
  // Compact context size for swift on-device neural prefill
  const maxChars = isSinglePage ? 8000 : 12000;
  const truncatedMarkdown =
    docMarkdown.length > maxChars
      ? `${docMarkdown.slice(0, maxChars)}\n\n[... Remaining content truncated for fast local on-device inference ...]`
      : docMarkdown;

  return `You are Folio AI running 100% locally on-device via Chrome Built-in Gemini Nano.
Answer questions accurately based on the document text provided below.

DOCUMENT: ${docTitle || "Active Document"}
${isSinglePage ? `SCOPE: Page ${pageContext.current} of ${pageContext.total}` : `SCOPE: Full Document (${pageContext?.total || 1} pages)`}

--- DOCUMENT CONTENT ---
${truncatedMarkdown}
--- END DOCUMENT ---

GUIDELINES:
1. Ground answers directly in the document text above.
2. Provide concise, clear, and structured answers using GitHub Markdown.
3. If information is missing, state it clearly.`;
}

/**
 * Creates and initializes a Chrome Built-in AI (Gemini Nano) session.
 */
export async function createChromeAiSession(
  options: ChromeAiSessionOptions
): Promise<AILanguageModelSession> {
  const factory = getChromeLanguageModelFactory();
  if (!factory) {
    throw new Error("Chrome Built-in AI is not supported in this browser. Please enable Chrome flags or use Cloud Gemini.");
  }

  const systemPrompt = buildChromeAiSystemPrompt(options);

  // Monitor download progress if provided
  const monitorCallback = options.onDownloadProgress
    ? (m: EventTarget) => {
        m.addEventListener("downloadprogress", (e: Event) => {
          const progressEvent = e as unknown as { loaded: number; total?: number };
          const percent = progressEvent.total
            ? Math.round((progressEvent.loaded / progressEvent.total) * 100)
            : Math.round(progressEvent.loaded * 100);
          options.onDownloadProgress?.(Math.min(100, Math.max(0, percent)));
        });
      }
    : undefined;

  // Try creating session with modern options
  try {
    return await factory.create({
      systemPrompt,
      initialPrompts: [
        {
          role: "system",
          content: systemPrompt,
        },
      ],
      temperature: options.temperature,
      topK: options.topK,
      signal: options.signal,
      monitor: monitorCallback,
    });
  } catch (initialErr) {
    console.warn("Failed creating Chrome AI session with full options, trying simplified options:", initialErr);
    // Fallback attempt with minimal parameters for compatibility across various Chrome Canary / Dev revisions
    try {
      return await factory.create({
        systemPrompt,
        signal: options.signal,
      });
    } catch {
      // Last-ditch attempt with empty options
      return await factory.create();
    }
  }
}

/**
 * Sends a streaming prompt to Chrome Built-in AI session with rich progressive telemetry
 * and phase updates (Session Init -> Context Ingestion -> Neural Inference -> Token Streaming).
 */
export async function sendChromeAiStreamingMessage(
  session: AILanguageModelSession,
  promptText: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<string> {
  const startTime = Date.now();
  let accumulatedText = "";
  let chunkCount = 0;
  let firstTokenReceived = false;

  // Initial stage notification: Neural model reasoning / prefill
  callbacks.onStageChange?.({
    stage: "prefilling",
    label: "Ingesting context into on-device Gemini Nano...",
    detail: "Encoding prompt tokens in local RAM/VRAM",
    elapsedMs: Date.now() - startTime,
  });

  try {
    if (typeof session.promptStreaming === "function") {
      // Periodic thinking ticker while awaiting first token from on-device engine
      const ticker = setInterval(() => {
        if (!firstTokenReceived && !signal?.aborted) {
          const elapsed = Date.now() - startTime;
          const seconds = (elapsed / 1000).toFixed(1);
          callbacks.onStageChange?.({
            stage: "thinking",
            label: `On-device neural inference (${seconds}s)...`,
            detail: "Gemini Nano is computing response on local CPU/GPU",
            elapsedMs: elapsed,
          });
        }
      }, 350);

      const stream = session.promptStreaming(promptText, { signal });

      try {
        // Handle AsyncIterable or ReadableStream
        if (Symbol.asyncIterator in Object(stream)) {
          const asyncIterable = stream as AsyncIterable<string>;
          for await (const rawChunk of asyncIterable) {
            if (signal?.aborted) break;

            if (!firstTokenReceived) {
              firstTokenReceived = true;
              clearInterval(ticker);
            }

            chunkCount++;
            const chunk = String(rawChunk || "");
            const elapsed = Date.now() - startTime;
            const speed = chunkCount / Math.max(0.1, elapsed / 1000);

            // Handle both cumulative chunks (standard Chrome Prompt API) and delta chunks
            if (chunk.length >= accumulatedText.length && chunk.startsWith(accumulatedText.slice(0, 10))) {
              const delta = chunk.slice(accumulatedText.length);
              accumulatedText = chunk;
              callbacks.onChunk(delta, accumulatedText);
            } else {
              accumulatedText += chunk;
              callbacks.onChunk(chunk, accumulatedText);
            }

            callbacks.onStageChange?.({
              stage: "streaming",
              label: `Streaming response (${accumulatedText.length} chars)`,
              detail: `${speed.toFixed(1)} tok/s on-device`,
              elapsedMs: elapsed,
              tokensReceived: chunkCount,
              charsReceived: accumulatedText.length,
              speed: Number(speed.toFixed(1)),
            });
          }
        } else if (stream instanceof ReadableStream) {
          const reader = stream.getReader();
          try {
            while (true) {
              if (signal?.aborted) break;
              const { done, value } = await reader.read();
              if (done) break;

              if (!firstTokenReceived) {
                firstTokenReceived = true;
                clearInterval(ticker);
              }

              chunkCount++;
              const chunk = String(value || "");
              const elapsed = Date.now() - startTime;
              const speed = chunkCount / Math.max(0.1, elapsed / 1000);

              if (chunk.length >= accumulatedText.length && chunk.startsWith(accumulatedText.slice(0, 10))) {
                const delta = chunk.slice(accumulatedText.length);
                accumulatedText = chunk;
                callbacks.onChunk(delta, accumulatedText);
              } else {
                accumulatedText += chunk;
                callbacks.onChunk(chunk, accumulatedText);
              }

              callbacks.onStageChange?.({
                stage: "streaming",
                label: `Streaming response (${accumulatedText.length} chars)`,
                detail: `${speed.toFixed(1)} tok/s on-device`,
                elapsedMs: elapsed,
                tokensReceived: chunkCount,
                charsReceived: accumulatedText.length,
                speed: Number(speed.toFixed(1)),
              });
            }
          } finally {
            reader.releaseLock();
          }
        }
      } finally {
        clearInterval(ticker);
      }
    } else {
      // Fallback to non-streaming prompt()
      callbacks.onStageChange?.({
        stage: "thinking",
        label: "Computing on-device response...",
        detail: "Awaiting local Gemini Nano generation",
        elapsedMs: Date.now() - startTime,
      });

      accumulatedText = await session.prompt(promptText, { signal });
      callbacks.onChunk(accumulatedText, accumulatedText);
    }

    const totalElapsed = Date.now() - startTime;
    callbacks.onStageChange?.({
      stage: "done",
      label: "Completed",
      elapsedMs: totalElapsed,
      charsReceived: accumulatedText.length,
      tokensReceived: chunkCount,
    });

    callbacks.onDone(accumulatedText);
    return accumulatedText;
  } catch (err: unknown) {
    if (signal?.aborted) {
      callbacks.onDone(accumulatedText);
      return accumulatedText;
    }
    console.error("Chrome Built-in AI error:", err);
    const rawMsg = err instanceof Error ? err.message : String(err);
    const errorObj = new Error(rawMsg || "On-device AI response failed.");
    callbacks.onStageChange?.({
      stage: "error",
      label: "Generation error",
      detail: rawMsg,
      elapsedMs: Date.now() - startTime,
    });
    callbacks.onError(errorObj);
    throw errorObj;
  }
}

/**
 * Summarizes text using Chrome Built-in Summarizer API if available.
 */
export async function summarizeWithChromeSummarizer(
  text: string,
  options?: {
    type?: "key-points" | "tldr" | "teaser" | "headline";
    length?: "short" | "medium" | "long";
    context?: string;
    signal?: AbortSignal;
  }
): Promise<string | null> {
  const factory = getChromeSummarizerFactory();
  if (!factory) return null;

  try {
    const session: AISummarizerSession = await factory.create({
      type: options?.type || "key-points",
      format: "markdown",
      length: options?.length || "medium",
      signal: options?.signal,
    });

    const summary = await session.summarize(text.slice(0, 16000), {
      context: options?.context,
      signal: options?.signal,
    });

    session.destroy();
    return summary;
  } catch (err) {
    console.warn("Chrome Summarizer API call failed, falling back to Prompt API:", err);
    return null;
  }
}
