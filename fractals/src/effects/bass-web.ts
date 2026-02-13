// --- Bass Web Effect ---
// Slow, diffuse version of the melody web. Lights up nodes and edges
// only on chord root changes, creating a deep harmonic undertone layer.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { samplePaletteColor, MAJOR_OFFSETS, MINOR_OFFSETS, MAJOR_DEGREES, MINOR_DEGREES, semitoneOffset } from './effect-utils.ts';

interface NodeState {
  brightness: number;
  r: number;
  g: number;
  b: number;
}

interface EdgeState {
  strength: number;
  progress: number; // 0→1 animated travel along edge
  from: number;     // source node (pitch class)
  to: number;       // destination node (pitch class)
}

export class BassWebEffect implements VisualEffect {
  readonly id = 'bass-web';
  readonly name = 'Bass Web';
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

  private lastRoot = -1;
  private awake = false; // skip idle updates until real playback
  private time = 0;
  private key = 0;
  private breathPhase = 0;

  // Config
  private radius = 0.85;
  private edgeDecay = 0.9992;    // ~5.8s half-life at 60fps
  private nodeDecay = 1.5;       // moderate node fade
  private intensity = 0.8;

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
      const c = samplePaletteColor(i, 0.4); // darker sample point
      this.nodes.push({ brightness: 0, r: c[0], g: c[1], b: c[2] });
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
    this.breathPhase += dt * 0.3; // slower breathing than melody web
    this.key = music.key;
    this.keyMode = music.keyMode;
    this.diatonicOffsets = music.keyMode === 'minor' ? MINOR_OFFSETS : MAJOR_OFFSETS;

    // Don't track roots until real playback (currentTime advancing)
    if (!this.awake) {
      if (music.currentTime > 0.1) this.awake = true;
      else return;
    }

    // Only react to chord root changes
    const root = music.chordRoot;
    if (root >= 0 && root !== this.lastRoot) {
      const node = this.nodes[root];
      node.brightness = 1.0;

      const c = samplePaletteColor(root, 0.65);
      node.r = c[0];
      node.g = c[1];
      node.b = c[2];

      // Edge to previous root — starts at progress 0, animates to 1
      if (this.lastRoot >= 0 && this.lastRoot !== root) {
        const ek = this.edgeKey(root, this.lastRoot);
        const edge = this.edges.get(ek) ?? { strength: 0, progress: 0, from: this.lastRoot, to: root };
        edge.strength = Math.min(1.0, edge.strength + 0.5);
        edge.progress = 0; // restart travel animation
        edge.from = this.lastRoot;
        edge.to = root;
        this.edges.set(ek, edge);
      }

      this.lastRoot = root;
    }

    // === GROOVE CURVES ===
    const barAnticipation = music.barAnticipation ?? 0;
    const barArrival = music.barArrival ?? 0;
    const beatGroove = music.beatGroove ?? 0.5;

    // Bar boundary pulse — re-brighten current root node and its edges
    // Use bar arrival for impact instead of just boundary detection
    if (barArrival > 0.3 && this.lastRoot >= 0) {
      const node = this.nodes[this.lastRoot];
      node.brightness = Math.min(1.0, node.brightness + barArrival * 0.7);
      for (const [, edge] of this.edges) {
        if (edge.strength > 0.01) {
          edge.strength = Math.min(1.0, edge.strength + barArrival * 0.2);
        }
      }
    }

    // Bar anticipation creates subtle pre-glow
    if (barAnticipation > 0.1 && this.lastRoot >= 0) {
      const node = this.nodes[this.lastRoot];
      node.brightness = Math.min(1.0, node.brightness + barAnticipation * 0.1);
    }

    // Beat groove adds subtle pulse to current root
    if (beatGroove > 0.7 && this.lastRoot >= 0) {
      const node = this.nodes[this.lastRoot];
      node.brightness = Math.min(1.0, node.brightness + (beatGroove - 0.7) * 0.15);
    }

    // Slow decay
    for (const node of this.nodes) {
      node.brightness *= Math.exp(-this.nodeDecay * dt);
    }

