import { useEffect, useRef, useState } from 'react';

/**
 * Devuelve `text` con un retardo: así la región viva anuncia el resultado cuando el usuario
 * termina de mover un control, no en cada tercio de paso. El primer valor no se anuncia.
 */
export function useDelayedAnnouncement(text: string, delayMs = 500): string {
  const [announced, setAnnounced] = useState('');
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = window.setTimeout(() => setAnnounced(text), delayMs);
    return () => window.clearTimeout(id);
  }, [text, delayMs]);
  return announced;
}

/** Preferencia de movimiento reducido leída una vez (para valores iniciales de estado). */
export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
