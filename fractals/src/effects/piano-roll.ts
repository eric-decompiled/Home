// --- Piano Roll Effect ---
// Falling notes visualization with piano keyboard at bottom.
// Notes fall from above and land on keys when they play.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode, UpcomingNote } from './effect-interface.ts';
import { palettes } from '../fractal-engine.ts';
import { audioPlayer } from '../audio-player.ts';

// Piano range: A0 (21) to C8 (108)
const MIDI_LO = 21;
const MIDI_HI = 108;

// Key layout helpers
const isBlackKey = (midi: number): boolean => {
  const pc = midi % 12;
  return pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10;
};

// Realistic black key offsets (fraction from left edge of preceding white key)
// Based on actual piano key proportions
const blackKeyOffset: Record<number, number> = {
  1: 1.00,   // C#
  3: 0.90,   // D#
  6: 1.05,   // F#
  8: 0.95,   // G#
  10: 0.85,  // A#
};

// Count white keys up to a given MIDI note
const whiteKeyIndex = (midi: number): number => {
  let count = 0;
  for (let m = MIDI_LO; m < midi; m++) {
    if (!isBlackKey(m)) count++;
  }
  return count;
};

// Total white keys in range
const TOTAL_WHITE_KEYS = (() => {
  let count = 0;
  for (let m = MIDI_LO; m <= MIDI_HI; m++) {
    if (!isBlackKey(m)) count++;
  }
  return count;
})();

interface KeyState {
  brightness: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: [number, number, number];
}


export class PianoRollEffect implements VisualEffect {
  readonly id = 'piano-roll';
  readonly name = 'Piano Roll';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'source-over';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  // Key states for glow effects
  private keyStates: Map<number, KeyState> = new Map();

  // Cached upcoming notes from last update
  private upcomingNotes: UpcomingNote[] = [];

  // Groove curves for glow modulation
  private beatGroove = 0;
  private barGroove = 0;

  // Particle system for note impacts
  private particles: Particle[] = [];
  private emittedNotes: Set<string> = new Set(); // track "midi-time" to avoid duplicate emissions
  private endedNotes: Set<string> = new Set(); // track note-off emissions
  private sustainEmitTimers: Map<string, number> = new Map(); // for sustained particle emission


  // Visual settings
  private keyboardHeight = 0.12;  // fraction of canvas height
  private fallDuration = 3.0;     // seconds for note to fall from top to keyboard
  private noteGap = 2;            // pixels between notes
  private latencyOffset = 0.0;    // seconds to delay visual (positive = visual later, for late audio)

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
    dt = Math.min(dt, 0.1);

    // Store upcoming notes for render
    this.upcomingNotes = music.upcomingNotes;

    // Store groove curves for glow modulation
    this.beatGroove = music.beatGroove ?? 0;
    this.barGroove = music.barGroove ?? 0;

    // Track which notes are currently active
    const activeNotes = new Set<number>();
    for (const voice of music.activeVoices) {
      if (voice.midi < MIDI_LO || voice.midi > MIDI_HI) continue;
      activeNotes.add(voice.midi);
      const state = this.keyStates.get(voice.midi) || { brightness: 0 };
      if (voice.onset) {
        state.brightness = 1.0;
      } else {
        // Keep key held at minimum brightness while note is active
        state.brightness = Math.max(state.brightness, 0.7);
      }
      this.keyStates.set(voice.midi, state);
    }

    // Decay brightness for notes no longer active
    for (const [midi, state] of this.keyStates) {
      if (!activeNotes.has(midi)) {
        state.brightness *= Math.exp(-4.0 * dt); // decay for visible return
      }
      if (state.brightness < 0.01) {
        this.keyStates.delete(midi);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= 80 * dt; // gentle upward drift (negative = up in canvas coords)
      p.vx *= Math.exp(-2.0 * dt); // horizontal drag
    }


    // Clean up old emitted note tracking (notes that are now in the past)
    for (const key of this.emittedNotes) {
      const time = parseFloat(key.split('-')[1]);
      if (music.currentTime - time > 2.0) {
        this.emittedNotes.delete(key);
        this.endedNotes.delete(key);
        this.sustainEmitTimers.delete(key);
      }
    }
  }

