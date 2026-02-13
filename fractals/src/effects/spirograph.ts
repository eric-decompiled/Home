// --- Spirograph Effect ---
// Voice-driven spirograph: one orbit per active voice.
// High notes orbit near center (fast), bass on outside (slow).
// Orbits are elliptical, elongated toward the chord root direction.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { palettes } from '../fractal-engine.ts';

interface TrailPoint {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
}

interface VoiceOrbit {
  trackIndex: number;
  midi: number;              // current MIDI note
  radius: number;            // orbital radius (0-1), based on pitch
  revsPerBeat: number;       // orbital speed
  precessionRatio: number;   // petal pattern
  brightness: number;        // fades when voice stops
  trail: TrailPoint[];
  currentColor: [number, number, number];
  // Gentle gravitational perturbation (bed sheet model)
  perturbX: number;          // current perturbation offset
  perturbY: number;
}

// Gravity wells at each pitch class position (like melody web)
interface GravityWell {
  strength: number;  // 0-1, decays when no notes at this pitch class
}

// Petal ratios indexed by track
const PETAL_RATIOS = [1/5, 1/7, 1/3, 1/11, 1/9, 1/13, 1/4, 1/6];

const MAX_VOICES = 8;

export class SpirographEffect implements VisualEffect {
  readonly id = 'spirograph';
  readonly name = 'Spirograph';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'screen';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  // Sun state
  private sunBrightness = 0.3;
  private sunPulse = 0;
  private sunColor: [number, number, number] = [255, 200, 100];

  // Voice-driven orbits (keyed by track index)
  private orbits: Map<number, VoiceOrbit> = new Map();

  // 12 gravity wells, one per pitch class (like melody web positions)
  private gravityWells: GravityWell[] = [];

  // Beat tracking
  private totalBeats = 0;
  private lastBeatPosition = 0;

  // Tonal bias - elongates orbits toward chord root direction
  private biasAngle = 0;
  private targetBiasAngle = 0;
  private eccentricity = 0.5;

