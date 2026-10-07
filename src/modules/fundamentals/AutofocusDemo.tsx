import { useEffect, useRef, useState } from 'react';
import { Crosshair, Pause, Play } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { SENSORS, blurDiscFraction, depthOfField, formatDistance } from '../../engine';
import type { AfMode } from '../../engine';
import { Badge, Button, RangeSlider, Segmented, Switch } from '../../components/ui';
import { cn } from '../../lib/cn';

const FOCAL = 85;
const APERTURE = 2;
const SENSOR = SENSORS.ff;
const MIN_D = 1.5;
const MAX_D = 20;

/** Posición del corredor: se acerca y se aleja en un ciclo de 6 s. */
const runnerDistance = (t: number) => 10.75 + 7.75 * Math.cos((2 * Math.PI * t) / 6);

const AF_OPTIONS: Array<{ value: AfMode; label: string }> = [
  { value: 'AF-S', label: 'AF-S' },
  { value: 'AF-C', label: 'AF-C' },
  { value: 'AF-A', label: 'AF-A' },
  { value: 'MF', label: 'MF' },
];

const xOf = (d: number) => 80 + ((d - MIN_D) / (MAX_D - MIN_D)) * 500;

interface SimState {
  t: number;
  subject: number;
  focus: number;
  afaSwitched: boolean;
  lastSubject: number;
  movingFor: number;
}

