// Contenido pedagógico. Fuente: investigación del proyecto (ver src/content/sources.ts).
import type { Lesson } from './types';

export const EXPOSURE_LESSONS: Lesson[] = [
  {
    "id": "aperture",
    "title": "Apertura: el tamaño de la ventana",
    "summary": "El diafragma regula cuánta luz entra y cuánto de la escena queda nítido.",
    "body": [
      "La apertura es el orificio ajustable dentro del objetivo. Se expresa con el número f: la distancia focal dividida por el diámetro de ese orificio. Un 50 mm a f/2 tiene una abertura de 25 mm; a f/8, de solo 6.25 mm.",
      "Por eso la escala parece al revés. Número f pequeño (f/1.4) = abertura grande = mucha luz. Número f grande (f/22) = abertura pequeña = poca luz. Los pasos completos son f/1.4, 2, 2.8, 4, 5.6, 8, 11, 16 y 22: cada uno multiplica el número por √2 (≈1.4) y deja pasar la mitad de luz que el anterior.",
      "La apertura también controla la profundidad de campo. Abierta (f/1.4–f/2.8) aísla al sujeto sobre un fondo desenfocado. Cerrada (f/8–f/16) mantiene nítido desde el primer plano hasta el fondo.",
      "La mayoría de los objetivos rinden su máxima nitidez 2 o 3 pasos por debajo de su apertura máxima, alrededor de f/5.6–f/8. Desde f/11–f/16 en full frame (antes en sensores más pequeños), la difracción empieza a suavizar el detalle fino."
    ],
    "keyFacts": [
      "N = distancia focal ÷ diámetro de la pupila de entrada",
      "Cada paso completo (número f × 1.4) reduce la luz a la mitad",
      "De f/1.4 a f/22 hay 8 pasos: 256 veces menos luz",
      "Número f bajo = poca profundidad de campo; número f alto = mucha",
      "Punto dulce típico: f/5.6–f/8; difracción visible desde ~f/11–f/16 en full frame"
    ],
    "commonMistakes": [
      "Creer que f/16 es «más apertura» que f/4: es al revés.",
      "Cerrar a f/22 «por si acaso» en paisaje y perder nitidez por difracción.",
      "Hacer un retrato grupal a f/1.4: solo una fila queda enfocada.",
      "Esperar mucho desenfoque con un gran angular y el sujeto lejos: la focal y las distancias pesan tanto como la apertura."
    ]
  },
  {
    "id": "shutter-speed",
    "title": "Velocidad de obturación: congelar o fluir",
    "summary": "Cuánto tiempo recibe luz el sensor; decide si el movimiento se congela o se convierte en estela.",
    "body": [
      "La velocidad de obturación es el tiempo que el sensor queda expuesto. Se escribe en segundos o fracciones: 1/1000 s es un milésimo de segundo; 2″ son dos segundos. Duplicar el tiempo duplica la luz: un paso.",
      "Las velocidades rápidas congelan: 1/250 s para una persona caminando, 1/500 s para niños y mascotas, 1/1000–1/2000 s para deportes y 1/2000 s o más para aves en vuelo. Las lentas registran el movimiento como estela: de 1/2 s a 2 s, el agua de una cascada se vuelve seda.",
      "Hay dos fuentes de foto movida: el sujeto que se mueve y tus manos (trepidación). Contra la trepidación, usa la regla del recíproco: a pulso, no uses un tiempo más largo que 1/(focal × factor de recorte). Con 50 mm en full frame, 1/50 s; en APS-C (×1.5), 1/75 s, o sea 1/80 s.",
      "La estabilización (en el cuerpo o en el objetivo) suele darte 3–5 pasos extra contra tu pulso, pero no congela al sujeto. Un corredor saldrá movido a 1/15 s aunque la cámara esté perfectamente quieta."
    ],
    "keyFacts": [
      "Doble de tiempo = doble de luz = +1 paso",
      "Pasos completos: 1/4000, 1/2000, 1/1000, 1/500, 1/250, 1/125, 1/60, 1/30, 1/15, 1/8, 1/4, 1/2, 1, 2, 4, 8, 15, 30 s",
      "De 1/4000 s a 30 s hay casi 17 pasos",
      "Regla del recíproco: tiempo ≤ 1/(focal × recorte) a pulso",
      "El barrido del sujeto depende de su velocidad, su distancia y la focal, no solo del tiempo",
      "Más de 30 s requiere el modo Bulb (B) y un disparador remoto"
    ],
    "commonMistakes": [
      "Confiar en el estabilizador para congelar sujetos en movimiento.",
      "Olvidar el factor de recorte al aplicar la regla del recíproco.",
      "Usar 1/60 s en interiores con niños: saldrán movidos.",
      "Dejar el estabilizador activo en trípode con objetivos que no lo detectan solos."
    ]
  },
  {
    "id": "iso",
    "title": "ISO: amplificar la señal",
    "summary": "El ISO no capta más luz: aclara la que ya entró, con un costo en ruido y rango dinámico.",
    "body": [
      "El ISO ajusta cuánto se amplifica la señal del sensor. No hace que entre más luz: aclara la que ya llegó. Duplicar el ISO (100 → 200) duplica el brillo final; es un paso.",
      "El ruido nace sobre todo de la poca luz recibida. Subir el ISO es la consecuencia de exponer con poca luz, no la causa principal del ruido. Aun así, en la práctica: ISO alto = más grano y menos rango dinámico.",
      "Usa el ISO base (normalmente 100) cuando puedas: trípode, paisaje, estudio. Súbelo sin miedo cuando necesitas velocidad o profundidad de campo: una foto nítida a ISO 6400 vale más que una movida a ISO 100.",
      "Las cámaras actuales dan resultados limpios hasta ISO 1600–3200 en full frame; en APS-C conviene un paso menos. Cada paso de ISO cuesta aproximadamente un paso de margen en las altas luces."
    ],
    "keyFacts": [
      "Doble de ISO = doble de brillo = +1 paso",
      "De ISO 100 a 25600 hay 8 pasos",
      "El ISO no cambia la cantidad de luz que llega al sensor",
      "ISO base = máximo rango dinámico y mínimo ruido",
      "Con el mismo tiempo y la misma apertura, subir el ISO en cámara da igual o menos ruido que aclarar después en edición"
    ],
    "commonMistakes": [
      "Dejar ISO 100 de noche y terminar con fotos movidas.",
      "Creer que subir el ISO «capta más luz» y no tiene costo.",
      "Usar Auto-ISO sin límite máximo.",
      "Subexponer «para evitar ruido» y aclarar en edición: aparece más ruido, no menos."
    ]
  },
  {
    "id": "stops",
    "title": "Pasos (stops): la moneda común",
    "summary": "Un paso es el doble o la mitad de luz; permite intercambiar apertura, velocidad e ISO.",
    "body": [
      "Un paso (stop o EV) es duplicar o reducir a la mitad la luz. Es la unidad que comparten apertura, velocidad e ISO, y permite intercambiarlas como si fueran monedas.",
      "+1 paso: tiempo × 2, ISO × 2 o número f ÷ 1.4. −1 paso: tiempo ÷ 2, ISO ÷ 2 o número f × 1.4. Las cámaras ajustan en tercios de paso: 1/125, 1/160, 1/200, 1/250 s.",
      "El valor de exposición es EV = log₂(N²/t). A ISO 100, f/8 y 1/125 s dan EV ≈ 13. Una escena de EV100 13 queda bien expuesta con cualquier combinación equivalente: f/5.6 a 1/250 s, f/4 a 1/500 s o f/11 a 1/60 s. Si usas otro ISO: EV100 = log₂(N²/t) − log₂(ISO/100).",
      "Referencias de EV100: pleno sol ≈ 15, nublado brillante ≈ 13, sombra abierta ≈ 12, atardecer ≈ 11–12, interior de casa ≈ 5–7, calle de noche ≈ 4–6, paisaje con luna llena ≈ −2 a −3, Vía Láctea ≈ −7 a −8."
    ],
    "keyFacts": [
      "1 paso = luz × 2 o ÷ 2",
      "Tercios: 1/125, 1/160, 1/200, 1/250 s; f/2.8, 3.2, 3.5, 4; ISO 100, 125, 160, 200",
      "EV = log₂(N²/t); con ISO distinto de 100: EV100 = log₂(N²/t) − log₂(ISO/100)",
      "Escena con EV más alto = más luminosa = necesita menos luz por ajuste",
      "Regla Sunny 16: a pleno sol, f/16 y velocidad ≈ 1/ISO"
    ],
    "commonMistakes": [
      "Pensar que de f/4 a f/8 hay «un paso» porque el número se duplica: son 2 pasos.",
      "Contar mal los tercios: de 1/125 a 1/250 s son 3 clics de un tercio = 1 paso.",
      "Confundir el EV de la escena con la compensación de exposición (±EV).",
      "Olvidar que el ISO también suma pasos: de ISO 100 a 400 son 2."
    ]
  },
  {
    "id": "exposure-triangle",
    "title": "Triángulo de exposición",
    "summary": "Apertura, velocidad e ISO suman la exposición; cada uno tiene un costo creativo distinto.",
    "body": [
      "La exposición final depende de tres controles: la apertura (cuánta luz a la vez), la velocidad (durante cuánto tiempo) y el ISO (cuánto se amplifica). Si mueves uno, compensa con otro para mantener el mismo brillo.",
      "Cada vértice tiene un costo creativo: la apertura cambia la profundidad de campo, la velocidad cambia el movimiento y el ISO cambia el ruido. Elegir la exposición es elegir qué costo aceptas.",
      "Método práctico: decide primero lo que más importa en la foto (fondo desenfocado → apertura; congelar → velocidad). Fija el segundo control según el riesgo (trepidación, movimiento). Deja el ISO como el ajuste que cierra la cuenta.",
      "Ejemplo: retrato en sombra abierta, EV100 12. Quieres f/2 y 1/1000 s: log₂(2² × 1000) ≈ 12, así que ISO 100 basta. Si cierras a f/4 (2 pasos menos de luz), compensa con 1/250 s o con ISO 400."
    ],
    "keyFacts": [
      "Apertura → profundidad de campo",
      "Velocidad → movimiento del sujeto y trepidación",
      "ISO → ruido y rango dinámico",
      "Mismo EV = misma exposición con distinta estética",
      "Prioriza: efecto creativo → seguridad (movimiento) → el ISO cierra la cuenta"
    ],
    "commonMistakes": [
      "Tratar los tres controles como independientes y luego «arreglar» todo con un ISO extremo.",
      "Subir el ISO antes de abrir el diafragma cuando la profundidad de campo no importa.",
      "Olvidar que al cambiar la focal cambia el límite de trepidación.",
      "Ver el triángulo como regla rígida: el flash, los filtros ND y la luz disponible también cuentan."
    ]
  },
  {
    "id": "metering",
    "title": "Exposímetro y modos de medición",
    "summary": "La cámara mide la luz reflejada y propone llevar lo medido a gris medio; tú decides si eso es correcto.",
    "body": [
      "El exposímetro de la cámara mide la luz reflejada por la escena y propone una exposición que convierte lo medido en gris medio. La escala (−2 … 0 … +2) indica cuánto se aleja tu ajuste de esa propuesta.",
      "Funciona bien con escenas de tonos promedio. Falla con escenas mayoritariamente claras u oscuras: la nieve sale gris (subexpuesta) y un gato negro sale gris (sobreexpuesto). Corrige con +1 a +2 EV en nieve o arena blanca y con −1 a −2 EV en escenas muy oscuras.",
      "El modo de medición define qué parte del encuadre se mide: matricial o evaluativa (todo el cuadro, con análisis inteligente), ponderada al centro (prioriza el centro) y puntual (solo ≈1.5–4 % del cuadro). En contraluces fuertes, la puntual sobre el rostro da control preciso.",
      "El 0 del exposímetro no significa «correcto». Significa «gris medio según lo que se midió». Tú decides si la escena debe verse más clara o más oscura."
    ],
    "keyFacts": [
      "El exposímetro reflejado apunta al gris medio (≈12–18 % de reflectancia según la calibración)",
      "Nieve o arena: +1 a +2 EV; escenas oscuras: −1 a −2 EV",
      "Medición puntual: ≈1.5–4 % del encuadre según la marca; a veces ligada al punto AF",
      "En M, la escala muestra la diferencia; en A, S y P la cámara corrige sola",
      "Piel clara medida en puntual: compensa ≈ +0.7 a +1 EV"
    ],
    "commonMistakes": [
      "Confiar ciegamente en el 0 del exposímetro.",
      "Usar matricial en un contraluz fuerte sin compensar: el rostro sale oscuro.",
      "Medir puntual sobre una zona muy clara u oscura sin ajustar después.",
      "Olvidar que la medición puntual puede seguir al punto AF y medir donde no esperabas."
    ]
  },
  {
    "id": "histogram",
    "title": "Histograma: la verdad de la exposición",
    "summary": "Un gráfico del reparto de tonos que no se deja engañar por el brillo de la pantalla.",
    "body": [
      "El histograma muestra el reparto de tonos: a la izquierda las sombras, a la derecha las altas luces y en medio los tonos medios. La altura indica cuántos píxeles tienen ese tono.",
      "No existe un histograma «correcto». Una escena nevada se agrupa a la derecha y una nocturna a la izquierda. Lo que importa es el recorte: datos pegados al borde derecho son blancos quemados sin detalle; pegados al izquierdo, negros sin información.",
      "Revisa también el histograma RGB. Un canal, casi siempre el rojo en atardeceres y flores, puede saturarse antes que la luminancia general.",
      "Exponer a la derecha (ETTR) en RAW: lleva el histograma lo más a la derecha posible sin recortar altas luces importantes. Captas más señal y menos ruido. Ojo: el histograma de la cámara se calcula sobre la vista previa JPEG, así que el RAW suele guardar entre 0.3 y 1 paso de margen extra."
    ],
    "keyFacts": [
      "Eje horizontal: de negro (izquierda) a blanco (derecha); eje vertical: cantidad de píxeles",
      "No hay forma ideal: depende de la escena",
      "Recorte = datos pegados a un borde",
      "Revisa el histograma RGB en colores saturados",
      "El histograma de la cámara se basa en el JPEG de vista previa"
    ],
    "commonMistakes": [
      "Buscar una «montaña centrada» en todas las fotos.",
      "Juzgar la exposición por el brillo de la pantalla, que engaña al sol y de noche.",
      "Ignorar el canal rojo en atardeceres.",
      "Aplicar ETTR en JPEG: no hay datos extra que recuperar."
    ]
  },
  {
    "id": "exposure-compensation",
    "title": "Compensación de exposición",
    "summary": "El botón ± le dice a la cámara que quieres la foto más clara o más oscura que su propuesta.",
    "body": [
      "La compensación de exposición (botón ±) le indica a la cámara: «quiero más claro» o «más oscuro» de lo que propone el exposímetro. Se ajusta en tercios de paso, normalmente entre ±3 y ±5 EV.",
      "Funciona en P, A y S: la cámara cambia la velocidad (en A), la apertura (en S) o ambas (en P). En M con Auto-ISO cambia el ISO. En M con ISO fijo solo desplaza la escala; tú ajustas a mano.",
      "Usos típicos: +1 a +2 EV en nieve, playa o fondos blancos; +0.7 a +1 EV en contraluces con medición matricial; −0.7 a −1 EV para proteger cielos o para escenas oscuras y dramáticas.",
      "La compensación queda guardada. Comprueba que vuelva a 0 al cambiar de escena: olvidarlo es el error más común."
    ],
    "keyFacts": [
      "Rango típico: ±3 o ±5 EV en tercios de paso",
      "A: cambia la velocidad; S: cambia la apertura; P: ambas; M + Auto-ISO: cambia el ISO",
      "En M con ISO fijo no actúa sobre la foto",
      "Nieve o playa +1 a +2; contraluz matricial +0.7 a +1; escena oscura −0.7 a −1",
      "Se mantiene hasta que la vuelves a 0"
    ],
    "commonMistakes": [
      "Dejar +2 EV puesto después de la nieve y quemar las fotos del día siguiente.",
      "Esperar que la compensación funcione en M con ISO fijo.",
      "Compensar en la dirección contraria en escenas blancas (restar en vez de sumar).",
      "Usarla para arreglar un contraluz cuando la medición puntual era la solución."
    ]
  },
  {
    "id": "depth-of-field",
    "title": "Profundidad de campo e hiperfocal",
    "summary": "Qué zona de la escena se ve nítida y cómo llevarla del primer plano al infinito.",
    "body": [
      "La profundidad de campo es la zona, delante y detrás del punto enfocado, que se ve aceptablemente nítida. Depende de la apertura, la distancia de enfoque, la focal y el tamaño en que se mira la foto.",
      "Más profundidad: cerrar el diafragma, alejarte del sujeto o usar una focal más corta. Menos profundidad: abrir, acercarte o usar un tele. A distancias medias hay más zona nítida detrás del punto de enfoque que delante.",
      "La distancia hiperfocal es H ≈ f²/(N·c) + f, con c ≈ 0.03 mm en full frame. Si enfocas a H, todo es nítido desde H/2 hasta el infinito. Con 24 mm a f/11: H ≈ 1.8 m, nítido desde ~0.9 m hasta el infinito.",
      "El enfoque por zonas en fotografía callejera usa la misma idea: con 35 mm a f/8 y enfoque a 3 m, la zona nítida va de ~1.9 a ~7 m. Disparas sin esperar al autofoco."
    ],
    "keyFacts": [
      "Más profundidad: cerrar, alejarse, focal corta",
      "Hiperfocal H ≈ f²/(N·c) + f (c ≈ 0.03 mm en full frame, ≈ 0.02 mm en APS-C)",
      "Enfocando a H: nítido desde H/2 hasta el infinito",
      "El desenfoque del fondo crece con focal larga, apertura abierta, sujeto cerca y fondo lejos",
      "La nitidez «aceptable» depende del tamaño de visualización"
    ],
    "commonMistakes": [
      "Enfocar al infinito en un paisaje y perder el primer plano.",
      "Creer que a f/16 todo es nítido aunque enfoques a 50 cm.",
      "Juzgar la nitidez en la pantalla pequeña sin ampliar.",
      "Olvidar que un sensor más pequeño da más profundidad con el mismo encuadre y el mismo número f."
    ]
  }
];
