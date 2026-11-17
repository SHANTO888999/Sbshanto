import { DEFAULT_ACCENT_COLOR, sanitizeHexColor } from '../data/contentSchema';

export interface AccentPreset {
  name: string;
  hex: string;
}

export const ACCENT_PRESETS: ReadonlyArray<AccentPreset> = [
  { name: 'Crimson Red', hex: '#DC2626' },
  { name: 'Royal Purple', hex: '#9333EA' },
  { name: 'Emerald Green', hex: '#10B981' },
  { name: 'Solar Gold', hex: '#F59E0B' },
  { name: 'Electric Cyan', hex: '#06B6D4' },
  { name: 'Magenta Rose', hex: '#E11D48' },
];

export interface ComputedAccentPalette {
  primary: string;
  light: string;
  dark: string;
  rgb: string;
  r: number;
  g: number;
  b: number;
}

function clampChannel(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function toHexByte(n: number): string {
  return clampChannel(n).toString(16).padStart(2, '0').toUpperCase();
}

export function computeAccentPalette(rawHex?: string): ComputedAccentPalette {
  const primary = sanitizeHexColor(rawHex, DEFAULT_ACCENT_COLOR);
  const r = parseInt(primary.slice(1, 3), 16);
  const g = parseInt(primary.slice(3, 5), 16);
  const b = parseInt(primary.slice(5, 7), 16);

  // Lighten ~22% toward white for crisp highlights/links on dark surfaces
  const lr = clampChannel(r + (255 - r) * 0.24);
  const lg = clampChannel(g + (255 - g) * 0.24);
  const lb = clampChannel(b + (255 - b) * 0.24);
  const light = `#${toHexByte(lr)}${toHexByte(lg)}${toHexByte(lb)}`;

  // Darken ~18% toward black for hover states
  const dr = clampChannel(r * 0.82);
  const dg = clampChannel(g * 0.82);
  const db = clampChannel(b * 0.82);
  const dark = `#${toHexByte(dr)}${toHexByte(dg)}${toHexByte(db)}`;

  return {
    primary,
    light,
    dark,
    rgb: `${r}, ${g}, ${b}`,
    r,
    g,
    b,
  };
}

export function applyDocumentAccentTheme(rawHex?: string): ComputedAccentPalette {
  const palette = computeAccentPalette(rawHex);
  if (typeof document !== 'undefined') {
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--accent-primary', palette.primary);
    rootStyle.setProperty('--accent-light', palette.light);
    rootStyle.setProperty('--accent-dark', palette.dark);
    rootStyle.setProperty('--accent-rgb', palette.rgb);
  }
  return palette;
}
