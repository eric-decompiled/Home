# Visual Effects System

Effects are organized into layer slots (mutually exclusive within each slot). Each effect implements `VisualEffect` interface from `src/effects/effect-interface.ts`. Layers composite via configurable blend modes (screen, multiply, overlay, etc.) and per-layer opacity.

## Layer Slots

| Slot | Purpose | Effects |
|------|---------|---------|
| **Background** | Full-canvas animated backdrop | Chladni (default), Domain Warp, Waves, Flow Field |
| **Foreground** | Main visual element | Note Spiral (default), Fractal, Piano Roll, Tonnetz |
| **Overlay** | Post-process effects | Kaleidoscope, Theory Bar |
| **Melody** | Melodic visualization | Melody Aurora, Melody Web, Melody Clock |
| **Bass** | Bass note tracking | Bass Clock (default), Bass Web |

## Presets

| Preset | Background | Foreground | Overlay | Melody | Bass |
|--------|------------|------------|---------|--------|------|
| **Cosmic Spiral** (default) | Flow Field | Note Spiral | — | — | Bass Clock |
| **Warp Prism** | Chladni | Note Spiral (ring) | Kaleidoscope | — | Bass Clock |
| **Fractal Dance** | Domain Warp | Fractal | Theory Bar | — | — |
| **Piano** | Flow Field | Piano Roll | Theory Bar | — | — |

## Effect Catalog

### Tonnetz
`src/effects/tonnetz.ts` — Hexagonal lattice visualization of harmonic relationships based on neo-Riemannian music theory. Each node represents a pitch class (0-11), positioned using axial coordinates where `pc = (7*q + 4*r) mod 12`. Three axes encode consonant intervals: horizontal = perfect fifths, diagonals = major/minor thirds. Active pitch classes glow when notes play. Current chord highlighted as a filled triangle connecting root, third, and fifth. Chord progression path drawn as dashed line between recent chord triangles. Pulses on beat/bar boundaries. Colors derived from song key palette.

### Laser Hockey
`src/effects/laser-hockey.ts` — Interactive Tonnetz lattice with laser beams and air hockey puck. Beams shoot from active pitch class nodes toward a gliding puck target, storing the puck's position at launch (non-homing). Features:
- **Heavy puck physics**: Very high mass simulation—small impulses, high friction (`exp(-2.5 * dt)`), low max velocity (80). Feels like pushing a bowling ball on ice.
- **Music-driven drift**: Random direction bumps on beats (1.5), bars (2.5), melody (0.8), kick (2), snare (1.5). Accumulates slowly for gentle wandering.
- **Mouse interaction**: Repulsion field pushes puck away (radius 120, strength 200). Click and drag to grab, flick to throw with velocity transfer.
- **Beam collision**: Actual geometric hit detection—beam tips check distance to current puck position. Hits register marks on puck, trigger flash, and give tiny momentum bump.
- **Hit marks**: Accumulate on puck surface with 8-second decay, colored by pitch class.
- **Transparent compositing**: No background fill, layers over Domain Warp or other backgrounds.

### Wave Interference
`src/effects/wave-interference.ts` — WebGL ripple simulation. Drops appear at melody onsets positioned by pitch class (clock position) and octave (radius). Per-note coloring from chromatic palette. Models wave reflection off boundaries via ghost sources with phase inversion. Configurable decay, frequency, reflection amount.

### Domain Warp
`src/effects/domain-warp.ts` — WebGL layered fbm warped through itself. Per-degree anchors control warp amount/scale/flow. Uses **spatial wave tank physics**:
- **Bass wave**: pushes from bottom (low notes below middle C, bass line)
- **Melody wave**: pushes from sides (high notes, melody, harmony)
- **Chord quality modulation**: dim/aug = rough texture, 7ths = sophisticated detail, major = clean
- **Pitch-weighted energy**: higher notes contribute more energy (1x at MIDI 60, 2x at 84, 3x at 108)
- **Warp ceiling**: capped at 6.5 to prevent overdriving on intense songs

### Spirograph
`src/effects/spirograph.ts` — Parametric curve drawing with music-reactive parameters.

