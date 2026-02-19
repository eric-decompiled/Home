# Mathematical Structures for Music Visualization

*A comprehensive research survey of mathematical structures that could be visualized in a real-time, canvas-based music visualization system.*

---

## 0. Executive Summary

This document catalogs mathematical structures from various domains (3Blue1Brown topics, classical visualization, physics, music theory, and artistic math) with analysis of their potential for music-reactive visualization.

**Most Promising for This Project:**

| Structure | Why Promising | Implementation |
|-----------|--------------|----------------|
| **Strange Attractors** | Chaotic flow maps to tension, 3D depth | Medium (3D projection) |
| **Reaction-Diffusion** | Organic patterns, GPU-friendly | Medium (shader) |
| **Voronoi/Delaunay** | Dynamic point-based, fast | Easy (d3-delaunay) |
| **Hyperbolic Tilings** | Infinite detail toward edge | Medium |
| **Moiré Patterns** | Interference = harmony, fast | Easy |
| **3D Lissajous** | Direct frequency mapping | Easy |
| **Wave Interference** | Superposition = chords | Easy |
| **Pitch Helix** | Native pitch representation | Easy |
| **Electric Field Lines** | Charge = notes, tension = repulsion | Medium |

**Already Implemented:** Tonnetz, Chladni patterns, Flow Fields, Spiral pitch

---

## 1. 3Blue1Brown Topics

Grant Sanderson's [3Blue1Brown](https://www.3blue1brown.com/) channel visualizes mathematical concepts using [Manim](https://github.com/3b1b/manim), a Python animation library. These visualizations provide inspiration for music-reactive implementations.

### 1.1 Linear Algebra: Eigenvectors and Transformations

**What it looks like:** Grid transformations showing how vectors stretch, rotate, and flip. Eigenvectors remain on their span (only scale), highlighted as special directions.

