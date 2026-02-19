import { Midi } from '@tonejs/midi';
import type { TempoEvent, TimeSignatureEvent } from './beat-sync.ts';

// --- Types ---

export type ChordQuality =
  | 'major' | 'minor' | 'dim' | 'aug'           // triads
  | 'maj7' | 'dom7' | 'min7' | 'hdim7' | 'dim7' // 7ths
  | 'sus4' | 'sus2'                             // suspended
  | 'unknown';

export interface ChordEvent {
  time: number;       // seconds
  quality: ChordQuality;
  root: number;       // pitch class 0-11 (C=0)
  degree: number;     // scale degree 1-7 relative to key (0 if chromatic)
  tension: number;    // 0-1 harmonic tension (pre-computed from degree + quality)
  numeral: string;    // precomputed roman numeral (e.g., "I", "V7", "ii")
}

export interface DrumHit {
  time: number;
  energy: number;  // 0-1, weighted by drum type (kick=1.0, snare=0.35, tom=0.4, crash=0.25, hihat=0.15)
}

export interface NoteEvent {
  time: number;
  duration: number;
  midi: number;       // MIDI note number
  velocity: number;   // 0-1
  channel: number;    // track index
  isDrum: boolean;
}

export interface MusicTimeline {
  name: string;                           // song name from MIDI metadata
  tempo: number;                          // initial tempo (backward compat)
  timeSignature: [number, number];        // initial time sig (backward compat)
  tempoEvents: TempoEvent[];              // all tempo changes
  timeSignatureEvents: TimeSignatureEvent[]; // all time sig changes
  key: number;           // pitch class 0-11
  keyMode: 'major' | 'minor';
  useFlats: boolean;     // true if key signature uses flats (F, Bb, Eb, etc.)
  duration: number;      // total seconds
  chords: ChordEvent[];
  drums: DrumHit[];
  notes: NoteEvent[];
}

// --- Chord detection ---

// Chord templates: intervals from root as pitch class sets
// Ordered by preference (simpler chords first for disambiguation)
const chordTemplates: { quality: ChordQuality; intervals: number[] }[] = [
  // Triads (most common, prefer these)
  { quality: 'major',  intervals: [0, 4, 7] },
  { quality: 'minor',  intervals: [0, 3, 7] },
  { quality: 'dim',    intervals: [0, 3, 6] },
  { quality: 'aug',    intervals: [0, 4, 8] },

  // Suspended (ambiguous, no 3rd)
  { quality: 'sus4',   intervals: [0, 5, 7] },
  { quality: 'sus2',   intervals: [0, 2, 7] },

  // Seventh chords (more complex, need strong evidence)
  { quality: 'maj7',   intervals: [0, 4, 7, 11] },   // Major 7th (Cmaj7)
  { quality: 'dom7',   intervals: [0, 4, 7, 10] },   // Dominant 7th (C7)
  { quality: 'min7',   intervals: [0, 3, 7, 10] },   // Minor 7th (Cm7)
  { quality: 'hdim7',  intervals: [0, 3, 6, 10] },   // Half-diminished (Cø7)
  { quality: 'dim7',   intervals: [0, 3, 6, 9] },    // Fully diminished (Co7)
];

// Quality preference adjustments for disambiguation
// Positive = penalty (less preferred), Negative = bonus (more preferred)
const QUALITY_PREFERENCE: Record<ChordQuality, number> = {
  major: 0,
  minor: 0,
  dim: 0,
  aug: 0.02,        // Slightly rare
  sus4: 0.02,       // Ambiguous (no 3rd)
  sus2: 0.02,       // Ambiguous (no 3rd)
  maj7: 0.01,       // Common in jazz/pop
  dom7: -0.02,      // Very common, distinctive tritone
  min7: -0.01,      // Common
  hdim7: 0.02,      // Less common
  dim7: 0.02,       // Less common
  unknown: 0,
};

// Diatonic pitch classes for major and minor keys (semitones from root)
const majorScale = [0, 2, 4, 5, 7, 9, 11];
const minorScale = [0, 2, 3, 5, 7, 8, 10];

function getDiatonicSet(key: number, mode: 'major' | 'minor'): Set<number> {
  const scale = mode === 'major' ? majorScale : minorScale;
  return new Set(scale.map(s => (key + s) % 12));
}

