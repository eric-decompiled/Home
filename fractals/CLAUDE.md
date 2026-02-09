# Fractured Jukebox

A layered music visualization system that transforms MIDI files into synchronized visual experiences. Combines fractal rendering, physics simulations, and procedural graphics—all driven by real-time harmonic analysis. Plays MIDI through a SoundFont synthesizer while mapping musical structure (key, chords, melody, bass, drums) to visual parameters across multiple composited effect layers.

**Default preset**: Fractal Dance (Domain Warp + Fractal + Theory Bar)

## Architecture

Vanilla TypeScript + Vite, no framework. Matches sibling projects (lissajous, resonator, sound-synth).

### PWA Support

The app is installable as a Progressive Web App for fullscreen experience on mobile:
- **manifest.json**: Configures standalone display mode, icons, theme colors
- **iOS**: "Add to Home Screen" from Safari for true fullscreen (Fullscreen API not supported)
- **Android**: Native install prompt or "Add to Home Screen"
- **Desktop**: Fullscreen button in transport bar (⛶)

Fullscreen features:
- **Mouse to top**: Reveals controls overlay with blur backdrop
- **Cursor auto-hide**: Hides after 2.5s inactivity, pointer cursor indicates click-to-play
- **Touch support**: Tap near top or swipe down to reveal controls
- **Click/tap canvas**: Play/pause in fullscreen mode

| File | Role |
|------|------|
| `src/main.ts` | App shell: HTML, event listeners, render loop, UI, layer compositor |
| `src/state.ts` | State management: URL sharing, JSON export/import, localStorage persistence |
| `src/fractal-config.ts` | Interactive fractal anchor editor panel (c-plane position + orbit offsets per degree) |
| `src/midi-analyzer.ts` | MIDI parsing (@tonejs/midi), key detection, bar-level chord detection |
| `src/music-mapper.ts` | Maps musical analysis → fractal parameters via orbit-based beat motion + beat-driven rotation |
| `src/beat-sync.ts` | Generalized beat tracking abstraction with tempo change support |
| `src/fractal-engine.ts` | Multi-type fractal renderer with precomputed color LUT and post-composite overlays |
| `src/fractal-worker.ts` | Pure per-pixel fractal computation in Web Workers (no color effects) |
| `src/audio-player.ts` | MIDI playback via spessasynth_lib (SoundFont-based AudioWorklet synthesizer) |
| `src/audio-file-player.ts` | Local audio file playback via Web Audio API (MP3/WAV/OGG) |
| `src/audio-analyzer.ts` | Audio analysis: BPM detection via web-audio-beat-detector |
| `src/effects/` | Visual effect layers (see below) |

## Visual Effects System

Effects are organized into layer slots (mutually exclusive within each slot). Each effect implements `VisualEffect` interface from `src/effects/effect-interface.ts`. Layers composite via configurable blend modes (screen, multiply, overlay, etc.) and per-layer opacity.

### Layer Slots

| Slot | Purpose | Effects |
|------|---------|---------|
| **Background** | Full-canvas animated backdrop | Chladni (default), Domain Warp, Waves, Flow Field |
| **Foreground** | Main visual element | Note Spiral (default), Fractal, Piano Roll, Tonnetz |
| **Overlay** | Post-process effects | Kaleidoscope, Theory Bar |
| **Melody** | Melodic visualization | Melody Aurora, Melody Web, Melody Clock |
| **Bass** | Bass note tracking | Bass Clock (default), Bass Web |

### Presets

| Preset | Background | Foreground | Overlay | Melody | Bass |
|--------|------------|------------|---------|--------|------|
| **Cosmic Spiral** (default) | Flow Field | Note Spiral | — | — | Bass Clock |
| **Warp Prism** | Chladni | Note Spiral (ring) | Kaleidoscope | — | Bass Clock |
| **Fractal Dance** | Domain Warp | Fractal | Theory Bar | — | — |
| **Piano** | Flow Field | Piano Roll | Theory Bar | — | — |

### URL Sharing System

The browser URL updates automatically to reflect the current visual configuration. Users can copy the URL directly from the address bar to share. Song selection is not included (URLs are for visual presets only).

**Parameters:**
| Param | Example | Description |
|-------|---------|-------------|
| `preset` | `?preset=warp` | Apply a preset (spiral, warp, fractal, piano) |
| `bg` | `?bg=chladni` | Background layer (omit for none) |
| `fg` | `?fg=spiral` | Foreground layer (omit for none) |
| `overlay` | `?overlay=kaleido` | Overlay layer (omit for none) |
| `melody` | `?melody=clock` | Melody layer (omit for none) |
| `bass` | `?bass=clock` | Bass layer (omit for none) |
| `{prefix}.{key}` | `?ff.w=1` | Effect config (see below) |

