import { getAI, getGenerativeModel, GenerativeModel, ChatSession, GoogleAIBackend } from "firebase/ai";
import { app, isFirebaseConfigured } from "../config/firebase";

export type GeminiModelName = "gemini-3.7-flash";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  isError?: boolean;
}

export interface StreamCallbacks {
  onChunk: (chunkText: string, fullText: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
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

  return `You are Folio AI, an advanced and accurate document intelligence assistant in Folio Reader.
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
 * Starts a new multi-turn chat session with optional prior history.
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
 * Sends a message in a chat session and streams the response in real-time.
 */
export async function sendStreamingChatMessage(
  chatSession: ChatSession,
  message: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<string> {
  let accumulatedText = "";

  try {
    const result = await chatSession.sendMessageStream(message);

    for await (const chunk of result.stream) {
      if (signal?.aborted) {
        break;
      }
      const text = chunk.text();
      if (text) {
        accumulatedText += text;
        callbacks.onChunk(text, accumulatedText);
      }
    }

    callbacks.onDone(accumulatedText);
    return accumulatedText;
  } catch (err: unknown) {
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
