import type { CameraSettings, Histogram, SceneLighting, ShotMetrics } from '../engine/types';

export type SceneId =
  | 'plaza'
  | 'golden-hour-portrait'
  | 'sports-action'
  | 'landscape'
  | 'astro'
  | 'street'
  | 'waterfall'
  | 'night-city'
  | 'studio';

export interface SimScene {
  id: SceneId;
  name: string;
  /** Descripción breve de lo que hay en la escena y qué enseña. */
  description: string;
  /** Etiqueta del sujeto principal (lo que debe quedar enfocado). */
  subjectLabel: string;
  lighting: SceneLighting;
  /** Focal (mm, equivalente FF) con la que está compuesta la escena a escala 1:1. */
  refFocalMm: number;
  /** Rango de focales que tiene sentido en esta escena (el zoom recorta desde refFocalMm). */
  focalRange: [number, number];
  defaults: {
    focalMm: number;
    focusM: number;
    aperture: number;
    shutter: number;
    iso: number;
    wbK: number;
  };
}

export interface RenderOptions {
  /** Tiempo de animación (s): posición de los sujetos en movimiento y destellos. */
  timeS: number;
  /** Zebras sobre las altas luces quemadas. */
  highlightWarning: boolean;
  /** Resalta los bordes nítidos (enfoque manual). */
  focusPeaking: boolean;
}

export interface RenderResult {
  histogram: Histogram;
  metrics: ShotMetrics;
  /** Milisegundos que tomó el último cuadro (para ajustar calidad). */
  renderMs: number;
}

/** Contrato público del motor de simulación de imagen. */
export interface SimRendererApi {
  setScene(id: SceneId): void;
  resize(cssWidth: number, cssHeight: number, dpr: number): void;
  render(settings: CameraSettings, options?: Partial<RenderOptions>): RenderResult;
  dispose(): void;
}
