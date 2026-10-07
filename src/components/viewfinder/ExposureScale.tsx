/**
 * Escala del exposímetro tal como aparece en la parte inferior del visor:
 * números en pasos enteros, muescas cada ⅓ de paso, barra desde 0 hasta la lectura
 * y un marcador ámbar. Si la lectura se sale de la escala aparece una flecha en el extremo.
 */
import { formatThirds } from '../../engine/scales';
import { cn } from '../../lib/cn';
import type { ExposureScaleProps } from './types';

const W = 132;
const PAD = 11;

/** Texto accesible de una lectura del exposímetro ("+⅔ EV", "±0 EV"). */
export function meterLabel(value: number): string {
  const v = Number.isFinite(value) ? Math.max(-99, Math.min(99, value)) : 0;
  const t = formatThirds(v);
  return `${t === '0' ? '±0' : t} EV`;
}

export function ExposureScale({ value, range = 3, compact = false, className }: ExposureScaleProps) {
  const span = range * 3;
  const raw = Number.isFinite(value) ? Math.round(value * 3) : value > 0 ? span + 1 : -span - 1;
  const thirds = Math.max(-span, Math.min(span, raw));
  const over = raw > span;
  const under = raw < -span;
  const step = (W - 2 * PAD) / (span * 2);
  const x = (t: number) => PAD + (t + span) * step;

  // Geometría según la variante
  const H = compact ? 18 : 30;
  const lineY = compact ? 4.5 : 13;
  const barY = lineY + 3.5;
  const markerTop = barY + 4.5;
  const markerBottom = markerTop + 5.5;
  const arrowY = (markerTop + markerBottom) / 2;

  const ticks = Array.from({ length: span * 2 + 1 }, (_, i) => i - span);
  const barFrom = Math.min(0, thirds);
  const barTo = Math.max(0, thirds);
  const centered = thirds === 0 && !over && !under;
  const label = `Exposímetro: ${meterLabel(value)}${over || under ? ' (fuera de escala)' : ''}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={label}
      className={cn('osd block h-auto w-full overflow-visible', className)}
    >
      <title>{label}</title>

      {/* Números en pasos enteros con signo en los extremos */}
      {!compact &&
        Array.from({ length: range * 2 + 1 }, (_, i) => i - range).map((k) => (
          <text
            key={k}
            x={x(k * 3)}
            y={7.5}
            textAnchor="middle"
            fontSize={7.5}
            fontWeight={500}
            fill={k === 0 && centered ? 'var(--color-data)' : 'currentColor'}
          >
            {k === 0 ? '0' : Math.abs(k)}
          </text>
        ))}
      <text x={PAD - 6.5} y={compact ? lineY + 2.6 : 7.5} textAnchor="middle" fontSize={compact ? 7 : 8} fill="currentColor">
        −
      </text>
      <text x={W - PAD + 6.5} y={compact ? lineY + 2.6 : 7.5} textAnchor="middle" fontSize={compact ? 7 : 8} fill="currentColor">
        +
      </text>

      {/* Línea base y muescas cada tercio */}
      <line x1={x(-span)} x2={x(span)} y1={lineY} y2={lineY} stroke="currentColor" strokeOpacity={0.55} strokeWidth={0.6} />
      {ticks.map((t) => {
        const major = t % 3 === 0;
        return (
          <line
            key={t}
            x1={x(t)}
            x2={x(t)}
            y1={major ? lineY - 2.6 : lineY - 1.2}
            y2={major ? lineY + 2.6 : lineY + 1.2}
            stroke={t === 0 && centered ? 'var(--color-data)' : 'currentColor'}
            strokeWidth={major ? 1 : 0.8}
          />
        );
      })}

      {/* Barra desde 0 hasta la lectura (un bloque por tercio, como en Nikon) */}
      {ticks
        .filter((t) => t !== 0 && t >= barFrom && t <= barTo)
        .map((t) => (
          <rect key={t} x={x(t) - step * 0.36} y={barY} width={step * 0.72} height={2.6} rx={0.4} fill="var(--color-amber)" />
        ))}

      {/* Marcador de la lectura */}
      <path
        d={`M${x(thirds)} ${markerTop} L${x(thirds) - 3.2} ${markerBottom} L${x(thirds) + 3.2} ${markerBottom} Z`}
        fill="var(--color-amber)"
      />

      {/* Fuera de escala: flecha parpadeante en el extremo */}
      {under && (
        <path
          className="blink"
          d={`M${PAD - 10} ${arrowY} L${PAD - 4} ${arrowY - 3.6} L${PAD - 4} ${arrowY + 3.6} Z`}
          fill="var(--color-amber)"
        />
      )}
      {over && (
        <path
          className="blink"
          d={`M${W - PAD + 10} ${arrowY} L${W - PAD + 4} ${arrowY - 3.6} L${W - PAD + 4} ${arrowY + 3.6} Z`}
          fill="var(--color-amber)"
        />
      )}
    </svg>
  );
}
