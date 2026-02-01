import { Midi } from '@tonejs/midi';

// --- Types ---

export type ChordQuality = 'major' | 'minor' | 'dom7' | 'min7' | 'dim' | 'aug' | 'unknown';

export interface ChordEvent {
  time: number;       // seconds
  quality: ChordQuality;
  root: number;       // pitch class 0-11 (C=0)
  degree: number;     // scale degree 1-7 relative to key (0 if chromatic)
  tension: number;    // 0-1 harmonic tension (pre-computed from degree + quality)
  nextDegree: number; // degree of the following chord (0 if last/unknown)
}

export interface DrumHit {
  time: number;
  type: 'kick' | 'snare' | 'hihat';
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
  tempo: number;
  timeSignature: [number, number];
  key: number;           // pitch class 0-11
  keyMode: 'major' | 'minor';
  duration: number;      // total seconds
  chords: ChordEvent[];
  drums: DrumHit[];
  notes: NoteEvent[];
}

// --- Chord detection ---

// Chord templates: intervals from root as pitch class sets
const chordTemplates: { quality: ChordQuality; intervals: number[] }[] = [
  { quality: 'major',  intervals: [0, 4, 7] },
  { quality: 'minor',  intervals: [0, 3, 7] },
  { quality: 'dom7',   intervals: [0, 4, 7, 10] },
  { quality: 'min7',   intervals: [0, 3, 7, 10] },
  { quality: 'dim',    intervals: [0, 3, 6] },
  { quality: 'aug',    intervals: [0, 4, 8] },
];

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
      // Score: proportion of total weight explained by chord tones + diatonic bias
      const score = (matchWeight / totalWeight) - 0.3 * (nonChordWeight / totalWeight) + diatonicBonus;

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

function classifyDrum(noteNumber: number): 'kick' | 'snare' | 'hihat' | null {
  // General MIDI drum map
  if (noteNumber === 35 || noteNumber === 36) return 'kick';
  if (noteNumber === 38 || noteNumber === 40 || noteNumber === 37) return 'snare';
  if (noteNumber >= 42 && noteNumber <= 46) return 'hihat';
  if (noteNumber === 49 || noteNumber === 51 || noteNumber === 57) return 'hihat'; // cymbals as hihat
  return null;
}

// --- Key detection via Krumhansl-Schmuckler ---

const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function detectKey(pitchHistogram: number[]): { key: number; mode: 'major' | 'minor' } {
  let bestCorr = -Infinity;
  let bestKey = 0;
  let bestMode: 'major' | 'minor' = 'major';

  for (let shift = 0; shift < 12; shift++) {
    const profiles: ['major' | 'minor', number[]][] = [['major', majorProfile], ['minor', minorProfile]];
    for (const [mode, profile] of profiles) {
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
      if (corr > bestCorr) {
        bestCorr = corr;
        bestKey = shift;
        bestMode = mode;
      }
    }
  }

  return { key: bestKey, mode: bestMode };
}

// --- Main analyzer ---

export function analyzeMidiBuffer(buffer: ArrayBuffer): MusicTimeline {
  const midi = new Midi(buffer);

  const tempo = midi.header.tempos.length > 0 ? midi.header.tempos[0].bpm : 120;
  const ts = midi.header.timeSignatures.length > 0
    ? midi.header.timeSignatures[0]
    : null;
  const timeSignature: [number, number] = ts
    ? [ts.timeSignature[0], ts.timeSignature[1]]
    : [4, 4];

  const beatDuration = 60 / tempo;
  const notes: NoteEvent[] = [];
  const drums: DrumHit[] = [];
  const pitchHistogram = new Array(12).fill(0);

  let totalDuration = 0;

  for (let trackIdx = 0; trackIdx < midi.tracks.length; trackIdx++) {
    const track = midi.tracks[trackIdx];
    // Check both track-level and per-note channel for drum detection
    const trackIsDrum = track.channel === 9;

    for (const note of track.notes) {
      const endTime = note.time + note.duration;
      if (endTime > totalDuration) totalDuration = endTime;

      // @tonejs/midi notes have a channel property (0-indexed)
      const noteIsDrum = trackIsDrum || (note as unknown as { channel: number }).channel === 9;

      if (noteIsDrum) {
        const drumType = classifyDrum(note.midi);
        if (drumType) {
          drums.push({ time: note.time, type: drumType });
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

  // Detect chords per bar with onset-accurate timing
  // Per-bar gives stable, musically meaningful chord changes
  const beatsPerBar = timeSignature[0];
  const barDuration = beatDuration * beatsPerBar;
  const numBars = Math.ceil(totalDuration / barDuration);
  const chords: ChordEvent[] = [];

  for (let bar = 0; bar < numBars; bar++) {
    const tStart = bar * barDuration;
    const tEnd = tStart + barDuration;

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
        tension: 0,    // computed in post-pass
        nextDegree: 0,  // computed in post-pass
      });
    }
  }

  // --- Post-processing: compute tension and look-ahead ---
  // Harmonic function tension by scale degree
  // I=tonic(rest), V=dominant(tension), vii°=leading tone(max tension)
  const degreeTension: Record<number, number> = {
    0: 0.5,  // chromatic / unknown degree
    1: 0.0,  // I   - tonic, home
    2: 0.35, // ii  - supertonic, gentle departure
    3: 0.25, // iii - mediant, ambiguous
    4: 0.2,  // IV  - subdominant, warm
    5: 0.7,  // V   - dominant, strong pull
    6: 0.15, // vi  - submediant, bittersweet
    7: 0.85, // vii - leading tone, maximum tension
  };
  // Quality modifiers: 7th chords add tension, dim/aug add more
  const qualityTensionBoost: Record<ChordQuality, number> = {
    major: 0, minor: 0.05, dom7: 0.1, min7: 0.08,
    dim: 0.15, aug: 0.12, unknown: 0,
  };

  for (let i = 0; i < chords.length; i++) {
    const c = chords[i];
    const baseTension = degreeTension[c.degree] ?? 0.5;
    const qualityBoost = qualityTensionBoost[c.quality];
    c.tension = Math.min(1, baseTension + qualityBoost);
    c.nextDegree = i + 1 < chords.length ? chords[i + 1].degree : 0;
  }

  return {
    tempo,
    timeSignature,
    key,
    keyMode,
    duration: totalDuration,
    chords,
    drums,
    notes,
  };
}
