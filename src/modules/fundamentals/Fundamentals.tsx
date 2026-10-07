import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, MinusCircle } from 'lucide-react';
import type { AfMode, CameraMode } from '../../engine';
import { formatKelvin, kelvinToCss } from '../../engine';
import { Badge, Button, Panel, SectionHeader } from '../../components/ui';
import { AF_MODES, CAMERA_MODES, FILE_FORMATS, METERING_MODES, WHITE_BALANCE } from '../../content/fundamentals';
import { progress } from '../../lib/progress';
import { cn } from '../../lib/cn';
import { goToSection } from '../../lib/goToSection';
import type { PageProps } from '../../App';
import { AutofocusDemo } from './AutofocusDemo';
import { ModesDemo } from './ModesDemo';
import { RawJpegDemo } from './RawJpegDemo';
import { WhiteBalanceDemo } from './WhiteBalanceDemo';

const SECTIONS = [
  { id: 'enfoque', label: 'Enfoque' },
  { id: 'modos', label: 'Modos P/A/S/M' },
  { id: 'formatos', label: 'RAW vs JPEG' },
  { id: 'balance', label: 'Balance de blancos' },
  { id: 'medicion', label: 'Medición' },
] as const;

function Section({ id, eyebrow, title, intro, children }: { id: string; eyebrow: string; title: string; intro: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  // Marca la lección como vista cuando la sección entra en pantalla
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) progress.mark('lessons', `fundamentos-${id}`);
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [id]);
  return (
    <section ref={ref} id={id} tabIndex={-1} aria-labelledby={`${id}-title`} className="scroll-mt-2 border-t border-line pt-10 focus:outline-none">
      <div className="eyebrow mb-2">{eyebrow}</div>
      <h2 id={`${id}-title`} className="text-xl font-semibold md:text-2xl">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted">{intro}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function List({ items, tone }: { items: string[]; tone: 'data' | 'danger' | 'neutral' }) {
  const Icon = tone === 'danger' ? MinusCircle : CheckCircle2;
  return (
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2 text-[13.5px] leading-snug text-muted">
          <Icon
            size={15}
            className={cn('mt-0.5 shrink-0', tone === 'data' && 'text-data', tone === 'danger' && 'text-danger', tone === 'neutral' && 'text-faint')}
            aria-hidden="true"
          />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

/** Iconos de medición dibujados como en el menú de una cámara. */
function MeteringIcon({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 48 32" className="h-8 w-12" aria-hidden="true">
      <rect x="1" y="1" width="46" height="30" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {id === 'matrix' && (
        <g fill="currentColor" opacity="0.8">
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={7 + (i % 4) * 9} y={6 + Math.floor(i / 4) * 7.5} width="6" height="4.5" rx="1" />
          ))}
        </g>
      )}
      {id === 'center' && (
        <g fill="none" stroke="currentColor" strokeWidth="1.5">
          <ellipse cx="24" cy="16" rx="13" ry="9" />
          <circle cx="24" cy="16" r="3" fill="currentColor" />
        </g>
      )}
      {id === 'spot' && <circle cx="24" cy="16" r="3.5" fill="currentColor" />}
      {id === 'partial' && (
        <g>
          <circle cx="24" cy="16" r="7" fill="currentColor" opacity="0.3" />
          <circle cx="24" cy="16" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </g>
      )}
      {id === 'highlight' && (
        <g fill="currentColor">
          <circle cx="24" cy="16" r="5" opacity="0.35" />
          <path d="M21 13 h6 v6 h-6z" />
        </g>
      )}
    </svg>
  );
}

