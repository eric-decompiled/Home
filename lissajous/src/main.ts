import './style.css'

// Set up the UI
const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <div class="container">
    <div class="sidebar left">
      <div class="info">
        <h2>Lissajous Curves</h2>
        <p>Parametric curves formed by combining two perpendicular harmonic oscillations:</p>
        <code>x = A·sin(aω + δ)<br>y = B·sin(bω)</code>
        <p>The ratio of frequencies <strong>a:b</strong> determines the curve's shape. When these ratios match musical intervals (using just intonation), the patterns visually represent the harmonic relationships we hear. Simple ratios create elegant patterns, while complex ratios form intricate webs.</p>
      </div>

      <div class="presets">
        <h3>Chromatic Intervals</h3>
        <div class="preset-grid">
          <button class="preset-btn" data-preset="unison">Unison (1:1)</button>
          <button class="preset-btn" data-preset="minor2nd">m2 (16:15)</button>
          <button class="preset-btn" data-preset="major2nd">M2 (9:8)</button>
          <button class="preset-btn" data-preset="minor3rd">m3 (6:5)</button>
          <button class="preset-btn" data-preset="major3rd">M3 (5:4)</button>
          <button class="preset-btn" data-preset="perfect4th">P4 (4:3)</button>
          <button class="preset-btn" data-preset="tritone">TT (7:5)</button>
          <button class="preset-btn" data-preset="perfect5th">P5 (3:2)</button>
          <button class="preset-btn" data-preset="minor6th">m6 (8:5)</button>
          <button class="preset-btn" data-preset="major6th">M6 (5:3)</button>
          <button class="preset-btn" data-preset="minor7th">m7 (9:5)</button>
          <button class="preset-btn" data-preset="major7th">M7 (15:8)</button>
          <button class="preset-btn" data-preset="octave">Oct (2:1)</button>
        </div>
      </div>
    </div>

    <canvas id="canvas"></canvas>

    <div class="sidebar right">
      <div class="controls">
        <button id="playSound" class="play-btn">▶ Play Sound</button>

        <div class="control-group">
          <label>X Frequency: <span id="freqXValue">3</span></label>
          <input type="range" id="freqX" min="1" max="10" value="3" step="0.1">
        </div>
        <div class="control-group">
          <label>Y Frequency: <span id="freqYValue">2</span></label>
          <input type="range" id="freqY" min="1" max="10" value="2" step="0.1">
        </div>
        <div class="control-group">
          <label>Phase Shift: <span id="phaseValue">1.57</span></label>
          <input type="range" id="phase" min="0" max="6.28" value="1.57" step="0.01">
          <label class="checkbox-label">
            <input type="checkbox" id="phaseSweep">
            <span>Auto Sweep Phase</span>
          </label>
        </div>
        <div class="control-group">
          <label>Animation Speed: <span id="speedValue">0.01</span></label>
          <input type="range" id="speed" min="0" max="0.05" value="0.01" step="0.001">
        </div>
        <div class="control-group">
          <label>Sweep Speed: <span id="sweepSpeedValue">0.01</span></label>
          <input type="range" id="sweepSpeed" min="0.001" max="0.05" value="0.01" step="0.001">
        </div>
      </div>
    </div>
  </div>
