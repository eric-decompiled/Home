# Fractal Families: Julia Set Variants and Music Visualization

A comprehensive research compilation of fractal iteration formulas, their visual characteristics, and potential applications for music-reactive visualization.

**Last Updated:** 2026-02-08

---

## 0. Executive Summary

This document catalogs fractal families beyond the standard Mandelbrot/Julia quadratic iteration, with an emphasis on:
1. **Visual aesthetics** - Which fractals produce compelling imagery
2. **Animation characteristics** - How fractals behave when parameters are animated
3. **Music mapping potential** - How musical features might map to fractal parameters
4. **Implementation considerations** - Performance and GPU-friendliness

### Currently Implemented (Fractured Jukebox)

| Type | Name | Formula | Notes |
|------|------|---------|-------|
| 0 | Standard Julia | `z = z^2 + c` | Classic quadratic |
| 1 | Cubic Julia | `z = z^3 + c` | Three-fold symmetry |
| 2 | Quartic Julia | `z = z^4 + c` | Four-fold symmetry |
| 3 | Burning Ship | `z = (|Re(z)| + i|Im(z)|)^2 + c` | Ship-like appearance |
| 4 | Tricorn/Mandelbar | `z = conj(z)^2 + c` | Three-pronged |
| 5 | Phoenix | `z = z^2 + c + p*z_{n-1}` | Uses previous iteration |
| 6 | Celtic | `z = |Re(z^2)| + Im(z^2)*i + c` | Celtic knot patterns |
| 7 | Lambda | `z = c*z*(1-z)` | Logistic map based |
| 8 | PerpBurn | `z = (Re(z) + i|Im(z)|)^2 + c` | Burning Ship variant |
| 9 | Buffalo | `z = |z|^2 - |z| + c` | Buffalo-shaped locus |

---

## 1. Classification of Julia Set Variants

### 1.1 Modification Strategies

Julia set variants arise from modifying the standard iteration `z_{n+1} = z_n^2 + c` in several ways:

| Strategy | Description | Examples |
|----------|-------------|----------|
| **Power change** | Use `z^n` where n != 2 | Multibrot (z^3, z^4, ...) |
| **Conjugate** | Use `conj(z)` in iteration | Tricorn, Mandelbar |
| **Absolute value** | Apply `|x|` to real/imag parts | Burning Ship, Celtic, Buffalo |
| **Memory** | Include previous z values | Phoenix, Tetration |
| **Different function** | Use non-polynomial iteration | Newton, Magnet, Nova |
| **Parameter variation** | Add extra parameters | Lambda, Magnet |
| **Hybrid** | Combine multiple strategies | PerpBurn, Collatz |

### 1.2 Symmetry Classes

| Symmetry | Cause | Examples |
|----------|-------|----------|
| **Rotational (n-fold)** | z^n power | Cubic (3), Quartic (4) |
| **Bilateral (vertical)** | Real-axis symmetry | Standard Julia |
| **Bilateral (horizontal)** | Imaginary-axis symmetry | Some conjugate types |
| **None** | Absolute value ops | Burning Ship |
| **Point** | Central inversion | Many Newton fractals |

### 1.3 Connectedness Locus

The **connectedness locus** (like the Mandelbrot set for z^2+c) shows which c-values produce connected Julia sets. Different iteration formulas have different loci:

| Formula | Locus Name | Shape |
|---------|------------|-------|
| z^2 + c | Mandelbrot | Cardioid + bulbs |
| z^3 + c | Multibrot-3 | Three-lobed |
| conj(z)^2 + c | Tricorn/Mandelbar | Three-pronged |
| Burning Ship | Burning Ship set | Ship-like |
| Buffalo | Buffalo set | Buffalo-shaped |

---

## 2. Visually Interesting Families

### 2.1 Mandelbar / Tricorn Variants

The Tricorn (or Mandelbar) uses complex conjugate:

```typescript
// Tricorn: z = conj(z)^2 + c
function tricornIteration(zr: number, zi: number, cr: number, ci: number): [number, number] {
  // conj(z)^2 = (x - iy)^2 = x^2 - y^2 - 2ixy
  const nr = zr * zr - zi * zi + cr;
  const ni = -2 * zr * zi + ci;
  return [nr, ni];
}
```

**Visual characteristics:**
- Three-pronged main body (hence "Tricorn")
- Sharp, angular features
- Less "organic" than Mandelbrot
- Minibrots replaced by "mini-tricorns"

**Recommended parameter bounds:**
- Real: [-2.5, 1.5]
- Imaginary: [-1.8, 1.8]

**Animation behavior:** Smooth transitions; the angular features create interesting morphing effects.

#### Multicorn (Higher-order Tricorn)

```typescript
// Multicorn-n: z = conj(z)^n + c
function multicornIteration(zr: number, zi: number, cr: number, ci: number, n: number): [number, number] {
  // conj(z) = x - iy, then raise to power n
  const r = Math.sqrt(zr * zr + zi * zi);
  const theta = Math.atan2(-zi, zr); // Note: -zi for conjugate
  const rn = Math.pow(r, n);
  const nr = rn * Math.cos(n * theta) + cr;
  const ni = rn * Math.sin(n * theta) + ci;
  return [nr, ni];
}
```

**Multicorn-3** has 4-fold symmetry, **Multicorn-4** has 5-fold, etc.

---

### 2.2 Multibrot (z^n + c)

