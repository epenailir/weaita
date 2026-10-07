/**
 * Perilla rotatoria física (como el dial de velocidades de una cámara vista desde arriba).
 * El índice ámbar está fijo arriba y la perilla gira debajo; la lectura grande queda en la
 * tapa central. Se maneja arrastrando (en círculo sobre el borde o en vertical sobre el centro),
 * con la rueda del mouse cuando tiene el foco y con el teclado:
 * flechas (±1), RePág/AvPág (±3 = un paso completo), Inicio/Fin.
 */
import { useCallback, useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { cn } from '../../lib/cn';

/** Compatible con StopValue (fullStop) del motor y con StopOption (major) de la UI. */
export interface DialOption {
  label: string;
  major?: boolean;
  fullStop?: boolean;
}

export interface DialProps<T extends DialOption> {
  label: string;
  options: readonly T[];
  index: number;
  onChange: (index: number) => void;
  /** Texto accesible del valor (p. ej. "1/250 de segundo"). Por defecto, la etiqueta. */
  valueText?: string;
  /** Lectura grande de la tapa central. Por defecto, la etiqueta de la opción. */
  display?: string;
  /** Etiqueta impresa en el dial para cada opción (null = solo muesca). Por defecto, la de los pasos completos. */
  tickLabel?: (option: T, index: number) => string | null;
  /** Grados entre opciones consecutivas. Por defecto se reparte en ~300° (entre 11° y 40°). */
  stepDeg?: number;
  /** Diámetro máximo en px (el dial se encoge con su contenedor). */
  size?: number;
  /** Tamaño de las etiquetas impresas (unidades del viewBox de 200). */
  labelSize?: number;
  /** El valor lo decide la cámara: se atenúa y muestra "AUTO". */
  auto?: boolean;
  /** El automatismo llegó a su límite: la lectura parpadea en rojo, como en una cámara. */
  warning?: boolean;
  disabled?: boolean;
  /** Forma de arrastre: "auto" usa giro en el borde y desplazamiento vertical en el centro. */
  dragMode?: 'auto' | 'circular' | 'vertical';
  hideLabel?: boolean;
  /** Elemento a la izquierda de la etiqueta (icono, candado…). */
  icon?: ReactNode;
  /** Insignia a la derecha de la etiqueta. */
  badge?: ReactNode;
  /** Textos de los extremos: [valores bajos, valores altos]. */
  hints?: [string, string];
  className?: string;
}

const C = 100;
const R_KNOB = 86;
const R_FACE = 77;
const R_CAP = 41;
const R_LABEL = 58;
const VERTICAL_PX_PER_STEP = 10;

const isMajor = (o: DialOption) => o.major ?? o.fullStop ?? true;

function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

export function Dial<T extends DialOption>({
  label,
  options,
  index,
  onChange,
  valueText,
  display,
  tickLabel,
  stepDeg,
  size = 176,
  labelSize = 11,
  auto = false,
  warning = false,
  disabled = false,
  dragMode = 'auto',
  hideLabel = false,
  icon,
  badge,
  hints,
  className,
}: DialProps<T>) {
  const labelId = useId();
  const uid = labelId.replace(/[^a-zA-Z0-9_-]/g, '');
  const knobRef = useRef<HTMLDivElement>(null);
  const max = Math.max(0, options.length - 1);
  const i = Math.max(0, Math.min(max, Math.round(index)));
  const inactive = disabled || auto;
  const step = stepDeg ?? Math.min(40, Math.max(11, 300 / Math.max(1, max)));
  const current = options[i];
  const readout = display ?? current?.label ?? '';

  // Estado más reciente para los manejadores nativos (rueda) y el arrastre
  const live = useRef({ index: i, max, inactive, onChange });
  useEffect(() => {
    live.current = { index: i, max, inactive, onChange };
  });

  const commit = useCallback((next: number) => {
    const { index: cur, max: m, onChange: cb } = live.current;
    const c = Math.max(0, Math.min(m, next));
    if (c !== cur) cb(c);
  }, []);

  // Rueda del mouse: solo con foco, y sin desplazar la página
  useEffect(() => {
    const el = knobRef.current;
    if (!el) return;
    const onWheel = (e: globalThis.WheelEvent) => {
      if (live.current.inactive || document.activeElement !== el) return;
      const d = Math.sign(e.deltaY || e.deltaX);
      if (!d) return;
      e.preventDefault();
      commit(live.current.index - d);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [commit]);

  const drag = useRef<{
    mode: 'circular' | 'vertical';
    cx: number;
    cy: number;
    lastAngle: number;
    accDeg: number;
    startY: number;
    startIndex: number;
  } | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (inactive || e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
    const mode = dragMode === 'auto' ? (dist > (r.width / 2) * 0.48 ? 'circular' : 'vertical') : dragMode;
    drag.current = {
      mode,
      cx,
      cy,
      lastAngle: (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI,
      accDeg: 0,
      startY: e.clientY,
      startIndex: i,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus({ preventScroll: true });
    e.preventDefault();
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    if (d.mode === 'circular') {
      const a = (Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180) / Math.PI;
      let delta = a - d.lastAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      d.accDeg += delta;
      d.lastAngle = a;
      // La perilla sigue al dedo: girar en sentido horario trae los valores menores al índice
      commit(d.startIndex - Math.round(d.accDeg / step));
    } else {
      commit(d.startIndex + Math.round((d.startY - e.clientY) / VERTICAL_PX_PER_STEP));
    }
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (inactive) return;
    let next: number;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = i + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = i - 1;
        break;
      case 'PageUp':
        next = i + 3;
        break;
      case 'PageDown':
        next = i - 3;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = max;
        break;
      default:
        return;
    }
    e.preventDefault();
    commit(next);
  };

  const rotation = -i * step;
  const readoutSize = readout.length <= 3 ? 30 : readout.length <= 5 ? 24 : readout.length <= 6 ? 21 : 18;

  return (
    <div className={cn('flex select-none flex-col items-center', className)}>
      <div className={cn('mb-2 flex w-full items-center justify-center gap-2', hideLabel && 'sr-only')}>
        <span id={labelId} className="flex items-center gap-2 text-[13px] font-medium text-muted">
          {icon}
          {label}
        </span>
        {auto && <span className="osd rounded-xs bg-amber-soft px-1.5 py-px text-[10px] font-semibold tracking-wider text-amber">AUTO</span>}
        {badge}
      </div>

      <div
        ref={knobRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={i}
        aria-valuetext={valueText ?? current?.label}
        aria-disabled={inactive || undefined}
        aria-readonly={auto || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className={cn(
          'relative aspect-square w-full touch-none rounded-full focus-visible:rounded-full',
          inactive ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing',
          disabled && 'opacity-45',
        )}
        style={{ maxWidth: size }}
      >
        <svg viewBox="0 0 200 200" className="block h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <radialGradient id={`${uid}-face`} cx="50%" cy="38%" r="65%">
              <stop offset="0%" stopColor="#262b31" />
              <stop offset="100%" stopColor="#111417" />
            </radialGradient>
            <linearGradient id={`${uid}-cap`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0c0e10" />
              <stop offset="100%" stopColor="#181c20" />
            </linearGradient>
          </defs>

          {/* Cuerpo de la perilla y moleteado (gira) */}
          <circle cx={C} cy={C} r={R_KNOB} fill="#15181b" stroke="var(--color-line-strong)" strokeWidth={1} />
          <g
            className="transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)]"
            style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${C}px ${C}px` }}
          >
            {Array.from({ length: 96 }, (_, k) => {
              const [x1, y1] = polar(R_FACE + 2.5, k * 3.75);
              const [x2, y2] = polar(R_KNOB - 1, k * 3.75);
              return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2a3036" strokeWidth={1.2} />;
            })}
            <circle cx={C} cy={C} r={R_FACE} fill={`url(#${uid}-face)`} stroke="#07080a" strokeWidth={1.2} />

            {/* Muescas y etiquetas impresas */}
            {options.map((o, k) => {
              const rel = (k - i) * step;
              const dist = Math.abs(rel);
              if (dist > 160) return null;
              const fade = dist <= 75 ? 1 : Math.max(0.12, 1 - (dist - 75) / 85);
              const angle = k * step;
              const major = isMajor(o);
              const selected = k === i;
              const [tx1, ty1] = polar(R_FACE - 3, angle);
              const [tx2, ty2] = polar(major ? R_FACE - 11 : R_FACE - 7, angle);
              const text = tickLabel ? tickLabel(o, k) : major ? o.label : null;
              const [lx, ly] = polar(R_LABEL, angle);
              return (
                <g key={k} opacity={fade}>
                  <line
                    x1={tx1}
                    y1={ty1}
                    x2={tx2}
                    y2={ty2}
                    stroke={selected ? 'var(--color-amber)' : major ? 'var(--color-muted)' : 'var(--color-faint)'}
                    strokeWidth={major ? 1.8 : 1.1}
                    strokeLinecap="round"
                  />
                  {text && (
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${angle} ${lx} ${ly})`}
                      fontSize={labelSize}
                      fontWeight={selected ? 600 : 500}
                      fill={selected ? 'var(--color-amber)' : 'var(--color-fg)'}
                      fillOpacity={selected ? 1 : 0.78}
                      className="osd"
                    >
                      {text}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Tapa central fija con la lectura */}
          <circle cx={C} cy={C} r={R_CAP} fill={`url(#${uid}-cap)`} stroke="var(--color-line-strong)" strokeWidth={1} />
          <circle cx={C} cy={C} r={R_CAP - 4} fill="none" stroke="#000" strokeOpacity={0.4} strokeWidth={1} />
          <text
            x={C}
            y={auto ? C - 3 : C}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={readoutSize}
            fontWeight={500}
            fill={warning ? 'var(--color-danger)' : auto ? 'var(--color-amber)' : 'var(--color-fg)'}
            className={cn('osd', warning && 'blink')}
          >
            {readout}
          </text>
          {auto && (
            <text x={C} y={C + 19} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={600} letterSpacing={1.2} fill="var(--color-amber)" className="osd">
              AUTO
            </text>
          )}

          {/* Índice fijo */}
          <path d={`M${C - 6} 1.5 L${C + 6} 1.5 L${C} 11 Z`} fill="var(--color-amber)" />
        </svg>
      </div>

      {hints && (
        <div className="mt-2 flex w-full justify-between gap-3 text-[11px] leading-snug text-faint" style={{ maxWidth: Math.max(size, 200) }}>
          <span>{hints[0]}</span>
          <span className="text-right">{hints[1]}</span>
        </div>
      )}
    </div>
  );
}
