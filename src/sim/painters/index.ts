/** Registro de pintores: un pintor procedural por escena. */
import type { SceneId, SimScene } from '../types';
import { goldenHourPainter } from './goldenHour';
import { landscapePainter } from './landscape';
import { plazaPainter } from './plaza';
import type { ScenePainter } from './types';

const FACTORIES: Record<SceneId, (scene: SimScene) => ScenePainter> = {
  plaza: plazaPainter,
  'golden-hour-portrait': goldenHourPainter,
  'sports-action': plazaPainter,
  landscape: landscapePainter,
  astro: plazaPainter,
  street: plazaPainter,
  waterfall: plazaPainter,
  'night-city': plazaPainter,
  studio: plazaPainter,
};

export function createPainter(id: SceneId, scene: SimScene): ScenePainter {
  return FACTORIES[id](scene);
}

export type { ScenePainter, SceneLayer, PaintFrame, Emitter } from './types';
