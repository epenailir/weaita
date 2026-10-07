/**
 * Plaza al caer la tarde: un ciclista cruza frente a guirnaldas de luces colgantes, con fachadas
 * coloniales con soportales al fondo (40 m), adoquines en perspectiva y una maceta con un olivo
 * desenfocada en primer plano (1.6 m).
 */
import type { SimScene } from '../types';
import {
  blobPath,
  css,
  ellipse,
  figure,
  fillFrame,
  grain,
  groundShadow,
  groundY,
  hex,
  kelvinLight,
  linear,
  mix,
  profileHeadPath,
  radial,
  rand,
  scale,
  shadedLimb,
  sizer,
  smoothClosed,
  softDot,
  taperPath,
  wrapCentered,
} from './kit';
import type { FigureStyle, Pt, RGB } from './kit';
import type { Emitter, PaintFrame, ScenePainter } from './types';

const HZ = -0.04;
const CAM_H = 1.4;

interface Building {
  x: number;
  w: number;
  h: number;
  color: RGB;
  floors: number;
  arcade: boolean;
  roof: 'tiles' | 'parapet';
  seed: number;
}

interface LightString {
  d: number;
  xa: number;
  xb: number;
  /** Altura en pantalla de los anclajes (unidades) y comba (m). */
  y: number;
  sagM: number;
  spacingM: number;
  postM: number;
}

