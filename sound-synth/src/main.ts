import './style.css'

// Sync theme from main site's localStorage or system preference (disable transitions during init)
document.documentElement.classList.add('theme-loading');
const storedTheme = localStorage.getItem('decompiled-theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const isLight = storedTheme ? storedTheme === 'light' : !prefersDark;
if (isLight) {
  document.body.classList.add('light-mode');
}
requestAnimationFrame(() => document.documentElement.classList.remove('theme-loading'));

// Constants
const NUM_HARMONICS = 12
const PEAK_LEVEL = 0.25

// Types
interface CustomInstrument {
  name: string
  harmonics: number[]
  attack: number
  decay: number
  sustain: number
  release: number
}

type PresetName = 'guitar' | 'string' | 'clarinet' | 'wind' | 'sine' | 'sawtooth'
type MelodyName = 'odeToJoy' | 'twinkleStar' | 'jazzRiff' | 'ascendingScale' | 'babyShark' | 'imperialMarch'

// Audio nodes
let audioContext: AudioContext | null = null
let masterGain: GainNode | null = null
let harmonicOscillators: OscillatorNode[] = []
let harmonicGains: GainNode[] = []
let delayNode: DelayNode | null = null
let delayFeedback: GainNode | null = null
let delayWet: GainNode | null = null
let delayDry: GainNode | null = null

// Audio state
let fundamentalFreq = 110
const harmonicAmplitudes: number[] = new Array(NUM_HARMONICS).fill(0)
let attackTime = 50
let decayTime = 200
let sustainLevel = 0.7
let releaseTime = 300
let delayTime = 0.01
let delayFeedbackAmount = 0.3
let delayMix = 0.3

// UI state
const activeKeys = new Set<number>()
let octaveShift = 0
let isMouseDown = false
let melodyTimeoutIds: number[] = []
let isMelodyPlaying = false
let customInstruments: CustomInstrument[] = []

// Piano keyboard: C2 to C5 (3 octaves)
const keyboardNotes = [
  // Bass octave (C2-B2)
  { note: 'C2', freq: 65.41, white: true },
  { note: 'C#2', freq: 69.30, white: false },
  { note: 'D2', freq: 73.42, white: true },
  { note: 'D#2', freq: 77.78, white: false },
  { note: 'E2', freq: 82.41, white: true },
  { note: 'F2', freq: 87.31, white: true },
  { note: 'F#2', freq: 92.50, white: false },
  { note: 'G2', freq: 98.00, white: true },
  { note: 'G#2', freq: 103.83, white: false },
  { note: 'A2', freq: 110.00, white: true },
  { note: 'A#2', freq: 116.54, white: false },
  { note: 'B2', freq: 123.47, white: true },
  // Middle octave (C3-B3)
  { note: 'C3', freq: 130.81, white: true },
  { note: 'C#3', freq: 138.59, white: false },
  { note: 'D3', freq: 146.83, white: true },
  { note: 'D#3', freq: 155.56, white: false },
  { note: 'E3', freq: 164.81, white: true },
  { note: 'F3', freq: 174.61, white: true },
  { note: 'F#3', freq: 185.00, white: false },
  { note: 'G3', freq: 196.00, white: true },
  { note: 'G#3', freq: 207.65, white: false },
  { note: 'A3', freq: 220.00, white: true },
  { note: 'A#3', freq: 233.08, white: false },
  { note: 'B3', freq: 246.94, white: true },
  // High octave (C4-B4)
  { note: 'C4', freq: 261.63, white: true },
  { note: 'C#4', freq: 277.18, white: false },
  { note: 'D4', freq: 293.66, white: true },
  { note: 'D#4', freq: 311.13, white: false },
  { note: 'E4', freq: 329.63, white: true },
  { note: 'F4', freq: 349.23, white: true },
  { note: 'F#4', freq: 369.99, white: false },
  { note: 'G4', freq: 392.00, white: true },
  { note: 'G#4', freq: 415.30, white: false },
  { note: 'A4', freq: 440.00, white: true },
  { note: 'A#4', freq: 466.16, white: false },
  { note: 'B4', freq: 493.88, white: true },
  // Top note
  { note: 'C5', freq: 523.25, white: true }
]

function playNote(noteIndex: number) {
  if (activeKeys.has(noteIndex)) return
  if (!audioContext) initAudio()

  activeKeys.add(noteIndex)
  fundamentalFreq = keyboardNotes[noteIndex].freq * Math.pow(2, octaveShift)
  updateFrequencies()

  document.querySelector(`[data-note-index="${noteIndex}"]`)?.classList.add('active')
  if (masterGain) triggerEnvelope()
}

function stopNote(noteIndex: number) {
  if (!activeKeys.has(noteIndex)) return

  activeKeys.delete(noteIndex)
  document.querySelector(`[data-note-index="${noteIndex}"]`)?.classList.remove('active')

  if (activeKeys.size === 0) releaseEnvelope()
}

// Play a melody preview for instrument demonstration
function playMelody(noteSequence: { noteIndex: number; duration: number }[]) {
  // Clear any existing melody timeouts
  melodyTimeoutIds.forEach(id => clearTimeout(id))
  melodyTimeoutIds = []

  let currentTime = 0

  noteSequence.forEach(({ noteIndex, duration }) => {
    // Schedule note start
    const startTimeout = setTimeout(() => {
      playNote(noteIndex)
    }, currentTime)
    melodyTimeoutIds.push(startTimeout)

    // Schedule note stop
    const stopTimeout = setTimeout(() => {
      stopNote(noteIndex)
    }, currentTime + duration)
    melodyTimeoutIds.push(stopTimeout)

    currentTime += duration
  })
}

// Preset melody sequences (playable with any instrument)
// Note indices: C2=0, C3=12, C4=24, C5=36
const presetMelodies = {
  odeToJoy: [
    // Beethoven's Ode to Joy theme
    { noteIndex: 28, duration: 400 }, // E4
    { noteIndex: 28, duration: 400 }, // E4
    { noteIndex: 29, duration: 400 }, // F4
    { noteIndex: 31, duration: 400 }, // G4
    { noteIndex: 31, duration: 400 }, // G4
    { noteIndex: 29, duration: 400 }, // F4
    { noteIndex: 28, duration: 400 }, // E4
    { noteIndex: 26, duration: 400 }, // D4
    { noteIndex: 24, duration: 400 }, // C4
    { noteIndex: 24, duration: 400 }, // C4
    { noteIndex: 26, duration: 400 }, // D4
    { noteIndex: 28, duration: 400 }, // E4
    { noteIndex: 28, duration: 600 }, // E4
    { noteIndex: 26, duration: 200 }, // D4
    { noteIndex: 26, duration: 800 }, // D4
  ],
  twinkleStar: [
    // Twinkle Twinkle Little Star
    { noteIndex: 24, duration: 400 }, // C4
    { noteIndex: 24, duration: 400 }, // C4
    { noteIndex: 31, duration: 400 }, // G4
    { noteIndex: 31, duration: 400 }, // G4
    { noteIndex: 33, duration: 400 }, // A4
    { noteIndex: 33, duration: 400 }, // A4
    { noteIndex: 31, duration: 800 }, // G4
    { noteIndex: 29, duration: 400 }, // F4
    { noteIndex: 29, duration: 400 }, // F4
    { noteIndex: 28, duration: 400 }, // E4
    { noteIndex: 28, duration: 400 }, // E4
    { noteIndex: 26, duration: 400 }, // D4
    { noteIndex: 26, duration: 400 }, // D4
    { noteIndex: 24, duration: 800 }, // C4
  ],
  jazzRiff: [
    // Jazz/Blues style riff with bass notes
    { noteIndex: 12, duration: 300 }, // C3 (bass)
    { noteIndex: 15, duration: 300 }, // D#3
    { noteIndex: 17, duration: 300 }, // F3
    { noteIndex: 19, duration: 600 }, // G3
    { noteIndex: 24, duration: 300 }, // C4
    { noteIndex: 27, duration: 300 }, // D#4
    { noteIndex: 29, duration: 300 }, // F4
    { noteIndex: 31, duration: 600 }, // G4
    { noteIndex: 29, duration: 300 }, // F4
    { noteIndex: 27, duration: 300 }, // D#4
    { noteIndex: 24, duration: 600 }, // C4
    { noteIndex: 12, duration: 900 }, // C3 (bass)
  ],
  ascendingScale: [
    // Full C major scale across octaves (C3 to C5)
    { noteIndex: 12, duration: 250 }, // C3
    { noteIndex: 14, duration: 250 }, // D3
    { noteIndex: 16, duration: 250 }, // E3
    { noteIndex: 17, duration: 250 }, // F3
    { noteIndex: 19, duration: 250 }, // G3
    { noteIndex: 21, duration: 250 }, // A3
    { noteIndex: 23, duration: 250 }, // B3
    { noteIndex: 24, duration: 250 }, // C4
    { noteIndex: 26, duration: 250 }, // D4
    { noteIndex: 28, duration: 250 }, // E4
    { noteIndex: 29, duration: 250 }, // F4
    { noteIndex: 31, duration: 250 }, // G4
    { noteIndex: 33, duration: 250 }, // A4
    { noteIndex: 35, duration: 250 }, // B4
    { noteIndex: 36, duration: 500 }, // C5
    { noteIndex: 35, duration: 250 }, // B4
    { noteIndex: 33, duration: 250 }, // A4
    { noteIndex: 31, duration: 250 }, // G4
    { noteIndex: 29, duration: 250 }, // F4
    { noteIndex: 28, duration: 250 }, // E4
    { noteIndex: 26, duration: 250 }, // D4
    { noteIndex: 24, duration: 500 }, // C4
  ],
  babyShark: [
    // Baby Shark (doo doo doo doo doo doo)
    { noteIndex: 24, duration: 200 }, // C4
    { noteIndex: 26, duration: 200 }, // D4
    { noteIndex: 28, duration: 200 }, // E4
    { noteIndex: 28, duration: 200 }, // E4
    { noteIndex: 28, duration: 200 }, // E4
    { noteIndex: 28, duration: 200 }, // E4
    { noteIndex: 28, duration: 200 }, // E4
    { noteIndex: 28, duration: 200 }, // E4
    { noteIndex: 24, duration: 200 }, // C4
    { noteIndex: 26, duration: 200 }, // D4
    { noteIndex: 28, duration: 200 }, // E4
    { noteIndex: 28, duration: 200 }, // E4
    { noteIndex: 28, duration: 200 }, // E4
    { noteIndex: 28, duration: 200 }, // E4
    { noteIndex: 28, duration: 200 }, // E4
    { noteIndex: 28, duration: 200 }, // E4
    { noteIndex: 24, duration: 200 }, // C4
    { noteIndex: 26, duration: 200 }, // D4
    { noteIndex: 28, duration: 400 }, // E4
    { noteIndex: 26, duration: 400 }, // D4
    { noteIndex: 24, duration: 600 }, // C4
  ],
  imperialMarch: [
    // Imperial March (Darth Vader's Theme)
    { noteIndex: 19, duration: 500 }, // G3
    { noteIndex: 19, duration: 500 }, // G3
    { noteIndex: 19, duration: 500 }, // G3
    { noteIndex: 15, duration: 350 }, // D#3
    { noteIndex: 22, duration: 150 }, // A#3
    { noteIndex: 19, duration: 500 }, // G3
    { noteIndex: 15, duration: 350 }, // D#3
    { noteIndex: 22, duration: 150 }, // A#3
    { noteIndex: 19, duration: 1000 }, // G3
    { noteIndex: 26, duration: 500 }, // D4
    { noteIndex: 26, duration: 500 }, // D4
    { noteIndex: 26, duration: 500 }, // D4
    { noteIndex: 27, duration: 350 }, // D#4
    { noteIndex: 22, duration: 150 }, // A#3
    { noteIndex: 18, duration: 500 }, // F#3
    { noteIndex: 15, duration: 350 }, // D#3
    { noteIndex: 22, duration: 150 }, // A#3
    { noteIndex: 19, duration: 1000 }, // G3
  ]
}

// Melody name to button ID mapping
const melodyIdMap: Record<MelodyName, string> = {
  odeToJoy: 'ode-to-joy',
  twinkleStar: 'twinkle-star',
  jazzRiff: 'jazz-riff',
  ascendingScale: 'ascending-scale',
  babyShark: 'baby-shark',
  imperialMarch: 'imperial-march'
}

function playPresetMelody(melodyName: MelodyName) {
  if (isMelodyPlaying) stopMelody()

  isMelodyPlaying = true
  updateMelodyButtonStates(melodyName)
  playMelody(presetMelodies[melodyName])

  const totalDuration = presetMelodies[melodyName].reduce((sum, note) => sum + note.duration, 0)
  melodyTimeoutIds.push(setTimeout(() => {
    isMelodyPlaying = false
    updateMelodyButtonStates(null)
  }, totalDuration + 100))
}

function stopMelody() {
  melodyTimeoutIds.forEach(id => clearTimeout(id))
  melodyTimeoutIds = []
  isMelodyPlaying = false

  activeKeys.forEach(noteIndex => {
    document.querySelector(`[data-note-index="${noteIndex}"]`)?.classList.remove('active')
  })
  activeKeys.clear()
  releaseEnvelope()
  updateMelodyButtonStates(null)
}

function updateMelodyButtonStates(activeMelody: MelodyName | null) {
  Object.values(melodyIdMap).forEach(id => {
    document.getElementById(`melody-${id}`)?.classList.remove('playing')
  })

  if (activeMelody) {
    document.getElementById(`melody-${melodyIdMap[activeMelody]}`)?.classList.add('playing')
  }
}

// Custom instrument functions
function saveCustomInstrument(name: string) {
  const instrument: CustomInstrument = {
    name,
    harmonics: [...harmonicAmplitudes],
    attack: attackTime,
    decay: decayTime,
    sustain: sustainLevel,
    release: releaseTime
  }
  customInstruments.push(instrument)
  saveCustomInstrumentsToStorage()
  addCustomPresetButton(instrument, customInstruments.length - 1)
}

function applyCustomInstrument(instrument: CustomInstrument) {
  ;[attackTime, decayTime, sustainLevel, releaseTime] = [
    instrument.attack, instrument.decay, instrument.sustain, instrument.release
  ]
  updateEnvelopeSliders()

  for (let i = 0; i < NUM_HARMONICS; i++) {
    setHarmonicAmplitude(i, instrument.harmonics[i])
    updateSlider(i)
  }
}

function deleteCustomInstrument(index: number) {
  customInstruments.splice(index, 1)
  saveCustomInstrumentsToStorage()
  rebuildPresetButtons()
}

function saveCustomInstrumentsToStorage() {
  localStorage.setItem('customInstruments', JSON.stringify(customInstruments))
}

function loadCustomInstrumentsFromStorage() {
  try {
    customInstruments = JSON.parse(localStorage.getItem('customInstruments') || '[]')
  } catch {
    customInstruments = []
  }
}

function addCustomPresetButton(instrument: CustomInstrument, index: number) {
  const buttonsContainer = document.querySelector('.action-buttons')
  if (!buttonsContainer) return

  const button = document.createElement('button')
  button.id = `preset-custom-${index}`
  button.className = 'custom-preset'
  button.innerHTML = `
    ${instrument.name}
    <span class="delete-custom" data-index="${index}">×</span>
  `

  button.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (target.classList.contains('delete-custom')) {
      e.stopPropagation()
      const idx = Number(target.getAttribute('data-index'))
      if (confirm(`Delete "${customInstruments[idx].name}"?`)) {
        deleteCustomInstrument(idx)
      }
    } else {
      selectCustomPreset(index)
    }
  })

  buttonsContainer.appendChild(button)
}

