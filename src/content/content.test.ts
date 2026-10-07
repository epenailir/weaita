import { describe, expect, it } from 'vitest';
import { APERTURES, FOCAL_LENGTHS, ISOS, SHUTTERS, computeMetrics, evaluateTargets, nearestStop } from '../engine';
import type { CameraSettings } from '../engine';
import { DEFAULT_SETTINGS } from '../state/useCamera';
import { SCENES } from '../sim/scenes';
import { CHALLENGES } from './challenges';
import { QUIZ } from './quiz';
import { SCENARIOS } from './scenarios';

/** Ajustes de un desafío tal como los vería el alumno (valores ajustados a la escala por tercios). */
function settingsFor(sceneId: keyof typeof SCENES, a: number, t: number, iso: number, focal: number): CameraSettings {
  const scene = SCENES[sceneId];
  return {
    ...DEFAULT_SETTINGS,
    aperture: nearestStop(APERTURES, a).value,
    shutter: nearestStop(SHUTTERS, t).value,
    iso: nearestStop(ISOS, iso).value,
    focalMm: focal,
    focusM: scene.defaults.focusM,
    wbK: scene.defaults.wbK,
  };
}

describe('desafíos', () => {
  for (const c of CHALLENGES) {
    const scene = SCENES[c.sceneId];
    it(`${c.id}: la escena existe y el estado inicial no cumple todos los objetivos`, () => {
      expect(scene).toBeDefined();
      const m = computeMetrics(settingsFor(c.sceneId, c.initial.aperture, c.initial.shutterSeconds, c.initial.iso, c.initial.focalMm), scene.lighting);
      expect(evaluateTargets(c.targets, m).every((r) => r.pass)).toBe(false);
    });
    it(`${c.id}: tiene al menos una solución con los parámetros desbloqueados`, () => {
      const lock = new Set(c.locked);
      const as = lock.has('aperture') ? [c.initial.aperture] : APERTURES.map((x) => x.value);
      const ts = lock.has('shutter') ? [c.initial.shutterSeconds] : SHUTTERS.map((x) => x.value);
      const is = lock.has('iso') ? [c.initial.iso] : ISOS.map((x) => x.value);
      const fs = lock.has('focal')
        ? [c.initial.focalMm]
        : FOCAL_LENGTHS.filter((f) => f >= scene.focalRange[0] && f <= scene.focalRange[1]);
      let solved = false;
      search: for (const a of as)
        for (const t of ts)
          for (const i of is)
            for (const f of fs) {
              const m = computeMetrics(settingsFor(c.sceneId, a, t, i, f), scene.lighting);
              if (evaluateTargets(c.targets, m).every((r) => r.pass)) {
                solved = true;
                break search;
              }
            }
      expect(solved).toBe(true);
    });
  }
});

describe('quiz', () => {
  it('cada pregunta tiene 4 opciones y un índice correcto válido', () => {
    for (const q of QUIZ) {
      expect(q.options).toHaveLength(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(4);
    }
  });
});

describe('escenarios', () => {
  it('la receta recomendada expone correctamente su escena (±0,5 EV)', () => {
    for (const s of SCENARIOS) {
      const r = s.recommended;
      const ev = Math.log2((r.aperture * r.aperture) / r.shutterSeconds) - Math.log2(r.iso / 100);
      expect(Math.abs(ev - s.sceneEV100)).toBeLessThanOrEqual(0.5);
      expect(SCENES[s.id].lighting.ev100).toBe(s.sceneEV100);
    }
  });
});
