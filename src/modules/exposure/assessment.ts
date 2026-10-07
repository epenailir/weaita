/**
 * Evaluación de una toma frente a la intención de la escena. Separa la calificación numérica
 * (`grade`, barata, la usa el buscador de correcciones miles de veces) de la descripción en
 * texto (`assess`, para medidores, avisos, región viva y diagnóstico).
 */
import {
  SENSORS,
  dynamicRangeStops,
  formatAperture,
  formatDistance,
  formatIso,
  formatKelvin,
  formatShutter,
  formatThirds,
  handheldLimitS,
} from '../../engine';
import type { CameraSettings, ResolvedExposure, SensorFormat, ShotMetrics } from '../../engine';
import type { SimScene } from '../../sim/types';
import type { SceneBrief } from './sceneBriefs';

export type Status = 'good' | 'fair' | 'bad' | 'neutral';

export type CriterionId =
  | 'exposure'
  | 'highlights'
  | 'motion'
  | 'shake'
  | 'stars'
  | 'focus'
  | 'background'
  | 'diffraction'
  | 'noise'
  | 'dynamicRange'
  | 'whiteBalance'
  | 'limit'
  | 'level';

export type Grades = Partial<Record<CriterionId, Status>>;

export interface ShotContext {
  scene: SimScene;
  brief: SceneBrief;
  /** Ajustes del usuario (modo, Auto-ISO, compensación…). */
  settings: CameraSettings;
  /** Ajustes efectivos tras el automatismo. */
  effective: CameraSettings;
  metrics: ShotMetrics;
  limited: ResolvedExposure['limited'];
  /** % de píxeles quemados medido en la imagen; null si no hay cuadro renderizado. */
  highlightsPct: number | null;
  /** Inclinación de la cámara en grados. */
  rollDeg: number;
}

export interface Criterion {
  id: CriterionId;
  status: Status;
  label: string;
  /** Valor medido, breve ("4.6 px", "−1⅓ EV"). */
  value: string;
  /** Referencia con la que se compara ("≤ 3 px para congelar"). */
  target?: string;
  /** Qué pasó, en una o dos frases. */
  detail: string;
}

export type Assessment = Partial<Record<CriterionId, Criterion>>;

export const STATUS_WORD: Record<Status, string> = {
  good: 'Bien',
  fair: 'Regular',
  bad: 'Mal',
  neutral: 'Libre',
};

/** Penalización por estado (el malo pesa el triple que el regular). */
export const STATUS_PENALTY: Record<Status, number> = { good: 0, neutral: 0, fair: 1, bad: 3 };

/** Peso de cada criterio al buscar la mejor corrección. */
export const CRITERION_WEIGHT: Record<CriterionId, number> = {
  exposure: 3,
  limit: 3,
  motion: 2.5,
  focus: 2.5,
  stars: 2.5,
  shake: 2.5,
  background: 1.5,
  noise: 1,
  diffraction: 0.6,
  dynamicRange: 0.4,
  highlights: 0,
  whiteBalance: 0,
  level: 0,
};

export const CRITERION_LABEL: Record<CriterionId, string> = {
  exposure: 'Exposición del sujeto',
  highlights: 'Altas luces',
  motion: 'Movimiento del sujeto',
  shake: 'Trepidación',
  stars: 'Estrellas puntuales',
  focus: 'Zona nítida',
  background: 'Desenfoque del fondo',
  diffraction: 'Difracción',
  noise: 'Ruido',
  dynamicRange: 'Rango dinámico',
  whiteBalance: 'Balance de blancos',
  limit: 'Límite del automatismo',
  level: 'Horizonte',
};

/* ------------------------------------------------------------------ Formato */

/** Velocidad para texto didáctico: "1/250 s", "2 s". */
export function shutterText(t: number): string {
  const label = formatShutter(t);
  return label.endsWith('"') ? `${label.slice(0, -1)} s` : `${label} s`;
}

export function pxText(px: number): string {
  if (px < 0.05) return '0 px';
  if (px < 10) return `${px.toFixed(1)} px`;
  return `${Math.round(px)} px`;
}

export function pctText(p: number): string {
  if (p < 0.005) return '0 %';
  if (p < 1) return `${p.toFixed(2)} %`;
  if (p < 10) return `${p.toFixed(1)} %`;
  return `${Math.round(p)} %`;
}

