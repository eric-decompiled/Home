// --- Color Palettes ---

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
let lutBlend = 1.0;
const LUT_FADE_SPEED = 2.5;

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
  if (lutBlend >= 1.0) return;
  const a = 1 - lutBlend;
  const b = lutBlend;
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

// Key color for vignette (sampled from key palette mid-tone)
let keyR = 0, keyG = 0, keyB = 0;
let keyPitchClass = 0; // used to rotate the clock face so key = 12 o'clock

// Diatonic semitone offsets from key root (used to highlight in-key dots)
const MAJOR_OFFSETS = new Set([0, 2, 4, 5, 7, 9, 11]);
const MINOR_OFFSETS = new Set([0, 2, 3, 5, 7, 8, 10]);
let diatonicOffsets: Set<number> = MAJOR_OFFSETS;

// Precomputed clock dot colors (12 pitch classes, sampled at 0.65 brightness)
const clockDotColors: RGB[] = palettes.map(p => {
  const tmp = new Uint8Array(LUT_SIZE * 3);
  buildLUTInto(tmp, p);
  const li = Math.round(0.65 * (LUT_SIZE - 1)) * 3;
  return [tmp[li], tmp[li + 1], tmp[li + 2]] as RGB;
});

// Melody lightning ball — travels between clock positions with trail
let melodyEnabled = false;
let melodyLightR = 0, melodyLightG = 0, melodyLightB = 0;
let melodyLightX = 0, melodyLightY = -1; // current position (unit circle)
let melodyLightTX = 0, melodyLightTY = -1; // target position
let melodyLightStrength = 0;
let lastMelodyPitchClass = -1;

interface TrailPoint { x: number; y: number; r: number; g: number; b: number; age: number; }

