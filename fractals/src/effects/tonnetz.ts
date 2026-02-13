// --- Tonnetz Effect ---
// Hexagonal lattice representing harmonic relationships between pitch classes.
// Based on neo-Riemannian theory: adjacent triangles share smooth voice leading.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { palettes } from '../fractal-engine.ts';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface HexCoord {
  q: number;
  r: number;
}

function generateTonnetzPositions(): Map<number, HexCoord[]> {
  const positions = new Map<number, HexCoord[]>();
  for (let pc = 0; pc < 12; pc++) {
    positions.set(pc, []);
  }
  // Symmetric ranges for centered grid
  for (let q = -5; q <= 5; q++) {
    for (let r = -4; r <= 4; r++) {
      const pc = ((7 * q + 4 * r) % 12 + 12) % 12;
      positions.get(pc)!.push({ q, r });
    }
  }
  return positions;
}

function hexToPixel(q: number, r: number, size: number, centerX: number, centerY: number): { x: number; y: number } {
  const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r) + centerX;
  const y = size * (3 / 2 * r) + centerY;
  return { x, y };
}

export class TonnetzEffect implements VisualEffect {
  readonly id = 'tonnetz';
  readonly name = 'Tonnetz';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'source-over';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private ready = false;
  private width = 800;
  private height = 600;

  private tonnetzPositions: Map<number, HexCoord[]>;
  private hexSize = 50;

  // Animation state
  private time = 0;
  private activePitchClasses: Set<number> = new Set();
  private pitchClassBrightness: number[] = new Array(12).fill(0);
  private currentChordRoot = -1;
  private currentChordQuality = '';
  private chordTriangleOpacity = 0;

  // Chord history for path tracing
  private chordHistory: Array<{ root: number; quality: string; time: number }> = [];
  private maxHistoryLength = 8;

  // Recent notes for arpeggio detection
  private recentNotes: Array<{ pitchClass: number; time: number }> = [];
  private arpeggioWindow = 2.0;
  private detectedArpeggios: Array<{ pitchClasses: number[]; opacity: number }> = [];

  // Beat pulse
  private beatPulse = 0;
  private barPulse = 0;

  // Colors
  private baseColor: [number, number, number] = [30, 40, 60];
  private accentColor: [number, number, number] = [100, 150, 255];
  private chordColor: [number, number, number] = [255, 200, 100];

  constructor() {
    this.canvas = document.createElement('canvas');
    this.tonnetzPositions = generateTonnetzPositions();
  }

  init(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    this.hexSize = Math.min(width, height) / 16;
    this.ready = true;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.hexSize = Math.min(width, height) / 16;
  }

