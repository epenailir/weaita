/**
 * Criterios medibles de cada escenario. Cada criterio se evalúa con las métricas del motor
 * y devuelve un diagnóstico (qué falló, con el valor medido, y qué mover); además explica
 * con números reales por qué la receta lo cumple.
 */
import {
  APERTURES,
  SHUTTERS,
  airyDiskMm,
  formatAperture,
  formatDistance,
  formatIso,
  formatKelvin,
  formatShutter,
  handheldLimitS,
  miredShift,
  motionBlurPx,
  rule500S,
  npfRuleS,
} from '../../engine';
import { METERING_INFO } from '../../components/viewfinder';
import { formatFocus } from '../../components/viewfinder';
import type { MeteringMode } from '../../engine';
import { fmtDepth, fmtEV, fmtLength, fmtMicrons, fmtPct, fmtPx, fmtSpeed, fmtStopsAbs, fmtTime, fmtZone, fmtZoneShort, num, timesText } from './format';
import { isInfinity } from './model';
import type { ShotContext } from './model';

export interface CheckOutcome {
  pass: boolean;
  /** Valor medido, listo para mostrar. */
  value: string;
  /** Diagnóstico cuando falla (vacío si pasa). */
  fix: string;
}

export interface Check {
  id: string;
  /** Rótulo corto ("Fondo cremoso"). */
  label: string;
  /** Meta medible ("disco ≥ 2 % del ancho"). */
  goal: string;
  evaluate: (c: ShotContext) => CheckOutcome;
  /** Por qué la receta lo cumple, con sus números. */
  why: (c: ShotContext) => string;
}

/** Tolerancia de exposición del motor (±⅓ de paso). */
export const EXPOSURE_TOLERANCE = 0.34;

/** Ancho de referencia con el que el motor expresa los desenfoques en px. */
const REF_WIDTH_PX = 1000;

const LIMITED_NAME = { aperture: 'de la apertura', shutter: 'de la velocidad', iso: 'del Auto-ISO' } as const;

/** Medición que menos se equivoca en esta escena. */
function bestMetering(c: ShotContext): MeteringMode {
  const order: MeteringMode[] = ['spot', 'center', 'matrix'];
  return order.reduce((best, m) => (Math.abs(c.lighting.meteringBias[m]) < Math.abs(c.lighting.meteringBias[best]) ? m : best), 'matrix');
}

/** Diagnóstico de exposición según quién decide la luz (tú o el automatismo). */
export function exposureFix(c: ShotContext): string {
  const v = c.m.exposureOffset;
  if (c.limited) {
    return `El automatismo llegó al límite ${LIMITED_NAME[c.limited]}: la foto queda en ${fmtEV(v)}. Cambia otro parámetro para que la cámara tenga margen.`;
  }
  const cameraDecides = c.s.mode !== 'M' || c.s.autoIso;
  if (cameraDecides) {
    const bias = c.lighting.meteringBias[c.s.metering];
    if (Math.abs(bias) >= 0.3) {
      const best = bestMetering(c);
      return (
        `La medición ${METERING_INFO[c.s.metering].label.toLowerCase()} se equivoca ${fmtEV(bias)} en esta escena y la cámara obedece: ` +
        `la foto queda en ${fmtEV(v)}. Pasa a ${METERING_INFO[best].label.toLowerCase()} o lleva la compensación a ${fmtEV(c.s.exposureComp - v)}.`
      );
    }
    return `La cámara expone según la compensación elegida y la foto queda en ${fmtEV(v)}: lleva la compensación hacia ${fmtEV(c.s.exposureComp - v)}.`;
  }
  return v < 0
    ? `Le faltan ${fmtStopsAbs(v)} de luz: abre el diafragma, alarga la velocidad o sube el ISO (cada ⅓ de paso cuenta).`
    : `Le sobran ${fmtStopsAbs(v)} de luz: cierra el diafragma, acorta la velocidad o baja el ISO.`;
}

export function exposureCheck(label: string): Check {
  return {
    id: 'exposure',
    label,
    goal: 'exposición ±⅓ EV',
    evaluate: (c) => {
      const v = c.m.exposureOffset;
      const pass = Math.abs(v) <= EXPOSURE_TOLERANCE;
      return { pass, value: fmtEV(v), fix: pass ? '' : exposureFix(c) };
    },
    why: (c) =>
      `${formatAperture(c.s.aperture)}, ${fmtTime(c.s.shutter)} e ISO ${formatIso(c.s.iso)} equivalen a EV100 ${num(c.m.settingsEV100)}, ` +
      `el brillo del sujeto (EV100 ${num(c.lighting.ev100)}): exposición ${fmtEV(c.m.exposureOffset)}.`,
  };
}

