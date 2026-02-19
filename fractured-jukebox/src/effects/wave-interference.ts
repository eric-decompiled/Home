// --- Wave Interference Effect ---
// Multiple circular wave sources creating interference patterns.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { palettes } from '../fractal-engine.ts';
import { samplePaletteColor, TWO_PI } from './effect-utils.ts';

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
// Each source has its own color based on pitch class
// Includes reflection off boundaries (ghost sources at mirrored positions)
const FRAG_SRC = `
precision highp float;
varying vec2 v_uv;
uniform float u_time;
uniform int u_sourceCount;
uniform vec2 u_sources[8];
uniform float u_amplitudes[8];
uniform float u_frequencies[8];
uniform float u_phases[8];
uniform vec3 u_sourceColors[8];
uniform vec3 u_bgColor;
uniform float u_decay;
uniform float u_baseWaveAmp;
uniform float u_baseWaveFreq;
uniform vec3 u_bassColor;
uniform float u_reflection;

// Calculate wave contribution from a source, including reflections
float calcWave(vec2 pos, vec2 src, float amp, float freq, float phase, float t) {
  float wave = 0.0;

  // Direct wave
  float dist = distance(pos, src);
  wave += amp * sin(dist * freq - t * 6.0 + phase) * exp(-dist * u_decay);

  // Reflected waves (ghost sources at mirrored positions)
  // Reflection loses some energy
  float reflAmp = amp * u_reflection;

  // Left edge reflection (x = 0)
  vec2 srcL = vec2(-src.x, src.y);
  dist = distance(pos, srcL);
  wave += reflAmp * sin(dist * freq - t * 6.0 + phase + 3.14159) * exp(-dist * u_decay);

  // Right edge reflection (x = 1)
  vec2 srcR = vec2(2.0 - src.x, src.y);
  dist = distance(pos, srcR);
  wave += reflAmp * sin(dist * freq - t * 6.0 + phase + 3.14159) * exp(-dist * u_decay);

  // Top edge reflection (y = 0)
  vec2 srcT = vec2(src.x, -src.y);
  dist = distance(pos, srcT);
  wave += reflAmp * sin(dist * freq - t * 6.0 + phase + 3.14159) * exp(-dist * u_decay);

  // Bottom edge reflection (y = 1)
  vec2 srcB = vec2(src.x, 2.0 - src.y);
  dist = distance(pos, srcB);
  wave += reflAmp * sin(dist * freq - t * 6.0 + phase + 3.14159) * exp(-dist * u_decay);

  return wave;
}

void main() {
  vec2 pos = v_uv;
  vec3 colorSum = vec3(0.0);
  float totalWeight = 0.0;

  // Point sources - each contributes its own color
  for (int i = 0; i < 8; i++) {
    if (i >= u_sourceCount) break;

    float wave = calcWave(pos, u_sources[i], u_amplitudes[i], u_frequencies[i], u_phases[i], u_time);

    // Positive wave crests carry the source color
    float weight = max(0.0, wave);
    colorSum += u_sourceColors[i] * weight;
    totalWeight += weight;

    // Negative troughs add darker version
    float trough = max(0.0, -wave) * 0.3;
    colorSum += u_sourceColors[i] * 0.2 * trough;
    totalWeight += trough;
  }

  // Background bass wave (horizontal, no reflection needed)
  if (u_baseWaveAmp > 0.01) {
    float bassWave = u_baseWaveAmp * sin(pos.y * u_baseWaveFreq + u_time * 1.5);
    float bassWeight = max(0.0, bassWave) * 0.5;
    colorSum += u_bassColor * bassWeight;
    totalWeight += bassWeight;
  }

  // Mix with background
  vec3 col = u_bgColor * 0.1;
  if (totalWeight > 0.01) {
    col = mix(col, colorSum / totalWeight, min(1.0, totalWeight * 2.0));
    col *= 1.0 + totalWeight * 0.5; // brighten peaks
  }

  col = clamp(col, 0.0, 1.0);
  float alpha = length(col) > 0.03 ? 1.0 : 0.0;
  gl_FragColor = vec4(col, alpha);
}`;

