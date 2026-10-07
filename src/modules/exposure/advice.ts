/**
 * Buscador de correcciones: para cada criterio que falló, prueba miles de combinaciones
 * alcanzables con los controles que el usuario maneja en su modo (con el motor físico real)
 * y elige la que lo arregla con la menor penalización total y el menor cambio. Así el consejo
 * es específico ("1/60 → 1/500 s y ISO 200 → 1600") y declara qué cuesta a cambio.
 */
import {
  APERTURES,
  ISOS,
  SENSORS,
  SHUTTERS,
  apertureFor,
  computeMetrics,
  formatAperture,
  formatDistance,
  formatIso,
  formatKelvin,
  hyperfocalM,
  isoFor,
  nearestStop,
  resolveExposure,
  shutterFor,
  stops,
} from '../../engine';
import type { CameraSettings, MeteringMode, StopValue } from '../../engine';
import { autoControlled } from '../../state/useCamera';
import { FOCUS_INFINITY_M } from '../../components/viewfinder/buildOsd';
import {
  CRITERION_LABEL,
  CRITERION_WEIGHT,
  STATUS_PENALTY,
  STATUS_WORD,
  criterionValue,
  evText,
  grade,
  penalty,
  shutterText,
  stopsText,
} from './assessment';
import type { CriterionId, Grades, ShotContext, Status } from './assessment';

export type AdjustKey =
  | 'aperture'
  | 'shutter'
  | 'iso'
  | 'exposureComp'
  | 'tripod'
  | 'stabilizationStops'
  | 'metering'
  | 'focusM'
  | 'focalMm'
  | 'wbK';

export interface Change {
  key: AdjustKey;
  label: string;
  from: string;
  to: string;
  /** Pasos de luz que aporta el cambio ("+1⅓ pasos"), cuando aplica. */
  delta?: string;
}

export type AdviceAction =
  | { kind: 'settings'; patch: Partial<CameraSettings> }
  | { kind: 'level' }
  | { kind: 'none' };

export interface Advice {
  criterion: CriterionId;
  headline: string;
  changes: Change[];
  /** Lo que decidirá la cámara en un modo semiautomático. */
  cameraNote?: string;
  reason: string;
  /** Cómo queda el criterio: "8.3 px → 1.9 px". */
  outcome?: string;
  /** Criterios que empeoran a cambio. */
  tradeoffs: string[];
  /** Criterios que mejoran de paso. */
  bonus: string[];
  action: AdviceAction;
}

type TriadKey = 'aperture' | 'shutter' | 'iso';

const SCALE: Record<TriadKey, StopValue[]> = { aperture: APERTURES, shutter: SHUTTERS, iso: ISOS };
const STATUS_RANK: Record<Status, number> = { good: 0, neutral: 0, fair: 1, bad: 2 };
/** Tercios que explora la búsqueda a cada lado del valor actual. */
const GRID_RANGE = 12;

const METERING_NAME: Record<MeteringMode, string> = { matrix: 'Matricial', center: 'Ponderada al centro', spot: 'Puntual' };

interface Evaluated {
  settings: CameraSettings;
  ctx: ShotContext;
  grades: Grades;
  score: number;
}

const snap = (key: TriadKey, v: number) => nearestStop(SCALE[key], v).value;
const indexOf = (key: TriadKey, v: number) => nearestStop(SCALE[key], v).index;

function stopRange(key: TriadKey, current: number, range: number): number[] {
  const scale = SCALE[key];
  const i = indexOf(key, current);
  const out: number[] = [];
  for (let k = Math.max(0, i - range); k <= Math.min(scale.length - 1, i + range); k++) out.push(scale[k]!.value);
  return out;
}

/** Resuelve el parámetro libre para que el sujeto quede correctamente expuesto. */
function solve(key: TriadKey, s: CameraSettings, ev100: number): number {
  switch (key) {
    case 'iso':
      return snap('iso', isoFor(ev100, s.aperture, s.shutter));
    case 'shutter':
      return snap('shutter', shutterFor(ev100, s.aperture, s.iso));
    case 'aperture':
      return snap('aperture', apertureFor(ev100, s.shutter, s.iso));
  }
}