Generalization of the quadratic to arbitrary powers:

```typescript
// Multibrot-n: z = z^n + c
function multibrotIteration(zr: number, zi: number, cr: number, ci: number, n: number): [number, number] {
  const r = Math.sqrt(zr * zr + zi * zi);
  const theta = Math.atan2(zi, zr);
  const rn = Math.pow(r, n);
  const nr = rn * Math.cos(n * theta) + cr;
  const ni = rn * Math.sin(n * theta) + ci;
  return [nr, ni];
}

// Optimized Cubic (n=3)
function cubicIteration(zr: number, zi: number, cr: number, ci: number): [number, number] {
  // z^3 = (x+iy)^3 = x^3 - 3xy^2 + i(3x^2y - y^3)
  const x2 = zr * zr, y2 = zi * zi;
  const nr = zr * x2 - 3 * zr * y2 + cr;
  const ni = 3 * x2 * zi - zi * y2 + ci;
  return [nr, ni];
}

// Optimized Quartic (n=4)
function quarticIteration(zr: number, zi: number, cr: number, ci: number): [number, number] {
  const x2 = zr * zr, y2 = zi * zi;
  const nr = x2 * x2 - 6 * x2 * y2 + y2 * y2 + cr;
  const ni = 4 * zr * zi * (x2 - y2) + ci;
  return [nr, ni];
}
```

**Visual characteristics by power:**

| Power | Symmetry | Character | Best For |
|-------|----------|-----------|----------|
| 2 | 2-fold | Classic, organic | General use |
| 3 | 3-fold | Triangular, complex | Tension, mystery |
| 4 | 4-fold | Square-ish, balanced | Stability, resolution |
| 5 | 5-fold | Star-like | Bright, energetic |
| 6+ | n-fold | Increasingly circular | Special effects |

**Fractional powers** (e.g., z^2.5) create spiraling asymmetric forms but require branch-cut handling.

**Recommended bounds:** Shrink with increasing n. For n=3: [-1.5, 1.5]; for n=4: [-1.3, 1.3].

---

### 2.3 Newton Fractals

Newton's method for finding roots of f(z) = 0 creates beautiful basin-of-attraction fractals:

```typescript
// Newton fractal for z^n - 1 = 0
// Iteration: z = z - f(z)/f'(z) = z - (z^n - 1)/(n*z^(n-1)) = z*(1 - 1/n) + 1/(n*z^(n-1))
function newtonIteration(zr: number, zi: number, n: number): [number, number, number] {
  const r2 = zr * zr + zi * zi;
  if (r2 < 1e-10) return [zr, zi, -1]; // Avoid division by zero

  // z^(n-1) using polar form
  const r = Math.sqrt(r2);
  const theta = Math.atan2(zi, zr);
  const rn1 = Math.pow(r, n - 1);
  const zn1r = rn1 * Math.cos((n - 1) * theta);
  const zn1i = rn1 * Math.sin((n - 1) * theta);

  // z^n
  const znr = rn1 * r * Math.cos(n * theta);
  const zni = rn1 * r * Math.sin(n * theta);

  // Newton step: z - (z^n - 1)/(n * z^(n-1))
  const denom_r = n * zn1r;
  const denom_i = n * zn1i;
  const denom2 = denom_r * denom_r + denom_i * denom_i;

  const num_r = znr - 1;
  const num_i = zni;

  // Complex division: num / denom
  const div_r = (num_r * denom_r + num_i * denom_i) / denom2;
  const div_i = (num_i * denom_r - num_r * denom_i) / denom2;

  const nr = zr - div_r;
  const ni = zi - div_i;

  // Check convergence to roots (nth roots of unity)
  for (let k = 0; k < n; k++) {
    const rootR = Math.cos(2 * Math.PI * k / n);
    const rootI = Math.sin(2 * Math.PI * k / n);
    const dist = Math.sqrt((nr - rootR) ** 2 + (ni - rootI) ** 2);
    if (dist < 0.001) return [nr, ni, k]; // Converged to root k
  }

  return [nr, ni, -1]; // Not converged
}
```

**Visual characteristics:**
- Basin boundaries form intricate fractal patterns
- Each root has a distinct "attraction basin"
- Boundaries between basins are Julia-set-like
- n-fold rotational symmetry for z^n - 1

**Coloring strategies:**
1. **Root coloring:** Color by which root the point converges to
2. **Iteration coloring:** Color by number of iterations to converge
3. **Distance coloring:** Color by final distance from root
4. **Hybrid:** Combine root hue with iteration brightness

**Animation:** Animating the polynomial coefficients creates mesmerizing basin-boundary flows.

**Recommended bounds:** [-2, 2] for both axes.

**GPU-friendliness:** Excellent - simple iteration, no special functions needed.

---

### 2.4 Magnet Fractals

Derived from statistical mechanics (renormalization of Ising model):

