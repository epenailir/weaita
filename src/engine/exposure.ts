/**
 * Exposición: valor de exposición (EV), equivalencias, exposímetro y modos automáticos (A, S, P, Auto-ISO).
 *
 * EV de unos ajustes referido a ISO 100:  EV100 = log2(N²/t) − log2(S/100)
 * Una escena con luminancia EV100 = L queda bien expuesta cuando EV100(ajustes) = L.
 * Desvío = L − EV100(ajustes): positivo ⇒ entra más luz de la necesaria (sobreexposición).
 */
import { APERTURES, ISOS, SHUTTERS, nearestStop } from './scales';
import { handheldLimitS } from './optics';
import type { CameraSettings, ExposureState, MeteringMode, SceneLighting, SensorFormat } from './types';

export const LIMITS = {
  minAperture: APERTURES[0]!.value,
  maxAperture: APERTURES[APERTURES.length - 1]!.value,
  minShutter: SHUTTERS[0]!.value,
  maxShutter: SHUTTERS[SHUTTERS.length - 1]!.value,
  minIso: ISOS[0]!.value,
  maxIso: ISOS[ISOS.length - 1]!.value,
  autoIsoMax: 12800,
} as const;

export function evAtIso100(aperture: number, shutterS: number): number {
  return Math.log2((aperture * aperture) / shutterS);
}

export function settingsEV100(aperture: number, shutterS: number, iso: number): number {
  return evAtIso100(aperture, shutterS) - Math.log2(iso / 100);
}

export function exposureOffset(sceneEV100: number, aperture: number, shutterS: number, iso: number): number {
  return sceneEV100 - settingsEV100(aperture, shutterS, iso);
}

/** Tolerancia de ±⅓ de paso para considerar una exposición correcta. */
export function exposureState(offset: number, tolerance = 0.34): ExposureState {
  if (offset > tolerance) return 'over';
  if (offset < -tolerance) return 'under';
  return 'ok';
}

export function shutterFor(ev100: number, aperture: number, iso: number): number {
  return (aperture * aperture) / Math.pow(2, ev100 + Math.log2(iso / 100));
}

export function apertureFor(ev100: number, shutterS: number, iso: number): number {
  return Math.sqrt(shutterS * Math.pow(2, ev100 + Math.log2(iso / 100)));
}

export function isoFor(ev100: number, aperture: number, shutterS: number): number {
  return 100 * Math.pow(2, evAtIso100(aperture, shutterS) - ev100);
}

/** Pasos de diferencia entre dos valores (positivo = b deja entrar más luz que a). */
export const stops = {
  aperture: (a: number, b: number) => 2 * Math.log2(a / b),
  shutter: (a: number, b: number) => Math.log2(b / a),
  iso: (a: number, b: number) => Math.log2(b / a),
};

/** Lo que indicaría el exposímetro: el desvío real más el error propio del modo de medición. */
export function meterReading(offset: number, metering: MeteringMode, lighting: SceneLighting): number {
  return offset + lighting.meteringBias[metering];
}

export interface ResolvedExposure {
  aperture: number;
  shutter: number;
  iso: number;
  /** El automatismo llegó al límite de algún parámetro (la cámara haría parpadear el valor). */
  limited: 'aperture' | 'shutter' | 'iso' | null;
}

const snapA = (n: number) => nearestStop(APERTURES, clamp(n, LIMITS.minAperture, LIMITS.maxAperture)).value;
const snapT = (t: number) => nearestStop(SHUTTERS, clamp(t, LIMITS.minShutter, LIMITS.maxShutter)).value;
const snapI = (i: number, max: number = LIMITS.maxIso) => nearestStop(ISOS, clamp(i, LIMITS.minIso, max)).value;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Resuelve los parámetros que la cámara decide en cada modo.
 * El automatismo busca que la lectura del exposímetro sea igual a la compensación elegida.
 */
export function resolveExposure(
  s: CameraSettings,
  lighting: SceneLighting,
  sensor: SensorFormat,
  lensMaxAperture: number = LIMITS.minAperture,
): ResolvedExposure {
  const target = lighting.ev100 + lighting.meteringBias[s.metering] - s.exposureComp;
  const minN = Math.max(lensMaxAperture, LIMITS.minAperture);
  const handheld = s.tripod ? LIMITS.maxShutter : handheldLimitS(s.focalMm, sensor, s.stabilizationStops);
  let aperture = s.aperture;
  let shutter = s.shutter;
  let iso = s.iso;
  let limited: ResolvedExposure['limited'] = null;

  const wantIso = (n: number, t: number) => snapI(isoFor(target, n, t), LIMITS.autoIsoMax);

  switch (s.mode) {
    case 'M': {
      if (s.autoIso) {
        const raw = isoFor(target, aperture, shutter);
        iso = wantIso(aperture, shutter);
        if (raw < LIMITS.minIso || raw > LIMITS.autoIsoMax) limited = 'iso';
      }
      break;
    }
    case 'A': {
      if (s.autoIso) {
        iso = LIMITS.minIso;
        let t = shutterFor(target, aperture, iso);
        if (t > handheld) {
          t = handheld;
          iso = wantIso(aperture, t);
          t = shutterFor(target, aperture, iso);
        }
        shutter = t;
      } else {
        shutter = shutterFor(target, aperture, iso);
      }
      if (shutter < LIMITS.minShutter || shutter > LIMITS.maxShutter) limited = 'shutter';
      shutter = snapT(shutter);
      break;
    }
    case 'S': {
      if (s.autoIso) {
        iso = LIMITS.minIso;
        let n = apertureFor(target, shutter, iso);
        if (n < minN) {
          n = minN;
          iso = wantIso(n, shutter);
          n = apertureFor(target, shutter, iso);
        }
        aperture = n;
      } else {
        aperture = apertureFor(target, shutter, iso);
      }
      if (aperture < minN - 1e-6 || aperture > LIMITS.maxAperture) limited = 'aperture';
      aperture = snapA(Math.max(aperture, minN));
      break;
    }
    case 'P': {
      // Línea de programa: primero asegura una velocidad a pulso, luego cierra hasta f/8 y después acelera.
      if (s.autoIso) iso = LIMITS.minIso;
      let t = Math.min(handheld, 1 / 60);
      let n = apertureFor(target, t, iso);
      if (n < minN) {
        n = minN;
        if (s.autoIso) {
          iso = wantIso(n, t);
        }
        t = shutterFor(target, n, iso);
      } else if (n > 8) {
        n = 8;
        t = shutterFor(target, n, iso);
        if (t < LIMITS.minShutter) {
          t = LIMITS.minShutter;
          n = apertureFor(target, t, iso);
        }
      }
      if (t > LIMITS.maxShutter || n > LIMITS.maxAperture) limited = t > LIMITS.maxShutter ? 'shutter' : 'aperture';
      aperture = snapA(n);
      shutter = snapT(t);
      break;
    }
  }
  return { aperture, shutter, iso: snapI(iso), limited };
}

/** Combinaciones equivalentes (misma exposición) a lo largo de la escala de aperturas. */
export function equivalentPairs(ev100: number, iso: number): Array<{ aperture: number; shutter: number }> {
  return APERTURES.filter((a) => a.fullStop)
    .map((a) => ({ aperture: a.value, shutter: shutterFor(ev100, a.value, iso) }))
    .filter((p) => p.shutter >= LIMITS.minShutter && p.shutter <= LIMITS.maxShutter);
}
