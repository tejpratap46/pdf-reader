import { getAI, getGenerativeModel, GenerativeModel, ChatSession, GoogleAIBackend } from "firebase/ai";
import { app, isFirebaseConfigured } from "../config/firebase";
import {
  AILanguageModelSession,
  createChromeAiSession,
  sendChromeAiStreamingMessage,
  checkChromeAiAvailability,
  ChromeAiAvailabilityStatus,
} from "./chromeAiService";

export type AiProviderType = "chrome-builtin" | "firebase";
export type GeminiModelName = "gemini-3.7-flash";
export type ChromeModelName = "chrome-gemini-nano";
export type AnyAiModelId = GeminiModelName | ChromeModelName;

export interface GenerationStageInfo {
  stage: "initializing" | "prefilling" | "thinking" | "streaming" | "done" | "error";
  label: string;
  detail?: string;
  elapsedMs: number;
  tokensReceived?: number;
  charsReceived?: number;
  speed?: number; // tokens or chars per second
}

export interface AiModelInfo {
  id: AnyAiModelId;
  provider: AiProviderType;
  name: string;
  shortName: string;
  description: string;
  isLocal: boolean;
  requiresAuth: boolean;
  contextLimitText: string;
  maxTokens: number;
  badgeText: string;
  badgeColor: string;
  iconType: "cpu" | "cloud";
}

export const AI_MODELS: Record<AnyAiModelId, AiModelInfo> = {
  "chrome-gemini-nano": {
    id: "chrome-gemini-nano",
    provider: "chrome-builtin",
    name: "Chrome Gemini Nano (In-Browser)",
    shortName: "Gemini Nano",
    description: "100% private, on-device AI running directly in your browser. Zero cloud latency, no sign-in or API keys needed.",
    isLocal: true,
    requiresAuth: false,
    contextLimitText: "~4,096 - 8,192 tokens",
    maxTokens: 4096,
    badgeText: "On-Device",
    badgeColor: "emerald",
    iconType: "cpu",
  },
  "gemini-3.7-flash": {
    id: "gemini-3.7-flash",
    provider: "firebase",
    name: "Gemini 3.7 Flash (Cloud)",
    shortName: "Gemini 3.7 Flash",
    description: "Google's fastest multimodal model with a 1,000,000+ token context window and high reasoning fidelity.",
    isLocal: false,
    requiresAuth: true,
    contextLimitText: "1,048,576 tokens",
    maxTokens: 1048576,
    badgeText: "Cloud",
    badgeColor: "blue",
    iconType: "cloud",
  },
};

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  isError?: boolean;
  modelId?: AnyAiModelId;
  provider?: AiProviderType;
  stageInfo?: GenerationStageInfo;
}

export interface StreamCallbacks {
  onChunk: (chunkText: string, fullText: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
  onStageChange?: (info: GenerationStageInfo) => void;
}

let aiInstance: ReturnType<typeof getAI> | null = null;

export function getFirebaseAI() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Please provide your Firebase credentials in src/react-app/config/firebase.ts.");
  }
  if (!aiInstance) {
    try {
      aiInstance = getAI(app, { backend: new GoogleAIBackend() });
    } catch (e) {
      console.warn("Falling back to default getAI(app):", e);
      aiInstance = getAI(app);
    }
  }
  return aiInstance;
}

/**
 * Builds the system instruction prompt grounding the model in the provided Markdown context.
 */
export function buildDocumentSystemInstruction(options: {
  docTitle?: string;
  docMarkdown: string;
  pageContext?: { current: number; total: number };
  scope?: "full" | "page";
}): string {
  const { docTitle, docMarkdown, pageContext, scope = "full" } = options;
  const titleStr = docTitle ? `Document: "${docTitle}"\n` : "";
  const isSinglePage = scope === "page" && pageContext;
  const contextHeader = isSinglePage
    ? `PAGE ${pageContext.current} OF ${pageContext.total} CONTEXT`
    : `FULL DOCUMENT CONTEXT (${pageContext?.total || 1} PAGES)`;

  return `You are Pdf Reader AI, an advanced and accurate document intelligence assistant in Pdf Reader.
Your role is to answer questions, explain concepts, extract data/tables, and provide deep insights about the document context provided below.

================ DOCUMENT METADATA ================
${titleStr}${isSinglePage ? `Active Scope: Page ${pageContext.current} only.\n` : "Active Scope: Full Document.\n"}
================ ${contextHeader} ================
\`\`\`markdown
${docMarkdown.slice(0, 500000)}
\`\`\`
===================================================

GUIDELINES:
1. Ground your answers strictly and faithfully in the document context provided above.
2. If the user asks about something mentioned in the context, quote or cite specific details directly.
3. If the answer cannot be found in the provided context, clearly inform the user.
4. Format responses using rich GitHub Flavored Markdown (bullet points, bold text, headers, clean markdown tables, and syntax-highlighted code blocks).
5. Be concise, direct, and structured.`;
}

