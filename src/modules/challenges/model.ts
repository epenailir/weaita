/**
 * Lógica pura del módulo de desafíos: ajustes iniciales, formato de métricas, diagnóstico de
 * criterios fallidos y orden del quiz. Sin React, para poder razonarla y probarla aislada.
 */
import {
  APERTURES,
  ISOS,
  SHUTTERS,
  formatAperture,
  formatDistance,
  formatEV,
  formatIso,
  formatShutter,
  formatThirds,
  nearestStop,
} from '../../engine';
import type { CameraSettings, MetricKey, ShotMetrics, TargetResult } from '../../engine';
import type { Challenge, ChallengeParam, Level, QuizQuestion } from '../../content/types';
import type { SimScene } from '../../sim';

export const LEVELS: Level[] = ['Cero', 'Básico', 'Intermedio', 'Avanzado'];

export const LEVEL_INFO: Record<Level, { step: number; blurb: string }> = {
  Cero: {
    step: 1,
    blurb: 'Un solo parámetro libre: aprende qué hace cada uno.',
  },
  Básico: { step: 2, blurb: 'Dos criterios a la vez: elige qué sacrificar.' },
  Intermedio: {
    step: 3,
    blurb: 'Situaciones reales con varias restricciones.',
  },
  Avanzado: {
    step: 4,
    blurb: 'Todo libre y criterios exigentes: decide como un profesional.',
  },
};

export const PARAM_LABEL: Record<ChallengeParam, string> = {
  aperture: 'apertura',
  shutter: 'velocidad',
  iso: 'ISO',
  focal: 'focal',
};

export const ALL_PARAMS: ChallengeParam[] = ['aperture', 'shutter', 'iso', 'focal'];

/** Ajustes de la cámara al abrir un desafío: modo M, valores iniciales en la escala, foco y WB de la escena. */
export function initialSettings(challenge: Challenge, scene: SimScene): Partial<CameraSettings> {
  return {
    mode: 'M',
    autoIso: false,
    exposureComp: 0,
    aperture: nearestStop(APERTURES, challenge.initial.aperture).value,
    shutter: nearestStop(SHUTTERS, challenge.initial.shutterSeconds).value,
    iso: nearestStop(ISOS, challenge.initial.iso).value,
    focalMm: challenge.initial.focalMm,
    focusM: scene.defaults.focusM,
    wbK: scene.defaults.wbK,
    stabilizationStops: 0,
    tripod: false,
  };
}

/** Velocidad legible en texto didáctico: "1/250 s" o "2 s". */
export function shutterText(t: number): string {
  const label = formatShutter(t);
  return label.endsWith('"') ? `${label.slice(0, -1)} s` : `${label} s`;
}

/** Cantidad de pasos en texto: "⅔ de paso", "1 paso", "1⅓ pasos". */
export function stopsText(ev: number): string {
  const thirds = Math.max(1, Math.round(Math.abs(ev) * 3));
  const label = formatThirds(thirds / 3).replace(/^[+−]/, '');
  if (thirds < 3) return `${label} de paso`;
  return thirds === 3 ? '1 paso' : `${label} pasos`;
}

/** Concuerda el verbo con la cantidad de pasos: "Te falta ⅔ de paso" / "Te faltan 2 pasos". */
function verbFor(ev: number, singular: string): string {
  return Math.round(Math.abs(ev) * 3) > 3 ? `${singular}n` : singular;
}

/** Valor medido de un criterio, con su unidad. */
export function formatMetric(metric: MetricKey, value: number, m: ShotMetrics): string {
  switch (metric) {
    case 'exposureError':
      return `${formatEV(m.exposureOffset)} EV`;
    case 'subjectMotionBlurPx':
      return `${value.toFixed(value < 10 ? 1 : 0)} px`;
    case 'backgroundBlurPct':
      return `${value.toFixed(1)} %`;
    case 'dofNearM':
    case 'dofFarM':
      return formatDistance(value >= 1e5 ? Infinity : value);
    case 'iso':
      return `ISO ${formatIso(value)}`;
    case 'shutterSeconds':
      return shutterText(value);
    case 'aperture':
      return formatAperture(value);
    case 'focalMm':
      return `${Math.round(value)} mm`;
    case 'shakeRatio':
      return `${value.toFixed(1)}× el límite`;
    case 'starTrailRatio':
      return `${value.toFixed(1)}× la regla`;
    case 'noiseScore':
      return value.toFixed(2);
  }
}

