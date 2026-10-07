/**
 * Diagnóstico de una toma ("Disparar para evaluar"): qué salió bien, qué falló con el valor
 * medido y qué parámetro moverías y por qué. También genera los avisos del visor y el
 * resumen breve que se anuncia en la región viva.
 */
import { SENSORS, formatAperture, formatIso, formatShutter, handheldLimitS } from '../../engine';
import type { CameraSettings, Histogram, ResolvedExposure, ShotMetrics } from '../../engine';
import type { SceneId } from '../../sim/types';
import { adviseAll } from './advice';
import type { Advice } from './advice';
import { CRITERION_WEIGHT, STATUS_WORD, assess, cocPct, evText, pctText, shutterText } from './assessment';
import type { Assessment, Criterion, CriterionId, Grades, ShotContext } from './assessment';

export interface Finding {
  criterion: Criterion;
  advice?: Advice;
}

export type Verdict = 'great' | 'close' | 'fix';

export interface Diagnosis {
  verdict: Verdict;
  headline: string;
  goal: string;
  goalMet: boolean;
  good: Criterion[];
  issues: Finding[];
  counts: { good: number; fair: number; bad: number };
}

/** Toma congelada con todo lo necesario para revisarla y compararla. */
export interface Shot {
  id: number;
  sceneId: SceneId;
  sceneName: string;
  /** Imagen JPEG en data URL. */
  image: string;
  settings: CameraSettings;
  effective: CameraSettings;
  metrics: ShotMetrics;
  histogram: Histogram;
  limited: ResolvedExposure['limited'];
  rollDeg: number;
  diagnosis: Diagnosis;
}

/** Criterios que se celebran en "lo que salió bien" (los demás solo aparecen si fallan). */
const PRAISED: CriterionId[] = ['exposure', 'highlights', 'motion', 'stars', 'focus', 'background', 'shake', 'noise', 'dynamicRange'];
/** Criterios que definen si se cumplió la intención de la escena. */
const CORE: CriterionId[] = ['exposure', 'motion', 'stars', 'focus', 'background', 'shake', 'limit'];
/** Orden de lectura de los problemas cuando tienen la misma gravedad. */
const ORDER: CriterionId[] = [
  'limit',
  'exposure',
  'motion',
  'stars',
  'shake',
  'focus',
  'background',
  'highlights',
  'noise',
  'diffraction',
  'dynamicRange',
  'whiteBalance',
  'level',
];

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function diagnose(ctx: ShotContext): Diagnosis {
  const a = assess(ctx);
  const list = ORDER.map((id) => a[id]).filter((c): c is Criterion => c !== undefined);
  const issues = list
    .filter((c) => c.status === 'fair' || c.status === 'bad')
    .sort((x, y) => {
      const sx = x.status === 'bad' ? 0 : 1;
      const sy = y.status === 'bad' ? 0 : 1;
      if (sx !== sy) return sx - sy;
      return CRITERION_WEIGHT[y.id] - CRITERION_WEIGHT[x.id] || ORDER.indexOf(x.id) - ORDER.indexOf(y.id);
    });
  const good = list.filter((c) => c.status === 'good' && PRAISED.includes(c.id));
  const advice = adviseAll(
    ctx,
    issues.map((c) => c.id),
  );

  const bad = issues.filter((c) => c.status === 'bad').length;
  const fair = issues.length - bad;
  const verdict: Verdict = bad === 0 && fair <= 1 ? 'great' : bad === 0 ? 'close' : 'fix';
  const headline =
    verdict === 'great'
      ? fair === 0
        ? 'Toma lograda'
        : 'Toma lograda, con un detalle para pulir'
      : verdict === 'close'
        ? `Casi: falta afinar ${plural(fair, 'detalle', 'detalles')}`
        : `Hay que corregir ${plural(bad, 'punto', 'puntos')}${fair > 0 ? ` y afinar ${plural(fair, 'detalle', 'detalles')}` : ''}`;
  const goalMet = CORE.every((id) => {
    const c = a[id];
    return !c || c.status === 'good' || c.status === 'neutral';
  });

  return {
    verdict,
    headline,
    goal: ctx.brief.goal,
    goalMet,
    good,
    issues: issues.map((criterion) => ({ criterion, advice: advice[criterion.id] })),
    counts: { good: good.length, fair, bad },
  };
}

/* ------------------------------------------------------------------ Avisos del visor */

const LIMIT_SHORT = { aperture: 'apertura', shutter: 'velocidad', iso: 'ISO' } as const;

/** Avisos breves que mostraría la cámara (máximo tres, por prioridad). */
export function viewfinderWarnings(ctx: ShotContext, grades: Grades): string[] {
  const { metrics: m, effective: e, brief } = ctx;
  const sensor = SENSORS[e.sensor];
  const w: string[] = [];
  if (ctx.limited) w.push(`Fuera de rango: ${LIMIT_SHORT[ctx.limited]}`);
  if (!e.tripod && m.shakeRatio > 1) {
    w.push(`Riesgo de trepidación: ${formatShutter(e.shutter)} > ${formatShutter(handheldLimitS(e.focalMm, sensor, e.stabilizationStops))}`);
  }
  if (m.starTrailRatio > 1) w.push(`Estrellas movidas: máx. ${formatShutter(m.maxStarExposureS)}`);
  if (ctx.highlightsPct !== null && ctx.highlightsPct > brief.clipTolerancePct + 1) w.push(`Altas luces quemadas: ${pctText(ctx.highlightsPct)}`);
  if (grades.noise === 'bad') w.push(`Ruido alto: ISO ${formatIso(e.iso)}`);
  if (m.diffractionPct > cocPct(sensor)) w.push(`Difracción a ${formatAperture(e.aperture)}`);
  return w.slice(0, 3);
}

/* ------------------------------------------------------------------ Región viva */

const word = (c: Criterion | undefined) => (c ? STATUS_WORD[c.status].toLowerCase() : '');

/** Resumen hablado del resultado actual (se anuncia con retardo tras cada cambio). */
export function liveSummary(ctx: ShotContext, a: Assessment): string {
  const { effective: e, metrics: m, brief } = ctx;
  const parts: string[] = [`${formatAperture(e.aperture)}, ${shutterText(e.shutter)}, ISO ${formatIso(e.iso)}.`];
  const ex = a.exposure;
  if (ex) {
    parts.push(
      ex.status === 'good'
        ? `Exposición correcta (${evText(m.exposureOffset)}).`
        : `${m.exposureOffset > 0 ? 'Sobreexpuesta' : 'Subexpuesta'} ${evText(m.exposureOffset)}.`,
    );
  }
  if (a.motion) parts.push(`Movimiento de ${brief.subject}: ${a.motion.value}, ${word(a.motion)}.`);
  if (a.stars) parts.push(`Estrellas: ${word(a.stars)}.`);
  if (a.focus) parts.push(a.focus.status === 'good' ? 'Zona nítida correcta.' : `Zona nítida ${word(a.focus)}: ${a.focus.value}.`);
  if (a.background && a.background.status !== 'neutral') parts.push(`Fondo ${a.background.value}, ${word(a.background)}.`);
  if (a.shake && a.shake.status !== 'good') parts.push(`Riesgo de trepidación, ${word(a.shake)}.`);
  if (a.noise) parts.push(`Ruido ${word(a.noise)}.`);
  if (a.limit && a.limit.status === 'bad') parts.push(`${a.limit.value}.`);
  return parts.join(' ');
}
