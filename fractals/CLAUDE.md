# Fractal Jukebox

Music-reactive Burning Ship fractal visualizer. Plays MIDI files through a SoundFont synthesizer and maps harmonic analysis to fractal parameters in real time.

## Architecture

Vanilla TypeScript + Vite, no framework. Matches sibling projects (lissajous, resonator, sound-synth).

| File | Role |
|------|------|
| `src/main.ts` | App shell: HTML, event listeners, render loop, UI |
| `src/midi-analyzer.ts` | MIDI parsing (@tonejs/midi), key detection, bar-level chord detection |
| `src/music-mapper.ts` | Maps musical analysis → fractal parameters with exponential snap + triple-phase breathing |
| `src/fractal-engine.ts` | Multi-type fractal renderer with radial echo accumulation and precomputed color LUT |
| `src/audio-player.ts` | MIDI playback via spessasynth_lib (SoundFont-based AudioWorklet synthesizer) |

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
2. **Bar-level chord detection** — weighted pitch class profiles per bar (using `beatsPerBar * beatDuration` windows), matched against chord templates with diatonic bias. Chord timestamps use the earliest actual note onset within the bar, not the bar boundary. Per-bar (not per-beat) prevents excessive chord thrashing on songs with simple harmonic rhythm like Schala's Theme.
3. **Harmonic metadata** — each `ChordEvent` includes: root (pitch class 0-11), quality (major/minor/dom7/min7/dim/aug), degree (1-7 relative to key), pre-computed tension (0-1), and next degree (look-ahead)

Tension is computed from harmonic function: `degreeTension[degree] + qualityTensionBoost[quality]`. Tonic (I) = 0, dominant (V) = 0.7, leading tone (vii) = 0.85.

## Music → Fractal Mapping

`music-mapper.ts` maps musical properties to visual parameters. All degrees currently use the Burning Ship fractal (type 3) with auto-tuned weight-matched c-values in the hull/southeast region.

### Harmonic degree → Burning Ship region

Each degree maps to a curated c-value in the Burning Ship hull region:

| Degree | Role | c-value | Region |
|--------|------|---------|--------|
| I | Tonic | -0.31 - 1.15i | Southeast detail |
| ii | Supertonic | -1.1347 - 0.6387i | Hull |
| iii | Mediant | -1.0635 - 0.8576i | Deep hull |
| IV | Subdominant | -0.8479 - 1.053i | Hull #4 |
| V | Dominant | -1.02 - 0.75i | Deep hull variant |
| vi | Submediant | -1.02 - 0.9i | Near deep hull |
| vii° | Leading tone | -0.5113 - 1.1077i | Low right |

Each anchor has a `sweepTo` endpoint defining the breathing axis. Root pitch class rotates very slightly around the anchor (radius 0.005).

Buffalo (type 9) anchors are preserved as a commented block for future use.

### Root pitch class → color palette
12 chromatic palettes indexed by chord root pitch class.

### Tension → iteration count
Base iterations: `120 + tension * 60 + bassWeight * 20`. Keep moderate for frame rate.

### Movement system

**Exponential snap** for chord transitions: `snapRate = 8.0` (~0.12s to 90%). Fast and direct — the shape should change quickly on chord changes. Bass weight slows the snap slightly.

**Triple-phase breathing** for continuous motion:
- Phase 1: base speed (`π / beatDuration`)
- Phase 2: golden ratio offset (`0.618 × baseSpeed`) — never repeats
- Phase 3: beat-locked groove (`sin(beatPhase * 2π)`) — syncs to rhythm

The groove phase provides musical feel; the other two provide organic drift. Breathing sweeps along the anchor↔sweepTo axis with the groove, plus perpendicular drift from phase 2.

**Sweep energy**: Notes feed into a pooling energy system (`0.3 * velocity`) that decays with ~1s half-life and caps at 5.0. Boosts breathing amplitude via `1 + 3 * tanh(energy * 0.5)`. No direct velocity kicks — all motion comes through this smooth envelope. This avoids twitchiness from individual note impulses.

**Bass weight**: Notes below C3 add heaviness (slow ~0.87s decay). Slows snap transitions, increases iterations.

**Cold start**: First 12 notes get 3x→1x fading boost to sweep energy.

**Melody/bass tint**: Highest and lowest sounding notes drive color tinting in the fractal engine.

## Fractal Engine

`fractal-engine.ts` renders fractals with 10 supported iteration types:

| Type | Name | Formula |
|------|------|---------|
| 0 | Julia (z²+c) | Classic quadratic Julia set |
| 1 | Cubic (z³+c) | 3-fold symmetry |
| 2 | Quartic (z⁴+c) | 4-fold symmetry |
| 3 | Burning Ship | `(|Re|+i|Im|)²+c` — jagged, asymmetric |
| 4 | Tricorn | `conj(z)²+c` — mirror symmetry |
| 5 | Phoenix | `z²+c+p·z_prev` — ghostly trails |
| 6 | Celtic | `|Re(z²)|+Im(z²)+c` |
| 7 | Lambda | `c·z·(1-z)` |
| 8 | PerpBurn | `x²-|y|²+c` (perpendicular Burning Ship) |
| 9 | Buffalo | `(|Re|+i|Im|)²-(|Re|+i|Im|)+c` |

