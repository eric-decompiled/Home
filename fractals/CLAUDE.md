# Fractal Jukebox

Music-reactive fractal visualizer with mixed cross-family anchors (Celtic, PerpBurn, Phoenix, Buffalo). Plays MIDI files through a SoundFont synthesizer and maps harmonic analysis to fractal parameters in real time.

## Architecture

Vanilla TypeScript + Vite, no framework. Matches sibling projects (lissajous, resonator, sound-synth).

| File | Role |
|------|------|
| `src/main.ts` | App shell: HTML, event listeners, render loop, UI, layer compositor |
| `src/midi-analyzer.ts` | MIDI parsing (@tonejs/midi), key detection, bar-level chord detection |
| `src/music-mapper.ts` | Maps musical analysis → fractal parameters via orbit-based beat motion + beat-driven rotation |
| `src/fractal-engine.ts` | Multi-type fractal renderer with precomputed color LUT and post-composite overlays |
| `src/fractal-worker.ts` | Pure per-pixel fractal computation in Web Workers (no color effects) |
| `src/audio-player.ts` | MIDI playback via spessasynth_lib (SoundFont-based AudioWorklet synthesizer) |
| `src/effects/` | Visual effect layers (domain warp, harmonic web, melody clock, etc.) |

## Visual Effects System

Effects are organized into layer slots (mutually exclusive within each slot). Each effect implements `VisualEffect` interface from `src/effects/effect-interface.ts`.

### Layer slots (in `main.ts`)
- **Background**: Domain Warp (default), Spirograph
- **Overlay**: Harmonic Web (default), Melody Arcs, Melody Aurora
- **Melody**: Melody Clock, others

### Key effects

**Domain Warp** (`src/effects/domain-warp.ts`): WebGL-based layered fbm warped through itself. Per-degree anchors control warp amount/scale/flow. Energy from drums clamped at 0.5 with warp ceiling 6.5 to prevent overdriving on intense songs.

**Harmonic Web** (`src/effects/melody-web.ts`): Network graph of 12 pitch classes in a circle. Nodes shown as Roman numerals (I–VII for diatonic, small dots for chromatic). Uses traditional case: uppercase for major triads, lowercase for minor (e.g. minor key: i, ii, III, iv, v, VI, VII). Edges connect recently-played notes, building a web of harmonic relationships. Edge decay 0.9995 (~23s half-life at 60fps) with smoothstep alpha curve — bright most of life, fast fade near end. Radius 0.85.

**Melody Clock** (`src/effects/melody-clock.ts`): Openwork Breguet/pomme-style clock hand. Drawn as stroked outlines with transparent interiors (filigree style). Features: volute scrollwork, open ellipse moon window, teardrop, fleur-de-lis tip with three petals, crescent tail. Roman numeral markers at diatonic positions. Hand direction tracks actual MIDI note pitch — ascending melody goes clockwise, descending goes counter-clockwise. Arc trail on clock edge shows recent sweep path.

### MusicParams interface (`src/effects/effect-interface.ts`)

Shared data passed to all effects each frame. Includes:
- Beat/bar timing (position, index, BPM)
- Chord info (root, degree, quality, tension)
- Key and mode
- `melodyPitchClass`, `melodyMidiNote` (actual MIDI note number for direction), `melodyVelocity`, `melodyOnset`
- `bassPitchClass`, `bassVelocity`
- Drum onsets (kick, snare, hihat)
- `paletteIndex`

## Audio Playback

Uses `spessasynth_lib` with `WorkletSynthesizer` + `Sequencer`. SoundFont: `public/TimGM6mb.sf2` (5.7MB GM bank). AudioWorklet processor: `public/spessasynth_processor.min.js`.

Key design decisions:
- **Deferred init**: AudioContext and SoundFont loading happen on first `play()` click (user gesture required). `loadMidi()` just stashes the buffer.
- **Time sync**: Uses `sequencer.currentHighResolutionTime` for smooth visualization sync.
- Do NOT pass `oneOutput` config to WorkletSynthesizer (causes channel count errors).
- Worklet module path must be absolute: `new URL('/spessasynth_processor.min.js', import.meta.url).href`

## Music Analysis Pipeline

`midi-analyzer.ts` processes MIDI files into a `MusicTimeline`:

1. **Key detection** — Krumhansl-Schmuckler algorithm on pitch class histogram weighted by `duration * velocity`
2. **Bar-level chord detection** — weighted pitch class profiles per bar (using `beatsPerBar * beatDuration` windows), matched against chord templates with diatonic bias. Chord timestamps use the earliest actual note onset within the bar, not the bar boundary. Per-bar (not per-beat) prevents excessive chord thrashing.
3. **Harmonic metadata** — each `ChordEvent` includes: root (pitch class 0-11), quality (major/minor/dom7/min7/dim/aug), degree (1-7 relative to key), pre-computed tension (0-1), and next degree (look-ahead)

