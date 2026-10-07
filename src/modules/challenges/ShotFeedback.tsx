/**
 * Resultado de pulsar "Disparar": celebración sobria con la explicación del desafío si se
 * cumplen todos los criterios, o un diagnóstico por criterio fallido si no.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Crosshair, RotateCcw, XCircle } from 'lucide-react';
import type { ShotMetrics, TargetResult } from '../../engine';
import { Button } from '../../components/ui';
import type { ChallengeParam } from '../../content/types';
import { diagnose } from './model';

export interface ShotOutcome {
  /** Número de intento (para reiniciar la animación en cada disparo). */
  attempt: number;
  results: TargetResult[];
  metrics: ShotMetrics;
  success: boolean;
}

/** Marca de enfoque confirmado: corchetes que se cierran sobre el check (o aparecen sin movimiento). */
function ConfirmMark({ reduced }: { reduced: boolean }) {
  const corner = 'absolute h-3 w-3 border-data';
  return (
    <motion.div
      className="relative flex h-12 w-12 shrink-0 items-center justify-center"
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.35 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduced ? 0.15 : 0.32, ease: [0.25, 1, 0.5, 1] }}
      aria-hidden="true"
    >
      <span className={`${corner} left-0 top-0 border-l-2 border-t-2`} />
      <span className={`${corner} right-0 top-0 border-r-2 border-t-2`} />
      <span className={`${corner} bottom-0 left-0 border-b-2 border-l-2`} />
      <span className={`${corner} bottom-0 right-0 border-b-2 border-r-2`} />
      <CheckCircle2 size={22} className="text-data" />
    </motion.div>
  );
}

export function ShotFeedback({
  outcome,
  locked,
  explanation,
  isLast,
  onNext,
  onRetry,
}: {
  outcome: ShotOutcome;
  locked: ChallengeParam[];
  explanation: string;
  isLast: boolean;
  onNext: () => void;
  onRetry: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const failed = outcome.results.filter((r) => !r.pass);
  const enter = reduced ? { opacity: 0 } : { opacity: 0, y: 6 };

  if (outcome.success) {
    return (
      <motion.section
        key={outcome.attempt}
        aria-labelledby="shot-success-title"
        initial={enter}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reduced ? 0.15 : 0.28,
          ease: [0.25, 1, 0.5, 1],
        }}
        className="rounded-lg border border-data/30 bg-data-soft p-4"
      >
        <div className="flex items-center gap-3">
          <ConfirmMark reduced={reduced} />
          <div className="min-w-0">
            <div className="eyebrow !text-data">Toma {outcome.attempt} · superado</div>
            <h3 id="shot-success-title" className="mt-1 text-[15px] font-semibold text-fg">
              ¡Lo lograste! Cumpliste los {outcome.results.length} criterios.
            </h3>
          </div>
        </div>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted">{explanation}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" onClick={onNext} icon={<ArrowRight size={15} aria-hidden="true" />} className="h-11">
            {isLast ? 'Volver a la lista' : 'Siguiente desafío'}
          </Button>
          <Button variant="ghost" onClick={onRetry} icon={<RotateCcw size={14} aria-hidden="true" />} className="h-11">
            Practicar otra vez
          </Button>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      key={outcome.attempt}
      aria-labelledby="shot-fail-title"
      initial={enter}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0.15 : 0.22 }}
      className="rounded-lg border border-danger/30 bg-danger-soft p-4"
    >
      <div className="flex items-start gap-2.5">
        <XCircle size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
        <div className="min-w-0">
          <div className="eyebrow">Toma {outcome.attempt} · diagnóstico</div>
          <h3 id="shot-fail-title" className="mt-1 text-[15px] font-semibold text-fg">
            {failed.length === 1 ? 'Te falta un criterio' : `Te faltan ${failed.length} de ${outcome.results.length} criterios`}
          </h3>
        </div>
      </div>
      <ol className="mt-3 space-y-3">
        {failed.map((r) => {
          const d = diagnose(r, {
            locked,
            targets: outcome.results,
            metrics: outcome.metrics,
          });
          return (
            <li key={`${r.metric}-${r.op}-${r.value}`} className="rounded-md border border-line bg-panel/80 p-3">
              <div className="flex items-center gap-2 text-[13px] font-medium text-fg">
                <Crosshair size={13} className="shrink-0 text-danger" aria-hidden="true" />
                {d.label}
              </div>
              <dl className="mt-2 space-y-1.5 text-[12.5px] leading-snug">
                <div>
                  <dt className="sr-only">Qué salió</dt>
                  <dd className="text-muted">{d.measured}</dd>
                </div>
                <div>
                  <dt className="sr-only">Cuánto falta</dt>
                  <dd className="text-fg">{d.gap}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="osd shrink-0 text-[11px] font-semibold uppercase tracking-wide text-amber">Mueve</dt>
                  <dd className="text-muted">{d.advice}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ol>
    </motion.section>
  );
}
