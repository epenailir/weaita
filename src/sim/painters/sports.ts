/**
 * Deporte a pleno sol con teleobjetivo: un jugador corre con la pelota (≈20 m), otros jugadores
 * más atrás, carteles publicitarios en el borde del campo y gradas llenas de público (≈55 m).
 * A 1/2000 s el jugador queda congelado; a 1/60 s se barre en la dirección de la carrera.
 */
import type { SimScene } from '../types';
import {
  css,
  ellipse,
  figure,
  fillFrame,
  grain,
  groundShadow,
  groundY,
  hex,
  linear,
  mix,
  rand,
  scale,
  sizer,
  wrapCentered,
} from './kit';
import type { FigureStyle } from './kit';
import type { PaintFrame, SceneLayer, ScenePainter } from './types';

const HZ = -0.29;
const CAM_H = 1.6;

interface Runner {
  id: string;
  d: number;
  speed: number;
  dir: 1 | -1;
  x0: number;
  style: FigureStyle;
  ball: boolean;
  loopS: number;
  stride: number;
}

export function sportsPainter(scene: SimScene): ScenePainter {
  const REF = scene.refFocalMm;
  const u = sizer(REF);
  const gy = (d: number) => groundY(HZ, REF, CAM_H, d);
  const SUBJ = scene.lighting.subjectDistanceM;
  const SPEED = scene.lighting.subjectSpeedMS;
  const BG = scene.lighting.backgroundDistanceM;
  const STANDS_D = BG + 6;
  const BOARDS_D = BG - 3;

  const home: FigureStyle = {
    skin: hex('#b07a58'),
    hair: hex('#1e1610'),
    top: hex('#c8262c'),
    bottom: hex('#f4f4f2'),
    shoes: hex('#1a1a1c'),
    legs: 'shorts',
    sleeves: 'short',
    socks: hex('#c8262c'),
    stripe: hex('#ffffff'),
  };
  const away: FigureStyle = {
    skin: hex('#8a5a40'),
    hair: hex('#121010'),
    top: hex('#1d3c78'),
    bottom: hex('#1d3c78'),
    shoes: hex('#f2f2f2'),
    legs: 'shorts',
    sleeves: 'short',
    socks: hex('#f2f2f2'),
  };
  const runners: Runner[] = [
    { id: 'jugador', d: SUBJ, speed: SPEED, dir: 1, x0: -0.05, style: home, ball: true, loopS: 3.2, stride: 2.9 },
    { id: 'rival', d: SUBJ + 9, speed: SPEED * 0.85, dir: 1, x0: -0.62, style: away, ball: false, loopS: 4.1, stride: 2.7 },
    { id: 'companero', d: SUBJ + 18, speed: SPEED * 0.6, dir: -1, x0: 0.75, style: { ...home, skin: hex('#d9a888') }, ball: false, loopS: 6, stride: 2.4 },
  ];

  /* ---------------------------------------------------------------- Gradas con público (≈56 m) */
  function paintStands(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = STANDS_D;
    const base = gy(d);
    fillFrame(ctx, f, linear(ctx, 0, f.y0, 0, base, [
      [0, '#3a3e48'],
      [1, '#5a5e66'],
    ]));
    const r = rand(1111);
    const rowH = u(0.82, d);
    const seatW = u(0.55, d);
    const rows = Math.ceil((base - f.y0) / rowH) + 1;
    const shirts = [hex('#c8262c'), hex('#e8e6e0'), hex('#c8262c'), hex('#2a2d36'), hex('#f2c230'), hex('#c8262c'), hex('#3a6ab0'), hex('#e8e6e0')];
    const skins = [hex('#e0b896'), hex('#b07a58'), hex('#8a5a40'), hex('#c99a7a')];
    for (let k = 0; k < rows; k++) {
      const yRow = base - u(1.1, d) - k * rowH;
      if (yRow < f.y0 - rowH || yRow > f.y1 + rowH) continue;
      // Escalón de hormigón y asientos
      ctx.fillStyle = k % 2 ? '#4a4e58' : '#52565f';
      ctx.fillRect(f.x0, yRow, f.x1 - f.x0, rowH);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(f.x0, yRow + rowH * 0.8, f.x1 - f.x0, rowH * 0.2);
      const off = (k % 2) * seatW * 0.5;
      for (let x = Math.floor((f.x0 - off) / seatW) * seatW + off; x < f.x1; x += seatW) {
        if (r() < 0.08) {
          ctx.fillStyle = '#b8262a';
          ctx.fillRect(x + seatW * 0.1, yRow + rowH * 0.35, seatW * 0.8, rowH * 0.4);
          continue;
        }
        const jx = (r() - 0.5) * seatW * 0.25;
        const stand = r() < 0.25 ? u(0.3, d) : 0;
        const shirt = r.pick(shirts);
        const cx = x + seatW * 0.5 + jx;
        const top = yRow + rowH * 0.22 - stand;
        // Hombros redondeados con luz desde arriba
        ctx.fillStyle = linear(ctx, 0, top, 0, top + rowH * 0.8, [
          [0, css(mix(shirt, hex('#ffffff'), 0.15))],
          [1, css(scale(shirt, 0.6))],
        ]);
        ctx.beginPath();
        ctx.moveTo(cx - seatW * 0.38, top + rowH * 0.8);
        ctx.lineTo(cx - seatW * 0.38, top + rowH * 0.22);
        ctx.quadraticCurveTo(cx - seatW * 0.36, top, cx - seatW * 0.12, top);
        ctx.lineTo(cx + seatW * 0.12, top);
        ctx.quadraticCurveTo(cx + seatW * 0.36, top, cx + seatW * 0.38, top + rowH * 0.22);
        ctx.lineTo(cx + seatW * 0.38, top + rowH * 0.8);
        ctx.closePath();
        ctx.fill();
        // Cabeza, pelo o gorra
        const skin = r.pick(skins);
        const hy = top - seatW * 0.2;
        ctx.fillStyle = css(skin);
        ellipse(ctx, cx, hy, seatW * 0.17, seatW * 0.21);
        ctx.fill();
        ctx.fillStyle = r() < 0.18 ? css(r.pick(shirts)) : css(r.pick([hex('#1e1610'), hex('#4a3426'), hex('#8a6a4a'), hex('#d8c8a8')]));
        ctx.beginPath();
        ctx.ellipse(cx, hy - seatW * 0.04, seatW * 0.18, seatW * 0.17, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        if (r() < 0.12) {
          // Brazo en alto o bufanda
          ctx.strokeStyle = css(r() < 0.5 ? shirt : hex('#ffffff'));
          ctx.lineWidth = seatW * 0.14;
          ctx.beginPath();
          ctx.lineCap = 'round';
          ctx.moveTo(cx + seatW * 0.3, top + rowH * 0.1);
          ctx.lineTo(cx + seatW * 0.45, top - rowH * 0.7);
          ctx.stroke();
        }
      }
    }
    // Sombra de la cubierta sobre las filas altas
    ctx.fillStyle = linear(ctx, 0, f.y0, 0, base - u(8, d), [
      [0, 'rgba(10,12,20,0.55)'],
      [1, 'rgba(10,12,20,0)'],
    ]);
    ctx.fillRect(f.x0, f.y0, f.x1 - f.x0, base - u(8, d) - f.y0);
    // Muro inferior de la tribuna
    ctx.fillStyle = '#2b2e36';
    ctx.fillRect(f.x0, base - u(1.1, d), f.x1 - f.x0, u(1.1, d));
  }

  /* ---------------------------------------------------------------- Carteles (≈47 m) */
  function paintBoards(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = BOARDS_D;
    const base = gy(d);
    const h = u(0.95, d);
    const w = u(7, d);
    const texts = ['MODO M', 'f/2.8', '1/2000 s', 'ISO 100', 'MODO M', 'RAW'];
    const cols = ['#0e1a3a', '#d8261e', '#101418', '#f2c230', '#1f7a4a', '#ffffff'];
    const ink = ['#ffb224', '#ffffff', '#a3ff57', '#101418', '#ffffff', '#d8261e'];
    let i = Math.floor(f.x0 / w) - 1;
    for (let x = i * w; x < f.x1 + w; x += w, i++) {
      const k = ((i % cols.length) + cols.length) % cols.length;
      ctx.fillStyle = cols[k]!;
      ctx.fillRect(x, base - h, w - u(0.06, d), h);
      ctx.fillStyle = ink[k]!;
      ctx.font = `700 ${h * 0.55}px Geist, system-ui, sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(texts[k]!, x + w / 2, base - h / 2);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x, base - h, w, h * 0.12);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(f.x0, base, f.x1 - f.x0, u(0.15, d));
  }

  /* ---------------------------------------------------------------- Césped (plano) */
  function paintField(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const top = gy(BOARDS_D);
    const bottom = f.y1 + f.px;
    if (bottom <= top) return;
    ctx.fillStyle = '#3f8a3a';
    ctx.fillRect(f.x0, top, f.x1 - f.x0, bottom - top);
    // Franjas de corte cada 5 m de profundidad
    for (let d = 2; d < BOARDS_D; d += 5) {
      const y0 = gy(d + 5);
      const y1 = gy(d);
      if (y1 < f.y0 || y0 > f.y1) continue;
      ctx.fillStyle = Math.round(d / 5) % 2 ? '#4b9a42' : '#3a8236';
      ctx.fillRect(f.x0, y0, f.x1 - f.x0, y1 - y0);
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(f.x0, top, f.x1 - f.x0, bottom - top);
    ctx.clip();
    grain(ctx, f.x0, top, f.x1 - f.x0, bottom - top, 0.4, u(1.2, SUBJ));
    grain(ctx, f.x0, top, f.x1 - f.x0, bottom - top, 0.25, u(0.25, SUBJ), 0.3);
    ctx.restore();
    // Líneas del campo: banda lejana y línea del área
    for (const [d, w] of [
      [BOARDS_D - 4, 0.12],
      [SUBJ + 13, 0.12],
    ] as const) {
      ctx.fillStyle = 'rgba(245,245,240,0.85)';
      ctx.fillRect(f.x0, gy(d) - u(w / 2, d) * 0.4, f.x1 - f.x0, Math.max(f.px, (gy(d - w) - gy(d)) * 1.2));
    }
    // Luz más brillante lejos (cielo reflejado) y sombra de la tribuna sobre el fondo del campo
    ctx.fillStyle = linear(ctx, 0, top, 0, bottom, [
      [0, 'rgba(20,30,20,0.35)'],
      [0.08, 'rgba(20,30,20,0)'],
      [1, 'rgba(0,0,0,0.12)'],
    ]);
    ctx.fillRect(f.x0, top, f.x1 - f.x0, bottom - top);
  }

  /* ---------------------------------------------------------------- Jugadores */
  function runnerLayer(rn: Runner): SceneLayer {
    return {
      id: rn.id,
      distanceM: rn.d,
      animated: true,
      motion: { speedMS: rn.speed, dirX: rn.dir, dirY: 0 },
      bounds(f) {
        const k = u(1, rn.d);
        const x = rn.x0 + rn.dir * u(rn.speed, rn.d) * wrapCentered(f.timeS, rn.loopS);
        const base = gy(rn.d);
        return { x0: x - k * 1.1, x1: x + k * 1.1, y0: base - k * 2.05, y1: base + k * 0.15 };
      },
      paint(ctx, f) {
        const k = u(1, rn.d);
        const x = rn.x0 + rn.dir * u(rn.speed, rn.d) * wrapCentered(f.timeS, rn.loopS);
        const h = 1.82 * k;
        if (x + h < f.x0 || x - h > f.x1) return;
        const base = gy(rn.d);
        const phase = f.timeS * rn.stride * Math.PI * 2 + rn.x0 * 10;
        groundShadow(ctx, x - rn.dir * k * 0.15, base + k * 0.02, k * 0.55, k * 0.08, 0.45);
        figure(ctx, x, base, h, { facing: rn.dir, pose: 'run', phase, style: rn.style, lightX: 0.4 });
        if (rn.ball) {
          // Pelota delante del pie, girando
          const bx = x + rn.dir * k * 0.55;
          const by = base - k * 0.11;
          const br = k * 0.11;
          ctx.fillStyle = linear(ctx, bx - br, by - br, bx + br, by + br, [
            [0, '#ffffff'],
            [1, '#a8aab0'],
          ]);
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
          const rot = (f.timeS * rn.speed) / 0.11;
          ctx.fillStyle = '#1c1c20';
          for (let i = 0; i < 5; i++) {
            const a = rot + (i / 5) * Math.PI * 2;
            const px = bx + Math.cos(a) * br * 0.62;
            const py = by + Math.sin(a) * br * 0.62;
            if (Math.cos(a) < -0.3) continue;
            ctx.beginPath();
            for (let v = 0; v < 5; v++) {
              const b = (v / 5) * Math.PI * 2 + a;
              const vx = px + Math.cos(b) * br * 0.2;
              const vy = py + Math.sin(b) * br * 0.2;
              if (v === 0) ctx.moveTo(vx, vy);
              else ctx.lineTo(vx, vy);
            }
            ctx.closePath();
            ctx.fill();
          }
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ellipse(ctx, bx, base + k * 0.01, br * 1.1, br * 0.25);
          ctx.fill();
        }
      },
    };
  }

  return {
    id: 'sports-action',
    seed: 7070,
    layers: [
      { id: 'gradas', distanceM: STANDS_D, paint: paintStands },
      { id: 'carteles', distanceM: BOARDS_D, paint: paintBoards },
      { id: 'cesped', distanceM: SUBJ, plane: { horizonY: HZ, cameraHeightM: CAM_H, farM: BOARDS_D }, paint: paintField },
      ...runners
        .slice()
        .sort((a, b) => b.d - a.d)
        .map((rn) => runnerLayer(rn)),
    ],
  };
}