/** Costo de cambiar de `a` a `b`: se prefieren pocos parámetros y saltos cortos. */
function changeCost(a: CameraSettings, b: CameraSettings): number {
  let c = 0;
  for (const k of ['aperture', 'shutter', 'iso'] as const) {
    const d = Math.abs(indexOf(k, a[k]) - indexOf(k, b[k]));
    if (d > 0) c += 0.1 + d * 0.012;
  }
  if (a.exposureComp !== b.exposureComp) c += 0.1 + Math.abs(a.exposureComp - b.exposureComp) * 0.036;
  if (a.tripod !== b.tripod) c += 0.25;
  if (a.stabilizationStops !== b.stabilizationStops) c += 0.15;
  if (a.metering !== b.metering) c += 0.12;
  if (Math.abs(Math.log(a.focusM / b.focusM)) > 0.01) c += 0.12;
  if (a.focalMm !== b.focalMm) c += 0.35;
  return c;
}

function evaluate(settings: CameraSettings, base: ShotContext): Evaluated {
  const { lighting } = base.scene;
  const r = resolveExposure(settings, lighting, SENSORS[settings.sensor]);
  const effective: CameraSettings = { ...settings, aperture: r.aperture, shutter: r.shutter, iso: r.iso };
  const metrics = computeMetrics(effective, lighting);
  const ctx: ShotContext = { ...base, settings, effective, metrics, limited: r.limited, highlightsPct: null };
  const grades = grade(ctx);
  return { settings, ctx, grades, score: penalty(grades) + changeCost(base.settings, settings) };
}

/** Genera las combinaciones alcanzables desde los ajustes actuales. */
function candidates(base: ShotContext, baseGrades: Grades): CameraSettings[] {
  const s = base.settings;
  const ev = base.scene.lighting.ev100;
  const auto = autoControlled(s);
  const user = (['aperture', 'shutter', 'iso'] as const).filter((k) => !auto[k]);
  const out: CameraSettings[] = [];

  if (s.mode === 'M' && !s.autoIso) {
    // Dos parámetros libres en una cuadrícula y el tercero cierra la cuenta.
    const pairs: Array<[TriadKey, TriadKey, TriadKey]> = [
      ['aperture', 'shutter', 'iso'],
      ['aperture', 'iso', 'shutter'],
      ['shutter', 'iso', 'aperture'],
    ];
    for (const [k1, k2, k3] of pairs) {
      for (const v1 of stopRange(k1, s[k1], GRID_RANGE)) {
        for (const v2 of stopRange(k2, s[k2], GRID_RANGE)) {
          const c: CameraSettings = { ...s };
          c[k1] = v1;
          c[k2] = v2;
          c[k3] = solve(k3, c, ev);
          out.push(c);
        }
      }
    }
  } else {
    // Modos con automatismo: la cámara resuelve la exposición; se mueven los parámetros propios y la compensación.
    const bias = base.scene.lighting.meteringBias[s.metering];
    const comps = Array.from(new Set([s.exposureComp, Math.max(-3, Math.min(3, Math.round(bias * 3) / 3))]));
    const grid = (keys: readonly TriadKey[]): CameraSettings[] => {
      if (keys.length === 0) return [{ ...s }];
      const [k, ...rest] = keys as [TriadKey, ...TriadKey[]];
      const tails = grid(rest);
      const res: CameraSettings[] = [];
      for (const v of stopRange(k, s[k], rest.length > 0 ? GRID_RANGE : 2 * GRID_RANGE)) {
        for (const t of tails) {
          const c: CameraSettings = { ...t };
          c[k] = v;
          res.push(c);
        }
      }
      return res;
    };
    for (const c of grid(user)) for (const comp of comps) out.push({ ...c, exposureComp: comp });
    for (let t = -9; t <= 9; t++) out.push({ ...s, exposureComp: t / 3 });
    for (const m of ['matrix', 'center', 'spot'] as const) if (m !== s.metering) out.push({ ...s, metering: m });
  }

  // Variantes de soporte cuando la trepidación o la intención lo piden.
  const shakeIssue = baseGrades.shake !== undefined && baseGrades.shake !== 'good';
  const wantsLong = base.brief.motion.kind === 'blur' || base.scene.lighting.hasStars;
  const supports: Array<Partial<CameraSettings>> = [];
  if (!s.tripod && (shakeIssue || wantsLong)) supports.push({ tripod: true });
  if (!s.tripod && shakeIssue && s.stabilizationStops < 5) supports.push({ stabilizationStops: 5 });

  // Enfoque a la hiperfocal cuando se busca nitidez hasta el infinito.
  const coc = SENSORS[s.sensor].cocMm;
  const wantsDeep = base.brief.focus === 'deep' || base.brief.focus === 'infinity';
  const extra: CameraSettings[] = [];
  for (const c of out) {
    for (const sup of supports) extra.push({ ...c, ...sup });
    if (wantsDeep) {
      const r = resolveExposure(c, base.scene.lighting, SENSORS[c.sensor]);
      extra.push({ ...c, focusM: Math.round(hyperfocalM(c.focalMm, r.aperture, coc) * 100) / 100 });
    }
  }
  out.push(...extra);

  // Enfoque sobre el sujeto y cambios de focal (de a uno).
  const d = base.scene.lighting.subjectDistanceM;
  if (base.brief.focus === 'subject' && Math.abs(Math.log(s.focusM / d)) > 0.01) out.push({ ...s, focusM: d });
  if (base.brief.focus === 'infinity' && s.focusM < FOCUS_INFINITY_M) out.push({ ...s, focusM: FOCUS_INFINITY_M });
  const [lo, hi] = base.scene.focalRange;
  for (const f of [lo, 24, 35, 50, 85, 135, 200, 300, 400, hi]) {
    if (f >= lo && f <= hi && f !== s.focalMm) out.push({ ...s, focalMm: f });
  }
  return out;
}

