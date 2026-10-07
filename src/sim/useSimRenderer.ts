/**
 * Hook de React que conecta un <canvas> con el motor de simulación de imagen.
 *
 * - Crea el SimRenderer al montar y lo libera al desmontar.
 * - Observa el tamaño CSS del canvas (ResizeObserver) y la densidad de píxeles.
 * - Vuelve a revelar la foto cuando cambian escena, ajustes u opciones, coalesciendo los cambios
 *   en un único cuadro con requestAnimationFrame.
 * - Con `live: true` anima los sujetos en movimiento a ~24 fps; se pausa si la pestaña no es
 *   visible, si el canvas está fuera de pantalla o si el usuario prefiere movimiento reducido.
 *
 * El canvas debe tener tamaño CSS propio (p. ej. `className="h-full w-full"`): el hook ajusta
 * la resolución interna del lienzo, no su tamaño en la página.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { CameraSettings } from '../engine/types';
import { SimRenderer } from './renderer';
import type { RenderResult, SceneId } from './types';

export interface UseSimRendererOptions {
  /** Zebras sobre las altas luces quemadas. */
  highlightWarning?: boolean;
  /** Contornos rojos sobre lo que está dentro de la profundidad de campo. */
  focusPeaking?: boolean;
  /** Anima los sujetos en movimiento (vista en vivo). */
  live?: boolean;
}

const LIVE_FRAME_MS = 1000 / 24;
/** En vivo, el resultado (histograma, métricas) se publica a ~6 Hz para no saturar React. */
const LIVE_RESULT_MS = 160;

