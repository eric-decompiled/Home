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
  readonly name = 'Star';
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
  private activeShapes: Set<string> = new Set(); // optional shapes: ring, trails, spark, firefly

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

      const loudnessFactor = 0.5 + this.loudness * 0.5;
      const c = samplePaletteColor(voice.pitchClass, 0.75);
      // Heavy compression: quiet notes stay bright, loud notes only slightly brighter
      const compressedVel = 0.75 + 0.25 * Math.pow(voice.velocity, 0.4);
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

      // Constant speed movement (sustained notes just don't fade)
      const starSpeed = 0.045;
      star.progress += dt * starSpeed * speedScale;
      star.age += dt;

      // Only fade if note is released
      if (!star.sustained) {
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

    // Draw anticipation pulses (beat-synced flashes)
    {
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
      // Gentle brightness fade as stars slow down near center
      const progressFade = 1 - eased * 0.2;
      const baseSize = 2.5 + star.velocity * 3 * (1 - eased * 0.85);
      const size = baseSize * groovePulse;
      const alpha = Math.min(0.85, star.alpha * this.intensity * groovePulse * 0.85 * progressFade);

      if (alpha < 0.01) continue;

      // === SOLID LIGHT BEAM following spiral (sustained notes 2+ beats) ===
      if (star.hasBeam && star.progress > 0.01) {
        const loudnessFactor = 0.5 + this.loudness * 0.5;
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

      // === STAR HEAD (always rendered) ===
      {
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

      // === OPTIONAL SHAPES (shared with note-spiral) ===
      const shapeAlpha = alpha * this.intensity;
      const shapeSize = size * 2;

      // Ring - expanding circular ripples
      if (this.activeShapes.has('ring')) {
        const rings = 3;
        for (let r = 0; r < rings; r++) {
          const ringR = shapeSize * 2 * (r + 1);
          const ringAlpha = shapeAlpha * (1 - r / rings) * 0.4;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${star.color[0]},${star.color[1]},${star.color[2]},${ringAlpha.toFixed(3)})`;
          ctx.lineWidth = 3 - r;
          ctx.stroke();
        }
      }

      // Spark - electric crackling lines
      if (this.activeShapes.has('spark')) {
        const numSparks = 5;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let s = 0; s < numSparks; s++) {
          const sparkAngle = (s / numSparks) * Math.PI * 2 + this.time * 2;
          const sparkLen = shapeSize * 3 * (0.5 + Math.random() * 0.5);
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          let sx = pos.x, sy = pos.y;
          const segs = 3;
          for (let j = 0; j < segs; j++) {
            const t = (j + 1) / segs;
            const jitter = (Math.random() - 0.5) * 12;
            sx = pos.x + Math.cos(sparkAngle) * sparkLen * t + Math.cos(sparkAngle + Math.PI/2) * jitter;
            sy = pos.y + Math.sin(sparkAngle) * sparkLen * t + Math.sin(sparkAngle + Math.PI/2) * jitter;
            ctx.lineTo(sx, sy);
          }
          ctx.strokeStyle = `rgba(${star.color[0]},${star.color[1]},${star.color[2]},${(shapeAlpha * 0.5).toFixed(3)})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
      }

      // Firefly - dancing particles around the star
      if (this.activeShapes.has('firefly')) {
        const beatPhase = (this.time % this.beatDuration) / this.beatDuration;
        const numFlies = 3;
        let beatFade = 1.0;
        if (beatPhase < 0.2) beatFade = beatPhase / 0.2;
        else if (beatPhase > 0.6) beatFade = 1.0 - (beatPhase - 0.6) / 0.4;

        for (let f = 0; f < numFlies; f++) {
          const flyAngle = (f / numFlies) * Math.PI * 2 + this.time * 3 + star.pitchClass;
          const flyDist = shapeSize * 2 * (0.8 + Math.sin(this.time * 4 + f) * 0.3);
          const wobble = Math.sin(this.time * 6 + f * 2) * 4;
          const fx = pos.x + Math.cos(flyAngle) * flyDist + wobble;
          const fy = pos.y + Math.sin(flyAngle) * flyDist + wobble;
          const flyR = 2 + Math.sin(this.time * 8 + f) * 0.5;
          const flyAlpha = shapeAlpha * 0.6 * beatFade;

          // Outer glow
          ctx.fillStyle = `rgba(${star.color[0]},${star.color[1]},${star.color[2]},${(flyAlpha * 0.3).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(fx, fy, flyR * 2, 0, Math.PI * 2);
          ctx.fill();
          // Core
          ctx.fillStyle = `rgba(255,255,220,${flyAlpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(fx, fy, flyR * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Trails - fading line from spawn point (uses eased for length)
      if (this.activeShapes.has('trails') && star.progress > 0.05) {
        const trailLen = star.progress * 0.5; // trail is half the traveled distance
        const trailStart = star.progress - trailLen;
        const startEased = 1 - Math.pow(1 - trailStart, 2);
        const startMidi = MIDI_LO + (star.startMidi - MIDI_LO) * (1 - startEased);
        const startTraveled = star.startMidi - startMidi;
        const startTwist = (startTraveled / 48) * Math.PI * 2;
        const startRotation = this.keyRotation + startTwist;
        const startPos = spiralPos(startMidi, star.pitchClass, this.key, startRotation, cx, cy, maxR, this.spiralTightness);

        const grad = ctx.createLinearGradient(startPos.x, startPos.y, pos.x, pos.y);
        grad.addColorStop(0, `rgba(${star.color[0]},${star.color[1]},${star.color[2]},0)`);
        grad.addColorStop(1, `rgba(${star.color[0]},${star.color[1]},${star.color[2]},${(shapeAlpha * 0.4).toFixed(3)})`);
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
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
      {
        key: 'activeShapes',
        label: 'Ornaments',
        type: 'multi-toggle',
        value: Array.from(this.activeShapes).join(','),
        options: ['ring', 'trails', 'spark', 'firefly'],
      },
    ];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return { intensity: 1.0, setShapes: '' };
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'intensity') this.intensity = value as number;
    if (key === 'spiralTightness') this.spiralTightness = value as number;
    if (key === 'activeShapes') {
      // Toggle the shape on/off
      const shape = value as string;
      if (this.activeShapes.has(shape)) {
        this.activeShapes.delete(shape);
      } else {
        this.activeShapes.add(shape);
      }
    }
    if (key === 'setShapes') {
      // Set shapes directly (comma-separated list)
      this.activeShapes.clear();
      const valueStr = typeof value === 'string' ? value : String(value ?? '');
      const shapes = valueStr.split(',').filter(s => s);
      for (const s of shapes) this.activeShapes.add(s);
    }
  }
}
