import './style.css'

// Audio context and nodes
let audioContext: AudioContext | null = null
let scriptProcessor: ScriptProcessorNode | null = null
let gainNode: GainNode | null = null
let analyserNode: AnalyserNode | null = null
let isPlaying = false
let animationFrameId: number | null = null

// Delay effect nodes
let delayNode: DelayNode | null = null
let delayFeedbackNode: GainNode | null = null
let delayWetNode: GainNode | null = null
let delayDryNode: GainNode | null = null
let delayMixNode: GainNode | null = null

// Delay effect parameters
let delayTime = 0.3  // 300ms
let delayFeedback = 0.4
let delayMix = 0.3  // 30% wet
let delayEnabled = false

// User-defined comb filter configuration
const SAMPLE_RATE = 48000  // Assume 48kHz
const MAX_DELAY_SAMPLES = 1000  // 0-1000 sample range

// Default to 441 samples (48000 / 441 ≈ 108.8Hz, close to A2)
const DEFAULT_DELAY_SAMPLES = 441

let delaySamples = DEFAULT_DELAY_SAMPLES
let feedback = 0.985  // High feedback for long sustain
let hasLowpass = true  // Enable lowpass for realistic string timbre
let lowpassCutoff = 5000  // 5kHz cutoff for natural brightness
let feedbackNoise = 0.0  // Dither/noise injected into feedback path (very small values)

// Input source configuration
type InputSource = 'noise' | 'sine' | 'square'
let inputSource: InputSource = 'noise'
let sinePhase = 0
let inputFrequency = 440  // For sine/square waves

// Pluck mode
let isAutoPluck = false
let autoPluckInterval: number | null = null
let burstSamplesRemaining = 0
const BURST_DURATION_MS = 50  // 50ms burst

// Delay line buffer
let delayBuffer: Float32Array = new Float32Array(DEFAULT_DELAY_SAMPLES)
let writeIndex = 0
let prevSample = 0

// Canvas contexts
let diagramCtx: CanvasRenderingContext2D | null = null

// Initialize audio context
function initAudio() {
  if (audioContext) return audioContext

  audioContext = new AudioContext()

  // Create analyser for waveform visualization
  analyserNode = audioContext.createAnalyser()
  analyserNode.fftSize = 2048

  // Create gain node
  gainNode = audioContext.createGain()
  gainNode.gain.value = 0.3

  // Create script processor for comb filter
  scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1)
  scriptProcessor.onaudioprocess = processAudio

  // Create delay effect nodes
  delayNode = audioContext.createDelay(2.0)  // Max 2 seconds
  delayNode.delayTime.value = delayTime

  delayFeedbackNode = audioContext.createGain()
  delayFeedbackNode.gain.value = delayFeedback

  delayWetNode = audioContext.createGain()
  delayWetNode.gain.value = delayEnabled ? delayMix : 0

  delayDryNode = audioContext.createGain()
  delayDryNode.gain.value = 1

  delayMixNode = audioContext.createGain()
  delayMixNode.gain.value = 1

  // Connect: scriptProcessor -> gain -> [dry + delay wet] -> mix -> analyser -> destination
  scriptProcessor.connect(gainNode)

  // Dry path
  gainNode.connect(delayDryNode)
  delayDryNode.connect(delayMixNode)

  // Wet path (delay with feedback)
  gainNode.connect(delayNode)
  delayNode.connect(delayFeedbackNode)
  delayFeedbackNode.connect(delayNode)  // Feedback loop
  delayNode.connect(delayWetNode)
  delayWetNode.connect(delayMixNode)

  // Output
  delayMixNode.connect(analyserNode)
  analyserNode.connect(audioContext.destination)

  // Initialize delay buffer
  initializeDelayLine()

  return audioContext
}

// Initialize delay line buffer
function initializeDelayLine() {
  if (!audioContext) return

  // Create new delay buffer with specified sample count (at least 1 for array)
  const bufferSize = Math.max(delaySamples, 1)
  delayBuffer = new Float32Array(bufferSize)
  delayBuffer.fill(0)
  writeIndex = 0
  prevSample = 0
}

