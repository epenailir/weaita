import { useEffect, useMemo, useRef, useState } from 'react';
import { computeHistogram, formatThirds, mulberry32 } from '../../engine';
import type { Histogram as HistogramData } from '../../engine';
import { Badge, Callout, Panel, RangeSlider, Segmented } from '../../components/ui';
import { renderStillLife, toLinear, toSrgb } from './stillLife';

const W = 480;
const H = 300;
/** Ganancia escena → sensor: el gris medio queda ~4 pasos bajo la saturación. */
const SENSOR_GAIN = 0.35;

/** Curva de tono con hombro suave: lineal hasta 0.6 y llega a blanco en 1.0. */
function toneCurve(x: number): number {
  if (x <= 0.6) return Math.max(0, x);
  if (x >= 1) return 1;
  const t = (x - 0.6) / 0.4;
  return 0.6 + 0.4 * (t + t * t - t * t * t);
}

const CAPTURES = [
  { value: 'under', label: '−2 EV · oscura', ev: -2 },
  { value: 'ok', label: 'Correcta', ev: 0 },
  { value: 'over', label: '+1⅓ EV · cielo quemado', ev: 4 / 3 },
] as const;
type CaptureId = (typeof CAPTURES)[number]['value'];

interface DevelopedPair {
  raw: ImageData;
  jpeg: ImageData;
}

let sceneCache: ReturnType<typeof renderStillLife> | null = null;

/** Captura en el sensor (con ruido) y "revelado" de ambos formatos con el ajuste de edición. */
function develop(captureEv: number, editEv: number): DevelopedPair {
  sceneCache ??= renderStillLife(W, H);
  const scene = sceneCache;
  const rnd = mulberry32(99);
  const n = W * H;
  const raw = new ImageData(W, H);
  const jpeg = new ImageData(W, H);
  const push = Math.pow(2, editEv);
  const expose = Math.pow(2, captureEv) * SENSOR_GAIN;
  for (let p = 0; p < n; p++) {
    for (let c = 0; c < 3; c++) {
      const lin = scene.data[p * 3 + c]!;
      // Sensor: señal + ruido de disparo y lectura, saturación en 1.0
      const signal = lin * expose;
      const sigma = Math.sqrt(0.00002 + 0.0004 * Math.max(0, signal));
      const u = Math.max(1e-7, rnd());
      const v = rnd();
      const noise = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sigma;
      const sensor = Math.min(1, Math.max(0, signal + noise));

      // RAW: 14 bits lineales; la edición se aplica antes de la curva de tono
      const raw14 = Math.round(sensor * 16383) / 16383;
      const rawOut = toSrgb(toneCurve((raw14 / SENSOR_GAIN) * push));

      // JPEG: la cámara aplica la curva y guarda 8 bits; la edición trabaja sobre ese archivo
      const jpeg8 = Math.round(Math.min(1, toSrgb(toneCurve(sensor / SENSOR_GAIN))) * 255) / 255;
      const edited = Math.min(1, toLinear(jpeg8) * push);
      const jpegOut = Math.round(toSrgb(edited) * 255) / 255;

      raw.data[p * 4 + c] = Math.round(Math.min(1, Math.max(0, rawOut)) * 255);
      jpeg.data[p * 4 + c] = Math.round(Math.min(1, Math.max(0, jpegOut)) * 255);
    }
    raw.data[p * 4 + 3] = 255;
    jpeg.data[p * 4 + 3] = 255;
  }
  return { raw, jpeg };
}

function MiniHistogram({ data, label }: { data: HistogramData; label: string }) {
  const path = (arr: Float32Array) => {
    const pts = Array.from(arr, (v, i) => `${(i / (arr.length - 1)) * 100},${40 - v * 38}`);
    return `M0,40 L${pts.join(' L')} L100,40 Z`;
  };
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-12 w-full" role="img" aria-label={label}>
      <path d={path(data.l)} fill="var(--color-muted)" opacity="0.55" />
      <line x1="0" y1="39.5" x2="100" y2="39.5" stroke="var(--color-line-strong)" strokeWidth="0.5" />
    </svg>
  );
}

