// --- Harmonic Web Effect ---
// A network graph of the 12 pitch classes arranged in a circle.
// When notes play, their node lights up and edges glow between
// recently-played notes, building a web of harmonic relationships.
// Frequently used intervals become the brightest connections.
// The web breathes and pulses with the music.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { palettes } from '../fractal-engine.ts';

interface NodeState {
  brightness: number;  // current glow 0-1
  hitCount: number;    // total times played (for sizing)
  lastHitTime: number; // for pulse animation
  r: number;
  g: number;
  b: number;
}

interface EdgeState {
  strength: number;    // accumulated strength (decays slowly)
  recent: number;      // recent activation (decays fast, for flash)
}

function samplePaletteColor(paletteIdx: number, pos: number): [number, number, number] {
  const p = palettes[paletteIdx % palettes.length];
  const stops = p.stops;
  let s0 = stops[0], s1 = stops[stops.length - 1];
  for (let j = 0; j < stops.length - 1; j++) {
    if (pos >= stops[j].pos && pos <= stops[j + 1].pos) {
      s0 = stops[j];
      s1 = stops[j + 1];
      break;
    }
  }
  const range = s1.pos - s0.pos;
  const f = range === 0 ? 0 : (pos - s0.pos) / range;
  return [
    Math.round(s0.color[0] + (s1.color[0] - s0.color[0]) * f),
    Math.round(s0.color[1] + (s1.color[1] - s0.color[1]) * f),
    Math.round(s0.color[2] + (s1.color[2] - s0.color[2]) * f),
  ];
}

export class MelodyWebEffect implements VisualEffect {
  readonly id = 'melody-web';
  readonly name = 'Harmonic Web';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'screen';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private ready = false;

  // 12 pitch class nodes
  private nodes: NodeState[] = [];
  // Edges: 66 unique pairs (12 choose 2), indexed as i*12+j where i<j
  private edges: Map<number, EdgeState> = new Map();

  private lastPitchClass = -1;
  private time = 0;
  private key = 0;
  private breathPhase = 0;

  // Config
  private radius = 0.35;
  private edgeDecay = 0.97;   // per-frame multiplier for accumulated strength
  private nodeDecay = 3.0;    // exponential decay rate for node brightness
  private webIntensity = 1.0;

  private readonly MAJOR_OFFSETS = new Set([0, 2, 4, 5, 7, 9, 11]);
  private readonly MINOR_OFFSETS = new Set([0, 2, 3, 5, 7, 8, 10]);
  private diatonicOffsets: Set<number> = this.MAJOR_OFFSETS;

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
        r: c[0],
        g: c[1],
        b: c[2],
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
    this.breathPhase += dt * 0.8;
    this.key = music.key;
    this.diatonicOffsets = music.keyMode === 'minor' ? this.MINOR_OFFSETS : this.MAJOR_OFFSETS;

    // Melody onset — light up node and create/strengthen edge
    if (music.melodyOnset && music.melodyPitchClass >= 0 && music.melodyVelocity > 0) {
      const pc = music.melodyPitchClass;
      const node = this.nodes[pc];
      node.brightness = 1.0;
      node.hitCount++;
      node.lastHitTime = this.time;

      // Update color from current palette
      const c = samplePaletteColor(pc, 0.75);
      node.r = c[0];
      node.g = c[1];
      node.b = c[2];

      // Create edge to previous note
      if (this.lastPitchClass >= 0 && this.lastPitchClass !== pc) {
        const ek = this.edgeKey(pc, this.lastPitchClass);
        const edge = this.edges.get(ek) ?? { strength: 0, recent: 0 };
        edge.strength = Math.min(1.0, edge.strength + 0.15);
        edge.recent = 1.0;
        this.edges.set(ek, edge);
      }

      this.lastPitchClass = pc;
    }

    // Beat pulse — briefly brighten all active nodes
    if (music.kick) {
      for (const node of this.nodes) {
        if (node.brightness > 0.05) {
          node.brightness = Math.min(1.0, node.brightness + 0.2);
        }
      }
    }

    // Decay nodes
    for (const node of this.nodes) {
      node.brightness *= Math.exp(-this.nodeDecay * dt);
    }

