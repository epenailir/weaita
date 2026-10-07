/**
 * Relación entre focal, sensor y posición de la cámara para el visor comparativo.
 * Toda la física sale de `engine/optics`; aquí solo se aplica a la escena concreta.
 */
import { backgroundScaleRatio, distanceForFraming, distortionK1, fieldOfView } from '../engine';
import type { SensorFormat } from '../engine';
import { BUILDINGS_BEHIND_M, FRAME_FILL, SUBJECT_HEIGHT_M } from './scene';
import type { LensShot } from './render';

export type FramingMode = 'frame' | 'fixed';
export type LensBuild = 'prime' | 'zoom';

export const FOCAL_MIN_MM = 14;
export const FOCAL_MAX_MM = 400;
/** Focales del selector rápido (coinciden con las fichas de FOCAL_LENGTH_INFO). */
export const QUICK_FOCALS = [14, 24, 35, 50, 85, 135, 200, 400] as const;
/** Focales de la tira comparativa. */
export const STRIP_FOCALS = [14, 35, 50, 85, 200] as const;

/** Distancia a la que la persona ocupa FRAME_FILL de la altura del encuadre. */
export function framingDistanceM(focalMm: number, sensor: SensorFormat): number {
  return distanceForFraming(focalMm, SUBJECT_HEIGHT_M, FRAME_FILL, sensor);
}

export function cameraDistanceM(mode: FramingMode, focalMm: number, sensor: SensorFormat, fixedDistanceM: number): number {
  return mode === 'frame' ? framingDistanceM(focalMm, sensor) : fixedDistanceM;
}

export function shotFor(focalMm: number, sensor: SensorFormat, distanceM: number): LensShot {
  return { focalMm, sensorWidthMm: sensor.widthMm, sensorHeightMm: sensor.heightMm, cameraDistanceM: distanceM };
}

/** Tamaño aparente de los edificios respecto del que tendrían junto al sujeto. */
export function buildingsScale(distanceM: number): number {
  return backgroundScaleRatio(distanceM, BUILDINGS_BEHIND_M);
}

/** Fracción de la altura del encuadre que ocupa la persona a cierta distancia. */
export function subjectFill(focalMm: number, sensor: SensorFormat, distanceM: number): number {
  return (focalMm * SUBJECT_HEIGHT_M) / (distanceM * sensor.heightMm);
}

export interface DistortionInfo {
  k1: number;
  /** Desplazamiento radial en la esquina, en % (negativo = barril). */
  percent: number;
  kind: 'barrel' | 'pincushion' | 'none';
  label: string;
}

export function describeDistortion(k1: number): DistortionInfo {
  const percent = k1 * 100;
  const a = Math.abs(percent);
  if (a < 0.5) return { k1, percent, kind: 'none', label: 'Prácticamente nula' };
  const kind = percent < 0 ? 'barrel' : 'pincushion';
  const noun = kind === 'barrel' ? 'Barril' : 'Cojín';
  const degree = a < 1.2 ? 'leve' : a < 3 ? 'moderado' : 'marcado';
  return { k1, percent, kind, label: `${noun} ${degree}` };
}

export function lensDistortion(focalMm: number, build: LensBuild): DistortionInfo {
  return describeDistortion(distortionK1(focalMm, build));
}

export function anglesOfView(focalMm: number, sensor: SensorFormat) {
  return fieldOfView(focalMm, sensor);
}

/** Formatea grados con un decimal. */
export function formatDegrees(deg: number): string {
  return `${deg >= 100 ? Math.round(deg) : deg.toFixed(1)}°`;
}

export function formatFocal(mm: number): string {
  return `${Math.round(mm)} mm`;
}

/** Porcentaje con signo explícito (tipográfico). */
export function formatSignedPercent(p: number, digits = 1): string {
  const r = Number(p.toFixed(digits));
  if (r === 0) return `0 %`;
  return `${r > 0 ? '+' : '−'}${Math.abs(r).toFixed(digits)} %`;
}
