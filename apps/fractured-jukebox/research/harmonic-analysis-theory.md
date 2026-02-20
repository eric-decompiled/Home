# A Working Theory of Harmonic Analysis for Visualization

*This document synthesizes music theory research into a practical framework for implementing harmony-aware music visualization.*

---

## 0. The Core Model

### Harmony as Tension and Release

All tonal music operates on a fundamental principle: **tension seeks resolution**. Chords create varying degrees of instability (tension) that pull toward stability (resolution). This creates the emotional arc of music.

```
HARMONIC EXPERIENCE = f(Expectation × Tension × Resolution)
```

At its core:
1. **Stable chords** (I, vi) → Rest, home, resolution
2. **Unstable chords** (V, vii°) → Tension, expectation, pull toward tonic
3. **Transitional chords** (ii, IV) → Motion, preparation, building

### The Three Pillars of Harmonic Perception

#### Pillar 1: Hierarchical Distance (Where Are We?)

The brain perceives chords relative to an established tonal center. Distance from tonic creates tension:

| Degree | Name | Circle of 5ths Distance | Tension Level |
|--------|------|------------------------|---------------|
| I | Tonic | 0 | None (home) |
| V | Dominant | 1 fifth | Moderate-high (wants to resolve) |
| IV | Subdominant | 1 fifth (other direction) | Low-moderate |
| ii | Supertonic | 2 fifths | Moderate |
| vi | Submediant | 3 fifths | Low (relative minor) |
| iii | Mediant | 4 fifths | Moderate (ambiguous) |
| vii° | Leading tone | 5 fifths | High (tritone, must resolve) |

**Visualization implication**: Map hierarchical distance to visual intensity, saturation, or displacement from center.

#### Pillar 2: Chord Quality (What Color Is It?)

Chord quality adds emotional coloring independent of harmonic function:

| Quality | Interval Content | Character | Visual Analog |
|---------|-----------------|-----------|---------------|
| Major | M3 + P5 | Bright, stable | Clear, warm colors |
| Minor | m3 + P5 | Dark, stable | Cool, muted colors |
| Dominant 7 | M3 + P5 + m7 | Tense, wants resolution | Active, urgent |
| Major 7 | M3 + P5 + M7 | Rich, sophisticated | Soft glow, depth |
| Minor 7 | m3 + P5 + m7 | Mellow, jazzy | Smooth, flowing |
| Diminished | m3 + d5 | Unstable, anxious | Angular, fragmented |
| Augmented | M3 + A5 | Dreamlike, unresolved | Expansive, floating |
| Suspended | P4 or M2 + P5 | Expectant, unresolved | Hovering, anticipatory |

**Visualization implication**: Let chord quality modulate color palette, texture complexity, or shape characteristics.

#### Pillar 3: Harmonic Motion (Where Are We Going?)

Root movement between chords creates its own tension/release patterns:

| Motion | Interval | Effect | Example |
|--------|----------|--------|---------|
| **By 5th down** | P5 ↓ / P4 ↑ | Strong resolution | V → I, ii → V |
| **By 5th up** | P5 ↑ / P4 ↓ | Moderate tension | I → V |
| **By 3rd** | M3 or m3 | Smooth, shared tones | I → vi, I → iii |
| **By step** | M2 or m2 | Linear motion | IV → V, vii° → I |
| **By tritone** | A4 / d5 | Maximum tension | Chromatic, jarring |

**Visualization implication**: Animate transitions based on root motion—5th motion = smooth arcs, step motion = slides, tritone = sudden shifts.

---

## 1. The Tension Model

### Computing Harmonic Tension

Tension is multi-dimensional. Our model combines four components based on Lerdahl & Krumhansl's research:

```typescript
interface TensionComponents {
  hierarchical: number;  // Distance from tonic (0-1)
  dissonance: number;    // Chord quality roughness (0-1)
  motion: number;        // Root movement tension (0-1)
  tendency: number;      // Resolution pull strength (0-1)
}

function computeTension(chord: ChordEvent, prevChord: ChordEvent | null): number {
  const h = hierarchicalTension(chord.degree);      // 40%
  const d = qualityDissonance(chord.quality);       // 25%
  const m = motionTension(prevChord?.root, chord.root); // 20%
  const t = tendencyTension(chord.degree);          // 15%

  return Math.min(1, h * 0.40 + d * 0.25 + m * 0.20 + t * 0.15);
}
```

