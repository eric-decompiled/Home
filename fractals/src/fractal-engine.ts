// --- Color Palettes ---

import { gsap } from './animation.ts';

type RGB = [number, number, number];
interface PaletteDef {
  name: string;
  stops: { pos: number; color: RGB }[];
}

// 12 chromatic palettes indexed by pitch class (C=0 .. B=11)
// Anchors: A=red(Fire), E=blue(Ocean), G=green(Emerald)
// Intermediate hues interpolated around the color wheel
export const palettes: PaletteDef[] = [
  { // 0 - C - Magenta
    name: 'C',
    stops: [
      { pos: 0.0,  color: [4, 0, 3] },
      { pos: 0.15, color: [55, 0, 42] },
      { pos: 0.4,  color: [170, 20, 130] },
      { pos: 0.65, color: [220, 60, 175] },
      { pos: 0.85, color: [240, 120, 200] },
      { pos: 1.0,  color: [200, 80, 165] },
    ],
  },
  { // 1 - C# - Warm Violet (shifted warmer from C/D)
    name: 'C\u266F',
    stops: [
      { pos: 0.0,  color: [4, 0, 4] },
      { pos: 0.15, color: [45, 10, 50] },
      { pos: 0.4,  color: [130, 50, 140] },
      { pos: 0.65, color: [170, 85, 175] },
      { pos: 0.85, color: [195, 120, 200] },
      { pos: 1.0,  color: [155, 80, 160] },
    ],
  },
  { // 2 - D - Deep Purple
    name: 'D',
    stops: [
      { pos: 0.0,  color: [5, 0, 8] },
      { pos: 0.15, color: [35, 5, 55] },
      { pos: 0.4,  color: [100, 25, 150] },
      { pos: 0.65, color: [140, 50, 190] },
      { pos: 0.85, color: [175, 90, 220] },
      { pos: 1.0,  color: [130, 60, 175] },
    ],
  },
  { // 3 - D# - Slate Blue (cooler, distinct from D and E)
    name: 'D\u266F',
    stops: [
      { pos: 0.0,  color: [1, 1, 5] },
      { pos: 0.15, color: [20, 25, 55] },
      { pos: 0.4,  color: [70, 85, 140] },
      { pos: 0.65, color: [100, 120, 175] },
      { pos: 0.85, color: [130, 150, 200] },
      { pos: 1.0,  color: [90, 110, 160] },
    ],
  },
  { // 4 - E - Ocean Blue
    name: 'E',
    stops: [
      { pos: 0.0,  color: [0, 3, 18] },
      { pos: 0.15, color: [0, 22, 65] },
      { pos: 0.4,  color: [0, 65, 140] },
      { pos: 0.65, color: [25, 110, 180] },
      { pos: 0.85, color: [50, 150, 210] },
      { pos: 1.0,  color: [15, 75, 145] },
    ],
  },
  { // 5 - F - Aqua/Cyan (more green-leaning for contrast with E)
    name: 'F',
    stops: [
      { pos: 0.0,  color: [0, 5, 5] },
      { pos: 0.15, color: [0, 50, 50] },
      { pos: 0.4,  color: [0, 160, 150] },
      { pos: 0.65, color: [30, 210, 195] },
      { pos: 0.85, color: [80, 240, 225] },
      { pos: 1.0,  color: [45, 195, 180] },
    ],
  },
  { // 6 - F# - Warm Teal (shifted warmer from F/G)
    name: 'F\u266F',
    stops: [
      { pos: 0.0,  color: [0, 4, 3] },
      { pos: 0.15, color: [10, 40, 35] },
      { pos: 0.4,  color: [50, 130, 110] },
      { pos: 0.65, color: [85, 170, 145] },
      { pos: 0.85, color: [120, 200, 175] },
      { pos: 1.0,  color: [75, 155, 130] },
    ],
  },
  { // 7 - G - Green (Emerald)
    name: 'G',
    stops: [
      { pos: 0.0,  color: [0, 0, 0] },
      { pos: 0.15, color: [0, 24, 16] },
      { pos: 0.4,  color: [15, 160, 120] },
      { pos: 0.65, color: [50, 210, 165] },
      { pos: 0.85, color: [95, 240, 195] },
      { pos: 1.0,  color: [55, 195, 155] },
    ],
  },
  { // 8 - G# - Gold (muted accidental)
    name: 'G\u266F',
    stops: [
      { pos: 0.0,  color: [2, 1, 0] },
      { pos: 0.15, color: [35, 25, 0] },
      { pos: 0.4,  color: [115, 90, 0] },
      { pos: 0.65, color: [150, 125, 12] },
      { pos: 0.85, color: [170, 145, 30] },
      { pos: 1.0,  color: [140, 115, 10] },
    ],
  },
  { // 9 - A - Red (Fire)
    name: 'A',
    stops: [
      { pos: 0.0,  color: [0, 0, 0] },
      { pos: 0.2,  color: [100, 0, 0] },
      { pos: 0.45, color: [220, 50, 0] },
      { pos: 0.7,  color: [255, 180, 30] },
      { pos: 0.85, color: [255, 220, 80] },
      { pos: 1.0,  color: [220, 120, 10] },
    ],
  },
  { // 10 - A# - Dusty Mauve (purple-shifted to contrast with red A)
    name: 'A\u266F',
    stops: [
      { pos: 0.0,  color: [4, 1, 4] },
      { pos: 0.15, color: [45, 20, 50] },
      { pos: 0.4,  color: [140, 65, 130] },
      { pos: 0.65, color: [175, 100, 165] },
      { pos: 0.85, color: [200, 135, 190] },
      { pos: 1.0,  color: [160, 90, 150] },
    ],
  },
  { // 11 - B - Fuchsia
    name: 'B',
    stops: [
      { pos: 0.0,  color: [5, 0, 3] },
      { pos: 0.15, color: [50, 0, 35] },
      { pos: 0.4,  color: [170, 15, 110] },
      { pos: 0.65, color: [215, 55, 160] },
      { pos: 0.85, color: [235, 110, 195] },
      { pos: 1.0,  color: [195, 65, 155] },
    ],
  },
];

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
