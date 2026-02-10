import type { ChordEvent, DrumHit, NoteEvent, TrackInfo, KeyRegion } from './midi-analyzer.ts';
import type { MusicParams, ActiveVoice, UpcomingNote, UpcomingChord, RGB } from './effects/effect-interface.ts';
import { createMidiBeatSync, createIdleBeatSync, type BeatSync, type TempoEvent, type TimeSignatureEvent } from './beat-sync.ts';
import { gsap } from './animation.ts';
import { palettes } from './fractal-engine.ts';

// --- Julia set anchors by harmonic degree ---

interface CValue {
  real: number;
  imag: number;
  type: number;
  phoenix?: number;
  // 4 orbit offsets (relative to center), one per beat
  orbits: Array<{ dr: number; di: number }>;
}

// type: 0=Julia z²+c, 1=Cubic z³+c, 2=Quartic z⁴+c, 3=BurningShip,
//       4=Tricorn, 5=Phoenix, 6=Celtic, 7=Lambda, 8=PerpBurn, 9=Buffalo

// --- Mixed anchors: cross-family degree assignments ---


const DEFAULT_ORBITS: Array<{ dr: number; di: number }> = [
  { dr: 0.08, di: 0 },
  { dr: 0, di: 0.08 },
  { dr: -0.08, di: 0 },
  { dr: 0, di: -0.08 },
];

const defaultAnchors: Record<number, CValue> = {
  0: { real: 0.1691, imag: -0.4957, type: 4,
       orbits: [{dr:-0.0164, di:0.0417}, {dr:-0.1442, di:0.1592}, {dr:0.0995, di:-0.1970}, {dr:0.1415, di:-0.3167}] },  // Tricorn
  1: { real: 0.1691, imag: -0.4957, type: 4,
       orbits: [{dr:-0.0164, di:0.0417}, {dr:-0.1442, di:0.1592}, {dr:0.0995, di:-0.1970}, {dr:0.1415, di:-0.3167}] },  // Tricorn
  2: { real: 0.3215, imag: 0.3842, type: 8,
       orbits: [{dr:0.0800, di:0.0000}, {dr:0.0000, di:0.0800}, {dr:-0.0800, di:0.0000}, {dr:0.0000, di:-0.0800}] },  // PerpBurn
  3: { real: 0.3386, imag: -1.5682, type: 3,
       orbits: [{dr:0.3780, di:0.2838}, {dr:0.0203, di:0.3658}, {dr:-0.3341, di:0.2716}, {dr:0.6591, di:-0.0036}] },  // Burning Ship
  4: { real: 0.1969, imag: 0.5382, type: 4,
       orbits: [{dr:-0.0130, di:0.4822}, {dr:-0.0364, di:0.3081}, {dr:-0.1946, di:-0.1429}, {dr:-0.5589, di:-0.3168}] },  // Tricorn
  5: { real: 0.3972, imag: 0.5086, type: 4,
       orbits: [{dr:0.1357, di:-0.0154}, {dr:0.2352, di:-0.1154}, {dr:-0.0090, di:-0.0631}, {dr:0.0353, di:-0.1455}] },  // Tricorn
  6: { real: -1.0169, imag: -1.0135, type: 3,
       orbits: [{dr:0.0128, di:-0.2683}, {dr:-0.3061, di:0.2928}, {dr:-0.3486, di:0.0034}, {dr:0.3770, di:0.0085}] },  // Burning Ship
  7: { real: 0.2881, imag: 0.4126, type: 5,
       orbits: [{dr:0.3182, di:-0.0236}, {dr:1.0254, di:-0.0038}, {dr:-0.0310, di:0.3267}, {dr:-0.3607, di:0.3102}] },  // Phoenix
};

const STORAGE_KEY = 'fractal-anchors';

let anchors: Record<number, CValue> = { ...defaultAnchors };

