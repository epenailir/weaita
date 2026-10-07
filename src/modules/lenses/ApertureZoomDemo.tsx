import { useState } from 'react';
import { ZoomIn } from 'lucide-react';
import { SENSORS, equivalentFocal, formatAperture, formatIso, formatShutter, formatThirds, variableMaxAperture } from '../../engine';
import type { SensorFormat } from '../../engine';
import { LENS_TYPES } from '../../content/lenses';
import { Badge, Callout, Panel, RangeSlider } from '../../components/ui';
import { formatFocal, shotFor } from '../../lens/framing';
import { cn } from '../../lib/cn';
import { LensCanvas } from './LensCanvas';
import { BulletList, Readout } from './shared';

interface ZoomLens {
  id: string;
  typeId: string;
  name: string;
  spec: string;
  range: [number, number];
  apertures: [number, number];
  sensor: SensorFormat;
}

const LENSES: ZoomLens[] = [
  {
    id: 'kit',
    typeId: 'zoom-variable-aperture',
    name: 'Zoom de kit',
    spec: '18–55 mm f/3.5–5.6',
    range: [18, 55],
    apertures: [3.5, 5.6],
    sensor: SENSORS.apsc,
  },
  {
    id: 'pro',
    typeId: 'zoom-constant-aperture',
    name: 'Zoom profesional',
    spec: '24–70 mm f/2.8',
    range: [24, 70],
    apertures: [2.8, 2.8],
    sensor: SENSORS.ff,
  },
];

/** Distancia de la cámara al sujeto en las miniaturas (cámara quieta, solo zoom). */
const THUMB_DISTANCE_M = 12;
/** Exposición de referencia en M ajustada en el extremo angular. */
const BASE_SHUTTER = 1 / 125;
const BASE_ISO = 400;
const MAX_PUPIL_MM = 25;

function lensState(lens: ZoomLens, t: number) {
  const [f0, f1] = lens.range;
  const [n0, n1] = lens.apertures;
  const focal = f0 * Math.pow(f1 / f0, t);
  const n = variableMaxAperture(focal, [f0, n0], [f1, n1]);
  const lossEv = 2 * Math.log2(n / n0);
  return { focal, n, lossEv, pupil: focal / n, light: Math.pow(2, -lossEv) };
}

/** Pupila de entrada dibujada a escala (el círculo exterior son 25 mm). */
function Iris({ pupilMm }: { pupilMm: number }) {
  const r = (pupilMm / MAX_PUPIL_MM) * 34;
  return (
    <figure className="m-0 flex shrink-0 flex-col items-center gap-1">
      <svg viewBox="0 0 80 80" className="h-20 w-20" aria-hidden="true">
        <circle cx="40" cy="40" r="37" className="fill-ink stroke-line-strong" strokeWidth="1.5" />
        <circle cx="40" cy="40" r="34" fill="none" className="stroke-line" strokeWidth="1" strokeDasharray="2 3" />
        <circle cx="40" cy="40" r={r} fill="var(--color-amber)" opacity="0.2" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-amber)" strokeWidth="1.5" />
      </svg>
      <figcaption className="osd text-[10.5px] text-faint">Ø {pupilMm.toFixed(1)} mm</figcaption>
    </figure>
  );
}

