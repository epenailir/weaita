/**
 * Lista de desafíos agrupada por nivel, con estado (superado / pendiente), criterios y
 * parámetros fijos visibles para que la dificultad progresiva se lea de un vistazo.
 */
import { ArrowRight, CheckCircle2, Circle, Lock, Star } from 'lucide-react';
import type { Challenge, Level } from '../../content/types';
import { SCENES } from '../../sim';
import { cn } from '../../lib/cn';
import { LEVELS, LEVEL_INFO, PARAM_LABEL } from './model';

/** Indicador de dificultad: tantas barras llenas como el paso del nivel. */
function DifficultyBars({ level }: { level: Level }) {
  const step = LEVEL_INFO[level].step;
  return (
    <span className="inline-flex items-end gap-[3px]" aria-hidden="true">
      {[1, 2, 3, 4].map((k) => (
        <span key={k} className={cn('w-[4px] rounded-[1px]', k <= step ? 'bg-amber' : 'bg-line-strong')} style={{ height: 4 + k * 3 }} />
      ))}
    </span>
  );
}

function ChallengeCard({
  challenge,
  number,
  solved,
  recommended,
  onOpen,
}: {
  challenge: Challenge;
  number: number;
  solved: boolean;
  recommended: boolean;
  onOpen: () => void;
}) {
  const scene = SCENES[challenge.sceneId];
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Desafío ${number}: ${challenge.title}. ${solved ? 'Superado' : 'Pendiente'}${recommended ? ', recomendado' : ''}. ${challenge.targets.length} ${challenge.targets.length === 1 ? 'criterio' : 'criterios'}. Fijos: ${challenge.locked.length ? challenge.locked.map((p) => PARAM_LABEL[p]).join(', ') : 'ninguno'}.`}
        className={cn(
          'group flex h-full w-full flex-col rounded-lg border p-4 text-left transition-colors duration-150',
          recommended ? 'border-amber/40 bg-panel-2' : 'border-line bg-panel hover:border-line-strong hover:bg-panel-2',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="osd text-[12px] text-faint">#{String(number).padStart(2, '0')}</span>
          {solved ? (
            <span className="osd inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-data">
              <CheckCircle2 size={13} aria-hidden="true" /> Superado
            </span>
          ) : recommended ? (
            <span className="osd inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-amber">
              <Star size={12} aria-hidden="true" /> Siguiente
            </span>
          ) : (
            <span className="osd inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-faint">
              <Circle size={12} aria-hidden="true" /> Pendiente
            </span>
          )}
        </div>
        <h4 className="mt-2 text-[14.5px] font-semibold leading-snug text-fg">{challenge.title}</h4>
        <p className="mt-1 text-[12.5px] text-faint">{scene.name}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-[12px]">
          <span className="flex min-w-0 items-center gap-1.5 text-muted">
            <Lock size={12} className="shrink-0 text-faint" aria-hidden="true" />
            <span className="truncate">{challenge.locked.length ? challenge.locked.map((p) => PARAM_LABEL[p]).join(' · ') : 'Todo libre'}</span>
          </span>
          <span className="osd inline-flex shrink-0 items-center gap-1.5 text-muted">
            {challenge.targets.length} {challenge.targets.length === 1 ? 'criterio' : 'criterios'}
            <ArrowRight
              size={13}
              className="text-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-amber"
              aria-hidden="true"
            />
          </span>
        </div>
      </button>
    </li>
  );
}

export function ChallengeList({
  challenges,
  solved,
  recommendedId,
  onOpen,
}: {
  challenges: Challenge[];
  solved: string[];
  recommendedId: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="space-y-10">
      {LEVELS.map((level) => {
        const items = challenges.filter((c) => c.level === level);
        if (items.length === 0) return null;
        const done = items.filter((c) => solved.includes(c.id)).length;
        const headingId = `nivel-${level.toLowerCase().replace(/[^a-z]/g, '')}`;
        return (
          <section key={level} aria-labelledby={headingId}>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
              <div className="flex items-center gap-3">
                <DifficultyBars level={level} />
                <div>
                  <h3 id={headingId} className="text-[16px] font-semibold text-fg">
                    Nivel {LEVEL_INFO[level].step} · {level}
                  </h3>
                  <p className="text-[12.5px] text-faint">{LEVEL_INFO[level].blurb}</p>
                </div>
              </div>
              <span className={cn('osd text-[12px]', done === items.length ? 'text-data' : 'text-muted')}>
                {done}/{items.length} superados
              </span>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((c) => (
                <ChallengeCard
                  key={c.id}
                  challenge={c}
                  number={challenges.indexOf(c) + 1}
                  solved={solved.includes(c.id)}
                  recommended={c.id === recommendedId}
                  onOpen={() => onOpen(c.id)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