Tension is computed from harmonic function: `degreeTension[degree] + qualityTensionBoost[quality]`. Tonic (I) = 0, dominant (V) = 0.7, leading tone (vii) = 0.85.

## Music → Fractal Mapping

`music-mapper.ts` maps musical properties to visual parameters. A single set of 8 mixed cross-family anchors maps harmonic degrees (I-vii + chromatic fallback 0) to curated c-values. Each anchor carries its own fractal `type` field.

Current anchor types: Celtic (0, 1, 5), PerpBurn (2, 7), Phoenix (3, 6), Buffalo (4).

### Movement system: orbit-based beat synchronization

Each degree defines a **center** and **4 orbit offsets** in c-space. The c-value moves between orbit points synchronized to the beat grid using sinusoidal interpolation. Exponential snap rate 8.0 (~0.12s to 90%) for chord transitions.

### Rotation system: beat-grid + drums

Beat-grid impulses (CW/CCW alternating on beat boundaries) plus drum impulses (kick CCW, snare CW, hihat subtle alternating). Friction: `exp(-1.2 * dt)` — half-life ~0.58s.

### Color system

- **Smooth escape coloring**: `sqrt(smoothed / maxIter)` → 2048-entry palette LUT, black interior
- **Chord root → palette**: 12 chromatic palettes, peak brightness at 0.85, loop to saturated mid-tone at 1.0
- **Song key vignette**: Radial gradient overlay on outer edge using key color
- **Idle animation**: Gentle sinusoidal orbit around tonic anchor

## Fractal Engine

10 supported iteration types. Music mapping currently uses Celtic (6), PerpBurn (8), Phoenix (5), Buffalo (9).

Rendering: multi-worker band-split, offscreen canvas at `displaySize * fidelity` (default 0.45x), `BASE_RANGE = 4.8`. Pure workers — no color effects, just iteration + LUT lookup.

## Song Library

Default: A Minor Scale Test. Test songs for both A major and A minor scales (140 BPM, 1 bar per chord, walking through all diatonic triads). Also includes Final Fantasy titles, Chrono Trigger themes, and others.

## Exploration Tools

**Config tool**: `public/config.html` — Multi-panel cross-family anchor picker with zoom/pan, orbit dot dragging, and TypeScript export.

**Shape atlas**: `public/shape-atlas.html` — Julia set thumbnail grid across parameter space near connectedness locus boundary.


## Key Learnings

### What works
- **Mixed cross-family anchors**: Best shapes from each fractal family per degree. Each anchor carries its own `type` field.
- **Filament zone anchors**: Just outside the connectedness locus boundary. Push outward if shapes look too heavy/black.
- **Orbit-based beat motion**: 4 offsets per anchor with sinusoidal interpolation. Tight musical coupling.
- **Beat-grid + drum rotation**: Friction at 1.2 lets sway carry across beats.
- **Traditional smooth coloring with sqrt spreading**: Simple, no artifacts. Peak brightness at 0.85 avoids white washout.
- **Song key vignette**: Constant color anchor across chord changes.
- **Bar-level chord detection**: Stable, musically meaningful. Per-beat causes thrashing.
- **Harmonic web with Roman numerals**: Clean display of harmonic relationships. Long edge decay (0.9995) with smoothstep keeps connections visible.
- **Openwork clock hand**: Stroked outlines with transparent interior look elegant. MIDI note tracking gives correct CW/CCW direction.
- **Domain warp energy clamping**: Cap energy at 0.5, warp ceiling 6.5 prevents overdriving on intense songs.
- **Pure workers**: No color effects in workers simplifies pipeline.

### What doesn't work
- **Anchors too close to locus interior**: Heavy, mostly-black Julia sets. Push outward.
- **Single-family worlds**: Limits visual variety. Mixed anchors are better.
- **Solid-fill clock hand silhouettes**: Scrollwork details invisible. Openwork/outline style is much more readable.
- **Heavy overlay draw calls**: Particle systems, long trails (120+ points), combined overlays crash framerate. Keep overlays minimal or move to workers.
- **Bass overlay effects**: Screen glow + trail too expensive. Multiply darkening invisible on black fractal interior. Bass visualization remains unsolved.
- **Palettes washing to white**: Loop back to saturated mid-tone instead.
- **High rotation friction (3.0)**: Rotation dies before next beat. 1.2 is the sweet spot.
- **Linear palette mapping**: Compresses boundary detail. `sqrt` spreading is essential.
