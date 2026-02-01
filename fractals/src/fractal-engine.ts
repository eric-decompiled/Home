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
      { pos: 0.0, color: [10, 0, 8] },
      { pos: 0.2, color: [70, 0, 55] },
      { pos: 0.5, color: [200, 30, 160] },
      { pos: 0.8, color: [240, 140, 220] },
      { pos: 1.0, color: [255, 240, 252] },
    ],
  },
  { // 1 - C# - Purple
    name: 'C\u266F',
    stops: [
      { pos: 0.0, color: [5, 0, 12] },
      { pos: 0.2, color: [45, 0, 70] },
      { pos: 0.5, color: [130, 30, 200] },
      { pos: 0.8, color: [190, 130, 240] },
      { pos: 1.0, color: [245, 235, 255] },
    ],
  },
  { // 2 - D - Indigo
    name: 'D',
    stops: [
      { pos: 0.0, color: [2, 0, 15] },
      { pos: 0.2, color: [25, 5, 80] },
      { pos: 0.5, color: [80, 40, 200] },
      { pos: 0.8, color: [160, 140, 245] },
      { pos: 1.0, color: [235, 235, 255] },
    ],
  },
  { // 3 - D# - Blue-Violet
    name: 'D\u266F',
    stops: [
      { pos: 0.0, color: [0, 0, 15] },
      { pos: 0.2, color: [15, 10, 85] },
      { pos: 0.5, color: [55, 50, 205] },
      { pos: 0.8, color: [140, 155, 245] },
      { pos: 1.0, color: [230, 238, 255] },
    ],
  },
  { // 4 - E - Blue (Ocean)
    name: 'E',
    stops: [
      { pos: 0.0, color: [0, 7, 30] },
      { pos: 0.2, color: [0, 40, 100] },
      { pos: 0.5, color: [0, 120, 190] },
      { pos: 0.75, color: [80, 200, 255] },
      { pos: 1.0, color: [240, 250, 255] },
    ],
  },
  { // 5 - F - Teal
    name: 'F',
    stops: [
      { pos: 0.0, color: [0, 5, 12] },
      { pos: 0.2, color: [0, 40, 70] },
      { pos: 0.5, color: [0, 150, 180] },
      { pos: 0.8, color: [100, 225, 240] },
      { pos: 1.0, color: [230, 252, 255] },
    ],
  },
  { // 6 - F# - Cyan-Green
    name: 'F\u266F',
    stops: [
      { pos: 0.0, color: [0, 6, 5] },
      { pos: 0.2, color: [0, 50, 40] },
      { pos: 0.5, color: [20, 185, 140] },
      { pos: 0.8, color: [120, 245, 200] },
      { pos: 1.0, color: [235, 255, 248] },
    ],
  },
  { // 7 - G - Green (Emerald)
    name: 'G',
    stops: [
      { pos: 0.0, color: [0, 0, 0] },
      { pos: 0.25, color: [0, 30, 20] },
      { pos: 0.5, color: [22, 199, 154] },
      { pos: 0.8, color: [120, 255, 220] },
      { pos: 1.0, color: [255, 255, 255] },
    ],
  },
  { // 8 - G# - Gold
    name: 'G\u266F',
    stops: [
      { pos: 0.0, color: [5, 4, 0] },
      { pos: 0.2, color: [65, 45, 0] },
      { pos: 0.5, color: [200, 160, 0] },
      { pos: 0.8, color: [255, 225, 60] },
      { pos: 1.0, color: [255, 252, 210] },
    ],
  },
  { // 9 - A - Red (Fire)
    name: 'A',
    stops: [
      { pos: 0.0, color: [0, 0, 0] },
      { pos: 0.2, color: [100, 0, 0] },
      { pos: 0.45, color: [220, 50, 0] },
      { pos: 0.7, color: [255, 180, 30] },
      { pos: 0.9, color: [255, 240, 120] },
      { pos: 1.0, color: [255, 255, 255] },
    ],
  },
  { // 10 - A# - Rose
    name: 'A\u266F',
    stops: [
      { pos: 0.0, color: [8, 0, 2] },
      { pos: 0.2, color: [75, 0, 30] },
      { pos: 0.5, color: [220, 40, 100] },
      { pos: 0.8, color: [255, 150, 185] },
      { pos: 1.0, color: [255, 238, 242] },
    ],
  },
  { // 11 - B - Fuchsia
    name: 'B',
    stops: [
      { pos: 0.0, color: [8, 0, 5] },
      { pos: 0.2, color: [65, 0, 45] },
      { pos: 0.5, color: [200, 20, 130] },
      { pos: 0.8, color: [240, 135, 205] },
      { pos: 1.0, color: [255, 238, 248] },
    ],
  },
];

