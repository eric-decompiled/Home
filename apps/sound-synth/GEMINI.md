# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An interactive harmonics explorer for understanding the nature of sound and timbre through real-time manipulation of overtones. This application uses additive synthesis with ADSR envelopes, delay effects, a step sequencer, and custom instrument creation to let users explore how different combinations of harmonics create the characteristic sounds of various instruments.

**Key Learning Goal**: Understand that different instruments have different harmonic profiles and temporal characteristics - guitars have fast attacks and quick decay, flutes have gentle attacks and sustained tones, and different harmonic mixtures create unique timbres. Users can compose melodies and create their own custom instruments.

## Development Commands

- `npm run dev` - Start Vite development server (default: http://localhost:5173)
- `npm run build` - Type-check with TypeScript and build for production
- `npm run preview` - Preview production build locally

## Core Architecture

### Additive Synthesis System

**Audio Graph Structure**:
```
12 OscillatorNodes (sine waves)
  → 12 individual GainNodes (harmonic amplitudes)
  → Master GainNode (ADSR envelope control, fixed at 0.25 volume)
  → Delay effect chain (delayNode → delayFeedback → delayWet)
  → Dry/Wet mix (delayDry + delayWet)
  → AudioContext.destination
```

**Key Implementation Details**:
- All 12 oscillators run continuously once started (started on first piano key press)
- Harmonic N plays at N × fundamental frequency
- Individual gain nodes allow independent amplitude control for each harmonic
- Exponential ramps (50ms) used for smooth amplitude transitions
- Master gain controlled by ADSR envelope for realistic instrument behavior
- Delay effect provides spatial depth and rhythmic echoes

### State Management

Global state tracked in main.ts:
- `harmonicAmplitudes`: Array of 12 amplitude values (0-1)
- ADSR envelope parameters: `attackTime`, `decayTime`, `sustainLevel`, `releaseTime`
- Delay effect parameters: `delayTime`, `delayFeedbackAmount`, `delayMix`
- `activeKeys`: Set tracking which piano keys are currently pressed
- `octaveShift`: Integer from -2 to +2 for keyboard octave transposition
- `sequencerGrid`: 2D boolean array (12 notes × 16 steps) for composition
- `customInstruments`: Array of user-created instruments (persisted to localStorage)

### UI Layout

**Main Controls Section**:
- 6 preset buttons (Guitar, String, Clarinet, Flute, Pure Sine, Sawtooth)
- Custom instrument buttons (purple, dynamically added)
- Selected preset highlighted in green
- ADSR envelope controls (Attack, Decay, Sustain, Release) styled in red
- Delay effect controls (Time, Feedback, Mix) styled in cyan

**Harmonic Equalizer Section**:
- "+ Create Instrument" button in header (red, saves current settings)
- 12 vertical sliders for individual harmonic amplitudes
- Color-coded: odd harmonics (red), even harmonics (cyan)
- Compact height (300px container, 250px sliders)

**Piano Keyboard Section**:
- 2-octave keyboard (C3 to C5) with 25 keys
- Octave shift buttons (±2 octaves = 5 total octaves)
- Visual feedback when keys are pressed
- Mouse drag, touch, and computer keyboard support

**Composition Sequencer Section** (below keyboard):
- 16-step × 12-note grid sequencer
- Click cells to toggle notes on/off
- Play/Stop and Clear buttons
- Pre-populated with preset melodies when instrument is selected
- Loops at 120 BPM (16th notes)
- Current step highlighted in red during playback

## Key Features

### ADSR Envelope System

Controls master gain to create realistic instrument attack and decay:
- **Attack**: Time to reach peak (1-2000ms)
- **Decay**: Time to fall to sustain (1-2000ms)
- **Sustain**: Level held while playing (0-100%)
- **Release**: Fade-out time (1-3000ms)

Implementation (main.ts:162-199):
- `triggerEnvelope()`: Called on key press, ramps 0 → peak → sustain
- `releaseEnvelope()`: Called on key release, fades to silence
- Uses exponential ramps for natural sound

### Delay Effect System

Adds spatial depth and rhythmic echoes:
- **Delay Time**: 10ms to 2000ms (default: 10ms for chorus)
- **Feedback**: 0-90% (controls repeats, capped to prevent runaway)
- **Mix**: 0-100% wet/dry balance

Audio routing: Master gain splits to dry path and delay feedback loop

### Melody Preview System

When selecting presets, plays a short melody showcasing that instrument:
- Each preset has unique melody (defined in `melodies` object)
- Automatically plays after 100ms delay when preset is selected
- Previous melodies cancelled if switching quickly
- Uses `playMelody()` function with note sequence array

### Step Sequencer

16-step grid-based composition tool (main.ts:198-295):
- **Grid**: 12 notes (one octave) × 16 steps
- **Pre-population**: `loadPresetIntoSequencer()` loads preset melody into grid
- **Playback**: `playSequencer()` loops through steps at 120 BPM
- **Interaction**: Click cells to toggle notes
- **Visual feedback**: Green = active note, red border = current step
- Notes are spaced out (every 2 steps) when loading presets

### Custom Instrument Creation

Users can save and recall custom instruments (main.ts:309-410):

**Creation**:
- Click "+ Create Instrument" button (red, in equalizer header)
- Prompts for name
- Captures current harmonics + ADSR settings
- Saves to localStorage
- Adds purple button to presets

**Storage Format**:
```typescript
interface CustomInstrument {
  name: string
  harmonics: number[]  // 12 values
  attack: number
  decay: number
  sustain: number
  release: number
}
```

**Functions**:
- `saveCustomInstrument(name)`: Creates and stores instrument
- `applyCustomInstrument(instrument)`: Loads harmonics + ADSR
- `deleteCustomInstrument(index)`: Removes from storage
- `loadCustomInstrumentsFromStorage()`: Loads on app startup
- Custom presets have delete button (×) in top-right corner

**Persistence**: localStorage key = 'customInstruments', JSON array

## Preset Configurations

Each preset sets harmonics + ADSR:

**Guitar** (default):
- Attack: 10ms, Decay: 300ms, Sustain: 30%, Release: 400ms
- Harmonics: 0.8 / (n^1.1)
- Melody: C-D-E-G-E-C (quick ascending scale)

**Clarinet**:
- Attack: 80ms, Decay: 150ms, Sustain: 75%, Release: 200ms
- Odd harmonics: 0.8/n, Even harmonics: 0.05/n
- Melody: C-E-G-A (smooth arpeggio)

**Flute**:
- Attack: 200ms, Decay: 100ms, Sustain: 80%, Release: 250ms
- Even harmonics: 0.7/n, Odd harmonics: 0.2/n
- Melody: E-G-A-G (gentle ascending phrase)

**String**:
- Attack: 50ms, Decay: 200ms, Sustain: 70%, Release: 300ms
- Harmonics: 0.8 / (n^1.2)
- Melody: C-E-G-C5 (arpeggio to high C)

**Sawtooth**:
- Attack: 20ms, Decay: 50ms, Sustain: 90%, Release: 150ms
- All harmonics: 1.0/n
- Melody: C-D-E-F-G (fast scale)

**Pure Sine**:
- Attack: 50ms, Decay: 50ms, Sustain: 100%, Release: 100ms
- Only fundamental (H1 = 1.0)
- Melody: C-G-C (simple interval)

## Piano Keyboard System

**Note Triggering** (main.ts:67-120):
- `playNote(noteIndex)`: Initializes audio, applies octave shift, triggers ADSR
- `stopNote(noteIndex)`: Releases envelope when all keys released
- Octave shift: frequency multiplier = 2^octaveShift

**Mouse Drag Support**:
- Global `isMouseDown` flag tracks mouse state
- `mouseenter` triggers notes if mouse is down
- Enables glissandos by dragging across keys

## Working with Web Audio

### Key Patterns

**Initializing Audio** (main.ts:121-174):
- AudioContext created on first piano key press
- Delay effect chain created during initialization
- Harmonic gains initialized from `harmonicAmplitudes` array

**Smooth Parameter Updates** (main.ts:145-160):
- Use `exponentialRampToValueAtTime()` for amplitude changes
- Cancel scheduled values before applying new ramp
- Special case: amplitude 0 → 0.001 (exponential ramp needs positive target)

**Frequency Updates** (main.ts:176-180):
- Use `setValueAtTime()` for instant frequency changes
- Formula: `frequency[n] = fundamentalFreq × (n + 1)`

### Common Modifications

**Adding New Presets**:
1. Add preset function to `applyPreset()` (main.ts:200-285)
2. Set harmonic amplitudes using `setHarmonicAmplitude()`
3. Set ADSR parameters
4. Call `updateEnvelopeSliders()`
5. Add melody to `melodies` object
6. Add button to HTML template in `buildUI()`
7. Add to `presetButtons` object and event listener
8. Update TypeScript union type for preset names

**Adding Sequencer Features**:
- Change `SEQUENCER_STEPS` or `SEQUENCER_NOTES` constants
- Modify `sequencerBPM` for tempo changes
- Update `playSequencer()` step duration calculation

**Custom Instrument Management**:
- Custom instruments stored in localStorage
- Delete confirmation via browser `confirm()` dialog
- Purple gradient styling distinguishes from built-in presets

## File Organization

- `src/main.ts` - Complete application (~1040 lines)
- `src/style.css` - Full styling with responsive design (~900 lines)
- `index.html` - Minimal HTML shell, content generated in main.ts

## Educational Notes

**Harmonic Series**: Integer multiples of fundamental creating single perceived pitch

**Timbre**: Determined by relative amplitudes of harmonics

**ADSR Envelope**: Amplitude over time - as important as harmonic content for realistic synthesis

**Delay Effect**:
- Short delays (10-30ms): Chorus/doubling
- Medium (100-300ms): Slapback echo
- Long (500ms+): Rhythmic repeats

**Step Sequencer**: Grid-based composition tool common in electronic music production

**1/n Amplitude Decay**: Natural physical systems produce harmonics with amplitudes inversely proportional to harmonic number
