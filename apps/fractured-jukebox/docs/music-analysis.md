# Music Analysis Pipeline

`midi-analyzer.ts` processes MIDI files into a `MusicTimeline`. See `research/harmonic-analysis-theory.md` for theoretical foundation.

## Key Detection

1. **Global key detection** — Krumhansl-Schmuckler algorithm on full pitch class histogram weighted by `duration * velocity`
2. **Multiple profiles** — Supports `krumhansl` (default), `temperley` (classical), `shaath` (pop/electronic)
3. **Ambiguity metric** — Tracks 2nd-best key candidate. `KeyRegion.ambiguity` (0=clear, 1=ambiguous) measures relative strength difference
4. **Modulation detection** — Windowed K-S with hysteresis. Tempo-based windows (4 bars, 1 bar hop) with 3-window stability requirement

## Chord Detection

1. **Extended templates** — Supports: major, minor, dim, aug, sus4, sus2, maj7, dom7, min7, hdim7, dim7
2. **Diatonic bias** — Diatonic roots get +0.15 bonus; quality preference adjustments for disambiguation
3. **Bar-level granularity** — Weighted pitch class profiles per bar matched against templates. Per-bar (not per-beat) prevents excessive chord thrashing
4. **Onset-accurate timing** — Chord timestamps use earliest actual note onset within the bar

## Harmonic Analysis

Each `ChordEvent` includes:
- `root` (0-11), `quality`, `degree` (1-7), `tension` (0-1)
- `isSecondary` — true for secondary dominants (V/x, viio/x)
- `secondaryTarget` — target degree being tonicized (2-7)
- `isChromatic` — true if root or quality doesn't fit current key

## Tension Model

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

## Groove Curves

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

## Audio Playback

Uses `spessasynth_lib` with `WorkletSynthesizer` + `Sequencer`. SoundFont: `public/TimGM6mb.sf2` (5.7MB GM bank). AudioWorklet processor: `public/spessasynth_processor.min.js`.

Key design decisions:
- **Deferred init**: AudioContext and SoundFont loading happen on first `play()` click (user gesture required). `loadMidi()` just stashes the buffer.
- **Time sync**: Uses `sequencer.currentHighResolutionTime` with **interpolation** for smooth seek bar. Sequencer may update in chunks; we interpolate using `audioContext.currentTime` delta between updates.
- Do NOT pass `oneOutput` config to WorkletSynthesizer (causes channel count errors).
- Worklet module path must be absolute: `new URL('/spessasynth_processor.min.js', import.meta.url).href`

## Song Library

**Default song**: "To Zanarkand" (FFX) — chosen for its gentle piano melody that demonstrates the visualizer without overwhelming the effects.

Includes test MIDIs (A major/minor scales, chromatic test) plus game soundtracks (Final Fantasy, Chrono Trigger, FFT).

**Adding new MIDIs**: Place files in `public/midi/` (not `public/` root). Validate before adding—parse with `@tonejs/midi` or check first 4 bytes are `MThd`. RIFF-wrapped MIDIs (`.rmi`, header `RIFF`) fail to parse. Sites like ffcompendium.com serve RIFF-wrapped; midishrine.com serves standard MIDIs.
