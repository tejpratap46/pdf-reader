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
  GeminiModelName,
  QUICK_PROMPTS,
  startDocChatSession,
  sendStreamingChatMessage,
  buildDocumentSystemInstruction,
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

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel] = useState<GeminiModelName>("gemini-3.7-flash");
  const [contextScope, setContextScope] = useState<"full" | "page">("full");
  const [showTokenDetails, setShowTokenDetails] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const chatSessionRef = useRef<ChatSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tokenDetailsRef = useRef<HTMLDivElement>(null);

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

  // Reset or invalidate chat session when context scope, page, or document changes
  useEffect(() => {
    chatSessionRef.current = null;
  }, [contextScope, currentPage, activeMarkdown]);

  // 1. File / Markdown Context tokens estimated with tokenx for the active scope only
  const fileContextTokens = useMemo(() => {
    return estimateTokenCount(activeMarkdown);
  }, [activeMarkdown]);

  // 2. Full System Instruction tokens (includes only activeMarkdown + metadata + instructions)
  const systemInstructionTokens = useMemo(() => {
    const fullSystemInstruction = buildDocumentSystemInstruction({
      docTitle: docTitle || "Active Document",
      docMarkdown: activeMarkdown || "",
      pageContext: { current: currentPage, total: totalPages },
      scope: contextScope,
    });
    return estimateTokenCount(fullSystemInstruction);
  }, [docTitle, activeMarkdown, currentPage, totalPages, contextScope]);

  // 3. Conversation History tokens
  const historyTokens = useMemo(() => {
    return messages.reduce((total, msg) => total + estimateTokenCount(msg.content), 0);
  }, [messages]);

  // 4. Current User Typed Query tokens
  const queryTokens = useMemo(() => {
    return estimateTokenCount(inputValue);
  }, [inputValue]);

  // 5. Total Combined Input Tokens sent to Gemini
  const totalInputTokens = useMemo(() => {
    return systemInstructionTokens + historyTokens + queryTokens;
  }, [systemInstructionTokens, historyTokens, queryTokens]);

  // Context token stats for header strip
  const contextStats = useMemo(() => {
    const chars = activeMarkdown.length;
    const words = activeMarkdown.trim() ? activeMarkdown.trim().split(/\s+/).length : 0;
    return { chars, words, tokens: fileContextTokens };
  }, [activeMarkdown, fileContextTokens]);

  // Reset or initialize chat session when document or model changes
  const resetChatSession = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    chatSessionRef.current = null;
    setMessages([]);
    setIsGenerating(false);
  }, []);

  // Initialize or retrieve active chat session
  const getOrCreateChatSession = useCallback(() => {
    if (!chatSessionRef.current) {
      chatSessionRef.current = startDocChatSession({
        docTitle: docTitle || "Active Document",
        docMarkdown: activeMarkdown || "No document loaded yet.",
        pageContext: { current: currentPage, total: totalPages },
        scope: contextScope,
        modelName: selectedModel,
      });
    }
    return chatSessionRef.current;
  }, [docTitle, activeMarkdown, currentPage, totalPages, contextScope, selectedModel]);

  // Send a message
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isGenerating) return;

    if (!user) {
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
    };

    setMessages((prev) => [...prev, userMsg, initialAiMsg]);
    setIsGenerating(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const session = getOrCreateChatSession();

      await sendStreamingChatMessage(
        session,
        query,
        {
          onChunk: (_chunk, fullText) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: fullText, isStreaming: true }
                  : msg
              )
            );
          },
          onDone: (finalText) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: finalText, isStreaming: false }
                  : msg
              )
            );
            setIsGenerating(false);
          },
          onError: (err) => {
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
        },
        abortController.signal
      );
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
          width: Math.max(260, sidebarWidth),
          minWidth: 260,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ borderColor: border, backgroundColor: isDark ? "#0f172a" : "#ffffff" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-sm"
              style={{ background: "linear-gradient(135deg, #4285F4, #9333EA)" }}
            >
              <IcoSparklesFilled size={13} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-wide" style={{ color: textMain }}>
                  Folio AI
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-semibold rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  Gemini
                </span>
              </div>
              <p className="text-[10px]" style={{ color: textMut }}>
                Chat with Document
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {user && (
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

        {/* UNAUTHENTICATED STATE: Firebase AI Login Gateway */}
        {!user ? (
          <div className="flex-1 overflow-y-auto p-5 flex flex-col justify-center items-center text-center">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 text-white shadow-xl animate-bounce"
              style={{
                background: "linear-gradient(135deg, #4285F4 0%, #9333EA 50%, #F59E0B 100%)",
                boxShadow: "0 10px 25px -5px rgba(66, 133, 244, 0.4)",
              }}
            >
              <IcoSparklesFilled size={30} />
            </div>

            <h2 className="text-base font-bold mb-1.5 tracking-tight" style={{ color: textMain }}>
              Document Intelligence
            </h2>
            <p className="text-xs leading-relaxed max-w-[280px] mb-5" style={{ color: textMut }}>
              Sign in with Google to chat with your document, summarize complex passages, extract tables, and get instant answers from Markdown.
            </p>

            {/* Feature Points */}
            <div
              className="w-full rounded-2xl p-3.5 mb-6 text-left flex flex-col gap-2.5 border"
              style={{
                backgroundColor: isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(241, 245, 249, 0.8)",
                borderColor: border,
              }}
            >
              <div className="flex items-start gap-2.5 text-xs">
                <span className="text-amber-500 mt-0.5">⚡</span>
                <div>
                  <span className="font-semibold block" style={{ color: textMain }}>
                    Instant Markdown Q&amp;A
                  </span>
                  <span className="text-[11px]" style={{ color: textMut }}>
                    Powered by anydoc-wasm WebAssembly parser.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs">
                <span className="text-blue-500 mt-0.5">📑</span>
                <div>
                  <span className="font-semibold block" style={{ color: textMain }}>
                    Smart Summaries &amp; Quizzes
                  </span>
                  <span className="text-[11px]" style={{ color: textMut }}>
                    Generate key takeaways and study questions in 1 click.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 text-xs">
                <span className="text-emerald-500 mt-0.5">🔍</span>
                <div>
                  <span className="font-semibold block" style={{ color: textMain }}>
                    Table &amp; Data Extraction
                  </span>
                  <span className="text-[11px]" style={{ color: textMut }}>
                    Extract numbers, dates, and metrics into structured tables.
                  </span>
                </div>
              </div>
            </div>

            {/* Google Sign-in Button */}
            <button
              onClick={signInWithGoogle}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-lg transition-all duration-200 hover:scale-102 hover:shadow-xl cursor-pointer disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #4285F4, #34A853)",
              }}
            >
              {actionLoading ? (
                <span className="animate-spin">
                  <IcoLoader size={16} />
                </span>
              ) : (
                <IcoGoogle size={18} />
              )}
              <span>{actionLoading ? "Connecting..." : "Sign in with Google"}</span>
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
          /* AUTHENTICATED STATE: Interactive AI Chat */
          <>
            {/* Top Config & Context Bar */}
            <div
              className="px-3 py-2 border-b flex items-center justify-between gap-2 text-[11px] shrink-0"
              style={{ borderColor: border, backgroundColor: isDark ? "rgba(15, 23, 42, 0.4)" : "rgba(248, 250, 252, 0.6)" }}
            >
              {/* Model Badge */}
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                  style={{
                    backgroundColor: isDark ? "rgba(66, 133, 244, 0.12)" : "rgba(66, 133, 244, 0.08)",
                    borderColor: isDark ? "rgba(66, 133, 244, 0.35)" : "rgba(66, 133, 244, 0.25)",
                    color: isDark ? "#93c5fd" : "#2563eb",
                  }}
                >
                  <IcoSparklesFilled size={10} />
                  <span>Gemini 3.7 Flash</span>
                </span>
              </div>

              {/* Context Scope Switch */}
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
            </div>

            {/* Document Context Status Strip */}
            <div
              className="px-3.5 py-2 border-b flex items-center justify-between text-[10px] shrink-0"
              style={{
                borderColor: border,
                backgroundColor: isDark ? "rgba(30, 41, 59, 0.25)" : "rgba(241, 245, 249, 0.5)",
                color: textMut,
              }}
            >
              <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                <IcoFile size={12} />
                <span className="truncate font-medium" style={{ color: textMain }}>
                  {docTitle || "Active Document"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isExtractingMarkdown ? (
                  <span className="flex items-center gap-1 text-amber-500">
                    <span className="animate-spin"><IcoLoader size={10} /></span>
                    <span>Extracting...</span>
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

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 ? (
                <div className="py-6 px-3 flex flex-col items-center text-center">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center mb-2.5 text-white shadow-sm"
                    style={{ background: "linear-gradient(135deg, #4285F4, #9333EA)" }}
                  >
                    <IcoSparkles size={18} />
                  </div>
                  <h3 className="text-xs font-bold mb-1" style={{ color: textMain }}>
                    Ask anything about this document
                  </h3>
                  <p className="text-[11px] leading-relaxed mb-4 max-w-[260px]" style={{ color: textMut }}>
                    Select a prompt below or type your question. Responses are grounded in the document&apos;s markdown.
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
                          (e.currentTarget as HTMLElement).style.borderColor = "#f59e0b";
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
                      userName={user?.displayName || user?.email}
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
                  borderColor: isGenerating ? "#f59e0b" : border,
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isGenerating
                      ? "Folio AI is responding..."
                      : "Ask questions about this PDF... (Enter to send)"
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
                        ? "linear-gradient(135deg, #f59e0b, #d97706)"
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
                      <span className="text-amber-500 font-bold">⚡</span>
                      <span>{totalInputTokens.toLocaleString()} input tokens</span>
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
                            <span className="text-amber-500">⚡</span> Total Input Tokens
                          </span>
                          <span className="text-[10px] font-mono font-bold text-amber-500">
                            {totalInputTokens.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5 text-[10px] font-mono" style={{ color: textMut }}>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              📄 {contextScope === "page" ? `Page ${currentPage} Markdown:` : "Full Doc Markdown:"}
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
                          <span>Calculated via tokenx</span>
                          <span>Context Window: 1.05M</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="text-[9px] opacity-70">Shift+Enter for newline</span>
                </div>

                <span className="text-[9px] opacity-75">Gemini 3.7 Flash</span>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
