import { FC, useState, useMemo, useCallback, MouseEvent } from "react";
import { useDark, useThemeMode } from "../../hooks/useTheme";
import {
  IcoPlay,
  IcoStop,
  IcoVolume,
  IcoGlobe,
  IcoWifiOff,
  IcoEdit,
} from "../common/Icons";
import { parseLanguageTag, getVoicePreviewText } from "../../utils/ttsUtils";
import { TtsVoiceModal } from "./TtsVoiceModal";

interface TtsVoiceSelectorProps {
  voices: SpeechSynthesisVoice[];
  selectedVoice: string;
  onSelectVoice: (voiceName: string) => void;
  ttsRate?: number;
  ttsPitch?: number;
  ttsVolume?: number;
  border?: string;
  bgInput?: string;
  bgHover?: string;
  textMain?: string;
  textMut?: string;
}

export const TtsVoiceSelector: FC<TtsVoiceSelectorProps> = ({
  voices,
  selectedVoice,
  onSelectVoice,
  ttsRate = 1,
  ttsPitch = 1,
  ttsVolume = 1,
  border,
  bgInput,
  textMain,
  textMut,
}) => {
  const isDark = useDark();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewVoice, setPreviewVoice] = useState<string | null>(null);

  // Stop ongoing preview
  const stopPreview = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPreviewVoice(null);
  }, []);

  // Currently selected voice object
  const currentVoiceObj = useMemo(() => {
    return voices.find((v) => v.name === selectedVoice) || voices[0] || null;
  }, [voices, selectedVoice]);

  const currentParsedLang = useMemo(() => {
    return currentVoiceObj ? parseLanguageTag(currentVoiceObj.lang) : null;
  }, [currentVoiceObj]);

  // Handle audio preview playback
  const togglePreview = (voice: SpeechSynthesisVoice, e: MouseEvent) => {
    e.stopPropagation();

    if (previewVoice === voice.name) {
      stopPreview();
      return;
    }

    stopPreview();
    setPreviewVoice(voice.name);

    if (typeof window !== "undefined" && window.speechSynthesis) {
      const text = getVoicePreviewText(voice);
      const utter = new SpeechSynthesisUtterance(text);
      utter.voice = voice;
      utter.rate = ttsRate;
      utter.pitch = ttsPitch;
      utter.volume = ttsVolume;

      utter.onend = () => {
        setPreviewVoice(null);
      };
      utter.onerror = () => {
        setPreviewVoice(null);
      };

      window.speechSynthesis.speak(utter);
    }
  };

  // Color tokens
  const d = isDark;
  const themeMode = useThemeMode();
  const isAmoled = themeMode === "amoled";
  const cardBorder = border || (isAmoled ? "#27272a" : d ? "#374151" : "#e5e7eb");
  const inputBg = bgInput || (isAmoled ? "#09090b" : d ? "#1f2937" : "#ffffff");
  const mainText = textMain || (isAmoled ? "#ffffff" : d ? "#f3f4f6" : "#111827");
  const mutText = textMut || (isAmoled ? "#a1a1aa" : d ? "#9ca3af" : "#6b7280");

  if (voices.length === 0) {
    return (
      <div
        className="w-full rounded-lg px-3 py-2.5 text-xs flex items-center gap-2 border opacity-75"
        style={{ borderColor: cardBorder, background: inputBg, color: mutText }}
      >
        <IcoVolume size={15} />
        <span>Loading speech voices…</span>
      </div>
    );
  }

  return (
    <>
      {/* Sleek, Non-cramped Sidebar Trigger Card */}
      <div
        className="w-full rounded-xl border p-3 flex flex-col gap-2.5 transition-all duration-150 cursor-pointer group hover:border-amber-500/50"
        style={{
          borderColor: cardBorder,
          background: inputBg,
          color: mainText,
        }}
        onClick={() => setIsModalOpen(true)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
              style={{
                background: previewVoice === currentVoiceObj?.name ? "rgba(245,158,11,0.2)" : d ? "#374151" : "#f3f4f6",
                color: previewVoice === currentVoiceObj?.name ? "#f59e0b" : mutText,
              }}
            >
              {previewVoice === currentVoiceObj?.name ? (
                <span className="flex items-center gap-0.5">
                  <span className="w-1 h-3 bg-amber-500 rounded-full animate-bounce" />
                  <span className="w-1 h-4 bg-amber-500 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:0.3s]" />
                </span>
              ) : (
                <IcoVolume size={16} />
              )}
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold truncate leading-tight group-hover:text-amber-500 transition-colors" style={{ color: mainText }}>
                {currentVoiceObj?.name || "Select Voice"}
              </span>
              <div className="flex items-center gap-1 mt-0.5 text-[11px]" style={{ color: mutText }}>
                <span>{currentParsedLang?.flag}</span>
                <span className="truncate">{currentParsedLang?.displayName}</span>
                <span className="opacity-60 text-[10px] font-mono">({currentParsedLang?.langCode})</span>
              </div>
            </div>
          </div>

          {/* Quick Preview Button */}
          {currentVoiceObj && (
            <button
              type="button"
              onClick={(e) => togglePreview(currentVoiceObj, e)}
              title={previewVoice === currentVoiceObj.name ? "Stop preview" : "Listen to sample preview"}
              className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-amber-500/10 text-amber-500 shrink-0"
              style={{
                background: previewVoice === currentVoiceObj.name ? "rgba(245,158,11,0.15)" : "transparent",
              }}
            >
              {previewVoice === currentVoiceObj.name ? <IcoStop size={14} /> : <IcoPlay size={14} />}
            </button>
          )}
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between pt-1 border-t text-[11px]" style={{ borderColor: cardBorder }}>
          <div className="flex items-center gap-1.5">
            {currentVoiceObj?.localService ? (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1"
                style={{ background: d ? "#064e3b" : "#d1fae5", color: d ? "#34d399" : "#065f46" }}
              >
                <IcoWifiOff size={10} /> Local
              </span>
            ) : (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1"
                style={{ background: d ? "#1e3a5f" : "#e0f2fe", color: d ? "#38bdf8" : "#0369a1" }}
              >
                <IcoGlobe size={10} /> Online
              </span>
            )}
          </div>

          <div
            className="flex items-center gap-1 font-semibold text-amber-500 hover:text-amber-400 transition-colors"
          >
            <IcoEdit size={12} />
            <span>Change Voice</span>
          </div>
        </div>
      </div>

      {/* Spacious 2-Column Dialog Modal */}
      <TtsVoiceModal
        isOpen={isModalOpen}
        onClose={() => {
          stopPreview();
          setIsModalOpen(false);
        }}
        voices={voices}
        selectedVoice={selectedVoice}
        onSelectVoice={onSelectVoice}
        ttsRate={ttsRate}
        ttsPitch={ttsPitch}
        ttsVolume={ttsVolume}
      />
    </>
  );
};
