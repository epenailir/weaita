import { Camera, Footprints, Lock, Ruler } from 'lucide-react';
import { SENSORS, equivalentFocal, formatDistance } from '../../engine';
import type { SensorId } from '../../engine';
import { Callout, Panel, RangeSlider, Segmented } from '../../components/ui';
import { faceBox } from '../../lens/render';
import type { LensShot } from '../../lens/render';
import {
  FOCAL_MAX_MM,
  FOCAL_MIN_MM,
  QUICK_FOCALS,
  anglesOfView,
  buildingsScale,
  cameraDistanceM,
  formatDegrees,
  formatFocal,
  formatSignedPercent,
  framingDistanceM,
  lensDistortion,
  shotFor,
  subjectFill,
} from '../../lens/framing';
import type { FramingMode, LensBuild } from '../../lens/framing';
import { BUILDINGS_BEHIND_M } from '../../lens/scene';
import { cn } from '../../lib/cn';
import { useSmoothNumber } from './hooks';
import { LensCanvas } from './LensCanvas';
import { FocalChips, Readout, SensorPicker, sensorShortName } from './shared';
import { TopView } from './TopView';

export interface FocalExplorerProps {
  focal: number;
  onFocal: (mm: number) => void;
  sensorId: SensorId;
  onSensor: (id: SensorId) => void;
  mode: FramingMode;
  onMode: (m: FramingMode) => void;
  fixedDistance: number;
  onFixedDistance: (m: number) => void;
  build: LensBuild;
}

const pct = (x: number) => `${x >= 0.1 ? Math.round(x * 100) : (x * 100).toFixed(1)}\u00a0%`;

/** Esquinas del visor y recuadro de enfoque al ojo. */
function ViewfinderMarks({ shot }: { shot: LensShot }) {
  const face = faceBox(shot);
  const faceVisible = face.x > 0.02 && face.x + face.w < 0.98 && face.y > 0.02 && face.y + face.h < 0.98 && face.w > 0.012;
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {(['left-3 top-3 border-l border-t', 'right-3 top-3 border-r border-t', 'left-3 bottom-3 border-l border-b', 'right-3 bottom-3 border-r border-b'] as const).map((c) => (
        <span key={c} className={cn('absolute h-4 w-4 border-white/45', c)} />
      ))}
      <span className="absolute left-1/2 top-1/2 h-px w-5 -translate-x-1/2 bg-white/35" />
      <span className="absolute left-1/2 top-1/2 h-5 w-px -translate-y-1/2 bg-white/35" />
      {faceVisible && (
        <span
          className="absolute rounded-[3px] border-[1.5px] border-data/90 shadow-[0_0_0_1px_rgb(0_0_0/0.25)]"
          style={{ left: `${face.x * 100}%`, top: `${face.y * 100}%`, width: `${face.w * 100}%`, height: `${face.h * 100}%` }}
        />
      )}
    </div>
  );
}

