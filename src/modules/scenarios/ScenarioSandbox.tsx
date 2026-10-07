/**
 * Sandbox de escenarios: cinco situaciones reales (golden hour, deporte, paisaje, Vía Láctea y
 * calle) con su receta, el porqué en números del motor, experimentos para romperla y una
 * herramienta específica por escenario. Admite enlaces directos: #escenarios/astro.
 */
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { Button, SectionHeader } from '../../components/ui';
import { SCENARIOS } from '../../content/scenarios';
import type { ScenarioId } from '../../content/types';
import { useProgress } from '../../lib/progress';
import type { PageProps } from '../../App';
import type { HelpLevel } from './levels';
import { PANEL_ID, ScenarioPicker, tabId } from './ScenarioPicker';
import { ScenarioSession } from './ScenarioSession';

const PICKER_ID = 'sb-picker';

/** Escenario indicado en el hash (#escenarios/<id>), si existe. */
function scenarioFromHash(): ScenarioId | null {
  if (typeof window === 'undefined') return null;
  const sub = window.location.hash.replace(/^#/, '').split('/')[1] ?? '';
  return SCENARIOS.some((s) => s.id === sub) ? (sub as ScenarioId) : null;
}

export function ScenarioSandbox({ onNavigate }: PageProps) {
  const [id, setId] = useState<ScenarioId>(() => scenarioFromHash() ?? SCENARIOS[0]!.id);
  const [level, setLevel] = useState<HelpLevel>('full');
  const progressState = useProgress();
  const reduced = useReducedMotion() ?? false;

  // Si el hash cambia a otro escenario (enlace o edición de la URL), se sigue.
  useEffect(() => {
    const onHash = () => {
      const fromHash = scenarioFromHash();
      if (fromHash) setId(fromHash);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const index = Math.max(0, SCENARIOS.findIndex((s) => s.id === id));
  const scenario = SCENARIOS[index] ?? SCENARIOS[0]!;
  const next = SCENARIOS[(index + 1) % SCENARIOS.length] ?? SCENARIOS[0]!;

  const select = (sid: ScenarioId) => {
    setId(sid);
    // Enlace compartible sin crear entradas de historial
    window.history.replaceState(null, '', `#escenarios/${sid}`);
  };

  const goNext = () => {
    select(next.id);
    document.getElementById(PICKER_ID)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    document.getElementById(tabId(next.id))?.focus({ preventScroll: true });
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Sandbox de escenarios"
        title="Cinco situaciones reales, una receta y su porqué"
        description="Aplica la receta de un profesional, compárala con la cámara tal como sale del bolso y rómpela para entender cada número."
        actions={
          <Button variant="secondary" onClick={() => onNavigate('desafios')} icon={<ArrowRight size={15} aria-hidden="true" />}>
            Ponerme a prueba
          </Button>
        }
      />

      <div id={PICKER_ID} className="scroll-mt-20">
        <ScenarioPicker scenarios={SCENARIOS} value={scenario.id} onChange={select} explored={progressState.scenarios} />
      </div>

      <div role="tabpanel" id={PANEL_ID} aria-labelledby={tabId(scenario.id)}>
        <ScenarioSession
          key={scenario.id}
          scenario={scenario}
          index={index}
          total={SCENARIOS.length}
          level={level}
          onLevelChange={setLevel}
          onNext={goNext}
          nextName={next.name}
        />
      </div>
    </div>
  );
}