/* ------------------------------------------------------------------ Textos */

function triadLabel(key: TriadKey, v: number): string {
  if (key === 'aperture') return formatAperture(v);
  if (key === 'shutter') return shutterText(v);
  return `ISO ${formatIso(v)}`;
}

/** Pasos de luz que aporta pasar de a a b en cada parámetro (positivo = más luz o más brillo). */
function lightStops(key: TriadKey, a: number, b: number): number {
  return key === 'aperture' ? stops.aperture(a, b) : key === 'shutter' ? stops.shutter(a, b) : stops.iso(a, b);
}

function describeChanges(a: CameraSettings, b: CameraSettings): Change[] {
  const out: Change[] = [];
  const NAMES: Record<TriadKey, string> = { aperture: 'Apertura', shutter: 'Velocidad', iso: 'ISO' };
  for (const k of ['aperture', 'shutter', 'iso'] as const) {
    if (indexOf(k, a[k]) === indexOf(k, b[k])) continue;
    out.push({ key: k, label: NAMES[k], from: triadLabel(k, a[k]), to: triadLabel(k, b[k]), delta: stopsText(lightStops(k, a[k], b[k])) });
  }
  if (a.exposureComp !== b.exposureComp) {
    out.push({ key: 'exposureComp', label: 'Compensación', from: evText(a.exposureComp), to: evText(b.exposureComp) });
  }
  if (a.metering !== b.metering) out.push({ key: 'metering', label: 'Medición', from: METERING_NAME[a.metering], to: METERING_NAME[b.metering] });
  if (a.tripod !== b.tripod) out.push({ key: 'tripod', label: 'Soporte', from: a.tripod ? 'Trípode' : 'A pulso', to: b.tripod ? 'Trípode' : 'A pulso' });
  if (a.stabilizationStops !== b.stabilizationStops) {
    const st = (n: number) => (n > 0 ? `${n} pasos` : 'No');
    out.push({ key: 'stabilizationStops', label: 'Estabilización', from: st(a.stabilizationStops), to: st(b.stabilizationStops) });
  }
  if (Math.abs(Math.log(a.focusM / b.focusM)) > 0.01) {
    const fm = (m: number) => formatDistance(m >= FOCUS_INFINITY_M * 0.999 ? Infinity : m);
    out.push({ key: 'focusM', label: 'Enfoque', from: fm(a.focusM), to: fm(b.focusM) });
  }
  if (a.focalMm !== b.focalMm) out.push({ key: 'focalMm', label: 'Focal', from: `${a.focalMm} mm`, to: `${b.focalMm} mm` });
  if (a.wbK !== b.wbK) out.push({ key: 'wbK', label: 'Balance de blancos', from: formatKelvin(a.wbK), to: formatKelvin(b.wbK) });
  return out;
}

