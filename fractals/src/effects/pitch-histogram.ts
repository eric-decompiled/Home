// --- Pitch Histogram Overlay Effect ---
// Minimal bars showing pitch class activity

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { palettes } from '../fractal-engine.ts';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export class PitchHistogramEffect implements VisualEffect {
  readonly id = 'pitch-histogram';
  readonly name = 'Pitch Histogram';
  readonly isPostProcess = false; // Normal layer, not post-process (which replaces everything)
  readonly defaultBlend: BlendMode = 'source-over';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private ready = false;
  private width = 800;
  private height = 600;

  private pitchHistogram: number[] = new Array(12).fill(0);
  private histogramDecay = 0.8;

  constructor() {
    this.canvas = document.createElement('canvas');
  }

  init(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    this.ready = true;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  update(dt: number, music: MusicParams): void {
    dt = Math.min(dt, 0.1);

    for (const voice of music.activeVoices) {
      if (voice.onset) {
        this.pitchHistogram[voice.pitchClass] = Math.min(1.0, this.pitchHistogram[voice.pitchClass] + 0.15);
      }
    }

    for (let i = 0; i < 12; i++) {
      this.pitchHistogram[i] *= Math.exp(-this.histogramDecay * dt);
    }
  }

  render(): HTMLCanvasElement {
    if (!this.ctx) return this.canvas;
    const ctx = this.ctx;

    // Clear to fully transparent
    ctx.clearRect(0, 0, this.width, this.height);

    const barWidth = this.width / 12;
    const barPadding = 6;
    const maxBarHeight = 80;
    const bottomMargin = 20;

    for (let pc = 0; pc < 12; pc++) {
      const value = this.pitchHistogram[pc];
      if (value < 0.02) continue;

      const barX = pc * barWidth + barPadding;
      const bw = barWidth - barPadding * 2;
      const barHeight = value * maxBarHeight;
      const barY = this.height - bottomMargin - barHeight;

      const pcColor = palettes[pc]?.stops[3]?.color ?? [100, 150, 255];

      // Bar
      ctx.fillStyle = `rgba(${pcColor[0]}, ${pcColor[1]}, ${pcColor[2]}, ${value * 0.8})`;
      ctx.fillRect(barX, barY, bw, barHeight);

      // Label
      ctx.fillStyle = `rgba(${pcColor[0]}, ${pcColor[1]}, ${pcColor[2]}, ${value})`;
      ctx.font = `bold ${Math.max(9, bw * 0.25)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(NOTE_NAMES[pc], barX + bw / 2, this.height - bottomMargin + 4);
    }

    return this.canvas;
  }

  isReady(): boolean {
    return this.ready;
  }

  dispose(): void {
    this.ready = false;
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'decay', label: 'Decay Rate', type: 'range', value: this.histogramDecay, min: 0.2, max: 2.0, step: 0.1 },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'decay') this.histogramDecay = value as number;
  }
}
