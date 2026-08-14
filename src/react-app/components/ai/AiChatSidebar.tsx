import {
  FC,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  KeyboardEvent,
  ChangeEvent,
} from "react";
import { useAuth } from "../../context/AuthContext";
import { useDark } from "../../hooks/useTheme";
import {
  ChatMessage,
  AiProviderType,
  AnyAiModelId,
  AI_MODELS,
  QUICK_PROMPTS,
  startDocChatSession,
  sendStreamingChatMessage,
  buildDocumentSystemInstruction,
  checkChromeAiAvailability,
  createChromeAiSession,
  sendChromeAiStreamingMessage,
  ChromeAiAvailabilityStatus,
  AILanguageModelSession,
  GenerationStageInfo,
} from "../../services/aiService";
import { estimateTokenCount } from "tokenx";
import { ChatSession } from "firebase/ai";
import { AiChatMessage } from "./AiChatMessage";
import { SidebarResizer } from "../reader/SidebarResizer";
import { markdownToSpeechText } from "../../utils/textExtractor";
import {
  IcoSparkles,
  IcoSparklesFilled,
  IcoSend,
  IcoStopCircle,
  IcoRefresh,
  IcoGoogle,
  IcoLoader,
  IcoChevR,
  IcoAlertCircle,
  IcoFile,
  IcoCheck,
  IcoCpu,
  IcoCloud,
  IcoExternalLink,
  IcoCopy,
  IcoZap,
} from "../common/Icons";

interface AiChatSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  sidebarWidth?: number;
  isDragging?: boolean;
  onResizeMouseDown?: (e: React.MouseEvent) => void;
  onResizeTouchStart?: (e: React.TouchEvent) => void;
  onResetWidth?: () => void;

  // Active Document Props
  docTitle?: string;
  docMarkdown: string;
  currentPageMarkdown?: string;
  isExtractingMarkdown: boolean;
  currentPage: number;
  totalPages: number;
  sourceMode: "pdf" | "web";

  // TTS Settings
  voices?: SpeechSynthesisVoice[];
  selectedVoice?: string;
  ttsRate?: number;
  ttsPitch?: number;

  // Style tokens
  border: string;
  bgSide: string;
  bgInput: string;
  bgHover: string;
  textMain: string;
  textMut: string;
}

const STORAGE_PROVIDER_KEY = "folio_reader_ai_provider";

