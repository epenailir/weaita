/** Niveles del ejemplo resuelto que se desvanece (receta completa → último paso → objetivo). */
import type { RecipeParam } from './model';

export type HelpLevel = 'full' | 'partial' | 'goal';

export interface HelpLevelInfo {
  id: HelpLevel;
  /** Rótulo corto para pantallas estrechas. */
  short: string;
  label: string;
  description: string;
}

export const HELP_LEVELS: HelpLevelInfo[] = [
  {
    id: 'full',
    short: 'Receta',
    label: 'Receta completa',
    description: 'Todos los ajustes a la vista: aplícala, compara el antes y el después, y luego rómpela.',
  },
  {
    id: 'partial',
    short: 'Último paso',
    label: 'Completa el último paso',
    description: 'La receta trae todo menos un ajuste: decídelo tú y dispara para comprobarlo.',
  },
  {
    id: 'goal',
    short: 'Objetivo',
    label: 'Solo el objetivo',
    description: 'Sin receta: solo los criterios de la toma. Configura la cámara desde cero.',
  },
];

/** Nombre del parámetro con artículo, para las consignas. */
export const PARAM_NAME: Record<RecipeParam, string> = {
  mode: 'el modo',
  aperture: 'la apertura',
  shutter: 'la velocidad',
  iso: 'el ISO',
  focal: 'la focal',
  af: 'el modo de enfoque',
  metering: 'la medición',
  wb: 'el balance de blancos',
  format: 'el formato',
  drive: 'el modo de disparo',
  focus: 'la distancia de enfoque',
  support: 'el soporte',
};