// Light trail connecting recent melody positions (~5s at 24fps)
const TRAIL_MAX = 120;
const melodyTrail: TrailPoint[] = [];


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
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'low';
      ctx.drawImage(offscreen, 0, 0, pendingDisplayW, pendingDisplayH);

      // 12 pitch class dots arranged like a clock face
      // In-key notes are larger and brighter, chromatic notes are small and faded
      if (melodyEnabled) {
        const cx = pendingDisplayW / 2, cy = pendingDisplayH / 2;
        const edgeR = Math.min(cx, cy) * 0.85;
        const baseDotR = Math.max(2, Math.min(cx, cy) * 0.012);
        for (let i = 0; i < 12; i++) {
          const pc = (keyPitchClass + i) % 12;
          const inKey = diatonicOffsets.has(i);
          const angle = (i / 12) * Math.PI * 2;
          const dx = cx + Math.sin(angle) * edgeR;
          const dy = cy - Math.cos(angle) * edgeR;
          const [cr, cg, cb] = clockDotColors[pc];
          const dotR = inKey ? baseDotR * 1.15 : baseDotR * 0.85;
          const alpha = inKey ? 0.6 : 0.3;
          ctx.beginPath();
          ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
          ctx.fill();
        }
      }

      // Melody trail — bright glowing line connecting recent positions
      if (melodyEnabled && melodyTrail.length > 1) {
        const cx = pendingDisplayW / 2, cy = pendingDisplayH / 2;
        const edgeR = Math.min(cx, cy) * 0.85;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.lineCap = 'round';
        // Outer glow — soft bloom
        for (let i = 1; i < melodyTrail.length; i++) {
          const prev = melodyTrail[i - 1];
          const cur = melodyTrail[i];
          const fade = 1 - cur.age / TRAIL_MAX;
          if (fade <= 0) continue;
          ctx.beginPath();
          ctx.moveTo(cx + prev.x * edgeR, cy + prev.y * edgeR);
          ctx.lineTo(cx + cur.x * edgeR, cy + cur.y * edgeR);
          ctx.strokeStyle = `rgba(${cur.r},${cur.g},${cur.b},${(fade * 0.10).toFixed(3)})`;
          ctx.lineWidth = 6 + fade * 8;
          ctx.stroke();
        }
        // Bright core — white-hot newest, fading to palette color
        for (let i = 1; i < melodyTrail.length; i++) {
          const prev = melodyTrail[i - 1];
          const cur = melodyTrail[i];
          const fade = 1 - cur.age / TRAIL_MAX;
          if (fade <= 0) continue;
          ctx.beginPath();
          ctx.moveTo(cx + prev.x * edgeR, cy + prev.y * edgeR);
          ctx.lineTo(cx + cur.x * edgeR, cy + cur.y * edgeR);
          const wt = fade * fade;
          const wr = Math.round(cur.r + (255 - cur.r) * wt * 0.5);
          const wg = Math.round(cur.g + (255 - cur.g) * wt * 0.5);
          const wb = Math.round(cur.b + (255 - cur.b) * wt * 0.5);
          ctx.strokeStyle = `rgba(${wr},${wg},${wb},${(fade * 0.6).toFixed(3)})`;
          ctx.lineWidth = 1.5 + fade * 3;
          ctx.stroke();
        }
        ctx.restore();
      }

      // Subtle song-key vignette on outer edge
      if (keyR + keyG + keyB > 0) {
        const cx = pendingDisplayW / 2, cy = pendingDisplayH / 2;
        const maxR = Math.sqrt(cx * cx + cy * cy);
        const grad = ctx.createRadialGradient(cx, cy, maxR * 0.55, cx, cy, maxR);
        grad.addColorStop(0, `rgba(${keyR},${keyG},${keyB},0)`);
        grad.addColorStop(0.6, `rgba(${keyR},${keyG},${keyB},0.08)`);
        grad.addColorStop(1, `rgba(${keyR},${keyG},${keyB},0.25)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, pendingDisplayW, pendingDisplayH);
      }
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
      lutBlend = 0;
      currentPaletteIndex = index;
    }
  },

  setMelodyEnabled(enabled: boolean) {
    melodyEnabled = enabled;
    if (!melodyEnabled) {
      melodyLightStrength = 0;
      melodyTrail.length = 0;
      lastMelodyPitchClass = -1;
    }
  },

  setMelodyTint(pitchClass: number, velocity: number) {
    if (!melodyEnabled) return;
    if (pitchClass < 0 || velocity <= 0) {
      lastMelodyPitchClass = -1;
      return;
    }
    // Onset: new note or same note reappearing after silence
    if (pitchClass !== lastMelodyPitchClass) {
      const p = palettes[pitchClass % palettes.length];
      const tmpLut = new Uint8Array(LUT_SIZE * 3);
      buildLUTInto(tmpLut, p);
      const li = Math.round(0.85 * (LUT_SIZE - 1)) * 3;
      melodyLightR = tmpLut[li]; melodyLightG = tmpLut[li + 1]; melodyLightB = tmpLut[li + 2];
      const angle = (((pitchClass - keyPitchClass + 12) % 12) / 12) * Math.PI * 2;
      melodyLightTX = Math.sin(angle);
      melodyLightTY = -Math.cos(angle);
      melodyLightStrength = Math.min(1.0, velocity * 0.9);
      lastMelodyPitchClass = pitchClass;
    }
  },

  update(dt: number) {
    if (lutBlend < 1.0) {
      lutBlend = Math.min(1.0, lutBlend + LUT_FADE_SPEED * dt);
      blendLUTs();
      if (lutBlend >= 1.0) {
        colorLUT.set(lutB);
      }
    }
    if (melodyEnabled) {
      // Move melody light toward target in a straight line
      const melSnap = 1 - Math.exp(-10.0 * dt);
      melodyLightX += (melodyLightTX - melodyLightX) * melSnap;
      melodyLightY += (melodyLightTY - melodyLightY) * melSnap;
      // Decay melody strength — fast pulse
      melodyLightStrength *= Math.exp(-4.0 * dt);
      if (melodyLightStrength < 0.05) {
        melodyLightStrength = 0;
        lastMelodyPitchClass = -1; // allow re-trigger on same pitch
      }

      // Push melody trail point each frame
      melodyTrail.unshift({ x: melodyLightX, y: melodyLightY, r: melodyLightR, g: melodyLightG, b: melodyLightB, age: 0 });
      for (let i = 0; i < melodyTrail.length; i++) melodyTrail[i].age++;
      while (melodyTrail.length > TRAIL_MAX) melodyTrail.pop();
    }

  },

  setKeyPalette(pitchClass: number, mode?: 'major' | 'minor') {
    // Sample mid-tone from the key's palette for the edge vignette
    const p = palettes[pitchClass % palettes.length];
    const tmpLut = new Uint8Array(LUT_SIZE * 3);
    buildLUTInto(tmpLut, p);
    const li = Math.round(0.5 * (LUT_SIZE - 1)) * 3;
    keyR = tmpLut[li]; keyG = tmpLut[li + 1]; keyB = tmpLut[li + 2];
    keyPitchClass = pitchClass;
    diatonicOffsets = mode === 'minor' ? MINOR_OFFSETS : MAJOR_OFFSETS;
  },

  setFractalType(type: number, p?: number) {
    fractalType = type;
    if (p !== undefined) phoenixP = p;
  },

  isRendering() { return rendering; },

  getFractalType() { return fractalType; },
  getCReal() { return cReal; },
  getCImag() { return cImag; },
  getZoom() { return zoom; },
  getMaxIterations() { return maxIterations; },
  getFidelity() { return fidelity; },
  getPaletteIndex() { return currentPaletteIndex; },

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

    // Snapshot LUT once for all workers
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