/**
 * Initializes a generative model with the document context system instruction.
 */
export function createDocumentModel(options: {
  docTitle?: string;
  docMarkdown: string;
  pageContext?: { current: number; total: number };
  scope?: "full" | "page";
  modelName?: GeminiModelName;
}): GenerativeModel {
  const ai = getFirebaseAI();
  const modelName = options.modelName || "gemini-3.7-flash";
  const systemInstruction = buildDocumentSystemInstruction(options);

  return getGenerativeModel(ai, {
    model: modelName,
    systemInstruction: {
      role: "system",
      parts: [{ text: systemInstruction }],
    },
  });
}

/**
 * Starts a new multi-turn Firebase chat session with optional prior history.
 */
export function startDocChatSession(options: {
  docTitle?: string;
  docMarkdown: string;
  pageContext?: { current: number; total: number };
  scope?: "full" | "page";
  modelName?: GeminiModelName;
  history?: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>;
}): ChatSession {
  const model = createDocumentModel(options);
  return model.startChat({
    history: options.history || [],
  });
}

/**
 * Sends a message in a Firebase chat session and streams the response in real-time.
 */
export async function sendStreamingChatMessage(
  chatSession: ChatSession,
  message: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<string> {
  const startTime = Date.now();
  let accumulatedText = "";
  let chunkCount = 0;

  callbacks.onStageChange?.({
    stage: "thinking",
    label: "Connecting to Cloud Gemini 3.7 Flash...",
    detail: "Sending prompt context to Google AI servers",
    elapsedMs: 0,
  });

  try {
    const result = await chatSession.sendMessageStream(message);

    for await (const chunk of result.stream) {
      if (signal?.aborted) {
        break;
      }
      const text = chunk.text();
      if (text) {
        chunkCount++;
        accumulatedText += text;
        const elapsed = Date.now() - startTime;
        callbacks.onChunk(text, accumulatedText);
        callbacks.onStageChange?.({
          stage: "streaming",
          label: `Streaming response (${accumulatedText.length} chars)`,
          detail: "Gemini 3.7 Flash Cloud",
          elapsedMs: elapsed,
          tokensReceived: chunkCount,
          charsReceived: accumulatedText.length,
        });
      }
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
    console.error("Firebase AI streaming error:", err);
    const rawMessage = err instanceof Error ? err.message : String(err);
    let message = rawMessage || "Failed to generate AI response.";
    if (message.includes("quota") || message.includes("429")) {
      message = "API rate limit reached. Please wait a few moments before sending another message.";
    } else if (message.includes("appId") || message.includes("no-app-id")) {
      message = "Firebase App ID configuration missing in src/react-app/config/firebase.ts.";
    } else if (message.includes("API key not valid") || message.includes("auth/invalid-api-key")) {
      message = "Invalid Firebase API key. Please check your credentials.";
    } else if (message.includes("RESOURCE_EXHAUSTED")) {
      message = "Gemini quota exceeded. Please try again shortly or select a different model.";
    }
    const errorObj = new Error(message);
    callbacks.onStageChange?.({
      stage: "error",
      label: "Cloud generation error",
      detail: message,
      elapsedMs: Date.now() - startTime,
    });
    callbacks.onError(errorObj);
    throw errorObj;
  }
}

/**
 * Quick prompt templates for document intelligence
 */
export const QUICK_PROMPTS = [
  {
    id: "summary",
    label: "Summarize Document",
    icon: "📝",
    prompt: "Please provide a clear and structured summary of this document, highlighting the main purpose, key findings, and concluding takeaways in bullet points.",
  },
  {
    id: "key-points",
    label: "Key Takeaways",
    icon: "💡",
    prompt: "What are the top 5 most important points or takeaways from this document?",
  },
  {
    id: "tables",
    label: "Extract Tables & Data",
    icon: "📊",
    prompt: "Extract all key numerical data, tables, statistics, metrics, and dates mentioned in the document and present them in clean Markdown tables.",
  },
  {
    id: "quiz",
    label: "Generate Study Quiz",
    icon: "❓",
    prompt: "Create 5 multiple-choice quiz questions with answer explanations based on the core concepts in this document.",
  },
  {
    id: "explain-simple",
    label: "Explain Simply",
    icon: "👶",
    prompt: "Explain the main topic and core arguments of this document in simple, easy-to-understand terms as if explaining to a beginner.",
  },
];

export {
  createChromeAiSession,
  sendChromeAiStreamingMessage,
  checkChromeAiAvailability,
};
export type { ChromeAiAvailabilityStatus, AILanguageModelSession };