**URL compression:** Layer values and config params use short names.

| Effect ID | Layer Name | Config Prefix | Config Keys |
|-----------|------------|---------------|-------------|
| flowfield | `flow` | `ff` | `w`=useWhite |
| note-spiral | `spiral` | `ns` | `t`=tightness, `s`=shapes |
| piano-roll | `piano` | `pr` | `p`=pianoSound |
| domainwarp | `warp` | `dw` | |
| chladni | `chladni` | `ch` | |
| kaleidoscope | `kaleido` | `ks` | |
| fractal | `fractal` | `fr` | |
| theory-bar | `theory` | `tb` | `h`=barHeight |
| bass-clock | `clock` | `bc` | |
| melody-clock | `clock` | `mc` | |
| tonnetz | `tonnetz` | `tn` | |
| wave-interference | `waves` | `wi` | |

Booleans: `1`/`0`. Example: `?bg=flow&fg=spiral&ff.w=1`

**URL behavior:**
- Initial page load: Clean URL (default Cosmic Spiral applied)
- Click any preset: `?preset=spiral`, `?preset=warp`, etc.
- Custom configs: `?bg=chladni&fg=note-spiral&ns.s=ring`

**Fallback:** Unrecognized params are ignored; defaults to Cosmic Spiral preset.

### Custom Presets

Users can save their own presets via the **+ Save** button. Custom presets:
- Store full state (layers, effect configs, fractal anchors)
- Appear as gold buttons next to built-in presets
- Can be deleted individually (x button) or all at once (Reset button)
- Persist in localStorage across sessions

**UI Elements:**
- **+ Save**: Opens modal to name and save current configuration
- **Custom preset buttons**: Click to apply, hover x to delete
- **Reset**: Deletes all custom presets (with warning modal)

**Warning Modals:** Destructive actions (delete preset, reset all) show a styled confirmation modal with cancel/confirm buttons.

### Fractal Config Panel (`src/fractal-config.ts`)

Interactive editor for fractal anchor points. Each harmonic degree (I-VII) maps to a c-plane position in one of 18 fractal families, with 4 orbit offsets for beat-synchronized motion.

**Access:** Click "Fractal Config" button in the top bar.

**Features:**
- **Family dropdown**: All 18 types (Standard through Multicorn-3). Includes Newton, Nova, Sine, Magnet, Barnsley variants
- **Degree buttons**: Select which degree (I-VII) to edit
- **Quality buttons**: Select chord quality (M, m, 7, m7, °, +) per degree
- **Click to place**: Click on locus to set anchor position for selected degree
- **Drag orbits**: Drag numbered dots (1-4) to shape beat motion. Shift+drag snaps to axis
- **Pan/zoom**: Drag to pan, Ctrl+wheel to zoom (debounced with scaled preview), double-click to reset view
- **Live preview**: Animated Julia set preview with configurable BPM
- **Palette selector**: Choose color palette for preview
- **🎲 Surprise**: Generate random boundary-seeking anchors for unlocked cells
- **🔒 Lock/Unlock**: Per-cell and per-degree locking preserves anchors during Surprise
- **🎲🔥 Temperature**: Per-degree slider controls reroll variation (low=refine nearby, high=explore widely)
- **↩ Recall**: Reset current anchor's orbits to NESW cardinal pattern
- **🗺️ Atlas**: Toggle 8x8 Julia set thumbnail grid overlay on locus
- **📋 Copy**: Export anchors as TypeScript code
- **▶ Progression**: Play chord progressions with audio to audition anchors
- **Save**: Persist to localStorage and close panel

**Data flow:**
- Anchors stored in `localStorage['fractal-anchors']`
- Custom presets include anchors via `getFullState()`
- `music-mapper.ts` reads anchors to drive fractal visualization

### State Management (`src/state.ts`)

Centralized state management module for the visualizer. Handles multiple serialization formats:

**Core Types:**
```typescript
interface VisualizerState {
  version: number;       // Schema version for migrations
  layers: {              // Effect assignments by slot
    bg: string | null;
    fg: string | null;
    overlay: string | null;
    melody: string | null;
    bass: string | null;
  };
  configs: {             // Effect-specific settings (only non-defaults)
    [effectId: string]: { [key: string]: string | number | boolean };
  };
  anchors?: FractalAnchors;  // Fractal config (JSON/localStorage only, never in URL)
}

interface CustomPreset {
  id: string;
  name: string;
  state: VisualizerState;
  created: number;  // timestamp
}
```

