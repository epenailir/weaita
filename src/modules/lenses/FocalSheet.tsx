import { motion } from 'framer-motion';
import { Aperture, Move3d, ScanEye, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { equivalentFocal } from '../../engine';
import type { SensorFormat } from '../../engine';
import { FOCAL_LENGTH_INFO } from '../../content/lenses';
import type { FocalLengthInfo } from '../../content/types';
import { Badge } from '../../components/ui';
import { formatFocal } from '../../lens/framing';

/** Ficha de referencia más próxima (en escala logarítmica) a la focal elegida. */
export function nearestFocalInfo(focalMm: number): FocalLengthInfo {
  let best = FOCAL_LENGTH_INFO[0]!;
  let bestD = Infinity;
  for (const info of FOCAL_LENGTH_INFO) {
    const d = Math.abs(Math.log(info.mm / focalMm));
    if (d < bestD) {
      bestD = d;
      best = info;
    }
  }
  return best;
}

function Row({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-line bg-ink text-muted" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <h4 className="text-[13px] font-semibold text-fg">{title}</h4>
        <p className="mt-0.5 text-[13.5px] leading-relaxed text-muted">{children}</p>
      </div>
    </div>
  );
}

export function FocalSheet({ focalMm, sensor }: { focalMm: number; sensor: SensorFormat }) {
  const info = nearestFocalInfo(focalMm);
  const exact = Math.round(focalMm) === info.mm;
  const equiv = equivalentFocal(focalMm, sensor);

  return (
    <article aria-labelledby="ficha-focal" className="surface overflow-hidden">
      <motion.div key={info.mm} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="grid gap-0 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)]">
        <div className="border-b border-line bg-panel-2/60 p-5 lg:border-b-0 lg:border-r">
          <div className="eyebrow mb-2">Ficha de la focal</div>
          <div className="flex items-baseline gap-3">
            <span id="ficha-focal" className="osd text-4xl font-medium tracking-tight text-fg">
              {info.mm}
              <span className="ml-1 text-lg text-muted">mm</span>
            </span>
          </div>
          <div className="mt-1 text-[15px] font-semibold text-amber">{info.label}</div>
          {!exact && <p className="mt-1 text-xs text-faint">Referencia más cercana a tus {formatFocal(focalMm)}.</p>}
          <p className="mt-3 text-[13.5px] leading-relaxed text-muted">{info.fovNote}</p>
          {sensor.crop !== 1 && (
            <p className="mt-3 rounded-sm border border-line bg-ink px-3 py-2 text-[12.5px] text-muted">
              En tu sensor ({sensor.name}) {formatFocal(focalMm)} encuadran como <strong className="osd font-medium text-fg">{formatFocal(equiv)}</strong> en full frame.
            </p>
          )}
          <div className="mt-4">
            <div className="eyebrow mb-2">Usos típicos</div>
            <ul className="flex flex-wrap gap-1.5">
              {info.uses.map((u) => (
                <li key={u}>
                  <Badge tone="neutral" className="!normal-case !tracking-normal font-sans text-[12px]">
                    {u}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Row icon={<Move3d size={15} />} title="Perspectiva">
            {info.perspective}
          </Row>
          <Row icon={<ScanEye size={15} />} title="Distorsión">
            {info.distortion}
          </Row>
          <Row icon={<Aperture size={15} />} title="Aperturas típicas">
            {info.typicalAperture}
          </Row>
          <Row icon={<Sparkles size={15} />} title="Cómo practicarla">
            {info.mm <= 35
              ? 'Acércate a un primer plano fuerte y deja que el fondo se aleje: la profundidad se exagera.'
              : info.mm <= 85
                ? 'Busca un fondo a distintas distancias y muévete tú (no el zoom) hasta encontrar la proporción que quieres.'
                : 'Aléjate del sujeto y alinea el fondo detrás: cuanto más lejos te pongas, más «pegado» se verá.'}
          </Row>
        </div>
      </motion.div>
    </article>
  );
}
