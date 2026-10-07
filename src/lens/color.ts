/** Utilidades de color en RGB 0–255 para el render del laboratorio de lentes. */

export type RGB = readonly [number, number, number];

export function hex(h: string): RGB {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Interpolación lineal entre dos colores (t se recorta a 0–1). */
export function mix(a: RGB, b: RGB, t: number): RGB {
  const u = clamp01(t);
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

/** Multiplica la luminosidad (k > 1 aclara, k < 1 oscurece). */
export function shade(c: RGB, k: number): RGB {
  return [c[0] * k, c[1] * k, c[2] * k];
}

const byte = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

export function css(c: RGB, alpha = 1): string {
  if (alpha >= 1) return `rgb(${byte(c[0])},${byte(c[1])},${byte(c[2])})`;
  return `rgba(${byte(c[0])},${byte(c[1])},${byte(c[2])},${Math.max(0, alpha).toFixed(3)})`;
}

/** Interpola una tabla ordenada de pares (clave, color). */
export function sampleStops(stops: ReadonlyArray<readonly [number, RGB]>, x: number): RGB {
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (!first || !last) return [0, 0, 0];
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1]!;
    const b = stops[i]!;
    if (x <= b[0]) return mix(a[1], b[1], (x - a[0]) / (b[0] - a[0]));
  }
  return last[1];
}