function getScaleDegree(root: number, key: number, mode: 'major' | 'minor'): number {
  const scale = mode === 'major' ? majorScale : minorScale;
  const interval = ((root - key) % 12 + 12) % 12;
  const idx = scale.indexOf(interval);
  return idx >= 0 ? idx + 1 : 0; // 1-7 or 0 if chromatic
}

function detectChordWeighted(
  weights: number[],
  diatonicSet: Set<number>
): { quality: ChordQuality; root: number } {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight < 1e-6) return { quality: 'unknown', root: 0 };

  let bestScore = -Infinity;
  let bestQuality: ChordQuality = 'unknown';
  let bestRoot = 0;

  for (let root = 0; root < 12; root++) {
    // Diatonic roots get a bonus
    const diatonicBonus = diatonicSet.has(root) ? 0.15 : 0;

    for (const tmpl of chordTemplates) {
      // Weighted match: sum weights of present chord tones, normalized
      let matchWeight = 0;
      for (const interval of tmpl.intervals) {
        matchWeight += weights[(root + interval) % 12];
      }
      // Penalty for strong non-chord tones
      let nonChordWeight = 0;
      const chordTones = new Set(tmpl.intervals.map(i => (root + i) % 12));
      for (let pc = 0; pc < 12; pc++) {
        if (!chordTones.has(pc)) nonChordWeight += weights[pc];
      }
      // Quality preference adjustment (bonus for common, penalty for rare)
      const qualityPref = QUALITY_PREFERENCE[tmpl.quality] ?? 0;

      // Score: proportion of total weight explained by chord tones + diatonic bias - quality preference
      const score = (matchWeight / totalWeight) - 0.3 * (nonChordWeight / totalWeight) + diatonicBonus - qualityPref;

      if (score > bestScore) {
        bestScore = score;
        bestQuality = tmpl.quality;
        bestRoot = root;
      }
    }
  }

  if (bestScore < 0.3) return { quality: 'unknown', root: 0 };
  return { quality: bestQuality, root: bestRoot };
}

// --- Drum classification ---
// Returns energy weight: kick=1.0, snare=0.35, tom=0.4, crash=0.25, hihat=0.15

function getDrumEnergy(noteNumber: number): number {
  // General MIDI drum map (note numbers on channel 10 / 0-indexed channel 9)
  if (noteNumber === 35 || noteNumber === 36) return 1.0;  // kick
  if (noteNumber === 38 || noteNumber === 40 || noteNumber === 37) return 0.35;  // snare
  if (noteNumber === 39) return 0.35;  // hand clap (snare-like)
  if (noteNumber === 49 || noteNumber === 57) return 0.25;  // crash cymbals
  // Hi-hats and cymbals
  if (noteNumber === 42 || noteNumber === 44 || noteNumber === 46) return 0.15;  // hi-hats
  if (noteNumber === 51 || noteNumber === 52 || noteNumber === 53 ||
      noteNumber === 55 || noteNumber === 59) return 0.15;  // rides/splash
  if (noteNumber === 54 || noteNumber === 56) return 0.15;  // tambourine, cowbell
  // Toms
  if (noteNumber === 41 || noteNumber === 43 || noteNumber === 45 ||
      noteNumber === 47 || noteNumber === 48 || noteNumber === 50) return 0.4;
  return 0;
}

// --- Key detection via Krumhansl-Schmuckler ---

// Krumhansl (1990) - Cognitive experiments with listeners
const KRUMHANSL_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KRUMHANSL_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function detectKey(pitchHistogram: number[]): { key: number; mode: 'major' | 'minor' } {
  let bestKey = 0;
  let bestMode: 'major' | 'minor' = 'major';
  let bestCorr = -Infinity;

  for (let shift = 0; shift < 12; shift++) {
    for (const mode of ['major', 'minor'] as const) {
      const profile = mode === 'major' ? KRUMHANSL_MAJOR : KRUMHANSL_MINOR;
      let sum = 0;
      let sumH = 0, sumP = 0;
      let sumH2 = 0, sumP2 = 0;
      for (let i = 0; i < 12; i++) {
        const h = pitchHistogram[(i + shift) % 12];
        const p = profile[i];
        sumH += h; sumP += p;
        sumH2 += h * h; sumP2 += p * p;
        sum += h * p;
      }
      const meanH = sumH / 12, meanP = sumP / 12;
      const corr = (sum / 12 - meanH * meanP) /
        (Math.sqrt(sumH2 / 12 - meanH * meanH) * Math.sqrt(sumP2 / 12 - meanP * meanP) + 1e-10);
      // Small bias toward major keys (helps with ambiguous cases like C maj vs A min)
      const adjustedCorr = mode === 'major' ? corr + 0.02 : corr;

      if (adjustedCorr > bestCorr) {
        bestCorr = adjustedCorr;
        bestKey = shift;
        bestMode = mode;
      }
    }
  }

  return { key: bestKey, mode: bestMode };
}

