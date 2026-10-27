import type { Swatch } from "@/types";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Cheap check before anything is decoded or queued. */
export function isPng(bytes: Uint8Array): boolean {
  return bytes.length > 8 && PNG_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

/** Width and height straight out of IHDR, which always follows the signature. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } {
  if (bytes.length < 24) return { width: 0, height: 0 };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/**
 * The PLTE (and tRNS) entries of a palette PNG, lightest first; [] for any
 * other PNG. Same walk pngdeer's own page uses to show the chosen palette.
 */
export function paletteOf(bytes: Uint8Array): Swatch[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let position = 8;
  let rgb: Uint8Array | null = null;
  let alpha: Uint8Array | null = null;
  while (position + 8 <= bytes.length) {
    const length = view.getUint32(position);
    const type = String.fromCharCode(...bytes.subarray(position + 4, position + 8));
    if (type === "PLTE") rgb = bytes.subarray(position + 8, position + 8 + length);
    if (type === "tRNS") alpha = bytes.subarray(position + 8, position + 8 + length);
    position += 12 + length;
  }
  if (!rgb) return [];
  const swatches: (Swatch & { l: number })[] = [];
  for (let i = 0; i < Math.floor(rgb.length / 3); i++) {
    const r = rgb[i * 3] ?? 0;
    const g = rgb[i * 3 + 1] ?? 0;
    const b = rgb[i * 3 + 2] ?? 0;
    const a = alpha && i < alpha.length ? (alpha[i] ?? 255) : 255;
    if (a > 0) swatches.push({ r, g, b, a, l: 0.2126 * r + 0.7152 * g + 0.0722 * b });
  }
  return swatches.sort((x, y) => y.l - x.l).map(({ r, g, b, a }) => ({ r, g, b, a }));
}
