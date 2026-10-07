/** Piezas pequeñas compartidas por las herramientas y paneles del sandbox. */
import type { ReactNode } from 'react';
import { CircleCheck, CircleX } from 'lucide-react';
import { cn } from '../../lib/cn';

/** Bloque de herramienta con el mismo lenguaje que las fichas del menú rápido. */
export function ToolBlock({ title, aside, children, className }: { title: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('min-w-0 rounded-md border border-line bg-panel-2 p-3.5', className)}>
      <header className="mb-3 flex items-center justify-between gap-3">
        <h4 className="eyebrow min-w-0 truncate !text-muted">{title}</h4>
        {aside && <span className="osd shrink-0 text-[12.5px] text-amber">{aside}</span>}
      </header>
      {children}
    </section>
  );
}

/** Fila etiqueta–valor en tipografía de visor. */
export function Readout({ label, value, tone, hint }: { label: ReactNode; value: ReactNode; tone?: 'data' | 'danger' | 'amber' | 'info'; hint?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="min-w-0 text-[12.5px] text-muted">{label}</dt>
      <dd
        className={cn(
          'osd m-0 shrink-0 text-right text-[13px]',
          tone === 'data' && 'text-data',
          tone === 'danger' && 'text-danger',
          tone === 'amber' && 'text-amber',
          tone === 'info' && 'text-info',
          !tone && 'text-fg',
        )}
      >
        {value}
        {hint && <span className="ml-1 text-[11px] text-faint">{hint}</span>}
      </dd>
    </div>
  );
}

/** Icono de cumple / no cumple (con texto accesible: nunca solo color). */
export function PassIcon({ pass, size = 15, className }: { pass: boolean; size?: number; className?: string }) {
  const Icon = pass ? CircleCheck : CircleX;
  return (
    <Icon
      size={size}
      role="img"
      aria-label={pass ? 'Cumple' : 'No cumple'}
      className={cn('shrink-0', pass ? 'text-data' : 'text-danger', className)}
    />
  );
}

/** Nota pequeña al pie de una herramienta. */
export function ToolNote({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('mt-2.5 text-xs leading-relaxed text-faint', className)}>{children}</p>;
}
