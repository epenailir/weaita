// Contenido pedagógico. Fuente: investigación del proyecto (ver src/content/sources.ts).
import type { FocalLengthInfo, LensType } from './types';

export const FOCAL_LENGTH_INFO: FocalLengthInfo[] = [
  {
    "mm": 14,
    "label": "Ultra gran angular",
    "fovNote": "114° en diagonal (104° horizontal) en full frame. A 10 m cubre ~26 m de ancho. En APS-C rinde como un 21 mm.",
    "uses": [
      "Astrofotografía de Vía Láctea",
      "Interiores y arquitectura",
      "Paisajes con el cielo como protagonista",
      "Perspectivas dramáticas con un primer plano muy cercano"
    ],
    "perspective": "Como te acercas mucho para llenar el encuadre, lo cercano parece enorme y lo lejano diminuto (la perspectiva la da la distancia, no la focal). A menos de 1 m de un rostro deforma nariz y frente.",
    "distortion": "Rectilíneo: las rectas siguen rectas, pero las formas en los bordes se estiran (efecto de la proyección, no un defecto). Los zooms ultra gran angular suelen mostrar barril visible, corregible con el perfil del objetivo.",
    "typicalAperture": "f/2.8 en zooms 14–24 mm; f/1.8 en fijos; f/4 en zooms livianos"
  },
  {
    "mm": 24,
    "label": "Gran angular",
    "fovNote": "84° en diagonal (74° horizontal). A 10 m cubre 15 m de ancho. En APS-C rinde como un 36 mm.",
    "uses": [
      "Paisaje",
      "Viaje",
      "Arquitectura e inmobiliaria",
      "Reportaje en espacios reducidos"
    ],
    "perspective": "Como lo usas cerca del primer plano, la sensación de profundidad aumenta; brilla con un primer plano fuerte. Si inclinas la cámara, las verticales convergen.",
    "distortion": "Barril ligero a moderado en el extremo corto de los zooms 24–70 y 24–105; estiramiento en los bordes con sujetos cercanos.",
    "typicalAperture": "f/1.4–f/1.8 en fijos; f/2.8 en zoom 24–70; f/4 en zoom 24–105"
  },
  {
    "mm": 35,
    "label": "Angular moderado",
    "fovNote": "63° en diagonal (54° horizontal). A 10 m cubre ~10 m de ancho. En APS-C rinde como un 52 mm.",
    "uses": [
      "Fotografía callejera",
      "Reportaje y documental",
      "Retrato ambiental",
      "Bodas"
    ],
    "perspective": "Natural, con sensación de «estar ahí». Retratos de cuerpo entero sin deformación si no te acercas a menos de ~1.5 m del rostro.",
    "distortion": "Barril leve; casi imperceptible en fijos de calidad.",
    "typicalAperture": "f/1.4–f/2 en fijos; f/2.8 en zooms"
  },
  {
    "mm": 50,
    "label": "Normal",
    "fovNote": "47° en diagonal (40° horizontal). A 10 m cubre ~7 m de ancho. En APS-C rinde como un 75 mm.",
    "uses": [
      "Retrato de medio cuerpo",
      "Vida cotidiana",
      "Producto",
      "Poca luz con un fijo f/1.8"
    ],
    "perspective": "Próxima a la impresión de tamaños relativos de la vista humana cuando la copia se mira a distancia normal.",
    "distortion": "Prácticamente nula; barril muy leve en algunos fijos económicos.",
    "typicalAperture": "f/1.2–f/1.8 (el 50 mm f/1.8 es el fijo luminoso más económico)"
  },
  {
    "mm": 85,
    "label": "Tele corto de retrato",
    "fovNote": "29° en diagonal (24° horizontal). A 10 m cubre ~4.2 m de ancho. En APS-C rinde como un 128 mm.",
    "uses": [
      "Retrato clásico",
      "Detalles en bodas",
      "Conciertos desde cerca del escenario"
    ],
    "perspective": "Te obliga a alejarte 2–3 m para un medio cuerpo: facciones proporcionadas y favorecedoras.",
    "distortion": "Muy baja; a veces un cojín leve.",
    "typicalAperture": "f/1.2–f/1.8 en fijos"
  },
  {
    "mm": 135,
    "label": "Tele medio",
    "fovNote": "18° en diagonal (15° horizontal). A 10 m cubre ~2.7 m de ancho. En APS-C rinde como un 200 mm.",
    "uses": [
      "Retrato con fondo muy difuso",
      "Teatro y escenarios",
      "Deportes bajo techo con un fijo f/2"
    ],
    "perspective": "Desde 4–6 m aplana suavemente las facciones y «acerca» el fondo al sujeto.",
    "distortion": "Cojín leve.",
    "typicalAperture": "f/1.8–f/2 en fijos; f/2.8 en zoom 70–200"
  },
  {
    "mm": 200,
    "label": "Teleobjetivo",
    "fovNote": "12° en diagonal (10° horizontal). A 10 m cubre 1.8 m de ancho. En APS-C rinde como un 300 mm.",
    "uses": [
      "Deportes",
      "Eventos",
      "Fauna cercana",
      "Paisaje de detalle con compresión"
    ],
    "perspective": "Como lo usas desde lejos, los planos lejanos (edificios, montañas) parecen «pegados» al sujeto: compresión por distancia, no por la focal.",
    "distortion": "Cojín leve, típico del extremo largo de los zooms 70–200.",
    "typicalAperture": "f/2.8 en zoom 70–200; f/4–f/5.6 en zooms de apertura variable"
  },
  {
    "mm": 400,
    "label": "Superteleobjetivo",
    "fovNote": "6° en diagonal (5° horizontal). A 10 m cubre solo 0.9 m de ancho. En APS-C rinde como un 600 mm.",
    "uses": [
      "Fútbol y deportes de campo",
      "Aves y fauna",
      "Aviación",
      "Luna (con recorte)"
    ],
    "perspective": "Como disparas desde muy lejos, planos separados por cientos de metros parecen apilados (compresión por distancia). La calima atmosférica reduce el contraste a larga distancia.",
    "distortion": "Cojín leve; suele importar más la aberración cromática lateral en ópticas no apocromáticas.",
    "typicalAperture": "f/2.8 en fijos profesionales (~3 kg); f/4.5–f/5.6 en fijos livianos; f/5.6–f/6.3 en zooms 100–400 y 150–600"
  }
];

