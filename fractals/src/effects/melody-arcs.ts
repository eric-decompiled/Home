// --- Melody Arcs Effect ---
// Clock-face melody visualization: 12 pitch-class dots around the edge,
// a glowing light that travels between positions on note onsets,
// and a fading ribbon trail connecting recent melody positions.
//
// Key note sits at 12 o'clock. In-key dots are brighter and larger.
// Uses screen blend for luminous overlay.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { palettes } from '../fractal-engine.ts';

const MAJOR_OFFSETS = new Set([0, 2, 4, 5, 7, 9, 11]);
const MINOR_OFFSETS = new Set([0, 2, 3, 5, 7, 8, 10]);

type RGB = [number, number, number];

interface TrailPoint {
  x: number;  // unit circle coords
  y: number;
  r: number;
  g: number;
  b: number;
  age: number;
}

// Precompute a sampled color from each of the 12 palettes at a given brightness
function samplePaletteColor(paletteIdx: number, pos: number): RGB {
  const p = palettes[paletteIdx % palettes.length];
  const stops = p.stops;
  let s0 = stops[0], s1 = stops[stops.length - 1];
  for (let j = 0; j < stops.length - 1; j++) {
    if (pos >= stops[j].pos && pos <= stops[j + 1].pos) {
      s0 = stops[j];
      s1 = stops[j + 1];
      break;
    }
  }
  const range = s1.pos - s0.pos;
  const f = range === 0 ? 0 : (pos - s0.pos) / range;
  return [
    Math.round(s0.color[0] + (s1.color[0] - s0.color[0]) * f),
    Math.round(s0.color[1] + (s1.color[1] - s0.color[1]) * f),
    Math.round(s0.color[2] + (s1.color[2] - s0.color[2]) * f),
  ];
}

export class MelodyArcsEffect implements VisualEffect {
  readonly id = 'melody';
  readonly name = 'Melody';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'screen';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  // Clock dot colors (sampled at 0.65 brightness)
  private dotColors: RGB[] = [];
  // Melody light color (sampled at 0.85 brightness)
  private lightR = 100;
  private lightG = 200;
  private lightB = 255;

  // Light position (unit circle, key at top)
  private lightX = 0;
  private lightY = -1;
  private targetX = 0;
  private targetY = -1;
  private strength = 0;
  private lastPitchClass = -1;

  // Trail
  private trailMax = 120;
  private trail: TrailPoint[] = [];

  // Key info
  private key = 0;
  private diatonicOffsets: Set<number> = MAJOR_OFFSETS;