export function evText(ev: number): string {
  const t = formatThirds(ev);
  return `${t === '0' ? '±0' : t} EV`;
}

/** Pasos con signo: "+1⅓ pasos", "−⅔ de paso". */
export function stopsText(stops: number): string {
  const thirds = Math.round(stops * 3);
  if (thirds === 0) return '0 pasos';
  return `${thirds > 0 ? '+' : '−'}${stopMagnitude(Math.abs(stops))}`;
}

/** Magnitud sin signo: "1 paso", "⅔ de paso", "1⅓ pasos". */
export function stopMagnitude(abs: number): string {
  const thirds = Math.round(Math.abs(abs) * 3);
  const whole = Math.floor(thirds / 3);
  const rest = thirds % 3;
  const frac = rest === 1 ? '⅓' : rest === 2 ? '⅔' : '';
  if (whole === 0) return rest === 0 ? '0 pasos' : `${frac} de paso`;
  if (whole === 1 && rest === 0) return '1 paso';
  return `${whole}${frac} pasos`;
}

/** Círculo de confusión como % del ancho del sensor (misma unidad que diffractionPct). */
export function cocPct(sensor: SensorFormat): number {
  return (sensor.cocMm / sensor.widthMm) * 100;
}

/** Desvío de color en mireds: negativo = dominante cálida, positivo = fría. */
export function wbShiftMired(cameraK: number, sceneK: number): number {
  return 1e6 / cameraK - 1e6 / sceneK;
}

/* ------------------------------------------------------------------ Calificación */

const EPS = 1e-6;

function within(d: number, near: number, far: number): boolean {
  return d >= near * (1 - EPS) && d <= far * (1 + EPS);
}

export function gradeExposure(m: ShotMetrics): Status {
  const o = Math.abs(m.exposureOffset);
  return o <= 0.34 ? 'good' : o <= 1.01 ? 'fair' : 'bad';
}

export function gradeMotion(m: ShotMetrics, scene: SimScene, brief: SceneBrief): Status | undefined {
  const intent = brief.motion;
  if (intent.kind === 'none' || scene.lighting.subjectSpeedMS <= 0) return undefined;
  const px = m.subjectMotionBlurPx;
  if (intent.kind === 'freeze') return px <= intent.goodPx ? 'good' : px <= intent.fairPx ? 'fair' : 'bad';
  return px >= intent.goodPx ? 'good' : px >= intent.fairPx ? 'fair' : 'bad';
}

export function gradeShake(m: ShotMetrics, s: CameraSettings): Status {
  if (s.tripod) return 'good';
  return m.shakeRatio <= 1 ? 'good' : m.shakeRatio <= 2 ? 'fair' : 'bad';
}

export function gradeStars(m: ShotMetrics, scene: SimScene): Status | undefined {
  if (!scene.lighting.hasStars) return undefined;
  return m.starTrailRatio <= 1 ? 'good' : m.starTrailRatio <= 1.5 ? 'fair' : 'bad';
}

export function gradeFocus(m: ShotMetrics, scene: SimScene, brief: SceneBrief): Status {
  const L = scene.lighting;
  const near = m.dofNearM;
  const far = m.dofFarM;
  if (brief.focus === 'infinity') {
    if (!Number.isFinite(far) || far >= L.subjectDistanceM) return 'good';
    return far >= 1000 ? 'fair' : 'bad';
  }
  const subjectIn = within(L.subjectDistanceM, near, far);
  if (brief.focus === 'deep') {
    const fg = L.foregroundDistanceM ?? L.subjectDistanceM;
    const fgOk = fg >= near * (1 - EPS);
    const infOk = !Number.isFinite(far) || far >= L.backgroundDistanceM;
    if (fgOk && infOk) return 'good';
    return (fgOk || infOk) && subjectIn ? 'fair' : 'bad';
  }
  if (subjectIn) return 'good';
  const d = L.subjectDistanceM;
  const miss = d < near ? near / d : d / far;
  return miss <= 1.15 ? 'fair' : 'bad';
}

export function gradeBackground(m: ShotMetrics, brief: SceneBrief): Status {
  const b = brief.background;
  if (b.kind === 'none') return 'neutral';
  const p = m.backgroundBlurPct;
  return p >= b.goodPct ? 'good' : p >= b.fairPct ? 'fair' : 'bad';
}