export function plazaPainter(scene: SimScene): ScenePainter {
  const REF = scene.refFocalMm;
  const u = sizer(REF);
  const gy = (d: number) => groundY(HZ, REF, CAM_H, d);
  const BG = scene.lighting.backgroundDistanceM;
  const SUBJ = scene.lighting.subjectDistanceM;
  const FG = scene.lighting.foregroundDistanceM ?? 1.6;
  const SPEED = scene.lighting.subjectSpeedMS;

  /* ---------------------------------------------------------------- Catálogos deterministas */
  const facadeColors = ['#d8a465', '#c47a58', '#e4d0a2', '#a3b49a', '#d2b07c', '#b8694a', '#e2c79d', '#a9b7c0', '#cf8f62'].map(hex);
  const buildings: Building[] = [];
  {
    const r = rand(11);
    let x = -2.4;
    let i = 0;
    while (x < 2.4) {
      const w = u(r.range(7, 12), BG);
      const floors = r.chance(0.75) ? 3 : 2;
      buildings.push({
        x,
        w,
        h: u(floors * 3.7 + r.range(0.9, 2.0), BG),
        color: facadeColors[(i * 4 + 1) % facadeColors.length]!,
        floors,
        arcade: r.chance(0.72),
        roof: r.chance(0.5) ? 'tiles' : 'parapet',
        seed: 100 + i,
      });
      x += w;
      i++;
    }
  }
  const strings: LightString[] = [
    { d: 34, xa: -2.4, xb: 2.4, y: -0.17, sagM: 1.1, spacingM: 0.8, postM: 10 },
    { d: 30, xa: -2.4, xb: 2.4, y: -0.25, sagM: 1.0, spacingM: 0.75, postM: 9 },
    { d: 20, xa: -2.2, xb: 2.2, y: -0.31, sagM: 0.8, spacingM: 0.6, postM: 8 },
    { d: 12.5, xa: -2.0, xb: 2.0, y: -0.37, sagM: 0.6, spacingM: 0.5, postM: 6.5 },
  ];
  const bulbColor = kelvinLight(2300);
  const bulbColorWarm = kelvinLight(1900);
  const lampColor = kelvinLight(2600);

  function stringPoints(s: LightString): Array<[number, number]> {
    const span = s.xb - s.xa;
    const n = Math.round(span / u(s.spacingM, s.d));
    const sag = u(s.sagM, s.d);
    const segW = u(s.postM, s.d);
    const pts: Array<[number, number]> = [];
    for (let k = 0; k <= n; k++) {
      const x = s.xa + (k / n) * span;
      const t = (((x - s.xa) % segW) + segW) % segW / segW;
      pts.push([x, s.y + sag * 4 * t * (1 - t)]);
    }
    return pts;
  }

  const lamps = [-1.3, -0.52, 0.72, 1.45].map((x) => ({ x, d: 25 }));
  interface Stroller {
    x: number;
    d: number;
    style: FigureStyle;
    facing: 1 | -1;
    phase: number;
    pose: 'walk' | 'stand';
  }
  const strollers: Stroller[] = [];
  {
    const r = rand(29);
    const tops = ['#2f4858', '#8c3b3b', '#d8c3a5', '#3d5a40', '#5b4a6b', '#c8873a', '#e7e1d6', '#1f2a3a'].map(hex);
    for (let i = 0; i < 11; i++) {
      strollers.push({
        x: r.range(-1.7, 1.7),
        d: r.range(21, 35),
        facing: r.chance(0.5) ? 1 : -1,
        phase: r.range(0, 6),
        pose: r.chance(0.3) ? 'stand' : 'walk',
        style: {
          skin: r.pick([hex('#c99a7a'), hex('#8d6146'), hex('#e0b896'), hex('#a8765a')]),
          hair: r.pick([hex('#2a1d16'), hex('#4a3426'), hex('#14110f'), hex('#8a6a4a')]),
          top: r.pick(tops),
          bottom: r.pick([hex('#2b2f38'), hex('#4b4f5a'), hex('#6b5b4b'), hex('#3a4660')]),
          shoes: hex('#1d1d1f'),
          legs: r.chance(0.25) ? 'skirt' : 'pants',
          sleeves: 'long',
          hairLong: r.chance(0.4),
          coat: r.chance(0.3),
        },
      });
    }
    strollers.sort((a, b) => b.d - a.d);
  }

  /* ---------------------------------------------------------------- Cielo del ocaso */
  function paintSky(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    fillFrame(
      ctx,
      f,
      linear(ctx, 0, -1.3, 0, -0.2, [
        [0, '#17244a'],
        [0.3, '#2f4579'],
        [0.55, '#6f6c9c'],
        [0.75, '#c58c8e'],
        [0.9, '#efb08a'],
        [1, '#f6c79a'],
      ]),
    );
    const r = rand(7);
    for (let i = 0; i < 34; i++) {
      const x = r.range(-2.3, 2.3);
      const y = r.range(-1.2, -0.5);
      const w = r.range(0.1, 0.42);
      const c = mix(hex('#f4ab95'), hex('#8e7cae'), Math.min(1, Math.max(0, (-0.5 - y) * 1.3 + r() * 0.3)));
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, r.range(0.1, 0.2));
      softDot(ctx, 0, 0, w, c, r.range(0.22, 0.45), 0.2);
      ctx.restore();
    }
    // Cúpula lejana
    const dx = 1.2;
    const dy = gy(220);
    const dr = u(9, 220);
    ctx.fillStyle = linear(ctx, dx - dr, 0, dx + dr, 0, [
      [0, '#8a7f9a'],
      [1, '#6a6280'],
    ]);
    ctx.beginPath();
    ctx.arc(dx, dy - u(16, 220), dr, Math.PI, 0);
    ctx.lineTo(dx + dr, dy);
    ctx.lineTo(dx - dr, dy);
    ctx.closePath();
    ctx.fill();
  }

  /* ---------------------------------------------------------------- Fachadas (40 m) */
  function paintFacades(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const base = gy(BG);
    const m = (v: number) => u(v, BG);
    // Campanario detrás de la línea de fachadas.
    {
      const d = BG + 14;
      const tx = -0.66;
      const tw = u(6.5, d);
      const th = u(27, d);
      const ty = gy(d);
      ctx.fillStyle = linear(ctx, tx - tw / 2, 0, tx + tw / 2, 0, [
        [0, '#f0c995'],
        [0.55, '#cfa476'],
        [1, '#94775c'],
      ]);
      ctx.fillRect(tx - tw / 2, ty - th, tw, th);
      ctx.save();
      ctx.beginPath();
      ctx.rect(tx - tw / 2, ty - th, tw, th);
      ctx.clip();
      grain(ctx, tx - tw / 2, ty - th, tw, th, 0.35, u(8, d));
      ctx.restore();
      ctx.fillStyle = '#2c201c';
      for (const k of [-1, 1]) {
        const ax = tx + k * tw * 0.22;
        ctx.beginPath();
        ctx.moveTo(ax - tw * 0.12, ty - th * 0.78);
        ctx.lineTo(ax - tw * 0.12, ty - th * 0.88);
        ctx.arc(ax, ty - th * 0.88, tw * 0.12, Math.PI, 0);
        ctx.lineTo(ax + tw * 0.12, ty - th * 0.78);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#c99c6c';
      ctx.fillRect(tx - tw * 0.56, ty - th * 0.74, tw * 1.12, u(0.5, d));
      ctx.fillRect(tx - tw * 0.56, ty - th, tw * 1.12, u(0.6, d));
      ctx.fillStyle = linear(ctx, tx - tw / 2, 0, tx + tw / 2, 0, [
        [0, '#c4825a'],
        [1, '#7a4a34'],
      ]);
      ctx.beginPath();
      ctx.moveTo(tx - tw * 0.55, ty - th);
      ctx.lineTo(tx, ty - th - tw * 0.9);
      ctx.lineTo(tx + tw * 0.55, ty - th);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2a201c';
      ctx.lineWidth = Math.max(f.px, u(0.15, d));
      ctx.beginPath();
      ctx.moveTo(tx, ty - th - tw * 0.9);
      ctx.lineTo(tx, ty - th - tw * 1.4);
      ctx.moveTo(tx - tw * 0.14, ty - th - tw * 1.22);
      ctx.lineTo(tx + tw * 0.14, ty - th - tw * 1.22);
      ctx.stroke();
    }
    for (const b of buildings) {
      if (b.x > f.x1 || b.x + b.w < f.x0) continue;
      const r = rand(b.seed);
      const top = base - b.h;
      const warm = hex('#ffb37a');
      ctx.fillStyle = linear(ctx, 0, top, 0, base, [
        [0, css(mix(b.color, warm, 0.3))],
        [0.3, css(mix(b.color, warm, 0.08))],
        [0.65, css(scale(b.color, 0.86))],
        [1, css(mix(scale(b.color, 0.55), hex('#3a4462'), 0.3))],
      ]);
      ctx.fillRect(b.x, top, b.w + f.px, b.h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(b.x, top, b.w + f.px, b.h);
      ctx.clip();
      grain(ctx, b.x, top, b.w, b.h, 0.28, m(6), b.seed * 0.13);
      grain(ctx, b.x, top, b.w, b.h, 0.1, m(1.5), b.seed * 0.71);
      ctx.restore();
      // Zócalo
      ctx.fillStyle = css(scale(b.color, 0.6), 0.85);
      ctx.fillRect(b.x, base - m(0.7), b.w + f.px, m(0.7));
      // Techo
      if (b.roof === 'tiles') {
        ctx.fillStyle = linear(ctx, 0, top - m(1.6), 0, top, [
          [0, '#a3563a'],
          [1, '#6e3626'],
        ]);
        ctx.beginPath();
        ctx.moveTo(b.x - m(0.4), top + m(0.1));
        ctx.lineTo(b.x + m(1.2), top - m(1.5));
        ctx.lineTo(b.x + b.w - m(1.2), top - m(1.5));
        ctx.lineTo(b.x + b.w + m(0.4), top + m(0.1));
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(40,18,12,0.35)';
        ctx.lineWidth = Math.max(f.px * 0.7, m(0.06));
        ctx.beginPath();
        for (let tx = b.x; tx < b.x + b.w; tx += m(0.35)) {
          ctx.moveTo(tx, top);
          ctx.lineTo(tx + m(0.25), top - m(1.4));
        }
        ctx.stroke();
      } else {
        ctx.fillStyle = css(mix(b.color, hex('#ffffff'), 0.18));
        ctx.fillRect(b.x - m(0.15), top - m(0.9), b.w + m(0.3), m(0.9));
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(b.x - m(0.15), top - m(0.12), b.w + m(0.3), m(0.12));
      }
      // Cornisa con sombra
      ctx.fillStyle = css(mix(b.color, hex('#fff4e0'), 0.35));
      ctx.fillRect(b.x - m(0.25), top, b.w + m(0.5), m(0.32));
      ctx.fillStyle = linear(ctx, 0, top + m(0.32), 0, top + m(1.0), [
        [0, 'rgba(30,20,30,0.35)'],
        [1, 'rgba(30,20,30,0)'],
      ]);
      ctx.fillRect(b.x, top + m(0.32), b.w, m(0.7));
      const floorH = m(3.7);
      const cols = Math.max(2, Math.round(b.w / m(2.7)));
      const colW = b.w / cols;
      for (let fl = 1; fl <= b.floors - 1; fl++) {
        const lineY = base - floorH * fl - m(0.6);
        ctx.fillStyle = css(mix(b.color, hex('#fff1dc'), 0.25));
        ctx.fillRect(b.x, lineY - m(0.18), b.w, m(0.18));
        ctx.fillStyle = 'rgba(30,20,30,0.18)';
        ctx.fillRect(b.x, lineY, b.w, m(0.25));
        const fy = lineY - floorH + m(1.0);
        for (let c = 0; c < cols; c++) {
          const ww = m(1.15);
          const wh = m(2.15);
          const wx = b.x + colW * (c + 0.5) - ww / 2;
          const lit = r.chance(0.3);
          // Marco
          ctx.fillStyle = css(mix(b.color, hex('#fffaf0'), 0.45));
          ctx.fillRect(wx - m(0.14), fy - m(0.2), ww + m(0.28), wh + m(0.2));
          if (lit) {
            ctx.fillStyle = radial(ctx, wx + ww / 2, fy + wh * 0.45, 0, wh * 0.9, [
              [0, '#ffe2a8'],
              [0.5, '#f0a95c'],
              [1, '#8a4a26'],
            ]);
          } else {
            ctx.fillStyle = linear(ctx, 0, fy, 0, fy + wh, [
              [0, '#9a8fb2'],
              [0.35, '#4c5578'],
              [1, '#262a3c'],
            ]);
          }
          ctx.fillRect(wx, fy, ww, wh);
          if (lit && r.chance(0.6)) {
            // Cortina recogida
            ctx.fillStyle = 'rgba(255,240,215,0.55)';
            ctx.beginPath();
            ctx.moveTo(wx, fy);
            ctx.lineTo(wx + ww * 0.35, fy);
            ctx.quadraticCurveTo(wx + ww * 0.15, fy + wh * 0.5, wx + ww * 0.2, fy + wh);
            ctx.lineTo(wx, fy + wh);
            ctx.closePath();
            ctx.fill();
          }
          ctx.strokeStyle = 'rgba(40,30,30,0.6)';
          ctx.lineWidth = Math.max(f.px * 0.6, m(0.06));
          ctx.beginPath();
          ctx.moveTo(wx + ww / 2, fy);
          ctx.lineTo(wx + ww / 2, fy + wh);
          ctx.moveTo(wx, fy + wh * 0.35);
          ctx.lineTo(wx + ww, fy + wh * 0.35);
          ctx.stroke();
          // Postigos
          const sh = css(scale(mix(b.color, hex('#3f6a5c'), 0.7), 0.85));
          ctx.fillStyle = sh;
          ctx.fillRect(wx - m(0.14) - ww * 0.45, fy - m(0.1), ww * 0.42, wh + m(0.1));
          ctx.fillRect(wx + ww + m(0.14) + ww * 0.03, fy - m(0.1), ww * 0.42, wh + m(0.1));
          // Balcón: losa con sombra y baranda de hierro
          ctx.fillStyle = css(mix(b.color, hex('#ffffff'), 0.2));
          ctx.fillRect(wx - ww * 0.35, fy + wh, ww * 1.7, m(0.16));
          ctx.fillStyle = 'rgba(25,18,24,0.3)';
          ctx.fillRect(wx - ww * 0.3, fy + wh + m(0.16), ww * 1.6, m(0.35));
          ctx.strokeStyle = 'rgba(28,22,22,0.9)';
          ctx.lineWidth = Math.max(f.px * 0.7, m(0.05));
          ctx.beginPath();
          const ry = fy + wh - m(0.95);
          ctx.moveTo(wx - ww * 0.35, ry);
          ctx.lineTo(wx + ww * 1.35, ry);
          for (let k = 0; k <= 8; k++) {
            const bx = wx - ww * 0.35 + (ww * 1.7 * k) / 8;
            ctx.moveTo(bx, ry);
            ctx.lineTo(bx, fy + wh);
          }
          ctx.stroke();
          if (r.chance(0.18)) {
            // Macetas con flores en el balcón
            for (let k = 0; k < 3; k++) {
              ctx.fillStyle = css(r.pick([hex('#b8475a'), hex('#c98a3a'), hex('#a94a7a')]));
              ellipse(ctx, wx - ww * 0.2 + k * ww * 0.6, fy + wh - m(0.2), m(0.22), m(0.15));
              ctx.fill();
            }
          }
        }
      }
      // Planta baja
      const gh = floorH - m(0.6);
      if (b.arcade) {
        // Interior del soportal en penumbra cálida
        ctx.fillStyle = linear(ctx, 0, base - gh, 0, base, [
          [0, '#5a3524'],
          [1, '#2a1a14'],
        ]);
        ctx.fillRect(b.x, base - gh, b.w, gh);
        for (let c = 0; c < cols; c++) {
          const cx = b.x + colW * (c + 0.5);
          // Escaparate iluminado al fondo
          ctx.fillStyle = radial(ctx, cx, base - gh * 0.35, 0, colW * 0.55, [
            [0, '#ffe0a8'],
            [0.5, '#e09450'],
            [1, 'rgba(120,60,30,0)'],
          ]);
          ctx.fillRect(cx - colW * 0.5, base - gh, colW, gh);
          if (r.chance(0.5)) {
            ctx.fillStyle = 'rgba(40,24,18,0.75)';
            ctx.fillRect(cx - colW * 0.28, base - gh * 0.5, colW * 0.56, m(0.12));
            ctx.fillRect(cx - colW * 0.28, base - gh * 0.3, colW * 0.56, m(0.12));
          }
        }
        // Pilares y arcos
        ctx.fillStyle = css(scale(b.color, 0.92));
        for (let c = 0; c <= cols; c++) {
          const px = b.x + colW * c;
          ctx.fillRect(px - m(0.35), base - gh, m(0.7), gh);
        }
        for (let c = 0; c < cols; c++) {
          const ax = b.x + colW * c + m(0.35);
          const aw = colW - m(0.7);
          ctx.beginPath();
          ctx.moveTo(ax, base - gh);
          ctx.lineTo(ax, base - gh + aw * 0.35);
          ctx.quadraticCurveTo(ax + aw / 2, base - gh - aw * 0.12, ax + aw, base - gh + aw * 0.35);
          ctx.lineTo(ax + aw, base - gh);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(20,14,20,0.25)';
        for (let c = 0; c <= cols; c++) ctx.fillRect(b.x + colW * c + m(0.2), base - gh, m(0.15), gh);
      } else {
        for (let c = 0; c < cols; c++) {
          const dw = m(1.7);
          const dx = b.x + colW * (c + 0.5) - dw / 2;
          const shop = r.chance(0.5);
          ctx.fillStyle = css(mix(b.color, hex('#fffaf0'), 0.4));
          ctx.fillRect(dx - m(0.15), base - m(3.0), dw + m(0.3), m(3.0));
          ctx.fillStyle = shop
            ? radial(ctx, dx + dw / 2, base - m(1.4), 0, m(2), [
                [0, '#ffe3b0'],
                [1, '#b06a36'],
              ])
            : '#3a2a22';
          ctx.fillRect(dx, base - m(2.85), dw, m(2.85));
        }
      }
      // Sombra de contacto con el suelo y separación entre casas
      ctx.fillStyle = linear(ctx, 0, base - m(0.8), 0, base, [
        [0, 'rgba(0,0,0,0)'],
        [1, 'rgba(0,0,0,0.3)'],
      ]);
      ctx.fillRect(b.x, base - m(0.8), b.w, m(0.8));
      ctx.fillStyle = 'rgba(20,14,20,0.35)';
      ctx.fillRect(b.x + b.w - f.px * 0.5, top, f.px * 1.2, b.h);
    }
  }

  function facadeLights(): Emitter[] {
    const out: Emitter[] = [];
    const base = gy(BG);
    for (const b of buildings) {
      if (!b.arcade) continue;
      const cols = Math.max(2, Math.round(b.w / u(2.7, BG)));
      const colW = b.w / cols;
      for (let c = 0; c < cols; c++) {
        out.push({ kind: 'point', x: b.x + colW * (c + 0.5), y: base - u(2.4, BG), size: u(0.22, BG), color: lampColor, power: 14 });
      }
    }
    return out;
  }

  /* ---------------------------------------------------------------- Suelo (adoquines) */
  function paintGround(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const top = gy(BG);
    const bottom = f.y1 + f.px;
    if (bottom <= top) return;
    ctx.fillStyle = linear(ctx, 0, top, 0, bottom, [
      [0, '#a49088'],
      [0.2, '#7f7069'],
      [1, '#3f3733'],
    ]);
    ctx.fillRect(f.x0, top, f.x1 - f.x0, bottom - top);
    const shades = ['#857770', '#776a64', '#8f8079', '#6b5f59', '#9a8a80', '#7e6e64'];
    const paths = shades.map(() => new Path2D());
    const hl = new Path2D();
    const r = rand(5);
    let d = 2.2;
    while (d < BG) {
      const depth = 0.12 + r() * 0.02;
      const y0 = gy(d + depth);
      const y1 = gy(d);
      d += depth;
      if (y0 > f.y1 || y1 < f.y0) continue;
      const rowH = y1 - y0;
      // Más lejos los adoquines miden menos de 4 px: basta la textura.
      if (rowH < f.px * 2 || u(0.18, d) < f.px * 4) break;
      let x = f.x0 - u(0.3, d) * r();
      while (x < f.x1) {
        const sw = u(r.range(0.13, 0.24), d);
        const k = r.int(0, shades.length - 1);
        const g = Math.max(f.px * 0.4, sw * 0.07);
        const rx = x + g;
        const ry = y0 + rowH * 0.12 + (r() - 0.5) * rowH * 0.08;
        const w = sw - 2 * g;
        const h = rowH * 0.78;
        const rr = Math.min(w * 0.45, h * 0.5);
        addRound(paths[k]!, rx, ry, w, h, rr);
        addRound(hl, rx + w * 0.15, ry + h * 0.05, w * 0.7, h * 0.28, rr * 0.5);
        x += sw;
      }
    }
    shades.forEach((s, i) => {
      ctx.fillStyle = s;
      ctx.fill(paths[i]!);
    });
    ctx.fillStyle = 'rgba(255,214,180,0.16)';
    ctx.fill(hl);
    // Más allá, las filas de adoquines se comprimen en líneas finas alternas.
    const rows = new Path2D();
    for (let dd = d; dd < BG; dd += 0.14) {
      const ya = gy(dd + 0.14);
      const yb = gy(dd);
      if (yb - ya < f.px * 0.7) break;
      rows.rect(f.x0, ya, f.x1 - f.x0, (yb - ya) * 0.22);
    }
    ctx.fillStyle = 'rgba(40,32,30,0.22)';
    ctx.fill(rows);
    ctx.save();
    ctx.beginPath();
    ctx.rect(f.x0, top, f.x1 - f.x0, bottom - top);
    ctx.clip();
    grain(ctx, f.x0, top, f.x1 - f.x0, bottom - top, 0.14, u(0.6, 4));
    ctx.restore();
    // Brillo del cielo en el adoquín lejano; viñeta hacia la cámara.
    ctx.fillStyle = linear(ctx, 0, top, 0, bottom, [
      [0, 'rgba(246,190,150,0.4)'],
      [0.25, 'rgba(150,120,130,0.06)'],
      [1, 'rgba(10,8,8,0.3)'],
    ]);
    ctx.fillRect(f.x0, top, f.x1 - f.x0, bottom - top);
    // Reflejos cálidos de los soportales y charcos de luz de los faroles.
    for (const b of buildings) {
      if (!b.arcade || b.x > f.x1 || b.x + b.w < f.x0) continue;
      const cols = Math.max(2, Math.round(b.w / u(2.7, BG)));
      const colW = b.w / cols;
      for (let c = 0; c < cols; c++) {
        ctx.save();
        ctx.translate(b.x + colW * (c + 0.5), top + u(1.5, BG));
        ctx.scale(0.55, 1);
        softDot(ctx, 0, 0, u(4, 30), hex('#ffbe7c'), 0.28);
        ctx.restore();
      }
    }
    for (const l of lamps) {
      ctx.save();
      ctx.translate(l.x, gy(l.d));
      ctx.scale(1, 0.16);
      softDot(ctx, 0, 0, u(5, l.d), hex('#ffc88a'), 0.35);
      ctx.restore();
    }
  }

  /* ---------------------------------------------------------------- Fondo de la plaza (≈25 m) */
  function paintPlazaBack(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const r = rand(41);
    // Naranjos en macetones
    for (const tx of [-1.8, -1.0, 1.1, 1.85]) {
      const d = 27;
      const h = u(r.range(4.5, 5.5), d);
      if (tx + h < f.x0 || tx - h > f.x1) continue;
      const g = gy(d);
      ctx.fillStyle = '#6a5a52';
      ctx.fillRect(tx - u(0.6, d), g - u(0.6, d), u(1.2, d), u(0.6, d));
      ctx.fillStyle = '#3a2c24';
      ctx.fillRect(tx - u(0.12, d), g - h * 0.55, u(0.24, d), h * 0.5);
      const cy = g - h * 0.68;
      for (let i = 0; i < 26; i++) {
        const a = r() * Math.PI * 2;
        const rr = Math.sqrt(r()) * h * 0.3;
        const px = tx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr * 0.8;
        const s = h * r.range(0.09, 0.15);
        const lit = Math.max(0, Math.min(1, 0.45 - (py - cy) / h + (px - tx) / h));
        ctx.fillStyle = radial(ctx, px - s * 0.2, py - s * 0.3, 0, s * 1.1, [
          [0, css(mix(hex('#3b5233'), hex('#7a8f55'), lit))],
          [1, '#1c2619'],
        ]);
        blobPath(ctx, px, py, s, s * 0.9, r, 0.22, 9);
        ctx.fill();
      }
      ctx.fillStyle = '#e8902e';
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.arc(tx + (r() - 0.5) * h * 0.5, cy + (r() - 0.5) * h * 0.4, u(0.07, d), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Faroles de hierro
    for (const l of lamps) {
      const y = gy(l.d);
      const ph = u(4.2, l.d);
      ctx.strokeStyle = '#18171a';
      ctx.lineWidth = Math.max(f.px, u(0.13, l.d));
      ctx.beginPath();
      ctx.moveTo(l.x, y);
      ctx.lineTo(l.x, y - ph);
      ctx.stroke();
      ctx.fillStyle = '#18171a';
      ctx.fillRect(l.x - u(0.18, l.d), y - u(0.5, l.d), u(0.36, l.d), u(0.5, l.d));
      ctx.fillRect(l.x - u(0.3, l.d), y - ph - u(0.1, l.d), u(0.6, l.d), u(0.1, l.d));
      ctx.fillStyle = radial(ctx, l.x, y - ph - u(0.42, l.d), 0, u(0.45, l.d), [
        [0, '#fff4d6'],
        [1, '#e39a4c'],
      ]);
      ctx.beginPath();
      ctx.moveTo(l.x - u(0.26, l.d), y - ph - u(0.1, l.d));
      ctx.lineTo(l.x - u(0.2, l.d), y - ph - u(0.75, l.d));
      ctx.lineTo(l.x + u(0.2, l.d), y - ph - u(0.75, l.d));
      ctx.lineTo(l.x + u(0.26, l.d), y - ph - u(0.1, l.d));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#18171a';
      ctx.beginPath();
      ctx.moveTo(l.x - u(0.3, l.d), y - ph - u(0.75, l.d));
      ctx.lineTo(l.x, y - ph - u(1.0, l.d));
      ctx.lineTo(l.x + u(0.3, l.d), y - ph - u(0.75, l.d));
      ctx.closePath();
      ctx.fill();
    }
    for (const p of strollers) {
      const h = u(1.7, p.d);
      if (p.x + h < f.x0 || p.x - h > f.x1) continue;
      groundShadow(ctx, p.x, gy(p.d), h * 0.2, h * 0.03, 0.35);
      figure(ctx, p.x, gy(p.d), h, { facing: p.facing, pose: p.pose, phase: p.phase, style: p.style, lightX: 1, rim: 0.35, rimColor: hex('#ffc890') });
    }
  }

  function plazaBackLights(): Emitter[] {
    return lamps.flatMap((l): Emitter[] => {
      const y = gy(l.d) - u(4.2, l.d) - u(0.45, l.d);
      return [
        { kind: 'point', x: l.x, y, size: u(0.32, l.d), color: lampColor, power: 30 },
        { kind: 'glow', x: l.x, y, radius: u(0.8, l.d), color: lampColor, power: 0.22 },
      ];
    });
  }

  /* ---------------------------------------------------------------- Guirnaldas */
  function paintStrings(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    for (const s of strings) {
      const pts = stringPoints(s);
      ctx.strokeStyle = 'rgba(22,18,18,0.85)';
      ctx.lineWidth = Math.max(f.px * 0.8, u(0.015, s.d));
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
      ctx.fillStyle = '#fff0cc';
      for (const [x, y] of pts) {
        if (x < f.x0 - 0.05 || x > f.x1 + 0.05) continue;
        ellipse(ctx, x, y + u(0.07, s.d), u(0.045, s.d), u(0.065, s.d));
        ctx.fill();
      }
    }
  }

  function stringLights(): Emitter[] {
    const out: Emitter[] = [];
    const r = rand(77);
    for (const s of strings) {
      for (const [x, y] of stringPoints(s)) {
        out.push({
          kind: 'point',
          x,
          y: y + u(0.07, s.d),
          size: u(0.07, s.d),
          color: r.chance(0.2) ? bulbColorWarm : bulbColor,
          power: r.range(16, 26),
          distanceM: s.d,
        });
      }
    }
    return out;
  }

  /* ---------------------------------------------------------------- Ciclista (6 m, 5 m/s) */
  const BIKE_X = 0.08;
  const LOOP_S = 4.5;
  function paintCyclist(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = SUBJ;
    const k = u(1, d);
    const cx = BIKE_X - u(SPEED, d) * wrapCentered(f.timeS, LOOP_S);
    if (cx + k * 1.6 < f.x0 || cx - k * 1.6 > f.x1) return;
    const base = gy(d);
    const F = -1; // avanza hacia la izquierda
    const P = (lx: number, ly: number): Pt => ({ x: cx + F * lx * k, y: base - ly * k });
    const wheelAngle = (f.timeS * SPEED) / 0.34;
    const crank = wheelAngle / 2.6;
    const L = 1; // luz desde la derecha (soportales iluminados detrás)

    groundShadow(ctx, cx, base + k * 0.01, k * 0.95, k * 0.06, 0.5);

    const wheel = (hx: number) => {
      const c = P(hx, 0.34);
      ctx.strokeStyle = '#121214';
      ctx.lineWidth = k * 0.04;
      ctx.beginPath();
      ctx.arc(c.x, c.y, k * 0.32, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = k * 0.008;
      ctx.beginPath();
      ctx.arc(c.x, c.y, k * 0.335, -Math.PI * 0.9, -Math.PI * 0.3);
      ctx.stroke();
      ctx.strokeStyle = '#a9adb3';
      ctx.lineWidth = k * 0.016;
      ctx.beginPath();
      ctx.arc(c.x, c.y, k * 0.293, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(205,210,216,0.7)';
      ctx.lineWidth = Math.max(f.px * 0.5, k * 0.004);
      ctx.beginPath();
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + wheelAngle * F;
        ctx.moveTo(c.x + Math.cos(a) * k * 0.03, c.y + Math.sin(a) * k * 0.03);
        ctx.lineTo(c.x + Math.cos(a + 0.3) * k * 0.285, c.y + Math.sin(a + 0.3) * k * 0.285);
      }
      ctx.stroke();
      ctx.fillStyle = '#c8ccd2';
      ctx.beginPath();
      ctx.arc(c.x, c.y, k * 0.028, 0, Math.PI * 2);
      ctx.fill();
    };
    wheel(-0.5);
    wheel(0.52);

    const skin = hex('#b9805e');
    const jersey = hex('#b8322a');
    const shorts = hex('#17181c');
    const sock = hex('#ececec');
    const bb = P(0, 0.29);
    const hip = P(-0.15, 1.0);
    const thigh = 0.46 * k;
    const shin = 0.47 * k;

    const leg = (ang: number, far: boolean) => {
      const kk = far ? 0.62 : 1;
      const pedal = P(Math.cos(ang) * 0.17, 0.29 + Math.sin(ang) * 0.17);
      const foot: Pt = { x: pedal.x, y: pedal.y - k * 0.03 };
      const dx = foot.x - hip.x;
      const dy = foot.y - hip.y;
      const dist = Math.min(Math.hypot(dx, dy), (thigh + shin) * 0.999);
      const a = Math.atan2(dy, dx);
      const cosK = (thigh * thigh + dist * dist - shin * shin) / (2 * thigh * dist);
      const off = Math.acos(Math.max(-1, Math.min(1, cosK)));
      const knee: Pt = { x: hip.x + Math.cos(a - off * F) * thigh, y: hip.y + Math.sin(a - off * F) * thigh };
      // Biela y pedal
      ctx.strokeStyle = far ? '#1b1b1e' : '#2c2c31';
      ctx.lineWidth = k * 0.028;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bb.x, bb.y);
      ctx.lineTo(pedal.x, pedal.y);
      ctx.stroke();
      ctx.fillStyle = css(scale(hex('#f2f2f0'), kk));
      taperPath(ctx, { x: foot.x - F * k * 0.06, y: foot.y }, { x: foot.x + F * k * 0.13, y: foot.y + k * 0.015 }, k * 0.08, k * 0.06);
      ctx.fill();
      shadedLimb(ctx, knee, { x: foot.x - F * k * 0.02, y: foot.y - k * 0.03 }, k * 0.1, k * 0.065, skin, L, kk);
      shadedLimb(ctx, { x: knee.x + (foot.x - knee.x) * 0.62, y: knee.y + (foot.y - knee.y) * 0.62 }, { x: foot.x - F * k * 0.02, y: foot.y - k * 0.03 }, k * 0.072, k * 0.068, sock, L, kk);
      shadedLimb(ctx, hip, knee, k * 0.17, k * 0.115, shorts, L, kk);
    };
    leg(crank + Math.PI, true);

    // Cuadro de acero esmaltado
    const frameCol = hex('#1d6a73');
    const rear = P(-0.5, 0.34);
    const front = P(0.52, 0.34);
    const seat = P(-0.13, 0.84);
    const headTop = P(0.41, 0.83);
    const headLow = P(0.38, 0.68);
    const tube = (a: Pt, b: Pt, w: number) => shadedLimb(ctx, a, b, w, w, frameCol, L, 1);
    tube(rear, bb, k * 0.032);
    tube(rear, seat, k * 0.026);
    tube(bb, seat, k * 0.04);
    tube(seat, headTop, k * 0.036);
    tube(bb, headLow, k * 0.044);
    tube(headLow, headTop, k * 0.05);
    ctx.strokeStyle = '#b9bdc3';
    ctx.lineWidth = k * 0.028;
    ctx.beginPath();
    ctx.moveTo(headLow.x, headLow.y);
    ctx.quadraticCurveTo(P(0.5, 0.5).x, P(0.5, 0.5).y, front.x, front.y);
    ctx.stroke();
    // Cadena y plato
    ctx.strokeStyle = 'rgba(60,60,66,0.9)';
    ctx.lineWidth = k * 0.012;
    ctx.beginPath();
    ctx.moveTo(P(0, 0.39).x, P(0, 0.39).y);
    ctx.lineTo(P(-0.5, 0.39).x, P(-0.5, 0.39).y);
    ctx.moveTo(P(0, 0.19).x, P(0, 0.19).y);
    ctx.lineTo(P(-0.5, 0.29).x, P(-0.5, 0.29).y);
    ctx.stroke();
    ctx.strokeStyle = '#4a4a52';
    ctx.lineWidth = k * 0.02;
    ctx.beginPath();
    ctx.arc(bb.x, bb.y, k * 0.1, 0, Math.PI * 2);
    ctx.stroke();
    // Sillín y manillar
    const saddle = P(-0.17, 0.95);
    ctx.strokeStyle = '#a9adb3';
    ctx.lineWidth = k * 0.022;
    ctx.beginPath();
    ctx.moveTo(seat.x, seat.y);
    ctx.lineTo(saddle.x, saddle.y);
    ctx.stroke();
    ctx.fillStyle = '#141416';
    taperPath(ctx, P(-0.29, 0.97), P(-0.05, 0.95), k * 0.06, k * 0.03);
    ctx.fill();
    const stem = P(0.47, 0.95);
    ctx.strokeStyle = '#1a1a1d';
    ctx.lineWidth = k * 0.03;
    ctx.beginPath();
    ctx.moveTo(headTop.x, headTop.y);
    ctx.lineTo(stem.x, stem.y);
    ctx.quadraticCurveTo(P(0.6, 0.95).x, P(0.6, 0.95).y, P(0.56, 0.84).x, P(0.56, 0.84).y);
    ctx.stroke();

    // Torso inclinado con maillot
    const back: Array<[number, number]> = [
      [-0.24, 1.0],
      [-0.12, 1.28],
      [0.1, 1.47],
      [0.27, 1.52],
      [0.36, 1.43],
      [0.3, 1.33],
      [0.12, 1.18],
      [0.02, 1.0],
    ];
    smoothClosed(
      ctx,
      back.map(([x, y]) => {
        const p = P(x, y);
        return [p.x, p.y] as [number, number];
      }),
    );
    const tA = P(0.05, 1.5);
    const tB = P(0.15, 1.15);
    ctx.fillStyle = linear(ctx, tA.x, tA.y, tB.x, tB.y, [
      [0, css(scale(jersey, 1.15))],
      [0.6, css(jersey)],
      [1, css(scale(jersey, 0.62))],
    ]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = k * 0.035;
    ctx.beginPath();
    ctx.moveTo(P(-0.17, 1.17).x, P(-0.17, 1.17).y);
    ctx.quadraticCurveTo(P(0.0, 1.36).x, P(0.0, 1.36).y, P(0.25, 1.45).x, P(0.25, 1.45).y);
    ctx.stroke();
    // Brazo cercano
    const shoulder = P(0.27, 1.43);
    const elbow = P(0.42, 1.22);
    const hand = P(0.55, 0.95);
    shadedLimb(ctx, elbow, hand, k * 0.075, k * 0.06, skin, L, 1);
    shadedLimb(ctx, shoulder, elbow, k * 0.1, k * 0.08, skin, L, 1);
    shadedLimb(ctx, shoulder, P(0.36, 1.3), k * 0.12, k * 0.11, jersey, L, 1);
    ctx.fillStyle = '#1a1a1d';
    ellipse(ctx, hand.x, hand.y, k * 0.045, k * 0.04);
    ctx.fill();
    // Cuello, cabeza de perfil, casco con ventilaciones y gafas
    const head = P(0.45, 1.6);
    const hh = k * 0.22;
    shadedLimb(ctx, P(0.3, 1.47), P(0.4, 1.55), k * 0.075, k * 0.07, skin, L, 0.85);
    profileHeadPath(ctx, head.x, head.y, hh, F);
    ctx.fillStyle = linear(ctx, head.x - hh * 0.5, 0, head.x + hh * 0.5, 0, [
      [0, css(scale(skin, 0.72))],
      [1, css(scale(skin, 1.06))],
    ]);
    ctx.fill();
    ctx.fillStyle = css(scale(skin, 0.7));
    ellipse(ctx, head.x - F * hh * 0.05, head.y + hh * 0.04, hh * 0.07, hh * 0.1);
    ctx.fill();
    ctx.fillStyle = '#2a1c14';
    ctx.beginPath();
    ctx.ellipse(head.x - F * hh * 0.3, head.y + hh * 0.08, hh * 0.13, hh * 0.22, 0.3 * F, 0, Math.PI * 2);
    ctx.fill();
    const helmet = (x: number, y: number): [number, number] => [head.x + F * x * hh, head.y + y * hh];
    ctx.beginPath();
    ctx.moveTo(...helmet(0.42, -0.14));
    ctx.bezierCurveTo(...helmet(0.4, -0.62), ...helmet(-0.2, -0.78), ...helmet(-0.52, -0.42));
    ctx.quadraticCurveTo(...helmet(-0.62, -0.18), ...helmet(-0.45, -0.06));
    ctx.quadraticCurveTo(...helmet(0.0, -0.2), ...helmet(0.42, -0.14));
    ctx.closePath();
    ctx.fillStyle = linear(ctx, head.x, head.y - hh * 0.7, head.x, head.y - hh * 0.05, [
      [0, '#fdfdfb'],
      [0.6, '#d9dce1'],
      [1, '#8e939c'],
    ]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,44,52,0.75)';
    ctx.lineWidth = hh * 0.05;
    ctx.beginPath();
    for (const t of [-0.25, 0.0, 0.22]) {
      ctx.moveTo(...helmet(t - 0.08, -0.6 + Math.abs(t) * 0.3));
      ctx.lineTo(...helmet(t + 0.06, -0.48 + Math.abs(t) * 0.3));
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(28,30,38,0.92)';
    ctx.beginPath();
    ctx.moveTo(...helmet(0.42, -0.1));
    ctx.lineTo(...helmet(0.18, -0.1));
    ctx.lineTo(...helmet(0.2, 0.0));
    ctx.lineTo(...helmet(0.43, 0.0));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(28,30,38,0.9)';
    ctx.lineWidth = hh * 0.03;
    ctx.beginPath();
    ctx.moveTo(...helmet(0.2, -0.06));
    ctx.lineTo(...helmet(-0.05, -0.02));
    ctx.stroke();
    leg(crank, false);
  }

  /* ---------------------------------------------------------------- Olivo en maceta (1.6 m) */
  function paintPlanter(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = FG;
    const k = u(1, d);
    const base = gy(d);
    const potR = -0.95;
    const potL = potR - k * 0.75;
    const potTop = base - k * 0.8;
    if (-0.4 < f.x0) return;
    // Maceta de barro (solo visible con angulares)
    ctx.fillStyle = linear(ctx, potL, 0, potR, 0, [
      [0, '#5a2a1c'],
      [0.55, '#a8583c'],
      [1, '#6e3424'],
    ]);
    ctx.beginPath();
    ctx.moveTo(potL - k * 0.05, potTop);
    ctx.lineTo(potR + k * 0.05, potTop);
    ctx.lineTo(potR - k * 0.05, base);
    ctx.lineTo(potL + k * 0.05, base);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c06b4c';
    ctx.fillRect(potL - k * 0.07, potTop - k * 0.03, potR - potL + k * 0.14, k * 0.07);
    // Tronco retorcido y ramas que entran al cuadro por la izquierda
    const trunk = { x: (potL + potR) / 2, y: potTop };
    ctx.strokeStyle = '#3a2e25';
    ctx.lineCap = 'round';
    ctx.lineWidth = k * 0.09;
    ctx.beginPath();
    ctx.moveTo(trunk.x, trunk.y);
    ctx.bezierCurveTo(trunk.x + k * 0.2, trunk.y - k * 0.5, trunk.x - k * 0.15, trunk.y - k * 0.9, trunk.x + k * 0.1, trunk.y - k * 1.35);
    ctx.stroke();
    const r = rand(303);
    const tips: Array<[number, number]> = [
      [-0.43, -0.42],
      [-0.47, -0.2],
      [-0.52, -0.05],
      [-0.6, -0.55],
      [-0.7, 0.05],
    ];
    const knot = { x: trunk.x + k * 0.1, y: trunk.y - k * 1.3 };
    ctx.lineWidth = k * 0.025;
    for (const [tx, ty] of tips) {
      ctx.beginPath();
      ctx.moveTo(knot.x, knot.y);
      ctx.quadraticCurveTo((knot.x + tx) / 2, Math.min(knot.y, ty) - k * 0.15, tx, ty);
      ctx.stroke();
    }
    // Hojas lanceoladas verde plateado a lo largo de las ramas
    for (const [tx, ty] of tips) {
      for (let i = 0; i < 70; i++) {
        const t = Math.pow(r(), 0.7);
        const mx = (knot.x + tx) / 2;
        const my = Math.min(knot.y, ty) - k * 0.15;
        const bx = (1 - t) * (1 - t) * knot.x + 2 * (1 - t) * t * mx + t * t * tx;
        const by = (1 - t) * (1 - t) * knot.y + 2 * (1 - t) * t * my + t * t * ty;
        const len = k * r.range(0.05, 0.085);
        const ang = r.range(-1.3, 1.3) + (r.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
        const lx = bx + Math.cos(ang) * len * 0.8;
        const ly = by + Math.sin(ang) * len * 0.8;
        const lit = r();
        ctx.fillStyle = css(mix(hex('#3e4f30'), hex('#9fae84'), lit * 0.9));
        ctx.beginPath();
        ctx.ellipse(lx, ly, len, len * 0.2, ang, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = css(mix(hex('#c9d2b3'), hex('#6f7d58'), lit), 0.6);
        ctx.lineWidth = Math.max(f.px * 0.5, len * 0.05);
        ctx.beginPath();
        ctx.moveTo(lx - Math.cos(ang) * len * 0.9, ly - Math.sin(ang) * len * 0.9);
        ctx.lineTo(lx + Math.cos(ang) * len * 0.9, ly + Math.sin(ang) * len * 0.9);
        ctx.stroke();
      }
    }
  }

  return {
    id: 'plaza',
    seed: 913,
    layers: [
      { id: 'cielo', distanceM: 5000, noPeaking: true, paint: paintSky },
      { id: 'fachadas', distanceM: BG, paint: paintFacades, emitters: facadeLights },
      { id: 'suelo', distanceM: 10, plane: { horizonY: HZ, cameraHeightM: CAM_H, farM: BG }, paint: paintGround },
      { id: 'plaza-fondo', distanceM: 26, paint: paintPlazaBack, emitters: plazaBackLights },
      { id: 'guirnaldas', distanceM: 20, paint: paintStrings, emitters: stringLights },
      {
        id: 'ciclista',
        distanceM: SUBJ,
        animated: true,
        motion: { speedMS: SPEED, dirX: -1, dirY: 0 },
        paint: paintCyclist,
        bounds: (f) => {
          const k = u(1, SUBJ);
          const cx = BIKE_X - u(SPEED, SUBJ) * wrapCentered(f.timeS, LOOP_S);
          const base = gy(SUBJ);
          return { x0: cx - k * 1.05, x1: cx + k * 1.05, y0: base - k * 1.9, y1: base + k * 0.12 };
        },
      },
      { id: 'olivo', distanceM: FG, paint: paintPlanter },
    ],
  };
}

function addRound(p: Path2D, x: number, y: number, w: number, h: number, r: number): void {
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y);
  p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r);
  p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h);
  p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r);
  p.quadraticCurveTo(x, y, x + r, y);
  p.closePath();
}
