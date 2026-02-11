/**
 * GRA Configuration Panel
 *
 * Interactive editor for Graph Rewriting Automata rules and parameters.
 * Experiment with different rules, seed graphs, and physics settings.
 */

// --- Constants ---

const CANVAS_SIZE = 600;
const PC_COLORS = ['#ff6b6b', '#ff9f43', '#feca57', '#48dbfb', '#1dd1a1', '#00d2d3', '#54a0ff', '#5f27cd', '#a55eea', '#fd79a8', '#e84393', '#d63031'];

const RULE_PRESETS = [
  { rule: 2182, name: 'Balanced', desc: 'Stable growth with periodic structure' },
  { rule: 2238, name: 'Organic', desc: 'Natural branching patterns' },
  { rule: 549, name: 'Sparse', desc: 'Minimal division, state cycling' },
  { rule: 2199, name: 'Dense', desc: 'Rapid expansion, tight clusters' },
  { rule: 1638, name: 'Symmetric', desc: 'Mirror-like structures' },
  { rule: 4095, name: 'Chaos', desc: 'Maximum growth and state changes' },
];

const SEED_GRAPHS = [
  { id: 'triangle', name: 'K3', desc: 'Triangle (3 nodes)' },
  { id: 'square', name: 'K4', desc: 'Complete 4' },
  { id: 'pentagon', name: 'K5', desc: 'Complete 5' },
  { id: 'diatonic', name: 'K7', desc: 'Diatonic (7 notes)' },
  { id: 'ring6', name: 'Ring6', desc: '6-node ring' },
  { id: 'ring8', name: 'Ring8', desc: '8-node ring' },
  { id: 'petersen', name: 'Petersen', desc: 'Famous 3-regular' },
  { id: 'random', name: 'Random', desc: 'Random 12-node' },
];

// --- Styles ---

const STYLES = `
.gra-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 10000;
  display: none;
  align-items: center;
  justify-content: center;
}
.gra-overlay.visible { display: flex; }

.gra-panel {
  background: #111;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  display: flex;
  max-width: 1100px;
  max-height: 90vh;
  overflow: hidden;
}

.gra-sidebar {
  width: 320px;
  background: #0a0a0a;
  border-right: 1px solid #222;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.gra-header {
  padding: 16px;
  border-bottom: 1px solid #222;
  display: flex;
  align-items: center;
  gap: 12px;
}
.gra-header h2 { color: #16c79a; font-size: 16px; margin: 0; flex: 1; }
.gra-close-btn {
  background: none; border: none; color: #666; font-size: 20px;
  cursor: pointer; padding: 4px 8px; border-radius: 4px;
}
.gra-close-btn:hover { color: #fff; background: #333; }

.gra-tabs {
  display: flex;
  border-bottom: 1px solid #222;
}
.gra-tab {
  flex: 1;
  padding: 10px 8px;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  background: none;
  border-top: none;
  border-left: none;
  border-right: none;
}
.gra-tab:hover { color: #aaa; }
.gra-tab.active { color: #16c79a; border-bottom-color: #16c79a; }

.gra-tab-content { flex: 1; overflow-y: auto; padding: 12px; }
.gra-tab-panel { display: none; }
.gra-tab-panel.active { display: block; }

.gra-section {
  background: #1a1a1a;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}
.gra-section h3 {
  color: #16c79a;
  font-size: 11px;
  margin: 0 0 10px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.gra-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.gra-row label {
  color: #888;
  font-size: 11px;
  min-width: 70px;
}
.gra-row input[type="number"] {
  flex: 1;
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 4px;
  color: #ccc;
  font-size: 12px;
  padding: 6px 8px;
  font-family: monospace;
}
.gra-row input[type="range"] { flex: 1; }
.gra-row .value {
  color: #16c79a;
  font-size: 10px;
  min-width: 40px;
  text-align: right;
  font-family: monospace;
}

.gra-btn-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.gra-btn {
  padding: 8px 12px;
  background: #16c79a;
  border: none;
  border-radius: 4px;
  color: #000;
  cursor: pointer;
  font-weight: 600;
  font-size: 11px;
}
.gra-btn:hover { background: #1de9b6; }
.gra-btn.secondary { background: #333; color: #ccc; }
.gra-btn.secondary:hover { background: #444; }

.gra-preset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}
.gra-preset-btn {
  padding: 10px 8px;
  background: #222;
  border: 1px solid #333;
  border-radius: 4px;
  color: #aaa;
  font-size: 10px;
  cursor: pointer;
  text-align: left;
}
.gra-preset-btn:hover { border-color: #16c79a; color: #fff; }
.gra-preset-btn.active { border-color: #16c79a; background: #1a2a2a; color: #16c79a; }
.gra-preset-btn .name { font-weight: 600; display: block; margin-bottom: 2px; }
.gra-preset-btn .desc { font-size: 9px; color: #666; }

.gra-seed-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.gra-seed-btn {
  padding: 8px 4px;
  background: #222;
  border: 1px solid #333;
  border-radius: 4px;
  color: #aaa;
  font-size: 10px;
  cursor: pointer;
  text-align: center;
}
.gra-seed-btn:hover { border-color: #16c79a; color: #fff; }
.gra-seed-btn.active { border-color: #16c79a; background: #1a2a2a; color: #16c79a; }

.gra-stats {
  font-size: 11px;
  color: #666;
  font-family: monospace;
  line-height: 1.8;
}
.gra-stats span { color: #16c79a; }

.gra-binary {
  font-family: monospace;
  font-size: 10px;
  word-break: break-all;
  color: #888;
  background: #0a0a0a;
  padding: 8px;
  border-radius: 4px;
  margin-top: 8px;
}
.gra-binary .label { color: #666; }
.gra-binary .bits { color: #16c79a; }

.gra-canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #050505;
  min-width: 620px;
}
.gra-canvas-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: #0a0a0a;
  border-bottom: 1px solid #1a1a1a;
}
.gra-canvas-header .title { color: #16c79a; font-weight: 600; font-size: 13px; }
.gra-canvas-header .stats { flex: 1; font-size: 11px; color: #666; }
.gra-chord-display { font-size: 20px; font-weight: bold; color: rgba(22, 199, 154, 0.5); }

.gra-canvas-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
}
.gra-canvas-wrap canvas {
  background: #000;
  border-radius: 6px;
  box-shadow: 0 0 30px rgba(22, 199, 154, 0.08);
}

.gra-beat-flash {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.05s;
  border-radius: 6px;
}
.gra-beat-flash.kick { background: radial-gradient(circle at 50% 80%, rgba(255,100,50,0.15), transparent 60%); }
.gra-beat-flash.snare { background: radial-gradient(circle at 50% 20%, rgba(100,200,255,0.15), transparent 60%); }

.gra-medley-list { margin-top: 8px; }
.gra-medley-item {
  padding: 6px 10px;
  border-radius: 4px;
  margin: 2px 0;
  font-size: 10px;
  color: #555;
  cursor: pointer;
}
.gra-medley-item:hover { color: #888; }
.gra-medley-item.active { background: #1a2a2a; color: #16c79a; }
.gra-medley-item.done { color: #333; }

.gra-progress-bar {
  height: 4px;
  background: #222;
  border-radius: 2px;
  margin-top: 8px;
  overflow: hidden;
}
.gra-progress-fill {
  width: 0%;
  height: 100%;
  background: linear-gradient(90deg, #16c79a, #1de9b6);
  border-radius: 2px;
  transition: width 0.1s;
}
`;

