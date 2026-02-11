// --- Star Spiral Effect ---
// Traveling star particles that spawn on note onsets and spiral inward to center.
// Pulses with groove waves - beat 1 is brightest when both beat and bar grooves align.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import {
  samplePaletteColor, SPIRAL_MIDI_LO, SPIRAL_MIDI_HI,
  SPIRAL_RADIUS_SCALE, spiralPos
} from './effect-utils.ts';

const MIDI_LO = SPIRAL_MIDI_LO;
const MIDI_HI = SPIRAL_MIDI_HI;

// Traveling star - spawned when a note plays, spirals inward to center
interface TravelingStar {
  pitchClass: number;
  progress: number;      // 0 = spawn position, 1 = center
  alpha: number;
  color: [number, number, number];
  velocity: number;
  startMidi: number;
  age: number;
}

// Beat ring - pulses outward on beat 1
interface BeatRing {
  position: number;      // 0 = outer, 1 = center
  alpha: number;
  color: [number, number, number];
  speed: number;
}

export class StarSpiralEffect implements VisualEffect {
  readonly id = 'star-spiral';
  readonly name = 'Star Spiral';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'screen';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  private stars: TravelingStar[] = [];
  private beatRings: BeatRing[] = [];
  private time = 0;
  private key = 0;
  private keyRotation = 0;
  private spiralTightness = 0.9;
  private loudness = 0;
  private beatGrooveCurrent = 0.5;
  private barGrooveCurrent = 0.5;
  private anticipationColor: [number, number, number] = [255, 255, 255];
  private awake = false;

  // Config
  private showRings = true;
  private intensity = 1.0;
  private maxStars = 128;

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

    if (!this.awake) {
      if (music.currentTime > 0.1) this.awake = true;
      else return;
    }

    // Track groove for pulsing
    this.beatGrooveCurrent = music.beatGroove ?? 0.5;
    this.barGrooveCurrent = music.barGroove ?? 0.5;

    // Smooth loudness
    const targetLoudness = music.loudness ?? 0;
    this.loudness += (targetLoudness - this.loudness) * 0.1;

    // Track tension color
    const tc = music.tensionColor;
    this.anticipationColor = [tc[0], tc[1], tc[2]];

    // Groove intensity: off-beat lowest, beat 1 brightest (reduced variability)
    const grooveIntensity = 0.55 + this.beatGrooveCurrent * 0.25 + this.barGrooveCurrent * 0.25;

    // Spawn stars on note onsets
    for (const voice of music.activeVoices) {
      if (voice.midi < MIDI_LO || voice.midi >= MIDI_HI) continue;
      if (!voice.onset) continue;

      const loudnessFactor = 0.1 + this.loudness * 0.9;
      const c = samplePaletteColor(voice.pitchClass, 0.75);
      const noteIntensity = voice.velocity * loudnessFactor * grooveIntensity;

      this.stars.push({
        pitchClass: voice.pitchClass,
        progress: 0,
        alpha: 1.5 * noteIntensity,
        color: [c[0], c[1], c[2]],
        velocity: voice.velocity * grooveIntensity,
        startMidi: voice.midi,
        age: 0,
      });

      if (this.stars.length > this.maxStars) this.stars.shift();
    }

    // Beat 1 rings
    const beatArrival = music.beatArrival ?? 0;
    if (this.showRings && music.beatIndex === 0 && beatArrival > 0.3) {
      const hasRecentRing = this.beatRings.some(r => r.position < 0.1);
      if (!hasRecentRing) {
        this.beatRings.push({
          position: 0,
          alpha: 1.5,
          color: [this.anticipationColor[0], this.anticipationColor[1], this.anticipationColor[2]],
          speed: 0.08,
        });
        if (this.beatRings.length > 6) this.beatRings.shift();
      }
    }

    // Update beat rings
    for (let i = this.beatRings.length - 1; i >= 0; i--) {
      const ring = this.beatRings[i];
      ring.position += ring.speed * dt;
      ring.alpha *= Math.exp(-0.08 * dt);
      if (ring.position >= 1 || ring.alpha < 0.02) {
        this.beatRings.splice(i, 1);
      }
    }

    // Update stars
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const star = this.stars[i];
      star.progress += dt * 0.06;
      star.age += dt;
      const fadeRate = 0.08 + star.progress * 0.15;
      star.alpha *= Math.exp(-fadeRate * dt);

