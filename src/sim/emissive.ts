/**
 * Búfer emisivo en luz lineal (Float32, RGB) para las fuentes puntuales: bombillas, ventanas,
 * faros, estrellas y destellos. Se rasteriza en JS con antialiasing analítico para conservar
 * todo el rango dinámico (una bombilla puede ser cientos de veces más brillante que el blanco
 * difuso) y para que los discos de bokeh y las estelas conserven su energía al crecer.
 *
 * Unidades: 1.0 equivale al blanco difuso con la exposición nominal de la escena.
 */

export interface DiscShape {
  /** 0 = diafragma circular; 1 = polígono de palas rectas. Valores intermedios redondean las esquinas. */
  polygon: number;
  blades: number;
  /** Rotación de las palas en radianes. */
  rotation: number;
  /** Desplazamiento (px) del segundo círculo que recorta el disco en "ojo de gato"; 0 lo desactiva. */
  catEyeX: number;
  catEyeY: number;
}

export const ROUND_DISC: DiscShape = { polygon: 0, blades: 9, rotation: 0, catEyeX: 0, catEyeY: 0 };

/**
 * Brillo relativo del borde del disco (aberración esférica): da el aspecto de "burbuja" del bokeh
 * real. El perfil 1 + k·(q⁶ − ¼) tiene media 1 sobre el disco, así que no altera la energía.
 */
const RIM_GAIN = 0.32;

export class EmissiveBuffer {
  w = 0;
  h = 0;
  data = new Float32Array(0);
  /** true si se agregó al menos una contribución desde el último clear(). */
  dirty = false;
  /**
   * Máscara de oclusión opcional (RGBA de las capas que están delante): la transmitancia es
   * 1 − alfa/255. Permite que el ciclista tape el bokeh de las luces que tiene detrás.
   */
  private occ: Uint8ClampedArray | null = null;

  resize(w: number, h: number): void {
    if (w === this.w && h === this.h) {
      this.clear();
      return;
    }
    this.w = w;
    this.h = h;
    this.data = new Float32Array(w * h * 3);
    this.dirty = false;
  }

  clear(): void {
    if (this.dirty) this.data.fill(0);
    this.dirty = false;
  }

  setOcclusion(mask: Uint8ClampedArray | null): void {
    this.occ = mask && mask.length === this.w * this.h * 4 ? mask : null;
  }

  /** Suma color·k en el píxel p (índice lineal), atenuado por la oclusión. */
  private add(p: number, r: number, g: number, b: number, k: number): void {
    let t = k;
    if (this.occ) {
      const a = this.occ[p * 4 + 3]!;
      if (a >= 255) return;
      t *= 1 - a / 255;
    }
    const i = p * 3;
    const d = this.data;
    d[i] = d[i]! + r * t;
    d[i + 1] = d[i + 1]! + g * t;
    d[i + 2] = d[i + 2]! + b * t;
  }

  /** Fuente menor que un píxel: reparte la energía en los 4 vecinos (bilineal). */
  point(cx: number, cy: number, r: number, g: number, b: number, energy: number): void {
    const x = cx - 0.5;
    const y = cy - 0.5;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    if (x0 < -1 || y0 < -1 || x0 >= this.w || y0 >= this.h) return;
    this.dirty = true;
    const w = this.w;
    const put = (px: number, py: number, k: number) => {
      if (k <= 0 || px < 0 || py < 0 || px >= w || py >= this.h) return;
      this.add(py * w + px, r, g, b, k);
    };
    put(x0, y0, energy * (1 - fx) * (1 - fy));
    put(x0 + 1, y0, energy * fx * (1 - fy));
    put(x0, y0 + 1, energy * (1 - fx) * fy);
    put(x0 + 1, y0 + 1, energy * fx * fy);
  }

  /**
   * Disco de bokeh de diámetro `diam` px con intensidad por píxel `intensity`.
   * La forma interpola entre círculo y polígono de palas; opcionalmente recortada en ojo de gato.
   */
  disc(cx: number, cy: number, diam: number, r: number, g: number, b: number, intensity: number, shape: DiscShape = ROUND_DISC): void {
    const R = diam / 2;
    if (diam < 1.6) {
      this.point(cx, cy, r, g, b, intensity * (Math.PI / 4) * diam * diam);
      return;
    }
    const xa = Math.max(0, Math.floor(cx - R - 1));
    const xb = Math.min(this.w - 1, Math.ceil(cx + R + 1));
    const ya = Math.max(0, Math.floor(cy - R - 1));
    const yb = Math.min(this.h - 1, Math.ceil(cy + R + 1));
    if (xa > xb || ya > yb) return;
    this.dirty = true;
    const n = Math.max(5, shape.blades);
    const sector = (Math.PI * 2) / n;
    const apothem = R * Math.cos(Math.PI / n);
    const poly = Math.min(1, Math.max(0, shape.polygon));
    const cat = shape.catEyeX !== 0 || shape.catEyeY !== 0;
    const hx = shape.catEyeX / 2;
    const hy = shape.catEyeY / 2;
    const outer2 = (R + 1) * (R + 1);
    const invR = 1 / R;
    const k0 = intensity;
    for (let py = ya; py <= yb; py++) {
      const dy = py + 0.5 - cy;
      const row = py * this.w;
      for (let px = xa; px <= xb; px++) {
        const dx = px + 0.5 - cx;
        const d2 = dx * dx + dy * dy;
        if (d2 > outer2) continue;
        const dist = Math.sqrt(d2);
        let sd = R - dist;
        if (poly > 0 && dist > apothem - 1) {
          let th = Math.atan2(dy, dx) - shape.rotation;
          th -= sector * Math.floor(th / sector);
          const sp = apothem - dist * Math.cos(th - sector / 2);
          sd = sd + (sp - sd) * poly;
        }
        if (cat) {
          const a = R - Math.hypot(dx + hx, dy + hy);
          const c = R - Math.hypot(dx - hx, dy - hy);
          sd = Math.min(sd, a, c);
        }
        const cov = sd + 0.5;
        if (cov <= 0) continue;
        const q = dist * invR;
        const q2 = q * q;
        const rim = 1 + RIM_GAIN * (q2 * q2 * q2 - 0.25);
        this.add(row + px, r, g, b, k0 * (cov >= 1 ? 1 : cov) * rim);
      }
    }
  }

