# Fractured Jukebox

A layered music visualization system that transforms MIDI files into synchronized visual experiences. Combines fractal rendering, physics simulations, and procedural graphics—all driven by real-time harmonic analysis. Plays MIDI through a SoundFont synthesizer while mapping musical structure (key, chords, melody, bass, drums) to visual parameters across multiple composited effect layers.

**Default preset**: Fractal Dance (Domain Warp + Fractal + Theory Bar)

## Architecture

Vanilla TypeScript + Vite, no framework. Matches sibling projects (lissajous, resonator, sound-synth).

| File | Role |
|------|------|
| `src/main.ts` | App shell: HTML, event listeners, render loop, UI, layer compositor |
| `src/state.ts` | State management: URL sharing, JSON export/import, localStorage persistence |
| `src/fractal-config.ts` | Interactive fractal anchor editor panel |
| `src/midi-analyzer.ts` | MIDI parsing, key detection, bar-level chord detection |
| `src/music-mapper.ts` | Maps musical analysis → visual parameters |
| `src/beat-sync.ts` | Generalized beat tracking with tempo change support |
| `src/fractal-engine.ts` | Multi-type fractal renderer with precomputed color LUT |
| `src/fractal-worker.ts` | Per-pixel fractal computation in Web Workers |
| `src/audio-player.ts` | MIDI playback via spessasynth_lib |
| `src/effects/` | Visual effect layers |

## Documentation Index

Detailed documentation lives in `docs/`:

| Document | Contents |
|----------|----------|
| [`docs/effects.md`](docs/effects.md) | Effect catalog, layer slots, MusicParams interface, animation patterns |
| [`docs/music-analysis.md`](docs/music-analysis.md) | Key detection, chord detection, tension model, beat sync, groove curves |
| [`docs/state-schema.md`](docs/state-schema.md) | URL sharing, state management, custom presets, schema migrations |
| [`docs/fractal-engine.md`](docs/fractal-engine.md) | 18 fractal types, coloring modes, movement/rotation systems, config panel |
| [`docs/key-learnings.md`](docs/key-learnings.md) | What works/doesn't work patterns |
| [`docs/future-ideas.md`](docs/future-ideas.md) | Backlog, prototypes tried, library research |
| [`docs/playlist.md`](docs/playlist.md) | Song selection, chronological curation, MIDI quality guidelines |

## Research Documentation

The `research/` folder contains in-depth technical documents:

| Document | Purpose |
|----------|---------|
| `research/fractal-theory.md` | **Primary fractal reference.** Ready-to-use code for all 18 types, coloring strategies, animation patterns |
| `research/harmonic-analysis-theory.md` | Tension models, key detection algorithms, chord quality mappings |
| `research/groove-and-visualizers.md` | Neuroscience of groove, dopamine response, motor engagement |
| `research/fractal-families.md` | Academic background for 15+ Julia set variants |
| `research/playlist-theory.md` | Playlist curation: harmonic mixing, energy arcs, DJ techniques, radio programming |
| `research/PROCESS.md` | Research workflow documentation |

## Quick Reference

### Layer Slots
- **Background**: Chladni, Domain Warp, Waves, Flow Field
- **Foreground**: Note Spiral, Fractal, Piano Roll, Tonnetz
- **Overlay**: Kaleidoscope, Theory Bar
- **Melody**: Melody Aurora, Melody Web, Melody Clock
- **Bass**: Bass Clock, Bass Web

### Presets
- **Cosmic Spiral** (default): Flow Field + Note Spiral + Bass Clock
- **Warp Prism**: Chladni + Note Spiral (ring) + Kaleidoscope + Bass Clock
- **Fractal Dance**: Domain Warp + Fractal + Theory Bar
- **Piano**: Flow Field + Piano Roll + Theory Bar

### PWA Support
- **iOS**: "Add to Home Screen" from Safari for true fullscreen
- **Android**: Native install prompt or "Add to Home Screen"
- **Desktop**: Fullscreen button in transport bar (⛶)

### Custom MIDI Loading
- **📁 MIDI button**: Opens file picker for `.mid`/`.midi` files
- **Drag & drop**: Drop MIDI file directly on canvas

### Adding New MIDIs
Place files in `public/midi/`. Validate first 4 bytes are `MThd` (RIFF-wrapped `.rmi` files fail to parse).

## Essential Patterns

### Animation
```typescript
// Discrete events: GSAP with beat-relative timing
gsap.to(this, { value: target, duration: beatDur * 1.0, ease: 'power2.inOut' });

// Continuous physics: Wave tank model
this.waveVel += (push - k * this.wave - damping * this.waveVel) * dt;
this.wave += this.waveVel * dt;

// Energy accumulation: Cascaded smoothing
this.energy *= Math.exp(-3.0 * dt);
this.smoothed += (this.energy - this.smoothed) * rate * dt;
```

### Performance
- Use layered fills instead of shadow blur (10x+ faster)
- Cap particle systems (50 max, simple circles)
- Cap dt: `dt = Math.min(dt, 0.1)` prevents physics blowup

### Music Mapping
- Bar-level chord detection (not per-beat) prevents thrashing
- Bass clock follows chord root (not individual bass notes)
- Groove curves (`beatAnticipation`, `beatArrival`) for smooth animations

## State Schema Changes

**Safe additions** (proceed without asking): New effect, new config key, new preset — update `src/state.ts` mappings.

**Breaking changes** (ask first): Rename/remove effect or config key — bump `CURRENT_VERSION`, add migration.

See [`docs/state-schema.md`](docs/state-schema.md) for full procedure.

## Available Libraries

### GSAP
Installed via `src/animation.ts`. Best for fixed-duration transitions triggered by discrete events (chord changes, note onsets), elastic/bounce easing.

### spessasynth_lib
MIDI playback with SoundFont synthesis. AudioWorklet-based. SoundFont: `public/TimGM6mb.sf2`.

## Exploration Tools

- **Config tool** (`public/config.html`): Fractal anchor editor with zoom/pan, orbit dragging
- **Shape atlas** (`public/shape-atlas.html`): Julia set thumbnail grid across parameter space
