/** Tipos compartidos por el motor físico y la interfaz. Unidades: f en mm, distancias en m, tiempo en s. */

export type CameraMode = 'M' | 'A' | 'S' | 'P';
export type AfMode = 'AF-S' | 'AF-C' | 'AF-A' | 'MF';
export type MeteringMode = 'matrix' | 'center' | 'spot';
export type FileFormat = 'RAW' | 'JPEG' | 'RAW+JPEG';
export type SensorId = 'ff' | 'apsc' | 'apsc-canon' | 'mft' | 'one-inch';

export interface SensorFormat {
  id: SensorId;
  name: string;
  widthMm: number;
  heightMm: number;
  /** Factor de recorte respecto de 35 mm (36×24). */
  crop: number;
  /** Círculo de confusión aceptable en mm (≈ diagonal / 1500). */
  cocMm: number;
  /** Paso de píxel típico en micras (para la regla NPF). */
  pixelPitchUm: number;
  /** Resolución típica en megapíxeles (para estimar disparos restantes). */
  megapixels: number;
}

export interface CameraSettings {
  mode: CameraMode;
  /** Número f exacto (p. ej. 2.8284 para f/2.8). */
  aperture: number;
  /** Tiempo de exposición en segundos. */
  shutter: number;
  iso: number;
  autoIso: boolean;
  /** Compensación de exposición en EV (modos A, S, P y M con Auto-ISO). */
  exposureComp: number;
  focalMm: number;
  /** Distancia de enfoque en metros. */
  focusM: number;
  /** Balance de blancos de la cámara en Kelvin. */
  wbK: number;
  af: AfMode;
  metering: MeteringMode;
  format: FileFormat;
  sensor: SensorId;
  /** Pasos de estabilización (IBIS/OIS). 0 = sin estabilizar. */
  stabilizationStops: number;
  /** Cámara sobre trípode: anula la trepidación. */
  tripod: boolean;
}

export interface DepthOfField {
  nearM: number;
  /** Infinity cuando el enfoque está en o más allá de la hiperfocal. */
  farM: number;
  totalM: number;
  hyperfocalM: number;
}

export type ExposureState = 'under' | 'ok' | 'over';

export interface Histogram {
  /** 64 cubetas por canal, valores 0–1 normalizados al máximo. */
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
  l: Float32Array;
  clippedHighlightsPct: number;
  clippedShadowsPct: number;
}

/** Métricas medibles usadas por el visor, las explicaciones y los desafíos. */
export interface ShotMetrics {
  settingsEV100: number;
  sceneEV100: number;
  /** Desvío real respecto de la exposición correcta del sujeto (positivo = sobreexpuesta). */
  exposureOffset: number;
  /** Lo que marcaría el exposímetro con el modo de medición elegido. */
  meterReading: number;
  exposureError: number;
  exposureState: ExposureState;
  subjectMotionBlurPx: number;
  backgroundBlurPct: number;
  foregroundBlurPct: number;
  /** Diámetro del disco de Airy (difracción) como % del ancho de imagen. */
  diffractionPct: number;
  dofNearM: number;
  dofFarM: number;
  hyperfocalM: number;
  shakeRatio: number;
  shakeBlurPx: number;
  starTrailRatio: number;
  maxStarExposureS: number;
  noiseScore: number;
  dynamicRangeStops: number;
  fovHorizontalDeg: number;
  aperture: number;
  shutterSeconds: number;
  iso: number;
  focalMm: number;
}

export type MetricKey =
  | 'exposureError'
  | 'subjectMotionBlurPx'
  | 'backgroundBlurPct'
  | 'dofNearM'
  | 'dofFarM'
  | 'iso'
  | 'shutterSeconds'
  | 'aperture'
  | 'focalMm'
  | 'shakeRatio'
  | 'starTrailRatio'
  | 'noiseScore';

export interface MetricTarget {
  metric: MetricKey;
  op: '<=' | '>=';
  value: number;
  label: string;
}

/** Datos físicos de una escena simulada (independientes de cómo se dibuja). */
export interface SceneLighting {
  /** EV a ISO 100 que expone correctamente al sujeto principal. */
  ev100: number;
  illuminantK: number;
  subjectDistanceM: number;
  subjectSpeedMS: number;
  backgroundDistanceM: number;
  foregroundDistanceM: number | null;
  /** Error típico de cada modo de medición en esta escena (EV que el medidor se equivoca). */
  meteringBias: Record<MeteringMode, number>;
  /** Contraste de la escena en pasos (sombras a luces). */
  sceneContrastStops: number;
  hasStars: boolean;
}
