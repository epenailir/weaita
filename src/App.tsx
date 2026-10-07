import { Suspense, lazy, useEffect } from 'react';
import { AppShell, NAV } from './components/layout/AppShell';
import { useHashRoute } from './hooks/useHashRoute';
import type { RouteId } from './hooks/useHashRoute';
import { CHALLENGES } from './content/challenges';
import { QUIZ } from './content/quiz';
import { SCENARIOS } from './content/scenarios';

export interface PageProps {
  onNavigate: (route: RouteId) => void;
}

const HomePage = lazy(() => import('./modules/home/HomePage').then((m) => ({ default: m.HomePage })));
const ExposureLab = lazy(() => import('./modules/exposure/ExposureLab').then((m) => ({ default: m.ExposureLab })));
const LensLab = lazy(() => import('./modules/lenses/LensLab').then((m) => ({ default: m.LensLab })));
const ScenarioSandbox = lazy(() => import('./modules/scenarios/ScenarioSandbox').then((m) => ({ default: m.ScenarioSandbox })));
const Fundamentals = lazy(() => import('./modules/fundamentals/Fundamentals').then((m) => ({ default: m.Fundamentals })));
const Challenges = lazy(() => import('./modules/challenges/Challenges').then((m) => ({ default: m.Challenges })));

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <div className="osd flex items-center gap-3 text-sm text-faint">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber" aria-hidden="true" />
        Cargando módulo…
      </div>
    </div>
  );
}

export default function App() {
  const [route, navigate] = useHashRoute();

  useEffect(() => {
    const item = NAV.find((n) => n.id === route);
    document.title = item && item.id !== 'inicio' ? `${item.label} · Modo M` : 'Modo M · Escuela de cámara manual';
  }, [route]);

  return (
    <AppShell
      route={route}
      onNavigate={navigate}
      totals={{ challenges: CHALLENGES.length, quiz: QUIZ.length, scenarios: SCENARIOS.length }}
    >
      <Suspense fallback={<PageFallback />}>
        {route === 'inicio' && <HomePage onNavigate={navigate} />}
        {route === 'exposicion' && <ExposureLab onNavigate={navigate} />}
        {route === 'lentes' && <LensLab onNavigate={navigate} />}
        {route === 'escenarios' && <ScenarioSandbox onNavigate={navigate} />}
        {route === 'fundamentos' && <Fundamentals onNavigate={navigate} />}
        {route === 'desafios' && <Challenges onNavigate={navigate} />}
      </Suspense>
    </AppShell>
  );
}
