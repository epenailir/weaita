/**
 * Vista de un desafío: tarjeta de misión, visor con la escena simulada, criterios en vivo,
 * controles en modo M con bloqueos, botón "Disparar" con diagnóstico, pistas progresivas e
 * historial de intentos. Se monta con key = id del desafío para empezar siempre de cero.
 */
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Grid3x3, Lightbulb, Lock, RotateCcw, ScanLine, Camera, CheckCircle2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { evaluateTargets, formatAperture, formatEV, formatIso } from '../../engine';
import { Viewfinder, buildOsd } from '../../components/viewfinder';
import { Badge, Button, IconButton } from '../../components/ui';
import { SCENES, useSimRenderer } from '../../sim';
import type { Challenge } from '../../content/types';
import { progress } from '../../lib/progress';
import { cn } from '../../lib/cn';
import { useCamera } from '../../state/useCamera';
import { ChallengeControls, focalsFor } from './ChallengeControls';
import { ShotFeedback } from './ShotFeedback';
import type { ShotOutcome } from './ShotFeedback';
import { TargetChecklist } from './TargetChecklist';
import { ALL_PARAMS, LEVEL_INFO, PARAM_LABEL, initialSettings, shutterText } from './model';

interface Attempt {
  n: number;
  aperture: number;
  shutter: number;
  iso: number;
  focal: number;
  passed: number;
  total: number;
  success: boolean;
}

const EXPOSURE_WORD = {
  under: 'subexpuesta',
  ok: 'bien expuesta',
  over: 'sobreexpuesta',
} as const;

