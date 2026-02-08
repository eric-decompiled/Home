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
  nextDegree: number; // degree of the following chord (0 if last/unknown)
  isSecondary: boolean;          // true if this is a secondary dominant (V/x or viio/x)
  secondaryTarget: number;       // target degree being tonicized (2-7), 0 if not secondary
  isChromatic: boolean;          // true if root or quality doesn't fit current key
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

export interface TrackInfo {
  index: number;           // track index (matches NoteEvent.channel)
  name: string;            // track name from MIDI
  instrumentName: string;  // GM instrument name
  instrumentFamily: string; // "piano", "strings", "brass", etc.
  instrumentNumber: number; // GM program 0-127
  isDrum: boolean;
  midiChannel: number;     // actual MIDI channel (0-15)
}

export interface KeyRegion {
  startTime: number;     // seconds
  endTime: number;       // seconds
  key: number;           // pitch class 0-11
  mode: 'major' | 'minor';
  confidence: number;    // correlation coefficient 0-1
  ambiguity: number;     // 0 = clear, 1 = ambiguous (1st vs 2nd best close)
}

export interface MusicTimeline {
  name: string;                           // song name from MIDI metadata
  tempo: number;                          // initial tempo (backward compat)
  timeSignature: [number, number];        // initial time sig (backward compat)
  tempoEvents: TempoEvent[];              // all tempo changes
  timeSignatureEvents: TimeSignatureEvent[]; // all time sig changes
  key: number;           // pitch class 0-11
  keyMode: 'major' | 'minor';
  keyRegions: KeyRegion[];                // local key changes (modulations)
  duration: number;      // total seconds
  chords: ChordEvent[];
  drums: DrumHit[];
  notes: NoteEvent[];
  tracks: TrackInfo[];
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

// Expected chord qualities for each scale degree
// See research/music-analysis-improvements.md for theory
const DIATONIC_QUALITIES: Record<'major' | 'minor', Record<number, ChordQuality[]>> = {
  major: {
    1: ['major', 'maj7'],           // I, Imaj7
    2: ['minor', 'min7'],           // ii, ii7
    3: ['minor', 'min7'],           // iii, iii7
    4: ['major', 'maj7'],           // IV, IVmaj7
    5: ['major', 'dom7'],           // V, V7
    6: ['minor', 'min7'],           // vi, vi7
    7: ['dim', 'hdim7'],            // viio, viiø7
  },
  minor: {
    1: ['minor', 'min7'],           // i, i7
    2: ['dim', 'hdim7'],            // iio, iiø7
    3: ['major', 'maj7', 'aug'],    // III (or III+)
    4: ['minor', 'min7'],           // iv, iv7
    5: ['minor', 'min7', 'major', 'dom7'], // v or V (harmonic minor)
    6: ['major', 'maj7'],           // VI, VImaj7
    7: ['major', 'dom7', 'dim', 'dim7'],   // VII or viio
  },
};

function isDiatonicQuality(
  degree: number,
  quality: ChordQuality,
  mode: 'major' | 'minor'
): boolean {
  const expected = DIATONIC_QUALITIES[mode][degree];
  return expected?.includes(quality) ?? false;
}

function isChromatic(
  root: number,
  quality: ChordQuality,
  key: number,
  mode: 'major' | 'minor'
): boolean {
  const degree = getScaleDegree(root, key, mode);
  if (degree === 0) return true; // chromatic root
  return !isDiatonicQuality(degree, quality, mode);
}

interface SecondaryDominantInfo {
  isSecondary: boolean;
  target: number;  // Scale degree being tonicized (2-7), 0 if not secondary
}

/**
 * Detect if a chord is a secondary dominant (V/x or viio/x)
 * Secondary dominants are chromatic chords that resolve by fifth to a diatonic chord
 */
function detectSecondaryDominant(
  current: { root: number; quality: ChordQuality },
  next: { root: number; degree: number } | null,
  key: number,
  mode: 'major' | 'minor'
): SecondaryDominantInfo {
  if (!next || next.degree === 0) {
    return { isSecondary: false, target: 0 };
  }

  // Calculate interval of resolution
  const interval = ((next.root - current.root) % 12 + 12) % 12;

  // V/x: Major or dom7 chord resolving down by 5th (= up by P4 = 5 semitones)
  const resolvesByFifth = interval === 5;
  const isSecDomQuality = current.quality === 'major' || current.quality === 'dom7';

  // viio/x: Diminished chord resolving up by half step
  const isSecLeadingTone = (current.quality === 'dim' || current.quality === 'dim7' || current.quality === 'hdim7') && interval === 1;

  if (isSecDomQuality && resolvesByFifth) {
    // Target must be a diatonic chord (not the tonic - that's just V)
    if (next.degree > 1 && next.degree <= 7) {
      // Verify the current chord is NOT diatonic (would be regular V, not V/x)
      const currentDegree = getScaleDegree(current.root, key, mode);
      const currentIsDiatonic = currentDegree > 0 && isDiatonicQuality(currentDegree, current.quality, mode);

      if (!currentIsDiatonic) {
        return { isSecondary: true, target: next.degree };
      }
    }
  }

  if (isSecLeadingTone) {
    if (next.degree > 1 && next.degree <= 7) {
      return { isSecondary: true, target: next.degree };
    }
  }

  return { isSecondary: false, target: 0 };
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

function classifyDrum(noteNumber: number): 'kick' | 'snare' | 'hihat' | null {
  // General MIDI drum map (note numbers on channel 10 / 0-indexed channel 9)
  if (noteNumber === 35 || noteNumber === 36) return 'kick';
  if (noteNumber === 38 || noteNumber === 40 || noteNumber === 37) return 'snare';
  if (noteNumber >= 41 && noteNumber <= 48) return 'kick';  // toms → kick (low percussive hit)
  if (noteNumber >= 42 && noteNumber <= 46) return 'hihat';
  if (noteNumber === 49 || noteNumber === 51 || noteNumber === 52 || noteNumber === 55 || noteNumber === 57 || noteNumber === 59) return 'hihat'; // cymbals/rides
  if (noteNumber === 39) return 'snare'; // hand clap
  if (noteNumber === 54 || noteNumber === 56) return 'hihat'; // tambourine, cowbell
  return null;
}

// --- Key detection via Krumhansl-Schmuckler ---

// Multiple key profiles from MIR research
// See research/music-analysis-improvements.md for sources
export type KeyProfile = 'krumhansl' | 'temperley' | 'shaath';

const KEY_PROFILES: Record<KeyProfile, { major: number[]; minor: number[] }> = {
  // Krumhansl (1990) - Cognitive experiments with listeners
  // Best for: General use, pop
  krumhansl: {
    major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
    minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
  },
  // Temperley (1999) - Corpus analysis, equalized major/minor weights
  // Best for: Classical, removes minor key bias
  temperley: {
    major: [5.0, 2.0, 3.5, 2.0, 4.5, 4.0, 2.0, 4.5, 2.0, 3.5, 1.5, 4.0],
    minor: [5.0, 2.0, 3.5, 4.5, 2.0, 4.0, 2.0, 4.5, 3.5, 2.0, 1.5, 4.0],
  },
  // Shaath (2011) - Retuned for popular/electronic music
  // Best for: Pop, rock, electronic
  shaath: {
    major: [6.6, 2.0, 3.5, 2.3, 4.6, 4.0, 2.5, 5.2, 2.4, 3.8, 2.3, 3.4],
    minor: [6.5, 2.8, 3.5, 5.4, 2.7, 3.5, 2.5, 5.1, 4.0, 2.7, 4.3, 3.2],
  },
};

// Default profile for backwards compatibility
const DEFAULT_KEY_PROFILE: KeyProfile = 'krumhansl';

interface KeyDetectionResult {
  key: number;
  mode: 'major' | 'minor';
  confidence: number;
  ambiguity: number;  // 0 = clear winner, 1 = very ambiguous
  secondBest: {
    key: number;
    mode: 'major' | 'minor';
    confidence: number;
  };
}

function detectKeyWithConfidence(
  pitchHistogram: number[],
  profile: KeyProfile = DEFAULT_KEY_PROFILE
): KeyDetectionResult {
  const profiles = KEY_PROFILES[profile];
  const scores: Array<{ key: number; mode: 'major' | 'minor'; corr: number }> = [];

  for (let shift = 0; shift < 12; shift++) {
    for (const mode of ['major', 'minor'] as const) {
      const profileData = profiles[mode];
      let sum = 0;
      let sumH = 0, sumP = 0;
      let sumH2 = 0, sumP2 = 0;
      for (let i = 0; i < 12; i++) {
        const h = pitchHistogram[(i + shift) % 12];
        const p = profileData[i];
        sumH += h; sumP += p;
        sumH2 += h * h; sumP2 += p * p;
        sum += h * p;
      }
      const meanH = sumH / 12, meanP = sumP / 12;
      const corr = (sum / 12 - meanH * meanP) /
        (Math.sqrt(sumH2 / 12 - meanH * meanH) * Math.sqrt(sumP2 / 12 - meanP * meanP) + 1e-10);
      // Small bias toward major keys (most songs are major, helps with ambiguous cases like C maj vs A min)
      const adjustedCorr = mode === 'major' ? corr + 0.02 : corr;
      scores.push({ key: shift, mode, corr: adjustedCorr });
    }
  }

  // Sort by correlation descending
  scores.sort((a, b) => b.corr - a.corr);
  const best = scores[0];
  const second = scores[1];

  // Compute ambiguity: how close is 2nd best to 1st?
  // relativeStrength approaches 0 when they're equal, high when 1st is clearly better
  const relativeStrength = (best.corr - second.corr) / (Math.abs(best.corr) + 0.001);
  const ambiguity = 1 - Math.min(1, relativeStrength * 2);

  // Normalize correlation to 0-1 (correlations are typically 0.3-0.9)
  const confidence = Math.max(0, Math.min(1, (best.corr + 1) / 2));
  const secondConfidence = Math.max(0, Math.min(1, (second.corr + 1) / 2));

  return {
    key: best.key,
    mode: best.mode,
    confidence,
    ambiguity,
    secondBest: {
      key: second.key,
      mode: second.mode,
      confidence: secondConfidence,
    },
  };
}

function detectKey(
  pitchHistogram: number[],
  profile: KeyProfile = DEFAULT_KEY_PROFILE
): { key: number; mode: 'major' | 'minor' } {
  const { key, mode } = detectKeyWithConfidence(pitchHistogram, profile);
  return { key, mode };
}

// --- Local key / modulation detection ---

/**
 * Detect key regions using windowed Krumhansl-Schmuckler with hysteresis.
 * Uses tempo-based windows (bars) for musically meaningful detection.
 * @param windowBars - How many bars of music to analyze at once (default 2)
 * @param hopBars - How often to sample (default 0.5 = twice per bar)
 * @param minStableWindows - How many consecutive windows must agree before switching key
 */
function detectKeyRegions(
  notes: NoteEvent[],
  totalDuration: number,
  barDuration: number,
  windowBars: number = 2,
  hopBars: number = 0.5,
  minStableWindows: number = 2,
  confidenceThreshold: number = 0.1,
  profile: KeyProfile = DEFAULT_KEY_PROFILE
): KeyRegion[] {
  const windowSeconds = barDuration * windowBars;
  const hopSeconds = barDuration * hopBars;

  if (notes.length === 0 || totalDuration < windowSeconds) {
    return [];
  }

  // Build histogram for each window
  interface WindowResult {
    time: number;
    key: number;
    mode: 'major' | 'minor';
    confidence: number;
    ambiguity: number;
  }

  const windowResults: WindowResult[] = [];

  for (let t = 0; t < totalDuration - windowSeconds / 2; t += hopSeconds) {
    const windowStart = t;
    const windowEnd = t + windowSeconds;

    // Build pitch histogram for this window
    const histogram = new Array(12).fill(0);
    for (const note of notes) {
      if (note.isDrum) continue;
      const noteEnd = note.time + note.duration;
      if (noteEnd > windowStart && note.time < windowEnd) {
        const overlapStart = Math.max(note.time, windowStart);
        const overlapEnd = Math.min(noteEnd, windowEnd);
        const weight = (overlapEnd - overlapStart) * note.velocity;
        histogram[note.midi % 12] += weight;
      }
    }

    const result = detectKeyWithConfidence(histogram, profile);
    windowResults.push({
      time: t + windowSeconds / 2, // center of window
      key: result.key,
      mode: result.mode,
      confidence: result.confidence,
      ambiguity: result.ambiguity,
    });
  }

  if (windowResults.length === 0) return [];

  // Apply hysteresis: require new key to appear consistently before switching
  const regions: KeyRegion[] = [];
  let currentKey = windowResults[0].key;
  let currentMode = windowResults[0].mode;
  let regionStart = 0;
  let candidateKey = currentKey;
  let candidateMode = currentMode;
  let candidateCount = 0;
  let candidateConfidenceSum = 0;

  const minStableCount = Math.max(1, minStableWindows);

  for (const w of windowResults) {
    const isSameKey = w.key === currentKey && w.mode === currentMode;
    const isSameCandidate = w.key === candidateKey && w.mode === candidateMode;

    if (isSameKey) {
      // Matches current key, reset candidate
      candidateCount = 0;
      candidateConfidenceSum = 0;
    } else if (isSameCandidate) {
      // Matches candidate, increment count
      candidateCount++;
      candidateConfidenceSum += w.confidence;

      // Check if candidate is stable enough to become new key
      const avgConfidence = candidateConfidenceSum / candidateCount;
      if (candidateCount >= minStableCount && avgConfidence > confidenceThreshold) {
        // Commit previous region
        if (regions.length > 0 || regionStart < w.time - hopSeconds) {
          const regionWindows = windowResults
            .filter(r => r.time >= regionStart && r.time < w.time - hopSeconds * candidateCount);
          const regionConfidence = regionWindows.length > 0
            ? regionWindows.reduce((a, b) => a + b.confidence, 0) / regionWindows.length
            : 0.5;
          const regionAmbiguity = regionWindows.length > 0
            ? regionWindows.reduce((a, b) => a + b.ambiguity, 0) / regionWindows.length
            : 0.5;

          regions.push({
            startTime: regionStart,
            endTime: w.time - hopSeconds * candidateCount,
            key: currentKey,
            mode: currentMode,
            confidence: regionConfidence,
            ambiguity: regionAmbiguity,
          });
        }

        // Start new region
        regionStart = w.time - hopSeconds * candidateCount;
        currentKey = candidateKey;
        currentMode = candidateMode;
        candidateCount = 0;
        candidateConfidenceSum = 0;
      }
    } else {
      // New candidate
      candidateKey = w.key;
      candidateMode = w.mode;
      candidateCount = 1;
      candidateConfidenceSum = w.confidence;
    }
  }

  // Close final region
  const finalWindows = windowResults.filter(r => r.time >= regionStart);
  const finalConfidence = finalWindows.length > 0
    ? finalWindows.reduce((a, b) => a + b.confidence, 0) / finalWindows.length
    : 0.5;
  const finalAmbiguity = finalWindows.length > 0
    ? finalWindows.reduce((a, b) => a + b.ambiguity, 0) / finalWindows.length
    : 0.5;

  regions.push({
    startTime: regionStart,
    endTime: totalDuration,
    key: currentKey,
    mode: currentMode,
    confidence: finalConfidence,
    ambiguity: finalAmbiguity,
  });

  // Filter out very short regions (less than 4 bars) - likely tonicizations, not true modulations
  // Merge short regions into surrounding regions
  const minRegionDuration = barDuration * 4;
  const filtered: KeyRegion[] = [];

  for (let i = 0; i < regions.length; i++) {
    const r = regions[i];
    const duration = r.endTime - r.startTime;

    if (duration >= minRegionDuration || filtered.length === 0) {
      // Keep this region (or it's the first one)
      filtered.push({ ...r });
    } else {
      // Region too short - extend previous region to cover it
      filtered[filtered.length - 1].endTime = r.endTime;
    }
  }

  return filtered;
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
  const tracks: TrackInfo[] = [];
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

    tracks.push({
      index: trackIdx,
      name: track.name ?? '',
      instrumentName: track.instrument?.name ?? '',
      instrumentFamily: track.instrument?.family ?? '',
      instrumentNumber: track.instrument?.number ?? 0,
      isDrum: trackIsDrum,
      midiChannel: track.channel ?? 0,
    });

    for (const note of track.notes) {
      const endTime = note.time + note.duration;
      if (endTime > totalDuration) totalDuration = endTime;

      const noteIsDrum = trackIsDrum;

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
      const chordIsChromatic = isChromatic(chord.root, chord.quality, key, keyMode);
      chords.push({
        time: chordTime,
        quality: chord.quality,
        root: chord.root,
        degree,
        tension: 0,           // computed in post-pass
        nextDegree: 0,        // computed in post-pass
        isSecondary: false,   // computed in post-pass
        secondaryTarget: 0,   // computed in post-pass
        isChromatic: chordIsChromatic,
      });
    }
  }

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
  for (let i = 0; i < chords.length; i++) {
    const c = chords[i];
    const nextChord = i + 1 < chords.length ? chords[i + 1] : null;

    // Detect secondary dominants (V/x, viio/x)
    const secDom = detectSecondaryDominant(
      { root: c.root, quality: c.quality },
      nextChord ? { root: nextChord.root, degree: nextChord.degree } : null,
      key,
      keyMode
    );
    c.isSecondary = secDom.isSecondary;
    c.secondaryTarget = secDom.target;

    // Compute tension components
    const hier = hierarchicalTension(c.degree);
    const diss = qualityDissonance[c.quality] ?? 0;
    const motion = rootMotionTension(prevRoot, c.root);
    const tendency = tendencyTension[c.degree] ?? 0;

    // Base tension from Lerdahl model
    let tension = hier * 0.40 + diss * 0.25 + motion * 0.20 + tendency * 0.15;

    // Secondary dominants add chromatic tension
    if (secDom.isSecondary) {
      tension += 0.15;
      // V/V is very common, slightly less surprising
      if (secDom.target === 5) tension -= 0.05;
    }

    c.tension = Math.min(1, tension);
    c.nextDegree = nextChord?.degree ?? 0;
    prevRoot = c.root;
  }

  // Detect local key regions (modulations)
  // More conservative settings to avoid detecting brief tonicizations as modulations
  // windowBars=4: analyze 4 bars of context
  // hopBars=1.0: sample once per bar
  // minStableWindows=3: require 3 consecutive windows to agree
  // confidenceThreshold=0.15: require higher confidence difference
  const keyRegions = detectKeyRegions(notes, totalDuration, barDuration, 4, 1.0, 3, 0.15);

  return {
    name: songName,
    tempo,
    timeSignature,
    tempoEvents,
    timeSignatureEvents,
    key,
    keyMode,
    keyRegions,
    duration: totalDuration,
    chords,
    drums,
    notes,
    tracks,
  };
}
