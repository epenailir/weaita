/**
 * Revelado de la imagen simulada: convierte la escena (base difusa sRGB + búfer emisivo lineal)
 * en la foto que produciría la cámara con los ajustes dados.
 *
 *  1. Decodifica a luz lineal (LUT sRGB → lineal) y suma las fuentes de luz (HDR).
 *  2. Multiplica por 2^desvío de exposición y por la dominante de color del balance de blancos.
 *  3. Viñeteo óptico (separable) que depende de la apertura.
 *  4. Rango dinámico: por debajo de 2^−DR la señal se hunde en negro (pie suave).
 *  5. Rodilla suave y recorte a blanco por encima de 1.0.
 *  6. Codifica a sRGB, desatura levemente a ISO alto y agrega ruido de luminancia y crominancia.
 *  Después: histograma (motor) y superposiciones de zebras y focus peaking.
 */
import { chromaNoiseSigma, dynamicRangeStops, gaussianTable, lumaNoiseSigma, noiseScore, shadowNoiseGain } from '../engine/noise';

/** Tamaño de la tabla gaussiana compartida (potencia de 2 para indexar con máscara). */
const GAUSS_BITS = 20;
const GAUSS_MASK = (1 << GAUSS_BITS) - 1;
let gaussCache: Float32Array | null = null;
function gauss(): Float32Array {
  if (!gaussCache) gaussCache = gaussianTable(1 << GAUSS_BITS, 90210);
  return gaussCache;
}

