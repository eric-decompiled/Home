// --- Melody Clock Hand Effect ---
// Openwork ornate clock hand inspired by Breguet/pomme style hands.
// The hand is drawn as an outline with open interior — like wrought-iron
// filigree clock hands where you can see through the middle.
// Features: fleur-de-lis tip, open circle (moon window), scroll curls,
// and a slender shaft connecting decorative elements.
// Arc trail along the edge shows recent sweep path.

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

const ARC_TRAIL_MAX = 40;
const ARC_TRAIL_LIFETIME = 2.0;

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
  private handBrightness = 0;
  private key = 0;
  private keyMode: 'major' | 'minor' = 'major';
  private keyRotation = 0;  // animated rotation offset for modulations
  private lastPitchClass = -1;
  private lastMidiNote = -1;
  private colR = 200;
  private colG = 200;
  private colB = 255;
  private time = 0;

  private arcTrail: ArcSegment[] = [];
  private lastTrailAngle = -Math.PI / 2;

  private energy = 0;
  private radius = 0.85;
  private breathPhase = 0;
  private anticipation = 0;  // Builds before beat lands


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
    this.breathPhase += dt * 0.8;
    this.key = music.key;
    this.keyMode = music.keyMode;
    this.keyRotation = music.keyRotation;

    if (music.kick) this.energy += 0.3;
    if (music.snare) this.energy += 0.2;
    this.energy *= Math.exp(-2.5 * dt);

    // === GROOVE CURVES ===
    // Use pre-computed anticipation/arrival from beat-sync
    const beatAnticipation = music.beatAnticipation ?? 0;
    const beatArrival = music.beatArrival ?? 0;

    // Anticipation builds before beat (the "breath in")
    // Arrival creates impact on beat (the "hit")
    this.anticipation = beatAnticipation * 0.3 + beatArrival * 0.15;

    // Energy boost on arrival
    this.energy += beatArrival * 0.25;

    // Follow each melody note - light and quick
    if (music.melodyOnset && music.melodyPitchClass >= 0 && music.melodyVelocity > 0) {
      const pc = music.melodyPitchClass;
      const midiNote = music.melodyMidiNote;
      // Use absolute pitch class position (keyRotation handles alignment)
      const newAngle = (pc / 12) * Math.PI * 2 - Math.PI / 2;

      // Use actual MIDI note to determine direction:
      // melody ascending → clockwise, melody descending → counter-clockwise
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
      this.lastPitchClass = pc;
      this.lastMidiNote = midiNote;

      const c = samplePaletteColor(pc, 0.75);
      this.colR = c[0];
      this.colG = c[1];
      this.colB = c[2];

      // GSAP: Smooth motion with some heft
      const beatDur = music.beatDuration || 0.5;
      gsap.to(this, {
        handAngle: this.targetAngle,
        duration: beatDur * 0.5,
        ease: 'power2.out',
        overwrite: true,
      });

      // GSAP: Brightness pulse with longer decay
      gsap.fromTo(this,
        { handBrightness: 1.0 },
        { handBrightness: 0, duration: beatDur * 0.8, ease: 'power2.out', overwrite: 'auto' }
      );
    }

    // Sample arc trail
    const angleDiff = Math.abs(this.handAngle - this.lastTrailAngle);
    if (angleDiff > 0.03) {
      this.arcTrail.push({
        angle: this.handAngle, time: this.time,
        r: this.colR, g: this.colG, b: this.colB,
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
    const r = minDim * this.radius;
    const breath = 1 + Math.sin(this.breathPhase) * 0.015;
    const handLen = r * 0.90 * breath;
    const angle = this.handAngle + this.keyRotation;  // Apply modulation rotation
    const R = this.colR, G = this.colG, B = this.colB;
    const brt = 0.6 + this.handBrightness * 0.35 + this.energy * 0.1;
    const alpha = Math.min(1, brt);

    const dirX = Math.cos(angle), dirY = Math.sin(angle);
    const perpX = -dirY, perpY = dirX;

    // Point along hand axis at fraction f, offset by perpendicular halfW
    const ptAt = (f: number, halfW: number) => ({
      x: cx + dirX * handLen * f + perpX * halfW,
      y: cy + dirY * handLen * f + perpY * halfW,
    });

    const sc = handLen / 280; // scale factor (profile designed at 280px)

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const diatonicOffsets = this.keyMode === 'minor' ? MINOR_OFFSETS : MAJOR_OFFSETS;

    // --- Outer ring ---
    ctx.beginPath();
    ctx.arc(cx, cy, r * breath, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${R},${G},${B},0.06)`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // --- Inner ring ---
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.92 * breath, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${R},${G},${B},0.03)`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // --- Arc trail ---
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

        ctx.beginPath();
        ctx.arc(cx, cy, trailR, startA, startA + arcDiff, arcDiff < 0);
        ctx.strokeStyle = `rgba(${seg.r},${seg.g},${seg.b},${(a * 0.25).toFixed(3)})`;
        ctx.lineWidth = 6 + a * 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, trailR, startA, startA + arcDiff, arcDiff < 0);
        const wr = Math.min(255, seg.r + Math.round((255 - seg.r) * a * 0.4));
        const wg = Math.min(255, seg.g + Math.round((255 - seg.g) * a * 0.4));
        const wb = Math.min(255, seg.b + Math.round((255 - seg.b) * a * 0.4));
        ctx.strokeStyle = `rgba(${wr},${wg},${wb},${(a * 0.5).toFixed(3)})`;
        ctx.lineWidth = 2 + a * 2;
        ctx.stroke();
      }
    }

    // --- Roman numeral markers + tick marks ---
    // Roman numeral markers
    const degreeMap = this.keyMode === 'minor' ? MINOR_DEGREES : MAJOR_DEGREES;

    for (let i = 0; i < 12; i++) {
      const semitones = semitoneOffset(i, this.key);
      // Use absolute pitch class position + keyRotation (like note-spiral)
      const tickAngle = (i / 12) * Math.PI * 2 - Math.PI / 2 + this.keyRotation;
      const inKey = diatonicOffsets.has(semitones);
      const isCurrent = i === this.lastPitchClass;
      const outerR = r * breath;
      const tc = samplePaletteColor(i, 0.7);
      const tickAlpha = isCurrent ? 0.6 + this.handBrightness * 0.4
        : inKey ? 0.2 + this.energy * 0.1 : 0.08;

      const numeral = degreeMap[semitones];
      if (numeral) {
        // Draw Roman numeral for diatonic scale degrees
        const fontSize = Math.max(10, Math.round(r * 0.065));
        const textR = outerR - r * 0.06;
        const tx = cx + Math.cos(tickAngle) * textR;
        const ty = cy + Math.sin(tickAngle) * textR;

        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(tickAngle + Math.PI / 2);
        ctx.font = `${isCurrent ? 'bold ' : ''}${fontSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Glow pass
        if (isCurrent && this.handBrightness > 0.05) {
          ctx.shadowColor = `rgba(${tc[0]},${tc[1]},${tc[2]},${(this.handBrightness * 0.6).toFixed(3)})`;
          ctx.shadowBlur = 12;
        }

        ctx.fillStyle = `rgba(${tc[0]},${tc[1]},${tc[2]},${tickAlpha.toFixed(3)})`;
        ctx.fillText(numeral, 0, 0);
        ctx.shadowBlur = 0;
        ctx.restore();
      } else {
        // Small tick for chromatic (non-diatonic) notes
        const tickLen = r * 0.025;
        const innerR = outerR - tickLen;
        const ox = cx + Math.cos(tickAngle) * outerR;
        const oy = cy + Math.sin(tickAngle) * outerR;
        const ix = cx + Math.cos(tickAngle) * innerR;
        const iy = cy + Math.sin(tickAngle) * innerR;

        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ix, iy);
        ctx.strokeStyle = `rgba(${tc[0]},${tc[1]},${tc[2]},${tickAlpha.toFixed(3)})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      if (isCurrent && this.handBrightness > 0.05) {
        const glowR = r * 0.06;
        const gx = cx + Math.cos(tickAngle) * (outerR - r * 0.05);
        const gy = cy + Math.sin(tickAngle) * (outerR - r * 0.05);
        const grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, glowR);
        grd.addColorStop(0, `rgba(${tc[0]},${tc[1]},${tc[2]},${(this.handBrightness * 0.4).toFixed(3)})`);
        grd.addColorStop(1, `rgba(${tc[0]},${tc[1]},${tc[2]},0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(gx - glowR, gy - glowR, glowR * 2, glowR * 2);
      }
    }

    // ==========================================================
    // OPENWORK POMME / BREGUET CLOCK HAND
    // Elegant filigree — all drawn as stroked outlines with
    // transparent interiors. Inspired by Breguet moon-tip hands.
    // ==========================================================

    const strokeW = Math.max(1.2, 1.8 * sc);
    const glowW = Math.max(2.5, 4.5 * sc);
    const colStr = `rgba(${R},${G},${B},${alpha.toFixed(3)})`;
    const whtStr = `rgba(255,255,255,${(alpha * 0.65).toFixed(3)})`;
    const glowStr = `rgba(${R},${G},${B},${(alpha * 0.12).toFixed(3)})`;
    const tintFill = `rgba(${R},${G},${B},${(alpha * 0.08).toFixed(3)})`;

    // Three-pass rendering: glow → color → white highlight
    const strokeP = (path: Path2D) => {
      ctx.strokeStyle = glowStr;
      ctx.lineWidth = glowW;
      ctx.stroke(path);
      ctx.strokeStyle = colStr;
      ctx.lineWidth = strokeW;
      ctx.stroke(path);
      ctx.strokeStyle = whtStr;
      ctx.lineWidth = Math.max(0.4, strokeW * 0.3);
      ctx.stroke(path);
    };

    const fillP = (path: Path2D) => {
      ctx.fillStyle = tintFill;
      ctx.fill(path);
      strokeP(path);
    };

    // --- Shaft: elegant tapered line from hub to fleur base ---
    // Slight S-curve for organic feel rather than straight line
    const shaft = new Path2D();
    const s0 = ptAt(0.04, 0);
    const s1 = ptAt(0.72, 0);
    shaft.moveTo(s0.x, s0.y);
    shaft.lineTo(s1.x, s1.y);
    strokeP(shaft);

    // --- Lower scrollwork: delicate paired volutes ---
    // Each volute spirals outward from the shaft then curls back
    // with a tight spiral terminus — like violin scroll heads
    for (const side of [1, -1]) {
      const vol = new Path2D();
      // Start on shaft
      const vStart = ptAt(0.08, side * 1 * sc);
      // Sweep out to the widest point
      const vCtrl1 = ptAt(0.12, side * 12 * sc);
      // Curve forward
      const vCtrl2 = ptAt(0.24, side * 10 * sc);
      // Come back toward shaft
      const vEnd = ptAt(0.28, side * 3 * sc);
      vol.moveTo(vStart.x, vStart.y);
      vol.bezierCurveTo(vCtrl1.x, vCtrl1.y, vCtrl2.x, vCtrl2.y, vEnd.x, vEnd.y);

      // Tight inward spiral at the end (volute eye)
      const eyeCtrl = ptAt(0.22, side * 7 * sc);
      const eyeEnd = ptAt(0.19, side * 5 * sc);
      vol.quadraticCurveTo(eyeCtrl.x, eyeCtrl.y, eyeEnd.x, eyeEnd.y);
      strokeP(vol);
    }

    // --- Open crescent / pomme circle (Breguet signature) ---
    // A circle with open interior, slightly elongated along the hand axis
    const moonF = 0.44;
    const moonRx = 9 * sc;  // along hand
    const moonRy = 7 * sc;  // perpendicular
    const mc = ptAt(moonF, 0);

    // Draw as ellipse aligned to hand
    const ellipse = new Path2D();
    // Transform ellipse points manually (Path2D.ellipse not universally styled well)
    const ellipseN = 32;
    for (let i = 0; i <= ellipseN; i++) {
      const t = (i / ellipseN) * Math.PI * 2;
      const ex = mc.x + Math.cos(t) * moonRx * dirX - Math.sin(t) * moonRy * perpX;
      const ey = mc.y + Math.cos(t) * moonRx * dirY - Math.sin(t) * moonRy * perpY;
      if (i === 0) ellipse.moveTo(ex, ey);
      else ellipse.lineTo(ex, ey);
    }
    ellipse.closePath();
    fillP(ellipse);

    // Small decorative dot at moon center
    const centerDot = new Path2D();
    centerDot.arc(mc.x, mc.y, 1.5 * sc, 0, Math.PI * 2);
    strokeP(centerDot);

    // --- Upper scrollwork: delicate paired tendrils above moon ---
    for (const side of [1, -1]) {
      const tendril = new Path2D();
      const tStart = ptAt(0.55, side * 1.5 * sc);
      const tCtrl1 = ptAt(0.58, side * 7 * sc);
      const tCtrl2 = ptAt(0.65, side * 5 * sc);
      const tEnd = ptAt(0.66, side * 2 * sc);
      tendril.moveTo(tStart.x, tStart.y);
      tendril.bezierCurveTo(tCtrl1.x, tCtrl1.y, tCtrl2.x, tCtrl2.y, tEnd.x, tEnd.y);
      strokeP(tendril);
    }

    // --- Open teardrop between moon and fleur ---
    const tearF = 0.58;
    const tearLen = 0.10;
    const tearW = 4 * sc;
    const tear = new Path2D();
    const tTop = ptAt(tearF, 0);
    const tMidR = ptAt(tearF + tearLen * 0.5, tearW);
    const tMidL = ptAt(tearF + tearLen * 0.5, -tearW);
    const tBot = ptAt(tearF + tearLen, 0);
    tear.moveTo(tTop.x, tTop.y);
    tear.quadraticCurveTo(tMidR.x, tMidR.y, tBot.x, tBot.y);
    tear.quadraticCurveTo(tMidL.x, tMidL.y, tTop.x, tTop.y);
    tear.closePath();
    fillP(tear);

    // --- Fleur-de-lis tip ---
    // Three petals with open interiors, more graceful curves
    const fleurBase = 0.72;

    // Center petal: slender elongated leaf
    const cp = new Path2D();
    const cpStart = ptAt(fleurBase, 0);
    const cpBulgeR = ptAt(fleurBase + 0.13, 4.5 * sc);
    const cpBulgeL = ptAt(fleurBase + 0.13, -4.5 * sc);
    const cpTip = ptAt(1.02, 0);  // slightly past 1.0 for pointed feel
    cp.moveTo(cpStart.x, cpStart.y);
    cp.quadraticCurveTo(cpBulgeR.x, cpBulgeR.y, cpTip.x, cpTip.y);
    cp.quadraticCurveTo(cpBulgeL.x, cpBulgeL.y, cpStart.x, cpStart.y);
    cp.closePath();
    fillP(cp);

    // Side petals: flowing S-curves that sweep outward and curl back
    for (const side of [1, -1]) {
      const sp = new Path2D();
      const spBase = ptAt(fleurBase + 0.01, side * 1.5 * sc);
      // Sweep outward
      const spOut1 = ptAt(fleurBase + 0.04, side * 14 * sc);
      // Curve forward and slightly back inward
      const spOut2 = ptAt(fleurBase + 0.16, side * 11 * sc);
      // End curling slightly back
      const spEnd = ptAt(fleurBase + 0.20, side * 5 * sc);

      sp.moveTo(spBase.x, spBase.y);
      sp.bezierCurveTo(spOut1.x, spOut1.y, spOut2.x, spOut2.y, spEnd.x, spEnd.y);

      // Inner return curve — creates the petal outline
      const spIn1 = ptAt(fleurBase + 0.14, side * 6 * sc);
      const spIn2 = ptAt(fleurBase + 0.06, side * 4 * sc);
      sp.bezierCurveTo(spIn1.x, spIn1.y, spIn2.x, spIn2.y, spBase.x, spBase.y);
      sp.closePath();
      fillP(sp);
    }

    // Elegant crossbar at fleur base with curved ends
    const bar = new Path2D();
    const barL = ptAt(fleurBase, 8 * sc);
    const barR = ptAt(fleurBase, -8 * sc);
    const barCtrlL = ptAt(fleurBase - 0.02, 5 * sc);
    const barCtrlR = ptAt(fleurBase - 0.02, -5 * sc);
    bar.moveTo(barL.x, barL.y);
    bar.quadraticCurveTo(barCtrlL.x, barCtrlL.y, ptAt(fleurBase, 0).x, ptAt(fleurBase, 0).y);
    bar.quadraticCurveTo(barCtrlR.x, barCtrlR.y, barR.x, barR.y);
    strokeP(bar);

    // --- Tail: open crescent counterweight ---
    const tailLen = handLen * 0.12;
    const tAng = angle + Math.PI;
    const tdx = Math.cos(tAng), tdy = Math.sin(tAng);
    const tpx = -tdy, tpy = tdx;

    const tail = new Path2D();
    const tailBase = { x: cx, y: cy };
    const tailTip = { x: cx + tdx * tailLen, y: cy + tdy * tailLen };
    const tailL = { x: cx + tdx * tailLen * 0.45 + tpx * 7 * sc, y: cy + tdy * tailLen * 0.45 + tpy * 7 * sc };
    const tailR = { x: cx + tdx * tailLen * 0.45 - tpx * 7 * sc, y: cy + tdy * tailLen * 0.45 - tpy * 7 * sc };

    tail.moveTo(tailBase.x, tailBase.y);
    tail.quadraticCurveTo(tailL.x, tailL.y, tailTip.x, tailTip.y);
    tail.quadraticCurveTo(tailR.x, tailR.y, tailBase.x, tailBase.y);
    tail.closePath();
    fillP(tail);

    // --- Tip glow (responds to anticipation) ---
    const tipPt = ptAt(1, 0);
    const orbSz = 10 + this.handBrightness * 10 + this.energy * 4 + this.anticipation * 8;
    const orbA = 0.4 + this.handBrightness * 0.5 + this.anticipation * 0.3;
    const orbGrd = ctx.createRadialGradient(tipPt.x, tipPt.y, 0, tipPt.x, tipPt.y, orbSz * 3);
    orbGrd.addColorStop(0, `rgba(255,255,255,${(orbA * 0.6).toFixed(3)})`);
    orbGrd.addColorStop(0.3, `rgba(${R},${G},${B},${(orbA * 0.3).toFixed(3)})`);
    orbGrd.addColorStop(1, `rgba(${R},${G},${B},0)`);
    ctx.fillStyle = orbGrd;
    ctx.fillRect(tipPt.x - orbSz * 3, tipPt.y - orbSz * 3, orbSz * 6, orbSz * 6);

    // --- Center hub (pulses with anticipation) ---
    const hubSz = 6 + this.energy * 5 + this.anticipation * 4;
    ctx.beginPath();
    ctx.arc(cx, cy, hubSz * 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${R},${G},${B},${(0.08 + this.energy * 0.12).toFixed(3)})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    const hubGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, hubSz * 2);
    hubGrd.addColorStop(0, `rgba(255,255,255,${(0.2 + this.energy * 0.3).toFixed(3)})`);
    hubGrd.addColorStop(0.4, `rgba(${R},${G},${B},${(0.1 + this.energy * 0.15).toFixed(3)})`);
    hubGrd.addColorStop(1, `rgba(${R},${G},${B},0)`);
    ctx.fillStyle = hubGrd;
    ctx.fillRect(cx - hubSz * 2, cy - hubSz * 2, hubSz * 4, hubSz * 4);

    ctx.beginPath();
    ctx.arc(cx, cy, 2 + this.energy * 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${(0.3 + this.energy * 0.4).toFixed(3)})`;
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
      { key: 'radius', label: 'Radius', type: 'range', value: this.radius, min: 0.3, max: 0.95, step: 0.05 },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'radius') this.radius = value as number;
  }
}