/* ------------------------------------------------------------------ Movimiento y trepidación */

export const shakeCheck: Check = {
  id: 'shake',
  label: 'Sin trepidación',
  goal: 'velocidad segura a pulso',
  evaluate: (c) => {
    const limit = handheldLimitS(c.s.focalMm, c.sensor, c.s.stabilizationStops);
    const pass = c.m.shakeRatio <= 1;
    return {
      pass,
      value: c.s.tripod ? 'trípode' : `${formatShutter(c.s.shutter)} / ${formatShutter(limit)}`,
      fix: pass
        ? ''
        : `A pulso con ${c.s.focalMm} mm necesitas ${fmtTime(limit)} o menos y usas ${fmtTime(c.s.shutter)} (${num(c.m.shakeRatio)}× más lento). ` +
          'Sube la velocidad, activa la estabilización o usa trípode.',
    };
  },
  why: (c) => {
    if (c.s.tripod) return `Sobre trípode no hay trepidación: ${fmtTime(c.s.shutter)} es seguro.`;
    const limit = handheldLimitS(c.s.focalMm, c.sensor, c.s.stabilizationStops);
    return `${fmtTime(c.s.shutter)} es ${Math.max(1, Math.round(limit / c.s.shutter))}× más rápido que el límite a pulso con ${c.s.focalMm} mm (${fmtTime(limit)}).`;
  },
};

/** Velocidad más lenta de la escala que deja el barrido por debajo de `maxPx`. */
export function shutterForBlur(c: ShotContext, maxPx: number, speedMS = c.lighting.subjectSpeedMS): number {
  const at1s = motionBlurPx(speedMS, c.lighting.subjectDistanceM, c.s.focalMm, 1, c.sensor, REF_WIDTH_PX);
  const target = at1s > 0 ? maxPx / at1s : Infinity;
  let best = SHUTTERS[0]!.value;
  for (const s of SHUTTERS) if (s.value <= target * 1.0001) best = s.value;
  return best;
}

export function freezeCheck(label: string, subject: string, maxPx: number): Check {
  return {
    id: 'freeze',
    label,
    goal: `barrido ≤ ${num(maxPx)} px`,
    evaluate: (c) => {
      const v = c.m.subjectMotionBlurPx;
      const pass = v <= maxPx;
      const moved = c.lighting.subjectSpeedMS * c.s.shutter;
      return {
        pass,
        value: fmtPx(v),
        fix: pass
          ? ''
          : `En ${fmtTime(c.s.shutter)} ${subject} avanza ${fmtLength(moved)} y deja ${fmtPx(v)} de barrido. ` +
            `Necesitas ${fmtTime(shutterForBlur(c, maxPx))} o más rápido; la estabilización no congela al sujeto.`,
      };
    },
    why: (c) =>
      `En ${fmtTime(c.s.shutter)} ${subject} a ${fmtSpeed(c.lighting.subjectSpeedMS)} recorre ${fmtLength(c.lighting.subjectSpeedMS * c.s.shutter)}: ` +
      `a ${formatDistance(c.lighting.subjectDistanceM)} con ${c.s.focalMm} mm son ${fmtPx(c.m.subjectMotionBlurPx)} de barrido en una imagen de ${REF_WIDTH_PX} px.`,
  };
}

/* ------------------------------------------------------------------ Enfoque y profundidad de campo */

export function subjectSharpCheck(label: string, subject: string): Check {
  return {
    id: 'subject-sharp',
    label,
    goal: 'sujeto dentro de la zona nítida',
    evaluate: (c) => {
      const d = c.lighting.subjectDistanceM;
      const pass = c.m.dofNearM <= d && d <= c.m.dofFarM;
      return {
        pass,
        value: fmtZoneShort(c.m.dofNearM, c.m.dofFarM),
        fix: pass
          ? ''
          : `${subject} está a ${formatDistance(d)} y la zona nítida va de ${fmtZone(c.m.dofNearM, c.m.dofFarM)}: enfoca a ${formatDistance(d)}.`,
      };
    },
    why: (c) =>
      `Enfocado a ${formatFocus(c.s.focusM)} con ${formatAperture(c.s.aperture)}, la zona nítida mide ${fmtDepth(c.m.dofNearM, c.m.dofFarM)}: ` +
      `de ${fmtZone(c.m.dofNearM, c.m.dofFarM)}.`,
  };
}

