import { describe, expect, it } from 'vitest';
import {
  APERTURES,
  ISOS,
  SENSORS,
  SHUTTERS,
  apertureFor,
  blurDiscMm,
  colorCast,
  computeMetrics,
  depthOfField,
  distortionK1,
  variableMaxAperture,
  airyDiskMm,
  dynamicRangeStops,
  evaluateTargets,
  exposureOffset,
  fieldOfView,
  formatAperture,
  formatShutter,
  formatThirds,
  hyperfocalM,
  isoFor,
  kelvinToRgb,
  motionBlurPx,
  nearestStop,
  npfRuleS,
  resolveExposure,
  rule500S,
  settingsEV100,
  shutterFor,
} from './index';
import type { CameraSettings, SceneLighting } from './types';

const ff = SENSORS.ff;

const lighting: SceneLighting = {
  ev100: 15,
  illuminantK: 5500,
  subjectDistanceM: 6,
  subjectSpeedMS: 5,
  backgroundDistanceM: 40,
  foregroundDistanceM: null,
  meteringBias: { matrix: 0, center: 0, spot: 0 },
  sceneContrastStops: 10,
  hasStars: false,
};

const base: CameraSettings = {
  mode: 'M',
  aperture: 16,
  shutter: 1 / 128,
  iso: 100,
  autoIso: false,
  exposureComp: 0,
  focalMm: 50,
  focusM: 6,
  wbK: 5500,
  af: 'AF-S',
  metering: 'matrix',
  format: 'RAW',
  sensor: 'ff',
  stabilizationStops: 0,
  tripod: false,
};

describe('escalas', () => {
  it('cubren los rangos pedidos en tercios de paso', () => {
    expect(APERTURES[0]!.label).toBe('1.4');
    expect(APERTURES.at(-1)!.label).toBe('22');
    expect(SHUTTERS[0]!.label).toBe('1/4000');
    expect(SHUTTERS.at(-1)!.label).toBe('30"');
    expect(ISOS[0]!.label).toBe('100');
    expect(ISOS.at(-1)!.label).toBe('25600');
    expect(SHUTTERS).toHaveLength(52);
    expect(ISOS).toHaveLength(25);
  });
  it('usa valores físicos exactos', () => {
    expect(nearestStop(APERTURES, 16).value).toBeCloseTo(16, 6);
    expect(nearestStop(SHUTTERS, 1 / 125).value).toBeCloseTo(1 / 128, 6);
    expect(formatAperture(2.8284)).toBe('f/2.8');
    expect(formatShutter(1 / 128)).toBe('1/125');
    expect(formatShutter(1)).toBe('1"');
    expect(formatThirds(4 / 3)).toBe('+1⅓');
    expect(formatThirds(-2 / 3)).toBe('−⅔');
  });
});

describe('exposición', () => {
  it('regla del sol 16: f/16, 1/125, ISO 100 ≈ EV 15', () => {
    expect(settingsEV100(16, 1 / 128, 100)).toBeCloseTo(15, 6);
    expect(exposureOffset(15, 16, 1 / 128, 100)).toBeCloseTo(0, 6);
  });
  it('un paso más de ISO equivale a un paso más de luz', () => {
    expect(exposureOffset(15, 16, 1 / 128, 200)).toBeCloseTo(1, 6);
  });
  it('resuelve el parámetro faltante', () => {
    expect(shutterFor(15, 16, 100)).toBeCloseTo(1 / 128, 8);
    expect(apertureFor(15, 1 / 128, 100)).toBeCloseTo(16, 6);
    expect(isoFor(15, 16, 1 / 128)).toBeCloseTo(100, 6);
  });
  it('prioridad de apertura calcula la velocidad', () => {
    const r = resolveExposure({ ...base, mode: 'A', aperture: 4 }, lighting, ff);
    expect(r.shutter).toBeCloseTo(1 / 2048, 6);
    expect(r.limited).toBeNull();
  });
  it('prioridad de obturación calcula la apertura y avisa si no alcanza', () => {
    const r = resolveExposure({ ...base, mode: 'S', shutter: 1 / 8 }, lighting, ff);
    expect(r.limited).toBe('aperture');
  });
  it('Auto-ISO en M compensa la exposición', () => {
    const r = resolveExposure({ ...base, autoIso: true, aperture: 16, shutter: 1 / 64 }, { ...lighting, ev100: 14 }, ff);
    expect(r.iso).toBeCloseTo(100, 6);
  });
});

