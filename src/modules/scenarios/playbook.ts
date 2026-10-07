/**
 * Ficha técnica de cada escenario: objetivo simulado, cómo se completa la receta (enfoque y
 * soporte), qué paso se deja libre en el ejemplo que se desvanece, qué herramienta y qué
 * ajustes rápidos son relevantes, y los criterios con los que se evalúa la toma.
 */
import { hyperfocalM, SENSORS } from '../../engine';
import type { CameraSettings } from '../../engine';
import type { QuickSettingKey } from '../../components/camera';
import { FOCUS_INFINITY_M } from '../../components/viewfinder';
import type { ScenarioId } from '../../content/types';
import { SCENES } from '../../sim/scenes';
import {
  afcCheck,
  backgroundBlurCheck,
  diffractionCheck,
  exposureCheck,
  foregroundCheck,
  freezeCheck,
  horizonCheck,
  infinityCheck,
  isoCheck,
  manualFocusCheck,
  neutralSkyCheck,
  shakeCheck,
  starsCheck,
  subjectSharpCheck,
  warmToneCheck,
  zoneCheck,
} from './checks';
import type { Check } from './checks';
import type { RecipeParam } from './model';

export type ToolKind = 'metering' | 'motion' | 'hyperfocal' | 'stars' | 'zone';

export interface Playbook {
  id: ScenarioId;
  /** Apertura máxima del objetivo simulado (número f). */
  lensMaxAperture: number;
  tripod: boolean;
  /** Distancia de enfoque que completa la receta. */
  focusM: (s: CameraSettings) => number;
  /** Cómo se elige ese enfoque (texto de la tarjeta). */
  focusNote: string;
  /** Rótulo corto del modo de disparo, como en el OSD. */
  driveShort: string;
  /** Ajustes rápidos relevantes, por orden de importancia. */
  quick: QuickSettingKey[];
  /** Escena con sujetos en movimiento (animación en vivo). */
  live: boolean;
  tool: { kind: ToolKind; tab: string; title: string };
  /** Paso que queda libre en "Completa el último paso". */
  missing: { param: RecipeParam; start: Partial<CameraSettings>; question: string };
  checks: Check[];
}

const hyperfocalOf = (s: CameraSettings) => Math.round(hyperfocalM(s.focalMm, s.aperture, SENSORS[s.sensor].cocMm) * 100) / 100;

export const PLAYBOOKS: Record<ScenarioId, Playbook> = {
  'golden-hour-portrait': {
    id: 'golden-hour-portrait',
    lensMaxAperture: 1.4,
    tripod: false,
    focusM: () => SCENES['golden-hour-portrait'].lighting.subjectDistanceM,
    focusNote: 'AF-S en el ojo más cercano',
    driveShort: 'Único',
    quick: ['metering', 'wb', 'focus', 'focal', 'af', 'format'],
    live: false,
    tool: { kind: 'metering', tab: 'Medición', title: 'Lo que ve cada modo de medición' },
    missing: {
      param: 'metering',
      start: { metering: 'matrix' },
      question: '¿Con qué modo de medición evitas que el cielo oscurezca el rostro?',
    },
    checks: [
      exposureCheck('Rostro bien expuesto'),
      backgroundBlurCheck,
      subjectSharpCheck('Ojos nítidos', 'El rostro'),
      shakeCheck,
      warmToneCheck,
      isoCheck('Rango dinámico', 400, 'para el contraluz'),
    ],
  },
  'sports-action': {
    id: 'sports-action',
    lensMaxAperture: 2.8,
    tripod: false,
    focusM: () => SCENES['sports-action'].lighting.subjectDistanceM,
    focusNote: 'AF-C con seguimiento sobre el jugador',
    driveShort: 'Ráfaga H',
    quick: ['af', 'focal', 'stabilization', 'focus', 'metering', 'format'],
    live: true,
    tool: { kind: 'motion', tab: 'Barrido', title: 'Medidor de barrido del sujeto' },
    missing: {
      param: 'shutter',
      start: { shutter: 1 / 60 },
      question: '¿Qué velocidad congela al jugador que corre a 8 m/s?',
    },
    checks: [
      exposureCheck('Jugador bien expuesto'),
      freezeCheck('Jugador congelado', 'el jugador', 1.5),
      afcCheck,
      subjectSharpCheck('Jugador enfocado', 'El jugador'),
      isoCheck('Ruido contenido', 6400, 'con la velocidad alta'),
      shakeCheck,
    ],
  },
  landscape: {
    id: 'landscape',
    lensMaxAperture: 2.8,
    tripod: true,
    focusM: hyperfocalOf,
    focusNote: 'MF a la hiperfocal',
    driveShort: 'Temp. 2 s',
    quick: ['focus', 'tripod', 'focal', 'metering', 'wb', 'format'],
    live: false,
    tool: { kind: 'hyperfocal', tab: 'Hiperfocal', title: 'Calculadora de hiperfocal' },
    missing: {
      param: 'focus',
      start: { focusM: FOCUS_INFINITY_M },
      question: '¿A qué distancia enfocas para que las rocas y las montañas queden nítidas?',
    },
    checks: [
      exposureCheck('Escena bien expuesta'),
      foregroundCheck(SCENES.landscape.lighting.foregroundDistanceM ?? 1.5),
      horizonCheck(SCENES.landscape.lighting.backgroundDistanceM),
      diffractionCheck,
      isoCheck('Máximo rango dinámico', 200, 'para el cielo brillante'),
      shakeCheck,
    ],
  },
  astro: {
    id: 'astro',
    lensMaxAperture: 2.8,
    tripod: true,
    focusM: () => FOCUS_INFINITY_M,
    focusNote: 'MF al infinito, con lupa',
    driveShort: 'Temp. 2 s',
    quick: ['focus', 'tripod', 'wb', 'sensor', 'focal', 'format'],
    live: false,
    tool: { kind: 'stars', tab: 'Estrellas', title: 'Reglas de los 500 y NPF' },
    missing: {
      param: 'shutter',
      start: { shutter: 2 },
      question: '¿Cuánto tiempo puedes exponer sin que las estrellas dejen trazo?',
    },
    checks: [
      exposureCheck('Cielo bien expuesto'),
      starsCheck,
      infinityCheck,
      isoCheck('Ruido aceptable', 6400, 'en la noche'),
      neutralSkyCheck,
      shakeCheck,
    ],
  },
  street: {
    id: 'street',
    lensMaxAperture: 1.4,
    tripod: false,
    focusM: () => SCENES.street.lighting.subjectDistanceM,
    focusNote: 'MF prefijado (zona)',
    driveShort: 'Silencio',
    quick: ['focus', 'af', 'focal', 'metering', 'format'],
    live: true,
    tool: { kind: 'zone', tab: 'Zona', title: 'Escala de enfoque por zona' },
    missing: {
      param: 'aperture',
      start: { aperture: 2 },
      question: '¿Qué apertura te da una zona nítida de 2 a 7 m enfocando a 3 m?',
    },
    checks: [
      exposureCheck('Calle bien expuesta'),
      zoneCheck(2, 7),
      freezeCheck('Peatón congelado', 'el peatón', 2.5),
      manualFocusCheck,
      shakeCheck,
    ],
  },
};
