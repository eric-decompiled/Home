# Future Ideas & Prototypes

## Backlog

### UX Improvements
- **iOS fullscreen UX**: Currently hidden on iOS Safari. Could show a toast/modal prompting "Add to Home Screen" with visual instructions. The PWA works great once installed.

### Audio Analysis
- **Microphone pitch detection**: Attempted autocorrelation-based detection for live input. Issues with octave errors and jitter. Consider `crepe.js` (neural network) for better accuracy.
- **Syncopation detection**: Compute syncopation index from MIDI to modulate visual complexity (research shows medium syncopation = maximum groove)

### Visual Effects
- **More physics simulations**: Particle systems, fluid dynamics, string vibration
- **Shader-based effects**: Move more computation to GPU
- **Anticipation layer**: Dedicated visual layer that builds before beats land, exploiting the caudate-nucleus accumbens dissociation

## Prototypes Tried

### Quality Settings System (Not Shipped)

A Low/Medium/High/Ultra quality system was prototyped but not shipped. The implementation worked but FPS gains were modest (~5-10%) because the main bottlenecks are elsewhere.

**Prototype design:**
```typescript
// src/quality.ts
interface QualityConfig {
  spiralGlowLayers: number;        // 0=off, 2=fast, 3=normal, 4=gradient
  spiralShapesEnabled: boolean;    // Enable firefly particles
  spiralTrailMax: number;          // Max trail segments (12-96)
  spiralSpineCacheThreshold: number; // Cache invalidation threshold
  flowParticleCount: number;       // 200-2000 particles
  grooveWaveSamples: number;       // 30-120 samples
  useGradients: boolean;           // radial gradients vs layered fills
  backdropCacheSeconds: number;    // backdrop redraw frequency
  devicePixelRatio: number;        // 1x or 2x for retina
}
```

**Wiring pattern:** Pass `quality: QualityConfig` via MusicParams so all effects receive it per-frame. Effects read `music.quality.*` in their `update()` method.

**What worked:**
- Clean architecture via MusicParams (no global state)
- UI buttons in top bar with active state
- localStorage persistence
- Per-effect conditional rendering based on quality level

**Why not shipped:**
- Canvas 2D is the real bottleneck, not particle counts or glow layers
- FPS improvement was ~5-10%, not transformative
- Added complexity for marginal gain
- Better ROI: Move effects to WebGL shaders

**Future direction:** If revisiting, focus on:
1. **WebGL migration** for compute-heavy effects (Flow Field, Domain Warp)
2. **OffscreenCanvas** in workers for parallel rendering
3. **Resolution scaling** (render at 0.5x, upscale) for bigger impact
4. **Selective layer disabling** based on device capability detection

## Fractal Exploration

New fractal families (types 10-17) are implemented in `fractal-worker.ts`. Explore them via the config tool or Shape Atlas.

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