**3Blue1Brown approach:** [Eigenvectors and Eigenvalues lesson](https://www.3blue1brown.com/lessons/eigenvalues) shows matrix transformations as continuous animations, with eigenvectors highlighted as the vectors that "stay on their line."

**Music mapping potential:**
- **Chord quality as transformation:** Major = expansion, minor = reflection/contraction
- **Tension as determinant:** High tension = area-preserving shear, resolution = identity
- **Eigenvectors as tonic/dominant:** Stable harmonic directions
- **Beat as transformation pulse:** Apply transformation on beat, relax between

```typescript
interface TransformationState {
  matrix: [number, number, number, number]; // 2x2 as flat array
  eigenvector1: [number, number];
  eigenvector2: [number, number];
  eigenvalue1: number;
  eigenvalue2: number;
}

// Animate grid points through transformation
function transformPoint(x: number, y: number, t: number, state: TransformationState): [number, number] {
  const [a, b, c, d] = state.matrix;
  // Interpolate from identity to transformation based on t (0-1)
  const at = 1 + (a - 1) * t;
  const bt = b * t;
  const ct = c * t;
  const dt = 1 + (d - 1) * t;
  return [at * x + bt * y, ct * x + dt * y];
}
```

**Implementation complexity:** Easy (2D canvas)
**Animation potential:** Excellent - smooth interpolation between transformation states

---

### 1.2 Fourier Transforms: Winding and Unwinding

**What it looks like:** A signal wound around a circle at varying frequencies. When the winding frequency matches a component frequency, the "center of mass" of the wound signal moves away from origin.

**3Blue1Brown approach:** [But what is the Fourier Transform?](https://www.3blue1brown.com/lessons/fourier-transforms) uses the "winding frequency" visualization - wrapping a 1D signal around a circle and tracking the center of mass.

**Music mapping potential:**
- **Direct visualization:** Wind the audio waveform itself
- **Harmonic content:** Show peaks at detected frequencies
- **Chord visualization:** Multiple winding circles for each note
- **Beat sync:** Winding speed synced to tempo

```typescript
// Wind a signal around a circle at frequency f
function windSignal(
  signal: number[],
  sampleRate: number,
  windingFreq: number,
  t: number // time offset
): { x: number, y: number, centerX: number, centerY: number }[] {
  const points: { x: number, y: number }[] = [];
  let sumX = 0, sumY = 0;

  for (let i = 0; i < signal.length; i++) {
    const time = i / sampleRate;
    const angle = 2 * Math.PI * windingFreq * time + t;
    const radius = signal[i]; // Amplitude determines radius
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    points.push({ x, y });
    sumX += x;
    sumY += y;
  }

  const centerX = sumX / signal.length;
  const centerY = sumY / signal.length;

  return points.map(p => ({ ...p, centerX, centerY }));
}
```

**Implementation complexity:** Medium (needs audio data or generated signals)
**Animation potential:** Excellent - rotating winding creates hypnotic motion

---

### 1.3 Quaternions: 4D Rotation Visualization

**What it looks like:** 3D objects rotating smoothly without gimbal lock. 4D hypersphere projected to 3D using stereographic projection.

**3Blue1Brown approach:** [Quaternions and 3D rotation](https://www.3blue1brown.com/lessons/quaternions-and-3d-rotation) with interactive explorer at [eater.net/quaternions](https://eater.net/quaternions).

**Music mapping potential:**
- **Chord inversions as rotations:** Root position, first inversion, second inversion = different rotation states
- **Key changes as 4D rotation:** Modulating keys as moving through quaternion space
- **Smooth interpolation:** SLERP between quaternion states for chord transitions

```typescript
interface Quaternion {
  w: number; // Real part
  x: number; // i component
  y: number; // j component
  z: number; // k component
}

// SLERP interpolation for smooth rotation transitions
function slerp(q1: Quaternion, q2: Quaternion, t: number): Quaternion {
  let dot = q1.w * q2.w + q1.x * q2.x + q1.y * q2.y + q1.z * q2.z;

  if (dot < 0) {
    q2 = { w: -q2.w, x: -q2.x, y: -q2.y, z: -q2.z };
    dot = -dot;
  }

  if (dot > 0.9995) {
    // Linear interpolation for nearly identical quaternions
    return normalize({
      w: q1.w + t * (q2.w - q1.w),
      x: q1.x + t * (q2.x - q1.x),
      y: q1.y + t * (q2.y - q1.y),
      z: q1.z + t * (q2.z - q1.z)
    });
  }

  const theta0 = Math.acos(dot);
  const theta = theta0 * t;
  const sinTheta = Math.sin(theta);
  const sinTheta0 = Math.sin(theta0);

  const s1 = Math.cos(theta) - dot * sinTheta / sinTheta0;
  const s2 = sinTheta / sinTheta0;

  return {
    w: s1 * q1.w + s2 * q2.w,
    x: s1 * q1.x + s2 * q2.x,
    y: s1 * q1.y + s2 * q2.y,
    z: s1 * q1.z + s2 * q2.z
  };
}
```

**Implementation complexity:** Hard (3D rendering, quaternion math)
**Animation potential:** Excellent - smoothest possible rotations

---

### 1.4 Neural Networks as Surfaces

**What it looks like:** Function approximation visualized as a surface being bent and folded to fit data points. Hidden layers as intermediate transformations of space.

**3Blue1Brown approach:** [Neural Networks series](https://www.3blue1brown.com/topics/neural-networks) visualizes networks as function machines taking inputs and producing outputs.

**Music mapping potential:**
- **Genre/mood classification surface:** Train network on audio features, visualize decision boundaries
- **Timbre space:** Map instrument sounds to 2D/3D space
- **Chord prediction surface:** Visualize learned harmonic expectations

**Implementation complexity:** Hard (needs trained models, complex visualization)
**Animation potential:** Medium - weight changes could animate, but expensive

---

### 1.5 Topology: Genus and Surfaces

**What it looks like:** Surfaces with different numbers of "holes" - sphere (genus 0), torus (genus 1), double torus (genus 2). Continuous deformations that preserve topology.

**Music mapping potential:**
- **Form as topology:** Verse-chorus = torus (cyclic), through-composed = sphere
- **Harmonic loops:** Progressions that return = higher genus
- **Modulation paths:** Traced on topological surfaces

**Mobius strip and Klein bottle:**

The [Mobius strip](https://en.wikipedia.org/wiki/M%C3%B6bius_strip) is a non-orientable surface with only one side. A [Klein bottle](https://en.wikipedia.org/wiki/Klein_bottle) is obtained by gluing two Mobius strips together.

```typescript
// Mobius strip parametric equations
function mobiusStrip(u: number, v: number): [number, number, number] {
  // u in [0, 2*PI], v in [-0.5, 0.5]
  const x = (1 + v * Math.cos(u / 2)) * Math.cos(u);
  const y = (1 + v * Math.cos(u / 2)) * Math.sin(u);
  const z = v * Math.sin(u / 2);
  return [x, y, z];
}
```

**Implementation complexity:** Medium-Hard (3D required for Klein bottle)
**Animation potential:** Good - parameter animation creates flowing motion

---

## 2. Strange Attractors

Strange attractors are sets of states in chaotic dynamical systems that trajectories approach but never repeat exactly. They create beautiful 3D structures that can be projected to 2D.

### 2.1 Lorenz Attractor

The famous "butterfly" discovered by Edward Lorenz while modeling atmospheric convection.

**System of equations:**
```
dx/dt = sigma * (y - x)
dy/dt = x * (rho - z) - y
dz/dt = x * y - beta * z

Standard parameters: sigma = 10, rho = 28, beta = 8/3
```

**What it looks like:** Two-lobed spiral, resembling a butterfly mask. Points orbit the two lobes, occasionally switching between them unpredictably.

```typescript
interface LorenzParams {
  sigma: number;
  rho: number;
  beta: number;
}

function lorenzStep(
  x: number, y: number, z: number,
  params: LorenzParams,
  dt: number
): [number, number, number] {
  const { sigma, rho, beta } = params;
  const dx = sigma * (y - x);
  const dy = x * (rho - z) - y;
  const dz = x * y - beta * z;
  return [x + dx * dt, y + dy * dt, z + dz * dt];
}

// Trace many points for visualization
function traceLorenz(steps: number, dt: number): [number, number, number][] {
  const points: [number, number, number][] = [];
  let x = 0.1, y = 0, z = 0;
  const params = { sigma: 10, rho: 28, beta: 8/3 };

  for (let i = 0; i < steps; i++) {
    [x, y, z] = lorenzStep(x, y, z, params, dt);
    points.push([x, y, z]);
  }
  return points;
}
```

**Music mapping:**
- **sigma (coupling):** Tension level - higher tension = faster switching between lobes
- **rho (forcing):** Energy/dynamics - affects size of attractor
- **beta (damping):** Rhythmic drive - affects z-axis stretching
- **Lobe switching:** Map to chord changes, key changes

**Implementation complexity:** Medium (3D projection required)
**Animation potential:** Excellent - continuous trajectory creates flowing motion

---

### 2.2 Rossler Attractor

A simpler attractor with a single spiral lobe and outward-stretching "spike."

**System of equations:**
```
dx/dt = -y - z
dy/dt = x + a * y
dz/dt = b + z * (x - c)

Standard parameters: a = 0.2, b = 0.2, c = 5.7
```

**What it looks like:** A spiral ribbon that occasionally stretches outward before being pulled back in.

```typescript
function rosslerStep(
  x: number, y: number, z: number,
  a: number, b: number, c: number,
  dt: number
): [number, number, number] {
  const dx = -y - z;
  const dy = x + a * y;
  const dz = b + z * (x - c);
  return [x + dx * dt, y + dy * dt, z + dz * dt];
}
```

**Music mapping:**
- **Outward spikes:** Map to accents, sforzando
- **Spiral tightness (a):** Rhythmic density
- **c parameter:** Controls chaos onset - tension/release

**Implementation complexity:** Medium
**Animation potential:** Excellent

---

### 2.3 Chen Attractor

A variant with double-scroll behavior.

```typescript
function chenStep(
  x: number, y: number, z: number,
  a: number, b: number, c: number, // typical: 40, 3, 28
  dt: number
): [number, number, number] {
  const dx = a * (y - x);
  const dy = (c - a) * x - x * z + c * y;
  const dz = x * y - b * z;
  return [x + dx * dt, y + dy * dt, z + dz * dt];
}
```

---

### 2.4 Halvorsen Attractor

A beautiful symmetric attractor with three-fold symmetry.

```typescript
function halvorsenStep(
  x: number, y: number, z: number,
  a: number, // typical: 1.89
  dt: number
): [number, number, number] {
  const dx = -a * x - 4 * y - 4 * z - y * y;
  const dy = -a * y - 4 * z - 4 * x - z * z;
  const dz = -a * z - 4 * x - 4 * y - x * x;
  return [x + dx * dt, y + dy * dt, z + dz * dt];
}
```

**Music mapping:** Three-fold symmetry maps naturally to waltz time (3/4).

---

### 2.5 General Implementation Pattern

For any attractor, the visualization approach is similar:

```typescript
interface AttractorRenderer {
  points: Float32Array;  // Ring buffer of trail points
  headIndex: number;
  trailLength: number;

  // 3D to 2D projection
  project(x: number, y: number, z: number, canvas: HTMLCanvasElement): [number, number] {
    // Simple perspective projection
    const scale = 10;
    const fov = 500;
    const distance = fov / (fov + z * scale);
    const px = canvas.width / 2 + x * scale * distance;
    const py = canvas.height / 2 + y * scale * distance;
    return [px, py];
  }

  // Render trail with color gradient
  render(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < this.trailLength - 1; i++) {
      const idx = (this.headIndex - i + this.trailLength) % this.trailLength;
      const nextIdx = (idx - 1 + this.trailLength) % this.trailLength;

      const alpha = 1 - i / this.trailLength;
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      // ... draw line segment
    }
  }
}
```

**Best practices:**
- Use ring buffer for trail (avoids array allocation)
- Apply RK4 integration for stability at larger dt
- 3D projection with perspective creates depth
- Trail length maps to sustain/release

---

## 3. Cellular Automata

Discrete systems where cells update based on neighbor states. Creates emergent complexity from simple rules.

### 3.1 Elementary Cellular Automata (1D)

256 possible rules (Rule 0 through Rule 255). [Rule 110](https://en.wikipedia.org/wiki/Rule_110) is Turing complete.

**What it looks like:** 1D row evolving over time, displayed as 2D pattern. Complex rules create triangle patterns, chaos, or repeating structures.

```typescript
function rule110(left: number, center: number, right: number): number {
  const pattern = (left << 2) | (center << 1) | right;
  const rule = 110; // Binary: 01101110
  return (rule >> pattern) & 1;
}

function evolveRow(row: Uint8Array): Uint8Array {
  const next = new Uint8Array(row.length);
  for (let i = 0; i < row.length; i++) {
    const left = row[(i - 1 + row.length) % row.length];
    const center = row[i];
    const right = row[(i + 1) % row.length];
    next[i] = rule110(left, center, right);
  }
  return next;
}
```

**Music mapping:**
- **Initial row from notes:** Active notes = 1, inactive = 0
- **Rule selection:** Major key = Rule 30 (chaotic), Minor = Rule 110 (complex but structured)
- **Scrolling visualization:** Time flows down as rows evolve
- **Cell colors from velocity:** Louder notes = brighter cells

**Implementation complexity:** Easy
**Animation potential:** Good - continuous scrolling pattern

---

### 3.2 Game of Life (2D)

Conway's cellular automaton with birth/death rules based on neighbor count.

**Rules:**
- Cell with 2-3 neighbors survives
- Dead cell with exactly 3 neighbors is born
- All other cells die

```typescript
function gameOfLifeStep(grid: Uint8Array, width: number, height: number): Uint8Array {
  const next = new Uint8Array(grid.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let neighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = (x + dx + width) % width;
          const ny = (y + dy + height) % height;
          neighbors += grid[ny * width + nx];
        }
      }

      const alive = grid[y * width + x];
      if (alive && (neighbors === 2 || neighbors === 3)) {
        next[y * width + x] = 1;
      } else if (!alive && neighbors === 3) {
        next[y * width + x] = 1;
      }
    }
  }

  return next;
}
```

**Music mapping:**
- **Note onsets as births:** MIDI notes inject "gliders" or patterns
- **Velocity as cell intensity:** Multi-state Life (not just 0/1)
- **Rule variations:** Different rules for different genres

For generative art applications, cellular automata can create stunning patterns by visualizing cell states with colors, and the evolving behavior produces intricate designs.

**Implementation complexity:** Easy
**Animation potential:** Good - natural motion from rule evolution

---

### 3.3 Radial Cellular Automata for Music

Research has explored converting 2D Game of Life patterns into music using polar coordinates with origin at the grid center. This approach naturally maps position to pitch (radius = octave, angle = pitch class).

**Implementation complexity:** Medium
**Animation potential:** Good

---

## 4. L-Systems and Fractal Trees

[L-systems](https://en.wikipedia.org/wiki/L-system) (Lindenmayer systems) are parallel rewriting systems that generate self-similar structures, particularly effective for plant-like growth patterns.

### 4.1 Basic L-System Structure

```typescript
interface LSystem {
  axiom: string;
  rules: Record<string, string>;
  angle: number;  // Turn angle in degrees
}

// Classic fractal tree
const fractalTree: LSystem = {
  axiom: "F",
  rules: {
    "F": "FF+[+F-F-F]-[-F+F+F]"
  },
  angle: 22.5
};

// Dragon curve
const dragonCurve: LSystem = {
  axiom: "FX",
  rules: {
    "X": "X+YF+",
    "Y": "-FX-Y"
  },
  angle: 90
};

function iterate(system: LSystem, iterations: number): string {
  let current = system.axiom;
  for (let i = 0; i < iterations; i++) {
    let next = "";
    for (const char of current) {
      next += system.rules[char] ?? char;
    }
    current = next;
  }
  return current;
}

function render(
  ctx: CanvasRenderingContext2D,
  instructions: string,
  angle: number,
  stepLength: number
) {
  const stack: { x: number; y: number; angle: number }[] = [];
  let x = ctx.canvas.width / 2;
  let y = ctx.canvas.height;
  let currentAngle = -90; // Start pointing up

  for (const char of instructions) {
    switch (char) {
      case 'F':
        const newX = x + stepLength * Math.cos(currentAngle * Math.PI / 180);
        const newY = y + stepLength * Math.sin(currentAngle * Math.PI / 180);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(newX, newY);
        ctx.stroke();
        x = newX;
        y = newY;
        break;
      case '+':
        currentAngle += angle;
        break;
      case '-':
        currentAngle -= angle;
        break;
      case '[':
        stack.push({ x, y, angle: currentAngle });
        break;
      case ']':
        const state = stack.pop()!;
        x = state.x;
        y = state.y;
        currentAngle = state.angle;
        break;
    }
  }
}
```

**Music mapping:**
- **Iteration depth:** Complexity/energy level - more iterations = more branches
- **Angle parameter:** Tension - sharper angles = more angular/tense
- **Step length:** Dynamics - longer steps = louder passages
- **Branch color:** Pitch class or instrument

**Growth animation:**
- Animate step length from 0 to target for "growing" effect
- Different branches grow at different times (staggered by voice)
- Beat triggers new growth iteration

**Implementation complexity:** Easy
**Animation potential:** Excellent - natural growth metaphor

---

### 4.2 Stochastic L-Systems

Add randomness for more organic variation:

```typescript
interface StochasticRule {
  outputs: string[];
  weights: number[];
}

function stochasticExpand(char: string, rules: Record<string, StochasticRule>): string {
  const rule = rules[char];
  if (!rule) return char;

  const random = Math.random();
  let cumulative = 0;
  for (let i = 0; i < rule.outputs.length; i++) {
    cumulative += rule.weights[i];
    if (random < cumulative) {
      return rule.outputs[i];
    }
  }
  return rule.outputs[rule.outputs.length - 1];
}
```

**Music mapping:** Weight parameters could be influenced by musical features (tension, velocity).

---

## 5. Voronoi Diagrams and Delaunay Triangulation

Given a set of points, Voronoi diagrams partition space into regions closest to each point. [Delaunay triangulation](https://en.wikipedia.org/wiki/Delaunay_triangulation) is the dual graph.

### 5.1 Basic Structure

The [circumcenters of Delaunay triangles are the vertices of the Voronoi diagram](https://ianthehenry.com/posts/delaunay/).

```typescript
// Using d3-delaunay for efficient computation
import { Delaunay } from 'd3-delaunay';

interface VoronoiRenderer {
  points: Float64Array;  // [x0, y0, x1, y1, ...]
  delaunay: Delaunay;

  update(newPoints: Float64Array) {
    this.points = newPoints;
    this.delaunay = Delaunay.from(this.pointsAsArray());
  }

  renderVoronoi(ctx: CanvasRenderingContext2D, bounds: [number, number, number, number]) {
    const voronoi = this.delaunay.voronoi(bounds);

    for (let i = 0; i < this.points.length / 2; i++) {
      const cell = voronoi.cellPolygon(i);
      if (!cell) continue;

      ctx.beginPath();
      ctx.moveTo(cell[0][0], cell[0][1]);
      for (let j = 1; j < cell.length; j++) {
        ctx.lineTo(cell[j][0], cell[j][1]);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  renderDelaunay(ctx: CanvasRenderingContext2D) {
    const { points, halfedges, triangles } = this.delaunay;

    for (let i = 0; i < halfedges.length; i++) {
      const j = halfedges[i];
      if (j < i) continue;

      const ti = triangles[i];
      const tj = triangles[j];

      ctx.beginPath();
      ctx.moveTo(points[ti * 2], points[ti * 2 + 1]);
      ctx.lineTo(points[tj * 2], points[tj * 2 + 1]);
      ctx.stroke();
    }
  }
}
```

**Music mapping:**
- **Points as notes:** Each active note generates a point
- **Point position:** x = time offset, y = pitch
- **Cell color:** Velocity, instrument, or voice
- **Animation:** Points drift with groove, cells morph

**Voronoi with forces:**
```typescript
function updatePointsWithForces(
  points: Float64Array,
  velocities: Float64Array,
  attractors: { x: number; y: number; strength: number }[],
  dt: number
) {
  for (let i = 0; i < points.length / 2; i++) {
    let fx = 0, fy = 0;

    for (const attractor of attractors) {
      const dx = attractor.x - points[i * 2];
      const dy = attractor.y - points[i * 2 + 1];
      const dist = Math.sqrt(dx * dx + dy * dy) + 1;
      fx += attractor.strength * dx / (dist * dist);
      fy += attractor.strength * dy / (dist * dist);
    }

    velocities[i * 2] += fx * dt;
    velocities[i * 2 + 1] += fy * dt;
    velocities[i * 2] *= 0.98;  // Damping
    velocities[i * 2 + 1] *= 0.98;

    points[i * 2] += velocities[i * 2] * dt;
    points[i * 2 + 1] += velocities[i * 2 + 1] * dt;
  }
}
```

**Implementation complexity:** Easy (with d3-delaunay library)
**Animation potential:** Excellent - organic cell morphing

---

## 6. Hyperbolic Geometry

The [Poincare disk model](https://en.wikipedia.org/wiki/Poincar%C3%A9_disk_model) represents hyperbolic geometry inside a unit disk, where "straight lines" are circular arcs orthogonal to the boundary.

### 6.1 Hyperbolic Tilings

Regular tilings with more than 6 triangles meeting at a vertex (impossible in Euclidean space).

**What it looks like:** Tessellations that become infinitely detailed toward the disk edge. Escher's "Circle Limit" prints are famous examples.

```typescript
// Hyperbolic coordinates
interface HyperbolicPoint {
  x: number;  // Poincare disk coordinates (-1, 1)
  y: number;
}

// Mobius transformation for hyperbolic translation
function mobiusTransform(
  z: HyperbolicPoint,
  center: HyperbolicPoint
): HyperbolicPoint {
  // Translate hyperbolic plane so center -> origin
  const a = center;
  const num_r = z.x - a.x;
  const num_i = z.y - a.y;
  const denom_r = 1 - a.x * z.x - a.y * z.y;
  const denom_i = a.y * z.x - a.x * z.y;
  const denom_mag = denom_r * denom_r + denom_i * denom_i;

  return {
    x: (num_r * denom_r + num_i * denom_i) / denom_mag,
    y: (num_i * denom_r - num_r * denom_i) / denom_mag
  };
}

// Hyperbolic distance
function hyperbolicDistance(p1: HyperbolicPoint, p2: HyperbolicPoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const euclidean = Math.sqrt(dx * dx + dy * dy);

  const r1 = Math.sqrt(p1.x * p1.x + p1.y * p1.y);
  const r2 = Math.sqrt(p2.x * p2.x + p2.y * p2.y);

  // Poincare disk distance formula
  const num = euclidean * euclidean;
  const denom = (1 - r1 * r1) * (1 - r2 * r2);

  return Math.acosh(1 + 2 * num / denom);
}
```

There is a JavaScript library [hyperbolic-canvas](https://github.com/ItsNickBarry/hyperbolic-canvas) that provides a Poincare disk implementation on HTML canvas.

**Music mapping:**
- **Center = tonic:** Current key center at disk center
- **Distance from center = tension:** Far from center = high tension
- **Hyperbolic tilings:** Notes arranged in hyperbolic lattice (generalizes Tonnetz)
- **Edge proximity = dissonance:** Approaching the "infinite boundary" = maximum tension

**Implementation complexity:** Medium
**Animation potential:** Good - Mobius transformations create flowing motion

---

### 6.2 Hyperbolic Tilings {p, q}

Regular tilings where p-gons meet q at each vertex:

| {p, q} | Name | Character |
|--------|------|-----------|
| {3, 7} | Order-7 triangular | Triangles, 7 at each vertex |
| {4, 5} | Order-5 square | Squares, 5 at each vertex |
| {5, 4} | Order-4 pentagonal | Pentagons, 4 at each vertex |
| {7, 3} | Heptagonal | Heptagons, 3 at each vertex |

**Music mapping:**
- **p = chord size:** Triads = 3, seventh chords = 4
- **q = harmonic density:** How many chords share a note

---

## 7. Reaction-Diffusion Systems

Alan Turing's 1952 model for pattern formation. Two chemicals diffuse and react, creating stable patterns.

### 7.1 Gray-Scott Model

The most common variant for visualization.

**Equations:**
```
dA/dt = D_A * laplacian(A) - A * B^2 + f * (1 - A)
dB/dt = D_B * laplacian(B) + A * B^2 - (k + f) * B
```

Where:
- A, B are chemical concentrations
- D_A, D_B are diffusion rates (D_A > D_B)
- f is feed rate
- k is kill rate

```typescript
class ReactionDiffusion {
  width: number;
  height: number;
  A: Float32Array;
  B: Float32Array;
  nextA: Float32Array;
  nextB: Float32Array;

  // Gray-Scott parameters
  dA = 1.0;
  dB = 0.5;
  f = 0.055;  // Feed rate
  k = 0.062;  // Kill rate

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    const size = width * height;
    this.A = new Float32Array(size).fill(1);
    this.B = new Float32Array(size).fill(0);
    this.nextA = new Float32Array(size);
    this.nextB = new Float32Array(size);

    // Seed with some B in the center
    this.seedCenter();
  }

  seedCenter() {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const r = 10;

    for (let y = cy - r; y < cy + r; y++) {
      for (let x = cx - r; x < cx + r; x++) {
        const idx = Math.floor(y) * this.width + Math.floor(x);
        this.B[idx] = 1;
      }
    }
  }

  laplacian(arr: Float32Array, x: number, y: number): number {
    const idx = y * this.width + x;
    const left = x > 0 ? arr[idx - 1] : arr[idx];
    const right = x < this.width - 1 ? arr[idx + 1] : arr[idx];
    const up = y > 0 ? arr[idx - this.width] : arr[idx];
    const down = y < this.height - 1 ? arr[idx + this.width] : arr[idx];

    return left + right + up + down - 4 * arr[idx];
  }

  step() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        const a = this.A[idx];
        const b = this.B[idx];
        const lapA = this.laplacian(this.A, x, y);
        const lapB = this.laplacian(this.B, x, y);
        const abb = a * b * b;

        this.nextA[idx] = a + this.dA * lapA - abb + this.f * (1 - a);
        this.nextB[idx] = b + this.dB * lapB + abb - (this.k + this.f) * b;
      }
    }

    [this.A, this.nextA] = [this.nextA, this.A];
    [this.B, this.nextB] = [this.nextB, this.B];
  }
}
```

**Pattern types by parameters:**

| f | k | Pattern |
|---|---|---------|
| 0.010 | 0.041 | Holes |
| 0.014 | 0.054 | Moving spots |
| 0.018 | 0.051 | Waves |
| 0.022 | 0.059 | Fingerprints |
| 0.026 | 0.051 | Bubbles |
| 0.030 | 0.057 | Solitons |
| 0.054 | 0.063 | Mitosis |

Several GPU-based implementations exist, including [Reaction-Diffusion Playground](https://jasonwebb.github.io/reaction-diffusion-playground/) and [WebGPU tutorials](https://shi-yan.github.io/webgpuunleashed/Compute/reaction_diffusion.html).

**Music mapping:**
- **f (feed rate):** Energy level - higher = more active patterns
- **k (kill rate):** Tension - k just below bifurcation = most interesting
- **Seed locations:** Note onsets inject B at positions
- **Parameter animation:** Smooth transitions between pattern types

**Implementation complexity:** Medium (CPU), Easy (GPU shader)
**Animation potential:** Excellent - self-organizing motion

---

## 8. Penrose Tilings and Quasicrystals

Non-periodic tilings with 5-fold symmetry that never repeat but maintain order.

### 8.1 Penrose Tiling Generation

[Penrose tilings](https://en.wikipedia.org/wiki/Penrose_tiling) use two rhombus shapes (or kites and darts) with specific matching rules.

**Deflation method:** Start with large tiles, subdivide using golden ratio.

```typescript
interface PenroseTile {
  type: 'kite' | 'dart';
  vertices: [number, number][];
  color?: string;
}

const PHI = (1 + Math.sqrt(5)) / 2;  // Golden ratio

function deflateTile(tile: PenroseTile): PenroseTile[] {
  // Subdivide using golden ratio proportions
  // Each kite becomes 2 kites + 1 dart
  // Each dart becomes 1 kite + 1 dart

  const [A, B, C, D] = tile.vertices;
  const result: PenroseTile[] = [];

  if (tile.type === 'kite') {
    // Subdivision points using golden ratio
    const P = lerp(A, B, 1 / PHI);
    const Q = lerp(D, C, 1 / PHI);
    const R = lerp(A, D, 1 / PHI);

    result.push({ type: 'kite', vertices: [A, P, R, Q] });
    result.push({ type: 'kite', vertices: [P, B, C, Q] });
    result.push({ type: 'dart', vertices: [R, P, Q, D] });
  } else {
    // Dart subdivision
    const P = lerp(A, B, 1 / PHI);
    const Q = lerp(D, C, 1 / PHI);

    result.push({ type: 'kite', vertices: [P, B, C, Q] });
    result.push({ type: 'dart', vertices: [A, P, Q, D] });
  }

  return result;
}

function lerp(p1: [number, number], p2: [number, number], t: number): [number, number] {
  return [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t];
}
```

**Music mapping:**
- **Deflation level:** Musical complexity - more subdivisions = more detail
- **Tile colors:** Chord qualities (kite = major, dart = minor)
- **5-fold symmetry:** Maps to pentatonic scale relationships
- **Aperiodicity:** Never-repeating like jazz improvisation

**Implementation complexity:** Medium
**Animation potential:** Medium - deflation can be animated, tiles can shimmer

---

## 9. Wave Interference Patterns

Superposition of waves creates interference patterns fundamental to both physics and music.

### 9.1 Two-Source Interference

Classic Young's double-slit style patterns.

```typescript
function waveInterference(
  x: number, y: number,
  sources: { x: number; y: number; freq: number; phase: number; amp: number }[],
  time: number
): number {
  let sum = 0;

  for (const source of sources) {
    const dx = x - source.x;
    const dy = y - source.y;
    const r = Math.sqrt(dx * dx + dy * dy);
    const wave = source.amp * Math.sin(2 * Math.PI * (source.freq * time - r) + source.phase);
    sum += wave;
  }

  return sum;
}

function renderInterference(
  ctx: CanvasRenderingContext2D,
  sources: { x: number; y: number; freq: number; phase: number; amp: number }[],
  time: number
) {
  const imageData = ctx.createImageData(ctx.canvas.width, ctx.canvas.height);

  for (let y = 0; y < ctx.canvas.height; y++) {
    for (let x = 0; x < ctx.canvas.width; x++) {
      const value = waveInterference(x, y, sources, time);
      const normalized = (value / sources.length + 1) / 2;  // Map to 0-1
      const color = Math.floor(normalized * 255);

      const idx = (y * ctx.canvas.width + x) * 4;
      imageData.data[idx] = color;
      imageData.data[idx + 1] = color;
      imageData.data[idx + 2] = color;
      imageData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
```

**Music mapping:**
- **Sources = notes:** Each active note is a wave source
- **Frequency = pitch:** Higher pitches = finer interference pattern
- **Phase = timing:** Rhythm affects phase relationships
- **Superposition = harmony:** Consonant intervals create stable patterns

**Implementation complexity:** Easy
**Animation potential:** Excellent - natural wave motion

---

## 10. Electric and Magnetic Field Lines

Field lines show force direction at every point, flowing from sources (charges) to sinks.

### 10.1 Electric Field Lines

For point charges, field lines radiate outward (positive) or inward (negative).

```typescript
interface Charge {
  x: number;
  y: number;
  q: number;  // Positive or negative
}

function electricField(
  x: number, y: number,
  charges: Charge[]
): { ex: number; ey: number; magnitude: number } {
  let ex = 0, ey = 0;

  for (const charge of charges) {
    const dx = x - charge.x;
    const dy = y - charge.y;
    const r2 = dx * dx + dy * dy + 0.01;  // Avoid singularity
    const r = Math.sqrt(r2);
    const r3 = r2 * r;

    ex += charge.q * dx / r3;
    ey += charge.q * dy / r3;
  }

  return { ex, ey, magnitude: Math.sqrt(ex * ex + ey * ey) };
}

function traceFieldLine(
  startX: number, startY: number,
  charges: Charge[],
  steps: number,
  stepSize: number
): [number, number][] {
  const path: [number, number][] = [[startX, startY]];
  let x = startX, y = startY;

  for (let i = 0; i < steps; i++) {
    const { ex, ey, magnitude } = electricField(x, y, charges);
    if (magnitude < 0.001) break;

    // Normalize and step
    x += (ex / magnitude) * stepSize;
    y += (ey / magnitude) * stepSize;

    path.push([x, y]);

    // Stop if we get too close to a charge
    for (const charge of charges) {
      const dx = x - charge.x;
      const dy = y - charge.y;
      if (dx * dx + dy * dy < 1) return path;
    }
  }

  return path;
}
```

**Music mapping:**
- **Positive charges = notes:** Each note creates a field source
- **Charge strength = velocity:** Louder notes have stronger fields
- **Field line curvature = harmony:** Parallel lines = consonance, intersecting = dissonance
- **Charge positions:** Spread across pitch space

**Implementation complexity:** Easy
**Animation potential:** Good - charges can move, lines update smoothly

---

## 11. Moire Patterns

Overlapping similar patterns create large-scale [moire](https://en.wikipedia.org/wiki/Moir%C3%A9_pattern) interference effects.

### 11.1 Line Moire

Two sets of parallel lines at slight angle/frequency difference.

```typescript
function lineMoire(
  x: number, y: number,
  freq1: number, angle1: number,
  freq2: number, angle2: number
): number {
  // Rotate coordinates for each pattern
  const x1 = x * Math.cos(angle1) + y * Math.sin(angle1);
  const x2 = x * Math.cos(angle2) + y * Math.sin(angle2);

  // Sine waves
  const v1 = (Math.sin(x1 * freq1) + 1) / 2;
  const v2 = (Math.sin(x2 * freq2) + 1) / 2;

  // Multiply for moire effect
  return v1 * v2;
}
```

### 11.2 Circular Moire

Two sets of concentric circles with offset centers.

```typescript
function circularMoire(
  x: number, y: number,
  cx1: number, cy1: number, freq1: number,
  cx2: number, cy2: number, freq2: number
): number {
  const r1 = Math.sqrt((x - cx1) ** 2 + (y - cy1) ** 2);
  const r2 = Math.sqrt((x - cx2) ** 2 + (y - cy2) ** 2);

  const v1 = (Math.sin(r1 * freq1) + 1) / 2;
  const v2 = (Math.sin(r2 * freq2) + 1) / 2;

  return v1 * v2;
}
```

When moving layer patterns, the moire patterns transform at a faster speed, an effect called "optical moire speedup."

**Music mapping:**
- **Frequency difference = interval:** Small difference = consonance (slow moire)
- **Angle difference = tension:** Larger angles = faster moire motion
- **Center offset = phrase position:** Beat position affects center locations
- **Moire speedup = rhythmic amplification:** Small changes create large visual motion

**Implementation complexity:** Easy
**Animation potential:** Excellent - tiny motions create dramatic effects

---

## 12. Music-Specific Structures

### 12.1 Pitch Helix

The [spiral array model](https://en.wikipedia.org/wiki/Spiral_array_model) represents pitch as a helix where octave equivalence is shown by vertical alignment.

**What it looks like:** A 3D helix where position on the spiral = pitch class, height = octave.

```typescript
interface PitchPoint {
  pitch: number;      // MIDI note number
  x: number;
  y: number;
  z: number;
}

function pitchToHelix(midiNote: number, radius: number = 1, height: number = 0.5): PitchPoint {
  const pitchClass = midiNote % 12;
  const octave = Math.floor(midiNote / 12);
  const angle = (pitchClass / 12) * 2 * Math.PI;

  return {
    pitch: midiNote,
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
    z: octave * height
  };
}

// Perfect fifth is a quarter turn up the helix
function fifthInterval(point: PitchPoint): PitchPoint {
  return pitchToHelix(point.pitch + 7);
}
```

According to research, "musical pitch is depicted as varying along both a linear dimension of height and also a circular dimension of pitch class."

**Music mapping:**
- **Active notes glow on helix**
- **Chords form geometric shapes:** Major triad = equilateral triangle (approximately)
- **Melodic motion as helix traversal**
- **Key center at bottom:** Lower = more stable

**Implementation complexity:** Medium (3D rendering)
**Animation potential:** Excellent - notes travel along helix path

---

### 12.2 Orbifolds for Voice Leading

[Orbifolds](https://www.3blue1brown.com/lessons/quaternions-and-3d-rotation) are geometric spaces representing chord voice leading. Work by Dmitri Tymoczko.

**Key insight:** An n-note chord can be represented as a point in n-dimensional space, with equivalences (octave, permutation) creating the orbifold structure.

For 2-note chords (dyads), the space is a Mobius strip:
- Left edge = unisons
- Interior = all intervals
- Crossing the strip = octave equivalence

For 3-note chords (triads), the space is a triangular prism (with twisted identifications).

**Music mapping:**
- **Smooth voice leading = short distances in orbifold**
- **Parsimonious progressions = minimal motion**
- **Common tones = shared orbifold regions**

**Implementation complexity:** Hard (topology visualization)
**Animation potential:** Good - chord progressions as paths through space

---

### 12.3 Chladni Patterns (Already Implemented)

The project already has Chladni patterns. For reference:

**The formula** for a square plate: `cos(n * PI * x / L) * cos(m * PI * y / L) - cos(m * PI * x / L) * cos(n * PI * y / L) = 0`

Where n and m are mode numbers controlling pattern complexity.

---

## 13. Spirograph and Harmonograph Curves

### 13.1 Spirograph (Hypotrochoid)

A circle rolling inside another circle traces these curves.

```typescript
function spirograph(
  t: number,
  R: number,   // Fixed circle radius
  r: number,   // Rolling circle radius
  d: number    // Pen distance from rolling center
): [number, number] {
  const x = (R - r) * Math.cos(t) + d * Math.cos((R - r) / r * t);
  const y = (R - r) * Math.sin(t) - d * Math.sin((R - r) / r * t);
  return [x, y];
}
```

**Music mapping:**
- **R/r ratio = interval:** Rational ratios = closed curves (consonance)
- **d parameter = dynamics:** Distance affects curve amplitude
- **Tracing speed = tempo:** Beat syncs rotation rate

**Implementation complexity:** Easy
**Animation potential:** Excellent - natural periodic motion

---

### 13.2 Harmonograph (Damped Pendulums)

Physical pendulums with damping create decaying spirograph-like curves.

```typescript
function harmonograph(
  t: number,
  pendulums: Array<{
    freq: number;
    phase: number;
    amp: number;
    damping: number;
    axis: 'x' | 'y';
  }>
): [number, number] {
  let x = 0, y = 0;

  for (const p of pendulums) {
    const decay = Math.exp(-p.damping * t);
    const value = p.amp * decay * Math.sin(p.freq * t + p.phase);

    if (p.axis === 'x') x += value;
    else y += value;
  }

  return [x, y];
}
```

With damping = 0 and only 2 oscillators, this produces Lissajous figures.

**Music mapping:**
- **Pendulum frequencies = note frequencies:** Direct pitch representation
- **Damping = envelope decay:** Note release shapes the decay
- **Phase = timing:** Rhythmic offset

**Implementation complexity:** Easy
**Animation potential:** Excellent - natural decay motion

---

### 13.3 3D Lissajous Curves

Extension to three dimensions.

```typescript
function lissajous3D(
  t: number,
  freqX: number, freqY: number, freqZ: number,
  phaseX: number, phaseY: number, phaseZ: number
): [number, number, number] {
  return [
    Math.sin(freqX * t + phaseX),
    Math.sin(freqY * t + phaseY),
    Math.sin(freqZ * t + phaseZ)
  ];
}
```

[3D Lissajous figures](https://demonstrations.wolfram.com/3DLissajousFigures/) create beautiful knots when frequency ratios are coprime integers.

**Music mapping:**
- **freqX:freqY:freqZ = chord intervals:** e.g., 4:5:6 = major triad
- **Phase = chord inversion:** Different starting phases = different views
- **Trace over time:** Melodic line draws path through space

**Implementation complexity:** Medium (3D projection)
**Animation potential:** Excellent

---

## 14. Escher-Style Tessellations

M.C. Escher's tessellations use [wallpaper group symmetries](https://en.wikipedia.org/wiki/Wallpaper_group) to create repeating patterns with recognizable figures.

### 14.1 Symmetry Operations

The 17 wallpaper groups classify all possible repeating patterns:
- **Translations:** Repeat in directions
- **Rotations:** 2-fold, 3-fold, 4-fold, 6-fold
- **Reflections:** Mirror lines
- **Glide reflections:** Reflect + translate

```typescript
interface Tile {
  path: Path2D;
  color: string;
}

function tessellate(
  tile: Tile,
  transforms: DOMMatrix[],  // Symmetry group operations
  bounds: { x: number; y: number; width: number; height: number }
): void {
  const ctx = getContext();

  // Apply each symmetry operation
  for (const transform of transforms) {
    ctx.save();
    ctx.setTransform(transform);
    ctx.fillStyle = tile.color;
    ctx.fill(tile.path);
    ctx.restore();
  }
}
```

Research on [advanced Escher-like spiral tessellations](https://link.springer.com/article/10.1007/s00371-021-02232-0) describes methods using conformal mappings to create spiral tilings from wallpaper motifs.

**Music mapping:**
- **Symmetry type = genre:** Different patterns for different styles
- **Tile shape = melodic motif:** Shape derived from note contour
- **Color = harmonic function:** Tonic, subdominant, dominant
- **Pattern density = texture:** More voices = more complex tessellation

**Implementation complexity:** Medium-Hard
**Animation potential:** Medium - tiles can rotate/transform with the beat

---

## 15. Geodesics on Curved Surfaces

Shortest paths on curved surfaces - generalizations of straight lines.

### 15.1 Geodesics on a Sphere

Great circles are geodesics. Any two points connect via a great circle arc.

### 15.2 Geodesics on a Torus

More complex behavior - some geodesics close, others fill the surface ergodically.

According to research on [geodesics on the torus](https://thatsmaths.com/2022/12/08/curvature-and-geodesics-on-a-torus/):
- The only parallels that are geodesics are the outer equator and inner equator
- All meridians (constant angular coordinate) are geodesics
- Some geodesics pass through the hole (monotonic poloidal angle), others don't (bounded poloidal angle)

```typescript
function torusGeodesic(
  u: number, v: number,  // Parametric position
  du: number, dv: number, // Direction
  R: number, r: number,   // Major and minor radii
  steps: number
): [number, number, number][] {
  const path: [number, number, number][] = [];

  for (let i = 0; i < steps; i++) {
    // Torus parametrization
    const x = (R + r * Math.cos(v)) * Math.cos(u);
    const y = (R + r * Math.cos(v)) * Math.sin(u);
    const z = r * Math.sin(v);
    path.push([x, y, z]);

    // Geodesic equations (simplified - actual requires Christoffel symbols)
    const newU = u + du;
    const newV = v + dv;

    // Clairaut's relation for surfaces of revolution
    const rho = R + r * Math.cos(v);
    // ... geodesic update

    u = newU;
    v = newV;
  }

  return path;
}
```

**Music mapping:**
- **Torus as pitch space:** u = pitch class, v = octave (or vice versa)
- **Melodic lines as geodesics:** Efficient voice leading follows shortest paths
- **Modulation as geodesic choice:** Different key paths = different geodesics

**Implementation complexity:** Hard (3D + differential geometry)
**Animation potential:** Good - paths flow along surface

---

## 16. Quantum Probability Densities

The square of the wavefunction |psi|^2 gives probability density.

### 16.1 Hydrogen Atom Orbitals

Beautiful 3D probability distributions with distinct shapes (s, p, d, f orbitals).

According to [research on hydrogen wavefunctions](https://ssebastianmag.medium.com/computational-physics-with-python-hydrogen-wavefunctions-electron-density-plots-8fede44b7b12):
- The wavefunction depends on quantum numbers n, l, m_l
- |psi|^2 shows where electrons are likely to be found
- Higher n = more complex structure, more nodes

```typescript
// Simplified 2D cross-section of p-orbital
function pOrbital(x: number, y: number): number {
  const r = Math.sqrt(x * x + y * y);
  const theta = Math.atan2(y, x);

  // p_x orbital (l=1, m=0)
  const radial = r * Math.exp(-r / 2);  // Radial part
  const angular = Math.cos(theta);       // Angular part

  return radial * radial * angular * angular;  // |psi|^2
}
```

**Music mapping:**
- **Quantum numbers = harmonic structure:** n ~ octave, l ~ interval type
- **Orbital shape = chord quality:** s (spherical) = unison, p (dumbbell) = third, d (clover) = fifth
- **Nodes = dissonance points:** Where probability is zero

**Implementation complexity:** Medium (2D slices), Hard (full 3D)
**Animation potential:** Medium - can transition between orbitals

---

## 17. Conformal Maps and Riemann Surfaces

### 17.1 Conformal Mapping

Angle-preserving transformations of the complex plane. Key examples:

```typescript
// Mobius transformation: f(z) = (az + b) / (cz + d)
function mobius(z: [number, number], a: [number, number], b: [number, number],
                c: [number, number], d: [number, number]): [number, number] {
  const num = complexMul(a, z);
  num[0] += b[0]; num[1] += b[1];

  const den = complexMul(c, z);
  den[0] += d[0]; den[1] += d[1];

  return complexDiv(num, den);
}

// Exponential map: f(z) = e^z
function expMap(z: [number, number]): [number, number] {
  const r = Math.exp(z[0]);
  return [r * Math.cos(z[1]), r * Math.sin(z[1])];
}

// Sin map: f(z) = sin(z)
function sinMap(z: [number, number]): [number, number] {
  return [
    Math.sin(z[0]) * Math.cosh(z[1]),
    Math.cos(z[0]) * Math.sinh(z[1])
  ];
}
```

[Conformal maps](https://en.wikipedia.org/wiki/Conformal_map) preserve local angles and shapes of infinitesimal figures.

**Music mapping:**
- **Domain coloring:** Color the plane by argument, map shows how colors flow
- **Grid deformation:** Square grid becomes curved, shows map properties
- **Singularities = dissonance:** Poles and essential singularities

**Implementation complexity:** Easy (2D), Medium (animated)
**Animation potential:** Excellent - parameter changes flow smoothly

---

## 18. Implementation Priority Recommendations

Based on visual impact, music-mapping potential, and implementation complexity:

### Tier 1: High Impact, Achievable

| Structure | Why | Notes |
|-----------|-----|-------|
| **3D Lissajous** | Direct frequency mapping, easy 3D | Already have 2D, extension natural |
| **Wave Interference** | Chord = superposition | Very musical metaphor |
| **Moiré Patterns** | Fast, mesmerizing, tiny motions = big effects | Great for beat sync |
| **Voronoi/Delaunay** | Notes as points, organic morphing | d3-delaunay makes it easy |
| **Electric Field Lines** | Notes as charges, tension as repulsion | Intuitive physics |

### Tier 2: Medium Effort, High Reward

| Structure | Why | Notes |
|-----------|-----|-------|
| **Lorenz/Rossler Attractors** | Chaos = tension, 3D depth | Need 3D projection |
| **Reaction-Diffusion** | Organic, GPU-friendly | Best as shader |
| **Hyperbolic Tilings** | Infinite detail at edge | Library available |
| **L-Systems** | Growth metaphor, branching | Natural animation |

### Tier 3: Complex but Unique

| Structure | Why | Notes |
|-----------|-----|-------|
| **Quaternion Rotations** | Smoothest 3D rotation possible | Complex math |
| **Fourier Winding** | Direct audio visualization | Needs audio data |
| **Orbifold Voice Leading** | Deep music theory connection | Topology visualization hard |
| **Geodesics on Torus** | Pitch space paths | Differential geometry |

### Already Have

- Tonnetz
- Chladni patterns
- Flow fields
- Note spiral
- Fractals (18 types)
- Piano roll
- Theory bar

---

## 19. Quick Reference: Parameter Mappings

| Musical Feature | Possible Visual Mapping |
|-----------------|------------------------|
| **Key center** | Position, center of symmetry |
| **Mode (major/minor)** | Pattern type, color palette |
| **Tension** | Chaos level, detail density, distance from center |
| **Beat** | Rotation, translation, zoom pulse |
| **Tempo** | Animation speed, particle velocity |
| **Dynamics** | Size, brightness, particle count |
| **Chord quality** | Shape type, symmetry order |
| **Chord root** | Hue, rotation angle |
| **Melody** | Traced path, highlighted region |
| **Bass** | Low-frequency visual elements, ground plane |
| **Drums** | Impulse responses, particle bursts |

---

## References

### 3Blue1Brown
- [3Blue1Brown Topics](https://www.3blue1brown.com/)
- [Eigenvectors and Eigenvalues](https://www.3blue1brown.com/lessons/eigenvalues)
- [Fourier Transform](https://www.3blue1brown.com/lessons/fourier-transforms)
- [Quaternions](https://www.3blue1brown.com/lessons/quaternions-and-3d-rotation)
- [Manim (animation library)](https://github.com/3b1b/manim)

### Strange Attractors
- [Dynamic Math - Strange Attractors](https://www.dynamicmath.xyz/strange-attractors/)
- [Lorenz System (Wikipedia)](https://en.wikipedia.org/wiki/Lorenz_system)
- [Three.js Strange Attractors Guide](https://skywork.ai/blog/dancing-with-chaos-a-developers-guide-to-visualizing-strange-attractors-in-three-js/)

### Cellular Automata
- [Rule 110 (Wikipedia)](https://en.wikipedia.org/wiki/Rule_110)
- [Game of Life Emergence in Art](https://www.artnome.com/news/2020/7/12/the-game-of-life-emergence-in-generative-art)
- [Cellular Automata Music](https://www.academia.edu/478869/Capturing_the_Aesthetic_Radial_Mappings_for_Cellular_Automata_Music)

### L-Systems
- [L-System (Wikipedia)](https://en.wikipedia.org/wiki/L-system)
- [The Coding Train: L-System Fractal Trees](https://thecodingtrain.com/challenges/16-l-system-fractal-trees/)
- [Generating Trees with L-Systems](https://gpfault.net/posts/generating-trees.txt.html)

### Voronoi/Delaunay
- [d3-delaunay](https://github.com/d3/d3-delaunay)
- [Visualizing Delaunay Triangulation](https://ianthehenry.com/posts/delaunay/)
- [Red Blob Games: Voronoi on Sphere](https://www.redblobgames.com/x/1842-delaunay-voronoi-sphere/)

### Hyperbolic Geometry
- [hyperbolic-canvas (GitHub)](https://github.com/ItsNickBarry/hyperbolic-canvas)
- [Poincare Disk Model (Wikipedia)](https://en.wikipedia.org/wiki/Poincar%C3%A9_disk_model)

### Reaction-Diffusion
- [Reaction-Diffusion Playground](https://jasonwebb.github.io/reaction-diffusion-playground/)
- [Red Blob Games: Turing Patterns](https://www.redblobgames.com/x/2202-turing-patterns/)
- [WebGPU Reaction Diffusion](https://shi-yan.github.io/webgpuunleashed/Compute/reaction_diffusion.html)

### Penrose Tilings
- [Penrose Tiling (Wikipedia)](https://en.wikipedia.org/wiki/Penrose_tiling)
- [Penrose Tilings and Quasicrystals (Nature)](https://www.nature.com/articles/382431a0)

### Wave Patterns
- [Wave Interference (oPhysics)](https://ophysics.com/waves4.html)
- [Wave Interference (PhET)](https://phet.colorado.edu/en/simulations/wave-interference)

### Moire Patterns
- [A Study in Moire Patterns](https://medium.com/@chiloong/a-study-in-moir%C3%A9-patterns-2dbdea30cbc5)
- [Moire Pattern (Wikipedia)](https://en.wikipedia.org/wiki/Moir%C3%A9_pattern)

### Music Theory Geometry
- [Spiral Array Model (Wikipedia)](https://en.wikipedia.org/wiki/Spiral_array_model)
- [Geometry of Musical Chords (Tymoczko)](https://dmitri.mycpanel.princeton.edu/voiceleading.pdf)
- [Orbifold Voice Leading](https://www.mdpi.com/2227-7390/10/6/939)

### Spirograph/Harmonograph
- [Spirograph (Wolfram MathWorld)](https://mathworld.wolfram.com/Spirograph.html)
- [Simulating Harmonographs](https://walkingrandomly.com/?p=151)
- [3D Lissajous Figures (Wolfram)](https://demonstrations.wolfram.com/3DLissajousFigures/)

### Field Visualization
- [Electric Field Visualization (WebGL)](http://www.vizitsolutions.com/portfolio/efield/)
- [MIT TEAL Electromagnetism](https://web.mit.edu/8.02t/www/802TEAL3D/visualizations/guidedtour/Tour.htm)

### Tessellations
- [Escher and Tessellations](https://mathandart.com/blog/escher_and_tessellations/)
- [Advanced Escher-like Spiral Tessellations](https://link.springer.com/article/10.1007/s00371-021-02232-0)

### Topology
- [Klein Bottle (Wikipedia)](https://en.wikipedia.org/wiki/Klein_bottle)
- [Mobius Strip (Wikipedia)](https://en.wikipedia.org/wiki/M%C3%B6bius_strip)

### Quantum Visualization
- [Hydrogen Wavefunctions (Python)](https://ssebastianmag.medium.com/computational-physics-with-python-hydrogen-wavefunctions-electron-density-plots-8fede44b7b12)

### Conformal Mapping
- [Conformal Map (Wikipedia)](https://en.wikipedia.org/wiki/Conformal_map)
- [Complex Analysis Visualization](https://complex-analysis.com/content/conformal_mapping.html)

### Chladni Patterns
- [COMSOL: Chladni Plates](https://www.comsol.com/blogs/how-do-chladni-plates-make-it-possible-to-visualize-sound)
- [Creating Digital Chladni Patterns](https://thelig.ht/chladni/)
