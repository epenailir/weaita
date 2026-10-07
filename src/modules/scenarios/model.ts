/**
 * Modelo del sandbox: traduce la receta escrita del contenido a ajustes del motor, define
 * la cámara "como salió del bolso" y simula tomas (automatismo + métricas) sin pasar por
 * el renderizador, para explicar con números reales lo que verá el alumno.
 */
import {
  APERTURES,
  ISOS,
  SENSORS,
  SHUTTERS,
  computeMetrics,
  nearestStop,
  resolveExposure,
} from '../../engine';
import type {
  AfMode,
  CameraMode,
  CameraSettings,
  FileFormat,
  MeteringMode,
  ResolvedExposure,
  SceneLighting,
  SensorFormat,
  ShotMetrics,
} from '../../engine';
import type { Scenario } from '../../content/types';
import type { SimScene } from '../../sim/types';
import { DEFAULT_SETTINGS } from '../../state/useCamera';
import type { UseCamera } from '../../state/useCamera';
import { FOCUS_INFINITY_M } from '../../components/viewfinder';

/** Una toma resuelta: ajustes efectivos, métricas y la escena con la que se midió. */
export interface ShotContext {
  /** Ajustes efectivos (lo que decidió el automatismo incluido). */
  s: CameraSettings;
  m: ShotMetrics;
  limited: ResolvedExposure['limited'];
  lighting: SceneLighting;
  sensor: SensorFormat;
}

/** Celdas de la tarjeta de receta (estilo OSD). */
export type RecipeParam =
  | 'mode'
  | 'aperture'
  | 'shutter'
  | 'iso'
  | 'focal'
  | 'af'
  | 'metering'
  | 'wb'
  | 'format'
  | 'drive'
  | 'focus'
  | 'support';

/* ------------------------------------------------------------------ Traducción de la receta */

/** "A", "M", "M-auto-iso", "Av", "Tv" → modo del motor y Auto-ISO. */
export function parseMode(text: string): { mode: CameraMode; autoIso: boolean } {
  const t = text.trim().toUpperCase();
  const autoIso = /AUTO[-\s]?ISO/.test(t);
  if (t.startsWith('AV')) return { mode: 'A', autoIso };
  if (t.startsWith('TV')) return { mode: 'S', autoIso };
  const letter = t.charAt(0);
  const mode: CameraMode = letter === 'A' || letter === 'S' || letter === 'P' ? letter : 'M';
  return { mode, autoIso };
}

export function parseAf(text: string): AfMode {
  const t = text.trim().toUpperCase().replace(/\s+/g, '');
  if (t === 'AF-C' || t === 'AFC' || t === 'AI-SERVO') return 'AF-C';
  if (t === 'AF-A' || t === 'AFA' || t === 'AI-FOCUS') return 'AF-A';
  if (t === 'MF' || t === 'MANUAL') return 'MF';
  return 'AF-S';
}

export function parseMetering(text: string): MeteringMode {
  const t = text.trim().toLowerCase();
  if (t.startsWith('spot') || t.startsWith('punt') || t.startsWith('partial')) return 'spot';
  if (t.startsWith('center') || t.startsWith('centre') || t.startsWith('pond')) return 'center';
  return 'matrix';
}

export function parseFormat(text: string): FileFormat {
  const t = text.trim().toLowerCase().replace(/\s+/g, '');
  if (t.includes('raw') && (t.includes('jpg') || t.includes('jpeg'))) return 'RAW+JPEG';
  if (t.includes('raw')) return 'RAW';
  return 'JPEG';
}

/** Lleva los valores numéricos a la escala de tercios, como hace el reductor de la cámara. */
export function snapSettings(s: CameraSettings): CameraSettings {
  return {
    ...s,
    aperture: nearestStop(APERTURES, s.aperture).value,
    shutter: nearestStop(SHUTTERS, s.shutter).value,
    iso: nearestStop(ISOS, s.iso).value,
  };
}

/* ------------------------------------------------------------------ Estados de la cámara */

/**
 * La cámara tal como sale del bolso: valores por defecto de la escena, modo M,
 * AF-S, medición matricial, JPEG de fábrica y sin trípode.
 */
export function bagSettings(scene: SimScene): CameraSettings {
  return snapSettings({
    ...DEFAULT_SETTINGS,
    mode: 'M',
    autoIso: false,
    exposureComp: 0,
    aperture: scene.defaults.aperture,
    shutter: scene.defaults.shutter,
    iso: scene.defaults.iso,
    focalMm: scene.defaults.focalMm,
    focusM: scene.defaults.focusM,
    wbK: scene.defaults.wbK,
    af: 'AF-S',
    metering: 'matrix',
    format: 'JPEG',
    sensor: 'ff',
    stabilizationStops: 0,
    tripod: false,
  });
}

