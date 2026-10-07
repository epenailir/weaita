/**
 * Página "Desafíos y quiz": resumen de progreso, pestañas accesibles entre desafíos prácticos
 * (lista por nivel → vista de desafío con simulador) y quiz intercalado.
 */
import { ArrowRight, BookOpenCheck, CheckCircle2, Target, Trophy } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import type { PageProps } from '../../App';
import { Button, SectionHeader } from '../../components/ui';
import { CHALLENGES } from '../../content/challenges';
import { QUIZ } from '../../content/quiz';
import { useProgress } from '../../lib/progress';
import { cn } from '../../lib/cn';
import { ChallengeList } from './ChallengeList';
import { ChallengeRunner } from './ChallengeRunner';
import { LEVEL_INFO, recommendedChallenge } from './model';
import { Quiz } from './Quiz';

type Tab = 'practica' | 'quiz';

/** Desafío abierto desde el hash (#desafios/<id>), para poder enlazarlo o recargar sin perderlo. */
function challengeFromHash(): string | null {
  const [, sub] = window.location.hash.replace(/^#/, '').split('/');
  return sub && CHALLENGES.some((c) => c.id === sub) ? sub : null;
}

/** Escribe la subruta en el historial (pushState no dispara hashchange) para que atrás y adelante funcionen. */
function setHash(sub: string | null) {
  const next = sub ? `#desafios/${sub}` : '#desafios';
  if (window.location.hash !== next) window.history.pushState(null, '', next);
}

function SummaryCard({ icon, label, children, className }: { icon: ReactNode; label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('surface flex min-w-0 flex-col p-4', className)}>
      <div className="eyebrow mb-2 flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div
      className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div className="h-full rounded-full bg-amber transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Challenges({ onNavigate }: PageProps) {
  const p = useProgress();
  const [tab, setTab] = useState<Tab>('practica');
  const [openId, setOpenId] = useState<string | null>(challengeFromHash);
  const tabsId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const solvedCount = CHALLENGES.filter((c) => p.challenges.includes(c.id)).length;
  const quizCount = QUIZ.filter((q) => p.quiz.includes(q.id)).length;
  const recommended = recommendedChallenge(CHALLENGES, p.challenges);

  // Foco tras cambiar de vista: al título del desafío al abrirlo, o a la tarjeta del que se cerró al volver.
  const focusAfter = useRef<{ returnTo: string | null } | null>(null);

  const open = useCallback((id: string | null) => {
    setOpenId((prevId) => {
      focusAfter.current = { returnTo: prevId };
      return id;
    });
    setTab('practica');
    setHash(id);
    if (id) window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const pending = focusAfter.current;
    if (!pending) return;
    focusAfter.current = null;
    if (openId) {
      document.getElementById('challenge-title')?.focus();
    } else if (pending.returnTo) {
      document.querySelector<HTMLElement>(`[data-challenge-id="${pending.returnTo}"]`)?.focus();
    }
  }, [openId]);

  // Atrás/adelante del navegador o la navegación a #desafios: sincroniza el desafío abierto con el hash.
  useEffect(() => {
    const on = () => {
      if (!window.location.hash.startsWith('#desafios')) return;
      const id = challengeFromHash();
      setOpenId(id);
      if (id) setTab('practica');
    };
    window.addEventListener('hashchange', on);
    window.addEventListener('popstate', on);
    return () => {
      window.removeEventListener('hashchange', on);
      window.removeEventListener('popstate', on);
    };
  }, []);

  const tabs: Array<{
    id: Tab;
    label: string;
    icon: ReactNode;
    count: string;
  }> = [
    {
      id: 'practica',
      label: 'Desafíos prácticos',
      icon: <Target size={15} aria-hidden="true" />,
      count: `${solvedCount}/${CHALLENGES.length}`,
    },
    {
      id: 'quiz',
      label: 'Quiz',
      icon: <BookOpenCheck size={15} aria-hidden="true" />,
      count: `${quizCount}/${QUIZ.length}`,
    },
  ];

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.id === tab);
    let n = i;
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = tabs.length - 1;
    else return;
    e.preventDefault();
    const t = tabs[n];
    if (!t) return;
    setTab(t.id);
    tabRefs.current[n]?.focus();
  };

  const openIndex = openId ? CHALLENGES.findIndex((c) => c.id === openId) : -1;
  const current = openIndex >= 0 ? CHALLENGES[openIndex] : undefined;
  const prev = openIndex > 0 ? CHALLENGES[openIndex - 1] : undefined;
  const next = openIndex >= 0 ? CHALLENGES[openIndex + 1] : undefined;

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Ponte a prueba"
        title="Desafíos y quiz"
        description="Misiones medibles con la cámara en modo M: ajusta, dispara y recibe un diagnóstico de cada criterio. El quiz alterna temas para que lo aprendido se fije."
        actions={
          <Button variant="ghost" onClick={() => onNavigate('exposicion')} icon={<ArrowRight size={15} aria-hidden="true" />}>
            Repasar el triángulo
          </Button>
        }
      />

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[1fr_1fr_1.4fr]">
        <SummaryCard icon={<Trophy size={12} className="text-amber" aria-hidden="true" />} label="Desafíos superados">
          <div className="osd text-2xl font-medium text-fg">
            {solvedCount}
            <span className="text-base text-faint"> / {CHALLENGES.length}</span>
          </div>
          <Meter value={solvedCount} max={CHALLENGES.length} label="Desafíos superados" />
        </SummaryCard>
        <SummaryCard icon={<CheckCircle2 size={12} className="text-data" aria-hidden="true" />} label="Aciertos del quiz">
          <div className="osd text-2xl font-medium text-fg">
            {quizCount}
            <span className="text-base text-faint"> / {QUIZ.length}</span>
          </div>
          <Meter value={quizCount} max={QUIZ.length} label="Preguntas del quiz acertadas" />
        </SummaryCard>
        <SummaryCard
          icon={<Target size={12} className="text-amber" aria-hidden="true" />}
          label="Siguiente recomendado"
          className="col-span-2 md:col-span-1"
        >
          {recommended ? (
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <div className="text-[14.5px] font-semibold leading-snug text-fg">{recommended.title}</div>
                <div className="osd mt-1 text-[12px] text-faint">
                  Nivel {LEVEL_INFO[recommended.level].step} · {recommended.level} · {recommended.targets.length}{' '}
                  {recommended.targets.length === 1 ? 'criterio' : 'criterios'}
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => open(recommended.id)}
                icon={<ArrowRight size={14} aria-hidden="true" />}
                className="h-10 shrink-0"
                disabled={recommended.id === openId && tab === 'practica'}
              >
                {recommended.id === openId && tab === 'practica' ? 'En curso' : 'Empezar'}
              </Button>
            </div>
          ) : (
            <p className="text-[13.5px] leading-snug text-muted">
              Superaste los {CHALLENGES.length} desafíos. Repite los avanzados sin pistas o pasa al quiz.
            </p>
          )}
        </SummaryCard>
      </div>

      {/* Pestañas */}
      <div>
        <div role="tablist" aria-label="Tipo de práctica" onKeyDown={onTabKey} className="flex gap-1 border-b border-line">
          {tabs.map((t, i) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                id={`${tabsId}-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`${tabsId}-panel-${t.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(t.id)}
                className={cn(
                  'relative -mb-px inline-flex h-11 items-center gap-2 border-b-2 px-3 text-[14px] font-medium transition-colors duration-150 sm:px-4',
                  active ? 'border-amber text-fg' : 'border-transparent text-muted hover:text-fg',
                )}
              >
                <span className={active ? 'text-amber' : 'text-faint'}>{t.icon}</span>
                {t.label}
                <span className="osd rounded-xs bg-raised px-1.5 py-px text-[11px] text-muted">{t.count}</span>
              </button>
            );
          })}
        </div>

        <div id={`${tabsId}-panel-practica`} role="tabpanel" aria-labelledby={`${tabsId}-tab-practica`} hidden={tab !== 'practica'} className="pt-6">
          {current ? (
            <ChallengeRunner
              key={current.id}
              challenge={current}
              index={openIndex}
              total={CHALLENGES.length}
              solved={p.challenges.includes(current.id)}
              onBack={() => open(null)}
              onPrev={prev ? () => open(prev.id) : null}
              onNext={next ? () => open(next.id) : null}
            />
          ) : (
            <>
              <h2 className="sr-only">Desafíos prácticos</h2>
              <ChallengeList challenges={CHALLENGES} solved={p.challenges} recommendedId={recommended?.id ?? null} onOpen={open} />
            </>
          )}
        </div>

        <div id={`${tabsId}-panel-quiz`} role="tabpanel" aria-labelledby={`${tabsId}-tab-quiz`} hidden={tab !== 'quiz'} className="pt-6">
          <h2 className="sr-only">Quiz</h2>
          {/* Montado siempre: cambiar de pestaña no pierde la ronda en curso */}
          <Quiz questions={QUIZ} />
        </div>
      </div>
    </div>
  );
}
