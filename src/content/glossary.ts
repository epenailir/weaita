// Contenido pedagógico. Fuente: investigación del proyecto (ver src/content/sources.ts).
import type { GlossaryEntry } from './types';

export const GLOSSARY: GlossaryEntry[] = [
  {
    "term": "AF-C / AI Servo",
    "def": "Modo de autofoco continuo que sigue y predice el movimiento del sujeto."
  },
  {
    "term": "Apertura",
    "def": "Abertura ajustable del objetivo que regula la luz y la profundidad de campo. Se expresa con el número f."
  },
  {
    "term": "Auto-ISO",
    "def": "Función en la que la cámara elige el ISO dentro de un máximo y, a veces, una velocidad mínima que tú defines."
  },
  {
    "term": "Balance de blancos",
    "def": "Ajuste que neutraliza el tono de la luz para que lo blanco se vea blanco. Si pones más Kelvin que la luz real, la foto sale más cálida."
  },
  {
    "term": "Bokeh",
    "def": "Calidad estética del desenfoque fuera de foco: suavidad, forma de los puntos de luz y transición."
  },
  {
    "term": "Compensación de exposición",
    "def": "Ajuste ±EV que aclara u oscurece la propuesta del exposímetro en los modos P, A, S y M con Auto-ISO."
  },
  {
    "term": "Compresión de perspectiva",
    "def": "Apariencia de planos «apilados» al fotografiar desde lejos con tele. La causa es la distancia, no la focal."
  },
  {
    "term": "Círculo de confusión",
    "def": "Mayor mancha borrosa que el ojo todavía percibe como un punto. Por convención, ≈0.03 mm en full frame y ≈0.02 mm en APS-C."
  },
  {
    "term": "Difracción",
    "def": "Dispersión de la luz al pasar por una abertura pequeña. Suaviza el detalle desde ~f/11–f/16 en full frame."
  },
  {
    "term": "Distancia focal",
    "def": "Distancia óptica, en mm, que determina el ángulo de visión y la ampliación. No es la longitud física del objetivo."
  },
  {
    "term": "Distancia hiperfocal",
    "def": "Distancia de enfoque que lleva la nitidez desde su mitad hasta el infinito. H ≈ f²/(N·c) + f."
  },
  {
    "term": "Distorsión de barril",
    "def": "Las rectas se curvan hacia afuera, como un barril. Típica de los gran angulares y del extremo corto de los zooms."
  },
  {
    "term": "Distorsión de cojín",
    "def": "Las rectas se curvan hacia adentro. Típica de los teleobjetivos y del extremo largo de los zooms."
  },
  {
    "term": "Enfoque por zonas",
    "def": "Prefijar el enfoque manual a una distancia y usar una apertura cerrada para que una franja de distancias quede nítida sin autofoco."
  },
  {
    "term": "Estabilización (IBIS / OIS)",
    "def": "Sistema en el cuerpo (IBIS) o en el objetivo (OIS) que compensa la trepidación. Suele dar 3–5 pasos extra; no congela al sujeto."
  },
  {
    "term": "ETTR",
    "def": "Exponer a la derecha: llevar el histograma lo más a la derecha posible sin recortar, para mejorar la relación señal/ruido en RAW."
  },
  {
    "term": "EV (valor de exposición)",
    "def": "Número que resume una combinación de apertura y tiempo: EV = log₂(N²/t). Referido a ISO 100 (EV100) también describe la luminosidad de una escena."
  },
  {
    "term": "Exposímetro",
    "def": "Medidor de luz de la cámara. Propone una exposición que convierte lo medido en gris medio."
  },
  {
    "term": "Factor de recorte",
    "def": "Relación entre la diagonal de un sensor full frame y la de otro más pequeño: 1.5 en APS-C (1.6 en Canon), 2 en Micro Cuatro Tercios."
  },
  {
    "term": "Filtro ND",
    "def": "Filtro de densidad neutra que reduce la luz sin alterar el color. Un ND de 10 pasos convierte 1/60 s en ~16 s."
  },
  {
    "term": "Focus peaking",
    "def": "Ayuda de enfoque manual que colorea los bordes enfocados en el visor o en la pantalla."
  },
  {
    "term": "Gris medio",
    "def": "Tono de referencia del exposímetro (≈12–18 % de reflectancia). La nieve y los objetos negros lo engañan."
  },
  {
    "term": "Histograma",
    "def": "Gráfico del reparto de tonos de la imagen, de negro (izquierda) a blanco (derecha)."
  },
  {
    "term": "Horquillado (bracketing)",
    "def": "Serie de tomas con exposiciones distintas (por ejemplo −2, 0 y +2 EV) para elegir o combinar en HDR."
  },
  {
    "term": "ISO",
    "def": "Amplificación de la señal del sensor. Duplicarlo duplica el brillo final sin aumentar la luz captada."
  },
  {
    "term": "ISO base",
    "def": "El ISO nativo más bajo de la cámara (normalmente 100). Ofrece el máximo rango dinámico y el mínimo ruido."
  },
  {
    "term": "Modo Bulb (B)",
    "def": "El obturador queda abierto mientras mantienes presionado el disparador. Sirve para tiempos de más de 30 s."
  },
  {
    "term": "Número f",
    "def": "Cociente entre la distancia focal y el diámetro de la abertura. Un 50 mm a f/2 tiene una abertura de 25 mm."
  },
  {
    "term": "Paso (stop)",
    "def": "Duplicar o reducir a la mitad la luz. Unidad común de apertura, velocidad e ISO."
  },
  {
    "term": "Profundidad de campo",
    "def": "Zona delante y detrás del punto enfocado que se ve aceptablemente nítida."
  },
  {
    "term": "Punto dulce",
    "def": "Apertura en la que un objetivo rinde su máxima nitidez, normalmente 2–3 pasos más cerrada que la máxima (f/5.6–f/8)."
  },
  {
    "term": "Rango dinámico",
    "def": "Diferencia, en pasos, entre la sombra más profunda con detalle y la luz más brillante sin recortar. Ronda los 12–14 pasos a ISO base en sensores modernos."
  },
  {
    "term": "RAW",
    "def": "Archivo con los datos del sensor sin procesar, de 12 a 14 bits por canal. Requiere revelado."
  },
  {
    "term": "Recorte (clipping)",
    "def": "Píxeles que llegan a blanco o negro puro y pierden todo detalle."
  },
  {
    "term": "Regla de los 500",
    "def": "Tiempo máximo para estrellas puntuales ≈ 500 ÷ (focal × factor de recorte) segundos. Es aproximada y permisiva con sensores de alta resolución."
  },
  {
    "term": "Regla del recíproco",
    "def": "A pulso, usa como máximo un tiempo de 1/(focal × factor de recorte) segundos."
  },
  {
    "term": "Regla NPF",
    "def": "Versión más precisa de la regla de los 500: t ≈ (35 × N + 30 × p) ÷ f, con N = número f, p = tamaño de píxel en µm y f = focal en mm."
  },
  {
    "term": "Regla Sunny 16",
    "def": "A pleno sol, f/16 con una velocidad ≈ 1/ISO da una exposición correcta (por ejemplo, ISO 100 → 1/125 s)."
  },
  {
    "term": "Ruido",
    "def": "Variación aleatoria de brillo y color que se ve como grano. Aumenta cuando el sensor recibe poca luz."
  },
  {
    "term": "Temperatura de color",
    "def": "Tono de una fuente de luz en Kelvin: ~1900 K una vela, ~3200 K el tungsteno, ~5200 K el sol de mediodía, 7000 K o más la sombra."
  },
  {
    "term": "Trepidación",
    "def": "Foto movida por el temblor de las manos, no por el movimiento del sujeto."
  },
  {
    "term": "Velocidad de obturación",
    "def": "Tiempo que el sensor recibe luz. Controla el movimiento del sujeto y la trepidación."
  },
  {
    "term": "Viñeteo",
    "def": "Oscurecimiento de las esquinas, más notorio a apertura máxima. Disminuye al cerrar 1–2 pasos."
  },
  {
    "term": "Ángulo de visión",
    "def": "Porción de la escena que abarca el objetivo. Con 50 mm en full frame: 47° en diagonal."
  }
];
