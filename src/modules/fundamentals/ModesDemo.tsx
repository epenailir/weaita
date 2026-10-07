import { useEffect, useMemo } from 'react';
import { Lock, Unlock } from 'lucide-react';
import {
  APERTURES,
  ISOS,
  SHUTTERS,
  formatAperture,
  formatEV,
  formatIso,
  formatShutter,
  formatThirds,
  nearestStop,
  speakShutter,
} from '../../engine';
import type { CameraMode } from '../../engine';
import { SCENES } from '../../sim/scenes';
import { autoControlled, useCamera } from '../../state/useCamera';
import { Badge, Callout, RangeSlider, Segmented, StopSlider, Switch } from '../../components/ui';
import { cn } from '../../lib/cn';

const MODE_OPTIONS: Array<{ value: CameraMode; label: string; ariaLabel: string }> = [
  { value: 'P', label: 'P', ariaLabel: 'Programa' },
  { value: 'A', label: 'A / Av', ariaLabel: 'Prioridad de apertura' },
  { value: 'S', label: 'S / Tv', ariaLabel: 'Prioridad de obturación' },
  { value: 'M', label: 'M', ariaLabel: 'Manual' },
];

const MODE_TEXT: Record<CameraMode, { title: string; body: string }> = {
  P: { title: 'Programa', body: 'La cámara elige apertura y velocidad. Tú decides ISO y compensación, y puedes desplazar el programa.' },
  A: { title: 'Prioridad de apertura', body: 'Eliges la apertura para controlar la profundidad de campo; la cámara calcula la velocidad.' },
  S: { title: 'Prioridad de obturación', body: 'Eliges la velocidad para congelar o barrer el movimiento; la cámara calcula la apertura.' },
  M: { title: 'Manual', body: 'Tú decides los tres valores. El exposímetro te indica si vas sobre o bajo la exposición correcta.' },
};

const toOptions = (scale: typeof APERTURES) => scale.map((s) => ({ label: s.label, major: s.fullStop }));
const APERTURE_OPTS = toOptions(APERTURES);
const SHUTTER_OPTS = toOptions(SHUTTERS);
const ISO_OPTS = toOptions(ISOS);

function Owner({ auto }: { auto: boolean }) {
  return auto ? (
    <span className="inline-flex items-center gap-1 text-[11px] text-amber">
      <Lock size={12} aria-hidden="true" /> Cámara
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] text-data">
      <Unlock size={12} aria-hidden="true" /> Tú
    </span>
  );
}

export function ModesDemo({ mode, onModeChange }: { mode: CameraMode; onModeChange: (m: CameraMode) => void }) {
  const lighting = SCENES.plaza.lighting;
  const cam = useCamera(lighting, { mode, aperture: 4, shutter: 1 / 256, iso: 200 });
  const { settings, effective, metrics, resolved, set } = cam;

  // Sincroniza el modo elegido fuera del componente
  useEffect(() => {
    set({ mode });
  }, [mode, set]);

  const auto = autoControlled(settings);
  const meter = metrics.meterReading;
  const meterTone = Math.abs(meter) <= 0.34 ? 'data' : 'danger';
  const text = MODE_TEXT[settings.mode];
  const showComp = settings.mode !== 'M' || settings.autoIso;

  const idx = useMemo(
    () => ({
      a: nearestStop(APERTURES, effective.aperture).index,
      t: nearestStop(SHUTTERS, effective.shutter).index,
      i: nearestStop(ISOS, effective.iso).index,
    }),
    [effective],
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <Segmented label="Dial de modos" options={MODE_OPTIONS} value={settings.mode} onChange={onModeChange} stretch />
        <div className="rounded-lg border border-line bg-panel-2 p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="osd flex h-8 w-8 items-center justify-center rounded-md bg-amber text-lg font-semibold text-ink">{settings.mode}</span>
            <h4 className="text-[15px] font-semibold">{text.title}</h4>
          </div>
          <p className="text-[13.5px] leading-relaxed text-muted">{text.body}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { k: 'Apertura', v: formatAperture(effective.aperture), auto: auto.aperture },
            { k: 'Velocidad', v: formatShutter(effective.shutter), auto: auto.shutter },
            { k: 'ISO', v: formatIso(effective.iso), auto: auto.iso },
          ].map((c) => (
            <div key={c.k} className={cn('rounded-md border p-3', c.auto ? 'border-amber/30 bg-amber-soft' : 'border-line bg-ink')}>
              <div className="eyebrow mb-1">{c.k}</div>
              <div className={cn('osd text-lg', c.auto ? 'text-amber' : 'text-fg')}>{c.v}</div>
              <Owner auto={c.auto} />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-md border border-line bg-ink px-4 py-3">
          <span className="text-[13px] text-muted">Exposímetro (plaza al caer la tarde, EV {lighting.ev100})</span>
          <span className={cn('osd text-base', meterTone === 'data' ? 'text-data' : 'text-danger')}>{formatEV(meter)} EV</span>
        </div>
        {resolved.limited && (
          <Callout kind="warning" title="El automatismo llegó al límite">
            La cámara no puede compensar con {resolved.limited === 'aperture' ? 'la apertura' : resolved.limited === 'shutter' ? 'la velocidad' : 'el ISO'}: en un visor real ese valor
            parpadearía. Cambia otro parámetro.
          </Callout>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-5 rounded-lg border border-line bg-panel p-5">
        <StopSlider
          label="Apertura"
          options={APERTURE_OPTS}
          index={idx.a}
          onChange={(i) => set({ aperture: APERTURES[i]!.value })}
          auto={auto.aperture}
          valueText={formatAperture(effective.aperture)}
          display={formatAperture(effective.aperture)}
          hints={['Más luz · fondo borroso', 'Menos luz · todo nítido']}
          labelEvery={2}
        />
        <StopSlider
          label="Velocidad de obturación"
          options={SHUTTER_OPTS}
          index={idx.t}
          onChange={(i) => set({ shutter: SHUTTERS[i]!.value })}
          auto={auto.shutter}
          valueText={speakShutter(effective.shutter)}
          hints={['Congela', 'Barre el movimiento']}
          labelEvery={3}
        />
        <StopSlider
          label="ISO"
          options={ISO_OPTS}
          index={idx.i}
          onChange={(i) => set({ iso: ISOS[i]!.value })}
          auto={auto.iso}
          hints={['Limpio', 'Más ruido']}
          labelEvery={2}
        />
        <Switch
          label="Auto-ISO"
          description="La cámara ajusta el ISO para mantener la exposición."
          checked={settings.autoIso}
          onChange={(v) => set({ autoIso: v })}
        />
        {showComp && (
          <RangeSlider
            label="Compensación de exposición"
            value={settings.exposureComp}
            min={-3}
            max={3}
            step={1 / 3}
            onChange={(v) => set({ exposureComp: v })}
            format={(v) => `${formatThirds(v)} EV`}
            hints={['Más oscura', 'Más clara']}
          />
        )}
        <div className="flex flex-wrap gap-2">
          <Badge tone="data">Verde = lo decides tú</Badge>
          <Badge tone="amber">Ámbar = lo decide la cámara</Badge>
        </div>
      </div>
    </div>
  );
}
