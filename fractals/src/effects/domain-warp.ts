// --- Domain Warping Centerpiece ---
// Layered fractal Brownian motion (fbm) warped through itself.
// Creates flowing organic structures — tendrils, clouds, aurora-like forms.
//
// The technique: instead of fbm(p), compute fbm(p + fbm(p + fbm(p))).
// Each warp layer adds distortion, creating complex flowing patterns.
//
// Per-degree anchors control warp amount, scale, and color shift to produce
// distinct visual textures for each harmonic function.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { palettes } from '../fractal-engine.ts';
import { gsap } from '../animation.ts';

const SIM_W = 400;
const SIM_H = 300;

const VERT_SRC = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0, 1);
}`;

const FRAG_SRC = `
precision highp float;
varying vec2 v_uv;

uniform float u_time;
uniform float u_warpAmount;
uniform float u_warpScale;
uniform float u_flowSpeed;
uniform float u_detail;     // fbm octaves mix
uniform float u_amplitude;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_color4;

// Spatial waves: bass from bottom, melody from sides
uniform float u_bassWave;    // vertical wave amplitude
uniform float u_melodyWave;  // horizontal wave amplitude

// Hash-based noise (no texture needed)
vec2 hash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(hash(i + vec2(0,0)), f - vec2(0,0)),
        dot(hash(i + vec2(1,0)), f - vec2(1,0)), u.x),
    mix(dot(hash(i + vec2(0,1)), f - vec2(0,1)),
        dot(hash(i + vec2(1,1)), f - vec2(1,1)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float val = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 5; i++) {
    val += amp * noise(p * freq);
    freq *= 2.0;
    amp *= 0.5;
  }
  return val;
}