    // Decay edges
    for (const [key, edge] of this.edges) {
      edge.strength *= this.edgeDecay;
      edge.recent *= Math.exp(-5.0 * dt);
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

    // Compute node positions (key at 12 o'clock)
    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 12; i++) {
      const semitones = ((i - this.key + 12) % 12);
      const angle = (semitones / 12) * Math.PI * 2 - Math.PI / 2;
      positions.push({
        x: cx + Math.cos(angle) * r * breath,
        y: cy + Math.sin(angle) * r * breath,
      });
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Draw edges
    for (const [key, edge] of this.edges) {
      const lo = Math.floor(key / 12);
      const hi = key % 12;
      const p0 = positions[lo];
      const p1 = positions[hi];
      const totalAlpha = (edge.strength * 0.4 + edge.recent * 0.6) * this.webIntensity;
      if (totalAlpha < 0.005) continue;

      // Blend colors of the two nodes
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
      ctx.lineWidth = 6 + edge.recent * 8;
      ctx.stroke();

      // Core line
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      const bright = edge.recent * 0.5;
      const wr = Math.min(255, mr + Math.round((255 - mr) * bright));
      const wg = Math.min(255, mg + Math.round((255 - mg) * bright));
      const wb = Math.min(255, mb + Math.round((255 - mb) * bright));
      ctx.strokeStyle = `rgba(${wr},${wg},${wb},${(totalAlpha * 0.5).toFixed(3)})`;
      ctx.lineWidth = 1 + edge.strength * 2 + edge.recent * 2;
      ctx.stroke();
    }

    // Draw nodes
    for (let i = 0; i < 12; i++) {
      const node = this.nodes[i];
      const pos = positions[i];
      const semitones = ((i - this.key + 12) % 12);
      const inKey = this.diatonicOffsets.has(semitones);

      // Base size from hit count, boosted by current brightness
      const baseR = 3 + Math.min(node.hitCount * 0.3, 4);
      const activeR = baseR + node.brightness * 6;
      const alpha = (inKey ? 0.3 : 0.15) + node.brightness * 0.7;

      // Outer glow
      if (node.brightness > 0.05 || inKey) {
        const glowR = activeR * 3;
        const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR);
        grad.addColorStop(0, `rgba(${node.r},${node.g},${node.b},${(alpha * 0.3).toFixed(3)})`);
        grad.addColorStop(1, `rgba(${node.r},${node.g},${node.b},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(pos.x - glowR, pos.y - glowR, glowR * 2, glowR * 2);
      }

      // Core dot
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, activeR, 0, Math.PI * 2);
      // Bright white center on active notes
      const wt = node.brightness * node.brightness;
      const cr = Math.min(255, node.r + Math.round((255 - node.r) * wt * 0.6));
      const cg = Math.min(255, node.g + Math.round((255 - node.g) * wt * 0.6));
      const cb = Math.min(255, node.b + Math.round((255 - node.b) * wt * 0.6));
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
      ctx.fill();

      // Pulse ring on recent hit
      const timeSinceHit = this.time - node.lastHitTime;
      if (timeSinceHit < 0.5) {
        const pulseT = timeSinceHit / 0.5;
        const pulseR = activeR + pulseT * 20;
        const pulseAlpha = (1 - pulseT) * 0.3;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${node.r},${node.g},${node.b},${pulseAlpha.toFixed(3)})`;
        ctx.lineWidth = 1.5 * (1 - pulseT);
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
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'radius', label: 'Radius', type: 'range', value: this.radius, min: 0.15, max: 0.45, step: 0.05 },
      { key: 'edgeDecay', label: 'Memory', type: 'range', value: this.edgeDecay, min: 0.9, max: 0.999, step: 0.005 },
      { key: 'webIntensity', label: 'Intensity', type: 'range', value: this.webIntensity, min: 0.2, max: 2.0, step: 0.1 },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'radius') this.radius = value as number;
    if (key === 'edgeDecay') this.edgeDecay = value as number;
    if (key === 'webIntensity') this.webIntensity = value as number;
  }
}
