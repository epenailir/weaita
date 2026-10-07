/**
 * Visor / pantalla LCD con OSD superpuesto, como en un cuerpo sin espejo.
 * La tipografía del OSD se escala con el ancho del contenedor (unidades cqw), de modo que
 * se lee igual en un móvil que en un monitor grande. Todo el OSD visual es decorativo para
 * tecnologías de asistencia: un resumen textual equivalente se expone en el <figcaption>.
 */
import { AlertTriangle } from 'lucide-react';
import type { CSSProperties } from 'react';
import { formatThirds } from '../../engine/scales';
import { cn } from '../../lib/cn';
import { ElectronicLevel, levelDescription } from './ElectronicLevel';
import { ExposureScale, meterLabel } from './ExposureScale';
import { Histogram, describeHistogram } from './Histogram';
import { BatteryIcon, CardIcon, METERING_INFO, MeteringIcon, StabilizationIcon, WbPresetIcon, wbPresetFor } from './OsdIcons';
import { RuleOfThirdsGrid } from './RuleOfThirdsGrid';
import type { OsdData, ViewfinderProps } from './types';

/** Ancho del histograma: lo comparten el histograma y el área de avisos para no solaparse. */
const HIST_WIDTH = 'clamp(84px, 23cqw, 220px)';

const FORMAT_SHORT: Record<OsdData['format'], string> = {
  RAW: 'RAW',
  JPEG: 'JPEG',
  'RAW+JPEG': 'RAW+J',
};

function formatShots(n: number): string {
  if (n > 9999) return '9999+';
  return String(Math.max(0, Math.floor(n)));
}

/** Resumen textual del OSD para lectores de pantalla. */
export function osdSummary(osd: OsdData): string {
  const comp = osd.exposureComp !== 0 ? ` Compensación ${formatThirds(osd.exposureComp)} EV.` : '';
  const limited =
    osd.limited === null
      ? ''
      : ` Atención: ${osd.limited === 'aperture' ? 'la apertura' : osd.limited === 'shutter' ? 'la velocidad' : 'el ISO'} llegó a su límite.`;
  return (
    `Modo ${osd.mode}. Velocidad ${osd.shutterLabel}, apertura ${osd.apertureLabel}, ISO ${osd.isoLabel}${osd.autoIso ? ' (automático)' : ''}.` +
    ` Exposímetro ${meterLabel(osd.meterReading)}.${comp}${limited}` +
    ` Focal ${Math.round(osd.focalMm)} mm, enfoque ${osd.af} a ${osd.focusLabel}. Medición ${METERING_INFO[osd.metering].label.toLowerCase()}.` +
    ` Balance de blancos ${osd.wbLabel}. Formato ${osd.format}.${osd.stabilization ? ' Estabilización activada.' : ''}` +
    ` Batería ${Math.round(osd.batteryPct)} %, ${formatShots(osd.shotsRemaining)} disparos restantes.`
  );
}

/** Icono de compensación de exposición (cuadro con "+" y "−"). */
function CompIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-[0.95em] w-[0.95em] shrink-0" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="1.5" />
      <path d="M14.5 1.5L1.5 14.5M3.6 5.6h4M5.6 3.6v4M8.8 11h4" strokeLinecap="round" />
    </svg>
  );
}

/** Corchetes del punto AF. */
function AfBrackets({ x, y, locked }: { x: number; y: number; locked: boolean }) {
  const cx = Math.max(0, Math.min(1, x)) * 100;
  const cy = Math.max(0, Math.min(1, y)) * 100;
  const corner = cn(
    'absolute h-[1.05em] w-[1.05em] transition-colors duration-150',
    locked ? 'border-data' : 'border-white',
  );
  const stroke = 'border-[length:max(1.5px,0.15em)]';
  return (
    <div
      className={cn(
        'absolute h-[4.4em] w-[5.8em] transition-transform duration-150 ease-out',
        locked && 'drop-shadow-[0_0_6px_rgb(163_255_87/0.6)]',
      )}
      style={{ left: `${cx}%`, top: `${cy}%`, transform: `translate(-50%, -50%) scale(${locked ? 0.88 : 1})` }}
    >
      <span className={cn(corner, stroke, 'left-0 top-0 border-b-0 border-r-0')} />
      <span className={cn(corner, stroke, 'right-0 top-0 border-b-0 border-l-0')} />
      <span className={cn(corner, stroke, 'bottom-0 left-0 border-r-0 border-t-0')} />
      <span className={cn(corner, stroke, 'bottom-0 right-0 border-l-0 border-t-0')} />
      {locked && <span className="absolute left-1/2 top-1/2 h-[0.35em] w-[0.35em] -translate-x-1/2 -translate-y-1/2 rounded-full bg-data" />}
    </div>
  );
}

