/**
 * "Rompe la receta": tarjetas de experimento con una pregunta para predecir, un botón para
 * probar y, después, lo observado y el porqué con los números del motor.
 */
import { CircleCheck, FlaskConical, Undo2 } from 'lucide-react';
import { Button } from '../../components/ui';
import { cn } from '../../lib/cn';
import type { Experiment, ExperimentResult } from './experiments';

export interface ExperimentListProps {
  experiments: Experiment[];
  activeId: string | null;
  results: Record<string, ExperimentResult>;
  busy: boolean;
  onRun: (exp: Experiment) => void;
  onBack: () => void;
}

export function ExperimentList({ experiments, activeId, results, busy, onRun, onBack }: ExperimentListProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12.5px] leading-relaxed text-muted">
        Cada experimento parte de la receta y cambia una sola idea. Antes de probar, responde la pregunta en voz alta; luego compara la toma A (receta) con la
        B (experimento) arrastrando el divisor del visor.
      </p>
      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {experiments.map((exp, i) => {
          const active = exp.id === activeId;
          const res = results[exp.id];
          return (
            <li
              key={exp.id}
              className={cn('rounded-md border p-3.5 transition-colors', active ? 'border-amber/50 bg-amber-soft' : 'border-line bg-panel-2')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="osd text-[10.5px] text-faint">Experimento {i + 1}</div>
                  <h4 className="mt-0.5 text-[14px] font-semibold text-fg">{exp.title}</h4>
                  <p className="mt-0.5 text-[12px] text-muted">{exp.change}</p>
                </div>
                {res && !active && <CircleCheck size={16} className="mt-1 shrink-0 text-data" aria-label="Probado" />}
              </div>
              <p className="mt-2.5 text-[12.5px] leading-snug text-fg">
                <span className="eyebrow mr-1.5 !text-amber">Predice</span>
                {exp.question}
              </p>
              {active && res ? (
                <div className="mt-3 space-y-2 border-t border-amber/20 pt-3">
                  <p className="text-[12.5px] leading-relaxed text-muted">
                    <span className="eyebrow mr-1.5 !text-fg">Observa</span>
                    {res.observed}
                  </p>
                  <p className="text-[12.5px] leading-relaxed text-muted">
                    <span className="eyebrow mr-1.5 !text-fg">Por qué</span>
                    {res.why}
                  </p>
                  <Button size="sm" variant="ghost" className="-ml-2" icon={<Undo2 size={14} aria-hidden="true" />} onClick={onBack}>
                    Volver a la receta
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant={res ? 'ghost' : 'secondary'}
                  className={cn('mt-3', res && 'border border-line')}
                  icon={<FlaskConical size={14} aria-hidden="true" />}
                  onClick={() => onRun(exp)}
                  disabled={busy}
                >
                  {res ? 'Repetir' : 'Probar'}
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