// --- Audio Engine ---

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);
    this.initialized = true;
  }

  kick(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  snare(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }

  hihat(): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }

  note(pc: number, octave = 4, duration = 0.2): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const semitones = (octave - 4) * 12 + pc - 9;
    const freq = 440 * Math.pow(2, semitones / 12);
    const carrier = this.ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = freq;
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    modulator.type = 'sine';
    modulator.frequency.value = freq * 2;
    modGain.gain.value = freq * 0.4;
    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.15, now + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);
    carrier.connect(env);
    env.connect(this.masterGain);
    carrier.start(now);
    modulator.start(now);
    carrier.stop(now + duration);
    modulator.stop(now + duration);
  }

  bass(pc: number, duration = 0.3): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const semitones = pc - 9 - 12;
    const freq = 440 * Math.pow(2, semitones / 12);
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 8, now);
    filter.frequency.exponentialRampToValueAtTime(freq * 2, now + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration);
  }
}

// --- GRA Engine ---

interface GRANode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: 0 | 1;
  neighbors: number[];
  // Dying constellation tracking
  dying?: boolean;
  dyingTTL?: number;
  gravityTargetX?: number;
  gravityTargetY?: number;
  alpha?: number;  // For fade-out
}


class GRAEngine {
  nodes: GRANode[] = [];
  rule = 2182;
  d = 3;
  time = 0;
  totalDivisions = 0;
  repulsion = 5000;
  springK = 0.03;
  springRest = 80;


  private cx = CANVAS_SIZE / 2;
  private cy = CANVAS_SIZE / 2;

  getR(config: number): number { return (this.rule >> config) & 1; }
  getRPrime(config: number): number { return (this.rule >> (config + 8)) & 1; }

  getConfig(nodeIdx: number): number {
    const node = this.nodes[nodeIdx];
    let sum = 0;
    for (const ni of node.neighbors) sum += this.nodes[ni].state;
    return (this.d + 1) * node.state + sum;
  }

