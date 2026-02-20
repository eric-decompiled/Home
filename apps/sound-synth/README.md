# Harmonics Explorer

An interactive web application for exploring sound synthesis through harmonics manipulation. Built with TypeScript and Web Audio API.

## Quick Start

```bash
npm install
npm run dev      # Start dev server at http://localhost:5173
npm run build    # Build for production
```

## Architecture Overview

### Audio Signal Flow

```
OscillatorNodes (12 sine waves, harmonics 1-12)
  → Individual GainNodes (per-harmonic amplitude control)
  → Master GainNode (ADSR envelope)
  → Delay Effect Chain (feedback loop)
  → Dry/Wet Mix
  → AudioContext.destination (speakers)
```

### Key Files

- `src/main.ts` - Complete application logic (~950 lines)
- `src/style.css` - Styling with responsive design
- `index.html` - Minimal shell, UI built dynamically
- `CLAUDE.md` - Detailed technical documentation

## Core Concepts

### Additive Synthesis
Sound is created by summing 12 sine waves at harmonic frequencies (fundamental × 1, 2, 3...12). Each harmonic has independent amplitude control.

### ADSR Envelope
Controls amplitude over time:
- **Attack**: Time to reach peak (1-2000ms)
- **Decay**: Time to fall to sustain level (1-2000ms)
- **Sustain**: Held level while playing (0-100%)
- **Release**: Fade-out time after key release (1-3000ms)

### Preset System
Instrument presets are defined as data in `presetConfigs`:

```typescript
const presetConfigs: Record<PresetName, {
  adsr: [attack, decay, sustain, release],
  harmonicFn: (harmonicIndex: number) => amplitude
}> = {
  guitar: {
    adsr: [10, 300, 0.3, 400],
    harmonicFn: i => 0.8 / Math.pow(i + 1, 1.1)
  },
  // ...
}
```

To add a new preset:
1. Add entry to `presetConfigs` object
2. Add to `PresetName` type union
3. Add button in `buildUI()` HTML template
4. Button ID must match pattern: `preset-{name}`

### Melody System
Melodies are arrays of note events:

```typescript
const presetMelodies = {
  myMelody: [
    { noteIndex: 24, duration: 400 }, // C4, 400ms
    { noteIndex: 26, duration: 400 }, // D4, 400ms
    // Note indices: C2=0, C3=12, C4=24, C5=36
  ]
}
```

To add a new melody:
1. Add entry to `presetMelodies` object
2. Add to `MelodyName` type union
3. Add to `melodyIdMap` with kebab-case ID
4. Add button in HTML with ID: `melody-{kebab-case-id}`

## Common Tasks

### Adding a New Instrument Preset

```typescript
// 1. Add to presetConfigs
sawtooth: {
  adsr: [20, 50, 0.9, 150],
  harmonicFn: i => 1.0 / (i + 1) // Classic sawtooth formula
}

// 2. Add to PresetName type
type PresetName = '...' | 'sawtooth'

// 3. Add button in buildUI()
<button id="preset-sawtooth">Sawtooth</button>
```

### Adding a New Melody

```typescript
// 1. Add melody data
happyBirthday: [
  { noteIndex: 24, duration: 300 }, // C4
  { noteIndex: 24, duration: 300 }, // C4
  // ...
]

// 2. Add to MelodyName type
type MelodyName = '...' | 'happyBirthday'

// 3. Add to melodyIdMap
happyBirthday: 'happy-birthday'

// 4. Add button
<button id="melody-happy-birthday" class="melody-btn">Happy Birthday</button>
```

### Modifying Audio Parameters

Key audio constants in `main.ts`:
- `NUM_HARMONICS = 12` - Number of overtones
- `PEAK_LEVEL = 0.25` - Master volume (prevents clipping)
- Delay max time: 2 seconds (set in `initAudio()`)

### Understanding Note Indices

Piano keyboard spans C2 to C5 (37 keys):
```
C2=0,  C#2=1,  D2=2  ... B2=11
C3=12, C#3=13, D3=14 ... B3=23
C4=24, C#4=25, D4=26 ... B4=35
C5=36
```

Computer keyboard maps to C3-C5 (middle range):
- Home row (A-J): C3 to B3
- Upper keys (K-V): C4 to C5
- Top row (W,E,T,Y,U,O,P): Black keys

## State Management

Global state lives in module scope:
- Audio nodes: `audioContext`, `masterGain`, `harmonicOscillators[]`, etc.
- Audio params: `attackTime`, `decayTime`, `harmonicAmplitudes[]`, etc.
- UI state: `activeKeys`, `octaveShift`, `isMelodyPlaying`, etc.

Audio context is lazily initialized on first user interaction (browser requirement).

## Custom Instruments

Users can save/load custom instruments via localStorage:
- Key: `customInstruments`
- Format: JSON array of `CustomInstrument` objects
- Includes harmonics array + ADSR parameters

## Performance Notes

- All 12 oscillators run continuously (started once, never stopped)
- Frequency changes use `setValueAtTime()` for instant updates
- Amplitude changes use `exponentialRampToValueAtTime()` for smoothness
- Exponential ramps need positive values (use 0.001 instead of 0)

## Future Enhancement Ideas

- [ ] Waveform visualizer (oscilloscope/spectrum analyzer)
- [ ] MIDI input support
- [ ] Export audio recordings
- [ ] More effect types (reverb, chorus, filter)
- [ ] Polyphonic playback (multiple notes simultaneously)
- [ ] Custom melody editor

## Troubleshooting

**No sound?**
- Check browser permissions for audio
- Click/tap keyboard first (audio context needs user gesture)

**Clicking/popping sounds?**
- Increase attack time to avoid instant amplitude jumps
- Check sustain level isn't 0%

**Performance issues?**
- Reduce delay feedback to prevent buildup
- Check for memory leaks in melody timeouts
