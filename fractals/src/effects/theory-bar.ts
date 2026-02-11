// --- Theory Bar Overlay ---
// Displays real-time harmonic analysis: key, chord progression, tension, groove wave

import type { VisualEffect, EffectConfig, MusicParams, BlendMode, UpcomingChord } from './effect-interface.ts';
import { palettes } from '../fractal-engine.ts';
import { samplePaletteEqualized } from './effect-utils.ts';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const QUALITY_LABELS: Record<string, string> = {
  major: '', minor: 'm', dim: 'dim', aug: 'aug',
  sus4: 'sus4', sus2: 'sus2',
  maj7: 'Δ7', dom7: '7', min7: 'm7', hdim7: 'ø7', dim7: '°7',
  unknown: '?',
};

const GROOVE_HISTORY_LENGTH = 120;

// Pre-computed equalized colors (avoiding binary search every frame)
// Cache format: Map<`${pitchClass}-${luminance}`, [r,g,b]>
const equalizedColorCache = new Map<string, [number, number, number]>();

function getCachedEqualizedColor(pc: number, luminance: number): [number, number, number] {
  const key = `${pc}-${luminance}`;
  let color = equalizedColorCache.get(key);
  if (!color) {
    color = samplePaletteEqualized(pc, luminance);
    equalizedColorCache.set(key, color);
  }
  return color;
}

export class TheoryBarEffect implements VisualEffect {
  readonly id = 'theory-bar';
  readonly name = 'Theory Bar';
  readonly isPostProcess = false;
  readonly isHUD = true;  // Render after post-process (not transformed by kaleidoscope)
  readonly defaultBlend: BlendMode = 'source-over';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private _ready = false;

  // Chord display data (from barChords: [prev bar, current bar, next bar, next-next bar])
  private displayChords: UpcomingChord[] = [];
  private currentTension = 0;

  // Chord slide animation
  private lastChordTime = -1;
  private chordSlideOffset = 0; // pixels to slide from right

  // Groove wave history
  private beatHistory: number[] = [];
  private barHistory: number[] = [];
  private colorHistory: [number, number, number][] = [];  // Rainbow color history
  private loudnessHistory: number[] = [];  // Smoothed loudness for glow
  private smoothLoudness = 0;  // Weighted average for smoothing
  private grooveWriteIndex = 0;
  private tensionColor: [number, number, number] = [120, 120, 120];  // I→V interpolated color
  private paletteIndex = 0;
  private keyPitchClass = 0;
  private keyMode: 'major' | 'minor' = 'major';

  // Pitch histogram
  private pitchHistogram: number[] = new Array(12).fill(0);
  private histogramDecay = 0.4;  // Slower decay for smoother color bleed

  // Metronome
  private beatsPerBar = 4;
  private beatIndex = 0;
  private beatArrival = 0;
  private beatGroove = 0;
  private beatPosition = 0;

  // Config
  private barHeight = 64;
  private scale = 1; // Computed each frame based on barHeight

  private currentKey = '';
  private currentBpm = 0;
  private currentFps = 0;
  private frameCount = 0;
  private lastFpsTime = 0;

