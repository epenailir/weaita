/**
 * Motor de simulación de imagen (Canvas 2D, 2.5D por capas con profundidad física).
 *
 * Por cuadro:
 *  1. Cada capa de la escena se pinta en vectorial a la escala del zoom (caché por escena+focal).
 *  2. Profundidad de campo: cada capa se desenfoca con el disco de desenfoque físico
 *     (blurDiscFraction × ancho interno, sigma ≈ diámetro/2.4). Los planos de suelo se
 *     desenfocan por bandas según su distancia (caché por radio cuantizado).
 *  3. Movimiento: las capas con sujetos en movimiento se barren según motionBlurPx.
 *  4. Composición de atrás hacia adelante + trepidación (si shakeRatio > 1).
 *  5. Fuentes de luz (bokeh con forma de diafragma, estelas, arcos de estrellas) en un búfer
 *     HDR lineal, ocluidas por las capas que tienen delante.
 *  6. Revelado (exposición, balance de blancos, rango dinámico, ruido) e histograma.
 * Cambiar solo ISO, compensación o balance de blancos reutiliza todo hasta el paso 6.
 */
import { colorCast } from '../engine/whiteBalance';
import { computeHistogram, emptyHistogram } from '../engine/histogram';
import { computeMetrics } from '../engine/metrics';
import { mulberry32 } from '../engine/noise';
import { SENSORS, blurDiscFraction, motionBlurPx, shakeBlurPx, shakeRatio } from '../engine/optics';
import type { CameraSettings, SensorFormat } from '../engine/types';
import { BlurKit, createSurface, releaseSurface, resetContext, sizeSurface } from './blur';
import type { Surface } from './blur';
import { ToneMapper } from './compose';
import { EmissiveBuffer } from './emissive';
import type { DiscShape } from './emissive';
import { createPainter } from './painters';
import { groundDistance } from './painters/kit';
import type { Emitter, PaintFrame, SceneLayer, ScenePainter } from './painters/types';
import { SCENES } from './scenes';
import type { RenderOptions, RenderResult, SceneId, SimRendererApi } from './types';

/** Anchos internos posibles (calidad adaptativa: se baja un escalón si el cuadro tarda > 40 ms). */
const QUALITY_WIDTHS = [1280, 1120, 960, 820, 680, 560] as const;
/** Ancho del encuadre de referencia en unidades de mundo (3:2 → 1.5 × 1). */
const FRAME_UNITS = 1.5;
/** El barrido más largo que vale la pena calcular (más allá, el sujeto ya se diluyó). */
const MAX_MOTION_FRACTION = 1.6;
/** Tope de trepidación (fracción del ancho): más allá todo es una mancha igual de inútil. */
const MAX_SHAKE_FRACTION = 0.14;

interface Band {
  /** Filas (px del lienzo de la capa) que cubre la banda. */
  y0: number;
  y1: number;
  diam: number;
  bucket: number;
  inFocus: boolean;
}

interface LayerState {
  layer: SceneLayer;
  sharp: Surface;
  sharpKey: string;
  procA: Surface | null;
  procB: Surface | null;
  procKey: string;
  /** Resultado final de la capa (nítido, desenfocado y/o barrido). */
  out: HTMLCanvasElement;
  marginX: number;
  marginY: number;
  inFocus: boolean;
  bands: Band[];
  bandCache: Map<number, Surface>;
  bandCacheKey: string;
  emitters: Emitter[] | null;
  emittersKey: string;
}

function bucketOf(d: number): number {
  return d < 0.7 ? 0 : Math.round(Math.log(d) / Math.log(1.06)) + 100;
}

function diamOfBucket(b: number): number {
  return b === 0 ? 0 : Math.pow(1.06, b - 100);
}

