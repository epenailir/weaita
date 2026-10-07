/**
 * Iconos dibujados al estilo de los visores (Sony/Nikon/Fujifilm): trazos finos, sin relleno
 * salvo indicadores. Todos usan currentColor para heredar el color del OSD.
 */
import type { ComponentType } from 'react';
import { Cloud, Flame, House, Lightbulb, Sun, Zap } from 'lucide-react';
import type { MeteringMode } from '../../engine/types';
import { WB_PRESETS } from '../../engine/whiteBalance';
import type { WhiteBalancePreset } from '../../engine/whiteBalance';
import { cn } from '../../lib/cn';

interface IconProps {
  /** Tamaño en px o en unidades CSS (p. ej. "1.2em"). */
  size?: number | string;
  className?: string;
  /** Si se indica, el icono deja de ser decorativo y se anuncia con este texto. */
  title?: string;
}

function a11y(title?: string) {
  return title ? { role: 'img' as const, 'aria-label': title } : { 'aria-hidden': true as const };
}

/* ------------------------------------------------------------------ Medición */

export const METERING_INFO: Record<MeteringMode, { label: string; short: string; description: string }> = {
  matrix: {
    label: 'Matricial',
    short: 'Matricial',
    description: 'Evalúa todo el encuadre por zonas. Acierta en la mayoría de escenas.',
  },
  center: {
    label: 'Ponderada al centro',
    short: 'Ponderada',
    description: 'Da más peso al centro del encuadre. Útil en retratos centrados.',
  },
  spot: {
    label: 'Puntual',
    short: 'Puntual',
    description: 'Mide solo un punto pequeño (≈ 3 %). Precisa con contraluces y escenarios.',
  },
};

/** Icono de modo de medición tal como aparece en el visor. */
export function MeteringIcon({ mode, size = 20, className, title }: IconProps & { mode: MeteringMode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      className={cn('shrink-0', className)}
      {...a11y(title)}
    >
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
      {mode === 'matrix' && (
        <>
          <path d="M8.8 4.5v15M15.2 4.5v15M2.5 9.5h19M2.5 14.5h19" strokeWidth={0.9} opacity={0.75} />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </>
      )}
      {mode === 'center' && (
        <>
          <circle cx="12" cy="12" r="4.6" />
          <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
        </>
      )}
      {mode === 'spot' && <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />}
    </svg>
  );
}

/* ------------------------------------------------------------------ Batería */

/** Batería horizontal con cuatro segmentos, como en los cuerpos sin espejo. */
export function BatteryIcon({ pct, size = 22, className, title }: IconProps & { pct: number }) {
  const p = Math.max(0, Math.min(100, pct));
  const bars = p <= 0 ? 0 : Math.ceil(p / 25);
  return (
    <svg
      viewBox="0 0 26 14"
      width={size}
      height={typeof size === 'number' ? (size * 14) / 26 : undefined}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      className={cn('shrink-0', className)}
      {...a11y(title)}
    >
      <rect x="1" y="1.5" width="21" height="11" rx="2" />
      <rect x="22.6" y="4.8" width="2.2" height="4.4" rx="0.8" fill="currentColor" stroke="none" />
      {Array.from({ length: bars }, (_, i) => (
        <rect key={i} x={3 + i * 4.6} y="3.6" width="3.6" height="6.8" rx="0.6" fill="currentColor" stroke="none" />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ Tarjeta */

/** Tarjeta SD (para el contador de disparos restantes). */
export function CardIcon({ size = 14, className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 24"
      width={size}
      height={typeof size === 'number' ? (size * 24) / 20 : undefined}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      {...a11y(title)}
    >
      <path d="M5.5 2h9.5l3 3v15.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 20.5v-16A2.5 2.5 0 0 1 5.5 2Z" />
      <path d="M7.5 5.5v3M10.5 5.5v3M13.5 5.5v3" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ Estabilización */

/** Mano con ondas de vibración: el símbolo clásico de la estabilización (SteadyShot, IBIS). */
export function StabilizationIcon({ size = 22, className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 30 24"
      width={size}
      height={typeof size === 'number' ? (size * 24) / 30 : undefined}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      {...a11y(title)}
    >
      <path d="M3.5 7.5c-1.6 2.9-1.6 6.1 0 9M6.2 9.2c-.8 1.9-.8 3.7 0 5.6" />
      <path d="M26.5 7.5c1.6 2.9 1.6 6.1 0 9M23.8 9.2c.8 1.9.8 3.7 0 5.6" />
      <path d="M11 12.5V7.2a1.2 1.2 0 0 1 2.4 0V11.5M13.4 11V5.4a1.2 1.2 0 0 1 2.4 0V11M15.8 11V6.2a1.2 1.2 0 0 1 2.4 0V12M18.2 12V8.6a1.2 1.2 0 0 1 2.4 0v5.6a6.2 6.2 0 0 1-6.2 6.2h-.4a5.6 5.6 0 0 1-4.7-2.6l-2.2-3.5a1.25 1.25 0 0 1 2-1.5L11 14.2" />
    </svg>
  );
}

/* ------------------------------------------------------------------ Trípode */

/** Trípode con rótula (no existe en lucide). */
export function TripodIcon({ size = 16, className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('shrink-0', className)}
      {...a11y(title)}
    >
      <rect x="7" y="2.5" width="10" height="5" rx="1.2" />
      <path d="M12 7.5v3.5M12 11L5 21.5M12 11l7 10.5M12 11v10.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ Balance de blancos */

interface GlyphProps {
  size?: number | string;
  className?: string;
}

/** Tubo fluorescente con destellos (no existe en lucide). */
function FluorescentIcon({ size = 16, className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      className={className}
    >
      <rect x="3" y="9" width="18" height="5" rx="2.5" />
      <path d="M6 4.5l1 2M12 3.5v2.6M18 4.5l-1 2M6 19.5l1-2M12 20.5v-2.6M18 19.5l-1-2" />
    </svg>
  );
}

const WB_ICONS: Record<string, ComponentType<GlyphProps>> = {
  candle: Flame,
  tungsten: Lightbulb,
  fluorescent: FluorescentIcon,
  daylight: Sun,
  flash: Zap,
  cloudy: Cloud,
  shade: House,
};

/** Preajuste de balance de blancos que coincide con una temperatura (±25 K), si existe. */
export function wbPresetFor(kelvin: number): WhiteBalancePreset | null {
  return WB_PRESETS.find((p) => Math.abs(p.kelvin - kelvin) <= 25) ?? null;
}

/** Icono del preajuste de balance de blancos. */
export function WbPresetIcon({ presetId, size = 16, className, title }: IconProps & { presetId: string }) {
  const Icon = WB_ICONS[presetId] ?? Sun;
  return (
    <span {...a11y(title)} className={cn('inline-flex shrink-0', className)}>
      <Icon size={size} />
    </span>
  );
}
