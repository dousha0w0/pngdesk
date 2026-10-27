/** One compression result, as pngdeer's `Compressed::report` hands it over. */
export interface Report {
  target: number;
  colors: number;
  variant: string;
  score: number;
  evals: number;
  checks: number;
  miss: boolean;
  preview: number;
  preview_score: number;
  ms: {
    reference: number;
    quantize: number;
    remap: number;
    score: number;
    encode: number;
    optimize: number;
  };
  outcome: "hit" | "miss" | "lossless" | "exact" | "original" | string;
  bytes: number;
}

export type JobStatus = "queued" | "running" | "done" | "error";

export interface Swatch {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Job {
  id: number;
  name: string;
  /** The file as it was picked; kept for the compare view and the byte totals. */
  bytes: Uint8Array;
  sourceUrl: string;
  width: number;
  height: number;
  status: JobStatus;
  startedAt?: number;
  endedAt?: number;
  /** Compression time reported by the worker, in ms. */
  ms?: number;
  png?: Uint8Array;
  resultUrl?: string;
  report?: Report;
  palette: Swatch[];
  error?: string;
}

export type ViewKind = "all" | "active" | "done" | "failed";
export type SortKey = "name" | "original" | "result" | "saved" | "score";
export type SortDirection = "asc" | "desc";

export type ThemeMode = "light" | "dark" | "system";
export type Palette = "neutral" | "graphite" | "vscode";
export type CornerStyle = "default" | "small" | "none";
export type LayoutMode = "classic" | "separated";
export type Density = "comfortable" | "compact";
export type InspectTab = "compare" | "report";
export type Locale = "zh-CN" | "en";

export interface Preferences {
  themeMode: ThemeMode;
  palette: Palette;
  corners: CornerStyle;
  layout: LayoutMode;
  density: Density;
  /** null = pngdeer picks the quality per image. */
  quality: number | null;
  /** Search at full size instead of on a downscaled preview (slower, finer on big images). */
  thorough: boolean;
  /** Worker count for the single-threaded build; 0 = as many as the machine suggests. */
  parallelism: number;
  inspectTab: InspectTab;
  inspectOpen: boolean;
  dockOpen: boolean;
  sidebarWidth: number;
  inspectWidth: number;
  dockHeight: number;
}