function LensCard({ lens, t }: { lens: ZoomLens; t: number }) {
  const s = lensState(lens, t);
  const type = LENS_TYPES.find((x) => x.id === lens.typeId);
  const constant = lens.apertures[0] === lens.apertures[1];
  const shutter = formatShutter(BASE_SHUTTER * Math.pow(2, s.lossEv));
  const iso = formatIso(BASE_ISO * Math.pow(2, s.lossEv));
  const lossLabel = s.lossEv < 1 / 6 ? '0' : formatThirds(-s.lossEv);

  return (
    <article className="surface flex flex-col overflow-hidden">
      <div className="relative">
        <LensCanvas
          shot={shotFor(s.focal, lens.sensor, THUMB_DISTANCE_M)}
          canvasStyle={{ filter: `brightness(${s.light.toFixed(3)})` }}
          label={`Vista con el ${lens.spec} a ${formatFocal(s.focal)} y ${formatAperture(s.n)}: ${s.lossEv < 1 / 6 ? 'la exposición no cambia' : `la imagen se oscurece ${formatThirds(s.lossEv).replace('+', '')} pasos respecto del extremo angular`}.`}
        />
        <div className="osd pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/55 to-transparent px-3 pb-6 pt-2.5 text-[12px] text-white/85" aria-hidden="true">
          <span>
            <span className="text-amber">{formatFocal(s.focal)}</span> · {formatAperture(s.n)}
          </span>
          <span className={cn(s.lossEv >= 1 / 6 ? 'text-danger' : 'text-data')}>{s.lossEv >= 1 / 6 ? `${lossLabel} EV` : '±0 EV'}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold">{lens.name}</h3>
            <div className="osd mt-0.5 text-[13px] text-muted">{lens.spec}</div>
          </div>
          <Badge tone={constant ? 'data' : 'amber'}>{constant ? 'Apertura constante' : 'Apertura variable'}</Badge>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <Iris pupilMm={s.pupil} />
          <div className="grid flex-1 grid-cols-2 gap-2">
            <Readout label="Apertura máx." value={formatAperture(s.n)} tone="amber" />
            <Readout label="Luz perdida" value={s.lossEv < 1 / 6 ? 'Ninguna' : `${lossLabel} pasos`} tone={s.lossEv < 1 / 6 ? 'data' : 'danger'} />
            <Readout label="Focal eq." value={formatFocal(equivalentFocal(s.focal, lens.sensor))} hint={lens.sensor.crop === 1 ? 'Full frame' : `APS-C ×${lens.sensor.crop}`} />
            <Readout label="Pupila" value={`${s.pupil.toFixed(1)} mm`} hint="Diámetro: f / N" />
          </div>
        </div>
        <div className="mt-4" aria-hidden="true">
          <div className="mb-1 flex justify-between text-[11px] text-faint">
            <span>Luz que llega al sensor</span>
            <span className="osd">{Math.round(s.light * 100)} %</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-raised">
            <div className={cn('h-full rounded-full transition-[width] duration-200', constant ? 'bg-data/80' : 'bg-amber')} style={{ width: `${s.light * 100}%` }} />
          </div>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          {s.lossEv < 1 / 6 ? (
            <>En M a 1/125 s e ISO 400 la exposición no se mueve al hacer zoom.</>
          ) : (
            <>
              En M a 1/125 s e ISO 400 la foto se oscurece <strong className="text-fg">{lossLabel.replace('−', '')} pasos</strong>. Para compensarlo: {shutter} s o ISO {iso}.
            </>
          )}
        </p>
        {type && (
          <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
            <div>
              <div className="eyebrow mb-2 !text-data">A favor</div>
              <BulletList items={type.pros} tone="data" />
            </div>
            <div>
              <div className="eyebrow mb-2 !text-danger">En contra</div>
              <BulletList items={type.cons} tone="danger" />
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export function ApertureZoomDemo() {
  const [t, setT] = useState(0);
  const kit = lensState(LENSES[0]!, t);
  return (
    <div className="space-y-5">
      <Panel>
        <RangeSlider
          label="Anillo de zoom de ambos objetivos"
          icon={<ZoomIn size={14} aria-hidden="true" />}
          value={t}
          min={0}
          max={1}
          onChange={setT}
          format={(v) => `${Math.round(v * 100)} %`}
          hints={['Extremo angular', 'Extremo tele']}
        />
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        {LENSES.map((l) => (
          <LensCard key={l.id} lens={l} t={t} />
        ))}
      </div>
      <Callout kind="tip" title="Por qué el número f sube aunque la lente sea la misma">
        El número f es la focal dividida por el diámetro de la pupila. En el 18–55 la pupila crece al hacer zoom (de {(18 / 3.5).toFixed(1)} a {(55 / 5.6).toFixed(1)} mm),
        pero la focal crece más deprisa: a {formatFocal(kit.focal)} el cociente da {formatAperture(kit.n)}. En un f/2.8 constante la pupila crece justo al ritmo de la
        focal: más vidrio, más peso, más precio. En P, A o S la cámara lo compensa sola; en M lo verás en el exposímetro.
      </Callout>
    </div>
  );
}
