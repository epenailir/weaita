// Contenido pedagógico. Fuente: investigación del proyecto (ver src/content/sources.ts).
import type { QuizQuestion } from './types';

export const QUIZ: QuizQuestion[] = [
  {
    "id": "q01",
    "topic": "aperture",
    "level": "Cero",
    "question": "¿Cuál de estas aperturas deja entrar MÁS luz?",
    "options": [
      "f/16",
      "f/5.6",
      "f/1.4",
      "f/4"
    ],
    "correctIndex": 2,
    "explanation": "El número f es la focal dividida por el diámetro de la abertura: cuanto menor el número, mayor la abertura. f/1.4 deja entrar 128 veces más luz que f/16 (7 pasos)."
  },
  {
    "id": "q02",
    "topic": "shutter-speed",
    "level": "Cero",
    "question": "Pasas de 1/250 s a 1/125 s. ¿Qué ocurre con la luz?",
    "options": [
      "Entra la mitad de luz",
      "No cambia; solo cambia el ruido",
      "Entra cuatro veces más luz",
      "Entra el doble de luz (+1 paso)"
    ],
    "correctIndex": 3,
    "explanation": "1/125 s es el doble de tiempo que 1/250 s: el sensor recibe el doble de luz, es decir, un paso más."
  },
  {
    "id": "q03",
    "topic": "iso",
    "level": "Cero",
    "question": "¿Qué hace realmente subir el ISO?",
    "options": [
      "Abre más el diafragma",
      "Hace que lleguen más fotones al sensor",
      "Amplifica la señal de la luz ya captada",
      "Alarga el tiempo de exposición"
    ],
    "correctIndex": 2,
    "explanation": "El ISO no cambia la cantidad de luz que llega al sensor: amplifica la señal. Por eso no reemplaza a la luz real y, con poca luz, el ruido aumenta."
  },
  {
    "id": "q04",
    "topic": "stops",
    "level": "Cero",
    "question": "¿Cuántos pasos hay entre ISO 100 e ISO 1600?",
    "options": [
      "4 pasos",
      "2 pasos",
      "8 pasos",
      "16 pasos"
    ],
    "correctIndex": 0,
    "explanation": "100 → 200 → 400 → 800 → 1600: cuatro duplicaciones. ISO 1600 aclara 16 veces (2⁴) respecto de ISO 100."
  },
  {
    "id": "q05",
    "topic": "camera-modes",
    "level": "Cero",
    "question": "¿En qué modo eliges tú la apertura y la cámara elige la velocidad?",
    "options": [
      "S / Tv",
      "P",
      "M",
      "A / Av"
    ],
    "correctIndex": 3,
    "explanation": "En prioridad a la apertura (A o Av) tú fijas el número f y la cámara calcula la velocidad para una exposición correcta."
  },
  {
    "id": "q06",
    "topic": "exposure-triangle",
    "level": "Básico",
    "question": "Exposición correcta: f/8, 1/125 s, ISO 100. Abres a f/4 sin tocar el ISO. ¿Qué velocidad mantiene el mismo brillo?",
    "options": [
      "1/250 s",
      "1/60 s",
      "1/500 s",
      "1/1000 s"
    ],
    "correctIndex": 2,
    "explanation": "De f/8 a f/4 hay 2 pasos más de luz; el tiempo debe bajar 2 pasos: 1/125 → 1/250 → 1/500 s."
  },
  {
    "id": "q07",
    "topic": "shutter-speed",
    "level": "Básico",
    "question": "Usas un 200 mm en una cámara APS-C (factor 1.5) sin estabilizador. ¿Qué velocidad mínima conviene a pulso?",
    "options": [
      "1/200 s",
      "1/320 s",
      "1/60 s",
      "1/1000 s"
    ],
    "correctIndex": 1,
    "explanation": "Regla del recíproco: 1/(200 × 1.5) = 1/300 s. El valor estándar seguro más cercano es 1/320 s."
  },
  {
    "id": "q08",
    "topic": "depth-of-field",
    "level": "Básico",
    "question": "¿Qué combinación da MENOS profundidad de campo?",
    "options": [
      "24 mm a f/11, sujeto a 5 m",
      "85 mm a f/1.8, sujeto a 2 m",
      "50 mm a f/8, sujeto a 3 m",
      "35 mm a f/5.6, sujeto a 10 m"
    ],
    "correctIndex": 1,
    "explanation": "Focal larga, apertura muy abierta y sujeto cercano reducen la profundidad. 85 mm a f/1.8 a 2 m deja apenas ~6 cm nítidos en full frame."
  },
  {
    "id": "q09",
    "topic": "metering",
    "level": "Básico",
    "question": "Fotografías un paisaje nevado en modo A con medición matricial y sin compensación. ¿Cómo sale la nieve?",
    "options": [
      "Blanca y correcta",
      "Quemada, sin detalle",
      "Gris: subexpuesta",
      "Azul por el balance de blancos"
    ],
    "correctIndex": 2,
    "explanation": "El exposímetro intenta llevar lo que mide a gris medio. La nieve, mucho más clara, queda gris. Corrige con +1 a +2 EV."
  },
  {
    "id": "q10",
    "topic": "exposure-compensation",
    "level": "Básico",
    "question": "Un gato negro sobre una manta negra llena el encuadre. ¿Qué compensación aplicas?",
    "options": [
      "+2 EV",
      "+1 EV",
      "0 EV",
      "−1 a −2 EV"
    ],
    "correctIndex": 3,
    "explanation": "El exposímetro aclararía el negro hasta gris medio (sobreexposición). Restar 1 o 2 pasos devuelve el negro a negro."
  },
  {
    "id": "q11",
    "topic": "histogram",
    "level": "Básico",
    "question": "El histograma muestra una columna alta pegada al borde derecho. ¿Qué significa?",
    "options": [
      "Altas luces recortadas: zonas blancas sin detalle",
      "Sombras sin detalle",
      "Exposición ideal",
      "Demasiado ruido"
    ],
    "correctIndex": 0,
    "explanation": "El borde derecho representa el blanco puro. Una acumulación ahí indica píxeles recortados, sin información recuperable en JPEG."
  },
  {
    "id": "q12",
    "topic": "autofocus",
    "level": "Básico",
    "question": "Un niño corre hacia ti en un parque. ¿Qué modo de enfoque usas?",
    "options": [
      "AF-S / One-Shot",
      "MF con focus peaking",
      "AF-C / AI Servo",
      "AF-S con bloqueo de foco"
    ],
    "correctIndex": 2,
    "explanation": "AF-C (AI Servo en Canon) reenfoca sin parar y predice el movimiento. AF-S dejaría el foco donde estaba el niño al presionar el botón."
  },
  {
    "id": "q13",
    "topic": "white-balance",
    "level": "Básico",
    "question": "Bajo bombillas incandescentes (~2800 K) tus fotos salen naranjas. ¿Qué preset corrige mejor?",
    "options": [
      "Sombra (≈7000 K)",
      "Tungsteno (≈3200 K)",
      "Nublado (≈6000 K)",
      "Flash (≈5500 K)"
    ],
    "correctIndex": 1,
    "explanation": "Le indicas a la cámara que la luz es cálida y ella compensa con azul. Si aún queda naranja, baja a 2800–3000 K en Kelvin."
  },
  {
    "id": "q14",
    "topic": "shutter-speed",
    "level": "Básico",
    "question": "¿Qué ajuste produce el efecto seda en una cascada?",
    "options": [
      "1/2 s a 2 s con trípode",
      "1/1000 s a pulso",
      "1/125 s con ISO alto",
      "f/1.4 a 1/4000 s"
    ],
    "correctIndex": 0,
    "explanation": "El agua necesita tiempos de alrededor de medio segundo o más para fundirse en una textura sedosa. El trípode mantiene nítidas las rocas."
  },
  {
    "id": "q15",
    "topic": "metering",
    "level": "Intermedio",
    "question": "Retrato a contraluz con el sol detrás del modelo. ¿Qué medición expone mejor el rostro?",
    "options": [
      "Matricial sin compensar",
      "Puntual sobre el rostro",
      "Ponderada a altas luces",
      "Ponderada al centro apuntando al cielo"
    ],
    "correctIndex": 1,
    "explanation": "La puntual mide solo el rostro (≈1.5–4 % del cuadro) y lo expone sin que el cielo brillante influya. Ajusta +0.7 EV si la piel es clara."
  },
  {
    "id": "q16",
    "topic": "lenses",
    "level": "Intermedio",
    "question": "¿Qué causa realmente la «compresión» de perspectiva asociada al teleobjetivo?",
    "options": [
      "La focal larga por sí misma",
      "El estabilizador óptico",
      "La apertura muy abierta",
      "La mayor distancia entre la cámara y el sujeto"
    ],
    "correctIndex": 3,
    "explanation": "La perspectiva depende solo de la posición de la cámara. El tele te obliga a alejarte para encuadrar igual, y desde lejos sujeto y fondo tienen tamaños relativos más parecidos. Un recorte de un 24 mm tomado desde el mismo lugar muestra la misma compresión."
  },
  {
    "id": "q17",
    "topic": "depth-of-field",
    "level": "Intermedio",
    "question": "Con 24 mm a f/11 en full frame (c = 0.03 mm), la hiperfocal es ~1.8 m. Si enfocas ahí, ¿qué queda nítido?",
    "options": [
      "De ~0.9 m al infinito",
      "Solo lo que está a 1.8 m",
      "De 1.8 m al infinito",
      "De 0 a 3.6 m"
    ],
    "correctIndex": 0,
    "explanation": "Enfocar a la hiperfocal H hace nítido todo desde H/2 hasta el infinito: de ~0.9 m al infinito."
  },
  {
    "id": "q18",
    "topic": "file-formats",
    "level": "Intermedio",
    "question": "¿Por qué un RAW permite recuperar más detalle que un JPEG?",
    "options": [
      "Guarda 12–14 bits por canal sin curva ni balance aplicados",
      "Tiene más megapíxeles",
      "Usa una compresión con pérdida más eficiente",
      "Incluye el balance de blancos fijo"
    ],
    "correctIndex": 0,
    "explanation": "El RAW guarda los datos del sensor con 4096–16 384 niveles por canal, frente a 256 del JPEG, y sin decisiones de contraste ni color irreversibles."
  },
  {
    "id": "q19",
    "topic": "lenses",
    "level": "Intermedio",
    "question": "Un zoom 18–55 mm f/3.5–5.6 colocado en 55 mm tiene una apertura máxima de…",
    "options": [
      "f/3.5",
      "f/5.6",
      "f/2.8",
      "f/8"
    ],
    "correctIndex": 1,
    "explanation": "En los zooms de apertura variable, el primer número es la apertura máxima en el extremo corto y el segundo, en el largo. Pierdes ~1⅓ pasos al hacer zoom."
  },
  {
    "id": "q20",
    "topic": "depth-of-field",
    "level": "Intermedio",
    "question": "Enfoque por zonas con 35 mm a f/8 y enfoque fijo a 3 m (full frame). ¿Cuál es la zona nítida aproximada?",
    "options": [
      "De 2.9 a 3.1 m",
      "De 0.5 m al infinito",
      "De 3 a 30 m",
      "De 1.9 a 7 m"
    ],
    "correctIndex": 3,
    "explanation": "La hiperfocal de 35 mm a f/8 es ~5.1 m. Enfocando a 3 m, la zona nítida va de ~1.9 a ~7.2 m: suficiente para disparar sin autofoco."
  },
  {
    "id": "q21",
    "topic": "astro",
    "level": "Avanzado",
    "question": "Regla de los 500 con un 20 mm en full frame: ¿cuál es el tiempo máximo para estrellas puntuales?",
    "options": [
      "10 s",
      "25 s",
      "40 s",
      "100 s"
    ],
    "correctIndex": 1,
    "explanation": "500 ÷ 20 = 25 s. La regla NPF, más estricta para sensores de alta resolución, sugiere ~14 s a f/2.8 en 24 MP."
  },
  {
    "id": "q22",
    "topic": "astro",
    "level": "Avanzado",
    "question": "Usas un 24 mm en una APS-C (factor 1.5). Según la regla de los 500, ¿cuál es el tiempo máximo?",
    "options": [
      "≈ 30 s",
      "≈ 21 s",
      "≈ 14 s",
      "≈ 8 s"
    ],
    "correctIndex": 2,
    "explanation": "500 ÷ (24 × 1.5) = 500 ÷ 36 ≈ 13.9 s. El factor de recorte amplía la imagen y los trazos aparecen antes."
  },
  {
    "id": "q23",
    "topic": "iso",
    "level": "Avanzado",
    "question": "Escena nocturna bien expuesta a f/2.8, 1/100 s e ISO 6400. Repites a ISO 400 y aclaras 4 pasos en edición. ¿Resultado típico?",
    "options": [
      "Igual o más ruido en sombras, con posible bandeado",
      "Menos ruido y más rango dinámico",
      "Más profundidad de campo",
      "Colores más precisos"
    ],
    "correctIndex": 0,
    "explanation": "La luz que llegó al sensor es la misma (mismo tiempo y apertura). Aclarar en edición amplifica también el ruido de lectura. En sensores «ISO-invariantes» la diferencia es pequeña, pero rara vez sale mejor."
  },
  {
    "id": "q24",
    "topic": "histogram",
    "level": "Avanzado",
    "question": "¿Qué busca la técnica ETTR (exponer a la derecha) en RAW?",
    "options": [
      "Quemar el cielo a propósito",
      "Subexponer para proteger las luces",
      "Llevar el histograma a la derecha sin recortar, para captar más señal y menos ruido",
      "Centrar siempre el histograma"
    ],
    "correctIndex": 2,
    "explanation": "Más luz = más señal frente al ruido. Llevas el histograma a la derecha sin recortar altas luces importantes y luego oscureces en el revelado."
  },
  {
    "id": "q25",
    "topic": "camera-modes",
    "level": "Avanzado",
    "question": "Estás en M con Auto-ISO, a f/2.8 y 1/1000 s. Aplicas +1 EV de compensación. ¿Qué cambia la cámara?",
    "options": [
      "La velocidad pasa a 1/500 s",
      "La apertura pasa a f/2",
      "Nada: en M la compensación no funciona",
      "El ISO se duplica"
    ],
    "correctIndex": 3,
    "explanation": "Con apertura y velocidad fijas, la única variable automática es el ISO. +1 EV significa duplicarlo (si no llegó al máximo configurado)."
  },
  {
    "id": "q26",
    "topic": "lenses",
    "level": "Avanzado",
    "question": "¿Qué significa que un objetivo sea «macro 1:1»?",
    "options": [
      "El sujeto se proyecta en el sensor a su tamaño real",
      "Su focal es de 100 mm",
      "Enfoca a 1 m de distancia",
      "Su zoom es de un aumento"
    ],
    "correctIndex": 0,
    "explanation": "Ampliación 1:1 = un insecto de 10 mm ocupa 10 mm en el sensor. Esto es independiente de la focal: hay macros 1:1 de 50 a 180 mm."
  },
  {
    "id": "q27",
    "topic": "aperture",
    "level": "Avanzado",
    "question": "En un paisaje con una full frame de 45 MP, ¿por qué conviene evitar f/22?",
    "options": [
      "Entra demasiada luz",
      "Aumenta el viñeteo",
      "La difracción suaviza el detalle fino",
      "Reduce la profundidad de campo"
    ],
    "correctIndex": 2,
    "explanation": "Con aberturas muy pequeñas, la luz se dispersa al pasar por el diafragma (difracción). En sensores de alta resolución se nota desde ~f/11. Usa f/8–f/11 y la hiperfocal."
  },
  {
    "id": "q28",
    "topic": "lenses",
    "level": "Intermedio",
    "question": "¿Qué objetivo conviene para fotografiar edificios sin líneas convergentes?",
    "options": [
      "Ojo de pez de 8 mm",
      "Descentrable (tilt-shift)",
      "Tele de 400 mm",
      "Macro 1:1"
    ],
    "correctIndex": 1,
    "explanation": "El desplazamiento (shift) sube el encuadre sin inclinar la cámara, así las verticales se mantienen paralelas sin corregir en edición."
  }
];
