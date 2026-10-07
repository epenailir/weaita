/**
 * Consola bajo el visor: muestra el último acontecimiento (receta aplicada con su antes →
 * después, diagnóstico de la toma, resultado de un experimento) en una línea compacta.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Camera, FlaskConical, Info, RotateCcw, WandSparkles } from 'lucide-react';
import { cn } from '../../lib/cn';
import { PassIcon } from './bits';

export interface SettingDiff {
  label: string;
  from: string;
  to: string;
}

export interface CheckResult {
  id: string;
  label: string;
  goal: string;
  pass: boolean;
  value: string;
  fix: string;
}

export type ConsoleEvent =
  | { kind: 'intro'; text: string }
  | { kind: 'recipe'; id: number; partial: boolean; diffs: SettingDiff[]; next: string }
  | { kind: 'shot'; id: number; n: number; results: CheckResult[]; success: string; settingsKey: string }
  | { kind: 'experiment'; id: number; title: string; observed: string }
  | { kind: 'reset'; id: number; text: string };

function Header({ icon, title, aside }: { icon: ReactNode; title: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-fg">
        <span className="shrink-0 text-amber" aria-hidden="true">
          {icon}
        </span>
        <span className="truncate">{title}</span>
      </h3>
      {aside}
    </div>
  );
}

function ShotBody({ e, currentKey }: { e: Extract<ConsoleEvent, { kind: 'shot' }>; currentKey: string }) {
  const firstFail = e.results.find((r) => !r.pass);
  const [selected, setSelected] = useState<string | null>(firstFail?.id ?? null);
  const sel = e.results.find((r) => r.id === selected) ?? firstFail ?? null;
  const passed = e.results.filter((r) => r.pass).length;
  const all = passed === e.results.length;
  const stale = currentKey !== e.settingsKey;

  return (
    <>
      <Header
        icon={<Camera size={15} />}
        title={`Toma ${e.n} · ${passed} de ${e.results.length} criterios`}
        aside={stale ? <span className="shrink-0 text-[11px] text-faint">Cambiaste ajustes: vuelve a disparar</span> : undefined}
      />
      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Criterios de la toma">
        {e.results.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              aria-pressed={sel?.id === r.id}
              onClick={() => setSelected(r.id)}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 rounded-sm border px-2 text-[12px] transition-colors',
                sel?.id === r.id ? 'border-line-strong bg-raised text-fg' : 'border-line bg-panel-2 text-muted hover:text-fg',
              )}
            >
              <PassIcon pass={r.pass} size={13} />
              {r.label}
            </button>
          </li>
        ))}
      </ul>
      {all ? (
        <p className="mt-2 text-[12.5px] leading-snug text-data">{e.success}</p>
      ) : (
        sel && (
          <p className="mt-2 text-[12.5px] leading-snug text-muted">
            <span className="font-medium text-fg">{sel.label}:</span> <span className="osd text-fg">{sel.value}</span>{' '}
            <span className="text-faint">(meta: {sel.goal}).</span> {sel.pass ? 'Cumple.' : sel.fix}
          </p>
        )
      )}
    </>
  );
}

export function EventConsole({ event, currentKey }: { event: ConsoleEvent; currentKey: string }) {
  const reduced = useReducedMotion() ?? false;
  const key = event.kind === 'intro' ? `intro-${event.text}` : `${event.kind}-${event.id}`;

  return (
    <div className="min-h-[84px] rounded-lg border border-line bg-panel px-3.5 py-3" aria-live="polite" aria-atomic="false">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={key}
          initial={{ opacity: 0, y: reduced ? 0 : 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.1 : 0.18 }}
        >
          {event.kind === 'intro' && (
            <>
              <Header icon={<Info size={15} />} title="Cómo empezar" />
              <p className="mt-1.5 text-[12.5px] leading-snug text-muted">{event.text}</p>
            </>
          )}
          {event.kind === 'reset' && (
            <>
              <Header icon={<RotateCcw size={15} />} title="Cámara como salió del bolso" />
              <p className="mt-1.5 text-[12.5px] leading-snug text-muted">{event.text}</p>
            </>
          )}
          {event.kind === 'recipe' && (
            <>
              <Header
                icon={<WandSparkles size={15} />}
                title={event.partial ? 'Pasos dados aplicados' : 'Receta aplicada'}
                aside={<span className="shrink-0 text-[11px] text-faint">{event.diffs.length} cambios</span>}
              />
              <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Antes y después">
                {event.diffs.map((d, i) => (
                  <motion.li
                    key={d.label}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: reduced ? 0 : 0.05 + i * 0.04 }}
                    className="osd inline-flex h-6 items-center gap-1 rounded-sm border border-line bg-panel-2 px-1.5 text-[11.5px]"
                  >
                    <span className="mr-0.5 text-[11px] uppercase tracking-[0.08em] text-faint">
                      {d.label}
                      <span className="sr-only">:</span>
                    </span>
                    <span className="text-faint line-through decoration-faint/60">{d.from}</span>
                    <ArrowRight size={11} className="text-faint" aria-label="pasa a" />
                    <span className="text-amber">{d.to}</span>
                  </motion.li>
                ))}
              </ul>
              <p className="mt-2 text-[12.5px] leading-snug text-muted">{event.next}</p>
            </>
          )}
          {event.kind === 'shot' && <ShotBody key={event.id} e={event} currentKey={currentKey} />}
          {event.kind === 'experiment' && (
            <>
              <Header icon={<FlaskConical size={15} />} title={`Experimento: ${event.title}`} />
              <p className="mt-1.5 text-[12.5px] leading-snug text-muted">{event.observed}</p>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