```typescript
// Magnet Type I: z = ((z^2 + c - 1) / (2z + c - 2))^2
function magnetType1(zr: number, zi: number, cr: number, ci: number): [number, number] {
  // Numerator: z^2 + c - 1
  const numR = zr * zr - zi * zi + cr - 1;
  const numI = 2 * zr * zi + ci;

  // Denominator: 2z + c - 2
  const denR = 2 * zr + cr - 2;
  const denI = 2 * zi + ci;

  // Complex division
  const den2 = denR * denR + denI * denI;
  if (den2 < 1e-10) return [1e10, 1e10]; // Blow up

  const divR = (numR * denR + numI * denI) / den2;
  const divI = (numI * denR - numR * denI) / den2;

  // Square the result
  const nr = divR * divR - divI * divI;
  const ni = 2 * divR * divI;

  return [nr, ni];
}

// Magnet Type II: z = ((z^3 + 3(c-1)z + (c-1)(c-2)) / (3z^2 + 3(c-2)z + (c-1)(c-2) + 1))^2
function magnetType2(zr: number, zi: number, cr: number, ci: number): [number, number] {
  // More complex - involves z^3 and multiple c terms
  // Implementation similar to Type I but with cubic terms
  // ... (full implementation omitted for brevity)
  return [0, 0]; // Placeholder
}
```

**Visual characteristics:**
- Has a fixed point at z = 1 (magnetic saturation)
- Boundaries are extremely intricate
- Both connected and disconnected regions
- Unique "flame-like" tendrils

**Bailout condition:** Different from standard! Converges to z = 1, not escapes to infinity.

```typescript
// Magnet bailout: check distance to fixed point z = 1
const distToOne = Math.sqrt((zr - 1) ** 2 + zi ** 2);
if (distToOne < 0.0001) return iteration; // Converged
if (zr * zr + zi * zi > 1000) return -1; // Escaped (use different color)
```

**Recommended bounds:** [-3, 3] for both axes.

**Animation behavior:** Beautiful morphing between flame-like structures.

---

### 2.5 Collatz Fractal

Based on the Collatz conjecture, extended to complex numbers:

```typescript
// Collatz iteration (smoothed version)
// Original: if even, n/2; if odd, 3n+1
// Complex extension: z = (1/4)(2 + 7z - (2 + 5z)cos(pi*z))
function collatzIteration(zr: number, zi: number): [number, number] {
  // cos(pi * z) = cos(pi*x)*cosh(pi*y) - i*sin(pi*x)*sinh(pi*y)
  const piR = Math.PI * zr;
  const piI = Math.PI * zi;

  const cosReal = Math.cos(piR) * Math.cosh(piI);
  const cosImag = -Math.sin(piR) * Math.sinh(piI);

  // (2 + 5z) * cos(pi*z)
  const term1R = 2 + 5 * zr;
  const term1I = 5 * zi;
  const prodR = term1R * cosReal - term1I * cosImag;
  const prodI = term1R * cosImag + term1I * cosReal;

  // (2 + 7z) - (2 + 5z)cos(pi*z)
  const diffR = 2 + 7 * zr - prodR;
  const diffI = 7 * zi - prodI;

  // Divide by 4
  return [diffR / 4, diffI / 4];
}
```

**Visual characteristics:**
- Extremely intricate detail at all scales
- Tendril-like structures
- Non-symmetric, chaotic appearance
- "Organic" yet alien aesthetic

**Challenges:**
- `cosh` and `sinh` can overflow for large imaginary parts
- Slower due to trigonometric functions
- Non-intuitive parameter space

**Recommended bounds:** [-5, 5] for both axes.

**Animation:** Interesting but unpredictable - small parameter changes can cause large visual shifts.

---

### 2.6 Lambda (Logistic Map) Fractal

Based on the logistic map `x_{n+1} = rx_n(1-x_n)`:

```typescript
// Lambda iteration: z = c * z * (1 - z)
function lambdaIteration(zr: number, zi: number, cr: number, ci: number): [number, number] {
  // z * (1 - z) = z - z^2
  const oneMinusZr = 1 - zr;
  const oneMinusZi = -zi;

  // z * (1-z)
  const prodR = zr * oneMinusZr - zi * oneMinusZi;
  const prodI = zr * oneMinusZi + zi * oneMinusZr;

  // c * (z * (1-z))
  const nr = cr * prodR - ci * prodI;
  const ni = cr * prodI + ci * prodR;

  return [nr, ni];
}
```

**Visual characteristics:**
- Related to Mandelbrot via coordinate transform
- Bulbs correspond to periodic behavior
- Interesting for studying bifurcations
- Less visually distinct than other families

**Recommended bounds:** Real: [-1, 4], Imaginary: [-2.5, 2.5].

**Music mapping potential:** The logistic map's period-doubling cascade maps naturally to harmonic relationships.

---

### 2.7 Spider Fractal (Mating)

A "mated" fractal combining features of two different Julia sets:

```typescript
// Spider iteration: track both z and c
// z = z^2 + c, then c = c/2 + z
function spiderIteration(
  zr: number, zi: number,
  cr: number, ci: number
): [number, number, number, number] {
  // Standard Julia step
  const nr = zr * zr - zi * zi + cr;
  const ni = 2 * zr * zi + ci;

  // Spider modification: c also evolves
  const ncr = cr / 2 + nr;
  const nci = ci / 2 + ni;

  return [nr, ni, ncr, nci];
}
```

**Visual characteristics:**
- Creates "web-like" or "net-like" patterns
- The c-parameter traces a spiral path
- Interesting self-similar structures
- Different from static Julia sets

**Implementation note:** Need to track c evolution, not just z.

---

### 2.8 Cactus Fractal

A variant using different absolute value application:

```typescript
// Cactus: z = |z|^2 + c (treating |z| as real magnitude)
// This differs from Burning Ship which uses |Re| and |Im| separately
function cactusIteration(zr: number, zi: number, cr: number, ci: number): [number, number] {
  const mag = Math.sqrt(zr * zr + zi * zi);
  const nr = mag * mag + cr;
  const ni = ci;
  return [nr, ni];
}
```

**Note:** This is quite simple and collapses to real-valued dynamics. A more interesting "Cactus" variant:

```typescript
// Alternative Cactus: z = Re(z^2) + |Im(z^2)|*i + c
function cactusVariant(zr: number, zi: number, cr: number, ci: number): [number, number] {
  const x2 = zr * zr, y2 = zi * zi;
  const nr = x2 - y2 + cr;
  const ni = Math.abs(2 * zr * zi) + ci;
  return [nr, ni];
}
```

---

### 2.9 Feather Fractal

A combination of absolute value and sign manipulation:

```typescript
// Feather: involves sin/cos for feather-like patterns
// z = z^2 / (1 + |z|) + c
function featherIteration(zr: number, zi: number, cr: number, ci: number): [number, number] {
  const mag = Math.sqrt(zr * zr + zi * zi);
  const denom = 1 + mag;

  // z^2
  const z2r = zr * zr - zi * zi;
  const z2i = 2 * zr * zi;

  // z^2 / (1 + |z|)
  const nr = z2r / denom + cr;
  const ni = z2i / denom + ci;

  return [nr, ni];
}
```

**Visual characteristics:**
- Softer edges due to magnitude dampening
- Feather-like radiating patterns
- Good for gentle, organic visuals

---

### 2.10 Nova Fractal

Newton's method with a relaxation parameter:

```typescript
// Nova: z = z - a * f(z)/f'(z) + c
// For f(z) = z^n - 1, with relaxation a and perturbation c
function novaIteration(
  zr: number, zi: number,
  cr: number, ci: number,
  ar: number, ai: number, // Relaxation parameter (often a = 1)
  n: number
): [number, number] {
  // Newton step for z^n - 1 = 0
  const [stepR, stepI] = newtonStep(zr, zi, n);

  // z - a * step + c
  const nr = zr - (ar * stepR - ai * stepI) + cr;
  const ni = zi - (ar * stepI + ai * stepR) + ci;

  return [nr, ni];
}

function newtonStep(zr: number, zi: number, n: number): [number, number] {
  // step = (z^n - 1) / (n * z^(n-1))
  const r2 = zr * zr + zi * zi;
  if (r2 < 1e-10) return [0, 0];

  const r = Math.sqrt(r2);
  const theta = Math.atan2(zi, zr);

  // z^n
  const rn = Math.pow(r, n);
  const znr = rn * Math.cos(n * theta) - 1; // z^n - 1
  const zni = rn * Math.sin(n * theta);

  // n * z^(n-1)
  const rn1 = Math.pow(r, n - 1);
  const zn1r = n * rn1 * Math.cos((n - 1) * theta);
  const zn1i = n * rn1 * Math.sin((n - 1) * theta);

  // Division
  const den = zn1r * zn1r + zn1i * zn1i;
  return [
    (znr * zn1r + zni * zn1i) / den,
    (zni * zn1r - znr * zn1i) / den
  ];
}
```

**Visual characteristics:**
- Combines Newton fractal structure with Julia-like boundary detail
- The c parameter creates Julia-like variations
- The a parameter controls convergence rate (a != 1 creates spiraling)
- Rich, layered structures

**Recommended:** Try a = 1 (standard), a = 0.5 (under-relaxed), or complex a for spirals.

---

### 2.11 Perpendicular Variants

Systematically applying `|x|` to different components:

```typescript
// PerpMandelbrot: z = (|Re(z)| + i*Im(z))^2 + c
function perpMandelbrot(zr: number, zi: number, cr: number, ci: number): [number, number] {
  const ax = Math.abs(zr);
  const nr = ax * ax - zi * zi + cr;
  const ni = 2 * ax * zi + ci;
  return [nr, ni];
}

// PerpBurningShip (implemented as type 8): z = (Re(z) + i*|Im(z)|)^2 + c
function perpBurningShip(zr: number, zi: number, cr: number, ci: number): [number, number] {
  const ay = Math.abs(zi);
  const nr = zr * zr - ay * ay + cr;
  const ni = 2 * zr * ay + ci;
  return [nr, ni];
}

// Heart: z = (|Re(z)| + i*|Im(z)|)^2 + c (same as Burning Ship)
// But starting from different initial conditions can give different results
```

---

### 2.12 Siegel Disk and Cremer Point Fractals

These aren't different iteration formulas but rather specific c-values that produce special Julia sets:

**Siegel Disk:** c-values where the critical point is on a neutral cycle with irrational rotation number. The Julia set contains a "Siegel disk" - an invariant region.

```typescript
// Golden ratio Siegel disk c-value
const GOLDEN_SIEGEL_C = {
  real: -0.390540870218399,
  imag: -0.586787907346969
};

// These produce Julia sets with smooth, circular regions
```

**Visual characteristics:**
- Smooth circular or quasi-circular regions
- Interesting mix of smooth and fractal
- Good for "calm" musical passages

---

### 2.13 Tetration Fractal

Exponential iteration (infinite tower of powers):

