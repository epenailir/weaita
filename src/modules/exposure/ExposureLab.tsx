/**
 * Módulo estrella "Triángulo de exposición": escena con luz real, visor simulado con OSD,
 * controles P/A/S/M, medidores de costo vinculados, Disparar con diagnóstico, comparación A/B
 * y teoría con predicciones que se comprueban en el visor.
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, BookOpen, Crosshair, RotateCcw, Target } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import type { PageProps } from '../../App';
import { ExposureControls, ModeDial, QuickSettings } from '../../components/camera';
import { Button, SectionHeader } from '../../components/ui';
import { EXPOSURE_LESSONS } from '../../content/lessons';
import { APERTURES, ISOS, SHUTTERS, formatAperture, formatIso, nearestStop, stops } from '../../engine';
import type { CameraSettings, StopValue } from '../../engine';
import { DEFAULT_SETTINGS, useCamera } from '../../state/useCamera';
import type { UseCamera } from '../../state/useCamera';
import { SCENES } from '../../sim/scenes';
import type { RenderResult, SceneId } from '../../sim/types';
import { cn } from '../../lib/cn';
import type { Advice } from './advice';
import { assess, shutterText, stopMagnitude } from './assessment';
import type { ShotContext } from './assessment';
import { cloneHistogram, frameMatches, snapshotCanvas } from './capture';
import { CompareAB } from './CompareAB';
import type { FrameSubscribe } from './CompareAB';
import { CostMeters } from './CostMeters';
import type { MeterGroup } from './CostMeters';
import { DiagnosisPanel } from './DiagnosisPanel';
import { diagnose, liveSummary } from './diagnosis';
import type { Shot } from './diagnosis';
import { prefersReducedMotion, useDelayedAnnouncement } from './hooks';
import { LabToolbar } from './LabToolbar';
import { LabViewfinder } from './LabViewfinder';
import { LessonDeck, markLesson, shortTitle } from './LessonDeck';
import { Misconceptions } from './Misconceptions';
import { SceneBriefCard, ScenePicker } from './ScenePicker';
import { SCENE_BRIEFS, sceneSettings } from './sceneBriefs';
import { ShotStrip } from './ShotStrip';
import { useExperimentRunner } from './useExperiment';

const MAX_SHOTS = 6;
const SHOT_FALLBACK_MS = 1500;

type TriadKey = 'aperture' | 'shutter' | 'iso';
type Touched = TriadKey | 'exposureComp' | 'metering' | 'mode' | 'focus' | 'focal' | 'sensor' | 'stabilization' | 'tripod' | 'format' | 'wb' | 'af';

const TOUCH_KEY: Partial<Record<keyof CameraSettings, Touched>> = {
  aperture: 'aperture',
  shutter: 'shutter',
  iso: 'iso',
  autoIso: 'iso',
  exposureComp: 'exposureComp',
  metering: 'metering',
  mode: 'mode',
  focusM: 'focus',
  focalMm: 'focal',
  sensor: 'sensor',
  stabilizationStops: 'stabilization',
  tripod: 'tripod',
  format: 'format',
  wbK: 'wb',
  af: 'af',
};

/** Lección y grupo de medidores que activa cada control, y cómo nombrarlo en una frase. */
const TOUCH_INFO: Record<Touched, { lesson: string | null; group: MeterGroup | null; name: string }> = {
  aperture: { lesson: 'aperture', group: 'aperture', name: 'la apertura' },
  shutter: { lesson: 'shutter-speed', group: 'shutter', name: 'la velocidad' },
  iso: { lesson: 'iso', group: 'iso', name: 'el ISO' },
  exposureComp: { lesson: 'exposure-compensation', group: null, name: 'la compensación' },
  metering: { lesson: 'metering', group: null, name: 'el modo de medición' },
  mode: { lesson: 'exposure-triangle', group: null, name: 'el modo de exposición' },
  focus: { lesson: 'depth-of-field', group: 'aperture', name: 'el enfoque' },
  focal: { lesson: 'depth-of-field', group: 'aperture', name: 'la focal' },
  sensor: { lesson: 'depth-of-field', group: 'aperture', name: 'el sensor' },
  stabilization: { lesson: 'shutter-speed', group: 'shutter', name: 'la estabilización' },
  tripod: { lesson: 'shutter-speed', group: 'shutter', name: 'el trípode' },
  format: { lesson: 'histogram', group: null, name: 'el formato' },
  wb: { lesson: null, group: null, name: 'el balance de blancos' },
  af: { lesson: null, group: null, name: 'el modo de enfoque' },
};

