import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { CheckCircle2, MinusCircle } from 'lucide-react';
import { SENSORS } from '../../engine';
import type { SensorId } from '../../engine';
import { Segmented } from '../../components/ui';
import { progress } from '../../lib/progress';
import { cn } from '../../lib/cn';

const INTERACTIVE = 'button, input, select, textarea, a, summary, [role="slider"], [role="radio"], [role="switch"], [tabindex]';

/** Marca la lección como vista la primera vez que el usuario actúa sobre un control de la sección. */
function markOnInteraction(id: string) {
  return {
    onPointerDownCapture: (e: PointerEvent<HTMLElement>) => {
      if (e.target instanceof Element && e.target.closest(INTERACTIVE)) progress.mark('lessons', `lentes-${id}`);
    },
    onKeyDownCapture: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'Tab' || e.key === 'Shift' || e.key === 'Escape') return;
      if (e.target instanceof Element && e.target.closest(INTERACTIVE)) progress.mark('lessons', `lentes-${id}`);
    },
  };
}

export function LabSection({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} tabIndex={-1} aria-labelledby={`${id}-title`} className="scroll-mt-2 border-t border-line pt-10 focus:outline-none" {...markOnInteraction(id)}>
      <div className="eyebrow mb-2">{eyebrow}</div>
      <h2 id={`${id}-title`} className="text-xl font-semibold md:text-2xl">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted">{intro}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function BulletList({ items, tone }: { items: string[]; tone: 'data' | 'danger' | 'neutral' }) {
  const Icon = tone === 'danger' ? MinusCircle : CheckCircle2;
  return (
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2 text-[13.5px] leading-snug text-muted">
          <Icon
            size={15}
            className={cn('mt-0.5 shrink-0', tone === 'data' && 'text-data', tone === 'danger' && 'text-danger', tone === 'neutral' && 'text-faint')}
            aria-hidden="true"
          />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

/** Botonera de focales rápidas. Ninguna queda marcada si la focal continua no coincide. */
export function FocalChips({
  values,
  value,
  onChange,
  label = 'Focales habituales',
  className,
}: {
  values: readonly number[];
  value: number;
  onChange: (mm: number) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn('flex flex-wrap gap-1.5', className)}>
      {values.map((mm) => {
        const active = Math.round(value) === mm;
        return (
          <button
            key={mm}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(mm)}
            className={cn(
              'osd h-8 min-w-[3.25rem] rounded-sm border px-2 text-[12.5px] font-medium transition-colors duration-150',
              active ? 'border-amber/60 bg-amber-soft text-amber' : 'border-line bg-ink text-muted hover:border-line-strong hover:text-fg',
            )}
          >
            {mm}
            <span className="sr-only"> milímetros</span>
          </button>
        );
      })}
    </div>
  );
}

const SENSOR_SHORT: Record<SensorId, string> = {
  ff: 'Full frame',
  apsc: 'APS-C',
  'apsc-canon': 'APS-C Canon',
  mft: 'M4/3',
  'one-inch': '1"',
};

export function sensorShortName(id: SensorId): string {
  return SENSOR_SHORT[id];
}

export function SensorPicker({ value, onChange, className }: { value: SensorId; onChange: (id: SensorId) => void; className?: string }) {
  const ids = Object.keys(SENSORS) as SensorId[];
  return (
    <Segmented
      label="Sensor"
      size="sm"
      value={value}
      onChange={onChange}
      className={cn('[&_[role=radiogroup]]:flex-wrap', className)}
      options={ids.map((id) => ({ value: id, label: SENSOR_SHORT[id], ariaLabel: `${SENSORS[id].name}, factor de recorte ${SENSORS[id].crop}` }))}
    />
  );
}

/** Valor tabular pequeño para rejillas de lecturas. */
export function Readout({ label, value, hint, tone, className }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: 'amber' | 'data' | 'danger' | 'info'; className?: string }) {
  return (
    <div className={cn('min-w-0 rounded-md border border-line bg-ink/60 px-3 py-2.5', className)}>
      <div className="eyebrow mb-1 truncate">{label}</div>
      <div
        className={cn(
          'osd text-[15px] font-medium leading-tight',
          tone === 'amber' && 'text-amber',
          tone === 'data' && 'text-data',
          tone === 'danger' && 'text-danger',
          tone === 'info' && 'text-info',
          !tone && 'text-fg',
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-[11.5px] leading-snug text-faint">{hint}</div>}
    </div>
  );
}
