/**
 * Paisaje de montaña al mediodía: cordilleras con nieve y bruma azul (3–6 km), lago con su
 * reflejo, un islote con pinos en el plano medio (12 m), orilla de guijarros y una roca de
 * granito en primer plano (1.5 m). El reto es tenerlo todo nítido (hiperfocal).
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

/** Conífera de pisos dentados con agujas; lado iluminado a la izquierda. */
function conifer(ctx: CanvasRenderingContext2D, x: number, base: number, h: number, r: Rand, px: number, dark: RGB, lit: RGB): void {
  const w = h * r.range(0.3, 0.38);
  ctx.fillStyle = '#3b2c22';
  ctx.fillRect(x - h * 0.014, base - h * 0.3, h * 0.028, h * 0.3);
  const tiers = 11;
  for (let i = 0; i < tiers; i++) {
    const t0 = i / tiers;
    const t1 = (i + 1.6) / tiers;
    const yTop = base - h + h * 0.92 * t0;
    const yBot = Math.min(base - h * 0.08, base - h + h * 0.92 * t1);
    const half = (w / 2) * Math.pow(Math.min(1, t1), 0.85) * r.range(0.85, 1.1);
    // Faldón del piso con borde inferior dentado
    ctx.beginPath();
    ctx.moveTo(x, yTop);
    const teeth = 7;
    for (let k = 0; k <= teeth; k++) {
      const s = -1 + (2 * k) / teeth;
      const tx = x + s * half;
      const ty = yBot - Math.abs(s) * (yBot - yTop) * 0.25 + (k % 2 ? -1 : 1) * h * 0.012;
      ctx.lineTo(tx, ty);
    }
    ctx.closePath();
    ctx.fillStyle = linear(ctx, x - half, 0, x + half, 0, [
      [0, css(lit)],
      [0.45, css(mix(lit, dark, 0.55))],
      [1, css(dark)],
    ]);
    ctx.fill();
    // Agujas iluminadas
    ctx.strokeStyle = css(mix(lit, hex('#d8e6a0'), 0.35), 0.5);
    ctx.lineWidth = Math.max(px * 0.6, h * 0.004);
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const sx = x - half * r.range(0.2, 0.95);
      const sy = yTop + (yBot - yTop) * r.range(0.4, 0.95);
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - h * 0.02, sy + h * 0.012);
    }
    ctx.stroke();
  }
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
    { d: 9000, peakM: 3200, levels: 8, seed: 31, rough: 0.52, rock: hex('#93a6c4'), shadow: hex('#7d90b2'), haze: 0.62, snowLine: 0.55 },
    { d: BG, peakM: 1250, levels: 9, seed: 47, rough: 0.56, rock: hex('#6f6a6c'), shadow: hex('#40465a'), haze: 0.25, snowLine: 0.55 },
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
    const step = Math.max(f.px * 2.5, 0.0035);
    const x0 = Math.max(X0, f.x0 - 0.02);
    const x1 = Math.min(X1, f.x1 + 0.02);
    const LEVELS = 16;
    ranges.forEach((rg, i) => {
      const top = (x: number) => HZ - u(rangeHeight(i, x), rg.d);
      const peak = u(rg.peakM, rg.d);
      const r = rand(rg.seed * 7);
      // Silueta base
      const silhouette = new Path2D();
      silhouette.moveTo(x0, HZ + 0.002);
      for (let x = x0; x <= x1; x += step) silhouette.lineTo(x, top(x));
      silhouette.lineTo(x1, HZ + 0.002);
      silhouette.closePath();
      ctx.fillStyle = linear(ctx, 0, HZ - peak, 0, HZ, [
        [0, css(rg.rock)],
        [0.7, css(mix(rg.shadow, hex('#b9cde3'), rg.haze * 0.6))],
        [1, css(mix(rg.shadow, hex('#cfdff0'), rg.haze))],
      ]);
      ctx.fill(silhouette);
      // Facetas de roca y de nieve agrupadas por nivel de luz (luz desde la izquierda)
      const rock = Array.from({ length: LEVELS }, () => new Path2D());
      const snow = Array.from({ length: LEVELS }, () => new Path2D());
      const depth = peak * 0.5;
      const snowBase = HZ - peak * rg.snowLine;
      for (let x = x0; x < x1; x += step) {
        const y0 = top(x);
        const y1 = top(x + step);
        const lit = Math.max(0, Math.min(1, 0.5 + ((y1 - y0) / step) * 1.6));
        const q = Math.min(LEVELS - 1, Math.round(lit * (LEVELS - 1)));
        const b0 = Math.min(y0 + depth, HZ);
        const b1 = Math.min(y1 + depth, HZ);
        const pr = rock[q]!;
        pr.moveTo(x, y0);
        pr.lineTo(x + step + f.px * 0.5, y1);
        pr.lineTo(x + step + f.px * 0.5, b1);
        pr.lineTo(x, b0);
        pr.closePath();
        const sl = snowBase + (r() - 0.5) * peak * 0.12 + Math.sin(x * 40 + i) * peak * 0.04;
        if (Math.min(y0, y1) < sl) {
          const ps = snow[q]!;
          ps.moveTo(x, y0);
          ps.lineTo(x + step + f.px * 0.5, y1);
          ps.lineTo(x + step + f.px * 0.5, Math.max(y1, sl));
          ps.lineTo(x, Math.max(y0, sl));
          ps.closePath();
        }
      }
      const litRock = mix(rg.rock, hex('#f2e8d8'), 0.35);
      for (let q = 0; q < LEVELS; q++) {
        const t = q / (LEVELS - 1);
        ctx.fillStyle = css(mix(mix(rg.shadow, litRock, t), hex('#c4d6ea'), rg.haze * 0.45), 0.92);
        ctx.fill(rock[q]!);
      }
      for (let q = 0; q < LEVELS; q++) {
        const t = q / (LEVELS - 1);
        ctx.fillStyle = css(mix(mix(hex('#93a7c6'), hex('#ffffff'), t), hex('#d0def0'), rg.haze * 0.5));
        ctx.fill(snow[q]!);
      }
      // Canaletas oscuras que bajan desde la cresta
      ctx.strokeStyle = css(rg.shadow, 0.3);
      ctx.lineWidth = Math.max(f.px, u(22, rg.d));
      ctx.beginPath();
      for (let k = 0; k < 40; k++) {
        const x = r.range(x0, x1);
        const y = top(x);
        ctx.moveTo(x, y + peak * 0.03);
        ctx.quadraticCurveTo(x + r.range(-0.01, 0.01), y + peak * 0.2, x + r.range(-0.02, 0.02), Math.min(HZ, y + peak * r.range(0.25, 0.5)));
      }
      ctx.stroke();
      // Bruma (perspectiva atmosférica) y textura, solo sobre lo ya pintado
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = linear(ctx, 0, HZ - peak, 0, HZ, [
        [0, css(hex('#c9dbee'), rg.haze * 0.15)],
        [1, css(hex('#d6e4f2'), Math.min(0.85, rg.haze * 0.9 + 0.2))],
      ]);
      ctx.fillRect(x0, HZ - peak * 1.3, x1 - x0, peak * 1.3 + 0.004);
      ctx.restore();
      ctx.save();
      ctx.clip(silhouette);
      grain(ctx, x0, HZ - peak * 1.3, x1 - x0, peak * 1.3, 0.25, u(400, rg.d));
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
      const len = u(r.range(2, 9), d) * 4;
      const n = Math.min(60, Math.ceil((f.x1 - f.x0) / Math.max(len * 3, 0.02)));
      ctx.lineWidth = Math.max(f.px * 0.6, u(0.03, d));
      for (let i = 0; i < n; i++) {
        const x = r.range(f.x0, f.x1);
        ctx.strokeStyle = r.chance(0.6) ? 'rgba(220,236,250,0.35)' : 'rgba(20,40,60,0.3)';
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
    for (let i = 0; i < 120; i++) {
      const d = Math.exp(r.range(Math.log(8), Math.log(400)));
      const x = -0.55 + r.normal() * 0.35;
      out.push({ kind: 'point', x, y: gy(d), size: u(0.05, d), color: sunGlint, power: r.range(12, 40), distanceM: d });
    }
    return out;
  }

  /* ---------------------------------------------------------------- Islote con pinos (12 m) */
  const pines = [
    { x: 0.2, h: 7.5 },
    { x: 0.29, h: 9.5 },
    { x: 0.36, h: 6.2 },
    { x: 0.44, h: 4.6 },
    { x: 0.13, h: 3.6 },
  ];
  function paintIslet(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = SUBJ;
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
    ctx.moveTo(0.04, water + u(0.05, d));
    ctx.bezierCurveTo(0.08, water - u(0.9, d), 0.4, water - u(1.2, d), 0.56, water + u(0.05, d));
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    grain(ctx, 0.04, water - u(1.3, d), 0.52, u(1.4, d), 0.4, u(2, d));
    ctx.restore();
    grassTufts(ctx, 0.1, 0.5, water - u(0.5, d), u(0.4, d), 70, [hex('#6b7a3a'), hex('#8a9a4a'), hex('#4c5a2a')], r, Math.max(f.px * 0.6, u(0.02, d)));
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

  /* ---------------------------------------------------------------- Roca en primer plano (1.5 m) */
  function paintBoulder(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = FG;
    const base = gy(d);
    const r = rand(2525);
    const cx = -0.72;
    const w = u(1.6, d);
    const h = u(1.25, d);
    if (cx + w < f.x0 || base - h > f.y1) return;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.75, base + 0.05);
    ctx.bezierCurveTo(cx - w * 0.8, base - h * 0.6, cx - w * 0.35, base - h * 1.05, cx + w * 0.05, base - h);
    ctx.bezierCurveTo(cx + w * 0.4, base - h * 0.95, cx + w * 0.6, base - h * 0.6, cx + w * 0.58, base + 0.05);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, cx - w * 0.6, base - h, cx + w * 0.5, base, [
      [0, '#c9c3b6'],
      [0.45, '#8f897e'],
      [1, '#4a463f'],
    ]);
    ctx.fill();
    ctx.save();
    ctx.clip();
    grain(ctx, cx - w, base - h * 1.1, w * 2, h * 1.3, 0.55, u(0.5, d));
    grain(ctx, cx - w, base - h * 1.1, w * 2, h * 1.3, 0.3, u(0.12, d), 0.5);
    // Líquenes y grietas
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = css(r.pick([hex('#d6c36a'), hex('#a8ad8a'), hex('#e8e0c8')]), 0.55);
      blobPath(ctx, cx + r.range(-w * 0.5, w * 0.4), base - h * r.range(0.3, 0.9), u(r.range(0.03, 0.08), d), u(r.range(0.02, 0.05), d), r, 0.3, 8);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(30,26,22,0.6)';
    ctx.lineWidth = u(0.01, d);
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.1, base - h * 0.95);
    ctx.lineTo(cx - w * 0.05, base - h * 0.6);
    ctx.lineTo(cx + w * 0.08, base - h * 0.35);
    ctx.stroke();
    softDot(ctx, cx + w * 0.3, base - h * 0.2, w * 0.5, hex('#1e1c18'), 0.5);
    ctx.restore();
    grassTufts(ctx, cx - w, cx + w * 0.8, base - u(0.05, d), u(0.45, d), 50, [hex('#6f8040'), hex('#a0b060'), hex('#4f5e2c')], r, u(0.008, d));
  }

  return {
    id: 'landscape',
    seed: 2424,
    layers: [
      { id: 'cielo', distanceM: 1e6, noPeaking: true, paint: paintSky },
      { id: 'montanas', distanceM: BG, paint: paintMountains },
      { id: 'lago', distanceM: 60, plane: { horizonY: HZ, cameraHeightM: CAM_H, farM: BG }, paint: paintLake, emitters: lakeGlints },
      { id: 'islote', distanceM: SUBJ, paint: paintIslet },
      { id: 'orilla', distanceM: 3, plane: { horizonY: HZ, cameraHeightM: CAM_H, farM: SHORE_M }, paint: paintShore },
      { id: 'roca', distanceM: FG, paint: paintBoulder },
    ],
  };
}