function patchOf(a: CameraSettings, b: CameraSettings, changes: Change[]): Partial<CameraSettings> {
  const patch: Partial<CameraSettings> = {};
  for (const c of changes) {
    switch (c.key) {
      case 'aperture':
      case 'shutter':
      case 'iso':
      case 'exposureComp':
      case 'focusM':
      case 'focalMm':
      case 'stabilizationStops':
      case 'wbK':
        patch[c.key] = b[c.key];
        break;
      case 'tripod':
        patch.tripod = b.tripod;
        break;
      case 'metering':
        patch.metering = b.metering;
        break;
    }
  }
  if (a.mode !== b.mode) patch.mode = b.mode;
  return patch;
}

/** Verbo del cambio principal ("Acorta la velocidad"). */
function verb(c: Change, a: CameraSettings, b: CameraSettings): string {
  switch (c.key) {
    case 'aperture':
      return b.aperture < a.aperture ? 'Abre el diafragma' : 'Cierra el diafragma';
    case 'shutter':
      return b.shutter < a.shutter ? 'Acorta el tiempo de exposición' : 'Alarga el tiempo de exposición';
    case 'iso':
      return b.iso > a.iso ? 'Sube el ISO' : 'Baja el ISO';
    case 'exposureComp':
      return `Compensa a ${c.to}`;
    case 'metering':
      return `Cambia a medición ${c.to.toLowerCase()}`;
    case 'tripod':
      return 'Pon la cámara en un trípode';
    case 'stabilizationStops':
      return 'Activa la estabilización';
    case 'focusM':
      return `Enfoca a ${c.to}`;
    case 'focalMm':
      return `Usa ${c.to}`;
    case 'wbK':
      return `Ajusta el balance a ${c.to}`;
  }
}

/** Peso del cambio para decidir cuál es el principal. */
function weightOf(c: Change, a: CameraSettings, b: CameraSettings): number {
  if (c.key === 'aperture' || c.key === 'shutter' || c.key === 'iso') return Math.abs(lightStops(c.key, a[c.key], b[c.key]));
  if (c.key === 'tripod' || c.key === 'stabilizationStops') return 10;
  if (c.key === 'focusM' || c.key === 'metering') return 6;
  return 3;
}

