/**
 * Diagnóstico de la toma seleccionada, al estilo "Outside of Auto" pero específico:
 * qué salió bien, qué falló con el valor medido y qué moverías y por qué, con la opción
 * de probar el cambio sugerido.
 */
import { ArrowRight, Check, Columns2, Wand2 } from 'lucide-react';
import { Badge, Button } from '../../components/ui';
import { Histogram } from '../../components/viewfinder';
import { cn } from '../../lib/cn';
import type { Advice } from './advice';
import type { Finding, Shot } from './diagnosis';
import { STATUS_SOFT_CLASS, StatusGlyph } from './LabUi';
import { VERDICT_STATUS, shotSettingsLabel } from './ShotStrip';

function AdviceBox({ advice, onApply, applied }: { advice: Advice; onApply: () => void; applied: boolean }) {
  const actionable = advice.action.kind !== 'none';
  return (
    <div className="mt-3 rounded-md border border-line bg-ink/60 p-3">
      <div className="eyebrow mb-1.5 !text-amber">Qué movería</div>
      <p className="text-[13.5px] font-medium text-fg">{advice.headline}</p>
      {advice.changes.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {advice.changes.map((c) => (
            <li key={c.key} className="osd inline-flex items-center gap-1.5 rounded-sm border border-line bg-panel-2 px-2 py-1 text-[11.5px] text-muted">
              <span className="text-faint">{c.label}</span>
              <span className="text-fg">{c.from}</span>
              <ArrowRight size={11} aria-hidden="true" />
              <span className="sr-only">a</span>
              <span className="text-amber">{c.to}</span>
              {c.delta && <span className="text-faint">({c.delta})</span>}
            </li>
          ))}
        </ul>
      )}
      {advice.cameraNote && <p className="mt-2 text-[12.5px] text-muted">{advice.cameraNote}</p>}
      {advice.reason && (
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          <span className="font-medium text-fg">Por qué: </span>
          {advice.reason}
        </p>
      )}
      {advice.outcome && <p className="osd mt-2 text-[12px] text-data">{advice.outcome}</p>}
      {advice.tradeoffs.length > 0 && (
        <div className="mt-2 text-[12.5px] leading-snug">
          <span className="font-medium text-amber">A cambio: </span>
          <span className="text-muted">{advice.tradeoffs.join(' · ')}</span>
        </div>
      )}
      {advice.bonus.length > 0 && (
        <div className="mt-1 text-[12.5px] leading-snug">
          <span className="font-medium text-data">De paso: </span>
          <span className="text-muted">{advice.bonus.join(' · ')}</span>
        </div>
      )}
      {actionable && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" icon={<Wand2 size={14} aria-hidden="true" />} onClick={onApply}>
            Probar este cambio
          </Button>
          {applied && (
            <span role="status" className="inline-flex items-center gap-1 text-[12.5px] text-data">
              <Check size={13} aria-hidden="true" /> Aplicado en el visor: dispara otra vez para comparar.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Clave de una corrección para detectar consejos repetidos entre criterios. */
function adviceKey(a: Advice | undefined): string | null {
  if (!a || a.action.kind !== 'settings') return null;
  return JSON.stringify(a.action.patch);
}

function IssueCard({
  finding,
  onApply,
  applied,
  sameAs,
}: {
  finding: Finding;
  onApply: (a: Advice) => void;
  applied: boolean;
  /** Criterio anterior cuyo consejo es idéntico a este. */
  sameAs: string | null;
}) {
  const c = finding.criterion;
  const advice = finding.advice;
  return (
    <li className={cn('rounded-md border p-3.5', STATUS_SOFT_CLASS[c.status])}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="flex items-center gap-2 text-[14px] font-semibold text-fg">
          <StatusGlyph status={c.status} size={16} label />
          {c.label}
        </span>
        <span className="osd text-[12.5px] text-fg">
          {c.value}
          {c.target && <span className="text-faint"> · objetivo {c.target}</span>}
        </span>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{c.detail}</p>
      {advice && sameAs ? (
        <div className="mt-3 rounded-md border border-line bg-ink/60 p-3 text-[13px] leading-relaxed text-muted">
          <span className="font-medium text-fg">El mismo cambio que en «{sameAs}» lo resuelve. </span>
          {advice.reason}
          {advice.outcome && <span className="osd mt-1.5 block text-[12px] text-data">{advice.outcome}</span>}
        </div>
      ) : (
        advice && <AdviceBox advice={advice} onApply={() => onApply(advice)} applied={applied} />
      )}
    </li>
  );
}

export interface DiagnosisPanelProps {
  shot: Shot;
  isA: boolean;
  onSetA: () => void;
  onApply: (shot: Shot, advice: Advice) => void;
  appliedKey: string | null;
}

export function DiagnosisPanel({ shot, isA, onSetA, onApply, appliedKey }: DiagnosisPanelProps) {
  const d = shot.diagnosis;
  const status = VERDICT_STATUS[d.verdict];
  return (
    <section id="diagnostico" aria-labelledby="diagnostico-title" tabIndex={-1} className="scroll-mt-24 rounded-lg border border-line bg-panel p-4 focus:outline-none sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="eyebrow mb-1">Diagnóstico · toma #{shot.id}</div>
          <h3 id="diagnostico-title" className="text-[17px] font-semibold text-fg">
            {d.headline}
          </h3>
          <p className="osd mt-1 text-[12px] text-faint">
            {shot.sceneName} · {shot.settings.mode} · {shotSettingsLabel(shot)} · {shot.effective.focalMm} mm
          </p>
        </div>
        <Button size="sm" variant={isA ? 'ghost' : 'secondary'} icon={<Columns2 size={14} aria-hidden="true" />} onClick={onSetA} disabled={isA}>
          {isA ? 'Es la toma A' : 'Comparar como A'}
        </Button>
      </header>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,230px)_minmax(0,1fr)]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-2.5 lg:block lg:space-y-2.5">
          <img src={shot.image} alt={`Toma ${shot.id}: ${shot.sceneName} con ${shotSettingsLabel(shot)}.`} className="block aspect-[3/2] w-full rounded-md border border-line bg-black object-cover" />
          <Histogram data={shot.histogram} showClipping className="self-start text-[11px]" />
          <div className={cn('col-span-2 rounded-md border p-3 text-[12.5px] leading-snug', STATUS_SOFT_CLASS[status])}>
            <div className="mb-1 flex items-center gap-1.5 font-medium text-fg">
              <StatusGlyph status={d.goalMet ? 'good' : 'fair'} size={14} />
              {d.goalMet ? 'Objetivo cumplido' : 'Objetivo pendiente'}
            </div>
            <span className="text-muted">{d.goal}</span>
          </div>
          <div className="col-span-2 flex flex-wrap gap-1.5">
            <Badge tone="data">{d.counts.good} bien</Badge>
            <Badge tone="amber">{d.counts.fair} regular</Badge>
            <Badge tone="danger">{d.counts.bad} mal</Badge>
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          {d.issues.length > 0 && (
            <div>
              <h4 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">Lo que falló</h4>
              <ul className="space-y-3">
                {d.issues.map((f, i) => {
                  const key = adviceKey(f.advice);
                  const first = key ? d.issues.findIndex((g) => adviceKey(g.advice) === key) : i;
                  const prev = first < i ? d.issues[first] : undefined;
                  return (
                    <IssueCard
                      key={f.criterion.id}
                      finding={f}
                      onApply={(a) => onApply(shot, a)}
                      applied={appliedKey === `${shot.id}-${f.criterion.id}`}
                      sameAs={prev ? prev.criterion.label : null}
                    />
                  );
                })}
              </ul>
            </div>
          )}
          {d.good.length > 0 && (
            <div>
              <h4 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">Lo que salió bien</h4>
              <ul className="divide-y divide-line rounded-md border border-line bg-panel-2">
                {d.good.map((c) => (
                  <li key={c.id} className="flex gap-2.5 px-3 py-2.5">
                    <StatusGlyph status="good" size={15} className="mt-0.5" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-[13px] font-medium text-fg">{c.label}</span>
                        <span className="osd text-[12px] text-data">{c.value}</span>
                      </div>
                      <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
