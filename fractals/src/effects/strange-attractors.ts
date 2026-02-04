// --- Strange Attractors Centerpiece ---
// Dense luminous attractor structures rendered via accumulation buffer.
// Instead of sparse particles, we run many iterations per frame and
// accumulate brightness per pixel, creating a photographic-exposure look.
//
// Per-degree anchors define attractor type + parameter values.
// Different parameter regions produce visually distinct attractor shapes.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { palettes } from '../fractal-engine.ts';

type AttractorType = 'lorenz' | 'rossler' | 'halvorsen' | 'thomas';

interface AttractorAnchor {
  type: AttractorType;
  p1: number;  // primary parameter (sigma/a/a/b)
  p2: number;  // secondary parameter (rho/b/unused/unused)
  p3: number;  // tertiary parameter (beta/c/unused/unused)
}

const DEGREE_ANCHORS: Record<number, AttractorAnchor> = {
  0: { type: 'lorenz',    p1: 10, p2: 28, p3: 2.67 },     // chromatic
  1: { type: 'lorenz',    p1: 10, p2: 28, p3: 2.67 },     // I — classic butterfly
  2: { type: 'thomas',    p1: 0.208, p2: 0, p3: 0 },      // ii — smooth, organic
  3: { type: 'rossler',   p1: 0.2, p2: 0.2, p3: 5.7 },    // iii — spiral
  4: { type: 'lorenz',    p1: 14, p2: 32, p3: 3.0 },      // IV — wider butterfly
  5: { type: 'halvorsen', p1: 1.89, p2: 0, p3: 0 },       // V — 3-fold symmetry
  6: { type: 'rossler',   p1: 0.2, p2: 0.2, p3: 9.0 },    // vi — large spiral
  7: { type: 'thomas',    p1: 0.19, p2: 0, p3: 0 },       // vii — dense knot
};

// Accumulation buffer dimensions
const ACC_W = 512;
const ACC_H = 384;

export class StrangeAttractorsEffect implements VisualEffect {
  readonly id = 'attractors';
  readonly name = 'Attractors';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'source-over';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  // Accumulation buffer (float per channel per pixel for HDR)
  private accR: Float32Array;
  private accG: Float32Array;
  private accB: Float32Array;

  // Attractor state: multiple walkers for faster accumulation
  private walkers: Array<{ x: number; y: number; z: number }> = [];
  private walkerCount = 32;

  // Current parameters (interpolated)
  private currentType: AttractorType = 'lorenz';
  private currentP1 = 10;
  private currentP2 = 28;
  private currentP3 = 2.67;
  private targetP1 = 10;
  private targetP2 = 28;
  private targetP3 = 2.67;

  // View
  private viewAngleY = 0;
  private viewAngleX = 0.3;
  private rotationVelocity = 0;
  private exposure = 0.15;
  private decayRate = 0.985;  // per-frame decay of accumulation buffer
  private itersPerFrame = 2000;