export const LENS_TYPES: LensType[] = [
  {
    "id": "prime",
    "name": "Objetivo fijo (prime)",
    "summary": "Una sola distancia focal. Para cambiar el encuadre, te mueves tú.",
    "pros": [
      "Más luminosos: f/1.2–f/1.8 son habituales",
      "Más nítidos y livianos que un zoom de precio similar",
      "Desenfoque de fondo superior gracias a la gran apertura",
      "Te obligan a pensar el encuadre con los pies"
    ],
    "cons": [
      "Cambiar el encuadre exige moverte o cambiar de objetivo",
      "Necesitas varios para cubrir distintas situaciones",
      "En eventos rápidos puedes perder tomas mientras cambias de objetivo"
    ],
    "whenToUse": "Retrato (50 y 85 mm), fotografía callejera (28 y 35 mm), poca luz y cuando quieres máxima calidad por gramo."
  },
  {
    "id": "zoom",
    "name": "Zoom",
    "summary": "Varias focales en un solo objetivo: 24–70, 70–200, 100–400 mm.",
    "pros": [
      "Encuadre rápido sin moverte",
      "Un objetivo cubre muchas situaciones",
      "Menos cambios de objetivo: menos polvo en el sensor"
    ],
    "cons": [
      "Más pesado y menos luminoso que un fijo equivalente",
      "Distorsión variable: barril en el extremo corto, cojín en el largo",
      "Menos desenfoque de fondo que un fijo f/1.4–f/1.8"
    ],
    "whenToUse": "Viajes, eventos, deportes y fauna: cuando no puedes moverte o no hay tiempo de cambiar de objetivo."
  },
  {
    "id": "zoom-constant-aperture",
    "name": "Zoom de apertura constante",
    "summary": "Mantiene la misma apertura máxima en todo el recorrido, por ejemplo 70–200 mm f/2.8.",
    "pros": [
      "La exposición no cambia al hacer zoom en modo M",
      "Más luz en el extremo largo: velocidades más rápidas o ISO más bajo",
      "Construcción profesional y sellado contra el clima"
    ],
    "cons": [
      "Más grande, pesado y caro",
      "Aun así, menos luminoso que los fijos"
    ],
    "whenToUse": "Deportes, eventos y video: cuando haces zoom todo el tiempo y no puedes perder luz."
  },
  {
    "id": "zoom-variable-aperture",
    "name": "Zoom de apertura variable",
    "summary": "La apertura máxima se reduce al alargar la focal, por ejemplo 18–55 mm f/3.5–5.6.",
    "pros": [
      "Compacto, liviano y económico",
      "Gran alcance a bajo peso (100–400, 150–600 mm)",
      "Ideal para aprender y para viajar liviano"
    ],
    "cons": [
      "Pierdes hasta ~1⅓ pasos al hacer zoom (f/3.5 → f/5.6)",
      "En M con apertura máxima, la foto se oscurece si haces zoom",
      "Menos desenfoque de fondo y peor rendimiento con poca luz"
    ],
    "whenToUse": "Viaje liviano, aprendizaje y fauna con buena luz."
  },
  {
    "id": "macro",
    "name": "Macro 1:1",
    "summary": "Enfoca tan cerca que el sujeto se proyecta en el sensor a tamaño real (ampliación 1×).",
    "pros": [
      "Detalle extremo de insectos, flores y texturas",
      "Muy nítidos; los de 90–105 mm también son excelentes para retrato",
      "Ideales para producto y joyería"
    ],
    "cons": [
      "Profundidad de campo milimétrica: ~1.3 mm a f/11 en ampliación 1:1",
      "La apertura efectiva cae ~2 pasos a 1:1 (la cámara lo compensa en la medición)",
      "Distancia de trabajo corta en focales de 50–60 mm"
    ],
    "whenToUse": "Naturaleza de cerca, producto y texturas. Elige 90–105 mm para no asustar insectos y 150–180 mm si necesitas más distancia."
  },
  {
    "id": "wide-angle",
    "name": "Gran angular (≤ 35 mm)",
    "summary": "Ángulo amplio que exagera la profundidad: lo cercano se ve enorme y lo lejano pequeño.",
    "pros": [
      "Captura escenas amplias en espacios reducidos",
      "Gran profundidad de campo con facilidad",
      "Permite tiempos largos para astrofotografía (regla de los 500)"
    ],
    "cons": [
      "Estira formas en los bordes y deforma rostros cercanos",
      "Las verticales convergen si inclinas la cámara",
      "Distorsión de barril en muchos zooms"
    ],
    "whenToUse": "Paisaje, arquitectura, interiores y astrofotografía."
  },
  {
    "id": "telephoto",
    "name": "Teleobjetivo (≥ 85 mm)",
    "summary": "Ángulo estrecho que amplía lo lejano y, desde lejos, «comprime» los planos.",
    "pros": [
      "Aísla al sujeto con fondos muy difusos",
      "Llega a sujetos lejanos: deportes y fauna",
      "Compresión de perspectiva para paisajes de detalle"
    ],
    "cons": [
      "Amplifica la trepidación: exige velocidades más rápidas",
      "Pesado y caro en versiones luminosas",
      "La calima reduce el contraste a larga distancia"
    ],
    "whenToUse": "Retrato (85–135 mm), deportes, fauna y paisaje de detalle."
  },
  {
    "id": "fisheye",
    "name": "Ojo de pez",
    "summary": "Hasta 180° en diagonal sin corregir la distorsión: las rectas se curvan.",
    "pros": [
      "Ángulo de visión extremo",
      "Efecto creativo inconfundible",
      "Útil en deportes extremos y espacios muy estrechos"
    ],
    "cons": [
      "Curva todas las líneas que no pasan por el centro",
      "Efecto que cansa si se abusa",
      "Difícil de usar con sujetos humanos cercanos"
    ],
    "whenToUse": "Skate, surf, interiores creativos, cielos completos y panorámicas 360°."
  },
  {
    "id": "tilt-shift",
    "name": "Descentrable (tilt-shift)",
    "summary": "Desplaza y bascula el bloque óptico respecto del sensor.",
    "pros": [
      "El desplazamiento (shift) corrige las líneas convergentes sin deformar en edición",
      "La basculación (tilt) inclina el plano de enfoque (principio de Scheimpflug)",
      "Permite el efecto «maqueta»"
    ],
    "cons": [
      "Solo enfoque manual",
      "Caro y lento de usar",
      "Requiere práctica y trípode"
    ],
    "whenToUse": "Arquitectura, producto y paisaje con un plano de enfoque inclinado."
  }
];
