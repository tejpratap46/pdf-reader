/**
 * TTS Voice and Language Utilities
 * Handles voice persistence, locale formatting, preview playback, and voice resolution.
 */

export const STORAGE_TTS_VOICE_KEY = "pdf_reader_tts_voice";
export const STORAGE_TTS_LANG_KEY = "pdf_reader_tts_lang";
export const STORAGE_TTS_RATE_KEY = "pdf_reader_tts_rate";
export const STORAGE_TTS_PITCH_KEY = "pdf_reader_tts_pitch";
export const STORAGE_TTS_VOLUME_KEY = "pdf_reader_tts_volume";
export const STORAGE_TTS_AUTO_NEXT_KEY = "pdf_reader_tts_auto_next";
export const STORAGE_READER_POS_PREFIX = "pdf_reader_pos_";

export interface SavedReaderLocation {
  paraIndex: number;
  charOffset: number;
  progress?: number;
  updatedAt?: number;
}

export interface ParsedLanguage {
  langCode: string;
  baseLang: string;
  regionCode?: string;
  displayName: string;
  nativeName: string;
  flag: string;
}

/**
 * Get country flag emoji from 2-letter ISO country code.
 */
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Common fallback flags for primary language codes without explicit region.
 */
const BASE_LANG_FLAGS: Record<string, string> = {
  en: "🇺🇸",
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
  it: "🇮🇹",
  pt: "🇧🇷",
  ru: "🇷🇺",
  ja: "🇯🇵",
  ko: "🇰🇷",
  zh: "🇨🇳",
  hi: "🇮🇳",
  ar: "🇸🇦",
  nl: "🇳🇱",
  pl: "🇵🇱",
  tr: "🇹🇷",
  sv: "🇸🇪",
  da: "🇩🇰",
  fi: "🇫🇮",
  no: "🇳🇴",
  nb: "🇳🇴",
  nn: "🇳🇴",
  el: "🇬🇷",
  he: "🇮🇱",
  th: "🇹🇭",
  vi: "🇻🇳",
  id: "🇮🇩",
  cs: "🇨🇿",
  uk: "🇺🇦",
  ro: "🇷🇴",
  hu: "🇭🇺",
  bn: "🇧🇩",
  ta: "🇮🇳",
  te: "🇮🇳",
  mr: "🇮🇳",
  ur: "🇵🇰",
  fa: "🇮🇷",
  ms: "🇲🇾",
  fil: "🇵🇭",
  tl: "🇵🇭",
  ca: "🇪🇸",
  hr: "🇭🇷",
  sk: "🇸🇰",
  bg: "🇧🇬",
  sr: "🇷🇸",
  sl: "🇸🇮",
  et: "🇪🇪",
  lv: "🇱🇻",
  lt: "🇱🇹",
};

/**
 * Format language tag into parsed components with localized and native names.
 */
export function parseLanguageTag(langTag: string): ParsedLanguage {
  const normalized = (langTag || "").replace(/_/g, "-").trim();
  const parts = normalized.split("-");
  const baseLang = parts[0]?.toLowerCase() || "en";
  const regionCode = parts.length > 1 && parts[parts.length - 1].length === 2 ? parts[parts.length - 1].toUpperCase() : undefined;

  let displayName = normalized;
  let nativeName = "";

  // 1. Localized display name (in current user locale / English)
  try {
    const dn = new Intl.DisplayNames([navigator.language || "en", "en"], { type: "language" });
    const resolved = dn.of(normalized);
    if (resolved) {
      displayName = resolved.charAt(0).toUpperCase() + resolved.slice(1);
    } else {
      const baseResolved = dn.of(baseLang);
      if (baseResolved) {
        displayName = baseResolved.charAt(0).toUpperCase() + baseResolved.slice(1);
      }
    }
  } catch {
    // Fallback if Intl.DisplayNames throws for invalid tags
  }

  // 2. Region enhancement if applicable
  if (regionCode && !displayName.includes("(")) {
    try {
      const rn = new Intl.DisplayNames([navigator.language || "en", "en"], { type: "region" });
      const regName = rn.of(regionCode);
      if (regName) {
        displayName = `${displayName} (${regName})`;
      }
    } catch {
      // Ignore region lookup failure
    }
  }

  // 3. Native language name
  try {
    const nativeDn = new Intl.DisplayNames([normalized, baseLang], { type: "language" });
    const nat = nativeDn.of(normalized) || nativeDn.of(baseLang);
    if (nat) {
      nativeName = nat.charAt(0).toUpperCase() + nat.slice(1);
    }
  } catch {
    // Ignore native name failure
  }

  // 4. Flag
  let flag = "";
  if (regionCode) {
    flag = getCountryFlag(regionCode);
  }
  if (!flag) {
    flag = BASE_LANG_FLAGS[baseLang] || "🌐";
  }

  return {
    langCode: normalized,
    baseLang,
    regionCode,
    displayName,
    nativeName,
    flag,
  };
}