function selectCustomPreset(index: number) {
  // Remove selected class from all buttons
  document.querySelectorAll('.action-buttons button').forEach(btn => btn.classList.remove('selected'))

  // Add selected to this button
  const button = document.getElementById(`preset-custom-${index}`)
  if (button) button.classList.add('selected')

  // Apply custom instrument
  applyCustomInstrument(customInstruments[index])
}

function rebuildPresetButtons() {
  // Remove all custom preset buttons
  document.querySelectorAll('.custom-preset').forEach(btn => btn.remove())

  // Re-add them
  customInstruments.forEach((instrument, index) => {
    addCustomPresetButton(instrument, index)
  })
}

// Initialize audio context and nodes
function initAudio() {
  if (audioContext) return

  audioContext = new AudioContext()

  // Create delay effect
  delayNode = audioContext.createDelay(2.0) // max 2 seconds
  delayNode.delayTime.value = delayTime

  delayFeedback = audioContext.createGain()
  delayFeedback.gain.value = delayFeedbackAmount

  delayWet = audioContext.createGain()
  delayWet.gain.value = delayMix

  delayDry = audioContext.createGain()
  delayDry.gain.value = 1 - delayMix

  // Connect delay feedback loop
  delayNode.connect(delayFeedback)
  delayFeedback.connect(delayNode)
  delayNode.connect(delayWet)

  // Create master gain
  masterGain = audioContext.createGain()
  masterGain.gain.value = PEAK_LEVEL

  // Connect dry and wet signals to destination
  delayDry.connect(audioContext.destination)
  delayWet.connect(audioContext.destination)

  // Create oscillators and gain nodes for each harmonic
  for (let i = 0; i < NUM_HARMONICS; i++) {
    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()

    osc.type = 'sine'
    osc.frequency.value = fundamentalFreq * (i + 1)
    // Initialize with current harmonic amplitude from state
    gain.gain.value = harmonicAmplitudes[i]

    osc.connect(gain)
    gain.connect(masterGain)
    osc.start()

    harmonicOscillators.push(osc)
    harmonicGains.push(gain)
  }

  // Connect master gain to both dry and delay paths
  masterGain.connect(delayDry)
  masterGain.connect(delayNode)
}