// --- Main analyzer ---

/** Unwrap RIFF-MIDI container if present, returning raw SMF data */
function unwrapRiff(buffer: ArrayBuffer): ArrayBuffer {
  const view = new DataView(buffer);
  // Check for 'RIFF' header
  if (view.byteLength > 20 &&
      view.getUint8(0) === 0x52 && view.getUint8(1) === 0x49 &&
      view.getUint8(2) === 0x46 && view.getUint8(3) === 0x46) {
    // Find 'MThd' inside the RIFF container (typically at offset 20)
    for (let i = 8; i < view.byteLength - 4; i++) {
      if (view.getUint8(i) === 0x4D && view.getUint8(i + 1) === 0x54 &&
          view.getUint8(i + 2) === 0x68 && view.getUint8(i + 3) === 0x64) {
        return buffer.slice(i);
      }
    }
  }
  return buffer;
}

export function analyzeMidiBuffer(buffer: ArrayBuffer): MusicTimeline {
  const midi = new Midi(unwrapRiff(buffer));

  // Extract song name from MIDI header or first track
  const songName = midi.header.name || midi.tracks[0]?.name || '';

  // Parse all tempo events with times
  const tempoEvents: TempoEvent[] = midi.header.tempos.map(t => ({
    time: midi.header.ticksToSeconds(t.ticks),
    bpm: t.bpm,
  }));
  if (tempoEvents.length === 0) {
    tempoEvents.push({ time: 0, bpm: 120 });
  }
  tempoEvents.sort((a, b) => a.time - b.time);

  // Parse all time signature events with times
  const timeSignatureEvents: TimeSignatureEvent[] = midi.header.timeSignatures.map(ts => ({
    time: midi.header.ticksToSeconds(ts.ticks),
    numerator: ts.timeSignature[0],
    denominator: ts.timeSignature[1],
  }));
  if (timeSignatureEvents.length === 0) {
    timeSignatureEvents.push({ time: 0, numerator: 4, denominator: 4 });
  }
  timeSignatureEvents.sort((a, b) => a.time - b.time);

  // Initial values for backward compatibility
  const tempo = tempoEvents[0].bpm;
  const timeSignature: [number, number] = [
    timeSignatureEvents[0].numerator,
    timeSignatureEvents[0].denominator,
  ];

  const beatDuration = 60 / tempo;
  const notes: NoteEvent[] = [];
  const drums: DrumHit[] = [];
  const pitchHistogram = new Array(12).fill(0);

  let totalDuration = 0;

  for (let trackIdx = 0; trackIdx < midi.tracks.length; trackIdx++) {
    const track = midi.tracks[trackIdx];
    // Detect drum tracks: channel 9 (GM), instrument name, or track name
    const instrName = (track.instrument?.name ?? '').toLowerCase();
    const trackName = (track.name ?? '').toLowerCase();
    const drumKeywords = ['drum', 'kit', 'percussion', 'tom', 'snare', 'kick', 'cymbal', 'standard kit'];
    const nameIsDrum = drumKeywords.some(kw => instrName.includes(kw) || trackName.includes(kw));
    const trackIsDrum = track.channel === 9 || nameIsDrum;

    for (const note of track.notes) {
      const endTime = note.time + note.duration;
      if (endTime > totalDuration) totalDuration = endTime;

      const noteIsDrum = trackIsDrum;

      if (noteIsDrum) {
        const energy = getDrumEnergy(note.midi);
        if (energy > 0) {
          drums.push({ time: note.time, energy });
        }
      } else {
        notes.push({
          time: note.time,
          duration: note.duration,
          midi: note.midi,
          velocity: note.velocity,
          channel: trackIdx,
          isDrum: false,
        });
        pitchHistogram[note.midi % 12] += note.duration * note.velocity;
      }
    }
  }

  drums.sort((a, b) => a.time - b.time);
  notes.sort((a, b) => a.time - b.time);

  // Detect key and mode
  const { key, mode: keyMode } = detectKey(pitchHistogram);
  const diatonicSet = getDiatonicSet(key, keyMode);

  // Detect chords per half-bar for finer harmonic resolution
  // Diatonic bias and quality weighting prevent bouncing on passing tones
  const beatsPerBar = timeSignature[0];
  const barDuration = beatDuration * beatsPerBar;
  const halfBarDuration = barDuration / 2;
  const numBars = Math.ceil(totalDuration / barDuration);
  const numHalfBars = numBars * 2;
  const chords: ChordEvent[] = [];

  for (let halfBar = 0; halfBar < numHalfBars; halfBar++) {
    const tStart = halfBar * halfBarDuration;
    const tEnd = tStart + halfBarDuration;

    // Accumulate weighted pitch class profile for this beat
    const weights = new Array(12).fill(0);
    let earliestOnset = tEnd; // track first note attack in this window
    for (const note of notes) {
      if (note.time >= tEnd) break;
      const noteEnd = note.time + note.duration;
      if (noteEnd > tStart && note.time < tEnd) {
        const overlapStart = Math.max(note.time, tStart);
        const overlapEnd = Math.min(noteEnd, tEnd);
        const overlapDur = overlapEnd - overlapStart;
        weights[note.midi % 12] += overlapDur * note.velocity;
        // Track onset of notes that actually start in this window
        if (note.time >= tStart && note.time < earliestOnset) {
          earliestOnset = note.time;
        }
      }
    }

    const chord = detectChordWeighted(weights, diatonicSet);
    const degree = getScaleDegree(chord.root, key, keyMode);

    // Only emit a new chord event if the chord actually changed
    const prev = chords[chords.length - 1];
    if (!prev || prev.quality !== chord.quality || prev.root !== chord.root) {
      // Use earliest note onset as chord time (not beat boundary)
      const chordTime = earliestOnset < tEnd ? earliestOnset : tStart;
      chords.push({
        time: chordTime,
        quality: chord.quality,
        root: chord.root,
        degree,
        tension: 0,           // computed in post-pass
        numeral: '',          // computed in post-pass
      });
    }
  }

  // --- Helper: build roman numeral for chord ---
  const ROMAN_NUMERALS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const buildChordNumeral = (degree: number, quality: ChordQuality): string => {
    if (degree > 0 && degree <= 7) {
      const isMinor = ['minor', 'min7', 'dim', 'hdim7', 'dim7'].includes(quality);
      let numeral = isMinor ? ROMAN_NUMERALS[degree].toLowerCase() : ROMAN_NUMERALS[degree];
      if (quality === 'dim') numeral += '°';
      else if (quality === 'hdim7') numeral += 'ø7';
      else if (quality === 'dim7') numeral += '°7';
      else if (quality === 'dom7' || quality === 'min7') numeral += '7';
      else if (quality === 'maj7') numeral += 'Δ7';
      return numeral;
    }
    return '';
  };

  // --- Post-processing: compute tension using Lerdahl-inspired model ---
  // Based on: Lerdahl & Krumhansl "Modeling Tonal Tension" (2007)
  // Tension = hierarchical distance + surface dissonance + harmonic motion

  // 1. Circle of fifths distance from tonic (hierarchical tension)
  // Maps scale degree to steps around circle of fifths from tonic
  // I=0, V=1, ii=2, vi=3, iii=4, vii=5, IV=-1 (or 11 = close subdominant)
  const fifthsFromTonic: Record<number, number> = {
    0: 3,   // chromatic / unknown - moderate distance
    1: 0,   // I   - tonic (0 steps)
    2: 2,   // ii  - 2 fifths up (D in C)
    3: 4,   // iii - 4 fifths up (E in C)
    4: -1,  // IV  - 1 fifth down (F in C) - use abs
    5: 1,   // V   - 1 fifth up (G in C)
    6: 3,   // vi  - 3 fifths up (A in C)
    7: 5,   // vii - 5 fifths up (B in C)
  };
  // Normalize to 0-1: max distance is 6 (tritone away)
  const hierarchicalTension = (degree: number): number => {
    const dist = Math.abs(fifthsFromTonic[degree] ?? 3);
    return Math.min(1, dist / 6);
  };

  // 2. Surface dissonance from chord quality (psychoacoustic roughness)
  // Based on interval content: tritones, minor 2nds add dissonance
  const qualityDissonance: Record<ChordQuality, number> = {
    major: 0.0,    // M3 + P5: consonant
    minor: 0.08,   // m3 + P5: slightly darker
    dim: 0.35,     // two m3s + tritone: high dissonance
    aug: 0.30,     // whole-tone, ambiguous: high
    sus4: 0.12,    // unresolved 4th
    sus2: 0.10,    // unresolved 2nd
    maj7: 0.05,    // rich but stable
    dom7: 0.25,    // contains tritone (3-7)
    min7: 0.15,    // m3 + m7: moderate
    hdim7: 0.38,   // half-diminished: high
    dim7: 0.40,    // fully diminished: highest
    unknown: 0.1,
  };

  // 3. Harmonic motion: tension from chord-to-chord root movement
  // Strong progressions (by 5th) are smooth; chromatic/tritone = jarring
  const rootMotionTension = (prevRoot: number, currRoot: number): number => {
    if (prevRoot < 0) return 0;
    const interval = Math.abs(currRoot - prevRoot);
    const semitones = Math.min(interval, 12 - interval); // shortest path
    // Motion by 5th (7 semitones) or 4th (5) = smooth
    // Motion by 2nd (1-2) or tritone (6) = tense
    const motionTension: Record<number, number> = {
      0: 0,     // same chord
      1: 0.3,   // half step - chromatic
      2: 0.25,  // whole step
      3: 0.15,  // minor 3rd
      4: 0.15,  // major 3rd
      5: 0.05,  // perfect 4th - smooth
      6: 0.4,   // tritone - jarring
    };
    return motionTension[semitones] ?? 0.1;
  };

  // 4. Tendency tone factor: V and vii have strong pull to I
  const tendencyTension: Record<number, number> = {
    0: 0,
    1: 0,      // I: resolved
    2: 0.05,   // ii: mild pre-dominant
    3: 0.05,   // iii: ambiguous
    4: 0.1,    // IV: plagal tendency
    5: 0.2,    // V: strong dominant pull (wants to resolve)
    6: 0.05,   // vi: deceptive possibility
    7: 0.3,    // vii: leading tone, maximum pull
  };

  // Combine components with weights (based on Lerdahl's findings)
  // Hierarchical: 40%, Dissonance: 25%, Motion: 20%, Tendency: 15%
  let prevRoot = -1;
  for (const c of chords) {
    // Compute tension components
    const hier = hierarchicalTension(c.degree);
    const diss = qualityDissonance[c.quality] ?? 0;
    const motion = rootMotionTension(prevRoot, c.root);
    const tendency = tendencyTension[c.degree] ?? 0;

    // Base tension from Lerdahl model
    const tension = hier * 0.40 + diss * 0.25 + motion * 0.20 + tendency * 0.15;

    c.tension = Math.min(1, tension);
    c.numeral = buildChordNumeral(c.degree, c.quality);
    prevRoot = c.root;
  }

  // Detect local key regions (modulations)
  // Determine if key uses flats based on key signature conventions
  // Major keys using flats: F(5), Bb(10), Eb(3), Ab(8), Db(1), Gb(6), Cb(11)
  // Minor keys using flats: D(2), G(7), C(0), F(5), Bb(10), Eb(3), Ab(8)
  const flatMajorKeys = [5, 10, 3, 8, 1, 6, 11];
  const flatMinorKeys = [2, 7, 0, 5, 10, 3, 8];
  const useFlats = keyMode === 'major'
    ? flatMajorKeys.includes(key)
    : flatMinorKeys.includes(key);

  return {
    name: songName,
    tempo,
    timeSignature,
    tempoEvents,
    timeSignatureEvents,
    key,
    keyMode,
    useFlats,
    duration: totalDuration,
    chords,
    drums,
    notes,
  };
}
