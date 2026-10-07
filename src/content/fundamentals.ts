// Contenido pedagógico. Fuente: investigación del proyecto (ver src/content/sources.ts).
import type { AfModeInfo, CameraModeInfo, FileFormatInfo, MeteringModeInfo, WhiteBalanceInfo } from './types';

export const AF_MODES: AfModeInfo[] = [
  {
    "id": "AF-S",
    "name": "AF-S / One-Shot",
    "aka": "AF-S (Nikon, Sony, Fujifilm), One-Shot AF (Canon), AF simple",
    "how": "Enfoca una vez al presionar el disparador a medias y bloquea el foco mientras mantienes el botón. Por defecto no dispara si no logró enfocar (prioridad al enfoque).",
    "when": "Sujetos quietos: retrato posado, paisaje, producto, arquitectura.",
    "tips": [
      "Usa un punto AF único sobre el ojo más cercano",
      "Enfocar y recomponer solo es seguro con aperturas moderadas: a f/1.4 y corta distancia, girar la cámara saca al ojo del plano de foco",
      "Si el sujeto se acerca o se aleja, cambia a AF-C"
    ]
  },
  {
    "id": "AF-C",
    "name": "AF-C / AI Servo",
    "aka": "AF-C (Nikon, Sony, Fujifilm), AI Servo AF (Canon), AF continuo",
    "how": "Reenfoca sin parar mientras mantienes el botón y predice hacia dónde va el sujeto. Por defecto dispara aunque el foco no sea perfecto (prioridad al disparo).",
    "when": "Deportes, niños, mascotas, aves en vuelo: cualquier sujeto que cambia de distancia.",
    "tips": [
      "Combínalo con zonas AF o seguimiento con detección de sujeto",
      "Activa el enfoque con botón trasero (AF-ON) para separar enfoque y disparo",
      "Empieza a seguir al sujeto 1–2 s antes del momento clave",
      "Ajusta la sensibilidad de seguimiento si algo cruza delante del sujeto"
    ]
  },
  {
    "id": "AF-A",
    "name": "AF-A / AI Focus",
    "aka": "AF-A (Nikon), AI Focus AF (Canon), AF automático",
    "how": "La cámara decide: arranca en modo único y pasa a continuo si detecta movimiento.",
    "when": "Principiantes o situaciones mixtas sin tiempo para cambiar de modo. Los profesionales casi no lo usan.",
    "tips": [
      "Puede interpretar un balanceo tuyo como movimiento y reenfocar donde no querías",
      "No está disponible en varias cámaras sin espejo recientes",
      "Cuando sepas qué vas a fotografiar, elige AF-S o AF-C a propósito"
    ]
  },
  {
    "id": "MF",
    "name": "Enfoque manual con focus peaking",
    "aka": "MF + focus peaking (realce de bordes enfocados)",
    "how": "Giras el anillo de enfoque. El focus peaking colorea los bordes de mayor contraste, que coinciden con la zona enfocada. Puedes ampliar la vista 5–10× para afinar.",
    "when": "Astrofotografía, macro, video, enfoque por zonas en street y escenas con poco contraste donde el AF duda.",
    "tips": [
      "Amplía la imagen: el peaking a tamaño completo es aproximado",
      "Usa sensibilidad de peaking baja para mayor precisión",
      "En astro, amplía sobre una estrella brillante y gira hasta que sea el punto más pequeño",
      "En objetivos de enfoque electrónico (focus by wire) la posición del anillo puede perderse al apagar la cámara"
    ]
  },
  {
    "id": "eye-af",
    "name": "Detección de ojos y sujetos",
    "aka": "Eye AF, Eye Detection AF, detección de sujetos (personas, animales, vehículos)",
    "how": "El AF reconoce rostros, ojos, animales o vehículos y coloca el foco sobre el ojo más cercano de forma automática. Funciona en AF-S y en AF-C.",
    "when": "Retratos a f/1.2–f/2.8, bodas, mascotas y deportes con un sujeto reconocible.",
    "tips": [
      "Elige qué ojo priorizar (izquierdo, derecho o automático)",
      "Con varias personas, verifica que siga al rostro correcto",
      "Con gafas, gorras o perfiles marcados puede saltar a la ceja: revisa ampliando",
      "Combínalo con AF-C para retratos en movimiento"
    ]
  }
];