/** Explicación física de por qué el cambio principal arregla el criterio. */
function reasonFor(criterion: CriterionId, main: Change, a: CameraSettings, b: CameraSettings, base: ShotContext): string {
  const mode = a.mode;
  const auto = autoControlled(a);
  const viaCamera = mode !== 'M' && (main.key === 'iso' || main.key === 'aperture' || main.key === 'exposureComp');
  const subject = base.brief.subject;
  switch (criterion) {
    case 'motion':
      if (base.brief.motion.kind === 'blur') {
        if (main.key === 'tripod') return 'Sobre trípode puedes usar tiempos largos: así se alarga la estela sin que la cámara tiemble.';
        if (viaCamera && auto.shutter) return `En modo ${mode} la cámara decide la velocidad: con menos luz entrando, elegirá un tiempo más largo.`;
        return `Un tiempo más largo deja que ${subject} recorra más distancia mientras el obturador está abierto: el movimiento se convierte en estela.`;
      }
      if (main.key === 'focalMm') return `Con menos focal ${subject} ocupa menos píxeles y su recorrido en la imagen se acorta.`;
      if (viaCamera && auto.shutter) return `En modo ${mode} la cámara decide la velocidad: con más luz o más ISO, elegirá un tiempo más corto.`;
      return `Un tiempo más corto reduce lo que ${subject} alcanza a desplazarse mientras el obturador está abierto.`;
    case 'shake':
      if (main.key === 'tripod') return 'Sobre trípode la cámara no tiembla: puedes usar cualquier tiempo.';
      if (main.key === 'stabilizationStops') return 'La estabilización compensa varios pasos de temblor de las manos (no el movimiento del sujeto).';
      if (main.key === 'focalMm') return 'Con menos focal, el temblor se amplía menos y el límite a pulso se vuelve más lento.';
      return 'A pulso, el tiempo debe ser como máximo 1/(focal × recorte) para que el temblor de las manos no se note.';
    case 'stars':
      if (main.key === 'focalMm') return 'Con menos focal, las estrellas recorren menos píxeles por segundo: el tiempo máximo de la regla de los 500 sube.';
      return `Por encima de ${shutterText(base.metrics.maxStarExposureS)} la rotación de la Tierra ya se ve como trazos: hay que acortar el tiempo y compensar la luz con apertura o ISO.`;
    case 'exposure':
      if (main.key === 'exposureComp') return `En modo ${mode} la cámara sigue al exposímetro; la compensación le indica cuánto más clara u oscura quieres la foto.`;
      if (main.key === 'metering') return 'La nueva medición deja de dejarse engañar por las zonas muy claras u oscuras que rodean al sujeto.';
      if (main.key === 'iso') return 'El ISO cierra la cuenta sin tocar el movimiento ni la profundidad de campo.';
      if (main.key === 'shutter') return 'Cambiar el tiempo corrige la luz sin tocar la profundidad de campo; aquí el movimiento lo tolera.';
      if (main.key === 'aperture') return 'Cambiar el diafragma corrige la luz; aquí la profundidad de campo lo tolera.';
      return 'Este cambio lleva la exposición del sujeto a ±0.';
    case 'focus':
      if (main.key === 'focusM') return 'Mover el punto de enfoque desplaza la zona nítida hasta incluir lo que importa.';
      if (main.key === 'aperture') return 'Cerrar el diafragma amplía la zona nítida delante y detrás del punto enfocado.';
      return 'Este cambio amplía la zona nítida hasta incluir lo que importa.';
    case 'background':
      if (main.key === 'focalMm') return 'Con más focal el fondo se amplía y sus discos de desenfoque crecen.';
      if (viaCamera && auto.aperture) return `En modo ${mode} la cámara decide la apertura: con menos luz disponible, abrirá más.`;
      return 'Una abertura más grande agranda los discos de desenfoque del fondo.';
    case 'noise':
      return 'Menos amplificación significa menos ruido: la luz que falta se recupera con el tiempo o el diafragma.';
    case 'diffraction':
      return 'Por debajo de f/11 en full frame (f/8 en sensores pequeños) la difracción deja de suavizar el detalle.';
    case 'dynamicRange':
      return 'Cada paso de ISO cuesta casi un paso de rango dinámico: con menos ISO cabe más contraste.';
    case 'limit':
      return 'Este cambio devuelve al automatismo un margen con el que sí puede exponer bien.';
    case 'highlights':
    case 'whiteBalance':
    case 'level':
      return '';
  }
}

function valueChange(id: CriterionId, a: ShotContext, b: ShotContext): string {
  return `${criterionValue(id, a)} → ${criterionValue(id, b)}`;
}

