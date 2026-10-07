/**
 * Deporte: medidor de barrido del sujeto. Calcula con el motor cuánto se mueve el sujeto
 * durante la exposición y la velocidad mínima para congelarlo, separando el barrido del
 * sujeto de la trepidación (que la estabilización sí corrige).
 */
import { useState } from 'react';
import { Timer } from 'lucide-react';
import { REFERENCE_WIDTH_PX, SENSORS, formatDistance, handheldLimitS, motionBlurPx } from '../../engine';
import { Button } from '../../components/ui';
import { ChipGroup } from '../../components/camera';
import { autoControlled } from '../../state/useCamera';
import { cn } from '../../lib/cn';
import { Readout, ToolBlock, ToolNote } from './bits';
import { shutterForBlur } from './checks';
import { fmtLength, fmtPx, fmtSpeed, fmtTime } from './format';
import { liveContext } from './model';
import type { ToolProps } from './model';

type SubjectId = 'player' | 'arms' | 'ball';

/** Escala logarítmica del medidor (px de barrido en 1000 px de ancho). */
const MIN_PX = 0.25;
const MAX_PX = 64;
const posOf = (px: number) => (Math.log(Math.min(MAX_PX, Math.max(MIN_PX, px)) / MIN_PX) / Math.log(MAX_PX / MIN_PX)) * 100;
const ZONES = [
  { to: 1, label: 'Congelado', cls: 'bg-data/70' },
  { to: 3, label: 'Leve', cls: 'bg-amber/70' },
  { to: MAX_PX, label: 'Movido', cls: 'bg-danger/70' },
] as const;
const SCALE_LABELS: Array<[number, string]> = [
  [MIN_PX, '¼'],
  [1, '1'],
  [3, '3'],
  [10, '10'],
  [MAX_PX, '64 px'],
];

