// --- Fractal Effect Wrapper ---
// Wraps the existing fractal engine as a VisualEffect for the compositor.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { fractalEngine } from '../fractal-engine.ts';

export class FractalEffect implements VisualEffect {
  readonly id = 'fractal';
  readonly name = 'Fractals';
  readonly isPostProcess = false;
  readonly defaultBlend: BlendMode = 'source-over';
  readonly defaultOpacity = 1.0;

  private canvas: HTMLCanvasElement;
  private width = 800;
  private height = 600;
  private ready = false;
  private renderFidelity = 0.45;

  constructor() {
    this.canvas = document.createElement('canvas');
  }

  init(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ready = true;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  update(dt: number, _music: MusicParams): void {
    fractalEngine.update(dt);
  }

  /** Called by main.ts to set fractal-specific params from the existing mapper */
  setFractalParams(
    cReal: number, cImag: number, zoom: number,
    maxIter: number, fidelity: number,
    fractalType: number, phoenixP: number,
    rotation: number, paletteIndex: number
  ): void {
    this.renderFidelity = fidelity;
    fractalEngine.setParams(cReal, cImag, zoom, maxIter, fidelity);
    fractalEngine.setFractalType(fractalType, phoenixP);
    fractalEngine.setRotation(rotation);
    fractalEngine.setPalette(paletteIndex);
  }

  render(): HTMLCanvasElement {
    // The fractal engine renders asynchronously via workers.
    // We request a render to our internal canvas and return it.
    // The compositor will use whatever is currently on the canvas.
    if (!fractalEngine.isRendering()) {
      fractalEngine.requestRender(this.canvas, this.width, this.height);
    }
    return this.canvas;
  }

  isReady(): boolean {
    return this.ready;
  }

  dispose(): void {
    this.ready = false;
  }

  getConfig(): EffectConfig[] {
    return [];
  }

  setConfigValue(_key: string, _value: number | string | boolean): void {
    // Fractal config is managed by config.html
  }

  /** Expose for adaptive fidelity in main.ts */
  getRenderFidelity(): number {
    return this.renderFidelity;
  }

  setRenderFidelity(f: number): void {
    this.renderFidelity = f;
  }
}
