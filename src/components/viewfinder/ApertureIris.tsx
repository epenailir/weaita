/**
 * Diafragma con palas curvas en SVG. El diámetro de la abertura es proporcional a
 * maxAperture / fNumber (el área cae a la mitad con cada paso) y las palas giran
 * ligeramente al cerrarse, como en un objetivo real.
 */
import { useEffect, useId } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { APERTURES, formatAperture } from '../../engine/scales';
import { cn } from '../../lib/cn';
import type { ApertureIrisProps } from './types';

const C = 50;
/** Radio interior del barril: hasta aquí llegan las palas visibles. */
const BARREL_R = 43;
/** Radio hasta el que se prolongan las palas por debajo del anillo. */
const BLADE_R = 46;
/** Giro total (rad) de las palas entre totalmente abierto y totalmente cerrado. */
const TWIST = (38 * Math.PI) / 180;
/** Desde este tamaño se rotula el número f bajo el diafragma. */
const LABEL_MIN_SIZE = 72;

type Pt = readonly [number, number];

/** Intersección del rayo p + t·d (t > 0) con la circunferencia de radio r centrada en C. */
function rayToCircle(p: Pt, d: Pt, r: number): Pt {
  const px = p[0] - C;
  const py = p[1] - C;
  const b = px * d[0] + py * d[1];
  const c = px * px + py * py - r * r;
  const t = -b + Math.sqrt(Math.max(0, b * b - c));
  return [p[0] + d[0] * t, p[1] + d[1] * t];
}

const f2 = (n: number) => n.toFixed(2);

/**
 * Trazados de las palas para una abertura de radio `rho`.
 * Cada pala está limitada por su lado del polígono de abertura, la prolongación curva
 * de ese lado, el borde exterior y la prolongación de la pala anterior.
 */
export function irisBladePaths(rho: number, blades: number): string[] {
  const n = Math.max(5, Math.round(blades));
  const open = Math.min(1, rho / BARREL_R);
  const a0 = -Math.PI / 2 + TWIST * (1 - open);
  const verts: Pt[] = Array.from({ length: n }, (_, k) => {
    const a = a0 + (2 * Math.PI * k) / n;
    return [C + rho * Math.cos(a), C + rho * Math.sin(a)];
  });

  // Prolongación curva de cada lado k (desde V[k+1] hasta el borde exterior)
  const ext = verts.map((v, k) => {
    const w = verts[(k + 1) % n]!;
    const len = Math.hypot(w[0] - v[0], w[1] - v[1]) || 1;
    const d: Pt = [(w[0] - v[0]) / len, (w[1] - v[1]) / len];
    const end = rayToCircle(w, d, BLADE_R);
    const mx = (w[0] + end[0]) / 2;
    const my = (w[1] + end[1]) / 2;
    // Curvatura hacia afuera proporcional al largo del tramo: da el aspecto de pala curva
    const seg = Math.hypot(end[0] - w[0], end[1] - w[1]);
    let nx = -d[1];
    let ny = d[0];
    if (nx * (mx - C) + ny * (my - C) < 0) {
      nx = -nx;
      ny = -ny;
    }
    const ctrl: Pt = [mx + nx * seg * 0.16, my + ny * seg * 0.16];
    return { start: w, ctrl, end };
  });

  return verts.map((v, k) => {
    const cur = ext[k]!;
    const prev = ext[(k - 1 + n) % n]!;
    const t1 = Math.atan2(cur.end[1] - C, cur.end[0] - C);
    const t0 = Math.atan2(prev.end[1] - C, prev.end[0] - C);
    let delta = t0 - t1;
    while (delta <= -Math.PI) delta += 2 * Math.PI;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    const sweep = delta > 0 ? 1 : 0;
    return [
      `M${f2(v[0])} ${f2(v[1])}`,
      `L${f2(cur.start[0])} ${f2(cur.start[1])}`,
      `Q${f2(cur.ctrl[0])} ${f2(cur.ctrl[1])} ${f2(cur.end[0])} ${f2(cur.end[1])}`,
      `A${BLADE_R} ${BLADE_R} 0 0 ${sweep} ${f2(prev.end[0])} ${f2(prev.end[1])}`,
      `Q${f2(prev.ctrl[0])} ${f2(prev.ctrl[1])} ${f2(v[0])} ${f2(v[1])}`,
      'Z',
    ].join(' ');
  });
}

