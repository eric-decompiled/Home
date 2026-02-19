import type { ChordEvent, DrumHit, NoteEvent } from './midi-analyzer.ts';
import type { MusicParams, ActiveVoice, UpcomingNote, UpcomingChord, RGB } from './effects/effect-interface.ts';
import { createMidiBeatSync, createIdleBeatSync, type BeatSync, type TempoEvent, type TimeSignatureEvent } from './beat-sync.ts';
import { palettes } from './fractal-engine.ts';
import { audioPlayer } from './audio-player.ts';
import { TWO_PI, KEY_ANGLES } from './effects/effect-utils.ts';

// --- Beat strength by meter position ---
// Returns 0-1 based on metrical hierarchy (1.0 = downbeat, lower = weaker beats)
function computeBeatStrength(beatIndex: number, beatsPerBar: number): number {
  if (beatIndex === 0) return 1.0; // Downbeat always strongest

  if (beatsPerBar === 4) {
    // 4/4: beat 1 = 1.0, beat 3 = 0.5, beats 2,4 = 0.25
    return beatIndex === 2 ? 0.5 : 0.25;
  } else if (beatsPerBar === 3) {
    // 3/4 waltz: beat 1 = 1.0, beats 2,3 = 0.25
    return 0.25;
  } else if (beatsPerBar === 6) {
    // 6/8: beats 1,4 = 1.0, others = 0.25
    return beatIndex === 3 ? 1.0 : 0.25;
  } else if (beatsPerBar === 2) {
    // 2/4: beat 1 = 1.0, beat 2 = 0.35
    return 0.35;
  }
  // Default: downbeat strong, others weak
  return 0.25;
}

// --- Julia set anchors by harmonic degree ---

interface CValue {
  real: number;
  imag: number;
  type: number;
  phoenix?: number;
  orbitRadius: number;   // base radius for orbit ellipse
  orbitSkew: number;     // aspect ratio: 1=circle, <1=wide, >1=tall
  orbitRotation: number; // ellipse rotation in radians
  beatSpread: number;    // angle between beat points in radians (π/2 = 90°)
}

// type: 0=Julia z²+c, 1=Cubic z³+c, 2=Quartic z⁴+c, 3=BurningShip,
//       4=Tricorn, 5=Phoenix, 6=Celtic, 7=Lambda, 8=PerpBurn, 9=Buffalo

const DEFAULT_ORBIT_RADIUS = 0.08;
const DEFAULT_ORBIT_SKEW = 1.0;     // circle
const DEFAULT_ORBIT_ROTATION = 0;   // no rotation
const DEFAULT_BEAT_SPREAD = Math.PI / 2;  // 90° between beat points

const defaultAnchors: Record<number, CValue> = {
  0: { real: 0.2800, imag: 0.5300, type: 0, orbitRadius: 0.0500, orbitSkew: 1.00, orbitRotation: 0.00, beatSpread: 1.57 },
  1: { real: -0.8649, imag: 0.2083, type: 6, orbitRadius: 0.3199, orbitSkew: 1.50, orbitRotation: 1.83, beatSpread: 0.16 },
  2: { real: -0.8149, imag: 0.3799, type: 0, orbitRadius: 0.1094, orbitSkew: 1.00, orbitRotation: 4.00, beatSpread: 0.69 },
  3: { real: -0.6572, imag: 0.7617, type: 8, orbitRadius: 0.2480, orbitSkew: 1.00, orbitRotation: -0.09, beatSpread: 0.46 },
  4: { real: -0.6267, imag: -0.8198, type: 9, orbitRadius: 0.2671, orbitSkew: 0.62, orbitRotation: -1.43, beatSpread: 0.24 },
  5: { real: 0.6866, imag: -0.5589, type: 9, orbitRadius: 0.4612, orbitSkew: 0.59, orbitRotation: -1.93, beatSpread: 0.31 },
  6: { real: 0.4743, imag: -0.2137, type: 5, orbitRadius: 0.1000, orbitSkew: 2.00, orbitRotation: -1.02, beatSpread: 0.15 },
  7: { real: -0.8474, imag: -0.4560, type: 0, orbitRadius: 0.1794, orbitSkew: 1.00, orbitRotation: 0.49, beatSpread: 0.57 },
};

const STORAGE_KEY = 'fractal-anchors';

let anchors: Record<number, CValue> = { ...defaultAnchors };

function loadAnchorsFromStorage(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, any>;
    if (!parsed['0'] || !parsed['1']) return;

    const loaded: Record<number, CValue> = {};
    for (let d = 0; d <= 7; d++) {
      const p = parsed[d];
      if (!p || typeof p.real !== 'number') continue;

      // Get orbitRadius: direct value, or compute from legacy orbits array
      let orbitRadius = DEFAULT_ORBIT_RADIUS;
      if (typeof p.orbitRadius === 'number') {
        orbitRadius = p.orbitRadius;
      } else if (Array.isArray(p.orbits) && p.orbits.length > 0) {
        // Convert legacy 4-point orbits to average radius
        let sum = 0;
        for (const o of p.orbits) {
          sum += Math.sqrt((o.dr || 0) ** 2 + (o.di || 0) ** 2);
        }
        orbitRadius = sum / p.orbits.length;
      }

      loaded[d] = {
        real: p.real,
        imag: p.imag,
        type: p.type ?? 0,
        phoenix: p.phoenix,
        orbitRadius,
        orbitSkew: typeof p.orbitSkew === 'number' ? p.orbitSkew : DEFAULT_ORBIT_SKEW,
        orbitRotation: typeof p.orbitRotation === 'number' ? p.orbitRotation : DEFAULT_ORBIT_ROTATION,
        beatSpread: typeof p.beatSpread === 'number' ? p.beatSpread : DEFAULT_BEAT_SPREAD,
      };
    }
    if (Object.keys(loaded).length >= 2) {
      anchors = loaded;
    }
  } catch { /* ignore malformed data */ }
}

loadAnchorsFromStorage();

// Live-reload when config.html saves in another tab
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) loadAnchorsFromStorage();
});

