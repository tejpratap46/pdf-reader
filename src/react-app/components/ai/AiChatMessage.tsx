import { FC, useState, useMemo } from "react";
import { marked } from "marked";
import { ChatMessage } from "../../services/aiService";
import { useDark } from "../../hooks/useTheme";
import { IcoCopy, IcoCheck, IcoSparkles, IcoUser, IcoAlertCircle, IcoVolume, IcoVolumeX } from "../common/Icons";

interface AiChatMessageProps {
  message: ChatMessage;
  userPhoto?: string | null;
  userName?: string | null;
  isSpeaking?: boolean;
  onToggleSpeak?: () => void;
  ttsVoiceName?: string;
  border: string;
  bgCard: string;
  bgHover: string;
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
  bgCard,
  bgHover,
  textMain,
  textMut,
}) => {
  const isDark = useDark();
  const [copied, setCopied] = useState(false);

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
              background: "linear-gradient(135deg, #4285F4, #9333EA)",
            }}
          >
            <IcoSparkles size={13} />
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 overflow-hidden min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
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
            {isUser ? "You" : "Folio AI"}
          </span>

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
              <span className="inline-block w-1.5 h-3.5 ml-1 bg-amber-500 animate-pulse align-middle rounded-sm" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
