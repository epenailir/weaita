/** Registro de pintores: un pintor procedural por escena. */
import type { SceneId, SimScene } from '../types';
import { astroPainter } from './astro';
import { goldenHourPainter } from './goldenHour';
import { landscapePainter } from './landscape';
import { nightCityPainter } from './nightCity';
import { plazaPainter } from './plaza';
import { sportsPainter } from './sports';
import { streetPainter } from './street';
import { studioPainter } from './studio';
import { waterfallPainter } from './waterfall';
import type { ScenePainter } from './types';

const FACTORIES: Record<SceneId, (scene: SimScene) => ScenePainter> = {
  plaza: plazaPainter,
  'golden-hour-portrait': goldenHourPainter,
  'sports-action': sportsPainter,
  landscape: landscapePainter,
  astro: astroPainter,
  street: streetPainter,
  waterfall: waterfallPainter,
  'night-city': nightCityPainter,
  studio: studioPainter,
};

export function createPainter(id: SceneId, scene: SimScene): ScenePainter {
  return FACTORIES[id](scene);
}

export type { ScenePainter, SceneLayer, PaintFrame, Emitter } from './types';
