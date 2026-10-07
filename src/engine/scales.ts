/**
 * Escalas estándar en tercios de paso, tal como las muestra una cámara.
 * Los valores físicos son potencias exactas de 2 (para que la aritmética de pasos sea limpia)
 * y las etiquetas son las nominales impresas en cámaras y objetivos.
 */

export interface StopValue {
  /** Valor físico exacto usado en los cálculos. */
  value: number;
  /** Etiqueta nominal mostrada al usuario. */
  label: string;
  /** Posición en tercios de paso dentro de su escala (0 = primer valor). */
  index: number;
  /** true si es un paso completo (no un tercio intermedio). */
  fullStop: boolean;
}

const APERTURE_LABELS = [
  '1.4', '1.6', '1.8', '2', '2.2', '2.5', '2.8', '3.2', '3.5', '4', '4.5', '5', '5.6',
  '6.3', '7.1', '8', '9', '10', '11', '13', '14', '16', '18', '20', '22',
];

/** f/1.4 … f/22 en tercios. N = 2^(i/6), i = 3 … 27. */
export const APERTURES: StopValue[] = APERTURE_LABELS.map((label, index) => ({
  value: Math.pow(2, (index + 3) / 6),
  label,
  index,
  fullStop: index % 3 === 0,
}));

const SHUTTER_LABELS = [
  '1/4000', '1/3200', '1/2500', '1/2000', '1/1600', '1/1250', '1/1000', '1/800', '1/640', '1/500',
  '1/400', '1/320', '1/250', '1/200', '1/160', '1/125', '1/100', '1/80', '1/60', '1/50', '1/40',
  '1/30', '1/25', '1/20', '1/15', '1/13', '1/10', '1/8', '1/6', '1/5', '1/4', '0.3"', '0.4"',
  '0.5"', '0.6"', '0.8"', '1"', '1.3"', '1.6"', '2"', '2.5"', '3.2"', '4"', '5"', '6"', '8"',
  '10"', '13"', '15"', '20"', '25"', '30"',
];

/** 1/4000 s … 30 s en tercios. t = 2^(j/3), j = −36 … 15. */
export const SHUTTERS: StopValue[] = SHUTTER_LABELS.map((label, index) => ({
  value: Math.pow(2, (index - 36) / 3),
  label,
  index,
  fullStop: index % 3 === 0,
}));

const ISO_LABELS = [
  '100', '125', '160', '200', '250', '320', '400', '500', '640', '800', '1000', '1250', '1600',
  '2000', '2500', '3200', '4000', '5000', '6400', '8000', '10000', '12800', '16000', '20000', '25600',
];

/** ISO 100 … 25600 en tercios. S = 100·2^(k/3). */
export const ISOS: StopValue[] = ISO_LABELS.map((label, index) => ({
  value: 100 * Math.pow(2, index / 3),
  label,
  index,
  fullStop: index % 3 === 0,
}));

/** Distancias focales típicas de zooms y fijos. */
export const FOCAL_LENGTHS = [14, 16, 18, 20, 24, 28, 35, 40, 50, 58, 70, 85, 105, 135, 150, 200, 250, 300, 400, 500, 600];

/** Valor de la escala más cercano en escala logarítmica. */
export function nearestStop(scale: StopValue[], value: number): StopValue {
  let best = scale[0] as StopValue;
  let bestD = Infinity;
  const lv = Math.log2(value);
  for (const s of scale) {
    const d = Math.abs(Math.log2(s.value) - lv);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

export function stopAt(scale: StopValue[], index: number): StopValue {
  const i = Math.max(0, Math.min(scale.length - 1, Math.round(index)));
  return scale[i] as StopValue;
}

/** Avanza n tercios dentro de la escala, con tope en los extremos. */
export function stepStop(scale: StopValue[], value: number, thirds: number): StopValue {
  return stopAt(scale, nearestStop(scale, value).index + thirds);
}

export function formatAperture(n: number): string {
  return `f/${nearestStop(APERTURES, n).label}`;
}

export function formatShutter(t: number): string {
  const s = nearestStop(SHUTTERS, t);
  if (Math.abs(Math.log2(s.value) - Math.log2(t)) < 0.05) return s.label;
  // Valores fuera de la escala (p. ej. calculados por la regla de 500)
  if (t >= 0.3) return `${t >= 10 ? Math.round(t) : Math.round(t * 10) / 10}"`;
  return `1/${Math.round(1 / t)}`;
}

/** Texto para lectores de pantalla: "un doscientos cincuentavo de segundo" sería excesivo; usamos forma clara. */
export function speakShutter(t: number): string {
  const label = formatShutter(t);
  if (label.includes('"')) return `${label.replace('"', '')} segundos`;
  return `${label} de segundo`;
}

export function formatIso(iso: number): string {
  return nearestStop(ISOS, iso).label;
}

export function formatEV(ev: number, digits = 1): string {
  const r = Math.round(ev * Math.pow(10, digits)) / Math.pow(10, digits);
  if (Math.abs(r) < Math.pow(10, -digits) / 2) return '±0';
  return `${r > 0 ? '+' : '−'}${Math.abs(r).toFixed(digits)}`;
}

/** Formatea pasos en fracciones de tercio como en una cámara: "+1⅓", "−⅔". */
export function formatThirds(ev: number): string {
  const thirds = Math.round(ev * 3);
  if (thirds === 0) return '0';
  const sign = thirds > 0 ? '+' : '−';
  const abs = Math.abs(thirds);
  const whole = Math.floor(abs / 3);
  const rest = abs % 3;
  const frac = rest === 1 ? '⅓' : rest === 2 ? '⅔' : '';
  return `${sign}${whole > 0 ? whole : ''}${frac}`;
}

export function formatDistance(m: number): string {
  if (!Number.isFinite(m)) return '∞';
  if (m < 1) return `${Math.round(m * 100)} cm`;
  if (m < 10) return `${m.toFixed(2)} m`;
  if (m < 100) return `${m.toFixed(1)} m`;
  return `${Math.round(m)} m`;
}

export function formatKelvin(k: number): string {
  return `${Math.round(k / 50) * 50} K`;
}
