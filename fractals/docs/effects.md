# Visual Effects System

Effects are organized into layer slots (mutually exclusive within each slot). Each effect implements `VisualEffect` interface from `src/effects/effect-interface.ts`. Layers composite via configurable blend modes (screen, multiply, overlay, etc.) and per-layer opacity.

## Layer Slots

| Slot | Purpose | Effects |
|------|---------|---------|
| **Background** | Full-canvas animated backdrop | Chladni, Domain Warp, Waves, Flow Field, Starfield |
| **Foreground** | Main visual element | Graph Chain, Note Spiral, Fractal, Piano Roll, Tonnetz |
| **Overlay** | Post-process effects | Kaleidoscope |
| **Melody** | Melodic visualization | Melody Aurora, Melody Web, Melody Clock |
| **Bass** | Bass note tracking | Bass Clock, Bass Web |
| **HUD** | Informational overlay | Theory Bar |

## Presets

| Preset | Background | Foreground | Overlay | Melody | Bass | HUD |
|--------|------------|------------|---------|--------|------|-----|
| **Warp** | Chladni | Note Spiral (ring,trails) | Kaleidoscope | Melody Aurora | Bass Clock | — |
| **Clock** | Starfield | Note Spiral | — | Melody Clock | Bass Clock | — |
| **Stars** (default) | Starfield | Note Star | — | — | Bass Fire | — |
| **Fractal** | Flow Field | Fractal | — | — | — | Theory Bar |
| **Chain** | — | Graph Chain | — | — | — | Theory Bar |
| **Piano** | Flow Field | Piano Roll | — | — | — | — |

## Effect Catalog

### Graph Chain
`src/effects/graph-chain.ts` — Force-directed graph that grows methodically with the music, creating a unique chain structure by song's end. Inspired by [znah/graphs](https://github.com/znah/graphs). Features:

- **Melody chain**: Sequential melody notes (C5+) connect as a spine, creating a clear melodic thread through time
- **Time-windowed Tonnetz**: Nodes connect only if they're perfect 4ths/5ths apart AND born within 1 bar of each other—creates local harmonic clusters without distant tangles
- **Harmonic affinity physics**: Consonant intervals attract (P4/P5 0.5x, thirds 0.7x repulsion), dissonant intervals repel more (m2 1.4x, tritone 1.5x, unison 1.8x)
- **Lure drag**: Oldest node is dragged rightward based on BPM, structure trails behind like a fishing lure through water
- **Register gravity**: Bass nodes sink, melody nodes rise, mid floats—creates vertical stratification
- **Live node glow**: Nodes < 4 bars old glow brighter with white-hot cores
- **Half-bar debounce**: One node per pitch class per register per half-bar allows arpeggios to spawn multiple notes
- **Velocity cap**: Max velocity of 15 prevents explosive motion when nodes spawn on top of each other
- **Minimum repulsion distance**: Nodes closer than 20px use clamped distance to prevent extreme forces
- **Disconnected node fade**: Nodes without edges fade out after 4 bars TTL
- **Curved edges**: Subtle bezier bow with soft glow, blended colors
- **Auto-zoom**: Camera follows the drifting structure, only zooms out (never jarring zoom-in)

See `research/graph-evolution.md` for design notes and music mapping theory.

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

