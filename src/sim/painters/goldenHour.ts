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
  function paintSubject(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const k = u(1, SUBJ);
    const cy = HZ + u(CAM_H - EYE_H, SUBJ);
    const cx = FACE_X;
    // Metros con origen en el ojo; x positivo = hacia donde mira (izquierda de la imagen).
    const P = (x: number, y: number): [number, number] => [cx - x * k, cy + y * k];
    const skin = hex('#c88a6a');
    const skinShade = hex('#94604a');
    const rim = hex('#ffe2ae');
    const hairDark = hex('#4a3020');
    const hairMid = hex('#83603e');
    const hairLight = hex('#c99a64');
    const knit = hex('#dccbb2');
    const denim = hex('#4f5d72');

    /** Contorno de luz: trazo ancho y suave + filo fino brillante. */
    const rimStroke = (draw: () => void, w: number, a = 0.9) => {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = css(rim, a * 0.22);
      ctx.lineWidth = w * 3;
      draw();
      ctx.stroke();
      ctx.strokeStyle = css(rim, a);
      ctx.lineWidth = w;
      draw();
      ctx.stroke();
      ctx.restore();
    };

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

    // --- Cuello
    ctx.beginPath();
    ctx.moveTo(...P(0.045, 0.125));
    ctx.bezierCurveTo(...P(0.05, 0.16), ...P(0.055, 0.19), ...P(0.07, 0.215));
    ctx.lineTo(...P(-0.07, 0.225));
    ctx.bezierCurveTo(...P(-0.06, 0.17), ...P(-0.045, 0.12), ...P(-0.04, 0.07));
    ctx.closePath();
    ctx.fillStyle = linear(ctx, ...P(0.06, 0), ...P(-0.06, 0), [
      [0, css(scale(skin, 0.92))],
      [1, css(scale(skinShade, 0.85))],
    ]);
    ctx.fill();
    softDot(ctx, ...P(0.01, 0.135), k * 0.05, skinShade, 0.55);
    rimStroke(() => {
      ctx.beginPath();
      ctx.moveTo(...P(0.046, 0.13));
      ctx.bezierCurveTo(...P(0.05, 0.16), ...P(0.055, 0.19), ...P(0.07, 0.212));
    }, k * 0.0025, 0.75);

    // --- Pelo de atrás (cae sobre la espalda)
    const backHair = () => {
      ctx.beginPath();
      ctx.moveTo(...P(0.04, -0.13));
      ctx.bezierCurveTo(...P(-0.1, -0.2), ...P(-0.2, -0.08), ...P(-0.19, 0.08));
      ctx.bezierCurveTo(...P(-0.19, 0.25), ...P(-0.26, 0.42), ...P(-0.22, 0.56));
      ctx.bezierCurveTo(...P(-0.15, 0.58), ...P(-0.08, 0.5), ...P(-0.06, 0.34));
      ctx.bezierCurveTo(...P(-0.04, 0.2), ...P(-0.03, 0.08), ...P(-0.015, 0.0));
      ctx.closePath();
    };
    backHair();
    ctx.fillStyle = linear(ctx, ...P(0.05, 0), ...P(-0.24, 0), [
      [0, css(hairMid)],
      [1, css(hairDark)],
    ]);
    ctx.fill();

    // --- Rostro de perfil (curvas de Bézier)
    const facePath = () => {
      ctx.beginPath();
      ctx.moveTo(...P(0.055, -0.125));
      ctx.bezierCurveTo(...P(0.078, -0.105), ...P(0.088, -0.065), ...P(0.086, -0.036));
      ctx.bezierCurveTo(...P(0.085, -0.025), ...P(0.08, -0.018), ...P(0.082, -0.01));
      ctx.bezierCurveTo(...P(0.09, 0.008), ...P(0.104, 0.025), ...P(0.112, 0.04));
      ctx.bezierCurveTo(...P(0.117, 0.048), ...P(0.11, 0.055), ...P(0.1, 0.053));
      ctx.bezierCurveTo(...P(0.095, 0.054), ...P(0.09, 0.058), ...P(0.088, 0.06));
      ctx.bezierCurveTo(...P(0.091, 0.064), ...P(0.097, 0.068), ...P(0.096, 0.073));
      ctx.bezierCurveTo(...P(0.094, 0.077), ...P(0.089, 0.078), ...P(0.087, 0.0795));
      ctx.bezierCurveTo(...P(0.092, 0.082), ...P(0.095, 0.088), ...P(0.091, 0.093));
      ctx.bezierCurveTo(...P(0.087, 0.097), ...P(0.081, 0.099), ...P(0.081, 0.103));
      ctx.bezierCurveTo(...P(0.082, 0.108), ...P(0.09, 0.114), ...P(0.087, 0.123));
      ctx.bezierCurveTo(...P(0.083, 0.132), ...P(0.07, 0.136), ...P(0.055, 0.134));
      ctx.bezierCurveTo(...P(0.03, 0.13), ...P(-0.01, 0.12), ...P(-0.035, 0.09));
      ctx.bezierCurveTo(...P(-0.05, 0.06), ...P(-0.055, -0.02), ...P(-0.045, -0.08));
      ctx.bezierCurveTo(...P(-0.03, -0.12), ...P(0.02, -0.14), ...P(0.055, -0.125));
      ctx.closePath();
    };
    facePath();
    ctx.fillStyle = linear(ctx, ...P(0.11, 0), ...P(-0.05, 0), [
      [0, css(mix(skin, rim, 0.1))],
      [0.3, css(skin)],
      [1, css(skinShade)],
    ]);
    ctx.fill();
    ctx.save();
    facePath();
    ctx.clip();
    softDot(ctx, ...P(0.045, 0.04), k * 0.04, hex('#d4786a'), 0.3);
    softDot(ctx, ...P(0.005, 0.1), k * 0.06, skinShade, 0.45);
    softDot(ctx, ...P(0.07, -0.005), k * 0.02, skinShade, 0.35);
    // Sombra bajo la mandíbula
    ctx.strokeStyle = css(skinShade, 0.5);
    ctx.lineWidth = k * 0.008;
    ctx.beginPath();
    ctx.moveTo(...P(0.06, 0.135));
    ctx.quadraticCurveTo(...P(0.0, 0.125), ...P(-0.035, 0.09));
    ctx.stroke();
    ctx.restore();
    rimStroke(() => {
      ctx.beginPath();
      ctx.moveTo(...P(0.055, -0.125));
      ctx.bezierCurveTo(...P(0.078, -0.105), ...P(0.088, -0.065), ...P(0.086, -0.036));
      ctx.bezierCurveTo(...P(0.085, -0.025), ...P(0.08, -0.018), ...P(0.082, -0.01));
      ctx.bezierCurveTo(...P(0.09, 0.008), ...P(0.104, 0.025), ...P(0.112, 0.04));
      ctx.bezierCurveTo(...P(0.117, 0.048), ...P(0.11, 0.055), ...P(0.1, 0.053));
      ctx.moveTo(...P(0.096, 0.07));
      ctx.bezierCurveTo(...P(0.094, 0.077), ...P(0.089, 0.078), ...P(0.087, 0.0795));
      ctx.moveTo(...P(0.093, 0.088));
      ctx.bezierCurveTo(...P(0.087, 0.097), ...P(0.081, 0.099), ...P(0.081, 0.103));
      ctx.bezierCurveTo(...P(0.082, 0.108), ...P(0.09, 0.114), ...P(0.087, 0.123));
      ctx.bezierCurveTo(...P(0.083, 0.132), ...P(0.07, 0.136), ...P(0.055, 0.134));
    }, k * 0.0022);
    // Ojo cerrado, pestañas, ceja y labios
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(56,32,24,0.9)';
    ctx.lineWidth = k * 0.0026;
    ctx.beginPath();
    ctx.moveTo(...P(0.066, -0.002));
    ctx.quadraticCurveTo(...P(0.052, 0.008), ...P(0.038, 0.002));
    ctx.stroke();
    ctx.lineWidth = k * 0.0013;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const [ax, ay] = P(0.064 - t * 0.024, 0.003 + Math.sin(t * Math.PI) * 0.003);
      const [bx, by] = P(0.066 - t * 0.024 + 0.004, 0.01 + Math.sin(t * Math.PI) * 0.003);
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(78,50,34,0.8)';
    ctx.lineWidth = k * 0.0035;
    ctx.beginPath();
    ctx.moveTo(...P(0.079, -0.032));
    ctx.quadraticCurveTo(...P(0.06, -0.04), ...P(0.036, -0.033));
    ctx.stroke();
    ctx.fillStyle = 'rgba(170,88,80,0.75)';
    ctx.beginPath();
    ctx.moveTo(...P(0.096, 0.072));
    ctx.quadraticCurveTo(...P(0.088, 0.066), ...P(0.078, 0.074));
    ctx.quadraticCurveTo(...P(0.085, 0.08), ...P(0.096, 0.072));
    ctx.moveTo(...P(0.092, 0.087));
    ctx.quadraticCurveTo(...P(0.085, 0.093), ...P(0.077, 0.084));
    ctx.quadraticCurveTo(...P(0.085, 0.081), ...P(0.092, 0.087));
    ctx.fill();

    // --- Pelo de delante: casquete, mechones y cabellos sueltos encendidos
    const capPath = () => {
      ctx.beginPath();
      ctx.moveTo(...P(0.07, -0.098));
      ctx.bezierCurveTo(...P(0.07, -0.15), ...P(0.0, -0.18), ...P(-0.07, -0.16));
      ctx.bezierCurveTo(...P(-0.14, -0.13), ...P(-0.15, -0.04), ...P(-0.1, 0.02));
      ctx.bezierCurveTo(...P(-0.07, 0.06), ...P(-0.04, 0.06), ...P(-0.025, 0.03));
      ctx.bezierCurveTo(...P(-0.02, -0.03), ...P(0.0, -0.09), ...P(0.07, -0.098));
      ctx.closePath();
    };
    capPath();
    ctx.fillStyle = linear(ctx, ...P(0.08, -0.16), ...P(-0.1, 0.02), [
      [0, css(hairLight)],
      [0.5, css(hairMid)],
      [1, css(hairDark)],
    ]);
    ctx.fill();
    const r = rand(91);
    ctx.lineCap = 'round';
    for (let i = 0; i < 160; i++) {
      const t0 = r();
      const sx = 0.06 - t0 * 0.18;
      const sy = -0.12 - Math.sin(t0 * Math.PI) * 0.045;
      const ex = r.range(-0.25, -0.08);
      const ey = r.range(0.2, 0.56);
      ctx.strokeStyle = css(mix(hairDark, hairLight, r() * 0.9), 0.5);
      ctx.lineWidth = Math.max(f.px * 0.5, k * r.range(0.0012, 0.0035));
      ctx.beginPath();
      ctx.moveTo(...P(sx, sy));
      ctx.bezierCurveTo(...P(sx - 0.06, sy + 0.05), ...P(ex + 0.06, ey - 0.28), ...P(ex, ey));
      ctx.stroke();
    }
    rimStroke(() => {
      ctx.beginPath();
      ctx.moveTo(...P(0.07, -0.1));
      ctx.bezierCurveTo(...P(0.07, -0.15), ...P(0.0, -0.18), ...P(-0.07, -0.16));
      ctx.quadraticCurveTo(...P(-0.11, -0.15), ...P(-0.13, -0.12));
    }, k * 0.004);
  }

  return {
    id: 'golden-hour-portrait',
    seed: 1717,
    layers: [
      { id: 'cielo', distanceM: 1e6, noPeaking: true, paint: paintSky, emitters: sunLights },
      { id: 'arboles', distanceM: TREE_D, paint: paintTrees, emitters: treeLights },
      { id: 'pastizal', distanceM: BG, plane: { horizonY: HZ, cameraHeightM: CAM_H, farM: TREE_D }, paint: paintMeadow, emitters: meadowLights },
      { id: 'retrato', distanceM: SUBJ, paint: paintSubject, emitters: veilLights },
    ],
  };
}
