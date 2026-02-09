# Fractal Engine

18 supported Julia set iteration types. Music mapping uses mixed cross-family anchors stored in localStorage (editable via config tool). See `research/fractal-theory.md` for implementation details, coloring strategies, and music mappings.

## Fractal Types

| Type | Name | Formula | Coloring |
|------|------|---------|----------|
| 0 | Standard | `z² + c` | Escape |
| 1 | Cubic | `z³ + c` | Escape |
| 2 | Quartic | `z⁴ + c` | Escape |
| 3 | Burning Ship | `(\|Re\|+i\|Im\|)² + c` | Escape |
| 4 | Tricorn | `conj(z)² + c` | Escape |
| 5 | Phoenix | `z² + c + p·z_{n-1}` | Escape |
| 6 | Celtic | `\|Re(z²)\| + i·Im(z²) + c` | Escape |
| 7 | Lambda | `c·z·(1-z)` | Escape |
| 8 | PerpBurn | `(Re + i\|Im\|)² + c` | Escape |
| 9 | Buffalo | `\|z\|² - \|z\| + c` | Escape |
| 10 | Newton-3 | `z - (z³-1)/(3z²)` | Convergence |
| 11 | Nova | `z - (z³-1)/(3z²) + c` | Hybrid |
| 12 | Sine | `c·sin(z)` | Escape |
| 13 | Magnet-I | `((z²+c-1)/(2z+c-2))²` | Convergence |
| 14 | Barnsley-1 | `(z±1)·c` | Escape |
| 15 | Barnsley-2 | `(z±1)·c` | Escape |
| 16 | Barnsley-3 | Quadratic conditional | Escape |
| 17 | Multicorn-3 | `conj(z)³ + c` | Escape |

**Coloring modes:**
- **Escape**: Color by iteration count (standard smooth coloring)
- **Convergence**: Color by which root point converges to (Newton: 3 roots, Magnet: z=1)
- **Hybrid**: Check both escape and convergence (Nova)

## Movement System

Each harmonic degree defines a **center** and **4 orbit offsets** in c-space. The c-value moves between orbit points synchronized to the beat grid using sinusoidal interpolation. Exponential snap rate 8.0 (~0.12s to 90%) for chord transitions.

## Rotation System

Beat-grid impulses (CW/CCW alternating) plus drum impulses (kick CCW, snare CW, hihat subtle). Friction: `exp(-1.2 * dt)` — half-life ~0.58s.

## Color System

- **Smooth escape coloring**: `sqrt(smoothed / maxIter)` → 2048-entry palette LUT, black interior
- **Root-based coloring** (Newton/Magnet): Root index → hue, iteration count → brightness
- **Chord root → palette**: 12 chromatic palettes, peak brightness at 0.85, loop to saturated mid-tone
- **Song key vignette**: Radial gradient overlay using key color

### Chromatic Palette Assignments

| PC | Note | Color | Notes |
|----|------|-------|-------|
| 0 | C | Silver Grey | Neutral anchor |
| 1 | C# | Warm Violet | Accidental, shifted warm |
| 2 | D | Deep Purple | |
| 3 | D# | Slate Blue | Accidental, cool |
| 4 | E | Ocean Blue | 0/G/B structure, no red |
| 5 | F | Aqua/Cyan | Green-leaning |
| 6 | F# | Warm Teal | Accidental |
| 7 | G | Emerald Green | Anchor |
| 8 | G# | Orange | Bridges green→red |
| 9 | A | Fire | Red→orange→yellow, anchor |
| 10 | A# | Dusty Mauve | Accidental, purple-shifted |
| 11 | B | Fuchsia | |

## Rendering

Multi-worker band-split, offscreen canvas at `displaySize * fidelity` (default 0.45x), `BASE_RANGE = 5.8`.

## Fractal Config Panel (`src/fractal-config.ts`)

Interactive editor for fractal anchor points. Each harmonic degree (I-VII) maps to a c-plane position in one of 18 fractal families, with 4 orbit offsets for beat-synchronized motion.

**Access:** Click "Fractal Config" button in the top bar.

**Features:**
- **Family dropdown**: All 18 types (Standard through Multicorn-3). Includes Newton, Nova, Sine, Magnet, Barnsley variants
- **Degree buttons**: Select which degree (I-VII) to edit
- **Quality buttons**: Select chord quality (M, m, 7, m7, °, +) per degree
- **Click to place**: Click on locus to set anchor position for selected degree
- **Drag orbits**: Drag numbered dots (1-4) to shape beat motion. Shift+drag snaps to axis
- **Pan/zoom**: Drag to pan, Ctrl+wheel to zoom (debounced with scaled preview), double-click to reset view
- **Live preview**: Animated Julia set preview with configurable BPM
- **Palette selector**: Choose color palette for preview
- **🎲 Surprise**: Generate random boundary-seeking anchors for unlocked cells
- **🔒 Lock/Unlock**: Per-cell and per-degree locking preserves anchors during Surprise
- **🎲🔥 Temperature**: Per-degree slider controls reroll variation (low=refine nearby, high=explore widely)
- **↩ Recall**: Reset current anchor's orbits to NESW cardinal pattern
- **🗺️ Atlas**: Toggle 8x8 Julia set thumbnail grid overlay on locus
- **📋 Copy**: Export anchors as TypeScript code
- **▶ Progression**: Play chord progressions with audio to audition anchors
- **Save**: Persist to localStorage and close panel

**Data flow:**
- Anchors stored in `localStorage['fractal-anchors']`
- Custom presets include anchors via `getFullState()`
- `music-mapper.ts` reads anchors to drive fractal visualization

## Exploration Tools

- **Config tool** (`public/config.html`): Multi-panel cross-family anchor picker with zoom/pan, orbit dot dragging, TypeScript export
- **Shape atlas** (`public/shape-atlas.html`): Julia set thumbnail grid across parameter space