function ToggleChip({ pressed, onClick, icon, children }: { pressed: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[12.5px] font-medium transition-colors duration-150',
        pressed ? 'border-amber/40 bg-amber-soft text-amber' : 'border-line bg-panel-2 text-muted hover:border-line-strong hover:text-fg',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export interface ChallengeRunnerProps {
  challenge: Challenge;
  index: number;
  total: number;
  solved: boolean;
  onBack: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
}

export function ChallengeRunner({ challenge, index, total, solved, onBack, onPrev, onNext }: ChallengeRunnerProps) {
  const scene = SCENES[challenge.sceneId];
  const initial = useMemo(() => initialSettings(challenge, scene), [challenge, scene]);
  const cam = useCamera(scene.lighting, initial);
  const focals = useMemo(() => focalsFor(scene.focalRange, challenge.initial.focalMm), [scene, challenge]);
  const reduced = useReducedMotion() ?? false;

  const [zebras, setZebras] = useState(false);
  const [grid, setGrid] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [outcome, setOutcome] = useState<ShotOutcome | null>(null);
  const [flash, setFlash] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const feedbackRef = useRef<HTMLDivElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const render = useSimRenderer(canvasRef, challenge.sceneId, cam.effective, {
    highlightWarning: zebras,
    live: true,
  });

  const m = cam.metrics;
  const results = useMemo(() => evaluateTargets(challenge.targets, m), [challenge.targets, m]);
  const passedCount = results.filter((r) => r.pass).length;
  const osd = buildOsd(cam);

  const warnings = useMemo(() => {
    const w: string[] = [];
    if (m.shakeRatio > 1) w.push('Riesgo de trepidación');
    if (scene.lighting.hasStars && m.starTrailRatio > 1) w.push('Estrellas con estela');
    return w;
  }, [m.shakeRatio, m.starTrailRatio, scene.lighting.hasStars]);

  const canvasLabel =
    `Vista previa de la escena «${scene.name}». Foto ${EXPOSURE_WORD[m.exposureState]} (${formatEV(m.exposureOffset)} EV). ` +
    `${scene.subjectLabel}: barrido de ${m.subjectMotionBlurPx.toFixed(1)} px; fondo con desenfoque de ${m.backgroundBlurPct.toFixed(1)} %.`;

  // Región viva: resumen de los criterios con un breve retardo tras cada cambio.
  const summary = `${formatAperture(m.aperture)}, ${shutterText(m.shutterSeconds)}, ISO ${formatIso(m.iso)}, ${Math.round(m.focalMm)} mm. ${passedCount} de ${results.length} criterios cumplidos.`;
  useEffect(() => {
    const t = window.setTimeout(() => setAnnouncement(summary), 500);
    return () => window.clearTimeout(t);
  }, [summary]);

  const shoot = useCallback(() => {
    const success = results.every((r) => r.pass);
    const n = attempts.length + 1;
    setAttempts((prev) => [
      {
        n,
        aperture: m.aperture,
        shutter: m.shutterSeconds,
        iso: m.iso,
        focal: m.focalMm,
        passed: passedCount,
        total: results.length,
        success,
      },
      ...prev,
    ]);
    setOutcome({ attempt: n, results, metrics: m, success });
    setFlash((f) => f + 1);
    if (success) progress.mark('challenges', challenge.id);
    // En pantallas angostas el resultado queda fuera de vista: llévalo al centro.
    window.requestAnimationFrame(() => {
      feedbackRef.current?.scrollIntoView({
        block: 'nearest',
        behavior: reduced ? 'auto' : 'smooth',
      });
    });
  }, [results, attempts.length, m, passedCount, challenge.id, reduced]);

  const resetCamera = () => {
    cam.reset(initial);
    setOutcome(null);
  };

  const free = ALL_PARAMS.filter((p) => !challenge.locked.includes(p));
  const hints = challenge.hints;

  return (
    <div className="space-y-6">
      {/* Navegación */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} icon={<ArrowLeft size={15} aria-hidden="true" />} className="-ml-2">
          Todos los desafíos
        </Button>
        <div className="flex items-center gap-2">
          <span className="osd text-[12px] text-faint">
            {index + 1} / {total}
          </span>
          <IconButton label="Desafío anterior" onClick={onPrev ?? undefined} disabled={!onPrev} className="disabled:opacity-40">
            <ChevronLeft size={16} aria-hidden="true" />
          </IconButton>
          <IconButton label="Desafío siguiente" onClick={onNext ?? undefined} disabled={!onNext} className="disabled:opacity-40">
            <ChevronRight size={16} aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      {/* Misión */}
      <header className="surface relative overflow-hidden p-5 md:p-6">
        <div className="tech-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="amber">Misión {String(index + 1).padStart(2, '0')}</Badge>
            <Badge>
              Nivel {LEVEL_INFO[challenge.level].step} · {challenge.level}
            </Badge>
            <Badge tone="info">{scene.name}</Badge>
            {solved && (
              <Badge tone="data">
                <CheckCircle2 size={11} aria-hidden="true" /> Superado
              </Badge>
            )}
          </div>
          <h2 id="challenge-title" className="mt-3 text-xl font-semibold text-fg md:text-2xl">
            {challenge.title}
          </h2>
          <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-muted">{challenge.prompt}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px]">
            <span className="flex items-center gap-1.5 text-muted">
              <Lock size={13} className="text-faint" aria-hidden="true" />
              <span className="text-faint">Fijos:</span>
              {challenge.locked.length ? challenge.locked.map((p) => PARAM_LABEL[p]).join(', ') : 'ninguno'}
            </span>
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden="true" />
              <span className="text-faint">Libres:</span>
              {free.map((p) => PARAM_LABEL[p]).join(', ')}
            </span>
            <span className="flex items-center gap-1.5 text-muted">
              <span className="text-faint">Modo</span>
              <span className="osd rounded-xs bg-amber px-1 text-[11px] font-semibold text-ink">M</span>
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_368px] xl:grid-rows-[auto_auto_1fr]">
        {/* Visor */}
        <div className="min-w-0 xl:col-start-1 xl:row-start-1">
          <Viewfinder osd={osd} histogram={render?.histogram ?? null} warnings={warnings} showGrid={grid}>
            <canvas ref={canvasRef} role="img" aria-label={canvasLabel} />
            <AnimatePresence>
              {flash > 0 && !reduced && (
                <motion.div
                  key={flash}
                  className="pointer-events-none absolute inset-0 bg-black"
                  initial={{ opacity: 0.85 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  aria-hidden="true"
                />
              )}
            </AnimatePresence>
          </Viewfinder>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ToggleChip pressed={zebras} onClick={() => setZebras((v) => !v)} icon={<ScanLine size={14} aria-hidden="true" />}>
              Zebras
            </ToggleChip>
            <ToggleChip pressed={grid} onClick={() => setGrid((v) => !v)} icon={<Grid3x3 size={14} aria-hidden="true" />}>
              Cuadrícula
            </ToggleChip>
            <Button variant="ghost" size="sm" onClick={resetCamera} icon={<RotateCcw size={14} aria-hidden="true" />} className="ml-auto h-9">
              Restablecer
            </Button>
          </div>
        </div>

        {/* Columna de control */}
        <aside aria-label="Criterios y controles" className="min-w-0 space-y-4 xl:col-start-2 xl:row-span-3 xl:row-start-1">
          <section className="surface p-4">
            <TargetChecklist results={results} metrics={m} />
          </section>

          <section aria-labelledby="controls-title" className="surface p-4">
            <h3 id="controls-title" className="eyebrow mb-3">
              Controles · modo M
            </h3>
            <ChallengeControls
              settings={cam.settings}
              set={cam.set}
              locked={challenge.locked}
              focals={focals}
              hasStars={scene.lighting.hasStars}
              metrics={m}
            />
          </section>
        </aside>

        {/* Disparo y diagnóstico */}
        <div className="min-w-0 space-y-4 xl:col-start-1 xl:row-start-2">
          <div>
            <Button
              variant="primary"
              onClick={shoot}
              icon={<Camera size={18} aria-hidden="true" />}
              className="h-12 w-full text-[15px] shadow-[0_8px_24px_-10px_rgb(255_178_36/0.6)]"
            >
              Disparar y evaluar
            </Button>
          </div>

          <div ref={feedbackRef} aria-live="polite" className="scroll-mt-24">
            {outcome && (
              <ShotFeedback
                outcome={outcome}
                locked={challenge.locked}
                explanation={challenge.explanation}
                isLast={!onNext}
                onNext={onNext ?? onBack}
                onRetry={resetCamera}
              />
            )}
          </div>
        </div>

        {/* Pistas e historial */}
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:col-start-1 xl:row-start-3 xl:content-start">
          <section aria-labelledby="hints-title" className="surface p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 id="hints-title" className="eyebrow flex items-center gap-1.5">
                <Lightbulb size={13} className="text-amber" aria-hidden="true" /> Pistas
              </h3>
              <span className="osd text-[12px] text-faint">
                {hintsShown}/{hints.length}
              </span>
            </div>
            {hintsShown > 0 ? (
              <ol className="mb-3 space-y-2" aria-live="polite">
                {hints.slice(0, hintsShown).map((h, i) => (
                  <li key={h} className="flex gap-2.5 text-[13px] leading-snug text-muted">
                    <span className="osd mt-px shrink-0 text-[11px] text-amber">{i + 1}</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mb-3 text-[13px] leading-snug text-faint">Intenta primero por tu cuenta. Cada pista revela un poco más.</p>
            )}
            <Button
              size="sm"
              variant="secondary"
              disabled={hintsShown >= hints.length}
              onClick={() => setHintsShown((h) => Math.min(hints.length, h + 1))}
            >
              {hintsShown >= hints.length ? 'No quedan pistas' : hintsShown === 0 ? 'Ver la primera pista' : 'Ver otra pista'}
            </Button>
          </section>

          <section aria-labelledby="history-title" className="surface p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 id="history-title" className="eyebrow">
                Historial de tomas
              </h3>
              <span className="osd text-[12px] text-faint">{attempts.length}</span>
            </div>
            {attempts.length === 0 ? (
              <p className="text-[13px] leading-snug text-faint">Aún no disparaste. Cada toma queda registrada con sus ajustes y el resultado.</p>
            ) : (
              <ol className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {attempts.map((a) => (
                  <li key={a.n} className="flex items-center gap-2.5 rounded-md border border-line bg-panel-2 px-2.5 py-2 text-[12px]">
                    <span className="osd w-6 shrink-0 text-faint">#{a.n}</span>
                    <span className="osd min-w-0 flex-1 leading-snug text-muted">
                      {formatAperture(a.aperture)} · {shutterText(a.shutter)} · ISO {formatIso(a.iso)} · {Math.round(a.focal)} mm
                    </span>
                    <span className={cn('osd inline-flex shrink-0 items-center gap-1', a.success ? 'text-data' : 'text-danger')}>
                      {a.success ? <CheckCircle2 size={13} aria-hidden="true" /> : <XCircle size={13} aria-hidden="true" />}
                      {a.success ? 'Superado' : `${a.passed}/${a.total}`}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
