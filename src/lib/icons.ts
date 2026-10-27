/**
 * Hand-rolled 24x24 stroke icons, same set and weight as drivedesk: path data
 * only, no icon package, one 1.8px stroke everywhere.
 */
export const ICONS: Record<string, string> = {
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  download: "M12 3v12M7 11l5 5 5-5M5 21h14",
  upload: "M12 17V5M7 9l5-5 5 5M5 21h14",
  refresh: "M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6",
  plus: "M12 5v14M5 12h14",
  "folder-plus": "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 11v6M9 14h6",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  file: "M6 3h8l4 4v14H6zM14 3v4h4",
  image: "M4 5h16v14H4zM8 11a1.4 1.4 0 1 0 0-2.8A1.4 1.4 0 0 0 8 11zM4 16l4-4 3 3 3-3 6 6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  trash: "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6",
  settings:
    "M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.05A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.05A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3.05V3a2 2 0 1 1 4 0v.05A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.05a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.05a1.7 1.7 0 0 0-1.55 1z",
  x: "M6 6l12 12M18 6L6 18",
  check: "M4 12l5 5L20 6",
  alert: "M12 3l9 16H3zM12 9v5M12 17h.01",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01",
  spinner: "M12 3a9 9 0 1 0 9 9",
  "chevron-right": "M9 6l6 6-6 6",
  "chevron-down": "M6 9l6 6 6-6",
  "chevron-left": "M15 6l-6 6 6 6",
  "arrow-left": "M19 12H5M11 6l-6 6 6 6",
  "arrow-right": "M5 12h14M13 6l6 6-6 6",
  "arrow-up": "M12 19V5M6 11l6-6 6 6",
  "arrow-down": "M12 5v14M6 13l6 6 6-6",
  "panel-right": "M3 4h18v16H3zM15 4v16",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  copy: "M9 9h10v12H9zM5 15V3h10",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  eye: "M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  cpu: "M7 7h10v10H7zM10 3v2M14 3v2M10 19v2M14 19v2M3 10h2M3 14h2M19 10h2M19 14h2",
  palette:
    "M12 21a9 9 0 1 1 0-18c5 0 9 3.6 9 8 0 2.5-2 4-4 4h-2a2 2 0 0 0-1 3.7c.4.7-.2 2.3-2 2.3zM7.5 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM11 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM15.5 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  lock: "M6 11h12v9H6zM9 11V8a3 3 0 0 1 6 0v3",
  gauge: "M12 14l4-4M4 19a9 9 0 1 1 16 0z",
  sliders: "M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6",
};
