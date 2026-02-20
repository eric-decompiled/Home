# Karplus-Strong String Synthesis Explorer

**Turn noise into music.** An interactive web app that demonstrates how digital delay lines create realistic plucked string sounds.

## What is this?

This is an educational tool for exploring the **Karplus-Strong algorithm**, a landmark technique in digital audio that simulates plucked strings using just:
- A delay line (like a circular buffer)
- Feedback (feeding the output back to the input)
- A lowpass filter (optional, but makes it sound realistic)

When you feed **random noise** into this system and hit "Pluck," something magical happens: the noise transforms into a **pitched, musical tone** that sounds like a guitar or harp string. This app lets you hear it in real-time and understand *why* it works.

## Try It

**Quick start:**
1. Click **"Pluck"** to hear the default string sound (220 Hz / A3)
2. Adjust the **Delay** slider to change pitch (shorter = higher pitch)
3. Try **Feedback** at 0.99 vs 0.7 to hear sustain differences
4. Toggle **Lowpass Filter** on/off to hear how it affects timbre

**Experiment:**
- Set delay to ~100 samples for a high string (480 Hz)
- Use **Auto-Pluck** to hear periodic plucks without clicking
- Switch to **Continuous** mode to hear ongoing resonance
- Try **Sine Wave** input instead of noise for bell-like tones

## How Does It Work?

### The Magic of Feedback Delays

Imagine a string on a guitar. When you pluck it:
1. The **pluck** sends a vibration traveling down the string
2. It **bounces off the bridge** and travels back
3. This creates a **loop** where the wave reinforces itself
4. Only wavelengths that "fit" the string length survive
5. Result: a **pitched tone** even though the pluck was noise-like

**This app does exactly that, but digitally:**
- The **delay line** = the string
- **Feedback** = the wave bouncing back
- **Noise burst** = the pluck
- **Lowpass filter** = natural damping (strings lose treble as they decay)

### Why Noise Becomes Pitch

White noise contains **all frequencies equally**. When it enters the feedback loop:

- Frequencies that **match** the delay time (where 1 cycle = delay) **reinforce** themselves
- Other frequencies **cancel out** or fade away
- What's left: strong **resonant peaks** at evenly-spaced frequencies (the fundamental + harmonics)

Example: At 48kHz sample rate with 100-sample delay:
- Fundamental: 48000 ÷ 100 = **480 Hz**
- Harmonics: 960 Hz, 1440 Hz, 1920 Hz...
- These build up while everything else dies out → **musical pitch!**

### The Circuit Diagram

The visualization shows the signal flow:

```
Input → (+) → [Split] → Output
         ↑       ↓
         |    [Delay]
         |       ↓
         |   [Lowpass] (optional, shown in red)
         |       ↓
         |    [Gain]
         └───────┘
         (feedback)
```

Watch how the blocks update as you change parameters!

## Controls Explained

### Delay (0-1000 samples)
- **What it does:** Sets the "string length" in samples
- **Effect:** Determines pitch → `frequency = sample_rate ÷ delay_samples`
- **Try:** 218 samples = 220 Hz (low guitar string), 50 samples = 960 Hz (high pluck)

### Feedback (0.0-0.999)
- **What it does:** Controls how much signal loops back
- **Effect:** Higher = more resonance and longer sustain
- **Try:** 0.5 (short decay), 0.9 (medium), 0.995 (very long sustain)
- Must be < 1.0 or the signal explodes!

### Lowpass Filter
- **What it does:** Cuts high frequencies in the feedback loop
- **Effect:** Makes the tone sound more natural and warm
- **Cutoff:** 500 Hz - 10 kHz (default: 5 kHz)
- **Try:** Compare with filter on vs. off for realism

### Input Source
- **White Noise** (default): Best for realistic strings
- **Sine Wave (440 Hz)**: Creates harmonic/bell effects
- **Square Wave (440 Hz)**: Rich, buzzy timbres

### Playback Modes
- **Pluck**: Trigger a 50ms burst (most realistic)
- **Auto-Pluck**: Repeats every 1.5 seconds
- **Continuous**: Constant input (good for experimenting)

## Presets to Try

### Realistic Guitar String
- Delay: **218 samples** (220 Hz)
- Feedback: **0.995**
- Lowpass: **On, 5 kHz**
- Input: **White Noise**
- Mode: **Pluck**

### Bright Bell
- Delay: **30 samples** (~1600 Hz)
- Feedback: **0.9**
- Lowpass: **Off**
- Input: **White Noise**
- Mode: **Pluck**

### Resonant Drone
- Delay: **300 samples** (160 Hz)
- Feedback: **0.98**
- Lowpass: **On, 7 kHz**
- Input: **Sine Wave**
- Mode: **Continuous**

## Why This Matters

The Karplus-Strong algorithm (1983) was revolutionary because it:
- Made **realistic string sounds** possible on cheap hardware (just delays + feedback!)
- Showed that **physical modeling** (simulating physics) can sound better than wavetable synthesis
- Proved that **simple DSP** concepts can create complex, natural sounds
- Is still used in synthesizers, game audio, and research today

This app lets you **hear and see** those principles in action.

## Technical Notes

- Built with **Web Audio API** (real-time audio in the browser)
- Custom DSP using **ScriptProcessorNode**
- Circular buffer for the delay line (efficient, no memory copying)
- First-order IIR lowpass filter: `y[n] = α·x[n] + (1-α)·y[n-1]`
- 48 kHz sample rate, 4096-sample processing blocks
- Written in **TypeScript** with **Vite** for development

## Learn More

**The Karplus-Strong Algorithm:**
- [Original 1983 paper](https://ccrma.stanford.edu/~jos/pasp/Karplus_Strong_Algorithm.html) (Stanford CCRMA)
- [Physical modeling synthesis](https://en.wikipedia.org/wiki/Physical_modelling_synthesis) (Wikipedia)

**Comb Filters:**
- [Comb filter theory](https://ccrma.stanford.edu/~jos/pasp/Feedback_Comb_Filters.html) (Julius O. Smith)
- Used in reverb, flanging, and feedback effects

## Building & Running

```bash
# Development
npm install
npm run dev

# Production build
npm run build
```

Built output goes to `dist/` for static hosting.