  /**
   * Cápsula (segmento con extremos redondeados) de diámetro `diam`: estela de una luz en
   * movimiento. La intensidad se interpola linealmente de i0 a i1 a lo largo del recorrido.
   */
  capsule(x0: number, y0: number, x1: number, y1: number, diam: number, r: number, g: number, b: number, i0: number, i1: number): void {
    const R = Math.max(0.6, diam / 2);
    const xa = Math.max(0, Math.floor(Math.min(x0, x1) - R - 1));
    const xb = Math.min(this.w - 1, Math.ceil(Math.max(x0, x1) + R + 1));
    const ya = Math.max(0, Math.floor(Math.min(y0, y1) - R - 1));
    const yb = Math.min(this.h - 1, Math.ceil(Math.max(y0, y1) + R + 1));
    if (xa > xb || ya > yb) return;
    this.dirty = true;
    const vx = x1 - x0;
    const vy = y1 - y0;
    const len2 = vx * vx + vy * vy;
    const inv = len2 > 1e-9 ? 1 / len2 : 0;
    const di = i1 - i0;
    for (let py = ya; py <= yb; py++) {
      const cy = py + 0.5;
      const row = py * this.w;
      for (let px = xa; px <= xb; px++) {
        const cx = px + 0.5;
        let t = ((cx - x0) * vx + (cy - y0) * vy) * inv;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const ex = cx - (x0 + t * vx);
        const ey = cy - (y0 + t * vy);
        const cov = R + 0.5 - Math.sqrt(ex * ex + ey * ey);
        if (cov <= 0) continue;
        this.add(row + px, r, g, b, (i0 + di * t) * (cov >= 1 ? 1 : cov));
      }
    }
  }

  /** Polilínea de grosor `diam` y brillo uniforme (estelas curvas: arcos de estrellas). */
  polyline(pts: ArrayLike<number>, diam: number, r: number, g: number, b: number, intensity: number): void {
    const n = pts.length >> 1;
    if (n < 2) return;
    const R = Math.max(0.6, diam / 2);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = pts[i * 2]!;
      const y = pts[i * 2 + 1]!;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const xa = Math.max(0, Math.floor(minX - R - 1));
    const xb = Math.min(this.w - 1, Math.ceil(maxX + R + 1));
    const ya = Math.max(0, Math.floor(minY - R - 1));
    const yb = Math.min(this.h - 1, Math.ceil(maxY + R + 1));
    if (xa > xb || ya > yb) return;
    this.dirty = true;
    for (let py = ya; py <= yb; py++) {
      const cy = py + 0.5;
      const row = py * this.w;
      for (let px = xa; px <= xb; px++) {
        const cx = px + 0.5;
        let best = Infinity;
        for (let i = 0; i < n - 1; i++) {
          const ax = pts[i * 2]!;
          const ay = pts[i * 2 + 1]!;
          const vx = pts[i * 2 + 2]! - ax;
          const vy = pts[i * 2 + 3]! - ay;
          const l2 = vx * vx + vy * vy;
          let t = l2 > 1e-9 ? ((cx - ax) * vx + (cy - ay) * vy) / l2 : 0;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const ex = cx - (ax + t * vx);
          const ey = cy - (ay + t * vy);
          const d2 = ex * ex + ey * ey;
          if (d2 < best) best = d2;
        }
        const cov = R + 0.5 - Math.sqrt(best);
        if (cov <= 0) continue;
        this.add(row + px, r, g, b, intensity * (cov >= 1 ? 1 : cov));
      }
    }
  }

  /** Halo gaussiano (dispersión atmosférica y velo de la lente alrededor de luces intensas). */
  glow(cx: number, cy: number, sigma: number, r: number, g: number, b: number, peak: number): void {
    if (sigma < 0.5 || peak <= 0) return;
    const ext = sigma * 3;
    const xa = Math.max(0, Math.floor(cx - ext));
    const xb = Math.min(this.w - 1, Math.ceil(cx + ext));
    const ya = Math.max(0, Math.floor(cy - ext));
    const yb = Math.min(this.h - 1, Math.ceil(cy + ext));
    if (xa > xb || ya > yb) return;
    this.dirty = true;
    const k = -1 / (2 * sigma * sigma);
    const gx = new Float32Array(xb - xa + 1);
    for (let px = xa; px <= xb; px++) {
      const dx = px + 0.5 - cx;
      gx[px - xa] = Math.exp(dx * dx * k);
    }
    for (let py = ya; py <= yb; py++) {
      const dy = py + 0.5 - cy;
      const gy = Math.exp(dy * dy * k) * peak;
      if (gy < 1e-5) continue;
      const row = py * this.w;
      for (let px = xa; px <= xb; px++) {
        const v = gx[px - xa]! * gy;
        if (v < 1e-5) continue;
        this.add(row + px, r, g, b, v);
      }
    }
  }
}
