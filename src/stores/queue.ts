import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { Job, SortDirection, SortKey, ViewKind } from "@/types";
import { CompressError, PngdeerPool, type PoolMode } from "@/lib/pool";
import { isPng, paletteOf, pngSize } from "@/lib/png";
import { compareNames, savingPercent } from "@/lib/format";
import { t } from "@/i18n";
import { useUiStore } from "./ui";

const SAMPLES = ["sun-poster.png", "kodim01.png", "cup-of-tea.png", "openmoji-1f431.png", "pngdeer@2x.png"];

function resultBytes(job: Job): number | null {
  return job.png ? job.png.byteLength : null;
}

function metric(job: Job, key: SortKey): number | null {
  switch (key) {
    case "original":
      return job.bytes.byteLength;
    case "result":
      return resultBytes(job);
    case "saved":
      return job.png ? savingPercent(job.bytes.byteLength, job.png.byteLength) : null;
    case "score":
      return job.report ? job.report.score : null;
    default:
      return null;
  }
}

export const useQueueStore = defineStore("queue", () => {
  const ui = useUiStore();

  const jobs = ref<Job[]>([]);
  const selection = ref<number[]>([]);
  /** The job the details panel follows. */
  const activeId = ref<number | null>(null);
  const filter = ref("");
  const view = ref<ViewKind>("all");
  const sortKey = ref<SortKey>("name");
  const sortDirection = ref<SortDirection>("asc");

  const mode = ref<PoolMode | null>(null);
  const workerCount = ref(0);
  const poolError = ref<string | null>(null);
  const isolated = typeof self !== "undefined" && self.crossOriginIsolated === true;

  /** Ticks while anything runs, so elapsed times move without a per-row timer. */
  const now = ref(Date.now());
  let clock: number | null = null;
  let sequence = 0;
  let pool: PngdeerPool | null = null;

  function ensurePool(): PngdeerPool {
    pool ??= new PngdeerPool(
      () => ui.prefs.parallelism,
      (nextMode, workers) => {
        mode.value = nextMode;
        workerCount.value = workers;
      },
    );
    return pool;
  }

  function syncClock(): void {
    const busy = jobs.value.some((job) => job.status === "queued" || job.status === "running");
    if (busy && clock === null) {
      clock = window.setInterval(() => (now.value = Date.now()), 250);
    } else if (!busy && clock !== null) {
      window.clearInterval(clock);
      clock = null;
    }
  }

  function failureText(job: Job, caught: unknown): { message: string; fatal: boolean } {
    if (caught instanceof CompressError) {
      if (caught.code === "startup") {
        poolError.value = caught.message;
        return { message: t("toast.poolError", { error: caught.message }), fatal: true };
      }
      if (caught.code === "too_large") {
        // Not fatal for the pool, but the file will never compress: say so once.
        return {
          message: t("toast.tooLarge", {
            name: job.name,
            width: caught.detail?.width ?? job.width,
            height: caught.detail?.height ?? job.height,
          }),
          fatal: true,
        };
      }
    }
    const message = caught instanceof Error ? caught.message : String(caught);
    return { message: t("toast.failed", { name: job.name, error: message }), fatal: false };
  }

  async function run(job: Job): Promise<void> {
    job.status = "queued";
    job.startedAt = undefined;
    job.endedAt = undefined;
    job.error = undefined;
    syncClock();
    try {
      const result = await ensurePool().compress(
        { bytes: job.bytes, target: ui.prefs.quality, preview: ui.prefs.thorough ? 0 : null },
        () => {
          job.status = "running";
          job.startedAt = Date.now();
          syncClock();
        },
      );
      job.png = result.png;
      job.report = result.report;
      job.ms = result.ms;
      job.endedAt = Date.now();
      job.palette = paletteOf(result.png);
      job.resultUrl = URL.createObjectURL(new Blob([result.png.buffer as ArrayBuffer], { type: "image/png" }));
      job.status = "done";
      poolError.value = null;
    } catch (caught) {
      job.status = "error";
      job.endedAt = Date.now();
      const failure = failureText(job, caught);
      job.error = failure.message;
      if (failure.fatal) ui.toast(failure.message, "error");
    } finally {
      syncClock();
    }
  }

  function addJob(name: string, bytes: Uint8Array, sourceUrl: string): Job {
    const { width, height } = pngSize(bytes);
    const job: Job = {
      id: ++sequence,
      name,
      bytes,
      sourceUrl,
      width,
      height,
      status: "queued",
      palette: [],
    };
    jobs.value.push(job);
    // The array hands back the reactive proxy; the object pushed above stays raw, and
    // mutating it afterwards would never re-render the table.
    const stored = jobs.value[jobs.value.length - 1];
    if (!stored) return job;
    if (activeId.value === null) activeId.value = stored.id;
    void run(stored);
    return stored;
  }

  async function addFiles(files: Iterable<File>): Promise<void> {
    let added = 0;
    let skipped = 0;
    for (const file of Array.from(files)) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!isPng(bytes)) {
        skipped += 1;
        continue;
      }
      addJob(file.name, bytes, URL.createObjectURL(file));
      added += 1;
    }
    if (added) ui.toast(t("toast.added", { n: added }, added), "success");
    if (skipped) ui.toast(t("toast.skipped", { n: skipped }, skipped), "info");
  }

  async function loadSamples(): Promise<void> {
    for (const name of SAMPLES) {
      const response = await fetch(`${import.meta.env.BASE_URL}samples/${name}`);
      if (!response.ok) continue;
      const blob = await response.blob();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      addJob(name, bytes, URL.createObjectURL(blob));
    }
  }

  function retry(job: Job): void {
    if (job.status !== "done" && job.status !== "error") return;
    void run(job);
  }

  function recompressAll(): void {
    const candidates = jobs.value.filter((job) => job.status === "done" || job.status === "error");
    for (const job of candidates) {
      if (job.resultUrl) URL.revokeObjectURL(job.resultUrl);
      job.png = undefined;
      job.resultUrl = undefined;
      job.report = undefined;
      job.palette = [];
      job.status = "queued";
      void run(job);
    }
    if (candidates.length) ui.toast(t("toast.recompressed", { n: candidates.length }, candidates.length), "info");
  }

  function remove(ids: number[]): void {
    const removed = new Set(ids);
    jobs.value = jobs.value.filter((job) => {
      if (!removed.has(job.id)) return true;
      URL.revokeObjectURL(job.sourceUrl);
      if (job.resultUrl) URL.revokeObjectURL(job.resultUrl);
      return false;
    });
    selection.value = selection.value.filter((id) => !removed.has(id));
    if (activeId.value !== null && removed.has(activeId.value)) {
      activeId.value = selection.value.at(-1) ?? jobs.value[0]?.id ?? null;
    }
    if (removed.size) ui.toast(t("toast.removed", { n: removed.size }, removed.size), "info");
  }

  function clearFinished(): void {
    remove(jobs.value.filter((job) => job.status === "done" || job.status === "error").map((job) => job.id));
  }

  function download(job: Job): void {
    if (!job.resultUrl) return;
    const anchor = document.createElement("a");
    anchor.href = job.resultUrl;
    anchor.download = `${job.name.replace(/\.png$/i, "")}.min.png`;
    anchor.click();
  }

  function downloadAll(): void {
    const ready = jobs.value.filter((job) => job.status === "done");
    ready.forEach((job, index) => window.setTimeout(() => download(job), index * 250));
    if (ready.length) ui.toast(t("toast.downloaded", { n: ready.length }, ready.length), "success");
  }

  const visibleJobs = computed<Job[]>(() => {
    const needle = filter.value.trim().toLowerCase();
    const matchesView = jobs.value.filter((job) => {
      if (view.value === "active") return job.status === "queued" || job.status === "running";
      if (view.value === "done") return job.status === "done";
      if (view.value === "failed") return job.status === "error";
      return true;
    });
    const filtered = needle ? matchesView.filter((job) => job.name.toLowerCase().includes(needle)) : [...matchesView];
    const direction = sortDirection.value === "desc" ? -1 : 1;
    return filtered.sort((a, b) => {
      if (sortKey.value === "name") return compareNames(a.name, b.name) * direction;
      const left = metric(a, sortKey.value);
      const right = metric(b, sortKey.value);
      if (left === null && right === null) return compareNames(a.name, b.name);
      if (left === null) return 1;
      if (right === null) return -1;
      return (left - right) * direction;
    });
  });

  const activeJob = computed<Job | null>(() => jobs.value.find((job) => job.id === activeId.value) ?? null);

  const totals = computed(() => {
    let before = 0;
    let after = 0;
    let done = 0;
    let running = 0;
    let failed = 0;
    let doneMs = 0;
    for (const job of jobs.value) {
      if (job.status === "error") failed += 1;
      if (job.status === "running" || job.status === "queued") running += 1;
      if (job.status === "done" && job.png) {
        done += 1;
        before += job.bytes.byteLength;
        after += job.png.byteLength;
        doneMs += job.ms ?? 0;
      }
    }
    return {
      count: jobs.value.length,
      done,
      running,
      failed,
      before,
      after,
      saved: before - after,
      percent: before ? 100 * (1 - after / before) : 0,
      doneMs,
    };
  });

  const selectedJobs = computed<Job[]>(() => jobs.value.filter((job) => selection.value.includes(job.id)));

  function select(id: number, options: { toggle?: boolean; range?: boolean } = {}): void {
    const current = selection.value;
    if (options.toggle) {
      selection.value = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    } else if (options.range && current.length) {
      const anchor = current[current.length - 1];
      const order = visibleJobs.value.map((job) => job.id);
      const from = anchor === undefined ? -1 : order.indexOf(anchor);
      const to = order.indexOf(id);
      if (from >= 0 && to >= 0) {
        const [start, end] = from < to ? [from, to] : [to, from];
        selection.value = [...new Set([...current, ...order.slice(start, end + 1)])];
      }
    } else {
      selection.value = [id];
    }
    activeId.value = id;
  }

  function selectAll(): void {
    selection.value = visibleJobs.value.map((job) => job.id);
  }

  function clearSelection(): void {
    selection.value = [];
  }

  function move(delta: number): void {
    const order = visibleJobs.value.map((job) => job.id);
    if (!order.length) return;
    const current = selection.value.at(-1);
    const index = current === undefined ? -1 : order.indexOf(current);
    const next = Math.min(order.length - 1, Math.max(0, index + delta));
    const id = order[next];
    if (id !== undefined) select(id);
  }

  function toggleSort(key: SortKey): void {
    if (sortKey.value === key) {
      sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
    } else {
      sortKey.value = key;
      sortDirection.value = key === "name" ? "asc" : "desc";
    }
  }

  function dispose(): void {
    pool?.dispose();
    pool = null;
    if (clock !== null) window.clearInterval(clock);
    clock = null;
    for (const job of jobs.value) {
      URL.revokeObjectURL(job.sourceUrl);
      if (job.resultUrl) URL.revokeObjectURL(job.resultUrl);
    }
  }

  return {
    jobs,
    selection,
    activeId,
    filter,
    view,
    sortKey,
    sortDirection,
    mode,
    workerCount,
    poolError,
    isolated,
    now,
    visibleJobs,
    activeJob,
    totals,
    selectedJobs,
    addFiles,
    loadSamples,
    retry,
    recompressAll,
    remove,
    clearFinished,
    download,
    downloadAll,
    select,
    selectAll,
    clearSelection,
    move,
    toggleSort,
    dispose,
  };
});