describe('óptica', () => {
  it('hiperfocal de 24 mm a f/8 con c = 0,03 mm ≈ 2,42 m', () => {
    expect(hyperfocalM(24, 8, 0.03)).toBeCloseTo(2.424, 3);
  });
  it('profundidad de campo de 50 mm f/1.8 a 2 m', () => {
    const d = depthOfField(50, 1.8, 2, 0.03);
    expect(d.nearM).toBeCloseTo(1.919, 2);
    expect(d.farM).toBeCloseTo(2.088, 2);
  });
  it('enfocando en la hiperfocal el límite lejano es infinito y el cercano H/2', () => {
    const H = hyperfocalM(24, 8, 0.03);
    const d = depthOfField(24, 8, H, 0.03);
    expect(d.farM).toBe(Infinity);
    expect(d.nearM).toBeCloseTo(H / 2, 2);
  });
  it('el disco de desenfoque crece al abrir el diafragma', () => {
    expect(blurDiscMm(85, 1.4, 2, 30)).toBeGreaterThan(blurDiscMm(85, 8, 2, 30));
    expect(blurDiscMm(85, 1.4, 2, 2)).toBeCloseTo(0, 9);
  });
  it('ángulo de visión de 50 mm en FF ≈ 39,6° horizontal', () => {
    expect(fieldOfView(50, ff).h).toBeCloseTo(39.6, 1);
  });
  it('barrido por movimiento: 5 m/s a 6 m con 50 mm y 1/250', () => {
    expect(motionBlurPx(5, 6, 50, 1 / 250, ff, 1000)).toBeCloseTo(4.63, 2);
  });
  it('regla de los 500 y NPF', () => {
    expect(rule500S(50, ff)).toBeCloseTo(10, 6);
    expect(rule500S(20, SENSORS.apsc)).toBeCloseTo(16.34, 2);
    expect(npfRuleS(20, 2.8, ff)).toBeCloseTo((35 * 2.8 + 30 * 5.9) / 20, 6);
  });
});

describe('lentes', () => {
  it('distorsión: barril en gran angular, cojín en tele', () => {
    expect(distortionK1(14)).toBeCloseTo(-0.035, 3);
    expect(distortionK1(200)).toBeCloseTo(0.015, 3);
    expect(Math.abs(distortionK1(50))).toBeLessThan(0.005);
  });
  it('zoom de apertura variable 18–55 f/3.5–5.6 a 24 mm ≈ f/3.95', () => {
    expect(variableMaxAperture(24, [18, 3.5], [55, 5.6])).toBeCloseTo(3.95, 2);
    expect(variableMaxAperture(45, [18, 3.5], [55, 5.6])).toBeCloseTo(5.147, 2);
  });
  it('disco de Airy a f/8 ≈ 0,0107 mm', () => {
    expect(airyDiskMm(8)).toBeCloseTo(0.01074, 4);
  });
  it('el rango dinámico baja con el ISO', () => {
    expect(dynamicRangeStops(100)).toBeCloseTo(11.6, 3);
    expect(dynamicRangeStops(25600)).toBeCloseTo(5.5, 3);
    expect(dynamicRangeStops(1600)).toBeLessThan(dynamicRangeStops(400));
  });
});

describe('balance de blancos', () => {
  it('6600 K es prácticamente blanco', () => {
    const [r, g, b] = kelvinToRgb(6600);
    expect(r).toBeCloseTo(1, 2);
    expect(g).toBeGreaterThan(0.97);
    expect(b).toBeCloseTo(1, 2);
  });
  it('sin dominante cuando escena y cámara coinciden', () => {
    const [r, g, b] = colorCast(4200, 4200);
    expect(r).toBeCloseTo(1, 6);
    expect(g).toBeCloseTo(1, 6);
    expect(b).toBeCloseTo(1, 6);
  });
  it('tungsteno con la cámara en luz día da dominante cálida', () => {
    const [r, , b] = colorCast(3200, 5500);
    expect(r).toBeGreaterThan(b);
  });
});

describe('métricas y objetivos', () => {
  it('evalúa objetivos medibles', () => {
    const m = computeMetrics(base, lighting);
    const res = evaluateTargets(
      [
        { metric: 'exposureError', op: '<=', value: 0.34, label: 'Exposición correcta' },
        { metric: 'subjectMotionBlurPx', op: '<=', value: 1, label: 'Sujeto congelado' },
      ],
      m,
    );
    expect(res[0]!.pass).toBe(true);
    expect(res[1]!.pass).toBe(false);
  });
});
