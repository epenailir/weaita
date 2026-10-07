/**
 * Sesión de un escenario: visor del simulador, tarjeta de receta, acciones (aplicar la receta,
 * disparar, A/B), consola de diagnóstico, panel lateral (cámara, herramienta y experimentos)
 * y las secciones de lectura. Se monta de nuevo al cambiar de escenario.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight, Camera, Columns2, FlaskConical, Focus, Grid3x3, Pause, Play, Ruler, RotateCcw, SlidersHorizontal, WandSparkles, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatAperture, formatIso, formatKelvin, formatShutter } from '../../engine';
import type { CameraSettings } from '../../engine';
import { Button, Callout, Panel, Segmented } from '../../components/ui';
import { ExposureControls, ModeDial, QuickSettings } from '../../components/camera';
import { METERING_INFO, buildOsd, estimateShotsRemaining, formatFocus } from '../../components/viewfinder';
import type { Scenario } from '../../content/types';
import { progress } from '../../lib/progress';
import { cn } from '../../lib/cn';
import { SCENES } from '../../sim/scenes';
import { useCamera } from '../../state/useCamera';
import { EventConsole } from './EventConsole';
import type { CheckResult, ConsoleEvent, SettingDiff } from './EventConsole';
import { ExperimentList } from './ExperimentList';
import { EXPERIMENTS } from './experiments';
import type { Experiment, ExperimentResult } from './experiments';
import { fmtEV, fmtTime } from './format';
import { HELP_LEVELS, PARAM_NAME } from './levels';
import type { HelpLevel } from './levels';
import { bagSettings, liveContext, recipePatch, recipeSettings, simulate, snapSettings } from './model';
import type { ShotContext } from './model';
import { PLAYBOOKS } from './playbook';
import { ObjectiveStrip, RecipeStrip } from './RecipeStrip';
import { ScenarioNotes } from './ScenarioNotes';
import { ScenarioTool } from './ScenarioTool';
import { SimViewport } from './SimViewport';
import type { CompareShot } from './SimViewport';
import { WhySection } from './WhySection';

type InspectorTab = 'camera' | 'tool' | 'lab';

/** Valores legibles de una configuración, para el antes → después. */
function describeSettings(settings: CameraSettings, c: ShotContext): Array<[string, string]> {
  return [
    ['Modo', `${settings.mode}${settings.autoIso ? '+AUTO ISO' : ''}`],
    ['Apertura', formatAperture(c.s.aperture)],
    ['Velocidad', formatShutter(c.s.shutter)],
    ['ISO', formatIso(c.s.iso)],
    ['Focal', `${settings.focalMm} mm`],
    ['Distancia', formatFocus(settings.focusM)],
    ['AF', settings.af],
    ['Medición', METERING_INFO[settings.metering].short],
    ['Balance', formatKelvin(settings.wbK)],
    ['Formato', settings.format],
    ['Soporte', settings.tripod ? 'Trípode' : 'A pulso'],
    ['Exposición', fmtEV(c.m.exposureOffset)],
  ];
}

function diffSettings(beforeS: CameraSettings, before: ShotContext, afterS: CameraSettings, after: ShotContext): SettingDiff[] {
  const a = describeSettings(beforeS, before);
  const b = describeSettings(afterS, after);
  return a.flatMap(([label, from], i) => {
    const to = b[i]?.[1] ?? from;
    return to !== from ? [{ label, from, to }] : [];
  });
}

/** Firma de los ajustes efectivos (para saber si la última toma quedó desactualizada). */
const settingsKey = (s: CameraSettings) =>
  [s.mode, s.autoIso, s.aperture, s.shutter, s.iso, s.exposureComp, s.focalMm, s.focusM, s.wbK, s.af, s.metering, s.format, s.sensor, s.stabilizationStops, s.tripod].join('|');

/** Valor que cambia solo cuando `value` deja de cambiar durante `ms` (región viva). */
function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Zebras: icono de rayas a 45° como en el menú de la cámara. */
function ZebraIcon() {
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
      <path d="M4 13.5L11 2.5M8 13.5l6.5-10M1.5 10L6 2.5" />
    </svg>
  );
}

