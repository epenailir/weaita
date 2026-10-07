/**
 * Tarjeta de receta en estilo OSD: doce celdas (modo, exposición, focal, AF, medición, balance,
 * formato, disparo, distancia y soporte) con un punto verde cuando tu cámara coincide.
 * En "Completa el último paso" una celda queda en "?"; en "Solo el objetivo" se muestran
 * únicamente los criterios.
 */
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { formatAperture, formatIso, formatKelvin, formatShutter, kelvinToCss } from '../../engine';
import { METERING_INFO, MeteringIcon, formatFocus } from '../../components/viewfinder';
import type { Scenario } from '../../content/types';
import type { UseCamera } from '../../state/useCamera';
import { cn } from '../../lib/cn';
import type { Check } from './checks';
import type { HelpLevel } from './levels';
import { paramMatches } from './model';
import type { RecipeParam, ShotContext } from './model';
import type { Playbook } from './playbook';

interface Cell {
  p: RecipeParam;
  label: string;
  value: ReactNode;
  /** Texto plano para lectores de pantalla. */
  text: string;
  /** Marca breve junto al valor ("AUTO", "H"). */
  badge?: string;
  title?: string;
}

function recipeCells(sc: Scenario, pb: Playbook, r: ShotContext): Cell[] {
  const s = r.s;
  const shutterAuto = s.mode === 'A' || s.mode === 'P';
  const apertureAuto = s.mode === 'S' || s.mode === 'P';
  const metering = METERING_INFO[s.metering];
  return [
    { p: 'mode', label: 'Modo', value: s.mode, text: `modo ${s.mode}${s.autoIso ? ' con Auto-ISO' : ''}`, badge: s.autoIso ? 'ISO AUTO' : undefined },
    {
      p: 'aperture',
      label: 'Apertura',
      value: formatAperture(s.aperture),
      text: `${formatAperture(s.aperture)}${apertureAuto ? ', la elige la cámara' : ''}`,
      badge: apertureAuto ? 'AUTO' : undefined,
    },
    {
      p: 'shutter',
      label: 'Velocidad',
      value: formatShutter(s.shutter),
      text: `${formatShutter(s.shutter)}${shutterAuto ? ', la elige la cámara' : ''}`,
      badge: shutterAuto ? 'AUTO' : undefined,
      title: shutterAuto ? 'La elige la cámara en este modo' : undefined,
    },
    {
      p: 'iso',
      label: 'ISO',
      value: s.autoIso ? `≈${formatIso(s.iso)}` : formatIso(s.iso),
      text: s.autoIso ? `ISO automático, cerca de ${formatIso(s.iso)}` : `ISO ${formatIso(s.iso)}`,
      badge: s.autoIso ? 'AUTO' : undefined,
    },
    { p: 'focal', label: 'Focal', value: `${s.focalMm} mm`, text: `${s.focalMm} milímetros` },
    { p: 'af', label: 'AF', value: s.af, text: s.af },
    {
      p: 'metering',
      label: 'Medición',
      value: (
        <span className="inline-flex items-center gap-1">
          <MeteringIcon mode={s.metering} size="1em" className="hidden @xs:block" />
          {metering.short}
        </span>
      ),
      text: metering.label,
    },
    {
      p: 'wb',
      label: 'Balance',
      value: (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: kelvinToCss(s.wbK) }} aria-hidden="true" />
          {formatKelvin(s.wbK).replace(' ', '')}
        </span>
      ),
      text: formatKelvin(s.wbK),
    },
    { p: 'format', label: 'Formato', value: s.format, text: s.format },
    { p: 'drive', label: 'Disparo', value: pb.driveShort, text: sc.recommended.drive, title: sc.recommended.drive },
    {
      p: 'focus',
      label: 'Distancia',
      value: formatFocus(s.focusM),
      text: `enfoque a ${formatFocus(s.focusM)}, ${pb.focusNote}`,
      badge: pb.focusBadge,
      title: pb.focusNote,
    },
    { p: 'support', label: 'Soporte', value: s.tripod ? 'Trípode' : 'A pulso', text: s.tripod ? 'trípode' : 'a pulso' },
  ];
}

export interface RecipeStripProps {
  scenario: Scenario;
  playbook: Playbook;
  recipe: ShotContext;
  cam: UseCamera;
  level: HelpLevel;
  /** El alumno ya resolvió el paso: se puede mostrar el valor oculto. */
  solved: boolean;
  /** Para animar los puntos cuando se aplica la receta. */
  pulse: number;
  reduced: boolean;
}

