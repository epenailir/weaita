/**
 * Escena 3D del laboratorio de lentes (unidades: metros).
 * Ejes: X a la derecha, Y hacia arriba, Z hacia el fondo. Los pies del sujeto están en el
 * origen y la cámara se sitúa en (0, CAMERA_HEIGHT_M, −distancia), mirando en horizontal.
 * Es un paseo arbolado con farolas que termina en una plaza con una fila de edificios;
 * detrás, tres cordones montañosos a 2,5, 5 y 9 km.
 */
import { hex } from './color';
import type { RGB } from './color';
import { seededRandom } from './noise';

/** Altura de la persona que hace de sujeto. */
export const SUBJECT_HEIGHT_M = 1.75;
/** Altura de la cámara (a la altura del pecho). */
export const CAMERA_HEIGHT_M = 1.25;
/** Fracción de la altura del encuadre que ocupa la persona en el modo «mantener encuadre». */
export const FRAME_FILL = 0.6;
/** Semiancho del paseo pavimentado. */
export const PATH_HALF_WIDTH_M = 1.6;
/** Comienzo de la plaza frente a los edificios. */
export const PLAZA_START_M = 100;
/** Distancia nominal del sujeto a la fachada de los edificios (para las lecturas). */
export const BUILDINGS_BEHIND_M = 110;
/** Separación entre farolas. */
export const LAMP_SPACING_M = 8;

export interface BuildingSpec {
  x0: number;
  x1: number;
  /** Z de la fachada (cara visible desde la cámara). */
  z: number;
  depth: number;
  height: number;
  color: RGB;
  floorH: number;
  /** Columnas de ventanas. */
  cols: number;
  /** Probabilidad de ventana encendida. */
  litRatio: number;
  seed: number;
  /** Planta baja con escaparate iluminado. */
  shop: boolean;
}

export interface TreeLobe {
  dx: number;
  dy: number;
  r: number;
}

export interface TreeSpec {
  x: number;
  z: number;
  height: number;
  crown: number;
  lobes: TreeLobe[];
  tone: RGB;
}

export interface LampSpec {
  x: number;
  z: number;
  height: number;
}

export interface MountainSpec {
  z: number;
  base: number;
  amp: number;
  wavelength: number;
  seed: number;
  color: RGB;
  ridged: boolean;
  /** Cota de nieve (m) o null. */
  snowLine: number | null;
}

export interface LensScene {
  buildings: BuildingSpec[];
  trees: TreeSpec[];
  lamps: LampSpec[];
  mountains: MountainSpec[];
}

const FACADES: RGB[] = ['#3b4354', '#4a4954', '#574e48', '#35414b', '#4b5363', '#3f3a45', '#5a5650'].map(hex);
const FOLIAGE: RGB[] = ['#2c4632', '#34503a', '#3a5236', '#2a4238', '#41583a'].map(hex);

function createBuildings(rnd: () => number): BuildingSpec[] {
  const out: BuildingSpec[] = [];
  let x = -190;
  let i = 0;
  while (x < 190) {
    // Huecos ocasionales (calles) por los que asoman las montañas
    if (i > 0 && rnd() < 0.14) x += 7 + rnd() * 9;
    const width = 9 + rnd() * 12;
    const tall = rnd() < 0.18;
    const height = tall ? 19 + rnd() * 6 : 8 + rnd() * 9;
    out.push({
      x0: x,
      x1: x + width,
      z: BUILDINGS_BEHIND_M + rnd() * 7,
      depth: 12 + rnd() * 8,
      height,
      color: FACADES[Math.floor(rnd() * FACADES.length)] ?? FACADES[0]!,
      floorH: 3.1 + rnd() * 0.4,
      cols: Math.max(2, Math.floor((width - 1.6) / (2.2 + rnd() * 0.8))),
      litRatio: 0.3 + rnd() * 0.35,
      seed: Math.floor(rnd() * 1e9),
      shop: rnd() < 0.65,
    });
    x += width + 0.4 + rnd() * 1.2;
    i++;
  }
  return out;
}

function createTrees(rnd: () => number): TreeSpec[] {
  const out: TreeSpec[] = [];
  const count = 64;
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const z = -70 + rnd() * 168;
    const minX = z < 0 ? 7 : 4.8;
    const x = side * (minX + rnd() * 16);
    const height = 5.5 + rnd() * 5;
    const crown = height * (0.22 + rnd() * 0.09);
    const lobes: TreeLobe[] = [{ dx: 0, dy: 0, r: crown }];
    const n = 3 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const a = rnd() * Math.PI * 2;
      const d = crown * (0.3 + rnd() * 0.35);
      lobes.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.75, r: crown * (0.45 + rnd() * 0.3) });
    }
    out.push({ x, z, height, crown, lobes, tone: FOLIAGE[Math.floor(rnd() * FOLIAGE.length)] ?? FOLIAGE[0]! });
  }
  return out;
}

function createLamps(): LampSpec[] {
  const out: LampSpec[] = [];
  for (let i = -8; i <= 12; i++) {
    const z = 6 + i * LAMP_SPACING_M;
    out.push({ x: -2.4, z, height: 4 }, { x: 2.4, z, height: 4 });
  }
  return out;
}

const MOUNTAINS: MountainSpec[] = [
  { z: 9000, base: 380, amp: 1500, wavelength: 2400, seed: 31, color: hex('#566282'), ridged: true, snowLine: 1250 },
  { z: 5000, base: 160, amp: 720, wavelength: 1500, seed: 57, color: hex('#36435f'), ridged: false, snowLine: null },
  { z: 2500, base: 40, amp: 300, wavelength: 700, seed: 83, color: hex('#1f2d2c'), ridged: false, snowLine: null },
];

/** Crea la escena (determinista para una misma semilla). */
export function createLensScene(seed = 20240611): LensScene {
  const rnd = seededRandom(seed);
  const buildings = createBuildings(rnd);
  const trees = createTrees(rnd);
  return { buildings, trees, lamps: createLamps(), mountains: MOUNTAINS };
}

/** Escena compartida por todos los visores de la página. */
export const LENS_SCENE: LensScene = createLensScene();