### Tension by Scale Degree

Based on circle-of-fifths distance and harmonic function:

```typescript
const DEGREE_TENSION: Record<number, number> = {
  1: 0.00,  // I   - Tonic: complete rest
  2: 0.35,  // ii  - Pre-dominant: moderate
  3: 0.45,  // iii - Mediant: ambiguous, moderate
  4: 0.25,  // IV  - Subdominant: mild tension
  5: 0.60,  // V   - Dominant: strong pull to tonic
  6: 0.20,  // vi  - Submediant: relative minor, stable
  7: 0.85,  // vii°- Leading tone: maximum pull
};
```

### Tension by Chord Quality

Based on interval content and psychoacoustic roughness:

```typescript
const QUALITY_TENSION: Record<ChordQuality, number> = {
  'major':   0.00,  // Consonant baseline
  'minor':   0.08,  // Slightly darker
  'maj7':    0.05,  // Rich but stable
  'min7':    0.12,  // Mellow tension
  'dom7':    0.25,  // Contains tritone
  'sus4':    0.15,  // Unresolved 4th
  'sus2':    0.12,  // Unresolved 2nd
  'dim':     0.35,  // Two minor 3rds, tritone
  'hdim7':   0.40,  // Half-diminished
  'dim7':    0.45,  // Fully diminished (symmetric)
  'aug':     0.30,  // Whole-tone, ambiguous
};
```

### The Tension-Release Cycle

Music alternates between tension and release. Visualizations should follow this arc:

```
Low Tension (I)     Medium (ii, IV)      High (V, vii°)      Release (I)
     ↓                    ↓                    ↓                  ↓
   Stable              Building            Expectant          Resolution
   Rest                Motion              Climax             Satisfaction
```

**Visualization strategy**:
- **Building tension**: Gradual color shift, increasing complexity, elements moving outward
- **Peak tension**: Maximum saturation, rapid motion, visual density
- **Resolution**: Sudden expansion, brightness increase, elements settling

---

## 2. Key Detection and Modulation

### The Cognitive Key Profile

Listeners develop expectations about which notes "belong" in a key. The Krumhansl-Schmuckler algorithm captures this:

```typescript
// How well each pitch class "fits" in C major (Krumhansl 1990)
const MAJOR_PROFILE = [
  6.35,  // C  - Tonic (strongest)
  2.23,  // C# - Chromatic
  3.48,  // D  - Supertonic
  2.33,  // D# - Chromatic
  4.38,  // E  - Mediant
  4.09,  // F  - Subdominant
  2.52,  // F# - Chromatic
  5.19,  // G  - Dominant (second strongest)
  2.39,  // G# - Chromatic
  3.66,  // A  - Submediant
  2.29,  // A# - Chromatic
  2.88,  // B  - Leading tone
];
```

### Profile Selection by Genre

Different profiles work better for different music:

| Profile | Best For | Key Insight |
|---------|----------|-------------|
| **Krumhansl** | Pop, general | Cognitive experiments with listeners |
| **Temperley** | Classical | Corpus analysis, equal major/minor weight |
| **Shaath** | Pop, electronic | Retuned for modern music |
| **EDM (bgate)** | Dance music | BeatPort dataset, robust |

### Modulation Detection

Key changes require hysteresis to avoid false positives:

```typescript
interface ModulationDetector {
  windowBars: number;      // Analysis window (2-4 bars)
  hopBars: number;         // Sampling rate (0.5-1 bar)
  minStableWindows: number; // Consecutive agreement (2-3)
  confidenceThreshold: number; // Minimum difference (0.1-0.15)
}

// Conservative settings for avoiding tonicization false positives
const MODULATION_PARAMS: ModulationDetector = {
  windowBars: 4,
  hopBars: 1.0,
  minStableWindows: 3,
  confidenceThreshold: 0.15,
};
```

### Visualizing Modulation

When the key changes, the tonal center shifts. Strategies:

