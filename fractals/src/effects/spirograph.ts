// --- Spirograph / Harmonograph Centerpiece ---
// Hypotrochoid parametric curves: the classic spirograph.
// x = (R-r)*cos(t) + d*cos((R-r)/r * t)
// y = (R-r)*sin(t) + d*sin((R-r)/r * t)
//
// The ratio R/r determines the number of petals/loops.
// Musical intervals map naturally: simple ratios = simple curves,
// complex ratios = intricate patterns.
//
// Per-degree anchors define (R, r, d) ratios for each harmonic function.
// The curve is drawn incrementally with a glowing trail.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { palettes } from '../fractal-engine.ts';
import { gsap } from '../animation.ts';

interface SpiroAnchor {
  R: number;   // outer radius
  r: number;   // inner radius
  d: number;   // pen offset from inner circle center
  layers: number; // number of overlaid curves with slight offsets
}

// Degree anchors: R/r ratio determines visual complexity
// Simple ratios (I=2/1) = simple curves, complex (vii) = intricate
const DEGREE_ANCHORS: Record<number, SpiroAnchor> = {
  0: { R: 5, r: 3, d: 2.5, layers: 2 },     // chromatic — 5:3 moderate
  1: { R: 3, r: 1, d: 0.8, layers: 3 },      // I — 3:1 = 3 petals, clean
  2: { R: 5, r: 2, d: 1.5, layers: 2 },      // ii — 5:2 = 5 loops
  3: { R: 7, r: 3, d: 2.0, layers: 2 },      // iii — 7:3 intricate
  4: { R: 4, r: 1, d: 0.7, layers: 3 },      // IV — 4:1 = 4 petals, stable
  5: { R: 8, r: 3, d: 2.2, layers: 2 },      // V — 8:3 complex, dominant
  6: { R: 5, r: 3, d: 1.8, layers: 2 },      // vi — 5:3 warm
  7: { R: 11, r: 4, d: 3.0, layers: 1 },     // vii — 11:4 dense, tense
};

export class SpirographEffect implements VisualEffect {
  readonly id = 'spirograph';
  readonly name = 'Spirograph';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'source-over';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private trailCanvas: HTMLCanvasElement;
  private trailCtx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  // Current drawing state
  private phase = 0;        // parametric t
  private drawSpeed = 2.0;  // radians per second
  private currentR = 3;
  private currentr = 1;
  private currentd = 0.8;
  private layers = 3;
  private fadeRate = 0.008;
  private rotation = 0;
  private rotationVelocity = 0;

  // Color
  private colorR = 100;
  private colorG = 200;
  private colorB = 255;

  // Beat pulse
  private pulseScale = 1.0;

