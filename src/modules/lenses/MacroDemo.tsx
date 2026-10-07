import { useId, useState } from 'react';
import { Focus, Ruler } from 'lucide-react';
import { APERTURES, SENSORS, effectiveAperture, formatAperture, formatThirds, macroDofMm, magnification } from '../../engine';
import { LENS_TYPES } from '../../content/lenses';
import { Callout, Panel, RangeSlider, StopSlider } from '../../components/ui';
import { BulletList, Readout } from './shared';

const FOCAL_MM = 100;
const SENSOR = SENSORS.ff;
/** Distancia mínima de enfoque (plano del sensor → sujeto) para 1:1 en el modelo de lente delgada: 4f. */
const MIN_FOCUS_M = (4 * FOCAL_MM) / 1000;
const MAX_FOCUS_M = 2;
const APERTURE_OPTIONS = APERTURES.slice(6); // f/2.8 … f/22

/** Distancia objeto–lente a partir de la distancia de enfoque medida desde el sensor (D = s + s'). */
function objectDistanceM(focusM: number): number {
  const f = FOCAL_MM / 1000;
  const disc = Math.max(0, focusM * focusM - 4 * focusM * f);
  return (focusM + Math.sqrt(disc)) / 2;
}

function formatRatio(m: number): string {
  if (m >= 0.985) return '1:1';
  const r = 1 / m;
  return `1:${r < 10 ? r.toFixed(1) : Math.round(r)}`;
}

function formatMm(mm: number): string {
  if (mm < 10) return `${mm.toFixed(2)} mm`;
  if (mm < 100) return `${mm.toFixed(1)} mm`;
  return `${(mm / 10).toFixed(1)} cm`;
}

/* ------------------------------------------------------------------ lo que ve el sensor */

const SV_W = 360;
const SV_H = 240;
/** Origen de la regla (mm del sujeto), fuera del campo más amplio para que no haya cifras negativas. */
const RULER_ZERO_MM = -400;

