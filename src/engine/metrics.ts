/**
 * Métricas de una toma: une exposición, óptica y ruido en un solo objeto medible.
 * Son la fuente de verdad del visor, de las explicaciones y de la validación de desafíos.
 */
import { exposureOffset, exposureState, meterReading, settingsEV100 } from './exposure';
import { airyDiskMm, blurDiscFraction, depthOfField, fieldOfView, motionBlurPx, rule500S, shakeBlurPx, shakeRatio, SENSORS } from './optics';
import { dynamicRangeStops, noiseScore } from './noise';
import type { CameraSettings, MetricKey, MetricTarget, SceneLighting, ShotMetrics } from './types';

/** Ancho de referencia (px) con el que se expresan los desenfoques en los desafíos. */
export const REFERENCE_WIDTH_PX = 1000;

export function computeMetrics(s: CameraSettings, lighting: SceneLighting, imageWidthPx = REFERENCE_WIDTH_PX): ShotMetrics {
  const sensor = SENSORS[s.sensor];
  const offset = exposureOffset(lighting.ev100, s.aperture, s.shutter, s.iso);
  const meter = meterReading(offset, s.metering, lighting);
  const dof = depthOfField(s.focalMm, s.aperture, s.focusM, sensor.cocMm);
  const bg = blurDiscFraction(s.focalMm, s.aperture, s.focusM, lighting.backgroundDistanceM, sensor);
  const fg = lighting.foregroundDistanceM
    ? blurDiscFraction(s.focalMm, s.aperture, s.focusM, lighting.foregroundDistanceM, sensor)
    : 0;
  const maxStar = rule500S(s.focalMm, sensor);
  return {
    settingsEV100: settingsEV100(s.aperture, s.shutter, s.iso),
    sceneEV100: lighting.ev100,
    exposureOffset: offset,
    meterReading: meter,
    exposureError: Math.abs(offset),
    exposureState: exposureState(offset),
    subjectMotionBlurPx: motionBlurPx(lighting.subjectSpeedMS, lighting.subjectDistanceM, s.focalMm, s.shutter, sensor, imageWidthPx),
    backgroundBlurPct: bg * 100,
    foregroundBlurPct: fg * 100,
    diffractionPct: (airyDiskMm(s.aperture) / sensor.widthMm) * 100,
    dofNearM: dof.nearM,
    dofFarM: dof.farM,
    hyperfocalM: dof.hyperfocalM,
    shakeRatio: shakeRatio(s.shutter, s.focalMm, sensor, s.stabilizationStops, s.tripod),
    shakeBlurPx: shakeBlurPx(s.shutter, s.focalMm, sensor, imageWidthPx, s.stabilizationStops, s.tripod),
    starTrailRatio: lighting.hasStars ? s.shutter / maxStar : 0,
    maxStarExposureS: maxStar,
    noiseScore: noiseScore(s.iso),
    dynamicRangeStops: dynamicRangeStops(s.iso),
    fovHorizontalDeg: fieldOfView(s.focalMm, sensor).h,
    aperture: s.aperture,
    shutterSeconds: s.shutter,
    iso: s.iso,
    focalMm: s.focalMm,
  };
}

export function metricValue(m: ShotMetrics, key: MetricKey): number {
  return m[key];
}

export interface TargetResult extends MetricTarget {
  actual: number;
  pass: boolean;
}

export function evaluateTargets(targets: MetricTarget[], m: ShotMetrics): TargetResult[] {
  return targets.map((t) => {
    const actual = metricValue(m, t.metric);
    const pass = t.op === '<=' ? actual <= t.value + 1e-9 : actual >= t.value - 1e-9;
    return { ...t, actual, pass };
  });
}