  // Slide animation
  private slideOffset = 0;  // 0 = fully visible, 1 = fully hidden (below screen)
  private slideTarget = 0;  // Target offset
  private slideSpeed = 4;   // Animation speed (units per second)
  private onSlideComplete: (() => void) | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    // Initialize groove history
    for (let i = 0; i < GROOVE_HISTORY_LENGTH; i++) {
      this.beatHistory.push(0.5);
      this.barHistory.push(0.5);
      this.colorHistory.push([22, 199, 154]);  // Default teal
      this.loudnessHistory.push(0);
    }
  }

  init(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this._ready = true;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  update(dt: number, music: MusicParams): void {
    dt = Math.min(dt, 0.1); // Cap dt for physics stability

    // Slide animation
    if (this.slideOffset !== this.slideTarget) {
      const diff = this.slideTarget - this.slideOffset;
      const step = this.slideSpeed * dt;
      if (Math.abs(diff) <= step) {
        this.slideOffset = this.slideTarget;
        if (this.onSlideComplete) {
          this.onSlideComplete();
          this.onSlideComplete = null;
        }
      } else {
        this.slideOffset += Math.sign(diff) * step;
      }
    }

    // FPS calculation
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    // Update pitch histogram from active voices
    for (const voice of music.activeVoices) {
      if (voice.onset) {
        this.pitchHistogram[voice.pitchClass] = Math.min(1.0, this.pitchHistogram[voice.pitchClass] + 0.08 * voice.velocity);  // Attack
      } else {
        // Sustain - held notes add based on velocity (quiet notes contribute less)
        this.pitchHistogram[voice.pitchClass] = Math.min(1.0, this.pitchHistogram[voice.pitchClass] + 0.3 * voice.velocity * dt);
      }
    }
    // Decay histogram values
    for (let i = 0; i < 12; i++) {
      this.pitchHistogram[i] *= Math.exp(-this.histogramDecay * dt);
    }

    // Color from palette
    if (music.paletteIndex >= 0 && music.paletteIndex < palettes.length) {
      this.paletteIndex = music.paletteIndex;
    }

    // Sample groove curves into history (color written after tension calculation)
    // When no beat activity, blend both toward 0.5 so they converge at center
    const activity = Math.max(music.beatArrival ?? 0, music.barArrival ?? 0, music.tension ?? 0);
    const blend = Math.min(1, activity * 5); // 0 = fully at center, 1 = normal
    const beatGroove = 0.5 + ((music.beatGroove ?? 0.5) - 0.5) * blend;
    const barGroove = 0.5 + ((music.barGroove ?? 0.5) - 0.5) * blend;
    this.beatHistory[this.grooveWriteIndex] = beatGroove;
    this.barHistory[this.grooveWriteIndex] = barGroove;

    // Smooth loudness with weighted average for subtle glow effect
    const rawLoudness = music.loudness ?? 0;
    this.smoothLoudness += (rawLoudness - this.smoothLoudness) * 0.06;  // Heavier smoothing for gradual response
    this.loudnessHistory[this.grooveWriteIndex] = this.smoothLoudness;

    // Key display
    this.keyPitchClass = music.key ?? 0;
    this.keyMode = music.keyMode ?? 'major';
    const keyName = NOTE_NAMES[this.keyPitchClass];
    const modeLabel = this.keyMode === 'minor' ? 'm' : '';
    this.currentKey = `${keyName}${modeLabel}`;

    // BPM
    this.currentBpm = Math.round(music.bpm ?? 120);

    // Metronome
    this.beatsPerBar = music.beatsPerBar ?? 4;
    this.beatIndex = music.beatIndex ?? 0;
    this.beatArrival = music.beatArrival ?? 0;
    this.beatGroove = music.beatGroove ?? 0;
    this.beatPosition = music.beatPosition ?? 0;

    // Store chord lookahead data [prev, current, next, next-next]
    this.displayChords = music.barChords ?? [];
    this.currentTension = music.tension ?? 0;

    // Use precomputed tension color from music-mapper (avoids duplicate calculation)
    this.tensionColor = [...music.tensionColor] as [number, number, number];

    // Store tension color in history for groove wave rainbow
    this.colorHistory[this.grooveWriteIndex] = [...this.tensionColor];
    this.grooveWriteIndex = (this.grooveWriteIndex + 1) % GROOVE_HISTORY_LENGTH;

    // Detect bar change and trigger slide animation (every bar, not just chord changes)
    const currentBarChord = this.displayChords[1]; // index 1 = current bar
    if (currentBarChord) {
      // time is the bar start time, so it changes every bar
      if (currentBarChord.time !== this.lastChordTime && this.lastChordTime >= 0) {
        this.chordSlideOffset = 64; // slot width + arrow width
      }
      this.lastChordTime = currentBarChord.time;
    }

    // Decay slide animation
    this.chordSlideOffset *= Math.exp(-24 * dt); // fast decay
    if (this.chordSlideOffset < 0.5) this.chordSlideOffset = 0;
  }

  render(): HTMLCanvasElement {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const barHeight = this.barHeight;
    this.scale = barHeight / 64; // Scale factor relative to default size
    const scale = this.scale;
    const padding = 16 * scale;

    // Apply slide animation offset (eased for smooth movement)
    const easeOffset = this.slideOffset * this.slideOffset * (3 - 2 * this.slideOffset); // smoothstep
    const slideY = easeOffset * (barHeight + 10); // Slide down by bar height + a bit extra

    const barTop = this.height - barHeight + slideY;
    const centerY = barTop + barHeight / 2;

    // Font sizes scaled
    const fontSmall = Math.round(14 * scale);
    const fontMedium = Math.round(18 * scale);
    const fontLarge = Math.round(26 * scale);
    const fontTiny = Math.round(12 * scale);

    // Semi-transparent background bar (full width, rounded top corners only)
    const radius = 6 * scale;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    ctx.lineTo(0, barTop + radius);
    ctx.quadraticCurveTo(0, barTop, radius, barTop);
    ctx.lineTo(this.width - radius, barTop);
    ctx.quadraticCurveTo(this.width, barTop, this.width, barTop + radius);
    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fill();

    // Subtle top border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, barTop + radius);
    ctx.quadraticCurveTo(0, barTop, radius, barTop);
    ctx.lineTo(this.width - radius, barTop);
    ctx.quadraticCurveTo(this.width, barTop, this.width, barTop + radius);
    ctx.stroke();

    // Calculate right-side fixed elements width (FPS)
    const fpsWidth = 60 * scale;
    const rightEdge = this.width - padding - fpsWidth;

    // Text setup
    ctx.textBaseline = 'middle';
    ctx.font = `${fontSmall}px "SF Mono", Monaco, Consolas, monospace`;

    let x = padding + 12 * scale;

    // Key palette for coloring
    const keyPalette = palettes[this.keyPitchClass];
    const keyColor = keyPalette.stops[4]?.color ?? [180, 180, 180]; // Bright stop

    // --- Key ---
    ctx.fillStyle = '#666';
    ctx.textAlign = 'left';
    ctx.fillText('KEY', x, centerY);
    x += 38 * scale;

    // Color key name with its own palette color
    ctx.fillStyle = `rgb(${keyColor[0]}, ${keyColor[1]}, ${keyColor[2]})`;
    ctx.font = `bold ${fontMedium}px "SF Mono", Monaco, Consolas, monospace`;
    ctx.fillText(this.currentKey, x, centerY);
    x += ctx.measureText(this.currentKey).width + 20 * scale;

    // --- Chord progression ---
    // Chord grid: [prev] → [current] → [next] → [next-next], then Roman numeral on right
    const currentChord = this.displayChords[1]; // index 1 = current bar
    const currentNumeral = (currentChord && currentChord.numeral) ? currentChord.numeral : (this.keyMode === 'minor' ? 'i' : 'I');
    const fontNumeral = Math.round(16 * scale);

    // Fixed-width slots: [prev] → [current] → [next] → [next-next]
    const slotWidth = 44 * scale;       // Width for each chord slot
    const arrowWidth = 20 * scale;      // Arrow between slots
    const totalChordWidth = slotWidth * 4 + arrowWidth * 3;
    const chordStartX = x;

    // Helper to ghostify a color (desaturate toward white)
    const ghostify = (color: number[], ghostFactor: number): number[] => {
      if (ghostFactor === 0) return color;
      return [
        Math.round(color[0] + (255 - color[0]) * ghostFactor * 0.5),
        Math.round(color[1] + (255 - color[1]) * ghostFactor * 0.5),
        Math.round(color[2] + (255 - color[2]) * ghostFactor * 0.5),
      ];
    };

    // Draw chords: [prev, current, next, next-next]
    // displayChords[0] = prev, [1] = current, [2] = next, [3] = next-next
    const slideOffset = this.chordSlideOffset * scale;
    const fontChordSmall = Math.round(15 * scale);
    for (let slot = 0; slot < 4; slot++) {
      const chord = this.displayChords[slot];
      const isCurrent = slot === 1;
      const isPast = slot === 0;
      const slotX = chordStartX + slot * (slotWidth + arrowWidth) + slideOffset;

      // Empty or invalid slot
      if (!chord || chord.root < 0) {
        ctx.font = isCurrent ? `bold ${fontMedium}px "SF Mono", Monaco, Consolas, monospace` : `${fontChordSmall}px "SF Mono", Monaco, Consolas, monospace`;
        ctx.fillStyle = isPast ? 'rgba(80, 80, 80, 0.3)' : 'rgba(80, 80, 80, 0.25)';
        ctx.fillText('–', slotX + 15 * scale, centerY);

        // Arrow after slot (except last)
        if (slot < 3) {
          ctx.font = `${fontSmall}px "SF Mono", Monaco, Consolas, monospace`;
          ctx.fillStyle = 'rgba(80, 80, 80, 0.2)';
          ctx.fillText('→', slotX + slotWidth + 2 * scale, centerY);
        }
        continue;
      }

      // Style based on position: past = ghostly, current = bright, future = dimmer
      let opacity: number;
      let ghostFactor: number;
      if (isCurrent) {
        opacity = 1.0;
        ghostFactor = 0;
      } else if (isPast) {
        opacity = 0.55;  // 15% more transparent than before
        ghostFactor = 0.5;
      } else {
        // Future chords: progressively dimmer
        opacity = slot === 2 ? 0.6 : 0.4;
        ghostFactor = slot === 2 ? 0.3 : 0.5;
      }

      // Build chord name
      const root = NOTE_NAMES[chord.root];
      const chordName = `${root}${QUALITY_LABELS[chord.quality] ?? ''}`;
      const chordText = isCurrent ? chordName : chordName.slice(0, 2);

      ctx.font = isCurrent ? `bold ${fontMedium}px "SF Mono", Monaco, Consolas, monospace` : `${fontChordSmall}px "SF Mono", Monaco, Consolas, monospace`;
      const textWidth = ctx.measureText(chordText).width;

      // Get chord color based on quality
      const chordPalette = palettes[chord.root];
      const is7th = ['dom7', 'maj7', 'min7', 'hdim7', 'dim7'].includes(chord.quality);

      if (is7th && isCurrent) {
        // 7th chords: gradient to resolution target, biased toward root
        // Use equalized sampling so dark colors (purple, blue) are visible
        const resolutionTarget = (chord.root + 5) % 12;
        const fromColor = getCachedEqualizedColor(chord.root, 0.15);          // root at dark luminance
        const toColor = getCachedEqualizedColor(resolutionTarget, 0.35);      // resolution at mid luminance

        // Diagonal gradient: bottom-left to top-right
        const gradientOffset = barHeight * 0.3;
        const gradient = ctx.createLinearGradient(slotX, centerY + gradientOffset, slotX + textWidth, centerY - gradientOffset);
        gradient.addColorStop(0, `rgba(${fromColor[0]}, ${fromColor[1]}, ${fromColor[2]}, ${opacity})`);
        gradient.addColorStop(0.5, `rgba(${fromColor[0]}, ${fromColor[1]}, ${fromColor[2]}, ${opacity})`);
        gradient.addColorStop(1, `rgba(${toColor[0]}, ${toColor[1]}, ${toColor[2]}, 1)`);
        ctx.fillStyle = gradient;
        ctx.fillText(chordText, slotX, centerY);
      } else {
        // Quality-based coloring
        let stopIndex: number;
        let color: number[];

        if (chord.quality === 'major' || chord.quality === 'maj7') {
          stopIndex = isCurrent ? 4 : 3;
          color = chordPalette.stops[stopIndex]?.color ?? [180, 180, 180];
        } else if (chord.quality === 'minor' || chord.quality === 'min7') {
          stopIndex = isCurrent ? 2 : 1;
          color = chordPalette.stops[stopIndex]?.color ?? [80, 80, 80];
        } else if (chord.quality === 'dim' || chord.quality === 'hdim7' || chord.quality === 'dim7') {
          stopIndex = 1;
          color = chordPalette.stops[stopIndex]?.color ?? [60, 60, 60];
        } else if (chord.quality === 'aug') {
          const baseColor = chordPalette.stops[3]?.color ?? [150, 150, 150];
          const avg = (baseColor[0] + baseColor[1] + baseColor[2]) / 3;
          color = [
            Math.round(baseColor[0] * 0.4 + avg * 0.6),
            Math.round(baseColor[1] * 0.4 + avg * 0.6),
            Math.round(baseColor[2] * 0.4 + avg * 0.6),
          ];
        } else {
          stopIndex = isCurrent ? 3 : 2;
          color = chordPalette.stops[stopIndex]?.color ?? [150, 150, 150];
        }

        const finalColor = ghostify(color, ghostFactor);
        ctx.fillStyle = `rgba(${finalColor[0]}, ${finalColor[1]}, ${finalColor[2]}, ${opacity})`;
        ctx.fillText(chordText, slotX, centerY);
      }

      // Arrow after slot (except last)
      if (slot < 3) {
        ctx.font = `${fontSmall}px "SF Mono", Monaco, Consolas, monospace`;
        const arrowOpacity = isCurrent ? 0.5 : isPast ? 0.3 : 0.25;
        ctx.fillStyle = `rgba(100, 100, 100, ${arrowOpacity})`;
        ctx.fillText('→', slotX + slotWidth + 2 * scale, centerY);
      }
    }

    // Draw indicator arrow under current chord (slot 1) - fixed position, doesn't slide
    const currentSlotX = chordStartX + 1 * (slotWidth + arrowWidth);
    const arrowSize = 7 * scale;
    const arrowY = centerY + 18 * scale;
    const arrowCenterX = currentSlotX + slotWidth * 0.35; // Center under chord text

    ctx.beginPath();
    ctx.moveTo(arrowCenterX, arrowY - arrowSize); // Top point
    ctx.lineTo(arrowCenterX - arrowSize * 0.7, arrowY); // Bottom left
    ctx.lineTo(arrowCenterX + arrowSize * 0.7, arrowY); // Bottom right
    ctx.closePath();
    ctx.fillStyle = '#666';
    ctx.fill();

    // Separator and Roman numeral (chord function) on right side of chord grid
    const sepX = chordStartX + totalChordWidth + 8 * scale;
    ctx.font = `${fontNumeral}px "SF Mono", Monaco, Consolas, monospace`;
    ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
    ctx.fillText('|', sepX, centerY);

    const numeralX = sepX + 16 * scale;
    ctx.font = `bold ${fontNumeral}px "SF Mono", Monaco, Consolas, monospace`;
    ctx.fillStyle = '#666';
    ctx.fillText(currentNumeral, numeralX, centerY);

    x = numeralX + ctx.measureText('viio').width + 12 * scale;

    // --- Tension (moved to left of histogram) ---
    ctx.font = `bold ${fontLarge}px "SF Mono", Monaco, Consolas, monospace`;
    ctx.fillStyle = '#666';
    ctx.fillText('⟺', x, centerY - 2 * scale); // nudge up to align with text
    x += 48 * scale;

    const tension = this.currentTension;
    const tensionBarWidth = 80 * scale;
    const tensionBarHeight = 10 * scale;
    const tensionBarY = centerY - tensionBarHeight / 2;

    // Background - use dim palette color
    const palette = palettes[this.paletteIndex];
    const dimColor = palette.stops[1]?.color ?? [30, 30, 30];
    ctx.fillStyle = `rgba(${dimColor[0]}, ${dimColor[1]}, ${dimColor[2]}, 0.4)`;
    ctx.beginPath();
    ctx.roundRect(x, tensionBarY, tensionBarWidth, tensionBarHeight, 3 * scale);
    ctx.fill();

    // Filled portion with gradient: key color (I) → dominant color (V)
    const fillWidth = Math.max(2 * scale, tension * tensionBarWidth);
    if (tension > 0.01) {
      const tensionGradient = ctx.createLinearGradient(x, 0, x + tensionBarWidth, 0);

      // Key (I) color - use bright stop
      const keyPalette2 = palettes[this.keyPitchClass];
      const iColor = keyPalette2.stops[3]?.color ?? [120, 120, 120];

      // Dominant (V) color - 7 semitones up from key
      const vPitchClass = (this.keyPitchClass + 7) % 12;
      const vPalette = palettes[vPitchClass];
      const vColor = vPalette.stops[3]?.color ?? [120, 120, 120];

      const alpha = 0.6 + tension * 0.4;
      tensionGradient.addColorStop(0, `rgba(${iColor[0]}, ${iColor[1]}, ${iColor[2]}, ${alpha})`);
      tensionGradient.addColorStop(0.66, `rgba(${iColor[0]}, ${iColor[1]}, ${iColor[2]}, ${alpha})`);
      tensionGradient.addColorStop(1, `rgba(${vColor[0]}, ${vColor[1]}, ${vColor[2]}, ${alpha * 0.4})`);

      ctx.fillStyle = tensionGradient;
      ctx.beginPath();
      ctx.roundRect(x, tensionBarY, fillWidth, tensionBarHeight, 3 * scale);
      ctx.fill();
    }

    x += tensionBarWidth + 10 * scale;

    // Tension percentage - interpolate between I color and V color
    const iColorText = keyPalette.stops[3]?.color ?? [120, 120, 120];
    const vPitchClassText = (this.keyPitchClass + 7) % 12;
    const vPaletteText = palettes[vPitchClassText];
    const vColorText = vPaletteText.stops[3]?.color ?? [120, 120, 120];

    const textColor = [
      Math.round(iColorText[0] + (vColorText[0] - iColorText[0]) * tension),
      Math.round(iColorText[1] + (vColorText[1] - iColorText[1]) * tension),
      Math.round(iColorText[2] + (vColorText[2] - iColorText[2]) * tension),
    ];
    ctx.font = `${fontSmall}px "SF Mono", Monaco, Consolas, monospace`;
    ctx.fillStyle = `rgb(${textColor[0]}, ${textColor[1]}, ${textColor[2]})`;
    ctx.fillText(`${Math.round(tension * 100)}%`, x, centerY);
    x += 42 * scale;

    // --- Calculate space for histogram, metronome, and groove wave ---
    const visualStart = x + 10 * scale;
    const visualEnd = rightEdge - 10 * scale;
    const totalVisualWidth = visualEnd - visualStart;

    // Layout: histogram (1/4) | metronome (fixed) | groove wave (absorbs changes)
    const histogramWidth = Math.floor(totalVisualWidth / 4);
    const metronomeWidth = 72 * scale; // Fixed width to prevent layout jumps on song change
    const grooveWidth = totalVisualWidth - histogramWidth - metronomeWidth - 16 * scale; // 8px gaps

    // --- Pitch Histogram ---
    if (histogramWidth >= 48 * scale) {
      this.drawPitchHistogramInline(ctx, visualStart, centerY, histogramWidth, barHeight - 8 * scale);
    }

    // --- Metronome ---
    const metronomeStart = visualStart + histogramWidth + 8 * scale;
    this.drawMetronome(ctx, metronomeStart, centerY, metronomeWidth, barHeight - 8 * scale, keyColor);

    // --- Groove Wave (takes remaining space) ---
    const grooveStart = metronomeStart + metronomeWidth + 8 * scale;

    // Reset text align before drawing strokes
    ctx.textAlign = 'left';

    // Only draw if we have enough space (min 40px)
    if (grooveWidth >= 40 * scale) {
      this.drawGrooveWaveInline(ctx, grooveStart, centerY, grooveWidth, barHeight - 8 * scale);
    }

    // --- FPS (right-aligned) ---
    ctx.font = `${fontTiny}px "SF Mono", Monaco, Consolas, monospace`;
    ctx.fillStyle = '#555';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.currentFps} fps`, this.width - padding - 8 * scale, centerY);

    return this.canvas;
  }

  private drawGrooveWaveInline(
    ctx: CanvasRenderingContext2D,
    startX: number,
    centerY: number,
    width: number,
    height: number
  ): void {
    const scale = this.scale;
    const waveHeight = Math.min(height * 0.4, 10 * scale);
    // Reduced sample count for performance (60 instead of 120)
    const sampleCount = Math.min(60, Math.floor(width / 2));
    const stepX = width / sampleCount;
    const sampleStep = GROOVE_HISTORY_LENGTH / sampleCount;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // --- Bar wave (slower, darker rainbow) - draw first (behind) ---
    for (let i = 1; i < sampleCount; i++) {
      const histIdx0 = Math.floor((sampleCount - i) * sampleStep);
      const histIdx1 = Math.floor((sampleCount - 1 - i) * sampleStep);
      const idx0 = (this.grooveWriteIndex - GROOVE_HISTORY_LENGTH + histIdx0 + GROOVE_HISTORY_LENGTH) % GROOVE_HISTORY_LENGTH;
      const idx1 = (this.grooveWriteIndex - GROOVE_HISTORY_LENGTH + histIdx1 + GROOVE_HISTORY_LENGTH) % GROOVE_HISTORY_LENGTH;

      const val0 = this.barHistory[idx0];
      const val1 = this.barHistory[idx1];
      const x0 = startX + (i - 1) * stepX;
      const x1 = startX + i * stepX;
      const y0 = centerY - (val0 - 0.5) * 2 * waveHeight;
      const y1 = centerY - (val1 - 0.5) * 2 * waveHeight;

      // Use color history but darken it (multiply by 0.4 for darker rainbow)
      const [cr, cg, cb] = this.colorHistory[idx1];
      const dr = Math.floor(cr * 0.4);
      const dg = Math.floor(cg * 0.4);
      const db = Math.floor(cb * 0.4);

      // Loudness modulates opacity: base 0.15 + up to 0.7 from loudness (more extreme)
      const loudness = this.loudnessHistory[idx1];
      const barOpacity = 0.15 + loudness * 0.7;

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = `rgba(${dr}, ${dg}, ${db}, ${barOpacity})`;
      ctx.lineWidth = 2.5 * scale;
      ctx.stroke();
    }

    // --- Beat wave (faster, brighter) - draw on top ---
    // Draw segment by segment to modulate opacity with loudness history
    for (let i = 1; i < sampleCount; i++) {
      const histIdx0 = Math.floor((sampleCount - i) * sampleStep);
      const histIdx1 = Math.floor((sampleCount - 1 - i) * sampleStep);
      const idx0 = (this.grooveWriteIndex - GROOVE_HISTORY_LENGTH + histIdx0 + GROOVE_HISTORY_LENGTH) % GROOVE_HISTORY_LENGTH;
      const idx1 = (this.grooveWriteIndex - GROOVE_HISTORY_LENGTH + histIdx1 + GROOVE_HISTORY_LENGTH) % GROOVE_HISTORY_LENGTH;

      const val0 = this.beatHistory[idx0];
      const val1 = this.beatHistory[idx1];
      const x0 = startX + (i - 1) * stepX;
      const x1 = startX + i * stepX;
      const y0 = centerY - (val0 - 0.5) * 2 * waveHeight;
      const y1 = centerY - (val1 - 0.5) * 2 * waveHeight;

      // Use tension color with loudness-modulated opacity
      const [r, g, b] = this.colorHistory[idx1];
      const loudness = this.loudnessHistory[idx1];

      // Glow stroke: base 0.06 + up to 0.12 from loudness
      const glowOpacity = 0.06 + loudness * 0.12;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${glowOpacity})`;
      ctx.lineWidth = 4 * scale;
      ctx.stroke();

      // Core stroke: base 0.25 + up to 0.35 from loudness
      const coreOpacity = 0.25 + loudness * 0.35;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${coreOpacity})`;
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();
    }
  }

  private drawPitchHistogramInline(
    ctx: CanvasRenderingContext2D,
    startX: number,
    centerY: number,
    width: number,
    height: number
  ): void {
    const scale = this.scale;
    const barWidth = width / 12;
    const barPadding = 1 * scale;
    const maxBarHeight = height * 0.35; // Reduced to make room for labels
    const labelY = centerY + height * 0.42; // Position for note names

    // Rotate so current key is leftmost column
    const keyOffset = this.keyPitchClass;

    // Draw bars first
    for (let i = 0; i < 12; i++) {
      // Map display position to actual pitch class (rotated by key)
      const pc = (i + keyOffset) % 12;
      const value = this.pitchHistogram[pc];
      if (value < 0.02) continue;

      const barX = startX + i * barWidth + barPadding;
      const bw = barWidth - barPadding * 2;
      const histBarHeight = value * maxBarHeight;

      // Draw bars extending from center (up and down for symmetry)
      const pcColor = palettes[pc]?.stops[3]?.color ?? [100, 150, 255];
      const alpha = 0.3 + value * 0.5;

      ctx.fillStyle = `rgba(${pcColor[0]}, ${pcColor[1]}, ${pcColor[2]}, ${alpha})`;

      // Upper bar (extends up from center)
      ctx.fillRect(barX, centerY - histBarHeight, bw, histBarHeight);

      // Lower bar (mirror, extends down from center)
      ctx.fillStyle = `rgba(${pcColor[0]}, ${pcColor[1]}, ${pcColor[2]}, ${alpha * 0.6})`;
      ctx.fillRect(barX, centerY, bw, histBarHeight * 0.5);
    }

    // Draw note names below with brightness tied to histogram value
    const labelFontSize = Math.round(9 * scale);
    ctx.font = `${labelFontSize}px "SF Mono", Monaco, Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < 12; i++) {
      // Map display position to actual pitch class (rotated by key)
      const pc = (i + keyOffset) % 12;
      const value = this.pitchHistogram[pc];
      const barX = startX + i * barWidth;
      const centerX = barX + barWidth / 2;

      const pcColor = palettes[pc]?.stops[3]?.color ?? [100, 150, 255];
      // Brightness scales from dim (0.15) to full (1.0) based on histogram value
      const brightness = 0.15 + value * 0.85;

      ctx.fillStyle = `rgba(${pcColor[0]}, ${pcColor[1]}, ${pcColor[2]}, ${brightness})`;
      ctx.fillText(NOTE_NAMES[pc], centerX, labelY);
    }
  }

  private drawMetronome(
    ctx: CanvasRenderingContext2D,
    startX: number,
    centerY: number,
    width: number,
    _height: number,
    keyColor: [number, number, number]
  ): void {
    const scale = this.scale;
    // Clamp beats to reasonable range to prevent smearing
    const beats = Math.max(2, Math.min(12, this.beatsPerBar));
    const dotSpacing = width / (beats + 1);

    // Scale dot radius down if spacing is tight to prevent overlap
    const maxRadius = dotSpacing * 0.35;
    const dotRadius = Math.min(4 * scale, maxRadius);

    const [r, g, b] = this.tensionColor;  // I→V color based on harmonic tension

    // Tension modulates the intensity - convolve with groove signals
    const tension = this.currentTension;
    const tensionBoost = 1 + tension * 0.5;  // 1.0 to 1.5x

    // Ensure beatIndex is valid
    const beatIndex = Math.max(0, Math.min(beats - 1, this.beatIndex));
    const nextBeat = (beatIndex + 1) % beats;

    for (let i = 0; i < beats; i++) {
      const dotX = startX + dotSpacing * (i + 1);
      const isCurrent = i === beatIndex;
      const isNext = i === nextBeat;

      // Cap glow expansion based on available spacing
      const maxGlow = Math.min(4 * scale, dotSpacing * 0.3);

      if (isCurrent) {
        // Current beat - pulses with beatGroove, amplified by tension
        const groovePulse = 1 + this.beatGroove * 0.3 * tensionBoost;
        const arrivalBurst = this.beatArrival * 0.4 * tensionBoost;
        const r2 = dotRadius * (groovePulse + arrivalBurst);

        // Outer glow - tied to arrival, stronger with tension
        if (this.beatArrival > 0.05) {
          ctx.beginPath();
          ctx.arc(dotX, centerY, r2 + maxGlow * tensionBoost, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.25 * this.beatArrival * tensionBoost})`;
          ctx.fill();
        }

        // Middle glow - tied to groove
        ctx.beginPath();
        ctx.arc(dotX, centerY, r2 + maxGlow * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(0.2 + this.beatGroove * 0.15) * tensionBoost})`;
        ctx.fill();

        // Core - brightness follows groove * tension
        ctx.beginPath();
        ctx.arc(dotX, centerY, r2, 0, Math.PI * 2);
        const coreAlpha = Math.min(1, (0.7 + this.beatGroove * 0.3) * tensionBoost);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${coreAlpha})`;
        ctx.fill();

      } else if (isNext) {
        // Next beat - anticipation amplified by tension
        const anticipation = this.beatPosition * this.beatPosition;
        const anticipateScale = 1 + anticipation * 0.08 * tensionBoost;
        const r2 = dotRadius * anticipateScale;

        // Anticipation glow - stronger with tension
        if (anticipation > 0.25) {
          ctx.beginPath();
          ctx.arc(dotX, centerY, r2 + maxGlow * 0.4 * tensionBoost, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(anticipation - 0.25) * 0.2 * tensionBoost})`;
          ctx.fill();
        }

        // Core with anticipation * tension
        ctx.beginPath();
        ctx.arc(dotX, centerY, r2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(0.2 + anticipation * 0.12) * tensionBoost})`;
        ctx.fill();

      } else {
        // Other beats - breathing modulated by tension
        const breathe = 1 + this.beatGroove * 0.05 * tensionBoost;
        const r2 = dotRadius * breathe;

        ctx.beginPath();
        ctx.arc(dotX, centerY, r2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.2)`;
        ctx.fill();
      }
    }

    // BPM number underneath metronome
    const fontSmall = Math.round(10 * scale);
    ctx.font = `bold ${fontSmall}px "SF Mono", Monaco, Consolas, monospace`;
    ctx.fillStyle = `rgb(${keyColor[0]}, ${keyColor[1]}, ${keyColor[2]})`;
    ctx.textAlign = 'center';
    const bpmText = this.currentBpm > 0 ? `${this.currentBpm}` : '---';
    ctx.fillText(bpmText, startX + width / 2, centerY + 16 * scale);
    ctx.textAlign = 'left';
  }

  isReady(): boolean {
    return this._ready;
  }

  dispose(): void {
    // No resources to clean up
  }

  getConfig(): EffectConfig[] {
    return [
      {
        key: 'barHeight',
        label: 'Bar Size',
        type: 'range',
        value: this.barHeight,
        min: 40,
        max: 80,
        step: 4,
      },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'barHeight' && typeof value === 'number') {
      this.barHeight = value;
    }
  }

  /** Animate the bar sliding in from below */
  animateIn(): void {
    this.slideOffset = 1;  // Start hidden
    this.slideTarget = 0;  // Animate to visible
    this.onSlideComplete = null;
  }

  /** Animate the bar sliding out below, then call callback */
  animateOut(onComplete: () => void): void {
    this.slideTarget = 1;  // Animate to hidden
    this.onSlideComplete = onComplete;
  }
}