  render(): HTMLCanvasElement {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const kbHeight = this.height * this.keyboardHeight;
    const kbTop = this.height - kbHeight;
    const whiteKeyWidth = this.width / TOTAL_WHITE_KEYS;
    const blackKeyWidth = whiteKeyWidth * 0.6;
    const blackKeyHeight = kbHeight * 0.6;
    const fallHeight = kbTop;

    // Draw falling notes first (behind keyboard)
    // Combine beat and bar groove for glow modulation (beat is primary, bar adds slow pulse)
    const grooveMod = this.beatGroove * 0.7 + this.barGroove * 0.3;
    this.drawFallingNotes(ctx, whiteKeyWidth, blackKeyWidth, fallHeight, kbTop, grooveMod);

    // Draw particles (behind keyboard, in front of notes)
    this.drawParticles(ctx);

    // Draw white keys as simple rectangles (black keys overlay on top)
    const maxDepress = 4; // max pixels to depress
    let whiteIdx = 0;
    for (let midi = MIDI_LO; midi <= MIDI_HI; midi++) {
      if (!isBlackKey(midi)) {
        const x = whiteIdx * whiteKeyWidth;
        const state = this.keyStates.get(midi);
        const brightness = state?.brightness ?? 0;

        // Key depression - shifts key down when pressed
        const depress = brightness > 0.1 ? maxDepress * Math.min(1, brightness) : 0;
        const keyY = kbTop + depress;

        // Key fill with gradient from two palette stops
        if (brightness > 0.1) {
          const [topColor, bottomColor] = this.getKeyGradientColors(midi);
          // Pulse with groove curve, slight transparency when depressed
          const pulse = 0.85 + grooveMod * 0.15;
          const alpha = (0.75 + brightness * 0.25) * pulse;
          const keyGradient = ctx.createLinearGradient(0, keyY, 0, keyY + kbHeight);
          keyGradient.addColorStop(0, `rgba(${topColor[0]}, ${topColor[1]}, ${topColor[2]}, ${alpha})`);
          keyGradient.addColorStop(1, `rgba(${bottomColor[0]}, ${bottomColor[1]}, ${bottomColor[2]}, ${alpha})`);
          ctx.fillStyle = keyGradient;
        } else {
          // Unlit white key gradient
          const whiteGradient = ctx.createLinearGradient(0, keyY, 0, keyY + kbHeight);
          whiteGradient.addColorStop(0, '#f8f8f8');
          whiteGradient.addColorStop(1, '#e0e0e0');
          ctx.fillStyle = whiteGradient;
        }
        ctx.fillRect(x, keyY, whiteKeyWidth - 1, kbHeight);

        // Key border
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, keyY, whiteKeyWidth - 1, kbHeight);

        // Glow effect (no shadow blur)
        if (brightness > 0.5) {
          const [gr, gg, gb] = this.getNoteColorRGB(midi);
          ctx.fillStyle = `rgba(${gr}, ${gg}, ${gb}, ${0.3 * brightness})`;
          ctx.fillRect(x + 2, keyY + 2, whiteKeyWidth - 5, kbHeight - 4);
        }

        whiteIdx++;
      }
    }

    // Draw black keys (on top)
    whiteIdx = 0;
    for (let midi = MIDI_LO; midi <= MIDI_HI; midi++) {
      if (!isBlackKey(midi)) {
        whiteIdx++;
      } else {
        // Black key position based on realistic piano proportions
        const pc = midi % 12;
        const offset = blackKeyOffset[pc] ?? 0.5;
        const x = (whiteIdx - 1 + offset) * whiteKeyWidth - blackKeyWidth / 2;
        const state = this.keyStates.get(midi);
        const brightness = state?.brightness ?? 0;

        // Key depression - shifts key down when pressed
        const depress = brightness > 0.1 ? maxDepress * 0.7 * Math.min(1, brightness) : 0;
        const keyY = kbTop + depress;

        // Key fill with gradient from two palette stops
        if (brightness > 0.1) {
          const [topColor, bottomColor] = this.getKeyGradientColors(midi);
          // Pulse with groove curve, slight transparency when depressed
          const pulse = 0.85 + grooveMod * 0.15;
          const alpha = (0.75 + brightness * 0.25) * pulse;
          const keyGradient = ctx.createLinearGradient(0, keyY, 0, keyY + blackKeyHeight);
          keyGradient.addColorStop(0, `rgba(${topColor[0]}, ${topColor[1]}, ${topColor[2]}, ${alpha})`);
          keyGradient.addColorStop(1, `rgba(${bottomColor[0]}, ${bottomColor[1]}, ${bottomColor[2]}, ${alpha})`);
          ctx.fillStyle = keyGradient;
        } else {
          // Unlit black key gradient
          const blackGradient = ctx.createLinearGradient(0, keyY, 0, keyY + blackKeyHeight);
          blackGradient.addColorStop(0, '#333');
          blackGradient.addColorStop(1, '#1a1a1a');
          ctx.fillStyle = blackGradient;
        }
        ctx.fillRect(x, keyY, blackKeyWidth, blackKeyHeight);

        // Glow effect (no shadow blur)
        if (brightness > 0.5) {
          const [gr, gg, gb] = this.getNoteColorRGB(midi);
          ctx.fillStyle = `rgba(${gr}, ${gg}, ${gb}, ${0.3 * brightness})`;
          ctx.fillRect(x + 2, keyY + 2, blackKeyWidth - 4, blackKeyHeight - 4);
        }
      }
    }

