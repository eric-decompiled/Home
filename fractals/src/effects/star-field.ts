// --- Star Field Background Effect ---
// Realistic starfield with nebulae, star clusters, depth parallax, and palette-informed colors.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { samplePaletteColor } from './effect-utils.ts';

interface Star {
  x: number;
  y: number;
  baseSize: number;
  baseBrightness: number;
  twinklePhase: number;
  twinkleSpeed: number;
  shimmer: number;
  // New fields
  depth: number;           // 0 = far (dim, slow), 1 = near (bright, fast parallax)
  colorPos: number;        // Position in palette (0-1) for this star's tint
  clusterId: number;       // Which cluster this star belongs to (-1 = field star)
}

interface NebulaBlob {
  offsetX: number;         // Offset from nebula center
  offsetY: number;
  radius: number;
  colorShift: number;      // Shift from base color
  opacity: number;
  rotation: number;
  aspectRatio: number;
}

interface Nebula {
  x: number;
  y: number;
  baseColorPos: number;    // Base position in palette
  blobs: NebulaBlob[];     // Multiple overlapping shapes for organic look
}

interface StarCluster {
  x: number;
  y: number;
  radius: number;
  density: number;         // Stars per unit area
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
  private nebulae: Nebula[] = [];
  private clusters: StarCluster[] = [];
  private baseStarCount = 500;
  private time = 0;

  // Music-driven state
  private tension = 0;
  private smoothTension = 0;
  private paletteIdx = 0;
  private lastPaletteIdx = -1;
  private chordRoot = 0;
  private parallaxX = 0;
  private parallaxY = 0;

  // Cached nebula canvas (expensive gradients, rarely changes)
  private nebulaCanvas: HTMLCanvasElement;
  private nebulaCtx: CanvasRenderingContext2D;
  private nebulaDirty = true;