function samplePalette(palette: PaletteDef, pos: number): RGB {
  const stops = palette.stops;
  let s0 = stops[0], s1 = stops[stops.length - 1];
  for (let j = 0; j < stops.length - 1; j++) {
    if (pos >= stops[j].pos && pos <= stops[j + 1].pos) {
      s0 = stops[j]; s1 = stops[j + 1]; break;
    }
  }
  const range = s1.pos - s0.pos;
  const f = range === 0 ? 0 : (pos - s0.pos) / range;
  return [
    Math.round(s0.color[0] + (s1.color[0] - s0.color[0]) * f),
    Math.round(s0.color[1] + (s1.color[1] - s0.color[1]) * f),
    Math.round(s0.color[2] + (s1.color[2] - s0.color[2]) * f),
  ];
}

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

const BASE_RANGE = 4.0;
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
let fractalType = 0;  // 0=Julia, 1=Cubic, 2=Quartic, 3=BurningShip, 4=Tricorn, 5=Phoenix, 6=Celtic, 7=Lambda, 8=PerpBurn, 9=Buffalo
let phoenixP = -0.5;

// Melody/bass palette LUTs — blended into fractal by vertical position
const melodyLUT = new Uint8Array(LUT_SIZE * 3);
const bassLUT = new Uint8Array(LUT_SIZE * 3);
let melodyStrength = 0;
let bassStrength = 0;
let currentMelodyPc = -1;
let currentBassPc = -1;

// Melody/bass light colors — for background glow projection
let melodyLight: RGB = [0, 0, 0];
let bassLight: RGB = [0, 0, 0];

buildColorLUT(palettes[currentPaletteIndex]);
lutA.set(colorLUT);
lutB.set(colorLUT);
melodyLUT.set(colorLUT);
bassLUT.set(colorLUT);

