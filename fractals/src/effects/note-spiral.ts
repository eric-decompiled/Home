// --- Note Spiral Effect ---
// Notes laid out on a logarithmic spiral: each octave is one revolution,
// highest notes at the center, lowest at the rim. Melody notes light up
// and trail connections build a glowing web of musical motion.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import {
  samplePaletteColor, semitoneOffset, MAJOR_OFFSETS, MINOR_OFFSETS,
  SPIRAL_MIDI_LO, SPIRAL_MIDI_HI, SPIRAL_MIDI_RANGE, SPIRAL_RADIUS_SCALE, spiralPos
} from './effect-utils.ts';
import { gsap } from '../animation.ts';

// Alias for local use
const MIDI_LO = SPIRAL_MIDI_LO;
const MIDI_HI = SPIRAL_MIDI_HI;
const MIDI_RANGE = SPIRAL_MIDI_RANGE;

interface SpiralNode {
  brightness: number;
  velocity: number;  // last hit velocity
  lastHitTime: number;
  r: number;
  g: number;
  b: number;
  // GSAP-tweened beam properties
  beamIntensity: number;
  beamLength: number;
  beamSpread: number;
}

interface Trail {
  from: number;  // MIDI note
  to: number;    // MIDI note
  strength: number;
  age: number;
}

export class NoteSpiralEffect implements VisualEffect {
  readonly id = 'note-spiral';
  readonly name = 'Note Spiral';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'source-over';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private spineCanvas: HTMLCanvasElement;  // Cached spiral spine
  private spineCtx: CanvasRenderingContext2D;
  private backdropCanvas: HTMLCanvasElement;  // Cached dark backdrop
  private backdropCtx: CanvasRenderingContext2D;
  private backdropDirty = true;
  private width = 800;
  private height = 600;
  private ready = false;

  // One node per MIDI note in range
  private nodes: SpiralNode[] = [];
  private trails: Trail[] = [];
  private lastMidiByTrack: Map<number, number> = new Map(); // track → last MIDI note
  private time = 0;
  private key = 0;
  private keyMode: 'major' | 'minor' = 'major';
  private keyRotation = 0;  // animated rotation offset for modulations
  private breathPhase = 0;
  private awake = false;

  // Spine cache invalidation
  private cachedSpineKey = -1;
  private cachedSpineRotation = -999;
  private cachedSpineMode: 'major' | 'minor' = 'major';

  // Pre-computed positions (cached, updated only when key/rotation changes)
  private notePositions: { x: number; y: number; r: number; scale: number }[] = [];
  private cachedPosKey = -1;
  private cachedPosRotation = -999;
  private cachedPosCx = 0;
  private cachedPosCy = 0;
  private cachedPosMaxR = 0;

