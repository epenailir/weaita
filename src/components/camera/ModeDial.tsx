/**
 * Selector del modo de exposición P / A / S / M, como dial físico o como control segmentado,
 * con una descripción breve de qué decide el fotógrafo y qué decide la cámara.
 */
import type { CameraMode } from '../../engine/types';
import { Segmented } from '../ui';
import { cn } from '../../lib/cn';
import { Dial } from './Dial';

export interface ModeInfo {
  mode: CameraMode;
  /** Nombre completo. */
  name: string;
  /** Otras siglas habituales según la marca. */
  aka: string;
  /** Qué controla el fotógrafo y qué la cámara. */
  description: string;
}

/** Orden real del dial (Nikon, Sony, Fujifilm): P, A, S, M. */
export const MODE_INFO: ModeInfo[] = [
  { mode: 'P', name: 'Programa', aka: 'P', description: 'La cámara elige apertura y velocidad; tú decides el ISO y puedes compensar la exposición.' },
  { mode: 'A', name: 'Prioridad a la apertura', aka: 'A · Av', description: 'Tú eliges el número f (profundidad de campo) y la cámara calcula la velocidad.' },
  { mode: 'S', name: 'Prioridad a la velocidad', aka: 'S · Tv', description: 'Tú eliges el tiempo de exposición (movimiento) y la cámara calcula la apertura.' },
  { mode: 'M', name: 'Manual', aka: 'M', description: 'Tú eliges apertura, velocidad e ISO. El exposímetro solo te orienta.' },
];

export interface ModeDialProps {
  value: CameraMode;
  onChange: (mode: CameraMode) => void;
  /** Dial físico o control segmentado (más compacto). */
  variant?: 'dial' | 'segmented';
  /** Modos no disponibles en el ejercicio. */
  disabledModes?: CameraMode[];
  /** Muestra la descripción del modo elegido. */
  showDescription?: boolean;
  /** Diámetro máximo del dial (px). */
  size?: number;
  className?: string;
}

export function ModeDial({
  value,
  onChange,
  variant = 'segmented',
  disabledModes = [],
  showDescription = true,
  size = 150,
  className,
}: ModeDialProps) {
  const info = MODE_INFO.find((m) => m.mode === value) ?? MODE_INFO[3]!;
  const index = MODE_INFO.findIndex((m) => m.mode === value);
  const description = showDescription && (
    <p className="mt-3 text-[13px] leading-relaxed text-muted" aria-live="polite">
      <span className="font-medium text-fg">{info.name}</span>
      <span className="osd ml-1.5 text-[11px] text-faint">({info.aka})</span>
      <span className="block">{info.description}</span>
    </p>
  );

  if (variant === 'dial') {
    // En el dial, los modos deshabilitados se saltan al girar
    const onDial = (next: number) => {
      const dir = next >= index ? 1 : -1;
      let k = next;
      while (MODE_INFO[k] && disabledModes.includes(MODE_INFO[k]!.mode)) k += dir;
      const target = MODE_INFO[k];
      if (target) onChange(target.mode);
    };
    return (
      <div className={cn('flex flex-col items-center text-center', className)}>
        <Dial
          label="Modo de exposición"
          options={MODE_INFO.map((m) => ({ label: m.mode, major: true }))}
          index={Math.max(0, index)}
          onChange={onDial}
          valueText={`${info.name} (${info.mode})`}
          stepDeg={42}
          labelSize={20}
          size={size}
          dragMode="circular"
        />
        {description}
      </div>
    );
  }

  return (
    <div className={className}>
      <Segmented<CameraMode>
        label="Modo de exposición"
        value={value}
        onChange={onChange}
        stretch
        options={MODE_INFO.map((m) => ({
          value: m.mode,
          label: <span className="osd text-[15px] font-semibold">{m.mode}</span>,
          ariaLabel: `${m.name} (${m.mode})`,
          disabled: disabledModes.includes(m.mode),
        }))}
      />
      {description}
    </div>
  );
}
