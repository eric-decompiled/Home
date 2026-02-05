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
  { // 1 - C# - Purple
    name: 'C\u266F',
    stops: [
      { pos: 0.0,  color: [3, 0, 8] },
      { pos: 0.15, color: [35, 0, 55] },
      { pos: 0.4,  color: [110, 20, 175] },
      { pos: 0.65, color: [160, 60, 220] },
      { pos: 0.85, color: [185, 110, 235] },
      { pos: 1.0,  color: [145, 70, 195] },
    ],
  },
  { // 2 - D - Indigo
    name: 'D',
    stops: [
      { pos: 0.0,  color: [1, 0, 10] },
      { pos: 0.15, color: [18, 4, 65] },
      { pos: 0.4,  color: [65, 30, 175] },
      { pos: 0.65, color: [110, 70, 220] },
      { pos: 0.85, color: [150, 120, 240] },
      { pos: 1.0,  color: [110, 80, 200] },
    ],
  },
  { // 3 - D# - Blue-Violet
    name: 'D\u266F',
    stops: [
      { pos: 0.0,  color: [0, 0, 10] },
      { pos: 0.15, color: [10, 8, 65] },
      { pos: 0.4,  color: [40, 40, 180] },
      { pos: 0.65, color: [80, 90, 220] },
      { pos: 0.85, color: [120, 140, 240] },
      { pos: 1.0,  color: [80, 100, 200] },
    ],
  },
  { // 4 - E - Blue (Ocean)
    name: 'E',
    stops: [
      { pos: 0.0,  color: [0, 4, 20] },
      { pos: 0.15, color: [0, 28, 80] },
      { pos: 0.4,  color: [0, 95, 170] },
      { pos: 0.65, color: [30, 155, 230] },
      { pos: 0.85, color: [70, 190, 245] },
      { pos: 1.0,  color: [30, 140, 200] },
    ],
  },
  { // 5 - F - Teal
    name: 'F',
    stops: [
      { pos: 0.0,  color: [0, 3, 8] },
      { pos: 0.15, color: [0, 30, 55] },
      { pos: 0.4,  color: [0, 120, 150] },
      { pos: 0.65, color: [30, 180, 200] },
      { pos: 0.85, color: [80, 210, 225] },
      { pos: 1.0,  color: [40, 170, 185] },
    ],
  },
  { // 6 - F# - Cyan-Green
    name: 'F\u266F',
    stops: [
      { pos: 0.0,  color: [0, 4, 3] },
      { pos: 0.15, color: [0, 38, 30] },
      { pos: 0.4,  color: [10, 150, 115] },
      { pos: 0.65, color: [40, 200, 155] },
      { pos: 0.85, color: [90, 230, 185] },
      { pos: 1.0,  color: [50, 185, 145] },
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
  { // 8 - G# - Gold
    name: 'G\u266F',
    stops: [
      { pos: 0.0,  color: [3, 2, 0] },
      { pos: 0.15, color: [50, 35, 0] },
      { pos: 0.4,  color: [175, 135, 0] },
      { pos: 0.65, color: [230, 190, 20] },
      { pos: 0.85, color: [250, 215, 50] },
      { pos: 1.0,  color: [210, 170, 15] },
    ],
  },
  { // 9 - A - Red (Fire)
    name: 'A',
    stops: [
      { pos: 0.0,  color: [0, 0, 0] },
      { pos: 0.15, color: [75, 0, 0] },
      { pos: 0.35, color: [190, 35, 0] },
      { pos: 0.55, color: [240, 120, 10] },
      { pos: 0.75, color: [255, 190, 40] },
      { pos: 0.9,  color: [245, 160, 25] },
      { pos: 1.0,  color: [200, 100, 5] },
    ],
  },
  { // 10 - A# - Rose
    name: 'A\u266F',
    stops: [
      { pos: 0.0,  color: [5, 0, 1] },
      { pos: 0.15, color: [58, 0, 22] },
      { pos: 0.4,  color: [190, 30, 80] },
      { pos: 0.65, color: [235, 70, 130] },
      { pos: 0.85, color: [245, 130, 175] },
      { pos: 1.0,  color: [205, 80, 135] },
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