const TRIAD_SCALE: Record<TriadKey, StopValue[]> = { aperture: APERTURES, shutter: SHUTTERS, iso: ISOS };
const TRIAD_NAME: Record<TriadKey, string> = { aperture: 'la apertura', shutter: 'la velocidad', iso: 'el ISO' };

function triadText(k: TriadKey, v: number): string {
  return k === 'aperture' ? formatAperture(v) : k === 'shutter' ? shutterText(v) : `ISO ${formatIso(v)}`;
}

interface MeteredPlan {
  patch: Partial<CameraSettings> | null;
  message: string;
}

/** "Exposición medida": lleva el exposímetro a su objetivo moviendo el parámetro activo en M. */
function meteredPlan(cam: UseCamera, preferred: TriadKey, explicit: boolean): MeteredPlan {
  const { settings: s, effective: e, metrics: m } = cam;
  if (s.mode !== 'M') return { patch: null, message: `En modo ${s.mode} la cámara ya lo hace sola: sigue al exposímetro y a la compensación.` };
  const target = s.autoIso ? s.exposureComp : 0;
  const delta = m.meterReading - target;
  if (Math.abs(delta) < 1 / 6) return { patch: null, message: 'El exposímetro ya marca 0.' };
  const param: TriadKey = preferred === 'iso' && s.autoIso ? 'shutter' : preferred;
  const from = e[param];
  const raw = param === 'aperture' ? from * Math.pow(2, delta / 2) : from * Math.pow(2, -delta);
  const to = nearestStop(TRIAD_SCALE[param], raw).value;
  const gained = param === 'aperture' ? stops.aperture(from, to) : param === 'shutter' ? stops.shutter(from, to) : stops.iso(from, to);
  const residual = delta + gained;
  const who = `${TRIAD_NAME[param]}${explicit ? ' (el último control que tocaste)' : ''}`;
  if (nearestStop(TRIAD_SCALE[param], from).index === nearestStop(TRIAD_SCALE[param], to).index) {
    return { patch: null, message: `${TRIAD_NAME[param].charAt(0).toUpperCase()}${TRIAD_NAME[param].slice(1)} ya está en su límite: mueve otro control.` };
  }
  const short = Math.abs(residual) >= 1 / 6 ? ` Llega al límite de la escala: quedarán ${stopMagnitude(residual)} de desvío.` : '';
  return {
    patch: { [param]: to },
    message: `Ajusta ${who}: ${triadText(param, from)} → ${triadText(param, to)}.${short}`,
  };
}