export interface Diagnosis {
  label: string;
  /** Qué salió (valor medido y cómo se compara). */
  measured: string;
  /** Cuánto falta para cumplir. */
  gap: string;
  /** Qué parámetro moverías y por qué. */
  advice: string;
}

interface DiagnosisContext {
  locked: ChallengeParam[];
  targets: TargetResult[];
  metrics: ShotMetrics;
}

const log2 = (x: number) => Math.log(x) / Math.LN2;

/** Lista legible: "a, b o c". */
function joinOr(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} o ${items[items.length - 1]}`;
}

function hasTarget(ctx: DiagnosisContext, metric: MetricKey): TargetResult | undefined {
  return ctx.targets.find((t) => t.metric === metric);
}

/** Opciones para ganar o perder luz que respetan los bloqueos y avisan de su costo. */
function exposureMoves(ctx: DiagnosisContext, needMoreLight: boolean): string[] {
  const free = (p: ChallengeParam) => !ctx.locked.includes(p);
  const m = ctx.metrics;
  const moves: string[] = [];
  if (needMoreLight) {
    const apTarget = ctx.targets.find((t) => t.metric === 'aperture' && t.op === '>=');
    const canOpen = m.aperture > (APERTURES[0]?.value ?? 1.4) * 1.01 && !(apTarget && m.aperture <= apTarget.value * 1.01);
    if (free('aperture') && canOpen) {
      const dofCost = hasTarget(ctx, 'dofNearM') || hasTarget(ctx, 'dofFarM') || apTarget;
      moves.push(`abrir el diafragma (número f más bajo${dofCost ? ', pero perderás profundidad de campo' : ''})`);
    }
    if (free('shutter')) {
      const motion = hasTarget(ctx, 'subjectMotionBlurPx') || hasTarget(ctx, 'shakeRatio') || hasTarget(ctx, 'starTrailRatio');
      moves.push(`alargar el tiempo de exposición${motion ? ' (vigila que no aparezca barrido o trepidación)' : ''}`);
    }
    const isoTarget = ctx.targets.find((t) => t.metric === 'iso' && t.op === '<=');
    if (free('iso') && !(isoTarget && m.iso >= isoTarget.value * 0.99)) {
      moves.push(isoTarget ? `subir el ISO sin pasar de ${formatIso(isoTarget.value)}` : 'subir el ISO (a costa de más ruido)');
    }
  } else {
    const apTarget = ctx.targets.find((t) => t.metric === 'aperture' && t.op === '<=');
    if (free('aperture') && !(apTarget && m.aperture >= apTarget.value * 0.99)) {
      moves.push(`cerrar el diafragma (número f más alto${hasTarget(ctx, 'backgroundBlurPct') ? ', aunque el fondo se verá más nítido' : ''})`);
    }
    const shTarget = ctx.targets.find((t) => t.metric === 'shutterSeconds' && t.op === '>=');
    if (free('shutter') && !(shTarget && m.shutterSeconds <= shTarget.value * 1.01)) moves.push('acortar el tiempo de exposición');
    if (free('iso') && m.iso > (ISOS[0]?.value ?? 100) * 1.01) moves.push('bajar el ISO (además ganas limpieza)');
  }
  return moves;
}

/** Diagnóstico de un criterio fallido: qué salió, cuánto falta y qué moverías (sin dar la receta completa). */
export function diagnose(result: TargetResult, ctx: DiagnosisContext): Diagnosis {
  const m = ctx.metrics;
  const free = (p: ChallengeParam) => !ctx.locked.includes(p);
  const measured = formatMetric(result.metric, result.actual, m);
  const base = { label: result.label };

  switch (result.metric) {
    case 'exposureError': {
      const over = m.exposureOffset > 0;
      const moves = exposureMoves(ctx, !over);
      return {
        ...base,
        measured: `La foto salió ${over ? 'sobreexpuesta' : 'subexpuesta'}: ${measured} (margen ±${result.value} EV).`,
        gap: `${verbFor(m.exposureOffset, over ? 'Te sobra' : 'Te falta')} ${stopsText(m.exposureOffset)} de luz, aproximadamente.`,
        advice: moves.length
          ? `Podrías ${joinOr(moves)}.`
          : 'Con lo que tienes libre no puedes corregirla así: revisa qué otro criterio te obliga a un valor extremo.',
      };
    }
    case 'subjectMotionBlurPx':
    case 'shakeRatio':
    case 'starTrailRatio': {
      const ratio = result.actual / result.value;
      const stops = log2(Math.max(ratio, 1.0001));
      const what =
        result.metric === 'subjectMotionBlurPx'
          ? 'el sujeto se movió durante la exposición'
          : result.metric === 'shakeRatio'
            ? 'el tiempo supera lo que tu pulso sostiene con esta focal'
            : 'la Tierra giró lo suficiente para que las estrellas dejen estela';
      const moves: string[] = [];
      if (free('shutter')) moves.push(`acortar el tiempo al menos ${stopsText(stops)} (cada paso divide el desenfoque a la mitad)`);
      if (free('focal')) moves.push('usar una focal más corta (amplía menos el movimiento)');
      return {
        ...base,
        measured: `Medido: ${measured}; ${what}.`,
        gap: `Necesitas reducirlo a ${result.metric === 'subjectMotionBlurPx' ? `${result.value} px` : '1×'} o menos.`,
        advice: moves.length ? `Podrías ${joinOr(moves)}; luego recupera la luz con otro parámetro.` : 'Revisa qué parámetros tienes libres.',
      };
    }
    case 'backgroundBlurPct': {
      const factor = result.value / Math.max(result.actual, 1e-6);
      const moves: string[] = [];
      // El disco de desenfoque crece como 1/N: duplicarlo exige abrir 2 pasos.
      if (free('aperture')) {
        const needed = 2 * log2(factor);
        const available = 2 * log2(m.aperture / (APERTURES[0]?.value ?? 1.4));
        // Si el objetivo ya está abierto al máximo, la apertura no es una opción.
        if (needed <= available + 0.01) moves.push(`abrir el diafragma unos ${stopsText(needed)}`);
        else if (available > 0.3) moves.push('abrir el diafragma (aunque solo con eso no alcanza)');
      }
      if (free('focal')) moves.push('usar más focal (el disco crece con el cuadrado de la focal)');
      return {
        ...base,
        measured: `El fondo quedó demasiado definido: disco de ${measured} del ancho.`,
        gap: `Necesitas ${result.value} % o más (unas ${factor.toFixed(1)} veces más desenfoque).`,
        advice: moves.length ? `Podrías ${joinOr(moves)}.` : 'Revisa qué parámetros tienes libres.',
      };
    }
    case 'dofNearM':
    case 'dofFarM': {
      const near = result.metric === 'dofNearM';
      const moves: string[] = [];
      if (free('aperture')) moves.push('cerrar el diafragma (número f más alto)');
      if (free('focal')) moves.push('usar una focal más corta');
      return {
        ...base,
        measured: `La zona nítida ${near ? 'empieza' : 'termina'} en ${measured}.`,
        gap: near
          ? `Debe empezar a ${formatDistance(result.value)} o más cerca.`
          : `Debe llegar hasta ${result.value >= 1000 ? 'el infinito' : formatDistance(result.value)}.`,
        advice: moves.length
          ? `Para ampliar la profundidad de campo podrías ${joinOr(moves)}; compensa la luz con otro parámetro.`
          : 'Revisa qué parámetros tienes libres.',
      };
    }
    case 'iso': {
      const ratio = result.actual / result.value;
      return {
        ...base,
        measured: `Usaste ${measured}.`,
        gap: `Está ${stopsText(log2(Math.max(ratio, 1.0001)))} por encima del máximo permitido.`,
        advice: 'Baja el ISO y recupera la luz con la apertura o el tiempo, según lo que permitan los demás criterios.',
      };
    }
    case 'aperture': {
      const closeMore = result.op === '>=';
      const stops = 2 * Math.abs(log2(result.value / result.actual));
      return {
        ...base,
        measured: `Usaste ${measured}.`,
        gap: `Te falta ${closeMore ? 'cerrar' : 'abrir'} ${stopsText(stops)}.`,
        advice: closeMore
          ? 'Cierra el diafragma (número f más alto) y compensa la luz perdida con el tiempo o el ISO.'
          : 'Abre el diafragma (número f más bajo) y compensa el exceso de luz con el tiempo o el ISO.',
      };
    }
    case 'shutterSeconds': {
      const stops = Math.abs(log2(result.value / result.actual));
      const longer = result.op === '>=';
      return {
        ...base,
        measured: `El tiempo fue de ${measured}.`,
        gap: `${verbFor(stops, 'Te falta')} ${stopsText(stops)} para llegar a ${shutterText(result.value)}.`,
        advice: longer
          ? 'Alarga el tiempo y reduce la luz cerrando el diafragma o bajando el ISO.'
          : 'Acorta el tiempo y recupera la luz con la apertura o el ISO.',
      };
    }
    case 'focalMm':
      return {
        ...base,
        measured: `Usaste ${measured}.`,
        gap: `Necesitas ${result.op === '>=' ? 'al menos' : 'como máximo'} ${Math.round(result.value)} mm.`,
        advice: result.op === '>=' ? 'Acércate con el zoom (más focal) y retrocede para mantener el encuadre.' : 'Abre el zoom (menos focal).',
      };
    case 'noiseScore':
      return {
        ...base,
        measured: `Ruido estimado: ${measured}.`,
        gap: `Debe quedar en ${result.value.toFixed(2)} o menos.`,
        advice: 'Baja el ISO y compensa con más luz desde la apertura o el tiempo.',
      };
  }
}

/** Siguiente desafío recomendado: el primero sin superar, en orden de dificultad. */
export function recommendedChallenge(list: Challenge[], done: string[]): Challenge | null {
  const sorted = [...list].sort((a, b) => LEVEL_INFO[a.level].step - LEVEL_INFO[b.level].step);
  return sorted.find((c) => !done.includes(c.id)) ?? null;
}

/* ------------------------------------------------------------------ Quiz */

export const TOPIC_LABEL: Record<string, string> = {
  aperture: 'Apertura',
  'shutter-speed': 'Velocidad',
  iso: 'ISO',
  stops: 'Pasos de luz',
  'camera-modes': 'Modos',
  'exposure-triangle': 'Triángulo de exposición',
  'depth-of-field': 'Profundidad de campo',
  metering: 'Medición',
  'exposure-compensation': 'Compensación',
  histogram: 'Histograma',
  autofocus: 'Enfoque',
  'white-balance': 'Balance de blancos',
  lenses: 'Objetivos',
  'file-formats': 'RAW y JPEG',
  astro: 'Astrofotografía',
};

export function topicLabel(topic: string): string {
  return TOPIC_LABEL[topic] ?? topic;
}

/** Generador pseudoaleatorio con semilla (para mezclar de forma reproducible). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Práctica intercalada: reparte las preguntas por tema y las toma por turnos, de modo que
 * nunca salgan dos seguidas del mismo tema si se puede evitar. La dificultad avanza de Cero a
 * Avanzado; la semilla cambia el orden de los temas dentro de cada nivel.
 */
export function interleave(questions: QuizQuestion[], seed: number): QuizQuestion[] {
  const rand = seeded(seed);
  const byTopic = new Map<string, QuizQuestion[]>();
  for (const q of questions) {
    const arr = byTopic.get(q.topic) ?? [];
    arr.push(q);
    byTopic.set(q.topic, arr);
  }
  const queues = [...byTopic.values()].map((arr) => [...arr].sort((a, b) => LEVEL_INFO[a.level].step - LEVEL_INFO[b.level].step || rand() - 0.5));
  // Fisher-Yates sobre el orden de los temas
  for (let i = queues.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = queues[i];
    const other = queues[j];
    if (tmp && other) {
      queues[i] = other;
      queues[j] = tmp;
    }
  }
  const out: QuizQuestion[] = [];
  let lastTopic = '';
  while (out.length < questions.length) {
    // Primero lo más básico pendiente (dificultad progresiva); a igual nivel, el tema con más preguntas
    const head = (q: QuizQuestion[]) => (q[0] ? LEVEL_INFO[q[0].level].step : 9);
    const ordered = queues.filter((q) => q.length > 0).sort((a, b) => head(a) - head(b) || b.length - a.length);
    const pick = ordered.find((q) => q[0]?.topic !== lastTopic) ?? ordered[0];
    const next = pick?.shift();
    if (!next) break;
    out.push(next);
    lastTopic = next.topic;
  }
  return out;
}