### Note Spiral
`src/effects/note-spiral.ts` — All active MIDI voices rendered as glowing orbs on a spiral covering full piano range (MIDI 21-108, A0 to C8). Pitch class determines angle (root at 12 o'clock), with **configurable tightness** (power curve, default 1.25) for visual spacing. Shows polyphonic voicing with **Bezier curve trails** between consecutive notes—tangent-based control points create smooth curves. Trail behavior: **stepwise motion** (1-3 semitones) follows the spiral curve, larger intervals draw straight lines. Trail TTL configurable (default 48 segments, decay 0.08). Sine wave twist (`0.05 * sin(fromRoot)`) prevents angular discontinuity at key boundaries. **Firefly particles** (default shape) dance around active notes. **Long note visibility**: decay rate 0.4-0.7 gives ~2 second half-life so notes linger on spiral. Center shifted down 4% for better screen balance.

### Melody Web
`src/effects/melody-web.ts` — Network graph of 12 pitch classes arranged in a circle as dots. Larger dots for diatonic scale degrees, smaller for chromatic. Edges connect recently-played notes, building a web of melodic relationships. Edge decay 0.9995 (~23s half-life at 60fps) with smoothstep alpha curve. Melody trail shows recent note sequence.

### Melody Clock
`src/effects/melody-clock.ts` — Openwork Breguet/pomme-style clock hand tracking individual melody notes. Drawn as stroked outlines with transparent interiors (filigree style). Features: volute scrollwork, open ellipse moon window, teardrop, fleur-de-lis tip with three petals, crescent tail. Roman numeral markers at diatonic positions. Hand direction tracks actual MIDI pitch—ascending melody goes clockwise, descending counter-clockwise. Uses GSAP with **0.5 beat duration** and power2.out ease for smooth motion with some heft. Arc trail shows recent sweep path.

### Bass Clock
`src/effects/bass-clock.ts` — Industrial station-clock style hand tracking **chord root** (not individual bass notes) for harmonic stability. Features:
- **Heavy tapered hand** with circular counterweight and pommel glow
- **Cutout circles** aligned to tonic's octave 2/3/4 positions on spiral (calculated dynamically via spiralPos each frame for exact alignment)
- **Roman numeral markers** on outer ring, including chromatic degrees (♭II, ♯IV, etc.) with fade-out animation
- **Windup animation**: Pulls back 1/36 of movement over 3/4 beat before arriving at target chord
- **Arc trail** with comet-tail gradient, brightness modulated by audio loudness (EMA smoothed)
- **Fixed hand length at 0.95** (outer layer), initializes to song key before first chord detected
- **GSAP timeline** for two-phase motion: anticipation pullback then smooth arrival

### Piano Roll
`src/effects/piano-roll.ts` — Falling notes visualization with piano keyboard at bottom. Notes fall from above and land on keys when they play. Features:
- **Lookahead system**: Uses `upcomingNotes` from MusicParams for 4-second note preview
- **Octave-aware coloring**: Low notes use darker palette stops, high notes use brighter stops
- **Key depression**: Keys physically press down when notes hit, with smooth return
- **Groove-synced glow**: Notes and keys pulse subtly with beatGroove/barGroove (20% swing)
- **Multi-layer note rendering**: Body gradient, cylindrical shading, highlight, neon border, leading edge
- **Particle system**: Sparks emit on note impact, during sustain, and on release (capped at 50 particles)
- **Piano sound mode**: Toggle to force all instruments to piano (via program change)
- **Performance optimized**: No shadow blur (uses layered fills), particles are simple circles

## MusicParams Interface

Shared data passed to all effects each frame (`src/effects/effect-interface.ts`):

- **Timing**: `currentTime`, `dt`, `bpm`, `beatDuration`, `beatsPerBar`, `beatPosition` (0-1), `barPosition` (0-1), `beatIndex`
- **Groove Curves**: `beatAnticipation`, `beatArrival`, `beatGroove`, `barAnticipation`, `barArrival`, `barGroove` (all 0-1)
- **Lookahead**: `nextBeatIn`, `nextBarIn` (seconds until next boundary)
- **Harmony**: `chordRoot`, `chordDegree`, `chordQuality`, `tension`, `key`, `keyMode`, `keyRotation` (animated radians for modulation), `onModulation`
- **Melody**: `melodyPitchClass`, `melodyMidiNote`, `melodyVelocity`, `melodyOnset`
- **Bass**: `bassPitchClass`, `bassMidiNote`, `bassVelocity`
- **Drums**: `kick`, `snare`, `hihat` (boolean onsets)
- **Multi-voice**: `activeVoices[]` (all sounding notes with track info), `tracks[]`
- **Lookahead**: `upcomingNotes[]` (notes within 4-second window, with `timeUntil`, `duration`, `midi`, `velocity`)
- **Color**: `paletteIndex`

## Animation Patterns

### Discrete Events (chord changes, note onsets)
Use GSAP with beat-relative timing:
```typescript
gsap.to(this, {
  targetValue: anchor.value,
  duration: beatDur * 1.0,
  ease: 'power2.inOut',
  overwrite: true,
});
```

### Continuous Physics (fluid motion, energy response)
Use wave tank model:
```typescript
// Wave with momentum - push creates motion that persists
const push = energy * 5.0;
this.waveVel += (push - k * this.wave - damping * this.waveVel) * dt;
this.wave += this.waveVel * dt;
```

### Energy Accumulation
Use cascaded smoothing:
```typescript
// Fast accumulator
this.energy += onsetEnergy;
this.energy *= Math.exp(-3.0 * dt);
// Slow follower (the "wave")
this.smoothed += (this.energy - this.smoothed) * rate * dt;
```
