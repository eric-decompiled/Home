// --- Fractal Effect Wrapper ---
// Wraps the existing fractal engine as a VisualEffect for the compositor.

import type { VisualEffect, EffectConfig, MusicParams, BlendMode } from './effect-interface.ts';
import { fractalEngine } from '../fractal-engine.ts';
import {
  getAnchorPresets,
  applyAnchorPreset,
  loadFractalAnchors,
  saveAnchorPreset,
  deleteAnchorPreset,
  type AnchorPreset,
} from '../state.ts';

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
  private currentPresetId = 'current';  // 'current' means use localStorage anchors
  private onPresetChange?: () => void;  // Callback to notify main.ts of anchor changes

  constructor() {
    this.canvas = document.createElement('canvas');
  }

  /** Set callback for when preset changes (triggers musicMapper reset) */
  setPresetChangeCallback(callback: () => void): void {
    this.onPresetChange = callback;
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
    // Preset selection moved to sidebar buttons
    return [];
  }

  getDefaults(): Record<string, number | string | boolean> {
    return {};
  }

  setConfigValue(key: string, value: number | string | boolean): void {
    if (key === 'preset' && typeof value === 'string') {
      // Parse "id:name" format
      const colonIdx = value.indexOf(':');
      const presetId = colonIdx > 0 ? value.substring(0, colonIdx) : value;
      this.currentPresetId = presetId;

      if (presetId !== 'current') {
        // Apply the selected preset
        const presets = getAnchorPresets();
        const preset = presets.find(p => p.id === presetId);
        if (preset) {
          applyAnchorPreset(preset);
          // Notify that anchors changed
          if (this.onPresetChange) {
            this.onPresetChange();
          }
        }
      }
    }
  }

  /** Get current preset ID */
  getCurrentPresetId(): string {
    return this.currentPresetId;
  }

  /** Save current anchors as a new preset */
  saveCurrentAsPreset(name: string): AnchorPreset | null {
    const anchors = loadFractalAnchors();
    if (!anchors) return null;
    const preset = saveAnchorPreset(name, anchors);
    this.currentPresetId = preset.id;
    return preset;
  }

  /** Delete a custom preset */
  deletePreset(id: string): void {
    deleteAnchorPreset(id);
    if (this.currentPresetId === id) {
      this.currentPresetId = 'current';
    }
  }

  /** Expose for adaptive fidelity in main.ts */
  getRenderFidelity(): number {
    return this.renderFidelity;
  }

  setRenderFidelity(f: number): void {
    this.renderFidelity = f;
  }
}