export function gradeDiffraction(m: ShotMetrics, s: CameraSettings): Status {
  const r = m.diffractionPct / cocPct(SENSORS[s.sensor]);
  return r <= 0.66 ? 'good' : r <= 1 ? 'fair' : 'bad';
}

export function gradeNoise(m: ShotMetrics, brief: SceneBrief): Status {
  return m.noiseScore <= brief.noise.good ? 'good' : m.noiseScore <= brief.noise.fair ? 'fair' : 'bad';
}

export function gradeDynamicRange(m: ShotMetrics, scene: SimScene): Status {
  const deficit = scene.lighting.sceneContrastStops - m.dynamicRangeStops;
  if (deficit <= 0) return 'good';
  const isoLoss = dynamicRangeStops(100) - m.dynamicRangeStops;
  if (isoLoss < 1) return 'fair';
  return deficit > 1.5 ? 'bad' : 'fair';
}

export function gradeWhiteBalance(s: CameraSettings, scene: SimScene, brief: SceneBrief): Status {
  const shift = wbShiftMired(s.wbK, scene.lighting.illuminantK);
  const abs = Math.abs(shift);
  if (abs <= 20) return 'good';
  if (brief.wb === 'warm-ok' && shift < 0 && abs <= 160) return 'good';
  if (abs <= 60) return 'fair';
  return s.format === 'JPEG' ? 'bad' : 'fair';
}

export function gradeHighlights(pct: number | null, brief: SceneBrief): Status | undefined {
  if (pct === null) return undefined;
  if (pct <= brief.clipTolerancePct) return 'good';
  return pct <= brief.clipTolerancePct + 4 ? 'fair' : 'bad';
}

export function gradeLevel(rollDeg: number): Status {
  const r = Math.abs(rollDeg);
  return r <= 0.5 ? 'good' : r <= 2 ? 'fair' : 'bad';
}

/** Calificación completa (sin textos). */
export function grade(ctx: ShotContext): Grades {
  const { metrics: m, scene, brief, effective: e } = ctx;
  const g: Grades = {
    exposure: gradeExposure(m),
    shake: gradeShake(m, e),
    focus: gradeFocus(m, scene, brief),
    background: gradeBackground(m, brief),
    diffraction: gradeDiffraction(m, e),
    noise: gradeNoise(m, brief),
    dynamicRange: gradeDynamicRange(m, scene),
    whiteBalance: gradeWhiteBalance(e, scene, brief),
    limit: ctx.limited ? 'bad' : 'good',
    level: gradeLevel(ctx.rollDeg),
  };
  const motion = gradeMotion(m, scene, brief);
  if (motion) g.motion = motion;
  const stars = gradeStars(m, scene);
  if (stars) g.stars = stars;
  const hi = gradeHighlights(ctx.highlightsPct, brief);
  if (hi) g.highlights = hi;
  return g;
}

/** Penalización total ponderada (0 = toma perfecta para la intención de la escena). */
export function penalty(g: Grades): number {
  let p = 0;
  for (const key of Object.keys(g) as CriterionId[]) {
    const s = g[key];
    if (s) p += CRITERION_WEIGHT[key] * STATUS_PENALTY[s];
  }
  return p;
}

/* ------------------------------------------------------------------ Descripción */

const LIMITED_NAME = { aperture: 'la apertura', shutter: 'la velocidad', iso: 'el ISO' } as const;

function noiseWord(score: number): string {
  if (score <= 18) return 'muy bajo';
  if (score <= 30) return 'bajo';
  if (score <= 56) return 'moderado';
  if (score <= 70) return 'alto';
  return 'muy alto';
}

