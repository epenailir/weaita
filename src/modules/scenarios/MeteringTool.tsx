/**
 * Golden hour: lo que lee el exposímetro en cada modo de medición en un contraluz y qué
 * velocidad elegiría la cámara en modo A. El sesgo de cada modo viene de la escena.
 */
import { formatAperture, formatIso } from '../../engine';
import type { MeteringMode } from '../../engine';
import { ExposureScale, METERING_INFO, MeteringIcon } from '../../components/viewfinder';
import { cn } from '../../lib/cn';
import { ToolBlock, ToolNote } from './bits';
import { EXPOSURE_TOLERANCE } from './checks';
import { fmtEV, fmtTime } from './format';
import { simulate } from './model';
import type { ToolProps } from './model';

const MODES: MeteringMode[] = ['matrix', 'center', 'spot'];

const SEES: Record<MeteringMode, string> = {
  matrix: 'Promedia todo el encuadre: el cielo brillante pesa más que el rostro.',
  center: 'Da más peso al centro, pero el cielo detrás de la cabeza sigue contando.',
  spot: 'Mide solo la mejilla iluminada (≈ 3 % del encuadre).',
};

/** Contraluz esquemático con el área que mide cada modo. */
function MeteringDiagram({ mode }: { mode: MeteringMode }) {
  return (
    <svg viewBox="0 0 300 150" role="img" aria-label={`Zona medida: ${METERING_INFO[mode].label}. ${SEES[mode]}`} className="block h-auto w-full rounded-md">
      <defs>
        <linearGradient id="sb-mt-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f6c37a" />
          <stop offset="0.6" stopColor="#f39a52" />
          <stop offset="1" stopColor="#8a4a2a" />
        </linearGradient>
        <radialGradient id="sb-mt-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fffbe8" />
          <stop offset="0.35" stopColor="#ffe3a1" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="300" height="150" fill="url(#sb-mt-sky)" />
      <circle cx="218" cy="92" r="46" fill="url(#sb-mt-sun)" />
      <rect y="112" width="300" height="38" fill="#4a2c1d" />
      {/* Silueta a contraluz con borde de luz */}
      <path d="M96 150 C98 120 112 108 128 104 L128 96 C116 90 112 76 114 64 C116 46 130 38 146 40 C162 42 172 56 170 72 C169 84 162 94 152 98 L152 104 C170 108 186 120 190 150 Z" fill="#3a2418" stroke="#ffd9a0" strokeOpacity="0.7" strokeWidth="1.5" />
      <ellipse cx="156" cy="70" rx="7" ry="9" fill="#8a5a3c" opacity="0.85" />

      {mode === 'matrix' && (
        <g stroke="white" strokeOpacity="0.85" strokeWidth="1" fill="none">
          {Array.from({ length: 5 }, (_, i) => (
            <line key={`v${i}`} x1={50 * (i + 1)} x2={50 * (i + 1)} y1="0" y2="150" strokeDasharray="3 3" />
          ))}
          {Array.from({ length: 2 }, (_, i) => (
            <line key={`h${i}`} x1="0" x2="300" y1={50 * (i + 1)} y2={50 * (i + 1)} strokeDasharray="3 3" />
          ))}
          <rect x="1" y="1" width="298" height="148" />
        </g>
      )}
      {mode === 'center' && (
        <g fill="none" stroke="white" strokeOpacity="0.9">
          <ellipse cx="150" cy="75" rx="78" ry="52" strokeWidth="1.5" />
          <circle cx="150" cy="75" r="3" fill="white" />
        </g>
      )}
      {mode === 'spot' && (
        <g fill="none" stroke="white">
          <circle cx="156" cy="70" r="9" strokeWidth="2" />
          <line x1="156" x2="156" y1="54" y2="60" strokeWidth="1.5" />
          <line x1="156" x2="156" y1="80" y2="86" strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}

export function MeteringTool({ cam, lighting, lensMaxAperture }: ToolProps) {
  const { settings, effective, metrics } = cam;
  // Qué haría la cámara en modo A con cada medición (misma apertura, ISO y compensación).
  const rows = MODES.map((mode) => {
    const r = simulate({ ...settings, aperture: effective.aperture, iso: effective.iso, mode: 'A', metering: mode }, lighting, lensMaxAperture);
    return { mode, bias: lighting.meteringBias[mode], shutter: r.s.shutter, face: r.m.exposureOffset, limited: r.limited };
  });
  const gap = metrics.meterReading - metrics.exposureOffset;

  return (
    <div className="flex flex-col gap-3">
      <ToolBlock title="Qué mide cada modo" aside={METERING_INFO[settings.metering].short}>
        <MeteringDiagram mode={settings.metering} />
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{SEES[settings.metering]}</p>
      </ToolBlock>

      <ToolBlock title={`Modo A · ${formatAperture(effective.aperture)} · ISO ${formatIso(effective.iso)}`}>
        <div role="group" aria-label="Modo de medición" className="flex flex-col gap-2">
          {rows.map((r) => {
            const active = settings.metering === r.mode;
            const ok = Math.abs(r.face) <= EXPOSURE_TOLERANCE;
            return (
              <button
                key={r.mode}
                type="button"
                aria-pressed={active}
                onClick={() => cam.set({ metering: r.mode })}
                className={cn(
                  'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-md border p-2.5 text-left transition-colors',
                  active ? 'border-amber/50 bg-amber-soft' : 'border-line bg-ink hover:border-line-strong',
                )}
              >
                <MeteringIcon mode={r.mode} size={20} className={active ? 'text-amber' : 'text-muted'} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-fg">{METERING_INFO[r.mode].label}</span>
                  <span className="block text-[11.5px] text-faint">
                    {Math.abs(r.bias) < 0.05 ? 'No se equivoca en esta escena' : `Se equivoca ${fmtEV(r.bias)}`}
                  </span>
                </span>
                <span className="osd text-right text-[12px] text-muted">
                  {fmtTime(r.shutter)}
                  {r.limited === 'shutter' && <span className="block text-[10.5px] text-danger">al límite</span>}
                </span>
                <span className="col-span-3 flex items-center gap-3">
                  <span className="text-[11.5px] text-faint">Rostro</span>
                  <span className="min-w-0 flex-1 text-white" aria-hidden="true">
                    <ExposureScale value={r.face} compact range={2} />
                  </span>
                  <span className={cn('osd w-[64px] text-right text-[12.5px]', ok ? 'text-data' : 'text-danger')}>{fmtEV(r.face)}</span>
                </span>
              </button>
            );
          })}
        </div>
        <ToolNote>La cámara ajusta la velocidad hasta que su exposímetro marca 0. Si el modo de medición se equivoca, el rostro hereda ese error.</ToolNote>
      </ToolBlock>

      <ToolBlock title="Exposímetro frente a la realidad">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-md border border-line bg-ink p-2.5">
            <div className="eyebrow mb-1">Tu exposímetro</div>
            <div className="osd text-lg text-fg">{fmtEV(metrics.meterReading)}</div>
          </div>
          <div className="rounded-md border border-line bg-ink p-2.5">
            <div className="eyebrow mb-1">Rostro real</div>
            <div className={cn('osd text-lg', Math.abs(metrics.exposureOffset) <= EXPOSURE_TOLERANCE ? 'text-data' : 'text-danger')}>{fmtEV(metrics.exposureOffset)}</div>
          </div>
        </div>
        <ToolNote>
          {Math.abs(gap) < 0.05
            ? 'Con esta medición el exposímetro dice la verdad sobre el rostro.'
            : `Diferencia de ${fmtEV(gap)}: es el error de la medición ${METERING_INFO[settings.metering].label.toLowerCase()} en este contraluz. El exposímetro no ve el rostro, ve un promedio.`}
        </ToolNote>
      </ToolBlock>
    </div>
  );
}
