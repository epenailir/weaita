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
  },
  {
    "title": "The Original CameraSim",
    "url": "https://camerasim.com/original-camerasim",
    "note": "Separa luz de escena y ajustes de cámara; exposímetro central en vivo.",
    "category": "Interfaz y simuladores"
  },
  {
    "title": "Canon Canada – Outside of Auto (nota de prensa 2013)",
    "url": "https://canon.ca/dam/about/News/Press-Releases/2013/2013-JAN-24-OUTSIDEOFAUTO-EN.pdf",
    "note": "Aprender, jugar y desafiar: diagnóstico al tomar la foto.",
    "category": "Interfaz y simuladores"
  },
  {
    "title": "PetaPixel – Photography Mapped (Simon Roberts)",
    "url": "https://petapixel.com/2016/12/06/simple-web-tool-teaches-beginners-use-manual-settings-dslr/",
    "note": "Luz ambiente anclada a situaciones reales y escena frente a resultado.",
    "category": "Interfaz y simuladores"
  },
  {
    "title": "Andersen Images – Exposure Simulator",
    "url": "https://andersenimages.com/tutorials/exposure-simulator/",
    "note": "Modos Tv/Av/M y su interdependencia.",
    "category": "Interfaz y simuladores"
  },
  {
    "title": "DIYPhotography – Nikon Lens Simulator",
    "url": "https://www.diyphotography.net/use-nikons-lens-simulator-to-pick-your-next-lens-non-nikon-shooters-too/",
    "note": "Ángulo de visión de 14 a 800 mm y factor de recorte.",
    "category": "Interfaz y simuladores"
  },
  {
    "title": "Korben – DOF Simulator (dofsimulator.net)",
    "url": "https://korben.info/en/dof-simulator-learn-depth-of-field.html",
    "note": "Comparar focales con el sujeto del mismo tamaño.",
    "category": "Interfaz y simuladores"
  },
  {
    "title": "DPReview – Exposure vs. Brightening",
    "url": "https://www.dpreview.com/articles/8148042898/exposure-vs-brightening/",
    "note": "La exposición es luz por unidad de área; el ISO es brillo.",
    "category": "Interfaz y simuladores"
  },
  {
    "title": "DPReview – The ins and outs of ISO",
    "url": "https://www.dpreview.com/articles/9698391814/the-ins-and-outs-of-iso-what-is-iso/",
    "note": "Qué es realmente el ISO.",
    "category": "Interfaz y simuladores"
  },
  {
    "title": "Canon – Exposure Simulation (Exp.SIM)",
    "url": "https://cam.start.canon/en/C001/manual/html/UG-03_Shooting-2_0050.html",
    "note": "Vista previa de exposición en el visor electrónico.",
    "category": "Interfaz y simuladores"
  },
  {
    "title": "Sony α7 IV Help Guide – Basic icons displayed on the monitor",
    "url": "https://helpguide.sony.net/ilc/2110/v1/en/contents/TP1000660234.html",
    "note": "Disposición del OSD en una mirrorless actual.",
    "category": "Interfaz y simuladores"
  },
  {
    "title": "Sony Help Guide – Zebra (70/100+ IRE)",
    "url": "https://helpguide.sony.net/cam/1510/v1/en/contents/TP0000557853.html",
    "note": "Avisos de sobreexposición en vivo.",
    "category": "Interfaz y simuladores"
  },
  {
    "title": "Nikon Z9 – Virtual Horizon Type (verde al nivelar, tipos A/B)",
    "url": "https://onlinemanual.nikonimglib.com/z9/en/csmd_virtual_horizon_type_203.html",
    "note": "Nivel electrónico que se pone verde al nivelar.",
    "category": "Interfaz y simuladores"
  },
  {
    "title": "Nikon Z30 – Focus peaking (niveles 1–3, colores)",
    "url": "https://onlinemanual.nikonimglib.com/z30/en/09-05-30.html",
    "note": "Niveles y colores del focus peaking.",
    "category": "Interfaz y simuladores"
  },
  {
    "title": "W3C WAI-ARIA APG – Slider Pattern",
    "url": "https://www.w3.org/WAI/ARIA/apg/patterns/slider/",
    "note": "Patrón accesible de sliders usado en los controles.",
    "category": "Interfaz y simuladores"
  },
  {
    "title": "W3C – What's New in WCAG 2.2",
    "url": "https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/",
    "note": "Criterios de accesibilidad aplicados.",
    "category": "Interfaz y simuladores"
  },
  {
    "title": "Podolefsky, Moore y Perkins – Implicit scaffolding in interactive simulations (PhET)",
    "url": "https://arxiv.org/pdf/1306.6544",
    "note": "Andamiaje implícito en simulaciones educativas.",
    "category": "Interfaz y simuladores"
  },
  {
    "title": "Mayer (2004) – Three-strikes rule against pure discovery learning",
    "url": "https://facultycenter.ischool.syr.edu/wp-content/uploads/2012/02/three-strikes.pdf",
    "note": "Descubrimiento guiado frente a exploración libre.",
    "category": "Interfaz y simuladores"
  },
  {
    "title": "Bret Victor – Explorable Explanations",
    "url": "https://worrydream.com/ExplorableExplanations/",
    "note": "Representaciones vinculadas y documentos reactivos.",
    "category": "Interfaz y simuladores"
  },
  {
    "title": "Shute (2008) – Focus on Formative Feedback",
    "url": "https://andymatuschak.org/files/papers/Shute%20-%202008%20-%20Focus%20on%20Formative%20Feedback.pdf",
    "note": "Feedback formativo elaborado.",
    "category": "Interfaz y simuladores"
  }
];