export function FocalExplorer({ focal, onFocal, sensorId, onSensor, mode, onMode, fixedDistance, onFixedDistance, build }: FocalExplorerProps) {
  const sensor = SENSORS[sensorId];
  const targetDistance = cameraDistanceM(mode, focal, sensor, fixedDistance);
  const smoothFocal = useSmoothNumber(focal, { log: true });
  const smoothDistance = useSmoothNumber(targetDistance, { log: true });
  const shot = shotFor(smoothFocal, sensor, smoothDistance);

  const fov = anglesOfView(focal, sensor);
  const equiv = equivalentFocal(focal, sensor);
  const bg = buildingsScale(targetDistance);
  const bgWide = buildingsScale(framingDistanceM(FOCAL_MIN_MM, sensor));
  const fill = subjectFill(focal, sensor, targetDistance);
  const dist = lensDistortion(focal, build);
  const cropFrac = FOCAL_MIN_MM / smoothFocal;

  const label =
    `Vista simulada con ${formatFocal(focal)} en ${sensor.name}, cámara a ${formatDistance(targetDistance)} de una persona de 1,75 m ` +
    `${fill <= 1 ? `que ocupa el ${Math.round(fill * 100)} % de la altura del encuadre` : 'que no cabe entera en el encuadre'}. Detrás hay farolas, árboles, una fila de edificios a ${BUILDINGS_BEHIND_M} m ` +
    `que se ven al ${pct(bg)} del tamaño que tendrían junto a la persona, y montañas lejanas. Ángulo de visión horizontal ${formatDegrees(fov.h)}.`;

  const changeMode = (m: FramingMode) => {
    // Al fijar la cámara se congela donde estaba: la imagen no salta
    if (m === 'fixed' && mode === 'frame') onFixedDistance(Math.min(150, Math.max(1.5, targetDistance)));
    onMode(m);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        {/* Visor */}
        <div className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-lg border border-line bg-ink shadow-[var(--shadow-raise)]">
            <LensCanvas shot={shot} label={label}>
              <ViewfinderMarks shot={shot} />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/45 to-transparent" aria-hidden="true" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" aria-hidden="true" />
              <div className="osd pointer-events-none absolute left-4 top-3.5 flex items-baseline gap-2 text-[11px] text-white/80 sm:left-5 sm:top-4 sm:text-xs" aria-hidden="true">
                <span className="text-base font-medium text-amber sm:text-lg">{formatFocal(focal)}</span>
                <span>{sensorShortName(sensorId)}</span>
                {sensor.crop !== 1 && <span className="hidden text-white/60 sm:inline">≈ {formatFocal(equiv)} eq.</span>}
              </div>
              <div className="osd pointer-events-none absolute right-4 top-3.5 text-right text-[11px] text-white/80 sm:right-5 sm:top-4 sm:text-xs" aria-hidden="true">
                <span className="text-white/55">H </span>
                {formatDegrees(fov.h)}
              </div>
              <div className="osd pointer-events-none absolute bottom-3 left-4 flex items-center gap-1.5 text-[11px] text-white/85 sm:bottom-3.5 sm:left-5 sm:text-xs" aria-hidden="true">
                {mode === 'fixed' ? <Lock size={12} className="text-amber" /> : <Footprints size={12} className="text-amber" />}
                {formatDistance(targetDistance)}
              </div>
              <div className="osd pointer-events-none absolute bottom-3 right-4 text-[11px] text-white/85 sm:bottom-3.5 sm:right-5 sm:text-xs" aria-hidden="true">
                <span className="text-white/55">Fondo </span>
                {pct(bg)}
              </div>
              {mode === 'fixed' && focal > FOCAL_MIN_MM + 0.5 && (
                <figure aria-hidden="true" className="pointer-events-none absolute right-3 top-10 m-0 w-[30%] min-w-[104px] overflow-hidden rounded-sm border border-white/25 shadow-[0_6px_18px_rgb(0_0_0/0.55)] sm:right-4 sm:top-12">
                  <LensCanvas shot={shotFor(FOCAL_MIN_MM, sensor, smoothDistance)}>
                    <span
                      className="absolute border-[1.5px] border-amber shadow-[0_0_0_9999px_rgb(0_0_0/0.5)]"
                      style={{
                        left: `${50 - (cropFrac * 100) / 2}%`,
                        top: `${50 - (cropFrac * 100) / 2}%`,
                        width: `${cropFrac * 100}%`,
                        height: `${cropFrac * 100}%`,
                      }}
                    />
                  </LensCanvas>
                  <figcaption className="osd truncate whitespace-nowrap bg-black/70 px-1.5 py-0.5 text-[10px] text-white/80">
                    14 mm<span className="hidden sm:inline"> desde aquí</span> · <span className="text-amber">recorte</span>
                  </figcaption>
                </figure>
              )}
            </LensCanvas>
          </div>

          <Panel eyebrow="Controles" title="Elige la focal y cómo la cambias">
            <div className="space-y-5">
              <div>
                <RangeSlider
                  label="Distancia focal"
                  icon={<Camera size={14} aria-hidden="true" />}
                  value={focal}
                  min={FOCAL_MIN_MM}
                  max={FOCAL_MAX_MM}
                  log
                  onChange={onFocal}
                  format={formatFocal}
                  hints={['Gran angular', 'Teleobjetivo']}
                />
                <FocalChips values={QUICK_FOCALS} value={focal} onChange={onFocal} className="mt-3" />
              </div>
              <Segmented
                label="Al cambiar de focal…"
                stretch
                value={mode}
                onChange={changeMode}
                options={[
                  { value: 'frame', label: 'Mantener encuadre', ariaLabel: 'Mantener el encuadre del sujeto: la cámara se aleja o se acerca' },
                  { value: 'fixed', label: 'Cámara fija', ariaLabel: 'Cámara fija: cambiar la focal solo recorta' },
                ]}
              />
              {mode === 'fixed' && (
                <RangeSlider
                  label="Distancia de la cámara al sujeto"
                  icon={<Ruler size={14} aria-hidden="true" />}
                  value={fixedDistance}
                  min={1.5}
                  max={150}
                  log
                  onChange={onFixedDistance}
                  format={formatDistance}
                  hints={['Cerca: perspectiva exagerada', 'Lejos: perspectiva aplanada']}
                />
              )}
              <SensorPicker value={sensorId} onChange={onSensor} />
            </div>
          </Panel>
        </div>

        {/* Vista cenital y lecturas */}
        <div className="min-w-0 space-y-4">
          <Panel eyebrow="Vista cenital · a escala" title="Dónde está la cámara">
            <TopView focalMm={smoothFocal} sensor={sensor} distanceM={smoothDistance} className="rounded-md border border-line" />
          </Panel>

          <Panel eyebrow="Lecturas" title={`${formatFocal(focal)} · ${sensorShortName(sensorId)}`}>
            <div className="grid grid-cols-3 gap-2">
              <Readout label="Ángulo H" value={formatDegrees(fov.h)} tone="amber" />
              <Readout label="Ángulo V" value={formatDegrees(fov.v)} />
              <Readout label="Diagonal" value={formatDegrees(fov.d)} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Readout label="Focal equiv." value={formatFocal(equiv)} hint={sensor.crop === 1 ? 'Full frame: sin recorte' : `Factor de recorte ×${sensor.crop}`} />
              <Readout label="Distancia" value={formatDistance(targetDistance)} hint={mode === 'frame' ? 'Para que la persona llene el 60 %' : 'Cámara fija'} />
              <Readout
                label="Fondo"
                value={pct(bg)}
                tone="data"
                hint={`Edificios a ${BUILDINGS_BEHIND_M} m, frente a su tamaño junto a la persona`}
              />
              <Readout
                label="Distorsión"
                value={formatSignedPercent(dist.percent)}
                tone={dist.kind === 'none' ? undefined : 'info'}
                hint={`${dist.label} en la esquina · ${build === 'prime' ? 'fijo' : 'zoom'}`}
              />
            </div>
            <div className="mt-4" aria-hidden="true">
              <div className="mb-1.5 flex justify-between text-[11px] text-faint">
                <span>Edificio junto a la persona</span>
                <span className="osd">100 %</span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-raised">
                <div className="absolute inset-y-0 left-0 rounded-full bg-data/80 transition-[width] duration-300" style={{ width: `${Math.max(1, bg * 100)}%` }} />
                <div className="absolute inset-y-0 w-px bg-fg/60" style={{ left: `${bgWide * 100}%` }} />
              </div>
              <div className="mt-1 text-[11px] text-faint">
                La marca blanca es el mismo encuadre hecho con 14 mm ({pct(bgWide)}).
              </div>
            </div>
          </Panel>

        </div>
      </div>

      {mode === 'frame' ? (
        <Callout kind="tip" title="La compresión depende de la distancia, no de la focal">
          Para que la persona mida lo mismo con <strong>{formatFocal(focal)}</strong> te colocas a <strong>{formatDistance(targetDistance)}</strong>. Desde ahí, los edificios
          ({BUILDINGS_BEHIND_M} m detrás) se ven al <strong>{pct(bg)}</strong> del tamaño que tendrían junto a ella; con 14 mm, al {pct(bgWide)}. El fondo «se acerca» porque
          tú te alejaste: la relación entre {formatDistance(targetDistance)} y {formatDistance(targetDistance + BUILDINGS_BEHIND_M)} es la que manda. La focal solo decide cuánto
          recortas.
        </Callout>
      ) : (
        <Callout kind="info" title="Cámara fija: misma perspectiva con cualquier focal">
          Sin moverte, los edificios se ven siempre al <strong>{pct(bg)}</strong> del tamaño que tendrían junto a la persona, uses 14 o 400 mm. El tele no «comprime»:
          amplía por igual lo que ya veía el gran angular; la miniatura del visor muestra la toma de 14 mm desde el mismo sitio y, en ámbar, lo que recorta tu{' '}
          {formatFocal(focal)}. Para cambiar la perspectiva hay que cambiar la <strong>distancia</strong>: mueve el control de distancia y mira cómo cambia la proporción.
        </Callout>
      )}
    </div>
  );
}
