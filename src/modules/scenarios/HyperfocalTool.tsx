/**
 * Paisaje: calculadora de hiperfocal. Muestra la zona nítida sobre una escala de distancias
 * con los objetos de la escena y permite enfocar a la hiperfocal con un clic.
 */
import { Crosshair, Infinity as InfinityIcon, Mountain } from 'lucide-react';
import { APERTURES, SENSORS, airyDiskMm, depthOfField, formatAperture, formatDistance, hyperfocalM, nearestStop } from '../../engine';
import { Button } from '../../components/ui';
import { FOCUS_INFINITY_M } from '../../components/viewfinder';
import { ChipGroup } from '../../components/camera';
import { cn } from '../../lib/cn';
import { DistanceAxis } from './DistanceAxis';
import type { AxisMarker } from './DistanceAxis';
import { PassIcon, Readout, ToolBlock, ToolNote } from './bits';
import { fmtMicrons, fmtZone, num } from './format';
import { isInfinity } from './model';
import type { ToolProps } from './model';

/** Aperturas típicas de paisaje. */
const LANDSCAPE_STOPS = ['8', '11', '16', '22'] as const;
type LandscapeStop = (typeof LANDSCAPE_STOPS)[number];

export function HyperfocalTool({ cam, lighting }: ToolProps) {
  const { settings, effective, metrics } = cam;
  const sensor = SENSORS[settings.sensor];
  const H = metrics.hyperfocalM;
  const roundedH = Math.round(H * 100) / 100;
  const atH = depthOfField(settings.focalMm, effective.aperture, roundedH, sensor.cocMm);
  const inside = (d: number) => metrics.dofNearM <= d && d <= metrics.dofFarM;

  const objects = [
    lighting.foregroundDistanceM !== null ? { id: 'near', tag: '1', name: 'Lo más cercano', d: lighting.foregroundDistanceM } : null,
    { id: 'subject', tag: '2', name: 'Rocas del primer plano', d: lighting.subjectDistanceM },
    { id: 'far', tag: '3', name: 'Montañas', d: lighting.backgroundDistanceM },
  ].filter((o): o is { id: string; tag: string; name: string; d: number } => o !== null);

  const markers: AxisMarker[] = objects.map((o) => ({ id: o.id, tag: o.tag, distanceM: o.d, inside: inside(o.d) }));
  const airy = airyDiskMm(effective.aperture);
  const airyRatio = airy / sensor.cocMm;
  const currentStop = nearestStop(APERTURES, effective.aperture).label;
  const stopValue = (label: string) => APERTURES.find((a) => a.label === label)?.value ?? effective.aperture;
  const focusedAtH = !isInfinity(settings.focusM) && Math.abs(Math.log(settings.focusM / roundedH)) < 0.04;

  const focusAt = (m: number) => cam.set({ focusM: m, af: 'MF' });

  return (
    <div className="flex flex-col gap-3">
      <ToolBlock title="Zona nítida en la escala de distancias" aside={`H ${formatDistance(H)}`}>
        <DistanceAxis
          near={metrics.dofNearM}
          far={metrics.dofFarM}
          focus={settings.focusM}
          hyperfocal={H}
          markers={markers}
          label={`Escala de distancias: enfoque a ${formatDistance(settings.focusM)}, zona nítida de ${fmtZone(metrics.dofNearM, metrics.dofFarM)}, hiperfocal ${formatDistance(H)}.`}
        />
        <ul className="mt-2 space-y-1">
          {objects.map((o) => (
            <li key={o.id} className="flex items-center gap-2 text-[12.5px]">
              <span
                aria-hidden="true"
                className={cn(
                  'osd inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-ink',
                  inside(o.d) ? 'bg-data' : 'bg-danger',
                )}
              >
                {o.tag}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted">{o.name}</span>
              <span className="osd text-faint">{formatDistance(o.d >= 1000 ? Infinity : o.d)}</span>
              <PassIcon pass={inside(o.d)} size={14} />
            </li>
          ))}
        </ul>
        <div className="mt-3 grid gap-2">
          <Button
            variant={focusedAtH ? 'secondary' : 'primary'}
            size="sm"
            icon={<Crosshair size={14} aria-hidden="true" />}
            onClick={() => focusAt(roundedH)}
            aria-pressed={focusedAtH}
          >
            Enfocar a la hiperfocal ({formatDistance(roundedH)})
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="ghost" className="border border-line" icon={<InfinityIcon size={14} aria-hidden="true" />} onClick={() => focusAt(FOCUS_INFINITY_M)}>
              Al infinito
            </Button>
            <Button size="sm" variant="ghost" className="border border-line" icon={<Mountain size={14} aria-hidden="true" />} onClick={() => focusAt(lighting.subjectDistanceM)}>
              En las rocas
            </Button>
          </div>
        </div>
        <ToolNote>
          Enfocando a la hiperfocal ({formatDistance(roundedH)}), todo es nítido desde {formatDistance(atH.nearM)} hasta el infinito: la mitad de la
          distancia. Enfocar al infinito desperdicia esa mitad.
        </ToolNote>
      </ToolBlock>

      <ToolBlock title="Hiperfocal según el diafragma" aside={`${settings.focalMm} mm`}>
        <ChipGroup<LandscapeStop>
          label="Apertura de paisaje"
          hideLabel
          value={(LANDSCAPE_STOPS as readonly string[]).includes(currentStop) ? (currentStop as LandscapeStop) : null}
          onChange={(label) => cam.set({ aperture: stopValue(label) })}
          options={LANDSCAPE_STOPS.map((label) => {
            const h = hyperfocalM(settings.focalMm, stopValue(label), sensor.cocMm);
            return {
              value: label,
              label: <span className="osd">f/{label}</span>,
              ariaLabel: `f/${label}: hiperfocal ${formatDistance(h)}`,
              detail: `H ${formatDistance(h)}`,
            };
          })}
        />
        <dl className="mt-3 border-t border-line pt-2">
          <Readout label="Hiperfocal" value={formatDistance(H)} hint={`${formatAperture(effective.aperture)} · ${settings.focalMm} mm`} />
          <Readout label="Zona nítida ahora" value={fmtZone(metrics.dofNearM, metrics.dofFarM)} />
          <Readout
            label="Disco de Airy (difracción)"
            value={fmtMicrons(airy)}
            tone={airyRatio > 1 ? 'danger' : airyRatio > 0.75 ? 'amber' : 'data'}
            hint={`CoC ${fmtMicrons(sensor.cocMm)}`}
          />
        </dl>
        <div className="mt-2" aria-hidden="true">
          <div className="relative h-1.5 overflow-hidden rounded-full bg-raised">
            <div
              className={cn('h-full rounded-full', airyRatio > 1 ? 'bg-danger' : airyRatio > 0.75 ? 'bg-amber' : 'bg-data')}
              style={{ width: `${Math.min(100, (airyRatio / 1.4) * 100)}%` }}
            />
            <div className="absolute inset-y-0 w-px bg-fg/70" style={{ left: `${100 / 1.4}%` }} />
          </div>
        </div>
        <ToolNote>
          Cerrar acerca la hiperfocal, pero desde f/16 el disco de Airy ya es {num(airyDiskMm(16) / sensor.cocMm * 100, 0)} % del círculo de confusión y a f/22
          lo supera: la difracción ablanda toda la foto.
        </ToolNote>
      </ToolBlock>
    </div>
  );
}
