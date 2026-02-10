// --- Fractal Engine ---

import { gsap } from './animation.ts';
import { palettes, type PaletteDef } from './palettes.ts';

export { palettes };

const LUT_SIZE = 2048;
const colorLUT = new Uint8Array(LUT_SIZE * 3);
const lutA = new Uint8Array(LUT_SIZE * 3);
const lutB = new Uint8Array(LUT_SIZE * 3);
const lutBlendState = { value: 1.0 };
const LUT_FADE_DURATION = 0.4; // seconds for palette crossfade

function buildLUTInto(out: Uint8Array, palette: PaletteDef): void {
  const stops = palette.stops;
  for (let i = 0; i < LUT_SIZE; i++) {
    const t = i / (LUT_SIZE - 1);
    let s0 = stops[0], s1 = stops[stops.length - 1];
    for (let j = 0; j < stops.length - 1; j++) {
      if (t >= stops[j].pos && t <= stops[j + 1].pos) {
        s0 = stops[j];
        s1 = stops[j + 1];
        break;
      }
    }
    const range = s1.pos - s0.pos;
    const f = range === 0 ? 0 : (t - s0.pos) / range;
    const idx = i * 3;
    out[idx] = Math.round(s0.color[0] + (s1.color[0] - s0.color[0]) * f);
    out[idx + 1] = Math.round(s0.color[1] + (s1.color[1] - s0.color[1]) * f);
    out[idx + 2] = Math.round(s0.color[2] + (s1.color[2] - s0.color[2]) * f);
  }
}

function buildColorLUT(palette: PaletteDef): void {
  buildLUTInto(colorLUT, palette);
}

function blendLUTs(): void {
  if (lutBlendState.value >= 1.0) return;
  const a = 1 - lutBlendState.value;
  const b = lutBlendState.value;
  for (let i = 0; i < LUT_SIZE * 3; i++) {
    colorLUT[i] = Math.round(lutA[i] * a + lutB[i] * b);
  }
}

// --- Fractal Engine ---

const offscreen = document.createElement('canvas');
const offCtx = offscreen.getContext('2d')!;

let cReal = -0.7;
let cImag = 0.27015;
let zoom = 1.0;
let centerX = 0;
let centerY = 0;
let maxIterations = 150;
let fidelity = 0.6;
let currentPaletteIndex = 4;

// Fractal type
let fractalType = 0;
let phoenixP = -0.5;
let rotation = 0;

buildColorLUT(palettes[currentPaletteIndex]);
lutA.set(colorLUT);
lutB.set(colorLUT);

// --- Multi-worker band-split rendering ---

const NUM_WORKERS = Math.min(navigator.hardwareConcurrency || 4, 8);
const workers: Worker[] = [];
for (let i = 0; i < NUM_WORKERS; i++) {
  workers.push(new Worker(new URL('./fractal-worker.ts', import.meta.url), { type: 'module' }));
}

let rendering = false;
let frameId = 0;
let bandsReceived = 0;
let currentFrameId = -1;
let frameStartTime = 0;
let pendingCanvas: HTMLCanvasElement | null = null;
let pendingDisplayW = 0;
let pendingDisplayH = 0;
// Assembled pixel buffer for the current frame
let frameBuffer: Uint8ClampedArray | null = null;
let frameW = 0;
let frameH = 0;

function handleBand(e: MessageEvent) {
  const { buffer, width: w, yStart, frameId: fid } = e.data;
  // Ignore stale frames
  if (fid !== currentFrameId) return;

  // Copy band into the assembled frame buffer
  if (frameBuffer) {
    const src = new Uint8Array(buffer);
    const dstOffset = yStart * w * 4;
    frameBuffer.set(src, dstOffset);
  }

  bandsReceived++;
  if (bandsReceived >= NUM_WORKERS) {
    // All bands arrived — draw the complete frame
    if (pendingCanvas && frameBuffer) {
      offscreen.width = frameW;
      offscreen.height = frameH;
      const imageData = new ImageData(frameBuffer as unknown as Uint8ClampedArray<ArrayBuffer>, frameW, frameH);
      offCtx.putImageData(imageData, 0, 0);

      const ctx = pendingCanvas.getContext('2d')!;
      ctx.clearRect(0, 0, pendingDisplayW, pendingDisplayH);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'low';
      ctx.drawImage(offscreen, 0, 0, pendingDisplayW, pendingDisplayH);
    }

    const renderMs = performance.now() - frameStartTime;
    rendering = false;

    if (fractalEngine.onFrameReady) {
      fractalEngine.onFrameReady(renderMs);
    }
  }
}

for (const w of workers) {
  w.onmessage = handleBand;
  w.onerror = (e) => {
    console.error('Fractal worker error:', e);
    rendering = false;
  };
}

export const fractalEngine = {
  onFrameReady: null as ((renderMs: number) => void) | null,

  setParams(cr: number, ci: number, z: number, maxIter: number, fid: number) {
    cReal = cr;
    cImag = ci;
    zoom = z;
    maxIterations = maxIter;
    fidelity = fid;
  },

  setCenter(cx: number, cy: number) {
    centerX = cx;
    centerY = cy;
  },

  setRotation(r: number) {
    rotation = r;
  },

  setPalette(index: number) {
    if (index !== currentPaletteIndex && index >= 0 && index < palettes.length) {
      lutA.set(colorLUT);
      buildLUTInto(lutB, palettes[index]);
      lutBlendState.value = 0;
      currentPaletteIndex = index;

      // GSAP: Animate palette crossfade
      gsap.to(lutBlendState, {
        value: 1.0,
        duration: LUT_FADE_DURATION,
        ease: 'power2.inOut',
        onUpdate: blendLUTs,
        onComplete: () => colorLUT.set(lutB),
      });
    }
  },

  update(_dt: number) {
    // Palette blending now handled by GSAP tween in setPalette
  },

  setFractalType(type: number, p?: number) {
    fractalType = type;
    if (p !== undefined) phoenixP = p;
  },

  isRendering() { return rendering; },

  requestRender(canvas: HTMLCanvasElement, displayWidth: number, displayHeight: number) {
    if (rendering) return;

    rendering = true;
    frameId++;
    currentFrameId = frameId;
    bandsReceived = 0;
    frameStartTime = performance.now();
    pendingCanvas = canvas;
    pendingDisplayW = displayWidth;
    pendingDisplayH = displayHeight;

    const w = Math.max(1, Math.floor(displayWidth * fidelity));
    const h = Math.max(1, Math.floor(displayHeight * fidelity));
    frameW = w;
    frameH = h;
    frameBuffer = new Uint8ClampedArray(w * h * 4);

    // Snapshot LUT for workers
    const lutSnapshot = new Uint8Array(colorLUT);

    // Split height into bands and dispatch to workers
    const bandHeight = Math.ceil(h / NUM_WORKERS);
    for (let i = 0; i < NUM_WORKERS; i++) {
      const yStart = i * bandHeight;
      const thisH = Math.min(bandHeight, h - yStart);
      if (thisH <= 0) {
        // Fewer rows than workers — count this band as received
        bandsReceived++;
        continue;
      }
      workers[i].postMessage({
        width: w,
        height: h,
        yStart,
        bandHeight: thisH,
        bandIndex: i,
        frameId: currentFrameId,
        cReal,
        cImag,
        zoom,
        centerX,
        centerY,
        rotation,
        maxIterations,
        fractalType,
        phoenixP,
        colorLUT: lutSnapshot,
      });
    }
  },
};
