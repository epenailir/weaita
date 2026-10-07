/**
 * Selector de escena (radiogroup con foco itinerante) y escala de luz que ancla el EV de la
 * escena a situaciones conocidas: sol pleno, atardecer, interior, Vía Láctea…
 */
import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight, Target } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { SCENE_LIST } from '../../sim/scenes';
import type { SceneId, SimScene } from '../../sim/types';
import { cn } from '../../lib/cn';
import { EV_REFERENCES, EV_SCALE_MAX, EV_SCALE_MIN, SCENE_BRIEFS, formatSignedEv } from './sceneBriefs';

const evX = (ev: number) => ((ev - EV_SCALE_MIN) / (EV_SCALE_MAX - EV_SCALE_MIN)) * 100;

/** Escala de EV de la escena frente a referencias de la vida real. */
export function EvLadder({ scene, className }: { scene: SimScene; className?: string }) {
  const ev = scene.lighting.ev100;
  const brief = SCENE_BRIEFS[scene.id];
  return (
    <div
      role="img"
      aria-label={`Escala de luz: la escena mide EV ${formatSignedEv(ev)} a ISO 100, como ${brief.anchor.toLowerCase()}. Referencias: ${EV_REFERENCES.map((r) => `${r.label} EV ${formatSignedEv(r.ev)}`).join(', ')}.`}
      className={cn('min-w-0', className)}
    >
      <div className="relative h-6" aria-hidden="true">
        <div
          className="absolute inset-x-0 top-[8px] h-2 rounded-full border border-line"
          style={{ background: 'linear-gradient(to right, #05070d, #1d2433 30%, #6b5a3a 62%, #e8d7a8 88%, #fff8e6)' }}
        />
        {EV_REFERENCES.map((r) => (
          <span
            key={r.ev}
            title={`${r.label} · EV ${formatSignedEv(r.ev)}`}
            className="absolute top-[5px] h-3.5 w-px -translate-x-1/2 bg-line-strong"
            style={{ left: `${evX(r.ev)}%` }}
          />
        ))}
        <span
          className="absolute top-[6px] h-3 w-3 -translate-x-1/2 rounded-full border-2 border-amber bg-ink shadow-[0_0_10px_rgb(255_178_36/0.5)] transition-[left] duration-300"
          style={{ left: `${evX(ev)}%` }}
        />
      </div>
      <div className="osd flex justify-between text-[10.5px] text-faint" aria-hidden="true">
        <span>Vía Láctea −7</span>
        <span>Interior 7</span>
        <span>Sol pleno 15</span>
      </div>
    </div>
  );
}

export function ScenePicker({ value, onChange }: { value: SceneId; onChange: (id: SceneId) => void }) {
  const listRef = useRef<HTMLDivElement>(null);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const reduce = useReducedMotion();
  const index = SCENE_LIST.findIndex((s) => s.id === value);

  // Mantiene visible la escena elegida dentro de la tira.
  useEffect(() => {
    const el = refs.current[index];
    const list = listRef.current;
    if (!el || !list) return;
    const left = el.offsetLeft - list.offsetLeft;
    const right = left + el.offsetWidth;
    if (left < list.scrollLeft || right > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: left - 16, behavior: reduce ? 'auto' : 'smooth' });
    }
  }, [index, reduce]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % SCENE_LIST.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + SCENE_LIST.length) % SCENE_LIST.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = SCENE_LIST.length - 1;
    else return;
    e.preventDefault();
    const s = SCENE_LIST[next];
    if (!s) return;
    onChange(s.id);
    refs.current[next]?.focus();
  };

  const scrollBy = (dir: 1 | -1) => {
    const list = listRef.current;
    if (list) list.scrollBy({ left: dir * list.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <section aria-labelledby="escenas-title" className="relative">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 id="escenas-title" className="eyebrow">
          Elige una escena <span className="normal-case tracking-normal text-faint">· {SCENE_LIST.length} situaciones con luz real</span>
        </h2>
        <div className="hidden gap-1 lg:flex" aria-hidden="true">
          <button type="button" tabIndex={-1} onClick={() => scrollBy(-1)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line bg-panel-2 text-muted hover:text-fg">
            <ChevronLeft size={15} />
          </button>
          <button type="button" tabIndex={-1} onClick={() => scrollBy(1)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line bg-panel-2 text-muted hover:text-fg">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
      <div
        ref={listRef}
        role="radiogroup"
        aria-labelledby="escenas-title"
        onKeyDown={onKeyDown}
        className="-mx-4 flex snap-x gap-2 overflow-x-auto scroll-px-4 px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:px-0"
      >
        {SCENE_LIST.map((s, i) => {
          const brief = SCENE_BRIEFS[s.id];
          const Icon = brief.icon;
          const active = s.id === value;
          return (
            <button
              key={s.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${s.name}, EV ${formatSignedEv(s.lighting.ev100)}. ${s.description}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(s.id)}
              className={cn(
                'group flex w-[178px] shrink-0 snap-start flex-col rounded-md border px-3 py-2.5 text-left transition-colors duration-150 sm:w-[196px]',
                active ? 'border-amber/60 bg-amber-soft' : 'border-line bg-panel hover:border-line-strong hover:bg-panel-2',
              )}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <Icon size={15} aria-hidden="true" className={cn('shrink-0', active ? 'text-amber' : 'text-faint group-hover:text-muted')} />
                <span className={cn('osd shrink-0 text-[11px]', active ? 'text-amber' : 'text-faint')}>EV {formatSignedEv(s.lighting.ev100)}</span>
              </span>
              <span className="mt-1.5 block truncate text-[13px] font-medium text-fg">{s.name}</span>
              <span className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-muted">{s.description}</span>
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute bottom-2 right-0 top-9 hidden w-12 bg-linear-to-l from-bg to-transparent lg:block" aria-hidden="true" />
    </section>
  );
}

/** Ficha compacta de la escena elegida: nombre con EV, situación real equivalente, objetivo y escala de luz. */
export function SceneBriefCard({ scene }: { scene: SimScene }) {
  const brief = SCENE_BRIEFS[scene.id];
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-panel px-4 py-3 md:flex-row md:items-center md:gap-8">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h2 className="text-[15px] font-semibold text-fg">{scene.name}</h2>
          <span className="osd text-[14px] font-medium text-amber">· EV {formatSignedEv(scene.lighting.ev100)}</span>
          <span className="text-[12.5px] text-muted">como {brief.anchor.toLowerCase()}</span>
        </div>
        <p className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-snug text-fg">
          <Target size={14} className="mt-0.5 shrink-0 text-amber" aria-hidden="true" />
          <span>
            <span className="eyebrow mr-1.5 !text-amber">Objetivo</span>
            {brief.goal}
          </span>
        </p>
      </div>
      <EvLadder scene={scene} className="hidden sm:block md:w-[300px] md:shrink-0" />
    </div>
  );
}
