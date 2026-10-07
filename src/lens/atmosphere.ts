/**
 * Cielo de hora azul y perspectiva aérea. El color del cielo depende de la dirección
 * (acimut y elevación), no del píxel: por eso un tele muestra un cielo casi uniforme
 * y un gran angular abarca todo el degradado del horizonte al cenit.
 */
import { hex, mix, sampleStops } from './color';
import type { RGB } from './color';

const DEG = Math.PI / 180;

/** Degradado vertical del cielo según la elevación en grados. */
const SKY_BY_ELEVATION: ReadonlyArray<readonly [number, RGB]> = [
  [0, hex('#f2c7a2')],
  [1.5, hex('#e9b99c')],
  [4, hex('#d0b0aa')],
  [9, hex('#a3abc2')],
  [18, hex('#6f89b1')],
  [32, hex('#46629a')],
  [55, hex('#2b4171')],
  [90, hex('#1a2645')],
];

/** Dirección del sol recién puesto: a la izquierda y apenas bajo el horizonte. */
export const SUN_AZIMUTH_RAD = -38 * DEG;
const GLOW = hex('#ffad6b');

/** Color del cielo en una dirección (acimut respecto del eje óptico, elevación sobre el horizonte). */
export function skyColor(azimuthRad: number, elevationRad: number): RGB {
  const e = Math.max(0, elevationRad) / DEG;
  const base = sampleStops(SKY_BY_ELEVATION, e);
  const da = (azimuthRad - SUN_AZIMUTH_RAD) / (34 * DEG);
  const glow = Math.exp(-da * da) * Math.exp(-e / 7) * 0.62;
  return mix(base, GLOW, glow);
}

/** Distancia de extinción de la calima (m): a esa distancia el contraste cae a 1/e. */
export const HAZE_DISTANCE_M = 7000;

/** Fracción de calima entre la cámara y un objeto a cierta distancia (0 = nítido, 1 = solo cielo). */
export function hazeAmount(distanceM: number): number {
  return 1 - Math.exp(-Math.max(0, distanceM) / HAZE_DISTANCE_M);
}

/** Color de la calima cerca del horizonte, mirando al frente. */
export const HAZE_COLOR: RGB = skyColor(0, 1.2 * DEG);

/** Aplica la perspectiva aérea a un color. */
export function applyHaze(c: RGB, distanceM: number, hazeColor: RGB = HAZE_COLOR): RGB {
  return mix(c, hazeColor, hazeAmount(distanceM));
}