    for (const [key, edge] of this.edges) {
      edge.strength *= this.edgeDecay;
      // Animate edge travel — ~1.5s to fully extend
      if (edge.progress < 1) {
        edge.progress = Math.min(1, edge.progress + dt * 0.7);
      }
      if (edge.strength < 0.001) {
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
    const breath = 1 + Math.sin(this.breathPhase) * 0.03;

    // Node positions — same circle layout as melody web, key at 12 o'clock
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

    // Draw edges — wide, diffuse, animated travel
    for (const [key, edge] of this.edges) {
      const lo = Math.floor(key / 12);
      const hi = key % 12;
      // Draw from source to destination based on progress
      const src = positions[edge.from];
      const dst = positions[edge.to];

      const s = edge.strength;
      // Cliff curve: holds bright above 0.15, then drops fast
      const t = Math.min(Math.max(s / 0.15, 0), 1);
      const cliff = t * t * t; // cubic — holds high then plummets
      const alpha = cliff * this.intensity;
      if (alpha < 0.003) continue;

      // Ease the progress for smooth deceleration
      const ep = edge.progress;
      const eased = ep * (2 - ep); // quadratic ease-out
      const ex = src.x + (dst.x - src.x) * eased;
      const ey = src.y + (dst.y - src.y) * eased;

      const n0 = this.nodes[lo];
      const n1 = this.nodes[hi];
      const mr = Math.round((n0.r + n1.r) / 2);
      const mg = Math.round((n0.g + n1.g) / 2);
      const mb = Math.round((n0.b + n1.b) / 2);

      // Outer haze
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = `rgba(${mr},${mg},${mb},${(alpha * 0.1).toFixed(3)})`;
      ctx.lineWidth = 30 + s * 20;
      ctx.stroke();

      // Wide diffuse glow
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = `rgba(${mr},${mg},${mb},${(alpha * 0.25).toFixed(3)})`;
      ctx.lineWidth = 12 + s * 12;
      ctx.stroke();

      // Bright core
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = `rgba(${mr},${mg},${mb},${(alpha * 0.5).toFixed(3)})`;
      ctx.lineWidth = 3 + s * 5;
      ctx.stroke();
    }

    // Draw nodes — large diffuse glows, small Roman numerals
    const degreeMap = this.keyMode === 'minor' ? MINOR_DEGREES : MAJOR_DEGREES;

    for (let i = 0; i < 12; i++) {
      const node = this.nodes[i];
      const pos = positions[i];
      const semitones = semitoneOffset(i, this.key);
      const inKey = this.diatonicOffsets.has(semitones);
      const numeral = degreeMap[semitones];

      const b3 = node.brightness * node.brightness * node.brightness; // cubic cliff
      const alpha = (inKey ? 0.25 : 0.1) + b3 * 0.75;

      // Large diffuse glow
      if (node.brightness > 0.03 || inKey) {
        const glowR = 30 + node.brightness * 35;
        const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR);
        grad.addColorStop(0, `rgba(${node.r},${node.g},${node.b},${(alpha * 0.5).toFixed(3)})`);
        grad.addColorStop(0.4, `rgba(${node.r},${node.g},${node.b},${(alpha * 0.2).toFixed(3)})`);
        grad.addColorStop(1, `rgba(${node.r},${node.g},${node.b},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(pos.x - glowR, pos.y - glowR, glowR * 2, glowR * 2);
      }

      if (numeral) {
        const fontSize = Math.max(11, Math.round(Math.min(w, h) * 0.022 + node.brightness * 4));
        ctx.font = `bold ${fontSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(${node.r},${node.g},${node.b},${Math.min(1, alpha).toFixed(3)})`;
        ctx.fillText(numeral, pos.x, pos.y);
      } else {
        const dotR = 2.5 + node.brightness * 3;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, dotR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${node.r},${node.g},${node.b},${Math.min(1, alpha * 0.7).toFixed(3)})`;
        ctx.fill();
      }
    }

    ctx.restore();
    return this.canvas;
  }

  isReady(): boolean { return this.ready; }

  reset(): void {
    this.edges.clear();
    this.lastRoot = -1;
    this.awake = false;
    for (const node of this.nodes) node.brightness = 0;
  }

  dispose(): void {
    this.ready = false;
    this.reset();
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'radius', label: 'Radius', type: 'range', value: this.radius, min: 0.15, max: 0.85, step: 0.05 },
      { key: 'intensity', label: 'Intensity', type: 'range', value: this.intensity, min: 0.2, max: 2.0, step: 0.1 },
    ];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return { radius: 0.85, intensity: 1.0 };
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'radius') this.radius = value as number;
    if (key === 'intensity') this.intensity = value as number;
  }
}
