# Music Visualization Research Notes

Research synthesis for improving Fractured Jukebox visualizer design.

## Research Areas

### 1. Cross-Modal Correspondences
**Universal perceptual mappings that feel "natural" to most people**

| Audio Feature | Visual Mapping | Evidence |
|---------------|----------------|----------|
| Pitch (high) | Brightness (light), Position (up), Size (small) | Strong empirical support |
| Pitch (low) | Darkness, Position (down), Size (large) | Reflects real-world physics (larger objects = lower resonance) |
| Loudness | Brightness, Size | Intuitive mapping |
| Tempo (fast) | Speed, Motion frequency | Direct temporal mapping |
| Major mode | Brighter colors | Ascending scales rated brighter |
| Minor mode | Darker, more saturated | Associated with sadness |
| Ascending melody | Clockwise, upward | Motion direction |
| Descending melody | Counter-clockwise, downward | Motion direction |

**Key papers:**
- PMC: Extended Research on Crossmodal Correspondence (color/sound)
- Musical Scales and Brightness Evaluations (Collier & Hubbard, 2004)

**Implications for Fractured Jukebox:**
- Already using pitch→vertical (note spiral) - validated
- Could map loudness→brightness more explicitly in domain warp
- Major/minor affecting palette saturation - already doing this with `modeDim`

---

### 2. Tonal Tension & Pitch Space
**Mathematical frameworks for harmonic distance and tension**

**Lerdahl's Tonal Pitch Space:**
- Multi-dimensional model of diatonic/chromatic space
- Quantifies "distance" between pitches, chords, and keys from tonic
- Tension profiles rise/fall as progressions unfold
- Used to compute patterns of tension, attraction, expectation

**Tonal Tension Components:**
1. **Tonal distance** - How far from tonic (in pitch space)
2. **Dissonance** - Intervallic clash
3. **Voice leading** - Smoothness of pitch transitions
4. **Hierarchical tension** - Structural position in phrase

