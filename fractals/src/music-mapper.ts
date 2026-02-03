import type { ChordEvent, DrumHit, NoteEvent } from './midi-analyzer.ts';

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
  0: { real: -0.5221, imag: 0.4757, type: 6,
       orbits: [{dr:-0.7419, di:0.0166}, {dr:-0.4233, di:0.3550}, {dr:-0.1113, di:-0.0703}, {dr:-0.3839, di:-0.2936}] },  // Celtic
  1: { real: -0.5221, imag: 0.4757, type: 6,
       orbits: [{dr:-0.7419, di:0.0166}, {dr:-0.4233, di:0.3550}, {dr:-0.1113, di:-0.0703}, {dr:-0.3839, di:-0.2936}] },  // Celtic
  2: { real: -0.5576, imag: -0.1589, type: 5,
       orbits: [{dr:0.2919, di:-0.4629}, {dr:-0.3965, di:-0.4415}, {dr:-0.7363, di:-0.4160}, {dr:0.5742, di:-0.4492}] },  // Phoenix
  3: { real: 0.5002, imag: -0.8946, type: 4,
       orbits: [{dr:0.3780, di:0.2838}, {dr:0.0203, di:0.3658}, {dr:-0.3341, di:0.2716}, {dr:0.6591, di:-0.0036}] },  // Tricorn
  4: { real: -1.2810, imag: -0.4794, type: 6,
       orbits: [{dr:0.3687, di:0.2541}, {dr:-0.4120, di:0.3658}, {dr:-0.3442, di:0.0000}, {dr:0.0000, di:-0.3003}] },  // Celtic
  5: { real: -0.5105, imag: -0.1510, type: 6,
       orbits: [{dr:-0.4352, di:0.0001}, {dr:-0.7093, di:-0.8774}, {dr:-0.3907, di:-0.3198}, {dr:-0.3993, di:-0.6451}] },  // Celtic
  6: { real: 0.5002, imag: 0.8995, type: 4,
       orbits: [{dr:-0.0106, di:-0.3597}, {dr:0.1861, di:-0.1572}, {dr:-0.1064, di:0.2003}, {dr:0.2598, di:0.0718}] },  // Tricorn
  7: { real: -0.5371, imag: 0.2219, type: 5,
       orbits: [{dr:0.3026, di:0.3311}, {dr:0.0532, di:0.4003}, {dr:0.5794, di:0.1968}, {dr:-0.5195, di:0.4130}] },  // Phoenix
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

// Beat-driven rotation
let rotationAngle = 0;
let rotationVelocity = 0;
let rotationFriction = 1.2;

// Beat tracking (set in setTempo)
let beatDuration = 0.5;
let beatsPerBar = 4;

// Drum processing
let lastDrumIndex = -1;

// Exponential snap — fast, direct transition to new chord target
const snapRate = 8.0;  // ~0.12s to 90% — responsive chord changes

let smoothingRate = 6.0;
let lastChordIndex = -1;

