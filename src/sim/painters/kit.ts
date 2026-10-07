/**
 * Utilidades de dibujo compartidas por los pintores de escena: aleatoriedad con semilla, colores,
 * escalas físicas, degradados, crestas fractales, pasto, texturas y figuras humanas.
 * Todo se dibuja en unidades de mundo (ver painters/types.ts).
 */
import { mulberry32 } from '../../engine/noise';
import { kelvinToRgb } from '../../engine/whiteBalance';
import type { LinearRGB, PaintFrame } from './types';

/* ------------------------------------------------------------------ Aleatoriedad */

export interface Rand {
  (): number;
  range(a: number, b: number): number;
  int(a: number, b: number): number;
  pick<T>(arr: readonly T[]): T;
  /** Normal estándar (Box–Muller). */
  normal(): number;
  chance(p: number): boolean;
}

export function rand(seed: number): Rand {
  const r = mulberry32(seed) as Rand;
  r.range = (a, b) => a + (b - a) * r();
  r.int = (a, b) => Math.floor(a + (b - a + 1) * r());
  r.pick = <T,>(arr: readonly T[]): T => arr[Math.min(arr.length - 1, Math.floor(r() * arr.length))] as T;
  r.normal = () => Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(2 * Math.PI * r());
  r.chance = (p) => r() < p;
  return r;
}

/* ------------------------------------------------------------------ Color */

export type RGB = readonly [number, number, number];

