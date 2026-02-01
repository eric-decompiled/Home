import type { ChordEvent, NoteEvent } from './midi-analyzer.ts';

// --- Julia set anchors by harmonic degree ---

interface CValue {
  real: number;
  imag: number;
  type: number;
  phoenix?: number;
  // Optional sweep endpoint: breathing oscillates along anchor↔sweepTo axis
  sweepTo?: { real: number; imag: number };
}

// type: 0=Julia z²+c, 1=Cubic z³+c, 2=Quartic z⁴+c, 3=BurningShip,
//       4=Tricorn, 5=Phoenix, 6=Celtic, 7=Lambda
// Buffalo anchors (kept for future use as selectable option)
// const buffaloAnchors: Record<number, CValue> = {
//   1: { real: 0.0,   imag: -0.8,  type: 9, sweepTo: { real: 0.01, imag: -0.78 } },
//   2: { real: 0.0,   imag: -0.65, type: 9, sweepTo: { real: 0.04, imag: -0.58 } },
//   3: { real: 0.285, imag: 0.01,  type: 9, sweepTo: { real: 0.3, imag: 0.06 } },
//   4: { real: -0.12, imag: 0.74,  type: 9, sweepTo: { real: -0.05, imag: 0.68 } },
//   5: { real: 0.0,   imag: 0.8,   type: 9, sweepTo: { real: 0.06, imag: 0.7 } },
//   6: { real: 0.0,   imag: 0.65,  type: 9, sweepTo: { real: 0.03, imag: 0.6 } },
//   7: { real: -0.5,  imag: -0.5,  type: 9, sweepTo: { real: -0.4, imag: -0.4 } },
//   0: { real: 0.0,   imag: -0.8,  type: 9, sweepTo: { real: 0.01, imag: -0.78 } },
// };

const degreeAnchors: Record<number, CValue> = {
  // Auto-tuned weight-matched anchors in the Burning Ship hull region.
  // These were visually verified to produce distinct, detailed shapes.
  // I  - Tonic: southeast detail
  1: { real: -0.31,    imag: -1.15,   type: 3,
       sweepTo: { real: -0.3004, imag: -1.1385 } },
  // ii - Supertonic: hull region
  2: { real: -1.1347,  imag: -0.6387, type: 3,
       sweepTo: { real: -1.1309, imag: -0.6355 } },
  // iii - Mediant: deep hull
  3: { real: -1.0635,  imag: -0.8576, type: 3,
       sweepTo: { real: -1.0558, imag: -0.8512 } },
  // IV - Subdominant: hull #4
  4: { real: -0.8479,  imag: -1.053,  type: 3,
       sweepTo: { real: -0.8444, imag: -1.0495 } },
  // V  - Dominant: deep hull variant
  5: { real: -1.02,    imag: -0.75,   type: 3,
       sweepTo: { real: -1.015,  imag: -0.745 } },
  // vi - Submediant: near deep hull
  6: { real: -1.02,    imag: -0.9,    type: 3,
       sweepTo: { real: -1.0162, imag: -0.8968 } },
  // vii° - Leading tone: low right
  7: { real: -0.5113,  imag: -1.1077, type: 3,
       sweepTo: { real: -0.5017, imag: -1.0962 } },
  // 0 = chromatic/unknown (same as I)
  0: { real: -0.31,    imag: -1.15,   type: 3,
       sweepTo: { real: -0.3004, imag: -1.1385 } },
};

// Root pitch class applies a tiny rotation around the degree anchor
function centerForChord(degree: number, root: number): CValue {
  const anchor = degreeAnchors[degree] ?? degreeAnchors[0];
  const angle = (root / 12) * Math.PI * 2;
  // Very small radius — these c-values are precisely tuned for visual weight
  const radius = 0.005;
  return {
    real: anchor.real + radius * Math.cos(angle),
    imag: anchor.imag + radius * Math.sin(angle),
    type: anchor.type,
    phoenix: anchor.phoenix,
    sweepTo: anchor.sweepTo,
  };
}

// --- Fractal parameter state ---

export interface FractalParams {
  cReal: number;
  cImag: number;
  fractalType: number;
  phoenixP: number;
  paletteIndex: number;
  baseIter: number;
  melodyPitchClass: number; // -1 if none
  melodyVelocity: number;   // 0-1
  bassPitchClass: number;   // -1 if none
  bassVelocity: number;     // 0-1
}

// Interpolation state
const defaultAnchor = degreeAnchors[1];
let currentCenter: CValue = { ...defaultAnchor };
let targetCenter: CValue = { ...defaultAnchor };
// Spring velocity — drives both transition momentum and note kicks
let velocityR = 0;
let velocityI = 0;

let currentTension = 0;
let targetTension = 0;
let currentPalette = 4;
let currentFractalType = defaultAnchor.type;
let currentPhoenixP = -0.5;
let currentSweep: { real: number; imag: number } | undefined;

let lastNoteIndex = -1;

// Cold start: first notes get extra energy to kick things off
let noteCount = 0;
const coldStartNotes = 12;  // first N notes get boosted
const coldStartMultiplier = 3.0; // extra kick factor

// Breathing: three phases for organic motion
let phase = 0;
let phase2 = 0;   // golden ratio offset — never repeats
let phase3 = 0;   // beat-synced groove phase
let beatDuration = 0.5;
let beatPhase = 0; // tracks position within the beat (0-1)

// Note-driven sweep energy: decays over time, boosts breathing amplitude
let sweepEnergy = 0;

// Bass heaviness: low notes add slow-decaying weight
let bassWeight = 0;

// Exponential snap — fast, direct transition to new chord target
const snapRate = 8.0;  // ~0.12s to 90% — responsive chord changes
// Note-kick soft limit
const kickSoftMax = 0.06;

