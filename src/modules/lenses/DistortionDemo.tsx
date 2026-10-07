import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { distortPoint, distortionK1 } from '../../engine';
import { Callout, Panel, Segmented, Switch } from '../../components/ui';
import { MIN_DEMO_K1, buildFacade, distortPoints, frameHalfExtents, subdivide, toPath } from '../../lens/distortion';
import type { P2 } from '../../lens/distortion';
import { FOCAL_MAX_MM, FOCAL_MIN_MM, QUICK_FOCALS, describeDistortion, formatFocal, formatSignedPercent } from '../../lens/framing';
import type { LensBuild } from '../../lens/framing';
import { cn } from '../../lib/cn';
import { FocalChips, Readout } from './shared';

const VW = 600;
const VH = 400;
const R = Math.hypot(VW / 2, VH / 2);
const { hx: HX, hy: HY } = frameHalfExtents(VW / VH);
const toPx = ([x, y]: P2): P2 => [VW / 2 + x * R, VH / 2 - y * R];
const GUIDES = [0.05, 1 / 3, 2 / 3, 0.95];

/** Geometría subdividida una sola vez; solo se deforma al cambiar k1. */
function useFacade() {
  return useMemo(() => {
    const f = buildFacade();
    return {
      wall: subdivide(f.wall, true, 0.03),
      slabs: f.slabs.map((p) => subdivide(p, false, 0.02)),
      columns: f.columns.map((p) => subdivide(p, false, 0.02)),
      cells: f.cells.map((c) => ({ ...c, pts: subdivide(c.pts, true, 0.03) })),
    };
  }, []);
}

const GLASS = ['#223147', '#26374f', '#2b3e59', '#203045'];

