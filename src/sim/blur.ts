/**
 * Desenfoques sobre Canvas 2D.
 *
 * - Gaussiano: usa `ctx.filter = 'blur()'` cuando el navegador lo soporta de verdad (se detecta
 *   dibujando y leyendo píxeles) y, si no, un stack blur propio sobre alfa premultiplicado.
 *   Para radios grandes se trabaja a resolución reducida (el resultado es idéntico a la vista
 *   porque la imagen ya no tiene altas frecuencias) y los bordes se extienden ("clamp") para
 *   que las capas opacas no se oscurezcan en los márgenes.
 * - Direccional: caja de longitud L construida por duplicación recursiva (2^k tomas con k
 *   pasadas de dos copias), usada para el barrido de movimiento y la trepidación.
 */

export interface Surface {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export function createSurface(w = 1, h = 1, readback = false): Surface {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext('2d', readback ? { willReadFrequently: true } : { alpha: true });
  if (!ctx) throw new Error('El navegador no ofrece Canvas 2D');
  return { canvas, ctx };
}

/** Ajusta el tamaño (borra el contenido) y deja el contexto en su estado por defecto. */
export function sizeSurface(s: Surface, w: number, h: number): void {
  const W = Math.max(1, Math.round(w));
  const H = Math.max(1, Math.round(h));
  if (s.canvas.width !== W || s.canvas.height !== H) {
    s.canvas.width = W;
    s.canvas.height = H;
  } else {
    s.ctx.setTransform(1, 0, 0, 1, 0, 0);
    s.ctx.clearRect(0, 0, W, H);
  }
  resetContext(s.ctx);
}

export function resetContext(ctx: CanvasRenderingContext2D): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = true;
  // Bilineal: suficiente para reescalar imágenes ya desenfocadas y mucho más barato en CPU.
  ctx.imageSmoothingQuality = 'low';
  if ('filter' in ctx) ctx.filter = 'none';
}

export function releaseSurface(s: Surface): void {
  s.canvas.width = 1;
  s.canvas.height = 1;
}

let filterSupport: boolean | null = null;

/**
 * Comprueba si `ctx.filter = 'blur()'` funciona de verdad: algunos navegadores exponen la
 * propiedad pero la ignoran. Dibuja un punto desenfocado y mira si se esparció.
 */
export function supportsCanvasFilter(): boolean {
  if (filterSupport !== null) return filterSupport;
  filterSupport = false;
  try {
    const s = createSurface(15, 15, true);
    const ctx = s.ctx;
    if (typeof ctx.filter !== 'string') return filterSupport;
    ctx.filter = 'blur(2px)';
    ctx.fillStyle = '#fff';
    ctx.fillRect(7, 7, 1, 1);
    ctx.filter = 'none';
    const px = ctx.getImageData(4, 7, 1, 1).data;
    filterSupport = (px[3] ?? 0) > 0;
    releaseSurface(s);
  } catch {
    filterSupport = false;
  }
  return filterSupport;
}

/**
 * Stack blur (núcleo triangular de radio r, equivalente a dos cajas) separable, sobre RGBA con
 * alfa premultiplicado para que los bordes transparentes no se ensucien de negro.
 */
export function stackBlurRGBA(data: Uint8ClampedArray, w: number, h: number, radius: number): void {
  const r = Math.max(1, Math.round(radius));
  const n = w * h;
  const buf = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const a = data[i * 4 + 3]! / 255;
    buf[i * 4] = data[i * 4]! * a;
    buf[i * 4 + 1] = data[i * 4 + 1]! * a;
    buf[i * 4 + 2] = data[i * 4 + 2]! * a;
    buf[i * 4 + 3] = data[i * 4 + 3]!;
  }
  const line = new Float32Array(Math.max(w, h) * 4);
  const pass = (len: number, count: number, stride: number, lineStride: number) => {
    const div = 1 / ((r + 1) * (r + 1));
    for (let l = 0; l < count; l++) {
      const base = l * lineStride;
      for (let c = 0; c < 4; c++) {
        const at = (k: number) => buf[base + Math.min(len - 1, Math.max(0, k)) * stride + c]!;
        let sum = 0;
        let sumIn = 0;
        let sumOut = 0;
        for (let i = -r; i <= r; i++) {
          const v = at(i);
          sum += v * (r + 1 - Math.abs(i));
          if (i <= 0) sumOut += v;
          else sumIn += v;
        }
        for (let k = 0; k < len; k++) {
          line[k * 4 + c] = sum * div;
          const entering = at(k + r + 1);
          const center = at(k + 1);
          sum += sumIn + entering - sumOut;
          sumOut += center - at(k - r);
          sumIn += entering - center;
        }
      }
      for (let k = 0; k < len; k++) {
        const o = base + k * stride;
        buf[o] = line[k * 4]!;
        buf[o + 1] = line[k * 4 + 1]!;
        buf[o + 2] = line[k * 4 + 2]!;
        buf[o + 3] = line[k * 4 + 3]!;
      }
    }
  };
  pass(w, h, 4, w * 4);
  pass(h, w, w * 4, 4);
  for (let i = 0; i < n; i++) {
    const a = buf[i * 4 + 3]!;
    const inv = a > 0.01 ? 255 / a : 0;
    data[i * 4] = buf[i * 4]! * inv;
    data[i * 4 + 1] = buf[i * 4 + 1]! * inv;
    data[i * 4 + 2] = buf[i * 4 + 2]! * inv;
    data[i * 4 + 3] = a;
  }
}

