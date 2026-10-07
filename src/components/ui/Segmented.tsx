import { useId, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Texto accesible si `label` no es texto plano. */
  ariaLabel?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedProps<T extends string> {
  label: string;
  /** Oculta visualmente la etiqueta (sigue disponible para lectores de pantalla). */
  hideLabel?: boolean;
  options: Array<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  /** Ocupa todo el ancho repartiendo los segmentos. */
  stretch?: boolean;
}

/** Grupo de opciones exclusivas (radiogroup) con navegación por flechas. */
export function Segmented<T extends string>({
  label,
  hideLabel,
  options,
  value,
  onChange,
  size = 'md',
  className,
  stretch,
}: SegmentedProps<T>) {
  const id = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const enabled = options.filter((o) => !o.disabled);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const i = enabled.findIndex((o) => o.value === value);
    const next = enabled[(i + dir + enabled.length) % enabled.length];
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
        className={cn('inline-flex gap-1 rounded-md border border-line bg-ink p-1', stretch && 'flex w-full')}
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
              tabIndex={active ? 0 : -1}
              disabled={o.disabled}
              onClick={() => onChange(o.value)}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 rounded-sm font-medium transition-colors duration-150',
                size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-9 px-3.5 text-[13px]',
                stretch && 'flex-1',
                active
                  ? 'bg-raised text-fg shadow-[inset_0_0_0_1px_var(--color-line-strong)]'
                  : 'text-muted hover:bg-panel-2 hover:text-fg',
                o.disabled && 'cursor-not-allowed opacity-40',
              )}
            >
              {o.icon}
              {o.label}
              {active && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-amber" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
