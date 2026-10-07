/**
 * Desplaza hasta una sección de la página y le pasa el foco (para que el siguiente Tab
 * siga desde ella). Respeta prefers-reduced-motion: scrollIntoView con 'smooth'
 * ignora la regla CSS scroll-behavior.
 */
export function goToSection(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const reduced = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  el.focus({ preventScroll: true });
}
