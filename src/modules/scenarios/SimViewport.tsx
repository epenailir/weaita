/**
 * Visor del sandbox: el lienzo del simulador dentro del Viewfinder, con la comparación A/B
 * (divisor arrastrable y accesible por teclado) y el fundido del obturador al disparar.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { animate, motion } from 'framer-motion';
import { MoveHorizontal } from 'lucide-react';
import type { CameraSettings } from '../../engine';
import { Viewfinder } from '../../components/viewfinder';
import { useSimRenderer } from '../../sim';
import type { SceneId } from '../../sim/types';
import { cn } from '../../lib/cn';
import type { OsdData } from '../../components/viewfinder';

export interface CompareShot {
  url: string;
  /** Rótulo de la toma fijada (izquierda). */
  a: string;
  /** Rótulo de la toma actual (derecha). */
  b: string;
  /** Entra con un barrido de A a mitad y mitad (transición antes → después). */
  wipe: boolean;
}

export interface SimViewportProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  sceneId: SceneId;
  /** Ajustes efectivos de la cámara (los que se fotografían). */
  settings: CameraSettings;
  zebras: boolean;
  peaking: boolean;
  /** Animar los sujetos en movimiento. */
  live: boolean;
  /** Se llama tras cada cuadro dibujado (para capturar la toma A en el momento justo). */
  onFrame: () => void;
  osd: OsdData;
  warnings: string[];
  showGrid: boolean;
  canvasLabel: string;
  compare: CompareShot | null;
  flashKey: number;
  reduced: boolean;
}

function CompareOverlay({ shot, reduced }: { shot: CompareShot; reduced: boolean }) {
  // Porcentaje del ancho que ocupa la toma A (estado local: el barrido no re-renderiza la página).
  const [split, setSplit] = useState(shot.wipe && !reduced ? 100 : 50);
  // El input es invisible: el anillo de foco se dibuja en el tirador.
  const [focusRing, setFocusRing] = useState(false);
  const [dragged, setDragged] = useState(false);

  useEffect(() => {
    if (!shot.wipe || reduced || dragged) return;
    const controls = animate(100, 50, { duration: 0.75, ease: [0.25, 1, 0.5, 1], onUpdate: (v) => setSplit(v) });
    return () => controls.stop();
  }, [shot, reduced, dragged]);

  const onSplit = (v: number) => {
    setDragged(true);
    setSplit(v);
  };

  return (
    <div className="absolute inset-0">
      <img
        src={shot.url}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none"
        style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
      />
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(split)}
        onChange={(e) => onSplit(Number(e.target.value))}
        aria-label={`Comparar ${shot.a} con ${shot.b}`}
        aria-valuetext={`${Math.round(split)} % de ${shot.a} a la izquierda`}
        onFocus={(e) => setFocusRing(e.currentTarget.matches(':focus-visible'))}
        onBlur={() => setFocusRing(false)}
        className="absolute inset-0 z-10 m-0 h-full w-full cursor-ew-resize appearance-none bg-transparent opacity-0"
        style={{ touchAction: 'pan-y' }}
      />
      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${split}%` }} aria-hidden="true">
        <div className="absolute inset-y-0 w-[2px] -translate-x-1/2 bg-white/90 shadow-[0_0_8px_rgb(0_0_0/0.6)]" />
        <div
          className={cn(
            'absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/55 text-white backdrop-blur-sm',
            focusRing && 'outline-2 outline-offset-2 outline-amber',
          )}
        >
          <MoveHorizontal size={16} />
        </div>
      </div>
      <div
        className="osd pointer-events-none absolute top-[58%] flex -translate-x-full items-center pr-3 text-[11px] font-semibold text-white"
        style={{ left: `${split}%` }}
        aria-hidden="true"
      >
        <span className="rounded-xs bg-black/65 px-1.5 py-0.5 whitespace-nowrap">A · {shot.a}</span>
      </div>
      <div className="osd pointer-events-none absolute top-[58%] flex items-center pl-3 text-[11px] font-semibold text-white" style={{ left: `${split}%` }} aria-hidden="true">
        <span className="rounded-xs bg-amber px-1.5 py-0.5 whitespace-nowrap text-ink">B · {shot.b}</span>
      </div>
    </div>
  );
}

export function SimViewport({
  canvasRef,
  sceneId,
  settings,
  zebras,
  peaking,
  live,
  onFrame,
  osd,
  warnings,
  showGrid,
  canvasLabel,
  compare,
  flashKey,
  reduced,
}: SimViewportProps) {
  // El renderizado vive aquí: con la animación en vivo solo se re-renderiza el visor.
  const options = useMemo(() => ({ highlightWarning: zebras, focusPeaking: peaking, live }), [zebras, peaking, live]);
  const result = useSimRenderer(canvasRef, sceneId, settings, options);
  const frameCb = useRef(onFrame);
  useEffect(() => {
    frameCb.current = onFrame;
  });
  useEffect(() => {
    if (result) frameCb.current();
  }, [result]);
  const ready = result !== null;

  return (
    <Viewfinder osd={osd} histogram={result?.histogram ?? null} warnings={warnings} showGrid={showGrid}>
      <canvas ref={canvasRef} role="img" aria-label={canvasLabel} />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-black" aria-hidden="true">
          <span className="osd flex items-center gap-2 text-xs text-white/60">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
            Preparando la escena…
          </span>
        </div>
      )}
      {compare && <CompareOverlay key={compare.url} shot={compare} reduced={reduced} />}
      {flashKey > 0 && (
        <motion.div
          key={flashKey}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-black"
          initial={{ opacity: reduced ? 0.6 : 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.15 : 0.32, ease: 'easeOut' }}
        />
      )}
    </Viewfinder>
  );
}
