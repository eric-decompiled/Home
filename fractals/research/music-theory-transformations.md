Based on my comprehensive research, here is the complete report on **Music Theory Transformations for Visualization**:

---

# Music Theory Transformations for Visualization

*A comprehensive guide to non-standard music theories for interactive harmonic visualization in the Fractured Jukebox.*

---

## Executive Summary

This report synthesizes Neo-Riemannian theory, transformational music theory, pitch-class set theory, and voice-leading parsimony into actionable strategies for music visualization. The key insight: **chord progressions are geometric transformations in multi-dimensional harmonic space**. By mapping these transformations to visual parameters (rotation, morphing, color shift, brightness), we can create compelling, musically-informed animations that respond to harmonic motion in real-time.

The existing Tonnetz implementation in the codebase provides an excellent foundation. This report extends that work with deeper theoretical context and practical applications.

---

## 1. Neo-Riemannian Theory Fundamentals

### 1.1 Overview

Neo-Riemannian theory extends 19th-century harmonic ideas from Hugo Riemann into a modern, group-theoretic framework. Developed primarily in the late 20th century, it models harmonic progressions by applying geometric transformations to major and minor triads, prioritizing **parsimonious voice leading**—movement that preserves two common tones while changing the third by only 1-2 semitones.

**Why it matters for visualization:**
- Triads become geometric objects (triangles on the Tonnetz)
- Transformations become visible movements and shape changes
- Voice-leading parsimony translates to smooth, continuous animation

### 1.2 The Three Basic Transformations (P, L, R)

Each transformation preserves exactly two of three pitch classes while moving the third by semitone. These are the ONLY triadic transformations that maintain two common tones—making them "parsimonious" and musically natural.

#### P (Parallel) Transformation
- **Connects:** Major triad ↔ Minor triad on the same root
- **Example:** C major (C-E-G) → C minor (C-Eb-G)
- **Mechanism:** Only the third changes (E→Eb, a semitone down)
- **Voice leading:** Most efficient—two tones stay, one moves minimally
- **Musical context:** Chromatic modal mixture, relative major/minor borrowing
- **Visual mapping:** Color shift (brighter ↔ darker), blur intensification

#### L (Leading-tone exchange) Transformation
- **Connects:** Major triad → Minor triad a major third higher
- **Example:** C major (C-E-G) → E minor (E-G-B)
- **Mechanism:** Root becomes third, G→B (semitone), E stays
- **Preservation:** E-G common tones
- **Musical context:** Chromatic harmony, post-tonal music, voice leading through thirds
- **Visual mapping:** Rotation (±60°), spatial drift upward-right on Tonnetz

#### R (Relative) Transformation
- **Connects:** Major triad ↔ Its relative minor
- **Example:** C major (C-E-G) → A minor (A-C-E)
- **Mechanism:** E→A (semitone), C and E retained
- **Preservation:** C and E common tones
- **Musical context:** Most common in classical/tonal music; very smooth voice leading
- **Visual mapping:** Gentle rotation (~-120° on Tonnetz), shape morph, saturation change

#### Combined Transformations
Operations can be chained:
- **LP** = L then P
- **PL** = P then L
- **RL** = R then L
- **PR** = P then R
- **RP** = R then P
- **RLP** (cycle of 6 transpositions around triadic space)

### 1.3 The Tonnetz (Tone Network)

The Tonnetz is a planar (topologically, toroidal) lattice representing all chromatic pitches and their harmonic relationships. Originally conceived by Leonhard Euler (1739), it was revived and formalized for Neo-Riemannian analysis.

#### Structure

The Tonnetz arranges pitches along three simplicial (triangular) axes:

```
        Perfect Fifth (→)
           ↗
       ↗
      ↗
  Major Third (↘)
   ↘
    ↘
Minor Third (↙)
```

Each pitch appears at the intersection of these three intervals. The standard arrangement:

```
      F#      C#       G#       D#       A#
     /  \\    /  \\    /  \\    /  \\    /  \\
    B    D# A     E  B    F# C#   G# D#  A#
     \\  /    \\  /    \\  /    \\  /    \\  /
      A      E       B      F#      C#
     /  \\    /  \\    /  \\    /  \\    /  \\
    F#   A  E     B  F#    C# G#    D# A#
     \\  /    \\  /    \\  /    \\  /    \\  /
      E      B       F#      C#      G#
     /  \\    /  \\    /  \\    /  \\    /  \\
    C#   F# B     F# C#    G# D#    A# E
     \\  /    \\  /    \\  /    \\  /    \\  /
      B      F#      C#      G#      D#
```

**Equivalence and Topology:**
- Enharmonic equivalence (G♯ = A♭) is assumed
- This wraps the infinite planar graph into a **torus** (donut shape)
- The 12 pitch classes form a closed cycle
- Any transformation can eventually return to the starting pitch class

#### Geometric Relationships

| Interval | Direction | Pitch Change | Meaning |
|----------|-----------|--------------|---------|
| Perfect 5th | Horizontal (→) | Up by 7 semitones | Circle of fifths motion |
| Major 3rd | Diagonal (↘) | Up by 4 semitones | Major third leap |
| Minor 3rd | Diagonal (↙) | Up by 3 semitones | Minor third leap |

**Triads on the Tonnetz:**

