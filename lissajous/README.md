# Lissajous Curves - Interactive Musical Interval Explorer

An interactive web application that visualizes the beautiful connection between mathematics and music through Lissajous curves. This is my answer to problem 8 of chapter 1 in "A Digital Signal Processing Primer" by Ken Steiglitz.

![Lissajous Curves Application](public/screen-cap.png)

## What are Lissajous Curves?

Lissajous curves are parametric curves created by combining two perpendicular harmonic oscillations:

```
x = A·sin(aω + δ)
y = B·sin(bω)
```

The ratio of frequencies **a:b** determines the curve's shape. When these ratios match musical intervals using [just intonation](https://en.wikipedia.org/wiki/Just_intonation), the resulting patterns visually represent the harmonic relationships we hear in music.

## The Math-Music Connection

In just intonation, musical intervals are expressed as simple frequency ratios:

- **Perfect Fifth (3:2)** - The most consonant interval after the octave
- **Major Third (5:4)** - The basis of major chords
- **Octave (2:1)** - The simplest ratio, produces a circle or figure-eight
- **Minor Second (16:15)** - A dissonant interval with a complex pattern

Simple ratios create elegant, symmetrical patterns. Complex ratios produce intricate, web-like structures. This visual representation mirrors our perception of consonance and dissonance in music.

## Features

- **13 Musical Presets**: Explore all chromatic intervals from unison to octave
- **Real-time Audio**: Hear the harmonic intervals as two-tone sine waves
- **Interactive Controls**: Adjust frequency ratios, phase shift, and animation speed
- **Phase Sweep**: Watch the curve morph as the phase relationship changes
- **Visual Feedback**: Animated point traces the curve in real-time

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Then open your browser to `http://localhost:5173` and start exploring!

## Usage

1. Click preset buttons to load different musical intervals
2. Press **Play Sound** to hear the harmonic relationship
3. Adjust sliders to experiment with custom frequency ratios
4. Enable **Auto Sweep Phase** to watch the curve continuously transform

## Technical Details

Built with:
- **TypeScript** - Type-safe interactive controls
- **Vite** - Fast development and optimized builds
- **Canvas API** - Smooth 60fps animations
- **Web Audio API** - Real-time audio synthesis with ADSR envelope

## Theory Resources

- [Lissajous Curves on Wikipedia](https://en.wikipedia.org/wiki/Lissajous_curve)
- [Just Intonation and Musical Ratios](https://en.wikipedia.org/wiki/Just_intonation)
- [The Physics of Musical Intervals](https://en.wikipedia.org/wiki/Interval_(music)#Frequency_ratios)


