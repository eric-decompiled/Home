# Key Learnings

## What Works

### Visual Design
- **Mixed cross-family fractal anchors**: Manually curated via config tool, stored in localStorage
- **Orbit-based beat motion**: 4 offsets per anchor with sinusoidal interpolation
- **Openwork clock hands**: Stroked outlines with transparent interiors
- **Separate melody/bass clocks**: Different visual weight matches musical register
- **Long edge decay with smoothstep**: Connections stay visible, fade gracefully
- **sqrt radius for spirals**: Even visual spacing across octaves. Formula: `radius = maxR * (0.02 + 0.98 * Math.sqrt(t))`
- **Stepwise vs leap trail drawing**: Stepwise motion (≤3 semitones) follows spiral curve; larger intervals draw straight lines
- **Bezier curves for spiral trails**: Cubic Bezier with tangent-based control points (tangentStrength ~0.18)
- **Configurable spiral tightness**: Power curve exponent (default 1.25), range 0.5-1.5
- **Sine wave twist for spiral**: `Math.sin(fromRoot / 12 * Math.PI * 2) * 0.05` prevents angular discontinuity
- **Neutral grey for C**: Good "home base" that doesn't compete with chromatic colors
- **Orange for G#**: Bridges green (G) and red (A) naturally on color wheel
- **Deep saturated palettes**: Forest green (G), deep red (A), deep blue (E) - rich and moody beats bright/washed-out
- **Muted accidentals**: Sharps/flats use dusty/pastel versions of neighboring colors. C# = cool mauve, D# = dusty violet, F# = dusty cyan, A# = dusty coral. Creates visual hierarchy where natural notes pop and accidentals recede
- **Deep natural notes**: Primary pitches (C, D, E, F, G, A, B) use rich saturated colors. Deeper tones read better than bright/washed versions
- **Color swapping for better flow**: Sometimes swapping adjacent colors (e.g., D↔D#, F↔F#) creates better chromatic transitions. Test by ear—if colors feel "wrong" for a key, try swapping
- **Dynamic range compression for brightness**: High floor (0.5) + capped ceiling (0.75 alpha) creates consistent visibility. Quiet notes still visible, loud notes don't blow out. Use sqrt for perceptual scaling: `floor + range * sqrt(velocity)`

### Music Mapping
- **Bar-level chord detection**: Stable, musically meaningful
- **Chord root for bass tracking**: Following chord root provides harmonic stability (not individual bass notes)
- **Power law for anticipation lookahead**: `10.0 * bpm^(-0.68)` scales perceptually across tempos. Derived from empirical testing on FF Prelude (82 BPM), Don't Stop Believing (112 BPM), Sweet Child O' Mine (128 BPM)
- **Small lower bound gap (2.5%)**: Anticipation notes stay visible until 4-5ms before onset, minimizing visual discontinuity when transitioning to active note
- **Per-pitch-class buffer for load shedding**: Allow up to 4 notes per pitch class in anticipation window. Only sheds when specific pitch is overloaded, letting bass octave doublings and chord voicings through
- **Key modulation rotation**: Tween `keyRotation` so new tonic aligns to 12 o'clock. Shortest-path normalization prevents 360° spins
- **Groove curves (anticipation/arrival)**: Based on two-phase dopamine response. Use `beatAnticipation` for glow buildup, `beatArrival` for pulse impact
- **Bar-level groove for bass**: Bass/harmonic elements respond to `barAnticipation`/`barArrival` for weighty feel
- **Generalized pulse driver**: Use `activeVoices` onsets + beat grid pulse + drums, not just drums. Works with any MIDI
- **Pulse-based anticipation**: Flash upcoming notes on beat boundaries instead of continuous tracking. Avoids timing issues across different tempos, pulses fade quickly (~0.15s) so notes don't look "stuck"
- **GSAP beat-relative timing for clocks**: Hand motion duration as fraction of beat (0.5 beats for melody, 1.0 beats for bass)
- **Windup animation for chord changes**: Pull back 1/36 of movement over 3/4 beat before arriving—adds weight and anticipation
- **Clock hand cutouts aligned to spiral**: Calculate positions dynamically in render using same spiralPos params as note spiral for exact alignment across all keys
- **Attack envelope for sustained trails**: Use star.age to create attack curve (rise 0-0.1s, exponential decay to 40% sustain). Trails punch bright on note attack then settle to softer sustain
- **Quadratic curves for spiral trails**: `quadraticCurveTo` through midpoints creates smooth curves following spiral path. Avoids visible line segments from `lineTo`
- **Trail connected to head**: Trail should end at `star.progress` (not offset behind) so it stays attached as they travel together
- **Shared shape system across effects**: Note Spiral and Note Star share toggleable decorations (ring, trails, spark, firefly). Core rendering (stars+beams for Note Star, dots+trails for Note Spiral) always on; decorations optional via multi-toggle. Reduces code duplication, gives users consistent vocabulary across effects

### Physics & Animation
- **Compass physics for clock hands**: Spring-damper system (springK=12, damping=5) creates weighty motion with natural overshoot and settle. Hand swings toward target, overshoots slightly, drifts back. New notes can interrupt mid-motion smoothly. Feels more physical than tweening
- **Attraction decay for clock release**: Scale spring constant by decaying `attractionStrength` after note ends. Delay 300ms before decay starts (so short gaps don't interrupt), then exponential decay (rate 2.5). Hand gradually "lets go" and drifts rather than staying rigidly locked to last note. New onset instantly resets to full attraction
- **Wave tank physics**: Model energy as waves with momentum—push creates motion that continues after input stops
- **Spatial wave tanks**: Separate waves for bass (from bottom) and melody (from sides). Creates directional interest
- **Pitch-weighted energy**: Higher notes contribute more energy (scale by `1 + (midi - 60) / 24`)
- **Chord quality modulation**: dim/aug = rough texture, 7ths = sophisticated detail, major = clean
- **Wave reflection via ghost sources**: Simple, effective boundary modeling
- **Pitch-positioned wave drops**: Clock angle + octave radius creates musical geography
- **Anchor + offset model**: Parameters = anchor base + energy offset. Energy decay returns to anchor
- **Asymmetric animation response**: Fast attack (rate 8.0), slow decay (rate 1.5) feels punchy but smooth
- **dt capping**: `dt = Math.min(dt, 0.1)` prevents physics blowup when browser throttles backgrounded tabs

### Interactive Elements
- **Heavy puck physics**: Small impulses, high friction (`exp(-2.5 * dt)`), low max velocity. "Bowling ball on ice" feel
- **Non-homing projectiles**: Store target position at launch time. Targets can dodge if they move
- **Mouse repulsion fields**: Continuous force falloff (`1 - dist/radius`)² feels natural
- **Click-drag-flick for direct manipulation**: Track drag velocity, apply on release with cap
- **Random direction music bumps**: Fixed directions cause objects to get stuck at boundaries

### Performance
- **Layered fills instead of shadow blur**: 2-3 expanding translucent shapes. 10x+ faster
- **Subtle groove modulation (20% swing max)**: Larger swings look distracting on fast songs
- **Particle system caps**: 50 max particles, simple circles with white core, 2-4 emissions per impact
- **Two-palette-stop gradients for keys**: Pick two actual palette colors rather than darkening/lightening one
- **Key depression with smooth return**: Decay brightness at exp(-4.0 * dt), threshold at 0.1
- **Time interpolation for smooth seek bar**: Interpolate using `audioContext.currentTime` delta
- **Resolution scaling for compositor**: Render at 75% internal resolution, upscale at final blit. 2x speedup with minimal visual impact. Use `imageSmoothingQuality = 'high'` for clean upscale
- **Path2D caching for clip paths**: Cache complex paths (kaleidoscope wedges) instead of recreating each frame. 42% faster for kaleidoscope effect
- **Nebula caching for starfield**: Pre-render expensive radial gradients to off-screen canvas. Only re-render when nebula count changes
- **Canvas state batching**: Track `globalAlpha` and `globalCompositeOperation` to avoid redundant state changes
- **Profiling infrastructure**: Expose `compositor.profileEnabled` and `getProfileStats()` for per-effect timing. Essential for finding bottlenecks
- **Spatial hash grid for graph physics**: Instead of O(n²) all-pairs repulsion, hash nodes into grid cells matching cutoff distance (300px). Each node checks only 9 adjacent cells. Enables unlimited nodes with linear scaling - no pruning needed

### UI/UX
- **Fullscreen with PWA fallback**: Fullscreen API doesn't work on iOS Safari. Provide "Add to Home Screen"
- **Hide controls in fullscreen**: Slide up, reveal on mouse-to-top (desktop) or tap-near-top (mobile)
- **Animation panel closed by default**: Less visual clutter on first load
- **Piano mode with immediate effect**: Stop all notes (`synth.stopAll`) before program changes
- **CSS custom properties for smooth progress bars**: Use CSS variable (`--progress: 0-1`) with `linear-gradient`
- **Octave-aware palette coloring**: Low octaves use darker stops (0-2), high octaves use brighter stops (3-5)
- **Drag-and-drop color picker**: Let users swap colors between notes by dragging. No color theory knowledge needed to experiment
- **Separate playlist category for uploads**: User-uploaded MIDIs get their own "Uploads" category with visual spacer. Button hidden until first upload, persists across sessions via localStorage
- **Base64 for localStorage binary storage**: Store ArrayBuffer as base64 string for localStorage persistence. Convert via `btoa(String.fromCharCode(...bytes))` and reverse with `atob()` + `charCodeAt()`
- **Contextual delete button**: Show trash icon next to picker only when viewing uploads. Better than dropdown option which didn't work reliably
- **Graceful removal with playback continuity**: When deleting current upload, continue playing next song if was playing, or pause if no more uploads. Switch to default playlist when last upload removed
- **Preset configs for unused effects**: Even if a preset doesn't use bass-clock/melody-clock, add `{ showNumerals: false, showNotes: false }` to prevent overlay numerals/notes from showing when those slots are empty

### URL Sharing
- **URL query params for sharing**: Encode as short keys, use `history.replaceState()`. Default preset = clean URL
- **Preset-aware URL encoding**: Skip configs that match PRESET_CONFIGS for that preset
- **DEFAULT_CONFIGS for all effects**: Prevents non-default configs from polluting URLs

### Config Tool
- **Zoom debounce with scaled preview**: Show scaled/blurry preview immediately, debounce expensive re-render (150ms)
- **Drag debounce with requestAnimationFrame**: Limit redraws to screen refresh rate
- **Object-fit: contain coordinate correction**: Calculate actual rendered size and offset for accurate clicks
- **Larger hit radius for small targets**: 14px hit radius for orbit dots (drawn at 5px)
- **NESW default orbit pattern**: Cardinal directions are intuitive and look clean
- **Temperature slider for reroll variation**: Low temp = refine nearby, high temp = explore widely
- **Algebraic form for Newton fractals**: Pure algebraic complex division is much faster than sqrt/atan2/cos/sin
- **Atlas grid toggle**: 8x8 Julia set thumbnails help visualize parameter space
- **Always render thumbnails using cache**: Instead of conditional rendering with dirty flag, always call `getOrRenderThumbnail()` which checks cache first. Dirty flag pattern skipped rendering when flag wasn't set, leaving stale/empty thumbnails
- **Separate "default" from "stored" anchors**: When user clicks Default preset, load from `PRESET_ANCHORS` (built-in defaults), not from localStorage (current saved state). Need distinct `loadDefaultAnchors()` vs `loadAnchors()` methods
- **Cross-component callbacks must propagate fully**: When fractal config saves, call `musicMapper.reloadAnchors()` not just `dirty = true`. The fractal engine reads from localStorage but doesn't know when it changes—must explicitly notify
- **Data attributes for reliable DOM queries**: Use `data-slot="Foreground"` on elements for clean `querySelector('.layer-slot[data-slot="Foreground"]')`. Avoids fragile `:has()` selectors with nested structure assumptions
- **Sync UI state across component boundaries**: When selecting degree cards from different fractal families, update family selector buttons to match. Internal state changes must reflect in all related UI elements

## What Doesn't Work

### Visual Design
- **Solid-fill clock silhouettes**: Details invisible
- **Palettes washing to white**: Loop to saturated mid-tone instead
- **Linear palette mapping**: Compresses boundary detail (`sqrt` spreading essential)

### Animation
- **High rotation friction**: Rotation dies before next beat (1.2 is sweet spot)
- **Spring physics for music response**: Feels stiff/mechanical. Wave tank is more fluid
- **Direct energy → parameter mapping**: Feels twitchy. Cascade through smoothing
- **Strong groove modulation (40%+ swing)**: Looks flashy in demos but distracting on fast songs
- **Simple tweening for clock hands**: Even with long durations and gentle easing, tweens feel weightless. Compass physics (spring-damper) adds inertia and overshoot that feels more physical

### Performance
- **Heavy particle systems**: Crash framerate—keep overlays minimal
- **Shadow blur for glow effects**: Extremely expensive, causes frame drops
- **Radial gradients per particle**: Too expensive at scale. Use simple filled circles
- **WebGL post-process with Canvas2D source**: Texture upload (`texImage2D`) every frame is slower than Canvas2D drawImage. WebGL only wins if entire pipeline is GPU-based
- **ImageData batching for particles**: `getImageData`/`putImageData` copies entire canvas buffer (~16MB at high res). Simple `fillRect` calls are faster for sparse particles
- **Internal downscale+upscale for post-process**: Adding extra drawImage calls for downscale/upscale overhead exceeds savings from smaller intermediate draws
- **Dirty tracking for music-reactive effects**: Effects driven by continuous music params change every frame anyway. Dirty flags add complexity without benefit
- **Oversized clip radius**: Kaleidoscope was using `max(w,h) * 1.5` when `diagonal/2 * 1.15` suffices. Tighter radius reduces wasted clipping work
- **AABB source region for clipped draws**: Computing bounding box of visible wedge and using `drawImage(src, sx, sy, sw, sh, ...)` doesn't help - Canvas2D doesn't optimize source region reads, and the overhead negates any savings

### Music Mapping
- **Drum-only energy drivers**: Many MIDIs have no drums. Generalize to all note onsets + beat grid
- **Bass clock tracking individual bass notes**: Too erratic. Follow chord root instead
- **Discrete BPM presets for anticipation**: Causes jarring 50%+ drops at preset boundaries. Use continuous power law curve instead
- **Per-pitch-class debounce (keeping only closest)**: Too aggressive—sheds bass notes and chord voicings. Use buffer with limit per pitch class instead
- **Per-MIDI-note debounce**: Still too aggressive for dense arrangements. Octave doublings and chord voicings need to show
- **Large lower bound gap (5%+)**: Creates visible discontinuity where anticipation disappears before note plays. Keep gap under 3%
- **Continuous anticipation tracking**: Time-based lookahead with precise offsets causes timing issues on different tempos. Beat-synced pulses are more reliable and rhythmically appropriate
- **Drum pulse circles around beat positions**: Despite multiple iterations with capacitor models, hihat accents, different radii—always felt either too heavy/sudden or didn't "land" visually. Better to let wave tanks respond to all onsets
- **Pre-calculated tick fractions for clock cutouts**: Lookup tables and tweened fractions don't align perfectly across all keys. Calculate positions dynamically each frame using spiralPos directly
- **Breath effect on clock elements**: Subtle pulsing looked more jittery than organic. Removed in favor of static sizing

### Note Star Trails
- **Segmented comet trails**: Splitting trail into sections (tail/mid/head) with different alpha/width multipliers adds complexity and draw calls without clear visual benefit over uniform trails
- **Per-segment groove brightness modulation**: Recording groove samples as star travels and modulating each segment's brightness is complex and the visual effect wasn't impactful enough to justify overhead
- **Segment-by-segment beam drawing**: Drawing line segments individually instead of one smooth path increases draw calls significantly. Use single-path quadratic curves instead

### Config Tool
- **Conditional thumbnail rendering with dirty flag**: Checking `if (allThumbnailsDirty)` before rendering skips thumbnails when flag is false, leaving stale/empty canvases. The cache already handles efficiency—just always call the render function
- **Loading localStorage state for "Default" preset**: `loadAnchors()` reads from localStorage (current saved state). Users clicking Default expect built-in defaults, not whatever was last saved
- **"Remove" option in select dropdown**: Adding `<option value="__remove__">` to song picker didn't trigger change events reliably. Use a separate delete button beside the picker instead