// Root pitch class applies a tiny rotation around the degree anchor
function centerForChord(degree: number, root: number): CValue {
  const anchor = anchors[degree] ?? anchors[0];
  const angle = KEY_ANGLES[root];
  // Very small radius — these c-values are precisely tuned for visual weight
  const radius = 0.005;
  return {
    real: anchor.real + radius * Math.cos(angle),
    imag: anchor.imag + radius * Math.sin(angle),
    type: anchor.type,
    phoenix: anchor.phoenix,
    orbitRadius: anchor.orbitRadius ?? DEFAULT_ORBIT_RADIUS,
    orbitSkew: anchor.orbitSkew ?? DEFAULT_ORBIT_SKEW,
    orbitRotation: anchor.orbitRotation ?? DEFAULT_ORBIT_ROTATION,
    beatSpread: anchor.beatSpread ?? DEFAULT_BEAT_SPREAD,
  };
}

function getDefaultAnchor(): CValue {
  return anchors[1];
}

// --- Fractal parameter state ---

export interface FractalParams {
  cReal: number;
  cImag: number;
  fractalType: number;
  phoenixP: number;
  paletteIndex: number;
  baseIter: number;
  rotation: number;         // radians
  melodyPitchClass: number; // -1 if none
  melodyVelocity: number;   // 0-1
  bassPitchClass: number;   // -1 if none
  bassVelocity: number;     // 0-1
}

// Interpolation state
let currentCenter: CValue = { ...getDefaultAnchor() };
let targetCenter: CValue = { ...getDefaultAnchor() };

let currentTension = 0;
let targetTension = 0;
// Harmonic tension release tracking (for chromatic tension-driven effects)
let tensionSmooth = 0;           // Slow-following average for comparison
let tensionRelease = 0;          // 0-1 release intensity (peaks on drop, decays)
let tensionReleaseArmed = true;  // Debounce flag
let frameHarmonicRelease = false; // True on frame when release triggers
// Rhythmic tension tracking (syncopation + anticipation → white rings)
let rhythmicTension = 0;         // Current rhythmic tension
let rhythmicTensionSmooth = 0;   // Slow-following average
let rhythmicRelease = 0;         // Release intensity (peaks on strong beats)
let frameRhythmicRelease = false; // True on frame when release triggers
let currentPalette = 4;
let currentFractalType = getDefaultAnchor().type;
let currentPhoenixP = -0.5;

// --- Physics-based orbit state ---
// Beat-driven elliptical motion around the anchor point
let currentBeatAngle = 0;     // Current beat angle (snaps, smoothed by beat pulse)
let orbitRadiusOffset = 0;    // Deviation from base radius
let orbitRadiusVel = 0;       // Radial velocity (for spring physics)
let currentOrbitRadius = 0.12; // Base orbit radius (from anchor)
let targetOrbitRadius = 0.12;  // Target radius (snaps on chord change)
let currentOrbitSkew = 1.0;    // Aspect ratio (1=circle, <1=wide, >1=tall)
let targetOrbitSkew = 1.0;
let currentOrbitRotation = 0;  // Ellipse rotation angle
let targetOrbitRotation = 0;
let currentBeatSpread = Math.PI / 2;  // Angle between beat points
let targetBeatSpread = Math.PI / 2;

// Beat-driven rotation
let rotationAngle = 0;
let rotationVelocity = 0;
let rotationFriction = 1.2;

// Beat tracking via BeatSync abstraction
let beatSync: BeatSync = createIdleBeatSync();
let beatDuration = 0.5;
let beatsPerBar = 4;

// Drum processing
let lastDrumIndex = -1;

// Exponential snap — fast, direct transition to new chord target
const snapRate = 8.0;  // ~0.12s to 90% — responsive chord changes

let smoothingRate = 6.0;
let lastChordIndex = -1;

// --- Music params state (for generic effect consumption) ---
let currentBeatPosition = 0;
let currentBarPosition = 0;
let currentBeatIndex = 0;
let prevFrameBeatPhase = 0; // Track beat phase from previous frame for eighth-note detection
let currentChordRoot = 0;
let currentChordDegree = 1;
let currentChordQuality = 'major';
let frameDrumEnergy = 0;
let frameOnBeat = false;
let frameOnBar = false;
let currentBeatStability = 1.0;
let currentNextBeatIn = 0;
let currentNextBarIn = 0;
// Groove curves (from neuroscience research)
let currentBeatAnticipation = 0;
let currentBarAnticipation = 0;
let currentBeatArrival = 0;
let currentBarArrival = 0;
let currentBeatGroove = 0;
let currentBarGroove = 0;
let frameMelodyOnset = false;
let lastMelodyPC = -1;
let lastMelodyMidi = -1;  // for interval calculation
let currentMelodyPC = -1;
let currentMelodyMidi = -1;
let currentMelodyVel = 0;
let melodicTensionAccum = 0;  // real-time melodic tension accumulator
let currentBassPC = -1;
let currentBassMidi = -1;
let currentBassVel = 0;
let currentKey = 0;
let currentKeyMode: 'major' | 'minor' = 'major';
let currentUseFlats = false;
let currentBpm = 120;
let hasPlayedOnce = false;  // Track if playback has ever started (for BPM display)

// Cached tension color endpoints (precomputed when key changes)
let cachedKeyIColor: RGB = [120, 120, 120];  // Tonic color
let cachedKeyVColor: RGB = [120, 120, 120];  // Dominant color

// Tension color LUT: 256 entries for O(1) lookup (no per-frame interpolation)
const TENSION_LUT_SIZE = 256;
let tensionColorLUT: RGB[] = new Array(TENSION_LUT_SIZE).fill(null).map(() => [120, 120, 120] as RGB);

// Key rotation (static per-song, set in setKey)
let keyRotationTarget = 0;       // target rotation in radians
const keyRotationState = { value: 0 }; // animated by GSAP

// Multi-voice tracking
let currentActiveVoices: ActiveVoice[] = [];
let lastActiveKeys = new Set<string>(); // "channel:midi" for onset detection

