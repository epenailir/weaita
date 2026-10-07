/**
 * Ciudad de noche en la hora azul, vista desde una pasarela: avenida de cuatro carriles
 * (12–22 m) con tráfico en ambos sentidos, edificios con ventanas iluminadas al fondo (≈90 m),
 * faroles de sodio y asfalto mojado que refleja las luces en estelas verticales.
 *
 * Cada auto es una capa en movimiento (el renderizador la barre según motionBlurPx) y sus luces
 * son estelas en el búfer emisivo: su longitud es la distancia recorrida durante la exposición.
 * Los faros se ven cuando el auto se acerca de frente y las luces traseras cuando se aleja; en
 * exposiciones largas pasan varios autos y las estelas se superponen. El auto en sí se diluye.
 */
import type { SimScene } from '../types';
import {
  css,
  fillFrame,
  grain,
  groundY,
  hex,
  kelvinLight,
  linear,
  mix,
  rand,
  ridge,
  roundRect,
  sampleRidge,
  scale,
  sizer,
  softDot,
  wrapCentered,
} from './kit';
import type { RGB } from './kit';
import type { Emitter, LinearRGB, PaintFrame, SceneLayer, ScenePainter } from './types';

/** Cámara en una pasarela peatonal a 5 m: los carriles se escalonan en altura. */
const HZ = -0.24;
const CAM_H = 5;

interface Car {
  /** Posición en metros a lo largo del carril en t = 0. */
  x0: number;
  lengthM: number;
  heightM: number;
  color: RGB;
  bus: boolean;
  seed: number;
}

interface Lane {
  d: number;
  dir: 1 | -1;
  speed: number;
  /** Periodo del tráfico (m): los autos se repiten cada `period` metros. */
  period: number;
  cars: Car[];
}

const HEAD: LinearRGB = [0.86, 0.93, 1];
const TAIL: LinearRGB = [1, 0.07, 0.035];
const AMBER: LinearRGB = [1, 0.55, 0.08];

