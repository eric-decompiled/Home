# Music Analysis: Theory, Algorithms, and Improvements

A comprehensive research document for improving harmonic and tonal analysis in Fractured Jukebox.

---

## 0. Executive Summary

Our current `midi-analyzer.ts` implements solid foundational algorithms (Krumhansl-Schmuckler key detection, template-based chord matching, Lerdahl-inspired tension model). This document identifies specific improvements based on MIR research and professional libraries.

### Current Strengths
- Key detection with Krumhansl cognitive profiles
- Windowed modulation detection with hysteresis
- Lerdahl-style tension computation (hierarchical + dissonance + motion + tendency)
- Bar-level chord detection with onset-accurate timing

### Priority Improvements
| Improvement | Effort | Impact | Priority |
|-------------|--------|--------|----------|
| Multiple key profiles (Temperley, EDM) | Low | High | 1 |
| Ambiguity metric (1st vs 2nd best) | Low | Medium | 2 |
| Extended chord types (maj7, sus, etc.) | Medium | Medium | 3 |
| Secondary dominant detection | Medium | High | 4 |
| Tonal.js integration for validation | Medium | Medium | 5 |
| Harmonic rhythm analysis | High | Medium | 6 |

---

## 1. Key Detection: Theory and Algorithms

### 1.1 The Krumhansl-Schmuckler Algorithm

Our implementation uses the classic K-S algorithm from cognitive psychology research. The algorithm correlates a pitch class histogram against idealized "key profiles" derived from experiments where listeners rated how well each pitch class "fit" in a given key context.

**Original Study**: Krumhansl, C. L. (1990). *Cognitive foundations of musical pitch*. Oxford University Press.

#### Current Implementation

```typescript
// Our profiles (from Krumhansl 1990)
const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
```

**The Correlation Formula**:
```
r = Σ(hᵢ - h̄)(pᵢ - p̄) / √[Σ(hᵢ - h̄)² × Σ(pᵢ - p̄)²]
```
Where `h` = histogram values, `p` = profile values.

#### Known Limitations

