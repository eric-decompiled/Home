# The Fractured Jukebox

A customizable MIDI file music visualizer. See the structure of music through various views. Uses MIDI analysis to extract rhythmic and harmonic information to drive many visual effects.

**Default preset**: Stars (Starfield + Note Star + Bass Fire)
**Default playlist**: Classics (pop & rock)

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
| `src/effects/graph-chain.ts` | Force-directed graph visualization |

## Docs

`docs/`: effects.md, music-analysis.md, state-schema.md, fractal-engine.md, key-learnings.md, future-ideas.md, playlist.md, performance.md, shortcuts.md

`research/`: fractal-theory.md (primary fractal ref), harmonic-analysis-theory.md, groove-and-visualizers.md, fractal-families.md, playlist-theory.md, graph-evolution.md (Graph Chain design)

## Quick Reference

**Layers**: Background (Chladni, Domain Warp, Waves, Flow Field, Starfield) | Foreground (Graph Chain, Note Spiral, Fractal, Piano Roll, Tonnetz) | Overlay (Kaleidoscope) | HUD (Theory Bar) | Melody/Bass clocks and webs

**Presets**:
- `stars` (default): Starfield + Note Star + Bass Fire
- `clock`: Starfield + Note Spiral + Melody/Bass Clocks + Theory Bar
- `warp`: Chladni + Note Spiral + Kaleidoscope + Melody/Bass Clocks
- `fractal`: Fractal + Kaleidoscope + Melody Web + Theory Bar
- `piano`: Flow Field + Piano Roll
- `chain`: Graph Chain + Kaleidoscope

**MIDIs**: Place in `public/midi/`, must start with `MThd` bytes (not RIFF-wrapped)

## State Schema Changes

**Safe additions** (proceed without asking): New effect, new config key, new preset — update `src/state.ts` mappings.

**Breaking changes** (ask first): Rename/remove effect or config key — bump `CURRENT_VERSION`, add migration.

See [`docs/state-schema.md`](docs/state-schema.md) for full procedure.

## Cleanup Defaults

When cleaning up or resetting to sensible defaults, use these settings:

**UI State**:
- Custom/layer panel: closed by default (`layerPanelOpen = false`)
- Fractal config panel: open by default
- Preset button order: Warp, Clock, Stars, Fractal, Chain, Piano
- Default preset on fresh load: `stars`
- Default playlist: `pop` (Classics)

**Mobile/Canvas**:
- Device pixel ratio: use `devicePixelRatio` capped at 2 for sharp rendering
- Portrait mobile: fill available space (relax 16:9, limit to 4:3 minimum aspect)
- Desktop/landscape: maintain 16:9 aspect ratio
- Touch action on `.main-area`: `pan-y pinch-zoom` (allow scroll gestures)
- Canvas touch-action: `pan-y` (allow vertical scroll)

**Note Spiral**:
- Spiral lines (spine): off by default (`showSpine = false`)
- Config shows only: Shapes, Spiral Lines toggle, Dark Backdrop toggle
- Wave colors: use tension colors (not white/gray)

## Keyboard Shortcuts

See [`docs/shortcuts.md`](docs/shortcuts.md) for keyboard and gesture shortcuts.

## Toast Notifications

Use `showToast(message, duration?)` for user feedback:
- Red background, centered at bottom of screen
- Auto-dismisses after `duration` ms (default 4000)
- Used for MIDI load errors, import failures, etc.
- CSS class `.toast` with `.toast.show` for visibility

## UI Patterns

See [`docs/ui-patterns.md`](docs/ui-patterns.md) for play overlay, modals, share URL, and layer panel footer patterns.

## Performance Testing

Run automated performance analysis with headless Chrome:

```bash
npm run perf              # 30s test, stars preset
npm run perf -- 15 clock  # 15s test, clock preset
```

Outputs FPS, render time, memory usage, and long task counts. See [`docs/performance.md`](docs/performance.md) for details and optimization history.