/* ------------------------------------------------------------------ Ruido y rango dinámico */

export function isoCheck(label: string, maxIso: number, context: string): Check {
  return {
    id: 'iso',
    label,
    goal: `ISO ≤ ${maxIso}`,
    evaluate: (c) => {
      const pass = c.s.iso <= maxIso * 1.01;
      return {
        pass,
        value: `ISO ${formatIso(c.s.iso)} · ${num(c.m.dynamicRangeStops)} pasos`,
        fix: pass
          ? ''
          : `A ISO ${formatIso(c.s.iso)} el rango dinámico baja a ${num(c.m.dynamicRangeStops)} pasos y el ruido sube (${Math.round(c.m.noiseScore)}/100). ` +
            `Gana luz con la apertura o el tiempo antes que con el ISO.`,
      };
    },
    why: (c) => `ISO ${formatIso(c.s.iso)} conserva ${num(c.m.dynamicRangeStops)} pasos de rango dinámico ${context} (contraste de la escena: ${c.lighting.sceneContrastStops} pasos).`,
  };
}

/* ------------------------------------------------------------------ Golden hour */

export const backgroundBlurCheck: Check = {
  id: 'background',
  label: 'Fondo cremoso',
  goal: 'disco ≥ 2 % del ancho',
  evaluate: (c) => {
    const v = c.m.backgroundBlurPct;
    const pass = v >= 2;
    let fix = '';
    if (!pass) {
      // El disco es inversamente proporcional al número f.
      const needed = (c.s.aperture * v) / 2;
      const stop = [...APERTURES].reverse().find((a) => a.value <= needed * 1.001);
      fix = stop
        ? `Cada punto del fondo es un disco de ${fmtPct(v)} del ancho. Abre a ${formatAperture(stop.value)} o más: el disco crece en proporción a la pupila.`
        : `Cada punto del fondo es un disco de ${fmtPct(v)}: ni a f/1.4 llegarías. Acércate al sujeto o aléjalo del fondo.`;
    }
    return { pass, value: fmtPct(v), fix };
  },
  why: (c) =>
    `Con ${c.s.focalMm} mm a ${formatDistance(c.lighting.subjectDistanceM)} y el fondo a ${formatDistance(c.lighting.backgroundDistanceM)}, ` +
    `${formatAperture(c.s.aperture)} convierte cada punto del fondo en un disco de ${fmtPct(c.m.backgroundBlurPct)} del ancho de la imagen.`,
};

export const warmToneCheck: Check = {
  id: 'warm',
  label: 'Tono dorado',
  goal: 'balance ≥ 5000 K',
  evaluate: (c) => {
    const pass = c.s.wbK >= 5000;
    return {
      pass,
      value: formatKelvin(c.s.wbK),
      fix: pass
        ? ''
        : `Con ${formatKelvin(c.s.wbK)} la cámara neutraliza la luz de ${formatKelvin(c.lighting.illuminantK)} y el atardecer pierde el dorado. Usa luz día (5500 K) o más.`,
    };
  },
  why: (c) =>
    `Balance en ${formatKelvin(c.s.wbK)} con luz real de ${formatKelvin(c.lighting.illuminantK)}: la cámara deja pasar ${Math.round(Math.abs(miredShift(c.s.wbK, c.lighting.illuminantK)))} mireds de calidez.`,
};

/* ------------------------------------------------------------------ Deporte */

export const afcCheck: Check = {
  id: 'af',
  label: 'Enfoque que sigue',
  goal: 'AF-C',
  evaluate: (c) => {
    const pass = c.s.af === 'AF-C';
    const travel = c.lighting.subjectSpeedMS * 0.2;
    return {
      pass,
      value: c.s.af,
      fix: pass
        ? ''
        : `Con ${c.s.af} el foco se queda donde estaba el jugador: en 0.2 s avanza ${fmtLength(travel)}, más que la zona nítida de ${fmtDepth(c.m.dofNearM, c.m.dofFarM)}. Usa AF-C.`,
    };
  },
  why: (c) =>
    `AF-C recalcula el foco en cada cuadro: en 0.2 s el jugador avanza ${fmtLength(c.lighting.subjectSpeedMS * 0.2)} y la zona nítida solo mide ${fmtDepth(c.m.dofNearM, c.m.dofFarM)}.`,
};