  createCompleteGraph(n: number): void {
    this.nodes = [];
    const radius = 120;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      this.nodes.push({
        x: this.cx + Math.cos(angle) * radius,
        y: this.cy + Math.sin(angle) * radius,
        vx: 0, vy: 0,
        state: (i % 2) as 0 | 1,
        neighbors: []
      });
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        this.nodes[i].neighbors.push(j);
        this.nodes[j].neighbors.push(i);
      }
    }
    this.time = 0;
    this.totalDivisions = 0;
  }

  createRing(n: number): void {
    this.nodes = [];
    const radius = 120;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      this.nodes.push({
        x: this.cx + Math.cos(angle) * radius,
        y: this.cy + Math.sin(angle) * radius,
        vx: 0, vy: 0,
        state: (i % 2) as 0 | 1,
        neighbors: [(i - 1 + n) % n, (i + 1) % n]
      });
    }
    this.time = 0;
    this.totalDivisions = 0;
  }

  createPetersen(): void {
    this.nodes = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      this.nodes.push({ x: this.cx + Math.cos(angle) * 150, y: this.cy + Math.sin(angle) * 150, vx: 0, vy: 0, state: 1, neighbors: [] });
    }
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      this.nodes.push({ x: this.cx + Math.cos(angle) * 70, y: this.cy + Math.sin(angle) * 70, vx: 0, vy: 0, state: 0, neighbors: [] });
    }
    for (let i = 0; i < 5; i++) { this.nodes[i].neighbors.push((i + 1) % 5); this.nodes[(i + 1) % 5].neighbors.push(i); }
    for (let i = 0; i < 5; i++) { this.nodes[i].neighbors.push(i + 5); this.nodes[i + 5].neighbors.push(i); }
    for (let i = 0; i < 5; i++) { const next = (i + 2) % 5 + 5; this.nodes[i + 5].neighbors.push(next); this.nodes[next].neighbors.push(i + 5); }
    this.time = 0;
    this.totalDivisions = 0;
  }

  createRandom(n = 12): void {
    this.nodes = [];
    for (let i = 0; i < n; i++) {
      this.nodes.push({
        x: this.cx + (Math.random() - 0.5) * 250,
        y: this.cy + (Math.random() - 0.5) * 250,
        vx: 0, vy: 0,
        state: (Math.random() > 0.5 ? 1 : 0) as 0 | 1,
        neighbors: []
      });
    }
    for (let i = 0; i < n; i++) {
      while (this.nodes[i].neighbors.length < 3) {
        const j = Math.floor(Math.random() * n);
        if (j !== i && !this.nodes[i].neighbors.includes(j) && this.nodes[j].neighbors.length < 4) {
          this.nodes[i].neighbors.push(j);
          this.nodes[j].neighbors.push(i);
        }
      }
    }
    this.time = 0;
    this.totalDivisions = 0;
  }

  createSeed(type: string): void {
    switch (type) {
      case 'triangle': this.createCompleteGraph(3); break;
      case 'square': this.createCompleteGraph(4); break;
      case 'pentagon': this.createCompleteGraph(5); break;
      case 'diatonic': this.createCompleteGraph(7); break;
      case 'ring6': this.createRing(6); break;
      case 'ring8': this.createRing(8); break;
      case 'petersen': this.createPetersen(); break;
      case 'random': this.createRandom(); break;
      default: this.createCompleteGraph(7);
    }
  }

  step(): void {
    if (this.nodes.length === 0 || this.nodes.length > 2000) return;
    const nextStates: number[] = [];
    const shouldDivide: number[] = [];
    for (let i = 0; i < this.nodes.length; i++) {
      // Skip dying nodes in state calculation
      if (this.nodes[i].dying) continue;
      const config = this.getConfig(i);
      nextStates[i] = this.getR(config);
      shouldDivide[i] = this.getRPrime(config);
    }
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].dying) continue;
      if (nextStates[i] !== undefined) {
        this.nodes[i].state = nextStates[i] as 0 | 1;
      }
    }
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].dying) continue;
      if (shouldDivide[i] && this.nodes.length < 2000) {
        this.divideNode(i);
        this.totalDivisions++;
        break;
      }
    }
    this.time++;

    // Check for newly disconnected components every few steps
    if (this.time % 5 === 0) {
      this.checkForDyingConstellations();
    }
  }

  divideNode(idx: number): void {
    const original = this.nodes[idx];
    const newIndices = [idx];
    for (let i = 1; i < this.d; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 30;
      newIndices.push(this.nodes.length);
      this.nodes.push({
        x: original.x + Math.cos(angle) * dist,
        y: original.y + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        state: original.state,
        neighbors: []
      });
    }
    for (let i = 0; i < newIndices.length; i++) {
      for (let j = i + 1; j < newIndices.length; j++) {
        const a = newIndices[i], b = newIndices[j];
        if (!this.nodes[a].neighbors.includes(b)) {
          this.nodes[a].neighbors.push(b);
          this.nodes[b].neighbors.push(a);
        }
      }
    }
    const oldNeighbors = [...original.neighbors];
    original.neighbors = [];
    for (let i = 0; i < oldNeighbors.length; i++) {
      const neighborIdx = oldNeighbors[i];
      const targetNewNode = newIndices[i % newIndices.length];
      const neighbor = this.nodes[neighborIdx];
      neighbor.neighbors = neighbor.neighbors.filter(n => n !== idx);
      if (!neighbor.neighbors.includes(targetNewNode)) {
        neighbor.neighbors.push(targetNewNode);
        this.nodes[targetNewNode].neighbors.push(neighborIdx);
      }
    }
  }

  physics(damping = 0.92): void {
    const centerPull = 0.001;

    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const ni = this.nodes[i], nj = this.nodes[j];
        const dx = nj.x - ni.x, dy = nj.y - ni.y;
        const d2 = dx * dx + dy * dy + 1;
        const d = Math.sqrt(d2);
        const f = this.repulsion / d2;
        const fx = f * dx / d, fy = f * dy / d;
        ni.vx -= fx; ni.vy -= fy;
        nj.vx += fx; nj.vy += fy;
      }
    }

    for (let i = 0; i < this.nodes.length; i++) {
      const ni = this.nodes[i];
      for (const j of ni.neighbors) {
        if (j > i) {
          const nj = this.nodes[j];
          const dx = nj.x - ni.x, dy = nj.y - ni.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const f = this.springK * (d - this.springRest);
          const fx = f * dx / d, fy = f * dy / d;
          ni.vx += fx; ni.vy += fy;
          nj.vx -= fx; nj.vy -= fy;
        }
      }
    }

    for (const node of this.nodes) {
      node.vx += (this.cx - node.x) * centerPull;
      node.vy += (this.cy - node.y) * centerPull;
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  flipByPitchClass(pc: number): void {
    const targets: number[] = [];
    for (let i = 0; i < this.nodes.length; i++) {
      const dx = this.nodes[i].x - this.cx, dy = this.nodes[i].y - this.cy;
      const angle = Math.atan2(dy, dx);
      const nodePc = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 12) % 12;
      if (nodePc === pc) targets.push(i);
    }
    for (let i = 0; i < Math.min(2, targets.length); i++) {
      const idx = targets[Math.floor(Math.random() * targets.length)];
      this.nodes[idx].state = (1 - this.nodes[idx].state) as 0 | 1;
    }
  }

  impulse(strength = 1): void {
    for (const node of this.nodes) {
      const angle = Math.random() * Math.PI * 2;
      node.vx += Math.cos(angle) * strength;
      node.vy += Math.sin(angle) * strength;
    }
  }

  getStats(): { time: number; nodes: number; edges: number; alive: number; divisions: number } {
    let edges = 0, alive = 0;
    for (const node of this.nodes) { edges += node.neighbors.length; if (node.state === 1) alive++; }
    return { time: this.time, nodes: this.nodes.length, edges: edges / 2, alive, divisions: this.totalDivisions };
  }

  // Find connected components using BFS
  private findComponents(): number[][] {
    const visited = new Set<number>();
    const components: number[][] = [];

    for (let i = 0; i < this.nodes.length; i++) {
      if (visited.has(i) || this.nodes[i].dying) continue;

      const component: number[] = [];
      const queue = [i];
      visited.add(i);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        component.push(curr);

        for (const neighbor of this.nodes[curr].neighbors) {
          if (!visited.has(neighbor) && !this.nodes[neighbor].dying) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      components.push(component);
    }

    return components;
  }

  // Mark fragments (< 3 nodes) as dying - constellations (3+ nodes) persist
  checkForDyingConstellations(): void {
    const components = this.findComponents();

    for (const component of components) {
      // Constellations (3+ nodes) persist, only fragments die
      if (component.length >= 3) continue;
      if (component.length === 0) continue;
      if (component.every(idx => this.nodes[idx].dying)) continue;

      // Calculate center of mass for gravity collapse
      let sumX = 0, sumY = 0;
      for (const idx of component) {
        sumX += this.nodes[idx].x;
        sumY += this.nodes[idx].y;
      }
      const centerX = sumX / component.length;
      const centerY = sumY / component.length;

      // Mark nodes as dying - they'll handle their own collapse
      for (const idx of component) {
        const node = this.nodes[idx];
        node.dying = true;
        node.dyingTTL = 60; // ~1 second at 60fps
        node.gravityTargetX = centerX;
        node.gravityTargetY = centerY;
        node.alpha = 1.0;
      }
    }
  }

  // Update dying nodes - apply gravity collapse and fade, then remove
  updateDyingConstellations(): void {
    const GRAVITY_STRENGTH = 0.15;
    const FADE_RATE = 0.025;

    // Process dying nodes
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      if (!node.dying) continue;

      // Apply gravity toward center of mass
      if (node.gravityTargetX !== undefined && node.gravityTargetY !== undefined) {
        const dx = node.gravityTargetX - node.x;
        const dy = node.gravityTargetY - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Accelerating gravity as TTL decreases
        const ttl = node.dyingTTL ?? 0;
        const gravityMult = 1 + (60 - ttl) * 0.05;
        node.vx += (dx / dist) * GRAVITY_STRENGTH * gravityMult;
        node.vy += (dy / dist) * GRAVITY_STRENGTH * gravityMult;
      }

      // Fade out
      if (node.alpha !== undefined) {
        node.alpha = Math.max(0, node.alpha - FADE_RATE);
      }
      if (node.dyingTTL !== undefined) {
        node.dyingTTL--;
      }

      // Remove when fully faded
      if ((node.alpha ?? 1) <= 0 || (node.dyingTTL ?? 1) <= 0) {
        this.removeNode(i);
      }
    }
  }

  // Remove a node and fix neighbor references
  private removeNode(idx: number): void {
    if (idx < 0 || idx >= this.nodes.length) return;

    // Remove this node from all neighbor lists and adjust indices
    for (const node of this.nodes) {
      node.neighbors = node.neighbors
        .filter(n => n !== idx)
        .map(n => n > idx ? n - 1 : n);
    }

    this.nodes.splice(idx, 1);
  }
}

