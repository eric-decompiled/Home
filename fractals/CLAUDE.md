# Fractured Jukebox

A layered music visualization system that transforms MIDI files into synchronized visual experiences. Combines fractal rendering, physics simulations, and procedural graphics—all driven by real-time harmonic analysis. Plays MIDI through a SoundFont synthesizer while mapping musical structure (key, chords, melody, bass, drums) to visual parameters across multiple composited effect layers.

## Architecture

Vanilla TypeScript + Vite, no framework. Matches sibling projects (lissajous, resonator, sound-synth).

| File | Role |
|------|------|
| `src/main.ts` | App shell: HTML, event listeners, render loop, UI, layer compositor |
| `src/midi-analyzer.ts` | MIDI parsing (@tonejs/midi), key detection, bar-level chord detection |
| `src/music-mapper.ts` | Maps musical analysis → fractal parameters via orbit-based beat motion + beat-driven rotation |
| `src/beat-sync.ts` | Generalized beat tracking abstraction with tempo change support |
| `src/fractal-engine.ts` | Multi-type fractal renderer with precomputed color LUT and post-composite overlays |
| `src/fractal-worker.ts` | Pure per-pixel fractal computation in Web Workers (no color effects) |
| `src/audio-player.ts` | MIDI playback via spessasynth_lib (SoundFont-based AudioWorklet synthesizer) |
| `src/effects/` | Visual effect layers (see below) |

## Visual Effects System

Effects are organized into layer slots (mutually exclusive within each slot). Each effect implements `VisualEffect` interface from `src/effects/effect-interface.ts`. Layers composite via configurable blend modes (screen, multiply, overlay, etc.) and per-layer opacity.

### Layer Slots

| Slot | Purpose | Effects |
|------|---------|---------|
| **Background** | Full-canvas animated backdrop | Domain Warp (default), Waves, Chladni, Flow Field |
| **Foreground** | Main visual element | Laser Hockey (default), Tonnetz, Fractal, Spirograph, Note Spiral |
| **Overlay** | Post-process effects | Pitch Histogram, Kaleidoscope |
| **Melody** | Melodic visualization | Melody Aurora, Melody Web, Chord Web, Melody Clock |
| **Bass** | Bass note tracking | Bass Web, Bass Clock |

### Effect Catalog

**Tonnetz** (`src/effects/tonnetz.ts`): Hexagonal lattice visualization of harmonic relationships based on neo-Riemannian music theory. Each node represents a pitch class (0-11), positioned using axial coordinates where `pc = (7*q + 4*r) mod 12`. Three axes encode consonant intervals: horizontal = perfect fifths, diagonals = major/minor thirds. Active pitch classes glow when notes play. Current chord highlighted as a filled triangle connecting root, third, and fifth. Chord progression path drawn as dashed line between recent chord triangles. Pulses on beat/bar boundaries. Colors derived from song key palette.

**Laser Hockey** (`src/effects/laser-hockey.ts`): Interactive Tonnetz lattice with laser beams and air hockey puck. Beams shoot from active pitch class nodes toward a gliding puck target, storing the puck's position at launch (non-homing). Features:
- **Heavy puck physics**: Very high mass simulation—small impulses, high friction (`exp(-2.5 * dt)`), low max velocity (80). Feels like pushing a bowling ball on ice.
- **Music-driven drift**: Random direction bumps on beats (1.5), bars (2.5), melody (0.8), kick (2), snare (1.5). Accumulates slowly for gentle wandering.
- **Mouse interaction**: Repulsion field pushes puck away (radius 120, strength 200). Click and drag to grab, flick to throw with velocity transfer.
- **Beam collision**: Actual geometric hit detection—beam tips check distance to current puck position. Hits register marks on puck, trigger flash, and give tiny momentum bump.
- **Hit marks**: Accumulate on puck surface with 8-second decay, colored by pitch class.
- **Transparent compositing**: No background fill, layers over Domain Warp or other backgrounds.

**Wave Interference** (`src/effects/wave-interference.ts`): WebGL ripple simulation. Drops appear at melody onsets positioned by pitch class (clock position) and octave (radius). Per-note coloring from chromatic palette. Models wave reflection off boundaries via ghost sources with phase inversion. Configurable decay, frequency, reflection amount.