interface WaveSource {
  x: number;
  y: number;
  amplitude: number;
  frequency: number;
  phase: number;
  life: number;
  color: [number, number, number]; // RGB 0-1
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
  private wavelength = 100;
  private decayRate = 10.0;
  private intensity = 1.0;
  private bassWaveAmp = 0;
  private bassWaveFreq = 10;
  private bassColor: [number, number, number] = [0.2, 0.1, 0.4];
  private bgColor: [number, number, number] = [0.02, 0.02, 0.08];
  private reflection = 0.5; // How much waves reflect off boundaries (0-1)

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
    const uNames = ['u_time', 'u_sourceCount', 'u_decay', 'u_bgColor',
                     'u_baseWaveAmp', 'u_baseWaveFreq', 'u_bassColor', 'u_reflection'];
    for (const name of uNames) {
      this.uniforms[name] = gl.getUniformLocation(this.program, name);
    }
    for (let i = 0; i < 8; i++) {
      this.uniforms[`u_sources[${i}]`] = gl.getUniformLocation(this.program, `u_sources[${i}]`);
      this.uniforms[`u_amplitudes[${i}]`] = gl.getUniformLocation(this.program, `u_amplitudes[${i}]`);
      this.uniforms[`u_frequencies[${i}]`] = gl.getUniformLocation(this.program, `u_frequencies[${i}]`);
      this.uniforms[`u_phases[${i}]`] = gl.getUniformLocation(this.program, `u_phases[${i}]`);
      this.uniforms[`u_sourceColors[${i}]`] = gl.getUniformLocation(this.program, `u_sourceColors[${i}]`);
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

    // Melody onsets → spawn wave source at clock position with pitch color
    // Root at 12 o'clock, chromatic scale clockwise
    // Radius based on octave: low notes inner, high notes outer
    if (music.melodyOnset && music.melodyPitchClass >= 0) {
      const fromRoot = (music.melodyPitchClass - music.key + 12) % 12;
      // π/2 = top, going clockwise (decreasing angle)
      const angle = Math.PI / 2 - (fromRoot / 12) * TWO_PI;

      // Radius from MIDI note: C2(36) to C7(96) → 0.08 to 0.28
      const midiNote = music.melodyMidiNote ?? 60;
      const t = Math.max(0, Math.min(1, (midiNote - 36) / 60)); // normalize to 0-1
      const edgeR = 0.08 + t * 0.20; // inner to outer based on pitch height

      const x = 0.5 + Math.cos(angle) * edgeR;
      const y = 0.5 + Math.sin(angle) * edgeR;

      // Get color from pitch class
      const rgb = samplePaletteColor(music.melodyPitchClass, 0.8);
      const color: [number, number, number] = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];

      this.sources.push({
        x, y,
        amplitude: 0.8 * music.melodyVelocity * this.intensity,
        frequency: this.wavelength + music.melodyPitchClass * 2,
        phase: this.time * 3,
        life: 3.0,
        color,
      });

      // Limit sources
      while (this.sources.length > this.maxSources) {
        this.sources.shift();
      }
    }

    // === GROOVE CURVES ===
    const beatArrival = music.beatArrival ?? 0;
    const barArrival = music.barArrival ?? 0;
    const beatAnticipation = music.beatAnticipation ?? 0;
    const beatGroove = music.beatGroove ?? 0.5;

    // Beat → amplitude pulse on existing sources
    if (music.drumEnergy > 0.5) {
      for (const s of this.sources) {
        s.amplitude = Math.min(1.5, s.amplitude + 0.3 * music.drumEnergy);
      }
    }

    // Groove-driven amplitude boost (arrival impact)
    if (beatArrival > 0.1 || barArrival > 0.1) {
      const boost = beatArrival * 0.2 + barArrival * 0.3;
      for (const s of this.sources) {
        s.amplitude = Math.min(1.5, s.amplitude + boost);
      }
    }

