# Barnes-Hut N-Body Visualizations for Music

*Research on gravitational simulations and spatial data structures as music-reactive visual effects.*

---

## 0. Barnes-Hut Algorithm Overview

The [Barnes-Hut simulation](https://en.wikipedia.org/wiki/Barnes%E2%80%93Hut_simulation) is an approximation algorithm for N-body simulations that reduces complexity from O(n^2) to O(n log n). Named after Joshua Barnes and Piet Hut, it groups distant bodies together and treats them as single masses.

### Core Concept

The key insight: **group nearby bodies and approximate them as a single body**. If a group is sufficiently far away, we can approximate its gravitational effects using its center of mass.

### Spatial Data Structure

- **2D**: Quadtree (each node has 4 children)
- **3D**: Octree (each node has 8 children)

Each node represents a region of space. Bodies are inserted recursively, subdividing regions as needed.

### Force Calculation

To calculate the net force on a body:
1. Start at the tree root
2. If a node's center of mass is sufficiently far (ratio s/d < theta), treat it as a single body
3. Otherwise, recurse into children

### The Theta Parameter

| Theta | Behavior | Use Case |
|-------|----------|----------|
| **0.0** | Exact calculation (no approximation) | Reference/validation |
| **0.4** | High accuracy, slower | Scientific simulation |
| **0.7-1.0** | Good default balance | General visualization |
| **1.5+** | Fast, lower accuracy | Music visualization (errors of a few pixels acceptable) |

Reference: [The Barnes-Hut Approximation](https://jheer.github.io/barnes-hut/) shows that theta=1.0 provides low error with good performance, and visualization can use even higher values.

---

## 1. N-Body Gravitational Simulations

### 1.1 Galaxy Formation

**Visual Description**: Gas clouds coalescing into stars orbiting around a central black hole. Spiral arms emerge from gravitational interactions. Stars cluster, merge, and form rotating disk structures.

**Aesthetic Qualities**:
- Organic, emergent spiral patterns
- Dense core with diffuse halo
- Sense of rotation and flow
- Stars leave orbital trails creating light ribbons

**Music Mapping**:
| Music Parameter | Visual Effect |
|-----------------|---------------|
| **Tempo/BPM** | Time step speed (faster = more dynamic) |
| **Key (tonic)** | Central black hole position |
| **Chord tones** | Gravitational wells (attractors) |
| **Tension** | Gravitational constant G (higher = more attraction) |
| **Melody notes** | Spawn new stars at pitch-mapped positions |
| **Bass** | Central mass intensity |
| **Modulation** | Galaxy collision event |

**Performance**:
- Canvas 2D: 1,000-5,000 particles at 60fps
- WebGL instanced: 10,000-50,000 particles
- WebGL compute: 100,000+ particles

**Reference Implementation**: [WebGL N-body Galaxy Simulation](https://andrewdcampbell.github.io/galaxy-sim-report)

```typescript
// Galaxy formation with music-driven parameters
interface GalaxyParams {
  centralMass: number;      // Maps to bass energy
  G: number;                // Maps to harmonic tension
  particleCount: number;    // Fixed or scales with density
  spawnRadius: number;      // Maps to melodic range
  timeStep: number;         // Maps to tempo
}

function updateGalaxy(particles: Particle[], params: MusicParams) {
  const G = 0.5 + params.tension * 2.0;  // 0.5-2.5 range
  const dt = params.beatDuration / 60;   // Tempo-relative time step

  // Barnes-Hut tree construction
  const tree = buildQuadtree(particles);

  for (const p of particles) {
    const force = calculateForce(p, tree, theta);
    p.vx += force.x * dt / p.mass;
    p.vy += force.y * dt / p.mass;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}
```

### 1.2 Star Cluster Dynamics

**Visual Description**: Dense globular clusters with thousands of stars in gravitational dance. Core is dense and bright, outer regions sparse. Occasional ejections as stars gain escape velocity.

**Aesthetic Qualities**:
- Pulsating core density
- Stars escaping and re-entering
- Collision/near-miss events create bright flashes
- Concentric density waves

**Music Mapping**:
| Music Parameter | Visual Effect |
|-----------------|---------------|
| **Chord changes** | Density wave pulse |
| **Accents (kick/snare)** | Star ejection events |
| **Velocity** | Particle brightness/size |
| **Chord quality** | Cluster shape (major=spherical, minor=elongated) |

### 1.3 Dark Matter Halo Visualization

**Visual Description**: Invisible scaffolding revealed through gravitational lensing. Dark matter forms web-like filaments connecting visible matter. Ghost particles influence visible ones without being seen directly.

**Aesthetic Qualities**:
- Mysterious, ethereal presence
- Distortion effects on background
- Reveals structure through interaction
- Negative-space visualization

**Music Mapping**:
- **Sustained bass notes** = Dark matter density
- **Harmony layers** = Visible vs invisible matter ratio
- **Tension** = Lensing distortion strength

---

## 2. Quadtree/Octree Visualizations

The spatial partitioning structure itself creates compelling visuals. [Quadtree Art](https://www.michaelfogleman.com/static/quads/) demonstrates the aesthetic potential.

### 2.1 Hierarchical Bounding Boxes

**Visual Description**: Recursive grid of squares, each subdivided where detail exists. Creates a "digital camouflage" or "pixel art" aesthetic. Boundaries glow and pulse.

**Aesthetic Qualities**:
- Geometric, digital, precise
- Reveals structure and density
- Self-similar at multiple scales
- Beautiful grid-based patterns

**Music Mapping**:
| Music Parameter | Visual Effect |
|-----------------|---------------|
| **Active voices** | Subdivision depth (more notes = more detail) |
| **Note positions** | Where subdivision occurs |
| **Beat pulse** | Grid line brightness animation |
| **Bar boundaries** | Full tree rebuild animation |

**Implementation Pattern**:
```typescript
interface QuadNode {
  bounds: Rect;
  children: QuadNode[] | null;
  particles: Particle[];
  centerOfMass: Vec2;
  totalMass: number;
}

function drawQuadtree(node: QuadNode, depth: number, params: MusicParams) {
  // Draw this node's boundary
  const alpha = 0.8 - depth * 0.1;  // Fade with depth
  const hue = (params.chordRoot / 12) * 360;

  ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${alpha})`;
  ctx.lineWidth = Math.max(1, 4 - depth);
  ctx.strokeRect(node.bounds.x, node.bounds.y, node.bounds.w, node.bounds.h);

  // Recurse into children
  if (node.children) {
    for (const child of node.children) {
      drawQuadtree(child, depth + 1, params);
    }
  }
}
```

### 2.2 Adaptive Mesh Refinement Display

**Visual Description**: Grid that refines where "interesting" things happen. High activity regions show fine detail; quiet regions remain coarse. Creates a focus/defocus visual metaphor.

**Aesthetic Qualities**:
- Attention-directing (eye drawn to detail)
- Dynamic resolution allocation
- Scientific/technical aesthetic
- Reveals "importance" distribution

**Music Mapping**:
- **Melody region** = High refinement area
- **Silent octaves** = Coarse cells
- **Energy/velocity** = Refinement threshold

### 2.3 Quadtree as Generative Art

Based on [Mike Bostock's Quadtree Art](https://observablehq.com/@mbostock/quadtree-art):

**Visual Description**: Subdivide image/canvas based on color variance. Fill each cell with average color. Creates painterly, pixelated-but-organic imagery.

**Music Mapping**: Use music to drive the variance threshold:
- **High tension** = More subdivision (detailed)
- **Resolution** = Less subdivision (abstract)
- **Chord changes** = Trigger re-computation

---

## 3. Physics Simulations Using Barnes-Hut

### 3.1 Electrostatic Simulation

**Visual Description**: Positive and negative charges attracting and repelling. Electric field lines flow between poles. Charges cluster and separate dynamically.

**Aesthetic Qualities**:
- Polarity creates push/pull dynamics
- Field lines create flowing patterns
- Charge accumulation = bright spots
- Dipole formations

**Music Mapping**:
| Music Parameter | Visual Effect |
|-----------------|---------------|
| **Major/minor quality** | Charge polarity distribution |
| **Melody notes** | Spawn positive charges |
| **Bass notes** | Spawn negative charges |
| **Tension** | Coulomb constant (interaction strength) |
| **Chord tones** | Fixed anchor charges |

**Reference**: [d3-force-magnetic](https://github.com/vasturiano/d3-force-magnetic) provides attraction/repulsion following inverse-square law.

```typescript
// Electrostatic with music-driven charges
function spawnCharge(pitch: number, velocity: number, params: MusicParams) {
  const isPositive = pitch > 60;  // Above middle C = positive
  const charge = (velocity / 127) * (isPositive ? 1 : -1);
  const angle = (pitch % 12) / 12 * Math.PI * 2;
  const radius = (pitch - 21) / 87 * canvasRadius;

  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
    charge: charge,
    mass: velocity / 127,
  };
}
```

### 3.2 SPH Fluid Simulation

Smoothed Particle Hydrodynamics simulates fluid motion. [WebGL-SPH](https://github.com/mjwatkins2/WebGL-SPH) runs in browser.

**Visual Description**: Liquid that sloshes, splashes, and flows. Particles represent fluid volume elements. Surface tension creates droplets and streams.

**Aesthetic Qualities**:
- Organic, flowing motion
- Viscosity creates different feels (water vs honey)
- Splashes and droplets
- Surface tension effects

**Music Mapping**:
| Music Parameter | Visual Effect |
|-----------------|---------------|
| **Kick drum** | Gravity impulse (slosh direction) |
| **Snare** | Surface perturbation |
| **Tempo** | Viscosity (fast = water, slow = honey) |
| **Bass energy** | Gravity strength |
| **Melody** | Spawn droplets |

**Performance Notes**: SPH requires ~1000-5000 particles for convincing fluid. WebGL 2.0 with GPGPU achieves real-time.

### 3.3 Crowd/Swarm Simulations

Based on [Boids flocking algorithm](https://en.wikipedia.org/wiki/Boids):

**Visual Description**: Agents following separation, alignment, cohesion rules. Flocks emerge, split, and reform. Predator/prey dynamics possible.

**Three Rules**:
1. **Separation**: Avoid crowding neighbors
2. **Alignment**: Steer toward average heading
3. **Cohesion**: Steer toward center of mass

**Music Mapping**:
| Music Parameter | Visual Effect |
|-----------------|---------------|
| **Tension** | Separation radius (high tension = scattered) |
| **Chord quality** | Cohesion strength (major = tight flocks) |
| **Melody onset** | Predator spawn (scatters flock) |
| **Beat pulse** | Alignment strength pulse |
| **Key changes** | Flock destination shift |

```typescript
interface Boid {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
}

function updateBoids(boids: Boid[], params: MusicParams) {
  const separationRadius = 30 + params.tension * 50;
  const cohesionStrength = params.chordQuality === 'major' ? 0.02 : 0.005;
  const alignmentStrength = 0.1 + params.beatGroove * 0.1;

  // Barnes-Hut tree for efficient neighbor queries
  const tree = buildQuadtree(boids);

  for (const boid of boids) {
    const neighbors = queryNeighbors(tree, boid, viewRadius);
    const sep = calculateSeparation(boid, neighbors, separationRadius);
    const ali = calculateAlignment(boid, neighbors);
    const coh = calculateCohesion(boid, neighbors);

    boid.vx += sep.x * 0.05 + ali.x * alignmentStrength + coh.x * cohesionStrength;
    boid.vy += sep.y * 0.05 + ali.y * alignmentStrength + coh.y * cohesionStrength;

    // Limit speed
    const speed = Math.sqrt(boid.vx ** 2 + boid.vy ** 2);
    if (speed > maxSpeed) {
      boid.vx = (boid.vx / speed) * maxSpeed;
      boid.vy = (boid.vy / speed) * maxSpeed;
    }
  }
}
```

---

## 4. Artistic Interpretations

### 4.1 Particle Nebulae

**Visual Description**: Dense clouds of glowing particles with volumetric appearance. Color gradients from core to edge. Wispy tendrils extend outward. Stars embedded within gas.

**Aesthetic Qualities**:
- Soft, diffuse glow
- Multiple color layers
- Sense of depth and volume
- Ethereal, cosmic beauty

**Implementation Approach**:
```typescript
// Nebula rendering with additive blending
ctx.globalCompositeOperation = 'lighter';

for (const particle of particles) {
  const gradient = ctx.createRadialGradient(
    particle.x, particle.y, 0,
    particle.x, particle.y, particle.radius * 3
  );
  gradient.addColorStop(0, `rgba(${particle.r}, ${particle.g}, ${particle.b}, 0.8)`);
  gradient.addColorStop(0.5, `rgba(${particle.r}, ${particle.g}, ${particle.b}, 0.2)`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.radius * 3, 0, Math.PI * 2);
  ctx.fill();
}
```

**Music Mapping**:
- **Chord tones** = Emission centers
- **Velocity** = Particle brightness
- **Tension** = Color saturation
- **Bass** = Core density

### 4.2 Cosmic Web Structures

Inspired by [NASA's cosmic web visualizations](https://science.nasa.gov/resource/cosmic-web/):

**Visual Description**: Filaments of matter connecting galaxy clusters. Voids between structures. Web-like topology emerges from gravity. Knots represent galaxy clusters.

**Aesthetic Qualities**:
- Large-scale structure
- Filaments and voids
- Sense of infinite scale
- Fractal-like organization

**Music Mapping**:
| Music Parameter | Visual Effect |
|-----------------|---------------|
| **Chord tones** | Galaxy cluster positions (12 around circle) |
| **Tension** | Filament visibility |
| **Modulation** | Web restructuring animation |
| **Bass** | Void darkness |

### 4.3 Gravitational Lensing Effects

Based on [black hole shader techniques](https://ebruneton.github.io/black_hole_shader/):

**Visual Description**: Light bending around massive objects. Background stars distorted into arcs. Einstein rings form around aligned objects. Accretion disks visible through warped space.

**Aesthetic Qualities**:
- Surreal distortion
- Reveals hidden information
- Dramatic light effects
- Physics-based beauty

**Implementation**: Ray marching in fragment shader, with music driving mass distribution.

**Music Mapping**:
- **Bass notes** = Black hole mass/size
- **Chord root** = Lens position
- **Tension** = Distortion strength

### 4.4 Orbital Trails and Motion Blur

Reference: [Canvas Orbital Trails](https://gist.github.com/5931404)

**Visual Description**: Particles leave glowing trails as they orbit. Trails fade over time creating comet-like effects. Overlapping trails create interference patterns.

**Aesthetic Qualities**:
- Sense of motion and history
- Calligraphic, brush-stroke quality
- Speed visualization
- Ephemeral beauty

```typescript
// Trail rendering with decreasing alpha
interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

function drawTrail(trail: TrailPoint[], color: string, params: MusicParams) {
  ctx.beginPath();
  ctx.moveTo(trail[0].x, trail[0].y);

  for (let i = 1; i < trail.length; i++) {
    const alpha = 1 - trail[i].age / maxAge;
    const width = (1 - trail[i].age / maxAge) * 3;

    ctx.lineTo(trail[i].x, trail[i].y);
    ctx.strokeStyle = `rgba(${color}, ${alpha * params.beatGroove})`;
    ctx.lineWidth = width;
  }
  ctx.stroke();
}
```

---

## 5. Music Mapping Opportunities

### 5.1 Notes as Masses

**Concept**: Each note creates a gravitational body. Higher velocity = more mass. Duration determines lifetime.

```typescript
function noteToMass(note: ActiveVoice): Particle {
  return {
    x: noteToX(note.midi),
    y: noteToY(note.midi),
    mass: (note.velocity / 127) * 10,      // Velocity = mass
    radius: (note.velocity / 127) * 5,
    lifetime: note.duration || 2.0,
    color: pitchClassColor(note.midi % 12),
  };
}

function noteToX(midi: number): number {
  // Pitch class determines angle
  const angle = ((midi % 12) / 12) * Math.PI * 2;
  const radius = ((midi - 21) / 87) * canvasRadius * 0.8;
  return centerX + Math.cos(angle) * radius;
}
```

### 5.2 Chord Tones as Gravitational Centers

**Concept**: Active chord tones become fixed attractors. Notes in the melody orbit these attractors.

```typescript
function chordToAttractors(params: MusicParams): Attractor[] {
  const attractors: Attractor[] = [];
  const chordPitches = getChordPitches(params.chordRoot, params.chordQuality);

  for (const pc of chordPitches) {
    const angle = (pc / 12) * Math.PI * 2 - Math.PI / 2;
    const mass = pc === params.chordRoot ? 100 : 50;  // Root is heaviest

    attractors.push({
      x: centerX + Math.cos(angle) * orbitRadius,
      y: centerY + Math.sin(angle) * orbitRadius,
      mass: mass * (1 + params.tension * 0.5),
      fixed: true,
    });
  }
  return attractors;
}
```

### 5.3 Beat as Time Step

**Concept**: Physics advances in beat-relative time. Faster tempo = faster evolution. Beat grid creates quantized "frames."

```typescript
function musicDrivenTimestep(params: MusicParams): number {
  const baseDt = 1 / 60;  // 60fps base
  const tempoFactor = params.bpm / 120;  // Normalized to 120 BPM

  // Groove modulation: anticipation = slow motion, arrival = speed up
  const grooveFactor = 0.7 + params.beatGroove * 0.6;

  return baseDt * tempoFactor * grooveFactor;
}
```

### 5.4 Tension as Gravitational Constant

**Concept**: Harmonic tension maps directly to G. High tension = strong attraction = dramatic dynamics.

```typescript
function tensionToG(tension: number): number {
  // tension: 0 = consonant, 1 = dissonant
  const minG = 0.5;   // Calm, floating
  const maxG = 3.0;   // Dramatic, collapsing

  return minG + tension * (maxG - minG);
}
```

### 5.5 Key Changes as Galaxy Collisions

**Concept**: When the key changes (modulation), two gravitational systems merge. Creates spectacular visual event.

```typescript
function handleModulation(params: MusicParams, galaxies: Galaxy[]) {
  if (params.onModulation) {
    // Spawn second galaxy at new key position
    const newKeyAngle = (params.key / 12) * Math.PI * 2;
    const collisionGalaxy = createGalaxy({
      x: centerX + Math.cos(newKeyAngle) * canvasRadius * 0.6,
      y: centerY + Math.sin(newKeyAngle) * canvasRadius * 0.6,
      vx: -Math.cos(newKeyAngle) * 50,  // Moving toward center
      vy: -Math.sin(newKeyAngle) * 50,
      particleCount: 500,
    });

    galaxies.push(collisionGalaxy);

    // Animate collision over 4 bars
    gsap.to(collisionGalaxy, {
      x: centerX,
      y: centerY,
      duration: params.beatDuration * params.beatsPerBar * 4,
      ease: 'power2.inOut',
    });
  }
}
```

---

## 6. Implementation Approaches

### 6.1 Canvas 2D Particle Systems

**Best For**: Simpler effects, smaller particle counts, quick prototyping

**Performance**: 1,000-10,000 particles at 60fps

**Pattern**:
```typescript
class Canvas2DParticleSystem {
  particles: Particle[] = [];
  tree: QuadNode | null = null;

  update(params: MusicParams) {
    const dt = musicDrivenTimestep(params);
    const G = tensionToG(params.tension);

    // Rebuild tree each frame
    this.tree = buildQuadtree(this.particles);

    for (const p of this.particles) {
      const force = this.calculateForce(p, G);
      p.vx += force.x * dt / p.mass;
      p.vy += force.y * dt / p.mass;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.age += dt;
    }

    // Remove dead particles
    this.particles = this.particles.filter(p => p.age < p.lifetime);
  }

  calculateForce(p: Particle, G: number): Vec2 {
    return barnesHutForce(p, this.tree!, theta, G);
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const alpha = 1 - p.age / p.lifetime;
      ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
```

### 6.2 WebGL Instanced Rendering

**Best For**: 10,000-100,000 particles with GPU rendering, CPU physics

**Pattern**:
```typescript
// Vertex shader for instanced particles
const vertexShader = `
  attribute vec2 a_position;
  attribute vec2 a_offset;      // Per-instance
  attribute float a_size;       // Per-instance
  attribute vec4 a_color;       // Per-instance

  uniform mat3 u_projection;
  varying vec4 v_color;

  void main() {
    vec2 position = a_position * a_size + a_offset;
    gl_Position = vec4((u_projection * vec3(position, 1)).xy, 0, 1);
    v_color = a_color;
  }
`;

// Update instance buffers each frame
function updateBuffers(particles: Particle[]) {
  const offsets = new Float32Array(particles.length * 2);
  const sizes = new Float32Array(particles.length);
  const colors = new Float32Array(particles.length * 4);

  for (let i = 0; i < particles.length; i++) {
    offsets[i * 2] = particles[i].x;
    offsets[i * 2 + 1] = particles[i].y;
    sizes[i] = particles[i].radius;
    colors[i * 4] = particles[i].r / 255;
    colors[i * 4 + 1] = particles[i].g / 255;
    colors[i * 4 + 2] = particles[i].b / 255;
    colors[i * 4 + 3] = 1 - particles[i].age / particles[i].lifetime;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, offsets, gl.DYNAMIC_DRAW);
  // ... same for sizes and colors
}
```

### 6.3 WebGL Compute Shaders (WebGPU)

**Best For**: 100,000+ particles with full GPU simulation

**Performance**: 100,000 particles in <2ms vs 30ms on CPU ([source](https://threejsroadmap.com/blog/webgl-vs-webgpu-explained))

**Key Advantages**:
- Entire simulation runs on GPU
- Particle positions never leave GPU memory
- Parallel force calculation

**Pattern** (WebGPU compute):
```wgsl
@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<storage, read> tree: array<TreeNode>;
@group(0) @binding(2) var<uniform> params: SimParams;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = id.x;
  if (i >= arrayLength(&particles)) { return; }

  var p = particles[i];
  let force = barnesHutForce(p, params.G, params.theta);

  p.vx += force.x * params.dt / p.mass;
  p.vy += force.y * params.dt / p.mass;
  p.x += p.vx * params.dt;
  p.y += p.vy * params.dt;

  particles[i] = p;
}
```

### 6.4 Hybrid Approaches

**Best For**: Complex music-reactive systems with moderate particle counts

**Pattern**: CPU handles music analysis and high-level control, GPU handles physics and rendering.

```typescript
class HybridNBodySystem {
  // CPU: Music analysis, spawn/despawn decisions, parameter updates
  // GPU: Physics integration, rendering

  update(params: MusicParams) {
    // CPU: Determine what to spawn based on music
    const spawns = this.processMusic(params);

    // CPU: Update uniform parameters
    this.uniforms.G = tensionToG(params.tension);
    this.uniforms.dt = musicDrivenTimestep(params);

    // GPU: Run physics compute shader
    this.runComputePass();

    // GPU: Render particles
    this.runRenderPass();
  }
}
```

---

## 7. Effect Concepts for The Fractured Jukebox

### 7.1 "Gravity Well" (Foreground Layer)

**Visual**: 12 gravitational attractors arranged in pitch-class circle. Particles spawn from melody notes and orbit chord-tone attractors. Trails show recent orbital paths.

**Music Mapping**:
- Chord tones = Attractors with glow
- Melody = Particle spawns
- Tension = Orbital chaos
- Bass = Central black hole mass

**Implementation Notes**:
- 500-2000 particles
- Canvas 2D with additive blending
- Barnes-Hut with theta=1.0
- Trail length = 48 frames

### 7.2 "Cosmic Dance" (Background Layer)

**Visual**: Two or more particle clusters (galaxies) that attract/repel based on harmonic relationships. Modulations trigger dramatic merger events.

**Music Mapping**:
- Key = Primary galaxy position
- Secondary keys = Satellite galaxies
- Tension = Inter-galaxy gravity
- Modulation = Collision event

**Implementation Notes**:
- 1000-3000 particles total
- Distinct color palettes per "galaxy"
- Slow, majestic motion
- Low alpha for atmospheric effect

### 7.3 "Quadtree Pulse" (Overlay Layer)

**Visual**: The Barnes-Hut quadtree structure itself is visible. Grid lines pulse with beats. Subdivision depth increases in active regions.

**Music Mapping**:
- Active voices = Subdivision regions
- Beat pulse = Grid brightness
- Tension = Line thickness
- Chord changes = Tree rebuild flash

**Implementation Notes**:
- Render tree structure, not just particles
- Animate grid lines with GSAP
- Semi-transparent over other layers

### 7.4 "Flock" (Melody Layer)

**Visual**: Boids-style flocking with music-reactive behavior. Flock follows melody. Kick drums scatter, snares trigger formation changes.

**Music Mapping**:
- Melody pitch = Flock target position
- Melody onset = Flock reforms at target
- Kick = Scatter explosion
- Snare = Tight formation
- Tension = Separation radius

---

## 8. Key Learnings

### What Works

1. **Music-driven time step**: Tie physics to beat duration, not wall clock
2. **Chord tones as attractors**: Creates stable orbital structures
3. **Tension = gravity**: Natural mapping, intuitive visual result
4. **Modulation as collision**: Spectacular event for key changes
5. **Barnes-Hut efficiency**: Essential for >1000 particles

### What to Avoid

1. **Too many particles in Canvas 2D**: Keep under 5000 for 60fps
2. **Theta too low**: Values under 0.5 add overhead without visible benefit
3. **Physics-driven spawning**: Music should control spawn, not physics
4. **Continuous particle creation**: Cap particle count, use pools
5. **Heavy glow effects**: Use layered fills, not shadow blur

### Performance Guidelines

| Approach | Particle Limit | Use Case |
|----------|---------------|----------|
| Canvas 2D | 1,000-5,000 | Simple effects, prototypes |
| WebGL Instanced | 10,000-50,000 | Production effects |
| WebGL Compute | 100,000+ | Massive spectacles |

---

## 9. References and Resources

### Implementations
- [The Barnes-Hut Algorithm](https://arborjs.org/docs/barnes-hut) - Arbor.js documentation
- [The Barnes-Hut Approximation](https://jheer.github.io/barnes-hut/) - Interactive explanation
- [ngraph.quadtreebh](https://github.com/anvaka/ngraph.quadtreebh) - JavaScript quadtree for Barnes-Hut
- [d3-force](https://d3js.org/d3-force) - Force-directed simulation with velocity Verlet
- [d3-force-3d](https://github.com/vasturiano/d3-force-3d) - 3D extension

### Galaxy Simulations
- [WebGL N-body Galaxy Simulation](https://andrewdcampbell.github.io/galaxy-sim-report) - Real-time WebGL
- [JS_ParticleSystem](https://github.com/DrA1ex/JS_ParticleSystem) - 50,000 particle galaxy
- [The Barnes-Hut Galaxy Simulator](https://beltoforion.de/en/barnes-hut-galaxy-simulator/) - Educational

### Fluid Simulation
- [WebGL-SPH](https://github.com/mjwatkins2/WebGL-SPH) - Browser-based SPH
- [gpgpu-2d-sph-fluid-simulation](https://github.com/robert-leitl/gpgpu-2d-sph-fluid-simulation) - WebGL 2 GPGPU

### Gravitational Lensing
- [Black Hole Shader](https://ebruneton.github.io/black_hole_shader/) - Real-time rendering
- [gravy](https://github.com/portsmouth/gravy) - WebGL lensing simulation

### Boids/Flocking
- [Boids Algorithm](https://vanhunteradams.com/Pico/Animal_Movement/Boids-algorithm.html) - Detailed explanation
- [p5.js Flocking](https://p5js.org/examples/classes-and-objects-flocking/) - Interactive example

### Audio-Reactive Particles
- [Audio Reactive Visuals](https://audioreactivevisuals.com/particle-systems.html) - Techniques overview
- [Audio-Reactive Particles in Three.js](https://tympanus.net/codrops/2023/12/19/creating-audio-reactive-visuals-with-dynamic-particles-in-three-js/) - Codrops tutorial

### GPU Particle Systems
- [GPU-Accelerated Particles with WebGL 2](https://gpfault.net/posts/webgl2-particles.txt.html) - Transform feedback
- [WebGL vs WebGPU](https://threejsroadmap.com/blog/webgl-vs-webgpu-explained) - Performance comparison