export const musicMapper = {
  setTempo(bpm: number, timeSig?: [number, number]) {
    beatDuration = 60 / bpm;
    beatsPerBar = timeSig ? timeSig[0] : 4;
    smoothingRate = 4.0 + (bpm / 120) * 2.0;
    // Faster tempo → more friction so rotation doesn't accumulate
    rotationFriction = 1.2 + Math.max(0, (bpm - 100) / 60) * 1.5;
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

      // Update target orbits
      targetOrbits = center.orbits.map(o => ({ ...o }));
    }

    // --- Exponential snap toward target ---
    const snapDecay = 1 - Math.exp(-snapRate * dt);
    currentCenter.real += (targetCenter.real - currentCenter.real) * snapDecay;
    currentCenter.imag += (targetCenter.imag - currentCenter.imag) * snapDecay;

    // Snap orbits too
    for (let i = 0; i < 4; i++) {
      currentOrbits[i].dr += (targetOrbits[i].dr - currentOrbits[i].dr) * snapDecay;
      currentOrbits[i].di += (targetOrbits[i].di - currentOrbits[i].di) * snapDecay;
    }

    // Tension smoothing
    const decay = 1 - Math.exp(-smoothingRate * dt);
    currentTension += (targetTension - currentTension) * decay;

    // --- Process drum hits → rotation ---
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
      } else if (d.type === 'snare') {
        rotationVelocity -= 0.6;
      } else if (d.type === 'hihat') {
        rotationVelocity += (beatInBar % 2 === 0 ? 1 : -1) * 0.12;
      }
    }

    // --- Beat-grid rotation impulses ---
    if (beatDuration > 0) {
      const barDuration = beatDuration * beatsPerBar;
      const posInBar = currentTime % barDuration;
      const prevPosInBar = (currentTime - dt) % barDuration;

      // Check beat boundary crossings
      for (let beat = 0; beat < beatsPerBar; beat++) {
        const beatTime = beat * beatDuration;
        if (prevPosInBar <= beatTime && posInBar > beatTime && dt > 0) {
          // Beats 0,2 → CCW (+), beats 1,3 → CW (-)
          const cw = (beat % 2 === 0) ? 1 : -1;
          const strength = (beat === 1) ? 1.0 : 0.7;
          rotationVelocity += cw * 0.7 * strength;
        }

        // Eighth-note subdivision (halfway between beats)
        const eighthTime = beatTime + beatDuration * 0.5;
        if (prevPosInBar <= eighthTime && posInBar > eighthTime && dt > 0) {
          const cw8 = (beat % 2 === 0) ? 1 : -1;
          rotationVelocity += cw8 * 0.20;
        }
      }
    }

    // --- Rotation friction + integration ---
    const safeDt = Math.min(dt, 0.1);  // prevent explosion on tab switch
    rotationVelocity *= Math.exp(-rotationFriction * safeDt);
    rotationAngle += rotationVelocity * safeDt;

    // --- Orbit-based c-value: beat-synchronized ---
    let offsetReal = 0;
    let offsetImag = 0;

    if (beatDuration > 0) {
      const barDuration = beatDuration * beatsPerBar;
      const posInBar = currentTime % barDuration;
      const beatFloat = posInBar / beatDuration;
      const beatIndex = Math.floor(beatFloat) % currentOrbits.length;
      const beatFrac = beatFloat - Math.floor(beatFloat);

      // Sinusoidal: 0 at beat boundary (center), 1 at beat midpoint (orbit point)
      const t = Math.sin(Math.PI * beatFrac);

      offsetReal = currentOrbits[beatIndex].dr * t;
      offsetImag = currentOrbits[beatIndex].di * t;
    }

    // Iterations: tension only
    const iterBase = Math.round(120 + currentTension * 60);

    // --- Find melody (highest note >= C4) and bass (lowest note < C4) ---
    const SPLIT_MIDI = 60; // middle C divides melody from bass
    let highestMidi = -1, highestVel = 0;
    let lowestMidi = 999, lowestVel = 0;
    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      if (n.time > currentTime) continue;
      if (n.time < currentTime - 2.0) break;
      if (n.isDrum) continue;
      if (n.time + n.duration >= currentTime) {
        if (n.midi >= SPLIT_MIDI && n.midi > highestMidi) { highestMidi = n.midi; highestVel = n.velocity; }
        if (n.midi < SPLIT_MIDI && n.midi < lowestMidi) { lowestMidi = n.midi; lowestVel = n.velocity; }
      }
    }

    return {
      cReal: currentCenter.real + offsetReal,
      cImag: currentCenter.imag + offsetImag,
      fractalType: currentFractalType,
      phoenixP: currentPhoenixP,
      paletteIndex: currentPalette,
      baseIter: iterBase,
      rotation: rotationAngle,
      melodyPitchClass: highestMidi >= 0 ? highestMidi % 12 : -1,
      melodyVelocity: highestVel,
      bassPitchClass: lowestMidi < 999 ? lowestMidi % 12 : -1,
      bassVelocity: lowestVel,
    };
  },

  reset() {
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
    lastChordIndex = -1;
    rotationAngle = 0;
    rotationVelocity = 0;
    lastDrumIndex = -1;
  },
};
