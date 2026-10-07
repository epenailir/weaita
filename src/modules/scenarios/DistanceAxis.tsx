/**
 * Escala de distancias logarítmica (como la de un anillo de enfoque) con la zona nítida,
 * el punto de enfoque, la hiperfocal y los objetos de la escena marcados encima.
 */
import { formatDistance } from '../../engine';
import { cn } from '../../lib/cn';
import { isInfinity } from './model';

export interface ScaleRange {
  min: number;
  max: number;
  /** Fracción del recorrido donde termina el tramo logarítmico; el resto converge a ∞. */
  infStart: number;
}

export const LANDSCAPE_RANGE: ScaleRange = { min: 0.5, max: 100, infStart: 0.9 };

/** Distancia (m) → posición 0–1 en la escala. */
export function distanceToU(m: number, r: ScaleRange): number {
  if (!Number.isFinite(m) || isInfinity(m)) return 1;
  if (m <= r.min) return 0;
  if (m <= r.max) return (Math.log(m / r.min) / Math.log(r.max / r.min)) * r.infStart;
  return r.infStart + (1 - r.infStart) * (1 - r.max / m);
}

/** Posición 0–1 → distancia (m); el extremo es infinito. */
export function uToDistance(u: number, r: ScaleRange): number {
  if (u >= 0.995) return Infinity;
  if (u <= 0) return r.min;
  if (u <= r.infStart) return r.min * Math.pow(r.max / r.min, u / r.infStart);
  return r.max / (1 - (u - r.infStart) / (1 - r.infStart));
}

/** Etiqueta corta de una distancia en la escala ("0.5", "3", "∞"). */
export function tickLabel(m: number): string {
  if (!Number.isFinite(m)) return '∞';
  return m < 1 ? String(m) : String(Math.round(m * 10) / 10);
}

export interface AxisMarker {
  id: string;
  /** Número o letra que se dibuja en el marcador (la leyenda va fuera del SVG). */
  tag: string;
  distanceM: number;
  inside: boolean;
}

export interface DistanceAxisProps {
  near: number;
  far: number;
  focus: number;
  hyperfocal?: number;
  markers?: AxisMarker[];
  /** Zona objetivo (p. ej. 2–7 m en street). */
  target?: [number, number];
  ticks?: number[];
  range?: ScaleRange;
  label: string;
  className?: string;
}

const W = 340;
const X0 = 16;
const X1 = W - 16;
const AXIS_Y = 46;

export function DistanceAxis({
  near,
  far,
  focus,
  hyperfocal,
  markers = [],
  target,
  ticks = [0.5, 1, 2, 3, 5, 10, 20, 50, Infinity],
  range = LANDSCAPE_RANGE,
  label,
  className,
}: DistanceAxisProps) {
  const x = (m: number) => X0 + distanceToU(m, range) * (X1 - X0);
  const xn = x(near);
  const xf = x(far);
  const xFocus = x(focus);
  const xH = hyperfocal !== undefined ? x(hyperfocal) : null;
  const focusOnH = xH !== null && Math.abs(xH - xFocus) < 9;
  const clampLabel = (v: number) => Math.min(X1 - 34, Math.max(X0 + 34, v));
  const height = target ? 104 : 88;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label} className={cn('block h-auto w-full overflow-visible', className)}>
      {/* Zona nítida */}
      <rect x={xn} y={AXIS_Y - 11} width={Math.max(2, xf - xn)} height={22} rx={3} fill="var(--color-amber-soft)" stroke="var(--color-amber)" strokeOpacity={0.55} />
      {xf - xn > 74 && (
        <text x={(xn + xf) / 2} y={AXIS_Y - 15} textAnchor="middle" className="osd" fontSize={9} fill="var(--color-amber)">
          ZONA NÍTIDA
        </text>
      )}

      {/* Eje y marcas */}
      <line x1={X0} x2={X1} y1={AXIS_Y} y2={AXIS_Y} stroke="var(--color-line-strong)" strokeWidth={1.5} />
      {ticks.map((t) => (
        <g key={String(t)}>
          <line x1={x(t)} x2={x(t)} y1={AXIS_Y + 11} y2={AXIS_Y + 16} stroke="var(--color-faint)" strokeWidth={1} />
          <text x={x(t)} y={AXIS_Y + 27} textAnchor="middle" className="osd" fontSize={10} fill="var(--color-muted)">
            {tickLabel(t)}
          </text>
        </g>
      ))}
      <text x={X1} y={AXIS_Y + 39} textAnchor="end" className="osd" fontSize={8.5} fill="var(--color-faint)">
        metros
      </text>

      {/* Hiperfocal */}
      {xH !== null && (
        <g>
          <line x1={xH} x2={xH} y1={AXIS_Y - 20} y2={AXIS_Y + 12} stroke="var(--color-info)" strokeWidth={1.2} strokeDasharray="3 2" />
          {!focusOnH && (
            <text x={xH} y={AXIS_Y - 23} textAnchor="middle" className="osd" fontSize={9.5} fontWeight={600} fill="var(--color-info)">
              H
            </text>
          )}
        </g>
      )}

      {/* Punto de enfoque */}
      <path d={`M${xFocus - 5} ${AXIS_Y - 30} L${xFocus + 5} ${AXIS_Y - 30} L${xFocus} ${AXIS_Y - 22} Z`} fill="var(--color-amber)" />
      <text x={clampLabel(xFocus)} y={AXIS_Y - 34} textAnchor="middle" className="osd" fontSize={9.5} fill="var(--color-fg)">
        {focusOnH ? `Enfoque = H · ${formatDistance(focus)}` : `Enfoque ${formatDistance(focus)}`}
      </text>

      {/* Objetos de la escena */}
      {markers.map((mk) => (
        <g key={mk.id}>
          <circle
            cx={x(mk.distanceM)}
            cy={AXIS_Y}
            r={6.5}
            fill={mk.inside ? 'var(--color-data)' : 'var(--color-danger)'}
            stroke="var(--color-ink)"
            strokeWidth={1.5}
          />
          <text x={x(mk.distanceM)} y={AXIS_Y + 3.2} textAnchor="middle" className="osd" fontSize={8.5} fontWeight={700} fill="var(--color-ink)">
            {mk.tag}
          </text>
        </g>
      ))}

      {/* Zona objetivo */}
      {target && (
        <g>
          <path
            d={`M${x(target[0])} ${height - 12} v6 H${x(target[1])} v-6`}
            fill="none"
            stroke="var(--color-data)"
            strokeWidth={1.4}
            strokeDasharray="4 2"
          />
          <text x={(x(target[0]) + x(target[1])) / 2} y={height - 1} textAnchor="middle" className="osd" fontSize={9} fill="var(--color-data)">
            OBJETIVO {tickLabel(target[0])}–{tickLabel(target[1])} m
          </text>
        </g>
      )}
    </svg>
  );
}
