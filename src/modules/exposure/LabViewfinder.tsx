/**
 * Visor del laboratorio: monta el lienzo del simulador dentro del <Viewfinder>, con OSD,
 * histograma en vivo, avisos derivados de las métricas, punto AF, nivel electrónico y la
 * cortinilla del obturador al disparar. Es el único componente que se vuelve a dibujar en
 * cada cuadro de la vista en vivo; el resto de la página recibe los cuadros por `onFrame`.
 */
import { memo, useEffect, useMemo } from 'react';
import type { RefObject } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { formatAperture, formatIso } from '../../engine';
import { Viewfinder, buildOsd } from '../../components/viewfinder';
import type { UseCamera } from '../../state/useCamera';
import { useSimRenderer } from '../../sim';
import type { RenderResult, SceneId, SimScene } from '../../sim/types';
import { evText, grade, shutterText } from './assessment';
import type { ShotContext } from './assessment';
import { coverScale } from './capture';
import { viewfinderWarnings } from './diagnosis';
import type { SceneBrief } from './sceneBriefs';

export interface LabViewfinderProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  sceneId: SceneId;
  scene: SimScene;
  brief: SceneBrief;
  cam: UseCamera;
  live: boolean;
  zebras: boolean;
  peaking: boolean;
  grid: boolean;
  level: boolean;
  rollDeg: number;
  /** Cambia en cada disparo para animar la cortinilla. */
  shutterKey: number;
  onFrame: (frame: RenderResult) => void;
}

/** % de luces quemadas redondeado para que los avisos no parpadeen entre cuadros. */
const quantize = (p: number) => Math.round(p * 2) / 2;

function LabViewfinderImpl({
  canvasRef,
  sceneId,
  scene,
  brief,
  cam,
  live,
  zebras,
  peaking,
  grid,
  level,
  rollDeg,
  shutterKey,
  onFrame,
}: LabViewfinderProps) {
  const reduce = useReducedMotion();
  const options = useMemo(() => ({ highlightWarning: zebras, focusPeaking: peaking, live }), [zebras, peaking, live]);
  const result = useSimRenderer(canvasRef, sceneId, cam.effective, options);

  useEffect(() => {
    if (result) onFrame(result);
  }, [result, onFrame]);

  const { settings, effective, resolved, metrics } = cam;
  const osd = useMemo(() => buildOsd({ settings, effective, resolved, metrics, set: cam.set, step: cam.step, reset: cam.reset }), [settings, effective, resolved, metrics, cam.set, cam.step, cam.reset]);

  const clip = result ? quantize(result.histogram.clippedHighlightsPct) : null;
  const warningsKey = useMemo(() => {
    const ctx: ShotContext = { scene, brief, settings, effective, metrics, limited: resolved.limited, highlightsPct: clip, rollDeg };
    return viewfinderWarnings(ctx, grade(ctx)).join('\n');
  }, [scene, brief, settings, effective, metrics, resolved.limited, clip, rollDeg]);
  const warnings = useMemo(() => (warningsKey ? warningsKey.split('\n') : []), [warningsKey]);

  const subjectIn = metrics.dofNearM <= scene.lighting.subjectDistanceM && metrics.dofFarM >= scene.lighting.subjectDistanceM;
  const afPoint = settings.af === 'MF' ? null : { ...brief.afPoint, locked: subjectIn };

  const exposureWord = metrics.exposureState === 'ok' ? 'exposición correcta' : metrics.exposureState === 'over' ? 'sobreexpuesta' : 'subexpuesta';
  const canvasLabel = `Imagen simulada de «${scene.name}» con ${formatAperture(effective.aperture)}, ${shutterText(effective.shutter)} e ISO ${formatIso(effective.iso)}: ${exposureWord} (${evText(metrics.exposureOffset)}).`;
  const tilt = Math.abs(rollDeg) > 0.01 ? `rotate(${-rollDeg}deg) scale(${coverScale(rollDeg, 3 / 2)})` : undefined;

  return (
    <Viewfinder
      osd={osd}
      showGrid={grid}
      levelRollDeg={level ? rollDeg : null}
      histogram={result?.histogram ?? null}
      warnings={warnings}
      afPoint={afPoint}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={canvasLabel}
        style={{ transform: tilt, transition: reduce ? undefined : 'transform 160ms ease-out' }}
      />
      {!result && (
        <div className="osd absolute inset-0 flex items-center justify-center gap-2 bg-black/60 text-[13px] text-white/80" aria-hidden="true">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber" />
          Encendiendo el visor…
        </div>
      )}
      <AnimatePresence>
        {shutterKey > 0 && (
          <motion.div
            key={shutterKey}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-black"
            initial={{ opacity: reduce ? 0.6 : 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.12 : 0.32, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
    </Viewfinder>
  );
}

export const LabViewfinder = memo(LabViewfinderImpl);
