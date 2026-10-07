/**
 * Calle de la ciudad en sombra: un peatón camina por la vereda cercana (≈3 m) frente a una hilera
 * de comercios con toldos y carteles (≈15 m). La parte alta de los edificios recibe sol directo
 * (mucho más brillante que la calle en sombra), otros peatones cruzan al fondo.
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
  kelvinLight,
  linear,
  mix,
  radial,
  rand,
  roundRect,
  scale,
  sizer,
  wrapCentered,
} from './kit';
import type { FigureStyle, RGB } from './kit';
import type { Emitter, PaintFrame, SceneLayer, ScenePainter } from './types';

const HZ = -0.17;
const CAM_H = 1.6;

interface Shop {
  x: number;
  w: number;
  color: RGB;
  awning: RGB | null;
  sign: string;
  signColor: RGB;
  window: RGB;
  seed: number;
}

export function streetPainter(scene: SimScene): ScenePainter {
  const REF = scene.refFocalMm;
  const u = sizer(REF);
  const gy = (d: number) => groundY(HZ, REF, CAM_H, d);
  const BG = scene.lighting.backgroundDistanceM;
  const SUBJ = scene.lighting.subjectDistanceM;
  const SPEED = scene.lighting.subjectSpeedMS;
  const warmLamp = kelvinLight(2900);

  const shops: Shop[] = [];
  {
    const r = rand(2323);
    const defs: Array<[string, string, string | null, string]> = [
      ['CAFÉ', '#e6dccb', '#2f5a46', '#f2e6c8'],
      ['LIBROS', '#c9b49a', '#7a2a2a', '#ffe0b0'],
      ['PANADERÍA', '#efe6d6', '#c98a2a', '#ffe8c0'],
      ['FARMACIA', '#d9d9d2', null, '#e8f4ee'],
      ['FLORES', '#b8c4b0', '#5a3a6a', '#f4e8e0'],
      ['ÓPTICA', '#d2c2b0', '#1f3a5a', '#e8eef6'],
      ['MERCADO', '#e2d2b8', '#2f6a3a', '#f8ecd0'],
    ];
    let x = -2.1;
    let i = 0;
    while (x < 2.1) {
      const [sign, col, aw, win] = defs[i % defs.length]!;
      const w = u(r.range(5, 7.5), BG);
      shops.push({ x, w, color: hex(col), awning: aw ? hex(aw) : null, sign, signColor: hex(aw ?? '#1f7a4a'), window: hex(win), seed: i + 1 });
      x += w;
      i++;
    }
  }

  /* ---------------------------------------------------------------- Fachadas (≈15 m) */
  function paintFacades(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = BG;
    const base = gy(d);
    const m = (v: number) => u(v, d);
    fillFrame(ctx, f, '#b9b2a6');
    const sunLine = base - m(9.5);
    for (const s of shops) {
      if (s.x > f.x1 || s.x + s.w < f.x0) continue;
      const r = rand(s.seed * 17);
      // Paño de fachada: en sombra abajo, al sol arriba (borde de sombra nítido y cálido)
      ctx.fillStyle = linear(ctx, 0, base - m(16), 0, base, [
        [0, css(mix(s.color, hex('#fff1d8'), 0.2))],
        [1, css(scale(s.color, 0.72))],
      ]);
      ctx.fillRect(s.x, f.y0 - 0.1, s.w + f.px, base - f.y0 + 0.1);
      ctx.save();
      ctx.beginPath();
      ctx.rect(s.x, f.y0 - 0.1, s.w + f.px, base - f.y0 + 0.1);
      ctx.clip();
      grain(ctx, s.x, f.y0 - 0.1, s.w, base - f.y0 + 0.1, 0.25, m(4), s.seed * 0.3);
      ctx.restore();
      // Ventanas de los pisos altos
      for (let fl = 1; fl < 5; fl++) {
        const fy = base - m(3.4) * fl - m(2.6);
        if (fy > f.y1 || fy + m(2) < f.y0) continue;
        for (let c = 0; c < 2; c++) {
          const wx = s.x + s.w * (0.22 + c * 0.42);
          const ww = m(1.2);
          ctx.fillStyle = css(mix(s.color, hex('#ffffff'), 0.3));
          ctx.fillRect(wx - m(0.12), fy - m(0.12), ww + m(0.24), m(2.1) + m(0.12));
          ctx.fillStyle = linear(ctx, 0, fy, 0, fy + m(1.9), [
            [0, '#8a96aa'],
            [1, '#3a4252'],
          ]);
          ctx.fillRect(wx, fy, ww, m(1.9));
          ctx.strokeStyle = 'rgba(255,255,255,0.6)';
          ctx.lineWidth = Math.max(f.px * 0.6, m(0.05));
          ctx.beginPath();
          ctx.moveTo(wx + ww / 2, fy);
          ctx.lineTo(wx + ww / 2, fy + m(1.9));
          ctx.stroke();
          if (r() < 0.4) {
            ctx.fillStyle = 'rgba(30,26,24,0.85)';
            ctx.fillRect(wx - m(0.25), fy + m(1.9), ww + m(0.5), m(0.1));
            ctx.fillRect(wx - m(0.25), fy + m(1.2), m(0.05), m(0.7));
            ctx.fillRect(wx + ww + m(0.2), fy + m(1.2), m(0.05), m(0.7));
            ctx.fillRect(wx - m(0.25), fy + m(1.2), ww + m(0.5), m(0.05));
          }
        }
      }
      // Planta baja: vidriera iluminada con mercadería, puerta y cartel
      const gh = m(3.2);
      ctx.fillStyle = css(scale(s.color, 0.55));
      ctx.fillRect(s.x, base - gh - m(0.4), s.w, m(0.4));
      const vx = s.x + s.w * 0.08;
      const vw = s.w * 0.58;
      ctx.fillStyle = radial(ctx, vx + vw / 2, base - gh * 0.45, 0, vw * 0.7, [
        [0, css(s.window)],
        [1, css(scale(s.window, 0.55))],
      ]);
      ctx.fillRect(vx, base - gh, vw, gh - m(0.5));
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = 'rgba(60,40,30,0.55)';
        ctx.fillRect(vx + m(0.2), base - gh + m(0.7 + k * 0.75), vw - m(0.4), m(0.06));
        for (let j = 0; j < 7; j++) {
          ctx.fillStyle = css(r.pick([hex('#c84a3a'), hex('#e0b040'), hex('#4a7ab0'), hex('#5a8a4a'), hex('#f0e8d8')]), 0.85);
          ctx.fillRect(vx + m(0.3) + j * (vw - m(0.6)) / 7, base - gh + m(0.7 + k * 0.75) - m(0.4), (vw - m(0.6)) / 9, m(0.4));
        }
      }
      // Reflejo del cielo en el vidrio
      ctx.fillStyle = linear(ctx, vx, base - gh, vx + vw, base, [
        [0, 'rgba(255,255,255,0.22)'],
        [0.4, 'rgba(255,255,255,0)'],
        [0.6, 'rgba(255,255,255,0.08)'],
        [1, 'rgba(255,255,255,0)'],
      ]);
      ctx.fillRect(vx, base - gh, vw, gh - m(0.5));
      ctx.fillStyle = '#2a2420';
      ctx.fillRect(s.x + s.w * 0.72, base - gh + m(0.3), s.w * 0.18, gh - m(0.3));
      ctx.fillStyle = 'rgba(255,230,190,0.35)';
      ctx.fillRect(s.x + s.w * 0.74, base - gh + m(0.5), s.w * 0.14, gh * 0.45);
      // Cartel
      ctx.fillStyle = css(s.signColor);
      roundRect(ctx, s.x + s.w * 0.12, base - gh - m(1.15), s.w * 0.76, m(0.7), m(0.08));
      ctx.fill();
      ctx.fillStyle = '#f8f4ea';
      ctx.font = `600 ${m(0.42)}px Geist, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.sign, s.x + s.w * 0.5, base - gh - m(0.8));
      if (s.sign === 'FARMACIA') {
        const cx = s.x + s.w * 0.95;
        const cy = base - gh - m(0.8);
        ctx.fillStyle = '#28c060';
        ctx.fillRect(cx - m(0.12), cy - m(0.36), m(0.24), m(0.72));
        ctx.fillRect(cx - m(0.36), cy - m(0.12), m(0.72), m(0.24));
      }
      // Toldo a rayas
      if (s.awning) {
        const ay = base - gh - m(0.3);
        const ad = m(1.3);
        const stripes = 10;
        for (let k = 0; k < stripes; k++) {
          ctx.fillStyle = k % 2 ? css(s.awning) : '#f2ede2';
          const sx = vx - m(0.2) + ((vw + m(0.4)) * k) / stripes;
          ctx.beginPath();
          ctx.moveTo(sx, ay);
          ctx.lineTo(sx + (vw + m(0.4)) / stripes, ay);
          ctx.lineTo(sx + (vw + m(0.4)) / stripes, ay + ad);
          ctx.lineTo(sx, ay + ad);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(20,16,14,0.3)';
        ctx.fillRect(vx - m(0.2), ay + ad, vw + m(0.4), m(0.5));
      }
      // Zócalo y bajantes
      ctx.fillStyle = css(scale(s.color, 0.5));
      ctx.fillRect(s.x, base - m(0.5), s.w, m(0.5));
      ctx.fillStyle = 'rgba(40,36,34,0.6)';
      ctx.fillRect(s.x + s.w - m(0.2), f.y0 - 0.1, m(0.12), base - f.y0 + 0.1);
    }
    // Franja alta al sol: mucho más brillante que la calle (rango dinámico de la escena)
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,214,160,0.55)';
    ctx.beginPath();
    ctx.moveTo(f.x0, f.y0 - 0.1);
    ctx.lineTo(f.x1, f.y0 - 0.1);
    ctx.lineTo(f.x1, sunLine - m(2.5));
    ctx.lineTo(f.x0, sunLine);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Vereda de enfrente
    ctx.fillStyle = '#8f8a82';
    ctx.fillRect(f.x0, base, f.x1 - f.x0, gy(BG - 3) - base);
    ctx.fillStyle = '#6a6660';
    ctx.fillRect(f.x0, gy(BG - 3), f.x1 - f.x0, m(0.15));
  }

  function facadeLights(): Emitter[] {
    const out: Emitter[] = [];
    for (const s of shops) {
      out.push({ kind: 'point', x: s.x + s.w * 0.37, y: gy(BG) - u(1.75, BG), size: u(0.16, BG), color: warmLamp, power: 5 });
    }
    return out;
  }

  /* ---------------------------------------------------------------- Peatones del fondo */
  const crowdStyles: FigureStyle[] = [
    { skin: hex('#e0b896'), hair: hex('#2a1d16'), top: hex('#3a4a6a'), bottom: hex('#2b2f38'), shoes: hex('#1d1d1f'), legs: 'pants', sleeves: 'long', coat: true },
    { skin: hex('#8d6146'), hair: hex('#14110f'), top: hex('#b8402e'), bottom: hex('#3a3a40'), shoes: hex('#d8d8d8'), legs: 'pants', sleeves: 'long' },
    { skin: hex('#c99a7a'), hair: hex('#8a6a4a'), top: hex('#e8dccb'), bottom: hex('#4a5a7a'), shoes: hex('#2a2a2a'), legs: 'skirt', sleeves: 'long', hairLong: true, bag: hex('#7a4a2a') },
    { skin: hex('#a8765a'), hair: hex('#2a1d16'), top: hex('#2f5a46'), bottom: hex('#1d1f24'), shoes: hex('#1d1d1f'), legs: 'pants', sleeves: 'long' },
  ];
  function walkerLayer(id: string, d: number, speed: number, dir: 1 | -1, x0: number, loopS: number, style: FigureStyle, hM: number): SceneLayer {
    return {
      id,
      distanceM: d,
      animated: true,
      motion: { speedMS: speed, dirX: dir, dirY: 0 },
      bounds(f) {
        const k = u(1, d);
        const x = x0 + dir * u(speed, d) * wrapCentered(f.timeS, loopS);
        return { x0: x - k * 0.75, x1: x + k * 0.75, y0: gy(d) - k * (hM + 0.15), y1: gy(d) + k * 0.1 };
      },
      paint(ctx, f) {
        const k = u(1, d);
        const x = x0 + dir * u(speed, d) * wrapCentered(f.timeS, loopS);
        const h = hM * k;
        if (x + h < f.x0 || x - h > f.x1) return;
        const phase = f.timeS * 1.9 * Math.PI * 2 + x0 * 7;
        groundShadow(ctx, x, gy(d), h * 0.2, h * 0.025, 0.3);
        figure(ctx, x, gy(d), h, { facing: dir, pose: 'walk', phase, style, lightX: -0.5 });
      },
    };
  }

  /* ---------------------------------------------------------------- Calzada y veredas (plano) */
  function paintStreet(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const farCurb = gy(BG - 3);
    const nearCurb = gy(SUBJ + 1.4);
    const bottom = f.y1 + f.px;
    if (bottom <= farCurb) return;
    // Asfalto
    ctx.fillStyle = linear(ctx, 0, farCurb, 0, nearCurb, [
      [0, '#5c5a58'],
      [1, '#3c3b3a'],
    ]);
    ctx.fillRect(f.x0, farCurb, f.x1 - f.x0, nearCurb - farCurb);
    ctx.save();
    ctx.beginPath();
    ctx.rect(f.x0, farCurb, f.x1 - f.x0, nearCurb - farCurb);
    ctx.clip();
    grain(ctx, f.x0, farCurb, f.x1 - f.x0, nearCurb - farCurb, 0.35, u(0.8, 8));
    // Paso de cebra: franjas que fugan hacia el horizonte (x = X·(y − HZ)/altura de cámara)
    const persp = (X: number, y: number) => (X * (y - HZ)) / CAM_H;
    for (let X = -5.5; X < -1; X += 1) {
      ctx.fillStyle = 'rgba(232,230,222,0.82)';
      ctx.beginPath();
      ctx.moveTo(persp(X, farCurb), farCurb);
      ctx.lineTo(persp(X + 0.5, farCurb), farCurb);
      ctx.lineTo(persp(X + 0.5, nearCurb), nearCurb);
      ctx.lineTo(persp(X, nearCurb), nearCurb);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // Vereda cercana (baldosas)
    ctx.fillStyle = '#a49e94';
    ctx.fillRect(f.x0, nearCurb, f.x1 - f.x0, bottom - nearCurb);
    ctx.fillStyle = '#7c776f';
    ctx.fillRect(f.x0, nearCurb, f.x1 - f.x0, u(0.15, SUBJ + 1.4));
    ctx.strokeStyle = 'rgba(70,66,60,0.45)';
    ctx.lineWidth = Math.max(f.px * 0.6, u(0.01, 3));
    ctx.beginPath();
    for (let d = SUBJ + 1.4; d > 0.8; d -= 0.4) {
      const y = gy(d);
      if (y > f.y1) break;
      ctx.moveTo(f.x0, y);
      ctx.lineTo(f.x1, y);
    }
    for (let X = -4; X <= 4; X += 0.4) {
      // Juntas longitudinales: fugan hacia el punto central del horizonte
      ctx.moveTo((X * (nearCurb - HZ)) / CAM_H, nearCurb);
      ctx.lineTo((X * (bottom - HZ)) / CAM_H, bottom);
    }
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.rect(f.x0, nearCurb, f.x1 - f.x0, bottom - nearCurb);
    ctx.clip();
    grain(ctx, f.x0, nearCurb, f.x1 - f.x0, bottom - nearCurb, 0.3, u(0.5, 3));
    ctx.restore();
  }

  /* ---------------------------------------------------------------- Bicicleta estacionada (7 m) */
  function paintParked(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = 7.5;
    const k = u(1, d);
    const base = gy(d);
    const x = 0.62;
    if (x + k * 2 < f.x0 || x - k * 2 > f.x1) return;
    // Farol de hierro
    const lx = -0.66;
    ctx.strokeStyle = '#26282c';
    ctx.lineWidth = Math.max(f.px, k * 0.12);
    ctx.beginPath();
    ctx.moveTo(lx, base);
    ctx.lineTo(lx, base - k * 4.2);
    ctx.stroke();
    ctx.fillStyle = '#26282c';
    roundRect(ctx, lx - k * 0.25, base - k * 4.8, k * 0.5, k * 0.7, k * 0.08);
    ctx.fill();
    ctx.fillStyle = 'rgba(240,236,220,0.9)';
    ctx.fillRect(lx - k * 0.17, base - k * 4.7, k * 0.34, k * 0.45);
    // Bicicleta
    ctx.strokeStyle = '#1e5a6a';
    ctx.lineWidth = k * 0.04;
    for (const wx of [-0.5, 0.5]) {
      ctx.beginPath();
      ctx.arc(x + wx * k, base - k * 0.34, k * 0.32, 0, Math.PI * 2);
      ctx.strokeStyle = '#1b1c1e';
      ctx.stroke();
    }
    ctx.strokeStyle = '#2a7a8a';
    ctx.beginPath();
    ctx.moveTo(x - 0.5 * k, base - k * 0.34);
    ctx.lineTo(x, base - k * 0.3);
    ctx.lineTo(x - 0.1 * k, base - k * 0.85);
    ctx.lineTo(x - 0.5 * k, base - k * 0.34);
    ctx.moveTo(x - 0.1 * k, base - k * 0.85);
    ctx.lineTo(x + 0.38 * k, base - k * 0.85);
    ctx.lineTo(x + 0.5 * k, base - k * 0.34);
    ctx.moveTo(x, base - k * 0.3);
    ctx.lineTo(x + 0.38 * k, base - k * 0.85);
    ctx.stroke();
    ctx.fillStyle = '#c8a050';
    roundRect(ctx, x + 0.35 * k, base - k * 1.05, k * 0.35, k * 0.22, k * 0.04);
    ctx.fill();
  }

  /* ---------------------------------------------------------------- Peatón principal (≈3 m) */
  const subjectStyle: FigureStyle = {
    skin: hex('#c48d6e'),
    hair: hex('#3a2418'),
    top: hex('#c9a36a'),
    bottom: hex('#2c3240'),
    shoes: hex('#3a2a20'),
    legs: 'pants',
    sleeves: 'long',
    coat: true,
    hairLong: true,
    bag: hex('#6a3a24'),
  };
  const subjectLayer: SceneLayer = {
    id: 'peaton',
    distanceM: SUBJ,
    animated: true,
    motion: { speedMS: SPEED, dirX: -1, dirY: 0 },
    bounds(f) {
      const k = u(1, SUBJ);
      const x = 0.12 - u(SPEED, SUBJ) * wrapCentered(f.timeS, 6);
      return { x0: x - k * 0.8, x1: x + k * 0.8, y0: gy(SUBJ) - k * 1.85, y1: gy(SUBJ) + k * 0.1 };
    },
    paint(ctx, f) {
      const k = u(1, SUBJ);
      const x = 0.12 - u(SPEED, SUBJ) * wrapCentered(f.timeS, 6);
      const h = 1.7 * k;
      if (x + h < f.x0 || x - h > f.x1) return;
      const phase = f.timeS * 1.8 * Math.PI * 2 + 0.6;
      groundShadow(ctx, x + k * 0.1, gy(SUBJ), k * 0.45, k * 0.06, 0.35);
      figure(ctx, x, gy(SUBJ), h, { facing: -1, pose: 'walk', phase, style: subjectStyle, lightX: -0.4 });
      // Bufanda
      ctx.fillStyle = '#8a2a2e';
      ellipse(ctx, x - k * 0.015, gy(SUBJ) - h * 0.835, k * 0.045, k * 0.028, -0.2);
      ctx.fill();
    },
  };

  return {
    id: 'street',
    seed: 8080,
    layers: [
      { id: 'fachadas', distanceM: BG, paint: paintFacades, emitters: facadeLights },
      walkerLayer('paseante-1', BG - 2, 1.3, 1, -0.8, 9, crowdStyles[0]!, 1.75),
      walkerLayer('paseante-2', BG - 2.5, 1.1, -1, 0.9, 11, crowdStyles[2]!, 1.65),
      { id: 'calzada', distanceM: 8, plane: { horizonY: HZ, cameraHeightM: CAM_H, farM: BG - 3 }, paint: paintStreet },
      walkerLayer('paseante-3', 9, 1.4, 1, 0.3, 7, crowdStyles[1]!, 1.8),
      { id: 'bicicleta', distanceM: 7.5, paint: paintParked },
      subjectLayer,
    ],
  };
}
