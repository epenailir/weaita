/**
 * Astro: reglas de los 500 y NPF según focal, sensor y apertura. Dibuja el tiempo actual
 * frente a ambos límites y cómo se vería una estrella ampliada en cada caso.
 */
import { Star } from 'lucide-react';
import { SENSORS, SHUTTERS, formatAperture, npfRuleS, rule500S } from '../../engine';
import type { SensorId } from '../../engine';
import { Button } from '../../components/ui';
import { ChipGroup } from '../../components/camera';
import { autoControlled } from '../../state/useCamera';
import { cn } from '../../lib/cn';
import { Readout, ToolBlock, ToolNote } from './bits';
import { starTrailUm } from './experiments';
import { fmtTime, num } from './format';
import type { ToolProps } from './model';

const SENSOR_CHIPS: Array<{ id: SensorId; label: string }> = [
  { id: 'ff', label: 'Full frame' },
  { id: 'apsc', label: 'APS-C' },
  { id: 'apsc-canon', label: 'APS-C Canon' },
  { id: 'mft', label: 'M4/3' },
];

/** Tiempo más largo de la escala que no supera el límite. */
function stopAtOrBelow(limitS: number): number {
  let best = SHUTTERS[0]!.value;
  for (const s of SHUTTERS) if (s.value <= limitS * 1.0001) best = s.value;
  return best;
}

/** Estrella ampliada: un punto que se estira en un trazo de `trailPx` píxeles del sensor. */
function StarCrop({ trailPx, label, tone }: { trailPx: number; label: string; tone: 'data' | 'amber' | 'danger' }) {
  const zoom = 5;
  const len = Math.min(54, trailPx * zoom);
  const color = tone === 'data' ? 'var(--color-data)' : tone === 'amber' ? 'var(--color-amber)' : 'var(--color-danger)';
  return (
    <figure className="m-0 min-w-0 flex-1 text-center">
      <svg viewBox="0 0 72 56" aria-hidden="true" className="block h-auto w-full rounded-sm bg-ink">
        <circle cx="12" cy="44" r="0.8" fill="white" opacity="0.4" />
        <circle cx="58" cy="12" r="0.7" fill="white" opacity="0.35" />
        <line
          x1={36 - len / 2}
          x2={36 + len / 2}
          y1={28 + len * 0.18}
          y2={28 - len * 0.18}
          stroke="white"
          strokeWidth={6}
          strokeLinecap="round"
          opacity={0.92}
        />
        <circle cx={36} cy={28} r={11} fill="none" stroke={color} strokeOpacity={0.35} />
      </svg>
      <figcaption className="mt-1 text-[11px] leading-tight text-faint">
        <span className={cn('osd block text-[12px]', tone === 'data' ? 'text-data' : tone === 'amber' ? 'text-amber' : 'text-danger')}>{num(trailPx)} px</span>
        {label}
      </figcaption>
    </figure>
  );
}

