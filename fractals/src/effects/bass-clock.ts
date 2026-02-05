// --- Bass Clock Hand Effect ---
// A simpler, heavier clock hand for bass notes.
// Inner position (smaller radius) to complement the melody clock.
// Sturdy design with counterweight - like a station clock or industrial gauge.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { samplePaletteColor, MAJOR_OFFSETS, MINOR_OFFSETS, MAJOR_DEGREES, MINOR_DEGREES, semitoneOffset } from './effect-utils.ts';
import { gsap } from '../animation.ts';

interface ArcSegment {
  angle: number;
  time: number;
  r: number;
  g: number;
  b: number;
}

const ARC_TRAIL_MAX = 30;
const ARC_TRAIL_LIFETIME = 2.5;

export class BassClockEffect implements VisualEffect {
  readonly id = 'bass-clock';
  readonly name = 'Bass Clock';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'screen';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  private handAngle = -Math.PI / 2;
  private targetAngle = -Math.PI / 2;
  private handBrightness = 0;
  private key = 0;
  private keyMode: 'major' | 'minor' = 'major';
  private keyRotation = 0;  // animated rotation offset for modulations
  private lastPitchClass = -1;
  private handLength = 0.95; // Fixed at outer layer
  private colR = 150;
  private colG = 100;
  private colB = 200;
  private time = 0;

  private arcTrail: ArcSegment[] = [];
  private lastTrailAngle = -Math.PI / 2;

  private energy = 0;
  private radius = 0.45; // Inner radius for bass
  private breathPhase = 0;
  private anticipation = 0;  // Builds before bar lands

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
    this.breathPhase += dt * 0.5; // Slower breath for bass
    this.key = music.key;
    this.keyMode = music.keyMode;
    this.keyRotation = music.keyRotation;

    if (music.kick) this.energy += 0.5; // Bass responds more to kick
    if (music.snare) this.energy += 0.15;
    this.energy *= Math.exp(-2.0 * dt);

    // Bar anticipation: bass clock builds before bar boundary (chord changes often align)
    // Slower, weightier anticipation than melody
    const nextBar = music.nextBarIn ?? 2.0;
    const barDur = (music.beatDuration || 0.5) * (music.beatsPerBar || 4);
    // Anticipation ramps up in the last 20% of the bar
    const anticipationWindow = barDur * 0.2;
    if (nextBar < anticipationWindow && nextBar > 0) {
      const t = 1 - (nextBar / anticipationWindow);  // 0→1 as bar approaches
      this.anticipation = t * t * 0.25;  // Subtle, max 0.25
    } else {
      this.anticipation *= Math.exp(-4 * dt);  // Slower decay for bass
    }

    // Follow chord root for stability (not random bass notes)
    const pc = music.chordRoot >= 0 ? music.chordRoot : -1;

    if (pc >= 0) {
      // Use absolute pitch class position (keyRotation handles alignment)
      const newAngle = (pc / 12) * Math.PI * 2 - Math.PI / 2;

      // Use shortest path
      let diff = newAngle - this.handAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      // Only update if chord root changed
      if (pc !== this.lastPitchClass) {
        this.targetAngle = this.handAngle + diff;
        this.lastPitchClass = pc;

        const c = samplePaletteColor(pc, 0.6);
        this.colR = c[0];
        this.colG = c[1];
        this.colB = c[2];

        // GSAP: Slow, weighty bass hand motion - full beat duration
        const beatDur = music.beatDuration || 0.5;
        gsap.to(this, {
          handAngle: this.targetAngle,
          duration: beatDur * 1.0,
          ease: 'power2.inOut',
          overwrite: true,
        });

        // GSAP: Brightness pulse on chord change, slow decay
        gsap.fromTo(this,
          { handBrightness: 0.8 },
          { handBrightness: 0, duration: beatDur * 2.0, ease: 'power2.out', overwrite: 'auto' }
        );
      }
    }

    // Hand length stays fixed at outer layer
    this.handLength = 0.95;

