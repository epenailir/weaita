/**
 * Acceso a localStorage tolerante a fallos: en ventanas privadas, vistas previas o con el
 * almacenamiento bloqueado, la app sigue funcionando sin persistir.
 */
const PREFIX = 'camara-maestra:';

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
}
