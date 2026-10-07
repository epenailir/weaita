/**
 * Lista de criterios del desafío evaluados en vivo: cada uno con su valor medido y su estado
 * expresado con icono y texto ("Cumple" / "Falta"), no solo con color.
 */
import { CheckCircle2, CircleDashed } from 'lucide-react';
import type { ShotMetrics, TargetResult } from '../../engine';
import { cn } from '../../lib/cn';
import { formatMetric } from './model';

export function TargetChecklist({ results, metrics, live = true }: { results: TargetResult[]; metrics: ShotMetrics; live?: boolean }) {
  const passed = results.filter((r) => r.pass).length;
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h3 className="eyebrow">Criterios {live ? 'en vivo' : 'de la toma'}</h3>
        <span className={cn('osd text-[12px]', passed === results.length ? 'text-data' : 'text-muted')}>
          {passed}/{results.length} cumplidos
        </span>
      </div>
      <ul className="space-y-1.5">
        {results.map((r) => (
          <li
            key={`${r.metric}-${r.op}-${r.value}`}
            className={cn(
              'flex items-start gap-2.5 rounded-md border px-3 py-2.5 transition-colors duration-150',
              r.pass ? 'border-data/25 bg-data-soft' : 'border-line bg-panel-2',
            )}
          >
            {r.pass ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-data" aria-hidden="true" />
            ) : (
              <CircleDashed size={16} className="mt-0.5 shrink-0 text-faint" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[13px] leading-snug text-fg">{r.label}</div>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[12px]">
                <span className="text-faint">Medido</span>
                <span className="osd text-muted">{formatMetric(r.metric, r.actual, metrics)}</span>
              </div>
            </div>
            <span className={cn('osd mt-0.5 shrink-0 text-[11px] font-semibold uppercase tracking-wide', r.pass ? 'text-data' : 'text-muted')}>
              {r.pass ? 'Cumple' : 'Falta'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
