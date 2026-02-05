// --- Note Spiral Effect ---
// Notes laid out on a logarithmic spiral: each octave is one revolution,
// highest notes at the center, lowest at the rim. Melody notes light up
// and trail connections build a glowing web of musical motion.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { samplePaletteColor, semitoneOffset, MAJOR_OFFSETS, MINOR_OFFSETS } from './effect-utils.ts';

// MIDI range we visualize: full piano range A0 (21) to C8 (108)
const MIDI_LO = 21;  // A0 (lowest piano key)
const MIDI_HI = 108; // C8 (highest piano key)
const MIDI_RANGE = MIDI_HI - MIDI_LO; // 87 semitones, ~7.25 octaves

interface SpiralNode {
  brightness: number;
  velocity: number;  // last hit velocity
  lastHitTime: number;
  r: number;
  g: number;
  b: number;
}

interface Trail {
  from: number;  // MIDI note
  to: number;    // MIDI note
  strength: number;
  age: number;
}

export class NoteSpiralEffect implements VisualEffect {
  readonly id = 'note-spiral';
  readonly name = 'Note Spiral';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'source-over';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private glowCanvas: HTMLCanvasElement;
  private glowCtx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  // One node per MIDI note in range
  private nodes: SpiralNode[] = [];
  private trails: Trail[] = [];
  private lastMidiByTrack: Map<number, number> = new Map(); // track → last MIDI note
  private time = 0;
  private key = 0;
  private keyMode: 'major' | 'minor' = 'major';
  private breathPhase = 0;
  private awake = false;