export const fractalEngine = {
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

  setPalette(index: number) {
    if (index !== currentPaletteIndex && index >= 0 && index < palettes.length) {
      lutA.set(colorLUT);
      buildLUTInto(lutB, palettes[index]);
      lutBlend = 0;
      currentPaletteIndex = index;
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
  },

  setNoteTints(melodyPitchClass: number, melodyVel: number, bassPitchClass: number, bassVel: number) {
    if (melodyPitchClass >= 0) {
      if (melodyPitchClass !== currentMelodyPc) {
        currentMelodyPc = melodyPitchClass;
        buildLUTInto(melodyLUT, palettes[melodyPitchClass % 12]);
        melodyLight = samplePalette(palettes[melodyPitchClass % 12], 0.6);
      }
      melodyStrength = melodyVel;
    }
    if (bassPitchClass >= 0) {
      if (bassPitchClass !== currentBassPc) {
        currentBassPc = bassPitchClass;
        buildLUTInto(bassLUT, palettes[bassPitchClass % 12]);
        bassLight = samplePalette(palettes[bassPitchClass % 12], 0.5);
      }
      bassStrength = bassVel;
    }
  },

  decayTints(dt: number) {
    const rate = Math.exp(-dt / 0.9);
    melodyStrength *= rate;
    bassStrength *= rate;
  },

  setFractalType(type: number, p?: number) {
    fractalType = type;
    if (p !== undefined) phoenixP = p;
  },

  getFractalType() { return fractalType; },

  getCReal() { return cReal; },
  getCImag() { return cImag; },
  getZoom() { return zoom; },
  getMaxIterations() { return maxIterations; },
  getFidelity() { return fidelity; },
  getPaletteIndex() { return currentPaletteIndex; },

  render(canvas: HTMLCanvasElement, displayWidth: number, displayHeight: number) {
    const ctx = canvas.getContext('2d')!;
    const w = Math.max(1, Math.floor(displayWidth * fidelity));
    const h = Math.max(1, Math.floor(displayHeight * fidelity));
    offscreen.width = w;
    offscreen.height = h;

    const imageData = offCtx.createImageData(w, h);
    const data32 = new Uint32Array(imageData.data.buffer);

    const rangeW = BASE_RANGE / zoom;
    const rangeH = rangeW * (h / w);
    const xMin = centerX - rangeW / 2;
    const yMin = centerY - rangeH / 2;
    const stepX = rangeW / w;
    const stepY = rangeH / h;

    const jR = cReal;
    const jI = cImag;
    const maxIter = maxIterations;
    const invMaxIter = 1 / maxIter;
    const logD = fractalType === 1 ? Math.log(3) : fractalType === 2 ? Math.log(4) : Math.log(2);
    const fType = fractalType;
    const pP = phoenixP;
    const lutMax = LUT_SIZE - 1;

    // Precompute per-row weights
    const invH = 1 / (h - 1);
    const mStr = melodyStrength;
    const bStr = bassStrength;
    const mlR = melodyLight[0], mlG = melodyLight[1], mlB = melodyLight[2];
    const blR = bassLight[0], blG = bassLight[1], blB = bassLight[2];

    for (let py = 0; py < h; py++) {
      const fy = yMin + py * stepY;
      const ny = py * invH; // 0=top, 1=bottom

      // Fractal palette blend: melody strongest at top, bass at bottom
      const mw = mStr * Math.max(0, 1 - ny * 1.3) * 0.85;
      const bw = bStr * Math.max(0, 1 - (1 - ny) * 1.7) * 0.7;
      const cw = Math.max(0, 1 - mw - bw);

      // Background light projection: soft glow on dark/empty areas
      // Broader and gentler than the fractal blend
      const mGlow = mStr * Math.max(0, 1 - ny * 1.2) * 0.18;
      const bGlow = bStr * Math.max(0, 1 - (1 - ny) * 1.4) * 0.12;

      for (let px = 0; px < w; px++) {
        const fx = xMin + px * stepX;

        let x = fx, y = fy;
        let x2 = x * x, y2 = y * y;
        let iteration = 0;
        let prevX = 0, prevY = 0;

        const bailout = fType === 7 ? 100.0 : 4.0;
        while (x2 + y2 <= bailout && iteration < maxIter) {
          let nx: number, ny: number;
          switch (fType) {
            case 1: // z³ + c
              nx = x * x2 - 3 * x * y2 + jR;
              ny = 3 * x2 * y - y * y2 + jI;
              break;
            case 2: // z⁴ + c
              nx = x2 * x2 - 6 * x2 * y2 + y2 * y2 + jR;
              ny = 4 * x * y * (x2 - y2) + jI;
              break;
            case 3: { // Burning Ship
              const ax = Math.abs(x), ay = Math.abs(y);
              nx = ax * ax - ay * ay + jR;
              ny = 2 * ax * ay + jI;
              break;
            }
            case 4: // Tricorn
              nx = x2 - y2 + jR;
              ny = -2 * x * y + jI;
              break;
            case 5: // Phoenix
              nx = x2 - y2 + jR + pP * prevX;
              ny = 2 * x * y + jI + pP * prevY;
              prevX = x; prevY = y;
              break;
            case 6: // Celtic: |Re(z²)| + i·Im(z²) + c
              nx = Math.abs(x2 - y2) + jR;
              ny = 2 * x * y + jI;
              break;
            case 8: { // PerpBurn: x² - |y|² + cR, 2x|y| + cI
              const ay = Math.abs(y);
              nx = x2 - ay * ay + jR;
              ny = 2 * x * ay + jI;
              break;
            }
            case 9: { // Buffalo: (|Re|+i|Im|)² - (|Re|+i|Im|) + c
              const ax = Math.abs(x), ay = Math.abs(y);
              const zr = ax * ax - ay * ay, zi = 2 * ax * ay;
              nx = zr - ax + jR;
              ny = zi - ay + jI;
              break;
            }
            case 7: { // Lambda: c·z·(1-z)
              const omx = 1 - x, omy = -y;
              const pr = x * omx - y * omy;
              const pi = x * omy + y * omx;
              nx = jR * pr - jI * pi;
              ny = jR * pi + jI * pr;
              break;
            }
            default: // z² + c
              nx = x2 - y2 + jR;
              ny = 2 * x * y + jI;
              break;
          }
          x = nx; y = ny;
          x2 = x * x; y2 = y * y;
          iteration++;
        }

        let r: number, g: number, b: number;
        if (iteration === maxIter) {
          // Interior: dark tint from blended palettes
          const mag2 = x2 + y2;
          const t = mag2 < 4 ? mag2 * 0.25 : 1;
          let li = ((0.7 - t * 0.3) * lutMax) | 0;
          if (li < 0) li = 0;
          const lutIdx = li * 3;
          r = (colorLUT[lutIdx] * cw + melodyLUT[lutIdx] * mw + bassLUT[lutIdx] * bw) * 0.35;
          g = (colorLUT[lutIdx + 1] * cw + melodyLUT[lutIdx + 1] * mw + bassLUT[lutIdx + 1] * bw) * 0.35;
          b = (colorLUT[lutIdx + 2] * cw + melodyLUT[lutIdx + 2] * mw + bassLUT[lutIdx + 2] * bw) * 0.35;

          // Light projection fills interior more — additive glow
          r += mlR * mGlow * 2.5 + blR * bGlow * 2.5;
          g += mlG * mGlow * 2.5 + blG * bGlow * 2.5;
          b += mlB * mGlow * 2.5 + blB * bGlow * 2.5;
        } else {
          const logMag = Math.log(x2 + y2);
          const smoothed = logMag > 0
            ? iteration + 1 - Math.log(0.5 * logMag) / logD
            : iteration;
          let li = smoothed > 0 ? ((smoothed * invMaxIter * lutMax) | 0) : 0;
          if (li > lutMax) li = lutMax;
          const lutIdx = li * 3;
          r = colorLUT[lutIdx] * cw + melodyLUT[lutIdx] * mw + bassLUT[lutIdx] * bw;
          g = colorLUT[lutIdx + 1] * cw + melodyLUT[lutIdx + 1] * mw + bassLUT[lutIdx + 1] * bw;
          b = colorLUT[lutIdx + 2] * cw + melodyLUT[lutIdx + 2] * mw + bassLUT[lutIdx + 2] * bw;

          // Subtle light wash on exterior — fades with iteration (bright near edge)
          const edgeFade = Math.max(0, 1 - smoothed * invMaxIter * 3);
          r += mlR * mGlow * edgeFade + blR * bGlow * edgeFade;
          g += mlG * mGlow * edgeFade + blG * bGlow * edgeFade;
          b += mlB * mGlow * edgeFade + blB * bGlow * edgeFade;
        }

        const oR = r > 0 ? (r < 255 ? r | 0 : 255) : 0;
        const oG = g > 0 ? (g < 255 ? g | 0 : 255) : 0;
        const oB = b > 0 ? (b < 255 ? b | 0 : 255) : 0;
        data32[py * w + px] = 0xFF000000 | (oB << 16) | (oG << 8) | oR;
      }
    }

    offCtx.putImageData(imageData, 0, 0);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(offscreen, 0, 0, displayWidth, displayHeight);
  },
};
