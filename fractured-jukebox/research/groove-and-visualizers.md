# Groove, Beat Synchronization, and Music Visualization

A comprehensive research compilation for building better music-reactive visualizations.

---

## 0. A Working Theory of Groove for Visualization

*This section synthesizes the research below into a practical framework for implementing groove-aware music visualization.*

### The Predictive Pleasure Model

Groove emerges from a specific relationship between **prediction** and **surprise**. The brain continuously generates expectations about when musical events will occur, and groove is the pleasurable tension created when these predictions are challenged but not violated.

```
GROOVE = f(Prediction Strength × Prediction Error × Motor Engagement)
```

At its core:
1. **Too predictable** → Boring, no urge to move
2. **Too unpredictable** → Confusing, rhythm breaks down
3. **Optimally unpredictable** → Groove sweet spot

### The Three Pillars of Groove

#### Pillar 1: Temporal Prediction (The Beat Grid)

The brain establishes a **metrical framework** — an internal clock that predicts when beats will occur. This prediction is maintained by:

- **Neural oscillations** in the delta (1-3 Hz) and beta (15-30 Hz) bands
- **Motor cortex activation** even during passive listening
- **Entrainment** — the brain's tendency to synchronize with external rhythms

**Visualization implication**: The beat grid is your foundation. All visual elements should relate to this temporal structure, even when they deviate from it.

#### Pillar 2: Syncopation (Controlled Violation)

Syncopation is the strategic violation of metrical expectations — notes occurring *off* the predicted beat positions. The inverted-U relationship means:

| Syncopation Level | Effect on Groove | Visualization Response |
|-------------------|------------------|------------------------|
| Low | Stable but boring | Smooth, predictable motion |
| Medium (optimal) | Maximum groove | Tension/release dynamics |
| High | Chaotic, breaks down | Fragmented, searching motion |

**Quantification**: The Sioros syncopation index measures deviation from metrical template. Medium values (~0.3-0.6 on normalized scale) produce optimal groove.

#### Pillar 3: Bass and Low Frequencies (The Physical Foundation)

Bass is neurologically privileged for rhythm perception:

- **Superior timing precision** for low frequencies (±2ms vs ±20ms for highs)
- **Multi-modal processing** — vestibular and vibrotactile, not just auditory
- **Enhanced neural tracking** — stronger beat-locked cortical responses
- **11.8% more dancing** when sub-bass frequencies present (below conscious perception)

**Visualization implication**: Bass should drive the largest, most stable visual elements. High frequencies add detail; low frequencies provide structure.

### The Active Inference Framework

Recent research frames groove as **active inference** — the brain's attempt to reduce prediction error through movement:

```
High Syncopation → Prediction Error (Surprisal)
                 ↓
        Motor System Activation (Urge to Move)
                 ↓
        Movement → Reduces Surprisal (Tapping confirms beat)
                 ↓
              PLEASURE
```

The "urge to move" isn't just correlation — it's *causal*. The brain wants to resolve rhythmic uncertainty through bodily action. When we tap along, we're actively suppressing prediction errors.

**Visualization implication**: Visual elements should *invite* motor prediction. Motion that anticipates beats helps the viewer's motor system engage.

### Dopamine and Temporal Dynamics

Salimpoor's landmark research shows two distinct dopamine release phases:

| Phase | Brain Region | Timing | Music Element | Visual Strategy |
|-------|--------------|--------|---------------|-----------------|
| **Anticipation** | Caudate | Before peak | Building tension | Accelerating approach |
| **Consummation** | Nucleus accumbens | At peak | Resolution | Impact + decay |

The caudate (anticipation) connects to cognitive/motor systems. The nucleus accumbens (consummation) connects to limbic/emotional systems. This maps directly to visual design:

- **Anticipatory visuals**: Tension, approach, velocity increase
- **Consummatory visuals**: Impact, release, resonant decay

### Where Groove is Felt in the Body

Body sensation mapping research shows groove has distinct corporeal signatures:

| Groove Component | Body Location | Visualization Analog |
|------------------|---------------|---------------------|
| **Wanting to move** | Extremities (hands, feet, hips) | Peripheral motion, edges |
| **Pleasure** | Chest, abdomen (center) | Core elements, warm colors |
| **High groove (funk)** | Whole body activation | Full-canvas response |

### Harmony's Modulatory Role

Rhythm drives groove; harmony modulates it:

- **Rhythm** → Directly affects "wanting to move" AND pleasure
- **Harmony** → Affects pleasure, which *indirectly* affects movement
- **Interaction**: Medium-complexity chords *enhance* the rhythm's inverted-U effect

**Visualization implication**: Let rhythm control motion parameters; let harmony control color/mood parameters.

### Practical Formula for Groove-Reactive Visualization

```typescript
interface GrooveState {
  // Temporal structure
  beatPhase: number;        // 0-1, where in the beat cycle
  barPhase: number;         // 0-1, where in the bar
  syncopationLevel: number; // 0-1, current rhythmic complexity

  // Frequency-weighted energy
  bassEnergy: number;       // Drives large/slow elements
  midEnergy: number;        // Drives medium elements
  trebleEnergy: number;     // Drives small/fast details

  // Harmonic context
  tension: number;          // 0-1, harmonic tension
  chordQuality: string;     // major/minor/dom7/etc
}

function computeVisualResponse(groove: GrooveState) {
  // 1. Base motion from beat phase (the grid)
  const beatCurve = Math.sin(groove.beatPhase * Math.PI * 2);

  // 2. Anticipation increases as beat approaches
  const anticipation = Math.pow(1 - groove.beatPhase, 2);

  // 3. Bass provides foundation weight
  const foundationScale = 1 + groove.bassEnergy * 0.5;

  // 4. Syncopation modulates how much we deviate from grid
  const gridDeviation = groove.syncopationLevel * 0.3;

  // 5. Tension affects color saturation/contrast
  const tensionColor = groove.tension * 0.4 + 0.6;

  return {
    scale: foundationScale * (1 + beatCurve * 0.2),
    anticipationGlow: anticipation * groove.midEnergy,
    rhythmicOffset: gridDeviation * Math.sin(groove.barPhase * Math.PI * 4),
    colorIntensity: tensionColor
  };
}
```

