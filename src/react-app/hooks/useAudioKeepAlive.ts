import { useRef, useCallback } from "react";
import { KeepAlive } from "../types/reader";

export function useAudioKeepAlive() {
  const keepAliveRef = useRef<KeepAlive | null>(null);

  const startKeepAlive = useCallback(() => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(ctx.destination);
      src.start();
      keepAliveRef.current = { ctx, src };
    } catch (_) {}
  }, []);

  const stopKeepAlive = useCallback(() => {
    try {
      keepAliveRef.current?.src.stop();
      keepAliveRef.current?.ctx.close();
    } catch (_) {}
    keepAliveRef.current = null;
  }, []);

  return { startKeepAlive, stopKeepAlive, keepAliveRef };
}
