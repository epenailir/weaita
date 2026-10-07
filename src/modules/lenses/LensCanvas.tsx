import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { renderLensScene } from '../../lens/render';
import type { LensShot } from '../../lens/render';
import { cn } from '../../lib/cn';
import { useElementSize } from './hooks';

export interface LensCanvasProps {
  shot: LensShot;
  /** Descripción para lectores de pantalla. Si se omite, el canvas es decorativo. */
  label?: string;
  className?: string;
  canvasClassName?: string;
  canvasStyle?: CSSProperties;
  children?: ReactNode;
}

/**
 * Canvas de la escena en perspectiva. Mantiene la relación de aspecto del sensor, se adapta
 * al contenedor (ResizeObserver), dibuja a la densidad real de la pantalla y solo repinta
 * (en el siguiente frame) cuando cambian la toma o el tamaño.
 */
export function LensCanvas({ shot, label, className, canvasClassName, canvasStyle, children }: LensCanvasProps) {
  const [wrapRef, size] = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { focalMm, sensorWidthMm, sensorHeightMm, cameraDistanceM } = shot;

  useEffect(() => {
    if (size.width < 2 || size.height < 2) return;
    const raf = requestAnimationFrame(() => {
      const c = canvasRef.current;
      if (!c) return;
      const w = Math.max(1, Math.round(size.width * size.dpr));
      const h = Math.max(1, Math.round(size.height * size.dpr));
      if (c.width !== w) c.width = w;
      if (c.height !== h) c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      renderLensScene(ctx, w, h, { focalMm, sensorWidthMm, sensorHeightMm, cameraDistanceM });
    });
    return () => cancelAnimationFrame(raf);
  }, [focalMm, sensorWidthMm, sensorHeightMm, cameraDistanceM, size]);

  return (
    <div ref={wrapRef} className={cn('relative overflow-hidden bg-ink', className)} style={{ aspectRatio: `${sensorWidthMm} / ${sensorHeightMm}` }}>
      <canvas
        ref={canvasRef}
        className={cn('absolute inset-0 block h-full w-full', canvasClassName)}
        style={canvasStyle}
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
      />
      {children}
    </div>
  );
}