/** Valor breve de un criterio (lo usan las comparaciones y los "a cambio"). */
export function criterionValue(id: CriterionId, ctx: ShotContext): string {
  const { metrics: m, effective: e, scene } = ctx;
  switch (id) {
    case 'exposure':
      return evText(m.exposureOffset);
    case 'highlights':
      return ctx.highlightsPct === null ? '—' : `${pctText(ctx.highlightsPct)} quemado`;
    case 'motion':
      return pxText(m.subjectMotionBlurPx);
    case 'shake':
      return e.tripod ? 'Trípode' : `×${m.shakeRatio.toFixed(1)} del límite`;
    case 'stars':
      return `${shutterText(e.shutter)} / máx. ${shutterText(m.maxStarExposureS)}`;
    case 'focus':
      return `${formatDistance(m.dofNearM)} – ${formatDistance(m.dofFarM)}`;
    case 'background':
      return pctText(m.backgroundBlurPct);
    case 'diffraction':
      return formatAperture(e.aperture);
    case 'noise':
      return `ISO ${formatIso(e.iso)} · ${noiseWord(m.noiseScore)}`;
    case 'dynamicRange':
      return `${m.dynamicRangeStops.toFixed(1)} / ${scene.lighting.sceneContrastStops} pasos`;
    case 'whiteBalance':
      return formatKelvin(e.wbK);
    case 'limit':
      return ctx.limited ? `Sin margen en ${LIMITED_NAME[ctx.limited]}` : 'Dentro del rango';
    case 'level':
      return `${Math.abs(ctx.rollDeg).toFixed(1)}°`;
  }
}

function describeExposure(ctx: ShotContext, status: Status): Pick<Criterion, 'detail' | 'target'> {
  const { metrics: m, settings: s, scene } = ctx;
  const o = m.exposureOffset;
  const bias = scene.lighting.meteringBias[s.metering];
  const meterFooled = Math.abs(bias) >= 0.3 && Math.abs(m.meterReading - s.exposureComp) <= 0.34 && status !== 'good';
  const meteringName = s.metering === 'matrix' ? 'matricial' : s.metering === 'center' ? 'ponderada al centro' : 'puntual';
  let detail: string;
  if (status === 'good') {
    detail = `La exposición es correcta para ${ctxSubject(ctx)}: el desvío es de ${evText(o)}, dentro de ±⅓ de paso.`;
  } else {
    const dir = o > 0 ? 'más clara' : 'más oscura';
    const cost = o > 0 ? 'Las zonas claras pierden detalle.' : 'Las sombras se hunden y, al aclarar después, aparece ruido.';
    detail = `La toma quedó ${stopMagnitude(o)} ${dir} de lo correcto para ${ctxSubject(ctx)} (${evText(o)}). ${cost}`;
  }
  if (meterFooled) {
    detail += ` El exposímetro marcaba ${evText(m.meterReading)}: en esta escena la medición ${meteringName} se equivoca en ${evText(bias)}.`;
  }
  return { detail, target: '±⅓ EV' };
}

function ctxSubject(ctx: ShotContext): string {
  return ctx.brief.subject;
}