### Note Spiral
`src/effects/note-spiral.ts` — All active MIDI voices rendered as glowing orbs on a spiral covering full piano range (MIDI 21-108, A0 to C8). Pitch class determines angle (root at 12 o'clock), with **configurable tightness** (power curve, default 1.25) for visual spacing. Shows polyphonic voicing with **Bezier curve trails** between consecutive notes—tangent-based control points create smooth curves. Trail behavior: **stepwise motion** (1-3 semitones) follows the spiral curve, larger intervals draw straight lines. Trail TTL configurable (default 48 segments, decay 0.08). Sine wave twist (`0.05 * sin(fromRoot)`) prevents angular discontinuity at key boundaries. **Firefly particles** (default shape) dance around active notes. **Long note visibility**: decay rate 0.4-0.7 gives ~2 second half-life so notes linger on spiral. Center shifted down 4% for better screen balance. Uses [shared shape system](#shared-shapes-note-spiral--note-star).

### Note Star
`src/effects/note-star.ts` — Traveling star particles that spawn on note onsets and spiral inward toward center. **Stars and beams always render**; additional shapes are optional via the [shared shape system](#shared-shapes-note-spiral--note-star). Features:
- **Star heads**: Multi-layer glow with soft outer halo, colored core, and white highlight
- **Sustained note beams**: Notes held 2+ beats draw solid light beams following the spiral from spawn point to head position
- **Anticipation pulses**: Beat-synced flashes show upcoming notes before they play
- **Groove-driven pulsing**: Size and brightness modulate with beatGroove/barGroove (reduced variability for softer look)
- **BPM-aware travel speed**: Stars travel slightly slower at slow tempos, faster at high tempos (`bpm^0.25` scaling)
- **Attack/sustain coloring**: Hot white flash on note onset, warm saturated color during sustain

### Shared Shapes (Note Spiral + Note Star)

Both Note Spiral and Note Star support a **shared shape system** via multi-toggle config. These optional visual decorations render at note/star positions:

| Shape | Description |
|-------|-------------|
| **ring** | Expanding circular ripples (3 concentric rings with fade) |
| **trails** | Fading gradient line trailing behind moving notes |
| **spark** | Electric crackling lines radiating outward (jagged paths) |
| **firefly** | Dancing particles that orbit notes, beat-synced with fade in/out |

**Defaults:**
- Note Spiral: `firefly` enabled (solo floating particles work well on spiral)
- Note Star: no shapes (stars + beams are the core effect)

**Usage:** Multi-toggle buttons in effect config panel. Multiple shapes can be enabled simultaneously for layered effects.

### Melody Web
`src/effects/melody-web.ts` — Network graph of 12 pitch classes arranged in a circle as dots. Larger dots for diatonic scale degrees, smaller for chromatic. Edges connect recently-played notes, building a web of melodic relationships. Edge decay 0.9995 (~23s half-life at 60fps) with smoothstep alpha curve. Melody trail shows recent note sequence.

### Melody Clock
`src/effects/melody-clock.ts` — Industrial station-clock style hand tracking individual melody notes. **Unified design with Bass Clock**: tapered rectangle hand with cutout holes at octave positions, counterweight with inner circle, comet-tail arc trail with loudness modulation. **Note name markers** (C, C#, D, etc.) at each pitch class position with glow on current note. Hand direction tracks actual MIDI pitch—ascending melody goes clockwise, descending counter-clockwise. Uses **compass physics** (spring-damper system, springK=12, damping=5) for weighty motion with natural overshoot and settle.

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

### Note Anticipation (Power Law Scaling)

Both Note Spiral and Note Star show upcoming notes before they play, with brightness ramping up to peak at the actual play time. The lookahead window uses a **power law fit** based on empirical testing (R² = 0.87):

| BPM | Lookahead (beats) | Visible Window | Example Song |
|-----|-------------------|----------------|--------------|
| 60 | 0.61 | ~610ms | Slow ballads |
| 82 | 0.50 | ~365ms | FF Prelude |
| 112 | 0.41 | ~220ms | Don't Stop Believing |
| 120 | 0.38 | ~191ms | Standard pop |
| 128 | 0.37 | ~173ms | Sweet Child O' Mine |
| 180 | 0.29 | ~97ms | Fast EDM |
| 200 | 0.27 | ~80ms (min) | Extreme tempos |

**Key features:**
- **Power law curve**: `lookahead = 10.0 * bpm^(-0.68)` gives smooth, perceptually-correct scaling
- **Minimum visibility**: 80ms guaranteed window even at extreme BPMs (~5 frames at 60fps)
- **Exponential brightness**: Notes stay dim until close to play, then rapidly brighten
- **Small lower bound (2.5%)**: Tight gap to onset reduces visual discontinuity
- **Per-pitch-class buffer**: Up to 4 notes per pitch class—allows octave doublings and chord voicings while preventing spam

Implementation:
```typescript
// Power law fit from empirical testing (R² = 0.87)
// Tested on: FF Prelude, To Zanarkand, Don't Stop Believing, Sweet Child O' Mine
const lookahead = 10.0 * Math.pow(bpm, -0.68);
const lowerBound = lookahead / 40;  // 2.5% - tight gap to onset

// Ensure minimum visibility window (80ms)
const minVisibleSec = 0.08;
if (lookahead - lowerBound < minVisibleSec) {
  lookahead = lowerBound + minVisibleSec;
}

// Per-pitch-class buffer (load shedding)
const MAX_PER_PITCH_CLASS = 4;
const pitchClassCount = new Map<number, number>();
for (const n of filtered) {
  const pc = n.midi % 12;
  const count = pitchClassCount.get(pc) || 0;
  if (count < MAX_PER_PITCH_CLASS) {
    accepted.push(n);
    pitchClassCount.set(pc, count + 1);
  }
}

// Exponential brightness ramp (dim at start, bright at play)
const t = 1 - note.timeUntil / note.lookahead;
const alpha = (Math.exp(t * 3) - 1) / (Math.E ** 3 - 1);
```