// Generate input sample based on source type
function generateInputSample(): number {
  if (burstSamplesRemaining <= 0 && !isPlaying) {
    return 0
  }

  let sample = 0

  switch (inputSource) {
    case 'noise':
      sample = (Math.random() * 2 - 1) * 0.3
      break

    case 'sine':
      if (audioContext) {
        sample = Math.sin(sinePhase) * 0.3
        sinePhase += 2 * Math.PI * inputFrequency / audioContext.sampleRate
        if (sinePhase > 2 * Math.PI) sinePhase -= 2 * Math.PI
      }
      break

    case 'square':
      if (audioContext) {
        sample = (Math.sin(sinePhase) > 0 ? 1 : -1) * 0.3
        sinePhase += 2 * Math.PI * inputFrequency / audioContext.sampleRate
        if (sinePhase > 2 * Math.PI) sinePhase -= 2 * Math.PI
      }
      break
  }

  // Apply burst envelope if in pluck mode
  if (burstSamplesRemaining > 0) {
    burstSamplesRemaining--
    return sample
  } else if (!isPlaying) {
    return 0
  }

  return sample
}

// Audio processing callback
function processAudio(event: AudioProcessingEvent) {
  const outputBuffer = event.outputBuffer.getChannelData(0)
  const bufferLength = outputBuffer.length

  if (!audioContext || delayBuffer.length === 0) {
    outputBuffer.fill(0)
    return
  }

  for (let i = 0; i < bufferLength; i++) {
    // Generate input signal
    const input = generateInputSample()

    let output = input

    // Only apply comb filter if delay > 0
    if (delaySamples > 0) {
      // Read from delay line
      const readIndex = (writeIndex - delaySamples + delayBuffer.length) % delayBuffer.length
      let delayedSample = delayBuffer[readIndex]

      // Apply lowpass filter if enabled
      if (hasLowpass && audioContext) {
        // Simple first-order lowpass: y[n] = α·x[n] + (1-α)·y[n-1]
        const alpha = 2 * Math.PI * lowpassCutoff / audioContext.sampleRate
        const smoothedAlpha = Math.min(alpha, 1)
        delayedSample = smoothedAlpha * delayedSample + (1 - smoothedAlpha) * prevSample
        prevSample = delayedSample
      }

      // Add noise/dither to feedback path proportional to signal energy
      if (feedbackNoise > 0) {
        // Scale noise by the absolute amplitude of the delayed signal
        // This makes the noise decay naturally as the string energy decays
        const signalAmplitude = Math.abs(delayedSample)
        delayedSample += (Math.random() * 2 - 1) * feedbackNoise * signalAmplitude
      }

      // Comb filter: y[n] = x[n] + feedback·y[n-M]
      output = input + feedback * delayedSample

      // Write output back to delay line
      delayBuffer[writeIndex] = output
      writeIndex = (writeIndex + 1) % delayBuffer.length
    }

    outputBuffer[i] = output
  }
}

// Pluck - trigger a burst
function pluck() {
  if (!audioContext) {
    initAudio()
  }

  // Clear delay buffer
  delayBuffer.fill(0)
  writeIndex = 0
  prevSample = 0
  sinePhase = 0

  // Trigger burst
  burstSamplesRemaining = Math.floor((BURST_DURATION_MS / 1000) * (audioContext?.sampleRate || SAMPLE_RATE))

  // Start visualization if not already playing
  if (!isPlaying && !animationFrameId) {
    updateVisualization()
  }
}

// Toggle auto-pluck mode
function toggleAutoPluck() {
  if (!audioContext) {
    initAudio()
  }

  isAutoPluck = !isAutoPluck

  if (isAutoPluck) {
    // Clear state
    isPlaying = false

    // Pluck immediately
    pluck()

    // Set up interval to pluck every 1.5 seconds
    autoPluckInterval = window.setInterval(() => {
      pluck()
    }, 1500)

    updateVisualization()
  } else {
    // Stop auto-pluck
    if (autoPluckInterval) {
      clearInterval(autoPluckInterval)
      autoPluckInterval = null
    }
  }

  updateButtonStates()
}

