// --- Laser Hockey Effect ---
// Tonnetz lattice with laser beams shooting at a gliding puck.
// Air hockey physics - mouse can push the heavy puck around.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { palettes } from '../fractal-engine.ts';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface HexCoord {
  q: number;
  r: number;
}

interface TrailPoint {
  brightness: number;
  midi: number;
  age: number; // seconds since creation
  targetX: number; // puck position at launch
  targetY: number;
  hit: boolean; // has this beam hit the puck?
}

function generateTonnetzPositions(): Map<number, HexCoord[]> {
  const positions = new Map<number, HexCoord[]>();
  for (let pc = 0; pc < 12; pc++) {
    positions.set(pc, []);
  }
  for (let q = -4; q <= 6; q++) {
    for (let r = -3; r <= 4; r++) {
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

export class LaserHockeyEffect implements VisualEffect {
  readonly id = 'laser-hockey';
  readonly name = 'Laser Hockey';
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
  private pitchClassMidi: number[] = new Array(12).fill(60);

  // Light trails per pitch class - continuous beam history
  private trails: Array<TrailPoint[]> = Array.from({ length: 12 }, () => []);
  private trailMaxAge = 6.0; // seconds before trail fades completely
  private trailSampleRate = 0.05; // seconds between trail samples

  // Beat pulse
  private beatPulse = 0;
  private barPulse = 0;

  // Puck - the target beams aim for
  private puckX = 0;
  private puckY = 0;
  private puckRadius = 20;
  private puckPulse = 0;
  private puckGlideSpeed = 0.3; // How fast it drifts
  private puckPhase = 0; // For smooth wandering

  // Hit marks on the puck (pitch class, intensity, age)
  private hitMarks: Array<{ pc: number; intensity: number; age: number; angle: number }> = [];
  private hitFlash = 0; // Flash when hit

  // Mouse interaction with puck
  private mouseX = -1000;
  private mouseY = -1000;
  private puckVelX = 0; // Velocity from repulsion
  private puckVelY = 0;
  private isHovering = false; // Mouse is near the puck
  private isDragging = false; // User is dragging the puck
  private dragVelX = 0; // Track drag velocity for flick
  private dragVelY = 0;

  // Colors
  private baseColor: [number, number, number] = [30, 40, 60];
  private accentColor: [number, number, number] = [100, 150, 255];

  constructor() {
    this.canvas = document.createElement('canvas');
    this.tonnetzPositions = generateTonnetzPositions();
    this.setupMouseHandlers();
  }

  private setupMouseHandlers(): void {
    // Listen on window since our canvas is an offscreen buffer
    const getDisplayCanvas = () => document.querySelector('canvas');

    window.addEventListener('mousemove', (e) => {
      const displayCanvas = getDisplayCanvas();
      if (!displayCanvas) return;

      const rect = displayCanvas.getBoundingClientRect();
      const prevX = this.mouseX;
      const prevY = this.mouseY;
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;

      // Check if mouse is within canvas bounds
      const inBounds = this.mouseX >= 0 && this.mouseX <= this.width &&
                       this.mouseY >= 0 && this.mouseY <= this.height;

      if (inBounds) {
        // If dragging, move puck with mouse and track velocity
        if (this.isDragging) {
          this.puckX = this.mouseX;
          this.puckY = this.mouseY;
          // Track drag velocity for flick (smoothed)
          this.dragVelX = (this.mouseX - prevX) * 60; // Scale to per-second
          this.dragVelY = (this.mouseY - prevY) * 60;
          displayCanvas.style.cursor = 'grabbing';
        } else {
          this.checkPuckHover();
          displayCanvas.style.cursor = this.isHovering ? 'grab' : 'default';
        }
      } else {
        if (this.isDragging) {
          // Release if dragged outside
          this.releasePuck();
        }
        this.isHovering = false;
        this.mouseX = -1000;
        this.mouseY = -1000;
      }
    });

    window.addEventListener('mousedown', (e) => {
      const displayCanvas = getDisplayCanvas();
      if (!displayCanvas) return;

      const rect = displayCanvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // Check if clicking on puck
      const dx = mx - this.puckX;
      const dy = my - this.puckY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.puckRadius * 2) {
        this.isDragging = true;
        this.dragVelX = 0;
        this.dragVelY = 0;
        this.puckVelX = 0;
        this.puckVelY = 0;
        displayCanvas.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.releasePuck();
      }
    });
  }

  private releasePuck(): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    // Apply flick velocity (capped)
    const flickSpeed = Math.sqrt(this.dragVelX * this.dragVelX + this.dragVelY * this.dragVelY);
    const maxFlick = 400;
    if (flickSpeed > maxFlick) {
      this.puckVelX = (this.dragVelX / flickSpeed) * maxFlick;
      this.puckVelY = (this.dragVelY / flickSpeed) * maxFlick;
    } else {
      this.puckVelX = this.dragVelX;
      this.puckVelY = this.dragVelY;
    }

    // Visual feedback
    this.puckPulse = Math.min(1, flickSpeed / 200);

    const displayCanvas = document.querySelector('canvas');
    if (displayCanvas) {
      displayCanvas.style.cursor = this.isHovering ? 'grab' : 'default';
    }
  }

  private checkPuckHover(): void {
    const dx = this.mouseX - this.puckX;
    const dy = this.mouseY - this.puckY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.isHovering = dist < 150; // Match repulsion radius
  }

  init(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    this.hexSize = Math.min(width, height) / 22;
    // Initialize puck position to center
    this.puckX = width * 0.5;
    this.puckY = height * 0.5;
    this.ready = true;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.hexSize = Math.min(width, height) / 22;
  }

  update(dt: number, music: MusicParams): void {
    dt = Math.min(dt, 0.1);
    this.time += dt;

    this.activePitchClasses.clear();
    for (const voice of music.activeVoices) {
      this.activePitchClasses.add(voice.pitchClass);
      if (voice.midi > this.pitchClassMidi[voice.pitchClass] || this.pitchClassBrightness[voice.pitchClass] < 0.1) {
        this.pitchClassMidi[voice.pitchClass] = voice.midi;
      }
      if (voice.onset) {
        this.pitchClassBrightness[voice.pitchClass] = 1.0;
      }
    }

    // Decay pitch class brightness
    for (let pc = 0; pc < 12; pc++) {
      if (this.activePitchClasses.has(pc)) {
        this.pitchClassBrightness[pc] = Math.max(this.pitchClassBrightness[pc], 0.7);
      }
      this.pitchClassBrightness[pc] *= Math.exp(-2.5 * dt);
    }

    // Age trail points and detect hits with actual collision
    // Use a representative node position for hit detection (center of lattice)
    const hitCenterX = this.width * 0.42;
    const hitCenterY = this.height * 0.4;
    const hitSize = this.hexSize * (1 + this.barPulse * 0.05);
    const hitRadius = this.puckRadius * 1.5; // Collision radius

    for (let pc = 0; pc < 12; pc++) {
      const positions = this.tonnetzPositions.get(pc);
      if (!positions || positions.length === 0) continue;

      for (const point of this.trails[pc]) {
        point.age += dt;

        // Skip if already hit
        if (point.hit) continue;

        // Check collision: beam tip vs puck position
        const t = point.age / this.trailMaxAge;

        // Check against multiple node positions for this pitch class
        for (const pos of positions) {
          const node = hexToPixel(pos.q, pos.r, hitSize, hitCenterX, hitCenterY);

          // Beam tip position (lerp from node to stored target)
          const tipX = node.x + (point.targetX - node.x) * t;
          const tipY = node.y + (point.targetY - node.y) * t;

          // Distance from beam tip to current puck position
          const dx = tipX - this.puckX;
          const dy = tipY - this.puckY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < hitRadius) {
            // Hit! Register it
            point.hit = true;
            const angle = Math.atan2(dy, dx);
            this.hitMarks.push({
              pc,
              intensity: point.brightness,
              age: 0,
              angle
            });
            this.hitFlash = Math.max(this.hitFlash, point.brightness * 0.6);
            this.puckPulse = Math.max(this.puckPulse, point.brightness * 0.4);

            // Give puck a tiny bump from the hit (heavy puck)
            const bumpStrength = 2 * point.brightness;
            this.puckVelX += (dx / dist) * bumpStrength;
            this.puckVelY += (dy / dist) * bumpStrength;
            break; // Only one hit per point
          }
        }
      }
      this.trails[pc] = this.trails[pc].filter(p => p.age < this.trailMaxAge);
    }

    // Age and prune hit marks
    for (const mark of this.hitMarks) {
      mark.age += dt;
    }
    this.hitMarks = this.hitMarks.filter(m => m.age < 8.0); // Marks last 8 seconds
    this.hitFlash *= Math.exp(-6.0 * dt);

    // === GROOVE CURVES ===
    // Use arrival for impact, anticipation for glow build
    const beatArrival = music.beatArrival ?? 0;
    const barArrival = music.barArrival ?? 0;
    const anticipation = music.beatAnticipation ?? 0;

    // Puck glow builds with anticipation, peaks with arrival
    this.puckPulse += anticipation * 0.01 + beatArrival * 0.04 + barArrival * 0.06;

    // Heavy puck - small impulses accumulate slowly
    // Use arrival (continuous decay) instead of onBeat (boolean)
    if (music.onBeat) {
      this.beatPulse = Math.max(this.beatPulse, beatArrival * 0.4);
      const beatAngle = Math.random() * Math.PI * 2;
      const beatBump = 1.5;
      this.puckVelX += Math.cos(beatAngle) * beatBump;
      this.puckVelY += Math.sin(beatAngle) * beatBump;
    }
    if (music.onBar) {
      this.barPulse = Math.max(this.barPulse, barArrival * 0.6);
      const barAngle = Math.random() * Math.PI * 2;
      const barBump = 2.5;
      this.puckVelX += Math.cos(barAngle) * barBump;
      this.puckVelY += Math.sin(barAngle) * barBump;
    }

    // Melody - very subtle nudge
    if (music.melodyOnset) {
      const melodyAngle = Math.random() * Math.PI * 2;
      const melodyBump = 0.8;
      this.puckVelX += Math.cos(melodyAngle) * melodyBump;
      this.puckVelY += Math.sin(melodyAngle) * melodyBump;
    }

    // Drums - gentle push
    if (music.kick) {
      const kickAngle = Math.random() * Math.PI * 2;
      this.puckVelX += Math.cos(kickAngle) * 2;
      this.puckVelY += Math.sin(kickAngle) * 2;
      this.puckPulse += 0.06;
    }
    if (music.snare) {
      const snareAngle = Math.random() * Math.PI * 2;
      this.puckVelX += Math.cos(snareAngle) * 1.5;
      this.puckVelY += Math.sin(snareAngle) * 1.5;
      this.puckPulse += 0.04;
    }

    // Puck physics (skip if being dragged)
    if (!this.isDragging) {
      // Very gentle drift (heavy puck, light breeze)
      this.puckPhase += dt * this.puckGlideSpeed;
      const driftForce = 2;
      this.puckVelX += Math.sin(this.puckPhase * 0.7) * driftForce * dt;
      this.puckVelY += Math.cos(this.puckPhase * 0.5) * driftForce * dt;

      // Mouse repulsion - pushes heavy puck slowly
      const dxMouse = this.puckX - this.mouseX;
      const dyMouse = this.puckY - this.mouseY;
      const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
      const repelRadius = 120;
      const repelStrength = 200;

      if (distMouse < repelRadius && distMouse > 1) {
        const falloff = 1 - distMouse / repelRadius;
        const force = falloff * falloff * repelStrength * dt;
        const nx = dxMouse / distMouse;
        const ny = dyMouse / distMouse;
        this.puckVelX += nx * force;
        this.puckVelY += ny * force;
        this.puckPulse = Math.max(this.puckPulse, falloff * 0.3);
      }

      // Friction (very heavy puck - high drag)
      this.puckVelX *= Math.exp(-2.5 * dt);
      this.puckVelY *= Math.exp(-2.5 * dt);

      // Clamp velocity (heavy = slower max)
      const maxVel = 80;
      const velMag = Math.sqrt(this.puckVelX * this.puckVelX + this.puckVelY * this.puckVelY);
      if (velMag > maxVel) {
        this.puckVelX = (this.puckVelX / velMag) * maxVel;
        this.puckVelY = (this.puckVelY / velMag) * maxVel;
      }

      // Update position
      this.puckX += this.puckVelX * dt;
      this.puckY += this.puckVelY * dt;

      // Soft boundary - bounce off edges with damping
      const margin = this.puckRadius * 2;
      if (this.puckX < margin) {
        this.puckX = margin;
        this.puckVelX = Math.abs(this.puckVelX) * 0.5;
      } else if (this.puckX > this.width - margin) {
        this.puckX = this.width - margin;
        this.puckVelX = -Math.abs(this.puckVelX) * 0.5;
      }
      if (this.puckY < margin) {
        this.puckY = margin;
        this.puckVelY = Math.abs(this.puckVelY) * 0.5;
      } else if (this.puckY > this.height - margin) {
        this.puckY = this.height - margin;
        this.puckVelY = -Math.abs(this.puckVelY) * 0.5;
      }
    }

    this.puckPulse *= Math.exp(-3.0 * dt);

    // Add trail points for active pitch classes (store puck position at launch)
    for (let pc = 0; pc < 12; pc++) {
      if (this.activePitchClasses.has(pc)) {
        const trail = this.trails[pc];
        const lastPoint = trail[trail.length - 1];
        if (!lastPoint || lastPoint.age >= this.trailSampleRate) {
          trail.push({
            brightness: this.pitchClassBrightness[pc],
            midi: this.pitchClassMidi[pc],
            age: 0,
            targetX: this.puckX,
            targetY: this.puckY,
            hit: false
          });
        }
      }
    }

    this.beatPulse *= Math.exp(-4.0 * dt);
    this.barPulse *= Math.exp(-2.0 * dt);

    const palIdx = music.key >= 0 && music.key < palettes.length ? music.key : 0;
    const pal = palettes[palIdx];
    if (pal && pal.stops.length >= 3) {
      this.baseColor = [...pal.stops[0].color] as [number, number, number];
      this.accentColor = [...pal.stops[2].color] as [number, number, number];
    }
  }

  render(): HTMLCanvasElement {
    if (!this.ctx) return this.canvas;
    const ctx = this.ctx;

    // Clear to transparent (composited over background layer)
    ctx.clearRect(0, 0, this.width, this.height);

    const baseSize = this.hexSize * (1 + this.barPulse * 0.05);
    const centerX = this.width * 0.42; // Shifted left so right edge isn't cut off
    const centerY = this.height * 0.4; // Higher to make room for beams

    // Draw the puck first (behind beams)
    this.drawPuck(ctx);

    // Draw light beams aiming at the puck
    this.drawLightBeams(ctx, centerX, centerY, baseSize);

    // Draw the lattice
    this.drawEdges(ctx, centerX, centerY, baseSize);
    this.drawNodes(ctx, centerX, centerY, baseSize);

    return this.canvas;
  }

  private drawPuck(ctx: CanvasRenderingContext2D): void {
    const px = this.puckX;
    const py = this.puckY;
    const hoverBoost = this.isHovering ? 0.15 : 0;
    const baseRadius = this.puckRadius * (1 + this.puckPulse * 0.3 + this.beatPulse * 0.1 + hoverBoost);

    // Outer glow (brighter on hover)
    const glowRadius = baseRadius * (this.isHovering ? 3.0 : 2.5);
    const glowAlpha = 0.2 + this.hitFlash * 0.5 + (this.isHovering ? 0.15 : 0);
    const glow = ctx.createRadialGradient(px, py, baseRadius * 0.5, px, py, glowRadius);
    glow.addColorStop(0, `rgba(${this.accentColor[0]}, ${this.accentColor[1]}, ${this.accentColor[2]}, ${glowAlpha})`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px, py, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw hit marks (accumulated on the puck)
    for (const mark of this.hitMarks) {
      const fadeT = Math.min(1, mark.age / 8.0);
      const alpha = mark.intensity * (1 - fadeT * fadeT) * 0.6;
      if (alpha < 0.02) continue;

      const pcPalette = palettes[mark.pc];
      const color = pcPalette?.stops[3]?.color ?? this.accentColor;

      // Draw mark as a small arc/dot on the puck
      const markRadius = baseRadius * (0.3 + mark.intensity * 0.3) * (1 - fadeT * 0.5);
      const markX = px + Math.cos(mark.angle) * baseRadius * 0.4;
      const markY = py + Math.sin(mark.angle) * baseRadius * 0.4;

      ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(markX, markY, markRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Puck core
    const coreGrad = ctx.createRadialGradient(px, py, 0, px, py, baseRadius);
    coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.3 + this.hitFlash * 0.4})`);
    coreGrad.addColorStop(0.5, `rgba(${this.accentColor[0]}, ${this.accentColor[1]}, ${this.accentColor[2]}, ${0.4 + this.puckPulse * 0.3})`);
    coreGrad.addColorStop(1, `rgba(${this.accentColor[0] * 0.5}, ${this.accentColor[1] * 0.5}, ${this.accentColor[2] * 0.5}, 0.2)`);
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
    ctx.fill();

    // Ring (brighter and thicker on hover)
    const ringAlpha = 0.5 + this.puckPulse * 0.3 + (this.isHovering ? 0.3 : 0);
    ctx.strokeStyle = `rgba(${this.accentColor[0]}, ${this.accentColor[1]}, ${this.accentColor[2]}, ${ringAlpha})`;
    ctx.lineWidth = this.isHovering ? 3 : 2;
    ctx.stroke();

    // Hover indicator: subtle pulsing outer ring
    if (this.isHovering) {
      const pulsePhase = (this.time * 4) % (Math.PI * 2);
      const pulseAlpha = 0.2 + Math.sin(pulsePhase) * 0.1;
      ctx.strokeStyle = `rgba(255, 255, 255, ${pulseAlpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, baseRadius * 1.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawLightBeams(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number
  ): void {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const [pc, positions] of this.tonnetzPositions) {
      const trail = this.trails[pc];
      if (trail.length < 2) continue;

      // Draw beams from ALL positions of this pitch class
      for (const pos of positions) {
        const { x: nodeX, y: nodeY } = hexToPixel(pos.q, pos.r, size, centerX, centerY);

        // Skip if far offscreen
        if (nodeX < -100 || nodeX > this.width + 100 || nodeY < -100 || nodeY > this.height + 100) continue;

        // Draw beam segments - each uses the target stored at launch time
        for (let i = 0; i < trail.length - 1; i++) {
          const point = trail[i];
          const nextPoint = trail[i + 1];

          const t1 = point.age / this.trailMaxAge;
          const t2 = nextPoint.age / this.trailMaxAge;

          // Lerp from node to stored target (where puck WAS at launch)
          const x1 = nodeX + (point.targetX - nodeX) * t1;
          const y1 = nodeY + (point.targetY - nodeY) * t1;
          const x2 = nodeX + (nextPoint.targetX - nodeX) * t2;
          const y2 = nodeY + (nextPoint.targetY - nodeY) * t2;

          // Color based on MIDI (low = dark stop, high = bright stop)
          const midi = point.midi;
          const stopT = Math.max(0, Math.min(1, (midi - 36) / 60));
          const stopIndex = Math.round(1 + stopT * 3);
          const pcPalette = palettes[pc];
          const color = pcPalette?.stops[stopIndex]?.color ?? this.accentColor;

          // Fade alpha based on age and brightness
          const alpha = point.brightness * (1 - t1) * 0.8;
          if (alpha < 0.02) continue;

          // Line width narrows with depth
          const lineWidth = Math.max(0.5, (1 - t1) * 5 * point.brightness);

          ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
          ctx.lineWidth = lineWidth;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // Add glow for brighter segments
          if (alpha > 0.25) {
            ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.3})`;
            ctx.lineWidth = lineWidth * 2.5;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        }
      }
    }
  }

  private drawEdges(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number): void {
    ctx.strokeStyle = `rgba(${this.accentColor[0]}, ${this.accentColor[1]}, ${this.accentColor[2]}, 0.25)`;
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
          if ((x2 < -size || x2 > this.width + size) && (x1 < -size || x1 > this.width + size)) continue;
          if ((y2 < -size || y2 > this.height + size) && (y1 < -size || y1 > this.height + size)) continue;

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
      const midi = this.pitchClassMidi[pc];
      const isActive = this.activePitchClasses.has(pc);

      for (const pos of positions) {
        const { x, y } = hexToPixel(pos.q, pos.r, size, centerX, centerY);
        if (x < -nodeRadius || x > this.width + nodeRadius || y < -nodeRadius || y > this.height + nodeRadius) continue;

        // Select palette stop based on MIDI pitch
        const pcPalette = palettes[pc];
        const stopT = Math.max(0, Math.min(1, (midi - 36) / 60));
        const stopIndex = Math.round(1 + stopT * 3);
        const pcColor = pcPalette?.stops[stopIndex]?.color ?? this.accentColor;

        // Glow for active notes
        if (brightness > 0.1) {
          const glowRadius = nodeRadius * (2 + brightness);
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
          gradient.addColorStop(0, `rgba(${pcColor[0]}, ${pcColor[1]}, ${pcColor[2]}, ${brightness * 0.7})`);
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Node fill
        const baseAlpha = 0.5 + brightness * 0.5 + this.beatPulse * 0.1;
        const r = Math.min(255, this.baseColor[0] + brightness * (pcColor[0] - this.baseColor[0]));
        const g = Math.min(255, this.baseColor[1] + brightness * (pcColor[1] - this.baseColor[1]));
        const b = Math.min(255, this.baseColor[2] + brightness * (pcColor[2] - this.baseColor[2]));

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${baseAlpha})`;
        ctx.beginPath();
        ctx.arc(x, y, nodeRadius * (1 + brightness * 0.3), 0, Math.PI * 2);
        ctx.fill();

        // Node stroke
        ctx.strokeStyle = `rgba(${pcColor[0]}, ${pcColor[1]}, ${pcColor[2]}, ${0.3 + brightness * 0.5})`;
        ctx.lineWidth = isActive ? 2 : 1;
        ctx.stroke();

        // Label
        ctx.fillStyle = `rgba(${pcColor[0]}, ${pcColor[1]}, ${pcColor[2]}, ${0.6 + brightness * 0.4})`;
        ctx.font = `bold ${Math.max(10, nodeRadius * 0.8)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(NOTE_NAMES[pc], x, y);
      }
    }
  }

  isReady(): boolean { return this.ready; }

  dispose(): void {
    this.ready = false;
    this.trails = Array.from({ length: 12 }, () => []);
    this.pitchClassBrightness = new Array(12).fill(0);
    this.pitchClassMidi = new Array(12).fill(60);
    this.activePitchClasses.clear();
    this.beatPulse = 0;
    this.barPulse = 0;
    this.puckPulse = 0;
    this.puckPhase = 0;
    this.puckX = this.width * 0.5;
    this.puckY = this.height * 0.5;
    this.puckVelX = 0;
    this.puckVelY = 0;
    this.isHovering = false;
    this.isDragging = false;
    this.dragVelX = 0;
    this.dragVelY = 0;
    this.hitMarks = [];
    this.hitFlash = 0;
    this.time = 0;
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'hexSize', label: 'Grid Size', type: 'range', value: this.hexSize, min: 15, max: 50, step: 5 },
      { key: 'trailMaxAge', label: 'Trail Length', type: 'range', value: this.trailMaxAge, min: 1, max: 8, step: 0.5 },
    ];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return { hexSize: 50, trailMaxAge: 6.0 };
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'hexSize') this.hexSize = value as number;
    if (key === 'trailMaxAge') this.trailMaxAge = value as number;
  }
}
