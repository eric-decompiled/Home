// --- Note Star Effect ---
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
  sustained: boolean;    // true if note is still held
  hasBeam: boolean;      // true once note qualifies for beam (held 2+ beats)
}

export class NoteStarEffect implements VisualEffect {
  readonly id = 'note-star';
  readonly name = 'Note Star';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'screen';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  private stars: TravelingStar[] = [];
  private time = 0;
  private key = 0;
  private keyRotation = 0;
  private spiralTightness = 0.9;
  private loudness = 0;
  private beatGrooveCurrent = 0.5;
  private barGrooveCurrent = 0.5;
  private awake = false;
  private beatDuration = 0.5;
  private bpm = 120;

  // Config
  private intensity = 1.0;
  private maxStars = 384;

  // Pulse-based anticipation: flash upcoming notes on beat boundaries
  // This avoids timing issues with continuous tracking across different tempos
  private anticipationPulses: Map<string, { alpha: number; midi: number; pitchClass: number }> = new Map();
  private lastBeatIndex = -1;

  // Beam constants - solid lines for sustained notes
  private static readonly SUSTAIN_THRESHOLD_BEATS = 2; // only beam notes held 2+ beats

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

    // Track beat duration and BPM for speed scaling
    this.beatDuration = Math.max(0.2, music.beatDuration);
    this.bpm = music.bpm || 120;

    // === PULSE-BASED ANTICIPATION ===
    // On each beat, flash notes that will play in the next beat window
    // This avoids timing issues with continuous tracking across different tempos
    const currentBeatIndex = music.beatIndex;

    // Trigger new pulses on beat boundary
    if (currentBeatIndex !== this.lastBeatIndex && music.onBeat) {
      this.lastBeatIndex = currentBeatIndex;

      // Find notes that will play in the next beat
      const nextBeatWindow = this.beatDuration * 1.1; // Slightly more than one beat
      for (const note of music.upcomingNotes) {
        if (note.midi < MIDI_LO || note.midi >= MIDI_HI) continue;
        if (note.timeUntil <= 0 || note.timeUntil > nextBeatWindow) continue;

        // Create unique key for this note instance
        const key = `${note.midi}-${Math.round(note.time * 100)}`;
        if (!this.anticipationPulses.has(key)) {
          this.anticipationPulses.set(key, {
            alpha: 0.8,
            midi: note.midi,
            pitchClass: note.midi % 12,
          });
        }
      }
    }

    // Decay existing pulses
    const decayRate = 5.0; // Fast decay - pulses last ~0.15s
    for (const [key, pulse] of this.anticipationPulses) {
      pulse.alpha *= Math.exp(-decayRate * dt);
      if (pulse.alpha < 0.02) {
        this.anticipationPulses.delete(key);
      }
    }

    // Groove intensity: off-beat lowest, beat 1 brightest (reduced variability)
    const grooveIntensity = 0.55 + this.beatGrooveCurrent * 0.25 + this.barGrooveCurrent * 0.25;

    // Track which notes are currently active (for sustain detection)
    const activeNotes = new Set<number>();
    for (const voice of music.activeVoices) {
      if (voice.midi >= MIDI_LO && voice.midi < MIDI_HI) {
        activeNotes.add(voice.midi);
      }
    }

    // Update sustained status for existing stars
    for (const star of this.stars) {
      star.sustained = activeNotes.has(star.startMidi);
    }

    // Spawn stars on note onsets
    const beamThresholdSec = this.beatDuration * NoteStarEffect.SUSTAIN_THRESHOLD_BEATS;

