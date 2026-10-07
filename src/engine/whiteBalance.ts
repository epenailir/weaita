/**
 * Balance de blancos: conversión Kelvin → RGB (aproximación de Tanner Helland sobre datos de
 * cuerpo negro de Mitchell Charity) y dominante de color resultante entre el iluminante real
 * de la escena y el ajuste de la cámara.
 */

export type RGB = [number, number, number];

export interface WhiteBalancePreset {
  id: string;
  name: string;
  kelvin: number;
}

export const WB_PRESETS: WhiteBalancePreset[] = [
  { id: 'candle', name: 'Vela', kelvin: 1900 },
  { id: 'tungsten', name: 'Tungsteno', kelvin: 3200 },
  { id: 'fluorescent', name: 'Fluorescente', kelvin: 4000 },
  { id: 'daylight', name: 'Luz día', kelvin: 5500 },
  { id: 'flash', name: 'Flash', kelvin: 5800 },
  { id: 'cloudy', name: 'Nublado', kelvin: 6500 },
  { id: 'shade', name: 'Sombra', kelvin: 7500 },
];

const clamp255 = (v: number) => Math.min(255, Math.max(0, v));

/** Color (0–1) de un cuerpo negro a la temperatura dada, válido de 1000 K a 40000 K. */
export function kelvinToRgb(kelvin: number): RGB {
  const t = Math.min(40000, Math.max(1000, kelvin)) / 100;
  const r = t <= 66 ? 255 : clamp255(329.698727446 * Math.pow(t - 60, -0.1332047592));
  const g = t <= 66
    ? clamp255(99.4708025861 * Math.log(t) - 161.1195681661)
    : clamp255(288.1221695283 * Math.pow(t - 60, -0.0755148492));
  const b = t >= 66 ? 255 : t <= 19 ? 0 : clamp255(138.5177312231 * Math.log(t - 10) - 305.0447927307);
  return [r / 255, g / 255, b / 255];
}

const luminance = ([r, g, b]: RGB) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const decode = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const linear = ([r, g, b]: RGB): RGB => [decode(r), decode(g), decode(b)];

/**
 * Multiplicadores por canal que aplica la escena sobre un objeto neutro cuando la cámara está
 * ajustada a `cameraK`. Si coinciden, el resultado es neutro (1, 1, 1).
 * Escena cálida (3200 K) con la cámara en luz día (5500 K) ⇒ dominante naranja.
 */
export function colorCast(sceneK: number, cameraK: number): RGB {
  // La salida de Helland está codificada en sRGB: se decodifica a lineal antes de dividir.
  const s = linear(kelvinToRgb(sceneK));
  const c = linear(kelvinToRgb(cameraK));
  const m: RGB = [s[0] / Math.max(c[0], 0.02), s[1] / Math.max(c[1], 0.02), Math.max(s[2], 0.01) / Math.max(c[2], 0.02)];
  const l = luminance(m);
  return [m[0] / l, m[1] / l, m[2] / l];
}

/** Color CSS de una temperatura (para muestras y degradados de la interfaz). */
export function kelvinToCss(kelvin: number): string {
  const [r, g, b] = kelvinToRgb(kelvin);
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
}

/** Diferencia en mireds: la escala perceptual usada por los filtros de corrección. */
export function miredShift(fromK: number, toK: number): number {
  return 1e6 / toK - 1e6 / fromK;
}
