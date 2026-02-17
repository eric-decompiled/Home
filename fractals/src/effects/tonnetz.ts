// --- Tonnetz Effect ---
// Hexagonal lattice representing harmonic relationships between pitch classes.
// Based on neo-Riemannian theory: adjacent triangles share smooth voice leading.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { palettes } from '../fractal-engine.ts';
import { getNoteName } from './effect-utils.ts';

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
  private pitchClassRegister: number[] = new Array(12).fill(0.5); // 0=bass, 1=treble
  private currentChordRoot = -1;
  private currentChordQuality = '';
  private useFlats = false;
  private chordTriangleOpacity = 0;

  // Chord history for path tracing
  private chordHistory: Array<{ root: number; quality: string; time: number }> = [];
  private maxHistoryLength = 8;


  // Beat pulse
  private beatPulse = 0;
  private barPulse = 0;

  // Groove-driven edge glow
  private edgeGlow = 0;
  private beatGroove = 0.5;

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
    this.useFlats = music.useFlats ?? false;

    this.activePitchClasses.clear();
    // Track register per pitch class (average of active voices)
    const pcNoteSum: number[] = new Array(12).fill(0);
    const pcNoteCount: number[] = new Array(12).fill(0);

    for (const voice of music.activeVoices) {
      this.activePitchClasses.add(voice.pitchClass);
      if (voice.onset) {
        this.pitchClassBrightness[voice.pitchClass] = 1.0;
      }
      // Track MIDI note for register calculation
      pcNoteSum[voice.pitchClass] += voice.midi;
      pcNoteCount[voice.pitchClass]++;
    }

    for (let i = 0; i < 12; i++) {
      if (this.activePitchClasses.has(i)) {
        this.pitchClassBrightness[i] = Math.max(this.pitchClassBrightness[i], 0.7);
        // Calculate register: 0 = bass (MIDI 36), 1 = treble (MIDI 84)
        if (pcNoteCount[i] > 0) {
          const avgNote = pcNoteSum[i] / pcNoteCount[i];
          const register = Math.max(0, Math.min(1, (avgNote - 36) / 48));
          // Smooth transition to new register
          this.pitchClassRegister[i] = this.pitchClassRegister[i] * 0.7 + register * 0.3;
        }
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

    this.chordTriangleOpacity *= Math.exp(-1.0 * dt);

    // === GROOVE CURVES ===
    // Use arrival for impact (replaces boolean triggers)
    // Use anticipation for pre-beat glow
    const beatArrival = music.beatArrival ?? 0;
    const barArrival = music.barArrival ?? 0;
    const anticipation = music.beatAnticipation ?? 0;
    const barAnticipation = music.barAnticipation ?? 0;
    this.beatGroove = music.beatGroove ?? 0.5;

    // Blend arrival impact with anticipation glow
    // This creates a "breathe in, hit" cycle
    this.beatPulse = Math.max(this.beatPulse, beatArrival * 0.4);
    this.barPulse = Math.max(this.barPulse, barArrival * 0.6);
    // Add subtle anticipation glow
    this.beatPulse += anticipation * 0.1 * (1 - this.beatPulse);

    // Edge glow breathes with beat groove + bar anticipation buildup
    // Creates subtle grid "breathing" effect
    this.edgeGlow = (this.beatGroove - 0.5) * 0.15 + barAnticipation * 0.2;

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
    this.drawChordShape(ctx, centerX, centerY, size);
    this.drawNodes(ctx, centerX, centerY, size);

    return this.canvas;
  }

  private drawEdges(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number): void {
    // Edge opacity breathes with groove
    const edgeAlpha = Math.max(0.2, Math.min(0.5, 0.3 + this.edgeGlow));
    ctx.strokeStyle = `rgba(${this.accentColor[0]}, ${this.accentColor[1]}, ${this.accentColor[2]}, ${edgeAlpha.toFixed(2)})`;
    ctx.lineWidth = 1 + this.edgeGlow * 0.5;

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
      const register = this.pitchClassRegister[pc]; // 0=bass, 1=treble

      for (const pos of positions) {
        const { x, y } = hexToPixel(pos.q, pos.r, size, centerX, centerY);
        if (x < -nodeRadius || x > this.width + nodeRadius || y < -nodeRadius || y > this.height + nodeRadius) continue;

        const pcPalette = palettes[pc];
        const basepcColor = pcPalette?.stops[3]?.color ?? this.accentColor;

        // Adjust color based on register: bass=darker, treble=lighter
        // register 0 -> darken to 30%, register 1 -> lighten significantly toward white
        const darkFactor = 0.3 + register * 0.7; // 0.3 to 1.0
        const lightAdd = Math.max(0, (register - 0.4) * 1.67) * 120; // 0 to 120 for high notes
        const pcColor: [number, number, number] = [
          Math.min(255, Math.round(basepcColor[0] * darkFactor + lightAdd)),
          Math.min(255, Math.round(basepcColor[1] * darkFactor + lightAdd)),
          Math.min(255, Math.round(basepcColor[2] * darkFactor + lightAdd))
        ];

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
        ctx.fillText(getNoteName(pc, this.useFlats), x, y);
      }
    }
  }

  private drawChordShape(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number): void {
    if (this.currentChordRoot < 0 || this.chordTriangleOpacity < 0.01) return;

    const root = this.currentChordRoot;
    const quality = this.currentChordQuality;

    const third = quality.includes('min') || quality === 'dim' ? (root + 3) % 12 : (root + 4) % 12;
    const fifth = quality === 'dim' ? (root + 6) % 12 : quality === 'aug' ? (root + 8) % 12 : (root + 7) % 12;

    const is7th = quality.includes('7');
    const seventh = is7th ? (quality === 'maj7' ? (root + 11) % 12 : (root + 10) % 12) : -1;

    // Get colors for each chord tone
    const rootColor = palettes[root]?.stops[3]?.color ?? this.accentColor;
    const thirdColor = palettes[third]?.stops[3]?.color ?? this.accentColor;
    const fifthColor = palettes[fifth]?.stops[3]?.color ?? this.accentColor;
    const seventhColor = is7th ? (palettes[seventh]?.stops[3]?.color ?? this.accentColor) : null;

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

          if (is7th && seventhColor) {
            for (const sp of seventhPositions) {
              if ([rp, tp, fp].filter(p => isAdjacent(p, sp)).length < 2) continue;
              const { x: sx, y: sy } = hexToPixel(sp.q, sp.r, size, centerX, centerY);
              const cx = (rx + tx + fx + sx) / 4;
              const cy = (ry + ty + fy + sy) / 4;
              const vertices = [
                { x: rx, y: ry, color: rootColor },
                { x: tx, y: ty, color: thirdColor },
                { x: fx, y: fy, color: fifthColor },
                { x: sx, y: sy, color: seventhColor }
              ].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));

              // Draw gradient from each vertex
              this.drawGradientShape(ctx, vertices, size);
              return;
            }
          } else {
            const vertices = [
              { x: rx, y: ry, color: rootColor },
              { x: tx, y: ty, color: thirdColor },
              { x: fx, y: fy, color: fifthColor }
            ];

            // Draw gradient from each vertex
            this.drawGradientShape(ctx, vertices, size);
            return;
          }
        }
      }
    }
  }

  private drawGradientShape(
    ctx: CanvasRenderingContext2D,
    vertices: Array<{ x: number; y: number; color: [number, number, number] }>,
    size: number
  ): void {
    const opacity = this.chordTriangleOpacity;
    const radius = size * 1.2;

    // Draw shape path
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();

    // Save and clip to shape
    ctx.save();
    ctx.clip();

    // Draw radial gradient from each vertex
    for (const v of vertices) {
      const gradient = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, radius);
      gradient.addColorStop(0, `rgba(${v.color[0]}, ${v.color[1]}, ${v.color[2]}, ${opacity * 0.5})`);
      gradient.addColorStop(0.5, `rgba(${v.color[0]}, ${v.color[1]}, ${v.color[2]}, ${opacity * 0.2})`);
      gradient.addColorStop(1, `rgba(${v.color[0]}, ${v.color[1]}, ${v.color[2]}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(v.x - radius, v.y - radius, radius * 2, radius * 2);
    }

    ctx.restore();

    // Draw stroke with blended color
    const avgColor: [number, number, number] = [
      Math.round(vertices.reduce((s, v) => s + v.color[0], 0) / vertices.length),
      Math.round(vertices.reduce((s, v) => s + v.color[1], 0) / vertices.length),
      Math.round(vertices.reduce((s, v) => s + v.color[2], 0) / vertices.length)
    ];
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(${avgColor[0]}, ${avgColor[1]}, ${avgColor[2]}, ${opacity * 0.8})`;
    ctx.lineWidth = 2 + this.beatPulse * 2;
    ctx.stroke();
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
    return [];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return { hexSize: 50, historyLength: 8 };
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'hexSize') this.hexSize = value as number;
    if (key === 'historyLength') this.maxHistoryLength = value as number;
  }
}
