import { FC, useState, useEffect, useMemo } from "react";
import { marked } from "marked";
import { ChatMessage } from "../../services/aiService";
import { useDark } from "../../hooks/useTheme";
import {
  IcoCopy,
  IcoCheck,
  IcoSparkles,
  IcoAlertCircle,
  IcoVolume,
  IcoVolumeX,
  IcoCpu,
  IcoLoader,
} from "../common/Icons";

interface AiChatMessageProps {
  message: ChatMessage;
  userPhoto?: string | null;
  userName?: string | null;
  isSpeaking?: boolean;
  onToggleSpeak?: () => void;
  ttsVoiceName?: string;
  border: string;
  bgCard?: string;
  bgHover?: string;
  textMain: string;
  textMut: string;
}

export const AiChatMessage: FC<AiChatMessageProps> = ({
  message,
  userPhoto,
  userName,
  isSpeaking = false,
  onToggleSpeak,
  ttsVoiceName,
  border,
  textMain,
  textMut,
}) => {
  const isDark = useDark();
  const [copied, setCopied] = useState(false);

  // Live timer for active streaming / on-device generation
  const [liveElapsedMs, setLiveElapsedMs] = useState<number>(() =>
    Math.max(0, Date.now() - message.timestamp)
  );

  useEffect(() => {
    if (!message.isStreaming) return;
    const updateTimer = () => {
      setLiveElapsedMs(Date.now() - message.timestamp);
    };
    updateTimer();
    const timer = setInterval(updateTimer, 100);
    return () => clearInterval(timer);
  }, [message.isStreaming, message.timestamp]);

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // Convert markdown to HTML for assistant responses
  const parsedHtml = useMemo(() => {
    if (isUser) return "";
    try {
      return marked.parse(message.content, {
        gfm: true,
        breaks: true,
      }) as string;
    } catch {
      return message.content;
    }
  }, [message.content, isUser]);

  // Progressive stage labels that update live as seconds tick
  const dynamicStageLabel = useMemo(() => {
    if (message.stageInfo?.label && message.stageInfo.stage === "streaming") {
      return message.stageInfo.label;
    }
    const seconds = liveElapsedMs / 1000;
    if (message.provider === "chrome-builtin") {
      if (seconds < 1.5) {
        return "⚡ Initializing on-device session...";
      } else if (seconds < 4.0) {
        return "📄 Ingesting document text into local memory...";
      } else if (seconds < 8.0) {
        return "🧠 Gemini Nano neural inference running...";
      } else {
        return "⏳ On-device neural computation running...";
      }
    }
    return message.stageInfo?.label || "Connecting to Google Cloud AI...";
  }, [message.stageInfo, liveElapsedMs, message.provider]);

  const dynamicStageDetail = useMemo(() => {
    if (message.stageInfo?.detail && message.stageInfo.stage === "streaming") {
      return message.stageInfo.detail;
    }
    const seconds = liveElapsedMs / 1000;
    if (message.provider === "chrome-builtin") {
      if (seconds < 1.5) {
        return "Preparing local Gemini Nano neural runtime & RAM/VRAM";
      } else if (seconds < 4.0) {
        return "Encoding document tokens in on-device execution pipeline";
      } else if (seconds < 8.0) {
        return "Computing response tokens 100% locally on your machine";
      } else {
        return "Heavy context on CPU/GPU. Tip: Switch to 'Page Scope' for 10× faster inference!";
      }
    }
    return message.stageInfo?.detail || "Processing document context on Google AI servers";
  }, [message.stageInfo, liveElapsedMs, message.provider]);

  return (
    <div
      className={`group flex gap-2.5 px-3 py-3 rounded-2xl transition-colors ${
        isUser
          ? "ml-6 flex-row-reverse"
          : "mr-2"
      }`}
      style={{
        backgroundColor: isUser
          ? isDark
            ? "rgba(245, 158, 11, 0.12)"
            : "rgba(245, 158, 11, 0.15)"
          : isDark
          ? "rgba(30, 41, 59, 0.5)"
          : "rgba(248, 250, 252, 0.9)",
        border: `1px solid ${
          isUser
            ? isDark
              ? "rgba(245, 158, 11, 0.25)"
              : "rgba(245, 158, 11, 0.35)"
            : border
        }`,
      }}
    >
      {/* Avatar */}
      <div className="shrink-0 pt-0.5">
        {isUser ? (
          userPhoto ? (
            <img
              src={userPhoto}
              alt={userName || "User"}
              referrerPolicy="no-referrer"
              className="w-6 h-6 rounded-full object-cover border"
              style={{ borderColor: border }}
            />
          ) : (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
            >
              {(userName?.[0] || "U").toUpperCase()}
            </div>
          )
        ) : (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm text-white"
            style={{
              background:
                message.provider === "chrome-builtin"
                  ? "linear-gradient(135deg, #10B981, #059669)"
                  : "linear-gradient(135deg, #4285F4, #9333EA)",
            }}
          >
            {message.provider === "chrome-builtin" ? <IcoCpu size={13} /> : <IcoSparkles size={13} />}
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 overflow-hidden min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="text-[11px] font-semibold tracking-wide"
              style={{
                color: isUser
                  ? isDark
                    ? "#fbbf24"
                    : "#d97706"
                  : isDark
                  ? "#93c5fd"
                  : "#2563eb",
              }}
            >
              {isUser ? "You" : "Pdf Reader AI"}
            </span>

            {isAssistant && message.provider === "chrome-builtin" && (
              <span
                className="px-1.5 py-0.2 text-[8.5px] font-semibold rounded-full border flex items-center gap-1"
                style={{
                  backgroundColor: isDark ? "rgba(16, 185, 129, 0.12)" : "rgba(16, 185, 129, 0.08)",
                  borderColor: isDark ? "rgba(16, 185, 129, 0.3)" : "rgba(16, 185, 129, 0.25)",
                  color: isDark ? "#6ee7b7" : "#059669",
                }}
                title="Generated 100% on-device in browser via Chrome Gemini Nano"
              >
                <span>⚡</span>
                <span>Nano</span>
              </span>
            )}
            {isAssistant && message.provider === "firebase" && (
              <span
                className="px-1.5 py-0.2 text-[8.5px] font-semibold rounded-full border flex items-center gap-1"
                style={{
                  backgroundColor: isDark ? "rgba(66, 133, 244, 0.12)" : "rgba(66, 133, 244, 0.08)",
                  borderColor: isDark ? "rgba(66, 133, 244, 0.3)" : "rgba(66, 133, 244, 0.25)",
                  color: isDark ? "#93c5fd" : "#2563eb",
                }}
                title="Generated via Cloud Gemini 3.7 Flash"
              >
                <span>☁️</span>
                <span>Flash</span>
              </span>
            )}

            {/* Live speed telemetry tag while streaming */}
            {isAssistant && message.isStreaming && message.stageInfo?.speed && (
              <span
                className="px-1.5 py-0.2 text-[8px] font-mono rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                title="Live generation throughput"
              >
                {message.stageInfo.speed} tok/s
              </span>
            )}
          </div>

          <div
            className={`flex items-center gap-1 transition-opacity ${
              isSpeaking ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            {isAssistant && message.content && !message.isStreaming && onToggleSpeak && (
              <button
                onClick={onToggleSpeak}
                title={
                  isSpeaking
                    ? "Stop reading aloud"
                    : `Read response aloud (${ttsVoiceName || "Selected Voice"})`
                }
                className={`p-1 rounded text-xs transition-all cursor-pointer flex items-center gap-1 ${
                  isSpeaking
                    ? "bg-amber-500/20 text-amber-500 border border-amber-500/40"
                    : "hover:bg-slate-500/20"
                }`}
                style={{ color: isSpeaking ? "#f59e0b" : textMut }}
              >
                {isSpeaking ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-500">
                    <IcoVolumeX size={12} />
                    <span>Stop</span>
                  </span>
                ) : (
                  <IcoVolume size={12} />
                )}
              </button>
            )}

            {isAssistant && message.content && (
              <button
                onClick={handleCopy}
                title="Copy response"
                className="p-1 rounded hover:bg-slate-500/20 text-xs transition-colors cursor-pointer"
                style={{ color: textMut }}
              >
                {copied ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                    <IcoCheck size={11} /> Copied
                  </span>
                ) : (
                  <IcoCopy size={12} />
                )}
              </button>
            )}
            <span className="text-[9px]" style={{ color: textMut }}>
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {message.isError ? (
          <div
            className="flex items-start gap-2 p-2.5 rounded-xl text-xs"
            style={{
              backgroundColor: isDark ? "rgba(239, 68, 68, 0.1)" : "#fef2f2",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: isDark ? "#fca5a5" : "#b91c1c",
            }}
          >
            <IcoAlertCircle size={15} />
            <div className="text-xs leading-relaxed">{message.content}</div>
          </div>
        ) : isUser ? (
          <p className="text-xs leading-relaxed whitespace-pre-wrap select-text font-normal" style={{ color: textMain }}>
            {message.content}
          </p>
        ) : isAssistant && message.isStreaming && !message.content ? (
          /* Real-time Thinking & Inference Progress Card */
          <div
            className="my-1 p-3 rounded-xl border flex flex-col gap-2 animate-in fade-in duration-200"
            style={{
              backgroundColor: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(241, 245, 249, 0.8)",
              borderColor: message.provider === "chrome-builtin" ? "rgba(16, 185, 129, 0.3)" : "rgba(66, 133, 244, 0.3)",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-white animate-spin shrink-0"
                  style={{
                    background:
                      message.provider === "chrome-builtin"
                        ? "linear-gradient(135deg, #10B981, #059669)"
                        : "linear-gradient(135deg, #4285F4, #9333EA)",
                  }}
                >
                  <IcoLoader size={11} />
                </span>
                <span className="text-[11px] font-semibold tracking-tight" style={{ color: textMain }}>
                  {dynamicStageLabel}
                </span>
              </div>

              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-black/20 shrink-0" style={{ color: textMut }}>
                {(liveElapsedMs / 1000).toFixed(1)}s
              </span>
            </div>

            {/* Sub-label explanation */}
            <p className="text-[10px] leading-normal" style={{ color: textMut }}>
              {dynamicStageDetail}
            </p>

            {/* Shimmering Progress Bar */}
            <div className="w-full h-1 bg-slate-500/20 rounded-full overflow-hidden relative">
              <div
                className="h-full rounded-full animate-pulse"
                style={{
                  width: "100%",
                  background:
                    message.provider === "chrome-builtin"
                      ? "linear-gradient(90deg, #10b981 0%, #34d399 50%, #10b981 100%)"
                      : "linear-gradient(90deg, #3b82f6 0%, #a855f7 50%, #3b82f6 100%)",
                }}
              />
            </div>
          </div>
        ) : (
          <div className="relative">
            <div
              className="text-xs leading-relaxed select-text space-y-2 prose prose-sm max-w-none break-words"
              style={{
                color: textMain,
              }}
              dangerouslySetInnerHTML={{ __html: parsedHtml }}
            />
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-3.5 ml-1 bg-emerald-500 animate-pulse align-middle rounded-sm" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
