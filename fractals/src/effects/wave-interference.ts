// --- Wave Interference Effect ---
// Multiple circular wave sources creating interference patterns.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { palettes } from '../fractal-engine.ts';

const SIM_W = 320;
const SIM_H = 240;

const VERT_SRC = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0, 1);
}`;

// Up to 8 wave sources, packed as uniforms
const FRAG_SRC = `
precision highp float;
varying vec2 v_uv;
uniform float u_time;
uniform int u_sourceCount;
uniform vec2 u_sources[8];
uniform float u_amplitudes[8];
uniform float u_frequencies[8];
uniform float u_phases[8];
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform vec3 u_color3;
uniform float u_decay;
uniform float u_baseWaveAmp;
uniform float u_baseWaveFreq;

void main() {
  vec2 pos = v_uv;
  float sum = 0.0;

  // Point sources
  for (int i = 0; i < 8; i++) {
    if (i >= u_sourceCount) break;
    float dist = distance(pos, u_sources[i]);
    float wave = u_amplitudes[i] * sin(dist * u_frequencies[i] - u_time * 3.0 + u_phases[i]);
    wave *= exp(-dist * u_decay);
    sum += wave;
  }

  // Background bass wave
  if (u_baseWaveAmp > 0.01) {
    sum += u_baseWaveAmp * sin(pos.y * u_baseWaveFreq + u_time * 1.5);
  }

  // Normalize to 0-1 range
  float t = sum * 0.5 + 0.5;
  t = clamp(t, 0.0, 1.0);

  // Color mapping
  vec3 col;
  if (t < 0.33) {
    col = mix(vec3(0.0), u_color1, t * 3.0);
  } else if (t < 0.66) {
    col = mix(u_color1, u_color2, (t - 0.33) * 3.0);
  } else {
    col = mix(u_color2, u_color3, (t - 0.66) * 3.0);
  }

  float alpha = length(col) > 0.05 ? 1.0 : 0.0;
  gl_FragColor = vec4(col, alpha);
}`;

interface WaveSource {
  x: number;
  y: number;
  amplitude: number;
  frequency: number;
  phase: number;
  life: number;
}

export class WaveInterferenceEffect implements VisualEffect {
  readonly id = 'waves';
  readonly name = 'Waves';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'screen';
  readonly defaultOpacity = 0.6;

  private outputCanvas: HTMLCanvasElement;
  private glCanvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private ready = false;
  private width = 800;
  private height = 600;

  private program: WebGLProgram | null = null;
  private vertBuffer: WebGLBuffer | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};

  private sources: WaveSource[] = [];
  private maxSources = 6;
  private time = 0;
  private wavelength = 40;
  private decayRate = 3.0;
  private intensity = 1.0;
  private bassWaveAmp = 0;
  private bassWaveFreq = 10;

  private color1: [number, number, number] = [0.0, 0.2, 0.5];
  private color2: [number, number, number] = [0.1, 0.5, 0.8];
  private color3: [number, number, number] = [0.8, 0.9, 1.0];

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

    // Compile
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, VERT_SRC);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, FRAG_SRC);
    gl.compileShader(fs);

    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('Wave frag compile:', gl.getShaderInfoLog(fs));
    }

    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Wave program link:', gl.getProgramInfoLog(this.program));
      return;
    }

    // Vertex buffer
    this.vertBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    // Cache uniforms
    gl.useProgram(this.program);
    const uNames = ['u_time', 'u_sourceCount', 'u_decay', 'u_color1', 'u_color2', 'u_color3',
                     'u_baseWaveAmp', 'u_baseWaveFreq'];
    for (const name of uNames) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }
    for (let i = 0; i < 8; i++) {
      this.uniforms[`u_sources[${i}]`] = gl.getUniformLocation(this.program, `u_sources[${i}]`);
      this.uniforms[`u_amplitudes[${i}]`] = gl.getUniformLocation(this.program, `u_amplitudes[${i}]`);
      this.uniforms[`u_frequencies[${i}]`] = gl.getUniformLocation(this.program, `u_frequencies[${i}]`);
      this.uniforms[`u_phases[${i}]`] = gl.getUniformLocation(this.program, `u_phases[${i}]`);
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

    // Melody onsets → spawn wave source at clock position
    if (music.melodyOnset && music.melodyPitchClass >= 0) {
      const angle = ((music.melodyPitchClass - music.key + 12) % 12 / 12) * Math.PI * 2;
      const edgeR = 0.35;
      const x = 0.5 + Math.sin(angle) * edgeR;
      const y = 0.5 - Math.cos(angle) * edgeR;

      this.sources.push({
        x, y,
        amplitude: 0.8 * music.melodyVelocity * this.intensity,
        frequency: this.wavelength + music.melodyPitchClass * 2,
        phase: this.time * 3,
        life: 3.0,
      });

      // Limit sources
      while (this.sources.length > this.maxSources) {
        this.sources.shift();
      }
    }

    // Beat → amplitude pulse on existing sources
    if (music.kick) {
      for (const s of this.sources) {
        s.amplitude = Math.min(1.5, s.amplitude + 0.3);
      }
    }

    // Tension → wave frequency
    this.wavelength = 30 + music.tension * 30;

    // Bass → background wave
    if (music.bassPitchClass >= 0) {
      this.bassWaveAmp = music.bassVelocity * 0.4;
      this.bassWaveFreq = 8 + music.bassPitchClass;
    } else {
      this.bassWaveAmp *= 0.95;
    }

    // Decay sources
    for (const s of this.sources) {
      s.life -= dt;
      s.amplitude *= Math.exp(-0.5 * dt);
    }
    this.sources = this.sources.filter(s => s.life > 0 && s.amplitude > 0.01);

    // Color from palette
    if (music.paletteIndex >= 0 && music.paletteIndex < palettes.length) {
      const p = palettes[music.paletteIndex];
      const c1 = p.stops[1]?.color ?? [0, 50, 130];
      const c2 = p.stops[3]?.color ?? [30, 130, 200];
      const c3 = p.stops[4]?.color ?? [200, 230, 255];
      this.color1 = [c1[0] / 255, c1[1] / 255, c1[2] / 255];
      this.color2 = [c2[0] / 255, c2[1] / 255, c2[2] / 255];
      this.color3 = [c3[0] / 255, c3[1] / 255, c3[2] / 255];
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

    // Set uniforms
    gl.uniform1f(this.uniforms.u_time!, this.time);
    gl.uniform1i(this.uniforms.u_sourceCount!, this.sources.length);
    gl.uniform1f(this.uniforms.u_decay!, this.decayRate);
    gl.uniform3f(this.uniforms.u_color1!, ...this.color1);
    gl.uniform3f(this.uniforms.u_color2!, ...this.color2);
    gl.uniform3f(this.uniforms.u_color3!, ...this.color3);
    gl.uniform1f(this.uniforms.u_baseWaveAmp!, this.bassWaveAmp);
    gl.uniform1f(this.uniforms.u_baseWaveFreq!, this.bassWaveFreq);

    for (let i = 0; i < 8; i++) {
      const s = this.sources[i];
      if (s) {
        gl.uniform2f(this.uniforms[`u_sources[${i}]`]!, s.x, s.y);
        gl.uniform1f(this.uniforms[`u_amplitudes[${i}]`]!, s.amplitude);
        gl.uniform1f(this.uniforms[`u_frequencies[${i}]`]!, s.frequency);
        gl.uniform1f(this.uniforms[`u_phases[${i}]`]!, s.phase);
      } else {
        gl.uniform2f(this.uniforms[`u_sources[${i}]`]!, 0, 0);
        gl.uniform1f(this.uniforms[`u_amplitudes[${i}]`]!, 0);
        gl.uniform1f(this.uniforms[`u_frequencies[${i}]`]!, 0);
        gl.uniform1f(this.uniforms[`u_phases[${i}]`]!, 0);
      }
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Upscale
    const ctx = this.outputCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.drawImage(this.glCanvas, 0, 0, this.width, this.height);

    return this.outputCanvas;
  }

  isReady(): boolean {
    return this.ready;
  }

  dispose(): void {
    if (this.gl) {
      if (this.program) this.gl.deleteProgram(this.program);
      if (this.vertBuffer) this.gl.deleteBuffer(this.vertBuffer);
    }
    this.ready = false;
  }

  getConfig(): EffectConfig[] {
    return [
      { key: 'maxSources', label: 'Max Waves', type: 'range', value: this.maxSources, min: 2, max: 8, step: 1 },
      { key: 'wavelength', label: 'Wavelength', type: 'range', value: this.wavelength, min: 10, max: 80, step: 5 },
      { key: 'decayRate', label: 'Decay', type: 'range', value: this.decayRate, min: 1, max: 10, step: 0.5 },
      { key: 'intensity', label: 'Intensity', type: 'range', value: this.intensity, min: 0.2, max: 2, step: 0.1 },
    ];
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    switch (key) {
      case 'maxSources':
        this.maxSources = value as number;
        break;
      case 'wavelength':
        this.wavelength = value as number;
        break;
      case 'decayRate':
        this.decayRate = value as number;
        break;
      case 'intensity':
        this.intensity = value as number;
        break;
    }
  }
}
