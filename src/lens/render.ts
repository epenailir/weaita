/**
 * Render en perspectiva estenopeica de la escena del laboratorio sobre un Canvas 2D.
 *
 * Proyección real sobre el sensor elegido: x = f·X/Z, y = f·Y/Z (mm en el sensor), que luego
 * se escala a píxeles con el ancho del sensor. La cámara mira en horizontal, así que las
 * verticales se mantienen paralelas y el horizonte cae en el centro del encuadre.
 * El orden de dibujo es el del pintor: cielo, suelo, montañas y objetos de lejos a cerca.
 */
import { HAZE_COLOR, SUN_AZIMUTH_RAD, applyHaze, hazeAmount, skyColor } from './atmosphere';
import { clamp01, css, hex, mix, shade } from './color';
import type { RGB } from './color';
import { fbm1D, ridged1D, seededRandom, valueNoise1D } from './noise';
import { CAMERA_HEIGHT_M, LENS_SCENE, PATH_HALF_WIDTH_M, PLAZA_START_M } from './scene';
import type { BuildingSpec, LampSpec, LensScene, MountainSpec, TreeSpec } from './scene';

/** Parámetros físicos de la toma. */
export interface LensShot {
  focalMm: number;
  /** Tamaño del sensor en mm. */
  sensorWidthMm: number;
  sensorHeightMm: number;
  /** Distancia horizontal de la cámara a los pies del sujeto (m). */
  cameraDistanceM: number;
}

type Vec3 = readonly [number, number, number];
type Pt = { x: number; y: number };

interface View {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  cx: number;
  cy: number;
  /** Focal × píxeles por mm de sensor: un objeto de 1 m a Z m mide fk/Z px. */
  fk: number;
  focalMm: number;
  pxPerMm: number;
  camX: number;
  camY: number;
  camZ: number;
}

const NEAR = 0.05;
const DEG = Math.PI / 180;

/* ------------------------------------------------------------------ proyección */

function project(v: View, x: number, y: number, z: number): Pt | null {
  const zr = z - v.camZ;
  if (zr < NEAR * 0.999) return null;
  const s = v.fk / Math.max(NEAR, zr);
  return { x: v.cx + (x - v.camX) * s, y: v.cy - (y - v.camY) * s };
}

/** Recorta un polígono contra el plano cercano (Sutherland–Hodgman). */
function clipNear(v: View, pts: readonly Vec3[]): Vec3[] {
  const zn = v.camZ + NEAR;
  const out: Vec3[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const ain = a[2] >= zn;
    const bin = b[2] >= zn;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (zn - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, zn]);
    }
  }
  return out;
}

