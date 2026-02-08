/**
 * Fractal Configuration Panel
 *
 * Interactive editor for fractal anchor points per harmonic degree.
 * Each anchor defines a c-plane position and 4 orbit offsets for beat-synchronized motion.
 */

import { loadFractalAnchors, saveFractalAnchors, type FractalAnchors, type FractalAnchor, type FractalOrbit } from './state.ts';

// --- Constants ---

const PANEL_SIZE = 500;
const LOCUS_ITER = 200;
const JULIA_SIZE = 280;
const JULIA_ITER = 180;
const LUT_SIZE = 2048;

const DEGREE_NAMES = ['0', 'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'];
const DEGREE_COLORS = ['#888', '#ff4444', '#44aaff', '#44dd88', '#ffaa22', '#ff66cc', '#88ccff', '#ffff44'];
const ORBIT_COLORS = ['#ff6666', '#66bbff', '#66ff99', '#ffcc44'];
const ORBIT_LABELS = ['1', '2', '3', '4'];

// Chord qualities (matching midi-analyzer.ts ChordQuality type)
const QUALITIES = [
  { id: 'major', label: 'M' },
  { id: 'minor', label: 'm' },
  { id: 'dom7', label: '7' },
  { id: 'min7', label: 'm7' },
  { id: 'dim', label: '°' },
  { id: 'aug', label: '+' },
];

// --- Fractal Families ---

interface FractalFamily {
  id: string;
  label: string;
  typeNum: number;
  bounds: { rMin: number; rMax: number; iMin: number; iMax: number };
  locus: (cr: number, ci: number, maxIter: number) => number;
  julia: (fx: number, fy: number, jR: number, jI: number, maxIter: number) => number;
}

const FAMILIES: FractalFamily[] = [
  {
    id: 'burning-ship', label: 'Burning Ship', typeNum: 3,
    bounds: { rMin: -2.2, rMax: 1.2, iMin: -2.0, iMax: 0.8 },
    locus(cr, ci, maxIter) {
      let x = 0, y = 0;
      for (let i = 0; i < maxIter; i++) {
        const ax = Math.abs(x), ay = Math.abs(y);
        x = ax * ax - ay * ay + cr;
        y = 2 * ax * ay + ci;
        if (x * x + y * y > 100) return i + 1;
      }
      return 0;
    },
    julia(fx, fy, jR, jI, maxIter) {
      let x = fx, y = fy;
      for (let i = 0; i < maxIter; i++) {
        const ax = Math.abs(x), ay = Math.abs(y);
        x = ax * ax - ay * ay + jR;
        y = 2 * ax * ay + jI;
        if (x * x + y * y > 4) return i + 1;
      }
      return 0;
    },
  },
  {
    id: 'buffalo', label: 'Buffalo', typeNum: 9,
    bounds: { rMin: -1.6, rMax: 1.4, iMin: -1.4, iMax: 1.4 },
    locus(cr, ci, maxIter) {
      let x = 0, y = 0;
      for (let i = 0; i < maxIter; i++) {
        const ax = Math.abs(x), ay = Math.abs(y);
        x = ax * ax - ay * ay - ax + cr;
        y = 2 * ax * ay - ay + ci;
        if (x * x + y * y > 100) return i + 1;
      }
      return 0;
    },
    julia(fx, fy, jR, jI, maxIter) {
      let x = fx, y = fy;
      for (let i = 0; i < maxIter; i++) {
        const ax = Math.abs(x), ay = Math.abs(y);
        x = ax * ax - ay * ay - ax + jR;
        y = 2 * ax * ay - ay + jI;
        if (x * x + y * y > 4) return i + 1;
      }
      return 0;
    },
  },
  {
    id: 'celtic', label: 'Celtic', typeNum: 6,
    bounds: { rMin: -2.2, rMax: 1.5, iMin: -1.6, iMax: 1.6 },
    locus(cr, ci, maxIter) {
      let x = 0, y = 0;
      for (let i = 0; i < maxIter; i++) {
        const x2 = x * x, y2 = y * y;
        const nx = Math.abs(x2 - y2) + cr;
        const ny = 2 * x * y + ci;
        x = nx; y = ny;
        if (x * x + y * y > 100) return i + 1;
      }
      return 0;
    },
    julia(fx, fy, jR, jI, maxIter) {
      let x = fx, y = fy;
      for (let i = 0; i < maxIter; i++) {
        const x2 = x * x, y2 = y * y;
        const nx = Math.abs(x2 - y2) + jR;
        const ny = 2 * x * y + jI;
        x = nx; y = ny;
        if (x * x + y * y > 4) return i + 1;
      }
      return 0;
    },
  },
  {
    id: 'phoenix', label: 'Phoenix', typeNum: 5,
    bounds: { rMin: -2.0, rMax: 1.5, iMin: -1.5, iMax: 1.5 },
    locus(cr, ci, maxIter) {
      let x = 0, y = 0, px = 0, py = 0;
      const p = -0.5;
      for (let i = 0; i < maxIter; i++) {
        const nx = x * x - y * y + cr + p * px;
        const ny = 2 * x * y + ci + p * py;
        px = x; py = y; x = nx; y = ny;
        if (x * x + y * y > 100) return i + 1;
      }
      return 0;
    },
    julia(fx, fy, jR, jI, maxIter) {
      let x = fx, y = fy, px = 0, py = 0;
      const p = -0.5;
      for (let i = 0; i < maxIter; i++) {
        const nx = x * x - y * y + jR + p * px;
        const ny = 2 * x * y + jI + p * py;
        px = x; py = y; x = nx; y = ny;
        if (x * x + y * y > 4) return i + 1;
      }
      return 0;
    },
  },
  {
    id: 'tricorn', label: 'Tricorn', typeNum: 4,
    bounds: { rMin: -2.5, rMax: 1.5, iMin: -1.8, iMax: 1.8 },
    locus(cr, ci, maxIter) {
      let x = 0, y = 0;
      for (let i = 0; i < maxIter; i++) {
        const nx = x * x - y * y + cr;
        const ny = -2 * x * y + ci;
        x = nx; y = ny;
        if (x * x + y * y > 100) return i + 1;
      }
      return 0;
    },
    julia(fx, fy, jR, jI, maxIter) {
      let x = fx, y = fy;
      for (let i = 0; i < maxIter; i++) {
        const nx = x * x - y * y + jR;
        const ny = -2 * x * y + jI;
        x = nx; y = ny;
        if (x * x + y * y > 4) return i + 1;
      }
      return 0;
    },
  },
  {
    id: 'perp-burn', label: 'PerpBurn', typeNum: 8,
    bounds: { rMin: -2.2, rMax: 1.2, iMin: -2.0, iMax: 0.8 },
    locus(cr, ci, maxIter) {
      let x = 0, y = 0;
      for (let i = 0; i < maxIter; i++) {
        const ay = Math.abs(y);
        const nx = x * x - ay * ay + cr;
        const ny = 2 * x * ay + ci;
        x = nx; y = ny;
        if (x * x + y * y > 100) return i + 1;
      }
      return 0;
    },
    julia(fx, fy, jR, jI, maxIter) {
      let x = fx, y = fy;
      for (let i = 0; i < maxIter; i++) {
        const ay = Math.abs(y);
        const nx = x * x - ay * ay + jR;
        const ny = 2 * x * ay + jI;
        x = nx; y = ny;
        if (x * x + y * y > 4) return i + 1;
      }
      return 0;
    },
  },
];

