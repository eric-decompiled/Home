import './style.css';

// --- Color Palettes ---

type RGB = [number, number, number];
interface PaletteDef {
  name: string;
  stops: { pos: number; color: RGB }[];
}

const palettes: PaletteDef[] = [
  {
    name: 'Ocean',
    stops: [
      { pos: 0.0, color: [0, 7, 30] },
      { pos: 0.2, color: [0, 40, 100] },
      { pos: 0.5, color: [0, 120, 190] },
      { pos: 0.75, color: [80, 200, 255] },
      { pos: 1.0, color: [240, 250, 255] },
    ],
  },
  {
    name: 'Fire',
    stops: [
      { pos: 0.0, color: [0, 0, 0] },
      { pos: 0.2, color: [100, 0, 0] },
      { pos: 0.45, color: [220, 50, 0] },
      { pos: 0.7, color: [255, 180, 30] },
      { pos: 0.9, color: [255, 240, 120] },
      { pos: 1.0, color: [255, 255, 255] },
    ],
  },
  {
    name: 'Neon',
    stops: [
      { pos: 0.0, color: [0, 0, 0] },
      { pos: 0.25, color: [80, 0, 160] },
      { pos: 0.5, color: [220, 0, 180] },
      { pos: 0.75, color: [0, 200, 255] },
      { pos: 1.0, color: [255, 255, 255] },
    ],
  },
  {
    name: 'Mono',
    stops: [
      { pos: 0.0, color: [0, 0, 0] },
      { pos: 1.0, color: [255, 255, 255] },
    ],
  },
  {
    name: 'Emerald',
    stops: [
      { pos: 0.0, color: [0, 0, 0] },
      { pos: 0.25, color: [0, 30, 20] },
      { pos: 0.5, color: [22, 199, 154] },
      { pos: 0.8, color: [120, 255, 220] },
      { pos: 1.0, color: [255, 255, 255] },
    ],
  },
];

const LUT_SIZE = 2048;
const colorLUT = new Uint8Array(LUT_SIZE * 3);

function buildColorLUT(palette: PaletteDef): void {
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
    colorLUT[idx] = Math.round(s0.color[0] + (s1.color[0] - s0.color[0]) * f);
    colorLUT[idx + 1] = Math.round(s0.color[1] + (s1.color[1] - s0.color[1]) * f);
    colorLUT[idx + 2] = Math.round(s0.color[2] + (s1.color[2] - s0.color[2]) * f);
  }
}

// --- Fractal family definitions ---

type FamilyId = 'mandelbrot' | 'julia' | 'tricorn' | 'phoenix';

interface FamilyDef {
  name: string;
  desc: string;
  defaultCenter: [number, number];
}

const families: Record<FamilyId, FamilyDef> = {
  'mandelbrot': {
    name: 'Mandelbrot',
    desc: 'The Mandelbrot set: z = z&sup2; + c. Its boundary reveals infinitely complex, self-similar structures.',
    defaultCenter: [-0.5, 0],
  },
  'julia': {
    name: 'Julia Set',
    desc: 'Each point is tested as a starting value z for a fixed c. Adjust the c parameters or enable orbit sweep to watch the fractal morph continuously.',
    defaultCenter: [0, 0],
  },
  'tricorn': {
    name: 'Tricorn',
    desc: 'The Tricorn (Mandelbar): z = conj(z)&sup2; + c. Using the complex conjugate produces three-fold symmetry and distinctive horn-like protrusions.',
    defaultCenter: [-0.3, 0],
  },
  'phoenix': {
    name: 'Phoenix',
    desc: 'z<sub>n+1</sub> = z<sub>n</sub>&sup2; + Re(c) + Im(c)&middot;z<sub>n-1</sub>. The feedback from the previous iteration creates feather-like detail and flowing organic forms.',
    defaultCenter: [0, 0],
  },
};

const familyIds: FamilyId[] = ['mandelbrot', 'julia', 'tricorn', 'phoenix'];

// --- State ---

let centerX = -0.5;
let centerY = 0.0;
let zoom = 1.0;
const BASE_RANGE = 4.0;

let fractalFamily: FamilyId = 'mandelbrot';
let maxIterations = 100;
let fidelity = 1.0;
let smoothUpscale = true;
let currentPalette = 0;

// Julia c parameters (only used by 'julia' family)
let juliaReal = -0.7;
let juliaImag = 0.27015;

// Phoenix distortion
let phoenixP = 0.5;

