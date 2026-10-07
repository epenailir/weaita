import { useEffect, useRef } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { Aperture, BookOpen, Compass, Mountain, ScanSearch, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { RouteId } from '../../hooks/useHashRoute';
import { useProgress } from '../../lib/progress';

export interface NavItem {
  id: RouteId;
  label: string;
  short: string;
  icon: LucideIcon;
  description: string;
}

export const NAV: NavItem[] = [
  { id: 'inicio', label: 'Inicio', short: 'Inicio', icon: Compass, description: 'Ruta de aprendizaje' },
  { id: 'exposicion', label: 'Triángulo de exposición', short: 'Exposición', icon: Aperture, description: 'Apertura, obturación, ISO' },
  { id: 'lentes', label: 'Laboratorio de lentes', short: 'Lentes', icon: ScanSearch, description: 'Focal, perspectiva, distorsión' },
  { id: 'escenarios', label: 'Escenarios', short: 'Escenarios', icon: Mountain, description: 'Ajustes por situación' },
  { id: 'fundamentos', label: 'Fundamentos', short: 'Fundamentos', icon: BookOpen, description: 'Enfoque, modos, RAW, WB' },
  { id: 'desafios', label: 'Desafíos y quiz', short: 'Desafíos', icon: Target, description: 'Pon a prueba lo aprendido' },
];

/** Marca: el diafragma como "M" de modo manual. */
function Logo() {
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="var(--color-line-strong)" strokeWidth="1.5" />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3;
        const x1 = 16 + Math.cos(a) * 13;
        const y1 = 16 + Math.sin(a) * 13;
        const x2 = 16 + Math.cos(a + 1.25) * 5.5;
        const y2 = 16 + Math.sin(a + 1.25) * 5.5;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-muted)" strokeWidth="1.3" />;
      })}
      <circle cx="16" cy="16" r="3.2" fill="var(--color-amber)" />
    </svg>
  );
}

export function AppShell({
  route,
  onNavigate,
  totals,
  children,
}: {
  route: RouteId;
  onNavigate: (r: RouteId) => void;
  /** Totales para calcular el porcentaje de progreso. */
  totals: { challenges: number; quiz: number; scenarios: number };
  children: ReactNode;
}) {
  const p = useProgress();
  const done = p.challenges.length + p.quiz.length + p.scenarios.length;
  const total = Math.max(1, totals.challenges + totals.quiz + totals.scenarios);
  const pct = Math.min(100, Math.round((done / total) * 100));
  const mainRef = useRef<HTMLElement>(null);
  const prevRoute = useRef(route);

  // Al cambiar de ruta, lleva el foco al título de la nueva página (cargada de forma diferida)
  // para que el teclado y los lectores de pantalla continúen desde el contenido nuevo.
  useEffect(() => {
    if (prevRoute.current === route) return;
    prevRoute.current = route;
    const main = mainRef.current;
    if (!main) return;
    const focusTitle = () => {
      // Mientras Suspense carga la página nueva, la anterior sigue en el DOM oculta: se ignora.
      const h1 = Array.from(main.querySelectorAll<HTMLElement>('h1')).find((el) => el.getClientRects().length > 0);
      if (!h1) return false;
      if (!h1.hasAttribute('tabindex')) h1.tabIndex = -1;
      h1.focus({ preventScroll: true });
      return document.activeElement === h1;
    };
    if (focusTitle()) return;
    const obs = new MutationObserver(() => {
      if (focusTitle()) obs.disconnect();
    });
    obs.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    const timeout = window.setTimeout(() => obs.disconnect(), 5000);
    return () => {
      obs.disconnect();
      window.clearTimeout(timeout);
    };
  }, [route]);

  const skipToContent = (e: MouseEvent<HTMLAnchorElement>) => {
    // Sin navegación por hash: #contenido no es una ruta y cambiaría de página.
    e.preventDefault();
    const main = mainRef.current;
    if (!main) return;
    main.focus({ preventScroll: true });
    main.scrollIntoView();
  };

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <a
        href="#contenido"
        onClick={skipToContent}
        className="sr-only z-50 rounded-md bg-amber px-3 py-2 text-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Saltar al contenido
      </a>

      {/* Barra lateral (escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-ink lg:flex">
        <div className="flex items-center gap-3 px-5 pb-6 pt-6">
          <Logo />
          <div>
            <div className="text-[17px] font-semibold tracking-tight">Modo M</div>
            <div className="eyebrow !text-[10px]">Escuela de cámara manual</div>
          </div>
        </div>
        <nav aria-label="Secciones" className="flex-1 px-3">
          <ul className="flex flex-col gap-0.5">
            {NAV.map((item) => {
              const active = item.id === route;
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(item.id);
                    }}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors',
                      active ? 'bg-panel-2 text-fg shadow-[inset_0_0_0_1px_var(--color-line)]' : 'text-muted hover:bg-panel hover:text-fg',
                    )}
                  >
                    <Icon size={17} className={active ? 'text-amber' : 'text-faint group-hover:text-muted'} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-medium leading-tight">{item.label}</span>
                      <span className="block truncate text-[11.5px] text-faint">{item.description}</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="m-3 rounded-lg border border-line bg-panel p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="eyebrow">Tu progreso</span>
            <span className="osd text-sm text-amber">{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso total">
            <div className="h-full rounded-full bg-amber transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="osd mt-2 text-[11px] text-faint">
            {p.challenges.length}/{totals.challenges} desafíos · {p.quiz.length}/{totals.quiz} quiz
          </div>
        </div>
      </aside>

      {/* Barra superior (móvil y tablet) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="text-[16px] font-semibold tracking-tight">Modo M</span>
        </div>
        <span className="osd text-xs text-faint">
          Progreso <span className="text-amber">{pct}%</span>
        </span>
      </header>

      <main id="contenido" ref={mainRef} tabIndex={-1} className="pb-24 focus:outline-none lg:pb-12 lg:pl-64">
        <div className="mx-auto w-full max-w-[1320px] px-4 pt-6 sm:px-6 lg:px-10 lg:pt-10">{children}</div>
      </main>

      {/* Navegación inferior (móvil) */}
      <nav aria-label="Secciones" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 backdrop-blur lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <ul className="grid grid-cols-6">
          {NAV.map((item) => {
            const active = item.id === route;
            const Icon = item.icon;
            return (
              <li key={item.id} className="min-w-0">
                <a
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(item.id);
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={cn('flex min-w-0 flex-col items-center gap-1 px-1 py-2.5 text-[10.5px] font-medium', active ? 'text-amber' : 'text-faint')}
                >
                  <Icon size={19} aria-hidden="true" />
                  <span className="block max-w-full truncate">{item.short}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