// --- Music Simulation ---

interface Song {
  name: string;
  bpm: number;
  key: string;
  bars: number;
  chords: string[];
  rules: number[];
  melodyPattern: number[];
  drumPattern: { kick: number[]; snare: number[]; hihat: number[] };
  energy: number;
}

const MEDLEY: Song[] = [
  { name: "Moonlit Ballad", bpm: 72, key: "C maj", bars: 16, chords: ["I", "V", "vi", "IV"], rules: [2182, 2182, 549, 549], melodyPattern: [0, 4, 7, 12, 7, 4, 0, -1], drumPattern: { kick: [0], snare: [2], hihat: [0, 1, 2, 3] }, energy: 0.4 },
  { name: "Funk Machine", bpm: 100, key: "D min", bars: 16, chords: ["ii", "V", "I", "vi"], rules: [2238, 2199, 2182, 1638], melodyPattern: [2, 5, 7, 10, 7, -1, 5, 2], drumPattern: { kick: [0, 2.5], snare: [1, 3], hihat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] }, energy: 0.7 },
  { name: "Power Drive", bpm: 120, key: "E maj", bars: 16, chords: ["I", "bVII", "IV", "I"], rules: [4095, 2199, 2238, 4095], melodyPattern: [0, 0, 7, 7, 5, 5, 4, 4], drumPattern: { kick: [0, 1, 2, 3], snare: [1, 3], hihat: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] }, energy: 0.85 },
  { name: "Neon Pulse", bpm: 128, key: "A min", bars: 16, chords: ["vi", "IV", "I", "V"], rules: [1638, 549, 2182, 2238], melodyPattern: [9, 12, 9, 7, 5, 7, 9, 12], drumPattern: { kick: [0, 2], snare: [1, 3], hihat: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75] }, energy: 0.9 },
  { name: "Blue Note Swing", bpm: 140, key: "Bb maj", bars: 16, chords: ["ii", "V", "I", "VI"], rules: [2182, 2199, 549, 1638], melodyPattern: [2, 5, 7, 10, 9, 7, 5, 3], drumPattern: { kick: [0, 2.33], snare: [1.33, 3.66], hihat: [0, 0.66, 1.33, 2, 2.66, 3.33] }, energy: 0.75 },
  { name: "Chaos Engine", bpm: 180, key: "F# min", bars: 16, chords: ["i", "bVI", "III", "VII"], rules: [4095, 4095, 2199, 2238], melodyPattern: [0, 3, 6, 9, 11, 6, 3, 0], drumPattern: { kick: [0, 0.5, 2, 2.5], snare: [1, 1.5, 3, 3.5], hihat: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75] }, energy: 1.0 }
];