Currently all music mapping uses Burning Ship (type 3). The engine supports all types for future exploration.

Rendering details:
- Offscreen canvas at `displaySize * fidelity` (default 0.6x), upscaled with bilinear filtering
- 2048-entry precomputed color LUT with crossfade on palette change
- Smooth coloring: `iteration + 1 - log(log(|z|)) / log(N)` where N = 2, 3, or 4
- Interior coloring: reversed mid-range palette at 40% brightness, mapped by final orbit magnitude
- Radial echo accumulation: `0.42 * exp(-6.5 * dist²)` blend rate
- Melody/bass tint: color projection that decays over ~0.9s
- Idle animation: Burning Ship at tonic anchor with gentle circular breathing

## Song Library

Default: Schala's Theme (Chrono Trigger). 11 Final Fantasy songs (FFI through FFIX + two FFVII tracks).

## Exploration Tools (scratchpad)

Several HTML tools were built for parameter exploration:
- **`boundary-tracer.html`** — Traces iso-weight contours of the Burning Ship boundary, parameterizes them by arc length, lets you place degrees along the curve with live previews
- **`iso-weight-mapper.html`** — Maps visual weight around each anchor, finds iso-weight contour points, picks sweep endpoints
- **`scale-explorer.html`** — Type-tabbed explorer showing 7 curated c-values per fractal family (Burning Ship, Buffalo, Celtic, PerpBurn, z²+c, Tricorn, Phoenix)
- **`auto-tuner.html`** — Measures visual weight, searches nearby c-values to match a target weight, has copy button
- **`optimize-placement.mjs`** — Node script that traces the boundary contour, optimizes degree placement using visual dissimilarity metric (iteration histogram Earth mover's distance)

## Key Learnings

### What works
- **Burning Ship hull region** produces the best shapes. The southeast detail, hull, and deep hull areas all have rich fractal structure. Avoid the antenna region (collapses to degenerate shapes).
- **Exponential snap for chord transitions**: Fast and direct. Spring-damper was tried but either felt twitchy (high stiffness) or sluggish (low stiffness). Exponential snap with rate ~8 gives immediate response without physics artifacts.
- **No direct note kicks**: Individual note impulses cause twitchiness no matter how small. All note energy should flow into a pooling sweep energy system with ~1s decay. Motion comes from smooth breathing envelopes, not from per-note velocity pushes. Think water, not pinball.
- **Beat-locked groove phase**: A sine wave synced to the beat grid gives musical feel. Combined with two free-running phases at irrational ratio for organic drift.
- **Bar-level chord detection**: Per-beat detection causes excessive chord thrashing, especially on songs with arpeggiated or simple harmonic patterns (e.g., Schala's Theme sits on tonic for 12+ bars). Per-bar gives stable, musically meaningful changes.
- **Auto-tuned visual weight**: `avg_brightness * detail_coverage_ratio` is a useful metric for matching visual density across c-values.

### What doesn't work
- **Iso-weight contour as sole constraint**: Strict iso-weight contours are very short (0.5-2 units) because weight changes rapidly perpendicular to the boundary. Confining all degrees to a single contour collapses visual diversity — shapes look too similar. Need to accept some weight variation for distinct shapes.
- **Antenna region of Burning Ship**: c-values near (-1.5, -0.1) produce collapsed/degenerate shapes that lack detail. Stay in the hull region.
- **Spring-damper for c-value transitions**: Tried underdamped spring (stiffness 4-25, various damping). Low stiffness = sluggish (doesn't reach target). High stiffness = twitchy. The fundamental problem is springs create velocity state that interacts badly with note impulses. Exponential snap is simpler and better.
- **Per-note velocity kicks**: Even at very low strength (0.01-0.03), individual note onsets create jitter when notes are dense. The effect compounds with fast passages. Removed entirely — all note energy now flows into the sweep energy pool.
- **Over-constraining sweep range**: Very tight sweep (0.3× sweep axis) looks dead. The sweep multipliers need room — current values are 1.2× groove + 0.5× drift along the sweep axis.

### Open questions for future exploration
- **Multiple fractal types per degree**: The engine supports 10 types. Using different formulas (not just different c-values) per degree would give maximum visual diversity. Buffalo (type 9) is the closest relative to Burning Ship and is already curated.
- **Better visual dissimilarity metric**: Iteration histogram EMD was tried in the optimizer but the results weren't clearly better than Euclidean distance in c-space. A perceptual metric (structural similarity, feature-based) might work better.
- **Longer connected boundary paths**: The iso-weight contour idea is sound in theory but the Burning Ship boundary is too fractal — connected paths are short. Maybe use multiple disconnected contour segments with fast snaps between them (hybrid approach).
- **Per-song anchor tuning**: Different songs use different chord progressions. Schala's Theme barely leaves tonic. A song-adaptive system could allocate more visual range to the chords that actually appear.
- **Other fractal families**: Celtic, PerpBurn, and Buffalo all have interesting boundary structure that hasn't been fully explored for music mapping.
