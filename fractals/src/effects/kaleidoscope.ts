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

  // Cached clip path (recomputed when foldCount or size changes)
  private clipPath: Path2D | null = null;
  private clipPathFolds = 0;
  private clipPathRadius = 0;

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

    // Chord degree → fold count (curated per-degree)
    if (music.chordDegree !== this.lastChordDegree && music.chordDegree >= 0) {
      this.lastChordDegree = music.chordDegree;
      // I:6, ii:7, III:6, IV:8, V:6, vi:7, vii°:9
      const foldMap = [6, 7, 6, 8, 6, 7, 9];
      const targetFolds = foldMap[music.chordDegree] ?? 6;
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
    // Higher base zoom, reduced variability
    this.zoomTarget = 1.04 + music.tension * 0.015;
    // Groove creates continuous zoom breathing (reduced)
    this.zoomTarget += (beatGroove - 0.5) * 0.02;
    // Anticipation adds buildup before the beat (reduced)
    this.zoomTarget += beatAnticipation * 0.01;
    // Bar-level for bigger phrases (reduced)
    this.zoomTarget += (music.barAnticipation ?? 0) * 0.008;
    // Arrival creates soft "hit" (reduced)
    this.zoomTarget += beatArrival * 0.01 + barArrival * 0.012;
    // Kick/snare zoom accents (reduced)
    if (music.kick) this.zoomTarget += 0.01;
    if (music.snare) this.zoomTarget += 0.006;
    this.zoomTarget = Math.max(1.03, Math.min(1.08, this.zoomTarget));

    // Zoom pulse with asymmetric response: gentle attack, very slow decay
    if (this.zoomTarget > this.zoomPulse) {
      // Gentle attack
      this.zoomPulse += (this.zoomTarget - this.zoomPulse) * (1 - Math.exp(-3.0 * dt));
    } else {
      // Very slow decay - settle back gradually
      this.zoomPulse += (this.zoomTarget - this.zoomPulse) * (1 - Math.exp(-0.4 * dt));
    }

    // Rotation dynamics: base speed + groove modulation + impulse velocity
    // Low damping lets momentum carry through smoothly
    this.rotationVelocity *= Math.exp(-0.6 * dt);
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

    // Tighter radius: just enough to cover canvas diagonal + offset + zoom margin
    const diagonal = Math.sqrt(w * w + h * h);
    const offsetMargin = Math.max(Math.abs(this.centerOffsetX), Math.abs(this.centerOffsetY));
    const r = (diagonal / 2 + offsetMargin) * 1.15; // 15% margin for zoom

    // Cache clip path if parameters changed
    if (!this.clipPath || this.clipPathFolds !== this.foldCount || Math.abs(this.clipPathRadius - r) > 1) {
      this.clipPath = new Path2D();
      this.clipPath.moveTo(0, 0);
      this.clipPath.lineTo(r, 0);
      this.clipPath.arc(0, 0, r, 0, sliceAngle);
      this.clipPath.closePath();
      this.clipPathFolds = this.foldCount;
      this.clipPathRadius = r;
    }

    ctx.save();
    ctx.translate(cx, cy);

    for (let i = 0; i < this.foldCount; i++) {
      ctx.save();
      ctx.rotate(this.rotation + i * sliceAngle);

      // Mirror every other slice
      if (this.mirrorMode === 'reflect' && i % 2 === 1) {
        ctx.scale(1, -1);
      }

      // Clip to cached wedge path
      ctx.clip(this.clipPath);

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
    ];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return {
      foldCount: 7,
      rotationSpeed: 0.2,
      mirrorMode: 'rotate',
      centerOffsetX: 0,
      centerOffsetY: 0,
    };
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
