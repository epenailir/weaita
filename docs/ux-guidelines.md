# Guía de UX y pedagogía

Síntesis de referencias de simuladores (CameraSim, Canon Outside of Auto, Photography Mapped, DOF Simulator, Nikon Lens Simulator, Cambridge in Colour), convenciones de visores de cámara (Sony, Canon, Nikon, Fujifilm, Leica) e investigación educativa (PhET, Mayer 2004, Shute 2008, Hattie y Timperley, Kapur 2021). Las fuentes completas están en `src/content/sources.ts`.

## Principios pedagógicos

1. **Descubrimiento guiado, no exploración libre.** Cada simulador abre con un objetivo concreto y restricciones visibles. Empezar con un parámetro desbloqueado y los demás en AUTO (con candado) y liberar los demás después.
2. **Predecir, observar, explicar.** Antes de mover un control, una pregunta breve ("¿qué le pasará al fondo si cierras a f/11?"). Después se observa en vivo y se explica en una tarjeta corta.
3. **Feedback elaborado y diagnóstico.** No basta "correcto/incorrecto": al disparar se indica qué criterio falló, con el valor medido, y qué parámetro moverías y por qué.
4. **Representaciones vinculadas.** Imagen, histograma, exposímetro, números y diagramas cambian juntos. Las lecciones son documentos reactivos con calculadoras incrustadas donde se explica el concepto.
5. **Atacar los conceptos erróneos.** Tarjetas propias para errores frecuentes: número f mayor = menos luz; el ISO es brillo/ganancia, no luz; el teleobjetivo no "comprime" por sí mismo (es la distancia); la estabilización no congela al sujeto.
6. **Anclaje en situaciones reales.** La luz se expresa con escenas conocidas (sol sobre nieve, nublado, interior, Vía Láctea) además del EV.
7. **Ejemplos resueltos que se desvanecen.** En los escenarios: receta completa → receta con un paso por completar → solo el objetivo.
8. **Sin presión de tiempo por defecto** (WCAG 2.2.1).

## Visor (OSD)

- Imagen 3:2 con barra inferior de exposición: velocidad · apertura · exposímetro (−3…+3, un tick por tercio) · ISO. Fila superior: modo, AF, medición, WB, formato, disparos restantes, batería.
- El valor que el automatismo no puede resolver parpadea a ≤ 2 Hz. El nivel electrónico es blanco y pasa a verde al nivelar. Las zebras son rayas a 45° y el focus peaking es rojo por defecto.
- Dentro del visor, rótulos de texto como en la cámara (AF-S, AWB, RAW, M) en lugar de iconos genéricos.
- Notación: en el OSD, estilo cámara (F2.8, 1/250, 0.5″); en el texto didáctico, f/2.8 y unidades completas. Signo menos real (−) y fracciones ⅓ ⅔.

## Interacción

- **Vista previa en vivo + Disparar.** La imagen reacciona en vivo y "Disparar" evalúa la toma y diagnostica.
- **Valores discretos por tercios.** Teclado según el patrón APG: ←/→ ±⅓, RePág/AvPág ±1 paso, Inicio/Fin. Alternativas al arrastre (botones −/+, clic en un tick).
- **Rueda del mouse** solo con el control enfocado (listener no pasivo) para no secuestrar el desplazamiento.
- **Medidores de costo** bajo cada control: apertura → profundidad de campo; obturación → movimiento y riesgo de trepidación; ISO → ruido y rango dinámico.
- **Comparación A/B**: fijar una toma y compararla con la actual.
- **Estados reversibles**: restablecer escena, volver a la exposición medida.
- **Una región viva** (`role=status`) con un resumen del resultado tras cada cambio, con retardo de 400–600 ms.

## Accesibilidad

- Texto ≥ 4,5:1 y componentes ≥ 3:1. La información nunca depende solo del color: el exposímetro muestra signo y número, y el nivel muestra grados.
- Canvas con `role="img"` y `aria-label` dinámico que describe el resultado.
- `prefers-reduced-motion`: reducir, no eliminar (sin desplazamientos ni zoom; fundidos breves).
- Objetivos táctiles de al menos 24×24 px (44×44 en móvil para acciones principales). Reflow a 320 px sin desplazamiento horizontal.
- Idioma `es-419`, tuteo neutro.
