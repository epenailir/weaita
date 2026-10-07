import { useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface RangeSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Escala logarítmica (útil para distancias y Kelvin). */
  log?: boolean;
  format?: (value: number) => string;
  hints?: [string, string];
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
  /** Degradado de fondo de la pista (p. ej. temperatura de color). */
  trackBackground?: string;
}

const RES = 1000;

/** Slider continuo accesible basado en <input type="range"> con estilo de visor. */
export function RangeSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  log = false,
  format = (v) => v.toFixed(1),
  hints,
  disabled,
  icon,
  className,
  trackBackground,
}: RangeSliderProps) {
  const id = useId();
  const toPos = (v: number) =>
    log ? (Math.log(v / min) / Math.log(max / min)) * RES : ((v - min) / (max - min)) * RES;
  const fromPos = (p: number) => {
    const x = p / RES;
    const v = log ? min * Math.pow(max / min, x) : min + x * (max - min);
    if (!step) return v;
    return Math.round(v / step) * step;
  };
  const pos = Math.max(0, Math.min(RES, toPos(value)));

  return (
    <div className={cn('select-none', className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="flex items-center gap-2 text-[13px] font-medium text-muted">
          {icon}
          {label}
        </label>
        <span className="osd text-lg font-medium text-fg">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={RES}
        step={1}
        value={pos}
        disabled={disabled}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(fromPos(Number(e.target.value)))}
        className="range-osd w-full"
        style={{
          ['--pos' as string]: `${(pos / RES) * 100}%`,
          ['--track' as string]: trackBackground ?? 'var(--color-line-strong)',
        }}
      />
      {hints && (
        <div className="mt-1 flex justify-between text-[11px] text-faint">
          <span>{hints[0]}</span>
          <span>{hints[1]}</span>
        </div>
      )}
    </div>
  );
}
