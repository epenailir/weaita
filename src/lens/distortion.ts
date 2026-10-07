/**
 * Geometría vectorial para la demo de distorsión radial (Brown–Conrady, k1).
 * Coordenadas normalizadas a la semidiagonal del encuadre: r = 1 en la esquina.
 * Las rectas se subdividen y cada punto se deforma con `distortPoint`, así que una
 * línea recta solo se ve curva si la lente la curva.
 */
import { distortPoint } from '../engine';

export type P2 = readonly [number, number];

export interface FacadeCell {
  pts: P2[];
  /** Tono del cristal: 0 = oscuro, 1 = iluminado. */
  lit: boolean;
  tone: number;
}

export interface FacadeGeometry {
  /** Polígono de fondo (muro). */
  wall: P2[];
  /** Forjados horizontales (polilíneas abiertas). */
  slabs: P2[][];
  /** Montantes verticales. */
  columns: P2[][];
  /** Paños de vidrio (cerrados). */
  cells: FacadeCell[];
}

/** Semiancho y semialto del encuadre para una relación de aspecto dada. */
export function frameHalfExtents(aspect: number): { hx: number; hy: number } {
  const d = Math.hypot(aspect, 1);
  return { hx: aspect / d, hy: 1 / d };
}

/**
 * Límite de exageración para el barril. El modelo directo r' = r(1 + k1·r²) alcanza su
 * máximo (2/3)/√(−3k1); por debajo de k1 = −4/27 ≈ −0,148 ese máximo queda dentro del
 * encuadre y las esquinas se quedarían sin imagen. −0,14 mantiene la esquina cubierta.
 */
export const MIN_DEMO_K1 = -0.14;

/** Radio a partir del cual el modelo directo de barril deja de ser monótono. */
export function foldRadius(k1: number): number {
  return k1 < 0 ? 1 / Math.sqrt(-3 * k1) : Infinity;
}

const EXT_X = 1.3;
const EXT_Y = 0.95;

function hashCell(i: number, j: number): number {
  let h = Math.imul(i * 73856093, 1) ^ Math.imul(j * 19349663, 1);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Fachada de oficinas con retícula de forjados, montantes y paños de vidrio. */
export function buildFacade(): FacadeGeometry {
  const slabs: P2[][] = [];
  const columns: P2[][] = [];
  const cells: FacadeCell[] = [];
  const floorH = 0.19;
  const bay = 0.13;
  const ys: number[] = [];
  for (let y = -EXT_Y; y <= EXT_Y + 1e-9; y += floorH) ys.push(y);
  const xs: number[] = [];
  for (let x = -EXT_X; x <= EXT_X + 1e-9; x += bay) xs.push(x);
  for (const y of ys) slabs.push([[-EXT_X, y], [EXT_X, y]]);
  for (const x of xs) columns.push([[x, -EXT_Y], [x, EXT_Y]]);
  const inset = 0.024;
  for (let j = 0; j < ys.length - 1; j++) {
    for (let i = 0; i < xs.length - 1; i++) {
      const x0 = xs[i]! + inset;
      const x1 = xs[i + 1]! - inset;
      const y0 = ys[j]! + inset * 1.6;
      const y1 = ys[j + 1]! - inset;
      const h = hashCell(i, j);
      cells.push({ pts: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], lit: h < 0.14, tone: hashCell(j + 31, i + 7) });
    }
  }
  return {
    wall: [[-EXT_X, -EXT_Y], [EXT_X, -EXT_Y], [EXT_X, EXT_Y], [-EXT_X, EXT_Y]],
    slabs,
    columns,
    cells,
  };
}

/** Subdivide una polilínea para que ningún tramo supere `maxSeg`. */
export function subdivide(pts: readonly P2[], closed: boolean, maxSeg = 0.025): P2[] {
  const out: P2[] = [];
  const n = pts.length;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % n]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.max(1, Math.ceil(len / maxSeg));
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  if (!closed) {
    const last = pts[n - 1];
    if (last) out.push(last);
  }
  return out;
}

/** Deforma una polilínea ya subdividida. */
export function distortPoints(pts: readonly P2[], k1: number): P2[] {
  if (k1 === 0) return pts.slice();
  return pts.map(([x, y]) => distortPoint(x, y, k1));
}

/** Convierte puntos normalizados en un atributo `d` de SVG. */
export function toPath(pts: readonly P2[], closed: boolean, map: (p: P2) => P2): string {
  let d = '';
  pts.forEach((p, i) => {
    const [x, y] = map(p);
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return closed ? `${d}Z` : d;
}
