/**
 * Captura de cuadros del simulador: instantáneas JPEG del lienzo (giradas si la cámara estaba
 * inclinada, como saldría la foto) y comprobación de que un cuadro renderizado corresponde
 * a los ajustes vigentes antes de congelarlo.
 */
import type { Histogram, ShotMetrics } from '../../engine';

/** Escala para que una imagen girada `rollDeg` cubra todo el encuadre sin esquinas vacías. */
export function coverScale(rollDeg: number, aspect: number): number {
  const a = (Math.abs(rollDeg) * Math.PI) / 180;
  return Math.cos(a) + Math.max(aspect, 1 / aspect) * Math.sin(a);
}

export interface SnapshotOptions {
  rollDeg?: number;
  /** Ancho máximo de la imagen guardada (px). */
  maxWidth?: number;
  quality?: number;
}

/** Copia el lienzo como JPEG. Devuelve '' si el lienzo todavía no tiene contenido. */
export function snapshotCanvas(canvas: HTMLCanvasElement, { rollDeg = 0, maxWidth = 1280, quality = 0.88 }: SnapshotOptions = {}): string {
  const w0 = canvas.width;
  const h0 = canvas.height;
  if (!w0 || !h0) return '';
  const scale = Math.min(1, maxWidth / w0);
  const w = Math.round(w0 * scale);
  const h = Math.round(h0 * scale);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (Math.abs(rollDeg) > 0.01) {
    const k = coverScale(rollDeg, w / h);
    ctx.translate(w / 2, h / 2);
    ctx.rotate((-rollDeg * Math.PI) / 180);
    ctx.scale(k, k);
    ctx.translate(-w / 2, -h / 2);
  }
  ctx.drawImage(canvas, 0, 0, w, h);
  try {
    return out.toDataURL('image/jpeg', quality);
  } catch {
    return '';
  }
}

/** Copia independiente del histograma (el renderizador puede reutilizar sus búferes). */
export function cloneHistogram(h: Histogram): Histogram {
  return {
    r: new Float32Array(h.r),
    g: new Float32Array(h.g),
    b: new Float32Array(h.b),
    l: new Float32Array(h.l),
    clippedHighlightsPct: h.clippedHighlightsPct,
    clippedShadowsPct: h.clippedShadowsPct,
  };
}

const MATCH_KEYS = [
  'aperture',
  'shutterSeconds',
  'iso',
  'focalMm',
  'sceneEV100',
  'exposureOffset',
  'backgroundBlurPct',
  'dofNearM',
  'shakeRatio',
] as const satisfies ReadonlyArray<keyof ShotMetrics>;

function close(a: number, b: number): boolean {
  if (a === b) return true;
  return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
}

/** ¿El cuadro renderizado (métricas del renderizador) corresponde a los ajustes esperados? */
export function frameMatches(rendered: ShotMetrics, expected: ShotMetrics): boolean {
  return MATCH_KEYS.every((k) => close(rendered[k], expected[k]));
}