/** sRGB (0–255) → lineal (0–1). */
export const SRGB_TO_LINEAR: Float32Array = (() => {
  const t = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    t[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  return t;
})();

export function linearToSrgb(l: number): number {
  const c = l <= 0 ? 0 : l >= 1 ? 1 : l;
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/** Hash entero rápido (para desplazar el ruido por fila y por cuadro). */
function hash32(x: number): number {
  let h = x | 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
}

/** La curva tonal cubre luz lineal en [0, TONE_MAX); por encima todo es blanco. */
const TONE_MAX = 1.25;
const TONE_N = 16384;
const TONE_SCALE = TONE_N / TONE_MAX;
/** La rodilla empieza en KNEE y llega a blanco puro en 2 − KNEE con derivada continua. */
const KNEE = 0.8;

export interface ToneParams {
  /** 2^desvío de exposición (1 = exposición correcta del sujeto). */
  gain: number;
  /** Multiplicadores lineales por canal del balance de blancos. */
  cast: readonly [number, number, number];
  iso: number;
  /** Número f (para el viñeteo). */
  aperture: number;
  /** Semilla del grano: fija si la vista está quieta, cambia por cuadro en vivo. */
  noiseSeed: number;
}

export interface OverlayParams {
  zebras: boolean;
  /** Fase (px) de las franjas para animarlas. */
  zebraPhase: number;
  /** Máscara RGBA (canal R) con 255 donde la capa visible está dentro de la PdC; null = sin peaking. */
  peakingMask: Uint8ClampedArray | null;
}

export class ToneMapper {
  private toneLut = new Float32Array(TONE_N + 1);
  private toneKey = '';
  private noiseGainLut = new Float32Array(256);
  private vx = new Float32Array(0);
  private vy = new Float32Array(0);
  private vKey = '';
  private chromaU = new Float32Array(0);
  private chromaV = new Float32Array(0);
  private rowU = new Float32Array(0);
  private rowV = new Float32Array(0);
  /** Luminancia previa al ruido (para el focus peaking). */
  private luma = new Uint8Array(0);
  /** Píxeles quemados (para las zebras). */
  private clipped = new Uint8Array(0);

  constructor() {
    for (let i = 0; i < 256; i++) this.noiseGainLut[i] = shadowNoiseGain(i / 255);
  }

  /** Curva: pie por rango dinámico + rodilla + codificación sRGB, a valores 0–255 en coma flotante. */
  private buildTone(drStops: number): void {
    const key = drStops.toFixed(3);
    if (key === this.toneKey) return;
    this.toneKey = key;
    const floor = Math.pow(2, -drStops);
    const hi = 2 - KNEE;
    for (let i = 0; i <= TONE_N; i++) {
      let l = i / TONE_SCALE;
      // Pie: l²/(l + piso) ≈ l − piso en tonos medios; por debajo del piso la señal desaparece.
      l = (l * l) / (l + floor);
      if (l > KNEE) l = l >= hi ? 1 : l - ((l - KNEE) * (l - KNEE)) / (2 * (hi - KNEE));
      this.toneLut[i] = linearToSrgb(l) * 255;
    }
  }

  /** Viñeteo separable: factor = 2^(−pasos·r²) = vx[x]·vy[y], con r normalizado a la semidiagonal. */
  private buildVignette(w: number, h: number, aperture: number): void {
    // Caída en las esquinas (en pasos): ~1 paso a f/1.4, desaparece hacia f/4; queda un mínimo natural.
    const stops = 0.12 + Math.max(0, 0.95 * (1 - Math.log2(aperture / 1.4) / 1.5));
    const key = `${w}x${h}|${stops.toFixed(3)}`;
    if (key === this.vKey) return;
    this.vKey = key;
    if (this.vx.length !== w) this.vx = new Float32Array(w);
    if (this.vy.length !== h) this.vy = new Float32Array(h);
    const hd2 = (w * w + h * h) / 4;
    for (let x = 0; x < w; x++) {
      const d = x + 0.5 - w / 2;
      this.vx[x] = Math.pow(2, (-stops * d * d) / hd2);
    }
    for (let y = 0; y < h; y++) {
      const d = y + 0.5 - h / 2;
      this.vy[y] = Math.pow(2, (-stops * d * d) / hd2);
    }
  }

  /** Campo de ruido cromático de baja frecuencia (celdas de 3 px interpoladas). */
  private buildChroma(w: number, h: number, seed: number): { gw: number } {
    const cell = 3;
    const gw = Math.ceil(w / cell) + 2;
    const gh = Math.ceil(h / cell) + 2;
    if (this.chromaU.length !== gw * gh) {
      this.chromaU = new Float32Array(gw * gh);
      this.chromaV = new Float32Array(gw * gh);
    }
    if (this.rowU.length !== gw) {
      this.rowU = new Float32Array(gw);
      this.rowV = new Float32Array(gw);
    }
    const g = gauss();
    const off = hash32(seed * 7919 + 17);
    // La interpolación bilineal reduce la varianza; se compensa para mantener sigma.
    const k = 1.55;
    for (let i = 0; i < gw * gh; i++) {
      this.chromaU[i] = g[(off + i * 2) & GAUSS_MASK]! * k;
      this.chromaV[i] = g[(off + i * 2 + 1) & GAUSS_MASK]! * k;
    }
    return { gw };
  }

  /**
   * Revela la imagen en `out` (RGBA). `base` es la escena difusa (sRGB, opaca) y `emis` las
   * fuentes de luz en lineal (puede ser null).
   */
  develop(base: Uint8ClampedArray, emis: Float32Array | null, out: Uint8ClampedArray, w: number, h: number, p: ToneParams, keepLuma: boolean): void {
    this.buildTone(dynamicRangeStops(p.iso));
    this.buildVignette(w, h, p.aperture);
    const lut = SRGB_TO_LINEAR;
    const tone = this.toneLut;
    const ng = this.noiseGainLut;
    const vx = this.vx;
    const vy = this.vy;
    const g = gauss();
    const kr = p.gain * p.cast[0] * TONE_SCALE;
    const kg = p.gain * p.cast[1] * TONE_SCALE;
    const kb = p.gain * p.cast[2] * TONE_SCALE;
    const sl = lumaNoiseSigma(p.iso) * 255;
    const sc = chromaNoiseSigma(p.iso) * 255;
    const noisy = sl > 0.6;
    const chroma = sc > 0.5;
    // ISO alto: colores apagados ("sucios") además del grano.
    const sat = 1 - 0.3 * Math.pow(noiseScore(p.iso) / 100, 1.3);
    const n = w * h;
    if (this.clipped.length !== n) this.clipped = new Uint8Array(n);
    if (keepLuma && this.luma.length !== n) this.luma = new Uint8Array(n);
    const clipped = this.clipped;
    const luma = this.luma;
    let gw = 0;
    if (chroma) gw = this.buildChroma(w, h, p.noiseSeed).gw;
    const cu = this.chromaU;
    const cv = this.chromaV;
    const ru = this.rowU;
    const rv = this.rowV;
    const seedHash = hash32(p.noiseSeed * 2654435761);
    for (let y = 0; y < h; y++) {
      const vyy = vy[y]!;
      const rowOff = hash32(y * 0x9e3779b1 + seedHash);
      if (chroma) {
        // Interpolación vertical del campo cromático para esta fila.
        const gy = y / 3;
        const y0 = gy | 0;
        const fy = gy - y0;
        const a = y0 * gw;
        const b = a + gw;
        for (let i = 0; i < gw; i++) {
          ru[i] = cu[a + i]! + (cu[b + i]! - cu[a + i]!) * fy;
          rv[i] = cv[a + i]! + (cv[b + i]! - cv[a + i]!) * fy;
        }
      }
      for (let x = 0; x < w; x++) {
        const p4 = (y * w + x) * 4;
        const v = vx[x]! * vyy;
        let lr = lut[base[p4]!]!;
        let lg = lut[base[p4 + 1]!]!;
        let lb = lut[base[p4 + 2]!]!;
        if (emis) {
          const e = (y * w + x) * 3;
          lr += emis[e]!;
          lg += emis[e + 1]!;
          lb += emis[e + 2]!;
        }
        let ir = lr * kr * v;
        let ig = lg * kg * v;
        let ib = lb * kb * v;
        ir = ir >= TONE_N ? TONE_N : ir;
        ig = ig >= TONE_N ? TONE_N : ig;
        ib = ib >= TONE_N ? TONE_N : ib;
        let R = tone[ir | 0]!;
        let G = tone[ig | 0]!;
        let B = tone[ib | 0]!;
        const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
        if (keepLuma) luma[y * w + x] = Y;
        clipped[y * w + x] = R >= 254 || G >= 254 || B >= 254 ? 1 : 0;
        if (sat < 0.999) {
          R = Y + (R - Y) * sat;
          G = Y + (G - Y) * sat;
          B = Y + (B - Y) * sat;
        }
        if (noisy) {
          const k = ng[Y > 255 ? 255 : Y | 0]!;
          const nl = g[(rowOff + x) & GAUSS_MASK]! * sl * k;
          R += nl;
          G += nl;
          B += nl;
          if (chroma) {
            const gx = x / 3;
            const x0 = gx | 0;
            const fx = gx - x0;
            const u = (ru[x0]! + (ru[x0 + 1]! - ru[x0]!) * fx) * sc * k;
            const vv = (rv[x0]! + (rv[x0 + 1]! - rv[x0]!) * fx) * sc * k;
            R += 1.4 * vv;
            G -= 0.34 * u + 0.71 * vv;
            B += 1.77 * u;
          }
        }
        out[p4] = R;
        out[p4 + 1] = G;
        out[p4 + 2] = B;
        out[p4 + 3] = 255;
      }
    }
  }

  /** Zebras sobre las altas luces quemadas y focus peaking sobre los bordes nítidos. */
  overlays(out: Uint8ClampedArray, w: number, h: number, o: OverlayParams): void {
    if (o.zebras) {
      const period = Math.max(6, Math.round(w / 150));
      const band = Math.max(2, Math.round(period * 0.42));
      const ph = Math.round(o.zebraPhase) % period;
      const clipped = this.clipped;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          if (!clipped[i]) continue;
          if ((x + y + ph) % period >= band) continue;
          const p4 = i * 4;
          out[p4] = 28;
          out[p4 + 1] = 28;
          out[p4 + 2] = 30;
        }
      }
    }
    const mask = o.peakingMask;
    if (mask && this.luma.length === w * h) {
      const L = this.luma;
      // Umbral de contraste local (diferencias centrales sobre luminancia 0–255).
      const T = 30;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = y * w + x;
          if (mask[i * 4]! < 128) continue;
          const gx = L[i + 1]! - L[i - 1]!;
          const gy = L[i + w]! - L[i - w]!;
          if ((gx < 0 ? -gx : gx) + (gy < 0 ? -gy : gy) < T) continue;
          const p4 = i * 4;
          out[p4] = 255;
          out[p4 + 1] = 59;
          out[p4 + 2] = 59;
        }
      }
    }
  }
}