function Developed({ image, title, badge, hist, note }: { image: ImageData; title: string; badge: string; hist: HistogramData; note: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    c.width = image.width;
    c.height = image.height;
    ctx.putImageData(image, 0, 0);
  }, [image]);
  return (
    <figure className="min-w-0">
      <div className="relative overflow-hidden rounded-lg border border-line bg-ink">
        <canvas ref={ref} className="block h-auto w-full" role="img" aria-label={`${title}: ${note}`} />
        <div className="absolute left-3 top-3">
          <Badge tone={title === 'RAW' ? 'info' : 'amber'}>{badge}</Badge>
        </div>
      </div>
      <figcaption className="mt-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-fg">{title}</span>
          <span className="osd text-[11px] text-faint">
            quemado {hist.clippedHighlightsPct.toFixed(1)}% · negro {hist.clippedShadowsPct.toFixed(1)}%
          </span>
        </div>
        <MiniHistogram data={hist} label={`Histograma ${title}`} />
        <p className="text-xs text-faint">{note}</p>
      </figcaption>
    </figure>
  );
}

export function RawJpegDemo() {
  const [capture, setCapture] = useState<CaptureId>('under');
  const [edit, setEdit] = useState(2);
  const cap = CAPTURES.find((c) => c.value === capture) ?? CAPTURES[0];
  const dev = useMemo(() => develop(cap.ev, edit), [cap.ev, edit]);
  const histRaw = useMemo(() => computeHistogram(dev.raw.data, 2), [dev]);
  const histJpeg = useMemo(() => computeHistogram(dev.jpeg.data, 2), [dev]);

  const rawNote =
    edit > 0.4
      ? 'Las sombras suben con transiciones suaves: hay 64 veces más niveles por canal.'
      : edit < -0.4
        ? 'Al bajar la exposición vuelve el color del cielo: el sensor todavía tenía información.'
        : 'Archivo lineal de 14 bits, sin curva ni balance grabados.';
  const jpegNote =
    edit > 0.4
      ? 'Al levantar las sombras aparecen saltos de tono (bandas) y el ruido se ve más.'
      : edit < -0.4
        ? 'Lo quemado no se recupera: el blanco puro solo se vuelve gris plano.'
        : '8 bits con curva, nitidez y balance ya aplicados por la cámara.';

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Developed image={dev.raw} title="RAW" badge="14 bits · 16 384 niveles" hist={histRaw} note={rawNote} />
        <Developed image={dev.jpeg} title="JPEG" badge="8 bits · 256 niveles" hist={histJpeg} note={jpegNote} />
      </div>
      <Panel eyebrow="Laboratorio" title="Revela la misma foto en RAW y en JPEG">
        <div className="grid gap-5 md:grid-cols-2">
          <Segmented
            label="1 · Cómo se tomó la foto"
            options={CAPTURES.map((c) => ({ value: c.value, label: c.label }))}
            value={capture}
            onChange={(v) => {
              setCapture(v);
              setEdit(v === 'under' ? 2 : v === 'over' ? -4 / 3 : 0);
            }}
            size="sm"
            className="[&_[role=radiogroup]]:flex-wrap"
          />
          <RangeSlider
            label="2 · Ajuste de exposición en la edición"
            value={edit}
            min={-3}
            max={3}
            step={1 / 3}
            onChange={setEdit}
            format={(v) => `${formatThirds(v)} EV`}
            hints={['Bajar luces', 'Levantar sombras']}
          />
        </div>
        <Callout kind="tip" className="mt-5" title="La latitud de edición">
          Un RAW guarda la señal lineal del sensor con 12–14 bits por canal; un JPEG guarda 8 bits ya procesados. Por eso el RAW
          aguanta <strong>2–3 pasos</strong> de corrección y recupera altas luces que el JPEG ya recortó. A cambio pesa 3–4 veces más y
          siempre necesita revelado.
        </Callout>
      </Panel>
    </div>
  );
}