/* ------------------------------------------------------------------ Paisaje */

export function foregroundCheck(fgM: number): Check {
  return {
    id: 'foreground',
    label: 'Primer plano nítido',
    goal: `nítido desde ≤ ${formatDistance(fgM)}`,
    evaluate: (c) => {
      const pass = c.m.dofNearM <= fgM * 1.001;
      const fix = pass
        ? ''
        : isInfinity(c.s.focusM)
          ? `Enfocaste al infinito: la zona nítida empieza en ${formatDistance(c.m.dofNearM)} y el primer plano a ${formatDistance(fgM)} sale blando. Enfoca a la hiperfocal (${formatDistance(c.m.hyperfocalM)}).`
          : `La zona nítida empieza en ${formatDistance(c.m.dofNearM)}: enfoca más cerca (hiperfocal ${formatDistance(c.m.hyperfocalM)}) o cierra el diafragma.`;
      return { pass, value: `desde ${formatDistance(c.m.dofNearM)}`, fix };
    },
    why: (c) =>
      `Con ${c.s.focalMm} mm a ${formatAperture(c.s.aperture)} la hiperfocal es ${formatDistance(c.m.hyperfocalM)}; enfocando a ${formatFocus(c.s.focusM)} todo es nítido desde ${formatDistance(c.m.dofNearM)}.`,
  };
}

export function horizonCheck(bgM: number): Check {
  return {
    id: 'horizon',
    label: 'Montañas nítidas',
    goal: 'nítido hasta ∞',
    evaluate: (c) => {
      const pass = !Number.isFinite(c.m.dofFarM) || c.m.dofFarM >= bgM;
      return {
        pass,
        value: `hasta ${formatDistance(c.m.dofFarM)}`,
        fix: pass
          ? ''
          : `La zona nítida termina en ${formatDistance(c.m.dofFarM)}: enfoca más lejos, al menos a la hiperfocal (${formatDistance(c.m.hyperfocalM)}), o cierra el diafragma.`,
      };
    },
    why: (c) =>
      `Enfocar a la hiperfocal o más allá lleva el límite lejano al infinito: zona de ${fmtZone(c.m.dofNearM, c.m.dofFarM)}.`,
  };
}

export const diffractionCheck: Check = {
  id: 'diffraction',
  label: 'Sin difracción',
  goal: 'f/16 o más abierto',
  evaluate: (c) => {
    const airy = airyDiskMm(c.s.aperture);
    const pass = c.s.aperture <= 16.01;
    return {
      pass,
      value: `Airy ${fmtMicrons(airy)}`,
      fix: pass
        ? ''
        : `A ${formatAperture(c.s.aperture)} el disco de Airy mide ${fmtMicrons(airy)}, ${timesText(airy / c.sensor.cocMm)} el círculo de confusión (${fmtMicrons(c.sensor.cocMm)}): todo se ablanda. Vuelve a f/8–f/11.`,
    };
  },
  // Criterio didáctico común: desde ~f/11 empieza a suavizar el detalle fino; a f/16–f/22 se nota a tamaño completo.
  why: (c) =>
    `A ${formatAperture(c.s.aperture)} el disco de Airy mide ${fmtMicrons(airyDiskMm(c.s.aperture))}, ${Math.round((airyDiskMm(c.s.aperture) / c.sensor.cocMm) * 100)} % del círculo de confusión (${fmtMicrons(c.sensor.cocMm)}): ` +
    (c.s.aperture >= 10.9
      ? 'la difracción empieza a suavizar el detalle fino, pero aún compensa por la profundidad ganada.'
      : 'la difracción todavía no se nota.'),
};

/* ------------------------------------------------------------------ Astro */

