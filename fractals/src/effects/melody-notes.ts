// --- Melody Notes Overlay ---
// Draws just the note name markers around the outer circle.
// Rendered independently of melody effects when "Show Notes" is checked.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import {
  samplePaletteColor, SPIRAL_RADIUS_SCALE, spiralPos, getNoteName
} from './effect-utils.ts';

export class MelodyNotesEffect implements VisualEffect {
  readonly id = 'melody-notes';
  readonly name = 'Melody Notes';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'screen';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  private key = 0;
  private keyRotation = 0;
  private lastPitchClass = -1;
  private brightness = 0;
  private useFlats = false;
  private time = 0;

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
    this.key = music.key;
    this.keyRotation = music.keyRotation;

    // Determine flat vs sharp based on key
    const flatKeys = new Set([1, 3, 5, 8, 10]); // Db, Eb, F, Ab, Bb
    this.useFlats = flatKeys.has(this.key);

    // Track melody note changes
    if (music.melodyOnset && music.melodyPitchClass >= 0) {
      if (music.melodyPitchClass !== this.lastPitchClass) {
        this.lastPitchClass = music.melodyPitchClass;
        this.brightness = 0.8;
      }
    }

    // Decay brightness
    this.brightness *= Math.exp(-3.0 * dt);
  }

  render(): HTMLCanvasElement {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const minDim = Math.min(cx, cy);
    const spiralMaxR = minDim * SPIRAL_RADIUS_SCALE;
    const outerPos = spiralPos(113, 0, this.key, this.keyRotation, cx, cy, spiralMaxR);
    const r = outerPos.radius;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Draw outer ring
    const ringColor = this.lastPitchClass >= 0 ? samplePaletteColor(this.lastPitchClass, 0.6) : [100, 100, 150];
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${ringColor[0]},${ringColor[1]},${ringColor[2]},0.06)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw note names (offset outward like melody-clock)
    const labelOffset = r * 0.12;
    for (let i = 0; i < 12; i++) {
      const pos = spiralPos(113, i, this.key, this.keyRotation, cx, cy, spiralMaxR);
      const tickAngle = Math.atan2(pos.y - cy, pos.x - cx);
      const tx = cx + Math.cos(tickAngle) * (r + labelOffset);
      const ty = cy + Math.sin(tickAngle) * (r + labelOffset);

      const isCurrent = i === this.lastPitchClass;
      const tc = samplePaletteColor(i, 0.6);
      const tickAlpha = isCurrent ? 0.55 + this.brightness * 0.25 : 0.18;
      const noteName = getNoteName(i, this.useFlats);
      const fontSize = Math.max(9, Math.round(r * 0.065));

      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(tickAngle + Math.PI / 2);
      ctx.font = `${isCurrent ? '500 ' : '300 '}${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (isCurrent && this.brightness > 0.05) {
        ctx.shadowColor = `rgba(${tc[0]},${tc[1]},${tc[2]},${(this.brightness * 0.4).toFixed(3)})`;
        ctx.shadowBlur = 8;
      }

      ctx.fillStyle = `rgba(${tc[0]},${tc[1]},${tc[2]},${tickAlpha.toFixed(3)})`;
      ctx.fillText(noteName, 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();

      // Glow on current
      if (isCurrent && this.brightness > 0.05) {
        const glowR = r * 0.05;
        const grd = ctx.createRadialGradient(tx, ty, 0, tx, ty, glowR);
        grd.addColorStop(0, `rgba(${tc[0]},${tc[1]},${tc[2]},${(this.brightness * 0.4).toFixed(3)})`);
        grd.addColorStop(1, `rgba(${tc[0]},${tc[1]},${tc[2]},0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(tx - glowR, ty - glowR, glowR * 2, glowR * 2);
      }
    }

    ctx.restore();
    return this.canvas;
  }

  isReady(): boolean { return this.ready; }

  dispose(): void {
    this.ready = false;
  }

  getConfig(): EffectConfig[] {
    return [];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return {};
  }

  setConfigValue(_key: string, _value: number | string | boolean): void {
    // No config
  }
}