Each triad appears as an **equilateral triangle**:
- **Major triad:** Root at bottom-left, third at bottom-right, fifth at top
- **Minor triad:** Inverted orientation (bottom-right is root)
- **Adjacent triangles** share exactly two vertices (the common tones)

**P, L, R as Movements:**

On the Tonnetz, transformations are simply **moving from one triangle to an adjacent triangle**:
- **P transformation:** Flip vertically (share the root and fifth)
- **L transformation:** Flip along the major-third diagonal (share root and minor third)
- **R transformation:** Flip along the perfect-fifth diagonal (share third and fifth)

### 1.4 PLR Group and Algebraic Structure

The three operations P, L, R form a **group** under composition (combining operations). This group has special properties:

#### Group Properties

```
P² = I   (P applied twice returns to start)
L³ = I   (L applied three times returns to start)
R² = I   (R applied twice returns to start)
```

This means:
- **P is an involution:** applying it twice gives the identity
- **L is a 3-cycle:** applying it three times cycles through three transformations
- **R is an involution:** applying it twice gives the identity

#### PLR Subgroup

The generated group `<P, L, R>` has **24 elements** and acts on the set of all major and minor triads. The group structure reveals deep relationships:

- **Hexatonic systems:** 6-triad cycles that never repeat (e.g., RL repeated)
- **PL cycles:** Create smooth progressions used in post-tonal music
- **LP cycles:** Generate different harmonic regions

#### Orbits Under Transformation

Starting from C major, applying transformations generates **orbits**—sets of chords reachable through combinations:

```
C major → (P) → C minor → (P) → C major [identity cycle]
C major → (L) → E minor → (L) → G♯ minor → (L) → C major [3-cycle]
C major → (R) → A minor → (R) → C major [identity cycle]
C major → (LP) → [6-triad cycle]
```

**Visualization insight:** Each orbit can be a separate visual "region" or "mode" the harmony passes through.

### 1.5 Summary Table: P, L, R at a Glance

| Operation | Geometry | Voice Leading | Musical Context | Visual Effect |
|-----------|----------|----------------|-----------------|---------------|
| **P** | Vertical flip | Root↔minor3rd swap | Modal mixture | Color flip (major↔minor hue) |
| **L** | Major-3rd flip | Root→minor3rd, p5→root | Post-tonal, chromatic | Rotate ~120° CCW, shift up-right |
| **R** | Perfect-5th flip | minor3rd→p5, root→minor3rd | Classical, most common | Rotate ~-120°, gentle morph |
| **Compound (LP)** | — | Root→p5→minor3rd→root | Hexatonic systems | Complex spiral path |
| **Compound (RL)** | — | Alternating flips | Weitzmann regions | Oscillatory motion |

---

## 2. Related and Adjacent Theories

### 2.1 Transformational Theory (David Lewin)

Transformational theory, formalized by David Lewin in his landmark 1987 work *Generalized Musical Intervals and Transformations*, generalizes music analysis beyond pitch intervals to any musical properties.

#### Key Concept: Generalized Interval Systems (GIS)

A **GIS** is a triple: `(S, IVLS, int)` where:

- **S** = Space of elements (chords, pitches, timbres, durations, etc.)
- **IVLS** = Group of intervals (mathematical group; operations that transform elements)
- **int** = Function mapping pairs of elements to intervals: `int(x, y)` = "the interval from x to y"

**Example:** Pitch space
- S = {C, C♯, D, ...} (12 pitch classes)
- IVLS = Transposition group (T₀, T₁, ..., T₁₁)
- int(C, G) = T₇ (transposition by a perfect fifth)

**Example:** Triadic space (Neo-Riemannian)
- S = {all major and minor triads}
- IVLS = {P, L, R, LP, PL, ...} (group of triadic transformations)
- int(C major, E minor) = L (the transformation connecting them)

#### Advantages Over Set Theory

1. **Captures "motion" as primitive concept** — Not just static collections, but transformations between states
2. **Bidirectional analysis** — Can ask "what transforms x into y?" rather than just describing x
3. **Psychologically grounded** — Models how listeners perceive harmonic progression as directed motion
4. **Flexible domains** — Applies to any musical property, not just pitch

#### Voice-Leading Spaces (Geometric Application)

Lewin's framework enables modeling music in **voice-leading spaces** where:
- Each point represents a chord (e.g., C major in a specific voicing)
- Distance between points measures voice-leading efficiency
- Paths through space model chord progressions
- Geometry is often non-Euclidean (curved space better captures harmonic proximity)

**Visualization application:** Chord progressions become **paths through multi-dimensional space**. High-tension harmonies occupy "distant" regions; resolutions move toward "central" regions.

### 2.2 Pitch-Class Set Theory

Pitch-class set theory (PCST) is a formalized approach to organizing unordered collections of pitch classes, foundational for 20th-century and atonal music analysis.

#### Basic Concepts

**Pitch-class set:** An unordered collection of pitch classes. Example: {C, E, G} = major triad, represented as {0, 4, 7} in integer notation (C=0).

**Set operations:**
- **Transposition (Tₙ):** Add n semitones to all pitches
- **Inversion (I):** Flip around an axis (often around C)
- **Rotation:** Rearrange pitches cyclically

#### Cardinality and Types

