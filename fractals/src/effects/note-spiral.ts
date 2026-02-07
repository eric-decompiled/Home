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
  private glowCanvas: HTMLCanvasElement;
  private glowCtx: CanvasRenderingContext2D;
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

  // Config
  private intensity = 1.0;
  private trailMax = 24;
  private darkBackdrop = true;
  private glowOutlines = true;
  private currentTension = 0;  // for tension-driven visuals

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.glowCanvas = document.createElement('canvas');
    this.glowCtx = this.glowCanvas.getContext('2d')!;
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
    this.glowCanvas.width = width;
    this.glowCanvas.height = height;
    this.ready = true;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.glowCanvas.width = width;
    this.glowCanvas.height = height;
  }

  // Map MIDI note to spiral position - delegates to shared spiralPos utility
  private notePos(midi: number, cx: number, cy: number, maxR: number): { x: number; y: number; r: number; scale: number } {
    const pos = spiralPos(midi, midi % 12, this.key, this.keyRotation, cx, cy, maxR);
    return { x: pos.x, y: pos.y, r: pos.radius, scale: pos.scale };
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

    // Light up all active voices - keep sustained notes visible
    for (const voice of music.activeVoices) {
      if (voice.midi < MIDI_LO || voice.midi >= MIDI_HI) continue;

      const idx = voice.midi - MIDI_LO;
      const node = this.nodes[idx];

      // Keep sustained notes at minimum brightness, flash on onset
      const minBrightness = 0.4; // sustained notes stay visible
      if (voice.onset) {
        node.brightness = 1.0;
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
        node.beamIntensity = voice.velocity * intensityBoost;
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

    // Track tension for visual modulation
    this.currentTension = music.tension;

    // === GROOVE CURVES ===
    const beatArrival = music.beatArrival ?? 0;

    // Beat pulse — brighten active nodes (stronger pulse at high tension)
    // Use arrival curve for the "hit" impact
    if (music.kick) {
      const pulseStrength = 0.15 + music.tension * 0.1;
      for (const node of this.nodes) {
        if (node.brightness > 0.05) node.brightness = Math.min(1.0, node.brightness + pulseStrength);
      }
    }

    // Groove-driven pulse on active nodes
    if (beatArrival > 0.1) {
      const arrivalPulse = beatArrival * 0.12;
      for (const node of this.nodes) {
        if (node.brightness > 0.05) node.brightness = Math.min(1.0, node.brightness + arrivalPulse);
      }
    }

    // Decay nodes - shorter TTL for snappier response
    const nodeDecay = 4.0 + music.tension * 2.0;
    for (const node of this.nodes) {
      node.brightness *= Math.exp(-nodeDecay * dt);
    }

    // Decay trails (faster at high tension for more frantic feel)
    const trailDecay = 0.15 + music.tension * 0.2;
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
    const cy = h / 2;
    const maxR = Math.min(w, h) / 2 * SPIRAL_RADIUS_SCALE;
    const breath = 1 + Math.sin(this.breathPhase) * 0.01;

    // --- Dark backdrop with depth gradient ---
    if (this.darkBackdrop) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,1)';
      ctx.shadowBlur = 60;
      ctx.shadowOffsetX = 12;
      ctx.shadowOffsetY = 12;

      // Gradient backdrop: lifted at top, descends into true black
      const discCy = cy - maxR * 0.04;
      const discTop = discCy - maxR;
      const discBottom = discCy + maxR;

      // Vertical gradient - warm gray at top, cool black at bottom
      const depthGrad = ctx.createLinearGradient(cx, discTop, cx, discBottom);
      depthGrad.addColorStop(0, 'rgba(38,36,42,0.5)');    // warm gray, lifted
      depthGrad.addColorStop(0.35, 'rgba(22,22,28,0.5)'); // transition
      depthGrad.addColorStop(0.65, 'rgba(10,12,18,0.5)'); // cool dark blue
      depthGrad.addColorStop(1, 'rgba(0,0,5,0.5)');       // deep blue-black

      ctx.beginPath();
      ctx.arc(cx, discCy, maxR * 0.98, 0, Math.PI * 2);
      ctx.fillStyle = depthGrad;
      ctx.fill();

      // Ambient occlusion - darker at bottom center for depth
      const aoGrad = ctx.createRadialGradient(
        cx, discCy + maxR * 0.4, 0,
        cx, discCy + maxR * 0.4, maxR * 0.8
      );
      aoGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
      aoGrad.addColorStop(0.5, 'rgba(0,0,0,0.15)');
      aoGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aoGrad;
      ctx.fill();
      ctx.restore();

      // --- Box light from above ---
      // Gentle vertical gradient - more evenly distributed
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const lightGrad = ctx.createLinearGradient(cx, discTop, cx, discBottom);
      lightGrad.addColorStop(0, 'rgba(220,230,255,0.06)');
      lightGrad.addColorStop(0.3, 'rgba(200,215,240,0.04)');
      lightGrad.addColorStop(0.6, 'rgba(180,200,230,0.025)');
      lightGrad.addColorStop(1, 'rgba(150,170,200,0.01)');

      ctx.beginPath();
      ctx.arc(cx, discCy, maxR * 0.98, 0, Math.PI * 2);
      ctx.fillStyle = lightGrad;
      ctx.fill();
      ctx.restore();
    }

    // --- Fade glow canvas toward black (absorbed light persists) ---
    const gctx = this.glowCtx;
    gctx.globalCompositeOperation = 'destination-out';
    gctx.fillStyle = 'rgba(0,0,0,0.008)'; // very slow fade
    gctx.fillRect(0, 0, w, h);
    gctx.globalCompositeOperation = 'screen';

    // Draw glow layer behind everything
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.drawImage(this.glowCanvas, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const diatonicOffsets = this.keyMode === 'minor' ? MINOR_OFFSETS : MAJOR_OFFSETS;

    // --- Draw spiral spine with colored segments ---
    // Draw per-octave so each revolution gets a smooth 12-stop color gradient
    const totalOctaves = Math.floor(MIDI_RANGE / 12);
    for (let oct = 0; oct < totalOctaves; oct++) {
      const octStart = MIDI_LO + oct * 12;
      const octEnd = Math.min(octStart + 12, MIDI_HI);

      // Build positions for this octave
      const positions: { x: number; y: number }[] = [];
      for (let midi = octStart; midi <= octEnd && midi < MIDI_HI; midi++) {
        positions.push(this.notePos(midi, cx, cy, maxR * breath));
      }
      if (positions.length < 2) continue;

      // Measure total arc length for this octave
      let totalLen = 0;
      const segLens: number[] = [0];
      for (let j = 1; j < positions.length; j++) {
        const dx = positions[j].x - positions[j - 1].x;
        const dy = positions[j].y - positions[j - 1].y;
        totalLen += Math.sqrt(dx * dx + dy * dy);
        segLens.push(totalLen);
      }

      // Draw each segment with a gradient spanning from its note color to the next
      for (let j = 1; j < positions.length; j++) {
        const midi = octStart + j;
        const prevMidi = midi - 1;
        const p0 = positions[j - 1];
        const p1 = positions[j];

        const pc0 = prevMidi % 12;
        const pc1 = midi % 12;
        const c0 = samplePaletteColor(pc0, 0.65);
        const c1 = samplePaletteColor(pc1, 0.65);

        const semi = semitoneOffset(midi % 12, this.key);
        const prevSemi = semitoneOffset(prevMidi % 12, this.key);
        const inKey = diatonicOffsets.has(semi) || diatonicOffsets.has(prevSemi);
        const baseAlpha = inKey ? 0.4 : 0.15;
        const lw = inKey ? 2.0 : 1.0;

        const grad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
        grad.addColorStop(0, `rgba(${c0[0]},${c0[1]},${c0[2]},${baseAlpha})`);
        grad.addColorStop(1, `rgba(${c1[0]},${c1[1]},${c1[2]},${baseAlpha})`);

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = lw;
        ctx.stroke();
      }
    }

    // --- Draw trails (stepwise follows curve, leaps are straight) ---
    for (const trail of this.trails) {
      if (trail.from < MIDI_LO || trail.from >= MIDI_HI) continue;
      if (trail.to < MIDI_LO || trail.to >= MIDI_HI) continue;

      const p0 = this.notePos(trail.from, cx, cy, maxR * breath);
      const p1 = this.notePos(trail.to, cx, cy, maxR * breath);

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
          // Follow spiral curve for stepwise motion
          const steps = interval * 4;  // smooth curve
          const minMidi = Math.min(trail.from, trail.to);
          const maxMidi = Math.max(trail.from, trail.to);
          const goingUp = trail.to > trail.from;

          const firstPos = goingUp
            ? this.notePos(minMidi, cx, cy, maxR * breath)
            : this.notePos(maxMidi, cx, cy, maxR * breath);
          ctx.moveTo(firstPos.x, firstPos.y);

          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const midi = goingUp
              ? minMidi + t * (maxMidi - minMidi)
              : maxMidi - t * (maxMidi - minMidi);
            const pos = this.notePos(midi, cx, cy, maxR * breath);
            ctx.lineTo(pos.x, pos.y);
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
      const pos = this.notePos(midi, cx, cy, maxR * breath);
      const pc = midi % 12;
      const semitones = semitoneOffset(pc, this.key);
      const inKey = diatonicOffsets.has(semitones);

      const timeSinceHit = this.time - node.lastHitTime;

      // Light factor: 1.0 at top, 0.8 at bottom (gentle gradient)
      const lightT = Math.max(0, Math.min(1, (pos.y - lightTop) / lightRange));
      const lightFactor = 1.0 - lightT * 0.2;

      // Smooth fade using sqrt curve - keeps low values visible longer
      const alpha = Math.sqrt(node.brightness) * lightFactor;

      // Flashlight beam - uses GSAP-tweened properties for smooth decay
      // Bass: wide, diffuse, slow decay.  Treble: sharp, focused, quick decay.
      if (node.beamIntensity > 0.01) {
        const dx = pos.x - cx;
        const dy = pos.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          const beamAngle = Math.atan2(dy, dx);
          const fullBeamLen = maxR * 3.0 - dist;
          // Use tweened length and spread
          const beamLen = fullBeamLen * node.beamLength;
          const spread = node.beamSpread;

          if (beamLen > 0) {
            // Beam tip
            const tipX = pos.x + Math.cos(beamAngle) * beamLen;
            const tipY = pos.y + Math.sin(beamAngle) * beamLen;

            // Gradient along beam direction - soft but visible
            const grad = ctx.createLinearGradient(pos.x, pos.y, tipX, tipY);
            const beamAlpha = node.beamIntensity * this.intensity * lightFactor * 0.7;
            grad.addColorStop(0, `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.5).toFixed(3)})`);
            grad.addColorStop(0.25, `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.2).toFixed(3)})`);
            grad.addColorStop(0.6, `rgba(${node.r},${node.g},${node.b},${(beamAlpha * 0.06).toFixed(3)})`);
            grad.addColorStop(1, `rgba(${node.r},${node.g},${node.b},0)`);

            // Draw cone as a triangle fan
            const edgeL = beamLen * 0.7;
            const conePath = new Path2D();
            conePath.moveTo(pos.x, pos.y);
            conePath.lineTo(
              pos.x + Math.cos(beamAngle - spread) * edgeL,
              pos.y + Math.sin(beamAngle - spread) * edgeL
            );
            conePath.lineTo(tipX, tipY);
            conePath.lineTo(
              pos.x + Math.cos(beamAngle + spread) * edgeL,
              pos.y + Math.sin(beamAngle + spread) * edgeL
            );
            conePath.closePath();
            ctx.fillStyle = grad;
            ctx.fill(conePath);

            // Stamp beam onto glow canvas (soft absorbed light)
            const glowGrad = gctx.createLinearGradient(pos.x, pos.y, tipX, tipY);
            const stampAlpha = node.beamIntensity * 0.025;
            glowGrad.addColorStop(0, `rgba(${node.r},${node.g},${node.b},${(stampAlpha * 0.4).toFixed(3)})`);
            glowGrad.addColorStop(0.4, `rgba(${node.r},${node.g},${node.b},${(stampAlpha * 0.1).toFixed(3)})`);
            glowGrad.addColorStop(1, `rgba(${node.r},${node.g},${node.b},0)`);
            gctx.fillStyle = glowGrad;
            gctx.fill(conePath);
          }
        }

        // Point glow at note position - soft but visible halo
        const tensionGlow = 1.0 + this.currentTension * 0.4;
        const glowR = (10 + alpha * 22 + node.velocity * 10) * tensionGlow * pos.scale;
        const glowIntensity = this.intensity * 0.8 * (1.0 + this.currentTension * 0.25);
        const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR);
        glow.addColorStop(0, `rgba(${node.r},${node.g},${node.b},${(alpha * 0.45 * glowIntensity).toFixed(3)})`);
        glow.addColorStop(0.25, `rgba(${node.r},${node.g},${node.b},${(alpha * 0.18 * glowIntensity).toFixed(3)})`);
        glow.addColorStop(0.6, `rgba(${node.r},${node.g},${node.b},${(alpha * 0.05 * glowIntensity).toFixed(3)})`);
        glow.addColorStop(1, `rgba(${node.r},${node.g},${node.b},0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(pos.x - glowR, pos.y - glowR, glowR * 2, glowR * 2);
      }

      // Dot: diatonic notes brighter, chromatic visible
      // Scale dot by depth (higher notes = larger = closer)
      const baseAlpha = inKey ? 0.3 : 0.12;
      const dotAlpha = baseAlpha + alpha * 0.75;
      if (dotAlpha < 0.005) continue;

      const baseDotR = inKey ? (4.5 + alpha * 6) : (2.5 + alpha * 4);
      const dotR = baseDotR * pos.scale;
      const wt = alpha * alpha;
      const cr = Math.min(255, node.r + Math.round((255 - node.r) * wt * 0.5));
      const cg = Math.min(255, node.g + Math.round((255 - node.g) * wt * 0.5));
      const cb = Math.min(255, node.b + Math.round((255 - node.b) * wt * 0.5));

      // Soft glow outline around dot (scaled by depth)
      if (this.glowOutlines && dotAlpha > 0.12) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, dotR + 3 * pos.scale, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${(dotAlpha * 0.25 * this.intensity).toFixed(3)})`;
        ctx.lineWidth = 2.5 * pos.scale;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${Math.min(1, dotAlpha * this.intensity).toFixed(3)})`;
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

      // Soft pulse ring on hit
      if (timeSinceHit < 0.7) {
        const pulseT = timeSinceHit / 0.7;
        const pulseR = (7 + pulseT * 28) * pos.scale;
        const pulseAlpha = (1 - pulseT) * (1 - pulseT) * 0.18 * node.velocity;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pulseR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${node.r},${node.g},${node.b},${pulseAlpha.toFixed(3)})`;
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
      { key: 'intensity', label: 'Intensity', type: 'range', value: this.intensity, min: 0.3, max: 2.0, step: 0.1 },
      { key: 'trailMax', label: 'Trail Length', type: 'range', value: this.trailMax, min: 6, max: 48, step: 6 },
      { key: 'darkBackdrop', label: 'Dark Backdrop', type: 'toggle', value: this.darkBackdrop },
      { key: 'glowOutlines', label: 'Glow Outlines', type: 'toggle', value: this.glowOutlines },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'intensity') this.intensity = value as number;
    if (key === 'trailMax') this.trailMax = value as number;
    if (key === 'darkBackdrop') this.darkBackdrop = value as boolean;
    if (key === 'glowOutlines') this.glowOutlines = value as boolean;
  }
}
