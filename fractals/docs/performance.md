# Performance Analysis

## Quick Start

Run the automated performance analysis:

```bash
npm run perf                              # 30s test, stars preset
npm run perf -- 15                        # 15s test
npm run perf -- 30 clock                  # 30s with clock preset
npx tsx scripts/perf-summary.ts           # Multi-preset comparison
npx tsx scripts/effect-breakdown.ts warp  # Detailed breakdown for warp
```

Available presets: `stars`, `clock`, `warp`, `fractal`, `chain`, `piano`

## What It Measures

The perf script runs the visualizer in headless Chrome and collects:

- **Frame Rate**: Average, min, max, P95 (worst 5%)
- **Render Time**: Average and max milliseconds per frame
- **Memory**: JS heap usage (average and peak)
- **Long Tasks**: Count of tasks >50ms that block the main thread

## Performance Grades

| Grade | Avg FPS | Description |
|-------|---------|-------------|
| EXCELLENT | 55+ | Smooth 60fps experience |
| GOOD | 45-54 | Minor drops, still smooth |
| ACCEPTABLE | 30-44 | Noticeable but playable |
| NEEDS IMPROVEMENT | <30 | Choppy, needs optimization |

## Current Results (after Feb 2025 optimizations)

### At 2560×1600 (with 75% render scale)

| Preset | Avg Render | P95 | Effects | Compositing |
|--------|------------|-----|---------|-------------|
| Spiral | 23.5ms | 27.7ms | 1.1ms | 22.4ms |
| Clock | 22.9ms | 28.1ms | 0.8ms | 22.0ms |
| Warp | 39.4ms | 45.2ms | 5.5ms | 33.9ms |

### At 1920×1080

All presets hit **60+ FPS** (vsync limited).

### Before/After Comparison

| Preset | Before | After | Improvement |
|--------|--------|-------|-------------|
| Spiral | 25.8ms | 23.5ms | 9% faster |
| Clock | 35.8ms | 22.9ms | 36% faster |
| Warp | 64.8ms | 39.4ms | 39% faster |

**Key finding**: Effect rendering is fast (<6ms), but canvas compositing (drawImage blits) is the bottleneck. Resolution scaling at 75% provides the biggest win.

## Where Time Goes

Run `npx tsx scripts/perf-summary.ts` for a full breakdown. Example output:

```
EFFECT BREAKDOWN (render time per effect)

  SPIRAL:
    starfield          1.22ms
    note-star          0.24ms
    bass-fire          0.14ms

  CLOCK:
    theory-bar         0.32ms
    melody-clock       0.18ms
    note-spiral        0.18ms
    bass-clock         0.17ms
    flowfield          0.03ms
```

The remaining time (24-55ms) is canvas compositing overhead.

## Optimization History

### 2025-02 Performance Pass

Major optimizations implemented:

1. **Resolution Scaling (biggest win)**
   - Compositor now renders at configurable scale (default 75%)
   - Final blit upscales with high-quality interpolation
   - ~2x speedup on compositing-heavy presets
   - UI: Fast (50%) / Balanced (75%) / Sharp (100%) buttons

2. **Kaleidoscope Optimization**
   - Path2D caching: reuse clip path instead of recreating each frame
   - Tighter radius: `diagonal/2 * 1.15` instead of `max(w,h) * 1.5`
   - Result: 8.56ms → 4.91ms (42% faster)

3. **Starfield Optimization**
   - Nebula caching: pre-render expensive gradients to off-screen canvas
   - Only re-render when nebula count changes
   - Simplified star rendering (2 circles max instead of 5)

4. **Compositor State Batching**
   - Track `globalAlpha` and `globalCompositeOperation`
   - Skip redundant state changes

**What didn't work:**
- WebGL kaleidoscope: texture upload overhead exceeded Canvas2D savings
- Internal downscale/upscale: extra drawImage calls cost more than savings
- Dirty tracking: music-reactive effects change every frame anyway

### 2024-02 Performance Pass

Completed optimizations:

1. **Compositor**
   - Removed temp canvas allocation (was creating new canvas per frame for post-process)
   - Added state tracking for `globalAlpha`/`globalCompositeOperation` (skip redundant calls)
   - Fixed redundant canvas clear (was both resizing and clearing)

2. **Render Loop**
   - Debounced URL updates for sliders/color pickers (150ms)
   - Time display only updates on second boundary (was every frame)
   - Seek bar updates throttled to ~15fps (was 60fps)
   - Freeze rendering completely when paused

3. **Effects**
   - Piano Roll: Reuse `activeNotes` Set with `.clear()` instead of `new Set()`
   - Graph Chain: Spatial hash grid with 300px cells for O(n) neighbor lookup. Each node checks 9 adjacent cells instead of all other nodes. At 500 nodes: ~40k pairs vs 125k = 3x faster physics
   - Fractal Engine: Pool frame buffer, only reallocate when size grows

4. **DOM**
   - Color swaps update only 2 swatches (was rebuilding all 12)

## Identifying Bottlenecks

### Using Chrome DevTools

1. Open the app in Chrome
2. Open DevTools (Cmd+Option+I)
3. Go to Performance tab
4. Click Record, interact with app, click Stop
5. Look for:
   - Long yellow bars (scripting)
   - Purple bars (rendering)
   - Red triangles (long tasks)

### Common Bottlenecks

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Low FPS, high render time | Too many draw calls | Batch rendering, reduce effects |
| Long tasks | Synchronous computation | Move to Web Worker |
| Memory growth | Object allocation in loop | Pool/reuse objects |
| Dropped frames on resize | Canvas reallocation | Debounce resize handler |

## Effect Render Time (measured at 75% render scale)

| Effect | Render Time | Notes |
|--------|-------------|-------|
| Flow Field | 0.05ms | 800 particles with noise |
| Bass Fire | 0.14ms | Animated shapes |
| Bass/Melody Clock | 0.17-0.19ms | Clock hands + trail |
| Note Spiral | 0.17-0.32ms | 2D canvas paths |
| Note Star | 0.25ms | Particle system with trails |
| Theory Bar | 0.26ms | HUD overlay |
| Starfield | 0.73ms | Particles + cached nebula gradients |
| Kaleidoscope | 4.91ms | Post-process with Path2D caching |
| Graph Chain | varies | Spatial hash grid for O(n) physics, no node limit |
| Fractal | varies | Per-pixel computation (uses workers) |

**Note**: The compositing cost (drawImage per layer) dominates. At 75% render scale, each drawImage costs ~5-6ms instead of 7-8ms at full resolution.

## Profiling Scripts

| Script | Purpose |
|--------|---------|
| `npx tsx scripts/perf-analysis.ts [duration] [preset]` | Basic FPS/memory analysis |
| `npx tsx scripts/perf-summary.ts` | Multi-preset comparison with effect breakdown |
| `npx tsx scripts/effect-breakdown.ts [preset]` | Detailed timing for single preset |
| `npx tsx scripts/aggregate-perf.ts` | FPS comparison across all presets |

The compositor has built-in profiling. Enable it for runtime analysis:

```typescript
compositor.profileEnabled = true;
// ... run for a while ...
console.log(compositor.getProfileStats());
```

## Adding Instrumentation

To add custom performance markers:

```typescript
// In any effect's update() method
performance.mark('effect-start');
// ... expensive work ...
performance.mark('effect-end');
performance.measure('my-effect', 'effect-start', 'effect-end');
```

View in DevTools Performance tab under "Timings".
