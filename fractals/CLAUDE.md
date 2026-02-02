# Fractal Jukebox

Music-reactive fractal visualizer with mixed cross-family anchors (Burning Ship, Buffalo, Celtic in one scale). Plays MIDI files through a SoundFont synthesizer and maps harmonic analysis to fractal parameters in real time.

## Architecture

Vanilla TypeScript + Vite, no framework. Matches sibling projects (lissajous, resonator, sound-synth).

| File | Role |
|------|------|
| `src/main.ts` | App shell: HTML, event listeners, render loop, UI |
| `src/midi-analyzer.ts` | MIDI parsing (@tonejs/midi), key detection, bar-level chord detection |
| `src/music-mapper.ts` | Maps musical analysis → fractal parameters via underdamped spring + beat-driven rotation |
| `src/fractal-engine.ts` | Multi-type fractal renderer with precomputed color LUT and post-composite overlays |
| `src/fractal-worker.ts` | Per-pixel fractal computation in Web Workers |
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

`music-mapper.ts` maps musical properties to visual parameters. A single set of 8 mixed cross-family anchors maps harmonic degrees (I-vii + chromatic fallback 0) to curated c-values. Each anchor carries its own fractal `type` field, so different degrees can use different fractal formulas (Burning Ship, Buffalo, Celtic) within one scale.

### Mixed anchors

Anchors are placed across all three fractal families using `public/config.html` (the mix config tool). Each anchor specifies `{ real, imag, type, sweepTo }`. The `type` field determines which fractal formula is used when that degree plays. This allows picking the most visually interesting shapes from each family for each harmonic function.

Each anchor has a `sweepTo` endpoint that defines the exploration radius for spring motion. The distance `|anchor - sweepTo|` becomes the base radius. Root pitch class rotates very slightly around the anchor (radius 0.005).

### Anchor placement principle

Anchors that sit too close to the connectedness locus interior produce heavy, mostly-black Julia sets with low detail. The fix is to push anchors **outward** into the **filament zone** — just outside the boundary where there's rich structure and visual variety. Typical radii: 0.08–0.18.

### Tension → iteration count
Base iterations: `120 + tension * 60 + intensityEnergy * 15`.

### Movement system: underdamped spring

Each degree defines a **center** and **radius** in c-space. Two independent 1D underdamped spring oscillators (real axis, imag axis) produce physically-modeled motion around the center.

**Spring physics**: Semi-implicit Euler integration per axis. `accel = -2·ζ·ω₀·vel - ω₀²·pos`. Parameters:
- `ω₀` (natural frequency): tempo-adaptive, `clamp(3.5 + (bpm-60)/60, 3.0, 6.0)` — faster songs get stiffer springs
- `ζ` (damping ratio): 0.35 — underdamped, ~3 visible bounces before settling
- `safeDt`: clamped to 0.1s max to prevent explosion on tab-switch

**Note impulses drive springs directly**:
- Bass (midi < 60) → real-axis velocity kick, direction alternates by pitch parity (`midi % 2`), scaled by `velocity * 0.7 * baseRadius * 3`
- Melody (midi >= 60) → imag-axis velocity kick, direction alternates by pitch parity, scaled by `velocity * 0.8 * baseRadius * 3`
- All notes → `intensityEnergy` pool (decays ~0.4s) for iteration count modulation

**Exponential snap** for chord transitions: `snapRate = 8.0` (~0.12s to 90%). When chords change, the center snaps to the new degree's anchor. Spring momentum carries through transitions.

**Cold start**: First 12 notes get 3x→1x fading boost to impulse strength.

### Rotation system: beat-grid + drums

Rotation is purely beat-driven — no tension/energy wobble. A `rotationVelocity` accumulator receives impulses and decays via exponential friction.

**Beat-grid impulses** — detected by beat boundary crossings within the bar:
- Beats 0, 2 (downbeat, 3rd) → CCW impulse (`+0.7 * strength`)
- Beats 1, 3 (backbeat) → CW impulse (`-0.7 * strength`), beat 1 gets strength 1.0, others 0.7
- Eighth-note subdivisions: `±0.20` in same direction as parent beat

**Drum impulses**:
- Kick → CCW rotation (`+0.5`) + real-axis spring kick (`baseRadius * 1.5`)
- Snare → CW rotation (`-0.6`)
- Hi-hat → subtle alternating rotation (`±0.12`), direction flips by beat position in bar

