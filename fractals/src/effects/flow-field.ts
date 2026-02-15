// --- Flow Field Particles Effect ---
// Particles flowing through a Perlin-like noise vector field.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';

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
  vx: number;  // velocity for inertia
  vy: number;
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
  private particleCount = 800;  // Reduced for performance
  private flowSpeed = 0.4; // Gentle base flow
  private turbulence = 1.0;
  private noiseScale = 0.003;
  private fadeRate = 0.018; // Slower fade = longer trails, brighter overall
  private noiseOffset = 0;
  private perturbation = 0;
  private angleOffset = 0;

  private colorR = 255;
  private colorG = 255;
  private colorB = 255;
  private useWhite = false;

  // Smoothed tension (weighted average to avoid reacting too quickly)
  private smoothTension = 0;

  // Mouse interaction (subtle - need to look to notice)
  private mouseX = -1;
  private mouseY = -1;
  private mouseStrength = 60;  // force radius
  private mouseForce = 0.08;   // repulsion strength

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

  // Call this with canvas-relative mouse coordinates, or (-1,-1) when mouse leaves
  setMouse(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
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
    // Random initial velocity
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 0.5;
    return {
      x, y, px: x, py: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: Math.random() * 150 + 80
    };
  }

  update(dt: number, music: MusicParams): void {
    // Ensure particles exist (handles cases where effect wasn't properly initialized)
    if (this.particles.length === 0 && this.width > 0 && this.height > 0) {
      this.spawnParticles();
    }

    // Music mapping
    this.noiseOffset += dt * 0.1;

    // Chord root → angle offset
    this.angleOffset = (music.chordRoot / 12) * Math.PI * 2;

    // Smooth tension with weighted average (time constant ~0.5s)
    const tensionRate = 2.0;
    this.smoothTension += (music.tension - this.smoothTension) * tensionRate * dt;

    // Tension → flow complexity (subtle, avoid clumping)
    // Low tension: smooth, laminar flow; High tension: slightly more turbulent
    this.turbulence = 0.3 + this.smoothTension * 0.4;
    // Gentle flow speed variation with tension
    this.flowSpeed = 0.4 + this.smoothTension * 0.2;
    // Subtle noise detail change
    this.noiseScale = 0.002 + this.smoothTension * 0.0005;

    // === GROOVE CURVES (rhythm driver) ===
    const beatGroove = music.beatGroove ?? 0.5;
    const barGroove = music.barGroove ?? 0.5;
    const arrival = music.beatArrival ?? 0;
    const barArrival = music.barArrival ?? 0;

    // Speed modulation with groove (breathing effect)
    // beatGroove peaks at beat, creates rhythmic pulse in flow speed
    const grooveSpeed = (beatGroove - 0.5) * 0.4 + (barGroove - 0.5) * 0.25;
    this.flowSpeed += grooveSpeed;

    // Perturbation on arrivals - creates visible "burst" on beats
    this.perturbation += arrival * 0.2 + barArrival * 0.3;

    // Note onsets add energy
    for (const voice of music.activeVoices) {
      if (voice.onset) {
        this.perturbation += 0.05 * voice.velocity;
      }
    }

    this.perturbation *= Math.exp(-3.0 * dt);

    // Color from tension (I→V interpolation based on harmonic tension)
    if (!this.useWhite) {
      const [r, g, b] = music.tensionColor;
      this.colorR = r;
      this.colorG = g;
      this.colorB = b;
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

      // Flow field target velocity
      const targetVx = Math.cos(angle) * speed;
      const targetVy = Math.sin(angle) * speed;

      // Inertia: gradually steer toward flow direction (lower = more weight/inertia)
      const steerRate = 0.06;
      p.vx += (targetVx - p.vx) * steerRate;
      p.vy += (targetVy - p.vy) * steerRate;

      // Mouse interaction: push particles away
      if (this.mouseX >= 0 && this.mouseY >= 0) {
        const dx = p.x - this.mouseX;
        const dy = p.y - this.mouseY;
        const distSq = dx * dx + dy * dy;
        const radiusSq = this.mouseStrength * this.mouseStrength;
        if (distSq < radiusSq && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const falloff = 1 - dist / this.mouseStrength;
          const force = falloff * falloff * this.mouseForce * 5;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }

      p.x += p.vx;
      p.y += p.vy;
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

    ctx.strokeStyle = `rgba(${r},${g},${b},0.6)`;
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
    return [];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return {
      particleCount: 800,
      flowSpeed: 0.4,
      noiseScale: 0.003,
      fadeRate: 0.018,
      mouseStrength: 60,
      useWhite: false,
    };
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
      case 'mouseStrength':
        this.mouseStrength = value as number;
        break;
      case 'useWhite':
        this.useWhite = value as boolean;
        break;
    }
  }
}