// Type → family index lookup
const TYPE_TO_FAMILY: Record<number, number> = {};
FAMILIES.forEach((f, i) => { TYPE_TO_FAMILY[f.typeNum] = i; });

// --- Palettes ---

const PALETTES = [
  { name: 'C', stops: [{ pos: 0, color: [4, 0, 3] }, { pos: 0.15, color: [55, 0, 42] }, { pos: 0.4, color: [170, 20, 130] }, { pos: 0.65, color: [220, 60, 175] }, { pos: 0.85, color: [240, 120, 200] }, { pos: 1, color: [200, 80, 165] }] },
  { name: 'C#', stops: [{ pos: 0, color: [3, 0, 8] }, { pos: 0.15, color: [35, 0, 55] }, { pos: 0.4, color: [110, 20, 175] }, { pos: 0.65, color: [160, 60, 220] }, { pos: 0.85, color: [185, 110, 235] }, { pos: 1, color: [145, 70, 195] }] },
  { name: 'D', stops: [{ pos: 0, color: [1, 0, 10] }, { pos: 0.15, color: [18, 4, 65] }, { pos: 0.4, color: [65, 30, 175] }, { pos: 0.65, color: [110, 70, 220] }, { pos: 0.85, color: [150, 120, 240] }, { pos: 1, color: [110, 80, 200] }] },
  { name: 'D#', stops: [{ pos: 0, color: [0, 0, 10] }, { pos: 0.15, color: [10, 8, 65] }, { pos: 0.4, color: [40, 40, 180] }, { pos: 0.65, color: [80, 90, 220] }, { pos: 0.85, color: [120, 140, 240] }, { pos: 1, color: [80, 100, 200] }] },
  { name: 'E', stops: [{ pos: 0, color: [0, 4, 20] }, { pos: 0.15, color: [0, 28, 80] }, { pos: 0.4, color: [0, 95, 170] }, { pos: 0.65, color: [30, 155, 230] }, { pos: 0.85, color: [70, 190, 245] }, { pos: 1, color: [30, 140, 200] }] },
  { name: 'F', stops: [{ pos: 0, color: [0, 3, 8] }, { pos: 0.15, color: [0, 30, 55] }, { pos: 0.4, color: [0, 120, 150] }, { pos: 0.65, color: [30, 180, 200] }, { pos: 0.85, color: [80, 210, 225] }, { pos: 1, color: [40, 170, 185] }] },
  { name: 'F#', stops: [{ pos: 0, color: [0, 4, 3] }, { pos: 0.15, color: [0, 38, 30] }, { pos: 0.4, color: [10, 150, 115] }, { pos: 0.65, color: [40, 200, 155] }, { pos: 0.85, color: [90, 230, 185] }, { pos: 1, color: [50, 185, 145] }] },
  { name: 'G', stops: [{ pos: 0, color: [0, 0, 0] }, { pos: 0.15, color: [0, 24, 16] }, { pos: 0.4, color: [15, 160, 120] }, { pos: 0.65, color: [50, 210, 165] }, { pos: 0.85, color: [95, 240, 195] }, { pos: 1, color: [55, 195, 155] }] },
  { name: 'G#', stops: [{ pos: 0, color: [3, 2, 0] }, { pos: 0.15, color: [50, 35, 0] }, { pos: 0.4, color: [175, 135, 0] }, { pos: 0.65, color: [230, 190, 20] }, { pos: 0.85, color: [250, 215, 50] }, { pos: 1, color: [210, 170, 15] }] },
  { name: 'A', stops: [{ pos: 0, color: [0, 0, 0] }, { pos: 0.15, color: [75, 0, 0] }, { pos: 0.35, color: [190, 35, 0] }, { pos: 0.55, color: [240, 120, 10] }, { pos: 0.75, color: [255, 190, 40] }, { pos: 0.9, color: [245, 160, 25] }, { pos: 1, color: [200, 100, 5] }] },
  { name: 'A#', stops: [{ pos: 0, color: [5, 0, 1] }, { pos: 0.15, color: [58, 0, 22] }, { pos: 0.4, color: [190, 30, 80] }, { pos: 0.65, color: [235, 70, 130] }, { pos: 0.85, color: [245, 130, 175] }, { pos: 1, color: [205, 80, 135] }] },
  { name: 'B', stops: [{ pos: 0, color: [5, 0, 3] }, { pos: 0.15, color: [50, 0, 35] }, { pos: 0.4, color: [170, 15, 110] }, { pos: 0.65, color: [215, 55, 160] }, { pos: 0.85, color: [235, 110, 195] }, { pos: 1, color: [195, 65, 155] }] },
];