// --- GRA Config Panel ---

export class GRAConfigPanel {
  private container: HTMLElement;
  private visible = false;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private engine = new GRAEngine();
  private audio = new AudioEngine();
  private animationId: number | null = null;

  // Evolution state
  private isPlaying = false;
  private playInterval: number | null = null;
  private damping = 0.92;
  private activeSeed = 'diatonic';

  // Music simulation state
  private musicPlaying = false;
  private songIndex = 0;
  private beat = 0;
  private bar = 0;
  private subBeat = 0;
  private lastBeatTime = 0;
  private lastSubBeatTime = 0;
  private melodyIndex = 0;

  onSave: (() => void) | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'gra-overlay';
    this.container.innerHTML = this.createHTML();
    this.injectStyles();
    document.body.appendChild(this.container);

    this.canvas = this.container.querySelector('#gra-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.engine.createCompleteGraph(7);
    this.setupEventHandlers();
    this.updateRuleDisplay();
  }

  private injectStyles(): void {
    if (document.getElementById('gra-config-styles')) return;
    const style = document.createElement('style');
    style.id = 'gra-config-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  private createHTML(): string {
    const ruleButtons = RULE_PRESETS.map((p, i) =>
      `<button class="gra-preset-btn${i === 0 ? ' active' : ''}" data-rule="${p.rule}">
        <span class="name">${p.name} (${p.rule})</span>
        <span class="desc">${p.desc}</span>
      </button>`
    ).join('');

    const seedButtons = SEED_GRAPHS.map(s =>
      `<button class="gra-seed-btn${s.id === 'diatonic' ? ' active' : ''}" data-seed="${s.id}" title="${s.desc}">${s.name}</button>`
    ).join('');

    const medleyItems = MEDLEY.map((s, i) =>
      `<div class="gra-medley-item" data-idx="${i}">${i + 1}. ${s.name}</div>`
    ).join('');

    return `
      <div class="gra-panel">
        <div class="gra-sidebar">
          <div class="gra-header">
            <h2>GRA Explorer</h2>
            <button class="gra-close-btn">&times;</button>
          </div>

          <div class="gra-tabs">
            <button class="gra-tab active" data-tab="rules">Rules</button>
            <button class="gra-tab" data-tab="music">Music</button>
            <button class="gra-tab" data-tab="physics">Physics</button>
          </div>

          <div class="gra-tab-content">
            <div class="gra-tab-panel active" id="gra-tab-rules">
              <div class="gra-section">
                <h3>Rule Number</h3>
                <div class="gra-row">
                  <input type="number" id="gra-rule-input" value="2182" min="0" max="65535">
                </div>
                <div class="gra-preset-grid">${ruleButtons}</div>
                <div class="gra-binary">
                  <span class="label">R (state):</span> <span class="bits" id="gra-rule-r">10000110</span><br>
                  <span class="label">R' (div):</span> <span class="bits" id="gra-rule-r-prime">00001000</span>
                </div>
              </div>

              <div class="gra-section">
                <h3>Seed Graph</h3>
                <div class="gra-seed-grid">${seedButtons}</div>
              </div>

              <div class="gra-section">
                <h3>Evolution</h3>
                <div class="gra-btn-grid">
                  <button class="gra-btn" id="gra-step-btn">Step</button>
                  <button class="gra-btn" id="gra-play-btn">Play</button>
                  <button class="gra-btn secondary" id="gra-reset-btn">Reset</button>
                </div>
                <div class="gra-row" style="margin-top: 10px;">
                  <label>Speed</label>
                  <input type="range" id="gra-speed-slider" min="1" max="20" value="5">
                  <span class="value" id="gra-speed-value">5</span>
                </div>
              </div>
            </div>

            <div class="gra-tab-panel" id="gra-tab-music">
              <div class="gra-section">
                <h3>Simulation Medley</h3>
                <div class="gra-btn-grid">
                  <button class="gra-btn" id="gra-sim-play-btn">Play</button>
                  <button class="gra-btn secondary" id="gra-sim-skip-btn">Skip</button>
                  <button class="gra-btn secondary" id="gra-sim-stop-btn">Stop</button>
                </div>
                <div class="gra-stats" style="margin-top: 10px;">
                  Song: <span id="gra-song-name">—</span><br>
                  <span id="gra-song-bpm">—</span> BPM · <span id="gra-song-key">—</span><br>
                  Beat <span id="gra-song-beat">0</span> · Bar <span id="gra-song-bar">0</span>
                </div>
                <div class="gra-progress-bar">
                  <div class="gra-progress-fill" id="gra-progress-bar"></div>
                </div>
                <div class="gra-medley-list">${medleyItems}</div>
              </div>
            </div>

            <div class="gra-tab-panel" id="gra-tab-physics">
              <div class="gra-section">
                <h3>Force Parameters</h3>
                <div class="gra-row">
                  <label>Damping</label>
                  <input type="range" id="gra-damping-slider" min="80" max="99" value="92">
                  <span class="value" id="gra-damping-value">0.92</span>
                </div>
                <div class="gra-row">
                  <label>Repulsion</label>
                  <input type="range" id="gra-repulsion-slider" min="1000" max="10000" value="5000">
                  <span class="value" id="gra-repulsion-value">5000</span>
                </div>
                <div class="gra-row">
                  <label>Spring K</label>
                  <input type="range" id="gra-spring-slider" min="1" max="10" value="3">
                  <span class="value" id="gra-spring-value">0.03</span>
                </div>
                <div class="gra-row">
                  <label>Rest Len</label>
                  <input type="range" id="gra-rest-slider" min="40" max="160" value="80">
                  <span class="value" id="gra-rest-value">80</span>
                </div>
              </div>

              <div class="gra-section">
                <h3>Graph Stats</h3>
                <div class="gra-stats">
                  Time: <span id="gra-stat-time">0</span><br>
                  Nodes: <span id="gra-stat-nodes">0</span><br>
                  Edges: <span id="gra-stat-edges">0</span><br>
                  Alive: <span id="gra-stat-alive">0</span><br>
                  Divisions: <span id="gra-stat-divisions">0</span>
                </div>
              </div>

              <div class="gra-section">
                <h3>Presets</h3>
                <div class="gra-btn-grid">
                  <button class="gra-btn secondary" id="gra-preset-calm">Calm</button>
                  <button class="gra-btn secondary" id="gra-preset-default">Default</button>
                  <button class="gra-btn secondary" id="gra-preset-chaos">Chaos</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="gra-canvas-area">
          <div class="gra-canvas-header">
            <span class="title">Graph Visualization</span>
            <div class="stats">
              Nodes: <span id="gra-nodes-inline">0</span> · Edges: <span id="gra-edges-inline">0</span>
            </div>
            <span class="gra-chord-display" id="gra-chord-display"></span>
          </div>
          <div class="gra-canvas-wrap" style="position: relative;">
            <canvas id="gra-canvas" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}"></canvas>
            <div class="gra-beat-flash" id="gra-beat-flash"></div>
          </div>
        </div>
      </div>
    `;
  }