export const CAMERA_MODES: CameraModeInfo[] = [
  {
    "id": "M",
    "letter": "M",
    "name": "Manual",
    "youControl": [
      "Apertura",
      "Velocidad de obturación",
      "ISO"
    ],
    "cameraControls": [
      "Nada: el exposímetro solo te informa"
    ],
    "when": "Luz constante, astrofotografía, estudio con flash, panorámicas y video: cuando la exposición no debe cambiar entre tomas.",
    "tips": [
      "Usa la escala del exposímetro como guía, no como orden",
      "Primero fija lo creativo (apertura o velocidad) y después cierra la cuenta con el ISO",
      "Revisa el histograma tras el primer disparo"
    ]
  },
  {
    "id": "A",
    "letter": "A / Av",
    "name": "Prioridad a la apertura",
    "youControl": [
      "Apertura",
      "ISO (o Auto-ISO)",
      "Compensación de exposición"
    ],
    "cameraControls": [
      "Velocidad de obturación"
    ],
    "when": "Retrato, paisaje y street: cuando la profundidad de campo es lo principal.",
    "tips": [
      "Vigila la velocidad que elige la cámara: si baja de 1/(focal), sube el ISO",
      "Configura Auto-ISO con una velocidad mínima",
      "Usa la compensación en escenas muy claras u oscuras"
    ]
  },
  {
    "id": "S",
    "letter": "S / Tv",
    "name": "Prioridad a la velocidad",
    "youControl": [
      "Velocidad de obturación",
      "ISO (o Auto-ISO)",
      "Compensación de exposición"
    ],
    "cameraControls": [
      "Apertura"
    ],
    "when": "Deportes, fauna, paneos y agua: cuando el movimiento manda.",
    "tips": [
      "Si la apertura parpadea en el visor, llegaste al límite del objetivo: sube el ISO",
      "Con poca luz, la cámara abrirá al máximo y perderás profundidad de campo",
      "Para paneos prueba 1/30–1/60 s siguiendo al sujeto"
    ]
  },
  {
    "id": "P",
    "letter": "P",
    "name": "Programa",
    "youControl": [
      "ISO",
      "Compensación de exposición",
      "Cambio de programa (otras combinaciones equivalentes)"
    ],
    "cameraControls": [
      "Apertura",
      "Velocidad de obturación"
    ],
    "when": "Fotos rápidas de registro, cuando no hay tiempo para pensar.",
    "tips": [
      "Gira el dial principal para el cambio de programa: cambia el par apertura/velocidad sin alterar la exposición",
      "No es el modo Auto: puedes controlar ISO, balance de blancos y formato",
      "Úsalo como paso intermedio antes de A y S"
    ]
  },
  {
    "id": "M-auto-iso",
    "letter": "M + Auto-ISO",
    "name": "Manual con Auto-ISO",
    "youControl": [
      "Apertura",
      "Velocidad de obturación",
      "ISO máximo permitido",
      "Compensación de exposición (en la mayoría de las cámaras)"
    ],
    "cameraControls": [
      "ISO"
    ],
    "when": "Deportes y eventos con luz cambiante: fijas el movimiento y la profundidad de campo, y la cámara ajusta el brillo.",
    "tips": [
      "Limita el ISO máximo (por ejemplo, 6400–12800) según tu cámara",
      "Si el ISO llega al máximo, la foto se subexpone: vigila la escala",
      "Algunas cámaras requieren asignar un botón para compensar en M"
    ]
  }
];

export const FILE_FORMATS: FileFormatInfo[] = [
  {
    "id": "raw",
    "name": "RAW (NEF, CR3, ARW, RAF, DNG)",
    "bitDepth": "12–14 bits por canal (4096–16 384 niveles)",
    "pros": [
      "Más margen para recuperar altas luces y, sobre todo, sombras",
      "Balance de blancos ajustable sin pérdida después de disparar",
      "Sin compresión con pérdida ni enfoque o reducción de ruido aplicados",
      "Indispensable para ETTR, astrofotografía y contraluces"
    ],
    "cons": [
      "Archivos 2–4 veces más pesados que un JPEG",
      "Requiere revelado (Lightroom, Capture One, darktable, RawTherapee)",
      "Ráfagas más cortas por el búfer",
      "No se comparte directamente"
    ],
    "when": "Siempre que la imagen importe: paisaje, retrato, astrofotografía, luz difícil y contraluces."
  },
  {
    "id": "jpeg",
    "name": "JPEG",
    "bitDepth": "8 bits por canal (256 niveles)",
    "pros": [
      "Listo para compartir al instante",
      "Archivos livianos: ráfagas más largas",
      "Compatible con todo",
      "Aplica los perfiles de color de la cámara"
    ],
    "cons": [
      "Las altas luces recortadas no se recuperan",
      "Bandas en degradados al editar fuerte",
      "Balance de blancos y contraste «horneados»",
      "Compresión con pérdida"
    ],
    "when": "Eventos con entrega inmediata, deportes con ráfagas largas y fotos que van directo a redes o al cliente."
  },
  {
    "id": "heif",
    "name": "HEIF / HEIC",
    "bitDepth": "10 bits por canal (1024 niveles)",
    "pros": [
      "Cerca de la mitad del peso de un JPEG de calidad similar",
      "10 bits: menos bandas en cielos y degradados",
      "Admite HDR (HLG) en cámaras compatibles"
    ],
    "cons": [
      "Compatibilidad limitada en software antiguo y en la web",
      "Sigue siendo una imagen procesada: menos editable que el RAW",
      "No todas las cámaras lo ofrecen"
    ],
    "when": "Alternativa al JPEG en cámaras recientes si tu flujo de trabajo lo admite."
  }
];