1. **Rotation**: Rotate the visual frame so new tonic is at 12 o'clock
2. **Color shift**: Transition palette to new key's characteristic color
3. **Transition animation**: Smooth interpolation over 1-2 bars
4. **Uncertainty visualization**: Show ambiguity during modulation

```typescript
function handleModulation(oldKey: number, newKey: number, duration: number) {
  // Shortest path rotation (avoid 360° spin)
  const diff = ((newKey - oldKey + 18) % 12) - 6;
  const targetRotation = currentRotation + diff * (Math.PI / 6);

  // Animate over the transition
  gsap.to(state, {
    keyRotation: targetRotation,
    duration: duration,
    ease: 'power2.inOut',
  });
}
```

---

## 3. Chord Detection Principles

### Template Matching

Chords are detected by matching pitch class profiles against templates:

```typescript
const CHORD_TEMPLATES = {
  major:  [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],  // 0, 4, 7
  minor:  [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],  // 0, 3, 7
  dom7:   [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],  // 0, 4, 7, 10
  // ...
};

function matchChord(pitchProfile: number[]): { root: number; quality: string } {
  let bestScore = -Infinity;
  let bestRoot = 0;
  let bestQuality = 'major';

  for (let root = 0; root < 12; root++) {
    for (const [quality, template] of Object.entries(CHORD_TEMPLATES)) {
      const rotatedTemplate = rotateArray(template, root);
      const score = correlate(pitchProfile, rotatedTemplate);

      if (score > bestScore) {
        bestScore = score;
        bestRoot = root;
        bestQuality = quality;
      }
    }
  }

  return { root: bestRoot, quality: bestQuality };
}
```

### Diatonic Bias

Prefer chords that fit the current key:

```typescript
function scoreWithDiatonicBias(
  score: number,
  root: number,
  quality: string,
  key: number,
  mode: 'major' | 'minor'
): number {
  const degree = getScaleDegree(root, key, mode);

  // Diatonic root bonus
  if (degree > 0) score += 0.15;

  // Expected quality bonus
  if (isExpectedQuality(degree, quality, mode)) score += 0.10;

  return score;
}
```

### Analysis Granularity

| Level | Window | Use Case |
|-------|--------|----------|
| **Per-bar** | 1 bar | Most music (stable, meaningful) |
| **Per-beat** | 1 beat | Jazz, fast harmonic rhythm |
| **Per-phrase** | 4-8 bars | Ambient, slow-changing harmony |

---

## 4. Functional Harmony

### The Three Functions

Traditional harmony groups chords by function:

| Function | Degrees | Role | Visual Character |
|----------|---------|------|------------------|
| **Tonic** | I, vi, (iii) | Rest, resolution | Stable, centered |
| **Subdominant** | IV, ii | Departure, motion | Moving outward |
| **Dominant** | V, vii° | Tension, return | Unstable, expectant |

### Common Progressions

These progressions have characteristic tension arcs:

```
I → IV → V → I
T    S    D   T     "The most basic progression"
0   0.25  0.6  0    Tension rises then resolves

I → vi → IV → V → I
T    T    S    D   T     "50s doo-wop / Axis of Awesome"
0   0.2  0.25  0.6  0    Gradual rise, strong resolution

ii → V → I
S    D   T               "Jazz ii-V-I"
0.35 0.6  0              Quick tension-release

I → V → vi → IV
T    D    T    S         "Pop punk / Sensitive Female Chord"
0   0.6  0.2  0.25       Surprise deceptive to subdominant
```

### Secondary Dominants

Chords borrowed from other keys to intensify motion:

```typescript
// V/V: The dominant of the dominant (in C: D major → G → C)
// Creates a "double dominant" intensification

function isSecondaryDominant(chord: ChordEvent, nextChord: ChordEvent): boolean {
  // Major or dom7 resolving by fifth to non-tonic diatonic chord
  const isDomQuality = chord.quality === 'major' || chord.quality === 'dom7';
  const resolvesByFifth = (nextChord.root - chord.root + 12) % 12 === 5;
  const targetNotTonic = nextChord.degree !== 1;

  return isDomQuality && resolvesByFifth && targetNotTonic;
}
```