/** Traza (sin rellenar) un polígono 3D ya recortado. Devuelve false si queda vacío. */
function tracePoly(v: View, pts: readonly Vec3[]): boolean {
  const clipped = clipNear(v, pts);
  if (clipped.length < 3) return false;
  const { ctx } = v;
  ctx.beginPath();
  clipped.forEach((p, i) => {
    // Tras el recorte, zr ≥ NEAR salvo error de redondeo
    const s = v.fk / Math.max(NEAR, p[2] - v.camZ);
    const x = v.cx + (p[0] - v.camX) * s;
    const y = v.cy - (p[1] - v.camY) * s;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  return true;
}

function fillPoly(v: View, pts: readonly Vec3[], fill: string | CanvasGradient) {
  if (!tracePoly(v, pts)) return;
  v.ctx.fillStyle = fill;
  v.ctx.fill();
}

/** Segmento 3D recortado contra el plano cercano. */
function line3(v: View, a: Vec3, b: Vec3): [Pt, Pt] | null {
  const zn = v.camZ + NEAR;
  let p = a;
  let q = b;
  if (p[2] < zn && q[2] < zn) return null;
  if (p[2] < zn) {
    const t = (zn - p[2]) / (q[2] - p[2]);
    p = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, zn];
  } else if (q[2] < zn) {
    const t = (zn - q[2]) / (p[2] - q[2]);
    q = [q[0] + (p[0] - q[0]) * t, q[1] + (p[1] - q[1]) * t, zn];
  }
  const pa = project(v, p[0], p[1], p[2]);
  const pb = project(v, q[0], q[1], q[2]);
  return pa && pb ? [pa, pb] : null;
}

/** Fila de pantalla del suelo (Y = 0) a cierta profundidad relativa. */
const groundRow = (v: View, zr: number) => v.cy + (v.camY * v.fk) / zr;

/* ------------------------------------------------------------------ cielo */

let skyBuffer: HTMLCanvasElement | null = null;
const SKY_W = 144;
const SKY_H = 72;

function drawSky(v: View) {
  if (typeof document === 'undefined') return;
  if (!skyBuffer) {
    skyBuffer = document.createElement('canvas');
    skyBuffer.width = SKY_W;
    skyBuffer.height = SKY_H;
  }
  const sctx = skyBuffer.getContext('2d');
  if (!sctx) return;
  const img = sctx.createImageData(SKY_W, SKY_H);
  const d = img.data;
  const skyRows = v.cy + 2;
  for (let j = 0; j < SKY_H; j++) {
    const py = ((j + 0.5) / SKY_H) * skyRows;
    const ys = (v.cy - py) / v.pxPerMm;
    for (let i = 0; i < SKY_W; i++) {
      const px = ((i + 0.5) / SKY_W) * v.w;
      const xs = (px - v.cx) / v.pxPerMm;
      // Dirección del rayo que llega a ese punto del sensor
      const az = Math.atan2(xs, v.focalMm);
      const el = Math.atan2(ys, Math.hypot(xs, v.focalMm));
      const c = skyColor(az, el);
      const k = (j * SKY_W + i) * 4;
      d[k] = c[0];
      d[k + 1] = c[1];
      d[k + 2] = c[2];
      d[k + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);
  const { ctx } = v;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(skyBuffer, 0, 0, SKY_W, SKY_H, 0, 0, v.w, skyRows);
}

/** Estratos altos iluminados por el sol poniente (a 2–4 km de altura y 7–30 km de distancia). */
const CLOUDS = (() => {
  const rnd = seededRandom(97);
  return Array.from({ length: 16 }, () => ({
    x: (rnd() - 0.55) * 52000,
    y: 2300 + rnd() * 2400,
    z: 7000 + rnd() * 24000,
    w: 2500 + rnd() * 6000,
    t: 140 + rnd() * 220,
    a: 0.22 + rnd() * 0.3,
  }));
})();

function drawClouds(v: View) {
  const { ctx } = v;
  for (const c of CLOUDS) {
    const p = project(v, c.x, c.y, c.z);
    if (!p) continue;
    const s = v.fk / (c.z - v.camZ);
    const rx = (c.w / 2) * s;
    const ry = Math.max(0.6, (c.t / 2) * s);
    if (p.x + rx < 0 || p.x - rx > v.w || p.y + ry < 0 || p.y - ry > v.cy) continue;
    const az = Math.atan2(c.x - v.camX, c.z - v.camZ);
    const lit = Math.exp(-(((az - SUN_AZIMUTH_RAD) / (40 * DEG)) ** 2));
    const col = mix(hex('#c9b6c4'), hex('#ffb98c'), 0.35 + 0.6 * lit);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, css(col, c.a));
    g.addColorStop(0.55, css(col, c.a * 0.45));
    g.addColorStop(1, css(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ suelo */

const GRASS = hex('#2d3b2b');
const PAVING = hex('#5d5a58');
const PLAZA = hex('#6a6560');
const CURB = hex('#8a8580');

/** Degradado vertical para superficies del suelo: cada fila corresponde a una distancia. */
function groundGradient(v: View, base: RGB): CanvasGradient {
  const g = v.ctx.createLinearGradient(0, v.cy, 0, v.h);
  const N = 20;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) ** 2;
    const dy = (v.h - v.cy) * t;
    const zr = dy > 0.01 ? (v.fk * v.camY) / dy : 1e7;
    // Más oscuro cerca de la cámara (sin luz del cielo rasante)
    const near = clamp01(1 - zr / 30);
    g.addColorStop(t, css(applyHaze(shade(base, 1 - 0.18 * near), zr)));
  }
  return g;
}

function drawGroundBase(v: View) {
  v.ctx.fillStyle = groundGradient(v, GRASS);
  v.ctx.fillRect(0, v.cy, v.w, v.h - v.cy);
}

/** Opacidad de detalles repetidos según su separación en pantalla (evita el muaré). */
const fadeBySpacing = (px: number, full = 6) => clamp01((px - 1.2) / full);

function drawGroundDetails(v: View) {
  const { ctx } = v;
  const zStart = v.camZ + NEAR;
  const W = 600;

  // Franjas de césped segado cada 4 m: se comprimen con el tele visto de lejos
  for (let z0 = Math.floor(zStart / 8) * 8; z0 < PLAZA_START_M; z0 += 8) {
    const za = Math.max(z0, zStart);
    const zb = z0 + 4;
    if (zb <= za) continue;
    const ya = groundRow(v, za - v.camZ);
    const yb = groundRow(v, zb - v.camZ);
    const fade = fadeBySpacing(ya - yb, 4);
    if (fade <= 0) continue;
    fillPoly(v, [[-W, 0, za], [W, 0, za], [W, 0, zb], [-W, 0, zb]], `rgba(8,14,9,${(0.2 * fade).toFixed(3)})`);
  }

  // Plaza pavimentada frente a los edificios
  fillPoly(v, [[-W, 0, PLAZA_START_M], [W, 0, PLAZA_START_M], [W, 0, 140], [-W, 0, 140]], groundGradient(v, PLAZA));

  // Paseo y bordillos
  const hw = PATH_HALF_WIDTH_M;
  fillPoly(v, [[-hw, 0, zStart], [hw, 0, zStart], [hw, 0, PLAZA_START_M], [-hw, 0, PLAZA_START_M]], groundGradient(v, PAVING));
  const curb = groundGradient(v, CURB);
  fillPoly(v, [[hw, 0, zStart], [hw + 0.14, 0, zStart], [hw + 0.14, 0, PLAZA_START_M], [hw, 0, PLAZA_START_M]], curb);
  fillPoly(v, [[-hw - 0.14, 0, zStart], [-hw, 0, zStart], [-hw, 0, PLAZA_START_M], [-hw - 0.14, 0, PLAZA_START_M]], curb);

  // Juntas de las losetas: transversales cada 1,5 m y dos longitudinales
  ctx.lineCap = 'butt';
  const step = 1.5;
  for (let z = Math.ceil(zStart / step) * step; z < PLAZA_START_M; z += step) {
    const zr = z - v.camZ;
    const spacing = groundRow(v, zr) - groundRow(v, zr + step);
    const fade = fadeBySpacing(spacing);
    if (fade <= 0) break;
    const seg = line3(v, [-hw, 0, z], [hw, 0, z]);
    if (!seg) continue;
    ctx.strokeStyle = `rgba(20,20,22,${(0.34 * fade).toFixed(3)})`;
    ctx.lineWidth = Math.min(2.2, Math.max(0.6, (0.02 * v.fk) / zr));
    ctx.beginPath();
    ctx.moveTo(seg[0].x, seg[0].y);
    ctx.lineTo(seg[1].x, seg[1].y);
    ctx.stroke();
  }
  for (const x of [-hw / 3, hw / 3]) {
    const seg = line3(v, [x, 0, zStart], [x, 0, PLAZA_START_M]);
    if (!seg) continue;
    const g = ctx.createLinearGradient(0, seg[0].y, 0, seg[1].y);
    g.addColorStop(0, 'rgba(20,20,22,0.4)');
    g.addColorStop(1, 'rgba(20,20,22,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(0.6, Math.min(2, 0.0015 * v.fk));
    ctx.beginPath();
    ctx.moveTo(seg[0].x, seg[0].y);
    ctx.lineTo(seg[1].x, seg[1].y);
    ctx.stroke();
  }
}

/** Elipse sobre el suelo (proyectada en perspectiva). */
function groundEllipse(v: View, x: number, z: number, rx: number, rz: number, paint: (r: number) => string | CanvasGradient) {
  const zr = z - v.camZ;
  if (zr - rz < 0.3) return;
  const c = project(v, x, 0, z);
  if (!c) return;
  const yn = groundRow(v, zr - rz);
  const yf = groundRow(v, zr + rz);
  const rxp = (rx * v.fk) / zr;
  const ryp = Math.max(0.3, (yn - yf) / 2);
  const cyE = (yn + yf) / 2;
  if (c.x + rxp < 0 || c.x - rxp > v.w || cyE - ryp > v.h) return;
  const { ctx } = v;
  ctx.save();
  ctx.translate(c.x, cyE);
  ctx.scale(1, ryp / rxp);
  ctx.fillStyle = paint(rxp);
  ctx.beginPath();
  ctx.arc(0, 0, rxp, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function softShadow(v: View, x: number, z: number, rx: number, rz: number, alpha: number) {
  groundEllipse(v, x, z, rx, rz, (r) => {
    const g = v.ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(5,7,10,${alpha})`);
    g.addColorStop(1, 'rgba(5,7,10,0)');
    return g;
  });
}

/* ------------------------------------------------------------------ montañas */

export function ridgeHeight(m: MountainSpec, x: number): number {
  const n = m.ridged ? ridged1D(x / m.wavelength, m.seed) : fbm1D(x / m.wavelength, m.seed);
  const env = 0.4 + 0.6 * valueNoise1D(x / (m.wavelength * 3.3), m.seed + 7);
  return m.base + m.amp * n * env;
}

function drawMountain(v: View, m: MountainSpec) {
  const { ctx } = v;
  const zr = m.z - v.camZ;
  const s = v.fk / zr;
  const halfW = v.w / 2 / s + 200;
  const x0 = v.camX - halfW;
  const n = Math.max(48, Math.ceil(v.w / 2.5));
  const baseY = groundRow(v, zr) + 2;
  const xs: number[] = [];
  const ys: number[] = [];
  let top = baseY;
  for (let i = 0; i <= n; i++) {
    const X = x0 + (2 * halfW * i) / n;
    const Y = ridgeHeight(m, X);
    const py = v.cy - (Y - v.camY) * s;
    xs.push(v.cx + (X - v.camX) * s);
    ys.push(py);
    if (py < top) top = py;
  }
  if (top > v.h) return;
  const haze = hazeAmount(zr);
  const elev = Math.atan((m.base + m.amp * 0.4 - v.camY) / zr);
  const upper = mix(m.color, skyColor(0, elev), haze * 0.9);
  const lower = mix(m.color, HAZE_COLOR, Math.min(1, haze * 1.2 + 0.06));
  const g = ctx.createLinearGradient(0, top, 0, baseY);
  g.addColorStop(0, css(upper));
  g.addColorStop(1, css(lower));
  ctx.beginPath();
  ctx.moveTo(xs[0]!, baseY);
  for (let i = 0; i <= n; i++) ctx.lineTo(xs[i]!, ys[i]!);
  ctx.lineTo(xs[n]!, baseY);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();

  if (m.snowLine !== null) {
    // Nieve por encima de la cota: banda entre la cresta y la cota
    const snowY = v.cy - (m.snowLine - v.camY) * s;
    const snow = mix(hex('#eef0f6'), skyColor(0, elev), haze * 0.75);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) ctx.lineTo(xs[i]!, Math.min(ys[i]!, snowY));
    for (let i = n; i >= 0; i--) ctx.lineTo(xs[i]!, snowY);
    ctx.closePath();
    const sg = ctx.createLinearGradient(0, top, 0, snowY);
    sg.addColorStop(0, css(snow, 0.9));
    sg.addColorStop(1, css(snow, 0.15));
    ctx.fillStyle = sg;
    ctx.fill();
  }
}

/* ------------------------------------------------------------------ edificios */

const GLOW_WARM = hex('#ffb37a');
const WINDOW_LIT = hex('#ffcf86');
const WINDOW_DARK = hex('#1c2331');
const SKY_REFLECTION = hex('#3c5078');
const SHOP_LIGHT = hex('#f7c47c');

function drawBuilding(v: View, b: BuildingSpec) {
  const { ctx } = v;
  const zr = b.z - v.camZ;
  if (zr < 1) return;
  const s = v.fk / zr;
  const xl = v.cx + (b.x0 - v.camX) * s;
  const xr = v.cx + (b.x1 - v.camX) * s;
  const yTop = v.cy - (b.height - v.camY) * s;
  const yBot = v.cy + v.camY * s;
  const haze = hazeAmount(zr);
  const fog = (c: RGB) => mix(c, HAZE_COLOR, haze);

  // Cara lateral visible (la del lado de la cámara)
  const sideX = v.camX < b.x0 ? b.x0 : v.camX > b.x1 ? b.x1 : null;
  if (sideX !== null) {
    const far = project(v, sideX, 0, b.z + b.depth);
    const near = project(v, sideX, 0, b.z);
    const minX = Math.min(far?.x ?? xl, near?.x ?? xl);
    const maxX = Math.max(far?.x ?? xr, near?.x ?? xr);
    if (maxX >= 0 && minX <= v.w) {
      const lit = sideX === b.x0; // mira hacia la izquierda, hacia el resplandor del ocaso
      const sideColor = lit ? shade(mix(b.color, GLOW_WARM, 0.16), 1.12) : shade(b.color, 0.7);
      fillPoly(
        v,
        [
          [sideX, 0, b.z],
          [sideX, b.height, b.z],
          [sideX, b.height, b.z + b.depth],
          [sideX, 0, b.z + b.depth],
        ],
        css(fog(sideColor)),
      );
    }
  }

  if (xr < 0 || xl > v.w || yTop > v.h) return;

  // Fachada con luz cenital (más clara arriba)
  const g = ctx.createLinearGradient(0, yTop, 0, yBot);
  g.addColorStop(0, css(fog(shade(b.color, 1.12))));
  g.addColorStop(1, css(fog(shade(b.color, 0.82))));
  ctx.fillStyle = g;
  ctx.fillRect(xl, yTop, xr - xl, yBot - yTop);
  // Cornisa
  ctx.fillStyle = css(fog(shade(b.color, 1.3)));
  ctx.fillRect(xl, yTop, xr - xl, Math.max(0.6, 0.35 * s));

  // Forjados: solo cuando cada planta mide bastantes píxeles (teles)
  if (b.floorH * s > 14) {
    ctx.fillStyle = css(fog(shade(b.color, 0.78)), 0.75);
    const lh = Math.max(1, 0.18 * s);
    for (let y = b.floorH; y < b.height - 0.5; y += b.floorH) {
      ctx.fillRect(xl, v.cy - (y - v.camY) * s - lh / 2, xr - xl, lh);
    }
  }

  const width = b.x1 - b.x0;
  const winW = Math.min(1.3, ((width - 1.6) / b.cols) * 0.55);
  const winH = Math.min(1.6, b.floorH - 1.2);
  const winPx = winW * s;
  const floors = Math.floor((b.height - 0.8) / b.floorH);
  const firstFloor = b.shop ? 1 : 0;

  if (winPx < 1) {
    // Ventanas por debajo del píxel: solo su luz media
    ctx.fillStyle = css(fog(WINDOW_LIT), 0.1 * b.litRatio * 2);
    ctx.fillRect(xl, yTop, xr - xl, yBot - yTop);
  } else {
    const rnd = seededRandom(b.seed);
    const slot = (width - 1.6) / b.cols;
    for (let f = firstFloor; f < floors; f++) {
      const wy = f * b.floorH + 0.95;
      for (let c = 0; c < b.cols; c++) {
        const lit = rnd() < b.litRatio;
        const tone = 0.72 + rnd() * 0.35;
        const wx = b.x0 + 0.8 + slot * (c + 0.5) - winW / 2;
        const px = v.cx + (wx - v.camX) * s;
        const py = v.cy - (wy + winH - v.camY) * s;
        if (px > v.w || px + winPx < 0) continue;
        const col = lit ? shade(WINDOW_LIT, tone) : mix(WINDOW_DARK, SKY_REFLECTION, 0.25 + 0.25 * (1 - f / Math.max(1, floors)));
        ctx.fillStyle = css(fog(col));
        ctx.fillRect(px, py, winPx, winH * s);
      }
    }
  }

  if (b.shop) {
    // Escaparate iluminado en planta baja
    const sx0 = v.cx + (b.x0 + 0.6 - v.camX) * s;
    const sx1 = v.cx + (b.x1 - 0.6 - v.camX) * s;
    const sy0 = v.cy - (3 - v.camY) * s;
    const sy1 = v.cy - (0.25 - v.camY) * s;
    const sg = ctx.createLinearGradient(0, sy0, 0, sy1);
    sg.addColorStop(0, css(fog(shade(SHOP_LIGHT, 0.95))));
    sg.addColorStop(1, css(fog(shade(SHOP_LIGHT, 0.7))));
    ctx.fillStyle = sg;
    ctx.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
    if (2.4 * s > 6) {
      ctx.fillStyle = css(fog(shade(b.color, 0.55)));
      const mullW = Math.max(1, 0.12 * s);
      for (let x = b.x0 + 0.6 + 2.4; x < b.x1 - 0.8; x += 2.4) {
        ctx.fillRect(v.cx + (x - v.camX) * s - mullW / 2, sy0, mullW, sy1 - sy0);
      }
      // Toldo
      ctx.fillStyle = css(fog(shade(b.color, 0.6)));
      ctx.fillRect(sx0 - 0.2 * s, sy0 - 0.35 * s, sx1 - sx0 + 0.4 * s, 0.35 * s);
    }
  }
}

/* ------------------------------------------------------------------ árboles y farolas */

const TRUNK = hex('#3a2f27');

function drawTree(v: View, t: TreeSpec) {
  const zr = t.z - v.camZ;
  if (zr < 0.8) return;
  const s = v.fk / zr;
  const base = project(v, t.x, 0, t.z);
  if (!base) return;
  const reach = (t.crown * 1.8 + 0.5) * s;
  if (base.x + reach < 0 || base.x - reach > v.w) return;
  const { ctx } = v;
  const haze = hazeAmount(zr);
  const fog = (c: RGB) => mix(c, HAZE_COLOR, haze);
  const crownY = t.height - t.crown;

  // Tronco
  const tw = Math.max(0.8, 0.32 * s);
  ctx.fillStyle = css(fog(TRUNK));
  ctx.fillRect(base.x - tw / 2, base.y - crownY * s, tw, crownY * s);

  // Copa: masa oscura de fondo y lóbulos con algo de volumen (luz suave desde la izquierda)
  const cr = t.crown * s;
  const ccx = base.x;
  const ccy = base.y - crownY * s;
  ctx.fillStyle = css(fog(shade(t.tone, 0.55)));
  ctx.beginPath();
  ctx.ellipse(ccx, ccy + cr * 0.08, cr * 1.12, cr * 1.02, 0, 0, Math.PI * 2);
  ctx.fill();
  const lit = fog(shade(mix(t.tone, GLOW_WARM, 0.08), 1.18));
  const mid = fog(t.tone);
  const dark = fog(shade(t.tone, 0.6));
  for (const l of t.lobes) {
    const cx = base.x + l.dx * s;
    const cy = base.y - (crownY + l.dy) * s;
    const r = Math.max(0.8, l.r * s);
    const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.05, cx, cy, r * 1.05);
    g.addColorStop(0, css(lit));
    g.addColorStop(0.55, css(mid));
    g.addColorStop(1, css(dark));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

const POLE = hex('#1c2027');
const LAMP_LIGHT = hex('#ffe0a6');

function drawLamp(v: View, l: LampSpec) {
  const zr = l.z - v.camZ;
  if (zr < 0.6) return;
  const s = v.fk / zr;
  const base = project(v, l.x, 0, l.z);
  if (!base) return;
  if (base.x + 2 * s < 0 || base.x - 2 * s > v.w) return;
  const { ctx } = v;
  const haze = hazeAmount(zr);
  const fog = (c: RGB) => mix(c, HAZE_COLOR, haze);
  const pw = Math.max(0.7, 0.11 * s);
  const topY = base.y - l.height * s;
  // Poste y brazo hacia el paseo
  const dir = l.x < 0 ? 1 : -1;
  ctx.fillStyle = css(fog(POLE));
  ctx.fillRect(base.x - pw / 2, topY, pw, l.height * s);
  ctx.fillRect(base.x - pw * 0.9, base.y - 0.5 * s, pw * 1.8, 0.5 * s);
  const armEnd = base.x + dir * 0.45 * s;
  ctx.fillRect(Math.min(base.x, armEnd), topY, Math.abs(armEnd - base.x), Math.max(0.6, 0.06 * s));
  // Farol
  const hx = armEnd;
  const hy = topY + 0.12 * s;
  ctx.fillStyle = css(fog(LAMP_LIGHT));
  ctx.beginPath();
  ctx.ellipse(hx, hy, Math.max(0.8, 0.16 * s), Math.max(0.6, 0.1 * s), 0, 0, Math.PI * 2);
  ctx.fill();
  // Halo: la dispersión en la atmósfera y en la óptica es angular, así que no crece sin
  // límite con la ampliación del tele.
  const gr = Math.min(1.1 * s, 0.045 * v.w + 0.12 * s);
  if (gr > 1.5) {
    const prev = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, gr);
    g.addColorStop(0, `rgba(255,214,150,${(0.42 * (1 - haze)).toFixed(3)})`);
    g.addColorStop(0.35, `rgba(255,190,120,${(0.12 * (1 - haze)).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,180,110,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(hx, hy, gr, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = prev;
  }
}

function drawLampPools(v: View, lamps: LampSpec[]) {
  const prev = v.ctx.globalCompositeOperation;
  v.ctx.globalCompositeOperation = 'lighter';
  for (const l of lamps) {
    groundEllipse(v, l.x * 0.7, l.z, 2.6, 2.6, (r) => {
      const g = v.ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, 'rgba(255,196,120,0.2)');
      g.addColorStop(1, 'rgba(255,196,120,0)');
      return g;
    });
  }
  v.ctx.globalCompositeOperation = prev;
}

/* ------------------------------------------------------------------ persona */

const SKIN = hex('#d6a98a');
const SKIN_SHADE = hex('#b4836a');
const HAIR = hex('#2a1d18');
const COAT = hex('#b8553c');
const COAT_DARK = hex('#7f3726');
const SCARF = hex('#3f8c86');
const TROUSERS = hex('#29313e');
const SHOES = hex('#14161a');

/** Persona de 1.75 m dibujada de frente (plano a Z = 0, coordenadas locales en metros). */
function drawPerson(v: View) {
  const zr = -v.camZ;
  if (zr < 0.3) return;
  const s = v.fk / zr;
  const o = project(v, 0, 0, 0);
  if (!o) return;
  const { ctx } = v;
  const haze = hazeAmount(zr);
  const fog = (c: RGB) => mix(c, HAZE_COLOR, haze);
  const X = (x: number) => o.x + x * s;
  const Y = (y: number) => o.y - y * s;
  const poly = (pts: ReadonlyArray<readonly [number, number]>) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(X(x), Y(y)) : ctx.lineTo(X(x), Y(y))));
    ctx.closePath();
  };
  /** Luz lateral: más clara a la izquierda (resplandor del ocaso), más oscura a la derecha. */
  const side = (c: RGB) => {
    const g = ctx.createLinearGradient(X(-0.28), 0, X(0.28), 0);
    g.addColorStop(0, css(fog(shade(mix(c, GLOW_WARM, 0.12), 1.16))));
    g.addColorStop(0.5, css(fog(c)));
    g.addColorStop(1, css(fog(shade(c, 0.7))));
    return g;
  };
  const ellipse = (x: number, y: number, rx: number, ry: number) => {
    ctx.beginPath();
    ctx.ellipse(X(x), Y(y), rx * s, ry * s, 0, 0, Math.PI * 2);
  };

  // Piernas y zapatos
  ctx.fillStyle = side(TROUSERS);
  poly([[-0.17, 0.92], [-0.015, 0.92], [-0.04, 0.07], [-0.13, 0.07]]);
  ctx.fill();
  poly([[0.015, 0.92], [0.17, 0.92], [0.13, 0.07], [0.04, 0.07]]);
  ctx.fill();
  ctx.fillStyle = css(fog(SHOES));
  ellipse(-0.09, 0.04, 0.07, 0.04);
  ctx.fill();
  ellipse(0.09, 0.04, 0.07, 0.04);
  ctx.fill();

  // Mangas (detrás del abrigo) y manos
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.1 * s;
  ctx.strokeStyle = side(shade(COAT, 0.92));
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(X(d * 0.205), Y(1.39));
    ctx.lineTo(X(d * 0.258), Y(1.1));
    ctx.lineTo(X(d * 0.255), Y(0.9));
    ctx.stroke();
  }
  ctx.fillStyle = side(SKIN);
  ellipse(-0.255, 0.835, 0.042, 0.05);
  ctx.fill();
  ellipse(0.255, 0.835, 0.042, 0.05);
  ctx.fill();

  // Abrigo
  ctx.fillStyle = side(COAT);
  poly([
    [-0.075, 1.49],
    [-0.2, 1.455],
    [-0.235, 1.39],
    [-0.222, 1.05],
    [-0.212, 0.78],
    [0.212, 0.78],
    [0.222, 1.05],
    [0.235, 1.39],
    [0.2, 1.455],
    [0.075, 1.49],
  ]);
  ctx.fill();
  ctx.strokeStyle = css(fog(COAT_DARK));
  ctx.lineWidth = Math.max(0.5, 0.014 * s);
  ctx.beginPath();
  ctx.moveTo(X(0.005), Y(1.38));
  ctx.lineTo(X(0.005), Y(0.79));
  ctx.moveTo(X(-0.07), Y(1.47));
  ctx.lineTo(X(0.0), Y(1.33));
  ctx.lineTo(X(0.07), Y(1.47));
  ctx.moveTo(X(-0.21), Y(1.0));
  ctx.lineTo(X(-0.12), Y(1.0));
  ctx.stroke();

  // Cuello, bufanda y cabeza
  ctx.fillStyle = css(fog(SKIN_SHADE));
  ctx.fillRect(X(-0.038), Y(1.535), 0.076 * s, 0.08 * s);
  ctx.fillStyle = side(SCARF);
  poly([[-0.092, 1.505], [0.092, 1.505], [0.082, 1.43], [-0.082, 1.43]]);
  ctx.fill();
  poly([[0.018, 1.445], [0.078, 1.445], [0.072, 1.2], [0.03, 1.2]]);
  ctx.fill();
  ctx.fillStyle = side(HAIR);
  ellipse(0, 1.655, 0.09, 0.095);
  ctx.fill();
  ctx.fillStyle = side(SKIN);
  ellipse(0, 1.612, 0.077, 0.097);
  ctx.fill();
  ctx.fillStyle = side(HAIR);
  poly([[-0.088, 1.655], [-0.03, 1.71], [0.05, 1.705], [0.088, 1.655], [0.09, 1.7], [0.0, 1.752], [-0.09, 1.705]]);
  ctx.fill();
}

/* ------------------------------------------------------------------ API */

export interface ScreenBox {
  /** Coordenadas normalizadas (0–1) respecto del encuadre. */
  x: number;
  y: number;
  w: number;
  h: number;
}

function makeView(ctx: CanvasRenderingContext2D, w: number, h: number, shot: LensShot): View {
  const pxPerMm = w / shot.sensorWidthMm;
  return {
    ctx,
    w,
    h,
    cx: w / 2,
    cy: h / 2,
    fk: shot.focalMm * pxPerMm,
    focalMm: shot.focalMm,
    pxPerMm,
    camX: 0,
    camY: CAMERA_HEIGHT_M,
    camZ: -shot.cameraDistanceM,
  };
}

/**
 * Posición del rostro del sujeto en el encuadre (normalizada), para superponer el recuadro
 * de enfoque al ojo. Usa la misma proyección que el render.
 */
export function faceBox(shot: LensShot): ScreenBox {
  const d = shot.cameraDistanceM;
  const sx = shot.focalMm / shot.sensorWidthMm / d; // fracción del ancho por metro
  const sy = shot.focalMm / shot.sensorHeightMm / d;
  const cy = 0.5 - (1.615 - CAMERA_HEIGHT_M) * sy;
  return { x: 0.5 - 0.11 * sx, y: cy - 0.13 * sy, w: 0.22 * sx, h: 0.26 * sy };
}

/** Dibuja la escena completa. `width` y `height` en píxeles físicos del canvas. */
export function renderLensScene(ctx: CanvasRenderingContext2D, width: number, height: number, shot: LensShot, scene: LensScene = LENS_SCENE): void {
  const v = makeView(ctx, width, height, shot);
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  drawSky(v);
  drawClouds(v);
  drawGroundBase(v);
  for (const m of scene.mountains) drawMountain(v, m);
  drawGroundDetails(v);
  drawLampPools(v, scene.lamps);

  // Sombras de contacto
  for (const t of scene.trees) softShadow(v, t.x + 0.4, t.z + 0.3, t.crown * 1.1, t.crown * 0.9, 0.32);
  softShadow(v, 0.05, 0.05, 0.42, 0.3, 0.5);

  // Objetos de lejos a cerca (algoritmo del pintor)
  const items: Array<{ z: number; draw: () => void }> = [];
  for (const b of scene.buildings) items.push({ z: b.z, draw: () => drawBuilding(v, b) });
  for (const t of scene.trees) items.push({ z: t.z, draw: () => drawTree(v, t) });
  for (const l of scene.lamps) items.push({ z: l.z, draw: () => drawLamp(v, l) });
  items.push({ z: 0, draw: () => drawPerson(v) });
  items.sort((a, b) => b.z - a.z);
  for (const it of items) it.draw();
  ctx.restore();
}
