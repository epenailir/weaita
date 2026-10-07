/**
 * Cabeza de perfil (mirando hacia +x local) para los retratos: cuello, cara con rasgos suaves,
 * pelo largo con mechones y luces de contorno configurables (contraluz cálido delantero en el
 * golden hour, luz de recorte trasera fría en el estudio).
 *
 * `P(x, y)` convierte metros con origen en el ojo (x hacia donde mira, y hacia abajo) a
 * coordenadas de mundo; `k` es el tamaño de 1 m en unidades de mundo.
 */
import { css, hex, linear, mix, rand, scale, softDot } from './kit';
import type { RGB } from './kit';
import type { PaintFrame } from './types';

export type MeterToWorld = (x: number, y: number) => [number, number];

export interface ProfileStyle {
  skin: RGB;
  skinShade: RGB;
  hairDark: RGB;
  hairMid: RGB;
  hairLight: RGB;
  /** Luz de contorno sobre el perfil delantero (0 = sin ella). */
  frontRim: number;
  frontRimColor: RGB;
  /** Luz de recorte sobre la nuca y el pelo de atrás (0 = sin ella). */
  backRim: number;
  backRimColor: RGB;
  seed: number;
}

/** Trazo de luz de contorno: halo ancho y suave + filo fino brillante (suma de luz). */
export function rimStroke(ctx: CanvasRenderingContext2D, color: RGB, draw: () => void, w: number, a = 0.9): void {
  if (a <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = css(color, a * 0.22);
  ctx.lineWidth = w * 3;
  draw();
  ctx.stroke();
  ctx.strokeStyle = css(color, a);
  ctx.lineWidth = w;
  draw();
  ctx.stroke();
  ctx.restore();
}

export function paintProfileHead(ctx: CanvasRenderingContext2D, f: PaintFrame, P: MeterToWorld, k: number, st: ProfileStyle): void {
  const { skin, skinShade, hairDark, hairMid, hairLight } = st;
  const rim = st.frontRimColor;
  const front = (draw: () => void, w: number, a = 0.9) => rimStroke(ctx, rim, draw, w, a * st.frontRim);
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
  front(() => {
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
  front(() => {
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
  const r = rand(st.seed);
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
  front(() => {
    ctx.beginPath();
    ctx.moveTo(...P(0.07, -0.1));
    ctx.bezierCurveTo(...P(0.07, -0.15), ...P(0.0, -0.18), ...P(-0.07, -0.16));
    ctx.quadraticCurveTo(...P(-0.11, -0.15), ...P(-0.13, -0.12));
  }, k * 0.004);

  // Luz de recorte trasera: nuca y borde posterior del pelo
  rimStroke(
    ctx,
    st.backRimColor,
    () => {
      ctx.beginPath();
      ctx.moveTo(...P(-0.07, -0.16));
      ctx.bezierCurveTo(...P(-0.16, -0.12), ...P(-0.2, -0.04), ...P(-0.19, 0.08));
      ctx.bezierCurveTo(...P(-0.19, 0.25), ...P(-0.26, 0.42), ...P(-0.22, 0.56));
    },
    k * 0.004,
    st.backRim,
  );
}