| Size | Name | Examples |
|------|------|----------|
| 2 | Dyad | Interval pairs (tritone, major 6th, etc.) |
| 3 | Trichord | Triads (major, minor, diminished, augmented) |
| 4 | Tetrachord | Dominant 7ths, diminished 7ths, etc. |
| 5-11 | Higher sets | Larger collections |

#### Set Classes and Invariance

Sets that share the same **interval content** (ignering transposition/inversion) belong to the same **set class**. There are 208 distinct set classes in 12-tone equal temperament.

**Visualization potential:** Set classes can be mapped to color families; operations (transposition, inversion) become geometric transformations.

### 2.3 Voice-Leading Parsimony

Parsimonious voice leading is the principle of **minimal motion**—the best voice leadings connect chords where common tones are retained and the changing tone moves by the smallest interval.

#### Parsimony Metrics

| Type | Measure | Example |
|------|---------|---------|
| **Chromatic parsimony** | Sum of semitone movements across voices | C → Db: 1 semitone |
| **Diatonic parsimony** | Number of diatonic steps moved | In C major: C→D is 1 step |
| **Voice-exchange parsimony** | Voices swap via opposite-motion leaps | Inner voices exchange roles smoothly |

#### Implications for Music

1. **Smooth progressions feel natural** — Listeners expect efficient voice leading
2. **Chromatic music uses chromatic parsimony** — Smooth step-wise movement
3. **Tonal music balances functionality with parsimony** — V→I resolves via tendencies AND smooth voice leading
4. **Jazz chord voicings optimize parsimony** — Drop-2/drop-3 voicings minimize movement

**Visualization insight:** Measure voice-leading distance between consecutive chords; map distance to animation intensity (smaller distance = smoother animation, larger distance = more abrupt transition).

### 2.4 Diatonic Set Theory

Diatonic set theory formalizes the structure of major and minor scales and diatonic chord progressions.

#### The Diatonic Collection

A diatonic scale is an unordered set of 7 pitch classes (in major) or their rotations (in minor). Major scale intervals:

```
W - W - H - W - W - W - H
C   D   E   F   G   A   B   C
```

Where W = whole step (2 semitones), H = half step (1 semitone).

#### Diatonic Bias in Chord Detection

In tonal music, listeners expect chords to respect the key signature. Diatonic set theory captures this:

- **Diatonic triads:** Built on scale degrees (I, ii, iii, IV, V, vi, vii°)
- **Chromatic chords:** Outside the diatonic set (borrowed chords, secondary dominants)
- **Ambiguity:** Some chords fit multiple keys (e.g., A minor fits both C major and F major)

**Visualization application:** Diatonic chords = "in-key" colors; chromatic chords = "surprise" colors or visual disruption. Tension increases when moving outside the diatonic set.

### 2.5 Hexatonic and Cyclic Systems

Hexatonic systems are 6-triad cycles that cycle infinitely without repeating, useful in post-tonal music:

```
C major → (RL)⁶ → [cycles through 6 unique chords, then repeats]
```

