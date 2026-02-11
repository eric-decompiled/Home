# Harmony-Based Graph Connection Theory

Research synthesis for meaningful musical connections in Graph Sculpture.

## Current State

The graph uses:
- **Tonnetz intervals** (thirds/fifths)
- **4-bar TTL** for connection eligibility
- **Register hierarchy** (bass/mid/melody cross-connections only)

This is musically sound but static. Missing: **functional harmony**—how chords pull toward resolution, how voices move, how tension creates natural patterns.

## Key Insight

**Connections should encode meaning, not just proximity.** A V→I connection should "feel" different from V→vi because they mean fundamentally different things.

---

## Three-Tier Connection Framework

### Tier 1: Structural (highest priority, persist longest)
- **V→I resolutions** - The strongest musical pull
- **Common tone relationships** - Notes shared between chords
- **Tendency tone resolutions** - Leading tone→tonic, tritone convergence
- **Chord membership** - Root/third/fifth of current harmony

### Tier 2: Harmonic (medium priority)
- **T-S-D-T functional progressions** - Natural harmonic cycle
- **Tonnetz neighbors** - Thirds and fifths (already implemented)
- **Voice-leading stepwise motion** - Small intervals preferred

### Tier 3: Texture (lowest priority, decay quickly)
- **Chromatic passing tones**
- **Non-harmonic tones** (anticipations, neighbor tones)
- **Large melodic leaps**

---

## Harmonic Function Theory

Each chord has a **function** in the key:

| Function | Chords | Character |
|----------|--------|-----------|
| **Tonic (T)** | I, vi, (iii) | Rest, resolution target |
| **Subdominant (S)** | IV, ii | Preparation, departure |
| **Dominant (D)** | V, vii° | Tension, wants to resolve |

### Connection Strength by Progression

| Progression | Strength | Reason |
|-------------|----------|--------|
| D→T (V→I) | 2.0x | Strongest resolution |
| S→D (IV→V, ii→V) | 1.4x | Tension rising |
| T→S (I→IV) | 1.2x | Natural departure |
| T→T (I→vi) | 0.7x | Weaker motion |

---

## Voice Leading Rules

How individual melodic lines move:

1. **Stepwise motion preferred** - Intervals ≤ 2 semitones
2. **Common tone retention** - Same note stays across chords
3. **Tendency tone resolution** - Chromatic pitches resolve by step
4. **Leading tone** (scale degree 7) → Resolves UP to tonic

### Voice Motion Classification

```typescript
function classifyVoiceMotion(from: number, to: number) {
  const interval = Math.abs(to - from);
  return {
    stepwise: interval <= 2,           // Strong connection
    small_leap: interval <= 4,         // Moderate connection
    large_leap: interval > 4,          // Weak connection
    common_tone: interval === 0,       // Very strong
  };
}
```

---

## Tension/Resolution Dynamics

### Adaptive Edge Persistence

Instead of fixed 4-bar TTL:

| Harmonic Context | Edge TTL |
|------------------|----------|
| **V→I resolution** | 32 bars (near-permanent) |
| **Stable harmony (I, vi)** | 6 bars |
| **High tension (V7, vii°)** | 2 bars |

### Physics Modulation by Tension

| Tension Level | Spring Rest | Effect |
|---------------|-------------|--------|
| High (> 0.7) | 80px | Tight, agitated clustering |
| Low (< 0.3) | 160px | Loose, spacious |
| Normal | 120px | Default |

---

## Tendency Tones

Notes that "want" to resolve:

| Tone | Context | Resolution |
|------|---------|------------|
| **Tritone** | Dom7 chord | Converges inward |
| **Leading tone** (7) | Any | Up to tonic (1) |
| **Sus4** | Sus chord | Down to third |

These create **pull connections** stronger than regular Tonnetz neighbors.

---

## Common Tone Affinity

When chords share notes, voice leading is smooth:

| Common Tones | Affinity | Example |
|--------------|----------|---------|
| 0 | 0.7x | C→F (no shared notes) |
| 1 | 1.0x | Normal |
| 2 | 1.3x | C→Am (share C, E) |
| 3 | 1.5x | Very smooth |

---

## Implementation Roadmap

### Phase 1: Foundation (Low Risk)
1. Add `harmonicFunction` to chord events (tonic/subdominant/dominant)
2. Compute `commonTones` between consecutive chords
3. Increase edge persistence for V→I, I→IV, IV→V
4. Track `isResolution` flag

### Phase 2: Voice Leading
1. Classify voice motions (stepwise, leap, tendency tone)
2. Weight edge creation by voice-leading type
3. Add tendency tone metadata to nodes

### Phase 3: Tension Dynamics
1. Make edge TTL adaptive (2-6 bars based on tension)
2. Adjust spring rest length by chord stability
3. Stronger glow on structural edges

---

## Practical Connection Score

```typescript
function computeConnectionScore(from, to, context) {
  let score = 0;

  // Tier 1: Structural (weight 3.0)
  if (context.isResolution) score += 2.0 * 3.0;
  if (context.commonTones > 0) score += context.commonTones * 0.5 * 3.0;
  if (isChordTone(from.pc, context.chord)) score += 1.0 * 3.0;

  // Tier 2: Harmonic (weight 2.0)
  if (context.voiceLeading.stepwise) score += 1.0 * 2.0;
  score += functionStrength(context.fromChord, context.toChord) * 2.0;

  // Tier 3: Texture (weight 1.0)
  if (areTonnetzNeighbors(from.pc, to.pc)) score += 1.0;

  return score / 6.0;  // Normalize
}
```

---

## Quick Wins for Graph Sculpture

1. **V→I edges get 2x strength and 8x TTL** - The most important progression
2. **Common tone nodes connect more readily** - Smooth voice leading
3. **High tension = faster edge decay** - Visual breathing with harmony
4. **Tendency tones glow brighter** - Show unresolved tension

---

## References

- Lerdahl & Krumhansl (2007). Modeling tonal tension
- Cohn (1998). Neo-Riemannian theory
- Piston (1987). Harmony
- Schenker (1979). Free Composition