export const AiChatSidebar: FC<AiChatSidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  sidebarWidth = 360,
  isDragging = false,
  onResizeMouseDown,
  onResizeTouchStart,
  onResetWidth,
  docTitle,
  docMarkdown,
  currentPageMarkdown = "",
  isExtractingMarkdown,
  currentPage,
  totalPages,
  voices = [],
  selectedVoice = "",
  ttsRate = 1,
  ttsPitch = 1,
  border,
  bgSide,
  bgInput,
  bgHover,
  textMain,
  textMut,
}) => {
  const isDark = useDark();
  const { user, signInWithGoogle, actionLoading, error: authError } = useAuth();

  // Provider & Model State
  const [provider, setProvider] = useState<AiProviderType>(() => {
    const saved = localStorage.getItem(STORAGE_PROVIDER_KEY);
    if (saved === "chrome-builtin" || saved === "firebase") return saved;
    return "chrome-builtin";
  });

  const [chromeAiStatus, setChromeAiStatus] = useState<ChromeAiAvailabilityStatus | null>(null);
  const [isCheckingChromeAi, setIsCheckingChromeAi] = useState(false);
  const [chromeDownloadProgress, setChromeDownloadProgress] = useState<number | null>(null);
  const [copiedFlagUrl, setCopiedFlagUrl] = useState<string | null>(null);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [contextScope, setContextScope] = useState<"full" | "page">("full");
  const [showTokenDetails, setShowTokenDetails] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const firebaseChatSessionRef = useRef<ChatSession | null>(null);
  const chromeAiSessionRef = useRef<AILanguageModelSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tokenDetailsRef = useRef<HTMLDivElement>(null);

  const currentModelId: AnyAiModelId = provider === "chrome-builtin" ? "chrome-gemini-nano" : "gemini-3.7-flash";
  const currentModel = AI_MODELS[currentModelId];

  // Probes Chrome Built-in AI availability
  const refreshChromeAiAvailability = useCallback(async () => {
    setIsCheckingChromeAi(true);
    try {
      const status = await checkChromeAiAvailability();
      setChromeAiStatus(status);
    } catch (err) {
      console.warn("Chrome AI check failed:", err);
      setChromeAiStatus({
        isSupported: false,
        status: "not-supported",
        message: "Failed to detect Chrome Built-in AI capabilities.",
        hasSummarizerApi: false,
      });
    } finally {
      setIsCheckingChromeAi(false);
    }
  }, []);

  // Initial Chrome AI check
  useEffect(() => {
    refreshChromeAiAvailability();
  }, [refreshChromeAiAvailability]);

  // Handle Provider Switch
  const handleSelectProvider = (newProvider: AiProviderType) => {
    if (newProvider === provider) return;
    setProvider(newProvider);
    localStorage.setItem(STORAGE_PROVIDER_KEY, newProvider);
    if (newProvider === "chrome-builtin") {
      refreshChromeAiAvailability();
    }
  };

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      if (speakingMsgId) {
        window.speechSynthesis.cancel();
      }
    };
  }, [speakingMsgId]);

  // Read AI message aloud using selected TTS voice and rate
  const handleToggleSpeak = useCallback(
    (msgId: string, content: string) => {
      if (speakingMsgId === msgId) {
        window.speechSynthesis.cancel();
        setSpeakingMsgId(null);
        return;
      }

      window.speechSynthesis.cancel();
      const speechText = markdownToSpeechText(content);
      if (!speechText) return;

      const utter = new SpeechSynthesisUtterance(speechText);
      utter.rate = ttsRate;
      utter.pitch = ttsPitch;
      const voice = voices.find((v) => v.name === selectedVoice);
      if (voice) utter.voice = voice;

      utter.onstart = () => {
        setSpeakingMsgId(msgId);
      };
      utter.onend = () => {
        setSpeakingMsgId(null);
      };
      utter.onerror = () => {
        setSpeakingMsgId(null);
      };

      window.speechSynthesis.speak(utter);
      setSpeakingMsgId(msgId);
    },
    [speakingMsgId, ttsRate, ttsPitch, voices, selectedVoice]
  );

  // Close token breakdown on outside click
  useEffect(() => {
    if (!showTokenDetails) return;
    const handleOutside = (e: MouseEvent) => {
      if (tokenDetailsRef.current && !tokenDetailsRef.current.contains(e.target as Node)) {
        setShowTokenDetails(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showTokenDetails]);

  // Auto-scroll to bottom of chat
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Active Markdown context based on selected contextScope
  const activeMarkdown = useMemo(() => {
    if (contextScope === "page") {
      return currentPageMarkdown || docMarkdown;
    }
    return docMarkdown;
  }, [contextScope, currentPageMarkdown, docMarkdown]);

  // Reset chat sessions when context scope, page, or document changes
  useEffect(() => {
    firebaseChatSessionRef.current = null;
    if (chromeAiSessionRef.current) {
      try {
        chromeAiSessionRef.current.destroy();
      } catch {
        // ignore
      }
      chromeAiSessionRef.current = null;
    }
  }, [contextScope, currentPage, activeMarkdown, provider]);

  // Pre-warm Chrome Gemini Nano session in background idle time for instant sub-second response
  useEffect(() => {
    if (provider !== "chrome-builtin" || !chromeAiStatus?.isSupported || !sidebarOpen) return;
    if (!activeMarkdown || isExtractingMarkdown) return;
    if (chromeAiSessionRef.current) return;

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      try {
        if (cancelled || chromeAiSessionRef.current) return;
        const session = await createChromeAiSession({
          docTitle: docTitle || "Active Document",
          docMarkdown: activeMarkdown,
          pageContext: { current: currentPage, total: totalPages },
          scope: contextScope,
        });
        if (!cancelled) {
          chromeAiSessionRef.current = session;
        } else {
          session.destroy();
        }
      } catch {
        // ignore background prewarm failure
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [
    provider,
    chromeAiStatus?.isSupported,
    sidebarOpen,
    activeMarkdown,
    isExtractingMarkdown,
    currentPage,
    totalPages,
    contextScope,
    docTitle,
  ]);

  // Token calculations
  const fileContextTokens = useMemo(() => {
    return estimateTokenCount(activeMarkdown);
  }, [activeMarkdown]);

  const systemInstructionTokens = useMemo(() => {
    const fullSystemInstruction = buildDocumentSystemInstruction({
      docTitle: docTitle || "Active Document",
      docMarkdown: activeMarkdown || "",
      pageContext: { current: currentPage, total: totalPages },
      scope: contextScope,
    });
    return estimateTokenCount(fullSystemInstruction);
  }, [docTitle, activeMarkdown, currentPage, totalPages, contextScope]);

  const historyTokens = useMemo(() => {
    return messages.reduce((total, msg) => total + estimateTokenCount(msg.content), 0);
  }, [messages]);

  const queryTokens = useMemo(() => {
    return estimateTokenCount(inputValue);
  }, [inputValue]);

  const totalInputTokens = useMemo(() => {
    return systemInstructionTokens + historyTokens + queryTokens;
  }, [systemInstructionTokens, historyTokens, queryTokens]);

  const contextStats = useMemo(() => {
    const chars = activeMarkdown.length;
    const words = activeMarkdown.trim() ? activeMarkdown.trim().split(/\s+/).length : 0;
    return { chars, words, tokens: fileContextTokens };
  }, [activeMarkdown, fileContextTokens]);

  // Reset or clear conversation
  const resetChatSession = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    firebaseChatSessionRef.current = null;
    if (chromeAiSessionRef.current) {
      try {
        chromeAiSessionRef.current.destroy();
      } catch {
        // ignore
      }
      chromeAiSessionRef.current = null;
    }
    setMessages([]);
    setIsGenerating(false);
  }, []);

  // Send a message via selected provider (Chrome Built-in AI or Firebase AI)
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isGenerating) return;

    // For Firebase Cloud AI, authentication is required
    if (provider === "firebase" && !user) {
      await signInWithGoogle();
      return;
    }

    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `ai-${Date.now()}`;

    const userMsg: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: query,
      timestamp: Date.now(),
    };

    const initialAiMsg: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
      modelId: currentModelId,
      provider: provider,
      stageInfo: {
        stage: "prefilling",
        label: provider === "chrome-builtin" ? "Ingesting context into on-device Gemini Nano..." : "Connecting to Cloud Gemini...",
        detail: provider === "chrome-builtin" ? "Encoding prompt tokens in local RAM/VRAM" : "Sending document context",
        elapsedMs: 0,
      },
    };

    setMessages((prev) => [...prev, userMsg, initialAiMsg]);
    setIsGenerating(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const streamCallbacks = {
      onChunk: (_chunk: string, fullText: string) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: fullText, isStreaming: true }
              : msg
          )
        );
      },
      onStageChange: (stageInfo: GenerationStageInfo) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, stageInfo }
              : msg
          )
        );
      },
      onDone: (finalText: string) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: finalText, isStreaming: false }
              : msg
          )
        );
        setIsGenerating(false);
      },
      onError: (err: Error) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: `Error: ${err.message || "Failed to generate response."}`,
                  isStreaming: false,
                  isError: true,
                }
              : msg
          )
        );
        setIsGenerating(false);
      },
    };

    try {
      if (provider === "chrome-builtin") {
        // Run locally via Chrome Built-in AI (Gemini Nano)
        if (!chromeAiSessionRef.current) {
          streamCallbacks.onStageChange({
            stage: "initializing",
            label: "Loading on-device model into memory...",
            detail: "Initializing Gemini Nano in Chrome...",
            elapsedMs: Date.now() - userMsg.timestamp,
          });
          chromeAiSessionRef.current = await createChromeAiSession({
            docTitle: docTitle || "Active Document",
            docMarkdown: activeMarkdown || "No document loaded.",
            pageContext: { current: currentPage, total: totalPages },
            scope: contextScope,
            signal: abortController.signal,
            onDownloadProgress: (percent) => {
              setChromeDownloadProgress(percent);
            },
          });
          setChromeDownloadProgress(null);
        }

        await sendChromeAiStreamingMessage(
          chromeAiSessionRef.current,
          query,
          streamCallbacks,
          abortController.signal
        );
      } else {
        // Run via Firebase Cloud AI (Gemini 3.7 Flash)
        if (!firebaseChatSessionRef.current) {
          firebaseChatSessionRef.current = startDocChatSession({
            docTitle: docTitle || "Active Document",
            docMarkdown: activeMarkdown || "No document loaded yet.",
            pageContext: { current: currentPage, total: totalPages },
            scope: contextScope,
            modelName: "gemini-3.7-flash",
          });
        }

        await sendStreamingChatMessage(
          firebaseChatSessionRef.current,
          query,
          streamCallbacks,
          abortController.signal
        );
      }
    } catch {
      setIsGenerating(false);
    }
  };

  // Stop generation
  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setMessages((prev) =>
      prev.map((msg) => (msg.isStreaming ? { ...msg, isStreaming: false } : msg))
    );
  };

  // Handle textarea auto-resize and Enter key
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(120, e.target.scrollHeight)}px`;
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFlagUrl(id);
      setTimeout(() => setCopiedFlagUrl(null), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <aside
      className={`relative flex flex-col shrink-0 overflow-hidden ${
        isDragging ? "" : "transition-[width] duration-300 ease-out"
      }`}
      style={{
        width: sidebarOpen ? sidebarWidth : 0,
        borderLeft: sidebarOpen ? `1px solid ${border}` : "none",
        background: bgSide,
      }}
    >
      {/* Resizer handle on the LEFT edge of the right sidebar */}
      {sidebarOpen && onResizeMouseDown && onResizeTouchStart && (
        <SidebarResizer
          side="right"
          onMouseDown={onResizeMouseDown}
          onTouchStart={onResizeTouchStart}
          onDoubleClick={onResetWidth}
          isDragging={!!isDragging}
          currentWidth={sidebarWidth}
        />
      )}

      <div
        className="flex-1 overflow-hidden flex flex-col"
        style={{
          width: Math.max(280, sidebarWidth),
          minWidth: 280,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3.5 py-2.5 border-b shrink-0"
          style={{ borderColor: border, backgroundColor: isDark ? "#0f172a" : "#ffffff" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-sm"
              style={{
                background:
                  provider === "chrome-builtin"
                    ? "linear-gradient(135deg, #10B981, #059669)"
                    : "linear-gradient(135deg, #4285F4, #9333EA)",
              }}
            >
              {provider === "chrome-builtin" ? <IcoCpu size={14} /> : <IcoSparklesFilled size={13} />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-wide" style={{ color: textMain }}>
                  Folio AI
                </span>
                <span
                  className="px-1.5 py-0.2 text-[9px] font-semibold rounded-full border"
                  style={{
                    backgroundColor:
                      provider === "chrome-builtin"
                        ? isDark
                          ? "rgba(16, 185, 129, 0.15)"
                          : "rgba(16, 185, 129, 0.1)"
                        : isDark
                        ? "rgba(66, 133, 244, 0.15)"
                        : "rgba(66, 133, 244, 0.1)",
                    borderColor:
                      provider === "chrome-builtin"
                        ? isDark
                          ? "rgba(16, 185, 129, 0.35)"
                          : "rgba(16, 185, 129, 0.25)"
                        : isDark
                        ? "rgba(66, 133, 244, 0.35)"
                        : "rgba(66, 133, 244, 0.25)",
                    color:
                      provider === "chrome-builtin"
                        ? isDark
                          ? "#6ee7b7"
                          : "#059669"
                        : isDark
                        ? "#93c5fd"
                        : "#2563eb",
                  }}
                >
                  {provider === "chrome-builtin" ? "In-Browser (Nano)" : "Cloud (Flash)"}
                </span>
              </div>
              <p className="text-[10px]" style={{ color: textMut }}>
                {provider === "chrome-builtin" ? "100% On-Device AI" : "Gemini 3.7 Flash"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={resetChatSession}
                title="Clear chat history"
                className="p-1.5 rounded-lg hover:bg-slate-500/15 transition-colors cursor-pointer"
                style={{ color: textMut }}
              >
                <IcoRefresh size={14} />
              </button>
            )}
            <button
              onClick={() => setSidebarOpen(false)}
              title="Collapse AI sidebar (Ctrl+J)"
              className="p-1.5 rounded-lg hover:bg-slate-500/15 transition-colors cursor-pointer"
              style={{ color: textMut }}
            >
              <IcoChevR size={16} />
            </button>
          </div>
        </div>

        {/* AI Provider & Engine Switcher Bar */}
        <div
          className="p-2 border-b flex flex-col gap-1.5 shrink-0"
          style={{
            borderColor: border,
            backgroundColor: isDark ? "rgba(15, 23, 42, 0.5)" : "rgba(248, 250, 252, 0.8)",
          }}
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider pl-1" style={{ color: textMut }}>
              AI Engine:
            </span>

            {/* Provider Segmented Toggle */}
            <div
              className="flex rounded-lg p-0.5 border"
              style={{ borderColor: border, backgroundColor: bgInput }}
            >
              <button
                onClick={() => handleSelectProvider("chrome-builtin")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  provider === "chrome-builtin"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "hover:text-emerald-500"
                }`}
                style={{ color: provider === "chrome-builtin" ? "#ffffff" : textMut }}
                title="In-Browser AI (Chrome Built-in Gemini Nano): 100% on-device, private, no login required."
              >
                <IcoCpu size={12} />
                <span>In-Browser AI</span>
              </button>

              <button
                onClick={() => handleSelectProvider("firebase")}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  provider === "firebase"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "hover:text-blue-500"
                }`}
                style={{ color: provider === "firebase" ? "#ffffff" : textMut }}
                title="Cloud AI (Firebase Gemini 3.7 Flash): 1M context window, requires Google login."
              >
                <IcoCloud size={12} />
                <span>Cloud Gemini</span>
              </button>
            </div>
          </div>

          {/* Context Scope & Ready State */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: border }}>
            {/* Scope Toggle */}
            <div className="flex rounded-md p-0.5 border" style={{ borderColor: border, backgroundColor: bgInput }}>
              <button
                onClick={() => setContextScope("full")}
                className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors cursor-pointer ${
                  contextScope === "full" ? "bg-amber-500 text-white font-bold" : ""
                }`}
                style={{ color: contextScope === "full" ? "#ffffff" : textMut }}
                title="Include entire document markdown as context"
              >
                Full Doc
              </button>
              <button
                onClick={() => setContextScope("page")}
                className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors cursor-pointer ${
                  contextScope === "page" ? "bg-amber-500 text-white font-bold" : ""
                }`}
                style={{ color: contextScope === "page" ? "#ffffff" : textMut }}
                title={`Focus specifically on page ${currentPage}`}
              >
                Page {currentPage}
              </button>
            </div>

            {/* Provider Privacy & Auth Status Pill */}
            {provider === "chrome-builtin" ? (
              <span
                className="inline-flex items-center gap-1 text-[9.5px] font-medium px-1.5 py-0.5 rounded-full border"
                style={{
                  backgroundColor:
                    chromeAiStatus?.isSupported
                      ? isDark
                        ? "rgba(16, 185, 129, 0.1)"
                        : "#ecfdf5"
                      : isDark
                      ? "rgba(245, 158, 11, 0.1)"
                      : "#fffbeb",
                  borderColor:
                    chromeAiStatus?.isSupported
                      ? isDark
                        ? "rgba(16, 185, 129, 0.3)"
                        : "#a7f3d0"
                      : isDark
                      ? "rgba(245, 158, 11, 0.3)"
                      : "#fde68a",
                  color:
                    chromeAiStatus?.isSupported
                      ? isDark
                        ? "#6ee7b7"
                        : "#059669"
                      : isDark
                      ? "#fcd34d"
                      : "#d97706",
                }}
              >
                <span>{chromeAiStatus?.isSupported ? "🔒 100% Private" : "⚠️ Setup Needed"}</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-[9.5px] font-medium px-1.5 py-0.5 rounded-full border"
                style={{
                  backgroundColor: user ? (isDark ? "rgba(59, 130, 246, 0.1)" : "#eff6ff") : (isDark ? "rgba(239, 68, 68, 0.1)" : "#fef2f2"),
                  borderColor: user ? (isDark ? "rgba(59, 130, 246, 0.3)" : "#bfdbfe") : (isDark ? "rgba(239, 68, 68, 0.3)" : "#fecaca"),
                  color: user ? (isDark ? "#93c5fd" : "#2563eb") : (isDark ? "#fca5a5" : "#dc2626"),
                }}
              >
                <span>{user ? `👤 ${user.displayName?.split(" ")[0] || "Logged In"}` : "🔒 Sign-in required"}</span>
              </span>
            )}
          </div>
        </div>

        {/* Document Context Status Strip */}
        <div
          className="px-3 py-1.5 border-b flex items-center justify-between text-[10px] shrink-0"
          style={{
            borderColor: border,
            backgroundColor: isDark ? "rgba(30, 41, 59, 0.2)" : "rgba(241, 245, 249, 0.5)",
            color: textMut,
          }}
        >
          <div className="flex items-center gap-1.5 truncate max-w-[190px]">
            <IcoFile size={12} />
            <span className="truncate font-medium" style={{ color: textMain }}>
              {docTitle || "Active Document"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isExtractingMarkdown ? (
              <span className="flex items-center gap-1 text-amber-500">
                <span className="animate-spin"><IcoLoader size={10} /></span>
                <span>Parsing...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-500 font-medium">
                <IcoCheck size={11} />
                <span>
                  {contextStats.tokens.toLocaleString()}{" "}
                  {contextScope === "page" ? `p.${currentPage}` : "doc"} tokens
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Speed Tip Banner for In-Browser AI when on Full Doc with long text */}
        {provider === "chrome-builtin" && contextScope === "full" && activeMarkdown.length > 3500 && (
          <div
            className="mx-3 mt-2 p-2 rounded-xl border flex items-center justify-between text-[10px] gap-2 shrink-0 animate-in fade-in duration-150"
            style={{
              backgroundColor: isDark ? "rgba(16, 185, 129, 0.08)" : "#ecfdf5",
              borderColor: isDark ? "rgba(16, 185, 129, 0.25)" : "#a7f3d0",
              color: isDark ? "#6ee7b7" : "#065f46",
            }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-amber-500 shrink-0">
                <IcoZap size={13} />
              </span>
              <span className="truncate">
                <strong>Speed Tip:</strong> Page Scope ({currentPage}) runs up to 10× faster on-device.
              </span>
            </div>
            <button
              onClick={() => setContextScope("page")}
              className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[9px] shrink-0 cursor-pointer transition-transform hover:scale-105"
            >
              Use Page {currentPage}
            </button>
          </div>
        )}

        {/* Download Progress Bar if Gemini Nano is downloading */}
        {chromeDownloadProgress !== null && (
          <div
            className="px-3 py-2 border-b text-[11px] flex flex-col gap-1 shrink-0"
            style={{
              borderColor: border,
              backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#f0fdf4",
            }}
          >
            <div className="flex items-center justify-between font-semibold text-emerald-600">
              <span className="flex items-center gap-1.5">
                <span className="animate-spin"><IcoLoader size={12} /></span>
                <span>Downloading Gemini Nano on-device model...</span>
              </span>
              <span>{chromeDownloadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-emerald-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-200"
                style={{ width: `${chromeDownloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* MAIN BODY: Conditioned on Provider & Auth/Support status */}
        {provider === "chrome-builtin" && chromeAiStatus && !chromeAiStatus.isSupported ? (
          /* Chrome Built-in AI Unsupported / Flag Setup Card */
          <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-start items-center text-center">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 text-white shadow-md"
              style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}
            >
              <IcoCpu size={24} />
            </div>

            <h3 className="text-sm font-bold mb-1 tracking-tight" style={{ color: textMain }}>
              Enable In-Browser AI (Gemini Nano)
            </h3>
            <p className="text-[11px] leading-relaxed max-w-[270px] mb-4" style={{ color: textMut }}>
              Run Google Gemini Nano 100% locally in your browser. Complete privacy, zero latency, and no API keys or login required.
            </p>

            {/* Setup Instructions Card */}
            <div
              className="w-full rounded-xl p-3 mb-4 text-left flex flex-col gap-2.5 border text-xs"
              style={{
                backgroundColor: isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(241, 245, 249, 0.9)",
                borderColor: border,
              }}
            >
              <div className="font-semibold text-[11px] text-amber-500 flex items-center gap-1">
                <IcoAlertCircle size={13} />
                <span>How to enable in Google Chrome:</span>
              </div>

              <div className="space-y-2 text-[11px]" style={{ color: textMut }}>
                <div>
                  <div className="font-medium text-[11px]" style={{ color: textMain }}>
                    1. Enable Prompt API Flag:
                  </div>
                  <div className="flex items-center gap-1 mt-1 bg-black/20 p-1.5 rounded-lg border font-mono text-[10px]" style={{ borderColor: border }}>
                    <span className="flex-1 truncate select-all text-amber-400">
                      chrome://flags/#prompt-api-for-gemini-nano
                    </span>
                    <button
                      onClick={() => copyToClipboard("chrome://flags/#prompt-api-for-gemini-nano", "flag1")}
                      className="p-1 hover:bg-white/10 rounded text-[9px] cursor-pointer"
                      title="Copy flag link"
                    >
                      {copiedFlagUrl === "flag1" ? <IcoCheck size={11} /> : <IcoCopy size={11} />}
                    </button>
                  </div>
                  <span className="text-[10px] opacity-75">Set to &quot;Enabled&quot; in Chrome flags.</span>
                </div>

                <div>
                  <div className="font-medium text-[11px]" style={{ color: textMain }}>
                    2. Enable Optimization Guide:
                  </div>
                  <div className="flex items-center gap-1 mt-1 bg-black/20 p-1.5 rounded-lg border font-mono text-[10px]" style={{ borderColor: border }}>
                    <span className="flex-1 truncate select-all text-amber-400">
                      chrome://flags/#optimization-guide-on-device-model
                    </span>
                    <button
                      onClick={() => copyToClipboard("chrome://flags/#optimization-guide-on-device-model", "flag2")}
                      className="p-1 hover:bg-white/10 rounded text-[9px] cursor-pointer"
                      title="Copy flag link"
                    >
                      {copiedFlagUrl === "flag2" ? <IcoCheck size={11} /> : <IcoCopy size={11} />}
                    </button>
                  </div>
                  <span className="text-[10px] opacity-75">Set to &quot;Enabled BypassPerfRequirement&quot;.</span>
                </div>

                <div>
                  <div className="font-medium text-[11px]" style={{ color: textMain }}>
                    3. Restart Chrome browser.
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-2">
              <button
                onClick={refreshChromeAiAvailability}
                disabled={isCheckingChromeAi}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5 transition-transform hover:scale-101 cursor-pointer disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}
              >
                {isCheckingChromeAi ? (
                  <span className="animate-spin"><IcoLoader size={14} /></span>
                ) : (
                  <IcoRefresh size={14} />
                )}
                <span>Check Availability Again</span>
              </button>

              <button
                onClick={() => handleSelectProvider("firebase")}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold border transition-colors hover:bg-blue-500/10 cursor-pointer flex items-center justify-center gap-1.5"
                style={{ borderColor: border, color: isDark ? "#93c5fd" : "#2563eb" }}
              >
                <IcoCloud size={14} />
                <span>Switch to Cloud Gemini 3.7 Flash</span>
              </button>

              <a
                href="https://developer.chrome.com/docs/ai/built-in/overview"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] flex items-center justify-center gap-1 hover:underline mt-1"
                style={{ color: textMut }}
              >
                <span>Read Chrome Built-in AI Documentation</span>
                <IcoExternalLink size={10} />
              </a>
            </div>
          </div>
        ) : provider === "firebase" && !user ? (
          /* Firebase Sign-in Gateway */
          <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center items-center text-center">
            <div
              className="w-14 h-14 rounded-3xl flex items-center justify-center mb-3 text-white shadow-xl animate-bounce"
              style={{
                background: "linear-gradient(135deg, #4285F4 0%, #9333EA 50%, #F59E0B 100%)",
                boxShadow: "0 10px 25px -5px rgba(66, 133, 244, 0.4)",
              }}
            >
              <IcoSparklesFilled size={26} />
            </div>

            <h2 className="text-base font-bold mb-1 tracking-tight" style={{ color: textMain }}>
              Cloud Document Intelligence
            </h2>
            <p className="text-xs leading-relaxed max-w-[270px] mb-4" style={{ color: textMut }}>
              Sign in with Google to use <strong>Gemini 3.7 Flash</strong> with a 1,000,000+ token context window.
            </p>

            {/* Google Sign-in Button */}
            <button
              onClick={signInWithGoogle}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-lg transition-all duration-200 hover:scale-102 hover:shadow-xl cursor-pointer disabled:opacity-50 mb-3"
              style={{ background: "linear-gradient(135deg, #4285F4, #34A853)" }}
            >
              {actionLoading ? (
                <span className="animate-spin"><IcoLoader size={16} /></span>
              ) : (
                <IcoGoogle size={16} />
              )}
              <span>{actionLoading ? "Connecting..." : "Sign in with Google"}</span>
            </button>

            {/* Alternative: Switch to In-Browser AI */}
            <button
              onClick={() => handleSelectProvider("chrome-builtin")}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors hover:bg-emerald-500/10 cursor-pointer"
              style={{ borderColor: border, color: isDark ? "#6ee7b7" : "#059669" }}
            >
              <IcoCpu size={14} />
              <span>Or use In-Browser AI (No sign-in required)</span>
            </button>

            {authError && (
              <div
                className="mt-3 p-2.5 rounded-xl text-[11px] flex items-start gap-2 text-left"
                style={{
                  backgroundColor: isDark ? "rgba(239, 68, 68, 0.1)" : "#fef2f2",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: isDark ? "#fca5a5" : "#b91c1c",
                }}
              >
                <IcoAlertCircle size={14} />
                <span className="flex-1">{authError}</span>
              </div>
            )}
          </div>
        ) : (
          /* ACTIVE INTERACTIVE AI CHAT INTERFACE (Works for both In-Browser AI & Cloud AI) */
          <>
            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 ? (
                <div className="py-5 px-2 flex flex-col items-center text-center">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center mb-2.5 text-white shadow-sm"
                    style={{
                      background:
                        provider === "chrome-builtin"
                          ? "linear-gradient(135deg, #10B981, #059669)"
                          : "linear-gradient(135deg, #4285F4, #9333EA)",
                    }}
                  >
                    {provider === "chrome-builtin" ? <IcoCpu size={18} /> : <IcoSparkles size={18} />}
                  </div>
                  <h3 className="text-xs font-bold mb-1" style={{ color: textMain }}>
                    {provider === "chrome-builtin" ? "In-Browser AI Assistant" : "Ask anything about this document"}
                  </h3>
                  <p className="text-[11px] leading-relaxed mb-3.5 max-w-[260px]" style={{ color: textMut }}>
                    {provider === "chrome-builtin"
                      ? "Powered by Chrome Built-in Gemini Nano on your device. Zero cloud roundtrips & 100% private."
                      : "Powered by Gemini 3.7 Flash Cloud. Select a suggested prompt below or ask your question."}
                  </p>

                  {/* Quick Starter Chips */}
                  <div className="w-full flex flex-col gap-1.5 text-left">
                    <span className="text-[10px] font-semibold uppercase tracking-wider pl-1" style={{ color: textMut }}>
                      Suggested Prompts
                    </span>
                    {QUICK_PROMPTS.map((qp) => (
                      <button
                        key={qp.id}
                        onClick={() => handleSendMessage(qp.prompt)}
                        className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-medium border text-left transition-all duration-150 hover:scale-[1.01] cursor-pointer"
                        style={{
                          backgroundColor: isDark ? "rgba(30, 41, 59, 0.4)" : "#ffffff",
                          borderColor: border,
                          color: textMain,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor =
                            provider === "chrome-builtin" ? "#10b981" : "#f59e0b";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = border;
                        }}
                      >
                        <span className="text-sm shrink-0">{qp.icon}</span>
                        <span className="truncate">{qp.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <AiChatMessage
                      key={msg.id}
                      message={msg}
                      userPhoto={user?.photoURL}
                      userName={user?.displayName || user?.email || "User"}
                      isSpeaking={speakingMsgId === msg.id}
                      onToggleSpeak={() => handleToggleSpeak(msg.id, msg.content)}
                      ttsVoiceName={selectedVoice}
                      border={border}
                      bgCard={bgSide}
                      bgHover={bgHover}
                      textMain={textMain}
                      textMut={textMut}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Form */}
            <div
              className="p-3 border-t shrink-0 flex flex-col gap-2"
              style={{
                borderColor: border,
                backgroundColor: isDark ? "#0f172a" : "#ffffff",
              }}
            >
              <div
                className="flex items-end gap-2 p-1.5 rounded-2xl border transition-all"
                style={{
                  backgroundColor: bgInput,
                  borderColor: isGenerating
                    ? provider === "chrome-builtin"
                      ? "#10b981"
                      : "#f59e0b"
                    : border,
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isGenerating
                      ? `${currentModel.shortName} is computing response...`
                      : `Ask ${currentModel.shortName} about this PDF... (Enter to send)`
                  }
                  rows={1}
                  disabled={isGenerating}
                  className="flex-1 max-h-28 bg-transparent text-xs p-1.5 resize-none focus:outline-none placeholder:text-slate-400 leading-relaxed"
                  style={{ color: textMain }}
                />

                {isGenerating ? (
                  <button
                    onClick={handleStopGenerating}
                    title="Stop generation"
                    className="p-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-transform hover:scale-105 cursor-pointer shrink-0"
                  >
                    <IcoStopCircle size={15} />
                  </button>
                ) : (
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputValue.trim()}
                    title="Send message (Enter)"
                    className="p-2 rounded-xl transition-all duration-150 cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: inputValue.trim()
                        ? provider === "chrome-builtin"
                          ? "linear-gradient(135deg, #10B981, #059669)"
                          : "linear-gradient(135deg, #f59e0b, #d97706)"
                        : isDark
                        ? "#1f2937"
                        : "#e2e8f0",
                      color: inputValue.trim() ? "#ffffff" : textMut,
                    }}
                  >
                    <IcoSend size={15} />
                  </button>
                )}
              </div>

              {/* Input Footer with tokenx Total Input Token counter & Breakdown */}
              <div className="flex items-center justify-between text-[10px] px-1" style={{ color: textMut }}>
                <div className="flex items-center gap-2">
                  <div className="relative" ref={tokenDetailsRef}>
                    <button
                      type="button"
                      onClick={() => setShowTokenDetails((prev) => !prev)}
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-mono text-[9px] font-semibold transition-all cursor-pointer ${
                        queryTokens > 0
                          ? isDark
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)]"
                            : "bg-amber-50 text-amber-600 border-amber-200"
                          : isDark
                          ? "bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-700/50"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      }`}
                      title="Total input context tokens (File context + System + History + Query). Click for details."
                    >
                      <span className={provider === "chrome-builtin" ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                        {provider === "chrome-builtin" ? "⚡" : "✨"}
                      </span>
                      <span>{totalInputTokens.toLocaleString()} tokens</span>
                      {queryTokens > 0 && (
                        <span className="opacity-75 font-normal text-[8px]">
                          (+{queryTokens} query)
                        </span>
                      )}
                    </button>

                    {/* Interactive Token Breakdown Popover */}
                    {showTokenDetails && (
                      <div
                        className="absolute left-0 bottom-full mb-2 w-64 p-3 rounded-xl shadow-2xl z-50 text-xs flex flex-col gap-2 border animate-in fade-in zoom-in-95 duration-100"
                        style={{
                          backgroundColor: isDark ? "#0f172a" : "#ffffff",
                          borderColor: border,
                          boxShadow: isDark
                            ? "0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)"
                            : "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                        }}
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b" style={{ borderColor: border }}>
                          <span className="font-bold text-[11px] flex items-center gap-1.5" style={{ color: textMain }}>
                            <span>{provider === "chrome-builtin" ? "⚡" : "✨"}</span> Context Breakdown
                          </span>
                          <span className="text-[10px] font-mono font-bold text-amber-500">
                            {totalInputTokens.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5 text-[10px] font-mono" style={{ color: textMut }}>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              📄 {contextScope === "page" ? `Page ${currentPage} Text:` : "Full Doc Text:"}
                            </span>
                            <span className="font-semibold" style={{ color: textMain }}>
                              {fileContextTokens.toLocaleString()} tokens
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">⚙️ System &amp; Directives:</span>
                            <span className="font-semibold" style={{ color: textMain }}>
                              {Math.max(0, systemInstructionTokens - fileContextTokens).toLocaleString()} tokens
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">💬 Chat History ({messages.length}):</span>
                            <span className="font-semibold" style={{ color: textMain }}>
                              {historyTokens.toLocaleString()} tokens
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">✍️ Active Query:</span>
                            <span className="font-semibold text-amber-500">
                              {queryTokens.toLocaleString()} tokens
                            </span>
                          </div>
                        </div>

                        <div className="pt-1.5 border-t flex items-center justify-between text-[9px]" style={{ borderColor: border, color: textMut }}>
                          <span>Model: {currentModel.shortName}</span>
                          <span>Context: {currentModel.contextLimitText}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="text-[9px] opacity-70">Shift+Enter for newline</span>
                </div>

                <span className="text-[9px] opacity-75 font-medium">
                  {provider === "chrome-builtin" ? "⚡ Gemini Nano (Local)" : "☁️ Gemini 3.7 Flash"}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