1. **Minor key bias**: The Krumhansl profiles have different cumulative weights for major vs minor, creating systematic bias toward minor keys ([Temperley 1999](https://davidtemperley.com/wp-content/uploads/2015/11/temperley-mp99.pdf))

2. **Duration weighting sensitivity**: Our `duration × velocity` weighting works well for classical/pop but may over-emphasize sustained notes in styles with short staccato passages

3. **Single-key assumption**: The global histogram approach assumes one dominant key; modulating pieces get averaged

### 1.2 Alternative Key Profiles

Research has produced many alternative profiles optimized for different repertoires:

#### Temperley Profiles (1999)

**Key Innovation**: Equalized mean values between major and minor profiles to remove systematic bias.

```typescript
const temperleyMajor = [5.0, 2.0, 3.5, 2.0, 4.5, 4.0, 2.0, 4.5, 2.0, 3.5, 1.5, 4.0];
const temperleyMinor = [5.0, 2.0, 3.5, 4.5, 2.0, 4.0, 2.0, 4.5, 3.5, 2.0, 1.5, 4.0];
```

**Best for**: Classical/euroclassical repertoire. Derived from corpus analysis of Bach, Haydn, Mozart.

**Source**: Temperley, D. (1999). What's key for key? The Krumhansl-Schmuckler key-finding algorithm reconsidered. *Music Perception*, 17(1), 65-100.

#### Shaath Profiles (2011)

**Key Innovation**: Krumhansl profiles retuned for popular and electronic music.

```typescript
const shaathMajor = [6.6, 2.0, 3.5, 2.3, 4.6, 4.0, 2.5, 5.2, 2.4, 3.8, 2.3, 3.4];
const shaathMinor = [6.5, 2.8, 3.5, 5.4, 2.7, 3.5, 2.5, 5.1, 4.0, 2.7, 4.3, 3.2];
```

**Best for**: Pop, rock, electronic music.

**Source**: Shaath, A. (2011). Estimation of key in digital music recordings.

#### EDM Profiles (Essentia)

From the Essentia library, derived from BeatPort dataset analysis:

| Profile | Derivation | Best For |
|---------|------------|----------|
| `edma` | Automatic extraction from EDM corpus | Electronic dance music |
| `edmm` | Manual heuristic adjustments to edma | EDM with unusual harmonies |
| `bgate` | BeatPort median, zeros 4 least relevant | Robust EDM detection |

**Source**: [Essentia Key Algorithm Documentation](https://essentia.upf.edu/reference/std_Key.html)

#### Diatonic Profiles

Binary profiles (1/0) for notes in/out of scale. Useful for modal or ambient music where chromatic alterations are rare.

```typescript
const diatonicMajor = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1]; // C D E F G A B
const diatonicMinor = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0]; // A B C D E F G
```

### 1.3 Recommended Implementation: Profile Selection

```typescript
type KeyProfile = 'krumhansl' | 'temperley' | 'shaath' | 'diatonic';

const KEY_PROFILES: Record<KeyProfile, { major: number[]; minor: number[] }> = {
  krumhansl: {
    major: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
    minor: [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
  },
  temperley: {
    major: [5.0, 2.0, 3.5, 2.0, 4.5, 4.0, 2.0, 4.5, 2.0, 3.5, 1.5, 4.0],
    minor: [5.0, 2.0, 3.5, 4.5, 2.0, 4.0, 2.0, 4.5, 3.5, 2.0, 1.5, 4.0],
  },
  shaath: {
    major: [6.6, 2.0, 3.5, 2.3, 4.6, 4.0, 2.5, 5.2, 2.4, 3.8, 2.3, 3.4],
    minor: [6.5, 2.8, 3.5, 5.4, 2.7, 3.5, 2.5, 5.1, 4.0, 2.7, 4.3, 3.2],
  },
  diatonic: {
    major: [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1],
    minor: [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0],
  },
};

function detectKeyWithProfile(
  histogram: number[],
  profile: KeyProfile = 'krumhansl'
): { key: number; mode: 'major' | 'minor'; confidence: number } {
  const profiles = KEY_PROFILES[profile];
  // ... correlation logic
}
```

### 1.4 Confidence and Ambiguity Metrics

**Current**: We output a single `confidence` value normalized from correlation.

**Improvement**: Add `ambiguity` metric comparing 1st and 2nd best candidates. Essentia uses `firstToSecondRelativeStrength`.

```typescript
interface KeyResult {
  key: number;
  mode: 'major' | 'minor';
  confidence: number;      // How strong the best match is
  ambiguity: number;       // How close 2nd best is (high = ambiguous)
  secondBest: {            // For debugging/display
    key: number;
    mode: 'major' | 'minor';
    confidence: number;
  };
}

function detectKeyWithAmbiguity(histogram: number[]): KeyResult {
  const scores: Array<{ key: number; mode: 'major' | 'minor'; corr: number }> = [];

  for (let shift = 0; shift < 12; shift++) {
    for (const mode of ['major', 'minor'] as const) {
      const corr = correlate(histogram, shift, mode);
      scores.push({ key: shift, mode, corr });
    }
  }

  scores.sort((a, b) => b.corr - a.corr);
  const best = scores[0];
  const second = scores[1];

  // Relative strength: how much better is best than second?
  const relativeStrength = (best.corr - second.corr) / (Math.abs(best.corr) + 0.001);

  return {
    key: best.key,
    mode: best.mode,
    confidence: (best.corr + 1) / 2,  // Normalize -1..1 to 0..1
    ambiguity: 1 - Math.min(1, relativeStrength * 2),  // High when close
    secondBest: {
      key: second.key,
      mode: second.mode,
      confidence: (second.corr + 1) / 2,
    },
  };
}
```

**Use Cases**:
- High ambiguity between C major and A minor → typical relative major/minor confusion
- High ambiguity between distant keys → possibly chromatic or atonal passage
- Visual feedback: show ambiguity as "key uncertainty" indicator

---

## 2. Chord Detection: Theory and Algorithms

### 2.1 Template Matching Approach

Our current approach matches pitch class profiles against chord templates weighted by duration × velocity. This is the standard approach in MIR.

**Current Templates**:
```typescript
const chordTemplates = [
  { quality: 'major',  intervals: [0, 4, 7] },
  { quality: 'minor',  intervals: [0, 3, 7] },
  { quality: 'dom7',   intervals: [0, 4, 7, 10] },
  { quality: 'min7',   intervals: [0, 3, 7, 10] },
  { quality: 'dim',    intervals: [0, 3, 6] },
  { quality: 'aug',    intervals: [0, 4, 8] },
];
```

**Scoring Formula**:
```
score = (matchWeight / totalWeight) - 0.3 × (nonChordWeight / totalWeight) + diatonicBonus
```

This balances:
1. How much of the signal is explained by chord tones
2. Penalty for strong non-chord tones
3. Bias toward diatonic roots (+0.15)

### 2.2 Extended Chord Types

Professional chord detection systems support many more chord types. Adding these would improve accuracy for jazz, complex pop, and video game soundtracks.

#### Recommended Additions

```typescript
const extendedTemplates = [
  // === Triads (existing) ===
  { quality: 'major', intervals: [0, 4, 7] },
  { quality: 'minor', intervals: [0, 3, 7] },
  { quality: 'dim', intervals: [0, 3, 6] },
  { quality: 'aug', intervals: [0, 4, 8] },

  // === Seventh Chords ===
  { quality: 'maj7', intervals: [0, 4, 7, 11] },      // Major 7th (Cmaj7)
  { quality: 'dom7', intervals: [0, 4, 7, 10] },      // Dominant 7th (C7)
  { quality: 'min7', intervals: [0, 3, 7, 10] },      // Minor 7th (Cm7)
  { quality: 'hdim7', intervals: [0, 3, 6, 10] },     // Half-diminished (Cø7)
  { quality: 'dim7', intervals: [0, 3, 6, 9] },       // Fully diminished (Co7)
  { quality: 'minMaj7', intervals: [0, 3, 7, 11] },   // Minor-major 7th (Cm(maj7))

  // === Suspended ===
  { quality: 'sus4', intervals: [0, 5, 7] },          // Suspended 4th
  { quality: 'sus2', intervals: [0, 2, 7] },          // Suspended 2nd
  { quality: '7sus4', intervals: [0, 5, 7, 10] },     // Dominant 7 sus4

  // === Added Tone ===
  { quality: 'add9', intervals: [0, 4, 7, 2] },       // Add9 (note: 2 = 14 % 12)
  { quality: '6', intervals: [0, 4, 7, 9] },          // Major 6th
  { quality: 'min6', intervals: [0, 3, 7, 9] },       // Minor 6th

  // === Power Chord (common in rock) ===
  { quality: '5', intervals: [0, 7] },                // Power chord (no 3rd)
];
```

#### Chord Quality Hierarchy

For disambiguation, prefer simpler chords when scores are close:

```typescript
const QUALITY_PREFERENCE = {
  'major': 0,
  'minor': 0,
  '5': 0.02,      // Slight penalty (ambiguous)
  'sus4': 0.01,
  'sus2': 0.01,
  'dom7': -0.02,  // Slight bonus (common, distinctive)
  'min7': -0.02,
  'maj7': -0.01,
  'dim': 0,
  'aug': 0.01,    // Slight penalty (rare)
  '6': 0.01,
  'add9': 0.01,
  'hdim7': 0.01,
  'dim7': 0.01,
  'minMaj7': 0.02,
};
```

### 2.3 HPCP: Harmonic Pitch Class Profile

Standard pitch class profiles (PCP) count energy per pitch class. **HPCP** (Harmonic PCP) additionally weights by harmonic position, giving more emphasis to fundamental frequencies.

**From Essentia Documentation**:
> "The 0-th HPCP coefficient corresponds to A, establishing a standardized chromatic reference frame."

**Harmonic Weighting**:
```typescript
function computeHPCP(
  spectrum: Float32Array,
  sampleRate: number,
  numHarmonics: number = 4,
  slope: number = 0.6
): number[] {
  const hpcp = new Array(12).fill(0);

  // For each spectral peak
  for (const peak of extractPeaks(spectrum, sampleRate)) {
    const pitchClass = freqToPitchClass(peak.freq);

    // Weight by harmonic number (fundamental gets most weight)
    for (let h = 1; h <= numHarmonics; h++) {
      const weight = Math.pow(slope, h - 1);  // Exponential decay
      hpcp[pitchClass] += peak.magnitude * weight;
    }
  }

  return normalize(hpcp);
}
```

**Note**: For MIDI analysis, we already have perfect pitch information, so HPCP's harmonic weighting is less critical than for audio. Our duration × velocity weighting serves a similar purpose.

### 2.4 Chord Detection with Beat Alignment

Essentia offers `ChordsDetectionBeats` which uses beat boundaries for segmentation. We already do bar-level analysis, which is more stable.

**Trade-offs**:

| Approach | Pros | Cons |
|----------|------|------|
| **Per-bar** (ours) | Stable, musically meaningful | May miss sub-bar chord changes |
| **Per-beat** | Catches faster changes | More noise, thrashing |
| **Beat-aligned** | Best of both | Requires accurate beat detection |

**Recommendation**: Keep bar-level as default, add per-beat option for jazz/complex harmony.

---

## 3. Secondary Dominants and Applied Chords

### 3.1 Music Theory Background

A **secondary dominant** (or applied dominant) is a dominant chord borrowed from another key, used to tonicize a diatonic chord.

**Notation**: V/x or viio/x (read "five of x" or "seven of x")

**Example in C major**:
- V/V = D major (dominant of G, the dominant)
- V/ii = A major (dominant of D minor)
- viio/vi = G# diminished (leading tone of A minor)

**Source**: [Open Music Theory - Applied Chords](https://viva.pressbooks.pub/openmusictheorycopy/chapter/applied-chords/)

### 3.2 Detection Algorithm

Secondary dominants have characteristic resolution patterns:

```typescript
interface SecondaryDominantInfo {
  isSecondary: boolean;
  type: 'V' | 'viio' | null;
  target: number;  // Scale degree being tonicized (2-7)
}

function detectSecondaryDominant(
  current: ChordEvent,
  next: ChordEvent | null,
  key: number,
  mode: 'major' | 'minor'
): SecondaryDominantInfo {
  if (!next) return { isSecondary: false, type: null, target: 0 };

  // Calculate interval of resolution
  const interval = (next.root - current.root + 12) % 12;

  // V/x: Major or dom7 chord resolving down by 5th (= up by 4th = 5 semitones)
  // or resolving up by half step (leading tone resolution, less common)
  const resolvesByFifth = interval === 5;  // P4 up = P5 down

  // Check if current chord could be a secondary dominant
  const isSecDomQuality = current.quality === 'major' || current.quality === 'dom7';

  // viio/x: Diminished chord resolving up by half step
  const isSecLeadingTone = current.quality === 'dim' && interval === 1;

  if (isSecDomQuality && resolvesByFifth) {
    // Is the target a diatonic chord (not the tonic)?
    const targetDegree = getScaleDegree(next.root, key, mode);
    if (targetDegree > 1 && targetDegree <= 7) {
      // Verify the current chord is NOT diatonic (would be regular V, not V/x)
      const currentDegree = getScaleDegree(current.root, key, mode);
      if (currentDegree === 0 || !isDiatonicQuality(currentDegree, current.quality, mode)) {
        return {
          isSecondary: true,
          type: 'V',
          target: targetDegree,
        };
      }
    }
  }

  if (isSecLeadingTone) {
    const targetDegree = getScaleDegree(next.root, key, mode);
    if (targetDegree > 1 && targetDegree <= 7) {
      return {
        isSecondary: true,
        type: 'viio',
        target: targetDegree,
      };
    }
  }

  return { isSecondary: false, type: null, target: 0 };
}
```

### 3.3 Diatonic Chord Quality Expectations

To properly identify chromatic alterations and secondary functions, we need to know what chord qualities are *expected* for each scale degree:

```typescript
const DIATONIC_QUALITIES = {
  major: {
    1: ['major', 'maj7'],           // I, Imaj7
    2: ['minor', 'min7'],           // ii, ii7
    3: ['minor', 'min7'],           // iii, iii7
    4: ['major', 'maj7'],           // IV, IVmaj7
    5: ['major', 'dom7'],           // V, V7
    6: ['minor', 'min7'],           // vi, vi7
    7: ['dim', 'hdim7'],            // viio, viiø7
  },
  minor: {
    1: ['minor', 'min7', 'minMaj7'], // i
    2: ['dim', 'hdim7'],             // iio
    3: ['major', 'maj7', 'aug'],     // III (or III+)
    4: ['minor', 'min7'],            // iv
    5: ['minor', 'min7', 'major', 'dom7'], // v or V (harmonic minor)
    6: ['major', 'maj7'],            // VI
    7: ['major', 'dom7', 'dim', 'dim7'],   // VII or viio
  },
};

function isDiatonicQuality(
  degree: number,
  quality: ChordQuality,
  mode: 'major' | 'minor'
): boolean {
  const expected = DIATONIC_QUALITIES[mode][degree];
  return expected?.includes(quality) ?? false;
}
```

### 3.4 Integration with Tension Model

Secondary dominants should increase tension (they're chromatic, unexpected):

```typescript
function computeTension(chord: ChordEvent, secDom: SecondaryDominantInfo): number {
  let tension = baseTension(chord);

  if (secDom.isSecondary) {
    // Secondary dominants add chromatic tension
    tension += 0.15;

    // V/V is very common, less surprising
    if (secDom.type === 'V' && secDom.target === 5) {
      tension -= 0.05;
    }
  }

  return Math.min(1, tension);
}
```

---

## 4. Roman Numeral Analysis

### 4.1 Standard Notation

Roman numeral analysis contextualizes chords relative to the key:

| Symbol | Meaning | Example in C |
|--------|---------|--------------|
| I | Major triad on 1 | C |
| ii | Minor triad on 2 | Dm |
| iii | Minor triad on 3 | Em |
| IV | Major triad on 4 | F |
| V | Major triad on 5 | G |
| vi | Minor triad on 6 | Am |
| vii° | Diminished triad on 7 | Bdim |
| V7 | Dominant 7th | G7 |
| V/V | Secondary dominant of V | D or D7 |
| ♭VII | Borrowed from parallel minor | Bb |

**Source**: [Wikipedia - Roman Numeral Analysis](https://en.wikipedia.org/wiki/Roman_numeral_analysis)

### 4.2 Implementation with Tonal.js

Tonal.js has excellent Roman numeral support:

```typescript
import { RomanNumeral, Key } from 'tonal';

// Parse Roman numerals
RomanNumeral.get('V/V');  // → { empty: false, name: 'V/V', ... }

// Get chords for a key
const cMajor = Key.majorKey('C');
cMajor.chords;  // → ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']

// Get Roman numeral for a chord in context
function toRomanNumeral(root: number, quality: ChordQuality, key: number, mode: 'major' | 'minor'): string {
  const degree = getScaleDegree(root, key, mode);
  if (degree === 0) return '?';  // Chromatic

  const numeral = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][degree];
  const isMinor = quality === 'minor' || quality === 'min7' || quality === 'dim';

  let result = isMinor ? numeral.toLowerCase() : numeral;

  // Add quality suffix
  if (quality === 'dom7') result += '7';
  if (quality === 'min7') result += '7';
  if (quality === 'maj7') result += 'maj7';
  if (quality === 'dim') result += '°';
  if (quality === 'aug') result += '+';

  return result;
}
```

### 4.3 Mode Mixture (Borrowed Chords)

Chords borrowed from the parallel key (e.g., ♭VII in major borrowed from minor):

```typescript
const BORROWED_CHORDS = {
  major: {
    // Borrowed from parallel minor
    'bIII': { interval: 3, quality: 'major' },   // Eb in C major
    'bVI': { interval: 8, quality: 'major' },    // Ab in C major
    'bVII': { interval: 10, quality: 'major' },  // Bb in C major
    'iv': { interval: 5, quality: 'minor' },     // Fm in C major
  },
  minor: {
    // Borrowed from parallel major (Picardy third, etc.)
    'I': { interval: 0, quality: 'major' },      // C in C minor (Picardy)
    'IV': { interval: 5, quality: 'major' },     // F in C minor
  },
};

function detectBorrowedChord(
  chord: ChordEvent,
  key: number,
  mode: 'major' | 'minor'
): string | null {
  const interval = (chord.root - key + 12) % 12;
  const borrowed = BORROWED_CHORDS[mode];

  for (const [symbol, def] of Object.entries(borrowed)) {
    if (def.interval === interval && def.quality === chord.quality) {
      return symbol;
    }
  }
  return null;
}
```

---

## 5. Harmonic Rhythm and Phrasing

### 5.1 Harmonic Rhythm

**Harmonic rhythm** is the rate at which chords change. It provides important structural information.

```typescript
interface HarmonicRhythm {
  changesPerBar: number;          // Average chord changes per bar
  changesPerBeat: number;         // Average chord changes per beat
  regularityScore: number;        // 0-1, how regular the pattern is
  dominantPattern: number[];      // Most common change pattern (e.g., [1,0,1,0] = changes on 1 and 3)
}

function analyzeHarmonicRhythm(
  chords: ChordEvent[],
  barDuration: number,
  beatsPerBar: number
): HarmonicRhythm {
  if (chords.length < 2) {
    return { changesPerBar: 0, changesPerBeat: 0, regularityScore: 1, dominantPattern: [] };
  }

  // Count changes per bar
  const barChanges: number[] = [];
  let currentBar = 0;
  let changesInBar = 0;

  for (const chord of chords) {
    const bar = Math.floor(chord.time / barDuration);
    if (bar !== currentBar) {
      barChanges.push(changesInBar);
      changesInBar = 1;
      currentBar = bar;
    } else {
      changesInBar++;
    }
  }
  barChanges.push(changesInBar);

  const totalBars = barChanges.length;
  const totalChanges = barChanges.reduce((a, b) => a + b, 0);

  // Regularity: low variance = high regularity
  const mean = totalChanges / totalBars;
  const variance = barChanges.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / totalBars;
  const regularity = 1 / (1 + variance);

  // Detect dominant beat pattern within bars
  const beatPattern = new Array(beatsPerBar).fill(0);
  for (const chord of chords) {
    const beatInBar = Math.floor((chord.time % barDuration) / (barDuration / beatsPerBar));
    beatPattern[beatInBar]++;
  }
  const maxBeat = Math.max(...beatPattern);
  const dominantPattern = beatPattern.map(b => b > maxBeat * 0.5 ? 1 : 0);

  return {
    changesPerBar: totalChanges / totalBars,
    changesPerBeat: totalChanges / (totalBars * beatsPerBar),
    regularityScore: regularity,
    dominantPattern,
  };
}
```

### 5.2 Cadence Detection

**Cadences** are chord progressions that create a sense of ending or pause. They're crucial for phrase detection.

| Cadence | Progression | Effect |
|---------|-------------|--------|
| **Authentic (PAC)** | V → I | Strong closure |
| **Half** | ? → V | Pause, expectation |
| **Plagal** | IV → I | "Amen" cadence |
| **Deceptive** | V → vi | Surprise continuation |

```typescript
type CadenceType = 'PAC' | 'IAC' | 'HC' | 'PC' | 'DC' | null;

function detectCadence(
  prev: ChordEvent,
  current: ChordEvent,
  key: number,
  mode: 'major' | 'minor'
): CadenceType {
  const prevDeg = prev.degree;
  const currDeg = current.degree;

  // Perfect Authentic Cadence: V → I with root position
  if (prevDeg === 5 && currDeg === 1) {
    // Could check for root position, but we don't have inversion info
    return 'PAC';
  }

  // Half Cadence: ends on V
  if (currDeg === 5 && prevDeg !== 5) {
    return 'HC';
  }

  // Plagal Cadence: IV → I
  if (prevDeg === 4 && currDeg === 1) {
    return 'PC';
  }

  // Deceptive Cadence: V → vi
  if (prevDeg === 5 && currDeg === 6) {
    return 'DC';
  }

  return null;
}
```

### 5.3 Phrase Detection (Future Work)

Phrases can be detected through:

1. **Cadence points** — phrases end with cadences
2. **Melodic contour** — phrases often have arch shapes
3. **Rest/silence boundaries** — gaps in melodic line
4. **Repetition** — phrases often repeat or vary

This is complex and would require significant additional analysis.

---

## 6. Integration: Tonal.js

### 6.1 What Tonal.js Offers

[Tonal.js](https://github.com/tonaljs/tonal) is a comprehensive music theory library:

| Module | Purpose |
|--------|---------|
| `@tonaljs/chord` | Chord construction and info |
| `@tonaljs/chord-detect` | Detect chords from notes |
| `@tonaljs/key` | Key signatures and diatonic chords |
| `@tonaljs/scale` | Scale generation |
| `@tonaljs/roman-numeral` | Roman numeral parsing |
| `@tonaljs/progression` | Chord progression analysis |

### 6.2 Potential Uses

```typescript
import { Chord, Key, RomanNumeral } from 'tonal';

// Validate chord detection
function validateChord(pitchClasses: number[]): string[] {
  const notes = pitchClasses.map(pc => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][pc]);
  return Chord.detect(notes);  // Returns possible chord names
}

// Get expected chords for key
function getDiatonicChords(keyName: string): string[] {
  const keyInfo = Key.majorKey(keyName);
  return keyInfo.chords;  // ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']
}

// Parse and validate Roman numerals
function parseRomanNumeral(rn: string) {
  return RomanNumeral.get(rn);
  // { empty: false, name: 'V/V', step: 4, alt: 0, dir: 1, type: 'major', ... }
}
```

### 6.3 Installation

```bash
npm install tonal
# Or individual packages:
npm install @tonaljs/chord @tonaljs/key @tonaljs/roman-numeral
```

---

## 7. Implementation Roadmap

### Phase 1: Low-Hanging Fruit (1-2 hours each)

1. **Multiple key profiles**
   - Add Temperley and Shaath profiles
   - Add profile selection parameter
   - Default to Krumhansl for backwards compatibility

2. **Ambiguity metric**
   - Track 2nd-best key candidate
   - Compute relative strength
   - Export in KeyRegion

3. **Extended chord types**
   - Add maj7, hdim7, dim7, sus4, sus2
   - Adjust scoring with quality preferences

### Phase 2: Medium Complexity (half-day each)

4. **Secondary dominant detection**
   - Implement resolution pattern matching
   - Add to ChordEvent interface
   - Integrate with tension model

5. **Tonal.js integration**
   - Add as optional dependency
   - Use for chord name validation
   - Use for Roman numeral generation

6. **Diatonic quality validation**
   - Compare detected vs expected qualities
   - Flag chromatic chords
   - Improve borrowed chord detection

### Phase 3: Future Work (multi-day)

7. **Harmonic rhythm analysis**
   - Per-song harmonic rate statistics
   - Phrase boundary suggestions

8. **Phrase detection**
   - Cadence-based segmentation
   - Melodic contour analysis

---

## 8. References

### Key Detection

- Krumhansl, C. L. (1990). *Cognitive foundations of musical pitch*. Oxford University Press.
- [Temperley, D. (1999). What's key for key? Music Perception, 17(1), 65-100.](https://davidtemperley.com/wp-content/uploads/2015/11/temperley-mp99.pdf)
- [Essentia Key Algorithm](https://essentia.upf.edu/reference/std_Key.html)
- [Essentia KeyExtractor](https://essentia.upf.edu/reference/std_KeyExtractor.html)
- [A Comparison of Key Detection Approaches (MDPI 2022)](https://www.mdpi.com/2076-3417/12/21/11261)

### Chord Detection

- [Essentia ChordsDetection](https://essentia.upf.edu/reference/std_ChordsDetection.html)
- [Chord Recognition based on Template Matching (ResearchGate)](https://www.researchgate.net/publication/325070280_Chord_Recognition_based_on_Template_Matching)
- [Automatic Chord Recognition Using Enhanced PCP](https://www.researchgate.net/publication/228347381_Automatic_Chord_Recognition_from_Audio_Using_Enhanced_Pitch_Class_Profile)
- [Chord Recognition with PCP (GitHub)](https://github.com/orchidas/Chord-Recognition)

### Music Theory

- [Roman Numeral Analysis (Wikipedia)](https://en.wikipedia.org/wiki/Roman_numeral_analysis)
- [Secondary Chords (Wikipedia)](https://en.wikipedia.org/wiki/Secondary_chord)
- [Applied Chords (Open Music Theory)](https://viva.pressbooks.pub/openmusictheorycopy/chapter/applied-chords/)
- [Writing Secondary Dominants](https://musictheory.pugetsound.edu/mt21c/WritingSecondaryDominants.html)

### Libraries

- [Tonal.js Documentation](https://tonaljs.github.io/tonal/docs)
- [Tonal.js GitHub](https://github.com/tonaljs/tonal)
- [Essentia.js](https://mtg.github.io/essentia.js/)
- [Meyda](https://meyda.js.org/)

### Tension Models

- Lerdahl, F., & Krumhansl, C. L. (2007). Modeling tonal tension. *Music Perception*, 24(4), 329-366.
- [Tonal Pitch Space (Wikipedia)](https://en.wikipedia.org/wiki/Tonal_pitch_space)

### Harmonic Rhythm

- Temperley, D. (2001). *The Cognition of Basic Musical Structures*. MIT Press.
- [Harmonic Rhythm (Wikipedia)](https://en.wikipedia.org/wiki/Harmonic_rhythm)
