// --- Bass Fire Effect ---
// Simplified bass indicator - just the tip glow effect from Bass Clock.
// Follows chord root position on the spiral, pulses with bass energy.
// Features windup anticipation and burn trail.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import {
  samplePaletteColor, SPIRAL_RADIUS_SCALE, spiralPos,
  MAJOR_OFFSETS, MINOR_OFFSETS, MAJOR_DEGREES, MINOR_DEGREES, semitoneOffset,
  CHROMATIC_DEGREES_MAJOR, CHROMATIC_DEGREES_MINOR
} from './effect-utils.ts';
import { gsap } from '../animation.ts';

interface TrailPoint {
  x: number;
  y: number;
  time: number;
  r: number;
  g: number;
  b: number;
}

const TRAIL_MAX = 40;
const TRAIL_LIFETIME = 1.5;  // seconds

export class BassFireEffect implements VisualEffect {
  readonly id = 'bass-fire';
  readonly name = 'Bass Fire';
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
  private lastPitchClass = -1;
  private chromaticFade: Map<number, number> = new Map();
  private initializedToKey = false;
  private initializedKey = -1;

  // Position (tweened)
  private fireX = 0;
  private fireY = 0;

  // Color
  private colR = 150;
  private colG = 100;
  private colB = 200;

  // Animation state
  private brightness = 0;
  private energy = 0;
  private anticipation = 0;
  private time = 0;

  // Burn trail
  private trail: TrailPoint[] = [];
  private lastTrailX = 0;
  private lastTrailY = 0;

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

    // Energy from drums
    if (music.kick) this.energy += 0.6;
    if (music.snare) this.energy += 0.2;
    this.energy *= Math.exp(-2.5 * dt);

    // Groove curves
    const barAnticipation = music.barAnticipation ?? 0;
    const barArrival = music.barArrival ?? 0;
    const beatGroove = music.beatGroove ?? 0.5;
    this.anticipation = barAnticipation * 0.3 + barArrival * 0.25 + beatGroove * 0.08;
    this.energy += barArrival * 0.4;

