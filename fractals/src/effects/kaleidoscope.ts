// --- Kaleidoscope Effect ---
// Post-process: mirrors and rotates the composited layers below into symmetric patterns.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { gsap } from '../animation.ts';

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

  private foldCount = 7;
  private rotation = 0;
  private rotationVelocity = 0;
  private zoomPulse = 1.0;
  private zoomTarget = 1.0;
  private mirrorMode: 'reflect' | 'rotate' = 'rotate';
  private rotationSpeed = 0.2;
  private centerOffsetX = 0;
  private centerOffsetY = 0;
  private lastChordDegree = -1;

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
    // Continuous curves (0-1, peak at beat/bar)
    const beatGroove = music.beatGroove ?? 0.5;
    const barGroove = music.barGroove ?? 0.5;
    // Anticipation (0→1 before beat) and Arrival (peak then decay)
    const beatAnticipation = music.beatAnticipation ?? 0;
    const beatArrival = music.beatArrival ?? 0;
    const barArrival = music.barArrival ?? 0;

    // Chord degree → fold count (mapped to 3-12), tweened smoothly
    if (music.chordDegree !== this.lastChordDegree && music.chordDegree >= 0) {
      this.lastChordDegree = music.chordDegree;
      const targetFolds = 3 + (music.chordDegree % 5) * 2; // 3,5,7,9,11
      const beatDur = music.beatDuration || 0.5;
      gsap.to(this, {
        foldCount: targetFolds,
        duration: beatDur,
        ease: 'power2.inOut',
        overwrite: true,
      });
    }

    // === ROTATION: groove-driven breathing + impulses ===
    // Continuous groove modulation: rotation "breathes" with the beat
    // beatGroove peaks at 1 on the beat, so (beatGroove - 0.5) gives -0.5 to +0.5
    // Groove curves drive the main rhythmic motion
    const grooveRotation = (beatGroove - 0.5) * 0.18 + (barGroove - 0.5) * 0.10;

    // Discrete impulses from kicks/snares (noticeable accents)
    if (music.kick) this.rotationVelocity += 0.045;
    if (music.snare) this.rotationVelocity -= 0.03;
    // Arrival adds small punch
    this.rotationVelocity += beatArrival * 0.015;

    // Melody pitch → rotation offset (subtle color)
    if (music.melodyOnset) {
      this.rotationVelocity += ((music.melodyPitchClass % 12) / 12 - 0.5) * 0.012;
    }

    // === ZOOM: groove-driven breathing + anticipation ===
    // Base zoom from tension
    this.zoomTarget = 1.0 + music.tension * 0.025;
    // Groove creates continuous zoom breathing (main driver)
    this.zoomTarget += (beatGroove - 0.5) * 0.04;
    // Anticipation adds buildup before the beat
    this.zoomTarget += beatAnticipation * 0.02;
    // Bar-level for bigger phrases
    this.zoomTarget += (music.barAnticipation ?? 0) * 0.015;
    // Arrival creates soft "hit"
    this.zoomTarget += beatArrival * 0.02 + barArrival * 0.025;
    // Kick/snare zoom accents
    if (music.kick) this.zoomTarget += 0.02;
    if (music.snare) this.zoomTarget += 0.012;
    this.zoomTarget = Math.min(1.08, this.zoomTarget);

    // Zoom pulse with asymmetric response: gentle attack, very slow decay
    if (this.zoomTarget > this.zoomPulse) {
      // Gentle attack
      this.zoomPulse += (this.zoomTarget - this.zoomPulse) * (1 - Math.exp(-4.0 * dt));
    } else {
      // Very slow decay - settle back gradually
      this.zoomPulse += (this.zoomTarget - this.zoomPulse) * (1 - Math.exp(-0.8 * dt));
    }

    // Rotation dynamics: base speed + groove modulation + impulse velocity
    // Lower damping lets momentum carry through
    this.rotationVelocity *= Math.exp(-1.5 * dt);
    this.rotation += (this.rotationSpeed + grooveRotation + this.rotationVelocity) * dt;
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
