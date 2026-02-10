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
  bgColorMode: BgColorMode = 'black';

  constructor() {
    this.compositeCanvas = document.createElement('canvas');
    this.compositeCtx = this.compositeCanvas.getContext('2d')!;
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

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.compositeCanvas.width = width;
    this.compositeCanvas.height = height;
    for (const layer of this.layers) {
      layer.effect.resize(width, height);
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
    const w = targetCanvas.width;
    const h = targetCanvas.height;

    // Clear composite (layers blend on transparent/black)
    this.compositeCanvas.width = w;
    this.compositeCanvas.height = h;
    this.compositeCtx.clearRect(0, 0, w, h);

    // Render non-post-process, non-HUD layers bottom to top
    for (const layer of this.layers) {
      if (!layer.enabled || layer.effect.isPostProcess || layer.effect.isHUD) continue;
      if (!layer.effect.isReady()) continue;

      const effectCanvas = layer.effect.render();
      this.compositeCtx.globalAlpha = layer.opacity;
      this.compositeCtx.globalCompositeOperation = layer.blend;
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
      const effectCanvas = layer.effect.render();
      // Replace composite with post-processed result
      this.compositeCtx.globalAlpha = 1;
      this.compositeCtx.globalCompositeOperation = 'source-over';

      // Blend between original and post-processed based on opacity
      if (layer.opacity < 1) {
        // Save current composite
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.drawImage(this.compositeCanvas, 0, 0);

        this.compositeCtx.clearRect(0, 0, w, h);
        this.compositeCtx.globalAlpha = 1 - layer.opacity;
        this.compositeCtx.drawImage(tempCanvas, 0, 0);
        this.compositeCtx.globalAlpha = layer.opacity;
        this.compositeCtx.drawImage(effectCanvas, 0, 0, w, h);
      } else {
        this.compositeCtx.clearRect(0, 0, w, h);
        this.compositeCtx.drawImage(effectCanvas, 0, 0, w, h);
      }
    }

    // Render HUD layers on top (after post-process, not transformed)
    for (const layer of this.layers) {
      if (!layer.enabled || !layer.effect.isHUD) continue;
      if (!layer.effect.isReady()) continue;

      const effectCanvas = layer.effect.render();
      this.compositeCtx.globalAlpha = layer.opacity;
      this.compositeCtx.globalCompositeOperation = layer.blend;
      this.compositeCtx.drawImage(effectCanvas, 0, 0, w, h);
    }

    // Final blit to target: background color first, then composite on top
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const bgColor = this.getBgColor();
    if (bgColor === '#000') {
      ctx.clearRect(0, 0, w, h);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(this.compositeCanvas, 0, 0);
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
}
