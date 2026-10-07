/**
 * Utilidades de dibujo compartidas por los pintores de escena: aleatoriedad con semilla, colores,
 * escalas físicas, degradados, crestas fractales, árboles, rocas y figuras humanas.
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
 * Devuelve las alturas relativas (−1…1 aprox.) multiplicadas por `amp`.
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

export interface TreeColors {
  dark: RGB;
  mid: RGB;
  light: RGB;
  trunk: RGB;
}

/**
 * Conífera: pisos de ramas dentadas, lado iluminado según `lightX` (−1 izquierda, 1 derecha).
 * `x, yBase` es el pie del tronco; `h` la altura total.
 */
export function pine(ctx: CanvasRenderingContext2D, x: number, yBase: number, h: number, c: TreeColors, r: Rand, lightX = -1, detail = 1): void {
  const w = h * r.range(0.26, 0.34);
  ctx.fillStyle = css(c.trunk);
  ctx.fillRect(x - h * 0.012, yBase - h * 0.2, h * 0.024, h * 0.2);
  const tiers = Math.max(4, Math.round(9 * detail));
  const top = yBase - h;
  const pts: Array<[number, number]> = [[x, top]];
  const right: Array<[number, number]> = [];
  for (let i = 1; i <= tiers; i++) {
    const t = i / tiers;
    const y = top + (h * 0.9) * t;
    const half = (w / 2) * Math.pow(t, 0.9) * r.range(0.85, 1.12);
    right.push([x + half, y], [x + half * 0.55, y - h * 0.02]);
    pts.push([x - half, y], [x - half * 0.55, y - h * 0.02]);
  }
  pts.pop();
  ctx.beginPath();
  ctx.moveTo(x, top);
  for (const p of pts) ctx.lineTo(p[0], p[1]);
  ctx.lineTo(x, yBase - h * 0.08);
  for (let i = right.length - 2; i >= 0; i--) ctx.lineTo(right[i]![0], right[i]![1]);
  ctx.closePath();
  ctx.fillStyle = linear(ctx, x - w / 2, 0, x + w / 2, 0, [
    [0, css(lightX < 0 ? c.light : c.dark)],
    [0.5, css(c.mid)],
    [1, css(lightX < 0 ? c.dark : c.light)],
  ]);
  ctx.fill();
}

/** Árbol de copa redonda hecho de racimos con luz lateral. */
export function broadleaf(ctx: CanvasRenderingContext2D, x: number, yBase: number, h: number, c: TreeColors, r: Rand, lightX = -1, clusters = 14): void {
  const crownH = h * 0.62;
  const crownW = h * r.range(0.55, 0.75);
  const cy = yBase - h + crownH * 0.5;
  ctx.strokeStyle = css(c.trunk);
  ctx.lineCap = 'round';
  ctx.lineWidth = h * 0.045;
  ctx.beginPath();
  ctx.moveTo(x, yBase);
  ctx.quadraticCurveTo(x + h * 0.02, yBase - h * 0.3, x - h * 0.01, cy + crownH * 0.2);
  ctx.stroke();
  ctx.lineWidth = h * 0.02;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x, cy + crownH * 0.25);
    ctx.lineTo(x + (r() - 0.5) * crownW * 0.7, cy - r() * crownH * 0.2);
    ctx.stroke();
  }
  for (let i = 0; i < clusters; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.42;
    const px = x + Math.cos(a) * crownW * d;
    const py = cy + Math.sin(a) * crownH * d * 0.85;
    const rr = crownW * r.range(0.16, 0.26);
    const lit = Math.max(0, Math.min(1, 0.5 + ((px - x) / crownW) * lightX * 1.2 - (py - cy) / crownH));
    ctx.fillStyle = radial(ctx, px + lightX * rr * 0.3, py - rr * 0.35, rr * 0.1, rr * 1.05, [
      [0, css(mix(c.mid, c.light, lit))],
      [0.6, css(mix(c.dark, c.mid, lit))],
      [1, css(c.dark)],
    ]);
    blobPath(ctx, px, py, rr, rr * 0.9, r, 0.22, 10);
    ctx.fill();
  }
}

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

/* ------------------------------------------------------------------ Figuras humanas */