**Domain Warp** (`src/effects/domain-warp.ts`): WebGL layered fbm warped through itself. Per-degree anchors control warp amount/scale/flow. Uses **spatial wave tank physics**:
- **Bass wave**: pushes from bottom (low notes below middle C, bass line)
- **Melody wave**: pushes from sides (high notes, melody, harmony)
- **Chord quality modulation**: dim/aug = rough texture, 7ths = sophisticated detail, major = clean
- **Pitch-weighted energy**: higher notes contribute more energy (1x at MIDI 60, 2x at 84, 3x at 108)
- **Warp ceiling**: capped at 6.5 to prevent overdriving on intense songs

**Spirograph** (`src/effects/spirograph.ts`): Parametric curve drawing with music-reactive parameters.

**Note Spiral** (`src/effects/note-spiral.ts`): All active MIDI voices rendered as glowing orbs on a spiral covering full piano range (MIDI 21-108, A0 to C8). Pitch class determines angle (root at 12 o'clock), with **sqrt radius curve** for even visual spacing across octaves (low notes center, high notes outer). Shows polyphonic voicing with connecting trails between consecutive notes. Trail behavior: **stepwise motion** (1-3 semitones) follows the spiral curve, while larger intervals draw straight lines. Longer trail TTL (decay 0.15) keeps connections visible. Flashlight beams project outward from active notes — bass notes get wide/short/dim beams, treble notes get narrow/long/bright beams.

**Melody Web** (`src/effects/melody-web.ts`): Network graph of 12 pitch classes arranged in a circle as dots. Larger dots for diatonic scale degrees, smaller for chromatic. Edges connect recently-played notes, building a web of melodic relationships. Edge decay 0.9995 (~23s half-life at 60fps) with smoothstep alpha curve. Melody trail shows recent note sequence.

**Melody Clock** (`src/effects/melody-clock.ts`): Openwork Breguet/pomme-style clock hand tracking individual melody notes. Drawn as stroked outlines with transparent interiors (filigree style). Features: volute scrollwork, open ellipse moon window, teardrop, fleur-de-lis tip with three petals, crescent tail. Roman numeral markers at diatonic positions. Hand direction tracks actual MIDI pitch—ascending melody goes clockwise, descending counter-clockwise. Uses GSAP with **0.5 beat duration** and power2.out ease for smooth motion with some heft. Arc trail shows recent sweep path.

**Bass Clock** (`src/effects/bass-clock.ts`): Industrial station-clock style hand tracking **chord root** (not individual bass notes) for harmonic stability. Heavy tapered hand with circular counterweight. Roman numeral markers on outer ring (just outside note spiral radius). **Fixed hand length at 0.95** (outer layer). Uses GSAP with full beat duration and power2.inOut ease for slow, weighty motion.

### MusicParams Interface

Shared data passed to all effects each frame (`src/effects/effect-interface.ts`):

- **Timing**: `currentTime`, `dt`, `bpm`, `beatDuration`, `beatsPerBar`, `beatPosition` (0-1), `barPosition` (0-1), `beatIndex`
- **Harmony**: `chordRoot`, `chordDegree`, `chordQuality`, `tension`, `key`, `keyMode`, `keyRotation` (animated radians for modulation), `onModulation`
- **Melody**: `melodyPitchClass`, `melodyMidiNote`, `melodyVelocity`, `melodyOnset`
- **Bass**: `bassPitchClass`, `bassMidiNote`, `bassVelocity`
- **Drums**: `kick`, `snare`, `hihat` (boolean onsets)
- **Multi-voice**: `activeVoices[]` (all sounding notes with track info), `tracks[]`
- **Color**: `paletteIndex`

## Audio Playback

Uses `spessasynth_lib` with `WorkletSynthesizer` + `Sequencer`. SoundFont: `public/TimGM6mb.sf2` (5.7MB GM bank). AudioWorklet processor: `public/spessasynth_processor.min.js`.

Key design decisions:
- **Deferred init**: AudioContext and SoundFont loading happen on first `play()` click (user gesture required). `loadMidi()` just stashes the buffer.
- **Time sync**: Uses `sequencer.currentHighResolutionTime` for smooth visualization sync.
- Do NOT pass `oneOutput` config to WorkletSynthesizer (causes channel count errors).
- Worklet module path must be absolute: `new URL('/spessasynth_processor.min.js', import.meta.url).href`

## Music Analysis Pipeline

`midi-analyzer.ts` processes MIDI files into a `MusicTimeline`:

1. **Global key detection** — Krumhansl-Schmuckler algorithm on full pitch class histogram weighted by `duration * velocity`
2. **Local key / modulation detection** — Windowed K-S with hysteresis. Tempo-based windows (2 bars window, 0.5 bar hop) for musically meaningful detection that scales with tempo. Returns `KeyRegion[]` with `{startTime, endTime, key, mode, confidence}`.
3. **Bar-level chord detection** — weighted pitch class profiles per bar, matched against chord templates with diatonic bias. Chord timestamps use earliest actual note onset within the bar. Per-bar (not per-beat) prevents excessive chord thrashing.
4. **Harmonic metadata** — each `ChordEvent` includes: root (pitch class 0-11), quality (major/minor/dom7/min7/dim/aug), degree (1-7 relative to key), pre-computed tension (0-1), and next degree (look-ahead)

Tension computed from harmonic function: `degreeTension[degree] + qualityTensionBoost[quality]`. Tonic (I) = 0, dominant (V) = 0.7, leading tone (vii) = 0.85.

**Test file**: `circle-of-fifths.mid` traverses all 12 keys (C→G→D→A→E→B→F#→Db→Ab→Eb→Bb→F→C) to verify modulation detection.

## Beat Sync System

`beat-sync.ts` provides a generalized beat tracking abstraction based on MIR research. Supports dynamic tempo and time signature changes.

### BeatState Interface

| Field | Description |
|-------|-------------|
| `beatPhase` | 0-1 position within current beat |
| `barPhase` | 0-1 position within current bar |
| `bpm`, `beatDuration`, `beatsPerBar` | Current tempo/timing |
| `beatIndex` | Which beat in bar (0-indexed) |
| `onBeat`, `onBar` | True on frame when boundary crossed |
| `stability` | 0-1 confidence in beat grid |
| `nextBeatIn`, `nextBarIn` | Seconds until next boundary (for anticipation) |

### Accurate Phase with Tempo Changes

Uses precomputed cumulative beat counts at each tempo change point. Phase is calculated as:
```typescript
totalBeats = segment.startBeat + elapsedInSegment * (bpm / 60)
beatPhase = totalBeats % 1
```

This handles ritardando, accelerando, and mid-song tempo changes correctly.

### Extensibility

The `BeatSync` interface can wrap different sources:
- **MIDI timing** (current): Exact, stability=1.0
- **Audio analysis** (future): Essentia.js, Meyda, or aubio for real-time beat detection

## Fractal Engine

10 supported Julia set iteration types. Music mapping uses mixed cross-family anchors: Celtic (0, 1, 5), PerpBurn (2, 7), Phoenix (3, 6), Buffalo (4).

### Movement System
Each harmonic degree defines a **center** and **4 orbit offsets** in c-space. The c-value moves between orbit points synchronized to the beat grid using sinusoidal interpolation. Exponential snap rate 8.0 (~0.12s to 90%) for chord transitions.

### Rotation System
Beat-grid impulses (CW/CCW alternating) plus drum impulses (kick CCW, snare CW, hihat subtle). Friction: `exp(-1.2 * dt)` — half-life ~0.58s.

### Color System
- **Smooth escape coloring**: `sqrt(smoothed / maxIter)` → 2048-entry palette LUT, black interior
- **Chord root → palette**: 12 chromatic palettes, peak brightness at 0.85, loop to saturated mid-tone
- **Song key vignette**: Radial gradient overlay using key color

Rendering: multi-worker band-split, offscreen canvas at `displaySize * fidelity` (default 0.45x), `BASE_RANGE = 4.8`.

## Song Library

**Default song**: "To Zanarkand" (FFX) — chosen for its gentle piano melody that demonstrates the visualizer without overwhelming the effects.

Includes test MIDIs (A major/minor scales, chromatic test) plus game soundtracks (Final Fantasy, Chrono Trigger, FFT).

**Adding new MIDIs**: Place files in `public/midi/` (not `public/` root). Validate before adding—parse with `@tonejs/midi` or check first 4 bytes are `MThd`. RIFF-wrapped MIDIs (`.rmi`, header `RIFF`) fail to parse. Sites like ffcompendium.com serve RIFF-wrapped; midishrine.com serves standard MIDIs.

## Exploration Tools

- **Config tool** (`public/config.html`): Multi-panel cross-family anchor picker with zoom/pan, orbit dot dragging, TypeScript export
- **Shape atlas** (`public/shape-atlas.html`): Julia set thumbnail grid across parameter space

## Key Learnings

### What Works
- **Mixed cross-family fractal anchors**: Best shapes from each family per harmonic degree
- **Filament zone anchors**: Just outside connectedness locus boundary
- **Orbit-based beat motion**: 4 offsets per anchor with sinusoidal interpolation
- **Bar-level chord detection**: Stable, musically meaningful
- **Openwork clock hands**: Stroked outlines with transparent interiors
- **Wave reflection via ghost sources**: Simple, effective boundary modeling
- **Pitch-positioned wave drops**: Clock angle + octave radius creates musical geography
- **Separate melody/bass clocks**: Different visual weight matches musical register
- **Long edge decay with smoothstep**: Connections stay visible, fade gracefully
- **Spatial wave tanks**: Separate waves for different musical elements—bass from bottom, melody from sides. Creates directional visual interest without requiring explicit drum visualization
- **Pitch-weighted energy**: Higher notes contribute more energy (scale by `1 + (midi - 60) / 24`). High-energy pieces feel appropriately intense
- **Chord quality modulation**: Map chord quality to texture—dim/aug = rough warp, 7ths = sophisticated detail, major = clean baseline
- **Wave tank physics**: For fluid motion, model energy as waves with momentum—push creates motion that continues after input stops
- **Generalized pulse driver**: Use `activeVoices` onsets (any instrument) + beat grid pulse + drums, not just drums. Works with any MIDI
- **dt capping**: `dt = Math.min(dt, 0.1)` prevents physics blowup when browser throttles backgrounded tabs
- **Anchor + offset model**: Parameters = anchor base + energy offset. When energy decays, values return to anchor (restoring force)
- **sqrt radius for spirals**: Even visual spacing across octaves. Cubic curves compress bass too much. Formula: `radius = maxR * (0.02 + 0.98 * Math.sqrt(t))`
- **Stepwise vs leap trail drawing**: Stepwise motion (≤3 semitones) follows the spiral curve for musical continuity; larger intervals draw straight lines for visual clarity
- **Chord root for bass tracking**: Bass clock follows chord root rather than individual bass notes for harmonic stability
- **GSAP beat-relative timing for clocks**: Hand motion duration as fraction of beat (0.5 beats for melody, 1.0 beats for bass) keeps motion musically grounded
- **Key modulation rotation**: On detected modulation, tween `keyRotation` so the new tonic aligns to 12 o'clock. Effects (note spiral, clocks) apply this offset to all angle calculations. Shortest-path normalization prevents 360° spins.
- **Heavy puck physics for interactive elements**: Simulate high mass with small impulse values, high friction, and low max velocity. Feels deliberate and weighty rather than twitchy. "Bowling ball on ice" is the target feel.
- **Non-homing projectiles**: Store target position at launch time, not current position. Creates interesting gameplay where targets can dodge if they move.
- **Mouse repulsion fields**: Continuous force falloff (`1 - dist/radius`)² feels more natural than hard collision boundaries. Users instinctively understand the interaction.
- **Click-drag-flick for direct manipulation**: Track drag velocity, apply on release with cap. Intuitive physics interaction.
- **Random direction music bumps**: Fixed directions (e.g., kick always pushes down) cause objects to get stuck at boundaries. Random angles distribute motion across the canvas.

### What Doesn't Work
- **Anchors inside locus**: Heavy, mostly-black Julia sets
- **Solid-fill clock silhouettes**: Details invisible
- **Heavy particle systems**: Crash framerate—keep overlays minimal
- **Palettes washing to white**: Loop to saturated mid-tone instead
- **High rotation friction**: Rotation dies before next beat (1.2 is sweet spot)
- **Linear palette mapping**: Compresses boundary detail (`sqrt` spreading essential)
- **Spring physics for music response**: Feels stiff/mechanical. Wave tank (mass + momentum) is more fluid
- **Direct energy → parameter mapping**: Feels twitchy. Cascade through smoothing: energy → wave level → parameter
- **Drum-only energy drivers**: Many MIDIs have no drums. Generalize to all note onsets + beat grid
- **Drum pulse circles around beat positions**: Tried subdividing a circle into beat positions (4ths for 4/4, 3rds for 3/4) with drum pulses at those positions. Experimented with capacitor models (fast absorb, slow bleed), hihat accents, different radii. Despite multiple iterations, always felt either too heavy/sudden or the effect didn't "land" visually. Drum visualization on domain warp remains unsolved — better to let the wave tanks respond to all onsets rather than trying to visualize drums specifically
- **Bass clock tracking individual bass notes**: Too erratic — random bass notes cause the hand to jump around. Following chord root provides harmonic stability

## Available Libraries

### GSAP (GreenSock Animation Platform)
Installed and available via `src/animation.ts`. Currently used for:
- **Palette crossfade** (`fractal-engine.ts`): Smooth LUT blending when chords change palette
- **Drum bounce** (`main.ts`): Elastic/back easing for kick, snare, hihat zoom effects
- **Chord transitions**: Flow speed changes, shape morphs (spirograph) on chord changes
- **Clock animations**: Hand angle and brightness in melody/bass clocks

Best suited for:
- Fixed-duration transitions triggered by discrete events (chord changes, note onsets)
- One-shot tweens with known endpoints
- Elastic/bounce/back easing for punchy effects
- Beat-relative durations (`beatDuration * multiplier`)

Not ideal for:
- Continuous physics simulation (wave tanks, fluid motion) — manual physics better
- Rapid target changes where tweens would constantly interrupt each other
- Impulse accumulators — use manual `Math.exp(-rate * dt)` decay

### Animation Patterns

**Discrete events** (chord changes, note onsets): Use GSAP with beat-relative timing
```typescript
gsap.to(this, {
  targetValue: anchor.value,
  duration: beatDur * 1.0,
  ease: 'power2.inOut',
  overwrite: true,
});
```

**Continuous physics** (fluid motion, energy response): Use wave tank model
```typescript
// Wave with momentum - push creates motion that persists
const push = energy * 5.0;
this.waveVel += (push - k * this.wave - damping * this.waveVel) * dt;
this.wave += this.waveVel * dt;
```

**Energy accumulation**: Use cascaded smoothing
```typescript
// Fast accumulator
this.energy += onsetEnergy;
this.energy *= Math.exp(-3.0 * dt);
// Slow follower (the "wave")
this.smoothed += (this.energy - this.smoothed) * rate * dt;
```

## Audio Visualization Libraries (Research)

### Tier 1: Comprehensive Audio Analysis
| Library | Purpose | Notes |
|---------|---------|-------|
| **Essentia.js** | Full MIR | WebAssembly-powered, onset/beat/tempo detection, key/chord estimation, melody extraction, ML models via TensorFlow.js |
| **Meyda** | Feature extraction | RMS, spectral centroid/flatness/rolloff, MFCC. Lightweight, well-documented |
| **aubiojs** | Real-time pitch/onset/tempo | WASM-compiled from C aubio library. Low latency, battle-tested algorithms |

### Tier 2: Beat Detection
| Library | Focus |
|---------|-------|
| **web-audio-beat-detector** | BPM detection from AudioBuffer. Simple API, good for electronic music |
| **BeatDetect.js** | BPM + first beat offset + first bar timing |
| **beat-beat-js** | Low-freq filtering for beat inference, callback on each beat |

### Tier 3: Visualization
| Library | Type | Best For |
|---------|------|----------|
| **p5.js + p5.sound** | Canvas/WebGL | Rapid prototyping, FFT/amplitude built-in |
| **audioMotion-analyzer** | Spectrum analyzer | Zero-dependency, 240-band spectrum, Bark/Mel scales, weighting filters |
| **Wave.js** | Canvas | 12 pre-built visualization effects, simple API |
| **wavesurfer.js** | Waveform display | Interactive waveforms, spectrogram plugin |

### Tier 4: Creative/Live Coding
| Tool | Description |
|------|-------------|
| **Hydra** | Live-codable video synth, compiles to WebGL, uses Meyda for FFT |
| **Shadertoy** | GLSL shader playground with audio input (512x2 texture: spectrum + waveform) |
| **projectM / Milkshake** | MilkDrop preset renderer in WebGL. Thousands of existing presets |

## Future Ideas

- **Microphone pitch detection**: Attempted autocorrelation-based detection for live input. Issues with octave errors and jitter. Consider `crepe.js` (neural network) for better accuracy.
- **More physics simulations**: Particle systems, fluid dynamics, string vibration
- **Shader-based effects**: Move more computation to GPU