      if (star.progress >= 1 || star.alpha < 0.01) {
        this.stars.splice(i, 1);
      }
    }
  }

  render(): HTMLCanvasElement {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 + h * 0.04;
    const maxR = Math.min(w, h) / 2 * SPIRAL_RADIUS_SCALE;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Draw faint spiral spine
    ctx.beginPath();
    let first = true;
    for (let midi = MIDI_LO; midi < MIDI_HI; midi++) {
      const pos = spiralPos(midi, midi % 12, this.key, this.keyRotation, cx, cy, maxR, this.spiralTightness);
      if (first) {
        ctx.moveTo(pos.x, pos.y);
        first = false;
      } else {
        ctx.lineTo(pos.x, pos.y);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw beat rings
    for (const ring of this.beatRings) {
      const r = maxR * (1 - ring.position * 0.9);
      this.drawRing(ctx, cx, cy, r, ring.alpha, ring.color);
    }

    // Groove pulse factor (reduced variability, same average)
    const groovePulse = 0.85 + this.beatGrooveCurrent * 0.2 + this.barGrooveCurrent * 0.15;

    // Draw stars
    for (const star of this.stars) {
      const eased = 1 - Math.pow(1 - star.progress, 2);
      const effectiveMidi = MIDI_LO + (star.startMidi - MIDI_LO) * (1 - eased);

      // Spiral twist based on semitones traveled (quarter speed)
      const midiTraveled = star.startMidi - effectiveMidi;
      const spiralTwist = (midiTraveled / 48) * Math.PI * 2;

      const totalRotation = this.keyRotation + spiralTwist;
      const pos = spiralPos(effectiveMidi, star.pitchClass, this.key, totalRotation, cx, cy, maxR, this.spiralTightness);

      // Pulse size and alpha with groove
      const baseSize = 4 + star.velocity * 6 * (1 - eased * 0.85);
      const size = baseSize * groovePulse;
      const alpha = Math.min(1, star.alpha * this.intensity * groovePulse);

      if (alpha < 0.01) continue;

      // Subtle outer glow
      const glowSize = size * (1.5 + groovePulse * 0.5);
      const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowSize);
      grad.addColorStop(0, `rgba(${star.color[0]},${star.color[1]},${star.color[2]},${alpha.toFixed(3)})`);
      grad.addColorStop(0.4, `rgba(${star.color[0]},${star.color[1]},${star.color[2]},${(alpha * 0.6).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${star.color[0]},${star.color[1]},${star.color[2]},0)`);

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, glowSize, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Solid colored core
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${star.color[0]},${star.color[1]},${star.color[2]},${alpha.toFixed(3)})`;
      ctx.fill();

      // Bright center dot
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size * 0.4, 0, Math.PI * 2);
      const centerAlpha = Math.min(1, alpha * (0.8 + groovePulse * 0.4));
      ctx.fillStyle = `rgba(255,255,255,${centerAlpha.toFixed(3)})`;
      ctx.fill();
    }

    ctx.restore();
    return this.canvas;
  }

  private drawRing(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    radius: number,
    alpha: number,
    color: [number, number, number]
  ): void {
    if (alpha < 0.02 || radius <= 0) return;

    const [r, g, b] = color;
    const effectiveAlpha = alpha * this.intensity;
    const pulseWidth = 1 + alpha * 2;

    // Soft outer glow
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${r},${g},${b},${(effectiveAlpha * 0.3).toFixed(3)})`;
    ctx.lineWidth = pulseWidth + 4;
    ctx.stroke();

    // Main ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${r},${g},${b},${(effectiveAlpha * 0.6).toFixed(3)})`;
    ctx.lineWidth = pulseWidth;
    ctx.stroke();

    // Bright inner edge
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${(effectiveAlpha * 0.4).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  isReady(): boolean { return this.ready; }

  dispose(): void {
    this.ready = false;
    this.stars = [];
    this.beatRings = [];
    this.awake = false;
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'showRings', label: 'Beat Rings', type: 'toggle', value: this.showRings },
      { key: 'intensity', label: 'Intensity', type: 'range', value: this.intensity, min: 0.1, max: 2, step: 0.1 },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'showRings') this.showRings = value as boolean;
    if (key === 'intensity') this.intensity = value as number;
    if (key === 'spiralTightness') this.spiralTightness = value as number;
  }
}