export interface RecipeExtras {
  tripod: boolean;
  /** Distancia de enfoque de la receta (m) calculada sobre los ajustes ya traducidos. */
  focusM: (s: CameraSettings) => number;
}

/**
 * Ajustes completos de la receta (sobre la cámara del bolso). Pensados para pasarse a
 * `cam.set`, que vuelve a ajustar a tercios; aquí ya vienen ajustados.
 */
export function recipeSettings(sc: Scenario, base: CameraSettings, extras: RecipeExtras): CameraSettings {
  const r = sc.recommended;
  const { mode, autoIso } = parseMode(r.mode);
  const s = snapSettings({
    ...base,
    mode,
    autoIso,
    exposureComp: 0,
    aperture: r.aperture,
    shutter: r.shutterSeconds,
    iso: r.iso,
    focalMm: r.focalMm,
    af: parseAf(r.af),
    metering: parseMetering(r.metering),
    wbK: r.wbK,
    format: parseFormat(r.format),
    sensor: 'ff',
    tripod: extras.tripod,
    stabilizationStops: extras.tripod ? 0 : base.stabilizationStops,
  });
  return { ...s, focusM: extras.focusM(s) };
}

/** Parche con solo los campos que la receta fija (para `cam.set`). */
export function recipePatch(recipe: CameraSettings): Partial<CameraSettings> {
  const {
    mode,
    autoIso,
    exposureComp,
    aperture,
    shutter,
    iso,
    focalMm,
    focusM,
    wbK,
    af,
    metering,
    format,
    sensor,
    stabilizationStops,
    tripod,
  } = recipe;
  return { mode, autoIso, exposureComp, aperture, shutter, iso, focalMm, focusM, wbK, af, metering, format, sensor, stabilizationStops, tripod };
}

/* ------------------------------------------------------------------ Simulación */

/** Resuelve el automatismo y calcula las métricas de unos ajustes (sin dibujar). */
export function simulate(settings: CameraSettings, lighting: SceneLighting, lensMaxAperture: number): ShotContext {
  const sensor = SENSORS[settings.sensor];
  const r = resolveExposure(settings, lighting, sensor, lensMaxAperture);
  const s: CameraSettings = { ...settings, aperture: r.aperture, shutter: r.shutter, iso: r.iso };
  return { s, m: computeMetrics(s, lighting), limited: r.limited, lighting, sensor };
}

/** Contexto de la cámara en vivo. */
export function liveContext(cam: UseCamera, lighting: SceneLighting): ShotContext {
  return {
    s: cam.effective,
    m: cam.metrics,
    limited: cam.resolved.limited,
    lighting,
    sensor: SENSORS[cam.settings.sensor],
  };
}

/* ------------------------------------------------------------------ Coincidencia con la receta */

const sameStop = (scale: typeof APERTURES, a: number, b: number) => nearestStop(scale, a).index === nearestStop(scale, b).index;

export const isInfinity = (m: number) => m >= FOCUS_INFINITY_M * 0.999;

function sameFocus(a: number, b: number): boolean {
  if (isInfinity(a) || isInfinity(b)) return isInfinity(a) && isInfinity(b);
  return Math.abs(Math.log(a / b)) < 0.06;
}

/**
 * ¿El parámetro de la cámara coincide con el de la receta?
 * `settings` = elegidos por el usuario; `effective` = tras el automatismo.
 * Devuelve null para parámetros que no se simulan (modo de disparo).
 */
export function paramMatches(
  p: RecipeParam,
  settings: CameraSettings,
  effective: CameraSettings,
  recipe: ShotContext,
): boolean | null {
  const r = recipe.s;
  switch (p) {
    case 'mode':
      return settings.mode === r.mode && settings.autoIso === r.autoIso;
    case 'aperture':
      return sameStop(APERTURES, effective.aperture, r.aperture);
    case 'shutter':
      return sameStop(SHUTTERS, effective.shutter, r.shutter);
    case 'iso':
      return r.autoIso ? settings.autoIso && sameStop(ISOS, effective.iso, r.iso) : sameStop(ISOS, effective.iso, r.iso);
    case 'focal':
      return settings.focalMm === r.focalMm;
    case 'af':
      return settings.af === r.af;
    case 'metering':
      return settings.metering === r.metering;
    case 'wb':
      return Math.abs(settings.wbK - r.wbK) <= 100;
    case 'format':
      return settings.format === r.format;
    case 'focus':
      return sameFocus(settings.focusM, r.focusM);
    case 'support':
      return settings.tripod === r.tripod;
    case 'drive':
      return null;
  }
}

/** Props comunes de las herramientas de cada escenario. */
export interface ToolProps {
  cam: UseCamera;
  lighting: SceneLighting;
  lensMaxAperture: number;
}
