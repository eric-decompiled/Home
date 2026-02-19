// --- Bass Numerals Overlay ---
// Draws just the Roman numeral markers around the outer circle.
// Rendered independently of bass effects when "Show Numerals" is checked.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import {
  samplePaletteColor, MAJOR_OFFSETS, MINOR_OFFSETS, MAJOR_DEGREES, MINOR_DEGREES,
  CHROMATIC_DEGREES_MAJOR, CHROMATIC_DEGREES_MINOR, semitoneOffset,
  SPIRAL_RADIUS_SCALE, spiralPos, TWO_PI
} from './effect-utils.ts';

export class BassNumeralsEffect implements VisualEffect {
  readonly id = 'bass-numerals';
  readonly name = 'Bass Numerals';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'screen';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  private key = 0;
  private keyMode: 'major' | 'minor' = 'major';
  private keyRotation = 0;
  private chordRoot = -1;
  private brightness = 0;
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
    this.keyMode = music.keyMode;
    this.keyRotation = music.keyRotation;

    // Track chord root changes
    if (music.chordRoot >= 0 && music.chordRoot !== this.chordRoot) {
      this.chordRoot = music.chordRoot;
      this.brightness = 0.8;
    }

    // Decay brightness
    this.brightness *= Math.exp(-2.0 * dt);
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

    const diatonicOffsets = this.keyMode === 'minor' ? MINOR_OFFSETS : MAJOR_OFFSETS;
    const degreeMap = this.keyMode === 'minor' ? MINOR_DEGREES : MAJOR_DEGREES;
    const chromaticDegreeMap = this.keyMode === 'minor' ? CHROMATIC_DEGREES_MINOR : CHROMATIC_DEGREES_MAJOR;

    // Draw outer ring
    const ringColor = this.chordRoot >= 0 ? samplePaletteColor(this.chordRoot, 0.6) : [100, 100, 150];
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TWO_PI);
    ctx.strokeStyle = `rgba(${ringColor[0]},${ringColor[1]},${ringColor[2]},0.08)`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw numerals
    for (let i = 0; i < 12; i++) {
      const semitones = semitoneOffset(i, this.key);
      const inKey = diatonicOffsets.has(semitones);
      const isCurrent = i === this.chordRoot;
      const tc = samplePaletteColor(i, 0.6);
      const tickAlpha = isCurrent ? 0.7 + this.brightness * 0.3 : inKey ? 0.25 : 0.1;

      // Get position from spiralPos for numeral placement
      const pos = spiralPos(113, i, this.key, this.keyRotation, cx, cy, spiralMaxR);
      const tickAngle = Math.atan2(pos.y - cy, pos.x - cx);
      const tx = cx + Math.cos(tickAngle) * r;
      const ty = cy + Math.sin(tickAngle) * r;

      const numeral = degreeMap[semitones];
      const chromaticNumeral = chromaticDegreeMap[semitones];

      if (numeral) {
        const fontSize = Math.max(11, Math.round(r * 0.1));

        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(tickAngle + Math.PI / 2);
        ctx.font = `${isCurrent ? 'bold ' : ''}${fontSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (isCurrent && this.brightness > 0.05) {
          ctx.shadowColor = `rgba(${tc[0]},${tc[1]},${tc[2]},${(this.brightness * 0.7).toFixed(3)})`;
          ctx.shadowBlur = 15;
        }

        ctx.fillStyle = `rgba(${tc[0]},${tc[1]},${tc[2]},${tickAlpha.toFixed(3)})`;
        ctx.fillText(numeral, 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
      } else if (chromaticNumeral && isCurrent) {
        const fontSize = Math.max(10, Math.round(r * 0.09));

        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(tickAngle + Math.PI / 2);
        ctx.font = `${isCurrent ? 'bold ' : ''}${fontSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (this.brightness > 0.05) {
          ctx.shadowColor = `rgba(${tc[0]},${tc[1]},${tc[2]},${(this.brightness * 0.5).toFixed(3)})`;
          ctx.shadowBlur = 12;
        }

        ctx.fillStyle = `rgba(${tc[0]},${tc[1]},${tc[2]},${(0.6 + this.brightness * 0.3).toFixed(3)})`;
        ctx.fillText(chromaticNumeral, 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
      } else {
        // Small dot for chromatic notes
        ctx.beginPath();
        ctx.arc(tx, ty, isCurrent ? 3 : 2, 0, TWO_PI);
        ctx.fillStyle = `rgba(${tc[0]},${tc[1]},${tc[2]},${tickAlpha.toFixed(3)})`;
        ctx.fill();
      }

      // Glow on current
      if (isCurrent && this.brightness > 0.05) {
        const glowR = r * 0.08;
        const grd = ctx.createRadialGradient(tx, ty, 0, tx, ty, glowR);
        grd.addColorStop(0, `rgba(${tc[0]},${tc[1]},${tc[2]},${(this.brightness * 0.6).toFixed(3)})`);
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