/** Radio de stack blur con la misma varianza que una gaussiana de desviación sigma. */
function stackRadiusFor(sigma: number): number {
  return Math.max(1, Math.round(Math.sqrt(6 * sigma * sigma + 1) - 1));
}

/** Copia los bordes de la región [pad, pad+w)×[padY, padY+h) hacia el margen (modo clamp). */
function clampEdges(s: Surface, padX: number, padY: number, w: number, h: number): void {
  const c = s.ctx;
  const cv = s.canvas;
  const W = cv.width;
  const H = cv.height;
  c.imageSmoothingEnabled = false;
  if (padY > 0) {
    c.drawImage(cv, padX, padY, w, 1, padX, 0, w, padY);
    c.drawImage(cv, padX, padY + h - 1, w, 1, padX, padY + h, w, H - padY - h);
  }
  if (padX > 0) {
    c.drawImage(cv, padX, 0, 1, H, 0, 0, padX, H);
    c.drawImage(cv, padX + w - 1, 0, 1, H, padX + w, 0, W - padX - w, H);
  }
  c.imageSmoothingEnabled = true;
}

export class BlurKit {
  readonly nativeFilter: boolean;
  private a = createSurface();
  private b = createSurface();
  private halfA = createSurface();
  private halfB = createSurface();

  constructor() {
    this.nativeFilter = supportsCanvasFilter();
  }

  /**
   * Dibuja la región (sx, sy, sw, sh) de src reducida a (w×h) en dst, por mitades sucesivas para
   * promediar bien (sin aliasing).
   */
  private drawScaled(src: HTMLCanvasElement, sx: number, sy: number, sw: number, sh: number, dst: Surface, x: number, y: number, w: number, h: number): void {
    let cur: HTMLCanvasElement = src;
    let cx = sx;
    let cy = sy;
    let cw = sw;
    let ch = sh;
    let flip = false;
    while (cw / w > 2.2 || ch / h > 2.2) {
      const nw = Math.max(Math.ceil(w), Math.ceil(cw / 2));
      const nh = Math.max(Math.ceil(h), Math.ceil(ch / 2));
      const t = flip ? this.halfB : this.halfA;
      sizeSurface(t, nw, nh);
      t.ctx.drawImage(cur, cx, cy, cw, ch, 0, 0, nw, nh);
      cur = t.canvas;
      cx = 0;
      cy = 0;
      cw = nw;
      ch = nh;
      flip = !flip;
    }
    dst.ctx.drawImage(cur, cx, cy, cw, ch, x, y, w, h);
  }

