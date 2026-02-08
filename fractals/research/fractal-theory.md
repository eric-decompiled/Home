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

The boundary is where visual interest lives. Criteria for good anchors:

1. **Mix of interior and exterior** — Probe nearby points, want ~40% interior
2. **Not too deep interior** — Deep = boring filled region
3. **Not too far exterior** — Far = everything escapes, no structure
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

  // Want a mix, slight exterior bias
  const mixScore = Math.min(interior, exterior) / probes.length;
  return mixScore > 0.2 && exterior >= interior;
}
```

### Orbit Offsets

Each anchor has 4 orbit points for beat-synced motion:

```typescript
interface OrbitOffset {
  dr: number;  // Real offset from anchor
  di: number;  // Imaginary offset
}

// Beat position determines which orbit point
const orbitIndex = Math.floor(beatPhase * 4) % 4;
const orbitFrac = (beatPhase * 4) % 1;
const t = Math.sin(Math.PI * orbitFrac); // Smooth in-out

const c = {
  r: anchor.cr + anchor.orbits[orbitIndex].dr * t,
  i: anchor.ci + anchor.orbits[orbitIndex].di * t,
};
```

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

## 7. New Families to Consider

### Priority Additions

Based on research, these families offer the best value:

| Family | Priority | Rationale |
|--------|----------|-----------|
| **Newton (z³-1)** | High | Different visual vocabulary, fast, high contrast |
| **Nova** | High | Newton + Julia hybrid, very beautiful |
| **Magnet I** | Medium | Unique flame structures |
| **Sine** | Medium | Periodic structure maps to rhythm |

### Newton Implementation

```typescript
function newtonIteration(zr: number, zi: number, n: number = 3): [number, number, number] {
  const r2 = zr * zr + zi * zi;
  if (r2 < 1e-10) return [zr, zi, -1];

  const r = Math.sqrt(r2);
  const theta = Math.atan2(zi, zr);

  // z^(n-1)
  const rn1 = Math.pow(r, n - 1);
  const zn1r = rn1 * Math.cos((n - 1) * theta);
  const zn1i = rn1 * Math.sin((n - 1) * theta);

  // z^n - 1
  const znr = rn1 * r * Math.cos(n * theta) - 1;
  const zni = rn1 * r * Math.sin(n * theta);

  // Newton step
  const denom = n * (zn1r * zn1r + zn1i * zn1i);
  const stepR = (znr * zn1r + zni * zn1i) / denom;
  const stepI = (zni * zn1r - znr * zn1i) / denom;

  const nr = zr - stepR;
  const ni = zi - stepI;

  // Check convergence to roots
  for (let k = 0; k < n; k++) {
    const rootR = Math.cos(2 * Math.PI * k / n);
    const rootI = Math.sin(2 * Math.PI * k / n);
    if ((nr - rootR) ** 2 + (ni - rootI) ** 2 < 0.001) {
      return [nr, ni, k];  // Converged to root k
    }
  }

  return [nr, ni, -1];
}
```

### Coloring Newton Fractals

Newton fractals need different coloring (by root, not escape):

```typescript
function colorNewton(rootIndex: number, iterations: number): Color {
  // Root determines base hue
  const hue = (rootIndex / 3) * 360;  // For z³-1

  // Iterations determine brightness
  const brightness = 1.0 - iterations / maxIter * 0.5;

  return hslToRgb(hue, 0.8, brightness);
}
```

---

## 8. Quick Reference

### Iteration Formulas

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
Newton-3:      z = z - (z³-1)/(3z²)
```

### Recommended Bounds

```
Standard:      [-2.5, 1.5] × [-1.8, 1.8]
Cubic:         [-1.5, 1.5] × [-1.5, 1.5]
Quartic:       [-1.3, 1.3] × [-1.3, 1.3]
Burning Ship:  [-2.5, 1.5] × [-2.0, 1.0]
Newton:        [-2.0, 2.0] × [-2.0, 2.0]
```

### Family Character Summary

```
Standard   → Organic, flowing, classic
Burning    → Angular, ship-like, dramatic
Tricorn    → Three-pronged, sharp
Celtic     → Knot patterns, intricate
Phoenix    → Temporal complexity, layered
Buffalo    → Distinct locus shape
Newton     → Basin boundaries, root-colored
```

### Parameter Ranges for Music

```
Orbit radius:     0.01 - 0.08 (typical: 0.03)
Snap rate:        4.0 - 12.0  (typical: 8.0)
Rotation friction: 0.8 - 2.0  (typical: 1.2)
Max iterations:   100 - 300   (typical: 200)
Bailout:          4.0 - 1000  (typical: 4.0)
Fidelity:         0.3 - 1.0   (typical: 0.45)
```

---

## References

- Peitgen, H.-O., & Richter, P. H. (1986). *The Beauty of Fractals*. Springer.
- Mandelbrot, B. B. (1982). *The Fractal Geometry of Nature*. W.H. Freeman.
- [Fractint Formula Archive](https://fractint.org/)
- [Paul Bourke's Fractal Collection](http://paulbourke.net/fractals/)
- Local: `research/fractal-families.md` — Comprehensive family catalog with implementations