// --- Default Anchors ---

const DEFAULT_ORBITS: [FractalOrbit, FractalOrbit, FractalOrbit, FractalOrbit] = [
  { dr: 0.08, di: 0 },
  { dr: 0, di: 0.08 },
  { dr: -0.08, di: 0 },
  { dr: 0, di: -0.08 },
];

const PRESET_ANCHORS: FractalAnchor[] = [
  { type: 4, real: 0.1691, imag: -0.4957, orbits: [{ dr: -0.0164, di: 0.0417 }, { dr: -0.1442, di: 0.1592 }, { dr: 0.0995, di: -0.1970 }, { dr: 0.1415, di: -0.3167 }] },
  { type: 4, real: 0.1691, imag: -0.4957, orbits: [{ dr: -0.0164, di: 0.0417 }, { dr: -0.1442, di: 0.1592 }, { dr: 0.0995, di: -0.1970 }, { dr: 0.1415, di: -0.3167 }] },
  { type: 8, real: 0.3215, imag: 0.3842, orbits: [{ dr: 0.0800, di: 0.0000 }, { dr: 0.0000, di: 0.0800 }, { dr: -0.0800, di: 0.0000 }, { dr: 0.0000, di: -0.0800 }] },
  { type: 3, real: 0.3386, imag: -1.5682, orbits: [{ dr: 0.3780, di: 0.2838 }, { dr: 0.0203, di: 0.3658 }, { dr: -0.3341, di: 0.2716 }, { dr: 0.6591, di: -0.0036 }] },
  { type: 6, real: -1.2810, imag: -0.4794, orbits: [{ dr: 0.3687, di: 0.2541 }, { dr: -0.4120, di: 0.3658 }, { dr: -0.3442, di: 0.0000 }, { dr: 0.0000, di: -0.3003 }] },
  { type: 4, real: 0.3789, imag: 0.5193, orbits: [{ dr: 0.0395, di: 0.0300 }, { dr: 0.0675, di: 0.0413 }, { dr: -0.0305, di: -0.0552 }, { dr: -0.0331, di: -0.1026 }] },
  { type: 3, real: -1.0169, imag: -1.0135, orbits: [{ dr: 0.0128, di: -0.2683 }, { dr: -0.3061, di: 0.2928 }, { dr: -0.3486, di: 0.0034 }, { dr: 0.3770, di: 0.0085 }] },
  { type: 9, real: -0.5409, imag: -0.9587, orbits: [{ dr: 0.3182, di: -0.0236 }, { dr: -0.0152, di: 0.2597 }, { dr: 0.3001, di: 0.2507 }, { dr: -0.3193, di: 0.2747 }] },
];

// --- Internal Anchor Format ---

interface InternalAnchor {
  familyIdx: number;
  real: number;
  imag: number;
  orbits: FractalOrbit[];
}

// --- Fractal Config Panel Class ---

export class FractalConfigPanel {
  private container: HTMLElement;
  private visible = false;
  private selectedDegree = 1;
  private selectedQuality = 'major';
  private selectedFamily = 0;
  // Anchor keys are "degree-quality" e.g. "1-major", "4-dom7"
  private anchors: Map<string, InternalAnchor> = new Map();

  // Canvas elements
  private locusCanvas: HTMLCanvasElement;
  private locusCtx: CanvasRenderingContext2D;
  private locusBuffer: HTMLCanvasElement;
  private juliaCanvas: HTMLCanvasElement;
  private juliaCtx: CanvasRenderingContext2D;

  // View state per family
  private viewBounds: { rMin: number; rMax: number; iMin: number; iMax: number }[] = [];
  private zoomLevels: number[] = [];

  // Palette
  private paletteLUT: Uint8Array = new Uint8Array(LUT_SIZE * 3);
  private paletteIdx = 4; // E (blue) default

  // Animation
  private previewAnim: number | null = null;
  private previewPhase = 0;
  private previewLastTime = 0;
  private previewBpm = 120;

  // Drag state
  private dragMode: 'center' | 'orbit' | 'pan' | null = null;
  private dragDeg = -1;
  private dragOrbitIdx = -1;
  private dragStartMx = 0;
  private dragStartMy = 0;
  private dragStartData: Record<string, number> = {};
  private isDragging = false;

  // Callbacks
  public onSave: (() => void) | null = null;

  // Helper: generate anchor key from degree and quality
  private anchorKey(deg: number, quality: string): string {
    return `${deg}-${quality}`;
  }

  // Helper: get current selection's anchor key
  private get currentKey(): string {
    return this.anchorKey(this.selectedDegree, this.selectedQuality);
  }

  // Helper: get anchor for current selection
  private get currentAnchor(): InternalAnchor | undefined {
    return this.anchors.get(this.currentKey);
  }

  constructor() {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'fractal-config-overlay';
    this.container.innerHTML = this.buildHTML();
    document.body.appendChild(this.container);

    // Get canvas refs
    this.locusCanvas = this.container.querySelector('#fc-locus-canvas') as HTMLCanvasElement;
    this.locusCtx = this.locusCanvas.getContext('2d')!;
    this.locusBuffer = document.createElement('canvas');
    this.locusBuffer.width = PANEL_SIZE;
    this.locusBuffer.height = PANEL_SIZE;
    this.juliaCanvas = this.container.querySelector('#fc-julia-canvas') as HTMLCanvasElement;
    this.juliaCtx = this.juliaCanvas.getContext('2d')!;

    // Initialize view bounds
    for (const f of FAMILIES) {
      this.viewBounds.push({ ...f.bounds });
      this.zoomLevels.push(1.0);
    }

    // Build palette LUT
    this.buildPaletteLUT();

    // Load anchors
    this.loadAnchors();

    // Setup event handlers
    this.setupEventHandlers();
  }

