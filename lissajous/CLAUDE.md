# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An interactive web application that visualizes Lissajous curves and their relationship to musical intervals using just intonation. The application allows users to explore how frequency ratios create both visual patterns and harmonic sounds.

## Core Concepts

**Lissajous Curves**: Parametric curves formed by combining two perpendicular harmonic oscillations (x = A·sin(aω + δ), y = B·sin(bω)). The frequency ratio a:b determines the curve shape.

**Just Intonation**: Musical intervals represented as simple frequency ratios (e.g., Perfect Fifth = 3:2, Major Third = 5:4). Simple ratios create elegant patterns; complex ratios form intricate patterns.

**Audio Synthesis**: Uses Web Audio API to generate two-tone sine wave intervals based on the frequency ratios, with ADSR envelope for smooth playback.

## Development Commands

- `npm run dev` - Start Vite development server (default: http://localhost:5173)
- `npm run build` - Type-check with TypeScript and build for production
- `npm run preview` - Preview production build locally
- `npm run generate-favicon` - Generate favicon.png from Lissajous curve (3:2 ratio)

## Architecture

### Single-Page Application Structure

The entire application is built in `src/main.ts` as a self-contained interactive visualization:

**UI Components (inline HTML)**: Left sidebar (info + preset buttons), center canvas (800x600), right sidebar (controls)

**Animation System**: requestAnimationFrame loop that:
- Updates phase sweep if enabled
- Clears canvas and redraws static Lissajous curve trail (1000 points)
- Draws animated point moving along the curve
- Increments time parameter

**Audio System**: Web Audio API implementation with:
- Two oscillators for harmonic interval playback
- ADSR envelope (Attack 0.1s, Decay 0.2s, Sustain 0.15, Release 0.3s)
- Base frequency of C3 (130.81 Hz) multiplied by frequency ratios

**Preset System**: 13 chromatic intervals from unison (1:1) to octave (2:1), each button sets freqX, freqY, phase, and resets animation time

### Key Parameters

- `freqX`, `freqY`: Frequency multipliers for x and y axes (range 1-10)
- `phase`: Phase shift for x-axis oscillation (0 to 2π)
- `speed`: Animation speed for moving point
- `sweepSpeed`: Rate of phase change when auto-sweep enabled
- `phaseSweepEnabled`: Toggles automatic phase sweeping

### Canvas Rendering

- Background: #1a1a2e (dark blue)
- Curve trail: #0f3460 (medium blue), 2px line width
- Moving point: #16c79a (teal) with glow effect (shadowBlur: 15)
- Center: (400, 300), Amplitude: 200px

## TypeScript Configuration

Strict mode enabled with additional checks:
- `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- Target: ES2020, Module: ESNext, bundler resolution
- Web APIs available: DOM, AudioContext, Canvas

## File Organization

- `src/main.ts` - Main application logic (UI, canvas animation, audio synthesis)
- `src/style.css` - Complete styling (dark theme, sidebar layout, controls)
- `src/counter.ts` - Unused Vite template file (can be removed)
- `scripts/generate-favicon.js` - Node.js script using canvas library to generate favicon
- `public/favicon.png` - Generated 64x64 PNG of 3:2 Lissajous curve

## Working with Audio

When modifying audio synthesis:
- AudioContext must be initialized on user interaction (playButton click)
- Frequencies calculated as: baseFreq × freqY (lower), baseFreq × freqX (higher)
- Always use gain nodes for volume control and envelope shaping
- Oscillators must be stopped after duration to prevent memory leaks
- Button state should be disabled during playback (2.5s duration)

## Working with Canvas Animation

When modifying visualization:
- Always use requestAnimationFrame for smooth 60fps animation
- Trail is drawn fresh each frame (no persistence needed)
- Point position calculated using current time parameter `t`
- Phase sweep modifies `phase` directly and updates slider value
- Reset `t = 0` when changing presets for consistent animation start