  // Chord tracking for GSAP transitions
  private lastChordDegree = -1;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.trailCanvas = document.createElement('canvas');
    this.trailCtx = this.trailCanvas.getContext('2d')!;
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
    this.trailCanvas.width = width;
    this.trailCanvas.height = height;
    this.trailCtx.fillStyle = '#000';
    this.trailCtx.fillRect(0, 0, width, height);
  }

  private hypotrochoid(t: number, R: number, r: number, d: number, layerOffset: number): [number, number] {
    const Rr = R - r;
    const ratio = Rr / r;
    const lo = layerOffset * 0.15;
    const x = Rr * Math.cos(t + lo) + d * Math.cos(ratio * t + lo * 2);
    const y = Rr * Math.sin(t + lo) + d * Math.sin(ratio * t + lo * 2);
    return [x, y];
  }

  update(dt: number, music: MusicParams): void {
    // Degree → anchor (GSAP transition on chord change)
    const anchor = DEGREE_ANCHORS[music.chordDegree] ?? DEGREE_ANCHORS[0];
    this.layers = anchor.layers;

    // Trigger coordinated morph on chord change
    if (music.chordDegree !== this.lastChordDegree) {
      this.lastChordDegree = music.chordDegree;

      // GSAP: Coordinated shape morph over ~1 beat with elastic feel
      const beatDur = music.beatDuration || 0.5;
      gsap.to(this, {
        currentR: anchor.R,
        currentr: anchor.r,
        currentd: anchor.d,
        duration: beatDur * 1.0,
        ease: 'elastic.out(1, 0.7)',
        overwrite: true,
      });
    }

    // Beat → pulse with GSAP (beat 1 emphasis)
    const beat1Boost = music.beatIndex === 0 ? 1.3 : 1.0;
    if (music.kick) {
      const beatDur = music.beatDuration || 0.5;
      const pulseAmount = 1.0 + 0.15 * beat1Boost;
      gsap.to(this, {
        pulseScale: pulseAmount,
        duration: beatDur * 0.1,
        ease: 'power2.out',
        onComplete: () => {
          gsap.to(this, { pulseScale: 1.0, duration: beatDur * 0.4, ease: 'power2.out' });
        }
      });
    }
    if (music.snare && !music.kick) {
      const beatDur = music.beatDuration || 0.5;
      const pulseAmount = 1.0 + 0.08 * beat1Boost;
      gsap.to(this, {
        pulseScale: pulseAmount,
        duration: beatDur * 0.1,
        ease: 'power2.out',
        onComplete: () => {
          gsap.to(this, { pulseScale: 1.0, duration: beatDur * 0.3, ease: 'power2.out' });
        }
      });
    }

    // Rotation
    if (music.kick) this.rotationVelocity += 0.1;
    if (music.snare) this.rotationVelocity -= 0.08;
    this.rotationVelocity *= Math.exp(-1.0 * dt);
    this.rotation += this.rotationVelocity * dt;

    // Tension → draw speed
    this.drawSpeed = 1.5 + music.tension * 3.0;

    // Color from palette
    if (music.paletteIndex >= 0 && music.paletteIndex < palettes.length) {
      const p = palettes[music.paletteIndex];
      const c = p.stops[4]?.color ?? [100, 200, 255];
      this.colorR = c[0];
      this.colorG = c[1];
      this.colorB = c[2];
    }

    // Advance parametric phase
    this.phase += this.drawSpeed * dt;
  }

  render(): HTMLCanvasElement {
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(cx, cy) * 0.35 * this.pulseScale;

    // Fade trail
    this.trailCtx.fillStyle = `rgba(0,0,0,${this.fadeRate})`;
    this.trailCtx.fillRect(0, 0, w, h);

    // Draw new segment of the curve
    const stepsPerFrame = 200;
    const dt = this.drawSpeed / 60 / stepsPerFrame;

    this.trailCtx.save();
    this.trailCtx.translate(cx, cy);
    this.trailCtx.rotate(this.rotation);

    for (let layer = 0; layer < this.layers; layer++) {
      const layerAlpha = 0.5 - layer * 0.1;
      const layerWidth = 2.0 - layer * 0.3;

      // Color variation per layer
      const hueShift = layer * 30;
      const r = Math.min(255, this.colorR + hueShift);
      const g = Math.min(255, this.colorG - hueShift * 0.5);
      const b = this.colorB;

      this.trailCtx.strokeStyle = `rgba(${r},${g},${b},${layerAlpha.toFixed(2)})`;
      this.trailCtx.lineWidth = layerWidth;
      this.trailCtx.beginPath();

      let t = this.phase - stepsPerFrame * dt;
      const [sx, sy] = this.hypotrochoid(t, this.currentR, this.currentr, this.currentd, layer);
      this.trailCtx.moveTo(sx * scale, sy * scale);

      for (let i = 0; i < stepsPerFrame; i++) {
        t += dt;
        const [px, py] = this.hypotrochoid(t, this.currentR, this.currentr, this.currentd, layer);
        this.trailCtx.lineTo(px * scale, py * scale);
      }
      this.trailCtx.stroke();
    }

    this.trailCtx.restore();

    // Draw glowing dot at current position
    const [dotX, dotY] = this.hypotrochoid(this.phase, this.currentR, this.currentr, this.currentd, 0);
    const cosR = Math.cos(this.rotation);
    const sinR = Math.sin(this.rotation);
    const rdx = dotX * cosR - dotY * sinR;
    const rdy = dotX * sinR + dotY * cosR;
    const screenX = cx + rdx * scale;
    const screenY = cy + rdy * scale;

    const grad = this.trailCtx.createRadialGradient(screenX, screenY, 0, screenX, screenY, 8);
    grad.addColorStop(0, `rgba(255,255,255,0.8)`);
    grad.addColorStop(0.5, `rgba(${this.colorR},${this.colorG},${this.colorB},0.4)`);
    grad.addColorStop(1, `rgba(${this.colorR},${this.colorG},${this.colorB},0)`);
    this.trailCtx.fillStyle = grad;
    this.trailCtx.fillRect(screenX - 8, screenY - 8, 16, 16);

    // Copy to output
    this.ctx.drawImage(this.trailCanvas, 0, 0);

    return this.canvas;
  }

  isReady(): boolean { return this.ready; }

  dispose(): void {
    this.ready = false;
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'fadeRate', label: 'Trail Fade', type: 'range', value: this.fadeRate, min: 0.002, max: 0.05, step: 0.002 },
      { key: 'drawSpeed', label: 'Speed', type: 'range', value: this.drawSpeed, min: 0.5, max: 6, step: 0.5 },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'fadeRate') this.fadeRate = value as number;
    if (key === 'drawSpeed') this.drawSpeed = value as number;
  }
}
