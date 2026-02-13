// --- Graph Chain Effect ---
// A force-directed graph that grows methodically with the music.
// Melody notes add nodes, Tonnetz neighbors get edges.
// By song's end, a unique chain has emerged.
//
// Inspired by: https://github.com/znah/graphs
// - Rule-based graph evolution with force-directed layout
// - Barnes-Hut algorithm (O(N log N)) for n-body simulation
// - WebAssembly + WebGL for performance
//
// This implementation uses simpler O(n²) physics suitable for <500 nodes,
// with music-driven growth instead of rule-based rewriting.
// See: research/graph-evolution.md for detailed design notes.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { samplePaletteColor } from './effect-utils.ts';

// Register categories for hierarchical connections
type Register = 'bass' | 'mid' | 'melody';

function getRegister(midi: number): Register {
  if (midi < 48) return 'bass';      // Below C3
  if (midi < 72) return 'mid';       // C3 to B4
  return 'melody';                    // C5 and above
}

interface GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  pitchClass: number;
  midi: number;
  register: Register;   // bass/mid/melody for hierarchical connections
  birth: number;        // time created
  birthBar: number;     // bar index when created
  strength: number;     // accumulated importance (hit count)
  brightness: number;   // current visual brightness
  lastConnectedBar: number;  // bar index when last connected
  fadeOut: number;      // 0 = solid, 1 = fully faded
  r: number;
  g: number;
  b: number;
}

interface GraphEdge {
  from: number;  // node index
  to: number;    // node index
  strength: number;
  birth: number;
  lastActive: number;
}

export class GraphChainEffect implements VisualEffect {
  readonly id = 'graph-chain';
  readonly name = 'Graph Chain';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'screen';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  private nodes: GraphNode[] = [];
  private edges: GraphEdge[] = [];
  private time = 0;

  // Track which pitch classes have nodes (for edge creation)
  private pitchToNodeIdx: Map<number, number> = new Map();

  // Physics parameters - tuned for calm, spread-out structure
  private repulsion = 2200;     // strong repulsion to prevent knots
  private springK = 0.008;      // soft springs
  private springRest = 120;     // rest length for spacing
  private damping = 0.82;       // high friction, smooth motion
  private centerPull = 0.0003;  // minimal centering

  // Config
  private nodeSize = 3;          // delicate nodes
  private edgeWidth = 1.0;       // visible but elegant
  private glowIntensity = 1.0;

  // Auto-zoom state
  private currentScale = 1;
  private targetScale = 1;
  private viewCenterX = 0;
  private viewCenterY = 0;

  // State tracking
  private lastChordRoot = -1;
  private awake = false;
  private lastMelodyNodeIdx = -1;  // For melody chain

  // Time window for Tonnetz connections (bars)
  private tonnetzWindowBars = 1;

  // Debounce: only one node per pitch class per half-bar
  private pitchSpawnedThisBar: Set<string> = new Set();  // "register:pc" keys
  private lastBarIndex = -1;
  private lastHalfBarIndex = -1;

