/**
 * Plaza al caer la tarde: un ciclista cruza frente a guirnaldas de luces colgantes, con fachadas
 * coloniales al fondo (40 m), adoquines en perspectiva y un macetero desenfocado en primer plano.
 */
import type { SimScene } from '../types';
import {
  blobPath,
  css,
  ellipse,
  figure,
  fillFrame,
  groundShadow,
  groundY,
  hex,
  kelvinLight,
  linear,
  mix,
  radial,
  rand,
  roundRect,
  scale,
  sizer,
  softDot,
  wrapCentered,
} from './kit';
import type { FigureStyle, RGB } from './kit';
import type { Emitter, PaintFrame, ScenePainter } from './types';

const HZ = -0.1;
const CAM_H = 1.5;

interface Building {
  x: number;
  w: number;
  h: number;
  color: RGB;
  floors: number;
  arcade: boolean;
  seed: number;
}

interface LightString {
  d: number;
  xa: number;
  xb: number;
  /** Altura de los anclajes sobre el suelo (m) y comba (m). */
  hM: number;
  sagM: number;
  spacingM: number;
}

export function plazaPainter(scene: SimScene): ScenePainter {
  const REF = scene.refFocalMm;
  const u = sizer(REF);
  const gy = (d: number) => groundY(HZ, REF, CAM_H, d);
  const BG = scene.lighting.backgroundDistanceM;
  const SUBJ = scene.lighting.subjectDistanceM;
  const FG = scene.lighting.foregroundDistanceM ?? 1.6;

  // Fachadas: catálogo determinista.
  const facadeColors = ['#d9a66b', '#c97b5a', '#e6d3a8', '#9fb39a', '#d4b483', '#b86a4b', '#e3c9a0', '#a8b8c4'].map(hex);
  const buildings: Building[] = [];
  {
    const r = rand(11);
    let x = -2.3;
    let i = 0;
    while (x < 2.3) {
      const wM = r.range(7, 12);
      const w = u(wM, BG);
      const floors = r.int(3, 4);
      buildings.push({ x, w, h: u(floors * 3.6 + r.range(0.8, 2.2), BG), color: facadeColors[i % facadeColors.length]!, floors, arcade: r.chance(0.7), seed: 100 + i });
      x += w;
      i++;
    }
  }
  const strings: LightString[] = [
    { d: 30, xa: -2.4, xb: 2.4, hM: 6.2, sagM: 0.9, spacingM: 0.7 },
    { d: 20, xa: -2.2, xb: 2.2, hM: 5.2, sagM: 0.8, spacingM: 0.6 },
    { d: 13, xa: -2.0, xb: 2.0, hM: 4.6, sagM: 0.65, spacingM: 0.55 },
  ];
  const bulbColor = kelvinLight(2300);
  const lampColor = kelvinLight(2500);
  const windowWarm = hex('#ffcf8c');

  /** Posición (unidades) de la bombilla k de una guirnalda. */
  function stringPoints(s: LightString): Array<[number, number]> {
    const span = s.xb - s.xa;
    const n = Math.round(span / u(s.spacingM, s.d));
    const y0 = gy(s.d) - u(s.hM, s.d);
    const sag = u(s.sagM, s.d);
    const pts: Array<[number, number]> = [];
    // Varias catenarias consecutivas entre postes cada ~9 m.
    const segW = u(9, s.d);
    for (let k = 0; k <= n; k++) {
      const x = s.xa + (k / n) * span;
      const t = ((x - s.xa) % segW) / segW;
      pts.push([x, y0 + sag * 4 * t * (1 - t)]);
    }
    return pts;
  }

  // Árboles, faroles y paseantes al fondo de la plaza.
  const lamps = [-1.25, -0.42, 0.62, 1.38].map((x) => ({ x, d: 24 }));
  const strollers: Array<{ x: number; d: number; style: FigureStyle; facing: 1 | -1; phase: number }> = [];
  {
    const r = rand(29);
    const tops = ['#2f4858', '#8c3b3b', '#d8c3a5', '#3d5a40', '#5b4a6b', '#c8873a'].map(hex);
    for (let i = 0; i < 9; i++) {
      const d = r.range(22, 34);
      strollers.push({
        x: r.range(-1.6, 1.6),
        d,
        facing: r.chance(0.5) ? 1 : -1,
        phase: r.range(0, 6),
        style: {
          skin: r.pick([hex('#c99a7a'), hex('#8d6146'), hex('#e0b896')]),
          hair: r.pick([hex('#2a1d16'), hex('#4a3426'), hex('#14110f')]),
          top: r.pick(tops),
          bottom: r.pick([hex('#2b2f38'), hex('#4b4f5a'), hex('#6b5b4b')]),
          shoes: hex('#1d1d1f'),
          legs: r.chance(0.25) ? 'skirt' : 'pants',
          sleeves: 'long',
          hairLong: r.chance(0.4),
        },
      });
    }
    strollers.sort((a, b) => b.d - a.d);
  }

  /* ---------------------------------------------------------------- Cielo */
  function paintSky(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    fillFrame(
      ctx,
      f,
      linear(ctx, 0, -1.25, 0, -0.35, [
        [0, '#1c2b52'],
        [0.35, '#3e5288'],
        [0.65, '#8a7aa6'],
        [0.85, '#d99a8a'],
        [1, '#f2b98b'],
      ]),
    );
    // Nubes altas teñidas de rosa por el sol ya puesto.
    const r = rand(7);
    for (let i = 0; i < 26; i++) {
      const x = r.range(-2.2, 2.2);
      const y = r.range(-1.15, -0.62);
      const w = r.range(0.12, 0.4);
      const c = mix(hex('#f0a99a'), hex('#9a86b8'), r());
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, r.range(0.12, 0.22));
      softDot(ctx, 0, 0, w, c, r.range(0.25, 0.5));
      ctx.restore();
    }
  }

  /* ---------------------------------------------------------------- Fachadas (40 m) */
  function paintFacades(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const base = gy(BG);
    // Campanario detrás de la línea de fachadas.
    {
      const tx = -0.62;
      const tw = u(6, BG + 12);
      const th = u(30, BG + 12);
      const ty = gy(BG + 12);
      ctx.fillStyle = linear(ctx, tx - tw / 2, 0, tx + tw / 2, 0, [
        [0, '#e7c08e'],
        [0.6, '#c9a072'],
        [1, '#9c7a5a'],
      ]);
      ctx.fillRect(tx - tw / 2, ty - th, tw, th);
      // Cuerpo de campanas
      ctx.fillStyle = '#3a2a24';
      for (let k = -1; k <= 1; k += 2) {
        roundRect(ctx, tx + k * tw * 0.22 - tw * 0.13, ty - th * 0.9, tw * 0.26, th * 0.12, tw * 0.13);
        ctx.fill();
      }
      ctx.fillStyle = '#d7ab78';
      ctx.beginPath();
      ctx.moveTo(tx - tw * 0.55, ty - th);
      ctx.lineTo(tx, ty - th - tw * 1.1);
      ctx.lineTo(tx + tw * 0.55, ty - th);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2a201c';
      ctx.lineWidth = Math.max(f.px, u(0.12, BG));
      ctx.beginPath();
      ctx.moveTo(tx, ty - th - tw * 1.1);
      ctx.lineTo(tx, ty - th - tw * 1.6);
      ctx.moveTo(tx - tw * 0.15, ty - th - tw * 1.42);
      ctx.lineTo(tx + tw * 0.15, ty - th - tw * 1.42);
      ctx.stroke();
    }
    for (const b of buildings) {
      if (b.x > f.x1 || b.x + b.w < f.x0) continue;
      const r = rand(b.seed);
      const top = base - b.h;
      // Luz: la parte alta aún recibe el último sol (cálido); abajo, sombra azulada.
      ctx.fillStyle = linear(ctx, 0, top, 0, base, [
        [0, css(mix(b.color, hex('#ffb27a'), 0.25))],
        [0.35, css(b.color)],
        [1, css(mix(scale(b.color, 0.62), hex('#3d4766'), 0.25))],
      ]);
      ctx.fillRect(b.x, top, b.w + f.px, b.h);
      // Cornisa y pretil
      ctx.fillStyle = css(scale(b.color, 0.75));
      ctx.fillRect(b.x - u(0.2, BG), top, b.w + u(0.4, BG), u(0.45, BG));
      ctx.fillStyle = css(mix(b.color, hex('#ffffff'), 0.25));
      ctx.fillRect(b.x - u(0.2, BG), top + u(0.45, BG), b.w + u(0.4, BG), u(0.12, BG));
      const floorH = u(3.6, BG);
      const cols = Math.max(2, Math.round(b.w / u(2.6, BG)));
      const colW = b.w / cols;
      // Plantas altas: ventanas con balcón; algunas iluminadas.
      for (let fl = 1; fl < b.floors; fl++) {
        const fy = base - floorH * (fl + 1) + u(0.9, BG);
        for (let c = 0; c < cols; c++) {
          const wx = b.x + colW * (c + 0.5) - u(0.6, BG);
          const ww = u(1.2, BG);
          const wh = u(2.1, BG);
          const lit = r.chance(0.32);
          if (lit) {
            ctx.fillStyle = radial(ctx, wx + ww / 2, fy + wh * 0.4, 0, wh, [
              [0, css(windowWarm)],
              [1, css(mix(windowWarm, hex('#a05a2a'), 0.55))],
            ]);
          } else {
            ctx.fillStyle = linear(ctx, 0, fy, 0, fy + wh, [
              [0, '#55618a'],
              [1, '#2a3048'],
            ]);
          }
          roundRect(ctx, wx, fy, ww, wh, ww * 0.12);
          ctx.fill();
          // Persianas abiertas a los lados
          ctx.fillStyle = css(scale(mix(b.color, hex('#4d6b5a'), 0.6), 0.8));
          ctx.fillRect(wx - ww * 0.42, fy, ww * 0.38, wh);
          ctx.fillRect(wx + ww * 1.04, fy, ww * 0.38, wh);
          // Balcón de hierro
          ctx.fillStyle = css(scale(b.color, 0.55));
          ctx.fillRect(wx - ww * 0.2, fy + wh, ww * 1.4, u(0.18, BG));
          ctx.strokeStyle = 'rgba(30,24,22,0.85)';
          ctx.lineWidth = Math.max(f.px * 0.8, u(0.05, BG));
          ctx.beginPath();
          ctx.moveTo(wx - ww * 0.2, fy + wh - u(0.9, BG));
          ctx.lineTo(wx + ww * 1.2, fy + wh - u(0.9, BG));
          for (let k = 0; k <= 6; k++) {
            const bx = wx - ww * 0.2 + (ww * 1.4 * k) / 6;
            ctx.moveTo(bx, fy + wh - u(0.9, BG));
            ctx.lineTo(bx, fy + wh);
          }
          ctx.stroke();
        }
      }
      // Planta baja: soportales con comercios iluminados.
      const gh = floorH * 1.05;
      if (b.arcade) {
        for (let c = 0; c < cols; c++) {
          const ax = b.x + colW * c + colW * 0.12;
          const aw = colW * 0.76;
          const ay = base - gh;
          ctx.beginPath();
          ctx.moveTo(ax, base);
          ctx.lineTo(ax, ay + aw / 2);
          ctx.arc(ax + aw / 2, ay + aw / 2, aw / 2, Math.PI, 0);
          ctx.lineTo(ax + aw, base);
          ctx.closePath();
          ctx.fillStyle = radial(ctx, ax + aw / 2, base - gh * 0.35, 0, gh * 0.9, [
            [0, '#ffd9a0'],
            [0.45, '#c9864a'],
            [1, '#3a2418'],
          ]);
          ctx.fill();
        }
      } else {
        const dw = u(1.6, BG);
        for (let c = 0; c < cols; c++) {
          const dx = b.x + colW * (c + 0.5) - dw / 2;
          ctx.fillStyle = r.chance(0.5) ? '#4a2f22' : '#2d3a4a';
          roundRect(ctx, dx, base - u(2.8, BG), dw, u(2.8, BG), dw * 0.1);
          ctx.fill();
        }
      }
      // Arista de separación entre edificios
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + b.w - f.px, top, f.px * 1.5, b.h);
    }
  }

  function facadeLights(): Emitter[] {
    const out: Emitter[] = [];
    const base = gy(BG);
    for (const b of buildings) {
      if (!b.arcade) continue;
      const cols = Math.max(2, Math.round(b.w / u(2.6, BG)));
      const colW = b.w / cols;
      for (let c = 0; c < cols; c++) {
        out.push({ kind: 'point', x: b.x + colW * (c + 0.5), y: base - u(2.6, BG), size: u(0.25, BG), color: lampColor, power: 9 });
      }
    }
    return out;
  }

  /* ---------------------------------------------------------------- Suelo (adoquines) */
  function paintGround(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const top = gy(BG);
    const bottom = f.y1 + f.px;
    ctx.fillStyle = linear(ctx, 0, top, 0, Math.max(top + 0.01, bottom), [
      [0, '#9b8f8a'],
      [0.25, '#7d726c'],
      [1, '#463e3a'],
    ]);
    ctx.fillRect(f.x0, top, f.x1 - f.x0, bottom - top);
    // Reflejo cálido de los soportales sobre el suelo pulido.
    ctx.fillStyle = linear(ctx, 0, top, 0, top + 0.06, [
      [0, 'rgba(255,200,140,0.35)'],
      [1, 'rgba(255,200,140,0)'],
    ]);
    ctx.fillRect(f.x0, top, f.x1 - f.x0, 0.06);
    // Adoquines por filas, agrupados por tono en pocos trazados.
    const shades = ['#8a7f79', '#7a6f69', '#958a83', '#6d625c', '#a0948b'];
    const paths = shades.map(() => new Path2D());
    const joint = new Path2D();
    const r = rand(5);
    const depthStep = 0.13;
    for (let d = 1.0; d < BG; d += depthStep) {
      const y0 = gy(d + depthStep);
      const y1 = gy(d);
      if (y0 > f.y1 || y1 < f.y0) continue;
      const rowH = y1 - y0;
      if (rowH < f.px * 1.6) break;
      const sw = u(0.2, d);
      const off = (Math.round(d / depthStep) % 2) * sw * 0.5;
      const xStart = Math.floor((f.x0 - off) / sw) * sw + off;
      for (let x = xStart; x < f.x1; x += sw) {
        const k = r.int(0, shades.length - 1);
        const g = sw * 0.08;
        const p = paths[k]!;
        const rx = x + g;
        const ry = y0 + rowH * 0.1;
        const w = sw - 2 * g;
        const h = rowH * 0.8;
        const rr = Math.min(w, h) * 0.35;
        p.moveTo(rx + rr, ry);
        p.lineTo(rx + w - rr, ry);
        p.quadraticCurveTo(rx + w, ry, rx + w, ry + rr);
        p.lineTo(rx + w, ry + h - rr);
        p.quadraticCurveTo(rx + w, ry + h, rx + w - rr, ry + h);
        p.lineTo(rx + rr, ry + h);
        p.quadraticCurveTo(rx, ry + h, rx, ry + h - rr);
        p.lineTo(rx, ry + rr);
        p.quadraticCurveTo(rx, ry, rx + rr, ry);
        p.closePath();
        joint.rect(x, y0 + rowH * 0.88, sw, rowH * 0.12);
      }
    }
    shades.forEach((s, i) => {
      ctx.fillStyle = s;
      ctx.fill(paths[i]!);
    });
    ctx.fillStyle = 'rgba(30,24,22,0.35)';
    ctx.fill(joint);
    // Brillo del cielo en el adoquín lejano y oscurecimiento hacia la cámara.
    ctx.fillStyle = linear(ctx, 0, top, 0, Math.max(top + 0.01, bottom), [
      [0, 'rgba(240,190,160,0.32)'],
      [0.3, 'rgba(120,110,120,0.08)'],
      [1, 'rgba(10,8,8,0.35)'],
    ]);
    ctx.fillRect(f.x0, top, f.x1 - f.x0, bottom - top);
    // Charcos de luz bajo los faroles
    for (const l of lamps) {
      const y = gy(l.d);
      ctx.save();
      ctx.translate(l.x, y);
      ctx.scale(1, 0.18);
      softDot(ctx, 0, 0, u(4, l.d), hex('#ffc88a'), 0.35);
      ctx.restore();
    }
  }

  /* ---------------------------------------------------------------- Fondo de la plaza (≈26 m) */
  function paintPlazaBack(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const treeCols = { dark: hex('#1f2a22'), mid: hex('#34473a'), light: hex('#5d7350'), trunk: hex('#3a2c24') };
    const r = rand(41);
    for (const tx of [-1.75, -0.95, 1.05, 1.8]) {
      const d = 28;
      const h = u(r.range(7, 9), d);
      if (tx + h < f.x0 || tx - h > f.x1) continue;
      // Copa redondeada recortada en esfera (laurel de plaza)
      const cy = gy(d) - h * 0.62;
      ctx.fillStyle = css(treeCols.trunk);
      ctx.fillRect(tx - u(0.18, d), cy, u(0.36, d), gy(d) - cy);
      for (let i = 0; i < 22; i++) {
        const a = r() * Math.PI * 2;
        const rr = Math.sqrt(r()) * h * 0.32;
        const px = tx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr * 0.75;
        const s = h * r.range(0.1, 0.17);
        const lit = Math.max(0, Math.min(1, 0.4 - (py - cy) / h));
        ctx.fillStyle = radial(ctx, px - s * 0.2, py - s * 0.3, 0, s * 1.1, [
          [0, css(mix(treeCols.mid, treeCols.light, lit))],
          [1, css(treeCols.dark)],
        ]);
        blobPath(ctx, px, py, s, s * 0.9, r, 0.2, 9);
        ctx.fill();
      }
    }
    // Faroles: poste de hierro y linterna.
    for (const l of lamps) {
      const y = gy(l.d);
      const ph = u(4.2, l.d);
      ctx.strokeStyle = '#1b1a1c';
      ctx.lineWidth = Math.max(f.px, u(0.14, l.d));
      ctx.beginPath();
      ctx.moveTo(l.x, y);
      ctx.lineTo(l.x, y - ph);
      ctx.stroke();
      ctx.fillStyle = '#1b1a1c';
      ctx.fillRect(l.x - u(0.3, l.d), y - ph - u(0.12, l.d), u(0.6, l.d), u(0.12, l.d));
      ctx.fillStyle = radial(ctx, l.x, y - ph - u(0.4, l.d), 0, u(0.4, l.d), [
        [0, '#fff2d0'],
        [1, '#e8a050'],
      ]);
      roundRect(ctx, l.x - u(0.22, l.d), y - ph - u(0.75, l.d), u(0.44, l.d), u(0.62, l.d), u(0.08, l.d));
      ctx.fill();
    }
    // Paseantes
    for (const p of strollers) {
      const h = u(1.7, p.d);
      if (p.x + h < f.x0 || p.x - h > f.x1) continue;
      groundShadow(ctx, p.x, gy(p.d), h * 0.22, h * 0.03, 0.35);
      figure(ctx, p.x, gy(p.d), h, { facing: p.facing, pose: 'walk', phase: p.phase, style: p.style, lightX: 1, rim: 0.25, rimColor: hex('#ffc890') });
    }
  }

  function plazaBackLights(): Emitter[] {
    return lamps.flatMap((l) => {
      const y = gy(l.d) - u(4.2, l.d) - u(0.44, l.d);
      return [
        { kind: 'point', x: l.x, y, size: u(0.3, l.d), color: lampColor, power: 40 } as Emitter,
        { kind: 'glow', x: l.x, y, radius: u(0.9, l.d), color: lampColor, power: 0.16 } as Emitter,
      ];
    });
  }

  /* ---------------------------------------------------------------- Guirnaldas */
  function paintStrings(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    for (const s of strings) {
      const pts = stringPoints(s);
      ctx.strokeStyle = 'rgba(20,18,18,0.9)';
      ctx.lineWidth = Math.max(f.px * 0.9, u(0.02, s.d));
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
      ctx.fillStyle = '#ffe7b8';
      for (const [x, y] of pts) {
        if (x < f.x0 - 0.05 || x > f.x1 + 0.05) continue;
        ellipse(ctx, x, y + u(0.06, s.d), u(0.045, s.d), u(0.06, s.d));
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
          y: y + u(0.06, s.d),
          size: u(0.08, s.d),
          color: r.chance(0.15) ? kelvinLight(2000) : bulbColor,
          power: r.range(55, 80),
          distanceM: s.d,
        });
      }
    }
    return out;
  }

  /* ---------------------------------------------------------------- Ciclista (6 m, 5 m/s) */
  const BIKE_X = 0.1;
  const SPEED = scene.lighting.subjectSpeedMS;
  const LOOP_S = 4.5;
  function paintCyclist(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = SUBJ;
    const k = u(1, d);
    const vx = (u(SPEED, d)) * -1;
    const cx = BIKE_X + vx * wrapCentered(f.timeS, LOOP_S);
    if (cx + k * 1.5 < f.x0 || cx - k * 1.5 > f.x1) return;
    const base = gy(d);
    const F = -1; // avanza hacia la izquierda
    const P = (lx: number, ly: number): [number, number] => [cx + F * lx * k, base - ly * k];
    const crank = (f.timeS * SPEED) / (2 * Math.PI * 0.34) * (2 * Math.PI) / 2.6;

    groundShadow(ctx, cx, base + k * 0.02, k * 0.85, k * 0.07, 0.45);

    const wheel = (hx: number) => {
      const [x, y] = P(hx, 0.34);
      ctx.strokeStyle = '#141416';
      ctx.lineWidth = k * 0.05;
      ctx.beginPath();
      ctx.arc(x, y, k * 0.315, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#b8bcc2';
      ctx.lineWidth = k * 0.014;
      ctx.beginPath();
      ctx.arc(x, y, k * 0.285, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(200,205,210,0.75)';
      ctx.lineWidth = Math.max(f.px * 0.6, k * 0.005);
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + crank * 0.4;
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * k * 0.285, y + Math.sin(a) * k * 0.285);
      }
      ctx.stroke();
      ctx.fillStyle = '#d0d3d8';
      ctx.beginPath();
      ctx.arc(x, y, k * 0.025, 0, Math.PI * 2);
      ctx.fill();
    };
    wheel(-0.5);
    wheel(0.52);

    const style: FigureStyle = {
      skin: hex('#c48d6a'),
      hair: hex('#2a1c14'),
      top: hex('#c7372b'),
      bottom: hex('#1c1d22'),
      shoes: hex('#f0f0f0'),
      legs: 'pants',
      sleeves: 'short',
    };
    const bb = P(0, 0.3);
    const hip = P(-0.16, 1.0);
    const thigh = 0.47;
    const shin = 0.47;
    const legTo = (ang: number, far: boolean) => {
      const foot = P(Math.cos(ang) * 0.17, 0.3 + Math.sin(ang) * 0.17);
      const dx = foot[0] - hip[0];
      const dy = foot[1] - hip[1];
      const dist = Math.min(Math.hypot(dx, dy), (thigh + shin) * k * 0.999);
      const a = Math.atan2(dy, dx);
      const cosK = (thigh * thigh * k * k + dist * dist - shin * shin * k * k) / (2 * thigh * k * dist);
      const off = Math.acos(Math.max(-1, Math.min(1, cosK)));
      const knee: [number, number] = [hip[0] + Math.cos(a + off * F * -1) * thigh * k, hip[1] + Math.sin(a + off * F * -1) * thigh * k];
      ctx.strokeStyle = css(far ? scale(style.bottom, 0.7) : style.bottom);
      ctx.lineCap = 'round';
      ctx.lineWidth = k * 0.13;
      ctx.beginPath();
      ctx.moveTo(hip[0], hip[1]);
      ctx.lineTo(knee[0], knee[1]);
      ctx.stroke();
      ctx.strokeStyle = css(far ? scale(style.skin, 0.7) : style.skin);
      ctx.lineWidth = k * 0.085;
      ctx.beginPath();
      ctx.moveTo(knee[0], knee[1]);
      ctx.lineTo(foot[0], foot[1]);
      ctx.stroke();
      ctx.strokeStyle = far ? '#9a9a9a' : '#efefef';
      ctx.lineWidth = k * 0.07;
      ctx.beginPath();
      ctx.moveTo(foot[0] - F * k * 0.04, foot[1]);
      ctx.lineTo(foot[0] + F * k * 0.1, foot[1] + k * 0.01);
      ctx.stroke();
      // Biela
      ctx.strokeStyle = '#2a2a2e';
      ctx.lineWidth = k * 0.025;
      ctx.beginPath();
      ctx.moveTo(bb[0], bb[1]);
      ctx.lineTo(foot[0], foot[1]);
      ctx.stroke();
    };
    legTo(crank + Math.PI, true);

    // Cuadro
    const frame = hex('#1f6f78');
    ctx.strokeStyle = css(frame);
    ctx.lineWidth = k * 0.045;
    ctx.lineJoin = 'round';
    const pts = {
      rear: P(-0.5, 0.34),
      front: P(0.52, 0.34),
      seat: P(-0.13, 0.86),
      headTop: P(0.4, 0.86),
      headLow: P(0.36, 0.7),
    };
    ctx.beginPath();
    ctx.moveTo(pts.rear[0], pts.rear[1]);
    ctx.lineTo(bb[0], bb[1]);
    ctx.lineTo(pts.seat[0], pts.seat[1]);
    ctx.lineTo(pts.rear[0], pts.rear[1]);
    ctx.moveTo(pts.seat[0], pts.seat[1]);
    ctx.lineTo(pts.headTop[0], pts.headTop[1]);
    ctx.lineTo(pts.headLow[0], pts.headLow[1]);
    ctx.lineTo(bb[0], bb[1]);
    ctx.moveTo(pts.headLow[0], pts.headLow[1]);
    ctx.lineTo(pts.front[0], pts.front[1]);
    ctx.stroke();
    // Brillo del tubo
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = k * 0.012;
    ctx.beginPath();
    ctx.moveTo(pts.seat[0], pts.seat[1] - k * 0.015);
    ctx.lineTo(pts.headTop[0], pts.headTop[1] - k * 0.015);
    ctx.stroke();
    // Sillín, manillar, plato
    const saddle = P(-0.16, 0.95);
    ctx.strokeStyle = '#18181a';
    ctx.lineWidth = k * 0.025;
    ctx.beginPath();
    ctx.moveTo(pts.seat[0], pts.seat[1]);
    ctx.lineTo(saddle[0], saddle[1]);
    ctx.stroke();
    ctx.fillStyle = '#18181a';
    ellipse(ctx, saddle[0], saddle[1], k * 0.13, k * 0.035);
    ctx.fill();
    const bar = P(0.47, 0.98);
    ctx.beginPath();
    ctx.moveTo(pts.headTop[0], pts.headTop[1]);
    ctx.lineTo(bar[0], bar[1]);
    ctx.lineTo(bar[0] + F * k * 0.12, bar[1] + k * 0.02);
    ctx.stroke();
    ctx.strokeStyle = '#3a3a40';
    ctx.lineWidth = k * 0.02;
    ctx.beginPath();
    ctx.arc(bb[0], bb[1], k * 0.1, 0, Math.PI * 2);
    ctx.stroke();

    // Torso, brazos y cabeza (inclinado hacia el manillar)
    const shoulder = P(0.22, 1.46);
    ctx.strokeStyle = css(style.top);
    ctx.lineCap = 'round';
    ctx.lineWidth = k * 0.25;
    ctx.beginPath();
    ctx.moveTo(hip[0], hip[1] - k * 0.04);
    ctx.quadraticCurveTo(P(0.0, 1.42)[0], P(0.0, 1.42)[1], shoulder[0], shoulder[1]);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = k * 0.04;
    ctx.beginPath();
    ctx.moveTo(P(-0.08, 1.2)[0], P(-0.08, 1.2)[1]);
    ctx.quadraticCurveTo(P(0.04, 1.36)[0], P(0.04, 1.36)[1], P(0.2, 1.4)[0], P(0.2, 1.4)[1]);
    ctx.stroke();
    // Brazo
    const elbow = P(0.36, 1.2);
    ctx.strokeStyle = css(style.top);
    ctx.lineWidth = k * 0.09;
    ctx.beginPath();
    ctx.moveTo(shoulder[0], shoulder[1]);
    ctx.lineTo(P(0.3, 1.33)[0], P(0.3, 1.33)[1]);
    ctx.stroke();
    ctx.strokeStyle = css(style.skin);
    ctx.lineWidth = k * 0.07;
    ctx.beginPath();
    ctx.moveTo(P(0.3, 1.33)[0], P(0.3, 1.33)[1]);
    ctx.lineTo(elbow[0], elbow[1]);
    ctx.lineTo(bar[0], bar[1]);
    ctx.stroke();
    // Cabeza con casco
    const head = P(0.34, 1.62);
    ctx.fillStyle = css(style.skin);
    ellipse(ctx, head[0], head[1], k * 0.095, k * 0.115, 0.2 * F);
    ctx.fill();
    ctx.fillStyle = linear(ctx, head[0] - k * 0.12, 0, head[0] + k * 0.12, 0, [
      [0, '#f4f4f2'],
      [1, '#b9bcc2'],
    ]);
    ctx.beginPath();
    ctx.ellipse(head[0] - F * k * 0.02, head[1] - k * 0.04, k * 0.135, k * 0.1, 0.25 * F, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20232a';
    ctx.fillRect(head[0] - k * 0.13, head[1] - k * 0.045, k * 0.26, k * 0.018);
    legTo(crank, false);
  }

  /* ---------------------------------------------------------------- Macetero (1.6 m) */
  function paintPlanter(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = FG;
    const k = u(1, d);
    const right = -0.36;
    const left = right - k * 0.9;
    const rimY = 0.43;
    if (right < f.x0 || rimY - k * 0.5 > f.y1) return;
    ctx.fillStyle = linear(ctx, left, 0, right, 0, [
      [0, '#6a3322'],
      [0.6, '#a5553a'],
      [1, '#7a3a26'],
    ]);
    ctx.beginPath();
    ctx.moveTo(left - k * 0.05, rimY);
    ctx.lineTo(right + k * 0.05, rimY);
    ctx.lineTo(right - k * 0.04, rimY + k * 0.7);
    ctx.lineTo(left + k * 0.04, rimY + k * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#b8664a';
    ctx.fillRect(left - k * 0.06, rimY - k * 0.02, right - left + k * 0.12, k * 0.07);
    // Hojas de geranio y flores
    const r = rand(303);
    for (let i = 0; i < 46; i++) {
      const x = r.range(left, right + k * 0.08);
      const y = rimY - r.range(0, k * 0.36);
      const s = k * r.range(0.05, 0.09);
      ctx.fillStyle = radial(ctx, x - s * 0.3, y - s * 0.3, 0, s * 1.2, [
        [0, css(mix(hex('#5f8a43'), hex('#9cbf6a'), r()))],
        [1, '#2a3f1e'],
      ]);
      blobPath(ctx, x, y, s, s * 0.85, r, 0.2, 9);
      ctx.fill();
    }
    for (let i = 0; i < 9; i++) {
      const x = r.range(left + k * 0.05, right);
      const y = rimY - r.range(k * 0.18, k * 0.42);
      for (let j = 0; j < 7; j++) {
        const a = r() * Math.PI * 2;
        const rr = r() * k * 0.05;
        ctx.fillStyle = css(mix(hex('#e0344a'), hex('#ff6a7a'), r()));
        ellipse(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr, k * 0.022, k * 0.02);
        ctx.fill();
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
      { id: 'plaza-fondo', distanceM: 27, paint: paintPlazaBack, emitters: plazaBackLights },
      { id: 'guirnaldas', distanceM: 20, paint: paintStrings, emitters: stringLights },
      {
        id: 'ciclista',
        distanceM: SUBJ,
        animated: true,
        motion: { speedMS: SPEED, dirX: -1, dirY: 0 },
        paint: paintCyclist,
      },
      { id: 'macetero', distanceM: FG, paint: paintPlanter },
    ],
  };
}