/**
 * Get friendly preview text for a voice in its language.
 */
export function getVoicePreviewText(voice: SpeechSynthesisVoice): string {
  const base = (voice.lang || "").toLowerCase().replace(/_/g, "-").split("-")[0];
  const previews: Record<string, string> = {
    en: "Hello! This is a preview of this voice.",
    es: "¡Hola! Esta es una vista previa de esta voz.",
    fr: "Bonjour! Ceci est un aperçu de cette voix.",
    de: "Hallo! Dies ist eine Vorschau dieser Stimme.",
    it: "Ciao! Questa è un'anteprima di questa voce.",
    pt: "Olá! Esta é uma demonstração desta voz.",
    ru: "Здравствуйте! Это образец звучания этого голоса.",
    ja: "こんにちは！これはこの音声のプレビューです。",
    ko: "안녕하세요! 이 음성의 미리듣기 샘플입니다.",
    zh: "你好！这是该语音的试听效果。",
    hi: "नमस्ते! यह इस आवाज़ का एक नमूना है।",
    ar: "مرحبا! هذه عينة من هذا الصوت.",
    nl: "Hallo! Dit is een voorbeeld van deze stem.",
    pl: "Cześć! To jest próbka tego głosu.",
    tr: "Merhaba! Bu sesin bir önizlemesidir.",
    sv: "Hej! Detta är ett smakprov på denna röst.",
    da: "Hej! Dette er en forhåndsvisning af denne stemme.",
    fi: "Hei! Tämä on tämän äänen esikatselu.",
    no: "Hei! Dette er en forhåndsvisning av denne stemmen.",
    el: "Γεια σας! Αυτό είναι ένα δείγμα αυτής της φωνής.",
    he: "שלום! זוהי תצוגה מקדימה של הקול הזה.",
    th: "สวัสดี! นี่คือตัวอย่างเสียงพูด",
    vi: "Xin chào! Đây là bản nghe thử giọng đọc này.",
    id: "Halo! Ini adalah pratinjau suara ini.",
    cs: "Ahoj! Toto je ukázka tohoto hlasu.",
    uk: "Привіт! Це зразок цього голосу.",
    ro: "Bună! Acesta este un exemplu pentru această voce.",
    hu: "Helló! Ez egy minta ebből a hangból.",
  };
  return previews[base] || `Hello! This is ${voice.name}.`;
}

/**
 * Storage helpers
 */
export function getSavedVoiceName(): string {
  try {
    return localStorage.getItem(STORAGE_TTS_VOICE_KEY) || localStorage.getItem("folio_tts_voice") || "";
  } catch {
    return "";
  }
}

export function getSavedLanguageCode(): string {
  try {
    return localStorage.getItem(STORAGE_TTS_LANG_KEY) || localStorage.getItem("folio_tts_lang") || "";
  } catch {
    return "";
  }
}

export function saveTtsVoicePreference(voiceName: string, langCode?: string): void {
  try {
    if (voiceName) {
      localStorage.setItem(STORAGE_TTS_VOICE_KEY, voiceName);
    }
    if (langCode) {
      localStorage.setItem(STORAGE_TTS_LANG_KEY, langCode);
    }
  } catch {
    // Ignore storage failure
  }
}

export function saveTtsLanguagePreference(langCode: string): void {
  try {
    if (langCode) {
      localStorage.setItem(STORAGE_TTS_LANG_KEY, langCode);
    }
  } catch {
    // Ignore storage failure
  }
}

export function getSavedTtsRate(): number {
  try {
    const val = localStorage.getItem(STORAGE_TTS_RATE_KEY) || localStorage.getItem("folio_tts_rate");
    if (val) {
      const num = parseFloat(val);
      if (!isNaN(num) && num >= 0.5 && num <= 2.5) return num;
    }
  } catch {
    // Ignore storage failure
  }
  return 1;
}

export function saveTtsRate(rate: number): void {
  try {
    localStorage.setItem(STORAGE_TTS_RATE_KEY, String(rate));
  } catch {
    // Ignore storage failure
  }
}

export function getSavedTtsPitch(): number {
  try {
    const val = localStorage.getItem(STORAGE_TTS_PITCH_KEY) || localStorage.getItem("folio_tts_pitch");
    if (val) {
      const num = parseFloat(val);
      if (!isNaN(num) && num >= 0.5 && num <= 2) return num;
    }
  } catch {
    // Ignore storage failure
  }
  return 1;
}