// Lookahead window for piano roll
let noteLookaheadSeconds = 4.0;

// Allow external control of lookahead (for piano roll speed setting)
export function setNoteLookahead(seconds: number): void {
  noteLookaheadSeconds = seconds;
}

// All chords for theory bar lookahead
let allChords: ChordEvent[] = [];

// Simplified per-bar chords (one chord per bar, first chord wins)
let simplifiedBarChords: ChordEvent[] = [];
let totalBars = 0;
let songBarDuration = 2.0; // cached bar duration for the song

// Pre-built indexes (created at song load, not per-frame)
// All notes pre-converted to UpcomingNote format (timeUntil updated at runtime)
let prebuiltNotes: UpcomingNote[] = [];
// Current chord index - incremented as time advances, avoids binary search
let currentChordIdx = -1;
// Reusable result arrays to avoid per-frame allocations
const upcomingNotesResult: UpcomingNote[] = [];
const upcomingChordsResult: UpcomingChord[] = [
  { time: -1, root: -1, quality: '', degree: 0, numeral: '', timeUntil: 0 },
  { time: -1, root: -1, quality: '', degree: 0, numeral: '', timeUntil: 0 },
  { time: -1, root: -1, quality: '', degree: 0, numeral: '', timeUntil: 0 },
  { time: -1, root: -1, quality: '', degree: 0, numeral: '', timeUntil: 0 },
];
const barChordsResult: UpcomingChord[] = [
  { time: -1, root: -1, quality: '', degree: 0, numeral: '', timeUntil: 0 },
  { time: -1, root: -1, quality: '', degree: 0, numeral: '', timeUntil: 0 },
  { time: -1, root: -1, quality: '', degree: 0, numeral: '', timeUntil: 0 },
  { time: -1, root: -1, quality: '', degree: 0, numeral: '', timeUntil: 0 },
];
let lastBarChordsBar = -1;
let lastUpcomingChordsBar = -1;

// Reusable MusicParams object - updated in place each frame (no allocation)
const reusableMusicParams: MusicParams = {
  currentTime: 0,
  dt: 0,
  bpm: 0,
  beatDuration: 0.5,
  beatsPerBar: 4,
  barDuration: 2.0,
  beatPosition: 0,
  barPosition: 0,
  beatIndex: 0,
  beatStrength: 1.0,
  onBeat: false,
  onBar: false,
  beatStability: 1.0,
  nextBeatIn: 0.5,
  nextBarIn: 2.0,
  beatAnticipation: 0,
  barAnticipation: 0,
  beatArrival: 0,
  barArrival: 0,
  beatGroove: 0.5,
  barGroove: 0.5,
  chordRoot: 0,
  chordDegree: 1,
  chordQuality: 'major',
  tension: 0,
  harmonicTensionSmooth: 0,
  harmonicTensionRelease: 0,
  onHarmonicRelease: false,
  rhythmicTension: 0,
  rhythmicTensionSmooth: 0,
  rhythmicRelease: 0,
  onRhythmicRelease: false,
  key: 0,
  keyMode: 'major',
  useFlats: false,
  keyRotation: 0,
  melodyPitchClass: -1,
  melodyMidiNote: -1,
  melodyVelocity: 0,
  melodyOnset: false,
  bassPitchClass: -1,
  bassMidiNote: -1,
  bassVelocity: 0,
  drumEnergy: 0,
  loudness: 0,
  paletteIndex: 0,
  activeVoices: [],
  upcomingNotes: [],
  upcomingChords: [],
  barChords: [],
  tensionColor: [120, 120, 120],
};

// Precompute I/V colors and full tension LUT when key changes
// This moves ALL color interpolation to song load time
function updateCachedKeyColors(keyPitchClass: number): void {
  cachedKeyIColor = palettes[keyPitchClass]?.stops[3]?.color ?? [120, 120, 120];
  const vPitchClass = (keyPitchClass + 7) % 12;
  cachedKeyVColor = palettes[vPitchClass]?.stops[3]?.color ?? [120, 120, 120];

  // Build LUT: 256 precomputed colors from I (tension=0) to V (tension=1)
  for (let i = 0; i < TENSION_LUT_SIZE; i++) {
    const t = i / (TENSION_LUT_SIZE - 1);
    tensionColorLUT[i] = [
      Math.round(cachedKeyIColor[0] + (cachedKeyVColor[0] - cachedKeyIColor[0]) * t),
      Math.round(cachedKeyIColor[1] + (cachedKeyVColor[1] - cachedKeyIColor[1]) * t),
      Math.round(cachedKeyIColor[2] + (cachedKeyVColor[2] - cachedKeyIColor[2]) * t),
    ];
  }
}

// Get tension color from LUT (O(1) lookup, no interpolation)
function computeTensionColor(tension: number): RGB {
  const idx = Math.min(TENSION_LUT_SIZE - 1, Math.max(0, Math.floor(tension * (TENSION_LUT_SIZE - 1))));
  return tensionColorLUT[idx];
}

// Binary search: find index of last element with time <= target
function binarySearchTime<T extends { time: number }>(arr: T[], target: number): number {
  let lo = 0, hi = arr.length - 1, result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid].time <= target) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

// Binary search: find index of first element with time >= target
function binarySearchFirstGE<T extends { time: number }>(arr: T[], target: number): number {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid].time < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

// Build simplified bar chords - one chord per bar, first chord in bar wins
// Precomputed at song load for O(1) bar chord lookup during playback
function buildSimplifiedBarChords(duration: number): void {
  if (songBarDuration <= 0 || allChords.length === 0) {
    simplifiedBarChords = [];
    totalBars = 0;
    return;
  }

  totalBars = Math.ceil(duration / songBarDuration);
  simplifiedBarChords = [];

  for (let bar = 0; bar < totalBars; bar++) {
    const barStart = bar * songBarDuration;
    const barEnd = barStart + songBarDuration;

    // Binary search: find first chord that starts >= barStart
    const firstInBar = binarySearchFirstGE(allChords, barStart);
    let barChord: ChordEvent | null = null;

    // Check if this chord is within the bar
    if (firstInBar < allChords.length && allChords[firstInBar].time < barEnd) {
      barChord = allChords[firstInBar];
    } else {
      // No chord starts in this bar, find the active chord at bar start
      const activeIdx = binarySearchTime(allChords, barStart);
      if (activeIdx >= 0) {
        barChord = allChords[activeIdx];
      }
    }

    if (barChord) {
      // Create a copy with the bar start time
      simplifiedBarChords.push({
        ...barChord,
        time: barStart,
      });
    }
  }
}