### The Groove-Visualization Mapping Table

| Musical Feature | Perceptual Effect | Visual Mapping |
|-----------------|-------------------|----------------|
| Beat grid | Temporal expectation | Phase-locked motion cycle |
| Syncopation | Expectation violation | Off-grid accents, surprises |
| Bass | Physical grounding | Large, slow, stable elements |
| Treble | Detail, brightness | Small, fast, peripheral elements |
| Chord tension | Emotional intensity | Color saturation, contrast |
| Chord resolution | Release, pleasure | Expansion, brightening |
| Event density | Energy level | Visual density, activity |
| Tempo | Overall pace | Animation speed baseline |

### Key Principles for Implementation

1. **Anticipate, don't just react** — Start visual changes *before* beats arrive (look-ahead)

2. **Privilege the bass** — Let low frequencies drive the largest visual structures

3. **Syncopation = surprise** — Off-beat accents should produce off-grid visual events

4. **Two timescales** — Fast response for transients, slow envelope for energy

5. **Phase > triggers** — Continuous beat phase enables smoother motion than boolean beat flags

6. **Harmony modulates rhythm** — Chord changes affect color/mood; rhythm affects motion

7. **Body-centered design** — Core elements for pleasure, peripheral for movement urge

8. **The inverted U applies to visuals too** — Medium visual complexity is optimal

---

## 1. Groove and Rhythm Theory

### What Makes Music "Groove"

Groove is fundamentally about the **urge to move**. Research defines the groove experience as "a person's inner urge to synchronize body movement with the beat of the music" — a form of sensory-motor coupling between neural systems ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4542135/)).

#### The Microtiming Debate

Charles Keil's theory of **Participatory Discrepancies (PDs)** proposed that minute temporal asynchronies between musicians (e.g., bass and drums slightly out of sync) create "swing" and drive groove through "productive tension" ([Cultural Anthropology](https://anthrosource.onlinelibrary.wiley.com/doi/pdf/10.1525/can.1987.2.3.02a00010)).

However, empirical research has challenged this theory:

- **For most listeners**: Microtiming deviations appear either irrelevant or *negatively* affect groove ratings ([Frontiers](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2016.01487/full))
- **For expert musicians only**: Microtemporal discrepancies do measurably affect body movement behavior ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4542135/))
- The appreciation of microtiming "seems to be an exclusive pleasure for the music elite"

**Takeaway for visualizers**: Don't obsess over sub-millisecond timing precision. Other musical properties matter more for general audiences.

#### Syncopation: The Real Driver

Unlike microtiming, **syncopation genuinely matters** for groove:

- Medium degrees of syncopation elicit the most desire to move and pleasure ([PLOS One](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0094446))
- An **inverted U-shaped relationship** exists: as syncopation increases, groove ratings rise to an optimal point, then decline
- The "sweet spot" creates optimal tension between a predictive model (the meter) and sensory input (the rhythm)

This aligns with Berlyne's theory of **optimal perceptual stimulation** — engagement is maximized at intermediate complexity, not at extremes.

#### Swing Feel in Jazz

"Swing" describes rhythmic cohesion in skilled groups, similar to "groove" in funk/rock. Research on swing feel in jazz found that the subjective perception of swing is highly consistent among musicians, even when the underlying timing patterns vary ([Nature](https://www.nature.com/articles/s41598-019-55981-3)).

### How Musicians Create Feel

#### Expressive Timing (Rubato)

**Tempo rubato** involves expressive rhythmic freedom — slight speeding up and slowing down at the performer's discretion ([Wikipedia](https://en.wikipedia.org/wiki/Tempo_rubato)).

Two types of rubato:
1. **Melodic rubato**: Melody timing is flexible while accompaniment maintains pulse (Chopin's style)
2. **Structural rubato**: Entire ensemble speeds/slows together

Performance analysis shows pianists systematically adjust onset timing based on musical context — chords cause lengthening, counter-melodies constrain ornament duration ([ResearchGate](https://www.researchgate.net/publication/2895071_The_Influence_of_Musical_Context_on_Tempo_Rubato)).

**Takeaway for visualizers**: Real music has constant micro-variations in tempo. Visualizations that lock rigidly to a grid will feel "dead" compared to ones that breathe with the music.

### The Psychology of Groove

#### Neural Entrainment

**Entrainment** is the tendency for biological systems to synchronize with external rhythms ([Frontiers](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.01185/full)):

- Even passive listening modulates beta-band oscillations in sensorimotor cortex, cerebellum, and basal ganglia
- The cerebellum handles externally-paced synchronization; basal ganglia handle self-paced timing
- Neural entrainment amplitude predicts individual synchronization ability ([Nature](https://www.nature.com/articles/srep20612))

#### Why Certain Rhythms Feel Good

From the inverted-U research:

> "Medium levels of syncopation achieve this balance by creating an optimal level of tension between a predictive model—the meter—and the current sensory input—the rhythm."

The brain enjoys **predictable unpredictability** — enough regularity to form expectations, enough variation to create interest.

### Predictive Coding and Groove

The **predictive coding** framework offers a computational account of groove. The brain operates as a prediction machine, constantly generating expectations about incoming sensory input ([Frontiers](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.01111/full)).

#### The Vuust Model

Peter Vuust's predictive coding model of music perception posits:

1. The brain builds hierarchical predictions about musical structure
2. Prediction errors (surprisal) are propagated up the hierarchy
3. The brain attempts to minimize prediction error through:
   - **Passive inference**: Updating internal models
   - **Active inference**: Moving the body to confirm predictions

> "Groove is linked to predictions of music formed over time, with stimuli of moderate complexity rated as most pleasurable and likely to engender movement." ([PLOS One](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0301478))

#### The Wundt Curve Connection

The inverted-U relationship in groove maps directly to **Berlyne's optimal arousal theory** (also called the Wundt curve):

- At **low complexity**: Little incongruence between rhythm and metrical model → low pleasure, low movement urge
- At **medium complexity**: Optimal tension between prediction and input → maximum pleasure and groove
- At **high complexity**: Metrical framework breaks down → decreased affect as the system must relearn

This is why medium syncopation produces maximum groove — it challenges predictions without destroying them ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9119456/)).

### Active Inference: The Motor Theory of Groove

**Active inference** provides a mechanistic explanation for why groove compels movement ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12287993/)):

1. Syncopation generates **prediction error** (surprisal)
2. High surprisal creates sensory uncertainty
3. The motor system activates to **reduce surprisal** by establishing beat/meter through movement
4. Tapping or dancing *actively suppresses* prediction error
5. This suppression is rewarding → pleasure

Key finding: **Tapping enhanced meter and beat information** and reduced the sensory surprisal of syncopation, demonstrating that movement is not just a response to groove but a mechanism for *creating* the groove experience.

The neural dynamics involve:
- **Delta band (1.4 Hz)**: Codes for beat
- **Beta band (20-30 Hz)**: Codes for groove experience
- **Left sensorimotor cortex**: Coordinates delta and beta activities

### Why Bass Drives Groove

Low frequencies have a **privileged role** in rhythm perception ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4104866/)):

#### Timing Advantages

| Frequency Range | Timing Precision | Mechanism |
|-----------------|------------------|-----------|
| Low (bass) | ±2ms | Superior sensorimotor communication |
| High (treble) | ±20ms | Coarser temporal resolution |

This explains why bass instruments typically carry the pulse across cultures — they provide the most reliable temporal information.

#### Neural Enhancement

Cortical activity at the beat frequency is **selectively enhanced** when rhythms are conveyed by bass sounds ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6094140/)). Low-frequency sounds boost neural tracking of the beat in ways that high frequencies cannot.