interface Latest {
  sceneId: SceneId;
  settings: CameraSettings;
  highlightWarning: boolean;
  focusPeaking: boolean;
  live: boolean;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useSimRenderer(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  sceneId: SceneId,
  settings: CameraSettings,
  options?: UseSimRendererOptions,
): RenderResult | null {
  const [result, setResult] = useState<RenderResult | null>(null);
  const latest = useRef<Latest>({
    sceneId,
    settings,
    highlightWarning: options?.highlightWarning ?? false,
    focusPeaking: options?.focusPeaking ?? false,
    live: options?.live ?? false,
  });
  const rendererRef = useRef<SimRenderer | null>(null);
  const sized = useRef(false);
  const onScreen = useRef(true);
  const reducedMotion = useRef(false);
  const frameRaf = useRef(0);
  const liveRaf = useRef(0);
  const liveStart = useRef(0);
  const lastLiveFrame = useRef(0);
  const lastPublish = useRef(0);
  const timeS = useRef(0);
  const appliedScene = useRef<SceneId | null>(null);
  const control = useRef<{ schedule: () => void; syncLive: () => void } | null>(null);

  // Ajustes vigentes (se leen desde los callbacks de animación).
  useLayoutEffect(() => {
    latest.current = {
      sceneId,
      settings,
      highlightWarning: options?.highlightWarning ?? false,
      focusPeaking: options?.focusPeaking ?? false,
      live: options?.live ?? false,
    };
  });

  // Conexión con el canvas al montar (si aún no existe, se espera unos cuadros a que aparezca).
  useEffect(() => {
    let disconnect: (() => void) | null = null;
    let attempts = 0;
    let pollRaf = 0;

    const connect = (canvas: HTMLCanvasElement): (() => void) => {
      const renderer = new SimRenderer(canvas);
      rendererRef.current = renderer;
      appliedScene.current = null;
      sized.current = false;
      reducedMotion.current = prefersReducedMotion();

      const liveActive = () => latest.current.live && !reducedMotion.current && onScreen.current && !document.hidden;

      const renderNow = (live: boolean) => {
        const r = rendererRef.current;
        if (!r || !sized.current) return;
        const st = latest.current;
        if (appliedScene.current !== st.sceneId) {
          r.setScene(st.sceneId);
          appliedScene.current = st.sceneId;
        }
        const res = r.render(st.settings, {
          timeS: live ? timeS.current : 0,
          highlightWarning: st.highlightWarning,
          focusPeaking: st.focusPeaking,
        });
        const now = performance.now();
        if (!live || now - lastPublish.current >= LIVE_RESULT_MS) {
          lastPublish.current = now;
          setResult(res);
        }
      };

      const schedule = () => {
        // En vivo el bucle ya revela cada cuadro con los ajustes más recientes.
        if (liveRaf.current || frameRaf.current) return;
        frameRaf.current = requestAnimationFrame(() => {
          frameRaf.current = 0;
          renderNow(false);
        });
      };

      const tick = (now: number) => {
        liveRaf.current = 0;
        if (!liveActive()) {
          schedule();
          return;
        }
        if (now - lastLiveFrame.current >= LIVE_FRAME_MS - 2) {
          lastLiveFrame.current = now;
          timeS.current = (now - liveStart.current) / 1000;
          renderNow(true);
        }
        liveRaf.current = requestAnimationFrame(tick);
      };

      const syncLive = () => {
        if (liveActive()) {
          if (!liveRaf.current) {
            // Reanuda desde el último instante mostrado (sin saltos tras una pausa).
            liveStart.current = performance.now() - timeS.current * 1000;
            lastLiveFrame.current = 0;
            if (frameRaf.current) {
              cancelAnimationFrame(frameRaf.current);
              frameRaf.current = 0;
            }
            liveRaf.current = requestAnimationFrame(tick);
          }
        } else if (liveRaf.current) {
          cancelAnimationFrame(liveRaf.current);
          liveRaf.current = 0;
          schedule();
        }
      };
      control.current = { schedule, syncLive };

      const ro = new ResizeObserver((entries) => {
        const e = entries[entries.length - 1];
        if (!e) return;
        const w = e.contentRect.width;
        const h = e.contentRect.height;
        sized.current = w >= 2 && h >= 2;
        renderer.resize(w, h, window.devicePixelRatio || 1);
        schedule();
      });
      ro.observe(canvas);

      let io: IntersectionObserver | null = null;
      if (typeof IntersectionObserver !== 'undefined') {
        io = new IntersectionObserver((entries) => {
          const e = entries[entries.length - 1];
          if (!e) return;
          onScreen.current = e.isIntersecting;
          syncLive();
        });
        io.observe(canvas);
      }
      const onVisibility = () => syncLive();
      document.addEventListener('visibilitychange', onVisibility);
      const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
      const onMotionPref = () => {
        reducedMotion.current = mq?.matches ?? false;
        syncLive();
      };
      mq?.addEventListener('change', onMotionPref);

      syncLive();
      schedule();

      return () => {
        ro.disconnect();
        io?.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        mq?.removeEventListener('change', onMotionPref);
        if (frameRaf.current) cancelAnimationFrame(frameRaf.current);
        if (liveRaf.current) cancelAnimationFrame(liveRaf.current);
        frameRaf.current = 0;
        liveRaf.current = 0;
        control.current = null;
        renderer.dispose();
        if (rendererRef.current === renderer) rendererRef.current = null;
      };
    };

    const attach = () => {
      pollRaf = 0;
      const canvas = canvasRef.current;
      if (canvas) disconnect = connect(canvas);
      else if (attempts++ < 120) pollRaf = requestAnimationFrame(attach);
    };
    attach();

    return () => {
      if (pollRaf) cancelAnimationFrame(pollRaf);
      disconnect?.();
    };
  }, [canvasRef]);

  // Cambios de escena, ajustes u opciones: un solo cuadro por fotograma de pantalla.
  const settingsKey = JSON.stringify(settings);
  const optionsKey = `${options?.highlightWarning ? 1 : 0}${options?.focusPeaking ? 1 : 0}`;
  const live = options?.live ?? false;
  useEffect(() => {
    control.current?.schedule();
  }, [sceneId, settingsKey, optionsKey]);
  useEffect(() => {
    control.current?.syncLive();
  }, [live]);

  return result;
}
