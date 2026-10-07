import { useCallback, useEffect, useState } from 'react';

export const ROUTES = ['inicio', 'exposicion', 'lentes', 'escenarios', 'fundamentos', 'desafios'] as const;
export type RouteId = (typeof ROUTES)[number];

function parse(hash: string): RouteId {
  const h = hash.replace(/^#/, '').split(/[/?]/)[0] ?? '';
  return (ROUTES as readonly string[]).includes(h) ? (h as RouteId) : 'inicio';
}

/** Enrutado mínimo por hash con tokens simples (#exposicion), compatible con hosting estático. */
export function useHashRoute(): [RouteId, (r: RouteId) => void] {
  const [route, setRoute] = useState<RouteId>(() => parse(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const navigate = useCallback((r: RouteId) => {
    if (parse(window.location.hash) === r) return;
    window.location.hash = r;
    window.scrollTo({ top: 0 });
  }, []);
  return [route, navigate];
}
