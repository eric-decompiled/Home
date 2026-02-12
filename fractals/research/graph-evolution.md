# Graph Evolution Visualization

Research notes from [znah/graphs](https://github.com/znah/graphs) - a WebAssembly-accelerated graph evolution system.

## Core Concepts

### Rule-Based Graph Rewriting
- Each node has **3 neighbors** (ternary connections) and a **binary state** (0/1)
- A **rule number** (16-bit, e.g., 2182) determines state transitions
- Rules are like cellular automata but on graph topology instead of grid
- Node states computed from: current state + sum of neighbor states

### Evolution Process
Two alternating phases:
1. **Update**: Rules determine new states, mark nodes for division
2. **Growth**: Marked nodes split into two, connections rewired

### Force-Directed Layout
- **Barnes-Hut algorithm** for O(N log N) n-body simulation
- Nodes repel each other (charge)
- Edges act as springs (pull connected nodes together)
- Continuous physics creates organic, breathing motion

## Music Mapping Opportunities

### The Big Idea: Methodical Growth as Song-Length Sculpture

Unlike the znah/graphs demo which explodes quickly, we want **deliberate, mechanical control**:

1. **Start minimal**: Single node or small seed
2. **Each musical event = one operation**: Note adds node, chord adds edge pattern
3. **Slow, visible growth**: Watch the structure emerge over 3-4 minutes
4. **Emergent meaning**: Final structure is unique to the song, not random chaos

Think **bonsai, not explosion** - every cut/addition is intentional.

**Key difference from demo**:
- Demo: 100s of operations per second, chaotic
- Our version: 1-10 operations per beat, deliberate, traceable

### Methodical Growth Mechanics

**Trigger → Operation mapping**:

| Musical Event | Graph Operation | Visual Result |
|---------------|-----------------|---------------|
| **Melody note** | Add node at pitch-angle | New point appears on periphery |
| **Bass note** | Add edge from root to pitch-node | Core structure solidifies |
| **Chord onset** | Add edges between chord-tone nodes | Triangles/clusters form |
| **Drum hit** | Physics impulse (no topology change) | Structure breathes/bounces |
| **Bar downbeat** | Node division (if dense enough) | Branching growth |
| **Phrase end** | Prune weakest edges | Clean up, reveal skeleton |

**Growth rate control**:
```
Notes per bar × bars = total operations
~8 notes/bar × 64 bars = ~500 nodes by song end
```

**The sculpture emerges because**:
- Melody traces a path through pitch-space
- Bass anchors that path to a core
- Chords create local density
- Phrase boundaries prune noise

### Parameter Mappings (Fine-tuning)

| Musical Element | Graph Parameter | Effect |
|-----------------|-----------------|--------|
| **Note onset** | Add node | Growth |
| **Pitch** | Angle on circle | Spatial organization |
| **Velocity** | Node size / edge strength | Visual weight |
| **Chord root** | Hub node | Edges radiate from chord root |
| **Beat phase** | Physics damping | Tight on beat, loose off-beat |
| **Tension** | Edge length rest | High tension = tighter clustering |
| **Key change** | Rotate coordinate system | Smooth transition |
| **Song section** | Growth vs prune mode | Verse=grow, chorus=prune |

### Visual Arc of a Song

**0:00 - Intro** (bars 1-8)
- Single seed node pulses
- First melody notes: 3-5 nodes appear, floating
- First bass: edges connect to center
- *Visual: sparse constellation*

**0:30 - Verse 1** (bars 9-24)
- Steady node accumulation from melody
- Bass creates radial structure from root
- Chords add triangular clusters
- *Visual: growing snowflake*

**1:00 - Chorus 1** (bars 25-40)
- Higher note density = faster growth
- More chord edges = denser clusters
- Phrase boundaries prune weak edges
- *Visual: organic branching, tree-like*

**2:00 - Bridge** (bars 41-56)
- Key change rotates structure
- New harmonic center emerges
- Cross-connections between old and new
- *Visual: two-centered structure*

**3:00 - Final Chorus** (bars 57-72)
- Maximum density reached
- Pruning reveals final skeleton
- Physics settles to stable configuration
- *Visual: complete sculpture, breathing gently*

**3:30 - Outro**
- No new nodes, only physics
- Structure slowly expands, relaxes
- Fade to stillness
- *Visual: final form, crystallized*

## Implementation Notes

### From znah/graphs

```javascript
// Rule-based state calculation
function calcCases(nodes) {
  for (const n of nodes) {
    let sum = 0;
    for (const neighbor of n.neighbors) {
      sum += neighbor.state;
    }
    n.case = (n.state << 3) | sum;  // 4-bit case encoding
  }
}

// Apply rule to determine new state
function applyRule(rule, caseValue) {
  return (rule >> caseValue) & 1;
}
```

### Autonomous Mode Insights
- **Stall detection**: If no growth for 50 frames, increase mutation
- **Rule switching**: After 200 frames stalled, try new rule
- **Success metrics**: Sustained growth = good rule

### Performance
- WASM for physics (Barnes-Hut tree)
- WebGL for rendering (handles 10,000+ nodes)
- Could adapt to Canvas 2D with simpler graphs (<1000 nodes)

## Adaptation for Fractured Jukebox

### Simplified Canvas 2D Version

```typescript
interface GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: 0 | 1;
  neighbors: number[];  // indices
}

interface MusicGraph {
  nodes: GraphNode[];
  edges: [number, number][];
  rule: number;
}

// Music triggers edge removal
function onNoteOn(graph: MusicGraph, note: number, velocity: number) {
  const numToRemove = Math.ceil(velocity / 32);  // 1-4 edges
  const targetRegion = note / 127;  // 0-1, maps to graph region

  for (let i = 0; i < numToRemove; i++) {
    const edgeIdx = selectEdgeInRegion(graph, targetRegion);
    if (edgeIdx >= 0) {
      graph.edges.splice(edgeIdx, 1);
    }
  }
}

// Simple force-directed step
function physicsStep(graph: MusicGraph, dt: number) {
  const repulsion = 1000;
  const springK = 0.1;
  const damping = 0.9;

  // Repulsion between all nodes (O(n²) - ok for small graphs)
  for (let i = 0; i < graph.nodes.length; i++) {
    for (let j = i + 1; j < graph.nodes.length; j++) {
      const dx = graph.nodes[j].x - graph.nodes[i].x;
      const dy = graph.nodes[j].y - graph.nodes[i].y;
      const d2 = dx * dx + dy * dy + 1;
      const f = repulsion / d2;
      const fx = f * dx / Math.sqrt(d2);
      const fy = f * dy / Math.sqrt(d2);
      graph.nodes[i].vx -= fx;
      graph.nodes[i].vy -= fy;
      graph.nodes[j].vx += fx;
      graph.nodes[j].vy += fy;
    }
  }

  // Spring forces along edges
  for (const [a, b] of graph.edges) {
    const dx = graph.nodes[b].x - graph.nodes[a].x;
    const dy = graph.nodes[b].y - graph.nodes[a].y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const f = springK * (d - 50);  // rest length 50
    graph.nodes[a].vx += f * dx / d;
    graph.nodes[a].vy += f * dy / d;
    graph.nodes[b].vx -= f * dx / d;
    graph.nodes[b].vy -= f * dy / d;
  }

  // Integration
  for (const n of graph.nodes) {
    n.vx *= damping;
    n.vy *= damping;
    n.x += n.vx * dt;
    n.y += n.vy * dt;
  }
}
```

### Starting Structures

1. **Complete Graph (K_n)**: All nodes connected - dense start, reveal structure by removing
2. **Random Graph**: Erdős–Rényi with probability p
3. **Grid/Lattice**: Regular structure that becomes organic
4. **Tree**: Hierarchical, music prunes branches
5. **Ring + Spokes**: Circular with radial connections

### Visual Style Options

- **Nodes**: Circles, size by degree (connection count)
- **Edges**: Lines with alpha based on age/importance
- **Color**: By state, by degree, by cluster
- **Bloom**: Glow effect on high-degree nodes
- **Trail**: Ghost previous positions during rapid change

## Questions for Further Research

1. What graph invariants are musically meaningful? (Clustering coefficient, diameter, connectivity)
2. Can we reverse-engineer a rule from a target structure?
3. How to handle very long songs without graph explosion?
4. Should removed edges "heal" during quiet sections?
5. Can graph structure influence the music (bidirectional)?

## Implementation

The Graph Sculpture effect is implemented in `src/effects/graph-sculpture.ts`.

### Core Mechanics

**Node Creation**:
- All voice onsets create nodes (debounced: 1 per pitch class per bar)
- Nodes tracked by register: bass (<C3), mid (C3-B4), melody (C5+)
- Max 2000 nodes (configurable up to 4000)

**Melody Chain**:
- Sequential melody notes connect as a chain (spine of the sculpture)
- Creates a clear temporal thread through the structure
- Melody chain edges are slightly stronger than Tonnetz edges

**Time-Windowed Tonnetz**:
- Edges only form between perfect 4ths/5ths (intervals 5, 7 semitones)
- Thirds removed to reduce connection density
- **Time window**: Nodes must be born within 1 bar of each other
- Creates local harmonic clusters without distant tangles

**Harmonic Affinity Physics**:
```typescript
// Like repels like (unison creates spacing)
if (interval === 0) affinity = 1.8;       // unison - spread out
// Consonant intervals reduce repulsion (attract)
else if (interval === 5 || interval === 7) affinity = 0.5;  // P4/P5
else if (interval === 3 || interval === 4) affinity = 0.7;  // thirds
// Dissonant intervals increase repulsion
else if (interval === 1) affinity = 1.4;  // minor 2nd
else if (interval === 2) affinity = 1.2;  // major 2nd
else if (interval === 6) affinity = 1.5;  // tritone
```

**Register Gravity**:
- Bass nodes sink downward (gravity pull)
- Melody nodes rise upward (anti-gravity)
- Mid register floats freely
- Creates natural vertical stratification

**Lure Drag**:
- Oldest node is pulled rightward at BPM-scaled speed
- Structure trails behind like a fishing lure through water
- Auto-zoom follows the drifting graph (only zooms out, never in)

**Visual Rendering**:
- Curved edges with subtle bezier bow
- Soft outer glow + solid core on edges
- Nodes rendered as layered circles with bright cores
- "Live" nodes (< 4 bars old) have brighter, white-hot centers
- Disconnected nodes fade out after 4-bar TTL
- Kick drums create subtle outward physics impulse

### Physics Parameters (tuned values)
```typescript
repulsion = 2200;      // Strong to prevent knots and create spacing
springK = 0.008;       // Soft springs
springRest = 120;      // Rest length for spacing
damping = 0.82;        // High friction, smooth motion
centerPull = 0.0003;   // Minimal centering
```

### Config Options
- **Connect Window (bars)**: Time window for Tonnetz connections (default 1)
- **Max Nodes**: Maximum nodes before oldest are pruned (default 2000)
- **Node Size**: Base node radius (default 3)
- **Edge Width**: Base edge thickness (default 1.0)
- **Glow**: Intensity of glow effects (default 1.0)

## References

- [znah/graphs](https://github.com/znah/graphs) - Original project by Alexander Mordvintsev
  - WebAssembly-accelerated force-directed layout
  - Rule-based graph rewriting (like cellular automata on graphs)
  - Barnes-Hut O(N log N) n-body simulation
  - See `research/znah-graphs-optimizations.md` for performance analysis
- [D3 Force Layout](https://d3js.org/d3-force) - Classic JS implementation
- [Barnes-Hut Algorithm](https://en.wikipedia.org/wiki/Barnes%E2%80%93Hut_simulation) - O(N log N) n-body
- [Graph Rewriting](https://en.wikipedia.org/wiki/Graph_rewriting) - Formal theory
