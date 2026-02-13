/**
 * Fractal Configuration Panel
 *
 * Interactive editor for fractal anchor points per harmonic degree.
 * Each anchor defines a c-plane position and 4 orbit offsets for beat-synchronized motion.
 */

import { loadFractalAnchors, saveFractalAnchors, BUILTIN_ANCHOR_PRESETS, applyAnchorPreset, type FractalAnchors, type FractalAnchor } from './state.ts';

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
    related: ['Tricorn', 'Multicorn-3', 'Burning Ship'],
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
    related: ['Classic', 'Nova', 'Tricorn'],
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
    related: ['Classic', 'Multicorn-3', 'Buffalo'],
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
  },
  'newton-3': {
    formula: 'z → z - (z³-1)/(3z²)',
    year: '1879 (method) / 1983 (fractal)',
    creator: 'Isaac Newton / John Hubbard',
    category: 'Root-Finding',
    description: 'Applies Newton\'s root-finding method to z³ - 1 = 0, which has three cube roots of unity. Points are colored by which root they converge to, with boundaries showing chaotic behavior. Unlike escape-time fractals, this uses convergence.',
    traits: ['Three-color basins', 'Fractal boundaries', 'Root convergence', 'No escape iteration', 'Basin interleaving'],
    hotspots: ['Origin region (all three roots compete)', 'Unit circle (root boundaries)', 'z = 0 (critical point)'],
    tips: 'This fractal doesn\'t use "escape" - instead colors show which root each point finds. The boundaries between basins are infinitely complex. c parameter is not used.',
    related: ['Nova', 'Magnet', 'Barnsley-1'],
  },
  'nova': {
    formula: 'z → z - (z³-1)/(3z²) + c',
    year: '1997',
    creator: 'Paul Derbyshire',
    category: 'Newton Hybrid',
    description: 'A creative fusion of Newton\'s method with Julia set iteration - adds a constant c after each Newton step. This creates parameterized Newton fractals where the c value controls basin shapes and interactions.',
    traits: ['Parameterized Newton', 'Three attractors', 'Complex basins', 'Rich color mixing', 'Flowing boundaries'],
    hotspots: ['c = 0.0 + 0.0i (pure Newton)', 'c = 1.0 + 0.0i (distorted basins)', 'c = 0.5 + 0.5i (swirling)'],
    tips: 'Use the Clock button to distribute anchors around the unit circle for musical mapping. The three roots create natural triadic harmonies. Small c values give cleaner patterns.',
    related: ['Newton-3', 'Phoenix', 'Magnet'],
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
    related: ['Magnet-II', 'Newton-3', 'Nova', 'Classic'],
  },
  'magnet-2': {
    formula: 'z → ((z³ + 3(c-1)z + (c-1)(c-2)) / (3z² + 3(c-2)z + (c-1)(c-2) + 1))²',
    year: '1994',
    creator: 'Derived from physics',
    category: 'Physics-Derived',
    description: 'The second Magnet fractal from statistical mechanics. Uses cubic terms in the iteration, creating more intricate flame-like boundaries than Type I. Both types model magnetic phase transitions via renormalization group equations.',
    traits: ['Cubic iteration', 'Flame-like tendrils', 'Single attractor at z=1', 'More intricate than Type I', 'Physics-derived'],
    hotspots: ['c = 0.0 + 0.0i (centered)', 'c = 1.5 + 0.0i (boundary)', 'c = 0.5 + 0.5i (swirling)'],
    tips: 'More complex than Magnet I due to cubic terms. The flame-like boundaries are characteristic. Converges to z = 1 like Type I.',
    related: ['Magnet-I', 'Newton-3', 'Nova'],
  },
  'barnsley-1': {
    formula: 'z → (z-1)c if Re(z)≥0, else (z+1)c',
    year: '1988',
    creator: 'Michael Barnsley',
    category: 'Conditional/IFS',
    description: 'Michael Barnsley\'s conditional fractal uses different formulas based on the sign of the real part. Inspired by Iterated Function Systems (IFS), it creates fern-like, branching patterns similar to his famous Barnsley Fern.',
    traits: ['Conditional iteration', 'Fern-like patterns', 'Branching structures', 'Asymmetric growth', 'Leaf-like shapes'],
    hotspots: ['c = 0.6 + 1.1i (fern)', 'c = -0.5 + 0.8i (branches)', 'c = 0.9 + 0.0i (linear)'],
    tips: 'The conditional nature creates natural-looking branching. Look for fern fronds and leaf structures. Best viewed with green/nature color palettes.',
    related: ['Barnsley-2', 'Barnsley-3', 'Celtic'],
  },
  'barnsley-2': {
    formula: 'z → (z±1)c based on Im(z·c)',
    year: '1988',
    creator: 'Michael Barnsley',
    category: 'Conditional/IFS',
    description: 'Barnsley\'s second variation changes the condition to depend on the product of z and c, creating different domain boundaries. Often produces more organic, flowing shapes than Barnsley-1.',
    traits: ['Complex conditions', 'Organic shapes', 'Interleaved domains', 'Natural forms', 'Smooth boundaries'],
    hotspots: ['c = 0.4 + 0.9i (organic)', 'c = -0.6 + 0.6i (interleaved)', 'c = 1.0 + 0.5i (flowing)'],
    tips: 'The condition based on Im(z·c) creates more complex domain boundaries. Look for regions where the two formulas compete.',
    related: ['Barnsley-1', 'Barnsley-3', 'Phoenix'],
  },
  'barnsley-3': {
    formula: 'z → (z²-1) + c·(z+1) or (z²-1) + c',
    year: '1988',
    creator: 'Michael Barnsley',
    category: 'Conditional/IFS',
    description: 'The third Barnsley variant combines quadratic iteration with conditional c multiplication. Creates dense filament structures with multiple competing domains.',
    traits: ['Quadratic hybrid', 'Dense filaments', 'Multiple domains', 'Complex dynamics', 'Hairlike structures'],
    hotspots: ['c = 0.5 + 0.5i (filaments)', 'c = -0.8 + 0.2i (dense)', 'c = 0.3 - 0.7i (domains)'],
    tips: 'The quadratic base gives familiar bulb shapes, but the conditional term adds chaos. Look for regions where filaments explode from bulb boundaries.',
    related: ['Barnsley-1', 'Barnsley-2', 'Classic'],
  },
  'multicorn-3': {
    formula: 'z → conj(z)³ + c',
    year: '1989+',
    creator: 'Extension of Tricorn',
    category: 'Higher-Order Conjugate',
    description: 'A higher-order version of the Tricorn (Mandelbar) using the cube instead of square. The conjugate combined with odd power creates distinctive multi-fold symmetry with pointed lobes radiating from the center.',
    traits: ['Multi-fold symmetry', 'Pointed lobes', 'Conjugate dynamics', 'Higher-order effects', 'Star-like shapes'],
    hotspots: ['c = 0.0 + 0.8i (star tips)', 'c = -0.5 + 0.5i (lobes)', 'c = 0.3 - 0.3i (mini-corns)'],
    tips: 'The odd power (3) with conjugate creates different symmetry than even powers. Look for star-like patterns with multiple arms. Each arm contains self-similar detail.',
    related: ['Tricorn', 'Classic', 'Phoenix'],
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
    id: 'newton-3', label: 'Newton-3', typeNum: 10,
    bounds: { rMin: -2.0, rMax: 2.0, iMin: -2.0, iMax: 2.0 },
    locus(cr, ci, maxIter, z0r = 0, z0i = 0) {
      let x = cr + z0r, y = ci + z0i;
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
    locus(cr, ci, maxIter, z0r = 0, z0i = 0) {
      let x = cr + z0r, y = ci + z0i;
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
    id: 'magnet-2', label: 'Magnet-II', typeNum: 19,
    bounds: { rMin: -3.0, rMax: 3.0, iMin: -3.0, iMax: 3.0 },
    locus(cr, ci, maxIter, z0r = 0, z0i = 0) {
      let x = z0r, y = z0i;
      const qR = cr - 1, qI = ci;
      const rR = cr - 2, rI = ci;
      const qrR = qR * rR - qI * rI;
      const qrI = qR * rI + qI * rR;
      for (let i = 0; i < maxIter; i++) {
        const d1 = (x - 1) ** 2 + y ** 2;
        if (d1 < 0.0001) return i + 1;
        if (x * x + y * y > 1000) return i + 1;
        const x2 = x * x, y2 = y * y;
        const z3R = x * x2 - 3 * x * y2;
        const z3I = 3 * x2 * y - y * y2;
        const tqzR = 3 * (qR * x - qI * y);
        const tqzI = 3 * (qR * y + qI * x);
        const numR = z3R + tqzR + qrR;
        const numI = z3I + tqzI + qrI;
        const tz2R = 3 * (x2 - y2);
        const tz2I = 6 * x * y;
        const trzR = 3 * (rR * x - rI * y);
        const trzI = 3 * (rR * y + rI * x);
        const denR = tz2R + trzR + qrR + 1;
        const denI = tz2I + trzI + qrI;
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
      const qR = jR - 1, qI = jI;
      const rR = jR - 2, rI = jI;
      const qrR = qR * rR - qI * rI;
      const qrI = qR * rI + qI * rR;
      for (let i = 0; i < maxIter; i++) {
        const d1 = (x - 1) ** 2 + y ** 2;
        if (d1 < 0.0001) return i + 1;
        if (x * x + y * y > 1000) return i + 1;
        const x2 = x * x, y2 = y * y;
        const z3R = x * x2 - 3 * x * y2;
        const z3I = 3 * x2 * y - y * y2;
        const tqzR = 3 * (qR * x - qI * y);
        const tqzI = 3 * (qR * y + qI * x);
        const numR = z3R + tqzR + qrR;
        const numI = z3I + tqzI + qrI;
        const tz2R = 3 * (x2 - y2);
        const tz2I = 6 * x * y;
        const trzR = 3 * (rR * x - rI * y);
        const trzI = 3 * (rR * y + rI * x);
        const denR = tz2R + trzR + qrR + 1;
        const denI = tz2I + trzI + qrI;
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
  {
    id: 'barnsley-2', label: 'Barnsley-2', typeNum: 15,
    bounds: { rMin: -2.0, rMax: 2.0, iMin: -2.0, iMax: 2.0 },
    locus(cr, ci, maxIter, z0r = 0, z0i = 0) {
      let x = z0r, y = z0i;
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
    locus(cr, ci, maxIter, z0r = 0, z0i = 0) {
      let x = z0r, y = z0i;
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
    locus(cr, ci, maxIter, z0r = 0, z0i = 0) {
      let x = z0r, y = z0i;
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
  {
    id: 'mandelbrot', label: 'Mandelbrot', typeNum: 18,
    bounds: { rMin: -2.5, rMax: 1.0, iMin: -1.25, iMax: 1.25 },
    // Mandelbrot: c = pixel, z₀ = slider (default 0)
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
    // Julia preview uses the selected c point
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
  private previewScale = 1.0; // 0 = stopped, 1 = normal, 2 = big

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

  // Clock rotation offset (0-11 semitones, cycles on each click)
  private clockRotationOffset = 0;

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

  // Hotspot cycling index per degree
  private hotspotIndices: Map<number, number> = new Map();

  /** Parse a hotspot string like "c = -0.75 (period-2 bulb)" or "c = -0.12 + 0.74i (spiral)" */
  private parseHotspot(hotspot: string): { real: number; imag: number } | null {
    // Match patterns like "c = -0.75", "c = -0.12 + 0.74i", "c = 0.28 + 0.01i", "z₀ = 0 + 0i"
    const match = hotspot.match(/=\s*([-\d.]+)\s*([+-]\s*([\d.]+)i)?/);
    if (!match) return null;

    const real = parseFloat(match[1]);
    let imag = 0;
    if (match[2]) {
      const imagStr = match[2].replace(/\s/g, '').replace('i', '');
      imag = parseFloat(imagStr);
    }

    return { real, imag };
  }

  /** Cycle to next hotspot for a degree */
  private cycleHotspot(deg: number): void {
    const family = FAMILIES[this.selectedFamily];
    const info = FAMILY_INFO[family.id];
    const hotspots = info?.hotspots || [];

    if (hotspots.length === 0) return;

    // Get current index for this degree, default to -1 so first click goes to 0
    const currentIdx = this.hotspotIndices.get(deg) ?? -1;
    const nextIdx = (currentIdx + 1) % hotspots.length;
    this.hotspotIndices.set(deg, nextIdx);

    // Parse the hotspot
    const parsed = this.parseHotspot(hotspots[nextIdx]);
    if (!parsed) return;

    // Update the anchor for this degree
    const key = this.anchorKey(deg);
    const anchor = this.anchors.get(key);
    if (anchor) {
      anchor.real = parsed.real;
      anchor.imag = parsed.imag;
      anchor.familyIdx = this.selectedFamily;
      this.markAllThumbnailsDirty();
    }

    // Update status
    const status = this.container.querySelector('#fc-status')!;
    status.textContent = `${DEGREE_NAMES[deg]} → ${hotspots[nextIdx]}`;

    // Refresh display
    this.selectDegreeQuality(deg, 'major');
    this.drawOverlay();
    if (this.onSave) this.onSave();
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

  /** Show clock button only for Nova family */
  private updateClockButtonVisibility(): void {
    const clockBtn = this.container.querySelector('.fc-clock-btn') as HTMLElement;
    if (!clockBtn) return;
    const family = FAMILIES[this.selectedFamily];
    clockBtn.style.display = family.id === 'nova' ? '' : 'none';
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

    // Related families
    this.container.querySelector('#fc-info-related-list')!.innerHTML = (info?.related || [])
      .map(r => `<span class="fc-info-related-tag">${r}</span>`)
      .join('');

    modal.classList.add('visible');
  }

  /** Hide family information modal */
  private hideFamilyInfo(): void {
    const modal = this.container.querySelector('#fc-info-modal') as HTMLElement;
    modal.classList.remove('visible');
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
      // Normalize rotation to 0-2π range for the slider
      let normalizedRot = anchor.orbitRotation % (Math.PI * 2);
      if (normalizedRot < 0) normalizedRot += Math.PI * 2;
      if (rotSlider) rotSlider.value = String(Math.round(normalizedRot * 100));
      if (spreadSlider) spreadSlider.value = String(Math.round(anchor.beatSpread * 100));
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
    const familyButtons = FAMILIES.map((f, i) =>
      `<button class="fc-family-btn${i === 0 ? ' active' : ''}" data-family="${i}">${f.label}</button>`
    ).join('');

    // Build degree × quality grid - single row on desktop, wraps on mobile
    const degreeRows = [[1, 2, 3, 4, 5, 6, 7]];

    const makeDegreeBlock = (deg: number) => {
      const name = DEGREE_NAMES[deg];
      const cells = QUALITIES.map(q => {
        const isActive = deg === 1 && q.id === 'major';
        return `<button class="fc-grid-cell${isActive ? ' active' : ''}"
          data-deg="${deg}" data-quality="${q.id}">
          <span class="fc-cell-dot" style="background:${DEGREE_COLORS[deg]}"></span>
        </button>`;
      }).join('');

      return `
        <div class="fc-degree-block">
          <div class="fc-degree-header">
            <button class="fc-hotspot-btn" data-deg="${deg}" title="Cycle through areas of interest">!</button>
            <div class="fc-grid-degree" data-deg="${deg}" title="Apply to all qualities">
              <span class="fc-deg-dot" style="background:${DEGREE_COLORS[deg]}"></span>${name}
            </div>
          </div>
          <div class="fc-degree-cells">
            ${cells}
          </div>
          <div class="fc-orbit-controls">
            <label title="Orbit radius">⊕<input type="range" class="fc-radius-slider" data-deg="${deg}" min="1" max="100" value="20"></label>
            <label title="Orbit rotation">↻<input type="range" class="fc-rotation-slider" data-deg="${deg}" min="0" max="628" value="0"></label>
            <label title="Orbit skew (aspect ratio)">⬭<input type="range" class="fc-skew-slider" data-deg="${deg}" min="20" max="200" value="100"></label>
            <label title="Beat spread (angle between points)">∢<input type="range" class="fc-spread-slider" data-deg="${deg}" min="10" max="200" value="157"></label>
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

        <div class="fc-preset-bar">
          ${BUILTIN_ANCHOR_PRESETS.map(p => `<button class="fc-preset-btn" data-preset-id="${p.id}">${p.name}</button>`).join('')}
        </div>

        <div class="fc-toolbar">
          <div class="fc-toolbar-section fc-family-section">
            <div class="fc-family-buttons">${familyButtons}</div>
            <span class="fc-section-label">Info:</span>
            <button class="fc-btn fc-info-btn" title="Family information">ℹ️</button>
            <span class="fc-section-label">Atlas:</span>
            <button class="fc-btn fc-atlas-btn" title="Toggle atlas grid overlay">🗺️</button>
          </div>
          <div class="fc-toolbar-divider"></div>
          <div class="fc-actions">
            <button class="fc-btn fc-clock-btn" title="Distribute on clock (cycles rotation)" style="display:none;">🕐</button>
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
            <div class="fc-preview-range">
              <span>⏸</span>
              <input type="range" id="fc-preview-scale" min="0" max="200" value="100" title="Preview movement range">
              <span>🔄</span>
            </div>
            <div class="fc-palette-bar">${paletteButtons}</div>

            <div class="fc-assignments" id="fc-assignments"></div>
          </div>
        </div>

        <div class="fc-info-modal" id="fc-info-modal">
          <div class="fc-info-content">
            <div class="fc-info-header">
              <h3 id="fc-info-title">Family Name</h3>
              <button class="fc-info-close">&times;</button>
            </div>

            <div class="fc-info-meta">
              <span class="fc-info-meta-item"><strong>Year:</strong> <span id="fc-info-year">1980</span></span>
              <span class="fc-info-meta-item"><strong>Creator:</strong> <span id="fc-info-creator">Unknown</span></span>
              <span class="fc-info-meta-item"><strong>Category:</strong> <span id="fc-info-category">Polynomial</span></span>
            </div>

            <div class="fc-info-formula" id="fc-info-formula">z → z² + c</div>

            <p class="fc-info-desc" id="fc-info-desc">Description</p>

            <div class="fc-info-section">
              <strong>Visual Characteristics:</strong>
              <ul id="fc-info-traits-list"></ul>
            </div>

            <div class="fc-info-section">
              <strong>Interesting c-values to explore:</strong>
              <ul id="fc-info-hotspots-list" class="fc-info-hotspots"></ul>
            </div>

            <div class="fc-info-tips">
              <strong>💡 Tips:</strong>
              <p id="fc-info-tips-text">Exploration tips will appear here.</p>
            </div>

            <div class="fc-info-related">
              <strong>Related Families:</strong>
              <span id="fc-info-related-list"></span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private setupEventHandlers(): void {
    // Close button
    this.container.querySelector('.fc-close-btn')!.addEventListener('click', () => this.hide());

    // Preset buttons
    this.container.querySelectorAll('.fc-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const presetId = (btn as HTMLElement).dataset.presetId;
        const preset = BUILTIN_ANCHOR_PRESETS.find(p => p.id === presetId);
        if (preset) {
          applyAnchorPreset(preset);
          this.loadAnchors();
          this.drawOverlay();
          this.updateAssignments();
          if (this.onSave) this.onSave();
        }
      });
    });

    // Click overlay to close
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) this.hide();
    });

    // Family buttons
    const familyBtns = this.container.querySelectorAll('.fc-family-btn');
    familyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        familyBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedFamily = parseInt((btn as HTMLElement).dataset.family!);
        this.updateClockButtonVisibility();
        this.renderLocus();
        this.drawOverlay();
      });
    });

    // Clock button (distribute on clock positions)
    this.container.querySelector('.fc-clock-btn')!.addEventListener('click', () => this.distributeOnClock());

    // Info button (show family information modal)
    this.container.querySelector('.fc-info-btn')!.addEventListener('click', () => this.showFamilyInfo());

    // Info modal close button
    this.container.querySelector('.fc-info-close')!.addEventListener('click', () => this.hideFamilyInfo());

    // Close modal on backdrop click
    this.container.querySelector('#fc-info-modal')!.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('fc-info-modal')) {
        this.hideFamilyInfo();
      }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = this.container.querySelector('#fc-info-modal') as HTMLElement;
        if (modal.classList.contains('visible')) {
          this.hideFamilyInfo();
        }
      }
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

    // Hotspot cycling buttons
    this.container.querySelectorAll('.fc-hotspot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const deg = parseInt((btn as HTMLElement).dataset.deg!);
        this.cycleHotspot(deg);
      });
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

    this.container.querySelector('.fc-atlas-btn')!.addEventListener('click', () => this.toggleAtlasGrid());
    this.container.querySelector('.fc-copy-btn')!.addEventListener('click', () => this.copyToClipboard());
    this.container.querySelector('.fc-recall-btn')!.addEventListener('click', () => this.recallOrbits());
    this.container.querySelector('.fc-reset-btn')!.addEventListener('click', () => this.resetToDefaults());
    this.container.querySelector('.fc-save-btn')!.addEventListener('click', () => this.save());

    // BPM input
    const bpmInput = this.container.querySelector('#fc-bpm') as HTMLInputElement;
    bpmInput.addEventListener('input', () => {
      const v = parseInt(bpmInput.value);
      if (v >= 30 && v <= 300) this.previewBpm = v;
    });

    // Preview scale slider (0 = stopped, 100 = normal, 200 = big)
    const previewScaleSlider = this.container.querySelector('#fc-preview-scale') as HTMLInputElement;
    previewScaleSlider.addEventListener('input', () => {
      this.previewScale = parseInt(previewScaleSlider.value) / 100;
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

        // Check 4 points around the orbit (backbeat emphasis: beats 1,3 use skew)
        const baseRadius = a.orbitRadius;
        const cosR = Math.cos(a.orbitRotation);
        const sinR = Math.sin(a.orbitRotation);
        for (let oi = 0; oi < 4; oi++) {
          // Beat points at 0, spread, 2*spread, 3*spread
          // Backbeat emphasis: beats 1 and 3 get scaled radius
          const isBackbeat = (oi === 1 || oi === 3);
          const r = isBackbeat ? baseRadius * a.orbitSkew : baseRadius;
          const angle = oi * a.beatSpread;
          const px = r * Math.cos(angle);
          const py = r * Math.sin(angle);
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
        const beatAngle = hit.orbitIdx * a.beatSpread;
        // Backbeat emphasis: beats 1 and 3 get scaled radius
        const isBackbeat = (hit.orbitIdx === 1 || hit.orbitIdx === 3);
        const r = isBackbeat ? a.orbitRadius * a.orbitSkew : a.orbitRadius;
        const px = r * Math.cos(beatAngle);
        const py = r * Math.sin(beatAngle);
        const cosR = Math.cos(a.orbitRotation);
        const sinR = Math.sin(a.orbitRotation);
        const startOffsetR = px * cosR - py * sinR;
        const startOffsetI = px * sinR + py * cosR;
        // Save original values for drag: radius, rotation, skew, spread, and beat angle
        this.dragStartData = {
          origRadius: a.orbitRadius,
          origRotation: a.orbitRotation,
          origSkew: a.orbitSkew,
          origSpread: a.beatSpread,
          beatAngle,
          startOffsetR,
          startOffsetI
        };
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
        // Calculate new offset from anchor center
        const newOffsetR = this.dragStartData.startOffsetR + cDx;
        const newOffsetI = this.dragStartData.startOffsetI + cDy;
        const newRadius = Math.sqrt(newOffsetR * newOffsetR + newOffsetI * newOffsetI);

        // Calculate angle from anchor center to current position
        const mouseAngle = Math.atan2(newOffsetI, newOffsetR);

        // Track snap mode for visual feedback
        this.snapMode = e.shiftKey ? 'cross' : 'none';

        if (e.ctrlKey || e.metaKey) {
          // Ctrl/Cmd+drag: adjust skew (vertical) and spread (horizontal)
          // Vertical motion adjusts skew
          const skewSensitivity = 3.0;
          const newSkew = this.dragStartData.origSkew + cDy * skewSensitivity;
          dragAnchor.orbitSkew = Math.max(0.2, Math.min(2.0, newSkew));

          // Horizontal motion adjusts beat spread (angle between beat points)
          // Range: 0.1 rad (~6°) to 2.0 rad (~115°) - covers tight to wide spreads
          const spreadSensitivity = 4.0;
          const newSpread = this.dragStartData.origSpread + cDx * spreadSensitivity;
          dragAnchor.beatSpread = Math.max(0.1, Math.min(2.0, newSpread));

          // Also update radius
          dragAnchor.orbitRadius = Math.max(0.01, newRadius);
        } else {
          // Normal drag: adjust radius and rotation
          const newRotation = mouseAngle - this.dragStartData.beatAngle;
          dragAnchor.orbitRadius = Math.max(0.01, newRadius);
          dragAnchor.orbitRotation = newRotation;
        }
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
        } else if (e.ctrlKey || e.metaKey) {
          // Ctrl/Cmd+click on empty — place anchor for current selection
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
          });

          this.startPreview(this.anchors.get(this.currentKey)!);
          this.drawOverlay();
          this.updateAssignments();
        }
      } else if (this.dragMode === 'center' || this.dragMode === 'orbit') {
        const key = this.anchorKey(this.dragDeg, this.selectedQuality);
        const a = this.anchors.get(key);
        if (a) this.startPreview(a);
        // Sync sliders to reflect any changes from dragging
        this.syncOrbitSliders();
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
      const familyBtns = this.container.querySelectorAll('.fc-family-btn');
      familyBtns.forEach(b => b.classList.remove('active'));
      const activeBtn = this.container.querySelector(`.fc-family-btn[data-family="${a.familyIdx}"]`);
      activeBtn?.classList.add('active');
      this.updateClockButtonVisibility();
      this.renderLocus();
      this.startPreview(a);
    } else {
      this.stopPreview();
    }
    this.drawOverlay();
    this.updateAssignments();
  }

  private toggleAtlasGrid(): void {
    this.showAtlasGrid = !this.showAtlasGrid;
    const btn = this.container.querySelector('.fc-atlas-btn')!;
    btn.classList.toggle('active', this.showAtlasGrid);
    this.drawOverlay();
    const status = this.container.querySelector('#fc-status')!;
    status.textContent = this.showAtlasGrid ? 'Atlas grid ON - showing Julia previews' : 'Atlas grid OFF';
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
      lines.push(`    ${deg}: { real: ${a.real.toFixed(4)}, imag: ${a.imag.toFixed(4)}, type: ${f.typeNum}, orbitRadius: ${a.orbitRadius.toFixed(4)}, orbitSkew: ${a.orbitSkew.toFixed(2)}, orbitRotation: ${a.orbitRotation.toFixed(2)}, beatSpread: ${a.beatSpread.toFixed(2)} },`);
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
      };
    }
    saveFractalAnchors(out);
    if (this.onSave) this.onSave();
    this.hide();
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

  /** Debounced draw for drag operations */
  private debouncedDraw(): void {
    if (this.dragDebounceTimer !== null) {
      cancelAnimationFrame(this.dragDebounceTimer);
    }
    this.dragDebounceTimer = requestAnimationFrame(() => {
      this.dragDebounceTimer = null;
      this.drawOverlay();
      this.syncOrbitSliders();
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

          // Draw beat points visualization
          // Skew acts as backbeat emphasis: beats 1 and 3 get scaled radius
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
        const fx = -half + px * step;
        const fy = -half + py * step;
        const esc = f.julia(fx, fy, jR, jI, JULIA_ITER);
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
