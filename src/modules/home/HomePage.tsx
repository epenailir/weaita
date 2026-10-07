import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Aperture, ArrowRight, BookOpen, ExternalLink, Mountain, ScanSearch, Search, Target, Timer, Gauge } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { equivalentPairs, formatAperture, formatShutter } from '../../engine';
import { Badge, Button, Panel, Segmented } from '../../components/ui';
import { CURRICULUM } from '../../content/curriculum';
import { CHALLENGES } from '../../content/challenges';
import { QUIZ } from '../../content/quiz';
import { GLOSSARY } from '../../content/glossary';
import { SOURCES } from '../../content/sources';
import { SCENE_LIST } from '../../sim/scenes';
import type { Level } from '../../content/types';
import { useProgress } from '../../lib/progress';
import type { RouteId } from '../../hooks/useHashRoute';
import type { PageProps } from '../../App';
import { TriangleHero } from './TriangleHero';

const LEVEL_ROUTE: Record<Level, RouteId> = {
  Cero: 'exposicion',
  Básico: 'exposicion',
  Intermedio: 'lentes',
  Avanzado: 'escenarios',
};

const MODULES: Array<{ id: RouteId; icon: LucideIcon; title: string; text: string; tag: string }> = [
  { id: 'exposicion', icon: Aperture, title: 'Triángulo de exposición', text: 'Mueve apertura, velocidad e ISO sobre una imagen simulada con bokeh, barrido de movimiento, ruido e histograma en vivo.', tag: 'Simulador' },
  { id: 'lentes', icon: ScanSearch, title: 'Laboratorio de lentes', text: 'Compara de 14 a 400 mm: ángulo de visión, compresión de perspectiva, distorsión, macro y zooms de apertura variable.', tag: 'Óptica' },
  { id: 'escenarios', icon: Mountain, title: 'Escenarios reales', text: 'Hora dorada, deporte, paisaje, Vía Láctea y calle: la receta óptima, por qué funciona y qué pasa si la rompes.', tag: 'Práctica' },
  { id: 'fundamentos', icon: BookOpen, title: 'Fundamentos', text: 'AF-S, AF-C y enfoque manual con focus peaking, modos P/A/S/M, RAW vs. JPEG y balance de blancos en Kelvin.', tag: 'Base' },
  { id: 'desafios', icon: Target, title: 'Desafíos y quiz', text: 'Arregla fotos con problemas usando objetivos medibles y comprueba lo aprendido con preguntas explicadas.', tag: 'Evaluación' },
];

const SCENES_EV = [
  { value: '15', label: 'Sol pleno · EV 15' },
  { value: '12', label: 'Nublado · EV 12' },
  { value: '7', label: 'Interior · EV 7' },
] as const;
type SceneEv = (typeof SCENES_EV)[number]['value'];

