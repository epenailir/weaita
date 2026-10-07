/**
 * Paisaje de montaña al mediodía: cordilleras con nieve y bruma azul (2–9 km), lago con su
 * reflejo, un islote con pinos jóvenes en el plano medio (12 m), rocas de granito como sujeto
 * en la orilla y pastos con flores en primer plano. El reto es tenerlo todo nítido (hiperfocal).
 *
 * El reflejo de las montañas se pinta en la capa de las montañas: ópticamente la imagen
 * reflejada está a la misma distancia que el objeto, así que se desenfoca igual que él.
 */
import type { SimScene } from '../types';
import {
  blobPath,
  css,
  ellipse,
  fillFrame,
  grain,
  grassTufts,
  groundY,
  hex,
  kelvinLight,
  linear,
  mix,
  rand,
  ridge,
  sampleRidge,
  scale,
  sizer,
  softDot,
} from './kit';
import type { RGB, Rand } from './kit';
import type { Emitter, PaintFrame, ScenePainter } from './types';

const HZ = -0.06;
const CAM_H = 1.6;
/** Distancia de la orilla cercana (m): más acá hay guijarros, más allá agua. */
const SHORE_M = 5;
/** Distancia del islote con pinos (plano medio decorativo). */
const ISLET_M = 12;

interface Range {
  d: number;
  /** Altura de las cumbres sobre el lago (m). */
  peakM: number;
  levels: number;
  seed: number;
  rough: number;
  rock: RGB;
  shadow: RGB;
  haze: number;
  snowLine: number;
}

/**
 * Conífera natural: tronco, ramas que caen en pisos y racimos de agujas con luz desde la
 * izquierda. `x, base` es el pie del tronco; `h` la altura total.
 */
function conifer(ctx: CanvasRenderingContext2D, x: number, base: number, h: number, r: Rand, px: number, dark: RGB, lit: RGB): void {
  const w = h * r.range(0.32, 0.4);
  ctx.strokeStyle = '#3a2a20';
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(px, h * 0.025);
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x + h * 0.004, base - h * 0.97);
  ctx.stroke();
  const tiers = Math.max(6, Math.min(22, Math.round(h / (px * 6))));
  const clumpR = Math.max(px * 0.8, h * 0.026);
  for (let i = 0; i < tiers; i++) {
    const t = (i + 0.5) / tiers;
    const y = base - h + h * 0.88 * t;
    const half = (w / 2) * Math.pow(t, 0.85) * r.range(0.8, 1.15);
    for (const side of [-1, 1]) {
      // Rama que cae y racimos a lo largo
      const ex = x + side * half;
      const ey = y + h * 0.05 * t;
      ctx.strokeStyle = css(scale(dark, 0.8));
      ctx.lineWidth = Math.max(px * 0.7, h * 0.008);
      ctx.beginPath();
      ctx.moveTo(x, y - h * 0.01);
      ctx.quadraticCurveTo(x + side * half * 0.5, y - h * 0.015, ex, ey);
      ctx.stroke();
      const n = 2 + Math.round(t * 4);
      for (let k = 0; k < n; k++) {
        const f = (k + 1) / (n + 0.3);
        const cx = x + side * half * f;
        const cy = y + h * 0.05 * t * f * f + (r() - 0.6) * h * 0.02;
        const lit01 = Math.max(0, Math.min(1, 0.55 - side * 0.35 * f + (r() - 0.5) * 0.4 - t * 0.2));
        ctx.fillStyle = css(mix(dark, lit, lit01));
        ellipse(ctx, cx, cy, clumpR * r.range(0.9, 1.5), clumpR * r.range(0.55, 0.85), side * r.range(0.1, 0.4));
        ctx.fill();
      }
    }
    // Puntas iluminadas del lado del sol
    ctx.fillStyle = css(mix(lit, hex('#c9d98a'), 0.35), 0.8);
    ellipse(ctx, x - half * r.range(0.6, 0.95), y + h * 0.04 * t, clumpR * 0.7, clumpR * 0.4);
    ctx.fill();
  }
  // Ápice
  ctx.fillStyle = css(mix(dark, lit, 0.4));
  ctx.beginPath();
  ctx.moveTo(x, base - h);
  ctx.lineTo(x + w * 0.06, base - h * 0.9);
  ctx.lineTo(x - w * 0.06, base - h * 0.9);
  ctx.closePath();
  ctx.fill();
}

