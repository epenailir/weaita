/** Retos técnicos, paso a paso y errores comunes del escenario, en paneles compactos. */
import { CircleMinus, ListOrdered, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Scenario } from '../../content/types';

function NotePanel({ icon, eyebrow, title, children }: { icon: ReactNode; eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="surface min-w-0 p-5">
      <header className="mb-3.5 flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-panel-2" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="eyebrow mb-1">{eyebrow}</div>
          <h3 className="text-[15px] font-semibold text-fg">{title}</h3>
        </div>
      </header>
      {children}
    </section>
  );
}

export function ScenarioNotes({ scenario }: { scenario: Scenario }) {
  return (
    <section aria-labelledby="sb-notes-title" className="border-t border-line pt-8">
      <div className="eyebrow mb-2">En el campo</div>
      <h2 id="sb-notes-title" className="text-xl font-semibold md:text-2xl">
        Retos, pasos y errores comunes
      </h2>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <NotePanel icon={<TriangleAlert size={15} className="text-amber" />} eyebrow="Lo difícil" title="Retos técnicos">
          <ul className="m-0 list-none space-y-2 p-0">
            {scenario.challenges.map((c) => (
              <li key={c} className="relative pl-4 text-[13.5px] leading-snug text-muted before:absolute before:left-0 before:top-[0.55em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-amber/70">
                {c}
              </li>
            ))}
          </ul>
        </NotePanel>
        <NotePanel icon={<ListOrdered size={15} className="text-data" />} eyebrow="Paso a paso" title="Secuencia de trabajo">
          <ol className="m-0 list-none space-y-2 p-0">
            {scenario.steps.map((s, i) => (
              <li key={s} className="flex gap-2.5 text-[13.5px] leading-snug text-muted">
                <span className="osd mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-xs border border-line-strong text-[11px] text-fg">{i + 1}</span>
                <span className="min-w-0">{s}</span>
              </li>
            ))}
          </ol>
        </NotePanel>
        <NotePanel icon={<CircleMinus size={15} className="text-danger" />} eyebrow="Evítalos" title="Errores comunes">
          <ul className="m-0 list-none space-y-2 p-0">
            {scenario.mistakes.map((m) => (
              <li key={m} className="flex gap-2 text-[13.5px] leading-snug text-muted">
                <CircleMinus size={14} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
                <span className="min-w-0">{m}</span>
              </li>
            ))}
          </ul>
        </NotePanel>
      </div>
    </section>
  );
}
