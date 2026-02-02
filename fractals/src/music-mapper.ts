import type { ChordEvent, DrumHit, NoteEvent } from './midi-analyzer.ts';

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
//       4=Tricorn, 5=Phoenix, 6=Celtic, 7=Lambda, 8=PerpBurn, 9=Buffalo

// --- Mixed anchors: cross-family degree assignments ---

const anchors: Record<number, CValue> = {
  0: { real: -0.7527, imag: -1.1378, type: 3,
       sweepTo: { real: -0.6201, imag: -1.1378 } },  // Burning Ship, radius=0.1326
  1: { real: -0.7527, imag: -1.1378, type: 3,
       sweepTo: { real: -0.6201, imag: -1.1378 } },  // Burning Ship, radius=0.1326
  2: { real: -1.6544, imag: -0.0925, type: 3,
       sweepTo: { real: -1.5279, imag: -0.0925 } },  // Burning Ship, radius=0.1265
  3: { real: -0.9500, imag: 0.2503, type: 6,
       sweepTo: { real: -0.8061, imag: 0.2503 } },  // Celtic, radius=0.1439
  4: { real: -1.0375, imag: -0.3443, type: 6,
       sweepTo: { real: -0.9260, imag: -0.3443 } },  // Celtic, radius=0.1115
  5: { real: 0.5740, imag: -0.5472, type: 9,
       sweepTo: { real: 0.6758, imag: -0.5472 } },  // Buffalo, radius=0.1019
  6: { real: 1.2885, imag: -1.0817, type: 9,
       sweepTo: { real: 1.3735, imag: -1.0817 } },  // Buffalo, radius=0.0850
  7: { real: 0.8324, imag: -1.3553, type: 3,
       sweepTo: { real: 1.0106, imag: -1.3553 } },  // Burning Ship, radius=0.1781
};

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
    sweepTo: anchor.sweepTo,
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

let lastNoteIndex = -1;

// Cold start: first notes get extra energy to kick things off
let noteCount = 0;
const coldStartNotes = 12;  // first N notes get boosted
const coldStartMultiplier = 3.0; // extra kick factor

// Underdamped spring — two independent 1D oscillators
let springRealPos = 0;   // displacement from equilibrium
let springRealVel = 0;   // velocity (units: c-space / second)
let springImagPos = 0;
let springImagVel = 0;

// Spring parameters (adapted by tempo in setTempo)
let omega0 = 4.5;        // natural frequency rad/s (~0.7 Hz)
const zeta = 0.35;       // damping ratio — ~3 visible bounces

// Beat-driven rotation
let rotationAngle = 0;
let rotationVelocity = 0;
let rotationFriction = 1.2;

// Beat tracking (set in setTempo)
let beatDuration = 0.5;
let beatsPerBar = 4;

// Drum processing
let lastDrumIndex = -1;

let intensityEnergy = 0; // total energy, expands radius, decays fast ~0.4s

// Exploration radius derived from |anchor - sweepTo|
let baseRadius = 0.03;

// Exponential snap — fast, direct transition to new chord target
const snapRate = 8.0;  // ~0.12s to 90% — responsive chord changes

let smoothingRate = 6.0;
let lastChordIndex = -1;

export const musicMapper = {
  setTempo(bpm: number, timeSig?: [number, number]) {
    beatDuration = 60 / bpm;
    beatsPerBar = timeSig ? timeSig[0] : 4;
    // Adapt spring: faster songs → stiffer spring
    omega0 = Math.max(3.0, Math.min(6.0, 3.5 + (bpm - 60) / 60));
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

      // Compute exploration radius from |anchor - sweepTo|
      if (center.sweepTo) {
        const dx = center.sweepTo.real - center.real;
        const dy = center.sweepTo.imag - center.imag;
        baseRadius = Math.sqrt(dx * dx + dy * dy);
      } else {
        baseRadius = 0.03;
      }
    }

    // --- Decay intensity energy ---
    intensityEnergy *= Math.exp(-1.7 * dt);  // ~0.4s half-life
    if (intensityEnergy > 4.0) intensityEnergy = 4.0;

    // --- Exponential snap toward target ---
    const snapDecay = 1 - Math.exp(-snapRate * dt);
    currentCenter.real += (targetCenter.real - currentCenter.real) * snapDecay;
    currentCenter.imag += (targetCenter.imag - currentCenter.imag) * snapDecay;

    // Tension smoothing
    const decay = 1 - Math.exp(-smoothingRate * dt);
    currentTension += (targetTension - currentTension) * decay;

    // --- Process new notes → spring impulses ---
    const noteLookback = 0.05;
    const impulseScale = baseRadius * 3.0;
    for (let i = lastNoteIndex + 1; i < notes.length; i++) {
      const n = notes[i];
      if (n.time > currentTime) break;
      if (n.time < currentTime - noteLookback) { lastNoteIndex = i; continue; }
      if (n.isDrum) { lastNoteIndex = i; continue; }

      lastNoteIndex = i;
      noteCount++;

      // Cold start: first notes get extra momentum
      const coldBoost = noteCount <= coldStartNotes
        ? 1.0 + (coldStartMultiplier - 1.0) * (1.0 - noteCount / coldStartNotes)
        : 1.0;

      const v = n.velocity * coldBoost;
      if (n.midi < 60) {
        // Bass → real axis, direction alternates by pitch parity
        const dir = (n.midi % 2 === 0) ? 1.0 : -1.0;
        springRealVel += dir * v * 0.7 * impulseScale;
      } else {
        // Melody → imag axis, direction alternates by pitch parity
        const dir = (n.midi % 2 === 0) ? 1.0 : -1.0;
        springImagVel += dir * v * 0.8 * impulseScale;
      }
      intensityEnergy += v * 0.25;
    }

    // --- Process drum hits → rotation + spring kicks ---
    for (let i = lastDrumIndex + 1; i < drums.length; i++) {
      const d = drums[i];
      if (d.time > currentTime) break;
      if (d.time < currentTime - noteLookback) { lastDrumIndex = i; continue; }

      lastDrumIndex = i;

      // Compute beat position within bar for hi-hat alternation
      const beatInBar = Math.floor((d.time % (beatDuration * beatsPerBar)) / beatDuration);

      if (d.type === 'kick') {
        rotationVelocity += 0.5;
        springRealVel += baseRadius * 1.5;
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

    // --- Spring integration (semi-implicit Euler) ---
    const omega0sq = omega0 * omega0;
    const damping = 2 * zeta * omega0;

    // Real axis
    const accelR = -damping * springRealVel - omega0sq * springRealPos;
    springRealVel += accelR * safeDt;
    springRealPos += springRealVel * safeDt;

    // Imag axis
    const accelI = -damping * springImagVel - omega0sq * springImagPos;
    springImagVel += accelI * safeDt;
    springImagPos += springImagVel * safeDt;

    // Iterations: tension + intensity
    const iterBase = Math.round(120 + currentTension * 60 + intensityEnergy * 15);

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
      cReal: currentCenter.real + springRealPos,
      cImag: currentCenter.imag + springImagPos,
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
    lastNoteIndex = -1;
    noteCount = 0;
    springRealPos = 0;
    springRealVel = 0;
    springImagPos = 0;
    springImagVel = 0;
    intensityEnergy = 0;
    baseRadius = 0.03;
    lastChordIndex = -1;
    rotationAngle = 0;
    rotationVelocity = 0;
    lastDrumIndex = -1;
  },
};
