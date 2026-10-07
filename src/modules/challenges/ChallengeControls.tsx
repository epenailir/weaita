/**
 * Controles del desafío en modo M: apertura, velocidad, ISO y focal. Los parámetros bloqueados
 * por el desafío muestran candado y no se pueden mover. Bajo cada control, un medidor de costo
 * dice qué se gana y qué se paga (profundidad de campo, movimiento, ruido, ángulo de visión).
 */
import { Gauge, Lock, MoveHorizontal, Timer } from 'lucide-react';
import { memo } from 'react';
import type { ReactNode } from 'react';
import {
  APERTURES,
  FOCAL_LENGTHS,
  ISOS,
  SHUTTERS,
  formatAperture,
  formatDistance,
  formatIso,
  formatShutter,
  nearestStop,
  speakShutter,
} from '../../engine';
import type { CameraSettings, ShotMetrics, StopValue } from '../../engine';
import { StopSlider } from '../../components/ui';
import type { StopOption } from '../../components/ui';
import { ApertureIris } from '../../components/viewfinder';
import type { UseCamera } from '../../state/useCamera';
import type { ChallengeParam } from '../../content/types';
import { cn } from '../../lib/cn';
import { shutterText } from './model';

const APERTURE_OPTIONS: StopOption[] = APERTURES.map((s) => ({
  label: s.label,
  major: s.fullStop,
}));
const SHUTTER_OPTIONS: StopOption[] = SHUTTERS.map((s) => ({
  label: s.label,
  major: s.fullStop,
}));
const ISO_OPTIONS: StopOption[] = ISOS.map((s) => ({
  label: s.label,
  major: s.fullStop,
}));

/** Focales disponibles en la escena (incluye la inicial del desafío aunque no sea estándar). */
export function focalsFor(range: [number, number], initial: number): number[] {
  const set = new Set(FOCAL_LENGTHS.filter((f) => f >= range[0] && f <= range[1]));
  set.add(initial);
  return [...set].sort((a, b) => a - b);
}

type Tone = 'ok' | 'warn' | 'bad';

const TONE_CLASS: Record<Tone, string> = {
  ok: 'text-data',
  warn: 'text-amber',
  bad: 'text-danger',
};
const TONE_WORD: Record<Tone, string> = {
  ok: 'bien',
  warn: 'atención',
  bad: 'riesgo',
};

/** Línea de costo: etiqueta, valor y una barra corta con su estado en palabra (no solo color). */
function Cost({ label, value, level, tone }: { label: string; value: ReactNode; level: number; tone: Tone }) {
  return (
    <div className="flex items-center gap-2 text-[12px] leading-tight">
      <span className="w-[92px] shrink-0 text-faint">{label}</span>
      <span className="relative h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-raised" aria-hidden="true">
        <span
          className={cn('absolute inset-y-0 left-0 rounded-full bg-current transition-[width] duration-200', TONE_CLASS[tone])}
          style={{ width: `${Math.max(4, Math.min(100, level * 100))}%` }}
        />
      </span>
      <span className="osd shrink-0 text-right text-muted">{value}</span>
      <span className="sr-only">({TONE_WORD[tone]})</span>
    </div>
  );
}

function LockBadge() {
  return (
    <span className="osd inline-flex items-center gap-1 rounded-xs border border-line-strong bg-raised px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-muted">
      <Lock size={10} aria-hidden="true" />
      Fijo
    </span>
  );
}

function ControlBlock({ locked, children, costs }: { locked: boolean; children: ReactNode; costs: ReactNode }) {
  return (
    <div className={cn('rounded-md border p-3.5', locked ? 'border-line bg-ink/40' : 'border-line bg-panel-2')}>
      {children}
      <div className="mt-3 space-y-1.5 border-t border-line pt-3">{costs}</div>
    </div>
  );
}

export interface ChallengeControlsProps {
  settings: CameraSettings;
  set: UseCamera['set'];
  locked: ChallengeParam[];
  focals: number[];
  hasStars: boolean;
  metrics: ShotMetrics;
}