    for (const voice of music.activeVoices) {
      if (voice.midi < MIDI_LO || voice.midi >= MIDI_HI) continue;
      if (!voice.onset) continue;

      // Look up note duration from upcomingNotes (timeUntil <= 0 means currently playing)
      const matchingNote = music.upcomingNotes.find(
        n => n.midi === voice.midi && n.timeUntil <= 0 && n.timeUntil > -0.1
      );
      const noteDuration = matchingNote?.duration ?? 0;
      const qualifiesForBeam = noteDuration >= beamThresholdSec;

      const loudnessFactor = 0.25 + this.loudness * 0.75;
      const c = samplePaletteColor(voice.pitchClass, 0.75);
      // Compress velocity: high floor, narrow range for consistent brightness
      const compressedVel = 0.5 + 0.5 * Math.pow(voice.velocity, 0.5);
      const noteIntensity = compressedVel * loudnessFactor * grooveIntensity;

      this.stars.push({
        pitchClass: voice.pitchClass,
        progress: 0,
        alpha: 1.5 * noteIntensity,
        color: [c[0], c[1], c[2]],
        velocity: compressedVel * grooveIntensity,
        startMidi: voice.midi,
        age: 0,
        sustained: true,
        hasBeam: qualifiesForBeam, // Set immediately based on note duration
      });

      if (this.stars.length > this.maxStars) this.stars.shift();
    }

    // Update stars - speed scales subtly with BPM
    // Slower songs = slightly slower travel, faster songs = slightly faster
    const speedScale = Math.pow(this.bpm / 120, 0.25);  // ~0.84x at 60bpm, ~1.11x at 180bpm

