/**
 * "Por qué funciona": cada criterio con la explicación y los números de la receta (calculados
 * con el motor) junto a los de tu cámara, más las notas del instructor y los extras.
 */
import { Eye } from 'lucide-react';
import { Button, Callout, Panel } from '../../components/ui';
import type { Scenario } from '../../content/types';
import { cn } from '../../lib/cn';
import { PassIcon } from './bits';
import type { Check } from './checks';
import type { ShotContext } from './model';

export interface WhySectionProps {
  scenario: Scenario;
  checks: Check[];
  recipe: ShotContext;
  live: ShotContext;
  /** Mostrar la columna en vivo (en los niveles con menos ayuda se oculta hasta resolver). */
  showLive: boolean;
  revealed: boolean;
  onReveal: () => void;
}

export function WhySection({ scenario, checks, recipe, live, showLive, revealed, onReveal }: WhySectionProps) {
  return (
    <section aria-labelledby="sb-why-title" className="border-t border-line pt-8">
      <div className="eyebrow mb-2">Receta explicada con el motor</div>
      <h2 id="sb-why-title" className="text-xl font-semibold md:text-2xl">
        Por qué funciona
      </h2>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted">
        Cada criterio de la toma, con los números que calcula el motor para la receta{showLive ? ' y para tu cámara en este momento' : ''}.
      </p>

      {!revealed ? (
        <Callout kind="info" title="Oculto mientras resuelves" className="mt-6 max-w-3xl">
          <p>En «Solo el objetivo» la explicación se revela cuando logras la toma, para que no sea una receta disfrazada.</p>
          <Button size="sm" variant="ghost" className="-ml-2 mt-1" icon={<Eye size={14} aria-hidden="true" />} onClick={onReveal}>
            Mostrar igualmente
          </Button>
        </Callout>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <ul className="m-0 list-none self-start divide-y divide-line overflow-hidden rounded-lg border border-line bg-panel p-0">
            {checks.map((c) => {
              const r = c.evaluate(recipe);
              const now = c.evaluate(live);
              return (
                <li key={c.id} className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <h3 className="text-[14px] font-semibold text-fg">{c.label}</h3>
                      <span className="osd text-[11.5px] text-faint">{c.goal}</span>
                    </div>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{c.why(recipe)}</p>
                  </div>
                  <dl className={cn('m-0 grid gap-x-4 gap-y-2 text-[12.5px] sm:w-[230px]', showLive ? 'grid-cols-2' : 'grid-cols-1')}>
                    <div className="min-w-0">
                      <dt className="eyebrow mb-1">Receta</dt>
                      <dd className="osd m-0 flex items-start gap-1.5 text-fg">
                        <PassIcon pass={r.pass} size={13} className="mt-0.5" />
                        <span className="min-w-0 break-words">{r.value}</span>
                      </dd>
                    </div>
                    {showLive && (
                      <div className="min-w-0">
                        <dt className="eyebrow mb-1">Tu cámara</dt>
                        <dd className={cn('osd m-0 flex items-start gap-1.5', now.pass ? 'text-fg' : 'text-danger')}>
                          <PassIcon pass={now.pass} size={13} className="mt-0.5" />
                          <span className="min-w-0 break-words">{now.value}</span>
                        </dd>
                      </div>
                    )}
                  </dl>
                </li>
              );
            })}
          </ul>

          <div className="flex min-w-0 flex-col gap-4">
            <Panel eyebrow="Notas del instructor" title="La receta en palabras">
              <ul className="m-0 list-none space-y-2.5 p-0">
                {scenario.why.map((w) => (
                  <li key={w} className="relative pl-4 text-[13.5px] leading-relaxed text-muted before:absolute before:left-0 before:top-[0.6em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-amber/70">
                    {w}
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel eyebrow="Fuera de la cámara" title="Disparo y accesorios">
              <p className="text-[13.5px] leading-relaxed text-muted">
                <span className="text-fg">Disparo:</span> {scenario.recommended.drive}.
              </p>
              <ul className="m-0 mt-3 flex list-none flex-wrap gap-1.5 p-0">
                {scenario.recommended.extras.map((x) => (
                  <li key={x} className="rounded-sm border border-line bg-panel-2 px-2 py-1 text-[12.5px] leading-snug text-muted">
                    {x}
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      )}
    </section>
  );
}
