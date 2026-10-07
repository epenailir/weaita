/**
 * Comparación A/B: una toma fijada (A) frente a la imagen actual del visor, lado a lado o con
 * un divisor deslizable (arrastre o teclado), y la tabla de ajustes y resultados de ambas.
 */
import { useEffect, useId, useRef, useState } from 'react';
import type { PointerEvent, RefObject } from 'react';
import { X } from 'lucide-react';
import { formatAperture, formatDistance, formatIso, stops } from '../../engine';
import type { CameraSettings, ShotMetrics } from '../../engine';
import { Button, RangeSlider, Segmented } from '../../components/ui';
import { cn } from '../../lib/cn';
import { evText, pctText, pxText, shutterText, stopsText } from './assessment';
import { coverScale } from './capture';
import type { Shot } from './diagnosis';

export type FrameSubscribe = (listener: () => void) => () => void;

/** Copia en vivo del lienzo principal (se redibuja con cada cuadro del simulador). */
export function LiveMirror({
  source,
  subscribe,
  rollDeg,
  label,
  className,
}: {
  source: RefObject<HTMLCanvasElement | null>;
  subscribe: FrameSubscribe;
  rollDeg: number;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const roll = useRef(rollDeg);
  const drawRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const draw = () => {
      const src = source.current;
      const dst = ref.current;
      if (!src || !dst || !src.width || !src.height) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(dst.clientWidth * dpr));
      const h = Math.max(1, Math.round(dst.clientHeight * dpr));
      if (dst.width !== w || dst.height !== h) {
        dst.width = w;
        dst.height = h;
      }
      const ctx = dst.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      const r = roll.current;
      if (Math.abs(r) > 0.01) {
        const k = coverScale(r, w / h);
        ctx.translate(w / 2, h / 2);
        ctx.rotate((-r * Math.PI) / 180);
        ctx.scale(k, k);
        ctx.translate(-w / 2, -h / 2);
      }
      ctx.drawImage(src, 0, 0, w, h);
      ctx.restore();
    };
    drawRef.current = draw;
    draw();
    const unsubscribe = subscribe(draw);
    const ro = new ResizeObserver(draw);
    if (ref.current) ro.observe(ref.current);
    return () => {
      unsubscribe();
      ro.disconnect();
    };
  }, [source, subscribe]);

  useEffect(() => {
    roll.current = rollDeg;
    drawRef.current();
  }, [rollDeg]);

  return <canvas ref={ref} role="img" aria-label={label} className={cn('block h-full w-full', className)} />;
}

export interface CurrentView {
  sceneName: string;
  settings: CameraSettings;
  effective: CameraSettings;
  metrics: ShotMetrics;
}

interface Row {
  label: string;
  a: string;
  b: string;
  delta?: string;
}

function rowsFor(A: Shot, B: CurrentView): Row[] {
  const ea = A.effective;
  const eb = B.effective;
  const ma = A.metrics;
  const mb = B.metrics;
  const dof = (m: ShotMetrics) => `${formatDistance(m.dofNearM)} – ${formatDistance(m.dofFarM)}`;
  return [
    { label: 'Escena', a: A.sceneName, b: B.sceneName },
    { label: 'Modo', a: A.settings.mode, b: B.settings.mode },
    { label: 'Apertura', a: formatAperture(ea.aperture), b: formatAperture(eb.aperture), delta: stopsText(stops.aperture(ea.aperture, eb.aperture)) },
    { label: 'Velocidad', a: shutterText(ea.shutter), b: shutterText(eb.shutter), delta: stopsText(stops.shutter(ea.shutter, eb.shutter)) },
    { label: 'ISO', a: formatIso(ea.iso), b: formatIso(eb.iso), delta: stopsText(stops.iso(ea.iso, eb.iso)) },
    { label: 'Focal', a: `${ea.focalMm} mm`, b: `${eb.focalMm} mm` },
    { label: 'Exposición', a: evText(ma.exposureOffset), b: evText(mb.exposureOffset) },
    { label: 'Barrido', a: pxText(ma.subjectMotionBlurPx), b: pxText(mb.subjectMotionBlurPx) },
    { label: 'Fondo', a: pctText(ma.backgroundBlurPct), b: pctText(mb.backgroundBlurPct) },
    { label: 'Zona nítida', a: dof(ma), b: dof(mb) },
    { label: 'Ruido', a: `${ma.noiseScore}/100`, b: `${mb.noiseScore}/100` },
  ];
}

type CompareMode = 'side' | 'split';

function initialMode(): CompareMode {
  try {
    return window.matchMedia('(min-width: 640px)').matches ? 'side' : 'split';
  } catch {
    return 'side';
  }
}

export interface CompareABProps {
  shot: Shot;
  current: CurrentView;
  source: RefObject<HTMLCanvasElement | null>;
  subscribe: FrameSubscribe;
  rollDeg: number;
  onClear: () => void;
}

