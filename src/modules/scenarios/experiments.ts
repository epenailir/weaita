/**
 * "Rompe la receta": experimentos de un clic que cambian uno o dos ajustes sobre la receta
 * y explican la consecuencia con los números del motor (receta frente a experimento).
 */
import {
  airyDiskMm,
  formatAperture,
  formatDistance,
  formatIso,
  formatKelvin,
  handheldLimitS,
  miredShift,
  npfRuleS,
  rule500S,
} from '../../engine';
import type { CameraSettings } from '../../engine';
import type { ScenarioId } from '../../content/types';
import { FOCUS_INFINITY_M, METERING_INFO } from '../../components/viewfinder';
import { fmtDepth, fmtEV, fmtLength, fmtMicrons, fmtPct, fmtPx, fmtTime, fmtZone, num, timesText } from './format';
import type { ShotContext } from './model';

export interface ExperimentResult {
  /** Lo que se observa, con números. */
  observed: string;
  /** Por qué ocurre. */
  why: string;
}

export interface Experiment {
  id: string;
  /** Nombre corto del experimento. */
  title: string;
  /** Qué cambia respecto de la receta. */
  change: string;
  /** Pregunta para predecir antes de probar. */
  question: string;
  patch: (recipe: CameraSettings, c: ShotContext) => Partial<CameraSettings>;
  explain: (now: ShotContext, recipe: ShotContext) => ExperimentResult;
}

const inZone = (c: ShotContext, d: number) => c.m.dofNearM <= d && d <= c.m.dofFarM;
const ratio = (a: number, b: number) => (b > 0 ? a / b : 0);

/** Desplazamiento angular de una estrella por la rotación terrestre (rad/s, día sidéreo). */
export const EARTH_RAD_PER_S = (2 * Math.PI) / 86164;

/** Trazo de una estrella en el ecuador celeste, en micras sobre el sensor. */
export function starTrailUm(focalMm: number, shutterS: number): number {
  return focalMm * EARTH_RAD_PER_S * shutterS * 1000;
}

