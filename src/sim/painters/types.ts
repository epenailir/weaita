/**
 * Contrato entre el renderizador y los pintores de escena.
 *
 * Espacio de mundo: el encuadre de referencia (focal `refFocalMm` en full frame) mide 1.5 × 1
 * unidades, centrado en (0, 0), con y hacia abajo. Un objeto de S metros a d metros mide
 * refFocal·S/(d·24) unidades. Con más focal la cámara recorta el centro (zoom sin cambio de
 * perspectiva), así que cada capa se repinta nítida a cualquier escala.
 */
import type { SceneId } from '../types';

export interface PaintFrame {
  /** Límites del lienzo que se está pintando, en unidades de mundo (incluye márgenes). */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Píxeles por unidad de mundo. */
  ppu: number;
  /** Tamaño de un píxel en unidades de mundo. */
  px: number;
  /** Tiempo de animación en segundos (posición de los sujetos en movimiento). */
  timeS: number;
  /** Tiempo de exposición en segundos (longitud de las estelas de luz). */
  exposureS: number;
}

/** Color lineal (0–1 por canal) de una fuente de luz. */
export type LinearRGB = readonly [number, number, number];

/**
 * Fuentes de luz que se rasterizan en el búfer emisivo (HDR). `power` es la intensidad lineal
 * por píxel cuando la fuente está nítida a su tamaño intrínseco (1 = blanco difuso).
 * `size` es el diámetro intrínseco en unidades de mundo.
 */
export type Emitter =
  | { kind: 'point'; x: number; y: number; size: number; color: LinearRGB; power: number; distanceM?: number }
  | {
      kind: 'trail';
      x0: number;
      y0: number;
      x1: number;
      y1: number;
      size: number;
      color: LinearRGB;
      power: number;
      distanceM?: number;
      /** Brillo relativo al inicio y al final de la estela (faros que se ven de frente o de lado). */
      w0?: number;
      w1?: number;
    }
  | {
      kind: 'arc';
      /** Centro de giro (polo celeste) en unidades de mundo. */
      cx: number;
      cy: number;
      /** Posición al final de la exposición. */
      x: number;
      y: number;
      /** Ángulo barrido (rad) durante la exposición; el arco va hacia atrás desde (x, y). */
      sweep: number;
      size: number;
      color: LinearRGB;
      power: number;
      distanceM?: number;
    }
  | { kind: 'glow'; x: number; y: number; radius: number; color: LinearRGB; power: number };

export interface LayerMotion {
  speedMS: number;
  /** Dirección del movimiento en la imagen (se normaliza). */
  dirX: number;
  dirY: number;
  /** Recorta el barrido con la forma original (flujo continuo, como el agua de una cascada). */
  confine?: boolean;
}

/** Plano de suelo: la distancia de cada fila depende de su altura bajo el horizonte. */
export interface GroundPlane {
  horizonY: number;
  cameraHeightM: number;
  /** Distancia máxima a considerar (más allá se trata como el fondo). */
  farM?: number;
}

export interface SceneLayer {
  id: string;
  /** Distancia en metros para la profundidad de campo (y para el barrido de movimiento). */
  distanceM: number;
  plane?: GroundPlane;
  /** La capa depende de `timeS` (se repinta en cada cuadro en vivo). */
  animated?: boolean;
  motion?: LayerMotion;
  /** Excluir del focus peaking (cielos, brumas). */
  noPeaking?: boolean;
  paint?(ctx: CanvasRenderingContext2D, f: PaintFrame): void;
  emitters?(f: PaintFrame): Emitter[];
}

export interface ScenePainter {
  id: SceneId;
  /** Capas de atrás hacia adelante. */
  layers: SceneLayer[];
  /** Semilla de la dirección de la trepidación. */
  seed: number;
}