    for (let i = this.stars.length - 1; i >= 0; i--) {
      const star = this.stars[i];

      // Sustained notes: slower travel, don't fade
      const isSustained = star.sustained;
      const starSpeed = isSustained ? 0.03 : 0.06;
      star.progress += dt * starSpeed * speedScale;
      star.age += dt;

      // Only fade if note is released
      if (!isSustained) {
        const fadeRate = 0.08 + star.progress * 0.15;
        star.alpha *= Math.exp(-fadeRate * dt);
      }

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
    const cy = h / 2;  // centered
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

    // Draw anticipation pulses (beat-synced flashes)
    for (const [, pulse] of this.anticipationPulses) {
      const pos = spiralPos(pulse.midi, pulse.pitchClass, this.key, this.keyRotation, cx, cy, maxR, this.spiralTightness);
      const c = samplePaletteColor(pulse.pitchClass, 0.75);
      const alpha = pulse.alpha * this.intensity;

      if (alpha < 0.02) continue;

      // Fixed glow size (no growth - pulse fades out quickly)
      const glowR = 6;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(alpha * 0.4).toFixed(3)})`;
      ctx.fill();

      // Inner core
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, glowR * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha.toFixed(3)})`;
      ctx.fill();
    }

    // Groove pulse factor (reduced variability, same average)
    const groovePulse = 0.85 + this.beatGrooveCurrent * 0.2 + this.barGrooveCurrent * 0.15;

    // Draw stars with comet trails
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const star of this.stars) {
      const eased = 1 - Math.pow(1 - star.progress, 2);
      const effectiveMidi = MIDI_LO + (star.startMidi - MIDI_LO) * (1 - eased);

      // Spiral twist based on semitones traveled (quarter speed)
      const midiTraveled = star.startMidi - effectiveMidi;
      const spiralTwist = (midiTraveled / 48) * Math.PI * 2;

      const totalRotation = this.keyRotation + spiralTwist;
      const pos = spiralPos(effectiveMidi, star.pitchClass, this.key, totalRotation, cx, cy, maxR, this.spiralTightness);

      // Pulse size and alpha with groove (compressed for softer look)
      const baseSize = 2.5 + star.velocity * 3 * (1 - eased * 0.85);
      const size = baseSize * groovePulse;
      const alpha = Math.min(0.75, star.alpha * this.intensity * groovePulse * 0.7);

      if (alpha < 0.01) continue;

      // === SOLID LIGHT BEAM following spiral (sustained notes 2+ beats) ===
      if (star.hasBeam && star.progress > 0.01) {
        const loudnessFactor = 0.3 + this.loudness * 0.7;
        // Attack curve: bright on strike, settles to sustain level
        // Peak at ~0.1s, then exponential decay to 40% sustain
        const attackPeak = Math.min(1, star.age / 0.1); // Rise 0->1 over 0.1s
        const decayFactor = 0.4 + 0.6 * Math.exp(-star.age * 3); // 1.0 -> 0.4 over ~0.5s
        const attackEnvelope = attackPeak * decayFactor;
        const beamAlpha = alpha * loudnessFactor * attackEnvelope;

        // Sample points along the spiral from spawn (progress=0) to head
        const trailEnd = star.progress; // Trail ends at head position
        const numSegments = Math.max(8, Math.floor(trailEnd * 40)); // More segments as beam grows
        const points: { x: number; y: number }[] = [];

        for (let s = 0; s <= numSegments; s++) {
          const t = (s / numSegments) * trailEnd; // 0 to trailEnd
          const segEased = 1 - Math.pow(1 - t, 2);
          const segMidi = MIDI_LO + (star.startMidi - MIDI_LO) * (1 - segEased);
          const segTraveled = star.startMidi - segMidi;
          const segTwist = (segTraveled / 48) * Math.PI * 2;
          const segRotation = this.keyRotation + segTwist;
          const segPos = spiralPos(segMidi, star.pitchClass, this.key, segRotation, cx, cy, maxR, this.spiralTightness);
          points.push({ x: segPos.x, y: segPos.y });
        }

        // Draw beam as smooth curve through spiral points
        const drawBeamPath = () => {
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          // Use quadratic curves through midpoints for smooth spiral
          for (let p = 1; p < points.length - 1; p++) {
            const midX = (points[p].x + points[p + 1].x) / 2;
            const midY = (points[p].y + points[p + 1].y) / 2;
            ctx.quadraticCurveTo(points[p].x, points[p].y, midX, midY);
          }
          // Final segment to last point
          if (points.length > 1) {
            const last = points[points.length - 1];
            ctx.lineTo(last.x, last.y);
          }
        };

        // Wide outer glow
        drawBeamPath();
        ctx.strokeStyle = `rgba(${star.color[0]},${star.color[1]},${star.color[2]},${(beamAlpha * 0.2).toFixed(3)})`;
        ctx.lineWidth = 16;
        ctx.stroke();

        // Mid glow
        drawBeamPath();
        ctx.strokeStyle = `rgba(${star.color[0]},${star.color[1]},${star.color[2]},${(beamAlpha * 0.4).toFixed(3)})`;
        ctx.lineWidth = 8;
        ctx.stroke();

        // Bright core
        drawBeamPath();
        ctx.strokeStyle = `rgba(${star.color[0]},${star.color[1]},${star.color[2]},${(beamAlpha * 0.7).toFixed(3)})`;
        ctx.lineWidth = 4;
        ctx.stroke();

        // Hot white center
        drawBeamPath();
        ctx.strokeStyle = `rgba(255,255,255,${(beamAlpha * 0.5).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // === STAR HEAD ===
      // Layer 1: Soft outer glow
      const glowSize = size * (1.6 + groovePulse * 0.4);
      const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowSize);
      grad.addColorStop(0, `rgba(${star.color[0]},${star.color[1]},${star.color[2]},${(alpha * 0.5).toFixed(3)})`);
      grad.addColorStop(0.35, `rgba(${star.color[0]},${star.color[1]},${star.color[2]},${(alpha * 0.25).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${star.color[0]},${star.color[1]},${star.color[2]},0)`);

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, glowSize, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Layer 2: Mid ring (softer colored halo)
      const midSize = size * 1.2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, midSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${star.color[0]},${star.color[1]},${star.color[2]},${(alpha * 0.35).toFixed(3)})`;
      ctx.fill();

      // Layer 3: Solid colored core
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${star.color[0]},${star.color[1]},${star.color[2]},${(alpha * 0.8).toFixed(3)})`;
      ctx.fill();

      // Layer 4: Center highlight (toned down)
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size * 0.3, 0, Math.PI * 2);
      const centerAlpha = Math.min(0.7, alpha * (0.6 + groovePulse * 0.25));
      ctx.fillStyle = `rgba(255,255,255,${centerAlpha.toFixed(3)})`;
      ctx.fill();
    }

    ctx.restore();
    return this.canvas;
  }

  isReady(): boolean { return this.ready; }

  dispose(): void {
    this.ready = false;
    this.stars = [];
    this.anticipationPulses.clear();
    this.lastBeatIndex = -1;
    this.awake = false;
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'intensity', label: 'Intensity', type: 'range', value: this.intensity, min: 0.1, max: 2, step: 0.1 },
    ];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return { intensity: 1.0 };
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'intensity') this.intensity = value as number;
    if (key === 'spiralTightness') this.spiralTightness = value as number;
  }
}
