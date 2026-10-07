/** Tipos del contenido pedagógico (textos en español, datos de escenarios, desafíos y quiz). */
import type { MetricTarget } from '../engine/types';
import type { SceneId } from '../sim/types';

export type Level = 'Cero' | 'Básico' | 'Intermedio' | 'Avanzado';

export interface CurriculumLevel {
  level: Level;
  title: string;
  goals: string[];
  modules: string[];
}

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  body: string[];
  keyFacts: string[];
  commonMistakes: string[];
}

export interface FocalLengthInfo {
  mm: number;
  label: string;
  fovNote: string;
  uses: string[];
  perspective: string;
  distortion: string;
  typicalAperture: string;
}

export interface LensType {
  id: string;
  name: string;
  summary: string;
  pros: string[];
  cons: string[];
  whenToUse: string;
}

export type ScenarioId = 'golden-hour-portrait' | 'sports-action' | 'landscape' | 'astro' | 'street';

export interface Scenario {
  id: ScenarioId;
  name: string;
  tagline: string;
  sceneEV100: number;
  illuminantK: number;
  subjectDistanceM: number;
  subjectSpeedMS: number;
  backgroundDistanceM: number;
  recommended: {
    mode: string;
    aperture: number;
    shutterSeconds: number;
    iso: number;
    focalMm: number;
    af: string;
    metering: string;
    wbK: number;
    format: string;
    drive: string;
    extras: string[];
  };
  why: string[];
  challenges: string[];
  steps: string[];
  mistakes: string[];
}

export interface AfModeInfo {
  id: string;
  name: string;
  aka: string;
  how: string;
  when: string;
  tips: string[];
}

export interface CameraModeInfo {
  id: string;
  letter: string;
  name: string;
  youControl: string[];
  cameraControls: string[];
  when: string;
  tips: string[];
}

export interface FileFormatInfo {
  id: string;
  name: string;
  bitDepth: string;
  pros: string[];
  cons: string[];
  when: string;
}

export interface WhiteBalanceInfo {
  id: string;
  name: string;
  kelvin: number;
  when: string;
  note: string;
}

export interface MeteringModeInfo {
  id: string;
  name: string;
  how: string;
  when: string;
}

export type ChallengeParam = 'aperture' | 'shutter' | 'iso' | 'focal';

export interface Challenge {
  id: string;
  title: string;
  prompt: string;
  sceneId: SceneId;
  level: Level;
  initial: { aperture: number; shutterSeconds: number; iso: number; focalMm: number };
  locked: ChallengeParam[];
  /** La cámara está sobre trípode (sin trepidación). Por defecto, a pulso. */
  tripod?: boolean;
  targets: MetricTarget[];
  hints: string[];
  explanation: string;
}

export interface QuizQuestion {
  id: string;
  topic: string;
  level: Level;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface GlossaryEntry {
  term: string;
  def: string;
}

export interface SourceRef {
  title: string;
  url: string;
  note?: string;
}
