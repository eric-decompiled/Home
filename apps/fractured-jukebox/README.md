# The Fractured Jukebox

A layered music visualization system that transforms MIDI files into synchronized visual experiences.

![System Diagram](docs/system-diagram.svg)

## Using Claude Code

This project is set up for development with [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview), Anthropic's agentic coding tool. Requires a Max subscription or API credits. See the [quickstart guide](https://docs.anthropic.com/en/docs/claude-code/quickstart) to get started, and `CLAUDE.md` for project-specific context.

**Tip:** Use the glossary terms below when describing features. Saying "like Bass Clock" gives Claude a reference implementation for harmony-based effects, or "like Note Star" for note-onset particle systems.

### Terminology

- **Effects**: Visual layers in `src/effects/` (e.g., `note-star.ts`, `flow-field.ts`)
- **Presets**: Curated effect combinations (`stars`, `clock`, `warp`, `fractal`, `chain`, `piano`)
- **Layers/Slots**: Effect slots by role — `bg`, `fg`, `overlay`, `melody`, `bass`, `hud`
- **Compositor**: Blends enabled effect layers with opacity and blend modes

## Feature Glossary

| Term | Description |
|------|-------------|
| **Presets** | |
| Stars | Default view with starfield, note particles spiraling inward, and bass fire effects |
| Clock | Rotating clock hands tracking melody and bass with theory bar display |
| Warp | Kaleidoscope overlay with Chladni wave patterns and spiral notes |
| Piano | Falling note visualization with on-screen piano keyboard |
| Fractal | Interactive fractal viewer with kaleidoscope post-processing |
| **Background Effects** | |
| Starfield | Animated stars with twinkling, nebula overlays, and parallax depth |
| Flow Field | Particle-based fluid simulation using Perlin noise |
| Chladni | Cymatics-inspired standing wave patterns |
| **Foreground Effects** | |
| Note Spiral | Active MIDI voices displayed on an expanding spiral |
| Note Star | Star particles spawning on note onsets, traveling inward |
| Piano Roll | Falling notes with lookahead and impact particles |
| Graph Chain | Force-directed graph of melody notes with harmonic connections |
| Fractal | Multi-type fractal renderer (Mandelbrot, Burning Ship, etc.) |
| **Overlays** | |
| Kaleidoscope | Mirror/fold effect with configurable segments |
| **Melody/Bass Layers** | |
| Melody Clock | Clock hand tracking melody pitch with compass physics |
| Bass Clock | Clock hand tracking chord root/harmonic center |
| Bass Fire | Flame particles responding to bass activity |
| Theory Bar | HUD showing current key, chord, and tension level |
| **Music Analysis** | |
| Tension | 0-1 value measuring harmonic dissonance and movement |
| Key Detection | Automatic identification of musical key from MIDI data |
| Chord Detection | Real-time chord recognition with roman numeral display |
| **Groove Curves** | |
| Beat Groove | Smooth 0-1 curve that peaks exactly on the beat—use for motion that "lands" on the beat |
| Bar Groove | Same as beat groove but for bar boundaries—use for larger structural motions |
| Beat Anticipation | Builds 0→1 as beat approaches (power curve)—use for tension, approaching motion |
| Beat Arrival | Peaks at 1 on beat, fast decay—use for impact flash, hit response |
| Bar Anticipation/Arrival | Same patterns for bar-level events |

### Creating Custom Effects

To add a new visual effect:

1. **Create the effect file** in `src/effects/` implementing `VisualEffect` interface from `effect-interface.ts`
2. **Required methods**:
   - `init(width, height)` — Set up canvas and state
   - `update(dt, music)` — Animate based on `MusicParams` (groove curves, tension, voices, etc.)
   - `render()` — Return your offscreen canvas
   - `getConfig()` — Define UI controls (sliders, toggles)
3. **Register the effect** in `main.ts` (add to effect array and layer slot)
4. **Use groove curves** for beat-synced motion:
   ```typescript
   // Pulse size on beat
   const size = baseSize * (1 + 0.2 * music.beatGroove);

   // Flash on beat arrival
   const flash = music.beatArrival * 0.5;

   // Build anticipation before bar
   const glow = music.barAnticipation * 0.3;
   ```
5. **React to musical events**:
   - `music.activeVoices` — All currently sounding notes
   - `music.melodyOnset` — True on frame when melody note starts
   - `music.tension` — Harmonic tension 0-1
   - `music.chordRoot`, `music.chordQuality` — Current chord

See `docs/effects.md` for the full `MusicParams` interface and animation patterns.

### Structure

| Path | Purpose |
|------|---------|
| `src/main.ts` | App shell, render loop, UI |
| `src/effects/` | All visual effects |
| `src/state.ts` | URL encoding, presets, defaults |
| `docs/` | Feature docs, key-learnings.md |
| `research/` | Design rationale and theory |

### Key Docs

- `docs/key-learnings.md` — What works and what doesn't
- `docs/effects.md` — Effect interface and music params
- `docs/performance.md` — Profiling and optimization

### Research

The `research/` directory contains music visualization theory and design rationale. Key summaries:

| Document | Description |
|----------|-------------|
| [groove-and-visualizers.md](research/groove-and-visualizers.md) | Neuroscience of rhythm perception, dopamine response to anticipation/arrival, why groove makes you move |
| [harmonic-analysis-theory.md](research/harmonic-analysis-theory.md) | Tonal tension frameworks, Lerdahl's pitch space, chord function theory |
| [fractal-theory.md](research/fractal-theory.md) | Julia/Mandelbrot mathematics, coloring algorithms, parameter space exploration |
| [graph-evolution.md](research/graph-evolution.md) | Design notes for Graph Chain effect, force-directed layouts, harmonic affinity physics |
| [music-theory-transformations.md](research/music-theory-transformations.md) | Neo-Riemannian theory, Tonnetz geometry, chord transformation operations |
| [playlist-theory.md](research/playlist-theory.md) | Cross-era playlist curation, song selection criteria, pacing strategies |
| [bibliography.md](research/bibliography.md) | Ranked list of 45+ academic papers on music cognition, visualization, and perception |

Start with `research/notes.md` for synthesized insights across all research areas.

## License

ISC License - see [LICENSE](LICENSE) for details.
