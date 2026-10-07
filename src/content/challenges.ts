// Contenido pedagógico. Fuente: investigación del proyecto (ver src/content/sources.ts).
import type { Challenge } from './types';

export const CHALLENGES: Challenge[] = [
  {
    "id": "c01-solo-velocidad",
    "title": "Rescata la foto oscura moviendo solo la velocidad",
    "prompt": "Paisaje a media tarde (EV100 ≈ 13). Tu foto salió casi negra con f/8, 1/1000 s e ISO 100. La apertura y el ISO están bloqueados: encuentra la velocidad que da una exposición correcta.",
    "sceneId": "landscape",
    "level": "Cero",
    "initial": {
      "aperture": 8,
      "shutterSeconds": 0.001,
      "iso": 100,
      "focalMm": 24
    },
    "locked": [
      "aperture",
      "iso",
      "focal"
    ],
    "targets": [
      {
        "metric": "exposureError",
        "op": "<=",
        "value": 0.5,
        "label": "Exposición correcta (±0.5 EV)"
      }
    ],
    "hints": [
      "Si la foto está oscura, necesitas más luz: un tiempo más largo.",
      "Cada vez que duplicas el tiempo ganas un paso.",
      "De 1/1000 s a la respuesta hay 3 pasos."
    ],
    "explanation": "f/8, 1/1000 s e ISO 100 equivalen a EV ≈ 16: tres pasos menos de luz de lo que pide la escena (EV 13). Al duplicar el tiempo tres veces (1/500 → 1/250 → 1/125 s) llegas a EV ≈ 13: exposición correcta."
  },
  {
    "id": "c02-solo-apertura",
    "title": "Ilumina el retrato abriendo el diafragma",
    "prompt": "Retrato al atardecer (EV100 ≈ 11). Con f/8, 1/500 s e ISO 100 el rostro sale oscuro. Solo puedes mover la apertura.",
    "sceneId": "golden-hour-portrait",
    "level": "Cero",
    "initial": {
      "aperture": 8,
      "shutterSeconds": 0.002,
      "iso": 100,
      "focalMm": 85
    },
    "locked": [
      "shutter",
      "iso",
      "focal"
    ],
    "targets": [
      {
        "metric": "exposureError",
        "op": "<=",
        "value": 0.5,
        "label": "Exposición correcta (±0.5 EV)"
      }
    ],
    "hints": [
      "Número f más pequeño = abertura más grande = más luz.",
      "Cada paso: f/8 → f/5.6 → f/4 → …",
      "Te faltan 4 pasos."
    ],
    "explanation": "f/8 a 1/500 s da EV ≈ 15, y la escena es EV 11: faltan 4 pasos. Al abrir f/8 → 5.6 → 4 → 2.8 → 2 recuperas esos 4 pasos. De regalo, a f/2 el fondo se desenfoca mucho más."
  },
  {
    "id": "c03-foto-quemada",
    "title": "Rescata una foto quemada",
    "prompt": "Calle en sombra (EV100 ≈ 12). Alguien dejó la cámara en f/2.8, 1/60 s e ISO 1600: todo sale blanco. La velocidad está bloqueada en 1/60 s. Corrige la exposición con el ISO más bajo posible.",
    "sceneId": "street",
    "level": "Básico",
    "initial": {
      "aperture": 2.8,
      "shutterSeconds": 0.016666667,
      "iso": 1600,
      "focalMm": 35
    },
    "locked": [
      "shutter",
      "focal"
    ],
    "targets": [
      {
        "metric": "exposureError",
        "op": "<=",
        "value": 0.5,
        "label": "Exposición correcta (±0.5 EV)"
      },
      {
        "metric": "iso",
        "op": "<=",
        "value": 200,
        "label": "ISO 200 o menos"
      }
    ],
    "hints": [
      "La foto tiene unos 7 pasos de luz de más.",
      "Bajar de ISO 1600 a 100 quita 4 pasos.",
      "Los 3 pasos restantes salen de cerrar el diafragma: f/2.8 → f/4 → f/5.6 → f/8."
    ],
    "explanation": "f/2.8, 1/60 s e ISO 1600 equivalen a EV100 ≈ 4.9: unos 7 pasos de más. ISO 1600 → 100 recupera 4 pasos y f/2.8 → f/8 otros 3. Resultado: f/8, 1/60 s, ISO 100 (EV ≈ 11.9). Además, el ISO base da menos ruido y más rango dinámico."
  },
  {
    "id": "c04-foto-movida",
    "title": "¿Cómo solucionarías esta foto movida?",
    "prompt": "Calle en sombra (EV100 ≈ 12). La exposición está bien (f/16, 1/15 s, ISO 100), pero el peatón salió barrido y la foto tiembla. Congélalo y elimina la trepidación sin perder la exposición.",
    "sceneId": "street",
    "level": "Básico",
    "initial": {
      "aperture": 16,
      "shutterSeconds": 0.066666667,
      "iso": 100,
      "focalMm": 35
    },
    "locked": [
      "focal"
    ],
    "targets": [
      {
        "metric": "subjectMotionBlurPx",
        "op": "<=",
        "value": 3,
        "label": "Peatón nítido (≤ 3 px de barrido)"
      },
      {
        "metric": "shakeRatio",
        "op": "<=",
        "value": 1,
        "label": "Sin trepidación a pulso"
      },
      {
        "metric": "exposureError",
        "op": "<=",
        "value": 0.5,
        "label": "Exposición correcta (±0.5 EV)"
      }
    ],
    "hints": [
      "Una persona caminando necesita alrededor de 1/250 s.",
      "Pasar de 1/15 a 1/250 s son 4 pasos menos de luz.",
      "Recupéralos repartidos: abre a f/8 (2 pasos) y sube a ISO 400 (2 pasos)."
    ],
    "explanation": "A 1/15 s, un peatón a 1.4 m/s recorre 9 cm: ~30 px de barrido. Además, 1/15 s con 35 mm supera el límite de pulso (1/35 s). A 1/250 s el barrido baja a ~2 px. Los 4 pasos perdidos se compensan con f/8 (+2) e ISO 400 (+2). f/8 mantiene además buena profundidad para el enfoque por zonas."
  },
  {
    "id": "c05-exposicion-equivalente",
    "title": "Misma luz, otra apertura",
    "prompt": "Paisaje (EV100 ≈ 13) bien expuesto a f/8, 1/125 s e ISO 100. Quieres f/4 para desenfocar el fondo detrás de una flor. El ISO está bloqueado: mantén el mismo brillo.",
    "sceneId": "landscape",
    "level": "Básico",
    "initial": {
      "aperture": 8,
      "shutterSeconds": 0.008,
      "iso": 100,
      "focalMm": 24
    },
    "locked": [
      "iso",
      "focal"
    ],
    "targets": [
      {
        "metric": "aperture",
        "op": "<=",
        "value": 4,
        "label": "Apertura f/4 o más abierta"
      },
      {
        "metric": "exposureError",
        "op": "<=",
        "value": 0.5,
        "label": "Exposición correcta (±0.5 EV)"
      }
    ],
    "hints": [
      "De f/8 a f/4 hay 2 pasos: entra 4 veces más luz.",
      "Compensa acortando el tiempo 4 veces."
    ],
    "explanation": "f/8 → f/5.6 → f/4 suman 2 pasos de luz. Para mantener la exposición, el tiempo baja 2 pasos: 1/125 → 1/250 → 1/500 s. f/4 a 1/500 s e ISO 100 es la misma exposición (EV ≈ 13). Eso es la reciprocidad: combinaciones equivalentes con distinta estética."
  },
  {
    "id": "c06-congela-al-delantero",
    "title": "Congela al delantero",
    "prompt": "Partido de fútbol con cielo nublado (EV100 ≈ 13). Con 200 mm a f/8, 1/125 s e ISO 100 la exposición es correcta, pero el jugador (8 m/s, a 20 m) sale barrido. La apertura está bloqueada en f/8.",
    "sceneId": "sports-action",
    "level": "Básico",
    "initial": {
      "aperture": 8,
      "shutterSeconds": 0.008,
      "iso": 100,
      "focalMm": 200
    },
    "locked": [
      "aperture",
      "focal"
    ],
    "targets": [
      {
        "metric": "subjectMotionBlurPx",
        "op": "<=",
        "value": 3,
        "label": "Jugador congelado (≤ 3 px)"
      },
      {
        "metric": "exposureError",
        "op": "<=",
        "value": 0.5,
        "label": "Exposición correcta (±0.5 EV)"
      }
    ],
    "hints": [
      "Con 200 mm a 20 m el encuadre cubre 3.6 m de ancho: a 8 m/s el jugador cruza mucho en 1/125 s.",
      "Necesitas al menos 1/1000 s.",
      "Pierdes 3 pasos de luz: recupéralos con el ISO."
    ],
    "explanation": "A 1/125 s el jugador recorre 6.4 cm: ~18 px de barrido. A 1/1000 s recorre 8 mm: ~2 px. De 1/125 a 1/1000 s hay 3 pasos y, con la apertura bloqueada, se recuperan subiendo el ISO de 100 a 800. Un poco de ruido es mejor que un jugador movido."
  },
  {
    "id": "c07-fondo-cremoso",
    "title": "Fondo cremoso para el retrato",
    "prompt": "Retrato en la hora dorada (EV100 ≈ 11) con 85 mm, modelo a 3 m y árboles a 20 m. A f/11, 1/125 s e ISO 400 el fondo distrae y la foto queda algo oscura. Consigue un fondo muy desenfocado con ISO bajo.",
    "sceneId": "golden-hour-portrait",
    "level": "Básico",
    "initial": {
      "aperture": 11,
      "shutterSeconds": 0.008,
      "iso": 400,
      "focalMm": 85
    },
    "locked": [
      "focal"
    ],
    "targets": [
      {
        "metric": "backgroundBlurPct",
        "op": ">=",
        "value": 2.5,
        "label": "Fondo desenfocado (disco ≥ 2.5 % del ancho)"
      },
      {
        "metric": "exposureError",
        "op": "<=",
        "value": 0.5,
        "label": "Exposición correcta (±0.5 EV)"
      },
      {
        "metric": "iso",
        "op": "<=",
        "value": 200,
        "label": "ISO 200 o menos"
      }
    ],
    "hints": [
      "El tamaño del desenfoque del fondo es inversamente proporcional al número f.",
      "Necesitas f/2 o más abierto.",
      "Al abrir tanto sobra luz: acorta el tiempo y baja el ISO."
    ],
    "explanation": "El disco de desenfoque crece como f²/N: pasar de f/11 a f/2 lo multiplica por 5.5 (de ~0.5 % a ~2.9 % del ancho). Abrir 5 pasos (f/11 → f/2) obliga a compensar: ISO 400 → 100 (−2) y 1/125 → 1/500 s (−2). El paso que sobra corrige la subexposición inicial."
  },
  {
    "id": "c08-cascada-seda",
    "title": "Haz que la cascada se vea como seda",
    "prompt": "Cascada en un bosque sombreado (EV100 ≈ 9) con la cámara en trípode. A f/4, 1/500 s e ISO 400 el agua sale congelada en gotas y la foto está oscura. Logra el efecto seda con 1/2 s o más, sin filtro ND.",
    "sceneId": "waterfall",
    "level": "Básico",
    "tripod": true,
    "initial": {
      "aperture": 4,
      "shutterSeconds": 0.002,
      "iso": 400,
      "focalMm": 24
    },
    "locked": [
      "focal"
    ],
    "targets": [
      {
        "metric": "shutterSeconds",
        "op": ">=",
        "value": 0.5,
        "label": "Tiempo de 1/2 s o más"
      },
      {
        "metric": "exposureError",
        "op": "<=",
        "value": 0.5,
        "label": "Exposición correcta (±0.5 EV)"
      },
      {
        "metric": "iso",
        "op": "<=",
        "value": 100,
        "label": "ISO base (100)"
      }
    ],
    "hints": [
      "Primero baja el ISO al mínimo: necesitas restar luz, no sumarla.",
      "Con ISO 100, ¿qué apertura permite 1/2 s sin sobreexponer?",
      "Prueba f/16 o f/22."
    ],
    "explanation": "En EV 9, a ISO 100, f/16 pide exactamente 1/2 s (log₂(16²/0.5) = 9) y f/22, alrededor de 1 s. Ese tiempo convierte el agua en seda. Sin filtro ND, la única forma de alargar tanto es usar el ISO base y cerrar mucho el diafragma; a f/22 aceptas algo de difracción a cambio del efecto."
  },
  {
    "id": "c09-ciudad-a-pulso",
    "title": "Noche en la ciudad, sin trípode",
    "prompt": "Calle iluminada de noche (EV100 ≈ 5) con 35 mm a pulso. A f/8, 1/4 s e ISO 100 la foto sale oscura y temblorosa. Consigue una foto nítida y bien expuesta con ISO 3200 como máximo.",
    "sceneId": "night-city",
    "level": "Intermedio",
    "initial": {
      "aperture": 8,
      "shutterSeconds": 0.25,
      "iso": 100,
      "focalMm": 35
    },
    "locked": [
      "focal"
    ],
    "targets": [
      {
        "metric": "shakeRatio",
        "op": "<=",
        "value": 1,
        "label": "Sin trepidación (1/35 s o más rápido)"
      },
      {
        "metric": "exposureError",
        "op": "<=",
        "value": 0.5,
        "label": "Exposición correcta (±0.5 EV)"
      },
      {
        "metric": "iso",
        "op": "<=",
        "value": 3200,
        "label": "ISO 3200 o menos"
      }
    ],
    "hints": [
      "Regla del recíproco: con 35 mm, no uses un tiempo más largo que 1/40 s.",
      "Abre el diafragma todo lo posible: f/2 o f/1.4.",
      "Con f/2 y 1/40 s, el ISO que cierra la cuenta ronda 400."
    ],
    "explanation": "f/8 a 1/4 s e ISO 100 equivale a EV ≈ 8: faltan 3 pasos y el tiempo es casi 9 veces más largo que el límite de pulso. Solución: 1/40 s (más rápido que 1/35 s), f/2 (+4 pasos respecto de f/8) e ISO 400. f/2, 1/40 s, ISO 400 → EV100 ≈ 5.3. Con f/1.4 bastaría ISO 200."
  },
  {
    "id": "c10-estelas-de-luz",
    "title": "Estelas de luz de los autos",
    "prompt": "Avenida de noche (EV100 ≈ 5) con la cámara en trípode. Quieres que los faros se conviertan en líneas continuas: necesitas 4 s o más. Ahora estás en f/4, 1/60 s e ISO 1600.",
    "sceneId": "night-city",
    "level": "Intermedio",
    "tripod": true,
    "initial": {
      "aperture": 4,
      "shutterSeconds": 0.016666667,
      "iso": 1600,
      "focalMm": 35
    },
    "locked": [
      "focal"
    ],
    "targets": [
      {
        "metric": "shutterSeconds",
        "op": ">=",
        "value": 4,
        "label": "Tiempo de 4 s o más"
      },
      {
        "metric": "exposureError",
        "op": "<=",
        "value": 0.5,
        "label": "Exposición correcta (±0.5 EV)"
      },
      {
        "metric": "iso",
        "op": "<=",
        "value": 100,
        "label": "ISO base (100)"
      }
    ],
    "hints": [
      "Para alargar el tiempo sin quemar, resta luz con el ISO y la apertura.",
      "Primero, ISO 100.",
      "f/11 pide unos 4 s; f/16, unos 8 s."
    ],
    "explanation": "En EV 5 a ISO 100: f/11 pide 121/32 ≈ 3.8 s (usa 4 s) y f/16 pide 256/32 = 8 s. Un auto a 50 km/h recorre ~55 m en 4 s: cruza todo el encuadre y deja una línea continua. El ISO base mantiene limpias las sombras en una toma larga."
  },
  {
    "id": "c11-paisaje-nitido",
    "title": "Nitidez del primer plano al infinito",
    "prompt": "Paisaje con una roca a 3 m y montañas al fondo (EV100 ≈ 13), 24 mm en trípode con ISO fijo en 100. A f/2.8 solo la roca está nítida. Consigue nitidez desde 1.5 m o menos hasta el infinito.",
    "sceneId": "landscape",
    "level": "Intermedio",
    "tripod": true,
    "initial": {
      "aperture": 2.8,
      "shutterSeconds": 0.001,
      "iso": 100,
      "focalMm": 24
    },
    "locked": [
      "focal",
      "iso"
    ],
    "targets": [
      {
        "metric": "dofNearM",
        "op": "<=",
        "value": 1.5,
        "label": "Nítido desde 1.5 m o menos"
      },
      {
        "metric": "dofFarM",
        "op": ">=",
        "value": 1000,
        "label": "Nítido hasta el infinito"
      },
      {
        "metric": "exposureError",
        "op": "<=",
        "value": 0.5,
        "label": "Exposición correcta (±0.5 EV)"
      }
    ],
    "hints": [
      "El infinito solo entra en la zona nítida si enfocas a la hiperfocal o más lejos.",
      "Hiperfocal H ≈ f²/(N · 0.03 mm): con 24 mm, f/8 da ~2.4 m.",
      "Cierra a f/8–f/11 y alarga el tiempo para compensar."
    ],
    "explanation": "Enfocado a 3 m y a f/2.8, la zona nítida va de ~2.1 a ~5.3 m. A f/8 la hiperfocal baja a ~2.4 m: como enfocas a 3 m (más allá de H), la zona va de ~1.3 m al infinito. f/11 da aún más margen (~1.1 m). Compensa con el tiempo: f/8 a 1/125 s o f/11 a 1/60 s."
  },
  {
    "id": "c12-zona-street",
    "title": "Enfoque por zonas en la calle",
    "prompt": "Calle en sombra (EV100 ≈ 12), 35 mm enfocado a 3 m. A f/2, 1/1000 s e ISO 100 la zona nítida es mínima y quien no está exactamente a 3 m sale borroso. Logra una zona nítida de 2 m a 6 m y congela a quien camina.",
    "sceneId": "street",
    "level": "Intermedio",
    "initial": {
      "aperture": 2,
      "shutterSeconds": 0.001,
      "iso": 100,
      "focalMm": 35
    },
    "locked": [
      "focal"
    ],
    "targets": [
      {
        "metric": "dofNearM",
        "op": "<=",
        "value": 2,
        "label": "Nítido desde 2 m o menos"
      },
      {
        "metric": "dofFarM",
        "op": ">=",
        "value": 6,
        "label": "Nítido hasta 6 m o más"
      },
      {
        "metric": "subjectMotionBlurPx",
        "op": "<=",
        "value": 3,
        "label": "Peatón congelado (≤ 3 px)"
      },
      {
        "metric": "exposureError",
        "op": "<=",
        "value": 0.5,
        "label": "Exposición correcta (±0.5 EV)"
      }
    ],
    "hints": [
      "La profundidad de campo crece al cerrar el diafragma.",
      "f/8 con 35 mm y enfoque a 3 m cubre de ~1.9 a ~7 m.",
      "No uses tiempos más largos que 1/250 s: compensa con el ISO."
    ],
    "explanation": "A f/2 la zona nítida va de ~2.6 a ~3.5 m: menos de 1 m. A f/8 se amplía a ~1.9–7.2 m. Cerrar 4 pasos (f/2 → f/8) obliga a compensar: 1/1000 → 1/250 s (+2) e ISO 100 → 400 (+2). A 1/250 s el peatón queda con ~2 px de barrido."
  },
  {
    "id": "c13-estrellas-puntuales",
    "title": "Estrellas puntuales, no rayitas",
    "prompt": "Cielo con Vía Láctea (EV100 ≈ −7). Con 50 mm, f/2.8, 30 s e ISO 1600 las estrellas salen como trazos y la foto queda oscura. Tu zoom no abre más que f/2.8. Logra estrellas puntuales y exposición correcta con ISO 6400 como máximo.",
    "sceneId": "astro",
    "level": "Intermedio",
    "tripod": true,
    "initial": {
      "aperture": 2.8,
      "shutterSeconds": 30,
      "iso": 1600,
      "focalMm": 50
    },
    "locked": [
      "aperture"
    ],
    "targets": [
      {
        "metric": "starTrailRatio",
        "op": "<=",
        "value": 1,
        "label": "Estrellas puntuales (regla de los 500)"
      },
      {
        "metric": "exposureError",
        "op": "<=",
        "value": 0.5,
        "label": "Exposición correcta (±0.5 EV)"
      },
      {
        "metric": "iso",
        "op": "<=",
        "value": 6400,
        "label": "ISO 6400 o menos"
      }
    ],
    "hints": [
      "Regla de los 500: tiempo máximo = 500 ÷ focal. Con 50 mm, solo 10 s.",
      "Una focal más corta permite más tiempo: con 20 mm, 25 s.",
      "Prueba 20 mm, 15 s e ISO 6400."
    ],
    "explanation": "A 50 mm el límite es 500 ÷ 50 = 10 s: 30 s lo triplica. Además, f/2.8, 30 s e ISO 1600 equivalen a EV100 ≈ −5.9, un paso más oscuro de lo necesario. Bajar a 20 mm sube el límite a 25 s, y f/2.8, 15 s, ISO 6400 da EV100 ≈ −6.9: exposición correcta con margen contra los trazos. También funciona 24 mm, 20 s, ISO 6400."
  },
  {
    "id": "c14-estudio-rostro",
    "title": "Retrato de estudio: de la nariz a las orejas",
    "prompt": "Estudio con luz LED continua (EV100 ≈ 9), 85 mm a pulso. A f/1.4, 1/30 s e ISO 100 solo un ojo está nítido, la foto está sobreexpuesta y hay trepidación. Logra f/5.6 o más cerrado, sin trepidación y bien expuesta.",
    "sceneId": "studio",
    "level": "Intermedio",
    "initial": {
      "aperture": 1.4,
      "shutterSeconds": 0.033333333,
      "iso": 100,
      "focalMm": 85
    },
    "locked": [
      "focal"
    ],
    "targets": [
      {
        "metric": "aperture",
        "op": ">=",
        "value": 5.6,
        "label": "Apertura f/5.6 o más cerrada"
      },
      {
        "metric": "shakeRatio",
        "op": "<=",
        "value": 1,
        "label": "Sin trepidación (1/85 s o más rápido)"
      },
      {
        "metric": "exposureError",
        "op": "<=",
        "value": 0.5,
        "label": "Exposición correcta (±0.5 EV)"
      }
    ],
    "hints": [
      "De f/1.4 a f/5.6 hay 4 pasos menos de luz.",
      "Con 85 mm a pulso, usa 1/100 s o más rápido.",
      "La cuenta: f/5.6, 1/125 s y el ISO que falte (≈ 800)."
    ],
    "explanation": "La foto inicial tenía 3 pasos de más (EV100 ≈ 5.9 frente a 9). Cerrar a f/5.6 resta 4 pasos y acortar a 1/125 s resta 2 más: quedas ~3 pasos corto, que recuperas con ISO 800. Resultado: f/5.6, 1/125 s, ISO 800 → EV100 ≈ 8.9, rostro nítido de la nariz a las orejas y sin trepidación."
  },
  {
    "id": "c15-producto-sin-difraccion",
    "title": "Producto nítido sin difracción ni ruido",
    "prompt": "Foto de producto en estudio (EV100 ≈ 9), cámara en trípode con 50 mm. Estás en f/2.8, 1/125 s e ISO 3200: la foto está muy sobreexpuesta, con ruido y poca profundidad. El cliente pide máxima calidad: apertura entre f/8 y f/11, ISO base y exposición precisa (±0.3 EV).",
    "sceneId": "studio",
    "level": "Avanzado",
    "tripod": true,
    "initial": {
      "aperture": 2.8,
      "shutterSeconds": 0.008,
      "iso": 3200,
      "focalMm": 50
    },
    "locked": [
      "focal"
    ],
    "targets": [
      {
        "metric": "aperture",
        "op": ">=",
        "value": 8,
        "label": "Apertura f/8 o más cerrada"
      },
      {
        "metric": "aperture",
        "op": "<=",
        "value": 11,
        "label": "Sin pasar de f/11 (difracción)"
      },
      {
        "metric": "iso",
        "op": "<=",
        "value": 100,
        "label": "ISO base (100)"
      },
      {
        "metric": "exposureError",
        "op": "<=",
        "value": 0.3,
        "label": "Exposición precisa (±0.3 EV)"
      }
    ],
    "hints": [
      "Más allá de f/11, la difracción empieza a suavizar el detalle en full frame.",
      "En trípode, el tiempo puede ser largo sin problema.",
      "f/8 en EV 9 a ISO 100 pide 1/8 s."
    ],
    "explanation": "La foto inicial estaba 4 pasos sobreexpuesta (EV100 ≈ 4.9 frente a 9). ISO 3200 → 100 resta 5 pasos y f/2.8 → f/8 resta 3: ahora faltan 4 pasos, que recuperas alargando de 1/125 a 1/8 s. f/8, 1/8 s e ISO 100 dan EV ≈ 9.0 exacto. Con trípode y un producto quieto, el tiempo largo no tiene costo."
  },
  {
    "id": "c16-compresion-retrato",
    "title": "Teleobjetivo: fondo muy difuso",
    "prompt": "Retrato en la hora dorada (EV100 ≈ 11), modelo a 3 m y fondo a 20 m. Con 50 mm a f/5.6, 1/250 s e ISO 400 el fondo apenas se desenfoca. Usa 135 mm o más para lograr un disco de desenfoque de al menos 5 % del ancho, a pulso y con ISO bajo.",
    "sceneId": "golden-hour-portrait",
    "level": "Avanzado",
    "initial": {
      "aperture": 5.6,
      "shutterSeconds": 0.004,
      "iso": 400,
      "focalMm": 50
    },
    "locked": [],
    "targets": [
      {
        "metric": "focalMm",
        "op": ">=",
        "value": 135,
        "label": "Focal de 135 mm o más"
      },
      {
        "metric": "backgroundBlurPct",
        "op": ">=",
        "value": 5,
        "label": "Fondo muy difuso (disco ≥ 5 % del ancho)"
      },
      {
        "metric": "shakeRatio",
        "op": "<=",
        "value": 1,
        "label": "Sin trepidación a pulso"
      },
      {
        "metric": "exposureError",
        "op": "<=",
        "value": 0.5,
        "label": "Exposición correcta (±0.5 EV)"
      },
      {
        "metric": "iso",
        "op": "<=",
        "value": 200,
        "label": "ISO 200 o menos"
      }
    ],
    "hints": [
      "El disco de desenfoque crece con el cuadrado de la focal: de 50 a 135 mm, unas 7 veces más.",
      "Abre a f/2.8 o f/2.",
      "Con 135 mm a pulso, usa 1/160 s o más rápido; 1/500 s es más seguro."
    ],
    "explanation": "El diámetro del disco de desenfoque es aproximadamente f²/(N·(s − f)) × (1 − s/fondo). Con 50 mm a f/5.6 es ~0.4 % del ancho; con 135 mm a f/2 sube a ~7.5 %. En la vida real retrocederías para mantener el encuadre y el fondo se vería además más grande (compresión). Exposición: 135 mm, f/2, 1/500 s, ISO 100 → EV ≈ 11, y 1/500 s supera con creces el mínimo de 1/135 s."
  },
  {
    "id": "c17-tele-apertura-variable",
    "title": "Zoom de apertura variable al límite",
    "prompt": "Fútbol con cielo nublado (EV100 ≈ 13). Tu zoom 100–400 mm queda en f/5.6 a 400 mm y lo usas a pulso. Con 1/250 s e ISO 100 la exposición es correcta, pero el jugador (8 m/s, a 20 m) sale barrido y la imagen tiembla. Congélalo sin pasar de ISO 1600.",
    "sceneId": "sports-action",
    "level": "Avanzado",
    "initial": {
      "aperture": 5.6,
      "shutterSeconds": 0.004,
      "iso": 100,
      "focalMm": 400
    },
    "locked": [
      "aperture",
      "focal"
    ],
    "targets": [
      {
        "metric": "subjectMotionBlurPx",
        "op": "<=",
        "value": 3,
        "label": "Jugador congelado (≤ 3 px)"
      },
      {
        "metric": "shakeRatio",
        "op": "<=",
        "value": 1,
        "label": "Sin trepidación (1/400 s o más rápido)"
      },
      {
        "metric": "exposureError",
        "op": "<=",
        "value": 0.5,
        "label": "Exposición correcta (±0.5 EV)"
      },
      {
        "metric": "iso",
        "op": "<=",
        "value": 1600,
        "label": "ISO 1600 o menos"
      }
    ],
    "hints": [
      "A 400 mm y 20 m el encuadre cubre solo 1.8 m: el barrido es el doble que con 200 mm.",
      "Necesitas ~1/2000 s.",
      "De 1/250 a 1/2000 s hay 3 pasos: ISO 800."
    ],
    "explanation": "A 400 mm el jugador recorre 3.2 cm en 1/250 s: ~18 px de barrido, y 1/250 s es más lento que el límite de pulso (1/400 s). A 1/2000 s recorre 4 mm (~2 px). Como el objetivo no abre más que f/5.6, los 3 pasos salen del ISO: de 100 a 800. Por eso los zooms de apertura constante f/2.8 valen tanto en deportes: con ellos bastaría ISO 200."
  },
  {
    "id": "c18-ciclista-nocturno",
    "title": "Ciclista nocturno congelado",
    "prompt": "Avenida iluminada de noche (EV100 ≈ 5). Necesitas 1/500 s para congelar a un ciclista y la velocidad está bloqueada. Con f/8 e ISO 800 la foto sale casi negra. Exponla bien sin pasar de ISO 6400.",
    "sceneId": "night-city",
    "level": "Avanzado",
    "initial": {
      "aperture": 8,
      "shutterSeconds": 0.002,
      "iso": 800,
      "focalMm": 35
    },
    "locked": [
      "shutter",
      "focal"
    ],
    "targets": [
      {
        "metric": "exposureError",
        "op": "<=",
        "value": 0.5,
        "label": "Exposición correcta (±0.5 EV)"
      },
      {
        "metric": "iso",
        "op": "<=",
        "value": 6400,
        "label": "ISO 6400 o menos"
      }
    ],
    "hints": [
      "Te faltan unos 7 pasos.",
      "Abre al máximo: de f/8 a f/1.4 hay 5 pasos.",
      "Los 2 que faltan salen del ISO: de 800 a 3200."
    ],
    "explanation": "f/8, 1/500 s e ISO 800 equivalen a EV100 ≈ 12: siete pasos más oscuro que la escena (EV 5). Abrir a f/1.4 aporta 5 pasos y subir a ISO 3200, otros 2. Resultado: f/1.4, 1/500 s, ISO 3200 → EV100 ≈ 4.9. Con f/2 necesitarías ISO 6400. Es el caso clásico en que un fijo luminoso evita ISO extremos."
  },
  {
    "id": "c19-via-lactea-24mm",
    "title": "Vía Láctea con 24 mm e ISO limitado",
    "prompt": "Cielo oscuro (EV100 ≈ −7). Tu cámara se vuelve muy ruidosa por encima de ISO 3200 y tu objetivo es un 24 mm. A f/4, 30 s e ISO 3200 las estrellas dejan trazos y la foto queda oscura. Resuélvelo sin subir el ISO.",
    "sceneId": "astro",
    "level": "Avanzado",
    "tripod": true,
    "initial": {
      "aperture": 4,
      "shutterSeconds": 30,
      "iso": 3200,
      "focalMm": 24
    },
    "locked": [
      "focal"
    ],
    "targets": [
      {
        "metric": "starTrailRatio",
        "op": "<=",
        "value": 1,
        "label": "Estrellas puntuales (regla de los 500)"
      },
      {
        "metric": "exposureError",
        "op": "<=",
        "value": 0.5,
        "label": "Exposición correcta (±0.5 EV)"
      },
      {
        "metric": "iso",
        "op": "<=",
        "value": 3200,
        "label": "ISO 3200 o menos"
      }
    ],
    "hints": [
      "Con 24 mm, la regla de los 500 permite ~20 s.",
      "Con 20 s y f/4 te falta más de un paso: necesitas abrir.",
      "f/2 a 15–20 s, o f/1.4 a 8–10 s."
    ],
    "explanation": "500 ÷ 24 ≈ 20.8 s: 30 s se pasa un 44 %. Al bajar a 20 s pierdes otro medio paso, y f/4 ya estaba un paso corto. Sin subir el ISO, la única salida es un objetivo más luminoso: f/2 a 15–20 s e ISO 3200 (EV100 ≈ −6.9 a −7.3). Si vas a ampliar mucho la foto, la regla NPF (~10 s para 24 mm a f/2 en 24 MP) sugiere f/1.4 a 8–10 s."
  }
];
