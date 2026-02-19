// --- Melody Fire Effect ---
// Fire effect for melody - like bass-fire but follows individual melody notes.
// Uses compass physics (spring-damper) for responsive, bouncy motion.
// Smaller and sharper than bass-fire.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { samplePaletteColor, SPIRAL_RADIUS_SCALE, spiralPos } from './effect-utils.ts';
import { gsap } from '../animation.ts';

interface TrailPoint {
  angle: number;
  time: number;
  r: number;
  g: number;
  b: number;
}

const TRAIL_MAX = 25;
const TRAIL_LIFETIME = 0.8;  // Shorter trail than bass-fire

export class MelodyFireEffect implements VisualEffect {
  readonly id = 'melody-fire';
  readonly name = 'Melody Fire';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'screen';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  private key = 0;
  private keyRotation = 0;
  private lastPitchClass = -1;
  private lastMidiNote = -1;

  // Compass physics
  private fireAngle = -Math.PI / 2;
  private targetAngle = -Math.PI / 2;
  private angularVelocity = 0;

  // Colors - target (note being attracted to) and bearing (current position)
  private targetR = 200;
  private targetG = 150;
  private targetB = 255;
  private bearingR = 200;
  private bearingG = 150;
  private bearingB = 255;

  // Animation state
  private brightness = 0;
  private energy = 0;
  private anticipation = 0;
  private time = 0;

  // Burn trail
  private trail: TrailPoint[] = [];
  private lastTrailAngle = -Math.PI / 2;

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

    // Energy from drums (lighter response than bass)
    this.energy += music.drumEnergy * 0.3;
    this.energy *= Math.exp(-3.0 * dt);

    // Groove curves (beat-level for melody)
    const beatAnticipation = music.beatAnticipation ?? 0;
    const beatArrival = music.beatArrival ?? 0;
    this.anticipation = beatAnticipation * 0.25 + beatArrival * 0.2;
    this.energy += beatArrival * 0.2;

    // Follow melody notes
    if (music.melodyOnset && music.melodyPitchClass >= 0 && music.melodyVelocity > 0) {
      const pc = music.melodyPitchClass;
      const midiNote = music.melodyMidiNote;
      this.lastPitchClass = pc;

      // Target color
      const c = samplePaletteColor(pc, 0.65);
      this.targetR = c[0];
      this.targetG = c[1];
      this.targetB = c[2];

      // Calculate target angle using spiralPos
      const pos = spiralPos(113, pc, this.key, this.keyRotation, 0, 0, 1);
      const newAngle = Math.atan2(pos.y, pos.x);

      // Direction based on MIDI pitch (ascending vs descending)
      let diff = newAngle - this.fireAngle;
      while (diff > Math.PI * 2) diff -= Math.PI * 2;
      while (diff < -Math.PI * 2) diff += Math.PI * 2;

      if (this.lastMidiNote >= 0 && midiNote >= 0) {
        const ascending = midiNote >= this.lastMidiNote;
        if (ascending) {
          if (diff < 0) diff += Math.PI * 2;
        } else {
          if (diff > 0) diff -= Math.PI * 2;
        }
      } else {
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
      }

      this.targetAngle = this.fireAngle + diff;
      this.lastMidiNote = midiNote;

      // Brightness pulse
      const beatDur = music.beatDuration || 0.5;
      gsap.fromTo(this,
        { brightness: 0.9 },
        { brightness: 0, duration: beatDur * 1.5, ease: 'power2.out', overwrite: 'auto' }
      );
    }

    // === COMPASS PHYSICS ===
    let angleDiff = this.targetAngle - this.fireAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Slightly stiffer spring for snappier response
    const springK = 15.0;
    const springForce = angleDiff * springK;
    const damping = 5.5;
    const dampingForce = -this.angularVelocity * damping;

    this.angularVelocity += (springForce + dampingForce) * dt;
    this.fireAngle += this.angularVelocity * dt;

    // Calculate bearing color from current angle
    let bearingAngle = this.fireAngle + Math.PI / 2;
    while (bearingAngle < 0) bearingAngle += Math.PI * 2;
    while (bearingAngle >= Math.PI * 2) bearingAngle -= Math.PI * 2;
    const bearingPC = Math.floor((bearingAngle / (Math.PI * 2)) * 12) % 12;
    const bearingCol = samplePaletteColor(bearingPC, 0.65);
    this.bearingR = bearingCol[0];
    this.bearingG = bearingCol[1];
    this.bearingB = bearingCol[2];

