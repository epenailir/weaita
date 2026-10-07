/**
 * Quiz con práctica intercalada: una pregunta a la vez, cuatro opciones en un radiogroup
 * accesible (flechas para elegir, Intro para responder), feedback inmediato con explicación,
 * puntaje de la ronda y repaso de las preguntas falladas.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CheckCircle2, RefreshCcw, RotateCcw, Shuffle, XCircle } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button, Segmented } from '../../components/ui';
import type { Level, QuizQuestion } from '../../content/types';
import { progress } from '../../lib/progress';
import { cn } from '../../lib/cn';
import { LEVELS, interleave, topicLabel } from './model';

type LevelFilter = 'all' | Level;
interface Answer {
  choice: number;
  correct: boolean;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function OptionList({
  question,
  selected,
  answer,
  onSelect,
  onSubmit,
  labelledBy,
}: {
  question: QuizQuestion;
  selected: number | null;
  answer: Answer | undefined;
  onSelect: (i: number) => void;
  onSubmit: () => void;
  labelledBy: string;
}) {
  const refs = useRef<Array<HTMLDivElement | null>>([]);
  const locked = answer !== undefined;
  const focusIndex = answer?.choice ?? selected ?? 0;
  const count = question.options.length;

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (locked) return;
    const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (dir) {
      e.preventDefault();
      const next = ((selected ?? (dir > 0 ? -1 : 0)) + dir + count) % count;
      onSelect(next);
      refs.current[next]?.focus();
      return;
    }
    if (e.key === ' ') {
      e.preventDefault();
      const i = refs.current.findIndex((el) => el === document.activeElement);
      if (i >= 0) onSelect(i);
      return;
    }
    if (e.key === 'Enter' && selected !== null) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} aria-disabled={locked || undefined} onKeyDown={onKeyDown} className="grid gap-2">
      {question.options.map((opt, i) => {
        const isCorrect = i === question.correctIndex;
        const isChosen = answer?.choice === i;
        const isSelected = locked ? isChosen : selected === i;
        const state = !locked ? (isSelected ? 'selected' : 'idle') : isCorrect ? 'correct' : isChosen ? 'wrong' : 'dim';
        return (
          <div
            key={opt}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="radio"
            aria-checked={isSelected}
            aria-disabled={locked || undefined}
            tabIndex={i === focusIndex ? 0 : -1}
            onClick={() => {
              if (!locked) onSelect(i);
            }}
            className={cn(
              'flex min-h-12 items-center gap-3 rounded-md border px-3.5 py-3 text-left text-[14px] leading-snug transition-colors duration-150',
              !locked && 'cursor-pointer',
              state === 'idle' && 'border-line bg-panel-2 text-fg hover:border-line-strong',
              state === 'selected' && 'border-amber/60 bg-amber-soft text-fg',
              state === 'correct' && 'border-data/40 bg-data-soft text-fg',
              state === 'wrong' && 'border-danger/40 bg-danger-soft text-fg',
              state === 'dim' && 'border-line bg-panel text-faint',
            )}
          >
            <span
              className={cn(
                'osd inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border text-[12px] font-semibold',
                state === 'selected' ? 'border-amber bg-amber text-ink' : 'border-line-strong text-muted',
                state === 'correct' && 'border-data/60 text-data',
                state === 'wrong' && 'border-danger/60 text-danger',
              )}
              aria-hidden="true"
            >
              {LETTERS[i]}
            </span>
            <span className="min-w-0 flex-1">{opt}</span>
            {state === 'correct' && (
              <span className="osd inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-data">
                <CheckCircle2 size={14} aria-hidden="true" /> Correcta
              </span>
            )}
            {state === 'wrong' && (
              <span className="osd inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-danger">
                <XCircle size={14} aria-hidden="true" /> Tu respuesta
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const reduced = useReducedMotion() ?? false;
  const qTitleId = useId();
  const nextWrapRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [topicFilter, setTopicFilter] = useState('all');
  const [seed, setSeed] = useState(7);
  const [review, setReview] = useState<string[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [pos, setPos] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const topics = useMemo(
    () => [...new Set(questions.map((q) => q.topic))].sort((a, b) => topicLabel(a).localeCompare(topicLabel(b), 'es')),
    [questions],
  );

  const deck = useMemo(() => {
    const pool = review
      ? questions.filter((q) => review.includes(q.id))
      : questions.filter((q) => (levelFilter === 'all' || q.level === levelFilter) && (topicFilter === 'all' || q.topic === topicFilter));
    return interleave(pool, seed);
  }, [questions, review, levelFilter, topicFilter, seed]);

  const restart = () => {
    setAnswers({});
    setPos(0);
    setSelected(null);
  };

  const changeLevel = (v: LevelFilter) => {
    setLevelFilter(v);
    setReview(null);
    restart();
  };
  const changeTopic = (v: string) => {
    setTopicFilter(v);
    setReview(null);
    restart();
  };

  const question = deck[pos];
  const answer = question ? answers[question.id] : undefined;
  const answeredCount = deck.filter((q) => answers[q.id]).length;
  const correctCount = deck.filter((q) => answers[q.id]?.correct).length;
  const wrongIds = deck.filter((q) => answers[q.id] && !answers[q.id]?.correct).map((q) => q.id);
  const finished = deck.length > 0 && pos >= deck.length;

  const submit = () => {
    if (!question || selected === null || answer) return;
    const correct = selected === question.correctIndex;
    setAnswers((a) => ({ ...a, [question.id]: { choice: selected, correct } }));
    if (correct) progress.mark('quiz', question.id);
  };

  // Tras responder, el foco pasa al botón "Siguiente" para seguir con el teclado.
  useEffect(() => {
    if (answer) nextWrapRef.current?.querySelector('button')?.focus({ preventScroll: true });
  }, [answer]);

  const next = () => {
    setSelected(null);
    setPos((p) => p + 1);
    cardRef.current?.focus({ preventScroll: true });
  };

  const startReview = () => {
    setReview(wrongIds);
    setSeed((s) => s + 1);
    restart();
  };

  const levelOptions = [{ value: 'all' as LevelFilter, label: 'Todos' }, ...LEVELS.map((l) => ({ value: l as LevelFilter, label: l }))];
  const pct = deck.length ? (answeredCount / deck.length) * 100 : 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      {/* Filtros */}
      <aside aria-label="Filtros del quiz" className="space-y-5">
        <div className="surface space-y-5 p-4">
          <Segmented
            label="Nivel"
            options={levelOptions}
            value={levelFilter}
            onChange={changeLevel}
            size="sm"
            className="[&_[role=radiogroup]]:flex-wrap"
          />
          <label className="block">
            <span className="mb-2 block text-[13px] font-medium text-muted">Tema</span>
            <select
              value={topicFilter}
              onChange={(e) => changeTopic(e.target.value)}
              className="h-10 w-full rounded-md border border-line bg-ink px-3 text-[13.5px] text-fg focus:border-amber focus:outline-none"
            >
              <option value="all">Todos los temas (intercalados)</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {topicLabel(t)}
                </option>
              ))}
            </select>
          </label>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSeed((s) => s + 1);
              restart();
            }}
            icon={<Shuffle size={14} aria-hidden="true" />}
            className="-ml-2"
          >
            Mezclar otra vez
          </Button>
        </div>
        <p className="px-1 text-[12.5px] leading-relaxed text-faint">
          Las preguntas de distintos temas se alternan: obligarte a cambiar de tema cuesta más, pero fija mejor lo aprendido.
        </p>
      </aside>

      {/* Pregunta */}
      <section aria-label="Pregunta del quiz" className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="osd text-[12px] text-muted">
            {review ? <span className="mr-2 text-amber">Repaso de falladas ·</span> : null}
            Pregunta {Math.min(pos + 1, deck.length)} de {deck.length}
          </div>
          <div className="osd text-[12px] text-muted">
            Puntaje <span className="text-data">{correctCount}</span>/{answeredCount}
          </div>
        </div>
        <div
          className="mb-5 h-1 overflow-hidden rounded-full bg-raised"
          role="progressbar"
          aria-label="Avance de la ronda"
          aria-valuemin={0}
          aria-valuemax={deck.length}
          aria-valuenow={answeredCount}
        >
          <div className="h-full rounded-full bg-amber transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>

        <div ref={cardRef} tabIndex={-1} className="surface p-5 focus:outline-none md:p-6">
          {deck.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-[14px] text-muted">No hay preguntas con esta combinación de nivel y tema.</p>
              <Button
                className="mt-4"
                size="sm"
                onClick={() => {
                  changeLevel('all');
                  setTopicFilter('all');
                }}
              >
                Quitar filtros
              </Button>
            </div>
          ) : finished ? (
            <motion.div
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="py-2"
            >
              <div className="eyebrow">Ronda terminada</div>
              <h3 className="mt-2 text-xl font-semibold text-fg">
                {correctCount} de {deck.length} correctas
              </h3>
              <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted">
                {correctCount === deck.length
                  ? 'Ronda perfecta. Prueba con otro nivel o pasa a los desafíos prácticos para aplicarlo con la cámara.'
                  : `Fallaste ${wrongIds.length}. Repasarlas ahora, cuando la explicación está fresca, es la forma más rápida de fijarlas.`}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {wrongIds.length > 0 && (
                  <Button variant="primary" onClick={startReview} icon={<RotateCcw size={15} aria-hidden="true" />} className="h-11">
                    Repasar las falladas ({wrongIds.length})
                  </Button>
                )}
                <Button
                  variant={wrongIds.length > 0 ? 'secondary' : 'primary'}
                  onClick={() => {
                    setReview(null);
                    setSeed((s) => s + 1);
                    restart();
                  }}
                  icon={<RefreshCcw size={15} aria-hidden="true" />}
                  className="h-11"
                >
                  Nueva ronda
                </Button>
              </div>
            </motion.div>
          ) : question ? (
            <motion.div
              key={`${question.id}-${seed}`}
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: reduced ? 0.12 : 0.2,
                ease: [0.25, 1, 0.5, 1],
              }}
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="osd rounded-xs border border-line bg-raised px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-muted">
                  {topicLabel(question.topic)}
                </span>
                <span className="osd text-[11px] uppercase tracking-wide text-faint">Nivel {question.level}</span>
              </div>
              <h3 id={qTitleId} className="text-[17px] font-semibold leading-snug text-fg md:text-lg">
                {question.question}
              </h3>
              <div className="mt-5">
                <OptionList question={question} selected={selected} answer={answer} onSelect={setSelected} onSubmit={submit} labelledBy={qTitleId} />
              </div>

              <div aria-live="polite">
                {answer && (
                  <div
                    className={cn(
                      'mt-5 rounded-md border p-4 text-[13.5px] leading-relaxed',
                      answer.correct ? 'border-data/30 bg-data-soft' : 'border-danger/30 bg-danger-soft',
                    )}
                  >
                    <div className={cn('mb-1 flex items-center gap-2 font-semibold', answer.correct ? 'text-data' : 'text-danger')}>
                      {answer.correct ? <CheckCircle2 size={16} aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}
                      {answer.correct ? 'Correcto' : `Incorrecto: la respuesta es la ${LETTERS[question.correctIndex]}`}
                    </div>
                    <p className="text-muted">{question.explanation}</p>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[12px] text-faint">{answer ? '' : 'Elige con las flechas o el clic y confirma con Intro.'}</span>
                {answer ? (
                  <span ref={nextWrapRef}>
                    <Button variant="primary" onClick={next} icon={<ArrowRight size={15} aria-hidden="true" />} className="h-11">
                      {pos + 1 >= deck.length ? 'Ver resultado' : 'Siguiente pregunta'}
                    </Button>
                  </span>
                ) : (
                  <Button variant="primary" onClick={submit} disabled={selected === null} className="h-11">
                    Responder
                  </Button>
                )}
              </div>
            </motion.div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