function sideEffects(base: Evaluated, best: Evaluated, except: CriterionId): { tradeoffs: string[]; bonus: string[] } {
  const tradeoffs: string[] = [];
  const bonus: string[] = [];
  for (const id of Object.keys(CRITERION_WEIGHT) as CriterionId[]) {
    if (id === except || CRITERION_WEIGHT[id] === 0) continue;
    const s0 = base.grades[id];
    const s1 = best.grades[id];
    if (!s0 || !s1 || s0 === 'neutral' || s1 === 'neutral') continue;
    const line = `${CRITERION_LABEL[id]}: ${STATUS_WORD[s0].toLowerCase()} → ${STATUS_WORD[s1].toLowerCase()} (${criterionValue(id, best.ctx)})`;
    if (STATUS_RANK[s1] > STATUS_RANK[s0]) tradeoffs.push(line);
    else if (STATUS_RANK[s1] < STATUS_RANK[s0]) bonus.push(line);
  }
  return { tradeoffs, bonus };
}

function cameraNoteFor(base: Evaluated, best: Evaluated): string | undefined {
  const auto = autoControlled(best.settings);
  const parts: string[] = [];
  for (const k of ['aperture', 'shutter', 'iso'] as const) {
    if (!auto[k]) continue;
    const a = base.ctx.effective[k];
    const b = best.ctx.effective[k];
    if (indexOf(k, a) !== indexOf(k, b)) parts.push(triadLabel(k, b));
  }
  return parts.length > 0 ? `La cámara pasará a ${parts.join(' y ')}.` : undefined;
}

