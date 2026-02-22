// --- CRT Effect ---
// Post-process: applies retro CRT monitor effect with pixelation and scanlines.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';

export class CrtOverlayEffect implements VisualEffect {
  readonly id = 'crt-overlay';
  readonly name = 'CRT';
  readonly isPostProcess = true;
  readonly defaultBlend: BlendMode = 'source-over';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lowResCanvas: HTMLCanvasElement;
  private lowResCtx: CanvasRenderingContext2D;
  private scanlineCanvas: HTMLCanvasElement;  // Pre-rendered scanlines
  private width = 800;
  private height = 600;
  private lowW = 0;
  private lowH = 0;
  private ready = false;

  private readonly pixelSize = 6;
  private readonly scanlineAlpha = 0.3;
  private sourceCanvas: HTMLCanvasElement | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.lowResCanvas = document.createElement('canvas');
    this.lowResCtx = this.lowResCanvas.getContext('2d')!;
    this.scanlineCanvas = document.createElement('canvas');
  }

  setSourceCanvas(canvas: HTMLCanvasElement): void {
    this.sourceCanvas = canvas;
  }

  private updateDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;

    // Pre-calculate low-res dimensions
    this.lowW = Math.floor(width / this.pixelSize);
    this.lowH = Math.floor(height / this.pixelSize);
    this.lowResCanvas.width = this.lowW;
    this.lowResCanvas.height = this.lowH;

    // Pre-render scanlines overlay
    this.scanlineCanvas.width = width;
    this.scanlineCanvas.height = height;
    const scanCtx = this.scanlineCanvas.getContext('2d')!;
    scanCtx.fillStyle = `rgba(0,0,0,${this.scanlineAlpha})`;
    const lineHeight = Math.max(1, Math.floor(this.pixelSize / 2));
    for (let y = 0; y < height; y += this.pixelSize) {
      scanCtx.fillRect(0, y + this.pixelSize - lineHeight, width, lineHeight);
    }
  }

  init(width: number, height: number): void {
    this.updateDimensions(width, height);
    this.ready = true;
  }

  resize(width: number, height: number): void {
    this.updateDimensions(width, height);
  }

  update(_dt: number, _music: MusicParams): void {}

  render(): HTMLCanvasElement {
    const ctx = this.ctx;

    if (!this.sourceCanvas) {
      ctx.clearRect(0, 0, this.width, this.height);
      return this.canvas;
    }

    // Clear canvases to prevent feedback accumulation
    this.lowResCtx.clearRect(0, 0, this.lowW, this.lowH);
    ctx.clearRect(0, 0, this.width, this.height);

    // Downscale source to low-res (no smoothing preserves thin bright lines)
    this.lowResCtx.imageSmoothingEnabled = false;
    this.lowResCtx.drawImage(this.sourceCanvas, 0, 0, this.lowW, this.lowH);

    // Upscale with nearest-neighbor (pixelated)
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.lowResCanvas, 0, 0, this.width, this.height);

    // Composite pre-rendered scanlines
    ctx.drawImage(this.scanlineCanvas, 0, 0);

    return this.canvas;
  }

  isReady(): boolean {
    return this.ready && this.sourceCanvas !== null;
  }

  dispose(): void {
    this.ready = false;
    this.sourceCanvas = null;
  }

  getConfig(): EffectConfig[] {
    return [];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return {};
  }

  setConfigValue(_key: string, _value: number | string | boolean): void {}
}