// Update harmonic frequencies when fundamental changes
function updateFrequencies() {
  harmonicOscillators.forEach((osc, i) => {
    osc.frequency.setValueAtTime(fundamentalFreq * (i + 1), audioContext!.currentTime)
  })
}

// Update harmonic amplitude
function setHarmonicAmplitude(harmonicIndex: number, amplitude: number) {
  harmonicAmplitudes[harmonicIndex] = amplitude
  if (harmonicGains[harmonicIndex] && audioContext) {
    // Use exponential ramp for smoother transitions
    const now = audioContext.currentTime
    harmonicGains[harmonicIndex].gain.cancelScheduledValues(now)
    harmonicGains[harmonicIndex].gain.setValueAtTime(
      harmonicGains[harmonicIndex].gain.value,
      now
    )
    harmonicGains[harmonicIndex].gain.exponentialRampToValueAtTime(
      amplitude === 0 ? 0.001 : amplitude,
      now + 0.05
    )
  }
}

// Apply ADSR envelope to master gain
function triggerEnvelope() {
  if (!masterGain || !audioContext) return

  const now = audioContext.currentTime
  const sustainValue = PEAK_LEVEL * sustainLevel

  masterGain.gain.cancelScheduledValues(now)
  masterGain.gain.setValueAtTime(0.001, now)
  masterGain.gain.exponentialRampToValueAtTime(PEAK_LEVEL, now + attackTime / 1000)
  masterGain.gain.exponentialRampToValueAtTime(
    Math.max(sustainValue, 0.001),
    now + (attackTime + decayTime) / 1000
  )
}