```typescript
// Tetration: z = c^z (or z = z^c, or z = z^z)
// Using z = c^z:
function tetrationIteration(zr: number, zi: number, cr: number, ci: number): [number, number] {
  // c^z = exp(z * ln(c))
  // ln(c) = ln|c| + i*arg(c)
  const lnMag = Math.log(Math.sqrt(cr * cr + ci * ci));
  const arg = Math.atan2(ci, cr);

  // z * ln(c)
  const prodR = zr * lnMag - zi * arg;
  const prodI = zr * arg + zi * lnMag;

  // exp(prod) = exp(prodR) * (cos(prodI) + i*sin(prodI))
  const expR = Math.exp(prodR);
  const nr = expR * Math.cos(prodI);
  const ni = expR * Math.sin(prodI);

  return [nr, ni];
}
```

**Visual characteristics:**
- Extremely intricate, almost chaotic
- Rapid escape for many starting points
- Shell-like spiral structures
- Challenging to render (numerical overflow)

**Challenges:** Very prone to overflow; requires careful bailout and precision handling.

---

### 2.14 Sine/Cosine Fractals

Trigonometric iterations:

```typescript
// Sine fractal: z = c * sin(z)
function sineIteration(zr: number, zi: number, cr: number, ci: number): [number, number] {
  // sin(z) = sin(x)cosh(y) + i*cos(x)sinh(y)
  const sinR = Math.sin(zr) * Math.cosh(zi);
  const sinI = Math.cos(zr) * Math.sinh(zi);

  // c * sin(z)
  const nr = cr * sinR - ci * sinI;
  const ni = cr * sinI + ci * sinR;

  return [nr, ni];
}

// Cosine fractal: z = c * cos(z)
function cosineIteration(zr: number, zi: number, cr: number, ci: number): [number, number] {
  // cos(z) = cos(x)cosh(y) - i*sin(x)sinh(y)
  const cosR = Math.cos(zr) * Math.cosh(zi);
  const cosI = -Math.sin(zr) * Math.sinh(zi);

  const nr = cr * cosR - ci * cosI;
  const ni = cr * cosI + ci * cosR;

  return [nr, ni];
}
```

**Visual characteristics:**
- Periodic structure along real axis
- Can produce "lattice-like" patterns
- Hyperbolic growth along imaginary axis
- Good for rhythmic/periodic musical features

**Overflow handling:** `sinh` and `cosh` grow exponentially; clamp input or use early bailout.

---

### 2.15 Barnsley Fractals

Michael Barnsley's iterated function systems (different from typical Julia sets):

```typescript
// Barnsley Type 1: different formula based on sign of Re(z)
function barnsleyType1(zr: number, zi: number, cr: number, ci: number): [number, number] {
  if (zr >= 0) {
    // (z - 1) * c
    const dr = zr - 1;
    return [dr * cr - zi * ci, dr * ci + zi * cr];
  } else {
    // (z + 1) * c
    const dr = zr + 1;
    return [dr * cr - zi * ci, dr * ci + zi * cr];
  }
}

// Barnsley Type 2
function barnsleyType2(zr: number, zi: number, cr: number, ci: number): [number, number] {
  if (zr * ci + zi * cr >= 0) {
    // (z - 1) * c
    const dr = zr - 1;
    return [dr * cr - zi * ci, dr * ci + zi * cr];
  } else {
    // (z + 1) * c
    const dr = zr + 1;
    return [dr * cr - zi * ci, dr * ci + zi * cr];
  }
}

// Barnsley Type 3
function barnsleyType3(zr: number, zi: number, cr: number, ci: number): [number, number] {
  if (zr > 0) {
    return [zr * zr - zi * zi - 1 + cr, 2 * zr * zi + ci];
  } else {
    return [zr * zr - zi * zi - 1 + cr * zr + cr, 2 * zr * zi + ci * zr + ci];
  }
}
```

**Visual characteristics:**
- Fern-like and tree-like structures
- Strong directional asymmetry
- Natural, organic appearance
- Good for "growth" or "organic" musical themes

---

## 3. Animation-Friendly Families

### 3.1 Ranking by Animation Quality

| Family | Smoothness | Interest | Predictability | Overall Animation Score |
|--------|------------|----------|----------------|------------------------|
| **Standard Julia** | Excellent | Good | High | 9/10 |
| **Celtic** | Excellent | High | High | 9/10 |
| **Tricorn** | Very Good | High | Medium | 8/10 |
| **Burning Ship** | Good | Very High | Medium | 8/10 |
| **Phoenix** | Good | High | Medium | 8/10 |
| **Buffalo** | Good | High | Medium | 7/10 |
| **Newton** | Very Good | Very High | High | 9/10 |
| **Magnet** | Good | Very High | Low | 7/10 |
| **Nova** | Very Good | Very High | Medium | 8/10 |
| **Multibrot** | Excellent | Medium | High | 8/10 |

### 3.2 Recommended Animation Paths

**For smooth, predictable motion:**
```typescript
// Circular orbit in c-plane
function circularPath(t: number, center: {r: number, i: number}, radius: number): {r: number, i: number} {
  return {
    r: center.r + radius * Math.cos(t * 2 * Math.PI),
    i: center.i + radius * Math.sin(t * 2 * Math.PI)
  };
}

// Lissajous path for more complex motion
function lissajousPath(t: number, center: {r: number, i: number},
                       amp: {r: number, i: number}, freq: {r: number, i: number}): {r: number, i: number} {
  return {
    r: center.r + amp.r * Math.sin(freq.r * t * 2 * Math.PI),
    i: center.i + amp.i * Math.sin(freq.i * t * 2 * Math.PI + Math.PI / 2)
  };
}
```

