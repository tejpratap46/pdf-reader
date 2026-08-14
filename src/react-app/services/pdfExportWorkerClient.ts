import type { PageState } from "../types/editor";
import type {
  PdfExportWorkerMessageIn,
  PdfExportWorkerMessageOut,
} from "../workers/pdfExport.worker";

interface PendingExportRequest {
  resolve: (res: Uint8Array) => void;
  reject: (err: Error) => void;
  onProgress?: (progress: number, stage: string) => void;
  timer?: ReturnType<typeof setTimeout>;
}

class PdfExportWorkerClient {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, PendingExportRequest> = new Map();
  private reqCounter = 0;

  private isWorkerSupported(): boolean {
    return typeof window !== "undefined" && typeof Worker !== "undefined";
  }

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(
        new URL("../workers/pdfExport.worker.ts", import.meta.url),
        { type: "module" }
      );
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleError.bind(this);
    }
    return this.worker;
  }

  private handleMessage(e: MessageEvent<PdfExportWorkerMessageOut>) {
    const data = e.data;
    if (!data || !data.id) return;

    const req = this.pendingRequests.get(data.id);
    if (!req) return;

    if (data.type === "EXPORT_PROGRESS") {
      req.onProgress?.(data.progress, data.stage);
    } else if (data.type === "EXPORT_SUCCESS") {
      this.pendingRequests.delete(data.id);
      if (req.timer) clearTimeout(req.timer);
      const finalBytes = new Uint8Array(
        data.payload.pdfBuffer,
        data.payload.byteOffset,
        data.payload.byteLength
      );
      req.resolve(finalBytes);
    } else if (data.type === "EXPORT_ERROR") {
      this.pendingRequests.delete(data.id);
      if (req.timer) clearTimeout(req.timer);
      req.reject(new Error(data.error || "Failed to compile edited PDF in background worker"));
    }
  }

  private handleError(e: ErrorEvent) {
    console.error("PDF Export Web Worker error:", e);
    const errorMsg = e.message || "Background PDF export worker encountered an error";
    const error = new Error(errorMsg);

    for (const [, req] of this.pendingRequests.entries()) {
      if (req.timer) clearTimeout(req.timer);
      req.reject(error);
    }
    this.pendingRequests.clear();

    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // ignore
      }
      this.worker = null;
    }
  }

  /**
   * Compiles the edited PDF in a background Web Worker.
   * Transfers input bytes zero-copy where appropriate.
   */
  public async exportPdf(
    pdfBytes: Uint8Array,
    pages: PageState[],
    onProgress?: (progress: number, stage: string) => void
  ): Promise<Uint8Array> {
    if (!this.isWorkerSupported()) {
      throw new Error("Web Workers are not supported in this environment");
    }

    const worker = this.getWorker();
    const id = `export_${Date.now()}_${++this.reqCounter}`;

    return new Promise<Uint8Array>((resolve, reject) => {
      // 120 second timeout for very large or complex PDFs
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("PDF export timed out in background worker"));
        }
      }, 120000);

      this.pendingRequests.set(id, { resolve, reject, onProgress, timer });

      try {
        // Slice a copy of the buffer to transfer cleanly to worker
        const bufferCopy = pdfBytes.buffer.slice(
          pdfBytes.byteOffset,
          pdfBytes.byteOffset + pdfBytes.byteLength
        );

        const request: PdfExportWorkerMessageIn = {
          id,
          type: "EXPORT_PDF",
          payload: {
            pdfBuffer: bufferCopy,
            pages,
          },
        };

        worker.postMessage(request, [bufferCopy]);
      } catch (err) {
        this.pendingRequests.delete(id);
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  /**
   * Cleanly terminate the worker to release memory
   */
  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}

export const pdfExportWorkerClient = new PdfExportWorkerClient();