function buildAdvice(criterion: CriterionId, base: Evaluated, best: Evaluated): Advice {
  const a = base.settings;
  const b = best.settings;
  const changes = describeChanges(a, b);
  const sorted = [...changes].sort((x, y) => weightOf(y, a, b) - weightOf(x, a, b));
  const main = sorted[0]!;
  const second = sorted[1];
  const headline = second ? `${verb(main, a, b)} y ${lowerFirst(verb(second, a, b))}` : verb(main, a, b);
  let reason = reasonFor(criterion, main, a, b, base.ctx);
  const closer = changes.find((c) => c !== main && (c.key === 'iso' || c.key === 'aperture' || c.key === 'shutter'));
  if (closer && criterion !== 'exposure') reason += ` ${closer.label === 'ISO' ? 'El ISO' : closer.label === 'Apertura' ? 'La apertura' : 'La velocidad'} compensa la luz para que la exposición siga correcta.`;
  const { tradeoffs, bonus } = sideEffects(base, best, criterion);
  return {
    criterion,
    headline,
    changes,
    cameraNote: cameraNoteFor(base, best),
    reason,
    outcome: `${CRITERION_LABEL[criterion]}: ${valueChange(criterion, base.ctx, best.ctx)}`,
    tradeoffs,
    bonus,
    action: { kind: 'settings', patch: patchOf(a, b, changes) },
  };
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/* ------------------------------------------------------------------ Consejos especiales */

function highlightsAdvice(ctx: ShotContext): Advice {
  const s = ctx.settings;
  const auto = autoControlled(s);
  let patch: Partial<CameraSettings>;
  let changes: Change[];
  if (s.mode !== 'M' || s.autoIso) {
    const to = Math.max(-3, s.exposureComp - 2 / 3);
    patch = { exposureComp: to };
    changes = [{ key: 'exposureComp', label: 'Compensación', from: evText(s.exposureComp), to: evText(to) }];
  } else if (!auto.iso && s.iso > ISOS[0]!.value) {
    const to = snap('iso', s.iso / Math.pow(2, 2 / 3));
    patch = { iso: to };
    changes = [{ key: 'iso', label: 'ISO', from: triadLabel('iso', s.iso), to: triadLabel('iso', to), delta: stopsText(lightStops('iso', s.iso, to)) }];
  } else {
    const to = snap('shutter', s.shutter / Math.pow(2, 2 / 3));
    patch = { shutter: to };
    changes = [{ key: 'shutter', label: 'Velocidad', from: triadLabel('shutter', s.shutter), to: triadLabel('shutter', to), delta: stopsText(lightStops('shutter', s.shutter, to)) }];
  }
  return {
    criterion: 'highlights',
    headline: 'Baja la exposición ⅔ de paso',
    changes,
    reason:
      s.format === 'JPEG'
        ? 'Protege las luces: lo quemado no se recupera. Activa las zebras para ver qué zonas llegan al blanco.'
        : 'Protege las luces: lo quemado no se recupera, mientras que en RAW las sombras sí se pueden levantar después.',
    tradeoffs: [],
    bonus: [],
    action: { kind: 'settings', patch },
  };
}

function whiteBalanceAdvice(ctx: ShotContext): Advice {
  const k = Math.round(ctx.scene.lighting.illuminantK / 50) * 50;
  return {
    criterion: 'whiteBalance',
    headline: `Ajusta el balance a ${formatKelvin(k)}`,
    changes: [{ key: 'wbK', label: 'Balance de blancos', from: formatKelvin(ctx.settings.wbK), to: formatKelvin(k) }],
    reason: 'Cuando el balance coincide con la temperatura de la luz, los blancos y la piel salen neutros.',
    tradeoffs: [],
    bonus: [],
    action: { kind: 'settings', patch: { wbK: k } },
  };
}

function levelAdvice(ctx: ShotContext): Advice {
  return {
    criterion: 'level',
    headline: 'Endereza la cámara',
    changes: [],
    reason: `Gira la cámara ${Math.abs(ctx.rollDeg).toFixed(1)}° hacia la ${ctx.rollDeg > 0 ? 'izquierda' : 'derecha'} hasta que la línea del nivel electrónico se ponga verde.`,
    tradeoffs: [],
    bonus: [],
    action: { kind: 'level' },
  };
}

function inevitableRangeAdvice(ctx: ShotContext): Advice {
  return {
    criterion: 'dynamicRange',
    headline: 'Dispara en RAW y protege las luces',
    changes: [],
    reason: `La escena (${ctx.scene.lighting.sceneContrastStops} pasos) supera lo que cualquier sensor registra en una sola toma. Expón para no quemar las luces y levanta las sombras en RAW, o combina varias tomas (HDR).`,
    tradeoffs: [],
    bonus: [],
    action: ctx.settings.format === 'JPEG' ? { kind: 'settings', patch: { format: 'RAW' } } : { kind: 'none' },
  };
}

/* ------------------------------------------------------------------ API */

/** Consejo para cada criterio que no salió bien (en el mismo orden de `ids`). */
export function adviseAll(ctx: ShotContext, ids: CriterionId[]): Partial<Record<CriterionId, Advice>> {
  const out: Partial<Record<CriterionId, Advice>> = {};
  const baseGrades = grade(ctx);
  const base: Evaluated = { settings: ctx.settings, ctx, grades: baseGrades, score: penalty(baseGrades) };
  const searchable = ids.filter((id) => CRITERION_WEIGHT[id] > 0);
  let pool: Evaluated[] | null = null;

  for (const id of ids) {
    if (id === 'highlights') {
      if (Math.abs(ctx.metrics.exposureOffset) <= 0.34) out[id] = highlightsAdvice(ctx);
      continue;
    }
    if (id === 'whiteBalance') {
      out[id] = whiteBalanceAdvice(ctx);
      continue;
    }
    if (id === 'level') {
      out[id] = levelAdvice(ctx);
      continue;
    }
    if (id === 'dynamicRange' && STATUS_PENALTY[baseGrades.dynamicRange ?? 'good'] <= 1) {
      out[id] = inevitableRangeAdvice(ctx);
      continue;
    }
    if (!searchable.includes(id)) continue;
    pool ??= candidates(ctx, baseGrades).map((c) => evaluate(c, ctx));
    const current = STATUS_RANK[baseGrades[id] ?? 'good'];
    let best: Evaluated | null = null;
    for (const cand of pool) {
      const s = cand.grades[id];
      if (!s || STATUS_RANK[s] >= current) continue;
      if (!best || cand.score < best.score) best = cand;
    }
    if (best) out[id] = buildAdvice(id, base, best);
  }
  return out;
}