**For beat-synchronized motion (current approach):**
```typescript
// Orbit points per anchor - interpolate based on beat position
const orbitIndex = Math.floor(beatPhase * 4) % 4;
const orbitFrac = (beatPhase * 4) % 1;
const t = Math.sin(Math.PI * orbitFrac); // Smooth in-out
const c = {
  r: anchor.r + anchor.orbits[orbitIndex].dr * t,
  i: anchor.i + anchor.orbits[orbitIndex].di * t
};
```

### 3.3 Problematic Animation Behaviors

| Behavior | Cause | Mitigation |
|----------|-------|------------|
| **Sudden jumps** | Crossing set boundary | Stay in boundary region |
| **Flashing** | Interior/exterior flipping | Smooth escape interpolation |
| **Freezing** | Deep interior | Avoid c-values too far inside |
| **Blowup** | Near poles/singularities | Bailout checks, clamping |

---

## 4. Music-to-Fractal Mapping Ideas

### 4.1 Chord Quality to Fractal Family

| Chord Quality | Suggested Family | Rationale |
|---------------|------------------|-----------|
| **Major** | Standard Julia, Celtic | Clean, balanced, pleasant |
| **Minor** | Burning Ship, Tricorn | Angular, tense |
| **Dominant 7** | Phoenix, Buffalo | Complex, forward-moving |
| **Minor 7** | Nova | Smooth tension |
| **Diminished** | Collatz, Magnet | Unstable, intense |
| **Augmented** | Multibrot-3 | Three-fold symmetry = augmented triad |

### 4.2 Tension to Parameter

```typescript
// Map tension (0-1) to orbit radius and speed
function tensionToOrbit(tension: number, baseRadius: number): number {
  // Higher tension = larger, faster orbits
  return baseRadius * (1 + tension * 2);
}

// Map tension to iteration count (more = more detail = more tension)
function tensionToIterations(tension: number, baseIter: number, maxIter: number): number {
  return Math.floor(baseIter + tension * (maxIter - baseIter));
}

// Map tension to zoom (closer = more detail = more tension)
function tensionToZoom(tension: number, baseZoom: number): number {
  return baseZoom * Math.pow(2, tension * 3); // Up to 8x zoom at max tension
}
```

### 4.3 Melodic Contour to Path

```typescript
// Map melody pitch to c-plane position
function melodyToC(midiNote: number, root: number, scale: number[]): {r: number, i: number} {
  const octave = Math.floor((midiNote - root) / 12);
  const pc = (midiNote - root) % 12;

  // Pitch class determines angle (like note spiral)
  const angle = (pc / 12) * 2 * Math.PI - Math.PI / 2; // Root at top

  // Octave determines radius
  const radius = 0.3 + octave * 0.15;

  return {
    r: radius * Math.cos(angle),
    i: radius * Math.sin(angle)
  };
}
```

### 4.4 Rhythm to Fractal Type

```typescript
// Map rhythmic character to fractal type
function rhythmToFractalType(density: number, syncopation: number): number {
  if (syncopation > 0.6) {
    // High syncopation = angular, unexpected fractals
    return density > 0.5 ? 3 : 4; // Burning Ship or Tricorn
  } else if (density > 0.7) {
    // High density, low syncopation = complex but regular
    return 5; // Phoenix
  } else {
    // Low density, low syncopation = simple, clean
    return 0; // Standard Julia
  }
}
```

### 4.5 Mode to Color Palette

Current implementation already maps pitch class to palette. Additional mappings:

```typescript
// Major mode = brighter, more saturated
// Minor mode = darker, desaturated
function modeToColorAdjust(mode: 'major' | 'minor'): {brightness: number, saturation: number} {
  return mode === 'major'
    ? { brightness: 1.1, saturation: 1.0 }
    : { brightness: 0.9, saturation: 0.85 };
}
```

---

## 5. Implementation Considerations

### 5.1 Performance Characteristics

| Family | Ops/Iteration | Memory | GPU-Friendly | Est. Speed |
|--------|---------------|--------|--------------|------------|
| **Standard Julia** | ~10 | Minimal | Excellent | Fastest |
| **Multibrot (n=3)** | ~15 | Minimal | Excellent | Very Fast |
| **Burning Ship** | ~12 | Minimal | Excellent | Very Fast |
| **Celtic** | ~12 | Minimal | Excellent | Very Fast |
| **Phoenix** | ~15 | +2 prev values | Excellent | Fast |
| **Buffalo** | ~15 | Minimal | Excellent | Fast |
| **Newton** | ~30 | Minimal | Good | Moderate |
| **Magnet** | ~40 | Minimal | Good | Moderate |
| **Collatz** | ~50 | Minimal | Poor (trig) | Slow |
| **Sine/Cosine** | ~40 | Minimal | Poor (trig) | Slow |
| **Tetration** | ~60 | Minimal | Poor (exp/log) | Slowest |

### 5.2 Bailout Strategies

