/**
 * Retrato en golden hour: una persona de perfil mira hacia el sol bajo, que se cuela entre los
 * árboles del fondo (≈30–60 m). Contraluz cálido con luz de contorno en pelo y hombros, pastizal
 * con espigas brillantes y destellos entre las hojas que se vuelven bokeh dorado a f/1.4.
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
  kelvinLight,
  linear,
  mix,
  rand,
  ridge,
  sampleRidge,
  scale,
  shadedLimb,
  sizer,
  smoothClosed,
  softDot,
} from './kit';
import { paintProfileHead, rimStroke as rimStrokeBase } from './portrait';
import type { Emitter, PaintFrame, ScenePainter } from './types';

const HZ = -0.12;
const CAM_H = 1.6;
/** Altura de los ojos del sujeto (m). */
const EYE_H = 1.55;

export function goldenHourPainter(scene: SimScene): ScenePainter {
  const REF = scene.refFocalMm;
  const u = sizer(REF);
  const gy = (d: number) => groundY(HZ, REF, CAM_H, d);
  const SUBJ = scene.lighting.subjectDistanceM;
  const BG = scene.lighting.backgroundDistanceM;
  const sunColor = kelvinLight(3000);
  const sparkColor = kelvinLight(3300);

  // Copas de árboles del fondo (≈7–10 m a 55 m). El sol, muy bajo, queda detrás del borde de
  // las copas y se filtra por los huecos del follaje: la capa de árboles lo ocluye en parte.
  const TREE_D = 120;
  const treeRidge = ridge(808, 8, 0.5, 0.62);
  const SUN = { x: -0.38, y: -0.335 };
  const canopyHeightM = (x: number) => 9 + sampleRidge(treeRidge, -2.5, 2.5, x) * 9 - 2 * Math.exp(-Math.pow((x - SUN.x) / 0.12, 2));
  const canopyTop = (x: number) => gy(TREE_D) - u(canopyHeightM(x), TREE_D);
  interface Clump {
    x: number;
    y: number;
    r: number;
    lit: number;
  }
  const clumps: Clump[] = [];
  {
    const r = rand(4040);
    for (let i = 0; i < 900; i++) {
      const x = r.range(-2.4, 2.4);
      const y = canopyTop(x) + Math.abs(r.normal()) * u(2, TREE_D) - u(0.6, TREE_D);
      const dSun = Math.hypot(x - SUN.x, (y - SUN.y) * 1.4);
      // Junto al sol el follaje es más ralo: deja huecos por donde pasa la luz.
      if (dSun < 0.045 && r.chance(0.7)) continue;
      const near = Math.exp(-Math.pow(dSun / 0.2, 2));
      clumps.push({ x, y, r: u(r.range(0.9, 2.4), TREE_D), lit: near * (0.5 + 0.5 * r()) });
    }
  }

  /* ---------------------------------------------------------------- Cielo y sol */
  function paintSky(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    fillFrame(
      ctx,
      f,
      linear(ctx, 0, -1.4, 0, -0.05, [
        [0, '#8ea6c8'],
        [0.4, '#d8c2a8'],
        [0.75, '#f6d7a8'],
        [1, '#fde7c0'],
      ]),
    );
    // Resplandor alrededor del sol (dispersión atmosférica)
    softDot(ctx, SUN.x, SUN.y, 1.1, hex('#fff0cf'), 0.85, 0.05);
    softDot(ctx, SUN.x, SUN.y, 0.35, hex('#fffaf0'), 0.9, 0.1);
    const r = rand(31);
    for (let i = 0; i < 14; i++) {
      ctx.save();
      ctx.translate(r.range(-2, 2), r.range(-1.3, -0.6));
      ctx.scale(1, 0.18);
      softDot(ctx, 0, 0, r.range(0.2, 0.5), hex('#f7c9a0'), r.range(0.2, 0.4));
      ctx.restore();
    }
  }

  function sunLights(): Emitter[] {
    return [
      { kind: 'point', x: SUN.x, y: SUN.y, size: u(0.0093 * 1e9, 1e9), color: [1, 0.93, 0.8], power: 260, distanceM: 1e9 },
      { kind: 'glow', x: SUN.x, y: SUN.y, radius: 0.022, color: sunColor, power: 5 },
      { kind: 'glow', x: SUN.x, y: SUN.y, radius: 0.07, color: sunColor, power: 1.8 },
    ];
  }

  /** Velo de la lente: dispersión que ninguna capa tapa (va con la capa más cercana). */
  function veilLights(): Emitter[] {
    return [
      { kind: 'glow', x: SUN.x, y: SUN.y, radius: 0.2, color: sunColor, power: 0.5 },
      { kind: 'glow', x: SUN.x, y: SUN.y, radius: 0.7, color: sunColor, power: 0.13 },
    ];
  }

  /* ---------------------------------------------------------------- Línea de árboles (55 m) */
  function paintTrees(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const base = gy(TREE_D);
    const x0 = f.x0 - 0.05;
    const x1 = f.x1 + 0.05;
    // Árboles lejanos difuminados por la bruma dorada
    ctx.fillStyle = linear(ctx, 0, base - u(10, 110), 0, base, [
      [0, 'rgba(196,150,108,0.75)'],
      [1, 'rgba(160,118,80,0.85)'],
    ]);
    const far = ridge(919, 7, 0.4, 0.6);
    ctx.beginPath();
    ctx.moveTo(x0, base);
    for (let x = x0; x <= x1; x += 0.01) ctx.lineTo(x, base - u(9, 110) + sampleRidge(far, -2.5, 2.5, x) * u(5, 110));
    ctx.lineTo(x1, base);
    ctx.closePath();
    ctx.fill();
    // Masa de las copas y racimos que rompen la silueta
    ctx.beginPath();
    ctx.moveTo(x0, base + 0.02);
    const step = Math.max(f.px * 3, 0.006);
    for (let x = x0; x <= x1; x += step) ctx.lineTo(x, canopyTop(x) + u(1.2, TREE_D));
    ctx.lineTo(x1, base + 0.02);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, 0, base - u(18, TREE_D), 0, base, [
      [0, '#5e4a30'],
      [0.6, '#463c26'],
      [1, '#383220'],
    ]);
    ctx.fill();
    const r = rand(77);
    for (const c of clumps) {
      if (c.x + c.r < x0 || c.x - c.r > x1) continue;
      const col = mix(hex('#4a3f27'), hex('#9a7a46'), c.lit * 0.6);
      ctx.fillStyle = css(col);
      blobPath(ctx, c.x, c.y, c.r, c.r * 0.85, r, 0.28, 10);
      ctx.fill();
      if (c.lit > 0.2) {
        // Borde encendido del racimo del lado del sol
        ctx.strokeStyle = css(hex('#ffdc9c'), Math.min(0.85, c.lit * 1.1));
        ctx.lineWidth = Math.max(f.px * 0.8, c.r * 0.08);
        ctx.beginPath();
        const a = Math.atan2(SUN.y - c.y, SUN.x - c.x);
        ctx.arc(c.x, c.y, c.r * 0.92, a - 0.9, a + 0.9);
        ctx.stroke();
      }
    }
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, base + 0.02);
    for (let x = x0; x <= x1; x += step) ctx.lineTo(x, canopyTop(x) + u(1.2, TREE_D));
    ctx.lineTo(x1, base + 0.02);
    ctx.closePath();
    ctx.clip();
    grain(ctx, x0, base - 0.8, x1 - x0, 0.85, 0.3, u(6, TREE_D));
    ctx.restore();
  }

  function treeLights(): Emitter[] {
    // Sol filtrado entre las hojas del borde de las copas: cada destello es una fuente puntual.
    const out: Emitter[] = [];
    const r = rand(515);
    for (const c of clumps) {
      if (c.lit < 0.3 || !r.chance(0.5)) continue;
      const a = Math.atan2(SUN.y - c.y, SUN.x - c.x) + r.range(-0.8, 0.8);
      out.push({
        kind: 'point',
        x: c.x + Math.cos(a) * c.r * 0.8,
        y: c.y + Math.sin(a) * c.r * 0.8,
        size: u(0.15, TREE_D),
        color: sparkColor,
        power: 5 + 22 * c.lit * r(),
        distanceM: TREE_D + r.range(-6, 6),
      });
    }
    return out;
  }

  /* ---------------------------------------------------------------- Pastizal (plano) */
  function paintMeadow(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const top = gy(TREE_D);
    const bottom = f.y1 + f.px;
    if (bottom <= top) return;
    ctx.fillStyle = linear(ctx, 0, top, 0, bottom, [
      [0, '#c49a5c'],
      [0.12, '#9a7a44'],
      [0.5, '#6a5a32'],
      [1, '#3e3820'],
    ]);
    ctx.fillRect(f.x0, top, f.x1 - f.x0, bottom - top);
    ctx.save();
    ctx.beginPath();
    ctx.rect(f.x0, top, f.x1 - f.x0, bottom - top);
    ctx.clip();
    grain(ctx, f.x0, top, f.x1 - f.x0, bottom - top, 0.3, u(2, 12));
    ctx.restore();
    // Espigas a contraluz por filas de distancia
    const r = rand(222);
    for (let d = 45; d > 3; d *= 0.9) {
      const y = gy(d);
      if (y < f.y0 || y > f.y1 + 0.3) continue;
      const h = u(r.range(0.6, 0.9), d);
      const n = Math.min(260, Math.round(((f.x1 - f.x0) / u(0.05, d)) * 0.35));
      ctx.lineWidth = Math.max(f.px * 0.6, u(0.006, d));
      for (let i = 0; i < n; i++) {
        const x = r.range(f.x0, f.x1);
        const hh = h * r.range(0.5, 1.1);
        const lean = (r() - 0.35) * hh * 0.35;
        const near = Math.exp(-Math.pow((x - SUN.x) / 0.7, 2));
        ctx.strokeStyle = css(mix(hex('#6b5a30'), hex('#e8c27c'), 0.25 + near * 0.6 * r()), 0.85);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + lean * 0.2, y - hh * 0.6, x + lean, y - hh);
        ctx.stroke();
        if (r.chance(0.35)) {
          ctx.fillStyle = css(mix(hex('#d9b273'), hex('#fff0c8'), near), 0.9);
          ellipse(ctx, x + lean, y - hh, u(0.012, d), u(0.035, d), lean / hh);
          ctx.fill();
        }
      }
    }
  }

  function meadowLights(): Emitter[] {
    const out: Emitter[] = [];
    const r = rand(616);
    for (let i = 0; i < 60; i++) {
      const d = r.range(9, 40);
      const x = SUN.x + r.normal() * 0.9;
      const y = gy(d) - u(r.range(0.4, 0.9), d);
      out.push({ kind: 'point', x, y, size: u(0.02, d), color: sparkColor, power: r.range(3, 9), distanceM: d });
    }
    return out;
  }

  /* ---------------------------------------------------------------- Sujeto (2.5 m) */
  const FACE_X = 0.15;
  const SWAY = scene.lighting.subjectSpeedMS;
  function paintSubject(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const k = u(1, SUBJ);
    const cy = HZ + u(CAM_H - EYE_H, SUBJ);
    // Balanceo natural del cuerpo (amplitud de unos centímetros)
    const cx = FACE_X + (SWAY > 0 ? Math.sin(f.timeS * 1.3) * u(0.025, SUBJ) : 0);
    // Metros con origen en el ojo; x positivo = hacia donde mira (izquierda de la imagen).
    const P = (x: number, y: number): [number, number] => [cx - x * k, cy + y * k];
    const skin = hex('#c88a6a');
    const skinShade = hex('#94604a');
    const rim = hex('#ffe2ae');
    const knit = hex('#dccbb2');
    const denim = hex('#4f5d72');

    const rimStroke = (draw: () => void, w: number, a = 0.9) => rimStrokeBase(ctx, rim, draw, w, a);

    // --- Piernas (vaqueros), solo visibles en planos abiertos
    for (const side of [-1, 1]) {
      const hip = P(side * 0.09, 0.95);
      const foot = P(side * 0.11 - 0.02, 1.52);
      ctx.fillStyle = linear(ctx, ...P(0.2, 1.2), ...P(-0.2, 1.2), [
        [0, css(scale(denim, side > 0 ? 1.05 : 0.8))],
        [1, css(scale(denim, 0.6))],
      ]);
      ctx.beginPath();
      ctx.moveTo(hip[0] - k * 0.08, hip[1]);
      ctx.lineTo(hip[0] + k * 0.08, hip[1]);
      ctx.lineTo(foot[0] + k * 0.05, foot[1]);
      ctx.lineTo(foot[0] - k * 0.05, foot[1]);
      ctx.closePath();
      ctx.fill();
    }

    // --- Brazos (mangas de punto) a los lados, detrás del torso
    const sleeve = (sx: number, ex: number, hx: number, lit: boolean) => {
      const sh = { x: P(sx, 0.31)[0], y: P(sx, 0.31)[1] };
      const el = { x: P(ex, 0.6)[0], y: P(ex, 0.6)[1] };
      const wr = { x: P(hx, 0.84)[0], y: P(hx, 0.84)[1] };
      const lx = lit ? -1 : 1;
      shadedLimb(ctx, el, wr, k * 0.085, k * 0.07, knit, lx, lit ? 0.92 : 0.6);
      shadedLimb(ctx, sh, el, k * 0.1, k * 0.088, knit, lx, lit ? 0.92 : 0.6);
      ctx.fillStyle = css(scale(skin, lit ? 0.95 : 0.65));
      ellipse(ctx, wr.x, wr.y + k * 0.06, k * 0.034, k * 0.055);
      ctx.fill();
      if (lit)
        rimStroke(() => {
          ctx.beginPath();
          ctx.moveTo(sh.x - k * 0.045, sh.y);
          ctx.lineTo(el.x - k * 0.04, el.y);
          ctx.lineTo(wr.x - k * 0.035, wr.y);
        }, k * 0.003, 0.55);
    };
    sleeve(-0.21, -0.26, -0.24, false);
    sleeve(0.19, 0.24, 0.22, true);

    // --- Torso 3/4 con cintura
    const torso: Array<[number, number]> = [
      P(0.03, 0.19),
      P(-0.08, 0.215),
      P(-0.19, 0.25),
      P(-0.245, 0.33),
      P(-0.215, 0.6),
      P(-0.235, 0.95),
      P(-0.22, 0.975),
      P(-0.05, 0.98),
      P(0.1, 0.98),
      P(0.18, 0.975),
      P(0.19, 0.95),
      P(0.17, 0.6),
      P(0.215, 0.33),
      P(0.17, 0.25),
      P(0.09, 0.21),
    ];
    smoothClosed(ctx, torso);
    ctx.fillStyle = linear(ctx, ...P(0.28, 0.3), ...P(-0.28, 0.55), [
      [0, css(mix(knit, rim, 0.2))],
      [0.3, css(scale(knit, 0.8))],
      [1, css(scale(knit, 0.5))],
    ]);
    ctx.fill();
    ctx.save();
    smoothClosed(ctx, torso);
    ctx.clip();
    ctx.strokeStyle = 'rgba(80,60,40,0.16)';
    ctx.lineWidth = Math.max(f.px * 0.7, k * 0.004);
    for (let x = -0.3; x < 0.3; x += 0.022) {
      ctx.beginPath();
      for (let y = 0.2; y < 1.0; y += 0.02) {
        const [px, py] = P(x + Math.sin(y * 60) * 0.004, y);
        if (y === 0.2) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    grain(ctx, ...P(0.4, 0.1), 0.8 * k, 1.0 * k, 0.22, k * 0.25);
    // Sombra del pelo sobre la espalda
    softDot(ctx, ...P(-0.12, 0.35), k * 0.18, hex('#3a2a20'), 0.35);
    ctx.restore();
    rimStroke(() => {
      ctx.beginPath();
      ctx.moveTo(...P(0.08, 0.205));
      ctx.quadraticCurveTo(...P(0.19, 0.235), ...P(0.215, 0.34));
    }, k * 0.004);

    paintProfileHead(ctx, f, P, k, {
      skin,
      skinShade,
      hairDark: hex('#4a3020'),
      hairMid: hex('#83603e'),
      hairLight: hex('#c99a64'),
      frontRim: 1,
      frontRimColor: rim,
      backRim: 0,
      backRimColor: rim,
      seed: 91,
    });
  }

  return {
    id: 'golden-hour-portrait',
    seed: 1717,
    layers: [
      { id: 'cielo', distanceM: 1e6, noPeaking: true, paint: paintSky, emitters: sunLights },
      { id: 'arboles', distanceM: TREE_D, paint: paintTrees, emitters: treeLights },
      { id: 'pastizal', distanceM: BG, plane: { horizonY: HZ, cameraHeightM: CAM_H, farM: TREE_D }, paint: paintMeadow, emitters: meadowLights },
      {
        id: 'retrato',
        distanceM: SUBJ,
        animated: SWAY > 0,
        motion: SWAY > 0 ? { speedMS: SWAY, dirX: 1, dirY: 0 } : undefined,
        paint: paintSubject,
        emitters: veilLights,
      },
    ],
  };
}