  update(dt: number, music: MusicParams): void {
    dt = Math.min(dt, 0.1);
    this.time += dt;

    this.activePitchClasses.clear();
    for (const voice of music.activeVoices) {
      this.activePitchClasses.add(voice.pitchClass);
      if (voice.onset) {
        this.pitchClassBrightness[voice.pitchClass] = 1.0;
        this.recentNotes.push({ pitchClass: voice.pitchClass, time: this.time });
      }
    }

    const cutoff = this.time - this.arpeggioWindow;
    this.recentNotes = this.recentNotes.filter(n => n.time > cutoff);
    this.detectArpeggios();

    for (const arp of this.detectedArpeggios) {
      arp.opacity *= Math.exp(-0.4 * dt);
    }
    this.detectedArpeggios = this.detectedArpeggios.filter(a => a.opacity > 0.05);

    for (let i = 0; i < 12; i++) {
      if (this.activePitchClasses.has(i)) {
        this.pitchClassBrightness[i] = Math.max(this.pitchClassBrightness[i], 0.7);
      }
      this.pitchClassBrightness[i] *= Math.exp(-2.5 * dt);
    }

    if (music.chordRoot >= 0) {
      if (music.chordRoot !== this.currentChordRoot || music.chordQuality !== this.currentChordQuality) {
        this.currentChordRoot = music.chordRoot;
        this.currentChordQuality = music.chordQuality;
        this.chordTriangleOpacity = 1.0;
        this.chordHistory.push({ root: music.chordRoot, quality: music.chordQuality, time: this.time });
        while (this.chordHistory.length > this.maxHistoryLength) {
          this.chordHistory.shift();
        }
      }
    }

    this.chordTriangleOpacity *= Math.exp(-0.3 * dt);
    this.chordTriangleOpacity = Math.max(this.chordTriangleOpacity, 0.4);

    // === GROOVE CURVES ===
    // Use arrival for impact (replaces boolean triggers)
    // Use anticipation for pre-beat glow
    const beatArrival = music.beatArrival ?? 0;
    const barArrival = music.barArrival ?? 0;
    const anticipation = music.beatAnticipation ?? 0;

    // Blend arrival impact with anticipation glow
    // This creates a "breathe in, hit" cycle
    this.beatPulse = Math.max(this.beatPulse, beatArrival * 0.4);
    this.barPulse = Math.max(this.barPulse, barArrival * 0.6);
    // Add subtle anticipation glow
    this.beatPulse += anticipation * 0.1 * (1 - this.beatPulse);

    this.beatPulse *= Math.exp(-4.0 * dt);
    this.barPulse *= Math.exp(-2.0 * dt);

    const palIdx = music.key >= 0 && music.key < palettes.length ? music.key : 0;
    const pal = palettes[palIdx];
    if (pal && pal.stops.length >= 3) {
      this.baseColor = [...pal.stops[0].color] as [number, number, number];
      this.accentColor = [...pal.stops[2].color] as [number, number, number];
      this.chordColor = [...pal.stops[4]?.color ?? pal.stops[2].color] as [number, number, number];
    }
  }

  private detectArpeggios(): void {
    const recentPCs = [...new Set(this.recentNotes.map(n => n.pitchClass))];
    if (recentPCs.length < 3) return;

    for (const root of recentPCs) {
      const maj3 = (root + 4) % 12;
      const min3 = (root + 3) % 12;
      const p5 = (root + 7) % 12;
      const dom7 = (root + 10) % 12;
      const maj7 = (root + 11) % 12;
      const dim5 = (root + 6) % 12;
      const aug5 = (root + 8) % 12;

      if (recentPCs.includes(maj3) && recentPCs.includes(p5)) this.addArpeggio([root, maj3, p5]);
      if (recentPCs.includes(min3) && recentPCs.includes(p5)) this.addArpeggio([root, min3, p5]);
      if (recentPCs.includes(maj3) && recentPCs.includes(p5) && recentPCs.includes(dom7)) this.addArpeggio([root, maj3, p5, dom7]);
      if (recentPCs.includes(min3) && recentPCs.includes(p5) && recentPCs.includes(dom7)) this.addArpeggio([root, min3, p5, dom7]);
      if (recentPCs.includes(maj3) && recentPCs.includes(p5) && recentPCs.includes(maj7)) this.addArpeggio([root, maj3, p5, maj7]);
      if (recentPCs.includes(min3) && recentPCs.includes(dim5)) this.addArpeggio([root, min3, dim5]);
      if (recentPCs.includes(maj3) && recentPCs.includes(aug5)) this.addArpeggio([root, maj3, aug5]);
    }
  }

  private addArpeggio(pitchClasses: number[]): void {
    const key = [...pitchClasses].sort((a, b) => a - b).join(',');
    const existing = this.detectedArpeggios.find(a => [...a.pitchClasses].sort((a, b) => a - b).join(',') === key);
    if (existing) {
      existing.opacity = Math.min(1.0, existing.opacity + 0.3);
    } else {
      this.detectedArpeggios.push({ pitchClasses, opacity: 1.0 });
    }
  }