    return this.canvas;
  }

  private drawFallingNotes(
    ctx: CanvasRenderingContext2D,
    whiteKeyWidth: number,
    blackKeyWidth: number,
    fallHeight: number,
    kbTop: number,
    grooveMod: number
  ): void {
    // Draw falling notes
    for (const note of this.upcomingNotes) {
      if (note.midi < MIDI_LO || note.midi > MIDI_HI) continue;

      const isBlack = isBlackKey(note.midi);
      const noteWidth = isBlack ? blackKeyWidth - this.noteGap : whiteKeyWidth - this.noteGap;

      // X position based on key (matching realistic piano proportions)
      let x: number;
      if (isBlack) {
        const whitesBefore = whiteKeyIndex(note.midi);
        const pc = note.midi % 12;
        const offset = blackKeyOffset[pc] ?? 0.5;
        x = (whitesBefore - 1 + offset) * whiteKeyWidth - blackKeyWidth / 2 + this.noteGap / 2;
      } else {
        x = whiteKeyIndex(note.midi) * whiteKeyWidth + this.noteGap / 2;
      }

      // Y position based on time until note
      // Apply latency offset so visuals sync with audio
      // timeUntil = 0 means note starts now (bottom of note hits keyboard)
      // timeUntil > 0 means note is still falling
      // timeUntil < 0 means note started in the past
      const timeUntil = note.timeUntil + this.latencyOffset;
      const endTime = -note.duration;
      const fadeOutDuration = 0.06; // seconds to fade after note ends

      // Skip notes that have fully faded out
      if (timeUntil < endTime - fadeOutDuration) continue;

      // Note bottom position: at keyboard (fallHeight) when timeUntil = 0
      const noteBottom = fallHeight - (timeUntil / this.fallDuration) * fallHeight;
      const noteHeight = (note.duration / this.fallDuration) * fallHeight;
      const noteTop = noteBottom - noteHeight;

      // Only draw if visible
      if (noteBottom < 0 || noteTop > kbTop) continue;

      // Clamp to visible area
      const drawTop = Math.max(0, noteTop);
      const drawBottom = Math.min(kbTop, noteBottom);
      const drawHeight = drawBottom - drawTop;

      if (drawHeight <= 0) continue;

      // Fade out after note ends
      let fadeMultiplier = 1.0;
      if (timeUntil < endTime) {
        fadeMultiplier = 1 - (endTime - timeUntil) / fadeOutDuration;
      }

      // Get base color RGB for effects (octave-aware)
      const baseColor = this.getNoteColorRGB(note.midi);
      const [r, g, b] = baseColor;
      const intensity = (0.7 + note.velocity * 0.3) * fadeMultiplier;

      const radius = Math.min(4, noteWidth / 4, drawHeight / 4);

      // How close is note to keyboard? (0 = far, 1 = at keyboard)
      const proximity = Math.max(0, 1 - timeUntil / this.fallDuration);

      // === LAYER 1: Outer glow (no shadow blur - use layered fills instead) ===
      const glowMod = (0.9 + grooveMod * 0.2) * fadeMultiplier;
      if (proximity > 0.5 && fadeMultiplier > 0.1) {
        const glowIntensity = (proximity - 0.5) / 0.5;
        // Fake glow with expanding translucent rectangles
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.08 * glowMod * glowIntensity})`;
        ctx.beginPath();
        ctx.roundRect(x - 3, drawTop - 3, noteWidth + 6, drawHeight + 6, radius + 3);
        ctx.fill();
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.12 * glowMod * glowIntensity})`;
        ctx.beginPath();
        ctx.roundRect(x - 1, drawTop - 1, noteWidth + 2, drawHeight + 2, radius + 1);
        ctx.fill();
      }

      // === LAYER 2: Main body with vertical + horizontal gradient ===
      // Vertical: brighter at bottom (approaching keyboard), modulated by groove
      const bodyMod = 0.92 + grooveMod * 0.12;
      const vertGradient = ctx.createLinearGradient(0, drawTop, 0, drawBottom);
      vertGradient.addColorStop(0, `rgba(${r * 0.3}, ${g * 0.3}, ${b * 0.3}, ${intensity * 0.5 * bodyMod})`);
      vertGradient.addColorStop(0.7, `rgba(${r * 0.6}, ${g * 0.6}, ${b * 0.6}, ${intensity * 0.7})`);
      vertGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${intensity})`);

      ctx.fillStyle = vertGradient;
      ctx.beginPath();
      ctx.roundRect(x, drawTop, noteWidth, drawHeight, radius);
      ctx.fill();

      // === LAYER 3: Combined cylindrical shading + highlight (single gradient) ===
      const highlightAlpha = 0.2 + grooveMod * 0.15;
      const comboGradient = ctx.createLinearGradient(x, 0, x + noteWidth, 0);
      comboGradient.addColorStop(0, `rgba(0, 0, 0, 0.25)`);
      comboGradient.addColorStop(0.2, `rgba(255, 255, 255, ${highlightAlpha * 0.3})`);
      comboGradient.addColorStop(0.5, `rgba(255, 255, 255, ${highlightAlpha * 0.5})`);
      comboGradient.addColorStop(0.8, `rgba(255, 255, 255, ${highlightAlpha * 0.3})`);
      comboGradient.addColorStop(1, `rgba(0, 0, 0, 0.25)`);
      ctx.fillStyle = comboGradient;
      ctx.beginPath();
      ctx.roundRect(x, drawTop, noteWidth, drawHeight, radius);
      ctx.fill();

      // === LAYER 5: Hot leading edge ===
      const leadingEdgeHeight = Math.min(10, drawHeight * 0.2);
      const leadingGradient = ctx.createLinearGradient(0, drawBottom - leadingEdgeHeight, 0, drawBottom);
      leadingGradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
      leadingGradient.addColorStop(0.5, `rgba(${Math.min(255, r + 50)}, ${Math.min(255, g + 50)}, ${Math.min(255, b + 50)}, 0.6)`);
      leadingGradient.addColorStop(1, `rgba(255, 255, 255, 0.9)`);
      ctx.fillStyle = leadingGradient;
      ctx.beginPath();
      ctx.roundRect(x, drawBottom - leadingEdgeHeight, noteWidth, leadingEdgeHeight, [0, 0, radius, radius]);
      ctx.fill();

      // === LAYER 6: Crisp neon border (modulated) ===
      const borderAlpha = 0.65 + grooveMod * 0.2;
      ctx.strokeStyle = `rgba(${Math.min(255, r + 60)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 60)}, ${borderAlpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, drawTop, noteWidth, drawHeight, radius);
      ctx.stroke();

      // === LAYER 7: Impact flash when hitting keyboard (no shadow blur) ===
      if (timeUntil <= 0 && timeUntil > -0.1) {
        const flashIntensity = 1 + timeUntil / 0.1; // 1 at hit, fades to 0
        // Layered glow instead of shadow
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.2 * flashIntensity})`;
        ctx.beginPath();
        ctx.roundRect(x - 4, drawTop - 4, noteWidth + 8, drawHeight + 8, radius + 4);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * flashIntensity})`;
        ctx.beginPath();
        ctx.roundRect(x, drawTop, noteWidth, drawHeight, radius);
        ctx.fill();
      }

      // === Emit particles on note impact ===
      const noteKey = `${note.midi}-${note.time.toFixed(3)}`;
      const centerX = x + noteWidth / 2;

      // Initial impact burst (reduced count)
      if (timeUntil <= 0 && timeUntil > -0.05 && !this.emittedNotes.has(noteKey)) {
        this.emittedNotes.add(noteKey);
        const particleCount = Math.floor(2 + note.velocity * 2); // 2-4 particles
        for (let i = 0; i < particleCount; i++) {
          this.emitParticle(centerX, kbTop, noteWidth, r, g, b);
        }
      }

      // Sustained emission for long notes (emit occasional particles while playing)
      const noteEndTime = -note.duration;
      const isPlaying = timeUntil <= 0 && timeUntil > noteEndTime;
      if (isPlaying && note.duration > 0.5) {
        const timer = this.sustainEmitTimers.get(noteKey) ?? 0;
        const newTimer = timer + 0.016; // approximate dt
        // Emit a particle every ~0.3 seconds for sustained notes
        if (newTimer >= 0.3) {
          this.sustainEmitTimers.set(noteKey, 0);
          this.emitParticle(centerX, kbTop, noteWidth, r, g, b, 0.6); // smaller, subtler
        } else {
          this.sustainEmitTimers.set(noteKey, newTimer);
        }
      }

      // Note-off burst (when note finishes)
      if (timeUntil <= noteEndTime && timeUntil > noteEndTime - 0.05 && !this.endedNotes.has(noteKey)) {
        this.endedNotes.add(noteKey);
        const particleCount = Math.floor(2 + note.velocity * 2); // 2-4 particles
        for (let i = 0; i < particleCount; i++) {
          this.emitParticle(centerX, kbTop, noteWidth, r, g, b, 0.8);
        }
      }
    }
  }

  private emitParticle(
    x: number, y: number, width: number,
    r: number, g: number, b: number,
    sizeScale = 1.0
  ): void {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
    const speed = 30 + Math.random() * 50;
    this.particles.push({
      x: x + (Math.random() - 0.5) * width * 0.6,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.4 + Math.random() * 0.3,
      size: (2 + Math.random() * 3) * sizeScale,
      color: [r, g, b],
    });
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    // Cap max particles for performance
    const maxParticles = 50;
    const particles = this.particles.length > maxParticles
      ? this.particles.slice(-maxParticles)
      : this.particles;

    for (const p of particles) {
      const lifeRatio = p.life / p.maxLife;
      const alpha = lifeRatio * 0.8;
      const size = p.size * (0.5 + lifeRatio * 0.5);
      const [r, g, b] = p.color;

      // Simple filled circle (no shadow blur, no gradient)
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();

      // White core
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private getOctaveBrightness(midi: number): number {
    // Map MIDI 21-108 to 0.2-1.0 (low octaves darker, high brighter)
    const t = (midi - MIDI_LO) / (MIDI_HI - MIDI_LO);
    return 0.25 + t * 0.75;
  }

  private getKeyGradientColors(midi: number): [[number, number, number], [number, number, number]] {
    const pc = midi % 12;
    const octaveT = (midi - MIDI_LO) / (MIDI_HI - MIDI_LO); // 0-1 across piano range
    const palette = palettes[pc];

    if (palette && palette.stops.length >= 4) {
      // Pick two stops with wider gap based on octave
      // Low octaves: stops 0-3, Mid octaves: stops 1-4, High octaves: stops 2-5
      const baseIndex = Math.floor(octaveT * 2); // 0-2 range
      const topIndex = Math.min(baseIndex + 3, palette.stops.length - 1);
      const bottomIndex = baseIndex;

      const topColor = palette.stops[bottomIndex].color as [number, number, number];
      const bottomColor = palette.stops[topIndex].color as [number, number, number];
      return [topColor, bottomColor];
    }

    // Fallback
    const bright: [number, number, number] = [200, 150, 180];
    const dark: [number, number, number] = [80, 40, 60];
    return [bright, dark];
  }


  private getNoteColorRGB(midi: number): [number, number, number] {
    const pc = midi % 12;
    const octaveBrightness = this.getOctaveBrightness(midi);
    const palette = palettes[pc];
    if (palette && palette.stops.length >= 4) {
      // Pick stop based on octave (lower = earlier stops, higher = later stops)
      const stopIndex = Math.floor(1 + octaveBrightness * 3); // 1-4 range
      const stop = palette.stops[Math.min(stopIndex, palette.stops.length - 1)];
      return stop.color as [number, number, number];
    }
    // Fallback: generate from hue with octave brightness
    const hue = (pc / 12) * 360;
    const h = hue / 60;
    const base = Math.round(80 + octaveBrightness * 100);
    const x = Math.round(base * (1 - Math.abs(h % 2 - 1)));
    if (h < 1) return [base, x, 0];
    if (h < 2) return [x, base, 0];
    if (h < 3) return [0, base, x];
    if (h < 4) return [0, x, base];
    if (h < 5) return [x, 0, base];
    return [base, 0, x];
  }

  isReady(): boolean { return this.ready; }
  dispose(): void { this.ready = false; }

  getConfig(): EffectConfig[] {
    return [
      { key: 'fallDuration', label: 'Fall Time', type: 'range', value: this.fallDuration, min: 1, max: 6, step: 0.5 },
      { key: 'keyboardHeight', label: 'Keyboard Size', type: 'range', value: this.keyboardHeight, min: 0.08, max: 0.2, step: 0.01 },
      { key: 'pianoSound', label: 'Piano Sound', type: 'toggle', value: audioPlayer.isPianoMode() },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'fallDuration') this.fallDuration = value as number;
    if (key === 'keyboardHeight') this.keyboardHeight = value as number;
    if (key === 'pianoSound') audioPlayer.setPianoMode(value as boolean);
  }
}
