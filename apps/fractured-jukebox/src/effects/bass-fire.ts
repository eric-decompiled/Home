// --- Bass Fire Effect ---
// Simplified bass indicator - just the tip glow effect from Bass Clock.
// Follows chord root position on the spiral, pulses with bass energy.
// Features windup anticipation and burn trail.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import {
  samplePaletteColor, rgba, SPIRAL_RADIUS_SCALE, spiralPos,
  MAJOR_OFFSETS, MINOR_OFFSETS, MAJOR_DEGREES, MINOR_DEGREES, semitoneOffset,
  CHROMATIC_DEGREES_MAJOR, CHROMATIC_DEGREES_MINOR, TWO_PI, fastExp
} from './effect-utils.ts';
import { gsap } from '../animation.ts';

interface TrailPoint {
  angle: number;
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

  // Angle on outer circle (tweened)
  private fireAngle = -Math.PI / 2;

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
  private lastTrailAngle = -Math.PI / 2;

  // Config
  private showNumerals = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  // Resolution scale factor for 4K support
  private get resScale(): number {
    return Math.min(this.width, this.height) / 600;
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
    this.energy += music.drumEnergy * 0.6;
    this.energy *= fastExp(-2.5 * dt);

    // Groove curves
    const barAnticipation = music.barAnticipation ?? 0;
    const barArrival = music.barArrival ?? 0;
    const beatGroove = music.beatGroove ?? 0.5;
    this.anticipation = barAnticipation * 0.3 + barArrival * 0.25 + beatGroove * 0.08;
    this.energy += barArrival * 0.4;

    // Sample trail points as fire moves (angle-based)
    let angleDiff = this.fireAngle - this.lastTrailAngle;
    while (angleDiff > Math.PI) angleDiff -= TWO_PI;
    while (angleDiff < -Math.PI) angleDiff += TWO_PI;
    if (Math.abs(angleDiff) > 0.02) {
      this.trail.push({
        angle: this.fireAngle,
        time: this.time,
        r: this.colR,
        g: this.colG,
        b: this.colB,
      });
      if (this.trail.length > TRAIL_MAX) this.trail.shift();
      this.lastTrailAngle = this.fireAngle;
    }

    // Expire old trail points
    while (this.trail.length > 0 && this.time - this.trail[0].time > TRAIL_LIFETIME) {
      this.trail.shift();
    }

    // Follow chord root
    const pc = music.chordRoot >= 0 ? music.chordRoot : -1;

    // Get target angle from spiralPos (derive angle from position)
    const getAngleForPitchClass = (pitchClass: number): number => {
      const pos = spiralPos(113, pitchClass, this.key, this.keyRotation, 0, 0, 1);
      return Math.atan2(pos.y, pos.x);
    };

    // Initialize to tonic
    const shouldInit = !this.initializedToKey || (this.initializedKey !== this.key && this.initializedKey >= 0);
    if (shouldInit) {
      const tonicAngle = getAngleForPitchClass(this.key);

      if (!this.initializedToKey) {
        this.fireAngle = tonicAngle;
        this.lastTrailAngle = this.fireAngle;
      } else {
        // Animate to new tonic with shortest path
        let diff = tonicAngle - this.fireAngle;
        while (diff > Math.PI) diff -= TWO_PI;
        while (diff < -Math.PI) diff += TWO_PI;

        const beatDur = music.beatDuration || 0.5;
        gsap.to(this, {
          fireAngle: this.fireAngle + diff,
          duration: beatDur * 4.0,
          ease: 'power2.out',
          overwrite: true,
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

      const targetAngle = getAngleForPitchClass(pc);
      const beatDur = music.beatDuration || 0.5;

      // Shortest path rotation
      let diff = targetAngle - this.fireAngle;
      while (diff > Math.PI) diff -= TWO_PI;
      while (diff < -Math.PI) diff += TWO_PI;

      gsap.to(this, {
        fireAngle: this.fireAngle + diff,
        duration: beatDur * 4.0,
        ease: 'power2.out',
        overwrite: true,
      });

      gsap.fromTo(this,
        { brightness: 0.9 },
        { brightness: 0, duration: beatDur * 3.0, ease: 'power2.out', overwrite: 'auto' }
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
    const fadeRate = 4.6 / (music.barDuration ?? 2.0);
    for (const [pitchClass, fade] of this.chromaticFade) {
      const newFade = fade * fastExp(-fadeRate * dt);
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

    // Calculate center and radius for outer circle
    const cx = this.width / 2;
    const cy = this.height / 2;  // centered
    const minDim = Math.min(cx, cy);
    const spiralMaxR = minDim * SPIRAL_RADIUS_SCALE;
    const outerPos = spiralPos(113, 0, this.key, this.keyRotation, cx, cy, spiralMaxR);
    const r = outerPos.radius;

    // Fire position on outer circle
    const fireX = cx + Math.cos(this.fireAngle) * r;
    const fireY = cy + Math.sin(this.fireAngle) * r;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // --- Burn trail (arc along outer circle) ---
    if (this.trail.length >= 2) {
      ctx.lineCap = 'round';

      for (let i = 0; i < this.trail.length - 1; i++) {
        const pt = this.trail[i];
        const next = this.trail[i + 1];

        // Convert angles to positions
        const ptX = cx + Math.cos(pt.angle) * r;
        const ptY = cy + Math.sin(pt.angle) * r;
        const nextX = cx + Math.cos(next.angle) * r;
        const nextY = cy + Math.sin(next.angle) * r;

        // Position along trail: 0 = tail (oldest), 1 = head (newest)
        const t = i / (this.trail.length - 1);

        // Age-based fade
        const age = (this.time - pt.time) / TRAIL_LIFETIME;
        const ageFade = Math.pow(1 - age, 1.5);

        // Comet gradient: faint at tail, bright at head
        const cometFade = Math.pow(t, 0.6);

        // Width grows toward head
        const baseWidth = (2 + t * 6) * this.resScale;

        // Outer glow
        const glowAlpha = ageFade * cometFade * 0.2;
        ctx.beginPath();
        ctx.moveTo(ptX, ptY);
        ctx.lineTo(nextX, nextY);
        ctx.strokeStyle = rgba(pt.r, pt.g, pt.b, glowAlpha);
        ctx.lineWidth = baseWidth * 2.5;
        ctx.stroke();

        // Core
        const coreAlpha = ageFade * cometFade * 0.5;
        ctx.beginPath();
        ctx.moveTo(ptX, ptY);
        ctx.lineTo(nextX, nextY);
        ctx.strokeStyle = rgba(pt.r, pt.g, pt.b, coreAlpha);
        ctx.lineWidth = baseWidth;
        ctx.stroke();

        // Hot inner core near head
        if (t > 0.5) {
          const hotAlpha = ageFade * Math.pow((t - 0.5) / 0.5, 2) * 0.4;
          const hotR = Math.min(255, pt.r + 60);
          const hotG = Math.min(255, pt.g + 60);
          const hotB = Math.min(255, pt.b + 60);
          ctx.beginPath();
          ctx.moveTo(ptX, ptY);
          ctx.lineTo(nextX, nextY);
          ctx.strokeStyle = rgba(hotR, hotG, hotB, hotAlpha);
          ctx.lineWidth = baseWidth * 0.4;
          ctx.stroke();
        }
      }
    }

    // Fire glow effect - large and diffuse
    const orbSz = (20 + this.brightness * 30 + this.energy * 18 + this.anticipation * 22) * this.resScale;
    const orbA = 0.2 + this.brightness * 0.3 + this.anticipation * 0.2 + this.energy * 0.15;

    // Outer glow - very large, soft
    const outerGrd = ctx.createRadialGradient(fireX, fireY, 0, fireX, fireY, orbSz * 5);
    outerGrd.addColorStop(0, rgba(R, G, B, orbA * 0.15));
    outerGrd.addColorStop(0.4, rgba(R, G, B, orbA * 0.08));
    outerGrd.addColorStop(0.7, rgba(R, G, B, orbA * 0.03));
    outerGrd.addColorStop(1, rgba(R, G, B, 0));
    ctx.fillStyle = outerGrd;
    ctx.fillRect(fireX - orbSz * 5, fireY - orbSz * 5, orbSz * 10, orbSz * 10);

    // Core glow - larger, more transparent
    const coreGrd = ctx.createRadialGradient(fireX, fireY, 0, fireX, fireY, orbSz * 2.5);
    coreGrd.addColorStop(0, rgba(255, 255, 255, orbA * 0.35));
    coreGrd.addColorStop(0.2, rgba(R, G, B, orbA * 0.25));
    coreGrd.addColorStop(0.6, rgba(R, G, B, orbA * 0.1));
    coreGrd.addColorStop(1, rgba(R, G, B, 0));
    ctx.fillStyle = coreGrd;
    ctx.fillRect(fireX - orbSz * 2.5, fireY - orbSz * 2.5, orbSz * 5, orbSz * 5);

    // Hot center point - smaller, softer
    const centerSz = 2 + this.energy * 3 + this.brightness * 2;
    ctx.beginPath();
    ctx.arc(fireX, fireY, centerSz, 0, TWO_PI);
    ctx.fillStyle = rgba(255, 255, 255, 0.25 + this.energy * 0.25 + this.brightness * 0.2);
    ctx.fill();

    // --- Roman numeral markers ---
    const diatonicOffsets = this.keyMode === 'minor' ? MINOR_OFFSETS : MAJOR_OFFSETS;
    const degreeMap = this.keyMode === 'minor' ? MINOR_DEGREES : MAJOR_DEGREES;

    // Inner ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TWO_PI);
    ctx.strokeStyle = `rgba(${R},${G},${B},0.08)`;
    ctx.lineWidth = 2 * this.resScale;
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

      if (numeral && this.showNumerals) {
        const fontSize = Math.max(11 * this.resScale, Math.round(r * 0.1));

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

        ctx.fillStyle = rgba(tc[0], tc[1], tc[2], tickAlpha);
        ctx.fillText(numeral, 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
      } else if (chromaticNumeral && this.showNumerals && (isCurrent || chromaticFadeValue > 0)) {
        const fontSize = Math.max(10 * this.resScale, Math.round(r * 0.09));
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

        ctx.fillStyle = rgba(tc[0], tc[1], tc[2], fadeAlpha);
        ctx.fillText(chromaticNumeral, 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
      } else {
        // Draw dot instead of numeral
        ctx.beginPath();
        ctx.arc(tx, ty, (isCurrent ? 3 : 2) * this.resScale, 0, TWO_PI);
        ctx.fillStyle = rgba(tc[0], tc[1], tc[2], tickAlpha);
        ctx.fill();
      }

      // Glow on current
      if (isCurrent && this.brightness > 0.05) {
        const glowR = r * 0.08;
        const grd = ctx.createRadialGradient(tx, ty, 0, tx, ty, glowR);
        grd.addColorStop(0, rgba(tc[0], tc[1], tc[2], this.brightness * 0.6));
        grd.addColorStop(1, rgba(tc[0], tc[1], tc[2], 0));
        ctx.fillStyle = grd;
        ctx.fillRect(tx - glowR, ty - glowR, glowR * 2, glowR * 2);
      }
    }

    // Smooth hub size driven by groove (like bass clock, but larger base)
    const hubSz = 14 + this.energy * 4 + this.anticipation * 6;

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, hubSz * 1.6, 0, TWO_PI);
    ctx.strokeStyle = rgba(R, G, B, 0.1 + this.energy * 0.1);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Wide outer glow (gentle)
    const outerHubGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, hubSz * 2.8);
    outerHubGrd.addColorStop(0, rgba(R, G, B, 0.08 + this.energy * 0.06 + this.anticipation * 0.08));
    outerHubGrd.addColorStop(0.5, rgba(R, G, B, 0.03 + this.energy * 0.02));
    outerHubGrd.addColorStop(1, rgba(R, G, B, 0));
    ctx.fillStyle = outerHubGrd;
    ctx.fillRect(cx - hubSz * 3, cy - hubSz * 3, hubSz * 6, hubSz * 6);

    // Inner radial gradient glow
    const hubGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, hubSz * 1.8);
    hubGrd.addColorStop(0, rgba(255, 255, 255, 0.15 + this.energy * 0.15 + this.anticipation * 0.1));
    hubGrd.addColorStop(0.5, rgba(R, G, B, 0.1 + this.energy * 0.06));
    hubGrd.addColorStop(1, rgba(R, G, B, 0));
    ctx.fillStyle = hubGrd;
    ctx.fillRect(cx - hubSz * 2, cy - hubSz * 2, hubSz * 4, hubSz * 4);

    // Center hot point
    ctx.beginPath();
    ctx.arc(cx, cy, 4 + this.energy * 2 + this.anticipation * 2, 0, TWO_PI);
    ctx.fillStyle = rgba(255, 255, 255, 0.25 + this.energy * 0.2 + this.anticipation * 0.15);
    ctx.fill();

    ctx.restore();
    return this.canvas;
  }

  isReady(): boolean { return this.ready; }

  dispose(): void {
    this.ready = false;
    this.brightness = 0;
    this.energy = 0;
    this.trail = [];
    this.fireAngle = -Math.PI / 2;
    this.lastTrailAngle = -Math.PI / 2;
    this.initializedToKey = false;
    this.initializedKey = -1;
    this.lastPitchClass = -1;
  }

  getConfig(): EffectConfig[] {
    return [];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return { showNumerals: false };
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'showNumerals') this.showNumerals = value as boolean;
  }
}
