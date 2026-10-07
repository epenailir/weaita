import { describe, expect, it } from 'vitest';
import { SENSORS, computeMetrics, nearestStop, APERTURES, ISOS, SHUTTERS, resolveExposure } from '../../engine';
import type { CameraSettings } from '../../engine';
import { DEFAULT_SETTINGS } from '../../state/useCamera';
import { SCENES } from '../../sim/scenes';
import type { SceneId } from '../../sim/types';
import { grade, gradeDynamicRange } from './assessment';
import type { ShotContext, Status } from './assessment';
import { diagnose } from './diagnosis';
import { MISCONCEPTIONS, PREDICTIONS } from './experiments';
import type { Experiment } from './experiments';
import { SCENE_BRIEFS, sceneSettings } from './sceneBriefs';

const RANK: Record<Status, number> = { good: 0, neutral: 0, fair: 1, bad: 2 };

/** Ajustes como los dejaría el reductor de la cámara (valores en la escala). */
function snap(s: CameraSettings): CameraSettings {
  return {
    ...s,
    aperture: nearestStop(APERTURES, s.aperture).value,
    shutter: nearestStop(SHUTTERS, s.shutter).value,
    iso: nearestStop(ISOS, s.iso).value,
  };
}

function contextFor(id: SceneId, settings: CameraSettings): ShotContext {
  const scene = SCENES[id];
  const r = resolveExposure(settings, scene.lighting, SENSORS[settings.sensor]);
  const effective = { ...settings, aperture: r.aperture, shutter: r.shutter, iso: r.iso };
  return {
    scene,
    brief: SCENE_BRIEFS[id],
    settings,
    effective,
    metrics: computeMetrics(effective, scene.lighting),
    limited: r.limited,
    highlightsPct: null,
    rollDeg: 0,
  };
}

/** Aplica el antes y el después de un experimento como lo haría el laboratorio. */
function runExperiment(exp: Experiment) {
  const id = exp.sceneId ?? 'plaza';
  const scene = SCENES[id];
  const base: CameraSettings = { ...DEFAULT_SETTINGS, ...sceneSettings(scene) };
  const before = snap({ ...base, ...exp.before.patch({ scene, settings: base }) });
  const after = snap({ ...before, ...exp.after.patch({ scene, settings: before }) });
  return { before: contextFor(id, before), after: contextFor(id, after) };
}

describe('diagnóstico y consejos', () => {
  for (const id of Object.keys(SCENES) as SceneId[]) {
    it(`cada consejo de «${id}» mejora el criterio que falló`, () => {
      const base = { ...DEFAULT_SETTINGS, ...sceneSettings(SCENES[id]) } as CameraSettings;
      const ctx = contextFor(id, base);
      const d = diagnose(ctx);
      expect(d.headline.length).toBeGreaterThan(0);
      for (const f of d.issues) {
        const a = f.advice;
        if (!a || a.action.kind !== 'settings' || a.criterion === 'highlights' || a.criterion === 'dynamicRange') continue;
        const fixed = contextFor(id, { ...base, ...a.action.patch });
        const before = grade(ctx)[a.criterion] ?? 'good';
        const after = grade(fixed)[a.criterion] ?? 'good';
        expect(RANK[after], `${id}: ${a.criterion}`).toBeLessThan(RANK[before]);
      }
    });
  }

  it('en A sugiere compensar cuando el exposímetro se equivoca', () => {
    const base = { ...DEFAULT_SETTINGS, ...sceneSettings(SCENES['golden-hour-portrait']), mode: 'A' } as CameraSettings;
    const d = diagnose(contextFor('golden-hour-portrait', base));
    const exposure = d.issues.find((f) => f.criterion.id === 'exposure');
    expect(exposure?.criterion.detail).toContain('exposímetro');
    expect(exposure?.advice?.changes.some((c) => c.key === 'exposureComp' || c.key === 'metering')).toBe(true);
  });
});

