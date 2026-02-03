# Fractal Jukebox

Music-reactive fractal visualizer with mixed cross-family anchors (Celtic, Phoenix, Tricorn in one scale). Plays MIDI files through a SoundFont synthesizer and maps harmonic analysis to fractal parameters in real time.

## Architecture

Vanilla TypeScript + Vite, no framework. Matches sibling projects (lissajous, resonator, sound-synth).

| File | Role |
|------|------|
| `src/main.ts` | App shell: HTML, event listeners, render loop, UI |
| `src/midi-analyzer.ts` | MIDI parsing (@tonejs/midi), key detection, bar-level chord detection |
| `src/music-mapper.ts` | Maps musical analysis → fractal parameters via orbit-based beat motion + beat-driven rotation |
| `src/fractal-engine.ts` | Multi-type fractal renderer with precomputed color LUT, melody clock light, and post-composite overlays |
| `src/fractal-worker.ts` | Pure per-pixel fractal computation in Web Workers (no color effects) |
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

`music-mapper.ts` maps musical properties to visual parameters. A single set of 8 mixed cross-family anchors maps harmonic degrees (I-vii + chromatic fallback 0) to curated c-values. Each anchor carries its own fractal `type` field, so different degrees can use different fractal formulas (Celtic, Phoenix, Tricorn) within one scale.

### Mixed anchors

Anchors are placed across fractal families using `public/config.html` (the mix config tool). Each anchor specifies `{ real, imag, type, orbits }`. The `type` field determines which fractal formula is used when that degree plays. This allows picking the most visually interesting shapes from each family for each harmonic function.

Each anchor has 4 `orbits` offsets (one per beat) that define the beat-synchronized c-value motion pattern. Root pitch class rotates very slightly around the anchor (radius 0.005).

### Anchor placement principle

Anchors that sit too close to the connectedness locus interior produce heavy, mostly-black Julia sets with low detail. The fix is to push anchors **outward** into the **filament zone** — just outside the boundary where there's rich structure and visual variety. Typical radii: 0.08–0.18.

### Tension → iteration count
Base iterations: `120 + tension * 60`.

### Movement system: orbit-based beat synchronization

Each degree defines a **center** and **4 orbit offsets** in c-space. The c-value moves between orbit points synchronized to the beat grid using sinusoidal interpolation (`sin(π * beatFrac)`), reaching each orbit point at the midpoint of its beat and returning to center at beat boundaries.

**Orbit offsets**: 4 per anchor (one per beat in 4/4), specified as `{ dr, di }` relative to the anchor center. Configured via the config tool by dragging orbit dots. Orbits interpolate smoothly on chord changes via exponential snap.

**Exponential snap** for chord transitions: `snapRate = 8.0` (~0.12s to 90%). When chords change, the center snaps to the new degree's anchor.

### Rotation system: beat-grid + drums

Rotation is purely beat-driven — no tension/energy wobble. A `rotationVelocity` accumulator receives impulses and decays via exponential friction.

**Beat-grid impulses** — detected by beat boundary crossings within the bar:
- Beats 0, 2 (downbeat, 3rd) → CCW impulse (`+0.7 * strength`)
- Beats 1, 3 (backbeat) → CW impulse (`-0.7 * strength`), beat 1 gets strength 1.0, others 0.7
- Eighth-note subdivisions: `±0.20` in same direction as parent beat

**Drum impulses**:
- Kick → CCW rotation (`+0.5`)
- Snare → CW rotation (`-0.6`)
- Hi-hat → subtle alternating rotation (`±0.12`), direction flips by beat position in bar

**Friction**: `rotationVelocity *= exp(-1.2 * dt)` — half-life ~0.58s. Slow enough that rotation carries across beats for visible sway, fast enough to not accumulate into spin.

### Color system

**Traditional fractal coloring**: Smooth escape time normalized via `sqrt(smoothed / maxIter)`, mapped through a 2048-entry palette LUT. Interior pixels are black. No cyclic banding.

**Chord root → palette**: 12 chromatic palettes indexed by chord root pitch class. Each palette has 6 stops, peak brightness at position 0.85, looping back to a saturated mid-tone at 1.0 (avoids white washout). Palette transitions use LUT crossfade.

**Song key vignette**: A subtle radial gradient overlay on the outer edge of the canvas using the song's detected key color. Fades from transparent at 55% of corner distance to 25% opacity at the edge. This anchors the overall color atmosphere to the song's key regardless of chord changes.

