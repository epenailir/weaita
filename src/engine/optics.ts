/**
 * Óptica geométrica de lente delgada: profundidad de campo, hiperfocal, disco de desenfoque,
 * ángulo de visión, ampliación, desenfoque por movimiento y reglas para estrellas y trepidación.
 * Convención: focales y tamaños de sensor en mm; distancias de escena en m.
 */
import type { DepthOfField, SensorFormat, SensorId } from './types';

export const SENSORS: Record<SensorId, SensorFormat> = {
  ff: { id: 'ff', name: 'Full frame (35 mm)', widthMm: 36, heightMm: 24, crop: 1, cocMm: 0.03, pixelPitchUm: 5.9, megapixels: 24 },
  apsc: { id: 'apsc', name: 'APS-C (Sony, Nikon, Fujifilm)', widthMm: 23.5, heightMm: 15.6, crop: 1.53, cocMm: 0.02, pixelPitchUm: 3.9, megapixels: 26 },
  'apsc-canon': { id: 'apsc-canon', name: 'APS-C (Canon)', widthMm: 22.3, heightMm: 14.9, crop: 1.6, cocMm: 0.019, pixelPitchUm: 3.2, megapixels: 32 },
  mft: { id: 'mft', name: 'Micro Cuatro Tercios', widthMm: 17.3, heightMm: 13, crop: 2, cocMm: 0.015, pixelPitchUm: 3.3, megapixels: 20 },
  'one-inch': { id: 'one-inch', name: 'Sensor de 1"', widthMm: 13.2, heightMm: 8.8, crop: 2.7, cocMm: 0.011, pixelPitchUm: 2.4, megapixels: 20 },
};

export function sensorDiagonalMm(s: SensorFormat): number {
  return Math.hypot(s.widthMm, s.heightMm);
}

/** Hiperfocal en metros: H = f²/(N·c) + f. */
export function hyperfocalM(focalMm: number, aperture: number, cocMm: number): number {
  return (focalMm * focalMm / (aperture * cocMm) + focalMm) / 1000;
}

/**
 * Límites de profundidad de campo (fórmulas completas de lente delgada).
 * near = s(H − f)/(H + s − 2f); far = s(H − f)/(H − s) si s < H, si no ∞.
 */
export function depthOfField(focalMm: number, aperture: number, focusM: number, cocMm: number): DepthOfField {
  const f = focalMm;
  const s = Math.max(focusM * 1000, f * 1.001);
  const H = (f * f) / (aperture * cocMm) + f;
  const near = (s * (H - f)) / (H + s - 2 * f);
  const far = s >= H ? Infinity : (s * (H - f)) / (H - s);
  const nearM = near / 1000;
  const farM = far / 1000;
  return { nearM, farM, totalM: farM - nearM, hyperfocalM: H / 1000 };
}

/** Ampliación (relación de reproducción) de un objeto enfocado a s: m = f/(s − f). */
export function magnification(focalMm: number, focusM: number): number {
  const s = focusM * 1000;
  return focalMm / Math.max(s - focalMm, 1e-6);
}

/**
 * Diámetro del disco de desenfoque en el sensor (mm) para un punto a distancia d estando enfocado a s:
 * b = (f·m/N)·|d − s|/d. Con d → ∞ queda b = f·m/N.
 */
export function blurDiscMm(focalMm: number, aperture: number, focusM: number, objectM: number): number {
  const m = magnification(focalMm, focusM);
  const s = focusM * 1000;
  const d = objectM * 1000;
  if (!Number.isFinite(objectM)) return (focalMm * m) / aperture;
  return ((focalMm * m) / aperture) * (Math.abs(d - s) / Math.max(d, 1e-6));
}

/** Disco de desenfoque como fracción del ancho de la imagen (0–1). */
export function blurDiscFraction(focalMm: number, aperture: number, focusM: number, objectM: number, sensor: SensorFormat): number {
  return blurDiscMm(focalMm, aperture, focusM, objectM) / sensor.widthMm;
}

/** Ángulos de visión en grados: 2·atan(d / 2f). */
export function fieldOfView(focalMm: number, sensor: SensorFormat): { h: number; v: number; d: number } {
  const deg = (x: number) => (2 * Math.atan(x / (2 * focalMm)) * 180) / Math.PI;
  return { h: deg(sensor.widthMm), v: deg(sensor.heightMm), d: deg(sensorDiagonalMm(sensor)) };
}

/** Focal equivalente en 35 mm. */
export function equivalentFocal(focalMm: number, sensor: SensorFormat): number {
  return focalMm * sensor.crop;
}

/**
 * Barrido por movimiento en píxeles para un sujeto que cruza el encuadre en perpendicular.
 * Desplazamiento en el sensor ≈ f · (v·t / d); se convierte a px con el ancho del sensor.
 */
export function motionBlurPx(
  speedMS: number,
  distanceM: number,
  focalMm: number,
  shutterS: number,
  sensor: SensorFormat,
  imageWidthPx: number,
): number {
  if (speedMS <= 0 || distanceM <= 0) return 0;
  const angle = (speedMS * shutterS) / distanceM;
  const onSensorMm = focalMm * angle;
  return (onSensorMm / sensor.widthMm) * imageWidthPx;
}

/** Velocidad mínima a pulso según la regla de la recíproca, corregida por estabilización. */
export function handheldLimitS(focalMm: number, sensor: SensorFormat, stabilizationStops = 0): number {
  return (1 / (focalMm * sensor.crop)) * Math.pow(2, stabilizationStops);
}

