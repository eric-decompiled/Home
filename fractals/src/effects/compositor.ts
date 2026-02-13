// --- Layer Compositor ---
// Manages a stack of VisualEffect layers, compositing them onto the main canvas.

import type { VisualEffect, LayerState, BlendMode, MusicParams } from './effect-interface.ts';
export type BgColorMode = 'black';

export class Compositor {
  private layers: LayerState[] = [];
  private compositeCanvas: HTMLCanvasElement;
  private compositeCtx: CanvasRenderingContext2D;
  private width = 800;
  private height = 600;
  private displayWidth = 800;  // Full resolution for final output
  private displayHeight = 600;
  bgColorMode: BgColorMode = 'black';

  // Render scale: 1.0 = full resolution, 0.5 = half resolution (4x faster)
  // Default to 0.75 (medium) for balanced performance
  private _renderScale = 0.75;

  // State tracking to avoid redundant canvas state changes
  private currentAlpha = 1;
  private currentBlend: GlobalCompositeOperation = 'source-over';

  // Per-effect profiling
  profileEnabled = false;
  effectTimes: Map<string, number[]> = new Map();

  constructor() {
    this.compositeCanvas = document.createElement('canvas');
    this.compositeCtx = this.compositeCanvas.getContext('2d')!;
  }

  // Set globalAlpha only if changed
  private setAlpha(alpha: number): void {
    if (this.currentAlpha !== alpha) {
      this.currentAlpha = alpha;
      this.compositeCtx.globalAlpha = alpha;
    }
  }

  // Set globalCompositeOperation only if changed
  private setBlendMode(blend: GlobalCompositeOperation): void {
    if (this.currentBlend !== blend) {
      this.currentBlend = blend;
      this.compositeCtx.globalCompositeOperation = blend;
    }
  }

  addLayer(effect: VisualEffect, enabled = false): LayerState {
    const layer: LayerState = {
      effect,
      enabled,
      opacity: effect.defaultOpacity,
      blend: effect.defaultBlend,
    };
    // Post-process layers go at the end
    if (effect.isPostProcess) {
      this.layers.push(layer);
    } else {
      // Insert before first post-process layer
      const ppIdx = this.layers.findIndex(l => l.effect.isPostProcess);
      if (ppIdx >= 0) {
        this.layers.splice(ppIdx, 0, layer);
      } else {
        this.layers.push(layer);
      }
    }
    effect.init(this.width, this.height);
    return layer;
  }

  getLayers(): LayerState[] {
    return this.layers;
  }

  getLayer(id: string): LayerState | undefined {
    return this.layers.find(l => l.effect.id === id);
  }

  setEnabled(id: string, enabled: boolean): void {
    const layer = this.getLayer(id);
    if (layer) layer.enabled = enabled;
  }

  setOpacity(id: string, opacity: number): void {
    const layer = this.getLayer(id);
    if (layer) layer.opacity = Math.max(0, Math.min(1, opacity));
  }

  setBlend(id: string, blend: BlendMode): void {
    const layer = this.getLayer(id);
    if (layer) layer.blend = blend;
  }

  get renderScale(): number {
    return this._renderScale;
  }

  set renderScale(scale: number) {
    const newScale = Math.max(0.25, Math.min(1.0, scale));
    if (newScale !== this._renderScale) {
      this._renderScale = newScale;
      // Re-apply current dimensions with new scale
      this.resize(this.displayWidth, this.displayHeight);
    }
  }

  resize(width: number, height: number): void {
    this.displayWidth = width;
    this.displayHeight = height;
    // Apply render scale to internal dimensions
    this.width = Math.round(width * this._renderScale);
    this.height = Math.round(height * this._renderScale);
    this.compositeCanvas.width = this.width;
    this.compositeCanvas.height = this.height;
    for (const layer of this.layers) {
      layer.effect.resize(this.width, this.height);
    }
  }

  update(dt: number, music: MusicParams): void {
    for (const layer of this.layers) {
      if (layer.enabled) {
        layer.effect.update(dt, music);
      }
    }
  }

  private getBgColor(): string {
    return '#000';
  }