**Functions:**

| Function | Purpose |
|----------|---------|
| `getCurrentState(layerSlots)` | Extract current state (layers + effect configs) |
| `getFullState(layerSlots)` | Extract full state including fractal anchors |
| `applyState(state, ...)` | Apply layers and effect configs |
| `applyFullState(state, ...)` | Apply full state including fractal anchors |
| `stateToURL(state)` | Encode to compressed URL (no anchors) |
| `urlToState(queryString)` | Decode URL to state |
| `stateToJSON(state)` | Export to JSON (full fidelity) |
| `jsonToState(json)` | Import from JSON |
| `getCustomPresets()` | Get all user-saved presets |
| `saveCustomPreset(name, state)` | Save current state as named preset |
| `deleteCustomPreset(id)` | Delete a custom preset |
| `deleteAllCustomPresets()` | Clear all custom presets |

**Storage Keys:**
- `fractured-jukebox-presets` — Array of custom presets (JSON)
- `fractal-anchors` — Current fractal anchor configuration

**URL vs Full State:**
- URL: Layers + effect configs only (shareable, compact)
- JSON/localStorage: Everything including fractal anchors (for custom presets)

This separation keeps URLs clean while allowing full configuration persistence.

### State Schema Change Procedure

All state mappings live in `src/state.ts`. The schema uses a single integer version (`CURRENT_VERSION`).

**Additions (OK to proceed without asking):**
| Change | Update in `state.ts` |
|--------|---------------------|
| New effect | `EFFECT_SHORT_NAMES`, `EFFECT_PREFIXES` |
| New config key | `CONFIG_SHORTS`, `DEFAULT_CONFIGS` |
| New preset | `PRESET_LAYERS`, `PRESET_CONFIGS` |
| New layer slot | `SLOT_KEYS`, `VisualizerState.layers` interface |

Also update the effect's `getConfig()` / `setConfigValue()` methods.

**Breaking Changes (ASK USER FIRST):**
- Rename effect ID
- Rename config key
- Remove effect or config
- Change value semantics (e.g., range 0-1 → 0-100)

For breaking changes:
1. Get user approval
2. Bump `CURRENT_VERSION` in `state.ts`
3. Add migration to `MIGRATIONS` object:
```typescript
const MIGRATIONS: Record<number, Migrator> = {
  2: (state) => {
    // Example: rename effect
    if (state.layers.bg === 'old-name') state.layers.bg = 'new-name';
    return { ...state, version: 2 };
  },
};
```

**Defensive Parsing (always enforced):**
- Missing fields → use defaults
- Unknown fields → ignore silently
- Invalid values → use default for that field
- No version field → assume version 1, migrate forward

**Auto-migration entry points:**
- `urlToState()` — parses URL, migrates
- `jsonToState()` — parses JSON, migrates
- `loadFromLocalStorage()` — loads stored state, migrates

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