// Julia orbit sweep animation
let animatingJulia = false;
let juliaSweepAngle = 0;
let juliaSweepSpeed = 0.5;
let juliaSweepRadius = 0.2;
let juliaSweepCenterR = -0.1;
let juliaSweepCenterI = 0.75;

// Phoenix distortion animation
let animatingPhoenix = false;
let phoenixSweepAngle = 0;
let phoenixSweepSpeed = 0.4;
let phoenixSweepCenter = 0.0;
let phoenixSweepAmplitude = 0.5;

let lastTime = 0;
let dirty = true;
let displayWidth = 800;
let displayHeight = 600;

let isDragging = false;
let wasDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragCenterX = 0;
let dragCenterY = 0;

// --- HTML ---

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="container">
    <div class="sidebar left">
      <div class="info">
        <h2>Fractal Explorer</h2>
        <p id="fractal-desc">${families['mandelbrot'].desc}</p>
        <h3>Position</h3>
        <div class="coord-row">
          <span class="coord-label">Center X</span>
          <span class="coord-value" id="info-cx">-0.500000</span>
        </div>
        <div class="coord-row">
          <span class="coord-label">Center Y</span>
          <span class="coord-value" id="info-cy">0.000000</span>
        </div>
        <div class="coord-row">
          <span class="coord-label">Zoom</span>
          <span class="coord-value" id="info-zoom">1.0x</span>
        </div>
        <div class="shortcuts">
          <h3>Controls</h3>
          <ul>
            <li><kbd>Click</kbd> Zoom in at point</li>
            <li><kbd>Shift+Click</kbd> Zoom out</li>
            <li><kbd>Right Click</kbd> Zoom out</li>
            <li><kbd>Drag</kbd> Pan view</li>
            <li><kbd>Scroll</kbd> Zoom in/out</li>
          </ul>
        </div>
      </div>
    </div>

    <canvas id="canvas"></canvas>

    <div class="sidebar right">
      <div class="controls">
        <div class="control-group">
          <label>Fractal</label>
          <div class="family-grid" id="family-grid"></div>
        </div>

        <div class="control-group">
          <label>Pixel Fidelity: <span id="fidelity-val">1.00x</span></label>
          <input type="range" id="fidelity" min="0.05" max="1" step="0.05" value="1">
        </div>

        <div class="control-group">
          <label class="checkbox-label">
            <input type="checkbox" id="smooth-upscale" checked>
            <span>Smooth upscale (bilinear)</span>
          </label>
        </div>

        <div class="control-group">
          <label>Max Iterations: <span id="iterations-val">100</span></label>
          <input type="range" id="iterations" min="50" max="2000" step="10" value="100">
        </div>

        <div class="control-group">
          <label>Color Palette</label>
          <div class="palette-grid" id="palette-grid"></div>
        </div>

        <!-- Phoenix distortion controls -->
        <div class="extra-controls hidden" id="phoenix-controls">
          <div class="control-group">
            <label>Distortion (p): <span id="phoenix-p-val">0.50</span></label>
            <input type="range" id="phoenix-p" min="-1" max="1" step="0.01" value="0.5">
          </div>
          <div class="control-group">
            <label class="checkbox-label">
              <input type="checkbox" id="animate-phoenix">
              <span>Animate distortion</span>
            </label>
          </div>
          <div class="animate-controls hidden" id="phoenix-animate-controls">
            <div class="control-group">
              <label>Speed: <span id="phoenix-speed-val">0.40</span></label>
              <input type="range" id="phoenix-speed" min="0.05" max="2" step="0.05" value="0.4">
            </div>
            <div class="control-group">
              <label>Amplitude: <span id="phoenix-amp-val">0.50</span></label>
              <input type="range" id="phoenix-amp" min="0.05" max="1" step="0.05" value="0.5">
            </div>
          </div>
        </div>

        <!-- Julia c controls (only for julia family) -->
        <div class="julia-controls hidden" id="julia-controls">
          <div class="control-group">
            <label>c (real): <span id="julia-real-val">-0.700</span></label>
            <input type="range" id="julia-real" min="-2" max="2" step="0.001" value="-0.7">
          </div>
          <div class="control-group">
            <label>c (imag): <span id="julia-imag-val">0.270</span></label>
            <input type="range" id="julia-imag" min="-2" max="2" step="0.001" value="0.27015">
          </div>
          <div class="control-group">
            <label class="checkbox-label">
              <input type="checkbox" id="animate-julia">
              <span>Animate (orbit sweep)</span>
            </label>
          </div>
          <div class="animate-controls hidden" id="julia-animate-controls">
            <div class="control-group">
              <label>Sweep Speed: <span id="sweep-speed-val">0.50</span></label>
              <input type="range" id="sweep-speed" min="0.05" max="3" step="0.05" value="0.5">
            </div>
            <div class="control-group">
              <label>Sweep Radius: <span id="sweep-radius-val">0.200</span></label>
              <input type="range" id="sweep-radius" min="0.01" max="1" step="0.01" value="0.2">
            </div>
          </div>
        </div>

        <button class="reset-btn" id="reset-btn">Reset View</button>
      </div>
    </div>
  </div>