export interface FigureStyle {
  skin: RGB;
  hair: RGB;
  top: RGB;
  bottom: RGB;
  shoes: RGB;
  /** Pantalón largo o corto. */
  legs: 'pants' | 'shorts' | 'skirt';
  sleeves: 'long' | 'short';
  socks?: RGB;
  hairLong?: boolean;
  /** Bolso o mochila (color). */
  bag?: RGB;
  /** Número o franja de camiseta (deportes). */
  stripe?: RGB;
}

export type Pose = 'walk' | 'run' | 'stand';

export interface FigureOptions {
  facing: 1 | -1;
  pose: Pose;
  /** Fase del paso (rad). */
  phase: number;
  style: FigureStyle;
  /** Luz principal: lado (−1 izq., 1 der.) y si viene de arriba (sol alto). */
  lightX?: number;
  /** Intensidad del contraluz cálido en el borde (0–1). */
  rim?: number;
  rimColor?: RGB;
}

interface Joint {
  x: number;
  y: number;
}

function limb(ctx: CanvasRenderingContext2D, a: Joint, b: Joint, c: Joint, w0: number, w1: number, col: string): void {
  ctx.strokeStyle = col;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = w0;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.lineWidth = w1;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.stroke();
}

/** Punto a distancia `len` desde `o` con ángulo `ang` medido desde la vertical hacia abajo (positivo = hacia delante). */
function seg(o: Joint, len: number, ang: number, facing: number): Joint {
  return { x: o.x + Math.sin(ang) * len * facing, y: o.y + Math.cos(ang) * len };
}

/**
 * Figura humana estilizada pero proporcionada (≈7.5 cabezas), con pose de caminar, correr o
 * estar de pie. `x, yFeet` es el punto de apoyo; `h` la estatura en unidades de mundo.
 */
