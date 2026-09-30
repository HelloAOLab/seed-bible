export type Hsv = { h: number; s: number; v: number };
export type Rgb = { r: number; g: number; b: number };

const HEX_6 = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/;
const HEX_3 = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;

/** Expand #RGB / #RRGGBB into a lowercase #RRGGBB, or null if it isn't hex. */
export function parseHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (HEX_6.test(withHash)) return withHash.toLowerCase();
  const short = withHash.match(HEX_3);
  if (short) {
    return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase();
  }
  return null;
}

/** `#rrggbb`, falling back to `#000000` when the string isn't a hex color. */
export function normalizeHex(value: string | null | undefined): string {
  return parseHex(value) ?? "#000000";
}

export function hexToRgb(hex: string): Rgb | null {
  const parsed = parseHex(hex);
  if (!parsed) return null;
  return {
    r: parseInt(parsed.slice(1, 3), 16),
    g: parseInt(parsed.slice(3, 5), 16),
    b: parseInt(parsed.slice(5, 7), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toByte = (n: number) =>
    Math.round(Math.min(255, Math.max(0, Number.isFinite(n) ? n : 0)))
      .toString(16)
      .padStart(2, "0");
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

export function rgbToHsv(r: number, g: number, b: number): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = 60 * (((gn - bn) / delta) % 6);
    } else if (max === gn) {
      h = 60 * ((bn - rn) / delta + 2);
    } else {
      h = 60 * ((rn - gn) / delta + 4);
    }
  }
  if (h < 0) h += 360;

  return {
    h,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

export function hsvToRgb(h: number, s: number, v: number): Rgb {
  const hue = Number.isFinite(h) ? ((h % 360) + 360) % 360 : 0;
  const c = v * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = v - c;

  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255,
  };
}

export function hsvToHex(hsv: Hsv): string {
  const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/**
 * Convert a hex color to HSV. Grayscale has no hue — `previousHue` is kept so
 * the hue slider doesn't jump when the user drags through white/black.
 */
export function hexToHsv(hex: string, previousHue = 0): Hsv {
  const rgb = hexToRgb(hex);
  if (!rgb) return { h: previousHue, s: 0, v: 0 };
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  if (hsv.s === 0) hsv.h = previousHue;
  return hsv;
}