// Get simplified bar chords for Theory Bar display
// Uses pre-allocated result array, updates in place when bar changes
function computeBarChords(currentTime: number): UpcomingChord[] {
  if (simplifiedBarChords.length === 0 || songBarDuration <= 0) return barChordsResult;

  const currentBar = Math.floor(currentTime / songBarDuration);

  // Only rebuild when bar changes; otherwise just update timeUntil
  if (currentBar !== lastBarChordsBar) {
    lastBarChordsBar = currentBar;
    for (let i = 0; i < 4; i++) {
      const bar = currentBar + (i - 1);  // -1, 0, 1, 2
      const barTime = bar * songBarDuration;
      const result = barChordsResult[i];

      if (bar < 0 || bar >= simplifiedBarChords.length) {
        result.time = -1;
        result.root = -1;
        result.quality = '';
        result.degree = 0;
        result.numeral = '';
      } else {
        const chord = simplifiedBarChords[bar];
        result.time = barTime;
        result.root = chord.root;
        result.quality = chord.quality;
        result.degree = chord.degree;
        result.numeral = chord.numeral;
      }
    }
  }

  // Always update timeUntil (cheap)
  for (const chord of barChordsResult) {
    if (chord.time >= 0) {
      chord.timeUntil = chord.time - currentTime;
    }
  }

  return barChordsResult;
}

// Get upcoming chords by bar for theory display
// Uses pre-allocated result array, updates in place when bar changes
function computeUpcomingChords(currentTime: number): UpcomingChord[] {
  if (allChords.length === 0) return upcomingChordsResult;

  const barDuration = beatDuration * beatsPerBar;
  if (barDuration <= 0) return upcomingChordsResult;

  const currentBar = Math.floor(currentTime / barDuration);

  // Only rebuild when bar changes
  if (currentBar !== lastUpcomingChordsBar) {
    lastUpcomingChordsBar = currentBar;
    for (let i = 0; i < 4; i++) {
      const barTime = (currentBar + (i - 1)) * barDuration;  // -1, 0, 1, 2
      const result = upcomingChordsResult[i];

      if (barTime < 0) {
        result.time = -1;
        result.root = -1;
        result.quality = '';
        result.degree = 0;
        result.numeral = '';
      } else {
        const idx = binarySearchTime(allChords, barTime);
        if (idx < 0) {
          result.time = -1;
          result.root = -1;
          result.quality = '';
          result.degree = 0;
          result.numeral = '';
        } else {
          const chord = allChords[idx];
          result.time = barTime;
          result.root = chord.root;
          result.quality = chord.quality;
          result.degree = chord.degree;
          result.numeral = chord.numeral;
        }
      }
    }
  }

  // Always update timeUntil
  for (const chord of upcomingChordsResult) {
    if (chord.time >= 0) {
      chord.timeUntil = chord.time - currentTime;
    }
  }

  return upcomingChordsResult;
}

function computeUpcomingNotes(currentTime: number): UpcomingNote[] {
  // Use pre-built notes array (no object creation per frame)
  // Binary search for window bounds, update timeUntil in place
  const windowStart = currentTime - 0.1;
  const windowEnd = currentTime + noteLookaheadSeconds;

  // Binary search for first note that could be in window
  // (note ends after windowStart, so note.time > windowStart - maxDuration)
  const searchStart = Math.max(0, binarySearchFirstGE(prebuiltNotes, windowStart - 10));

  // Fill reusable result array (no allocation)
  upcomingNotesResult.length = 0;
  for (let i = searchStart; i < prebuiltNotes.length; i++) {
    const note = prebuiltNotes[i];
    if (note.time >= windowEnd) break;  // past window
    const noteEnd = note.time + note.duration;
    if (noteEnd > windowStart) {
      note.timeUntil = note.time - currentTime;  // update in place
      upcomingNotesResult.push(note);
    }
  }

  return upcomingNotesResult;
}