**Melody overlay (toggle, defaults off)**: A UI toggle button enables/disables the melody visualization. When enabled:
- 12 clock dots at pitch class positions around the edge (key at 12 o'clock). In-key dots are 1.15x size / 0.6 alpha, out-of-key are 0.85x / 0.3 alpha.
- Melody trail: `screen`-blended ribbon connecting recent melody positions (120 point ring buffer). Two-pass rendering: outer glow (6-14px, 10% opacity) + bright core (1.5-4.5px, 60% opacity, white-hot newest fading to palette color).
- Melody glow travels in straight lines between clock positions, pulses on each new note (onset detection via pitch class tracking, re-triggers after strength decays below 0.05).
- Melody color sampled at 0.85 (bright end of palette).

**Bass**: Data available from mapper (pitch class, velocity) but no visualization currently. See brainstorm in "Open questions" below.

**Idle animation**: Gentle sinusoidal orbit around the tonic anchor using the first orbit offset.

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

Music mapping uses three fractal types (Celtic 6, Phoenix 5, Tricorn 4) mixed freely across degrees.

Rendering details:
- Multi-worker band-split rendering: image split into horizontal bands, dispatched to N workers
- Workers are pure computation — no color effects, just fractal iteration + LUT color lookup
- Offscreen canvas at `displaySize * fidelity` (default 0.45x max), upscaled with bilinear filtering
- View range: `BASE_RANGE = 4.8` units in fractal space (zoomed out enough to keep shapes on screen during orbit motion)
- 2048-entry precomputed color LUT with crossfade on palette change
- Traditional smooth coloring: `sqrt(smoothed / maxIter)` → LUT lookup, black interior

Post-composite overlay stack (drawn in order after fractal, melody items gated by toggle):
1. **Clock dots** (melody toggle): 12 colored dots at pitch class positions, in-key highlighted
2. **Melody trail** (melody toggle): two-pass `screen`-blended ribbon trail (120 points)
3. **Song key vignette**: radial gradient overlay using key palette mid-tone color on outer edge

Beat-driven rotation: drum hits + beat-grid impulses with friction decay

## Song Library

Default: Schala's Theme (Chrono Trigger). Songs include Final Fantasy titles (FFI through FFIX), Frog's Theme (Chrono Trigger), and others.

## Exploration Tools

**Config tool**: `public/config.html` — Multi-panel cross-family anchor picker. Features:
- Side-by-side connectedness locus panels for each fractal family
- Select a degree (I-vii), click any panel to place its anchor
- Drag anchors to reposition, drag orbit dots (1-4) to shape beat motion
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
4. **Orbit dots define motion**: Drag the 4 orbit dots in the config tool to shape the beat-synchronized c-value motion pattern. Larger orbit offsets = more area explored = more visual variety during playback.

## Key Learnings

### What works
- **Mixed cross-family anchors**: Picking the best shapes from each fractal family per degree gives more visual variety than being locked to one family. Each anchor carries its own `type` field.
- **Filament zone anchors**: Anchors positioned just outside the boundary (in the filament zone) produce the best shapes — rich detail without heavy interior mass. When shapes look too heavy, push outward.
- **Orbit-based beat-synchronized motion**: 4 orbit offsets per anchor, one per beat, with sinusoidal interpolation. Produces musically-locked motion that's tightly coupled to the beat grid.
- **Beat-grid + drum rotation**: Beat boundary crossings drive alternating CW/CCW impulses. Kick reinforces downbeat, snare drives backbeat. Friction at 1.2 (half-life ~0.58s) lets rotation carry across beats.
- **Traditional smooth coloring**: `sqrt(smoothed / maxIter)` through palette LUT. Simple, no artifacts. Palette contrast comes from careful stop placement — peak brightness at 0.85, loop back to saturated mid-tone at 1.0.
- **Song key vignette**: Subtle radial overlay in key color on outer edge. Constant across chord changes, gives visual coherence.
- **Melody clock light**: Post-composite `screen`-blended glow that travels between 12 clock positions in straight lines. Pulses on each melody note. Clock face aligned to song key (key note at 12 o'clock). More readable than per-pixel fractal arm tint.
- **Exponential snap for chord transitions**: Rate ~8 gives immediate response.
- **Bar-level chord detection**: Per-bar gives stable, musically meaningful changes. Per-beat causes thrashing.
- **BASE_RANGE = 4.8**: Slightly zoomed out from the standard 4.0 to keep shapes on screen during orbit motion excursions.
- **Pure workers**: Keeping workers as pure fractal computation (no color effects) simplifies the pipeline. All visual effects are post-composite overlays on the main thread.

### What doesn't work
- **Anchors too close to the locus interior**: Produces heavy, mostly-black Julia sets. Fix: push outward into filament zone.
- **Single-family worlds with world switching**: Locking all 7 degrees to one fractal type limits visual variety. Mixed anchors are better.
- **Cyclic banding / interior coloring**: Added complexity for minimal benefit. Traditional smooth coloring with good palettes is cleaner.
- **Key palette LUT blend in worker**: Blending between key and chord palettes per-pixel based on escape speed was over-engineered. A simple post-composite vignette overlay achieves the key-color anchoring goal more cleanly.
- **Melody arm tint in fractal pixels**: Blending melody color into a directional wedge per-pixel in the worker was subtle and hard to notice. Replaced with the melody clock light (post-composite glow at clock positions), which is more visible and readable.
- **Bass overlay effects**: Attempted `screen`-blended glow, `multiply`-blended dark spotlight, and two-pass screen trail. Multiply darkening invisible on black fractal interior. Screen glow + trail draw calls too expensive (crashed framerate on busy songs like Stab the Sword of Justice). Bass visualization remains an open problem — per-pixel or parameter-based approaches likely needed.
- **Heavy overlay draw calls**: Particle systems (120 sparks), long trails (160+ points with two-pass rendering), and combined melody+bass overlays all crashed framerate. Canvas 2D line/arc calls are expensive per-segment. Keep overlays to minimal draw calls or move effects into workers.
- **Fractal cache decoupling**: Tried caching fractal to separate canvas and blitting + drawing overlays every rAF frame independently. Didn't improve framerate because the bottleneck was overlay draw calls themselves, not the fractal render timing.
- **Palettes that wash to white**: All palettes ending near white kills contrast at boundaries. Palettes should loop back to saturated mid-tone.
- **Antenna region of Burning Ship**: c-values near (-1.5, -0.1) produce degenerate shapes. Stay in the hull region.
- **High rotation friction** (3.0): Half-life 0.23s — rotation died before next beat. 1.2 (half-life 0.58s) lets sway carry.
- **Linear palette mapping** (`smoothed / maxIter`): Compresses boundary detail into tiny palette range. `sqrt` spreading is essential.

### Open questions
- **Per-song anchor tuning**: Different songs use different chord progressions. A song-adaptive system could allocate more visual range to chords that actually appear.
- **Transition path optimization**: Chord snaps pass through arbitrary intermediate c-values. Optimizing the path could eliminate occasional degenerate flashes.

### Melody/bass visualization brainstorm (not yet implemented)

Current state: melody has a toggle-able trail + clock dots overlay (defaults off). Bass has no visualization. Both have data available from the mapper (pitch class, velocity). Previous attempts at post-composite overlays (particles, thick trails, multiply-blend spotlight) all caused framerate problems — too many canvas draw calls per frame.

**Near-free (per-pixel in worker — no overlay cost)**
- **Directional color shift**: Melody warms/brightens upper hemisphere pixels, bass cools/darkens lower half. Same technique as existing melody arm tint.
- **Escape-time remapping**: Bass compresses color mapping (darker, more contrast), melody stretches it (brighter, pastel). Just changing sqrt exponent or LUT index math.
- **Split palette**: Melody pitch selects palette for high-escape pixels, bass for low-escape. Two color worlds in one image.

**Cheap overlays (1-2 draw calls)**
- **Radial pulse rings**: On note onset, one expanding circle from center. Melody rings outward, bass inward.
- **Dynamic vignette**: Bass controls outer edge color/intensity, melody controls inner glow. Modifying existing radial gradient params.
- **Crosshair / axis lines**: Horizontal line for bass pitch, vertical for melody. Two draw calls total.

**Medium cost overlays**
- **Waveform border**: Sine wave along canvas edge, frequency from melody, amplitude from bass. Single path.
- **Short trail**: The ribbon trail worked visually. Could revisit with 30-40 point buffer (not 120+) for melody only.

**Structural (affect fractal parameters — zero draw cost)**
- **Bass → zoom pulses**: Bass hits nudge view range, fractal "breathes."
- **Melody → iteration count**: Higher melody = more iterations = more filament detail. More responsive than current tension-only mapping.
- **Dual c-value blend**: Primary from chord, secondary offset by melody interval. Changes the shape itself.