function EquivalenceTable() {
  const [ev, setEv] = useState<SceneEv>('15');
  const pairs = useMemo(() => equivalentPairs(Number(ev), 100), [ev]);
  return (
    <Panel eyebrow="La idea clave" title="Muchas combinaciones, la misma exposición">
      <p className="mb-4 text-[13.5px] leading-relaxed text-muted">
        Un <strong className="text-fg">paso</strong> duplica o reduce a la mitad la luz. Si abres un paso el diafragma y acortas un paso la velocidad, la foto
        queda igual de clara, pero cambia su aspecto: menos profundidad de campo y movimiento más congelado.
      </p>
      <Segmented label="Luz de la escena (ISO 100)" options={SCENES_EV.map((s) => ({ value: s.value, label: s.label }))} value={ev} onChange={setEv} size="sm" className="[&_[role=radiogroup]]:flex-wrap" />
      <div className="mt-4 overflow-x-auto" tabIndex={0} role="region" aria-label="Tabla de pares equivalentes (desplazable)">
        <table className="w-full min-w-[420px] text-left">
          <caption className="sr-only">Pares apertura y velocidad equivalentes a ISO 100</caption>
          <thead>
            <tr className="eyebrow">
              <th scope="col" className="pb-2 font-normal">Apertura</th>
              {pairs.map((p) => (
                <th key={p.aperture} scope="col" className="osd pb-2 text-center text-[12px] font-medium normal-case tracking-normal text-fg">
                  {formatAperture(p.aperture)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="eyebrow pt-1 font-normal">Velocidad</th>
              {pairs.map((p) => (
                <td key={p.aperture} className="osd pt-1 text-center text-[12px] text-amber">
                  {formatShutter(p.shutter)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Glossary() {
  const [q, setQ] = useState('');
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const items = useMemo(() => GLOSSARY.filter((g) => norm(g.term + ' ' + g.def).includes(norm(q.trim()))), [q]);
  return (
    <section aria-labelledby="glosario-title" className="border-t border-line pt-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="eyebrow mb-2">Referencia rápida</div>
          <h2 id="glosario-title" className="text-xl font-semibold md:text-2xl">
            Glosario
          </h2>
        </div>
        <label className="relative block w-full md:w-80">
          <span className="sr-only">Buscar en el glosario</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar término… (p. ej. hiperfocal)"
            className="h-10 w-full rounded-md border border-line bg-ink pl-9 pr-3 text-sm text-fg placeholder:text-faint focus:border-amber focus:outline-none"
          />
        </label>
      </div>
      <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((g) => (
          <div key={g.term} className="min-w-0 border-l border-line pl-4">
            <dt className="text-[14px] font-semibold text-fg">{g.term}</dt>
            <dd className="mt-1 text-[13.5px] leading-relaxed text-muted">{g.def}</dd>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-faint">No hay términos que coincidan con “{q}”.</p>}
      </dl>
    </section>
  );
}

export function HomePage({ onNavigate }: PageProps) {
  const p = useProgress();
  const levelStats = (level: Level) => {
    const ch = CHALLENGES.filter((c) => c.level === level);
    const qz = QUIZ.filter((q) => q.level === level);
    const done = ch.filter((c) => p.challenges.includes(c.id)).length + qz.filter((q) => p.quiz.includes(q.id)).length;
    const total = ch.length + qz.length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  };

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="eyebrow mb-4 text-amber">Escuela interactiva de cámara manual</div>
          <h1 tabIndex={-1} className="text-[34px] font-semibold leading-[1.08] tracking-tight focus:outline-none md:text-[46px]">
            Aprende a disparar en modo M <span className="text-muted">moviendo los diales, no memorizando tablas.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-muted">
            Cada concepto tiene un simulador con física real: cambias la apertura y ves el bokeh, alargas la velocidad y el agua se vuelve seda, subes el
            ISO y aparece el ruido. Desde cero hasta astrofotografía.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => onNavigate('exposicion')} icon={<Aperture size={16} aria-hidden="true" />}>
              Empezar por la exposición
            </Button>
            <Button onClick={() => onNavigate('desafios')} icon={<Target size={16} aria-hidden="true" />}>
              Ir a los desafíos
            </Button>
          </div>
          <dl className="mt-9 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-5">
            <div>
              <dt className="eyebrow">Desafíos</dt>
              <dd className="osd mt-1 text-xl text-fg">{CHALLENGES.length}</dd>
            </div>
            <div>
              <dt className="eyebrow">Preguntas</dt>
              <dd className="osd mt-1 text-xl text-fg">{QUIZ.length}</dd>
            </div>
            <div>
              <dt className="eyebrow">Escenas</dt>
              <dd className="osd mt-1 text-xl text-fg">{SCENE_LIST.length}</dd>
            </div>
          </dl>
        </motion.div>
        <div className="relative rounded-2xl border border-line bg-ink p-5 tech-grid">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="eyebrow">Prueba rápida · sol pleno, EV 15</span>
            <Badge tone="neutral">±1 paso por clic</Badge>
          </div>
          <TriangleHero />
          <p className="mt-2 text-center text-[12.5px] text-faint">Desequilibra un lado y compénsalo con otro hasta volver a ±0.</p>
        </div>
      </section>

      {/* Los tres controles */}
      <section aria-labelledby="tres-title">
        <h2 id="tres-title" className="text-xl font-semibold md:text-2xl">
          Tres controles, tres decisiones creativas
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { icon: Aperture, k: 'Apertura (f/)', light: 'Cuánta luz entra a la vez', look: 'Profundidad de campo: fondo cremoso o todo nítido' },
            { icon: Timer, k: 'Velocidad de obturación', light: 'Cuánto tiempo entra la luz', look: 'Movimiento: congelar una gota o convertir el agua en seda' },
            { icon: Gauge, k: 'ISO', light: 'Cuánto se amplifica la señal', look: 'Ruido y rango dinámico: limpio a ISO 100, granulado a 25600' },
          ].map((c) => (
            <Panel key={c.k}>
              <c.icon size={20} className="text-amber" aria-hidden="true" />
              <h3 className="mt-3 text-[15px] font-semibold">{c.k}</h3>
              <p className="mt-2 text-[13.5px] text-muted">
                <span className="text-fg">Luz:</span> {c.light}
              </p>
              <p className="mt-1 text-[13.5px] text-muted">
                <span className="text-fg">Efecto:</span> {c.look}
              </p>
            </Panel>
          ))}
        </div>
        <div className="mt-4">
          <EquivalenceTable />
        </div>
      </section>

      {/* Ruta de aprendizaje */}
      <section aria-labelledby="ruta-title">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="eyebrow mb-2">Ruta de aprendizaje</div>
            <h2 id="ruta-title" className="text-xl font-semibold md:text-2xl">
              De cero a avanzado en cuatro niveles
            </h2>
          </div>
          <p className="max-w-md text-[13.5px] text-muted">El progreso cuenta los desafíos superados y las preguntas acertadas de cada nivel. Se guarda en este navegador.</p>
        </div>
        <ol className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {CURRICULUM.map((lv, i) => {
            const st = levelStats(lv.level);
            return (
              <li key={lv.level} className="surface flex flex-col p-5">
                <div className="flex items-center justify-between">
                  <span className="osd text-[12px] text-faint">Nivel {i}</span>
                  <span className="osd text-[12px] text-amber">
                    {st.done}/{st.total}
                  </span>
                </div>
                <h3 className="mt-2 text-[15px] font-semibold">{lv.title.replace(/^Nivel [^:]+:\s*/, '')}</h3>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-raised" aria-hidden="true">
                  <div className="h-full bg-amber transition-[width] duration-500" style={{ width: `${st.pct}%` }} />
                </div>
                <ul className="mt-4 flex-1 space-y-1.5">
                  {lv.goals.slice(0, 5).map((g) => (
                    <li key={g} className="flex gap-2 text-[13px] leading-snug text-muted">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-faint" aria-hidden="true" />
                      {g}
                    </li>
                  ))}
                </ul>
                <Button size="sm" className="mt-5 self-start" onClick={() => onNavigate(LEVEL_ROUTE[lv.level])} icon={<ArrowRight size={14} aria-hidden="true" />}>
                  Empezar nivel
                </Button>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Módulos */}
      <section aria-labelledby="modulos-title">
        <h2 id="modulos-title" className="text-xl font-semibold md:text-2xl">
          Módulos
        </h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onNavigate(m.id)}
              className="group surface flex flex-col items-start p-5 text-left transition-colors hover:border-line-strong"
            >
              <div className="flex w-full items-center justify-between">
                <m.icon size={20} className="text-muted group-hover:text-amber" aria-hidden="true" />
                <Badge tone="neutral">{m.tag}</Badge>
              </div>
              <h3 className="mt-4 text-[15px] font-semibold">{m.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{m.text}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-fg group-hover:text-amber">
                Abrir <ArrowRight size={14} aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      </section>

      <Glossary />

      {/* Fuentes */}
      <section aria-labelledby="fuentes-title" className="border-t border-line pt-10">
        <div className="eyebrow mb-2">Para seguir aprendiendo</div>
        <h2 id="fuentes-title" className="text-xl font-semibold md:text-2xl">
          Fuentes y lecturas recomendadas
        </h2>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Las fórmulas del simulador y el contenido de las lecciones se apoyan en estas guías y referencias técnicas.
        </p>
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          {(['Pedagogía', 'Técnica', 'Interfaz y simuladores'] as const).map((cat) => {
            const list = SOURCES.filter((s) => s.category === cat);
            if (!list.length) return null;
            return (
              <div key={cat}>
                <h3 className="eyebrow mb-3">{cat}</h3>
                <ul className="space-y-2.5">
                  {list.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noreferrer" className="group inline-flex items-start gap-2 text-[13.5px] text-fg hover:text-amber">
                        <ExternalLink size={13} className="mt-1 shrink-0 text-faint group-hover:text-amber" aria-hidden="true" />
                        <span>
                          {s.title}
                          {s.note && <span className="block text-[12.5px] text-faint">{s.note}</span>}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
