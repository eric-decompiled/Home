# Project Overview: RLC Resonator Explorer

This document provides a technical overview of the RLC Resonator Explorer, a single-page web application for real-time audio synthesis and visualization of RLC circuits.

## Development Workflow

### Build & Run
- **`npm run dev`**: Starts the Vite development server with hot-reloading.
- **`npm run build`**: Performs a TypeScript check and creates a production build.
- **`npm run preview`**: Serves the production build for local preview.

## Technical Architecture

### Core Stack
- **Framework**: None (Vanilla TypeScript)
- **Build Tool**: Vite

### Application Design (`src/main.ts`)
The application is a monolithic single-file design with module-level state management. It leverages the Web Audio API and direct DOM manipulation for an event-driven UI.

### Audio Processing Pipeline
The Web Audio API graph is structured as follows:
`Source` -> `Mixer` -> `Gain` -> `Input Analyser` -> `Filter` -> `Output Analyser` -> `Destination`

- **Dual Analysers**: Used to compare input and output waveforms.
- **Additive Synthesis**: The audio source is generated using a fundamental frequency plus up to 16 harmonics with a 1/n amplitude falloff.
- **Resonator Simulation**: A `BiquadFilterNode` simulates the resonator, configured as a bandpass filter for series RLC circuits and a notch filter for parallel RLC circuits.

### Key Calculations
- **Component Values**: Inductance (L) is fixed at 10mH. Capacitance (C) is derived from the resonant frequency (f₀), and Resistance (R) is derived from the Q factor.
- **Musical Tuning**: Frequencies can be quantized to the 12-tone equal temperament scale (A4 = 432Hz by default).

### Visualization
- **Canvas Rendering**: All visualizations are rendered on HTML5 canvas.
- **Waveform Display**: A trigger-based system stabilizes the waveform by finding a zero-crossing for a phase-locked display.
- **Laplace Domain Analysis**:
    - **Pole-Zero Plot**: A 2D s-plane plot showing complex conjugate poles (X) and zeros (O).
    - **3D Transfer Function**: A 3D wireframe surface representing the magnitude of the transfer function |H(s)| over the s-plane. Expensive 3D computations are debounced by 150ms.

### State & UI
- **State Management**: Global variables manage audio nodes, parameters, and canvas contexts.
- **UI Updates**: Parameter changes trigger a rebuild of the audio graph (stop/start). A formula box uses incremental DOM updates to prevent UI jank from slider movements.
- **Logarithmic Scaling**: Sliders for frequency (20-2000Hz input, 20-10000Hz resonant) and Q factor (0.1-100) use logarithmic scaling for better user control.

## Coding Conventions

- **Memory Management**: Audio nodes are explicitly disconnected before reassignment to prevent memory leaks.
- **Rendering**: `requestAnimationFrame` is used for smooth canvas animations.
- **Formatting**: Component values are auto-formatted to appropriate SI units (e.g., mH, µF, kΩ).
- **Linting**: The project uses TypeScript's strict mode with `noUnusedLocals` and `noUnusedParameters`. Unused function parameters are prefixed with an underscore (e.g., `_height`).
- **Musical Conversions**: Helper functions like `freqToMidi()` and `midiToFreq()` are used for conversions between MIDI note numbers and frequencies.

## Core Functions

- **`startAudio()` / `stopAudio()`**: Manage the audio graph lifecycle.
- **`drawWaveform()`**: Renders the time-domain signal.
- **`drawPoleZeroPlot()`**: Renders the 2D s-plane visualization.
- **`drawSPlane3D()`**: Renders the 3D wireframe of the transfer function.
- **`scheduleSPlane3DRender()`**: A debounced wrapper for the 3D rendering function.
- **`snapToMusicalNote()`**: Quantizes a frequency to the nearest musical note.
- **`sliderToFrequency()` / `frequencyToSlider()`**: Convert between linear slider values and logarithmic frequencies.
- **`calculateComponentValues()`**: Derives R, L, and C from the resonant frequency and Q factor.

## Default Settings

- **Oscillator**: A2 (108 Hz) with 8 overtones.
- **Resonator**: A3 (216 Hz), tuned to the 2nd harmonic.
- **Q Factor**: 30 (resulting in an underdamped, narrow bandwidth response).
- **Musical Mode**: Enabled by default.
- **Circuit Type**: Series RLC (bandpass).