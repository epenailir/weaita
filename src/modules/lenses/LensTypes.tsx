import { useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Layers, Maximize2, Telescope } from 'lucide-react';
import { LENS_TYPES } from '../../content/lenses';
import type { LensType } from '../../content/types';
import { Badge } from '../../components/ui';
import { cn } from '../../lib/cn';
import { BulletList } from './shared';

const byId = (id: string): LensType | undefined => LENS_TYPES.find((t) => t.id === id);

/** Esquemas mínimos de cada familia de objetivos (vista cenital del cono de visión). */
function Glyph({ id }: { id: string }) {
  const common = 'h-10 w-14 text-muted';
  switch (id) {
    case 'prime':
      return (
        <svg viewBox="0 0 56 40" className={common} aria-hidden="true">
          <rect x="6" y="12" width="30" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="36" y="9" width="12" height="22" rx="2" fill="none" stroke="var(--color-amber)" strokeWidth="1.5" />
          <circle cx="42" cy="20" r="4" fill="var(--color-amber)" opacity="0.6" />
        </svg>
      );
    case 'zoom':
      return (
        <svg viewBox="0 0 56 40" className={common} aria-hidden="true">
          <rect x="4" y="12" width="20" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="24" y="10" width="13" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="37" y="8" width="13" height="24" rx="2" fill="none" stroke="var(--color-amber)" strokeWidth="1.5" />
          <path d="M28 6 h18 M42 3 l4 3 -4 3" fill="none" stroke="var(--color-amber)" strokeWidth="1.3" />
        </svg>
      );
    case 'macro':
      return (
        <svg viewBox="0 0 56 40" className={common} aria-hidden="true">
          <ellipse cx="28" cy="22" rx="12" ry="10" fill="#c2412d" />
          <path d="M28 12 v20" stroke="#14161a" strokeWidth="1.4" />
          <circle cx="28" cy="11" r="4.5" fill="#14161a" />
          {[[22, 18], [34, 18], [23, 26], [33, 26]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2.1" fill="#14161a" />
          ))}
        </svg>
      );
    case 'fisheye':
      return (
        <svg viewBox="0 0 56 40" className={common} aria-hidden="true">
          <circle cx="28" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 20 h34 M28 3 v34 M14 11 Q28 17 42 11 M14 29 Q28 23 42 29 M19 5 Q24 20 19 35 M37 5 Q32 20 37 35" fill="none" stroke="var(--color-amber)" strokeWidth="1.1" opacity="0.8" />
        </svg>
      );
    default:
      return null;
  }
}

const ICONS: Record<string, ReactNode> = {
  'wide-angle': <Maximize2 size={18} aria-hidden="true" />,
  telephoto: <Telescope size={18} aria-hidden="true" />,
  'tilt-shift': <Layers size={18} aria-hidden="true" />,
};

function ProsCons({ type }: { type: LensType }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <div className="eyebrow mb-2 !text-data">A favor</div>
        <BulletList items={type.pros} tone="data" />
      </div>
      <div>
        <div className="eyebrow mb-2 !text-danger">En contra</div>
        <BulletList items={type.cons} tone="danger" />
      </div>
    </div>
  );
}

function VersusCard({ type, tag }: { type: LensType; tag: string }) {
  return (
    <article className="surface flex flex-col p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <Badge tone="amber">{tag}</Badge>
          <h3 className="mt-2 text-lg font-semibold">{type.name}</h3>
          <p className="mt-1 text-[14px] leading-relaxed text-muted">{type.summary}</p>
        </div>
        <Glyph id={type.id} />
      </div>
      <ProsCons type={type} />
      <p className="mt-auto border-t border-line pt-3 text-[13px] text-muted">
        <span className="font-medium text-fg">Cuándo: </span>
        {type.whenToUse}
      </p>
    </article>
  );
}

function TypeCard({ type }: { type: LensType }) {
  const [open, setOpen] = useState(false);
  const panelId = `tipo-${type.id}`;
  return (
    <article className="surface flex flex-col p-5">
      <div className="mb-2 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line bg-ink text-amber">
          {ICONS[type.id] ?? <Glyph id={type.id} />}
        </span>
        <h3 className="text-[15px] font-semibold leading-snug">{type.name}</h3>
      </div>
      <p className="text-[13.5px] leading-relaxed text-muted">{type.summary}</p>
      <p className="mt-3 text-[13px] text-faint">
        <span className="text-muted">Cuándo: </span>
        {type.whenToUse}
      </p>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="mt-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-sm text-[13px] font-medium text-amber hover:text-amber-strong"
      >
        {open ? 'Ocultar ventajas y límites' : 'Ver ventajas y límites'}
        <ChevronDown size={15} className={cn('transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="detalle"
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              <ProsCons type={type} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

const OTHER_TYPES = ['wide-angle', 'telephoto', 'macro', 'fisheye', 'tilt-shift'];

export function LensTypes() {
  const prime = byId('prime');
  const zoom = byId('zoom');
  const others = OTHER_TYPES.map(byId).filter((t): t is LensType => Boolean(t));
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        {prime && <VersusCard type={prime} tag="Fijo" />}
        {zoom && <VersusCard type={zoom} tag="Zoom" />}
      </div>
      <div>
        <h3 className="mb-3 text-[15px] font-semibold">Otras familias</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {others.map((t) => (
            <TypeCard key={t.id} type={t} />
          ))}
        </div>
      </div>
    </div>
  );
}
