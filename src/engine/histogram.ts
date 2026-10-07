import type { Histogram } from './types';

export const HISTOGRAM_BINS = 64;

/**
 * Histograma RGB + luminancia a partir de los píxeles de un canvas.
 * `step` muestrea uno de cada n píxeles para que el cálculo sea barato en cada cuadro.
 */
export function computeHistogram(data: Uint8ClampedArray, step = 3): Histogram {
  const bins = HISTOGRAM_BINS;
  const r = new Float32Array(bins);
  const g = new Float32Array(bins);
  const b = new Float32Array(bins);
  const l = new Float32Array(bins);
  let total = 0;
  let hi = 0;
  let lo = 0;
  const stride = 4 * Math.max(1, Math.floor(step));
  for (let i = 0; i < data.length; i += stride) {
    const R = data[i]!;
    const G = data[i + 1]!;
    const B = data[i + 2]!;
    const L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    r[(R * bins) >> 8]! += 1;
    g[(G * bins) >> 8]! += 1;
    b[(B * bins) >> 8]! += 1;
    l[Math.min(bins - 1, (L * bins) >> 8)]! += 1;
    if (R >= 253 || G >= 253 || B >= 253) hi++;
    if (L <= 3) lo++;
    total++;
  }
  // Normalización con raíz para que picos extremos no aplasten el resto de la curva
  let max = 1;
  for (let i = 0; i < bins; i++) max = Math.max(max, r[i]!, g[i]!, b[i]!, l[i]!);
  const norm = (arr: Float32Array) => {
    for (let i = 0; i < bins; i++) arr[i] = Math.sqrt(arr[i]! / max);
  };
  norm(r);
  norm(g);
  norm(b);
  norm(l);
  return {
    r,
    g,
    b,
    l,
    clippedHighlightsPct: total ? (hi / total) * 100 : 0,
    clippedShadowsPct: total ? (lo / total) * 100 : 0,
  };
}

export function emptyHistogram(): Histogram {
  return {
    r: new Float32Array(HISTOGRAM_BINS),
    g: new Float32Array(HISTOGRAM_BINS),
    b: new Float32Array(HISTOGRAM_BINS),
    l: new Float32Array(HISTOGRAM_BINS),
    clippedHighlightsPct: 0,
    clippedShadowsPct: 0,
  };
}
