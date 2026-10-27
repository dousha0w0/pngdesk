import type { Report } from "@/types";
import { pngSize } from "./png";

/**
 * The browser build of pngdeer (WebAssembly + its worker glue) lives in
 * public/pngdeer, unmodified. See scripts/build-pngdeer.sh.
 */
const WORKER_URL = `${import.meta.env.BASE_URL}pngdeer/worker.js`;
/** pngdeer's own ceiling: 80–87 bytes a pixel peaks at about 3.5 GB at 40 MP. */
const MAX_PIXELS = 40e6;
/** A threaded worker that has not passed its self-test by then would hang forever. */
const READY_MS = 15_000;

export type PoolMode = "threaded" | "workers";

export interface CompressRequest {
  bytes: Uint8Array;
  /** null: pngdeer picks the quality per image. */
  target: number | null;
  /** null: pngdeer's default preview size; 0 searches at full size. */
  preview: number | null;
}

export interface CompressResponse {
  png: Uint8Array;
  report: Report;
  ms: number;
}

export type CompressErrorCode = "too_large" | "startup" | "crashed";

export class CompressError extends Error {
  constructor(
    message: string,
    readonly code: CompressErrorCode,
    readonly detail?: { width: number; height: number },
  ) {
    super(message);
    this.name = "CompressError";
  }
}

interface PendingJob {
  request: CompressRequest;
  resolve: (response: CompressResponse) => void;
  reject: (error: Error) => void;
  /** Called when a worker actually picks the job up, not when it is enqueued. */
  onStart?: () => void;
}

interface Slot {
  worker: Worker;
  busy: boolean;
  /** The job in flight, so a worker crash can fail exactly that one. */
  currentId: string | null;
}

interface WorkerReply {
  id: string;
  png?: Uint8Array;
  report?: Report;
  ms?: number;
  threaded?: boolean;
  error?: string;
}

/**
 * One job per worker, and on a cross-origin isolated page a single worker whose
 * rayon pool spreads each file over every core. Mirrors pngdeer's own page:
 * a threaded instance that never reports ready is replaced by plain workers.
 */
export class PngdeerPool {
  mode: PoolMode | null = null;
  workerCount = 0;
  error: string | null = null;
  readonly isolated = typeof self !== "undefined" && self.crossOriginIsolated === true;

  private slots: Slot[] = [];
  private queue: PendingJob[] = [];
  private pending = new Map<string, PendingJob>();
  private bootPromise: Promise<void> | null = null;
  private sequence = 0;

  constructor(
    /** How many workers to use when the threaded build is unavailable; 0 = let the pool decide. */
    private readonly preferredWorkers: () => number,
    private readonly onModeChange: (mode: PoolMode, workers: number) => void = () => {},
  ) {}

  async compress(request: CompressRequest, onStart?: () => void): Promise<CompressResponse> {
    const { width, height } = pngSize(request.bytes);
    if (width && height && width * height > MAX_PIXELS) {
      throw new CompressError(
        `${width} × ${height} px is over the ${MAX_PIXELS / 1e6} MP browser limit`,
        "too_large",
        { width, height },
      );
    }
    await this.boot();
    if (this.error) throw new CompressError(this.error, "startup");
    const { promise, resolve, reject } = Promise.withResolvers<CompressResponse>();
    this.queue.push({ request, resolve, reject, onStart });
    this.pump();
    return promise;
  }

  dispose(): void {
    for (const slot of this.slots) slot.worker.terminate();
    this.slots = [];
    for (const job of [...this.pending.values(), ...this.queue]) {
      job.reject(new CompressError("pool disposed", "crashed"));
    }
    this.pending.clear();
    this.queue = [];
  }

  private boot(): Promise<void> {
    this.bootPromise ??= this.start();
    return this.bootPromise;
  }

  private async start(): Promise<void> {
    if (typeof Worker === "undefined") {
      this.fail("Web Workers are unavailable in this browser");
      return;
    }
    if (this.isolated && (await this.startThreaded())) return;
    this.startWorkers();
  }

  /** Resolves true when the threaded worker passed its self-test and can take jobs. */
  private startThreaded(): Promise<boolean> {
    const { promise, resolve } = Promise.withResolvers<boolean>();
    const worker = new Worker(WORKER_URL, { type: "module" });
    let settled = false;
    const giveUp = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      worker.terminate();
      resolve(false);
    };
    const timer = window.setTimeout(giveUp, READY_MS);
    worker.onmessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type !== "ready" || settled) return;
      settled = true;
      window.clearTimeout(timer);
      this.mode = "threaded";
      this.workerCount = 1;
      const slot: Slot = { worker, busy: false, currentId: null };
      this.slots = [slot];
      this.listen(slot);
      this.onModeChange(this.mode, this.workerCount);
      this.pump();
      resolve(true);
    };
    worker.onerror = (event) => {
      // A module that will not load cannot self-test either; plain workers may still work.
      event.preventDefault();
      giveUp();
    };
    return promise;
  }

  private startWorkers(): void {
    const cores = navigator.hardwareConcurrency || 4;
    const wanted = this.preferredWorkers() || Math.min(4, Math.max(1, cores - 1));
    const count = Math.min(8, Math.max(1, wanted));
    this.slots = Array.from({ length: count }, () => {
      const slot: Slot = {
        worker: new Worker(`${WORKER_URL}?single`, { type: "module" }),
        busy: false,
        currentId: null,
      };
      this.listen(slot);
      return slot;
    });
    this.mode = "workers";
    this.workerCount = count;
    this.onModeChange(this.mode, this.workerCount);
    this.pump();
  }

  private listen(slot: Slot): void {
    slot.worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      const data = event.data;
      if (!data || typeof data.id !== "string") return;
      const job = this.pending.get(data.id);
      this.pending.delete(data.id);
      slot.busy = false;
      slot.currentId = null;
      if (job) {
        if (data.error || !data.png || !data.report) {
          job.reject(new CompressError(data.error ?? "the compressor returned no image", "crashed"));
        } else {
          job.resolve({ png: data.png, report: data.report, ms: data.ms ?? 0 });
        }
      }
      this.pump();
    };
    slot.worker.onerror = (event) => {
      event.preventDefault();
      const failed = slot.currentId ? this.pending.get(slot.currentId) : undefined;
      if (slot.currentId) this.pending.delete(slot.currentId);
      failed?.reject(new CompressError(event.message || "the compressor crashed", "crashed"));
      this.slots = this.slots.filter((candidate) => candidate !== slot);
      slot.worker.terminate();
      if (this.slots.length === 0) {
        this.fail(event.message || "the compressor crashed");
      } else {
        this.pump();
      }
    };
  }

  private pump(): void {
    for (const slot of this.slots) {
      if (slot.busy) continue;
      const job = this.queue.shift();
      if (!job) return;
      const id = `job-${++this.sequence}`;
      slot.busy = true;
      slot.currentId = id;
      this.pending.set(id, job);
      job.onStart?.();
      const message: Record<string, unknown> = { id, bytes: job.request.bytes };
      if (job.request.target !== null) message.target = job.request.target;
      if (job.request.preview !== null) message.preview = job.request.preview;
      slot.worker.postMessage(message);
    }
  }

  private fail(message: string): void {
    this.error = message;
    for (const job of [...this.pending.values(), ...this.queue]) {
      job.reject(new CompressError(message, "startup"));
    }
    this.pending.clear();
    this.queue = [];
  }
}
