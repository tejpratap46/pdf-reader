import { useState, useEffect } from "react";
import { PDFJS_URL, PDFJS_WORKER } from "../constants/reader";

declare global {
  interface Window {
    pdfjsLib: any;
    webkitAudioContext: typeof AudioContext;
    launchQueue?: {
      setConsumer: (consumer: (launchParams: { files: any[] }) => void) => void;
    };
  }
}

export function usePdfJs(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (window.pdfjsLib) {
      setReady(true);
      return;
    }
    const s = document.createElement("script");
    s.src = PDFJS_URL;
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      setReady(true);
    };
    document.head.appendChild(s);
  }, []);
  return ready;
}
