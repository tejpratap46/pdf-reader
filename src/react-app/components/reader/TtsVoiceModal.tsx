import { FC, useState, useEffect, useMemo, useRef, useCallback, MouseEvent } from "react";
import { useDark, useThemeMode, dk } from "../../hooks/useTheme";
import {
  IcoSearch,
  IcoX,
  IcoCheck,
  IcoPlay,
  IcoStop,
  IcoVolume,
  IcoGlobe,
  IcoWifiOff,
} from "../common/Icons";
import {
  parseLanguageTag,
  getVoicePreviewText,
  saveTtsVoicePreference,
  saveTtsLanguagePreference,
} from "../../utils/ttsUtils";

interface TtsVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  voices: SpeechSynthesisVoice[];
  selectedVoice: string;
  onSelectVoice: (voiceName: string) => void;
  ttsRate?: number;
  ttsPitch?: number;
}

export const TtsVoiceModal: FC<TtsVoiceModalProps> = ({
  isOpen,
  onClose,
  voices,
  selectedVoice,
  onSelectVoice,
  ttsRate = 1,
  ttsPitch = 1,
}) => {
  const isDark = useDark();
  const themeMode = useThemeMode();
  const isAmoled = themeMode === "amoled";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLangKey, setSelectedLangKey] = useState<string>("ALL");
  const [connectionFilter, setConnectionFilter] = useState<"all" | "offline" | "online">("all");
  const [previewVoice, setPreviewVoice] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Stop any ongoing voice preview
  const stopPreview = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPreviewVoice(null);
  }, []);

  // Keyboard navigation & escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopPreview();
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 60);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, stopPreview]);

  // Clean up speech preview on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopPreview();
    }
    return () => {
      stopPreview();
    };
  }, [isOpen, stopPreview]);

  // Currently selected voice object
  const currentVoiceObj = useMemo(() => {
    return voices.find((v) => v.name === selectedVoice) || voices[0] || null;
  }, [voices, selectedVoice]);

  const currentParsedLang = useMemo(() => {
    return currentVoiceObj ? parseLanguageTag(currentVoiceObj.lang) : null;
  }, [currentVoiceObj]);

  // Voice metadata cache
  const voicesMetadata = useMemo(() => {
    return voices.map((v) => ({
      voice: v,
      parsed: parseLanguageTag(v.lang),
    }));
  }, [voices]);

  // Unique languages extracted & sorted
  const availableLanguages = useMemo(() => {
    const map = new Map<
      string,
      {
        langCode: string;
        baseLang: string;
        displayName: string;
        nativeName: string;
        flag: string;
        count: number;
      }
    >();

    for (const { parsed } of voicesMetadata) {
      const key = parsed.langCode;
      if (!map.has(key)) {
        map.set(key, {
          langCode: parsed.langCode,
          baseLang: parsed.baseLang,
          displayName: parsed.displayName,
          nativeName: parsed.nativeName,
          flag: parsed.flag,
          count: 1,
        });
      } else {
        map.get(key)!.count++;
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    );
  }, [voicesMetadata]);

  // Filtered languages for the left sidebar (filtered by search query)
  const filteredLanguages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return availableLanguages;

    return availableLanguages.filter((l) => {
      const nameMatch = l.displayName.toLowerCase().includes(q);
      const nativeMatch = l.nativeName.toLowerCase().includes(q);
      const codeMatch = l.langCode.toLowerCase().includes(q);
      const baseMatch = l.baseLang.toLowerCase().includes(q);
      const hasMatchingVoice = voicesMetadata.some(
        ({ voice, parsed }) =>
          parsed.langCode === l.langCode &&
          voice.name.toLowerCase().includes(q)
      );
      return nameMatch || nativeMatch || codeMatch || baseMatch || hasMatchingVoice;
    });
  }, [availableLanguages, voicesMetadata, searchQuery]);

  // Filtered voices for the right panel
  const filteredVoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return voicesMetadata.filter(({ voice, parsed }) => {
      // 1. Connection filter
      if (connectionFilter === "offline" && !voice.localService) return false;
      if (connectionFilter === "online" && voice.localService) return false;

      // 2. Language filter
      if (selectedLangKey !== "ALL") {
        if (
          parsed.langCode !== selectedLangKey &&
          parsed.baseLang !== selectedLangKey
        ) {
          return false;
        }
      }

      // 3. Search query
      if (!q) return true;

      const nameMatch = voice.name.toLowerCase().includes(q);
      const codeMatch = parsed.langCode.toLowerCase().includes(q);
      const displayMatch = parsed.displayName.toLowerCase().includes(q);
      const nativeMatch = parsed.nativeName.toLowerCase().includes(q);
      const regionMatch = parsed.regionCode?.toLowerCase().includes(q);

      return nameMatch || codeMatch || displayMatch || nativeMatch || regionMatch;
    });
  }, [voicesMetadata, searchQuery, selectedLangKey, connectionFilter]);

  // Handle voice selection
  const handleSelect = (voice: SpeechSynthesisVoice) => {
    stopPreview();
    onSelectVoice(voice.name);
    saveTtsVoicePreference(voice.name, voice.lang);
    saveTtsLanguagePreference(voice.lang);
  };

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

      utter.onend = () => {
        setPreviewVoice(null);
      };
      utter.onerror = () => {
        setPreviewVoice(null);
      };

      window.speechSynthesis.speak(utter);
    }
  };

  if (!isOpen) return null;

  const d = isDark;
  const bgBackdrop = "rgba(0, 0, 0, 0.85)";
  const bgModal = isAmoled ? "#000000" : d ? "#0f172a" : "#ffffff";
  const bgCard = isAmoled ? "#09090b" : d ? "#1e293b" : "#f8fafc";
  const bgHover = isAmoled ? "#18181b" : d ? "#334155" : "#f1f5f9";
  const borderCol = isAmoled ? "#27272a" : d ? "#334155" : "#e2e8f0";
  const textMain = isAmoled ? "#ffffff" : d ? "#f8fafc" : "#0f172a";
  const textMut = isAmoled ? "#a1a1aa" : d ? "#94a3b8" : "#64748b";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
      style={{ background: bgBackdrop, backdropFilter: "blur(6px)" }}
      onClick={() => {
        stopPreview();
        onClose();
      }}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] h-[640px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border transition-all animate-in zoom-in-95 duration-200"
        style={{ background: bgModal, borderColor: borderCol, color: textMain }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: borderCol, background: bgCard }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-md">
              <IcoVolume size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold leading-tight">Text-to-Speech Voice &amp; Language</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  {voices.length} voices · {availableLanguages.length} languages
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: textMut }}>
                Select your preferred speech voice. Preferences are saved automatically to your device.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopPreview();
              onClose();
            }}
            className="p-2 rounded-lg hover:opacity-80 transition-colors cursor-pointer"
            style={{ color: textMut }}
            title="Close dialog (Escape)"
          >
            <IcoX size={18} />
          </button>
        </div>

        {/* Main 2-Column Content Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Language Navigator */}
          <div
            className="w-64 sm:w-72 border-r flex flex-col shrink-0 overflow-hidden"
            style={{ borderColor: borderCol, background: d ? "#111827" : "#f8fafc" }}
          >
            <div
              className="p-3 border-b flex items-center justify-between text-xs font-semibold uppercase tracking-wider"
              style={{ borderColor: borderCol, color: textMut }}
            >
              <span>Languages</span>
              <span className="text-[11px] font-normal text-amber-500">
                {filteredLanguages.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
              {/* All Languages button */}
              <button
                type="button"
                onClick={() => setSelectedLangKey("ALL")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                  selectedLangKey === "ALL"
                    ? "bg-amber-500 text-white shadow-xs"
                    : dk("text-gray-700 hover:bg-gray-100", "text-gray-300 hover:bg-gray-800", d)
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>🌐</span>
                  <span>All Languages</span>
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    selectedLangKey === "ALL"
                      ? "bg-white/20 text-white"
                      : d
                      ? "bg-gray-800 text-gray-400"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {voices.length}
                </span>
              </button>

              {/* Language list */}
              {filteredLanguages.map((lang) => {
                const isSelected = selectedLangKey === lang.langCode;
                return (
                  <button
                    key={lang.langCode}
                    type="button"
                    onClick={() => {
                      setSelectedLangKey(lang.langCode);
                      saveTtsLanguagePreference(lang.langCode);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                      isSelected
                        ? "bg-amber-500 text-white shadow-xs"
                        : dk("text-gray-700 hover:bg-gray-100", "text-gray-300 hover:bg-gray-800", d)
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span>{lang.flag}</span>
                      <span className="truncate">{lang.displayName}</span>
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ml-1.5 ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : d
                          ? "bg-gray-800 text-gray-400"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {lang.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Voice Search, Filters & Voice Cards Grid */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Toolbar: Search & Connection Filters */}
            <div
              className="p-3 border-b flex items-center gap-3 shrink-0 flex-wrap"
              style={{ borderColor: borderCol, background: bgCard }}
            >
              {/* Search input */}
              <div className="relative flex-1 min-w-[200px]">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: textMut }}>
                  <IcoSearch size={15} />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search voices by name, dialect, country…"
                  className="w-full rounded-xl pl-9 pr-8 py-2 text-xs outline-none border transition-colors focus:ring-2 focus:ring-amber-500/50"
                  style={{
                    background: d ? "#0f172a" : "#ffffff",
                    borderColor: borderCol,
                    color: textMain,
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded cursor-pointer transition-colors"
                    style={{ color: textMut }}
                    title="Clear search"
                  >
                    <IcoX size={13} />
                  </button>
                )}
              </div>

              {/* Connection Filter Pills */}
              <div className="flex rounded-lg p-1 gap-1 text-xs" style={{ background: d ? "#0f172a" : "#e2e8f0" }}>
                <button
                  type="button"
                  onClick={() => setConnectionFilter("all")}
                  className={`px-2.5 py-1 rounded-md cursor-pointer font-medium transition-colors ${
                    connectionFilter === "all" ? "bg-amber-500 text-white shadow-xs" : ""
                  }`}
                  style={connectionFilter === "all" ? {} : { color: textMut }}
                >
                  All Voices
                </button>
                <button
                  type="button"
                  onClick={() => setConnectionFilter("offline")}
                  className={`px-2.5 py-1 rounded-md cursor-pointer font-medium transition-colors flex items-center gap-1 ${
                    connectionFilter === "offline" ? "bg-emerald-600 text-white shadow-xs" : ""
                  }`}
                  style={connectionFilter === "offline" ? {} : { color: textMut }}
                  title="Show offline local voices only"
                >
                  <IcoWifiOff size={12} /> Offline
                </button>
                <button
                  type="button"
                  onClick={() => setConnectionFilter("online")}
                  className={`px-2.5 py-1 rounded-md cursor-pointer font-medium transition-colors flex items-center gap-1 ${
                    connectionFilter === "online" ? "bg-sky-600 text-white shadow-xs" : ""
                  }`}
                  style={connectionFilter === "online" ? {} : { color: textMut }}
                  title="Show online cloud voices only"
                >
                  <IcoGlobe size={12} /> Online
                </button>
              </div>
            </div>

            {/* Voices Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredVoices.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-12 px-4 text-center gap-3" style={{ color: textMut }}>
                  <div className="p-3 rounded-full bg-amber-500/10 text-amber-500">
                    <IcoSearch size={28} />
                  </div>
                  <h4 className="text-sm font-bold" style={{ color: textMain }}>No matching voices found</h4>
                  <p className="text-xs max-w-sm">
                    {searchQuery
                      ? `No voices matched "${searchQuery}". Try searching for a different language name, dialect, or voice.`
                      : "No voices available under the current filters."}
                  </p>
                  {(searchQuery || selectedLangKey !== "ALL" || connectionFilter !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedLangKey("ALL");
                        setConnectionFilter("all");
                      }}
                      className="mt-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 cursor-pointer shadow-sm transition-all"
                    >
                      Reset all filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredVoices.map(({ voice, parsed }) => {
                    const isSelected = voice.name === selectedVoice;
                    const isPlaying = previewVoice === voice.name;

                    return (
                      <div
                        key={voice.name}
                        onClick={() => handleSelect(voice)}
                        className={`p-3.5 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between gap-3 group relative ${
                          isSelected
                            ? d
                              ? "bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10"
                              : "bg-amber-50 border-amber-500 shadow-md shadow-amber-500/10"
                            : dk("bg-white border-gray-200 hover:border-gray-300", "bg-gray-800/60 border-gray-700/80 hover:border-gray-600", d)
                        }`}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            (e.currentTarget as HTMLElement).style.background = bgHover;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            (e.currentTarget as HTMLElement).style.background = d ? "rgba(30, 41, 59, 0.6)" : "#ffffff";
                          }
                        }}
                      >
                        {/* Top row: Voice name & status badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold leading-tight" style={{ color: isSelected ? "#f59e0b" : textMain }}>
                                {voice.name}
                              </span>
                              {voice.default && (
                                <span
                                  className="text-[9px] px-1.5 py-0.2 rounded font-medium"
                                  style={{ background: d ? "#334155" : "#e2e8f0", color: textMut }}
                                >
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-[11px]" style={{ color: textMut }}>
                              <span>{parsed.flag}</span>
                              <span className="font-medium">{parsed.displayName}</span>
                              <span className="text-[10px] opacity-75 font-mono">({parsed.langCode})</span>
                            </div>
                          </div>

                          {/* Selected Checkmark Badge */}
                          {isSelected ? (
                            <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                              <IcoCheck size={14} />
                            </div>
                          ) : (
                            <div
                              className="w-6 h-6 rounded-full border flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ borderColor: borderCol, color: textMut }}
                            >
                              <span className="w-2 h-2 rounded-full bg-current opacity-40" />
                            </div>
                          )}
                        </div>

                        {/* Bottom row: Type badge & Listen Preview Button */}
                        <div className="flex items-center justify-between pt-1 border-t shrink-0" style={{ borderColor: isSelected ? "rgba(245, 158, 11, 0.2)" : borderCol }}>
                          <div className="flex items-center gap-1.5">
                            {voice.localService ? (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                                style={{ background: d ? "#064e3b" : "#d1fae5", color: d ? "#34d399" : "#065f46" }}
                              >
                                <IcoWifiOff size={11} /> Local Offline
                              </span>
                            ) : (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                                style={{ background: d ? "#1e3a5f" : "#e0f2fe", color: d ? "#38bdf8" : "#0369a1" }}
                              >
                                <IcoGlobe size={11} /> Cloud Voice
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => togglePreview(voice, e)}
                            title={isPlaying ? "Stop sample preview" : `Listen to ${voice.name}`}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isPlaying
                                ? "bg-amber-500 text-white shadow-sm"
                                : "hover:bg-amber-500/10 hover:text-amber-500"
                            }`}
                            style={!isPlaying ? { color: textMut } : {}}
                          >
                            {isPlaying ? (
                              <>
                                <IcoStop size={12} /> Playing…
                              </>
                            ) : (
                              <>
                                <IcoPlay size={12} /> Preview
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-3.5 border-t shrink-0 flex-wrap gap-3"
          style={{ borderColor: borderCol, background: bgCard }}
        >
          <div className="flex items-center gap-2 text-xs">
            <span style={{ color: textMut }}>Selected Voice:</span>
            <span className="font-semibold" style={{ color: textMain }}>
              {currentVoiceObj?.name || "None"}
            </span>
            {currentParsedLang && (
              <span className="text-[11px] px-2 py-0.5 rounded-md font-mono" style={{ background: d ? "#334155" : "#e2e8f0", color: textMut }}>
                {currentParsedLang.flag} {currentParsedLang.displayName} ({currentParsedLang.langCode})
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              stopPreview();
              onClose();
            }}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md bg-amber-500 hover:bg-amber-600 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