  private buildHTML(): string {
    const familyOptions = FAMILIES.map((f, i) =>
      `<option value="${i}">${f.label}</option>`
    ).join('');

    // Build degree × quality grid
    const qualityHeaders = QUALITIES.map(q =>
      `<div class="fc-grid-header">${q.label}</div>`
    ).join('');

    const gridRows = DEGREE_NAMES.slice(1).map((name, i) => {
      const deg = i + 1;
      const cells = QUALITIES.map(q => {
        const isActive = deg === 1 && q.id === 'major';
        return `<button class="fc-grid-cell${isActive ? ' active' : ''}"
          data-deg="${deg}" data-quality="${q.id}">
          <span class="fc-cell-dot" style="background:${DEGREE_COLORS[deg]}"></span>
        </button>`;
      }).join('');

      return `
        <div class="fc-grid-row">
          <div class="fc-grid-degree" data-deg="${deg}" title="Apply to all qualities">
            <span class="fc-deg-dot" style="background:${DEGREE_COLORS[deg]}"></span>${name}
          </div>
          ${cells}
        </div>`;
    }).join('');

    const paletteButtons = PALETTES.map((p, i) => {
      const midStop = p.stops[Math.floor(p.stops.length * 0.6)];
      const c = midStop.color;
      return `<div class="fc-palette-btn${i === this.paletteIdx ? ' active' : ''}"
        data-idx="${i}" title="${p.name}"
        style="background:rgb(${c[0]},${c[1]},${c[2]})"></div>`;
    }).join('');

    return `
      <div class="fc-panel">
        <div class="fc-header">
          <h2>Fractal Config</h2>
          <button class="fc-close-btn">&times;</button>
        </div>

        <div class="fc-toolbar">
          <select class="fc-family-select" id="fc-family-select">${familyOptions}</select>
          <div class="fc-actions">
            <button class="fc-btn fc-surprise-btn">Surprise</button>
            <button class="fc-btn fc-reset-btn">Reset</button>
            <button class="fc-btn fc-save-btn">Save</button>
          </div>
        </div>

        <div class="fc-degree-grid">
          <div class="fc-grid-row fc-grid-header-row">
            <div class="fc-grid-degree-header"></div>
            ${qualityHeaders}
          </div>
          ${gridRows}
        </div>

        <div class="fc-main">
          <div class="fc-locus-wrap">
            <canvas id="fc-locus-canvas" width="${PANEL_SIZE}" height="${PANEL_SIZE}"></canvas>
            <div class="fc-locus-status" id="fc-status">Click to place anchor for selected degree</div>
          </div>

          <div class="fc-preview-wrap">
            <div class="fc-preview-header">
              <span>Preview</span>
              <label>BPM <input type="number" id="fc-bpm" value="120" min="30" max="300" step="5"></label>
            </div>
            <canvas id="fc-julia-canvas" width="${JULIA_SIZE}" height="${JULIA_SIZE}"></canvas>
            <div class="fc-julia-info" id="fc-julia-info">Select an anchor to preview</div>
            <div class="fc-palette-bar">${paletteButtons}</div>

            <div class="fc-assignments" id="fc-assignments"></div>
          </div>
        </div>
      </div>
    `;
  }

