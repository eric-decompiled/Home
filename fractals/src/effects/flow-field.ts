// --- Flow Field Particles Effect ---
// Particles flowing through a Perlin-like noise vector field.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { palettes } from '../fractal-engine.ts';

// Simple 2D noise (permutation-based, good enough for flow fields)
const PERM = new Uint8Array(512);
{
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  PERM.set(p);
  PERM.set(p, 256);
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad2d(hash: number, x: number, y: number): number {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

function noise2d(x: number, y: number): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);

  const aa = PERM[PERM[xi] + yi];
  const ab = PERM[PERM[xi] + yi + 1];
  const ba = PERM[PERM[xi + 1] + yi];
  const bb = PERM[PERM[xi + 1] + yi + 1];

  return lerp(
    lerp(grad2d(aa, xf, yf), grad2d(ba, xf - 1, yf), u),
    lerp(grad2d(ab, xf, yf - 1), grad2d(bb, xf - 1, yf - 1), u),
    v
  );
}

interface FlowParticle {
  x: number;
  y: number;
  px: number;
  py: number;
  life: number;
}

export class FlowFieldEffect implements VisualEffect {
  readonly id = 'flowfield';
  readonly name = 'Flow Field';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'screen';
  readonly defaultOpacity = 0.5;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  private particles: FlowParticle[] = [];
  private particleCount = 3000;
  private flowSpeed = 2.0;
  private turbulence = 1.0;
  private noiseScale = 0.003;
  private fadeRate = 0.02;
  private noiseOffset = 0;
  private perturbation = 0;
  private angleOffset = 0;

  private colorR = 255;
  private colorG = 255;
  private colorB = 255;
  private useWhite = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  init(width: number, height: number): void {
    this.resize(width, height);
    this.spawnParticles();
    this.ready = true;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, width, height);
  }

  private spawnParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(this.newParticle());
    }
  }

  private newParticle(): FlowParticle {
    const x = Math.random() * this.width;
    const y = Math.random() * this.height;
    return { x, y, px: x, py: y, life: Math.random() * 200 + 100 };
  }

  update(dt: number, music: MusicParams): void {
    // Music mapping
    this.noiseOffset += dt * 0.1;

    // Chord root → angle offset
    this.angleOffset = (music.chordRoot / 12) * Math.PI * 2;

    // Tension → turbulence octaves
    this.turbulence = 0.5 + music.tension * 2.5;

    // Beat → field perturbation burst
    if (music.kick) this.perturbation += 0.5;
    if (music.snare) this.perturbation += 0.3;
    this.perturbation *= Math.exp(-3.0 * dt);

    // Color from palette
    if (!this.useWhite && music.paletteIndex >= 0 && music.paletteIndex < palettes.length) {
      const p = palettes[music.paletteIndex];
      const c = p.stops[p.stops.length - 2]?.color ?? [255, 255, 255];
      this.colorR = c[0];
      this.colorG = c[1];
      this.colorB = c[2];
    }

    // Step particles
    const speed = this.flowSpeed * Math.min(dt * 60, 3);
    for (const p of this.particles) {
      p.px = p.x;
      p.py = p.y;

      const nx = p.x * this.noiseScale;
      const ny = p.y * this.noiseScale;

      // Multi-octave noise for turbulence
      let angle = noise2d(nx + this.noiseOffset, ny) * Math.PI * 2;
      if (this.turbulence > 1) {
        angle += noise2d(nx * 2, ny * 2 + this.noiseOffset) * Math.PI * this.turbulence * 0.5;
      }
      angle += this.angleOffset;

      // Perturbation burst
      if (this.perturbation > 0.01) {
        angle += noise2d(nx * 4 + this.noiseOffset * 3, ny * 4) * this.perturbation * Math.PI;
      }

      p.x += Math.cos(angle) * speed;
      p.y += Math.sin(angle) * speed;
      p.life--;

      // Respawn if off-screen or dead
      if (p.life <= 0 || p.x < 0 || p.x >= this.width || p.y < 0 || p.y >= this.height) {
        const np = this.newParticle();
        p.x = np.x;
        p.y = np.y;
        p.px = np.x;
        p.py = np.y;
        p.life = np.life;
      }
    }
  }

  render(): HTMLCanvasElement {
    const ctx = this.ctx;

    // Fade existing
    ctx.fillStyle = `rgba(0,0,0,${this.fadeRate})`;
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw particle lines
    const r = this.useWhite ? 255 : this.colorR;
    const g = this.useWhite ? 255 : this.colorG;
    const b = this.useWhite ? 255 : this.colorB;

    ctx.strokeStyle = `rgba(${r},${g},${b},0.4)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const p of this.particles) {
      const dx = p.x - p.px;
      const dy = p.y - p.py;
      if (dx * dx + dy * dy < 100) {
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.stroke();

    return this.canvas;
  }

  isReady(): boolean {
    return this.ready;
  }

  dispose(): void {
    this.ready = false;
    this.particles = [];
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'particleCount', label: 'Particles', type: 'range', value: this.particleCount, min: 500, max: 8000, step: 500 },
      { key: 'flowSpeed', label: 'Speed', type: 'range', value: this.flowSpeed, min: 0.5, max: 5, step: 0.5 },
      { key: 'noiseScale', label: 'Scale', type: 'range', value: this.noiseScale, min: 0.001, max: 0.01, step: 0.001 },
      { key: 'fadeRate', label: 'Trail Fade', type: 'range', value: this.fadeRate, min: 0.005, max: 0.1, step: 0.005 },
      { key: 'useWhite', label: 'White Only', type: 'toggle', value: this.useWhite },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    switch (key) {
      case 'particleCount':
        this.particleCount = value as number;
        this.spawnParticles();
        break;
      case 'flowSpeed':
        this.flowSpeed = value as number;
        break;
      case 'noiseScale':
        this.noiseScale = value as number;
        break;
      case 'fadeRate':
        this.fadeRate = value as number;
        break;
      case 'useWhite':
        this.useWhite = value as boolean;
        break;
    }
  }
}