  render(): HTMLCanvasElement {
    if (!this.ctx) return this.canvas;
    const ctx = this.ctx;

    // Clear to transparent - let background layer show through
    ctx.clearRect(0, 0, this.width, this.height);

    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const size = this.hexSize * (1 + this.barPulse * 0.05);

    this.drawEdges(ctx, centerX, centerY, size);
    this.drawChordPath(ctx, centerX, centerY, size);
    this.drawArpeggios(ctx, centerX, centerY, size);
    this.drawChordShape(ctx, centerX, centerY, size);
    this.drawNodes(ctx, centerX, centerY, size);

    return this.canvas;
  }

  private drawEdges(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number): void {
    ctx.strokeStyle = `rgba(${this.accentColor[0]}, ${this.accentColor[1]}, ${this.accentColor[2]}, 0.3)`;
    ctx.lineWidth = 1;

    const drawnEdges = new Set<string>();
    for (const [_pc, positions] of this.tonnetzPositions) {
      for (const pos of positions) {
        const { x: x1, y: y1 } = hexToPixel(pos.q, pos.r, size, centerX, centerY);
        if (x1 < -size || x1 > this.width + size || y1 < -size || y1 > this.height + size) continue;

        const neighbors = [
          { q: pos.q + 1, r: pos.r },
          { q: pos.q, r: pos.r + 1 },
          { q: pos.q - 1, r: pos.r + 1 },
        ];

        for (const n of neighbors) {
          const edgeKey = `${Math.min(pos.q, n.q)},${Math.min(pos.r, n.r)}-${Math.max(pos.q, n.q)},${Math.max(pos.r, n.r)}`;
          if (drawnEdges.has(edgeKey)) continue;
          drawnEdges.add(edgeKey);

          const { x: x2, y: y2 } = hexToPixel(n.q, n.r, size, centerX, centerY);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
    }
  }

  private drawNodes(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number): void {
    const nodeRadius = size * 0.25;

    for (const [pc, positions] of this.tonnetzPositions) {
      const brightness = this.pitchClassBrightness[pc];
      const isActive = this.activePitchClasses.has(pc);

      for (const pos of positions) {
        const { x, y } = hexToPixel(pos.q, pos.r, size, centerX, centerY);
        if (x < -nodeRadius || x > this.width + nodeRadius || y < -nodeRadius || y > this.height + nodeRadius) continue;

        const pcPalette = palettes[pc];
        const pcColor = pcPalette?.stops[3]?.color ?? this.accentColor;

        if (brightness > 0.1) {
          const glowRadius = nodeRadius * (1.5 + brightness);
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
          gradient.addColorStop(0, `rgba(${pcColor[0]}, ${pcColor[1]}, ${pcColor[2]}, ${brightness * 0.6})`);
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        const baseAlpha = 0.5 + brightness * 0.5 + this.beatPulse * 0.1;
        const r = Math.min(255, this.baseColor[0] + brightness * (pcColor[0] - this.baseColor[0]));
        const g = Math.min(255, this.baseColor[1] + brightness * (pcColor[1] - this.baseColor[1]));
        const b = Math.min(255, this.baseColor[2] + brightness * (pcColor[2] - this.baseColor[2]));

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${baseAlpha})`;
        ctx.beginPath();
        ctx.arc(x, y, nodeRadius * (1 + brightness * 0.3), 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(${pcColor[0]}, ${pcColor[1]}, ${pcColor[2]}, ${0.3 + brightness * 0.5})`;
        ctx.lineWidth = isActive ? 2 : 1;
        ctx.stroke();

        ctx.fillStyle = `rgba(${pcColor[0]}, ${pcColor[1]}, ${pcColor[2]}, ${0.7 + brightness * 0.3})`;
        ctx.font = `bold ${Math.max(10, nodeRadius * 0.8)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(NOTE_NAMES[pc], x, y);
      }
    }
  }

  private drawChordShape(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number): void {
    if (this.currentChordRoot < 0) return;

    const root = this.currentChordRoot;
    const quality = this.currentChordQuality;

    let third = quality.includes('min') || quality === 'dim' ? (root + 3) % 12 : (root + 4) % 12;
    let fifth = quality === 'dim' ? (root + 6) % 12 : quality === 'aug' ? (root + 8) % 12 : (root + 7) % 12;

    const is7th = quality.includes('7');
    const seventh = is7th ? (quality === 'maj7' ? (root + 11) % 12 : (root + 10) % 12) : -1;

    const rootPositions = this.tonnetzPositions.get(root) ?? [];
    const thirdPositions = this.tonnetzPositions.get(third) ?? [];
    const fifthPositions = this.tonnetzPositions.get(fifth) ?? [];
    const seventhPositions = is7th ? (this.tonnetzPositions.get(seventh) ?? []) : [];

    const isAdjacent = (a: HexCoord, b: HexCoord) => {
      const dq = Math.abs(a.q - b.q);
      const dr = Math.abs(a.r - b.r);
      const ds = Math.abs((a.q + a.r) - (b.q + b.r));
      return dq <= 1 && dr <= 1 && ds <= 1 && (dq + dr + ds <= 2);
    };

    for (const rp of rootPositions) {
      const { x: rx, y: ry } = hexToPixel(rp.q, rp.r, size, centerX, centerY);
      if (rx < 0 || rx > this.width || ry < 0 || ry > this.height) continue;

      for (const tp of thirdPositions) {
        if (!isAdjacent(rp, tp)) continue;
        for (const fp of fifthPositions) {
          if (!isAdjacent(rp, fp) || !isAdjacent(tp, fp)) continue;

          const { x: tx, y: ty } = hexToPixel(tp.q, tp.r, size, centerX, centerY);
          const { x: fx, y: fy } = hexToPixel(fp.q, fp.r, size, centerX, centerY);

          if (is7th) {
            for (const sp of seventhPositions) {
              if ([rp, tp, fp].filter(p => isAdjacent(p, sp)).length < 2) continue;
              const { x: sx, y: sy } = hexToPixel(sp.q, sp.r, size, centerX, centerY);
              const cx = (rx + tx + fx + sx) / 4;
              const cy = (ry + ty + fy + sy) / 4;
              const vertices = [{ x: rx, y: ry }, { x: tx, y: ty }, { x: fx, y: fy }, { x: sx, y: sy }]
                .sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));

              ctx.fillStyle = `rgba(${this.chordColor[0]}, ${this.chordColor[1]}, ${this.chordColor[2]}, ${this.chordTriangleOpacity * 0.4})`;
              ctx.beginPath();
              ctx.moveTo(vertices[0].x, vertices[0].y);
              for (let i = 1; i < vertices.length; i++) ctx.lineTo(vertices[i].x, vertices[i].y);
              ctx.closePath();
              ctx.fill();
              ctx.strokeStyle = `rgba(${this.chordColor[0]}, ${this.chordColor[1]}, ${this.chordColor[2]}, ${this.chordTriangleOpacity * 0.9})`;
              ctx.lineWidth = 2 + this.beatPulse * 2;
              ctx.stroke();
              return;
            }
          } else {
            ctx.fillStyle = `rgba(${this.chordColor[0]}, ${this.chordColor[1]}, ${this.chordColor[2]}, ${this.chordTriangleOpacity * 0.4})`;
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.lineTo(tx, ty);
            ctx.lineTo(fx, fy);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = `rgba(${this.chordColor[0]}, ${this.chordColor[1]}, ${this.chordColor[2]}, ${this.chordTriangleOpacity * 0.9})`;
            ctx.lineWidth = 2 + this.beatPulse * 2;
            ctx.stroke();
            return;
          }
        }
      }
    }
  }

  private drawArpeggios(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number): void {
    const isAdjacent = (a: HexCoord, b: HexCoord) => {
      const dq = Math.abs(a.q - b.q);
      const dr = Math.abs(a.r - b.r);
      const ds = Math.abs((a.q + a.r) - (b.q + b.r));
      return dq <= 1 && dr <= 1 && ds <= 1 && (dq + dr + ds <= 2);
    };

    for (const arpeggio of this.detectedArpeggios) {
      const pcs = arpeggio.pitchClasses;
      if (pcs.length < 3) continue;

      const allPositions = pcs.map(pc => this.tonnetzPositions.get(pc) ?? []);

      for (const startPos of allPositions[0]) {
        const { x: sx, y: sy } = hexToPixel(startPos.q, startPos.r, size, centerX, centerY);
        if (sx < -size || sx > this.width + size || sy < -size || sy > this.height + size) continue;

        const shapePositions: Array<{ x: number; y: number }> = [{ x: sx, y: sy }];
        const hexPositions: HexCoord[] = [startPos];
        let valid = true;

        for (let i = 1; i < allPositions.length && valid; i++) {
          let found = false;
          for (const pos of allPositions[i]) {
            if (hexPositions.some(hp => isAdjacent(hp, pos))) {
              const { x, y } = hexToPixel(pos.q, pos.r, size, centerX, centerY);
              shapePositions.push({ x, y });
              hexPositions.push(pos);
              found = true;
              break;
            }
          }
          if (!found) valid = false;
        }

        if (!valid || shapePositions.length < 3) continue;

        const cx = shapePositions.reduce((s, p) => s + p.x, 0) / shapePositions.length;
        const cy = shapePositions.reduce((s, p) => s + p.y, 0) / shapePositions.length;
        const sorted = [...shapePositions].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));

        const rootPc = pcs[0];
        const arpColor = palettes[rootPc]?.stops[3]?.color ?? this.accentColor;

        ctx.fillStyle = `rgba(${arpColor[0]}, ${arpColor[1]}, ${arpColor[2]}, ${arpeggio.opacity * 0.4})`;
        ctx.beginPath();
        ctx.moveTo(sorted[0].x, sorted[0].y);
        for (let i = 1; i < sorted.length; i++) ctx.lineTo(sorted[i].x, sorted[i].y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = `rgba(${arpColor[0]}, ${arpColor[1]}, ${arpColor[2]}, ${arpeggio.opacity * 0.8})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      }
    }
  }

  private drawChordPath(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number): void {
    if (this.chordHistory.length < 2) return;

    ctx.strokeStyle = `rgba(${this.chordColor[0]}, ${this.chordColor[1]}, ${this.chordColor[2]}, 0.3)`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    const positions: Array<{ x: number; y: number }> = [];
    for (const chord of this.chordHistory) {
      const rootPositions = this.tonnetzPositions.get(chord.root) ?? [];
      let bestPos = rootPositions[0];
      let bestDist = Infinity;
      for (const pos of rootPositions) {
        const { x, y } = hexToPixel(pos.q, pos.r, size, centerX, centerY);
        const dist = Math.hypot(x - centerX, y - centerY);
        if (dist < bestDist) {
          bestDist = dist;
          bestPos = pos;
        }
      }
      if (bestPos) positions.push(hexToPixel(bestPos.q, bestPos.r, size, centerX, centerY));
    }

    if (positions.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(positions[0].x, positions[0].y);
      for (let i = 1; i < positions.length; i++) ctx.lineTo(positions[i].x, positions[i].y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  isReady(): boolean { return this.ready; }
  dispose(): void { this.ready = false; }

  getConfig(): EffectConfig[] {
    return [
      { key: 'hexSize', label: 'Grid Size', type: 'range', value: this.hexSize, min: 30, max: 80, step: 5 },
      { key: 'historyLength', label: 'Path Length', type: 'range', value: this.maxHistoryLength, min: 2, max: 16, step: 1 },
    ];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return { hexSize: 50, historyLength: 8 };
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'hexSize') this.hexSize = value as number;
    if (key === 'historyLength') this.maxHistoryLength = value as number;
  }
}
