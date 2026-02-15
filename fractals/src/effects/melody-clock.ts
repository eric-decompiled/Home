// --- Melody Clock Hand Effect ---
// Elegant, lightweight clock hand tracking individual melody notes.
// Thinner and more graceful than the industrial bass clock.
// Features: slender tapered hand, comet-tail arc trail,
// note name markers, compass physics for responsive motion.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { samplePaletteColor, SPIRAL_RADIUS_SCALE, spiralPos, getNoteName } from './effect-utils.ts';
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

export class MelodyClockEffect implements VisualEffect {
  readonly id = 'melody-clock';
  readonly name = 'Melody Clock';
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
  private angularVelocity = 0;  // Compass physics
  private handBrightness = 0;
  private key = 0;
  private keyRotation = 0;
  private useFlats = false;
  private lastMidiNote = -1;
  private lastPitchClass = -1;
  // Target note color (for tip glow)
  private targetR = 200;
  private targetG = 200;
  private targetB = 255;
  // Current bearing color (for body, based on where hand points)
  private bearingR = 200;
  private bearingG = 200;
  private bearingB = 255;
  // Color history for gradient along hand (tip to center)
  private colorHistory: Array<[number, number, number]> = [];
  private lastColorSampleTime = 0;
  private time = 0;

  private arcTrail: ArcSegment[] = [];
  private lastTrailAngle = -Math.PI / 2;

  private energy = 0;
  private anticipation = 0;
  private loudness = 0;
  private handLength = 0.95;

  // Attraction decay for smoother hand release
  private attractionStrength = 1.0;
  private lastOnsetTime = 0;

  // Config
  private showNotes = true;

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
    this.useFlats = music.useFlats;

    if (music.kick) this.energy += 0.3;
    if (music.snare) this.energy += 0.2;
    this.energy *= Math.exp(-2.5 * dt);

    // Groove curves
    const beatAnticipation = music.beatAnticipation ?? 0;
    const beatArrival = music.beatArrival ?? 0;
    this.anticipation = beatAnticipation * 0.3 + beatArrival * 0.15;
    this.energy += beatArrival * 0.25;

    // Smooth loudness for trail brightness
    const targetLoudness = music.loudness ?? 0;
    this.loudness += (targetLoudness - this.loudness) * 0.08;

    // Follow each melody note
    if (music.melodyOnset && music.melodyPitchClass >= 0 && music.melodyVelocity > 0) {
      const pc = music.melodyPitchClass;
      const midiNote = music.melodyMidiNote;
      this.lastPitchClass = pc;

      // Calculate target angle (include keyRotation so hand aligns with rotated markers)
      const fromRoot = ((pc - this.key + 12) % 12);
      const twist = (fromRoot / 12) * 0.15;
      const newAngle = (pc / 12) * Math.PI * 2 - Math.PI / 2 + twist + this.keyRotation;

      // Direction based on MIDI pitch
      let diff = newAngle - this.handAngle;
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

      this.targetAngle = this.handAngle + diff;
      this.lastMidiNote = midiNote;

      const c = samplePaletteColor(pc, 0.6);
      this.targetR = c[0];
      this.targetG = c[1];
      this.targetB = c[2];

      // Brightness pulse
      const beatDur = music.beatDuration || 0.5;
      gsap.fromTo(this,
        { handBrightness: 0.8 },
        { handBrightness: 0, duration: beatDur * 2.0, ease: 'power2.out', overwrite: 'auto' }
      );

      // Reset attraction on note onset
      this.attractionStrength = 1.0;
      this.lastOnsetTime = this.time;
    }

    // Decay attraction when no notes are playing (only after first note)
    if (this.lastOnsetTime > 0) {
      const timeSinceOnset = this.time - this.lastOnsetTime;
      const DECAY_DELAY = 0.3;    // Start decay 300ms after note
      const DECAY_RATE = 2.5;     // Decay time constant
      const MIN_ATTRACTION = 0.15; // Floor to keep hand loosely on target
      if (timeSinceOnset > DECAY_DELAY) {
        const decayed = Math.exp(-DECAY_RATE * (timeSinceOnset - DECAY_DELAY));
        this.attractionStrength = MIN_ATTRACTION + (1 - MIN_ATTRACTION) * decayed;
      }
    }

