import { useRef, useCallback } from "react";
import { KeepAlive } from "../types/reader";

function createSilentAudioUrl(): string {
  const sampleRate = 8000;
  const numSamples = sampleRate;
  const buffer = new ArrayBuffer(44 + numSamples);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + numSamples, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeAscii(36, "data");
  view.setUint32(40, numSamples, true);

  const pcmData = new Uint8Array(buffer, 44);
  pcmData.fill(128);

  const blob = new Blob([buffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

export function useAudioKeepAlive() {
  const keepAliveRef = useRef<KeepAlive | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const startKeepAlive = useCallback(() => {
    try {
      if (!audioElRef.current) {
        if (!audioUrlRef.current) {
          audioUrlRef.current = createSilentAudioUrl();
        }
        const audio = new Audio();
        audio.src = audioUrlRef.current;
        audio.loop = true;
        audio.preload = "auto";
        audio.setAttribute("playsinline", "true");
        audio.setAttribute("webkit-playsinline", "true");
        audioElRef.current = audio;
      }
      audioElRef.current.play().catch(() => {});

      if (!keepAliveRef.current) {
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
          keepAliveRef.current = { ctx, src };
        }
      }
    } catch {
      // ignore init error
    }
  }, []);

  const stopKeepAlive = useCallback(() => {
    try {
      if (audioElRef.current) {
        audioElRef.current.pause();
      }
      keepAliveRef.current?.src.stop();
      keepAliveRef.current?.ctx.close();
    } catch {
      // ignore stop error
    }
    keepAliveRef.current = null;
  }, []);

  return { startKeepAlive, stopKeepAlive, keepAliveRef };
}