  // Config - tuned for better defaults
  private density = 1.2;
  private twinkleAmount = 0.3;
  private shimmerSpeed = 1.5;
  private nebulaOpacity = 0.55;
  private parallaxStrength = 0.12;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.nebulaCanvas = document.createElement('canvas');
    this.nebulaCtx = this.nebulaCanvas.getContext('2d')!;
  }

  init(width: number, height: number): void {
    this.resize(width, height);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.nebulaCanvas.width = width;
    this.nebulaCanvas.height = height;
    this.spawnClusters();
    this.spawnNebulae();
    this.spawnStars();
    this.nebulaDirty = true;
    this.ready = true;
  }

  private spawnClusters(): void {
    // Create 1-2 subtle star clusters
    const clusterCount = 1 + Math.floor(Math.random() * 2);
    this.clusters = [];

    const margin = 0.2;
    for (let i = 0; i < clusterCount; i++) {
      // All loose associations - very spread out
      this.clusters.push({
        x: (margin + Math.random() * (1 - 2 * margin)) * this.width,
        y: (margin + Math.random() * (1 - 2 * margin)) * this.height,
        radius: 100 + Math.random() * 120, // Large radius = spread out
        density: 0.8 + Math.random() * 0.7, // Low density
      });
    }
  }

  private spawnNebulae(): void {
    // Create 2-4 nebulae, often near clusters
    const nebulaCount = 2 + Math.floor(Math.random() * 3);
    this.nebulae = [];

    for (let i = 0; i < nebulaCount; i++) {
      // 70% chance to spawn near a cluster
      let x: number, y: number;
      if (this.clusters.length > 0 && Math.random() < 0.7) {
        const cluster = this.clusters[Math.floor(Math.random() * this.clusters.length)];
        x = cluster.x + (Math.random() - 0.5) * cluster.radius * 1.5;
        y = cluster.y + (Math.random() - 0.5) * cluster.radius * 1.5;
      } else {
        x = Math.random() * this.width;
        y = Math.random() * this.height;
      }

      // Create organic nebula with multiple overlapping blobs
      const blobs: NebulaBlob[] = [];
      const blobCount = 3 + Math.floor(Math.random() * 4); // 3-6 blobs per nebula
      const baseRadius = 40 + Math.random() * 60; // Smaller base

      for (let b = 0; b < blobCount; b++) {
        // Blobs spread out from center with varying sizes
        const angle = (b / blobCount) * Math.PI * 2 + Math.random() * 0.8;
        const dist = baseRadius * (0.15 + Math.random() * 0.5);

        blobs.push({
          offsetX: Math.cos(angle) * dist,
          offsetY: Math.sin(angle) * dist,
          radius: baseRadius * (0.35 + Math.random() * 0.6),
          colorShift: (Math.random() - 0.5) * 0.15,
          opacity: 0.06 + Math.random() * 0.1,
          rotation: Math.random() * Math.PI * 2,
          aspectRatio: 0.35 + Math.random() * 0.6,
        });
      }

      // Add 1-2 elongated "wisps" extending outward
      const wispCount = 1 + Math.floor(Math.random() * 2);
      for (let w = 0; w < wispCount; w++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = baseRadius * (0.6 + Math.random() * 0.6);

        blobs.push({
          offsetX: Math.cos(angle) * dist,
          offsetY: Math.sin(angle) * dist,
          radius: baseRadius * (0.4 + Math.random() * 0.5),
          colorShift: (Math.random() - 0.5) * 0.2,
          opacity: 0.03 + Math.random() * 0.05,
          rotation: angle + Math.PI / 2 + (Math.random() - 0.5) * 0.5,
          aspectRatio: 0.15 + Math.random() * 0.2,
        });
      }

      this.nebulae.push({
        x,
        y,
        baseColorPos: Math.random(),
        blobs,
      });
    }
  }

  private spawnStars(): void {
    const baseCount = Math.floor(this.baseStarCount * this.density);
    this.stars = [];

    // Field stars (random distribution) - vast majority scattered
    const fieldCount = Math.floor(baseCount * 0.9);
    for (let i = 0; i < fieldCount; i++) {
      this.stars.push(this.createStar(
        Math.random() * this.width,
        Math.random() * this.height,
        -1
      ));
    }

    // Cluster stars (concentrated around cluster centers)
    const clusterStarsTotal = baseCount - fieldCount;
    const starsPerCluster = Math.floor(clusterStarsTotal / Math.max(1, this.clusters.length));

    for (let ci = 0; ci < this.clusters.length; ci++) {
      const cluster = this.clusters[ci];
      const count = Math.floor(starsPerCluster * cluster.density);

      for (let i = 0; i < count; i++) {
        // Gentle clustering - mostly uniform with slight center bias
        const u = Math.random();
        const distFrac = Math.pow(u, 0.85); // Very mild center concentration
        const dist = cluster.radius * distFrac;
        const angle = Math.random() * Math.PI * 2;
        const x = cluster.x + Math.cos(angle) * dist;
        const y = cluster.y + Math.sin(angle) * dist;

        // Wrap to canvas
        const wx = ((x % this.width) + this.width) % this.width;
        const wy = ((y % this.height) + this.height) % this.height;

        this.stars.push(this.createStar(wx, wy, ci));
      }
    }
  }

  private createStar(x: number, y: number, clusterId: number): Star {
    // Depth: biased toward far (small dim stars)
    const depthRand = Math.random();
    const depth = depthRand * depthRand; // Quadratic bias toward 0 (far)

    // Size correlates with depth (near stars larger)
    const baseSize = 0.3 + depth * 1.5 + Math.random() * 0.5;

    // Brightness correlates with depth
    const baseBrightness = 0.15 + depth * 0.5 + Math.random() * 0.2;

    // Color position varies - cluster stars tend toward similar colors
    let colorPos: number;
    if (clusterId >= 0) {
      // Cluster stars: narrow color range per cluster
      const clusterHue = (clusterId * 0.3) % 1;
      colorPos = clusterHue + (Math.random() - 0.5) * 0.15;
    } else {
      // Field stars: full range
      colorPos = Math.random();
    }

    return {
      x,
      y,
      baseSize,
      baseBrightness,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.5 + Math.random() * 2,
      shimmer: 0,
      depth,
      colorPos: ((colorPos % 1) + 1) % 1,
      clusterId,
    };
  }

  update(_dt: number, music: MusicParams): void {
    const dt = Math.min(music.dt, 0.1);
    this.time += dt;

    // Smooth tension
    this.tension = music.tension ?? 0;
    this.smoothTension += (this.tension - this.smoothTension) * this.shimmerSpeed * dt;

    // Palette from key - mark nebula dirty if changed
    this.paletteIdx = music.key ?? 0;
    if (this.paletteIdx !== this.lastPaletteIdx) {
      this.nebulaDirty = true;
      this.lastPaletteIdx = this.paletteIdx;
    }
    this.chordRoot = music.chordRoot ?? 0;

    // Parallax from melody/bass position (subtle drift based on active notes)
    const melodyMidi = music.melodyMidiNote >= 0 ? music.melodyMidiNote : 60;
    const bassMidi = music.bassMidiNote >= 0 ? music.bassMidiNote : 36;
    const targetX = ((melodyMidi % 12) / 12 - 0.5) * 2; // -1 to 1
    const targetY = ((bassMidi % 12) / 12 - 0.5) * 2;
    this.parallaxX += (targetX - this.parallaxX) * 0.5 * dt;
    this.parallaxY += (targetY - this.parallaxY) * 0.5 * dt;

    // Update star shimmer
    for (const star of this.stars) {
      const threshold = star.twinklePhase / (Math.PI * 2);

      if (this.smoothTension > threshold) {
        const intensity = (this.smoothTension - threshold) / (1 - threshold + 0.01);
        const targetShimmer = Math.min(1, intensity * this.twinkleAmount);
        star.shimmer += (targetShimmer - star.shimmer) * 4 * dt;
      } else {
        star.shimmer *= Math.exp(-3 * dt);
      }
    }
  }

  render(): HTMLCanvasElement {
    const ctx = this.ctx;

    // Clear to black
    ctx.fillStyle = 'rgb(0, 0, 0)';
    ctx.fillRect(0, 0, this.width, this.height);

    // Render nebulae to cache if dirty
    if (this.nebulaDirty) {
      this.renderNebulaeToCache();
      this.nebulaDirty = false;
    }

    // Blit cached nebulae with parallax offset
    const px = this.parallaxX * this.parallaxStrength * 8;
    const py = this.parallaxY * this.parallaxStrength * 8;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.7 + this.smoothTension * 0.3;
    ctx.drawImage(this.nebulaCanvas, px, py);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // Draw stars
    this.renderStars(ctx);

    return this.canvas;
  }

  /** Pre-render nebulae to cache (called only when palette changes or on resize) */
  private renderNebulaeToCache(): void {
    const ctx = this.nebulaCtx;

    // Clear cache
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.globalCompositeOperation = 'lighter';

    for (const nebula of this.nebulae) {
      // No parallax in cache - applied during blit
      const baseX = nebula.x;
      const baseY = nebula.y;

      // Render each blob
      for (const blob of nebula.blobs) {
        const x = baseX + blob.offsetX;
        const y = baseY + blob.offsetY;

        // Sample color from palette with blob's color shift
        const colorPos = ((nebula.baseColorPos + blob.colorShift) % 1 + 1) % 1;
        const [r, g, b] = samplePaletteColor(this.paletteIdx, colorPos);

        // Base opacity (tension modulation applied during blit)
        const opacity = blob.opacity * this.nebulaOpacity;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(blob.rotation);
        ctx.scale(1, blob.aspectRatio);

        // Soft radial gradient
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, blob.radius);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity * 0.5})`);
        gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${opacity * 0.3})`);
        gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${opacity * 0.12})`);
        gradient.addColorStop(0.85, `rgba(${r}, ${g}, ${b}, ${opacity * 0.03})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, blob.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  private renderStars(ctx: CanvasRenderingContext2D): void {
    const tensionSpeedMult = 1 + this.smoothTension * 1.5;

    for (const star of this.stars) {
      // Parallax offset based on depth (near stars move more)
      const parallaxMult = star.depth * this.parallaxStrength * 30;
      const px = this.parallaxX * parallaxMult;
      const py = this.parallaxY * parallaxMult;

      const x = star.x + px;
      const y = star.y + py;

      // Skip if off-screen (with margin)
      if (x < -10 || x > this.width + 10 || y < -10 || y > this.height + 10) continue;

      // Twinkle - simplified to single frequency
      const twinkleTime = this.time * star.twinkleSpeed * tensionSpeedMult;
      const twinkleFactor = 0.7 + 0.3 * Math.sin(twinkleTime + star.twinklePhase);

      // Shimmer boost
      const shimmerBoost = star.shimmer * 0.4;

      // Final brightness
      const brightness = star.baseBrightness * twinkleFactor + shimmerBoost;
      const alpha = Math.min(1, brightness);

      // Size
      const size = star.baseSize * (1 + shimmerBoost * 0.3);

      // Color from palette
      const tensionShift = this.smoothTension * 0.25;
      const colorPos = ((star.colorPos + tensionShift + this.chordRoot / 24) % 1 + 1) % 1;
      const [pr, pg, pb] = samplePaletteColor(this.paletteIdx, colorPos);

      // Blend palette color with white (stars are never fully saturated)
      const saturation = 0.25 + star.shimmer * 0.35;
      const r = Math.round(255 * (1 - saturation) + pr * saturation);
      const g = Math.round(255 * (1 - saturation) + pg * saturation);
      const b = Math.round(255 * (1 - saturation) + pb * saturation);

      // Small stars: just a filled rect (much faster than arc)
      if (size < 1.0) {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
        continue;
      }

      // Medium/large stars: glow + core (2 circles max)
      if (size > 1.2) {
        // Single glow
        ctx.beginPath();
        ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.08})`;
        ctx.fill();
      }

      // Core
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.fill();
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  dispose(): void {
    this.ready = false;
    this.stars = [];
    this.nebulae = [];
    this.clusters = [];
  }

  getConfig(): EffectConfig[] {
    return [];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return {
      density: 1.2,
      twinkleAmount: 0.3,
      nebulaOpacity: 0.55,
      parallaxStrength: 0.12,
    };
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
      case 'nebulaOpacity':
        this.nebulaOpacity = value as number;
        break;
      case 'parallaxStrength':
        this.parallaxStrength = value as number;
        break;
    }
  }
}