```typescript
// Standard escape bailout
const BAILOUT_STANDARD = 4.0;
function bailoutEscape(zr: number, zi: number): boolean {
  return zr * zr + zi * zi > BAILOUT_STANDARD;
}

// High bailout for better boundary smoothing
const BAILOUT_HIGH = 1000.0;

// Convergence bailout (for Newton, Magnet)
const CONVERGENCE_THRESHOLD = 0.0001;
function bailoutConvergence(zr: number, zi: number, targetR: number, targetI: number): boolean {
  return Math.sqrt((zr - targetR) ** 2 + (zi - targetI) ** 2) < CONVERGENCE_THRESHOLD;
}

// Overflow bailout (for trig functions)
const OVERFLOW_LIMIT = 50.0;
function bailoutOverflow(zi: number): boolean {
  return Math.abs(zi) > OVERFLOW_LIMIT; // sinh/cosh will overflow
}
```

### 5.3 Smooth Iteration Count

For all polynomial types:

```typescript
function smoothIteration(iteration: number, zr: number, zi: number, power: number = 2): number {
  if (iteration === maxIter) return maxIter;

  const logZn = Math.log(zr * zr + zi * zi) / 2;
  const nu = Math.log(logZn / Math.log(2)) / Math.log(power);

  return iteration + 1 - nu;
}
```

### 5.4 GPU (WebGL/WebGPU) Implementation

WebGL fragment shader template:

```glsl
precision highp float;

uniform vec2 u_c;           // Julia constant
uniform vec2 u_center;      // View center
uniform float u_zoom;       // Zoom level
uniform float u_rotation;   // View rotation
uniform int u_maxIter;      // Max iterations
uniform int u_fractalType;  // Type selector

varying vec2 v_texCoord;

vec2 complexMul(vec2 a, vec2 b) {
  return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

vec2 iterate(vec2 z, vec2 c, int type) {
  if (type == 0) {
    // Standard: z = z^2 + c
    return vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
  } else if (type == 3) {
    // Burning Ship: z = (|Re| + i|Im|)^2 + c
    vec2 az = abs(z);
    return vec2(az.x * az.x - az.y * az.y, 2.0 * az.x * az.y) + c;
  } else if (type == 4) {
    // Tricorn: z = conj(z)^2 + c
    return vec2(z.x * z.x - z.y * z.y, -2.0 * z.x * z.y) + c;
  }
  // ... add other types
  return vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
}

void main() {
  vec2 z = v_texCoord * u_zoom + u_center;

  // Apply rotation
  float cosR = cos(u_rotation);
  float sinR = sin(u_rotation);
  z = vec2(z.x * cosR - z.y * sinR, z.x * sinR + z.y * cosR);

  int iter = 0;
  for (int i = 0; i < 1000; i++) {
    if (i >= u_maxIter) break;
    z = iterate(z, u_c, u_fractalType);
    if (dot(z, z) > 4.0) break;
    iter++;
  }

  // Coloring (smooth)
  float smoothIter = float(iter);
  if (iter < u_maxIter) {
    float log_zn = log(dot(z, z)) / 2.0;
    smoothIter = float(iter) + 1.0 - log(log_zn / log(2.0)) / log(2.0);
  }

  // Map to color (use texture LUT for best results)
  float t = sqrt(smoothIter / float(u_maxIter));
  gl_FragColor = vec4(t, t * 0.5, t * 0.2, 1.0);
}
```

### 5.5 Color Palette Recommendations by Family

| Family | Palette Style | Rationale |
|--------|---------------|-----------|
| **Standard Julia** | Any | Versatile |
| **Burning Ship** | Fire colors (red/orange/yellow) | Matches "burning" theme |
| **Tricorn** | Cool colors (blue/purple) | Angular = cold |
| **Celtic** | Green/gold | Irish association |
| **Phoenix** | Rainbow gradient | Rebirth = full spectrum |
| **Newton** | Distinct hues per root | Functional coloring |
| **Magnet** | Magnetic field colors (purple/blue/cyan) | Physics association |

---

## 6. Recommended Additions for Fractured Jukebox

### 6.1 Priority Tier 1 (High Visual Impact, Easy Implementation)

1. **Newton (z^3 - 1)** - Different visual vocabulary, fast
2. **Nova** - Newton + Julia hybrid, very beautiful
3. **Sine** - Periodic structure for rhythmic mapping

### 6.2 Priority Tier 2 (Interesting, Moderate Effort)

4. **Magnet Type I** - Unique flame structures
5. **Multicorn-3** - 4-fold symmetry variant of Tricorn
6. **Barnsley** - Organic, growth-like patterns

### 6.3 Priority Tier 3 (Experimental)

7. **Collatz** - Very intricate but slow
8. **Tetration** - Challenging but visually unique
9. **Spider** - Evolving c-parameter is novel

### 6.4 Implementation Roadmap

```typescript
// Suggested type numbers for new fractals
const FRACTAL_TYPES = {
  STANDARD: 0,
  CUBIC: 1,
  QUARTIC: 2,
  BURNING_SHIP: 3,
  TRICORN: 4,
  PHOENIX: 5,
  CELTIC: 6,
  LAMBDA: 7,
  PERP_BURN: 8,
  BUFFALO: 9,
  // New types
  NEWTON_3: 10,     // Newton for z^3 - 1
  NEWTON_4: 11,     // Newton for z^4 - 1
  NOVA: 12,         // Nova fractal
  MAGNET_1: 13,     // Magnet Type I
  SINE: 14,         // Sine fractal
  COSINE: 15,       // Cosine fractal
  BARNSLEY_1: 16,   // Barnsley Type 1
  MULTICORN_3: 17,  // Multicorn-3
  COLLATZ: 18,      // Collatz (experimental)
};
```