function releaseEnvelope() {
  if (!masterGain || !audioContext) return

  const now = audioContext.currentTime

  // Cancel scheduled values and get current value
  masterGain.gain.cancelScheduledValues(now)
  masterGain.gain.setValueAtTime(masterGain.gain.value, now)

  // Release: fade to silence
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + releaseTime / 1000)
}

// Preset configurations
const presetConfigs: Record<PresetName, { adsr: [number, number, number, number], harmonicFn: (i: number) => number }> = {
  guitar: {
    adsr: [10, 300, 0.3, 400],
    harmonicFn: i => 0.8 / Math.pow(i + 1, 1.1)
  },
  string: {
    adsr: [50, 200, 0.7, 300],
    harmonicFn: i => 0.8 / Math.pow(i + 1, 1.2)
  },
  wind: {
    adsr: [200, 100, 0.8, 250],
    harmonicFn: i => (i + 1) % 2 === 0 ? 0.7 / (i + 1) : 0.2 / (i + 1)
  },
  clarinet: {
    adsr: [80, 150, 0.75, 200],
    harmonicFn: i => (i + 1) % 2 === 1 ? 0.8 / (i + 1) : 0.05 / (i + 1)
  },
  sine: {
    adsr: [50, 50, 1.0, 100],
    harmonicFn: i => i === 0 ? 1 : 0
  },
  sawtooth: {
    adsr: [20, 50, 0.9, 150],
    harmonicFn: i => 1.0 / (i + 1)
  }
}