`;

// --- DOM References ---

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const offscreen = document.createElement('canvas');
const offCtx = offscreen.getContext('2d')!;

const fidelitySlider = document.getElementById('fidelity') as HTMLInputElement;
const fidelityVal = document.getElementById('fidelity-val')!;
const smoothCheckbox = document.getElementById('smooth-upscale') as HTMLInputElement;
const iterSlider = document.getElementById('iterations') as HTMLInputElement;
const iterVal = document.getElementById('iterations-val')!;

// Julia controls
const juliaRealSlider = document.getElementById('julia-real') as HTMLInputElement;
const juliaRealVal = document.getElementById('julia-real-val')!;
const juliaImagSlider = document.getElementById('julia-imag') as HTMLInputElement;
const juliaImagVal = document.getElementById('julia-imag-val')!;
const juliaControlsDiv = document.getElementById('julia-controls')!;
const animateJuliaCheckbox = document.getElementById('animate-julia') as HTMLInputElement;
const juliaAnimateControlsDiv = document.getElementById('julia-animate-controls')!;
const sweepSpeedSlider = document.getElementById('sweep-speed') as HTMLInputElement;
const sweepSpeedVal = document.getElementById('sweep-speed-val')!;
const sweepRadiusSlider = document.getElementById('sweep-radius') as HTMLInputElement;
const sweepRadiusVal = document.getElementById('sweep-radius-val')!;

// Phoenix controls
const phoenixControlsDiv = document.getElementById('phoenix-controls')!;
const phoenixPSlider = document.getElementById('phoenix-p') as HTMLInputElement;
const phoenixPVal = document.getElementById('phoenix-p-val')!;
const animatePhoenixCheckbox = document.getElementById('animate-phoenix') as HTMLInputElement;
const phoenixAnimateControlsDiv = document.getElementById('phoenix-animate-controls')!;
const phoenixSpeedSlider = document.getElementById('phoenix-speed') as HTMLInputElement;
const phoenixSpeedVal = document.getElementById('phoenix-speed-val')!;
const phoenixAmpSlider = document.getElementById('phoenix-amp') as HTMLInputElement;
const phoenixAmpVal = document.getElementById('phoenix-amp-val')!;

const resetBtn = document.getElementById('reset-btn')!;
const paletteGrid = document.getElementById('palette-grid')!;
const familyGrid = document.getElementById('family-grid')!;

const infoCx = document.getElementById('info-cx')!;
const infoCy = document.getElementById('info-cy')!;
const infoZoom = document.getElementById('info-zoom')!;
const fractalDesc = document.getElementById('fractal-desc')!;

// --- Family buttons ---

const familyBtns: HTMLButtonElement[] = [];
familyIds.forEach((id) => {
  const btn = document.createElement('button');
  btn.className = 'family-btn' + (id === fractalFamily ? ' active' : '');
  btn.textContent = families[id].name;
  btn.dataset.family = id;
  btn.addEventListener('click', () => selectFamily(id));
  familyGrid.appendChild(btn);
  familyBtns.push(btn);
});

// --- Palette buttons ---

function createPaletteGradient(palette: PaletteDef): string {
  const stops = palette.stops.map(
    (s) => `rgb(${s.color[0]},${s.color[1]},${s.color[2]}) ${s.pos * 100}%`
  );
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

palettes.forEach((p, i) => {
  const btn = document.createElement('button');
  btn.className = 'palette-btn' + (i === 0 ? ' active' : '');
  btn.style.background = createPaletteGradient(p);
  btn.title = p.name;
  btn.addEventListener('click', () => {
    currentPalette = i;
    buildColorLUT(palettes[currentPalette]);
    document.querySelectorAll('.palette-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    dirty = true;
  });
  paletteGrid.appendChild(btn);
});

buildColorLUT(palettes[currentPalette]);

// --- Canvas sizing ---

function resizeCanvas(): void {
  const maxWidth = Math.min(800, window.innerWidth - 40);
  displayWidth = maxWidth;
  displayHeight = Math.round(maxWidth * 3 / 4);
  canvas.width = displayWidth;
  canvas.height = displayHeight;
  dirty = true;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// --- Fractal rendering ---
// Iteration is inlined into renderFractal to avoid per-pixel tuple allocation
// and function call overhead. Polar-form fractals use exp(d/2 * log(r²)) to
// skip the sqrt, and fast paths handle common integer powers with direct
// complex multiplication.

function renderFractal(): void {
  const w = Math.max(1, Math.floor(displayWidth * fidelity));
  const h = Math.max(1, Math.floor(displayHeight * fidelity));
  offscreen.width = w;
  offscreen.height = h;

  const imageData = offCtx.createImageData(w, h);
  const data = imageData.data;

  const rangeW = BASE_RANGE / zoom;
  const rangeH = rangeW * (h / w);
  const xMin = centerX - rangeW / 2;
  const yMin = centerY - rangeH / 2;
  const stepX = rangeW / w;
  const stepY = rangeH / h;

  const jR = juliaReal;
  const jI = juliaImag;
  const maxIter = maxIterations;
  const log2 = Math.log(2);
  const isJulia = fractalFamily === 'julia';
  const family = fractalFamily;
  const p = phoenixP;
  const lutMax = LUT_SIZE - 1;

  for (let py = 0; py < h; py++) {
    const fy = yMin + py * stepY;
    for (let px = 0; px < w; px++) {
      const fx = xMin + px * stepX;

      let x: number, y: number, cx: number, cy: number;
      if (isJulia) {
        x = fx; y = fy; cx = jR; cy = jI;
      } else {
        x = 0; y = 0; cx = fx; cy = fy;
      }

      let x2 = x * x, y2 = y * y;
      let iteration = 0;

      switch (family) {
        case 'mandelbrot':
        case 'julia': {
          while (x2 + y2 <= 4.0 && iteration < maxIter) {
            y = 2 * x * y + cy;
            x = x2 - y2 + cx;
            x2 = x * x;
            y2 = y * y;
            iteration++;
          }
          break;
        }
        case 'tricorn': {
          while (x2 + y2 <= 4.0 && iteration < maxIter) {
            y = -2 * x * y + cy;
            x = x2 - y2 + cx;
            x2 = x * x;
            y2 = y * y;
            iteration++;
          }
          break;
        }
        case 'phoenix': {
          let prevX = 0, prevY = 0;
          while (x2 + y2 <= 4.0 && iteration < maxIter) {
            const newX = x2 - y2 + cx + p * prevX;
            const newY = 2 * x * y + p * prevY;
            prevX = x;
            prevY = y;
            x = newX;
            y = newY;
            x2 = x * x;
            y2 = y * y;
            iteration++;
          }
          break;
        }
      }

      const idx = (py * w + px) * 4;

      if (iteration === maxIter) {
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
      } else {
        // Smooth coloring: use 0.5*log(r²) instead of log(sqrt(r²))
        const smoothed = iteration + 1 - Math.log(0.5 * Math.log(x2 + y2)) / log2;
        const t = smoothed > 0 ? (smoothed < maxIter ? smoothed / maxIter : 1) : 0;
        const lutIdx = (t * lutMax | 0) * 3;
        data[idx] = colorLUT[lutIdx];
        data[idx + 1] = colorLUT[lutIdx + 1];
        data[idx + 2] = colorLUT[lutIdx + 2];
      }
      data[idx + 3] = 255;
    }
  }

  offCtx.putImageData(imageData, 0, 0);
}

// --- Display ---

function updateInfoPanel(): void {
  infoCx.textContent = centerX.toFixed(6);
  infoCy.textContent = centerY.toFixed(6);
  infoZoom.textContent = zoom >= 1000
    ? zoom.toExponential(1) + 'x'
    : zoom.toFixed(1) + 'x';
}

function draw(): void {
  if (!dirty) return;
  dirty = false;

  renderFractal();

  ctx.imageSmoothingEnabled = smoothUpscale;
  if (smoothUpscale) {
    ctx.imageSmoothingQuality = 'high';
  }
  ctx.drawImage(offscreen, 0, 0, displayWidth, displayHeight);

  updateInfoPanel();
}

// --- Animation loop ---

function loop(time: number): void {
  const dt = lastTime === 0 ? 0 : (time - lastTime) / 1000;
  lastTime = time;

  if (animatingJulia && fractalFamily === 'julia') {
    juliaSweepAngle += juliaSweepSpeed * dt;
    juliaReal = juliaSweepCenterR + juliaSweepRadius * Math.cos(juliaSweepAngle);
    juliaImag = juliaSweepCenterI + juliaSweepRadius * Math.sin(juliaSweepAngle);
    juliaRealSlider.value = String(juliaReal);
    juliaImagSlider.value = String(juliaImag);
    juliaRealVal.textContent = juliaReal.toFixed(3);
    juliaImagVal.textContent = juliaImag.toFixed(3);
    dirty = true;
  }

  if (animatingPhoenix && fractalFamily === 'phoenix') {
    phoenixSweepAngle += phoenixSweepSpeed * dt;
    phoenixP = phoenixSweepCenter + phoenixSweepAmplitude * Math.sin(phoenixSweepAngle);
    phoenixP = Math.max(-1, Math.min(1, phoenixP));
    phoenixPSlider.value = String(phoenixP);
    phoenixPVal.textContent = phoenixP.toFixed(2);
    dirty = true;
  }

  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// --- Pixel-to-fractal coordinate conversion ---

function pixelToFractal(px: number, py: number): [number, number] {
  const rangeW = BASE_RANGE / zoom;
  const rangeH = rangeW * (displayHeight / displayWidth);
  const fx = centerX - rangeW / 2 + (px / displayWidth) * rangeW;
  const fy = centerY - rangeH / 2 + (py / displayHeight) * rangeH;
  return [fx, fy];
}

// --- Mouse interaction ---

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    isDragging = true;
    wasDragging = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragCenterX = centerX;
    dragCenterY = centerY;
    canvas.classList.add('dragging');
  }
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    wasDragging = true;
  }
  const rangeW = BASE_RANGE / zoom;
  const rangeH = rangeW * (displayHeight / displayWidth);
  centerX = dragCenterX - (dx / displayWidth) * rangeW;
  centerY = dragCenterY - (dy / displayHeight) * rangeH;
  dirty = true;
});

window.addEventListener('mouseup', () => {
  isDragging = false;
  canvas.classList.remove('dragging');
});

canvas.addEventListener('click', (e) => {
  if (wasDragging) return;
  const rect = canvas.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (displayWidth / rect.width);
  const py = (e.clientY - rect.top) * (displayHeight / rect.height);
  const [fx, fy] = pixelToFractal(px, py);

  if (e.shiftKey) {
    centerX = fx;
    centerY = fy;
    zoom /= 2;
  } else {
    centerX = fx;
    centerY = fy;
    zoom *= 2;
  }
  dirty = true;
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (displayWidth / rect.width);
  const py = (e.clientY - rect.top) * (displayHeight / rect.height);
  const [fx, fy] = pixelToFractal(px, py);
  centerX = fx;
  centerY = fy;
  zoom /= 2;
  dirty = true;
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (displayWidth / rect.width);
  const py = (e.clientY - rect.top) * (displayHeight / rect.height);
  const [fx, fy] = pixelToFractal(px, py);

  const factor = e.deltaY < 0 ? 1.3 : 1 / 1.3;

  const newZoom = zoom * factor;
  const newRangeW = BASE_RANGE / newZoom;
  const newRangeH = newRangeW * (displayHeight / displayWidth);
  const cursorFracX = (px / displayWidth);
  const cursorFracY = (py / displayHeight);

  centerX = fx - (cursorFracX - 0.5) * newRangeW;
  centerY = fy - (cursorFracY - 0.5) * newRangeH;
  zoom = newZoom;
  dirty = true;
}, { passive: false });

// --- Family switching ---

function stopAllAnimations(): void {
  animatingJulia = false;
  animateJuliaCheckbox.checked = false;
  juliaAnimateControlsDiv.classList.add('hidden');
  juliaRealSlider.disabled = false;
  juliaImagSlider.disabled = false;

  animatingPhoenix = false;
  animatePhoenixCheckbox.checked = false;
  phoenixAnimateControlsDiv.classList.add('hidden');
  phoenixPSlider.disabled = false;
}

function updateFamilyUI(): void {
  const def = families[fractalFamily];
  fractalDesc.innerHTML = def.desc;

  // Show/hide family-specific controls
  juliaControlsDiv.classList.toggle('hidden', fractalFamily !== 'julia');
  phoenixControlsDiv.classList.toggle('hidden', fractalFamily !== 'phoenix');

  // Update family buttons
  familyBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.family === fractalFamily);
  });
}

function selectFamily(id: FamilyId): void {
  if (id === fractalFamily) return;
  stopAllAnimations();
  fractalFamily = id;
  const def = families[id];
  centerX = def.defaultCenter[0];
  centerY = def.defaultCenter[1];
  zoom = 1;

  updateFamilyUI();
  dirty = true;
}

// --- Control event listeners ---

fidelitySlider.addEventListener('input', () => {
  fidelity = parseFloat(fidelitySlider.value);
  fidelityVal.textContent = fidelity.toFixed(2) + 'x';
  dirty = true;
});

smoothCheckbox.addEventListener('change', () => {
  smoothUpscale = smoothCheckbox.checked;
  dirty = true;
});

iterSlider.addEventListener('input', () => {
  maxIterations = parseInt(iterSlider.value);
  iterVal.textContent = maxIterations.toString();
  dirty = true;
});

// Julia c sliders
juliaRealSlider.addEventListener('input', () => {
  juliaReal = parseFloat(juliaRealSlider.value);
  juliaRealVal.textContent = juliaReal.toFixed(3);
  dirty = true;
});

juliaImagSlider.addEventListener('input', () => {
  juliaImag = parseFloat(juliaImagSlider.value);
  juliaImagVal.textContent = juliaImag.toFixed(3);
  dirty = true;
});

// Julia orbit sweep
animateJuliaCheckbox.addEventListener('change', () => {
  animatingJulia = animateJuliaCheckbox.checked;
  if (animatingJulia) {
    juliaSweepCenterR = juliaReal;
    juliaSweepCenterI = juliaImag;
    juliaSweepAngle = 0;
    juliaAnimateControlsDiv.classList.remove('hidden');
    juliaRealSlider.disabled = true;
    juliaImagSlider.disabled = true;
  } else {
    juliaAnimateControlsDiv.classList.add('hidden');
    juliaRealSlider.disabled = false;
    juliaImagSlider.disabled = false;
  }
});

sweepSpeedSlider.addEventListener('input', () => {
  juliaSweepSpeed = parseFloat(sweepSpeedSlider.value);
  sweepSpeedVal.textContent = juliaSweepSpeed.toFixed(2);
});

sweepRadiusSlider.addEventListener('input', () => {
  juliaSweepRadius = parseFloat(sweepRadiusSlider.value);
  sweepRadiusVal.textContent = juliaSweepRadius.toFixed(3);
});

// Phoenix distortion
phoenixPSlider.addEventListener('input', () => {
  phoenixP = parseFloat(phoenixPSlider.value);
  phoenixPVal.textContent = phoenixP.toFixed(2);
  dirty = true;
});

animatePhoenixCheckbox.addEventListener('change', () => {
  animatingPhoenix = animatePhoenixCheckbox.checked;
  if (animatingPhoenix) {
    phoenixSweepCenter = phoenixP;
    phoenixSweepAngle = 0;
    phoenixAnimateControlsDiv.classList.remove('hidden');
    phoenixPSlider.disabled = true;
  } else {
    phoenixAnimateControlsDiv.classList.add('hidden');
    phoenixPSlider.disabled = false;
  }
});

phoenixSpeedSlider.addEventListener('input', () => {
  phoenixSweepSpeed = parseFloat(phoenixSpeedSlider.value);
  phoenixSpeedVal.textContent = phoenixSweepSpeed.toFixed(2);
});

phoenixAmpSlider.addEventListener('input', () => {
  phoenixSweepAmplitude = parseFloat(phoenixAmpSlider.value);
  phoenixAmpVal.textContent = phoenixSweepAmplitude.toFixed(2);
});

// Reset
resetBtn.addEventListener('click', () => {
  stopAllAnimations();
  const def = families[fractalFamily];
  centerX = def.defaultCenter[0];
  centerY = def.defaultCenter[1];
  zoom = 1;

  if (fractalFamily === 'julia') {
    juliaReal = -0.7;
    juliaImag = 0.27015;
    juliaRealSlider.value = String(juliaReal);
    juliaImagSlider.value = String(juliaImag);
    juliaRealVal.textContent = juliaReal.toFixed(3);
    juliaImagVal.textContent = juliaImag.toFixed(3);
  }

  if (fractalFamily === 'phoenix') {
    phoenixP = 0.5;
    phoenixPSlider.value = String(phoenixP);
    phoenixPVal.textContent = phoenixP.toFixed(2);
  }

  dirty = true;
});
