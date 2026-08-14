import type { Format, ConvertErrorCode } from "@firecrawl/anydoc-wasm";

export interface MarkdownStats {
  characters: number;
  words: number;
  lines: number;
  estimatedTokens: number;
  headingCount: number;
  tableCount: number;
  codeBlockCount: number;
}

export interface MarkdownExportResult {
  markdown: string;
  detectedFormat?: Format;
  stats: MarkdownStats;
  sourceType: "pdf" | "document" | "web";
  pagesLabel?: string;
}

type AnydocWorkerMessageOut =
  | {
      id: string;
      type: "INIT_SUCCESS";
    }
  | {
      id: string;
      type: "CONVERT_SUCCESS";
      payload: MarkdownExportResult;
    }
  | {
      id: string;
      type: "ERROR";
      error: string;
      code?: ConvertErrorCode;
    };

interface PendingRequest {
  resolve: (res: MarkdownExportResult) => void;
  reject: (err: Error & { code?: ConvertErrorCode }) => void;
  timer?: ReturnType<typeof setTimeout>;
}

class AnydocWorkerClient {
  private worker: Worker | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private reqCounter = 0;

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(
        new URL("../workers/anydoc.worker.ts", import.meta.url),
        { type: "module" }
      );
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = this.handleError.bind(this);
    }
    return this.worker;
  }

  private handleMessage(e: MessageEvent<AnydocWorkerMessageOut>) {
    const data = e.data;
    if (!data || !data.id) return;

    const req = this.pendingRequests.get(data.id);
    if (!req) return;

    this.pendingRequests.delete(data.id);
    if (req.timer) clearTimeout(req.timer);

    if (data.type === "CONVERT_SUCCESS") {
      req.resolve(data.payload);
    } else if (data.type === "INIT_SUCCESS") {
      req.resolve(null as unknown as MarkdownExportResult);
    } else if (data.type === "ERROR") {
      const err = new Error(data.error || "Document conversion error") as Error & { code?: ConvertErrorCode };
      if (data.code) err.code = data.code;
      req.reject(err);
    }
  }

  private handleError(e: ErrorEvent) {
    console.error("Anydoc Web Worker error:", e);
    const errorMsg = e.message || "Background worker error occurred";
    const error = new Error(errorMsg) as Error & { code?: ConvertErrorCode };

    for (const [, req] of this.pendingRequests.entries()) {
      if (req.timer) clearTimeout(req.timer);
      req.reject(error);
    }
    this.pendingRequests.clear();

    // Reset worker so subsequent calls will re-instantiate cleanly
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // ignore
      }
      this.worker = null;
    }
    this.isInitialized = false;
    this.initPromise = null;
  }

  /**
   * Warms up and initializes the background worker and anydoc-wasm binary
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (!this.initPromise) {
      this.initPromise = new Promise<void>((resolve, reject) => {
        try {
          const worker = this.getWorker();
          const id = `init_${Date.now()}_${++this.reqCounter}`;
          const timer = setTimeout(() => {
            if (this.pendingRequests.has(id)) {
              this.pendingRequests.delete(id);
              reject(new Error("Worker initialization timed out"));
            }
          }, 30000);

          this.pendingRequests.set(id, {
            resolve: () => {
              this.isInitialized = true;
              resolve();
            },
            reject: (err) => {
              reject(err);
            },
            timer,
          });

          worker.postMessage({ id, type: "INIT" });
        } catch (err) {
          this.initPromise = null;
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
    }
    return this.initPromise;
  }

  /**
   * Converts document bytes to Markdown inside background worker
   */
  public async convertBytesToMarkdown(
    bytes: Uint8Array,
    fileName?: string,
    selectedPages?: number[]
  ): Promise<MarkdownExportResult> {
    const worker = this.getWorker();
    const id = `req_${Date.now()}_${++this.reqCounter}`;

    return new Promise<MarkdownExportResult>((resolve, reject) => {
      // 90 second timeout for large files
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("Document conversion timed out in background worker"));
        }
      }, 90000);

      this.pendingRequests.set(id, { resolve, reject, timer });

      try {
        worker.postMessage({
          id,
          type: "CONVERT",
          payload: {
            bytes,
            fileName,
            selectedPages,
          },
        });
      } catch (err) {
        this.pendingRequests.delete(id);
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  /**
   * Terminate worker to free memory when needed
   */
  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
    this.isInitialized = false;
    this.initPromise = null;
  }
}

export const anydocWorkerClient = new AnydocWorkerClient();