function applyPreset(type: PresetName) {
  const config = presetConfigs[type]
  ;[attackTime, decayTime, sustainLevel, releaseTime] = config.adsr

  for (let i = 0; i < NUM_HARMONICS; i++) {
    setHarmonicAmplitude(i, config.harmonicFn(i))
    updateSlider(i)
  }
  updateEnvelopeSliders()
}

function updateEnvelopeSliders() {
  const params = [
    { id: 'attack', value: attackTime, format: (v: number) => `${v}ms` },
    { id: 'decay', value: decayTime, format: (v: number) => `${v}ms` },
    { id: 'sustain', value: sustainLevel * 100, format: (v: number) => `${Math.round(v)}%` },
    { id: 'release', value: releaseTime, format: (v: number) => `${v}ms` }
  ]

  params.forEach(({ id, value, format }) => {
    const slider = document.getElementById(id) as HTMLInputElement
    const display = document.getElementById(`${id}-display`)
    if (slider) slider.value = String(value)
    if (display) display.textContent = format(value)
  })
}

function updateSlider(harmonicIndex: number) {
  const value = harmonicAmplitudes[harmonicIndex] * 100
  const slider = document.getElementById(`harmonic-${harmonicIndex}`) as HTMLInputElement
  const display = document.getElementById(`amp-${harmonicIndex}`)
  const bar = document.getElementById(`bar-${harmonicIndex}`) as HTMLDivElement

  if (slider) slider.value = String(value)
  if (display) display.textContent = `${Math.round(value)}%`
  if (bar) bar.style.height = `${value}%`
}