Examples:
- **RL cycle:** Creates oscillating up/down major-third motion
- **LPR cycle:** Hexatonic system (Richard Cohn's research)

**Visualization:** Hexatonic systems form **closed loops** in visual space; useful for modal interchange and chromatic harmony visualization.

---

## 3. Visual and Geometric Mappings

### 3.1 From Theory to Pixels: The Mapping Problem

The challenge: how do we represent abstract harmonic transformations as visual changes?

**Key principles:**
1. **Preserve audio-visual synchronization** — Visual changes align with harmonic motion
2. **Make relationships visible** — Triads that are P, L, R related should show recognizable geometric relationships
3. **Maintain cognitive clarity** — Viewers should intuitively grasp harmonic function through visuals
4. **Allow non-experts to enjoy** — Visualizations should be beautiful even without music theory knowledge

### 3.2 Geometric Spaces for Harmonic Visualization

#### 2D Tonnetz Grid (Current Implementation)

The Fractured Jukebox already implements a 2D Tonnetz. This is excellent because:

- **Triads are visible as triangles** — Geometry directly represents voice-leading relationships
- **Adjacent triangles share edges** — Visual proximity = harmonic proximity
- **Transformations are movements** — P, L, R become visible geometric operations

**Limitations:**
- Only shows pitch-class relationships
- Doesn't encode voice-leading geometry (which is higher-dimensional)
- Assumes equal-temperament enharmonic equivalence

#### Voice-Leading Spaces (Higher-Dimensional)

Dmitri Tymoczko's research shows that voice-leading distance can be modeled as:

**Orbifold spaces:**
- n notes in a chord → n-dimensional space
- Quotient by symmetries → orbifold (curved space with singularities)
- Voice-leading distance measured geodesically (shortest path on curved surface)

**Example:** 3-note chords (triads) live in a 3-dimensional orbifold:
- "Close by" in voice-leading space → geometrically near in orbifold
- Smooth progressions follow geodesic curves
- High-tension movements cut across the space

**Visualization potential:** Animate a path through this orbifold as the music progresses. Color intensity represents distance from "home" triad (tonic).

#### Circle of Fifths

A 1D circular space representing root relationships:

```
            C
       F       G
    Bb          D
 Eb              A
 Db             E
    Ab          B
       Eb       F#
            C#
```

**Strengths:**
- Simple, intuitive to musicians
- Distances naturally encode harmonic function
- Well-suited for modulation visualization

**Mappings:**
- **Position on circle** → Harmonic distance from tonic
- **Rotation** → Key changes (modulations)
- **Radial distance from center** → Chord tension
- **Color** → Chord quality (major/minor/7th)

### 3.3 Color Mappings for Harmonic Quality

The following systems map harmonic properties to color:

#### System 1: Carulli's Color Harmonies

Each pitch class gets a characteristic color:

| PC | Color | Rationale |
|----|-------|-----------|
| C | Red | Tonic |
| G | Orange | Dominant (warm, energetic) |
| F | Blue | Subdominant (cool) |
| D | Yellow | Secondary brightness |
| A | Purple | Relative minor tones |
| E | Green | Natural, median |

**Modal brightness:** Major = bright; Minor = dark/desaturated version of same hue.

#### System 2: Brightness/Darkness by Major/Minor

- **Major triads:** Bright, saturated versions
- **Minor triads:** Darker, muted versions
- **Dominant 7ths:** Add orange/warmth (tritone tension)
- **Diminished:** Sharp, angular appearance (visual distortion)
- **Augmented:** Floating, diffuse (ambiguity → visual ambiguity)

#### System 3: Spectral Color Wheel

Map 12 pitch classes to the visible spectrum (rainbow), with each octave as a cycle:

```
C=Red, C#=Red-Orange, D=Orange, ..., B=Violet
```

This creates natural harmonic relationships:
- Tritone = opposite colors (visual dissonance)
- Perfect fifth = nearby colors (visual consonance)
- Major third = ~120° apart (complementary tertiary colors)

### 3.4 Existing Visualization Examples

#### Chrome Music Lab (Harmonics)
- Shows overtone series as stacked waveforms
- Pitch-color mapping using rainbow spectrum
- Interactive exploration of harmonic content

#### Harmonic Maps (Interactive Research)
- Real-time 2D visualization of 3-note chord spaces
- Spectral analysis to compute harmonic descriptors (concordance, roughness)
- Maps to pixel position using dimensionality reduction

#### Topologica (Jon Latané)
- Domain-specific language for defining musical orbifolds
- Allows traversing chord spaces via gesture/UI
- Text-based notation for specifying musical paths

#### Visual Harmony Software (Educational)
- Circle of fifths as primary visualization
- Chord roots highlighted on circle
- Tension shown as radial displacement

### 3.5 Mapping Table: Harmonic Feature → Visual Parameter

| Harmonic Feature | Visual Parameter | Range | Notes |
|------------------|------------------|-------|-------|
| **Triad position on Tonnetz** | (x, y) position | Screen bounds | Direct mapping; use Tennetz hex coords |
| **P/L/R transformation** | Rotation angle | 0-360° | P=vertical, L/R=±120° |
| **Chord tension** | Brightness/saturation | 0.3-1.0 | Low tension = dim; high tension = bright |
| **Harmonic function (T/S/D)** | Distance from center | 0-max radius | Tonic = center; dominant = periphery |
| **Modulation (key change)** | Hue shift | 0-360° (hue wheel) | Or screen rotation; smooth interpolation |
| **Voice-leading distance** | Animation smoothness | Duration (ms) | Smooth = short duration; abrupt = long |
| **Common tones** | Edge/connection strength | Width, opacity | More common tones = stronger visual link |
| **Secondary dominants** | Glow/pulse intensity | 0-1 | Enhanced visual urgency |
| **Chord quality (7ths, suspended)** | Shape distortion | Parametric | Aug = round; dim = sharp; sus = open |

---

## 4. Synthesis: Transformations for Fractured Jukebox Visualization

This section translates theory into specific, actionable features for the visualizer.

### 4.1 Real-Time Transformation Tracking

**Goal:** Detect and visualize P, L, R transformations as chords change.

**Implementation:**

```typescript
interface TransformationEvent {
  fromChord: ChordEvent;
  toChord: ChordEvent;
  transformation: 'P' | 'L' | 'R' | 'LP' | 'PL' | 'RL' | 'PR' | 'none';
  commonTones: number;  // 2 = parsimonious, <2 = leap
  voiceLeadingDistance: number;  // Semitone distance
}

function detectTransformation(from: ChordEvent, to: ChordEvent): TransformationEvent {
  const fromPCs = getTriadPitchClasses(from);
  const toPCs = getTriadPitchClasses(to);
  
  // Count common tones (modulo octave)
  const common = fromPCs.filter(pc => toPCs.includes((pc + 12) % 12));
  
  // Classify transformation
  let transformation = 'none';
  if (common.length === 2) {
    // Parsimonious - determine P, L, or R
    transformation = classifyParsimonious(from, to);
  }
  
  return {
    fromChord: from,
    toChord: to,
    transformation,
    commonTones: common.length,
    voiceLeadingDistance: computeVLDistance(from, to),
  };
}
```

**Visual response:**

| Transformation | Visual Feedback |
|---|---|
| **P (parallel)** | Vertical mirror/flip animation + color shift (major ↔ minor hue) |
| **L (leading-tone)** | Rotate canvas 60° CCW + shift upward on screen + fade old triad |
| **R (relative)** | Rotate canvas -60° + gentle morph + desaturate/saturate |
| **Parsimonious sequence** | Smooth, continuous animated path on Tonnetz; glow on common tones |
| **Non-parsimonious leap** | Abrupt transition; visual "jump"; color flash to indicate surprise |

### 4.2 Tonnetz Animation Enhancements

**Current state:** Tonnetz shows static grid + current chord triangles + history path.

**Proposed enhancements:**

#### Feature 1: Transformation Arrow/Path

When a P, L, or R transformation occurs, draw an animated arrow showing the geometric relationship:

```
C major (triangle 1) → [animated arrow] → E minor (triangle 2)
```

The arrow indicates:
- **Direction:** Which way the transformation moves on Tonnetz
- **Length:** Encodes voice-leading distance (longer = larger jump)
- **Color:** Indicates type (P=purple, L=orange, R=cyan)

#### Feature 2: Common Tone Highlighting

Highlight or glow the notes that are preserved in the transformation:

```
C major: C[glow], E, G → (P) → C[glow], Eb, G
```

This makes the "minimal movement" principle visible.

#### Feature 3: Orbital Trails

For longer progressions, draw subtle trails showing the path through Tonnetz space:

```
C major → G major → D major → A major → [glowing path shows circle-of-fifths movement]
```

Different colors for different transformation types:
- **Red trails:** P transformations
- **Orange trails:** L transformations
- **Cyan trails:** R transformations

#### Feature 4: Tension-Driven Scale

Scale the hexagon grid size based on harmonic tension:

- **High tension (V7, vii°):** Small hexagons, tight clustering (visual density)
- **Low tension (I, vi):** Large hexagons, spacious layout (visual calm)

This makes harmonic state viscerally apparent.

### 4.3 Chord Morphing Animation

**Goal:** Smooth visual transition between chord shapes during parsimonious transformations.

**Implementation:**

For parsimonious progressions, interpolate the visual representation of each pitch:

```typescript
function animateParsimonious(from: ChordEvent, to: ChordEvent, duration: number) {
  const fromVoicing = getOptimalVoicing(from);
  const toVoicing = getOptimalVoicing(to);
  
  // Animate each voice independently
  for (let v = 0; v < 3; v++) {
    const fromPitch = fromVoicing[v];
    const toPitch = toVoicing[v];
    
    if (fromPitch === toPitch) {
      // Common tone - no movement
      holdPosition(v, fromPitch);
    } else {
      // Changing tone - smooth glide
      animateGlide(v, fromPitch, toPitch, duration);
    }
  }
  
  // Color transition
  const fromColor = getChordColor(from);
  const toColor = getChordColor(to);
  animateColorShift(fromColor, toColor, duration);
}
```

**Visual effects:**

1. **Common tone holds position** — It literally doesn't move on screen
2. **Changing tone glides smoothly** — Draws attention to the "motion" aspect
3. **Chord outline morphs** — Triangle shape transforms via interpolation
4. **Glow pulses on arrival** — Beat arrival signal syncs with animation end

### 4.4 Modulation Visualization

**Goal:** Show key changes as visually distinct transitions.

**Strategies:**

#### Strategy 1: Canvas Rotation

Rotate the entire visualization so the new tonic is at the "top" position:

```typescript
function animateModulation(oldKey: number, newKey: number, duration: number) {
  const oldAngle = (oldKey * 30) * Math.PI / 180;  // 30° per pitch class
  const newAngle = (newKey * 30) * Math.PI / 180;
  
  // Find shortest rotation path
  let angleDiff = (newAngle - oldAngle + Math.PI) % (2 * Math.PI) - Math.PI;
  
  animateCanvasRotation(oldAngle, oldAngle + angleDiff, duration);
}
```

**Effect:** Listeners see the harmonic landscape rotate, reorienting around the new tonal center.

#### Strategy 2: Color Palette Shift

Change the base color palette to match the new key's characteristic colors:

```typescript
function updateKeyColors(newKey: number) {
  const palette = getKeyPalette(newKey);  // Key-specific color scheme
  
  // Animate all colors in the Tonnetz toward the new palette
  for (let pc = 0; pc < 12; pc++) {
    const oldColor = currentPalette[pc];
    const newColor = palette[pc];
    animateColorShift(oldColor, newColor, 2000);  // 2-second transition
  }
}
```

#### Strategy 3: Octave-Space Warping

In high-level voice-leading space, show the modulation as movement through an orbifold structure:

```
[Orbifold visualization]
Old key (C major) position highlighted
Smooth path curves through space
Arrives at new key (G major) position
```

### 4.5 Secondary Dominants and Chromatic Harmony

**Visual treatment for tension-building:**

#### Secondary Dominants (V/V, V/IV, etc.)

These chords borrow from other keys to intensify motion. Visual response:

1. **Color shift:** Toward the chromatic direction (orange glow, warmer tones)
2. **Pulsing glow:** Stronger beat-sync pulse (higher intensity)
3. **Directional indicator:** Arrow pointing toward the target chord
4. **Tritone visualization:** If the chord contains a tritone, show a visual "dissonance indicator" (jagged edges, flickering effect)

**Example:** In C major, V/V (D major) visualized as:

```
D major appears with orange glow
Tonnetz shows connection arrow: D → G
Tritone (F#-B) highlighted in red
Beat pulse increased +40%
```

#### Borrowed Chords (Chromatic to Key)

Chords from parallel minor or borrowed from other keys:

1. **Color desaturation:** Move toward grayscale or "unnatural" colors
2. **Visual disruption:** Edges become less smooth
3. **Flickering transparency:** Suggests "not quite at home"
4. **Position shift:** Slightly displaced from expected diatonic position on Tonnetz

### 4.6 Hexatonic Cycle Visualization

For music that cycles through 6-triad hexatonic systems:

**Visual loop:**

```
Chord 1 (position A)
  ↓ (L)
Chord 2 (position B)
  ↓ (R)
Chord 3 (position C)
  ↓ (L)
Chord 4 (position D)
  ↓ (R)
Chord 5 (position E)
  ↓ (L)
Chord 6 (position F)
  ↓ (R)
[Returns to Chord 1]
```

**Visual encoding:**

- Draw a hexagon connecting the 6 positions
- Animate a glowing particle circulating around the hexagon
- Color the hexagon's edges based on transformation type (orange for L, cyan for R)
- Indicate position on the cycle with a position marker

### 4.7 Graph Sculpture Integration

The existing Graph Sculpture effect already encodes some of these ideas. Enhance it with transformation awareness:

**Proposed additions:**

1. **Transformation-aware edge TTL:**
   - P transformation edges: 4-bar persistence
   - L/R transformation edges: 6-bar persistence (more common, structurally important)
   - Non-parsimonious leaps: 2-bar persistence (unusual, brief)

2. **Common-tone bonds:**
   - Edges between common tones get stronger visual emphasis
   - Thicker lines, brighter glow
   - Persist longer (8 bars for structurally important chords)

3. **Transformation indicators:**
   - Label edges with "P", "L", "R" during transformations
   - Edge color encodes transformation type

4. **Tension modulation:**
   - High tension (V7, vii°) = tighter spring clustering
   - Low tension (I, vi) = looser, more spacious layout

---

## 5. Practical Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

1. **Transformation detector**
   - Classify chord changes as P, L, R, or non-parsimonious
   - Compute common tones and voice-leading distance

2. **Enhanced Tonnetz**
   - Add transformation arrows (animated, directional)
   - Highlight common tones with glow
   - Show history path with color-coding (red=P, orange=L, cyan=R)

3. **Basic modulation detection**
   - Trigger visual rotation on key change
   - Animate Tonnetz canvas rotation

### Phase 2: Visual Richness (Week 3-4)

1. **Chord morphing**
   - Parsimonious transitions smooth and gliding
   - Non-parsimonious leaps abrupt with color flash

2. **Color palette switching**
   - Key-based palette changes
   - Secondary dominant warmth shifts

3. **Tension scaling**
   - Tonnetz hexagon size modulates with tension
   - Graph Sculpture spring rest length adjusts

### Phase 3: Advanced Features (Week 5-6)

1. **Hexatonic cycle detection and visualization**
2. **Orbifold space path visualization** (if voice-leading data available)
3. **Secondary dominant indicators** (directional arrows, tritone glyphs)
4. **Interactive Tonnetz exploration** (allow clicking to explore transformations manually)

### Phase 4: Polish (Week 7-8)

1. **Performance optimization**
2. **Mobile responsiveness**
3. **Accessibility (screen reader, keyboard nav)**
4. **Documentation and preset defaults**

---

## 6. Quick Reference Tables

### Transformation Properties

| Property | P | L | R |
|----------|---|---|---|
| **Common Tones** | Root, Fifth | Root, Minor 3rd | 3rd, 5th |
| **Moving Tone** | Major 3rd ↔ Minor 3rd (±1 semitone) | Root → 3rd, 5th → root (±2 semitones) | Root → 3rd, 3rd → 5th |
| **Involution** | Yes (P² = I) | No (L³ = I) | Yes (R² = I) |
| **Occurs in** | Chromatic harmony, modal mixture | Post-tonal, jazz | Classical, very common |
| **Voice-leading distance** | 1 semitone | 2 semitones | 1-2 semitones |

### Harmonic Function to Visual Mapping

| Function | Tension | Decay Rate | Color Shift | Visual Character |
|----------|---------|-----------|------------|-----------------|
| **Tonic (I, vi)** | 0.0-0.2 | Slow | Baseline hue | Centered, calm |
| **Subdominant (IV, ii)** | 0.2-0.4 | Moderate | Slight blue shift | Moderate |
| **Dominant (V, vii°)** | 0.6-0.8 | Fast | Orange/red glow | Peripheral, tense |
| **Secondary Dominant** | 0.75+ | Very fast | Intense warmth | Pulsing, urgent |
| **Borrowed/Chromatic** | +0.1 bonus | Same as function | Desaturated | Slightly "off" |

### Chord Quality Visual Encoding

| Quality | Brightness | Saturation | Edge Shape | Animation |
|---------|-----------|-----------|-----------|-----------|
| Major | Normal | High | Smooth triangle | Stable |
| Minor | -20% darker | Moderate | Smooth triangle | Stable |
| Dom7 | Normal | High + orange shift | Sharp edges | Pulsing |
| Maj7 | +10% brighter | Moderate | Soft, rounded | Gentle sway |
| Dim | -30% darker | High + blue shift | Jagged/sharp | Tremolo |
| Aug | Normal | Very high | Round/diffuse | Floating |
| Sus4 | Neutral | Moderate | Open (no top) | Waiting |

### Tonnetz Transformation Reference

```
        Bb              F               C               G               D
        /  \\           /  \\            /  \\            /  \\            /  \\
       Eb    Db       Ab    Gb        Eb    B         G     E         A    F#
        \\  /           \\  /            \\  /            \\  /            \\  /
        Db              Gb              B               E               A
        /  \\           /  \\            /  \\            /  \\            /  \\
       F#    E         B     A        F#    D#        C#    B         F#   D#
        \\  /           \\  /            \\  /            \\  /            \\  /
        E               A               D#              B               F#

        Transformation flows:
        P: vertical flip within each triad region
        L: move along major-third diagonal (↘)
        R: move along perfect-fifth diagonal (→ or ←)
```

---

## 7. References and Further Reading

### Primary Texts

- **Neo-Riemannian Theory:**
  - [Neo-Riemannian Triadic Progressions – Open Music Theory](https://viva.pressbooks.pub/openmusictheory/chapter/neo-riemannian-triadic-progressions/)
  - [Neo-Riemannian Theory Explained](https://tonnetz.liamrosenfeld.com/explain-music)
  - Cohn, R. (1998). "Neo-Riemannian Operations, Parsimonious Trichords, and Their Tonnetz Representations"
  - [Frans Absil's Tonnetz and Riemannian Transformations](https://www.fransabsil.nl/htm/tonnetz_riemannian_transformations.htm)

- **Transformational Theory:**
  - Lewin, D. (1987). *Generalized Musical Intervals and Transformations.* Oxford University Press.
  - [Lewin's GIS: Wikipedia](https://en.wikipedia.org/wiki/Transformational_theory)
  - Satyendra, R. "Lewin, Interval and Transformation" (academic paper)

- **Voice-Leading and Parsimony:**
  - [Chord Proximity, Parsimony, and Analysis with Filtered Point-Symmetry](https://mtosmt.org/issues/mto.19.25.2/mto.19.25.2.plotkin.html)
  - [Voice-Leading Parsimony in the Music of Alexander Scriabin](https://music.arts.uci.edu/abauer/3.1/notes/Callendar_Voice-leading_parsinomy.pdf)
  - Tymoczko, D. *A Geometry of Music* (orbifold approaches)

- **Pitch-Class Set Theory:**
  - [Set Theory (Music) - Wikipedia](https://en.wikipedia.org/wiki/Set_theory_(music))
  - Forte, A. (1973). *The Structure of Atonal Music.* Yale University Press.

- **Visualization Approaches:**
  - [Harmonic Maps – Interactive Visualization](https://www.academia.edu/123698516/Harmonic_Maps_Interactive_Visualization_Of_3_Note_Chord_Spaces_Based_on_Spectral_Structures)
  - [Orbifold Music Visualization - Bergomi & IRCAM](http://repmus.ircam.fr/_media/moreno/MMIM_Bergomi_Tonnetz.pdf)
  - [Topologica: Jazz, Orbifolds, and Your Event-Sourced Dream Code](https://medium.com/fully-automated-luxury-robot-music/topologica-jazz-orbifolds-and-your-event-sourced-flux-driven-dream-code-f8e24443a941)
  - [Visualising Chord Progressions in Music Collections](https://www.staff.city.ac.uk/~sa746/Kachkaev-et-al-2014-Visualising-Chord-Progressions.pdf)

### Online Resources

- **Chrome Music Lab (Harmonics):** [musiclab.chromeexperiments.com/Harmonics](https://musiclab.chromeexperiments.com/Harmonics/)
- **Harmonic Series Visualizer:** [harmonic.netlify.app](https://harmonic.netlify.app/)
- **Open Music Theory:** [openmusictheory.github.io](https://openmusictheory.github.io/) (General harmonic analysis reference)
- **Music Through Curve Insights:** [ResearchGate Paper](https://www.researchgate.net/publication/374928414_Music_through_Curve_Insights)

### Related Codebase

- Existing `src/effects/tonnetz.ts` — Already implements hex grid and chord triangle rendering
- `src/music-mapper.ts` — Maps harmonic analysis to visual parameters
- `research/harmony-connections.md` — Voice-leading and Graph Sculpture theory
- `research/harmonic-analysis-theory.md` — Tension models and chord detection

---

## 8. Actionable Next Steps

### For the Development Team

1. **Run transformation detector on current music library**
   - Identify sequences heavy in P, L, R vs. irregular leaps
   - Note which progressions are hexatonic or cyclic
   - Profile modulation frequency and target keys

2. **Prototype Phase 1 features** in a branch:
   - Add `TransformationEvent` detection
   - Render transformation arrows on Tonnetz
   - Test visual feedback on existing songs

3. **Gather user feedback:**
   - A/B test current Tonnetz vs. enhanced version
   - Measure viewer engagement and understanding
   - Refine visual vocabulary based on response

4. **Document custom presets:**
   - Create "Neo-Riemannian" preset emphasizing transformations
   - Create "Jazz Harmony" preset showing secondary dominants and voice-leading
   - Create "Modal" preset for diatonic harmony visualization

### For Researchers/Theorists

1. **Extend the framework:**
   - Compare Neo-Riemannian and transformational-theory approaches
   - Develop novel metrics for transformation frequency/sequences
   - Explore orbifold visualization feasibility given current architecture

2. **Create educational content:**
   - Video tutorial showing P, L, R transformations
   - Interactive examples of hexatonic cycles
   - Annotated score→visualization walkthroughs

3. **Investigate advanced theories:**
   - Klumpenhouwer networks (hierarchical chord structures)
   - Voice-leading spaces beyond 3-note chords
   - Category-theoretic approaches to music analysis

---

## Conclusion

Neo-Riemannian theory and its related frameworks provide a rich vocabulary for understanding and visualizing harmonic relationships. By mapping these theories to visual parameters—position, color, rotation, morphing—we create visualizations that are both mathematically principled and aesthetically compelling.

The key insight is that **music is geometric**: triads are triangles, transformations are movements, and progressions are paths through harmonic space. The Fractured Jukebox is uniquely positioned to make these abstract geometries visible and interactive.

Start with Phase 1 (transformation detection + Tonnetz arrows). Measure user response. Iterate toward Phase 3 (hexatonic visualization) and beyond. Over time, build a comprehensive visual language that teaches listeners the underlying structure of music through synchronized, real-time visualization.

---

**Document Status:** Research synthesis complete. Ready for implementation and prototype feedback.

**Last Updated:** February 12, 2026

**Recommended Citation:**

> Music Theory Transformations for Visualization: A Comprehensive Guide to Neo-Riemannian, Transformational, and Voice-Leading Approaches for Interactive Music Visualization. Fractured Jukebox Research, 2026.

---

## Sources

- [Neo-Riemannian theory - Wikipedia](https://en.wikipedia.org/wiki/Neo-Riemannian_theory)
- [Neo-Riemannian Triadic Progressions – Open Music Theory](https://viva.pressbooks.pub/openmusictheory/chapter/neo-riemannian-triadic-progressions/)
- [Frans Absil Music | Tonnetz Diagram | Riemannian Transformations](https://www.fransabsil.nl/htm/tonnetz_riemannian_transformations.htm)
- [An introduction to neo-Riemannian theory – alpof](https://alpof.wordpress.com/2014/01/26/an-introduction-to-neo-riemannian-theory-9/)
- [Neo-Riemannian Theory Explained](https://tonnetz.liamrosenfeld.com/explain-music)
- [A Theory of Pitch-Class-Set Extension in Atonal Music](https://symposium.music.org/41/item/2179-a-theory-of-pitch-class-set-extension-in-atonal-music.html)
- [Set theory (music) - Wikipedia](https://en.wikipedia.org/wiki/Set_theory_(music))
- [MTO 25.2: Plotkin, Chord Proximity, Parsimony, and Analysis](https://mtosmt.org/issues/mto.19.25.2/mto.19.25.2.plotkin.html)
- [Transformational theory - Wikipedia](https://en.wikipedia.org/wiki/Transformational_theory)
- [Harmonic Maps – Interactive Visualization Of 3-Note Chord Spaces](https://www.academia.edu/123698516/Harmonic_Maps_Interactive_Visualization_Of_3_Note_Chord_Spaces_Based_on_Spectral_Structures)
- [Seeing Harmony, Hearing Color – Data Science by Design](https://datasciencebydesign.org/blog/seeing-harmony-hearing-color)
- [Harmonic Series - structure, application and background](https://www.oberton.org/en/overtone-singing/harmonic-series/)
- [Visualizing music – The Ethan Hein Blog](https://www.ethanhein.com/wp/2011/visualizing-music/)
- [Harmonic Visualizations of Tonal Music](https://ccrma.stanford.edu/~craig/papers/01/icmc01-tonal.pdf)
- [Chrome Music Lab](https://musiclab.chromeexperiments.com/Harmonics/)
- [Geometry of Triadic Harmony](https://www.preprints.org/manuscript/202410.2117/v1/download)
- [Three Conceptions of Musical Distance - Dmitri Tymoczko](https://dmitri.mycpanel.princeton.edu/files/publications/distance.pdf)
- [Musical modeling through graphs and orbifolds - Mattia G. Bergomi](http://repmus.ircam.fr/_media/moreno/MMIM_Bergomi_Tonnetz.pdf)
- [Topologica: Jazz, Orbifolds, and Event-Sourced Code](https://medium.com/fully-automated-luxury-robot-music/topologica-jazz-orbifolds-and-your-event-sourced-flux-driven-dream-code-f8e24443a941)
- [Visualising Chord Progressions in Music Collections](https://www.staff.city.ac.uk/~sa746/Kachkaev-et-al-2014-Visualising-Chord-Progressions.pdf)"}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":3,"cache_creation_input_tokens":165,"cache_read_input_tokens":42763,"cache_creation":{"ephemeral_5m_input_tokens":0,"ephemeral_1h_input_tokens":165},"output_tokens":1,"service_tier":"standard","inference_geo":"not_available"}},"requestId":"req_011CY4YX2e1mMXNwcL3mUAdT","type":"assistant","uuid":"78156de0-b03e-4ac4-bccb-4cd3e7f9d9ef","timestamp":"2026-02-12T17:11:10.838Z"}
