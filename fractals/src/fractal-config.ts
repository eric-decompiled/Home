/**
 * Fractal Configuration Panel
 *
 * Interactive editor for fractal anchor points per harmonic degree.
 * Each anchor defines a c-plane position and 4 orbit offsets for beat-synchronized motion.
 */

import { loadFractalAnchors, saveFractalAnchors, type FractalAnchors, type FractalAnchor } from './state.ts';

// --- Constants ---

const PANEL_SIZE = 500;
const LOCUS_ITER = 150;  // Reduced for performance
const JULIA_SIZE = 200;  // Reduced for performance
const JULIA_ITER = 100;  // Reduced for performance
const LUT_SIZE = 2048;

const DEGREE_NAMES = ['0', 'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'];
const DEGREE_COLORS = ['#888', '#ff4444', '#44aaff', '#44dd88', '#ffaa22', '#ff66cc', '#88ccff', '#ffff44'];
const ORBIT_COLORS = ['#ff6666', '#66bbff', '#66ff99', '#ffcc44'];
const ORBIT_LABELS = ['1', '2', '3', '4'];

// Simplified: one anchor per degree (no chord quality variants)
const QUALITIES = [{ id: 'major', label: '' }];  // Single quality for compatibility

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
    id: 'classic', label: 'Classic', typeNum: 0,
    bounds: { rMin: -2.0, rMax: 0.7, iMin: -1.3, iMax: 1.3 },
    // Classic Mandelbrot/Julia: z² + c - the iconic fractal
    locus(cr, ci, maxIter) {
      let x = 0, y = 0;
      for (let i = 0; i < maxIter; i++) {
        const x2 = x * x, y2 = y * y;
        if (x2 + y2 > 4) return i + 1;
        y = 2 * x * y + ci;
        x = x2 - y2 + cr;
      }
      return 0;
    },
    julia(fx, fy, jR, jI, maxIter) {
      let x = fx, y = fy;
      for (let i = 0; i < maxIter; i++) {
        const x2 = x * x, y2 = y * y;
        if (x2 + y2 > 4) return i + 1;
        y = 2 * x * y + jI;
        x = x2 - y2 + jR;
      }
      return 0;
    },
  },
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
  // --- NEW FAMILIES ---
  {
    id: 'newton-3', label: 'Newton-3', typeNum: 10,
    bounds: { rMin: -2.0, rMax: 2.0, iMin: -2.0, iMax: 2.0 },
    locus(cr, ci, maxIter) {
      let x = cr, y = ci;
      const roots = [[1, 0], [-0.5, Math.sqrt(3)/2], [-0.5, -Math.sqrt(3)/2]];
      for (let i = 0; i < maxIter; i++) {
        const r2 = x * x + y * y;
        if (r2 < 1e-10) return 0;
        const r = Math.sqrt(r2);
        const theta = Math.atan2(y, x);
        const r3 = r * r * r;
        const z3r = r3 * Math.cos(3 * theta), z3i = r3 * Math.sin(3 * theta);
        const z2r = 3 * r2 * Math.cos(2 * theta), z2i = 3 * r2 * Math.sin(2 * theta);
        const numR = z3r - 1, numI = z3i;
        const den = z2r * z2r + z2i * z2i;
        if (den < 1e-10) return 0;
        x = x - (numR * z2r + numI * z2i) / den;
        y = y - (numI * z2r - numR * z2i) / den;
        for (const [rr, ri] of roots) {
          if ((x - rr) ** 2 + (y - ri) ** 2 < 0.0001) return i + 1;
        }
      }
      return 0;
    },
    julia(fx, fy, _jR, _jI, maxIter) {
      // Newton doesn't use c, just show convergence pattern
      return this.locus(fx, fy, maxIter);
    },
  },
  {
    id: 'nova', label: 'Nova', typeNum: 11,
    bounds: { rMin: -2.0, rMax: 2.0, iMin: -2.0, iMax: 2.0 },
    // Nova: z = z - (z³-1)/(3z²) + c — algebraic form, no trig
    // Cubic roots at e^(2πik/3) for k=0,1,2: (1,0), (-0.5, 0.866), (-0.5, -0.866)
    locus(cr, ci, maxIter) {
      let x = cr, y = ci;
      const roots = [[1, 0], [-0.5, 0.866025], [-0.5, -0.866025]];
      for (let i = 0; i < maxIter; i++) {
        const x2 = x * x, y2 = y * y;
        const r2 = x2 + y2;
        if (r2 > 100) return i + 1;
        // Check convergence to any root
        for (let k = 0; k < 3; k++) {
          const dx = x - roots[k][0], dy = y - roots[k][1];
          if (dx * dx + dy * dy < 1e-6) {
            // Color by convergence speed + root offset for variety
            return (maxIter - i) * 0.5 + k * maxIter * 0.15 + 1;
          }
        }
        if (r2 < 1e-12) return maxIter * 0.3; // Near origin
        const z2r = x2 - y2, z2i = 2 * x * y;
        const z3r = x * z2r - y * z2i, z3i = x * z2i + y * z2r;
        const denR = 3 * z2r, denI = 3 * z2i;
        const den2 = denR * denR + denI * denI;
        if (den2 < 1e-12) return maxIter * 0.3;
        const numR = z3r - 1, numI = z3i;
        const divR = (numR * denR + numI * denI) / den2;
        const divI = (numI * denR - numR * denI) / den2;
        x = x - divR + cr;
        y = y - divI + ci;
      }
      return maxIter * 0.5; // Didn't converge - mid brightness
    },
    julia(fx, fy, jR, jI, maxIter) {
      let x = fx, y = fy;
      const roots = [[1, 0], [-0.5, 0.866025], [-0.5, -0.866025]];
      for (let i = 0; i < maxIter; i++) {
        const x2 = x * x, y2 = y * y;
        const r2 = x2 + y2;
        if (r2 > 100) return i + 1;
        // Check convergence to any root
        for (let k = 0; k < 3; k++) {
          const dx = x - roots[k][0], dy = y - roots[k][1];
          if (dx * dx + dy * dy < 1e-6) {
            return (maxIter - i) * 0.5 + k * maxIter * 0.15 + 1;
          }
        }
        if (r2 < 1e-12) return maxIter * 0.3;
        const z2r = x2 - y2, z2i = 2 * x * y;
        const z3r = x * z2r - y * z2i, z3i = x * z2i + y * z2r;
        const denR = 3 * z2r, denI = 3 * z2i;
        const den2 = denR * denR + denI * denI;
        if (den2 < 1e-12) return maxIter * 0.3;
        const numR = z3r - 1, numI = z3i;
        const divR = (numR * denR + numI * denI) / den2;
        const divI = (numI * denR - numR * denI) / den2;
        x = x - divR + jR;
        y = y - divI + jI;
      }
      return maxIter * 0.5;
    },
  },
  {
    id: 'magnet', label: 'Magnet-I', typeNum: 13,
    bounds: { rMin: -3.0, rMax: 3.0, iMin: -3.0, iMax: 3.0 },
    locus(cr, ci, maxIter) {
      let x = 0, y = 0;
      for (let i = 0; i < maxIter; i++) {
        const d1 = (x - 1) ** 2 + y ** 2;
        if (d1 < 0.0001) return i + 1;
        if (x * x + y * y > 1000) return i + 1;
        const numR = x * x - y * y + cr - 1;
        const numI = 2 * x * y + ci;
        const denR = 2 * x + cr - 2;
        const denI = 2 * y + ci;
        const den2 = denR * denR + denI * denI;
        if (den2 < 1e-10) return i + 1;
        const divR = (numR * denR + numI * denI) / den2;
        const divI = (numI * denR - numR * denI) / den2;
        x = divR * divR - divI * divI;
        y = 2 * divR * divI;
      }
      return 0;
    },
    julia(fx, fy, jR, jI, maxIter) {
      let x = fx, y = fy;
      for (let i = 0; i < maxIter; i++) {
        const d1 = (x - 1) ** 2 + y ** 2;
        if (d1 < 0.0001) return i + 1;
        if (x * x + y * y > 1000) return i + 1;
        const numR = x * x - y * y + jR - 1;
        const numI = 2 * x * y + jI;
        const denR = 2 * x + jR - 2;
        const denI = 2 * y + jI;
        const den2 = denR * denR + denI * denI;
        if (den2 < 1e-10) return i + 1;
        const divR = (numR * denR + numI * denI) / den2;
        const divI = (numI * denR - numR * denI) / den2;
        x = divR * divR - divI * divI;
        y = 2 * divR * divI;
      }
      return 0;
    },
  },
  {
    id: 'barnsley-1', label: 'Barnsley-1', typeNum: 14,
    bounds: { rMin: -2.0, rMax: 2.0, iMin: -2.0, iMax: 2.0 },
    locus(cr, ci, maxIter) {
      let x = 0, y = 0;
      for (let i = 0; i < maxIter; i++) {
        if (x * x + y * y > 100) return i + 1;
        const dr = x >= 0 ? x - 1 : x + 1;
        x = dr * cr - y * ci;
        y = dr * ci + y * cr;
      }
      return 0;
    },
    julia(fx, fy, jR, jI, maxIter) {
      let x = fx, y = fy;
      for (let i = 0; i < maxIter; i++) {
        if (x * x + y * y > 100) return i + 1;
        const dr = x >= 0 ? x - 1 : x + 1;
        x = dr * jR - y * jI;
        y = dr * jI + y * jR;
      }
      return 0;
    },
  },
  {
    id: 'barnsley-2', label: 'Barnsley-2', typeNum: 15,
    bounds: { rMin: -2.0, rMax: 2.0, iMin: -2.0, iMax: 2.0 },
    locus(cr, ci, maxIter) {
      let x = 0, y = 0;
      for (let i = 0; i < maxIter; i++) {
        if (x * x + y * y > 100) return i + 1;
        const prod = x * ci + y * cr;
        const dr = prod >= 0 ? x - 1 : x + 1;
        x = dr * cr - y * ci;
        y = dr * ci + y * cr;
      }
      return 0;
    },
    julia(fx, fy, jR, jI, maxIter) {
      let x = fx, y = fy;
      for (let i = 0; i < maxIter; i++) {
        if (x * x + y * y > 100) return i + 1;
        const prod = x * jI + y * jR;
        const dr = prod >= 0 ? x - 1 : x + 1;
        x = dr * jR - y * jI;
        y = dr * jI + y * jR;
      }
      return 0;
    },
  },
  {
    id: 'barnsley-3', label: 'Barnsley-3', typeNum: 16,
    bounds: { rMin: -2.0, rMax: 2.0, iMin: -2.0, iMax: 2.0 },
    locus(cr, ci, maxIter) {
      let x = 0, y = 0;
      for (let i = 0; i < maxIter; i++) {
        if (x * x + y * y > 100) return i + 1;
        const z2r = x * x - y * y - 1;
        const z2i = 2 * x * y;
        if (x > 0) {
          x = z2r + cr;
          y = z2i + ci;
        } else {
          x = z2r + cr * x + cr;
          y = z2i + ci * x + ci;
        }
      }
      return 0;
    },
    julia(fx, fy, jR, jI, maxIter) {
      let x = fx, y = fy;
      for (let i = 0; i < maxIter; i++) {
        if (x * x + y * y > 100) return i + 1;
        const z2r = x * x - y * y - 1;
        const z2i = 2 * x * y;
        if (x > 0) {
          x = z2r + jR;
          y = z2i + jI;
        } else {
          x = z2r + jR * x + jR;
          y = z2i + jI * x + jI;
        }
      }
      return 0;
    },
  },
  {
    id: 'multicorn-3', label: 'Multicorn-3', typeNum: 17,
    bounds: { rMin: -1.5, rMax: 1.5, iMin: -1.5, iMax: 1.5 },
    locus(cr, ci, maxIter) {
      let x = 0, y = 0;
      for (let i = 0; i < maxIter; i++) {
        if (x * x + y * y > 100) return i + 1;
        const r = Math.sqrt(x * x + y * y);
        const theta = Math.atan2(-y, x);
        const r3 = r * r * r;
        x = r3 * Math.cos(3 * theta) + cr;
        y = r3 * Math.sin(3 * theta) + ci;
      }
      return 0;
    },
    julia(fx, fy, jR, jI, maxIter) {
      let x = fx, y = fy;
      for (let i = 0; i < maxIter; i++) {
        if (x * x + y * y > 100) return i + 1;
        const r = Math.sqrt(x * x + y * y);
        const theta = Math.atan2(-y, x);
        const r3 = r * r * r;
        x = r3 * Math.cos(3 * theta) + jR;
        y = r3 * Math.sin(3 * theta) + jI;
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

const DEFAULT_ORBIT_RADIUS = 0.08;
const DEFAULT_ORBIT_SKEW = 1.0;     // circle
const DEFAULT_ORBIT_ROTATION = 0;   // no rotation
const DEFAULT_BEAT_SPREAD = Math.PI / 2;  // 90° between beat points
const DEFAULT_ORBIT_MODE: 'orbit' | 'beats' = 'orbit';

const PRESET_ANCHORS: FractalAnchor[] = [
  { type: 4, real: 0.1691, imag: -0.4957, orbitRadius: 0.15 },
  { type: 4, real: 0.1691, imag: -0.4957, orbitRadius: 0.15 },
  { type: 8, real: 0.3215, imag: 0.3842, orbitRadius: 0.08 },
  { type: 3, real: 0.3386, imag: -1.5682, orbitRadius: 0.35 },
  { type: 6, real: -1.2810, imag: -0.4794, orbitRadius: 0.30 },
  { type: 4, real: 0.3789, imag: 0.5193, orbitRadius: 0.06 },
  { type: 3, real: -1.0169, imag: -1.0135, orbitRadius: 0.25 },
  { type: 9, real: -0.5409, imag: -0.9587, orbitRadius: 0.28 },
];

// --- Internal Anchor Format ---

interface InternalAnchor {
  familyIdx: number;
  real: number;
  imag: number;
  orbitRadius: number;
  orbitSkew: number;     // aspect ratio: 1=circle, <1=wide, >1=tall
  orbitRotation: number; // rotation in radians
  beatSpread: number;    // angle between beat points in radians (π/2 = 90°)
  orbitMode: 'orbit' | 'beats';  // continuous orbit vs discrete beat jumps
}

// --- Fractal Config Panel Class ---

export class FractalConfigPanel {
  private container: HTMLElement;
  private visible = false;
  private selectedDegree = 1;
  private selectedQuality = 'major';  // Always major now (simplified)
  private selectedFamily = 0;
  // Anchor keys are just degree numbers as strings
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

  // Progression playback
  private progressionPlaying = false;
  private progressionIndex = 0;
  private progressionTimer: number | null = null;
  private audioCtx: AudioContext | null = null;
  private currentChordOscs: OscillatorNode[] = [];

  // Drag state
  private dragMode: 'center' | 'orbit' | 'pan' | null = null;
  private dragDeg = -1;
  private dragStartMx = 0;
  private dragStartMy = 0;
  private dragStartData: Record<string, number> = {};
  private isDragging = false;
  private snapMode: 'none' | 'cross' = 'none';
  private showAtlasGrid = false;
  private dragDebounceTimer: number | null = null;

  // Lock state - locked degrees are preserved during Surprise
  private lockedCells: Set<string> = new Set();

  // Clock rotation offset (0-11 semitones, cycles on each click)
  private clockRotationOffset = 0;

  // Temperature per degree (0-1, default 0.5) - controls reroll variation
  private degreeTemperatures: Map<number, number> = new Map();

  // Thumbnail cache - key is "deg:familyIdx:real:imag" rounded to 3 decimals
  private thumbnailCache: Map<string, ImageData> = new Map();
  private static readonly THUMB_SIZE = 94;
  private static readonly THUMB_ITER = 60;  // Reduced for performance

  // Locus cache - key is "familyIdx:bounds"
  private locusCache: Map<string, HTMLCanvasElement> = new Map();

  // Track when thumbnails need re-rendering
  private allThumbnailsDirty = true;


  // Debounce timer for zoom
  private zoomDebounceTimer: number | null = null;
  // Track rendered bounds for scaled preview during zoom
  private renderedBounds: { rMin: number; rMax: number; iMin: number; iMax: number }[] = [];

  // Callbacks
  public onSave: (() => void) | null = null;

  /** Set global temperature for all degrees (0-1) */
  public setGlobalTemperature(temp: number): void {
    for (let deg = 0; deg <= 7; deg++) {
      this.degreeTemperatures.set(deg, temp);
    }
  }

  /** Set orbit radius for a degree */
  private setOrbitRadius(deg: number, radius: number): void {
    const key = this.anchorKey(deg);
    const anchor = this.anchors.get(key);
    if (anchor) {
      anchor.orbitRadius = Math.max(0.01, radius);
      this.drawOverlay();
    }
  }

  /** Set orbit skew for a degree */
  private setOrbitSkew(deg: number, skew: number): void {
    const key = this.anchorKey(deg);
    const anchor = this.anchors.get(key);
    if (anchor) {
      anchor.orbitSkew = skew;
      this.drawOverlay();
    }
  }

  /** Set orbit rotation for a degree */
  private setOrbitRotation(deg: number, rotation: number): void {
    const key = this.anchorKey(deg);
    const anchor = this.anchors.get(key);
    if (anchor) {
      anchor.orbitRotation = rotation;
      this.drawOverlay();
    }
  }

  /** Set beat spread (angle between beat points) for a degree */
  private setBeatSpread(deg: number, spread: number): void {
    const key = this.anchorKey(deg);
    const anchor = this.anchors.get(key);
    if (anchor) {
      anchor.beatSpread = spread;
      this.drawOverlay();
    }
  }

  /** Shake positions randomly by up to 25% of current zoom range */
  private shakePositions(): void {
    const bounds = this.viewBounds[this.selectedFamily];
    const rangeR = (bounds.rMax - bounds.rMin) * 0.25;
    const rangeI = (bounds.iMax - bounds.iMin) * 0.25;

    this.markAllThumbnailsDirty();

    let shaken = 0;
    for (let deg = 1; deg <= 7; deg++) {
      for (const q of QUALITIES) {
        const key = this.anchorKey(deg, q.id);
        if (this.lockedCells.has(key)) continue;

        const anchor = this.anchors.get(key);
        if (anchor && anchor.familyIdx === this.selectedFamily) {
          anchor.real += (Math.random() - 0.5) * rangeR;
          anchor.imag += (Math.random() - 0.5) * rangeI;
          shaken++;
        }
      }
    }

    const status = this.container.querySelector('#fc-status')!;
    status.textContent = `Shook ${shaken} anchors`;

    this.syncOrbitSliders();
    this.drawOverlay();
    this.updateAssignments();
  }

  /** Show clock button only for Nova family */
  private updateClockButtonVisibility(): void {
    const clockBtn = this.container.querySelector('.fc-clock-btn') as HTMLElement;
    if (!clockBtn) return;
    const family = FAMILIES[this.selectedFamily];
    clockBtn.style.display = family.id === 'nova' ? '' : 'none';
  }

  /** Distribute anchors on clock positions (major scale semitones around a circle) */
  private distributeOnClock(): void {
    const family = FAMILIES[this.selectedFamily];
    if (family.id !== 'nova') return;

    // Major scale semitones (degrees 1-7)
    const MAJOR_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

    this.markAllThumbnailsDirty();

    // For Nova, place anchors near but not exactly on cube roots of unity
    // Use radius ~0.8 to be in the interesting boundary region
    const radius = 0.8;

    for (let deg = 1; deg <= 7; deg++) {
      const key = this.anchorKey(deg);
      if (this.lockedCells.has(key)) continue;

      const semitone = MAJOR_SEMITONES[deg - 1];
      // Apply rotation offset (cycles through 12 positions)
      const adjustedSemitone = (semitone + this.clockRotationOffset) % 12;
      const angle = (adjustedSemitone / 12) * Math.PI * 2 - Math.PI / 2; // Start from top

      const anchor = this.anchors.get(key);
      if (anchor) {
        anchor.real = radius * Math.cos(angle);
        anchor.imag = radius * Math.sin(angle);
        anchor.familyIdx = this.selectedFamily;
      }
    }

    // Cycle rotation offset for next click
    this.clockRotationOffset = (this.clockRotationOffset + 1) % 12;

    const status = this.container.querySelector('#fc-status')!;
    status.textContent = `Distributed on clock (offset ${this.clockRotationOffset - 1 < 0 ? 11 : this.clockRotationOffset - 1})`;

    this.syncOrbitSliders();
    this.drawOverlay();
    this.updateAssignments();
  }

  /** Toggle orbit mode (orbit vs beats) for a degree */
  private toggleOrbitMode(deg: number): void {
    const key = this.anchorKey(deg);
    const anchor = this.anchors.get(key);
    if (anchor) {
      anchor.orbitMode = anchor.orbitMode === 'orbit' ? 'beats' : 'orbit';
      this.drawOverlay();
    }
  }

  /** Sync orbit sliders to current anchor values */
  private syncOrbitSliders(): void {
    for (let deg = 0; deg <= 7; deg++) {
      const key = this.anchorKey(deg);
      const anchor = this.anchors.get(key);
      if (!anchor) continue;

      const radiusSlider = this.container.querySelector(`.fc-radius-slider[data-deg="${deg}"]`) as HTMLInputElement;
      const skewSlider = this.container.querySelector(`.fc-skew-slider[data-deg="${deg}"]`) as HTMLInputElement;
      const rotSlider = this.container.querySelector(`.fc-rotation-slider[data-deg="${deg}"]`) as HTMLInputElement;
      const spreadSlider = this.container.querySelector(`.fc-spread-slider[data-deg="${deg}"]`) as HTMLInputElement;

      if (radiusSlider) radiusSlider.value = String(Math.round(anchor.orbitRadius * 250));
      if (skewSlider) skewSlider.value = String(Math.round(anchor.orbitSkew * 100));
      if (rotSlider) rotSlider.value = String(Math.round(anchor.orbitRotation * 100));
      if (spreadSlider) spreadSlider.value = String(Math.round(anchor.beatSpread * 100));
      this.updateOrbitModeButton(deg);
    }
  }

  /** Update orbit mode button appearance */
  private updateOrbitModeButton(deg: number): void {
    const key = this.anchorKey(deg);
    const anchor = this.anchors.get(key);
    const btn = this.container.querySelector(`.fc-orbit-mode-btn[data-deg="${deg}"]`) as HTMLElement;
    if (btn && anchor) {
      btn.textContent = anchor.orbitMode === 'orbit' ? '◯' : '⁙';
      btn.title = anchor.orbitMode === 'orbit' ? 'Orbit mode (continuous)' : 'Beats mode (discrete)';
    }
  }

  // Helper: generate anchor key from degree (quality ignored now)
  private anchorKey(deg: number, _quality?: string): string {
    return `${deg}-major`;  // Always use major
  }

  // Helper: get current selection's anchor key
  private get currentKey(): string {
    return this.anchorKey(this.selectedDegree);
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
      this.renderedBounds.push({ ...f.bounds });
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

    // Build degree × quality grid - multiple degrees per row
    // Row 1: I, ii, iii  |  Row 2: IV, V, vi, vii
    const degreeRows = [[1, 2, 3], [4, 5, 6, 7]];

    const makeDegreeBlock = (deg: number) => {
      const name = DEGREE_NAMES[deg];
      const cells = QUALITIES.map((q, qi) => {
        const isActive = deg === 1 && q.id === 'major';
        const deriveBtn = qi === 0
          ? `<button class="fc-derive-btn" data-deg="${deg}" title="Generate variations from Major">🎲</button>`
          : '';
        return `<div class="fc-cell-buttons">
          <button class="fc-cell-lock" data-deg="${deg}" data-quality="${q.id}" title="Lock/unlock">🔓</button>
          ${deriveBtn}
        </div>
        <button class="fc-grid-cell${isActive ? ' active' : ''}"
          data-deg="${deg}" data-quality="${q.id}">
          <span class="fc-cell-dot" style="background:${DEGREE_COLORS[deg]}"></span>
        </button>`;
      }).join('');

      return `
        <div class="fc-degree-block">
          <div class="fc-degree-header">
            <button class="fc-row-lock-btn" data-deg="${deg}" title="Lock/unlock degree">🔓</button>
            <div class="fc-grid-degree" data-deg="${deg}" title="Apply to all qualities">
              <span class="fc-deg-dot" style="background:${DEGREE_COLORS[deg]}"></span>${name}
            </div>
          </div>
          <div class="fc-degree-cells">
            ${cells}
          </div>
          <div class="fc-orbit-controls">
            <label title="Orbit radius">⊕<input type="range" class="fc-radius-slider" data-deg="${deg}" min="1" max="100" value="20"></label>
            <label title="Orbit skew (aspect ratio)">⬭<input type="range" class="fc-skew-slider" data-deg="${deg}" min="20" max="200" value="100"></label>
            <label title="Orbit rotation">↻<input type="range" class="fc-rotation-slider" data-deg="${deg}" min="0" max="628" value="0"></label>
            <label title="Beat spread (angle between points)">∢<input type="range" class="fc-spread-slider" data-deg="${deg}" min="10" max="157" value="157"></label>
            <button class="fc-orbit-mode-btn" data-deg="${deg}" title="Orbit mode (continuous)">◯</button>
          </div>
        </div>`;
    };

    const gridRows = degreeRows.map(degs =>
      `<div class="fc-grid-row">${degs.map(makeDegreeBlock).join('')}</div>`
    ).join('');

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
          <div class="fc-progression-controls">
            <select class="fc-progression-select" id="fc-progression-select">
              <option value="scale">Scale</option>
              <option value="pop">Pop I-V-vi-IV</option>
              <option value="jazz">Jazz ii-V-I</option>
              <option value="blues">Blues</option>
              <option value="circle">Circle of 5ths</option>
            </select>
            <button class="fc-btn fc-play-btn" id="fc-play-btn" title="Play progression">▶️</button>
            <span class="fc-progression-display" id="fc-progression-display"></span>
          </div>
          <div class="fc-actions">
            <button class="fc-btn fc-clock-btn" title="Distribute on clock (cycles rotation)" style="display:none;">🕐</button>
            <button class="fc-btn fc-shake-btn" title="Shake positions randomly">🫨</button>
            <button class="fc-btn fc-surprise-btn" title="Regenerate unlocked anchors">🎲</button>
            <span class="fc-temp-inline">🔥<input type="range" class="fc-global-temp" min="0" max="100" value="50" title="Temperature: reroll variation"></span>
            <button class="fc-btn fc-lock-all-btn fc-lock-toolbar locked" title="Lock all">🔒</button>
            <button class="fc-btn fc-unlock-all-btn fc-lock-toolbar" title="Unlock all">🔓</button>
            <button class="fc-btn fc-atlas-btn" title="Toggle atlas grid overlay">🗺️ Atlas</button>
            <button class="fc-btn fc-copy-btn" title="Copy as TypeScript">📋</button>
            <button class="fc-btn fc-recall-btn" title="Reset orbits to cross (N/E/S/W)">↩</button>
            <button class="fc-btn fc-reset-btn">Reset</button>
            <button class="fc-btn fc-save-btn">Save</button>
          </div>
        </div>

        <div class="fc-degree-grid">
          ${gridRows}
        </div>

        <div class="fc-main">
          <div class="fc-locus-wrap">
            <canvas id="fc-locus-canvas" width="${PANEL_SIZE}" height="${PANEL_SIZE}"></canvas>
            <div class="fc-locus-status" id="fc-status">Click to place anchor | Shift+drag = axis snap</div>
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
      this.updateClockButtonVisibility();
      this.renderLocus();
      this.drawOverlay();
    });

    // Clock button (distribute on clock positions)
    this.container.querySelector('.fc-clock-btn')!.addEventListener('click', () => this.distributeOnClock());

    // Shake button (random perturbation)
    this.container.querySelector('.fc-shake-btn')!.addEventListener('click', () => this.shakePositions());

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

    // Row lock button clicks
    this.container.querySelectorAll('.fc-row-lock-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const deg = parseInt((btn as HTMLElement).dataset.deg!);
        this.toggleRowLock(deg);
      });
    });

    // Individual cell lock button clicks
    this.container.querySelectorAll('.fc-cell-lock').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const el = btn as HTMLElement;
        const deg = parseInt(el.dataset.deg!);
        const quality = el.dataset.quality!;
        this.toggleCellLock(deg, quality);
      });
    });

    // Derive row variations from major
    this.container.querySelectorAll('.fc-derive-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const deg = parseInt((btn as HTMLElement).dataset.deg!);
        this.deriveRowFromMajor(deg);
      });
    });

    // Action buttons
    this.container.querySelector('.fc-surprise-btn')!.addEventListener('click', () => this.generateSurprise());
    this.container.querySelector('.fc-global-temp')!.addEventListener('input', (e) => {
      const temp = parseInt((e.target as HTMLInputElement).value) / 100;
      this.setGlobalTemperature(temp);
    });

    // Orbit radius sliders per degree
    this.container.querySelectorAll('.fc-radius-slider').forEach(slider => {
      slider.addEventListener('input', () => {
        const el = slider as HTMLInputElement;
        const deg = parseInt(el.dataset.deg!);
        const radius = parseInt(el.value) / 250; // 1-100 -> 0.004-0.4
        this.setOrbitRadius(deg, radius);
      });
    });

    // Orbit skew sliders per degree
    this.container.querySelectorAll('.fc-skew-slider').forEach(slider => {
      slider.addEventListener('input', () => {
        const el = slider as HTMLInputElement;
        const deg = parseInt(el.dataset.deg!);
        const skew = parseInt(el.value) / 100; // 20-200 -> 0.2-2.0
        this.setOrbitSkew(deg, skew);
      });
    });

    // Orbit rotation sliders per degree
    this.container.querySelectorAll('.fc-rotation-slider').forEach(slider => {
      slider.addEventListener('input', () => {
        const el = slider as HTMLInputElement;
        const deg = parseInt(el.dataset.deg!);
        const rotation = parseInt(el.value) / 100; // 0-628 -> 0-6.28 (2π)
        this.setOrbitRotation(deg, rotation);
      });
    });

    // Beat spread sliders per degree
    this.container.querySelectorAll('.fc-spread-slider').forEach(slider => {
      slider.addEventListener('input', () => {
        const el = slider as HTMLInputElement;
        const deg = parseInt(el.dataset.deg!);
        const spread = parseInt(el.value) / 100; // 10-157 -> 0.1-1.57 (π/2 max)
        this.setBeatSpread(deg, spread);
      });
    });

    // Orbit mode toggle buttons
    this.container.querySelectorAll('.fc-orbit-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const deg = parseInt((btn as HTMLElement).dataset.deg!);
        this.toggleOrbitMode(deg);
        this.updateOrbitModeButton(deg);
      });
    });

    this.container.querySelector('.fc-lock-all-btn')!.addEventListener('click', () => this.lockAll());
    this.container.querySelector('.fc-unlock-all-btn')!.addEventListener('click', () => this.unlockAll());
    this.container.querySelector('.fc-atlas-btn')!.addEventListener('click', () => this.toggleAtlasGrid());
    this.container.querySelector('.fc-copy-btn')!.addEventListener('click', () => this.copyToClipboard());
    this.container.querySelector('.fc-recall-btn')!.addEventListener('click', () => this.recallOrbits());
    this.container.querySelector('.fc-reset-btn')!.addEventListener('click', () => this.resetToDefaults());
    this.container.querySelector('.fc-save-btn')!.addEventListener('click', () => this.save());
    this.container.querySelector('.fc-play-btn')!.addEventListener('click', () => this.toggleProgression());

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
      // Account for object-fit: contain letterboxing
      // Canvas is square (PANEL_SIZE x PANEL_SIZE), container may not be
      const containerAspect = rect.width / rect.height;
      const canvasAspect = 1; // Square canvas

      let renderWidth: number, renderHeight: number, offsetX: number, offsetY: number;
      if (containerAspect > canvasAspect) {
        // Container is wider than canvas - pillarboxing (empty space on sides)
        renderHeight = rect.height;
        renderWidth = rect.height * canvasAspect;
        offsetX = (rect.width - renderWidth) / 2;
        offsetY = 0;
      } else {
        // Container is taller than canvas - letterboxing (empty space top/bottom)
        renderWidth = rect.width;
        renderHeight = rect.width / canvasAspect;
        offsetX = 0;
        offsetY = (rect.height - renderHeight) / 2;
      }

      return {
        x: (e.clientX - rect.left - offsetX) * PANEL_SIZE / renderWidth,
        y: (e.clientY - rect.top - offsetY) * PANEL_SIZE / renderHeight,
      };
    };

    const hitTest = (mx: number, my: number) => {
      const HIT_RADIUS = 14; // Generous hit area for easier grabbing

      // Check all visible anchors' orbit points (all qualities for selected degree)
      // Find closest hit rather than first hit
      let closestOrbit: { dist: number; deg: number; quality: string; orbitIdx: number } | null = null;

      for (const q of QUALITIES) {
        const key = this.anchorKey(this.selectedDegree, q.id);
        const a = this.anchors.get(key);
        if (!a || a.familyIdx !== this.selectedFamily) continue;

        // Check 4 points around the orbit ellipse
        const rx = a.orbitRadius;
        const ry = a.orbitRadius * a.orbitSkew;
        const cosR = Math.cos(a.orbitRotation);
        const sinR = Math.sin(a.orbitRotation);
        for (let oi = 0; oi < 4; oi++) {
          // Beat points at 0, spread, 2*spread, 3*spread
          const angle = oi * a.beatSpread;
          const px = rx * Math.cos(angle);
          const py = ry * Math.sin(angle);
          const dr = px * cosR - py * sinR;
          const di = px * sinR + py * cosR;
          const op = this.cToPixel(a.real + dr, a.imag + di);
          const dist = Math.hypot(mx - op.x, my - op.y);
          if (dist < HIT_RADIUS && (!closestOrbit || dist < closestOrbit.dist)) {
            closestOrbit = { dist, deg: this.selectedDegree, quality: q.id, orbitIdx: oi };
          }
        }
      }

      if (closestOrbit) {
        return { type: 'orbit' as const, deg: closestOrbit.deg, quality: closestOrbit.quality, orbitIdx: closestOrbit.orbitIdx };
      }

      // Check anchor center dots (all qualities for selected degree)
      let closestCenter: { dist: number; deg: number; quality: string } | null = null;

      for (const q of QUALITIES) {
        const key = this.anchorKey(this.selectedDegree, q.id);
        const a = this.anchors.get(key);
        if (!a || a.familyIdx !== this.selectedFamily) continue;
        const p = this.cToPixel(a.real, a.imag);
        const dist = Math.hypot(mx - p.x, my - p.y);
        if (dist < HIT_RADIUS && (!closestCenter || dist < closestCenter.dist)) {
          closestCenter = { dist, deg: this.selectedDegree, quality: q.id };
        }
      }

      if (closestCenter) {
        return { type: 'center' as const, deg: closestCenter.deg, quality: closestCenter.quality };
      }

      return { type: 'empty' as const, deg: -1, quality: '', orbitIdx: -1 };
    };

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const pos = getPos(e);
      const hit = hitTest(pos.x, pos.y);
      this.dragStartMx = e.clientX;
      this.dragStartMy = e.clientY;
      this.isDragging = false;

      if (hit.type === 'orbit') {
        // Select the quality if different
        if (hit.quality !== this.selectedQuality) {
          this.selectDegreeQuality(hit.deg, hit.quality);
        }
        this.dragMode = 'orbit';
        this.dragDeg = hit.deg;
        const key = this.anchorKey(hit.deg, hit.quality);
        const a = this.anchors.get(key)!;
        // Calculate initial offset from anchor center (the orbit point that was clicked)
        const angle = hit.orbitIdx * a.beatSpread;
        const rx = a.orbitRadius;
        const ry = a.orbitRadius * a.orbitSkew;
        const px = rx * Math.cos(angle);
        const py = ry * Math.sin(angle);
        const cosR = Math.cos(a.orbitRotation);
        const sinR = Math.sin(a.orbitRotation);
        const startOffsetR = px * cosR - py * sinR;
        const startOffsetI = px * sinR + py * cosR;
        // Save original radius and initial offset for drag
        this.dragStartData = { origRadius: a.orbitRadius, startOffsetR, startOffsetI };
        this.isDragging = true;
        canvas.style.cursor = 'move';
      } else if (hit.type === 'center') {
        // Select the quality if different
        if (hit.quality !== this.selectedQuality) {
          this.selectDegreeQuality(hit.deg, hit.quality);
        }
        this.dragMode = 'center';
        this.dragDeg = hit.deg;
        const key = this.anchorKey(hit.deg, hit.quality);
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

      // Account for object-fit: contain - use actual rendered size
      const containerAspect = rect.width / rect.height;
      let renderWidth: number, renderHeight: number;
      if (containerAspect > 1) {
        // Container wider than square - use height
        renderHeight = rect.height;
        renderWidth = rect.height;
      } else {
        // Container taller than square - use width
        renderWidth = rect.width;
        renderHeight = rect.width;
      }

      const cDx = dx * (b.rMax - b.rMin) / renderWidth;
      const cDy = dy * (b.iMax - b.iMin) / renderHeight;

      const dragKey = this.anchorKey(this.dragDeg, this.selectedQuality);
      const dragAnchor = this.anchors.get(dragKey);

      if (this.dragMode === 'orbit' && dragAnchor?.familyIdx === this.selectedFamily) {
        // Calculate new radius as distance from anchor center to current mouse position
        // Start offset + drag delta = new offset from anchor center
        const newOffsetR = this.dragStartData.startOffsetR + cDx;
        const newOffsetI = this.dragStartData.startOffsetI + cDy;
        const newRadius = Math.sqrt(newOffsetR * newOffsetR + newOffsetI * newOffsetI);

        // Track snap mode for visual feedback
        this.snapMode = e.shiftKey ? 'cross' : 'none';

        // Update orbit radius (skew and rotation preserved)
        dragAnchor.orbitRadius = Math.max(0.01, newRadius);
        this.debouncedDraw();
      } else if (this.dragMode === 'center' && dragAnchor?.familyIdx === this.selectedFamily) {
        dragAnchor.real = this.dragStartData.real + cDx;
        dragAnchor.imag = this.dragStartData.imag + cDy;
        this.debouncedDraw();
      } else if (this.dragMode === 'pan') {
        const pDx = -dx * (this.dragStartData.rMax - this.dragStartData.rMin) / rect.width;
        const pDy = -dy * (this.dragStartData.iMax - this.dragStartData.iMin) / rect.height;
        b.rMin = this.dragStartData.rMin + pDx;
        b.rMax = this.dragStartData.rMax + pDx;
        b.iMin = this.dragStartData.iMin + pDy;
        b.iMax = this.dragStartData.iMax + pDy;
        this.debouncedDrawWithRender();
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

          this.anchors.set(this.currentKey, {
            familyIdx: this.selectedFamily,
            real: c.r,
            imag: c.i,
            orbitRadius: existing?.orbitRadius ?? DEFAULT_ORBIT_RADIUS,
            orbitSkew: existing?.orbitSkew ?? DEFAULT_ORBIT_SKEW,
            orbitRotation: existing?.orbitRotation ?? DEFAULT_ORBIT_ROTATION,
            beatSpread: existing?.beatSpread ?? DEFAULT_BEAT_SPREAD,
            orbitMode: existing?.orbitMode ?? DEFAULT_ORBIT_MODE,
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
      this.snapMode = 'none';
      this.drawOverlay(); // Clear snap guides
    });

    // Zoom with ctrl+wheel (debounced render)
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

      // Immediately show scaled/blurry preview for responsive feel
      this.drawScaledPreview();
      this.drawOverlayMarkers();

      // Debounce the expensive locus render
      if (this.zoomDebounceTimer !== null) {
        clearTimeout(this.zoomDebounceTimer);
      }
      this.zoomDebounceTimer = window.setTimeout(() => {
        this.zoomDebounceTimer = null;
        this.renderLocus();
        this.drawOverlay();
      }, 150);
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
      status.textContent = `${FAMILIES[this.selectedFamily].label} | c = ${c.r.toFixed(4)} + ${c.i.toFixed(4)}i | Shift=axis`;
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
      this.updateClockButtonVisibility();
      this.renderLocus();
      this.startPreview(a);
    } else {
      this.stopPreview();
    }
    this.drawOverlay();
    this.updateAssignments();
  }

  private toggleCellLock(deg: number, quality: string): void {
    const key = this.anchorKey(deg, quality);
    if (this.lockedCells.has(key)) {
      this.lockedCells.delete(key);
    } else {
      this.lockedCells.add(key);
    }
    this.updateLockButtons();
  }

  private toggleRowLock(deg: number): void {
    // Check if all cells in row are locked
    const allLocked = QUALITIES.every(q => this.lockedCells.has(this.anchorKey(deg, q.id)));

    for (const q of QUALITIES) {
      const key = this.anchorKey(deg, q.id);
      if (allLocked) {
        this.lockedCells.delete(key);
      } else {
        this.lockedCells.add(key);
      }
    }
    this.updateLockButtons();
  }

  private updateLockButtons(): void {
    // Update row lock buttons
    this.container.querySelectorAll('.fc-row-lock-btn').forEach(btn => {
      const deg = parseInt((btn as HTMLElement).dataset.deg!);
      const allLocked = QUALITIES.every(q => this.lockedCells.has(this.anchorKey(deg, q.id)));
      const someLocked = QUALITIES.some(q => this.lockedCells.has(this.anchorKey(deg, q.id)));
      btn.textContent = allLocked ? '🔒' : (someLocked ? '🔐' : '🔓');
      btn.classList.toggle('locked', allLocked);
      btn.classList.toggle('partial', someLocked && !allLocked);
    });

    // Update individual cell lock buttons
    this.container.querySelectorAll('.fc-cell-lock').forEach(btn => {
      const el = btn as HTMLElement;
      const deg = parseInt(el.dataset.deg!);
      const quality = el.dataset.quality!;
      const key = this.anchorKey(deg, quality);
      const isLocked = this.lockedCells.has(key);
      btn.textContent = isLocked ? '🔒' : '🔓';
      btn.classList.toggle('locked', isLocked);
    });
  }

  private lockAll(): void {
    for (let deg = 0; deg <= 7; deg++) {
      for (const q of QUALITIES) {
        this.lockedCells.add(this.anchorKey(deg, q.id));
      }
    }
    this.updateLockButtons();
    const status = this.container.querySelector('#fc-status')!;
    status.textContent = 'All cells locked';
  }

  private unlockAll(): void {
    this.lockedCells.clear();
    this.updateLockButtons();
    const status = this.container.querySelector('#fc-status')!;
    status.textContent = 'All cells unlocked';
  }

  private toggleAtlasGrid(): void {
    this.showAtlasGrid = !this.showAtlasGrid;
    const btn = this.container.querySelector('.fc-atlas-btn')!;
    btn.classList.toggle('active', this.showAtlasGrid);
    this.drawOverlay();
    const status = this.container.querySelector('#fc-status')!;
    status.textContent = this.showAtlasGrid ? 'Atlas grid ON - showing Julia previews' : 'Atlas grid OFF';
  }

  /**
   * Sample a Julia set at a c-value and return shape characteristics.
   * Returns: { interiorRatio, boundaryRatio, avgEscape }
   * - interiorRatio: 0-1, how much is filled (bold)
   * - boundaryRatio: 0-1, how much is boundary detail (elegant)
   * - avgEscape: average escape time for exterior (complexity)
   */
  private sampleJuliaShape(family: FractalFamily, cr: number, ci: number): {
    interiorRatio: number;
    boundaryRatio: number;
    avgEscape: number;
  } {
    const sampleSize = 24;  // 24x24 grid
    const range = 3.0;
    const step = range / sampleSize;
    const iter = 80;

    let interior = 0;
    let exterior = 0;
    let boundary = 0;
    let escapeSum = 0;

    for (let py = 0; py < sampleSize; py++) {
      for (let px = 0; px < sampleSize; px++) {
        const fx = -range / 2 + px * step;
        const fy = -range / 2 + py * step;
        const esc = family.julia(fx, fy, cr, ci, iter);

        if (esc === 0) {
          interior++;
        } else {
          exterior++;
          escapeSum += esc;
          // Boundary = escapes slowly (high detail region)
          if (esc > iter * 0.3) boundary++;
        }
      }
    }

    const total = sampleSize * sampleSize;
    return {
      interiorRatio: interior / total,
      boundaryRatio: boundary / total,
      avgEscape: exterior > 0 ? escapeSum / exterior : 0,
    };
  }

  /**
   * Search nearby for a c-value matching target shape characteristics.
   */
  private findShapeMatch(
    family: FractalFamily,
    baseR: number, baseI: number,
    targetInterior: number,  // Target interior ratio
    _targetVariance: number,  // How much variance is acceptable (for future use)
    searchRadius: number,
    samples: number
  ): { real: number; imag: number } {
    let bestR = baseR, bestI = baseI;
    let bestScore = Infinity;

    for (let i = 0; i < samples; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * searchRadius;
      const testR = baseR + Math.cos(angle) * dist;
      const testI = baseI + Math.sin(angle) * dist;

      const shape = this.sampleJuliaShape(family, testR, testI);

      // Score: how close to target interior ratio
      const score = Math.abs(shape.interiorRatio - targetInterior);

      // Bonus for having good boundary detail (elegant shapes)
      const boundaryBonus = shape.boundaryRatio > 0.1 ? -0.05 : 0;

      if (score + boundaryBonus < bestScore) {
        bestScore = score + boundaryBonus;
        bestR = testR;
        bestI = testI;
      }
    }

    return { real: bestR, imag: bestI };
  }

  /**
   * Generate quality variations from the Major anchor for a given degree.
   * Uses escape ratio sampling to find appropriate shapes:
   * - Major: balanced boundary (elegant) ~20-40% interior
   * - Minor: slightly more filled (bolder) ~30-50% interior
   * - Dom7: boundary-rich, complex ~15-35% interior
   * - Min7: between major/minor ~25-45% interior
   * - Dim: sparse, fragmented (dissonant) ~5-20% interior
   * - Aug: unusual, asymmetric ~10-30% interior
   */
  private deriveRowFromMajor(deg: number): void {
    const majorKey = this.anchorKey(deg, 'major');
    const majorAnchor = this.anchors.get(majorKey);

    if (!majorAnchor) {
      const status = this.container.querySelector('#fc-status')!;
      status.textContent = 'No major anchor to derive from — set one first';
      return;
    }

    const family = FAMILIES[majorAnchor.familyIdx];

    // Get major's shape characteristics as baseline
    const majorShape = this.sampleJuliaShape(family, majorAnchor.real, majorAnchor.imag);

    // Quality targets based on research
    // interiorTarget: target fill ratio (bold = high, sparse = low)
    // orbitScale: how much to scale orbits
    // asymmetry: orbit asymmetry (tension)
    const qualityParams: Record<string, {
      interiorTarget: number;
      orbitScale: number;
      asymmetry: number;
      searchRadius: number;
    }> = {
      'major': { interiorTarget: majorShape.interiorRatio, orbitScale: 1.0, asymmetry: 0, searchRadius: 0 },
      'minor': { interiorTarget: majorShape.interiorRatio + 0.1, orbitScale: 1.1, asymmetry: 0.15, searchRadius: 0.08 },
      'dom7':  { interiorTarget: majorShape.interiorRatio - 0.05, orbitScale: 1.3, asymmetry: 0.3, searchRadius: 0.1 },
      'min7':  { interiorTarget: majorShape.interiorRatio + 0.05, orbitScale: 1.15, asymmetry: 0.2, searchRadius: 0.06 },
      'dim':   { interiorTarget: Math.max(0.05, majorShape.interiorRatio - 0.15), orbitScale: 1.5, asymmetry: 0.5, searchRadius: 0.15 },
      'aug':   { interiorTarget: majorShape.interiorRatio - 0.1, orbitScale: 1.25, asymmetry: 0.35, searchRadius: 0.12 },
    };

    // Generate each quality variation
    for (const q of QUALITIES) {
      if (q.id === 'major') continue;  // Keep major as-is

      const key = this.anchorKey(deg, q.id);
      // Skip locked cells
      if (this.lockedCells.has(key)) continue;

      const params = qualityParams[q.id];

      // Search for matching shape near major anchor
      const pos = this.findShapeMatch(
        family,
        majorAnchor.real, majorAnchor.imag,
        params.interiorTarget,
        0.1,  // variance tolerance
        params.searchRadius,
        30    // samples
      );

      // Scale orbit radius
      const newRadius = majorAnchor.orbitRadius * params.orbitScale;

      this.anchors.set(key, {
        familyIdx: majorAnchor.familyIdx,
        real: pos.real,
        imag: pos.imag,
        orbitRadius: newRadius,
        orbitSkew: majorAnchor.orbitSkew * params.orbitScale,
        orbitRotation: majorAnchor.orbitRotation,
        beatSpread: majorAnchor.beatSpread,
        orbitMode: majorAnchor.orbitMode,
      });
    }

    const status = this.container.querySelector('#fc-status')!;
    status.textContent = `Generated variations for ${DEGREE_NAMES[deg]} (major: ${(majorShape.interiorRatio * 100).toFixed(0)}% fill)`;

    this.drawOverlay();
    this.updateAssignments();
  }

  /** Reset current anchor's orbits to cardinal cross pattern (N/E/S/W) */
  private recallOrbits(): void {
    const anchor = this.currentAnchor;
    if (!anchor) {
      const status = this.container.querySelector('#fc-status')!;
      status.textContent = 'No anchor selected';
      return;
    }

    // Calculate offset based on current view scale (about 1/10 of view width)
    const b = this.viewBounds[this.selectedFamily];
    const offset = (b.rMax - b.rMin) * 0.08;

    // Reset orbit radius to default
    anchor.orbitRadius = offset;

    this.drawOverlay();
    this.startPreview(anchor);

    const status = this.container.querySelector('#fc-status')!;
    status.textContent = `Orbit radius reset to ${offset.toFixed(3)}`;
  }

  private copyToClipboard(): void {
    // Generate TypeScript code for the current anchors (major quality only for simplicity)
    const lines: string[] = [];
    lines.push('// Fractal anchor preset');
    lines.push('{');
    lines.push('  id: \'new-preset\',');
    lines.push('  name: \'New Preset\',');
    lines.push('  builtIn: true,');
    lines.push('  anchors: {');

    for (let deg = 0; deg <= 7; deg++) {
      const key = this.anchorKey(deg, 'major');
      const a = this.anchors.get(key);
      if (!a) continue;

      const f = FAMILIES[a.familyIdx];
      lines.push(`    ${deg}: { real: ${a.real.toFixed(4)}, imag: ${a.imag.toFixed(4)}, type: ${f.typeNum}, orbitRadius: ${a.orbitRadius.toFixed(4)}, orbitSkew: ${a.orbitSkew.toFixed(2)}, orbitRotation: ${a.orbitRotation.toFixed(2)}, beatSpread: ${a.beatSpread.toFixed(2)}, orbitMode: '${a.orbitMode}' },`);
    }

    lines.push('  },');
    lines.push('},');

    const code = lines.join('\n');

    navigator.clipboard.writeText(code).then(() => {
      const status = this.container.querySelector('#fc-status')!;
      status.textContent = 'Copied to clipboard!';
      setTimeout(() => {
        status.textContent = 'Click to place anchor | Shift+drag = axis snap';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
      const status = this.container.querySelector('#fc-status')!;
      status.textContent = 'Failed to copy - check console';
    });
  }

  // --- Progression Playback ---

  private readonly PROGRESSIONS: Record<string, { degrees: number[]; qualities: string[] }> = {
    'scale': {
      degrees:   [1, 2, 3, 4, 5, 6, 7, 1],
      qualities: ['major', 'minor', 'minor', 'major', 'major', 'minor', 'dim', 'major'],
    },
    'pop': {
      degrees:   [1, 5, 6, 4],
      qualities: ['major', 'major', 'minor', 'major'],
    },
    'jazz': {
      degrees:   [2, 5, 1],
      qualities: ['minor', 'dom7', 'major'],
    },
    'blues': {
      degrees:   [1, 4, 1, 5, 4, 1],
      qualities: ['dom7', 'dom7', 'dom7', 'dom7', 'dom7', 'dom7'],
    },
    'circle': {
      degrees:   [1, 4, 7, 3, 6, 2, 5, 1],
      qualities: ['major', 'major', 'dim', 'minor', 'minor', 'minor', 'major', 'major'],
    },
  };

  // Scale degree -> semitones from root
  private readonly DEGREE_SEMITONES = [0, 0, 2, 4, 5, 7, 9, 11];

  // Quality -> chord intervals (semitones from root)
  private readonly QUALITY_INTERVALS: Record<string, number[]> = {
    'major': [0, 4, 7],
    'minor': [0, 3, 7],
    'dom7':  [0, 4, 7, 10],
    'min7':  [0, 3, 7, 10],
    'dim':   [0, 3, 6],
    'aug':   [0, 4, 8],
  };

  private toggleProgression(): void {
    if (this.progressionPlaying) {
      this.stopProgression();
    } else {
      this.startProgression();
    }
  }

  private startProgression(): void {
    // Initialize audio context on user gesture
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }

    const select = this.container.querySelector('#fc-progression-select') as HTMLSelectElement;
    const progKey = select.value;
    const prog = this.PROGRESSIONS[progKey];

    this.progressionPlaying = true;
    this.progressionIndex = 0;

    const playBtn = this.container.querySelector('#fc-play-btn')!;
    playBtn.textContent = '⏹️ Stop';

    this.playProgressionStep(prog);
  }

  private stopProgression(): void {
    this.progressionPlaying = false;
    if (this.progressionTimer) {
      clearTimeout(this.progressionTimer);
      this.progressionTimer = null;
    }
    this.stopCurrentChord();

    const playBtn = this.container.querySelector('#fc-play-btn')!;
    playBtn.textContent = '▶️ Play';

    const display = this.container.querySelector('#fc-progression-display')!;
    display.textContent = '';

    // Clear highlighting
    this.container.querySelectorAll('.fc-grid-cell.playing').forEach(el => {
      el.classList.remove('playing');
    });
  }

  private playProgressionStep(prog: { degrees: number[]; qualities: string[] }): void {
    if (!this.progressionPlaying || this.progressionIndex >= prog.degrees.length) {
      this.stopProgression();
      return;
    }

    const deg = prog.degrees[this.progressionIndex];
    const quality = prog.qualities[this.progressionIndex];

    // Update display
    const display = this.container.querySelector('#fc-progression-display')!;
    display.textContent = `${DEGREE_NAMES[deg]} (${quality})`;

    // Highlight current cell
    this.container.querySelectorAll('.fc-grid-cell.playing').forEach(el => {
      el.classList.remove('playing');
    });
    const cell = this.container.querySelector(`.fc-grid-cell[data-deg="${deg}"][data-quality="${quality}"]`);
    if (cell) {
      cell.classList.add('playing');
    }

    // Select and preview this anchor
    this.selectDegreeQuality(deg, quality);

    // Play the chord sound
    this.playChord(deg, quality);

    this.progressionIndex++;

    // Schedule next step
    const beatDur = 60 / this.previewBpm * 1000;  // ms per beat
    this.progressionTimer = window.setTimeout(() => {
      this.playProgressionStep(prog);
    }, beatDur * 2);  // 2 beats per chord
  }

  private playChord(deg: number, quality: string): void {
    if (!this.audioCtx) return;

    this.stopCurrentChord();

    const baseFreq = 220;  // A3
    const rootSemitones = this.DEGREE_SEMITONES[deg];
    const intervals = this.QUALITY_INTERVALS[quality] || [0, 4, 7];

    const now = this.audioCtx.currentTime;
    const attackTime = 0.05;
    const releaseTime = 0.3;
    const duration = (60 / this.previewBpm) * 2;  // 2 beats

    for (const interval of intervals) {
      const freq = baseFreq * Math.pow(2, (rootSemitones + interval) / 12);

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15 / intervals.length, now + attackTime);
      gain.gain.setValueAtTime(0.15 / intervals.length, now + duration - releaseTime);
      gain.gain.linearRampToValueAtTime(0, now + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.1);

      this.currentChordOscs.push(osc);
    }
  }

  private stopCurrentChord(): void {
    for (const osc of this.currentChordOscs) {
      try { osc.stop(); } catch (_e) { /* already stopped */ }
    }
    this.currentChordOscs = [];
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
        orbitRadius: sourceAnchor.orbitRadius,
        orbitSkew: sourceAnchor.orbitSkew,
        orbitRotation: sourceAnchor.orbitRotation,
        beatSpread: sourceAnchor.beatSpread,
        orbitMode: sourceAnchor.orbitMode,
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
    this.markAllThumbnailsDirty();
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
              orbitRadius: a.orbitRadius ?? DEFAULT_ORBIT_RADIUS,
              orbitSkew: a.orbitSkew ?? DEFAULT_ORBIT_SKEW,
              orbitRotation: a.orbitRotation ?? DEFAULT_ORBIT_ROTATION,
              beatSpread: a.beatSpread ?? DEFAULT_BEAT_SPREAD,
              orbitMode: a.orbitMode === 'beats' ? 'beats' : DEFAULT_ORBIT_MODE,
            };
            // Apply to all qualities for this degree
            for (const q of QUALITIES) {
              this.anchors.set(this.anchorKey(deg, q.id), {
                familyIdx: anchor.familyIdx,
                real: anchor.real,
                imag: anchor.imag,
                orbitRadius: anchor.orbitRadius,
                orbitSkew: anchor.orbitSkew,
                orbitRotation: anchor.orbitRotation,
                beatSpread: anchor.beatSpread,
                orbitMode: anchor.orbitMode,
              });
            }
          }
        }
      }
    } else {
      this.resetToDefaults();
      return; // resetToDefaults calls syncOrbitSliders
    }
    this.syncOrbitSliders();
  }

  private resetToDefaults(): void {
    this.anchors.clear();
    this.markAllThumbnailsDirty();
    for (let deg = 0; deg <= 7; deg++) {
      const p = PRESET_ANCHORS[deg];
      const fi = TYPE_TO_FAMILY[p.type];
      const anchor: InternalAnchor = {
        familyIdx: fi,
        real: p.real,
        imag: p.imag,
        orbitRadius: p.orbitRadius,
        orbitSkew: p.orbitSkew ?? DEFAULT_ORBIT_SKEW,
        orbitRotation: p.orbitRotation ?? DEFAULT_ORBIT_ROTATION,
        beatSpread: p.beatSpread ?? DEFAULT_BEAT_SPREAD,
        orbitMode: p.orbitMode === 'beats' ? 'beats' : DEFAULT_ORBIT_MODE,
      };
      // Apply to all qualities for this degree
      for (const q of QUALITIES) {
        this.anchors.set(this.anchorKey(deg, q.id), {
          familyIdx: anchor.familyIdx,
          real: anchor.real,
          imag: anchor.imag,
          orbitRadius: anchor.orbitRadius,
          orbitSkew: anchor.orbitSkew,
          orbitRotation: anchor.orbitRotation,
          beatSpread: anchor.beatSpread,
          orbitMode: anchor.orbitMode,
        });
      }
    }
    this.syncOrbitSliders();
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
        orbitRadius: a.orbitRadius,
        orbitSkew: a.orbitSkew,
        orbitRotation: a.orbitRotation,
        beatSpread: a.beatSpread,
        orbitMode: a.orbitMode,
      };
    }
    saveFractalAnchors(out);
    if (this.onSave) this.onSave();
    this.hide();
  }

  private generateSurprise(): void {
    this.markAllThumbnailsDirty();
    // Use the currently selected family for all anchors
    const fi = this.selectedFamily;
    const degreeTension = [0.1, 0.1, 0.35, 0.5, 0.3, 0.7, 0.45, 0.85];

    // Count how many cells will be regenerated
    let regeneratedCount = 0;

    // Generate surprise anchors for unlocked cells only
    for (let deg = 0; deg <= 7; deg++) {
      for (const q of QUALITIES) {
        const key = this.anchorKey(deg, q.id);

        // Skip locked cells
        if (this.lockedCells.has(key)) continue;

        regeneratedCount++;
        const temp = this.degreeTemperatures.get(deg) ?? 0.5;

        // Get existing anchor or use default position
        const existing = this.anchors.get(key);
        const pt = this.findBoundaryPointWithTemp(fi, existing, temp);

        const tension = degreeTension[deg];
        const orbitRadius = (0.06 + tension * 0.25) * (0.5 + temp) * (0.8 + Math.random() * 0.4 * temp);
        // Random skew: low temp = more circular, high temp = more elliptical
        const orbitSkew = 1.0 + (Math.random() - 0.5) * temp * 1.0;
        // Random rotation
        const orbitRotation = Math.random() * Math.PI * 2 * temp;
        // Random beat spread: low temp = 90°, high temp = random 30°-90°
        const beatSpread = (0.5 + 0.5 * (1 - temp)) * Math.PI / 2 + Math.random() * temp * Math.PI / 4;
        // Random orbit mode at high temp
        const orbitMode: 'orbit' | 'beats' = temp > 0.7 && Math.random() > 0.5 ? 'beats' : 'orbit';

        this.anchors.set(key, { familyIdx: fi, real: pt.r, imag: pt.i, orbitRadius, orbitSkew, orbitRotation, beatSpread, orbitMode });
      }
    }

    // Update status to show what was regenerated
    const status = this.container.querySelector('#fc-status')!;
    const familyName = FAMILIES[fi].label;
    const totalCells = 8 * QUALITIES.length;
    if (regeneratedCount === 0) {
      status.textContent = 'All cells locked — unlock some to regenerate';
    } else if (this.lockedCells.size > 0) {
      status.textContent = `Regenerated ${regeneratedCount} ${familyName} (${this.lockedCells.size} locked)`;
    } else {
      status.textContent = `Generated ${familyName} anchors for all ${totalCells} cells`;
    }

    this.syncOrbitSliders();
    this.drawOverlay();

    // Select first unlocked cell, or keep current if all locked
    for (let deg = 1; deg <= 7; deg++) {
      for (const q of QUALITIES) {
        if (!this.lockedCells.has(this.anchorKey(deg, q.id))) {
          this.selectDegreeQuality(deg, q.id);
          // Re-mark dirty and update to ensure all thumbnails render
          this.markAllThumbnailsDirty();
          this.updateAssignments();
          return;
        }
      }
    }
    // If all locked, still update assignments
    this.updateAssignments();
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

  /** Find boundary point with temperature control - low temp stays near existing */
  private findBoundaryPointWithTemp(
    familyIdx: number,
    existing: InternalAnchor | undefined,
    temp: number
  ): { r: number; i: number } {
    // High temp or no existing: full random search
    if (temp > 0.7 || !existing) {
      return this.findBoundaryPoint(familyIdx);
    }

    const f = FAMILIES[familyIdx];
    const b = f.bounds;
    const iter = 150;
    const probeR = 0.03;

    // Search radius based on temperature (0 = very close, 1 = full bounds)
    const searchRadius = temp * Math.max(b.rMax - b.rMin, b.iMax - b.iMin) * 0.5;

    let bestR = existing.real, bestI = existing.imag, bestScore = -1;

    for (let attempt = 0; attempt < 200; attempt++) {
      // Sample around existing position
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * searchRadius;
      const cr = Math.max(b.rMin, Math.min(b.rMax, existing.real + dist * Math.cos(angle)));
      const ci = Math.max(b.iMin, Math.min(b.iMax, existing.imag + dist * Math.sin(angle)));

      const probes: [number, number][] = [
        [cr, ci],
        [cr + probeR, ci], [cr - probeR, ci],
        [cr, ci + probeR], [cr, ci - probeR],
      ];

      let interior = 0, exterior = 0, escSum = 0;
      for (const [pr, pi] of probes) {
        const esc = f.locus(pr, pi, iter);
        if (esc === 0) interior++;
        else { exterior++; escSum += esc; }
      }

      if (interior === 0 || exterior === 0) continue;
      const mixScore = Math.min(interior, exterior) / probes.length;
      const avgEsc = exterior > 0 ? escSum / exterior : 0;
      const escBonus = avgEsc > 5 && avgEsc < iter * 0.7 ? 1.2 : 1.0;
      const score = mixScore * escBonus;

      if (score > bestScore) {
        bestScore = score;
        bestR = cr;
        bestI = ci;
      }
    }

    return { r: bestR, i: bestI };
  }

  private getLocusCacheKey(): string {
    const b = this.viewBounds[this.selectedFamily];
    // Round to 2 decimals for cache stability
    return `${this.selectedFamily}:${b.rMin.toFixed(2)}:${b.rMax.toFixed(2)}:${b.iMin.toFixed(2)}:${b.iMax.toFixed(2)}`;
  }

  private renderLocus(): void {
    const cacheKey = this.getLocusCacheKey();
    const cached = this.locusCache.get(cacheKey);
    if (cached) {
      const ctx = this.locusBuffer.getContext('2d')!;
      ctx.drawImage(cached, 0, 0);
      return;
    }

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

    // Cache the result
    const cacheCanvas = document.createElement('canvas');
    cacheCanvas.width = PANEL_SIZE;
    cacheCanvas.height = PANEL_SIZE;
    cacheCanvas.getContext('2d')!.drawImage(this.locusBuffer, 0, 0);
    this.locusCache.set(cacheKey, cacheCanvas);

    // Limit cache size
    if (this.locusCache.size > 20) {
      const firstKey = this.locusCache.keys().next().value;
      if (firstKey) this.locusCache.delete(firstKey);
    }

    // Update rendered bounds tracker
    this.renderedBounds[this.selectedFamily] = { ...this.viewBounds[this.selectedFamily] };
  }

  /** Draw scaled/blurry preview during zoom (before full re-render) */
  private drawScaledPreview(): void {
    const view = this.viewBounds[this.selectedFamily];
    const rendered = this.renderedBounds[this.selectedFamily];

    // Calculate source rect in the buffer that corresponds to new view
    const srcX = (view.rMin - rendered.rMin) / (rendered.rMax - rendered.rMin) * PANEL_SIZE;
    const srcY = (view.iMin - rendered.iMin) / (rendered.iMax - rendered.iMin) * PANEL_SIZE;
    const srcW = (view.rMax - view.rMin) / (rendered.rMax - rendered.rMin) * PANEL_SIZE;
    const srcH = (view.iMax - view.iMin) / (rendered.iMax - rendered.iMin) * PANEL_SIZE;

    // Draw scaled buffer to locus canvas
    this.locusCtx.imageSmoothingEnabled = true;
    this.locusCtx.imageSmoothingQuality = 'low';
    this.locusCtx.fillStyle = '#081020';
    this.locusCtx.fillRect(0, 0, PANEL_SIZE, PANEL_SIZE);
    this.locusCtx.drawImage(
      this.locusBuffer,
      srcX, srcY, srcW, srcH,
      0, 0, PANEL_SIZE, PANEL_SIZE
    );
  }

  private drawOverlay(): void {
    this.locusCtx.drawImage(this.locusBuffer, 0, 0);
    this.drawOverlayMarkers();
  }

  /** Debounced draw for drag operations */
  private debouncedDraw(): void {
    if (this.dragDebounceTimer !== null) {
      cancelAnimationFrame(this.dragDebounceTimer);
    }
    this.dragDebounceTimer = requestAnimationFrame(() => {
      this.dragDebounceTimer = null;
      this.drawOverlay();
    });
  }

  /** Debounced draw with locus render for pan operations */
  private debouncedDrawWithRender(): void {
    if (this.dragDebounceTimer !== null) {
      cancelAnimationFrame(this.dragDebounceTimer);
    }
    // Show scaled preview immediately
    this.drawScaledPreview();
    this.drawOverlayMarkers();
    // Debounce full render
    if (this.zoomDebounceTimer !== null) {
      clearTimeout(this.zoomDebounceTimer);
    }
    this.zoomDebounceTimer = window.setTimeout(() => {
      this.zoomDebounceTimer = null;
      this.renderLocus();
      this.drawOverlay();
    }, 100);
  }

  /** Draw anchor markers on the locus canvas (assumes background already drawn) */
  private drawOverlayMarkers(): void {
    // Draw atlas grid if enabled
    if (this.showAtlasGrid) {
      const GRID_SIZE = 8; // 8x8 grid of thumbnails
      const THUMB_DRAW_SIZE = PANEL_SIZE / GRID_SIZE;
      const b = this.viewBounds[this.selectedFamily];
      const f = FAMILIES[this.selectedFamily];
      const [colR, colG, colB] = this.parseHexColor(DEGREE_COLORS[this.selectedDegree]);

      for (let gy = 0; gy < GRID_SIZE; gy++) {
        for (let gx = 0; gx < GRID_SIZE; gx++) {
          // Calculate c-value at grid center
          const cr = b.rMin + (gx + 0.5) / GRID_SIZE * (b.rMax - b.rMin);
          const ci = b.iMin + (gy + 0.5) / GRID_SIZE * (b.iMax - b.iMin);

          // Render small Julia preview
          const thumbSize = 32;
          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = thumbSize;
          thumbCanvas.height = thumbSize;
          const ctx = thumbCanvas.getContext('2d')!;
          const img = ctx.createImageData(thumbSize, thumbSize);
          const d = img.data;
          const range = 3.6, half = range / 2, step = range / thumbSize;
          const iter = 40;

          for (let py = 0; py < thumbSize; py++) {
            for (let px = 0; px < thumbSize; px++) {
              const fx = -half + px * step;
              const fy = -half + py * step;
              const esc = f.julia(fx, fy, cr, ci, iter);
              const idx = (py * thumbSize + px) * 4;
              if (esc === 0) {
                d[idx] = d[idx + 1] = d[idx + 2] = 0;
              } else {
                const t = Math.sqrt(esc / iter);
                d[idx] = Math.min(255, Math.round(t * colR));
                d[idx + 1] = Math.min(255, Math.round(t * colG));
                d[idx + 2] = Math.min(255, Math.round(t * colB));
              }
              d[idx + 3] = 200; // Semi-transparent
            }
          }
          ctx.putImageData(img, 0, 0);

          // Draw on locus
          const drawX = gx * THUMB_DRAW_SIZE;
          const drawY = gy * THUMB_DRAW_SIZE;
          this.locusCtx.drawImage(thumbCanvas, drawX, drawY, THUMB_DRAW_SIZE, THUMB_DRAW_SIZE);

          // Grid lines
          this.locusCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          this.locusCtx.strokeRect(drawX, drawY, THUMB_DRAW_SIZE, THUMB_DRAW_SIZE);
        }
      }
    }

    // Draw cross guide if shift-dragging orbit
    if (this.dragMode === 'orbit' && this.snapMode === 'cross') {
      const dragKey = this.anchorKey(this.dragDeg, this.selectedQuality);
      const dragAnchor = this.anchors.get(dragKey);
      if (dragAnchor) {
        const center = this.cToPixel(dragAnchor.real, dragAnchor.imag);
        this.locusCtx.save();
        this.locusCtx.setLineDash([4, 4]);
        this.locusCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        this.locusCtx.lineWidth = 1;
        this.locusCtx.beginPath();
        this.locusCtx.moveTo(0, center.y);
        this.locusCtx.lineTo(PANEL_SIZE, center.y);
        this.locusCtx.moveTo(center.x, 0);
        this.locusCtx.lineTo(center.x, PANEL_SIZE);
        this.locusCtx.stroke();
        this.locusCtx.restore();
      }
    }

    // Degree colors for visual distinction
    const degreeColors = [
      '#888888', // 0 - gray (root)
      '#ff6666', // 1 - red
      '#ffaa44', // 2 - orange
      '#ffff66', // 3 - yellow
      '#66ff66', // 4 - green
      '#66ffff', // 5 - cyan
      '#6688ff', // 6 - blue
      '#ff66ff', // 7 - magenta
    ];

    // Draw all anchors for degrees 1-7 that belong to current family
    // Draw non-selected first, then selected on top
    for (let pass = 0; pass < 2; pass++) {
      for (let deg = 1; deg <= 7; deg++) {
        for (const q of QUALITIES) {
          const key = this.anchorKey(deg, q.id);
          const a = this.anchors.get(key);
          if (!a || a.familyIdx !== this.selectedFamily) continue;

          const isSelectedDeg = deg === this.selectedDegree;
          const isSelectedQuality = q.id === this.selectedQuality;
          const isSelected = isSelectedDeg && isSelectedQuality;

          // Pass 0: draw non-selected, Pass 1: draw selected
          if (pass === 0 && isSelected) continue;
          if (pass === 1 && !isSelected) continue;

          const p = this.cToPixel(a.real, a.imag);
          const col = degreeColors[deg];
          const alpha = isSelectedDeg ? (isSelectedQuality ? 1.0 : 0.7) : 0.3;

          // Draw orbit visualization - mode determines continuous ellipse vs discrete points
          const rx = a.orbitRadius;
          const ry = a.orbitRadius * a.orbitSkew;
          const cosR = Math.cos(a.orbitRotation);
          const sinR = Math.sin(a.orbitRotation);
          const isOrbitMode = a.orbitMode === 'orbit';

          this.locusCtx.globalAlpha = alpha;

          // In orbit mode, draw continuous ellipse path
          if (isOrbitMode) {
            this.locusCtx.beginPath();
            const segments = 64;
            for (let i = 0; i <= segments; i++) {
              const angle = (i / segments) * Math.PI * 2;
              const ex = rx * Math.cos(angle);
              const ey = ry * Math.sin(angle);
              const dr = ex * cosR - ey * sinR;
              const di = ex * sinR + ey * cosR;
              const ep = this.cToPixel(a.real + dr, a.imag + di);
              if (i === 0) this.locusCtx.moveTo(ep.x, ep.y);
              else this.locusCtx.lineTo(ep.x, ep.y);
            }
            this.locusCtx.strokeStyle = col;
            this.locusCtx.lineWidth = isSelected ? 2 : 1;
            this.locusCtx.stroke();
          }

          // Draw beat points (with lines in beats mode) - only for selected degree
          if (isSelectedDeg) {
            for (let oi = 0; oi < 4; oi++) {
              const angle = oi * a.beatSpread;
              const px = rx * Math.cos(angle);
              const py = ry * Math.sin(angle);
              const dr = px * cosR - py * sinR;
              const di = px * sinR + py * cosR;
              const op = this.cToPixel(a.real + dr, a.imag + di);

              if (!isOrbitMode) {
                this.locusCtx.beginPath();
                this.locusCtx.moveTo(p.x, p.y);
                this.locusCtx.lineTo(op.x, op.y);
                this.locusCtx.strokeStyle = ORBIT_COLORS[oi];
                this.locusCtx.lineWidth = isSelected ? 1.5 : 1;
                this.locusCtx.stroke();
              }

              this.locusCtx.beginPath();
              this.locusCtx.arc(op.x, op.y, isSelected ? 5 : 3, 0, Math.PI * 2);
              this.locusCtx.fillStyle = ORBIT_COLORS[oi];
              this.locusCtx.fill();

              if (isSelected) {
                this.locusCtx.globalAlpha = 1;
                this.locusCtx.font = 'bold 9px monospace';
                this.locusCtx.lineWidth = 2;
                this.locusCtx.strokeStyle = '#000';
                this.locusCtx.strokeText(ORBIT_LABELS[oi], op.x + 6, op.y - 4);
                this.locusCtx.fillStyle = ORBIT_COLORS[oi];
                this.locusCtx.fillText(ORBIT_LABELS[oi], op.x + 6, op.y - 4);
                this.locusCtx.globalAlpha = alpha;
              }
            }
          }

          // Center dot
          this.locusCtx.beginPath();
          this.locusCtx.arc(p.x, p.y, isSelected ? 7 : (isSelectedDeg ? 5 : 4), 0, Math.PI * 2);
          this.locusCtx.fillStyle = col;
          this.locusCtx.fill();
          if (isSelected) {
            this.locusCtx.globalAlpha = 1;
            this.locusCtx.strokeStyle = '#fff';
            this.locusCtx.lineWidth = 2;
            this.locusCtx.stroke();
          }

          // Degree label
          this.locusCtx.globalAlpha = 1;
          this.locusCtx.font = isSelected ? 'bold 11px monospace' : '9px monospace';
          this.locusCtx.lineWidth = 3;
          this.locusCtx.strokeStyle = '#000';
          const label = `${deg}${q.label}`;
          this.locusCtx.strokeText(label, p.x + 8, p.y - 6);
          this.locusCtx.fillStyle = col;
          this.locusCtx.fillText(label, p.x + 8, p.y - 6);
        }
      }
    }
    this.locusCtx.globalAlpha = 1;
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
    // Update each grid cell to show if it has an anchor and render thumbnail
    this.container.querySelectorAll('.fc-grid-cell').forEach(cell => {
      const el = cell as HTMLElement;
      const deg = parseInt(el.dataset.deg!);
      const quality = el.dataset.quality!;
      const key = this.anchorKey(deg, quality);
      const anchor = this.anchors.get(key);
      const hasAnchor = !!anchor;
      el.classList.toggle('has-anchor', hasAnchor);

      // Get or create the canvas for this cell
      let canvas = el.querySelector('canvas') as HTMLCanvasElement | null;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = FractalConfigPanel.THUMB_SIZE;
        canvas.height = FractalConfigPanel.THUMB_SIZE;
        canvas.className = 'fc-cell-thumb';
        el.innerHTML = '';  // Remove the dot
        el.appendChild(canvas);
      }

      if (anchor) {
        // Only re-render if thumbnails are dirty (uses cache otherwise)
        if (this.allThumbnailsDirty) {
          const thumbData = this.getOrRenderThumbnail(anchor, deg);
          const ctx = canvas.getContext('2d')!;
          ctx.putImageData(thumbData, 0, 0);
        }
        canvas.style.opacity = '1';
      } else {
        // Clear the canvas
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, FractalConfigPanel.THUMB_SIZE, FractalConfigPanel.THUMB_SIZE);
        canvas.style.opacity = '0.3';
      }
    });

    // Clear dirty flag
    this.allThumbnailsDirty = false;
  }

  private markAllThumbnailsDirty(): void {
    this.allThumbnailsDirty = true;
    this.thumbnailCache.clear();
  }

  private getThumbnailKey(anchor: InternalAnchor, deg: number): string {
    // Round to 3 decimals to allow some cache hits when fine-tuning
    // Include degree for color differentiation
    const r = anchor.real.toFixed(3);
    const i = anchor.imag.toFixed(3);
    return `${deg}:${anchor.familyIdx}:${r}:${i}`;
  }

  private parseHexColor(hex: string): [number, number, number] {
    // Parse "#rrggbb" or "#rgb" format
    const h = hex.replace('#', '');
    if (h.length === 3) {
      return [
        parseInt(h[0] + h[0], 16),
        parseInt(h[1] + h[1], 16),
        parseInt(h[2] + h[2], 16),
      ];
    }
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16),
    ];
  }

  private getOrRenderThumbnail(anchor: InternalAnchor, deg: number): ImageData {
    const key = this.getThumbnailKey(anchor, deg);
    let cached = this.thumbnailCache.get(key);
    if (cached) return cached;

    // Parse degree color
    const [colR, colG, colB] = this.parseHexColor(DEGREE_COLORS[deg] || '#888888');

    // Render at 2x resolution for antialiasing (supersampling)
    const size = FractalConfigPanel.THUMB_SIZE;
    const ssSize = size * 2;  // 2x supersample
    const iter = FractalConfigPanel.THUMB_ITER;
    const f = FAMILIES[anchor.familyIdx];
    const range = 3.6, half = range / 2;
    const step = range / ssSize;

    // Render at 2x resolution
    const ssData = new Float32Array(ssSize * ssSize * 3);
    for (let py = 0; py < ssSize; py++) {
      for (let px = 0; px < ssSize; px++) {
        const fx = -half + px * step;
        const fy = -half + py * step;
        const esc = f.julia(fx, fy, anchor.real, anchor.imag, iter);
        const idx = (py * ssSize + px) * 3;
        if (esc === 0) {
          ssData[idx] = ssData[idx + 1] = ssData[idx + 2] = 0;
        } else {
          const t = Math.sqrt(esc / iter);
          ssData[idx] = t * colR;
          ssData[idx + 1] = t * colG;
          ssData[idx + 2] = t * colB;
        }
      }
    }

    // Downsample 2x2 blocks with averaging for antialiasing
    const data = new Uint8ClampedArray(size * size * 4);
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const sx = px * 2, sy = py * 2;
        // Average 2x2 block
        let r = 0, g = 0, b = 0;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const sidx = ((sy + dy) * ssSize + (sx + dx)) * 3;
            r += ssData[sidx];
            g += ssData[sidx + 1];
            b += ssData[sidx + 2];
          }
        }
        const idx = (py * size + px) * 4;
        data[idx] = Math.min(255, Math.round(r / 4));
        data[idx + 1] = Math.min(255, Math.round(g / 4));
        data[idx + 2] = Math.min(255, Math.round(b / 4));
        data[idx + 3] = 255;
      }
    }

    cached = new ImageData(data, size, size);
    this.thumbnailCache.set(key, cached);

    // Limit cache size
    if (this.thumbnailCache.size > 200) {
      const firstKey = this.thumbnailCache.keys().next().value;
      if (firstKey) this.thumbnailCache.delete(firstKey);
    }

    return cached;
  }

  // --- Preview Animation ---

  private startPreview(anchor: InternalAnchor): void {
    this.stopPreview();
    this.previewPhase = 0;
    this.previewLastTime = 0;

    let frameCount = 0;
    const loop = (time: number) => {
      frameCount++;
      // Only render every 3rd frame to reduce CPU load
      if (frameCount % 3 !== 0) {
        this.previewAnim = requestAnimationFrame(loop);
        return;
      }

      const dt = this.previewLastTime === 0 ? 0.05 : Math.min((time - this.previewLastTime) / 1000, 0.1);
      this.previewLastTime = time;

      const beatDur = 60 / this.previewBpm;
      this.previewPhase += dt;
      const beatFloat = this.previewPhase / beatDur;
      const beatFrac = beatFloat - Math.floor(beatFloat);
      const t = Math.sin(Math.PI * beatFrac);
      const beatIdx = Math.floor(beatFloat) % 4;

      // Choose angle based on orbit mode
      // 'orbit': continuous motion, 'beats': snap to beat points
      const orbitAngle = anchor.orbitMode === 'beats'
        ? beatIdx * anchor.beatSpread
        : beatFloat * Math.PI * 0.5;
      const rx = anchor.orbitRadius;
      const ry = anchor.orbitRadius * anchor.orbitSkew;
      const px = rx * Math.cos(orbitAngle) * t;
      const py = ry * Math.sin(orbitAngle) * t;
      const cosR = Math.cos(anchor.orbitRotation);
      const sinR = Math.sin(anchor.orbitRotation);
      const cr = anchor.real + px * cosR - py * sinR;
      const ci = anchor.imag + px * sinR + py * cosR;

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
    this.updateClockButtonVisibility();
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
