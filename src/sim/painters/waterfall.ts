/**
 * Cascada en un bosque en sombra (día nublado): la caída de agua a 8 m entre paredes de roca con
 * musgo, una poza con espuma, un arroyo que baja hacia la cámara entre piedras y helechos en
 * primer plano (2 m), con troncos y niebla al fondo (20 m).
 *
 * El agua se pinta con vetas y gotas: con 1/1000 s se ve congelada; con tiempos largos el
 * barrido vertical (recortado al cauce: el agua es un flujo continuo) la convierte en seda.
 */
import type { SimScene } from '../types';
import {
  blobPath,
  css,
  ellipse,
  fillFrame,
  grain,
  groundY,
  hex,
  linear,
  mix,
  radial,
  rand,
  scale,
  sizer,
  softDot,
} from './kit';
import type { RGB, Rand } from './kit';
import type { PaintFrame, ScenePainter } from './types';

const HZ = 0.06;
const CAM_H = 1.2;

/** Fronda de helecho: raquis curvo con folíolos alternos que se acortan hacia la punta. */
function fern(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, ang: number, bend: number, c: RGB, px: number, r: Rand): void {
  const n = 16;
  const pts: Array<[number, number, number]> = [];
  let a = ang;
  let cx = x;
  let cy = y;
  for (let i = 0; i <= n; i++) {
    pts.push([cx, cy, a]);
    cx += Math.sin(a) * (len / n);
    cy -= Math.cos(a) * (len / n);
    a += bend / n;
  }
  ctx.strokeStyle = css(scale(c, 0.7));
  ctx.lineWidth = Math.max(px * 0.6, len * 0.012);
  ctx.beginPath();
  pts.forEach(([px0, py0], i) => (i === 0 ? ctx.moveTo(px0, py0) : ctx.lineTo(px0, py0)));
  ctx.stroke();
  for (let i = 2; i < n; i++) {
    const [px0, py0, pa] = pts[i]!;
    const t = i / n;
    const ll = len * 0.22 * Math.sin(Math.PI * Math.min(1, t * 1.1)) * (1 - t * 0.4);
    for (const side of [-1, 1]) {
      const la = pa + side * (1.25 - t * 0.3);
      const ex = px0 + Math.sin(la) * ll;
      const ey = py0 - Math.cos(la) * ll;
      ctx.fillStyle = css(mix(scale(c, 0.8), mix(c, hex('#c8e08a'), 0.3), r()));
      ctx.beginPath();
      ctx.moveTo(px0, py0);
      ctx.quadraticCurveTo((px0 + ex) / 2 + Math.cos(la) * ll * 0.18, (py0 + ey) / 2 + Math.sin(la) * ll * 0.18, ex, ey);
      ctx.quadraticCurveTo((px0 + ex) / 2 - Math.cos(la) * ll * 0.18, (py0 + ey) / 2 - Math.sin(la) * ll * 0.18, px0, py0);
      ctx.fill();
    }
  }
}

