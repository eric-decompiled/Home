// --- Chladni / Cymatics Centerpiece ---
// Standing wave interference patterns on a vibrating plate.
// Mode numbers (m, n) define the node pattern — different combos produce
// different symmetric geometries. Per-degree anchors place each harmonic
// function at a curated (m, n) pair.
//
// Formula: f(x,y) = sin(m*pi*x)*sin(n*pi*y) ± sin(n*pi*x)*sin(m*pi*y)
// Nodal lines (f ≈ 0) form the Chladni figure.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { palettes } from '../fractal-engine.ts';
import { gsap } from '../animation.ts';

const SIM_W = 512;
const SIM_H = 384;

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

uniform float u_m;
uniform float u_n;
uniform float u_sign;       // +1 or -1 for symmetric/antisymmetric
uniform float u_time;
uniform float u_amplitude;  // beat-driven pulse
uniform float u_lineWidth;  // width of nodal lines
uniform float u_rotation;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform vec3 u_bgColor;

#define PI 3.14159265359

vec2 rotate2d(vec2 p, float a) {
  float c = cos(a), s = sin(a);
  return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

void main() {
  // Center and aspect-correct
  vec2 uv = v_uv * 2.0 - 1.0;
  uv = rotate2d(uv, u_rotation);

  // Plate coordinates [-1, 1]
  float x = uv.x;
  float y = uv.y;

  // Main Chladni pattern
  float f1 = sin(u_m * PI * x) * sin(u_n * PI * y)
           + u_sign * sin(u_n * PI * x) * sin(u_m * PI * y);

  // Second harmonic layer for richness
  float m2 = u_m + 1.0;
  float n2 = u_n + 1.0;
  float f2 = sin(m2 * PI * x) * sin(n2 * PI * y)
           + u_sign * sin(n2 * PI * x) * sin(m2 * PI * y);

  // Blend primary and secondary (slow breathing)
  float f = f1 + f2 * 0.25 * sin(u_time * 0.2);

  // Nodal line detection — narrow band around zero
  float lineVal = 1.0 - smoothstep(0.0, u_lineWidth, abs(f));

  // Distance-from-zero coloring for the field
  float fieldVal = abs(f) * u_amplitude;

  // Color: nodal lines are brightest, field fades to background
  vec3 lineColor = mix(u_color2, u_color3, lineVal * 0.5 + 0.5);
  vec3 fieldColor = mix(u_bgColor, u_color1, clamp(fieldVal * 0.8, 0.0, 1.0));

  vec3 col = mix(fieldColor, lineColor, lineVal * 0.9);

  // Circular plate mask — soft fade at edges
  float dist = length(uv);
  float plateMask = 1.0 - smoothstep(0.85, 1.0, dist);
  col *= plateMask;

  // Vibration glow — subtle pulsing brightness on lines
  float glow = lineVal * (0.8 + 0.2 * sin(u_time * 1.5)) * u_amplitude;
  col += u_color3 * glow * 0.2;

  // Alpha based on brightness — lines opaque, dark areas translucent
  float brightness = max(col.r, max(col.g, col.b));
  float patternAlpha = smoothstep(0.0, 0.3, brightness) * plateMask;

  gl_FragColor = vec4(col, patternAlpha);
}`;

// Degree anchors: curated (m, n, sign) combos for each harmonic function
// Lower degrees = simpler patterns, higher = more complex
interface ChladniAnchor {
  m: number;
  n: number;
  sign: number; // +1 symmetric, -1 antisymmetric
}

const DEGREE_ANCHORS: Record<number, ChladniAnchor> = {
  0: { m: 3, n: 4, sign: 1 },     // chromatic fallback — simple
  1: { m: 2, n: 3, sign: 1 },     // I — clean, simple cross
  2: { m: 4, n: 7, sign: -1 },    // ii — moderate complexity
  3: { m: 3, n: 7, sign: 1 },     // iii — elegant
  4: { m: 5, n: 9, sign: 1 },     // IV — rich, subdominant feel
  5: { m: 6, n: 10, sign: -1 },   // V — complex, dominant tension
  6: { m: 4, n: 9, sign: 1 },     // vi — warm, flowing
  7: { m: 8, n: 13, sign: -1 },   // vii — dense, leading-tone tension
};

// Voice leading smoothness: measures how smooth a chord root motion is
// Based on interval class — inverted from rootMotionTension
// Returns 1.0 for smooth (jazz-like stepwise), 0.3 for jarring (tritone)
function computeVoiceLeadingSmoothness(prevRoot: number, currRoot: number): number {
  if (prevRoot < 0) return 1.0;  // No previous chord — assume smooth
  const interval = Math.abs(currRoot - prevRoot);
  const semitones = Math.min(interval, 12 - interval);  // Interval class (0-6)

  const smoothnessMap: Record<number, number> = {
    0: 1.0,   // Same chord: maximum smoothness
    5: 0.95,  // P4: very smooth (circle of 5ths motion)
    7: 0.95,  // P5: very smooth (but interval class maps 7→5)
    4: 0.8,   // M3: smooth (shared tones in thirds)
    3: 0.8,   // m3: smooth
    2: 0.65,  // M2: moderate stepwise motion
    1: 0.5,   // m2: chromatic, less smooth
    6: 0.3,   // Tritone: jarring
  };
  return smoothnessMap[semitones] ?? 0.5;
}

export class ChladniEffect implements VisualEffect {
  readonly id = 'chladni';
  readonly name = 'Chladni';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'source-over';
  readonly defaultOpacity = 0.45;

  private outputCanvas: HTMLCanvasElement;
  private glCanvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private vertBuffer: WebGLBuffer | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private ready = false;
  private width = 800;
  private height = 600;

  // Animated state
  private currentM = 1;
  private currentN = 2;
  private currentSign = 1;
  private time = 0;
  private amplitude = 1.0;
  private rotation = 0;
  private rotationVelocity = 0;
  private baseLineWidth = 0.12;  // User-configurable base
  private lineWidth = 0.12;      // Computed (modulated by tension)
  private lastChordDegree = -1;
  private lastChordRoot = -1;    // For voice leading smoothness
  private smoothedTension = 0;   // Smoothed tension for gradual brightness changes
  private lastPaletteIndex = -1; // For detecting palette changes

  // Base colors (tweened on palette change, before tension modulation)
  private baseColor1: [number, number, number] = [0.0, 0.15, 0.3];
  private baseColor2: [number, number, number] = [0.2, 0.6, 0.8];
  private baseColor3: [number, number, number] = [0.9, 0.95, 1.0];
  private baseBgColor: [number, number, number] = [0.02, 0.02, 0.05];

  // Final colors (base * tension brightness, computed each frame)
  private color1: [number, number, number] = [0.0, 0.15, 0.3];
  private color2: [number, number, number] = [0.2, 0.6, 0.8];
  private color3: [number, number, number] = [0.9, 0.95, 1.0];
  private bgColor: [number, number, number] = [0.02, 0.02, 0.05];

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
      console.error('Chladni frag:', gl.getShaderInfoLog(fs));
    }

    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    this.vertBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    gl.useProgram(this.program);
    const names = ['u_m', 'u_n', 'u_sign', 'u_time', 'u_amplitude', 'u_lineWidth',
                   'u_rotation', 'u_color1', 'u_color2', 'u_color3', 'u_bgColor'];
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
    this.time += dt;

    // Degree → anchor
    const anchor = DEGREE_ANCHORS[music.chordDegree] ?? DEGREE_ANCHORS[0];

    // Detect chord changes and tween based on voice leading smoothness
    if (music.chordDegree !== this.lastChordDegree && music.chordDegree >= 0) {
      this.lastChordDegree = music.chordDegree;

      // Compute voice leading smoothness from root motion
      const smoothness = computeVoiceLeadingSmoothness(this.lastChordRoot, music.chordRoot);
      this.lastChordRoot = music.chordRoot;

      const beatDur = music.beatDuration || 0.5;
      // Smooth voice leading = longer tween (subtle morph)
      // Rough voice leading = shorter tween (dramatic shift)
      // Range: 0.5x to 2x base duration
      const baseDur = beatDur * 4;
      const tweenDur = baseDur * (0.5 + smoothness * 1.5);

      // Tween mode numbers with musical timing
      gsap.to(this, {
        currentM: anchor.m,
        currentN: anchor.n,
        duration: tweenDur,
        ease: 'power3.inOut',
        overwrite: true,
      });

      // Tween sign separately (as float for smooth crossfade)
      gsap.to(this, {
        currentSign: anchor.sign,
        duration: tweenDur * 0.5,
        ease: 'power3.inOut',
      });
    }

    // === GROOVE CURVES ===
    const beatAnticipation = music.beatAnticipation ?? 0;
    const beatArrival = music.beatArrival ?? 0;
    const barArrival = music.barArrival ?? 0;
    const barGroove = music.barGroove ?? 0;

    // Beat → amplitude pulse - gentle breathing with the music
    this.amplitude = Math.max(this.amplitude, 1.0 + music.drumEnergy * 0.25);
    // Arrival adds to amplitude
    this.amplitude = Math.max(this.amplitude, 1.0 + beatArrival * 0.2 + barArrival * 0.25);
    // Anticipation creates subtle buildup
    this.amplitude += beatAnticipation * 0.05;
    // Bar groove adds subtle breathing (peaks at bar boundary)
    this.amplitude += barGroove * 0.25;
    // Smooth the tension for gradual brightness changes
    const tensionSmoothing = 0.02;  // Lower = smoother/slower response
    this.smoothedTension += (music.tension - this.smoothedTension) * tensionSmoothing;
    this.amplitude += (1.0 - this.amplitude) * (1 - Math.exp(-2.0 * dt));  // Slower decay

    // Rotation from beats - strong beats push forward, weak beats pull back
    this.rotationVelocity += (music.beatStrength * 2 - 1) * music.drumEnergy * 0.04;
    // Arrival adds rotation impulse
    this.rotationVelocity += beatArrival * 0.025 - barArrival * 0.015;
    this.rotationVelocity *= Math.exp(-2.5 * dt);  // Faster damping
    this.rotation += this.rotationVelocity * dt;

    // Tension → line width (higher tension = finer lines = more detail)
    // baseLineWidth is user-configurable, tension modulates around it
    this.lineWidth = this.baseLineWidth - music.tension * 0.06;

    // Colors from palette - tween base colors on palette change
    if (music.paletteIndex >= 0 && music.paletteIndex < palettes.length &&
        music.paletteIndex !== this.lastPaletteIndex) {
      this.lastPaletteIndex = music.paletteIndex;

      const p = palettes[music.paletteIndex];
      const c1 = p.stops[0]?.color ?? [0, 40, 80];
      const c2 = p.stops[2]?.color ?? [50, 150, 200];
      const c3 = p.stops[3]?.color ?? [230, 240, 255];
      const bg = p.stops[0]?.color ?? [5, 5, 13];

      // Desaturate by blending toward grayscale (40% saturation)
      const desat = 0.4;
      const desaturate = (c: number[]) => {
        const gray = (c[0] + c[1] + c[2]) / 3;
        return [
          (c[0] * desat + gray * (1 - desat)) / 255,
          (c[1] * desat + gray * (1 - desat)) / 255,
          (c[2] * desat + gray * (1 - desat)) / 255,
        ];
      };

      const target1 = desaturate(c1);
      const target2 = desaturate(c2);
      const target3 = desaturate(c3);
      const targetBg = [bg[0] / 255, bg[1] / 255, bg[2] / 255];

      // Tween base colors over an 8th note
      const eighthNote = (music.beatDuration || 0.5) / 2;
      gsap.to(this.baseColor1, { 0: target1[0], 1: target1[1], 2: target1[2], duration: eighthNote, ease: 'power2.inOut' });
      gsap.to(this.baseColor2, { 0: target2[0], 1: target2[1], 2: target2[2], duration: eighthNote, ease: 'power2.inOut' });
      gsap.to(this.baseColor3, { 0: target3[0], 1: target3[1], 2: target3[2], duration: eighthNote, ease: 'power2.inOut' });
      gsap.to(this.baseBgColor, { 0: targetBg[0], 1: targetBg[1], 2: targetBg[2], duration: eighthNote, ease: 'power2.inOut' });
    }

    // Apply tension brightness to base colors each frame
    const tensionBrightness = 0.9 + this.smoothedTension * 0.1;  // 0.9 to 1.0
    this.color1 = [this.baseColor1[0] * tensionBrightness, this.baseColor1[1] * tensionBrightness, this.baseColor1[2] * tensionBrightness];
    this.color2 = [this.baseColor2[0] * tensionBrightness, this.baseColor2[1] * tensionBrightness, this.baseColor2[2] * tensionBrightness];
    this.color3 = [this.baseColor3[0] * tensionBrightness, this.baseColor3[1] * tensionBrightness, this.baseColor3[2] * tensionBrightness];
    this.bgColor = [this.baseBgColor[0] * tensionBrightness, this.baseBgColor[1] * tensionBrightness, this.baseBgColor[2] * tensionBrightness];
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

    gl.uniform1f(this.uniforms.u_m!, this.currentM);
    gl.uniform1f(this.uniforms.u_n!, this.currentN);
    gl.uniform1f(this.uniforms.u_sign!, this.currentSign);
    gl.uniform1f(this.uniforms.u_time!, this.time);
    gl.uniform1f(this.uniforms.u_amplitude!, this.amplitude);
    gl.uniform1f(this.uniforms.u_lineWidth!, this.lineWidth);
    gl.uniform1f(this.uniforms.u_rotation!, this.rotation);
    gl.uniform3f(this.uniforms.u_color1!, ...this.color1);
    gl.uniform3f(this.uniforms.u_color2!, ...this.color2);
    gl.uniform3f(this.uniforms.u_color3!, ...this.color3);
    gl.uniform3f(this.uniforms.u_bgColor!, ...this.bgColor);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Upscale
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
      { key: 'lineWidth', label: 'Line Width', type: 'range', value: this.baseLineWidth, min: 0.05, max: 0.50, step: 0.05 },
    ];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return { lineWidth: 0.12 };
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'lineWidth') this.baseLineWidth = value as number;
  }
}