export function nightCityPainter(scene: SimScene): ScenePainter {
  const REF = scene.refFocalMm;
  const u = sizer(REF);
  const gy = (d: number) => groundY(HZ, REF, CAM_H, d);
  const BG = scene.lighting.backgroundDistanceM;
  const SUBJ = scene.lighting.subjectDistanceM;
  const SPEED = scene.lighting.subjectSpeedMS;
  const sodium = kelvinLight(2100);
  const warmWin = kelvinLight(2900);
  const coolWin = kelvinLight(5200);
  /** Seno del ángulo respecto del eje óptico para un punto en x (unidades de mundo). */
  const sinAngle = (x: number) => x / Math.hypot(x, REF / 24);

  const lanes: Lane[] = [];
  {
    const r = rand(4747);
    const defs: Array<[number, 1 | -1, number]> = [
      [SUBJ - 3.2, 1, SPEED * 1.08],
      [SUBJ, 1, SPEED],
      [SUBJ + 3.6, -1, SPEED * 0.92],
      [SUBJ + 7, -1, SPEED * 1.05],
    ];
    const bodyCols = ['#1b1e25', '#5a0f14', '#9aa0a8', '#23324a', '#2b2b2e', '#d8d8d6', '#3a3f2a'].map(hex);
    defs.forEach(([d, dir, speed], li) => {
      const period = r.range(38, 55);
      const n = li === 1 ? 3 : 2;
      const cars: Car[] = [];
      for (let k = 0; k < n; k++) {
        const bus = li === 3 && k === 0;
        cars.push({
          x0: (k / n) * period + r.range(-4, 4) + (li === 1 && k === 0 ? 0 : 0),
          lengthM: bus ? 12 : r.range(4.2, 4.8),
          heightM: bus ? 3.1 : r.range(1.4, 1.55),
          color: bus ? hex('#7a7466') : bodyCols[(li * 3 + k) % bodyCols.length]!,
          bus,
          seed: 100 * li + k,
        });
      }
      lanes.push({ d, dir, speed, period, cars });
    });
    // El auto principal del carril del sujeto pasa por el centro en t = 0.
    lanes[1]!.cars[0]!.x0 = -0.3;
  }

  /** Posición (m, centrada) del auto en el instante t, envuelta en el periodo del carril. */
  const carX = (lane: Lane, car: Car, t: number) => wrapCentered(car.x0 + lane.dir * lane.speed * t, lane.period);

  /* ---------------------------------------------------------------- Cielo de la hora azul */
  function paintSky(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    fillFrame(
      ctx,
      f,
      linear(ctx, 0, -1.1, 0, HZ, [
        [0, '#0a1430'],
        [0.5, '#18295a'],
        [0.85, '#2f3f72'],
        [1, '#6a5a78'],
      ]),
    );
    ctx.save();
    ctx.translate(0, HZ);
    ctx.scale(1, 0.3);
    softDot(ctx, 0, 0, 1.6, hex('#b0786a'), 0.35);
    ctx.restore();
  }

  /* ---------------------------------------------------------------- Edificios (≈90 m) */
  interface Tower {
    x: number;
    w: number;
    h: number;
    d: number;
    tone: RGB;
    seed: number;
    warm: number;
  }
  const towers: Tower[] = [];
  {
    const r = rand(9191);
    const sky = ridge(77, 7, 1, 0.6);
    let x = -2.3;
    while (x < 2.3) {
      const d = BG + r.range(0, 90);
      const w = u(r.range(14, 30), d);
      const hM = 18 + (sampleRidge(sky, -2.3, 2.3, x) + 0.5) * 70 + r.range(0, 25);
      towers.push({ x, w, h: u(hM, d), d, tone: mix(hex('#1c2236'), hex('#2e3550'), r()), seed: towers.length + 1, warm: r() });
      x += w * r.range(0.75, 1.05);
    }
    towers.sort((a, b) => b.d - a.d);
  }

  function paintSkyline(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    for (const t of towers) {
      if (t.x > f.x1 || t.x + t.w < f.x0) continue;
      const base = gy(t.d);
      const top = base - t.h;
      const r = rand(t.seed * 31);
      ctx.fillStyle = linear(ctx, 0, top, 0, base, [
        [0, css(mix(t.tone, hex('#3a4a7a'), 0.3))],
        [1, css(scale(t.tone, 0.8))],
      ]);
      ctx.fillRect(t.x, top, t.w, t.h);
      // Ventanas en retícula; algunas encendidas (cálidas u oficinas frías)
      const fh = u(3.4, t.d);
      const cw = u(2.2, t.d);
      const cols = Math.max(2, Math.floor(t.w / cw));
      const floors = Math.max(2, Math.floor(t.h / fh) - 1);
      const lit = new Path2D();
      const litCool = new Path2D();
      const dark = new Path2D();
      for (let fl = 0; fl < floors; fl++) {
        const wy = top + fh * (fl + 0.6);
        const rowLit = r() < 0.75;
        for (let c = 0; c < cols; c++) {
          const wx = t.x + (t.w - cols * cw) / 2 + cw * (c + 0.2);
          const on = rowLit && r() < 0.42;
          const p = on ? (t.warm > 0.45 ? lit : litCool) : dark;
          p.rect(wx, wy, cw * 0.6, fh * 0.55);
        }
      }
      ctx.fillStyle = '#ffcf86';
      ctx.fill(lit);
      ctx.fillStyle = '#cfe2ff';
      ctx.fill(litCool);
      ctx.fillStyle = 'rgba(10,14,26,0.6)';
      ctx.fill(dark);
      // Remate de azotea
      ctx.fillStyle = css(scale(t.tone, 0.7));
      ctx.fillRect(t.x + t.w * 0.2, top - u(2, t.d), t.w * 0.25, u(2, t.d));
    }
    // Banda de comercios a pie de calle (≈40 m) con vidrieras
    const d = 40;
    const base = gy(d);
    const r = rand(515);
    let x = -2.2;
    while (x < 2.2) {
      const w = u(r.range(6, 11), d);
      const h = u(r.range(4.5, 7), d);
      ctx.fillStyle = css(mix(hex('#1a1d28'), hex('#30283a'), r()));
      ctx.fillRect(x, base - h, w, h);
      const shop = r() < 0.75;
      if (shop) {
        const warm = r() < 0.55;
        ctx.fillStyle = linear(ctx, 0, base - u(3.2, d), 0, base, [
          [0, css(warm ? hex('#c9925a') : hex('#8aa6c8'))],
          [1, css(hex('#3a2a22'))],
        ]);
        ctx.fillRect(x + w * 0.08, base - u(3.2, d), w * 0.84, u(3.0, d));
        // Siluetas de estantes y clientes dentro de la vidriera
        ctx.fillStyle = 'rgba(20,14,12,0.55)';
        for (let k = 0; k < 4; k++) ctx.fillRect(x + w * (0.12 + k * 0.2), base - u(r.range(1.4, 2.6), d), w * 0.06, u(r.range(1.2, 2.4), d));
        // Marquesina / letrero
        ctx.fillStyle = css(r.pick([hex('#ff4a6a'), hex('#4ad8ff'), hex('#ffd04a'), hex('#9a6aff')]));
        ctx.fillRect(x + w * 0.15, base - u(4.0, d), w * 0.7, u(0.45, d));
      }
      x += w;
    }
  }

  function skylineLights(): Emitter[] {
    const out: Emitter[] = [];
    const r = rand(616);
    for (const t of towers) {
      // Balizas rojas de azotea en las torres altas
      if (t.h > u(70, t.d)) out.push({ kind: 'point', x: t.x + t.w * 0.32, y: gy(t.d) - t.h - u(2, t.d), size: u(0.6, t.d), color: TAIL, power: 25, distanceM: t.d });
    }
    // Letreros de neón de los comercios
    const d = 40;
    const base = gy(d);
    for (let i = 0; i < 26; i++) {
      out.push({
        kind: 'point',
        x: r.range(-2.2, 2.2),
        y: base - u(r.range(3.2, 4.2), d),
        size: u(0.35, d),
        color: r.pick([warmWin, coolWin, [1, 0.25, 0.4] as LinearRGB, [0.3, 0.85, 1] as LinearRGB]),
        power: r.range(6, 16),
        distanceM: d,
      });
    }
    return out;
  }

  /* ---------------------------------------------------------------- Vereda lejana (≈28 m) */
  const LAMP_D = 27;
  const lampXs = [-2.1, -1.3, -0.5, 0.3, 1.1, 1.9];
  function paintSidewalk(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const base = gy(LAMP_D);
    // Árboles de alineación iluminados desde abajo por los faroles
    const r = rand(818);
    for (let i = 0; i < lampXs.length - 1; i++) {
      const tx = (lampXs[i]! + lampXs[i + 1]!) / 2;
      const h = u(r.range(6, 8), LAMP_D + 1);
      ctx.fillStyle = '#16120f';
      ctx.fillRect(tx - u(0.15, LAMP_D), base - h * 0.45, u(0.3, LAMP_D), h * 0.45);
      for (let k = 0; k < 14; k++) {
        const px = tx + r.normal() * h * 0.22;
        const py = base - h * 0.62 + r.normal() * h * 0.15;
        softDot(ctx, px, py, h * r.range(0.12, 0.2), mix(hex('#121a12'), hex('#3e4a22'), r() * 0.6), 0.9, 0.6);
      }
    }
    // Postes de luz con brazo
    for (const lx of lampXs) {
      if (lx < f.x0 - 0.2 || lx > f.x1 + 0.2) continue;
      const h = u(8, LAMP_D);
      ctx.strokeStyle = '#1a1b20';
      ctx.lineWidth = Math.max(f.px, u(0.2, LAMP_D));
      ctx.beginPath();
      ctx.moveTo(lx, base);
      ctx.lineTo(lx, base - h);
      ctx.quadraticCurveTo(lx, base - h - u(0.6, LAMP_D), lx + u(1.6, LAMP_D), base - h - u(0.5, LAMP_D));
      ctx.stroke();
      ctx.fillStyle = '#ffd9a0';
      roundRect(ctx, lx + u(1.2, LAMP_D), base - h - u(0.55, LAMP_D), u(0.8, LAMP_D), u(0.25, LAMP_D), u(0.1, LAMP_D));
      ctx.fill();
    }
    // Semáforo
    const sx = 0.85;
    ctx.fillStyle = '#121316';
    ctx.fillRect(sx - u(0.1, 24), gy(24) - u(4.2, 24), u(0.2, 24), u(4.2, 24));
    roundRect(ctx, sx - u(0.25, 24), gy(24) - u(5.4, 24), u(0.5, 24), u(1.3, 24), u(0.1, 24));
    ctx.fill();
  }

  function sidewalkLights(): Emitter[] {
    const out: Emitter[] = [];
    const base = gy(LAMP_D);
    for (const lx of lampXs) {
      const x = lx + u(1.6, LAMP_D);
      const y = base - u(8, LAMP_D) - u(0.4, LAMP_D);
      out.push({ kind: 'point', x, y, size: u(0.45, LAMP_D), color: sodium, power: 60 });
      out.push({ kind: 'glow', x, y, radius: u(1.4, LAMP_D), color: sodium, power: 0.35 });
    }
    // Reflejos en el asfalto mojado: el reflejo de una luz a altura h aparece bajo el suelo,
    // estirado verticalmente por la rugosidad del agua.
    const rr = rand(4141);
    for (const lx of lampXs) {
      const x = lx + u(1.6, LAMP_D);
      const yRoad = gy(LAMP_D - 1);
      const yMirror = HZ + u(CAM_H + 8, LAMP_D);
      // Tramos cortados por las ondas del agua, cada vez más tenues hacia la cámara
      const n = 9;
      for (let i = 0; i < n; i++) {
        const a = yRoad + ((yMirror - yRoad) * i) / n;
        const b = a + ((yMirror - yRoad) / n) * rr.range(0.45, 0.85);
        const w = 1 - i / n;
        out.push({ kind: 'trail', x0: x + rr.range(-0.004, 0.004), y0: a, x1: x + rr.range(-0.004, 0.004), y1: b, size: u(rr.range(0.25, 0.45), LAMP_D), color: sodium, power: 2.2 / n, distanceM: LAMP_D, w0: w, w1: w * 0.8 });
      }
    }
    // Semáforo en verde y su halo
    const sy = gy(24) - u(5.0, 24);
    out.push({ kind: 'point', x: 0.85, y: sy, size: u(0.22, 24), color: [0.2, 1, 0.55], power: 40, distanceM: 24 });
    out.push({ kind: 'glow', x: 0.85, y: sy, radius: u(0.5, 24), color: [0.2, 1, 0.55], power: 0.25 });
    return out;
  }

  /* ---------------------------------------------------------------- Calzada mojada (plano) */
  function paintRoad(ctx: CanvasRenderingContext2D, f: PaintFrame): void {
    const top = gy(40);
    const bottom = f.y1 + f.px;
    if (bottom <= top) return;
    ctx.fillStyle = linear(ctx, 0, top, 0, bottom, [
      [0, '#2a2530'],
      [0.25, '#17161c'],
      [1, '#0d0d10'],
    ]);
    ctx.fillRect(f.x0, top, f.x1 - f.x0, bottom - top);
    ctx.save();
    ctx.beginPath();
    ctx.rect(f.x0, top, f.x1 - f.x0, bottom - top);
    ctx.clip();
    grain(ctx, f.x0, top, f.x1 - f.x0, bottom - top, 0.35, u(1.5, 12));
    ctx.restore();
    // Bordillo y vereda lejana
    ctx.fillStyle = '#3a3640';
    ctx.fillRect(f.x0, gy(LAMP_D - 1.5), f.x1 - f.x0, u(0.2, LAMP_D));
    // Marcas de carril (discontinuas) y doble línea central
    const r = rand(33);
    for (const d of [SUBJ + 1.8, SUBJ - 1.6, SUBJ + 5.3]) {
      const y = gy(d);
      ctx.fillStyle = 'rgba(220,220,210,0.55)';
      const dash = u(3, d);
      const off = r() * dash * 3;
      for (let x = f.x0 - off; x < f.x1; x += dash * 3) ctx.fillRect(x, y - u(0.06, d), dash, u(0.12, d));
    }
    const yc = gy(SUBJ + 1.8);
    ctx.fillStyle = 'rgba(230,190,60,0.7)';
    ctx.fillRect(f.x0, yc - u(0.2, SUBJ), f.x1 - f.x0, u(0.08, SUBJ));
  }

  /* ---------------------------------------------------------------- Carriles */
  function drawCar(ctx: CanvasRenderingContext2D, lane: Lane, car: Car, x: number, f: PaintFrame): void {
    const d = lane.d;
    const k = u(1, d);
    const base = gy(d);
    const L = car.lengthM * k;
    const H = car.heightM * k;
    const F = lane.dir;
    // P: coordenadas locales en metros (0 = parte trasera, hacia adelante = F)
    const P = (lx: number, ly: number): [number, number] => [x + F * (lx - car.lengthM / 2) * k, base - ly * k];
    if (x + L < f.x0 || x - L > f.x1) return;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.ellipse(x, base, L * 0.55, k * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    const body = car.color;
    if (car.bus) {
      ctx.fillStyle = linear(ctx, 0, base - H, 0, base, [
        [0, css(scale(body, 0.75))],
        [1, css(scale(body, 0.35))],
      ]);
      roundRect(ctx, Math.min(...[P(0, 0)[0], P(car.lengthM, 0)[0]]), base - H - k * 0.3, L, H, k * 0.4);
      ctx.fill();
      // Ventanillas con luz interior
      for (let i = 0; i < 6; i++) {
        const [wx, wy] = P(1.2 + i * 1.75, 2.75);
        ctx.fillStyle = '#d8c79a';
        ctx.fillRect(Math.min(wx, wx + F * k * 1.4), wy, k * 1.4, k * 0.9);
        ctx.fillStyle = 'rgba(30,24,20,0.6)';
        ctx.fillRect(Math.min(wx, wx + F * k * 1.4) + k * 0.3, wy + k * 0.3, k * 0.35, k * 0.6);
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(...P(0, 0.35));
      ctx.lineTo(...P(0, 0.95));
      ctx.quadraticCurveTo(...P(0.2, 1.05), ...P(0.9, 1.05));
      ctx.lineTo(...P(1.4, car.heightM));
      ctx.lineTo(...P(2.9, car.heightM));
      ctx.lineTo(...P(3.5, 1.0));
      ctx.lineTo(...P(car.lengthM - 0.1, 0.9));
      ctx.quadraticCurveTo(...P(car.lengthM + 0.05, 0.85), ...P(car.lengthM, 0.4));
      ctx.lineTo(...P(0, 0.35));
      ctx.closePath();
      ctx.fillStyle = linear(ctx, 0, base - H, 0, base, [
        [0, css(mix(body, hex('#ffb070'), 0.18))],
        [0.45, css(scale(body, 0.7))],
        [1, css(scale(body, 0.35))],
      ]);
      ctx.fill();
      // Ventanillas con reflejo del cielo
      ctx.beginPath();
      ctx.moveTo(...P(1.05, 1.05));
      ctx.lineTo(...P(1.5, car.heightM - 0.08));
      ctx.lineTo(...P(2.82, car.heightM - 0.08));
      ctx.lineTo(...P(3.3, 1.05));
      ctx.closePath();
      ctx.fillStyle = linear(ctx, 0, base - H, 0, base - k, [
        [0, '#4a5a86'],
        [1, '#12141c'],
      ]);
      ctx.fill();
      // Reflejo anaranjado de los faroles en el capó y el techo
      ctx.strokeStyle = 'rgba(255,190,120,0.45)';
      ctx.lineWidth = Math.max(f.px, k * 0.04);
      ctx.beginPath();
      ctx.moveTo(...P(1.5, car.heightM - 0.02));
      ctx.lineTo(...P(2.9, car.heightM - 0.02));
      ctx.stroke();
    }
    // Ruedas
    for (const wx of [0.8, car.lengthM - 0.85]) {
      const [cx, cy] = P(wx, 0.33);
      ctx.fillStyle = '#08080a';
      ctx.beginPath();
      ctx.arc(cx, cy, k * 0.33, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a5c62';
      ctx.beginPath();
      ctx.arc(cx, cy, k * 0.17, 0, Math.PI * 2);
      ctx.fill();
    }
    // Ópticas (el brillo real lo aportan los emisores)
    ctx.fillStyle = '#e8f0ff';
    ctx.beginPath();
    ctx.ellipse(...P(car.lengthM - 0.12, 0.72), k * 0.12, k * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff2a2a';
    ctx.beginPath();
    ctx.ellipse(...P(0.08, car.bus ? 1.0 : 0.82), k * 0.1, k * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function laneLayer(lane: Lane, index: number): SceneLayer {
    return {
      id: `carril-${index + 1}`,
      distanceM: lane.d,
      animated: true,
      motion: { speedMS: lane.speed, dirX: lane.dir, dirY: 0 },
      bounds(f) {
        const k = u(1, lane.d);
        const tall = lane.cars.some((c) => c.bus) ? 3.7 : 1.9;
        return { x0: f.x0, x1: f.x1, y0: gy(lane.d) - k * tall, y1: gy(lane.d) + k * 0.25 };
      },
      paint(ctx, f) {
        const P = u(lane.period, lane.d);
        for (const car of lane.cars) {
          const x = u(carX(lane, car, f.timeS), lane.d);
          for (let c = -3; c <= 3; c++) drawCar(ctx, lane, car, x + c * P, f);
        }
      },
      emitters(f) {
        return laneLights(lane, f);
      },
    };
  }

  /**
   * Estelas de las luces de un carril durante la exposición [t − T, t]. Si en ese tiempo pasan
   * muchos autos, las pasadas se funden en una estela continua de brillo equivalente.
   */
  function laneLights(lane: Lane, f: PaintFrame): Emitter[] {
    const out: Emitter[] = [];
    const d = lane.d;
    const k = u(1, d);
    const T = f.exposureS;
    const travel = lane.speed * T; // m recorridos
    const P = lane.period;
    const viewM = (f.x1 - f.x0) / k;
    const span = travel + viewM + 12;
    const copies = Math.ceil(span / P) + 1;
    const merged = copies > 8;
    for (const car of lane.cars) {
      const lights: Array<{ lx: number; ly: number; color: LinearRGB; power: number; head: boolean; size: number }> = [
        { lx: car.lengthM - 0.12, ly: 0.7, color: HEAD, power: 140, head: true, size: 0.2 },
        { lx: 0.08, ly: car.bus ? 1.0 : 0.82, color: TAIL, power: 40, head: false, size: 0.16 },
        { lx: car.lengthM - 0.3, ly: 0.55, color: AMBER, power: 10, head: true, size: 0.08 },
      ];
      for (const l of lights) {
        // Visibilidad según el ángulo: de frente se ven los faros; alejándose, las traseras.
        const weight = (xWorld: number) => {
          const facing = -lane.dir * sinAngle(xWorld);
          return l.head ? 0.1 + Math.max(0, facing) * 3.2 : 0.25 + Math.max(0, -facing) * 2.4;
        };
        const y = gy(d) - l.ly * k;
        if (merged) {
          // Pasada media: equivale a una estela que cubre todo el cuadro con energía por periodo.
          const segs = 8;
          for (let s = 0; s < segs; s++) {
            const xa = f.x0 - 0.05 + ((f.x1 - f.x0 + 0.1) * s) / segs;
            const xb = f.x0 - 0.05 + ((f.x1 - f.x0 + 0.1) * (s + 1)) / segs;
            const scaleK = (xb - xa) / (P * k);
            out.push({ kind: 'trail', x0: xa, y0: y, x1: xb, y1: y, size: u(l.size, d), color: l.color, power: l.power * scaleK, distanceM: d, w0: weight(xa), w1: weight(xb) });
          }
          continue;
        }
        const xEnd = car.x0 + lane.dir * lane.speed * f.timeS;
        const lxOff = lane.dir * (l.lx - car.lengthM / 2);
        for (let c = -copies; c <= copies; c++) {
          const endM = wrapCentered(xEnd, P) + c * P + lxOff;
          const startM = endM - lane.dir * travel;
          const xa = u(startM, d);
          const xb = u(endM, d);
          if (Math.max(xa, xb) < f.x0 - 0.1 || Math.min(xa, xb) > f.x1 + 0.1) continue;
          if (travel * k < f.px * 0.5) {
            out.push({ kind: 'point', x: xb, y, size: u(l.size, d), color: l.color, power: l.power * weight(xb), distanceM: d });
            if (l.head && weight(xb) > 1) out.push({ kind: 'glow', x: xb, y, radius: u(0.5, d), color: l.color, power: 0.25 * weight(xb) });
          } else {
            // Se divide en tramos para que el brillo siga la visibilidad a lo largo del recorrido.
            const segs = Math.min(10, Math.max(1, Math.ceil(Math.abs(xb - xa) / 0.12)));
            for (let s = 0; s < segs; s++) {
              const a = xa + ((xb - xa) * s) / segs;
              const b = xa + ((xb - xa) * (s + 1)) / segs;
              out.push({ kind: 'trail', x0: a, y0: y, x1: b, y1: y, size: u(l.size, d), color: l.color, power: l.power / segs, distanceM: d, w0: weight(a), w1: weight(b) });
            }
          }
        }
      }
    }
    return out;
  }

  const laneLayers = lanes.map((l, i) => laneLayer(l, i)).reverse();

  return {
    id: 'night-city',
    seed: 3131,
    layers: [
      { id: 'cielo', distanceM: 5000, noPeaking: true, paint: paintSky },
      { id: 'edificios', distanceM: BG, paint: paintSkyline, emitters: skylineLights },
      { id: 'calzada', distanceM: 20, plane: { horizonY: HZ, cameraHeightM: CAM_H, farM: 40 }, paint: paintRoad },
      { id: 'vereda', distanceM: LAMP_D, paint: paintSidewalk, emitters: sidewalkLights },
      ...laneLayers,
    ],
  };
}
