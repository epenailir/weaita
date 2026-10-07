import { useState } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { APERTURES, ISOS, SHUTTERS, exposureOffset, formatAperture, formatEV, formatIso, formatShutter, stopAt } from '../../engine';
import { cn } from '../../lib/cn';

/** Escena de referencia: sol pleno (EV 15) con la regla del sol 16 como punto de partida. */
const SCENE_EV = 15;
const START = { a: 21, t: 15, i: 0 }; // f/16 · 1/125 · ISO 100 en índices de tercio

type Side = 'a' | 't' | 'i';

const SIDES: Record<Side, { label: string; effect: string; cost: string }> = {
  a: { label: 'Apertura', effect: 'Profundidad de campo', cost: 'Abrir desenfoca el fondo' },
  t: { label: 'Velocidad', effect: 'Movimiento', cost: 'Alargar barre lo que se mueve' },
  i: { label: 'ISO', effect: 'Ganancia', cost: 'Subir añade ruido' },
};

/**
 * Triángulo de exposición interactivo: cada lado suma o resta pasos completos de luz.
 * El centro muestra el exposímetro: el objetivo es volver a ±0 compensando con otro lado.
 */
export function TriangleHero() {
  const [idx, setIdx] = useState(START);
  const a = stopAt(APERTURES, idx.a).value;
  const t = stopAt(SHUTTERS, idx.t).value;
  const iso = stopAt(ISOS, idx.i).value;
  const offset = exposureOffset(SCENE_EV, a, t, iso);
  const ok = Math.abs(offset) < 0.34;

  // "Más luz" significa abrir (índice menor), alargar (índice mayor) o subir ISO (índice mayor)
  const change = (side: Side, moreLight: boolean) => {
    setIdx((p) => {
      const step = 3;
      if (side === 'a') return { ...p, a: Math.max(0, Math.min(APERTURES.length - 1, p.a + (moreLight ? -step : step))) };
      if (side === 't') return { ...p, t: Math.max(0, Math.min(SHUTTERS.length - 1, p.t + (moreLight ? step : -step))) };
      return { ...p, i: Math.max(0, Math.min(ISOS.length - 1, p.i + (moreLight ? step : -step))) };
    });
  };

  const values: Record<Side, string> = { a: formatAperture(a), t: formatShutter(t), i: `ISO ${formatIso(iso)}` };
  const pos: Record<Side, string> = {
    a: 'left-1/2 top-0 -translate-x-1/2',
    t: 'left-0 bottom-0',
    i: 'right-0 bottom-0',
  };
  const clamped = Math.max(-3, Math.min(3, offset));

  return (
    <div className="relative mx-auto aspect-[1.08] w-full max-w-[460px]" role="group" aria-label="Triángulo de exposición interactivo">
      <svg viewBox="0 0 400 370" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="tri-edge" x1="0" x2="1">
            <stop offset="0" stopColor="var(--color-line-strong)" />
            <stop offset="1" stopColor="var(--color-faint)" />
          </linearGradient>
        </defs>
        <polygon points="200,58 52,300 348,300" fill="none" stroke="url(#tri-edge)" strokeWidth="1.5" />
        <polygon points="200,92 84,282 316,282" fill="var(--color-panel)" opacity="0.6" stroke="var(--color-line)" />
        {/* Escala del exposímetro en el centro */}
        <g transform="translate(200 214)">
          {Array.from({ length: 19 }, (_, k) => {
            const v = -3 + k / 3;
            const x = v * 26;
            const major = k % 3 === 0;
            return <line key={k} x1={x} y1={major ? -9 : -5} x2={x} y2="0" stroke={major ? 'var(--color-muted)' : 'var(--color-line-strong)'} strokeWidth="1.2" />;
          })}
          {[-3, -2, -1, 0, 1, 2, 3].map((v) => (
            <text key={v} x={v * 26} y="16" textAnchor="middle" fontSize="10" className="osd" fill="var(--color-faint)">
              {v === 0 ? '0' : v > 0 ? `+${v}` : `−${-v}`}
            </text>
          ))}
          <path
            d="M0 -12 L-6 -22 L6 -22 Z"
            transform={`translate(${clamped * 26} 0)`}
            fill={ok ? 'var(--color-data)' : 'var(--color-amber)'}
            style={{ transition: 'transform 250ms var(--ease-out-quart)' }}
          />
        </g>
      </svg>

      <div className="absolute inset-x-0 top-[44%] text-center">
        <div className={cn('osd text-3xl font-semibold transition-colors', ok ? 'text-data' : 'text-amber')}>{formatEV(offset)} EV</div>
        <div className="mt-1 text-xs text-muted">{ok ? 'Exposición correcta' : offset > 0 ? 'Sobreexpuesta: sobra luz' : 'Subexpuesta: falta luz'}</div>
      </div>

      {(Object.keys(SIDES) as Side[]).map((side) => (
        <div key={side} className={cn('absolute w-[148px] rounded-lg border border-line bg-panel-2/95 p-2.5 shadow-[var(--shadow-raise)]', pos[side])}>
          <div className="eyebrow !text-[10px]">{SIDES[side].label}</div>
          <div className="osd text-[17px] font-medium text-fg">{values[side]}</div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => change(side, false)}
              aria-label={`${SIDES[side].label}: un paso menos de luz`}
              className="flex h-7 w-7 items-center justify-center rounded-sm border border-line-strong text-muted hover:border-amber hover:text-amber"
            >
              <Minus size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => change(side, true)}
              aria-label={`${SIDES[side].label}: un paso más de luz`}
              className="flex h-7 w-7 items-center justify-center rounded-sm border border-line-strong text-muted hover:border-amber hover:text-amber"
            >
              <Plus size={14} aria-hidden="true" />
            </button>
            <span className="ml-0.5 text-[10.5px] leading-tight text-faint">{SIDES[side].cost}</span>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setIdx(START)}
        className="absolute left-1/2 top-[63%] inline-flex -translate-x-1/2 items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] text-faint hover:text-fg"
      >
        <RotateCcw size={12} aria-hidden="true" /> Volver a la regla del sol 16
      </button>
      <p className="sr-only" aria-live="polite">
        {values.a}, {values.t}, {values.i}. Exposímetro {formatEV(offset)}.
      </p>
    </div>
  );
}
