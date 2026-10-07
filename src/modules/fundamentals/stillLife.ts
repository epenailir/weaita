/**
 * Bodegón procedural en luz lineal (radiancia relativa de escena) para las demos de
 * balance de blancos y RAW vs. JPEG. 0.18 = gris medio; la ventana supera 1.0 a propósito
 * (altas luces que un JPEG quema y un RAW todavía conserva).
 */
import { mulberry32 } from '../../engine';

export interface LinearImage {
  width: number;
  height: number;
  /** RGB lineal intercalado, 3 floats por píxel. */
  data: Float32Array;
}

type RGB = [number, number, number];

/** sRGB (0–1) → lineal. */
export function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Lineal → sRGB (0–1), sin recortar. */
export function toSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [toLinear(((n >> 16) & 255) / 255), toLinear(((n >> 8) & 255) / 255), toLinear((n & 255) / 255)];
};

/** Parches inspirados en una carta de color (valores sRGB aproximados). */
const PATCHES: RGB[] = [
  '#735244', '#c29682', '#627a9d', '#576c43', '#8580b1', '#67bdaa',
  '#d67e2c', '#505ba6', '#c15a63', '#5e3c6c', '#9dbc40', '#e0a32e',
].map(hex);

const GRAYS: number[] = [0.9, 0.59, 0.36, 0.19, 0.09, 0.031];

export function renderStillLife(width: number, height: number, seed = 7): LinearImage {
  const data = new Float32Array(width * height * 3);
  const rnd = mulberry32(seed);
  const set = (x: number, y: number, c: RGB, k = 1) => {
    const i = (y * width + x) * 3;
    data[i] = c[0] * k;
    data[i + 1] = c[1] * k;
    data[i + 2] = c[2] * k;
  };

  const wall = hex('#b9b2a6');
  const table = hex('#6b4a33');
  const tableTop = Math.round(height * 0.68);
  const winX0 = Math.round(width * 0.62);
  const winX1 = Math.round(width * 0.95);
  const winY0 = Math.round(height * 0.06);
  const winY1 = Math.round(height * 0.5);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const v = y / height;
      if (y >= tableTop) {
        // Mesa de madera con vetas y luz que cae desde la ventana
        const grain = 0.85 + 0.15 * Math.sin(u * 60 + Math.sin(v * 30) * 2) + (rnd() - 0.5) * 0.04;
        const light = 0.55 + 0.6 * Math.max(0, 1 - Math.abs(u - 0.75) * 1.6) * (1 - (v - 0.68) * 1.2);
        set(x, y, table, grain * light);
      } else if (x >= winX0 && x <= winX1 && y >= winY0 && y <= winY1) {
        // Ventana: cielo muy brillante con marco
        const frame = Math.abs(x - (winX0 + winX1) / 2) < 3 || Math.abs(y - (winY0 + winY1) / 2) < 3;
        if (frame) set(x, y, hex('#e8e4dc'), 0.9);
        else {
          const sky: RGB = [0.62, 0.78, 1.0];
          const k = 2.6 + 1.6 * (1 - (y - winY0) / (winY1 - winY0)) + (u - 0.62) * 1.5;
          set(x, y, sky, k);
        }
      } else {
        // Pared con degradado de luz lateral
        const d = Math.hypot(u - 0.78, v - 0.28);
        const light = 0.42 + 0.95 * Math.exp(-d * 2.2);
        set(x, y, wall, light * (0.97 + (rnd() - 0.5) * 0.02));
      }
    }
  }

  // Carta gris/blanca de pie sobre la mesa
  const cardX0 = Math.round(width * 0.07);
  const cardY0 = Math.round(height * 0.2);
  const cell = Math.max(6, Math.round(width * 0.055));
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 6; c++) {
      const color: RGB = r < 2 ? (PATCHES[r * 6 + c] as RGB) : [GRAYS[c] as number, GRAYS[c] as number, GRAYS[c] as number];
      for (let y = 0; y < cell - 2; y++) {
        for (let x = 0; x < cell - 2; x++) {
          const px = cardX0 + c * cell + x;
          const py = cardY0 + r * cell + y;
          if (px < width && py < height) set(px, py, color, 1.05);
        }
      }
    }
  }
  // Marco negro de la carta
  const cw = cell * 6;
  const ch = cell * 3;
  for (let y = cardY0 - 4; y < cardY0 + ch + 2; y++) {
    for (let x = cardX0 - 4; x < cardX0 + cw + 2; x++) {
      const inside = x >= cardX0 && x < cardX0 + cw - 2 && y >= cardY0 && y < cardY0 + ch - 2;
      if (!inside && x >= 0 && y >= 0 && x < width && y < height) set(x, y, [0.02, 0.02, 0.02]);
    }
  }

  // Jarrón blanco (cilindro iluminado de lado) y naranja
  const vaseCx = width * 0.5;
  const vaseW = width * 0.09;
  const vaseTop = height * 0.38;
  for (let y = Math.round(vaseTop); y < tableTop; y++) {
    const t = (y - vaseTop) / (tableTop - vaseTop);
    const half = vaseW * (0.65 + 0.35 * Math.sin(t * Math.PI));
    for (let x = Math.round(vaseCx - half); x <= Math.round(vaseCx + half); x++) {
      const nx = (x - vaseCx) / half;
      const shade = 0.25 + 0.85 * Math.max(0, 0.35 + 0.65 * nx) ;
      if (x >= 0 && x < width) set(x, y, [0.86, 0.86, 0.84], shade * 1.25);
    }
  }
  const orangeCx = width * 0.36;
  const orangeR = height * 0.075;
  const orangeCy = tableTop - orangeR * 0.95;
  for (let y = Math.round(orangeCy - orangeR); y <= Math.round(orangeCy + orangeR); y++) {
    for (let x = Math.round(orangeCx - orangeR); x <= Math.round(orangeCx + orangeR); x++) {
      const dx = (x - orangeCx) / orangeR;
      const dy = (y - orangeCy) / orangeR;
      const r2 = dx * dx + dy * dy;
      if (r2 > 1 || x < 0 || y < 0 || x >= width || y >= height) continue;
      const nz = Math.sqrt(1 - r2);
      const lambert = Math.max(0, 0.6 * dx * 0.7 + 0.55 * -dy * 0.3 + 0.75 * nz);
      set(x, y, hex('#e07a1f'), 0.15 + lambert * 1.1);
    }
  }

  return { width, height, data };
}