**Key resources:**
- Lerdahl, "Tonal Pitch Space" (Oxford, 2001) - The foundational text
- [PMC: Computational Model of Tonal Tension Profiles](https://pmc.ncbi.nlm.nih.gov/articles/PMC7712964/)
- [Columbia: Visualization of Tonal Pitch Space](https://www.ee.columbia.edu/~dpwe/papers/BurgS05-pitchspace.pdf) (downloaded)

**Implications for Fractured Jukebox:**
- Already computing tension from degree + quality - this is valid approach
- Could add voice leading smoothness to tension calculation
- Pitch space distance could modulate transition speed (closer = faster)

---

### 3. Music Expectation & Emotion (Huron's ITPRA Theory)
**Why music creates emotional responses through expectation**

**Five Response Systems:**
1. **Imagination** - Anticipating what comes next (pre-outcome)
2. **Tension** - Uncertainty creates physiological stress (pre-outcome)
3. **Prediction** - Reward for accurate prediction (post-outcome)
4. **Reaction** - Immediate surprise/startle response (post-outcome)
5. **Appraisal** - Conscious evaluation after the fact (post-outcome)

**Musical devices exploiting expectation:**
- **Syncopation** - Violates metric expectation → tension + surprise
- **Cadences** - Creates strong expectations → satisfaction when fulfilled
- **Deceptive cadence** - Expectation violated → surprise + reappraisal
- **Climax** - Built tension → release
- **Repetition** - Builds prediction accuracy → reward

**Key resource:**
- Huron, "Sweet Anticipation" (MIT Press) - [Free on Internet Archive](https://archive.org/details/sweetanticipatio0000huro)

**Implications for Fractured Jukebox:**
- Syncopation detection could trigger visual "surprise" responses
- Deceptive cadences could have special visual treatment
- Build-up sections could accumulate visual energy for release
- Need better phrase structure detection (beyond bar-level chords)

---

### 4. Chromesthesia (Sound→Color Synesthesia)
**How synesthetes actually perceive music as color**

**Characteristics:**
- Highly idiosyncratic (personal mappings vary)
- Consistent over time for individuals
- Adds to rather than replaces auditory perception
- More common in musicians

**Common patterns:**
- Lower pitch → darker colors
- Higher pitch → lighter colors
- Tempo affects color perception (faster = different associations)
- Timbre (instrument) matters, not just pitch

**Notable synesthete musicians:**
Billy Joel, Billie Eilish, Lorde, Itzhak Perlman

**Key resources:**
- [PMC: Synesthesia and Music Perception](https://pmc.ncbi.nlm.nih.gov/articles/PMC5618987/)
- [Wikipedia: Chromesthesia](https://en.wikipedia.org/wiki/Chromesthesia)

**Implications for Fractured Jukebox:**
- Our chromatic palette approach (pitch class → hue) is one valid approach
- But actual synesthetes have personal mappings - no "correct" universal mapping
- Timbre-based coloring could be interesting (different instruments = different hues)

---

### 5. Tonnetz & Neo-Riemannian Theory
**Geometric representation of harmonic relationships**

**The Tonnetz:**
- Hexagonal lattice of pitches
- Adjacent triangles = triads sharing common tones
- Three consonant intervals as axes (P5, M3, m3)
- Movement between adjacent triads = smooth voice leading

**Neo-Riemannian Transformations:**
- **P (Parallel)**: C major ↔ C minor (change third)
- **L (Leading-tone)**: C major ↔ E minor (move root by semitone)
- **R (Relative)**: C major ↔ A minor (relative minor/major)

**Key insight:** Parsimonious voice leading (minimal pitch movement) = smooth progression

**Key resources:**
- [Neo-Riemannian Theory Explained (with interactive Tonnetz)](https://tonnetz.liamrosenfeld.com/explain-music)
- [Interactive Tonnetz - Girl in Blue Music](https://girlinbluemusic.com/interactive-tonnetz/)
- [Wikipedia: Tonnetz](https://en.wikipedia.org/wiki/Tonnetz)

**Implications for Fractured Jukebox:**
- Could visualize chord progressions on Tonnetz overlay
- Smooth visual transitions for P/L/R transformations
- Detect "smooth" vs "distant" progressions for different visual treatments

---

### 6. Rhythm, Groove & Neural Basis
**Why rhythm creates the urge to move**

**Groove characteristics:**
- Desire to move along with music
- Associated with pleasure/reward
- Involves motor and reward brain networks
- Linked to temporal prediction

**Neural mechanisms:**
- Rhythm activates motor cortex even without movement
- Groove correlates with neural entrainment (brain syncing to beat)
- Performed rhythms (human timing variance) create more groove than mechanical
- Syncopation at moderate levels increases groove

**Key resources:**
- [PMC: Human Brain Basis of Musical Rhythm Perception](https://pmc.ncbi.nlm.nih.gov/articles/PMC4101486/)
- [PMC: Toward a Neural Basis of Music Perception](https://pmc.ncbi.nlm.nih.gov/articles/PMC3114071/)
- [ScienceDirect: Review of research on musical groove](https://www.sciencedirect.com/science/article/pii/S0149763423004918)

**Implications for Fractured Jukebox:**
- Beat-grid alignment is essential (already doing this)
- Human timing variance could be detected and visualized
- Moderate syncopation = good; extreme = less groovy
- Visual "entrainment" to beat is key

---

### 7. Visual Music History
**Pioneers and techniques from visual music tradition**

**Oskar Fischinger (1900-1967):**
- "Father of Visual Music"
- Meticulous sync between forms, colors, and musical rhythm
- Visual equivalents of rhythm, harmony, counterpoint
- "Divisionist" technique: changing colors frame-by-frame for luminosity
- Designed Toccata & Fugue sequence in Fantasia (quit over Disney alterations)
- Created the Lumigraph instrument

**Key techniques:**
- Cel-layering for counterpoint visualization
- Wax slicing machine for organic cross-sections
- Direct painting on film

**Key resources:**
- [Center for Visual Music: Fischinger Bio](https://www.centerforvisualmusic.org/Fischinger/OFBio.htm)
- [ACMI: The Art of Visual Music](https://www.acmi.net.au/education/school-program-and-resources/the-art-of-visual-music/)

**Implications for Fractured Jukebox:**
- Study Fischinger's films for visual vocabulary
- Counterpoint visualization (multiple melodic lines) underexplored
- Frame-by-frame color variation for luminosity

---

### 8. VJing & Live Visualization
**Real-time visual performance tradition**

**History:**
- Term coined 1978 by Merrill Aldighieri at Hurrah nightclub NYC
- MTV borrowed concept for video jockey hosts
- Roots in liquid light shows, color organs, magic lanterns

**Techniques:**
- Video mixing/layering
- Real-time audio reactivity
- 3D projection mapping
- Generative systems

**Tools:**
- Max/MSP, Pure Data, vvvv (patching environments)
- Resolume, VDMX, TouchDesigner (VJ software)
- Processing, openFrameworks (creative coding)

**Key resources:**
- [Wikipedia: VJing](https://en.wikipedia.org/wiki/VJing)
- [Hyperallergic: How VJs Create Immersive Experiences](https://hyperallergic.com/514655/video-jockey-concert-interviews/)

---

### 9. Generative Art & Creative Coding
**Algorithmic approaches to visual creation**

**Key concepts:**
- Rules/constraints + randomness = endless variation
- Audio feature extraction → visual parameter mapping
- Emergent complexity from simple rules

**Notable practitioners:**
- Brian Eno (generative music pioneer)
- Scott Draves (Electric Sheep - collective AI art)
- Raven Kwok (algorithmic visual art)

**Tools/frameworks:**
- Processing, p5.js
- openFrameworks
- TouchDesigner
- Shadertoy (GLSL)

**Key resources:**
- [GitHub: awesome-creative-coding](https://github.com/terkelg/awesome-creative-coding)
- [AIArtists.org: Generative Art Guide](https://aiartists.org/generative-art-design)

---

## Downloaded Papers

Located in `research/raw-docs/`:

| File | Description |
|------|-------------|
| `tonal-pitch-space-visualization.pdf` | Columbia paper on visualizing pitch space |
| `realtime-music-visualization.pdf` | OSU thesis on real-time music visualization |
| `harmony-color-visualization.pdf` | Harmony-color mapping research |
| `music-visualization-survey.pdf` | Music emotion visualization techniques |
| `ecological-psychoacoustics-auditory-displays.pdf` | Psychoacoustic principles for auditory display |
| `feature-selection-music-retrieval.pdf` | Music information retrieval feature survey |

---

## Research Questions for Fractured Jukebox

### Immediate (actionable now)
1. **Voice leading smoothness** - Can we detect smooth vs. distant progressions?
2. **Syncopation detection** - Mark off-beat accents for visual emphasis?
3. **Timbre differentiation** - Color by instrument, not just pitch class?

### Medium-term (require new features)
4. **Phrase structure** - Detect musical phrases beyond bar-level?
5. **Tonnetz overlay** - Visualize chord movement in pitch space?
6. **Expectation violation** - Highlight deceptive cadences, surprises?

### Long-term (research needed)
7. **Groove quantification** - Measure "grooviness" from MIDI timing?
8. **Counterpoint visualization** - Multiple melodic lines interacting?
9. **Structural climax detection** - Build-up and release patterns?

---

## Key Insights Summary

1. **Cross-modal correspondences are real** - Pitch↔brightness, tempo↔speed are nearly universal
2. **Tension can be computed** - Lerdahl's framework is mathematically rigorous
3. **Expectation drives emotion** - Huron's ITPRA explains why music "feels"
4. **Groove involves prediction** - Neural entrainment to beat is measurable
5. **No universal synesthesia mapping** - But common patterns exist (low=dark, high=bright)
6. **Visual music has rich history** - Fischinger's techniques still relevant
7. **Parsimonious voice leading feels smooth** - Tonnetz makes this geometric