function loadAnchorsFromStorage(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, any>;
    if (!parsed['0'] || !parsed['1']) return;
    // Schema check: new format has orbits array, old format has sweepTo
    if (!parsed['0'].orbits) {
      // Old schema — ignore, use hardcoded defaults
      return;
    }
    const loaded: Record<number, CValue> = {};
    for (let d = 0; d <= 7; d++) {
      if (parsed[d] && parsed[d].orbits) {
        loaded[d] = parsed[d];
      }
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
  const angle = (root / 12) * Math.PI * 2;
  // Very small radius — these c-values are precisely tuned for visual weight
  const radius = 0.005;
  return {
    real: anchor.real + radius * Math.cos(angle),
    imag: anchor.imag + radius * Math.sin(angle),
    type: anchor.type,
    phoenix: anchor.phoenix,
    orbits: anchor.orbits ?? [...DEFAULT_ORBITS],
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
let currentPalette = 4;
let currentFractalType = getDefaultAnchor().type;
let currentPhoenixP = -0.5;

// Current orbit offsets (interpolated on chord change)
let currentOrbits: Array<{ dr: number; di: number }> = [...DEFAULT_ORBITS];
let targetOrbits: Array<{ dr: number; di: number }> = [...DEFAULT_ORBITS];

// --- Physics-based orbit state ---
// Instead of discrete 4-point orbits, use continuous circular motion
let orbitAngle = 0;           // Current position on circle (radians)
let orbitRadiusOffset = 0;    // Deviation from base radius
let orbitRadiusVel = 0;       // Radial velocity (for spring physics)
let currentOrbitRadius = 0.12; // Base orbit radius (computed from anchor)
let targetOrbitRadius = 0.12;  // Target radius (snaps on chord change)

// Compute average radius from 4-point orbit array
function computeOrbitRadius(orbits: Array<{ dr: number; di: number }>): number {
  if (!orbits || orbits.length === 0) return 0.12;
  let sum = 0;
  for (const o of orbits) {
    sum += Math.sqrt(o.dr * o.dr + o.di * o.di);
  }
  return sum / orbits.length;
}

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
let currentChordRoot = 0;
let currentChordDegree = 1;
let currentChordQuality = 'major';
let frameKick = false;
let frameSnare = false;
let frameHihat = false;
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
let currentBpm = 120;
let hasPlayedOnce = false;  // Track if playback has ever started (for BPM display)

// Cached tension color endpoints (precomputed when key changes)
let cachedKeyIColor: RGB = [120, 120, 120];  // Tonic color
let cachedKeyVColor: RGB = [120, 120, 120];  // Dominant color

// Tension color LUT: 256 entries for O(1) lookup (no per-frame interpolation)
const TENSION_LUT_SIZE = 256;
let tensionColorLUT: RGB[] = new Array(TENSION_LUT_SIZE).fill(null).map(() => [120, 120, 120] as RGB);

// Key modulation tracking
let keyRegions: KeyRegion[] = [];
let currentKeyRegionIndex = -1;
let keyRotationTarget = 0;       // target rotation in radians
const keyRotationState = { value: 0 }; // animated by GSAP
let frameOnModulation = false;

// Multi-voice tracking
let currentActiveVoices: ActiveVoice[] = [];
let lastActiveKeys = new Set<string>(); // "channel:midi" for onset detection
let currentTracks: TrackInfo[] = [];

// All notes for lookahead (piano roll)
let allNotes: NoteEvent[] = [];
const LOOKAHEAD_SECONDS = 4.0;  // how far ahead to look for upcoming notes

// All chords for theory bar lookahead
let allChords: ChordEvent[] = [];

// Simplified per-bar chords (one chord per bar, first chord wins)
let simplifiedBarChords: ChordEvent[] = [];
let totalBars = 0;
let songBarDuration = 2.0; // cached bar duration for the song

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
function computeBarChords(currentTime: number): UpcomingChord[] {
  if (simplifiedBarChords.length === 0 || songBarDuration <= 0) return [];

  const currentBar = Math.floor(currentTime / songBarDuration);

  const result: UpcomingChord[] = [];
  for (let barOffset = -1; barOffset <= 2; barOffset++) {
    const bar = currentBar + barOffset;
    const barTime = bar * songBarDuration;

    if (bar < 0 || bar >= simplifiedBarChords.length) {
      result.push({ time: -1, root: -1, quality: '', degree: 0, numeral: '', timeUntil: 0 });
    } else {
      const chord = simplifiedBarChords[bar];
      result.push({
        time: barTime,
        root: chord.root,
        quality: chord.quality,
        degree: chord.degree,
        numeral: chord.numeral,  // precomputed during MIDI analysis
        timeUntil: barTime - currentTime,
      });
    }
  }

  return result;
}

function computeUpcomingChords(currentTime: number): UpcomingChord[] {
  if (allChords.length === 0) return [];

  // Get bar duration from current tempo
  const barDuration = beatDuration * beatsPerBar;
  if (barDuration <= 0) return [];

  // Calculate current bar number
  const currentBar = Math.floor(currentTime / barDuration);

  // Helper to find chord playing at a given time (uses binary search)
  const getChordAtTime = (time: number): UpcomingChord => {
    if (time < 0) {
      return { time: -1, root: -1, quality: '', degree: 0, numeral: '', timeUntil: 0 };
    }

    // Binary search for the chord active at this time
    const idx = binarySearchTime(allChords, time);
    if (idx < 0) {
      return { time: -1, root: -1, quality: '', degree: 0, numeral: '', timeUntil: 0 };
    }

    const chord = allChords[idx];
    return {
      time: time,
      root: chord.root,
      quality: chord.quality,
      degree: chord.degree,
      numeral: chord.numeral,  // precomputed during MIDI analysis
      timeUntil: time - currentTime,
    };
  };

  // Build array: [prev bar, current bar, next bar, next-next bar]
  const result: UpcomingChord[] = [];
  for (let barOffset = -1; barOffset <= 2; barOffset++) {
    const barTime = (currentBar + barOffset) * barDuration;
    result.push(getChordAtTime(barTime));
  }

  return result;
}

function computeUpcomingNotes(currentTime: number): UpcomingNote[] {
  const upcoming: UpcomingNote[] = [];
  const windowStart = currentTime - 0.1;  // include notes that just started
  const windowEnd = currentTime + LOOKAHEAD_SECONDS;

  // Binary search to find starting point (first note that could overlap)
  // Notes are sorted by start time, so find first note starting after (windowStart - maxDuration)
  // Use conservative estimate: start from notes that begin within ~10s before windowStart
  const searchStart = Math.max(0, binarySearchFirstGE(allNotes, windowStart - 10));

  for (let i = searchStart; i < allNotes.length; i++) {
    const note = allNotes[i];
    // Stop when note starts after window (all subsequent notes are later)
    if (note.time >= windowEnd) break;
    if (note.isDrum) continue;  // skip drum notes
    const noteEnd = note.time + note.duration;
    // Include if note overlaps with window
    if (noteEnd > windowStart) {
      upcoming.push({
        midi: note.midi,
        pitchClass: note.midi % 12,
        velocity: note.velocity,
        time: note.time,
        duration: note.duration,
        timeUntil: note.time - currentTime,
        track: note.channel,
      });
    }
  }

  return upcoming;
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

  setKey(pitchClass: number, mode: 'major' | 'minor') {
    currentKey = pitchClass;
    currentKeyMode = mode;
    // Initialize chord root to tonic until actual chords play
    currentChordRoot = pitchClass;
    currentChordDegree = 1;
    currentChordQuality = mode === 'minor' ? 'minor' : 'major';
    // Initialize rotation to align this key at 12 o'clock
    keyRotationTarget = -pitchClass * (Math.PI * 2 / 12);
    keyRotationState.value = keyRotationTarget;
    // Precompute tension color endpoints for this key
    updateCachedKeyColors(pitchClass);
  },

  setKeyRegions(regions: KeyRegion[]) {
    keyRegions = regions;
    currentKeyRegionIndex = -1;
  },

  setSongDuration(duration: number, chords: ChordEvent[]) {
    // Store chords and cache bar duration, then build simplified bar chords
    allChords = chords;
    songBarDuration = beatDuration * beatsPerBar;
    buildSimplifiedBarChords(duration);
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
    // Store notes and chords for lookahead
    allNotes = notes;
    allChords = chords;

    // --- Find current chord ---
    let chordIdx = -1;
    for (let i = chords.length - 1; i >= 0; i--) {
      if (chords[i].time <= currentTime) {
        chordIdx = i;
        break;
      }
    }

    if (chordIdx >= 0 && chordIdx !== lastChordIndex) {
      lastChordIndex = chordIdx;
      const chord = chords[chordIdx];

      const center = centerForChord(chord.degree, chord.root);
      targetCenter = { ...center };
      targetTension = chord.tension;
      currentPalette = chord.root;
      currentFractalType = center.type;
      currentPhoenixP = center.phoenix ?? -0.5;
      currentChordRoot = chord.root;
      currentChordDegree = chord.degree;
      currentChordQuality = chord.quality;

      // Update target orbits and compute target radius
      targetOrbits = center.orbits.map(o => ({ ...o }));
      targetOrbitRadius = computeOrbitRadius(center.orbits);
    }

    // --- Exponential snap toward target ---
    const snapDecay = 1 - Math.exp(-snapRate * dt);
    currentCenter.real += (targetCenter.real - currentCenter.real) * snapDecay;
    currentCenter.imag += (targetCenter.imag - currentCenter.imag) * snapDecay;

    // Snap orbit radius
    currentOrbitRadius += (targetOrbitRadius - currentOrbitRadius) * snapDecay;

    // Keep legacy orbit snap for backwards compatibility with config tool
    for (let i = 0; i < 4; i++) {
      currentOrbits[i].dr += (targetOrbits[i].dr - currentOrbits[i].dr) * snapDecay;
      currentOrbits[i].di += (targetOrbits[i].di - currentOrbits[i].di) * snapDecay;
    }

    // Tension smoothing with melodic modulation
    // Combine harmonic tension (from chord analysis) with real-time melodic tension
    const effectiveTension = Math.min(1, targetTension + melodicTensionAccum * 0.3);
    const decay = 1 - Math.exp(-smoothingRate * dt);
    currentTension += (effectiveTension - currentTension) * decay;

    // --- Process drum hits → rotation ---
    frameKick = false;
    frameSnare = false;
    frameHihat = false;
    const noteLookback = 0.05;
    for (let i = lastDrumIndex + 1; i < drums.length; i++) {
      const d = drums[i];
      if (d.time > currentTime) break;
      if (d.time < currentTime - noteLookback) { lastDrumIndex = i; continue; }

      lastDrumIndex = i;

      // Compute beat position within bar for hi-hat alternation
      const beatInBar = Math.floor((d.time % (beatDuration * beatsPerBar)) / beatDuration);

      if (d.type === 'kick') {
        rotationVelocity += 0.5;
        frameKick = true;
      } else if (d.type === 'snare') {
        rotationVelocity -= 0.6;
        frameSnare = true;
      } else if (d.type === 'hihat') {
        rotationVelocity += (beatInBar % 2 === 0 ? 1 : -1) * 0.12;
        frameHihat = true;
      }
    }

    // --- Get beat state from BeatSync ---
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

    // --- Beat-grid rotation impulses ---
    if (beat.onBeat) {
      // Beats 0,2 → CCW (+), beats 1,3 → CW (-)
      const cw = (beat.beatIndex % 2 === 0) ? 1 : -1;
      const strength = (beat.beatIndex === 1) ? 1.0 : 0.7;
      rotationVelocity += cw * 0.7 * strength;
    }

    // Eighth-note subdivision impulses (at 0.5 beat phase)
    // We detect crossing 0.5 by checking if we went from <0.5 to >=0.5
    const prevBeatPhase = (currentTime - dt > 0) ? (beatSync.update(currentTime - dt, 0).beatPhase) : 0;
    if (prevBeatPhase < 0.5 && beat.beatPhase >= 0.5 && dt > 0) {
      const cw8 = (beat.beatIndex % 2 === 0) ? 1 : -1;
      rotationVelocity += cw8 * 0.20;
    }

    // --- Rotation friction + integration ---
    const safeDt = Math.min(dt, 0.1);  // prevent explosion on tab switch
    rotationVelocity *= Math.exp(-rotationFriction * safeDt);
    rotationAngle += rotationVelocity * safeDt;

    // --- Physics-based orbit: continuous circular motion ---
    // Angular motion: continuous rotation, one revolution per bar
    // Groove modulates speed, tension scales everything
    const barDur = beat.beatDuration * beat.beatsPerBar;
    const baseAngularSpeed = barDur > 0 ? (Math.PI * 2) / barDur : Math.PI;

    // Groove curves for timing
    const beatGroove = beat.beatGroove ?? 0.5;
    const beatArrival = beat.beatArrival ?? 0;
    const barArrival = beat.barArrival ?? 0;
    const beatAnticipation = beat.beatAnticipation ?? 0;

    // Angular speed modulated by groove (speeds up/slows down with beat)
    const grooveSpeedMod = (beatGroove - 0.5) * currentTension * 0.4;
    orbitAngle += baseAngularSpeed * (1 + grooveSpeedMod) * safeDt;

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
    const effectiveRadius = currentOrbitRadius + orbitRadiusOffset;
    const offsetReal = effectiveRadius * Math.cos(orbitAngle);
    const offsetImag = effectiveRadius * Math.sin(orbitAngle);

    // Iterations: tension only
    const iterBase = Math.round(120 + currentTension * 60);

    // --- Find melody (highest note) and bass (lowest note) ---
    // No fixed split point - melody is highest sounding, bass is lowest sounding
    let highestMidi = -1, highestVel = 0;
    let lowestMidi = 999, lowestVel = 0;
    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      if (n.time > currentTime) continue;
      if (n.time < currentTime - 2.0) break;
      if (n.isDrum) continue;
      if (n.time + n.duration >= currentTime) {
        if (n.midi > highestMidi) { highestMidi = n.midi; highestVel = n.velocity; }
        if (n.midi < lowestMidi) { lowestMidi = n.midi; lowestVel = n.velocity; }
      }
    }

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

    // --- Build active voices with onset detection ---
    const newActiveKeys = new Set<string>();
    const voices: ActiveVoice[] = [];
    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      if (n.time > currentTime) continue;
      if (n.time < currentTime - 2.0) break;
      if (n.isDrum) continue;
      if (n.time + n.duration >= currentTime) {
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
    // Check for key modulation (disabled for now - detection over-modulates)
    frameOnModulation = false;
    // TODO: Re-enable when modulation detection is more stable
    if (false && keyRegions.length > 0) {
      // Find current key region
      let newRegionIndex = 0;
      for (let i = keyRegions.length - 1; i >= 0; i--) {
        if (keyRegions[i].startTime <= currentTime) {
          newRegionIndex = i;
          break;
        }
      }

      // Detect modulation (new region)
      if (newRegionIndex !== currentKeyRegionIndex) {
        currentKeyRegionIndex = newRegionIndex;
        const region = keyRegions[newRegionIndex];

        // Update current key
        currentKey = region.key;
        currentKeyMode = region.mode;

        // Calculate shortest rotation path to new key
        const newTarget = -region.key * (Math.PI * 2 / 12);
        let delta = newTarget - keyRotationTarget;

        // Normalize to shortest path (-π to π)
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;

        keyRotationTarget += delta;

        // Tween rotation over 1 beat
        gsap.to(keyRotationState, {
          value: keyRotationTarget,
          duration: beatDuration,
          ease: 'power2.inOut',
          overwrite: true,
        });

        frameOnModulation = newRegionIndex > 0; // Don't flag first region as modulation
      }
    }

    return {
      currentTime,
      dt,
      bpm: hasPlayedOnce ? currentBpm : 0,
      beatDuration,
      beatsPerBar,
      beatPosition: currentBeatPosition,
      barPosition: currentBarPosition,
      beatIndex: currentBeatIndex,
      onBeat: frameOnBeat,
      onBar: frameOnBar,
      beatStability: currentBeatStability,
      nextBeatIn: currentNextBeatIn,
      nextBarIn: currentNextBarIn,
      // Groove curves
      beatAnticipation: currentBeatAnticipation,
      barAnticipation: currentBarAnticipation,
      beatArrival: currentBeatArrival,
      barArrival: currentBarArrival,
      beatGroove: currentBeatGroove,
      barGroove: currentBarGroove,
      chordRoot: currentChordRoot,
      chordDegree: currentChordDegree,
      chordQuality: currentChordQuality,
      tension: currentTension,
      key: currentKey,
      keyMode: currentKeyMode,
      keyRotation: keyRotationState.value,
      onModulation: frameOnModulation,
      melodyPitchClass: currentMelodyPC,
      melodyMidiNote: currentMelodyMidi,
      melodyVelocity: currentMelodyVel,
      melodyOnset: frameMelodyOnset,
      bassPitchClass: currentBassPC,
      bassMidiNote: currentBassMidi,
      bassVelocity: currentBassVel,
      kick: frameKick,
      snare: frameSnare,
      hihat: frameHihat,
      paletteIndex: currentChordRoot,
      activeVoices: currentActiveVoices,
      tracks: currentTracks,
      upcomingNotes: computeUpcomingNotes(currentTime),
      upcomingChords: computeUpcomingChords(currentTime),
      barChords: computeBarChords(currentTime),
      tensionColor: computeTensionColor(currentTension),
    };
  },

  setTracks(tracks: TrackInfo[]) {
    currentTracks = tracks;
  },

  getIdleMusicParams(dt: number): MusicParams {
    return {
      currentTime: 0,
      dt,
      bpm: hasPlayedOnce ? currentBpm : 0,
      beatDuration: 0.5,
      beatsPerBar: 4,
      beatPosition: 0,
      barPosition: 0,
      beatIndex: 0,
      onBeat: false,
      onBar: false,
      beatStability: 1.0,
      nextBeatIn: 0.5,
      nextBarIn: 2.0,
      // Groove curves (idle = no anticipation, no arrival)
      beatAnticipation: 0,
      barAnticipation: 0,
      beatArrival: 0,
      barArrival: 0,
      beatGroove: 0.5,
      barGroove: 0.5,
      chordRoot: currentKey,
      chordDegree: 1,
      chordQuality: 'major',
      tension: 0,
      key: currentKey,
      keyMode: currentKeyMode,
      keyRotation: keyRotationState.value,
      onModulation: false,
      melodyPitchClass: -1,
      melodyMidiNote: -1,
      melodyVelocity: 0,
      melodyOnset: false,
      bassPitchClass: -1,
      bassMidiNote: -1,
      bassVelocity: 0,
      kick: false,
      snare: false,
      hihat: false,
      paletteIndex: currentKey,
      activeVoices: [],
      tracks: currentTracks,
      upcomingNotes: [],
      upcomingChords: [],
      barChords: [],
      tensionColor: computeTensionColor(0),  // idle = no tension
    };
  },

  reset() {
    // Reset key modulation state
    currentKeyRegionIndex = -1;
    keyRotationTarget = -currentKey * (Math.PI * 2 / 12);
    keyRotationState.value = keyRotationTarget;
    frameOnModulation = false;
    // Reset chord to tonic
    currentChordRoot = currentKey;
    currentChordDegree = 1;
    currentChordQuality = currentKeyMode === 'minor' ? 'minor' : 'major';
    const def = getDefaultAnchor();
    currentCenter = { ...def };
    targetCenter = { ...def };
    currentTension = 0;
    targetTension = 0;
    currentPalette = 4;
    currentFractalType = def.type;
    currentPhoenixP = -0.5;
    currentOrbits = (def.orbits ?? DEFAULT_ORBITS).map(o => ({ ...o }));
    targetOrbits = currentOrbits.map(o => ({ ...o }));
    currentOrbitRadius = computeOrbitRadius(def.orbits ?? DEFAULT_ORBITS);
    targetOrbitRadius = currentOrbitRadius;
    orbitAngle = 0;
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
    currentOrbits = (def.orbits ?? DEFAULT_ORBITS).map(o => ({ ...o }));
    targetOrbits = currentOrbits.map(o => ({ ...o }));
    currentOrbitRadius = computeOrbitRadius(def.orbits ?? DEFAULT_ORBITS);
    targetOrbitRadius = currentOrbitRadius;
  },
};
