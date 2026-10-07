import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { SENSORS } from '../../engine';
import type { SensorId } from '../../engine';
import { Button, SectionHeader } from '../../components/ui';
import type { PageProps } from '../../App';
import { framingDistanceM } from '../../lens/framing';
import type { FramingMode, LensBuild } from '../../lens/framing';
import { ApertureZoomDemo } from './ApertureZoomDemo';
import { ComparisonStrip } from './ComparisonStrip';
import { DistortionDemo } from './DistortionDemo';
import { FocalExplorer } from './FocalExplorer';
import { FocalSheet } from './FocalSheet';
import { LensTypes } from './LensTypes';
import { MacroDemo } from './MacroDemo';
import { LabSection } from './shared';
import { goToSection } from '../../lib/goToSection';

const SECTIONS = [
  { id: 'focal', label: 'Focal y perspectiva' },
  { id: 'comparativa', label: 'Comparativa' },
  { id: 'distorsion', label: 'Distorsión' },
  { id: 'tipos', label: 'Tipos de objetivo' },
  { id: 'apertura', label: 'Apertura constante' },
  { id: 'macro', label: 'Macro 1:1' },
] as const;

const INITIAL_FOCAL = 50;

export function LensLab({ onNavigate }: PageProps) {
  const [focal, setFocal] = useState(INITIAL_FOCAL);
  const [sensorId, setSensorId] = useState<SensorId>('ff');
  const [mode, setMode] = useState<FramingMode>('frame');
  const [fixedDistance, setFixedDistance] = useState(() => framingDistanceM(INITIAL_FOCAL, SENSORS.ff));
  const [build, setBuild] = useState<LensBuild>('prime');
  const sensor = SENSORS[sensorId];

  return (
    <div className="space-y-10">
      <SectionHeader
        eyebrow="Laboratorio de lentes"
        title="Focal, perspectiva y distorsión"
        description="Cambia de objetivo sobre la misma escena y comprueba qué cambia de verdad: el ángulo de visión, la distancia a la que te pones y, con ella, la perspectiva. Después, la distorsión, los tipos de objetivo, la apertura de los zooms y el macro."
        actions={
          <Button variant="secondary" onClick={() => onNavigate('escenarios')} icon={<ArrowRight size={15} aria-hidden="true" />}>
            Aplicarlo en escenarios
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

      <LabSection
        id="focal"
        eyebrow="1 · Distancia focal y perspectiva"
        title="Mismo sujeto, otra focal: ¿qué cambia?"
        intro="La escena está a escala real: una persona de 1.75 m, farolas cada 8 m, una fila de edificios 110 m detrás y montañas a varios kilómetros. La imagen se calcula con la proyección de una cámara estenopeica sobre el sensor que elijas."
      >
        <FocalExplorer
          focal={focal}
          onFocal={setFocal}
          sensorId={sensorId}
          onSensor={setSensorId}
          mode={mode}
          onMode={setMode}
          fixedDistance={fixedDistance}
          onFixedDistance={setFixedDistance}
          build={build}
        />
        <div className="mt-5">
          <FocalSheet focalMm={focal} sensor={sensor} />
        </div>
      </LabSection>

      <LabSection
        id="comparativa"
        eyebrow="2 · Comparativa"
        title="Mismo sujeto, distinta focal"
        intro="Cinco fotos con la persona del mismo tamaño. Para lograrlo, la cámara retrocede a medida que la focal crece; eso es lo que «acerca» el fondo."
      >
        <ComparisonStrip
          sensor={sensor}
          focal={focal}
          active={mode === 'frame'}
          onSelect={(mm) => {
            setMode('frame');
            setFocal(mm);
          }}
        />
      </LabSection>

      <LabSection
        id="distorsion"
        eyebrow="3 · Distorsión"
        title="Barril, cojín y la corrección de perfil"
        intro="Los objetivos reales no dibujan todas las rectas rectas. Los gran angulares tienden al barril y los teles al cojín, y los zooms más que los fijos. Activa la exageración para verla y luego corrígela."
      >
        <DistortionDemo build={build} onBuild={setBuild} />
      </LabSection>

      <LabSection
        id="tipos"
        eyebrow="4 · Tipos de objetivo"
        title="Fijo, zoom y familias especiales"
        intro="No hay un objetivo mejor: cada diseño cambia luminosidad, peso, versatilidad y calidad. Empieza por la decisión de fondo, fijo o zoom, y despliega las demás familias."
      >
        <LensTypes />
      </LabSection>

      <LabSection
        id="apertura"
        eyebrow="5 · Apertura constante frente a variable"
        title="Por qué tu zoom de kit oscurece la foto al hacer zoom"
        intro="Gira el anillo de zoom de dos objetivos a la vez. El de kit cierra su apertura máxima al alargar la focal; el profesional mantiene f/2.8 en todo el recorrido."
      >
        <ApertureZoomDemo />
      </LabSection>

      <LabSection
        id="macro"
        eyebrow="6 · Macro 1:1"
        title="Tamaño real en el sensor, profundidad en milímetros"
        intro="Acércate hasta la distancia mínima de enfoque de un macro de 100 mm. A 1:1 el insecto se proyecta en el sensor a su tamaño real, la apertura efectiva cae dos pasos y la zona nítida se mide en milímetros."
      >
        <MacroDemo />
        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => onNavigate('desafios')} icon={<ArrowRight size={15} aria-hidden="true" />}>
            Ponerme a prueba
          </Button>
          <Button onClick={() => onNavigate('exposicion')}>Volver al triángulo de exposición</Button>
        </div>
      </LabSection>
    </div>
  );
}