export const WHITE_BALANCE: WhiteBalanceInfo[] = [
  {
    "id": "candle",
    "name": "Vela",
    "kelvin": 1900,
    "when": "Luz de velas y fogatas.",
    "note": "Pocas cámaras traen este preset: usa Kelvin entre 1900 y 2000 K, o déjalo en ~2500 K para conservar algo de calidez a propósito."
  },
  {
    "id": "tungsten",
    "name": "Tungsteno / incandescente",
    "kelvin": 3200,
    "when": "Bombillas incandescentes o halógenas y LED cálidas (2700–3200 K).",
    "note": "Si la foto sigue naranja, baja a 2800–3000 K en Kelvin."
  },
  {
    "id": "fluorescent",
    "name": "Fluorescente",
    "kelvin": 4000,
    "when": "Tubos fluorescentes de oficina y LED neutras.",
    "note": "Muchas fluorescentes y LED tienen un tinte verde: además del Kelvin puede hacer falta corregir hacia magenta."
  },
  {
    "id": "daylight",
    "name": "Luz de día",
    "kelvin": 5200,
    "when": "Sol directo de media mañana a media tarde.",
    "note": "Referencia neutra. Úsala en atardeceres para conservar el tono dorado."
  },
  {
    "id": "flash",
    "name": "Flash",
    "kelvin": 5500,
    "when": "Flash de cámara o de estudio como luz principal.",
    "note": "Entre 5500 y 6000 K según la marca. Si mezclas flash con tungsteno, pon un filtro naranja (CTO) en el flash."
  },
  {
    "id": "cloudy",
    "name": "Nublado",
    "kelvin": 6000,
    "when": "Cielo cubierto.",
    "note": "Calienta ligeramente respecto de Luz de día; favorece la piel."
  },
  {
    "id": "shade",
    "name": "Sombra",
    "kelvin": 7000,
    "when": "Sujeto en sombra abierta bajo cielo azul (7000–8000 K).",
    "note": "Corrige el tinte azul de la sombra. Al sol, calienta demasiado."
  },
  {
    "id": "kelvin",
    "name": "Personalizado / Kelvin",
    "kelvin": 5500,
    "when": "Cuando conoces la temperatura de la fuente o mides con una tarjeta gris.",
    "note": "Rango típico: 2500–10 000 K. Si pones un valor MAYOR que la luz real, la foto sale más cálida; si pones uno MENOR, más fría. El balance personalizado con tarjeta gris también corrige tintes verdes o magenta."
  }
];

export const METERING_MODES: MeteringModeInfo[] = [
  {
    "id": "matrix",
    "name": "Matricial / evaluativa",
    "how": "Divide el encuadre en muchas zonas, compara el patrón con una base de escenas y considera el punto de enfoque y el color.",
    "when": "Uso general: escenas de tonos variados con luz frontal o lateral."
  },
  {
    "id": "center",
    "name": "Ponderada al centro",
    "how": "Mide todo el cuadro, pero da la mayor parte del peso a un círculo central.",
    "when": "Retratos centrados y video, cuando prefieres un comportamiento predecible."
  },
  {
    "id": "spot",
    "name": "Puntual",
    "how": "Mide solo un círculo pequeño (≈1.5–4 % del encuadre), en el centro o ligado al punto AF.",
    "when": "Contraluces, sujetos iluminados por un foco teatral, la luna y sujetos pequeños sobre fondos muy claros u oscuros."
  },
  {
    "id": "partial",
    "name": "Parcial (Canon)",
    "how": "Como la puntual, pero más amplia: ≈6–10 % del centro del encuadre.",
    "when": "Contraluz con un sujeto mediano que ocupa una parte del cuadro."
  },
  {
    "id": "highlight",
    "name": "Ponderada a altas luces",
    "how": "Calcula la exposición para no quemar las zonas más brillantes de la escena (Nikon y otras marcas).",
    "when": "Conciertos con focos, escenarios iluminados y vestidos blancos a contraluz; después se levantan las sombras en RAW."
  }
];
