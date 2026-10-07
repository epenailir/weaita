import { formatDistance } from '../../engine';
import type { SensorFormat } from '../../engine';
import { STRIP_FOCALS, buildingsScale, formatFocal, framingDistanceM, shotFor } from '../../lens/framing';
import { BUILDINGS_BEHIND_M } from '../../lens/scene';
import { cn } from '../../lib/cn';
import { LensCanvas } from './LensCanvas';

const pct = (x: number) => `${x >= 0.1 ? Math.round(x * 100) : (x * 100).toFixed(1)} %`;

/** Miniaturas del modo «mantener encuadre»: la persona mide lo mismo; el fondo, no. */
export function ComparisonStrip({
  sensor,
  focal,
  active,
  onSelect,
}: {
  sensor: SensorFormat;
  focal: number;
  /** El visor está en modo «mantener encuadre». */
  active: boolean;
  onSelect: (mm: number) => void;
}) {
  return (
    <div>
      <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5" aria-label="Miniaturas por focal">
        {STRIP_FOCALS.map((mm) => {
          const d = framingDistanceM(mm, sensor);
          const bg = buildingsScale(d);
          const selected = active && Math.round(focal) === mm;
          return (
            <li key={mm} className="w-[46%] min-w-[150px] shrink-0 snap-start sm:w-auto sm:min-w-0">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(mm)}
                className={cn(
                  'group block w-full overflow-hidden rounded-md border bg-panel text-left transition-colors duration-150',
                  selected ? 'border-amber/70 shadow-[0_0_0_1px_var(--color-amber)]' : 'border-line hover:border-line-strong',
                )}
              >
                <LensCanvas shot={shotFor(mm, sensor, d)} />
                <span className="flex items-baseline justify-between gap-2 px-3 pb-2.5 pt-2">
                  <span className={cn('osd text-[15px] font-medium', selected ? 'text-amber' : 'text-fg')}>{formatFocal(mm)}</span>
                  <span className="osd text-[11.5px] text-faint">a {formatDistance(d)}</span>
                </span>
                <span className="block px-3 pb-3">
                  <span className="relative block h-1 overflow-hidden rounded-full bg-raised" aria-hidden="true">
                    <span className="absolute inset-y-0 left-0 rounded-full bg-data/80" style={{ width: `${Math.max(2, bg * 100)}%` }} />
                  </span>
                  <span className="mt-1.5 block text-[11.5px] text-muted">
                    Fondo al <span className="osd text-data">{pct(bg)}</span>
                    <span className="sr-only">: los edificios se ven al {pct(bg)} de su tamaño junto a la persona</span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 max-w-3xl text-[13.5px] leading-relaxed text-muted">
        La persona ocupa la misma altura en las cinco fotos. Fíjate en los edificios, {BUILDINGS_BEHIND_M} m detrás: con 14 mm son una línea diminuta en el horizonte;
        con 200 mm llenan el fondo como si estuvieran pegados. Lo que cambió es dónde estaba la cámara. Toca una miniatura para llevarla al visor.
      </p>
    </div>
  );
}
