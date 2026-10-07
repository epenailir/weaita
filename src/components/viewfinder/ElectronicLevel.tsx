/**
 * Nivel electrónico (horizonte artificial). Ocupa todo su contenedor posicionado:
 * dos referencias fijas marcan la horizontal del encuadre y la línea móvil representa
 * el horizonte real. Se pone verde dentro de ±0.5°.
 *
 * Convención: rollDeg > 0 = cámara girada en sentido horario (la línea gira en sentido contrario).
 */
import { cn } from '../../lib/cn';
import type { ElectronicLevelProps } from './types';

/** Tolerancia (°) para considerar la cámara nivelada. */
export const LEVEL_TOLERANCE_DEG = 0.5;

export function levelDescription(rollDeg: number): string {
  const r = Math.round(Math.abs(rollDeg) * 10) / 10;
  if (Math.abs(rollDeg) <= LEVEL_TOLERANCE_DEG) return 'cámara nivelada';
  return `cámara inclinada ${r.toFixed(1)}° hacia la ${rollDeg > 0 ? 'derecha' : 'izquierda'}`;
}

export function ElectronicLevel({ rollDeg, className }: ElectronicLevelProps) {
  const roll = Number.isFinite(rollDeg) ? Math.max(-45, Math.min(45, rollDeg)) : 0;
  const level = Math.abs(roll) <= LEVEL_TOLERANCE_DEG;
  const color = level ? 'bg-data shadow-[0_0_8px_rgb(163_255_87/0.55)]' : 'bg-white shadow-[0_0_2px_rgb(0_0_0/0.9)]';
  const thickness = 'h-[max(1.5px,0.14em)]';

  return (
    <div role="img" aria-label={`Nivel electrónico: ${levelDescription(roll)}`} className={cn('pointer-events-none absolute inset-0', className)}>
      {/* Referencias fijas de la horizontal del encuadre */}
      <span aria-hidden="true" className={cn('absolute left-[17%] top-1/2 w-[5%] -translate-y-1/2 bg-white/75 shadow-[0_0_2px_rgb(0_0_0/0.9)]', thickness)} />
      <span aria-hidden="true" className={cn('absolute right-[17%] top-1/2 w-[5%] -translate-y-1/2 bg-white/75 shadow-[0_0_2px_rgb(0_0_0/0.9)]', thickness)} />

      {/* Horizonte real */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 flex w-[52%] items-center justify-between transition-transform duration-200 ease-out"
        style={{ transform: `translate(-50%, -50%) rotate(${-roll}deg)` }}
      >
        <span className={cn('w-[40%] rounded-full transition-colors duration-200', thickness, color)} />
        <span className={cn('aspect-square w-[max(5px,0.5em)] rounded-full border-[length:max(1.5px,0.12em)] transition-colors duration-200', level ? 'border-data' : 'border-white')} />
        <span className={cn('w-[40%] rounded-full transition-colors duration-200', thickness, color)} />
      </div>

      <span
        aria-hidden="true"
        className={cn(
          'osd absolute left-1/2 top-1/2 mt-[1.1em] -translate-x-1/2 text-[0.85em] [text-shadow:0_1px_2px_rgb(0_0_0/0.9)]',
          level ? 'text-data' : 'text-white',
        )}
      >
        {Math.abs(roll).toFixed(1)}°
      </span>
    </div>
  );
}