    // === COMPASS PHYSICS ===
    let angleDiff = this.targetAngle - this.handAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Groove modulation: stronger pull on beats, drifts between
    const grooveMod = 0.4 + this.anticipation * 2.0 + this.energy * 0.8;
    const springK = 6.0 * this.attractionStrength * grooveMod;
    const springForce = angleDiff * springK;
    const damping = 5.0;
    const dampingForce = -this.angularVelocity * damping;

    this.angularVelocity += (springForce + dampingForce) * dt;
    this.handAngle += this.angularVelocity * dt;

    // Calculate bearing color based on current hand angle
    // Reverse the angle formula: pc = ((angle - keyRotation + PI/2) / (2*PI)) * 12
    let bearingAngle = this.handAngle - this.keyRotation + Math.PI / 2;
    while (bearingAngle < 0) bearingAngle += Math.PI * 2;
    while (bearingAngle >= Math.PI * 2) bearingAngle -= Math.PI * 2;
    const bearingPC = Math.floor((bearingAngle / (Math.PI * 2)) * 12) % 12;
    const bearingCol = samplePaletteColor(bearingPC, 0.6);
    // Smooth color transition
    const colorSmooth = 1 - Math.exp(-8 * dt);
    this.bearingR += (bearingCol[0] - this.bearingR) * colorSmooth;
    this.bearingG += (bearingCol[1] - this.bearingG) * colorSmooth;
    this.bearingB += (bearingCol[2] - this.bearingB) * colorSmooth;

    // Sample color history for hand gradient (tip = newest, center = oldest)
    const COLOR_SAMPLE_INTERVAL = 0.12;
    const COLOR_HISTORY_MAX = 8;
    if (this.time - this.lastColorSampleTime > COLOR_SAMPLE_INTERVAL) {
      this.colorHistory.unshift([this.bearingR, this.bearingG, this.bearingB]);
      if (this.colorHistory.length > COLOR_HISTORY_MAX) this.colorHistory.pop();
      this.lastColorSampleTime = this.time;
    }

