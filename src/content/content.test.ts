import { describe, expect, it } from 'vitest';
import { APERTURES, FOCAL_LENGTHS, ISOS, SHUTTERS, computeMetrics, evaluateTargets, nearestStop } from '../engine';
import type { CameraSettings } from '../engine';
import { DEFAULT_SETTINGS } from '../state/useCamera';
import { SCENES } from '../sim/scenes';
import { WB_PRESETS } from '../engine/whiteBalance';
import { CHALLENGES } from './challenges';
import { WHITE_BALANCE } from './fundamentals';
import { QUIZ } from './quiz';
import { SCENARIOS } from './scenarios';

/** Ajustes de un desafío tal como los vería el alumno (valores ajustados a la escala por tercios). */
function settingsFor(sceneId: keyof typeof SCENES, a: number, t: number, iso: number, focal: number, tripod = false): CameraSettings {
  const scene = SCENES[sceneId];
  return {
    ...DEFAULT_SETTINGS,
    aperture: nearestStop(APERTURES, a).value,
    shutter: nearestStop(SHUTTERS, t).value,
    iso: nearestStop(ISOS, iso).value,
    focalMm: focal,
    focusM: scene.defaults.focusM,
    wbK: scene.defaults.wbK,
    tripod,
  };
}

describe('desafíos', () => {
  for (const c of CHALLENGES) {
    const scene = SCENES[c.sceneId];
    it(`${c.id}: la escena existe y el estado inicial no cumple todos los objetivos`, () => {
      expect(scene).toBeDefined();
      const m = computeMetrics(settingsFor(c.sceneId, c.initial.aperture, c.initial.shutterSeconds, c.initial.iso, c.initial.focalMm, c.tripod), scene.lighting);
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
              const m = computeMetrics(settingsFor(c.sceneId, a, t, i, f, c.tripod), scene.lighting);
              if (evaluateTargets(c.targets, m).every((r) => r.pass)) {
                solved = true;
                break search;
              }
            }
      expect(solved).toBe(true);
    });
  }
});

/**
 * Solución que da la explicación de cada desafío (apertura, tiempo en s, ISO y, si cambia, focal).
 * Si la escena o el texto cambian, esta tabla obliga a que ambos sigan diciendo lo mismo que el motor.
 */
const EXPLAINED: Record<string, { a: number; t: number; iso: number; focal?: number }> = {
  'c01-solo-velocidad': { a: 8, t: 1 / 125, iso: 100 },
  'c02-solo-apertura': { a: 2, t: 1 / 500, iso: 100 },
  'c03-foto-quemada': { a: 8, t: 1 / 60, iso: 100 },
  'c04-foto-movida': { a: 8, t: 1 / 250, iso: 400 },
  'c05-exposicion-equivalente': { a: 4, t: 1 / 500, iso: 100 },
  'c06-congela-al-delantero': { a: 8, t: 1 / 1000, iso: 800 },
  'c07-fondo-cremoso': { a: 2, t: 1 / 500, iso: 100 },
  'c08-cascada-seda': { a: 16, t: 1 / 2, iso: 100 },
  'c09-ciudad-a-pulso': { a: 2, t: 1 / 40, iso: 400 },
  'c10-estelas-de-luz': { a: 11, t: 4, iso: 100 },
  'c11-paisaje-nitido': { a: 8, t: 1 / 125, iso: 100 },
  'c12-zona-street': { a: 8, t: 1 / 250, iso: 400 },
  'c13-estrellas-puntuales': { a: 2.8, t: 15, iso: 6400, focal: 20 },
  'c14-estudio-rostro': { a: 5.6, t: 1 / 125, iso: 800 },
  'c15-producto-sin-difraccion': { a: 8, t: 1 / 8, iso: 100 },
  'c16-compresion-retrato': { a: 2, t: 1 / 500, iso: 100, focal: 135 },
  'c17-tele-apertura-variable': { a: 5.6, t: 1 / 2000, iso: 800 },
  'c18-ciclista-nocturno': { a: 1.4, t: 1 / 500, iso: 3200 },
  'c19-via-lactea-24mm': { a: 2, t: 15, iso: 3200 },
};

describe('desafíos: la solución explicada aprueba en el motor', () => {
  it('hay una solución registrada para cada desafío', () => {
    expect(Object.keys(EXPLAINED).sort()).toEqual(CHALLENGES.map((c) => c.id).sort());
  });
  for (const c of CHALLENGES) {
    const sol = EXPLAINED[c.id];
    if (!sol) continue;
    it(`${c.id}: la solución de la explicación cumple todos los criterios`, () => {
      const scene = SCENES[c.sceneId];
      const m = computeMetrics(settingsFor(c.sceneId, sol.a, sol.t, sol.iso, sol.focal ?? c.initial.focalMm, c.tripod), scene.lighting);
      const failed = evaluateTargets(c.targets, m).filter((r) => !r.pass);
      expect(failed.map((r) => `${r.label} (${r.actual.toFixed(2)})`)).toEqual([]);
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

describe('balance de blancos', () => {
  it('la tabla de Fundamentos usa los mismos Kelvin que los preajustes del motor', () => {
    for (const preset of WB_PRESETS) {
      const row = WHITE_BALANCE.find((w) => w.id === preset.id);
      expect(row, preset.id).toBeDefined();
      expect(row?.kelvin, preset.id).toBe(preset.kelvin);
    }
  });
});
