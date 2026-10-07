/**
 * Intención fotográfica de cada escena del laboratorio: qué se busca lograr, con qué umbrales
 * se juzga la toma y cómo se ancla su luz a situaciones reales. Los umbrales de barrido están
 * expresados en píxeles sobre una imagen de 1000 px de ancho (REFERENCE_WIDTH_PX del motor).
 */
import { Bike, Car, Footprints, Lamp, Mountain, Sparkles, Sunset, Trophy, Waves } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CameraSettings } from '../../engine';
import { SCENES } from '../../sim/scenes';
import type { SceneId, SimScene } from '../../sim/types';

export type MotionIntent =
  /** Congelar: el barrido debe quedar por debajo de los umbrales. */
  | { kind: 'freeze'; goodPx: number; fairPx: number }
  /** Arrastrar a propósito (seda, estelas): el barrido debe superar los umbrales. */
  | { kind: 'blur'; goodPx: number; fairPx: number }
  | { kind: 'none' };

export type BackgroundIntent = { kind: 'bokeh'; goodPct: number; fairPct: number } | { kind: 'none' };

/** subject: el sujeto dentro de la zona nítida · deep: primer plano e infinito · infinity: solo infinito. */
export type FocusIntent = 'subject' | 'deep' | 'infinity';

export interface SceneBrief {
  id: SceneId;
  icon: LucideIcon;
  /** Situación real con la misma luz ("Luz de atardecer"). */
  anchor: string;
  /** Objetivo de la toma en una frase. */
  goal: string;
  /** Sujeto en minúsculas para frases ("el ciclista"). */
  subject: string;
  motion: MotionIntent;
  background: BackgroundIntent;
  focus: FocusIntent;
  /** Umbrales de noiseScore (0–100) para "bien" y "regular". */
  noise: { good: number; fair: number };
  /** % de píxeles quemados tolerables (fuentes de luz dentro del cuadro). */
  clipTolerancePct: number;
  /** warm-ok: una dominante cálida es parte del ambiente buscado. */
  wb: 'neutral' | 'warm-ok';
  /** Punto AF aproximado sobre el sujeto (coordenadas normalizadas). */
  afPoint: { x: number; y: number };
}

