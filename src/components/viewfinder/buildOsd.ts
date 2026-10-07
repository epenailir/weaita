/**
 * Construye los datos del OSD (lo que mostraría el visor de una cámara real) a partir del
 * estado de la cámara virtual. Los valores mostrados son los efectivos: si el modo decide
 * algún parámetro, el visor enseña lo que eligió la cámara.
 */
import {
  SENSORS,
  formatAperture,
  formatDistance,
  formatIso,
  formatKelvin,
  formatShutter,
} from '../../engine';
import type { FileFormat, SensorId } from '../../engine';
import type { UseCamera } from '../../state/useCamera';
import type { OsdData } from './types';

/** Distancia de enfoque que la interfaz trata como infinito (m). */
export const FOCUS_INFINITY_M = 1e6;

/** Capacidad de la tarjeta simulada (GB decimales, como se venden). */
export const CARD_CAPACITY_GB = 64;

/** Bytes por píxel aproximados de cada formato (RAW de 14 bits comprimido, JPEG fino). */
export const BYTES_PER_PIXEL: Record<FileFormat, number> = {
  RAW: 1.25,
  JPEG: 0.35,
  'RAW+JPEG': 1.25 + 0.35,
};

/** Distancia de enfoque legible: a partir de ~1 km se considera infinito. */
export function formatFocus(focusM: number): string {
  return formatDistance(focusM >= FOCUS_INFINITY_M * 0.999 ? Infinity : focusM);
}

/** Tamaño estimado de un archivo en megabytes. */
export function estimateFileSizeMB(format: FileFormat, sensorId: SensorId): number {
  return SENSORS[sensorId].megapixels * BYTES_PER_PIXEL[format];
}

/** Disparos que caben en la tarjeta para el formato y la resolución del sensor. */
export function estimateShotsRemaining(format: FileFormat, sensorId: SensorId, cardGb: number = CARD_CAPACITY_GB): number {
  const bytesPerShot = estimateFileSizeMB(format, sensorId) * 1e6;
  return Math.max(0, Math.floor((cardGb * 1e9) / bytesPerShot));
}

/**
 * Datos del OSD para una cámara.
 * @param cam   Estado devuelto por useCamera.
 * @param extra Valores a sobrescribir (batería, disparos, enfoque mostrado…).
 */
export function buildOsd(cam: UseCamera, extra?: Partial<OsdData>): OsdData {
  const { settings, effective, resolved, metrics } = cam;
  const base: OsdData = {
    mode: settings.mode,
    apertureLabel: formatAperture(effective.aperture),
    shutterLabel: formatShutter(effective.shutter),
    isoLabel: formatIso(effective.iso),
    autoIso: settings.autoIso,
    exposureComp: settings.exposureComp,
    meterReading: metrics.meterReading,
    wbLabel: formatKelvin(settings.wbK).replace(/\s+/g, ''),
    format: settings.format,
    af: settings.af,
    metering: settings.metering,
    batteryPct: 100,
    shotsRemaining: estimateShotsRemaining(settings.format, settings.sensor),
    focalMm: settings.focalMm,
    focusLabel: formatFocus(settings.focusM),
    limited: resolved.limited,
    stabilization: settings.stabilizationStops > 0,
  };
  return extra ? { ...base, ...extra } : base;
}
