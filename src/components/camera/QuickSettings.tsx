/**
 * Menú rápido al estilo del botón Q de Fujifilm / Fn de Sony: una cuadrícula de fichas,
 * cada una con su valor actual y el control para cambiarlo, más una nota breve que explica
 * qué hace el ajuste.
 */
import { useId } from 'react';
import type { ReactNode } from 'react';
import { Crosshair, Focus, Maximize2, MoveHorizontal, Thermometer } from 'lucide-react';
import {
  FOCAL_LENGTHS,
  SENSORS,
  WB_PRESETS,
  fieldOfView,
  formatDistance,
  formatKelvin,
  formatShutter,
  handheldLimitS,
  kelvinToCss,
} from '../../engine';
import type { AfMode, FileFormat, MeteringMode, SensorId } from '../../engine';
import type { UseCamera } from '../../state/useCamera';
import { Button, RangeSlider, Segmented, StopSlider, Switch } from '../ui';
import { CARD_CAPACITY_GB, FOCUS_INFINITY_M, estimateFileSizeMB, estimateShotsRemaining, formatFocus } from '../viewfinder/buildOsd';
import { CardIcon, METERING_INFO, MeteringIcon, StabilizationIcon, TripodIcon, WbPresetIcon, wbPresetFor } from '../viewfinder/OsdIcons';
import { cn } from '../../lib/cn';
import { ChipGroup } from './ChipGroup';

export type QuickSettingKey = 'af' | 'metering' | 'wb' | 'format' | 'sensor' | 'stabilization' | 'tripod' | 'focus' | 'focal';

export interface QuickSettingsProps {
  cam: UseCamera;
  /** Ajustes visibles y su orden. Por defecto, todos. */
  show?: QuickSettingKey[];
  /** Rango de focales del objetivo (mm). Por defecto, toda la escala. */
  focalRange?: [number, number];
}

const ALL_KEYS: QuickSettingKey[] = ['af', 'metering', 'wb', 'format', 'sensor', 'stabilization', 'tripod', 'focus', 'focal'];

const AF_INFO: Record<AfMode, { name: string; description: string }> = {
  'AF-S': { name: 'Autoenfoque simple', description: 'Enfoca una vez al presionar el disparador a medias y bloquea: ideal para sujetos quietos.' },
  'AF-C': { name: 'Autoenfoque continuo', description: 'Reenfoca sin parar mientras sigues al sujeto: deporte, niños y animales.' },
  'AF-A': { name: 'Autoenfoque automático', description: 'La cámara elige entre simple y continuo según detecte movimiento.' },
  MF: { name: 'Enfoque manual', description: 'Enfocas tú con el anillo del objetivo; ayúdate con la lupa o el focus peaking.' },
};

const FORMAT_INFO: Record<FileFormat, string> = {
  RAW: 'Datos del sensor sin procesar: máximo margen para recuperar luces, sombras y balance de blancos.',
  JPEG: 'Imagen procesada en la cámara: lista para compartir, pero con poco margen de edición.',
  'RAW+JPEG': 'Guarda ambos: la seguridad del RAW y un JPEG listo para usar (ocupa más).',
};

const SENSOR_SHORT: Record<SensorId, string> = {
  ff: 'Full frame',
  apsc: 'APS-C',
  'apsc-canon': 'APS-C Canon',
  mft: 'M4/3',
  'one-inch': '1″',
};

/** Focales clásicas que se rotulan bajo la regla. */
const CLASSIC_FOCALS = new Set([14, 24, 35, 50, 85, 135, 200, 300, 400, 600]);

/* ---------------------------------------------------------- Escalas especiales */

const WB_MIN = 1800;
const WB_MAX = 10000;

/** Degradado de la pista de Kelvin, muestreado en escala logarítmica como el propio control. */
const WB_GRADIENT = `linear-gradient(to right, ${Array.from({ length: 9 }, (_, i) => {
  const k = WB_MIN * Math.pow(WB_MAX / WB_MIN, i / 8);
  return `${kelvinToCss(k)} ${(i / 8) * 100}%`;
}).join(', ')})`;

const FOCUS_MIN = 0.3;
const FOCUS_FAR = 300;
/** Fracción del recorrido logarítmico; el último tramo es infinito. */
const FOCUS_INF_AT = 0.96;

