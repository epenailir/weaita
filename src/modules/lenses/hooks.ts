import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Lleva un número hacia su objetivo con requestAnimationFrame (curva ease-out).
 * Con `log` interpola en escala logarítmica, que es como se perciben focales y distancias.
 * Respeta prefers-reduced-motion: en ese caso salta directamente al valor final.
 */
export function useSmoothNumber(target: number, { log = false, duration = 360 }: { log?: boolean; duration?: number } = {}): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const from = current.current;
    if (reduced || from === target || !Number.isFinite(from) || (log && (from <= 0 || target <= 0))) {
      current.current = target;
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      const v = log ? from * Math.pow(target / from, e) : from + (target - from) * e;
      current.current = t >= 1 ? target : v;
      setValue(current.current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced, log, duration]);

  return value;
}

export interface ElementSize {
  width: number;
  height: number;
  dpr: number;
}

/** Tamaño CSS de un elemento (ResizeObserver) y la densidad de píxeles actual. */
export function useElementSize<T extends HTMLElement>(): [RefObject<T | null>, ElementSize] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0, dpr: 1 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      setSize((s) => (s.width === r.width && s.height === r.height && s.dpr === dpr ? s : { width: r.width, height: r.height, dpr }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // Cambios de densidad (zoom del navegador, mover la ventana a otra pantalla)
    let mq: MediaQueryList | null = null;
    const listenDpr = () => {
      mq?.removeEventListener('change', onDpr);
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      mq.addEventListener('change', onDpr);
    };
    function onDpr() {
      update();
      listenDpr();
    }
    listenDpr();
    return () => {
      ro.disconnect();
      mq?.removeEventListener('change', onDpr);
    };
  }, []);

  return [ref, size];
}
