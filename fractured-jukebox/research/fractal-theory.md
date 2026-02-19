# A Working Theory of Fractals for Music Visualization

*This document synthesizes fractal research into a practical framework for music-reactive visualization.*

---

## 0. The Core Model

### Fractals as Visual Metaphor for Music

Fractals embody concepts that parallel musical structure:

| Fractal Property | Musical Parallel |
|-----------------|------------------|
| **Self-similarity** | Motifs recurring at different scales (theme/variation) |
| **Infinite detail** | Harmonic overtones, microtiming nuances |
| **Boundary dynamics** | Tension at the edge between consonance/dissonance |
| **Parameter sensitivity** | Small harmonic changes create large emotional shifts |

```
VISUAL EXPERIENCE = f(Fractal Type × Parameters × Animation Path)
```

At its core:
1. **Fractal type** → Overall visual vocabulary (angular vs organic, symmetric vs asymmetric)
2. **c-parameter** → Position in the "sonic landscape" (chord/degree anchor)
3. **Animation** → Musical motion (beat-synced orbits, transitions between chords)

### The Three Pillars of Fractal-Music Mapping

#### Pillar 1: Type Selection (What Visual Language?)

Different fractal families have distinct visual characters that map to harmonic qualities:

| Visual Character | Fractal Types | Musical Analog |
|-----------------|---------------|----------------|
| **Organic, flowing** | Standard Julia, Celtic | Major chords, consonance |
| **Angular, sharp** | Burning Ship, Tricorn | Tension, minor, diminished |
| **Symmetric, stable** | Multibrot (n>2), Newton | Resolution, tonic function |
| **Complex, layered** | Phoenix, Nova | 7th chords, extensions |
| **Chaotic, unstable** | Collatz, Magnet | Augmented, chromatic |

**Implementation**: Use mixed cross-family anchors per degree/quality.

#### Pillar 2: Parameter Space (Where in c-Space?)

The c-parameter determines the Julia set's shape. Musical harmony maps to c-space:

| c-Space Region | Visual Result | Musical Mapping |
|----------------|---------------|-----------------|
| **Set interior** | Filled, stable | Tonic stability |
| **Set boundary** | Maximum detail | Harmonic tension |
| **Set exterior** | Escaping, sparse | Unresolved, suspended |
| **Near boundary** | Rich detail, dynamic | Dominant function |

**Implementation**: Curated anchors per degree × quality, stored via config tool.

#### Pillar 3: Animation (How Does It Move?)

Static fractals are pretty; animated fractals are music visualization:

| Motion Type | c-Space Behavior | Musical Trigger |
|-------------|------------------|-----------------|
| **Orbit** | Circular/elliptical path | Beat grid (4 points per beat) |
| **Transition** | Interpolate between anchors | Chord changes |
| **Zoom pulse** | Range/scale modulation | Kick/snare impacts |
| **Rotation** | View angle change | Impulse accumulation |

---

## 1. Fractal Family Selection

### The Type-Quality Matrix

Map chord qualities to fractal families for visual coherence:

```typescript
const QUALITY_TO_FAMILY: Record<ChordQuality, number[]> = {
  'major':   [0, 6],      // Standard, Celtic (clean, balanced)
  'minor':   [3, 8],      // Burning Ship, PerpBurn (angular)
  'dom7':    [5, 9],      // Phoenix, Buffalo (complex, forward)
  'min7':    [5, 0],      // Phoenix, Standard (mellow complexity)
  'dim':     [4, 3],      // Tricorn, Burning Ship (unstable)
  'aug':     [1, 2],      // Cubic, Quartic (symmetric, odd)
};
```

### Animation Quality by Family

| Family | Smoothness | Predictability | Best For |
|--------|------------|----------------|----------|
| **Standard Julia** | Excellent | High | General use, any music |
| **Celtic** | Excellent | High | Melodic passages, major keys |
| **Tricorn** | Very Good | Medium | Tension, minor passages |
| **Burning Ship** | Good | Medium | Angular, rhythmic music |
| **Phoenix** | Good | Medium | Complex harmony, jazz |
| **Newton** | Very Good | High | Resolution moments |
| **Buffalo** | Good | Medium | Bass-heavy sections |

### Current Cross-Family Anchor Strategy

Mixed families per degree for visual variety:

```typescript
const DEGREE_FAMILIES = {
  1: ['celtic', 'standard'],     // Tonic: clean, stable
  2: ['perpburn', 'phoenix'],    // Supertonic: moderate complexity
  3: ['phoenix', 'celtic'],      // Mediant: ambiguous
  4: ['celtic', 'buffalo'],      // Subdominant: motion
  5: ['perpburn', 'burning'],    // Dominant: tension
  6: ['phoenix', 'standard'],    // Submediant: relative minor
  7: ['burning', 'tricorn'],     // Leading tone: maximum tension
};
```

---

## 2. Parameter Space Navigation

### The Anchor Model

Each degree × quality combination has a pre-curated c-value (anchor) found via the config tool:

```typescript
interface FractalAnchor {
  type: number;           // Fractal family (0-9)
  cr: number;             // Real part of c
  ci: number;             // Imaginary part of c
  orbits: OrbitOffset[];  // 4 beat-synced offset points
}
```

### Finding Good Anchors