export function hex(h: string): RGB {
  const v = parseInt(h.replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function scale(c: RGB, k: number): RGB {
  return [c[0] * k, c[1] * k, c[2] * k];
}

export function css(c: RGB, a = 1): string {
  const r = Math.round(Math.min(255, Math.max(0, c[0])));
  const g = Math.round(Math.min(255, Math.max(0, c[1])));
  const b = Math.round(Math.min(255, Math.max(0, c[2])));
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${Math.max(0, a).toFixed(3)})`;
}

function toLin(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Color sRGB → cromaticidad lineal normalizada (canal máximo = 1) para fuentes de luz. */
export function lightRGB(c: RGB): LinearRGB {
  const r = toLin(c[0]);
  const g = toLin(c[1]);
  const b = toLin(c[2]);
  const m = Math.max(r, g, b, 1e-6);
  return [r / m, g / m, b / m];
}

/** Color lineal de una lámpara de cierta temperatura (canal máximo = 1). */
export function kelvinLight(k: number): LinearRGB {
  const [r, g, b] = kelvinToRgb(k);
  return lightRGB([r * 255, g * 255, b * 255]);
}

/* ------------------------------------------------------------------ Escala física */

/** Tamaño en unidades de mundo de un objeto de `sizeM` metros a `distM` metros. */
export function sizer(refFocalMm: number): (sizeM: number, distM: number) => number {
  return (sizeM, distM) => (refFocalMm * sizeM) / (distM * 24);
}

/** Altura en pantalla del suelo a `distM` metros (cámara a `camH` metros sobre él). */
export function groundY(horizonY: number, refFocalMm: number, camH: number, distM: number): number {
  return horizonY + (refFocalMm * camH) / (distM * 24);
}

/** Distancia del suelo visible a la altura y (inversa de groundY). */
export function groundDistance(horizonY: number, refFocalMm: number, camH: number, y: number): number {
  return (refFocalMm * camH) / (Math.max(1e-6, y - horizonY) * 24);
}

/* ------------------------------------------------------------------ Degradados y formas */

export type Stops = ReadonlyArray<readonly [number, string]>;

export function linear(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: Stops): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(Math.min(1, Math.max(0, o)), c);
  return g;
}

export function radial(ctx: CanvasRenderingContext2D, x: number, y: number, r0: number, r1: number, stops: Stops, fx = x, fy = y): CanvasGradient {
  const g = ctx.createRadialGradient(fx, fy, r0, x, y, r1);
  for (const [o, c] of stops) g.addColorStop(Math.min(1, Math.max(0, o)), c);
  return g;
}

/** Rellena todo el lienzo visible. */
export function fillFrame(ctx: CanvasRenderingContext2D, f: PaintFrame, style: string | CanvasGradient): void {
  ctx.fillStyle = style;
  ctx.fillRect(f.x0 - f.px, f.y0 - f.px, f.x1 - f.x0 + 2 * f.px, f.y1 - f.y0 + 2 * f.px);
}

/** Mancha suave: círculo con caída radial (nubes, bruma, follaje lejano). */
export function softDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: RGB, a: number, core = 0): void {
  ctx.fillStyle = radial(ctx, x, y, 0, r, [
    [0, css(c, a)],
    [Math.max(0.01, core), css(c, a)],
    [1, css(c, 0)],
  ]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(1e-6, rx), Math.max(1e-6, ry), rot, 0, Math.PI * 2);
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

/** Contorno irregular cerrado (rocas, arbustos, copas) con `n` vértices suavizados. */
export function blobPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, r: Rand, wobble = 0.18, n = 14, flatBottom = false): void {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * 2 * wobble;
    let y = cy + Math.sin(a) * ry * k;
    if (flatBottom && y > cy) y = cy + (y - cy) * 0.35;
    pts.push([cx + Math.cos(a) * rx * k, y]);
  }
  smoothClosed(ctx, pts);
}

/** Curva cerrada suave que pasa por los puntos medios (Chaikin cuadrático). */
export function smoothClosed(ctx: CanvasRenderingContext2D, pts: ReadonlyArray<readonly [number, number]>): void {
  const n = pts.length;
  if (n < 3) return;
  ctx.beginPath();
  const last = pts[n - 1]!;
  const first = pts[0]!;
  ctx.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % n]!;
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  ctx.closePath();
}

/**
 * Cresta fractal (desplazamiento del punto medio) con 2^levels segmentos sobre [x0, x1].
 * Devuelve alturas normalizadas en [−amp/2, amp/2].
 */
export function ridge(seed: number, levels: number, amp: number, roughness = 0.55): Float32Array {
  const n = 1 << levels;
  const h = new Float32Array(n + 1);
  const r = rand(seed);
  h[0] = (r() - 0.5) * amp;
  h[n] = (r() - 0.5) * amp;
  let step = n;
  let a = amp;
  while (step > 1) {
    const half = step >> 1;
    for (let i = half; i < n; i += step) {
      h[i] = (h[i - half]! + h[i + half]!) / 2 + (r() - 0.5) * a;
    }
    a *= roughness;
    step = half;
  }
  // Normaliza a [−amp/2, amp/2] para que la amplitud no dependa de la semilla.
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i <= n; i++) {
    lo = Math.min(lo, h[i]!);
    hi = Math.max(hi, h[i]!);
  }
  const span = hi - lo || 1;
  for (let i = 0; i <= n; i++) h[i] = ((h[i]! - lo) / span - 0.5) * amp;
  return h;
}

/** Interpolación lineal de una cresta muestreada en [x0, x1]. */
export function sampleRidge(h: Float32Array, x0: number, x1: number, x: number): number {
  const n = h.length - 1;
  const t = ((x - x0) / (x1 - x0)) * n;
  const i = Math.max(0, Math.min(n - 1, Math.floor(t)));
  const f = Math.min(1, Math.max(0, t - i));
  return h[i]! + (h[i + 1]! - h[i]!) * f;
}

/* ------------------------------------------------------------------ Vegetación */

/** Matas de pasto: trazos finos curvos desde una línea base. */
export function grassTufts(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, h: number, count: number, cols: readonly RGB[], r: Rand, lineW: number): void {
  ctx.lineCap = 'round';
  ctx.lineWidth = lineW;
  for (let i = 0; i < count; i++) {
    const x = r.range(x0, x1);
    const hh = h * r.range(0.4, 1);
    const lean = (r() - 0.5) * hh * 0.6;
    ctx.strokeStyle = css(r.pick(cols));
    ctx.beginPath();
    ctx.moveTo(x, y + r() * h * 0.1);
    ctx.quadraticCurveTo(x + lean * 0.2, y - hh * 0.6, x + lean, y - hh);
    ctx.stroke();
  }
}

/* ------------------------------------------------------------------ Textura */

let noiseTile: HTMLCanvasElement | null = null;

/** Tesela de ruido gris (valor) de 128 px, generada una vez. */
function noiseCanvas(): HTMLCanvasElement {
  if (noiseTile) return noiseTile;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(128, 128);
    const r = rand(4242);
    // Ruido de valor suavizado (dos octavas) para que parezca materia y no estática.
    const coarse = new Float32Array(32 * 32);
    for (let i = 0; i < coarse.length; i++) coarse[i] = r();
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const gx = (x / 4) % 32;
        const gy = (y / 4) % 32;
        const x0 = Math.floor(gx);
        const y0 = Math.floor(gy);
        const fx = gx - x0;
        const fy = gy - y0;
        const at = (a: number, b: number) => coarse[((b + 32) % 32) * 32 + ((a + 32) % 32)]!;
        const v = (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
        const n = Math.min(1, Math.max(0, v * 0.6 + r() * 0.4));
        const i = (y * 128 + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.round(n * 255);
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  noiseTile = c;
  return c;
}

/**
 * Textura de materia (revoque, piedra, asfalto, pasto) en modo "overlay" dentro del trazado
 * actual de recorte. `cell` es el tamaño en unidades de mundo de la tesela completa.
 */
export function grain(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, amount: number, cell: number, offset = 0): void {
  const pat = ctx.createPattern(noiseCanvas(), 'repeat');
  if (!pat) return;
  const k = cell / 128;
  pat.setTransform(new DOMMatrix([k, 0, 0, k, offset * cell, offset * cell * 0.37]));
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pat;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/* ------------------------------------------------------------------ Figuras humanas */

export interface FigureStyle {
  skin: RGB;
  hair: RGB;
  top: RGB;
  bottom: RGB;
  shoes: RGB;
  /** Pantalón largo, corto o falda. */
  legs: 'pants' | 'shorts' | 'skirt';
  sleeves: 'long' | 'short';
  socks?: RGB;
  hairLong?: boolean;
  /** Bolso cruzado (color). */
  bag?: RGB;
  /** Franja horizontal en la camiseta (deportes). */
  stripe?: RGB;
  /** Abrigo largo hasta medio muslo. */
  coat?: boolean;
}

export type Pose = 'walk' | 'run' | 'stand';

export interface FigureOptions {
  facing: 1 | -1;
  pose: Pose;
  /** Fase del paso (rad). */
  phase: number;
  style: FigureStyle;
  /** Dirección horizontal de la luz principal (−1 izq., 1 der.). */
  lightX?: number;
  /** Intensidad del contraluz en el borde (0–1). */
  rim?: number;
  rimColor?: RGB;
}

export interface Pt {
  x: number;
  y: number;
}

/** Trazado de un segmento ahusado con extremos redondeados (extremidades, tubos). */
export function taperPath(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, wa: number, wb: number): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1e-6;
  const nx = -dy / L;
  const ny = dx / L;
  const th = Math.atan2(ny, nx);
  ctx.beginPath();
  ctx.moveTo(a.x + (nx * wa) / 2, a.y + (ny * wa) / 2);
  ctx.lineTo(b.x + (nx * wb) / 2, b.y + (ny * wb) / 2);
  ctx.arc(b.x, b.y, wb / 2, th, th - Math.PI, true);
  ctx.lineTo(a.x - (nx * wa) / 2, a.y - (ny * wa) / 2);
  ctx.arc(a.x, a.y, wa / 2, th + Math.PI, th, true);
  ctx.closePath();
}

/** Rellena un segmento ahusado con sombreado transversal según la luz. */
export function shadedLimb(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, wa: number, wb: number, c: RGB, lightX: number, k = 1): void {
  taperPath(ctx, a, b, wa, wb);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1e-6;
  const nx = -dy / L;
  const ny = dx / L;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const w = Math.max(wa, wb) / 2;
  const lit = nx * lightX + ny * -0.6 > 0;
  const c1 = scale(c, k * 1.12);
  const c0 = scale(c, k * 0.62);
  ctx.fillStyle = linear(ctx, mx + nx * w, my + ny * w, mx - nx * w, my - ny * w, [
    [0, css(lit ? c1 : c0)],
    [0.45, css(scale(c, k))],
    [1, css(lit ? c0 : c1)],
  ]);
  ctx.fill();
}

/** Punto a distancia `len` desde `o` con ángulo desde la vertical hacia abajo (positivo = hacia delante). */
function seg(o: Pt, len: number, ang: number, facing: number): Pt {
  return { x: o.x + Math.sin(ang) * len * facing, y: o.y + Math.cos(ang) * len };
}

/** Cabeza de perfil mirando hacia +x (unidad = alto de la cabeza), centrada en (0, 0). */
export function profileHeadPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, hh: number, F: number): void {
  const P = (x: number, y: number): [number, number] => [cx + x * hh * F, cy + y * hh];
  const pts: Array<[number, number]> = [
    P(-0.05, -0.5),
    P(0.25, -0.44),
    P(0.36, -0.22),
    P(0.38, -0.08),
    P(0.47, 0.06),
    P(0.39, 0.13),
    P(0.4, 0.2),
    P(0.36, 0.3),
    P(0.3, 0.42),
    P(0.12, 0.46),
    P(-0.12, 0.36),
    P(-0.34, 0.16),
    P(-0.4, -0.12),
    P(-0.3, -0.38),
  ];
  smoothClosed(ctx, pts);
}

/**
 * Figura humana de perfil (≈7.5 cabezas) con pose de caminar, correr o estar de pie, extremidades
 * con volumen y el lado lejano en sombra. `x, yFeet` es el punto de apoyo; `h` la estatura.
 */
export function figure(ctx: CanvasRenderingContext2D, x: number, yFeet: number, h: number, o: FigureOptions): void {
  const s = o.style;
  const F = o.facing;
  const run = o.pose === 'run';
  const walk = o.pose === 'walk';
  const ph = o.phase;
  const lx = o.lightX ?? -0.6;
  const lean = run ? 0.24 : walk ? 0.05 : 0;
  const bob = run ? Math.abs(Math.sin(ph)) * h * 0.035 : walk ? (1 - Math.abs(Math.cos(ph))) * h * 0.012 : 0;
  const hip: Pt = { x, y: yFeet - h * 0.525 - bob + (run ? h * 0.03 : 0) };
  const thigh = h * 0.245;
  const shin = h * 0.245;
  const torsoLen = h * 0.29;
  const sp = { x: Math.sin(lean) * F, y: -Math.cos(lean) };
  const fw = { x: Math.cos(lean) * F, y: Math.sin(lean) };
  const T = (u: number, v: number): Pt => ({ x: hip.x + sp.x * u * torsoLen + fw.x * v * h, y: hip.y + sp.y * u * torsoLen + fw.y * v * h });
  const shoulder = T(0.9, -0.005);
  const neckTop = T(1.12, 0.012);
  const headC: Pt = { x: neckTop.x + sp.x * h * 0.06 + fw.x * h * 0.012, y: neckTop.y + sp.y * h * 0.06 };
  const hh = h * 0.13;

  const amp = run ? 0.95 : walk ? 0.4 : 0.03;
  const legAng = (p: number) => {
    const th = amp * Math.sin(p) + (run ? 0.1 : 0);
    const knee = run ? 0.25 + 1.35 * Math.max(0, -Math.sin(p + 0.9)) : walk ? 0.06 + 0.55 * Math.max(0, -Math.sin(p + 0.7)) : 0.03;
    return { th, sh: th - knee };
  };
  const armAng = (p: number) => {
    const up = run ? -0.9 * Math.sin(p) + 0.1 : walk ? -0.36 * Math.sin(p) : 0.06;
    const fore = run ? up + 1.6 : up + (walk ? 0.25 + 0.15 * Math.max(0, Math.sin(-p)) : 0.1);
    return { up, fore };
  };
  const pantsLeg = s.legs === 'pants';

  const drawLeg = (p: number, far: boolean) => {
    const k = far ? 0.68 : 1;
    const a = legAng(p);
    const hp: Pt = { x: hip.x + (far ? -1 : 1) * F * h * 0.008, y: hip.y };
    const knee = seg(hp, thigh, a.th, F);
    const ankle = seg(knee, shin, a.sh, F);
    // Pie: horizontal en apoyo, en punta al despegar.
    const pitch = Math.max(-0.2, Math.min(1.1, (a.sh - 0.1) * -1.2 + (run ? 0.3 : 0)));
    const toe: Pt = { x: ankle.x + Math.cos(pitch) * h * 0.11 * F, y: ankle.y + Math.sin(pitch) * h * 0.11 + h * 0.025 };
    const heel: Pt = { x: ankle.x - F * h * 0.02, y: ankle.y + h * 0.028 };
    ctx.fillStyle = css(scale(s.shoes, k));
    taperPath(ctx, heel, toe, h * 0.05, h * 0.036);
    ctx.fill();
    if (pantsLeg) {
      shadedLimb(ctx, knee, { x: ankle.x, y: ankle.y + h * 0.012 }, h * 0.06, h * 0.052, s.bottom, lx, k);
      shadedLimb(ctx, hp, knee, h * 0.088, h * 0.064, s.bottom, lx, k);
    } else {
      shadedLimb(ctx, knee, ankle, h * 0.054, h * 0.036, s.skin, lx, k);
      if (s.socks) shadedLimb(ctx, { x: knee.x + (ankle.x - knee.x) * 0.45, y: knee.y + (ankle.y - knee.y) * 0.45 }, ankle, h * 0.05, h * 0.04, s.socks, lx, k);
      shadedLimb(ctx, hp, knee, h * 0.084, h * 0.058, s.skin, lx, k);
      if (s.legs === 'shorts') {
        const m: Pt = { x: hp.x + (knee.x - hp.x) * 0.62, y: hp.y + (knee.y - hp.y) * 0.62 };
        shadedLimb(ctx, hp, m, h * 0.1, h * 0.084, s.bottom, lx, k);
      }
    }
  };

  const drawArm = (p: number, far: boolean) => {
    const k = far ? 0.66 : 1;
    const a = armAng(p);
    const sh: Pt = { x: shoulder.x, y: shoulder.y + h * 0.01 };
    const elbow = seg(sh, h * 0.168, a.up, F);
    const wrist = seg(elbow, h * 0.15, a.fore, F);
    const hand = seg(wrist, h * 0.045, a.fore + (run ? -0.4 : 0.1), F);
    ctx.fillStyle = css(scale(s.skin, k * 0.95));
    taperPath(ctx, wrist, hand, h * 0.036, h * 0.03);
    ctx.fill();
    if (s.sleeves === 'long') {
      shadedLimb(ctx, elbow, wrist, h * 0.048, h * 0.04, s.top, lx, k);
    } else {
      shadedLimb(ctx, elbow, wrist, h * 0.04, h * 0.03, s.skin, lx, k);
    }
    const upperCol = s.sleeves === 'long' ? s.top : s.skin;
    shadedLimb(ctx, sh, elbow, h * 0.058, h * 0.046, upperCol, lx, k);
    if (s.sleeves === 'short') shadedLimb(ctx, sh, seg(sh, h * 0.08, a.up, F), h * 0.07, h * 0.062, s.top, lx, k);
  };

  drawArm(ph, true);
  drawLeg(ph + Math.PI, true);

  // Torso de perfil (espalda curva, pecho) con prenda superior.
  const torsoPts: Array<[number, number]> = (
    [
      [0.0, -0.068],
      [0.35, -0.056],
      [0.72, -0.068],
      [0.95, -0.05],
      [1.06, -0.022],
      [1.06, 0.03],
      [0.95, 0.06],
      [0.72, 0.074],
      [0.42, 0.052],
      [0.06, 0.064],
      [-0.12, 0.02],
      [-0.12, -0.05],
    ] as Array<[number, number]>
  ).map(([u, v]) => {
    const p = T(u, v);
    return [p.x, p.y];
  });
  const coatLen = s.coat ? 0.55 : 0;
  if (coatLen > 0) {
    // Faldón del abrigo
    const a = T(0.1, -0.075);
    const b = T(0.1, 0.07);
    ctx.fillStyle = css(scale(s.top, 0.9));
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(b.x + F * h * 0.02, b.y + h * 0.22);
    ctx.lineTo(a.x - F * h * 0.03, a.y + h * 0.22);
    ctx.closePath();
    ctx.fill();
  }
  if (s.legs !== 'pants') {
    // Cadera con short/falda
    const a = T(-0.12, -0.07);
    ctx.fillStyle = css(s.bottom);
    ellipse(ctx, hip.x, hip.y + h * 0.005, h * 0.075, h * 0.06);
    ctx.fill();
    if (s.legs === 'skirt') {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      const b = T(-0.12, 0.07);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(b.x + F * h * 0.06, b.y + h * 0.2);
      ctx.lineTo(a.x - F * h * 0.06, a.y + h * 0.2);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.fillStyle = css(s.bottom);
    ellipse(ctx, hip.x, hip.y, h * 0.072, h * 0.058);
    ctx.fill();
  }
  smoothClosed(ctx, torsoPts);
  const tw = h * 0.08;
  ctx.fillStyle = linear(ctx, hip.x - tw, 0, hip.x + tw, 0, [
    [0, css(scale(s.top, lx < 0 ? 1.15 : 0.66))],
    [0.5, css(s.top)],
    [1, css(scale(s.top, lx < 0 ? 0.66 : 1.15))],
  ]);
  ctx.fill();
  if (s.stripe) {
    ctx.save();
    smoothClosed(ctx, torsoPts);
    ctx.clip();
    const a = T(0.55, -0.2);
    const b = T(0.55, 0.2);
    ctx.strokeStyle = css(s.stripe);
    ctx.lineWidth = h * 0.05;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }
  if (s.bag) {
    const a = T(0.92, -0.04);
    const b = T(0.05, 0.1);
    ctx.strokeStyle = css(scale(s.bag, 0.7));
    ctx.lineWidth = h * 0.012;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = css(s.bag);
    roundRect(ctx, b.x - h * 0.05, b.y - h * 0.02, h * 0.1, h * 0.08, h * 0.012);
    ctx.fill();
  }
  // Cuello
  ctx.fillStyle = css(scale(s.skin, 0.8));
  taperPath(ctx, T(0.98, 0.005), neckTop, h * 0.05, h * 0.045);
  ctx.fill();
  // Cabeza de perfil
  profileHeadPath(ctx, headC.x, headC.y, hh, F);
  ctx.fillStyle = linear(ctx, headC.x - hh * 0.5, 0, headC.x + hh * 0.5, 0, [
    [0, css(scale(s.skin, lx < 0 ? 1.08 : 0.72))],
    [1, css(scale(s.skin, lx < 0 ? 0.72 : 1.08))],
  ]);
  ctx.fill();
  // Oreja, ojo, ceja y boca (imperceptibles en figuras lejanas, legibles de cerca)
  ctx.fillStyle = css(scale(s.skin, 0.82));
  ellipse(ctx, headC.x - F * hh * 0.04, headC.y + hh * 0.02, hh * 0.07, hh * 0.11);
  ctx.fill();
  ctx.fillStyle = 'rgba(30,20,16,0.85)';
  ellipse(ctx, headC.x + F * hh * 0.27, headC.y - hh * 0.05, hh * 0.035, hh * 0.022);
  ctx.fill();
  ctx.strokeStyle = css(scale(s.hair, 0.9), 0.85);
  ctx.lineWidth = hh * 0.025;
  ctx.beginPath();
  ctx.moveTo(headC.x + F * hh * 0.2, headC.y - hh * 0.13);
  ctx.quadraticCurveTo(headC.x + F * hh * 0.28, headC.y - hh * 0.16, headC.x + F * hh * 0.35, headC.y - hh * 0.12);
  ctx.stroke();
  ctx.strokeStyle = css(scale(s.skin, 0.55), 0.8);
  ctx.lineWidth = hh * 0.02;
  ctx.beginPath();
  ctx.moveTo(headC.x + F * hh * 0.4, headC.y + hh * 0.2);
  ctx.lineTo(headC.x + F * hh * 0.33, headC.y + hh * 0.21);
  ctx.stroke();
  // Pelo
  ctx.fillStyle = css(s.hair);
  ctx.beginPath();
  const H = (u: number, v: number): [number, number] => [headC.x + u * hh * F, headC.y + v * hh];
  ctx.moveTo(...H(0.3, -0.36));
  ctx.quadraticCurveTo(...H(0.1, -0.62), ...H(-0.25, -0.45));
  ctx.quadraticCurveTo(...H(-0.5, -0.2), ...H(-0.4, s.hairLong ? 0.75 : 0.22));
  if (s.hairLong) ctx.quadraticCurveTo(...H(-0.2, 0.85), ...H(-0.12, 0.5));
  ctx.quadraticCurveTo(...H(-0.12, 0.1), ...H(0.02, -0.05));
  ctx.quadraticCurveTo(...H(0.2, -0.25), ...H(0.3, -0.36));
  ctx.closePath();
  ctx.fill();

  drawLeg(ph, false);
  drawArm(ph + Math.PI, false);

  if (o.rim && o.rim > 0) {
    // Contraluz: filo cálido en cabeza, espalda y brazo del lado de la luz.
    const rc = o.rimColor ?? hex('#ffd59a');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = css(rc, o.rim);
    ctx.lineWidth = h * 0.007;
    profileHeadPath(ctx, headC.x + lx * h * 0.002, headC.y - h * 0.002, hh, F);
    ctx.stroke();
    smoothClosed(ctx, torsoPts);
    ctx.stroke();
    ctx.restore();
  }
}

/** Sombra proyectada en el suelo (elipse difusa). */
export function groundShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a: number): void {
  ctx.fillStyle = radial(ctx, x, y, 0, rx, [
    [0, `rgba(0,0,0,${a})`],
    [0.7, `rgba(0,0,0,${a * 0.5})`],
    [1, 'rgba(0,0,0,0)'],
  ]);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.translate(-x, -y);
  ctx.beginPath();
  ctx.arc(x, y, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------------ Utilidades varias */

/** Posición periódica (envuelve en [-period/2, period/2)) para sujetos que cruzan en bucle. */
export function wrapCentered(v: number, period: number): number {
  return v - period * Math.floor(v / period + 0.5);
}