    // Sample trail points as fire moves
    const dx = this.fireX - this.lastTrailX;
    const dy = this.fireY - this.lastTrailY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 3) {
      this.trail.push({
        x: this.fireX,
        y: this.fireY,
        time: this.time,
        r: this.colR,
        g: this.colG,
        b: this.colB,
      });
      if (this.trail.length > TRAIL_MAX) this.trail.shift();
      this.lastTrailX = this.fireX;
      this.lastTrailY = this.fireY;
    }

    // Expire old trail points
    while (this.trail.length > 0 && this.time - this.trail[0].time > TRAIL_LIFETIME) {
      this.trail.shift();
    }

    // Follow chord root
    const pc = music.chordRoot >= 0 ? music.chordRoot : -1;

    const cx = this.width / 2;
    const cy = this.height / 2 + this.height * 0.04;
    const minDim = Math.min(cx, cy);
    const spiralMaxR = minDim * SPIRAL_RADIUS_SCALE;

    // Initialize to tonic
    const shouldInit = !this.initializedToKey || (this.initializedKey !== this.key && this.initializedKey >= 0);
    if (shouldInit) {
      const tonicPos = spiralPos(113, this.key, this.key, this.keyRotation, cx, cy, spiralMaxR);

      if (!this.initializedToKey) {
        this.fireX = tonicPos.x;
        this.fireY = tonicPos.y;
        this.lastTrailX = this.fireX;
        this.lastTrailY = this.fireY;
      } else {
        const beatDur = music.beatDuration || 0.5;
        // Windup: pull back opposite to movement direction
        const diffX = tonicPos.x - this.fireX;
        const diffY = tonicPos.y - this.fireY;
        const windupX = this.fireX - diffX / 24;
        const windupY = this.fireY - diffY / 24;

        const tl = gsap.timeline({ overwrite: true });
        tl.to(this, {
          fireX: windupX,
          fireY: windupY,
          duration: beatDur * 0.5,
          ease: 'power2.out',
        });
        tl.to(this, {
          fireX: tonicPos.x,
          fireY: tonicPos.y,
          duration: beatDur * 1.2,
          ease: 'power2.out',
        });
      }

      const c = samplePaletteColor(this.key, 0.7);
      this.colR = c[0];
      this.colG = c[1];
      this.colB = c[2];
      this.initializedToKey = true;
      this.initializedKey = this.key;
      // Don't set lastPitchClass here - let the first chord trigger the effect
      // this.lastPitchClass stays at -1 so first note lights up
    } else if (pc >= 0 && pc !== this.lastPitchClass) {
      this.lastPitchClass = pc;

      const c = samplePaletteColor(pc, 0.7);
      this.colR = c[0];
      this.colG = c[1];
      this.colB = c[2];

      const targetPos = spiralPos(113, pc, this.key, this.keyRotation, cx, cy, spiralMaxR);
      const beatDur = music.beatDuration || 0.5;

      // Windup: pull back opposite to movement direction
      const diffX = targetPos.x - this.fireX;
      const diffY = targetPos.y - this.fireY;
      const windupX = this.fireX - diffX / 24;
      const windupY = this.fireY - diffY / 24;

      const tl = gsap.timeline({ overwrite: true });
      tl.to(this, {
        fireX: windupX,
        fireY: windupY,
        duration: beatDur * 0.5,
        ease: 'power2.out',
      });
      tl.to(this, {
        fireX: targetPos.x,
        fireY: targetPos.y,
        duration: beatDur * 1.2,
        ease: 'power2.out',
      });

      gsap.fromTo(this,
        { brightness: 0.9 },
        { brightness: 0, duration: beatDur * 2.0, ease: 'power2.out', overwrite: 'auto' }
      );
    }

    // Track chromatic (non-key) numeral fades
    const diatonicOffsets = this.keyMode === 'minor' ? MINOR_OFFSETS : MAJOR_OFFSETS;
    if (pc >= 0) {
      const semi = semitoneOffset(pc, this.key);
      if (!diatonicOffsets.has(semi)) {
        this.chromaticFade.set(pc, 1.0);
      }
    }
    // Decay all chromatic fades over one bar
    const barDuration = (music.beatDuration ?? 0.5) * (music.beatsPerBar ?? 4);
    const fadeRate = 4.6 / barDuration;
    for (const [pitchClass, fade] of this.chromaticFade) {
      const newFade = fade * Math.exp(-fadeRate * dt);
      if (newFade < 0.01) {
        this.chromaticFade.delete(pitchClass);
      } else {
        this.chromaticFade.set(pitchClass, newFade);
      }
    }
  }

  render(): HTMLCanvasElement {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const R = this.colR, G = this.colG, B = this.colB;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // --- Burn trail ---
    if (this.trail.length >= 2) {
      ctx.lineCap = 'round';

      for (let i = 0; i < this.trail.length - 1; i++) {
        const pt = this.trail[i];
        const next = this.trail[i + 1];

        // Position along trail: 0 = tail (oldest), 1 = head (newest)
        const t = i / (this.trail.length - 1);

        // Age-based fade
        const age = (this.time - pt.time) / TRAIL_LIFETIME;
        const ageFade = Math.pow(1 - age, 1.5);

        // Comet gradient: faint at tail, bright at head
        const cometFade = Math.pow(t, 0.6);

        // Width grows toward head
        const baseWidth = 2 + t * 6;

        // Outer glow
        const glowAlpha = ageFade * cometFade * 0.2;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(next.x, next.y);
        ctx.strokeStyle = `rgba(${pt.r},${pt.g},${pt.b},${glowAlpha.toFixed(3)})`;
        ctx.lineWidth = baseWidth * 2.5;
        ctx.stroke();

        // Core
        const coreAlpha = ageFade * cometFade * 0.5;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(next.x, next.y);
        ctx.strokeStyle = `rgba(${pt.r},${pt.g},${pt.b},${coreAlpha.toFixed(3)})`;
        ctx.lineWidth = baseWidth;
        ctx.stroke();

        // Hot inner core near head
        if (t > 0.5) {
          const hotAlpha = ageFade * Math.pow((t - 0.5) / 0.5, 2) * 0.4;
          const hotR = Math.min(255, pt.r + 60);
          const hotG = Math.min(255, pt.g + 60);
          const hotB = Math.min(255, pt.b + 60);
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(next.x, next.y);
          ctx.strokeStyle = `rgba(${hotR},${hotG},${hotB},${hotAlpha.toFixed(3)})`;
          ctx.lineWidth = baseWidth * 0.4;
          ctx.stroke();
        }
      }
    }

    // Fire glow effect
    const orbSz = 12 + this.brightness * 18 + this.energy * 10 + this.anticipation * 14;
    const orbA = 0.35 + this.brightness * 0.5 + this.anticipation * 0.3 + this.energy * 0.2;

    // Outer glow
    const outerGrd = ctx.createRadialGradient(this.fireX, this.fireY, 0, this.fireX, this.fireY, orbSz * 3);
    outerGrd.addColorStop(0, `rgba(${R},${G},${B},${(orbA * 0.3).toFixed(3)})`);
    outerGrd.addColorStop(0.5, `rgba(${R},${G},${B},${(orbA * 0.1).toFixed(3)})`);
    outerGrd.addColorStop(1, `rgba(${R},${G},${B},0)`);
    ctx.fillStyle = outerGrd;
    ctx.fillRect(this.fireX - orbSz * 3, this.fireY - orbSz * 3, orbSz * 6, orbSz * 6);

    // Core glow
    const coreGrd = ctx.createRadialGradient(this.fireX, this.fireY, 0, this.fireX, this.fireY, orbSz * 1.5);
    coreGrd.addColorStop(0, `rgba(255,255,255,${(orbA * 0.6).toFixed(3)})`);
    coreGrd.addColorStop(0.3, `rgba(${R},${G},${B},${(orbA * 0.4).toFixed(3)})`);
    coreGrd.addColorStop(1, `rgba(${R},${G},${B},0)`);
    ctx.fillStyle = coreGrd;
    ctx.fillRect(this.fireX - orbSz * 1.5, this.fireY - orbSz * 1.5, orbSz * 3, orbSz * 3);

    // Hot center point
    const centerSz = 3 + this.energy * 4 + this.brightness * 3;
    ctx.beginPath();
    ctx.arc(this.fireX, this.fireY, centerSz, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${(0.4 + this.energy * 0.4 + this.brightness * 0.3).toFixed(3)})`;
    ctx.fill();

    // Center hub glow (like bass clock) - at canvas center
    const cx = this.width / 2;
    const cy = this.height / 2 + this.height * 0.04;
    const minDim = Math.min(cx, cy);
    const spiralMaxR = minDim * SPIRAL_RADIUS_SCALE;
    const outerPos = spiralPos(113, 0, this.key, this.keyRotation, cx, cy, spiralMaxR);
    const r = outerPos.radius;

    // --- Roman numeral markers ---
    const diatonicOffsets = this.keyMode === 'minor' ? MINOR_OFFSETS : MAJOR_OFFSETS;
    const degreeMap = this.keyMode === 'minor' ? MINOR_DEGREES : MAJOR_DEGREES;

    // Inner ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${R},${G},${B},0.08)`;
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < 12; i++) {
      const semitones = semitoneOffset(i, this.key);
      const inKey = diatonicOffsets.has(semitones);
      const isCurrent = i === this.lastPitchClass;
      const tc = samplePaletteColor(i, 0.6);
      const tickAlpha = isCurrent ? 0.7 + this.brightness * 0.3
        : inKey ? 0.25 : 0.1;

      // Get position from spiralPos for numeral placement
      const pos = spiralPos(113, i, this.key, this.keyRotation, cx, cy, spiralMaxR);
      const tickAngle = Math.atan2(pos.y - cy, pos.x - cx);
      const tx = cx + Math.cos(tickAngle) * r;
      const ty = cy + Math.sin(tickAngle) * r;

      const numeral = degreeMap[semitones];
      const chromaticDegreeMap = this.keyMode === 'minor' ? CHROMATIC_DEGREES_MINOR : CHROMATIC_DEGREES_MAJOR;
      const chromaticNumeral = chromaticDegreeMap[semitones];
      const chromaticFadeValue = this.chromaticFade.get(i) ?? 0;

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
      } else if (chromaticNumeral && (isCurrent || chromaticFadeValue > 0)) {
        const fontSize = Math.max(10, Math.round(r * 0.09));
        const fadeAlpha = isCurrent ? 0.6 + this.brightness * 0.3 : chromaticFadeValue * 0.5;

        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(tickAngle + Math.PI / 2);
        ctx.font = `${isCurrent ? 'bold ' : ''}${fontSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (isCurrent && this.brightness > 0.05) {
          ctx.shadowColor = `rgba(${tc[0]},${tc[1]},${tc[2]},${(this.brightness * 0.5).toFixed(3)})`;
          ctx.shadowBlur = 12;
        }

        ctx.fillStyle = `rgba(${tc[0]},${tc[1]},${tc[2]},${fadeAlpha.toFixed(3)})`;
        ctx.fillText(chromaticNumeral, 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(tx, ty, isCurrent ? 3 : 2, 0, Math.PI * 2);
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

    // Smooth hub size driven by groove (like bass clock, but larger base)
    const hubSz = 14 + this.energy * 4 + this.anticipation * 6;

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, hubSz * 1.6, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${R},${G},${B},${(0.1 + this.energy * 0.1).toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Wide outer glow (gentle)
    const outerHubGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, hubSz * 2.8);
    outerHubGrd.addColorStop(0, `rgba(${R},${G},${B},${(0.08 + this.energy * 0.06 + this.anticipation * 0.08).toFixed(3)})`);
    outerHubGrd.addColorStop(0.5, `rgba(${R},${G},${B},${(0.03 + this.energy * 0.02).toFixed(3)})`);
    outerHubGrd.addColorStop(1, `rgba(${R},${G},${B},0)`);
    ctx.fillStyle = outerHubGrd;
    ctx.fillRect(cx - hubSz * 3, cy - hubSz * 3, hubSz * 6, hubSz * 6);

    // Inner radial gradient glow
    const hubGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, hubSz * 1.8);
    hubGrd.addColorStop(0, `rgba(255,255,255,${(0.15 + this.energy * 0.15 + this.anticipation * 0.1).toFixed(3)})`);
    hubGrd.addColorStop(0.5, `rgba(${R},${G},${B},${(0.1 + this.energy * 0.06).toFixed(3)})`);
    hubGrd.addColorStop(1, `rgba(${R},${G},${B},0)`);
    ctx.fillStyle = hubGrd;
    ctx.fillRect(cx - hubSz * 2, cy - hubSz * 2, hubSz * 4, hubSz * 4);

    // Center hot point
    ctx.beginPath();
    ctx.arc(cx, cy, 4 + this.energy * 2 + this.anticipation * 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${(0.25 + this.energy * 0.2 + this.anticipation * 0.15).toFixed(3)})`;
    ctx.fill();

    ctx.restore();
    return this.canvas;
  }

  isReady(): boolean { return this.ready; }

  dispose(): void {
    this.ready = false;
    this.brightness = 0;
    this.energy = 0;
    this.initializedToKey = false;
    this.initializedKey = -1;
    this.lastPitchClass = -1;
  }

  getConfig(): EffectConfig[] {
    return [];
  }

  setConfigValue(_key: string, _value: number | string | boolean): void {
    // No config options
  }
}
