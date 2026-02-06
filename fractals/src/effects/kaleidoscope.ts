// --- Kaleidoscope Effect ---
// Post-process: mirrors and rotates the composited layers below into symmetric patterns.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';

export class KaleidoscopeEffect implements VisualEffect {
  readonly id = 'kaleidoscope';
  readonly name = 'Kaleidoscope';
  readonly isPostProcess = true;
  readonly defaultBlend: BlendMode = 'source-over';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  private foldCount = 6;
  private rotation = 0;
  private rotationVelocity = 0;
  private zoomPulse = 1.0;
  private mirrorMode: 'reflect' | 'rotate' = 'reflect';
  private rotationSpeed = 0.2;
  private centerOffsetX = 0;
  private centerOffsetY = 0;

  // Reference to compositor's composite canvas (set externally)
  private sourceCanvas: HTMLCanvasElement | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /** Set the source canvas to read from (the compositor's composite) */
  setSourceCanvas(canvas: HTMLCanvasElement): void {
    this.sourceCanvas = canvas;
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
    // === GROOVE CURVES ===
    const beatAnticipation = music.beatAnticipation ?? 0;
    const beatArrival = music.beatArrival ?? 0;
    const barArrival = music.barArrival ?? 0;

    // Chord degree → fold count (mapped to 3-12)
    const targetFolds = 3 + (music.chordDegree % 5) * 2; // 3,5,7,9,11
    this.foldCount = targetFolds;

    // Beat → rotation impulse - arrival adds impact
    if (music.kick) this.rotationVelocity += 0.3;
    if (music.snare) this.rotationVelocity -= 0.25;
    // Groove curve impulses
    this.rotationVelocity += beatArrival * 0.15 - barArrival * 0.1;

    // Melody pitch → rotation offset
    if (music.melodyOnset) {
      this.rotationVelocity += ((music.melodyPitchClass % 12) / 12 - 0.5) * 0.2;
    }

    // Tension → zoom pulse - anticipation adds subtle buildup
    this.zoomPulse = 1.0 + music.tension * 0.15 + beatAnticipation * 0.05;
    if (music.kick) this.zoomPulse += 0.05;
    // Arrival adds zoom punch
    this.zoomPulse += beatArrival * 0.08 + barArrival * 0.1;
    this.zoomPulse = Math.min(1.3, this.zoomPulse);

    // Rotation dynamics
    this.rotationVelocity *= Math.exp(-2.0 * dt);
    this.rotation += (this.rotationSpeed + this.rotationVelocity) * dt;
  }

  render(): HTMLCanvasElement {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = w / 2 + this.centerOffsetX;
    const cy = h / 2 + this.centerOffsetY;

    ctx.clearRect(0, 0, w, h);

    if (!this.sourceCanvas) return this.canvas;

    const sliceAngle = (Math.PI * 2) / this.foldCount;

    ctx.save();
    ctx.translate(cx, cy);

    for (let i = 0; i < this.foldCount; i++) {
      ctx.save();
      ctx.rotate(this.rotation + i * sliceAngle);

      // Mirror every other slice
      if (this.mirrorMode === 'reflect' && i % 2 === 1) {
        ctx.scale(1, -1);
      }

      // Clip to wedge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const r = Math.max(w, h) * 1.5;
      ctx.lineTo(r, 0);
      ctx.arc(0, 0, r, 0, sliceAngle);
      ctx.closePath();
      ctx.clip();

      // Draw source scaled by zoom pulse
      const scale = this.zoomPulse;
      ctx.scale(scale, scale);
      ctx.drawImage(this.sourceCanvas, -cx, -cy);

      ctx.restore();
    }

    ctx.restore();

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
    return [
      { key: 'foldCount', label: 'Folds', type: 'range', value: this.foldCount, min: 3, max: 12, step: 1 },
      { key: 'rotationSpeed', label: 'Rotation', type: 'range', value: this.rotationSpeed, min: 0, max: 1, step: 0.05 },
      { key: 'mirrorMode', label: 'Mode', type: 'select', value: this.mirrorMode, options: ['reflect', 'rotate'] },
      { key: 'centerOffsetX', label: 'Center X', type: 'range', value: this.centerOffsetX, min: -200, max: 200, step: 10 },
      { key: 'centerOffsetY', label: 'Center Y', type: 'range', value: this.centerOffsetY, min: -200, max: 200, step: 10 },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    switch (key) {
      case 'foldCount':
        this.foldCount = value as number;
        break;
      case 'rotationSpeed':
        this.rotationSpeed = value as number;
        break;
      case 'mirrorMode':
        this.mirrorMode = value as 'reflect' | 'rotate';
        break;
      case 'centerOffsetX':
        this.centerOffsetX = value as number;
        break;
      case 'centerOffsetY':
        this.centerOffsetY = value as number;
        break;
    }
  }
}
