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

### Music Mapping
- **Bar-level chord detection**: Stable, musically meaningful
- **Chord root for bass tracking**: Following chord root provides harmonic stability (not individual bass notes)
- **Key modulation rotation**: Tween `keyRotation` so new tonic aligns to 12 o'clock. Shortest-path normalization prevents 360° spins
- **Groove curves (anticipation/arrival)**: Based on two-phase dopamine response. Use `beatAnticipation` for glow buildup, `beatArrival` for pulse impact
- **Bar-level groove for bass**: Bass/harmonic elements respond to `barAnticipation`/`barArrival` for weighty feel
- **Generalized pulse driver**: Use `activeVoices` onsets + beat grid pulse + drums, not just drums. Works with any MIDI
- **GSAP beat-relative timing for clocks**: Hand motion duration as fraction of beat (0.5 beats for melody, 1.0 beats for bass)

### Physics & Animation
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

### UI/UX
- **Fullscreen with PWA fallback**: Fullscreen API doesn't work on iOS Safari. Provide "Add to Home Screen"
- **Hide controls in fullscreen**: Slide up, reveal on mouse-to-top (desktop) or tap-near-top (mobile)
- **Animation panel closed by default**: Less visual clutter on first load
- **Piano mode with immediate effect**: Stop all notes (`synth.stopAll`) before program changes
- **CSS custom properties for smooth progress bars**: Use CSS variable (`--progress: 0-1`) with `linear-gradient`
- **Octave-aware palette coloring**: Low octaves use darker stops (0-2), high octaves use brighter stops (3-5)

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

### Performance
- **Heavy particle systems**: Crash framerate—keep overlays minimal
- **Shadow blur for glow effects**: Extremely expensive, causes frame drops
- **Radial gradients per particle**: Too expensive at scale. Use simple filled circles

### Music Mapping
- **Drum-only energy drivers**: Many MIDIs have no drums. Generalize to all note onsets + beat grid
- **Bass clock tracking individual bass notes**: Too erratic. Follow chord root instead
- **Drum pulse circles around beat positions**: Despite multiple iterations with capacitor models, hihat accents, different radii—always felt either too heavy/sudden or didn't "land" visually. Better to let wave tanks respond to all onsets