// Start/stop continuous mode
function toggleContinuous() {
  if (!audioContext) {
    initAudio()
  }

  // Stop auto-pluck if active
  if (isAutoPluck) {
    if (autoPluckInterval) {
      clearInterval(autoPluckInterval)
      autoPluckInterval = null
    }
    isAutoPluck = false
  }

  isPlaying = !isPlaying

  if (isPlaying) {
    // Clear delay buffer
    delayBuffer.fill(0)
    writeIndex = 0
    prevSample = 0
    sinePhase = 0
    updateVisualization()
  } else {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  updateButtonStates()
}

// Update button states
function updateButtonStates() {
  const continuousBtn = document.getElementById('continuousBtn') as HTMLButtonElement
  if (continuousBtn) {
    continuousBtn.textContent = isPlaying ? 'Stop Continuous' : 'Start Continuous'
    continuousBtn.classList.toggle('active', isPlaying)
  }

  const autoPluckBtn = document.getElementById('autoPluckBtn') as HTMLButtonElement
  if (autoPluckBtn) {
    autoPluckBtn.textContent = isAutoPluck ? 'Stop Auto-Pluck' : 'Start Auto-Pluck'
    autoPluckBtn.classList.toggle('active', isAutoPluck)
  }
}

// Update input source
function updateInputSource(source: InputSource) {
  inputSource = source
  sinePhase = 0  // Reset phase when changing source
}

// Update delay samples
function updateDelaySamples(samples: number) {
  delaySamples = Math.floor(samples)

  if (audioContext) {
    initializeDelayLine()
  }

  drawCircuitDiagram()
  updateDelayDisplay()
}

// Update feedback
function updateFeedback(value: number) {
  feedback = value
  drawCircuitDiagram()
}

// Update lowpass toggle
function updateLowpassToggle(enabled: boolean) {
  hasLowpass = enabled
  drawCircuitDiagram()

  // Show/hide lowpass controls
  const lowpassControls = document.getElementById('lowpassControls')
  if (lowpassControls) {
    lowpassControls.style.display = enabled ? 'block' : 'none'
  }
}

// Update lowpass cutoff
function updateLowpassCutoff(value: number) {
  lowpassCutoff = value
  drawCircuitDiagram()
}

// Update feedback noise
function updateFeedbackNoise(value: number) {
  feedbackNoise = value
  drawCircuitDiagram()
}

// Delay effect functions
function updateDelayEnabled(enabled: boolean) {
  delayEnabled = enabled
  if (delayWetNode) {
    delayWetNode.gain.value = enabled ? delayMix : 0
  }

  // Show/hide delay controls
  const delayControls = document.getElementById('delayControls')
  if (delayControls) {
    delayControls.style.display = enabled ? 'block' : 'none'
  }
}

function updateDelayTime(value: number) {
  delayTime = value
  if (delayNode) {
    delayNode.delayTime.value = value
  }
}

function updateDelayFeedback(value: number) {
  delayFeedback = value
  if (delayFeedbackNode) {
    delayFeedbackNode.gain.value = value
  }
}

function updateDelayMix(value: number) {
  delayMix = value
  if (delayWetNode && delayEnabled) {
    delayWetNode.gain.value = value
  }
}

// Update delay display
function updateDelayDisplay() {
  const display = document.getElementById('delayDisplay')
  if (display && audioContext) {
    const ms = (delaySamples / audioContext.sampleRate * 1000).toFixed(2)
    const freq = (audioContext.sampleRate / delaySamples).toFixed(1)
    display.textContent = `${delaySamples} samples (${ms}ms, ${freq}Hz)`
  }
}

// Visualization functions
function updateVisualization() {
  if (!isPlaying) return

  animationFrameId = requestAnimationFrame(updateVisualization)
}

// Draw circuit diagram (horizontal flow version)
function drawCircuitDiagram() {
  if (!diagramCtx) return

  const canvas = diagramCtx.canvas
  const width = canvas.width
  const height = canvas.height
  const ctx = diagramCtx

  // Clear canvas
  ctx.fillStyle = '#0a0e27'
  ctx.fillRect(0, 0, width, height)

  // Special case: if delay is 0, show bypass message
  if (delaySamples === 0) {
    ctx.fillStyle = '#8892b0'
    ctx.font = '16px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('No Filter (Bypass)', width / 2, height / 2 - 10)
    ctx.fillText('Input passes through unchanged', width / 2, height / 2 + 15)
    return
  }

  const boxWidth = 100
  const boxHeight = 50
  const centerY = height / 2

  // Title
  ctx.fillStyle = '#16c79a'
  ctx.font = 'bold 16px -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Feedback Comb Filter', width / 2, 30)

  // Calculate positions for centered layout
  let numBlocks = 2  // Delay, Gain (minimum)
  if (hasLowpass) numBlocks++
  if (feedbackNoise > 0) numBlocks++
  const blockSpacing = 120  // Reduced spacing between blocks
  const feedbackPathWidth = numBlocks * blockSpacing

  // Feedback return path extends left: 30 + some margin
  const returnPathWidth = 60

  // Center everything with rightward shift
  const diagramCenterX = width / 2 + 150
  const summerX = diagramCenterX - feedbackPathWidth / 2 + returnPathWidth / 2 - 50
  const splitX = summerX + 80
  const inputX = summerX - 100
  const outputX = splitX + 100

  // Input label
  ctx.fillStyle = '#e0e0e0'
  ctx.font = '14px -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Input', inputX, centerY + 5)

  // Arrow from input to summer
  ctx.strokeStyle = '#16c79a'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(inputX + 30, centerY)
  ctx.lineTo(summerX - 20, centerY)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(summerX - 20, centerY)
  ctx.lineTo(summerX - 25, centerY - 5)
  ctx.moveTo(summerX - 20, centerY)
  ctx.lineTo(summerX - 25, centerY + 5)
  ctx.stroke()

  // Summing junction
  ctx.fillStyle = '#0a0e27'
  ctx.strokeStyle = '#16c79a'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(summerX, centerY, 15, 0, 2 * Math.PI)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#e0e0e0'
  ctx.font = '20px -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('+', summerX, centerY + 7)

  // Arrow from summer to split
  ctx.strokeStyle = '#16c79a'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(summerX + 15, centerY)
  ctx.lineTo(splitX - 5, centerY)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(splitX - 5, centerY)
  ctx.lineTo(splitX - 10, centerY - 5)
  ctx.moveTo(splitX - 5, centerY)
  ctx.lineTo(splitX - 10, centerY + 5)
  ctx.stroke()

  // Split point for output and feedback
  ctx.fillStyle = '#16c79a'
  ctx.beginPath()
  ctx.arc(splitX, centerY, 5, 0, 2 * Math.PI)
  ctx.fill()

  // Arrow to output
  ctx.strokeStyle = '#16c79a'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(splitX, centerY)
  ctx.lineTo(outputX - 30, centerY)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(outputX - 30, centerY)
  ctx.lineTo(outputX - 35, centerY - 5)
  ctx.moveTo(outputX - 30, centerY)
  ctx.lineTo(outputX - 35, centerY + 5)
  ctx.stroke()

  // Output label
  ctx.fillStyle = '#e0e0e0'
  ctx.font = '14px -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Output', outputX, centerY + 5)

  // Feedback path
  const feedbackY = centerY + 90  // Slightly closer

  // Vertical line down from split
  ctx.strokeStyle = '#16c79a'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(splitX, centerY + 5)
  ctx.lineTo(splitX, feedbackY)
  ctx.stroke()

  // Calculate starting position for feedback blocks (right-aligned from split)
  let feedbackX = splitX

  // Delay block (starting directly below split point)
  ctx.fillStyle = '#1a2942'
  ctx.fillRect(feedbackX - boxWidth/2, feedbackY - boxHeight/2, boxWidth, boxHeight)
  ctx.strokeStyle = '#16c79a'
  ctx.lineWidth = 2
  ctx.strokeRect(feedbackX - boxWidth/2, feedbackY - boxHeight/2, boxWidth, boxHeight)
  ctx.fillStyle = '#e0e0e0'
  ctx.font = '13px -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Delay', feedbackX, feedbackY - 5)
  ctx.fillText(`${delaySamples} smp`, feedbackX, feedbackY + 10)

  // Arrow to next block
  ctx.strokeStyle = '#16c79a'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(feedbackX - boxWidth/2, feedbackY)
  ctx.lineTo(feedbackX - boxWidth/2 - (blockSpacing - boxWidth), feedbackY)
  ctx.stroke()
  ctx.beginPath()
  const arrowX = feedbackX - boxWidth/2 - (blockSpacing - boxWidth)
  ctx.moveTo(arrowX, feedbackY)
  ctx.lineTo(arrowX + 5, feedbackY - 5)
  ctx.moveTo(arrowX, feedbackY)
  ctx.lineTo(arrowX + 5, feedbackY + 5)
  ctx.stroke()

  feedbackX -= blockSpacing

  // Lowpass block (if enabled)
  if (hasLowpass) {
    ctx.fillStyle = '#1a2942'
    ctx.fillRect(feedbackX - boxWidth/2, feedbackY - boxHeight/2, boxWidth, boxHeight)
    ctx.strokeStyle = '#ff6b6b'
    ctx.lineWidth = 2
    ctx.strokeRect(feedbackX - boxWidth/2, feedbackY - boxHeight/2, boxWidth, boxHeight)
    ctx.fillStyle = '#e0e0e0'
    ctx.font = '13px -apple-system, sans-serif'
    ctx.fillText('Lowpass', feedbackX, feedbackY - 5)
    ctx.fillText(`${(lowpassCutoff/1000).toFixed(1)}kHz`, feedbackX, feedbackY + 10)

    // Arrow to next block
    ctx.strokeStyle = '#16c79a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(feedbackX - boxWidth/2, feedbackY)
    ctx.lineTo(feedbackX - boxWidth/2 - (blockSpacing - boxWidth), feedbackY)
    ctx.stroke()
    ctx.beginPath()
    const arrowX2 = feedbackX - boxWidth/2 - (blockSpacing - boxWidth)
    ctx.moveTo(arrowX2, feedbackY)
    ctx.lineTo(arrowX2 + 5, feedbackY - 5)
    ctx.moveTo(arrowX2, feedbackY)
    ctx.lineTo(arrowX2 + 5, feedbackY + 5)
    ctx.stroke()

    feedbackX -= blockSpacing
  }

  // Noise block (if enabled)
  if (feedbackNoise > 0) {
    ctx.fillStyle = '#1a2942'
    ctx.fillRect(feedbackX - boxWidth/2, feedbackY - boxHeight/2, boxWidth, boxHeight)
    ctx.strokeStyle = '#ffd93d'
    ctx.lineWidth = 2
    ctx.strokeRect(feedbackX - boxWidth/2, feedbackY - boxHeight/2, boxWidth, boxHeight)
    ctx.fillStyle = '#e0e0e0'
    ctx.font = '13px -apple-system, sans-serif'
    ctx.fillText('Noise', feedbackX, feedbackY - 5)
    ctx.fillText(`${feedbackNoise.toFixed(2)}`, feedbackX, feedbackY + 10)

    // Arrow to next block
    ctx.strokeStyle = '#16c79a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(feedbackX - boxWidth/2, feedbackY)
    ctx.lineTo(feedbackX - boxWidth/2 - (blockSpacing - boxWidth), feedbackY)
    ctx.stroke()
    ctx.beginPath()
    const arrowX3 = feedbackX - boxWidth/2 - (blockSpacing - boxWidth)
    ctx.moveTo(arrowX3, feedbackY)
    ctx.lineTo(arrowX3 + 5, feedbackY - 5)
    ctx.moveTo(arrowX3, feedbackY)
    ctx.lineTo(arrowX3 + 5, feedbackY + 5)
    ctx.stroke()

    feedbackX -= blockSpacing
  }

  // Feedback gain block
  ctx.fillStyle = '#1a2942'
  ctx.fillRect(feedbackX - boxWidth/2, feedbackY - boxHeight/2, boxWidth, boxHeight)
  ctx.strokeStyle = '#16c79a'
  ctx.lineWidth = 2
  ctx.strokeRect(feedbackX - boxWidth/2, feedbackY - boxHeight/2, boxWidth, boxHeight)
  ctx.fillStyle = '#e0e0e0'
  ctx.font = '13px -apple-system, sans-serif'
  ctx.fillText('Gain', feedbackX, feedbackY - 5)
  ctx.fillText(feedback.toFixed(3), feedbackX, feedbackY + 10)

  // Connect back to summer - shorter path
  const returnX = feedbackX - boxWidth/2 - 30
  const returnY = centerY - 50

  // Line left from gain block
  ctx.strokeStyle = '#16c79a'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(feedbackX - boxWidth/2, feedbackY)
  ctx.lineTo(returnX, feedbackY)
  ctx.stroke()

  // Line up
  ctx.beginPath()
  ctx.moveTo(returnX, feedbackY)
  ctx.lineTo(returnX, returnY)
  ctx.stroke()

  // Line to summer
  ctx.beginPath()
  ctx.moveTo(returnX, returnY)
  ctx.lineTo(summerX - 15, returnY)
  ctx.lineTo(summerX - 15, centerY - 15)
  ctx.stroke()

  // Arrow head pointing to summer
  ctx.beginPath()
  ctx.moveTo(summerX - 15, centerY - 15)
  ctx.lineTo(summerX - 20, centerY - 20)
  ctx.moveTo(summerX - 15, centerY - 15)
  ctx.lineTo(summerX - 10, centerY - 20)
  ctx.stroke()
}

