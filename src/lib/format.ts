const COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function compareNames(a: string, b: string): number {
  return COLLATOR.compare(a, b);
}

export function formatBytes(bytes: number | undefined | null): string {
  if (bytes === undefined || bytes === null || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

/** Negative numbers are a cost, positive a gain, as the table shows them. */
export function formatDelta(percent: number): string {
  const rounded = Math.round(percent);
  return `${rounded > 0 ? "−" : rounded < 0 ? "+" : "±"}${Math.abs(rounded)}%`;
}

export function savingPercent(before: number, after: number): number {
  if (!before) return 0;
  return 100 * (1 - after / before);
}

export function formatMs(ms: number | undefined | null): string {
  if (ms === undefined || ms === null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const minutes = Math.floor(ms / 60_000);
  return `${minutes}m ${Math.round((ms % 60_000) / 1000)}s`;
}

export function formatSpeed(bytes: number, ms: number): string {
  if (!ms) return "—";
  const perSecond = bytes / (ms / 1000);
  return `${formatBytes(perSecond)}/s`;
}