export function landscapePainter(scene: SimScene): ScenePainter {
  const REF = scene.refFocalMm;
  const u = sizer(REF);
  const gy = (d: number) => groundY(HZ, REF, CAM_H, d);
  const SUBJ = scene.lighting.subjectDistanceM;
  const FG = scene.lighting.foregroundDistanceM ?? 1.5;
  const BG = scene.lighting.backgroundDistanceM;
  const sunGlint = kelvinLight(5800);

  const ranges: Range[] = [
    { d: 9000, peakM: 2700, levels: 8, seed: 31, rough: 0.52, rock: hex('#93a6c4'), shadow: hex('#7d90b2'), haze: 0.62, snowLine: 0.55 },
    { d: BG, peakM: Math.min(640, BG * 0.32), levels: 9, seed: 47, rough: 0.56, rock: hex('#76716f'), shadow: hex('#40465a'), haze: 0.25, snowLine: 0.55 },
  ];
  const ridges = ranges.map((rg) => ridge(rg.seed, rg.levels, 1, rg.rough));
  const X0 = -2.6;
  const X1 = 2.6;
  /** Altura (m) del perfil de una cordillera en x. */
  const rangeHeight = (i: number, x: number) => {
    const rg = ranges[i]!;
    const h = sampleRidge(ridges[i]!, X0, X1, x);
    // Picos marcados: realza los máximos y aplana los valles.
    const shaped = 0.55 + h * 0.9 + 0.25 * Math.sin(x * 2.1 + i);
    return rg.peakM * Math.max(0.08, Math.min(1.15, shaped));
  };
  const forestRidge = ridge(63, 9, 1, 0.6);

  /* ---------------------------------------------------------------- Cielo */
  function paintSky(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    fillFrame(
      ctx,
      f,
      linear(ctx, 0, -1.0, 0, HZ, [
        [0, '#1f5aa8'],
        [0.45, '#4f8ccc'],
        [0.85, '#a9cbe8'],
        [1, '#d5e5f1'],
      ]),
    );
    // Cúmulos: masas blancas con base gris azulada
    const r = rand(5150);
    for (let c = 0; c < 9; c++) {
      const cx = r.range(-2.2, 2.2);
      const cy = r.range(-0.95, -0.5);
      const w = r.range(0.18, 0.42);
      for (let i = 0; i < 26; i++) {
        const px = cx + r.normal() * w * 0.45;
        const py = cy - Math.abs(r.normal()) * w * 0.22;
        const rr = w * r.range(0.12, 0.28);
        const shade = Math.min(1, Math.max(0, (py - cy) / (w * 0.15) + 0.5));
        softDot(ctx, px, py, rr, mix(hex('#ffffff'), hex('#b4c4d8'), shade), 0.8, 0.45);
      }
      ctx.save();
      ctx.translate(cx, cy + w * 0.04);
      ctx.scale(1, 0.18);
      softDot(ctx, 0, 0, w * 0.8, hex('#a9b8cc'), 0.5, 0.3);
      ctx.restore();
    }
  }

  /* ---------------------------------------------------------------- Montañas + reflejo */
  function paintRanges(ctx: CanvasRenderingContext2D, f: PaintFrame, mirror: boolean): void {
    const step = Math.max(f.px * 2, 0.003);
    const x0 = Math.max(X0, f.x0 - 0.05);
    const x1 = Math.min(X1, f.x1 + 0.05);
    ranges.forEach((rg, i) => {
      const top = (x: number) => HZ - u(rangeHeight(i, x), rg.d);
      const peak = u(rg.peakM, rg.d);
      const r = rand(rg.seed * 7);
      const silhouette = new Path2D();
      silhouette.moveTo(x0, HZ + 0.002);
      for (let x = x0; x <= x1; x += step) silhouette.lineTo(x, top(x));
      silhouette.lineTo(x1, HZ + 0.002);
      silhouette.closePath();
      // Roca iluminada con bruma hacia la base
      ctx.fillStyle = linear(ctx, 0, HZ - peak, 0, HZ, [
        [0, css(mix(rg.rock, hex('#f4ead8'), 0.25))],
        [0.6, css(mix(rg.rock, hex('#c8d8ea'), rg.haze * 0.5))],
        [1, css(mix(rg.rock, hex('#d8e6f2'), Math.min(0.9, rg.haze + 0.25)))],
      ]);
      ctx.fill(silhouette);
      ctx.save();
      ctx.clip(silhouette);
      // Nieve sobre la línea de nieve, con borde dentado que baja por las canaletas
      const snowBase = HZ - peak * rg.snowLine;
      const snow = new Path2D();
      snow.moveTo(x0, HZ - peak * 2);
      const snowNoise = ridge(rg.seed + 900, 9, 1, 0.62);
      for (let x = x0; x <= x1; x += step * 2) {
        // Lenguas de nieve irregulares que bajan por las canaletas
        const v = sampleRidge(snowNoise, X0, X1, x);
        const tongue = Math.max(0, v) * Math.max(0, v) * peak * 0.5;
        snow.lineTo(x, snowBase + (r() - 0.5) * peak * 0.03 + tongue + v * peak * 0.08);
      }
      snow.lineTo(x1, HZ - peak * 2);
      snow.closePath();
      ctx.fillStyle = linear(ctx, 0, HZ - peak, 0, snowBase + peak * 0.15, [
        [0, css(mix(hex('#ffffff'), hex('#dfe8f4'), rg.haze))],
        [1, css(mix(hex('#e8eef6'), hex('#c8d6e8'), rg.haze))],
      ]);
      ctx.fill(snow);
      // Estratos de roca: trazos diagonales finos
      ctx.strokeStyle = css(scale(rg.rock, 0.7), 0.18);
      ctx.lineWidth = Math.max(f.px * 0.6, u(8, rg.d));
      ctx.beginPath();
      for (let k = 0; k < 90; k++) {
        const x = r.range(x0, x1);
        const y = top(x) + r() * peak * 0.8;
        const L = u(r.range(60, 200), rg.d);
        ctx.moveTo(x, y);
        ctx.lineTo(x + L, y + L * r.range(0.3, 0.6));
      }
      ctx.stroke();
      // Caras en sombra: desde cada cumbre baja un espolón; a su derecha, sombra.
      const shade = new Path2D();
      const peaks: number[] = [];
      // Cumbres con prominencia: máximos locales dentro de una ventana de ±0.04 unidades.
      const win = 0.04;
      for (let x = x0 + win; x < x1 - win; x += step) {
        const y = top(x);
        let isPeak = true;
        for (let k = -win; k <= win; k += step * 2) {
          if (k !== 0 && top(x + k) < y) {
            isPeak = false;
            break;
          }
        }
        if (isPeak && (peaks.length === 0 || x - peaks[peaks.length - 1]! > win)) peaks.push(x);
      }
      for (const px0 of peaks) {
        const py0 = top(px0);
        const pts: Array<[number, number]> = [[px0, py0]];
        let sx = px0;
        let sy = py0;
        const drop = HZ - py0;
        const lean = r.range(0.25, 0.65);
        while (sy < HZ) {
          sy += drop * 0.06;
          sx += drop * 0.06 * (lean + (r() - 0.5) * 0.9);
          pts.push([sx, Math.min(sy, HZ + 0.002)]);
        }
        // Borde de la cresta desde la cumbre hacia la derecha hasta el siguiente valle
        let vx = px0 + step;
        while (vx < x1 && top(vx + step) >= top(vx) - 1e-6) vx += step;
        while (vx < x1 && top(vx + step) > top(vx)) vx += step;
        // Desde el valle baja otro espolón: la cara en sombra queda entre ambos.
        const vpts: Array<[number, number]> = [];
        let qx = vx;
        let qy = top(vx);
        const vdrop = HZ - qy;
        while (qy < HZ) {
          qy += Math.max(vdrop, drop * 0.3) * 0.08;
          qx += Math.max(vdrop, drop * 0.3) * 0.08 * (lean * 0.8 + (r() - 0.5) * 0.6);
          vpts.push([qx, Math.min(qy, HZ + 0.002)]);
        }
        shade.moveTo(px0, py0);
        for (let x = px0 + step; x <= vx; x += step) shade.lineTo(x, top(x));
        for (const p of vpts) shade.lineTo(p[0], p[1]);
        for (let k = pts.length - 1; k >= 0; k--) shade.lineTo(pts[k]![0], pts[k]![1]);
        shade.closePath();
      }
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = css(mix(hex('#5e6f96'), hex('#c4d2e6'), rg.haze * 0.8));
      ctx.fill(shade);
      ctx.globalCompositeOperation = 'source-over';
      // Canaletas: líneas oscuras finas que bajan desde la cresta
      ctx.strokeStyle = css(rg.shadow, 0.28);
      ctx.lineWidth = Math.max(f.px * 0.8, u(14, rg.d));
      ctx.beginPath();
      for (let k = 0; k < 50; k++) {
        const x = r.range(x0, x1);
        const y = top(x);
        ctx.moveTo(x, y + peak * 0.02);
        ctx.quadraticCurveTo(x + r.range(-0.01, 0.01), y + peak * 0.15, x + r.range(-0.03, 0.03), Math.min(HZ, y + peak * r.range(0.2, 0.45)));
      }
      ctx.stroke();
      grain(ctx, x0, HZ - peak * 1.3, x1 - x0, peak * 1.3, 0.22, u(300, rg.d));
      // Bruma hacia la base (perspectiva atmosférica)
      ctx.fillStyle = linear(ctx, 0, HZ - peak, 0, HZ, [
        [0, css(hex('#c9dbee'), rg.haze * 0.2)],
        [1, css(hex('#d6e4f2'), Math.min(0.8, rg.haze * 0.8 + 0.25))],
      ]);
      ctx.fillRect(x0, HZ - peak * 1.3, x1 - x0, peak * 1.3 + 0.004);
      ctx.restore();
    });
    // Ladera boscosa de la orilla lejana (1.5 km)
    const fd = 1500;
    const fTop = (x: number) => HZ - u(140 + sampleRidge(forestRidge, X0, X1, x) * 120, fd);
    ctx.beginPath();
    ctx.moveTo(x0, HZ + 0.003);
    for (let x = x0; x <= x1; x += step) ctx.lineTo(x, fTop(x));
    ctx.lineTo(x1, HZ + 0.003);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, 0, HZ - u(260, fd), 0, HZ, [
      [0, '#3c5a4a'],
      [1, '#2c4436'],
    ]);
    ctx.fill();
    const r = rand(64);
    const trees = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    for (let i = 0; i < 900; i++) {
      const x = r.range(x0, x1);
      const y = fTop(x) + Math.pow(r(), 1.5) * (HZ - fTop(x));
      const s = u(r.range(6, 12), fd);
      const p = trees[Math.min(3, Math.floor(r() * (x < 0 ? 4 : 3)))]!;
      p.moveTo(x, y - s * 2.2);
      p.lineTo(x + s * 0.6, y);
      p.lineTo(x - s * 0.6, y);
      p.closePath();
    }
    ['#1f3226', '#2d4532', '#3f5a3e', '#56724c'].forEach((c, k) => {
      ctx.fillStyle = c;
      ctx.fill(trees[k]!);
    });
    if (!mirror) {
      // Bruma baja sobre el agua
      ctx.fillStyle = linear(ctx, 0, HZ - 0.05, 0, HZ + 0.004, [
        [0, 'rgba(210,226,240,0)'],
        [1, 'rgba(210,226,240,0.4)'],
      ]);
      ctx.fillRect(x0, HZ - 0.05, x1 - x0, 0.054);
    }
  }

  function paintMountains(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    paintRanges(ctx, f, false);
    // Reflejo: espejo respecto de la línea del agua, más oscuro y azulado.
    const lakeBottom = gy(SHORE_M);
    if (f.y1 > HZ) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(f.x0, HZ, f.x1 - f.x0, Math.max(0, Math.min(f.y1, lakeBottom + 0.05) - HZ));
      ctx.clip();
      ctx.fillStyle = linear(ctx, 0, HZ, 0, HZ + 0.4, [
        [0, '#b8cfe6'],
        [1, '#2a64a8'],
      ]);
      ctx.fillRect(f.x0, HZ, f.x1 - f.x0, 0.6);
      ctx.translate(0, 2 * HZ);
      ctx.scale(1, -1);
      paintRanges(ctx, f, true);
      ctx.restore();
    }
  }

  /* ---------------------------------------------------------------- Lago (plano) */
  function paintLake(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const near = gy(SHORE_M);
    if (f.y1 < HZ) return;
    // Agua: más transparente y reflejante lejos (Fresnel), más verde y opaca cerca.
    ctx.fillStyle = linear(ctx, 0, HZ, 0, near, [
      [0, 'rgba(60,96,120,0.28)'],
      [0.4, 'rgba(38,78,92,0.45)'],
      [1, 'rgba(30,66,64,0.78)'],
    ]);
    ctx.fillRect(f.x0, HZ, f.x1 - f.x0, near - HZ);
    // Ondas: líneas horizontales que reflejan el cielo, más separadas cerca
    const r = rand(818);
    for (let d = 1200; d > SHORE_M; d *= 0.965) {
      const y = gy(d);
      if (y < f.y0 || y > f.y1) continue;
      const len = u(r.range(0.6, 2.5), d);
      const n = Math.min(80, Math.ceil((f.x1 - f.x0) / Math.max(len * 2.5, 0.01)));
      ctx.lineWidth = Math.max(f.px * 0.5, u(0.02, d));
      for (let i = 0; i < n; i++) {
        const x = r.range(f.x0, f.x1);
        ctx.strokeStyle = r.chance(0.6) ? 'rgba(220,236,250,0.16)' : 'rgba(20,40,60,0.14)';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + len, y);
        ctx.stroke();
      }
    }
    // Línea de orilla mojada
    ctx.fillStyle = 'rgba(20,30,28,0.55)';
    ctx.fillRect(f.x0, near - u(0.04, SHORE_M), f.x1 - f.x0, u(0.06, SHORE_M));
  }

  function lakeGlints(): Emitter[] {
    const out: Emitter[] = [];
    const r = rand(919);
    for (let i = 0; i < 45; i++) {
      const d = Math.exp(r.range(Math.log(15), Math.log(300)));
      const x = -0.62 + r.normal() * 0.12;
      out.push({ kind: 'point', x, y: gy(d), size: u(0.04, d), color: sunGlint, power: r.range(6, 22), distanceM: d });
    }
    return out;
  }

  /* ---------------------------------------------------------------- Islote con pinos (12 m) */
  const pines = [
    { x: -0.2, h: 2.9 },
    { x: -0.145, h: 3.6 },
    { x: -0.095, h: 2.5 },
    { x: -0.05, h: 1.9 },
    { x: -0.26, h: 1.7 },
  ];
  function paintIslet(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = ISLET_M;
    const water = gy(d);
    const r = rand(1212);
    const dark = hex('#1f3326');
    const lit = hex('#5c7d45');
    // Reflejo de los pinos (espejo en la línea del agua), atenuado
    ctx.save();
    ctx.beginPath();
    ctx.rect(f.x0, water, f.x1 - f.x0, gy(SHORE_M) - water);
    ctx.clip();
    ctx.translate(0, 2 * water);
    ctx.scale(1, -1);
    ctx.globalAlpha = 0.5;
    const rr = rand(1213);
    for (const p of pines) conifer(ctx, p.x, water - u(0.4, d), u(p.h, d), rr, f.px, scale(dark, 0.7), scale(lit, 0.65));
    ctx.restore();
    // Rocas del islote
    ctx.fillStyle = linear(ctx, 0, water - u(1, d), 0, water + u(0.2, d), [
      [0, '#8d8a84'],
      [1, '#4a4844'],
    ]);
    ctx.beginPath();
    ctx.moveTo(-0.33, water + u(0.05, d));
    ctx.bezierCurveTo(-0.3, water - u(0.8, d), -0.05, water - u(1.0, d), 0.02, water + u(0.05, d));
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    grain(ctx, -0.34, water - u(1.3, d), 0.38, u(1.4, d), 0.4, u(2, d));
    ctx.restore();
    grassTufts(ctx, -0.3, -0.01, water - u(0.5, d), u(0.4, d), 60, [hex('#6b7a3a'), hex('#8a9a4a'), hex('#4c5a2a')], r, Math.max(f.px * 0.6, u(0.02, d)));
    for (const p of pines) conifer(ctx, p.x, water - u(0.4, d), u(p.h, d), r, f.px, dark, lit);
  }

  /* ---------------------------------------------------------------- Orilla cercana (plano) */
  function paintShore(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const top = gy(SHORE_M);
    const bottom = f.y1 + f.px;
    if (bottom <= top) return;
    ctx.fillStyle = linear(ctx, 0, top, 0, bottom, [
      [0, '#8a8577'],
      [0.4, '#76705f'],
      [1, '#5a5446'],
    ]);
    ctx.fillRect(f.x0, top, f.x1 - f.x0, bottom - top);
    ctx.save();
    ctx.beginPath();
    ctx.rect(f.x0, top, f.x1 - f.x0, bottom - top);
    ctx.clip();
    grain(ctx, f.x0, top, f.x1 - f.x0, bottom - top, 0.4, u(0.6, 3));
    ctx.restore();
    // Guijarros redondeados por filas de distancia
    const r = rand(4444);
    const cols = [hex('#b3aa98'), hex('#9a9282'), hex('#c9c0ac'), hex('#857d6c'), hex('#a39684')];
    for (let d = SHORE_M; d > 1.3; d *= 0.93) {
      const y = gy(d);
      if (y > f.y1 + 0.1) break;
      const n = Math.round(((f.x1 - f.x0) / u(0.16, d)) * 0.8);
      for (let i = 0; i < n; i++) {
        const x = r.range(f.x0, f.x1);
        const s = u(r.range(0.03, 0.09), d);
        const py = y + (r() - 0.5) * u(0.15, d) * 0.5;
        const c = r.pick(cols);
        ctx.fillStyle = linear(ctx, x - s, py - s * 0.5, x + s, py + s * 0.5, [
          [0, css(mix(c, hex('#fffaf0'), 0.25))],
          [1, css(scale(c, 0.62))],
        ]);
        ellipse(ctx, x, py, s, s * 0.55, r.range(-0.3, 0.3));
        ctx.fill();
      }
    }
    // Pasto y flores silvestres
    for (let d = SHORE_M; d > 1.4; d *= 0.85) {
      const y = gy(d);
      grassTufts(ctx, f.x0, f.x1, y, u(0.35, d), 40, [hex('#6f8040'), hex('#93a356'), hex('#4f5e2c')], r, Math.max(f.px * 0.6, u(0.006, d)));
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = css(r.pick([hex('#f2d03a'), hex('#9b6ad0'), hex('#ffffff')]));
        ellipse(ctx, r.range(f.x0, f.x1), y - u(r.range(0.15, 0.3), d), u(0.02, d), u(0.02, d));
        ctx.fill();
      }
    }
  }

  /* ---------------------------------------------------------------- Rocas de granito (sujeto) */
  function rock(ctx: CanvasRenderingContext2D, f: PaintFrame, r: Rand, cx: number, base: number, w: number, h: number): void {
    // Bloque anguloso: vértices sobre una semielipse con radio irregular y esquinas apenas redondeadas.
    const n = 9;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + (i / n) * Math.PI;
      const k = i === 0 || i === n ? 1 : r.range(0.82, 1.08);
      pts.push([cx + Math.cos(a) * w * 0.5 * k, base + Math.sin(a) * h * k * (i === 0 || i === n ? 0 : 1)]);
    }
    const path = new Path2D();
    path.moveTo(pts[0]![0], base + h * 0.04);
    for (let i = 1; i <= n; i++) {
      const p = pts[i]!;
      const q = pts[i - 1]!;
      path.quadraticCurveTo(q[0] + (p[0] - q[0]) * 0.15, q[1] + (p[1] - q[1]) * 0.15, (q[0] + p[0]) / 2, (q[1] + p[1]) / 2);
      path.lineTo(p[0], p[1]);
    }
    path.lineTo(pts[n]![0], base + h * 0.04);
    path.closePath();
    ctx.fillStyle = linear(ctx, cx - w * 0.45, base - h, cx + w * 0.4, base, [
      [0, '#cfc9bc'],
      [0.5, '#97918a'],
      [1, '#4d4942'],
    ]);
    ctx.fill(path);
    ctx.save();
    ctx.clip(path);
    // Facetas: cara superior iluminada y flanco derecho en sombra
    const top = pts[Math.floor(n / 2)]!;
    ctx.fillStyle = 'rgba(255,248,232,0.28)';
    ctx.beginPath();
    ctx.moveTo(pts[1]![0], pts[1]![1]);
    ctx.lineTo(pts[2]![0], pts[2]![1]);
    ctx.lineTo(top[0], top[1]);
    ctx.lineTo(top[0] + w * 0.08, base - h * 0.45);
    ctx.lineTo(cx - w * 0.3, base - h * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgb(120,124,140)';
    ctx.beginPath();
    ctx.moveTo(top[0] + w * 0.04, top[1]);
    ctx.lineTo(pts[n - 1]![0], pts[n - 1]![1]);
    ctx.lineTo(pts[n]![0], base + h * 0.05);
    ctx.lineTo(top[0] + w * 0.1, base + h * 0.05);
    ctx.lineTo(top[0] + w * 0.08, base - h * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    grain(ctx, cx - w, base - h * 1.1, w * 2, h * 1.2, 0.5, w * 0.35);
    grain(ctx, cx - w, base - h * 1.1, w * 2, h * 1.2, 0.3, w * 0.08, 0.5);
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = css(r.pick([hex('#d6c36a'), hex('#a8ad8a'), hex('#e8e0c8')]), 0.5);
      blobPath(ctx, cx + r.range(-w * 0.35, w * 0.3), base - h * r.range(0.35, 0.9), w * r.range(0.02, 0.06), w * r.range(0.015, 0.035), r, 0.3, 8);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(30,26,22,0.55)';
    ctx.lineWidth = Math.max(f.px * 0.7, w * 0.006);
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.05 + r.range(-w * 0.1, w * 0.1), base - h * 0.95);
    ctx.lineTo(cx, base - h * 0.6);
    ctx.lineTo(cx + w * 0.1, base - h * 0.35);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = linear(ctx, 0, base - h * 0.06, 0, base + h * 0.08, [
      [0, 'rgba(20,18,14,0)'],
      [1, 'rgba(20,18,14,0.5)'],
    ]);
    ctx.beginPath();
    ctx.ellipse(cx + w * 0.08, base + h * 0.02, w * 0.6, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function paintRocks(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = SUBJ;
    const base = gy(d);
    const r = rand(2525);
    if (base - u(1.4, d) > f.y1) return;
    rock(ctx, f, r, 0.5, base + u(0.05, d), u(1.6, d), u(1.15, d));
    rock(ctx, f, r, 0.24, base, u(1.1, d), u(0.75, d));
    rock(ctx, f, r, 0.72, base + u(0.08, d), u(0.9, d), u(0.55, d));
    grassTufts(ctx, 0.05, 0.9, base + u(0.06, d), u(0.35, d), 45, [hex('#6f8040'), hex('#a0b060'), hex('#4f5e2c')], r, Math.max(f.px * 0.6, u(0.008, d)));
  }

  /* ---------------------------------------------------------------- Primer plano (1.5 m) */
  function paintForeground(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = FG;
    const base = gy(d);
    const r = rand(3636);
    if (base - u(0.8, d) > f.y1) return;
    // Matas de pasto alto y flores en las esquinas inferiores
    for (const [x0, x1] of [
      [-1.4, -0.45],
      [0.55, 1.4],
    ] as const) {
      grassTufts(ctx, x0, x1, base, u(0.75, d), 140, [hex('#5f7036'), hex('#8fa250'), hex('#47552a'), hex('#a8b868')], r, Math.max(f.px * 0.7, u(0.01, d)));
      for (let i = 0; i < 18; i++) {
        const x = r.range(x0, x1);
        const y = base - u(r.range(0.35, 0.7), d);
        ctx.strokeStyle = '#5a6a32';
        ctx.lineWidth = Math.max(f.px * 0.6, u(0.006, d));
        ctx.beginPath();
        ctx.moveTo(x, base);
        ctx.quadraticCurveTo(x + u(0.03, d), (y + base) / 2, x, y);
        ctx.stroke();
        const c = r.pick([hex('#f2d03a'), hex('#9b6ad0'), hex('#f4f0e6')]);
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          ctx.fillStyle = css(c);
          ellipse(ctx, x + Math.cos(a) * u(0.022, d), y + Math.sin(a) * u(0.022, d), u(0.02, d), u(0.012, d), a);
          ctx.fill();
        }
        ctx.fillStyle = '#c99a2a';
        ellipse(ctx, x, y, u(0.012, d), u(0.012, d));
        ctx.fill();
      }
    }
  }

  return {
    id: 'landscape',
    seed: 2424,
    layers: [
      { id: 'cielo', distanceM: 1e6, noPeaking: true, paint: paintSky },
      { id: 'montanas', distanceM: BG, paint: paintMountains },
      { id: 'lago', distanceM: 60, plane: { horizonY: HZ, cameraHeightM: CAM_H, farM: BG }, paint: paintLake, emitters: lakeGlints },
      { id: 'islote', distanceM: ISLET_M, paint: paintIslet },
      { id: 'orilla', distanceM: 3, plane: { horizonY: HZ, cameraHeightM: CAM_H, farM: SHORE_M }, paint: paintShore },
      { id: 'rocas', distanceM: SUBJ, paint: paintRocks },
      { id: 'primer-plano', distanceM: FG, paint: paintForeground },
    ],
  };
}
