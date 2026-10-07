/**
 * Formatos breves para las explicaciones del sandbox. Notación didáctica (f/2.8, 1/500 s)
 * y signo menos real; los valores del OSD los formatea el propio visor.
 */
import { formatDistance, formatShutter, formatThirds } from '../../engine';

/** Signo menos tipográfico. */
export function num(x: number, digits = 1): string {
  const r = Number(x.toFixed(digits));
  return String(r).replace('-', '−');
}

/** Exposición en tercios: "+⅔ EV", "±0 EV". */
export function fmtEV(ev: number): string {
  const t = formatThirds(Number.isFinite(ev) ? ev : 0);
  return `${t === '0' ? '±0' : t} EV`;
}

/** Cantidad de pasos sin signo: "1⅓ EV". */
export function fmtStopsAbs(ev: number): string {
  const t = formatThirds(Math.abs(ev)).replace(/^[+−]/, '');
  return `${t === '0' ? '0' : t} EV`;
}

export function fmtPct(v: number): string {
  return `${v < 9.95 ? v.toFixed(1) : Math.round(v)} %`;
}

export function fmtPx(v: number): string {
  return `${v < 9.95 ? v.toFixed(1) : Math.round(v)} px`;
}

/** Tiempo de exposición en texto didáctico: "1/500 s", "15 s". */
export function fmtTime(t: number): string {
  const l = formatShutter(t);
  return l.endsWith('"') ? `${l.slice(0, -1)} s` : `${l} s`;
}

/** Longitudes pequeñas (desplazamientos): mm, cm o m. */
export function fmtLength(m: number): string {
  if (m < 0.01) return `${(m * 1000).toFixed(m * 1000 < 9.95 ? 1 : 0)} mm`;
  if (m < 1) return `${(m * 100).toFixed(m * 100 < 9.95 ? 1 : 0)} cm`;
  return formatDistance(m);
}

/** Zona nítida "1.90 m a 7.16 m" (o "a ∞"). */
export function fmtZone(near: number, far: number): string {
  return `${formatDistance(near)} a ${formatDistance(far)}`;
}

/** Profundidad total de la zona nítida. */
export function fmtDepth(near: number, far: number): string {
  return Number.isFinite(far) ? formatDistance(Math.max(0, far - near)) : '∞';
}

export function fmtMicrons(mm: number): string {
  return `${Math.round(mm * 1000)} µm`;
}

export function fmtSpeed(ms: number): string {
  return `${num(ms, 1)} m/s`;
}
