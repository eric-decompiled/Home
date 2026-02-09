// --- Bass Clock Hand Effect ---
// A simpler, heavier clock hand for bass notes.
// Inner position (smaller radius) to complement the melody clock.
// Sturdy design with counterweight - like a station clock or industrial gauge.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import {
  samplePaletteColor, MAJOR_OFFSETS, MINOR_OFFSETS, MAJOR_DEGREES, MINOR_DEGREES, semitoneOffset,
  SPIRAL_RADIUS_SCALE, spiralPos
} from './effect-utils.ts';
import { gsap } from '../animation.ts';

interface ArcSegment {
  angle: number;
  time: number;
  r: number;
  g: number;
  b: number;
}

const ARC_TRAIL_MAX = 30;
const ARC_TRAIL_LIFETIME = 3.1;

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
  private initializedToKey = false;  // Track if we've set initial position to song key
  private initializedKey = -1;  // The key we initialized to (detect song key changes)
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
  private windupAngle = 0;   // Rotation offset during windup (lean back before strike)

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

    // === GROOVE CURVES ===
    const barAnticipation = music.barAnticipation ?? 0;
    const barArrival = music.barArrival ?? 0;
    const beatGroove = music.beatGroove ?? 0.5;

    // Bar anticipation creates slow, weighty buildup
    // Beat groove adds subtle pulse even between bar boundaries
    this.anticipation = barAnticipation * 0.25 + barArrival * 0.2 + beatGroove * 0.05;

    // Energy boost on bar arrival (the big downbeat)
    this.energy += barArrival * 0.35;

    // Follow chord root for stability (not random bass notes)
    const pc = music.chordRoot >= 0 ? music.chordRoot : -1;

    // Initialize hand to tonic position on first update (before any chord changes)
    // Also re-initialize when song key changes (e.g., when song loads and key is detected)
    const shouldInit = !this.initializedToKey || (this.initializedKey !== this.key && this.initializedKey >= 0);
    if (shouldInit) {
      const tonicAngle = (this.key / 12) * Math.PI * 2 - Math.PI / 2;

      if (!this.initializedToKey) {
        // First init: snap immediately
        this.handAngle = tonicAngle;
        this.targetAngle = this.handAngle;
        this.lastTrailAngle = this.handAngle;
      } else {
        // Key changed (song loaded): animate to new tonic
        let diff = tonicAngle - this.handAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.targetAngle = this.handAngle + diff;

        const beatDur = music.beatDuration || 0.5;
        gsap.to(this, {
          handAngle: this.targetAngle,
          duration: beatDur * 1.5,
          ease: 'power2.inOut',
          overwrite: true,
        });
      }

      // Set color to tonic and trigger brightness pulse
      const c = samplePaletteColor(this.key, 0.6);
      this.colR = c[0];
      this.colG = c[1];
      this.colB = c[2];
      this.initializedToKey = true;
      this.initializedKey = this.key;

      // Update highlighted numeral and pulse brightness
      this.lastPitchClass = this.key;
      gsap.to(this, {
        handBrightness: 0.8,
        duration: 0.1,
        onComplete: () => {
          gsap.to(this, { handBrightness: 0, duration: 1.0, ease: 'power2.out' });
        }
      });
    } else if (pc >= 0) {
      // Respond to chord changes (skip on init frame)
      // Point directly at numeral positions (no twist offset)
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

        const beatDur = music.beatDuration || 0.5;

        // GSAP: Windup then snap - lean back first, then swing through
        // Windup in opposite direction of travel
        const windupDir = diff > 0 ? -1 : 1;
        this.windupAngle = windupDir * 0.08; // Immediate lean back

        // Animate windup release (snaps forward as hand moves)
        gsap.to(this, {
          windupAngle: 0,
          duration: beatDur * 1.2,
          ease: 'power3.out',
          overwrite: 'auto',
        });

        // GSAP: Hand motion with subtle overshoot - weighty
        gsap.to(this, {
          handAngle: this.targetAngle,
          duration: beatDur * 2.0,
          ease: 'back.out(0.6)',
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
    const cy = h / 2 + h * 0.04;  // shifted down to match note spiral
    const minDim = Math.min(cx, cy);
    const breath = 1 + Math.sin(this.breathPhase) * 0.02;

    // Use spiralPos to get consistent radius for outer ring (imaginary octave MIDI 113)
    const spiralMaxR = minDim * SPIRAL_RADIUS_SCALE;
    const outerPos = spiralPos(113, 0, this.key, this.keyRotation, cx, cy, spiralMaxR * breath);
    const r = outerPos.radius;  // Trail and numerals share this radius

    const handLen = r * this.handLength;

    // Apply windup angle - subtle counter-rotation (pull back before striking)
    // Negative offset creates "leaning back" effect
    const angle = this.handAngle + this.keyRotation - this.windupAngle;
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

    // --- Arc trail with comet tail gradient ---
    if (this.arcTrail.length >= 2) {
      const trailR = r * breath;
      const groovePulse = 1.0 + this.anticipation * 0.3;

      // Find valid trail segments
      let startIdx = 0;
      for (let i = 0; i < this.arcTrail.length; i++) {
        const age = (this.time - this.arcTrail[i].time) / ARC_TRAIL_LIFETIME;
        if (age < 1) {
          startIdx = i;
          break;
        }
      }

      const validTrail = this.arcTrail.slice(startIdx);
      if (validTrail.length >= 2) {
        ctx.lineCap = 'round';

        // Draw segments with gradient opacity (comet tail effect)
        for (let i = 0; i < validTrail.length - 1; i++) {
          const seg = validTrail[i];
          const next = validTrail[i + 1];

          // Position along trail: 0 = tail (oldest), 1 = head (newest)
          const t = i / (validTrail.length - 1);

          // Age-based fade
          const age = (this.time - seg.time) / ARC_TRAIL_LIFETIME;
          const ageFade = Math.pow(1 - age, 1.5);

          // Comet gradient: faint at tail, bright at head
          const cometFade = Math.pow(t, 0.5);

          let startA = seg.angle + this.keyRotation;
          let arcDiff = next.angle - seg.angle;
          while (arcDiff > Math.PI) arcDiff -= Math.PI * 2;
          while (arcDiff < -Math.PI) arcDiff += Math.PI * 2;

          // Blend colors along trail
          const segR = Math.round(seg.r * 0.7 + next.r * 0.3);
          const segG = Math.round(seg.g * 0.7 + next.g * 0.3);
          const segB = Math.round(seg.b * 0.7 + next.b * 0.3);

          // Width grows toward head
          const baseWidth = 2 + t * 8;

          // Outer glow
          const glowAlpha = ageFade * cometFade * 0.15 * groovePulse;
          ctx.beginPath();
          ctx.arc(cx, cy, trailR, startA, startA + arcDiff, arcDiff < 0);
          ctx.strokeStyle = `rgba(${segR},${segG},${segB},${glowAlpha.toFixed(3)})`;
          ctx.lineWidth = baseWidth * 2.5;
          ctx.stroke();

          // Core with brightness increasing toward head
          const coreAlpha = ageFade * cometFade * 0.5 * groovePulse;
          ctx.beginPath();
          ctx.arc(cx, cy, trailR, startA, startA + arcDiff, arcDiff < 0);
          ctx.strokeStyle = `rgba(${segR},${segG},${segB},${coreAlpha.toFixed(3)})`;
          ctx.lineWidth = baseWidth;
          ctx.stroke();

          // Hot inner core near head
          if (t > 0.6) {
            const hotAlpha = ageFade * Math.pow((t - 0.6) / 0.4, 2) * 0.4 * groovePulse;
            const hotR = Math.min(255, segR + 60);
            const hotG = Math.min(255, segG + 60);
            const hotB = Math.min(255, segB + 60);
            ctx.beginPath();
            ctx.arc(cx, cy, trailR, startA, startA + arcDiff, arcDiff < 0);
            ctx.strokeStyle = `rgba(${hotR},${hotG},${hotB},${hotAlpha.toFixed(3)})`;
            ctx.lineWidth = baseWidth * 0.4;
            ctx.stroke();
          }
        }
      }
    }

    // --- Roman numeral markers + tick marks ---
    // Use shared spiral coordinate system - place at same radius as trail
    const degreeMap = this.keyMode === 'minor' ? MINOR_DEGREES : MAJOR_DEGREES;

    for (let i = 0; i < 12; i++) {
      const semitones = semitoneOffset(i, this.key);
      const inKey = diatonicOffsets.has(semitones);
      const isCurrent = i === this.lastPitchClass;
      const tc = samplePaletteColor(i, 0.6);
      const tickAlpha = isCurrent ? 0.7 + this.handBrightness * 0.3
        : inKey ? 0.25 : 0.1;

      // Position using shared spiralPos - same radius as trail (r)
      const pos = spiralPos(113, i, this.key, this.keyRotation, cx, cy, spiralMaxR * breath);
      const { x: tx, y: ty, angle: tickAngle } = pos;

      const numeral = degreeMap[semitones];
      if (numeral) {
        // Draw Roman numeral for diatonic scale degrees
        const fontSize = Math.max(11, Math.round(r * 0.1));

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
        ctx.beginPath();
        ctx.arc(tx, ty, isCurrent ? 3 : 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${tc[0]},${tc[1]},${tc[2]},${tickAlpha.toFixed(3)})`;
        ctx.fill();
      }

      // Glow on current
      if (isCurrent && this.handBrightness > 0.05) {
        const glowR = r * 0.08;
        const grd = ctx.createRadialGradient(tx, ty, 0, tx, ty, glowR);
        grd.addColorStop(0, `rgba(${tc[0]},${tc[1]},${tc[2]},${(this.handBrightness * 0.6).toFixed(3)})`);
        grd.addColorStop(1, `rgba(${tc[0]},${tc[1]},${tc[2]},0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(tx - glowR, ty - glowR, glowR * 2, glowR * 2);
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
    const cutoutR = 3.5 * sc;
    const cc = ptAt(cutoutF, 0);
    const cutout = new Path2D();
    cutout.arc(cc.x, cc.y, cutoutR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${R},${G},${B},${(alpha * 0.7).toFixed(3)})`;
    ctx.lineWidth = strokeW * 0.5;
    ctx.stroke(cutout);

    // --- Counterweight (heavy circle) ---
    const tailLen = handLen * 0.25;
    const tAng = angle + Math.PI;
    const tdx = Math.cos(tAng), tdy = Math.sin(tAng);
    const cwRadius = 10 * sc;
    // Tail shaft ends here
    const tailEnd = { x: cx + tdx * tailLen * 0.6, y: cy + tdy * tailLen * 0.6 };
    // Counterweight center offset so inner edge touches tail end
    const cwCenter = { x: tailEnd.x + tdx * cwRadius, y: tailEnd.y + tdy * cwRadius };

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
    tailShaft.lineTo(tailEnd.x + perpX * tsW * 0.7, tailEnd.y + perpY * tsW * 0.7);
    tailShaft.lineTo(tailEnd.x - perpX * tsW * 0.7, tailEnd.y - perpY * tsW * 0.7);
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
    this.initializedToKey = false;
    this.initializedKey = -1;
    this.lastPitchClass = -1;
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