  render(targetCanvas: HTMLCanvasElement): void {
    const ctx = targetCanvas.getContext('2d')!;
    const displayW = targetCanvas.width;
    const displayH = targetCanvas.height;
    // Internal compositing at (possibly scaled) resolution
    const w = this.width;
    const h = this.height;

    // Clear composite (layers blend on transparent/black)
    // Only resize if dimensions changed; otherwise just clear
    if (this.compositeCanvas.width !== w || this.compositeCanvas.height !== h) {
      this.compositeCanvas.width = w;
      this.compositeCanvas.height = h;
      // Canvas resize resets context state, so reset our tracking
      this.currentAlpha = 1;
      this.currentBlend = 'source-over';
    } else {
      this.compositeCtx.clearRect(0, 0, w, h);
    }

    // Render non-post-process, non-HUD layers bottom to top
    for (const layer of this.layers) {
      if (!layer.enabled || layer.effect.isPostProcess || layer.effect.isHUD) continue;
      if (!layer.effect.isReady()) continue;

      const t0 = this.profileEnabled ? performance.now() : 0;
      const effectCanvas = layer.effect.render();
      if (this.profileEnabled) {
        const elapsed = performance.now() - t0;
        const times = this.effectTimes.get(layer.effect.id) || [];
        times.push(elapsed);
        if (times.length > 300) times.shift();
        this.effectTimes.set(layer.effect.id, times);
      }
      this.setAlpha(layer.opacity);
      this.setBlendMode(layer.blend);
      this.compositeCtx.drawImage(effectCanvas, 0, 0, w, h);
    }

    // Apply post-process layers
    for (const layer of this.layers) {
      if (!layer.enabled || !layer.effect.isPostProcess) continue;

      // Pass composite canvas to post-process effects
      if ('setSourceCanvas' in layer.effect) {
        (layer.effect as any).setSourceCanvas(this.compositeCanvas);
      }

      if (!layer.effect.isReady()) continue;

      // Post-process reads the current composite and transforms it
      const t0 = this.profileEnabled ? performance.now() : 0;
      const effectCanvas = layer.effect.render();
      if (this.profileEnabled) {
        const elapsed = performance.now() - t0;
        const times = this.effectTimes.get(layer.effect.id) || [];
        times.push(elapsed);
        if (times.length > 300) times.shift();
        this.effectTimes.set(layer.effect.id, times);
      }
      // Replace composite with post-processed result (always full replacement)
      this.setAlpha(1);
      this.setBlendMode('source-over');
      this.compositeCtx.clearRect(0, 0, w, h);
      this.compositeCtx.drawImage(effectCanvas, 0, 0, w, h);
    }

    // Render HUD layers on top (after post-process, not transformed)
    for (const layer of this.layers) {
      if (!layer.enabled || !layer.effect.isHUD) continue;
      if (!layer.effect.isReady()) continue;

      const t0 = this.profileEnabled ? performance.now() : 0;
      const effectCanvas = layer.effect.render();
      if (this.profileEnabled) {
        const elapsed = performance.now() - t0;
        const times = this.effectTimes.get(layer.effect.id) || [];
        times.push(elapsed);
        if (times.length > 300) times.shift();
        this.effectTimes.set(layer.effect.id, times);
      }
      this.setAlpha(layer.opacity);
      this.setBlendMode(layer.blend);
      this.compositeCtx.drawImage(effectCanvas, 0, 0, w, h);
    }

    // Final blit to target: background color first, then composite on top
    // Use display dimensions for target canvas, upscaling if renderScale < 1
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const bgColor = this.getBgColor();
    if (bgColor === '#000') {
      ctx.clearRect(0, 0, displayW, displayH);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, displayW, displayH);
    }
    // Upscale composite to display size (browser handles interpolation)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.compositeCanvas, 0, 0, displayW, displayH);
  }

  /** Returns the composite canvas (for post-process effects to read from) */
  getCompositeCanvas(): HTMLCanvasElement {
    return this.compositeCanvas;
  }

  hasAnyEnabled(): boolean {
    return this.layers.some(l => l.enabled);
  }

  /** Reset all effects to fresh state (on song change) */
  resetAll(): void {
    for (const layer of this.layers) {
      layer.effect.dispose();
      layer.effect.init(this.width, this.height);
    }
  }

  dispose(): void {
    for (const layer of this.layers) {
      layer.effect.dispose();
    }
    this.layers = [];
  }

  /** Get profiling stats for each effect (avg and max render time in ms) */
  getProfileStats(): { id: string; avg: number; max: number; samples: number }[] {
    const stats: { id: string; avg: number; max: number; samples: number }[] = [];
    for (const [id, times] of this.effectTimes) {
      if (times.length === 0) continue;
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);
      stats.push({ id, avg, max, samples: times.length });
    }
    return stats.sort((a, b) => b.avg - a.avg);
  }

  /** Clear profiling data */
  clearProfileStats(): void {
    this.effectTimes.clear();
  }
}
