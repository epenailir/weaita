/**
 * Street: enfoque por zona. Un anillo de enfoque como el de un objetivo manual: la escala de
 * distancias gira bajo el índice y la escala de profundidad de campo (fija) marca los
 * límites de la zona nítida para cada diafragma.
 */
import { useEffect, useRef } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { APERTURES, SENSORS, depthOfField, formatAperture, formatDistance, nearestStop } from '../../engine';
import { ChipGroup } from '../../components/camera';
import { FOCUS_INFINITY_M } from '../../components/viewfinder';
import { cn } from '../../lib/cn';
import { distanceToU, tickLabel, uToDistance } from './DistanceAxis';
import type { ScaleRange } from './DistanceAxis';
import { PassIcon, Readout, ToolBlock, ToolNote } from './bits';
import { fmtDepth, fmtZone } from './format';
import { isInfinity } from './model';
import type { ToolProps } from './model';

const RING: ScaleRange = { min: 0.7, max: 30, infStart: 0.86 };
/** Píxeles del SVG por unidad de recorrido: el anillo muestra solo una ventana de la escala. */
const K = 420;
const W = 340;
const CX = W / 2;
const RING_TICKS = [0.7, 1, 1.5, 2, 3, 5, 10, 30, Infinity];
/** Posiciones del anillo para el teclado (como los clics de un anillo con topes). */
const STEPS = [0.7, 0.8, 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 7, 10, 15, 30, FOCUS_INFINITY_M];
const STREET_STOPS = ['4', '5.6', '8', '11', '16'] as const;
type StreetStop = (typeof STREET_STOPS)[number];
/** Diafragmas grabados en la escala de profundidad de campo. */
const SCALE_STOPS = [4, 8, 16];
const TARGET: [number, number] = [2, 7];

function stepIndex(m: number): number {
  let best = 0;
  STEPS.forEach((s, i) => {
    const d = (x: number) => (isInfinity(x) ? 1e3 : x);
    if (Math.abs(Math.log(d(s) / d(m))) < Math.abs(Math.log(d(STEPS[best] ?? s) / d(m)))) best = i;
  });
  return best;
}

/** Redondeo "de anillo": 1 cm de cerca, 5 cm hasta 10 m, 50 cm más lejos. */
function ringRound(m: number): number {
  if (!Number.isFinite(m)) return FOCUS_INFINITY_M;
  const q = m < 1 ? 0.01 : m < 10 ? 0.05 : 0.5;
  return Math.max(RING.min, Math.round(m / q) * q);
}

