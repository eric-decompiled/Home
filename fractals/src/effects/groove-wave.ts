// --- Groove Wave Overlay ---
// Visualizes the groove curves as animated waves at the bottom of the screen.
// Shows the rhythmic pulse of the music in a subtle, non-intrusive way.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { palettes } from '../fractal-engine.ts';

// Ring buffer for groove history
const HISTORY_LENGTH = 200;

export class GrooveWaveEffect implements VisualEffect {
  readonly id = 'groove-wave';
  readonly name = 'Groove Wave';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'screen';
  readonly defaultOpacity = 0.8;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  // Groove history ring buffers
  private beatHistory: number[] = [];
  private barHistory: number[] = [];
  private writeIndex = 0;

  // Visual settings
  private waveHeight = 25;
  private bottomMargin = 40;
  private color: [number, number, number] = [100, 150, 255];
  private time = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    // Initialize history buffers
    for (let i = 0; i < HISTORY_LENGTH; i++) {
      this.beatHistory.push(0.5);
      this.barHistory.push(0.5);
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
    this.time += dt;

    // Sample groove curves into history
    const beatGroove = music.beatGroove ?? 0.5;
    const barGroove = music.barGroove ?? 0.5;

    this.beatHistory[this.writeIndex] = beatGroove;
    this.barHistory[this.writeIndex] = barGroove;
    this.writeIndex = (this.writeIndex + 1) % HISTORY_LENGTH;

    // Color from palette
    if (music.paletteIndex >= 0 && music.paletteIndex < palettes.length) {
      const p = palettes[music.paletteIndex];
      const c = p.stops[3]?.color ?? [100, 150, 255];
      this.color = [c[0], c[1], c[2]];
    }
  }

  render(): HTMLCanvasElement {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Clear to transparent
    ctx.clearRect(0, 0, w, h);

    const baseY = h - this.bottomMargin;
    const waveH = this.waveHeight;
    const centerX = w / 2;
    const halfWidth = w / 2;
    const stepX = halfWidth / HISTORY_LENGTH;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Draw mirrored waves - emanating from center
    // Bar groove (background layer)
    this.drawMirroredWave(ctx, this.barHistory, baseY, waveH * 0.5, centerX, stepX, 0.12, 4);

    // Beat groove (main rhythm)
    this.drawMirroredWave(ctx, this.beatHistory, baseY, waveH, centerX, stepX, 0.35, 2);

    ctx.restore();

    return this.canvas;
  }

  private drawMirroredWave(
    ctx: CanvasRenderingContext2D,
    history: number[],
    baseY: number,
    height: number,
    centerX: number,
    stepX: number,
    baseAlpha: number,
    lineWidth: number
  ): void {
    const [r, g, b] = this.color;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw segments with brightness based on groove value (peaks glow brighter)
    const drawSegments = (mirror: boolean, isGlow: boolean) => {
      for (let i = 0; i < HISTORY_LENGTH - 1; i++) {
        const idx0 = (this.writeIndex - 1 - i + HISTORY_LENGTH) % HISTORY_LENGTH;
        const idx1 = (this.writeIndex - 2 - i + HISTORY_LENGTH) % HISTORY_LENGTH;

        const xOffset0 = i * stepX;
        const xOffset1 = (i + 1) * stepX;

        const x0 = mirror ? centerX - xOffset0 : centerX + xOffset0;
        const x1 = mirror ? centerX - xOffset1 : centerX + xOffset1;

        const val0 = history[idx0];
        const val1 = history[idx1];
        const avgVal = (val0 + val1) / 2;

        const displacement0 = (val0 - 0.5) * 2 * height;
        const displacement1 = (val1 - 0.5) * 2 * height;
        const y0 = baseY - displacement0;
        const y1 = baseY - displacement1;

        // Brightness boost at peaks: only brighten at peaks, don't dim at troughs
        // avgVal ranges 0-1, peaks at 1.
        const peakBoost = 1 + Math.max(0, avgVal - 0.5) * 1.5; // 1x at trough, 1.75x at peak
        const alpha = baseAlpha * peakBoost * (isGlow ? 0.3 : 1);

        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(1, alpha)})`;
        ctx.lineWidth = isGlow ? lineWidth * 3 : lineWidth;
        ctx.stroke();
      }
    };

    // Glow pass
    drawSegments(false, true);
    drawSegments(true, true);

    // Core pass
    drawSegments(false, false);
    drawSegments(true, false);
  }

  isReady(): boolean {
    return this.ready;
  }

  dispose(): void {
    this.ready = false;
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'waveHeight', label: 'Wave Height', type: 'range', value: this.waveHeight, min: 10, max: 60, step: 5 },
      { key: 'bottomMargin', label: 'Bottom Margin', type: 'range', value: this.bottomMargin, min: 5, max: 50, step: 5 },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'waveHeight') this.waveHeight = value as number;
    if (key === 'bottomMargin') this.bottomMargin = value as number;
  }
}
