/**
 * Barra bajo el visor: botón Disparar y asistentes del visor (vista en vivo, zebras,
 * cuadrícula, nivel, focus peaking), más el control de giro para practicar la nivelación.
 */
import { Camera, Crosshair, Grid3x3, Pause, Pin, PinOff, Play, Ruler, Shuffle } from 'lucide-react';
import { RangeSlider } from '../../components/ui';
import { LEVEL_TOLERANCE_DEG, levelDescription } from '../../components/viewfinder';
import { cn } from '../../lib/cn';
import { ToggleChip } from './LabUi';

/** Rayas a 45° como las zebras del visor. */
function ZebraIcon() {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="2" />
      <path d="M1.5 9.5l8-8M5 14.5l9.5-9.5M10.5 14.5l4-4" strokeLinecap="round" />
    </svg>
  );
}

export interface LabToolbarProps {
  onShoot: () => void;
  shooting: boolean;
  shotCount: number;
  maxShots: number;
  live: boolean;
  onLive: (v: boolean) => void;
  zebras: boolean;
  onZebras: (v: boolean) => void;
  grid: boolean;
  onGrid: (v: boolean) => void;
  level: boolean;
  onLevel: (v: boolean) => void;
  peaking: boolean;
  onPeaking: (v: boolean) => void;
  manualFocus: boolean;
  rollDeg: number;
  onRoll: (deg: number) => void;
  /** Visor fijo arriba en pantallas pequeñas. */
  pinned: boolean;
  onPinned: (v: boolean) => void;
}

export function LabToolbar(p: LabToolbarProps) {
  const leveled = Math.abs(p.rollDeg) <= LEVEL_TOLERANCE_DEG;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <button
          type="button"
          onClick={p.onShoot}
          disabled={p.shooting}
          aria-describedby="disparar-ayuda"
          className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2.5 rounded-lg bg-amber px-5 text-[15px] font-semibold text-ink shadow-[0_8px_24px_-12px_rgb(255_178_36/0.8)] transition-colors duration-150 hover:bg-amber-strong disabled:cursor-progress disabled:opacity-70 sm:w-auto sm:min-w-[172px]"
        >
          <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink/80">
            <Camera size={13} aria-hidden="true" />
          </span>
          {p.shooting ? 'Disparando…' : 'Disparar'}
          <span className="osd rounded-xs bg-ink/15 px-1.5 py-px text-[11px] font-medium">
            {p.shotCount}/{p.maxShots}
          </span>
        </button>
        <div role="group" aria-label="Asistentes del visor" className="flex flex-wrap gap-1.5">
          <ToggleChip
            label="En vivo"
            icon={p.live ? <Play size={13} /> : <Pause size={13} />}
            checked={p.live}
            onChange={p.onLive}
            hint="Vista en vivo: anima a los sujetos en movimiento, como el visor de una cámara encendida."
          />
          <ToggleChip label="Zebras" icon={<ZebraIcon />} checked={p.zebras} onChange={p.onZebras} hint="Raya las altas luces quemadas." />
          <ToggleChip label="Cuadrícula" icon={<Grid3x3 size={13} />} checked={p.grid} onChange={p.onGrid} hint="Regla de los tercios." />
          <ToggleChip label="Nivel" icon={<Ruler size={13} />} checked={p.level} onChange={p.onLevel} hint="Nivel electrónico: la línea se pone verde al nivelar." />
          <ToggleChip
            label="Peaking"
            icon={<Crosshair size={13} />}
            checked={p.peaking && p.manualFocus}
            onChange={p.onPeaking}
            disabled={!p.manualFocus}
            hint={p.manualFocus ? 'Focus peaking: resalta en rojo los bordes enfocados.' : 'Focus peaking: disponible con enfoque manual (MF en el menú rápido).'}
          />
          <span className="md:hidden">
            <ToggleChip
              label="Fijar visor"
              icon={p.pinned ? <Pin size={13} /> : <PinOff size={13} />}
              checked={p.pinned}
              onChange={p.onPinned}
              hint="Mantiene el visor arriba mientras mueves los controles."
            />
          </span>
        </div>
      </div>
      <p id="disparar-ayuda" className="text-[12px] leading-snug text-faint">
        Disparar congela la toma y la diagnostica: qué salió bien, qué falló con su valor medido y qué parámetro moverías.
      </p>

      {p.level && (
        <div className="flex flex-col gap-3 rounded-md border border-line bg-panel-2 px-3.5 py-3 sm:flex-row sm:items-center">
          <RangeSlider
            className="min-w-0 flex-1"
            label="Giro de la cámara"
            value={p.rollDeg}
            min={-8}
            max={8}
            step={0.1}
            onChange={(v) => p.onRoll(Math.round(v * 10) / 10)}
            format={(v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}°`}
            hints={['Hacia la izquierda', 'Hacia la derecha']}
          />
          <div className="flex shrink-0 items-center gap-3 sm:w-[220px] sm:flex-col sm:items-stretch">
            <p className={cn('text-[12.5px] leading-snug', leveled ? 'text-data' : 'text-muted')}>
              {leveled ? 'Nivelada: la línea del visor está verde.' : `Inclinada: ${levelDescription(p.rollDeg).replace('cámara inclinada ', '')}. Gira hasta ver la línea verde.`}
            </p>
            <button
              type="button"
              onClick={() => {
                const mag = 1.5 + Math.random() * 4.5;
                p.onRoll(Math.round((Math.random() < 0.5 ? -mag : mag) * 10) / 10);
              }}
              className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-line-strong bg-raised px-3 text-[12.5px] font-medium text-fg hover:border-faint"
            >
              <Shuffle size={13} aria-hidden="true" />
              Desnivelar para practicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