    // Sample arc trail (uses bearing color since trail follows hand position)
    const trailAngleDiff = Math.abs(this.handAngle - this.lastTrailAngle);
    if (trailAngleDiff > 0.04) {
      this.arcTrail.push({
        angle: this.handAngle,
        time: this.time,
        r: this.bearingR,
        g: this.bearingG,
        b: this.bearingB,
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
    const spiralMaxR = minDim * SPIRAL_RADIUS_SCALE;
    const outerPos = spiralPos(113, 0, this.key, this.keyRotation, cx, cy, spiralMaxR);
    const r = outerPos.radius;

    const handLen = r * this.handLength;
    const angle = this.handAngle;
    // Body uses bearing color (where hand currently points)
    const R = this.bearingR, G = this.bearingG, B = this.bearingB;
    // Tip uses target color (note being attracted to)
    const tipR = this.targetR, tipG = this.targetG, tipB = this.targetB;
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

    // --- Outer ring (thinner than bass clock) ---
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${R},${G},${B},0.06)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // --- Arc trail with comet tail gradient ---
    if (this.arcTrail.length >= 2) {
      const trailR = r;
      const groovePulse = 1.0 + this.anticipation * 0.3;

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
        const loudnessFactor = 0.1 + this.loudness * 0.9;

        for (let i = 0; i < validTrail.length - 1; i++) {
          const seg = validTrail[i];
          const next = validTrail[i + 1];
          const t = i / (validTrail.length - 1);
          const age = (this.time - seg.time) / ARC_TRAIL_LIFETIME;
          const ageFade = Math.pow(1 - age, 1.5);
          const cometFade = Math.pow(t, 0.5);

          let startA = seg.angle;
          let arcDiff = next.angle - seg.angle;
          while (arcDiff > Math.PI) arcDiff -= Math.PI * 2;
          while (arcDiff < -Math.PI) arcDiff += Math.PI * 2;

          const segR = Math.round(seg.r * 0.7 + next.r * 0.3);
          const segG = Math.round(seg.g * 0.7 + next.g * 0.3);
          const segB = Math.round(seg.b * 0.7 + next.b * 0.3);
          // Thinner trail than bass clock for elegant look
          const baseWidth = 1.5 + t * 5;

          // Outer glow
          const glowAlpha = ageFade * cometFade * 0.15 * groovePulse * loudnessFactor;
          ctx.beginPath();
          ctx.arc(cx, cy, trailR, startA, startA + arcDiff, arcDiff < 0);
          ctx.strokeStyle = `rgba(${segR},${segG},${segB},${glowAlpha.toFixed(3)})`;
          ctx.lineWidth = baseWidth * 2.5;
          ctx.stroke();

          // Core
          const coreAlpha = ageFade * cometFade * 0.5 * groovePulse * loudnessFactor;
          ctx.beginPath();
          ctx.arc(cx, cy, trailR, startA, startA + arcDiff, arcDiff < 0);
          ctx.strokeStyle = `rgba(${segR},${segG},${segB},${coreAlpha.toFixed(3)})`;
          ctx.lineWidth = baseWidth;
          ctx.stroke();

          // Hot inner core near head
          if (t > 0.6) {
            const hotAlpha = ageFade * Math.pow((t - 0.6) / 0.4, 2) * 0.4 * groovePulse * loudnessFactor;
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

    // --- Note name markers (offset outward, smaller than bass numerals) ---
    // Fade out with attraction strength so labels disappear when no notes playing
    const labelFade = this.attractionStrength;
    const labelOffset = r * 0.12; // Push labels outside the ring
    for (let i = 0; i < 12; i++) {
      const pos = spiralPos(113, i, this.key, this.keyRotation, cx, cy, spiralMaxR);
      const tickAngle = Math.atan2(pos.y - cy, pos.x - cx);
      const tx = cx + Math.cos(tickAngle) * (r + labelOffset);
      const ty = cy + Math.sin(tickAngle) * (r + labelOffset);

      const isCurrent = i === this.lastPitchClass;
      const tc = samplePaletteColor(i, 0.6);
      const baseAlpha = isCurrent ? 0.55 + this.handBrightness * 0.25 : 0.18;
      const tickAlpha = baseAlpha * labelFade;

      if (this.showNotes) {
        const noteName = getNoteName(i, this.useFlats);
        // Smaller font than bass clock numerals
        const fontSize = Math.max(9, Math.round(r * 0.065));

        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(tickAngle + Math.PI / 2);
        ctx.font = `${isCurrent ? '500 ' : '300 '}${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (isCurrent && this.handBrightness > 0.05) {
          ctx.shadowColor = `rgba(${tc[0]},${tc[1]},${tc[2]},${(this.handBrightness * 0.4).toFixed(3)})`;
          ctx.shadowBlur = 8;
        }

        ctx.fillStyle = `rgba(${tc[0]},${tc[1]},${tc[2]},${tickAlpha.toFixed(3)})`;
        ctx.fillText(noteName, 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
      } else {
        // Draw small dot instead of note name
        ctx.beginPath();
        ctx.arc(tx, ty, isCurrent ? 3 : 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${tc[0]},${tc[1]},${tc[2]},${tickAlpha.toFixed(3)})`;
        ctx.fill();
      }

      // Glow on current (smaller than bass clock)
      if (isCurrent && this.handBrightness > 0.05) {
        const glowR = r * 0.05;
        const grd = ctx.createRadialGradient(tx, ty, 0, tx, ty, glowR);
        grd.addColorStop(0, `rgba(${tc[0]},${tc[1]},${tc[2]},${(this.handBrightness * 0.4).toFixed(3)})`);
        grd.addColorStop(1, `rgba(${tc[0]},${tc[1]},${tc[2]},0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(tx - glowR, ty - glowR, glowR * 2, glowR * 2);
      }
    }

    // ==========================================================
    // ELEGANT MELODY HAND - Lighter, more graceful than bass
    // Slender needle with small accent dots, no heavy counterweight
    // ==========================================================

    const strokeW = Math.max(1.5, 2 * sc);
    const glowW = Math.max(3, 5 * sc);

    // Build color gradient along hand (tip = newest, center = oldest)
    const gradTip = { x: cx + dirX * handLen, y: cy + dirY * handLen };
    const gradBase = { x: cx + dirX * handLen * 0.12, y: cy + dirY * handLen * 0.12 };
    const handGradient = ctx.createLinearGradient(gradTip.x, gradTip.y, gradBase.x, gradBase.y);
    const glowGradient = ctx.createLinearGradient(gradTip.x, gradTip.y, gradBase.x, gradBase.y);
    const fillGradient = ctx.createLinearGradient(gradTip.x, gradTip.y, gradBase.x, gradBase.y);

    // Use color history for gradient stops (or fall back to current bearing)
    const histLen = this.colorHistory.length;
    if (histLen > 0) {
      for (let i = 0; i < histLen; i++) {
        const t = i / Math.max(1, histLen - 1);
        const [hr, hg, hb] = this.colorHistory[i];
        handGradient.addColorStop(t, `rgba(${hr},${hg},${hb},${alpha.toFixed(3)})`);
        glowGradient.addColorStop(t, `rgba(${hr},${hg},${hb},${(alpha * 0.12).toFixed(3)})`);
        fillGradient.addColorStop(t, `rgba(${hr},${hg},${hb},${(alpha * 0.2).toFixed(3)})`);
      }
    } else {
      handGradient.addColorStop(0, `rgba(${R},${G},${B},${alpha.toFixed(3)})`);
      handGradient.addColorStop(1, `rgba(${R},${G},${B},${alpha.toFixed(3)})`);
      glowGradient.addColorStop(0, `rgba(${R},${G},${B},${(alpha * 0.12).toFixed(3)})`);
      glowGradient.addColorStop(1, `rgba(${R},${G},${B},${(alpha * 0.12).toFixed(3)})`);
      fillGradient.addColorStop(0, `rgba(${R},${G},${B},${(alpha * 0.2).toFixed(3)})`);
      fillGradient.addColorStop(1, `rgba(${R},${G},${B},${(alpha * 0.2).toFixed(3)})`);
    }

    const strokeP = (path: Path2D) => {
      ctx.strokeStyle = glowGradient;
      ctx.lineWidth = glowW;
      ctx.stroke(path);
      ctx.strokeStyle = handGradient;
      ctx.lineWidth = strokeW;
      ctx.stroke(path);
    };

    // --- Small accent dots at octave positions (instead of heavy cutouts) ---
    const oct2Pos = spiralPos(this.key + 36, this.key, this.key, this.keyRotation, cx, cy, spiralMaxR);
    const oct3Pos = spiralPos(this.key + 48, this.key, this.key, this.keyRotation, cx, cy, spiralMaxR);
    const oct4Pos = spiralPos(this.key + 60, this.key, this.key, this.keyRotation, cx, cy, spiralMaxR);

    const cc1 = ptAt(oct2Pos.radius / handLen, 0);
    const cc2 = ptAt(oct3Pos.radius / handLen, 0);
    const cc3 = ptAt(oct4Pos.radius / handLen, 0);

    // --- Main hand: slender tapered needle ---
    const baseW = 3 * sc;
    const tipW = 0.8 * sc;
    const hBase1 = ptAt(0.12, baseW);
    const hBase2 = ptAt(0.12, -baseW);
    const hTip1 = ptAt(0.96, tipW);
    const hTip2 = ptAt(0.96, -tipW);
    const hPoint = ptAt(1.04, 0);

    const handPath = new Path2D();
    handPath.moveTo(hBase1.x, hBase1.y);
    handPath.lineTo(hTip1.x, hTip1.y);
    handPath.lineTo(hPoint.x, hPoint.y);
    handPath.lineTo(hTip2.x, hTip2.y);
    handPath.lineTo(hBase2.x, hBase2.y);
    handPath.closePath();

    ctx.fillStyle = fillGradient;
    ctx.fill(handPath);
    strokeP(handPath);

    // Small accent dots along hand (elegant markers instead of industrial cutouts)
    const dotAlpha = alpha * 0.6;
    ctx.fillStyle = `rgba(${R},${G},${B},${dotAlpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(cc1.x, cc1.y, 1.5 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cc2.x, cc2.y, 1.2 * sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cc3.x, cc3.y, 0.9 * sc, 0, Math.PI * 2);
    ctx.fill();

    // --- Short decorative tail (no heavy counterweight) ---
    const tailLen = handLen * 0.12;
    const tAng = angle + Math.PI;
    const tdx = Math.cos(tAng), tdy = Math.sin(tAng);
    const tailEnd = { x: cx + tdx * tailLen, y: cy + tdy * tailLen };

    const tailPath = new Path2D();
    const tsW = 2 * sc;
    tailPath.moveTo(cx + perpX * tsW, cy + perpY * tsW);
    tailPath.lineTo(tailEnd.x + perpX * tsW * 0.4, tailEnd.y + perpY * tsW * 0.4);
    tailPath.lineTo(tailEnd.x - perpX * tsW * 0.4, tailEnd.y - perpY * tsW * 0.4);
    tailPath.lineTo(cx - perpX * tsW, cy - perpY * tsW);
    tailPath.closePath();
    // Tail uses oldest color (continuation of history past center)
    const tailCol = this.colorHistory.length > 0
      ? this.colorHistory[this.colorHistory.length - 1]
      : [R, G, B];
    ctx.fillStyle = `rgba(${tailCol[0]},${tailCol[1]},${tailCol[2]},${(alpha * 0.2).toFixed(3)})`;
    ctx.fill(tailPath);
    strokeP(tailPath);

    // --- Tip glow (uses target color - the note being attracted to) ---
    const tipPt = ptAt(1, 0);
    const orbSz = 6 + this.handBrightness * 10 + this.energy * 4 + this.anticipation * 8;
    const orbA = 0.25 + this.handBrightness * 0.45 + this.anticipation * 0.2;
    const orbGrd = ctx.createRadialGradient(tipPt.x, tipPt.y, 0, tipPt.x, tipPt.y, orbSz * 2);
    orbGrd.addColorStop(0, `rgba(255,255,255,${(orbA * 0.5).toFixed(3)})`);
    orbGrd.addColorStop(0.4, `rgba(${tipR},${tipG},${tipB},${(orbA * 0.3).toFixed(3)})`);
    orbGrd.addColorStop(1, `rgba(${tipR},${tipG},${tipB},0)`);
    ctx.fillStyle = orbGrd;
    ctx.fillRect(tipPt.x - orbSz * 2, tipPt.y - orbSz * 2, orbSz * 4, orbSz * 4);

    // --- Center hub (smaller, more delicate) ---
    const hubSz = 5 + this.energy * 4 + this.anticipation * 3;
    ctx.beginPath();
    ctx.arc(cx, cy, hubSz * 1.2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${R},${G},${B},${(0.08 + this.energy * 0.12).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    const hubGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, hubSz * 1.5);
    hubGrd.addColorStop(0, `rgba(255,255,255,${(0.12 + this.energy * 0.2).toFixed(3)})`);
    hubGrd.addColorStop(0.5, `rgba(${R},${G},${B},${(0.08 + this.energy * 0.08).toFixed(3)})`);
    hubGrd.addColorStop(1, `rgba(${R},${G},${B},0)`);
    ctx.fillStyle = hubGrd;
    ctx.fillRect(cx - hubSz * 1.5, cy - hubSz * 1.5, hubSz * 3, hubSz * 3);

    ctx.beginPath();
    ctx.arc(cx, cy, 2 + this.energy * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${(0.2 + this.energy * 0.3).toFixed(3)})`;
    ctx.fill();

    ctx.restore();
    return this.canvas;
  }

  isReady(): boolean { return this.ready; }

  dispose(): void {
    this.ready = false;
    this.handBrightness = 0;
    this.arcTrail.length = 0;
    this.lastPitchClass = -1;
  }

  getConfig(): EffectConfig[] {
    return [];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return { showNotes: true };
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'showNotes') this.showNotes = value as boolean;
  }
}