export const EXPERIMENTS: Record<ScenarioId, Experiment[]> = {
  'golden-hour-portrait': [
    {
      id: 'matrix',
      title: 'Medición matricial',
      change: 'Matricial en lugar de puntual, en modo A',
      question: 'La cámara sigue en modo A. ¿Cómo saldrá el rostro?',
      patch: () => ({ metering: 'matrix' }),
      explain: (now, rec) => ({
        observed: `La cámara eligió ${fmtTime(now.s.shutter)} en lugar de ${fmtTime(rec.s.shutter)}: el rostro queda en ${fmtEV(now.m.exposureOffset)} y el cielo, bien.`,
        why:
          `La matricial promedia todo el encuadre y el cielo brillante la engaña ${fmtEV(now.lighting.meteringBias.matrix)}. ` +
          `La cámara «corrige» oscureciendo la foto entera. La ${METERING_INFO.spot.label.toLowerCase()} mide solo la mejilla y no se equivoca.`,
      }),
    },
    {
      id: 'f8',
      title: 'Cerrar a f/8',
      change: 'f/8 en lugar de f/2',
      question: '¿Qué pasará con el fondo… y con la velocidad que elige la cámara?',
      patch: () => ({ aperture: 8 }),
      explain: (now, rec) => {
        const limit = handheldLimitS(now.s.focalMm, now.sensor, now.s.stabilizationStops);
        return {
          observed:
            `El disco del fondo baja de ${fmtPct(rec.m.backgroundBlurPct)} a ${fmtPct(now.m.backgroundBlurPct)} y la zona nítida crece de ` +
            `${fmtDepth(rec.m.dofNearM, rec.m.dofFarM)} a ${fmtDepth(now.m.dofNearM, now.m.dofFarM)}. En modo A la velocidad cae a ${fmtTime(now.s.shutter)}.`,
          why:
            `Cerrar 4 pasos achica la pupila a la cuarta parte y el desenfoque con ella. Para mantener la luz la cámara alarga 16× el tiempo` +
            (now.m.shakeRatio > 1 ? `: ya pasaste el límite a pulso (${fmtTime(limit)}) y aparece trepidación.` : '.'),
        };
      },
    },
    {
      id: 'wb',
      title: 'Balance a 3500 K',
      change: 'El balance igual a la luz real',
      question: 'Si el balance coincide con la luz del atardecer, ¿saldrá más «correcta» la foto?',
      patch: (_r, c) => ({ wbK: c.lighting.illuminantK }),
      explain: (now, rec) => ({
        observed: `La piel y el cielo se vuelven neutros: la cámara aplica ${Math.round(Math.abs(miredShift(rec.s.wbK, now.s.wbK)))} mireds de corrección hacia el azul y el dorado desaparece.`,
        why:
          `El balance de blancos neutraliza el color de la luz. Si le dices ${formatKelvin(now.s.wbK)}, borra justo lo que viniste a fotografiar. ` +
          `Con ${formatKelvin(rec.s.wbK)} la luz de ${formatKelvin(now.lighting.illuminantK)} se conserva cálida.`,
      }),
    },
  ],

  'sports-action': [
    {
      id: 'slow',
      title: '1/125 s',
      change: '1/125 s (y f/11 para que la luz no cambie)',
      question: '¿Se verá el jugador igual de nítido?',
      patch: () => ({ shutter: 1 / 125, aperture: 11 }),
      explain: (now, rec) => ({
        observed:
          `El barrido pasa de ${fmtPx(rec.m.subjectMotionBlurPx)} a ${fmtPx(now.m.subjectMotionBlurPx)} (${Math.round(ratio(now.m.subjectMotionBlurPx, rec.m.subjectMotionBlurPx))}×): ` +
          `durante la exposición el jugador recorre ${fmtLength(now.lighting.subjectSpeedMS * now.s.shutter)}.`,
        why:
          `El barrido es proporcional al tiempo: ${fmtTime(now.s.shutter)} es ${Math.round(ratio(now.s.shutter, rec.s.shutter))} veces ${fmtTime(rec.s.shutter)}. ` +
          `Cerramos a f/11 para que el Auto-ISO se quede en ${formatIso(now.s.iso)}: lo único que cambia es el movimiento.`,
      }),
    },
    {
      id: 'afs',
      title: 'AF-S en vez de AF-C',
      change: 'El foco se queda donde estaba hace 0.2 s',
      question: 'El jugador corre hacia ti. ¿Seguirá nítido 0.2 s después de enfocar?',
      patch: (_r, c) => ({ af: 'AF-S', focusM: c.lighting.subjectDistanceM + c.lighting.subjectSpeedMS * 0.2 }),
      explain: (now) => ({
        observed:
          `El foco quedó a ${formatDistance(now.s.focusM)} pero el jugador ya está a ${formatDistance(now.lighting.subjectDistanceM)}: ` +
          `la zona nítida va de ${fmtZone(now.m.dofNearM, now.m.dofFarM)} y lo deja ${inZone(now, now.lighting.subjectDistanceM) ? 'al borde' : 'fuera'}.`,
        why:
          `AF-S enfoca una vez y bloquea. A ${num(now.lighting.subjectSpeedMS)} m/s el jugador avanza ${fmtLength(now.lighting.subjectSpeedMS * 0.2)} en 0.2 s, ` +
          `más que media zona nítida (${fmtDepth(now.m.dofNearM, now.m.dofFarM)} en total). AF-C predice la trayectoria en cada cuadro.`,
      }),
    },
    {
      id: 'f8',
      title: 'f/8 «para asegurar el foco»',
      change: 'f/8 manteniendo 1/2000 s',
      question: '¿Qué tendrá que pagar el Auto-ISO por cerrar 3 pasos?',
      patch: () => ({ aperture: 8 }),
      explain: (now, rec) => ({
        observed:
          `El Auto-ISO subió de ${formatIso(rec.s.iso)} a ${formatIso(now.s.iso)} y el rango dinámico bajó de ${num(rec.m.dynamicRangeStops)} a ${num(now.m.dynamicRangeStops)} pasos. ` +
          `El público del fondo se ve más definido: disco de ${fmtPct(now.m.backgroundBlurPct)} frente a ${fmtPct(rec.m.backgroundBlurPct)}.`,
        why: 'Con la velocidad fija, cada paso más cerrado obliga a duplicar el ISO. f/2.8 da luz y separa al jugador del fondo: esa es la combinación.',
      }),
    },
  ],

  landscape: [
    {
      id: 'f28',
      title: 'Abrir a f/2.8',
      change: 'f/2.8 con el mismo enfoque',
      question: '¿Seguirán nítidas las rocas y las montañas?',
      patch: () => ({ aperture: 2.8 }),
      explain: (now, rec) => {
        const fg = now.lighting.foregroundDistanceM ?? now.lighting.subjectDistanceM;
        const mountains = !Number.isFinite(now.m.dofFarM);
        return {
          observed:
            `La zona nítida queda entre ${formatDistance(now.m.dofNearM)} y ${formatDistance(now.m.dofFarM)}. Primer plano a ${formatDistance(fg)}: ${inZone(now, fg) ? 'nítido' : 'blando'}; ` +
            `montañas: ${mountains ? 'nítidas' : 'blandas'}.`,
          why:
            `La hiperfocal depende del número f: H = f²/(N·c). A f/2.8 es ${formatDistance(now.m.hyperfocalM)}, ${num(ratio(now.m.hyperfocalM, rec.m.hyperfocalM))}× más lejos que a ${formatAperture(rec.s.aperture)}, ` +
            `así que enfocando a ${formatDistance(now.s.focusM)} el infinito queda fuera.`,
        };
      },
    },
    {
      id: 'f22',
      title: 'Cerrar a f/22',
      change: '«Más número f, más nitidez»',
      question: '¿Ganarás nitidez cerrando al máximo?',
      patch: () => ({ aperture: 22 }),
      explain: (now, rec) => ({
        observed:
          `El disco de Airy crece de ${fmtMicrons(airyDiskMm(rec.s.aperture))} a ${fmtMicrons(airyDiskMm(now.s.aperture))}, ` +
          `${timesText(airyDiskMm(now.s.aperture) / now.sensor.cocMm)} el círculo de confusión: toda la imagen se ablanda. En modo A la velocidad baja a ${fmtTime(now.s.shutter)}.`,
        why: 'La luz se difracta en el borde del diafragma y desenfoca todo por igual. En full frame, más allá de f/11–f/16 pierdes más nitidez general de la que ganas en profundidad de campo.',
      }),
    },
    {
      id: 'infinity',
      title: 'Enfocar al infinito',
      change: 'El anillo de enfoque en ∞',
      question: '¿Qué parte de la foto saldrá blanda?',
      patch: () => ({ focusM: FOCUS_INFINITY_M }),
      explain: (now, rec) => {
        const fg = now.lighting.foregroundDistanceM ?? now.lighting.subjectDistanceM;
        return {
          observed: `La zona nítida empieza en ${formatDistance(now.m.dofNearM)} (antes, en ${formatDistance(rec.m.dofNearM)}): el primer plano a ${formatDistance(fg)} queda ${inZone(now, fg) ? 'justo dentro' : 'fuera'}.`,
          why: `Enfocado al infinito desperdicias la mitad de la profundidad de campo, la que caería «detrás» del infinito. Enfocando a la hiperfocal (${formatDistance(now.m.hyperfocalM)}) la zona empieza en la mitad de esa distancia.`,
        };
      },
    },
  ],

  astro: [
    {
      id: '30s',
      title: '30 s de exposición',
      change: '30 s (con ISO 3200 para que la luz no cambie)',
      question: '¿Cómo se verán las estrellas al doble de tiempo?',
      patch: () => ({ shutter: 30, iso: 3200 }),
      explain: (now) => {
        const max = rule500S(now.s.focalMm, now.sensor);
        const npf = npfRuleS(now.s.focalMm, now.s.aperture, now.sensor);
        return {
          observed:
            `${fmtTime(now.s.shutter)} es ${num(ratio(now.s.shutter, max))}× el límite de la regla de los 500 (${fmtTime(max)}) y ${num(ratio(now.s.shutter, npf))}× el de NPF: ` +
            `cada estrella se estira ${fmtMicrons(starTrailUm(now.s.focalMm, now.s.shutter) / 1000)} sobre el sensor.`,
          why: `La Tierra gira ~15″ de arco por segundo y las estrellas se desplazan con ella. Bajamos el ISO a ${formatIso(now.s.iso)} para que el brillo no cambie: solo aparecen los trazos.`,
        };
      },
    },
    {
      id: 'f56',
      title: 'Cerrar a f/5.6',
      change: 'f/5.6 «para más nitidez», compensando con ISO 25600',
      question: 'Si compensas la luz con ISO, ¿qué le pasa a la imagen?',
      patch: () => ({ aperture: 5.6, iso: 25600 }),
      explain: (now, rec) => ({
        observed:
          `Para mantener la exposición el ISO pasa de ${formatIso(rec.s.iso)} a ${formatIso(now.s.iso)}: el rango dinámico cae de ${num(rec.m.dynamicRangeStops)} a ${num(now.m.dynamicRangeStops)} pasos ` +
          `y el ruido de ${Math.round(rec.m.noiseScore)} a ${Math.round(now.m.noiseScore)}/100.`,
        why: 'Cerrar 2 pasos quita ¾ de la luz de las estrellas. Con el tiempo limitado por la rotación terrestre, solo el ISO puede compensar, y el ruido se come las estrellas débiles.',
      }),
    },
    {
      id: '50mm',
      title: 'Objetivo de 50 mm',
      change: '50 mm con el mismo tiempo',
      question: '¿Siguen sirviendo los mismos segundos con más focal?',
      patch: () => ({ focalMm: 50 }),
      explain: (now, rec) => {
        const max = rule500S(now.s.focalMm, now.sensor);
        return {
          observed: `El límite baja de ${fmtTime(rule500S(rec.s.focalMm, rec.sensor))} a ${fmtTime(max)} (500 ÷ 50): ${fmtTime(now.s.shutter)} ya es ${num(ratio(now.s.shutter, max))}× el límite y aparecen trazos.`,
          why: 'El trazo sobre el sensor crece con la focal: el doble de focal, la mitad de tiempo disponible. Por eso la Vía Láctea se fotografía con 14–24 mm.',
        };
      },
    },
    {
      id: 'wb',
      title: 'Balance luz día',
      change: '5500 K en lugar de 3900 K',
      question: '¿De qué color saldrá el cielo nocturno?',
      patch: () => ({ wbK: 5500 }),
      explain: (now, rec) => ({
        observed: `El cielo se tiñe de naranja: la cámara deja ${Math.round(Math.abs(miredShift(now.lighting.illuminantK, now.s.wbK)))} mireds de calidez sin corregir.`,
        why: `El resplandor del cielo y la contaminación lumínica son cálidos (~${formatKelvin(now.lighting.illuminantK)}). Con ${formatKelvin(rec.s.wbK)} la cámara los neutraliza y el cielo queda azul oscuro.`,
      }),
    },
  ],

  street: [
    {
      id: 'f18',
      title: 'Abrir a f/1.8',
      change: 'f/1.8 (con ISO 100 para no quemar la foto)',
      question: 'Enfocado a 3 m, ¿saldrá nítido un peatón a 5 m?',
      patch: () => ({ aperture: 1.8, iso: 100 }),
      explain: (now, rec) => ({
        observed: `La zona nítida queda entre ${formatDistance(now.m.dofNearM)} y ${formatDistance(now.m.dofFarM)} (${fmtDepth(now.m.dofNearM, now.m.dofFarM)}): un peatón a 5 m sale ${inZone(now, 5) ? 'nítido' : 'desenfocado'}.`,
        why: `En la calle no hay tiempo de reenfocar. A f/1.8 solo te quedan ${fmtDepth(now.m.dofNearM, now.m.dofFarM)} de margen; a ${formatAperture(rec.s.aperture)} cubrías de ${fmtZone(rec.m.dofNearM, rec.m.dofFarM)}.`,
      }),
    },
    {
      id: '1-60',
      title: '1/60 s',
      change: '1/60 s en modo M (con ISO 100)',
      question: '¿Qué le pasa al peatón que camina?',
      patch: () => ({ mode: 'M', autoIso: false, shutter: 1 / 60, iso: 100 }),
      explain: (now, rec) => ({
        observed: `El barrido sube de ${fmtPx(rec.m.subjectMotionBlurPx)} a ${fmtPx(now.m.subjectMotionBlurPx)}: el peatón sale movido aunque la cámara esté firme.`,
        why: `A ${num(now.lighting.subjectSpeedMS)} m/s el peatón se desplaza ${fmtLength(now.lighting.subjectSpeedMS * now.s.shutter)} durante ${fmtTime(now.s.shutter)}. La estabilización compensa tu pulso, no el movimiento del sujeto.`,
      }),
    },
    {
      id: '85mm',
      title: 'Teleobjetivo de 85 mm',
      change: '85 mm desde el mismo lugar',
      question: '¿Cuánto medirá ahora la zona nítida a f/8?',
      patch: () => ({ focalMm: 85 }),
      explain: (now, rec) => ({
        observed:
          `La zona nítida pasa de ${fmtDepth(rec.m.dofNearM, rec.m.dofFarM)} a ${fmtDepth(now.m.dofNearM, now.m.dofFarM)} (${fmtZone(now.m.dofNearM, now.m.dofFarM)}) ` +
          `y el barrido del peatón sube a ${fmtPx(now.m.subjectMotionBlurPx)}.`,
        why: 'La profundidad de campo cae con el cuadrado de la focal. Por eso la fotografía callejera se hace con 28–35 mm: zona amplia y te obliga a acercarte.',
      }),
    },
    {
      id: 'focus10',
      title: 'Olvidar el enfoque en 10 m',
      change: 'El anillo quedó en 10 m tras usar el AF',
      question: '¿Saldrá nítido el peatón que pasa a 3 m?',
      patch: () => ({ focusM: 10 }),
      explain: (now) => ({
        observed: `La zona nítida va de ${fmtZone(now.m.dofNearM, now.m.dofFarM)}: el peatón a ${formatDistance(now.lighting.subjectDistanceM)} queda ${inZone(now, now.lighting.subjectDistanceM) ? 'dentro, de milagro' : 'fuera'}.`,
        why: 'Tras usar el AF el anillo se queda donde enfocó. Devuélvelo a 3 m antes de la siguiente toma: es el error más común del enfoque por zona.',
      }),
    },
  ],
};
