/**
 * Vía Láctea sobre un árbol seco: cielo oscuro con el núcleo galáctico cerca del horizonte,
 * franjas de polvo, resplandor verde del airglow y un domo de contaminación lumínica lejano.
 *
 * Las estrellas son fuentes puntuales en el búfer emisivo. Durante la exposición giran alrededor
 * del polo celeste a la velocidad sideral (7.27·10⁻⁵ rad/s): con tiempos largos trazan arcos.
 * El arco se exagera ×3 para que a la resolución de pantalla se aprecie lo que se vería al
 * 100 % en un sensor de 24 MP: por debajo de la regla de los 500 las estrellas siguen siendo
 * puntos y por encima se alargan en trazos.
 */
import type { SimScene } from '../types';
import { css, fillFrame, groundY, hex, linear, mix, rand, ridge, sampleRidge, sizer, softDot } from './kit';
import type { Rand } from './kit';
import type { Emitter, LinearRGB, PaintFrame, ScenePainter } from './types';

const HZ = 0.27;
const CAM_H = 1.6;
const SIDEREAL = 7.2921e-5;
const TRAIL_GAIN = 3;
/** Polo celeste (unidades de mundo): arriba a la izquierda, dentro del cuadro a 14–20 mm. */
const POLE = { x: -0.62, y: -0.3 };

interface Star {
  x: number;
  y: number;
  power: number;
  color: LinearRGB;
}

const STAR_COLORS: LinearRGB[] = [
  [0.72, 0.82, 1],
  [0.85, 0.9, 1],
  [1, 1, 1],
  [1, 0.95, 0.85],
  [1, 0.82, 0.62],
  [1, 0.7, 0.5],
];

/** Coordenada a lo largo de la banda galáctica (t) y distancia perpendicular (s). */
function bandFrame(x: number, y: number): { t: number; s: number } {
  // Eje de la banda: desde abajo a la izquierda hacia arriba a la derecha.
  const ax = 0.62;
  const ay = -0.78;
  const ox = -0.35;
  const oy = 0.18;
  const dx = x - ox;
  const dy = y - oy;
  return { t: dx * ax + dy * ay, s: -dx * ay + dy * ax };
}

function branch(ctx: CanvasRenderingContext2D, r: Rand, x: number, y: number, ang: number, len: number, w: number, depth: number, minW: number): void {
  const ex = x + Math.sin(ang) * len;
  const ey = y - Math.cos(ang) * len;
  const mx = (x + ex) / 2 + (r() - 0.5) * len * 0.25;
  const my = (y + ey) / 2 + (r() - 0.5) * len * 0.15;
  ctx.lineWidth = Math.max(minW, w);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(mx, my, ex, ey);
  ctx.stroke();
  if (depth <= 0 || w < minW * 0.35) return;
  const n = depth > 4 ? 2 : r.chance(0.6) ? 2 : 3;
  for (let i = 0; i < n; i++) {
    const spread = r.range(0.25, 0.7) * (i % 2 === 0 ? -1 : 1);
    branch(ctx, r, ex, ey, ang + spread + (r() - 0.5) * 0.3, len * r.range(0.62, 0.82), w * 0.62, depth - 1, minW);
  }
}