export function Fundamentals({ onNavigate }: PageProps) {
  const [af, setAf] = useState<AfMode>('AF-C');
  const [mode, setMode] = useState<CameraMode>('A');
  const afInfo = AF_MODES.find((m) => m.id === af);
  const modeInfo = CAMERA_MODES.find((m) => m.id === mode);

  return (
    <div className="space-y-10">
      <SectionHeader
        eyebrow="Fundamentos operativos"
        title="Lo que hay que dominar antes de disparar"
        description="Cómo enfoca la cámara, quién decide cada valor según el modo, por qué conviene disparar en RAW y cómo neutralizar el color de la luz. Cada tarjeta tiene una demo para tocar."
        actions={
          <Button variant="secondary" onClick={() => onNavigate('desafios')} icon={<ArrowRight size={15} aria-hidden="true" />}>
            Ponerme a prueba
          </Button>
        }
      />

      <nav aria-label="Temas de esta página" data-sticky-subnav className="sticky top-[57px] z-20 -mx-4 overflow-x-auto border-y border-line bg-bg/90 px-4 py-2 backdrop-blur lg:top-0">
        <ul className="flex gap-1">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  goToSection(s.id);
                }}
                className="block whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] text-muted hover:bg-panel hover:text-fg"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section
        id="enfoque"
        eyebrow="1 · Sistemas de enfoque"
        title="AF-S, AF-C, AF-A y enfoque manual"
        intro="El modo de enfoque decide qué hace la cámara después de enfocar: quedarse quieta o seguir al sujeto. Pulsa el medio disparador con el corredor en movimiento y compara."
      >
        <AutofocusDemo mode={af} onModeChange={setAf} />
        {afInfo && (
          <motion.div key={afInfo.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mt-5 grid gap-4 md:grid-cols-3">
            <Panel eyebrow={afInfo.aka} title={afInfo.name}>
              <p className="text-[13.5px] leading-relaxed text-muted">{afInfo.how}</p>
            </Panel>
            <Panel eyebrow="Cuándo usarlo" title="Situaciones ideales">
              <p className="text-[13.5px] leading-relaxed text-muted">{afInfo.when}</p>
            </Panel>
            <Panel eyebrow="Consejos" title="En la práctica">
              <List items={afInfo.tips} tone="neutral" />
            </Panel>
          </motion.div>
        )}
      </Section>

      <Section
        id="modos"
        eyebrow="2 · Modos de cámara"
        title="Quién decide cada valor: P, A, S y M"
        intro="Los modos semiautomáticos no son trampa: fijas el parámetro que más importa para la foto y la cámara resuelve el resto con el exposímetro. Cambia de modo y mueve los controles."
      >
        <ModesDemo mode={mode} onModeChange={setMode} />
        {modeInfo && (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Panel eyebrow="Tú controlas" title={modeInfo.name}>
              <List items={modeInfo.youControl} tone="data" />
            </Panel>
            <Panel eyebrow="La cámara controla" title="Automatismo">
              <List items={modeInfo.cameraControls} tone="neutral" />
              <p className="mt-3 text-[13px] text-faint">{modeInfo.when}</p>
            </Panel>
            <Panel eyebrow="Consejos" title="Cómo sacarle partido">
              <List items={modeInfo.tips} tone="neutral" />
            </Panel>
          </div>
        )}
      </Section>

      <Section
        id="formatos"
        eyebrow="3 · Formatos de archivo"
        title="RAW vs. JPEG: la latitud de edición"
        intro="Elige cómo se tomó la foto y luego corrige la exposición como harías en el editor. El RAW conserva información que el JPEG ya descartó."
      >
        <RawJpegDemo />
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {FILE_FORMATS.map((f) => (
            <Panel key={f.id} eyebrow={f.bitDepth} title={f.name}>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                <div>
                  <div className="eyebrow mb-2 !text-data">A favor</div>
                  <List items={f.pros} tone="data" />
                </div>
                <div>
                  <div className="eyebrow mb-2 !text-danger">En contra</div>
                  <List items={f.cons} tone="danger" />
                </div>
              </div>
              <p className="mt-4 border-t border-line pt-3 text-[13px] text-muted">{f.when}</p>
            </Panel>
          ))}
        </div>
      </Section>

      <Section
        id="balance"
        eyebrow="4 · Balance de blancos"
        title="La temperatura de color en Kelvin"
        intro="Cada fuente de luz tiene un color. Elige la luz de la escena y ajusta la cámara hasta que la carta gris se vea neutra."
      >
        <WhiteBalanceDemo />
        <div className="mt-5 overflow-x-auto rounded-lg border border-line" tabIndex={0} role="region" aria-label="Tabla de ajustes de balance de blancos (desplazable)">
          <table className="w-full min-w-[640px] text-left text-[13.5px]">
            <caption className="sr-only">Ajustes de balance de blancos y su temperatura</caption>
            <thead className="bg-panel-2 text-[12px] text-faint">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">Ajuste</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Temperatura</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Cuándo</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Nota</th>
              </tr>
            </thead>
            <tbody>
              {WHITE_BALANCE.map((w) => (
                <tr key={w.id} className="border-t border-line align-top">
                  <th scope="row" className="px-4 py-3 font-medium text-fg">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 shrink-0 rounded-full border border-line-strong" style={{ background: w.kelvin > 0 ? kelvinToCss(w.kelvin) : 'transparent' }} aria-hidden="true" />
                      {w.name}
                    </span>
                  </th>
                  <td className="osd px-4 py-3 text-amber">{w.kelvin > 0 ? formatKelvin(w.kelvin) : '—'}</td>
                  <td className="px-4 py-3 text-muted">{w.when}</td>
                  <td className="px-4 py-3 text-faint">{w.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        id="medicion"
        eyebrow="5 · Medición de la luz"
        title="Matricial, ponderada al centro y puntual"
        intro="El exposímetro asume que lo que mide es un gris medio. El modo de medición decide qué parte del encuadre mira; en un contraluz la diferencia puede ser de más de un paso."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {METERING_MODES.map((m) => (
            <Panel key={m.id}>
              <div className="mb-3 flex items-center justify-between text-muted">
                <MeteringIcon id={m.id} />
                <Badge tone="neutral">{m.id}</Badge>
              </div>
              <h3 className="text-[15px] font-semibold">{m.name}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{m.how}</p>
              <p className="mt-3 border-t border-line pt-3 text-[13px] text-faint">{m.when}</p>
            </Panel>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => onNavigate('escenarios')} icon={<ArrowRight size={15} aria-hidden="true" />}>
            Ver la medición en un contraluz real
          </Button>
          <Button onClick={() => onNavigate('exposicion')}>Volver al triángulo de exposición</Button>
        </div>
      </Section>
    </div>
  );
}
