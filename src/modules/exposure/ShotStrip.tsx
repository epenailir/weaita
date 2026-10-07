/**
 * Tira de tomas (máximo 6) con miniatura, ajustes y veredicto. Seleccionar una muestra su
 * diagnóstico; la marcada como A se compara con la imagen actual.
 */
import { ArrowDown, ImageIcon } from 'lucide-react';
import { formatAperture, formatIso, formatShutter } from '../../engine';
import { cn } from '../../lib/cn';
import type { Shot, Verdict } from './diagnosis';
import { StatusGlyph } from './LabUi';
import type { Status } from './assessment';

export const VERDICT_STATUS: Record<Verdict, Status> = { great: 'good', close: 'fair', fix: 'bad' };

export function shotSettingsLabel(s: Shot): string {
  return `${formatAperture(s.effective.aperture)} · ${formatShutter(s.effective.shutter)} · ISO ${formatIso(s.effective.iso)}`;
}

export interface ShotStripProps {
  shots: Shot[];
  max: number;
  selectedId: number | null;
  aId: number | null;
  onSelect: (id: number) => void;
  onOpenDiagnosis: () => void;
}

export function ShotStrip({ shots, max, selectedId, aId, onSelect, onOpenDiagnosis }: ShotStripProps) {
  const selected = shots.find((s) => s.id === selectedId) ?? null;
  const empty = Math.max(0, max - shots.length);
  return (
    <section aria-labelledby="tomas-title" className="rounded-lg border border-line bg-panel p-3 sm:p-4">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h3 id="tomas-title" className="text-[14px] font-semibold text-fg">
          Tomas
        </h3>
        <span className="osd text-[11.5px] text-faint">
          {shots.length}/{max} · la más antigua se descarta
        </span>
      </div>
      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {shots.map((s) => {
          const active = s.id === selectedId;
          return (
            <li key={s.id} className="min-w-0">
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-pressed={active}
                aria-label={`Toma ${s.id}, ${s.sceneName}, ${shotSettingsLabel(s)}. ${s.diagnosis.headline}.${s.id === aId ? ' Marcada como A.' : ''}`}
                className={cn(
                  'group relative block w-full overflow-hidden rounded-md border text-left transition-colors duration-150',
                  active ? 'border-amber shadow-[0_0_0_1px_var(--color-amber)]' : 'border-line hover:border-line-strong',
                )}
              >
                <img src={s.image} alt="" className="block aspect-[3/2] w-full bg-black object-cover" />
                <span className="osd absolute left-1 top-1 rounded-xs bg-black/70 px-1 text-[10.5px] text-white">#{s.id}</span>
                {s.id === aId && (
                  <span className="osd absolute right-1 top-1 rounded-xs bg-amber px-1 text-[10.5px] font-semibold text-ink">A</span>
                )}
                <span className="flex items-center gap-1 bg-ink px-1.5 py-1">
                  <StatusGlyph status={VERDICT_STATUS[s.diagnosis.verdict]} size={12} />
                  <span className="osd truncate text-[10px] text-muted">{formatShutter(s.effective.shutter)} · {formatAperture(s.effective.aperture).replace('f/', 'F')}</span>
                </span>
              </button>
            </li>
          );
        })}
        {Array.from({ length: empty }, (_, i) => (
          <li
            key={`vacio-${i}`}
            aria-hidden="true"
            className="flex aspect-[3/2] items-center justify-center rounded-md border border-dashed border-line text-faint/60"
          >
            {i === 0 && shots.length === 0 ? <ImageIcon size={16} /> : null}
          </li>
        ))}
      </ol>
      {selected ? (
        <div className="mt-3 flex flex-col gap-2 rounded-md border border-line bg-panel-2 px-3 py-2.5 sm:flex-row sm:items-center">
          <span className="flex min-w-0 flex-1 items-center gap-2 text-[13px]">
            <StatusGlyph status={VERDICT_STATUS[selected.diagnosis.verdict]} size={16} label />
            <span className="min-w-0 text-fg">
              <span className="osd text-muted">#{selected.id}</span> {selected.diagnosis.headline}
            </span>
          </span>
          <button
            type="button"
            onClick={onOpenDiagnosis}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 self-start rounded-md px-2 text-[12.5px] font-medium text-amber hover:bg-amber-soft sm:self-auto"
          >
            Ver diagnóstico
            <ArrowDown size={13} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <p className="mt-3 text-[12.5px] text-faint">Todavía no disparaste. Ajusta la cámara y pulsa Disparar para evaluar la toma.</p>
      )}
    </section>
  );
}