#### Multi-Modal Processing

Low frequencies engage more than just the auditory system:
- **Vestibular system** (balance)
- **Vibrotactile pathways** (felt through the body)
- **Proprioceptive feedback**

This is why people dance 11.8% more when inaudible very-low-frequency bass (below 27 Hz) is present — it affects the body through non-auditory pathways ([Current Biology](https://www.sciencedirect.com/science/article/pii/S0960982222015354)).

### Dopamine, Anticipation, and Musical Pleasure

Salimpoor's landmark 2011 Nature Neuroscience study established the neurochemical basis of musical pleasure ([Nature Neuroscience](https://www.nature.com/articles/nn.2726)):

#### Two Distinct Phases

| Phase | Brain Region | Timing | Neurotransmitter |
|-------|--------------|--------|------------------|
| **Anticipation** | Caudate nucleus | Before peak | Dopamine |
| **Consummation** | Nucleus accumbens | At peak | Dopamine |

> "The anticipation of an abstract reward can result in dopamine release in an anatomical pathway distinct from that associated with the peak pleasure itself."

#### Implications for Groove

This dissociation maps onto groove dynamics:
- **Anticipation phase**: Building toward the beat, tension accumulation
- **Consummation phase**: Beat landing, tension release

The caudate connects to cognitive and motor systems (prediction), while the nucleus accumbens connects to limbic/emotional systems (reward). **Groove engages both** — we predict the beat (caudate) and are rewarded when it lands (NAcc).

### Embodied Cognition: Groove in the Body

Research using **body sensation maps (BSM)** reveals where people feel groove ([PNAS Nexus](https://academic.oup.com/pnasnexus/article/4/10/pgaf306/8262836)):

#### Distinct Body Maps

| Component | Body Location | Interpretation |
|-----------|---------------|----------------|
| **Wanting to move** | Extremities (hands, feet, hips, legs) | Motor preparation |
| **Pleasure** | Chest, abdomen (center) | Emotional response |
| **High groove (funk)** | Whole body | Complete engagement |

This supports embodied cognition theory: **groove is not just perceived, it is felt throughout the body**. The sensation of groove activates bodily representations that prepare for movement.

### Sensorimotor Synchronization

Janata & Tomic's foundational research established groove as a psychological construct ([PubMed](https://pubmed.ncbi.nlm.nih.gov/21767048/)):

Key findings:
- **Inverse relationship** between experienced groove and difficulty of bimanual sensorimotor coupling
- **High-groove stimuli elicit spontaneous rhythmic movements** even when not instructed to move
- **Quantifiable measures of sensorimotor coupling quality predict groove ratings**

> "Groove can be treated as a psychological construct and model system that allows for experimental exploration of the relationship between sensorimotor coupling with music and emotion."

Perceived synchrony shows a **stronger relation with groove** than measured synchrony — how well people *think* they're moving to the beat matters more than objective accuracy ([UC Press](https://online.ucpress.edu/mp/article/39/5/423/182322/Perceived-Motor-Synchrony-With-the-Beat-is-More)).

### Quantifying Syncopation

#### The Sioros Algorithm

Sioros et al. developed a computational method for measuring syncopation ([Frontiers](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.01036/full)):

1. Define a **metrical template** associating each position with its metrical strength
2. Identify **syncopation events**: onsets on weak positions, rests on strong positions
3. Weight each syncopation by the metrical level difference
4. Sum for overall syncopation index

```
Syncopation Index = Σ (weight of syncopated onset × metrical level difference)
```

Research confirmed that medium syncopation values (not too low, not too high) produce optimal groove ratings.

#### Event Density

Beyond syncopation, **event density** (average drum strokes per beat) positively correlates with groove ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6025871/)). Higher density provides more rhythmic information for the motor system to track.

| Metric | Description | Groove Effect |
|--------|-------------|---------------|
| Syncopation index | Degree of off-beat emphasis | Inverted U (medium optimal) |
| Event density | Onsets per beat | Positive correlation |
| Beat salience | Clarity of beat pattern | Positive correlation |
| Rhythmic variability | Changes in pattern | Moderate positive |

### Rhythm-Harmony Interaction

Groove is not rhythm alone — harmony modulates the groove experience ([PLOS One](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0204539)):

#### Key Findings

1. **Rhythm** shows inverted-U relationship with both pleasure and wanting to move
2. **Harmony** affects pleasure more than movement urge
3. **Medium-complexity chords** enhance the inverted-U effect of rhythm
4. **Mediation analysis**: Harmony's effect on movement is *through* pleasure

> "Rhythm plays a primary role in generating groove, with harmony providing a modulatory role through its effect on pleasure."

For visualization: **Let rhythm drive motion, let harmony drive mood/color.**

### Genre Differences in Groove

Groove mechanisms vary across musical styles ([Nature](https://www.nature.com/articles/s41598-019-55981-3), [Cambridge](https://www.cambridge.org/core/journals/popular-music/article/shaping-rhythm-timing-and-sound-in-five-groovebased-genres/BBC410F9849DB982AEBFACEA14D38F32)):

| Genre | Primary Groove Mechanism | Microtiming Role |
|-------|--------------------------|------------------|
| **Jazz** | Swing ratio, microtiming | Central (for experts) |
| **Funk** | Syncopation, tight pocket | Important for feel |
| **EDM** | Sound design, build/drop | Less critical |
| **Hip-hop** | Layered samples, swing | Genre-specific patterns |
| **Samba** | Specific timing templates | Critical for authenticity |

Key insight: **Listeners' expectations and familiarity with genre-specific timing patterns affect groove perception.** What creates groove in jazz may not in EDM.

### Meter Perception: The Povel-Essens Framework

The cognitive foundations of beat perception ([Semantic Scholar](https://www.semanticscholar.org/paper/Metrical-and-nonmetrical-representations-of-Essens-Povel/2d2ed1e1a4b9a00d31ad8d5094e04c7b27fa6a6c)):

#### Internal Clock Theory

1. Listeners **induce an internal clock** from rhythmic patterns
2. This clock serves as a **measuring device** to encode structure
3. Patterns that fit the clock well (metrical) are easier to remember
4. **Accents** are perceived on:
   - Isolated events
   - Second of two identical events
   - First and last of three+ events

This framework explains why the brain can extract a beat from complex patterns — it finds the clock that minimizes the complexity of representing the rhythm.

### Frisson and Chills: Peak Musical Experiences

While groove is about continuous pleasure, **frisson** (musical chills) represents peak emotional moments ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4107937/)):

#### Trigger Mechanisms

- Rhythmic violations of expectation
- Harmonic surprises (deceptive cadences)
- Dynamic changes (sudden loud or soft)
- Melodic appoggiatura (delayed resolution)

#### Neural Pathway

Frisson involves a network connecting:
- Auditory cortex
- Motor/premotor regions
- Emotional processing (insula, cingulate)
- Reward centers (striatum)

> "Functional and structural connectivity between auditory areas and emotional/reward processing systems predicts frisson."

For visualization: **Build-ups and releases should have corresponding visual climaxes.**

---

## 2. Beat Synchronization in Visualizers

### Onset Detection and Beat Tracking

#### Core Concepts

**Onset detection** identifies starting points of musical events (note attacks, percussive hits). **Beat tracking** identifies regular pulsations that define tempo and meter ([Essentia Docs](https://essentia.upf.edu/tutorial_rhythm_beatdetection.html)).

The process involves:
1. Preliminary audio signal processing
2. Detection functions to highlight beats/onsets
3. Determining which tempo best aligns with detected beats

#### Key Audio Features for Visualization

From librosa and Essentia documentation ([librosa](https://librosa.org/doc/0.11.0/feature.html), [Essentia](https://essentia.upf.edu/streaming_extractor_music.html)):

| Feature | Purpose |
|---------|---------|
| **Onset strength** | Magnitude of note attacks |
| **Beat frames** | Estimated beat positions |
| **Chroma** | Energy distribution across 12 pitch classes |
| **Spectral centroid** | "Brightness" of sound |
| **Spectral contrast** | Difference between peaks and valleys |
| **RMS energy** | Overall loudness |
| **MFCC** | Timbral characteristics |
| **Tempo/BPM** | Beats per minute |

#### Tools and Libraries

**Tier 1: Comprehensive MIR**
- **Essentia.js**: WebAssembly-powered, onset/beat/tempo detection, key/chord estimation, ML models
- **Meyda**: Lightweight feature extraction (RMS, spectral features, MFCC)
- **aubiojs**: WASM-compiled real-time pitch/onset/tempo detection

**Tier 2: Beat Detection**
- **web-audio-beat-detector**: BPM from AudioBuffer
- **BeatDetect.js**: BPM + first beat offset + first bar timing

### How Classic Visualizers Handle Beat Sync

#### MilkDrop / projectM

MilkDrop (created by Ryan Geiss in 2001) uses ([Wikipedia](https://en.wikipedia.org/wiki/MilkDrop)):

- **FFT** to split music into frequency buckets
- **Beat detection** to trigger preset changes and effects
- Randomly-selected "presets" that respond to audio data

projectM reimplements MilkDrop cross-platform ([GitHub](https://github.com/projectM-visualizer/projectm)):
> "ProjectM is responsible for parsing presets, analyzing audio PCM data with beat detection and FFT, applying the preset to the audio feature data and rendering the resulting output with OpenGL."

MilkDrop 3 adds auto-changing presets based on beat detection with configurable bass/treble thresholds ([GitHub](https://github.com/milkdrop2077/MilkDrop3)).

#### Winamp AVS (Advanced Visualization Studio)

AVS (first shipped 1999) uses a different approach ([Wikipedia](https://en.wikipedia.org/wiki/Advanced_Visualization_Studio)):

- Pre-defined effects arranged in combinations
- Codeable components ("SuperScope", "Dynamic Movement") with simple scripting
- Scripts compiled to native code at runtime for performance
- Open-sourced in 2005 under BSD license

The AVS community created thousands of presets with wildly different visual styles ([acko.net](https://acko.net/blog/avs/)).

### Anticipation vs Reaction

#### The Latency Problem

From rhythm game research ([Rhythm Quest Devlog](https://rhythmquestgame.com/devlog/10.html)), three types of latency affect synchronization:

1. **Audio latency**: Delay between playing sound and hearing it
2. **Visual latency**: Delay between rendering and seeing
3. **Input latency**: Delay between user action and game response

#### Temporal Anticipation in Music

Research on conductors and ensemble synchronization found ([ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0001691818300921)):

- Visual cues with **dynamic velocity profiles** facilitate prediction of upcoming beats
- Conductors improve synchronization by facilitating anticipation of tempo changes
- Fast vertical motion between beat positions is particularly effective for conveying time

#### Best Practices

1. **Look-ahead for predictable events**: If you know beat positions in advance (MIDI, pre-analyzed audio), start visual transitions *before* the beat
2. **Phase-based animation**: Use beat phase (0-1) rather than discrete triggers for smoother motion
3. **Easing toward beats**: Accelerate visual changes as beats approach
4. **Smoothing raw audio data**: Volume data should be "eased over time to give a smoother value" ([Airtight Interactive](https://www.airtightinteractive.com/2013/10/making-audio-reactive-visuals/))

---

## 3. Visual Rhythm Techniques

### Translating Rhythm to Motion

#### Crossmodal Correspondences

Research shows consistent mappings between sound and vision ([Nature](https://www.nature.com/articles/s41598-017-18150-y), [ResearchGate](https://www.researchgate.net/publication/51519943_The_sound_of_size_Crossmodal_binding_in_pitch-size_synesthesia_A_combined_TMS_EEG_and_psychophysics_study)):

| Audio Property | Visual Property |
|----------------|-----------------|
| **Pitch height** | Vertical position (high = up) |
| **Pitch** | Size (high = small, low = large) |
| **Pitch** | Brightness (high = bright) |
| **Loudness** | Size (loud = large) |
| **Timbre** | Shape (harsh = angular, smooth = rounded) |
| **Tempo** | Speed of motion |

These are **not** synesthesia — they're universal perceptual tendencies that most people share.

#### Movement Types for Visual Rhythm

From animation research ([Sokolizzie](https://www.sokolizzie.com/design/rhythm), [Hound Studio](https://hound-studio.com/blog/mastering-timing-and-pacing-creating-rhythm-and-flow-in-animated-scenes/)):

1. **Rotation**: Maps well to continuous rhythm (beat phase)
2. **Scaling/pulsing**: Maps well to discrete events (onsets, beats)
3. **Position/translation**: Maps well to melodic motion (pitch contour)
4. **Color/brightness**: Maps well to harmony (chord changes, tension)

#### Synchronizing Audio and Visual

From visual music research ([Stanford](https://www.abedavis.com/files/papers/VisualRhythm_Davis18.pdf)):

> "Onset strength is maximized at impulses and the onsets of impulse responses. In the physical world, these tend to coincide with the impact of a moving object and a resonating surface—often resulting in sudden visible deceleration of the moving object."

Key insight: **Visual impacts should match audio impacts** — sudden deceleration at the moment of "hit".

### Impulse/Decay Models for Animation

#### Beat Detection for Visuals

From Airtight Interactive's guide ([Airtight](https://www.airtightinteractive.com/2013/10/making-audio-reactive-visuals/)):

> "A beat can be defined as a 'brutal variation in sound energy', meaning a beat is when the volume goes up quickly in relation to the previous value."

Beat detection approaches:
1. **Global volume**: Detect any significant energy spike
2. **Frequency-band specific**: Separate bass drum (low freq) from hi-hats (high freq)

#### Smoothing Techniques

Raw audio data creates jerky animations. Solutions:

1. **Exponential smoothing**: `smoothed = smoothed * decay + raw * (1 - decay)`
2. **Moving average**: Average last N samples
3. **Interpolation**: Linear or ease-based interpolation toward target values

#### Impulse-Response Animation Pattern

```
onBeat:
  impulse = 1.0

update(dt):
  impulse *= exp(-decay * dt)  // Exponential decay
  visual_scale = 1.0 + impulse * strength
```

This creates a sharp attack that naturally decays — matching how real-world resonant systems behave.

### Easing Functions and Spring Physics

#### Ease-Based vs Physics-Based Animation

From animation research ([Josh Comeau](https://www.joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/), [Medium](https://medium.com/kaliberinteractive/how-i-transitioned-from-ease-to-spring-animations-5a09eeca0325)):

**Ease-based** (cubic-bezier, linear, etc.):
- Fixed duration
- Predetermined path
- Good for UI transitions with known endpoints

**Physics-based** (springs):
- Duration emerges from physics
- Can be interrupted smoothly
- "Feels more natural" — better tricks our brains into believing motion

Spring properties:
- **Mass**: Heavier = slower, more momentum
- **Tension/Stiffness**: Higher = faster oscillation
- **Friction/Damping**: Higher = less bounce

#### Choosing the Right Approach for Music

For **discrete events** (chord changes, note onsets): Use GSAP or ease-based tweens with beat-relative timing

For **continuous motion** (fluid response to energy): Use physics simulation (wave tanks, springs)

For **impulse accumulators** (drum hits accumulating energy): Use manual exponential decay

From the project's own learnings:
> "Spring physics for music response feels stiff/mechanical. Wave tank (mass + momentum) is more fluid."

### BPM Sync vs Audio-Reactive

From VJ research ([Zero to VJ](https://zerotovj.com/should-you-use-audio-reactive-visuals/)):

**Audio-reactive** (frequency analysis):
- Responds to actual sound energy
- Works with any audio source
- Can be twitchy/unpredictable

**BPM sync** (beat grid):
- Smooth, predictable motion
- Requires knowing tempo
- Can feel "robotic" if too rigid

Best practice: **Combine both** — use beat grid for underlying rhythm, audio-reactive for intensity/energy.

---

## 4. Notable Music Visualizer Projects

### Pioneers of Visual Music

#### Oskar Fischinger (1900-1967)

The "grandfather of music video" ([Artsper](https://blog.artsper.com/en/a-closer-look/the-father-of-visual-music-oskar-fischingers-experimental-legacy/)):

- Created abstract musical animations decades before computers
- His "Studies" were synchronized to popular/classical music — essentially first music videos (1930s)
- Influenced Disney's Fantasia
- Used up to 5 projectors with colored filters and live music

Key insight: Visual music predates digital technology. The principles are timeless.

#### Stephen Malinowski — Music Animation Machine

Since 1982, Malinowski has created animated graphical scores ([musanim.com](https://musanim.com/)):

- Takes MIDI file data and renders colored shapes
- Shows different layers of sound and their relationships
- Premiered real-time performance sync with Nuremberg Symphony (2012)
- Over 194 million YouTube views

His approach: **Piano-roll-style visualization** that makes musical structure visible to non-musicians.

### Classic Visualizers

#### MilkDrop (2001)

Ryan Geiss's masterpiece ([Geisswerks](https://www.geisswerks.com/milkdrop/)):

- Hardware-accelerated (DirectX)
- Preset system with thousands of community contributions
- Beat detection triggers psychedelic effects
- Iterated images that blend seamlessly

#### Winamp AVS (1999)

Preceded MilkDrop ([Wikipedia](https://en.wikipedia.org/wiki/Advanced_Visualization_Studio)):

- Compositable effect layers
- Simple scripting language compiled to native code
- Open-sourced in 2005
- Foundation for understanding modern visualizer architecture

### Modern Approaches

#### Shadertoy

Web-based shader playground ([Shadertoy](https://www.shadertoy.com/view/Xds3Rr)):

- Sound input available as texture (512x2: spectrum + waveform)
- `iChannel0` uniform for audio data
- `iTime` for animation sync
- Over 80,000 community shaders

Audio texture format:
```
Row 0: FFT spectrum (frequency domain)
Row 1: Waveform (time domain)
```

#### Three.js + Shader Park

Modern web approach ([Codrops](https://tympanus.net/codrops/2023/02/07/audio-reactive-shaders-with-three-js-and-shader-park/)):

- Web Audio API's AnalyserNode for FFT
- Pass FFT data as texture to WebGL shaders
- Shader Park: JavaScript library for procedural shaders

#### Synesthesia

Commercial VJ software ([synesthesia.live](https://synesthesia.live/)):

- Advanced audio algorithms translate music to visual action
- MIDI and OSC mappable controls
- Real-time visual adjustments

### Generative and Procedural Approaches

From generative art research ([Generative Hut](https://www.generativehut.com/post/using-processing-for-music-visualization)):

- Music provides input data to generative algorithms
- Time-based data extracted from audio analysis
- Highs and lows of music reflected in visual dynamics

Brian Eno popularized **generative music** (1995) — systems that create ever-different outputs. The same principle applies to visualization: **systems that respond to music rather than pre-choreographed sequences**.

### Academic Research

#### MIT Media Lab — Music Visualization via MIR

Research project exploring ([MIT](https://www.media.mit.edu/projects/music-visualization-via-musical-information-retrieval/overview/)):

- Real-time music analysis with Max/MSP
- Visualization that accommodates variability in live performances
- Crossmodal correspondences (pitch-position, loudness-size, timbre-shape, emotion-color)

#### Ohio State — Real-Time Music Visualization Study

Academic treatment of visual music principles ([Ohio State](https://accad.osu.edu/sites/accad.osu.edu/files/real-time-music-visualization.pdf)):

- Visual music as a distinct art form
- Principles for translating audio to visual
- Technical approaches to real-time rendering

#### Deep Learning Approaches

Recent work on AI-generated music videos ([ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0141938225001404)):

- Analyze emotional semantics, stylistic patterns, rhythmic structures
- Generate video synchronized with audio style and rhythm
- Multi-modal feature extraction

---

## 5. Key Takeaways for Implementation

### What Research Tells Us

1. **Medium complexity is optimal** — The inverted-U curve applies to both rhythmic complexity and visual complexity

2. **Anticipation beats reaction** — Visual changes that *approach* beats feel more natural than ones that react *after*

3. **Physics over easing** — Spring/wave physics creates more natural motion than predetermined curves

4. **Crossmodal mappings are universal** — High pitch = up/small/bright; Low pitch = down/large/dark

5. **Smoothing is essential** — Raw audio data creates jittery visuals; always apply smoothing

6. **Beat phase > discrete triggers** — Continuous 0-1 phase values enable smoother animations than boolean beat flags

7. **Multiple layers of response** — Separate fast (transients) from slow (energy envelope) responses

### Practical Recommendations

#### For Beat Sync

```typescript
// Combine beat grid with audio energy
const beatPhase = (currentTime % beatDuration) / beatDuration;
const beatCurve = Math.sin(beatPhase * Math.PI * 2) * 0.5 + 0.5; // Smooth sine wave

// Anticipate the beat
const anticipation = 1.0 - beatPhase; // Increases as beat approaches
const visualIntensity = beatCurve * audioEnergy * (1 + anticipation * 0.3);
```

#### For Impulse Animations

```typescript
// Accumulate impulses, decay over time
class ImpulseAccumulator {
  value = 0;

  trigger(strength: number) {
    this.value = Math.min(this.value + strength, 1.5); // Soft cap
  }

  update(dt: number, decayRate = 3.0) {
    this.value *= Math.exp(-decayRate * dt);
    return this.value;
  }
}
```

#### For Smooth Energy Following

```typescript
// Two-stage smoothing: fast attack, slow release
class EnergyFollower {
  fast = 0;
  slow = 0;

  update(input: number, dt: number) {
    // Fast follower (attack ~50ms)
    const fastRate = input > this.fast ? 20 : 5;
    this.fast += (input - this.fast) * fastRate * dt;

    // Slow follower (smooths out fast)
    this.slow += (this.fast - this.slow) * 2 * dt;

    return this.slow;
  }
}
```

#### For Crossmodal Mapping

```typescript
// Map MIDI pitch to visual properties
function pitchToVisual(midiNote: number) {
  const normalized = (midiNote - 21) / 87; // Piano range

  return {
    y: normalized,                    // Vertical position
    size: 1.5 - normalized * 0.8,     // Size (inverse)
    brightness: 0.4 + normalized * 0.6 // Brightness
  };
}
```

---

## Sources

### Groove and Rhythm Theory
- [Microtiming in Swing and Funk - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4542135/)
- [Syncopation, Body-Movement and Pleasure in Groove Music - PLOS One](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0094446)
- [Microtiming Deviations and Swing Feel in Jazz - Nature](https://www.nature.com/articles/s41598-019-55981-3)
- [Participatory Discrepancies and the Power of Music - Keil](https://anthrosource.onlinelibrary.wiley.com/doi/pdf/10.1525/can.1987.2.3.02a00010)
- [Tempo rubato - Wikipedia](https://en.wikipedia.org/wiki/Tempo_rubato)

### Beat Synchronization
- [Beat detection and BPM tempo estimation - Essentia](https://essentia.upf.edu/tutorial_rhythm_beatdetection.html)
- [Feature extraction - librosa](https://librosa.org/doc/0.11.0/feature.html)
- [Rhythm Quest Devlog - Latency Calibration](https://rhythmquestgame.com/devlog/10.html)
- [Visual cues and temporal anticipation - ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0001691818300921)

### Neural Entrainment
- [Neurobiological foundations of neurologic music therapy - Frontiers](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.01185/full)
- [Individual Differences in Rhythmic Cortical Entrainment - Nature](https://www.nature.com/articles/srep20612)

### Crossmodal Correspondence
- [Musical pitch classes have rainbow hues - Nature](https://www.nature.com/articles/s41598-017-18150-y)
- [The sound of size - ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0953543811007683)

### Classic Visualizers
- [MilkDrop - Wikipedia](https://en.wikipedia.org/wiki/MilkDrop)
- [MilkDrop official site - Geisswerks](https://www.geisswerks.com/milkdrop/)
- [projectM - GitHub](https://github.com/projectM-visualizer/projectm)
- [Advanced Visualization Studio - Wikipedia](https://en.wikipedia.org/wiki/Advanced_Visualization_Studio)
- [AVS - Acko.net](https://acko.net/blog/avs/)

### Modern Approaches
- [Shadertoy Sound Input](https://www.shadertoy.com/view/Xds3Rr)
- [Audio Reactive Shaders - Codrops](https://tympanus.net/codrops/2023/02/07/audio-reactive-shaders-with-three-js-and-shader-park/)
- [Making Audio Reactive Visuals - Airtight Interactive](https://www.airtightinteractive.com/2013/10/making-audio-reactive-visuals/)

### Animation Techniques
- [Spring Physics Animation - Josh Comeau](https://www.joshwcomeau.com/animation/a-friendly-introduction-to-spring-physics/)
- [Easing Functions Cheat Sheet](https://easings.net/)

### Visual Music Pioneers
- [Oskar Fischinger - Artsper](https://blog.artsper.com/en/a-closer-look/the-father-of-visual-music-oskar-fischingers-experimental-legacy/)
- [Music Animation Machine - Stephen Malinowski](https://musanim.com/)

### Academic Research
- [MIT Media Lab - Music Visualization](https://www.media.mit.edu/projects/music-visualization-via-musical-information-retrieval/overview/)
- [Real Time Music Visualization - Ohio State](https://accad.osu.edu/sites/accad.osu.edu/files/real-time-music-visualization.pdf)
- [Visual Rhythm and Beat - Stanford](https://www.abedavis.com/files/papers/VisualRhythm_Davis18.pdf)

### Predictive Coding and Active Inference
- [Rhythmic complexity and predictive coding - Frontiers](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.01111/full)
- [Predictive coding of music and groove - PLOS One](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0301478)
- [Active inference in music perception - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12287993/)
- [Active inference and syncopation - Wiley](https://onlinelibrary.wiley.com/doi/10.1111/psyp.70113)
- [Motor and predictive processes - Frontiers](https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2020.578546/full)
- [Neural dynamics of groove - Science Advances](https://www.science.org/doi/10.1126/sciadv.adi2525)

### Bass and Low Frequency Perception
- [Superior time perception for bass - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4104866/)
- [Very-low frequency sound increases dancing - Current Biology](https://www.sciencedirect.com/science/article/pii/S0960982222015354)
- [Neural tracking enhanced by low-frequency sounds - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6094140/)

### Dopamine and Musical Reward
- [Anatomically distinct dopamine release - Nature Neuroscience](https://www.nature.com/articles/nn.2726)
- [From perception to pleasure - PNAS](https://www.pnas.org/doi/10.1073/pnas.1301228110)
- [Dopamine modulates music reward - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6397525/)

### Syncopation Quantification
- [Syncopation creates groove - Frontiers](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.01036/full)
- [Syncopation and groove in polyphonic music - UC Press](https://online.ucpress.edu/mp/article/39/5/503/182325/Syncopation-and-Groove-in-Polyphonic-MusicPatterns)
- [Modelling perceived syncopation - SAGE](https://journals.sagepub.com/doi/10.1177/2059204318791464)
- [Groove in drum patterns - PLOS One](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0199604)

### Sensorimotor Synchronization
- [Sensorimotor coupling and groove - PubMed](https://pubmed.ncbi.nlm.nih.gov/21767048/)
- [Sensorimotor synchronization increases groove - ResearchGate](https://www.researchgate.net/publication/362275961_Sensorimotor_Synchronization_Increases_Groove)
- [Perceived vs measured motor synchrony - UC Press](https://online.ucpress.edu/mp/article/39/5/423/182322/Perceived-Motor-Synchrony-With-the-Beat-is-More)

### Rhythm-Harmony Interaction
- [Groove and rhythmic/harmonic complexity - PLOS One](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0204539)

### Body Maps and Embodied Cognition
- [Body maps of groove sensation - PNAS Nexus](https://academic.oup.com/pnasnexus/article/4/10/pgaf306/8262836)
- [Bodily maps of musical sensations - PNAS](https://www.pnas.org/doi/10.1073/pnas.2308859121)

### Neural Oscillations and Beat Perception
- [Neural networks for beat perception - Frontiers](https://www.frontiersin.org/journals/systems-neuroscience/articles/10.3389/fnsys.2015.00159/full)
- [Neural entrainment to the beat - JNeuro](https://www.jneurosci.org/content/37/26/6331)
- [Neural entrainment and synchronization - Nature Scientific Reports](https://www.nature.com/articles/s41598-025-93948-9)

### Frisson and Musical Chills
- [Thrills, chills, frissons - Frontiers](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2014.00790/full)
- [Cortical patterns of musical chills - Frontiers](https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2020.565815/full)
- [Neurobiology of aesthetic chills - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11233292/)

### Genre Differences
- [Microtiming deviations and swing feel in jazz - Nature](https://www.nature.com/articles/s41598-019-55981-3)
- [Shaping rhythm in groove-based genres - Cambridge](https://www.cambridge.org/core/journals/popular-music/article/shaping-rhythm-timing-and-sound-in-five-groovebased-genres/BBC410F9849DB982AEBFACEA14D38F32)

### Key Researchers

- **Maria Witek** (Birmingham): Syncopation-groove relationship, inverted-U curve, body movement, defined groove as "the pleasurable urge to move to rhythmic music"
- **Peter Vuust** (Aarhus): Predictive coding model, musical expertise, rhythmic complexity
- **Petr Janata** (UC Davis): Sensorimotor coupling, groove psychology, foundational 2012 study
- **Valorie Salimpoor** (McGill): Dopamine and musical pleasure, anticipation vs. consummation
- **Edward Large** (UConn): Neural resonance theory, beat perception, dynamic attending
- **George Sioros** (Vienna): Syncopation quantification algorithms, syncopation + pickups = maximal groove
- **Olivier Senn** (Lucerne): Experience of Groove Questionnaire (EGQ), psychological groove model
- **Petri Toiviainen** (Jyväskylä): MIR integration, groove as multidimensional participatory experience
- **Jessica Grahn** (Western): Basal ganglia and beat perception, role of motor circuits

### The Experience of Groove Questionnaire (EGQ)

Olivier Senn and colleagues developed the standard measurement instrument for groove research:

**Two validated scales:**
- **Urge to Move** (α = .92): "This music makes me want to move my body"
- **Pleasure** (α = .97): "Listening to this music is pleasurable"

This establishes groove as a two-component construct: motor (wanting to move) and hedonic (pleasure).

### Optimal Tempo for Groove

Research consistently shows groove ratings peak around **100-120 BPM**:

| Tempo Range | Effect |
|-------------|--------|
| < 80 BPM | Low groove (too slow) |
| 100-120 BPM | Peak groove (matches human locomotion) |
| > 160 BPM | Declining groove (too fast) |

This tempo preference aligns with:
- Natural human walking tempo (~2 Hz / 120 BPM)
- Spontaneous motor tempo for tapping (120-130 BPM)
- Delta-band neural oscillations (1-3 Hz)

**Visualization implication**: Animations feel most natural when base rates approximate 100-120 "visual beats" per minute.

### Dynamic Attending Theory (Jones & Large)

A theoretical framework explaining how we perceive rhythm:

1. **Attention is inherently oscillatory**
2. External rhythms **entrain** these internal oscillations
3. Entrainment allows attention to be directed toward specific future moments
4. Meter provides a **temporal template** for information processing
5. Listener and music form a **single dynamical system**

This explains why we can anticipate beats before they occur — our neural oscillations have synchronized with the musical structure.

---

## Appendix: Computational Metrics for Groove

### Syncopation Index (Sioros Method)

```typescript
function computeSyncopation(onsets: number[], meter: number[]): number {
  let syncopation = 0;

  for (let i = 0; i < onsets.length; i++) {
    const onset = onsets[i];
    const metricalWeight = meter[i % meter.length];

    // Look for syncopation: onset on weak beat before strong beat rest
    if (onset > 0 && i + 1 < onsets.length) {
      const nextWeight = meter[(i + 1) % meter.length];
      if (nextWeight > metricalWeight && onsets[i + 1] === 0) {
        syncopation += nextWeight - metricalWeight;
      }
    }
  }

  return syncopation;
}

// Example: 4/4 meter weights (higher = stronger beat)
const meter4_4 = [4, 1, 2, 1, 3, 1, 2, 1]; // 8 positions per bar
```

### Event Density

```typescript
function computeEventDensity(onsets: number[], beatsPerBar: number): number {
  const totalOnsets = onsets.filter(o => o > 0).length;
  const totalBeats = onsets.length / (onsets.length / beatsPerBar);
  return totalOnsets / totalBeats;
}
```

### Beat Salience

```typescript
function computeBeatSalience(onsets: number[], meter: number[]): number {
  let onBeatEnergy = 0;
  let offBeatEnergy = 0;

  for (let i = 0; i < onsets.length; i++) {
    const weight = meter[i % meter.length];
    if (weight >= 3) { // Strong beat positions
      onBeatEnergy += onsets[i];
    } else {
      offBeatEnergy += onsets[i];
    }
  }

  // High salience = energy concentrated on strong beats
  return onBeatEnergy / (onBeatEnergy + offBeatEnergy + 0.001);
}
```

### Groove Prediction Model

Based on research findings, a simple groove prediction:

```typescript
function predictGroove(
  syncopation: number,  // 0-1 normalized
  eventDensity: number, // events per beat
  beatSalience: number, // 0-1
  bassEnergy: number    // 0-1
): number {
  // Inverted-U for syncopation (optimal around 0.4-0.6)
  const syncContribution = 1 - Math.pow((syncopation - 0.5) * 2, 2);

  // Linear positive for density (up to a point)
  const densityContribution = Math.min(eventDensity / 3, 1);

  // Beat salience helps but too much = boring
  const salienceContribution = 0.3 + 0.7 * beatSalience * (1 - beatSalience * 0.3);

  // Bass is always good for groove
  const bassContribution = 0.5 + 0.5 * bassEnergy;

  return (
    syncContribution * 0.35 +
    densityContribution * 0.25 +
    salienceContribution * 0.2 +
    bassContribution * 0.2
  );
}