export function saveTtsPitch(pitch: number): void {
  try {
    localStorage.setItem(STORAGE_TTS_PITCH_KEY, String(pitch));
  } catch {
    // Ignore storage failure
  }
}

export function getSavedTtsVolume(): number {
  try {
    const val = localStorage.getItem(STORAGE_TTS_VOLUME_KEY) || localStorage.getItem("folio_tts_volume");
    if (val !== null) {
      const num = parseFloat(val);
      if (!isNaN(num) && num >= 0 && num <= 1) return num;
    }
  } catch {
    // Ignore storage failure
  }
  return 1;
}

export function saveTtsVolume(volume: number): void {
  try {
    localStorage.setItem(STORAGE_TTS_VOLUME_KEY, String(volume));
  } catch {
    // Ignore storage failure
  }
}

export function getSavedAutoNext(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_TTS_AUTO_NEXT_KEY) ?? localStorage.getItem("folio_tts_auto_next");
    if (val !== null) return val === "true";
  } catch {
    // Ignore storage failure
  }
  return false;
}

export function saveAutoNext(autoNext: boolean): void {
  try {
    localStorage.setItem(STORAGE_TTS_AUTO_NEXT_KEY, String(autoNext));
  } catch {
    // Ignore storage failure
  }
}

/**
 * Reader Mode Location Persistence Helpers
 */
export function saveReaderPosition(docKey: string, pos: SavedReaderLocation): void {
  if (!docKey) return;
  try {
    const data: SavedReaderLocation = {
      paraIndex: Math.max(0, pos.paraIndex),
      charOffset: Math.max(0, pos.charOffset),
      progress: typeof pos.progress === "number" ? Math.max(0, Math.min(1, pos.progress)) : 0,
      updatedAt: Date.now(),
    };
    localStorage.setItem(`${STORAGE_READER_POS_PREFIX}${docKey}`, JSON.stringify(data));
  } catch {
    // Ignore storage failure
  }
}

export function getSavedReaderPosition(docKey: string): SavedReaderLocation | null {
  if (!docKey) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_READER_POS_PREFIX}${docKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.paraIndex === "number" && typeof parsed.charOffset === "number") {
        return parsed;
      }
    }
  } catch {
    // Ignore storage failure
  }
  return null;
}

export function clearSavedReaderPosition(docKey: string): void {
  if (!docKey) return;
  try {
    localStorage.removeItem(`${STORAGE_READER_POS_PREFIX}${docKey}`);
  } catch {
    // Ignore storage failure
  }
}

/**
 * Resolves the best voice to select without ever wiping out user selection.
 */
export function resolveBestVoice(
  voices: SpeechSynthesisVoice[],
  currentVoiceName?: string,
  preferredLangCode?: string
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // 1. If currently selected voice is valid in this voice list, keep it!
  if (currentVoiceName) {
    const match = voices.find((v) => v.name === currentVoiceName);
    if (match) return match;
  }

  // 2. Check localStorage saved voice
  const savedVoice = getSavedVoiceName();
  if (savedVoice) {
    const match = voices.find((v) => v.name === savedVoice);
    if (match) return match;
  }

  // 3. Check preferred or saved language
  const targetLang = preferredLangCode || getSavedLanguageCode();
  if (targetLang) {
    const normTarget = targetLang.toLowerCase().replace(/_/g, "-");
    const baseTarget = normTarget.split("-")[0];

    // Exact match (e.g. en-US)
    const exactMatch = voices.find(
      (v) => v.lang.toLowerCase().replace(/_/g, "-") === normTarget
    );
    if (exactMatch) return exactMatch;

    // Base match (e.g. en)
    const baseMatch = voices.find(
      (v) => v.lang.toLowerCase().replace(/_/g, "-").startsWith(baseTarget)
    );
    if (baseMatch) return baseMatch;
  }

  // 4. Match system language
  if (typeof navigator !== "undefined" && navigator.language) {
    const sysLang = navigator.language.toLowerCase().replace(/_/g, "-");
    const sysBase = sysLang.split("-")[0];
    const sysExact = voices.find(
      (v) => v.lang.toLowerCase().replace(/_/g, "-") === sysLang
    );
    if (sysExact) return sysExact;
    const sysBaseMatch = voices.find(
      (v) => v.lang.toLowerCase().replace(/_/g, "-").startsWith(sysBase)
    );
    if (sysBaseMatch) return sysBaseMatch;
  }

  // 5. Default voice or first voice
  const defVoice = voices.find((v) => v.default);
  return defVoice || voices[0] || null;
}
