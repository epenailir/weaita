// Contenido pedagógico. Fuente: investigación del proyecto (ver src/content/sources.ts).
import type { CurriculumLevel } from './types';

export const CURRICULUM: CurriculumLevel[] = [
  {
    "level": "Cero",
    "title": "Nivel Cero: conoce tu cámara y la luz",
    "goals": [
      "Sujetar la cámara con firmeza y disparar sin trepidar",
      "Entender qué es la exposición y por qué una foto sale clara u oscura",
      "Reconocer los modos P, A, S y M del dial",
      "Leer la escala del exposímetro (−2 … 0 … +2) en el visor",
      "Saber qué es un paso (stop) de luz y contarlos"
    ],
    "modules": [
      "Fundamentos › Modos de cámara (P, A, S, M)",
      "Exposición › Pasos (stops)",
      "Exposición › Exposímetro y medición",
      "Simulador de exposición (modo guiado)",
      "Desafíos › Nivel Cero",
      "Quiz › Nivel Cero"
    ]
  },
  {
    "level": "Básico",
    "title": "Nivel Básico: el triángulo de exposición",
    "goals": [
      "Controlar apertura, velocidad e ISO, por separado y combinados",
      "Elegir la apertura para desenfocar el fondo o para dar profundidad",
      "Congelar o expresar movimiento a voluntad",
      "Leer el histograma y evitar recortes",
      "Usar la compensación de exposición en nieve, contraluz y escenas oscuras",
      "Elegir AF-S o AF-C según el sujeto",
      "Usar los presets de balance de blancos"
    ],
    "modules": [
      "Exposición › Apertura",
      "Exposición › Velocidad de obturación",
      "Exposición › ISO",
      "Exposición › Triángulo de exposición",
      "Exposición › Histograma",
      "Exposición › Compensación de exposición",
      "Fundamentos › Autoenfoque (AF-S, AF-C, AF-A, MF)",
      "Fundamentos › Balance de blancos",
      "Simulador de exposición",
      "Desafíos › Nivel Básico",
      "Quiz › Nivel Básico"
    ]
  },
  {
    "level": "Intermedio",
    "title": "Nivel Intermedio: lentes, medición y escenarios reales",
    "goals": [
      "Elegir el modo de medición según la luz",
      "Entender focal, ángulo de visión, perspectiva y distorsión",
      "Calcular la hiperfocal y enfocar por zonas",
      "Trabajar en RAW y fijar el balance de blancos en Kelvin",
      "Resolver retrato, paisaje y fotografía callejera con ajustes propios",
      "Disparar de noche a pulso sin trepidación"
    ],
    "modules": [
      "Exposición › Profundidad de campo e hiperfocal",
      "Laboratorio de lentes › Focales y ángulo de visión",
      "Laboratorio de lentes › Fijo vs zoom",
      "Laboratorio de lentes › Gran angular y teleobjetivo",
      "Fundamentos › Modos de medición",
      "Fundamentos › RAW vs JPEG",
      "Escenarios › Retrato en la hora dorada",
      "Escenarios › Paisaje",
      "Escenarios › Fotografía callejera",
      "Desafíos › Nivel Intermedio",
      "Quiz › Nivel Intermedio"
    ]
  },
  {
    "level": "Avanzado",
    "title": "Nivel Avanzado: dominio total en condiciones extremas",
    "goals": [
      "Planificar astrofotografía con la regla de los 500 y la regla NPF",
      "Usar compresión de perspectiva y desenfoque con teleobjetivos",
      "Dominar Manual con Auto-ISO limitado para acción",
      "Exponer a la derecha (ETTR) sin quemar altas luces",
      "Entender difracción, apertura constante vs variable y macro 1:1",
      "Resolver desafíos con varios parámetros bloqueados"
    ],
    "modules": [
      "Escenarios › Deportes y acción",
      "Escenarios › Astrofotografía",
      "Laboratorio de lentes › Compresión y distorsión",
      "Laboratorio de lentes › Macro 1:1",
      "Laboratorio de lentes › Apertura constante vs variable",
      "Fundamentos › Manual con Auto-ISO",
      "Exposición › Histograma (ETTR)",
      "Desafíos › Nivel Avanzado",
      "Quiz › Nivel Avanzado"
    ]
  }
];
