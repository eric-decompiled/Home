# Transition Detection: Algorithms for Music Structure Analysis

Research document for detecting orchestral stabs, section boundaries, fills, and breakdowns in MIDI data.

---

## 1. Problem Statement

Our current implementation in `midi-analyzer.ts` uses per-bar heuristics that don't generalize well:

| Current Approach | Issue |
|------------------|-------|
| Polyphony spikes (4+ notes, 1.5x neighbors) | Misses sparse stabs, triggers on dense passages |
| Velocity spikes (>0.7 avg, 1.3x neighbors) | Threshold too rigid, varies by MIDI source |
| Tom ratio >35% + hihat dropout | Works for rock fills, fails on electronic/orchestral |

**Goal**: More robust, generalizable detection using established MIR algorithms.

---

## 2. Self-Similarity Matrix (SSM) Approach

### 2.1 Core Concept

The Self-Similarity Matrix is the foundation of modern music structure analysis. Each cell `S[i,j]` represents similarity between time frames `i` and `j`.

**Key insight**: Block-like structures in the SSM correspond to musically coherent sections. The **corners of these blocks** are section boundaries.

**Sources**:
- [Audio Labs Erlangen - Novelty-Based Segmentation](https://www.audiolabs-erlangen.de/resources/MIR/FMP/C4/C4S4_NoveltySegmentation.html)
- [libfmp - Music Structure Analysis](https://meinardmueller.github.io/libfmp/build/html/index_c4.html)
- [TISMIR - Audio-Based Music Structure Analysis](https://transactions.ismir.net/articles/10.5334/tismir.54)

### 2.2 Checkerboard Kernel Detection

Foote's algorithm: slide a checkerboard kernel along the SSM diagonal to detect transitions.

```
Checkerboard kernel (L=2):
 +1 +1 -1 -1
 +1 +1 -1 -1
 -1 -1 +1 +1
 -1 -1 +1 +1
```

**Novelty at each position** = correlation between kernel and local SSM region.
- High novelty = transition between contrasting sections
- Low novelty = within homogeneous section

### 2.3 Implementation (from libfmp)

```typescript
/**
 * Compute Gaussian checkerboard kernel
 * @param L - Half-width (total size = 2*L+1)
 * @param variance - Gaussian tapering (0.5-1.0 typical)
 */
function computeCheckerboardKernel(L: number, variance: number = 0.5): number[][] {
  const size = 2 * L + 1;
  const kernel: number[][] = [];
  const taper = Math.sqrt(0.5) / (L * variance);

  for (let i = -L; i <= L; i++) {
    const row: number[] = [];
    for (let j = -L; j <= L; j++) {
      // Checkerboard pattern: +1 in quadrants I,III; -1 in quadrants II,IV
      const sign = Math.sign(i) * Math.sign(j) || 1;
      // Gaussian taper toward edges
      const gaussian = Math.exp(-taper * taper * (i * i + j * j));
      row.push(sign * gaussian);
    }
    kernel.push(row);
  }

  // Normalize
  const absSum = kernel.flat().reduce((a, b) => a + Math.abs(b), 0);
  return kernel.map(row => row.map(v => v / absSum));
}

/**
 * Compute novelty curve from SSM using checkerboard kernel
 */
function computeNoveltyFromSSM(S: number[][], kernel: number[][]): number[] {
  const N = S.length;
  const L = Math.floor(kernel.length / 2);
  const novelty = new Array(N).fill(0);

  for (let n = 0; n < N; n++) {
    let sum = 0;
    for (let i = -L; i <= L; i++) {
      for (let j = -L; j <= L; j++) {
        const si = n + i;
        const sj = n + j;
        if (si >= 0 && si < N && sj >= 0 && sj < N) {
          sum += S[si][sj] * kernel[i + L][j + L];
        }
      }
    }
    novelty[n] = sum;
  }

  return novelty;
}
```

### 2.4 Kernel Size Selection

| Kernel Size (L) | Effect | Use Case |
|-----------------|--------|----------|
| 2-4 bars | Detects phrase boundaries | Detailed structure |
| 8-16 bars | Detects section boundaries | Verse/chorus/bridge |
| 32+ bars | Detects major parts | Intro/body/outro |

**Recommendation**: Use multiple kernel sizes and combine results.

---

## 3. Symbolic Music Feature Extraction

For MIDI data, we can construct feature vectors directly from note events.

**Source**: [Symbolic Music Structure Analysis with Graph Representations](https://ar5iv.labs.arxiv.org/html/2303.13881)

### 3.1 IOI + Pitch Direction (Norm Algorithm)

The Norm algorithm extracts two vectors per note sequence:

1. **IOI (Inter-Onset Interval)**: Time between successive note onsets
2. **Pitch Direction**: +1 (ascending), -1 (descending), 0 (same)

```typescript
interface SymbolicFeatures {
  ioi: number[];           // Inter-onset intervals (normalized)
  pitchDirection: number[]; // +1, -1, or 0
  combined: number[];       // Concatenated and z-normalized
}

function extractSymbolicFeatures(notes: NoteEvent[]): SymbolicFeatures {
  const sorted = [...notes].sort((a, b) => a.time - b.time);
  const ioi: number[] = [];
  const pitchDir: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    // IOI: time between onsets
    ioi.push(sorted[i].time - sorted[i - 1].time);

    // Pitch direction
    const pitchDiff = sorted[i].midi - sorted[i - 1].midi;
    pitchDir.push(pitchDiff > 0 ? 1 : pitchDiff < 0 ? -1 : 0);
  }

  // Z-score normalization
  const normalizeZScore = (arr: number[]) => {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const std = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length) || 1;
    return arr.map(v => (v - mean) / std);
  };

  const normIOI = normalizeZScore(ioi);
  const normPitch = normalizeZScore(pitchDir.map(d => d)); // Cast to numbers

  // Combine: concatenate or use as 2D feature
  const combined = normIOI.map((v, i) => v + normPitch[i]);

  return { ioi: normIOI, pitchDirection: normPitch, combined };
}
```

### 3.2 Building SSM from MIDI Segments

Group notes into segments (bars or beats), compute feature vectors, then build distance matrix:

```typescript
interface BarFeatures {
  pitchHistogram: number[];    // 12-element pitch class distribution
  avgPitch: number;            // Mean MIDI note number
  avgVelocity: number;         // Mean velocity (0-1)
  noteDensity: number;         // Notes per beat
  maxPolyphony: number;        // Peak simultaneous notes
  rhythmComplexity: number;    // Variance of IOIs within bar
}

function extractBarFeatures(notes: NoteEvent[], barStart: number, barEnd: number): BarFeatures {
  const barNotes = notes.filter(n => n.time >= barStart && n.time < barEnd);

  // Pitch histogram (normalized)
  const histogram = new Array(12).fill(0);
  let pitchSum = 0, velSum = 0;

  for (const note of barNotes) {
    histogram[note.midi % 12] += note.velocity * note.duration;
    pitchSum += note.midi;
    velSum += note.velocity;
  }
  const histTotal = histogram.reduce((a, b) => a + b, 0) || 1;

  // Rhythm complexity: variance of onset times within bar
  const onsets = barNotes.map(n => n.time);
  const meanOnset = onsets.reduce((a, b) => a + b, 0) / (onsets.length || 1);
  const rhythmVar = onsets.reduce((a, b) => a + (b - meanOnset) ** 2, 0) / (onsets.length || 1);

  // Max polyphony
  let maxPoly = 0;
  for (const note of barNotes) {
    const simultaneous = barNotes.filter(
      n => n.time <= note.time && n.time + n.duration > note.time
    ).length;
    maxPoly = Math.max(maxPoly, simultaneous);
  }

  return {
    pitchHistogram: histogram.map(v => v / histTotal),
    avgPitch: barNotes.length ? pitchSum / barNotes.length : 60,
    avgVelocity: barNotes.length ? velSum / barNotes.length : 0,
    noteDensity: barNotes.length / ((barEnd - barStart) / 0.5), // per beat assuming 120bpm
    maxPolyphony: maxPoly,
    rhythmComplexity: rhythmVar,
  };
}

function computeFeatureDistance(a: BarFeatures, b: BarFeatures): number {
  // Weighted combination of feature distances
  let dist = 0;

  // Pitch histogram cosine distance (harmony)
  const dotProduct = a.pitchHistogram.reduce((sum, v, i) => sum + v * b.pitchHistogram[i], 0);
  const normA = Math.sqrt(a.pitchHistogram.reduce((sum, v) => sum + v * v, 0));
  const normB = Math.sqrt(b.pitchHistogram.reduce((sum, v) => sum + v * v, 0));
  const cosineSim = dotProduct / ((normA * normB) || 1);
  dist += (1 - cosineSim) * 2.0;  // Weight: 2.0

  // Density difference (energy)
  dist += Math.abs(a.noteDensity - b.noteDensity) * 0.5;

  // Velocity difference (dynamics)
  dist += Math.abs(a.avgVelocity - b.avgVelocity) * 1.0;

  // Polyphony difference (texture)
  dist += Math.abs(a.maxPolyphony - b.maxPolyphony) * 0.3;

  return dist;
}

function buildSSM(barFeatures: BarFeatures[]): number[][] {
  const N = barFeatures.length;
  const ssm: number[][] = [];

  for (let i = 0; i < N; i++) {
    const row: number[] = [];
    for (let j = 0; j < N; j++) {
      // Similarity = 1 / (1 + distance)
      const dist = computeFeatureDistance(barFeatures[i], barFeatures[j]);
      row.push(1 / (1 + dist));
    }
    ssm.push(row);
  }

  return ssm;
}
```

---

## 4. Onset Detection Functions for Stabs/Accents

### 4.1 Energy-Based Novelty

Detect sudden increases in musical "energy" using velocity and polyphony.

**Source**: [Audio Labs - Onset Detection](https://www.audiolabs-erlangen.de/resources/MIR/FMP/C6/C6S1_OnsetDetection.html)

```typescript
interface InstantEnergy {
  time: number;
  velocity: number;      // Max velocity at this instant
  polyphony: number;     // Notes sounding at this instant
  energy: number;        // Combined metric
}

/**
 * Compute energy curve at note onset times
 * Higher values = louder, denser moments
 */
function computeEnergyCurve(notes: NoteEvent[], resolution: number = 0.05): InstantEnergy[] {
  if (notes.length === 0) return [];

  const maxTime = Math.max(...notes.map(n => n.time + n.duration));
  const curve: InstantEnergy[] = [];

  for (let t = 0; t < maxTime; t += resolution) {
    // Notes sounding at time t
    const active = notes.filter(n => n.time <= t && n.time + n.duration > t);

    // Notes with onset in this window
    const onsets = notes.filter(n => n.time >= t && n.time < t + resolution);

    const maxVel = onsets.length > 0
      ? Math.max(...onsets.map(n => n.velocity))
      : 0;

    curve.push({
      time: t,
      velocity: maxVel,
      polyphony: active.length,
      energy: maxVel * (1 + active.length * 0.2), // Boost for polyphony
    });
  }

  return curve;
}

/**
 * Half-wave rectified first-order difference (novelty function)
 * Detects sudden *increases* in energy
 */
function computeEnergyNovelty(energyCurve: InstantEnergy[]): number[] {
  const novelty: number[] = [0];

  for (let i = 1; i < energyCurve.length; i++) {
    const diff = energyCurve[i].energy - energyCurve[i - 1].energy;
    // Half-wave rectification: only positive changes
    novelty.push(Math.max(0, diff));
  }

  return novelty;
}
```

### 4.2 MIDI-Specific Accent Detection

For MIDI, velocity directly encodes accent information. Key insight: look for **velocity contrast**, not absolute thresholds.

```typescript
interface AccentEvent {
  time: number;
  strength: number;     // 0-1, how strong the accent is
  type: 'stab' | 'accent' | 'sfz';
}

/**
 * Detect accented notes using local contrast
 * @param windowSize - Seconds of context on each side
 */
function detectAccents(
  notes: NoteEvent[],
  windowSize: number = 2.0,
  minContrast: number = 0.2
): AccentEvent[] {
  const accents: AccentEvent[] = [];

  for (const note of notes) {
    // Get notes in surrounding window
    const windowNotes = notes.filter(
      n => n !== note &&
           n.time >= note.time - windowSize &&
           n.time <= note.time + windowSize
    );

    if (windowNotes.length < 3) continue;

    // Local average velocity
    const localAvgVel = windowNotes.reduce((a, b) => a + b.velocity, 0) / windowNotes.length;

    // Contrast = how much louder than local average
    const contrast = note.velocity - localAvgVel;

    if (contrast > minContrast) {
      // Classify accent type
      let type: 'stab' | 'accent' | 'sfz' = 'accent';

      // Stab: high velocity + short duration + multiple simultaneous notes
      const simultaneous = notes.filter(
        n => Math.abs(n.time - note.time) < 0.05 && n !== note
      ).length;

      if (note.duration < 0.3 && simultaneous >= 2 && note.velocity > 0.8) {
        type = 'stab';
      } else if (contrast > 0.4) {
        type = 'sfz';  // Sforzando: very strong accent
      }

      accents.push({
        time: note.time,
        strength: Math.min(1, contrast / 0.5),
        type,
      });
    }
  }

  // Merge nearby accents (within 0.1s)
  const merged: AccentEvent[] = [];
  for (const accent of accents.sort((a, b) => a.time - b.time)) {
    const last = merged[merged.length - 1];
    if (last && accent.time - last.time < 0.1) {
      // Keep stronger accent
      if (accent.strength > last.strength) {
        merged[merged.length - 1] = accent;
      }
    } else {
      merged.push(accent);
    }
  }

  return merged;
}
```

### 4.3 Orchestral Stab Detection

Orchestral stabs ("DUH DUH DUH") have specific characteristics:
- Multiple instruments playing together (high polyphony)
- Strong attack (high velocity)
- Short duration
- Often on strong beats

```typescript
interface StabEvent {
  time: number;
  bar: number;
  beat: number;
  strength: number;
  polyphony: number;
  avgVelocity: number;
}

function detectOrchestralStabs(
  notes: NoteEvent[],
  barDuration: number,
  beatsPerBar: number
): StabEvent[] {
  const stabs: StabEvent[] = [];
  const beatDuration = barDuration / beatsPerBar;

  // Group notes by onset time (within 50ms)
  const groups: Map<number, NoteEvent[]> = new Map();

  for (const note of notes) {
    const quantized = Math.round(note.time / 0.05) * 0.05;
    if (!groups.has(quantized)) {
      groups.set(quantized, []);
    }
    groups.get(quantized)!.push(note);
  }

  for (const [time, groupNotes] of groups) {
    // Stab criteria:
    // 1. High polyphony (4+ notes, or 3+ from different tracks)
    const uniqueTracks = new Set(groupNotes.map(n => n.channel)).size;
    const isPolyphonic = groupNotes.length >= 4 || uniqueTracks >= 3;

    // 2. High velocity
    const avgVel = groupNotes.reduce((a, b) => a + b.velocity, 0) / groupNotes.length;
    const isLoud = avgVel > 0.7;

    // 3. Short duration (most notes under 0.5s)
    const shortNotes = groupNotes.filter(n => n.duration < 0.5).length;
    const isShort = shortNotes > groupNotes.length * 0.6;

    if (isPolyphonic && isLoud) {
      const bar = Math.floor(time / barDuration);
      const beat = Math.floor((time % barDuration) / beatDuration);

      stabs.push({
        time,
        bar,
        beat,
        strength: avgVel * (1 + groupNotes.length * 0.1),
        polyphony: groupNotes.length,
        avgVelocity: avgVel,
      });
    }
  }

  return stabs;
}
```

---

## 5. Drum Fill and Breakdown Detection

### 5.1 Drum Pattern Analysis

Based on research from the Groove MIDI Dataset:
- **Fills** have high tom ratio (50-75%) and low hihat activity
- **Beats** have lower tom ratio (19-27%) and steady hihat

**Source**: [Machine Learning for Drummers](http://blog.petersobot.com/machine-learning-for-drummers)

```typescript
interface DrumPatternAnalysis {
  tomRatio: number;        // Toms / total hits
  hihatRatio: number;      // Hihats / total hits
  snareRatio: number;      // Snares / total hits
  kickRatio: number;       // Kicks / total hits
  density: number;         // Hits per beat
  regularity: number;      // How evenly spaced (0-1)
}

function analyzeBarDrumPattern(
  drums: DrumHit[],
  barStart: number,
  barEnd: number,
  beatsPerBar: number
): DrumPatternAnalysis {
  const barDrums = drums.filter(d => d.time >= barStart && d.time < barEnd);
  const total = barDrums.length || 1;

  const counts = { kick: 0, snare: 0, hihat: 0, tom: 0, crash: 0 };
  for (const d of barDrums) {
    counts[d.type]++;
  }

  // Regularity: measure how evenly distributed hits are across beats
  const beatDuration = (barEnd - barStart) / beatsPerBar;
  const beatCounts = new Array(beatsPerBar).fill(0);
  for (const d of barDrums) {
    const beat = Math.min(beatsPerBar - 1, Math.floor((d.time - barStart) / beatDuration));
    beatCounts[beat]++;
  }
  const avgPerBeat = total / beatsPerBar;
  const variance = beatCounts.reduce((a, b) => a + (b - avgPerBeat) ** 2, 0) / beatsPerBar;
  const regularity = 1 / (1 + variance / (avgPerBeat + 0.1));

  return {
    tomRatio: counts.tom / total,
    hihatRatio: counts.hihat / total,
    snareRatio: counts.snare / total,
    kickRatio: counts.kick / total,
    density: total / beatsPerBar,
    regularity,
  };
}

/**
 * Classify bar as fill, breakdown, or normal beat
 */
function classifyBarDrumPattern(
  current: DrumPatternAnalysis,
  neighbors: DrumPatternAnalysis[]
): 'fill' | 'breakdown' | 'beat' {
  // Breakdown: very low density
  if (current.density < 0.5) {
    return 'breakdown';
  }

  // Fill detection using multiple criteria
  const avgNeighborTomRatio = neighbors.reduce((a, b) => a + b.tomRatio, 0) / (neighbors.length || 1);
  const avgNeighborHihatRatio = neighbors.reduce((a, b) => a + b.hihatRatio, 0) / (neighbors.length || 1);

  // Fill criteria:
  // 1. High tom ratio (absolute or relative to neighbors)
  const highToms = current.tomRatio > 0.35 || current.tomRatio > avgNeighborTomRatio * 2;

  // 2. Low hihat ratio (hihats drop out during fills)
  const lowHihats = current.hihatRatio < 0.15 || current.hihatRatio < avgNeighborHihatRatio * 0.5;

  // 3. Irregular timing (fills are less metronomic)
  const irregularTiming = current.regularity < 0.5;

  // Need at least 2 of 3 criteria
  const fillScore = (highToms ? 1 : 0) + (lowHihats ? 1 : 0) + (irregularTiming ? 1 : 0);

  if (fillScore >= 2) {
    return 'fill';
  }

  return 'beat';
}
```

### 5.2 Energy Drop Detection (Breakdowns)

Breakdowns are characterized by sudden energy reduction.

```typescript
interface BreakdownEvent {
  startBar: number;
  endBar: number;
  energyDrop: number;     // How much energy dropped (0-1)
  type: 'full' | 'partial';  // Full breakdown vs. filtered breakdown
}

function detectBreakdowns(
  barFeatures: BarFeatures[],
  minDuration: number = 2,  // Minimum bars
  minDrop: number = 0.5     // Minimum energy drop ratio
): BreakdownEvent[] {
  const breakdowns: BreakdownEvent[] = [];

  // Compute energy per bar (density + velocity)
  const energies = barFeatures.map(b => b.noteDensity * b.avgVelocity);
  const maxEnergy = Math.max(...energies) || 1;
  const normalizedEnergies = energies.map(e => e / maxEnergy);

  // Find consecutive low-energy bars
  let inBreakdown = false;
  let breakdownStart = 0;
  let prevEnergy = normalizedEnergies[0];

  for (let i = 0; i < normalizedEnergies.length; i++) {
    const energy = normalizedEnergies[i];

    if (!inBreakdown && prevEnergy > 0.4 && energy < 0.2) {
      // Start of breakdown
      inBreakdown = true;
      breakdownStart = i;
    } else if (inBreakdown && energy > 0.4) {
      // End of breakdown
      const duration = i - breakdownStart;
      if (duration >= minDuration) {
        const dropRatio = prevEnergy / (normalizedEnergies[breakdownStart - 1] || 1);
        const isPartial = normalizedEnergies.slice(breakdownStart, i).some(e => e > 0.1);

        breakdowns.push({
          startBar: breakdownStart,
          endBar: i,
          energyDrop: 1 - dropRatio,
          type: isPartial ? 'partial' : 'full',
        });
      }
      inBreakdown = false;
    }

    prevEnergy = energy;
  }

  return breakdowns;
}
```

---

## 6. Peak Picking for Boundary Detection

### 6.1 Adaptive Thresholding

Don't use fixed thresholds. Use local statistics.

**Source**: [Audio Labs - Peak Picking](https://www.audiolabs-erlangen.de/resources/MIR/FMP/C6/C6S1_PeakPicking.html)

```typescript
interface Peak {
  index: number;
  value: number;
  isSignificant: boolean;
}

/**
 * Find peaks in novelty curve using adaptive thresholding
 * @param windowSize - Size of local context window
 * @param delta - Minimum height above local mean
 * @param minDistance - Minimum samples between peaks
 */
function findPeaksAdaptive(
  novelty: number[],
  windowSize: number = 16,
  delta: number = 0.1,
  minDistance: number = 4
): Peak[] {
  const peaks: Peak[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 1; i < novelty.length - 1; i++) {
    // Check if local maximum
    if (novelty[i] <= novelty[i - 1] || novelty[i] <= novelty[i + 1]) {
      continue;
    }

    // Compute local statistics
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(novelty.length, i + halfWindow);
    const window = novelty.slice(start, end);

    const localMean = window.reduce((a, b) => a + b, 0) / window.length;
    const localMax = Math.max(...window);

    // Adaptive threshold: must be above local mean + delta * local range
    const threshold = localMean + delta * (localMax - localMean);
    const isSignificant = novelty[i] > threshold;

    // Check minimum distance from previous peak
    const lastPeak = peaks[peaks.length - 1];
    if (lastPeak && i - lastPeak.index < minDistance) {
      // Keep higher peak
      if (novelty[i] > lastPeak.value) {
        peaks[peaks.length - 1] = { index: i, value: novelty[i], isSignificant };
      }
      continue;
    }

    peaks.push({ index: i, value: novelty[i], isSignificant });
  }

  return peaks;
}
```

### 6.2 Multi-Scale Peak Fusion

Combine peaks from different kernel sizes for robust detection.

```typescript
interface BoundaryCandidate {
  bar: number;
  confidence: number;
  scales: number[];  // Which kernel sizes detected this
}

function detectBoundariesMultiScale(
  ssm: number[][],
  kernelSizes: number[] = [4, 8, 16]
): BoundaryCandidate[] {
  const allPeaks: Map<number, { confidence: number; scales: number[] }> = new Map();

  for (const L of kernelSizes) {
    const kernel = computeCheckerboardKernel(L);
    const novelty = computeNoveltyFromSSM(ssm, kernel);
    const peaks = findPeaksAdaptive(novelty, L * 2, 0.15, L);

    for (const peak of peaks.filter(p => p.isSignificant)) {
      const existing = allPeaks.get(peak.index);
      if (existing) {
        existing.confidence += peak.value;
        existing.scales.push(L);
      } else {
        allPeaks.set(peak.index, { confidence: peak.value, scales: [L] });
      }
    }
  }

  // Convert to array and sort by confidence
  const candidates: BoundaryCandidate[] = [];
  for (const [bar, data] of allPeaks) {
    // Boost confidence for boundaries detected at multiple scales
    const scaleBonus = 1 + (data.scales.length - 1) * 0.3;
    candidates.push({
      bar,
      confidence: data.confidence * scaleBonus,
      scales: data.scales,
    });
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}
```

---

## 7. Complete Pipeline: Recommended Implementation

### 7.1 Unified Transition Detection

```typescript
interface TransitionEvent {
  bar: number;
  time: number;
  type: 'section' | 'stab' | 'fill' | 'breakdown' | 'buildup';
  confidence: number;
  features: {
    novelty?: number;
    energyDelta?: number;
    polyphony?: number;
    velocity?: number;
  };
}

function detectTransitions(
  notes: NoteEvent[],
  drums: DrumHit[],
  barDuration: number,
  beatsPerBar: number,
  numBars: number
): TransitionEvent[] {
  const transitions: TransitionEvent[] = [];

  // 1. Extract per-bar features
  const barFeatures: BarFeatures[] = [];
  for (let bar = 0; bar < numBars; bar++) {
    const start = bar * barDuration;
    const end = start + barDuration;
    barFeatures.push(extractBarFeatures(notes, start, end));
  }

  // 2. Build SSM and compute novelty at multiple scales
  const ssm = buildSSM(barFeatures);
  const boundaries = detectBoundariesMultiScale(ssm, [4, 8, 16]);

  for (const boundary of boundaries) {
    transitions.push({
      bar: boundary.bar,
      time: boundary.bar * barDuration,
      type: 'section',
      confidence: boundary.confidence,
      features: { novelty: boundary.confidence },
    });
  }

  // 3. Detect orchestral stabs
  const stabs = detectOrchestralStabs(notes, barDuration, beatsPerBar);
  for (const stab of stabs) {
    transitions.push({
      bar: stab.bar,
      time: stab.time,
      type: 'stab',
      confidence: stab.strength,
      features: {
        polyphony: stab.polyphony,
        velocity: stab.avgVelocity,
      },
    });
  }

  // 4. Detect drum fills and breakdowns
  for (let bar = 0; bar < numBars; bar++) {
    const start = bar * barDuration;
    const end = start + barDuration;
    const current = analyzeBarDrumPattern(drums, start, end, beatsPerBar);

    const neighbors: DrumPatternAnalysis[] = [];
    for (const offset of [-2, -1, 1, 2]) {
      const neighborBar = bar + offset;
      if (neighborBar >= 0 && neighborBar < numBars) {
        const nStart = neighborBar * barDuration;
        const nEnd = nStart + barDuration;
        neighbors.push(analyzeBarDrumPattern(drums, nStart, nEnd, beatsPerBar));
      }
    }

    const classification = classifyBarDrumPattern(current, neighbors);

    if (classification === 'fill') {
      transitions.push({
        bar,
        time: start,
        type: 'fill',
        confidence: 0.7,
        features: {
          energyDelta: current.tomRatio,
        },
      });
    } else if (classification === 'breakdown') {
      transitions.push({
        bar,
        time: start,
        type: 'breakdown',
        confidence: 0.8,
        features: {
          energyDelta: -current.density,
        },
      });
    }
  }

  // 5. Sort by time and deduplicate nearby events
  transitions.sort((a, b) => a.time - b.time);

  const deduped: TransitionEvent[] = [];
  for (const t of transitions) {
    const last = deduped[deduped.length - 1];
    if (!last || t.time - last.time > barDuration * 0.5) {
      deduped.push(t);
    } else if (t.confidence > last.confidence) {
      deduped[deduped.length - 1] = t;
    }
  }

  return deduped;
}
```

---

## 8. JavaScript Libraries

### 8.1 Meyda

Audio feature extraction for Web Audio API.

**Features**: RMS, spectral centroid, spectral flux, zero crossing rate, MFCC
**Use case**: Real-time audio analysis (not MIDI)
**Source**: [Meyda GitHub](https://github.com/meyda/meyda)

### 8.2 Essentia.js

WebAssembly port of the Essentia C++ library.

**Features**: Onset detection, beat tracking, key detection, chord detection
**Use case**: Full MIR pipeline in browser
**Source**: [Essentia.js](https://mtg.github.io/essentia.js/)

### 8.3 Tonal.js

Music theory library (already in our project).

**Features**: Chord detection, key analysis, scale/interval calculations
**Use case**: Symbolic (MIDI) analysis
**Source**: [Tonal.js](https://github.com/tonaljs/tonal)

### 8.4 libfmp (Python reference)

Reference implementations for FMP notebooks.

**Features**: SSM computation, novelty functions, checkerboard kernels
**Use case**: Algorithm reference (port to TypeScript)
**Source**: [libfmp GitHub](https://github.com/meinardmueller/libfmp)

---

## 9. Recommendations for Our Use Case

### 9.1 Priority Order

| Feature | Algorithm | Complexity | Impact |
|---------|-----------|------------|--------|
| **Stab detection** | Polyphony + velocity clustering | Low | High |
| **Fill detection** | Tom ratio + hihat dropout | Low | High |
| **Section boundaries** | SSM + checkerboard novelty | Medium | Medium |
| **Breakdowns** | Energy envelope thresholding | Low | Medium |
| **Buildups** | Rising energy + filter sweep | Medium | Low |

### 9.2 Implementation Strategy

**Phase 1**: Improve current heuristics (1-2 hours)
- Replace fixed thresholds with adaptive (local contrast)
- Add velocity clustering for stab detection
- Refine tom ratio calculation for fills

**Phase 2**: Add SSM-based structure analysis (half day)
- Implement bar feature extraction
- Build SSM from pitch histograms + energy
- Add checkerboard novelty computation

**Phase 3**: Multi-scale fusion (optional, 1 day)
- Multiple kernel sizes
- Peak fusion across scales
- Confidence scoring

### 9.3 Key Insights

1. **Use relative contrasts, not absolute thresholds** - A velocity of 0.7 means nothing without context. Compare to local average.

2. **Leverage lookahead** - We have the full MIDI parsed. Use future context for detection (unlike real-time audio analysis).

3. **Combine multiple signals** - No single feature is reliable. Stabs need high polyphony AND high velocity AND short duration.

4. **Respect temporal constraints** - Fills are 1-2 bars max. Multiple consecutive "fills" = probably steady beat mislabeled.

5. **Scale-aware detection** - Use small kernels for phrase boundaries, large kernels for sections.

---

## 10. References

### MIR Foundations
- [Audio Labs - Novelty-Based Segmentation](https://www.audiolabs-erlangen.de/resources/MIR/FMP/C4/C4S4_NoveltySegmentation.html)
- [Audio Labs - Onset Detection](https://www.audiolabs-erlangen.de/resources/MIR/FMP/C6/C6S1_OnsetDetection.html)
- [Audio Labs - Peak Picking](https://www.audiolabs-erlangen.de/resources/MIR/FMP/C6/C6S1_PeakPicking.html)
- [TISMIR - Audio-Based Music Structure Analysis](https://transactions.ismir.net/articles/10.5334/tismir.54)

### Symbolic Music Analysis
- [Symbolic Music Structure Analysis with Graph Representations](https://ar5iv.labs.arxiv.org/html/2303.13881)
- [Barwise Section Boundary Detection](https://arxiv.org/abs/2509.16566)

### Libraries
- [libfmp Documentation](https://meinardmueller.github.io/libfmp/build/html/index_c4.html)
- [Essentia.js](https://mtg.github.io/essentia.js/)
- [Meyda](https://meyda.js.org/)

### Drum Analysis
- [Machine Learning for Drummers](http://blog.petersobot.com/machine-learning-for-drummers)
- [GrooVAE: Generating and Controlling Expressive Drum Performances](https://magenta.tensorflow.org/groovae)