describe('experimentos de predicción', () => {
  const byLesson = (id: string) => {
    const p = PREDICTIONS.find((x) => x.lessonId === id);
    if (!p) throw new Error(`Falta la predicción de ${id}`);
    return runExperiment(p.experiment);
  };
  const near = (a: number, b: number, tol = 0.2) => Math.abs(a - b) <= tol;

  it('hay una predicción por lección y la respuesta correcta existe', () => {
    expect(PREDICTIONS).toHaveLength(9);
    for (const p of PREDICTIONS) expect(p.options[p.correctIndex]).toBeDefined();
  });

  it('apertura: cerrar a f/11 reduce el desenfoque del fondo sin cambiar el brillo', () => {
    const { before, after } = byLesson('aperture');
    expect(after.metrics.backgroundBlurPct).toBeLessThan(before.metrics.backgroundBlurPct / 3);
    expect(near(before.metrics.exposureOffset, 0) && near(after.metrics.exposureOffset, 0)).toBe(true);
  });

  it('velocidad: 1/30 s barre al ciclista y 1/1000 s lo congela', () => {
    const { before, after } = byLesson('shutter-speed');
    expect(before.metrics.subjectMotionBlurPx).toBeLessThan(2);
    expect(after.metrics.subjectMotionBlurPx).toBeGreaterThan(20);
    expect(near(after.metrics.exposureOffset, 0, 0.4)).toBe(true);
  });

  it('ISO: misma exposición, más ruido y menos rango dinámico', () => {
    const { before, after } = byLesson('iso');
    expect(near(before.metrics.exposureOffset, after.metrics.exposureOffset)).toBe(true);
    expect(after.metrics.noiseScore).toBeGreaterThan(before.metrics.noiseScore + 30);
    expect(after.metrics.dynamicRangeStops).toBeLessThan(before.metrics.dynamicRangeStops - 2);
  });

  it('pasos: f/8 a 1/60 s equivale a f/4 a 1/250 s', () => {
    const { before, after } = byLesson('stops');
    expect(near(before.metrics.exposureOffset, after.metrics.exposureOffset, 0.1)).toBe(true);
  });

  it('triángulo: el ISO cierra la cuenta de 200 a 400', () => {
    const { before, after } = byLesson('exposure-triangle');
    expect(Math.round(before.effective.iso)).toBe(200);
    expect(Math.round(after.effective.iso)).toBe(400);
    expect(near(after.metrics.exposureOffset, 0)).toBe(true);
  });

  it('medición: la matricial a 0 subexpone el rostro; la puntual lo corrige', () => {
    const { before, after } = byLesson('metering');
    expect(near(before.metrics.meterReading, 0, 0.35)).toBe(true);
    expect(before.metrics.exposureOffset).toBeLessThan(-0.6);
    expect(near(after.metrics.meterReading, 0, 0.35) && near(after.metrics.exposureOffset, 0, 0.35)).toBe(true);
  });

  it('histograma: +2 pasos de sobreexposición', () => {
    const { before, after } = byLesson('histogram');
    expect(near(after.metrics.exposureOffset - before.metrics.exposureOffset, 2, 0.1)).toBe(true);
  });

  it('compensación en A: la cámara duplica el tiempo', () => {
    const { before, after } = byLesson('exposure-compensation');
    expect(near(after.effective.shutter / before.effective.shutter, 2, 0.05)).toBe(true);
    expect(after.effective.aperture).toBe(before.effective.aperture);
    expect(after.effective.iso).toBe(before.effective.iso);
  });

  it('hiperfocal: el primer plano entra en la zona nítida', () => {
    const { before, after } = byLesson('depth-of-field');
    expect(grade(before).focus).not.toBe('good');
    expect(grade(after).focus).toBe('good');
  });

  it('mitos: f/16 oscurece 5 pasos, el ISO no cambia la luz y la estabilización no congela', () => {
    const [f, iso, stab] = MISCONCEPTIONS.map((m) => runExperiment(m.experiment));
    if (!f || !iso || !stab) throw new Error('Faltan tarjetas de conceptos erróneos');
    expect(near(f.before.metrics.exposureOffset - f.after.metrics.exposureOffset, 5, 0.1)).toBe(true);
    expect(iso.before.effective.aperture).toBe(iso.after.effective.aperture);
    expect(iso.before.effective.shutter).toBe(iso.after.effective.shutter);
    expect(near(iso.after.metrics.exposureOffset, 0, 0.35)).toBe(true);
    expect(stab.before.metrics.shakeRatio).toBeGreaterThan(1);
    expect(stab.after.metrics.shakeRatio).toBeLessThan(1);
    expect(stab.after.metrics.subjectMotionBlurPx).toBeCloseTo(stab.before.metrics.subjectMotionBlurPx, 5);
  });
});

describe('rango dinámico según el formato', () => {
  it('el margen de 1 paso solo vale en RAW: en JPEG el mismo déficit no es «bien»', () => {
    const scene = SCENES['night-city'];
    const m = { ...computeMetrics(DEFAULT_SETTINGS, scene.lighting), dynamicRangeStops: scene.lighting.sceneContrastStops - 0.7 };
    expect(gradeDynamicRange(m, scene, 'RAW')).toBe('good');
    expect(gradeDynamicRange(m, scene, 'RAW+JPEG')).toBe('good');
    expect(gradeDynamicRange(m, scene, 'JPEG')).not.toBe('good');
  });
});
