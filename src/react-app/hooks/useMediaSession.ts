import { useEffect, useRef, useCallback } from "react";
import { TtsState } from "../types/reader";

export interface MediaSessionOptions {
  title: string;
  artist?: string;
  album?: string;
  ttsState: TtsState;
  playbackRate?: number;
  activePara?: number;
  totalParagraphs?: number;
  paraProgress?: number;
  onPlay?: () => void;
  onPause?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onSeekBackward?: () => void;
  onSeekForward?: () => void;
  onStop?: () => void;
}

/**
 * Creates a minimal, valid inaudible 1-second 8kHz 8-bit mono silent WAV audio URL.
 * Used to keep background audio session alive in mobile browsers (iOS Safari / Android Chrome)
 * and enable lockscreen MediaSession controls without external network dependencies.
 */
function createSilentAudioUrl(): string {
  const sampleRate = 8000;
  const numSamples = sampleRate; // 1 second
  const buffer = new ArrayBuffer(44 + numSamples);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + numSamples, true);
  writeAscii(view, 8, "WAVE");

  // "fmt " sub-chunk
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true); // subchunk1 size (16 for PCM)
  view.setUint16(20, 1, true); // audio format (1 = PCM)
  view.setUint16(22, 1, true); // 1 channel (mono)
  view.setUint32(24, sampleRate, true); // sample rate
  view.setUint32(28, sampleRate, true); // byte rate (sampleRate * 1 * 1)
  view.setUint16(32, 1, true); // block align
  view.setUint16(34, 8, true); // bits per sample (8-bit)

  // "data" sub-chunk
  writeAscii(view, 36, "data");
  view.setUint32(40, numSamples, true);

  // 8-bit PCM silence is 128 (0x80)
  const pcmData = new Uint8Array(buffer, 44);
  pcmData.fill(128);

  const blob = new Blob([buffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

function writeAscii(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export function useMediaSession({
  title,
  artist,
  album = "PDF Reader",
  ttsState,
  playbackRate = 1.0,
  activePara = 0,
  totalParagraphs = 0,
  paraProgress = 0,
  onPlay,
  onPause,
  onPrev,
  onNext,
  onSeekBackward,
  onSeekForward,
  onStop,
}: MediaSessionOptions) {
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);

  // Stable callback refs to avoid recreating action handlers constantly
  const callbacksRef = useRef({
    onPlay,
    onPause,
    onPrev,
    onNext,
    onSeekBackward,
    onSeekForward,
    onStop,
  });

  useEffect(() => {
    callbacksRef.current = {
      onPlay,
      onPause,
      onPrev,
      onNext,
      onSeekBackward,
      onSeekForward,
      onStop,
    };
  });

  // Initialize background silent audio element & Web Audio
  const initAudio = useCallback(() => {
    if (typeof window === "undefined") return;

    // 1. HTML5 Audio Element for mobile lockscreen & OS media session
    if (!audioElRef.current) {
      try {
        if (!audioUrlRef.current) {
          audioUrlRef.current = createSilentAudioUrl();
        }
        const audio = new Audio();
        audio.src = audioUrlRef.current;
        audio.loop = true;
        audio.preload = "auto";
        // iOS WebKit attributes
        audio.setAttribute("playsinline", "true");
        audio.setAttribute("webkit-playsinline", "true");
        audioElRef.current = audio;
      } catch {
        // audio element not supported or blocked
      }
    }

    // 2. Web Audio Context fallback
    if (!audioCtxRef.current) {
      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.loop = true;
          src.connect(ctx.destination);
          src.start();
          audioCtxRef.current = ctx;
          audioSrcRef.current = src;
        }
      } catch {
        // Web Audio not available
      }
    }
  }, []);

  // Start background audio keepalive
  const startKeepAlive = useCallback(() => {
    initAudio();
    if (audioElRef.current) {
      audioElRef.current.play().catch(() => {
        // Autoplay may be restricted until user interaction
      });
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {
        // audio context resume ignore
      });
    }
  }, [initAudio]);

  // Stop / pause background audio keepalive
  const stopKeepAlive = useCallback(() => {
    if (audioElRef.current) {
      audioElRef.current.pause();
    }
    if (audioSrcRef.current) {
      try {
        audioSrcRef.current.stop();
      } catch {
        // ignore stop error
      }
      audioSrcRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        // ignore close error
      }
      audioCtxRef.current = null;
    }
  }, []);

  const pauseKeepAlive = useCallback(() => {
    if (audioElRef.current) {
      audioElRef.current.pause();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "running") {
      audioCtxRef.current.suspend().catch(() => {
        // ignore suspend error
      });
    }
  }, []);

  // Synchronize audio playback state with TTS state
  useEffect(() => {
    if (ttsState === "playing") {
      startKeepAlive();
    } else if (ttsState === "paused") {
      pauseKeepAlive();
    } else {
      pauseKeepAlive();
    }
  }, [ttsState, startKeepAlive, pauseKeepAlive]);

  // Chromium 15s SpeechSynthesis background keepalive heartbeat
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (ttsState === "playing") {
      if (heartbeatTimerRef.current !== null) {
        clearInterval(heartbeatTimerRef.current);
      }
      heartbeatTimerRef.current = window.setInterval(() => {
        if (
          typeof window !== "undefined" &&
          window.speechSynthesis &&
          window.speechSynthesis.speaking &&
          !window.speechSynthesis.paused
        ) {
          // Momentarily toggle pause/resume to reset Chromium's 15-second speech watchdog
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);
    } else {
      if (heartbeatTimerRef.current !== null) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    }

    return () => {
      if (heartbeatTimerRef.current !== null) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [ttsState]);

  // MediaSession Metadata & PlaybackState update
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    const displayTitle = title || "PDF Document";
    const displayArtist = artist || "PDF Reader";

    if (window.MediaMetadata) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: displayTitle,
        artist: displayArtist,
        album: album,
        artwork: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png" },
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
        ],
      });
    }

    try {
      navigator.mediaSession.playbackState =
        ttsState === "playing" ? "playing" : ttsState === "paused" ? "paused" : "none";
    } catch {
      // ignore playbackState error
    }
  }, [title, artist, album, ttsState]);

  // MediaSession Action Handlers setup
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) return;

    const actionMap: [MediaSessionAction, (() => void) | undefined][] = [
      ["play", () => callbacksRef.current.onPlay?.()],
      ["pause", () => callbacksRef.current.onPause?.()],
      ["previoustrack", () => callbacksRef.current.onPrev?.()],
      ["nexttrack", () => callbacksRef.current.onNext?.()],
      ["seekbackward", () => (callbacksRef.current.onSeekBackward ?? callbacksRef.current.onPrev)?.()],
      ["seekforward", () => (callbacksRef.current.onSeekForward ?? callbacksRef.current.onNext)?.()],
      ["stop", () => callbacksRef.current.onStop?.()],
    ];

    for (const [action, handler] of actionMap) {
      try {
        if (handler) {
          navigator.mediaSession.setActionHandler(action, handler);
        } else {
          navigator.mediaSession.setActionHandler(action, null);
        }
      } catch {
        // Action might not be supported in this browser version
      }
    }

    return () => {
      for (const [action] of actionMap) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // ignore cleanup error
        }
      }
    };
  }, []);

  // Update MediaSession Position State (for scrub bar if supported)
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("mediaSession" in navigator) ||
      !("setPositionState" in navigator.mediaSession)
    ) {
      return;
    }

    if (totalParagraphs > 0) {
      try {
        const duration = Math.max(1, totalParagraphs);
        const position = Math.min(
          duration,
          Math.max(0, (activePara >= 0 ? activePara : 0) + (paraProgress || 0))
        );
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: playbackRate > 0 ? playbackRate : 1.0,
          position,
        });
      } catch {
        // ignore setPositionState error
      }
    }
  }, [activePara, totalParagraphs, paraProgress, playbackRate]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopKeepAlive();
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      if (heartbeatTimerRef.current !== null) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [stopKeepAlive]);

  return {
    startKeepAlive,
    stopKeepAlive,
    pauseKeepAlive,
  };
}