export function RecipeStrip({ scenario, playbook, recipe, cam, level, solved, pulse, reduced }: RecipeStripProps) {
  const cells = recipeCells(scenario, playbook, recipe);
  const hidden = (p: RecipeParam) => level === 'partial' && !solved && playbook.missing.param === p;
  const states = cells.map((c) => (hidden(c.p) ? null : paramMatches(c.p, cam.settings, cam.effective, recipe)));
  const comparable = states.filter((v) => v !== null).length;
  const matching = states.filter((v) => v === true).length;

  return (
    <section aria-label="Receta recomendada" className="@container overflow-hidden rounded-lg border border-line bg-ink">
      <header className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-2">
        <span className="eyebrow !text-amber">Receta</span>
        <span className="osd text-[11.5px] text-faint">
          <span className={cn(matching === comparable ? 'text-data' : 'text-muted')}>{matching}</span>/{comparable} en tu cámara
        </span>
      </header>
      <dl className="m-0 grid grid-cols-3 gap-px bg-line @sm:grid-cols-4 @2xl:grid-cols-6">
        {cells.map((c, i) => {
          const isHidden = hidden(c.p);
          const match = states[i];
          return (
            <div
              key={c.p}
              title={c.title}
              className={cn('relative min-w-0 bg-ink px-2.5 py-1.5', isHidden && 'bg-amber-soft outline-1 -outline-offset-4 outline-amber/70 outline-dashed')}
            >
              <dt className="osd flex items-center justify-between gap-1 text-[10px] uppercase tracking-[0.08em] text-faint">
                <span className="truncate">{c.label}</span>
                {match !== null && match !== undefined && (
                  <motion.span
                    key={`${pulse}-${match ? 1 : 0}`}
                    initial={{ scale: match && !reduced ? 0.4 : 1, opacity: match ? 0.3 : 1 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.25, delay: match ? i * 0.03 : 0 }}
                    aria-hidden="true"
                    className={cn('h-1.5 w-1.5 shrink-0 rounded-full', match ? 'bg-data shadow-[0_0_6px_rgb(163_255_87/0.6)]' : 'border border-line-strong')}
                  />
                )}
              </dt>
              <dd className="m-0 mt-1">
                {isHidden ? (
                  <>
                    <span className="flex items-center gap-1.5" aria-hidden="true">
                      <span className="osd text-[14px] font-semibold text-amber">?</span>
                      <span className="truncate text-[11px] text-amber/90">Elige tú</span>
                    </span>
                    <span className="sr-only">: falta este ajuste, elígelo tú</span>
                  </>
                ) : (
                  <>
                    <span className="flex min-w-0 items-center gap-1.5" aria-hidden="true">
                      <span className="osd truncate text-[14px] font-medium text-fg">{c.value}</span>
                      {c.badge && (
                        <span className="osd shrink-0 rounded-xs border border-amber/40 px-1 text-[11px] font-semibold leading-[14px] text-amber">{c.badge}</span>
                      )}
                    </span>
                    <span className="sr-only">
                      {c.text}
                      {match === true ? ' (tu cámara coincide)' : match === false ? ' (tu cámara no coincide)' : ''}
                    </span>
                  </>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

/** Variante de "Solo el objetivo": los criterios, sin valores. */
export function ObjectiveStrip({ checks, subject }: { checks: Check[]; subject: string }) {
  return (
    <section aria-label="Objetivo de la toma" className="@container overflow-hidden rounded-lg border border-line bg-ink">
      <header className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-2">
        <span className="eyebrow inline-flex items-center gap-1.5 !text-amber">
          <Target size={12} aria-hidden="true" />
          Objetivo
        </span>
        <span className="text-[11.5px] text-faint">Sujeto: {subject}</span>
      </header>
      {/* Bordes por celda con margen negativo: las líneas sobrantes quedan recortadas */}
      <ol className="-mb-px -mr-px grid list-none grid-cols-1 p-0 @sm:grid-cols-2 @2xl:grid-cols-3">
        {checks.map((c, i) => (
          <li key={c.id} className="flex min-w-0 items-baseline gap-2 border-b border-r border-line px-3 py-2">
            <span className="osd text-[11px] text-faint">{i + 1}</span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-fg">{c.label}</span>
              <span className="block truncate text-[11.5px] text-muted">{c.goal}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