export function Viewfinder({
  osd,
  children,
  showGrid = false,
  levelRollDeg = null,
  histogram = null,
  warnings = [],
  afPoint = null,
  aspect = 3 / 2,
  className,
}: ViewfinderProps) {
  const preset = wbPresetFor(Number.parseInt(osd.wbLabel, 10));
  const battery = Math.max(0, Math.min(100, Math.round(osd.batteryPct)));
  const lowBattery = battery <= 15;
  const apertureValue = osd.apertureLabel.replace(/^f\//i, '');
  const blink = (p: OsdData['limited']) => (osd.limited !== null && osd.limited === p ? 'blink text-danger' : undefined);
  const extraSummary = [
    levelRollDeg !== null ? `Nivel: ${levelDescription(levelRollDeg)}.` : '',
    histogram ? `Histograma: ${describeHistogram(histogram)}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const osdStyle = {
    fontSize: 'clamp(9px, calc(1.55cqw + 3.2px), 15px)',
    '--hist-w': HIST_WIDTH,
  } as CSSProperties;

  return (
    <figure className={cn('@container relative m-0 rounded-[14px] border border-line bg-ink p-[3px] shadow-[var(--shadow-raise)]', className)}>
      <div className="relative w-full overflow-hidden rounded-[11px] bg-black" style={{ aspectRatio: String(aspect) }}>
        {/* Imagen */}
        <div className="absolute inset-0 [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full [&>img]:h-full [&>img]:w-full [&>img]:object-cover">
          {children}
        </div>

        {showGrid && <RuleOfThirdsGrid />}

        {/* OSD (decorativo; ver figcaption) */}
        <div aria-hidden="true" className="osd pointer-events-none absolute inset-0 select-none leading-none text-white" style={osdStyle}>
          {levelRollDeg !== null && <ElectronicLevel rollDeg={levelRollDeg} />}
          {afPoint && <AfBrackets x={afPoint.x} y={afPoint.y} locked={afPoint.locked} />}

          {/* Fila superior */}
          <div className="absolute inset-x-0 top-0 h-[5.5em] bg-linear-to-b from-black/55 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-[0.8em] px-[0.9em] pt-[0.75em] drop-shadow-[0_1px_1.5px_rgb(0_0_0/0.85)]">
            <div className="flex min-w-0 items-center gap-[0.7em] @md:gap-[0.95em]">
              <span className="inline-flex h-[1.85em] min-w-[1.85em] items-center justify-center rounded-[0.22em] bg-amber px-[0.25em] text-[1.25em] font-semibold text-ink">
                {osd.mode}
              </span>
              <span className="inline-flex items-center gap-[0.3em]">
                <CardIcon size="1em" className="h-[1.05em] w-auto" />
                {formatShots(osd.shotsRemaining)}
              </span>
              <span className="rounded-[0.2em] border border-white/80 px-[0.3em] py-[0.15em] text-[0.82em] font-semibold tracking-wide">
                {FORMAT_SHORT[osd.format]}
              </span>
              <span className="inline-flex items-center gap-[0.3em]">
                {preset ? (
                  <WbPresetIcon presetId={preset.id} size="1.15em" />
                ) : (
                  <span className="text-[0.82em] font-semibold">WB</span>
                )}
                <span className="hidden @sm:inline">{osd.wbLabel}</span>
              </span>
              <span className="font-medium">{osd.af}</span>
              <MeteringIcon mode={osd.metering} size="1.35em" />
              {osd.stabilization && <StabilizationIcon size="1.45em" className="hidden h-[1.15em] w-auto @xs:block" />}
            </div>
            <span className={cn('inline-flex shrink-0 items-center gap-[0.35em]', lowBattery && 'text-danger')}>
              <BatteryIcon pct={battery} size="1.65em" className="h-[0.9em] w-auto" />
              <span className="hidden @xs:inline">{battery}%</span>
            </span>
          </div>

          {/* Histograma */}
          {histogram && (
            <div className="absolute right-[0.9em] top-[3.4em]" style={{ width: 'var(--hist-w)' }}>
              <Histogram data={histogram} showClipping className="text-[length:max(0.85em,8px)]" />
            </div>
          )}

          {/* Fila inferior */}
          <div className="absolute inset-x-0 bottom-0 h-[6.5em] bg-linear-to-t from-black/65 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-[0.9em] pb-[0.7em] drop-shadow-[0_1px_1.5px_rgb(0_0_0/0.85)]">
            <div className="mb-[0.55em] flex items-center gap-[0.9em] text-[0.88em] text-white/90">
              <span>{Math.round(osd.focalMm)}mm</span>
              <span className="inline-flex items-center gap-[0.35em]">
                <span className="rounded-[0.18em] border border-white/70 px-[0.25em] py-[0.1em] text-[0.85em] font-semibold">
                  {osd.af === 'MF' ? 'MF' : 'AF'}
                </span>
                {osd.focusLabel}
              </span>
            </div>
            <div className="flex items-end justify-between gap-[0.9em] @md:gap-[1.3em]">
              <span className={cn('text-[1.6em] font-medium tracking-tight', blink('shutter'))}>{osd.shutterLabel}</span>
              <span className={cn('text-[1.6em] font-medium tracking-tight', blink('aperture'))}>
                <span className="mr-[0.04em] text-[0.62em] font-semibold">F</span>
                {apertureValue}
              </span>
              <div className="min-w-0 max-w-[15em] flex-1 self-center">
                <div className="@md:hidden">
                  <ExposureScale value={osd.meterReading} compact />
                </div>
                <div className="hidden @md:block">
                  <ExposureScale value={osd.meterReading} range={3} />
                </div>
              </div>
              {osd.exposureComp !== 0 && (
                <span className="inline-flex items-center gap-[0.3em] text-[1.15em] font-medium text-amber">
                  <CompIcon />
                  {formatThirds(osd.exposureComp)}
                </span>
              )}
              <span className={cn('inline-flex items-end gap-[0.3em]', blink('iso'))}>
                <span className="flex flex-col items-start text-[0.66em] font-semibold leading-[1.1]">
                  {osd.autoIso && <span className={cn(osd.limited === 'iso' ? 'text-danger' : 'text-amber')}>AUTO</span>}
                  <span>ISO</span>
                </span>
                <span className="text-[1.6em] font-medium tracking-tight">{osd.isoLabel}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Avisos de la cámara (región viva para lectores de pantalla) */}
        <div
          role="status"
          aria-live="polite"
          className="osd pointer-events-none absolute inset-x-0 top-[3.4em] flex flex-col items-center gap-[0.35em] leading-tight"
          style={{
            ...osdStyle,
            paddingInline: histogram ? 'calc(var(--hist-w) + 1.6em)' : '1em',
          }}
        >
          {warnings.map((w) => (
            <span
              key={w}
              className="inline-flex max-w-full items-center gap-[0.4em] rounded-[0.3em] border border-danger/60 bg-black/65 px-[0.6em] py-[0.35em] text-center font-medium text-danger shadow-[0_2px_8px_rgb(0_0_0/0.4)]"
            >
              <AlertTriangle aria-hidden="true" className="h-[1.1em] w-[1.1em] shrink-0" />
              <span className="min-w-0">{w}</span>
            </span>
          ))}
        </div>
      </div>
      <figcaption className="sr-only">
        {osdSummary(osd)} {extraSummary}
      </figcaption>
    </figure>
  );
}
