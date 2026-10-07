/**
 * Progreso del alumno (lecciones vistas, desafíos superados, puntaje del quiz).
 * Store externo mínimo con useSyncExternalStore para compartirlo entre módulos.
 */
import { useSyncExternalStore } from 'react';
import { readJSON, writeJSON } from './storage';

export interface ProgressState {
  /** ids de lecciones o tarjetas marcadas como vistas */
  lessons: string[];
  /** ids de desafíos superados */
  challenges: string[];
  /** ids de preguntas respondidas correctamente */
  quiz: string[];
  /** escenarios explorados */
  scenarios: string[];
}

const EMPTY: ProgressState = { lessons: [], challenges: [], quiz: [], scenarios: [] };

let state: ProgressState = { ...EMPTY, ...readJSON<Partial<ProgressState>>('progress', {}) };
const listeners = new Set<() => void>();

function emit() {
  writeJSON('progress', state);
  listeners.forEach((l) => l());
}

export const progress = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  mark(kind: keyof ProgressState, id: string) {
    if (state[kind].includes(id)) return;
    state = { ...state, [kind]: [...state[kind], id] };
    emit();
  },
  unmark(kind: keyof ProgressState, id: string) {
    if (!state[kind].includes(id)) return;
    state = { ...state, [kind]: state[kind].filter((x) => x !== id) };
    emit();
  },
  reset() {
    state = { ...EMPTY };
    emit();
  },
};

export function useProgress(): ProgressState {
  return useSyncExternalStore(progress.subscribe, progress.get, progress.get);
}