export function StarRulesTool({ cam }: ToolProps) {
  const { settings, effective } = cam;
  const sensor = SENSORS[settings.sensor];
  const f = settings.focalMm;
  const r500 = rule500S(f, sensor);
  const npf = npfRuleS(f, effective.aperture, sensor);
  const t = effective.shutter;
  const tMax = Math.max(35, t * 1.15, r500 * 1.2);
  const pos = (s: number) => `${Math.min(100, (s / tMax) * 100)}%`;
  const trailPx = (s: number) => starTrailUm(f, s) / sensor.pixelPitchUm;
  const tone = t <= npf * 1.001 ? 'data' : t <= r500 * 1.001 ? 'amber' : 'danger';
  const auto = autoControlled(settings);
  const npfStop = stopAtOrBelow(npf);
  const r500Stop = stopAtOrBelow(r500);
  const setShutter = (s: number) => cam.set(auto.shutter ? { mode: 'M', shutter: s } : { shutter: s });
  const ticks = Array.from({ length: Math.floor(tMax / 10) + 1 }, (_, i) => i * 10);

  return (
    <div className="flex flex-col gap-3">
      <ToolBlock title="Tiempo máximo" aside={`${f} mm · ${formatAperture(effective.aperture)}`}>
        <ChipGroup<SensorId>
          label="Sensor"
          hideLabel
          value={settings.sensor}
          onChange={(sensorId) => cam.set({ sensor: sensorId })}
          options={SENSOR_CHIPS.map((c) => ({
            value: c.id,
            label: c.label,
            detail: `×${SENSORS[c.id].crop} · ${SENSORS[c.id].pixelPitchUm} µm`,
            ariaLabel: `${SENSORS[c.id].name}, factor ${SENSORS[c.id].crop}, píxel de ${SENSORS[c.id].pixelPitchUm} micras`,
          }))}
        />

        <dl className="mt-3 space-y-1 rounded-md border border-line bg-ink p-3">
          <div>
            <dt className="eyebrow">Regla de los 500</dt>
            <dd className="osd m-0 mt-0.5 text-[12.5px] text-muted">
              500 ÷ ({f} mm × {sensor.crop}) = <span className="whitespace-nowrap text-amber">{num(r500)} s</span>
            </dd>
          </div>
          <div className="pt-1.5">
            <dt className="eyebrow">Regla NPF</dt>
            <dd className="osd m-0 mt-0.5 text-[12.5px] text-muted">
              (35 × {num(effective.aperture)} + 30 × {sensor.pixelPitchUm} µm) ÷ {f} mm = <span className="whitespace-nowrap text-data">{num(npf)} s</span>
            </dd>
          </div>
        </dl>

        {/* Barra de tiempo */}
        <div className="mt-4" role="img" aria-label={`Tu exposición de ${fmtTime(t)} frente a NPF ${num(npf)} s y regla de los 500 ${num(r500)} s.`}>
          <div className="relative h-7 overflow-hidden rounded-md border border-line bg-ink">
            <div className="absolute inset-y-0 left-0 bg-data/20" style={{ width: pos(npf) }} />
            <div className="absolute inset-y-0 bg-amber/20" style={{ left: pos(npf), width: `calc(${pos(r500)} - ${pos(npf)})` }} />
            <div className="absolute inset-y-0 right-0 bg-danger/15" style={{ left: pos(r500) }} />
            <div className="absolute inset-y-0 w-px bg-data" style={{ left: pos(npf) }} />
            <div className="absolute inset-y-0 w-px bg-amber" style={{ left: pos(r500) }} />
            <div className="absolute inset-y-0 w-[3px] -translate-x-1/2 bg-fg shadow-[0_0_0_2px_var(--color-ink)] transition-[left] duration-150" style={{ left: pos(t) }} />
          </div>
          <div className="osd relative mt-1 h-4 text-[10.5px] text-faint" aria-hidden="true">
            {ticks.map((s, i) => (
              <span key={s} className={cn('absolute', i === 0 ? '' : '-translate-x-1/2')} style={{ left: pos(s) }}>
                {s}
              </span>
            ))}
            <span className="absolute right-0">s</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-faint" aria-hidden="true">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-data/70" />
              Puntuales (NPF)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber/70" />
              Aceptables en pantalla
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-danger/70" />
              Trazos
            </span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <StarCrop trailPx={trailPx(npf)} label="Límite NPF" tone="data" />
          <StarCrop trailPx={trailPx(r500)} label="Regla de 500" tone="amber" />
          <StarCrop trailPx={trailPx(t)} label={`Tú · ${fmtTime(t)}`} tone={tone} />
        </div>
        <ToolNote>Estrella ampliada ×5 en el ecuador celeste, el peor caso; cerca del polo los trazos son más cortos.</ToolNote>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button size="sm" variant="secondary" icon={<Star size={14} aria-hidden="true" />} onClick={() => setShutter(npfStop)}>
            NPF · {fmtTime(npfStop)}
          </Button>
          <Button size="sm" variant="ghost" className="border border-line" onClick={() => setShutter(r500Stop)}>
            500 · {fmtTime(r500Stop)}
          </Button>
        </div>
      </ToolBlock>

      <ToolBlock title="Lo que cuesta cada segundo">
        <dl>
          <Readout label="Trazo con tu tiempo" value={`${num(trailPx(t))} px`} tone={tone} hint={`${num(starTrailUm(f, t), 0)} µm`} />
          <Readout label="Tu tiempo frente a NPF" value={`${Math.round((t / npf) * 100)} %`} tone={tone === 'data' ? 'data' : undefined} />
          <Readout label="Tu tiempo frente a 500" value={`${Math.round((t / r500) * 100)} %`} tone={t <= r500 ? 'data' : 'danger'} />
        </dl>
        <ToolNote>
          Con ISO fijo, acortar el tiempo oscurece la foto: compensa con el ISO o abre más el diafragma. Más focal o un sensor más pequeño (más recorte, píxeles
          más finos) acortan el tiempo disponible.
        </ToolNote>
      </ToolBlock>
    </div>
  );
}
