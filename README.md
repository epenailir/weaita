# Modo M · Escuela interactiva de cámara manual

Plataforma web para aprender a dominar una cámara fotográfica en modo manual, desde cero hasta nivel avanzado. Cada concepto se explica con un simulador en vivo: mueves un control y la imagen, el histograma y el exposímetro reaccionan al instante con la física real de la exposición y la óptica.

## Módulos

| Módulo | Qué enseña | Interacción principal |
| --- | --- | --- |
| **Triángulo de exposición** | Apertura (f/1.4–f/22), obturación (1/4000 s–30 s), ISO (100–25600), exposímetro ±2 EV e histograma | Visor virtual con OSD, imagen simulada en Canvas con bokeh, barrido de movimiento, ruido y recorte de altas luces |
| **Laboratorio de lentes** | Ángulo de visión, compresión de perspectiva, distorsión de barril/cojín, fijos vs. zoom, macro, apertura constante vs. variable | Render en perspectiva de una escena 3D con vista cenital del cono de visión y comparativa de focales |
| **Escenarios** | Ajustes óptimos y retos de golden hour, deporte, paisaje, astrofotografía y fotografía callejera | Sandbox: aplicar la receta recomendada, romperla y ver qué pasa |
| **Fundamentos** | AF-S / AF-C / AF-A / MF con focus peaking, modos M / A / S / P, RAW vs. JPEG, balance de blancos en Kelvin | Infografías interactivas |
| **Desafíos y quiz** | Resolver fotos con problemas ("foto movida", "cascada como seda") y preguntas de opción múltiple | Objetivos medibles validados por el motor físico |

## Arquitectura

```
src/
  engine/            Motor físico puro (sin DOM), probado con Vitest
    types.ts         Tipos de cámara, sensor, métricas y escena
    scales.ts        Escalas en tercios de paso (valores exactos 2^(k/6), 2^(k/3)) y formateo
    exposure.ts      EV, equivalencias, exposímetro y modos A / S / P / Auto-ISO
    optics.ts        DoF, hiperfocal, disco de desenfoque, FOV, barrido, regla de 500 / NPF, distorsión
    whiteBalance.ts  Kelvin → RGB y dominante de color escena/cámara
    noise.ts         Rango dinámico y ruido en función del ISO, PRNG con semilla
    histogram.ts     Histograma RGB + luminancia con porcentaje de recorte
    metrics.ts       ShotMetrics: la única fuente de verdad para el visor y los desafíos
  sim/               Render 2.5D por capas de la imagen simulada (Canvas 2D)
  lens/              Render en perspectiva del laboratorio de lentes
  state/useCamera.ts Estado de la cámara virtual con los automatismos de cada modo
  components/
    ui/              Primitivas accesibles (sliders por tercios, segmentados, paneles…)
    viewfinder/      Visor OSD: escala de exposición, histograma, iris, nivel, cuadrícula
    camera/          Diales y controles de cámara reutilizables
    layout/          Estructura de la aplicación y navegación
  content/           Contenido pedagógico tipado (lecciones, escenarios, desafíos, quiz, glosario, fuentes)
  modules/           Páginas: inicio, exposición, lentes, escenarios, fundamentos, desafíos
```

Principios:

- **Un solo modelo físico.** Las páginas no calculan física por su cuenta: todo pasa por `engine/`. Lo que muestra el exposímetro, lo que se ve en la imagen y lo que valida un desafío sale del mismo `computeMetrics`.
- **Valores exactos, etiquetas nominales.** f/2.8 es en realidad 2^(3/2) = 2,828…; 1/125 es 2⁻⁷ = 1/128. Los cálculos usan los valores exactos para que un paso sea exactamente un paso; la interfaz muestra la etiqueta que imprime la cámara.
- **Sin dependencias pesadas.** React, Tailwind, Lucide y Framer Motion. La simulación usa Canvas 2D.

## Modelo matemático

### Exposición

| Magnitud | Fórmula |
| --- | --- |
| Valor de exposición de unos ajustes, referido a ISO 100 | `EV100 = log2(N² / t) − log2(S / 100)` |
| Desvío respecto de la escena | `Δ = EVescena − EV100` (positivo = sobreexpuesta) |
| Lectura del exposímetro | `Δ + sesgo(modo de medición, escena)` |
| Velocidad para exponer bien | `t = N² / 2^(EVescena + log2(S/100))` |
| Apertura para exponer bien | `N = √(t · 2^(EVescena + log2(S/100)))` |
| ISO para exponer bien | `S = 100 · 2^(log2(N²/t) − EVescena)` |

Los modos automáticos buscan que la lectura del exposímetro sea igual a la compensación elegida. Por eso un contraluz engaña a la medición matricial: el sesgo de la escena hace que el sujeto quede oscuro, igual que en una cámara real.

### Óptica (lente delgada)

| Magnitud | Fórmula |
| --- | --- |
| Hiperfocal | `H = f² / (N · c) + f` |
| Límite cercano de nitidez | `Dn = s (H − f) / (H + s − 2f)` |
| Límite lejano | `Df = s (H − f) / (H − s)` si `s < H`, si no ∞ |
| Ampliación | `m = f / (s − f)` |
| Disco de desenfoque de un objeto a distancia `d` | `b = (f · m / N) · |d − s| / d` |
| Ángulo de visión | `2 · atan(dimensión del sensor / 2f)` |
| Barrido por movimiento (px) | `f · (v · t / d) / ancho del sensor · ancho de la imagen` |
| Límite a pulso | `t ≤ 2^estabilización / (f · factor de recorte)` |
| Regla de los 500 | `t ≤ 500 / (f · factor de recorte)` |
| Regla NPF | `t ≤ (35 N + 30 p) / f`, con `p` el tamaño de píxel en µm |
| Distorsión radial (Brown–Conrady) | `r' = r (1 + k₁ r²)`; `k₁ < 0` barril, `k₁ > 0` cojín |

El círculo de confusión por formato es ≈ diagonal / 1500 (0,030 mm en full frame).

### Ruido, rango dinámico y color

- Rango dinámico: curva típica de un sensor full frame moderno, de 14 pasos a ISO 100 a ≈ 6,4 a ISO 25600, interpolada en `log2(ISO)`.
- Ruido de luminancia `σ ∝ (ISO/100)^0.56`, amplificado en las sombras; ruido cromático de baja frecuencia `σ ∝ (ISO/100)^0.72`.
- Balance de blancos: color de cuerpo negro por temperatura (aproximación de Tanner Helland) y dominante = `RGB(K escena) / RGB(K cámara)`, normalizada en luminancia.

## Desarrollo

```bash
npm install
npm run dev          # servidor de desarrollo
npm test             # pruebas del motor físico
npm run typecheck    # TypeScript estricto
npm run build        # build de producción en dist/
npm run build:single # un único HTML autocontenido en dist-single/
```

## Despliegue

- **GitHub Pages**: el workflow `.github/workflows/deploy-pages.yml` prueba, compila y publica `dist/` en cada push. Actívalo una vez en *Settings → Pages → Build and deployment → Source: GitHub Actions*.
- **Netlify**: `netlify.toml` ya define el comando (`npm run build`) y la carpeta (`dist`). En Netlify: *Add new site → Import an existing project → GitHub → epenailir/weaita* y despliega; cada push vuelve a publicar.

La app usa rutas por hash (`#exposicion`) y rutas relativas (`base: './'`), así que funciona en cualquier subcarpeta sin reglas de redirección.