    // Sample arc trail
    const angleDiff = Math.abs(this.handAngle - this.lastTrailAngle);
    if (angleDiff > 0.04) {
      this.arcTrail.push({
        angle: this.handAngle,
        time: this.time,
        r: this.colR,
        g: this.colG,
        b: this.colB,
      });
      if (this.arcTrail.length > ARC_TRAIL_MAX) this.arcTrail.shift();
      this.lastTrailAngle = this.handAngle;
    }

    while (this.arcTrail.length > 0 && this.time - this.arcTrail[0].time > ARC_TRAIL_LIFETIME) {
      this.arcTrail.shift();
    }
  }

  render(): HTMLCanvasElement {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const minDim = Math.min(cx, cy);
    const maxR = minDim * 0.85; // Max reach for hand (outer octave)
    const numeralR = minDim * 0.92; // Fixed radius for numerals - just outside note spiral
    const breath = 1 + Math.sin(this.breathPhase) * 0.02;
    const handLen = maxR * this.handLength * breath;
    const r = numeralR; // Ring/numerals at fixed outer radius
    const angle = this.handAngle + this.keyRotation;  // Apply modulation rotation
    const R = this.colR, G = this.colG, B = this.colB;
    const brt = 0.5 + this.handBrightness * 0.4 + this.energy * 0.15;
    const alpha = Math.min(1, brt);

    const dirX = Math.cos(angle), dirY = Math.sin(angle);
    const perpX = -dirY, perpY = dirX;

    const ptAt = (f: number, halfW: number) => ({
      x: cx + dirX * handLen * f + perpX * halfW,
      y: cy + dirY * handLen * f + perpY * halfW,
    });

    const sc = handLen / 200;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const diatonicOffsets = this.keyMode === 'minor' ? MINOR_OFFSETS : MAJOR_OFFSETS;

    // --- Inner ring ---
    ctx.beginPath();
    ctx.arc(cx, cy, r * breath, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${R},${G},${B},0.08)`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // --- Arc trail (thicker for bass) ---
    if (this.arcTrail.length >= 2) {
      for (let i = 0; i < this.arcTrail.length - 1; i++) {
        const seg = this.arcTrail[i];
        const next = this.arcTrail[i + 1];
        const age = (this.time - seg.time) / ARC_TRAIL_LIFETIME;
        if (age >= 1) continue;
        const a = (1 - age) * (1 - age);
        const trailR = r * breath;
        let startA = seg.angle + this.keyRotation;
        let arcDiff = next.angle - seg.angle;
        while (arcDiff > Math.PI) arcDiff -= Math.PI * 2;
        while (arcDiff < -Math.PI) arcDiff += Math.PI * 2;

        // Outer glow
        ctx.beginPath();
        ctx.arc(cx, cy, trailR, startA, startA + arcDiff, arcDiff < 0);
        ctx.strokeStyle = `rgba(${seg.r},${seg.g},${seg.b},${(a * 0.15).toFixed(3)})`;
        ctx.lineWidth = 10 + a * 6;
        ctx.stroke();

        // Core
        ctx.beginPath();
        ctx.arc(cx, cy, trailR, startA, startA + arcDiff, arcDiff < 0);
        ctx.strokeStyle = `rgba(${seg.r},${seg.g},${seg.b},${(a * 0.4).toFixed(3)})`;
        ctx.lineWidth = 3 + a * 3;
        ctx.stroke();
      }
    }

    // --- Roman numeral markers + tick marks ---
    const degreeMap = this.keyMode === 'minor' ? MINOR_DEGREES : MAJOR_DEGREES;

    for (let i = 0; i < 12; i++) {
      const semitones = semitoneOffset(i, this.key);
      // Use absolute pitch class position + keyRotation (like note-spiral)
      const tickAngle = (i / 12) * Math.PI * 2 - Math.PI / 2 + this.keyRotation;
      const inKey = diatonicOffsets.has(semitones);
      const isCurrent = i === this.lastPitchClass;
      const outerR = r * breath;
      const tc = samplePaletteColor(i, 0.6);
      const tickAlpha = isCurrent ? 0.7 + this.handBrightness * 0.3
        : inKey ? 0.25 : 0.1;

      const numeral = degreeMap[semitones];
      if (numeral) {
        // Draw Roman numeral for diatonic scale degrees
        const fontSize = Math.max(11, Math.round(r * 0.08));
        const textR = outerR - r * 0.08;
        const tx = cx + Math.cos(tickAngle) * textR;
        const ty = cy + Math.sin(tickAngle) * textR;

        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(tickAngle + Math.PI / 2);
        ctx.font = `${isCurrent ? 'bold ' : ''}${fontSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Glow pass for current note
        if (isCurrent && this.handBrightness > 0.05) {
          ctx.shadowColor = `rgba(${tc[0]},${tc[1]},${tc[2]},${(this.handBrightness * 0.7).toFixed(3)})`;
          ctx.shadowBlur = 15;
        }

        ctx.fillStyle = `rgba(${tc[0]},${tc[1]},${tc[2]},${tickAlpha.toFixed(3)})`;
        ctx.fillText(numeral, 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
      } else {
        // Small dot for chromatic (non-diatonic) notes
        const dotR = outerR - r * 0.04;
        const dx = cx + Math.cos(tickAngle) * dotR;
        const dy = cy + Math.sin(tickAngle) * dotR;

        ctx.beginPath();
        ctx.arc(dx, dy, isCurrent ? 3 : 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${tc[0]},${tc[1]},${tc[2]},${tickAlpha.toFixed(3)})`;
        ctx.fill();
      }

      // Glow on current
      if (isCurrent && this.handBrightness > 0.05) {
        const glowR = r * 0.1;
        const gx = cx + Math.cos(tickAngle) * (outerR - r * 0.06);
        const gy = cy + Math.sin(tickAngle) * (outerR - r * 0.06);
        const grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, glowR);
        grd.addColorStop(0, `rgba(${tc[0]},${tc[1]},${tc[2]},${(this.handBrightness * 0.6).toFixed(3)})`);
        grd.addColorStop(1, `rgba(${tc[0]},${tc[1]},${tc[2]},0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(gx - glowR, gy - glowR, glowR * 2, glowR * 2);
      }
    }

    // ==========================================================
    // STURDY BASS HAND - Industrial/station clock style
    // Heavy, solid, with prominent counterweight
    // ==========================================================

    const strokeW = Math.max(2, 3 * sc);
    const glowW = Math.max(4, 7 * sc);
    const colStr = `rgba(${R},${G},${B},${alpha.toFixed(3)})`;
    const glowStr = `rgba(${R},${G},${B},${(alpha * 0.15).toFixed(3)})`;
    const fillStr = `rgba(${R},${G},${B},${(alpha * 0.25).toFixed(3)})`;

    // Helper to stroke with glow
    const strokeP = (path: Path2D) => {
      ctx.strokeStyle = glowStr;
      ctx.lineWidth = glowW;
      ctx.stroke(path);
      ctx.strokeStyle = colStr;
      ctx.lineWidth = strokeW;
      ctx.stroke(path);
    };

    const fillP = (path: Path2D) => {
      ctx.fillStyle = fillStr;
      ctx.fill(path);
      strokeP(path);
    };

    // --- Main hand: tapered rectangle ---
    const hand = new Path2D();
    const baseW = 6 * sc;
    const tipW = 2 * sc;
    const hBase1 = ptAt(0.08, baseW);
    const hBase2 = ptAt(0.08, -baseW);
    const hTip1 = ptAt(0.95, tipW);
    const hTip2 = ptAt(0.95, -tipW);
    const hPoint = ptAt(1.05, 0);
    hand.moveTo(hBase1.x, hBase1.y);
    hand.lineTo(hTip1.x, hTip1.y);
    hand.lineTo(hPoint.x, hPoint.y);
    hand.lineTo(hTip2.x, hTip2.y);
    hand.lineTo(hBase2.x, hBase2.y);
    hand.closePath();
    fillP(hand);

    // --- Center circle cutout (visual interest) ---
    const cutoutF = 0.35;
    const cutoutR = 5 * sc;
    const cc = ptAt(cutoutF, 0);
    const cutout = new Path2D();
    cutout.arc(cc.x, cc.y, cutoutR, 0, Math.PI * 2);
    ctx.strokeStyle = colStr;
    ctx.lineWidth = strokeW * 0.8;
    ctx.stroke(cutout);

    // --- Counterweight (heavy circle) ---
    const tailLen = handLen * 0.25;
    const tAng = angle + Math.PI;
    const tdx = Math.cos(tAng), tdy = Math.sin(tAng);
    const cwCenter = { x: cx + tdx * tailLen * 0.6, y: cy + tdy * tailLen * 0.6 };
    const cwRadius = 10 * sc;

    const counterweight = new Path2D();
    counterweight.arc(cwCenter.x, cwCenter.y, cwRadius, 0, Math.PI * 2);
    fillP(counterweight);

    // Counterweight inner circle
    const cwInner = new Path2D();
    cwInner.arc(cwCenter.x, cwCenter.y, cwRadius * 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = colStr;
    ctx.lineWidth = strokeW * 0.6;
    ctx.stroke(cwInner);

    // --- Tail shaft ---
    const tailShaft = new Path2D();
    const tsW = 4 * sc;
    tailShaft.moveTo(cx + perpX * tsW, cy + perpY * tsW);
    tailShaft.lineTo(cwCenter.x + perpX * tsW * 0.7, cwCenter.y + perpY * tsW * 0.7);
    tailShaft.lineTo(cwCenter.x - perpX * tsW * 0.7, cwCenter.y - perpY * tsW * 0.7);
    tailShaft.lineTo(cx - perpX * tsW, cy - perpY * tsW);
    tailShaft.closePath();
    fillP(tailShaft);

    // --- Tip glow (responds to anticipation) ---
    const tipPt = ptAt(1, 0);
    const orbSz = 8 + this.handBrightness * 12 + this.energy * 6 + this.anticipation * 10;
    const orbA = 0.3 + this.handBrightness * 0.5 + this.anticipation * 0.25;
    const orbGrd = ctx.createRadialGradient(tipPt.x, tipPt.y, 0, tipPt.x, tipPt.y, orbSz * 2.5);
    orbGrd.addColorStop(0, `rgba(255,255,255,${(orbA * 0.5).toFixed(3)})`);
    orbGrd.addColorStop(0.4, `rgba(${R},${G},${B},${(orbA * 0.3).toFixed(3)})`);
    orbGrd.addColorStop(1, `rgba(${R},${G},${B},0)`);
    ctx.fillStyle = orbGrd;
    ctx.fillRect(tipPt.x - orbSz * 2.5, tipPt.y - orbSz * 2.5, orbSz * 5, orbSz * 5);

    // --- Center hub (larger for bass, pulses with anticipation) ---
    const hubSz = 8 + this.energy * 6 + this.anticipation * 5;
    ctx.beginPath();
    ctx.arc(cx, cy, hubSz * 1.3, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${R},${G},${B},${(0.1 + this.energy * 0.15).toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const hubGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, hubSz * 1.8);
    hubGrd.addColorStop(0, `rgba(255,255,255,${(0.15 + this.energy * 0.25).toFixed(3)})`);
    hubGrd.addColorStop(0.5, `rgba(${R},${G},${B},${(0.1 + this.energy * 0.1).toFixed(3)})`);
    hubGrd.addColorStop(1, `rgba(${R},${G},${B},0)`);
    ctx.fillStyle = hubGrd;
    ctx.fillRect(cx - hubSz * 2, cy - hubSz * 2, hubSz * 4, hubSz * 4);

    ctx.beginPath();
    ctx.arc(cx, cy, 3 + this.energy * 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${(0.25 + this.energy * 0.35).toFixed(3)})`;
    ctx.fill();

    ctx.restore();
    return this.canvas;
  }

  isReady(): boolean { return this.ready; }

  dispose(): void {
    this.ready = false;
    this.handBrightness = 0;
    this.arcTrail.length = 0;
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'radius', label: 'Radius', type: 'range', value: this.radius, min: 0.2, max: 0.6, step: 0.05 },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'radius') this.radius = value as number;
  }
}