  private setupEventHandlers(): void {
    // Close
    this.container.querySelector('.gra-close-btn')!.addEventListener('click', () => this.hide());
    this.container.addEventListener('click', (e) => { if (e.target === this.container) this.hide(); });

    // Tabs
    this.container.querySelectorAll('.gra-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.container.querySelectorAll('.gra-tab').forEach(t => t.classList.remove('active'));
        this.container.querySelectorAll('.gra-tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        this.container.querySelector(`#gra-tab-${(tab as HTMLElement).dataset.tab}`)!.classList.add('active');
      });
    });

    // Rule input
    this.container.querySelector('#gra-rule-input')!.addEventListener('change', (e) => {
      this.engine.rule = parseInt((e.target as HTMLInputElement).value) || 0;
      this.updateRuleDisplay();
    });

    // Rule presets
    this.container.querySelectorAll('.gra-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rule = parseInt((btn as HTMLElement).dataset.rule!);
        this.engine.rule = rule;
        (this.container.querySelector('#gra-rule-input') as HTMLInputElement).value = String(rule);
        this.updateRuleDisplay();
        this.container.querySelectorAll('.gra-preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Seed buttons
    this.container.querySelectorAll('.gra-seed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.gra-seed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeSeed = (btn as HTMLElement).dataset.seed!;
        this.engine.createSeed(this.activeSeed);
      });
    });

    // Evolution controls
    this.container.querySelector('#gra-step-btn')!.addEventListener('click', () => this.engine.step());
    this.container.querySelector('#gra-play-btn')!.addEventListener('click', () => this.togglePlay());
    this.container.querySelector('#gra-reset-btn')!.addEventListener('click', () => this.engine.createSeed(this.activeSeed));

    // Speed slider
    this.container.querySelector('#gra-speed-slider')!.addEventListener('input', (e) => {
      const speed = parseInt((e.target as HTMLInputElement).value);
      this.container.querySelector('#gra-speed-value')!.textContent = String(speed);
      if (this.isPlaying) {
        if (this.playInterval) clearInterval(this.playInterval);
        this.playInterval = window.setInterval(() => this.engine.step(), 1000 / speed);
      }
    });

    // Physics sliders
    this.container.querySelector('#gra-damping-slider')!.addEventListener('input', (e) => {
      this.damping = parseInt((e.target as HTMLInputElement).value) / 100;
      this.container.querySelector('#gra-damping-value')!.textContent = this.damping.toFixed(2);
    });
    this.container.querySelector('#gra-repulsion-slider')!.addEventListener('input', (e) => {
      this.engine.repulsion = parseInt((e.target as HTMLInputElement).value);
      this.container.querySelector('#gra-repulsion-value')!.textContent = String(this.engine.repulsion);
    });
    this.container.querySelector('#gra-spring-slider')!.addEventListener('input', (e) => {
      this.engine.springK = parseInt((e.target as HTMLInputElement).value) / 100;
      this.container.querySelector('#gra-spring-value')!.textContent = this.engine.springK.toFixed(2);
    });
    this.container.querySelector('#gra-rest-slider')!.addEventListener('input', (e) => {
      this.engine.springRest = parseInt((e.target as HTMLInputElement).value);
      this.container.querySelector('#gra-rest-value')!.textContent = String(this.engine.springRest);
    });

    // Physics presets
    this.container.querySelector('#gra-preset-calm')!.addEventListener('click', () => this.applyPhysicsPreset('calm'));
    this.container.querySelector('#gra-preset-default')!.addEventListener('click', () => this.applyPhysicsPreset('default'));
    this.container.querySelector('#gra-preset-chaos')!.addEventListener('click', () => this.applyPhysicsPreset('chaos'));

    // Music controls
    this.container.querySelector('#gra-sim-play-btn')!.addEventListener('click', () => this.toggleMusic());
    this.container.querySelector('#gra-sim-skip-btn')!.addEventListener('click', () => this.skipSong());
    this.container.querySelector('#gra-sim-stop-btn')!.addEventListener('click', () => this.stopMusic());

    // Medley item clicks
    this.container.querySelectorAll('.gra-medley-item').forEach(item => {
      item.addEventListener('click', () => {
        this.songIndex = parseInt((item as HTMLElement).dataset.idx!);
        this.beat = 0;
        this.bar = 0;
        this.subBeat = 0;
        this.melodyIndex = 0;
        if (!this.musicPlaying) this.startMusic();
        this.updateMusicUI();
      });
    });
  }

  private togglePlay(): void {
    this.isPlaying = !this.isPlaying;
    const btn = this.container.querySelector('#gra-play-btn')!;
    btn.textContent = this.isPlaying ? 'Pause' : 'Play';
    if (this.isPlaying) {
      const speed = parseInt((this.container.querySelector('#gra-speed-slider') as HTMLInputElement).value);
      this.playInterval = window.setInterval(() => this.engine.step(), 1000 / speed);
    } else if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }

  private applyPhysicsPreset(preset: string): void {
    const presets: Record<string, { damping: number; repulsion: number; springK: number; springRest: number }> = {
      calm: { damping: 0.95, repulsion: 3000, springK: 0.02, springRest: 120 },
      default: { damping: 0.92, repulsion: 5000, springK: 0.03, springRest: 80 },
      chaos: { damping: 0.85, repulsion: 8000, springK: 0.06, springRest: 50 },
    };
    const p = presets[preset];
    this.damping = p.damping;
    this.engine.repulsion = p.repulsion;
    this.engine.springK = p.springK;
    this.engine.springRest = p.springRest;
    (this.container.querySelector('#gra-damping-slider') as HTMLInputElement).value = String(p.damping * 100);
    this.container.querySelector('#gra-damping-value')!.textContent = p.damping.toFixed(2);
    (this.container.querySelector('#gra-repulsion-slider') as HTMLInputElement).value = String(p.repulsion);
    this.container.querySelector('#gra-repulsion-value')!.textContent = String(p.repulsion);
    (this.container.querySelector('#gra-spring-slider') as HTMLInputElement).value = String(p.springK * 100);
    this.container.querySelector('#gra-spring-value')!.textContent = p.springK.toFixed(2);
    (this.container.querySelector('#gra-rest-slider') as HTMLInputElement).value = String(p.springRest);
    this.container.querySelector('#gra-rest-value')!.textContent = String(p.springRest);
  }

  private updateRuleDisplay(): void {
    const binary = this.engine.rule.toString(2).padStart(16, '0');
    this.container.querySelector('#gra-rule-r')!.textContent = binary.slice(8);
    this.container.querySelector('#gra-rule-r-prime')!.textContent = binary.slice(0, 8);
  }

  // --- Music Simulation ---

  private get song(): Song { return MEDLEY[this.songIndex]; }
  private get beatDuration(): number { return 60 / this.song.bpm; }

  private startMusic(): void {
    this.audio.init();
    this.musicPlaying = true;
    this.lastBeatTime = performance.now();
    this.lastSubBeatTime = performance.now();
    this.container.querySelector('#gra-sim-play-btn')!.textContent = 'Pause';
    this.updateMusicUI();
  }

  private toggleMusic(): void {
    if (this.musicPlaying) this.stopMusic();
    else this.startMusic();
  }

  private stopMusic(): void {
    this.musicPlaying = false;
    this.container.querySelector('#gra-sim-play-btn')!.textContent = 'Play';
    this.container.querySelector('#gra-chord-display')!.textContent = '';
  }

  private skipSong(): void {
    this.songIndex = (this.songIndex + 1) % MEDLEY.length;
    this.beat = 0;
    this.bar = 0;
    this.subBeat = 0;
    this.melodyIndex = 0;
    this.engine.createCompleteGraph(7);
    this.updateMusicUI();
  }

  private updateMusic(now: number): void {
    if (!this.musicPlaying) return;

    const subBeatDuration = this.beatDuration / 4;
    if ((now - this.lastSubBeatTime) / 1000 >= subBeatDuration) {
      this.lastSubBeatTime = now;
      const beatInBar = this.beat % 4 + (this.subBeat % 4) * 0.25;
      if (this.song.drumPattern.hihat.some(h => Math.abs(h - beatInBar) < 0.05)) this.audio.hihat();
      this.subBeat++;
    }

    if ((now - this.lastBeatTime) / 1000 >= this.beatDuration) {
      this.lastBeatTime = now;
      this.processBeat();
    }
  }

  private processBeat(): void {
    const song = this.song;
    const beatInBar = this.beat % 4;
    const flash = this.container.querySelector('#gra-beat-flash') as HTMLElement;

    if (song.drumPattern.kick.some(k => Math.abs(k - beatInBar) < 0.1)) {
      this.audio.kick();
      this.engine.impulse(song.energy * 3);
      flash.className = 'gra-beat-flash kick';
      flash.style.opacity = '1';
      setTimeout(() => flash.style.opacity = '0', 100);
    }

    if (song.drumPattern.snare.some(s => Math.abs(s - beatInBar) < 0.1)) {
      this.audio.snare();
      this.engine.step();
      flash.className = 'gra-beat-flash snare';
      flash.style.opacity = '1';
      setTimeout(() => flash.style.opacity = '0', 100);
    }

    const noteOffset = song.melodyPattern[this.melodyIndex % song.melodyPattern.length];
    if (noteOffset >= 0) {
      const pc = noteOffset % 12;
      this.audio.note(pc, 4 + Math.floor(noteOffset / 12), this.beatDuration * 0.8);
      this.engine.flipByPitchClass(pc);
    }
    this.melodyIndex++;

    if (beatInBar === 0 || beatInBar === 2) {
      const chordIdx = Math.floor(this.bar / 4) % song.chords.length;
      const roots: Record<string, number> = { 'I': 0, 'ii': 2, 'III': 4, 'IV': 5, 'V': 7, 'vi': 9, 'VII': 11, 'i': 0, 'bVI': 8, 'bVII': 10, 'VI': 9 };
      const root = roots[song.chords[chordIdx]] || 0;
      this.audio.bass(root, this.beatDuration * 1.5);
    }

    if (this.beat % 16 === 0) {
      const chordIdx = Math.floor(this.bar / 4) % song.rules.length;
      this.engine.rule = song.rules[chordIdx];
      (this.container.querySelector('#gra-rule-input') as HTMLInputElement).value = String(this.engine.rule);
      this.updateRuleDisplay();
    }

    if (beatInBar === 0 && this.beat > 0) {
      this.bar++;
      this.engine.step();
    }

    this.beat++;

    if (this.bar >= song.bars) {
      this.container.querySelector(`[data-idx="${this.songIndex}"]`)?.classList.add('done');
      this.container.querySelector(`[data-idx="${this.songIndex}"]`)?.classList.remove('active');
      this.songIndex++;
      if (this.songIndex >= MEDLEY.length) {
        this.songIndex = 0;
        this.container.querySelectorAll('.gra-medley-item').forEach(el => el.classList.remove('done'));
      }
      this.beat = 0;
      this.bar = 0;
      this.subBeat = 0;
      this.melodyIndex = 0;
      this.engine.createCompleteGraph(5 + Math.floor(Math.random() * 4));
    }

    this.updateMusicUI();
  }

  private updateMusicUI(): void {
    const song = this.song;
    this.container.querySelector('#gra-song-name')!.textContent = song.name;
    this.container.querySelector('#gra-song-bpm')!.textContent = String(song.bpm);
    this.container.querySelector('#gra-song-key')!.textContent = song.key;
    this.container.querySelector('#gra-song-beat')!.textContent = String(this.beat % 4 + 1);
    this.container.querySelector('#gra-song-bar')!.textContent = String(this.bar + 1);
    (this.container.querySelector('#gra-progress-bar') as HTMLElement).style.width = `${(this.bar / song.bars) * 100}%`;

    const chordIdx = Math.floor(this.bar / 4) % song.chords.length;
    this.container.querySelector('#gra-chord-display')!.textContent = this.musicPlaying ? song.chords[chordIdx] : '';

    this.container.querySelectorAll('.gra-medley-item').forEach((el, i) => {
      if (i === this.songIndex && this.musicPlaying) el.classList.add('active');
      else el.classList.remove('active');
    });
  }

  // --- Rendering ---

  private render(): void {
    const ctx = this.ctx;
    const cx = CANVAS_SIZE / 2;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const energy = this.musicPlaying ? this.song.energy : 0.5;

    // Pitch class wheel background
    if (this.musicPlaying) {
      ctx.globalAlpha = 0.08;
      for (let pc = 0; pc < 12; pc++) {
        const angle = (pc / 12) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cx);
        ctx.arc(cx, cx, CANVAS_SIZE / 2 - 20, angle - Math.PI / 12, angle + Math.PI / 12);
        ctx.closePath();
        ctx.fillStyle = PC_COLORS[pc];
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Edges
    ctx.lineWidth = 1 + energy;
    for (let i = 0; i < this.engine.nodes.length; i++) {
      const ni = this.engine.nodes[i];
      for (const j of ni.neighbors) {
        if (j > i) {
          const nj = this.engine.nodes[j];
          // Fade edges for dying nodes
          const alphaI = ni.alpha ?? 1;
          const alphaJ = nj.alpha ?? 1;
          const edgeAlpha = Math.min(alphaI, alphaJ) * (0.3 + energy * 0.3);
          ctx.strokeStyle = `rgba(100, 150, 200, ${edgeAlpha})`;
          ctx.beginPath();
          ctx.moveTo(ni.x, ni.y);
          ctx.lineTo(nj.x, nj.y);
          ctx.stroke();
        }
      }
    }

    // Nodes
    for (const node of this.engine.nodes) {
      const dx = node.x - cx, dy = node.y - cx;
      const angle = Math.atan2(dy, dx);
      const pc = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 12) % 12;
      const baseRadius = node.state === 1 ? 7 : 4;
      const radius = baseRadius + energy * 2;
      const alpha = node.alpha ?? 1;

      // Skip fully faded nodes
      if (alpha <= 0) continue;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = node.state === 1 ? PC_COLORS[pc] : '#444';
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (node.state === 1 && alpha > 0.3) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = PC_COLORS[pc] + '44';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Update stats
    const stats = this.engine.getStats();
    this.container.querySelector('#gra-stat-time')!.textContent = String(stats.time);
    this.container.querySelector('#gra-stat-nodes')!.textContent = String(stats.nodes);
    this.container.querySelector('#gra-stat-edges')!.textContent = String(stats.edges);
    this.container.querySelector('#gra-stat-alive')!.textContent = String(stats.alive);
    this.container.querySelector('#gra-stat-divisions')!.textContent = String(stats.divisions);
    this.container.querySelector('#gra-nodes-inline')!.textContent = String(stats.nodes);
    this.container.querySelector('#gra-edges-inline')!.textContent = String(stats.edges);
  }

  private animate = (now: number): void => {
    if (!this.visible) return;
    this.updateMusic(now);
    this.engine.physics(this.damping);
    this.engine.updateDyingConstellations();
    this.render();
    this.animationId = requestAnimationFrame(this.animate);
  };

  // --- Public API ---

  show(): void {
    this.visible = true;
    this.container.classList.add('visible');
    this.engine.createSeed(this.activeSeed);
    this.animationId = requestAnimationFrame(this.animate);
  }

  hide(): void {
    this.visible = false;
    this.container.classList.remove('visible');
    this.stopMusic();
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  isVisible(): boolean {
    return this.visible;
  }
}
