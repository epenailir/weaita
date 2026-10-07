/**
 * Ruido de valor 1D determinista y continuo. Se evalúa en coordenadas del mundo, así que
 * una cresta montañosa es la misma vista desde cualquier posición y con cualquier focal:
 * el teleobjetivo solo muestrea un tramo más corto con más detalle.
 */

function hash(i: number, seed: number): number {
  let h = Math.imul(i | 0, 374761393) ^ Math.imul(seed | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Ruido de valor suavizado (interpolación quíntica), rango 0–1. */
export function valueNoise1D(x: number, seed: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash(i, seed);
  const b = hash(i + 1, seed);
  const t = f * f * f * (f * (f * 6 - 15) + 10);
  return a + (b - a) * t;
}

/** Suma fractal de octavas, normalizada a 0–1. */
export function fbm1D(x: number, seed: number, octaves = 6, gain = 0.5, lacunarity = 2.03): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let freq = 1;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise1D(x * freq, seed + o * 101);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/** Variante «ridged»: crestas afiladas, típica de cordilleras. Rango 0–1. */
export function ridged1D(x: number, seed: number, octaves = 6, gain = 0.5, lacunarity = 2.07): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let freq = 1;
  for (let o = 0; o < octaves; o++) {
    const n = 1 - Math.abs(2 * valueNoise1D(x * freq, seed + o * 131) - 1);
    sum += amp * n * n;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/** Generador pseudoaleatorio con semilla (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
