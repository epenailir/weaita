/**
 * Experimentos "predice → observa → explica": cada lección tiene una pregunta de predicción y
 * un experimento de dos pasos (antes y después) que se aplica en el visor para comprobarla.
 * Las tarjetas de conceptos erróneos usan el mismo mecanismo para desmontar cada mito.
 */
import { apertureFor, hyperfocalM, isoFor, shutterFor, SENSORS } from '../../engine';
import type { CameraSettings } from '../../engine';
import type { SceneId, SimScene } from '../../sim/types';

export interface StepContext {
  scene: SimScene;
  /** Ajustes sobre los que se aplica el paso. */
  settings: CameraSettings;
}

export interface ExperimentStep {
  /** Rótulo corto de la imagen ("f/2.8"). */
  label: string;
  patch: (ctx: StepContext) => Partial<CameraSettings>;
}

/** Datos que se muestran bajo cada imagen del antes y después. */
export type CaptionKey = 'exposure' | 'meter' | 'background' | 'dof' | 'motion' | 'shake' | 'noise' | 'dynamicRange' | 'light';

export interface Experiment {
  id: string;
  /** Escena en la que se ve mejor el efecto (si falta, la actual). */
  sceneId?: SceneId;
  before: ExperimentStep;
  after: ExperimentStep;
  captions: CaptionKey[];
  /** Muestra el histograma de cada paso. */
  histogram?: boolean;
}

export interface Prediction {
  lessonId: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  experiment: Experiment;
}

export interface Misconception {
  id: string;
  myth: string;
  reality: string;
  detail: string;
  experiment: Experiment;
}

/* ------------------------------------------------------------------ Ayudas */

/** Número f exacto a partir del nominal (f/2.8 → 2^(3/2)). */
const N = (nominal: number) => Math.pow(2, Math.round(6 * Math.log2(nominal)) / 6);
/** Tiempo exacto a partir del denominador nominal (250 → 1/256). */
const T = (denominator: number) => Math.pow(2, -Math.round(3 * Math.log2(denominator)) / 3);
const ev = (c: StepContext) => c.scene.lighting.ev100;

/** Modo manual limpio: sin Auto-ISO ni compensación, para aislar la variable. */
const MANUAL: Partial<CameraSettings> = { mode: 'M', autoIso: false, exposureComp: 0 };

/* ------------------------------------------------------------------ Predicciones por lección */