export function waterfallPainter(scene: SimScene): ScenePainter {
  const REF = scene.refFocalMm;
  const u = sizer(REF);
  const gy = (d: number) => groundY(HZ, REF, CAM_H, d);
  const SUBJ = scene.lighting.subjectDistanceM;
  const SPEED = scene.lighting.subjectSpeedMS;
  const BG = scene.lighting.backgroundDistanceM;
  const FG = scene.lighting.foregroundDistanceM ?? 2;

  // Geometría de la caída (unidades de mundo)
  const FALL_X = 0.06;
  const poolY = gy(SUBJ) + u(0.3, SUBJ);
  const lipY = poolY - u(5.2, SUBJ);
  const halfTop = u(1.1, SUBJ);
  const halfBot = u(1.6, SUBJ);
  const fallEdge = (y: number, side: -1 | 1) => {
    const t = Math.min(1, Math.max(0, (y - lipY) / (poolY - lipY)));
    const w = halfTop + (halfBot - halfTop) * Math.pow(t, 0.8);
    return FALL_X + side * (w + Math.sin(y * 37 + side * 2) * u(0.12, SUBJ) + Math.sin(y * 113 + side) * u(0.05, SUBJ));
  };
  const fallPath = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.moveTo(fallEdge(lipY, -1), lipY);
    for (let y = lipY; y <= poolY + 0.01; y += 0.01) ctx.lineTo(fallEdge(y, -1), y);
    for (let y = poolY + 0.01; y >= lipY; y -= 0.01) ctx.lineTo(fallEdge(y, 1), y);
    ctx.closePath();
  };

  /* ---------------------------------------------------------------- Bosque con niebla (20 m) */
  function paintForest(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    fillFrame(
      ctx,
      f,
      linear(ctx, 0, -1, 0, HZ + 0.1, [
        [0, '#dfe6e2'],
        [0.35, '#9fb0a2'],
        [1, '#5b6e5a'],
      ]),
    );
    const r = rand(3030);
    // Copas altas con huecos de cielo nublado
    for (let i = 0; i < 160; i++) {
      const x = r.range(f.x0 - 0.1, f.x1 + 0.1);
      const y = r.range(-1.2, -0.3);
      softDot(ctx, x, y, r.range(0.05, 0.16), mix(hex('#4a6a44'), hex('#8aa47a'), r()), r.range(0.4, 0.8), 0.4);
    }
    // Troncos a distintas distancias: más lejos, más velados por la niebla
    for (let layer = 0; layer < 3; layer++) {
      const d = BG + 12 - layer * 6;
      const fog = 0.7 - layer * 0.25;
      for (let i = 0; i < 14; i++) {
        const x = r.range(-2, 2);
        const w = u(r.range(0.35, 0.8), d);
        const base = gy(d);
        const c = mix(hex('#3a3430'), hex('#b8c4bc'), fog);
        ctx.fillStyle = linear(ctx, x - w, 0, x + w, 0, [
          [0, css(scale(c, 0.85))],
          [0.4, css(mix(c, hex('#ffffff'), 0.1))],
          [1, css(scale(c, 0.75))],
        ]);
        ctx.fillRect(x - w / 2, -1.3, w, base + 1.3);
      }
      ctx.fillStyle = css(hex('#cfd9d2'), 0.25);
      ctx.fillRect(f.x0, -1.3, f.x1 - f.x0, gy(d) + 1.4);
    }
    // Sotobosque
    for (let i = 0; i < 90; i++) {
      const x = r.range(f.x0, f.x1);
      softDot(ctx, x, gy(BG) - r.range(0, u(1.5, BG)), u(r.range(0.6, 1.4), BG), mix(hex('#2f4a2a'), hex('#6a8a4a'), r()), 0.7, 0.3);
    }
  }

  /* ---------------------------------------------------------------- Paredes de roca (9 m) */
  function paintCliff(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = SUBJ + 1;
    const r = rand(4040);
    const wallPath = (side: -1 | 1) => {
      const inner = FALL_X + side * (halfTop + u(0.15, d));
      const outer = side < 0 ? f.x0 - 0.1 : f.x1 + 0.1;
      ctx.beginPath();
      ctx.moveTo(outer, -1.5);
      ctx.lineTo(inner + side * u(0.4, d), -1.5);
      ctx.quadraticCurveTo(inner - side * u(0.25, d), lipY - u(1.5, d), inner, lipY);
      ctx.quadraticCurveTo(fallEdge(lipY + 0.2, side) + side * u(0.35, d), lipY + 0.25, fallEdge(poolY, side) + side * u(0.5, d), poolY + 0.01);
      ctx.lineTo(outer, poolY + 0.04);
      ctx.closePath();
    };
    for (const side of [-1, 1] as const) {
      wallPath(side);
      ctx.fillStyle = linear(ctx, 0, lipY - 0.5, 0, poolY, [
        [0, side < 0 ? '#4b524a' : '#424840'],
        [1, '#22261f'],
      ]);
      ctx.fill();
      ctx.save();
      wallPath(side);
      ctx.clip();
      // Pared de bloques irregulares superpuestos, cada uno con su propia luz (cielo arriba)
      const x0 = side < 0 ? f.x0 - 0.1 : FALL_X;
      const x1 = side < 0 ? FALL_X : f.x1 + 0.1;
      const area = (x1 - x0) * (poolY - lipY + 1.5);
      const n = Math.min(320, Math.round(area / (u(0.9, d) * u(0.7, d))));
      for (let i = 0; i < n; i++) {
        const cx = r.range(x0, x1);
        const cy = r.range(-1.5, poolY);
        const rx = u(r.range(0.35, 1.1), d);
        const ry = rx * r.range(0.45, 0.8);
        const tone = mix(hex('#2c312b'), hex('#6a7266'), r() * 0.8);
        ctx.fillStyle = radial(ctx, cx - rx * 0.35, cy - ry * 0.5, rx * 0.1, rx * 1.2, [
          [0, css(mix(tone, hex('#9aa496'), 0.35))],
          [0.55, css(tone)],
          [1, css(scale(tone, 0.55))],
        ]);
        blobPath(ctx, cx, cy, rx, ry, r, 0.3, 9);
        ctx.fill();
        if (r() < 0.45) {
          // Musgo en la cara superior: racimos de puntitos verdes
          const mossC = mix(hex('#3f5f24'), hex('#8db04a'), r());
          for (let k = 0; k < 14; k++) {
            const mx = cx + r.normal() * rx * 0.45;
            const my = cy - ry * r.range(0.45, 0.95);
            ctx.fillStyle = css(mix(mossC, hex('#c8e070'), r() * 0.3), 0.85);
            ellipse(ctx, mx, my, u(r.range(0.05, 0.14), d), u(r.range(0.03, 0.08), d));
            ctx.fill();
          }
        }
      }
      grain(ctx, x0, lipY - 0.8, x1 - x0, poolY - lipY + 0.9, 0.45, u(1.2, d));
      // Regueros de humedad oscuros
      ctx.strokeStyle = 'rgba(8,10,10,0.3)';
      ctx.lineWidth = Math.max(f.px, u(0.08, d));
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const x = r.range(x0, x1);
        const y = r.range(lipY - 0.3, poolY - 0.1);
        ctx.moveTo(x, y);
        ctx.lineTo(x + r.range(-0.004, 0.004), y + u(r.range(0.8, 2.4), d));
      }
      ctx.stroke();
      ctx.restore();
    }
    // Vegetación que cierra la garganta sobre el labio
    for (let i = 0; i < 60; i++) {
      const x = FALL_X + r.normal() * halfTop * 1.4;
      const y = lipY - u(r.range(0.6, 3.5), d);
      ctx.fillStyle = css(mix(hex('#2a3c22'), hex('#5f7a3a'), r()));
      blobPath(ctx, x, y, u(r.range(0.4, 0.9), d), u(r.range(0.3, 0.6), d), r, 0.25, 9);
      ctx.fill();
    }
    // Lámina de agua que se asoma por el labio
    ctx.fillStyle = linear(ctx, 0, lipY - u(0.5, d), 0, lipY + u(0.2, d), [
      [0, '#7a8c88'],
      [1, '#dfe8e6'],
    ]);
    ctx.beginPath();
    ctx.moveTo(FALL_X - halfTop, lipY + u(0.15, d));
    ctx.quadraticCurveTo(FALL_X, lipY - u(0.55, d), FALL_X + halfTop, lipY + u(0.15, d));
    ctx.closePath();
    ctx.fill();
    // Helechos colgando de las paredes
    for (let i = 0; i < 22; i++) {
      const side = r.chance(0.5) ? -1 : 1;
      const x = side < 0 ? r.range(f.x0, FALL_X - halfBot - u(0.6, d)) : r.range(FALL_X + halfBot + u(0.6, d), f.x1);
      const y = r.range(lipY - 0.2, poolY - 0.05);
      fern(ctx, x, y, u(r.range(0.6, 1.2), d), side * r.range(0.6, 1.6), side * r.range(0.6, 1.4), mix(hex('#4c6e2e'), hex('#7a9a3e'), r()), f.px, r);
    }
  }

  /* ---------------------------------------------------------------- Caída de agua (8 m) */
  const STREAKS = (() => {
    const r = rand(5151);
    return Array.from({ length: 420 }, () => ({
      t: r(),
      y: r(),
      len: r.range(0.04, 0.3),
      w: r.range(0.0015, 0.008),
      light: r() < 0.72,
      a: r.range(0.25, 0.85),
    }));
  })();
  function paintFall(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = SUBJ;
    const H = poolY - lipY;
    const scroll = ((f.timeS * u(SPEED, d)) / H) % 1;
    ctx.save();
    fallPath(ctx);
    ctx.fillStyle = linear(ctx, 0, lipY, 0, poolY, [
      [0, '#b7c6c8'],
      [0.5, '#d4dfe0'],
      [1, '#eef3f2'],
    ]);
    ctx.fill();
    ctx.clip();
    // Vetas de agua: blancas (espuma, aire) y grises (agua más densa y transparente)
    for (const s of STREAKS) {
      const yy = lipY + (((s.y + scroll) % 1) * (H + s.len)) - s.len;
      const xl = fallEdge(yy, -1);
      const xr = fallEdge(yy, 1);
      const x = xl + (xr - xl) * s.t;
      ctx.strokeStyle = s.light ? `rgba(255,255,255,${s.a})` : `rgba(70,90,96,${s.a * 0.6})`;
      ctx.lineWidth = Math.max(f.px * 0.7, s.w);
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.lineTo(x + (s.t - 0.5) * s.len * 0.15, yy + s.len);
      ctx.stroke();
    }
    // Gotas y salpicaduras (se congelan con obturaciones rápidas)
    const r = rand(Math.floor(f.timeS * 24) + 7);
    for (let i = 0; i < 260; i++) {
      const y = lipY + r() * H;
      const x = fallEdge(y, -1) + (fallEdge(y, 1) - fallEdge(y, -1)) * r();
      ctx.fillStyle = `rgba(255,255,255,${r.range(0.4, 0.95)})`;
      ctx.fillRect(x, y, Math.max(f.px, u(0.03, d)), Math.max(f.px, u(0.05, d)));
    }
    // Sombra en los bordes del cauce
    ctx.fillStyle = linear(ctx, FALL_X - halfBot, 0, FALL_X + halfBot, 0, [
      [0, 'rgba(40,50,52,0.45)'],
      [0.18, 'rgba(40,50,52,0)'],
      [0.82, 'rgba(40,50,52,0)'],
      [1, 'rgba(40,50,52,0.45)'],
    ]);
    ctx.fillRect(FALL_X - halfBot * 1.2, lipY, halfBot * 2.4, H + 0.02);
    ctx.restore();
  }

  /* ---------------------------------------------------------------- Poza y espuma (7 m) */
  const FOAM = (() => {
    const r = rand(6262);
    return Array.from({ length: 140 }, () => ({ x: r.range(-1.6, 1.6), dz: r.range(0, 1), s: r.range(0.04, 0.16), a: r.range(0.35, 0.85) }));
  })();
  function paintPool(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = SUBJ - 1;
    const top = poolY;
    const bottom = gy(4.2);
    // Agua verde oscura con reflejo del cielo nublado
    ctx.fillStyle = linear(ctx, 0, top, 0, bottom, [
      [0, '#5a6e6a'],
      [0.4, '#2f4440'],
      [1, '#1c2a28'],
    ]);
    ctx.fillRect(f.x0, top, f.x1 - f.x0, bottom - top);
    // Bruma blanca en la base de la caída
    for (let i = 0; i < 4; i++) softDot(ctx, FALL_X, poolY - u(0.2, d), u(1.6 + i * 0.8, d), hex('#eef4f2'), 0.35, 0.2);
    // Espuma que deriva lentamente hacia la derecha (se estira con exposiciones largas)
    const drift = u(0.6, d) * f.timeS;
    for (const fo of FOAM) {
      const span = 3.2;
      const x = ((((fo.x + drift + span / 2) % span) + span) % span) - span / 2;
      const y = top + (bottom - top) * fo.dz * 0.9 + u(0.1, d);
      const k = 1 - fo.dz * 0.5;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 0.28);
      softDot(ctx, 0, 0, u(fo.s * 8, d) * k, hex('#f2f6f4'), fo.a * (1 - fo.dz * 0.6), 0.35);
      ctx.restore();
    }
  }

  /* ---------------------------------------------------------------- Arroyo entre piedras (4 m) */
  const STREAM_D = 4;
  function streamPath(ctx: CanvasRenderingContext2D): void {
    const top = gy(4.2);
    const bottom = gy(2.6);
    ctx.beginPath();
    ctx.moveTo(-0.45, top);
    ctx.bezierCurveTo(-0.2, top + 0.05, -0.05, bottom - 0.1, -0.3, bottom + 0.2);
    ctx.lineTo(0.55, bottom + 0.2);
    ctx.bezierCurveTo(0.35, bottom - 0.08, 0.42, top + 0.06, 0.62, top);
    ctx.closePath();
  }
  function paintStreamWater(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = STREAM_D;
    ctx.save();
    streamPath(ctx);
    ctx.fillStyle = linear(ctx, 0, gy(4.2), 0, gy(2.6), [
      [0, '#9fb2b2'],
      [1, '#5d7070'],
    ]);
    ctx.fill();
    ctx.clip();
    const r = rand(7272);
    const scroll = (f.timeS * u(1.6, d)) % 0.4;
    for (let i = 0; i < 160; i++) {
      const x = r.range(-0.5, 0.65);
      const y = gy(4.3) + r() * 0.5 + scroll - 0.2;
      ctx.strokeStyle = `rgba(255,255,255,${r.range(0.3, 0.8)})`;
      ctx.lineWidth = Math.max(f.px, u(r.range(0.01, 0.04), d));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + r.range(-0.02, 0.02), y + 0.02, x + r.range(-0.03, 0.03), y + u(r.range(0.1, 0.4), d));
      ctx.stroke();
    }
    ctx.restore();
  }
  function paintStreamRocks(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = STREAM_D;
    const r = rand(8282);
    const rocks: Array<[number, number, number]> = [
      [-0.62, 0.02, 0.9],
      [0.78, 0.01, 1.1],
      [-0.1, 0.0, 0.45],
      [0.25, 0.06, 0.5],
      [-1.1, 0.03, 1.3],
      [1.2, 0.0, 1.2],
    ];
    for (const [x, dy, s] of rocks) {
      const base = gy(d) + dy;
      const w = u(s, d);
      ctx.fillStyle = linear(ctx, x - w, base - w * 0.6, x + w * 0.4, base, [
        [0, '#5f665c'],
        [0.5, '#3c423a'],
        [1, '#1e221e'],
      ]);
      blobPath(ctx, x, base - w * 0.25, w, w * 0.45, r, 0.12, 14, true);
      ctx.fill();
      ctx.save();
      blobPath(ctx, x, base - w * 0.25, w, w * 0.45, r, 0.12, 14, true);
      ctx.clip();
      grain(ctx, x - w, base - w, w * 2, w, 0.5, w * 0.4);
      // Musgo en la parte superior y brillo húmedo
      softDot(ctx, x - w * 0.2, base - w * 0.55, w * 0.55, hex('#5f8a32'), 0.55, 0.3);
      ctx.strokeStyle = 'rgba(230,240,240,0.35)';
      ctx.lineWidth = Math.max(f.px, w * 0.015);
      ctx.beginPath();
      ctx.arc(x - w * 0.1, base - w * 0.2, w * 0.5, Math.PI * 1.15, Math.PI * 1.5);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ---------------------------------------------------------------- Primer plano (2 m) */
  function paintForeground(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = FG;
    const r = rand(9393);
    const base = gy(d);
    for (const [x, s] of [
      [-0.95, 1.6],
      [1.0, 1.4],
    ] as const) {
      const w = u(s * 0.6, d);
      ctx.fillStyle = linear(ctx, x - w, base - w, x + w, base, [
        [0, '#59624f'],
        [1, '#1a1d18'],
      ]);
      blobPath(ctx, x, base - w * 0.2, w, w * 0.55, r, 0.15, 14, true);
      ctx.fill();
      ctx.save();
      blobPath(ctx, x, base - w * 0.2, w, w * 0.55, r, 0.15, 14, true);
      ctx.clip();
      grain(ctx, x - w, base - w, w * 2, w * 1.2, 0.5, w * 0.5);
      softDot(ctx, x, base - w * 0.6, w * 0.7, hex('#628c34'), 0.6, 0.4);
      ctx.restore();
    }
    for (let i = 0; i < 9; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * r.range(0.55, 1.2);
      fern(ctx, x, base - u(0.4, d), u(r.range(0.5, 0.8), d), side * r.range(-0.6, 0.3), side * r.range(0.4, 1.0), mix(hex('#3e6a24'), hex('#7aa040'), r()), f.px, r);
    }
  }

  return {
    id: 'waterfall',
    seed: 5050,
    layers: [
      { id: 'bosque', distanceM: BG, paint: paintForest },
      { id: 'paredes', distanceM: SUBJ + 1, paint: paintCliff },
      {
        id: 'caida',
        distanceM: SUBJ,
        animated: true,
        motion: { speedMS: SPEED, dirX: 0, dirY: 1, confine: true },
        paint: paintFall,
        bounds: () => ({ x0: FALL_X - halfBot * 1.3, x1: FALL_X + halfBot * 1.3, y0: lipY - 0.02, y1: poolY + 0.03 }),
      },
      {
        id: 'poza',
        distanceM: SUBJ - 1,
        animated: true,
        motion: { speedMS: 0.6, dirX: 1, dirY: 0 },
        paint: paintPool,
        bounds: (f) => ({ x0: f.x0, x1: f.x1, y0: poolY - u(4.6, SUBJ - 1), y1: gy(4.2) + 0.01 }),
      },
      {
        id: 'arroyo',
        distanceM: STREAM_D,
        animated: true,
        motion: { speedMS: 1.6, dirX: 0, dirY: 1, confine: true },
        paint: paintStreamWater,
        bounds: () => ({ x0: -0.6, x1: 0.7, y0: gy(4.3) - 0.02, y1: gy(2.6) + 0.22 }),
      },
      { id: 'piedras', distanceM: STREAM_D, paint: paintStreamRocks },
      { id: 'primer-plano', distanceM: FG, paint: paintForeground },
    ],
  };
}
