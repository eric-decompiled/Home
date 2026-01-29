# Fractal Explorer

Interactive fractal generator with pixel fidelity control and animation.

## Architecture

Single-file app (`src/main.ts`) with no framework — vanilla TypeScript + Vite, matching sibling projects (lissajous, resonator, sound-synth). All HTML is injected via `innerHTML` on `#app`. All styling in `src/style.css`.

## Fractal Families

Six fractals, each with its own iteration logic in `iteratePixel()`:

- **Mandelbrot** — z² + c, no extra params
- **Julia Set** — same iteration as Mandelbrot but z=pixel, c=fixed (from sliders). Only family that uses `juliaReal`/`juliaImag` state. Has orbit sweep animation.
- **Burning Ship** — |Re(z)|,|Im(z)| taken before raising to power d. Has power slider (shared with Multibrot). Fast path for d=2, polar form for d≠2.
- **Tricorn** — conjugate(z)² + c, no extra params
- **Multibrot** — z^d + c via polar coordinates. Shares power slider/animation with Burning Ship.
- **Phoenix** — z² + cx + p·z_prev, feedback from previous iteration. Has distortion slider (p).

## Key Design Decisions

- **Offscreen canvas rendering**: Fractal renders to an offscreen canvas at `displaySize * fidelity`, then draws to display canvas. `imageSmoothingEnabled` controls bilinear vs nearest-neighbor upscale.
- **Precomputed color LUT**: 2048-entry lookup table rebuilt on palette change. Smooth coloring via normalized iteration count (`iteration + 1 - log(log(|z|))/log(2)`).
- **Dirty flag rendering**: Only re-renders when `dirty = true`. Every parameter change sets dirty. Animation loop runs via `requestAnimationFrame` but skips render if clean.
- **Power slider shared**: Burning Ship and Multibrot both use the `power` variable and `power-controls` div. Switching families resets power to `defaultPower` from the family definition.

## Animation System

Three independent animation channels, each with speed + amplitude/radius controls:
1. **Julia orbit sweep** — c traces a circle in the complex plane
2. **Power sweep** — sinusoidal oscillation of power d (Burning Ship, Multibrot)
3. **Phoenix sweep** — sinusoidal oscillation of distortion p

`stopAllAnimations()` resets all three — called on family switch and reset.

## Coloring

Five palettes (Ocean, Fire, Neon, Mono, Emerald). Points inside the set render black. Escaped points use smooth coloring mapped through the LUT. The Emerald palette uses the site accent color (#16c79a).