export function astroPainter(scene: SimScene): ScenePainter {
  const REF = scene.refFocalMm;
  const u = sizer(REF);
  const gy = (d: number) => groundY(HZ, REF, CAM_H, d);
  const TREE_D = scene.lighting.foregroundDistanceM ?? 15;

  // Catálogo de estrellas: más densas sobre la banda galáctica, brillo con ley de potencias.
  const stars: Star[] = [];
  {
    const r = rand(1987);
    let tries = 0;
    while (stars.length < 3400 && tries < 40000) {
      tries++;
      const x = r.range(-1.6, 1.6);
      const y = r.range(-1.25, HZ + 0.02);
      const { s } = bandFrame(x, y);
      const density = 0.28 + 0.72 * Math.exp(-Math.pow(s / 0.2, 2));
      if (r() > density) continue;
      const m = Math.pow(1 - r() * 0.999, -1 / 1.25); // 1 … ~250
      const power = Math.min(90, 0.22 * m);
      stars.push({ x, y, power, color: STAR_COLORS[Math.min(STAR_COLORS.length - 1, Math.floor(r() * STAR_COLORS.length))]! });
    }
  }

  /* ---------------------------------------------------------------- Cielo y Vía Láctea */
  function paintSky(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    fillFrame(
      ctx,
      f,
      linear(ctx, 0, -1.3, 0, HZ, [
        [0, '#04060c'],
        [0.5, '#081020'],
        [0.85, '#122034'],
        [1, '#24343c'],
      ]),
    );
    // Airglow verde y domo de contaminación lumínica sobre el horizonte
    ctx.fillStyle = linear(ctx, 0, HZ - 0.3, 0, HZ, [
      [0, 'rgba(60,120,80,0)'],
      [0.7, 'rgba(70,135,95,0.14)'],
      [1, 'rgba(110,140,110,0.26)'],
    ]);
    ctx.fillRect(f.x0, HZ - 0.3, f.x1 - f.x0, 0.31);
    ctx.save();
    ctx.translate(1.05, HZ);
    ctx.scale(1, 0.32);
    softDot(ctx, 0, 0, 0.75, hex('#d39556'), 0.42);
    ctx.restore();

    const r = rand(2024);
    const AX = { x: 0.62, y: -0.78 };
    const NX = { x: 0.78, y: 0.62 };
    const at = (t: number, sOff: number) => ({ x: -0.35 + AX.x * t + NX.x * sOff, y: 0.18 + AX.y * t + NX.y * sOff });
    const T_CORE = 0.22;
    const bright = (t: number) => 0.35 + 0.65 * Math.exp(-Math.pow((t - T_CORE) / 0.42, 2));
    const width = (t: number) => 0.13 + 0.07 * Math.exp(-Math.pow((t - T_CORE) / 0.4, 2));
    const visibleAt = (x: number, y: number, m: number) => x > f.x0 - m && x < f.x1 + m && y > f.y0 - m && y < f.y1 + m;
    // Resplandor difuso de la banda
    for (let i = 0; i < 1300; i++) {
      const t = r.range(-0.6, 1.9);
      const w = width(t);
      const sOff = r.normal() * w * 0.45;
      const p = at(t, sOff);
      if (!visibleAt(p.x, p.y, 0.12)) continue;
      const b = bright(t) * Math.exp(-Math.pow(sOff / (w * 0.9), 2));
      const warm = Math.exp(-Math.pow((t - T_CORE) / 0.35, 2));
      const c = mix(hex('#9aa6c8'), hex('#e6c8a0'), warm * 0.85);
      softDot(ctx, p.x, p.y, r.range(0.03, 0.09), c, 0.05 * b * r.range(0.5, 1));
    }
    // Nubes estelares: manchas granulares más brillantes
    for (let c = 0; c < 18; c++) {
      const t = T_CORE + r.normal() * 0.45;
      const p0 = at(t, r.normal() * 0.04);
      if (!visibleAt(p0.x, p0.y, 0.15)) continue;
      const rad = r.range(0.03, 0.08);
      const col = mix(hex('#c8cce0'), hex('#f0d8b4'), Math.exp(-Math.pow((t - T_CORE) / 0.3, 2)));
      softDot(ctx, p0.x, p0.y, rad * 1.6, col, 0.08 * bright(t));
      const n = Math.min(500, Math.round(rad * rad * 4e5 * Math.max(0.2, f.ppu / 800)));
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2;
        const rr = Math.abs(r.normal()) * rad * 0.6;
        ctx.fillStyle = css(mix(col, hex('#ffffff'), r() * 0.5), 0.35 * r());
        ctx.fillRect(p0.x + Math.cos(a) * rr, p0.y + Math.sin(a) * rr, f.px, f.px);
      }
    }
    // Núcleo galáctico
    const core = at(T_CORE, 0.01);
    ctx.save();
    ctx.translate(core.x, core.y);
    ctx.rotate(Math.atan2(AX.y, AX.x));
    ctx.scale(1, 0.55);
    softDot(ctx, 0, 0, 0.24, hex('#ebcfa6'), 0.22, 0.1);
    softDot(ctx, 0, 0, 0.1, hex('#f8e6c8'), 0.18, 0.2);
    ctx.restore();
    // Nebulosas de emisión (rosadas) cerca del núcleo
    for (let i = 0; i < 4; i++) {
      const p = at(T_CORE + r.range(-0.15, 0.25), r.range(-0.08, 0.08));
      softDot(ctx, p.x, p.y, r.range(0.012, 0.025), hex('#d47c8e'), 0.35);
    }
    // Gran Grieta: franjas de polvo alargadas a lo largo del eje, desde el núcleo hacia arriba
    const axisAng = Math.atan2(AX.y, AX.x);
    for (let i = 0; i < 260; i++) {
      const t = r.range(T_CORE - 0.35, 1.8);
      const wig = Math.sin(t * 7) * 0.018 + Math.sin(t * 17 + 1) * 0.008;
      const sOff = wig + r.normal() * 0.012 - 0.01;
      const p = at(t, sOff);
      if (!visibleAt(p.x, p.y, 0.1)) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(axisAng + r.normal() * 0.25);
      ctx.scale(1, r.range(0.18, 0.35));
      softDot(ctx, 0, 0, r.range(0.025, 0.07), hex('#04050a'), r.range(0.15, 0.32) * Math.min(1, bright(t) + 0.2));
      ctx.restore();
    }
    // Nubes oscuras sueltas
    for (let i = 0; i < 40; i++) {
      const t = r.range(-0.4, 1.7);
      const p = at(t, r.normal() * width(t) * 0.5);
      if (!visibleAt(p.x, p.y, 0.1)) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(r() * Math.PI);
      ctx.scale(1, r.range(0.3, 0.6));
      softDot(ctx, 0, 0, r.range(0.01, 0.03), hex('#05060b'), r.range(0.2, 0.4));
      ctx.restore();
    }
    // Polvo estelar no resuelto (textura fina, más denso sobre la banda)
    const n = Math.min(6000, Math.round((f.x1 - f.x0) * (Math.min(f.y1, HZ) - f.y0) * 2600));
    for (let i = 0; i < n; i++) {
      const x = r.range(f.x0, f.x1);
      const y = r.range(f.y0, Math.min(f.y1, HZ));
      const { s: sOff } = bandFrame(x, y);
      const k = Math.exp(-Math.pow(sOff / 0.15, 2));
      if (r() > 0.12 + k) continue;
      ctx.fillStyle = css(mix(hex('#c8d2f0'), hex('#ffe8c8'), r()), 0.2 + 0.3 * k * r());
      ctx.fillRect(x, y, f.px * 0.9, f.px * 0.9);
    }
  }

  function starLights(f: PaintFrame): Emitter[] {
    const sweep = SIDEREAL * f.exposureS * TRAIL_GAIN;
    const size = u(0.0004 * 1e6, 1e6);
    const out: Emitter[] = [];
    for (const s of stars) {
      if (s.x < f.x0 - 0.1 || s.x > f.x1 + 0.1 || s.y < f.y0 - 0.1 || s.y > f.y1 + 0.1) continue;
      out.push({ kind: 'arc', cx: POLE.x, cy: POLE.y, x: s.x, y: s.y, sweep, size, color: s.color, power: s.power });
      // Las más brillantes muestran un pequeño halo (dispersión en la óptica y la atmósfera).
      if (s.power > 25) out.push({ kind: 'glow', x: s.x, y: s.y, radius: size * 2.5, color: s.color, power: s.power * 0.01 });
    }
    return out;
  }

  /* ---------------------------------------------------------------- Sierras lejanas */
  const hills = ridge(3131, 8, 1, 0.55);
  function paintHills(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = 4000;
    const top = (x: number) => HZ - u(260 + sampleRidge(hills, -2, 2, x) * 420 + 160, d);
    ctx.beginPath();
    ctx.moveTo(f.x0 - 0.02, HZ + 0.01);
    for (let x = f.x0 - 0.02; x <= f.x1 + 0.02; x += Math.max(f.px * 2, 0.004)) ctx.lineTo(x, top(x));
    ctx.lineTo(f.x1 + 0.02, HZ + 0.01);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, 0, HZ - 0.08, 0, HZ, [
      [0, '#0c1016'],
      [1, '#080a0e'],
    ]);
    ctx.fill();
  }

  /* ---------------------------------------------------------------- Suelo */
  function paintGround(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    if (f.y1 < HZ) return;
    ctx.fillStyle = linear(ctx, 0, HZ, 0, f.y1, [
      [0, '#0b0e12'],
      [1, '#050608'],
    ]);
    ctx.fillRect(f.x0, HZ, f.x1 - f.x0, f.y1 - HZ + f.px);
    // Pastos y piedras en contraluz contra el cielo apenas más claro
    const r = rand(7070);
    ctx.strokeStyle = '#06070a';
    ctx.lineCap = 'round';
    for (let d = 60; d > 3; d *= 0.86) {
      const y = gy(d);
      if (y < f.y0 || y > f.y1 + 0.05) continue;
      ctx.lineWidth = Math.max(f.px * 0.6, u(0.01, d));
      ctx.beginPath();
      for (let i = 0; i < 70; i++) {
        const x = r.range(f.x0, f.x1);
        const h = u(r.range(0.15, 0.5), d);
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + h * 0.1, y - h * 0.6, x + (r() - 0.5) * h * 0.5, y - h);
      }
      ctx.stroke();
    }
  }

  /* ---------------------------------------------------------------- Árbol seco (15 m) */
  function paintTree(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const d = TREE_D;
    const base = gy(d);
    const x = 0.38;
    const r = rand(5555);
    ctx.strokeStyle = '#050608';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const minW = Math.max(f.px * 0.7, u(0.012, d));
    // Tronco retorcido que se abre en ramas
    ctx.lineWidth = u(0.45, d);
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.bezierCurveTo(x - u(0.4, d), base - u(1.5, d), x + u(0.5, d), base - u(2.6, d), x + u(0.1, d), base - u(3.4, d));
    ctx.stroke();
    const fork = { x: x + u(0.1, d), y: base - u(3.4, d) };
    branch(ctx, r, fork.x, fork.y, -0.55, u(2.6, d), u(0.3, d), 7, minW);
    branch(ctx, r, fork.x, fork.y, 0.15, u(3.0, d), u(0.32, d), 7, minW);
    branch(ctx, r, fork.x, fork.y, 0.75, u(2.2, d), u(0.25, d), 6, minW);
    // Montículo de tierra y rocas al pie
    ctx.fillStyle = '#050608';
    ctx.beginPath();
    ctx.moveTo(x - u(6, d), base + u(0.3, d));
    ctx.quadraticCurveTo(x, base - u(0.9, d), x + u(7, d), base + u(0.4, d));
    ctx.closePath();
    ctx.fill();
  }

  // Giro aparente del cielo: barrido tangencial equivalente en el centro del cuadro.
  const R0 = Math.hypot(POLE.x, POLE.y);
  const skySpeed = (SIDEREAL * TRAIL_GAIN * R0 * 1e6 * 36) / (REF * 1.5);

  return {
    id: 'astro',
    seed: 6060,
    layers: [
      {
        id: 'cielo',
        distanceM: 1e6,
        motion: { speedMS: skySpeed, dirX: POLE.y, dirY: -POLE.x },
        paint: paintSky,
        emitters: starLights,
      },
      { id: 'sierras', distanceM: 4000, paint: paintHills },
      { id: 'suelo', distanceM: 40, plane: { horizonY: HZ, cameraHeightM: CAM_H, farM: 4000 }, paint: paintGround },
      { id: 'arbol', distanceM: TREE_D, paint: paintTree },
    ],
  };
}