  // Color
  private colorR = 100;
  private colorG = 180;
  private colorB = 255;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.accR = new Float32Array(ACC_W * ACC_H);
    this.accG = new Float32Array(ACC_W * ACC_H);
    this.accB = new Float32Array(ACC_W * ACC_H);
    this.initWalkers();
  }

  private initWalkers(): void {
    this.walkers = [];
    for (let i = 0; i < this.walkerCount; i++) {
      this.walkers.push({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2 + 25,
      });
    }
  }

  init(width: number, height: number): void {
    this.resize(width, height);
    this.ready = true;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  private step(w: { x: number; y: number; z: number }, dt: number): void {
    let dx: number, dy: number, dz: number;

    switch (this.currentType) {
      case 'lorenz':
        dx = this.currentP1 * (w.y - w.x);
        dy = w.x * (this.currentP2 - w.z) - w.y;
        dz = w.x * w.y - this.currentP3 * w.z;
        break;
      case 'rossler':
        dx = -w.y - w.z;
        dy = w.x + this.currentP1 * w.y;
        dz = this.currentP2 + w.z * (w.x - this.currentP3);
        break;
      case 'halvorsen': {
        const a = this.currentP1;
        dx = -a * w.x - 4 * w.y - 4 * w.z - w.y * w.y;
        dy = -a * w.y - 4 * w.z - 4 * w.x - w.z * w.z;
        dz = -a * w.z - 4 * w.x - 4 * w.y - w.x * w.x;
        break;
      }
      case 'thomas':
        dx = Math.sin(w.y) - this.currentP1 * w.x;
        dy = Math.sin(w.z) - this.currentP1 * w.y;
        dz = Math.sin(w.x) - this.currentP1 * w.z;
        break;
    }

    w.x += dx * dt;
    w.y += dy * dt;
    w.z += dz * dt;

    // Clamp runaway
    const mag = Math.sqrt(w.x * w.x + w.y * w.y + w.z * w.z);
    if (mag > 100 || !isFinite(mag)) {
      w.x = (Math.random() - 0.5) * 2;
      w.y = (Math.random() - 0.5) * 2;
      w.z = (Math.random() - 0.5) * 2 + 25;
    }
  }

  update(dt: number, music: MusicParams): void {
    // Degree → anchor
    const anchor = DEGREE_ANCHORS[music.chordDegree] ?? DEGREE_ANCHORS[0];
    this.currentType = anchor.type;
    this.targetP1 = anchor.p1;
    this.targetP2 = anchor.p2;
    this.targetP3 = anchor.p3;

    // Smooth parameter transition
    const snap = 1 - Math.exp(-3.0 * dt);
    this.currentP1 += (this.targetP1 - this.currentP1) * snap;
    this.currentP2 += (this.targetP2 - this.currentP2) * snap;
    this.currentP3 += (this.targetP3 - this.currentP3) * snap;

    // Beat → rotation impulse + exposure boost
    if (music.kick) {
      this.rotationVelocity += 0.2;
      this.exposure = Math.min(0.3, this.exposure + 0.05);
    }
    if (music.snare) {
      this.rotationVelocity -= 0.15;
    }
    this.rotationVelocity *= Math.exp(-1.0 * dt);
    this.viewAngleY += (0.1 + this.rotationVelocity) * dt;

    // Tension → iterations + exposure
    this.itersPerFrame = Math.round(1500 + music.tension * 2000);
    this.exposure = 0.1 + music.tension * 0.1;

    // Color from palette
    if (music.paletteIndex >= 0 && music.paletteIndex < palettes.length) {
      const p = palettes[music.paletteIndex];
      const c = p.stops[4]?.color ?? [100, 180, 255];
      this.colorR = c[0];
      this.colorG = c[1];
      this.colorB = c[2];
    }

    // Decay accumulation buffer
    const decay = this.decayRate;
    for (let i = 0; i < ACC_W * ACC_H; i++) {
      this.accR[i] *= decay;
      this.accG[i] *= decay;
      this.accB[i] *= decay;
    }

    // Run attractor iterations and accumulate
    const cosY = Math.cos(this.viewAngleY);
    const sinY = Math.sin(this.viewAngleY);
    const cosX = Math.cos(this.viewAngleX);
    const sinX = Math.sin(this.viewAngleX);

    // Scale: fit the attractor into the accumulation buffer
    // Different attractors have different spatial extents
    let viewScale: number;
    switch (this.currentType) {
      case 'lorenz': viewScale = ACC_W / 70; break;
      case 'rossler': viewScale = ACC_W / 50; break;
      case 'halvorsen': viewScale = ACC_W / 30; break;
      case 'thomas': viewScale = ACC_W / 8; break;
      default: viewScale = ACC_W / 60;
    }

    const stepSize = this.currentType === 'thomas' ? 0.02 : 0.003;
    const itersPerWalker = Math.ceil(this.itersPerFrame / this.walkerCount);

    const cr = this.colorR / 255;
    const cg = this.colorG / 255;
    const cb = this.colorB / 255;

    for (const w of this.walkers) {
      for (let i = 0; i < itersPerWalker; i++) {
        this.step(w, stepSize);

        // 3D rotation (Y then X)
        const rx1 = w.x * cosY - w.z * sinY;
        const rz1 = w.x * sinY + w.z * cosY;
        const ry1 = w.y * cosX - rz1 * sinX;

        // Project to screen
        const sx = Math.floor(ACC_W / 2 + rx1 * viewScale);
        const sy = Math.floor(ACC_H / 2 - ry1 * viewScale);

        if (sx >= 0 && sx < ACC_W && sy >= 0 && sy < ACC_H) {
          const idx = sy * ACC_W + sx;
          this.accR[idx] += this.exposure * cr;
          this.accG[idx] += this.exposure * cg;
          this.accB[idx] += this.exposure * cb;
        }
      }
    }
  }

  render(): HTMLCanvasElement {
    // Convert accumulation buffer to image
    const imageData = this.ctx.createImageData(ACC_W, ACC_H);
    const data = imageData.data;

    for (let i = 0; i < ACC_W * ACC_H; i++) {
      // Tone mapping: log-based for HDR feel
      const r = this.accR[i];
      const g = this.accG[i];
      const b = this.accB[i];

      // Log tonemap: v = log(1 + v) / log(1 + maxExpected)
      const logScale = 1 / Math.log(1 + 5);
      const tr = Math.log(1 + r) * logScale;
      const tg = Math.log(1 + g) * logScale;
      const tb = Math.log(1 + b) * logScale;

      const idx = i * 4;
      data[idx]     = Math.min(255, Math.round(tr * 255));
      data[idx + 1] = Math.min(255, Math.round(tg * 255));
      data[idx + 2] = Math.min(255, Math.round(tb * 255));
      data[idx + 3] = 255;
    }

    // Draw at accumulation resolution, then upscale
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = ACC_W;
    tempCanvas.height = ACC_H;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);

    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'medium';
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(tempCanvas, 0, 0, this.width, this.height);

    return this.canvas;
  }

  isReady(): boolean { return this.ready; }

  dispose(): void {
    this.ready = false;
    this.walkers = [];
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'decayRate', label: 'Persistence', type: 'range', value: this.decayRate, min: 0.95, max: 0.999, step: 0.005 },
      { key: 'walkerCount', label: 'Walkers', type: 'range', value: this.walkerCount, min: 8, max: 64, step: 8 },
      { key: 'viewAngleX', label: 'Tilt', type: 'range', value: this.viewAngleX, min: 0, max: 1.5, step: 0.1 },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    switch (key) {
      case 'decayRate':
        this.decayRate = value as number;
        break;
      case 'walkerCount':
        this.walkerCount = value as number;
        this.initWalkers();
        break;
      case 'viewAngleX':
        this.viewAngleX = value as number;
        break;
    }
  }
}
