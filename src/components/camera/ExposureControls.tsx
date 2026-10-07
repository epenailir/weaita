/**
 * Controles del triángulo de exposición: apertura, velocidad, ISO (con Auto-ISO) y
 * compensación. Los parámetros que decide el modo se muestran como AUTO y siguen el valor
 * que eligió la cámara; los bloqueados por el ejercicio quedan deshabilitados.
 */
import { Gauge, Lock, Timer } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  APERTURES,
  ISOS,
  LIMITS,
  SHUTTERS,
  formatAperture,
  formatShutter,
  formatThirds,
  nearestStop,
  speakShutter,
} from '../../engine';
import type { StopValue } from '../../engine';
import { autoControlled } from '../../state/useCamera';
import type { UseCamera } from '../../state/useCamera';
import { StopSlider, Switch } from '../ui';
import type { StopOption } from '../ui';
import { ApertureIris } from '../viewfinder/ApertureIris';
import { cn } from '../../lib/cn';
import { Dial } from './Dial';

export type LockableParam = 'aperture' | 'shutter' | 'iso' | 'focal';

export interface ExposureControlsProps {
  cam: UseCamera;
  /** Apertura máxima del objetivo (número f). Limita la escala de aperturas. */
  lensMaxAperture?: number;
  variant?: 'sliders' | 'dials';
  /** Muestra la compensación de exposición cuando el modo la usa (A, S, P o M con Auto-ISO). */
  showCompensation?: boolean;
  /** Parámetros fijados por el ejercicio ('focal' no tiene control aquí: lo usa QuickSettings). */
  locked?: LockableParam[];
}

const HINTS = {
  aperture: ['Más luz · fondo desenfocado', 'Menos luz · todo nítido'],
  shutter: ['Congela el movimiento · menos luz', 'Más luz · barrido y trepidación'],
  iso: ['Imagen limpia · menos sensible', 'Más sensible · más ruido'],
  comp: ['Más oscura', 'Más clara'],
} satisfies Record<string, [string, string]>;

const LIMITED_MESSAGE = {
  aperture: 'El objetivo no puede abrir o cerrar más: la foto quedará mal expuesta.',
  shutter: 'La velocidad necesaria está fuera de la escala (1/4000 – 30"): la foto quedará mal expuesta.',
  iso: `El Auto-ISO llegó a su límite (100 – ${LIMITS.autoIsoMax}): la foto quedará mal expuesta.`,
} as const;

/** Compensación de exposición: −3…+3 EV en tercios. */
const COMP_OPTIONS: StopOption[] = Array.from({ length: 19 }, (_, k) => {
  const t = k - 9;
  return { label: t === 0 ? '0' : formatThirds(t / 3), major: t % 3 === 0 };
});

const toOptions = (scale: StopValue[]): StopOption[] => scale.map((s) => ({ label: s.label, major: s.fullStop }));

/** Icono de compensación (cuadro con "+" y "−"). */
function CompIcon() {
  return (
    <svg viewBox="0 0 16 16" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" />
      <path d="M14.5 1.5L1.5 14.5M3.6 5.6h4M5.6 3.6v4M8.8 11h4" strokeLinecap="round" />
    </svg>
  );
}

function LockedIcon() {
  return (
    <span title="Bloqueado en este ejercicio" className="inline-flex text-faint">
      <Lock size={13} aria-hidden="true" />
    </span>
  );
}

/** Etiqueta corta impresa en el dial de velocidades, como en los cuerpos Fujifilm ("250", "2″"). */
const shutterTick = (o: StopOption, k: number) => {
  const s = SHUTTERS[k];
  if (!s?.fullStop) return null;
  return o.label.startsWith('1/') ? o.label.slice(2) : o.label;
};