  // Spatial hash grid for O(1) neighbor lookups instead of O(n²)
  private spatialCellSize = 300;  // Same as repulsion cutoff
  private spatialGrid: Map<number, number[]> = new Map();  // cellKey -> node indices
  private spatialCols = 0;
  private spatialRows = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  /** Build spatial hash grid for current node positions */
  private buildSpatialGrid(): void {
    this.spatialGrid.clear();
    this.spatialCols = Math.ceil(this.width / this.spatialCellSize);
    this.spatialRows = Math.ceil(this.height / this.spatialCellSize);

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const col = Math.floor(node.x / this.spatialCellSize);
      const row = Math.floor(node.y / this.spatialCellSize);
      // Clamp to grid bounds (nodes can be outside canvas)
      const clampedCol = Math.max(0, Math.min(this.spatialCols - 1, col));
      const clampedRow = Math.max(0, Math.min(this.spatialRows - 1, row));
      const key = clampedRow * this.spatialCols + clampedCol;

      let cell = this.spatialGrid.get(key);
      if (!cell) {
        cell = [];
        this.spatialGrid.set(key, cell);
      }
      cell.push(i);
    }
  }

  /** Get all node indices in cell and 8 adjacent cells */
  private getNearbyCells(col: number, row: number): number[][] {
    const cells: number[][] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const c = col + dc;
        const r = row + dr;
        if (c >= 0 && c < this.spatialCols && r >= 0 && r < this.spatialRows) {
          const cell = this.spatialGrid.get(r * this.spatialCols + c);
          if (cell && cell.length > 0) {
            cells.push(cell);
          }
        }
      }
    }
    return cells;
  }

  init(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ready = true;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  private addNode(midi: number, velocity: number): number {
    const pc = midi % 12;
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Simple spawn near center with slight randomness
    const radius = 50 + Math.random() * 100;
    const angle = Math.random() * Math.PI * 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    const color = samplePaletteColor(pc, 0.8);

    const node: GraphNode = {
      x, y,
      vx: 0, vy: 0,
      pitchClass: pc,
      midi,
      register: getRegister(midi),
      birth: this.time,
      birthBar: this.lastBarIndex,
      strength: velocity,
      brightness: 1,
      lastConnectedBar: this.lastBarIndex,
      fadeOut: 0,
      r: color[0], g: color[1], b: color[2],
    };

    const idx = this.nodes.length;
    this.nodes.push(node);
    this.pitchToNodeIdx.set(pc, idx);

    // Melody chain: connect sequential melody notes
    if (node.register === 'melody' && this.lastMelodyNodeIdx >= 0) {
      this.addMelodyChainEdge(this.lastMelodyNodeIdx, idx);
    }
    if (node.register === 'melody') {
      this.lastMelodyNodeIdx = idx;
    }

    return idx;
  }

  // Special edge for melody chain - bypasses register restriction
  private addMelodyChainEdge(fromIdx: number, toIdx: number): void {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    if (fromIdx >= this.nodes.length || toIdx >= this.nodes.length) return;

    // Check if edge already exists
    for (const edge of this.edges) {
      if ((edge.from === fromIdx && edge.to === toIdx) ||
          (edge.from === toIdx && edge.to === fromIdx)) {
        edge.strength += 0.5;
        edge.lastActive = this.time;
        return;
      }
    }

    this.edges.push({
      from: fromIdx,
      to: toIdx,
      strength: 1.5,  // Stronger than regular edges
      birth: this.time,
      lastActive: this.time,
    });
  }

  private removeNode(idx: number): void {
    const node = this.nodes[idx];
    this.pitchToNodeIdx.delete(node.pitchClass);

    // Remove edges connected to this node
    this.edges = this.edges.filter(e => e.from !== idx && e.to !== idx);

    // Update edge indices
    for (const edge of this.edges) {
      if (edge.from > idx) edge.from--;
      if (edge.to > idx) edge.to--;
    }

    // Update pitch map indices
    for (const [pc, nodeIdx] of this.pitchToNodeIdx) {
      if (nodeIdx > idx) {
        this.pitchToNodeIdx.set(pc, nodeIdx - 1);
      }
    }

    // Update lastMelodyNodeIdx
    if (this.lastMelodyNodeIdx === idx) {
      this.lastMelodyNodeIdx = -1;
    } else if (this.lastMelodyNodeIdx > idx) {
      this.lastMelodyNodeIdx--;
    }

    this.nodes.splice(idx, 1);
  }

  // Check if two pitch classes are strongly related (perfect intervals only)
  private areTonnetzNeighbors(pc1: number, pc2: number): boolean {
    const interval = Math.abs(pc1 - pc2);
    const normalizedInterval = Math.min(interval, 12 - interval);
    // Only perfect intervals: perfect 4th (5), perfect 5th (7)
    // Thirds create too many connections
    return normalizedInterval === 5 || normalizedInterval === 7;
  }

  private addEdge(fromIdx: number, toIdx: number): void {
    if (fromIdx === toIdx) return;
    if (fromIdx < 0 || toIdx < 0) return;
    if (fromIdx >= this.nodes.length || toIdx >= this.nodes.length) return;

    const fromNode = this.nodes[fromIdx];
    const toNode = this.nodes[toIdx];

    // Time-windowed connections: only connect nodes born within N bars of each other
    // This creates temporal locality - notes cluster with their contemporaries
    const birthDiff = Math.abs(fromNode.birthBar - toNode.birthBar);
    if (birthDiff > this.tonnetzWindowBars) return;

    // Mark both nodes as connected
    if (this.nodes[fromIdx]) this.nodes[fromIdx].lastConnectedBar = this.lastBarIndex;
    if (this.nodes[toIdx]) this.nodes[toIdx].lastConnectedBar = this.lastBarIndex;

    // Check if edge already exists
    for (const edge of this.edges) {
      if ((edge.from === fromIdx && edge.to === toIdx) ||
          (edge.from === toIdx && edge.to === fromIdx)) {
        edge.strength += 0.3;
        edge.lastActive = this.time;
        return;
      }
    }

    this.edges.push({
      from: fromIdx,
      to: toIdx,
      strength: 1,
      birth: this.time,
      lastActive: this.time,
    });
  }

  private physicsStep(dt: number): void {
    const n = this.nodes.length;
    if (n === 0) return;

    const cx = this.width / 2;
    const cy = this.height / 2;

    // Cap dt to prevent instability
    dt = Math.min(dt, 0.05);

    // Repulsion between nearby nodes, modulated by harmonic interval
    // Consonant intervals (thirds, fourths, fifths) attract slightly
    // Dissonant intervals (seconds, tritone, sevenths) repel more
    // Optimization: spatial hash grid for O(n) instead of O(n²)
    const repulsionCutoff2 = 90000;  // d=300, force ~25x weaker than at min distance

    // Build spatial grid for fast neighbor lookup
    this.buildSpatialGrid();

    for (let i = 0; i < n; i++) {
      const ni = this.nodes[i];
      const col = Math.floor(ni.x / this.spatialCellSize);
      const row = Math.floor(ni.y / this.spatialCellSize);
      const clampedCol = Math.max(0, Math.min(this.spatialCols - 1, col));
      const clampedRow = Math.max(0, Math.min(this.spatialRows - 1, row));

      // Check only nodes in nearby cells
      const nearbyCells = this.getNearbyCells(clampedCol, clampedRow);
      for (const cell of nearbyCells) {
        for (const j of cell) {
          if (j <= i) continue;  // Only process each pair once (j > i)

          const nj = this.nodes[j];
          const dx = nj.x - ni.x;
          const dy = nj.y - ni.y;
          const d2Raw = dx * dx + dy * dy;

          // Skip if beyond cutoff - force contribution is negligible
          if (d2Raw > repulsionCutoff2) continue;

          // Min distance of 20 prevents explosive forces when nodes spawn on top of each other
          const d2 = Math.max(400, d2Raw);  // 400 = 20^2
          const d = Math.sqrt(d2);

          // Calculate interval between pitch classes
          const interval = Math.abs(ni.pitchClass - nj.pitchClass);
          const normalizedInterval = Math.min(interval, 12 - interval);

          // Harmonic affinity: consonant = attract (< 1), dissonant/same = repel (> 1)
          let affinity = 1.0;
          if (normalizedInterval === 0) affinity = 1.8;       // unison - like repels like
          else if (normalizedInterval === 5) affinity = 0.5;  // perfect 4th - attract
          else if (normalizedInterval === 7) affinity = 0.5;  // perfect 5th - attract
          else if (normalizedInterval === 3) affinity = 0.7;  // minor 3rd - mild attract
          else if (normalizedInterval === 4) affinity = 0.7;  // major 3rd - mild attract
          else if (normalizedInterval === 1) affinity = 1.4;  // minor 2nd - repel
          else if (normalizedInterval === 2) affinity = 1.2;  // major 2nd - mild repel
          else if (normalizedInterval === 6) affinity = 1.5;  // tritone - strong repel

          const f = this.repulsion * affinity / d2;
          const fx = f * dx / d;
          const fy = f * dy / d;
          ni.vx -= fx;
          ni.vy -= fy;
          nj.vx += fx;
          nj.vy += fy;
        }
      }
    }

    // Spring forces along edges
    for (const edge of this.edges) {
      const ni = this.nodes[edge.from];
      const nj = this.nodes[edge.to];
      if (!ni || !nj) continue;

      const dx = nj.x - ni.x;
      const dy = nj.y - ni.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = this.springK * (d - this.springRest) * edge.strength;
      const fx = f * dx / d;
      const fy = f * dy / d;
      ni.vx += fx;
      ni.vy += fy;
      nj.vx -= fx;
      nj.vy -= fy;
    }

    // Center pull (weak, keeps graph centered horizontally)
    for (const node of this.nodes) {
      node.vx += (cx - node.x) * this.centerPull;
      // Vertical center pull only for mid register
      if (node.register === 'mid') {
        node.vy += (cy - node.y) * this.centerPull;
      }
    }

    // Register gravity: bass sinks, melody rises, mid floats
    const gravity = 0.15;
    for (const node of this.nodes) {
      if (node.register === 'bass') {
        node.vy += gravity;  // Pull down
      } else if (node.register === 'melody') {
        node.vy -= gravity;  // Pull up
      }
      // Mid: no gravity, floats freely
    }

    // Integration with damping and velocity cap
    const maxVelocity = 15;  // Prevent explosive motion when nodes spawn on top of each other
    for (const node of this.nodes) {
      node.vx *= this.damping;
      node.vy *= this.damping;

      // Cap velocity to prevent chaos from high repulsion
      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed > maxVelocity) {
        const scale = maxVelocity / speed;
        node.vx *= scale;
        node.vy *= scale;
      }

      node.x += node.vx * dt * 60;
      node.y += node.vy * dt * 60;

      // No bounds - auto-zoom will follow the graph
    }
  }

  update(dt: number, music: MusicParams): void {
    this.time += dt;

    if (!this.awake) {
      if (music.currentTime > 0.1) this.awake = true;
      else return;
    }

    // === HALF-BAR TRACKING: Reset debounce every half-bar for faster arpeggios ===
    const beatsElapsed = music.currentTime / music.beatDuration;
    const currentHalfBar = Math.floor(beatsElapsed / (music.beatsPerBar / 2));
    const currentBar = Math.floor(beatsElapsed / music.beatsPerBar);

    if (currentHalfBar !== this.lastHalfBarIndex) {
      this.pitchSpawnedThisBar.clear();
      this.lastHalfBarIndex = currentHalfBar;
    }
    if (currentBar !== this.lastBarIndex) {
      this.lastBarIndex = currentBar;
    }

    // === ALL VOICES: Add nodes for note onsets (debounced per pitch class per half-bar) ===
    for (const voice of music.activeVoices) {
      if (!voice.onset) continue;
      if (voice.midi < 21 || voice.midi > 108) continue;  // Piano range

      const pc = voice.midi % 12;
      const register = getRegister(voice.midi);

      // Debounce: only one node per pitch class per register per bar
      // This allows bass C, mid C, and melody C to all spawn in same bar
      const spawnKey = `${register}:${pc}`;
      if (this.pitchSpawnedThisBar.has(spawnKey)) continue;
      this.pitchSpawnedThisBar.add(spawnKey);

      const idx = this.addNode(voice.midi, voice.velocity);
      const newNode = this.nodes[idx];

      // Connect to Tonnetz neighbors within time window
      for (const [otherPc, otherIdx] of this.pitchToNodeIdx) {
        if (otherIdx !== idx && this.areTonnetzNeighbors(pc, otherPc)) {
          const otherNode = this.nodes[otherIdx];
          if (otherNode) {
            const birthDiff = Math.abs(newNode.birthBar - otherNode.birthBar);
            if (birthDiff <= this.tonnetzWindowBars) {
              this.addEdge(otherIdx, idx);
            }
          }
        }
      }
    }

    // === CHORDS: Reinforce Tonnetz connections on chord changes ===
    // (New nodes already connect to Tonnetz neighbors above, but chord changes
    // can strengthen existing edges between chord tones)
    if (music.chordRoot >= 0 && music.chordRoot !== this.lastChordRoot) {
      const root = music.chordRoot;

      // Define chord tones based on quality
      let intervals = [0, 4, 7]; // major
      if (music.chordQuality.includes('m') && !music.chordQuality.includes('maj')) {
        intervals = [0, 3, 7]; // minor
      } else if (music.chordQuality.includes('dim')) {
        intervals = [0, 3, 6]; // diminished
      } else if (music.chordQuality.includes('7')) {
        intervals.push(10); // dominant 7
      }

      // Strengthen edges between chord tones (they're already Tonnetz neighbors)
      const chordNodes: number[] = [];
      for (const interval of intervals) {
        const pc = (root + interval) % 12;
        const idx = this.pitchToNodeIdx.get(pc);
        if (idx !== undefined) chordNodes.push(idx);
      }

      for (let i = 0; i < chordNodes.length; i++) {
        for (let j = i + 1; j < chordNodes.length; j++) {
          this.addEdge(chordNodes[i], chordNodes[j]);
        }
      }

      this.lastChordRoot = music.chordRoot;
    }

    // === DRUMS: Subtle physics impulse ===
    if (music.kick) {
      // Gentle push outward on kick
      const cx = this.width / 2;
      const cy = this.height / 2;
      for (const node of this.nodes) {
        const dx = node.x - cx;
        const dy = node.y - cy;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        node.vx += dx / d * 0.5;
        node.vy += dy / d * 0.5;
      }
    }

    // === LURE DRAG: Pull the root through space, structure trails behind ===
    // The oldest node is the "lure" - drag it based on BPM
    // The rest of the graph follows via spring connections
    // Auto-zoom will keep everything in view
    if (this.nodes.length > 0) {
      const root = this.nodes[0];  // Oldest node is the lure

      // Drag speed based on BPM (faster music = faster drag)
      const bpm = 60 / music.beatDuration;
      const dragSpeed = bpm * 0.012;

      // Pull root to the right
      root.vx += dragSpeed;
    }

    // === PHYSICS ===
    this.physicsStep(dt);

    // === DECAY ===
    for (const node of this.nodes) {
      node.brightness *= Math.exp(-0.5 * dt);
    }
    // Edges persist - only removed when nodes are removed
    // No decay, no filtering by strength

    // === DISCONNECTED NODE FADE ===
    // Find which nodes have edges
    const connectedNodes = new Set<number>();
    for (const edge of this.edges) {
      connectedNodes.add(edge.from);
      connectedNodes.add(edge.to);
    }

    const ttlBars = 4;  // survive 4 bars without connection
    const fadeBars = 1; // fade out over 1 bar

    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      const isConnected = connectedNodes.has(i);

      if (isConnected) {
        // Reset fade if reconnected
        node.fadeOut = 0;
        node.lastConnectedBar = this.lastBarIndex;
      } else {
        // Calculate bars since last connected
        const barsSinceConnected = this.lastBarIndex - node.lastConnectedBar;

        if (barsSinceConnected > ttlBars) {
          // Start/continue fading
          const fadeProgress = (barsSinceConnected - ttlBars) / fadeBars;
          node.fadeOut = Math.min(1, fadeProgress);

          // Remove fully faded nodes
          if (node.fadeOut >= 1) {
            this.removeNode(i);
          }
        }
      }
    }
  }

  render(): HTMLCanvasElement {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (this.nodes.length === 0) return this.canvas;

    // === AUTO-ZOOM: Fit all nodes in view ===
    if (this.nodes.length > 2) {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      for (const node of this.nodes) {
        minX = Math.min(minX, node.x);
        maxX = Math.max(maxX, node.x);
        minY = Math.min(minY, node.y);
        maxY = Math.max(maxY, node.y);
      }

      const padding = 80;
      const contentW = maxX - minX + padding * 2;
      const contentH = maxY - minY + padding * 2;
      const contentCx = (minX + maxX) / 2;
      const contentCy = (minY + maxY) / 2;

      const scaleX = this.width / contentW;
      const scaleY = this.height / contentH;
      let neededScale = Math.min(scaleX, scaleY, 1.5);  // cap zoom-in at 1.5x
      neededScale = Math.max(neededScale, 0.3); // cap zoom-out at 0.3x

      // One-directional zoom: only zoom OUT, never back in
      // This prevents jarring zoom-in when lone nodes are pruned
      if (neededScale < this.targetScale) {
        this.targetScale = neededScale;
      }

      // Smooth interpolation
      this.currentScale += (this.targetScale - this.currentScale) * 0.05;
      this.viewCenterX += (contentCx - this.viewCenterX) * 0.05;
      this.viewCenterY += (contentCy - this.viewCenterY) * 0.05;
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Apply zoom transform
    const cx = this.width / 2;
    const cy = this.height / 2;
    ctx.translate(cx, cy);
    ctx.scale(this.currentScale, this.currentScale);
    ctx.translate(-this.viewCenterX, -this.viewCenterY);

    // === DRAW EDGES ===
    ctx.lineCap = 'round';
    for (const edge of this.edges) {
      const n0 = this.nodes[edge.from];
      const n1 = this.nodes[edge.to];
      if (!n0 || !n1) continue;

      const alpha = Math.min(edge.strength * 0.6, 0.95) * this.glowIntensity;
      const fadeAlpha = alpha * (1 - n0.fadeOut * 0.3) * (1 - n1.fadeOut * 0.3);
      if (fadeAlpha < 0.02) continue;

      // Average color (fast bitwise)
      const mr = (n0.r + n1.r) >> 1;
      const mg = (n0.g + n1.g) >> 1;
      const mb = (n0.b + n1.b) >> 1;

      // Subtle curve
      const midX = (n0.x + n1.x) * 0.5;
      const midY = (n0.y + n1.y) * 0.5;
      const dx = n1.x - n0.x;
      const dy = n1.y - n0.y;
      const cpX = midX - dy * 0.08;
      const cpY = midY + dx * 0.08;

      // Outer glow
      ctx.beginPath();
      ctx.moveTo(n0.x, n0.y);
      ctx.quadraticCurveTo(cpX, cpY, n1.x, n1.y);
      ctx.strokeStyle = `rgba(${mr},${mg},${mb},${(fadeAlpha * 0.2).toFixed(3)})`;
      ctx.lineWidth = this.edgeWidth * 3.5;
      ctx.stroke();

      // Core
      ctx.beginPath();
      ctx.moveTo(n0.x, n0.y);
      ctx.quadraticCurveTo(cpX, cpY, n1.x, n1.y);
      ctx.strokeStyle = `rgba(${mr},${mg},${mb},${(fadeAlpha * 0.85).toFixed(3)})`;
      ctx.lineWidth = this.edgeWidth;
      ctx.stroke();
    }

    // === DRAW NODES ===
    const maxLiveAge = 4;  // Nodes < 4 bars old are "live" and can form connections
    for (const node of this.nodes) {
      const fadeMultiplier = 1 - node.fadeOut;  // 1 = solid, 0 = invisible

      // Live nodes (can still form connections) glow brighter
      const nodeAge = this.lastBarIndex - node.birthBar;
      const isLive = nodeAge <= maxLiveAge;
      const liveBoost = isLive ? 1.2 : 1.0;

      // Register-based appearance
      let registerSize = 1.0;
      let registerBrightness = 1.0;
      if (node.register === 'bass') {
        registerSize = 1.6;
        registerBrightness = 0.7;
      } else if (node.register === 'melody') {
        registerSize = 0.8;
        registerBrightness = 1.4;
      }

      const alpha = (0.4 + node.brightness * 0.6) * fadeMultiplier * liveBoost * registerBrightness;
      if (alpha < 0.02) continue;

      const size = this.nodeSize * registerSize;

      // Outer glow
      ctx.beginPath();
      ctx.arc(node.x, node.y, size * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${node.r},${node.g},${node.b},${(alpha * 0.15 * this.glowIntensity).toFixed(3)})`;
      ctx.fill();

      // Mid glow
      ctx.beginPath();
      ctx.arc(node.x, node.y, size * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${node.r},${node.g},${node.b},${(alpha * 0.4 * this.glowIntensity).toFixed(3)})`;
      ctx.fill();

      // Bright core
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
      const coreR = isLive ? Math.min(255, node.r + 80) : Math.min(255, node.r + 40);
      const coreG = isLive ? Math.min(255, node.g + 80) : Math.min(255, node.g + 40);
      const coreB = isLive ? Math.min(255, node.b + 80) : Math.min(255, node.b + 40);
      ctx.fillStyle = `rgba(${coreR},${coreG},${coreB},${(alpha * 0.9).toFixed(3)})`;
      ctx.fill();
    }

    ctx.restore();
    return this.canvas;
  }

  isReady(): boolean { return this.ready; }

  dispose(): void {
    this.ready = false;
    this.nodes = [];
    this.edges = [];
    this.pitchToNodeIdx.clear();
    this.pitchSpawnedThisBar.clear();
    this.lastBarIndex = -1;
    this.lastHalfBarIndex = -1;
    this.lastMelodyNodeIdx = -1;
    // Reset zoom for fresh start
    this.currentScale = 1;
    this.targetScale = 1;
    this.awake = false;
    this.lastChordRoot = -1;
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'tonnetzWindowBars', label: 'Connect Window (bars)', type: 'range', value: this.tonnetzWindowBars, min: 1, max: 8, step: 1 },
      { key: 'nodeSize', label: 'Node Size', type: 'range', value: this.nodeSize, min: 2, max: 10, step: 0.5 },
      { key: 'edgeWidth', label: 'Edge Width', type: 'range', value: this.edgeWidth, min: 0.3, max: 3, step: 0.1 },
      { key: 'glowIntensity', label: 'Glow', type: 'range', value: this.glowIntensity, min: 0.2, max: 1.5, step: 0.1 },
    ];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return {
      tonnetzWindowBars: 1,
      nodeSize: 3,
      edgeWidth: 1.0,
      glowIntensity: 1.0,
    };
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'tonnetzWindowBars') this.tonnetzWindowBars = value as number;
    if (key === 'nodeSize') this.nodeSize = value as number;
    if (key === 'edgeWidth') this.edgeWidth = value as number;
    if (key === 'glowIntensity') this.glowIntensity = value as number;
  }
}