export const musicMapper = {
  setTempo(
    bpm: number,
    timeSig?: [number, number],
    tempoEvents?: TempoEvent[],
    timeSigEvents?: TimeSignatureEvent[]
  ) {
    // Create BeatSync with all tempo/time sig events
    if (tempoEvents && timeSigEvents) {
      beatSync = createMidiBeatSync(tempoEvents, timeSigEvents);
    } else {
      beatSync = createMidiBeatSync(
        [{ time: 0, bpm }],
        [{ time: 0, numerator: timeSig ? timeSig[0] : 4, denominator: timeSig ? timeSig[1] : 4 }]
      );
    }

    // Initial values (will be updated dynamically by BeatSync)
    beatDuration = 60 / bpm;
    beatsPerBar = timeSig ? timeSig[0] : 4;
    smoothingRate = 4.0 + (bpm / 120) * 2.0;
    currentBpm = bpm;
    // Faster tempo → more friction so rotation doesn't accumulate
    rotationFriction = 1.2 + Math.max(0, (bpm - 100) / 60) * 1.5;
  },

  setKey(pitchClass: number, mode: 'major' | 'minor', useFlats: boolean = false) {
    currentKey = pitchClass;
    currentKeyMode = mode;
    currentUseFlats = useFlats;
    // Initialize chord root to tonic until actual chords play
    currentChordRoot = pitchClass;
    currentChordDegree = 1;
    currentChordQuality = mode === 'minor' ? 'minor' : 'major';
    // Initialize rotation to align this key at 12 o'clock
    keyRotationTarget = -pitchClass * (TWO_PI / 12);
    keyRotationState.value = keyRotationTarget;
    // Precompute tension color endpoints for this key
    updateCachedKeyColors(pitchClass);
  },


  setSongDuration(duration: number, chords: ChordEvent[], notes?: NoteEvent[]) {
    // Store chords and cache bar duration, then build simplified bar chords
    allChords = chords;
    songBarDuration = beatDuration * beatsPerBar;
    buildSimplifiedBarChords(duration);

    // Pre-build notes index if provided (avoids per-frame object creation)
    if (notes) {
      prebuiltNotes = [];
      for (const note of notes) {
        if (note.isDrum) continue;  // skip drum notes
        prebuiltNotes.push({
          midi: note.midi,
          pitchClass: note.midi % 12,
          velocity: note.velocity,
          time: note.time,
          duration: note.duration,
          timeUntil: 0,  // updated at runtime
          track: note.channel,
        });
      }
    }

    // Reset indexes
    currentChordIdx = -1;
    lastBarChordsBar = -1;
    lastUpcomingChordsBar = -1;
  },

  getIdleAnchor(): CValue {
    return getDefaultAnchor();
  },

  update(
    dt: number,
    currentTime: number,
    chords: ChordEvent[],
    drums: DrumHit[],
    notes: NoteEvent[]
  ): FractalParams {
    // Store chords for lookahead (notes are pre-built in setSongDuration)
    allChords = chords;

    // --- Find current chord (incremental index advancement) ---
    // O(1) for normal playback; binary search only on seek/reset
    if (currentChordIdx < 0 || (currentChordIdx > 0 && chords[currentChordIdx].time > currentTime)) {
      // Time jumped backward or first frame - binary search to find position
      currentChordIdx = binarySearchTime(chords, currentTime);
    } else {
      // Advance index while next chord has started
      while (currentChordIdx + 1 < chords.length && chords[currentChordIdx + 1].time <= currentTime) {
        currentChordIdx++;
      }
    }

    if (currentChordIdx >= 0 && currentChordIdx !== lastChordIndex) {
      lastChordIndex = currentChordIdx;
      const chord = chords[currentChordIdx];

      const center = centerForChord(chord.degree, chord.root);
      // Direct assignment - centerForChord already returns a new object
      targetCenter = center;
      targetTension = chord.tension;
      currentPalette = chord.root;
      currentFractalType = center.type;
      currentPhoenixP = center.phoenix ?? -0.5;
      currentChordRoot = chord.root;
      currentChordDegree = chord.degree;
      currentChordQuality = chord.quality;

      // Update target orbit params
      targetOrbitRadius = center.orbitRadius;
      targetOrbitSkew = center.orbitSkew;
      targetOrbitRotation = center.orbitRotation;
      targetBeatSpread = center.beatSpread;
    }

    // --- Exponential snap toward target ---
    const snapDecay = 1 - Math.exp(-snapRate * dt);
    currentCenter.real += (targetCenter.real - currentCenter.real) * snapDecay;
    currentCenter.imag += (targetCenter.imag - currentCenter.imag) * snapDecay;

    // Snap orbit params
    currentOrbitRadius += (targetOrbitRadius - currentOrbitRadius) * snapDecay;
    currentOrbitSkew += (targetOrbitSkew - currentOrbitSkew) * snapDecay;
    currentOrbitRotation += (targetOrbitRotation - currentOrbitRotation) * snapDecay;
    currentBeatSpread += (targetBeatSpread - currentBeatSpread) * snapDecay;

    // Tension smoothing with melodic modulation
    // Combine harmonic tension (from chord analysis) with real-time melodic tension
    const effectiveTension = Math.min(1, targetTension + melodicTensionAccum * 0.3);
    const decay = 1 - Math.exp(-smoothingRate * dt);
    currentTension += (effectiveTension - currentTension) * decay;

    // === TENSION RELEASE DETECTION ===
    // Track slow-moving average to detect when current tension drops below it
    const tensionAvgRate = 2.0;  // ~0.5 second window
    tensionSmooth += (currentTension - tensionSmooth) * tensionAvgRate * dt;

    // Deviation: how much current tension is below the recent average
    const tensionDeviation = tensionSmooth - currentTension;

    // Trigger release when tension drops noticeably below average
    frameHarmonicRelease = false;
    if (tensionDeviation > 0.06 && tensionReleaseArmed && tensionSmooth > 0.15) {
      // Fire release with intensity based on how much tension was built up
      tensionRelease = Math.min(1, tensionSmooth + tensionDeviation);
      tensionReleaseArmed = false;
      frameHarmonicRelease = true;
    }

    // Decay release intensity
    tensionRelease *= Math.exp(-4 * dt);

    // Re-arm when tension stabilizes or rises
    if (tensionDeviation < 0.02) {
      tensionReleaseArmed = true;
    }

    // --- Get beat state from BeatSync (ONCE per frame to avoid state corruption) ---
    const beat = beatSync.update(currentTime, dt);

    // Update module state from BeatSync (dynamic tempo support)
    beatDuration = beat.beatDuration;
    beatsPerBar = beat.beatsPerBar;
    currentBpm = beat.bpm;
    hasPlayedOnce = true;  // Mark that playback has started

    // Track beat/bar positions for MusicParams
    currentBeatPosition = beat.beatPhase;
    currentBarPosition = beat.barPhase;
    currentBeatIndex = beat.beatIndex;

    // Beat events for effects
    frameOnBeat = beat.onBeat;
    frameOnBar = beat.onBar;
    currentBeatStability = beat.stability;
    currentNextBeatIn = beat.nextBeatIn;
    currentNextBarIn = beat.nextBarIn;
    // Groove curves
    currentBeatAnticipation = beat.beatAnticipation;
    currentBarAnticipation = beat.barAnticipation;
    currentBeatArrival = beat.beatArrival;
    currentBarArrival = beat.barArrival;
    currentBeatGroove = beat.beatGroove;
    currentBarGroove = beat.barGroove;

    // === RHYTHMIC TENSION (syncopation + anticipation → white rings) ===
    // Build tension from: beat anticipation + off-beat activity
    // Release on strong beats (1 and 3)

    // Anticipation component: builds as we approach beats
    const anticipationComponent = beat.beatAnticipation * 0.6;

    // Syncopation component: note activity on weak beat positions (off the grid)
    // Off-beat = beatPhase between 0.3-0.7 (not near beat boundaries)
    const isOffBeat = beat.beatPhase > 0.2 && beat.beatPhase < 0.8;
    const offBeatActivity = (frameMelodyOnset && isOffBeat) ? 0.5 : 0;

    // Combine into rhythmic tension
    const targetRhythmicTension = Math.min(1, anticipationComponent + offBeatActivity);
    rhythmicTension += (targetRhythmicTension - rhythmicTension) * 8 * dt;

    // Smooth average for comparison
    rhythmicTensionSmooth += (rhythmicTension - rhythmicTensionSmooth) * 3 * dt;

    // Release on strong beats (beat 1 or 3) when there's tension built up
    frameRhythmicRelease = false;
    const isStrongBeat = beat.onBeat && (beat.beatIndex === 0 || beat.beatIndex === 2);
    if (isStrongBeat && rhythmicTensionSmooth > 0.15) {
      rhythmicRelease = Math.min(1, rhythmicTensionSmooth + 0.3);
      frameRhythmicRelease = true;
    }

    // Decay release
    rhythmicRelease *= Math.exp(-5 * dt);

    // --- Process drum hits → rotation and energy ---
    frameDrumEnergy = 0;
    const noteLookback = 0.05;
    for (let i = lastDrumIndex + 1; i < drums.length; i++) {
      const d = drums[i];
      if (d.time > currentTime) break;
      if (d.time < currentTime - noteLookback) { lastDrumIndex = i; continue; }

      lastDrumIndex = i;
      frameDrumEnergy = Math.min(1, frameDrumEnergy + d.energy);

      // Compute beat strength at drum hit time for rotation direction
      const beatInBar = Math.floor((d.time % (beatDuration * beatsPerBar)) / beatDuration);
      const hitBeatStrength = computeBeatStrength(beatInBar, beatsPerBar);

      // Rotation: strong beats push forward, weak beats pull back
      rotationVelocity += (hitBeatStrength * 2 - 1) * d.energy * 0.6;
    }

    // --- Beat-grid rotation impulses ---
    if (beat.onBeat) {
      // Beats 0,2 → CCW (+), beats 1,3 → CW (-)
      const cw = (beat.beatIndex % 2 === 0) ? 1 : -1;
      const strength = (beat.beatIndex === 1) ? 1.0 : 0.7;
      rotationVelocity += cw * 0.7 * strength;
    }

    // Eighth-note subdivision impulses (at 0.5 beat phase)
    // Use tracked previous beat phase instead of re-calling beatSync.update()
    if (prevFrameBeatPhase < 0.5 && beat.beatPhase >= 0.5 && dt > 0) {
      const cw8 = (beat.beatIndex % 2 === 0) ? 1 : -1;
      rotationVelocity += cw8 * 0.20;
    }
    prevFrameBeatPhase = beat.beatPhase;

    // --- Rotation friction + integration ---
    const safeDt = Math.min(dt, 0.1);  // prevent explosion on tab switch
    rotationVelocity *= Math.exp(-rotationFriction * safeDt);
    rotationAngle += rotationVelocity * safeDt;

    // Groove curves for timing
    const beatArrival = beat.beatArrival ?? 0;
    const barArrival = beat.barArrival ?? 0;
    const beatAnticipation = beat.beatAnticipation ?? 0;

    // --- Beat-driven angle ---
    const currentBeatIdx = beat.beatIndex % 4;
    // Snap angle directly to current beat point (no interpolation needed)
    // The beat pulse factor handles smooth transitions
    currentBeatAngle = currentBeatIdx * currentBeatSpread;

    // Beat pulse: smooth 0→1→0 within each beat (like preview)
    // This makes the orbit retract to center at beat boundaries
    const beatPulse = Math.sin(Math.PI * beat.beatPhase);

    // --- Radial physics: spring toward base radius ---
    // Beat/bar arrival kicks outward, anticipation pulls inward
    const emphasis = (beat.beatIndex % 2 === 0) ? 1.0 : 0.7; // 2-feel: 1,3 stronger
    const beatKick = beatArrival * currentTension * 0.15 * emphasis;
    const barKick = barArrival * currentTension * 0.25; // Bigger on beat 1
    const anticipationPull = -beatAnticipation * currentTension * 0.08;

    orbitRadiusVel += beatKick + barKick + anticipationPull;

    // Spring physics: pull back toward base radius
    const radiusK = 8.0;
    const radiusDamping = 2.5;
    orbitRadiusVel += (-radiusK * orbitRadiusOffset - radiusDamping * orbitRadiusVel) * safeDt;
    orbitRadiusOffset += orbitRadiusVel * safeDt;

    // Compute final orbit position
    const baseRadius = currentOrbitRadius + orbitRadiusOffset;
    // Skew acts as backbeat emphasis: beats 1 and 3 (the "clap" beats) get scaled
    const isBackbeat = (currentBeatIdx === 1 || currentBeatIdx === 3);
    const effectiveRadius = isBackbeat ? baseRadius * currentOrbitSkew : baseRadius;
    // Apply beat pulse to create smooth motion (retract at beat boundaries)
    const px = effectiveRadius * Math.cos(currentBeatAngle) * beatPulse;
    const py = effectiveRadius * Math.sin(currentBeatAngle) * beatPulse;
    // Rotate ellipse by orbitRotation
    const cosR = Math.cos(currentOrbitRotation);
    const sinR = Math.sin(currentOrbitRotation);
    const offsetReal = px * cosR - py * sinR;
    const offsetImag = px * sinR + py * cosR;

    // Iterations: tension only
    const iterBase = Math.round(120 + currentTension * 60);

    // --- Single pass: find melody/bass AND build active voices ---
    // Merged iteration for performance (was two separate loops)
    let highestMidi = -1, highestVel = 0;
    let lowestMidi = 999, lowestVel = 0;
    const newActiveKeys = new Set<string>();
    const voices: ActiveVoice[] = [];

    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      if (n.time > currentTime) continue;
      if (n.time < currentTime - 2.0) break;
      if (n.isDrum) continue;
      if (n.time + n.duration >= currentTime) {
        // Melody/bass detection
        if (n.midi > highestMidi) { highestMidi = n.midi; highestVel = n.velocity; }
        if (n.midi < lowestMidi) { lowestMidi = n.midi; lowestVel = n.velocity; }
        // Active voice tracking
        const key = `${n.channel}:${n.midi}`;
        newActiveKeys.add(key);
        voices.push({
          midi: n.midi,
          pitchClass: n.midi % 12,
          velocity: n.velocity,
          track: n.channel,
          onset: !lastActiveKeys.has(key),
        });
      }
    }
    lastActiveKeys = newActiveKeys;
    currentActiveVoices = voices;

    // Track melody onset
    const melPC = highestMidi >= 0 ? highestMidi % 12 : -1;
    frameMelodyOnset = melPC >= 0 && melPC !== lastMelodyPC;

    // --- Real-time melodic tension (Lerdahl: melodic attraction component) ---
    if (frameMelodyOnset && highestMidi >= 0 && lastMelodyMidi >= 0) {
      const interval = Math.abs(highestMidi - lastMelodyMidi);
      // Large intervals add tension (leaps are more tense than steps)
      // Steps (1-2 semitones): low tension
      // 3rds (3-4): moderate
      // 5th+ (7+): high tension, dramatic leap
      const intervalTension = interval <= 2 ? 0 : interval <= 4 ? 0.1 : interval <= 7 ? 0.2 : 0.35;
      melodicTensionAccum += intervalTension * highestVel;
    }
    // Decay melodic tension accumulator
    melodicTensionAccum *= Math.exp(-2.0 * dt);

    lastMelodyPC = melPC;
    lastMelodyMidi = highestMidi;
    currentMelodyPC = melPC;
    currentMelodyMidi = highestMidi;
    currentMelodyVel = highestVel;
    currentBassPC = lowestMidi < 999 ? lowestMidi % 12 : -1;
    currentBassMidi = lowestMidi < 999 ? lowestMidi : -1;
    currentBassVel = lowestVel;

    return {
      cReal: currentCenter.real + offsetReal,
      cImag: currentCenter.imag + offsetImag,
      fractalType: currentFractalType,
      phoenixP: currentPhoenixP,
      paletteIndex: currentPalette,
      baseIter: iterBase,
      rotation: rotationAngle,
      melodyPitchClass: melPC,
      melodyVelocity: highestVel,
      bassPitchClass: currentBassPC,
      bassVelocity: currentBassVel,
    };
  },

  getMusicParams(dt: number, currentTime: number): MusicParams {
    // Update reusable object in place (no allocation)
    const p = reusableMusicParams;
    p.currentTime = currentTime;
    p.dt = dt;
    p.bpm = hasPlayedOnce ? currentBpm : 0;
    p.beatDuration = beatDuration;
    p.beatsPerBar = beatsPerBar;
    p.barDuration = beatDuration * beatsPerBar;
    p.beatPosition = currentBeatPosition;
    p.barPosition = currentBarPosition;
    p.beatIndex = currentBeatIndex;
    p.beatStrength = computeBeatStrength(currentBeatIndex, beatsPerBar);
    p.onBeat = frameOnBeat;
    p.onBar = frameOnBar;
    p.beatStability = currentBeatStability;
    p.nextBeatIn = currentNextBeatIn;
    p.nextBarIn = currentNextBarIn;
    p.beatAnticipation = currentBeatAnticipation;
    p.barAnticipation = currentBarAnticipation;
    p.beatArrival = currentBeatArrival;
    p.barArrival = currentBarArrival;
    p.beatGroove = currentBeatGroove;
    p.barGroove = currentBarGroove;
    p.chordRoot = currentChordRoot;
    p.chordDegree = currentChordDegree;
    p.chordQuality = currentChordQuality;
    p.tension = currentTension;
    p.harmonicTensionSmooth = tensionSmooth;
    p.harmonicTensionRelease = tensionRelease;
    p.onHarmonicRelease = frameHarmonicRelease;
    p.rhythmicTension = rhythmicTension;
    p.rhythmicTensionSmooth = rhythmicTensionSmooth;
    p.rhythmicRelease = rhythmicRelease;
    p.onRhythmicRelease = frameRhythmicRelease;
    p.key = currentKey;
    p.keyMode = currentKeyMode;
    p.useFlats = currentUseFlats;
    p.keyRotation = keyRotationState.value;
    p.melodyPitchClass = currentMelodyPC;
    p.melodyMidiNote = currentMelodyMidi;
    p.melodyVelocity = currentMelodyVel;
    p.melodyOnset = frameMelodyOnset;
    p.bassPitchClass = currentBassPC;
    p.bassMidiNote = currentBassMidi;
    p.bassVelocity = currentBassVel;
    p.drumEnergy = frameDrumEnergy;
    p.loudness = audioPlayer.getLoudness();
    p.paletteIndex = currentChordRoot;
    p.activeVoices = currentActiveVoices;
    p.upcomingNotes = computeUpcomingNotes(currentTime);
    p.upcomingChords = computeUpcomingChords(currentTime);
    p.barChords = computeBarChords(currentTime);
    // Update tensionColor in place (no array allocation)
    const tc = computeTensionColor(currentTension);
    p.tensionColor[0] = tc[0];
    p.tensionColor[1] = tc[1];
    p.tensionColor[2] = tc[2];
    return p;
  },

  getIdleMusicParams(dt: number): MusicParams {
    // Reuse same object (idle and playing are mutually exclusive)
    const p = reusableMusicParams;
    p.currentTime = 0;
    p.dt = dt;
    p.bpm = hasPlayedOnce ? currentBpm : 0;
    p.beatDuration = 0.5;
    p.beatsPerBar = 4;
    p.barDuration = 2.0;
    p.beatPosition = 0;
    p.barPosition = 0;
    p.beatIndex = 0;
    p.beatStrength = 1.0;
    p.onBeat = false;
    p.onBar = false;
    p.beatStability = 1.0;
    p.nextBeatIn = 0.5;
    p.nextBarIn = 2.0;
    p.beatAnticipation = 0;
    p.barAnticipation = 0;
    p.beatArrival = 0;
    p.barArrival = 0;
    p.beatGroove = 0.5;
    p.barGroove = 0.5;
    p.chordRoot = currentKey;
    p.chordDegree = 1;
    p.chordQuality = 'major';
    p.tension = 0;
    p.harmonicTensionSmooth = 0;
    p.harmonicTensionRelease = 0;
    p.onHarmonicRelease = false;
    p.rhythmicTension = 0;
    p.rhythmicTensionSmooth = 0;
    p.rhythmicRelease = 0;
    p.onRhythmicRelease = false;
    p.key = currentKey;
    p.keyMode = currentKeyMode;
    p.useFlats = currentUseFlats;
    p.keyRotation = keyRotationState.value;
    p.melodyPitchClass = -1;
    p.melodyMidiNote = -1;
    p.melodyVelocity = 0;
    p.melodyOnset = false;
    p.bassPitchClass = -1;
    p.bassMidiNote = -1;
    p.bassVelocity = 0;
    p.drumEnergy = 0;
    p.loudness = 0;
    p.paletteIndex = currentKey;
    p.activeVoices = [];
    p.upcomingNotes = [];
    p.upcomingChords = [];
    p.barChords = [];
    // Update tensionColor in place
    const tc = computeTensionColor(0);
    p.tensionColor[0] = tc[0];
    p.tensionColor[1] = tc[1];
    p.tensionColor[2] = tc[2];
    return p;
  },

  reset() {
    // Reset key rotation
    keyRotationTarget = -currentKey * (TWO_PI / 12);
    keyRotationState.value = keyRotationTarget;
    // Reset chord to tonic
    currentChordRoot = currentKey;
    currentChordDegree = 1;
    currentChordQuality = currentKeyMode === 'minor' ? 'minor' : 'major';
    const def = getDefaultAnchor();
    currentCenter = { ...def };
    targetCenter = { ...def };
    currentTension = 0;
    targetTension = 0;
    tensionSmooth = 0;
    tensionRelease = 0;
    tensionReleaseArmed = true;
    frameHarmonicRelease = false;
    rhythmicTension = 0;
    rhythmicTensionSmooth = 0;
    rhythmicRelease = 0;
    frameRhythmicRelease = false;
    currentPalette = 4;
    currentFractalType = def.type;
    currentPhoenixP = -0.5;
    currentOrbitRadius = def.orbitRadius ?? DEFAULT_ORBIT_RADIUS;
    targetOrbitRadius = currentOrbitRadius;
    currentOrbitSkew = def.orbitSkew ?? DEFAULT_ORBIT_SKEW;
    targetOrbitSkew = currentOrbitSkew;
    currentOrbitRotation = def.orbitRotation ?? DEFAULT_ORBIT_ROTATION;
    targetOrbitRotation = currentOrbitRotation;
    currentBeatSpread = def.beatSpread ?? DEFAULT_BEAT_SPREAD;
    targetBeatSpread = currentBeatSpread;
    currentBeatAngle = 0;
    orbitRadiusOffset = 0;
    orbitRadiusVel = 0;
    lastChordIndex = -1;
    rotationAngle = 0;
    rotationVelocity = 0;
    lastDrumIndex = -1;
    currentActiveVoices = [];
    lastActiveKeys = new Set();
    lastMelodyPC = -1;
    lastMelodyMidi = -1;
    melodicTensionAccum = 0;
    hasPlayedOnce = false;
    // Reset beat phase tracking
    prevFrameBeatPhase = 0;
    currentBeatPosition = 0;
    currentBarPosition = 0;
    currentBeatIndex = 0;
    // Reset melody/bass tracking
    frameMelodyOnset = false;
    currentMelodyPC = -1;
    currentMelodyMidi = -1;
    currentMelodyVel = 0;
    currentBassPC = -1;
    currentBassMidi = -1;
    currentBassVel = 0;
    // Reset beat events
    frameOnBeat = false;
    frameOnBar = false;
    currentBeatStability = 1.0;
    currentNextBeatIn = 0;
    currentNextBarIn = 0;
    // Reset groove curves
    currentBeatAnticipation = 0;
    currentBarAnticipation = 0;
    currentBeatArrival = 0;
    currentBarArrival = 0;
    currentBeatGroove = 0;
    currentBarGroove = 0;
    // Reset indexes for pre-built lookups
    currentChordIdx = -1;
    lastBarChordsBar = -1;
    lastUpcomingChordsBar = -1;
    // Reset BeatSync internal state
    beatSync.reset();
  },

  /** Reload anchors from localStorage (call after preset change) */
  reloadAnchors(): void {
    loadAnchorsFromStorage();
    // Update current state to use new anchors
    const def = getDefaultAnchor();
    currentCenter = { ...def };
    targetCenter = { ...def };
    currentFractalType = def.type;
    currentOrbitRadius = def.orbitRadius ?? DEFAULT_ORBIT_RADIUS;
    targetOrbitRadius = currentOrbitRadius;
    currentOrbitSkew = def.orbitSkew ?? DEFAULT_ORBIT_SKEW;
    targetOrbitSkew = currentOrbitSkew;
    currentOrbitRotation = def.orbitRotation ?? DEFAULT_ORBIT_ROTATION;
    targetOrbitRotation = currentOrbitRotation;
    currentBeatSpread = def.beatSpread ?? DEFAULT_BEAT_SPREAD;
    targetBeatSpread = currentBeatSpread;
  },
};