/** Descripción completa de un criterio ya calificado. */
function describe(id: CriterionId, status: Status, ctx: ShotContext): Criterion {
  const { metrics: m, effective: e, scene, brief } = ctx;
  const sensor = SENSORS[e.sensor];
  const value = criterionValue(id, ctx);
  const base = { id, status, label: CRITERION_LABEL[id], value };
  switch (id) {
    case 'exposure':
      return { ...base, ...describeExposure(ctx, status) };

    case 'highlights': {
      const pct = ctx.highlightsPct ?? 0;
      return {
        ...base,
        target: `≤ ${pctText(brief.clipTolerancePct)}`,
        detail:
          status === 'good'
            ? 'Las altas luces conservan detalle: casi ningún píxel llega al blanco puro.'
            : `El ${pctText(pct)} de los píxeles llegó al blanco puro: ahí no queda información que recuperar, ni siquiera en RAW.`,
      };
    }

    case 'motion': {
      const intent = brief.motion;
      const px = pxText(m.subjectMotionBlurPx);
      if (intent.kind === 'blur') {
        return {
          ...base,
          target: `≥ ${intent.goodPx} px`,
          detail:
            status === 'good'
              ? `Con ${shutterText(e.shutter)}, ${brief.subject} recorre ${px} durante la exposición: el movimiento se convierte en una estela continua.`
              : `Con ${shutterText(e.shutter)}, ${brief.subject} solo recorre ${px}: el movimiento queda casi congelado. El efecto buscado pide ${intent.goodPx} px o más.`,
        };
      }
      const good = intent.kind === 'freeze' ? intent.goodPx : 0;
      return {
        ...base,
        target: `≤ ${good} px`,
        detail:
          status === 'good'
            ? `Con ${shutterText(e.shutter)}, ${brief.subject} se desplaza ${px} durante la exposición: queda congelado.`
            : `Con ${shutterText(e.shutter)}, ${brief.subject} se desplaza ${px} durante la exposición y sale barrido. Para congelarlo hace falta ${good} px o menos.`,
      };
    }

    case 'shake': {
      const limit = handheldLimitS(e.focalMm, sensor, e.stabilizationStops);
      const stab = e.stabilizationStops > 0 ? ` y ${e.stabilizationStops} pasos de estabilización` : '';
      const crop = sensor.crop !== 1 ? ` (×${sensor.crop} de recorte)` : '';
      return {
        ...base,
        target: e.tripod ? undefined : `≤ ${shutterText(limit)}`,
        detail: e.tripod
          ? 'La cámara está sobre trípode: el temblor de las manos no cuenta.'
          : status === 'good'
            ? `Con ${e.focalMm} mm${crop}${stab}, el límite a pulso es ${shutterText(limit)}; usaste ${shutterText(e.shutter)}: sin trepidación.`
            : `Con ${e.focalMm} mm${crop}${stab}, el límite a pulso es ${shutterText(limit)}; usaste ${shutterText(e.shutter)}, ${m.shakeRatio.toFixed(1)} veces más: toda la imagen sale temblada.`,
      };
    }

    case 'stars':
      return {
        ...base,
        target: `≤ ${shutterText(m.maxStarExposureS)}`,
        detail:
          status === 'good'
            ? `Regla de los 500: con ${e.focalMm} mm el máximo es ${shutterText(m.maxStarExposureS)}. Usaste ${shutterText(e.shutter)}: las estrellas quedan puntuales.`
            : `Regla de los 500: con ${e.focalMm} mm el máximo es ${shutterText(m.maxStarExposureS)}. Usaste ${shutterText(e.shutter)}: la rotación de la Tierra convierte las estrellas en trazos.`,
      };

    case 'focus': {
      const L = scene.lighting;
      const range = `${formatDistance(m.dofNearM)} a ${formatDistance(m.dofFarM)}`;
      if (brief.focus === 'deep') {
        const fg = L.foregroundDistanceM ?? L.subjectDistanceM;
        const fgOk = fg >= m.dofNearM * (1 - EPS);
        const infOk = !Number.isFinite(m.dofFarM) || m.dofFarM >= L.backgroundDistanceM;
        return {
          ...base,
          target: `${formatDistance(fg)} a ∞`,
          detail: `Zona nítida de ${range}. Primer plano a ${formatDistance(fg)}: ${fgOk ? 'nítido' : 'borroso'}. Montañas: ${infOk ? 'nítidas' : 'borrosas'}. Hiperfocal: ${formatDistance(m.hyperfocalM)}.`,
        };
      }
      if (brief.focus === 'infinity') {
        return {
          ...base,
          target: 'Hasta ∞',
          detail:
            status === 'good'
              ? `La zona nítida llega al infinito (${range}): las estrellas quedan definidas.`
              : `La zona nítida termina en ${formatDistance(m.dofFarM)}: las estrellas, en el infinito, salen blandas. Enfoca al infinito o a la hiperfocal (${formatDistance(m.hyperfocalM)}).`,
        };
      }
      const d = L.subjectDistanceM;
      return {
        ...base,
        target: `Incluir ${formatDistance(d)}`,
        detail:
          status === 'good'
            ? `Zona nítida de ${range}: ${brief.subject}, a ${formatDistance(d)}, queda dentro.`
            : `Zona nítida de ${range}: ${brief.subject}, a ${formatDistance(d)}, queda fuera y sale blando.`,
      };
    }

    case 'background': {
      const b = brief.background;
      if (b.kind === 'none') {
        return { ...base, detail: `El fondo se desenfoca ${pctText(m.backgroundBlurPct)} del ancho de la imagen. En esta escena es una elección libre.` };
      }
      return {
        ...base,
        target: `≥ ${pctText(b.goodPct)}`,
        detail:
          status === 'good'
            ? `Cada punto del fondo se convierte en un disco del ${pctText(m.backgroundBlurPct)} del ancho: el sujeto se separa con claridad.`
            : `El fondo solo se desenfoca ${pctText(m.backgroundBlurPct)} del ancho: compite con el sujeto. Para separarlo se busca ${pctText(b.goodPct)} o más.`,
      };
    }

    case 'diffraction': {
      const airyUm = (m.diffractionPct / 100) * sensor.widthMm * 1000;
      const cocUm = sensor.cocMm * 1000;
      return {
        ...base,
        target: `Airy < ${Math.round(cocUm)} µm`,
        detail:
          status === 'good'
            ? `A ${formatAperture(e.aperture)} el disco de Airy mide ${airyUm.toFixed(0)} µm, lejos del círculo de confusión (${cocUm.toFixed(0)} µm).`
            : `A ${formatAperture(e.aperture)} el disco de Airy mide ${airyUm.toFixed(0)} µm frente a un círculo de confusión de ${cocUm.toFixed(0)} µm: la difracción suaviza el detalle fino.`,
      };
    }

    case 'noise':
      return {
        ...base,
        target: `Hasta ISO ${isoForScore(brief.noise.good)}`,
        detail:
          status === 'good'
            ? `ISO ${formatIso(e.iso)}: ruido ${noiseWord(m.noiseScore)} (${m.noiseScore}/100).`
            : `ISO ${formatIso(e.iso)}: ruido ${noiseWord(m.noiseScore)} (${m.noiseScore}/100). El grano se nota sobre todo en las sombras y borra el detalle fino.`,
      };

    case 'dynamicRange': {
      const contrast = scene.lighting.sceneContrastStops;
      const deficit = contrast - m.dynamicRangeStops;
      return {
        ...base,
        target: `≥ ${contrast} pasos`,
        detail:
          deficit <= 0
            ? `La escena tiene ${contrast} pasos de contraste y a ISO ${formatIso(e.iso)} el sensor registra ${m.dynamicRangeStops.toFixed(1)}: cabe entera.`
            : `La escena tiene ${contrast} pasos de contraste y a ISO ${formatIso(e.iso)} el sensor registra ${m.dynamicRangeStops.toFixed(1)}: ${deficit.toFixed(1)} pasos se perderán en luces o sombras.`,
      };
    }

    case 'whiteBalance': {
      const shift = wbShiftMired(e.wbK, scene.lighting.illuminantK);
      const cast = shift < 0 ? 'cálida (anaranjada)' : 'fría (azulada)';
      return {
        ...base,
        target: `≈ ${formatKelvin(scene.lighting.illuminantK)}`,
        detail:
          status === 'good'
            ? `La luz es de unos ${formatKelvin(scene.lighting.illuminantK)} y la cámara está en ${formatKelvin(e.wbK)}: colores ${Math.abs(shift) <= 20 ? 'neutros' : 'con la calidez buscada'}.`
            : `La luz es de unos ${formatKelvin(scene.lighting.illuminantK)} y la cámara está en ${formatKelvin(e.wbK)}: dominante ${cast}. ${e.format === 'JPEG' ? 'En JPEG queda grabada.' : 'En RAW se corrige después sin pérdida.'}`,
      };
    }

    case 'limit':
      return {
        ...base,
        detail: ctx.limited
          ? `La cámara necesitaba llevar ${LIMITED_NAME[ctx.limited]} más allá de su rango y no pudo exponer bien: el valor parpadea en el visor.`
          : 'El automatismo trabaja dentro de su rango.',
      };

    case 'level':
      return {
        ...base,
        target: '±0.5°',
        detail:
          status === 'good'
            ? 'La cámara estaba nivelada: el horizonte queda recto.'
            : `La cámara estaba inclinada ${Math.abs(ctx.rollDeg).toFixed(1)}° hacia la ${ctx.rollDeg > 0 ? 'derecha' : 'izquierda'}: el horizonte sale torcido.`,
      };
  }
}

/** ISO aproximado que corresponde a una puntuación de ruido (inversa de noiseScore). */
function isoForScore(score: number): string {
  const x = Math.pow(Math.max(0, score) / 100, 1 / 1.25) * 8;
  return formatIso(100 * Math.pow(2, x));
}

/** Evaluación con textos. */
export function assess(ctx: ShotContext): Assessment {
  const g = grade(ctx);
  const out: Assessment = {};
  for (const id of Object.keys(g) as CriterionId[]) {
    const s = g[id];
    if (s) out[id] = describe(id, s, ctx);
  }
  return out;
}