export const starsCheck: Check = {
  id: 'stars',
  label: 'Estrellas puntuales',
  goal: '≤ regla de los 500',
  evaluate: (c) => {
    const max = rule500S(c.s.focalMm, c.sensor);
    const pass = c.m.starTrailRatio <= 1.001;
    return {
      pass,
      value: `${formatShutter(c.s.shutter)} / ${formatShutter(max)}`,
      fix: pass
        ? ''
        : `Con ${c.s.focalMm} mm el límite es ${fmtTime(max)} y expones ${fmtTime(c.s.shutter)} (${num(c.m.starTrailRatio)}×): las estrellas dejan trazo. Acorta el tiempo y compensa con apertura o ISO.`,
    };
  },
  why: (c) => {
    const max = rule500S(c.s.focalMm, c.sensor);
    const npf = npfRuleS(c.s.focalMm, c.s.aperture, c.sensor);
    return (
      `500 ÷ (${c.s.focalMm} mm × ${c.sensor.crop}) = ${fmtTime(max)} como máximo; ${fmtTime(c.s.shutter)} es el ${Math.round((c.s.shutter / max) * 100)} % del límite. ` +
      `La regla NPF, más estricta, da ${num(npf)} s.`
    );
  },
};

export const infinityCheck: Check = {
  id: 'infinity',
  label: 'Estrellas enfocadas',
  goal: '∞ dentro de la zona nítida',
  evaluate: (c) => {
    const pass = !Number.isFinite(c.m.dofFarM);
    return {
      pass,
      value: `zona hasta ${formatDistance(c.m.dofFarM)}`,
      fix: pass
        ? ''
        : `La zona nítida termina en ${formatDistance(c.m.dofFarM)}: las estrellas quedan blandas. Enfoca al infinito con la pantalla en vivo ampliada sobre una estrella brillante.`,
    };
  },
  why: (c) => `Enfocado al infinito la zona nítida va de ${fmtZone(c.m.dofNearM, c.m.dofFarM)}: las estrellas son puntos, no discos.`,
};

export const neutralSkyCheck: Check = {
  id: 'sky-wb',
  label: 'Cielo neutro',
  goal: 'balance 3500–4500 K',
  evaluate: (c) => {
    const pass = c.s.wbK >= 3500 && c.s.wbK <= 4500;
    return {
      pass,
      value: formatKelvin(c.s.wbK),
      fix: pass
        ? ''
        : c.s.wbK > 4500
          ? `Con ${formatKelvin(c.s.wbK)} el resplandor del cielo (${formatKelvin(c.lighting.illuminantK)}) se tiñe de naranja. Baja el balance a 3800–4200 K.`
          : `Con ${formatKelvin(c.s.wbK)} el cielo se vuelve azul eléctrico. Sube el balance a 3800–4200 K.`,
    };
  },
  why: (c) => `Balance en ${formatKelvin(c.s.wbK)} frente al resplandor de ${formatKelvin(c.lighting.illuminantK)}: el cielo queda azul oscuro y neutro.`,
};

/* ------------------------------------------------------------------ Street */

export function zoneCheck(nearM: number, farM: number): Check {
  return {
    id: 'zone',
    label: `Zona de ${num(nearM, 0)} a ${num(farM, 0)} m`,
    goal: `nítido de ${num(nearM, 0)} a ${num(farM, 0)} m`,
    evaluate: (c) => {
      const pass = c.m.dofNearM <= nearM * 1.001 && c.m.dofFarM >= farM * 0.999;
      const focusOff = Math.abs(Math.log(Math.min(c.s.focusM, 1e6) / 3)) > 0.35;
      return {
        pass,
        value: fmtZoneShort(c.m.dofNearM, c.m.dofFarM),
        fix: pass
          ? ''
          : `Tu zona nítida va de ${fmtZone(c.m.dofNearM, c.m.dofFarM)} y no cubre de ${num(nearM, 0)} a ${num(farM, 0)} m. ` +
            (focusOff ? 'Prefija el enfoque cerca de 3 m y cierra' : 'Cierra') +
            ' el diafragma: cada paso más cerrado la amplía.',
      };
    },
    why: (c) =>
      `${c.s.focalMm} mm a ${formatAperture(c.s.aperture)} enfocado a ${formatFocus(c.s.focusM)}: todo es nítido de ${fmtZone(c.m.dofNearM, c.m.dofFarM)}. No esperas al autofoco.`,
  };
}

export const manualFocusCheck: Check = {
  id: 'mf',
  label: 'Enfoque prefijado',
  goal: 'MF',
  evaluate: (c) => {
    const pass = c.s.af === 'MF';
    return {
      pass,
      value: c.s.af,
      fix: pass ? '' : `Con ${c.s.af} la cámara busca foco cuando aparece alguien y pierdes el momento: pasa a MF y prefija la distancia.`,
    };
  },
  why: () => 'En MF el foco ya está puesto: disparas en cuanto el sujeto entra en la zona, sin esperar al autofoco.',
};