`

const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!
const ctx = canvas.getContext('2d')!

// Set canvas size
canvas.width = 800
canvas.height = 600

// Get controls
const freqXSlider = document.querySelector<HTMLInputElement>('#freqX')!
const freqYSlider = document.querySelector<HTMLInputElement>('#freqY')!
const phaseSlider = document.querySelector<HTMLInputElement>('#phase')!
const speedSlider = document.querySelector<HTMLInputElement>('#speed')!
const sweepSpeedSlider = document.querySelector<HTMLInputElement>('#sweepSpeed')!
const phaseSweepCheckbox = document.querySelector<HTMLInputElement>('#phaseSweep')!
const playButton = document.querySelector<HTMLButtonElement>('#playSound')!

const freqXValue = document.querySelector<HTMLSpanElement>('#freqXValue')!
const freqYValue = document.querySelector<HTMLSpanElement>('#freqYValue')!
const phaseValue = document.querySelector<HTMLSpanElement>('#phaseValue')!
const speedValue = document.querySelector<HTMLSpanElement>('#speedValue')!
const sweepSpeedValue = document.querySelector<HTMLSpanElement>('#sweepSpeedValue')!

// Audio setup
let audioContext: AudioContext | null = null

function initAudio() {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

function playInterval() {
  const audio = initAudio()
  const now = audio.currentTime

  // Base frequency (C3 = 130.81 Hz, a warm, rich tone)
  const baseFreq = 130.81

  // Calculate the two frequencies based on the ratio
  const freq1 = baseFreq * freqY  // Lower note
  const freq2 = baseFreq * freqX  // Higher note

  // Create oscillators for both notes
  const osc1 = audio.createOscillator()
  const osc2 = audio.createOscillator()

  // Use sine waves for pure, musical tones
  osc1.type = 'sine'
  osc2.type = 'sine'

  osc1.frequency.value = freq1
  osc2.frequency.value = freq2

  // Create gain nodes for volume control and envelope
  const gain1 = audio.createGain()
  const gain2 = audio.createGain()
  const masterGain = audio.createGain()

  // Connect the audio graph
  osc1.connect(gain1)
  osc2.connect(gain2)
  gain1.connect(masterGain)
  gain2.connect(masterGain)
  masterGain.connect(audio.destination)

  // ADSR envelope for a pleasant sound
  const attackTime = 0.1
  const decayTime = 0.2
  const sustainLevel = 0.15
  const releaseTime = 0.3
  const duration = 2.5

  // Set initial gain to 0
  gain1.gain.value = 0
  gain2.gain.value = 0
  masterGain.gain.value = 0.7 // Master volume

  // Attack - ramp up to peak
  gain1.gain.linearRampToValueAtTime(0.3, now + attackTime)
  gain2.gain.linearRampToValueAtTime(0.3, now + attackTime)

  // Decay - ramp down to sustain level
  gain1.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime)
  gain2.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime)

  // Sustain - hold at sustain level (implicit)

  // Release - fade out
  gain1.gain.linearRampToValueAtTime(0, now + duration)
  gain2.gain.linearRampToValueAtTime(0, now + duration)

  // Start and stop oscillators
  osc1.start(now)
  osc2.start(now)
  osc1.stop(now + duration)
  osc2.stop(now + duration)

  // Update button state
  playButton.disabled = true
  playButton.textContent = '♪ Playing...'

  setTimeout(() => {
    playButton.disabled = false
    playButton.textContent = '▶ Play Sound'
  }, duration * 1000)
}

// Play button handler
playButton.addEventListener('click', playInterval)

// Lissajous parameters - Start with Perfect 5th (3:2)
let freqX = 3
let freqY = 2
let phase = Math.PI / 2
let speed = 0.01
let sweepSpeed = 0.01
let phaseSweepEnabled = false

// Animation variables
const centerX = 400
const centerY = 300
const amplitude = 200
let t = 0

// Preset configurations - All chromatic intervals (just intonation)
const presets = {
  unison: { freqX: 1, freqY: 1, phase: Math.PI / 2 },        // 1:1 - Unison (Perfect circle)
  minor2nd: { freqX: 16, freqY: 15, phase: Math.PI / 2 },    // 16:15 - Minor 2nd
  major2nd: { freqX: 9, freqY: 8, phase: Math.PI / 2 },      // 9:8 - Major 2nd
  minor3rd: { freqX: 6, freqY: 5, phase: Math.PI / 2 },      // 6:5 - Minor 3rd
  major3rd: { freqX: 5, freqY: 4, phase: Math.PI / 2 },      // 5:4 - Major 3rd
  perfect4th: { freqX: 4, freqY: 3, phase: Math.PI / 2 },    // 4:3 - Perfect 4th
  tritone: { freqX: 7, freqY: 5, phase: Math.PI / 2 },       // 7:5 - Tritone (Augmented 4th)
  perfect5th: { freqX: 3, freqY: 2, phase: Math.PI / 2 },    // 3:2 - Perfect 5th
  minor6th: { freqX: 8, freqY: 5, phase: Math.PI / 2 },      // 8:5 - Minor 6th
  major6th: { freqX: 5, freqY: 3, phase: Math.PI / 2 },      // 5:3 - Major 6th
  minor7th: { freqX: 9, freqY: 5, phase: Math.PI / 2 },      // 9:5 - Minor 7th
  major7th: { freqX: 15, freqY: 8, phase: Math.PI / 2 },     // 15:8 - Major 7th
  octave: { freqX: 2, freqY: 1, phase: Math.PI / 2 }         // 2:1 - Octave
}

// Function to update sliders
function updateSliders() {
  freqXSlider.value = freqX.toString()
  freqYSlider.value = freqY.toString()
  phaseSlider.value = phase.toString()
  speedSlider.value = speed.toString()

  freqXValue.textContent = freqX.toFixed(1)
  freqYValue.textContent = freqY.toFixed(1)
  phaseValue.textContent = phase.toFixed(2)
  speedValue.textContent = speed.toFixed(3)
}

// Preset button handlers
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const presetName = (btn as HTMLElement).dataset.preset as keyof typeof presets
    const preset = presets[presetName]

    freqX = preset.freqX
    freqY = preset.freqY
    phase = preset.phase
    t = 0 // Reset animation

    updateSliders()
  })
})

// Update controls
freqXSlider.addEventListener('input', (e) => {
  freqX = parseFloat((e.target as HTMLInputElement).value)
  freqXValue.textContent = freqX.toFixed(1)
})

freqYSlider.addEventListener('input', (e) => {
  freqY = parseFloat((e.target as HTMLInputElement).value)
  freqYValue.textContent = freqY.toFixed(1)
})

phaseSlider.addEventListener('input', (e) => {
  phase = parseFloat((e.target as HTMLInputElement).value)
  phaseValue.textContent = phase.toFixed(2)
})

speedSlider.addEventListener('input', (e) => {
  speed = parseFloat((e.target as HTMLInputElement).value)
  speedValue.textContent = speed.toFixed(3)
})

sweepSpeedSlider.addEventListener('input', (e) => {
  sweepSpeed = parseFloat((e.target as HTMLInputElement).value)
  sweepSpeedValue.textContent = sweepSpeed.toFixed(3)
})

phaseSweepCheckbox.addEventListener('change', (e) => {
  phaseSweepEnabled = (e.target as HTMLInputElement).checked
  // Disable manual phase control when sweep is enabled
  phaseSlider.disabled = phaseSweepEnabled
})

// Animation loop
function animate() {
  // Update phase if sweep is enabled
  if (phaseSweepEnabled) {
    phase += sweepSpeed
    // Loop back to 0 when reaching 2π
    if (phase > Math.PI * 2) {
      phase = 0
    }
    // Update slider and display
    phaseSlider.value = phase.toString()
    phaseValue.textContent = phase.toFixed(2)
  }

  // Clear canvas
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw the Lissajous curve trail
  ctx.strokeStyle = '#0f3460'
  ctx.lineWidth = 2
  ctx.beginPath()

  for (let i = 0; i < 1000; i++) {
    const angle = (i / 1000) * Math.PI * 2
    const x = centerX + amplitude * Math.sin(freqX * angle + phase)
    const y = centerY + amplitude * Math.sin(freqY * angle)

    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.stroke()

  // Calculate current position
  const x = centerX + amplitude * Math.sin(freqX * t + phase)
  const y = centerY + amplitude * Math.sin(freqY * t)

  // Draw the moving point
  ctx.fillStyle = '#16c79a'
  ctx.beginPath()
  ctx.arc(x, y, 8, 0, Math.PI * 2)
  ctx.fill()

  // Add glow effect
  ctx.shadowBlur = 15
  ctx.shadowColor = '#16c79a'
  ctx.fillStyle = '#16c79a'
  ctx.beginPath()
  ctx.arc(x, y, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // Update time
  t += speed

  // Request next frame
  requestAnimationFrame(animate)
}

// Start animation
animate()
