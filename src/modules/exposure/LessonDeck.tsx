/**
 * Teoría vinculada: las lecciones de exposición como pestañas compactas (resumen, puntos clave,
 * errores comunes y explicación completa) con una pregunta "Predice" que se comprueba en el
 * visor antes de revelar la explicación. La lección relacionada con el último control tocado
 * se destaca en la pestaña.
 */
import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { BookOpen, CheckCircle2, ChevronDown, FlaskConical, MinusCircle, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import { Button } from '../../components/ui';
import { EXPOSURE_LESSONS } from '../../content/lessons';
import type { Lesson } from '../../content/types';
import { SCENES } from '../../sim/scenes';
import type { SceneId } from '../../sim/types';
import { progress } from '../../lib/progress';
import { cn } from '../../lib/cn';
import { BeforeAfter } from './BeforeAfter';
import { predictionFor } from './experiments';
import type { Experiment, Prediction } from './experiments';
import type { ExperimentRun } from './useExperiment';

/** Título corto para la pestaña ("Apertura: el tamaño de la ventana" → "Apertura"). */
export function shortTitle(l: Lesson): string {
  return l.title.split(':')[0]!.trim();
}

export function markLesson(id: string): void {
  progress.mark('lessons', `exposicion-${id}`);
}

interface PredictState {
  chosen: number | null;
  checked: boolean;
}

function PredictCard({
  prediction,
  state,
  onState,
  run,
  currentScene,
  onRun,
  onRestore,
}: {
  prediction: Prediction;
  state: PredictState;
  onState: (s: PredictState) => void;
  run: ExperimentRun | null;
  currentScene: SceneId;
  onRun: (e: Experiment) => void;
  onRestore: () => void;
}) {
  const name = useId();
  const exp = prediction.experiment;
  const targetScene = exp.sceneId && exp.sceneId !== currentScene ? SCENES[exp.sceneId] : null;
  const correct = state.chosen === prediction.correctIndex;
  const running = run !== null && run.id === exp.id && run.phase !== 'done';

  return (
    <div className="rounded-lg border border-amber/25 bg-panel-2 p-4 sm:p-5">
      <div className="eyebrow mb-2 flex items-center gap-1.5 !text-amber">
        <Sparkles size={13} aria-hidden="true" />
        Predice antes de mirar
      </div>
      <fieldset disabled={state.checked} className="m-0 min-w-0 border-0 p-0">
        <legend className="mb-3 text-[14.5px] font-medium leading-snug text-fg">{prediction.question}</legend>
        <div className="space-y-2">
          {prediction.options.map((opt, i) => {
            const selected = state.chosen === i;
            const showRight = state.checked && i === prediction.correctIndex;
            const showWrong = state.checked && selected && !correct;
            return (
              <label
                key={opt}
                className={cn(
                  'flex min-h-11 cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 text-[13.5px] leading-snug transition-colors duration-150',
                  showRight
                    ? 'border-data/50 bg-data-soft text-fg'
                    : showWrong
                      ? 'border-danger/45 bg-danger-soft text-fg'
                      : selected
                        ? 'border-amber/60 bg-amber-soft text-fg'
                        : 'border-line bg-ink text-muted hover:border-line-strong hover:text-fg',
                  state.checked && 'cursor-default',
                )}
              >
                <input
                  type="radio"
                  name={name}
                  checked={selected}
                  onChange={() => onState({ ...state, chosen: i })}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-amber"
                />
                <span className="min-w-0 flex-1">{opt}</span>
                {showRight && (
                  <>
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-data" aria-hidden="true" />
                    <span className="sr-only">(respuesta correcta)</span>
                  </>
                )}
                {showWrong && (
                  <>
                    <XCircle size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
                    <span className="sr-only">(tu respuesta, incorrecta)</span>
                  </>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      {!state.checked ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            disabled={state.chosen === null}
            icon={<FlaskConical size={14} aria-hidden="true" />}
            onClick={() => {
              onState({ ...state, checked: true });
              onRun(exp);
            }}
          >
            {targetScene ? `Comprobar en «${targetScene.name}»` : 'Comprobar en el visor'}
          </Button>
          <span className="text-[12px] text-faint">
            {state.chosen === null ? 'Elige una opción para comprobarla.' : 'Se aplicará el ajuste y verás el antes y el después.'}
          </span>
        </div>
      ) : (
        <div className="mt-4" role="status">
          <p className={cn('flex items-center gap-2 text-[14px] font-semibold', correct ? 'text-data' : 'text-amber')}>
            {correct ? <CheckCircle2 size={16} aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}
            {correct ? '¡Bien predicho!' : `No era esa: la respuesta es «${prediction.options[prediction.correctIndex]}».`}
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{prediction.explanation}</p>
        </div>
      )}

      {state.checked && run && run.id === exp.id && (
        <BeforeAfter run={run} captions={exp.captions} histogram={exp.histogram} onRestore={onRestore} />
      )}

      {state.checked && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" icon={<RotateCcw size={14} aria-hidden="true" />} onClick={() => onState({ chosen: null, checked: false })} disabled={running}>
            Volver a predecir
          </Button>
        </div>
      )}
    </div>
  );
}

function FactList({ items, tone }: { items: string[]; tone: 'data' | 'danger' }) {
  const Icon = tone === 'data' ? CheckCircle2 : MinusCircle;
  return (
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2 text-[13px] leading-snug text-muted">
          <Icon size={14} className={cn('mt-0.5 shrink-0', tone === 'data' ? 'text-data' : 'text-danger')} aria-hidden="true" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export interface LessonDeckProps {
  selectedId: string;
  onSelect: (id: string) => void;
  relevantId: string | null;
  /** Nombre del control que hace relevante la lección ("la apertura"). */
  relevantReason: string | null;
  run: ExperimentRun | null;
  currentScene: SceneId;
  onRun: (e: Experiment) => void;
  onRestore: () => void;
}

export function LessonDeck({ selectedId, onSelect, relevantId, relevantReason, run, currentScene, onRun, onRestore }: LessonDeckProps) {
  const tabsId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [predictions, setPredictions] = useState<Record<string, PredictState>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const index = Math.max(0, EXPOSURE_LESSONS.findIndex((l) => l.id === selectedId));
  const lesson = EXPOSURE_LESSONS[index]!;
  const prediction = predictionFor(lesson.id);
  const pState = predictions[lesson.id] ?? { chosen: null, checked: false };

  const select = (i: number, focus: boolean) => {
    const l = EXPOSURE_LESSONS[i];
    if (!l) return;
    onSelect(l.id);
    markLesson(l.id);
    if (focus) tabRefs.current[i]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = EXPOSURE_LESSONS.length;
    let next = -1;
    if (e.key === 'ArrowRight') next = (index + 1) % n;
    else if (e.key === 'ArrowLeft') next = (index - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    select(next, true);
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Lecciones del triángulo de exposición"
        onKeyDown={onKeyDown}
        className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-wrap lg:gap-x-1 lg:gap-y-0 lg:overflow-visible lg:px-0"
      >
        {EXPOSURE_LESSONS.map((l, i) => {
          const active = i === index;
          const relevant = l.id === relevantId;
          return (
            <button
              key={l.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={`${tabsId}-tab-${l.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`${tabsId}-panel`}
              tabIndex={active ? 0 : -1}
              onClick={() => select(i, false)}
              className={cn(
                'relative -mb-px inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors duration-150',
                active ? 'border-amber text-fg' : 'border-transparent text-muted hover:text-fg',
              )}
            >
              {shortTitle(l)}
              {relevant && (
                <>
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber shadow-[0_0_6px_rgb(255_178_36/0.8)]" />
                  <span className="sr-only">(relacionada con el último control que tocaste)</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-tab-${lesson.id}`} tabIndex={0} className="pt-6 focus-visible:outline-offset-4">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <article className="min-w-0">
            {lesson.id === relevantId && relevantReason && (
              <p className="osd mb-3 inline-flex items-center gap-1.5 rounded-sm bg-amber-soft px-2 py-1 text-[11.5px] text-amber">
                <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden="true" />
                Relacionada con {relevantReason}
              </p>
            )}
            <h3 className="text-xl font-semibold text-fg">{lesson.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{lesson.summary}</p>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <div className="eyebrow mb-2 !text-data">Puntos clave</div>
                <FactList items={lesson.keyFacts} tone="data" />
              </div>
              <div>
                <div className="eyebrow mb-2 !text-danger">Errores comunes</div>
                <FactList items={lesson.commonMistakes} tone="danger" />
              </div>
            </div>

            <div className="mt-5 border-t border-line pt-2">
              <button
                type="button"
                aria-expanded={!!expanded[lesson.id]}
                aria-controls={`${tabsId}-body`}
                onClick={() => {
                  setExpanded((x) => ({ ...x, [lesson.id]: !x[lesson.id] }));
                  markLesson(lesson.id);
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-md text-[13.5px] font-medium text-fg hover:text-amber"
              >
                <BookOpen size={15} aria-hidden="true" className="text-faint" />
                {expanded[lesson.id] ? 'Ocultar la explicación completa' : 'Leer la explicación completa'}
                <ChevronDown size={15} aria-hidden="true" className={cn('transition-transform duration-150', expanded[lesson.id] && 'rotate-180')} />
              </button>
              <div id={`${tabsId}-body`} hidden={!expanded[lesson.id]} className="mt-3 space-y-3">
                {lesson.body.map((p) => (
                  <p key={p} className="text-[14px] leading-relaxed text-muted">
                    {p}
                  </p>
                ))}
              </div>
            </div>
          </article>

          {prediction && (
            <PredictCard
              key={lesson.id}
              prediction={prediction}
              state={pState}
              onState={(s) => {
                setPredictions((x) => ({ ...x, [lesson.id]: s }));
                markLesson(lesson.id);
              }}
              run={run}
              currentScene={currentScene}
              onRun={onRun}
              onRestore={onRestore}
            />
          )}
        </div>
      </div>
    </div>
  );
}
