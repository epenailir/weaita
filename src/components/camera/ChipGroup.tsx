/**
 * Grupo de opciones exclusivas en forma de fichas que se reparten en varias líneas
 * (radiogroup con foco itinerante). Pensado para listas largas que no caben en un Segmented:
 * preajustes de balance de blancos, formatos de sensor…
 */
import { useId, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface ChipOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Texto accesible cuando `label` no basta (p. ej. incluye un icono o una abreviatura). */
  ariaLabel?: string;
  icon?: ReactNode;
  /** Texto secundario pequeño bajo la etiqueta. */
  detail?: ReactNode;
  disabled?: boolean;
}

export interface ChipGroupProps<T extends string> {
  label: string;
  hideLabel?: boolean;
  options: Array<ChipOption<T>>;
  /** null cuando ningún valor coincide (p. ej. un Kelvin personalizado). */
  value: T | null;
  onChange: (value: T) => void;
  /** Número de columnas fijo; por defecto las fichas fluyen según su ancho. */
  columns?: number;
  className?: string;
}

export function ChipGroup<T extends string>({ label, hideLabel, options, value, onChange, columns, className }: ChipGroupProps<T>) {
  const id = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const enabled = options.filter((o) => !o.disabled);
  // Foco itinerante: la ficha elegida, o la primera habilitada si no hay ninguna elegida
  const selectedIdx = options.findIndex((o) => o.value === value && !o.disabled);
  const tabStop = selectedIdx >= 0 ? selectedIdx : options.findIndex((o) => !o.disabled);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!dir || enabled.length === 0) return;
    e.preventDefault();
    const cur = enabled.findIndex((o) => o.value === value);
    const nextIdx = cur < 0 ? (dir > 0 ? 0 : enabled.length - 1) : (cur + dir + enabled.length) % enabled.length;
    const next = enabled[nextIdx];
    if (!next) return;
    onChange(next.value);
    refs.current[options.indexOf(next)]?.focus();
  };

  return (
    <div className={className}>
      <div id={id} className={cn('mb-2 text-[13px] font-medium text-muted', hideLabel && 'sr-only')}>
        {label}
      </div>
      <div
        role="radiogroup"
        aria-labelledby={id}
        onKeyDown={onKeyDown}
        className={cn('gap-1.5', columns ? 'grid' : 'flex flex-wrap')}
        style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      >
        {options.map((o, i) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={o.ariaLabel}
              tabIndex={i === tabStop ? 0 : -1}
              disabled={o.disabled}
              onClick={() => onChange(o.value)}
              className={cn(
                'inline-flex min-h-9 min-w-0 items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors duration-150',
                active
                  ? 'border-amber/60 bg-amber-soft text-fg'
                  : 'border-line bg-ink text-muted hover:border-line-strong hover:text-fg',
                o.disabled && 'cursor-not-allowed opacity-40',
              )}
            >
              {o.icon && <span className={cn('shrink-0', active ? 'text-amber' : 'text-faint')}>{o.icon}</span>}
              <span className="min-w-0">
                <span className="block truncate">{o.label}</span>
                {o.detail && <span className="osd block text-[10.5px] font-normal leading-tight text-faint">{o.detail}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
