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
