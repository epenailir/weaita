/**
 * Motor de simulación de imagen: escenas físicas, renderizador por capas en Canvas 2D y hook
 * de React para conectarlo a un <canvas>.
 */
export { SimRenderer } from './renderer';
export { useSimRenderer } from './useSimRenderer';
export type { UseSimRendererOptions } from './useSimRenderer';
export { SCENES, SCENE_LIST } from './scenes';
export type { RenderOptions, RenderResult, SceneId, SimRendererApi, SimScene } from './types';
