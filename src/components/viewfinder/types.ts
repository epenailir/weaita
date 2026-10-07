/**
 * Contrato de los componentes del visor (OSD). Los implementa el kit de visor y los usan
 * el laboratorio de exposición, el sandbox de escenarios y los desafíos.
 */
import type { ReactNode } from 'react';
import type { AfMode, CameraMode, FileFormat, Histogram, MeteringMode } from '../../engine/types';

export interface OsdData {
  mode: CameraMode;
  /** "f/2.8" */
  apertureLabel: string;
  /** "1/250" o "2\"" */
  shutterLabel: string;
  /** "400" */
  isoLabel: string;
  autoIso: boolean;
  /** Compensación de exposición en EV (se muestra si ≠ 0). */
  exposureComp: number;
  /** Lectura del exposímetro en EV (−∞…+∞; la escala se satura en ±rango). */
  meterReading: number;
  /** "5500K" */
  wbLabel: string;
  format: FileFormat;
  af: AfMode;
  metering: MeteringMode;
  /** 0–100 */
  batteryPct: number;
  shotsRemaining: number;
  focalMm: number;
  /** "3.2 m" o "∞" */
  focusLabel: string;
  /** Parámetro que el automatismo no pudo resolver: parpadea en el OSD. */
  limited: 'aperture' | 'shutter' | 'iso' | null;
  stabilization: boolean;
}

export interface ViewfinderProps {
  osd: OsdData;
  /** Contenido de la imagen (normalmente el <canvas> del simulador). */
  children: ReactNode;
  showGrid?: boolean;
  /** Inclinación en grados para el nivel electrónico; null lo oculta. */
  levelRollDeg?: number | null;
  histogram?: Histogram | null;
  /** Avisos breves que la cámara mostraría (p. ej. "Riesgo de trepidación"). */
  warnings?: string[];
  /** Posición del punto de enfoque en coordenadas normalizadas 0–1; null lo oculta. */
  afPoint?: { x: number; y: number; locked: boolean } | null;
  /** Relación de aspecto de la imagen (ancho/alto). 3/2 por defecto. */
  aspect?: number;
  className?: string;
}

export interface ExposureScaleProps {
  /** Lectura en EV. */
  value: number;
  /** Extensión de la escala a cada lado (±2 o ±3). */
  range?: 2 | 3;
  compact?: boolean;
  className?: string;
}

export interface HistogramProps {
  data: Histogram;
  variant?: 'rgb' | 'luma';
  className?: string;
  /** Muestra el porcentaje de píxeles quemados/empastados. */
  showClipping?: boolean;
}

export interface ApertureIrisProps {
  /** Número f exacto. */
  fNumber: number;
  /** Número de palas del diafragma (7 o 9 son típicos). */
  blades?: number;
  size?: number;
  /** Apertura máxima del objetivo (la del iris totalmente abierto). */
  maxAperture?: number;
  className?: string;
}

export interface ElectronicLevelProps {
  rollDeg: number;
  className?: string;
}