export function figure(ctx: CanvasRenderingContext2D, x: number, yFeet: number, h: number, o: FigureOptions): void {
  const s = o.style;
  const F = o.facing;
  const run = o.pose === 'run';
  const walk = o.pose === 'walk';
  const ph = o.phase;
  const lean = run ? 0.2 : walk ? 0.04 : 0;
  const bob = run ? Math.abs(Math.sin(ph)) * h * 0.03 : walk ? Math.abs(Math.sin(ph)) * h * 0.012 : 0;
  const hip: Joint = { x, y: yFeet - h * 0.53 - bob };
  const thigh = h * 0.25;
  const shin = h * 0.255;
  const torso = h * 0.3;
  const neck: Joint = { x: hip.x + Math.sin(lean) * torso * F, y: hip.y - Math.cos(lean) * torso };
  const shoulder: Joint = { x: neck.x - F * h * 0.006, y: neck.y + h * 0.025 };
  const headR = h * 0.062;
  const head: Joint = { x: neck.x + F * h * 0.012 + Math.sin(lean) * h * 0.05 * F, y: neck.y - h * 0.075 };

  const amp = run ? 0.95 : walk ? 0.42 : 0.04;
  const legAngles = (p: number) => {
    const th = amp * Math.sin(p);
    const knee = run ? 0.35 + 1.15 * Math.max(0, -Math.sin(p + 0.9)) : walk ? 0.08 + 0.5 * Math.max(0, -Math.sin(p + 0.7)) : 0.04;
    return { th, sh: th - knee };
  };
  const armAngles = (p: number) => {
    const up = run ? -0.85 * Math.sin(p) : walk ? -0.38 * Math.sin(p) : 0.08;
    const fore = run ? up + 1.55 : up + (walk ? 0.3 : 0.12);
    return { up, fore };
  };
  const skin = css(s.skin);
  const darkSkin = css(scale(s.skin, 0.72));
  const legCol = (far: boolean) => css(far ? scale(s.bottom, 0.68) : s.bottom);
  const shoeCol = (far: boolean) => css(far ? scale(s.shoes, 0.7) : s.shoes);

  const drawLeg = (p: number, far: boolean) => {
    const a = legAngles(p);
    const hp: Joint = { x: hip.x - F * (far ? h * 0.012 : -h * 0.012), y: hip.y };
    const knee = seg(hp, thigh, a.th, F);
    const ankle = seg(knee, shin, a.sh, F);
    const wT = h * 0.07;
    const wS = h * 0.052;
    if (s.legs === 'pants') {
      limb(ctx, hp, knee, ankle, wT, wS, legCol(far));
    } else {
      // Muslo con short, el resto piel (o media).
      const mid = { x: hp.x + (knee.x - hp.x) * 0.55, y: hp.y + (knee.y - hp.y) * 0.55 };
      limb(ctx, hp, mid, knee, wT * 1.08, wT * 0.92, far ? darkSkin : skin);
      limb(ctx, knee, { x: (knee.x + ankle.x) / 2, y: (knee.y + ankle.y) / 2 }, ankle, wS, wS * 0.85, far ? darkSkin : skin);
      if (s.socks) {
        const sk = { x: knee.x + (ankle.x - knee.x) * 0.45, y: knee.y + (ankle.y - knee.y) * 0.45 };
        limb(ctx, sk, { x: (sk.x + ankle.x) / 2, y: (sk.y + ankle.y) / 2 }, ankle, wS * 1.02, wS * 0.9, css(far ? scale(s.socks, 0.7) : s.socks));
      }
      ctx.strokeStyle = legCol(far);
      ctx.lineWidth = wT * 1.25;
      ctx.beginPath();
      ctx.moveTo(hp.x, hp.y - h * 0.01);
      ctx.lineTo(mid.x, mid.y);
      ctx.stroke();
    }
    // Zapato: apunta hacia delante, gira con la pierna.
    const footAng = a.sh - 1.5;
    const toe = seg(ankle, h * 0.075, footAng + Math.PI, F);
    ctx.strokeStyle = shoeCol(far);
    ctx.lineWidth = h * 0.034;
    ctx.beginPath();
    ctx.moveTo(ankle.x - F * h * 0.012, ankle.y + h * 0.012);
    ctx.lineTo(toe.x, toe.y + h * 0.008);
    ctx.stroke();
  };

  const drawArm = (p: number, far: boolean) => {
    const a = armAngles(p);
    const sh: Joint = { x: shoulder.x + (far ? -F : F) * h * 0.012, y: shoulder.y + h * 0.012 };
    const elbow = seg(sh, h * 0.165, a.up, F);
    const wrist = seg(elbow, h * 0.15, a.fore, F);
    const sleeve = css(far ? scale(s.top, 0.7) : s.top);
    if (s.sleeves === 'long') limb(ctx, sh, elbow, wrist, h * 0.05, h * 0.042, sleeve);
    else {
      limb(ctx, sh, elbow, wrist, h * 0.042, h * 0.036, far ? darkSkin : skin);
      const mid = { x: sh.x + (elbow.x - sh.x) * 0.5, y: sh.y + (elbow.y - sh.y) * 0.5 };
      ctx.strokeStyle = sleeve;
      ctx.lineWidth = h * 0.056;
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(mid.x, mid.y);
      ctx.stroke();
    }
    ctx.fillStyle = far ? darkSkin : skin;
    ellipse(ctx, wrist.x + Math.sin(a.fore) * F * h * 0.015, wrist.y + Math.cos(a.fore) * h * 0.015, h * 0.02, h * 0.024);
    ctx.fill();
  };

  // Lado lejano primero.
  drawArm(ph, true);
  drawLeg(ph + Math.PI, true);

  // Torso
  const hw = h * 0.105;
  const ww = h * 0.085;
  const tx = (v: number) => v;
  ctx.beginPath();
  ctx.moveTo(tx(shoulder.x - hw), shoulder.y + h * 0.02);
  ctx.quadraticCurveTo(shoulder.x, shoulder.y - h * 0.018, shoulder.x + hw, shoulder.y + h * 0.02);
  ctx.lineTo(hip.x + ww, hip.y + h * 0.02);
  ctx.lineTo(hip.x - ww, hip.y + h * 0.02);
  ctx.closePath();
  const lx = o.lightX ?? -0.6;
  ctx.fillStyle = linear(ctx, hip.x - hw, 0, hip.x + hw, 0, [
    [0, css(scale(s.top, lx < 0 ? 1.12 : 0.72))],
    [0.55, css(s.top)],
    [1, css(scale(s.top, lx < 0 ? 0.72 : 1.12))],
  ]);
  ctx.fill();
  if (s.stripe) {
    ctx.fillStyle = css(s.stripe);
    ctx.fillRect(Math.min(shoulder.x, hip.x) - hw * 0.15, shoulder.y + h * 0.05, hw * 0.3 + Math.abs(shoulder.x - hip.x), h * 0.11);
  }
  if (s.legs === 'skirt') {
    ctx.fillStyle = css(s.bottom);
    ctx.beginPath();
    ctx.moveTo(hip.x - ww, hip.y);
    ctx.lineTo(hip.x + ww, hip.y);
    ctx.lineTo(hip.x + ww * 1.6, hip.y + h * 0.2);
    ctx.lineTo(hip.x - ww * 1.6, hip.y + h * 0.2);
    ctx.closePath();
    ctx.fill();
  }
  if (s.bag) {
    ctx.fillStyle = css(s.bag);
    roundRect(ctx, hip.x - F * hw * 1.25, hip.y - h * 0.08, hw * 0.75, h * 0.1, h * 0.012);
    ctx.fill();
    ctx.strokeStyle = css(scale(s.bag, 0.6));
    ctx.lineWidth = h * 0.006;
    ctx.beginPath();
    ctx.moveTo(shoulder.x + F * hw * 0.5, shoulder.y);
    ctx.lineTo(hip.x - F * hw * 0.9, hip.y - h * 0.07);
    ctx.stroke();
  }

  // Cuello y cabeza
  ctx.strokeStyle = darkSkin;
  ctx.lineWidth = h * 0.035;
  ctx.beginPath();
  ctx.moveTo(neck.x, neck.y + h * 0.02);
  ctx.lineTo(head.x - F * h * 0.008, head.y + headR * 0.7);
  ctx.stroke();
  ctx.fillStyle = linear(ctx, head.x - headR, 0, head.x + headR, 0, [
    [0, css(scale(s.skin, lx < 0 ? 1.08 : 0.75))],
    [1, css(scale(s.skin, lx < 0 ? 0.75 : 1.08))],
  ]);
  ellipse(ctx, head.x, head.y, headR * 0.86, headR);
  ctx.fill();
  // Pelo: casquete hacia atrás de la cara.
  ctx.fillStyle = css(s.hair);
  ctx.beginPath();
  ctx.ellipse(head.x - F * headR * 0.15, head.y - headR * 0.25, headR * 0.92, headR * 0.82, 0, Math.PI * 0.95, Math.PI * 2.05);
  ctx.fill();
  if (s.hairLong) {
    ctx.beginPath();
    ctx.moveTo(head.x - F * headR * 0.2, head.y - headR * 0.6);
    ctx.quadraticCurveTo(head.x - F * headR * 1.25, head.y + headR * 0.4, head.x - F * headR * 0.9, head.y + headR * 1.9);
    ctx.lineTo(head.x - F * headR * 0.1, head.y + headR * 1.1);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(head.x - F * headR * 0.45, head.y - headR * 0.05, headR * 0.5, headR * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lado cercano
  drawLeg(ph, false);
  drawArm(ph + Math.PI, false);

  if (o.rim && o.rim > 0) {
    // Contraluz: borde cálido del lado de la luz sobre cabeza y hombros.
    const rc = o.rimColor ?? hex('#ffd59a');
    const side = lx < 0 ? -1 : 1;
    ctx.strokeStyle = css(rc, o.rim);
    ctx.lineWidth = h * 0.008;
    ctx.beginPath();
    ctx.ellipse(head.x, head.y, headR * 0.9, headR * 1.03, 0, side < 0 ? Math.PI * 0.6 : -Math.PI * 0.4, side < 0 ? Math.PI * 1.4 : Math.PI * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(shoulder.x + side * hw, shoulder.y + h * 0.02);
    ctx.lineTo(hip.x + side * ww, hip.y);
    ctx.stroke();
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

/** ¿El rectángulo [x, x+w]×[y, y+h] toca el lienzo? */
export function visible(f: PaintFrame, x: number, y: number, w: number, h: number): boolean {
  return x + w >= f.x0 && x <= f.x1 && y + h >= f.y0 && y <= f.y1;
}