export function CompareAB({ shot, current, source, subscribe, rollDeg, onClear }: CompareABProps) {
  const [mode, setMode] = useState<CompareMode>(initialMode);
  const [split, setSplit] = useState(50);
  const dragging = useRef(false);
  const titleId = useId();
  const rows = rowsFor(shot, current);
  const aLabel = `Toma A (#${shot.id}): ${shot.sceneName}, ${formatAperture(shot.effective.aperture)}, ${shutterText(shot.effective.shutter)}, ISO ${formatIso(shot.effective.iso)}.`;
  const bLabel = `Imagen actual: ${current.sceneName}, ${formatAperture(current.effective.aperture)}, ${shutterText(current.effective.shutter)}, ISO ${formatIso(current.effective.iso)}.`;

  const fromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setSplit(Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 100));
  };

  return (
    <section aria-labelledby={titleId} className="rounded-lg border border-line bg-panel p-4 sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="eyebrow mb-1">Comparación A/B</div>
          <h3 id={titleId} className="text-[16px] font-semibold text-fg">
            Toma #{shot.id} frente a la imagen actual
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Segmented<CompareMode>
            label="Vista de la comparación"
            hideLabel
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'side', label: 'Lado a lado' },
              { value: 'split', label: 'Divisor' },
            ]}
          />
          <Button size="sm" variant="ghost" onClick={onClear} icon={<X size={14} aria-hidden="true" />}>
            Quitar A
          </Button>
        </div>
      </header>

      {mode === 'side' ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <figure className="m-0 min-w-0">
            <img src={shot.image} alt={aLabel} className="block aspect-[3/2] w-full rounded-md border border-line bg-black object-cover" />
            <figcaption className="osd mt-1.5 flex items-center gap-2 text-[11.5px] text-muted">
              <span className="rounded-xs bg-amber px-1 font-semibold text-ink">A</span>#{shot.id} · {formatAperture(shot.effective.aperture)} ·{' '}
              {shutterText(shot.effective.shutter)} · ISO {formatIso(shot.effective.iso)}
            </figcaption>
          </figure>
          <figure className="m-0 min-w-0">
            <div className="aspect-[3/2] w-full overflow-hidden rounded-md border border-line bg-black">
              <LiveMirror source={source} subscribe={subscribe} rollDeg={rollDeg} label={bLabel} />
            </div>
            <figcaption className="osd mt-1.5 flex items-center gap-2 text-[11.5px] text-muted">
              <span className="rounded-xs border border-line-strong px-1 font-semibold text-fg">Actual</span>
              {formatAperture(current.effective.aperture)} · {shutterText(current.effective.shutter)} · ISO {formatIso(current.effective.iso)}
            </figcaption>
          </figure>
        </div>
      ) : (
        <div className="mt-4">
          <div
            className="relative aspect-[3/2] w-full cursor-ew-resize touch-none overflow-hidden rounded-md border border-line bg-black select-none"
            onPointerDown={(e) => {
              dragging.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              fromPointer(e);
            }}
            onPointerMove={(e) => dragging.current && fromPointer(e)}
            onPointerUp={() => {
              dragging.current = false;
            }}
            onPointerCancel={() => {
              dragging.current = false;
            }}
          >
            <LiveMirror source={source} subscribe={subscribe} rollDeg={rollDeg} label={bLabel} className="absolute inset-0" />
            <img
              src={shot.image}
              alt={aLabel}
              draggable={false}
              className="absolute inset-0 block h-full w-full object-cover"
              style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-amber shadow-[0_0_8px_rgb(0_0_0/0.6)]" style={{ left: `${split}%` }}>
              <span className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber bg-ink/80" />
            </div>
            <span aria-hidden="true" className="osd absolute left-2 top-2 rounded-xs bg-amber px-1.5 text-[11px] font-semibold text-ink">
              A · #{shot.id}
            </span>
            <span aria-hidden="true" className="osd absolute right-2 top-2 rounded-xs bg-black/70 px-1.5 text-[11px] font-semibold text-white">
              Actual
            </span>
          </div>
          <RangeSlider
            className="mt-3"
            label="Posición del divisor"
            value={split}
            min={0}
            max={100}
            step={1}
            onChange={(v) => setSplit(Math.round(v))}
            format={(v) => `${Math.round(v)} % A`}
            hints={['Todo actual', 'Todo A']}
          />
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-[12.5px]">
          <caption className="sr-only">Ajustes y resultados de la toma A y de la imagen actual</caption>
          <thead>
            <tr className="eyebrow border-b border-line">
              <th scope="col" className="py-2 pr-3 font-normal">
                Dato
              </th>
              <th scope="col" className="py-2 pr-3 font-normal">
                A · #{shot.id}
              </th>
              <th scope="col" className="py-2 pr-3 font-normal">
                Actual
              </th>
              <th scope="col" className="py-2 font-normal">
                Luz (A → actual)
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const differs = r.a !== r.b;
              return (
                <tr key={r.label} className="border-b border-line/60">
                  <th scope="row" className="py-1.5 pr-3 font-normal text-muted">
                    {r.label}
                  </th>
                  <td className="osd py-1.5 pr-3 text-fg">{r.a}</td>
                  <td className={cn('osd py-1.5 pr-3', differs ? 'text-amber' : 'text-fg')}>{r.b}</td>
                  <td className="osd py-1.5 text-faint">{r.delta && differs ? r.delta : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
