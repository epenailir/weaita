/**
 * Cuadrícula de tercios superpuesta a la imagen. Ocupa todo su contenedor posicionado.
 * Las líneas llevan un halo oscuro para verse tanto sobre cielos claros como sobre sombras.
 */
import { cn } from '../../lib/cn';

export interface RuleOfThirdsGridProps {
  className?: string;
  /** Añade las diagonales (útiles para composiciones dinámicas). */
  diagonals?: boolean;
}

const line = 'absolute bg-white/40 shadow-[0_0_1px_rgb(0_0_0/0.55)]';

export function RuleOfThirdsGrid({ className, diagonals = false }: RuleOfThirdsGridProps) {
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0', className)}>
      <span className={cn(line, 'inset-y-0 left-1/3 w-px')} />
      <span className={cn(line, 'inset-y-0 left-2/3 w-px')} />
      <span className={cn(line, 'inset-x-0 top-1/3 h-px')} />
      <span className={cn(line, 'inset-x-0 top-2/3 h-px')} />
      {diagonals && (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 0L100 100M100 0L0 100" stroke="white" strokeOpacity={0.22} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </svg>
      )}
    </div>
  );
}