  // Config
  private trailLength = 120;
  private dotSize = 1.0;
  private glowSize = 1.0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.buildDotColors();
  }

  private buildDotColors(): void {
    this.dotColors = [];
    for (let i = 0; i < 12; i++) {
      this.dotColors.push(samplePaletteColor(i, 0.65));
    }
  }

  init(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ready = true;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  update(dt: number, music: MusicParams): void {
    this.key = music.key;
    this.diatonicOffsets = music.keyMode === 'minor' ? MINOR_OFFSETS : MAJOR_OFFSETS;
    this.trailMax = this.trailLength;

    const pc = music.melodyPitchClass;
    const vel = music.melodyVelocity;

    // New note onset
    if (music.melodyOnset && pc >= 0 && vel > 0 && pc !== this.lastPitchClass) {
      // Sample color from the note's palette at bright end
      const c = samplePaletteColor(pc, 0.85);
      this.lightR = c[0];
      this.lightG = c[1];
      this.lightB = c[2];

      // Target position on clock face
      const semitones = ((pc - this.key + 12) % 12);
      const angle = (semitones / 12) * Math.PI * 2;
      this.targetX = Math.sin(angle);
      this.targetY = -Math.cos(angle);

      this.strength = Math.min(1.0, vel * 0.9);
      this.lastPitchClass = pc;
    }

    // Move light toward target
    const snap = 1 - Math.exp(-10.0 * dt);
    this.lightX += (this.targetX - this.lightX) * snap;
    this.lightY += (this.targetY - this.lightY) * snap;

    // Decay strength
    this.strength *= Math.exp(-4.0 * dt);
    if (this.strength < 0.05) {
      this.strength = 0;
      this.lastPitchClass = -1;
    }

    // Push trail point
    this.trail.unshift({
      x: this.lightX,
      y: this.lightY,
      r: this.lightR,
      g: this.lightG,
      b: this.lightB,
      age: 0,
    });
    for (let i = 0; i < this.trail.length; i++) this.trail[i].age++;
    while (this.trail.length > this.trailMax) this.trail.pop();
  }

  render(): HTMLCanvasElement {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const edgeR = Math.min(cx, cy) * 0.85;
    const baseDotR = Math.max(2, Math.min(cx, cy) * 0.012) * this.dotSize;

    // --- Clock dots ---
    for (let i = 0; i < 12; i++) {
      const pc = (this.key + i) % 12;
      const inKey = this.diatonicOffsets.has(i);
      const angle = (i / 12) * Math.PI * 2;
      const dx = cx + Math.sin(angle) * edgeR;
      const dy = cy - Math.cos(angle) * edgeR;
      const [cr, cg, cb] = this.dotColors[pc];
      const dotR = inKey ? baseDotR * 1.15 : baseDotR * 0.85;
      const alpha = inKey ? 0.6 : 0.3;

      // Outer glow for in-key dots
      if (inKey) {
        const grad = ctx.createRadialGradient(dx, dy, 0, dx, dy, dotR * 3);
        grad.addColorStop(0, `rgba(${cr},${cg},${cb},${(alpha * 0.3).toFixed(3)})`);
        grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(dx - dotR * 3, dy - dotR * 3, dotR * 6, dotR * 6);
      }

      ctx.beginPath();
      ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      ctx.fill();
    }

    // --- Melody trail ---
    if (this.trail.length > 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.lineCap = 'round';

      const glow = this.glowSize;

      // Outer glow pass
      for (let i = 1; i < this.trail.length; i++) {
        const prev = this.trail[i - 1];
        const cur = this.trail[i];
        const fade = 1 - cur.age / this.trailMax;
        if (fade <= 0) continue;
        ctx.beginPath();
        ctx.moveTo(cx + prev.x * edgeR, cy + prev.y * edgeR);
        ctx.lineTo(cx + cur.x * edgeR, cy + cur.y * edgeR);
        ctx.strokeStyle = `rgba(${cur.r},${cur.g},${cur.b},${(fade * 0.10).toFixed(3)})`;
        ctx.lineWidth = (6 + fade * 8) * glow;
        ctx.stroke();
      }

      // Bright core pass
      for (let i = 1; i < this.trail.length; i++) {
        const prev = this.trail[i - 1];
        const cur = this.trail[i];
        const fade = 1 - cur.age / this.trailMax;
        if (fade <= 0) continue;
        ctx.beginPath();
        ctx.moveTo(cx + prev.x * edgeR, cy + prev.y * edgeR);
        ctx.lineTo(cx + cur.x * edgeR, cy + cur.y * edgeR);
        const wt = fade * fade;
        const wr = Math.round(cur.r + (255 - cur.r) * wt * 0.5);
        const wg = Math.round(cur.g + (255 - cur.g) * wt * 0.5);
        const wb = Math.round(cur.b + (255 - cur.b) * wt * 0.5);
        ctx.strokeStyle = `rgba(${wr},${wg},${wb},${(fade * 0.6).toFixed(3)})`;
        ctx.lineWidth = (1.5 + fade * 3) * glow;
        ctx.stroke();
      }

      ctx.restore();
    }

    // --- Active note glow at current light position ---
    if (this.strength > 0.02) {
      const sx = cx + this.lightX * edgeR;
      const sy = cy + this.lightY * edgeR;
      const glowR = 12 * this.glowSize * (0.5 + this.strength * 0.5);

      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
      grad.addColorStop(0, `rgba(255,255,255,${(this.strength * 0.8).toFixed(3)})`);
      grad.addColorStop(0.4, `rgba(${this.lightR},${this.lightG},${this.lightB},${(this.strength * 0.5).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${this.lightR},${this.lightG},${this.lightB},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(sx - glowR, sy - glowR, glowR * 2, glowR * 2);
    }

    return this.canvas;
  }

  isReady(): boolean { return this.ready; }

  dispose(): void {
    this.ready = false;
    this.trail = [];
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'trailLength', label: 'Trail', type: 'range', value: this.trailLength, min: 20, max: 200, step: 10 },
      { key: 'dotSize', label: 'Dot Size', type: 'range', value: this.dotSize, min: 0.5, max: 2.0, step: 0.1 },
      { key: 'glowSize', label: 'Glow', type: 'range', value: this.glowSize, min: 0.3, max: 2.0, step: 0.1 },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'trailLength') this.trailLength = value as number;
    if (key === 'dotSize') this.dotSize = value as number;
    if (key === 'glowSize') this.glowSize = value as number;
  }
}