export class SimRenderer implements SimRendererApi {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly blur = new BlurKit();
  private readonly tone = new ToneMapper();
  private readonly emissive = new EmissiveBuffer();
  private readonly comp = createSurface();
  private readonly comp2 = createSurface();
  private readonly occ = createSurface();
  private readonly occBlur = createSurface();
  private readonly mask = createSurface();
  private readonly scratch = createSurface();
  private sceneId: SceneId = 'plaza';
  private painter: ScenePainter;
  private layers: LayerState[] = [];
  private cssW = 0;
  private cssH = 0;
  private dpr = 1;
  private quality = 0;
  private W = 0;
  private H = 0;
  private out: ImageData | null = null;
  private baseData: Uint8ClampedArray | null = null;
  private baseKey = '';
  private emisKey = '';
  private maskData: Uint8ClampedArray | null = null;
  private maskKey = '';
  private slowRenders = 0;
  private fastRenders = 0;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('El navegador no ofrece Canvas 2D');
    this.ctx = ctx;
    this.painter = createPainter(this.sceneId, SCENES[this.sceneId]);
    this.buildLayers();
  }

  setScene(id: SceneId): void {
    if (this.disposed || (id === this.sceneId && this.layers.length > 0)) return;
    this.sceneId = id;
    this.painter = createPainter(id, SCENES[id]);
    this.buildLayers();
  }

  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    if (this.disposed) return;
    this.cssW = Math.max(0, cssWidth);
    this.cssH = Math.max(0, cssHeight);
    this.dpr = dpr > 0 ? dpr : 1;
    this.applySize();
  }

  render(settings: CameraSettings, options?: Partial<RenderOptions>): RenderResult {
    const t0 = performance.now();
    const scene = SCENES[this.sceneId];
    const metrics = computeMetrics(settings, scene.lighting);
    const W = this.W;
    const H = this.H;
    if (this.disposed || W < 8 || H < 8) return { histogram: emptyHistogram(), metrics, renderMs: 0 };
    const timeS = options?.timeS ?? 0;
    const zebras = options?.highlightWarning ?? false;
    const peaking = options?.focusPeaking ?? false;

    const sensor = SENSORS[settings.sensor];
    const zoom = (settings.focalMm * sensor.crop) / scene.refFocalMm;
    const ppu = (W * zoom) / FRAME_UNITS;
    const viewKey = `${this.sceneId}|${zoom.toFixed(5)}|${W}x${H}`;
    const cocFraction = (sensor.cocMm / sensor.widthMm) * 1.15;
    const discFraction = (d: number) => blurDiscFraction(settings.focalMm, settings.aperture, settings.focusM, d, sensor);
    let repaintedStatic = false;

    // 1–3. Capas: pintado, profundidad de campo y barrido.
    const procKeys: string[] = [];
    for (const ls of this.layers) {
      const L = ls.layer;
      let motionPx = 0;
      let ux = 0;
      let uy = 0;
      if (L.motion && L.motion.speedMS > 0) {
        motionPx = Math.min(
          motionBlurPx(L.motion.speedMS, L.distanceM, settings.focalMm, settings.shutter, sensor, W),
          MAX_MOTION_FRACTION * Math.max(W, H),
        );
        const n = Math.hypot(L.motion.dirX, L.motion.dirY) || 1;
        ux = L.motion.dirX / n;
        uy = L.motion.dirY / n;
      }
      // Margen para que los sujetos que entran o salen del cuadro dejen su estela dentro.
      const q = 48;
      const mx = L.motion ? Math.min(Math.ceil((Math.abs(ux) * motionPx) / 2 / q) * q, Math.ceil(W / 2)) : 0;
      const my = L.motion ? Math.min(Math.ceil((Math.abs(uy) * motionPx) / 2 / q) * q, Math.ceil(H / 2)) : 0;
      const sharpKey = `${viewKey}|${L.animated ? timeS.toFixed(4) : '-'}|${mx}x${my}`;
      if (ls.sharpKey !== sharpKey) {
        this.paintLayer(ls, mx, my, ppu, timeS, settings.shutter);
        ls.sharpKey = sharpKey;
        if (!L.animated) repaintedStatic = true;
      }

      if (L.plane) {
        ls.bands = this.planeBands(ls, L, ppu, discFraction, cocFraction);
        const key = `${sharpKey}|p${ls.bands.map((b) => `${b.bucket}:${Math.round(b.y0)}`).join(',')}`;
        if (ls.procKey !== key) {
          this.processPlane(ls);
          ls.procKey = key;
        }
        ls.inFocus = ls.bands.some((b) => b.inFocus);
        procKeys.push(key);
        continue;
      }

      const frac = discFraction(L.distanceM);
      const diam = frac * W;
      ls.inFocus = frac <= cocFraction;
      const bucket = bucketOf(diam);
      const mBucket = motionPx < 0.75 ? 0 : Math.round(Math.log(motionPx) / Math.log(1.05));
      const key = `${sharpKey}|b${bucket}|m${mBucket}`;
      if (ls.procKey !== key) {
        this.processLayer(ls, diamOfBucket(bucket), mBucket === 0 ? 0 : motionPx, ux, uy);
        ls.procKey = key;
      }
      procKeys.push(key);
    }

    // 4. Composición + trepidación.
    const ratio = shakeRatio(settings.shutter, settings.focalMm, sensor, settings.stabilizationStops, settings.tripod);
    let shakePx = 0;
    if (ratio > 1) {
      shakePx = Math.min(
        shakeBlurPx(settings.shutter, settings.focalMm, sensor, W, settings.stabilizationStops, settings.tripod),
        MAX_SHAKE_FRACTION * W,
      );
    }
    const shakeBucket = shakePx < 0.75 ? 0 : Math.round(Math.log(shakePx) / Math.log(1.08));
    const shakeAngle = mulberry32(this.painter.seed)() * Math.PI;
    const sx = Math.cos(shakeAngle);
    const sy = Math.sin(shakeAngle);
    const baseKey = `${procKeys.join('#')}|s${shakeBucket}`;
    if (baseKey !== this.baseKey || !this.baseData) {
      this.baseData = this.composite(W, H, shakeBucket ? shakePx : 0, sx, sy);
      this.baseKey = baseKey;
    }

    // 5. Fuentes de luz (HDR).
    const emisKey = `${baseKey}|${settings.aperture.toFixed(4)}|${settings.focusM.toFixed(4)}|${settings.shutter.toFixed(6)}|${settings.focalMm}|${timeS.toFixed(4)}`;
    if (emisKey !== this.emisKey) {
      this.rasterLights(settings, sensor, ppu, timeS, shakeBucket ? shakePx : 0, sx, sy);
      this.emisKey = emisKey;
    }

    // Máscara de enfoque para el peaking.
    let peakingMask: Uint8ClampedArray | null = null;
    if (peaking) {
      const flags = this.layers.map((l) => (l.layer.plane ? l.bands.map((b) => (b.inFocus ? 1 : 0)).join('') : l.inFocus ? 1 : 0)).join('');
      const mk = `${baseKey}|${flags}`;
      if (mk !== this.maskKey || !this.maskData) {
        this.maskData = this.buildFocusMask(W, H);
        this.maskKey = mk;
      }
      peakingMask = this.maskData;
    }

    // 6. Revelado, histograma y superposiciones.
    if (!this.out || this.out.width !== W || this.out.height !== H) this.out = new ImageData(W, H);
    const cast = colorCast(scene.lighting.illuminantK, settings.wbK);
    this.tone.develop(
      this.baseData,
      this.emissive.dirty ? this.emissive.data : null,
      this.out.data,
      W,
      H,
      {
        gain: Math.pow(2, metrics.exposureOffset),
        cast,
        iso: settings.iso,
        aperture: settings.aperture,
        noiseSeed: Math.floor(timeS * 24),
      },
      peaking,
    );
    const histogram = computeHistogram(this.out.data, 4);
    if (zebras || peakingMask) {
      this.tone.overlays(this.out.data, W, H, { zebras, zebraPhase: timeS * 14, peakingMask });
    }
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
    }
    this.ctx.putImageData(this.out, 0, 0);

    const renderMs = performance.now() - t0;
    this.adaptQuality(renderMs, repaintedStatic);
    return { histogram, metrics, renderMs };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.releaseLayers();
    for (const s of [this.comp, this.comp2, this.occ, this.occBlur, this.mask, this.scratch]) releaseSurface(s);
    this.blur.dispose();
    this.emissive.resize(1, 1);
    this.baseData = null;
    this.maskData = null;
    this.out = null;
  }

  /* ------------------------------------------------------------------ Tamaño y calidad */

  private applySize(): void {
    const maxW = QUALITY_WIDTHS[Math.min(this.quality, QUALITY_WIDTHS.length - 1)]!;
    if (this.cssW < 2 || this.cssH < 2) {
      this.W = 0;
      this.H = 0;
      return;
    }
    const W = Math.max(64, Math.min(maxW, Math.round(this.cssW * this.dpr)));
    const H = Math.max(32, Math.round((W * this.cssH) / this.cssW));
    if (W === this.W && H === this.H) return;
    this.W = W;
    this.H = H;
    this.emissive.resize(W, H);
    this.baseKey = '';
    this.emisKey = '';
    this.maskKey = '';
  }

  private adaptQuality(ms: number, repaintedStatic: boolean): void {
    if (repaintedStatic) return;
    if (ms > 40) {
      this.fastRenders = 0;
      this.slowRenders++;
      if (this.slowRenders >= 3 && this.quality < QUALITY_WIDTHS.length - 1) {
        this.quality++;
        this.slowRenders = 0;
        this.applySize();
      }
    } else if (ms < 12) {
      this.slowRenders = 0;
      this.fastRenders++;
      if (this.fastRenders >= 40 && this.quality > 0) {
        this.quality--;
        this.fastRenders = 0;
        this.applySize();
      }
    } else {
      this.slowRenders = Math.max(0, this.slowRenders - 1);
      this.fastRenders = 0;
    }
  }

  /* ------------------------------------------------------------------ Capas */

  private buildLayers(): void {
    this.releaseLayers();
    this.layers = this.painter.layers.map((layer) => {
      const sharp = createSurface();
      return {
        layer,
        sharp,
        sharpKey: '',
        procA: null,
        procB: null,
        procKey: '',
        out: sharp.canvas,
        marginX: 0,
        marginY: 0,
        inFocus: false,
        bands: [],
        bandCache: new Map(),
        bandCacheKey: '',
        emitters: null,
        emittersKey: '',
      };
    });
    this.baseKey = '';
    this.emisKey = '';
    this.maskKey = '';
  }

  private releaseLayers(): void {
    for (const ls of this.layers) {
      releaseSurface(ls.sharp);
      if (ls.procA) releaseSurface(ls.procA);
      if (ls.procB) releaseSurface(ls.procB);
      for (const s of ls.bandCache.values()) releaseSurface(s);
      ls.bandCache.clear();
    }
    this.layers = [];
  }

  private frame(cw: number, ch: number, ppu: number, timeS: number, exposureS: number): PaintFrame {
    return {
      x0: -cw / 2 / ppu,
      x1: cw / 2 / ppu,
      y0: -ch / 2 / ppu,
      y1: ch / 2 / ppu,
      ppu,
      px: 1 / ppu,
      timeS,
      exposureS,
    };
  }

  private paintLayer(ls: LayerState, mx: number, my: number, ppu: number, timeS: number, exposureS: number): void {
    const cw = this.W + mx * 2;
    const ch = this.H + my * 2;
    sizeSurface(ls.sharp, cw, ch);
    ls.marginX = mx;
    ls.marginY = my;
    const ctx = ls.sharp.ctx;
    ctx.setTransform(ppu, 0, 0, ppu, cw / 2, ch / 2);
    ls.layer.paint?.(ctx, this.frame(cw, ch, ppu, timeS, exposureS));
    resetContext(ctx);
    ls.out = ls.sharp.canvas;
    ls.procKey = '';
    ls.bandCacheKey = '';
  }

  private processLayer(ls: LayerState, diam: number, motionPx: number, ux: number, uy: number): void {
    let cur = ls.sharp.canvas;
    if (diam > 0.7) {
      ls.procA ??= createSurface();
      this.blur.gaussian(cur, diam / 2.4, ls.procA);
      cur = ls.procA.canvas;
    }
    if (motionPx > 0.75) {
      ls.procB ??= createSurface();
      this.blur.directional(cur, motionPx, ux, uy, ls.procB);
      if (ls.layer.motion?.confine) {
        const c = ls.procB.ctx;
        c.globalCompositeOperation = 'destination-in';
        c.drawImage(cur, 0, 0);
        resetContext(c);
      }
      cur = ls.procB.canvas;
    }
    ls.out = cur;
  }

  /** Divide un plano de suelo en bandas de desenfoque parecido según la distancia de cada fila. */
  private planeBands(ls: LayerState, L: SceneLayer, ppu: number, discFraction: (d: number) => number, cocFraction: number): Band[] {
    const plane = L.plane!;
    const scene = SCENES[this.sceneId];
    const ch = ls.sharp.canvas.height;
    const farM = plane.farM ?? scene.lighting.backgroundDistanceM;
    const horizonPx = ch / 2 + plane.horizonY * ppu;
    const W = this.W;
    const rows: Band[] = [];
    const step = 6;
    for (let y = 0; y < ch; y += step) {
      const wy = (y + step / 2 - ch / 2) / ppu;
      const d = y + step / 2 <= horizonPx ? farM : Math.min(farM, groundDistance(plane.horizonY, scene.refFocalMm, plane.cameraHeightM, wy));
      const frac = discFraction(d);
      const diam = frac * W;
      // Cubetas más gruesas que en capas sueltas: las bandas se funden con rampas suaves.
      const bucket = diam < 0.7 ? 0 : Math.round(Math.log(diam) / Math.log(1.4)) + 100;
      const last = rows[rows.length - 1];
      if (last && last.bucket === bucket) {
        last.y1 = Math.min(ch, y + step);
      } else {
        rows.push({ y0: y, y1: Math.min(ch, y + step), diam: bucket === 0 ? 0 : Math.pow(1.4, bucket - 100), bucket, inFocus: frac <= cocFraction });
      }
      if (last && last.bucket === bucket && frac <= cocFraction) last.inFocus = true;
    }
    return rows;
  }

  private processPlane(ls: LayerState): void {
    const bands = ls.bands;
    const src = ls.sharp.canvas;
    if (ls.bandCacheKey !== ls.sharpKey) {
      for (const s of ls.bandCache.values()) releaseSurface(s);
      ls.bandCache.clear();
      ls.bandCacheKey = ls.sharpKey;
    }
    const blurred = (b: Band): HTMLCanvasElement => {
      if (b.diam <= 0.7) return src;
      let s = ls.bandCache.get(b.bucket);
      if (!s) {
        s = createSurface();
        this.blur.gaussian(src, b.diam / 2.4, s);
        ls.bandCache.set(b.bucket, s);
      }
      return s.canvas;
    };
    if (bands.length <= 1) {
      ls.out = bands[0] ? blurred(bands[0]) : src;
      return;
    }
    ls.procA ??= createSurface();
    const acc = ls.procA;
    sizeSurface(acc, src.width, src.height);
    const ch = src.height;
    const centers = bands.map((b) => (b.y0 + b.y1) / 2);
    const tmp = this.scratch;
    for (let i = 0; i < bands.length; i++) {
      const b = bands[i]!;
      // Rampa (partición de la unidad) entre los centros de las bandas vecinas.
      const prev = i > 0 ? centers[i - 1]! : -1;
      const next = i < bands.length - 1 ? centers[i + 1]! : -1;
      const c = centers[i]!;
      const top = prev < 0 ? 0 : prev;
      const bottom = next < 0 ? ch : next;
      sizeSurface(tmp, src.width, ch);
      tmp.ctx.drawImage(blurred(b), 0, 0);
      tmp.ctx.globalCompositeOperation = 'destination-in';
      const g = tmp.ctx.createLinearGradient(0, 0, 0, ch);
      const at = (y: number) => Math.min(1, Math.max(0, y / ch));
      if (prev < 0) g.addColorStop(0, '#000');
      else {
        g.addColorStop(at(prev), 'rgba(0,0,0,0)');
      }
      g.addColorStop(at(c), '#000');
      if (next < 0) g.addColorStop(1, '#000');
      else g.addColorStop(at(next), 'rgba(0,0,0,0)');
      tmp.ctx.fillStyle = g;
      tmp.ctx.fillRect(0, top, src.width, bottom - top);
      // Fuera de [top, bottom] la banda no aporta.
      tmp.ctx.globalCompositeOperation = 'destination-out';
      tmp.ctx.fillStyle = '#000';
      if (top > 0) tmp.ctx.fillRect(0, 0, src.width, top);
      if (bottom < ch) tmp.ctx.fillRect(0, bottom, src.width, ch - bottom);
      resetContext(tmp.ctx);
      acc.ctx.globalCompositeOperation = 'lighter';
      acc.ctx.drawImage(tmp.canvas, 0, 0);
    }
    resetContext(acc.ctx);
    ls.out = acc.canvas;
  }

  /* ------------------------------------------------------------------ Composición */

  private composite(W: number, H: number, shakePx: number, sx: number, sy: number): Uint8ClampedArray {
    const c = this.comp;
    sizeSurface(c, W, H);
    c.ctx.fillStyle = '#000';
    c.ctx.fillRect(0, 0, W, H);
    for (const ls of this.layers) c.ctx.drawImage(ls.out, -ls.marginX, -ls.marginY);
    let final: Surface = c;
    if (shakePx > 0) {
      this.blur.directional(c.canvas, shakePx, sx, sy, this.comp2);
      final = this.comp2;
      if (shakePx > 4) {
        // El pulso no es una línea recta: un poco de temblor en todas direcciones.
        this.blur.gaussian(this.comp2.canvas, shakePx * 0.08, c);
        final = c;
      }
    }
    return final.ctx.getImageData(0, 0, W, H).data;
  }

  /** Transmitancia de las capas delanteras ya acumuladas en `occ` (con trepidación si la hay). */
  private readOcclusion(W: number, H: number, shakePx: number, sx: number, sy: number): Uint8ClampedArray {
    if (shakePx > 0) {
      this.blur.directional(this.occ.canvas, shakePx, sx, sy, this.occBlur);
      return this.occBlur.ctx.getImageData(0, 0, W, H).data;
    }
    return this.occ.ctx.getImageData(0, 0, W, H).data;
  }

  private rasterLights(s: CameraSettings, sensor: SensorFormat, ppu: number, timeS: number, shakePx: number, sx: number, sy: number): void {
    const W = this.W;
    const H = this.H;
    const em = this.emissive;
    em.resize(W, H);
    if (!this.layers.some((l) => l.layer.emitters)) return;
    sizeSurface(this.occ, W, H);
    let occDrawn = false;
    const view = this.frame(W, H, ppu, timeS, s.shutter);
    const N = s.aperture;
    const shape: DiscShape = {
      polygon: Math.min(1, Math.max(0, (N - 2.8) / 2.6)),
      blades: 9,
      rotation: 0.31,
      catEyeX: 0,
      catEyeY: 0,
    };
    const catStrength = Math.min(1, Math.max(0, 1 - (N - 1.4) / 1.4));
    const halfDiag = Math.hypot(W, H) / 2;
    const discPx = (d: number) => blurDiscFraction(s.focalMm, N, s.focusM, d, sensor) * W;
    const toX = (x: number) => W / 2 + x * ppu;
    const toY = (y: number) => H / 2 + y * ppu;
    const shX = sx * shakePx;
    const shY = sy * shakePx;

    for (let i = this.layers.length - 1; i >= 0; i--) {
      const ls = this.layers[i]!;
      const L = ls.layer;
      if (L.emitters) {
        em.setOcclusion(occDrawn ? this.readOcclusion(W, H, shakePx, sx, sy) : null);
        const key = `${ls.sharpKey}|${s.shutter}`;
        if (ls.emittersKey !== key || !ls.emitters) {
          ls.emitters = L.emitters(view);
          ls.emittersKey = key;
        }
        const layerDisc = discPx(L.distanceM);
        for (const e of ls.emitters) {
          if (e.kind === 'glow') {
            const x = toX(e.x);
            const y = toY(e.y);
            const r = e.radius * ppu;
            if (x + 3 * r < 0 || x - 3 * r > W || y + 3 * r < 0 || y - 3 * r > H) continue;
            em.glow(x, y, r, e.color[0], e.color[1], e.color[2], e.power);
            continue;
          }
          const blurD = e.distanceM !== undefined ? discPx(e.distanceM) : layerDisc;
          const d0 = Math.max(0.8, e.size * ppu);
          const D = Math.sqrt(d0 * d0 + blurD * blurD);
          const energy = e.power * d0 * d0; // ∝ potencia × área
          const [r, g, b] = e.color;
          if (e.kind === 'point') {
            const x = toX(e.x);
            const y = toY(e.y);
            const ext = D + shakePx;
            if (x + ext < 0 || x - ext > W || y + ext < 0 || y - ext > H) continue;
            if (shakePx > 0.75) {
              const area = D * shakePx + (Math.PI / 4) * D * D;
              const I = (energy * (Math.PI / 4)) / area;
              em.capsule(x - shX / 2, y - shY / 2, x + shX / 2, y + shY / 2, D, r, g, b, I, I);
            } else {
              let catX = 0;
              let catY = 0;
              if (catStrength > 0 && D > 6) {
                const rx = x - W / 2;
                const ry = y - H / 2;
                const rho = Math.hypot(rx, ry) / halfDiag;
                if (rho > 0.3) {
                  const k = ((rho - 0.3) / 0.7) * 0.85 * catStrength * D;
                  catX = (rx / (rho * halfDiag)) * k;
                  catY = (ry / (rho * halfDiag)) * k;
                }
              }
              shape.catEyeX = catX;
              shape.catEyeY = catY;
              em.disc(x, y, D, r, g, b, energy / (D * D), shape);
            }
          } else if (e.kind === 'trail') {
            let x0 = toX(e.x0);
            let y0 = toY(e.y0);
            let x1 = toX(e.x1);
            let y1 = toY(e.y1);
            if (Math.max(x0, x1) + D < 0 || Math.min(x0, x1) - D > W || Math.max(y0, y1) + D < 0 || Math.min(y0, y1) - D > H) continue;
            const len = Math.hypot(x1 - x0, y1 - y0);
            const Dt = shakePx > 0.75 ? Math.sqrt(D * D + shakePx * shakePx * 0.35) : D;
            const area = Dt * len + (Math.PI / 4) * Dt * Dt;
            const I = (energy * (Math.PI / 4)) / area;
            // Recorta al lienzo para no rasterizar kilómetros de estela fuera de cuadro.
            const clip = clipSegment(x0, y0, x1, y1, -D, -D, W + D, H + D);
            if (!clip) continue;
            const w0 = e.w0 ?? 1;
            const w1 = e.w1 ?? 1;
            const t0 = clip[4];
            const t1 = clip[5];
            [x0, y0, x1, y1] = [clip[0], clip[1], clip[2], clip[3]];
            em.capsule(x0, y0, x1, y1, Dt, r, g, b, I * (w0 + (w1 - w0) * t0), I * (w0 + (w1 - w0) * t1));
          } else {
            // Arco alrededor del polo celeste.
            const cx = toX(e.cx);
            const cy = toY(e.cy);
            const x = toX(e.x);
            const y = toY(e.y);
            if (x + D + 64 < 0 || x - D - 64 > W || y + D + 64 < 0 || y - D - 64 > H) continue;
            const R = Math.hypot(x - cx, y - cy);
            const len = R * Math.abs(e.sweep);
            if (len < 0.6 && shakePx <= 0.75) {
              if (D < 1.6) em.point(x, y, r, g, b, energy * (Math.PI / 4));
              else em.disc(x, y, D, r, g, b, energy / (D * D), shape);
              continue;
            }
            const a1 = Math.atan2(y - cy, x - cx);
            const segs = Math.max(2, Math.min(24, Math.ceil(len / 5)));
            const pts = new Float32Array((segs + 1) * 2);
            for (let k = 0; k <= segs; k++) {
              const a = a1 - e.sweep * (1 - k / segs);
              pts[k * 2] = cx + Math.cos(a) * R + (shX * (k / segs - 0.5));
              pts[k * 2 + 1] = cy + Math.sin(a) * R + (shY * (k / segs - 0.5));
            }
            const L2 = len + shakePx;
            const area = D * L2 + (Math.PI / 4) * D * D;
            em.polyline(pts, D, r, g, b, (energy * (Math.PI / 4)) / area);
          }
        }
      }
      this.occ.ctx.drawImage(ls.out, -ls.marginX, -ls.marginY);
      occDrawn = true;
    }
    em.setOcclusion(null);
  }

  /** Máscara (canal R) de las zonas donde la capa visible está dentro de la profundidad de campo. */
  private buildFocusMask(W: number, H: number): Uint8ClampedArray {
    const m = this.mask;
    sizeSurface(m, W, H);
    m.ctx.fillStyle = '#000';
    m.ctx.fillRect(0, 0, W, H);
    const tmp = this.scratch;
    for (const ls of this.layers) {
      const src = ls.out;
      sizeSurface(tmp, src.width, src.height);
      tmp.ctx.drawImage(src, 0, 0);
      tmp.ctx.globalCompositeOperation = 'source-in';
      if (ls.layer.noPeaking) tmp.ctx.fillStyle = '#000';
      else if (ls.layer.plane && ls.bands.length > 1) {
        const g = tmp.ctx.createLinearGradient(0, 0, 0, src.height);
        for (const b of ls.bands) {
          const col = b.inFocus ? '#fff' : '#000';
          g.addColorStop(Math.min(1, b.y0 / src.height), col);
          g.addColorStop(Math.min(1, b.y1 / src.height), col);
        }
        tmp.ctx.fillStyle = g;
      } else tmp.ctx.fillStyle = ls.inFocus ? '#fff' : '#000';
      tmp.ctx.fillRect(0, 0, src.width, src.height);
      resetContext(tmp.ctx);
      m.ctx.drawImage(tmp.canvas, -ls.marginX, -ls.marginY);
    }
    return m.ctx.getImageData(0, 0, W, H).data;
  }
}

/**
 * Recorta el segmento al rectángulo (Liang–Barsky). Devuelve [x0, y0, x1, y1, t0, t1]
 * con t0/t1 la fracción original de cada extremo, o null si queda fuera.
 */
function clipSegment(x0: number, y0: number, x1: number, y1: number, xmin: number, ymin: number, xmax: number, ymax: number): [number, number, number, number, number, number] | null {
  const dx = x1 - x0;
  const dy = y1 - y0;
  let t0 = 0;
  let t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [x0 - xmin, xmax - x0, y0 - ymin, ymax - y0];
  for (let i = 0; i < 4; i++) {
    const pi = p[i]!;
    const qi = q[i]!;
    if (Math.abs(pi) < 1e-12) {
      if (qi < 0) return null;
      continue;
    }
    const t = qi / pi;
    if (pi < 0) {
      if (t > t1) return null;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return null;
      if (t < t1) t1 = t;
    }
  }
  return [x0 + dx * t0, y0 + dy * t0, x0 + dx * t1, y0 + dy * t1, t0, t1];
}
