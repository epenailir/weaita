/**
 * Histograma en vivo dibujado como trazados SVG (nítido en cualquier densidad de píxeles).
 * Variante RGB: tres canales superpuestos con mezcla "screen" (donde coinciden se ve blanco).
 * Variante luma: un solo trazado de luminancia.
 */
import { useMemo } from 'react';
import type { Histogram as HistogramData } from '../../engine/types';
import { cn } from '../../lib/cn';
import type { HistogramProps } from './types';

const VW = 64;
const VH = 40;
/** Porcentaje a partir del cual el recorte se considera relevante. */
const CLIP_WARN_PCT = 1;

/** Trazado suavizado (cuadráticas por puntos medios) de un canal normalizado 0–1. */
function channelPath(values: Float32Array): string {
  const n = values.length;
  if (n === 0) return '';
  const sx = VW / n;
  const pts = Array.from(values, (v, i) => [(i + 0.5) * sx, VH - Math.min(1, Math.max(0, v)) * (VH - 1.5)] as const);
  const first = pts[0]!;
  const last = pts[n - 1]!;
  let d = `M0 ${VH} L0 ${first[1].toFixed(2)} L${first[0].toFixed(2)} ${first[1].toFixed(2)}`;
  for (let i = 1; i < n - 1; i++) {
    const p = pts[i]!;
    const q = pts[i + 1]!;
    d += ` Q${p[0].toFixed(2)} ${p[1].toFixed(2)} ${((p[0] + q[0]) / 2).toFixed(2)} ${((p[1] + q[1]) / 2).toFixed(2)}`;
  }
  d += ` L${last[0].toFixed(2)} ${last[1].toFixed(2)} L${VW} ${last[1].toFixed(2)} L${VW} ${VH} Z`;
  return d;
}

function formatPct(p: number): string {
  if (p < 0.05) return '0%';
  if (p < 10) return `${p.toFixed(1)}%`;
  return `${Math.round(p)}%`;
}

/** Describe en palabras dónde se concentran los tonos (para lectores de pantalla). */
export function describeHistogram(data: HistogramData): string {
  // Los valores están normalizados con raíz cuadrada: se elevan al cuadrado para recuperar la proporción.
  let sum = 0;
  let weighted = 0;
  data.l.forEach((v, i) => {
    const w = v * v;
    sum += w;
    weighted += w * i;
  });
  const zone =
    sum <= 0
      ? 'sin datos'
      : (() => {
          const mean = weighted / sum / Math.max(1, data.l.length - 1);
          if (mean < 0.3) return 'tonos concentrados en las sombras';
          if (mean > 0.7) return 'tonos concentrados en las altas luces';
          return 'tonos concentrados en los medios tonos';
        })();
  return `${zone}; altas luces quemadas ${formatPct(data.clippedHighlightsPct)}, sombras empastadas ${formatPct(data.clippedShadowsPct)}`;
}

export function Histogram({ data, variant = 'rgb', className, showClipping = false }: HistogramProps) {
  const paths = useMemo(
    () =>
      variant === 'rgb'
        ? { r: channelPath(data.r), g: channelPath(data.g), b: channelPath(data.b), l: '' }
        : { r: '', g: '', b: '', l: channelPath(data.l) },
    [data, variant],
  );
  const hi = data.clippedHighlightsPct;
  const lo = data.clippedShadowsPct;
  const label = `Histograma ${variant === 'rgb' ? 'RGB' : 'de luminancia'}: ${describeHistogram(data)}.`;

  return (
    <div
      role="img"
      aria-label={label}
      className={cn('rounded-[4px] border border-white/12 bg-black/45 p-[3px] backdrop-blur-[2px]', className)}
    >
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        className="block aspect-[8/5] w-full"
        style={{ isolation: 'isolate' }}
      >
        {/* Retícula en cuartos */}
        {[16, 32, 48].map((x) => (
          <line key={x} x1={x} x2={x} y1={0} y2={VH} stroke="white" strokeOpacity={0.14} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        <line x1={0} x2={VW} y1={VH / 2} y2={VH / 2} stroke="white" strokeOpacity={0.08} strokeWidth={1} vectorEffect="non-scaling-stroke" />

        {variant === 'rgb' ? (
          <g>
            <path d={paths.r} fill="rgb(255 72 72)" fillOpacity={0.9} style={{ mixBlendMode: 'screen' }} />
            <path d={paths.g} fill="rgb(72 224 104)" fillOpacity={0.9} style={{ mixBlendMode: 'screen' }} />
            <path d={paths.b} fill="rgb(86 140 255)" fillOpacity={0.9} style={{ mixBlendMode: 'screen' }} />
          </g>
        ) : (
          <path
            d={paths.l}
            fill="rgb(233 235 236 / 0.78)"
            stroke="rgb(255 255 255)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Avisos de recorte en los bordes */}
        {lo >= CLIP_WARN_PCT && <rect x={0} y={0} width={1.4} height={VH} fill="var(--color-info)" />}
        {hi >= CLIP_WARN_PCT && <rect x={VW - 1.4} y={0} width={1.4} height={VH} fill="var(--color-danger)" />}
      </svg>

      {showClipping && (
        <div className="osd mt-[2px] flex items-center justify-between gap-1 px-[2px] text-[0.78em] leading-none" aria-hidden="true">
          <span className={cn('inline-flex items-center gap-[0.25em]', lo >= CLIP_WARN_PCT ? 'text-info' : 'text-white/70')} title="Sombras empastadas">
            <svg viewBox="0 0 8 8" className="h-[0.75em] w-[0.75em]" fill="currentColor" aria-hidden="true">
              <path d="M0 0h8L4 7z" />
            </svg>
            {formatPct(lo)}
          </span>
          <span className={cn('inline-flex items-center gap-[0.25em]', hi >= CLIP_WARN_PCT ? 'text-danger' : 'text-white/70')} title="Altas luces quemadas">
            <svg viewBox="0 0 8 8" className="h-[0.75em] w-[0.75em]" fill="currentColor" aria-hidden="true">
              <path d="M0 8h8L4 1z" />
            </svg>
            {formatPct(hi)}
          </span>
        </div>
      )}
    </div>
  );
}