function Blade({ paths, index, fill }: { paths: MotionValue<string[]>; index: number; fill: string }) {
  const d = useTransform(paths, (arr) => arr[index] ?? '');
  return <motion.path d={d} fill={fill} stroke="#050607" strokeWidth={0.7} strokeLinejoin="round" />;
}

/** Conjunto de palas; se monta de nuevo si cambia su número para recalcular la geometría. */
function Blades({ rho, count, fill }: { rho: MotionValue<number>; count: number; fill: string }) {
  const paths = useTransform(rho, (r) => irisBladePaths(r, count));
  return (
    <>
      {Array.from({ length: count }, (_, k) => (
        <Blade key={k} paths={paths} index={k} fill={fill} />
      ))}
    </>
  );
}

export function ApertureIris({ fNumber, blades = 9, size = 96, maxAperture = APERTURES[0]!.value, className }: ApertureIrisProps) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const ratio = Math.min(1, Math.max(0.03, maxAperture / Math.max(fNumber, 0.5)));
  const targetRho = BARREL_R * ratio;

  const rho = useMotionValue(targetRho);
  useEffect(() => {
    if (reduce) {
      rho.set(targetRho);
      return;
    }
    const controls = animate(rho, targetRho, { duration: 0.45, ease: [0.25, 1, 0.5, 1] });
    return () => controls.stop();
  }, [targetRho, reduce, rho]);

  const n = Math.max(5, Math.round(blades));
  const label = formatAperture(fNumber);
  const showLabel = size >= LABEL_MIN_SIZE;

  return (
    <span className={cn('inline-flex flex-col items-center gap-1.5', className)}>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        role="img"
        aria-label={`Diafragma a ${label}`}
        className="block shrink-0"
      >
        <defs>
          <radialGradient id={`${uid}-glass`} cx="42%" cy="38%" r="70%">
            <stop offset="0%" stopColor="#24354a" />
            <stop offset="45%" stopColor="#0d1520" />
            <stop offset="100%" stopColor="#030405" />
          </radialGradient>
          <linearGradient id={`${uid}-blade`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3a4249" />
            <stop offset="55%" stopColor="#22282d" />
            <stop offset="100%" stopColor="#14181b" />
          </linearGradient>
          <linearGradient id={`${uid}-ring`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2c3238" />
            <stop offset="100%" stopColor="#101316" />
          </linearGradient>
          <clipPath id={`${uid}-barrel`}>
            <circle cx={C} cy={C} r={BARREL_R} />
          </clipPath>
        </defs>

        {/* Vidrio visto a través de la abertura, con un reflejo del tratamiento antirreflejo */}
        <circle cx={C} cy={C} r={BARREL_R} fill={`url(#${uid}-glass)`} />
        <ellipse cx={40} cy={36} rx={11} ry={6} fill="#ffb224" opacity={0.1} transform="rotate(-30 40 36)" />
        <ellipse cx={61} cy={63} rx={6} ry={3} fill="#74c7ff" opacity={0.1} transform="rotate(-30 61 63)" />

        <g clipPath={`url(#${uid}-barrel)`}>
          <Blades key={n} rho={rho} count={n} fill={`url(#${uid}-blade)`} />
        </g>

        {/* Anillo del barril con moleteado */}
        <path
          d={`M${C} ${C - 49} a49 49 0 1 0 0.001 0 Z M${C} ${C - BARREL_R} a${BARREL_R} ${BARREL_R} 0 1 1 -0.001 0 Z`}
          fill={`url(#${uid}-ring)`}
          fillRule="evenodd"
        />
        <circle cx={C} cy={C} r={BARREL_R} fill="none" stroke="#050607" strokeWidth={1.2} />
        <circle cx={C} cy={C} r={48.6} fill="none" stroke="var(--color-line-strong)" strokeWidth={0.8} />
        {Array.from({ length: 48 }, (_, i) => {
          const a = (i / 48) * 2 * Math.PI;
          return (
            <line
              key={i}
              x1={C + Math.cos(a) * 45.2}
              y1={C + Math.sin(a) * 45.2}
              x2={C + Math.cos(a) * 47.6}
              y2={C + Math.sin(a) * 47.6}
              stroke="#3d454c"
              strokeWidth={0.6}
            />
          );
        })}
      </svg>
      {showLabel && (
        <span className="osd text-sm font-medium text-fg" aria-hidden="true">
          {label}
        </span>
      )}
    </span>
  );
}