void main() {
  vec2 uv = v_uv;

  // Spatial wave displacement - waves push the UV coordinates
  // Bass wave: pushes up from bottom (stronger near y=0)
  float bassInfluence = 1.0 - uv.y;  // stronger at bottom
  uv.y += u_bassWave * bassInfluence * sin(uv.x * 6.28 + u_time * 2.0) * 0.03;

  // Melody wave: pushes in from sides (stronger near edges)
  float melodyInfluence = abs(uv.x - 0.5) * 2.0;  // stronger at sides
  uv.x += u_melodyWave * melodyInfluence * sin(uv.y * 6.28 + u_time * 1.5) * 0.03;

  vec2 p = (uv - 0.5) * u_warpScale;
  float t = u_time * u_flowSpeed;

  // Triple domain warping: fbm(p + fbm(p + fbm(p)))
  vec2 q = vec2(
    fbm(p + vec2(0.0, 0.0) + t * 0.1),
    fbm(p + vec2(5.2, 1.3) + t * 0.12)
  );

  vec2 r = vec2(
    fbm(p + u_warpAmount * q + vec2(1.7, 9.2) + t * 0.15),
    fbm(p + u_warpAmount * q + vec2(8.3, 2.8) + t * 0.13)
  );

  float f = fbm(p + u_warpAmount * r);

  // Add detail layer - also affected by waves
  f += u_detail * fbm(p * 3.0 + r * 2.0 + t * 0.08);

  // Wave interference adds texture variation
  f += (u_bassWave + u_melodyWave) * 0.04 * sin(p.x * 4.0 + p.y * 4.0 + t);

  // Normalize to 0-1 range
  f = f * 0.5 + 0.5;
  f = clamp(f, 0.0, 1.0);

  // Apply amplitude (beat pulse)
  f = pow(f, 1.0 / u_amplitude);

  // 4-stop color gradient
  vec3 col;
  if (f < 0.25) {
    col = mix(u_color1, u_color2, f * 4.0);
  } else if (f < 0.5) {
    col = mix(u_color2, u_color3, (f - 0.25) * 4.0);
  } else if (f < 0.75) {
    col = mix(u_color3, u_color4, (f - 0.5) * 4.0);
  } else {
    col = mix(u_color4, u_color1 * 1.5, (f - 0.75) * 4.0);
  }

  // Subtle vignette
  float vignette = length(v_uv - 0.5) * 1.4;
  col *= 1.0 - vignette * vignette * 0.3;

  gl_FragColor = vec4(col, 1.0);
}`;

// Per-degree anchors: warp amount and scale define the "shape" of the pattern
interface WarpAnchor {
  warpAmount: number;  // how much warping (1-6)
  warpScale: number;   // spatial scale (2-8)
  flowSpeed: number;   // animation speed (0.1-0.5)
  detail: number;      // extra detail layer strength (0-0.5)
}

// Warp amount ordered by harmonic dissonance:
// I (smooth) → IV/vi (gentle) → iii (mild) → ii (rough) → V (tense) → vii (chaotic)
const DEGREE_ANCHORS: Record<number, WarpAnchor> = {
  0: { warpAmount: 4.0, warpScale: 4.0, flowSpeed: 0.2, detail: 0.25 },  // chromatic — unsettled
  1: { warpAmount: 1.5, warpScale: 3.5, flowSpeed: 0.15, detail: 0.08 }, // I — smooth, resolved
  2: { warpAmount: 4.5, warpScale: 5.5, flowSpeed: 0.25, detail: 0.35 }, // ii — rough, unresolved
  3: { warpAmount: 3.0, warpScale: 4.0, flowSpeed: 0.18, detail: 0.18 }, // iii — mild tension
  4: { warpAmount: 2.0, warpScale: 3.5, flowSpeed: 0.17, detail: 0.12 }, // IV — warm, stable
  5: { warpAmount: 5.0, warpScale: 6.0, flowSpeed: 0.28, detail: 0.4 },  // V — dominant, tense
  6: { warpAmount: 2.2, warpScale: 4.0, flowSpeed: 0.16, detail: 0.1 },  // vi — gentle, relative minor
  7: { warpAmount: 5.8, warpScale: 7.0, flowSpeed: 0.35, detail: 0.45 }, // vii — most dissonant
};

export class DomainWarpEffect implements VisualEffect {
  readonly id = 'domainwarp';
  readonly name = 'Domain Warp';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'source-over';
  readonly defaultOpacity = 1.0;

  private outputCanvas: HTMLCanvasElement;
  private glCanvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private vertBuffer: WebGLBuffer | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private ready = false;
  private width = 800;
  private height = 600;

  private time = 0;
  private currentWarp = 2.0;
  private currentScale = 3.5;
  private currentFlow = 0.15;
  private currentDetail = 0.1;
  private amplitude = 1.0;

  // Spatial wave tanks: bass from bottom, melody from side
  // Each has position + velocity for momentum
  private bassWave = 0;       // vertical wave (bottom)
  private bassWaveVel = 0;
  private melodyWave = 0;     // horizontal wave (side)
  private melodyWaveVel = 0;

  // Combined wave for general warp modulation
  private mainWave = 0;
  private mainWaveVel = 0;


  // Raw energy accumulators (fast response, separated by source)
  private bassEnergy = 0;     // bass notes
  private melodyEnergy = 0;   // melody + harmony

  // Chord tracking for GSAP transitions
  private lastChordDegree = -1;

  private color1: [number, number, number] = [0.02, 0.02, 0.06];
  private color2: [number, number, number] = [0.1, 0.2, 0.5];
  private color3: [number, number, number] = [0.4, 0.6, 0.8];
  private color4: [number, number, number] = [0.8, 0.9, 1.0];
  private colorByChord = true;

  constructor() {
    this.outputCanvas = document.createElement('canvas');
    this.glCanvas = document.createElement('canvas');
    this.glCanvas.width = SIM_W;
    this.glCanvas.height = SIM_H;
  }

  init(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.outputCanvas.width = width;
    this.outputCanvas.height = height;

    this.gl = this.glCanvas.getContext('webgl', { premultipliedAlpha: false, alpha: true });
    if (!this.gl) return;
    this.initGL();
    this.ready = true;
  }

  private initGL(): void {
    const gl = this.gl!;

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, VERT_SRC);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, FRAG_SRC);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('DomainWarp frag:', gl.getShaderInfoLog(fs));
    }

    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    this.vertBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    gl.useProgram(this.program);
    const names = ['u_time', 'u_warpAmount', 'u_warpScale', 'u_flowSpeed', 'u_detail',
                   'u_amplitude', 'u_color1', 'u_color2', 'u_color3', 'u_color4',
                   'u_bassWave', 'u_melodyWave'];
    for (const n of names) {
      this.uniforms[n] = gl.getUniformLocation(this.program, n);
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.outputCanvas.width = width;
    this.outputCanvas.height = height;
  }

  update(dt: number, music: MusicParams): void {
    // Cap dt to prevent physics blowup when tab is backgrounded/throttled
    dt = Math.min(dt, 0.1);

    const isPlaying = music.activeVoices.length > 0;
    const beat1Boost = music.beatIndex === 0 ? 1.4 : 1.0;

    if (isPlaying) {
      // Separate energy by musical register:
      // BASS ENERGY: low notes (push from bottom)
      const beatPulse = Math.pow(Math.cos(music.beatPosition * Math.PI), 2) * 0.03 * beat1Boost;
      this.bassEnergy += beatPulse;
      if (music.bassMidiNote >= 0) this.bassEnergy += 0.04 * music.bassVelocity * beat1Boost;

      // Bass notes from activeVoices (MIDI < 60 = below middle C)
      for (const voice of music.activeVoices) {
        if (voice.onset && voice.midi < 60) {
          this.bassEnergy += 0.04 * voice.velocity;
        }
      }

      // MELODY ENERGY: melody + harmony + high notes (push from side)
      // Higher notes = more perceived energy (pitch-weighted)
      if (music.melodyOnset && music.melodyMidiNote >= 0) {
        // Scale energy by pitch: 1x at MIDI 60, 2x at 84, 3x at 108
        const pitchScale = 1.0 + Math.max(0, music.melodyMidiNote - 60) / 24;
        this.melodyEnergy += 0.08 * music.melodyVelocity * pitchScale * beat1Boost;
      }
      if (music.hihat) this.melodyEnergy += 0.02;

      // All voices: pitch-weighted energy contribution
      for (const voice of music.activeVoices) {
        if (voice.onset) {
          // Higher notes contribute more energy
          const pitchScale = 1.0 + Math.max(0, voice.midi - 48) / 36;
          if (voice.midi >= 60) {
            this.melodyEnergy += 0.04 * voice.velocity * pitchScale;
          } else {
            this.bassEnergy += 0.03 * voice.velocity;
          }
        }
      }

      // Voice count also adds energy (dense orchestration = more energy)
      const voiceCount = music.activeVoices.length;
      if (voiceCount > 4) {
        this.melodyEnergy += (voiceCount - 4) * 0.01;
      }

      // Chord changes add to melody energy (harmonic content)
      if (music.chordDegree !== this.lastChordDegree) {
        this.melodyEnergy += 0.04 * beat1Boost;
      }
    }

    // Energy decays
    this.bassEnergy *= Math.exp(-2.0 * dt);
    this.melodyEnergy *= Math.exp(-1.5 * dt);

    // === SPATIAL WAVE TANKS ===
    // Bass wave: pushes from bottom (slower, heavier)
    const bassK = 6.0;      // ~1.3 bar period
    const bassDamping = 0.5;
    const bassPush = this.bassEnergy * 3.0;
    this.bassWaveVel += (bassPush - bassK * this.bassWave - bassDamping * this.bassWaveVel) * dt;
    this.bassWave += this.bassWaveVel * dt;

    // Melody wave: pushes from sides (medium speed)
    const melodyK = 10.0;   // ~1 bar period
    const melodyDamping = 0.6;
    const melodyPush = this.melodyEnergy * 2.5;
    this.melodyWaveVel += (melodyPush - melodyK * this.melodyWave - melodyDamping * this.melodyWaveVel) * dt;
    this.melodyWave += this.melodyWaveVel * dt;

    // Main wave: combination for general warp (interference of both)
    const mainK = 8.0;
    const mainDamping = 0.5;
    const mainPush = (this.bassEnergy + this.melodyEnergy) * 2.0;
    this.mainWaveVel += (mainPush - mainK * this.mainWave - mainDamping * this.mainWaveVel) * dt;
    this.mainWave += this.mainWaveVel * dt;

    // Combined wave level for parameter modulation
    const waveLevel = Math.max(0, this.mainWave + this.bassWave * 0.2 + this.melodyWave * 0.15);

    // Music modulates the RATE of forward flow
    const flowRate = 1.0 + waveLevel * 0.5 + music.tension * 0.3 + this.melodyEnergy * 0.3;
    this.time += dt * flowRate;

    // Degree → anchor
    const anchor = DEGREE_ANCHORS[music.chordDegree] ?? DEGREE_ANCHORS[0];

    // Chord quality modifiers: affects texture complexity
    // Simple triads = smooth, 7ths = sophisticated detail, dim/aug = rough
    let qualityWarp = 0;
    let qualityDetail = 0;
    let qualityFlow = 0;
    switch (music.chordQuality) {
      case 'major':
        // Clean, stable - baseline
        qualityWarp = 0;
        qualityDetail = 0;
        qualityFlow = 0;
        break;
      case 'minor':
        // Slightly darker, more texture
        qualityWarp = 0.35;
        qualityDetail = 0.05;
        qualityFlow = -0.03;
        break;
      case 'dom7':
        // Sophisticated tension, more movement
        qualityWarp = 0.6;
        qualityDetail = 0.12;
        qualityFlow = 0.05;
        break;
      case 'min7':
        // Warm complexity
        qualityWarp = 0.5;
        qualityDetail = 0.1;
        qualityFlow = 0.02;
        break;
      case 'maj7':
        // Lush, dreamy detail
        qualityWarp = 0.2;
        qualityDetail = 0.15;
        qualityFlow = -0.02;
        break;
      case 'dim':
        // Unstable, rough texture
        qualityWarp = 1.2;
        qualityDetail = 0.18;
        qualityFlow = 0.08;
        break;
      case 'aug':
        // Unresolved, swirling
        qualityWarp = 0.9;
        qualityDetail = 0.15;
        qualityFlow = 0.06;
        break;
      default:
        // Unknown quality
        qualityWarp = 0.15;
        qualityDetail = 0.03;
        qualityFlow = 0;
    }

    if (music.chordDegree !== this.lastChordDegree) {
      this.lastChordDegree = music.chordDegree;

      // GSAP: Fluid transition for flow speed (includes quality modifier)
      const beatDur = music.beatDuration || 0.5;
      gsap.to(this, {
        currentFlow: anchor.flowSpeed + qualityFlow,
        duration: beatDur * 2.0,
        ease: 'power1.inOut',
        overwrite: true,
      });
    }

    // Parameters follow wave level with gentle smoothing
    // Chord quality adds texture complexity
    const targetWarp = anchor.warpAmount + qualityWarp + music.tension * 0.3 + waveLevel * 1.2;
    const barCycle = music.currentTime * 0.08;
    const targetScale = anchor.warpScale + Math.sin(barCycle) * 0.2 + waveLevel * 0.4;
    const targetDetail = anchor.detail + qualityDetail + music.tension * 0.04 + waveLevel * 0.08;

    // Smooth follow (the wave level already has momentum, so light smoothing here)
    this.currentWarp += (targetWarp - this.currentWarp) * 3.0 * dt;
    this.currentWarp = Math.min(this.currentWarp, 6.5);

    this.currentScale += (targetScale - this.currentScale) * 3.0 * dt;

    this.currentDetail += (targetDetail - this.currentDetail) * 4.0 * dt;

    // Amplitude: gentle swell from wave
    this.amplitude = 1.0 + waveLevel * 0.08;

    // Color from chord root or song key — keep colors vibrant
    const modeDim = music.keyMode === 'minor' ? 0.75 : 1.0;
    const intensity = (0.85 + waveLevel * 0.15 + music.tension * 0.1) * modeDim;
    const paletteSource = this.colorByChord ? music.chordRoot : music.key;
    const palIdx = paletteSource >= 0 && paletteSource < palettes.length ? paletteSource : 0;
    const p = palettes[palIdx];
    const c0 = p.stops[0]?.color ?? [5, 5, 15];
    const c1 = p.stops[1]?.color ?? [25, 50, 130];
    const c2 = p.stops[3]?.color ?? [100, 150, 200];
    const c3 = p.stops[4]?.color ?? [200, 230, 255];
    this.color1 = [c0[0] / 255 * intensity, c0[1] / 255 * intensity, c0[2] / 255 * intensity];
    this.color2 = [c1[0] / 255 * intensity, c1[1] / 255 * intensity, c1[2] / 255 * intensity];
    this.color3 = [c2[0] / 255 * intensity, c2[1] / 255 * intensity, c2[2] / 255 * intensity];
    this.color4 = [c3[0] / 255 * intensity, c3[1] / 255 * intensity, c3[2] / 255 * intensity];
  }

  render(): HTMLCanvasElement {
    if (!this.gl || !this.program) return this.outputCanvas;
    const gl = this.gl;

    gl.viewport(0, 0, SIM_W, SIM_H);
    gl.useProgram(this.program);

    const posLoc = gl.getAttribLocation(this.program, 'a_pos');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1f(this.uniforms.u_time!, this.time);
    gl.uniform1f(this.uniforms.u_warpAmount!, this.currentWarp);
    gl.uniform1f(this.uniforms.u_warpScale!, this.currentScale);
    gl.uniform1f(this.uniforms.u_flowSpeed!, this.currentFlow);
    gl.uniform1f(this.uniforms.u_detail!, this.currentDetail);
    gl.uniform1f(this.uniforms.u_amplitude!, this.amplitude);
    gl.uniform3f(this.uniforms.u_color1!, ...this.color1);
    gl.uniform3f(this.uniforms.u_color2!, ...this.color2);
    gl.uniform3f(this.uniforms.u_color3!, ...this.color3);
    gl.uniform3f(this.uniforms.u_color4!, ...this.color4);

    // Spatial waves: bass from bottom, melody from sides
    gl.uniform1f(this.uniforms.u_bassWave!, Math.max(0, this.bassWave));
    gl.uniform1f(this.uniforms.u_melodyWave!, Math.max(0, this.melodyWave));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const ctx = this.outputCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.drawImage(this.glCanvas, 0, 0, this.width, this.height);

    return this.outputCanvas;
  }

  isReady(): boolean { return this.ready; }

  dispose(): void {
    if (this.gl) {
      if (this.program) this.gl.deleteProgram(this.program);
      if (this.vertBuffer) this.gl.deleteBuffer(this.vertBuffer);
    }
    this.ready = false;
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'warpAmount', label: 'Warp', type: 'range', value: this.currentWarp, min: 1, max: 8, step: 0.5 },
      { key: 'warpScale', label: 'Scale', type: 'range', value: this.currentScale, min: 2, max: 10, step: 0.5 },
      { key: 'colorByChord', label: 'Color by Chord', type: 'toggle', value: this.colorByChord },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'warpAmount') this.currentWarp = value as number;
    if (key === 'warpScale') this.currentScale = value as number;
    if (key === 'colorByChord') this.colorByChord = value as boolean;
  }
}