// Build UI
function buildUI() {
  const app = document.querySelector<HTMLDivElement>('#app')!

  app.innerHTML = `
    <div class="app-header">
      <h1>Karplus-Strong Demo</h1>
      <p class="subtitle">Explore how delays create resonant frequencies</p>
      <div class="theory-box">
        <p><strong>How it works:</strong> A feedback comb filter adds a delayed copy of the output back to the input.
        This creates resonant peaks at frequencies where the delay time matches whole cycles of the wave.</p>

        <p><strong>Why noise becomes pitch:</strong> White noise contains all frequencies equally. When fed through
        the delay feedback loop, only frequencies that "fit" the delay time constructively interfere and build up into
        audible resonances. A 111-sample delay at 48kHz creates peaks every ~432Hz (the fundamental) and its harmonics
        (864Hz, 1296Hz...), transforming random noise into a musical tone!</p>

        <p><strong>Why pitch changes with delay:</strong> The fundamental frequency equals sample_rate ÷ delay_samples.
        Shorter delays (fewer samples) = higher pitch, longer delays = lower pitch. With 48kHz sampling: 100 samples ≈ 480Hz,
        200 samples ≈ 240Hz. It's like changing string length on a guitar! The sample rate here is usually set by hardware, in this case the web audio API, but were it changeable it would be like tuning. A faster sample rate is analagous to the increased tension in the string.</p>

        <p><strong>Why it sounds like a string:</strong> Real plucked strings work exactly this way! When you pluck a guitar
        string, the vibration travels to the bridge, reflects back, and reinforces itself—creating a delay loop in physical space.
        This digital simulation (Karplus-Strong algorithm) replicates that process: the "pluck" is noise, the delay line is the
        string length, feedback is the reflection, and the lowpass filter mimics how strings lose high frequencies over time,
        creating realistic decay and timbre. Lowering the gain is like adding palm mute.</p>
      </div>
    </div>

    <div class="main-container">
      <section class="control-panel">
        <h2>Filter Parameters</h2>

        <div class="control-group">
          <label>Delay: <span id="delayDisplay" class="value-display">441 samples</span></label>
          <input type="range" id="delaySamplesSlider"
                 min="0" max="${MAX_DELAY_SAMPLES}" value="441" step="1">
        </div>

        <div class="control-group">
          <label>Feedback: <span id="feedbackDisplay" class="value-display">0.985</span></label>
          <input type="range" id="feedbackSlider"
                 min="0" max="0.999" value="0.985" step="0.001">
        </div>

        <div class="control-group checkbox-group">
          <label>
            <input type="checkbox" id="lowpassToggle" checked>
            Enable Lowpass Filter
          </label>
        </div>

        <div id="lowpassControls" class="lowpass-controls" style="display: block;">
          <div class="control-group">
            <label>Cutoff Frequency: <span id="cutoffDisplay" class="value-display">5.0 kHz</span></label>
            <input type="range" id="cutoffSlider"
                   min="500" max="10000" value="5000" step="100">
          </div>
        </div>

        <div class="control-group">
          <label>Dither: <span id="noiseDisplay" class="value-display">0.000</span></label>
          <input type="range" id="noiseSlider"
                 min="0" max="0.1" value="0" step="0.001">
        </div>

        <h2 style="margin-top: 2rem;">Input Source</h2>

        <div class="control-group">
          <label>Waveform:</label>
          <select id="inputSourceSelect">
            <option value="noise">White Noise</option>
            <option value="sine">Sine Wave (440Hz)</option>
            <option value="square">Square Wave (440Hz)</option>
          </select>
        </div>

        <h2 style="margin-top: 2rem;">Playback Mode</h2>

        <div class="button-grid">
          <button id="pluckBtn" type="button" class="action-btn">Pluck</button>
          <button id="autoPluckBtn" type="button" class="toggle-btn">Start Auto-Pluck</button>
          <button id="continuousBtn" type="button" class="toggle-btn">Start Continuous</button>
        </div>

        <h2 style="margin-top: 2rem;">Delay Effect</h2>

        <div class="control-group checkbox-group">
          <label>
            <input type="checkbox" id="delayToggle">
            Enable Delay
          </label>
        </div>

        <div id="delayControls" class="delay-controls" style="display: none;">
          <div class="control-group">
            <label>Delay Time: <span id="delayTimeDisplay" class="value-display">300 ms</span></label>
            <input type="range" id="delayTimeSlider"
                   min="50" max="1000" value="300" step="10">
          </div>

          <div class="control-group">
            <label>Feedback: <span id="delayFeedbackDisplay" class="value-display">0.40</span></label>
            <input type="range" id="delayFeedbackSlider"
                   min="0" max="0.9" value="0.4" step="0.01">
          </div>

          <div class="control-group">
            <label>Mix (Wet): <span id="delayMixDisplay" class="value-display">30%</span></label>
            <input type="range" id="delayMixSlider"
                   min="0" max="1" value="0.3" step="0.01">
          </div>
        </div>
      </section>

      <section class="circuit-panel">
        <canvas id="diagramCanvas" width="800" height="450"></canvas>
      </section>
    </div>
  `

  // Get canvas contexts
  const diagramCanvas = document.getElementById('diagramCanvas') as HTMLCanvasElement

  if (diagramCanvas) diagramCtx = diagramCanvas.getContext('2d')

  // Draw initial visualizations
  drawCircuitDiagram()

  // Set up event listeners
  const delaySamplesSlider = document.getElementById('delaySamplesSlider') as HTMLInputElement
  delaySamplesSlider?.addEventListener('input', (e) => {
    updateDelaySamples(parseFloat((e.target as HTMLInputElement).value))
  })

  const feedbackSlider = document.getElementById('feedbackSlider') as HTMLInputElement
  feedbackSlider?.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value)
    updateFeedback(value)
    const display = document.getElementById('feedbackDisplay')
    if (display) display.textContent = value.toFixed(2)
  })

  const lowpassToggle = document.getElementById('lowpassToggle') as HTMLInputElement
  lowpassToggle?.addEventListener('change', (e) => {
    updateLowpassToggle((e.target as HTMLInputElement).checked)
  })

  const cutoffSlider = document.getElementById('cutoffSlider') as HTMLInputElement
  cutoffSlider?.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value)
    updateLowpassCutoff(value)
    const display = document.getElementById('cutoffDisplay')
    if (display) display.textContent = `${(value/1000).toFixed(1)} kHz`
  })

  const noiseSlider = document.getElementById('noiseSlider') as HTMLInputElement
  noiseSlider?.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value)
    updateFeedbackNoise(value)
    const display = document.getElementById('noiseDisplay')
    if (display) display.textContent = value.toFixed(3)
  })

  const inputSourceSelect = document.getElementById('inputSourceSelect') as HTMLSelectElement
  inputSourceSelect?.addEventListener('change', (e) => {
    updateInputSource((e.target as HTMLSelectElement).value as InputSource)
  })

  const pluckBtn = document.getElementById('pluckBtn')
  pluckBtn?.addEventListener('click', pluck)

  const autoPluckBtn = document.getElementById('autoPluckBtn')
  autoPluckBtn?.addEventListener('click', toggleAutoPluck)

  const continuousBtn = document.getElementById('continuousBtn')
  continuousBtn?.addEventListener('click', toggleContinuous)

  // Delay effect controls
  const delayToggle = document.getElementById('delayToggle') as HTMLInputElement
  delayToggle?.addEventListener('change', (e) => {
    updateDelayEnabled((e.target as HTMLInputElement).checked)
  })

  const delayTimeSlider = document.getElementById('delayTimeSlider') as HTMLInputElement
  delayTimeSlider?.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value)
    updateDelayTime(value / 1000)  // Convert ms to seconds
    const display = document.getElementById('delayTimeDisplay')
    if (display) display.textContent = `${value} ms`
  })

  const delayFeedbackSlider = document.getElementById('delayFeedbackSlider') as HTMLInputElement
  delayFeedbackSlider?.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value)
    updateDelayFeedback(value)
    const display = document.getElementById('delayFeedbackDisplay')
    if (display) display.textContent = value.toFixed(2)
  })

  const delayMixSlider = document.getElementById('delayMixSlider') as HTMLInputElement
  delayMixSlider?.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value)
    updateDelayMix(value)
    const display = document.getElementById('delayMixDisplay')
    if (display) display.textContent = `${Math.round(value * 100)}%`
  })
}

// Initialize
buildUI()