function FacadeView({ k1, guides, label }: { k1: number; guides: boolean; label: string }) {
  const geo = useFacade();
  const paths = useMemo(() => {
    const d = (pts: P2[], closed: boolean) => toPath(distortPoints(pts, k1), closed, toPx);
    return {
      wall: d(geo.wall, true),
      slabs: geo.slabs.map((p) => d(p, false)),
      columns: geo.columns.map((p) => d(p, false)),
      cells: geo.cells.map((c) => ({ d: d(c.pts, true), lit: c.lit, tone: c.tone })),
    };
  }, [geo, k1]);

  // Punto de referencia cerca de la esquina inferior derecha: posición ideal y deformada
  const ideal = toPx([HX * 0.9, -HY * 0.9]);
  const moved = toPx(distortPoint(HX * 0.9, -HY * 0.9, k1));

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="block h-auto w-full" role="img" aria-label={label}>
      <rect width={VW} height={VH} fill="#0d131b" />
      <path d={paths.wall} fill="#18212d" />
      {paths.cells.map((c, i) => (
        <path key={i} d={c.d} fill={c.lit ? '#d9a865' : GLASS[Math.floor(c.tone * GLASS.length)] ?? GLASS[0]} opacity={c.lit ? 0.5 + c.tone * 0.3 : 1} />
      ))}
      <g fill="none" strokeLinecap="round">
        {paths.columns.map((d, i) => (
          <path key={i} d={d} stroke="#8a939e" strokeWidth="1.6" />
        ))}
        {paths.slabs.map((d, i) => (
          <path key={i} d={d} stroke="#d5d9de" strokeWidth="3" />
        ))}
      </g>
      {guides && (
        <g stroke="var(--color-amber)" strokeWidth="1" strokeDasharray="5 5" opacity="0.85">
          {GUIDES.map((t) => (
            <line key={`v${t}`} x1={t * VW} x2={t * VW} y1="0" y2={VH} />
          ))}
          {GUIDES.map((t) => (
            <line key={`h${t}`} x1="0" x2={VW} y1={t * VH} y2={t * VH} />
          ))}
        </g>
      )}
      {Math.hypot(moved[0] - ideal[0], moved[1] - ideal[1]) > 1.5 && (
        <g>
          <line x1={ideal[0]} y1={ideal[1]} x2={moved[0]} y2={moved[1]} stroke="var(--color-info)" strokeWidth="1.5" />
          <circle cx={ideal[0]} cy={ideal[1]} r="5" fill="none" stroke="var(--color-info)" strokeWidth="1.5" />
          <circle cx={moved[0]} cy={moved[1]} r="3.5" fill="var(--color-info)" />
        </g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ gráfico k1 frente a focal */

const CW = 340;
const CH = 168;
const PL = 38;
const PR = 46;
const PT = 12;
const PB = 26;
const P_MIN = -7;
const P_MAX = 4;
const cx = (f: number) => PL + (Math.log(f / FOCAL_MIN_MM) / Math.log(FOCAL_MAX_MM / FOCAL_MIN_MM)) * (CW - PL - PR);
const cy = (p: number) => PT + ((P_MAX - p) / (P_MAX - P_MIN)) * (CH - PT - PB);
const fFromX = (x: number) => FOCAL_MIN_MM * Math.pow(FOCAL_MAX_MM / FOCAL_MIN_MM, Math.min(1, Math.max(0, (x - PL) / (CW - PL - PR))));
const SAMPLES = Array.from({ length: 64 }, (_, i) => FOCAL_MIN_MM * Math.pow(FOCAL_MAX_MM / FOCAL_MIN_MM, i / 63));
const seriesPath = (build: LensBuild) => SAMPLES.map((f, i) => `${i ? 'L' : 'M'}${cx(f).toFixed(1)} ${cy(distortionK1(f, build) * 100).toFixed(1)}`).join('');

function DistortionChart({ focal, build, onFocal }: { focal: number; build: LensBuild; onFocal: (mm: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const toLocal = (e: MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * CW;
  };
  const series: Array<{ id: LensBuild; name: string; dash?: string }> = [
    { id: 'prime', name: 'Fijo' },
    { id: 'zoom', name: 'Zoom', dash: '5 4' },
  ];
  const hf = hover ?? null;
  const tipX = hf !== null ? Math.min(CW - PR - 112, Math.max(PL + 4, cx(hf) + 8)) : 0;

  return (
    <figure className="m-0">
      <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-muted">Distorsión en la esquina según la focal</span>
        <span className="flex items-center gap-3 text-[11.5px] text-muted" aria-hidden="true">
          {series.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5">
              <svg width="18" height="6">
                <line x1="0" x2="18" y1="3" y2="3" stroke={s.id === build ? 'var(--color-amber)' : 'var(--color-muted)'} strokeWidth="2" strokeDasharray={s.dash} />
              </svg>
              {s.name}
            </span>
          ))}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${CW} ${CH}`}
        className="block h-auto w-full cursor-crosshair touch-none"
        role="img"
        aria-label={`Gráfico: la distorsión pasa de barril en gran angular (${formatSignedPercent(distortionK1(14, build) * 100)} a 14 mm) a cojín en tele (${formatSignedPercent(distortionK1(400, build) * 100)} a 400 mm). Los zooms distorsionan 1.8 veces más que los fijos.`}
        onPointerMove={(e) => setHover(fFromX(toLocal(e)))}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => onFocal(Math.round(fFromX(toLocal(e))))}
      >
        {[-6, -4, -2, 2, 4].map((p) => (
          <g key={p}>
            <line x1={PL} x2={CW - PR} y1={cy(p)} y2={cy(p)} className="stroke-line" strokeWidth="1" />
            <text x={PL - 6} y={cy(p) + 3.5} textAnchor="end" className="osd fill-faint" fontSize="10">
              {p > 0 ? `+${p}` : `−${-p}`}
            </text>
          </g>
        ))}
        <line x1={PL} x2={CW - PR} y1={cy(0)} y2={cy(0)} className="stroke-line-strong" strokeWidth="1.25" />
        <text x={PL - 6} y={cy(0) + 3.5} textAnchor="end" className="osd fill-muted" fontSize="10">
          0 %
        </text>
        <text x={PL + 6} y={cy(P_MAX) + 10} className="fill-faint" fontSize="10.5">
          Cojín
        </text>
        <text x={CW - PR - 4} y={cy(P_MIN) - 4} textAnchor="end" className="fill-faint" fontSize="10.5">
          Barril
        </text>
        {[14, 24, 50, 85, 200, 400].map((f) => (
          <text key={f} x={cx(f)} y={CH - 8} textAnchor="middle" className="osd fill-faint" fontSize="10">
            {f}
          </text>
        ))}
        {series.map((s) => (
          <g key={s.id}>
            <path
              d={seriesPath(s.id)}
              fill="none"
              stroke={s.id === build ? 'var(--color-amber)' : 'var(--color-muted)'}
              strokeOpacity={s.id === build ? 1 : 0.6}
              strokeWidth="2"
              strokeDasharray={s.dash}
              strokeLinecap="round"
            />
            <text x={CW - PR + 6} y={cy(distortionK1(FOCAL_MAX_MM, s.id) * 100) + (s.id === 'zoom' ? -2 : 10)} className={s.id === build ? 'fill-amber' : 'fill-muted'} fontSize="10.5">
              {s.name}
            </text>
          </g>
        ))}
        <circle cx={cx(focal)} cy={cy(distortionK1(focal, build) * 100)} r="5" className="fill-amber stroke-panel" strokeWidth="2" />
        {hf !== null && (
          <g pointerEvents="none">
            <line x1={cx(hf)} x2={cx(hf)} y1={PT} y2={CH - PB} className="stroke-fg" strokeOpacity="0.35" strokeWidth="1" />
            <rect x={tipX} y={PT + 2} width="108" height="46" rx="5" className="fill-raised stroke-line-strong" />
            <text x={tipX + 8} y={PT + 17} className="osd fill-fg" fontSize="10.5">
              {formatFocal(hf)}
            </text>
            <text x={tipX + 8} y={PT + 30} className="osd fill-muted" fontSize="10">
              Fijo {formatSignedPercent(distortionK1(hf, 'prime') * 100)}
            </text>
            <text x={tipX + 8} y={PT + 42} className="osd fill-muted" fontSize="10">
              Zoom {formatSignedPercent(distortionK1(hf, 'zoom') * 100)}
            </text>
          </g>
        )}
      </svg>
      <p className="mt-1 text-[11.5px] text-faint">Toca el gráfico para elegir esa focal.</p>
    </figure>
  );
}

/* ------------------------------------------------------------------ demo */

export function DistortionDemo({ build, onBuild }: { build: LensBuild; onBuild: (b: LensBuild) => void }) {
  // Empieza en 14 mm, donde el barril es evidente
  const [focal, onFocal] = useState(14);
  const [exaggerate, setExaggerate] = useState(true);
  const [corrected, setCorrected] = useState(false);
  const [guides, setGuides] = useState(true);

  const real = distortionK1(focal, build);
  const info = describeDistortion(real);
  const wanted = exaggerate ? real * 4 : real;
  const limited = wanted < MIN_DEMO_K1;
  const shown = corrected ? 0 : Math.max(MIN_DEMO_K1, wanted);
  const shownPct = shown * 100;

  const label = corrected
    ? `Fachada fotografiada con ${formatFocal(focal)} y el perfil de corrección activado: todas las líneas quedan rectas.`
    : `Fachada fotografiada con un ${build === 'prime' ? 'objetivo fijo' : 'zoom'} a ${formatFocal(focal)}: ${info.label.toLowerCase()}, ${formatSignedPercent(real * 100)} en la esquina${exaggerate ? ', exagerado para que se vea' : ''}. ${
        info.kind === 'barrel' ? 'Las rectas se curvan hacia fuera.' : info.kind === 'pincushion' ? 'Las rectas se curvan hacia dentro.' : 'Las rectas apenas se curvan.'
      }`;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-3">
        <div className="relative overflow-hidden rounded-lg border border-line bg-ink">
          <FacadeView k1={shown} guides={guides} label={label} />
          <div className="osd pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5 text-[11px]" aria-hidden="true">
            <span className="rounded-xs bg-ink/80 px-2 py-1 text-fg">
              {formatFocal(focal)} · {build === 'prime' ? 'fijo' : 'zoom'}
            </span>
            {exaggerate && !corrected && <span className="rounded-xs bg-amber-soft px-2 py-1 text-amber">×4</span>}
            {corrected && <span className="rounded-xs bg-data-soft px-2 py-1 text-data">Perfil aplicado</span>}
          </div>
          <div className="osd pointer-events-none absolute right-3 top-3 rounded-xs bg-ink/80 px-2 py-1 text-right text-[11px]" aria-hidden="true">
            <span className="text-faint">Esquina </span>
            <span className={cn(shownPct === 0 ? 'text-data' : 'text-info')}>{formatSignedPercent(shownPct)}</span>
          </div>
        </div>
        <p className="text-[12.5px] leading-relaxed text-faint">
          <span className="text-info">●</span> El punto azul marca dónde termina un detalle que debería estar en el círculo. En barril las rectas se abomban hacia
          fuera; en cojín, hacia dentro. Las guías ámbar son rectas de verdad.
        </p>
      </div>

      <Panel eyebrow="Distorsión radial" title="Barril y cojín">
        <div className="space-y-5">
          <Segmented
            label="Tipo de objetivo"
            stretch
            value={build}
            onChange={onBuild}
            options={[
              { value: 'prime', label: 'Fijo' },
              { value: 'zoom', label: 'Zoom' },
            ]}
          />
          <div>
            <div className="mb-2 text-[13px] font-medium text-muted">Focal</div>
            <FocalChips values={QUICK_FOCALS} value={focal} onChange={onFocal} label="Focal para la demo de distorsión" />
          </div>
          <div className="space-y-3 border-y border-line py-4">
            <Switch label="Exagerar ×4 para verla" description="Multiplica k₁ por cuatro: la forma es la misma, solo más evidente." checked={exaggerate} onChange={setExaggerate} />
            <Switch label="Corrección de perfil de lente" description="Lo que hacen la cámara o el editor con el perfil del objetivo." checked={corrected} onChange={setCorrected} />
            <Switch label="Guías rectas" checked={guides} onChange={setGuides} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Readout label="k₁" value={real.toFixed(3).replace('-', '−')} />
            <Readout label="Esquina" value={formatSignedPercent(real * 100)} tone={info.kind === 'none' ? 'data' : 'info'} />
            <Readout label="Tipo" value={info.kind === 'barrel' ? 'Barril' : info.kind === 'pincushion' ? 'Cojín' : 'Nula'} />
          </div>
          {limited && !corrected && (
            <p className="text-[12px] text-faint">Exageración limitada a {formatSignedPercent(MIN_DEMO_K1 * 100)} para que la imagen siga cubriendo las esquinas.</p>
          )}
          <DistortionChart focal={focal} build={build} onFocal={onFocal} />
        </div>
      </Panel>

      <Callout kind="info" title="Distorsión no es lo mismo que perspectiva" className="xl:col-span-2">
        La distorsión de barril o cojín es un defecto del diseño óptico: curva las rectas que no pasan por el centro y es más fuerte en los extremos de los zooms
        (×1.8 frente a un fijo). Se corrige casi por completo con el <strong>perfil del objetivo</strong>, a cambio de recortar un poco los bordes. En cambio, el
        estiramiento de las formas en los bordes de un 14 mm o la convergencia de verticales al inclinar la cámara son <strong>perspectiva</strong>: no los quita
        ningún perfil.
      </Callout>
    </div>
  );
}