**Friction**: `rotationVelocity *= exp(-1.2 * dt)` — half-life ~0.58s. Slow enough that rotation carries across beats for visible sway, fast enough to not accumulate into spin.

### Color system

**Traditional fractal coloring**: Smooth escape time normalized via `sqrt(smoothed / maxIter)`, mapped through a 2048-entry palette LUT. Interior pixels are black. No cyclic banding.

**Chord root → palette**: 12 chromatic palettes indexed by chord root pitch class. Each palette has 6 stops, peak brightness at position 0.85, looping back to a saturated mid-tone at 1.0 (avoids white washout). Palette transitions use LUT crossfade.

**Song key vignette**: A subtle radial gradient overlay on the outer edge of the canvas using the song's detected key color. Fades from transparent at 55% of corner distance to 25% opacity at the edge. This anchors the overall color atmosphere to the song's key regardless of chord changes.

**Melody arm tint**: The highest sounding note's pitch class color is blended directly into the fractal pixels in a ~60° wedge pointing "up" in fractal space. Because the fractal rotates, this wedge visually tracks one arm of the fractal. The blend uses `cos³(angle)` for angular falloff, radial fade (stronger away from center), and only affects exterior pixels. Strength decays at ~0.28s half-life, pulsing with each melody note.

**Idle animation**: Gentle Lissajous orbit around the tonic anchor using dual golden-ratio-offset sine phases (no springs — no music to drive them).

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

Music mapping uses three fractal types (Burning Ship 3, Buffalo 9, Celtic 6) mixed freely across degrees.

Rendering details:
- Multi-worker band-split rendering: image split into horizontal bands, dispatched to N workers
- Offscreen canvas at `displaySize * fidelity` (default 0.6x), upscaled with bilinear filtering
- View range: `BASE_RANGE = 4.8` units in fractal space (zoomed out enough to keep shapes on screen during spring motion)
- 2048-entry precomputed color LUT with crossfade on palette change
- Traditional smooth coloring: `sqrt(smoothed / maxIter)` → LUT lookup, black interior
- Song key vignette: radial gradient overlay using key palette mid-tone color
- Melody arm tint: per-pixel in worker, blended into fractal color in a directional wedge
- Beat-driven rotation: drum hits + beat-grid impulses with friction decay

## Song Library

Default: Schala's Theme (Chrono Trigger). Songs include Final Fantasy titles (FFI through FFIX), Frog's Theme (Chrono Trigger), and others.

## Exploration Tools

**Config tool**: `public/config.html` — Three-panel cross-family anchor picker. Features:
- Side-by-side connectedness locus panels for Burning Ship, Buffalo, and Celtic
- Select a degree (I-vii), click any panel to place its anchor
- Drag anchors to reposition, drag ring edge to resize radius
- Zoom/pan per panel (scroll to zoom, drag to pan, double-click to reset)
- Export as TypeScript with per-anchor `type` field
- Shape atlas (iframe at bottom) for exploring Julia set thumbnails across parameter space

**Shape atlas**: `public/shape-atlas.html` — Tiles Julia set thumbnails across parameter space near the connectedness locus boundary. Controls for fractal type, grid density, thumbnail size, and boundary band width.

## Parameter Space Theory

The operational theory for finding good Julia set c-values for any fractal formula.

### Core concept: the connectedness locus

For any fractal formula `f(z, c)`, the **connectedness locus** (Mandelbrot analog) is the set of c-values for which the Julia set is connected. Computed by iterating from the critical point (usually z=0) and checking escape. Interior = connected Julia set. Exterior = disconnected (Cantor dust).

**Interesting Julia sets live near the boundary of the connectedness locus.** Too deep inside → mostly black (large interior, low detail). Too far outside → escapes too fast (no structure). The sweet spot is a narrow band just outside the boundary — the **filament zone**.

### Boundary distance

Approximated with a chamfer distance transform on the discretized escape grid:

1. Render the escape grid at moderate resolution (600-700px, 300 iterations)
2. Classify pixels as interior (escape = 0) or exterior
3. Two-pass chamfer distance: forward + backward, 1.0 cardinal + 1.414 diagonal weights
4. Convert pixel distance to c-space distance

**Optimal boundary distance**: 0.01-0.06 in c-space. Varies by fractal type and boundary region.

### Visual weight scoring

Predicts how "interesting" a Julia set looks. Render a small (40-60px) Julia set and measure:

