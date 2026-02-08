// --- Shared utilities for visual effects ---

import { palettes } from '../fractal-engine.ts';

/** Sample a color from a palette at a given position (0-1) */
export function samplePaletteColor(paletteIdx: number, pos: number): [number, number, number] {
  const p = palettes[paletteIdx % palettes.length];
  const stops = p.stops;
  let s0 = stops[0], s1 = stops[stops.length - 1];
  for (let j = 0; j < stops.length - 1; j++) {
    if (pos >= stops[j].pos && pos <= stops[j + 1].pos) {
      s0 = stops[j];
      s1 = stops[j + 1];
      break;
    }
  }
  const range = s1.pos - s0.pos;
  const f = range === 0 ? 0 : (pos - s0.pos) / range;
  return [
    Math.round(s0.color[0] + (s1.color[0] - s0.color[0]) * f),
    Math.round(s0.color[1] + (s1.color[1] - s0.color[1]) * f),
    Math.round(s0.color[2] + (s1.color[2] - s0.color[2]) * f),
  ];
}

/** Calculate relative luminance (0-1) using sRGB coefficients */
export function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Sample a color with perceptual brightness equalization.
 * Dark colors (purple, blue) sample from brighter positions,
 * bright colors (yellow, orange) can sample from darker positions.
 * @param paletteIdx - pitch class (0-11)
 * @param targetLuminance - desired luminance (0-1), e.g. 0.3 for "dark but visible"
 */
export function samplePaletteEqualized(paletteIdx: number, targetLuminance: number): [number, number, number] {
  // Binary search for position that achieves target luminance
  let lo = 0, hi = 1;
  let bestPos = 0.5;
  let bestDiff = Infinity;

  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2;
    const color = samplePaletteColor(paletteIdx, mid);
    const lum = luminance(color[0], color[1], color[2]);
    const diff = Math.abs(lum - targetLuminance);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestPos = mid;
    }

    if (lum < targetLuminance) {
      lo = mid; // need brighter, go higher in palette
    } else {
      hi = mid; // need darker, go lower in palette
    }
  }

  return samplePaletteColor(paletteIdx, bestPos);
}

/** Diatonic scale degree offsets (semitones from root) */
export const MAJOR_OFFSETS = new Set([0, 2, 4, 5, 7, 9, 11]);
export const MINOR_OFFSETS = new Set([0, 2, 3, 5, 7, 8, 10]);

/** Roman numeral labels for scale degrees, keyed by semitone offset */
export const MAJOR_DEGREES: Record<number, string> = { 0: 'I', 2: 'II', 4: 'III', 5: 'IV', 7: 'V', 9: 'VI', 11: 'VII' };
export const MINOR_DEGREES: Record<number, string> = { 0: 'i', 2: 'ii', 3: 'III', 5: 'iv', 7: 'v', 8: 'VI', 10: 'VII' };

/** Compute the pitch classes in a chord triad (+ optional 7th) */
export function chordTriad(root: number, quality: string): Set<number> {
  const notes = new Set<number>();
  if (root < 0) return notes;
  notes.add(root);
  // Third
  if (quality === 'minor' || quality === 'min7' || quality === 'dim') {
    notes.add((root + 3) % 12);
  } else {
    notes.add((root + 4) % 12);
  }
  // Fifth
  if (quality === 'dim') {
    notes.add((root + 6) % 12);
  } else if (quality === 'aug') {
    notes.add((root + 8) % 12);
  } else {
    notes.add((root + 7) % 12);
  }
  // Seventh
  if (quality === 'dom7' || quality === 'min7') {
    notes.add((root + 10) % 12);
  }
  return notes;
}

/** Semitone offset of pitch class relative to key (0-11) */
export function semitoneOffset(pitchClass: number, key: number): number {
  return ((pitchClass - key + 12) % 12);
}

// --- Spiral coordinate system (shared by note-spiral, bass-clock, melody-clock) ---

/** MIDI range for spiral visualization */
export const SPIRAL_MIDI_LO = 21;   // A0 (lowest piano key)
export const SPIRAL_MIDI_HI = 106;  // A7 (highest visualized)
export const SPIRAL_MIDI_RANGE = SPIRAL_MIDI_HI - SPIRAL_MIDI_LO; // 85 semitones

/** Spiral maxR as fraction of minDim (Math.min(w, h) / 2) */
export const SPIRAL_RADIUS_SCALE = 0.82;

/** Spiral position result */
export interface SpiralPos {
  x: number;
  y: number;
  radius: number;
  angle: number;
  scale: number;
}

/**
 * Calculate position on the note spiral for a given MIDI note.
 * Use midi > SPIRAL_MIDI_HI for imaginary outer octave (e.g., numerals).
 */
export function spiralPos(
  midi: number,
  pitchClass: number,
  key: number,
  keyRotation: number,
  cx: number,
  cy: number,
  maxR: number,
  tightness = 0.8  // power curve exponent: lower = more space for bass, higher = tighter spiral
): SpiralPos {
  const t = (midi - SPIRAL_MIDI_LO) / SPIRAL_MIDI_RANGE;

  // Radius: power curve for balanced visual spacing
  // 0.10 minimum keeps lowest notes from being too far at the edge
  const radius = maxR * (0.10 + 0.90 * Math.pow(Math.max(0, t), tightness));

  // Angle: pitch class position + key rotation + spiral twist
  const baseAngle = (pitchClass / 12) * Math.PI * 2 - Math.PI / 2;
  const fromRoot = ((pitchClass - key + 12) % 12);
  // Use sine wave for smooth twist - no discontinuity
  const twist = Math.sin(fromRoot / 12 * Math.PI * 2) * 0.05;
  const angle = baseAngle + keyRotation + twist;

  // Position with perspective rise
  const rise = -t * maxR * 0.08;
  const scale = 1.0 + t * 0.1;

  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius + rise,
    radius,
    angle,
    scale,
  };
}