export function ExposureControls({
  cam,
  lensMaxAperture = LIMITS.minAperture,
  variant = 'sliders',
  showCompensation = true,
  locked = [],
}: ExposureControlsProps) {
  const { settings, effective, resolved } = cam;
  const auto = autoControlled(settings);
  const isLocked = (p: LockableParam) => locked.includes(p);

  // Escala de aperturas limitada por el objetivo
  const minApIdx = nearestStop(APERTURES, lensMaxAperture).index;
  const apScale = APERTURES.slice(minApIdx);
  const apOptions = toOptions(apScale);
  const apIndex = Math.max(0, nearestStop(APERTURES, effective.aperture).index - minApIdx);
  const shOptions = toOptions(SHUTTERS);
  const shIndex = nearestStop(SHUTTERS, effective.shutter).index;
  const isoOptions = toOptions(ISOS);
  const isoIndex = nearestStop(ISOS, effective.iso).index;

  const compVisible = showCompensation && (settings.mode !== 'M' || settings.autoIso);
  const compIndex = Math.round(settings.exposureComp * 3) + 9;
  const compLabel = formatThirds(settings.exposureComp);

  const limitedDisplay = (p: 'aperture' | 'shutter' | 'iso', text: string): ReactNode =>
    resolved.limited === p ? <span className="blink text-danger">{text}</span> : text;

  const lockSuffix = (p: LockableParam) => (isLocked(p) ? ' (bloqueado)' : '');

  const controls = [
    {
      key: 'aperture' as const,
      label: 'Apertura',
      icon: <ApertureIris fNumber={effective.aperture} size={22} maxAperture={apScale[0]?.value ?? lensMaxAperture} />,
      options: apOptions,
      index: apIndex,
      onChange: (k: number) => {
        const s = apScale[k];
        if (s) cam.set({ aperture: s.value });
      },
      valueText: `${formatAperture(effective.aperture)}${auto.aperture ? ', automático' : ''}${lockSuffix('aperture')}`,
      display: formatAperture(effective.aperture),
      auto: auto.aperture,
      hints: HINTS.aperture,
      labelEvery: 1,
      tick: undefined,
    },
    {
      key: 'shutter' as const,
      label: 'Velocidad de obturación',
      icon: <Timer size={16} aria-hidden="true" />,
      options: shOptions,
      index: shIndex,
      onChange: (k: number) => {
        const s = SHUTTERS[k];
        if (s) cam.set({ shutter: s.value });
      },
      valueText: `${speakShutter(effective.shutter)}${auto.shutter ? ', automática' : ''}${lockSuffix('shutter')}`,
      display: formatShutter(effective.shutter),
      auto: auto.shutter,
      hints: HINTS.shutter,
      labelEvery: 3,
      tick: shutterTick,
    },
    {
      key: 'iso' as const,
      label: 'ISO',
      icon: <Gauge size={16} aria-hidden="true" />,
      options: isoOptions,
      index: isoIndex,
      onChange: (k: number) => {
        const s = ISOS[k];
        if (s) cam.set({ iso: s.value });
      },
      valueText: `ISO ${ISOS[isoIndex]?.label ?? ''}${auto.iso ? ', automático' : ''}${lockSuffix('iso')}`,
      display: ISOS[isoIndex]?.label ?? '',
      auto: auto.iso,
      hints: HINTS.iso,
      labelEvery: 2,
      tick: (o: StopOption, k: number) => (o.major && k % 6 === 0 ? o.label : null),
    },
  ];

  const autoIsoSwitch = (
    <Switch
      label="Auto-ISO"
      description={`La cámara sube el ISO solo cuando hace falta (máx. ${LIMITS.autoIsoMax}).`}
      checked={settings.autoIso}
      onChange={(v) => cam.set({ autoIso: v })}
      disabled={isLocked('iso')}
    />
  );

  const limitedNote = (p: 'aperture' | 'shutter' | 'iso') =>
    resolved.limited === p ? (
      <p role="status" className="mt-2 text-xs leading-snug text-danger">
        {LIMITED_MESSAGE[p]}
      </p>
    ) : null;

  const compensation = compVisible && (
    <div>
      <StopSlider
        label="Compensación de exposición"
        icon={<CompIcon />}
        options={COMP_OPTIONS}
        index={compIndex}
        onChange={(k) => cam.set({ exposureComp: (k - 9) / 3 })}
        valueText={`${compLabel === '0' ? '±0' : compLabel} EV`}
        display={
          <span className={cn(settings.exposureComp !== 0 && 'text-amber')}>
            {compLabel === '0' ? '±0' : compLabel} <span className="text-xs text-faint">EV</span>
          </span>
        }
        hints={HINTS.comp}
      />
      <p className="mt-2 text-xs leading-snug text-faint">
        {settings.mode === 'M'
          ? 'Con Auto-ISO, la cámara ajusta el ISO para llegar a esta lectura.'
          : 'La cámara buscará esta lectura del exposímetro en lugar de 0.'}
      </p>
    </div>
  );

  if (variant === 'dials') {
    return (
      <div className="@container">
        <div className="grid grid-cols-1 gap-x-4 gap-y-8 @sm:grid-cols-2 @2xl:grid-cols-3">
          {controls.map((c) => (
            <div key={c.key} className={cn('min-w-0', c.key === 'iso' && '@sm:col-span-2 @2xl:col-span-1')}>
              <Dial
                label={c.label}
                icon={c.icon}
                badge={isLocked(c.key) ? <LockedIcon /> : undefined}
                options={c.options}
                index={c.index}
                onChange={c.onChange}
                valueText={c.valueText}
                display={c.display}
                auto={c.auto}
                warning={resolved.limited === c.key}
                disabled={isLocked(c.key) && !c.auto}
                hints={c.hints}
                labelSize={12.5}
                tickLabel={c.tick}
                size={184}
                className="mx-auto w-full max-w-[220px]"
              />
              {limitedNote(c.key)}
              {c.key === 'iso' && <div className="mx-auto mt-4 max-w-[280px]">{autoIsoSwitch}</div>}
            </div>
          ))}
        </div>
        {compensation && <div className="mt-8">{compensation}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {controls.map((c) => (
        <div key={c.key}>
          <StopSlider
            label={c.label}
            icon={
              <>
                {isLocked(c.key) && <LockedIcon />}
                {c.icon}
              </>
            }
            options={c.options}
            index={c.index}
            onChange={c.onChange}
            valueText={c.valueText}
            display={limitedDisplay(c.key, c.display)}
            auto={c.auto}
            disabled={isLocked(c.key) && !c.auto}
            hints={c.hints}
            labelEvery={c.labelEvery}
          />
          {limitedNote(c.key)}
          {c.key === 'iso' && <div className="mt-4">{autoIsoSwitch}</div>}
        </div>
      ))}
      {compensation}
    </div>
  );
}
