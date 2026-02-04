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
  vec2 p = (v_uv - 0.5) * u_warpScale;
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

  // Add detail layer
  f += u_detail * fbm(p * 3.0 + r * 2.0 + t * 0.08);

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
  float dist = length(v_uv - 0.5) * 1.4;
  col *= 1.0 - dist * dist * 0.3;

  gl_FragColor = vec4(col, 1.0);
}`;

// Per-degree anchors: warp amount and scale define the "shape" of the pattern
interface WarpAnchor {
  warpAmount: number;  // how much warping (1-6)
  warpScale: number;   // spatial scale (2-8)
  flowSpeed: number;   // animation speed (0.1-0.5)
  detail: number;      // extra detail layer strength (0-0.5)
}

const DEGREE_ANCHORS: Record<number, WarpAnchor> = {
  0: { warpAmount: 3.0, warpScale: 4.0, flowSpeed: 0.2, detail: 0.2 },  // chromatic
  1: { warpAmount: 2.0, warpScale: 3.5, flowSpeed: 0.15, detail: 0.1 }, // I — gentle, flowing
  2: { warpAmount: 3.5, warpScale: 5.0, flowSpeed: 0.25, detail: 0.3 }, // ii — moderate swirl
  3: { warpAmount: 2.5, warpScale: 4.0, flowSpeed: 0.18, detail: 0.15 },// iii — elegant
  4: { warpAmount: 4.0, warpScale: 3.0, flowSpeed: 0.2, detail: 0.25 }, // IV — broad, warm
  5: { warpAmount: 5.0, warpScale: 6.0, flowSpeed: 0.3, detail: 0.4 },  // V — complex, tense
  6: { warpAmount: 3.0, warpScale: 4.5, flowSpeed: 0.22, detail: 0.2 }, // vi — smooth
  7: { warpAmount: 5.5, warpScale: 7.0, flowSpeed: 0.35, detail: 0.45 },// vii — chaotic
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

  private color1: [number, number, number] = [0.02, 0.02, 0.06];
  private color2: [number, number, number] = [0.1, 0.2, 0.5];
  private color3: [number, number, number] = [0.4, 0.6, 0.8];
  private color4: [number, number, number] = [0.8, 0.9, 1.0];

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
                   'u_amplitude', 'u_color1', 'u_color2', 'u_color3', 'u_color4'];
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
    const snap = 1 - Math.exp(-3.0 * dt);
    this.currentWarp += (anchor.warpAmount - this.currentWarp) * snap;
    this.currentScale += (anchor.warpScale - this.currentScale) * snap;
    this.currentFlow += (anchor.flowSpeed - this.currentFlow) * snap;
    this.currentDetail += (anchor.detail - this.currentDetail) * snap;

    // Beat → amplitude pulse
    if (music.kick) this.amplitude = 1.4;
    if (music.snare) this.amplitude = 1.25;
    this.amplitude += (1.0 - this.amplitude) * (1 - Math.exp(-3.0 * dt));

    // Tension → detail boost
    this.currentDetail = (DEGREE_ANCHORS[music.chordDegree]?.detail ?? 0.2) + music.tension * 0.15;

    // Colors from palette
    if (music.paletteIndex >= 0 && music.paletteIndex < palettes.length) {
      const p = palettes[music.paletteIndex];
      const c0 = p.stops[0]?.color ?? [5, 5, 15];
      const c1 = p.stops[1]?.color ?? [25, 50, 130];
      const c2 = p.stops[3]?.color ?? [100, 150, 200];
      const c3 = p.stops[4]?.color ?? [200, 230, 255];
      this.color1 = [c0[0] / 255, c0[1] / 255, c0[2] / 255];
      this.color2 = [c1[0] / 255, c1[1] / 255, c1[2] / 255];
      this.color3 = [c2[0] / 255, c2[1] / 255, c2[2] / 255];
      this.color4 = [c3[0] / 255, c3[1] / 255, c3[2] / 255];
    }
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
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'warpAmount') this.currentWarp = value as number;
    if (key === 'warpScale') this.currentScale = value as number;
  }
}