// Build UI
function buildUI() {
  const app = document.querySelector<HTMLDivElement>('#app')!

  app.innerHTML = `
    <div class="app-header">
      <h1>Harmonics Explorer</h1>
      <p>Manipulate overtones to understand the nature of sound and timbre</p>
    </div>

    <div class="main-controls">
      <div class="action-buttons">
        <button id="preset-guitar">Guitar</button>
        <button id="preset-string">String</button>
        <button id="preset-clarinet">Clarinet</button>
        <button id="preset-wind">Flute</button>
        <button id="preset-sine">Pure Sine</button>
        <button id="preset-sawtooth">Sawtooth</button>
      </div>

      <div class="envelope-row">
        <div class="envelope-param">
          <label for="attack">Attack</label>
          <input type="range" id="attack" min="1" max="2000" value="50" step="1">
          <div class="envelope-display" id="attack-display">50ms</div>
        </div>
        <div class="envelope-param">
          <label for="decay">Decay</label>
          <input type="range" id="decay" min="1" max="2000" value="200" step="1">
          <div class="envelope-display" id="decay-display">200ms</div>
        </div>
        <div class="envelope-param">
          <label for="sustain">Sustain</label>
          <input type="range" id="sustain" min="0" max="100" value="70" step="1">
          <div class="envelope-display" id="sustain-display">70%</div>
        </div>
        <div class="envelope-param">
          <label for="release">Release</label>
          <input type="range" id="release" min="1" max="3000" value="300" step="1">
          <div class="envelope-display" id="release-display">300ms</div>
        </div>
      </div>

      <div class="delay-row">
        <div class="delay-param">
          <label for="delay-time">Delay Time</label>
          <input type="range" id="delay-time" min="10" max="2000" value="10" step="10">
          <div class="delay-display" id="delay-time-display">10ms</div>
        </div>
        <div class="delay-param">
          <label for="delay-feedback">Feedback</label>
          <input type="range" id="delay-feedback" min="0" max="90" value="30" step="1">
          <div class="delay-display" id="delay-feedback-display">30%</div>
        </div>
        <div class="delay-param">
          <label for="delay-mix">Mix</label>
          <input type="range" id="delay-mix" min="0" max="100" value="30" step="1">
          <div class="delay-display" id="delay-mix-display">30%</div>
        </div>
      </div>
    </div>

    <div class="equalizer-section">
      <div class="equalizer-header">
        <h2>Harmonic Equalizer</h2>
        <button id="create-instrument-btn" class="create-btn">+ Create Instrument</button>
      </div>
      <div class="equalizer-container">
        ${Array.from({ length: NUM_HARMONICS }, (_, i) => {
          const harmonic = i + 1
          const oddEven = harmonic % 2 === 1 ? 'odd' : 'even'
          return `
            <div class="eq-channel ${oddEven}">
              <div class="eq-label">H${harmonic}</div>
              <div class="eq-slider-container">
                <div class="eq-level-bar" id="bar-${i}" style="height: 0%"></div>
                <input type="range" id="harmonic-${i}" min="0" max="100" value="0" step="1" orient="vertical">
              </div>
              <div class="eq-value" id="amp-${i}">0%</div>
            </div>
          `
        }).join('')}
      </div>
    </div>

    <div class="keyboard-section">
      <div class="keyboard-header">
        <h2>Piano Keyboard</h2>
        <div class="octave-controls">
          <button id="octave-down" class="octave-btn">Octave -</button>
          <span class="octave-display" id="octave-display">Octave: 0</span>
          <button id="octave-up" class="octave-btn">Octave +</button>
        </div>
      </div>
      <div class="keyboard-hint">Play with mouse or computer keyboard: A-K (white keys), W-P (black keys)</div>
      <div class="keyboard">
        ${keyboardNotes.map((key, index) => {
          const type = key.white ? 'white-key' : 'black-key'
          return `<div class="piano-key ${type}" data-note-index="${index}" data-note="${key.note}">
            ${key.white ? `<span class="key-label">${key.note}</span>` : ''}
          </div>`
        }).join('')}
      </div>
    </div>

    <div class="melody-section">
      <div class="melody-header">
        <h2>Play Melodies</h2>
        <button id="stop-melody-btn" class="stop-btn">Stop</button>
      </div>
      <div class="melody-buttons">
        <button id="melody-ode-to-joy" class="melody-btn">Ode to Joy</button>
        <button id="melody-twinkle-star" class="melody-btn">Twinkle Star</button>
        <button id="melody-jazz-riff" class="melody-btn">Jazz Riff</button>
        <button id="melody-ascending-scale" class="melody-btn">Scale</button>
        <button id="melody-baby-shark" class="melody-btn">Baby Shark</button>
        <button id="melody-imperial-march" class="melody-btn">Imperial March</button>
      </div>
    </div>
  `

  // Wire up event listeners
  // Octave shift controls
  const octaveUpBtn = document.getElementById('octave-up') as HTMLButtonElement
  const octaveDownBtn = document.getElementById('octave-down') as HTMLButtonElement
  const octaveDisplay = document.getElementById('octave-display') as HTMLSpanElement

  octaveUpBtn.addEventListener('click', () => {
    if (octaveShift < 2) {
      octaveShift++
      octaveDisplay.textContent = `Octave: ${octaveShift > 0 ? '+' : ''}${octaveShift}`
    }
  })

  octaveDownBtn.addEventListener('click', () => {
    if (octaveShift > -2) {
      octaveShift--
      octaveDisplay.textContent = `Octave: ${octaveShift > 0 ? '+' : ''}${octaveShift}`
    }
  })

  // Harmonic sliders
  for (let i = 0; i < NUM_HARMONICS; i++) {
    const slider = document.getElementById(`harmonic-${i}`) as HTMLInputElement
    const display = document.getElementById(`amp-${i}`) as HTMLSpanElement
    const bar = document.getElementById(`bar-${i}`) as HTMLDivElement

    slider.addEventListener('input', () => {
      const amplitude = Number(slider.value) / 100
      setHarmonicAmplitude(i, amplitude)
      display.textContent = `${Math.round(amplitude * 100)}%`
      bar.style.height = `${amplitude * 100}%`
    })
  }

  // ADSR envelope controls
  const attackSlider = document.getElementById('attack') as HTMLInputElement
  const decaySlider = document.getElementById('decay') as HTMLInputElement
  const sustainSlider = document.getElementById('sustain') as HTMLInputElement
  const releaseSlider = document.getElementById('release') as HTMLInputElement

  const attackDisplay = document.getElementById('attack-display') as HTMLDivElement
  const decayDisplay = document.getElementById('decay-display') as HTMLDivElement
  const sustainDisplay = document.getElementById('sustain-display') as HTMLDivElement
  const releaseDisplay = document.getElementById('release-display') as HTMLDivElement

  attackSlider.addEventListener('input', () => {
    attackTime = Number(attackSlider.value)
    attackDisplay.textContent = `${attackTime}ms`
  })

  decaySlider.addEventListener('input', () => {
    decayTime = Number(decaySlider.value)
    decayDisplay.textContent = `${decayTime}ms`
  })

  sustainSlider.addEventListener('input', () => {
    sustainLevel = Number(sustainSlider.value) / 100
    sustainDisplay.textContent = `${Math.round(sustainLevel * 100)}%`
  })

  releaseSlider.addEventListener('input', () => {
    releaseTime = Number(releaseSlider.value)
    releaseDisplay.textContent = `${releaseTime}ms`
  })

  // Delay effect controls
  const delayTimeSlider = document.getElementById('delay-time') as HTMLInputElement
  const delayFeedbackSlider = document.getElementById('delay-feedback') as HTMLInputElement
  const delayMixSlider = document.getElementById('delay-mix') as HTMLInputElement

  const delayTimeDisplay = document.getElementById('delay-time-display') as HTMLDivElement
  const delayFeedbackDisplay = document.getElementById('delay-feedback-display') as HTMLDivElement
  const delayMixDisplay = document.getElementById('delay-mix-display') as HTMLDivElement

  delayTimeSlider.addEventListener('input', () => {
    delayTime = Number(delayTimeSlider.value) / 1000 // Convert ms to seconds
    if (delayNode) {
      delayNode.delayTime.setValueAtTime(delayTime, audioContext!.currentTime)
    }
    delayTimeDisplay.textContent = `${Number(delayTimeSlider.value)}ms`
  })

  delayFeedbackSlider.addEventListener('input', () => {
    delayFeedbackAmount = Number(delayFeedbackSlider.value) / 100
    if (delayFeedback) {
      delayFeedback.gain.setValueAtTime(delayFeedbackAmount, audioContext!.currentTime)
    }
    delayFeedbackDisplay.textContent = `${Number(delayFeedbackSlider.value)}%`
  })

  delayMixSlider.addEventListener('input', () => {
    delayMix = Number(delayMixSlider.value) / 100
    if (delayWet && delayDry) {
      delayWet.gain.setValueAtTime(delayMix, audioContext!.currentTime)
      delayDry.gain.setValueAtTime(1 - delayMix, audioContext!.currentTime)
    }
    delayMixDisplay.textContent = `${Number(delayMixSlider.value)}%`
  })

  // Preset buttons
  const presetNames: PresetName[] = ['guitar', 'string', 'clarinet', 'wind', 'sine', 'sawtooth']
  const presetButtons = Object.fromEntries(
    presetNames.map(name => [name, document.getElementById(`preset-${name}`)!])
  ) as Record<PresetName, HTMLElement>

  function selectPreset(presetName: PresetName) {
    Object.values(presetButtons).forEach(btn => btn.classList.remove('selected'))
    presetButtons[presetName].classList.add('selected')
    applyPreset(presetName)
  }

  presetNames.forEach(name => {
    presetButtons[name].addEventListener('click', () => selectPreset(name))
  })

  // Piano keyboard event listeners
  const pianoKeys = document.querySelectorAll('.piano-key')

  // Track mouse state globally
  window.addEventListener('mousedown', () => {
    isMouseDown = true
  })

  window.addEventListener('mouseup', () => {
    isMouseDown = false
    // Release all active keys
    activeKeys.forEach(noteIndex => {
      const keyElement = document.querySelector(`[data-note-index="${noteIndex}"]`)
      if (keyElement) {
        keyElement.classList.remove('active')
      }
    })
    activeKeys.clear()
    releaseEnvelope()
  })

  pianoKeys.forEach((key) => {
    const noteIndex = Number(key.getAttribute('data-note-index'))

    // Mouse events - support drag
    key.addEventListener('mousedown', () => {
      isMouseDown = true
      playNote(noteIndex)
    })

    key.addEventListener('mouseenter', () => {
      if (isMouseDown) {
        playNote(noteIndex)
      }
    })

    key.addEventListener('mouseleave', () => {
      if (activeKeys.has(noteIndex)) {
        stopNote(noteIndex)
      }
    })

    // Touch events for mobile
    key.addEventListener('touchstart', (e) => {
      e.preventDefault()
      playNote(noteIndex)
    })
    key.addEventListener('touchend', (e) => {
      e.preventDefault()
      stopNote(noteIndex)
    })
  })

  // Computer keyboard mapping (like a real piano layout)
  // Maps to middle octaves (C3-C5) for best playability
  // White keys on home row: A S D F G H J K L ; '
  // Black keys on top row: W E   T Y U   O P
  const keyMap: { [key: string]: number } = {
    // First mapped octave (C3-B3) - indices 12-23
    'a': 12,  // C3 (white)
    'w': 13,  // C#3 (black)
    's': 14,  // D3 (white)
    'e': 15,  // D#3 (black)
    'd': 16,  // E3 (white)
    'f': 17,  // F3 (white)
    't': 18,  // F#3 (black)
    'g': 19,  // G3 (white)
    'y': 20,  // G#3 (black)
    'h': 21,  // A3 (white)
    'u': 22,  // A#3 (black)
    'j': 23,  // B3 (white)

    // Second mapped octave (C4-C5) - indices 24-36
    'k': 24,  // C4 (white)
    'o': 25,  // C#4 (black)
    'l': 26,  // D4 (white)
    'p': 27,  // D#4 (black)
    ';': 28,  // E4 (white)
    '\'': 29, // F4 (white)
    ']': 30,  // F#4 (black)
    // Bottom row for remaining notes
    'z': 31,  // G4 (white)
    'x': 33,  // A4 (white)
    'c': 35,  // B4 (white)
    'v': 36   // C5 (white)
  }

  let pressedKeys = new Set<string>()

  window.addEventListener('keydown', (e) => {
    if (pressedKeys.has(e.key.toLowerCase())) return

    const noteIndex = keyMap[e.key.toLowerCase()]
    if (noteIndex !== undefined) {
      e.preventDefault()
      pressedKeys.add(e.key.toLowerCase())
      playNote(noteIndex)
    }
  })

  window.addEventListener('keyup', (e) => {
    const noteIndex = keyMap[e.key.toLowerCase()]
    if (noteIndex !== undefined) {
      e.preventDefault()
      pressedKeys.delete(e.key.toLowerCase())
      stopNote(noteIndex)
    }
  })

  // Melody buttons
  const melodyNames: MelodyName[] = ['odeToJoy', 'twinkleStar', 'jazzRiff', 'ascendingScale', 'babyShark', 'imperialMarch']
  melodyNames.forEach(name => {
    document.getElementById(`melody-${melodyIdMap[name]}`)!.addEventListener('click', () => playPresetMelody(name))
  })
  document.getElementById('stop-melody-btn')!.addEventListener('click', stopMelody)

  // Create instrument button
  const createInstrumentBtn = document.getElementById('create-instrument-btn')!
  createInstrumentBtn.addEventListener('click', () => {
    const name = prompt('Enter a name for your custom instrument:')
    if (name && name.trim()) {
      saveCustomInstrument(name.trim())
    }
  })

  // Load custom instruments from storage
  loadCustomInstrumentsFromStorage()
  customInstruments.forEach((instrument, index) => {
    addCustomPresetButton(instrument, index)
  })

  // Set initial preset
  applyPreset('guitar')

  // Highlight the selected preset
  document.getElementById('preset-guitar')?.classList.add('selected')
}

// Initialize
buildUI()