/** Posición 0–1 del control → metros (logarítmico de 0.3 m a 300 m, y luego ∞). */
function focusFromPos(u: number): number {
  if (u > FOCUS_INF_AT) return FOCUS_INFINITY_M;
  const m = FOCUS_MIN * Math.pow(FOCUS_FAR / FOCUS_MIN, Math.max(0, u) / FOCUS_INF_AT);
  // Redondeo a pasos "de anillo de enfoque"
  const q = m < 1 ? 0.01 : m < 10 ? 0.05 : m < 100 ? 0.5 : 5;
  return Math.round(m / q) * q;
}

function focusToPos(m: number): number {
  if (m >= FOCUS_INFINITY_M * 0.999) return 1;
  const u = (Math.log(Math.max(FOCUS_MIN, m) / FOCUS_MIN) / Math.log(FOCUS_FAR / FOCUS_MIN)) * FOCUS_INF_AT;
  return Math.min(FOCUS_INF_AT, Math.max(0, u));
}

/* ---------------------------------------------------------- Ficha */

function Tile({
  title,
  icon,
  value,
  note,
  wide,
  children,
}: {
  title: string;
  icon: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn('min-w-0 rounded-md border border-line bg-panel-2 p-3.5', wide && '@xl:col-span-2')}>
      <header className="mb-3 flex items-center justify-between gap-3">
        <h4 id={id} className="eyebrow flex min-w-0 items-center gap-1.5 !text-muted">
          <span className="shrink-0 text-faint" aria-hidden="true">
            {icon}
          </span>
          <span className="truncate">{title}</span>
        </h4>
        <span className="osd shrink-0 text-[13px] font-medium text-amber">{value}</span>
      </header>
      {children}
      {note && <p className="mt-2.5 text-xs leading-relaxed text-faint">{note}</p>}
    </section>
  );
}

/* ---------------------------------------------------------- Menú */

