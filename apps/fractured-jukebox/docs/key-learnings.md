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
- **Voice leading smoothness for transitions**: Measure chord root motion interval class (0-6 semitones). Smooth motion (P4/P5 = circle of 5ths) gets longer tweens; rough motion (tritone) gets shorter, more dramatic transitions. Map via lookup: `{0: 1.0, 5: 0.95, 4: 0.8, 3: 0.8, 2: 0.65, 1: 0.5, 6: 0.3}`
- **Tension-based color brightness**: Use smoothed tension (low smoothing factor ~0.02 for slow response) to modulate effect brightness. High tension = brighter, low tension = faded. Creates musical dynamics where resolved passages feel calm, tense passages pop
- **Color tweening on chord changes**: Store base colors separate from final colors. GSAP tween base colors on palette change (8th note duration), apply tension brightness on top each frame. Smooth color transitions without affecting tension modulation
- **Pitch-differentiated ornaments**: Ring ornaments vary by pitch - bass (low pitchT) gets thicker lines, darker colors, smaller radius; melody (high pitchT) gets thinner lines, brighter colors, larger radius. Creates visual register distinction
- **Cross-effect data sharing via MusicParams**: Melody clock can display bass info (color, brightness) for hub jewels. Track bass pitch class and velocity, smooth color transitions, use for decorative elements. Creates visual unity without coupling effects directly
- **Ornate clock decorations**: Multiple concentric hub rings, rotating jewels at hand angle, filigree flourishes at cardinal points, tick marks between note labels, diamond shapes along hand. Small dots with decorative rings at octave positions. Layered detail creates elegant aesthetic

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

### Bundle Size & Loading
- **Custom tweening over GSAP**: GSAP is 180KB+ minified. A ~120-line custom tween system using `requestAnimationFrame` with cubic easing functions provides identical API (`gsap.to()`, `gsap.fromTo()`, `gsap.timeline()`) at ~4KB. Effects don't need to change imports
- **Eager chunk loading for core features**: Use `const promise = import('module')` at module top-level (not inside a function) to start loading immediately while keeping code-split. Module loads in parallel with main bundle, ready by first use
- **Lazy-load UI panels**: Config panels that users rarely open can be dynamically imported on first interaction. Saves ~76KB from initial load
- **GSAP-compatible wrapper pattern**: Export a `gsap` object with same method signatures (`to`, `fromTo`, `timeline`). Consuming code doesn't need changes when swapping implementations
- **Tree-shaking removes orphan files**: Unused effect files (never imported) don't increase bundle size—Vite/Rollup excludes them. Safe to leave experimental code, but cleaner to delete

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
- **Starfield regeneration thresholds**: Only regenerate stars when canvas size changes by >200px. Smaller resizes reuse existing stars. Prevents expensive respawn on minor viewport adjustments
- **Double-rAF for deferred initialization**: Use nested `requestAnimationFrame(() => requestAnimationFrame(() => ...))` to defer star generation until after layout settles. Ensures accurate canvas dimensions on page load
- **Config value change guards**: Check if value actually changed before triggering expensive operations. Preset switches reset configs to defaults—without guards, debounced respawns trigger even when value is unchanged
- **Canvas state batching**: Track `globalAlpha` and `globalCompositeOperation` to avoid redundant state changes
- **Profiling infrastructure**: Expose `compositor.profileEnabled` and `getProfileStats()` for per-effect timing. Essential for finding bottlenecks
- **Spatial hash grid for graph physics**: Instead of O(n²) all-pairs repulsion, hash nodes into grid cells matching cutoff distance (300px). Each node checks only 9 adjacent cells. Enables unlimited nodes with linear scaling - no pruning needed

### State Management
- **Audio player is the source of truth**: Don't cache `isPlaying` in a separate variable—it desyncs. Query `audioPlayer.isPlaying()` directly
- **Recreate resources on song switch**: Call `destroy()` to null sequencer, then create fresh one on `loadMidi()`. Prevents stale state from previous song
- **Single unified load function with autoPlay param**: One `loadSong(index, autoPlay)` function handles all entry points (song picker, prev/next, playlist switch, auto-advance). Explicit autoPlay parameter instead of "remembering" previous state
- **Token-based stale callback detection**: Increment `loadToken` on each load, capture as `myToken`. Check `myToken === loadToken` after async operations to detect if superseded by newer load
- **Sync UI in render loop**: Call `setPlayBtnState(audioPlayer.isPlaying())` every frame. Single source of truth, always correct, no manual syncing needed
- **Disable UI during load**: Set `playBtn.disabled = true` immediately when starting load. Re-enable after success. Prevents race conditions from clicking during async operations

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
- **CSS Grid for consistent button sizing**: Use `display: grid; grid-template-columns: repeat(3, 1fr)` for radio button groups instead of flexbox. Buttons get equal width regardless of label length, creating clean aligned rows

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