**Note Spiral** (`src/effects/note-spiral.ts`): All active MIDI voices rendered as glowing orbs on a spiral covering full piano range (MIDI 21-108, A0 to C8). Pitch class determines angle (root at 12 o'clock), with **configurable tightness** (power curve, default 1.25) for visual spacing. Shows polyphonic voicing with **Bezier curve trails** between consecutive notes—tangent-based control points create smooth curves. Trail behavior: **stepwise motion** (1-3 semitones) follows the spiral curve, larger intervals draw straight lines. Trail TTL configurable (default 48 segments, decay 0.08). Sine wave twist (`0.05 * sin(fromRoot)`) prevents angular discontinuity at key boundaries. **Firefly particles** (default shape) dance around active notes. **Long note visibility**: decay rate 0.4-0.7 gives ~2 second half-life so notes linger on spiral. Center shifted down 4% for better screen balance.

**Melody Web** (`src/effects/melody-web.ts`): Network graph of 12 pitch classes arranged in a circle as dots. Larger dots for diatonic scale degrees, smaller for chromatic. Edges connect recently-played notes, building a web of melodic relationships. Edge decay 0.9995 (~23s half-life at 60fps) with smoothstep alpha curve. Melody trail shows recent note sequence.

**Melody Clock** (`src/effects/melody-clock.ts`): Openwork Breguet/pomme-style clock hand tracking individual melody notes. Drawn as stroked outlines with transparent interiors (filigree style). Features: volute scrollwork, open ellipse moon window, teardrop, fleur-de-lis tip with three petals, crescent tail. Roman numeral markers at diatonic positions. Hand direction tracks actual MIDI pitch—ascending melody goes clockwise, descending counter-clockwise. Uses GSAP with **0.5 beat duration** and power2.out ease for smooth motion with some heft. Arc trail shows recent sweep path.

**Bass Clock** (`src/effects/bass-clock.ts`): Industrial station-clock style hand tracking **chord root** (not individual bass notes) for harmonic stability. Heavy tapered hand with circular counterweight. Roman numeral markers on outer ring (just outside note spiral radius). **Fixed hand length at 0.95** (outer layer). **Initializes to song key** (tonic position) before first chord is detected. Uses GSAP with full beat duration and power2.inOut ease for slow, weighty motion.

**Piano Roll** (`src/effects/piano-roll.ts`): Falling notes visualization with piano keyboard at bottom. Notes fall from above and land on keys when they play. Features:
- **Lookahead system**: Uses `upcomingNotes` from MusicParams for 4-second note preview
- **Octave-aware coloring**: Low notes use darker palette stops, high notes use brighter stops
- **Key depression**: Keys physically press down when notes hit, with smooth return
- **Groove-synced glow**: Notes and keys pulse subtly with beatGroove/barGroove (20% swing)
- **Multi-layer note rendering**: Body gradient, cylindrical shading, highlight, neon border, leading edge
- **Particle system**: Sparks emit on note impact, during sustain, and on release (capped at 50 particles)
- **Piano sound mode**: Toggle to force all instruments to piano (via program change)
- **Performance optimized**: No shadow blur (uses layered fills), particles are simple circles

### MusicParams Interface

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

## Audio Playback

Uses `spessasynth_lib` with `WorkletSynthesizer` + `Sequencer`. SoundFont: `public/TimGM6mb.sf2` (5.7MB GM bank). AudioWorklet processor: `public/spessasynth_processor.min.js`.

Key design decisions:
- **Deferred init**: AudioContext and SoundFont loading happen on first `play()` click (user gesture required). `loadMidi()` just stashes the buffer.
- **Time sync**: Uses `sequencer.currentHighResolutionTime` with **interpolation** for smooth seek bar. Sequencer may update in chunks; we interpolate using `audioContext.currentTime` delta between updates.
- Do NOT pass `oneOutput` config to WorkletSynthesizer (causes channel count errors).
- Worklet module path must be absolute: `new URL('/spessasynth_processor.min.js', import.meta.url).href`

## Custom MIDI Loading

Users can load their own MIDI files via:
- **📁 MIDI button**: Opens file picker for `.mid`/`.midi` files
- **Drag & drop**: Drop MIDI file directly on canvas

Custom MIDIs get full analysis (key detection, chord detection, tempo tracking) just like built-in songs.

## Music Analysis Pipeline

`midi-analyzer.ts` processes MIDI files into a `MusicTimeline`. See `research/harmonic-analysis-theory.md` for theoretical foundation.

### Key Detection

1. **Global key detection** — Krumhansl-Schmuckler algorithm on full pitch class histogram weighted by `duration * velocity`
2. **Multiple profiles** — Supports `krumhansl` (default), `temperley` (classical), `shaath` (pop/electronic)
3. **Ambiguity metric** — Tracks 2nd-best key candidate. `KeyRegion.ambiguity` (0=clear, 1=ambiguous) measures relative strength difference
4. **Modulation detection** — Windowed K-S with hysteresis. Tempo-based windows (4 bars, 1 bar hop) with 3-window stability requirement

### Chord Detection

1. **Extended templates** — Supports: major, minor, dim, aug, sus4, sus2, maj7, dom7, min7, hdim7, dim7
2. **Diatonic bias** — Diatonic roots get +0.15 bonus; quality preference adjustments for disambiguation
3. **Bar-level granularity** — Weighted pitch class profiles per bar matched against templates. Per-bar (not per-beat) prevents excessive chord thrashing
4. **Onset-accurate timing** — Chord timestamps use earliest actual note onset within the bar

### Harmonic Analysis

Each `ChordEvent` includes:
- `root` (0-11), `quality`, `degree` (1-7), `tension` (0-1)
- `isSecondary` — true for secondary dominants (V/x, viio/x)
- `secondaryTarget` — target degree being tonicized (2-7)
- `isChromatic` — true if root or quality doesn't fit current key

### Tension Model

Based on Lerdahl & Krumhansl (2007), combining four components:
- **Hierarchical** (40%) — Circle of fifths distance from tonic
- **Dissonance** (25%) — Chord quality roughness (dim=0.35, dom7=0.25, major=0)
- **Motion** (20%) — Root movement tension (tritone=0.4, step=0.25, fifth=0.05)
- **Tendency** (15%) — Resolution pull (vii=0.3, V=0.2, I=0)

Secondary dominants add +0.15 tension (V/V gets -0.05 as it's very common).

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

### Groove Curves

Based on neuroscience research into the two-phase dopamine response (anticipation vs arrival), the beat sync system provides continuous groove curves that model musical expectation:

| Curve | Description | Formula |
|-------|-------------|---------|
| `beatAnticipation` | Builds 0→1 as beat approaches | `(1 - beatPhase)²` — accelerating buildup |
| `beatArrival` | Peaks at 1 on beat, fast decay | Trigger on `onBeat`, decay `exp(-6.0 * dt)` |
| `beatGroove` | Smooth cosine peaking AT beat | `(cos(beatPhase * 2π) + 1) / 2` |
| `barAnticipation` | Bar-level anticipation (slower) | Same pattern, bar-level |
| `barArrival` | Bar-level arrival (bigger impact) | Same pattern, bar-level |
| `barGroove` | Bar-level groove curve | Same pattern, bar-level |

**Why groove curves?**
- Boolean triggers (`onBeat`) miss the anticipation phase where dopamine builds
- Continuous curves create smoother, more musical animations
- Anticipation glow → arrival impact → decay models the complete groove cycle
- Different effects use different curves: melody uses beat-level, bass uses bar-level

**Usage in effects:**
```typescript
const anticipation = music.beatAnticipation ?? 0;
const arrival = music.beatArrival ?? 0;

// Anticipation creates pre-glow
this.glowSize += anticipation * 0.15;

// Arrival creates impact
this.pulseIntensity += arrival * 0.4;
```

All visual effects now use groove curves for rhythm-aware animation.

## Fractal Engine

18 supported Julia set iteration types. Music mapping uses mixed cross-family anchors stored in localStorage (editable via config tool). See `research/fractal-theory.md` for implementation details, coloring strategies, and music mappings.

### Fractal Types

| Type | Name | Formula | Coloring |
|------|------|---------|----------|
| 0 | Standard | `z² + c` | Escape |
| 1 | Cubic | `z³ + c` | Escape |
| 2 | Quartic | `z⁴ + c` | Escape |
| 3 | Burning Ship | `(\|Re\|+i\|Im\|)² + c` | Escape |
| 4 | Tricorn | `conj(z)² + c` | Escape |
| 5 | Phoenix | `z² + c + p·z_{n-1}` | Escape |
| 6 | Celtic | `\|Re(z²)\| + i·Im(z²) + c` | Escape |
| 7 | Lambda | `c·z·(1-z)` | Escape |
| 8 | PerpBurn | `(Re + i\|Im\|)² + c` | Escape |
| 9 | Buffalo | `\|z\|² - \|z\| + c` | Escape |
| 10 | Newton-3 | `z - (z³-1)/(3z²)` | Convergence |
| 11 | Nova | `z - (z³-1)/(3z²) + c` | Hybrid |
| 12 | Sine | `c·sin(z)` | Escape |
| 13 | Magnet-I | `((z²+c-1)/(2z+c-2))²` | Convergence |
| 14 | Barnsley-1 | `(z±1)·c` | Escape |
| 15 | Barnsley-2 | `(z±1)·c` | Escape |
| 16 | Barnsley-3 | Quadratic conditional | Escape |
| 17 | Multicorn-3 | `conj(z)³ + c` | Escape |

**Coloring modes:**
- **Escape**: Color by iteration count (standard smooth coloring)
- **Convergence**: Color by which root point converges to (Newton: 3 roots, Magnet: z=1)
- **Hybrid**: Check both escape and convergence (Nova)

### Movement System
Each harmonic degree defines a **center** and **4 orbit offsets** in c-space. The c-value moves between orbit points synchronized to the beat grid using sinusoidal interpolation. Exponential snap rate 8.0 (~0.12s to 90%) for chord transitions.

### Rotation System
Beat-grid impulses (CW/CCW alternating) plus drum impulses (kick CCW, snare CW, hihat subtle). Friction: `exp(-1.2 * dt)` — half-life ~0.58s.

### Color System
- **Smooth escape coloring**: `sqrt(smoothed / maxIter)` → 2048-entry palette LUT, black interior
- **Root-based coloring** (Newton/Magnet): Root index → hue, iteration count → brightness
- **Chord root → palette**: 12 chromatic palettes, peak brightness at 0.85, loop to saturated mid-tone
- **Song key vignette**: Radial gradient overlay using key color

**Chromatic palette assignments** (pitch class → color):
| PC | Note | Color | Notes |
|----|------|-------|-------|
| 0 | C | Silver Grey | Neutral anchor |
| 1 | C# | Warm Violet | Accidental, shifted warm |
| 2 | D | Deep Purple | |
| 3 | D# | Slate Blue | Accidental, cool |
| 4 | E | Ocean Blue | 0/G/B structure, no red |
| 5 | F | Aqua/Cyan | Green-leaning |
| 6 | F# | Warm Teal | Accidental |
| 7 | G | Emerald Green | Anchor |
| 8 | G# | Orange | Bridges green→red |
| 9 | A | Fire | Red→orange→yellow, anchor |
| 10 | A# | Dusty Mauve | Accidental, purple-shifted |
| 11 | B | Fuchsia | |

Rendering: multi-worker band-split, offscreen canvas at `displaySize * fidelity` (default 0.45x), `BASE_RANGE = 5.8`.

## Song Library

**Default song**: "To Zanarkand" (FFX) — chosen for its gentle piano melody that demonstrates the visualizer without overwhelming the effects.

Includes test MIDIs (A major/minor scales, chromatic test) plus game soundtracks (Final Fantasy, Chrono Trigger, FFT).

**Adding new MIDIs**: Place files in `public/midi/` (not `public/` root). Validate before adding—parse with `@tonejs/midi` or check first 4 bytes are `MThd`. RIFF-wrapped MIDIs (`.rmi`, header `RIFF`) fail to parse. Sites like ffcompendium.com serve RIFF-wrapped; midishrine.com serves standard MIDIs.

## Exploration Tools

- **Config tool** (`public/config.html`): Multi-panel cross-family anchor picker with zoom/pan, orbit dot dragging, TypeScript export
- **Shape atlas** (`public/shape-atlas.html`): Julia set thumbnail grid across parameter space

## Research Documentation

The `research/` folder contains in-depth technical documents synthesizing domain knowledge:

| Document | Purpose |
|----------|---------|
| `research/PROCESS.md` | Meta-documentation of the research workflow (exploration → research doc → working theory → CLAUDE.md update). |
| `research/harmonic-analysis-theory.md` | Working theory for harmony-aware visualization. Covers tension models, key detection algorithms, chord quality mappings, and practical harmony→visual parameter tables. |
| `research/fractal-theory.md` | **Primary reference for fractal implementation.** Working theory with ready-to-use code for all 18 types, coloring strategies (escape vs convergence), animation patterns, bailout conditions, and music-to-fractal mappings. Start here when adding or modifying fractals. |
| `research/fractal-families.md` | Comprehensive catalog of 15+ Julia set variants with academic background, visual characteristics, and recommendations. Reference for understanding why each family behaves as it does. |
| `research/music-analysis-improvements.md` | Deep dive into music analysis libraries (Essentia.js, Tonal.js) and improvement roadmap for the analyzer. |
| `research/groove-and-visualizers.md` | Neuroscience of groove and its application to visualization (dopamine response, anticipation/arrival, motor engagement). |

### Research Process

Four-phase workflow documented in `research/PROCESS.md`:

1. **Exploration** — Survey libraries, papers, implementations; save references
2. **Research Document** — Comprehensive analysis with depth and alternatives
3. **Working Theory** — Distilled, actionable framework with quick reference tables
4. **CLAUDE.md Update** — Record in institutional memory

**Working Theory Documents** (`*-theory.md`):
- Synthesize raw research into actionable frameworks
- Include quick reference tables and code snippets
- Focus on practical implementation guidance
- Updated as understanding evolves

**Research Documents** (other `.md` files):
- In-depth explorations of specific topics
- Academic depth with references
- May include experimental ideas not yet implemented

**Reference Materials** (`research/references/`):
- Saved web pages, images, papers
- Source material for research synthesis

## Key Learnings

### What Works
- **Mixed cross-family fractal anchors**: Manually curated via config tool, stored in localStorage
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
- **Groove curves (anticipation/arrival)**: Based on two-phase dopamine response from neuroscience. Anticipation builds before beat (caudate nucleus), arrival creates impact on beat (nucleus accumbens). Creates smoother, more musical animations than boolean triggers. Use `beatAnticipation` for glow buildup, `beatArrival` for pulse impact, `beatGroove` for continuous rhythm modulation.
- **Bar-level groove for bass**: Bass/harmonic elements respond to `barAnticipation`/`barArrival` rather than beat-level. Creates weighty, grounded feel for low-frequency visualizations.
- **CSS custom properties for smooth progress bars**: Native range input `value` updates look choppy on short tracks. Use a CSS variable (`--progress: 0-1`) to drive a `linear-gradient` background for subpixel-smooth rendering independent of the input's step value.
- **Octave-aware palette coloring**: For piano/keyboard visualizations, map MIDI note to palette stop index—low octaves use darker stops (indices 0-2), high octaves use brighter stops (indices 3-5). Creates natural visual hierarchy matching musical register.
- **Layered fills instead of shadow blur**: Shadow blur is extremely expensive. Fake glow with 2-3 expanding translucent rectangles/circles. Visually similar, 10x+ faster.
- **Subtle groove modulation (20% swing max)**: Larger groove swings look distracting on fast tempo songs. Keep modulation subtle—0.9 + grooveMod * 0.2 is a good range.
- **Key depression with smooth return**: Track active notes to hold keys down, decay brightness at exp(-4.0 * dt) for visible return animation. Threshold at 0.1 brightness for activation.
- **Particle system caps**: Cap total particles (50 max), use simple circles with white core instead of radial gradients, reduce emission counts (2-4 per impact). Essential for performance on note-heavy songs.
- **Two-palette-stop gradients for keys**: Pick two actual palette colors for key gradients (top/bottom) rather than darkening/lightening one color. Looks richer and more natural.
- **Piano mode with immediate effect**: Stop all notes (`synth.stopAll`) before applying program changes so sound switches instantly, not on next note.
- **Bezier curves for spiral trails**: Use cubic Bezier with tangent-based control points (tangentStrength ~0.18) for smooth spiral connections. Simple line segments look jagged.
- **Configurable spiral tightness**: Power curve exponent (default 1.25) controls how tightly notes pack. Range 0.5-1.5, adjustable via UI slider.
- **Sine wave twist for spiral**: Avoid angular discontinuity at key boundaries by using `Math.sin(fromRoot / 12 * Math.PI * 2) * 0.05` instead of linear ramp.
- **Asymmetric animation response**: Fast attack (rate 8.0), slow decay (rate 1.5) feels punchy but smooth. Use for zoom pulses, brightness, etc.
- **Time interpolation for smooth seek bar**: Sequencer time updates may be chunky. Interpolate using `audioContext.currentTime` delta between sequencer updates for smooth progress bar.
- **Neutral grey for C**: Makes a good "home base" color that doesn't compete with chromatic colors.
- **Orange for G#**: Bridges green (G) and red (A) naturally on color wheel. Gold was too similar to fire yellows.
- **Fullscreen with PWA fallback**: Fullscreen API doesn't work on iOS Safari. Provide "Add to Home Screen" for true fullscreen PWA experience.
- **Hide controls in fullscreen**: Slide controls up, reveal on mouse-to-top (desktop) or tap-near-top (mobile). Auto-hide after timeout.
- **Animation panel closed by default**: Less visual clutter on first load. Click "Animations" button to open.
- **URL query params for sharing**: Encode layer slots as short keys (bg, fg, overlay, melody, bass), effect configs as `effectId.configKey=value`. Use `history.replaceState()` to update URL on every setting change. Detect preset matches for compact URLs (`?preset=warp`). Default preset = clean URL (no params). Omit layer params set to none. Song not included (visual presets only).
- **Preset-aware URL encoding**: When layers match a preset, skip encoding configs that match PRESET_CONFIGS for that preset. Prevents URLs like `?preset=warp&ns.s=ring` when 'ring' is the expected shape for warp.
- **DEFAULT_CONFIGS for all effects**: Register default values for every effect config key. Prevents non-default configs from polluting URLs when switching presets.
- **Zoom debounce with scaled preview**: During zoom, immediately show scaled/blurry preview of existing render, debounce expensive re-render (150ms). Feels responsive while saving CPU.
- **Drag debounce with requestAnimationFrame**: Limit drag redraws to screen refresh rate (~60fps). Prevents CPU burn during rapid mouse movement.
- **Object-fit: contain coordinate correction**: When canvas uses `object-fit: contain`, `getBoundingClientRect()` includes letterbox/pillarbox padding. Calculate actual rendered size and offset for accurate click coordinates.
- **Larger hit radius for small targets**: 14px hit radius for orbit dots (drawn at 5px) makes grabbing much easier, especially on touch devices.
- **NESW default orbit pattern**: Beat points at North/East/South/West (cardinal directions) is intuitive and looks clean. Use as default for new anchors.
- **Temperature slider for reroll variation**: Per-degree slider (0-1) controls how far from existing position new anchors are placed. Low temp = refine nearby, high temp = explore widely.
- **Algebraic form for Newton fractals**: Nova fractal using `sqrt`/`atan2`/`cos`/`sin` is slow. Pure algebraic complex division is much faster with same results.
- **Atlas grid toggle**: 8x8 grid of Julia set thumbnails overlaid on Mandelbrot locus helps visualize parameter space. Toggle on/off to avoid visual clutter.

### What Doesn't Work
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
- **Shadow blur for glow effects**: Extremely expensive, causes frame drops on note-heavy songs. Use layered translucent fills instead.
- **Radial gradients per particle**: Too expensive at scale. Use simple filled circles with a smaller white core circle.
- **Strong groove modulation (40%+ swing)**: Looks flashy in demos but distracting on fast songs. Subtle (20%) feels better.

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

## Groove Theory

The neuroscience of groove provides a framework for music visualization. See `research/groove-and-visualizers.md` for full literature review.

### The Core Insight

**Groove = Prediction × Surprise × Motor Engagement**

The brain continuously predicts when beats will occur. Groove emerges when predictions are *challenged but not broken*:

| Complexity | Effect | Visual Response |
|------------|--------|-----------------|
| Too low | Boring, no urge to move | Smooth, static |
| **Medium (optimal)** | Maximum groove | Tension/release dynamics |
| Too high | Confusing, rhythm breaks | Fragmented, searching |

This inverted-U relationship is robust across all groove research.

### Two Separate Reward Phases

Dopamine releases in anatomically distinct brain regions:

| Phase | Brain Region | Timing | Visual Strategy |
|-------|--------------|--------|-----------------|
| **Anticipation** | Caudate | Before beat | Accelerating approach, tension build |
| **Arrival** | Nucleus accumbens | At beat | Impact, release, decay |

**Key implication**: Visuals that *approach* beats feel more natural than those that only *react* to beats. Use `nextBeatIn` from BeatState for anticipation effects.

### Bass is Privileged

Low frequencies have superior timing precision (±2ms vs ±20ms for highs) and engage vestibular + vibrotactile pathways beyond hearing. Research shows 11.8% more dancing when inaudible sub-bass is present.

**Implication**: Bass should drive the largest, most stable visual elements. This validates the spatial wave tank approach (bass from bottom, melody from sides).

### Practical Application

```typescript
// Anticipation builds as beat approaches
const anticipation = Math.pow(1 - beatPhase, 2);

// Separate anticipation glow from beat impact
const anticipationGlow = anticipation * energy * 0.3;
const beatImpact = onBeat ? 1.0 : 0;

// Bass drives foundation, treble adds detail
const foundationScale = 1 + bassEnergy * 0.5;
const detailActivity = trebleEnergy * 0.3;
```

## Future Ideas

- **iOS fullscreen UX**: Currently hidden on iOS Safari. Could show a toast/modal prompting "Add to Home Screen" with visual instructions. The PWA works great once installed.
- **Microphone pitch detection**: Attempted autocorrelation-based detection for live input. Issues with octave errors and jitter. Consider `crepe.js` (neural network) for better accuracy.
- **More physics simulations**: Particle systems, fluid dynamics, string vibration
- **Shader-based effects**: Move more computation to GPU
- **Syncopation detection**: Compute syncopation index from MIDI to modulate visual complexity (research shows medium syncopation = maximum groove)
- **Anticipation layer**: Dedicated visual layer that builds before beats land, exploiting the caudate-nucleus accumbens dissociation

### Fractal Exploration (types 10-17 now implemented)

New fractal families are implemented in `fractal-worker.ts`. Explore them via the config tool or Shape Atlas.

**Exploration workflow:**
1. Shape Atlas (`public/shape-atlas.html`): Survey parameter space, find interesting regions
2. Config Tool (`public/config.html`): Place anchors, design beat-synchronized orbits
3. Save anchors to localStorage for music visualization

**Interesting regions to explore:**
- **Newton (10)**: Basin boundaries create high-contrast visuals, root-colored
- **Nova (11)**: Newton + Julia hybrid, extremely detailed layered structures
- **Sine (12)**: Periodic lattice, maps to rhythmic patterns
- **Magnet (13)**: Flame tendrils converging to z=1
- **Barnsley (14-16)**: Fern-like organic growth patterns
- **Multicorn-3 (17)**: 4-fold symmetric Tricorn variant

See `research/fractal-theory.md` for music mapping recommendations and coloring strategies.
