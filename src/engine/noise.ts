/**
 * Ruido y rango dinámico en función del ISO para un sensor full frame moderno.
 * El rango dinámico se interpola en escala log2(ISO); el ruido combina un término
 * de disparo (∝ √ganancia) y uno de lectura que domina en las sombras.
 */

/**
 * Rango dinámico fotográfico (PDR) en pasos de un FF moderno de 24 MP, estilo Photons to Photos
 * (curva suavizada: se omite el escalón de la doble ganancia de conversión en ISO 640).
 */
const DR_TABLE: Array<[number, number]> = [
  [100, 11.6],
  [200, 11.1],
  [400, 10.5],
  [800, 10.0],
  [1600, 9.4],
  [3200, 8.5],
  [6400, 7.5],
  [12800, 6.5],
  [25600, 5.5],
];

export function dynamicRangeStops(iso: number): number {
  const x = Math.log2(Math.max(100, iso) / 100);
  for (let i = 1; i < DR_TABLE.length; i++) {
    const [i0, d0] = DR_TABLE[i - 1]!;
    const [i1, d1] = DR_TABLE[i]!;
    const x0 = Math.log2(i0 / 100);
    const x1 = Math.log2(i1 / 100);
    if (x <= x1) return d0 + ((x - x0) / (x1 - x0)) * (d1 - d0);
  }
  return DR_TABLE[DR_TABLE.length - 1]![1];
}

/** Desviación estándar del ruido de luminancia en tonos medios (0–1 lineal en pantalla). */
export function lumaNoiseSigma(iso: number): number {
  return 0.0035 * Math.pow(Math.max(100, iso) / 100, 0.56);
}

/** Ruido cromático: casi invisible a ISO bajo, crece más rápido que el de luminancia. */
export function chromaNoiseSigma(iso: number): number {
  const g = Math.max(100, iso) / 100;
  return 0.0012 * Math.pow(g, 0.72);
}

/**
 * Factor por el que se multiplica el ruido según el brillo del píxel: las sombras son
 * mucho más ruidosas (ruido de lectura + menos señal).
 */
export function shadowNoiseGain(luma: number): number {
  const l = Math.min(1, Math.max(0, luma));
  return 0.45 + 1.35 * Math.pow(1 - l, 2);
}

/** Puntuación 0–100 de ruido percibido (0 = limpio a ISO 100, 100 = ISO 25600). */
export function noiseScore(iso: number): number {
  const x = Math.log2(Math.max(100, iso) / 100) / 8;
  return Math.round(Math.min(100, Math.max(0, Math.pow(x, 1.25) * 100)));
}

/** Generador pseudoaleatorio con semilla (mulberry32) para que el grano sea estable entre cuadros. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tabla de valores gaussianos N(0,1) precalculada (Box–Muller) para aplicar grano rápido. */
export function gaussianTable(size: number, seed = 1337): Float32Array {
  const rnd = mulberry32(seed);
  const out = new Float32Array(size);
  for (let i = 0; i < size; i += 2) {
    const u = Math.max(1e-7, rnd());
    const v = rnd();
    const r = Math.sqrt(-2 * Math.log(u));
    out[i] = r * Math.cos(2 * Math.PI * v);
    if (i + 1 < size) out[i + 1] = r * Math.sin(2 * Math.PI * v);
  }
  return out;
}