function Toggle({ pressed, label, onClick, children }: { pressed: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors',
        pressed ? 'border-amber/50 bg-amber-soft text-amber' : 'border-line bg-panel-2 text-muted hover:border-line-strong hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}

export interface ScenarioSessionProps {
  scenario: Scenario;
  index: number;
  total: number;
  level: HelpLevel;
  onLevelChange: (level: HelpLevel) => void;
  onNext: () => void;
  nextName: string;
}

export function ScenarioSession({ scenario, index, total, level, onLevelChange, onNext, nextName }: ScenarioSessionProps) {
  const scene = SCENES[scenario.id];
  const pb = PLAYBOOKS[scenario.id];
  const lighting = scene.lighting;
  const reduced = useReducedMotion() ?? false;

  // Cámara del bolso, receta completa y receta sin el último paso
  const bag = useMemo(() => bagSettings(scene), [scene]);
  const recipe = useMemo(() => recipeSettings(scenario, bag, { tripod: pb.tripod, focusM: pb.focusM }), [scenario, bag, pb]);
  const recipeCtx = useMemo(() => simulate(recipe, lighting, pb.lensMaxAperture), [recipe, lighting, pb]);
  const fullPatch = useMemo(() => recipePatch(recipe), [recipe]);
  const partialPatch = useMemo(() => ({ ...fullPatch, ...pb.missing.start }), [fullPatch, pb]);

  const cam = useCamera(lighting, bag, pb.lensMaxAperture);
  const ctx = liveContext(cam, lighting);

  // Visor
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zebra, setZebra] = useState(false);
  const [peaking, setPeaking] = useState(false);
  const [grid, setGrid] = useState(false);
  const [playing, setPlaying] = useState(() => typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [ready, setReady] = useState(false);

  // Estado de la sesión
  const [tab, setTab] = useState<InspectorTab>('camera');
  const [event, setEvent] = useState<ConsoleEvent | null>(null);
  const [shots, setShots] = useState(0);
  const [flashKey, setFlashKey] = useState(0);
  const [solved, setSolved] = useState(false);
  const [userRevealed, setUserRevealed] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [activeExp, setActiveExp] = useState<string | null>(null);
  const [expResults, setExpResults] = useState<Record<string, ExperimentResult>>({});
  const [busy, setBusy] = useState(false);
  const [compare, setCompare] = useState<CompareShot | null>(null);
  const eventId = useRef(0);
  const mounted = useRef(true);
  const renderWaiters = useRef<Array<() => void>>([]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Libera la imagen fijada al reemplazarla o al salir
  useEffect(() => {
    if (!compare) return;
    return () => URL.revokeObjectURL(compare.url);
  }, [compare]);

  // Tras cada cuadro: marca el visor como listo y avisa a quien espera el siguiente cuadro.
  const readyRef = useRef(false);
  const onFrame = useCallback(() => {
    if (!readyRef.current) {
      readyRef.current = true;
      setReady(true);
    }
    const waiters = renderWaiters.current;
    renderWaiters.current = [];
    waiters.forEach((w) => w());
  }, []);

  const nextRender = useCallback(
    () =>
      new Promise<void>((resolve) => {
        renderWaiters.current.push(resolve);
        window.setTimeout(resolve, 450);
      }),
    [],
  );

  /** Copia del cuadro actual (para la comparación A/B). */
  const snapshot = useCallback((): Promise<string | null> => {
    const c = canvasRef.current;
    if (!c || c.width === 0 || c.height === 0) return Promise.resolve(null);
    return new Promise((resolve) => {
      try {
        c.toBlob((b) => resolve(b ? URL.createObjectURL(b) : null), 'image/jpeg', 0.92);
      } catch {
        resolve(null);
      }
    });
  }, []);

  const showCompare = useCallback((url: string | null, a: string, b: string, wipe: boolean) => {
    if (!url) return;
    if (!mounted.current) {
      URL.revokeObjectURL(url);
      return;
    }
    setCompare({ url, a, b, wipe });
  }, []);

  const nextId = () => ++eventId.current;

  const introText = useMemo(() => {
    const bagLine = `M, ${formatAperture(bag.aperture)}, ${fmtTime(bag.shutter)}, ISO ${formatIso(bag.iso)}, AF-S y JPEG`;
    if (level === 'partial') {
      return `Pulsa «Aplicar los pasos dados»: la receta queda lista salvo ${PARAM_NAME[pb.missing.param]}. ${pb.missing.question} La pestaña «${pb.tool.tab}» te ayuda a calcularlo.`;
    }
    if (level === 'goal') {
      return `Sin receta. Parte de la cámara del bolso (${bagLine}), ajusta lo necesario para cumplir los ${pb.checks.length} criterios del objetivo y pulsa «Disparar».`;
    }
    return `Así sale la cámara del bolso: ${bagLine}. Pulsa «Aplicar la receta» para ver el antes y el después, o mueve tú los controles y pulsa «Disparar».`;
  }, [bag, level, pb]);

  /* ------------------------------------------------------------ Acciones */

  const applyRecipe = useCallback(async () => {
    const partial = level === 'partial';
    const patch = partial ? partialPatch : fullPatch;
    const beforeS = cam.settings;
    const before = liveContext(cam, lighting);
    const afterS = snapSettings({ ...cam.settings, ...patch });
    const after = simulate(afterS, lighting, pb.lensMaxAperture);
    const shot = snapshot();
    cam.set(patch);
    setActiveExp(null);
    setPulse((p) => p + 1);
    setEvent({
      kind: 'recipe',
      id: nextId(),
      partial,
      diffs: diffSettings(beforeS, before, afterS, after),
      next: partial
        ? `Falta ${PARAM_NAME[pb.missing.param]}: ${pb.missing.question}`
        : 'Arrastra el divisor del visor para comparar antes y después. Después, rómpela en «Experimentos».',
    });
    progress.mark('scenarios', scenario.id);
    showCompare(await shot, 'Antes', partial ? 'Pasos dados' : 'Receta', true);
  }, [cam, fullPatch, level, lighting, partialPatch, pb, scenario.id, showCompare, snapshot]);

  const shoot = useCallback(() => {
    const results: CheckResult[] = pb.checks.map((c) => ({ id: c.id, label: c.label, goal: c.goal, ...c.evaluate(ctx) }));
    const n = shots + 1;
    const allPass = results.every((r) => r.pass);
    setShots(n);
    setFlashKey((k) => k + 1);
    if (allPass) {
      progress.mark('scenarios', scenario.id);
      if (level !== 'full') setSolved(true);
    }
    const success =
      level === 'partial'
        ? `Toma lograda: elegiste bien ${PARAM_NAME[pb.missing.param]}. El valor de la receta ya está a la vista en la tarjeta.`
        : level === 'goal'
          ? 'Toma lograda sin receta. La explicación completa ya está abierta en «Por qué funciona».'
          : 'Toma lograda: cumple todos los criterios. Prueba ahora a romper la receta en «Experimentos».';
    setEvent({ kind: 'shot', id: nextId(), n, results, success, settingsKey: settingsKey(cam.effective) });
  }, [cam.effective, ctx, level, pb, scenario.id, shots]);

  const runExperiment = useCallback(
    async (exp: Experiment) => {
      if (busy) return;
      setBusy(true);
      try {
        // La toma A es la receta: si la cámara no está en ella, primero se aplica y se espera el cuadro.
        if (settingsKey(cam.settings) !== settingsKey(recipe)) {
          cam.set(fullPatch);
          await nextRender();
        }
        const shot = snapshot();
        const patch = exp.patch(recipe, recipeCtx);
        cam.set(patch);
        const now = simulate(snapSettings({ ...recipe, ...patch }), lighting, pb.lensMaxAperture);
        const res = exp.explain(now, recipeCtx);
        if (!mounted.current) return;
        setExpResults((r) => ({ ...r, [exp.id]: res }));
        setActiveExp(exp.id);
        setEvent({ kind: 'experiment', id: nextId(), title: exp.title, observed: res.observed });
        progress.mark('scenarios', scenario.id);
        showCompare(await shot, 'Receta', exp.title, false);
      } finally {
        if (mounted.current) setBusy(false);
      }
    },
    [busy, cam, fullPatch, lighting, nextRender, pb, recipe, recipeCtx, scenario.id, showCompare, snapshot],
  );

  const backToRecipe = useCallback(() => {
    cam.set(fullPatch);
    setActiveExp(null);
    setCompare(null);
  }, [cam, fullPatch]);

  const resetBag = useCallback(() => {
    cam.reset(bag);
    setActiveExp(null);
    setCompare(null);
    setEvent({ kind: 'reset', id: nextId(), text: `${introText}` });
  }, [bag, cam, introText]);

  const pinA = useCallback(async () => {
    showCompare(await snapshot(), 'Fijada', 'Ahora', false);
  }, [showCompare, snapshot]);

  const changeLevel = (l: HelpLevel) => {
    onLevelChange(l);
    cam.reset(bag);
    setSolved(false);
    setUserRevealed(false);
    setActiveExp(null);
    setCompare(null);
    setEvent(null);
  };

  /* ------------------------------------------------------------ Derivados para la vista */

  const liveOutcomes = pb.checks.map((c) => ({ c, o: c.evaluate(ctx) }));
  const canvasLabel = `Imagen simulada: ${scene.name}. ${liveOutcomes.map(({ c, o }) => `${c.label}: ${o.value}`).join('; ')}.`;
  const liveSummary = useDebounced(
    `${scenario.name}. Exposición ${fmtEV(cam.metrics.exposureOffset)}. ` +
      liveOutcomes
        .slice(1, 3)
        .map(({ c, o }) => `${c.label}: ${o.value}`)
        .join('. '),
    500,
  );

  const osd = buildOsd(cam, { shotsRemaining: Math.max(0, estimateShotsRemaining(cam.settings.format, cam.settings.sensor) - shots) });
  const warnings = cam.metrics.shakeRatio > 1.5 ? ['Riesgo de trepidación'] : [];
  const consoleEvent: ConsoleEvent = event ?? { kind: 'intro', text: introText };
  const showLive = level === 'full' || solved;
  const revealed = level !== 'goal' || solved || userRevealed;

  const tabs: Array<{ id: InspectorTab; label: string; icon: LucideIcon }> = [
    { id: 'camera', label: 'Cámara', icon: SlidersHorizontal },
    { id: 'tool', label: pb.tool.tab, icon: Ruler },
    { id: 'lab', label: 'Experimentos', icon: FlaskConical },
  ];
  const tabRefs = useRef<Partial<Record<InspectorTab, HTMLButtonElement | null>>>({});
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.id === tab);
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = tabs.length - 1;
    const t = next === null ? undefined : tabs[next];
    if (!t) return;
    e.preventDefault();
    setTab(t.id);
    tabRefs.current[t.id]?.focus();
  };

  return (
    <div className="space-y-5">
      {/* Briefing */}
      <section
        aria-labelledby="sb-brief-title"
        className="flex flex-col gap-3 rounded-lg border border-line bg-panel px-4 py-3 xl:flex-row xl:items-center xl:justify-between xl:gap-6"
      >
        <div className="min-w-0">
          <h2 id="sb-brief-title" className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[16px] font-semibold">
            {scenario.name}
            <span className="osd text-[11px] font-normal text-faint">
              {index + 1}/{total} · EV100 {scene.lighting.ev100} · luz {formatKelvin(scene.lighting.illuminantK)}
            </span>
          </h2>
          <p className="mt-0.5 text-[13.5px] leading-snug text-muted">
            {scene.description} <span className="text-faint">Sujeto principal: {scene.subjectLabel.toLowerCase()}.</span>
          </p>
        </div>
        <div className="shrink-0">
          <Segmented<HelpLevel>
            label="Nivel de ayuda"
            hideLabel
            size="sm"
            stretch
            value={level}
            onChange={changeLevel}
            className="[&_button]:whitespace-nowrap"
            options={HELP_LEVELS.map((l, i) => ({
              value: l.id,
              ariaLabel: l.label,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <span className="osd text-faint">{i + 1}</span>
                  <span className="sm:hidden">{l.short}</span>
                  <span className="hidden sm:inline">{l.label}</span>
                </span>
              ),
            }))}
          />
          <p className="mt-1 text-xs leading-snug text-faint">{HELP_LEVELS.find((l) => l.id === level)?.description}</p>
        </div>
      </section>

      {/* Espacio de trabajo */}
      <div className="grid gap-4 max-md:[&_button]:scroll-mt-80 max-md:[&_input]:scroll-mt-80 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start xl:gap-6">
        <div className="contents xl:flex xl:flex-col xl:gap-3 [@media(min-width:1280px)_and_(min-height:760px)]:sticky [@media(min-width:1280px)_and_(min-height:760px)]:top-6">
          <div className="sticky top-[53px] z-20 -mx-4 bg-bg px-4 pb-2 pt-1 shadow-[0_10px_14px_-12px_rgb(0_0_0/0.9)] sm:-mx-6 sm:px-6 md:static md:mx-0 md:p-0 md:shadow-none">
            <SimViewport
              canvasRef={canvasRef}
              sceneId={scenario.id}
              settings={cam.effective}
              zebras={zebra}
              peaking={peaking}
              live={pb.live && playing}
              onFrame={onFrame}
              osd={osd}
              warnings={warnings}
              showGrid={grid}
              canvasLabel={canvasLabel}
              compare={compare}
              flashKey={flashKey}
              reduced={reduced}
            />
          </div>

          {level === 'goal' ? (
            <ObjectiveStrip checks={pb.checks} subject={scene.subjectLabel.toLowerCase()} />
          ) : (
            <RecipeStrip scenario={scenario} playbook={pb} recipe={recipeCtx} cam={cam} level={level} solved={solved} pulse={pulse} reduced={reduced} />
          )}

          <div className="@container">
            <div className="flex flex-wrap items-center gap-2">
              {level !== 'goal' && (
                <Button variant="primary" className="h-11 flex-1 sm:flex-none xl:h-10" icon={<WandSparkles size={16} aria-hidden="true" />} onClick={applyRecipe} disabled={busy}>
                  {level === 'partial' ? 'Aplicar los pasos dados' : 'Aplicar la receta'}
                </Button>
              )}
              <Button variant="secondary" className="h-11 flex-1 border-amber/40 sm:flex-none xl:h-10" icon={<Camera size={16} aria-hidden="true" />} onClick={shoot}>
                Disparar
              </Button>
              {/* Entre 512 y 672 px de ancho los rótulos secundarios quedan solo para lectores de pantalla */}
              <div className="flex w-full flex-wrap items-center gap-1.5 @lg:ml-auto @lg:w-auto">
                {compare ? (
                  <Button size="sm" variant="ghost" className="h-9 border border-line" title="Quitar la comparación A/B" icon={<X size={14} aria-hidden="true" />} onClick={() => setCompare(null)}>
                    <span className="@lg:@max-2xl:sr-only">Quitar A/B</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 border border-line"
                    title="Fijar la toma actual como A para compararla"
                    icon={<Columns2 size={14} aria-hidden="true" />}
                    onClick={pinA}
                    disabled={!ready}
                  >
                    <span className="@lg:@max-2xl:sr-only">Fijar A</span>
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-9 border border-line" title="Volver a la cámara como salió del bolso" icon={<RotateCcw size={14} aria-hidden="true" />} onClick={resetBag}>
                  <span className="@lg:@max-2xl:sr-only">Del bolso</span>
                </Button>
                <span className="mx-0.5 hidden h-5 w-px bg-line @lg:block" aria-hidden="true" />
                <span className="ml-auto flex items-center gap-1.5 @lg:ml-0">
                  <Toggle pressed={zebra} label="Zebras en altas luces" onClick={() => setZebra((v) => !v)}>
                    <ZebraIcon />
                  </Toggle>
                  <Toggle pressed={peaking} label="Focus peaking" onClick={() => setPeaking((v) => !v)}>
                    <Focus size={16} aria-hidden="true" />
                  </Toggle>
                  <Toggle pressed={grid} label="Cuadrícula de tercios" onClick={() => setGrid((v) => !v)}>
                    <Grid3x3 size={16} aria-hidden="true" />
                  </Toggle>
                  {pb.live && (
                    <Toggle pressed={!playing} label={playing ? 'Pausar el movimiento' : 'Reanudar el movimiento'} onClick={() => setPlaying((v) => !v)}>
                      {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                    </Toggle>
                  )}
                </span>
              </div>
            </div>
          </div>

          <EventConsole event={consoleEvent} currentKey={settingsKey(cam.effective)} />
        </div>

        {/* Panel lateral */}
        <div className="min-w-0">
          <div role="tablist" aria-label="Panel de la cámara" onKeyDown={onTabKey} className="flex gap-1 rounded-md border border-line bg-ink p-1">
            {tabs.map((t) => {
              const active = t.id === tab;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tabRefs.current[t.id] = el;
                  }}
                  id={`sb-itab-${t.id}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={active ? `sb-ipanel-${t.id}` : undefined}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'inline-flex h-9 min-w-0 flex-auto items-center justify-center gap-1.5 rounded-sm px-2.5 text-[12.5px] font-medium transition-colors',
                    active ? 'bg-raised text-fg shadow-[inset_0_0_0_1px_var(--color-line-strong)]' : 'text-muted hover:bg-panel-2 hover:text-fg',
                  )}
                >
                  <Icon size={14} className={cn('shrink-0', active ? 'text-amber' : 'text-faint')} aria-hidden="true" />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>

          <div role="tabpanel" id={`sb-ipanel-${tab}`} aria-labelledby={`sb-itab-${tab}`} className="mt-3">
            {tab === 'camera' && (
              <div className="flex flex-col gap-3">
                <Panel padded={false} className="p-4">
                  <ModeDial value={cam.settings.mode} onChange={(mode) => cam.set({ mode })} />
                  <div className="mt-6">
                    <ExposureControls cam={cam} lensMaxAperture={pb.lensMaxAperture} />
                  </div>
                </Panel>
                <QuickSettings cam={cam} show={pb.quick} focalRange={scene.focalRange} />
              </div>
            )}
            {tab === 'tool' && (
              <div>
                <h3 className="mb-3 text-[14px] font-semibold text-fg">{pb.tool.title}</h3>
                <ScenarioTool kind={pb.tool.kind} cam={cam} lighting={lighting} lensMaxAperture={pb.lensMaxAperture} />
              </div>
            )}
            {tab === 'lab' && (
              <div>
                <h3 className="mb-2 text-[14px] font-semibold text-fg">Rompe la receta</h3>
                {level === 'goal' && !solved && (
                  <Callout kind="tip" className="mb-3">
                    Cada experimento parte de la receta y la deja a la vista en el visor. Si quieres resolver la toma sin ayuda, déjalos para el final.
                  </Callout>
                )}
                <ExperimentList
                  experiments={EXPERIMENTS[scenario.id]}
                  activeId={activeExp}
                  results={expResults}
                  busy={busy}
                  onRun={runExperiment}
                  onBack={backToRecipe}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {liveSummary}
      </div>

      <WhySection
        scenario={scenario}
        checks={pb.checks}
        recipe={recipeCtx}
        live={ctx}
        showLive={showLive}
        revealed={revealed}
        onReveal={() => setUserRevealed(true)}
      />

      <ScenarioNotes scenario={scenario} />

      <div className="flex flex-col items-start justify-between gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
        <p className="text-[13.5px] text-muted">
          ¿Listo? El siguiente escenario es <span className="text-fg">{nextName}</span>.
        </p>
        <Button variant="secondary" onClick={onNext} icon={<ArrowRight size={15} aria-hidden="true" />}>
          Siguiente escenario
        </Button>
      </div>
    </div>
  );
}