| Metric | What it captures | Weight |
|--------|-----------------|--------|
| **Iteration histogram entropy** | Diversity of escape times → color band variety | 0.4 |
| **Edge density** | Interior/exterior boundary length → filament richness | 0.3 × 10 |
| **Interior ratio penalty** | Gaussian at 0.25 (σ=0.15) → penalizes too-empty or too-full | 0.3 |

**Interior ratio sweet spot**: ~15-35%.

### Anchor placement

1. Use the config tool to browse each family's connectedness locus and place anchors in the filament zone
2. **Push outward**: If shapes look too heavy/black, push each anchor further from the boundary. Typical radii 0.08–0.18.
3. **Mix families**: Different degrees can use different fractal types. Pick the most interesting shape from whichever family offers it.
4. **sweepTo defines radius**: The distance `|anchor - sweepTo|` becomes the spring baseRadius (scales impulse strength). Larger distance = more area to explore = more visual variety during playback.

## Key Learnings

### What works
- **Mixed cross-family anchors**: Picking the best shapes from each fractal family per degree gives more visual variety than being locked to one family. Each anchor carries its own `type` field.
- **Filament zone anchors**: Anchors positioned just outside the boundary (in the filament zone) produce the best shapes — rich detail without heavy interior mass. When shapes look too heavy, push outward.
- **Underdamped spring for c-value motion**: Two independent 1D springs (real/imag) driven by note impulses produce physically natural bouncing motion. Bass drives real axis, melody drives imag axis. ζ=0.35 gives ~3 visible bounces.
- **Beat-grid + drum rotation**: Beat boundary crossings drive alternating CW/CCW impulses. Kick reinforces downbeat, snare drives backbeat. Friction at 1.2 (half-life ~0.58s) lets rotation carry across beats.
- **Traditional smooth coloring**: `sqrt(smoothed / maxIter)` through palette LUT. Simple, no artifacts. Palette contrast comes from careful stop placement — peak brightness at 0.85, loop back to saturated mid-tone at 1.0.
- **Song key vignette**: Subtle radial overlay in key color on outer edge. Constant across chord changes, gives visual coherence.
- **Melody arm tint in fractal pixels**: Blending melody color directly into the per-pixel computation in a directional wedge (using pre-rotation coordinates) makes the color track a fractal arm as it spins. More organic than a post-composite overlay.
- **Exponential snap for chord transitions**: Rate ~8 gives immediate response. Spring momentum carries through transitions.
- **Cold start**: First 12 notes get 3x→1x fading boost to spring impulses, getting motion started immediately.
- **Bar-level chord detection**: Per-bar gives stable, musically meaningful changes. Per-beat causes thrashing.
- **BASE_RANGE = 4.8**: Slightly zoomed out from the standard 4.0 to keep shapes on screen during spring motion excursions.

### What doesn't work
- **Anchors too close to the locus interior**: Produces heavy, mostly-black Julia sets. Fix: push outward into filament zone.
- **Single-family worlds with world switching**: Locking all 7 degrees to one fractal type limits visual variety. Mixed anchors are better.
- **Cyclic banding / interior coloring**: Added complexity for minimal benefit. Traditional smooth coloring with good palettes is cleaner.
- **Key palette LUT blend in worker**: Blending between key and chord palettes per-pixel based on escape speed was over-engineered. A simple post-composite vignette overlay achieves the key-color anchoring goal more cleanly.
- **Strong melody/bass tint weights** (0.85/0.7): Overwhelmed the palette. Post-composite overlays for color effects don't integrate well — per-pixel blending in the worker (like melody arm) is more organic.
- **Palettes that wash to white**: All palettes ending near white kills contrast at boundaries. Palettes should loop back to saturated mid-tone.
- **Antenna region of Burning Ship**: c-values near (-1.5, -0.1) produce degenerate shapes. Stay in the hull region.
- **High rotation friction** (3.0): Half-life 0.23s — rotation died before next beat. 1.2 (half-life 0.58s) lets sway carry.
- **Linear palette mapping** (`smoothed / maxIter`): Compresses boundary detail into tiny palette range. `sqrt` spreading is essential.

### Open questions
- **Per-song anchor tuning**: Different songs use different chord progressions. A song-adaptive system could allocate more visual range to chords that actually appear.
- **Transition path optimization**: Chord snaps pass through arbitrary intermediate c-values. Optimizing the path could eliminate occasional degenerate flashes.
- **More fractal types in mix**: PerpBurn (8), Phoenix (5), and others have interesting boundary structure not yet explored for mixed anchors.
- **Bass arm tint**: Currently only melody gets a directional arm tint. Bass could get a similar treatment in the opposite direction.
