// Fuentes consultadas para el motor físico y el contenido pedagógico.
import type { SourceRef } from './types';

export type SourceCategory = 'Pedagogía' | 'Técnica' | 'Interfaz y simuladores';

export interface Source extends SourceRef {
  category: SourceCategory;
}

export const SOURCES: Source[] = [
  {
    "title": "Cambridge in Colour — Camera Exposure: Aperture, ISO & Shutter Speed",
    "url": "https://www.cambridgeincolour.com/tutorials/camera-exposure.htm",
    "note": "Triángulo de exposición con la analogía del balde de lluvia.",
    "category": "Pedagogía"
  },
  {
    "title": "Cambridge in Colour — Camera Histograms: Tones & Contrast",
    "url": "https://www.cambridgeincolour.com/tutorials/histograms1.htm",
    "note": "Lectura del histograma y recortes.",
    "category": "Pedagogía"
  },
  {
    "title": "Cambridge in Colour — Camera Metering & Exposure",
    "url": "https://www.cambridgeincolour.com/tutorials/camera-metering.htm",
    "note": "Gris medio y modos de medición.",
    "category": "Pedagogía"
  },
  {
    "title": "Cambridge in Colour — Understanding Depth of Field",
    "url": "https://www.cambridgeincolour.com/tutorials/depth-of-field.htm",
    "note": "Profundidad de campo y círculo de confusión, con calculadora.",
    "category": "Pedagogía"
  },
  {
    "title": "Cambridge in Colour — Understanding the Hyperfocal Distance",
    "url": "https://www.cambridgeincolour.com/tutorials/hyperfocal-distance.htm",
    "note": "Nitidez de H/2 al infinito.",
    "category": "Pedagogía"
  },
  {
    "title": "Cambridge in Colour — White Balance",
    "url": "https://www.cambridgeincolour.com/tutorials/white-balance.htm",
    "note": "Temperatura de color en Kelvin y balance de blancos.",
    "category": "Pedagogía"
  },
  {
    "title": "Cambridge in Colour — Understanding Camera Lenses",
    "url": "https://www.cambridgeincolour.com/tutorials/camera-lenses.htm",
    "note": "Focal, zoom vs fijo y aperturas.",
    "category": "Pedagogía"
  },
  {
    "title": "DPReview — Equivalence in a nutshell",
    "url": "https://www.dpreview.com/learn/2799100497/equivalence-in-a-nutshell",
    "note": "Apertura, luz total y tamaño de sensor.",
    "category": "Pedagogía"
  },
  {
    "title": "DPReview — What is ISO invariance, and should I care?",
    "url": "https://www.dpreview.com/articles/iso-invar/",
    "note": "ISO como amplificación y su relación con el ruido.",
    "category": "Pedagogía"
  },
  {
    "title": "Nikon — Understanding Focal Length (Learn & Explore)",
    "url": "https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/understanding-focal-length",
    "note": "Ángulo de visión y ampliación según la focal.",
    "category": "Pedagogía"
  },
  {
    "title": "Nikon — Digitutor",
    "url": "https://imaging.nikon.com/support/digitutor/index.html",
    "note": "Tutoriales en video por modelo de cámara.",
    "category": "Pedagogía"
  },
  {
    "title": "Canon Europe — How to control exposure",
    "url": "https://www.canon-europe.com/get-inspired/tips-and-techniques/how-to-control-exposure/",
    "note": "Apertura, velocidad e ISO explicados por Canon.",
    "category": "Pedagogía"
  },
  {
    "title": "Canon — AF modes: One-Shot AF, AI Servo AF and AI Focus AF",
    "url": "https://id.canon/en/support/8200573900",
    "note": "Diferencias entre los modos de autofoco de Canon.",
    "category": "Pedagogía"
  },
  {
    "title": "Canon Academy — The basics of photography",
    "url": "https://academy.canon-cna.com/en/capture/the-basics-of-photography",
    "note": "Programa de formación básica de Canon.",
    "category": "Pedagogía"
  },
  {
    "title": "CameraSim — simulador de cámara en línea",
    "url": "https://camerasim.com/",
    "note": "Referencia de simulador interactivo de exposición.",
    "category": "Pedagogía"
  },
  {
    "title": "Photography Life — Exposure Value (EV)",
    "url": "https://photographylife.com/exposure-value",
    "note": "Tablas de EV por tipo de escena.",
    "category": "Pedagogía"
  },
  {
    "title": "Photography Life — 500 Rule vs NPF Rule",
    "url": "https://photographylife.com/500-rule-vs-npf-rule",
    "note": "Comparación de las reglas para estrellas puntuales.",
    "category": "Pedagogía"
  },
  {
    "title": "PetaPixel — The NPF Rule: A Formula for Sharp Star Photos Every Time",
    "url": "https://petapixel.com/2017/04/07/npf-rule-formula-sharp-star-photos-every-time",
    "note": "Origen y fórmula de la regla NPF (Frédéric Michaud).",
    "category": "Pedagogía"
  },
  {
    "title": "Exposure value (Wikipedia): definición de EV, EV100 y tabla de luminancias de escena",
    "url": "https://en.wikipedia.org/wiki/Exposure_value",
    "note": "Base de EV = log2(N²/t) y tabla de EV por escena (sol 15, nublado 12–13, calle nocturna 7–8, interiores 5–7, luna llena −3/−2).",
    "category": "Técnica"
  },
  {
    "title": "Sunny 16 rule (Wikipedia)",
    "url": "https://en.wikipedia.org/wiki/Sunny_16_rule",
    "category": "Técnica",
    "note": ""
  },
  {
    "title": "Light meter (Wikipedia): constantes de calibración K y C (ISO 2720)",
    "url": "https://en.wikipedia.org/wiki/Light_meter",
    "note": "K = 12.5 (Canon/Nikon/Sekonic) o 14 (Pentax/Kenko); C ≈ 250.",
    "category": "Técnica"
  },
  {
    "title": "Hyperfocal distance (Wikipedia)",
    "url": "https://en.wikipedia.org/wiki/Hyperfocal_distance",
    "category": "Técnica",
    "note": ""
  },
  {
    "title": "Depth of field (Wikipedia)",
    "url": "https://en.wikipedia.org/wiki/Depth_of_field",
    "category": "Técnica",
    "note": ""
  },
  {
    "title": "Circle of confusion (Wikipedia)",
    "url": "https://en.wikipedia.org/wiki/Circle_of_confusion",
    "category": "Técnica",
    "note": ""
  },
  {
    "title": "Angle of view (Wikipedia)",
    "url": "https://en.wikipedia.org/wiki/Angle_of_view",
    "category": "Técnica",
    "note": ""
  },
  {
    "title": "Distortion (optics) (Wikipedia): modelo Brown–Conrady",
    "url": "https://en.wikipedia.org/wiki/Distortion_(optics)",
    "category": "Técnica",
    "note": ""
  },
  {
    "title": "F-number (Wikipedia): escalas de tercios y apertura efectiva",
    "url": "https://en.wikipedia.org/wiki/F-number",
    "category": "Técnica",
    "note": ""
  },
  {
    "title": "Mired (Wikipedia)",
    "url": "https://en.wikipedia.org/wiki/Mired",
    "category": "Técnica",
    "note": ""
  },
  {
    "title": "Airy disk (Wikipedia)",
    "url": "https://en.wikipedia.org/wiki/Airy_disk",
    "category": "Técnica",
    "note": ""
  },
  {
    "title": "sRGB (Wikipedia): funciones de transferencia",
    "url": "https://en.wikipedia.org/wiki/SRGB",
    "category": "Técnica",
    "note": ""
  },
  {
    "title": "DOFMaster: Depth of Field Equations",
    "url": "https://dofmaster.com/equations.html",
    "note": "H = f²/(Nc) + f; Dn = s(H−f)/(H+s−2f); Df = s(H−f)/(H−s), ∞ si s ≥ H.",
    "category": "Técnica"
  },
  {
    "title": "Cambridge in Colour: Diffraction in photography",
    "url": "https://www.cambridgeincolour.com/tutorials/diffraction-photography.htm",
    "category": "Técnica",
    "note": ""
  },
  {
    "title": "Photons to Photos: Photographic Dynamic Range vs ISO",
    "url": "https://www.photonstophotos.net/Charts/PDR.htm",
    "note": "Referencia de la forma de la curva DR; los valores de la tabla son aproximados, no copiados punto a punto.",
    "category": "Técnica"
  },
  {
    "title": "Photons to Photos: Read noise in electrons",
    "url": "https://www.photonstophotos.net/Charts/RN_e.htm",
    "category": "Técnica",
    "note": ""
  },
  {
    "title": "Photons to Photos: Sensor characteristics",
    "url": "https://photonstophotos.net/Charts/Sensor_Characteristics.htm",
    "category": "Técnica",
    "note": ""
  },
  {
    "title": "Tanner Helland: How to convert temperature (K) to RGB",
    "url": "https://tannerhelland.com/2012/09/18/convert-temperature-rgb-algorithm-code.html",
    "note": "",
    "category": "Técnica"
  },
  {
    "title": "npm color-temperature (Neil Bartlett): port de Helland + reajuste",
    "url": "https://www.npmjs.com/package/color-temperature",
    "note": "Constantes leídas del código fuente de la versión 0.2.7.",
    "category": "Técnica"
  },
  {
    "title": "National Parks at Night: NPF, the new rule for sharp stars",
    "url": "https://nationalparksatnight.com/blog/2019/4/13/new-rule-for-shooting-the-sharpest-stars-in-the-sky",
    "category": "Técnica",
    "note": ""
  },
  {
    "title": "OpenCV: Camera calibration (convención de k1, k2)",
    "url": "https://docs.opencv.org/4.x/dc/dbb/tutorial_py_calibration.html",
    "category": "Técnica",
    "note": ""
  },
  {
    "title": "Omni Calculator: Exposure calculator (tabla EV, Vía Láctea −7)",
    "url": "https://www.omnicalculator.com/other/exposure",
    "category": "Técnica",
    "note": ""
  },
  {
    "title": "Steve Yedlin: Exposure equations and meter calibration",
    "url": "https://yedlin.net/NerdyFilmTechStuff/ExposureEquationsAndMeterCalibration.html",
    "category": "Técnica",
    "note": ""
  },
  {
    "title": "Ken Rockwell: EV chart",
    "url": "https://www.kenrockwell.com/tech/ev.htm",
    "category": "Técnica",
    "note": ""
  }
];
