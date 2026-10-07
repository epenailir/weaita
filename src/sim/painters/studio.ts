/**
 * Estudio con luz continua: retrato de perfil (≈1.5 m) frente a un fondo de papel continuo
 * (≈3 m) con su luz de fondo, una ventana de luz octogonal como luz principal a la izquierda y
 * una tira de luz de recorte detrás a la derecha (visibles con angulares). En primer plano, un
 * frasco de perfume sobre un pedestal (≈1.15 m): enfocar los ojos o el producto es la decisión.
 */
import type { SimScene } from '../types';
import { css, ellipse, fillFrame, grain, hex, kelvinLight, linear, mix, radial, rand, roundRect, scale, sizer, softDot } from './kit';
import { paintProfileHead } from './portrait';
import type { Emitter, PaintFrame, ScenePainter } from './types';

const CAM_H = 1.32;
const EYE_H = 1.32;
const HZ = -0.08;

export function studioPainter(scene: SimScene): ScenePainter {
  const REF = scene.refFocalMm;
  const u = sizer(REF);
  const SUBJ = scene.lighting.subjectDistanceM;
  const BG = scene.lighting.backgroundDistanceM;
  const PRODUCT_D = Math.max(0.6, SUBJ - 0.35);
  const led = kelvinLight(scene.lighting.illuminantK);
  /** Altura en pantalla de un punto a `hM` metros del suelo y `d` metros de distancia. */
  const yAt = (hM: number, d: number) => HZ + u(CAM_H - hM, d);

  /* ---------------------------------------------------------------- Fondo de papel (≈3 m) */
  function paintBackdrop(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const floorY = yAt(0, BG);
    fillFrame(ctx, f, linear(ctx, 0, yAt(2.7, BG), 0, floorY, [
      [0, '#22343c'],
      [0.6, '#355058'],
      [1, '#3f5c64'],
    ]));
    // Luz de fondo: mancha suave detrás del modelo
    softDot(ctx, 0.1, yAt(1.1, BG), u(1.4, BG), hex('#7aa0a6'), 0.85, 0.05);
    softDot(ctx, 0.1, yAt(1.15, BG), u(0.6, BG), hex('#a4c4c6'), 0.5, 0.1);
    // Curva del papel hacia el suelo y suelo del estudio
    ctx.fillStyle = linear(ctx, 0, floorY - u(0.3, BG), 0, f.y1 + 0.1, [
      [0, '#3c5a62'],
      [0.25, '#4a6a70'],
      [1, '#2a2c2e'],
    ]);
    ctx.fillRect(f.x0, floorY - u(0.3, BG), f.x1 - f.x0, f.y1 + 0.1 - floorY + u(0.3, BG));
    ctx.save();
    ctx.beginPath();
    ctx.rect(f.x0, f.y0, f.x1 - f.x0, f.y1 - f.y0);
    ctx.clip();
    grain(ctx, f.x0, f.y0, f.x1 - f.x0, f.y1 - f.y0, 0.12, u(1.2, BG));
    ctx.restore();
    // Viñeta natural del papel fuera del haz
    ctx.fillStyle = radial(ctx, 0.1, yAt(1.1, BG), u(1.2, BG), u(4, BG), [
      [0, 'rgba(0,0,0,0)'],
      [1, 'rgba(0,0,0,0.45)'],
    ]);
    ctx.fillRect(f.x0, f.y0, f.x1 - f.x0, f.y1 - f.y0);
  }

  /* ---------------------------------------------------------------- Luces (2.4–2.8 m) */
  const KEY = { x: -1.35, d: 2.3, h: 1.75, r: 0.45 };
  const STRIP = { x: 1.15, d: 2.7, h: 1.4, w: 0.18, len: 1.1 };
  function paintLights(ctx: CanvasRenderingContext2D): void {
    // Ventana de luz octogonal vista de tres cuartos, con pie y brazo
    const kx = KEY.x;
    const ky = yAt(KEY.h, KEY.d);
    const kr = u(KEY.r, KEY.d);
    ctx.strokeStyle = '#121416';
    ctx.lineWidth = u(0.035, KEY.d);
    ctx.beginPath();
    ctx.moveTo(kx + kr * 0.3, ky);
    ctx.lineTo(kx + kr * 0.4, yAt(0, KEY.d));
    ctx.moveTo(kx + kr * 0.4, yAt(0, KEY.d));
    ctx.lineTo(kx + kr * 0.05, yAt(0, KEY.d) + u(0.05, KEY.d));
    ctx.moveTo(kx + kr * 0.4, yAt(0, KEY.d));
    ctx.lineTo(kx + kr * 0.8, yAt(0, KEY.d) + u(0.06, KEY.d));
    ctx.stroke();
    ctx.fillStyle = '#16181b';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const px = kx + Math.cos(a) * kr * 0.55 - kr * 0.25;
      const py = ky + Math.sin(a) * kr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = radial(ctx, kx, ky, 0, kr, [
      [0, '#ffffff'],
      [0.7, '#f4f6f6'],
      [1, '#c8cccc'],
    ]);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const px = kx + Math.cos(a) * kr * 0.5;
      const py = ky + Math.sin(a) * kr * 0.92;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    // Tira de recorte detrás a la derecha
    const sy = yAt(STRIP.h + STRIP.len / 2, STRIP.d);
    ctx.fillStyle = '#121416';
    ctx.fillRect(STRIP.x - u(0.02, STRIP.d), yAt(STRIP.h - STRIP.len / 2, STRIP.d), u(0.04, STRIP.d), yAt(0, STRIP.d) - yAt(STRIP.h - STRIP.len / 2, STRIP.d));
    roundRect(ctx, STRIP.x - u(STRIP.w / 2 + 0.03, STRIP.d), sy - u(0.03, STRIP.d), u(STRIP.w + 0.06, STRIP.d), u(STRIP.len + 0.06, STRIP.d), u(0.03, STRIP.d));
    ctx.fill();
    ctx.fillStyle = '#eef2f4';
    ctx.fillRect(STRIP.x - u(STRIP.w / 2 - 0.05, STRIP.d), sy, u(STRIP.w - 0.1, STRIP.d), u(STRIP.len, STRIP.d));
  }

  function lightEmitters(): Emitter[] {
    const out: Emitter[] = [];
    const ky = yAt(KEY.h, KEY.d);
    out.push({ kind: 'glow', x: KEY.x, y: ky, radius: u(KEY.r * 0.55, KEY.d), color: led, power: 1.6 });
    out.push({ kind: 'glow', x: KEY.x, y: ky, radius: u(KEY.r * 1.6, KEY.d), color: led, power: 0.18 });
    const sy = yAt(STRIP.h, STRIP.d);
    for (let i = -3; i <= 3; i++) {
      out.push({ kind: 'glow', x: STRIP.x, y: sy + u(i * 0.15, STRIP.d), radius: u(0.09, STRIP.d), color: led, power: 1.2 });
    }
    return out;
  }

  /* ---------------------------------------------------------------- Modelo (≈1.5 m) */
  const FACE_X = 0.13;
  function paintModel(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const k = u(1, SUBJ);
    const cy = yAt(EYE_H, SUBJ);
    const P = (x: number, y: number): [number, number] => [FACE_X - x * k, cy + y * k];
    const skin = hex('#d29a7c');
    const skinShade = hex('#9a6450');
    const top = hex('#1b1c20');
    // Hombros y torso con jersey negro de cuello alto (luz principal desde la izquierda)
    ctx.beginPath();
    ctx.moveTo(...P(0.06, 0.2));
    ctx.bezierCurveTo(...P(0.18, 0.22), ...P(0.24, 0.3), ...P(0.25, 0.45));
    ctx.lineTo(...P(0.23, 1.0));
    ctx.lineTo(...P(-0.24, 1.0));
    ctx.lineTo(...P(-0.25, 0.42));
    ctx.bezierCurveTo(...P(-0.22, 0.28), ...P(-0.14, 0.22), ...P(-0.05, 0.2));
    ctx.closePath();
    ctx.fillStyle = linear(ctx, ...P(0.26, 0.3), ...P(-0.26, 0.3), [
      [0, css(scale(top, 2.2))],
      [0.4, css(top)],
      [1, css(scale(top, 0.6))],
    ]);
    ctx.fill();
    // Cuello alto
    ctx.fillStyle = linear(ctx, ...P(0.08, 0.15), ...P(-0.08, 0.15), [
      [0, css(scale(top, 2.4))],
      [1, css(scale(top, 0.8))],
    ]);
    roundRect(ctx, Math.min(P(0.075, 0)[0], P(-0.075, 0)[0]), P(0, 0.14)[1], 0.15 * k, 0.1 * k, 0.03 * k);
    ctx.fill();
    // Pliegues del punto
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = Math.max(f.px, k * 0.004);
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(...P(-0.2 + i * 0.07, 0.3));
      ctx.quadraticCurveTo(...P(-0.18 + i * 0.07, 0.6), ...P(-0.2 + i * 0.07, 0.95));
      ctx.stroke();
    }
    paintProfileHead(ctx, f, P, k, {
      skin,
      skinShade,
      hairDark: hex('#1e140e'),
      hairMid: hex('#3a2618'),
      hairLight: hex('#6a4a32'),
      frontRim: 0.35,
      frontRimColor: hex('#fff4ea'),
      backRim: 0.45,
      backRimColor: hex('#e8f2ff'),
      seed: 37,
    });
    // Pendiente con brillo
    ctx.fillStyle = '#e8d8a0';
    ellipse(ctx, ...P(-0.025, 0.06), k * 0.008, k * 0.008);
    ctx.fill();
  }

  function modelEmitters(): Emitter[] {
    const k = u(1, SUBJ);
    const cy = yAt(EYE_H, SUBJ);
    const P = (x: number, y: number): [number, number] => [FACE_X - x * k, cy + y * k];
    const [ex, ey] = P(-0.024, 0.058);
    // Brillo especular del pendiente: punto nítido si se enfoca bien, bokeh si no.
    return [{ kind: 'point', x: ex, y: ey, size: u(0.004, SUBJ), color: led, power: 30 }];
  }

  /* ---------------------------------------------------------------- Producto (≈1.15 m) */
  const PX = -0.36;
  function paintProduct(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = PRODUCT_D;
    const k = u(1, d);
    const topY = yAt(1.2, d);
    // Pedestal blanco mate
    ctx.fillStyle = linear(ctx, PX - k * 0.12, 0, PX + k * 0.12, 0, [
      [0, '#f2f2ee'],
      [0.6, '#c8cac6'],
      [1, '#8a8c88'],
    ]);
    ctx.fillRect(PX - k * 0.12, topY, k * 0.24, yAt(0, d) - topY);
    ctx.fillStyle = '#fbfbf8';
    ctx.fillRect(PX - k * 0.13, topY - k * 0.01, k * 0.26, k * 0.02);
    // Frasco de vidrio con líquido ámbar
    const bw = k * 0.075;
    const bh = k * 0.105;
    const by = topY - bh;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ellipse(ctx, PX + k * 0.01, topY, bw * 0.7, k * 0.008);
    ctx.fill();
    ctx.fillStyle = linear(ctx, PX - bw / 2, 0, PX + bw / 2, 0, [
      [0, '#f6c66a'],
      [0.25, '#d2902e'],
      [0.6, '#a8661a'],
      [1, '#6a3c10'],
    ]);
    roundRect(ctx, PX - bw / 2, by, bw, bh, bw * 0.12);
    ctx.fill();
    // Cristal grueso: borde claro y reflejo vertical de la ventana de luz
    ctx.strokeStyle = 'rgba(255,248,230,0.55)';
    ctx.lineWidth = bw * 0.05;
    roundRect(ctx, PX - bw / 2, by, bw, bh, bw * 0.12);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    roundRect(ctx, PX - bw * 0.36, by + bh * 0.1, bw * 0.12, bh * 0.75, bw * 0.05);
    ctx.fill();
    // Cuello, tapón dorado y etiqueta
    ctx.fillStyle = '#c9a24a';
    ctx.fillRect(PX - bw * 0.14, by - k * 0.012, bw * 0.28, k * 0.012);
    ctx.fillStyle = linear(ctx, PX - bw * 0.22, 0, PX + bw * 0.22, 0, [
      [0, '#fff0b8'],
      [0.4, '#d4aa48'],
      [1, '#7a5a18'],
    ]);
    roundRect(ctx, PX - bw * 0.22, by - k * 0.045, bw * 0.44, k * 0.035, k * 0.004);
    ctx.fill();
    ctx.fillStyle = 'rgba(250,246,236,0.9)';
    ctx.fillRect(PX - bw * 0.28, by + bh * 0.42, bw * 0.56, bh * 0.22);
    ctx.fillStyle = '#3a2a1a';
    ctx.font = `600 ${bh * 0.1}px Geist, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MODO M', PX, by + bh * 0.53);
    // Ramita seca junto al frasco
    const r = rand(12);
    ctx.strokeStyle = '#8a7a5a';
    ctx.lineWidth = Math.max(f.px * 0.6, k * 0.002);
    for (let i = 0; i < 3; i++) {
      const sx = PX - bw * 0.9 - i * k * 0.006;
      ctx.beginPath();
      ctx.moveTo(sx, topY);
      ctx.quadraticCurveTo(sx - k * 0.01, topY - k * 0.05, sx - r.range(-0.01, 0.03) * k, topY - k * r.range(0.07, 0.11));
      ctx.stroke();
      ctx.fillStyle = css(mix(hex('#d8c8a0'), hex('#b89a6a'), r()));
      ellipse(ctx, sx - r.range(-0.01, 0.03) * k, topY - k * r.range(0.07, 0.11), k * 0.004, k * 0.008);
      ctx.fill();
    }
  }

  function productEmitters(): Emitter[] {
    const d = PRODUCT_D;
    const k = u(1, d);
    const topY = yAt(1.2, d);
    const bw = k * 0.075;
    const bh = k * 0.105;
    const by = topY - bh;
    return [
      { kind: 'point', x: PX - bw * 0.3, y: by + bh * 0.2, size: u(0.006, d), color: led, power: 18 },
      { kind: 'point', x: PX - bw * 0.15, y: by - k * 0.03, size: u(0.004, d), color: led, power: 22 },
      { kind: 'point', x: PX + bw * 0.38, y: by + bh * 0.7, size: u(0.004, d), color: [1, 0.85, 0.6], power: 8 },
    ];
  }

  return {
    id: 'studio',
    seed: 9090,
    layers: [
      { id: 'fondo', distanceM: BG, noPeaking: true, paint: paintBackdrop },
      { id: 'luces', distanceM: 2.5, paint: paintLights, emitters: lightEmitters },
      { id: 'modelo', distanceM: SUBJ, paint: paintModel, emitters: modelEmitters },
      { id: 'producto', distanceM: PRODUCT_D, paint: paintProduct, emitters: productEmitters },
    ],
  };
}