export const SCENE_BRIEFS: Record<SceneId, SceneBrief> = {
  plaza: {
    id: 'plaza',
    icon: Bike,
    anchor: 'Luz de atardecer',
    goal: 'Congela al ciclista y separa el fondo de las luces.',
    subject: 'el ciclista',
    motion: { kind: 'freeze', goodPx: 3, fairPx: 8 },
    background: { kind: 'bokeh', goodPct: 0.5, fairPct: 0.2 },
    focus: 'subject',
    noise: { good: 30, fair: 56 },
    clipTolerancePct: 1.5,
    wb: 'neutral',
    afPoint: { x: 0.5, y: 0.6 },
  },
  'golden-hour-portrait': {
    id: 'golden-hour-portrait',
    icon: Sunset,
    anchor: 'Sol bajo a contraluz',
    goal: 'Rostro bien expuesto pese al cielo brillante y fondo cremoso.',
    subject: 'el rostro',
    motion: { kind: 'freeze', goodPx: 3, fairPx: 8 },
    background: { kind: 'bokeh', goodPct: 1.5, fairPct: 0.7 },
    focus: 'subject',
    noise: { good: 30, fair: 56 },
    clipTolerancePct: 3,
    wb: 'warm-ok',
    afPoint: { x: 0.5, y: 0.36 },
  },
  'sports-action': {
    id: 'sports-action',
    icon: Trophy,
    anchor: 'Sol velado o nublado brillante',
    goal: 'Congela al jugador en plena carrera.',
    subject: 'el jugador',
    motion: { kind: 'freeze', goodPx: 2, fairPx: 5 },
    background: { kind: 'none' },
    focus: 'subject',
    noise: { good: 42, fair: 70 },
    clipTolerancePct: 1,
    wb: 'neutral',
    afPoint: { x: 0.5, y: 0.5 },
  },
  landscape: {
    id: 'landscape',
    icon: Mountain,
    anchor: 'Nublado brillante en la montaña',
    goal: 'Todo nítido, de las rocas cercanas a las montañas, con la máxima calidad.',
    subject: 'las rocas del primer plano',
    motion: { kind: 'none' },
    background: { kind: 'none' },
    focus: 'deep',
    noise: { good: 18, fair: 30 },
    clipTolerancePct: 1,
    wb: 'neutral',
    afPoint: { x: 0.5, y: 0.72 },
  },
  astro: {
    id: 'astro',
    icon: Sparkles,
    anchor: 'Cielo sin luna, lejos de la ciudad',
    goal: 'Estrellas puntuales y la Vía Láctea bien visible.',
    subject: 'las estrellas',
    motion: { kind: 'none' },
    background: { kind: 'none' },
    focus: 'infinity',
    noise: { good: 70, fair: 85 },
    clipTolerancePct: 1,
    wb: 'neutral',
    afPoint: { x: 0.5, y: 0.32 },
  },
  street: {
    id: 'street',
    icon: Footprints,
    anchor: 'Sombra abierta en un día de sol',
    goal: 'Peatón nítido con enfoque por zona y una velocidad segura.',
    subject: 'el peatón',
    motion: { kind: 'freeze', goodPx: 3, fairPx: 8 },
    background: { kind: 'none' },
    focus: 'subject',
    noise: { good: 42, fair: 70 },
    clipTolerancePct: 1,
    wb: 'neutral',
    afPoint: { x: 0.45, y: 0.55 },
  },
  waterfall: {
    id: 'waterfall',
    icon: Waves,
    anchor: 'Bosque en sombra densa, día nublado',
    goal: 'Agua sedosa con la cámara completamente inmóvil.',
    subject: 'el agua',
    motion: { kind: 'blur', goodPx: 150, fairPx: 40 },
    background: { kind: 'none' },
    focus: 'subject',
    noise: { good: 30, fair: 56 },
    clipTolerancePct: 2,
    wb: 'neutral',
    afPoint: { x: 0.5, y: 0.45 },
  },
  'night-city': {
    id: 'night-city',
    icon: Car,
    anchor: 'Avenida iluminada de noche',
    goal: 'Dibujar las estelas de luz de los autos.',
    subject: 'los autos',
    motion: { kind: 'blur', goodPx: 300, fairPx: 80 },
    background: { kind: 'none' },
    focus: 'subject',
    noise: { good: 42, fair: 70 },
    clipTolerancePct: 4,
    wb: 'warm-ok',
    afPoint: { x: 0.5, y: 0.62 },
  },
  studio: {
    id: 'studio',
    icon: Lamp,
    anchor: 'Paneles LED de estudio',
    goal: 'Máxima calidad: ISO bajo y el sujeto nítido.',
    subject: 'el sujeto',
    motion: { kind: 'freeze', goodPx: 3, fairPx: 8 },
    background: { kind: 'none' },
    focus: 'subject',
    noise: { good: 18, fair: 30 },
    clipTolerancePct: 1,
    wb: 'neutral',
    afPoint: { x: 0.5, y: 0.4 },
  },
};

/** Referencias de luminancia (EV a ISO 100) para anclar el EV a la vida real. */
export const EV_REFERENCES: ReadonlyArray<{ ev: number; label: string }> = [
  { ev: 16, label: 'Sol sobre nieve' },
  { ev: 15, label: 'Sol pleno' },
  { ev: 13, label: 'Nublado brillante' },
  { ev: 11, label: 'Atardecer' },
  { ev: 9, label: 'Sombra densa' },
  { ev: 7, label: 'Interior de casa' },
  { ev: 4, label: 'Calle de noche' },
  { ev: -3, label: 'Luna llena' },
  { ev: -7, label: 'Vía Láctea' },
];

export const EV_SCALE_MIN = -8;
export const EV_SCALE_MAX = 17;

/** "Plaza al caer la tarde · EV 11" */
export function sceneLabel(scene: SimScene): string {
  return `${scene.name} · EV ${formatSignedEv(scene.lighting.ev100)}`;
}

export function formatSignedEv(ev: number): string {
  const r = Math.round(ev * 10) / 10;
  return r < 0 ? `−${Math.abs(r)}` : String(r);
}

/** Ajustes de cámara con los que arranca cada escena (se mezclan con los valores por defecto). */
export function sceneSettings(scene: SimScene): Partial<CameraSettings> {
  const d = scene.defaults;
  return {
    aperture: d.aperture,
    shutter: d.shutter,
    iso: d.iso,
    focalMm: d.focalMm,
    focusM: d.focusM,
    wbK: d.wbK,
    exposureComp: 0,
  };
}

export function sceneById(id: SceneId): SimScene {
  return SCENES[id];
}
