import { useEffect, useMemo, useRef, useState } from 'react';
import { Pipette, Sun, Wand2 } from 'lucide-react';
import { colorCast, formatKelvin, kelvinToCss, miredShift } from '../../engine';
import { Badge, Button, Panel, RangeSlider, Segmented, Stat } from '../../components/ui';
import { renderStillLife, toSrgb } from './stillLife';
import type { LinearImage } from './stillLife';

const W = 640;
const H = 400;

const ILLUMINANTS = [
  { value: '1900', label: 'Vela', k: 1900 },
  { value: '3200', label: 'Tungsteno', k: 3200 },
  { value: '4000', label: 'Fluorescente', k: 4000 },
  { value: '5500', label: 'Sol', k: 5500 },
  { value: '6500', label: 'Nublado', k: 6500 },
  { value: '7500', label: 'Sombra', k: 7500 },
] as const;

type IlluminantValue = (typeof ILLUMINANTS)[number]['value'];

const CAMERA_PRESETS = [
  { label: 'Tungsteno', k: 3200 },
  { label: 'Fluorescente', k: 4000 },
  { label: 'Luz día', k: 5500 },
  { label: 'Nublado', k: 6500 },
  { label: 'Sombra', k: 7500 },
];

/** El balance automático corrige bien entre ~3500 y 7000 K y se queda corto fuera de ese rango. */
function autoWhiteBalance(sceneK: number): number {
  if (sceneK < 3500) return sceneK + (3500 - sceneK) * 0.45;
  if (sceneK > 7000) return sceneK - (sceneK - 7000) * 0.4;
  return sceneK;
}

export function drawLinear(canvas: HTMLCanvasElement, img: LinearImage, map: (r: number, g: number, b: number, out: Float32Array) => void) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  if (canvas.width !== img.width) canvas.width = img.width;
  if (canvas.height !== img.height) canvas.height = img.height;
  const out = ctx.createImageData(img.width, img.height);
  const px = new Float32Array(3);
  const src = img.data;
  const dst = out.data;
  for (let i = 0, j = 0; i < src.length; i += 3, j += 4) {
    map(src[i]!, src[i + 1]!, src[i + 2]!, px);
    dst[j] = Math.round(Math.min(1, Math.max(0, toSrgb(Math.max(0, px[0]!)))) * 255);
    dst[j + 1] = Math.round(Math.min(1, Math.max(0, toSrgb(Math.max(0, px[1]!)))) * 255);
    dst[j + 2] = Math.round(Math.min(1, Math.max(0, toSrgb(Math.max(0, px[2]!)))) * 255);
    dst[j + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
}

export function WhiteBalanceDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const image = useMemo(() => renderStillLife(W, H), []);
  const [scene, setScene] = useState<IlluminantValue>('3200');
  const [cameraK, setCameraK] = useState(5500);
  const sceneK = Number(scene);
  const cast = useMemo(() => colorCast(sceneK, cameraK), [sceneK, cameraK]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const [r, g, b] = cast;
    drawLinear(c, image, (R, G, B, out) => {
      out[0] = R * r * 0.72;
      out[1] = G * g * 0.72;
      out[2] = B * b * 0.72;
    });
  }, [image, cast]);

  const warmth = cast[0] - cast[2];
  const verdict = Math.abs(warmth) < 0.08 ? 'Neutra' : warmth > 0 ? 'Cálida (naranja)' : 'Fría (azul)';
  const tone = Math.abs(warmth) < 0.08 ? 'data' : 'amber';

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <div className="relative overflow-hidden rounded-lg border border-line bg-ink">
          <canvas
            ref={canvasRef}
            className="block h-auto w-full"
            role="img"
            aria-label={`Bodegón iluminado con luz de ${formatKelvin(sceneK)} y la cámara ajustada a ${formatKelvin(cameraK)}. Dominante: ${verdict}.`}
          />
          <div className="osd pointer-events-none absolute left-3 top-3 flex gap-2 text-[11px]">
            <span className="rounded-xs bg-ink/75 px-2 py-1 text-fg">Luz real {formatKelvin(sceneK)}</span>
            <span className="rounded-xs bg-ink/75 px-2 py-1 text-amber">WB cámara {formatKelvin(cameraK)}</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Stat label="Dominante" value={verdict} tone={tone} />
          <Stat label="Corrección" value={`${Math.round(miredShift(sceneK, cameraK))} mired`} hint="Diferencia perceptual" />
          <Stat label="Canal R / B" value={`${cast[0].toFixed(2)} / ${cast[2].toFixed(2)}`} />
        </div>
      </div>

      <Panel eyebrow="Laboratorio" title="Balance de blancos en Kelvin">
        <div className="flex flex-col gap-5">
          <Segmented
            label="Luz que ilumina la escena"
            options={ILLUMINANTS.map((i) => ({ value: i.value, label: i.label }))}
            value={scene}
            onChange={setScene}
            size="sm"
            className="[&_[role=radiogroup]]:flex-wrap"
          />
          <RangeSlider
            label="Ajuste de la cámara"
            icon={<Sun size={14} aria-hidden="true" />}
            value={cameraK}
            min={2000}
            max={10000}
            log
            step={50}
            onChange={setCameraK}
            format={formatKelvin}
            hints={['Imagen más fría', 'Imagen más cálida']}
            trackBackground={`linear-gradient(90deg, ${kelvinToCss(10000)}, #ffffff, ${kelvinToCss(2200)})`}
          />
          <div className="flex flex-wrap gap-2">
            {CAMERA_PRESETS.map((p) => (
              <Button key={p.k} size="sm" variant={cameraK === p.k ? 'primary' : 'secondary'} onClick={() => setCameraK(p.k)}>
                {p.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button icon={<Wand2 size={15} aria-hidden="true" />} onClick={() => setCameraK(Math.round(autoWhiteBalance(sceneK) / 50) * 50)}>
              Automático (AWB)
            </Button>
            <Button variant="primary" icon={<Pipette size={15} aria-hidden="true" />} onClick={() => setCameraK(sceneK)}>
              Medir con carta gris
            </Button>
          </div>
          <p className="text-[13px] leading-relaxed text-muted">
            El número en Kelvin le dice a la cámara <strong className="text-fg">de qué color es la luz</strong> para neutralizarla. Si le dices
            que la luz es más cálida de lo que es (un número menor), la cámara añade azul. Si le dices que es más fría, añade naranja.
            Prueba la vela con el automático: el AWB deja parte de la calidez a propósito.
          </p>
          <div className="flex items-center gap-2">
            <Badge tone="info">RAW</Badge>
            <span className="text-xs text-faint">En RAW el balance se puede cambiar después sin pérdida; en JPEG queda grabado.</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}
