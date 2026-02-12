// --- Feedback Trail Effect ---
// Post-process: blends previous frames with zoom/rotation for ghosting/echo

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';

export class FeedbackTrailEffect implements VisualEffect {
  readonly id = 'feedback-trail';
  readonly name = 'Feedback';
  readonly isPostProcess = true;
  readonly defaultBlend: BlendMode = 'source-over';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private feedbackCanvas: HTMLCanvasElement;
  private feedbackCtx: CanvasRenderingContext2D;
  private tempCanvas: HTMLCanvasElement;
  private tempCtx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  private decay = 0.92;
  private zoom = 1.008;
  private rotation = 0.003;
  private currentRotation = 0;

  private sourceCanvas: HTMLCanvasElement | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.feedbackCanvas = document.createElement('canvas');
    this.feedbackCtx = this.feedbackCanvas.getContext('2d')!;
    this.tempCanvas = document.createElement('canvas');
    this.tempCtx = this.tempCanvas.getContext('2d')!;
  }

  setSourceCanvas(canvas: HTMLCanvasElement): void {
    this.sourceCanvas = canvas;
  }

  init(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.feedbackCanvas.width = width;
    this.feedbackCanvas.height = height;
    this.tempCanvas.width = width;
    this.tempCanvas.height = height;
    this.feedbackCtx.fillStyle = '#000';
    this.feedbackCtx.fillRect(0, 0, width, height);
    this.ready = true;
  }

  resize(width: number, height: number): void {
    // For resize, just clear feedback - it will rebuild quickly
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.feedbackCanvas.width = width;
    this.feedbackCanvas.height = height;
    this.tempCanvas.width = width;
    this.tempCanvas.height = height;
    this.feedbackCtx.fillStyle = '#000';
    this.feedbackCtx.fillRect(0, 0, width, height);
  }

  update(_dt: number, music: MusicParams): void {
    // Modulate rotation with beat groove
    const grooveRotation = (music.beatGroove - 0.5) * 0.004;
    this.currentRotation = this.rotation + grooveRotation;

    // Add impulse on kicks
    if (music.kick) {
      this.currentRotation += 0.008;
    }
  }

  render(): HTMLCanvasElement {
    const ctx = this.ctx;
    const fbCtx = this.feedbackCtx;
    const tempCtx = this.tempCtx;
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;

    if (!this.sourceCanvas) {
      ctx.clearRect(0, 0, w, h);
      return this.canvas;
    }

    // Save current feedback to temp canvas
    tempCtx.globalCompositeOperation = 'source-over';
    tempCtx.globalAlpha = 1;
    tempCtx.clearRect(0, 0, w, h);
    tempCtx.drawImage(this.feedbackCanvas, 0, 0);

    // Clear feedback buffer
    fbCtx.clearRect(0, 0, w, h);

    // Draw old feedback with decay (fading), zoom, and rotation
    fbCtx.save();
    fbCtx.globalAlpha = this.decay;  // This is the actual decay - draws old content fainter
    fbCtx.translate(cx, cy);
    fbCtx.rotate(this.currentRotation);
    fbCtx.scale(this.zoom, this.zoom);
    fbCtx.translate(-cx, -cy);
    fbCtx.drawImage(this.tempCanvas, 0, 0);
    fbCtx.restore();
    fbCtx.globalAlpha = 1;

    // Add current frame on top with screen blend (avoids harsh saturation)
    fbCtx.globalCompositeOperation = 'screen';
    fbCtx.globalAlpha = 0.4;
    fbCtx.drawImage(this.sourceCanvas, 0, 0);
    fbCtx.globalAlpha = 1;
    fbCtx.globalCompositeOperation = 'source-over';

    // Output: original with trail overlay
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.sourceCanvas, 0, 0);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.65;
    ctx.drawImage(this.feedbackCanvas, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    return this.canvas;
  }

  isReady(): boolean {
    return this.ready && this.sourceCanvas !== null;
  }

  dispose(): void {
    this.ready = false;
    this.sourceCanvas = null;
    this.feedbackCtx.fillStyle = '#000';
    this.feedbackCtx.fillRect(0, 0, this.width, this.height);
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'decay', label: 'Decay', type: 'range', value: this.decay, min: 0.8, max: 0.98, step: 0.01 },
      { key: 'zoom', label: 'Zoom', type: 'range', value: this.zoom, min: 0.99, max: 1.03, step: 0.002 },
      { key: 'rotation', label: 'Rotation', type: 'range', value: this.rotation, min: -0.02, max: 0.02, step: 0.001 },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'decay') this.decay = value as number;
    if (key === 'zoom') this.zoom = value as number;
    if (key === 'rotation') this.rotation = value as number;
  }
}
