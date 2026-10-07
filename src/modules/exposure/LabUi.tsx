/**
 * Piezas de interfaz propias del laboratorio: el indicador de estado (forma + texto + color,
 * nunca solo color) y los interruptores compactos de los asistentes del visor.
 */
import { CircleCheck, CircleMinus, OctagonX, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { STATUS_WORD } from './assessment';
import type { Status } from './assessment';

export const STATUS_ICON: Record<Status, LucideIcon> = {
  good: CircleCheck,
  fair: TriangleAlert,
  bad: OctagonX,
  neutral: CircleMinus,
};

export const STATUS_TEXT_CLASS: Record<Status, string> = {
  good: 'text-data',
  fair: 'text-amber',
  bad: 'text-danger',
  neutral: 'text-faint',
};

export const STATUS_SOFT_CLASS: Record<Status, string> = {
  good: 'border-data/30 bg-data-soft',
  fair: 'border-amber/30 bg-amber-soft',
  bad: 'border-danger/35 bg-danger-soft',
  neutral: 'border-line bg-panel-2',
};

/** Icono de estado con forma distinta para cada nivel; con `label` también lo escribe. */
export function StatusGlyph({ status, size = 15, label = false, className }: { status: Status; size?: number; label?: boolean; className?: string }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1', STATUS_TEXT_CLASS[status], className)}>
      <Icon size={size} aria-hidden="true" strokeWidth={2.2} />
      {label ? (
        <span className="osd text-[10.5px] font-semibold uppercase tracking-wider">{STATUS_WORD[status]}</span>
      ) : (
        <span className="sr-only">{STATUS_WORD[status]}</span>
      )}
    </span>
  );
}

/** Interruptor compacto (role="switch") para la barra de asistentes del visor. */
export function ToggleChip({
  label,
  icon,
  checked,
  onChange,
  disabled,
  hint,
}: {
  label: string;
  icon: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  /** Motivo por el que está deshabilitado o qué hace (tooltip y descripción accesible). */
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={hint}
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex h-9 min-w-0 items-center gap-1.5 rounded-md border px-2 text-[12.5px] font-medium transition-colors duration-150',
        checked ? 'border-amber/50 bg-amber-soft text-fg' : 'border-line bg-panel-2 text-muted hover:border-line-strong hover:text-fg',
        disabled && 'cursor-not-allowed opacity-45 hover:border-line hover:text-muted',
      )}
    >
      <span className={cn('shrink-0', checked ? 'text-amber' : 'text-faint')} aria-hidden="true">
        {icon}
      </span>
      <span className="truncate">{label}</span>
      <span
        aria-hidden="true"
        className={cn('ml-0.5 h-1.5 w-1.5 shrink-0 rounded-full', checked ? 'bg-amber' : 'border border-line-strong bg-transparent')}
      />
      {hint && <span className="sr-only">. {hint}</span>}
    </button>
  );
}
