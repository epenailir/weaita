/**
 * Estado de la cámara virtual. Aplica los modos semiautomáticos (A, S, P, Auto-ISO) con el
 * motor de exposición, de modo que lo que el usuario no controla lo decide "la cámara".
 */
import { useCallback, useMemo, useReducer } from 'react';
import {
  APERTURES,
  ISOS,
  LIMITS,
  SENSORS,
  SHUTTERS,
  computeMetrics,
  nearestStop,
  resolveExposure,
  stepStop,
} from '../engine';
import type { CameraSettings, ResolvedExposure, SceneLighting, ShotMetrics } from '../engine';

export const DEFAULT_SETTINGS: CameraSettings = {
  mode: 'M',
  aperture: Math.pow(2, 4 / 2),
  shutter: 1 / 256,
  iso: 200,
  autoIso: false,
  exposureComp: 0,
  focalMm: 50,
  focusM: 6,
  wbK: 5500,
  af: 'AF-S',
  metering: 'matrix',
  format: 'RAW',
  sensor: 'ff',
  stabilizationStops: 0,
  tripod: false,
};

export type CameraAction =
  | { type: 'set'; patch: Partial<CameraSettings> }
  | { type: 'step'; param: 'aperture' | 'shutter' | 'iso'; thirds: number }
  | { type: 'reset'; settings: CameraSettings };

function reducer(state: CameraSettings, action: CameraAction): CameraSettings {
  switch (action.type) {
    case 'set': {
      const next = { ...state, ...action.patch };
      if (action.patch.aperture !== undefined) next.aperture = nearestStop(APERTURES, action.patch.aperture).value;
      if (action.patch.shutter !== undefined) next.shutter = nearestStop(SHUTTERS, action.patch.shutter).value;
      if (action.patch.iso !== undefined) next.iso = nearestStop(ISOS, action.patch.iso).value;
      if (action.patch.exposureComp !== undefined) next.exposureComp = Math.max(-3, Math.min(3, Math.round(action.patch.exposureComp * 3) / 3));
      if (action.patch.focusM !== undefined) next.focusM = Math.max(0.2, action.patch.focusM);
      return next;
    }
    case 'step': {
      const scale = action.param === 'aperture' ? APERTURES : action.param === 'shutter' ? SHUTTERS : ISOS;
      return { ...state, [action.param]: stepStop(scale, state[action.param], action.thirds).value };
    }
    case 'reset':
      return { ...action.settings };
  }
}

/** Qué parámetros decide la cámara en cada modo (para bloquear o atenuar sus controles). */
export function autoControlled(s: Pick<CameraSettings, 'mode' | 'autoIso'>): { aperture: boolean; shutter: boolean; iso: boolean } {
  return {
    aperture: s.mode === 'S' || s.mode === 'P',
    shutter: s.mode === 'A' || s.mode === 'P',
    iso: s.autoIso,
  };
}

export interface UseCamera {
  /** Ajustes tal como los eligió el usuario. */
  settings: CameraSettings;
  /** Ajustes efectivos tras aplicar el automatismo del modo (los que se usan para la foto). */
  effective: CameraSettings;
  resolved: ResolvedExposure;
  metrics: ShotMetrics;
  set: (patch: Partial<CameraSettings>) => void;
  step: (param: 'aperture' | 'shutter' | 'iso', thirds: number) => void;
  reset: (settings?: Partial<CameraSettings>) => void;
}

/**
 * Hook principal de la cámara virtual.
 * @param lighting Escena a medir.
 * @param initial  Ajustes iniciales (se mezclan con los valores por defecto).
 * @param lensMaxAperture Apertura máxima del objetivo (p. ej. 4 para un zoom f/4).
 */
export function useCamera(lighting: SceneLighting, initial?: Partial<CameraSettings>, lensMaxAperture: number = LIMITS.minAperture): UseCamera {
  const [settings, dispatch] = useReducer(reducer, { ...DEFAULT_SETTINGS, ...initial });

  const resolved = useMemo(
    () => resolveExposure(settings, lighting, SENSORS[settings.sensor], lensMaxAperture),
    [settings, lighting, lensMaxAperture],
  );
  const effective = useMemo<CameraSettings>(
    () => ({ ...settings, aperture: resolved.aperture, shutter: resolved.shutter, iso: resolved.iso }),
    [settings, resolved],
  );
  const metrics = useMemo(() => computeMetrics(effective, lighting), [effective, lighting]);

  const set = useCallback((patch: Partial<CameraSettings>) => dispatch({ type: 'set', patch }), []);
  const step = useCallback((param: 'aperture' | 'shutter' | 'iso', thirds: number) => dispatch({ type: 'step', param, thirds }), []);
  const reset = useCallback((s?: Partial<CameraSettings>) => dispatch({ type: 'reset', settings: { ...DEFAULT_SETTINGS, ...s } }), []);

  return { settings, effective, resolved, metrics, set, step, reset };
}