---

## 7. References and Resources

### 7.1 Academic Papers

| Paper | Author(s) | Year | Contribution |
|-------|-----------|------|--------------|
| "The Beauty of Fractals" | Peitgen, Richter | 1986 | Foundational fractal imagery |
| "Chaos and Fractals" | Peitgen, Jurgens, Saupe | 1992 | Comprehensive textbook |
| "Computers and the Imagination" | Dewdney | 1988 | Recreational mathematics |
| "Fractal Geometry of Nature" | Mandelbrot | 1982 | Original fractal theory |

### 7.2 Software References

| Tool | URL | Notes |
|------|-----|-------|
| **Kalles Fraktaler** | https://mathr.co.uk/kf/kf.html | Ultra-deep zoom, perturbation theory |
| **XaoS** | https://xaos-project.github.io/ | Real-time zooming |
| **Mandelbulber** | https://mandelbulber.com/ | 3D fractals |
| **UltraFractal** | https://www.ultrafractal.com/ | Layer-based, professional |
| **Fractal eXtreme** | http://cygnus-software.com/gallery/fx/fx.htm | Windows classic |
| **Fractint** | https://fractint.org/ | DOS-era classic, formula archive |

### 7.3 Online Formula Collections

- **Fractint Parameter Database:** Thousands of formulas from Fractint era
- **Ultra Fractal Formula Database:** Modern formula collection
- **Paul Bourke's Fractal Collection:** http://paulbourke.net/fractals/
- **Fractal Forums Archive:** https://www.fractalforums.com/

### 7.4 Specific Fractal Documentation

| Fractal | Key Resource |
|---------|--------------|
| Burning Ship | "A Note on the Burning Ship" - https://mrob.com/pub/muency/burningship.html |
| Tricorn | https://mathworld.wolfram.com/Tricorn.html |
| Newton | https://en.wikipedia.org/wiki/Newton_fractal |
| Magnet | https://mrob.com/pub/muency/magnet.html |
| Collatz | "On the Existence of Collatz Fractals" - various arxiv papers |

---

## Appendix A: Quick Reference - All Iteration Formulas

```typescript
// Type 0: Standard Julia
z = z^2 + c

// Type 1: Cubic
z = z^3 + c

// Type 2: Quartic
z = z^4 + c

// Type 3: Burning Ship
z = (|Re(z)| + i*|Im(z)|)^2 + c

// Type 4: Tricorn
z = conj(z)^2 + c

// Type 5: Phoenix
z = z^2 + c + p*z_{n-1}

// Type 6: Celtic
z = |Re(z^2)| + i*Im(z^2) + c

// Type 7: Lambda
z = c*z*(1-z)

// Type 8: PerpBurn
z = (Re(z) + i*|Im(z)|)^2 + c

// Type 9: Buffalo
z = |z|^2 - |z| + c  // (using component-wise abs)

// Proposed Type 10: Newton-3
z = z - (z^3 - 1)/(3*z^2)

// Proposed Type 11: Nova
z = z - (z^n - 1)/(n*z^{n-1}) + c

// Proposed Type 12: Magnet I
z = ((z^2 + c - 1)/(2z + c - 2))^2

// Proposed Type 13: Sine
z = c * sin(z)

// Proposed Type 14: Collatz
z = (1/4)*(2 + 7z - (2 + 5z)*cos(pi*z))
```

---

## Appendix B: Boundary Point Finding Algorithm

For automatic anchor placement, find points on the boundary between set interior and exterior:

```typescript
function findBoundaryPoint(
  family: FractalFamily,
  bounds: {rMin: number, rMax: number, iMin: number, iMax: number},
  maxAttempts: number = 500
): {r: number, i: number} | null {
  const probeRadius = 0.03;
  const probeCount = 9;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const cr = bounds.rMin + Math.random() * (bounds.rMax - bounds.rMin);
    const ci = bounds.iMin + Math.random() * (bounds.iMax - bounds.iMin);

    // Probe nearby points
    const probes: [number, number][] = [
      [cr, ci],
      [cr + probeRadius, ci],
      [cr - probeRadius, ci],
      [cr, ci + probeRadius],
      [cr, ci - probeRadius],
      [cr + probeRadius * 0.7, ci + probeRadius * 0.7],
      [cr - probeRadius * 0.7, ci + probeRadius * 0.7],
      [cr + probeRadius * 0.7, ci - probeRadius * 0.7],
      [cr - probeRadius * 0.7, ci - probeRadius * 0.7],
    ];

    let interior = 0, exterior = 0, escapeSum = 0;
    for (const [pr, pi] of probes) {
      const esc = family.locus(pr, pi, 150);
      if (esc === 0) interior++;
      else { exterior++; escapeSum += esc; }
    }

    // Want mix of interior and exterior
    if (interior > 0 && exterior > 0) {
      const mixScore = Math.min(interior, exterior) / probeCount;
      // Prefer slight exterior bias for better visuals
      if (mixScore > 0.2 && exterior >= interior) {
        return { r: cr, i: ci };
      }
    }
  }

  return null; // Fallback
}
```

---

*This document is part of the Fractured Jukebox research collection. For implementation details, see `src/fractal-worker.ts` and `src/fractal-config.ts`.*
