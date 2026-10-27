import type {
  CornerStyle,
  Density,
  InspectTab,
  LayoutMode,
  Palette,
  Preferences,
  ThemeMode,
} from "@/types";

const STORAGE_KEY = "pngdesk.preferences";

export const DEFAULT_PREFERENCES: Preferences = {
  themeMode: "system",
  palette: "neutral",
  corners: "default",
  layout: "classic",
  density: "comfortable",
  quality: null,
  thorough: false,
  parallelism: 0,
  inspectTab: "compare",
  inspectOpen: true,
  dockOpen: true,
  sidebarWidth: 260,
  inspectWidth: 372,
  dockHeight: 172,
};

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function sanitizePreferences(raw: Partial<Preferences> | null | undefined): Preferences {
  const merged = { ...DEFAULT_PREFERENCES, ...(raw ?? {}) };
  const quality = typeof merged.quality === "number" && Number.isFinite(merged.quality)
    ? Math.min(100, Math.max(50, Math.round(merged.quality)))
    : null;
  return {
    themeMode: pick<ThemeMode>(merged.themeMode, ["light", "dark", "system"], "system"),
    palette: pick<Palette>(merged.palette, ["neutral", "graphite", "vscode"], "neutral"),
    corners: pick<CornerStyle>(merged.corners, ["default", "small", "none"], "default"),
    layout: pick<LayoutMode>(merged.layout, ["classic", "separated"], "classic"),
    density: pick<Density>(merged.density, ["comfortable", "compact"], "comfortable"),
    quality,
    thorough: merged.thorough === true,
    parallelism: clampNumber(merged.parallelism, 0, 8, 0),
    inspectTab: pick<InspectTab>(merged.inspectTab, ["compare", "report"], "compare"),
    inspectOpen: merged.inspectOpen !== false,
    dockOpen: merged.dockOpen !== false,
    sidebarWidth: clampNumber(merged.sidebarWidth, 220, 420, DEFAULT_PREFERENCES.sidebarWidth),
    inspectWidth: clampNumber(merged.inspectWidth, 300, 720, DEFAULT_PREFERENCES.inspectWidth),
    dockHeight: clampNumber(merged.dockHeight, 110, 360, DEFAULT_PREFERENCES.dockHeight),
  };
}

export function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return sanitizePreferences(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(preferences: Preferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // A locked-down browser without storage still gets a working session.
  }
}

/**
 * Applies theme, palette, corners and density to <html>. index.html replays the
 * same values before the first paint, from the flat keys written below.
 */
export function applyAppearance(preferences: Preferences): boolean {
  const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches === true;
  const dark = preferences.themeMode === "dark" || (preferences.themeMode === "system" && systemDark);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  for (const palette of ["graphite", "vscode"] as const) {
    root.classList.toggle(`palette-${palette}`, preferences.palette === palette);
  }
  if (preferences.corners === "default") {
    delete root.dataset.corners;
  } else {
    root.dataset.corners = preferences.corners;
  }
  root.classList.toggle("row-density-compact", preferences.density === "compact");
  try {
    localStorage.setItem("pngdesk.theme", preferences.themeMode);
    localStorage.setItem("pngdesk.palette", preferences.palette);
    localStorage.setItem("pngdesk.corners", preferences.corners);
    localStorage.setItem("pngdesk.density", preferences.density);
  } catch {
    // ignore storage failures
  }
  return dark;
}

export function watchSystemTheme(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