export function AutofocusDemo({ mode, onModeChange }: { mode: AfMode; onModeChange: (m: AfMode) => void }) {
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(!reduced);
  const [moving, setMoving] = useState(true);
  const [peaking, setPeaking] = useState(true);
  const [manualFocus, setManualFocus] = useState(8);
  const [state, setState] = useState<SimState>({ t: 0, subject: runnerDistance(0), focus: 8, afaSwitched: false, lastSubject: runnerDistance(0), movingFor: 0 });
  const lockRequest = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Bucle de simulación: mueve al sujeto y aplica la lógica de cada modo de enfoque
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const s = stateRef.current;
      const t = moving ? s.t + dt : s.t;
      const subject = runnerDistance(t);
      const speed = Math.abs(subject - s.lastSubject) / Math.max(dt, 1e-3);
      const movingFor = speed > 0.8 ? s.movingFor + dt : 0;
      let focus = s.focus;
      let afaSwitched = s.afaSwitched;
      if (mode === 'AF-C' || (mode === 'AF-A' && afaSwitched)) {
        // Seguimiento continuo con un pequeño retardo del motor de enfoque
        focus += (subject - focus) * Math.min(1, dt * 14);
      } else if (mode === 'AF-A' && movingFor > 0.35) {
        afaSwitched = true;
      } else if (mode === 'MF') {
        focus = manualFocus;
      }
      if (lockRequest.current && mode !== 'MF') {
        focus = subject;
        lockRequest.current = false;
      }
      setState({ t, subject, focus, afaSwitched, lastSubject: subject, movingFor });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, moving, mode, manualFocus]);

  // Cambiar de modo reinicia el comportamiento de AF-A
  useEffect(() => {
    setState((s) => ({ ...s, afaSwitched: false, movingFor: 0, focus: mode === 'MF' ? manualFocus : s.focus }));
  }, [mode, manualFocus]);

  const halfPress = () => {
    lockRequest.current = true;
    if (!playing) setState((s) => ({ ...s, focus: s.subject, afaSwitched: false }));
  };

  const dof = depthOfField(FOCAL, APERTURE, state.focus, SENSOR.cocMm);
  const blurFrac = blurDiscFraction(FOCAL, APERTURE, state.focus, state.subject, SENSOR);
  const cocFrac = SENSOR.cocMm / SENSOR.widthMm;
  const inFocus = state.subject >= dof.nearM && state.subject <= dof.farM;
  const sharpness = Math.max(0, Math.min(100, Math.round(100 * (1 - Math.max(0, blurFrac - cocFrac) / (cocFrac * 12)))));
  const previewBlur = blurFrac * 420;
  const bgBlur = blurDiscFraction(FOCAL, APERTURE, state.focus, 60, SENSOR) * 420;
  const figureScale = Math.min(2.4, 6 / state.subject);
  const effectiveMode = mode === 'AF-A' ? (state.afaSwitched ? 'AF-A → AF-C' : 'AF-A → AF-S') : mode;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        {/* Visor: el sujeto se ve nítido o borroso según el plano de enfoque */}
        <div className="relative aspect-[3/2] overflow-hidden rounded-lg border border-line bg-[#1a2430]">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, #2c4a63 0%, #6d8aa0 45%, #4c6b3d 46%, #2f4a28 100%)',
              filter: `blur(${bgBlur.toFixed(1)}px)`,
              transform: 'scale(1.08)',
            }}
          >
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={i}
                className="absolute bottom-[52%] rounded-full bg-[#1f3a24]"
                style={{ left: `${i * 12 - 4}%`, width: '14%', height: `${18 + ((i * 37) % 13)}%` }}
              />
            ))}
          </div>
          <svg viewBox="0 0 300 200" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <g
              transform={`translate(150 ${118 + 22 * figureScale}) scale(${figureScale})`}
              style={{ filter: `blur(${(previewBlur / figureScale).toFixed(2)}px)` }}
            >
              <g fill="#e7d3bf">
                <circle cx="0" cy="-44" r="7" />
              </g>
              <path d="M-9 -36 L9 -36 L12 -6 L5 -6 L4 18 L-4 18 L-5 -6 L-12 -6 Z" fill="#d9472b" />
              <path d="M-4 18 L-9 40 L-3 40 L1 20 Z M4 18 L10 40 L4 40 L0 22 Z" fill="#26313a" />
              {peaking && mode === 'MF' && inFocus && (
                <g fill="none" stroke="var(--color-peaking)" strokeWidth="1.4">
                  <circle cx="0" cy="-44" r="7.6" />
                  <path d="M-9.6 -36.5 L9.6 -36.5 L12.6 -5.5 L5 -5.5 L4.5 18 L-4.5 18 L-5 -5.5 L-12.6 -5.5 Z" />
                </g>
              )}
            </g>
            {/* Corchetes del punto AF */}
            <g
              stroke={inFocus ? 'var(--color-data)' : 'var(--color-fg)'}
              strokeWidth="1.5"
              fill="none"
              transform={`translate(150 ${118 - 6 * figureScale})`}
              opacity={mode === 'MF' ? 0.35 : 1}
            >
              <path d="M-16 -12 v-6 h6 M16 -12 v-6 h-6 M-16 12 v6 h6 M16 12 v6 h-6" />
            </g>
          </svg>
          <div className="osd absolute inset-x-3 top-3 flex items-center justify-between text-[11px]">
            <span className="rounded-xs bg-ink/70 px-2 py-1 text-fg">{effectiveMode}</span>
            <span className={cn('rounded-xs bg-ink/70 px-2 py-1', inFocus ? 'text-data' : 'text-danger')}>
              {inFocus ? '● Enfocado' : '○ Fuera de foco'}
            </span>
          </div>
          <div className="osd absolute inset-x-3 bottom-3 flex items-center justify-between text-[11px] text-fg">
            <span className="rounded-xs bg-ink/70 px-2 py-1">
              {FOCAL} mm · f/{APERTURE}
            </span>
            <span className="rounded-xs bg-ink/70 px-2 py-1">Nitidez {sharpness}%</span>
          </div>
        </div>

        {/* Vista lateral: distancia del sujeto, plano de enfoque y profundidad de campo */}
        <svg viewBox="0 0 600 120" className="w-full rounded-lg border border-line bg-ink" role="img" aria-label={`Vista lateral: sujeto a ${formatDistance(state.subject)}, enfoque a ${formatDistance(state.focus)}.`}>
          <line x1="60" y1="92" x2="590" y2="92" stroke="var(--color-line-strong)" />
          {[2, 5, 10, 15, 20].map((d) => (
            <g key={d}>
              <line x1={xOf(d)} y1="92" x2={xOf(d)} y2="97" stroke="var(--color-faint)" />
              <text x={xOf(d)} y="110" textAnchor="middle" className="osd" fontSize="10" fill="var(--color-faint)">
                {d} m
              </text>
            </g>
          ))}
          <rect
            x={xOf(Math.max(MIN_D, dof.nearM))}
            y="20"
            width={Math.max(2, xOf(Math.min(MAX_D, dof.farM)) - xOf(Math.max(MIN_D, dof.nearM)))}
            height="72"
            fill="var(--color-data)"
            opacity="0.12"
          />
          <line x1={xOf(state.focus)} y1="14" x2={xOf(state.focus)} y2="92" stroke="var(--color-amber)" strokeDasharray="4 3" strokeWidth="1.5" />
          <text x={xOf(state.focus)} y="11" textAnchor="middle" fontSize="10" fill="var(--color-amber)" className="osd">
            enfoque
          </text>
          <g transform={`translate(${xOf(state.subject)} 92)`}>
            <circle cx="0" cy="-44" r="5" fill={inFocus ? 'var(--color-data)' : 'var(--color-fg)'} />
            <rect x="-4" y="-38" width="8" height="24" rx="2" fill={inFocus ? 'var(--color-data)' : 'var(--color-fg)'} />
            <rect x="-4" y="-14" width="3" height="14" fill="var(--color-muted)" />
            <rect x="1" y="-14" width="3" height="14" fill="var(--color-muted)" />
          </g>
          <g transform="translate(26 70)">
            <rect x="-14" y="-12" width="28" height="22" rx="3" fill="var(--color-raised)" stroke="var(--color-line-strong)" />
            <circle cx="10" cy="-1" r="7" fill="var(--color-panel-2)" stroke="var(--color-muted)" />
          </g>
          <text x="590" y="30" textAnchor="end" fontSize="10" className="osd" fill="var(--color-data)">
            zona nítida {formatDistance(dof.nearM)} – {formatDistance(dof.farM)}
          </text>
        </svg>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <Segmented label="Modo de enfoque" options={AF_OPTIONS} value={mode} onChange={onModeChange} stretch />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            icon={<Crosshair size={15} aria-hidden="true" />}
            onClick={halfPress}
            disabled={mode === 'MF'}
          >
            Medio disparador
          </Button>
          <Button icon={playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />} onClick={() => setPlaying((p) => !p)}>
            {playing ? 'Pausar' : 'Reproducir'}
          </Button>
        </div>
        <Switch label="El sujeto se mueve" description="El corredor se acerca y se aleja de la cámara." checked={moving} onChange={setMoving} />
        {mode === 'MF' && (
          <>
            <RangeSlider
              label="Anillo de enfoque"
              value={manualFocus}
              min={MIN_D}
              max={MAX_D}
              log
              onChange={setManualFocus}
              format={formatDistance}
              hints={['Cerca', 'Lejos']}
            />
            <Switch
              label="Focus peaking"
              description="Resalta en rojo los bordes que están en foco."
              checked={peaking}
              onChange={setPeaking}
            />
          </>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-faint">
          <Badge tone={inFocus ? 'data' : 'danger'}>{inFocus ? 'En foco' : 'Desenfocado'}</Badge>
          <span className="osd">
            Sujeto {formatDistance(state.subject)} · Enfoque {formatDistance(state.focus)}
          </span>
        </div>
      </div>
    </div>
  );
}
