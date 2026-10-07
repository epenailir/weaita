/**
 * Tarjetas de conceptos erróneos: el mito, la realidad y un experimento que lo desmonta en el
 * visor con un antes y un después.
 */
import { FlaskConical } from 'lucide-react';
import { Button } from '../../components/ui';
import { SCENES } from '../../sim/scenes';
import { cn } from '../../lib/cn';
import type { SceneId } from '../../sim/types';
import { BeforeAfter } from './BeforeAfter';
import { MISCONCEPTIONS } from './experiments';
import type { Experiment } from './experiments';
import { markLesson } from './LessonDeck';
import type { ExperimentRun } from './useExperiment';

export function Misconceptions({
  run,
  currentScene,
  onRun,
  onRestore,
}: {
  run: ExperimentRun | null;
  currentScene: SceneId;
  onRun: (e: Experiment) => void;
  onRestore: () => void;
}) {
  const active = run ? (MISCONCEPTIONS.find((m) => m.experiment.id === run.id) ?? null) : null;
  return (
    <section aria-labelledby="mitos-title" className="mt-12">
      <div className="eyebrow mb-2">Conceptos erróneos</div>
      <h3 id="mitos-title" className="text-lg font-semibold text-fg md:text-xl">
        Tres ideas que parecen lógicas y son falsas
      </h3>
      <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-muted">Cada tarjeta trae un experimento: lo aplica en el visor y te muestra el antes y el después.</p>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {MISCONCEPTIONS.map((m) => {
          const exp = m.experiment;
          const mine = run !== null && run.id === exp.id;
          const target = exp.sceneId && exp.sceneId !== currentScene ? SCENES[exp.sceneId] : null;
          const busy = mine && run.phase !== 'done';
          return (
            <article
              key={m.id}
              aria-labelledby={`mito-${m.id}`}
              className={cn('flex min-w-0 flex-col rounded-lg border bg-panel p-4 sm:p-5', mine ? 'border-amber/40' : 'border-line')}
            >
              <span className="osd self-start rounded-xs border border-danger/40 bg-danger-soft px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-danger">Mito</span>
              <p id={`mito-${m.id}`} className="mt-2 text-[15px] font-medium leading-snug text-fg">
                «{m.myth}»
              </p>
              <span className="osd mt-4 self-start rounded-xs border border-data/40 bg-data-soft px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-data">Realidad</span>
              <p className="mt-2 text-[14px] font-medium leading-snug text-fg">{m.reality}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{m.detail}</p>
              <div className="mt-auto pt-4">
                <Button
                  size="sm"
                  variant={mine ? 'ghost' : 'secondary'}
                  disabled={busy}
                  aria-controls="mito-resultado"
                  icon={<FlaskConical size={14} aria-hidden="true" />}
                  onClick={() => {
                    onRun(exp);
                    markLesson(`mito-${m.id}`);
                  }}
                >
                  {mine ? 'Repetir el experimento' : target ? `Demuéstralo en «${target.name}»` : 'Demuéstralo en el visor'}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      <div id="mito-resultado">
        {active && run && (
          <div className="mt-4 rounded-lg border border-line bg-panel p-4 sm:p-5">
            <div className="eyebrow mb-1">Experimento</div>
            <p className="text-[14px] font-medium text-fg">«{active.myth}» — {active.reality}</p>
            <div className="mx-auto max-w-3xl">
              <BeforeAfter run={run} captions={active.experiment.captions} histogram={active.experiment.histogram} onRestore={onRestore} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
