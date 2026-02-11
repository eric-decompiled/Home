# Performance Optimizations from znah/graphs

Research analysis of [znah/graphs](https://github.com/znah/graphs) by Alexander Mordvintsev. This repository demonstrates high-performance graph visualization using WebAssembly, Barnes-Hut algorithm, and WebGL rendering.

## Executive Summary

The znah/graphs project handles 10,000+ nodes at 60fps through three key optimizations:

1. **Barnes-Hut Algorithm**: Reduces n-body force calculation from O(N^2) to O(N log N)
2. **WebAssembly Physics**: C compiled to WASM for near-native performance
3. **WebGL Rendering**: GPU-accelerated batch rendering with bloom post-processing

Our Graph Sculpture effect currently uses O(N^2) physics suitable for ~300-500 nodes. This document analyzes which optimizations would benefit our Canvas 2D implementation.

---

## 1. Barnes-Hut Algorithm

### How It Works

The Barnes-Hut algorithm approximates distant particle interactions by treating clusters as single "super-particles." Instead of calculating N^2 pairwise interactions, it builds a spatial tree (octree in 3D, quadtree in 2D) and uses the **theta parameter** to decide when to approximate.

**Complexity**: O(N log N) instead of O(N^2)

### Octree/Quadtree Construction

The znah/graphs implementation uses **Morton codes** (Z-order curves) for efficient tree construction:

```c
// Dilate bits to create Morton code (interleaves x, y, z coordinates)
static inline unsigned int dilate3(unsigned int x) {
    x &= 0x3ff;                          // Keep 10 bits
    x = (x | (x << 16)) & 0x30000ff;
    x = (x | (x << 8))  & 0x300f00f;
    x = (x | (x << 4))  & 0x30c30c3;
    x = (x | (x << 2))  & 0x9249249;
    return x;
}

// Combine x, y, z into single 30-bit Morton code
unsigned int code = dilate3(ix) | (dilate3(iy) << 1) | (dilate3(iz) << 2);
```

**Why Morton codes?**
- Sorting by Morton code groups spatially adjacent particles
- Tree construction becomes a single O(N log N) sort operation
- Particles in the same tree cell have adjacent Morton codes

### Theta Parameter for Approximation

The **theta** parameter (θ) controls the accuracy/speed tradeoff:

```c
const float theta2 = 0.81f;  // θ² = 0.9² = 0.81

// For each tree node, compute distance to point
float dx = node_center[ni*3] - px;
float dy = node_center[ni*3+1] - py;
float dz = node_center[ni*3+2] - pz;
float l2 = dx*dx + dy*dy + dz*dz;  // squared distance
float w = node_extent[ni];          // node width

// If node is far enough away, treat as single body
if (w * w < theta2 * l2) {
    // Use center-of-mass approximation
    applyForce(point, node.centerOfMass, node.totalMass);
} else {
    // Recurse into children
    traverseChildren(node);
}
```

**Theta values:**
- θ = 0: No approximation (falls back to O(N^2))
- θ = 0.5: Conservative, accurate
- θ = 0.9: Aggressive, fast (used by znah/graphs)
- θ > 1.0: Very aggressive, may cause artifacts

### Dual-Tree Traversal

The znah/graphs implementation uses a sophisticated **dual-tree** algorithm that computes forces bidirectionally:

```c
void calcMultibodyForceDual(int pointN, int nodeN, float maxDist) {
    // Stack-based iterative traversal of node pairs
    typedef struct { int a; int b; } NodePair;
    NodePair stack[4096];
    int top = 0;
    stack[top++] = (NodePair){0, 0};  // Start with root vs root

    while (top > 0) {
        NodePair pair = stack[--top];
        int niA = pair.a, niB = pair.b;

        // Compute distance between node centers
        float dx = node_center[niB*3] - node_center[niA*3];
        float l2 = dx*dx + dy*dy + dz*dz;
        float combined_w = wA + wB;

        if (niA != niB && (combined_w * combined_w < theta2 * l2)) {
            // Nodes far apart: treat as single bodies
            // A pushes B, B pushes A (symmetric)
            node_force[niA*3] += ca * dx;
            node_force[niB*3] -= cb * dx;
        } else {
            // Nodes too close: recursively subdivide
            if (leafA && leafB) {
                // Both leaves: direct O(m*n) calculation
                directForce(nodeA.points, nodeB.points);
            } else {
                // Push child pairs onto stack
                for each child of larger node:
                    stack[top++] = (NodePair){child, other};
            }
        }
    }

    // Propagate node forces down to points
    for (int ni = 1; ni < nodeN; ++ni) {
        node_force[ni] += node_force[parent[ni]];
    }
}
```

**Benefits of dual-tree:**
- Exploits symmetry: A→B and B→A computed together
- Better cache locality: traverses tree systematically
- 2-4x faster than single-tree for balanced graphs

### JavaScript Port for Quadtree (2D)

For our 2D Canvas implementation:

```typescript
interface QuadNode {
  cx: number;       // center x
  cy: number;       // center y
  extent: number;   // half-width
  mass: number;     // total mass (node count)
  comX: number;     // center of mass x
  comY: number;     // center of mass y
  children: (QuadNode | null)[];  // 4 quadrants [NW, NE, SW, SE]
  points: number[]; // indices if leaf
}

function buildQuadtree(nodes: GraphNode[]): QuadNode {
  // 1. Compute bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y);
  }

  // 2. Create root node
  const extent = Math.max(maxX - minX, maxY - minY) / 2;
  const root: QuadNode = {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    extent,
    mass: 0,
    comX: 0,
    comY: 0,
    children: [null, null, null, null],
    points: [],
  };

  // 3. Insert each node
  for (let i = 0; i < nodes.length; i++) {
    insertPoint(root, nodes, i, 0);
  }

  // 4. Compute centers of mass (bottom-up)
  computeCOM(root, nodes);

  return root;
}

function insertPoint(node: QuadNode, nodes: GraphNode[], idx: number, depth: number) {
  const { x, y } = nodes[idx];

  // Max depth reached: store in leaf
  if (depth >= 12 || node.extent < 0.1) {
    node.points.push(idx);
    return;
  }

  // Determine quadrant: 0=NW, 1=NE, 2=SW, 3=SE
  const qx = x >= node.cx ? 1 : 0;
  const qy = y >= node.cy ? 2 : 0;
  const q = qx + qy;

  // Create child if needed
  if (!node.children[q]) {
    const half = node.extent / 2;
    node.children[q] = {
      cx: node.cx + (qx ? half : -half),
      cy: node.cy + (qy > 0 ? half : -half),
      extent: half,
      mass: 0,
      comX: 0,
      comY: 0,
      children: [null, null, null, null],
      points: [],
    };
  }

  insertPoint(node.children[q]!, nodes, idx, depth + 1);
}

function computeCOM(node: QuadNode, nodes: GraphNode[]) {
  if (node.points.length > 0) {
    // Leaf node: compute from points
    let mx = 0, my = 0;
    for (const idx of node.points) {
      mx += nodes[idx].x;
      my += nodes[idx].y;
    }
    node.mass = node.points.length;
    node.comX = mx / node.mass;
    node.comY = my / node.mass;
  } else {
    // Internal node: sum from children
    let totalMass = 0, mx = 0, my = 0;
    for (const child of node.children) {
      if (child) {
        computeCOM(child, nodes);
        totalMass += child.mass;
        mx += child.comX * child.mass;
        my += child.comY * child.mass;
      }
    }
    node.mass = totalMass;
    node.comX = mx / totalMass;
    node.comY = my / totalMass;
  }
}
```

**Barnes-Hut force calculation:**

```typescript
const THETA = 0.9;
const THETA_SQ = THETA * THETA;

function computeRepulsion(nodes: GraphNode[], root: QuadNode, strength: number) {
  for (let i = 0; i < nodes.length; i++) {
    computeForceOnNode(nodes, i, root, strength);
  }
}

function computeForceOnNode(
  nodes: GraphNode[],
  idx: number,
  quadNode: QuadNode,
  strength: number
) {
  const node = nodes[idx];
  const dx = quadNode.comX - node.x;
  const dy = quadNode.comY - node.y;
  const d2 = dx * dx + dy * dy;

  // Skip if same point
  if (d2 < 0.01 && quadNode.points.length === 1 && quadNode.points[0] === idx) {
    return;
  }

  const w = quadNode.extent * 2;  // node width

  // Barnes-Hut criterion: is node far enough to approximate?
  if (w * w < THETA_SQ * d2 || quadNode.points.length > 0) {
    // Treat as single body (or leaf: compute directly)
    if (quadNode.points.length > 0) {
      // Leaf: direct calculation for each point
      for (const jIdx of quadNode.points) {
        if (jIdx === idx) continue;
        const other = nodes[jIdx];
        const pdx = other.x - node.x;
        const pdy = other.y - node.y;
        const pd2 = pdx * pdx + pdy * pdy + 1;
        const f = strength / pd2;
        node.vx -= f * pdx / Math.sqrt(pd2);
        node.vy -= f * pdy / Math.sqrt(pd2);
      }
    } else {
      // Internal node: use center of mass
      const f = strength * quadNode.mass / (d2 + 1);
      const invD = 1 / Math.sqrt(d2 + 1);
      node.vx -= f * dx * invD;
      node.vy -= f * dy * invD;
    }
  } else {
    // Node too close: recurse into children
    for (const child of quadNode.children) {
      if (child && child.mass > 0) {
        computeForceOnNode(nodes, idx, child, strength);
      }
    }
  }
}
```

### Assessment for Our Implementation

| Factor | Current (O(N^2)) | Barnes-Hut (O(N log N)) |
|--------|------------------|------------------------|
| 100 nodes | 10,000 ops | ~660 ops |
| 300 nodes | 90,000 ops | ~2,500 ops |
| 500 nodes | 250,000 ops | ~4,500 ops |
| 1000 nodes | 1,000,000 ops | ~10,000 ops |

**Recommendation**: Implement Barnes-Hut if we want to support 500+ nodes. For our current 300-node cap, the speedup is ~36x which would allow:
- Higher frame rates
- More physics iterations per frame
- Room to increase node cap to 1000+

**Estimated complexity**: Medium (2-3 days)
- Quadtree construction: 1 day
- Force calculation with theta: 1 day
- Testing and tuning: 0.5-1 day

---

## 2. WebAssembly Usage

### What They Offload to WASM

The znah/graphs project compiles these computations to WASM:

1. **Octree construction** (`buildOctree`)
   - Morton code computation
   - Quicksort of Morton codes
   - Tree node creation

2. **Center-of-mass accumulation** (`accumPoints`)
   - Bottom-up traversal
   - Mass and COM computation per node

3. **Force calculation** (`calcMultibodyForceDual`)
   - Barnes-Hut traversal
   - Force accumulation
   - Propagation to leaf nodes

4. **Velocity/position integration** (`updateNodes`)
   - Apply forces to velocities
   - Apply velocities to positions
   - Damping

5. **Link spring forces** (`linkForce`)
   - Spring constraint between connected nodes

### Build Process (Zig to WASM)

```bash
FLAGS="-target wasm32-freestanding -DWASM -fno-entry --stack 65536 -O ReleaseSmall"
zig build-exe src/main.c $FLAGS
```

**Key flags:**
- `wasm32-freestanding`: No OS, no libc (minimal binary)
- `-fno-entry`: No main() function, library mode
- `--stack 65536`: 64KB stack (sufficient for recursion)
- `-O ReleaseSmall`: Optimize for size (faster load)

### Memory Management

WASM linear memory with custom allocator:

```c
#define PAGE_SIZE 0x10000  // 64KB WASM pages
extern unsigned char __heap_base;
static int _heap_end = (int)&__heap_base;

void * alloc(int size) {
    int ptr = (_heap_end + 0xf) & ~0xf;  // 16-byte alignment
    _heap_end = ptr + size;

    int pages_needed = (_heap_end + PAGE_SIZE - 1) / PAGE_SIZE;
    int pages_n = __builtin_wasm_memory_size(0);

    if (pages_n < pages_needed) {
        __builtin_wasm_memory_grow(0, pages_needed - pages_n);
    }
    return (void *)ptr;
}
```

### JS-WASM Interface

The `prepareWASM()` function creates a clean API by introspecting WASM exports:

```javascript
function prepareWASM(instance) {
    const type2class = {
        uint8_t: Uint8Array,
        int: Int32Array,
        uint32_t: Uint32Array,
        uint64_t: BigUint64Array,
        float: Float32Array
    };

    const exports = instance.exports;
    const main = {};
    const arrays = {};

    // For each export like "_len_points__float", create typed array accessor
    for (const key in exports) {
        if (key.startsWith('_len_')) {
            const [name, type] = key.slice(5).split('__');
            Object.defineProperty(main, name, {
                enumerable: true,
                get() {
                    // Lazy-create typed array view into WASM memory
                    const ofs = exports['_get_' + name]();
                    const len = exports[key]();
                    if (!ofs) return null;
                    arrays[name] = new (type2class[type])(
                        exports.memory.buffer, ofs, len
                    );
                    return arrays[name];
                }
            });
        } else if (!key.startsWith('_')) {
            main[key] = exports[key];
        }
    }
    return main;
}
```

**Usage in GraphLayout:**

```javascript
class GraphLayout {
    constructor(graph, wasm, dim = 2) {
        this.wasm = prepareWASM(wasm);
        this.pos = this.wasm.points;     // Float32Array view
        this.vel = this.wasm.vel;        // Float32Array view
    }

    chargeForce() {
        const nodeN = this.wasm.buildOctree(pointN, 16, 10);
        this.wasm.accumPoints(nodeN, this.treeExtent);
        this.wasm.calcMultibodyForceDual(pointN, nodeN, this.chargeMaxDist);
        this.wasm.applyChargeForces(pointN, this.chargeStrength);
    }

    tick() {
        this.linkForce();
        this.chargeForce();
        this.wasm.updateNodes(this.pointN, 1.0 - this.velocityDecay);
    }
}
```

### Assessment for Our Implementation

**Benefits:**
- 10-100x faster than equivalent JavaScript for tight loops
- Direct memory access (no GC pauses)
- SIMD potential (float4 operations)

**Costs:**
- Build toolchain setup (Zig/Emscripten/Rust)
- Debugging is harder
- Data marshaling overhead for small workloads
- Binary size (~10-50KB for physics)

**Recommendation**: Not worth it for our current scope. Barnes-Hut in pure JavaScript would give most of the benefit (36x) without the complexity. Consider WASM only if:
- Node count exceeds 2000+
- We need SIMD vectorization
- Physics becomes a measurable bottleneck after Barnes-Hut

**Estimated complexity**: High (1-2 weeks)
- Toolchain setup: 1-2 days
- Port physics to C/Rust: 2-3 days
- JS interface: 1 day
- Testing, debugging: 3-5 days

---

## 3. WebGL Rendering

### SwissGL Library Usage

[SwissGL](https://github.com/nicebyte/swissgl) is a minimalist WebGL wrapper that simplifies shader-based rendering:

```javascript
// Render links as lines
this.glsl({
    ...renderData,
    Grid: [linkN],
    VP: `
        // Vertex shader
        ivec2 link = linksTex(id2xy(ID.x)).xy;
        vec3 p0 = pointsTex(id2xy(link.x)).xyz - center;
        vec3 p1 = pointsTex(id2xy(link.y)).xyz - center;
        vec2 dp = normalize(p1.xy - p0.xy);
        vec2 p = mix(p0, p1, UV.x).xy + vec2(-dp.y, dp.x) * XY.y;
        VPos.xy = 1.9 * p.xy / (extent + 30.);
    `,
    FP: `0.9`  // Fragment shader: constant gray
}, target);

// Render nodes as circles with color mapping
this.glsl({
    ...renderData,
    Grid: [pointN],
    VP: `
        vec4 p = pointsTex(id2xy(ID.x));
        p.xyz -= center;
        varying vec3 color = color_map(p.w / (lastGen + 1.));
        color = min(color, 0.9);
        color *= 1.0 + max(0.0, 1.0 - (lastGen - p.w) / 10.0);
        VPos.xy = 1.9 * (p.xy + XY * 10.0) / (extent + 30.);
    `,
    FP: `vec4(color, 1) * smoothstep(1.0, 0.8, length(XY))`
}, target);
```

**Key techniques:**
- **Grid rendering**: Each node/link is a grid cell
- **Texture lookups**: Node positions stored in textures for GPU access
- **Varying interpolation**: Colors passed from vertex to fragment shader
- **Smoothstep circles**: Soft edges without anti-aliasing

### GLSL Color Mapping

Polynomial color ramp for smooth gradients:

```glsl
vec3 color_map(float t) {
    const vec3 c0 = vec3(0.06, 0.02, 0.54);    // Dark purple
    const vec3 c1 = vec3(2.18, 0.24, 0.75);
    const vec3 c2 = vec3(-2.69, -7.46, 3.11);
    const vec3 c3 = vec3(6.13, 42.35, -28.52);
    const vec3 c4 = vec3(-11.11, -82.67, 60.14);
    const vec3 c5 = vec3(10.02, 71.41, -54.07);
    const vec3 c6 = vec3(-3.66, -22.93, 18.19);

    // 6th-degree polynomial: Horner's method
    return c0 + t*(c1 + t*(c2 + t*(c3 + t*(c4 + t*(c5 + t*c6)))));
}
```

This creates a smooth perceptually-uniform gradient from dark purple through magenta to bright yellow-white.

### Bloom Post-Processing

Multi-scale Gaussian blur with additive composition:

```javascript
class Bloom {
    constructor(glsl, gui) {
        this.bloom = 1.5;
        this.gamma = 2.0;
        this.blurRadius = [3, 5, 7, 9, 11];  // 5 LOD levels

        // Pre-compute Gaussian kernels
        this.kernels = this.blurRadius.map(r => {
            const kernel = [];
            let sum = 0;
            for (let i = 0; i <= r; i++) {
                const w = Math.exp(-5.0 * i * i / r / r);
                kernel.push(w);
                sum += w * (i === 0 ? 1 : 2);
            }
            return kernel.map(w => w / sum);  // Normalize
        });
    }

    compose(frame) {
        // 1. Extract bright areas (threshold)
        const bright = this.glsl({
            T: frame,
            FP: `vec4 c = T(UV); FOut = (c - 0.9) / 0.1;`
        });

        // 2. Downsample + blur at each LOD level
        const lods = [];
        let src = bright;
        for (let i = 0; i < 5; i++) {
            // Horizontal blur
            const h = this.glsl({
                T: src,
                kernel: this.kernels[i],
                FP: `
                    vec4 acc = vec4(0);
                    for (int i = 0; i <= ${this.blurRadius[i]}; i++) {
                        float w = kernel[i];
                        acc += w * (T(UV + vec2(i, 0) * texelSize) +
                                   T(UV - vec2(i, 0) * texelSize));
                    }
                    FOut = acc;
                `
            });
            // Vertical blur
            src = this.glsl({
                T: h,
                kernel: this.kernels[i],
                FP: `/* same but vec2(0, i) */`
            });
            lods.push(src);
        }

        // 3. Composite all levels
        return this.glsl({
            frame,
            L0: lods[0], L1: lods[1], L2: lods[2], L3: lods[3], L4: lods[4],
            bloom: this.bloom,
            gamma: this.gamma,
            FP: `
                vec4 acc = T(UV) + bloom * (L0(UV) + L1(UV) + L2(UV) + L3(UV) + L4(UV));
                FOut = pow(acc, vec4(1.0 / gamma));
            `
        });
    }
}
```

### Batch Rendering Techniques

**Instanced drawing**: Each node/link rendered as an instance
- Node index passed via `ID.x`
- Position looked up from texture
- Single draw call for all nodes

**Texture-based data storage**:
```javascript
// Pack node data into texture
const pointsTex = this.glsl.texture({
    data: new Float32Array(nodes.flatMap(n => [n.x, n.y, n.z, n.generation])),
    format: 'rgba32f',
    width: 256,
    height: Math.ceil(nodes.length / 256)
});
```

### Assessment for Our Implementation

**Canvas 2D Equivalent Optimizations:**

1. **Batch path operations**:
```typescript
// Instead of:
for (const node of nodes) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
    ctx.fill();
}

// Do:
ctx.beginPath();
for (const node of nodes) {
    ctx.moveTo(node.x + 6, node.y);
    ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
}
ctx.fill();  // Single fill call
```

2. **Pre-render bloom layers** (current approach in fractal effects):
```typescript
// Draw multiple passes with increasing size/decreasing alpha
for (let i = 3; i >= 0; i--) {
    ctx.globalAlpha = 0.15 / (i + 1);
    ctx.beginPath();
    for (const node of nodes) {
        ctx.moveTo(node.x + 6 * (1 + i * 0.5), node.y);
        ctx.arc(node.x, node.y, 6 * (1 + i * 0.5), 0, Math.PI * 2);
    }
    ctx.fill();
}
```

3. **Avoid shadow blur** (we already do this):
```typescript
// SLOW: ctx.shadowBlur = 20;
// FAST: Multiple layered fills (as shown above)
```

4. **Color string caching**:
```typescript
// Cache rgba strings instead of computing each frame
class GraphNode {
    color: string;  // Pre-computed "rgba(r,g,b,a)"
    glowColor: string;
}
```

**Recommendation**: WebGL migration would give 10-100x rendering speedup but requires significant architecture change. For Canvas 2D:
- Batch path operations: Easy, 2-5x speedup
- Layered glow: Already implemented
- Color caching: Easy, minor speedup

**Estimated complexity**:
- Canvas 2D optimizations: Low (0.5 day)
- WebGL migration: High (1-2 weeks)

---

## 4. Autonomous Behavior

### Stall Detection

The znah/graphs autonomous mode detects when growth has stopped:

```javascript
handleAutonomousBehavior() {
    if (this.graph.nodes.length === this.prevNodeCount) {
        this.stallTimer += 1;

        // Escalating intervention
        if (this.stallTimer > 50 && this.stallTimer % 20 === 0) {
            // Gradually increase mutation rate
            if (this.graph.flipProb === 0) {
                this.graph.flipProb = 1e-4;
            } else {
                this.graph.flipProb *= 10;
            }
            if (this.graph.flipProb > 0.5) {
                this.graph.flipProb = 0.5;
            }
        }

        // After extended stall, switch rules entirely
        if (this.stallTimer > 200) {
            this.transitioningOut = true;
            this.consecutiveExplosions = 0;
        }
    } else {
        this.stallTimer = 0;
    }

    this.prevNodeCount = this.graph.nodes.length;
}
```

**Escalation timeline:**
1. **Frames 0-50**: Wait and observe
2. **Frames 50-200**: Increase mutation rate (1e-4 → 1e-3 → 1e-2 → 0.5)
3. **Frame 200+**: Transition to new rule

### Rule Switching Logic

```javascript
pickNewRule() {
    const r = Math.random();

    if (r < 0.1) {
        // 10%: Use known good preset
        const randKey = presetKeys[Math.floor(Math.random() * presetKeys.length)];
        Object.assign(this.params, this.presets[randKey]);
    } else if (r < 0.3) {
        // 20%: Random rule from curated list
        this.params.rule = this.rules[Math.floor(Math.random() * this.rules.length)];
        this.params.flipProb = [0.0, 1e-3, 1e-4, 5e-5, 1e-5][Math.floor(Math.random() * 5)];
    } else {
        // 70%: Completely random rule
        let lower = Math.floor(Math.random() * 256);
        let upper = (1 << Math.floor(Math.random() * 8)) |
                   (1 << Math.floor(Math.random() * 8));
        this.params.rule = (upper << 8) | lower;
    }

    this.reset();
}
```

### Transition Effects

Smooth fade between rule changes:

```javascript
handleAutonomousBehavior() {
    if (this.transitioningOut) {
        this.transitionAlpha += 0.05;  // Fade out over 20 frames
        if (this.transitionAlpha >= 1.0) {
            this.pickNewRule();
            this.transitioningOut = false;
        }
    } else if (this.transitionAlpha > 0) {
        this.transitionAlpha -= 0.05;  // Fade in
    }
}

// In render:
ctx.globalAlpha = 1.0 - this.transitionAlpha;
```

### Assessment for Our Implementation

Our Graph Sculpture effect doesn't use autonomous behavior (it's music-driven), but we could apply similar patterns for:

1. **Stall detection for visual interest**:
   - If graph settles (low velocity sum), add a gentle "breathing" motion
   - Detect when melody is sparse, auto-generate decorative nodes

2. **Parameter exploration during silence**:
   - During long rests, cycle through visual variations
   - Return to base state when music resumes

3. **Graceful reset between songs**:
   - Detect song end, fade out current sculpture
   - Start fresh for next song

**Recommendation**: Low priority. Music-driven behavior is more meaningful than autonomous exploration for our use case.

**Estimated complexity**: Low (0.5 day if needed)

---

## 5. Graph Data Structures

### Node Storage

The znah/graphs implementation uses **adjacency lists** stored as arrays:

```javascript
// Each node is an array of 3 neighbor indices
this.nodes = [
    [9, 1, 2],   // node 0 connects to 9, 1, 2
    [0, 2, 4],   // node 1 connects to 0, 2, 4
    [1, 3, 0],   // node 2 connects to 1, 3, 0
    // ...
];

// Binary state per node
this.states = [0, 1, 0, 1, 0, ...];
```

**Why fixed-size triplets?**
- Rule-based rewriting assumes ternary connections
- Simple array access: `node[0]`, `node[1]`, `node[2]`
- Predictable memory layout

### Edge Storage

Edges stored as flattened Int32Array for efficient iteration:

```javascript
updateLinks() {
    const links = [];
    for (let i = 0; i < this.nodes.length; ++i) {
        for (const j of this.nodes[i]) {
            if (i > j) continue;  // Avoid duplicates
            links.push(i, j);
        }
    }
    return new Int32Array(links);
}
```

**Why Int32Array?**
- Direct copy to WASM memory
- No boxing overhead
- Cache-friendly sequential access

### Node Division (Growth)

When nodes divide, connections are rewired:

```javascript
grow() {
    // Phase 1: Identify dividing nodes based on rule
    for (let i = 0; i < nodes.length; i++) {
        if (shouldDivide(nodes[i], rule)) {
            this.dividing[i] = true;
        }
    }

    // Phase 2: Perform divisions
    for (let i = 0; i < this.dividing.length; ++i) {
        if (!this.dividing[i]) continue;

        const [a, b, c] = nodes[i];
        const j = nodes.length;      // First new node index
        const k = j + 1;             // Second new node index

        // Original node keeps first connection, links to both children
        Object.assign(nodes[i], [a, j, k]);

        // First child links to parent + takes second connection
        nodes.push([i, b, k]);

        // Second child links to parent + first child + takes third connection
        nodes.push([i, j, c]);

        // Copy state to children
        states.push(states[i], states[i]);
    }
}
```

**Reconnection helper:**
```javascript
reconnect(source, oldPeer, newPeer) {
    const node = this.nodes[source];
    node[node.indexOf(oldPeer)] = newPeer;
}
```

### Memory Layout Considerations

**Current approach (arrays of objects)**:
```typescript
// Our implementation
interface GraphNode {
    x: number; y: number;
    vx: number; vy: number;
    // ... 10+ fields
}
const nodes: GraphNode[] = [];
```

**Struct-of-Arrays (SoA) alternative**:
```typescript
// More cache-friendly for physics
class GraphNodes {
    x: Float32Array;
    y: Float32Array;
    vx: Float32Array;
    vy: Float32Array;
    // ...

    constructor(capacity: number) {
        this.x = new Float32Array(capacity);
        this.y = new Float32Array(capacity);
        // ...
    }
}
```

**Benefits of SoA:**
- Better cache locality when iterating one field
- Compatible with WASM memory layout
- Easier to pass to Web Workers

**Tradeoffs:**
- More complex indexing
- Harder to add/remove nodes
- Not idiomatic JavaScript

### Assessment for Our Implementation

Our current data structures are adequate for 300 nodes:

```typescript
// Current
interface GraphNode {
    x: number; y: number;
    vx: number; vy: number;
    pitchClass: number;
    // ...
}

interface GraphEdge {
    from: number;
    to: number;
    strength: number;
    // ...
}
```

**Potential optimizations:**

1. **Pre-allocate arrays**:
```typescript
// Reserve capacity to avoid reallocation
const nodes: GraphNode[] = new Array(500);
let nodeCount = 0;
```

2. **Use Int32Array for edges** (matching znah approach):
```typescript
// Flat array: [from0, to0, from1, to1, ...]
const edgeBuffer = new Int32Array(2000);
let edgeCount = 0;

function addEdge(from: number, to: number) {
    edgeBuffer[edgeCount * 2] = from;
    edgeBuffer[edgeCount * 2 + 1] = to;
    edgeCount++;
}
```

3. **Pitch-to-node lookup as array**:
```typescript
// Current: Map<number, number>
// Faster: Array indexed by pitch class
const pitchToNode: number[] = new Array(12).fill(-1);
```

**Recommendation**: Minor optimizations (array pre-allocation, pitch lookup array) are low-effort high-value. SoA refactor only if pursuing WASM.

**Estimated complexity**: Low (0.5 day for quick wins)

---

## Implementation Priority

| Optimization | Speedup | Effort | Priority |
|-------------|---------|--------|----------|
| Barnes-Hut Quadtree | 36x @ 300 nodes | Medium (2-3 days) | **HIGH** |
| Batch Canvas paths | 2-5x rendering | Low (0.5 day) | **HIGH** |
| Color string caching | 1.1-1.2x | Low (0.5 day) | **MEDIUM** |
| Array pre-allocation | 1.2x | Low (0.5 day) | **MEDIUM** |
| Int32Array edges | 1.5x | Low (0.5 day) | **MEDIUM** |
| WebGL rendering | 10-100x | High (1-2 weeks) | LOW |
| WASM physics | 10-100x | High (1-2 weeks) | LOW |
| SoA data layout | 2x | Medium (1-2 days) | LOW |

### Recommended Order

1. **Quick wins** (1 day total):
   - Batch Canvas path operations
   - Pre-allocate node/edge arrays
   - Cache color strings
   - Pitch lookup as array

2. **Barnes-Hut** (2-3 days):
   - Quadtree construction
   - Force calculation with theta
   - Test with 500, 1000, 2000 nodes

3. **Optional scaling** (if needed):
   - WebGL rendering
   - WASM physics core
   - SoA memory layout

---

## References

- [znah/graphs](https://github.com/znah/graphs) - Original implementation
- [Barnes-Hut Algorithm](https://en.wikipedia.org/wiki/Barnes%E2%80%93Hut_simulation) - Wikipedia
- [SwissGL](https://github.com/nicebyte/swissgl) - WebGL wrapper
- [D3 Force Layout](https://d3js.org/d3-force) - Classic JS implementation
- [Morton Codes](https://en.wikipedia.org/wiki/Z-order_curve) - Space-filling curves