  /**
   * Gaussiana de desviación `sigma` px sobre `src` (o sobre la región `rect` de src); el
   * resultado, del tamaño de la región, queda en `out`. `out` no puede ser el canvas `src`.
   */
  gaussian(src: HTMLCanvasElement, sigma: number, out: Surface, rect?: { x: number; y: number; w: number; h: number }): void {
    const rx = rect ? rect.x : 0;
    const ry = rect ? rect.y : 0;
    const sw = rect ? rect.w : src.width;
    const sh = rect ? rect.h : src.height;
    sizeSurface(out, sw, sh);
    if (sigma < 0.3) {
      out.ctx.drawImage(src, rx, ry, sw, sh, 0, 0, sw, sh);
      return;
    }
    // Con sigma grande se trabaja a 1/ds de resolución con una sigma residual de ~1.5 px:
    // la imagen ya no tiene detalle fino, así que el resultado es indistinguible y mucho más barato.
    const ds = sigma > 1.8 ? Math.min(sigma / 1.5, 64) : 1;
    const sig = sigma / ds;
    const lw = Math.max(1, Math.ceil(sw / ds));
    const lh = Math.max(1, Math.ceil(sh / ds));
    const pad = Math.ceil(sig * 3) + 2;
    const A = this.a;
    sizeSurface(A, lw + pad * 2, lh + pad * 2);
    if (ds === 1) A.ctx.drawImage(src, rx, ry, sw, sh, pad, pad, sw, sh);
    else this.drawScaled(src, rx, ry, sw, sh, A, pad, pad, lw, lh);
    clampEdges(A, pad, pad, lw, lh);
    let blurred: HTMLCanvasElement;
    if (this.nativeFilter) {
      const B = this.b;
      sizeSurface(B, A.canvas.width, A.canvas.height);
      B.ctx.filter = `blur(${sig.toFixed(3)}px)`;
      B.ctx.drawImage(A.canvas, 0, 0);
      B.ctx.filter = 'none';
      blurred = B.canvas;
    } else {
      const img = A.ctx.getImageData(0, 0, A.canvas.width, A.canvas.height);
      stackBlurRGBA(img.data, img.width, img.height, stackRadiusFor(sig));
      A.ctx.putImageData(img, 0, 0);
      blurred = A.canvas;
    }
    out.ctx.drawImage(blurred, pad, pad, lw, lh, 0, 0, sw, sh);
  }

  /**
   * Desenfoque de caja de `length` px en la dirección (dx, dy) normalizada, centrado.
   * Si `confineTo` se indica, el resultado se recorta con el alfa de ese canvas
   * (el agua de una cascada se "sedosea" sin salirse de su cauce).
   */
  directional(src: HTMLCanvasElement, length: number, dx: number, dy: number, out: Surface): void {
    const sw = src.width;
    const sh = src.height;
    sizeSurface(out, sw, sh);
    if (length < 0.75) {
      out.ctx.drawImage(src, 0, 0);
      return;
    }
    const norm = Math.hypot(dx, dy) || 1;
    const ux = dx / norm;
    const uy = dy / norm;
    // Para barridos largos se reduce la resolución en el eje del movimiento (o en ambos si es diagonal).
    const MAX_TAPS = 96;
    let sx = 1;
    let sy = 1;
    if (length > MAX_TAPS) {
      const s = length / MAX_TAPS;
      if (Math.abs(ux) > 0.995) sx = s;
      else if (Math.abs(uy) > 0.995) sy = s;
      else sx = sy = Math.min(s, 6);
    }
    const lx = (length * ux) / sx;
    const ly = (length * uy) / sy;
    const L = Math.hypot(lx, ly);
    const vx = L > 0 ? lx / L : 0;
    const vy = L > 0 ? ly / L : 0;
    const lw = Math.max(1, Math.ceil(sw / sx));
    const lh = Math.max(1, Math.ceil(sh / sy));
    const padX = Math.ceil((Math.abs(vx) * L) / 2) + 2;
    const padY = Math.ceil((Math.abs(vy) * L) / 2) + 2;
    let cur = this.a;
    let nxt = this.b;
    sizeSurface(cur, lw + padX * 2, lh + padY * 2);
    if (sx === 1 && sy === 1) cur.ctx.drawImage(src, padX, padY);
    else this.drawScaled(src, 0, 0, sw, sh, cur, padX, padY, lw, lh);
    clampEdges(cur, padX, padY, lw, lh);
    const k = Math.max(1, Math.ceil(Math.log2(L)));
    for (let j = 1; j <= k; j++) {
      const o = L / Math.pow(2, j + 1);
      sizeSurface(nxt, cur.canvas.width, cur.canvas.height);
      const c = nxt.ctx;
      c.globalAlpha = 0.5;
      c.drawImage(cur.canvas, -o * vx, -o * vy);
      c.globalCompositeOperation = 'lighter';
      c.drawImage(cur.canvas, o * vx, o * vy);
      resetContext(c);
      const t = cur;
      cur = nxt;
      nxt = t;
    }
    out.ctx.drawImage(cur.canvas, padX, padY, lw, lh, 0, 0, sw, sh);
  }

  dispose(): void {
    for (const s of [this.a, this.b, this.halfA, this.halfB]) releaseSurface(s);
  }
}