**Critical insight**: Interior points are DARK (they don't escape). For bright, colorful fractals, place anchors in the **exterior**, just outside the set boundary. This is where escape-time coloring produces rich gradients.

Criteria for good anchors:

1. **Prefer exterior side of boundary** — Exterior points escape and get colored; interior points are black
2. **Not too far exterior** — Very far = everything escapes instantly, no gradient detail
3. **Bias toward larger |c| values** — Pushes anchor into exterior with rich color bands
4. **Stable under small perturbation** — Animation won't cause sudden changes

```typescript
function isGoodAnchor(cr: number, ci: number, type: number): boolean {
  const probeRadius = 0.03;
  const probes = [
    [cr, ci], [cr + probeRadius, ci], [cr - probeRadius, ci],
    [cr, ci + probeRadius], [cr, ci - probeRadius],
    // ... 4 diagonal probes
  ];

  let interior = 0, exterior = 0;
  for (const [pr, pi] of probes) {
    const escaped = computeEscape(pr, pi, type, 150);
    if (escaped === 0) interior++; else exterior++;
  }

  // Want MAJORITY exterior for bright visuals (60-80% exterior is ideal)
  // Some interior gives boundary detail, but too much = dark
  const exteriorRatio = exterior / probes.length;
  return exteriorRatio > 0.6 && exteriorRatio < 0.95;
}
```

**Practical tip**: If your fractal looks too dark, increase |c| to push the anchor further into the exterior. For most families, |c| ~ 0.5-0.8 produces bright, detailed results.

### Physics-Based Orbit System

The c-value continuously orbits around each anchor using physics simulation, creating organic "dancing" motion driven by groove curves.

#### Core Model

```typescript
// State variables (per-frame persistent)
let orbitAngle = 0;           // Current position on orbit circle (radians)
let orbitRadiusOffset = 0;    // Deviation from base radius
let orbitRadiusVel = 0;       // Radial velocity

// Each anchor defines a base orbit radius
const baseRadius = computeOrbitRadius(anchor.orbits);  // Average magnitude

// Final c-value position
const effectiveRadius = baseRadius + orbitRadiusOffset;
const c = {
  r: anchor.cr + effectiveRadius * Math.cos(orbitAngle),
  i: anchor.ci + effectiveRadius * Math.sin(orbitAngle),
};
```

#### Angular Motion (Continuous Rotation)

The c-value rotates around the anchor at a base rate of one revolution per bar, modulated by groove:

```typescript
const barDuration = beat.beatDuration * beat.beatsPerBar;
const baseAngularSpeed = (Math.PI * 2) / barDuration;

// Groove modulates angular speed (±40% at max tension)
const grooveSpeedMod = (beatGroove - 0.5) * tension * 0.4;
orbitAngle += baseAngularSpeed * (1 + grooveSpeedMod) * dt;
```

#### Radial Physics (Spring-Damped Oscillator)

The radius oscillates around the base value using spring physics with groove-driven impulses:

```typescript
// Groove-driven forces (WHEN to push)
const emphasis = (beat.beatIndex % 2 === 0) ? 1.0 : 0.7;  // 2-feel
const beatKick = beatArrival * tension * 0.15 * emphasis; // Kick outward on beat
const barKick = barArrival * tension * 0.25;              // Bigger kick on bar 1
const anticipationPull = -beatAnticipation * tension * 0.08; // Pull inward before beat

orbitRadiusVel += beatKick + barKick + anticipationPull;

// Spring return + damping
const radiusK = 8.0;       // Spring constant
const radiusDamping = 2.5; // Damping
orbitRadiusVel += (-radiusK * orbitRadiusOffset - radiusDamping * orbitRadiusVel) * dt;
orbitRadiusOffset += orbitRadiusVel * dt;
```

#### Key Principles

1. **Groove curves control timing**: `beatArrival`, `barArrival`, `beatAnticipation` determine WHEN forces apply
2. **Tension controls magnitude**: Musical tension (0-1) scales all forces - calm music = calm motion
3. **2-feel emphasis**: Beats 1 & 3 get stronger kicks than 2 & 4
4. **Spring physics**: Natural return to base radius, prevents runaway motion

#### Legacy Format Migration

Old anchors defined 4 discrete orbit points. The new system uses a single radius computed as the average magnitude:

```typescript
function computeOrbitRadius(orbits: Array<{dr: number, di: number}>): number {
  if (!orbits || orbits.length === 0) return 0.12;
  let sum = 0;
  for (const o of orbits) {
    sum += Math.sqrt(o.dr * o.dr + o.di * o.di);
  }
  return sum / orbits.length;
}
```

#### Orbit Magnitude by Family

Different families have vastly different **boundary sensitivity**—how much the visual changes per unit movement in c-space. This determines appropriate orbit sizes.

**Important**: In practice, orbits need to be **3-5x larger** than pure boundary sensitivity would suggest. Small orbits (0.02-0.05) produce barely perceptible motion. Visible, musical animation requires orbits in the **0.08-0.40 range**. The table below reflects tested values from working presets:

| Family | Sensitivity | Recommended Orbit | Notes |
|--------|-------------|-------------------|-------|
| **Standard (0)** | Medium | 0.10 - 0.25 | Classic behavior, forgiving |
| **Cubic (1)** | Medium | 0.08 - 0.20 | Slightly tighter than quadratic |
| **Burning Ship (3)** | High | 0.15 - 0.40 | Needs large orbits despite sensitivity |
| **Tricorn (4)** | Medium-High | 0.10 - 0.30 | Angular features respond well |
| **Phoenix (5)** | Medium | 0.08 - 0.15 | Temporal smoothing helps |
| **Celtic (6)** | Medium | 0.15 - 0.40 | Knot patterns need room to flow |
| **Newton (10)** | **Low** | 0.10 - 0.20 | Basin boundaries stable |
| **Nova (11)** | Medium | 0.06 - 0.15 | Julia-like, moderate orbits work |
| **Sine (12)** | Medium-Low | 0.10 - 0.20 | Periodic, stable within period |
| **Magnet (13)** | High | 0.03 - 0.08 | Near convergence point is sensitive |
| **Barnsley (14-16)** | Medium-High | 0.08 - 0.15 | Conditional branching creates sensitivity |
| **Multicorn (17)** | Medium | 0.08 - 0.18 | Similar to Tricorn |

**Key insight**: Convergence-based fractals (Newton, Magnet) are often *less* sensitive in their interior because they're "attracted" to fixed points. Escape-based fractals near boundaries are more sensitive.

**Practical note**: Working presets (e.g., PRESET_ANCHORS in fractal-config.ts) use orbits of 0.15-0.40 for most families. When in doubt, start with R=0.15 and adjust.

#### Finding Good Orbit Radius

1. **Start at boundary**: Place anchor where ~40% of nearby points escape (use config tool probing)

2. **Test with moderate radius**: Start with R = 0.12, adjust based on visual response

3. **Check full circle**: The continuous orbit should stay in the colorful exterior zone

4. **Match family character**:
   - Angular families (Burning Ship, Tricorn) → smaller radius, physics creates variety
   - Organic families (Celtic, Phoenix) → larger radius works well
   - Convergence families (Newton) → moderate radius, stable motion

#### Physics Tuning by Musical Context

The physics constants in the orbit system can be adjusted for different feels:

| Context | Spring K | Damping | Result |
|---------|----------|---------|--------|
| **Calm/ambient** | 12.0 | 4.0 | Slower return, gentle wobble |
| **Driving rhythm** | 8.0 | 2.5 | Bouncy, responsive (default) |
| **High energy** | 6.0 | 1.5 | More oscillation, looser feel |
| **Climax** | Asymmetric | 1.5× base | Strong 1, weak 2,4 |
| **Resolution** | Circular | 0.3× base | None |

---

## 3. Animation Principles

### Chord Transitions

When chords change, smoothly interpolate to new anchor:

```typescript
const SNAP_RATE = 8.0;  // ~0.12s to 90%

function updateC(dt: number, targetAnchor: FractalAnchor) {
  const blend = 1 - Math.exp(-SNAP_RATE * dt);
  this.currentC.r += (targetAnchor.cr - this.currentC.r) * blend;
  this.currentC.i += (targetAnchor.ci - this.currentC.i) * blend;
}
```

### Rotation System

Impulse-based with friction:

```typescript
const ROTATION_FRICTION = 1.2;  // Half-life ~0.58s

function updateRotation(dt: number, kick: boolean, snare: boolean) {
  // Beat alternates CW/CCW
  if (onBeat) this.rotationVel += (beatIndex % 2 === 0 ? 0.15 : -0.15);

  // Drums add impulse
  if (kick) this.rotationVel -= 0.25;  // CCW
  if (snare) this.rotationVel += 0.30; // CW

  // Apply friction
  this.rotationVel *= Math.exp(-ROTATION_FRICTION * dt);
  this.rotation += this.rotationVel * dt;
}
```

### Zoom Pulses

Asymmetric attack/decay for punchy response:

```typescript
const ZOOM_ATTACK = 8.0;   // Fast attack
const ZOOM_DECAY = 1.5;    // Slow decay

function updateZoom(dt: number, impact: number) {
  if (impact > 0) {
    // Fast attack
    this.zoomMod += (impact - this.zoomMod) * ZOOM_ATTACK * dt;
  } else {
    // Slow decay
    this.zoomMod *= Math.exp(-ZOOM_DECAY * dt);
  }
}
```

### Problematic Animations to Avoid

| Problem | Cause | Solution |
|---------|-------|----------|
| Sudden flashing | Crossing set boundary | Stay in boundary region |
| Freezing | Deep interior | Avoid c-values too far inside |
| Jarring jumps | Large c-space distance | Use smooth interpolation |
| Rotation death | High friction | Keep friction at ~1.2 |

---

## 4. Rendering Pipeline

### Smooth Escape Coloring

Standard escape count creates banding. Smooth it:

```typescript
function smoothEscape(iter: number, zr: number, zi: number, power: number = 2): number {
  if (iter === maxIter) return maxIter;

  const logZn = Math.log(zr * zr + zi * zi) / 2;
  const nu = Math.log(logZn / Math.log(2)) / Math.log(power);

  return iter + 1 - nu;
}
```

### Color Mapping

```typescript
// sqrt spreading prevents boundary compression
const t = Math.sqrt(smoothedIter / maxIter);

// LUT lookup (2048 entries, precomputed)
const colorIndex = Math.floor(t * (LUT_SIZE - 1));
const color = paletteLUT[colorIndex];
```

### Palette by Pitch Class

12 chromatic palettes, one per pitch class:

| PC | Note | Color Family | Rationale |
|----|------|--------------|-----------|
| 0 | C | Silver Grey | Neutral anchor |
| 4 | E | Ocean Blue | Cool, no red |
| 7 | G | Emerald Green | Anchor |
| 9 | A | Fire (red-orange-yellow) | Warm anchor |
| 11 | B | Fuchsia | Leading tone intensity |

### Multi-Worker Rendering

Split canvas into horizontal bands, compute in parallel:

```typescript
const WORKER_COUNT = navigator.hardwareConcurrency || 4;
const bandHeight = Math.ceil(height / WORKER_COUNT);

for (let i = 0; i < WORKER_COUNT; i++) {
  workers[i].postMessage({
    startY: i * bandHeight,
    endY: Math.min((i + 1) * bandHeight, height),
    params: { cr, ci, type, range, maxIter },
  });
}
```

---

## 5. Performance Characteristics

### Iteration Cost by Family

| Family | Ops/Iter | GPU-Friendly | Relative Speed |
|--------|----------|--------------|----------------|
| Standard | ~10 | Excellent | 1.0× (baseline) |
| Cubic/Quartic | ~15 | Excellent | 0.9× |
| Burning Ship | ~12 | Excellent | 0.95× |
| Celtic | ~12 | Excellent | 0.95× |
| Phoenix | ~15 | Excellent | 0.85× (needs prev z) |
| Newton | ~30 | Good | 0.6× |
| Sine/Cosine | ~40 | Poor | 0.4× |

### Bailout Strategies

```typescript
// Standard escape (most fractals)
const BAILOUT = 4.0;
if (zr * zr + zi * zi > BAILOUT) return iteration;

// High bailout for smoother gradients
const BAILOUT_HIGH = 1000.0;

// Convergence (Newton, Magnet)
const CONVERGE = 0.0001;
if (Math.abs(zr - targetR) < CONVERGE && Math.abs(zi - targetI) < CONVERGE) {
  return iteration;
}

// Overflow (trig functions)
if (Math.abs(zi) > 50) return -1;  // sinh/cosh will overflow
```

### Fidelity Scaling

Render at reduced resolution for performance:

```typescript
const fidelity = 0.45;  // 45% of display size
const renderWidth = displayWidth * fidelity;
const renderHeight = displayHeight * fidelity;

// Upscale with smoothing
ctx.imageSmoothingEnabled = true;
ctx.drawImage(offscreenCanvas, 0, 0, displayWidth, displayHeight);
```

---

## 6. Music-to-Fractal Mappings

### Tension to Visual Parameters

```typescript
function mapTension(tension: number): FractalParams {
  return {
    // Higher tension = larger orbits
    orbitScale: 1.0 + tension * 1.5,

    // Higher tension = more iterations = more detail
    maxIter: 100 + Math.floor(tension * 150),

    // Higher tension = tighter zoom
    zoom: 1.0 - tension * 0.3,

    // Higher tension = faster rotation
    rotationSensitivity: 1.0 + tension * 0.5,
  };
}
```

### Groove Curve Integration

```typescript
function applyGroove(music: MusicParams): number {
  // Anticipation creates glow
  const anticipation = music.beatAnticipation ?? 0;
  this.glowIntensity += anticipation * 0.2;

  // Arrival creates impact
  const arrival = music.beatArrival ?? 0;
  this.pulseScale = 1.0 + arrival * 0.3;

  // Continuous groove for subtle modulation
  const groove = music.beatGroove ?? 0;
  return groove * 0.1;  // 10% max modulation
}
```

### Mode Adaptation

```typescript
function adaptToMode(mode: 'major' | 'minor'): void {
  if (mode === 'major') {
    this.preferredTypes = [0, 6, 1];  // Standard, Celtic, Cubic
    this.colorBrightness = 1.1;
  } else {
    this.preferredTypes = [3, 4, 8];  // Burning Ship, Tricorn, PerpBurn
    this.colorBrightness = 0.9;
  }
}
```

---

## 7. New Families: Implementation Guide

This section provides ready-to-implement code for the most promising new fractal families, ranked by visual impact and implementation effort.

---

### 7.1 Priority Tier Overview

| Family | Visual Character | Animation | Effort | Why Add? |
|--------|------------------|-----------|--------|----------|
| **Newton** | Basin boundaries, root-colored | Excellent | Easy | Different vocabulary, fast |
| **Nova** | Layered, Julia-like | Excellent | Easy | Newton + Julia hybrid, beautiful |
| **Sine** | Periodic lattice | Very Good | Easy | Rhythm mapping |
| **Magnet I** | Flame tendrils | Good | Medium | Unique structures |
| **Barnsley** | Organic, fern-like | Good | Easy | Growth patterns |
| **Multicorn-3** | 4-fold symmetry | Very Good | Easy | Tricorn variant |

---

### 7.2 Newton Fractal (Type 10)

**What makes it special:** Instead of escape coloring, Newton fractals use *convergence coloring*—each point converges to one of n roots, colored by which root it finds. Basin boundaries form intricate fractal patterns.

**Visual character:** High contrast, distinct colored regions, n-fold symmetry.

**Best for:** Resolution moments, tonic stability, clean harmonic passages.

```typescript
// Newton iteration for z^n - 1 = 0
// Returns: [newZr, newZi, rootIndex] where rootIndex = -1 if not converged
function newtonIterate(
  zr: number, zi: number,
  n: number = 3
): [number, number, number] {
  const r2 = zr * zr + zi * zi;
  if (r2 < 1e-10) return [zr, zi, -1]; // Avoid div by zero

  const r = Math.sqrt(r2);
  const theta = Math.atan2(zi, zr);

  // z^n using polar form
  const rn = Math.pow(r, n);
  const znr = rn * Math.cos(n * theta);
  const zni = rn * Math.sin(n * theta);

  // n * z^(n-1)
  const rn1 = Math.pow(r, n - 1);
  const nzn1r = n * rn1 * Math.cos((n - 1) * theta);
  const nzn1i = n * rn1 * Math.sin((n - 1) * theta);

  // Newton step: z - (z^n - 1) / (n * z^(n-1))
  const den = nzn1r * nzn1r + nzn1i * nzn1i;
  const numR = znr - 1;
  const numI = zni;
  const stepR = (numR * nzn1r + numI * nzn1i) / den;
  const stepI = (numI * nzn1r - numR * nzn1i) / den;

  const nr = zr - stepR;
  const ni = zi - stepI;

  // Check convergence to each root (nth roots of unity)
  for (let k = 0; k < n; k++) {
    const rootR = Math.cos(2 * Math.PI * k / n);
    const rootI = Math.sin(2 * Math.PI * k / n);
    const dist = (nr - rootR) ** 2 + (ni - rootI) ** 2;
    if (dist < 0.0001) return [nr, ni, k];
  }

  return [nr, ni, -1];
}

// Newton coloring: root → hue, iterations → brightness
function colorNewton(rootIndex: number, iterations: number, n: number, maxIter: number): [number, number, number] {
  if (rootIndex < 0) return [0, 0, 0]; // Didn't converge

  // Root determines hue (evenly distributed around color wheel)
  const hue = (rootIndex / n) * 360;

  // Iterations determine brightness (fewer iterations = brighter = faster convergence)
  const brightness = 0.3 + 0.7 * (1 - iterations / maxIter);

  // Convert HSL to RGB
  return hslToRgb(hue, 0.85, brightness);
}

// Locus function (for Shape Atlas): returns escape/convergence iteration
function newtonLocus(cr: number, ci: number, maxIter: number): number {
  let zr = cr, zi = ci;
  for (let i = 0; i < maxIter; i++) {
    const [nr, ni, root] = newtonIterate(zr, zi, 3);
    if (root >= 0) return i; // Converged
    zr = nr; zi = ni;
  }
  return 0; // Didn't converge
}
```

**Recommended bounds:** [-2, 2] × [-2, 2]

**Animation notes:** Animating the polynomial (e.g., z³ - c instead of z³ - 1) creates Julia-like parameter sensitivity. Very smooth.

---

### 7.3 Nova Fractal (Type 11)

**What makes it special:** Nova combines Newton's method with a Julia constant, creating layered structures that have both Newton's basin boundaries and Julia's infinite detail.

**Formula:** `z = z - (z^n - 1)/(n·z^(n-1)) + c`

**Visual character:** Layered, spiraling, extremely detailed. The c parameter creates Julia-like variations.

**Best for:** Complex harmony (7th chords, jazz), forward motion, tension building.

```typescript
// Nova iteration: Newton step + Julia perturbation
function novaIterate(
  zr: number, zi: number,
  cr: number, ci: number,
  n: number = 3
): [number, number] {
  const r2 = zr * zr + zi * zi;
  if (r2 < 1e-10) return [cr, ci]; // Near zero, just return c

  const r = Math.sqrt(r2);
  const theta = Math.atan2(zi, zr);

  // z^n
  const rn = Math.pow(r, n);
  const znr = rn * Math.cos(n * theta);
  const zni = rn * Math.sin(n * theta);

  // n * z^(n-1)
  const rn1 = Math.pow(r, n - 1);
  const nzn1r = n * rn1 * Math.cos((n - 1) * theta);
  const nzn1i = n * rn1 * Math.sin((n - 1) * theta);

  // Newton step
  const den = nzn1r * nzn1r + nzn1i * nzn1i;
  if (den < 1e-10) return [zr + cr, zi + ci];

  const numR = znr - 1;
  const numI = zni;
  const stepR = (numR * nzn1r + numI * nzn1i) / den;
  const stepI = (numI * nzn1r - numR * nzn1i) / den;

  // Nova: z - step + c (the +c is the Julia part)
  return [zr - stepR + cr, zi - stepI + ci];
}

// Nova uses escape OR convergence bailout
function novaCompute(
  zr: number, zi: number,
  cr: number, ci: number,
  maxIter: number
): number {
  for (let i = 0; i < maxIter; i++) {
    const mag = zr * zr + zi * zi;
    if (mag > 100) return i; // Escaped

    // Check convergence to roots
    for (let k = 0; k < 3; k++) {
      const rootR = Math.cos(2 * Math.PI * k / 3);
      const rootI = Math.sin(2 * Math.PI * k / 3);
      if ((zr - rootR) ** 2 + (zi - rootI) ** 2 < 0.0001) {
        return i; // Converged
      }
    }

    [zr, zi] = novaIterate(zr, zi, cr, ci, 3);
  }
  return maxIter;
}
```

**Recommended bounds:** c-space is similar to Julia sets: [-2, 2] × [-2, 2]

**Interesting c-values to explore:**
- c = 0 → Pure Newton fractal
- c near origin → Subtle Julia perturbation
- |c| ~ 0.3-0.5 → Rich layered structures
- |c| > 1 → Chaotic, escape-dominated

---

### 7.4 Sine Fractal (Type 12)

**What makes it special:** Periodic structure along the real axis creates a lattice-like pattern. The periodicity maps naturally to rhythmic/cyclic musical features.

**Formula:** `z = c · sin(z)`

**Visual character:** Periodic horizontal banding, hyperbolic vertical growth, wave-like patterns.

**Best for:** Rhythmic passages, cyclic harmonies, verse-chorus structure.

```typescript
// Sine fractal: z = c * sin(z)
function sineIterate(
  zr: number, zi: number,
  cr: number, ci: number
): [number, number] {
  // sin(z) = sin(x)cosh(y) + i·cos(x)sinh(y)
  const sinR = Math.sin(zr) * Math.cosh(zi);
  const sinI = Math.cos(zr) * Math.sinh(zi);

  // c * sin(z)
  return [
    cr * sinR - ci * sinI,
    cr * sinI + ci * sinR
  ];
}

// Must use overflow bailout for trig functions
function sineCompute(
  zr: number, zi: number,
  cr: number, ci: number,
  maxIter: number
): number {
  for (let i = 0; i < maxIter; i++) {
    // Overflow bailout (sinh/cosh explode)
    if (Math.abs(zi) > 50) return i;

    // Standard escape
    if (zr * zr + zi * zi > 100) return i;

    [zr, zi] = sineIterate(zr, zi, cr, ci);
  }
  return maxIter;
}
```

**Recommended bounds:** z-space: [-π, π] × [-3, 3]; c-space: [-2, 2] × [-2, 2]

**Performance note:** `Math.sinh` and `Math.cosh` are slower than polynomial ops. Use sparingly or pre-cache.

**Music mapping idea:** The periodic spacing (π) could map to bar length or chord progressions.

---

### 7.5 Magnet Type I (Type 13)

**What makes it special:** Derived from statistical mechanics (Ising model renormalization). Has a fixed point at z = 1, creating unique "flame-like" tendrils that converge rather than escape.

**Formula:** `z = ((z² + c - 1) / (2z + c - 2))²`

**Visual character:** Flame-like, organic tendrils, both connected and disconnected regions.

**Best for:** Tension, intensity, climactic moments.

```typescript
// Magnet Type I iteration
function magnetIterate(
  zr: number, zi: number,
  cr: number, ci: number
): [number, number] {
  // Numerator: z² + c - 1
  const numR = zr * zr - zi * zi + cr - 1;
  const numI = 2 * zr * zi + ci;

  // Denominator: 2z + c - 2
  const denR = 2 * zr + cr - 2;
  const denI = 2 * zi + ci;

  // Complex division
  const den2 = denR * denR + denI * denI;
  if (den2 < 1e-10) return [1e10, 1e10]; // Near pole

  const divR = (numR * denR + numI * denI) / den2;
  const divI = (numI * denR - numR * denI) / den2;

  // Square the result
  return [
    divR * divR - divI * divI,
    2 * divR * divI
  ];
}

// Magnet uses CONVERGENCE to z=1, not escape
function magnetCompute(
  zr: number, zi: number,
  cr: number, ci: number,
  maxIter: number
): number {
  for (let i = 0; i < maxIter; i++) {
    // Check convergence to fixed point z = 1
    const distToOne = (zr - 1) ** 2 + zi ** 2;
    if (distToOne < 0.0001) return i;

    // Check escape (use different color)
    if (zr * zr + zi * zi > 1000) return -i; // Negative = escaped

    [zr, zi] = magnetIterate(zr, zi, cr, ci);
  }
  return maxIter;
}
```

**Recommended bounds:** [-3, 3] × [-3, 3]

**Coloring note:** Use sign of return value to distinguish converged (positive) from escaped (negative).

---

### 7.6 Barnsley Fractal (Type 14-16)

**What makes it special:** Conditional iteration based on sign creates asymmetric, organic, fern-like growth patterns.

**Visual character:** Directional growth, natural/organic appearance, strong asymmetry.

**Best for:** Growth themes, nature-inspired pieces, building passages.

```typescript
// Barnsley Type 1: condition on Re(z)
function barnsleyType1(
  zr: number, zi: number,
  cr: number, ci: number
): [number, number] {
  const dr = zr >= 0 ? zr - 1 : zr + 1;
  // (z ± 1) * c
  return [
    dr * cr - zi * ci,
    dr * ci + zi * cr
  ];
}

// Barnsley Type 2: condition on Im(z*c)
function barnsleyType2(
  zr: number, zi: number,
  cr: number, ci: number
): [number, number] {
  const prod = zr * ci + zi * cr; // Im(z * c)
  const dr = prod >= 0 ? zr - 1 : zr + 1;
  return [
    dr * cr - zi * ci,
    dr * ci + zi * cr
  ];
}

// Barnsley Type 3: quadratic with conditional term
function barnsleyType3(
  zr: number, zi: number,
  cr: number, ci: number
): [number, number] {
  const z2r = zr * zr - zi * zi - 1;
  const z2i = 2 * zr * zi;

  if (zr > 0) {
    return [z2r + cr, z2i + ci];
  } else {
    return [
      z2r + cr * zr + cr,
      z2i + ci * zr + ci
    ];
  }
}
```

**Recommended bounds:** [-2, 2] × [-2, 2]

**Animation note:** Barnsley fractals are more sensitive to c-value changes. Use smaller orbit radii.

---

### 7.7 Multicorn-3 (Type 17)

**What makes it special:** Higher-order Tricorn with 4-fold symmetry. Uses conjugate operation with cubic power.

**Formula:** `z = conj(z)³ + c`

**Visual character:** 4-fold symmetric, angular but balanced, intermediate between Tricorn and Quartic.

```typescript
// Multicorn-3: z = conj(z)^3 + c
function multicorn3Iterate(
  zr: number, zi: number,
  cr: number, ci: number
): [number, number] {
  // conj(z) = (zr, -zi)
  // conj(z)^3 in polar form
  const r = Math.sqrt(zr * zr + zi * zi);
  const theta = Math.atan2(-zi, zr); // Note: -zi for conjugate

  const r3 = r * r * r;
  return [
    r3 * Math.cos(3 * theta) + cr,
    r3 * Math.sin(3 * theta) + ci
  ];
}
```

**Recommended bounds:** [-1.5, 1.5] × [-1.5, 1.5]

---

### 7.8 Type Number Assignment

```typescript
const FRACTAL_TYPES = {
  // Existing (0-9)
  STANDARD: 0,
  CUBIC: 1,
  QUARTIC: 2,
  BURNING_SHIP: 3,
  TRICORN: 4,
  PHOENIX: 5,
  CELTIC: 6,
  LAMBDA: 7,
  PERP_BURN: 8,
  BUFFALO: 9,

  // New Priority Tier 1
  NEWTON_3: 10,
  NOVA: 11,
  SINE: 12,

  // New Priority Tier 2
  MAGNET_1: 13,
  BARNSLEY_1: 14,
  BARNSLEY_2: 15,
  BARNSLEY_3: 16,
  MULTICORN_3: 17,
} as const;
```

---

### 7.9 Music Mapping for New Families

| Family | Chord Quality | Tension | Musical Moment |
|--------|---------------|---------|----------------|
| **Newton** | Major, resolution | Low | Cadences, tonic |
| **Nova** | Dom7, min7 | Medium-High | Jazz, extensions |
| **Sine** | Suspended | Medium | Cyclic, rhythmic |
| **Magnet** | Augmented, dim | High | Climax, intensity |
| **Barnsley** | Minor, modal | Medium | Growth, development |
| **Multicorn** | Minor, chromatic | Medium | Tension, mystery |

**Orbit Tuning for New Families:**

| Family | Base Radius | Pattern | Notes |
|--------|-------------|---------|-------|
| **Newton (10)** | 0.08 - 0.12 | Circular | Large moves OK, basins are stable |
| **Nova (11)** | 0.03 - 0.05 | Circular | More sensitive than Newton, Julia-like |
| **Sine (12)** | 0.08 - 0.15 | Pendulum | Move along real axis for periodic effect |
| **Magnet (13)** | 0.02 - 0.04 | Breathing | Stay near convergence region |
| **Barnsley (14-16)** | 0.03 - 0.05 | Asymmetric | Conditional branching needs care |
| **Multicorn (17)** | 0.03 - 0.06 | Circular | Similar to Tricorn |

**Degree-Family Recommendations:**
```typescript
const NEW_DEGREE_FAMILIES = {
  1: ['newton', 'standard'],      // Tonic: resolution, clean
  2: ['nova', 'sine'],            // Supertonic: forward motion
  3: ['barnsley', 'celtic'],      // Mediant: organic
  4: ['sine', 'multicorn'],       // Subdominant: cyclic
  5: ['nova', 'magnet'],          // Dominant: tension, power
  6: ['barnsley', 'phoenix'],     // Submediant: growth
  7: ['magnet', 'nova'],          // Leading: maximum tension
};
```

---

## 8. Coloring Strategies

Different fractal types require different coloring approaches.

### 8.1 Escape Coloring (Standard, Burning Ship, Celtic, etc.)

The classic approach—color by how fast the point escapes:

```typescript
function escapeColor(iter: number, zr: number, zi: number, maxIter: number): number {
  if (iter === maxIter) return 0; // Interior = black

  // Smooth iteration count
  const logZn = Math.log(zr * zr + zi * zi) / 2;
  const nu = Math.log(logZn / Math.log(2)) / Math.log(2);
  const smooth = iter + 1 - nu;

  // sqrt spreading for boundary detail
  return Math.sqrt(smooth / maxIter);
}
```

### 8.2 Convergence Coloring (Newton, Magnet)

Color by *which* attractor the point converges to, and *how fast*:

```typescript
function convergenceColor(
  rootIndex: number,
  iter: number,
  numRoots: number,
  maxIter: number
): [number, number, number] {
  if (rootIndex < 0) return [0, 0, 0]; // Didn't converge

  // Root → evenly-spaced hues
  const hue = (rootIndex / numRoots) * 360;

  // Fast convergence = bright, slow = dark
  const lightness = 0.25 + 0.65 * (1 - iter / maxIter);

  return hslToRgb(hue, 0.8, lightness);
}
```

### 8.3 Hybrid Coloring (Nova, Magnet)

Some fractals both escape AND converge. Track both:

```typescript
function hybridColor(
  escaped: boolean,
  convergedRoot: number,
  iter: number,
  maxIter: number
): [number, number, number] {
  if (escaped) {
    // Use warm palette for escape
    const t = Math.sqrt(iter / maxIter);
    return [255 * t, 128 * t, 64 * t];
  } else if (convergedRoot >= 0) {
    // Use cool palette for convergence
    return convergenceColor(convergedRoot, iter, 3, maxIter);
  } else {
    return [0, 0, 0]; // Neither
  }
}
```

### 8.4 Music-Adaptive Coloring

Map chord root to palette, tension to saturation:

```typescript
function musicColor(
  t: number,              // 0-1 escape/convergence value
  chordRoot: number,      // 0-11 pitch class
  tension: number,        // 0-1 harmonic tension
  paletteLUT: Uint8Array  // 2048 × 3 color LUT
): [number, number, number] {
  // Palette from chord root
  const paletteOffset = chordRoot * 2048 * 3;
  const idx = Math.floor(t * 2047) * 3;

  let r = paletteLUT[paletteOffset + idx];
  let g = paletteLUT[paletteOffset + idx + 1];
  let b = paletteLUT[paletteOffset + idx + 2];

  // Tension → saturation boost
  if (tension > 0.5) {
    const boost = (tension - 0.5) * 0.4;
    r = Math.min(255, r * (1 + boost));
    g = Math.min(255, g * (1 + boost));
    b = Math.min(255, b * (1 + boost));
  }

  return [r, g, b];
}
```

---

## 9. Quick Reference

### Iteration Formulas

**Existing (Types 0-9):**
```
Standard:      z = z² + c
Cubic:         z = z³ + c
Quartic:       z = z⁴ + c
Burning Ship:  z = (|Re(z)| + i|Im(z)|)² + c
Tricorn:       z = conj(z)² + c
Phoenix:       z = z² + c + p·z_{n-1}
Celtic:        z = |Re(z²)| + i·Im(z²) + c
Lambda:        z = c·z·(1-z)
PerpBurn:      z = (Re(z) + i|Im(z)|)² + c
Buffalo:       z = |z|² - |z| + c
```

**New Priority Families (Types 10+):**
```
Newton-3:      z = z - (z³-1)/(3z²)           [convergence]
Nova:          z = z - (z³-1)/(3z²) + c       [escape + convergence]
Sine:          z = c·sin(z)                   [escape, overflow risk]
Magnet-I:      z = ((z²+c-1)/(2z+c-2))²       [convergence to z=1]
Barnsley-1:    z = (z±1)·c based on Re(z)    [escape]
Multicorn-3:   z = conj(z)³ + c               [escape]
```

### Bailout Conditions

| Type | Bailout | Threshold |
|------|---------|-----------|
| Standard/Burning/Celtic | Escape | `|z|² > 4` |
| Newton/Magnet | Convergence | `|z - target| < 0.0001` |
| Nova | Both | Escape OR converge |
| Sine/Cosine | Overflow | `|Im(z)| > 50` |

### Recommended Bounds

```
Standard:      [-2.5, 1.5] × [-1.8, 1.8]
Cubic:         [-1.5, 1.5] × [-1.5, 1.5]
Quartic:       [-1.3, 1.3] × [-1.3, 1.3]
Burning Ship:  [-2.5, 1.5] × [-2.0, 1.0]
Newton:        [-2.0, 2.0] × [-2.0, 2.0]
Nova:          [-2.0, 2.0] × [-2.0, 2.0]
Sine:          [-π, π] × [-3, 3]
Magnet:        [-3.0, 3.0] × [-3.0, 3.0]
```

### Family Character Summary

```
Standard   → Organic, flowing, classic
Burning    → Angular, ship-like, dramatic
Tricorn    → Three-pronged, sharp
Celtic     → Knot patterns, intricate
Phoenix    → Temporal complexity, layered
Buffalo    → Distinct locus shape
Newton     → Basin boundaries, root-colored, high contrast
Nova       → Layered, spiraling, extremely detailed
Sine       → Periodic lattice, wave-like
Magnet     → Flame tendrils, organic convergence
Barnsley   → Fern-like, directional growth
Multicorn  → 4-fold symmetric, angular
```

### Parameter Ranges for Music

```
Orbit radius:      0.01 - 0.08 (typical: 0.03)
Snap rate:         4.0 - 12.0  (typical: 8.0)
Rotation friction: 0.8 - 2.0   (typical: 1.2)
Max iterations:    100 - 300   (typical: 200)
Bailout:           4.0 - 1000  (typical: 4.0)
Fidelity:          0.3 - 1.0   (typical: 0.45)
Convergence:       0.0001      (Newton/Magnet)
Overflow limit:    50          (trig functions)
```

### Animation Quality Ranking

| Family | Smoothness | Predictability | Score |
|--------|------------|----------------|-------|
| Standard | Excellent | High | 9/10 |
| Celtic | Excellent | High | 9/10 |
| Newton | Very Good | High | 9/10 |
| Nova | Very Good | Medium | 8/10 |
| Tricorn | Very Good | Medium | 8/10 |
| Burning Ship | Good | Medium | 8/10 |
| Phoenix | Good | Medium | 8/10 |
| Sine | Very Good | High | 8/10 |
| Multicorn | Very Good | High | 8/10 |
| Buffalo | Good | Medium | 7/10 |
| Magnet | Good | Low | 7/10 |
| Barnsley | Good | Medium | 7/10 |

---

## 10. Implementation Checklist

When adding a new fractal family:

- [ ] Add iteration function to `fractal-worker.ts`
- [ ] Add type constant to `FRACTAL_TYPES`
- [ ] Determine bailout strategy (escape, convergence, or hybrid)
- [ ] Add coloring approach (escape-based or root-based)
- [ ] Create locus function for Shape Atlas
- [ ] Explore parameter space, find good anchor regions
- [ ] Test animation smoothness with orbit paths
- [ ] Map to musical features (tension, quality, mode)
- [ ] Add to config tool for anchor editing
- [ ] Document in CLAUDE.md

---

## 11. Deep Dive: Sine Julia Sets

This section provides comprehensive research on the Sine Julia set family (`z = c·sin(z)`), a transcendental fractal with unique mathematical properties and visualization requirements.

---

### 11.1 Mathematical Foundation

**Iteration Formula:**
```
z_{n+1} = c · sin(z_n)
```

Where `c` is a complex constant (the Julia parameter) and `sin(z)` is the complex sine function.

**Complex Sine Definition:**
```
sin(z) = sin(x + iy) = sin(x)·cosh(y) + i·cos(x)·sinh(y)
```

This creates a function that:
- Is **periodic** along the real axis (period 2π)
- Grows **exponentially** along the imaginary axis (due to sinh/cosh)

**Component Formulas for `c·sin(z)`:**
```typescript
// Given z = x + iy and c = cr + ci
const sinR = Math.sin(x) * Math.cosh(y);
const sinI = Math.cos(x) * Math.sinh(y);

// c * sin(z) = (cr + i*ci) * (sinR + i*sinI)
const newX = cr * sinR - ci * sinI;
const newY = cr * sinI + ci * sinR;
```

---

### 11.2 Transcendental vs Polynomial Differences

Sine Julia sets are **transcendental** (non-polynomial), which creates fundamental differences from standard Julia sets:

| Property | Polynomial Julia | Sine Julia |
|----------|------------------|------------|
| **Degree** | Finite (2 for quadratic) | Infinite |
| **Critical Points** | Finite count | Infinitely many |
| **Singular Values** | Finite | Two asymptotic values (±c) |
| **Fatou Components** | No wandering domains | May have wandering domains |
| **Julia Set Dimension** | Varies | Always ≥ 1 (Baker, 1975) |
| **Special Structures** | N/A | Cantor bouquets, Baker domains |

**Baker Domains:** Transcendental Julia sets can have "Baker domains"—periodic Fatou components where iterates converge to infinity (the essential singularity). These don't exist for polynomials.

**Cantor Bouquets:** For certain parameter values, the Julia set forms a "Cantor bouquet"—a Cantor set with curves ("hairs") emanating from each point. Devaney studied this for the sine family `F_λ(z) = (λ/2i)(e^{iz} - e^{-iz})`.

---

### 11.3 Escape Condition (Critical Difference)

**Key Insight:** Unlike polynomial Julia sets, sine Julia sets require a **different escape criterion**.

```typescript
// WRONG: Standard magnitude bailout
if (zr * zr + zi * zi > 4) return i; // Doesn't work for sine!

// CORRECT: Imaginary part overflow
if (Math.abs(zi) > 50) return i; // sinh/cosh overflow detection
```

**Why?** The complex sine function grows exponentially along the imaginary axis:
- `sinh(50) ≈ 2.6 × 10²¹` — numerical overflow
- `cosh(50) ≈ 2.6 × 10²¹` — numerical overflow

Once `|Im(z)| > 50`, the orbit will escape to infinity. Using magnitude-based bailout fails because points can have large real parts while remaining bounded.

**Escape Radius:** `r_c = 50` (imaginary component) is the standard choice.

---

### 11.4 Recommended c-Parameter Values

Based on research from Paul Bourke's fractal galleries and academic studies:

| c-value | Name | Description |
|---------|------|-------------|
| **1 + 0i** | Pure Real | Clean periodic structure, good baseline |
| **1 + 0.1i** | Vortex | Swirling tendrils, excellent animation |
| **1 + 0.3i** | Swirl | More complex spiraling patterns |
| **1 + 0.5i** | Complex Swirl | Rich detail, approaching chaos boundary |
| **1 + i** | Virus | Highly detailed, organic cell-like structures |
| **0.2 + i** | Florets | Flower-like radiating patterns |
| **3i/2** (0 + 1.5i) | Vertical | Strong vertical periodicity |
| **0.984808 + 0.173648i** | Tilted | Rotated structure (≈ cis(10°)) |
| **-1.29904 - 0.75i** | Asymmetric | Left-weighted asymmetric pattern |
| **-0.2 + i** | Offset Florets | Similar to florets, shifted |
| **π/2** (1.5708 + 0i) | Quarter Period | Aligns with sine periodicity |
| **e^{iπ/4}** (0.707 + 0.707i) | 45° Phase | Diagonal symmetry |

**Parameter Space Structure:**

The "Mandelbrot analog" for `c·sin(z)` has been less thoroughly studied than the polynomial case, but exhibits these characteristics:

- **Near origin (|c| < 0.5):** Mostly stable, simple patterns
- **Unit circle region (|c| ≈ 1):** Rich structure, many interesting shapes
- **|c| > 2:** Increasingly chaotic, most orbits escape quickly
- **Pure imaginary axis:** Creates vertical wave patterns
- **Pure real axis:** Creates horizontal periodic bands

---

### 11.5 Visualization Best Practices

#### Viewing Range

```typescript
// Standard view for sine Julia sets
const SINE_BOUNDS = {
  xMin: -Math.PI,    // -3.14159...
  xMax: Math.PI,     //  3.14159...
  yMin: -3,
  yMax: 3
};

// Extended view showing periodicity
const SINE_EXTENDED = {
  xMin: -2 * Math.PI,
  xMax: 2 * Math.PI,
  yMin: -4,
  yMax: 4
};
```

The ±2π range on the real axis shows one complete period of the sine pattern.

#### Iteration Count

```typescript
const MAX_ITER = 50; // Standard (Paul Bourke's choice)
// Higher values (100-150) for boundary detail
// Lower values (30-40) for performance
```

Lower iteration counts work better than polynomial fractals because:
1. Escape happens faster (exponential growth)
2. Smooth coloring is harder to achieve (see below)

#### Coloring Challenges

**Problem:** Traditional smooth iteration formulas don't work well:

```typescript
// This smooth formula has issues for transcendental functions
const smooth = iter + 1 - Math.log(Math.log(|z|)) / Math.log(degree);
// What is "degree" for an infinite-degree function?
```

**Solutions:**

1. **Discrete iteration count:** Accept banding, use enough colors
2. **Imaginary-based smoothing:** Use `|Im(z)|` instead of `|z|`
3. **Distance estimation:** Works for transcendental functions
4. **Orbit trap coloring:** Color by distance to shapes

```typescript
// Imaginary-based pseudo-smooth coloring
function sineSmooth(iter: number, zi: number): number {
  if (Math.abs(zi) > 50) {
    const overshoot = Math.log(Math.abs(zi) / 50) / Math.log(2);
    return iter + 1 - Math.min(overshoot, 1);
  }
  return iter;
}
```

#### Performance Considerations

Sine is **slower** than polynomial fractals (≈40% relative speed):

```typescript
// Per-iteration cost comparison
// Standard: 10 ops (mul, add)
// Sine: 40+ ops (sin, cos, sinh, cosh, mul, add)

// Optimization: Precompute trig when possible
const sinX = Math.sin(zr);
const cosX = Math.cos(zr);
const sinhY = Math.sinh(zi);
const coshY = Math.cosh(zi);
```

---

### 11.6 Animation Patterns

**What Works Well:**

1. **Rotation in c-space:** Small circular orbits around a center point
2. **Real-axis pendulum:** Moving c along Re(c) creates wave-like motion
3. **Smooth transitions:** Interpolating between nearby c-values

**What to Avoid:**

1. **Large c-jumps:** Can cause sudden structure changes
2. **Crossing imaginary axis:** Pattern symmetry can flip abruptly
3. **High |c| values:** Structure becomes sparse, less interesting

**Recommended Orbit Settings:**

```typescript
const SINE_ORBIT = {
  baseRadius: 0.08,        // Smaller than polynomial types
  maxRadius: 0.15,
  angularSpeed: 'bar',     // One revolution per bar
  radiusModulation: 0.3    // 30% breathing based on tension
};
```

---

### 11.7 Mathematical Properties

#### Fixed Points

The equation `z = c·sin(z)` has fixed points where the orbit stays constant. For `c = 1`:
- `z = 0` is always a fixed point (trivial)
- Non-trivial fixed points exist at roots of `z = sin(z)` (only z=0 is real)

#### Periodic Orbits

Period-2 cycles satisfy: `z = c·sin(c·sin(z))`

For c near 1, period-2 orbits exist near `±π/2`.

#### Critical Points

The derivative of `f(z) = c·sin(z)` is `f'(z) = c·cos(z)`.

Critical points occur where `cos(z) = 0`:
- At `z = π/2 + nπ` for all integers n
- **Infinitely many** critical points (unlike polynomials)

The **critical values** are `±c` (the asymptotic values of the sine family).

#### Symmetry

For real c-values, the Julia set has **reflection symmetry** about the real axis.

For purely imaginary c-values, the Julia set has **180° rotational symmetry**.

---

### 11.8 Code Reference

Complete implementation for sine Julia sets:

```typescript
// Sine Julia iteration with proper bailout
function sineJulia(
  x0: number, y0: number,     // Starting point
  cr: number, ci: number,     // c parameter
  maxIter: number
): { iter: number; zr: number; zi: number } {
  let zr = x0, zi = y0;

  for (let i = 0; i < maxIter; i++) {
    // Check overflow BEFORE computing (prevents NaN)
    if (Math.abs(zi) > 50) {
      return { iter: i, zr, zi };
    }

    // sin(z) = sin(x)cosh(y) + i*cos(x)sinh(y)
    const sinR = Math.sin(zr) * Math.cosh(zi);
    const sinI = Math.cos(zr) * Math.sinh(zi);

    // c * sin(z)
    const newZr = cr * sinR - ci * sinI;
    const newZi = cr * sinI + ci * sinR;

    zr = newZr;
    zi = newZi;
  }

  return { iter: maxIter, zr, zi };
}

// Coloring for sine Julia (discrete + pseudo-smooth)
function sineColor(
  iter: number,
  zi: number,
  maxIter: number,
  palette: number[][]
): [number, number, number] {
  if (iter === maxIter) {
    return [0, 0, 0]; // Interior
  }

  // Pseudo-smooth based on overshoot
  let t = iter / maxIter;
  if (Math.abs(zi) > 50) {
    const overshoot = Math.log(Math.abs(zi) / 50) / Math.log(Math.E);
    t = (iter + 1 - Math.min(overshoot, 1)) / maxIter;
  }

  // Apply sqrt spreading for boundary detail
  t = Math.sqrt(t);

  const idx = Math.floor(t * (palette.length - 1));
  return palette[idx] as [number, number, number];
}
```

---

### 11.9 Music Mapping for Sine Fractals

The periodic, wave-like nature of sine fractals maps well to:

| Musical Feature | Sine Fractal Mapping |
|-----------------|---------------------|
| **Beat grid** | Align view to 2π periodicity |
| **Verse/Chorus** | Different c-values per section |
| **Rising tension** | Increase |c| toward boundary |
| **Resolution** | Return to low |c|, stable patterns |
| **Rhythmic pulse** | Radial oscillation in c-space |
| **Melodic contour** | Movement along Re(c) axis |

**Recommended Quality Mappings:**

| Chord Quality | c-Region | Rationale |
|---------------|----------|-----------|
| Major | Near 1+0i | Clean, stable |
| Minor | 0.5+0.5i region | More complex |
| Suspended | Pure imaginary | Vertical waves = suspension |
| Dominant | 1+0.3i to 1+0.5i | Rich, forward-moving |

---

### 11.10 Research Sources

- [Paul Bourke: Julia set of sin(z)](https://paulbourke.net/fractals/sinjulia/) — Parameter gallery, viewing bounds
- [Lars' Blog: Sin(z) fractals](https://rotgers.io/posts/sinz_fractal/) — Escape condition explanation
- [MDPI: Fractals as Julia Sets of Complex Sine Function](https://www.mdpi.com/2504-3110/5/4/272) — Fixed point iterations
- [Wikipedia: Julia set](https://en.wikipedia.org/wiki/Julia_set) — Transcendental properties
- [Stony Brook: Transcendental Dynamics (MAT 627)](https://www.math.stonybrook.edu/~bishop/classes/math627.S13/math627.html) — Baker domains, academic theory
- [Devaney Publications](https://math.bu.edu/people/bob/publications.html) — Cantor bouquets, sine family dynamics
- [Generalized Julia Set Fractal Generator](https://www.math.muni.cz/~xmacharacekj/juliaGeneralized.html) — Interactive visualization

---

## References

- Peitgen, H.-O., & Richter, P. H. (1986). *The Beauty of Fractals*. Springer.
- Mandelbrot, B. B. (1982). *The Fractal Geometry of Nature*. W.H. Freeman.
- Baker, I.N. (1975). "The domains of normality of an entire function." *Annales Academiae Scientiarum Fennicae*.
- Devaney, R.L. & Tangerman, F. (1986). "Dynamics of entire functions near the essential singularity." *Ergodic Theory and Dynamical Systems*.
- [Fractint Formula Archive](https://fractint.org/)
- [Paul Bourke's Fractal Collection](http://paulbourke.net/fractals/)
- [Newton Fractal (Wikipedia)](https://en.wikipedia.org/wiki/Newton_fractal)
- [Nova Fractal (Fractal Wiki)](https://fractalwiki.org/wiki/Nova_fractal)
- Local: `research/fractal-families.md` — Comprehensive family catalog with academic references