export const PREDICTIONS: Prediction[] = [
  {
    lessonId: 'aperture',
    question: 'En el retrato estás a f/2.8. ¿Qué le pasará al fondo si cierras a f/11 (compensando la luz para que el brillo no cambie)?',
    options: ['Se desenfocará todavía más', 'Se verá más nítido y reconocible', 'Nada: la apertura solo cambia el brillo'],
    correctIndex: 1,
    explanation:
      'Al cerrar el diafragma, el haz de luz que forma cada punto es más estrecho y su disco de desenfoque se achica: el fondo pasa de mancha cremosa a formas reconocibles y la zona nítida se ensancha. Para conservar el brillo hubo que alargar la velocidad y subir el ISO: ese es el costo de los 4 pasos que cerraste.',
    experiment: {
      id: 'pred-aperture',
      sceneId: 'golden-hour-portrait',
      before: {
        label: 'f/2.8',
        patch: (c) => ({ ...MANUAL, aperture: N(2.8), iso: 100, shutter: shutterFor(ev(c), N(2.8), 100), focusM: c.scene.lighting.subjectDistanceM }),
      },
      after: { label: 'f/11', patch: (c) => ({ aperture: N(11), iso: 400, shutter: shutterFor(ev(c), N(11), 400) }) },
      captions: ['background', 'dof'],
    },
  },
  {
    lessonId: 'shutter-speed',
    question: 'El ciclista cruza a unos 18 km/h. Si pasas de 1/1000 s a 1/30 s (compensando con la apertura y con la cámara en trípode), ¿cómo saldrá?',
    options: ['Igual de nítido: el brillo es el mismo', 'Barrido en la dirección en que avanza', 'Más nítido, porque entra más luz'],
    correctIndex: 1,
    explanation:
      'Durante 1/30 s el ciclista avanza unos 17 cm y su imagen se arrastra decenas de píxeles sobre el sensor. A 1/1000 s solo recorre medio centímetro: queda congelado. El trípode descarta la trepidación, así que todo el barrido es del sujeto.',
    experiment: {
      id: 'pred-shutter',
      sceneId: 'plaza',
      before: { label: '1/1000 s', patch: (c) => ({ ...MANUAL, tripod: true, shutter: T(1000), iso: 800, aperture: apertureFor(ev(c), T(1000), 800) }) },
      after: { label: '1/30 s', patch: (c) => ({ shutter: T(30), iso: 100, aperture: apertureFor(ev(c), T(30), 100) }) },
      captions: ['motion', 'light'],
    },
  },
  {
    lessonId: 'iso',
    question: 'Para congelar al ciclista pasas de 1/60 s a 1/2000 s y compensas solo con el ISO (de 200 a 6400). El brillo queda igual. ¿Qué precio pagas?',
    options: ['Ninguno: el ISO compensa gratis', 'Más ruido y menos rango dinámico', 'Menos profundidad de campo'],
    correctIndex: 1,
    explanation:
      'El ISO no agregó luz: el sensor recibió 5 pasos menos de luz y la cámara amplificó esa señal más débil. El ciclista queda congelado, pero aparece grano (sobre todo en las sombras) y el rango dinámico cae de unos 11 a unos 7.5 pasos.',
    experiment: {
      id: 'pred-iso',
      sceneId: 'plaza',
      before: { label: 'ISO 200 · 1/60 s', patch: (c) => ({ ...MANUAL, aperture: N(8), shutter: T(60), iso: isoFor(ev(c), N(8), T(60)) }) },
      after: { label: 'ISO 6400 · 1/2000 s', patch: (c) => ({ shutter: T(2000), iso: isoFor(ev(c), N(8), T(2000)) }) },
      captions: ['noise', 'dynamicRange', 'motion'],
    },
  },
  {
    lessonId: 'stops',
    question: 'Estás en f/4 a 1/250 s con la exposición correcta. Si cierras a f/8, ¿qué velocidad mantiene la misma exposición?',
    options: ['1/500 s', '1/125 s', '1/60 s'],
    correctIndex: 2,
    explanation:
      'De f/4 a f/8 hay dos pasos (f/4 → f/5.6 → f/8): entra ¼ de la luz, porque lo que cuenta es el área de la abertura, que depende del cuadrado del número f. Para compensar, el tiempo debe ser 4 veces mayor: 1/250 → 1/125 → 1/60 s.',
    experiment: {
      id: 'pred-stops',
      sceneId: 'plaza',
      before: { label: 'f/4 · 1/250 s', patch: (c) => ({ ...MANUAL, aperture: N(4), shutter: T(250), iso: isoFor(ev(c), N(4), T(250)) }) },
      after: { label: 'f/8 · 1/60 s', patch: () => ({ aperture: N(8), shutter: T(60) }) },
      captions: ['exposure', 'light'],
      histogram: true,
    },
  },
  {
    lessonId: 'exposure-triangle',
    question: 'En la plaza quieres al ciclista congelado (1/1000 s) y el fondo suave (f/2.8). Fijados esos dos, ¿qué control cierra la cuenta?',
    options: ['La apertura', 'La velocidad', 'El ISO'],
    correctIndex: 2,
    explanation:
      'Primero decides lo creativo (fondo → apertura; movimiento → velocidad) y el ISO cierra la cuenta. Pasar de f/8 a f/2.8 suma 3 pasos de luz y de 1/60 a 1/1000 s resta 4: el ISO sube un paso, de 200 a 400, para quedar en ±0.',
    experiment: {
      id: 'pred-triangle',
      sceneId: 'plaza',
      before: { label: 'f/8 · 1/60 s', patch: (c) => ({ ...MANUAL, aperture: N(8), shutter: T(60), iso: isoFor(ev(c), N(8), T(60)) }) },
      after: { label: 'f/2.8 · 1/1000 s', patch: (c) => ({ aperture: N(2.8), shutter: T(1000), iso: isoFor(ev(c), N(2.8), T(1000)) }) },
      captions: ['motion', 'background', 'noise'],
    },
  },
  {
    lessonId: 'metering',
    question: 'Retrato a contraluz con medición matricial: ajustas hasta que el exposímetro marca 0. ¿Cómo sale el rostro?',
    options: ['Bien expuesto', 'Oscuro: el cielo brillante engaña al exposímetro', 'Quemado'],
    correctIndex: 1,
    explanation:
      'La medición matricial promedia todo el cuadro y el cielo brillante pesa mucho: el exposímetro cree que la escena está más iluminada de lo que está el rostro y te lleva a subexponerlo un paso. Con medición puntual sobre la cara, el mismo 0 da una piel bien expuesta.',
    experiment: {
      id: 'pred-metering',
      sceneId: 'golden-hour-portrait',
      before: {
        label: 'Matricial · exposímetro 0',
        patch: (c) => ({ ...MANUAL, metering: 'matrix', aperture: N(2.8), iso: 100, shutter: shutterFor(ev(c) + c.scene.lighting.meteringBias.matrix, N(2.8), 100) }),
      },
      after: {
        label: 'Puntual · exposímetro 0',
        patch: (c) => ({ metering: 'spot', shutter: shutterFor(ev(c) + c.scene.lighting.meteringBias.spot, N(2.8), 100) }),
      },
      captions: ['meter', 'exposure'],
    },
  },
  {
    lessonId: 'histogram',
    question: 'Si sobreexpones 2 pasos, ¿qué le pasa al histograma?',
    options: ['Se desplaza a la izquierda', 'Se desplaza a la derecha y puede pegarse al borde', 'No cambia: solo cambia el brillo de la pantalla'],
    correctIndex: 1,
    explanation:
      'Cada paso de más empuja todos los tonos hacia la derecha. Los que ya estaban cerca del blanco se amontonan contra el borde: esos píxeles quedan quemados, sin detalle. El histograma no depende del brillo de la pantalla, por eso es más confiable que mirar la foto.',
    experiment: {
      id: 'pred-histogram',
      sceneId: 'landscape',
      before: { label: 'Exposición correcta', patch: (c) => ({ ...MANUAL, aperture: N(8), iso: 100, shutter: shutterFor(ev(c), N(8), 100), tripod: true }) },
      after: { label: '+2 pasos', patch: (c) => ({ shutter: c.settings.shutter * 4 }) },
      captions: ['exposure'],
      histogram: true,
    },
  },
  {
    lessonId: 'exposure-compensation',
    question: 'En prioridad a la apertura (A), con el ISO fijo, aplicas +1 EV de compensación. ¿Qué cambia la cámara?',
    options: ['Abre el diafragma un paso', 'Alarga la velocidad un paso', 'Sube el ISO un paso'],
    correctIndex: 1,
    explanation:
      'En A la apertura es tuya y el ISO está fijo: lo único que la cámara puede mover es la velocidad. Para aclarar un paso duplica el tiempo de exposición. En S cambiaría la apertura y en M con Auto-ISO, el ISO.',
    experiment: {
      id: 'pred-compensation',
      sceneId: 'street',
      before: { label: 'A · ±0 EV', patch: () => ({ mode: 'A', autoIso: false, aperture: N(5.6), iso: 200, exposureComp: 0 }) },
      after: { label: 'A · +1 EV', patch: () => ({ exposureComp: 1 }) },
      captions: ['light', 'exposure'],
    },
  },
  {
    lessonId: 'depth-of-field',
    question: 'Paisaje con 24 mm a f/11 y rocas a 1.5 m. ¿Dónde enfocas para que todo, de las rocas a las montañas, quede nítido?',
    options: ['Al infinito, en las montañas', 'A la distancia hiperfocal (≈ 1.7 m)', 'En las rocas, a 1.5 m'],
    correctIndex: 1,
    explanation:
      'Enfocado al infinito, la zona nítida empieza recién en la hiperfocal (≈ 1.7 m) y las rocas quedan blandas. Enfocando justo a la hiperfocal, la zona nítida va de la mitad de esa distancia (≈ 0.9 m) hasta el infinito: entran las rocas y las montañas.',
    experiment: {
      id: 'pred-dof',
      sceneId: 'landscape',
      before: {
        label: 'Enfoque a ∞',
        patch: (c) => ({ ...MANUAL, tripod: true, focalMm: 24, aperture: N(11), iso: 100, shutter: shutterFor(ev(c), N(11), 100), focusM: 1e6 }),
      },
      after: {
        label: 'Enfoque a la hiperfocal',
        patch: (c) => ({ focusM: Math.round(hyperfocalM(24, N(11), SENSORS[c.settings.sensor].cocMm) * 100) / 100 }),
      },
      captions: ['dof'],
    },
  },
];

