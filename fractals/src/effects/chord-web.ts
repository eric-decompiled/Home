// --- Chord Web Effect ---
// Like Melody Web but tracks chord root movements only.
// Edges connect successive chord roots, building a map of the
// song's harmonic progression. Thicker edges = more frequent
// chord transitions. Current chord triad is highlighted.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { samplePaletteColor, MAJOR_OFFSETS, MINOR_OFFSETS, MAJOR_DEGREES, MINOR_DEGREES, chordTriad, semitoneOffset } from './effect-utils.ts';

interface NodeState {
  brightness: number;
  hitCount: number;
  lastHitTime: number;
  r: number;
  g: number;
  b: number;
}

interface EdgeState {
  strength: number;
  recent: number;
}

export class ChordWebEffect implements VisualEffect {
  readonly id = 'chord-web';
  readonly name = 'Chord Web';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'screen';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  private nodes: NodeState[] = [];
  private edges: Map<number, EdgeState> = new Map();
  private chordTrail: number[] = [];

  private lastChordRoot = -1;
  private time = 0;
  private key = 0;
  private breathPhase = 0;
  private chordNotes: Set<number> = new Set();

  private radius = 0.85;
  private edgeDecay = 0.998;
  private nodeDecay = 1.5; // slower decay than melody — chords linger
  private webIntensity = 1.0;

