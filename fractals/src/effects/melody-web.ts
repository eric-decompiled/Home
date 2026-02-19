// --- Melody Web Effect ---
// A network graph of the 12 pitch classes arranged in a circle.
// When melody notes play, their node lights up and edges glow between
// recently-played notes, building a web of melodic relationships.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { samplePaletteColor, MAJOR_OFFSETS, MINOR_OFFSETS, chordTriad, semitoneOffset } from './effect-utils.ts';

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

export class MelodyWebEffect implements VisualEffect {
  readonly id = 'melody-web';
  readonly name = 'Melody Web';
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
  // Melody trail: last N pitch classes for trailing arc
  private melodyTrail: number[] = [];

  private lastPitchClass = -1;
  private time = 0;
  private key = 0;
  private breathPhase = 0;
  private chordNotes: Set<number> = new Set(); // pitch classes in current chord

  // Config
  private radius = 0.85;
  private edgeDecay = 0.9995; // per-frame multiplier for accumulated strength
  private nodeDecay = 3.0;    // exponential decay rate for node brightness
  private webIntensity = 1.0;

  private diatonicOffsets: Set<number> = MAJOR_OFFSETS;

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
    this.diatonicOffsets = music.keyMode === 'minor' ? MINOR_OFFSETS : MAJOR_OFFSETS;
    this.chordNotes = chordTriad(music.chordRoot, music.chordQuality);

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

      // Create edges to all recently-active nodes (not just the previous note)
      for (let j = 0; j < 12; j++) {
        if (j === pc) continue;
        const other = this.nodes[j];
        if (other.brightness < 0.05) continue;
        const ek = this.edgeKey(pc, j);
        const edge = this.edges.get(ek) ?? { strength: 0, recent: 0 };
        // Stronger connection to brighter (more recent) nodes
        const boost = j === this.lastPitchClass ? 0.15 : 0.08 * other.brightness;
        edge.strength = Math.min(1.0, edge.strength + boost);
        edge.recent = Math.max(edge.recent, j === this.lastPitchClass ? 1.0 : 0.5 * other.brightness);
        this.edges.set(ek, edge);

      }

      // Push to melody trail
      if (this.melodyTrail.length === 0 || this.melodyTrail[this.melodyTrail.length - 1] !== pc) {
        this.melodyTrail.push(pc);
        if (this.melodyTrail.length > 6) {
          this.melodyTrail.shift();
        }
      }

      this.lastPitchClass = pc;
    }

    // === GROOVE CURVES ===
    const beatArrival = music.beatArrival ?? 0;
    const barArrival = music.barArrival ?? 0;

    // Beat pulse — briefly brighten all active nodes on strong drum hits
    if (music.drumEnergy > 0.5) {
      for (const node of this.nodes) {
        if (node.brightness > 0.05) {
          node.brightness = Math.min(1.0, node.brightness + 0.2 * music.drumEnergy);
        }
      }
    }

    // Groove-driven pulse on active nodes
    if (beatArrival > 0.1) {
      const arrivalPulse = beatArrival * 0.15;
      for (const node of this.nodes) {
        if (node.brightness > 0.05) {
          node.brightness = Math.min(1.0, node.brightness + arrivalPulse);
        }
      }
    }
    // Bar arrival creates bigger pulse
    if (barArrival > 0.1) {
      const barPulse = barArrival * 0.2;
      for (const node of this.nodes) {
        if (node.brightness > 0.03) {
          node.brightness = Math.min(1.0, node.brightness + barPulse);
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
      const semitones = semitoneOffset(i, this.key);
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
      // Hold bright most of their life, then drop off sharply near death
      // smoothstep(0, 0.3, s) stays ~1.0 above 0.3, falls to 0 below
      const s = edge.strength;
      const t = Math.min(Math.max(s / 0.3, 0), 1);
      const strengthAlpha = t * t * (3 - 2 * t);
      const totalAlpha = (strengthAlpha * 0.4 + edge.recent * 0.6) * this.webIntensity;
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

    // Draw melody trail — fading arc through recent melody notes
    if (this.melodyTrail.length >= 2) {
      const len = this.melodyTrail.length;
      for (let i = 0; i < len - 1; i++) {
        const fromPC = this.melodyTrail[i];
        const toPC = this.melodyTrail[i + 1];
        const p0 = positions[fromPC];
        const p1 = positions[toPC];
        const age = (i + 1) / len;
        const alpha = age * age;
        const lineW = 1.5 + age * 3;
        const n = this.nodes[toPC];

        // Glow pass
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = `rgba(${n.r},${n.g},${n.b},${(alpha * 0.15).toFixed(3)})`;
        ctx.lineWidth = lineW + 6;
        ctx.stroke();

        // Core pass
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

    // Draw nodes as dots
    for (let i = 0; i < 12; i++) {
      const node = this.nodes[i];
      const pos = positions[i];
      const semitones = semitoneOffset(i, this.key);
      const inKey = this.diatonicOffsets.has(semitones);
      const inChord = this.chordNotes.has(i);

      // Chord tones get a brightness boost
      const chordBoost = inChord ? 0.25 : 0;
      const alpha = (inKey ? 0.3 : 0.15) + chordBoost + node.brightness * 0.7;

      // Outer glow — chord tones always glow
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

      // Dot — larger for diatonic, smaller for chromatic
      const baseR = inKey ? 4 : 2;
      const dotR = baseR + node.brightness * 4 + (inChord ? 3 : 0);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${Math.min(1, alpha).toFixed(3)})`;
      ctx.fill()

      // Pulse ring on recent hit
      const timeSinceHit = this.time - node.lastHitTime;
      if (timeSinceHit < 0.5) {
        const pulseT = timeSinceHit / 0.5;
        const pulseR = 10 + pulseT * 20;
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
    this.melodyTrail.length = 0;
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'webIntensity', label: 'Intensity', type: 'range', value: this.webIntensity, min: 0.5, max: 2.0, step: 0.1 },
    ];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return { radius: 0.85, edgeDecay: 0.9995, webIntensity: 1.0 };
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'radius') this.radius = value as number;
    if (key === 'edgeDecay') this.edgeDecay = value as number;
    if (key === 'webIntensity') this.webIntensity = value as number;
  }
}