export function predictionFor(lessonId: string): Prediction | undefined {
  return PREDICTIONS.find((p) => p.lessonId === lessonId);
}

/* ------------------------------------------------------------------ Conceptos erróneos */

export const MISCONCEPTIONS: Misconception[] = [
  {
    id: 'numero-f',
    myth: 'Un número f más grande deja entrar más luz.',
    reality: 'Es al revés: f/16 deja pasar 1/32 de la luz que f/2.8.',
    detail:
      'El número f es un divisor: focal ÷ diámetro de la abertura. Un número más grande significa una abertura más pequeña. Con la misma velocidad y el mismo ISO, pasar de f/2.8 a f/16 oscurece la toma 5 pasos.',
    experiment: {
      id: 'mito-numero-f',
      sceneId: 'plaza',
      before: { label: 'f/2.8', patch: (c) => ({ ...MANUAL, aperture: N(2.8), shutter: T(250), iso: isoFor(ev(c), N(2.8), T(250)) }) },
      after: { label: 'f/16 (misma velocidad e ISO)', patch: () => ({ aperture: N(16) }) },
      captions: ['exposure', 'light'],
      histogram: true,
    },
  },
  {
    id: 'iso-luz',
    myth: 'Subir el ISO hace que el sensor capte más luz.',
    reality: 'El ISO amplifica la señal ya capturada: con la misma apertura y velocidad llegan los mismos fotones.',
    detail:
      'Por eso aclarar con ISO no es gratis: se amplifica también el ruido. Aquí la luz que entra es idéntica en ambas tomas (f/8 a 1/1000 s); solo cambia la ganancia, de ISO 100 a ISO 3200.',
    experiment: {
      id: 'mito-iso',
      sceneId: 'plaza',
      before: { label: 'ISO 100', patch: () => ({ ...MANUAL, aperture: N(8), shutter: T(1000), iso: 100 }) },
      after: { label: 'ISO 3200 (misma luz)', patch: () => ({ iso: 3200 }) },
      captions: ['light', 'exposure', 'noise'],
    },
  },
  {
    id: 'estabilizacion',
    myth: 'La estabilización congela a los sujetos que se mueven.',
    reality: 'Compensa el temblor de tus manos, no el movimiento del sujeto.',
    detail:
      'Con 5 pasos de estabilización, 1/15 s ya no produce trepidación con 50 mm, pero el ciclista sigue avanzando durante toda la exposición y sale igual de barrido. Para congelarlo solo sirve una velocidad más rápida (o un flash).',
    experiment: {
      id: 'mito-estabilizacion',
      sceneId: 'plaza',
      before: {
        label: '1/15 s sin estabilizar',
        patch: (c) => ({ ...MANUAL, tripod: false, stabilizationStops: 0, focalMm: 50, shutter: T(15), iso: 100, aperture: apertureFor(ev(c), T(15), 100) }),
      },
      after: { label: '1/15 s con 5 pasos', patch: () => ({ stabilizationStops: 5 }) },
      captions: ['shake', 'motion'],
    },
  },
];
