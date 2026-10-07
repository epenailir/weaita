/**
 * Medidores de costo vinculados a cada control: apertura → profundidad de campo y fondo;
 * velocidad → movimiento (o estrellas) y trepidación; ISO → ruido y rango dinámico.
 * Cada medidor dice su estado con forma, palabra y color, y dibuja una regla con la zona buena.
 */
import { Gauge, Timer } from 'lucide-react';
import type { ReactNode } from 'react';
import { SENSORS, formatAperture, formatDistance, formatIso, handheldLimitS } from '../../engine';
import { ApertureIris } from '../../components/viewfinder';
import { cn } from '../../lib/cn';
import { pctText, pxText, shutterText } from './assessment';
import type { Assessment, Criterion, ShotContext, Status } from './assessment';
import { STATUS_TEXT_CLASS, StatusGlyph } from './LabUi';
import { capitalize, toSubject, verbFor } from './sceneBriefs';

export type MeterGroup = 'aperture' | 'shutter' | 'iso';

interface Marker {
  at: number;
  kind: 'value' | 'subject' | 'tick';
  label?: string;
}

interface MeterSpec {
  key: string;
  label: string;
  status: Status;
  value: string;
  note: string;
  /** Zona buena de la regla (fracciones 0–1). */
  zone?: [number, number];
  /** Franja medida (p. ej. la zona nítida). */
  band?: [number, number];
  markers: Marker[];
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/* ------------------------------------------------------------------ Escalas */

/** Distancias: 0.3 m … 3 km en escala logarítmica; el infinito queda en el extremo. */
const distX = (m: number) => (Number.isFinite(m) && m < 1e5 ? clamp01((Math.log(m / 0.3) / Math.log(3000 / 0.3)) * 0.9) : 1);
const bgX = (pct: number) => clamp01(Math.sqrt(pct / 4));
const pxX = (px: number) => clamp01((Math.log10(Math.max(px, 0.1)) + 1) / 4);
const ratioX = (r: number) => clamp01((Math.log2(Math.max(r, 1 / 16)) + 4) / 8);
const noiseX = (s: number) => clamp01(s / 100);
const drX = (d: number) => clamp01((d - 4) / 9);

function MeterBar({ spec }: { spec: MeterSpec }) {
  const color = STATUS_TEXT_CLASS[spec.status];
  return (
    <div className="relative mt-1.5 h-3.5" aria-hidden="true">
      <div className="absolute inset-x-0 top-[5px] h-1 rounded-full bg-raised" />
      {spec.zone && (
        <div
          className="absolute top-[4px] h-1.5 rounded-full bg-data/25"
          style={{ left: `${spec.zone[0] * 100}%`, width: `${Math.max(1, (spec.zone[1] - spec.zone[0]) * 100)}%` }}
        />
      )}
      {spec.band && (
        <div
          className={cn('absolute top-[3px] h-2 rounded-full border border-current bg-current/30 transition-[left,width] duration-200', color)}
          style={{ left: `${spec.band[0] * 100}%`, width: `${Math.max(1.2, (spec.band[1] - spec.band[0]) * 100)}%` }}
        />
      )}
      {spec.markers.map((m, i) =>
        m.kind === 'value' ? (
          <span
            key={i}
            className={cn('absolute top-0 h-3.5 w-[3px] -translate-x-1/2 rounded-full bg-current transition-[left] duration-200', color)}
            style={{ left: `${m.at * 100}%` }}
          />
        ) : m.kind === 'subject' ? (
          <span
            key={i}
            title={m.label}
            className="absolute -top-[3px] h-0 w-0 -translate-x-1/2 border-x-[4px] border-t-[6px] border-x-transparent border-t-fg"
            style={{ left: `${m.at * 100}%` }}
          />
        ) : (
          <span key={i} className="absolute top-[2px] h-2.5 w-px -translate-x-1/2 bg-muted" style={{ left: `${m.at * 100}%` }} />
        ),
      )}
    </div>
  );
}

function MeterRow({ spec }: { spec: MeterSpec }) {
  return (
    <li className="min-w-0 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-fg">
          <StatusGlyph status={spec.status} size={14} />
          <span className="truncate">{spec.label}</span>
        </span>
        <span className="osd shrink-0 text-[12.5px] text-fg">{spec.value}</span>
      </div>
      <MeterBar spec={spec} />
      <p className="mt-1 flex items-baseline justify-between gap-2 text-[11.5px] leading-snug text-faint">
        <span className="min-w-0">{spec.note}</span>
        <span className={cn('osd shrink-0 text-[10px] font-semibold uppercase tracking-wider', STATUS_TEXT_CLASS[spec.status])} aria-hidden="true">
          {statusWord(spec.status)}
        </span>
      </p>
    </li>
  );
}

function statusWord(s: Status): string {
  return s === 'good' ? 'Bien' : s === 'fair' ? 'Regular' : s === 'bad' ? 'Mal' : 'Libre';
}

/* ------------------------------------------------------------------ Especificaciones */

function need(c: Criterion | undefined, fallback: Status = 'neutral'): Status {
  return c?.status ?? fallback;
}

function buildGroups(ctx: ShotContext, a: Assessment): Array<{ group: MeterGroup; title: string; value: string; icon: ReactNode; meters: MeterSpec[] }> {
  const { metrics: m, effective: e, scene, brief } = ctx;
  const L = scene.lighting;
  const sensor = SENSORS[e.sensor];

  // Profundidad de campo
  const dofMarkers: Marker[] = [];
  let dofNote: string;
  if (brief.focus === 'deep') {
    const fg = L.foregroundDistanceM ?? L.subjectDistanceM;
    dofMarkers.push({ at: distX(fg), kind: 'subject', label: 'Primer plano' }, { at: 1, kind: 'subject', label: 'Infinito' });
    const fgOk = fg >= m.dofNearM * 0.999999;
    const infOk = !Number.isFinite(m.dofFarM) || m.dofFarM >= L.backgroundDistanceM;
    dofNote = `Primer plano (${formatDistance(fg)}) ${fgOk ? 'nítido' : 'borroso'} · montañas ${infOk ? 'nítidas' : 'borrosas'}`;
  } else if (brief.focus === 'infinity') {
    dofMarkers.push({ at: 1, kind: 'subject', label: 'Estrellas' });
    dofNote = Number.isFinite(m.dofFarM) ? `No llega al infinito (hiperfocal ${formatDistance(m.hyperfocalM)})` : 'Llega al infinito: estrellas nítidas';
  } else {
    dofMarkers.push({ at: distX(L.subjectDistanceM), kind: 'subject', label: 'Sujeto' });
    dofNote =
      need(a.focus) === 'good'
        ? `Cubre ${toSubject(brief)} (${formatDistance(L.subjectDistanceM)})`
        : `${capitalize(brief.subject)} (${formatDistance(L.subjectDistanceM)}) ${verbFor(brief, 'queda', 'quedan')} fuera`;
  }
  const dof: MeterSpec = {
    key: 'dof',
    label: 'Profundidad de campo',
    status: need(a.focus),
    value: `${formatDistance(m.dofNearM)} – ${formatDistance(m.dofFarM)}`,
    note: dofNote,
    band: [distX(m.dofNearM), distX(m.dofFarM)],
    markers: dofMarkers,
  };

  // Desenfoque del fondo
  const bgIntent = brief.background;
  const background: MeterSpec = {
    key: 'background',
    label: 'Desenfoque del fondo',
    status: need(a.background),
    value: pctText(m.backgroundBlurPct),
    note: bgIntent.kind === 'bokeh' ? `del ancho · separar: ≥ ${pctText(bgIntent.goodPct)}` : 'del ancho · elección libre aquí',
    zone: bgIntent.kind === 'bokeh' ? [bgX(bgIntent.goodPct), 1] : undefined,
    markers: [{ at: bgX(m.backgroundBlurPct), kind: 'value' }],
  };

  // Movimiento o estrellas
  let motion: MeterSpec;
  if (a.stars) {
    motion = {
      key: 'stars',
      label: 'Estelas de estrellas',
      status: a.stars.status,
      value: `×${m.starTrailRatio.toFixed(1)}`,
      note: `Regla de los 500: máx. ${shutterText(m.maxStarExposureS)}`,
      zone: [0, ratioX(1)],
      markers: [{ at: ratioX(m.starTrailRatio), kind: 'value' }, { at: ratioX(1), kind: 'tick' }],
    };
  } else {
    const intent = brief.motion;
    motion = {
      key: 'motion',
      label: 'Barrido del sujeto',
      status: need(a.motion),
      value: pxText(m.subjectMotionBlurPx),
      note:
        intent.kind === 'freeze'
          ? `a 1000 px · congelar: ≤ ${intent.goodPx} px`
          : intent.kind === 'blur'
            ? `a 1000 px · estela: ≥ ${intent.goodPx} px`
            : 'a 1000 px · no hay sujetos en movimiento',
      zone: intent.kind === 'freeze' ? [0, pxX(intent.goodPx)] : intent.kind === 'blur' ? [pxX(intent.goodPx), 1] : undefined,
      markers: [{ at: pxX(m.subjectMotionBlurPx), kind: 'value' }],
    };
  }

  // Trepidación
  const limit = handheldLimitS(e.focalMm, sensor, e.stabilizationStops);
  const shake: MeterSpec = {
    key: 'shake',
    label: 'Riesgo de trepidación',
    status: need(a.shake, 'good'),
    value: e.tripod ? 'Trípode' : m.shakeRatio < 0.1 ? '×<0.1' : `×${m.shakeRatio.toFixed(m.shakeRatio < 10 ? 1 : 0)}`,
    note: e.tripod
      ? 'Sin temblor: cualquier tiempo sirve'
      : `${shutterText(e.shutter)} vs. límite ${shutterText(limit)}${e.stabilizationStops > 0 ? ` (${e.stabilizationStops} pasos IS)` : ''}`,
    zone: [0, ratioX(1)],
    markers: [{ at: e.tripod ? 0 : ratioX(m.shakeRatio), kind: 'value' }, { at: ratioX(1), kind: 'tick' }],
  };

  // Ruido
  const noise: MeterSpec = {
    key: 'noise',
    label: 'Ruido',
    status: need(a.noise),
    value: `${m.noiseScore}/100`,
    note: `ISO ${formatIso(e.iso)} · limpio aquí hasta ${brief.noise.good}/100`,
    zone: [0, noiseX(brief.noise.good)],
    markers: [{ at: noiseX(m.noiseScore), kind: 'value' }],
  };

  // Rango dinámico
  const contrast = L.sceneContrastStops;
  const range: MeterSpec = {
    key: 'dr',
    label: 'Rango dinámico',
    status: need(a.dynamicRange),
    value: `${m.dynamicRangeStops.toFixed(1)} pasos`,
    note: `La escena tiene ${contrast} pasos de contraste`,
    zone: [drX(contrast), 1],
    markers: [{ at: drX(m.dynamicRangeStops), kind: 'value' }, { at: drX(contrast), kind: 'subject', label: 'Contraste de la escena' }],
  };

  return [
    {
      group: 'aperture',
      title: 'Apertura',
      value: formatAperture(e.aperture),
      icon: <ApertureIris fNumber={e.aperture} size={18} />,
      meters: [dof, background],
    },
    { group: 'shutter', title: 'Velocidad', value: shutterText(e.shutter), icon: <Timer size={15} aria-hidden="true" />, meters: [motion, shake] },
    { group: 'iso', title: 'ISO', value: formatIso(e.iso), icon: <Gauge size={15} aria-hidden="true" />, meters: [noise, range] },
  ];
}

export function CostMeters({ ctx, assessment, active }: { ctx: ShotContext; assessment: Assessment; active: MeterGroup | null }) {
  const groups = buildGroups(ctx, assessment);
  return (
    <section aria-labelledby="costos-title">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h3 id="costos-title" className="text-[14px] font-semibold text-fg">
          Lo que cuesta cada ajuste
        </h3>
        <span className="eyebrow">En vivo</span>
      </div>
      <p className="mb-3 text-[12px] leading-snug text-faint">Cada control compra luz con un efecto secundario. La franja verde es la zona buena para esta escena.</p>
      <div className="space-y-2.5">
        {groups.map((g) => (
          <div
            key={g.group}
            className={cn(
              'rounded-md border px-3 pt-2 transition-colors duration-200',
              active === g.group ? 'border-amber/45 bg-amber-soft/60' : 'border-line bg-panel-2',
            )}
          >
            <div className="flex items-center justify-between gap-2 border-b border-line/70 pb-1.5">
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
                <span className="text-faint">{g.icon}</span>
                {g.title}
                {active === g.group && <span className="osd rounded-xs bg-amber px-1 text-[9.5px] font-semibold uppercase text-ink">último ajuste</span>}
              </span>
              <span className="osd text-[12px] text-amber">{g.value}</span>
            </div>
            <ul className="divide-y divide-line/60">
              {g.meters.map((spec) => (
                <MeterRow key={spec.key} spec={spec} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
