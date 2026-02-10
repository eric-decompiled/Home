// --- Star Field Background Effect ---
// Subtle twinkling stars that shimmer based on musical tension.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';

interface Star {
  x: number;
  y: number;
  baseSize: number;
  baseBrightness: number;
  twinklePhase: number;    // Random phase offset for variety
  twinkleSpeed: number;    // How fast this star twinkles
  shimmer: number;         // Current shimmer intensity (0-1)
}

export class StarFieldEffect implements VisualEffect {
  readonly id = 'starfield';
  readonly name = 'Star Field';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'screen';
  readonly defaultOpacity = 0.6;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  private stars: Star[] = [];
  private starCount = 500;
  private time = 0;

  // Music-driven state
  private tension = 0;
  private smoothTension = 0;
  private colorR = 180;
  private colorG = 200;
  private colorB = 255;

  // Config
  private density = 1.0;        // Star density multiplier
  private twinkleAmount = 0.25; // Base twinkle intensity (subtle)
  private shimmerSpeed = 1.5;   // How fast shimmer responds

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  init(width: number, height: number): void {
    this.resize(width, height);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.spawnStars();
    this.ready = true;
  }

  private spawnStars(): void {
    const count = Math.floor(this.starCount * this.density);
    this.stars = [];

    for (let i = 0; i < count; i++) {
      // Size distribution: mostly tiny, few large (cubic power curve)
      const sizeRand = Math.random();
      const baseSize = 0.2 + sizeRand * sizeRand * sizeRand * 2.0; // 0.2-2.2, heavily biased toward tiny
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        baseSize,
        baseBrightness: 0.2 + Math.random() * 0.5,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 2,
        shimmer: 0,
      });
    }
  }

  update(_dt: number, music: MusicParams): void {
    const dt = Math.min(music.dt, 0.1);
    this.time += dt;

    // Smooth tension for gradual shimmer changes
    this.tension = music.tension ?? 0;
    const rate = this.shimmerSpeed;
    this.smoothTension += (this.tension - this.smoothTension) * rate * dt;

    // Get tension color
    if (music.tensionColor) {
      this.colorR = music.tensionColor[0];
      this.colorG = music.tensionColor[1];
      this.colorB = music.tensionColor[2];
    }

    // Update star shimmer based on tension threshold
    // Higher tension = more random stars get selected to shimmer
    for (const star of this.stars) {
      // Random threshold per star (using twinklePhase as random seed, normalized to 0-1)
      const threshold = (star.twinklePhase / (Math.PI * 2));

      if (this.smoothTension > threshold) {
        // This star should shimmer
        const intensity = (this.smoothTension - threshold) / (1 - threshold + 0.01);
        const targetShimmer = Math.min(1, intensity * this.twinkleAmount);
        star.shimmer += (targetShimmer - star.shimmer) * 4 * dt;
      } else {
        // Fade shimmer
        star.shimmer *= Math.exp(-3 * dt);
      }
    }
  }

  render(): HTMLCanvasElement {
    const ctx = this.ctx;

    // Clear to black
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw each star
    const tensionSpeedMult = 1 + this.smoothTension * 1.5; // Tension speeds up twinkle

    for (const star of this.stars) {
      // Base twinkle (subtle, always present) - faster during high tension
      const twinkleTime = this.time * star.twinkleSpeed * tensionSpeedMult;
      const baseTwinkle = Math.sin(twinkleTime + star.twinklePhase);
      const twinkleFactor = 0.7 + 0.3 * baseTwinkle; // 0.7-1.0 range

      // Shimmer boost from tension (more subtle)
      const shimmerBoost = star.shimmer * (0.3 + 0.3 * Math.sin(this.time * 6 * tensionSpeedMult + star.twinklePhase));

      // Final brightness
      const brightness = star.baseBrightness * twinkleFactor + shimmerBoost * 0.5;
      const alpha = Math.min(1, brightness);

      // Size grows very slightly when shimmering
      const size = star.baseSize * (1 + shimmerBoost * 0.2);

      // Color: all stars tinted by tension color, more so when shimmering
      const baseTint = this.smoothTension * 0.4; // Subtle base tint from tension
      const shimmerTint = star.shimmer * 0.6;    // Extra tint when shimmering
      const colorBlend = Math.min(1, baseTint + shimmerTint);
      const r = Math.round(255 * (1 - colorBlend) + this.colorR * colorBlend);
      const g = Math.round(255 * (1 - colorBlend) + this.colorG * colorBlend);
      const b = Math.round(255 * (1 - colorBlend) + this.colorB * colorBlend);

      // Draw star as a small filled circle with subtle glow
      if (shimmerBoost > 0.15) {
        // Subtle glow for shimmering stars
        ctx.beginPath();
        ctx.arc(star.x, star.y, size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.08})`;
        ctx.fill();
      }

      // Core
      ctx.beginPath();
      ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.fill();
    }

    return this.canvas;
  }

  isReady(): boolean {
    return this.ready;
  }

  dispose(): void {
    this.ready = false;
    this.stars = [];
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'density', label: 'Density', type: 'range', value: this.density, min: 0.3, max: 2, step: 0.1 },
      { key: 'twinkleAmount', label: 'Shimmer', type: 'range', value: this.twinkleAmount, min: 0.1, max: 1, step: 0.1 },
      { key: 'shimmerSpeed', label: 'Response', type: 'range', value: this.shimmerSpeed, min: 0.5, max: 5, step: 0.5 },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    switch (key) {
      case 'density':
        this.density = value as number;
        this.spawnStars();
        break;
      case 'twinkleAmount':
        this.twinkleAmount = value as number;
        break;
      case 'shimmerSpeed':
        this.shimmerSpeed = value as number;
        break;
    }
  }
}
