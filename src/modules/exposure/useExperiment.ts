/**
 * Ejecuta un experimento de dos pasos sobre la cámara del laboratorio: aplica el "antes",
 * espera el cuadro renderizado que corresponde a esos ajustes, lo congela, aplica el "después"
 * y vuelve a capturar. Guarda los ajustes previos para poder restaurarlos.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { CameraSettings, Histogram, ShotMetrics } from '../../engine';
import type { UseCamera } from '../../state/useCamera';
import { SCENES } from '../../sim/scenes';
import type { RenderResult, SceneId } from '../../sim/types';
import { cloneHistogram, frameMatches, snapshotCanvas } from './capture';
import type { Experiment } from './experiments';

export interface Capture {
  image: string;
  label: string;
  sceneId: SceneId;
  effective: CameraSettings;
  metrics: ShotMetrics;
  histogram: Histogram | null;
}

export interface ExperimentRun {
  id: string;
  phase: 'before' | 'after' | 'done';
  before: Capture | null;
  after: Capture | null;
  /** Hay ajustes previos guardados que se pueden restaurar. */
  restorable: boolean;
}

export interface LabHandle {
  sceneId: SceneId;
  cam: UseCamera;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  frameRef: RefObject<RenderResult | null>;
  /** Ajustes base al entrar a otra escena (conserva el equipo del usuario). */
  baseFor: (id: SceneId) => CameraSettings;
  /** Cambia de escena y deja la cámara con los ajustes dados. */
  switchScene: (id: SceneId, settings: CameraSettings) => void;
}

interface Pending {
  id: string;
  phase: 'before' | 'after';
  afterPatch: Partial<CameraSettings>;
  labels: [string, string];
}

/** Si el cuadro esperado no llega (p. ej. el ajuste no altera la imagen), se captura igual. */
const FALLBACK_MS = 1800;

export function useExperimentRunner(lab: LabHandle) {
  const [run, setRun] = useState<ExperimentRun | null>(null);
  const labRef = useRef(lab);
  const pending = useRef<Pending | null>(null);
  const restorePoint = useRef<{ sceneId: SceneId; settings: CameraSettings } | null>(null);

  useLayoutEffect(() => {
    labRef.current = lab;
  });

  const capture = useCallback((label: string): Capture | null => {
    const { canvasRef, frameRef, cam, sceneId } = labRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const image = snapshotCanvas(canvas, { maxWidth: 720, quality: 0.85 });
    if (!image) return null;
    const frame = frameRef.current;
    return {
      image,
      label,
      sceneId,
      effective: cam.effective,
      metrics: cam.metrics,
      histogram: frame ? cloneHistogram(frame.histogram) : null,
    };
  }, []);

  /** Revisa si el último cuadro corresponde al paso pendiente y, si es así, lo captura. */
  const check = useCallback(
    (force = false) => {
      const p = pending.current;
      if (!p) return;
      const { frameRef, cam } = labRef.current;
      const frame = frameRef.current;
      if (!force && (!frame || !frameMatches(frame.metrics, cam.metrics))) return;
      const shot = capture(p.phase === 'before' ? p.labels[0] : p.labels[1]);
      if (!shot) return;
      if (p.phase === 'before') {
        pending.current = { ...p, phase: 'after' };
        cam.set(p.afterPatch);
        setRun((r) => (r && r.id === p.id ? { ...r, phase: 'after', before: shot } : r));
      } else {
        pending.current = null;
        setRun((r) => (r && r.id === p.id ? { ...r, phase: 'done', after: shot } : r));
      }
    },
    [capture],
  );

  const start = useCallback((exp: Experiment) => {
    const { sceneId, cam, baseFor, switchScene } = labRef.current;
    const targetId = exp.sceneId ?? sceneId;
    const scene = SCENES[targetId];
    // El punto de restauración es el de antes del primer experimento encadenado.
    restorePoint.current ??= { sceneId, settings: cam.settings };
    const base = targetId === sceneId ? cam.settings : baseFor(targetId);
    const beforePatch = exp.before.patch({ scene, settings: base });
    const afterPatch = exp.after.patch({ scene, settings: { ...base, ...beforePatch } });
    if (targetId !== sceneId) switchScene(targetId, base);
    cam.set(beforePatch);
    pending.current = { id: exp.id, phase: 'before', afterPatch, labels: [exp.before.label, exp.after.label] };
    setRun({ id: exp.id, phase: 'before', before: null, after: null, restorable: true });
  }, []);

  const restore = useCallback(() => {
    const point = restorePoint.current;
    if (!point) return;
    const { sceneId, cam, switchScene } = labRef.current;
    pending.current = null;
    restorePoint.current = null;
    if (point.sceneId !== sceneId) switchScene(point.sceneId, point.settings);
    else cam.reset(point.settings);
    setRun((r) => (r ? { ...r, phase: 'done', restorable: false } : r));
  }, []);

  /** El usuario tomó otro rumbo (cambió de escena a mano): se descarta el punto de restauración. */
  const forget = useCallback(() => {
    pending.current = null;
    restorePoint.current = null;
    setRun((r) => (r ? { ...r, phase: 'done', restorable: false } : r));
  }, []);

  // Al cambiar de fase, el cuadro vigente puede ya corresponder al paso; si no, se espera.
  const phase = run?.phase;
  useEffect(() => {
    if (phase !== 'before' && phase !== 'after') return;
    check();
    const id = window.setTimeout(() => check(true), FALLBACK_MS);
    return () => window.clearTimeout(id);
  }, [phase, check]);

  return { run, start, restore, forget, check };
}
