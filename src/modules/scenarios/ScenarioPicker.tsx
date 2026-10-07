/**
 * Selector de escenario: tarjetas con icono y tagline que actúan como pestañas (APG, activación
 * automática con flechas, Inicio y Fin). En móvil se desplazan en horizontal.
 */
import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Building2, CircleCheck, Mountain, MoonStar, Sunset, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Scenario, ScenarioId } from '../../content/types';
import { cn } from '../../lib/cn';

export const SCENARIO_ICONS: Record<ScenarioId, LucideIcon> = {
  'golden-hour-portrait': Sunset,
  'sports-action': Trophy,
  landscape: Mountain,
  astro: MoonStar,
  street: Building2,
};

export const tabId = (id: ScenarioId) => `sb-tab-${id}`;
export const PANEL_ID = 'sb-panel';

export interface ScenarioPickerProps {
  scenarios: Scenario[];
  value: ScenarioId;
  onChange: (id: ScenarioId) => void;
  explored: string[];
}

export function ScenarioPicker({ scenarios, value, onChange, explored }: ScenarioPickerProps) {
  const refs = useRef<Partial<Record<ScenarioId, HTMLButtonElement | null>>>({});

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = scenarios.findIndex((s) => s.id === value);
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % scenarios.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + scenarios.length) % scenarios.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = scenarios.length - 1;
    const target = next === null ? undefined : scenarios[next];
    if (!target) return;
    e.preventDefault();
    onChange(target.id);
    const el = refs.current[target.id];
    el?.focus();
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  return (
    <div
      role="tablist"
      aria-label="Escenarios"
      onKeyDown={onKeyDown}
      className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 xl:mx-0 xl:grid xl:grid-cols-5 xl:overflow-visible xl:px-0 xl:pb-0"
    >
      {scenarios.map((sc) => {
        const active = sc.id === value;
        const Icon = SCENARIO_ICONS[sc.id];
        const done = explored.includes(sc.id);
        return (
          <button
            key={sc.id}
            ref={(el) => {
              refs.current[sc.id] = el;
            }}
            id={tabId(sc.id)}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={PANEL_ID}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(sc.id)}
            className={cn(
              'group relative flex w-[236px] shrink-0 snap-start scroll-mx-4 flex-col rounded-lg border px-3.5 py-3 text-left transition-colors duration-150 xl:w-auto',
              active ? 'border-amber/45 bg-panel-2 shadow-[var(--shadow-raise)]' : 'border-line bg-panel hover:border-line-strong hover:bg-panel-2',
            )}
          >
            <span className="flex items-center gap-3">
              <span
                className={cn(
                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors',
                  active ? 'border-amber/40 bg-amber-soft text-amber' : 'border-line bg-ink text-muted group-hover:text-fg',
                )}
                aria-hidden="true"
              >
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1 text-[14px] font-semibold leading-tight text-fg">{sc.name}</span>
              {done && <CircleCheck size={14} className="shrink-0 text-data" role="img" aria-label="Explorado" />}
            </span>
            <span className="mt-2 block text-[12.5px] leading-snug text-muted">{sc.tagline}</span>
            {active && <span className="absolute inset-x-3.5 -bottom-px h-0.5 rounded-full bg-amber" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
