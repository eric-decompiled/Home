# Karplus-Strong String Synthesis Explorer

An interactive web application for exploring the Karplus-Strong algorithm and feedback comb filters. Demonstrates how delays and feedback transform noise into pitched, string-like tones through physical modeling.

## What This Does

This app transforms random noise (or other waveforms) into realistic plucked string sounds using a feedback comb filter. It's both a learning tool for understanding how delay-based synthesis works and a practical demonstration of the Karplus-Strong algorithm, which revolutionized digital string synthesis in the 1980s.

Key insight: When noise is fed through a delay line with feedback, only frequencies that "fit" the delay time (where whole cycles align) constructively interfere and build up into resonant peaks. This creates pitched tones from unpitched noise, mimicking how real strings vibrate.

## Controls

### Filter Parameters

**Delay (0-1000 samples)**
- Sets the delay line length, which determines pitch
- Fundamental frequency = sample_rate ÷ delay_samples
- At 48kHz: 218 samples ≈ 220Hz (A3), 100 samples ≈ 480Hz
- Default: 218 samples (220Hz, a low guitar string)
- Display shows samples, milliseconds, and fundamental frequency in Hz

**Feedback (0.0-0.999)**
- Controls how much delayed signal feeds back into the loop
- Higher feedback = stronger resonance and longer sustain
- Must be < 1.0 for stability
- Default: 0.995 (very high feedback for long string-like sustain)
- Creates the characteristic "comb" frequency response with evenly-spaced peaks

**Lowpass Filter**
- Toggleable first-order IIR lowpass in the feedback path
- Cutoff frequency: 500Hz - 10kHz (default: 5kHz)
- Dampens high frequencies on each feedback cycle
- Essential for realistic string synthesis (mimics string damping)
- When enabled, higher harmonics decay faster, creating natural timbre evolution

### Input Source

Choose the excitation waveform fed into the filter:
- **White Noise**: Random signal, most realistic for plucked strings (default)
- **Sine Wave (440Hz)**: Pure tone at A4, creates harmonic ringing effects
- **Square Wave (440Hz)**: Rich harmonics, creates more complex timbres

### Playback Modes

**Pluck** (button)
- Triggers a single 50ms burst of the input signal
- Simulates plucking a string once
- Filter continues to resonate and decay naturally
- Best demonstrates Karplus-Strong string synthesis

**Auto-Pluck** (toggle)
- Automatically plucks every 1.5 seconds
- Good for comparing settings without clicking repeatedly
- Stops continuous mode if active

**Continuous** (toggle)
- Continuously feeds input signal into the filter
- Shows ongoing resonance behavior
- Useful for understanding feedback and filtering effects
- Stops auto-pluck if active

## Visualization

**Circuit Diagram**
- Shows the complete feedback comb filter signal flow
- Processing blocks from left to right:
  - Input → Summing junction (+) → Split point → Output
  - Feedback path (bottom): Delay → Lowpass (if enabled, red) → Gain → back to summer
- Block labels show current parameter values
- Lowpass block highlighted in red when enabled
- Shows "Bypass" message when delay = 0

## How It Works

### The Algorithm

The feedback comb filter implements:
```
y[n] = x[n] + β · LP(y[n-M])
```

Where:
- `x[n]` = input signal (noise/sine/square)
- `y[n]` = output signal (also stored in delay buffer)
- `M` = delay in samples
- `β` = feedback gain
- `LP()` = optional lowpass filter

### Signal Flow

1. Generate input sample (noise, sine, or square wave)
2. Add input to feedback signal at summing junction
3. Store result in circular delay buffer
4. Read sample from M samples ago
5. Apply lowpass filter (if enabled): `y[n] = α·x[n] + (1-α)·y[n-1]`
6. Multiply by feedback gain β
7. Feed back to summing junction
8. Output the summed signal

### Why Noise Becomes Pitch

White noise contains all frequencies with equal energy. When fed through the feedback delay loop:
- Frequencies that "fit" the delay time (where one cycle = delay time) reinforce themselves
- These frequencies build up through constructive interference
- Other frequencies cancel out or don't reinforce
- Result: Strong resonant peaks at f₀, 2f₀, 3f₀... where f₀ = sample_rate / delay_samples
- The noise "excites" all the resonances, but only the resonant frequencies sustain

### Why It Sounds Like a String

The Karplus-Strong algorithm exploits a beautiful insight: a plucked string is essentially a delay line!

**Physical string:**
- Pluck excites all frequencies (like noise burst)
- Vibration travels to bridge and reflects back
- Creates a physical delay loop (string length determines delay time)
- Air resistance and internal friction dampen high frequencies
- Result: pitched tone that decays naturally

**Digital simulation:**
- Noise burst = pluck excitation
- Delay line = string length (determines pitch)
- Feedback = wave reflection at the bridge
- Lowpass filter = natural damping of high frequencies
- Result: virtually identical behavior to a real string!

This is why the app produces such realistic plucked string sounds, especially with:
- Noise input (broad spectrum excitation)
- High feedback (long sustain like low-tension strings)
- Lowpass enabled (natural high-frequency decay)

## Technical Implementation

**Audio Stack:**
- Web Audio API
- ScriptProcessorNode for custom DSP (4096 sample buffer)
- 48kHz sample rate (typical, uses audioContext.sampleRate)
- Real-time processing in the audio callback

**DSP Details:**
- Circular buffer for efficient delay line (no copying)
- First-order IIR lowpass: cutoff_coefficient = 2π · f_cutoff / f_sample
- Phase accumulator for sine/square wave generation
- 50ms burst duration for pluck mode (2400 samples at 48kHz)

**Stability:**
- Feedback clamped to < 1.0 to prevent infinite buildup
- Delay buffer cleared on mode changes to prevent artifacts
- Lowpass state reset on pluck for consistent response

## Common Settings

**Classic Karplus-Strong String** (realistic plucked string)
- Delay: 100-500 samples (depends on desired pitch)
- Feedback: 0.99-0.995
- Lowpass: Enabled, 3-5kHz cutoff
- Input: White noise
- Mode: Pluck

**Resonant Reverb**
- Delay: 1000 samples (~21ms at 48kHz)
- Feedback: 0.6-0.8
- Lowpass: Disabled
- Input: Any
- Mode: Continuous

**Metallic/Bell Tones**
- Delay: 10-50 samples (very short)
- Feedback: 0.85-0.95
- Lowpass: Disabled or >8kHz
- Input: White noise
- Mode: Pluck

**Harmonic Drone**
- Delay: 200-400 samples
- Feedback: 0.97-0.995
- Lowpass: Enabled, 6-8kHz
- Input: Sine or Square
- Mode: Continuous

## Project Structure

```
karplus-strong/
├── index.html          # Entry point
├── src/
│   ├── main.ts        # All application logic and DSP
│   ├── style.css      # Styling
│   └── vite-env.d.ts  # TypeScript environment types
├── package.json       # Dependencies (Vite, TypeScript)
├── tsconfig.json      # TypeScript configuration
└── CLAUDE.md          # This file
```

## Building

Part of the DSP portfolio project. Build with:
```bash
npm install
npm run build
```

Output goes to `dist/` for deployment.