  // Config
  private trailLength = 800;
  private paletteIndex = 0;
  private keyRotation = 0;
  private gravityStrength = 0.008;  // very gentle - bed sheet model

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  init(width: number, height: number): void {
    this.resize(width, height);
    // Initialize 12 gravity wells (one per pitch class)
    this.gravityWells = [];
    for (let i = 0; i < 12; i++) {
      this.gravityWells.push({ strength: 0 });
    }
    this.ready = true;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  // Convert MIDI pitch to orbital radius (high = inner/small, low = outer/large)
  private midiToRadius(midi: number): number {
    // MIDI range roughly 21-108
    const normalized = Math.max(0, Math.min(1, (midi - 21) / (108 - 21)));
    const inverted = 1 - normalized;  // high pitch = small radius
    return 0.12 + inverted * 0.68;
  }

  // Convert MIDI pitch to orbital speed (high = fast, low = slow)
  private midiToSpeed(midi: number): number {
    const normalized = Math.max(0, Math.min(1, (midi - 21) / (108 - 21)));
    // High notes: 2.5 revs/beat, low notes: 0.3 revs/beat
    return 0.3 + normalized * 2.2;
  }

  // Get position for a pitch class gravity well
  // Positioned halfway between center and the numeral position
  private pitchClassPosition(pc: number): [number, number] {
    // Angle: pitch class around the circle, with key rotation so tonic = north
    const angle = (pc / 12) * Math.PI * 2 - Math.PI / 2 + this.keyRotation;
    // Halfway between center and outer edge - gentler influence on orbits
    const radius = 0.4;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    return [x, y];
  }

  // Get color from palette based on pitch
  private getPitchColor(midi: number): [number, number, number] {
    if (this.paletteIndex < 0 || this.paletteIndex >= palettes.length) {
      return [128, 128, 128];
    }
    const p = palettes[this.paletteIndex];
    const numStops = p.stops.length;
    if (numStops === 0) return [128, 128, 128];

    // High pitch = bright, low pitch = darker
    const normalized = Math.max(0, Math.min(1, (midi - 21) / (108 - 21)));
    const stopIndex = Math.floor(2 + normalized * (numStops - 3));
    const clampedIndex = Math.max(0, Math.min(numStops - 1, stopIndex));
    const color = p.stops[clampedIndex]?.color ?? [128, 128, 128];
    return [color[0], color[1], color[2]];
  }

  // Elliptical orbit position
  private orbitPosition(orbit: VoiceOrbit, scale: number, beatProgress: number): [number, number] {
    const revolutions = beatProgress * orbit.revsPerBeat;
    const theta = revolutions * Math.PI * 2;
    const psi = revolutions * orbit.precessionRatio * Math.PI * 2;

    const r = orbit.radius * scale;
    const a = r * (1 + this.eccentricity);
    const b = r * (1 - this.eccentricity);

    const orbitAngle = theta + psi;
    const ex = a * Math.cos(orbitAngle);
    const ey = b * Math.sin(orbitAngle);

    const cosB = Math.cos(this.biasAngle);
    const sinB = Math.sin(this.biasAngle);
    const x = ex * cosB - ey * sinB;
    const y = ex * sinB + ey * cosB;

    return [x, y];
  }

  update(dt: number, music: MusicParams): void {
    dt = Math.min(dt, 0.1);

    // === GROOVE CURVES ===
    const beatAnticipation = music.beatAnticipation ?? 0;
    const beatArrival = music.beatArrival ?? 0;
    const barArrival = music.barArrival ?? 0;

    // Sun pulsing - groove curves add anticipation glow
    if (music.kick) this.sunPulse += 0.8;
    if (music.snare) this.sunPulse += 0.5;
    if (music.hihat) this.sunPulse += 0.15;
    // Arrival impact adds to pulse
    this.sunPulse += beatArrival * 0.4 + barArrival * 0.6;
    this.sunPulse *= Math.exp(-4.0 * dt);
    // Anticipation creates growing glow before beat lands
    const anticipationGlow = beatAnticipation * 0.15;
    this.sunBrightness = 0.3 + this.sunPulse * 0.7 + anticipationGlow;

    // Palette
    this.paletteIndex = music.paletteIndex;
    if (music.paletteIndex >= 0 && music.paletteIndex < palettes.length) {
      const p = palettes[music.paletteIndex];
      const c = p.stops[Math.min(5, p.stops.length - 1)]?.color ?? [255, 200, 100];
      this.sunColor = [c[0], c[1], c[2]];
    }

    // Beat tracking
    if (music.beatPosition < this.lastBeatPosition - 0.5) {
      this.totalBeats += 1;
    }
    this.lastBeatPosition = music.beatPosition;

    // Tonal bias
    const chordRootAngle = (music.chordRoot / 12) * Math.PI * 2 - Math.PI / 2 + music.keyRotation;
    this.targetBiasAngle = chordRootAngle;
    let angleDiff = this.targetBiasAngle - this.biasAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.biasAngle += angleDiff * 4.0 * dt;

    // Store key rotation for attractor positioning
    this.keyRotation = music.keyRotation;

    // Track which tracks are currently active
    const activeTracks = new Set<number>();

    // Update orbits from active voices (non-drum only)
    for (const voice of music.activeVoices) {
      const trackInfo = music.tracks[voice.track];
      if (trackInfo?.isDrum) continue;
      if (activeTracks.size >= MAX_VOICES) break;

      activeTracks.add(voice.track);

      let orbit = this.orbits.get(voice.track);
      if (!orbit) {
        // Create new orbit for this track
        orbit = {
          trackIndex: voice.track,
          midi: voice.midi,
          radius: this.midiToRadius(voice.midi),
          revsPerBeat: this.midiToSpeed(voice.midi),
          precessionRatio: PETAL_RATIOS[voice.track % PETAL_RATIOS.length],
          brightness: 0,
          trail: [],
          currentColor: this.getPitchColor(voice.midi),
          perturbX: 0,
          perturbY: 0,
        };
        this.orbits.set(voice.track, orbit);
      }

      // Update orbit based on current voice
      orbit.midi = voice.midi;
      orbit.radius = this.midiToRadius(voice.midi);
      orbit.revsPerBeat = this.midiToSpeed(voice.midi);
      orbit.currentColor = this.getPitchColor(voice.midi);
      orbit.brightness = Math.min(1, orbit.brightness + 5.0 * dt);  // fade in

      // Add to gravity well at this pitch class
      const pc = voice.midi % 12;
      this.gravityWells[pc].strength = Math.min(1, this.gravityWells[pc].strength + voice.velocity * 0.5);
    }

    // Fade out inactive orbits
    for (const orbit of this.orbits.values()) {
      if (!activeTracks.has(orbit.trackIndex)) {
        orbit.brightness *= Math.exp(-3.0 * dt);
      }
    }

    // Decay all gravity wells
    for (const well of this.gravityWells) {
      well.strength *= Math.exp(-2.0 * dt);
    }

    // Apply gentle gravitational influence from all 12 pitch class wells
    // Like a bed sheet being gently pushed down at various points
    const beatProgress = this.totalBeats + this.lastBeatPosition;

    for (const orbit of this.orbits.values()) {
      // Get the base orbit position (normalized 0-1 scale)
      const [baseX, baseY] = this.orbitPosition(orbit, 1.0, beatProgress);

      // Sum gentle pulls from all active gravity wells
      let pullX = 0;
      let pullY = 0;

      for (let pc = 0; pc < 12; pc++) {
        const wellStrength = this.gravityWells[pc].strength;
        if (wellStrength < 0.01) continue;

        // Get well position
        const [wellX, wellY] = this.pitchClassPosition(pc);

        // Vector from orbit to well
        const dx = wellX - baseX;
        const dy = wellY - baseY;

        // Gentle pull toward the well (inverse square would be too harsh)
        // Just a constant gentle tug in that direction
        pullX += dx * wellStrength * this.gravityStrength;
        pullY += dy * wellStrength * this.gravityStrength;
      }

      // Smoothly blend perturbation (very gentle, like bed sheet settling)
      const smoothing = 3.0;
      orbit.perturbX += (pullX - orbit.perturbX) * smoothing * dt;
      orbit.perturbY += (pullY - orbit.perturbY) * smoothing * dt;
    }

    // Clean up very dim orbits with empty trails
    for (const [trackIndex, orbit] of this.orbits) {
      if (orbit.brightness < 0.01 && orbit.trail.length === 0) {
        this.orbits.delete(trackIndex);
      }
    }
  }

  render(): HTMLCanvasElement {
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(cx, cy);
    const ctx = this.ctx;

    // Clear to transparent - let background layer show through
    ctx.clearRect(0, 0, w, h);

    // Sun
    const sunSize = 15 + this.sunPulse * 25;
    const sunGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, sunSize * 2);
    const [sr, sg, sb] = this.sunColor;
    sunGrad.addColorStop(0, `rgba(255, 255, 255, ${this.sunBrightness.toFixed(2)})`);
    sunGrad.addColorStop(0.2, `rgba(${sr}, ${sg}, ${sb}, ${(this.sunBrightness * 0.8).toFixed(2)})`);
    sunGrad.addColorStop(0.6, `rgba(${sr * 0.7 | 0}, ${sg * 0.5 | 0}, ${sb * 0.3 | 0}, ${(this.sunBrightness * 0.3).toFixed(2)})`);
    sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, sunSize * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 240, ${this.sunBrightness.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(cx, cy, sunSize * 0.25, 0, Math.PI * 2);
    ctx.fill();

    const beatProgress = this.totalBeats + this.lastBeatPosition;

    // Draw orbits
    for (const orbit of this.orbits.values()) {
      const [px, py] = this.orbitPosition(orbit, scale, beatProgress);
      // Apply gravitational perturbation
      const screenX = cx + px + orbit.perturbX * scale;
      const screenY = cy + py + orbit.perturbY * scale;

      // Only add to trail if visible
      if (orbit.brightness > 0.05) {
        const [cr, cg, cb] = orbit.currentColor;
        orbit.trail.push({ x: screenX, y: screenY, r: cr, g: cg, b: cb });
      }

      // Trim trail
      while (orbit.trail.length > this.trailLength) {
        orbit.trail.shift();
      }

      // Draw trail
      if (orbit.trail.length > 1) {
        for (let i = 1; i < orbit.trail.length; i++) {
          const pt = orbit.trail[i];
          const prev = orbit.trail[i - 1];
          const t = i / orbit.trail.length;
          const alpha = t * 0.6 * Math.min(1, orbit.brightness + 0.3);

          ctx.strokeStyle = `rgba(${pt.r}, ${pt.g}, ${pt.b}, ${alpha.toFixed(3)})`;
          ctx.lineWidth = 1 + t * 1.5;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
        }
      }

      // Draw planet if bright enough
      if (orbit.brightness > 0.1) {
        const [cr, cg, cb] = orbit.currentColor;
        const grad = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, 8);
        grad.addColorStop(0, `rgba(${Math.min(255, cr + 60)}, ${Math.min(255, cg + 60)}, ${Math.min(255, cb + 60)}, ${(orbit.brightness * 0.9).toFixed(2)})`);
        grad.addColorStop(0.4, `rgba(${cr}, ${cg}, ${cb}, ${(orbit.brightness * 0.4).toFixed(2)})`);
        grad.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${(orbit.brightness * 0.8).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return this.canvas;
  }

  isReady(): boolean {
    return this.ready;
  }

  dispose(): void {
    this.ready = false;
    this.orbits.clear();
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'trailLength', label: 'Trail Length', type: 'range', value: this.trailLength, min: 100, max: 2000, step: 100 },
    ];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return { trailLength: 800 };
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'trailLength') {
      this.trailLength = value as number;
    }
  }
}
