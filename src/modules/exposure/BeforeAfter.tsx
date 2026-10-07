/**
 * Resultado de un experimento: las dos capturas (antes y después) con los datos que
 * cambian entre ellas y, si corresponde, el histograma de cada una.
 */
import { Undo2 } from 'lucide-react';
import { formatAperture, formatDistance, formatIso } from '../../engine';
import { Button } from '../../components/ui';
import { Histogram } from '../../components/viewfinder';
import { evText, pctText, pxText, shutterText } from './assessment';
import type { CaptionKey } from './experiments';
import type { Capture, ExperimentRun } from './useExperiment';

function captionLine(key: CaptionKey, c: Capture): string {
  const m = c.metrics;
  const e = c.effective;
  switch (key) {
    case 'exposure':
      return `Exposición ${evText(m.exposureOffset)}`;
    case 'meter':
      return `Exposímetro ${evText(m.meterReading - e.exposureComp)} · sujeto ${evText(m.exposureOffset)}`;
    case 'background':
      return `Fondo desenfocado ${pctText(m.backgroundBlurPct)}`;
    case 'dof':
      return `Zona nítida ${formatDistance(m.dofNearM)} – ${formatDistance(m.dofFarM)}`;
    case 'motion':
      return `Barrido ${pxText(m.subjectMotionBlurPx)}`;
    case 'shake':
      return e.tripod ? 'Trípode: sin trepidación' : m.shakeRatio <= 1 ? `Sin trepidación (×${m.shakeRatio.toFixed(1)})` : `Trepidación ×${m.shakeRatio.toFixed(1)}`;
    case 'noise':
      return `Ruido ${m.noiseScore}/100`;
    case 'dynamicRange':
      return `Rango dinámico ${m.dynamicRangeStops.toFixed(1)} pasos`;
    case 'light':
      return `${formatAperture(e.aperture)} · ${shutterText(e.shutter)} · ISO ${formatIso(e.iso)}`;
  }
}

function Panel({ title, capture, captions, histogram }: { title: string; capture: Capture | null; captions: CaptionKey[]; histogram: boolean }) {
  return (
    <figure className="m-0 min-w-0">
      <div className="eyebrow mb-1.5">{title}</div>
      {capture ? (
        <img
          src={capture.image}
          alt={`${title}: ${capture.label}. ${captions.map((k) => captionLine(k, capture)).join('. ')}.`}
          className="block aspect-[3/2] w-full rounded-md border border-line bg-black object-cover"
        />
      ) : (
        <div className="flex aspect-[3/2] w-full items-center justify-center rounded-md border border-dashed border-line bg-ink">
          <span className="osd flex items-center gap-2 text-[11.5px] text-faint">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber" aria-hidden="true" />
            Midiendo…
          </span>
        </div>
      )}
      {capture && (
        <figcaption className="mt-1.5 space-y-0.5">
          <div className="text-[12.5px] font-medium text-fg">{capture.label}</div>
          {captions.map((k) => (
            <div key={k} className="osd text-[11.5px] text-muted">
              {captionLine(k, capture)}
            </div>
          ))}
          {histogram && capture.histogram && <Histogram data={capture.histogram} variant="luma" showClipping className="mt-1.5 text-[10px]" />}
        </figcaption>
      )}
    </figure>
  );
}

export function BeforeAfter({
  run,
  captions,
  histogram = false,
  onRestore,
}: {
  run: ExperimentRun;
  captions: CaptionKey[];
  histogram?: boolean;
  onRestore: () => void;
}) {
  return (
    <div className="mt-4 rounded-md border border-line bg-ink/50 p-3">
      <div className="grid grid-cols-2 gap-3">
        <Panel title="Antes" capture={run.before} captions={captions} histogram={histogram} />
        <Panel title="Después" capture={run.after} captions={captions} histogram={histogram} />
      </div>
      {run.restorable && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <p className="text-[12px] text-faint">El visor quedó con los ajustes del «después».</p>
          <Button size="sm" variant="ghost" icon={<Undo2 size={14} aria-hidden="true" />} onClick={onRestore}>
            Volver a mis ajustes
          </Button>
        </div>
      )}
    </div>
  );
}