### Documentation & Diagrams
- **Hand-crafted SVG for architecture diagrams**: Write SVG directly instead of using drawing tools. Excalidraw-compatible format (`<!-- svg-source:excalidraw -->` comment) allows future editing
- **Dark theme matches app aesthetic**: Dark background (#1e1e1e) with light text and colorful component boxes
- **Row-based layout for data flow**: Group by processing stage (Input → Analysis → Mapping → Effects → Render) with clear vertical flow within each stage
- **Flow indicators at bottom**: Dashed arrows with stage labels reinforce the pipeline concept without cluttering main diagram
- **Group related components visually**: Effects layers in one container box with internal sub-boxes shows they're a cohesive system
- **Color-code by function**: Green for analysis/parsing, yellow for data structures, purple for processing, orange for output params, cyan for rendering
- **Simplify for clarity**: Remove ancillary systems (state management, fractal anchors) to focus on core data flow. Can always create separate detail diagrams
- **System font stack for SVG text**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` renders cleanly across platforms

### Z-Index & Stacking Contexts
- **Parent z-index controls entire context**: When parent has `position: relative` + `z-index`, all children's z-index values only compete within that context. To get dropdowns above overlays, give the parent container (top-bar) a z-index higher than the overlay's parent container (canvas-wrap), not just the dropdown itself
- **Stacking context hierarchy**: `canvas-wrap: z-index: 1` contains play-overlay. `top-bar: z-index: 10` contains dropdowns. The entire top-bar context stacks above entire canvas-wrap context, so any dropdown appears above any overlay
- **Keep z-index values low**: Avoid z-index inflation (1000, 9999, 10000). Use simple hierarchy: base content (1), fixed elements (10), dropdowns (100). Stacking contexts make global competition unnecessary

### Custom Scrollbars
- **macOS auto-hides despite CSS**: Native scrollbar styling (`scrollbar-width: thin`, `::-webkit-scrollbar`) still auto-hides on macOS due to system preference. `overflow-y: scroll` doesn't prevent this
- **Custom scroll indicator for always-visible**: Create separate DOM elements (track + thumb divs), position via CSS, update thumb position via JS on scroll events. Use MutationObserver to detect menu open/close
- **Double-rAF for accurate scroll metrics**: `scrollHeight`/`clientHeight` may not be accurate immediately after DOM changes. Use nested `requestAnimationFrame` to ensure layout is complete before reading

### Mobile UI
- **Landscape shows desktop subset**: Instead of full mobile or full desktop UI in landscape, show specific buttons (Stars, Warp, Piano) by hiding others (`#mobile-bar-clock { display: none }`)
- **Touch anywhere shows controls**: On iOS landscape, attach touch listener to `document` not just canvas, so tapping anywhere recalls the auto-hidden top bar
- **Collapsible sections with toggle headers**: Use `display: contents` on desktop (transparent wrapper), `display: flex; flex-direction: column` on mobile. Arrow icon (▼/▶) rotates on collapse
- **Long press for touch placement**: 400ms hold to place anchor. Cancel if finger moves >10px (allows scrolling). Use `navigator.vibrate(50)` for haptic feedback
- **Modifier toggle button for mobile**: Replaces Ctrl/Cmd modifier. Tap to place instantly when ON, drag orbit for skew/spread. Styled as caps-lock style toggle
- **Body overflow hidden for modal panels**: Set `document.body.style.overflow = 'hidden'` when panel opens, restore on close. Prevents background scrolling on mobile
- **overflow-y: scroll for touch scrolling**: Use `scroll` not `auto` for reliable touch scroll. Add `-webkit-overflow-scrolling: touch` for iOS momentum
- **Slide animations for panels**: Open slides down from above (`translateY(-100%)` → `translateY(0)`), dismiss slides down slightly (`translateY(30px)`) with fade. Use `dismissing` class with setTimeout to complete animation before removing `visible`
- **Separate content area wrapper**: When splitting desktop side-by-side layout into mobile collapsible sections, wrap both in a flex container (`fc-content-area`) that handles the row/column switch

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
- **Oversized starfield buffer**: Generating stars for 1.3x canvas size to avoid regeneration on resize causes sparse appearance—stars positioned in larger space but only portion visible. Better to use regeneration thresholds at actual canvas size
- **setTimeout for layout-dependent init**: Fixed delays (100ms) can fire before layout completes or waste time waiting. Double-rAF syncs precisely with browser paint cycle
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

### Mobile UI
- **touch-action on scroll containers**: Setting `touch-action: pan-y` on overlay or scroll container can interfere with native scrolling. Let the browser handle it naturally with `overflow-y: scroll`
- **overflow: auto for touch scroll**: `auto` is less reliable than `scroll` for touch devices. Use `overflow-y: scroll` explicitly

### State Management
- **Cached `isPlaying` variable**: Separate variable desyncs from `audioPlayer.isPlaying()` truth. Rapid song switching causes button to get "stuck" in wrong state
- **Reusing sequencer across songs**: Calling `sequencer.loadNewSongList()` on existing sequencer carries over timing/state artifacts. Create fresh sequencer each load
- **Multiple async callbacks tracking generation**: Pattern like `const thisGen = loadGeneration + 1; await loadSong(); if (loadGeneration === thisGen) { ... }` is fragile across multiple call sites. Put autoPlay inside the load function itself
- **Manual `setPlayBtnState(true/false)` calls scattered across code**: Easy to miss cases, get out of sync. Single render loop sync is foolproof

### Bundle Size
- **Motion One for simple tweening**: Despite being marketed as lightweight, `motion` package pulls in `framer-motion` (5.4MB node_modules) because it's the React-focused version. Even `motion-dom` is 4.2MB. For simple `gsap.to()` replacements, a custom solution is smaller
- **Lazy-loading synchronously-used code**: If code is used during initial render (e.g., preset buttons checking `panel.getSelectedPresetId()`), lazy-loading requires async wrappers everywhere. Only lazy-load truly on-demand features