  private diatonicOffsets: Set<number> = MAJOR_OFFSETS;
  private keyMode: 'major' | 'minor' = 'major';

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.initNodes();
  }

  private initNodes(): void {
    this.nodes = [];
    for (let i = 0; i < 12; i++) {
      const c = samplePaletteColor(i, 0.7);
      this.nodes.push({
        brightness: 0,
        hitCount: 0,
        lastHitTime: -10,
        r: c[0], g: c[1], b: c[2],
      });
    }
    this.edges.clear();
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

  private edgeKey(a: number, b: number): number {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return lo * 12 + hi;
  }

  update(dt: number, music: MusicParams): void {
    this.time += dt;
    this.breathPhase += dt * 0.6; // slower breathing than melody web
    this.key = music.key;
    this.keyMode = music.keyMode;
    this.diatonicOffsets = music.keyMode === 'minor' ? MINOR_OFFSETS : MAJOR_OFFSETS;
    this.chordNotes = chordTriad(music.chordRoot, music.chordQuality);

    // Chord change — light up node and create edge
    const root = music.chordRoot;
    if (root >= 0 && root !== this.lastChordRoot) {
      const node = this.nodes[root];
      node.brightness = 1.0;
      node.hitCount++;
      node.lastHitTime = this.time;

      const c = samplePaletteColor(root, 0.75);
      node.r = c[0];
      node.g = c[1];
      node.b = c[2];

      // Edge from previous chord root
      if (this.lastChordRoot >= 0 && this.lastChordRoot !== root) {
        const ek = this.edgeKey(root, this.lastChordRoot);
        const edge = this.edges.get(ek) ?? { strength: 0, recent: 0 };
        edge.strength = Math.min(1.0, edge.strength + 0.2);
        edge.recent = 1.0;
        this.edges.set(ek, edge);
      }

      // Push to chord trail
      if (this.chordTrail.length === 0 || this.chordTrail[this.chordTrail.length - 1] !== root) {
        this.chordTrail.push(root);
        if (this.chordTrail.length > 8) {
          this.chordTrail.shift();
        }
      }

      this.lastChordRoot = root;
    }

    // Beat pulse — brighten active nodes on kick
    if (music.kick) {
      for (const node of this.nodes) {
        if (node.brightness > 0.05) {
          node.brightness = Math.min(1.0, node.brightness + 0.15);
        }
      }
    }

    // Decay
    for (const node of this.nodes) {
      node.brightness *= Math.exp(-this.nodeDecay * dt);
    }

    for (const [key, edge] of this.edges) {
      edge.strength *= this.edgeDecay;
      edge.recent *= Math.exp(-3.0 * dt); // slower flash decay than melody
      if (edge.strength < 0.001 && edge.recent < 0.001) {
        this.edges.delete(key);
      }
    }
  }

  render(): HTMLCanvasElement {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(cx, cy) * this.radius;
    const breath = 1 + Math.sin(this.breathPhase) * 0.02;

    // Node positions (key at 12 o'clock)
    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 12; i++) {
      const semitones = semitoneOffset(i, this.key);
      const angle = (semitones / 12) * Math.PI * 2 - Math.PI / 2;
      positions.push({
        x: cx + Math.cos(angle) * r * breath,
        y: cy + Math.sin(angle) * r * breath,
      });
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // --- Draw edges ---
    for (const [key, edge] of this.edges) {
      const lo = Math.floor(key / 12);
      const hi = key % 12;
      const p0 = positions[lo];
      const p1 = positions[hi];
      const s = edge.strength;
      // Steeper cliff: edges hold near full brightness until strength drops
      // below 0.5, then fall off sharply via a quintic ease-out
      const t = Math.min(Math.max(s / 0.5, 0), 1);
      const t3 = t * t * t;
      const strengthAlpha = t3 * t3; // s^6 — very steep cliff
      const totalAlpha = (strengthAlpha * 0.5 + edge.recent * 0.5) * this.webIntensity;
      if (totalAlpha < 0.005) continue;

      const n0 = this.nodes[lo];
      const n1 = this.nodes[hi];
      const mr = Math.round((n0.r + n1.r) / 2);
      const mg = Math.round((n0.g + n1.g) / 2);
      const mb = Math.round((n0.b + n1.b) / 2);

      // Outer glow
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.strokeStyle = `rgba(${mr},${mg},${mb},${(totalAlpha * 0.15).toFixed(3)})`;
      ctx.lineWidth = 8 + edge.recent * 10;
      ctx.stroke();

      // Core line — thicker than melody web to emphasize structure
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      const bright = edge.recent * 0.5;
      const wr = Math.min(255, mr + Math.round((255 - mr) * bright));
      const wg = Math.min(255, mg + Math.round((255 - mg) * bright));
      const wb = Math.min(255, mb + Math.round((255 - mb) * bright));
      ctx.strokeStyle = `rgba(${wr},${wg},${wb},${(totalAlpha * 0.5).toFixed(3)})`;
      ctx.lineWidth = 1.5 + edge.strength * 3 + edge.recent * 3;
      ctx.stroke();
    }

    // --- Chord trail — fading arc through recent chord roots ---
    if (this.chordTrail.length >= 2) {
      const len = this.chordTrail.length;
      for (let i = 0; i < len - 1; i++) {
        const fromPC = this.chordTrail[i];
        const toPC = this.chordTrail[i + 1];
        const p0 = positions[fromPC];
        const p1 = positions[toPC];
        const age = (i + 1) / len;
        const alpha = age * age;
        const lineW = 2 + age * 4;
        const n = this.nodes[toPC];

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = `rgba(${n.r},${n.g},${n.b},${(alpha * 0.15).toFixed(3)})`;
        ctx.lineWidth = lineW + 8;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        const wr = Math.min(255, n.r + Math.round((255 - n.r) * alpha * 0.6));
        const wg = Math.min(255, n.g + Math.round((255 - n.g) * alpha * 0.6));
        const wb = Math.min(255, n.b + Math.round((255 - n.b) * alpha * 0.6));
        ctx.strokeStyle = `rgba(${wr},${wg},${wb},${(alpha * 0.7).toFixed(3)})`;
        ctx.lineWidth = lineW;
        ctx.stroke();
      }
    }

    // --- Draw nodes as Roman numerals ---
    const degreeMap = this.keyMode === 'minor' ? MINOR_DEGREES : MAJOR_DEGREES;

    for (let i = 0; i < 12; i++) {
      const node = this.nodes[i];
      const pos = positions[i];
      const semitones = semitoneOffset(i, this.key);
      const inKey = this.diatonicOffsets.has(semitones);
      const inChord = this.chordNotes.has(i);
      const numeral = degreeMap[semitones];

      const chordBoost = inChord ? 0.25 : 0;
      const alpha = (inKey ? 0.3 : 0.15) + chordBoost + node.brightness * 0.7;

      // Outer glow
      if (node.brightness > 0.05 || inKey || inChord) {
        const glowR = 12 + node.brightness * 15 + (inChord ? 8 : 0);
        const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR);
        const glowAlpha = inChord ? Math.max(alpha * 0.4, 0.15) : alpha * 0.3;
        grad.addColorStop(0, `rgba(${node.r},${node.g},${node.b},${glowAlpha.toFixed(3)})`);
        grad.addColorStop(1, `rgba(${node.r},${node.g},${node.b},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(pos.x - glowR, pos.y - glowR, glowR * 2, glowR * 2);
      }

      const wt = Math.max(node.brightness * node.brightness, inChord ? 0.3 : 0);
      const cr = Math.min(255, node.r + Math.round((255 - node.r) * wt * 0.6));
      const cg = Math.min(255, node.g + Math.round((255 - node.g) * wt * 0.6));
      const cb = Math.min(255, node.b + Math.round((255 - node.b) * wt * 0.6));

      if (numeral) {
        const sizeBoost = inChord ? 3 : 0;
        const fontSize = Math.max(11, Math.round(Math.min(w, h) * 0.025 + node.brightness * 4 + sizeBoost));
        ctx.save();
        ctx.font = `${(inChord || node.brightness > 0.3) ? 'bold ' : ''}${fontSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (node.brightness > 0.05 || inChord) {
          const shadowA = Math.max(node.brightness * 0.6, inChord ? 0.3 : 0);
          ctx.shadowColor = `rgba(${node.r},${node.g},${node.b},${shadowA.toFixed(3)})`;
          ctx.shadowBlur = inChord ? 14 : 10;
        }

        ctx.fillStyle = `rgba(${cr},${cg},${cb},${Math.min(1, alpha).toFixed(3)})`;
        ctx.fillText(numeral, pos.x, pos.y);
        ctx.shadowBlur = 0;
        ctx.restore();
      } else {
        const dotR = 2 + node.brightness * 3 + (inChord ? 2 : 0);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, dotR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${Math.min(1, alpha).toFixed(3)})`;
        ctx.fill();
      }

      // Pulse ring on chord hit
      const timeSinceHit = this.time - node.lastHitTime;
      if (timeSinceHit < 0.6) {
        const pulseT = timeSinceHit / 0.6;
        const pulseR = 12 + pulseT * 25;
        const pulseAlpha = (1 - pulseT) * 0.35;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${node.r},${node.g},${node.b},${pulseAlpha.toFixed(3)})`;
        ctx.lineWidth = 2 * (1 - pulseT);
        ctx.stroke();
      }
    }

    ctx.restore();
    return this.canvas;
  }

  isReady(): boolean { return this.ready; }

  dispose(): void {
    this.ready = false;
    this.edges.clear();
    this.chordTrail.length = 0;
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'radius', label: 'Radius', type: 'range', value: this.radius, min: 0.15, max: 0.85, step: 0.05 },
      { key: 'edgeDecay', label: 'Memory', type: 'range', value: this.edgeDecay, min: 0.9, max: 0.999, step: 0.001 },
      { key: 'webIntensity', label: 'Intensity', type: 'range', value: this.webIntensity, min: 0.2, max: 2.0, step: 0.1 },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'radius') this.radius = value as number;
    if (key === 'edgeDecay') this.edgeDecay = value as number;
    if (key === 'webIntensity') this.webIntensity = value as number;
  }
}
