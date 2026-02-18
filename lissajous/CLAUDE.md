# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An interactive web application that visualizes Lissajous curves and their relationship to musical intervals using just intonation. The application allows users to explore how frequency ratios create both visual patterns and harmonic sounds.

## Core Concepts

**Lissajous Curves**: Parametric curves formed by combining two perpendicular harmonic oscillations (x = A·sin(aω + δ), y = B·sin(bω)). The frequency ratio a:b determines the curve shape.

**Just Intonation**: Musical intervals represented as simple frequency ratios (e.g., Perfect Fifth = 3:2, Major Third = 5:4). Simple ratios create elegant patterns; complex ratios form intricate patterns.

**Audio Synthesis**: Uses Web Audio API with multiple instrument types (Synth, E. Piano, Pad, Bell) to play interval sounds.

## Development Commands

- `npm run dev` - Start Vite development server (default: http://localhost:5173)
- `npm run build` - Type-check with TypeScript and build for production
- `npm run preview` - Preview production build locally
- `npm run generate-favicon` - Generate favicon.png from Lissajous curve (3:2 ratio)

## Architecture

### Single-Page Application Structure

The entire application is built in `src/main.ts` as a self-contained interactive visualization:

**UI Components (inline HTML)**: Left sidebar (info + preset buttons), center canvas (responsive), right sidebar (controls)

**Animation System**: requestAnimationFrame loop that:
- Updates phase sweep if enabled
- Draws Lissajous curve with optional glow effect
- Draws animated point with optional glow trail
- Applies optional feedback effect (zoom/rotate echo)

**Audio System**: Web Audio API with four instrument types:
- Synth (default): Detuned sawtooth oscillators for warm, chorused sound
- E. Piano: Rhodes-style with bell/tine attack character
- Pad: Triangle waves with sub-octave for gentle sustained sound
- Bell: Vibraphone-style with inharmonic partials

**Preset System**: 13 chromatic intervals from unison (1:1) to octave (2:1). Selecting a preset auto-plays the interval sound.

### Key Parameters

- `freqX`, `freqY`: Frequency multipliers for x and y axes (range 1-32)
- `phase`: Phase shift for x-axis oscillation (0 to 2π)
- `speed`: Animation speed for moving point (logarithmic scale)
- `sweepSpeed`: Rate of phase change when auto-sweep enabled
- `phaseSweepEnabled`: Toggles automatic phase sweeping
- `trailEnabled`, `curveGlowEnabled`, `feedbackEnabled`: Visual effect toggles

### Keyboard Shortcuts

- **Spacebar**: Play current interval (respects playing state)
- **Escape**: Close info modal

### Canvas Rendering

- Colors from CSS variables for theme support (dark/light mode)
- Responsive sizing based on viewport
- Optional feedback effect with zoom, rotation, and decay

## TypeScript Configuration

Strict mode enabled with additional checks:
- `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- Target: ES2020, Module: ESNext, bundler resolution
- Web APIs available: DOM, AudioContext, Canvas

## File Organization

- `src/main.ts` - Main application logic (UI, canvas animation, audio synthesis)
- `src/style.css` - Complete styling (dark/light themes, sidebar layout, controls)
- `scripts/generate-favicon.js` - Node.js script using canvas library to generate favicon
- `public/favicon.png` - Generated 64x64 PNG of 3:2 Lissajous curve

## Working with Audio

When modifying audio synthesis:
- AudioContext must be initialized on user interaction
- iOS requires `audio.resume()` called synchronously in gesture handler
- Frequencies calculated as: baseFreq × freqY (lower), baseFreq × freqX (higher)
- High frequencies (>1200 Hz) are automatically brought down an octave
- Button disabled and shows "Playing" state during playback (~3.2s total)
- Each instrument type has its own synthesis function with unique envelope/harmonics

## Working with Canvas Animation

When modifying visualization:
- Always use requestAnimationFrame for smooth 60fps animation
- Use CSS variables via `getCSSVar()` for theme-aware colors
- Feedback effect uses separate offscreen canvases for compositing
- Point position calculated using current time parameter `t`
- Phase sweep modifies `phase` directly and updates slider value
- Reset `t = 0` when changing presets for consistent animation start