const indexIn = (scale: StopValue[], v: number) => nearestStop(scale, v).index;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const ChallengeControls = memo(function ChallengeControls({ settings, set, locked, focals, hasStars, metrics: m }: ChallengeControlsProps) {
  const isLocked = (p: ChallengeParam) => locked.includes(p);
  const lockText = (p: ChallengeParam) => (isLocked(p) ? ', fijo en este desafío' : '');

  const apIndex = indexIn(APERTURES, settings.aperture);
  const shIndex = indexIn(SHUTTERS, settings.shutter);
  const isoIndex = indexIn(ISOS, settings.iso);
  let focalIndex = 0;
  focals.forEach((f, i) => {
    const cur = focals[focalIndex] ?? f;
    if (Math.abs(Math.log(f / settings.focalMm)) < Math.abs(Math.log(cur / settings.focalMm))) focalIndex = i;
  });

  // Medidores de costo
  const dofFar = m.dofFarM >= 1e5 ? Infinity : m.dofFarM;
  const dofSpan = Number.isFinite(dofFar) ? Math.log10(dofFar / Math.max(m.dofNearM, 0.1)) / 3 : 1;
  const handheld = m.shakeRatio > 0 ? m.shutterSeconds / m.shakeRatio : Infinity;
  const motionTone: Tone = m.subjectMotionBlurPx <= 3 ? 'ok' : m.subjectMotionBlurPx <= 10 ? 'warn' : 'bad';
  const shakeTone: Tone = m.shakeRatio <= 1 ? 'ok' : m.shakeRatio <= 2 ? 'warn' : 'bad';
  const starTone: Tone = m.starTrailRatio <= 1 ? 'ok' : m.starTrailRatio <= 1.5 ? 'warn' : 'bad';
  const noiseTone: Tone = m.noiseScore <= 25 ? 'ok' : m.noiseScore <= 55 ? 'warn' : 'bad';

  return (
    <div className="flex flex-col gap-3">
      <ControlBlock
        locked={isLocked('aperture')}
        costs={
          <>
            <Cost label="Zona nítida" value={`${formatDistance(m.dofNearM)} – ${formatDistance(dofFar)}`} level={clamp01(dofSpan)} tone="ok" />
            <Cost label="Fondo difuso" value={`${m.backgroundBlurPct.toFixed(1)} %`} level={clamp01(Math.sqrt(m.backgroundBlurPct / 8))} tone="ok" />
          </>
        }
      >
        <StopSlider
          label="Apertura"
          icon={
            <>
              {isLocked('aperture') && <LockBadge />}
              <ApertureIris fNumber={settings.aperture} size={20} />
            </>
          }
          options={APERTURE_OPTIONS}
          index={apIndex}
          onChange={(k) => {
            const s = APERTURES[k];
            if (s) set({ aperture: s.value });
          }}
          valueText={`${formatAperture(settings.aperture)}${lockText('aperture')}`}
          display={formatAperture(settings.aperture)}
          disabled={isLocked('aperture')}
          hints={['Más luz · fondo difuso', 'Menos luz · todo nítido']}
        />
      </ControlBlock>

      <ControlBlock
        locked={isLocked('shutter')}
        costs={
          <>
            {hasStars ? (
              <Cost label="Estrellas" value={`máx. ${formatShutter(m.maxStarExposureS)}`} level={clamp01(m.starTrailRatio / 2)} tone={starTone} />
            ) : (
              <Cost
                label="Barrido sujeto"
                value={`${m.subjectMotionBlurPx.toFixed(1)} px`}
                level={clamp01(m.subjectMotionBlurPx / 20)}
                tone={motionTone}
              />
            )}
            <Cost
              label="Trepidación"
              value={Number.isFinite(handheld) ? `límite ${formatShutter(handheld)}` : 'sin riesgo'}
              level={clamp01(m.shakeRatio / 3)}
              tone={shakeTone}
            />
          </>
        }
      >
        <StopSlider
          label="Velocidad"
          icon={
            <>
              {isLocked('shutter') && <LockBadge />}
              <Timer size={15} aria-hidden="true" />
            </>
          }
          options={SHUTTER_OPTIONS}
          index={shIndex}
          onChange={(k) => {
            const s = SHUTTERS[k];
            if (s) set({ shutter: s.value });
          }}
          valueText={`${speakShutter(settings.shutter)}${lockText('shutter')}`}
          display={shutterText(settings.shutter)}
          disabled={isLocked('shutter')}
          hints={['Menos luz · congela', 'Más luz · barrido']}
          labelEvery={3}
        />
      </ControlBlock>

      <ControlBlock
        locked={isLocked('iso')}
        costs={
          <>
            <Cost label="Ruido" value={`${m.noiseScore}/100`} level={m.noiseScore / 100} tone={noiseTone} />
            <Cost
              label="Rango dinámico"
              value={`${m.dynamicRangeStops.toFixed(1)} pasos`}
              level={clamp01((m.dynamicRangeStops - 4) / 9)}
              tone={m.dynamicRangeStops >= 10 ? 'ok' : m.dynamicRangeStops >= 8 ? 'warn' : 'bad'}
            />
          </>
        }
      >
        <StopSlider
          label="ISO"
          icon={
            <>
              {isLocked('iso') && <LockBadge />}
              <Gauge size={15} aria-hidden="true" />
            </>
          }
          options={ISO_OPTIONS}
          index={isoIndex}
          onChange={(k) => {
            const s = ISOS[k];
            if (s) set({ iso: s.value });
          }}
          valueText={`ISO ${formatIso(settings.iso)}${lockText('iso')}`}
          display={formatIso(settings.iso)}
          disabled={isLocked('iso')}
          hints={['Limpia', 'Más ruido']}
          labelEvery={2}
        />
      </ControlBlock>

      <ControlBlock
        locked={isLocked('focal')}
        costs={<Cost label="Ángulo de visión" value={`${m.fovHorizontalDeg.toFixed(0)}°`} level={clamp01(m.fovHorizontalDeg / 90)} tone="ok" />}
      >
        <StopSlider
          label="Focal"
          icon={
            <>
              {isLocked('focal') && <LockBadge />}
              <MoveHorizontal size={15} aria-hidden="true" />
            </>
          }
          options={focals.map((f, i) => ({
            label: String(f),
            major: i === 0 || i === focals.length - 1 || [24, 35, 50, 85, 135, 200, 400].includes(f),
          }))}
          index={focalIndex}
          onChange={(k) => {
            const f = focals[k];
            if (f !== undefined) set({ focalMm: f });
          }}
          valueText={`${settings.focalMm} milímetros${lockText('focal')}`}
          display={`${settings.focalMm} mm`}
          disabled={isLocked('focal') || focals.length < 2}
          hints={['Gran angular', 'Teleobjetivo']}
        />
      </ControlBlock>
    </div>
  );
});
