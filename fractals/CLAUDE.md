# Fractured Jukebox

A layered music visualization system that transforms MIDI files into synchronized visual experiences. Combines fractal rendering, physics simulations, and procedural graphics—all driven by real-time harmonic analysis. Plays MIDI through a SoundFont synthesizer while mapping musical structure (key, chords, melody, bass, drums) to visual parameters across multiple composited effect layers.

**Default preset**: Sculpture (Graph Sculpture + Theory Bar)

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

## Docs

`docs/`: effects.md, music-analysis.md, state-schema.md, fractal-engine.md, key-learnings.md, future-ideas.md, playlist.md

`research/`: fractal-theory.md (primary fractal ref), harmonic-analysis-theory.md, groove-and-visualizers.md, fractal-families.md, playlist-theory.md, graph-evolution.md (Graph Sculpture design)

## Quick Reference

**Layers**: Background (Chladni, Domain Warp, Waves, Flow Field, Starfield) | Foreground (Graph Sculpture, Note Spiral, Fractal, Piano Roll, Tonnetz) | Overlay (Kaleidoscope) | HUD (Theory Bar) | Melody/Bass clocks and webs

**Presets**: `sculpture` (default), `spiral`, `warp`, `fractal`, `piano`

**MIDIs**: Place in `public/midi/`, must start with `MThd` bytes (not RIFF-wrapped)

## State Schema Changes

**Safe additions** (proceed without asking): New effect, new config key, new preset — update `src/state.ts` mappings.

**Breaking changes** (ask first): Rename/remove effect or config key — bump `CURRENT_VERSION`, add migration.

See [`docs/state-schema.md`](docs/state-schema.md) for full procedure.
