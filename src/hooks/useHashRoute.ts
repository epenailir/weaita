import { useCallback, useEffect, useState } from 'react';

export const ROUTES = ['inicio', 'exposicion', 'lentes', 'escenarios', 'fundamentos', 'desafios'] as const;
export type RouteId = (typeof ROUTES)[number];

/** Devuelve la ruta del hash o null si el hash no es una ruta (p. ej. un ancla interna como #contenido). */
function parse(hash: string): RouteId | null {
  const h = hash.replace(/^#/, '').split(/[/?]/)[0] ?? '';
  if (h === '') return 'inicio';
  return (ROUTES as readonly string[]).includes(h) ? (h as RouteId) : null;
}

/** Enrutado mínimo por hash con tokens simples (#exposicion), compatible con hosting estático. */
export function useHashRoute(): [RouteId, (r: RouteId) => void] {
  const [route, setRoute] = useState<RouteId>(() => parse(window.location.hash) ?? 'inicio');
  useEffect(() => {
    // Los hashes que no son rutas (anclas internas) conservan la ruta actual.
    const on = () => {
      const next = parse(window.location.hash);
      if (next) setRoute(next);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const navigate = useCallback((r: RouteId) => {
    // Misma ruta sin subruta: nada que hacer. Con subruta (#desafios/c03) se vuelve a la raíz.
    const raw = window.location.hash.replace(/^#/, '');
    if (raw === r || (r === 'inicio' && raw === '')) return;
    window.location.hash = r;
    window.scrollTo({ top: 0 });
  }, []);
  return [route, navigate];
}
