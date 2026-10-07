// Contenido pedagógico. Fuente: investigación del proyecto (ver src/content/sources.ts).
import type { Scenario } from './types';

export const SCENARIOS: Scenario[] = [
  {
    "id": "golden-hour-portrait",
    "name": "Retrato en la hora dorada",
    "tagline": "Luz dorada, fondo cremoso y un rostro bien expuesto a contraluz.",
    "sceneEV100": 11,
    "illuminantK": 3500,
    "subjectDistanceM": 3,
    "subjectSpeedMS": 0.2,
    "backgroundDistanceM": 20,
    "recommended": {
      "mode": "A",
      "aperture": 2,
      "shutterSeconds": 0.002,
      "iso": 100,
      "focalMm": 85,
      "af": "AF-S",
      "metering": "spot",
      "wbK": 5500,
      "format": "raw",
      "drive": "Disparo único o ráfaga baja (3–5 fps) para captar expresiones",
      "extras": [
        "Sol detrás del sujeto, pocos grados sobre el horizonte",
        "Reflector dorado o blanco a 1–1.5 m para rellenar el rostro",
        "Parasol puesto contra destellos",
        "Detección de ojos activada",
        "Compensación ≈ +0.7 EV si mides en puntual sobre piel clara"
      ]
    },
    "why": [
      "f/2 con 85 mm a 3 m deja una zona nítida de apenas ~14 cm: ojos nítidos y fondo a 20 m convertido en un disco de desenfoque de ~3 % del ancho de la imagen.",
      "ISO 100 conserva el máximo rango dinámico, clave con un cielo brillante detrás del sujeto.",
      "1/500 s supera con creces el límite de trepidación de 85 mm (1/85 s) y congela gestos.",
      "f/2, 1/500 s e ISO 100 equivalen a EV100 ≈ 11, el nivel típico de un rostro a contraluz en la hora dorada.",
      "La medición puntual sobre el rostro evita que el cielo haga subexponer la piel.",
      "Balance en 5500 K con luz real de ~3500 K conserva el tono dorado; si pones 3500 K, la cámara «neutraliza» el atardecer."
    ],
    "challenges": [
      "El contraste entre cielo y rostro puede superar 4–5 pasos",
      "La luz cambia minuto a minuto: la medición de hace 10 minutos ya no sirve",
      "Destellos y pérdida de contraste al apuntar hacia el sol",
      "Con ~14 cm de zona nítida, un leve movimiento del modelo desenfoca los ojos"
    ],
    "steps": [
      "Ubica al sujeto con el sol detrás y un fondo lejano (15 m o más) sin distracciones.",
      "Modo A, f/2, ISO 100, RAW y balance en 5500 K.",
      "Medición puntual sobre la mejilla iluminada: +0.7 EV para piel clara, alrededor de 0 para piel morena, −0.3 EV para piel muy oscura.",
      "AF-S con detección de ojos; enfoca en el ojo más cercano.",
      "Revisa el histograma: el cielo puede recortar un poco, la piel no.",
      "Si el contraste es excesivo, levanta las sombras del rostro con el reflector.",
      "Dispara en ráfaga baja y vuelve a medir cada 5–10 minutos."
    ],
    "mistakes": [
      "Medición matricial sin compensar: el rostro sale oscuro y el cielo bien.",
      "Balance automático que «enfría» la luz dorada.",
      "Fondo demasiado cerca del sujeto: no se desenfoca aunque uses f/1.8.",
      "Sol dentro del encuadre sin parasol: velo y pérdida de contraste.",
      "Enfocar la nariz o las pestañas en lugar del iris a f/1.4–f/2."
    ]
  },
  {
    "id": "sports-action",
    "name": "Deportes y acción",
    "tagline": "Congelar a un jugador que corre a 8 m/s sin perder el foco.",
    "sceneEV100": 13,
    "illuminantK": 6500,
    "subjectDistanceM": 20,
    "subjectSpeedMS": 8,
    "backgroundDistanceM": 50,
    "recommended": {
      "mode": "M-auto-iso",
      "aperture": 2.8,
      "shutterSeconds": 0.0005,
      "iso": 200,
      "focalMm": 200,
      "af": "AF-C",
      "metering": "matrix",
      "wbK": 6500,
      "format": "raw",
      "drive": "Ráfaga alta (10–20 fps)",
      "extras": [
        "Auto-ISO con máximo 6400",
        "Enfoque con botón trasero (AF-ON)",
        "Zona AF dinámica o seguimiento con detección de sujeto",
        "Estabilización en modo deportes si tu objetivo lo tiene",
        "Sensor apilado u obturador mecánico para evitar deformación por rolling shutter"
      ]
    },
    "why": [
      "A 1/2000 s un jugador a 8 m/s recorre 4 mm: a 20 m con 200 mm eso es ~1 px de barrido en una imagen de 1000 px.",
      "f/2.8 da luz y separa al jugador del público: la zona nítida mide ~1.7 m.",
      "f/2.8, 1/2000 s e ISO 200 equivalen a EV100 ≈ 13, cielo nublado brillante.",
      "Manual con Auto-ISO limitado fija el movimiento y la profundidad; la cámara solo ajusta el brillo cuando pasa una nube.",
      "AF-C predice la trayectoria del sujeto entre cuadros.",
      "La ráfaga alta atrapa el momento decisivo, que dura menos de 1/10 s."
    ],
    "challenges": [
      "El sujeto cambia de distancia y dirección todo el tiempo",
      "La luz alterna entre sol y nube",
      "Fondos con público y carteles que distraen",
      "El peso del tele provoca trepidación y cansancio"
    ],
    "steps": [
      "Modo M: 1/2000 s y f/2.8.",
      "Activa Auto-ISO con máximo 6400 y compensación en 0.",
      "AF-C con zona o seguimiento; enfoque con botón trasero.",
      "Ráfaga alta.",
      "Ubícate donde la acción venga hacia ti, con un fondo oscuro o uniforme.",
      "Sigue al jugador antes de la jugada y mantén el AF activo.",
      "Amplía los primeros disparos: si ves barrido en brazos o balón, sube a 1/3200 s."
    ],
    "mistakes": [
      "Usar AF-S: el foco queda donde estaba el jugador hace 0.2 s.",
      "Velocidades de 1/250–1/500 s: brazos y balón movidos.",
      "Auto-ISO sin límite: ISO 51200 con ruido inservible.",
      "Todos los puntos AF activos: la cámara enfoca al árbitro o al público.",
      "Disparar contra un cielo blanco con matricial: jugadores oscuros."
    ]
  },
  {
    "id": "landscape",
    "name": "Paisaje",
    "tagline": "Nitidez de adelante hacia atrás con trípode, f/11 e hiperfocal.",
    "sceneEV100": 13,
    "illuminantK": 5200,
    "subjectDistanceM": 3,
    "subjectSpeedMS": 0,
    "backgroundDistanceM": 2000,
    "recommended": {
      "mode": "A",
      "aperture": 11,
      "shutterSeconds": 0.016666667,
      "iso": 100,
      "focalMm": 24,
      "af": "MF",
      "metering": "matrix",
      "wbK": 5200,
      "format": "raw",
      "drive": "Temporizador de 2 s o disparador remoto",
      "extras": [
        "Trípode firme y nivelado",
        "Estabilizador desactivado en trípode",
        "Polarizador opcional (resta ~1.5 pasos de luz)",
        "Horquillado ±2 EV si el cielo supera el rango dinámico",
        "Pantalla en vivo ampliada para enfocar"
      ]
    },
    "why": [
      "f/11 en full frame equilibra profundidad de campo y difracción.",
      "24 mm a f/11: hiperfocal ≈ 1.8 m; enfocando ahí, todo es nítido desde ~0.9 m hasta el infinito.",
      "Con el enfoque sobre una roca a 3 m, la zona nítida va de ~1.1 m al infinito.",
      "ISO 100 da máximo rango dinámico y mínimo ruido; el trípode permite cualquier tiempo.",
      "f/11, 1/60 s e ISO 100 equivalen a EV100 ≈ 13, luz de día nublada brillante.",
      "El temporizador elimina la vibración al presionar el botón."
    ],
    "challenges": [
      "Cielo mucho más brillante que el suelo",
      "Viento que mueve hojas en tiempos largos",
      "Difracción si cierras demasiado",
      "Encontrar un primer plano con interés"
    ],
    "steps": [
      "Monta la cámara en el trípode y nivela el horizonte.",
      "Modo A, f/11, ISO 100 y RAW.",
      "Compón con un primer plano interesante a 1–5 m.",
      "Enfoca en manual con la pantalla en vivo ampliada a ~1.8 m (hiperfocal de 24 mm a f/11) o sobre el primer plano a ~3 m.",
      "Revisa el histograma: si el cielo recorta, aplica −0.3 a −0.7 EV o haz horquillado.",
      "Dispara con el temporizador de 2 s.",
      "Amplía la foto y comprueba la nitidez en el primer plano y en el horizonte."
    ],
    "mistakes": [
      "Enfocar al infinito: el primer plano sale blando.",
      "Usar f/22 «para más nitidez»: la difracción la reduce.",
      "Dejar el estabilizador activo en el trípode.",
      "Horizonte torcido.",
      "Cielo quemado por exponer solo para el suelo."
    ]
  },
  {
    "id": "astro",
    "name": "Astrofotografía (Vía Láctea)",
    "tagline": "Estrellas puntuales con apertura máxima, ISO alto y la regla de los 500.",
    "sceneEV100": -7,
    "illuminantK": 4000,
    "subjectDistanceM": 1000,
    "subjectSpeedMS": 0.07,
    "backgroundDistanceM": 10000,
    "recommended": {
      "mode": "M",
      "aperture": 2.8,
      "shutterSeconds": 15,
      "iso": 6400,
      "focalMm": 20,
      "af": "MF",
      "metering": "matrix",
      "wbK": 3900,
      "format": "raw",
      "drive": "Temporizador de 2 s o intervalómetro",
      "extras": [
        "Trípode firme, sin extender la columna central",
        "Estabilizador desactivado",
        "Reducción de ruido de larga exposición desactivada (resta ruido después en edición)",
        "Linterna de luz roja",
        "Luna nueva y cielo oscuro (escala Bortle 1–3)",
        "Brillo de pantalla bajo: de noche engaña"
      ]
    },
    "why": [
      "Regla de los 500: 500 ÷ 20 mm = 25 s como máximo antes de que las estrellas se vuelvan trazos. Usamos 15 s, el 60 % del límite.",
      "La regla NPF, más estricta con sensores modernos: (35 × 2.8 + 30 × 6 µm) ÷ 20 ≈ 14 s en un full frame de 24 MP. 15 s queda justo en el límite.",
      "f/2.8 es la apertura máxima del objetivo: cada paso más cerrado obligaría a duplicar el ISO.",
      "f/2.8, 15 s e ISO 6400 equivalen a EV100 ≈ −7, el brillo típico de un cielo con Vía Láctea en un sitio oscuro.",
      "Un balance de ~3900 K da un cielo azul neutro y contrarresta la contaminación lumínica anaranjada.",
      "Las estrellas se desplazan hasta 15″ de arco por segundo por la rotación terrestre; con focales largas el trazo aparece antes."
    ],
    "challenges": [
      "El exposímetro no mide con tan poca luz",
      "Enfocar al infinito sin autofoco",
      "Ruido alto a ISO 3200–6400",
      "Trazos si te pasas de tiempo",
      "Contaminación lumínica y humedad que empaña el objetivo"
    ],
    "steps": [
      "Busca un sitio oscuro y una noche sin luna; el núcleo de la Vía Láctea se ve mejor entre marzo y septiembre.",
      "Trípode, modo M, RAW y estabilizador desactivado.",
      "Abre al máximo: f/2.8 o más.",
      "Enfoca en MF: pantalla en vivo ampliada 10× sobre una estrella brillante hasta que sea el punto más pequeño; fija el anillo con cinta.",
      "Calcula el tiempo: 500 ÷ (focal × factor de recorte). Con 20 mm en full frame, 25 s; con NPF, ~14 s. Usa 15 s.",
      "ISO 3200–6400 y revisa el histograma: la masa debe quedar en el primer tercio, separada del borde izquierdo.",
      "Balance manual entre 3800 y 4200 K.",
      "Dispara con temporizador de 2 s y amplía para revisar trazos y foco."
    ],
    "mistakes": [
      "Confiar en el tope de infinito del anillo: muchos objetivos enfocan «más allá» del infinito.",
      "Exponer 30 s con 24 mm o más: aparecen trazos.",
      "Cerrar a f/5.6 «para más nitidez» y compensar con ISO 25600.",
      "Balance automático: cielos naranjas o verdosos.",
      "Juzgar la exposición por la pantalla brillante en lugar del histograma."
    ]
  },
  {
    "id": "street",
    "name": "Fotografía callejera (street)",
    "tagline": "Enfoque por zonas, f/8 y 1/250 s: lista antes de que pase el momento.",
    "sceneEV100": 12,
    "illuminantK": 6500,
    "subjectDistanceM": 3,
    "subjectSpeedMS": 1.4,
    "backgroundDistanceM": 15,
    "recommended": {
      "mode": "A",
      "aperture": 8,
      "shutterSeconds": 0.004,
      "iso": 400,
      "focalMm": 35,
      "af": "MF",
      "metering": "matrix",
      "wbK": 6500,
      "format": "raw",
      "drive": "Disparo único silencioso o ráfaga baja",
      "extras": [
        "Auto-ISO con velocidad mínima 1/250 s y máximo 6400",
        "Enfoque manual prefijado a 3 m",
        "Obturador electrónico silencioso (cuidado con luces LED que parpadean)",
        "Correa de muñeca y cámara pequeña",
        "Pantalla abatible para disparar a la altura de la cadera"
      ]
    },
    "why": [
      "35 mm a f/8 enfocado a 3 m: todo es nítido de ~1.9 a ~7 m. No esperas al autofoco.",
      "1/250 s congela a un peatón a 1.4 m/s: ~2 px de barrido a 3 m.",
      "f/8, 1/250 s e ISO 400 equivalen a EV100 ≈ 12, calle en sombra o día nublado. ISO 400 es el precio de f/8 y 1/250 s, y el ruido es mínimo en cámaras actuales.",
      "35 mm se parece a la mirada humana y te obliga a acercarte: conexión con la escena.",
      "Medición matricial: la luz de la calle cambia rápido y no hay tiempo de medir en puntual."
    ],
    "challenges": [
      "Momentos que duran menos de un segundo",
      "Luz mixta: sol, sombra y reflejos de vitrinas",
      "Ética y legalidad de fotografiar personas en la vía pública",
      "Sujetos que cambian de distancia"
    ],
    "steps": [
      "Modo A, f/8, Auto-ISO (mínimo 1/250 s, máximo 6400).",
      "MF y enfoque a 3 m: usa la escala de distancias o enfoca algo a 3 m.",
      "Medición matricial.",
      "Elige un fondo interesante y espera a que algo pase (técnica de «pesca»).",
      "Dispara cuando el sujeto entre en la zona de 2 a 7 m.",
      "En sol directo (EV100 ≈ 15) pasa a f/11 y 1/500 s; el Auto-ISO quedará en ~200.",
      "Respeta a las personas: si alguien te pide borrar una foto, considéralo."
    ],
    "mistakes": [
      "Depender del AF-S: la cámara busca foco y pierdes el momento.",
      "Usar f/2 «para desenfocar» en fotografía callejera: la zona nítida se reduce a centímetros.",
      "Velocidad de 1/60 s: peatones movidos.",
      "Usar teleobjetivo desde lejos: fotos frías y sin contexto.",
      "Olvidar devolver el enfoque a 3 m tras usar el AF."
    ]
  }
];
