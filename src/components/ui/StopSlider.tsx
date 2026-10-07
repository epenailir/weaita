import { useCallback, useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface StopOption {
  label: string;
  /** Marca de paso completo: se dibuja una muesca más larga y su etiqueta. */
  major?: boolean;
}

export interface StopSliderProps {
  label: string;
  /** Valores discretos (p. ej. tercios de paso). */
  options: StopOption[];
  index: number;
  onChange: (index: number) => void;
  /** Texto accesible del valor actual (p. ej. "f/2.8" o "1/250 de segundo"). */
  valueText?: string;
  /** Valor mostrado grande a la derecha de la etiqueta. Por defecto, la etiqueta de la opción. */
  display?: ReactNode;
  /** El valor lo decide la cámara: el control se atenúa y muestra "AUTO". */
  auto?: boolean;
  disabled?: boolean;
  /** Etiquetas de los extremos (p. ej. "Más luz" / "Menos luz"). */
  hints?: [string, string];
  /** Cada cuántas opciones mayores se rotula una etiqueta bajo la regla. */
  labelEvery?: number;
  className?: string;
  /** Icono a la izquierda de la etiqueta. */
  icon?: ReactNode;
}

/**
 * Regla discreta estilo dial de cámara: arrastre con puntero, rueda del mouse,
 * flechas (±1), RePág/AvPág (±3 = un paso completo), Inicio/Fin.
 */
export function StopSlider({
  label,
  options,
  index,
  onChange,
  valueText,
  display,
  auto = false,
  disabled = false,
  hints,
  labelEvery = 1,
  className,
  icon,
}: StopSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const labelId = useId();
  const max = options.length - 1;
  const clamp = (i: number) => Math.max(0, Math.min(max, i));
  const pct = max > 0 ? (index / max) * 100 : 0;
  const inactive = disabled || auto;

  const fromPointer = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      const i = Math.round(x * max);
      if (i !== index) onChange(i);
    },
    [index, max, onChange],
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (inactive) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    fromPointer(e.clientX);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) fromPointer(e.clientX);
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (inactive) return;
    let next = index;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = index + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = index - 1;
        break;
      case 'PageUp':
        next = index + 3;
        break;
      case 'PageDown':
        next = index - 3;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = max;
        break;
      default:
        return;
    }
    e.preventDefault();
    const c = clamp(next);
    if (c !== index) onChange(c);
  };
  // Rueda del mouse: listener nativo no pasivo (React registra onWheel como pasivo y no
  // permite preventDefault). Solo actúa con el control enfocado para no secuestrar el scroll.
  const live = useRef({ index, max, onChange, inactive });
  live.current = { index, max, onChange, inactive };
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const { index: i, max: m, onChange: change, inactive: off } = live.current;
      if (off || document.activeElement !== el) return;
      const d = Math.sign(e.deltaY || e.deltaX);
      if (!d) return;
      e.preventDefault();
      const c = Math.max(0, Math.min(m, i - d));
      if (c !== i) change(c);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const current = options[index];
  let majorCount = 0;

  return (
    <div className={cn('select-none', className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span id={labelId} className="flex items-center gap-2 text-[13px] font-medium text-muted">
          {icon}
          {label}
          {auto && <span className="osd rounded-xs bg-amber-soft px-1.5 py-px text-[10px] font-semibold tracking-wider text-amber">AUTO</span>}
        </span>
        <span className={cn('osd text-lg font-medium', auto ? 'text-amber' : 'text-fg')} aria-hidden="true">
          {display ?? current?.label}
        </span>
      </div>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={index}
        aria-valuetext={valueText ?? current?.label}
        aria-disabled={inactive || undefined}
        aria-readonly={auto || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={cn(
          'relative h-11 touch-none rounded-md',
          inactive ? 'cursor-not-allowed opacity-60' : 'cursor-ew-resize',
        )}
      >
        {/* Muescas */}
        <div className="absolute inset-x-0 top-1 h-5">
          {options.map((o, i) => {
            const left = max > 0 ? (i / max) * 100 : 0;
            return (
              <span
                key={i}
                className={cn(
                  'absolute top-0 w-px -translate-x-1/2',
                  o.major ? 'h-4 bg-line-strong' : 'h-2.5 bg-line',
                  i === index && 'bg-amber',
                )}
                style={{ left: `${left}%` }}
              />
            );
          })}
        </div>
        {/* Índice */}
        <div
          className={cn(
            'pointer-events-none absolute top-0 h-6 w-[3px] -translate-x-1/2 rounded-full transition-[left] duration-150 ease-out',
            auto ? 'bg-amber/70' : 'bg-amber shadow-[0_0_12px_rgb(255_178_36/0.55)]',
          )}
          style={{ left: `${pct}%` }}
        />
        {/* Etiquetas de pasos completos */}
        <div className="absolute inset-x-0 bottom-0 h-4">
          {options.map((o, i) => {
            if (!o.major) return null;
            majorCount++;
            if ((majorCount - 1) % labelEvery !== 0) return null;
            const left = max > 0 ? (i / max) * 100 : 0;
            return (
              <span
                key={i}
                className={cn('osd absolute -translate-x-1/2 text-[10px] leading-none', i === index ? 'text-amber' : 'text-faint')}
                style={{ left: `${left}%` }}
              >
                {o.label}
              </span>
            );
          })}
        </div>
      </div>
      {hints && (
        <div className="mt-1 flex justify-between text-[11px] text-faint">
          <span>{hints[0]}</span>
          <span>{hints[1]}</span>
        </div>
      )}
    </div>
  );
}