  private setupEventHandlers(): void {
    // Close button
    this.container.querySelector('.fc-close-btn')!.addEventListener('click', () => this.hide());

    // Click overlay to close
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) this.hide();
    });

    // Family select
    const familySelect = this.container.querySelector('#fc-family-select') as HTMLSelectElement;
    familySelect.addEventListener('change', () => {
      this.selectedFamily = parseInt(familySelect.value);
      this.renderLocus();
      this.drawOverlay();
    });

    // Grid cell clicks (select degree + quality)
    this.container.querySelectorAll('.fc-grid-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const el = cell as HTMLElement;
        const deg = parseInt(el.dataset.deg!);
        const quality = el.dataset.quality!;
        this.selectDegreeQuality(deg, quality);
      });
    });

    // Degree label clicks (apply current anchor to all qualities for this degree)
    this.container.querySelectorAll('.fc-grid-degree').forEach(label => {
      label.addEventListener('click', () => {
        const deg = parseInt((label as HTMLElement).dataset.deg!);
        this.applyToAllQualities(deg);
      });
    });

    // Action buttons
    this.container.querySelector('.fc-surprise-btn')!.addEventListener('click', () => this.generateSurprise());
    this.container.querySelector('.fc-reset-btn')!.addEventListener('click', () => this.resetToDefaults());
    this.container.querySelector('.fc-save-btn')!.addEventListener('click', () => this.save());

    // BPM input
    const bpmInput = this.container.querySelector('#fc-bpm') as HTMLInputElement;
    bpmInput.addEventListener('input', () => {
      const v = parseInt(bpmInput.value);
      if (v >= 30 && v <= 300) this.previewBpm = v;
    });

    // Palette buttons
    this.container.querySelectorAll('.fc-palette-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        this.setPalette(idx);
        this.container.querySelectorAll('.fc-palette-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Locus canvas interactions
    this.setupLocusInteractions();
  }

  private setupLocusInteractions(): void {
    const canvas = this.locusCanvas;

    const getPos = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * PANEL_SIZE / rect.width,
        y: (e.clientY - rect.top) * PANEL_SIZE / rect.height,
      };
    };

    const hitTest = (mx: number, my: number) => {
      // Check selected degree's orbit points first
      const sa = this.currentAnchor;
      if (sa && sa.familyIdx === this.selectedFamily) {
        for (let oi = 0; oi < 4; oi++) {
          const orb = sa.orbits[oi];
          const op = this.cToPixel(sa.real + orb.dr, sa.imag + orb.di);
          if (Math.hypot(mx - op.x, my - op.y) < 8) {
            return { type: 'orbit' as const, deg: this.selectedDegree, orbitIdx: oi };
          }
        }
      }
      // Check anchor center dots (for current quality only)
      for (let deg = 1; deg <= 7; deg++) {
        const key = this.anchorKey(deg, this.selectedQuality);
        const a = this.anchors.get(key);
        if (!a || a.familyIdx !== this.selectedFamily) continue;
        const p = this.cToPixel(a.real, a.imag);
        if (Math.hypot(mx - p.x, my - p.y) < 8) {
          return { type: 'center' as const, deg };
        }
      }
      return { type: 'empty' as const, deg: -1, orbitIdx: -1 };
    };

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const pos = getPos(e);
      const hit = hitTest(pos.x, pos.y);
      this.dragStartMx = e.clientX;
      this.dragStartMy = e.clientY;
      this.isDragging = false;

      if (hit.type === 'orbit') {
        this.dragMode = 'orbit';
        this.dragDeg = hit.deg;
        this.dragOrbitIdx = hit.orbitIdx;
        const key = this.anchorKey(hit.deg, this.selectedQuality);
        const a = this.anchors.get(key)!;
        const orb = a.orbits[hit.orbitIdx];
        this.dragStartData = { dr: orb.dr, di: orb.di };
        this.isDragging = true;
        canvas.style.cursor = 'move';
      } else if (hit.type === 'center') {
        this.dragMode = 'center';
        this.dragDeg = hit.deg;
        this.selectDegreeQuality(hit.deg, this.selectedQuality);
        const key = this.anchorKey(hit.deg, this.selectedQuality);
        const a = this.anchors.get(key)!;
        this.dragStartData = { real: a.real, imag: a.imag };
        canvas.style.cursor = 'move';
      } else {
        this.dragMode = 'pan';
        const b = this.viewBounds[this.selectedFamily];
        this.dragStartData = { rMin: b.rMin, rMax: b.rMax, iMin: b.iMin, iMax: b.iMax };
        canvas.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.dragMode === null) return;

      const rect = canvas.getBoundingClientRect();
      const b = this.viewBounds[this.selectedFamily];
      const dx = e.clientX - this.dragStartMx;
      const dy = e.clientY - this.dragStartMy;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.isDragging = true;
      if (!this.isDragging) return;

      const cDx = dx * (b.rMax - b.rMin) / rect.width;
      const cDy = dy * (b.iMax - b.iMin) / rect.height;

      const dragKey = this.anchorKey(this.dragDeg, this.selectedQuality);
      const dragAnchor = this.anchors.get(dragKey);

      if (this.dragMode === 'orbit' && dragAnchor?.familyIdx === this.selectedFamily) {
        dragAnchor.orbits[this.dragOrbitIdx].dr = this.dragStartData.dr + cDx;
        dragAnchor.orbits[this.dragOrbitIdx].di = this.dragStartData.di + cDy;
        this.drawOverlay();
      } else if (this.dragMode === 'center' && dragAnchor?.familyIdx === this.selectedFamily) {
        dragAnchor.real = this.dragStartData.real + cDx;
        dragAnchor.imag = this.dragStartData.imag + cDy;
        this.drawOverlay();
      } else if (this.dragMode === 'pan') {
        const pDx = -dx * (this.dragStartData.rMax - this.dragStartData.rMin) / rect.width;
        const pDy = -dy * (this.dragStartData.iMax - this.dragStartData.iMin) / rect.height;
        b.rMin = this.dragStartData.rMin + pDx;
        b.rMax = this.dragStartData.rMax + pDx;
        b.iMin = this.dragStartData.iMin + pDy;
        b.iMax = this.dragStartData.iMax + pDy;
        this.renderLocus();
        this.drawOverlay();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (this.dragMode === null) return;
      canvas.style.cursor = 'crosshair';

      if (!this.isDragging && this.dragMode !== 'orbit') {
        if (this.dragMode === 'center') {
          // Just select and preview
          const key = this.anchorKey(this.dragDeg, this.selectedQuality);
          const a = this.anchors.get(key);
          if (a) this.startPreview(a);
        } else {
          // Click on empty — place anchor for current selection
          const pos = getPos(e);
          const c = this.pixelToC(pos.x, pos.y);
          const existing = this.currentAnchor;
          const existingOrbits = existing?.orbits
            ? existing.orbits.map(o => ({ ...o }))
            : DEFAULT_ORBITS.map(o => ({ ...o }));

          this.anchors.set(this.currentKey, {
            familyIdx: this.selectedFamily,
            real: c.r,
            imag: c.i,
            orbits: existingOrbits as FractalOrbit[],
          });

          this.startPreview(this.anchors.get(this.currentKey)!);
          this.drawOverlay();
          this.updateAssignments();
        }
      } else if (this.dragMode === 'center' || this.dragMode === 'orbit') {
        const key = this.anchorKey(this.dragDeg, this.selectedQuality);
        const a = this.anchors.get(key);
        if (a) this.startPreview(a);
      }

      this.dragMode = null;
      this.isDragging = false;
    });

    // Zoom with ctrl+wheel
    canvas.addEventListener('wheel', (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const pos = getPos(e);
      const c = this.pixelToC(pos.x, pos.y);
      const b = this.viewBounds[this.selectedFamily];
      const factor = e.deltaY < 0 ? 0.7 : 1.4;
      const newW = (b.rMax - b.rMin) * factor;
      const newH = (b.iMax - b.iMin) * factor;
      const fracX = pos.x / PANEL_SIZE;
      const fracY = pos.y / PANEL_SIZE;
      b.rMin = c.r - fracX * newW;
      b.rMax = c.r + (1 - fracX) * newW;
      b.iMin = c.i - fracY * newH;
      b.iMax = c.i + (1 - fracY) * newH;

      const origB = FAMILIES[this.selectedFamily].bounds;
      const origW = origB.rMax - origB.rMin;
      this.zoomLevels[this.selectedFamily] = origW / (b.rMax - b.rMin);

      this.renderLocus();
      this.drawOverlay();
    }, { passive: false });

    // Double-click to reset view
    canvas.addEventListener('dblclick', () => {
      this.viewBounds[this.selectedFamily] = { ...FAMILIES[this.selectedFamily].bounds };
      this.zoomLevels[this.selectedFamily] = 1.0;
      this.renderLocus();
      this.drawOverlay();
    });

    // Hover status
    canvas.addEventListener('mousemove', (e) => {
      if (this.dragMode) return;
      const pos = getPos(e);
      const c = this.pixelToC(pos.x, pos.y);
      const status = this.container.querySelector('#fc-status')!;
      status.textContent = `${FAMILIES[this.selectedFamily].label} | c = ${c.r.toFixed(4)} + ${c.i.toFixed(4)}i`;
    });
  }

  private cToPixel(r: number, i: number): { x: number; y: number } {
    const b = this.viewBounds[this.selectedFamily];
    return {
      x: (r - b.rMin) / (b.rMax - b.rMin) * PANEL_SIZE,
      y: (i - b.iMin) / (b.iMax - b.iMin) * PANEL_SIZE,
    };
  }

  private pixelToC(px: number, py: number): { r: number; i: number } {
    const b = this.viewBounds[this.selectedFamily];
    return {
      r: b.rMin + (px / PANEL_SIZE) * (b.rMax - b.rMin),
      i: b.iMin + (py / PANEL_SIZE) * (b.iMax - b.iMin),
    };
  }

  private selectDegreeQuality(deg: number, quality: string): void {
    this.selectedDegree = deg;
    this.selectedQuality = quality;

    // Update grid cell highlighting
    this.container.querySelectorAll('.fc-grid-cell').forEach(cell => {
      const el = cell as HTMLElement;
      const cellDeg = parseInt(el.dataset.deg!);
      const cellQuality = el.dataset.quality!;
      cell.classList.toggle('active', cellDeg === deg && cellQuality === quality);
    });

    const a = this.currentAnchor;
    if (a) {
      // Switch to this anchor's family
      this.selectedFamily = a.familyIdx;
      const familySelect = this.container.querySelector('#fc-family-select') as HTMLSelectElement;
      familySelect.value = String(a.familyIdx);
      this.renderLocus();
      this.startPreview(a);
    } else {
      this.stopPreview();
    }
    this.drawOverlay();
    this.updateAssignments();
  }

  private applyToAllQualities(deg: number): void {
    // Copy the current selection's anchor to all qualities for the given degree
    const sourceAnchor = this.currentAnchor;
    if (!sourceAnchor) {
      console.log('No anchor to copy from current selection');
      return;
    }

    // Copy to all qualities for this degree
    for (const q of QUALITIES) {
      const key = this.anchorKey(deg, q.id);
      // Deep copy the anchor
      this.anchors.set(key, {
        familyIdx: sourceAnchor.familyIdx,
        real: sourceAnchor.real,
        imag: sourceAnchor.imag,
        orbits: sourceAnchor.orbits.map(o => ({ dr: o.dr, di: o.di })),
      });
    }

    // Highlight the row to indicate success
    this.container.querySelectorAll('.fc-grid-degree').forEach(label => {
      const el = label as HTMLElement;
      if (parseInt(el.dataset.deg!) === deg) {
        el.classList.add('applied');
        setTimeout(() => el.classList.remove('applied'), 300);
      }
    });

    // Redraw to show all cells as having anchors
    this.drawOverlay();
    this.updateAssignments();
  }

  private buildPaletteLUT(): void {
    const palette = PALETTES[this.paletteIdx];
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
      this.paletteLUT[idx] = Math.round(s0.color[0] + (s1.color[0] - s0.color[0]) * f);
      this.paletteLUT[idx + 1] = Math.round(s0.color[1] + (s1.color[1] - s0.color[1]) * f);
      this.paletteLUT[idx + 2] = Math.round(s0.color[2] + (s1.color[2] - s0.color[2]) * f);
    }
  }

  private setPalette(idx: number): void {
    this.paletteIdx = idx;
    this.buildPaletteLUT();
  }

  private loadAnchors(): void {
    const stored = loadFractalAnchors();
    if (stored) {
      // Load stored anchors - for backwards compatibility, copy each degree to all qualities
      for (let deg = 0; deg <= 7; deg++) {
        const a = stored[deg];
        if (a) {
          const fi = TYPE_TO_FAMILY[a.type];
          if (fi !== undefined) {
            const anchor: InternalAnchor = {
              familyIdx: fi,
              real: a.real,
              imag: a.imag,
              orbits: a.orbits.map(o => ({ ...o })),
            };
            // Apply to all qualities for this degree
            for (const q of QUALITIES) {
              this.anchors.set(this.anchorKey(deg, q.id), {
                familyIdx: anchor.familyIdx,
                real: anchor.real,
                imag: anchor.imag,
                orbits: anchor.orbits.map(o => ({ ...o })),
              });
            }
          }
        }
      }
    } else {
      this.resetToDefaults();
    }
  }

  private resetToDefaults(): void {
    this.anchors.clear();
    for (let deg = 0; deg <= 7; deg++) {
      const p = PRESET_ANCHORS[deg];
      const fi = TYPE_TO_FAMILY[p.type];
      const anchor: InternalAnchor = {
        familyIdx: fi,
        real: p.real,
        imag: p.imag,
        orbits: p.orbits.map(o => ({ ...o })),
      };
      // Apply to all qualities for this degree
      for (const q of QUALITIES) {
        this.anchors.set(this.anchorKey(deg, q.id), {
          familyIdx: anchor.familyIdx,
          real: anchor.real,
          imag: anchor.imag,
          orbits: anchor.orbits.map(o => ({ ...o })),
        });
      }
    }
    this.drawOverlay();
    this.updateAssignments();
    this.selectDegreeQuality(1, 'major');
  }

  private save(): void {
    // For backwards compatibility, save the "major" quality as the canonical anchor per degree
    const out: FractalAnchors = {};
    for (let deg = 0; deg <= 7; deg++) {
      const key = this.anchorKey(deg, 'major');
      const a = this.anchors.get(key);
      if (!a) continue;
      const f = FAMILIES[a.familyIdx];
      out[deg] = {
        real: a.real,
        imag: a.imag,
        type: f.typeNum,
        orbits: a.orbits.map(o => ({ dr: o.dr, di: o.di })) as [FractalOrbit, FractalOrbit, FractalOrbit, FractalOrbit],
      };
    }
    saveFractalAnchors(out);
    if (this.onSave) this.onSave();
    this.hide();
  }

  private generateSurprise(): void {
    const shuffled = [...FAMILIES.keys()].sort(() => Math.random() - 0.5);
    const numFamilies = 2 + Math.floor(Math.random() * 2);
    const familyPool = shuffled.slice(0, numFamilies);
    const degreeTension = [0.1, 0.1, 0.35, 0.5, 0.3, 0.7, 0.45, 0.85];

    // Generate surprise anchors for all degrees
    for (let deg = 0; deg <= 7; deg++) {
      const fi = familyPool[Math.max(1, deg) % familyPool.length];
      const pt = deg === 0 ? this.findBoundaryPoint(familyPool[1 % familyPool.length]) : this.findBoundaryPoint(fi);
      const tension = degreeTension[deg];
      const baseOrbitR = 0.06 + tension * 0.25;

      const orbits: FractalOrbit[] = [];
      const baseAngle = Math.random() * Math.PI * 2;
      for (let oi = 0; oi < 4; oi++) {
        const angle = baseAngle + (oi / 4) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
        const r = baseOrbitR * (0.6 + Math.random() * 0.8);
        orbits.push({ dr: r * Math.cos(angle), di: r * Math.sin(angle) });
      }

      const anchor: InternalAnchor = { familyIdx: fi, real: pt.r, imag: pt.i, orbits };

      // Apply to all qualities for this degree
      for (const q of QUALITIES) {
        this.anchors.set(this.anchorKey(deg, q.id), {
          familyIdx: anchor.familyIdx,
          real: anchor.real,
          imag: anchor.imag,
          orbits: anchor.orbits.map(o => ({ ...o })),
        });
      }
    }

    this.drawOverlay();
    this.updateAssignments();
    this.selectDegreeQuality(1, 'major');
  }

  private findBoundaryPoint(familyIdx: number): { r: number; i: number } {
    const f = FAMILIES[familyIdx];
    const b = f.bounds;
    const iter = 150;
    const probeR = 0.03;

    let bestR = 0, bestI = 0, bestScore = -1;

    for (let attempt = 0; attempt < 400; attempt++) {
      const cr = b.rMin + Math.random() * (b.rMax - b.rMin);
      const ci = b.iMin + Math.random() * (b.iMax - b.iMin);

      const probes: [number, number][] = [
        [cr, ci],
        [cr + probeR, ci], [cr - probeR, ci],
        [cr, ci + probeR], [cr, ci - probeR],
        [cr + probeR * 0.7, ci + probeR * 0.7], [cr - probeR * 0.7, ci + probeR * 0.7],
        [cr + probeR * 0.7, ci - probeR * 0.7], [cr - probeR * 0.7, ci - probeR * 0.7],
      ];

      let interior = 0, exterior = 0, escSum = 0;
      for (const [pr, pi] of probes) {
        const esc = f.locus(pr, pi, iter);
        if (esc === 0) interior++;
        else { exterior++; escSum += esc; }
      }

      if (interior === 0 || exterior === 0) continue;
      const mixScore = Math.min(interior, exterior) / probes.length;
      const outsideBias = exterior > interior ? 1.2 : 1.0;
      const avgEsc = exterior > 0 ? escSum / exterior : 0;
      const escBonus = avgEsc > 5 && avgEsc < iter * 0.7 ? 1.3 : 1.0;
      const score = mixScore * outsideBias * escBonus;

      if (score > bestScore) {
        bestScore = score;
        bestR = cr;
        bestI = ci;
      }
    }

    return { r: bestR, i: bestI };
  }

  private renderLocus(): void {
    const f = FAMILIES[this.selectedFamily];
    const b = this.viewBounds[this.selectedFamily];
    const ctx = this.locusBuffer.getContext('2d')!;
    const img = ctx.createImageData(PANEL_SIZE, PANEL_SIZE);
    const d = img.data;
    const rStep = (b.rMax - b.rMin) / PANEL_SIZE;
    const iStep = (b.iMax - b.iMin) / PANEL_SIZE;
    const maxIter = Math.round(LOCUS_ITER * (1 + Math.log2(Math.max(1, this.zoomLevels[this.selectedFamily]))));

    for (let py = 0; py < PANEL_SIZE; py++) {
      const ci = b.iMin + py * iStep;
      for (let px = 0; px < PANEL_SIZE; px++) {
        const cr = b.rMin + px * rStep;
        const esc = f.locus(cr, ci, maxIter);
        const idx = (py * PANEL_SIZE + px) * 4;
        if (esc === 0) {
          d[idx] = 8; d[idx + 1] = 8; d[idx + 2] = 16;
        } else {
          const t = Math.sqrt(esc / maxIter);
          d[idx] = Math.round(12 + t * 50);
          d[idx + 1] = Math.round(20 + t * 100);
          d[idx + 2] = Math.round(35 + t * 80);
        }
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  private drawOverlay(): void {
    this.locusCtx.drawImage(this.locusBuffer, 0, 0);

    // Draw all anchors for current quality that belong to current family
    for (let deg = 1; deg <= 7; deg++) {
      const key = this.anchorKey(deg, this.selectedQuality);
      const a = this.anchors.get(key);
      if (!a || a.familyIdx !== this.selectedFamily) continue;

      const p = this.cToPixel(a.real, a.imag);
      const col = DEGREE_COLORS[deg];
      const isSelected = deg === this.selectedDegree;

      // Draw orbit lines and dots
      for (let oi = 0; oi < 4; oi++) {
        const orb = a.orbits[oi];
        const op = this.cToPixel(a.real + orb.dr, a.imag + orb.di);

        this.locusCtx.beginPath();
        this.locusCtx.moveTo(p.x, p.y);
        this.locusCtx.lineTo(op.x, op.y);
        this.locusCtx.strokeStyle = isSelected ? ORBIT_COLORS[oi] + 'aa' : ORBIT_COLORS[oi] + '44';
        this.locusCtx.lineWidth = isSelected ? 1.5 : 1;
        this.locusCtx.stroke();

        this.locusCtx.beginPath();
        this.locusCtx.arc(op.x, op.y, isSelected ? 5 : 3, 0, Math.PI * 2);
        this.locusCtx.fillStyle = ORBIT_COLORS[oi];
        this.locusCtx.globalAlpha = isSelected ? 1 : 0.5;
        this.locusCtx.fill();
        this.locusCtx.globalAlpha = 1;

        if (isSelected) {
          this.locusCtx.font = 'bold 9px monospace';
          this.locusCtx.lineWidth = 2;
          this.locusCtx.strokeStyle = '#000';
          this.locusCtx.strokeText(ORBIT_LABELS[oi], op.x + 6, op.y - 4);
          this.locusCtx.fillStyle = ORBIT_COLORS[oi];
          this.locusCtx.fillText(ORBIT_LABELS[oi], op.x + 6, op.y - 4);
        }
      }

      // Center dot
      this.locusCtx.beginPath();
      this.locusCtx.arc(p.x, p.y, isSelected ? 6 : 4, 0, Math.PI * 2);
      this.locusCtx.fillStyle = col;
      this.locusCtx.fill();
      if (isSelected) {
        this.locusCtx.strokeStyle = '#fff';
        this.locusCtx.lineWidth = 1.5;
        this.locusCtx.stroke();
      }

      // Degree label
      this.locusCtx.font = 'bold 11px monospace';
      this.locusCtx.lineWidth = 3;
      this.locusCtx.strokeStyle = '#000';
      this.locusCtx.strokeText(DEGREE_NAMES[deg], p.x + 8, p.y - 6);
      this.locusCtx.fillStyle = '#fff';
      this.locusCtx.fillText(DEGREE_NAMES[deg], p.x + 8, p.y - 6);
    }
  }

  private updateAssignments(): void {
    const div = this.container.querySelector('#fc-assignments')!;
    let html = '';
    for (let deg = 1; deg <= 7; deg++) {
      const key = this.anchorKey(deg, this.selectedQuality);
      const a = this.anchors.get(key);
      html += `<div class="fc-assign-row">
        <span class="fc-deg-dot" style="background:${DEGREE_COLORS[deg]}"></span>
        <strong>${DEGREE_NAMES[deg]}</strong>
        ${a ? `<span class="fc-type-tag">${FAMILIES[a.familyIdx].label}</span>` : '<span class="fc-unassigned">—</span>'}
      </div>`;
    }
    div.innerHTML = html;

    // Update grid cell visual states
    this.updateGridStates();
  }

  private updateGridStates(): void {
    // Update each grid cell to show if it has an anchor
    this.container.querySelectorAll('.fc-grid-cell').forEach(cell => {
      const el = cell as HTMLElement;
      const deg = parseInt(el.dataset.deg!);
      const quality = el.dataset.quality!;
      const key = this.anchorKey(deg, quality);
      const hasAnchor = this.anchors.has(key);
      el.classList.toggle('has-anchor', hasAnchor);
    });
  }

  // --- Preview Animation ---

  private startPreview(anchor: InternalAnchor): void {
    this.stopPreview();
    this.previewPhase = 0;
    this.previewLastTime = 0;

    const loop = (time: number) => {
      const dt = this.previewLastTime === 0 ? 0.016 : Math.min((time - this.previewLastTime) / 1000, 0.05);
      this.previewLastTime = time;

      const beatDur = 60 / this.previewBpm;
      this.previewPhase += dt;
      const beatFloat = this.previewPhase / beatDur;
      const beatIndex = Math.floor(beatFloat) % 4;
      const beatFrac = beatFloat - Math.floor(beatFloat);
      const t = Math.sin(Math.PI * beatFrac);

      const orb = anchor.orbits[beatIndex];
      const cr = anchor.real + orb.dr * t;
      const ci = anchor.imag + orb.di * t;

      this.renderJulia(anchor.familyIdx, cr, ci);
      this.previewAnim = requestAnimationFrame(loop);
    };

    this.previewAnim = requestAnimationFrame(loop);
  }

  private stopPreview(): void {
    if (this.previewAnim) {
      cancelAnimationFrame(this.previewAnim);
      this.previewAnim = null;
    }
  }

  private renderJulia(familyIdx: number, jR: number, jI: number): void {
    const f = FAMILIES[familyIdx];
    const img = this.juliaCtx.createImageData(JULIA_SIZE, JULIA_SIZE);
    const d = img.data;
    const range = 3.6, half = range / 2, step = range / JULIA_SIZE;
    const lut = this.paletteLUT;

    for (let py = 0; py < JULIA_SIZE; py++) {
      for (let px = 0; px < JULIA_SIZE; px++) {
        const esc = f.julia(-half + px * step, -half + py * step, jR, jI, JULIA_ITER);
        const idx = (py * JULIA_SIZE + px) * 4;
        if (esc === 0) {
          d[idx] = d[idx + 1] = d[idx + 2] = 0;
        } else {
          const t = Math.sqrt(esc / JULIA_ITER);
          const li = Math.min(LUT_SIZE - 1, Math.round(t * (LUT_SIZE - 1))) * 3;
          d[idx] = lut[li];
          d[idx + 1] = lut[li + 1];
          d[idx + 2] = lut[li + 2];
        }
        d[idx + 3] = 255;
      }
    }
    this.juliaCtx.putImageData(img, 0, 0);

    const info = this.container.querySelector('#fc-julia-info')!;
    info.textContent = `${f.label} | c = ${jR.toFixed(4)} + ${jI.toFixed(4)}i`;
  }

  // --- Public API ---

  show(): void {
    this.visible = true;
    this.container.classList.add('visible');
    this.loadAnchors();
    this.renderLocus();
    this.drawOverlay();
    this.updateAssignments();

    const a = this.currentAnchor;
    if (a) this.startPreview(a);
  }

  hide(): void {
    this.visible = false;
    this.container.classList.remove('visible');
    this.stopPreview();
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  isVisible(): boolean {
    return this.visible;
  }
}