/** Relación entre el tiempo usado y el límite a pulso (≤ 1 = sin trepidación visible). */
export function shakeRatio(shutterS: number, focalMm: number, sensor: SensorFormat, stabilizationStops = 0, tripod = false): number {
  if (tripod) return 0;
  return shutterS / handheldLimitS(focalMm, sensor, stabilizationStops);
}

/**
 * Trepidación estimada en px: se considera que en el límite de la recíproca el temblor
 * equivale a ~1 círculo de confusión y crece linealmente con el tiempo.
 */
export function shakeBlurPx(shutterS: number, focalMm: number, sensor: SensorFormat, imageWidthPx: number, stabilizationStops = 0, tripod = false): number {
  const ratio = shakeRatio(shutterS, focalMm, sensor, stabilizationStops, tripod);
  const cocPx = (sensor.cocMm / sensor.widthMm) * imageWidthPx;
  return ratio * cocPx;
}

/** Regla de los 500: tiempo máximo para estrellas puntuales = 500 / (f · crop). */
export function rule500S(focalMm: number, sensor: SensorFormat): number {
  return 500 / (focalMm * sensor.crop);
}

/** Regla NPF simplificada (Frédéric Michaud): t = (35·N + 30·p) / f, con p en micras. */
export function npfRuleS(focalMm: number, aperture: number, sensor: SensorFormat): number {
  return (35 * aperture + 30 * sensor.pixelPitchUm) / focalMm;
}

/**
 * Distancia a la que hay que ponerse para que un sujeto de cierta altura ocupe
 * una fracción de la altura del encuadre: d = f·H / (fracción · alto del sensor).
 */
export function distanceForFraming(focalMm: number, subjectHeightM: number, fillFraction: number, sensor: SensorFormat): number {
  return (focalMm * subjectHeightM) / (fillFraction * sensor.heightMm);
}

/**
 * Compresión de perspectiva: con el sujeto del mismo tamaño en el encuadre, un objeto
 * situado `behindM` metros detrás del sujeto se ve `subjectM/(subjectM+behindM)` veces
 * el tamaño que tendría junto al sujeto. Teleobjetivo ⇒ sujeto lejos ⇒ cociente cercano a 1.
 */
export function backgroundScaleRatio(subjectM: number, behindM: number): number {
  return subjectM / (subjectM + behindM);
}

/**
 * Coeficiente de distorsión radial k1 (modelo Brown–Conrady directo, convención OpenCV,
 * r normalizado a la semidiagonal: r = 1 en la esquina). k1 < 0 = barril, k1 > 0 = cojín.
 * Valores ilustrativos sin corrección digital: 14 mm ≈ −0,035; 50 mm ≈ −0,004; 200 mm ≈ +0,015.
 * Los zooms distorsionan más que los fijos en sus extremos.
 */
const K1_TABLE: Array<[number, number]> = [
  [14, -0.035],
  [24, -0.015],
  [35, -0.01],
  [50, -0.004],
  [85, 0.004],
  [135, 0.008],
  [200, 0.015],
  [400, 0.018],
];

export function distortionK1(focalMm: number, lens: 'prime' | 'zoom' = 'prime'): number {
  const x = Math.log(Math.min(400, Math.max(14, focalMm)));
  let k = K1_TABLE[K1_TABLE.length - 1]![1];
  for (let i = 1; i < K1_TABLE.length; i++) {
    const [f0, k0] = K1_TABLE[i - 1]!;
    const [f1, k1] = K1_TABLE[i]!;
    if (x <= Math.log(f1)) {
      const t = (x - Math.log(f0)) / (Math.log(f1) - Math.log(f0));
      k = k0 + t * (k1 - k0);
      break;
    }
  }
  return lens === 'zoom' ? k * 1.8 : k;
}

/** Diámetro del disco de Airy en el sensor (mm): 2,44·λ·N con λ = 550 nm. */
export function airyDiskMm(aperture: number, wavelengthMm = 0.00055): number {
  return 2.44 * wavelengthMm * aperture;
}

/** Desenfoque total aproximado combinando desenfoque geométrico y difracción (suma cuadrática). */
export function combinedBlurMm(defocusMm: number, aperture: number): number {
  return Math.hypot(defocusMm, airyDiskMm(aperture));
}

/**
 * Apertura máxima de un zoom de apertura variable (interpolación log–log entre extremos).
 * Ej.: 18–55 f/3.5–5.6 a 24 mm ⇒ f/3.95 (se muestra f/4).
 */
export function variableMaxAperture(focalMm: number, wide: [number, number], tele: [number, number]): number {
  const [fW, nW] = wide;
  const [fT, nT] = tele;
  if (focalMm <= fW) return nW;
  if (focalMm >= fT) return nT;
  const t = Math.log(focalMm / fW) / Math.log(fT / fW);
  return nW * Math.pow(nT / nW, t);
}

/** Apertura efectiva en macro: N·(1 + m/P), con P = ampliación de pupila (1 en lentes simétricas). */
export function effectiveAperture(aperture: number, magnification: number, pupil = 1): number {
  return aperture * (1 + magnification / pupil);
}

/** Profundidad de campo total en macro (mm): 2·N·c·(1 + m)/m². */
export function macroDofMm(aperture: number, cocMm: number, magnification: number): number {
  return (2 * aperture * cocMm * (1 + magnification)) / (magnification * magnification);
}

/** Aplica la distorsión radial a un punto normalizado (−1…1 respecto de la semidiagonal). */
export function distortPoint(x: number, y: number, k1: number): [number, number] {
  const r2 = x * x + y * y;
  const f = 1 + k1 * r2;
  return [x * f, y * f];
}