export function ZoneFocusTool({ cam }: ToolProps) {
  const { settings, effective, metrics } = cam;
  const sensor = SENSORS[settings.sensor];
  const ringRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; u: number } | null>(null);
  const uFocus = distanceToU(settings.focusM, RING);
  const x = (m: number) => CX + (distanceToU(m, RING) - uFocus) * K;
  const xn = x(metrics.dofNearM);
  const xf = x(metrics.dofFarM);
  const covers = metrics.dofNearM <= TARGET[0] && metrics.dofFarM >= TARGET[1];
  const currentStop = nearestStop(APERTURES, effective.aperture).label;
  const stopValue = (label: string) => APERTURES.find((a) => a.label === label)?.value ?? effective.aperture;
  const idx = stepIndex(settings.focusM);

  const setFocus = (m: number) => cam.set({ focusM: ringRound(m), af: 'MF' });

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const delta: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 3, PageDown: -3 };
    let next: number | null = null;
    if (e.key in delta) next = Math.max(0, Math.min(STEPS.length - 1, idx + (delta[e.key] ?? 0)));
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = STEPS.length - 1;
    if (next === null) return;
    e.preventDefault();
    const m = STEPS[next];
    if (m !== undefined) cam.set({ focusM: m, af: 'MF' });
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, u: uFocus };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = ringRef.current;
    if (!d || !el) return;
    // Arrastrar la escala hacia la izquierda trae distancias más lejanas bajo el índice.
    const scale = W / el.getBoundingClientRect().width;
    const u = Math.max(0, Math.min(1, d.u - ((e.clientX - d.x) * scale) / K));
    setFocus(uToDistance(u, RING));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  // Rueda del mouse solo con el anillo enfocado (listener no pasivo).
  const latest = useRef({ idx, set: cam.set });
  useEffect(() => {
    latest.current = { idx, set: cam.set };
  });
  useEffect(() => {
    const el = ringRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (document.activeElement !== el) return;
      e.preventDefault();
      const next = Math.max(0, Math.min(STEPS.length - 1, latest.current.idx + (e.deltaY < 0 ? 1 : -1)));
      const m = STEPS[next];
      if (m !== undefined) latest.current.set({ focusM: m, af: 'MF' });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Patrón de moleteado que se desplaza con el giro del anillo.
  const knurlOffset = ((-uFocus * K) % 6 + 6) % 6;
  const zoneText = `Enfoque a ${formatDistance(settings.focusM)}; zona nítida de ${fmtZone(metrics.dofNearM, metrics.dofFarM)} a ${formatAperture(effective.aperture)}`;

  return (
    <div className="flex flex-col gap-3">
      <ToolBlock title="Anillo de enfoque" aside={formatDistance(settings.focusM)}>
        <div
          ref={ringRef}
          role="slider"
          tabIndex={0}
          aria-label="Anillo de enfoque"
          aria-valuemin={0}
          aria-valuemax={STEPS.length - 1}
          aria-valuenow={idx}
          aria-valuetext={zoneText}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="cursor-ew-resize touch-pan-y select-none rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
        >
          <svg viewBox={`0 0 ${W} 132`} aria-hidden="true" className="block h-auto w-full">
            <defs>
              <linearGradient id="sb-zf-fade" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="white" stopOpacity="0" />
                <stop offset="0.14" stopColor="white" stopOpacity="1" />
                <stop offset="0.86" stopColor="white" stopOpacity="1" />
                <stop offset="1" stopColor="white" stopOpacity="0" />
              </linearGradient>
              <mask id="sb-zf-mask">
                <rect x="0" y="0" width={W} height="132" fill="url(#sb-zf-fade)" />
              </mask>
              <linearGradient id="sb-zf-barrel" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#2a3036" />
                <stop offset="0.5" stopColor="#15181c" />
                <stop offset="1" stopColor="#0d0f11" />
              </linearGradient>
            </defs>

            {/* Parte fija con la escala de profundidad de campo */}
            <rect x="0" y="0" width={W} height="44" rx="6" fill="var(--color-ink)" />
            <g mask="url(#sb-zf-mask)">
              {SCALE_STOPS.map((n) => {
                const dof = depthOfField(settings.focalMm, n, settings.focusM, sensor.cocMm);
                const active = Math.abs(Math.log(n / effective.aperture)) < 0.05;
                const color = active ? 'var(--color-amber)' : 'var(--color-faint)';
                return [x(dof.nearM), x(dof.farM)].map((px, side) => (
                  <g key={`${n}-${side}`}>
                    <line x1={px} x2={px} y1={30} y2={44} stroke={color} strokeWidth={active ? 1.6 : 1} />
                    <text x={px} y={24} textAnchor="middle" className="osd" fontSize={10} fill={color} fontWeight={active ? 600 : 400}>
                      {n}
                    </text>
                  </g>
                ));
              })}
              {!SCALE_STOPS.some((n) => Math.abs(Math.log(n / effective.aperture)) < 0.05) &&
                [xn, xf].map((px, side) => (
                  <g key={`cur-${side}`}>
                    <line x1={px} x2={px} y1={30} y2={44} stroke="var(--color-amber)" strokeWidth={1.6} />
                    <text x={px} y={24} textAnchor="middle" className="osd" fontSize={10} fill="var(--color-amber)" fontWeight={600}>
                      {currentStop}
                    </text>
                  </g>
                ))}
            </g>
            <path d={`M${CX - 5} 30 L${CX + 5} 30 L${CX} 40 Z`} fill="var(--color-amber)" />
            <line x1={CX} x2={CX} y1={40} y2={50} stroke="var(--color-amber)" strokeWidth={1.6} />

            {/* Anillo que gira */}
            <rect x="0" y="46" width={W} height="62" rx="6" fill="url(#sb-zf-barrel)" />
            <g mask="url(#sb-zf-mask)">
              <rect
                x={Math.min(xn, xf)}
                y={50}
                width={Math.max(2, Math.abs(xf - xn))}
                height={22}
                rx={3}
                fill="var(--color-amber-soft)"
                stroke="var(--color-amber)"
                strokeOpacity={0.5}
              />
              {RING_TICKS.map((t) => (
                <g key={String(t)}>
                  <line x1={x(t)} x2={x(t)} y1={50} y2={58} stroke="var(--color-fg)" strokeWidth={1.2} />
                  <text x={x(t)} y={70} textAnchor="middle" className="osd" fontSize={11} fill="var(--color-fg)">
                    {tickLabel(t)}
                  </text>
                </g>
              ))}
              {/* Zona objetivo 2–7 m */}
              <path
                d={`M${x(TARGET[0])} 78 v5 H${x(TARGET[1])} v-5`}
                fill="none"
                stroke="var(--color-data)"
                strokeWidth={1.4}
                strokeDasharray="4 2"
              />
              <text x={(x(TARGET[0]) + x(TARGET[1])) / 2} y={94} textAnchor="middle" className="osd" fontSize={9} fill="var(--color-data)">
                OBJETIVO 2–7 m
              </text>
              {/* Moleteado */}
              {Array.from({ length: Math.ceil(W / 6) + 1 }, (_, i) => (
                <line key={i} x1={i * 6 - knurlOffset} x2={i * 6 - knurlOffset} y1={99} y2={107} stroke="#3a4148" strokeWidth={2} />
              ))}
            </g>
            <text x={W - 8} y={126} textAnchor="end" className="osd" fontSize={8.5} fill="var(--color-faint)">
              m · arrastra o usa ← →
            </text>
          </svg>
        </div>

        <div className={cn('mt-3 flex items-start gap-2 rounded-md border px-3 py-2', covers ? 'border-data/30 bg-data-soft' : 'border-line bg-ink')}>
          <PassIcon pass={covers} className="mt-0.5" />
          <p className="text-[12.5px] leading-snug text-muted">
            {covers ? (
              <>
                <span className="text-fg">Zona cubierta.</span> Todo lo que pase entre {formatDistance(TARGET[0])} y {formatDistance(TARGET[1])} sale nítido sin
                tocar el enfoque.
              </>
            ) : (
              <>
                <span className="text-fg">Aún no cubre de 2 a 7 m.</span>{' '}
                {metrics.dofNearM > TARGET[0] ? `Cerca empieza en ${formatDistance(metrics.dofNearM)}. ` : ''}
                {metrics.dofFarM < TARGET[1] ? `Lejos termina en ${formatDistance(metrics.dofFarM)}. ` : ''}
                Mira en qué diafragma de la escala fija los dos trazos abarcan la zona verde.
              </>
            )}
          </p>
        </div>
      </ToolBlock>

      <ToolBlock title="Diafragma" aside={formatAperture(effective.aperture)}>
        <ChipGroup<StreetStop>
          label="Diafragma para la zona"
          hideLabel
          value={(STREET_STOPS as readonly string[]).includes(currentStop) ? (currentStop as StreetStop) : null}
          onChange={(label) => cam.set({ aperture: stopValue(label) })}
          options={STREET_STOPS.map((label) => {
            const d = depthOfField(settings.focalMm, stopValue(label), settings.focusM, sensor.cocMm);
            return {
              value: label,
              label: <span className="osd">f/{label}</span>,
              ariaLabel: `f/${label}: zona nítida de ${fmtZone(d.nearM, d.farM)}`,
              detail: fmtDepth(d.nearM, d.farM),
            };
          })}
        />
        <dl className="mt-3 border-t border-line pt-2">
          <Readout label="Zona nítida" value={fmtZone(metrics.dofNearM, metrics.dofFarM)} tone={covers ? 'data' : undefined} />
          <Readout label="Profundidad total" value={fmtDepth(metrics.dofNearM, metrics.dofFarM)} />
          <Readout label="Hiperfocal" value={formatDistance(metrics.hyperfocalM)} hint={`${settings.focalMm} mm`} />
        </dl>
        <ToolNote>Girar el anillo pasa la cámara a MF. Con la zona prefijada solo te preocupas por el encuadre y el momento.</ToolNote>
      </ToolBlock>
    </div>
  );
}
