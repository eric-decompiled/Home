/**
 * Fractal Configuration Panel
 *
 * Interactive editor for fractal anchor points per harmonic degree.
 * Each anchor defines a c-plane position and 4 orbit offsets for beat-synchronized motion.
 */

import { loadFractalAnchors, saveFractalAnchors, DEFAULT_ANCHORS, type FractalAnchors } from './state.ts';
import { TWO_PI } from './effects/effect-utils.ts';
import { createModal } from './modal.ts';

// --- User Presets ---

export interface UserPreset {
  id: string;
  name: string;
  anchors: FractalAnchors;
  createdAt: number;
}

const PRESETS_STORAGE_KEY = 'fractal-user-presets';

export function loadUserPresets(): UserPreset[] {
  try {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveUserPresets(presets: UserPreset[]): void {
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

// Built-in presets (not deletable)
const BUILTIN_PRESETS: UserPreset[] = [
  {
    id: 'builtin-fissure',
    name: 'Fissure',
    createdAt: 0,
    anchors: {
      "0": { "real": -0.00875512359772088, "imag": 0.9909881061665688, "type": 13, "orbitRadius": 0.035055250609613044, "orbitSkew": 1.2, "orbitRotation": 2.1489699315735677, "beatSpread": 2, "viewZoom": 8.010019261116824 },
      "1": { "real": -1.2962329588644264, "imag": -0.0680529188084047, "type": 0, "orbitRadius": 0.013965968219907924, "orbitSkew": 1, "orbitRotation": 2.3155015023745777, "beatSpread": 1.57, "viewZoom": 14.290641121650348 },
      "2": { "real": -0.045300277903361774, "imag": -0.8227197071542168, "type": 0, "orbitRadius": 0.02109600030052693, "orbitSkew": 0.6, "orbitRotation": 0.6688600567162444, "beatSpread": 0.4, "viewZoom": 5.511366693189319 },
      "3": { "real": -0.481762, "imag": -0.531657, "type": 0, "orbitRadius": 0.022, "orbitSkew": 0.75, "orbitRotation": 1.8, "beatSpread": 0.55, "viewZoom": 5 },
      "4": { "real": 0.5911659705487153, "imag": -0.783764651439258, "type": 4, "orbitRadius": 0.04356342172247925, "orbitSkew": 1.4, "orbitRotation": 4.742017641171973, "beatSpread": 1.2, "viewZoom": 8.325385800611308 },
      "5": { "real": -0.34289194173663384, "imag": -0.4702064795412502, "type": 5, "orbitRadius": 0.03876615673630358, "orbitSkew": 0.6, "orbitRotation": -2.5488952488547305, "beatSpread": 0.3999999999999999, "viewZoom": 5.83555027198115 },
      "6": { "real": -1.3471808747815495, "imag": -0.01712273973692982, "type": 4, "orbitRadius": 0.0165325876540038, "orbitSkew": 1.4, "orbitRotation": 2.4668517113662434, "beatSpread": 0.79, "viewZoom": 10.169887303745519 },
      "7": { "real": -0.3612723048924612, "imag": 0.5777599512900581, "type": 5, "orbitRadius": 0.08757644488626272, "orbitSkew": 1.8, "orbitRotation": 0.36953099521330013, "beatSpread": 1, "viewZoom": 4.744486529187173 },
      "8": { "real": -0.4081790517201934, "imag": -0.6080477138728951, "type": 0, "orbitRadius": 0.015883605384203563, "orbitSkew": 1, "orbitRotation": 5.181427283801671, "beatSpread": 1.57, "viewZoom": 12.966226416885256 },
      "9": { "real": -0.123, "imag": 0.745, "type": 13, "orbitRadius": 0.03249160384216757, "orbitSkew": 1.2, "orbitRotation": 6.079701263919151, "beatSpread": 2, "viewZoom": 3.844852001534486 },
      "10": { "real": -0.058364589944509326, "imag": 0.8996927972756301, "type": 0, "orbitRadius": 0.040710441705342236, "orbitSkew": 1.6, "orbitRotation": 0.06085796415835698, "beatSpread": 1.57, "viewZoom": 13.392062904097315 },
      "11": { "real": -0.123, "imag": 0.745, "type": 0, "orbitRadius": 0.3845531682138359, "orbitSkew": 1, "orbitRotation": 1.792878228700377, "beatSpread": 1.57, "viewZoom": 2.197173594385127 }
    }
  }
];

// --- Constants ---

const PANEL_SIZE = 500;
const LOCUS_ITER = 150;  // Reduced for performance
const JULIA_SIZE = 200;  // Reduced for performance
const JULIA_ITER = 100;  // Reduced for performance
const LUT_SIZE = 2048;

// Pitch class names (0-11: C, C#, D, ..., B)
const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
// Note colors from palette 0.65 position (synced with palettes.ts)
const NOTE_COLORS = [
  '#96A0AF', // C - Silver Grey
  '#D2640A', // C# - Orange
  '#5A1982', // D - Dark Purple
  '#C391E1', // D# - Pastel Violet
  '#0F3C8C', // E - Deep Blue
  '#AF730A', // F - Deep Gold
  '#EBD71E', // F# - Yellow
  '#145F23', // G - Forest Green
  '#1996A0', // G# - Teal
  '#AA1914', // A - Deep Red
  '#E1826E', // A# - Coral
  '#8CC823', // B - Lime
];
const ORBIT_COLORS = ['#ff6666', '#66bbff', '#66ff99', '#ffcc44'];
const ORBIT_LABELS = ['1', '2', '3', '4'];

// Simplified: one anchor per pitch class (no chord quality variants)
const QUALITIES = [{ id: 'major', label: '' }];  // Single quality for compatibility

// --- Fractal Families ---

interface FractalFamily {
  id: string;
  label: string;
  typeNum: number;
  bounds: { rMin: number; rMax: number; iMin: number; iMax: number };
  locus: (cr: number, ci: number, maxIter: number, z0r?: number, z0i?: number) => number;
  julia: (fx: number, fy: number, jR: number, jI: number, maxIter: number) => number;
}

// Family information for the info modal
interface FamilyInfo {
  formula: string;
  year: string;
  creator: string;
  category: string;
  description: string;
  traits: string[];
  hotspots: string[];
  tips: string;
  related: string[];
  tags: string[];  // geometry/style tags for filtering
  colorNotes: number[];  // recommended note indices (0-11) for this family
}

const FAMILY_INFO: Record<string, FamilyInfo> = {
  'classic': {
    formula: 'z → z² + c',
    year: '1980',
    creator: 'Benoit Mandelbrot',
    category: 'Quadratic Polynomial',
    description: 'The original Mandelbrot/Julia set - the most famous fractal in mathematics. Discovered while Mandelbrot was studying iterative functions at IBM. It exhibits infinite complexity at all scales and has become an icon of mathematical beauty and chaos theory.',
    traits: ['Smooth, rounded bulbs', 'Cardioid main body', 'Infinite spiraling detail', 'Self-similar at all zoom levels', 'Connected interior'],
    hotspots: ['c = -0.75 (period-2 bulb)', 'c = -0.12 + 0.74i (spiral)', 'c = 0.28 + 0.01i (dendrite)', 'c = -1.0 (basilica)'],
    tips: 'The boundary between black and color contains all the interesting detail. Look for "mini-brots" - tiny copies of the full set hidden in the spirals.',
    related: ['Tricorn', 'Burning Ship'],
    tags: ['smooth', 'organic', 'symmetric'],
    colorNotes: [], // versatile - works with any color
  },
  'burning-ship': {
    formula: 'z → (|Re(z)| + i|Im(z)|)² + c',
    year: '1992',
    creator: 'Michael Michelitsch & Otto Rössler',
    category: 'Absolute Value Variant',
    description: 'Takes absolute values of real and imaginary parts before squaring, breaking the smooth symmetry of the classic set. The main structure resembles a burning ship with flames rising from its deck, hence the name. One of the most visually striking fractal variants.',
    traits: ['Sharp angular edges', 'Asymmetric structure', 'Ship-like main body', 'Flame-like tendrils', 'Jagged coastlines'],
    hotspots: ['c = -1.76 - 0.04i (ship hull)', 'c = -1.94 + 0.0i (flames)', 'c = -0.5 - 0.5i (spirals)'],
    tips: 'The ship is upside down in standard orientation. Zoom into the "flames" rising from the mast for incredible detail. The antenna regions contain mini-ships.',
    related: ['PerpBurn', 'Celtic', 'Buffalo'],
    tags: ['angular', 'flame', 'dense'],
    colorNotes: [9, 5, 1], // A (red), F (gold), C# (orange) - fire colors
  },
  'buffalo': {
    formula: 'z → |z|² - |z| + c',
    year: '~2000s',
    creator: 'Fractal community',
    category: 'Absolute Value Variant',
    description: 'A hybrid formula that subtracts the absolute magnitude of z after squaring. Creates distinctive horn-like protrusions that give it a buffalo or ox-like appearance. Known for its organic, almost biological-looking structures.',
    traits: ['Horn-like extensions', 'Organic asymmetry', 'Dense interior detail', 'Complex boundary', 'Biological appearance'],
    hotspots: ['c = -0.5 + 0.5i (horns)', 'c = -1.0 + 0.0i (body)', 'c = 0.0 - 0.8i (tail)'],
    tips: 'Look for the "horns" emerging from the main body. The interior contains dense, hair-like structures. Works well with warm color palettes.',
    related: ['Burning Ship', 'Celtic', 'PerpBurn'],
    tags: ['organic', 'dense', 'intricate'],
    colorNotes: [9, 5, 1, 10], // warm colors: A (red), F (gold), C# (orange), A# (coral)
  },
  'celtic': {
    formula: 'z → |Re(z²)| + i·Im(z²) + c',
    year: '~2000s',
    creator: 'Fractal community',
    category: 'Partial Absolute Value',
    description: 'Applies absolute value only to the real component after squaring, creating intricate interlocking patterns reminiscent of Celtic knotwork and illuminated manuscripts. The partial symmetry-breaking creates a unique aesthetic.',
    traits: ['Interlocking knots', 'Symmetric patterns', 'Dense filaments', 'Celtic cross motifs', 'Woven textures'],
    hotspots: ['c = -0.4 + 0.6i (knots)', 'c = -0.8 + 0.16i (crosses)', 'c = -0.45 - 0.5i (weave)'],
    tips: 'Celtic patterns emerge best near the boundary. The "crosses" form where four regions meet. Try zooming into areas where filaments interweave.',
    related: ['Burning Ship', 'Buffalo', 'PerpBurn'],
    tags: ['intricate', 'symmetric', 'dense'],
    colorNotes: [7, 5, 6], // G (green), F (gold), F# (yellow) - Irish/nature colors
  },
  'phoenix': {
    formula: 'z → z² + c + p·z₋₁',
    year: '1988',
    creator: 'Shigehiro Ushiki',
    category: 'Memory-Based',
    description: 'A unique fractal that incorporates memory - using the previous iteration\'s value weighted by parameter p (typically -0.5). This creates flowing, dynamic patterns with bird-like silhouettes. Named for the mythical phoenix due to its wing-like shapes.',
    traits: ['Bird-like silhouettes', 'Memory effects', 'Feathered edges', 'Dynamic flow patterns', 'Wing structures'],
    hotspots: ['c = 0.56 + 0.0i (classic phoenix)', 'c = -0.4 + 0.1i (feathers)', 'c = 0.3 - 0.3i (wings)'],
    tips: 'The p parameter (memory weight) dramatically changes the character. At p = -0.5, bird shapes emerge. Watch how regions seem to "flow" into each other.',
    related: ['Classic', 'Tricorn'],
    tags: ['dynamic', 'organic', 'smooth'],
    colorNotes: [], // rainbow/bright - works with any vibrant color
  },
  'tricorn': {
    formula: 'z → conj(z)² + c',
    year: '1989',
    creator: 'W.D. Crowe et al.',
    category: 'Conjugate Variant',
    description: 'Also called the Mandelbar set. Uses the complex conjugate before squaring, which flips the imaginary axis each iteration. This breaks two-fold symmetry into three-fold, creating the distinctive three-pointed "tricorn" shape.',
    traits: ['Three-fold symmetry', 'Tricorn shape', 'Spiky protrusions', 'Mirror-like reflections', 'Pinched bulbs'],
    hotspots: ['c = -0.1 + 0.9i (spike tip)', 'c = -1.0 + 0.0i (period-2)', 'c = 0.3 + 0.5i (mini-tricorn)'],
    tips: 'The three main "horns" each contain infinite detail. Look for mini-tricorns in the boundary regions. The Julia sets are often more symmetric than the locus.',
    related: ['Classic', 'Buffalo'],
    tags: ['angular', 'symmetric', 'intricate'],
    colorNotes: [4, 2, 3], // E (blue), D (purple), D# (violet) - cool colors
  },
  'perp-burn': {
    formula: 'z → (Re(z) + i|Im(z)|)² + c',
    year: '~2000s',
    creator: 'Fractal community',
    category: 'Partial Absolute Value',
    description: 'The Perpendicular Burning Ship applies absolute value only to the imaginary component, creating a hybrid between classic and Burning Ship aesthetics. Has strong vertical symmetry with flame-like structures.',
    traits: ['Vertical symmetry', 'Flame structures', 'Perpendicular cuts', 'Hybrid characteristics', 'Layered flames'],
    hotspots: ['c = -1.75 + 0.0i (main flame)', 'c = -0.5 + 0.5i (side burns)', 'c = -1.0 - 0.3i (embers)'],
    tips: 'Compare directly with Burning Ship to see how the partial absolute value changes the structure. The vertical axis is a mirror line.',
    related: ['Burning Ship', 'Celtic', 'Buffalo'],
    tags: ['flame', 'symmetric', 'angular'],
    colorNotes: [9, 1, 5], // fire colors like Burning Ship
  },
  'magnet': {
    formula: 'z → ((z² + c - 1)/(2z + c - 2))²',
    year: '1994',
    creator: 'Derived from physics',
    category: 'Physics-Derived',
    description: 'Emerges from renormalization group equations describing magnetic phase transitions in physics. Unlike other fractals, it has a single attractor at z = 1 rather than infinity. The "magnetic domains" show where different initial conditions flow.',
    traits: ['Physics-derived', 'Single attractor at z=1', 'Magnetic domains', 'Phase boundaries', 'Convergent iteration'],
    hotspots: ['c = 0.0 + 0.0i (centered)', 'c = 2.0 + 0.0i (boundary)', 'c = 1.0 + 1.0i (distorted)'],
    tips: 'Points converge to z = 1 rather than escaping to infinity. The "domains" represent different convergence speeds. Has connections to real physical systems.',
    related: ['Classic'],
    tags: ['smooth', 'dynamic', 'intricate'],
    colorNotes: [2, 4, 8], // D (purple), E (blue), G# (teal) - magnetic colors
  },
  'barnsley-1': {
    formula: 'z → (z-1)c if Re(z)≥0, else (z+1)c',
    year: '1988',
    creator: 'Michael Barnsley',
    category: 'Conditional/IFS',
    description: 'Michael Barnsley\'s conditional fractal uses different formulas based on the sign of the real part. Inspired by Iterated Function Systems (IFS), it creates fern-like, branching patterns similar to his famous Barnsley Fern.',
    traits: ['Conditional iteration', 'Fern-like patterns', 'Branching structures', 'Asymmetric growth', 'Leaf-like shapes'],
    hotspots: ['c = 0.38 + 0.62i (fern tips)', 'c = -0.15 + 0.78i (branches)', 'c = 0.52 + 0.25i (spirals)'],
    tips: 'The conditional nature creates natural-looking branching. Look for fern fronds and leaf structures. Best viewed with green/nature color palettes.',
    related: ['Celtic'],
    tags: ['natural', 'organic', 'dynamic'],
    colorNotes: [7, 11, 5], // G (green), B (lime), F (gold) - nature colors
  },
  'mandelbrot': {
    formula: 'z → z² + c (c = pixel)',
    year: '1980 / Exploration Mode',
    creator: 'Benoit Mandelbrot',
    category: 'Parameter Space',
    description: 'True Mandelbrot mode where c comes from the pixel position rather than being fixed. This shows the "parameter space" - each point represents a different Julia set. The z₀ sliders let you explore perturbed Mandelbrot sets with non-zero starting values.',
    traits: ['Parameter space view', 'Adjustable initial z₀', 'Classic iteration', 'Exploration mode', 'Julia set catalog'],
    hotspots: ['z₀ = 0 + 0i (classic)', 'z₀ = 0.5 + 0i (perturbed)', 'z₀ = 0 + 0.5i (imaginary shift)'],
    tips: 'Each point in this view IS a Julia set. Black = connected Julia, colored = disconnected (Cantor dust). Adjust z₀ sliders to see how initial conditions change the boundary.',
    related: ['Classic (Julia mode)', 'Tricorn', 'Burning Ship'],
    tags: ['smooth', 'natural', 'symmetric'],
    colorNotes: [], // versatile - works with any color
  },
};

const FAMILIES: FractalFamily[] = [
  {
    id: 'classic', label: 'Classic', typeNum: 0,
    bounds: { rMin: -2.0, rMax: 0.7, iMin: -1.3, iMax: 1.3 },
    // Classic Mandelbrot/Julia: z² + c - the iconic fractal
    locus(cr, ci, maxIter, z0r = 0, z0i = 0) {
      let x = z0r, y = z0i;
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
    locus(cr, ci, maxIter, z0r = 0, z0i = 0) {
      let x = z0r, y = z0i;
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
    locus(cr, ci, maxIter, z0r = 0, z0i = 0) {
      let x = z0r, y = z0i;
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
    locus(cr, ci, maxIter, z0r = 0, z0i = 0) {
      let x = z0r, y = z0i;
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
    locus(cr, ci, maxIter, z0r = 0, z0i = 0) {
      let x = z0r, y = z0i, px = 0, py = 0;
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
    locus(cr, ci, maxIter, z0r = 0, z0i = 0) {
      let x = z0r, y = z0i;
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
    locus(cr, ci, maxIter, z0r = 0, z0i = 0) {
      let x = z0r, y = z0i;
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
    id: 'magnet', label: 'Magnet-I', typeNum: 13,
    bounds: { rMin: -3.0, rMax: 3.0, iMin: -3.0, iMax: 3.0 },
    locus(cr, ci, maxIter, z0r = 0, z0i = 0) {
      let x = z0r, y = z0i;
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
    locus(cr, ci, maxIter, z0r = 0, z0i = 0) {
      let x = z0r, y = z0i;
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
const DEFAULT_VIEW_ZOOM = 1.0;     // default visualizer zoom

// Use DEFAULT_ANCHORS from state.ts for all 12 pitch classes

// --- Internal Anchor Format ---

interface InternalAnchor {
  familyIdx: number;
  real: number;
  imag: number;
  orbitRadius: number;
  orbitSkew: number;     // aspect ratio: 1=circle, <1=wide, >1=tall
  orbitRotation: number; // rotation in radians
  beatSpread: number;    // angle between beat points in radians (π/2 = 90°)
  viewZoom: number;      // visualizer zoom level
}

// --- Mode and Wizard Types ---

type PanelMode = 'explore' | 'wizard';
type WizardStep = 'choose-family' | 'place-anchor' | 'assign-notes';

interface WizardState {
  step: WizardStep;
  tempAnchor: InternalAnchor | null;
  assignedNotes: number[];
  movementPreset: 'still' | 'pulse' | 'sway' | 'bounce' | 'swing' | 'spiral' | 'wild' | 'custom';
  presetName: string;
  // Wizard map view bounds (separate from main map)
  mapBounds: { rMin: number; rMax: number; iMin: number; iMax: number } | null;
  mapZoom: number;
  showAtlas: boolean;
  // Which note to use for preview coloring (index into assignedNotes)
  previewNoteIdx: number;
  // Notes configured in this wizard session (not pre-existing)
  configuredNotes: Set<number>;
  // Original anchor position from place-anchor step (for reset)
  originalAnchor: { real: number; imag: number } | null;
}

// Movement presets for wizard step 4
// orbitRadius: size of movement, orbitSkew: backbeat emphasis (>1 = beats 2&4 larger)
// orbitRotation: orientation angle (radians), beatSpread: angle between beats (radians, π/2 = 90°)
const MOVEMENT_PRESETS = {
  still:   { orbitRadius: 0,     orbitSkew: 1.0, orbitRotation: 0,        beatSpread: 1.57 },  // No movement
  pulse:   { orbitRadius: 0.025, orbitSkew: 0.6, orbitRotation: 1.57,     beatSpread: 0.4  },  // Vertical, tight, downbeat focus
  sway:    { orbitRadius: 0.03,  orbitSkew: 1.0, orbitRotation: 0,        beatSpread: 1.57 },  // Horizontal gentle sway
  bounce:  { orbitRadius: 0.04,  orbitSkew: 1.6, orbitRotation: 0,        beatSpread: 1.57 },  // Classic backbeat bounce
  swing:   { orbitRadius: 0.05,  orbitSkew: 1.4, orbitRotation: 0.78,     beatSpread: 1.2  },  // 45° rotated, jazzy feel
  spiral:  { orbitRadius: 0.06,  orbitSkew: 1.2, orbitRotation: 0.4,      beatSpread: 2.0  },  // Wide spread, slight rotation
  wild:    { orbitRadius: 0.1,   orbitSkew: 1.8, orbitRotation: 0.52,     beatSpread: 1.0  },  // Large, tight, energetic
};

const WIZARD_STEPS: WizardStep[] = ['assign-notes', 'choose-family', 'place-anchor'];
const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  'assign-notes': 'Roots',
  'choose-family': 'Family',
  'place-anchor': 'Anchor',
};

// --- Fractal Config Panel Class ---

export class FractalConfigPanel {
  private container: HTMLElement;
  private visible = false;
  private noteGridAnimationId: number | null = null;
  private noteGridStartTime: number = 0;
  private selectedDegree = 0;  // Pitch class 0-11 (C=0)
  private selectedQuality = 'major';  // Always major now (simplified)
  private selectedFamily = 0;
  // Anchor keys are just degree numbers as strings
  private anchors: Map<string, InternalAnchor> = new Map();

  // Mode state: explore (landing) or wizard (preset creation)
  private currentMode: PanelMode = 'wizard';
  private wizardState: WizardState = {
    step: 'assign-notes',
    tempAnchor: null,
    assignedNotes: [],
    movementPreset: 'sway',
    presetName: '',
    mapBounds: null,
    mapZoom: 1,
    showAtlas: false,
    previewNoteIdx: 0,
    configuredNotes: new Set(),
    originalAnchor: null,
  };
  // Wizard movement preview animation
  private wizardPreviewAnim: number | null = null;
  private wizardPreviewPhase = 0;
  private wizardPreviewLastTime = 0;
  // Wizard map zoom debounce
  private wizardZoomDebounceTimer: number | null = null;
  private wizardLocusBuffer: HTMLCanvasElement | null = null;
  private wizardRenderedBounds: { rMin: number; rMax: number; iMin: number; iMax: number } | null = null;

  /** Get current panel mode */
  public get mode(): PanelMode {
    return this.currentMode;
  }

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
  private previewScale = 1.0; // 0 = stopped, 1 = normal, 2 = big

  // Drag state (used in wizard map interactions)
  private dragMode: 'center' | 'orbit' | 'pan' | null = null;
  private dragDeg = -1;
  private snapMode: 'none' | 'cross' = 'none';
  private showAtlasGrid = false;

  // Callbacks
  public onAnchorsChange?: (anchors: Record<number, { real: number; imag: number; type: number; orbitRadius: number; orbitSkew?: number; orbitRotation?: number; beatSpread?: number; viewZoom?: number }>) => void;

  // Locus cache - key is "familyIdx:bounds"
  private locusCache: Map<string, HTMLCanvasElement> = new Map();

  // Debounce timer for zoom
  private zoomDebounceTimer: number | null = null;
  // Track rendered bounds for scaled preview during zoom
  private renderedBounds: { rMin: number; rMax: number; iMin: number; iMax: number }[] = [];

  // Callbacks
  public onSave: (() => void) | null = null;
  public onPresetsChange: (() => void) | null = null;

  // User presets
  private userPresets: UserPreset[] = [];
  private selectedPresetId: string | null = null; // null = default

  /** Get all user presets */
  public getPresets(): UserPreset[] {
    return this.userPresets;
  }

  /** Get currently selected preset ID (null = default) */
  public getSelectedPresetId(): string | null {
    return this.selectedPresetId;
  }

  /** Select a preset by ID (null = default) and apply it */
  public selectPreset(presetId: string | null): void {
    this.selectedPresetId = presetId;
    this.loadPreset(presetId);
    this.updatePresetsUI();
  }

  /** Set orbit radius for a degree */
  private setOrbitRadius(deg: number, radius: number): void {
    const key = this.anchorKey(deg);
    const anchor = this.anchors.get(key);
    if (anchor) {
      anchor.orbitRadius = Math.max(0.01, radius);
      this.drawOverlay();
      this.updateResetButtonState();
    }
  }

  /** Set orbit skew for a degree */
  private setOrbitSkew(deg: number, skew: number): void {
    const key = this.anchorKey(deg);
    const anchor = this.anchors.get(key);
    if (anchor) {
      anchor.orbitSkew = skew;
      this.drawOverlay();
      this.updateResetButtonState();
    }
  }

  /** Set orbit rotation for a degree */
  private setOrbitRotation(deg: number, rotation: number): void {
    const key = this.anchorKey(deg);
    const anchor = this.anchors.get(key);
    if (anchor) {
      anchor.orbitRotation = rotation;
      this.drawOverlay();
      this.updateResetButtonState();
    }
  }

  /** Set beat spread (angle between beat points) for a degree */
  private setBeatSpread(deg: number, spread: number): void {
    const key = this.anchorKey(deg);
    const anchor = this.anchors.get(key);
    if (anchor) {
      anchor.beatSpread = spread;
      this.drawOverlay();
      this.updateResetButtonState();
    }
  }

  /** Set anchor real component for a degree */
  private setAnchorReal(deg: number, real: number): void {
    const key = this.anchorKey(deg);
    const anchor = this.anchors.get(key);
    if (anchor) {
      anchor.real = real;
      this.renderJulia(this.selectedFamily, anchor.real, anchor.imag, anchor.viewZoom);
      this.drawOverlay();
      this.updateResetButtonState();
      if (this.onSave) this.onSave();
    }
  }

  /** Set anchor imaginary component for a degree */
  private setAnchorImag(deg: number, imag: number): void {
    const key = this.anchorKey(deg);
    const anchor = this.anchors.get(key);
    if (anchor) {
      anchor.imag = imag;
      this.renderJulia(this.selectedFamily, anchor.real, anchor.imag, anchor.viewZoom);
      this.drawOverlay();
      this.updateResetButtonState();
      if (this.onSave) this.onSave();
    }
  }

  /** Set anchor viewZoom for a degree */
  private setAnchorZoom(deg: number, zoom: number): void {
    const key = this.anchorKey(deg);
    const anchor = this.anchors.get(key);
    if (anchor) {
      anchor.viewZoom = zoom;
      this.renderJulia(this.selectedFamily, anchor.real, anchor.imag, anchor.viewZoom);

      // Zoom the locus map centered on the anchor
      this.zoomMapToAnchor(anchor, zoom);

      if (this.onSave) this.onSave();
    }
  }

  /** Zoom the locus map centered on an anchor point */
  private zoomMapToAnchor(anchor: InternalAnchor, viewZoom: number): void {
    const origB = FAMILIES[this.selectedFamily].bounds;
    const origW = origB.rMax - origB.rMin;
    const origH = origB.iMax - origB.iMin;

    // Scale the view size inversely with viewZoom
    const newW = origW / viewZoom;
    const newH = origH / viewZoom;

    // Center on anchor position
    const b = this.viewBounds[this.selectedFamily];
    b.rMin = anchor.real - newW / 2;
    b.rMax = anchor.real + newW / 2;
    b.iMin = anchor.imag - newH / 2;
    b.iMax = anchor.imag + newH / 2;

    // Update zoom level tracking
    this.zoomLevels[this.selectedFamily] = viewZoom;

    // Immediately show scaled preview for responsive feel
    this.drawScaledPreview();
    this.drawOverlayMarkers();

    // Debounce the expensive locus render (longer delay for slider drags)
    if (this.zoomDebounceTimer !== null) {
      clearTimeout(this.zoomDebounceTimer);
    }
    this.zoomDebounceTimer = window.setTimeout(() => {
      this.zoomDebounceTimer = null;
      this.renderLocus();
      this.drawOverlay();
    }, 250);
  }

  /** Center the map view on the current anchor (keeps current zoom level) */
  private centerMapOnAnchor(): void {
    const anchor = this.currentAnchor;
    if (!anchor) return;

    const b = this.viewBounds[this.selectedFamily];
    const halfW = (b.rMax - b.rMin) / 2;
    const halfH = (b.iMax - b.iMin) / 2;

    // Center on anchor position
    b.rMin = anchor.real - halfW;
    b.rMax = anchor.real + halfW;
    b.iMin = anchor.imag - halfH;
    b.iMax = anchor.imag + halfH;

    // Render with debounce
    this.drawScaledPreview();
    this.drawOverlayMarkers();

    if (this.zoomDebounceTimer !== null) {
      clearTimeout(this.zoomDebounceTimer);
    }
    this.zoomDebounceTimer = window.setTimeout(() => {
      this.zoomDebounceTimer = null;
      this.renderLocus();
      this.drawOverlay();
    }, 100);
  }

  /** Convert slider value (0-100) to zoom (0.1-10000) with exponential mapping */
  private sliderToZoom(slider: number): number {
    // Center at 50 = 1.0x, exponential on both sides
    if (slider <= 50) {
      // 0-50 → 0.1-1.0
      return 0.1 * Math.pow(10, slider / 50);
    } else {
      // 50-100 → 1.0-10000 (deep fractal zoom)
      return Math.pow(10000, (slider - 50) / 50);
    }
  }

  /** Convert zoom (0.1-10000) to slider value (0-100) */
  private zoomToSlider(zoom: number): number {
    if (zoom <= 1.0) {
      // 0.1-1.0 → 0-50
      return 50 * Math.log10(zoom * 10);
    } else {
      // 1.0-10000 → 50-100
      return 50 + 50 * Math.log10(zoom) / 4; // log10(10000) = 4
    }
  }

  /** Format zoom value for display */
  private formatZoom(zoom: number): string {
    if (zoom >= 1000) return `${Math.round(zoom / 100) / 10}k×`;
    if (zoom >= 100) return `${Math.round(zoom)}×`;
    if (zoom >= 10) return `${zoom.toFixed(1)}×`;
    return `${zoom.toFixed(2)}×`;
  }

  /** Update orbit input values to match the selected degree's anchor */
  private updateOrbitSliders(): void {
    const key = this.anchorKey(this.selectedDegree);
    const anchor = this.anchors.get(key);

    const radiusInput = this.container.querySelector('.fc-radius-input') as HTMLInputElement;
    const skewInput = this.container.querySelector('.fc-skew-input') as HTMLInputElement;
    const rotationInput = this.container.querySelector('.fc-rotation-input') as HTMLInputElement;
    const spreadInput = this.container.querySelector('.fc-spread-input') as HTMLInputElement;
    const realInput = this.container.querySelector('.fc-real-input') as HTMLInputElement;
    const imagInput = this.container.querySelector('.fc-imag-input') as HTMLInputElement;
    const zoomSlider = this.container.querySelector('.fc-zoom-slider') as HTMLInputElement;
    const zoomLabel = this.container.querySelector('.fc-zoom-label') as HTMLElement;

    if (anchor) {
      if (radiusInput) radiusInput.value = (anchor.orbitRadius * 250).toFixed(1);
      if (skewInput) skewInput.value = String(Math.round(anchor.orbitSkew * 100));
      if (rotationInput) rotationInput.value = String(Math.round(anchor.orbitRotation * 100));
      if (spreadInput) spreadInput.value = String(Math.round(anchor.beatSpread * 100));
      if (realInput) realInput.value = String(Math.round(anchor.real * 100));
      if (imagInput) imagInput.value = String(Math.round(anchor.imag * 100));
      if (zoomSlider) zoomSlider.value = String(Math.round(this.zoomToSlider(anchor.viewZoom)));
      if (zoomLabel) zoomLabel.textContent = this.formatZoom(anchor.viewZoom);
    }
  }

  /** Show family information modal */
  private showFamilyInfo(): void {
    const family = FAMILIES[this.selectedFamily];
    const info = FAMILY_INFO[family.id];

    const modal = this.container.querySelector('#fc-info-modal') as HTMLElement;

    // Basic info
    this.container.querySelector('#fc-info-title')!.textContent = family.label;
    this.container.querySelector('#fc-info-formula')!.textContent = info?.formula || 'z → z² + c';
    this.container.querySelector('#fc-info-desc')!.textContent = info?.description || 'No description available.';

    // Meta info
    this.container.querySelector('#fc-info-year')!.textContent = info?.year || 'Unknown';
    this.container.querySelector('#fc-info-creator')!.textContent = info?.creator || 'Unknown';
    this.container.querySelector('#fc-info-category')!.textContent = info?.category || 'Fractal';

    // Traits list
    this.container.querySelector('#fc-info-traits-list')!.innerHTML = (info?.traits || [])
      .map(t => `<li>${t}</li>`)
      .join('');

    // Hotspots list
    this.container.querySelector('#fc-info-hotspots-list')!.innerHTML = (info?.hotspots || [])
      .map(h => `<li><code>${h}</code></li>`)
      .join('');

    // Tips
    this.container.querySelector('#fc-info-tips-text')!.textContent = info?.tips || 'Explore the boundary regions for the most detail.';

    // Related families (clickable)
    const relatedList = this.container.querySelector('#fc-info-related-list')!;
    relatedList.innerHTML = (info?.related || [])
      .map(r => `<button class="fc-info-related-tag" data-family="${r}">${r}</button>`)
      .join('');

    // Add click handlers for related family tags
    relatedList.querySelectorAll('.fc-info-related-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        const label = (btn as HTMLElement).dataset.family;
        if (label) this.showFamilyInfoByLabel(label);
      });
    });

    modal.classList.add('visible');
  }

  /** Show family info modal by family label */
  private showFamilyInfoByLabel(label: string): void {
    const idx = FAMILIES.findIndex(f => f.label === label);
    if (idx >= 0) {
      const savedFamily = this.selectedFamily;
      this.selectedFamily = idx;
      this.showFamilyInfo();
      this.selectedFamily = savedFamily;
    }
  }

  /** Hide family information modal */
  private hideFamilyInfo(): void {
    const modal = this.container.querySelector('#fc-info-modal') as HTMLElement;
    modal.classList.remove('visible');
  }

  /** Update family selector buttons to match selectedFamily state */
  private updateFamilyUI(): void {
    const familyBtns = this.container.querySelectorAll('.fc-family-btn');
    familyBtns.forEach((btn, i) => {
      btn.classList.toggle('active', i === this.selectedFamily);
    });

    // Update formula display
    const formulaEl = this.container.querySelector('.fc-formula') as HTMLElement;
    if (formulaEl) {
      const family = FAMILIES[this.selectedFamily];
      const info = FAMILY_INFO[family.id];
      formulaEl.textContent = info?.formula || 'z → z² + c';
    }
  }

  /** Handle map control button clicks */
  private handleMapControl(action: string): void {
    const b = this.viewBounds[this.selectedFamily];
    const w = b.rMax - b.rMin;
    const h = b.iMax - b.iMin;
    const panAmount = 0.2; // 20% of view

    switch (action) {
      case 'pan-left':
        b.rMin -= w * panAmount;
        b.rMax -= w * panAmount;
        break;
      case 'pan-right':
        b.rMin += w * panAmount;
        b.rMax += w * panAmount;
        break;
      case 'pan-up':
        b.iMin -= h * panAmount;
        b.iMax -= h * panAmount;
        break;
      case 'pan-down':
        b.iMin += h * panAmount;
        b.iMax += h * panAmount;
        break;
      case 'zoom-in': {
        const cx = (b.rMin + b.rMax) / 2;
        const cy = (b.iMin + b.iMax) / 2;
        const factor = 0.7;
        b.rMin = cx - (w * factor) / 2;
        b.rMax = cx + (w * factor) / 2;
        b.iMin = cy - (h * factor) / 2;
        b.iMax = cy + (h * factor) / 2;
        const origB = FAMILIES[this.selectedFamily].bounds;
        this.zoomLevels[this.selectedFamily] = (origB.rMax - origB.rMin) / (b.rMax - b.rMin);
        break;
      }
      case 'zoom-out': {
        const cx = (b.rMin + b.rMax) / 2;
        const cy = (b.iMin + b.iMax) / 2;
        const factor = 1.4;
        b.rMin = cx - (w * factor) / 2;
        b.rMax = cx + (w * factor) / 2;
        b.iMin = cy - (h * factor) / 2;
        b.iMax = cy + (h * factor) / 2;
        const origB = FAMILIES[this.selectedFamily].bounds;
        this.zoomLevels[this.selectedFamily] = (origB.rMax - origB.rMin) / (b.rMax - b.rMin);
        break;
      }
      case 'reset-view':
        this.viewBounds[this.selectedFamily] = { ...FAMILIES[this.selectedFamily].bounds };
        this.zoomLevels[this.selectedFamily] = 1.0;
        break;
    }

    this.renderLocus();
    this.drawOverlay();
  }

  /** Sync orbit inputs to current anchor values */
  private syncOrbitSliders(): void {
    this.updateOrbitSliders();
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
    // Load user presets first (needed for buildHTML)
    this.userPresets = loadUserPresets();

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'fractal-config-overlay';
    this.container.innerHTML = this.buildHTML();
    document.body.appendChild(this.container);

    // Create offscreen canvases (explore mode canvases removed, but some code still references these)
    this.locusCanvas = document.createElement('canvas');
    this.locusCanvas.width = PANEL_SIZE;
    this.locusCanvas.height = PANEL_SIZE;
    this.locusCtx = this.locusCanvas.getContext('2d')!;
    this.locusBuffer = document.createElement('canvas');
    this.locusBuffer.width = PANEL_SIZE;
    this.locusBuffer.height = PANEL_SIZE;
    this.juliaCanvas = document.createElement('canvas');
    this.juliaCanvas.width = JULIA_SIZE;
    this.juliaCanvas.height = JULIA_SIZE;
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

  private renderPresetsList(): string {
    const defaultChecked = this.selectedPresetId === null ? 'checked' : '';
    let html = `
      <label class="fc-preset-option fc-preset-default">
        <input type="radio" name="fc-preset" value="" ${defaultChecked}>
        <span class="fc-preset-radio"></span>
        <span class="fc-preset-name">Default</span>
      </label>
    `;

    // Built-in presets (no delete button)
    for (const preset of BUILTIN_PRESETS) {
      const checked = this.selectedPresetId === preset.id ? 'checked' : '';
      html += `
        <label class="fc-preset-option fc-preset-builtin">
          <input type="radio" name="fc-preset" value="${preset.id}" ${checked}>
          <span class="fc-preset-radio"></span>
          <span class="fc-preset-name">${preset.name}</span>
        </label>
      `;
    }

    // User presets (with delete button)
    for (const preset of this.userPresets) {
      const checked = this.selectedPresetId === preset.id ? 'checked' : '';
      html += `
        <label class="fc-preset-option fc-preset-user">
          <input type="radio" name="fc-preset" value="${preset.id}" ${checked}>
          <span class="fc-preset-radio"></span>
          <span class="fc-preset-name">${preset.name}</span>
          <button class="fc-preset-delete" data-id="${preset.id}" title="Delete preset"><svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>
        </label>
      `;
    }

    return html;
  }

  private updatePresetsUI(): void {
    const bar = this.container.querySelector('.fc-presets-bar') as HTMLElement;
    const list = this.container.querySelector('.fc-presets-list');
    const hasPresets = BUILTIN_PRESETS.length > 0 || this.userPresets.length > 0;
    if (bar) {
      bar.style.display = hasPresets ? '' : 'none';
    }
    if (list) {
      list.innerHTML = this.renderPresetsList();
      this.setupPresetHandlers();
    }
  }

  private presetHandlersSetup = false;

  private setupPresetHandlers(): void {
    // Only set up event delegation once
    if (this.presetHandlersSetup) return;
    this.presetHandlersSetup = true;

    const list = this.container.querySelector('.fc-presets-list');
    if (!list) return;

    // Use event delegation for radio changes
    list.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.type === 'radio' && target.name === 'fc-preset') {
        this.selectedPresetId = target.value || null;
        this.loadPreset(this.selectedPresetId);
      }
    });

    // Use event delegation for delete clicks
    list.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('fc-preset-delete')) {
        e.preventDefault();
        e.stopPropagation();
        const id = target.dataset.id;
        if (id) this.deletePreset(id);
      }
    });
  }

  private loadPreset(presetId: string | null): void {
    if (presetId === null) {
      // Load built-in default anchors (DEFAULT_ANCHORS)
      this.loadDefaultAnchors();
    } else {
      // Search both built-in and user presets
      const preset = BUILTIN_PRESETS.find(p => p.id === presetId)
        || this.userPresets.find(p => p.id === presetId);
      if (preset) {
        this.loadAnchorsFromData(preset.anchors);
      }
    }

    // Mark all 12 notes as configured so wizard shows them as editable
    this.wizardState.configuredNotes.clear();
    for (let i = 0; i < 12; i++) {
      if (this.anchors.has(this.anchorKey(i))) {
        this.wizardState.configuredNotes.add(i);
      }
    }

    // Adjust view to show anchors
    this.fitViewToAnchors();

    this.markAllThumbnailsDirty();
    this.renderLocus();
    this.drawOverlay();
    this.updateAssignments();
    this.updateResetButtonState();
        this.updateWizardNoteGrid();

    // Hide editing indicator (loaded fresh preset)
    this.showEditingIndicator(false);

    // Apply to visualizer
    this.emitAnchorChange();
    if (this.onSave) this.onSave();

    const status = this.container.querySelector('#fc-status');
    if (status) {
      status.textContent = presetId ? 'Preset loaded' : 'Default loaded';
    }
  }

  /** Adjust view bounds to show all anchors for current family */
  private fitViewToAnchors(): void {
    // Collect all anchors for the current family
    const familyAnchors: { real: number; imag: number }[] = [];
    for (const [, anchor] of this.anchors) {
      if (anchor.familyIdx === this.selectedFamily) {
        familyAnchors.push({ real: anchor.real, imag: anchor.imag });
      }
    }

    if (familyAnchors.length === 0) {
      // No anchors for this family, reset to default bounds
      this.viewBounds[this.selectedFamily] = { ...FAMILIES[this.selectedFamily].bounds };
      this.renderedBounds[this.selectedFamily] = { ...FAMILIES[this.selectedFamily].bounds };
      this.zoomLevels[this.selectedFamily] = 1.0;
      return;
    }

    // Calculate bounding box of anchors
    let minR = Infinity, maxR = -Infinity;
    let minI = Infinity, maxI = -Infinity;
    for (const a of familyAnchors) {
      minR = Math.min(minR, a.real);
      maxR = Math.max(maxR, a.real);
      minI = Math.min(minI, a.imag);
      maxI = Math.max(maxI, a.imag);
    }

    // Add padding (30% on each side)
    const rRange = maxR - minR || 0.5;
    const iRange = maxI - minI || 0.5;
    const padding = Math.max(rRange, iRange) * 0.3;

    minR -= padding;
    maxR += padding;
    minI -= padding;
    maxI += padding;

    // Ensure square aspect ratio
    const rSize = maxR - minR;
    const iSize = maxI - minI;
    if (rSize > iSize) {
      const diff = (rSize - iSize) / 2;
      minI -= diff;
      maxI += diff;
    } else {
      const diff = (iSize - rSize) / 2;
      minR -= diff;
      maxR += diff;
    }

    // Apply bounds
    this.viewBounds[this.selectedFamily] = { rMin: minR, rMax: maxR, iMin: minI, iMax: maxI };
    this.renderedBounds[this.selectedFamily] = { rMin: minR, rMax: maxR, iMin: minI, iMax: maxI };

    // Calculate zoom level relative to default
    const defaultBounds = FAMILIES[this.selectedFamily].bounds;
    const defaultSize = defaultBounds.rMax - defaultBounds.rMin;
    const currentSize = maxR - minR;
    this.zoomLevels[this.selectedFamily] = defaultSize / currentSize;
  }

  private loadAnchorsFromData(anchors: FractalAnchors): void {
    this.anchors.clear();
    for (let deg = 0; deg <= 11; deg++) {
      const saved = anchors[deg];
      let anchor: InternalAnchor;

      if (saved) {
        const fi = TYPE_TO_FAMILY[saved.type] ?? 0;
        anchor = {
          familyIdx: fi,
          real: saved.real,
          imag: saved.imag,
          orbitRadius: saved.orbitRadius ?? DEFAULT_ORBIT_RADIUS,
          orbitSkew: saved.orbitSkew ?? DEFAULT_ORBIT_SKEW,
          orbitRotation: saved.orbitRotation ?? DEFAULT_ORBIT_ROTATION,
          beatSpread: saved.beatSpread ?? DEFAULT_BEAT_SPREAD,
          viewZoom: saved.viewZoom ?? DEFAULT_VIEW_ZOOM,
        };
      } else {
        // Use preset defaults
        const p = DEFAULT_ANCHORS[deg];
        const fi = TYPE_TO_FAMILY[p.type];
        anchor = {
          familyIdx: fi,
          real: p.real,
          imag: p.imag,
          orbitRadius: p.orbitRadius,
          orbitSkew: p.orbitSkew ?? DEFAULT_ORBIT_SKEW,
          orbitRotation: p.orbitRotation ?? DEFAULT_ORBIT_ROTATION,
          beatSpread: p.beatSpread ?? DEFAULT_BEAT_SPREAD,
          viewZoom: p.viewZoom ?? DEFAULT_VIEW_ZOOM,
        };
      }

      // Apply to all qualities for this degree
      for (const q of QUALITIES) {
        this.anchors.set(this.anchorKey(deg, q.id), { ...anchor });
      }
    }
  }

  /** Load built-in default anchors from DEFAULT_ANCHORS */
  private loadDefaultAnchors(): void {
    this.anchors.clear();
    for (let deg = 0; deg <= 11; deg++) {
      const p = DEFAULT_ANCHORS[deg];
      const fi = TYPE_TO_FAMILY[p.type];
      const anchor: InternalAnchor = {
        familyIdx: fi,
        real: p.real,
        imag: p.imag,
        orbitRadius: p.orbitRadius,
        orbitSkew: p.orbitSkew ?? DEFAULT_ORBIT_SKEW,
        orbitRotation: p.orbitRotation ?? DEFAULT_ORBIT_ROTATION,
        beatSpread: p.beatSpread ?? DEFAULT_BEAT_SPREAD,
        viewZoom: p.viewZoom ?? DEFAULT_VIEW_ZOOM,
      };
      for (const q of QUALITIES) {
        this.anchors.set(this.anchorKey(deg, q.id), { ...anchor });
      }
    }
  }

  private deletePreset(presetId: string): void {
    this.userPresets = this.userPresets.filter(p => p.id !== presetId);
    saveUserPresets(this.userPresets);
    if (this.selectedPresetId === presetId) {
      this.selectedPresetId = null;
      this.loadPreset(null);
    }
    this.updatePresetsUI();
    if (this.onPresetsChange) this.onPresetsChange();
    const status = this.container.querySelector('#fc-status');
    if (status) {
      status.textContent = 'Preset deleted';
    }
  }

  private getCurrentAnchorsData(): FractalAnchors {
    const out: FractalAnchors = {};
    for (let deg = 0; deg <= 11; deg++) {
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
        viewZoom: a.viewZoom,
      };
    }
    return out;
  }

  /** Emit anchor change to visualizer */
  private emitAnchorChange(): void {
    const anchors = this.getCurrentAnchorsData();
    saveFractalAnchors(anchors);
    if (this.onAnchorsChange) {
      this.onAnchorsChange(anchors);
    }
    // Update save button state after anchor changes
    this.updateSaveButtonState();
  }

  /** Copy current anchors as code to clipboard */
  private copyAnchorsAsCode(): void {
    const anchors = this.getCurrentAnchorsData();
    const code = JSON.stringify(anchors, null, 2);
    navigator.clipboard.writeText(code).then(() => {
      const btn = this.container.querySelector('.fc-wizard-copy-code') as HTMLButtonElement;
      if (btn) {
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = original; }, 1500);
      }
    });
  }

  private buildHTML(): string {

    // Build compact note grid - 4 columns x 3 rows (C C# D D# / E F F# G / G# A A# B)
    const noteGrid = [
      [0, 1, 2, 3],   // C, C#, D, D#
      [4, 5, 6, 7],   // E, F, F#, G
      [8, 9, 10, 11]  // G#, A, A#, B
    ];


    // Wizard note grid (4x3 preview cells with animated fractals)
    const wizardNoteButtons = noteGrid.map(row =>
      row.map(pc =>
        `<button class="fc-wizard-note-btn" data-note="${pc}" style="--note-color: ${NOTE_COLORS[pc]}">
          <canvas class="fc-wizard-note-canvas" width="80" height="80"></canvas>
          <span class="fc-wizard-note-label">${NOTE_NAMES[pc]}</span>
          <span class="fc-wizard-note-edit" data-note="${pc}" title="Edit anchor">✎</span>
          <span class="fc-wizard-note-dice" data-note="${pc}" title="Random fractal">🎲</span>
        </button>`
      ).join('')
    ).join('');

    // Family grid for wizard step 1
    const familyGrid = FAMILIES.map((f, i) => {
      const info = FAMILY_INFO[f.id];
      const tags = info?.tags?.slice(0, 3).map(t => `<span class="fc-wizard-family-tag">${t}</span>`).join('') || '';
      const colorDots = info?.colorNotes?.length
        ? info.colorNotes.slice(0, 4).map(n => `<span class="fc-wizard-family-color" style="--note-color: ${NOTE_COLORS[n]}" title="${NOTE_NAMES[n]}"></span>`).join('')
        : '<span class="fc-wizard-family-color-any">any</span>';
      return `<button class="fc-wizard-family-card" data-family="${i}">
        <span class="fc-wizard-family-name">${f.label}</span>
        <canvas class="fc-wizard-family-thumb" width="90" height="90"></canvas>
        <div class="fc-wizard-family-tags">${tags}</div>
        <div class="fc-wizard-family-colors">${colorDots}</div>
        <span class="fc-wizard-family-info-btn" data-family="${i}">Info</span>
      </button>`;
    }).join('');

    // Progress dots for wizard
    const progressDots = WIZARD_STEPS.map((step, i) =>
      `<div class="fc-wizard-progress-dot${i === 0 ? ' active' : ' upcoming'}" data-step="${step}">
        <span class="fc-wizard-progress-num">${i + 1}</span>
        <span class="fc-wizard-progress-label">${WIZARD_STEP_LABELS[step]}</span>
      </div>`
    ).join('');

    return `
      <div class="fc-panel fc-layout-horizontal fc-mode-wizard">
        <div class="fc-header">
          <h2>Fractal Config</h2>
          <button class="fc-help-btn" title="How this works">?</button>
          <button class="fc-btn fc-wizard-cancel">Cancel</button>
        </div>

        <!-- ===================== WIZARD MODE ===================== -->
        <div class="fc-wizard-container">
          <!-- Presets bar -->
          <div class="fc-presets-bar">
            <div class="fc-presets-label">Load Preset:</div>
            <div class="fc-presets-list">
              ${this.renderPresetsList()}
            </div>
            <button class="fc-btn fc-wizard-new-preset">+ New</button>
          </div>

          <!-- Progress indicator -->
          <div class="fc-wizard-progress">
            ${progressDots}
          </div>

          <!-- Step: Choose Family -->
          <div class="fc-wizard-step" data-step="choose-family">
            <div class="fc-wizard-intro">
              <h3>Choose a Fractal Family</h3>
              <p class="fc-wizard-intro-note">Tip: Click Info to learn about the history and math behind each fractal.</p>
            </div>
            <div class="fc-wizard-family-scroll">
              <div class="fc-wizard-family-grid">
                ${familyGrid}
              </div>
            </div>
            <div class="fc-wizard-family-footer">
              <div class="fc-wizard-family-footer-row">
                <div class="fc-wizard-selected-roots">
                  <span class="fc-wizard-selected-roots-label">Placing:</span>
                  <span class="fc-wizard-selected-roots-chips"></span>
                </div>
                <div class="fc-wizard-family-nav">
                  <button class="fc-btn fc-wizard-back">← Back</button>
                  <button class="fc-btn fc-btn-primary fc-wizard-family-next" style="display: none;">Next →</button>
                </div>
              </div>
              <div class="fc-wizard-related-families">
                <span class="fc-wizard-related-label">Related:</span>
                <span class="fc-wizard-related-chips"></span>
              </div>
            </div>
          </div>

          <!-- Step: Place Anchor -->
          <div class="fc-wizard-step" data-step="place-anchor">
            <div class="fc-wizard-anchor-layout">
              <div class="fc-wizard-sidebar">
                <!-- Position Section -->
                <div class="fc-wizard-section">
                  <div class="fc-wizard-section-header">
                    Position
                    <span class="fc-wizard-family-name"></span>
                  </div>
                  <div class="fc-wizard-position-btns">
                    <button class="fc-wizard-position-btn fc-wizard-hotspot-btn" title="Jump to interesting spot">! Hotspot</button>
                    <button class="fc-wizard-position-btn fc-wizard-center-btn" title="Center map on anchor">⌖ Center</button>
                  </div>
                  <div class="fc-wizard-param-grid">
                    <div class="fc-wizard-param-row fc-wizard-scale-row">
                      <label>Zoom</label>
                      <input type="range" class="fc-wizard-scale-slider" min="0" max="100" value="0">
                      <input type="number" class="fc-wizard-scale-input" value="1.0" step="0.1" min="1" max="1000">
                    </div>
                    <div class="fc-wizard-param-row">
                      <label>Real</label>
                      <input type="range" class="fc-wizard-real-slider" min="0" max="1000" value="500">
                      <input type="number" class="fc-wizard-real-input" value="0" step="0.0001">
                    </div>
                    <div class="fc-wizard-param-row">
                      <label>Imag</label>
                      <input type="range" class="fc-wizard-imag-slider" min="0" max="1000" value="500">
                      <input type="number" class="fc-wizard-imag-input" value="0" step="0.0001">
                    </div>
                  </div>
                </div>

                <!-- Movement Section -->
                <div class="fc-wizard-section">
                  <div class="fc-wizard-section-header">Movement</div>
                  <div class="fc-wizard-movement-presets">
                    <button class="fc-wizard-movement-btn" data-preset="still" title="No movement">
                      <span class="fc-wizard-movement-icon">●</span>
                      <span class="fc-wizard-movement-name">Still</span>
                    </button>
                    <button class="fc-wizard-movement-btn" data-preset="pulse" title="Vertical pulsing">
                      <span class="fc-wizard-movement-icon">↕</span>
                      <span class="fc-wizard-movement-name">Pulse</span>
                    </button>
                    <button class="fc-wizard-movement-btn selected" data-preset="sway" title="Gentle horizontal sway">
                      <span class="fc-wizard-movement-icon">↔</span>
                      <span class="fc-wizard-movement-name">Sway</span>
                    </button>
                    <button class="fc-wizard-movement-btn" data-preset="bounce" title="Backbeat bounce">
                      <span class="fc-wizard-movement-icon">⬡</span>
                      <span class="fc-wizard-movement-name">Bounce</span>
                    </button>
                    <button class="fc-wizard-movement-btn" data-preset="swing" title="Jazzy swing feel">
                      <span class="fc-wizard-movement-icon">◐</span>
                      <span class="fc-wizard-movement-name">Swing</span>
                    </button>
                    <button class="fc-wizard-movement-btn" data-preset="spiral" title="Wide spiral motion">
                      <span class="fc-wizard-movement-icon">◎</span>
                      <span class="fc-wizard-movement-name">Spiral</span>
                    </button>
                    <button class="fc-wizard-movement-btn" data-preset="wild" title="Large energetic movement">
                      <span class="fc-wizard-movement-icon">✦</span>
                      <span class="fc-wizard-movement-name">Wild</span>
                    </button>
                  </div>
                  <div class="fc-wizard-param-grid">
                    <div class="fc-wizard-param-row">
                      <label>Radius</label>
                      <input type="range" class="fc-wizard-radius-slider" min="0" max="1000" value="0">
                      <input type="number" class="fc-wizard-radius-input" value="0" step="0.001" min="0">
                    </div>
                    <div class="fc-wizard-param-row">
                      <label>Skew</label>
                      <input type="range" class="fc-wizard-skew-slider" min="20" max="300" value="100">
                      <input type="number" class="fc-wizard-skew-input" value="1.0" step="0.01" min="0.2" max="3">
                    </div>
                    <div class="fc-wizard-param-row">
                      <label>Rotation</label>
                      <input type="range" class="fc-wizard-rotation-slider" min="0" max="628" value="0">
                      <input type="number" class="fc-wizard-rotation-input" value="0" step="1" min="0" max="360">
                    </div>
                    <div class="fc-wizard-param-row">
                      <label>Spread</label>
                      <input type="range" class="fc-wizard-spread-slider" min="10" max="314" value="157">
                      <input type="number" class="fc-wizard-spread-input" value="90" step="1" min="5" max="180">
                    </div>
                  </div>
                </div>
              </div>
              <div class="fc-wizard-map-area">
                <canvas class="fc-wizard-locus-canvas" width="${PANEL_SIZE}" height="${PANEL_SIZE}"></canvas>
                <div class="fc-wizard-preview-overlay">
                  <canvas class="fc-wizard-movement-canvas" width="${JULIA_SIZE}" height="${JULIA_SIZE}"></canvas>
                  <div class="fc-wizard-note-switcher"></div>
                </div>
                <div class="fc-wizard-map-controls fc-map-controls">
                  <div class="fc-map-row">
                    <button class="fc-map-btn" data-action="zoom-in" title="Zoom in">+</button>
                    <button class="fc-map-btn" data-action="pan-up" title="Pan up">↑</button>
                    <button class="fc-map-btn" data-action="zoom-out" title="Zoom out">−</button>
                  </div>
                  <div class="fc-map-row">
                    <button class="fc-map-btn" data-action="pan-left" title="Pan left">←</button>
                    <button class="fc-map-btn fc-wizard-atlas-btn" title="Toggle atlas grid">🗺</button>
                    <button class="fc-map-btn" data-action="pan-right" title="Pan right">→</button>
                  </div>
                  <div class="fc-map-row">
                    <button class="fc-map-btn" data-action="reset" title="Reset view">⟲</button>
                    <button class="fc-map-btn" data-action="pan-down" title="Pan down">↓</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="fc-wizard-anchor-footer">
              <div class="fc-wizard-anchor-coords-display">c = 0.0000 + 0.0000i</div>
              <div class="fc-wizard-anchor-nav">
                <button class="fc-btn fc-wizard-back">← Back</button>
                <button class="fc-btn fc-wizard-next fc-btn-primary">Next →</button>
              </div>
            </div>
          </div>

          <!-- Step: Assign Notes (Home Page) -->
          <div class="fc-wizard-step active" data-step="assign-notes">
            <div class="fc-wizard-step-header">
              <h3>Select a Chord Root to Configure</h3>
            </div>
            <div class="fc-wizard-note-grid">
              ${wizardNoteButtons}
            </div>
            <div class="fc-wizard-home-save">
              <input type="text" class="fc-wizard-name-input" placeholder="Preset name" maxlength="30">
              <div class="fc-wizard-home-actions">
                <button class="fc-btn fc-wizard-copy-code" title="Please email eric@decompiled.dev this if you think you have good settings :)">Copy as Code</button>
                <button class="fc-btn fc-btn-primary fc-wizard-save-btn">Save Preset</button>
              </div>
            </div>
          </div>

          <div class="fc-wizard-status"></div>
        </div>

        <!-- ===================== MODALS ===================== -->
        <!-- Family Info Modal (uses about-modal structure) -->
        <div class="about-modal-overlay" id="fc-info-modal">
          <div class="about-modal">
            <div class="about-modal-header">
              <span id="fc-info-title">Family Name</span>
              <button class="about-modal-close" id="fc-info-close">&times;</button>
            </div>

            <div class="about-modal-body">
              <div class="fc-info-meta">
                <span class="fc-info-meta-item"><span class="about-label">Year:</span> <span id="fc-info-year">1980</span></span>
                <span class="fc-info-meta-item"><span class="about-label">Creator:</span> <span id="fc-info-creator">Unknown</span></span>
                <span class="fc-info-meta-item"><span class="about-label">Category:</span> <span id="fc-info-category">Polynomial</span></span>
              </div>

              <div class="fc-info-formula" id="fc-info-formula">z → z² + c</div>

              <p id="fc-info-desc">Description</p>

              <div class="about-section">
                <h3>Visual Characteristics</h3>
                <ul id="fc-info-traits-list"></ul>
              </div>

              <div class="about-section">
                <h3>Interesting c-values to explore</h3>
                <ul id="fc-info-hotspots-list" class="fc-info-hotspots"></ul>
              </div>

              <div class="about-section">
                <h3>💡 Tips</h3>
                <p id="fc-info-tips-text">Exploration tips will appear here.</p>
              </div>

              <div class="about-section">
                <h3>Related Families</h3>
                <span id="fc-info-related-list"></span>
              </div>
            </div>
          </div>
        </div>

        <div class="fc-controls-modal" id="fc-controls-modal">
          <div class="fc-controls-content">
            <div class="fc-controls-header">
              <h3>Map Controls</h3>
              <button class="fc-controls-close">&times;</button>
            </div>
            <div class="fc-controls-list">
              <div class="fc-control-item">
                <span class="fc-control-key">Click</span>
                <span class="fc-control-desc">Place/move anchor for selected degree</span>
              </div>
              <div class="fc-control-item">
                <span class="fc-control-key">Drag anchor</span>
                <span class="fc-control-desc">Reposition anchor point</span>
              </div>
              <div class="fc-control-item">
                <span class="fc-control-key">Shift + Drag</span>
                <span class="fc-control-desc">Snap to horizontal/vertical axis</span>
              </div>
              <div class="fc-control-item">
                <span class="fc-control-key">${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Click</span>
                <span class="fc-control-desc">Place anchor with current family</span>
              </div>
              <div class="fc-control-item">
                <span class="fc-control-key">Scroll wheel</span>
                <span class="fc-control-desc">Zoom in/out</span>
              </div>
              <div class="fc-control-item">
                <span class="fc-control-key">Middle-drag / Alt + Drag</span>
                <span class="fc-control-desc">Pan the view</span>
              </div>
              <div class="fc-control-item">
                <span class="fc-control-key">Double-click</span>
                <span class="fc-control-desc">Reset zoom to default</span>
              </div>
              <div class="fc-control-item">
                <span class="fc-control-key">Drag orbit handle</span>
                <span class="fc-control-desc">Adjust orbit radius</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Help Modal (uses about-modal structure) -->
        <div class="about-modal-overlay" id="fc-help-modal">
          <div class="about-modal">
            <div class="about-modal-header">
              <span>About Fractal Presets</span>
              <button class="about-modal-close" id="fc-help-close">&times;</button>
            </div>
            <div class="about-modal-body">
              <p>Fractals inspired this entire project—though honestly, the effort-to-aesthetics ratio isn't great. But as a way to explore fractal mathematics, it's educational and endlessly fascinating (well, up to 1000× zoom anyway).</p>
              <p>Each chord root triggers a different fractal anchor point—C through B, twelve in total. Chord qualities like major or minor aren't distinguished. Configure where each root lands in fractal space and watch the harmony unfold.</p>

              <div class="about-section">
                <h3>Note Cards</h3>
                <div class="about-item"><span class="about-label">Edit (✎)</span> — Configure the anchor point and animation</div>
                <div class="about-item"><span class="about-label">Randomize (🎲)</span> — Generate a random anchor</div>
              </div>

              <div class="about-section">
                <h3>Fractal Families</h3>
                <p>Different mathematical formulas create distinct visual styles:</p>
                <div class="about-item"><span class="about-label">Classic</span> — The original Mandelbrot/Julia set</div>
                <div class="about-item"><span class="about-label">Burning Ship</span> — Sharp, crystalline structures</div>
                <div class="about-item"><span class="about-label">Tricorn</span> — Three-fold symmetry patterns</div>
                <div class="about-item"><span class="about-label">Phoenix</span> — Flowing, organic shapes</div>
              </div>

              <div class="about-section">
                <h3>Anchor Placement</h3>
                <p>The anchor point determines the center of your fractal. Different regions create different visual effects:</p>
                <div class="about-item"><span class="about-label">Boundary regions</span> — Most detail and complexity</div>
                <div class="about-item"><span class="about-label">Interior regions</span> — Solid colors, less detail</div>
                <div class="about-item"><span class="about-label">Hotspots</span> — Pre-selected interesting locations</div>
              </div>

              <div class="about-section">
                <h3>Movement</h3>
                <p>The orbit settings control how the fractal animates with the beat. Larger radius = more dramatic movement.</p>
              </div>

              <p class="about-note">Tip: The boundary between colored and black regions has the most visual detail. Zoom in and explore!</p>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  private setupEventHandlers(): void {
    // Section toggles (mobile collapsible sections)
    this.container.querySelectorAll('.fc-section-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const section = (btn as HTMLElement).closest('.fc-section');
        if (section) {
          section.classList.toggle('collapsed');
          const icon = btn.querySelector('.fc-section-icon');
          if (icon) {
            icon.textContent = section.classList.contains('collapsed') ? '▶' : '▼';
          }
        }
      });
    });

    // Family buttons
    const familyBtns = this.container.querySelectorAll('.fc-family-btn');
    const infoBtn = this.container.querySelector('.fc-info-btn') as HTMLElement;
    familyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        familyBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedFamily = parseInt((btn as HTMLElement).dataset.family!);
        this.updateFamilyUI();
        this.renderLocus();
        this.drawOverlay();
        this.updateAssignments();
        // Pulse the info button to indicate new info available
        infoBtn.classList.remove('pulse');
        void infoBtn.offsetWidth; // Force reflow to restart animation
        infoBtn.classList.add('pulse');
      });
    });

    // Click overlay to close
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) this.hide();
    });

    // Info modal close button
    this.container.querySelector('#fc-info-close')?.addEventListener('click', () => this.hideFamilyInfo());

    // Close modal on backdrop click
    this.container.querySelector('#fc-info-modal')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('about-modal-overlay')) {
        this.hideFamilyInfo();
      }
    });

    // Close modal or panel on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.visible) {
        // First check if any modals are open
        const infoModal = this.container.querySelector('#fc-info-modal') as HTMLElement;
        const helpModal = this.container.querySelector('#fc-help-modal') as HTMLElement;

        if (infoModal?.classList.contains('visible')) {
          this.hideFamilyInfo();
        } else if (helpModal?.classList.contains('visible')) {
          helpModal.classList.remove('visible');
        } else {
          // No modals open, close the panel (state is preserved)
          this.hide();
        }
      }
    });

    // Map control buttons
    this.container.querySelectorAll('.fc-map-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).dataset.action;
        this.handleMapControl(action!);
      });
    });

    // Note button clicks (select degree)
    this.container.querySelectorAll('.fc-note-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const el = btn as HTMLElement;
        const deg = parseInt(el.dataset.deg!);
        const quality = el.dataset.quality!;
        this.selectDegreeQuality(deg, quality);
        // Update active state
        this.container.querySelectorAll('.fc-note-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        // Update orbit sliders to show current values for selected degree
        this.updateOrbitSliders();
      });
    });


    // Helper to set up orbit input with buttons and drag support
    const setupOrbitInput = (
      inputSel: string,
      upSel: string,
      downSel: string,
      onUpdate: (value: number) => void,
      sensitivity = 1
    ) => {
      const input = this.container.querySelector(inputSel) as HTMLInputElement;
      if (!input) return;

      const step = parseFloat(input.step) || 1;
      const decimals = step < 1 ? Math.ceil(-Math.log10(step)) : 0;

      const update = () => onUpdate(parseFloat(input.value));
      const clampAndUpdate = (v: number) => {
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        const clamped = Math.max(min, Math.min(max, v));
        // Round to step precision
        const rounded = Math.round(clamped / step) * step;
        input.value = rounded.toFixed(decimals);
        update();
      };

      input.addEventListener('input', update);

      // Button handlers
      this.container.querySelector(upSel)?.addEventListener('click', () => {
        input.stepUp();
        update();
      });
      this.container.querySelector(downSel)?.addEventListener('click', () => {
        input.stepDown();
        update();
      });

      // Drag to change value
      let dragStart = 0;
      let dragValue = 0;
      input.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        dragStart = e.clientY;
        dragValue = parseFloat(input.value);
        input.style.cursor = 'ns-resize';

        const onMove = (me: MouseEvent) => {
          const delta = dragStart - me.clientY;
          clampAndUpdate(dragValue + delta * sensitivity);
        };

        const onUp = () => {
          input.style.cursor = '';
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });
    };

    // Orbit radius (1-100 -> 0.004-0.4)
    setupOrbitInput('.fc-radius-input', '.fc-radius-up', '.fc-radius-down',
      (v) => this.setOrbitRadius(this.selectedDegree, v / 250), 0.5);

    // Orbit skew (20-200 -> 0.2-2.0)
    setupOrbitInput('.fc-skew-input', '.fc-skew-up', '.fc-skew-down',
      (v) => this.setOrbitSkew(this.selectedDegree, v / 100), 1);

    // Orbit rotation (0-628 -> 0-6.28)
    setupOrbitInput('.fc-rotation-input', '.fc-rotation-up', '.fc-rotation-down',
      (v) => this.setOrbitRotation(this.selectedDegree, v / 100), 2);

    // Beat spread (10-200 -> 0.1-2.0)
    setupOrbitInput('.fc-spread-input', '.fc-spread-up', '.fc-spread-down',
      (v) => this.setBeatSpread(this.selectedDegree, v / 100), 1);

    // Anchor real component (-200 to 200 -> -2.0 to 2.0)
    setupOrbitInput('.fc-real-input', '.fc-real-up', '.fc-real-down',
      (v) => this.setAnchorReal(this.selectedDegree, v / 100), 0.5);

    // Anchor imaginary component (-200 to 200 -> -2.0 to 2.0)
    setupOrbitInput('.fc-imag-input', '.fc-imag-up', '.fc-imag-down',
      (v) => this.setAnchorImag(this.selectedDegree, v / 100), 0.5);

    // Anchor viewZoom - exponential slider (0-100 -> 0.1x-10000x)
    const zoomSlider = this.container.querySelector('.fc-zoom-slider') as HTMLInputElement;
    const zoomLabel = this.container.querySelector('.fc-zoom-label') as HTMLElement;
    if (zoomSlider && zoomLabel) {
      const updateZoom = () => {
        const zoom = this.sliderToZoom(parseInt(zoomSlider.value));
        zoomLabel.textContent = this.formatZoom(zoom);
        this.setAnchorZoom(this.selectedDegree, zoom);
      };
      zoomSlider.addEventListener('input', updateZoom);
    }

    // Center map on anchor button
    const centerBtn = this.container.querySelector('.fc-center-btn');
    if (centerBtn) {
      centerBtn.addEventListener('click', () => this.centerMapOnAnchor());
    }

    const atlasBtn = this.container.querySelector('.fc-atlas-btn');
    if (atlasBtn) {
      atlasBtn.addEventListener('click', () => {
        this.showAtlasGrid = !this.showAtlasGrid;
        atlasBtn.classList.toggle('active', this.showAtlasGrid);
        this.drawOverlay();
        const status = this.container.querySelector('#fc-status')!;
        status.textContent = this.showAtlasGrid ? 'Atlas grid ON' : 'Atlas grid OFF';
      });
    }
    // Preset handlers
    this.setupPresetHandlers();

    // Wizard event handlers
    this.setupWizardHandlers();
  }

  /** Set up wizard-specific event handlers */
  private setupWizardHandlers(): void {
    // Help modal (uses about-modal structure)
    const helpModal = createModal({
      overlay: this.container.querySelector('#fc-help-modal') as HTMLElement,
      closeButton: this.container.querySelector('#fc-help-close') as HTMLElement,
    });
    this.container.querySelector('.fc-help-btn')?.addEventListener('click', () => helpModal.open());

    // Navigation buttons - use event delegation for multiple button instances
    this.container.querySelectorAll('.fc-wizard-cancel').forEach(btn => {
      btn.addEventListener('click', () => this.wizardCancel());
    });
    this.container.querySelectorAll('.fc-wizard-back').forEach(btn => {
      btn.addEventListener('click', () => this.wizardBack());
    });
    this.container.querySelectorAll('.fc-wizard-next').forEach(btn => {
      btn.addEventListener('click', () => this.wizardNext());
    });

    // Step 1: Family info buttons (stop propagation to prevent card selection)
    this.container.querySelectorAll('.fc-wizard-family-info-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const familyIdx = parseInt((btn as HTMLElement).dataset.family || '0');
        const savedFamily = this.selectedFamily;
        this.selectedFamily = familyIdx;
        this.showFamilyInfo();
        this.selectedFamily = savedFamily;
      });
    });

    // Step 1: Family tag click to highlight matching tags and show related families
    this.container.querySelectorAll('.fc-wizard-family-tag').forEach(tag => {
      tag.addEventListener('click', (e) => {
        e.stopPropagation();
        const tagText = (tag as HTMLElement).textContent?.toLowerCase();
        const allTags = this.container.querySelectorAll('.fc-wizard-family-tag');
        const isHighlighted = tag.classList.contains('highlighted');
        const relatedSection = this.container.querySelector('.fc-wizard-related-families');
        const relatedChips = this.container.querySelector('.fc-wizard-related-chips');

        // Remove all highlights first
        allTags.forEach(t => t.classList.remove('highlighted'));

        // If wasn't highlighted, highlight all matching tags and show related families
        if (!isHighlighted && tagText) {
          const matchingFamilies: string[] = [];
          allTags.forEach(t => {
            if ((t as HTMLElement).textContent?.toLowerCase() === tagText) {
              t.classList.add('highlighted');
              // Get parent card's family name
              const card = t.closest('.fc-wizard-family-card');
              if (card) {
                const familyIdx = parseInt((card as HTMLElement).dataset.family || '0');
                const familyName = FAMILIES[familyIdx]?.label;
                if (familyName && !matchingFamilies.includes(familyName)) {
                  matchingFamilies.push(familyName);
                }
              }
            }
          });

          // Show related families section
          if (relatedSection && relatedChips && matchingFamilies.length > 0) {
            relatedChips.innerHTML = matchingFamilies.map(name =>
              `<span class="fc-wizard-related-chip">${name}</span>`
            ).join('');
            relatedSection.classList.add('visible');

            // Add click handlers to chips
            relatedChips.querySelectorAll('.fc-wizard-related-chip').forEach(chip => {
              chip.addEventListener('click', () => {
                const familyName = chip.textContent;
                const familyIdx = FAMILIES.findIndex(f => f.label === familyName);
                if (familyIdx >= 0) {
                  const card = this.container.querySelector(`.fc-wizard-family-card[data-family="${familyIdx}"]`);
                  if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.classList.add('pulse');
                    setTimeout(() => card.classList.remove('pulse'), 600);
                  }
                }
              });
            });
          }
        } else {
          // Hide related families section
          if (relatedSection) {
            relatedSection.classList.remove('visible');
          }
        }
      });
    });

    // Step 1: Family selection
    this.container.querySelectorAll('.fc-wizard-family-card').forEach(card => {
      card.addEventListener('click', () => {
        const familyIdx = parseInt((card as HTMLElement).dataset.family || '0');
        const isEditMode = this.wizardState.tempAnchor &&
          (this.wizardState.tempAnchor.real !== 0 || this.wizardState.tempAnchor.imag !== 0);

        if (isEditMode && this.wizardState.tempAnchor) {
          // Edit mode: just update family on existing anchor
          this.wizardState.tempAnchor.familyIdx = familyIdx;
        } else {
          // New note mode: create temp anchor with this family
          this.wizardState.tempAnchor = {
            familyIdx,
            real: 0,
            imag: 0,
            orbitRadius: DEFAULT_ORBIT_RADIUS,
            orbitSkew: DEFAULT_ORBIT_SKEW,
            orbitRotation: DEFAULT_ORBIT_ROTATION,
            beatSpread: DEFAULT_BEAT_SPREAD,
            viewZoom: DEFAULT_VIEW_ZOOM,
          };
        }

        // Update selection UI
        this.container.querySelectorAll('.fc-wizard-family-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        if (isEditMode) {
          // Edit mode: show Next button, don't auto-advance
          const nextBtn = this.container.querySelector('.fc-wizard-family-next') as HTMLElement;
          if (nextBtn) nextBtn.style.display = '';
        } else {
          // New note mode: auto-advance to next step
          this.wizardNext();
        }
      });
    });

    // Family step Next button (for edit mode)
    this.container.querySelector('.fc-wizard-family-next')?.addEventListener('click', () => {
      this.wizardNext();
    });

    // Step 1: Note selection - click goes directly to family selector
    this.container.querySelectorAll('.fc-wizard-note-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Don't trigger if dice or edit button was clicked
        const target = e.target as HTMLElement;
        if (target.classList.contains('fc-wizard-note-dice') || target.classList.contains('fc-wizard-note-edit')) return;

        const noteIdx = parseInt((btn as HTMLElement).dataset.note || '0');

        // If note is already configured, edit it
        if (this.wizardState.configuredNotes.has(noteIdx)) {
          this.editNoteAnchor(noteIdx);
          return;
        }

        // Select this note and go to family selector
        this.wizardState.assignedNotes = [noteIdx];
        this.updateWizardNoteGrid();
        this.wizardNext();
      });
    });

    // Dice buttons - random fractal for this note
    this.container.querySelectorAll('.fc-wizard-note-dice').forEach(dice => {
      dice.addEventListener('click', (e) => {
        e.stopPropagation();
        const noteIdx = parseInt((dice as HTMLElement).dataset.note || '0');
        this.randomizeNoteAnchor(noteIdx);
      });
    });

    // Edit buttons - go to anchor placement step
    this.container.querySelectorAll('.fc-wizard-note-edit').forEach(edit => {
      edit.addEventListener('click', (e) => {
        e.stopPropagation();
        const noteIdx = parseInt((edit as HTMLElement).dataset.note || '0');
        this.editNoteAnchor(noteIdx);
      });
    });

    // Step 4: Movement presets
    this.container.querySelectorAll('.fc-wizard-movement-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = (btn as HTMLElement).dataset.preset as keyof typeof MOVEMENT_PRESETS;
        if (preset) {
          this.wizardState.movementPreset = preset;
          this.updateMovementPreview();
        }
      });
    });

    // Parameter controls with slider + number input sync
    this.setupParamControls();

    // Home page: Name input - validate on change
    const nameInput = this.container.querySelector('.fc-wizard-name-input') as HTMLInputElement;
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        this.wizardState.presetName = nameInput.value;
        this.updateSaveButtonState();
      });
    }

    // Home page: Save preset button
    this.container.querySelector('.fc-wizard-save-btn')?.addEventListener('click', () => {
      this.saveAsPreset();
    });

    // Initial save button state
    this.updateSaveButtonState();

    // Home page: Copy as code button
    this.container.querySelector('.fc-wizard-copy-code')?.addEventListener('click', () => {
      this.copyAnchorsAsCode();
    });

    // Home page: New preset button - clear all configured notes
    this.container.querySelector('.fc-wizard-new-preset')?.addEventListener('click', () => {
      this.startNewPreset();
    });

    // Render family thumbnails on load
    this.renderWizardFamilyThumbnails();
  }

  /** Render thumbnails for wizard family grid */
  private renderWizardFamilyThumbnails(): void {
    const cards = this.container.querySelectorAll('.fc-wizard-family-card');
    cards.forEach(card => {
      const familyIdx = parseInt((card as HTMLElement).dataset.family || '0');
      const canvas = card.querySelector('canvas') as HTMLCanvasElement;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const f = FAMILIES[familyIdx];
      const size = canvas.width;
      const img = ctx.createImageData(size, size);
      const d = img.data;
      const b = f.bounds;
      const rStep = (b.rMax - b.rMin) / size;
      const iStep = (b.iMax - b.iMin) / size;
      const maxIter = 50;

      for (let py = 0; py < size; py++) {
        const ci = b.iMin + py * iStep;
        for (let px = 0; px < size; px++) {
          const cr = b.rMin + px * rStep;
          const esc = f.locus(cr, ci, maxIter);
          const idx = (py * size + px) * 4;
          if (esc === 0) {
            d[idx] = 8; d[idx + 1] = 8; d[idx + 2] = 16;
          } else {
            const t = Math.sqrt(esc / maxIter);
            d[idx] = Math.round(12 + t * 80);
            d[idx + 1] = Math.round(20 + t * 140);
            d[idx + 2] = Math.round(35 + t * 120);
          }
          d[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    });
  }

  /** Convert pixel to c-value using wizard map bounds */
  private wizardPixelToC(px: number, py: number): { r: number; i: number } {
    const f = FAMILIES[this.wizardState.tempAnchor?.familyIdx ?? 0];
    const b = this.wizardState.mapBounds || f.bounds;
    return {
      r: b.rMin + (px / PANEL_SIZE) * (b.rMax - b.rMin),
      i: b.iMin + (py / PANEL_SIZE) * (b.iMax - b.iMin),
    };
  }

  /** Zoom wizard map around anchor point (or center if not placed) */
  private wizardMapZoom(factor: number): void {
    if (!this.wizardState.tempAnchor || !this.wizardState.mapBounds) return;

    const f = FAMILIES[this.wizardState.tempAnchor.familyIdx];
    const newZoom = Math.max(1, Math.min(1000, this.wizardState.mapZoom * factor));
    const anchor = this.wizardState.tempAnchor;

    // Zoom center: anchor point if placed, otherwise center of current view
    const hasAnchor = anchor.real !== 0 || anchor.imag !== 0;
    const b = this.wizardState.mapBounds;
    const centerR = hasAnchor ? anchor.real : (b.rMin + b.rMax) / 2;
    const centerI = hasAnchor ? anchor.imag : (b.iMin + b.iMax) / 2;

    // Calculate new bounds at zoom level, centered on zoom point
    const origWidth = f.bounds.rMax - f.bounds.rMin;
    const origHeight = f.bounds.iMax - f.bounds.iMin;
    const newWidth = origWidth / newZoom;
    const newHeight = origHeight / newZoom;

    this.wizardState.mapBounds = {
      rMin: centerR - newWidth / 2,
      rMax: centerR + newWidth / 2,
      iMin: centerI - newHeight / 2,
      iMax: centerI + newHeight / 2,
    };
    this.wizardState.mapZoom = newZoom;

    // Use debounced render for smooth zoom
    this.debouncedWizardRender();
    this.updateWizardZoomSlider();
  }

  /** Reset wizard map to initial bounds */
  private wizardMapReset(): void {
    if (!this.wizardState.tempAnchor) return;
    const f = FAMILIES[this.wizardState.tempAnchor.familyIdx];
    this.wizardState.mapBounds = { ...f.bounds };
    this.wizardState.mapZoom = 1;
    // Clear the buffer to force fresh render at 1x
    this.wizardLocusBuffer = null;
    this.wizardRenderedBounds = null;

    const wizardCanvas = this.container.querySelector('.fc-wizard-locus-canvas') as HTMLCanvasElement;
    const hasAnchor = this.wizardState.tempAnchor.real !== 0 || this.wizardState.tempAnchor.imag !== 0;
    if (wizardCanvas) {
      if (hasAnchor) {
        this.renderWizardLocusOverlay(wizardCanvas);
      } else {
        this.renderWizardLocus(wizardCanvas);
      }
    }
    // Start animated preview at reset zoom
    if (hasAnchor) {
      this.startWizardPreview(this.wizardState.tempAnchor);
    }
    this.updateWizardZoomSlider();
  }

  /** Jump to a random interesting hotspot for the current family */
  private wizardJumpToHotspot(wizardCanvas: HTMLCanvasElement): void {
    if (!this.wizardState.tempAnchor) return;

    const family = FAMILIES[this.wizardState.tempAnchor.familyIdx];
    const info = FAMILY_INFO[family.id];
    if (!info?.hotspots?.length) return;

    // Pick a random hotspot
    const hotspot = info.hotspots[Math.floor(Math.random() * info.hotspots.length)];

    // Parse hotspot string like "c = -0.75 (period-2 bulb)" or "c = -0.12 + 0.74i (spiral)"
    // Also handles "z₀ = 0 + 0i (classic)" format
    // Format: c|z₀ = <real> or c|z₀ = <real> +/- <imag>i
    const match = hotspot.match(/(?:c|z₀)\s*=\s*(-?[\d.]+)(?:\s*([+-])\s*([\d.]+)i)?/);
    if (!match) {
      // Fallback to family center for non-parseable hotspots (like Newton "Origin region")
      const f = FAMILIES[this.wizardState.tempAnchor.familyIdx];
      this.wizardState.tempAnchor.real = (f.bounds.rMin + f.bounds.rMax) / 2;
      this.wizardState.tempAnchor.imag = (f.bounds.iMin + f.bounds.iMax) / 2;
      this.renderWizardLocusOverlay(wizardCanvas);
      this.updateWizardZoomSlider();
      this.startWizardPreview(this.wizardState.tempAnchor);
      return;
    }

    const real = parseFloat(match[1]);
    const imag = match[3] ? parseFloat(match[3]) * (match[2] === '-' ? -1 : 1) : 0;

    // Set anchor position
    this.wizardState.tempAnchor.real = real;
    this.wizardState.tempAnchor.imag = imag;

    // Center view on the hotspot with some zoom
    const f = FAMILIES[this.wizardState.tempAnchor.familyIdx];
    const baseW = f.bounds.rMax - f.bounds.rMin;
    const baseH = f.bounds.iMax - f.bounds.iMin;

    // Set zoom to 4x for a good view of the detail
    this.wizardState.mapZoom = 4;
    const w = baseW / 4;
    const h = baseH / 4;

    this.wizardState.mapBounds = {
      rMin: real - w / 2,
      rMax: real + w / 2,
      iMin: imag - h / 2,
      iMax: imag + h / 2
    };

    // Clear buffer and re-render
    this.wizardLocusBuffer = null;
    this.wizardRenderedBounds = null;
    this.renderWizardLocusOverlay(wizardCanvas);
    this.updateWizardZoomSlider();
    this.startWizardPreview(this.wizardState.tempAnchor);
  }

  /** Set up wizard step 2 map canvas interactions */
  private setupWizardMapInteractions(): void {
    const wizardCanvas = this.container.querySelector('.fc-wizard-locus-canvas') as HTMLCanvasElement;
    if (!wizardCanvas) return;

    const getPos = (e: MouseEvent | Touch) => {
      const rect = wizardCanvas.getBoundingClientRect();
      const clientX = 'clientX' in e ? e.clientX : (e as Touch).clientX;
      const clientY = 'clientY' in e ? e.clientY : (e as Touch).clientY;
      return {
        x: (clientX - rect.left) * PANEL_SIZE / rect.width,
        y: (clientY - rect.top) * PANEL_SIZE / rect.height,
      };
    };

    // Helper to get beat point pixel positions for orbit dragging
    const getBeatPointPixels = () => {
      const anchor = this.wizardState.tempAnchor;
      const b = this.wizardState.mapBounds;
      if (!anchor || !b || anchor.orbitRadius <= 0) return [];

      const rangeR = b.rMax - b.rMin;
      const rangeI = b.iMax - b.iMin;
      const cosR = Math.cos(anchor.orbitRotation);
      const sinR = Math.sin(anchor.orbitRotation);
      const points: { x: number; y: number; idx: number }[] = [];

      for (let oi = 0; oi < 4; oi++) {
        const isBackbeat = (oi === 1 || oi === 3);
        const r = isBackbeat ? anchor.orbitRadius * anchor.orbitSkew : anchor.orbitRadius;
        const angle = oi * anchor.beatSpread;
        const opx = r * Math.cos(angle);
        const opy = r * Math.sin(angle);
        const dr = opx * cosR - opy * sinR;
        const di = opx * sinR + opy * cosR;

        const bpx = ((anchor.real + dr - b.rMin) / rangeR) * PANEL_SIZE;
        const bpy = ((anchor.imag + di - b.iMin) / rangeI) * PANEL_SIZE;
        points.push({ x: bpx, y: bpy, idx: oi });
      }
      return points;
    };

    // Track drag state
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let boundsAtDragStart: typeof this.wizardState.mapBounds = null;
    let orbitDragMode = false;

    // Click to place anchor (only if not dragging)
    let clickPending = false;
    let clickPos = { x: 0, y: 0 };

    wizardCanvas.addEventListener('mousedown', (e) => {
      if (this.currentMode !== 'wizard' || this.wizardState.step !== 'place-anchor') return;
      clickPos = getPos(e);
      dragStart = clickPos;
      boundsAtDragStart = this.wizardState.mapBounds ? { ...this.wizardState.mapBounds } : null;

      // Check if clicking near a beat point (for orbit dragging)
      const beatPoints = getBeatPointPixels();
      const HIT_RADIUS = 15;
      let hitBeatPoint = false;
      for (const bp of beatPoints) {
        const dist = Math.sqrt((clickPos.x - bp.x) ** 2 + (clickPos.y - bp.y) ** 2);
        if (dist < HIT_RADIUS) {
          hitBeatPoint = true;
          break;
        }
      }

      if (hitBeatPoint) {
        orbitDragMode = true;
        isDragging = true;
        clickPending = false;
        wizardCanvas.style.cursor = 'move';
      } else {
        orbitDragMode = false;
        isDragging = false;
        clickPending = true;
      }
    });

    wizardCanvas.addEventListener('mousemove', (e) => {
      if (this.currentMode !== 'wizard' || this.wizardState.step !== 'place-anchor') return;
      if (!boundsAtDragStart || !this.wizardState.mapBounds) return;

      const pos = getPos(e);

      // Handle orbit dragging
      if (orbitDragMode && this.wizardState.tempAnchor) {
        const anchor = this.wizardState.tempAnchor;
        const b = this.wizardState.mapBounds;
        const rangeR = b.rMax - b.rMin;
        const rangeI = b.iMax - b.iMin;

        // Convert anchor center to pixels
        const anchorPx = ((anchor.real - b.rMin) / rangeR) * PANEL_SIZE;
        const anchorPy = ((anchor.imag - b.iMin) / rangeI) * PANEL_SIZE;

        // Calculate distance and angle from anchor to mouse
        const dx = pos.x - anchorPx;
        const dy = pos.y - anchorPy;
        const distPx = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Convert pixel distance to complex plane distance
        const newRadius = (distPx / PANEL_SIZE) * rangeR;

        // Update orbit radius and rotation
        anchor.orbitRadius = Math.max(0.001, newRadius);
        anchor.orbitRotation = angle;

        // Switch to custom mode
        this.wizardState.movementPreset = 'custom';

        // Update sliders and redraw
        this.syncParamInputs();
        this.renderWizardLocusOverlay(wizardCanvas);
        this.startWizardPreview(anchor);
        return;
      }

      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;

      // If moved more than 5px, start dragging (pan mode)
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isDragging = true;
        clickPending = false;
        wizardCanvas.style.cursor = 'grabbing';

        // Pan bounds
        const rRange = boundsAtDragStart.rMax - boundsAtDragStart.rMin;
        const iRange = boundsAtDragStart.iMax - boundsAtDragStart.iMin;
        const drPx = (dx / PANEL_SIZE) * rRange;
        const diPx = (dy / PANEL_SIZE) * iRange;

        this.wizardState.mapBounds = {
          rMin: boundsAtDragStart.rMin - drPx,
          rMax: boundsAtDragStart.rMax - drPx,
          iMin: boundsAtDragStart.iMin - diPx,
          iMax: boundsAtDragStart.iMax - diPx,
        };

        // Re-render
        if (this.wizardState.tempAnchor?.real !== 0 || this.wizardState.tempAnchor?.imag !== 0) {
          this.renderWizardLocusOverlay(wizardCanvas);
        } else {
          this.renderWizardLocus(wizardCanvas);
        }
      }
    });

    const endDrag = () => {
      if (this.currentMode !== 'wizard' || this.wizardState.step !== 'place-anchor') return;

      wizardCanvas.style.cursor = 'crosshair';

      // Handle click if wasn't a drag (place anchor)
      if (clickPending && !isDragging && !orbitDragMode && this.wizardState.tempAnchor) {
        const c = this.wizardPixelToC(clickPos.x, clickPos.y);

        // Update temp anchor position
        this.wizardState.tempAnchor.real = c.r;
        this.wizardState.tempAnchor.imag = c.i;

        // Update coords display and sliders
        this.syncParamInputs();
        const coordsText = `c = ${c.r.toFixed(4)} + ${c.i.toFixed(4)}i`;
        const coordsFooter = this.container.querySelector('.fc-wizard-anchor-coords-display');
        if (coordsFooter) coordsFooter.textContent = coordsText;

        // Mark anchor on map and start animated preview
        this.renderWizardLocusOverlay(wizardCanvas);
        this.startWizardPreview(this.wizardState.tempAnchor);
      }

      isDragging = false;
      clickPending = false;
      orbitDragMode = false;
      boundsAtDragStart = null;
    };

    wizardCanvas.addEventListener('mouseup', endDrag);
    wizardCanvas.addEventListener('mouseleave', () => {
      if (isDragging || orbitDragMode) {
        wizardCanvas.style.cursor = 'crosshair';
        isDragging = false;
        orbitDragMode = false;
      }
    });

    // Hover detection for beat points (cursor feedback)
    wizardCanvas.addEventListener('mousemove', (e) => {
      if (isDragging || orbitDragMode) return;
      if (this.currentMode !== 'wizard' || this.wizardState.step !== 'place-anchor') return;

      const pos = getPos(e);
      const beatPoints = getBeatPointPixels();
      const HIT_RADIUS = 15;
      let nearBeatPoint = false;

      for (const bp of beatPoints) {
        const dist = Math.sqrt((pos.x - bp.x) ** 2 + (pos.y - bp.y) ** 2);
        if (dist < HIT_RADIUS) {
          nearBeatPoint = true;
          break;
        }
      }

      wizardCanvas.style.cursor = nearBeatPoint ? 'move' : 'crosshair';
    });

    // Scroll wheel zoom (always zooms on anchor point or center)
    wizardCanvas.addEventListener('wheel', (e) => {
      if (this.currentMode !== 'wizard' || this.wizardState.step !== 'place-anchor') return;
      e.preventDefault();

      const factor = e.deltaY < 0 ? 1.08 : 0.93;
      this.wizardMapZoom(factor);
    }, { passive: false });

    // Map control buttons (within wizard map controls container)
    const controlsContainer = this.container.querySelector('.fc-wizard-map-controls');
    if (controlsContainer) {
      controlsContainer.querySelectorAll('.fc-map-btn[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = (btn as HTMLElement).dataset.action;
          switch (action) {
            case 'zoom-in': this.wizardMapZoom(1.5); break;
            case 'zoom-out': this.wizardMapZoom(0.67); break;
            case 'reset': this.wizardMapReset(); break;
            case 'pan-up': this.wizardMapPan(0, -0.2); break;
            case 'pan-down': this.wizardMapPan(0, 0.2); break;
            case 'pan-left': this.wizardMapPan(-0.2, 0); break;
            case 'pan-right': this.wizardMapPan(0.2, 0); break;
          }
        });
      });

      // Atlas toggle
      const atlasBtn = controlsContainer.querySelector('.fc-wizard-atlas-btn');
      atlasBtn?.addEventListener('click', () => {
        this.wizardState.showAtlas = !this.wizardState.showAtlas;
        atlasBtn.classList.toggle('active', this.wizardState.showAtlas);
        // Re-render with atlas grid
        if (this.wizardState.tempAnchor?.real !== 0 || this.wizardState.tempAnchor?.imag !== 0) {
          this.renderWizardLocusOverlay(wizardCanvas);
        } else {
          this.renderWizardLocus(wizardCanvas);
        }
      });

    }

    // Position section buttons (in sidebar)
    const hotspotBtn = this.container.querySelector('.fc-wizard-hotspot-btn');
    hotspotBtn?.addEventListener('click', () => {
      this.wizardJumpToHotspot(wizardCanvas);
    });

    const centerBtn = this.container.querySelector('.fc-wizard-center-btn');
    centerBtn?.addEventListener('click', () => {
      this.wizardCenterOnAnchor(wizardCanvas);
    });

    // Render locus when wizard step 2 becomes active (only if no anchor yet)
    const hasAnchor = this.wizardState.tempAnchor?.real !== 0 || this.wizardState.tempAnchor?.imag !== 0;
    if (!hasAnchor) {
      this.renderWizardLocus(wizardCanvas);
    }
  }

  /** Update wizard zoom slider to reflect current zoom level */
  private updateWizardZoomSlider(): void {
    this.syncParamInputs();
  }

  /** Pan wizard map by a fraction of the current view */
  private wizardMapPan(dxFrac: number, dyFrac: number): void {
    if (!this.wizardState.mapBounds) return;

    const b = this.wizardState.mapBounds;
    const rRange = b.rMax - b.rMin;
    const iRange = b.iMax - b.iMin;
    const dr = dxFrac * rRange;
    const di = dyFrac * iRange;

    this.wizardState.mapBounds = {
      rMin: b.rMin + dr,
      rMax: b.rMax + dr,
      iMin: b.iMin + di,
      iMax: b.iMax + di,
    };

    // Use debounced render for smooth panning
    this.debouncedWizardRender();
  }

  /** Center wizard map on current anchor position */
  private wizardCenterOnAnchor(wizardCanvas: HTMLCanvasElement): void {
    if (!this.wizardState.tempAnchor || !this.wizardState.mapBounds) return;

    const anchor = this.wizardState.tempAnchor;
    // Only center if anchor has been placed
    if (anchor.real === 0 && anchor.imag === 0) return;

    const b = this.wizardState.mapBounds;
    const halfW = (b.rMax - b.rMin) / 2;
    const halfH = (b.iMax - b.iMin) / 2;

    this.wizardState.mapBounds = {
      rMin: anchor.real - halfW,
      rMax: anchor.real + halfW,
      iMin: anchor.imag - halfH,
      iMax: anchor.imag + halfH,
    };

    // Clear buffer and re-render
    this.wizardLocusBuffer = null;
    this.wizardRenderedBounds = null;
    this.renderWizardLocusOverlay(wizardCanvas);
    this.syncParamInputs();
  }

  /** Render locus for wizard step 2 */
  private renderWizardLocus(canvas: HTMLCanvasElement): void {
    if (!this.wizardState.tempAnchor) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const f = FAMILIES[this.wizardState.tempAnchor.familyIdx];
    // Use wizard map bounds if available, otherwise family bounds
    const b = this.wizardState.mapBounds || f.bounds;
    const size = canvas.width;
    const img = ctx.createImageData(size, size);
    const d = img.data;
    const rStep = (b.rMax - b.rMin) / size;
    const iStep = (b.iMax - b.iMin) / size;
    // Scale iterations with zoom for fidelity at deep zoom
    const baseIter = 100;
    const extraIter = Math.floor(Math.log2(this.wizardState.mapZoom)) * 50;
    const maxIter = baseIter + extraIter;

    for (let py = 0; py < size; py++) {
      const ci = b.iMin + py * iStep;
      for (let px = 0; px < size; px++) {
        const cr = b.rMin + px * rStep;
        const esc = f.locus(cr, ci, maxIter);
        const idx = (py * size + px) * 4;
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

    // Cache the result for scaled preview
    if (!this.wizardLocusBuffer) {
      this.wizardLocusBuffer = document.createElement('canvas');
      this.wizardLocusBuffer.width = size;
      this.wizardLocusBuffer.height = size;
    }
    this.wizardLocusBuffer.getContext('2d')!.drawImage(canvas, 0, 0);
    this.wizardRenderedBounds = { ...b };

    // Draw atlas grid if enabled
    if (this.wizardState.showAtlas) {
      this.drawWizardAtlasGrid(canvas, ctx);
    }
  }

  /** Draw scaled preview for wizard map during zoom (before full re-render) */
  private drawWizardScaledPreview(canvas: HTMLCanvasElement): void {
    if (!this.wizardLocusBuffer || !this.wizardRenderedBounds || !this.wizardState.mapBounds) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const view = this.wizardState.mapBounds;
    const rendered = this.wizardRenderedBounds;
    const size = canvas.width;

    // Calculate source rect in the buffer that corresponds to new view
    const srcX = (view.rMin - rendered.rMin) / (rendered.rMax - rendered.rMin) * size;
    const srcY = (view.iMin - rendered.iMin) / (rendered.iMax - rendered.iMin) * size;
    const srcW = (view.rMax - view.rMin) / (rendered.rMax - rendered.rMin) * size;
    const srcH = (view.iMax - view.iMin) / (rendered.iMax - rendered.iMin) * size;

    // Draw scaled buffer to canvas
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'low';
    ctx.fillStyle = '#081020';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(this.wizardLocusBuffer, srcX, srcY, srcW, srcH, 0, 0, size, size);
  }

  /** Debounced wizard locus render */
  private debouncedWizardRender(): void {
    const wizardCanvas = this.container.querySelector('.fc-wizard-locus-canvas') as HTMLCanvasElement;
    if (!wizardCanvas) return;

    // Show scaled preview immediately for responsive feel
    this.drawWizardScaledPreview(wizardCanvas);

    // Draw anchor overlay if placed
    const hasAnchor = this.wizardState.tempAnchor?.real !== 0 || this.wizardState.tempAnchor?.imag !== 0;
    if (hasAnchor) {
      this.drawWizardAnchorOverlay(wizardCanvas);
    }

    // Debounce the expensive full render
    if (this.wizardZoomDebounceTimer !== null) {
      clearTimeout(this.wizardZoomDebounceTimer);
    }
    this.wizardZoomDebounceTimer = window.setTimeout(() => {
      this.wizardZoomDebounceTimer = null;
      if (this.wizardState.tempAnchor?.real !== 0 || this.wizardState.tempAnchor?.imag !== 0) {
        this.renderWizardLocusOverlay(wizardCanvas);
      } else {
        this.renderWizardLocus(wizardCanvas);
      }
    }, 150);
  }

  /** Draw just the anchor marker overlay (without re-rendering locus) */
  private drawWizardAnchorOverlay(canvas: HTMLCanvasElement): void {
    if (!this.wizardState.tempAnchor || !this.wizardState.mapBounds) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const anchor = this.wizardState.tempAnchor;
    const b = this.wizardState.mapBounds;
    const size = canvas.width;

    // Convert anchor position to pixel coords
    const px = ((anchor.real - b.rMin) / (b.rMax - b.rMin)) * size;
    const py = ((anchor.imag - b.iMin) / (b.iMax - b.iMin)) * size;

    // Draw crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, size);
    ctx.moveTo(0, py);
    ctx.lineTo(size, py);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw anchor dot
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, TWO_PI);
    ctx.fillStyle = '#16c79a';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /** Draw atlas grid overlay on wizard map */
  private drawWizardAtlasGrid(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    if (!this.wizardState.tempAnchor || !this.wizardState.mapBounds) return;

    const GRID_SIZE = 8;
    const THUMB_DRAW_SIZE = canvas.width / GRID_SIZE;
    const b = this.wizardState.mapBounds;
    const f = FAMILIES[this.wizardState.tempAnchor.familyIdx];

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
        const thumbCtx = thumbCanvas.getContext('2d')!;
        const img = thumbCtx.createImageData(thumbSize, thumbSize);
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
              // Use accent color for wizard atlas
              d[idx] = Math.min(255, Math.round(t * 22));
              d[idx + 1] = Math.min(255, Math.round(t * 199));
              d[idx + 2] = Math.min(255, Math.round(t * 154));
            }
            d[idx + 3] = 200;
          }
        }
        thumbCtx.putImageData(img, 0, 0);

        // Draw on canvas
        const drawX = gx * THUMB_DRAW_SIZE;
        const drawY = gy * THUMB_DRAW_SIZE;
        ctx.drawImage(thumbCanvas, drawX, drawY, THUMB_DRAW_SIZE, THUMB_DRAW_SIZE);

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.strokeRect(drawX, drawY, THUMB_DRAW_SIZE, THUMB_DRAW_SIZE);
      }
    }
  }

  /** Render overlay showing anchor position on wizard locus */
  private renderWizardLocusOverlay(canvas: HTMLCanvasElement): void {
    if (!this.wizardState.tempAnchor) return;

    // First redraw the locus
    this.renderWizardLocus(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const anchor = this.wizardState.tempAnchor;
    const f = FAMILIES[anchor.familyIdx];
    // Use wizard map bounds if available
    const b = this.wizardState.mapBounds || f.bounds;
    const size = canvas.width;

    // Convert anchor position to pixel coords
    const px = ((anchor.real - b.rMin) / (b.rMax - b.rMin)) * size;
    const py = ((anchor.imag - b.iMin) / (b.iMax - b.iMin)) * size;

    // Draw crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, size);
    ctx.moveTo(0, py);
    ctx.lineTo(size, py);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw orbit beat points if there's any orbit radius
    if (anchor.orbitRadius > 0) {
      const rangeR = b.rMax - b.rMin;
      const rangeI = b.iMax - b.iMin;
      const baseRadius = anchor.orbitRadius;
      const cosR = Math.cos(anchor.orbitRotation);
      const sinR = Math.sin(anchor.orbitRotation);

      for (let oi = 0; oi < 4; oi++) {
        const isBackbeat = (oi === 1 || oi === 3);
        const r = isBackbeat ? baseRadius * anchor.orbitSkew : baseRadius;
        const angle = oi * anchor.beatSpread;
        const opx = r * Math.cos(angle);
        const opy = r * Math.sin(angle);
        const dr = opx * cosR - opy * sinR;
        const di = opx * sinR + opy * cosR;

        // Convert to pixel coords
        const bpx = ((anchor.real + dr - b.rMin) / rangeR) * size;
        const bpy = ((anchor.imag + di - b.iMin) / rangeI) * size;

        // Draw line from center to beat point
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(bpx, bpy);
        ctx.strokeStyle = ORBIT_COLORS[oi];
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw beat point dot (larger for easier dragging)
        ctx.beginPath();
        ctx.arc(bpx, bpy, 7, 0, TWO_PI);
        ctx.fillStyle = ORBIT_COLORS[oi];
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Draw anchor dot (on top of orbit lines)
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, TWO_PI);
    ctx.fillStyle = '#16c79a';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /** Render Julia for wizard preview */
  private cToPixel(r: number, i: number): { x: number; y: number } {
    const b = this.viewBounds[this.selectedFamily];
    return {
      x: (r - b.rMin) / (b.rMax - b.rMin) * PANEL_SIZE,
      y: (i - b.iMin) / (b.iMax - b.iMin) * PANEL_SIZE,
    };
  }

  private selectDegreeQuality(deg: number, quality: string): void {
    this.selectedDegree = deg;
    this.selectedQuality = quality;

    // Sync palette to match selected pitch class (colors match visualizer)
    this.setPalette(deg);

    // Update anchor section color
    const anchorSection = this.container.querySelector('.fc-anchor-section') as HTMLElement;
    if (anchorSection) {
      anchorSection.style.setProperty('--anchor-color', NOTE_COLORS[deg]);
    }

    // Update grid cell highlighting
    this.container.querySelectorAll('.fc-grid-cell').forEach(cell => {
      const el = cell as HTMLElement;
      const cellDeg = parseInt(el.dataset.deg!);
      const cellQuality = el.dataset.quality!;
      cell.classList.toggle('active', cellDeg === deg && cellQuality === quality);
    });

    const a = this.currentAnchor;
    if (a) {
      // Switch to this anchor's family and update UI
      this.selectedFamily = a.familyIdx;
      this.updateFamilyUI();
      this.renderLocus();
      this.startPreview(a);
    } else {
      this.stopPreview();
    }
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
    // Update palette button UI
    this.container.querySelectorAll('.fc-palette-btn').forEach((btn, i) => {
      btn.classList.toggle('active', i === idx);
    });
  }

  private loadAnchors(): void {
    this.markAllThumbnailsDirty();
    const stored = loadFractalAnchors();
    if (stored) {
      // Load stored anchors - for backwards compatibility, copy each degree to all qualities
      for (let deg = 0; deg <= 11; deg++) {
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
              viewZoom: a.viewZoom ?? DEFAULT_VIEW_ZOOM,
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
                viewZoom: anchor.viewZoom,
              });
            }
          }
        }
      }
    } else {
      this.resetToDefaults();
      return; // resetToDefaults handles everything including updateResetButtonState
    }
    this.syncOrbitSliders();
    this.updateResetButtonState();
  }

  private resetToDefaults(): void {
    this.anchors.clear();
    this.markAllThumbnailsDirty();

    // Reset view bounds and zoom levels to defaults
    for (let i = 0; i < FAMILIES.length; i++) {
      this.viewBounds[i] = { ...FAMILIES[i].bounds };
      this.renderedBounds[i] = { ...FAMILIES[i].bounds };
      this.zoomLevels[i] = 1.0;
    }

    for (let deg = 0; deg <= 11; deg++) {
      const p = DEFAULT_ANCHORS[deg];
      const fi = TYPE_TO_FAMILY[p.type];
      const anchor: InternalAnchor = {
        familyIdx: fi,
        real: p.real,
        imag: p.imag,
        orbitRadius: p.orbitRadius,
        orbitSkew: p.orbitSkew ?? DEFAULT_ORBIT_SKEW,
        orbitRotation: p.orbitRotation ?? DEFAULT_ORBIT_ROTATION,
        beatSpread: p.beatSpread ?? DEFAULT_BEAT_SPREAD,
        viewZoom: p.viewZoom ?? DEFAULT_VIEW_ZOOM,
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
          viewZoom: anchor.viewZoom,
        });
      }
    }
    this.syncOrbitSliders();
    this.renderLocus();
    this.drawOverlay();
    this.updateAssignments();
    this.updateResetButtonState();
    this.selectDegreeQuality(0, 'major');  // Select C (pitch class 0) by default
  }

  /** Check if all anchors match preset defaults */
  private anchorsMatchDefaults(): boolean {
    for (let deg = 0; deg <= 11; deg++) {
      const key = this.anchorKey(deg, 'major');
      const a = this.anchors.get(key);
      const p = DEFAULT_ANCHORS[deg];
      if (!a) return false;

      const fi = TYPE_TO_FAMILY[p.type];
      const tolerance = 0.001;

      if (a.familyIdx !== fi) return false;
      if (Math.abs(a.real - p.real) > tolerance) return false;
      if (Math.abs(a.imag - p.imag) > tolerance) return false;
      if (Math.abs(a.orbitRadius - p.orbitRadius) > tolerance) return false;
      if (Math.abs(a.orbitSkew - (p.orbitSkew ?? DEFAULT_ORBIT_SKEW)) > tolerance) return false;
      if (Math.abs(a.orbitRotation - (p.orbitRotation ?? DEFAULT_ORBIT_ROTATION)) > tolerance) return false;
      if (Math.abs(a.beatSpread - (p.beatSpread ?? DEFAULT_BEAT_SPREAD)) > tolerance) return false;
    }
    return true;
  }

  /** Update reset, save, and copy button disabled state */
  private updateResetButtonState(): void {
    const atDefaults = this.anchorsMatchDefaults();
    const resetBtn = this.container.querySelector('.fc-reset-btn') as HTMLButtonElement;
    const saveBtn = this.container.querySelector('.fc-save-btn') as HTMLButtonElement;
    const copyBtn = this.container.querySelector('.fc-copy-btn') as HTMLButtonElement;
    if (resetBtn) resetBtn.disabled = atDefaults;
    if (saveBtn) saveBtn.disabled = atDefaults;
    if (copyBtn) copyBtn.disabled = atDefaults;
  }

  private getLocusCacheKey(): string {
    const b = this.viewBounds[this.selectedFamily];
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

  /** Draw anchor markers on the locus canvas (assumes background already drawn) */
  private drawOverlayMarkers(): void {
    // Draw atlas grid if enabled
    if (this.showAtlasGrid) {
      const GRID_SIZE = 8; // 8x8 grid of thumbnails
      const THUMB_DRAW_SIZE = PANEL_SIZE / GRID_SIZE;
      const b = this.viewBounds[this.selectedFamily];
      const f = FAMILIES[this.selectedFamily];
      const [colR, colG, colB] = this.parseHexColor(NOTE_COLORS[this.selectedDegree]);

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

    // Draw all anchors for pitch classes 0-11 that belong to current family
    // Draw non-selected first, then selected on top
    for (let pass = 0; pass < 2; pass++) {
      for (let deg = 0; deg <= 11; deg++) {
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
          const col = NOTE_COLORS[deg];
          const alpha = isSelectedDeg ? (isSelectedQuality ? 1.0 : 0.7) : 0.3;

          // Draw beat points visualization
          // Skew acts as backbeat emphasis: beats 1 and 3 get scaled radius
          // Use actual orbit radius - points may extend beyond viewport at high zoom
          const baseRadius = a.orbitRadius;
          const cosR = Math.cos(a.orbitRotation);
          const sinR = Math.sin(a.orbitRotation);

          this.locusCtx.globalAlpha = alpha;

          // Draw 4 beat points with lines - only for selected degree
          if (isSelectedDeg) {
            for (let oi = 0; oi < 4; oi++) {
              const isBackbeat = (oi === 1 || oi === 3);
              const r = isBackbeat ? baseRadius * a.orbitSkew : baseRadius;
              const angle = oi * a.beatSpread;
              const px = r * Math.cos(angle);
              const py = r * Math.sin(angle);
              const dr = px * cosR - py * sinR;
              const di = px * sinR + py * cosR;
              const op = this.cToPixel(a.real + dr, a.imag + di);

              // Draw line from center to beat point
              this.locusCtx.beginPath();
              this.locusCtx.moveTo(p.x, p.y);
              this.locusCtx.lineTo(op.x, op.y);
              this.locusCtx.strokeStyle = ORBIT_COLORS[oi];
              this.locusCtx.lineWidth = isSelected ? 1.5 : 1;
              this.locusCtx.stroke();

              this.locusCtx.beginPath();
              this.locusCtx.arc(op.x, op.y, isSelected ? 5 : 3, 0, TWO_PI);
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
          this.locusCtx.arc(p.x, p.y, isSelected ? 7 : (isSelectedDeg ? 5 : 4), 0, TWO_PI);
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
    // Update note button visual states to show which have anchors
    this.updateNoteButtonStates();
    // Update family buttons to show assigned notes
    this.updateFamilyNotes();
  }

  private updateNoteButtonStates(): void {
    // Update each note button to show if it has an anchor
    this.container.querySelectorAll('.fc-note-btn').forEach(btn => {
      const el = btn as HTMLElement;
      const deg = parseInt(el.dataset.deg!);
      const key = this.anchorKey(deg);
      const anchor = this.anchors.get(key);
      const hasAnchor = !!anchor;
      el.classList.toggle('has-anchor', hasAnchor);
    });
  }

  /** Update family buttons to show which notes are assigned to each family */
  private updateFamilyNotes(): void {
    // Build map of family index -> assigned note degrees
    const familyNotes: Map<number, number[]> = new Map();
    for (let i = 0; i < FAMILIES.length; i++) {
      familyNotes.set(i, []);
    }

    // Collect notes for each family (parse degree from key "deg_quality")
    this.anchors.forEach((anchor, key) => {
      const deg = parseInt(key.split('_')[0]);
      const notes = familyNotes.get(anchor.familyIdx);
      if (notes && !notes.includes(deg)) {
        notes.push(deg);
      }
    });

    // Update each family button
    this.container.querySelectorAll('.fc-family-btn').forEach(btn => {
      const el = btn as HTMLElement;
      const familyIdx = parseInt(el.dataset.family!);
      const notesContainer = el.querySelector('.fc-family-notes') as HTMLElement;
      if (!notesContainer) return;

      const notes = familyNotes.get(familyIdx) || [];
      if (notes.length === 0) {
        notesContainer.innerHTML = '';
      } else {
        // Sort notes and create colored dots
        notes.sort((a, b) => a - b);
        notesContainer.innerHTML = notes.map(deg =>
          `<span class="fc-family-note-dot" style="background: ${NOTE_COLORS[deg]}" title="${NOTE_NAMES[deg]}"></span>`
        ).join('');
      }
    });
  }

  // No-op: thumbnail rendering removed with simplified UI
  private markAllThumbnailsDirty(): void {}

  private parseHexColor(hex: string): [number, number, number] {
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

      // Beat-driven angle: snap to 4 beat points
      // Skew acts as backbeat emphasis: beats 1 and 3 get scaled radius
      const isBackbeat = (beatIdx === 1 || beatIdx === 3);
      const baseR = anchor.orbitRadius * this.previewScale;
      const effectiveR = isBackbeat ? baseR * anchor.orbitSkew : baseR;
      const orbitAngle = beatIdx * anchor.beatSpread;
      const px = effectiveR * Math.cos(orbitAngle) * t;
      const py = effectiveR * Math.sin(orbitAngle) * t;
      const cosR = Math.cos(anchor.orbitRotation);
      const sinR = Math.sin(anchor.orbitRotation);
      const cr = anchor.real + px * cosR - py * sinR;
      const ci = anchor.imag + px * sinR + py * cosR;

      this.renderJulia(anchor.familyIdx, cr, ci, anchor.viewZoom);
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

  private renderJulia(familyIdx: number, jR: number, jI: number, viewZoom = 1.0): void {
    const f = FAMILIES[familyIdx];
    const img = this.juliaCtx.createImageData(JULIA_SIZE, JULIA_SIZE);
    const d = img.data;
    // Scale range by viewZoom: higher zoom = smaller range = more detail
    const range = 3.6 / viewZoom;
    const half = range / 2;
    const step = range / JULIA_SIZE;
    // Scale iterations with zoom: +50 iter per doubling for deep zoom fidelity
    const iter = JULIA_ITER + Math.floor(50 * Math.log2(Math.max(1, viewZoom)));

    // Use the selected note's color
    const [colR, colG, colB] = this.parseHexColor(NOTE_COLORS[this.selectedDegree]);

    for (let py = 0; py < JULIA_SIZE; py++) {
      for (let px = 0; px < JULIA_SIZE; px++) {
        const fx = -half + px * step;
        const fy = -half + py * step;
        const esc = f.julia(fx, fy, jR, jI, iter);
        const idx = (py * JULIA_SIZE + px) * 4;
        if (esc === 0 || !Number.isFinite(esc)) {
          d[idx] = d[idx + 1] = d[idx + 2] = 0;
        } else {
          const t = Math.min(1, Math.sqrt(Math.max(0, esc) / iter));
          d[idx] = Math.round(t * colR);
          d[idx + 1] = Math.round(t * colG);
          d[idx + 2] = Math.round(t * colB);
        }
        d[idx + 3] = 255;
      }
    }
    this.juliaCtx.putImageData(img, 0, 0);
    this.drawJuliaOverlay(viewZoom);
  }

  /** Draw viewport overlay on Julia preview (zoom indicator, reference box) */
  private drawJuliaOverlay(viewZoom: number): void {
    const ctx = this.juliaCtx;
    const size = JULIA_SIZE;
    const center = size / 2;

    // Draw subtle center crosshair
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(center - 10, center);
    ctx.lineTo(center + 10, center);
    ctx.moveTo(center, center - 10);
    ctx.lineTo(center, center + 10);
    ctx.stroke();
    ctx.restore();

    // Show zoom level when not 1x
    if (Math.abs(viewZoom - 1.0) > 0.01) {
      const zoomText = `${viewZoom.toFixed(1)}x`;
      ctx.save();
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      // Text shadow for readability
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillText(zoomText, size - 5, 6);
      ctx.fillStyle = '#fff';
      ctx.fillText(zoomText, size - 6, 5);
      ctx.restore();

      // When zoomed in, show a reference box indicating 1x viewport size
      if (viewZoom > 1) {
        const refSize = size / viewZoom;
        const refOffset = (size - refSize) / 2;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(refOffset, refOffset, refSize, refSize);
        ctx.restore();
      }
    }
  }

  // --- Wizard Methods ---

  /** Reset wizard to initial state */
  private resetWizard(): void {
    this.stopWizardPreview();

    // Reset wizard state
    this.wizardState = {
      step: 'assign-notes',
      tempAnchor: null,
      assignedNotes: [],
      movementPreset: 'sway',
      presetName: '',
      mapBounds: null,
      mapZoom: 1,
      showAtlas: false,
      previewNoteIdx: 0,
      configuredNotes: new Set(),
      originalAnchor: null,
    };
    this.showWizardStep('assign-notes');
  }

  /** Show a specific wizard step */
  private showWizardStep(step: WizardStep): void {
    this.wizardState.step = step;

    // Stop wizard preview when switching steps
    this.stopWizardPreview();

    // Update step containers visibility
    const stepContainers = this.container.querySelectorAll('.fc-wizard-step');
    stepContainers.forEach(el => {
      const stepEl = el as HTMLElement;
      const isActive = stepEl.dataset.step === step;
      stepEl.classList.toggle('active', isActive);
    });

    // Show preset bar only on step 1 (assign-notes)
    const presetBar = this.container.querySelector('.fc-presets-bar') as HTMLElement;
    if (presetBar) {
      presetBar.style.display = step === 'assign-notes' ? '' : 'none';
    }

    // Update progress indicator
    const stepIdx = WIZARD_STEPS.indexOf(step);
    const progressDots = this.container.querySelectorAll('.fc-wizard-progress-dot');
    progressDots.forEach((dot, i) => {
      dot.classList.toggle('completed', i < stepIdx);
      dot.classList.toggle('active', i === stepIdx);
      dot.classList.toggle('upcoming', i > stepIdx);
    });

    // Update note count
    
    // Update nav button states in the active step
    const activeStep = this.container.querySelector(`.fc-wizard-step[data-step="${step}"]`);
    if (activeStep) {
      const backBtn = activeStep.querySelector('.fc-wizard-back') as HTMLButtonElement;
      const nextBtn = activeStep.querySelector('.fc-wizard-next') as HTMLButtonElement;
      if (backBtn) backBtn.style.visibility = stepIdx === 0 ? 'hidden' : 'visible';
      if (nextBtn) {
        nextBtn.textContent = step === 'place-anchor' ? 'Done' : 'Next →';
      }
    }

    // Step-specific initialization
    if (step === 'choose-family') {
      this.updateFamilyGridThumbnails();
      // Show selected roots in footer
      const chipsContainer = this.container.querySelector('.fc-wizard-selected-roots-chips');
      if (chipsContainer) {
        chipsContainer.innerHTML = this.wizardState.assignedNotes
          .map(n => `<span class="fc-wizard-root-chip" style="--note-color: ${NOTE_COLORS[n]}">${NOTE_NAMES[n]}</span>`)
          .join('');
      }

      // Check if we're in edit mode (tempAnchor has real position)
      const isEditMode = this.wizardState.tempAnchor &&
        (this.wizardState.tempAnchor.real !== 0 || this.wizardState.tempAnchor.imag !== 0);
      const nextBtn = this.container.querySelector('.fc-wizard-family-next') as HTMLElement;

      if (isEditMode && this.wizardState.tempAnchor) {
        // Edit mode: show Next button and pre-select current family
        if (nextBtn) nextBtn.style.display = '';
        const familyIdx = this.wizardState.tempAnchor.familyIdx;
        this.container.querySelectorAll('.fc-wizard-family-card').forEach(c => {
          c.classList.toggle('selected', parseInt((c as HTMLElement).dataset.family || '-1') === familyIdx);
        });
      } else {
        // New note mode: hide Next button
        if (nextBtn) nextBtn.style.display = 'none';
      }
    } else if (step === 'place-anchor') {
      // Set up wizard map interactions and render locus
      if (this.wizardState.tempAnchor) {
        this.selectedFamily = this.wizardState.tempAnchor.familyIdx;
        const f = FAMILIES[this.wizardState.tempAnchor.familyIdx];

        // Check if editing existing anchor (has viewZoom > 1 or non-zero position)
        const isEditing = this.wizardState.tempAnchor.viewZoom > 1 ||
          this.wizardState.tempAnchor.real !== 0 || this.wizardState.tempAnchor.imag !== 0;

        if (isEditing) {
          // Editing: center view on anchor position at current zoom
          const zoom = this.wizardState.mapZoom;
          const viewWidth = (f.bounds.rMax - f.bounds.rMin) / zoom;
          const viewHeight = (f.bounds.iMax - f.bounds.iMin) / zoom;
          const centerR = this.wizardState.tempAnchor.real;
          const centerI = this.wizardState.tempAnchor.imag;
          this.wizardState.mapBounds = {
            rMin: centerR - viewWidth / 2,
            rMax: centerR + viewWidth / 2,
            iMin: centerI - viewHeight / 2,
            iMax: centerI + viewHeight / 2,
          };
        } else {
          // New anchor: start with full family bounds
          this.wizardState.mapBounds = { ...f.bounds };
          this.wizardState.mapZoom = 1;
        }

        // Clear buffer to force fresh render
        this.wizardLocusBuffer = null;
        this.wizardRenderedBounds = null;

        const wizardCanvas = this.container.querySelector('.fc-wizard-locus-canvas') as HTMLCanvasElement;
        if (wizardCanvas) {
          if (isEditing) {
            // Editing: render with anchor overlay and start preview
            this.renderWizardLocusOverlay(wizardCanvas);
            this.startWizardPreview(this.wizardState.tempAnchor);
          } else {
            this.renderWizardLocus(wizardCanvas);
          }
          this.setupWizardMapInteractions();
        }
        // Set up note switcher for preview colors
        this.updateWizardNoteSwitcher();

        // Update parameter sliders to show current anchor values
        this.syncParamInputs();
      }

      // Update family name display (outside tempAnchor check)
      const familyNameEl = this.container.querySelector('.fc-wizard-family-name');
      if (familyNameEl) {
        const familyIdx = this.wizardState.tempAnchor?.familyIdx ?? this.selectedFamily;
        const family = FAMILIES[familyIdx];
        familyNameEl.textContent = family.label;
      }
    } else if (step === 'assign-notes') {
      this.updateWizardNoteGrid();
      this.startNoteGridAnimation();
    }

    // Stop animation when leaving assign-notes step
    if (step !== 'assign-notes') {
      this.stopNoteGridAnimation();
    }
  }

  /** Start the note grid animation loop */
  private startNoteGridAnimation(): void {
    if (this.noteGridAnimationId !== null) return; // Already running
    this.noteGridStartTime = performance.now();
    const animate = () => {
      this.renderNoteGridPreviews();
      this.noteGridAnimationId = requestAnimationFrame(animate);
    };
    animate();
  }

  /** Stop the note grid animation */
  private stopNoteGridAnimation(): void {
    if (this.noteGridAnimationId !== null) {
      cancelAnimationFrame(this.noteGridAnimationId);
      this.noteGridAnimationId = null;
    }
  }

  /** Render animated previews in the note grid */
  private renderNoteGridPreviews(): void {
    const cells = this.container.querySelectorAll('.fc-wizard-note-btn');
    const now = performance.now();
    const t = (now - this.noteGridStartTime) / 1000;

    cells.forEach(cell => {
      const noteIdx = parseInt((cell as HTMLElement).dataset.note || '0');
      const canvas = cell.querySelector('canvas') as HTMLCanvasElement;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const key = this.anchorKey(noteIdx);
      const anchor = this.anchors.get(key);
      const size = canvas.width;

      if (!anchor) {
        // Zero state - show empty placeholder with note color hint
        ctx.fillStyle = 'rgba(20, 20, 35, 0.8)';
        ctx.fillRect(0, 0, size, size);

        // Draw a subtle "?" or empty indicator
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', size / 2, size / 2);
        return;
      }

      // Calculate animated position using orbit parameters
      const { real, imag, orbitRadius, orbitSkew, orbitRotation, beatSpread, familyIdx } = anchor;

      // Simulate 4-beat cycle at ~120 BPM
      const beatPhase = (t * 2) % 4;
      const beatIdx = Math.floor(beatPhase);
      const beatFrac = beatPhase - beatIdx;

      const angles = [
        orbitRotation,
        orbitRotation + beatSpread,
        orbitRotation + Math.PI,
        orbitRotation + Math.PI + beatSpread
      ];
      const radii = [
        orbitRadius,
        orbitRadius * orbitSkew,
        orbitRadius,
        orbitRadius * orbitSkew
      ];

      const nextBeat = (beatIdx + 1) % 4;
      const angle = angles[beatIdx] + (angles[nextBeat] - angles[beatIdx]) * beatFrac;
      const radius = radii[beatIdx] + (radii[nextBeat] - radii[beatIdx]) * beatFrac;

      const cr = real + Math.cos(angle) * radius;
      const ci = imag + Math.sin(angle) * radius;

      // Render Julia set
      const family = FAMILIES[familyIdx];
      const viewZoom = anchor.viewZoom || 1;
      const viewSize = 3 / viewZoom;
      const img = ctx.createImageData(size, size);
      const d = img.data;

      for (let py = 0; py < size; py++) {
        const zi = -viewSize / 2 + (py / size) * viewSize;
        for (let px = 0; px < size; px++) {
          const zr = -viewSize / 2 + (px / size) * viewSize;
          const esc = family.julia(zr, zi, cr, ci, 40);
          const idx = (py * size + px) * 4;

          if (esc === 0) {
            d[idx] = 12; d[idx + 1] = 12; d[idx + 2] = 20;
          } else {
            const color = NOTE_COLORS[noteIdx];
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            const brightness = 0.3 + 0.7 * (esc / 40);
            d[idx] = Math.floor(r * brightness);
            d[idx + 1] = Math.floor(g * brightness);
            d[idx + 2] = Math.floor(b * brightness);
          }
          d[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    });
  }

  /** Navigate to next wizard step */
  private wizardNext(): void {
    const currentIdx = WIZARD_STEPS.indexOf(this.wizardState.step);

    // Validate current step before proceeding
    if (!this.validateWizardStep(this.wizardState.step)) {
      return;
    }

    // If at place-anchor (last step), commit and loop back to assign-notes
    if (this.wizardState.step === 'place-anchor') {
      this.commitCurrentAnchor();
      for (const noteIdx of this.wizardState.assignedNotes) {
        this.wizardState.configuredNotes.add(noteIdx);
      }
      // Reset for next note
      this.wizardState.assignedNotes = [];
      this.wizardState.tempAnchor = null;
      this.showWizardStep('assign-notes');
      return;
    }

    // Otherwise advance to next step
    if (currentIdx < WIZARD_STEPS.length - 1) {
      this.showWizardStep(WIZARD_STEPS[currentIdx + 1]);
    }
  }

  /** Navigate to previous wizard step */
  private wizardBack(): void {
    const currentIdx = WIZARD_STEPS.indexOf(this.wizardState.step);
    if (currentIdx > 0) {
      this.showWizardStep(WIZARD_STEPS[currentIdx - 1]);
    }
  }

  /** Cancel wizard and close panel */
  private wizardCancel(): void {
    this.hide();
  }

  /** Commit current tempAnchor to assigned notes (without full save) */
  private commitCurrentAnchor(): void {
    const { tempAnchor, assignedNotes, movementPreset } = this.wizardState;
    if (!tempAnchor || assignedNotes.length === 0) return;

    // Apply movement preset values, capping orbitRadius to stay within 80% of visible area
    if (movementPreset !== 'custom') {
      const preset = MOVEMENT_PRESETS[movementPreset];
      // At zoom Z, visible half-width is ~2/Z. Cap radius at 80% of that.
      const zoom = this.wizardState.mapZoom;
      const maxSafeRadius = 1.6 / zoom; // 80% of visible half-width
      tempAnchor.orbitRadius = Math.min(preset.orbitRadius, maxSafeRadius);
      tempAnchor.orbitSkew = preset.orbitSkew;
      tempAnchor.orbitRotation = preset.orbitRotation;
      tempAnchor.beatSpread = preset.beatSpread;
    }

    // Apply map zoom as view zoom
    tempAnchor.viewZoom = this.wizardState.mapZoom;

    // Save anchor for assigned notes
    for (const noteIdx of assignedNotes) {
      const key = this.anchorKey(noteIdx);
      this.anchors.set(key, { ...tempAnchor });
    }

    // Emit changes so visualizer updates
    this.emitAnchorChange();
  }

  /** Edit an existing note's anchor from the note grid or save step */
  private editNoteAnchor(noteIdx: number): void {
    const key = this.anchorKey(noteIdx);
    const existingAnchor = this.anchors.get(key);

    if (existingAnchor) {
      // Load existing anchor for editing
      this.wizardState.tempAnchor = { ...existingAnchor };
      this.wizardState.originalAnchor = { real: existingAnchor.real, imag: existingAnchor.imag };
      this.wizardState.mapZoom = existingAnchor.viewZoom || 1;
    } else {
      // Create default anchor for this note using family center
      const family = FAMILIES[this.selectedFamily];
      const r = (family.bounds.rMin + family.bounds.rMax) / 2;
      const i = (family.bounds.iMin + family.bounds.iMax) / 2;
      this.wizardState.tempAnchor = {
        familyIdx: this.selectedFamily,
        real: r,
        imag: i,
        orbitRadius: 0.02,
        orbitSkew: 1,
        orbitRotation: 0,
        beatSpread: Math.PI / 2,
        viewZoom: 1,
      };
      this.wizardState.originalAnchor = { real: r, imag: i };
      this.wizardState.mapZoom = 1;
    }

    // Set this note as the only assigned note
    this.wizardState.assignedNotes = [noteIdx];
    this.wizardState.movementPreset = 'custom'; // Show actual values

    // Show editing indicator and deselect preset radio
    this.showEditingIndicator(true);

    // Go directly to place-anchor step for editing
    this.showWizardStep('place-anchor');
  }

  /** Show or hide the editing state - highlights New button when editing */
  private showEditingIndicator(show: boolean): void {
    const newBtn = this.container.querySelector('.fc-wizard-new-preset') as HTMLElement;
    if (newBtn) {
      newBtn.classList.toggle('editing', show);
    }
    // Deselect preset radio when editing
    if (show) {
      const radios = this.container.querySelectorAll('.fc-presets-list input[type="radio"]');
      radios.forEach(r => (r as HTMLInputElement).checked = false);
    }
  }

  /** Known interesting Julia set coordinates for random selection */
  private static INTERESTING_POINTS = [
    { r: -0.123, i: 0.745 },     // Douady's rabbit
    { r: -0.75, i: 0.11 },       // Seahorse valley
    { r: 0.285, i: 0.01 },       // Dendrites
    { r: -0.038, i: 0.9825 },    // Triple spiral
    { r: -0.75, i: 0.0 },        // San Marco
    { r: -0.391, i: -0.587 },    // Siegel disk
    { r: 0.0, i: 1.0 },          // Lightning
    { r: -0.8, i: 0.156 },       // Spiral galaxy
    { r: -0.7269, i: 0.1889 },   // Pinwheel
    { r: -1.0, i: 0.0 },         // Basilica
    { r: -0.194, i: 0.6557 },    // Feather
    { r: -0.4, i: 0.6 },         // Starfish
    { r: -0.835, i: -0.2321 },   // Soft spiral
    { r: -0.70176, i: -0.3842 }, // Cloud
    { r: -0.745428, i: 0.113009 }, // Deep seahorse
    { r: -1.25, i: 0.0 },        // Basilica 2
    { r: -0.481762, i: -0.531657 }, // Swirl
    { r: -0.6180339887, i: 0.0 }, // Golden ratio
    { r: -1.476, i: 0.0 },       // Antenna tip
    { r: -0.12, i: -0.77 },      // Rabbit variant
  ];

  /** Randomize anchor for a specific note with visual interest scoring */
  private randomizeNoteAnchor(noteIdx: number): void {
    const MAX_ATTEMPTS = 20;
    const MIN_SCORE = 0.15; // Minimum visual interest score (0-1)

    let bestAnchor: InternalAnchor | null = null;
    let bestScore = 0;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const candidate = this.generateRandomAnchor();
      const score = this.scoreVisualInterest(candidate);

      if (score > bestScore) {
        bestScore = score;
        bestAnchor = candidate;
      }

      // Good enough - stop early
      if (score >= MIN_SCORE) break;
    }

    if (!bestAnchor) {
      // Fallback to first known interesting point
      const point = FractalConfigPanel.INTERESTING_POINTS[0];
      bestAnchor = {
        familyIdx: 0,
        real: point.r,
        imag: point.i,
        orbitRadius: 0.03,
        orbitSkew: 1.2,
        orbitRotation: 0,
        beatSpread: Math.PI / 2,
        viewZoom: 5,
      };
    }

    // Save anchor
    const key = this.anchorKey(noteIdx);
    this.anchors.set(key, bestAnchor);
    this.wizardState.configuredNotes.add(noteIdx);

    // Update UI
        this.updateWizardNoteGrid();
    this.showEditingIndicator(true);
    this.emitAnchorChange();
    if (this.onSave) this.onSave();
  }

  /** Generate a random anchor candidate */
  private generateRandomAnchor(): InternalAnchor {
    // Pick random family
    const familyIdx = Math.floor(Math.random() * FAMILIES.length);
    const family = FAMILIES[familyIdx];

    // Pick random interesting point or generate one on the boundary
    let real: number, imag: number;
    if (Math.random() < 0.6) {
      // Use a known interesting point with offset
      const point = FractalConfigPanel.INTERESTING_POINTS[
        Math.floor(Math.random() * FractalConfigPanel.INTERESTING_POINTS.length)
      ];
      real = point.r + (Math.random() - 0.5) * 0.1;
      imag = point.i + (Math.random() - 0.5) * 0.1;
    } else {
      // Sample boundary
      const found = this.findBoundaryPoint(family, 30);
      real = found.r;
      imag = found.i;
    }

    // Pick random movement preset (skip 'still')
    const presetNames = Object.keys(MOVEMENT_PRESETS).filter(p => p !== 'still') as (keyof typeof MOVEMENT_PRESETS)[];
    const movementPreset = presetNames[Math.floor(Math.random() * presetNames.length)];
    const movement = MOVEMENT_PRESETS[movementPreset];

    // Random zoom between 2 and 25
    const viewZoom = 2 + Math.random() * 23;

    return {
      familyIdx,
      real,
      imag,
      orbitRadius: movement.orbitRadius * (0.4 + Math.random() * 0.5),
      orbitSkew: movement.orbitSkew,
      orbitRotation: Math.random() * Math.PI * 2,
      beatSpread: movement.beatSpread,
      viewZoom,
    };
  }

  /** Score visual interest of an anchor (0-1, higher = more interesting) */
  private scoreVisualInterest(anchor: InternalAnchor): number {
    const family = FAMILIES[anchor.familyIdx];
    const size = 32; // Small sample size for speed
    const viewSize = 3 / anchor.viewZoom;
    const maxIter = 30;

    // Render two frames at different beat phases
    const frame1 = this.renderSmallFrame(anchor, family, size, viewSize, maxIter, 0);
    const frame2 = this.renderSmallFrame(anchor, family, size, viewSize, maxIter, 0.5);

    // Calculate metrics
    const variance1 = this.calculateVariance(frame1);
    const variance2 = this.calculateVariance(frame2);
    const pixelChange = this.calculatePixelChange(frame1, frame2);

    // Combined score:
    // - Variance: rewards diverse escape times (not all same color)
    // - Pixel change: rewards animation (fractal moves visibly)
    const varianceScore = Math.min(1, (variance1 + variance2) / 2 / 400); // Normalize
    const changeScore = Math.min(1, pixelChange / 0.3); // 30% pixel change = max score

    // Weight animation change more heavily
    return varianceScore * 0.3 + changeScore * 0.7;
  }

  /** Render a small frame for scoring */
  private renderSmallFrame(
    anchor: InternalAnchor,
    family: typeof FAMILIES[0],
    size: number,
    viewSize: number,
    maxIter: number,
    beatPhase: number
  ): number[] {
    const { real, imag, orbitRadius, orbitSkew, orbitRotation, beatSpread } = anchor;

    // Calculate position at this beat phase
    const angles = [orbitRotation, orbitRotation + beatSpread, orbitRotation + Math.PI, orbitRotation + Math.PI + beatSpread];
    const radii = [orbitRadius, orbitRadius * orbitSkew, orbitRadius, orbitRadius * orbitSkew];
    const beatIdx = Math.floor(beatPhase * 4) % 4;
    const angle = angles[beatIdx];
    const radius = radii[beatIdx];

    const cr = real + Math.cos(angle) * radius;
    const ci = imag + Math.sin(angle) * radius;

    const escapes: number[] = [];
    for (let py = 0; py < size; py++) {
      const zi = -viewSize / 2 + (py / size) * viewSize;
      for (let px = 0; px < size; px++) {
        const zr = -viewSize / 2 + (px / size) * viewSize;
        escapes.push(family.julia(zr, zi, cr, ci, maxIter));
      }
    }
    return escapes;
  }

  /** Calculate variance of escape times */
  private calculateVariance(escapes: number[]): number {
    const n = escapes.length;
    const mean = escapes.reduce((a, b) => a + b, 0) / n;
    const variance = escapes.reduce((sum, e) => sum + (e - mean) ** 2, 0) / n;
    return variance;
  }

  /** Calculate fraction of pixels that changed between frames */
  private calculatePixelChange(frame1: number[], frame2: number[]): number {
    let changed = 0;
    for (let i = 0; i < frame1.length; i++) {
      // Consider changed if escape time differs by more than 2
      if (Math.abs(frame1[i] - frame2[i]) > 2) changed++;
    }
    return changed / frame1.length;
  }

  /** Find a point on the Mandelbrot set boundary by random sampling */
  private findBoundaryPoint(family: typeof FAMILIES[0], maxAttempts: number): { r: number; i: number } {
    const b = family.bounds;
    for (let i = 0; i < maxAttempts; i++) {
      const r = b.rMin + Math.random() * (b.rMax - b.rMin);
      const im = b.iMin + Math.random() * (b.iMax - b.iMin);
      const esc = family.locus(r, im, 100);
      // Look for points near the boundary (escape time between 20-80)
      if (esc > 20 && esc < 80) {
        return { r, i: im };
      }
    }
    // Fallback to a known point
    const point = FractalConfigPanel.INTERESTING_POINTS[0];
    return { r: point.r, i: point.i };
  }

  /** Validate current wizard step */
  private validateWizardStep(step: WizardStep): boolean {
    const status = this.container.querySelector('.fc-wizard-status') as HTMLElement;

    switch (step) {
      case 'choose-family':
        // Family is set when tempAnchor is created
        if (!this.wizardState.tempAnchor) {
          if (status) status.textContent = 'Select a fractal family';
          return false;
        }
        return true;

      case 'place-anchor':
        // Check anchor position is set
        if (!this.wizardState.tempAnchor || (this.wizardState.tempAnchor.real === 0 && this.wizardState.tempAnchor.imag === 0)) {
          if (status) status.textContent = 'Click the map to place an anchor';
          return false;
        }
        return true;

      case 'assign-notes':
        // At least one note must be selected
        if (this.wizardState.assignedNotes.length === 0) {
          if (status) status.textContent = 'Select at least one note';
          return false;
        }
        return true;
    }
  }

  /** Save current anchors as a new preset */
  private saveAsPreset(): void {
    const nameInput = this.container.querySelector('.fc-wizard-name-input') as HTMLInputElement;
    const presetName = nameInput?.value?.trim() || '';

    if (!presetName) {
      const status = this.container.querySelector('.fc-wizard-status') as HTMLElement;
      if (status) status.textContent = 'Enter a preset name to save';
      return;
    }

    // Save all current anchors as a preset
    const anchors = this.getCurrentAnchorsData();
    const preset: UserPreset = {
      id: Date.now().toString(),
      name: presetName,
      anchors,
      createdAt: Date.now(),
    };
    this.userPresets.push(preset);
    saveUserPresets(this.userPresets);
    this.selectedPresetId = preset.id;
    this.updatePresetsUI();
    if (this.onPresetsChange) this.onPresetsChange();

    // Clear the name input and hide editing indicator
    if (nameInput) nameInput.value = '';
    this.showEditingIndicator(false);

    const status = this.container.querySelector('.fc-wizard-status') as HTMLElement;
    if (status) status.textContent = `Saved preset "${presetName}"`;

    // Update save button state after saving
    this.updateSaveButtonState();
  }

  /** Update save button enabled state and tooltip */
  private updateSaveButtonState(): void {
    const saveBtn = this.container.querySelector('.fc-wizard-save-btn') as HTMLButtonElement;
    if (!saveBtn) return;

    const nameInput = this.container.querySelector('.fc-wizard-name-input') as HTMLInputElement;
    const name = nameInput?.value?.trim() || '';

    // Check if name is empty
    if (!name) {
      saveBtn.disabled = true;
      saveBtn.title = 'Enter a preset name to save';
      return;
    }

    // Check if current anchors match any existing preset
    const currentAnchors = this.getCurrentAnchorsData();
    const allPresets = [...BUILTIN_PRESETS, ...this.userPresets];

    for (const preset of allPresets) {
      if (this.anchorsMatch(currentAnchors, preset.anchors)) {
        saveBtn.disabled = true;
        saveBtn.title = `Matches existing preset "${preset.name}"`;
        return;
      }
    }

    // All checks passed
    saveBtn.disabled = false;
    saveBtn.title = 'Save as new preset';
  }

  /** Check if two anchor sets are identical */
  private anchorsMatch(a: FractalAnchors, b: FractalAnchors): boolean {
    for (let i = 0; i < 12; i++) {
      const anchorA = a[i];
      const anchorB = b[i];
      if (!anchorA || !anchorB) {
        if (anchorA !== anchorB) return false;
        continue;
      }
      // Compare key properties with small tolerance for floats
      if (Math.abs(anchorA.real - anchorB.real) > 0.0001) return false;
      if (Math.abs(anchorA.imag - anchorB.imag) > 0.0001) return false;
      if (anchorA.type !== anchorB.type) return false;
      if (Math.abs((anchorA.viewZoom ?? 1) - (anchorB.viewZoom ?? 1)) > 0.01) return false;
    }
    return true;
  }

  /** Start a new preset from scratch - clear all configured notes */
  private startNewPreset(): void {
    // Clear all anchors
    this.anchors.clear();
    this.wizardState.configuredNotes.clear();
    this.wizardState.assignedNotes = [];
    this.wizardState.tempAnchor = null;

    // Clear the name input
    const nameInput = this.container.querySelector('.fc-wizard-name-input') as HTMLInputElement;
    if (nameInput) nameInput.value = '';

    // Deselect any selected preset
    this.selectedPresetId = null;
    const radios = this.container.querySelectorAll('.fc-preset-radio') as NodeListOf<HTMLInputElement>;
    radios.forEach(r => r.checked = false);

    // Hide editing indicator
    this.showEditingIndicator(false);

    // Update UI
    this.updateWizardNoteGrid();
    this.updateSaveButtonState();

    // Save empty state
    this.emitAnchorChange();
    if (this.onSave) this.onSave();

    const status = this.container.querySelector('.fc-wizard-status') as HTMLElement;
    if (status) status.textContent = 'Starting new preset - configure notes below';
  }

  /** Update family grid thumbnails in wizard step 1 */
  private updateFamilyGridThumbnails(): void {
    const grid = this.container.querySelector('.fc-wizard-family-grid');
    if (!grid) return;

    // Thumbnails are rendered inline in the HTML, just update selection state
    const cards = grid.querySelectorAll('.fc-wizard-family-card');
    cards.forEach(card => {
      const familyIdx = parseInt((card as HTMLElement).dataset.family || '0');
      card.classList.toggle('selected', this.wizardState.tempAnchor?.familyIdx === familyIdx);
    });
  }

  /** Update note grid selection state in wizard step 1 */
  private updateWizardNoteGrid(): void {
    const grid = this.container.querySelector('.fc-wizard-note-grid');
    if (!grid) return;

    const buttons = grid.querySelectorAll('.fc-wizard-note-btn');
    buttons.forEach(btn => {
      const noteIdx = parseInt((btn as HTMLElement).dataset.note || '0');
      const isSelected = this.wizardState.assignedNotes.includes(noteIdx);
      btn.classList.toggle('selected', isSelected);
    });
  }

  /** Set up parameter controls with slider + number input sync */
  private setupParamControls(): void {
    const scaleSlider = this.container.querySelector('.fc-wizard-scale-slider') as HTMLInputElement;
    const scaleInput = this.container.querySelector('.fc-wizard-scale-input') as HTMLInputElement;
    const realSlider = this.container.querySelector('.fc-wizard-real-slider') as HTMLInputElement;
    const realInput = this.container.querySelector('.fc-wizard-real-input') as HTMLInputElement;
    const imagSlider = this.container.querySelector('.fc-wizard-imag-slider') as HTMLInputElement;
    const imagInput = this.container.querySelector('.fc-wizard-imag-input') as HTMLInputElement;
    const radiusSlider = this.container.querySelector('.fc-wizard-radius-slider') as HTMLInputElement;
    const radiusInput = this.container.querySelector('.fc-wizard-radius-input') as HTMLInputElement;
    const skewSlider = this.container.querySelector('.fc-wizard-skew-slider') as HTMLInputElement;
    const skewInput = this.container.querySelector('.fc-wizard-skew-input') as HTMLInputElement;
    const rotationSlider = this.container.querySelector('.fc-wizard-rotation-slider') as HTMLInputElement;
    const rotationInput = this.container.querySelector('.fc-wizard-rotation-input') as HTMLInputElement;
    const spreadSlider = this.container.querySelector('.fc-wizard-spread-slider') as HTMLInputElement;
    const spreadInput = this.container.querySelector('.fc-wizard-spread-input') as HTMLInputElement;

    // Scale/Zoom control - exponential mapping: slider 0-100 → zoom 1x-1000x
    const updateScale = (fromSlider: boolean) => {
      let zoom: number;
      if (fromSlider && scaleSlider) {
        zoom = Math.pow(1000, parseInt(scaleSlider.value) / 100);
        if (scaleInput) scaleInput.value = zoom.toFixed(1);
      } else if (scaleInput) {
        zoom = Math.max(1, Math.min(1000, parseFloat(scaleInput.value) || 1));
        if (scaleSlider) {
          const sliderVal = Math.round(100 * Math.log(zoom) / Math.log(1000));
          scaleSlider.value = String(Math.max(0, Math.min(100, sliderVal)));
        }
      } else { return; }
      this.wizardMapSetZoom(zoom);
    };
    scaleSlider?.addEventListener('input', () => updateScale(true));
    scaleInput?.addEventListener('change', () => updateScale(false));

    // Real - slider position within current view bounds (0 = view min, 1000 = view max)
    const updateReal = (fromSlider: boolean) => {
      if (!this.wizardState.tempAnchor || !this.wizardState.mapBounds) return;
      const b = this.wizardState.mapBounds;
      if (fromSlider && realSlider) {
        const t = parseInt(realSlider.value) / 1000;
        this.wizardState.tempAnchor.real = b.rMin + t * (b.rMax - b.rMin);
      } else if (realInput) {
        this.wizardState.tempAnchor.real = parseFloat(realInput.value) || 0;
      }
      this.syncParamInputs();
      this.updateMovementPreview();
    };
    realSlider?.addEventListener('input', () => updateReal(true));
    realInput?.addEventListener('change', () => updateReal(false));

    // Imag - slider position within current view bounds (0 = view min, 1000 = view max)
    const updateImag = (fromSlider: boolean) => {
      if (!this.wizardState.tempAnchor || !this.wizardState.mapBounds) return;
      const b = this.wizardState.mapBounds;
      if (fromSlider && imagSlider) {
        const t = parseInt(imagSlider.value) / 1000;
        this.wizardState.tempAnchor.imag = b.iMin + t * (b.iMax - b.iMin);
      } else if (imagInput) {
        this.wizardState.tempAnchor.imag = parseFloat(imagInput.value) || 0;
      }
      this.syncParamInputs();
      this.updateMovementPreview();
    };
    imagSlider?.addEventListener('input', () => updateImag(true));
    imagInput?.addEventListener('change', () => updateImag(false));

    // Radius - exponential mapping for fine control, scaled by zoom
    // At zoom 1x: slider 1000 = 0.2 radius
    // At zoom 100x: slider 1000 = 0.002 radius
    // Exponential curve gives finer control at low values
    const MAX_RADIUS_BASE = 0.2;
    const updateRadius = (fromSlider: boolean) => {
      if (!this.wizardState.tempAnchor) return;
      this.wizardState.movementPreset = 'custom';
      if (fromSlider && radiusSlider) {
        const t = parseInt(radiusSlider.value) / 1000;
        const maxRadius = MAX_RADIUS_BASE / this.wizardState.mapZoom;
        // Quadratic curve: more precision at low values
        this.wizardState.tempAnchor.orbitRadius = Math.max(0, maxRadius * t * t);
      } else if (radiusInput) {
        this.wizardState.tempAnchor.orbitRadius = Math.max(0, parseFloat(radiusInput.value) || 0);
      }
      this.syncParamInputs();
      this.updateMovementPreview();
    };
    radiusSlider?.addEventListener('input', () => updateRadius(true));
    radiusInput?.addEventListener('change', () => updateRadius(false));

    // Skew
    const updateSkew = (fromSlider: boolean) => {
      if (!this.wizardState.tempAnchor) return;
      this.wizardState.movementPreset = 'custom';
      if (fromSlider && skewSlider) {
        this.wizardState.tempAnchor.orbitSkew = parseInt(skewSlider.value) / 100;
      } else if (skewInput) {
        this.wizardState.tempAnchor.orbitSkew = Math.max(0.2, Math.min(3, parseFloat(skewInput.value) || 1));
      }
      this.syncParamInputs();
      this.updateMovementPreview();
    };
    skewSlider?.addEventListener('input', () => updateSkew(true));
    skewInput?.addEventListener('change', () => updateSkew(false));

    // Rotation (degrees)
    const updateRotation = (fromSlider: boolean) => {
      if (!this.wizardState.tempAnchor) return;
      this.wizardState.movementPreset = 'custom';
      if (fromSlider && rotationSlider) {
        this.wizardState.tempAnchor.orbitRotation = parseInt(rotationSlider.value) / 100;
      } else if (rotationInput) {
        const deg = parseFloat(rotationInput.value) || 0;
        this.wizardState.tempAnchor.orbitRotation = (deg * Math.PI) / 180;
      }
      this.syncParamInputs();
      this.updateMovementPreview();
    };
    rotationSlider?.addEventListener('input', () => updateRotation(true));
    rotationInput?.addEventListener('change', () => updateRotation(false));

    // Spread (degrees)
    const updateSpread = (fromSlider: boolean) => {
      if (!this.wizardState.tempAnchor) return;
      this.wizardState.movementPreset = 'custom';
      if (fromSlider && spreadSlider) {
        this.wizardState.tempAnchor.beatSpread = parseInt(spreadSlider.value) / 100;
      } else if (spreadInput) {
        const deg = Math.max(5, Math.min(180, parseFloat(spreadInput.value) || 90));
        this.wizardState.tempAnchor.beatSpread = (deg * Math.PI) / 180;
      }
      this.syncParamInputs();
      this.updateMovementPreview();
    };
    spreadSlider?.addEventListener('input', () => updateSpread(true));
    spreadInput?.addEventListener('change', () => updateSpread(false));
  }

  /** Sync parameter inputs/sliders with current tempAnchor values */
  private syncParamInputs(): void {
    const anchor = this.wizardState.tempAnchor;
    if (!anchor) return;

    const zoom = this.wizardState.mapZoom;
    const scaleSlider = this.container.querySelector('.fc-wizard-scale-slider') as HTMLInputElement;
    const scaleInput = this.container.querySelector('.fc-wizard-scale-input') as HTMLInputElement;
    const realSlider = this.container.querySelector('.fc-wizard-real-slider') as HTMLInputElement;
    const realInput = this.container.querySelector('.fc-wizard-real-input') as HTMLInputElement;
    const imagSlider = this.container.querySelector('.fc-wizard-imag-slider') as HTMLInputElement;
    const imagInput = this.container.querySelector('.fc-wizard-imag-input') as HTMLInputElement;
    const radiusSlider = this.container.querySelector('.fc-wizard-radius-slider') as HTMLInputElement;
    const radiusInput = this.container.querySelector('.fc-wizard-radius-input') as HTMLInputElement;
    const skewSlider = this.container.querySelector('.fc-wizard-skew-slider') as HTMLInputElement;
    const skewInput = this.container.querySelector('.fc-wizard-skew-input') as HTMLInputElement;
    const rotationSlider = this.container.querySelector('.fc-wizard-rotation-slider') as HTMLInputElement;
    const rotationInput = this.container.querySelector('.fc-wizard-rotation-input') as HTMLInputElement;
    const spreadSlider = this.container.querySelector('.fc-wizard-spread-slider') as HTMLInputElement;
    const spreadInput = this.container.querySelector('.fc-wizard-spread-input') as HTMLInputElement;

    // Update zoom/scale
    if (scaleSlider) {
      const sliderVal = Math.round(100 * Math.log(zoom) / Math.log(1000));
      scaleSlider.value = String(Math.max(0, Math.min(100, sliderVal)));
    }
    if (scaleInput) scaleInput.value = zoom.toFixed(1);

    // Update position sliders (relative to current view bounds)
    const b = this.wizardState.mapBounds;
    if (b) {
      const realT = (anchor.real - b.rMin) / (b.rMax - b.rMin);
      const imagT = (anchor.imag - b.iMin) / (b.iMax - b.iMin);
      if (realSlider) realSlider.value = String(Math.round(Math.max(0, Math.min(1, realT)) * 1000));
      if (imagSlider) imagSlider.value = String(Math.round(Math.max(0, Math.min(1, imagT)) * 1000));
    }

    // Update radius slider (exponential mapping, scaled by zoom)
    const maxRadius = 0.2 / zoom;
    // Inverse of quadratic: t = sqrt(radius / maxRadius)
    const radiusT = Math.sqrt(Math.min(1, anchor.orbitRadius / maxRadius));
    if (radiusSlider) radiusSlider.value = String(Math.round(radiusT * 1000));
    if (skewSlider) skewSlider.value = String(Math.round(anchor.orbitSkew * 100));
    if (rotationSlider) rotationSlider.value = String(Math.round(anchor.orbitRotation * 100));
    if (spreadSlider) spreadSlider.value = String(Math.round(anchor.beatSpread * 100));

    // Update number inputs
    if (realInput) realInput.value = anchor.real.toFixed(4);
    if (imagInput) imagInput.value = anchor.imag.toFixed(4);
    if (radiusInput) radiusInput.value = anchor.orbitRadius.toFixed(4);
    if (skewInput) skewInput.value = anchor.orbitSkew.toFixed(2);
    if (rotationInput) rotationInput.value = String(Math.round(anchor.orbitRotation * 180 / Math.PI));
    if (spreadInput) spreadInput.value = String(Math.round(anchor.beatSpread * 180 / Math.PI));
  }

  /** Set wizard map zoom to a specific level */
  private wizardMapSetZoom(newZoom: number): void {
    if (!this.wizardState.tempAnchor || !this.wizardState.mapBounds) return;

    const f = FAMILIES[this.wizardState.tempAnchor.familyIdx];
    const anchor = this.wizardState.tempAnchor;
    const hasAnchor = anchor.real !== 0 || anchor.imag !== 0;
    const b = this.wizardState.mapBounds;
    const centerR = hasAnchor ? anchor.real : (b.rMin + b.rMax) / 2;
    const centerI = hasAnchor ? anchor.imag : (b.iMin + b.iMax) / 2;

    const origWidth = f.bounds.rMax - f.bounds.rMin;
    const origHeight = f.bounds.iMax - f.bounds.iMin;
    const newWidth = origWidth / newZoom;
    const newHeight = origHeight / newZoom;

    this.wizardState.mapBounds = {
      rMin: centerR - newWidth / 2,
      rMax: centerR + newWidth / 2,
      iMin: centerI - newHeight / 2,
      iMax: centerI + newHeight / 2,
    };
    this.wizardState.mapZoom = newZoom;
    this.debouncedWizardRender();
  }

  /** Update note switcher in wizard place-anchor step */
  private updateWizardNoteSwitcher(): void {
    const switcher = this.container.querySelector('.fc-wizard-note-switcher');
    if (!switcher) return;

    const notes = this.wizardState.assignedNotes;
    if (notes.length <= 1) {
      // Single note or none - no need for switcher
      switcher.innerHTML = notes.length === 1
        ? `<span class="fc-wizard-note-chip active" style="--note-color: ${NOTE_COLORS[notes[0]]}">${NOTE_NAMES[notes[0]]}</span>`
        : '';
      return;
    }

    // Multiple notes - show clickable chips
    switcher.innerHTML = notes.map((noteIdx, i) => {
      const isActive = i === this.wizardState.previewNoteIdx;
      return `<button class="fc-wizard-note-chip${isActive ? ' active' : ''}" data-idx="${i}" style="--note-color: ${NOTE_COLORS[noteIdx]}">${NOTE_NAMES[noteIdx]}</button>`;
    }).join('');

    // Add click handlers
    switcher.querySelectorAll('.fc-wizard-note-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const idx = parseInt((chip as HTMLElement).dataset.idx || '0');
        this.wizardState.previewNoteIdx = idx;
        this.updateWizardNoteSwitcher();
        // Animation automatically picks up the new note color
      });
    });
  }

  /** Update movement preview in wizard step 4 */
  private updateMovementPreview(): void {
    // Update movement preset button states
    const buttons = this.container.querySelectorAll('.fc-wizard-movement-btn');
    buttons.forEach(btn => {
      const preset = (btn as HTMLElement).dataset.preset;
      btn.classList.toggle('selected', preset === this.wizardState.movementPreset);
    });

    // Update preview animation if we have a temp anchor
    if (this.wizardState.tempAnchor) {
      const anchor = { ...this.wizardState.tempAnchor };

      // Apply current movement preset for preview with animation
      if (this.wizardState.movementPreset !== 'custom') {
        const preset = MOVEMENT_PRESETS[this.wizardState.movementPreset];
        this.animateToPreset(preset);
      } else {
        // Custom mode - just update normally
        this.startWizardPreview(anchor);
      }

      // Redraw locus overlay to show updated orbit
      const wizardCanvas = this.container.querySelector('.fc-wizard-locus-canvas') as HTMLCanvasElement;
      if (wizardCanvas && this.wizardState.step === 'place-anchor') {
        this.renderWizardLocusOverlay(wizardCanvas);
      }
    }
  }

  /** Animate sliders to preset values */
  private animateToPreset(preset: { orbitRadius: number; orbitSkew: number; orbitRotation: number; beatSpread: number }): void {
    if (!this.wizardState.tempAnchor) return;

    const anchor = this.wizardState.tempAnchor;
    const startValues = {
      orbitRadius: anchor.orbitRadius,
      orbitSkew: anchor.orbitSkew,
      orbitRotation: anchor.orbitRotation,
      beatSpread: anchor.beatSpread,
    };
    // Cap orbitRadius to stay within 80% of visible area at current zoom
    const zoom = this.wizardState.mapZoom;
    const maxSafeRadius = 1.6 / zoom; // 80% of visible half-width
    const endValues = {
      orbitRadius: Math.min(preset.orbitRadius, maxSafeRadius),
      orbitSkew: preset.orbitSkew,
      orbitRotation: preset.orbitRotation,
      beatSpread: preset.beatSpread,
    };
    const duration = 200; // ms
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3);

      // Interpolate values
      anchor.orbitRadius = startValues.orbitRadius + (endValues.orbitRadius - startValues.orbitRadius) * ease;
      anchor.orbitSkew = startValues.orbitSkew + (endValues.orbitSkew - startValues.orbitSkew) * ease;
      anchor.orbitRotation = startValues.orbitRotation + (endValues.orbitRotation - startValues.orbitRotation) * ease;
      anchor.beatSpread = startValues.beatSpread + (endValues.beatSpread - startValues.beatSpread) * ease;

      // Update preview
      this.startWizardPreview({ ...anchor });
      // Redraw locus overlay to show updated orbit
      const wizardCanvas = this.container.querySelector('.fc-wizard-locus-canvas') as HTMLCanvasElement;
      if (wizardCanvas && this.wizardState.step === 'place-anchor') {
        this.renderWizardLocusOverlay(wizardCanvas);
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /** Start wizard movement preview animation */
  private startWizardPreview(anchor: InternalAnchor): void {
    this.stopWizardPreview();
    this.wizardPreviewPhase = 0;
    this.wizardPreviewLastTime = 0;

    const canvas = this.container.querySelector('.fc-wizard-movement-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;
    const loop = (time: number) => {
      frameCount++;
      // Only render every 3rd frame to reduce CPU load
      if (frameCount % 3 !== 0) {
        this.wizardPreviewAnim = requestAnimationFrame(loop);
        return;
      }

      const dt = this.wizardPreviewLastTime === 0 ? 0.05 : Math.min((time - this.wizardPreviewLastTime) / 1000, 0.1);
      this.wizardPreviewLastTime = time;

      const bpm = 120;
      const beatDur = 60 / bpm;
      this.wizardPreviewPhase += dt;
      const beatFloat = this.wizardPreviewPhase / beatDur;
      const beatFrac = beatFloat - Math.floor(beatFloat);

      // Calculate orbit position
      const beatIdx = Math.floor(beatFloat) % 4;
      const t = 1 - Math.pow(beatFrac, 0.4); // Quick attack, slow decay
      const isBackbeat = beatIdx % 2 === 1;
      const baseR = anchor.orbitRadius;
      const effectiveR = isBackbeat ? baseR * anchor.orbitSkew : baseR;
      const orbitAngle = beatIdx * anchor.beatSpread;
      const px = effectiveR * Math.cos(orbitAngle) * t;
      const py = effectiveR * Math.sin(orbitAngle) * t;
      const cosR = Math.cos(anchor.orbitRotation);
      const sinR = Math.sin(anchor.orbitRotation);
      const cr = anchor.real + px * cosR - py * sinR;
      const ci = anchor.imag + px * sinR + py * cosR;

      // Render Julia to wizard canvas
      this.renderWizardMovementJulia(canvas, ctx, anchor.familyIdx, cr, ci);
      this.wizardPreviewAnim = requestAnimationFrame(loop);
    };

    this.wizardPreviewAnim = requestAnimationFrame(loop);
  }

  /** Stop wizard movement preview animation */
  private stopWizardPreview(): void {
    if (this.wizardPreviewAnim) {
      cancelAnimationFrame(this.wizardPreviewAnim);
      this.wizardPreviewAnim = null;
    }
  }

  /** Render Julia set for wizard movement preview */
  private renderWizardMovementJulia(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, familyIdx: number, jR: number, jI: number): void {
    const f = FAMILIES[familyIdx];
    const size = canvas.width;
    const img = ctx.createImageData(size, size);
    const d = img.data;
    // Scale range by zoom: higher zoom = smaller range = more detail
    const viewZoom = this.wizardState.mapZoom;
    const range = 3.6 / viewZoom;
    const half = range / 2;
    const step = range / size;
    // Scale iterations with zoom: +50 iter per doubling for deep zoom fidelity
    const iter = 80 + Math.floor(50 * Math.log2(Math.max(1, viewZoom)));

    // Use the selected note's color
    const noteIdx = this.wizardState.assignedNotes[this.wizardState.previewNoteIdx] ?? 0;
    const [colR, colG, colB] = this.parseHexColor(NOTE_COLORS[noteIdx]);

    for (let py = 0; py < size; py++) {
      const fy = -half + py * step;
      for (let px = 0; px < size; px++) {
        const fx = -half + px * step;
        const esc = f.julia(fx, fy, jR, jI, iter);
        const idx = (py * size + px) * 4;
        if (esc === 0) {
          d[idx] = d[idx + 1] = d[idx + 2] = 0;
        } else {
          const t = Math.sqrt(esc / iter);
          d[idx] = Math.round(t * colR);
          d[idx + 1] = Math.round(t * colG);
          d[idx + 2] = Math.round(t * colB);
        }
        d[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  // --- Public API ---

  show(): void {
    this.visible = true;
    this.container.classList.add('visible');
    // Prevent background scrolling on mobile
    document.body.style.overflow = 'hidden';
    this.loadAnchors();
    this.renderLocus();
    this.drawOverlay();
    this.updateAssignments();

    // Ensure the current wizard step is shown
    this.showWizardStep(this.wizardState.step);

    const a = this.currentAnchor;
    if (a) this.startPreview(a);
  }

  /** Show the panel in wizard mode */
  showWizard(): void {
    this.resetWizard();
    this.show();
  }

  hide(): void {
    this.visible = false;
    // Trigger dismiss animation
    this.container.classList.add('dismissing');

    // Wait for animation to complete before removing visibility
    setTimeout(() => {
      this.container.classList.remove('visible', 'dismissing');
    }, 250);

    // Restore background scrolling
    document.body.style.overflow = '';
    this.stopPreview();
    this.stopNoteGridAnimation();
  }

  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  isVisible(): boolean {
    return this.visible;
  }
}