export function ExposureLab({ onNavigate }: PageProps) {
  const reduce = useReducedMotion();
  const [sceneId, setSceneId] = useState<SceneId>('plaza');
  const scene = SCENES[sceneId];
  const brief = SCENE_BRIEFS[sceneId];
  const cam = useCamera(scene.lighting, sceneSettings(scene));
  const { settings, effective, resolved, metrics } = cam;

  // Asistentes del visor
  const [live, setLive] = useState(() => !prefersReducedMotion());
  const [zebras, setZebras] = useState(false);
  const [grid, setGrid] = useState(false);
  const [level, setLevel] = useState(false);
  const [roll, setRoll] = useState(0);
  const [peaking, setPeaking] = useState(true);
  const [pinned, setPinned] = useState(true);

  // Último control tocado (destaca medidores y teoría)
  const [lastTouched, setLastTouched] = useState<Touched | null>(null);
  const [lastTriad, setLastTriad] = useState<{ key: TriadKey; explicit: boolean }>({ key: 'shutter', explicit: false });
  const [relevant, setRelevant] = useState<{ lesson: string; name: string } | null>(null);
  const [lessonId, setLessonId] = useState<string>(EXPOSURE_LESSONS[0]!.id);

  // Tomas
  const [shots, setShots] = useState<Shot[]>([]);
  const [selectedShot, setSelectedShot] = useState<number | null>(null);
  const [shotA, setShotA] = useState<number | null>(null);
  const [shutterKey, setShutterKey] = useState(0);
  const [shooting, setShooting] = useState(false);
  const [appliedKey, setAppliedKey] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<RenderResult | null>(null);
  const nextShotId = useRef(1);
  const pendingShot = useRef(false);
  const listeners = useRef(new Set<() => void>());

  // Valores vigentes para los callbacks que llegan con cada cuadro.
  const latest = useRef({ cam, scene, brief, sceneId, roll, shotA });
  useLayoutEffect(() => {
    latest.current = { cam, scene, brief, sceneId, roll, shotA };
  });

  /* ---------------------------------------------------------- Escenas */

  const baseFor = useCallback((id: SceneId): CameraSettings => {
    const cur = latest.current.cam.settings;
    return {
      ...DEFAULT_SETTINGS,
      mode: cur.mode,
      autoIso: cur.autoIso,
      af: cur.af,
      metering: cur.metering,
      format: cur.format,
      sensor: cur.sensor,
      stabilizationStops: cur.stabilizationStops,
      tripod: cur.tripod,
      ...sceneSettings(SCENES[id]),
    };
  }, []);

  const switchScene = useCallback((id: SceneId, next: CameraSettings) => {
    setSceneId(id);
    latest.current.cam.reset(next);
  }, []);

  const experiments = useExperimentRunner({ sceneId, cam, canvasRef, frameRef, baseFor, switchScene });
  const { forget: forgetExperiment, check: checkExperiment } = experiments;

  const changeScene = useCallback(
    (id: SceneId) => {
      if (id === latest.current.sceneId) return;
      forgetExperiment();
      switchScene(id, baseFor(id));
    },
    [baseFor, switchScene, forgetExperiment],
  );

  const resetScene = () => {
    forgetExperiment();
    cam.reset(sceneSettings(scene));
    setRoll(0);
    setAppliedKey(null);
  };

  /* ---------------------------------------------------------- Controles con seguimiento */

  const noteTouch = useCallback((patch: Partial<CameraSettings>) => {
    for (const k of Object.keys(patch) as Array<keyof CameraSettings>) {
      const t = TOUCH_KEY[k];
      if (!t) continue;
      setLastTouched(t);
      if (t === 'aperture' || t === 'shutter' || t === 'iso') setLastTriad({ key: t, explicit: true });
      const { lesson, name } = TOUCH_INFO[t];
      if (lesson) setRelevant((r) => (r && r.lesson === lesson && r.name === name ? r : { lesson, name }));
      return;
    }
  }, []);

  const tracked = useMemo<UseCamera>(
    () => ({
      ...cam,
      set: (patch) => {
        noteTouch(patch);
        cam.set(patch);
      },
    }),
    [cam, noteTouch],
  );

  /* ---------------------------------------------------------- Disparar */

  const trySnapshot = useCallback((force = false) => {
    if (!pendingShot.current) return;
    const { cam: c, scene: sc, brief: br, sceneId: id, roll: r } = latest.current;
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    if (!frame || !canvas) {
      if (force) {
        pendingShot.current = false;
        setShooting(false);
      }
      return;
    }
    if (!force && !frameMatches(frame.metrics, c.metrics)) return;
    pendingShot.current = false;
    const image = snapshotCanvas(canvas, { rollDeg: r });
    const histogram = cloneHistogram(frame.histogram);
    const ctx: ShotContext = {
      scene: sc,
      brief: br,
      settings: c.settings,
      effective: c.effective,
      metrics: c.metrics,
      limited: c.resolved.limited,
      highlightsPct: histogram.clippedHighlightsPct,
      rollDeg: r,
    };
    // El diagnóstico (búsqueda de correcciones) se calcula después de pintar la cortinilla.
    window.setTimeout(() => {
      const shot: Shot = {
        id: nextShotId.current++,
        sceneId: id,
        sceneName: sc.name,
        image,
        settings: c.settings,
        effective: c.effective,
        metrics: c.metrics,
        histogram,
        limited: c.resolved.limited,
        rollDeg: r,
        diagnosis: diagnose(ctx),
      };
      setShots((prev) => {
        const next = [...prev, shot];
        const keep = latest.current.shotA;
        while (next.length > MAX_SHOTS) {
          const drop = next.findIndex((s) => s.id !== keep);
          next.splice(drop < 0 ? 0 : drop, 1);
        }
        return next;
      });
      setSelectedShot(shot.id);
      setAppliedKey(null);
      setShooting(false);
    }, 30);
  }, []);

  const shoot = () => {
    pendingShot.current = true;
    setShooting(true);
    setShutterKey((k) => k + 1);
    trySnapshot();
    window.setTimeout(() => trySnapshot(true), SHOT_FALLBACK_MS);
  };

  const handleFrame = useCallback(
    (frame: RenderResult) => {
      frameRef.current = frame;
      trySnapshot();
      checkExperiment();
      listeners.current.forEach((fn) => fn());
    },
    [trySnapshot, checkExperiment],
  );

  const subscribe = useCallback<FrameSubscribe>((fn) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  const applyAdvice = (shot: Shot, advice: Advice) => {
    if (advice.action.kind === 'level') {
      setRoll(0);
    } else if (advice.action.kind === 'settings') {
      const target: CameraSettings = { ...shot.settings, ...advice.action.patch };
      forgetExperiment();
      if (shot.sceneId !== sceneId) switchScene(shot.sceneId, target);
      else cam.reset(target);
    }
    setAppliedKey(`${shot.id}-${advice.criterion}`);
  };

  /** Desplaza hasta una sección descontando la barra superior y, dentro del laboratorio, el visor fijo. */
  const scrollToId = (id: string, insideLab = false) => {
    const el = document.getElementById(id);
    if (!el) return;
    let offset = window.matchMedia('(min-width: 1024px)').matches ? 16 : 69;
    const pin = pinRef.current;
    if (insideLab && pin && getComputedStyle(pin).position === 'sticky') offset += pin.offsetHeight;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: reduce ? 'auto' : 'smooth' });
    el.focus({ preventScroll: true });
  };

  /* ---------------------------------------------------------- Evaluación en vivo */

  const ctx = useMemo<ShotContext>(
    () => ({ scene, brief, settings, effective, metrics, limited: resolved.limited, highlightsPct: null, rollDeg: roll }),
    [scene, brief, settings, effective, metrics, resolved.limited, roll],
  );
  const assessment = useMemo(() => assess(ctx), [ctx]);
  const summary = useMemo(() => liveSummary(ctx, assessment), [ctx, assessment]);
  const announced = useDelayedAnnouncement(summary, 500);

  const plan = useMemo(() => meteredPlan(cam, lastTriad.key, lastTriad.explicit), [cam, lastTriad]);
  const activeGroup = lastTouched ? TOUCH_INFO[lastTouched].group : null;
  const relevantLesson = relevant ? EXPOSURE_LESSONS.find((l) => l.id === relevant.lesson) : undefined;

  const selected = shots.find((s) => s.id === selectedShot) ?? null;
  const aShot = shots.find((s) => s.id === shotA) ?? null;
  const manualFocus = settings.af === 'MF';

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Simulador · Módulo 1"
        title="Triángulo de exposición"
        description="Mueve apertura, velocidad e ISO sobre una escena con luz real: imagen, histograma y medidores cambian juntos. Pulsa Disparar para recibir un diagnóstico."
        actions={
          <div className="hidden gap-2 md:flex">
            <Button variant="ghost" icon={<BookOpen size={15} aria-hidden="true" />} onClick={() => scrollToId('teoria')}>
              Ir a la teoría
            </Button>
            <Button variant="secondary" icon={<Target size={15} aria-hidden="true" />} onClick={() => onNavigate('desafios')}>
              Desafíos
            </Button>
          </div>
        }
      />

      <ScenePicker value={sceneId} onChange={changeScene} />
      <SceneBriefCard scene={scene} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:grid-rows-[auto_1fr] xl:gap-6">
        <div className="contents xl:col-start-1 xl:row-start-1 xl:flex xl:min-w-0 xl:flex-col xl:gap-4">
          <div
            ref={pinRef}
            className={cn(
              'min-w-0',
              pinned &&
                '[@media(max-width:767px)_and_(min-height:600px)]:sticky [@media(max-width:767px)_and_(min-height:600px)]:top-[53px] [@media(max-width:767px)_and_(min-height:600px)]:z-20 [@media(max-width:767px)_and_(min-height:600px)]:-mx-4 [@media(max-width:767px)_and_(min-height:600px)]:bg-bg/95 [@media(max-width:767px)_and_(min-height:600px)]:px-4 [@media(max-width:767px)_and_(min-height:600px)]:py-2 [@media(max-width:767px)_and_(min-height:600px)]:backdrop-blur',
            )}
          >
            <LabViewfinder
              canvasRef={canvasRef}
              sceneId={sceneId}
              scene={scene}
              brief={brief}
              cam={cam}
              live={live}
              zebras={zebras}
              peaking={manualFocus && peaking}
              grid={grid}
              level={level}
              rollDeg={roll}
              shutterKey={shutterKey}
              onFrame={handleFrame}
            />
          </div>
          <LabToolbar
            onShoot={shoot}
            shooting={shooting}
            shotCount={shots.length}
            maxShots={MAX_SHOTS}
            live={live}
            onLive={setLive}
            zebras={zebras}
            onZebras={(v) => {
              setZebras(v);
              setRelevant({ lesson: 'histogram', name: 'las zebras' });
            }}
            grid={grid}
            onGrid={setGrid}
            level={level}
            onLevel={setLevel}
            peaking={peaking}
            onPeaking={setPeaking}
            manualFocus={manualFocus}
            rollDeg={roll}
            onRoll={setRoll}
            pinned={pinned}
            onPinned={setPinned}
          />
          <ShotStrip
            shots={shots}
            max={MAX_SHOTS}
            selectedId={selectedShot}
            aId={shotA}
            onSelect={setSelectedShot}
            onOpenDiagnosis={() => scrollToId('diagnostico', true)}
          />
        </div>

        <aside
          aria-labelledby="controles-title"
          className="min-w-0 rounded-lg border border-line bg-panel xl:sticky xl:top-6 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:max-h-[calc(100dvh-3rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain"
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3 xl:sticky xl:top-0 xl:z-10 xl:bg-panel">
            <h2 id="controles-title" className="text-[14px] font-semibold text-fg">
              Controles
            </h2>
            <Button size="sm" variant="ghost" icon={<RotateCcw size={14} aria-hidden="true" />} onClick={resetScene}>
              Restablecer escena
            </Button>
          </div>
          <div className="grid gap-7 px-5 py-5 md:grid-cols-2 xl:block xl:space-y-7">
            <div className="min-w-0 space-y-7">
              <ModeDial value={settings.mode} onChange={(mode) => tracked.set({ mode })} />
              <ExposureControls cam={tracked} />

              <div className="rounded-md border border-line bg-panel-2 p-3">
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  icon={<Crosshair size={14} aria-hidden="true" />}
                  disabled={!plan.patch}
                  aria-describedby="medida-ayuda"
                  onClick={() => {
                    if (plan.patch) {
                      cam.set(plan.patch);
                      setRelevant({ lesson: 'stops', name: 'la exposición medida' });
                    }
                  }}
                >
                  Exposición medida
                </Button>
                <p id="medida-ayuda" className="mt-2 text-[12px] leading-snug text-faint">
                  {plan.message}
                </p>
              </div>

              <CostMeters ctx={ctx} assessment={assessment} active={activeGroup} />

              {relevantLesson && relevant && (
                <button
                  type="button"
                  onClick={() => {
                    setLessonId(relevantLesson.id);
                    markLesson(relevantLesson.id);
                    scrollToId('teoria');
                  }}
                  className="flex w-full items-center gap-3 rounded-md border border-amber/30 bg-amber-soft px-3 py-2.5 text-left transition-colors hover:border-amber/60"
                >
                  <BookOpen size={16} className="shrink-0 text-amber" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="eyebrow block !text-amber">Teoría vinculada</span>
                    <span className="block truncate text-[13px] font-medium text-fg">{shortTitle(relevantLesson)}</span>
                    <span className="block text-[11.5px] text-muted">Porque acabas de mover {relevant.name}</span>
                  </span>
                  <ArrowDown size={15} className="shrink-0 text-amber" aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="min-w-0 border-line md:border-l md:pl-6 xl:border-l-0 xl:border-t xl:pl-0 xl:pt-7">
              <QuickSettings cam={tracked} focalRange={scene.focalRange} />
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-5 xl:col-start-1 xl:row-start-2">
          {selected && (
            <DiagnosisPanel
              key={selected.id}
              shot={selected}
              isA={selected.id === shotA}
              onSetA={() => setShotA(selected.id)}
              onApply={applyAdvice}
              appliedKey={appliedKey}
            />
          )}
          {aShot && (
            <CompareAB
              shot={aShot}
              current={{ sceneName: scene.name, settings, effective, metrics }}
              source={canvasRef}
              subscribe={subscribe}
              rollDeg={roll}
              onClear={() => setShotA(null)}
            />
          )}
        </div>
      </div>

      <section id="teoria" tabIndex={-1} aria-labelledby="teoria-title" className="scroll-mt-20 border-t border-line pt-10 focus:outline-none">
        <div className="eyebrow mb-2">Teoría vinculada</div>
        <h2 id="teoria-title" className="text-xl font-semibold md:text-2xl">
          La física detrás de lo que ves en el visor
        </h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted">
          Cada lección resume lo esencial y termina con una predicción: elige qué crees que pasará y compruébalo en el visor antes de leer la explicación.
          La pestaña marcada con un punto ámbar es la del último control que moviste.
        </p>
        <div className="mt-6">
          <LessonDeck
            selectedId={lessonId}
            onSelect={setLessonId}
            relevantId={relevant?.lesson ?? null}
            relevantReason={relevant?.name ?? null}
            run={experiments.run}
            currentScene={sceneId}
            onRun={experiments.start}
            onRestore={experiments.restore}
          />
        </div>
        <Misconceptions run={experiments.run} currentScene={sceneId} onRun={experiments.start} onRestore={experiments.restore} />
      </section>

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announced}
      </div>
    </div>
  );
}