export function MotionTool({ cam, lighting }: ToolProps) {
  const [subject, setSubject] = useState<SubjectId>('player');
  const { settings, effective } = cam;
  const sensor = SENSORS[settings.sensor];
  const subjects: Record<SubjectId, { label: string; speed: number }> = {
    player: { label: 'Jugador', speed: lighting.subjectSpeedMS },
    arms: { label: 'Brazos', speed: 12 },
    ball: { label: 'Balón', speed: 25 },
  };
  const speed = subjects[subject].speed;
  const d = lighting.subjectDistanceM;
  const t = effective.shutter;
  const px = motionBlurPx(speed, d, settings.focalMm, t, sensor, REFERENCE_WIDTH_PX);
  const movedM = speed * t;
  const onSensorMm = settings.focalMm * (movedM / d);
  const ctx = liveContext(cam, lighting);
  const freeze = shutterForBlur(ctx, 1, speed);
  const auto = autoControlled(settings);
  const tone = px <= 1 ? 'data' : px <= 3 ? 'amber' : 'danger';
  const handheld = handheldLimitS(settings.focalMm, sensor, 0);
  const stabilized = handheldLimitS(settings.focalMm, sensor, settings.stabilizationStops);
  const streak = Math.min(300, Math.max(0, px) * 6);

  const useFreeze = () => cam.set(auto.shutter ? { mode: 'S', shutter: freeze } : { shutter: freeze });

  return (
    <div className="flex flex-col gap-3">
      <ToolBlock title="Barrido durante la exposición" aside={fmtTime(t)}>
        <ChipGroup<SubjectId>
          label="Qué quieres congelar"
          hideLabel
          value={subject}
          onChange={setSubject}
          options={(Object.keys(subjects) as SubjectId[]).map((id) => ({
            value: id,
            label: subjects[id].label,
            detail: fmtSpeed(subjects[id].speed),
          }))}
        />

        {/* Medidor */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[12.5px] text-muted">Barrido de {subjects[subject].label.toLowerCase()}</span>
            <span className={cn('osd text-lg font-medium', tone === 'data' ? 'text-data' : tone === 'amber' ? 'text-amber' : 'text-danger')}>{fmtPx(px)}</span>
          </div>
          <div className="relative pt-1">
            <div
              role="meter"
              aria-label={`Barrido de ${subjects[subject].label.toLowerCase()}`}
              aria-valuemin={0}
              aria-valuemax={MAX_PX}
              aria-valuenow={Math.min(MAX_PX, Math.round(px * 10) / 10)}
              aria-valuetext={`${fmtPx(px)}: ${px <= 1 ? 'congelado' : px <= 3 ? 'barrido leve' : 'movido'}`}
              className="relative h-2.5 overflow-hidden rounded-full bg-raised"
            >
              {ZONES.map((z, i) => {
                const from = i === 0 ? 0 : posOf(ZONES[i - 1]!.to);
                return <div key={z.label} className={cn('absolute inset-y-0', z.cls)} style={{ left: `${from}%`, width: `${posOf(z.to) - from}%` }} />;
              })}
            </div>
            <div
              aria-hidden="true"
              className="absolute top-0 h-[18px] w-[3px] -translate-x-1/2 rounded-full bg-fg shadow-[0_0_0_2px_var(--color-panel-2)] transition-[left] duration-150"
              style={{ left: `${posOf(px)}%` }}
            />
          </div>
          <div className="osd relative mt-1.5 h-4 text-[10.5px] text-faint" aria-hidden="true">
            {SCALE_LABELS.map(([v, label], i) => (
              <span
                key={label}
                className={cn('absolute', i === 0 ? '' : i === SCALE_LABELS.length - 1 ? '-translate-x-full' : '-translate-x-1/2')}
                style={{ left: `${posOf(v)}%` }}
              >
                {label}
              </span>
            ))}
          </div>
          <div className="mt-1 flex gap-3 text-[11px] text-faint" aria-hidden="true">
            {ZONES.map((z) => (
              <span key={z.label} className="inline-flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', z.cls)} />
                {z.label}
              </span>
            ))}
          </div>
        </div>

        {/* Punto ampliado */}
        <svg viewBox="0 0 340 30" aria-hidden="true" className="mt-3 block h-auto w-full">
          <defs>
            <linearGradient id="sb-streak" x1="0" x2="1">
              <stop offset="0" stopColor="var(--color-fg)" stopOpacity="0.15" />
              <stop offset="1" stopColor="var(--color-fg)" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="340" height="30" rx="5" fill="var(--color-ink)" />
          <rect x={20} y={9} width={streak + 12} height={12} rx={6} fill="url(#sb-streak)" />
          <text x="334" y="19" textAnchor="end" className="osd" fontSize="9" fill="var(--color-faint)">
            un punto ampliado ×6
          </text>
        </svg>

        <dl className="mt-3 border-t border-line pt-2">
          <Readout label={`Recorre en ${fmtTime(t)}`} value={fmtLength(movedM)} />
          <Readout label={`En el sensor (a ${formatDistance(d)}, ${settings.focalMm} mm)`} value={fmtLength(onSensorMm / 1000)} />
          <Readout label="Velocidad mínima para ≤ 1 px" value={fmtTime(freeze)} tone="amber" />
        </dl>
        <Button className="mt-2 w-full" size="sm" variant="secondary" icon={<Timer size={14} aria-hidden="true" />} onClick={useFreeze} disabled={Math.abs(Math.log(freeze / t)) < 0.05}>
          Usar {fmtTime(freeze)}
          {auto.shutter ? ' (modo S)' : ''}
        </Button>
        <ToolNote>
          El barrido crece con la velocidad del sujeto y la focal, y baja con la distancia. Con Auto-ISO la exposición se mantiene sola cuando cambias la
          velocidad.
        </ToolNote>
      </ToolBlock>

      <ToolBlock title="Trepidación ≠ movimiento del sujeto">
        <dl>
          <Readout label={`Límite a pulso con ${settings.focalMm} mm`} value={fmtTime(handheld)} />
          <Readout
            label={settings.stabilizationStops > 0 ? `Con ${settings.stabilizationStops} pasos de estabilización` : 'Sin estabilización'}
            value={fmtTime(stabilized)}
          />
        </dl>
        <ToolNote>
          La estabilización compensa el temblor de tus manos, no al jugador: con ella podrías disparar a {fmtTime(stabilized)} sin trepidación, pero el
          barrido del sujeto a esa velocidad sería de {fmtPx(motionBlurPx(speed, d, settings.focalMm, stabilized, sensor, REFERENCE_WIDTH_PX))}.
        </ToolNote>
      </ToolBlock>
    </div>
  );
}