    // Sample trail points (uses bearing color)
    const trailDiff = Math.abs(this.fireAngle - this.lastTrailAngle);
    if (trailDiff > 0.03) {
      this.trail.push({
        angle: this.fireAngle,
        time: this.time,
        r: this.bearingR,
        g: this.bearingG,
        b: this.bearingB,
      });
      if (this.trail.length > TRAIL_MAX) this.trail.shift();
      this.lastTrailAngle = this.fireAngle;
    }

    // Expire old trail points
    while (this.trail.length > 0 && this.time - this.trail[0].time > TRAIL_LIFETIME) {
      this.trail.shift();
    }
  }

  render(): HTMLCanvasElement {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Body uses bearing color, tip uses target color
    const R = this.bearingR, G = this.bearingG, B = this.bearingB;
    const tipR = this.targetR, tipG = this.targetG, tipB = this.targetB;

    const cx = this.width / 2;
    const cy = this.height / 2;
    const minDim = Math.min(cx, cy);
    const spiralMaxR = minDim * SPIRAL_RADIUS_SCALE;
    const outerPos = spiralPos(113, 0, this.key, this.keyRotation, cx, cy, spiralMaxR);
    const r = outerPos.radius;

    // Fire position
    const fireX = cx + Math.cos(this.fireAngle) * r;
    const fireY = cy + Math.sin(this.fireAngle) * r;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // --- Burn trail (sharper, shorter) ---
    if (this.trail.length >= 2) {
      ctx.lineCap = 'round';

      for (let i = 0; i < this.trail.length - 1; i++) {
        const pt = this.trail[i];
        const next = this.trail[i + 1];

        const ptX = cx + Math.cos(pt.angle) * r;
        const ptY = cy + Math.sin(pt.angle) * r;
        const nextX = cx + Math.cos(next.angle) * r;
        const nextY = cy + Math.sin(next.angle) * r;

        const t = i / (this.trail.length - 1);
        const age = (this.time - pt.time) / TRAIL_LIFETIME;
        const ageFade = Math.pow(1 - age, 2);  // Sharper fade
        const cometFade = Math.pow(t, 0.7);

        // Thinner width than bass-fire
        const baseWidth = 1 + t * 4;

        // Outer glow
        const glowAlpha = ageFade * cometFade * 0.18;
        ctx.beginPath();
        ctx.moveTo(ptX, ptY);
        ctx.lineTo(nextX, nextY);
        ctx.strokeStyle = `rgba(${pt.r},${pt.g},${pt.b},${glowAlpha.toFixed(3)})`;
        ctx.lineWidth = baseWidth * 2;
        ctx.stroke();

        // Core
        const coreAlpha = ageFade * cometFade * 0.45;
        ctx.beginPath();
        ctx.moveTo(ptX, ptY);
        ctx.lineTo(nextX, nextY);
        ctx.strokeStyle = `rgba(${pt.r},${pt.g},${pt.b},${coreAlpha.toFixed(3)})`;
        ctx.lineWidth = baseWidth;
        ctx.stroke();

        // Hot inner core near head
        if (t > 0.6) {
          const hotAlpha = ageFade * Math.pow((t - 0.6) / 0.4, 2) * 0.5;
          const hotR = Math.min(255, pt.r + 80);
          const hotG = Math.min(255, pt.g + 80);
          const hotB = Math.min(255, pt.b + 80);
          ctx.beginPath();
          ctx.moveTo(ptX, ptY);
          ctx.lineTo(nextX, nextY);
          ctx.strokeStyle = `rgba(${hotR},${hotG},${hotB},${hotAlpha.toFixed(3)})`;
          ctx.lineWidth = baseWidth * 0.3;
          ctx.stroke();
        }
      }
    }

    // --- Fire glow (smaller, sharper than bass-fire) ---
    const orbSz = 12 + this.brightness * 20 + this.energy * 12 + this.anticipation * 14;
    const orbA = 0.25 + this.brightness * 0.35 + this.anticipation * 0.2 + this.energy * 0.15;

    // Outer glow - target color (attraction)
    const outerGrd = ctx.createRadialGradient(fireX, fireY, 0, fireX, fireY, orbSz * 3);
    outerGrd.addColorStop(0, `rgba(${tipR},${tipG},${tipB},${(orbA * 0.2).toFixed(3)})`);
    outerGrd.addColorStop(0.4, `rgba(${tipR},${tipG},${tipB},${(orbA * 0.1).toFixed(3)})`);
    outerGrd.addColorStop(0.7, `rgba(${tipR},${tipG},${tipB},${(orbA * 0.03).toFixed(3)})`);
    outerGrd.addColorStop(1, `rgba(${tipR},${tipG},${tipB},0)`);
    ctx.fillStyle = outerGrd;
    ctx.fillRect(fireX - orbSz * 3, fireY - orbSz * 3, orbSz * 6, orbSz * 6);

    // Core glow - bearing color (current position)
    const coreGrd = ctx.createRadialGradient(fireX, fireY, 0, fireX, fireY, orbSz * 1.8);
    coreGrd.addColorStop(0, `rgba(255,255,255,${(orbA * 0.45).toFixed(3)})`);
    coreGrd.addColorStop(0.15, `rgba(${R},${G},${B},${(orbA * 0.35).toFixed(3)})`);
    coreGrd.addColorStop(0.5, `rgba(${R},${G},${B},${(orbA * 0.12).toFixed(3)})`);
    coreGrd.addColorStop(1, `rgba(${R},${G},${B},0)`);
    ctx.fillStyle = coreGrd;
    ctx.fillRect(fireX - orbSz * 1.8, fireY - orbSz * 1.8, orbSz * 3.6, orbSz * 3.6);

    // Hot center point - smaller, sharper
    const centerSz = 1.5 + this.energy * 2 + this.brightness * 1.5;
    ctx.beginPath();
    ctx.arc(fireX, fireY, centerSz, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${(0.35 + this.energy * 0.3 + this.brightness * 0.25).toFixed(3)})`;
    ctx.fill();

    // --- Outer ring (subtle) ---
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${R},${G},${B},0.04)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // --- Note markers (dots only, no numerals - cleaner look) ---
    for (let i = 0; i < 12; i++) {
      const pos = spiralPos(113, i, this.key, this.keyRotation, cx, cy, spiralMaxR);
      const tickAngle = Math.atan2(pos.y - cy, pos.x - cx);
      const tx = cx + Math.cos(tickAngle) * r;
      const ty = cy + Math.sin(tickAngle) * r;

      const isCurrent = i === this.lastPitchClass;
      const tc = samplePaletteColor(i, 0.6);
      const tickAlpha = isCurrent ? 0.6 + this.brightness * 0.3 : 0.12;

      ctx.beginPath();
      ctx.arc(tx, ty, isCurrent ? 2.5 : 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${tc[0]},${tc[1]},${tc[2]},${tickAlpha.toFixed(3)})`;
      ctx.fill();

      // Glow on current
      if (isCurrent && this.brightness > 0.05) {
        const glowR = r * 0.05;
        const grd = ctx.createRadialGradient(tx, ty, 0, tx, ty, glowR);
        grd.addColorStop(0, `rgba(${tc[0]},${tc[1]},${tc[2]},${(this.brightness * 0.5).toFixed(3)})`);
        grd.addColorStop(1, `rgba(${tc[0]},${tc[1]},${tc[2]},0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(tx - glowR, ty - glowR, glowR * 2, glowR * 2);
      }
    }

    // --- Small center hub ---
    const hubSz = 6 + this.energy * 2 + this.anticipation * 3;

    const hubGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, hubSz * 1.5);
    hubGrd.addColorStop(0, `rgba(255,255,255,${(0.12 + this.energy * 0.12).toFixed(3)})`);
    hubGrd.addColorStop(0.5, `rgba(${R},${G},${B},${(0.06 + this.energy * 0.04).toFixed(3)})`);
    hubGrd.addColorStop(1, `rgba(${R},${G},${B},0)`);
    ctx.fillStyle = hubGrd;
    ctx.fillRect(cx - hubSz * 1.5, cy - hubSz * 1.5, hubSz * 3, hubSz * 3);

    ctx.beginPath();
    ctx.arc(cx, cy, 2 + this.energy, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${(0.2 + this.energy * 0.2).toFixed(3)})`;
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
    this.targetAngle = -Math.PI / 2;
    this.angularVelocity = 0;
    this.lastTrailAngle = -Math.PI / 2;
    this.lastPitchClass = -1;
    this.lastMidiNote = -1;
  }

  getConfig(): EffectConfig[] {
    return [];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return {};
  }

  setConfigValue(_key: string, _value: number | string | boolean): void {
    // No configs
  }
}