    // Tension → wave complexity
    // Low tension: wide ripples; High tension: tighter ripples
    const tensionSq = music.tension * music.tension;
    // Base wavelength from tension
    const baseWavelength = 100 - music.tension * 50 - tensionSq * 20;
    // Anticipation tightens wavelength before beat (building tension)
    // As beat approaches, waves get shorter/tighter, then relax on arrival
    const anticipationTightening = beatAnticipation * 0.15;
    this.wavelength = baseWavelength * (1 - anticipationTightening);

    const decayRate = 0.4 + music.tension * 0.6; // Faster decay = more transient/nervous

    // Reflection responds to groove: subtle pulse with beat cycle
    const grooveReflection = (beatGroove - 0.5) * 0.1;
    // More reflection at high tension creates denser interference patterns
    this.reflection = Math.min(1.0, 0.3 + music.tension * 0.4 + tensionSq * 0.3 + grooveReflection);

    // Bass → background wave with bass color
    if (music.bassPitchClass >= 0) {
      this.bassWaveAmp = music.bassVelocity * (0.4 + music.tension * 0.2);
      this.bassWaveFreq = 8 + music.bassPitchClass + music.tension * 4;
      const bassRgb = samplePaletteColor(music.bassPitchClass, 0.6);
      this.bassColor = [bassRgb[0] / 255, bassRgb[1] / 255, bassRgb[2] / 255];
    } else {
      this.bassWaveAmp *= 0.95;
    }

    // Decay sources (faster at high tension for more transient feel)
    for (const s of this.sources) {
      s.life -= dt;
      s.amplitude *= Math.exp(-decayRate * dt);
    }
    this.sources = this.sources.filter(s => s.life > 0 && s.amplitude > 0.01);

    // Background color from key
    if (music.paletteIndex >= 0 && music.paletteIndex < palettes.length) {
      const p = palettes[music.paletteIndex];
      const bg = p.stops[0]?.color ?? [5, 5, 20];
      this.bgColor = [bg[0] / 255, bg[1] / 255, bg[2] / 255];
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
    gl.uniform3f(this.uniforms.u_bgColor!, ...this.bgColor);
    gl.uniform1f(this.uniforms.u_baseWaveAmp!, this.bassWaveAmp);
    gl.uniform1f(this.uniforms.u_baseWaveFreq!, this.bassWaveFreq);
    gl.uniform3f(this.uniforms.u_bassColor!, ...this.bassColor);
    gl.uniform1f(this.uniforms.u_reflection!, this.reflection);

    for (let i = 0; i < 8; i++) {
      const s = this.sources[i];
      if (s) {
        gl.uniform2f(this.uniforms[`u_sources[${i}]`]!, s.x, s.y);
        gl.uniform1f(this.uniforms[`u_amplitudes[${i}]`]!, s.amplitude);
        gl.uniform1f(this.uniforms[`u_frequencies[${i}]`]!, s.frequency);
        gl.uniform1f(this.uniforms[`u_phases[${i}]`]!, s.phase);
        gl.uniform3f(this.uniforms[`u_sourceColors[${i}]`]!, ...s.color);
      } else {
        gl.uniform2f(this.uniforms[`u_sources[${i}]`]!, 0, 0);
        gl.uniform1f(this.uniforms[`u_amplitudes[${i}]`]!, 0);
        gl.uniform1f(this.uniforms[`u_frequencies[${i}]`]!, 0);
        gl.uniform1f(this.uniforms[`u_phases[${i}]`]!, 0);
        gl.uniform3f(this.uniforms[`u_sourceColors[${i}]`]!, 0, 0, 0);
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
      { key: 'decayRate', label: 'Diffusion', type: 'range', value: this.decayRate, min: 2.0, max: 20.0, step: 1.0 },
    ];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return {
      maxSources: 6,
      decayRate: 10.0,
      intensity: 1.0,
      reflection: 0.5,
    };
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    switch (key) {
      case 'maxSources':
        this.maxSources = value as number;
        break;
      case 'decayRate':
        this.decayRate = value as number;
        break;
      case 'intensity':
        this.intensity = value as number;
        break;
      case 'reflection':
        this.reflection = value as number;
        break;
    }
  }
}
