/** Registro de pintores: un pintor procedural por escena. */
import type { SceneId, SimScene } from '../types';
import { plazaPainter } from './plaza';
import type { ScenePainter } from './types';

const FACTORIES: Record<SceneId, (scene: SimScene) => ScenePainter> = {
  plaza: plazaPainter,
  'golden-hour-portrait': plazaPainter,
  'sports-action': plazaPainter,
  landscape: plazaPainter,
  astro: plazaPainter,
  street: plazaPainter,
  waterfall: plazaPainter,
  'night-city': plazaPainter,
};

export function createPainter(id: SceneId, scene: SimScene): ScenePainter {
  return FACTORIES[id](scene);
}

export type { ScenePainter, SceneLayer, PaintFrame, Emitter } from './types';