let smoothingRate = 6.0;
let lastChordIndex = -1;

export const musicMapper = {
  setTempo(bpm: number, _timeSig?: [number, number]) {
    beatDuration = 60 / bpm;
    smoothingRate = 4.0 + (bpm / 120) * 2.0;
  },

  update(
    dt: number,
    currentTime: number,
    chords: ChordEvent[],
    _drums: unknown[],
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
      currentSweep = center.sweepTo;
    }

    // --- Decay sweep energy and bass weight ---
    sweepEnergy *= Math.exp(-0.7 * dt);   // ~1s half-life — pools slowly, rises like a tide
    if (sweepEnergy > 5.0) sweepEnergy = 5.0; // soft ceiling
    bassWeight *= Math.exp(-0.8 * dt);    // ~0.87s half-life

    // --- Exponential snap toward target ---
    const effectiveSnap = snapRate / (1.0 + bassWeight * 0.3);
    const snapDecay = 1 - Math.exp(-effectiveSnap * dt);
    currentCenter.real += (targetCenter.real - currentCenter.real) * snapDecay;
    currentCenter.imag += (targetCenter.imag - currentCenter.imag) * snapDecay;

    // Tension smoothing
    const decay = 1 - Math.exp(-smoothingRate * dt);
    currentTension += (targetTension - currentTension) * decay;

    // --- Breathing: triple-phase for groove ---
    // Phase 1 & 2: incommensurate Lissajous (organic drift)
    const baseSpeed = Math.PI * 1.0 / beatDuration;
    phase += baseSpeed * dt;
    phase2 += baseSpeed * 0.618 * dt;  // golden ratio — never repeats

    // Phase 3: beat-locked groove (syncs to the rhythm)
    beatPhase += dt / beatDuration;
    beatPhase %= 1.0;
    phase3 = beatPhase * Math.PI * 2;
    // Groove curve: pure sine on the beat — smooth, no sharp harmonics
    const groove = Math.sin(phase3);

    let breathR: number, breathI: number;

    // Sweep energy modulates breathing
    const energyBoost = 1.0 + 3.0 * Math.tanh(sweepEnergy * 0.5);

    if (currentSweep) {
      // Sweep along axis between anchor and sweepTo
      const dx = currentSweep.real - targetCenter.real;
      const dy = currentSweep.imag - targetCenter.imag;
      // Groove along sweep axis + organic drift
      breathR = dx * 1.2 * groove * energyBoost
              + dx * 0.5 * Math.sin(phase2);
      breathI = dy * 1.2 * groove * energyBoost
              + dy * 0.5 * Math.cos(phase2);
    } else {
      const breathAmp = (0.025 + currentTension * 0.04) * energyBoost;
      breathR = breathAmp * (0.6 * groove + 0.4 * Math.sin(phase));
      breathI = breathAmp * Math.cos(phase2);
    }

    // --- Note-attack momentum + sweep energy + bass weight ---
    const noteLookback = 0.05;
    for (let i = lastNoteIndex + 1; i < notes.length; i++) {
      const n = notes[i];
      if (n.time > currentTime) break;
      if (n.time < currentTime - noteLookback) { lastNoteIndex = i; continue; }
      if (n.isDrum) { lastNoteIndex = i; continue; }

      lastNoteIndex = i;
      noteCount++;

      // Cold start: first notes get extra momentum to kick off the visualization
      const coldBoost = noteCount <= coldStartNotes
        ? 1.0 + (coldStartMultiplier - 1.0) * (1.0 - noteCount / coldStartNotes)
        : 1.0;

      const interval = ((n.midi % 12) - currentPalette + 12) % 12;
      const angle = (interval / 12) * Math.PI * 2;
      const octaveBoost = Math.max(0.6, Math.min(1.3, (n.midi - 48) / 36));
      // No direct velocity kicks — all note energy flows into sweep energy
      // which modulates breathing amplitude smoothly via decay envelope
      sweepEnergy += 0.3 * n.velocity * octaveBoost * coldBoost;

      // Bass notes (below C3 = midi 48) add heaviness
      if (n.midi < 48) {
        const bassDepth = (48 - n.midi) / 24; // 0-1 for C1-C3 range
        bassWeight += 0.5 * n.velocity * (0.5 + bassDepth);
      }
    }

    // Bass weight adds iterations (denser, more detailed when heavy)
    const iterBase = Math.round(120 + currentTension * 60 + bassWeight * 20);

    // --- Find highest and lowest sounding notes for tint ---
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

    return {
      cReal: currentCenter.real + breathR,
      cImag: currentCenter.imag + breathI,
      fractalType: currentFractalType,
      phoenixP: currentPhoenixP,
      paletteIndex: currentPalette,
      baseIter: iterBase,
      melodyPitchClass: highestMidi >= 0 ? highestMidi % 12 : -1,
      melodyVelocity: highestVel,
      bassPitchClass: lowestMidi < 999 ? lowestMidi % 12 : -1,
      bassVelocity: lowestVel,
    };
  },

  reset() {
    currentCenter = { ...defaultAnchor };
    targetCenter = { ...defaultAnchor };
    velocityR = 0;
    velocityI = 0;
    currentTension = 0;
    targetTension = 0;
    currentPalette = 4;
    currentFractalType = defaultAnchor.type;
    currentPhoenixP = -0.5;
    currentSweep = undefined;
    lastNoteIndex = -1;
    noteCount = 0;
    phase = 0;
    phase2 = 0;
    phase3 = 0;
    beatPhase = 0;
    lastChordIndex = -1;
    sweepEnergy = 0;
    bassWeight = 0;
  },
};