---

## 5. Practical Mappings

### The Harmony-Visual Mapping Table

| Harmonic Feature | Perceptual Effect | Visual Mapping |
|------------------|-------------------|----------------|
| Chord function (T/S/D) | Stability expectation | Distance from center |
| Chord quality | Emotional color | Color palette selection |
| Tension level | Intensity, urgency | Brightness, saturation |
| Resolution (V→I) | Satisfaction, release | Expansion, brightening |
| Deceptive cadence (V→vi) | Surprise | Sudden color/direction shift |
| Modulation | Perspective shift | Rotation, palette change |
| Chromatic chord | Unexpected color | Visual disruption, new element |
| Secondary dominant | Intensification | Increased motion/energy |

### Mapping Tension to Visual Parameters

```typescript
function mapTensionToVisuals(tension: number): VisualParams {
  return {
    // Displacement from center (higher tension = further out)
    centerOffset: tension * 0.3,

    // Color saturation (higher tension = more saturated)
    saturation: 0.4 + tension * 0.5,

    // Animation speed (higher tension = faster)
    animationSpeed: 1.0 + tension * 0.8,

    // Visual complexity (higher tension = more elements)
    complexity: 0.3 + tension * 0.7,

    // Particle energy (higher tension = more active)
    particleVelocity: tension * 2.0,
  };
}
```

### Mapping Chord Quality to Color

```typescript
const QUALITY_COLOR_SHIFT: Record<ChordQuality, { hue: number; sat: number; lit: number }> = {
  'major':   { hue:   0, sat:  0,   lit:  0.05 },  // Slightly brighter
  'minor':   { hue:   0, sat: -0.1, lit: -0.05 },  // Slightly darker
  'dom7':    { hue:  15, sat:  0.15, lit:  0 },    // Warmer, more saturated
  'maj7':    { hue: -10, sat:  0.1,  lit:  0.1 },  // Cooler, softer
  'min7':    { hue:   0, sat: -0.05, lit:  0 },    // Mellow
  'dim':     { hue:  30, sat:  0.2,  lit: -0.1 },  // Tense, angular
  'aug':     { hue: -20, sat:  0.1,  lit:  0.05 }, // Dreamy
  'sus4':    { hue:   0, sat: -0.05, lit:  0.05 }, // Open, expectant
};
```

### Mapping Harmonic Rhythm to Animation

```typescript
function mapHarmonicRhythm(changesPerBar: number): AnimationParams {
  if (changesPerBar < 0.5) {
    // Very slow harmonic rhythm (ambient, drone)
    return { transitionDuration: 4.0, easing: 'power1.inOut' };
  } else if (changesPerBar < 1.5) {
    // Normal harmonic rhythm (most pop/rock)
    return { transitionDuration: 1.0, easing: 'power2.inOut' };
  } else if (changesPerBar < 3) {
    // Fast harmonic rhythm (jazz, complex pop)
    return { transitionDuration: 0.5, easing: 'power2.out' };
  } else {
    // Very fast (bebop, rapid changes)
    return { transitionDuration: 0.25, easing: 'power1.out' };
  }
}
```

---

## 6. Integration with Existing Systems

### Connecting to Groove/Rhythm

Harmony and rhythm interact:

```typescript
interface MusicState {
  // From beat system
  beatPhase: number;      // 0-1 within beat
  barPhase: number;       // 0-1 within bar
  beatGroove: number;     // Groove curve value

  // From harmony system
  tension: number;        // Current harmonic tension
  chordQuality: string;   // Current chord quality
  isResolution: boolean;  // Just resolved?

  // Combined response
  get visualIntensity(): number {
    // Rhythm provides the pulse, harmony provides the intensity
    return this.beatGroove * (0.5 + this.tension * 0.5);
  }

  get shouldAccent(): boolean {
    // Accent on beat arrivals, especially at resolutions
    return this.beatPhase < 0.1 && (this.isResolution || this.tension > 0.5);
  }
}
```

### Connecting to Fractal Parameters

Map harmony to fractal system:

```typescript
function harmonyToFractal(chord: ChordEvent, key: number): FractalParams {
  // Degree determines anchor selection
  const anchor = DEGREE_ANCHORS[chord.degree][chord.quality] ?? DEGREE_ANCHORS[chord.degree]['major'];

  // Quality modulates orbit size
  const orbitScale = QUALITY_ORBIT_SCALE[chord.quality] ?? 1.0;

  // Tension modulates zoom/range
  const zoomMod = 1.0 - chord.tension * 0.3;

  return {
    anchor,
    orbitScale,
    zoom: BASE_ZOOM * zoomMod,
    palette: CHROMATIC_PALETTES[(key + chord.root) % 12],
  };
}
```

---

## 7. Key Principles for Implementation

1. **Tension is continuous, not discrete** — Animate smoothly between tension levels, don't jump

2. **Resolution is the payoff** — V→I moments should feel visually satisfying (expansion, brightening)

3. **Quality colors the function** — A minor iv feels different than major IV, even at same tension level

4. **Modulation = perspective shift** — Key changes should rotate/reframe the visual space

5. **Secondary dominants intensify** — Treat V/V as "super dominant" with enhanced visual response

6. **Diatonic = expected, chromatic = surprise** — Borrowed chords should create visual disruption

7. **Harmonic rhythm sets pace** — Match transition speeds to chord change rate

8. **Hierarchy matters** — Tonic is center/rest, dominant is periphery/tension

---

## 8. Quick Reference

### Tension Values by Degree

```
I:   0.00  ████████████████████░░░░░░░░░░░░░░░░░░░░ (home)
ii:  0.35  ████████████████████████████░░░░░░░░░░░░
iii: 0.45  ██████████████████████████████████░░░░░░
IV:  0.25  ██████████████████████████░░░░░░░░░░░░░░
V:   0.60  ████████████████████████████████████████ (dominant)
vi:  0.20  ████████████████████████░░░░░░░░░░░░░░░░
vii°:0.85  ████████████████████████████████████████ (leading tone)
```

### Common Cadences

```
PAC  (V → I):   ████████░░ → ░░░░░░░░░░  Strong resolution
HC   (? → V):   ░░░░░░░░░░ → ████████░░  Half cadence (pause)
PC   (IV → I):  ████░░░░░░ → ░░░░░░░░░░  Plagal ("Amen")
DC   (V → vi):  ████████░░ → ████░░░░░░  Deceptive (surprise)
```

### Quality Character Quick Reference

```
Major:    Bright ☀️   Stable ⬤    Warm 🔴
Minor:    Dark 🌙    Stable ⬤    Cool 🔵
Dom7:     Urgent ⚡   Unstable ◇   Hot 🟠
Maj7:     Rich ✨    Stable ⬤    Soft 🟣
Dim:      Anxious 😰  Unstable ◇   Sharp 🔺
Aug:      Dreamy 🌀   Floating ○   Strange 🟢
Sus:      Open 🎐    Waiting ◇    Neutral ⚪
```

---

## Appendix: Chord Quality Detection Templates

```typescript
// Binary templates (presence/absence of pitch classes)
const CHORD_TEMPLATES: Record<string, number[]> = {
  // Triads
  'major':    [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
  'minor':    [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
  'dim':      [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
  'aug':      [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],

  // Sevenths
  'maj7':     [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1],
  'dom7':     [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
  'min7':     [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
  'hdim7':    [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0],
  'dim7':     [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],

  // Suspended
  'sus4':     [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
  'sus2':     [1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  '7sus4':    [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0],

  // Added tones
  'add9':     [1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0],
  '6':        [1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0],
  'min6':     [1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0],

  // Power chord
  '5':        [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
};
```

---

## References

- Lerdahl, F., & Krumhansl, C. L. (2007). Modeling tonal tension. *Music Perception*, 24(4), 329-366.
- Krumhansl, C. L. (1990). *Cognitive foundations of musical pitch*. Oxford University Press.
- Temperley, D. (1999). What's key for key? *Music Perception*, 17(1), 65-100.
- Piston, W. (1987). *Harmony* (5th ed.). W. W. Norton.
- [Open Music Theory](https://viva.pressbooks.pub/openmusictheory/)