  // Config
  private intensity = 1.0;
  private trailMax = 48;
  private darkBackdrop = true;
  private glowOutlines = true;
  private spiralTightness = 1.25;  // power curve: lower = more bass space, higher = tighter
  private currentTension = 0;  // for tension-driven visuals
  private beatDuration = 0.5;  // for beat-synced effects
  private loudness = 0;  // smoothed audio loudness for brightness scaling
  private activeShapes: Set<string> = new Set(['firefly']);
  private static readonly SHAPES = ['firefly', 'starburst', 'ring', 'spark'];

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.spineCanvas = document.createElement('canvas');
    this.spineCtx = this.spineCanvas.getContext('2d')!;
    this.backdropCanvas = document.createElement('canvas');
    this.backdropCtx = this.backdropCanvas.getContext('2d')!;
    this.initNodes();
  }

  private initNodes(): void {
    this.nodes = [];
    for (let i = 0; i < MIDI_RANGE; i++) {
      const midi = MIDI_LO + i;
      const pc = midi % 12;
      const c = samplePaletteColor(pc, 0.7);
      this.nodes.push({
        brightness: 0,
        velocity: 0,
        lastHitTime: -10,
        r: c[0], g: c[1], b: c[2],
        beamIntensity: 0,
        beamLength: 0,
        beamSpread: 0,
      });
    }
  }

  init(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.spineCanvas.width = width;
    this.spineCanvas.height = height;
    this.backdropCanvas.width = width;
    this.backdropCanvas.height = height;
    this.cachedSpineKey = -1; // invalidate cache
    this.backdropDirty = true;
    this.ready = true;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.spineCanvas.width = width;
    this.spineCanvas.height = height;
    this.backdropCanvas.width = width;
    this.backdropCanvas.height = height;
    this.cachedSpineKey = -1; // invalidate cache
    this.backdropDirty = true;
  }

  // Map MIDI note to spiral position - delegates to shared spiralPos utility
  private notePos(midi: number, cx: number, cy: number, maxR: number): { x: number; y: number; r: number; scale: number } {
    const pos = spiralPos(midi, midi % 12, this.key, this.keyRotation, cx, cy, maxR, this.spiralTightness);
    return { x: pos.x, y: pos.y, r: pos.radius, scale: pos.scale };
  }

  // Pre-compute all note positions (cached, only updates when inputs change)
  private computeNotePositions(cx: number, cy: number, maxR: number): void {
    const rotationThreshold = 0.01;
    const positionThreshold = 1; // pixels

    // Skip if nothing changed
    if (this.cachedPosKey === this.key &&
        Math.abs(this.cachedPosRotation - this.keyRotation) < rotationThreshold &&
        Math.abs(this.cachedPosCx - cx) < positionThreshold &&
        Math.abs(this.cachedPosCy - cy) < positionThreshold &&
        Math.abs(this.cachedPosMaxR - maxR) < positionThreshold &&
        this.notePositions.length === MIDI_RANGE) {
      return;
    }

    // Cache inputs
    this.cachedPosKey = this.key;
    this.cachedPosRotation = this.keyRotation;
    this.cachedPosCx = cx;
    this.cachedPosCy = cy;
    this.cachedPosMaxR = maxR;

    // Recompute positions
    this.notePositions.length = 0;
    for (let midi = MIDI_LO; midi < MIDI_HI; midi++) {
      this.notePositions.push(this.notePos(midi, cx, cy, maxR));
    }
  }

  // Render spine to cache if key/rotation changed significantly
  private updateSpineCache(): void {
    const rotationThreshold = 0.02; // ~1 degree
    const needsUpdate = this.cachedSpineKey !== this.key ||
                        this.cachedSpineMode !== this.keyMode ||
                        Math.abs(this.cachedSpineRotation - this.keyRotation) > rotationThreshold;

    if (!needsUpdate) return;

    this.cachedSpineKey = this.key;
    this.cachedSpineRotation = this.keyRotation;
    this.cachedSpineMode = this.keyMode;

    const sctx = this.spineCtx;
    sctx.clearRect(0, 0, this.width, this.height);
    sctx.globalCompositeOperation = 'screen';

    const diatonicOffsets = this.keyMode === 'minor' ? MINOR_OFFSETS : MAJOR_OFFSETS;

    // Draw smooth curves between consecutive notes
    for (let i = 0; i < this.notePositions.length - 1; i++) {
      const midi = MIDI_LO + i;
      const pc = midi % 12;
      const nextPc = (midi + 1) % 12;

      // Get colors for gradient
      const c0 = samplePaletteColor(pc, 0.65);
      const c1 = samplePaletteColor(nextPc, 0.65);

      // Check if in key for line weight/alpha
      const semi = semitoneOffset(pc, this.key);
      const nextSemi = semitoneOffset(nextPc, this.key);
      const inKey = diatonicOffsets.has(semi) || diatonicOffsets.has(nextSemi);
      const baseAlpha = inKey ? 0.4 : 0.15;
      const lw = inKey ? 2.0 : 1.0;

      const p0 = this.notePositions[i];
      const p1 = this.notePositions[i + 1];

      // Calculate tangent directions for smooth curves
      const prev = this.notePositions[Math.max(0, i - 1)];
      const next = this.notePositions[Math.min(this.notePositions.length - 1, i + 2)];

      const tangentStrength = 0.18;
      const t0x = (p1.x - prev.x) * tangentStrength;
      const t0y = (p1.y - prev.y) * tangentStrength;
      const t1x = (next.x - p0.x) * tangentStrength;
      const t1y = (next.y - p0.y) * tangentStrength;

      const cp1x = p0.x + t0x;
      const cp1y = p0.y + t0y;
      const cp2x = p1.x - t1x;
      const cp2y = p1.y - t1y;

      // Create gradient from note color to next note color
      const grad = sctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
      grad.addColorStop(0, `rgba(${c0[0]},${c0[1]},${c0[2]},${baseAlpha})`);
      grad.addColorStop(1, `rgba(${c1[0]},${c1[1]},${c1[2]},${baseAlpha})`);

      sctx.beginPath();
      sctx.moveTo(p0.x, p0.y);
      sctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p1.x, p1.y);
      sctx.strokeStyle = grad;
      sctx.lineWidth = lw;
      sctx.stroke();
    }
  }

  // Render backdrop to cache (only when size changes)
  private renderBackdropCache(cx: number, cy: number, maxR: number): void {
    const bctx = this.backdropCtx;
    bctx.clearRect(0, 0, this.width, this.height);

    const discCy = cy - maxR * 0.04;
    const discTop = discCy - maxR;
    const discBottom = discCy + maxR;

    // Fake shadow using offset darker circle
    bctx.beginPath();
    bctx.arc(cx + 8, discCy + 8, maxR * 0.98, 0, Math.PI * 2);
    bctx.fillStyle = 'rgba(0,0,0,0.4)';
    bctx.fill();

    // Vertical gradient - warm gray at top, cool black at bottom
    const depthGrad = bctx.createLinearGradient(cx, discTop, cx, discBottom);
    depthGrad.addColorStop(0, 'rgba(38,36,42,0.5)');
    depthGrad.addColorStop(0.35, 'rgba(22,22,28,0.5)');
    depthGrad.addColorStop(0.65, 'rgba(10,12,18,0.5)');
    depthGrad.addColorStop(1, 'rgba(0,0,5,0.5)');

    bctx.beginPath();
    bctx.arc(cx, discCy, maxR * 0.98, 0, Math.PI * 2);
    bctx.fillStyle = depthGrad;
    bctx.fill();

    // Ambient occlusion
    const aoGrad = bctx.createRadialGradient(
      cx, discCy + maxR * 0.4, 0,
      cx, discCy + maxR * 0.4, maxR * 0.8
    );
    aoGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
    aoGrad.addColorStop(0.5, 'rgba(0,0,0,0.15)');
    aoGrad.addColorStop(1, 'rgba(0,0,0,0)');
    bctx.fillStyle = aoGrad;
    bctx.fill();

    // Box light from above
    bctx.globalCompositeOperation = 'screen';
    const lightGrad = bctx.createLinearGradient(cx, discTop, cx, discBottom);
    lightGrad.addColorStop(0, 'rgba(220,230,255,0.06)');
    lightGrad.addColorStop(0.3, 'rgba(200,215,240,0.04)');
    lightGrad.addColorStop(0.6, 'rgba(180,200,230,0.025)');
    lightGrad.addColorStop(1, 'rgba(150,170,200,0.01)');

    bctx.beginPath();
    bctx.arc(cx, discCy, maxR * 0.98, 0, Math.PI * 2);
    bctx.fillStyle = lightGrad;
    bctx.fill();
    bctx.globalCompositeOperation = 'source-over';
  }

  update(dt: number, music: MusicParams): void {
    this.time += dt;
    this.breathPhase += dt * 0.5;
    this.key = music.key;
    this.keyMode = music.keyMode;
    this.keyRotation = music.keyRotation;

    if (!this.awake) {
      if (music.currentTime > 0.1) this.awake = true;
      else return;
    }

    // Beat strength: downbeats stronger, offbeats ("ands") weaker
    // beatIndex 0 = beat 1 (strongest), others medium
    // beatPosition near 0.5 = offbeat (weaker)
    const downbeatBoost = music.beatIndex === 0 ? 1.5 : 1.0;
    const offbeatPenalty = 1.0 - Math.abs(music.beatPosition - 0.5) * 0.6; // 0.7-1.0
    const beatStrength = downbeatBoost * offbeatPenalty;

    // Light up all active voices - keep sustained notes visible
    for (const voice of music.activeVoices) {
      if (voice.midi < MIDI_LO || voice.midi >= MIDI_HI) continue;

      const idx = voice.midi - MIDI_LO;
      const node = this.nodes[idx];

      // Keep sustained notes at minimum brightness, flash on onset
      const minBrightness = 0.4; // sustained notes stay visible
      if (voice.onset) {
        // Loudness factor: quiet passages = fainter lines (0.1 to 1.0 range)
        const loudnessFactor = 0.1 + this.loudness * 0.9;
        node.brightness += voice.velocity * beatStrength * loudnessFactor;  // Accumulate, weighted by beat and loudness
        node.velocity = voice.velocity;
        node.lastHitTime = this.time;

        const c = samplePaletteColor(voice.pitchClass, 0.75);
        node.r = c[0]; node.g = c[1]; node.b = c[2];

        // GSAP beam animation - sharpness/intensity concentrated in outer octave
        const pitch01 = (voice.midi - MIDI_LO) / MIDI_RANGE;
        // Outer octave factor: 0 until ~85%, then ramps to 1
        const outerFactor = Math.max(0, (pitch01 - 0.85) / 0.15);
        const outerCurve = outerFactor * outerFactor; // quadratic ramp

        // Duration: mostly slow (2.1s), snappy only in outer octave (0.75s)
        const beamDuration = 2.1 - outerCurve * 1.35;
        // Spread: mostly wide (0.6), sharp only in outer octave (0.08)
        const targetSpread = 0.6 - outerCurve * 0.52;
        // Length: mostly short (0.35), long only in outer octave (1.2)
        const targetLength = 0.35 + outerCurve * 0.85;
        // Intensity: base velocity with attack boost, extra boost in outer octave
        const attackBoost = 1.8;  // stronger initial flash
        const intensityBoost = attackBoost + outerCurve * 0.7;

        // Set initial values and tween to zero
        // Apply loudness factor so quiet passages have fainter beams
        node.beamIntensity = voice.velocity * intensityBoost * loudnessFactor;
        node.beamLength = targetLength;
        node.beamSpread = targetSpread;

        gsap.to(node, {
          beamIntensity: 0,
          beamLength: 0,
          beamSpread: 0,
          duration: beamDuration,
          ease: 'power2.out',
          overwrite: true,
        });

        // Trail from previous note on same track
        const lastMidi = this.lastMidiByTrack.get(voice.track) ?? -1;
        if (lastMidi >= MIDI_LO && lastMidi < MIDI_HI && lastMidi !== voice.midi) {
          this.trails.push({
            from: lastMidi,
            to: voice.midi,
            strength: 1.0,
            age: 0,
          });
          if (this.trails.length > this.trailMax) this.trails.shift();
        }
        this.lastMidiByTrack.set(voice.track, voice.midi);
      } else {
        // Sustained note - keep visible
        node.brightness = Math.max(node.brightness, minBrightness);
      }
    }

    // Track tension and beat timing for visual modulation
    this.currentTension = music.tension;
    this.beatDuration = music.beatDuration;

    // Smooth loudness for brightness scaling (gradual response)
    const targetLoudness = music.loudness ?? 0;
    this.loudness += (targetLoudness - this.loudness) * 0.1;

    // === GROOVE CURVES ===
    const beatArrival = music.beatArrival ?? 0;

    // Beat pulse — brighten active nodes (subtle pulse on kicks)
    if (music.kick) {
      const pulseStrength = 0.08 + music.tension * 0.05;
      for (const node of this.nodes) {
        if (node.brightness > 0.05) node.brightness += pulseStrength;
      }
    }

    // Groove-driven pulse on active nodes (subtle)
    if (beatArrival > 0.1) {
      const arrivalPulse = beatArrival * 0.06;
      for (const node of this.nodes) {
        if (node.brightness > 0.05) node.brightness += arrivalPulse;
      }
    }

    // Decay nodes - long TTL so notes linger on spiral
    const nodeDecay = 0.4 + music.tension * 0.3;
    for (const node of this.nodes) {
      node.brightness *= Math.exp(-nodeDecay * dt);
    }

    // Decay trails (faster at high tension for more frantic feel)
    const trailDecay = 0.08 + music.tension * 0.15;
    for (let i = this.trails.length - 1; i >= 0; i--) {
      this.trails[i].strength *= Math.exp(-trailDecay * dt);
      this.trails[i].age += dt;
      if (this.trails[i].strength < 0.005) {
        this.trails.splice(i, 1);
      }
    }
  }

  render(): HTMLCanvasElement {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 + h * 0.04;  // shifted down slightly for balance
    const maxR = Math.min(w, h) / 2 * SPIRAL_RADIUS_SCALE;
    const breath = 1 + Math.sin(this.breathPhase) * 0.01;

    // --- Dark backdrop (cached for performance) ---
    if (this.darkBackdrop) {
      if (this.backdropDirty) {
        this.renderBackdropCache(cx, cy, maxR);
        this.backdropDirty = false;
      }
      ctx.drawImage(this.backdropCanvas, 0, 0);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const diatonicOffsets = this.keyMode === 'minor' ? MINOR_OFFSETS : MAJOR_OFFSETS;

    // --- Pre-compute note positions for this frame ---
    this.computeNotePositions(cx, cy, maxR * breath);

    // --- Draw cached spiral spine ---
    this.updateSpineCache();
    ctx.drawImage(this.spineCanvas, 0, 0);

    // --- Draw trails (stepwise follows curve, leaps are straight) ---
    for (const trail of this.trails) {
      if (trail.from < MIDI_LO || trail.from >= MIDI_HI) continue;
      if (trail.to < MIDI_LO || trail.to >= MIDI_HI) continue;

      // Use pre-computed positions
      const p0 = this.notePositions[trail.from - MIDI_LO];
      const p1 = this.notePositions[trail.to - MIDI_LO];

      const n0 = this.nodes[trail.from - MIDI_LO];
      const n1 = this.nodes[trail.to - MIDI_LO];
      const mr = Math.round((n0.r + n1.r) / 2);
      const mg = Math.round((n0.g + n1.g) / 2);
      const mb = Math.round((n0.b + n1.b) / 2);

      const s = trail.strength;
      const interval = Math.abs(trail.to - trail.from);

      // Stepwise motion (1-3 semitones) follows the spiral curve
      // Larger intervals are straight lines
      const isStepwise = interval <= 3;

      const drawPath = () => {
        ctx.beginPath();

        if (isStepwise && interval > 0) {
          // Follow spiral curve for stepwise motion using pre-computed positions
          const minIdx = Math.min(trail.from, trail.to) - MIDI_LO;
          const maxIdx = Math.max(trail.from, trail.to) - MIDI_LO;
          const goingUp = trail.to > trail.from;

          if (goingUp) {
            ctx.moveTo(this.notePositions[minIdx].x, this.notePositions[minIdx].y);
            for (let idx = minIdx + 1; idx <= maxIdx; idx++) {
              ctx.lineTo(this.notePositions[idx].x, this.notePositions[idx].y);
            }
          } else {
            ctx.moveTo(this.notePositions[maxIdx].x, this.notePositions[maxIdx].y);
            for (let idx = maxIdx - 1; idx >= minIdx; idx--) {
              ctx.lineTo(this.notePositions[idx].x, this.notePositions[idx].y);
            }
          }
        } else {
          // Straight line for leaps
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
        }
      };

      // Average scale for trail thickness
      const avgScale = (p0.scale + p1.scale) / 2;

      // Outer glow
      drawPath();
      ctx.strokeStyle = `rgba(${mr},${mg},${mb},${(s * 0.08 * this.intensity).toFixed(3)})`;
      ctx.lineWidth = (8 + s * 6) * avgScale;
      ctx.stroke();

      // Core
      drawPath();
      const bright = s * s;
      const wr = Math.min(255, mr + Math.round((255 - mr) * bright * 0.4));
      const wg = Math.min(255, mg + Math.round((255 - mg) * bright * 0.4));
      const wb = Math.min(255, mb + Math.round((255 - mb) * bright * 0.4));
      ctx.strokeStyle = `rgba(${wr},${wg},${wb},${(s * 0.35 * this.intensity).toFixed(3)})`;
      ctx.lineWidth = (1.5 + s * 2) * avgScale;
      ctx.stroke();
    }

    // --- Draw nodes ---
    // Light factor: nodes higher on screen receive slightly more light
    const lightTop = cy - maxR;
    const lightBottom = cy + maxR;
    const lightRange = lightBottom - lightTop;

    for (let i = 0; i < MIDI_RANGE; i++) {
      const midi = MIDI_LO + i;
      const node = this.nodes[i];
      const pos = this.notePositions[i]; // Use pre-computed position
      const pc = midi % 12;
      const semitones = semitoneOffset(pc, this.key);
      const inKey = diatonicOffsets.has(semitones);

      // Early skip for completely invisible nodes
      if (node.brightness < 0.001 && node.beamIntensity < 0.01) continue;

      const timeSinceHit = this.time - node.lastHitTime;

      // Light factor: 1.0 at top, 0.8 at bottom (gentle gradient)
      const lightT = Math.max(0, Math.min(1, (pos.y - lightTop) / lightRange));
      const lightFactor = 1.0 - lightT * 0.2;

      // Smooth fade using sqrt curve - keeps low values visible longer
      // Normalize by max brightness so only heavily-hit notes reach full size
      const MAX_BRIGHTNESS = 8.0;  // ~8 full-velocity hits to reach max
      const normalizedBrightness = Math.min(1, node.brightness / MAX_BRIGHTNESS);
      const alpha = Math.sqrt(normalizedBrightness) * lightFactor;

      // === ATTACK VS SUSTAIN COLORING ===
      // Attack phase (first 0.25s): hot white flash
      // Sustain phase: warm saturated color with amber tint
      const attackDuration = 0.25;
      const attackT = Math.min(1, timeSinceHit / attackDuration);
      const inAttack = attackT < 1;

      let glowR: number, glowG: number, glowB: number;
      if (inAttack) {
        // Attack: strong white shift (hot flash)
        const whiteShift = (1 - attackT) * (1 - attackT); // quadratic ease-out
        glowR = Math.min(255, node.r + Math.round((255 - node.r) * (0.7 + whiteShift * 0.3)));
        glowG = Math.min(255, node.g + Math.round((255 - node.g) * (0.65 + whiteShift * 0.35)));
        glowB = Math.min(255, node.b + Math.round((255 - node.b) * (0.6 + whiteShift * 0.4)));
      } else {
        // Sustain: warm saturated color (amber shift)
        const warmth = 0.12;
        const satBoost = 1.15;
        const gray = (node.r + node.g + node.b) / 3;
        const sr = gray + (node.r - gray) * satBoost;
        const sg = gray + (node.g - gray) * satBoost;
        const sb = gray + (node.b - gray) * satBoost;
        glowR = Math.min(255, Math.max(0, Math.round(sr + warmth * 40)));
        glowG = Math.min(255, Math.max(0, Math.round(sg + warmth * 10)));
        glowB = Math.min(255, Math.max(0, Math.round(sb - warmth * 25)));
      }

      // Beam effect - uses GSAP-tweened properties for smooth decay
      // Shape varies based on beamShape config
      if (node.beamIntensity > 0.01) {
        const dx = pos.x - cx;
        const dy = pos.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          const beamAngle = Math.atan2(dy, dx);
          const fullBeamLen = maxR * 3.0 - dist;
          const beamLen = fullBeamLen * node.beamLength;
          const spread = node.beamSpread;
          const beamAlpha = node.beamIntensity * this.intensity * lightFactor * 0.7;

          if (beamLen > 0) {
            const tipX = pos.x + Math.cos(beamAngle) * beamLen;
            const tipY = pos.y + Math.sin(beamAngle) * beamLen;

            // Render all active shapes
            for (const shape of this.activeShapes) {
            switch (shape) {
              case 'cone': {
                // Triangular flashlight beam
                const grad = ctx.createLinearGradient(pos.x, pos.y, tipX, tipY);
                grad.addColorStop(0, `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.5).toFixed(3)})`);
                grad.addColorStop(0.25, `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.2).toFixed(3)})`);
                grad.addColorStop(0.6, `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.06).toFixed(3)})`);
                grad.addColorStop(1, `rgba(${node.r},${node.g},${node.b},0)`);
                const edgeL = beamLen * 0.7;
                const conePath = new Path2D();
                conePath.moveTo(pos.x, pos.y);
                conePath.lineTo(pos.x + Math.cos(beamAngle - spread) * edgeL, pos.y + Math.sin(beamAngle - spread) * edgeL);
                conePath.lineTo(tipX, tipY);
                conePath.lineTo(pos.x + Math.cos(beamAngle + spread) * edgeL, pos.y + Math.sin(beamAngle + spread) * edgeL);
                conePath.closePath();
                ctx.fillStyle = grad;
                ctx.fill(conePath);
                break;
              }
              case 'ray': {
                // Thin laser beam with glow
                ctx.save();
                ctx.lineCap = 'round';
                // Outer glow
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(tipX, tipY);
                ctx.strokeStyle = `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.15).toFixed(3)})`;
                ctx.lineWidth = 12 * pos.scale;
                ctx.stroke();
                // Mid glow
                ctx.strokeStyle = `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.4).toFixed(3)})`;
                ctx.lineWidth = 4 * pos.scale;
                ctx.stroke();
                // Core
                ctx.strokeStyle = `rgba(255,255,255,${(beamAlpha * 0.7).toFixed(3)})`;
                ctx.lineWidth = 1.5 * pos.scale;
                ctx.stroke();
                ctx.restore();
                break;
              }
              case 'starburst': {
                // Multiple spokes radiating out
                const spokes = 5;
                for (let s = 0; s < spokes; s++) {
                  const spokeAngle = beamAngle + (s - (spokes - 1) / 2) * spread * 0.8;
                  const spokeLen = beamLen * (0.6 + Math.random() * 0.4);
                  const sTipX = pos.x + Math.cos(spokeAngle) * spokeLen;
                  const sTipY = pos.y + Math.sin(spokeAngle) * spokeLen;
                  const grad = ctx.createLinearGradient(pos.x, pos.y, sTipX, sTipY);
                  grad.addColorStop(0, `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.5).toFixed(3)})`);
                  grad.addColorStop(1, `rgba(${node.r},${node.g},${node.b},0)`);
                  ctx.beginPath();
                  ctx.moveTo(pos.x, pos.y);
                  ctx.lineTo(sTipX, sTipY);
                  ctx.strokeStyle = grad;
                  ctx.lineWidth = 3 * pos.scale;
                  ctx.stroke();
                }
                break;
              }
              case 'ring': {
                // Expanding circular ripples
                const rings = 3;
                for (let r = 0; r < rings; r++) {
                  const ringR = beamLen * 0.3 * (r + 1);
                  const ringAlpha = beamAlpha * (1 - r / rings) * 0.4;
                  ctx.beginPath();
                  ctx.arc(pos.x, pos.y, ringR, 0, Math.PI * 2);
                  ctx.strokeStyle = `rgba(${node.r},${node.g},${node.b},${ringAlpha.toFixed(3)})`;
                  ctx.lineWidth = (3 - r) * pos.scale;
                  ctx.stroke();
                }
                break;
              }
              case 'teardrop': {
                // Rounded blob that trails off
                const tearLen = beamLen * 0.6;
                const tearWidth = tearLen * spread * 1.5;
                ctx.save();
                ctx.translate(pos.x, pos.y);
                ctx.rotate(beamAngle);
                const grad = ctx.createRadialGradient(tearLen * 0.3, 0, 0, tearLen * 0.3, 0, tearLen * 0.7);
                grad.addColorStop(0, `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.6).toFixed(3)})`);
                grad.addColorStop(0.5, `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.25).toFixed(3)})`);
                grad.addColorStop(1, `rgba(${node.r},${node.g},${node.b},0)`);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(tearLen * 0.5, -tearWidth, tearLen, 0);
                ctx.quadraticCurveTo(tearLen * 0.5, tearWidth, 0, 0);
                ctx.fillStyle = grad;
                ctx.fill();
                ctx.restore();
                break;
              }
              case 'nebula': {
                // Soft diffuse cloud
                const cloudR = beamLen * 0.5;
                const cloudX = pos.x + Math.cos(beamAngle) * cloudR * 0.5;
                const cloudY = pos.y + Math.sin(beamAngle) * cloudR * 0.5;
                for (let c = 0; c < 4; c++) {
                  const offsetAngle = beamAngle + (c - 1.5) * spread * 0.5;
                  const offsetDist = cloudR * 0.3 * c;
                  const cx2 = cloudX + Math.cos(offsetAngle) * offsetDist;
                  const cy2 = cloudY + Math.sin(offsetAngle) * offsetDist;
                  const cR = cloudR * (0.4 + c * 0.15);
                  const grad = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, cR);
                  grad.addColorStop(0, `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.2).toFixed(3)})`);
                  grad.addColorStop(0.4, `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.08).toFixed(3)})`);
                  grad.addColorStop(1, `rgba(${node.r},${node.g},${node.b},0)`);
                  ctx.fillStyle = grad;
                  ctx.beginPath();
                  ctx.arc(cx2, cy2, cR, 0, Math.PI * 2);
                  ctx.fill();
                }
                break;
              }
              case 'comet': {
                // Head with trailing tail
                const headR = 8 * pos.scale;
                const tailLen = beamLen * 0.8;
                // Tail gradient
                ctx.save();
                ctx.translate(pos.x, pos.y);
                ctx.rotate(beamAngle + Math.PI); // tail trails behind
                const tailGrad = ctx.createLinearGradient(0, 0, tailLen, 0);
                tailGrad.addColorStop(0, `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.5).toFixed(3)})`);
                tailGrad.addColorStop(0.3, `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.2).toFixed(3)})`);
                tailGrad.addColorStop(1, `rgba(${node.r},${node.g},${node.b},0)`);
                ctx.beginPath();
                ctx.moveTo(0, -headR * 0.5);
                ctx.quadraticCurveTo(tailLen * 0.5, 0, tailLen, 0);
                ctx.quadraticCurveTo(tailLen * 0.5, 0, 0, headR * 0.5);
                ctx.fillStyle = tailGrad;
                ctx.fill();
                ctx.restore();
                // Bright head
                const headGrad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, headR);
                headGrad.addColorStop(0, `rgba(255,255,255,${(beamAlpha * 0.8).toFixed(3)})`);
                headGrad.addColorStop(0.3, `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.6).toFixed(3)})`);
                headGrad.addColorStop(1, `rgba(${node.r},${node.g},${node.b},0)`);
                ctx.fillStyle = headGrad;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, headR, 0, Math.PI * 2);
                ctx.fill();
                break;
              }
              case 'spark': {
                // Electric crackling lines
                const numSparks = 6;
                ctx.save();
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                for (let s = 0; s < numSparks; s++) {
                  const sparkAngle = beamAngle + (Math.random() - 0.5) * spread * 3;
                  const sparkLen = beamLen * (0.3 + Math.random() * 0.5);
                  ctx.beginPath();
                  ctx.moveTo(pos.x, pos.y);
                  // Jagged path
                  let cx = pos.x, cy = pos.y;
                  const segs = 3 + Math.floor(Math.random() * 3);
                  for (let j = 0; j < segs; j++) {
                    const t = (j + 1) / segs;
                    const jitter = (Math.random() - 0.5) * 20 * pos.scale;
                    cx = pos.x + Math.cos(sparkAngle) * sparkLen * t + Math.cos(sparkAngle + Math.PI/2) * jitter;
                    cy = pos.y + Math.sin(sparkAngle) * sparkLen * t + Math.sin(sparkAngle + Math.PI/2) * jitter;
                    ctx.lineTo(cx, cy);
                  }
                  ctx.strokeStyle = `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.4).toFixed(3)})`;
                  ctx.lineWidth = 2 * pos.scale;
                  ctx.stroke();
                }
                ctx.restore();
                break;
              }
              case 'bloom': {
                // Flower-like petals
                const petals = 6;
                const petalLen = beamLen * 0.5;
                for (let p = 0; p < petals; p++) {
                  const petalAngle = beamAngle + (p / petals) * Math.PI * 2;
                  const px = pos.x + Math.cos(petalAngle) * petalLen * 0.5;
                  const py = pos.y + Math.sin(petalAngle) * petalLen * 0.5;
                  const grad = ctx.createRadialGradient(px, py, 0, px, py, petalLen * 0.4);
                  grad.addColorStop(0, `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.4).toFixed(3)})`);
                  grad.addColorStop(1, `rgba(${node.r},${node.g},${node.b},0)`);
                  ctx.fillStyle = grad;
                  ctx.beginPath();
                  ctx.ellipse(px, py, petalLen * 0.15, petalLen * 0.4, petalAngle, 0, Math.PI * 2);
                  ctx.fill();
                }
                // Center
                const centerGrad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 6 * pos.scale);
                centerGrad.addColorStop(0, `rgba(255,255,255,${(beamAlpha * 0.6).toFixed(3)})`);
                centerGrad.addColorStop(1, `rgba(${node.r},${node.g},${node.b},0)`);
                ctx.fillStyle = centerGrad;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 6 * pos.scale, 0, Math.PI * 2);
                ctx.fill();
                break;
              }
              case 'wave': {
                // Sinusoidal ripple
                ctx.save();
                ctx.translate(pos.x, pos.y);
                ctx.rotate(beamAngle);
                const waveLen = beamLen * 0.7;
                const amplitude = 15 * pos.scale * spread;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                for (let w = 0; w <= 20; w++) {
                  const t = w / 20;
                  const wx = t * waveLen;
                  const wy = Math.sin(t * Math.PI * 3) * amplitude * (1 - t);
                  ctx.lineTo(wx, wy);
                }
                for (let w = 20; w >= 0; w--) {
                  const t = w / 20;
                  const wx = t * waveLen;
                  const wy = Math.sin(t * Math.PI * 3) * amplitude * (1 - t) * 0.3;
                  ctx.lineTo(wx, wy);
                }
                ctx.closePath();
                const waveGrad = ctx.createLinearGradient(0, 0, waveLen, 0);
                waveGrad.addColorStop(0, `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.5).toFixed(3)})`);
                waveGrad.addColorStop(1, `rgba(${node.r},${node.g},${node.b},0)`);
                ctx.fillStyle = waveGrad;
                ctx.fill();
                ctx.restore();
                break;
              }
              case 'crystal': {
                // Geometric faceted shape
                ctx.save();
                ctx.translate(pos.x, pos.y);
                ctx.rotate(beamAngle);
                const crystalLen = beamLen * 0.5;
                const crystalW = crystalLen * 0.3;
                // Main crystal body
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(crystalLen * 0.4, -crystalW);
                ctx.lineTo(crystalLen, 0);
                ctx.lineTo(crystalLen * 0.4, crystalW);
                ctx.closePath();
                const crystalGrad = ctx.createLinearGradient(0, 0, crystalLen, 0);
                crystalGrad.addColorStop(0, `rgba(255,255,255,${(beamAlpha * 0.6).toFixed(3)})`);
                crystalGrad.addColorStop(0.5, `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.4).toFixed(3)})`);
                crystalGrad.addColorStop(1, `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.1).toFixed(3)})`);
                ctx.fillStyle = crystalGrad;
                ctx.fill();
                // Highlight edge
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(crystalLen * 0.4, -crystalW);
                ctx.lineTo(crystalLen, 0);
                ctx.strokeStyle = `rgba(255,255,255,${(beamAlpha * 0.3).toFixed(3)})`;
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
                break;
              }
              case 'firefly': {
                // Dancing particles - simplified for performance
                const maxFlyDist = fullBeamLen * 0.7;

                // Beat-synced using absolute time (not reset by repeated hits)
                const beatNum = Math.floor(this.time / this.beatDuration);
                const beatPhase = (this.time % this.beatDuration) / this.beatDuration;

                // Random 0-3 particles per beat (stable within beat)
                const numFlies = (beatNum * 41 + midi * 7) % 4;

                // Smooth fade: in during first 20%, full 20-60%, out 60-100%
                let beatFade = 1.0;
                if (beatPhase < 0.2) beatFade = beatPhase / 0.2;
                else if (beatPhase > 0.6) beatFade = 1.0 - (beatPhase - 0.6) / 0.4;

                for (let f = 0; f < numFlies; f++) {
                  // Stable seeds within each beat - changes each beat for variety
                  const beatSeed = (beatNum * 97 + midi * 7 + f * 13) % 1000;
                  const seed = (beatSeed % 100) / 100;
                  const seed2 = ((beatSeed * 3 + 17) % 100) / 100;
                  const seed3 = ((beatSeed * 7 + 31) % 100) / 100;

                  // Start scattered, converge over the beat
                  const convergence = beatPhase;  // 0 at beat start, 1 at beat end
                  const baseDist = maxFlyDist * (0.05 + seed * 0.6) * (1 - convergence * 0.8);
                  const wobbleAmt = (4 + seed2 * 6) * pos.scale * (1 - convergence);
                  const wobble = Math.sin(this.time * (4 + seed3 * 4) + f * 2 + seed * 10) * wobbleAmt;
                  const flyAngle = beamAngle + (seed - 0.5) * Math.PI * 1.4;
                  const flyDist = baseDist;
                  const fx = pos.x + Math.cos(flyAngle) * flyDist + Math.cos(flyAngle + Math.PI/2) * wobble;
                  const fy = pos.y + Math.sin(flyAngle) * flyDist + Math.sin(flyAngle + Math.PI/2) * wobble;
                  const flyR = (1.5 + seed2 * 2) * pos.scale;

                  // Apply beat fade to alpha
                  const coreAlpha = beamAlpha * 0.4 * beatFade;
                  const outerAlpha = beamAlpha * 0.12 * beatFade;
                  // Outer glow
                  ctx.fillStyle = `rgba(${node.r},${node.g},${node.b},${outerAlpha.toFixed(3)})`;
                  ctx.beginPath();
                  ctx.arc(fx, fy, flyR * 1.5, 0, Math.PI * 2);
                  ctx.fill();
                  // Core
                  ctx.fillStyle = `rgba(255,255,200,${coreAlpha.toFixed(3)})`;
                  ctx.beginPath();
                  ctx.arc(fx, fy, flyR * 0.5, 0, Math.PI * 2);
                  ctx.fill();
                }
                break;
              }
            }
            } // end for each active shape
          }
        }

        // Point glow at note position - layered fills instead of gradient (faster)
        const tensionGlow = 1.0 + this.currentTension * 0.4;
        const glowRadius = (10 + alpha * 22 + node.velocity * 10) * tensionGlow * pos.scale;
        const glowIntensity = this.intensity * 0.8 * (1.0 + this.currentTension * 0.25);

        // Outer glow - use attack/sustain colors
        ctx.fillStyle = `rgba(${glowR},${glowG},${glowB},${(alpha * 0.05 * glowIntensity).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Mid glow
        ctx.fillStyle = `rgba(${glowR},${glowG},${glowB},${(alpha * 0.12 * glowIntensity).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, glowRadius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Core glow - whiter during attack for hot center
        const coreWhite = inAttack ? 0.4 : 0;
        const coreR = Math.min(255, glowR + Math.round((255 - glowR) * coreWhite));
        const coreG = Math.min(255, glowG + Math.round((255 - glowG) * coreWhite));
        const coreB = Math.min(255, glowB + Math.round((255 - glowB) * coreWhite));
        ctx.fillStyle = `rgba(${coreR},${coreG},${coreB},${(alpha * 0.35 * glowIntensity).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, glowRadius * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dot: diatonic notes brighter, chromatic visible
      // Scale dot by depth (higher notes = larger = closer)
      const baseAlpha = inKey ? 0.25 : 0.10;
      const dotAlpha = baseAlpha + alpha * 0.5;
      if (dotAlpha < 0.005) continue;

      const baseDotR = inKey ? (4.0 + alpha * 4) : (2.5 + alpha * 3);
      const dotR = baseDotR * pos.scale;

      // Soft glow outline around dot (scaled by depth)
      if (this.glowOutlines && dotAlpha > 0.12) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, dotR + 3 * pos.scale, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${(dotAlpha * 0.25 * this.intensity).toFixed(3)})`;
        ctx.lineWidth = 2.5 * pos.scale;
        ctx.stroke();
      }

      // Use pre-computed attack/sustain colors (glowR, glowG, glowB)
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${glowR},${glowG},${glowB},${Math.min(1, dotAlpha * this.intensity).toFixed(3)})`;
      ctx.fill();

      // Soft top highlight - subtle rim light
      if (alpha > 0.18) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y - dotR * 0.3, dotR * 0.6, Math.PI, 0);
        const highlightAlpha = alpha * lightFactor * 0.2 * this.intensity;
        ctx.strokeStyle = `rgba(255,255,255,${highlightAlpha.toFixed(3)})`;
        ctx.lineWidth = 1.4 * pos.scale;
        ctx.stroke();
      }

      // Soft pulse ring on hit - use attack/sustain colors
      if (timeSinceHit < 0.7) {
        const pulseT = timeSinceHit / 0.7;
        const pulseR = (7 + pulseT * 28) * pos.scale;
        const pulseAlpha = (1 - pulseT) * (1 - pulseT) * 0.18 * node.velocity;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${glowR},${glowG},${glowB},${pulseAlpha.toFixed(3)})`;
        ctx.lineWidth = 1.5 * (1 - pulseT);
        ctx.stroke();
      }
    }

    // --- Draw octave markers at tonic positions ---
    ctx.globalAlpha = 0.15;
    for (let oct = 0; oct < 5; oct++) {
      const midi = MIDI_LO + this.key - (MIDI_LO % 12) + oct * 12;
      if (midi < MIDI_LO || midi >= MIDI_HI) continue;
      const pos = this.notePos(midi, cx, cy, maxR * breath);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
    return this.canvas;
  }

  isReady(): boolean { return this.ready; }

  dispose(): void {
    this.ready = false;
    this.trails = [];
    this.lastMidiByTrack.clear();
    this.awake = false;
    this.initNodes();
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'activeShapes', label: 'Shapes', type: 'multi-toggle', value: Array.from(this.activeShapes).join(','), options: NoteSpiralEffect.SHAPES },
      { key: 'spiralTightness', label: 'Tightness', type: 'range', value: this.spiralTightness, min: 0.5, max: 1.5, step: 0.05 },
      { key: 'intensity', label: 'Intensity', type: 'range', value: this.intensity, min: 0.3, max: 2.0, step: 0.1 },
      { key: 'trailMax', label: 'Trail Length', type: 'range', value: this.trailMax, min: 6, max: 48, step: 6 },
      { key: 'darkBackdrop', label: 'Dark Backdrop', type: 'toggle', value: this.darkBackdrop },
      { key: 'glowOutlines', label: 'Glow Outlines', type: 'toggle', value: this.glowOutlines },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'activeShapes') {
      // Toggle the shape on/off
      const shape = value as string;
      if (this.activeShapes.has(shape)) {
        this.activeShapes.delete(shape);
      } else {
        this.activeShapes.add(shape);
      }
    }
    if (key === 'setShapes') {
      // Set shapes directly (comma-separated list)
      this.activeShapes.clear();
      const valueStr = typeof value === 'string' ? value : String(value ?? '');
      const shapes = valueStr.split(',').filter(s => s);
      for (const s of shapes) this.activeShapes.add(s);
    }
    if (key === 'spiralTightness') this.spiralTightness = value as number;
    if (key === 'intensity') this.intensity = value as number;
    if (key === 'trailMax') this.trailMax = value as number;
    if (key === 'darkBackdrop') this.darkBackdrop = value as boolean;
    if (key === 'glowOutlines') this.glowOutlines = value as boolean;
  }
}
