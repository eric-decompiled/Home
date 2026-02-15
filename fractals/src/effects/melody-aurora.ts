// --- Melody Aurora Effect ---
// Undulating ribbon waves flow across the screen like aurora borealis.
// Melody pitch controls vertical position and wave shape.
// Each note onset spawns a new ribbon that drifts and fades.
// Creates layered, flowing curtains of light.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { samplePaletteColor } from './effect-utils.ts';

interface Ribbon {
  y: number;
  freq: number;
  amplitude: number;
  speed: number;
  phase: number;
  r: number;
  g: number;
  b: number;
  life: number;
  thickness: number;
}

export class MelodyAuroraEffect implements VisualEffect {
  readonly id = 'melody-aurora';
  readonly name = 'Aurora';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'screen';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  private ribbons: Ribbon[] = [];
  private maxRibbons = 12;
  private fadeSpeed = 0.15;
  private intensity = 1.0;
  private waveScale = 1.0;
  private lastPitchClass = -1;
  private time = 0;

  // Ambient ribbons that persist even without melody
  private ambientPhase = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
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
    this.time += dt;
    this.ambientPhase += dt * 0.3;

    // Spawn ribbon on melody onset
    if (music.melodyOnset && music.melodyPitchClass >= 0 && music.melodyVelocity > 0) {
      const pc = music.melodyPitchClass;
      if (pc !== this.lastPitchClass || this.ribbons.length === 0) {
        const semitones = ((pc - music.key + 12) % 12);
        // Higher pitch = higher on screen
        const yPos = 0.8 - (semitones / 12) * 0.6;
        const c = samplePaletteColor(pc, 0.75);

        this.ribbons.push({
          y: yPos,
          freq: 1.5 + (semitones % 7) * 0.4,
          amplitude: 0.02 + music.melodyVelocity * 0.04,
          speed: 0.3 + Math.random() * 0.4,
          phase: this.time * 2 + Math.random() * Math.PI * 2,
          r: c[0],
          g: c[1],
          b: c[2],
          life: 1.0,
          thickness: 20 + music.melodyVelocity * 30,
        });

        // Trim old ribbons
        while (this.ribbons.length > this.maxRibbons) {
          this.ribbons.shift();
        }
        this.lastPitchClass = pc;
      }
    }

    // === GROOVE CURVES ===
    const beatArrival = music.beatArrival ?? 0;
    const beatAnticipation = music.beatAnticipation ?? 0;

    // Beat pulses - use arrival for impact
    if (music.kick) {
      for (const r of this.ribbons) {
        r.amplitude = Math.min(0.08, r.amplitude + 0.015);
      }
    }

    // Groove-driven amplitude boost
    if (beatArrival > 0.1) {
      for (const r of this.ribbons) {
        r.amplitude = Math.min(0.08, r.amplitude + beatArrival * 0.012);
      }
    }

    // Anticipation gently increases wave speed (building tension)
    for (const r of this.ribbons) {
      r.speed += beatAnticipation * 0.05;
      r.speed = Math.min(r.speed, 1.0); // cap
    }

    // Fade ribbons
    for (let i = this.ribbons.length - 1; i >= 0; i--) {
      this.ribbons[i].life -= this.fadeSpeed * dt;
      this.ribbons[i].phase += this.ribbons[i].speed * dt;
      if (this.ribbons[i].life <= 0) {
        this.ribbons.splice(i, 1);
      }
    }
  }

  render(): HTMLCanvasElement {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    // Ambient base aurora (always visible, subtle)
    this.renderRibbonCurtain(ctx, w, h, {
      y: 0.5,
      freq: 1.2,
      amplitude: 0.03,
      speed: 0,
      phase: this.ambientPhase,
      r: 40, g: 80, b: 120,
      life: 0.15,
      thickness: 40,
    });

    // Active ribbons
    for (const ribbon of this.ribbons) {
      this.renderRibbonCurtain(ctx, w, h, ribbon);
    }

    return this.canvas;
  }

  private renderRibbonCurtain(
    ctx: CanvasRenderingContext2D,
    w: number, h: number,
    ribbon: Ribbon
  ): void {
    const steps = 80;
    const stepW = w / steps;
    const alpha = ribbon.life * this.intensity;
    if (alpha <= 0.005) return;

    const amp = ribbon.amplitude * h * this.waveScale;
    const centerY = ribbon.y * h;
    const thick = ribbon.thickness * ribbon.life;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Draw multiple passes for glow effect
    for (let pass = 0; pass < 3; pass++) {
      const passAlpha = alpha * (pass === 0 ? 0.06 : pass === 1 ? 0.12 : 0.25);
      const passThick = thick * (pass === 0 ? 3.0 : pass === 1 ? 1.8 : 0.8);

      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const x = i * stepW;
        const t = (i / steps) * Math.PI * 2 * ribbon.freq + ribbon.phase;
        // Layered sine waves for organic shape
        const wave = Math.sin(t) * 0.6
                   + Math.sin(t * 1.7 + 1.3) * 0.25
                   + Math.sin(t * 0.5 - 0.7) * 0.15;
        const y = centerY + wave * amp;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      const wr = Math.min(255, ribbon.r + (255 - ribbon.r) * (pass === 2 ? 0.3 : 0));
      const wg = Math.min(255, ribbon.g + (255 - ribbon.g) * (pass === 2 ? 0.3 : 0));
      const wb = Math.min(255, ribbon.b + (255 - ribbon.b) * (pass === 2 ? 0.3 : 0));

      ctx.strokeStyle = `rgba(${wr},${wg},${wb},${passAlpha.toFixed(3)})`;
      ctx.lineWidth = passThick;
      ctx.stroke();
    }

    ctx.restore();
  }

  isReady(): boolean { return this.ready; }

  dispose(): void {
    this.ready = false;
    this.ribbons = [];
  }

  getConfig(): EffectConfig[] {
    return [];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return { maxRibbons: 12, fadeSpeed: 0.15, waveScale: 1.0, intensity: 1.0 };
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'maxRibbons') this.maxRibbons = value as number;
    if (key === 'fadeSpeed') this.fadeSpeed = value as number;
    if (key === 'waveScale') this.waveScale = value as number;
    if (key === 'intensity') this.intensity = value as number;
  }
}