function SensorView({ m }: { m: number }) {
  const clip = useId();
  const k = (SV_W / SENSOR.widthMm) * m; // px por mm del sujeto
  const P = (x: number, y: number) => [SV_W / 2 + x * k, SV_H / 2 + y * k] as const;
  const rulerY = 7;
  const rulerW = 4;
  const tickEvery = [1, 2, 5, 10, 20, 50].find((s) => s * k >= 4) ?? 100;
  const labelEvery = [10, 20, 50, 100, 200].find((s) => s * k >= 34) ?? 500;
  const halfField = SV_W / 2 / k;
  const ticks: number[] = [];
  for (let x = Math.ceil(-halfField / tickEvery) * tickEvery; x <= halfField; x += tickEvery) ticks.push(x);
  const [rx0, ry0] = P(-halfField - 5, rulerY);

  return (
    <svg viewBox={`0 0 ${SV_W} ${SV_H}`} className="block h-auto w-full" role="img" aria-label={`Lo que ve el sensor de 36 × 24 mm a ${formatRatio(m)}: una mariquita de 7 mm sobre una hoja, con una regla. El encuadre cubre ${(SENSOR.widthMm / m).toFixed(0)} × ${(SENSOR.heightMm / m).toFixed(0)} mm del sujeto.`}>
      <defs>
        <clipPath id={clip}>
          <rect width={SV_W} height={SV_H} />
        </clipPath>
        <radialGradient id={`${clip}-bg`} cx="0.5" cy="0.45" r="0.8">
          <stop offset="0" stopColor="#2c3a2a" />
          <stop offset="1" stopColor="#121811" />
        </radialGradient>
        <linearGradient id={`${clip}-leaf`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6f9a4a" />
          <stop offset="1" stopColor="#3e6430" />
        </linearGradient>
        <radialGradient id={`${clip}-bug`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ff7a5c" />
          <stop offset="0.6" stopColor="#d23a22" />
          <stop offset="1" stopColor="#8f1f12" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width={SV_W} height={SV_H} fill={`url(#${clip}-bg)`} />
        {/* Hoja (en mm del sujeto) */}
        <g transform={`translate(${SV_W / 2} ${SV_H / 2}) scale(${k}) rotate(-18) translate(-4 2)`}>
          <path d="M-60 0 C-40 -26 30 -30 62 0 C30 28 -40 26 -60 0 Z" fill={`url(#${clip}-leaf)`} />
          <path d="M-60 0 L62 0" stroke="#a7c47e" strokeWidth="0.7" opacity="0.8" />
          {[-44, -30, -16, -2, 12, 26, 40].map((x) => (
            <path key={x} d={`M${x} 0 Q${x + 8} -9 ${x + 14} -17 M${x} 0 Q${x + 8} 9 ${x + 14} 17`} stroke="#9dbb74" strokeWidth="0.35" fill="none" opacity="0.6" />
          ))}
        </g>
        {/* Regla milimetrada */}
        <rect x={rx0} y={ry0} width={(halfField * 2 + 10) * k} height={Math.max(4, rulerW * k)} fill="#e9e4d6" opacity="0.92" />
        {ticks.map((x) => {
          const [px, py] = P(x, rulerY);
          const major = x % labelEvery === 0;
          const mid = !major && x % (tickEvery * 5) === 0;
          const len = Math.max(2, (major ? 1.6 : mid ? 1.1 : 0.7) * Math.min(k, 8));
          return <line key={x} x1={px} x2={px} y1={py} y2={py + len} stroke="#1b1b1b" strokeWidth={major ? 1.2 : 0.7} />;
        })}
        {ticks
          .filter((x) => x % labelEvery === 0)
          .map((x) => {
            const [px, py] = P(x, rulerY);
            return (
              <text key={`l${x}`} x={px + 2} y={py + Math.max(2, 1.6 * Math.min(k, 8)) + 9} className="osd" fontSize="9" fill="#1b1b1b">
                {(x - RULER_ZERO_MM) / 10}
              </text>
            );
          })}
        {/* Mariquita de 7 mm */}
        <g transform={`translate(${SV_W / 2} ${SV_H / 2}) scale(${k})`}>
          <ellipse cx="0.4" cy="0.6" rx="3" ry="3.6" fill="#000" opacity="0.25" />
          <ellipse cx="0" cy="0.6" rx="2.8" ry="3.4" fill={`url(#${clip}-bug)`} />
          <path d="M0 -2.8 V4" stroke="#1a0d0a" strokeWidth="0.18" />
          <ellipse cx="0" cy="-3.1" rx="1.6" ry="1.05" fill="#15100f" />
          <circle cx="-0.6" cy="-3.3" r="0.32" fill="#f2efe8" />
          <circle cx="0.6" cy="-3.3" r="0.32" fill="#f2efe8" />
          {[[-1.4, -0.6], [1.4, -0.6], [-1.6, 1.4], [1.6, 1.4], [-0.9, 2.9], [0.9, 2.9]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="0.62" fill="#140c0a" />
          ))}
          <ellipse cx="-1.2" cy="-1.4" rx="0.8" ry="0.45" fill="#fff" opacity="0.35" transform="rotate(-30 -1.2 -1.4)" />
        </g>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ profundidad de campo */

const DV_W = 360;
const DV_H = 150;
const WINDOW_MM = 16;
const MM = (DV_W - 40) / WINDOW_MM;
const FOCUS_X_MM = 3.85;
const dx = (mm: number) => 20 + mm * MM;
const dy = (mm: number) => 112 - mm * MM;

function BugProfile() {
  return (
    <g>
      <path d={`M${dx(4.4)} ${dy(0.35)} A ${3.6 * MM} ${3 * MM} 0 0 1 ${dx(11.6)} ${dy(0.35)} Z`} fill="#c8402a" />
      <path d={`M${dx(5.2)} ${dy(2.2)} Q ${dx(7)} ${dy(3.2)} ${dx(8.4)} ${dy(3.2)}`} stroke="#fff" strokeOpacity="0.35" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx={dx(7.4)} cy={dy(2.2)} r={0.6 * MM} fill="#140c0a" />
      <circle cx={dx(9.8)} cy={dy(1.7)} r={0.55 * MM} fill="#140c0a" />
      <ellipse cx={dx(4.2)} cy={dy(0.9)} rx={0.9 * MM} ry={0.75 * MM} fill="#15100f" />
      <circle cx={dx(3.8)} cy={dy(1.05)} r={0.22 * MM} fill="#f2efe8" />
      {[5.4, 7.2, 9].map((x) => (
        <path key={x} d={`M${dx(x)} ${dy(0.4)} l ${-0.5 * MM} ${0.4 * MM}`} stroke="#140c0a" strokeWidth="1.5" />
      ))}
    </g>
  );
}

function DofView({ dofMm }: { dofMm: number }) {
  const id = useId();
  const near = Math.max(0, FOCUS_X_MM - dofMm / 2);
  const far = Math.min(WINDOW_MM, FOCUS_X_MM + dofMm / 2);
  // Franja de desenfoque leve: hasta el triple de la zona nítida
  const midNear = Math.max(0, FOCUS_X_MM - (dofMm * 3) / 2);
  const midFar = Math.min(WINDOW_MM, FOCUS_X_MM + (dofMm * 3) / 2);
  const all = dofMm >= WINDOW_MM;
  const insideBody = Math.max(0, Math.min(11.6, FOCUS_X_MM + dofMm / 2) - Math.max(3.4, FOCUS_X_MM - dofMm / 2));
  return (
    <svg viewBox={`0 0 ${DV_W} ${DV_H}`} className="block h-auto w-full" role="img" aria-label={`Vista lateral: el plano de enfoque está en los ojos de la mariquita y la zona nítida mide ${formatMm(dofMm)}, ${all ? 'más que todo el insecto' : `que cubre ${insideBody.toFixed(1)} de sus 8 mm de longitud`}.`}>
      <defs>
        <filter id={`${id}-blur`} x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        <filter id={`${id}-blur-soft`} x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
        <clipPath id={`${id}-mid`}>
          <rect x={dx(midNear)} y="0" width={Math.max(0, dx(midFar) - dx(midNear))} height={DV_H} />
        </clipPath>
        <clipPath id={`${id}-slab`}>
          <rect x={dx(near)} y="0" width={Math.max(0, dx(far) - dx(near))} height={DV_H} />
        </clipPath>
      </defs>
      <rect width={DV_W} height={DV_H} className="fill-ink" />
      {/* Hoja */}
      <rect x="0" y={dy(0)} width={DV_W} height={DV_H - dy(0)} fill="#2f4a2a" />
      <line x1="0" x2={DV_W} y1={dy(0)} y2={dy(0)} stroke="#6f9a4a" strokeWidth="2" />
      {/* Zona nítida */}
      <rect x={dx(near)} y="8" width={Math.max(1, dx(far) - dx(near))} height={dy(0) - 8} fill="var(--color-data)" opacity="0.12" />
      <line x1={dx(near)} x2={dx(near)} y1="8" y2={dy(0)} stroke="var(--color-data)" strokeWidth="1" strokeDasharray="3 3" />
      <line x1={dx(far)} x2={dx(far)} y1="8" y2={dy(0)} stroke="var(--color-data)" strokeWidth="1" strokeDasharray="3 3" />
      <line x1={dx(FOCUS_X_MM)} x2={dx(FOCUS_X_MM)} y1="4" y2={dy(0)} stroke="var(--color-amber)" strokeWidth="1.5" />
      {/* Insecto: el desenfoque crece con la distancia al plano de enfoque (tres capas) */}
      <g filter={`url(#${id}-blur)`} opacity="0.9">
        <BugProfile />
      </g>
      <g filter={`url(#${id}-blur-soft)`} clipPath={`url(#${id}-mid)`}>
        <BugProfile />
      </g>
      <g clipPath={`url(#${id}-slab)`}>
        <BugProfile />
      </g>
      {/* Escala */}
      {Array.from({ length: WINDOW_MM + 1 }, (_, i) => (
        <line key={i} x1={dx(i)} x2={dx(i)} y1={DV_H - 18} y2={DV_H - (i % 5 === 0 ? 10 : 14)} className="stroke-muted" strokeWidth="1" />
      ))}
      <text x={dx(0)} y={DV_H - 1} className="osd fill-faint" fontSize="9">
        0
      </text>
      <text x={dx(5)} y={DV_H - 1} textAnchor="middle" className="osd fill-faint" fontSize="9">
        5 mm
      </text>
      <text x={dx(10)} y={DV_H - 1} textAnchor="middle" className="osd fill-faint" fontSize="9">
        10
      </text>
      <text x={dx(15)} y={DV_H - 1} textAnchor="middle" className="osd fill-faint" fontSize="9">
        15
      </text>
      <text x="6" y="16" className="osd fill-amber" fontSize="10">
        ← cámara
      </text>
      <text x={DV_W - 8} y="16" textAnchor="end" className="osd fill-data" fontSize="10">
        {all ? 'Todo nítido' : `Nítido: ${formatMm(dofMm)}`}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ demo */

export function MacroDemo() {
  const [focusM, setFocusM] = useState(MIN_FOCUS_M);
  const [apIndex, setApIndex] = useState(APERTURE_OPTIONS.findIndex((a) => a.label === '11'));
  const aperture = APERTURE_OPTIONS[apIndex] ?? APERTURE_OPTIONS[0]!;
  const s = objectDistanceM(focusM);
  const m = magnification(FOCAL_MM, s);
  const nEff = effectiveAperture(aperture.value, m);
  const lossEv = 2 * Math.log2(1 + m);
  const dof = macroDofMm(aperture.value, SENSOR.cocMm, m);
  const macro = LENS_TYPES.find((t) => t.id === 'macro');

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <figure className="m-0 overflow-hidden rounded-lg border border-line bg-ink">
          <div className="relative">
            <SensorView m={m} />
            <div className="osd pointer-events-none absolute left-3 top-3 flex gap-1.5 text-[11px]" aria-hidden="true">
              <span className="rounded-xs bg-ink/80 px-2 py-1 text-amber">{formatRatio(m)}</span>
              <span className="rounded-xs bg-ink/80 px-2 py-1 text-fg">
                Campo {(SENSOR.widthMm / m).toFixed(0)} × {(SENSOR.heightMm / m).toFixed(0)} mm
              </span>
            </div>
          </div>
          <figcaption className="border-t border-line px-4 py-2.5 text-[12.5px] text-muted">
            Lo que ve el sensor (36 × 24 mm). A 1:1, cada milímetro del insecto ocupa un milímetro del sensor.
          </figcaption>
        </figure>
        <figure className="m-0 overflow-hidden rounded-lg border border-line bg-ink">
          <DofView dofMm={dof} />
          <figcaption className="border-t border-line px-4 py-2.5 text-[12.5px] text-muted">
            Vista lateral a escala: enfocado a los ojos, la franja verde es lo único nítido.
          </figcaption>
        </figure>
      </div>

      <Panel eyebrow="Macro 100 mm · full frame" title="Relación de reproducción">
        <div className="space-y-5">
          <RangeSlider
            label="Enfoque (desde el sensor)"
            icon={<Ruler size={14} aria-hidden="true" />}
            value={focusM}
            min={MIN_FOCUS_M}
            max={MAX_FOCUS_M}
            log
            onChange={(v) => setFocusM(Math.max(MIN_FOCUS_M, v))}
            format={(v) => `${Math.round(v * 100)} cm`}
            hints={['Mínima: 1:1', 'Más lejos']}
          />
          <StopSlider
            label="Apertura"
            icon={<Focus size={14} aria-hidden="true" />}
            options={APERTURE_OPTIONS.map((a) => ({ label: a.label, major: a.fullStop }))}
            index={apIndex}
            onChange={setApIndex}
            valueText={`f/${aperture.label}`}
            display={`f/${aperture.label}`}
            hints={['Más luz', 'Más profundidad']}
          />
          <div className="grid grid-cols-2 gap-2">
            <Readout label="Reproducción" value={formatRatio(m)} tone="amber" hint={`Ampliación ×${m.toFixed(2)}`} />
            <Readout label="Sujeto–objetivo" value={`${(s * 100).toFixed(1)} cm`} hint="Modelo de lente delgada" />
            <Readout label="f efectivo" value={formatAperture(nEff)} tone="danger" hint={`N·(1 + m) con f/${aperture.label}`} />
            <Readout label="Luz perdida" value={lossEv < 1 / 6 ? 'Casi nada' : `${formatThirds(-lossEv)} pasos`} tone={lossEv < 1 / 6 ? 'data' : 'danger'} hint="Por la extensión del enfoque" />
            <Readout label="Profundidad de campo" value={formatMm(dof)} tone="data" hint="2·N·c·(1 + m)/m²" className="col-span-2" />
          </div>
          {macro && (
            <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div>
                <div className="eyebrow mb-2 !text-data">A favor</div>
                <BulletList items={macro.pros} tone="data" />
              </div>
              <div>
                <div className="eyebrow mb-2 !text-danger">En contra</div>
                <BulletList items={macro.cons} tone="danger" />
              </div>
            </div>
          )}
        </div>
      </Panel>

      <Callout kind="tip" title="Macro en la práctica" className="xl:col-span-2">
        {macro?.whenToUse} Con la profundidad de campo en milímetros, cierra a f/8–f/11 (más allá la difracción ablanda la imagen), enfoca moviendo el cuerpo hacia
        delante y atrás en lugar del anillo, y alinea el plano del sensor con el plano del sujeto. La cámara mide a través del objetivo y compensa la pérdida de
        luz; si usas flash manual o un fotómetro de mano, súmala tú.
      </Callout>
    </div>
  );
}