export function QuickSettings({ cam, show = ALL_KEYS, focalRange }: QuickSettingsProps) {
  const { settings, metrics } = cam;
  const sensor = SENSORS[settings.sensor];

  const renderTile = (key: QuickSettingKey): ReactNode => {
    switch (key) {
      case 'af':
        return (
          <Tile key={key} title="Modo de enfoque" icon={<Focus size={13} />} value={settings.af} note={AF_INFO[settings.af].description}>
            <Segmented<AfMode>
              label="Modo de enfoque"
              hideLabel
              size="sm"
              stretch
              value={settings.af}
              onChange={(af) => cam.set({ af })}
              options={(Object.keys(AF_INFO) as AfMode[]).map((m) => ({
                value: m,
                label: <span className="osd">{m}</span>,
                ariaLabel: `${AF_INFO[m].name} (${m})`,
              }))}
            />
          </Tile>
        );

      case 'metering':
        return (
          <Tile
            key={key}
            title="Medición"
            icon={<MeteringIcon mode={settings.metering} size={13} />}
            value={METERING_INFO[settings.metering].short}
            note={METERING_INFO[settings.metering].description}
          >
            <Segmented<MeteringMode>
              label="Modo de medición"
              hideLabel
              size="sm"
              stretch
              value={settings.metering}
              onChange={(metering) => cam.set({ metering })}
              options={(Object.keys(METERING_INFO) as MeteringMode[]).map((m) => ({
                value: m,
                icon: (
                  <span className="hidden @xs:inline-flex">
                    <MeteringIcon mode={m} size={16} />
                  </span>
                ),
                label: METERING_INFO[m].short,
                ariaLabel: METERING_INFO[m].label,
              }))}
            />
          </Tile>
        );

      case 'wb': {
        const preset = wbPresetFor(settings.wbK);
        return (
          <Tile
            key={key}
            wide
            title="Balance de blancos"
            icon={<Thermometer size={13} />}
            value={preset ? preset.name : 'Personalizado'}
            note="Ajústalo a la luz de la escena. Con menos Kelvin que la luz real la foto se enfría (azul); con más, se calienta (naranja)."
          >
            <ChipGroup
              label="Preajustes de balance de blancos"
              hideLabel
              value={preset?.id ?? null}
              onChange={(id) => {
                const p = WB_PRESETS.find((w) => w.id === id);
                if (p) cam.set({ wbK: p.kelvin });
              }}
              options={WB_PRESETS.map((p) => ({
                value: p.id,
                label: p.name,
                ariaLabel: `${p.name}, ${formatKelvin(p.kelvin)}`,
                icon: <WbPresetIcon presetId={p.id} size={15} />,
                detail: formatKelvin(p.kelvin),
              }))}
            />
            <RangeSlider
              className="mt-4"
              label="Temperatura de color"
              value={settings.wbK}
              min={WB_MIN}
              max={WB_MAX}
              step={50}
              log
              onChange={(k) => cam.set({ wbK: Math.round(k / 50) * 50 })}
              format={formatKelvin}
              trackBackground={WB_GRADIENT}
              hints={['Para luz cálida', 'Para luz fría']}
            />
          </Tile>
        );
      }

      case 'format': {
        const size = estimateFileSizeMB(settings.format, settings.sensor);
        const shots = estimateShotsRemaining(settings.format, settings.sensor);
        return (
          <Tile
            key={key}
            title="Formato de archivo"
            icon={<CardIcon size={12} />}
            value={settings.format}
            note={
              <>
                {FORMAT_INFO[settings.format]}
                <span className="osd mt-1 block text-muted">
                  ≈ {Math.round(size)} MB por foto · {shots.toLocaleString('es')} fotos en {CARD_CAPACITY_GB} GB
                </span>
              </>
            }
          >
            <Segmented<FileFormat>
              label="Formato de archivo"
              hideLabel
              size="sm"
              stretch
              value={settings.format}
              onChange={(format) => cam.set({ format })}
              options={(['RAW', 'JPEG', 'RAW+JPEG'] as FileFormat[]).map((f) => ({ value: f, label: <span className="osd">{f}</span> }))}
            />
          </Tile>
        );
      }

      case 'sensor':
        return (
          <Tile
            key={key}
            title="Sensor"
            icon={<Maximize2 size={13} />}
            value={`×${sensor.crop}`}
            note={
              `${sensor.name}: ${sensor.widthMm} × ${sensor.heightMm} mm, ${sensor.megapixels} MP.` +
              (sensor.crop !== 1
                ? ` Recorta el encuadre: ${settings.focalMm} mm se ven como ${Math.round(settings.focalMm * sensor.crop)} mm en full frame.`
                : ' Es la referencia para las focales "equivalentes".')
            }
          >
            <ChipGroup<SensorId>
              label="Tamaño de sensor"
              hideLabel
              value={settings.sensor}
              onChange={(s) => cam.set({ sensor: s })}
              options={(Object.keys(SENSORS) as SensorId[]).map((id) => ({
                value: id,
                label: SENSOR_SHORT[id],
                ariaLabel: `${SENSORS[id].name}, factor de recorte ${SENSORS[id].crop}`,
                detail: `×${SENSORS[id].crop}`,
              }))}
            />
          </Tile>
        );

      case 'stabilization': {
        const limit = handheldLimitS(settings.focalMm, sensor, settings.stabilizationStops);
        const stops = String(settings.stabilizationStops) as '0' | '1' | '2' | '3' | '4' | '5';
        return (
          <Tile
            key={key}
            title="Estabilización"
            icon={<StabilizationIcon size={15} />}
            value={settings.stabilizationStops > 0 ? `${settings.stabilizationStops} pasos` : 'No'}
            note={
              settings.tripod ? (
                'Sobre trípode no hace falta: en una cámara real conviene apagarla.'
              ) : (
                <>
                  Velocidad mínima a pulso con {settings.focalMm} mm: <span className="osd text-muted">{formatShutter(limit)}</span>.
                </>
              )
            }
          >
            <Segmented<'0' | '1' | '2' | '3' | '4' | '5'>
              label="Pasos de estabilización"
              hideLabel
              size="sm"
              stretch
              value={stops}
              onChange={(v) => cam.set({ stabilizationStops: Number(v) })}
              options={(['0', '1', '2', '3', '4', '5'] as const).map((v) => ({
                value: v,
                label: <span className="osd">{v === '0' ? 'No' : v}</span>,
                ariaLabel: v === '0' ? 'Sin estabilización' : `${v} ${v === '1' ? 'paso' : 'pasos'}`,
              }))}
            />
          </Tile>
        );
      }

      case 'tripod':
        return (
          <Tile key={key} title="Soporte" icon={<TripodIcon size={14} />} value={settings.tripod ? 'Trípode' : 'A pulso'}>
            <Switch
              label="Cámara sobre trípode"
              description="Elimina la trepidación: permite exposiciones de varios segundos."
              checked={settings.tripod}
              onChange={(tripod) => cam.set({ tripod })}
            />
          </Tile>
        );

      case 'focus': {
        const far = metrics.dofFarM;
        return (
          <Tile
            key={key}
            wide
            title="Distancia de enfoque"
            icon={<Crosshair size={13} />}
            value={`PdC ${Number.isFinite(far) ? formatDistance(far - metrics.dofNearM) : '∞'}`}
            note={
              <>
                Zona nítida: <span className="osd text-muted">{formatDistance(metrics.dofNearM)}</span> a{' '}
                <span className="osd text-muted">{formatDistance(far)}</span>. Hiperfocal:{' '}
                <span className="osd text-muted">{formatDistance(metrics.hyperfocalM)}</span>.
              </>
            }
          >
            <RangeSlider
              label={settings.af === 'MF' ? 'Anillo de enfoque' : 'Distancia enfocada'}
              value={focusToPos(settings.focusM)}
              min={0}
              max={1}
              onChange={(u) => cam.set({ focusM: focusFromPos(u) })}
              format={(u) => formatFocus(focusFromPos(u))}
              hints={['0.3 m', '∞']}
            />
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 -ml-2"
              onClick={() => cam.set({ focusM: Math.round(metrics.hyperfocalM * 100) / 100 })}
            >
              Enfocar a la hiperfocal ({formatDistance(metrics.hyperfocalM)})
            </Button>
          </Tile>
        );
      }

      case 'focal': {
        const [lo, hi] = focalRange ?? [FOCAL_LENGTHS[0]!, FOCAL_LENGTHS[FOCAL_LENGTHS.length - 1]!];
        const inRange = FOCAL_LENGTHS.filter((f) => f >= lo && f <= hi);
        const focals = inRange.length > 0 ? inRange : [lo, hi];
        let idx = 0;
        focals.forEach((f, i) => {
          if (Math.abs(Math.log(f / settings.focalMm)) < Math.abs(Math.log((focals[idx] ?? f) / settings.focalMm))) idx = i;
        });
        const options = focals.map((f, i) => ({
          label: String(f),
          major: CLASSIC_FOCALS.has(f) || i === 0 || i === focals.length - 1,
        }));
        const majors = options.filter((o) => o.major).length;
        const fov = fieldOfView(settings.focalMm, sensor).h;
        const eq = Math.round(settings.focalMm * sensor.crop);
        return (
          <Tile
            key={key}
            wide
            title="Distancia focal"
            icon={<MoveHorizontal size={13} />}
            value={`${fov.toFixed(0)}°`}
            note={
              sensor.crop !== 1 ? (
                <>
                  Ángulo de visión horizontal de {fov.toFixed(0)}°: equivale a <span className="osd text-muted">{eq} mm</span> en full frame.
                </>
              ) : (
                `Ángulo de visión horizontal de ${fov.toFixed(0)}°. Más focal: encuadre más cerrado y fondo más comprimido.`
              )
            }
          >
            <StopSlider
              label="Zoom"
              options={options}
              index={idx}
              onChange={(i) => {
                const f = focals[i];
                if (f !== undefined) cam.set({ focalMm: f });
              }}
              valueText={`${focals[idx] ?? settings.focalMm} milímetros`}
              display={`${focals[idx] ?? settings.focalMm} mm`}
              hints={['Gran angular', 'Teleobjetivo']}
              labelEvery={majors > 7 ? 2 : 1}
            />
          </Tile>
        );
      }
    }
  };

  return (
    <div className="@container">
      <div className="mb-3 flex items-center gap-2">
        <span className="osd inline-flex h-5 w-5 items-center justify-center rounded-xs border border-line-strong text-[11px] font-semibold text-fg" aria-hidden="true">
          Q
        </span>
        <span className="eyebrow">Menú rápido</span>
      </div>
      <div className="grid grid-cols-1 gap-3 @xl:grid-cols-2">{show.map(renderTile)}</div>
    </div>
  );
}