  // Config
  private intensity = 1.0;
  private trailMax = 24;
  private darkBackdrop = true;
  private glowOutlines = true;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.glowCanvas = document.createElement('canvas');
    this.glowCtx = this.glowCanvas.getContext('2d')!;
    this.initNodes();
  }

  private initNodes(): void {
    this.nodes = [];
    for (let i = 0; i < MIDI_RANGE; i++) {
      const midi = MIDI_LO + i;
      const pc = midi % 12;
      const c = samplePaletteColor(pc, 0.7);
      this.nodes.push({
        brightness: 0,
        velocity: 0,
        lastHitTime: -10,
        r: c[0], g: c[1], b: c[2],
      });
    }
  }

  init(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.glowCanvas.width = width;
    this.glowCanvas.height = height;
    this.ready = true;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.glowCanvas.width = width;
    this.glowCanvas.height = height;
  }

  // Map MIDI note to spiral position
  // Lower notes → smaller radius (center), higher notes → outer rim
  // Angle: semitone within octave maps to 0–2π, offset by key so tonic is at top
  private notePos(midi: number, cx: number, cy: number, maxR: number): { x: number; y: number; r: number } {
    const t = (midi - MIDI_LO) / MIDI_RANGE; // 0 (low) to 1 (high)
    // Radius: center for bass, outer rim for melody
    // Square root curve — more even visual spacing across octaves
    const radius = maxR * (0.02 + 0.98 * Math.sqrt(t));

    // Angle: each semitone is 1/12 of a revolution, key root at 12 o'clock
    const pc = midi % 12;
    const fromRoot = ((pc - this.key + 12) % 12); // 0 = root, 1-11 = semitones above root
    // Twist proportional to position within octave (0 at root, builds to next root)
    const twist = (fromRoot / 12) * 0.15;
    const finalAngle = (fromRoot / 12) * Math.PI * 2 - Math.PI / 2 + twist;
    return {
      x: cx + Math.cos(finalAngle) * radius,
      y: cy + Math.sin(finalAngle) * radius,
      r: radius,
    };
  }

  update(dt: number, music: MusicParams): void {
    this.time += dt;
    this.breathPhase += dt * 0.5;
    this.key = music.key;
    this.keyMode = music.keyMode;

    if (!this.awake) {
      if (music.currentTime > 0.1) this.awake = true;
      else return;
    }

    // Light up all voice onsets (multi-instrument)
    for (const voice of music.activeVoices) {
      if (!voice.onset) continue;
      if (voice.midi < MIDI_LO || voice.midi >= MIDI_HI) continue;

      const idx = voice.midi - MIDI_LO;
      const node = this.nodes[idx];
      node.brightness = 1.0;
      node.velocity = voice.velocity;
      node.lastHitTime = this.time;

      const c = samplePaletteColor(voice.pitchClass, 0.75);
      node.r = c[0]; node.g = c[1]; node.b = c[2];

      // Trail from previous note on same track
      const lastMidi = this.lastMidiByTrack.get(voice.track) ?? -1;
      if (lastMidi >= MIDI_LO && lastMidi < MIDI_HI && lastMidi !== voice.midi) {
        this.trails.push({
          from: lastMidi,
          to: voice.midi,
          strength: 1.0,
          age: 0,
        });
        if (this.trails.length > this.trailMax) this.trails.shift();
      }
      this.lastMidiByTrack.set(voice.track, voice.midi);
    }

    // Beat pulse — brighten active nodes
    if (music.kick) {
      for (const node of this.nodes) {
        if (node.brightness > 0.05) node.brightness = Math.min(1.0, node.brightness + 0.15);
      }
    }

    // Decay nodes
    for (const node of this.nodes) {
      node.brightness *= Math.exp(-2.5 * dt);
    }

    // Decay trails
    for (let i = this.trails.length - 1; i >= 0; i--) {
      this.trails[i].strength *= Math.exp(-0.15 * dt);  // slower decay for longer TTL
      this.trails[i].age += dt;
      if (this.trails[i].strength < 0.005) {
        this.trails.splice(i, 1);
      }
    }
  }

  render(): HTMLCanvasElement {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(cx, cy) * 0.9;
    const breath = 1 + Math.sin(this.breathPhase) * 0.01;

    // --- Dark backdrop with box-shadow effect ---
    if (this.darkBackdrop) {
      ctx.save();
      // Big obvious shadow
      ctx.shadowColor = 'rgba(0,0,0,1)';
      ctx.shadowBlur = 60;
      ctx.shadowOffsetX = 12;
      ctx.shadowOffsetY = 12;

      // Semi-translucent dark disc
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * 0.98, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fill();
      ctx.restore();
    }

    // --- Fade glow canvas toward black (absorbed light persists) ---
    const gctx = this.glowCtx;
    gctx.globalCompositeOperation = 'destination-out';
    gctx.fillStyle = 'rgba(0,0,0,0.008)'; // very slow fade
    gctx.fillRect(0, 0, w, h);
    gctx.globalCompositeOperation = 'screen';

    // Draw glow layer behind everything
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.drawImage(this.glowCanvas, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const diatonicOffsets = this.keyMode === 'minor' ? MINOR_OFFSETS : MAJOR_OFFSETS;

    // --- Draw spiral spine with colored segments ---
    // Draw per-octave so each revolution gets a smooth 12-stop color gradient
    const totalOctaves = Math.floor(MIDI_RANGE / 12);
    for (let oct = 0; oct < totalOctaves; oct++) {
      const octStart = MIDI_LO + oct * 12;
      const octEnd = Math.min(octStart + 12, MIDI_HI);

      // Build positions for this octave
      const positions: { x: number; y: number }[] = [];
      for (let midi = octStart; midi <= octEnd && midi < MIDI_HI; midi++) {
        positions.push(this.notePos(midi, cx, cy, maxR * breath));
      }
      if (positions.length < 2) continue;

      // Measure total arc length for this octave
      let totalLen = 0;
      const segLens: number[] = [0];
      for (let j = 1; j < positions.length; j++) {
        const dx = positions[j].x - positions[j - 1].x;
        const dy = positions[j].y - positions[j - 1].y;
        totalLen += Math.sqrt(dx * dx + dy * dy);
        segLens.push(totalLen);
      }

      // Draw each segment with a gradient spanning from its note color to the next
      for (let j = 1; j < positions.length; j++) {
        const midi = octStart + j;
        const prevMidi = midi - 1;
        const p0 = positions[j - 1];
        const p1 = positions[j];

        const pc0 = prevMidi % 12;
        const pc1 = midi % 12;
        const c0 = samplePaletteColor(pc0, 0.65);
        const c1 = samplePaletteColor(pc1, 0.65);

        const semi = semitoneOffset(midi % 12, this.key);
        const prevSemi = semitoneOffset(prevMidi % 12, this.key);
        const inKey = diatonicOffsets.has(semi) || diatonicOffsets.has(prevSemi);
        const baseAlpha = inKey ? 0.4 : 0.15;
        const lw = inKey ? 2.0 : 1.0;

        const grad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
        grad.addColorStop(0, `rgba(${c0[0]},${c0[1]},${c0[2]},${baseAlpha})`);
        grad.addColorStop(1, `rgba(${c1[0]},${c1[1]},${c1[2]},${baseAlpha})`);

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = lw;
        ctx.stroke();
      }
    }

    // --- Draw trails (stepwise follows curve, leaps are straight) ---
    for (const trail of this.trails) {
      if (trail.from < MIDI_LO || trail.from >= MIDI_HI) continue;
      if (trail.to < MIDI_LO || trail.to >= MIDI_HI) continue;

      const p0 = this.notePos(trail.from, cx, cy, maxR * breath);
      const p1 = this.notePos(trail.to, cx, cy, maxR * breath);

      const n0 = this.nodes[trail.from - MIDI_LO];
      const n1 = this.nodes[trail.to - MIDI_LO];
      const mr = Math.round((n0.r + n1.r) / 2);
      const mg = Math.round((n0.g + n1.g) / 2);
      const mb = Math.round((n0.b + n1.b) / 2);

      const s = trail.strength;
      const interval = Math.abs(trail.to - trail.from);

      // Stepwise motion (1-3 semitones) follows the spiral curve
      // Larger intervals are straight lines
      const isStepwise = interval <= 3;

      const drawPath = () => {
        ctx.beginPath();

        if (isStepwise && interval > 0) {
          // Follow spiral curve for stepwise motion
          const steps = interval * 4;  // smooth curve
          const minMidi = Math.min(trail.from, trail.to);
          const maxMidi = Math.max(trail.from, trail.to);
          const goingUp = trail.to > trail.from;

          const firstPos = goingUp
            ? this.notePos(minMidi, cx, cy, maxR * breath)
            : this.notePos(maxMidi, cx, cy, maxR * breath);
          ctx.moveTo(firstPos.x, firstPos.y);

          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const midi = goingUp
              ? minMidi + t * (maxMidi - minMidi)
              : maxMidi - t * (maxMidi - minMidi);
            const pos = this.notePos(midi, cx, cy, maxR * breath);
            ctx.lineTo(pos.x, pos.y);
          }
        } else {
          // Straight line for leaps
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
        }
      };

      // Outer glow
      drawPath();
      ctx.strokeStyle = `rgba(${mr},${mg},${mb},${(s * 0.08 * this.intensity).toFixed(3)})`;
      ctx.lineWidth = 8 + s * 6;
      ctx.stroke();

      // Core
      drawPath();
      const bright = s * s;
      const wr = Math.min(255, mr + Math.round((255 - mr) * bright * 0.4));
      const wg = Math.min(255, mg + Math.round((255 - mg) * bright * 0.4));
      const wb = Math.min(255, mb + Math.round((255 - mb) * bright * 0.4));
      ctx.strokeStyle = `rgba(${wr},${wg},${wb},${(s * 0.35 * this.intensity).toFixed(3)})`;
      ctx.lineWidth = 1.5 + s * 2;
      ctx.stroke();
    }

    // --- Draw nodes ---
    for (let i = 0; i < MIDI_RANGE; i++) {
      const midi = MIDI_LO + i;
      const node = this.nodes[i];
      const pos = this.notePos(midi, cx, cy, maxR * breath);
      const pc = midi % 12;
      const semitones = semitoneOffset(pc, this.key);
      const inKey = diatonicOffsets.has(semitones);

      const timeSinceHit = this.time - node.lastHitTime;

      const alpha = node.brightness;

      // Flashlight beam projecting outward from center through the note
      // t: 0 = bass (inner), 1 = treble (outer)
      // Bass: wide, short, dim.  Treble: narrow, long, bright.
      if (alpha > 0.03) {
        const dx = pos.x - cx;
        const dy = pos.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          const pitch01 = (midi - MIDI_LO) / MIDI_RANGE; // 0=low, 1=high
          const beamAngle = Math.atan2(dy, dx);
          const fullBeamLen = maxR * 1.3 - dist;
          // Length: bass 40%, treble 100%
          const beamLen = fullBeamLen * (0.4 + 0.6 * pitch01);
          // Spread: bass wide (0.5 rad), treble narrow (0.15 rad)
          const spread = 0.5 - 0.35 * pitch01 + alpha * 0.08;
          // Brightness: bass dim (0.08), treble bright (0.35)
          const brightMix = 0.08 + 0.27 * pitch01;

          if (beamLen > 0) {
            // Beam tip
            const tipX = pos.x + Math.cos(beamAngle) * beamLen;
            const tipY = pos.y + Math.sin(beamAngle) * beamLen;

            // Gradient along beam direction
            const grad = ctx.createLinearGradient(pos.x, pos.y, tipX, tipY);
            const beamAlpha = alpha * brightMix * node.velocity * this.intensity;
            grad.addColorStop(0, `rgba(${node.r},${node.g},${node.b},${beamAlpha.toFixed(3)})`);
            grad.addColorStop(0.4, `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.3).toFixed(3)})`);
            grad.addColorStop(1, `rgba(${node.r},${node.g},${node.b},0)`);

            // Draw cone as a triangle fan
            const edgeL = beamLen * 0.7;
            const conePath = new Path2D();
            conePath.moveTo(pos.x, pos.y);
            conePath.lineTo(
              pos.x + Math.cos(beamAngle - spread) * edgeL,
              pos.y + Math.sin(beamAngle - spread) * edgeL
            );
            conePath.lineTo(tipX, tipY);
            conePath.lineTo(
              pos.x + Math.cos(beamAngle + spread) * edgeL,
              pos.y + Math.sin(beamAngle + spread) * edgeL
            );
            conePath.closePath();
            ctx.fillStyle = grad;
            ctx.fill(conePath);

            // Stamp beam onto glow canvas (absorbed light)
            const glowGrad = gctx.createLinearGradient(pos.x, pos.y, tipX, tipY);
            const stampAlpha = alpha * (0.02 + 0.04 * pitch01) * node.velocity;
            glowGrad.addColorStop(0, `rgba(${node.r},${node.g},${node.b},${stampAlpha.toFixed(3)})`);
            glowGrad.addColorStop(0.5, `rgba(${node.r},${node.g},${node.b},${(stampAlpha * 0.3).toFixed(3)})`);
            glowGrad.addColorStop(1, `rgba(${node.r},${node.g},${node.b},0)`);
            gctx.fillStyle = glowGrad;
            gctx.fill(conePath);
          }
        }

        // Point glow at note position
        const glowR = 8 + alpha * 25 + node.velocity * 10;
        const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR);
        glow.addColorStop(0, `rgba(${node.r},${node.g},${node.b},${(alpha * 0.6 * this.intensity).toFixed(3)})`);
        glow.addColorStop(0.4, `rgba(${node.r},${node.g},${node.b},${(alpha * 0.2 * this.intensity).toFixed(3)})`);
        glow.addColorStop(1, `rgba(${node.r},${node.g},${node.b},0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(pos.x - glowR, pos.y - glowR, glowR * 2, glowR * 2);
      }

      // Dot: diatonic notes brighter, chromatic visible
      const baseAlpha = inKey ? 0.3 : 0.12;
      const dotAlpha = baseAlpha + alpha * 0.75;
      if (dotAlpha < 0.005) continue;

      const dotR = inKey ? (4.5 + alpha * 6) : (2.5 + alpha * 4);
      const wt = alpha * alpha;
      const cr = Math.min(255, node.r + Math.round((255 - node.r) * wt * 0.5));
      const cg = Math.min(255, node.g + Math.round((255 - node.g) * wt * 0.5));
      const cb = Math.min(255, node.b + Math.round((255 - node.b) * wt * 0.5));

      // Glow outline around dot for contrast
      if (this.glowOutlines && dotAlpha > 0.1) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, dotR + 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${(dotAlpha * 0.4 * this.intensity).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${Math.min(1, dotAlpha * this.intensity).toFixed(3)})`;
      ctx.fill();

      // Pulse ring on hit
      if (timeSinceHit < 0.6) {
        const pulseT = timeSinceHit / 0.6;
        const pulseR = 6 + pulseT * 30;
        const pulseAlpha = (1 - pulseT * pulseT) * 0.25 * node.velocity;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${node.r},${node.g},${node.b},${pulseAlpha.toFixed(3)})`;
        ctx.lineWidth = 1.5 * (1 - pulseT);
        ctx.stroke();
      }
    }

    // --- Draw octave markers at tonic positions ---
    ctx.globalAlpha = 0.15;
    for (let oct = 0; oct < 5; oct++) {
      const midi = MIDI_LO + this.key - (MIDI_LO % 12) + oct * 12;
      if (midi < MIDI_LO || midi >= MIDI_HI) continue;
      const pos = this.notePos(midi, cx, cy, maxR * breath);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
    return this.canvas;
  }

  isReady(): boolean { return this.ready; }

  dispose(): void {
    this.ready = false;
    this.trails = [];
    this.lastMidiByTrack.clear();
    this.awake = false;
    this.initNodes();
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'intensity', label: 'Intensity', type: 'range', value: this.intensity, min: 0.3, max: 2.0, step: 0.1 },
      { key: 'trailMax', label: 'Trail Length', type: 'range', value: this.trailMax, min: 6, max: 48, step: 6 },
      { key: 'darkBackdrop', label: 'Dark Backdrop', type: 'toggle', value: this.darkBackdrop },
      { key: 'glowOutlines', label: 'Glow Outlines', type: 'toggle', value: this.glowOutlines },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'intensity') this.intensity = value as number;
    if (key === 'trailMax') this.trailMax = value as number;
    if (key === 'darkBackdrop') this.darkBackdrop = value as boolean;
    if (key === 'glowOutlines') this.glowOutlines = value as boolean;
  }
}
