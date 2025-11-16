import './style.css'

// Audio context and nodes
let audioCtx: AudioContext | null = null
let sourceNode: OscillatorNode | AudioBufferSourceNode | null = null
let overtoneOscillators: OscillatorNode[] = []
let gainNode: GainNode | null = null
let filterNode: BiquadFilterNode | null = null
let inputAnalyserNode: AnalyserNode | null = null
let outputAnalyserNode: AnalyserNode | null = null
let isPlaying = false
let animationFrameId: number | null = null

// Signal parameters
let signalType: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise' = 'sine'
let signalFrequency = 108 // A2 (A4=432Hz)
let signalAmplitude = 0.3
let numOvertones = 8 // Number of overtones (harmonics) to add

// Resonator parameters
let circuitType: 'series' | 'parallel' | 'none' = 'series'
let resonantFrequency = 216 // A3 (A4=432Hz)
let qFactor = 30
let isBypassed = false

// Musical note snapping
let autoMusicalMode = true
let useA432Tuning = true
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const A4_MIDI = 69

function getA4Freq(): number {
  return useA432Tuning ? 432 : 440
}

// Canvas contexts
let inputWaveformCtx: CanvasRenderingContext2D | null = null
let outputWaveformCtx: CanvasRenderingContext2D | null = null
let circuitDiagramCtx: CanvasRenderingContext2D | null = null
let poleZeroCtx: CanvasRenderingContext2D | null = null
let sPlane3DCtx: CanvasRenderingContext2D | null = null

// Debounce timer for expensive 3D rendering
let sPlane3DDebounceTimer: number | null = null

// Component values (calculated from resonant frequency and Q)
// Using a reference inductance, we derive R and C
const referenceInductance = 0.01 // 10mH reference inductor

// Initialize audio context (must be triggered by user interaction)
function initAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

// Create white noise buffer
function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

// Create resonator filter based on circuit type
function createResonatorFilter(ctx: AudioContext): BiquadFilterNode | null {
  if (circuitType === 'none' || isBypassed) {
    return null
  }

  const filter = ctx.createBiquadFilter()

  if (circuitType === 'series') {
    filter.type = 'bandpass'
    filter.frequency.value = resonantFrequency
    filter.Q.value = qFactor
  } else if (circuitType === 'parallel') {
    filter.type = 'notch'
    filter.frequency.value = resonantFrequency
    filter.Q.value = qFactor
  }

  return filter
}

// Start audio signal
function startAudio() {
  const ctx = initAudio()

  // Create gain node
  gainNode = ctx.createGain()
  gainNode.gain.value = signalAmplitude

  // Create analysers for visualization (input and output)
  inputAnalyserNode = ctx.createAnalyser()
  inputAnalyserNode.fftSize = 8192 // Larger buffer for stable triggering

  outputAnalyserNode = ctx.createAnalyser()
  outputAnalyserNode.fftSize = 8192

  // Create filter
  filterNode = createResonatorFilter(ctx)

  // Create a mixer node for combining fundamental + overtones
  const mixerNode = ctx.createGain()
  mixerNode.gain.value = 1

  // Create source
  if (signalType === 'noise') {
    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = createNoiseBuffer(ctx)
    noiseSource.loop = true
    noiseSource.start()
    noiseSource.connect(mixerNode)
    sourceNode = noiseSource
  } else {
    // Fundamental frequency
    const osc = ctx.createOscillator()
    osc.type = signalType as OscillatorType
    osc.frequency.value = signalFrequency
    osc.start()
    osc.connect(mixerNode)
    sourceNode = osc

    // Create overtones (harmonics) only for sine type for additive synthesis
    overtoneOscillators = []
    if (signalType === 'sine') {
      for (let i = 1; i <= numOvertones; i++) {
        const overtone = ctx.createOscillator()
        overtone.type = 'sine'
        overtone.frequency.value = signalFrequency * (i + 1) // 2nd, 3rd, 4th... harmonic

        // Decrease amplitude for higher harmonics (1/n falloff)
        const overtoneGain = ctx.createGain()
        overtoneGain.gain.value = 1 / (i + 1)

        overtone.connect(overtoneGain)
        overtoneGain.connect(mixerNode)
        overtone.start()
        overtoneOscillators.push(overtone)
      }
    }
  }

  // Connect audio graph: mixer -> gain -> input analyser -> filter -> output analyser -> destination
  if (filterNode) {
    mixerNode.connect(gainNode)
    gainNode.connect(inputAnalyserNode)
    inputAnalyserNode.connect(filterNode)
    filterNode.connect(outputAnalyserNode)
    outputAnalyserNode.connect(ctx.destination)
  } else {
    mixerNode.connect(gainNode)
    gainNode.connect(inputAnalyserNode)
    inputAnalyserNode.connect(outputAnalyserNode)
    outputAnalyserNode.connect(ctx.destination)
  }

  isPlaying = true
  updateButtonState()
  startVisualization()
}

// Stop audio signal
function stopAudio() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  if (sourceNode) {
    sourceNode.stop()
    sourceNode.disconnect()
    sourceNode = null
  }
  // Stop all overtone oscillators
  overtoneOscillators.forEach((osc) => {
    osc.stop()
    osc.disconnect()
  })
  overtoneOscillators = []

  if (gainNode) {
    gainNode.disconnect()
    gainNode = null
  }
  if (filterNode) {
    filterNode.disconnect()
    filterNode = null
  }
  if (inputAnalyserNode) {
    inputAnalyserNode.disconnect()
    inputAnalyserNode = null
  }
  if (outputAnalyserNode) {
    outputAnalyserNode.disconnect()
    outputAnalyserNode = null
  }
  isPlaying = false
  updateButtonState()
  clearWaveforms()
}

// Toggle audio on/off
function toggleAudio() {
  if (isPlaying) {
    stopAudio()
  } else {
    startAudio()
  }
}

// Visualization functions
function startVisualization() {
  if (!inputAnalyserNode || !outputAnalyserNode || !inputWaveformCtx || !outputWaveformCtx || !audioCtx) return

  const bufferLength = inputAnalyserNode.frequencyBinCount
  const inputDataArray = new Uint8Array(bufferLength)
  const outputDataArray = new Uint8Array(bufferLength)

  function draw() {
    if (!inputAnalyserNode || !outputAnalyserNode || !inputWaveformCtx || !outputWaveformCtx || !audioCtx) return
    animationFrameId = requestAnimationFrame(draw)

    inputAnalyserNode.getByteTimeDomainData(inputDataArray)
    outputAnalyserNode.getByteTimeDomainData(outputDataArray)

    // Calculate samples per period based on fundamental frequency
    const samplesPerPeriod = audioCtx.sampleRate / signalFrequency
    const periodsToShow = 4 // Show 4 complete cycles
    const samplesToShow = Math.floor(samplesPerPeriod * periodsToShow)

    // Find stable trigger on INPUT signal (period-aware)
    const triggerIndex = findStableTrigger(inputDataArray, bufferLength, samplesPerPeriod)

    // Draw input waveform with synchronized trigger
    drawWaveformWithTrigger(inputWaveformCtx, inputDataArray, triggerIndex, samplesToShow, '#ff6b6b')

    // Draw output waveform using SAME trigger offset (keeps them synchronized)
    drawWaveformWithTrigger(outputWaveformCtx, outputDataArray, triggerIndex, samplesToShow, '#16c79a')
  }

  draw()
}

// Find a stable trigger point that respects the fundamental period
function findStableTrigger(dataArray: Uint8Array, bufferLength: number, samplesPerPeriod: number): number {
  const threshold = 128 // Center value (0 crossing)
  const hysteresis = 3 // Prevent noise triggering

  // Search within first 2 periods for best trigger
  const maxSearch = Math.min(Math.floor(samplesPerPeriod * 2), bufferLength / 4)

  // Find upward zero-crossings and verify they lead to periodic pattern
  for (let i = 2; i < maxSearch; i++) {
    // Look for upward zero crossing with hysteresis
    if (dataArray[i - 2] < threshold - hysteresis &&
        dataArray[i - 1] < threshold &&
        dataArray[i] >= threshold) {

      // Verify this trigger leads to a repeating pattern
      // Check if there's a similar zero-crossing at the expected period
      const nextPeriodStart = i + Math.floor(samplesPerPeriod)

      if (nextPeriodStart < bufferLength - 5) {
        // Look for zero-crossing within ±3 samples of expected position
        for (let j = nextPeriodStart - 3; j <= nextPeriodStart + 3; j++) {
          if (j > 1 && j < bufferLength - 1) {
            if (dataArray[j - 1] < threshold && dataArray[j] >= threshold) {
              // Good trigger - pattern repeats at expected period
              return i
            }
          }
        }
      }

      // If we can't verify (buffer too short), still use this trigger
      // but only if it's early enough to show full waveform
      if (i < samplesPerPeriod) {
        return i
      }
    }
  }

  // Fallback: just find first zero-crossing
  for (let i = 1; i < maxSearch; i++) {
    if (dataArray[i - 1] < threshold && dataArray[i] >= threshold) {
      return i
    }
  }

  return 0
}

function drawWaveformWithTrigger(
  ctx: CanvasRenderingContext2D,
  dataArray: Uint8Array,
  triggerIndex: number,
  samplesToShow: number,
  color: string
) {
  const canvas = ctx.canvas
  const width = canvas.width
  const height = canvas.height
  const bufferLength = dataArray.length

  ctx.fillStyle = '#0a0e27'
  ctx.fillRect(0, 0, width, height)

  // Ensure we don't read past buffer
  const actualSamplesToShow = Math.min(samplesToShow, bufferLength - triggerIndex)

  if (actualSamplesToShow <= 0) {
    // Not enough data, draw flat line
    ctx.strokeStyle = '#0f3460'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()
    return
  }

  ctx.lineWidth = 2
  ctx.strokeStyle = color
  ctx.beginPath()

  const sliceWidth = width / actualSamplesToShow
  let x = 0

  for (let i = 0; i < actualSamplesToShow; i++) {
    const dataIndex = triggerIndex + i
    const v = dataArray[dataIndex] / 128.0
    const y = (v * height) / 2

    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }

    x += sliceWidth
  }

  ctx.stroke()

  // Draw period markers (subtle vertical lines)
  if (audioCtx) {
    const samplesPerPeriod = audioCtx.sampleRate / signalFrequency
    ctx.strokeStyle = 'rgba(22, 199, 154, 0.15)'
    ctx.lineWidth = 1
    for (let p = 1; p < 4; p++) {
      const periodX = (p * samplesPerPeriod / actualSamplesToShow) * width
      if (periodX < width) {
        ctx.beginPath()
        ctx.moveTo(periodX, 0)
        ctx.lineTo(periodX, height)
        ctx.stroke()
      }
    }
  }
}

function clearWaveforms() {
  clearSingleWaveform(inputWaveformCtx)
  clearSingleWaveform(outputWaveformCtx)
}

function clearSingleWaveform(ctx: CanvasRenderingContext2D | null) {
  if (!ctx) return
  const canvas = ctx.canvas
  ctx.fillStyle = '#0a0e27'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw center line
  ctx.strokeStyle = '#0f3460'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, canvas.height / 2)
  ctx.lineTo(canvas.width, canvas.height / 2)
  ctx.stroke()
}

// Calculate RLC component values from resonant frequency and Q
function calculateComponentValues() {
  // For an RLC circuit:
  // Resonant frequency: f0 = 1 / (2π√(LC))
  // Q factor (series): Q = (1/R)√(L/C) = ω0L/R
  // Q factor (parallel): Q = R√(C/L) = R/(ω0L)

  const L = referenceInductance // Fixed inductance (Henries)
  const omega0 = 2 * Math.PI * resonantFrequency

  // From f0 = 1/(2π√(LC)), solve for C:
  // C = 1 / (4π²f0²L)
  const C = 1 / (4 * Math.PI * Math.PI * resonantFrequency * resonantFrequency * L)

  let R: number
  if (circuitType === 'series') {
    // Series RLC: Q = ω0L/R, so R = ω0L/Q
    R = (omega0 * L) / qFactor
  } else {
    // Parallel RLC: Q = R/(ω0L), so R = Q*ω0L
    R = qFactor * omega0 * L
  }

  return { R, L, C }
}

// Format component value with appropriate units
function formatValue(value: number, unit: string): string {
  if (unit === 'Ω') {
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MΩ`
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)} kΩ`
    if (value >= 1) return `${value.toFixed(2)} Ω`
    return `${(value * 1e3).toFixed(2)} mΩ`
  } else if (unit === 'H') {
    if (value >= 1) return `${value.toFixed(3)} H`
    if (value >= 1e-3) return `${(value * 1e3).toFixed(2)} mH`
    return `${(value * 1e6).toFixed(2)} µH`
  } else if (unit === 'F') {
    if (value >= 1e-6) return `${(value * 1e6).toFixed(2)} µF`
    if (value >= 1e-9) return `${(value * 1e9).toFixed(2)} nF`
    return `${(value * 1e12).toFixed(2)} pF`
  }
  return value.toExponential(2)
}

// Draw circuit diagram
function drawCircuitDiagram() {
  if (!circuitDiagramCtx) return

  const canvas = circuitDiagramCtx.canvas
  const width = canvas.width
  const height = canvas.height
  const ctx = circuitDiagramCtx

  ctx.fillStyle = '#0a0e27'
  ctx.fillRect(0, 0, width, height)

  if (circuitType === 'none') {
    ctx.fillStyle = '#8892b0'
    ctx.font = '11px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Select a circuit type', width / 2, height / 2)
    return
  }

  ctx.strokeStyle = '#16c79a'
  ctx.lineWidth = 1.5
  ctx.fillStyle = '#8892b0'
  ctx.font = '9px -apple-system, sans-serif'
  ctx.textAlign = 'center'

  const centerY = height / 2
  const startX = 20
  const endX = width - 20
  const componentWidth = 40

  if (circuitType === 'series') {
    // Series RLC: Components in line
    const spacing = (endX - startX - 3 * componentWidth) / 4

    // Input terminal
    ctx.beginPath()
    ctx.moveTo(startX, centerY)
    ctx.lineTo(startX + spacing, centerY)
    ctx.stroke()
    ctx.fillText('IN', startX, centerY - 10)

    // Resistor (zig-zag)
    const rStart = startX + spacing
    drawResistor(ctx, rStart, centerY, componentWidth)
    ctx.fillText('R', rStart + componentWidth / 2, centerY - 12)

    // Wire to inductor
    ctx.beginPath()
    ctx.moveTo(rStart + componentWidth, centerY)
    ctx.lineTo(rStart + componentWidth + spacing, centerY)
    ctx.stroke()

    // Inductor (coils)
    const lStart = rStart + componentWidth + spacing
    drawInductor(ctx, lStart, centerY, componentWidth)
    ctx.fillText('L', lStart + componentWidth / 2, centerY - 12)

    // Wire to capacitor
    ctx.beginPath()
    ctx.moveTo(lStart + componentWidth, centerY)
    ctx.lineTo(lStart + componentWidth + spacing, centerY)
    ctx.stroke()

    // Capacitor (parallel lines)
    const cStart = lStart + componentWidth + spacing
    drawCapacitor(ctx, cStart, centerY, componentWidth)
    ctx.fillText('C', cStart + componentWidth / 2, centerY - 12)

    // Output terminal
    ctx.beginPath()
    ctx.moveTo(cStart + componentWidth, centerY)
    ctx.lineTo(endX, centerY)
    ctx.stroke()
    ctx.fillText('OUT', endX, centerY - 10)

    // Ground symbol
    ctx.beginPath()
    ctx.moveTo(endX, centerY)
    ctx.lineTo(endX, centerY + 15)
    ctx.stroke()
    drawGround(ctx, endX, centerY + 15)
  } else {
    // Parallel RLC: Components in parallel
    const parallelStart = width / 2 - 50
    const parallelEnd = width / 2 + 50

    // Input line
    ctx.beginPath()
    ctx.moveTo(startX, centerY)
    ctx.lineTo(parallelStart, centerY)
    ctx.stroke()
    ctx.fillText('IN', startX, centerY - 10)

    // Top rail
    ctx.beginPath()
    ctx.moveTo(parallelStart, centerY)
    ctx.lineTo(parallelStart, centerY - 25)
    ctx.lineTo(parallelEnd, centerY - 25)
    ctx.lineTo(parallelEnd, centerY)
    ctx.stroke()

    // Bottom rail
    ctx.beginPath()
    ctx.moveTo(parallelStart, centerY)
    ctx.lineTo(parallelStart, centerY + 25)
    ctx.lineTo(parallelEnd, centerY + 25)
    ctx.lineTo(parallelEnd, centerY)
    ctx.stroke()

    // Resistor (left branch)
    const rX = parallelStart + 20
    ctx.beginPath()
    ctx.moveTo(rX, centerY - 25)
    ctx.lineTo(rX, centerY - 15)
    ctx.stroke()
    drawResistorVertical(ctx, rX, centerY - 15, 30)
    ctx.beginPath()
    ctx.moveTo(rX, centerY + 15)
    ctx.lineTo(rX, centerY + 25)
    ctx.stroke()
    ctx.fillText('R', rX, height - 5)

    // Inductor (middle branch)
    const lX = width / 2
    ctx.beginPath()
    ctx.moveTo(lX, centerY - 25)
    ctx.lineTo(lX, centerY - 15)
    ctx.stroke()
    drawInductorVertical(ctx, lX, centerY - 15, 30)
    ctx.beginPath()
    ctx.moveTo(lX, centerY + 15)
    ctx.lineTo(lX, centerY + 25)
    ctx.stroke()
    ctx.fillText('L', lX, 10)

    // Capacitor (right branch)
    const cX = parallelEnd - 20
    ctx.beginPath()
    ctx.moveTo(cX, centerY - 25)
    ctx.lineTo(cX, centerY - 5)
    ctx.stroke()
    drawCapacitorVertical(ctx, cX, centerY - 5, 10)
    ctx.beginPath()
    ctx.moveTo(cX, centerY + 5)
    ctx.lineTo(cX, centerY + 25)
    ctx.stroke()
    ctx.fillText('C', cX, height - 5)

    // Output line
    ctx.beginPath()
    ctx.moveTo(parallelEnd, centerY)
    ctx.lineTo(endX, centerY)
    ctx.stroke()
    ctx.fillText('OUT', endX, centerY - 10)

    // Ground
    ctx.beginPath()
    ctx.moveTo(endX, centerY)
    ctx.lineTo(endX, centerY + 15)
    ctx.stroke()
    drawGround(ctx, endX, centerY + 15)
  }
}

// Draw component symbols
function drawResistor(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
  const zigzags = 6
  const amplitude = 8
  const step = width / zigzags

  ctx.beginPath()
  ctx.moveTo(x, y)
  for (let i = 0; i < zigzags; i++) {
    const xPos = x + i * step
    if (i % 2 === 0) {
      ctx.lineTo(xPos + step / 2, y - amplitude)
      ctx.lineTo(xPos + step, y)
    } else {
      ctx.lineTo(xPos + step / 2, y + amplitude)
      ctx.lineTo(xPos + step, y)
    }
  }
  ctx.stroke()
}

function drawResistorVertical(ctx: CanvasRenderingContext2D, x: number, y: number, height: number) {
  const zigzags = 6
  const amplitude = 8
  const step = height / zigzags

  ctx.beginPath()
  ctx.moveTo(x, y)
  for (let i = 0; i < zigzags; i++) {
    const yPos = y + i * step
    if (i % 2 === 0) {
      ctx.lineTo(x - amplitude, yPos + step / 2)
      ctx.lineTo(x, yPos + step)
    } else {
      ctx.lineTo(x + amplitude, yPos + step / 2)
      ctx.lineTo(x, yPos + step)
    }
  }
  ctx.stroke()
}

function drawInductor(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
  const coils = 4
  const coilWidth = width / coils

  ctx.beginPath()
  ctx.moveTo(x, y)
  for (let i = 0; i < coils; i++) {
    const cx = x + i * coilWidth + coilWidth / 2
    ctx.arc(cx, y, coilWidth / 2, Math.PI, 0, false)
  }
  ctx.stroke()
}

function drawInductorVertical(ctx: CanvasRenderingContext2D, x: number, y: number, height: number) {
  const coils = 4
  const coilHeight = height / coils

  ctx.beginPath()
  ctx.moveTo(x, y)
  for (let i = 0; i < coils; i++) {
    const cy = y + i * coilHeight + coilHeight / 2
    ctx.arc(x, cy, coilHeight / 2, -Math.PI / 2, Math.PI / 2, false)
  }
  ctx.stroke()
}

function drawCapacitor(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
  const plateGap = 8
  const plateHeight = 20

  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + width / 2 - plateGap / 2, y)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(x + width / 2 - plateGap / 2, y - plateHeight / 2)
  ctx.lineTo(x + width / 2 - plateGap / 2, y + plateHeight / 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(x + width / 2 + plateGap / 2, y - plateHeight / 2)
  ctx.lineTo(x + width / 2 + plateGap / 2, y + plateHeight / 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(x + width / 2 + plateGap / 2, y)
  ctx.lineTo(x + width, y)
  ctx.stroke()
}

function drawCapacitorVertical(ctx: CanvasRenderingContext2D, x: number, y: number, _height: number) {
  const plateGap = 8
  const plateWidth = 20

  ctx.beginPath()
  ctx.moveTo(x - plateWidth / 2, y)
  ctx.lineTo(x + plateWidth / 2, y)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(x - plateWidth / 2, y + plateGap)
  ctx.lineTo(x + plateWidth / 2, y + plateGap)
  ctx.stroke()
}

function drawGround(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath()
  ctx.moveTo(x - 15, y)
  ctx.lineTo(x + 15, y)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(x - 10, y + 5)
  ctx.lineTo(x + 10, y + 5)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(x - 5, y + 10)
  ctx.lineTo(x + 5, y + 10)
  ctx.stroke()
}

// Draw pole-zero plot (s-plane) for the RLC filter
function drawPoleZeroPlot() {
  if (!poleZeroCtx) return

  const canvas = poleZeroCtx.canvas
  const width = canvas.width
  const height = canvas.height
  const ctx = poleZeroCtx

  // Clear canvas
  ctx.fillStyle = '#0a0e27'
  ctx.fillRect(0, 0, width, height)

  if (circuitType === 'none') {
    ctx.fillStyle = '#8892b0'
    ctx.font = '14px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Select a circuit type to view pole-zero plot', width / 2, height / 2)
    return
  }

  // Calculate poles and zeros for RLC circuit
  // For a 2nd order system: H(s) = ω₀²/(s² + 2ζω₀s + ω₀²)
  // Poles: s = -ζω₀ ± jω₀√(1-ζ²)
  // Where ζ = 1/(2Q) for series RLC

  const omega0 = 2 * Math.PI * resonantFrequency
  const zeta = 1 / (2 * qFactor) // Damping ratio
  const sigma = -zeta * omega0 // Real part of poles
  const omegaD = omega0 * Math.sqrt(Math.abs(1 - zeta * zeta)) // Imaginary part (damped frequency)

  // Determine if underdamped, critically damped, or overdamped
  const isUnderdamped = zeta < 1
  const isCriticallyDamped = Math.abs(zeta - 1) < 0.001
  // Overdamped case is handled by else branch below

  // Set up coordinate system
  // We'll scale the plot based on the pole locations
  const maxSigma = Math.abs(sigma) * 2.5
  const maxOmega = isUnderdamped ? omegaD * 1.5 : maxSigma

  const centerX = width * 0.6 // Shift center to show more of left half-plane
  const centerY = height / 2
  const scaleX = (width * 0.35) / maxSigma
  const scaleY = (height * 0.4) / maxOmega

  // Draw grid
  ctx.strokeStyle = '#0f3460'
  ctx.lineWidth = 1

  // Vertical grid lines
  for (let i = -5; i <= 2; i++) {
    const x = centerX + (i * maxSigma * scaleX) / 5
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  // Horizontal grid lines
  for (let i = -4; i <= 4; i++) {
    const y = centerY - (i * maxOmega * scaleY) / 4
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  // Draw axes
  ctx.strokeStyle = '#8892b0'
  ctx.lineWidth = 2

  // Real axis (σ)
  ctx.beginPath()
  ctx.moveTo(0, centerY)
  ctx.lineTo(width, centerY)
  ctx.stroke()

  // Imaginary axis (jω)
  ctx.beginPath()
  ctx.moveTo(centerX, 0)
  ctx.lineTo(centerX, height)
  ctx.stroke()

  // Arrow heads
  ctx.fillStyle = '#8892b0'
  // Right arrow (σ)
  ctx.beginPath()
  ctx.moveTo(width - 10, centerY - 5)
  ctx.lineTo(width, centerY)
  ctx.lineTo(width - 10, centerY + 5)
  ctx.fill()
  // Up arrow (jω)
  ctx.beginPath()
  ctx.moveTo(centerX - 5, 10)
  ctx.lineTo(centerX, 0)
  ctx.lineTo(centerX + 5, 10)
  ctx.fill()

  // Axis labels
  ctx.font = '12px -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#8892b0'
  ctx.fillText('σ (Real)', width - 30, centerY - 10)
  ctx.fillText('jω (Imag)', centerX + 35, 15)

  // Draw unit circle (stability boundary)
  ctx.strokeStyle = '#0f3460'
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(centerX, 0)
  ctx.lineTo(centerX, height)
  ctx.stroke()
  ctx.setLineDash([])

  // Draw poles
  ctx.fillStyle = '#ff6b6b'
  ctx.strokeStyle = '#ff6b6b'
  ctx.lineWidth = 3

  if (isUnderdamped) {
    // Two complex conjugate poles
    const poleX = centerX + sigma * scaleX
    const poleY1 = centerY - omegaD * scaleY
    const poleY2 = centerY + omegaD * scaleY

    // Draw X markers for poles
    drawPoleMarker(ctx, poleX, poleY1)
    drawPoleMarker(ctx, poleX, poleY2)

    // Label poles
    ctx.font = '11px Courier New, monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`p₁ = ${(sigma / 1000).toFixed(1)}k + j${(omegaD / 1000).toFixed(1)}k`, poleX + 15, poleY1 - 5)
    ctx.fillText(`p₂ = ${(sigma / 1000).toFixed(1)}k - j${(omegaD / 1000).toFixed(1)}k`, poleX + 15, poleY2 + 15)
  } else if (isCriticallyDamped) {
    // Double pole on real axis
    const poleX = centerX + sigma * scaleX
    drawPoleMarker(ctx, poleX, centerY)
    ctx.font = '11px Courier New, monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`p₁,₂ = ${(sigma / 1000).toFixed(1)}k (double)`, poleX + 15, centerY - 10)
  } else {
    // Two real poles (overdamped)
    const pole1 = sigma + omega0 * Math.sqrt(zeta * zeta - 1)
    const pole2 = sigma - omega0 * Math.sqrt(zeta * zeta - 1)
    const poleX1 = centerX + pole1 * scaleX
    const poleX2 = centerX + pole2 * scaleX

    drawPoleMarker(ctx, poleX1, centerY)
    drawPoleMarker(ctx, poleX2, centerY)

    ctx.font = '11px Courier New, monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`p₁ = ${(pole1 / 1000).toFixed(1)}k`, poleX1 + 15, centerY - 10)
    ctx.fillText(`p₂ = ${(pole2 / 1000).toFixed(1)}k`, poleX2 + 15, centerY + 20)
  }

  // Draw zeros for bandpass (series) and notch (parallel)
  ctx.fillStyle = '#16c79a'
  ctx.strokeStyle = '#16c79a'
  ctx.lineWidth = 3

  if (circuitType === 'series') {
    // Bandpass: zero at origin
    drawZeroMarker(ctx, centerX, centerY)
    ctx.font = '11px Courier New, monospace'
    ctx.textAlign = 'left'
    ctx.fillText('z = 0', centerX + 15, centerY + 25)
  } else if (circuitType === 'parallel') {
    // Notch: zeros on imaginary axis at ±jω₀
    const zeroY1 = centerY - omega0 * scaleY
    const zeroY2 = centerY + omega0 * scaleY

    drawZeroMarker(ctx, centerX, zeroY1)
    drawZeroMarker(ctx, centerX, zeroY2)

    ctx.font = '11px Courier New, monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`z₁ = +j${(omega0 / 1000).toFixed(1)}k`, centerX + 15, zeroY1 - 5)
    ctx.fillText(`z₂ = -j${(omega0 / 1000).toFixed(1)}k`, centerX + 15, zeroY2 + 15)
  }

  // Draw info box
  ctx.fillStyle = 'rgba(22, 33, 62, 0.9)'
  ctx.fillRect(10, 10, 220, 100)
  ctx.strokeStyle = '#0f3460'
  ctx.lineWidth = 1
  ctx.strokeRect(10, 10, 220, 100)

  ctx.fillStyle = '#e0e0e0'
  ctx.font = '11px Courier New, monospace'
  ctx.textAlign = 'left'
  const dampingType = isUnderdamped ? 'Underdamped' : isCriticallyDamped ? 'Critically Damped' : 'Overdamped'
  ctx.fillText(`ω₀ = ${(omega0 / 1000).toFixed(2)}k rad/s`, 20, 30)
  ctx.fillText(`ζ = ${zeta.toFixed(4)} (${dampingType})`, 20, 50)
  ctx.fillText(`Q = ${qFactor.toFixed(2)}`, 20, 70)
  ctx.fillText(`f₀ = ${resonantFrequency} Hz`, 20, 90)

  // Legend
  ctx.fillStyle = 'rgba(22, 33, 62, 0.9)'
  ctx.fillRect(width - 120, 10, 110, 60)
  ctx.strokeStyle = '#0f3460'
  ctx.strokeRect(width - 120, 10, 110, 60)

  ctx.font = '11px -apple-system, sans-serif'
  ctx.fillStyle = '#ff6b6b'
  ctx.fillText('✕ Poles', width - 110, 30)
  ctx.fillStyle = '#16c79a'
  ctx.fillText('○ Zeros', width - 110, 50)
}

function drawPoleMarker(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const size = 8
  ctx.beginPath()
  ctx.moveTo(x - size, y - size)
  ctx.lineTo(x + size, y + size)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x + size, y - size)
  ctx.lineTo(x - size, y + size)
  ctx.stroke()
}

function drawZeroMarker(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const radius = 8
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, 2 * Math.PI)
  ctx.stroke()
}

// Debounced 3D s-plane rendering
function scheduleSPlane3DRender() {
  if (sPlane3DDebounceTimer !== null) {
    clearTimeout(sPlane3DDebounceTimer)
  }
  sPlane3DDebounceTimer = window.setTimeout(() => {
    drawSPlane3D()
    sPlane3DDebounceTimer = null
  }, 150) // 150ms debounce
}

// Draw 3D surface plot of |H(s)| over the s-plane
function drawSPlane3D() {
  if (!sPlane3DCtx) return

  const canvas = sPlane3DCtx.canvas
  const width = canvas.width
  const height = canvas.height
  const ctx = sPlane3DCtx

  // Clear canvas
  ctx.fillStyle = '#0a0e27'
  ctx.fillRect(0, 0, width, height)

  if (circuitType === 'none') {
    ctx.fillStyle = '#8892b0'
    ctx.font = '14px -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Select a circuit type to view 3D transfer function', width / 2, height / 2)
    return
  }

  // Calculate poles and zeros
  const omega0 = 2 * Math.PI * resonantFrequency
  const zeta = 1 / (2 * qFactor)
  const sigma = -zeta * omega0
  const omegaD = omega0 * Math.sqrt(Math.abs(1 - zeta * zeta))

  // Grid resolution (lower for performance)
  const gridSize = 60
  const sigmaRange = Math.abs(sigma) * 4
  const omegaRange = omega0 * 2

  // 3D projection parameters
  const rotateX = 0.7 // Tilt angle
  const rotateZ = -0.3 // Rotation angle
  const scale = 0.8
  const offsetX = width * 0.5
  const offsetY = height * 0.6

  // Compute magnitude surface
  const surface: number[][] = []
  const sigmaValues: number[] = []
  const omegaValues: number[] = []

  for (let i = 0; i <= gridSize; i++) {
    const sigmaVal = -sigmaRange + (i / gridSize) * sigmaRange * 1.2
    sigmaValues.push(sigmaVal)
  }

  for (let j = 0; j <= gridSize; j++) {
    const omegaVal = -omegaRange + (j / gridSize) * omegaRange * 2
    omegaValues.push(omegaVal)
  }

  // Calculate |H(s)| for each point
  for (let i = 0; i <= gridSize; i++) {
    surface[i] = []
    for (let j = 0; j <= gridSize; j++) {
      const s_sigma = sigmaValues[i]
      const s_omega = omegaValues[j]

      let magnitude: number

      if (circuitType === 'series') {
        // Bandpass: H(s) = (2ζω₀s) / (s² + 2ζω₀s + ω₀²)
        // Zero at origin, poles at -ζω₀ ± jω_d
        const numerator = Math.sqrt(
          Math.pow(2 * zeta * omega0 * s_sigma, 2) + Math.pow(2 * zeta * omega0 * s_omega, 2)
        )

        // Distance to poles
        const d1 = Math.sqrt(Math.pow(s_sigma - sigma, 2) + Math.pow(s_omega - omegaD, 2))
        const d2 = Math.sqrt(Math.pow(s_sigma - sigma, 2) + Math.pow(s_omega + omegaD, 2))

        magnitude = numerator / (d1 * d2 + 0.001) // Small epsilon to avoid division by zero
      } else {
        // Notch: H(s) = (s² + ω₀²) / (s² + 2ζω₀s + ω₀²)
        // Zeros at ±jω₀, poles at -ζω₀ ± jω_d
        const zeroD1 = Math.sqrt(Math.pow(s_sigma, 2) + Math.pow(s_omega - omega0, 2))
        const zeroD2 = Math.sqrt(Math.pow(s_sigma, 2) + Math.pow(s_omega + omega0, 2))
        const numerator = zeroD1 * zeroD2

        const d1 = Math.sqrt(Math.pow(s_sigma - sigma, 2) + Math.pow(s_omega - omegaD, 2))
        const d2 = Math.sqrt(Math.pow(s_sigma - sigma, 2) + Math.pow(s_omega + omegaD, 2))

        magnitude = numerator / (d1 * d2 + 0.001)
      }

      // Clamp and log scale for better visualization
      magnitude = Math.min(magnitude, 50)
      surface[i][j] = Math.log10(magnitude + 1) * 30
    }
  }

  // Project 3D point to 2D
  function project(
    sigmaIdx: number,
    omegaIdx: number,
    z: number
  ): { x: number; y: number; depth: number } {
    // Normalize coordinates
    const x3d = (sigmaIdx / gridSize - 0.5) * 2
    const y3d = (omegaIdx / gridSize - 0.5) * 2
    const z3d = z / 50

    // Rotate around Z axis
    const cosZ = Math.cos(rotateZ)
    const sinZ = Math.sin(rotateZ)
    const x1 = x3d * cosZ - y3d * sinZ
    const y1 = x3d * sinZ + y3d * cosZ

    // Rotate around X axis (tilt)
    const cosX = Math.cos(rotateX)
    const sinX = Math.sin(rotateX)
    const y2 = y1 * cosX - z3d * sinX
    const z2 = y1 * sinX + z3d * cosX

    // Project to 2D with perspective
    const perspective = 3
    const factor = perspective / (perspective + z2)

    return {
      x: offsetX + x1 * factor * width * scale * 0.4,
      y: offsetY - y2 * factor * height * scale * 0.4,
      depth: z2
    }
  }

  // Draw surface as wireframe mesh
  ctx.lineWidth = 0.5

  // Draw grid lines (back to front for proper occlusion)
  // First pass: horizontal lines (constant omega)
  for (let j = 0; j <= gridSize; j += 2) {
    ctx.beginPath()
    let firstPoint = true

    for (let i = 0; i <= gridSize; i++) {
      const p = project(i, j, surface[i][j])

      if (firstPoint) {
        ctx.moveTo(p.x, p.y)
        firstPoint = false
      } else {
        ctx.lineTo(p.x, p.y)
      }
    }

    // Color based on position
    ctx.strokeStyle = `rgba(22, 199, 154, ${0.3 + (j / gridSize) * 0.4})`
    ctx.stroke()
  }

  // Second pass: vertical lines (constant sigma)
  for (let i = 0; i <= gridSize; i += 2) {
    ctx.beginPath()
    let firstPoint = true

    for (let j = 0; j <= gridSize; j++) {
      const p = project(i, j, surface[i][j])

      if (firstPoint) {
        ctx.moveTo(p.x, p.y)
        firstPoint = false
      } else {
        ctx.lineTo(p.x, p.y)
      }
    }

    ctx.strokeStyle = `rgba(22, 199, 154, ${0.3 + (i / gridSize) * 0.4})`
    ctx.stroke()
  }

  // Draw poles as red markers
  ctx.fillStyle = '#ff6b6b'
  ctx.strokeStyle = '#ff6b6b'
  ctx.lineWidth = 2

  const isUnderdamped = zeta < 1

  if (isUnderdamped) {
    // Find grid position of poles
    const poleSigmaIdx = ((sigma + sigmaRange) / (sigmaRange * 1.2)) * gridSize
    const poleOmegaIdx1 = ((omegaD + omegaRange) / (omegaRange * 2)) * gridSize
    const poleOmegaIdx2 = ((-omegaD + omegaRange) / (omegaRange * 2)) * gridSize

    // Project pole positions (at high z value to show peak)
    const p1 = project(poleSigmaIdx, poleOmegaIdx1, 80)
    const p2 = project(poleSigmaIdx, poleOmegaIdx2, 80)

    // Draw pole markers
    ctx.beginPath()
    ctx.arc(p1.x, p1.y, 6, 0, 2 * Math.PI)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(p2.x, p2.y, 6, 0, 2 * Math.PI)
    ctx.fill()
  }

  // Draw zeros as green markers
  if (circuitType === 'series') {
    // Zero at origin
    const zeroSigmaIdx = (sigmaRange / (sigmaRange * 1.2)) * gridSize
    const zeroOmegaIdx = (omegaRange / (omegaRange * 2)) * gridSize
    const z = project(zeroSigmaIdx, zeroOmegaIdx, 0)

    ctx.strokeStyle = '#16c79a'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(z.x, z.y, 8, 0, 2 * Math.PI)
    ctx.stroke()
  } else if (circuitType === 'parallel') {
    // Zeros on imaginary axis
    const zeroSigmaIdx = (sigmaRange / (sigmaRange * 1.2)) * gridSize
    const zeroOmegaIdx1 = ((omega0 + omegaRange) / (omegaRange * 2)) * gridSize
    const zeroOmegaIdx2 = ((-omega0 + omegaRange) / (omegaRange * 2)) * gridSize

    const z1 = project(zeroSigmaIdx, zeroOmegaIdx1, 0)
    const z2 = project(zeroSigmaIdx, zeroOmegaIdx2, 0)

    ctx.strokeStyle = '#16c79a'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(z1.x, z1.y, 8, 0, 2 * Math.PI)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(z2.x, z2.y, 8, 0, 2 * Math.PI)
    ctx.stroke()
  }

  // Draw axis labels
  ctx.fillStyle = '#8892b0'
  ctx.font = '12px -apple-system, sans-serif'
  ctx.textAlign = 'center'

  // σ axis label
  const sigmaAxisEnd = project(gridSize, gridSize / 2, 0)
  ctx.fillText('σ (Real)', sigmaAxisEnd.x + 30, sigmaAxisEnd.y)

  // jω axis label
  const omegaAxisEnd = project(gridSize / 2, gridSize, 0)
  ctx.fillText('jω (Imag)', omegaAxisEnd.x, omegaAxisEnd.y - 10)

  // |H(s)| label
  ctx.fillText('|H(s)|', width - 50, 30)

  // Info box
  ctx.fillStyle = 'rgba(22, 33, 62, 0.9)'
  ctx.fillRect(10, 10, 180, 50)
  ctx.strokeStyle = '#0f3460'
  ctx.lineWidth = 1
  ctx.strokeRect(10, 10, 180, 50)

  ctx.fillStyle = '#e0e0e0'
  ctx.font = '11px -apple-system, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('3D Transfer Function Surface', 20, 30)
  ctx.fillStyle = '#8892b0'
  ctx.fillText('Peaks at poles, valleys at zeros', 20, 48)
}

// Logarithmic frequency scaling helpers
// Maps 0-100 slider value to 20-2000 Hz logarithmically
function sliderToFrequency(sliderValue: number): number {
  const minFreq = 20
  const maxFreq = 2000
  const minLog = Math.log10(minFreq)
  const maxLog = Math.log10(maxFreq)
  const logValue = minLog + (sliderValue / 100) * (maxLog - minLog)
  return Math.round(Math.pow(10, logValue))
}

function frequencyToSlider(freq: number): number {
  const minFreq = 20
  const maxFreq = 2000
  const minLog = Math.log10(minFreq)
  const maxLog = Math.log10(maxFreq)
  const logValue = Math.log10(freq)
  return ((logValue - minLog) / (maxLog - minLog)) * 100
}

// Maps 0-100 slider value to 20-10000 Hz logarithmically (for resonant frequency)
function sliderToResFrequency(sliderValue: number): number {
  const minFreq = 20
  const maxFreq = 10000
  const minLog = Math.log10(minFreq)
  const maxLog = Math.log10(maxFreq)
  const logValue = minLog + (sliderValue / 100) * (maxLog - minLog)
  return Math.round(Math.pow(10, logValue))
}

function resFrequencyToSlider(freq: number): number {
  const minFreq = 20
  const maxFreq = 10000
  const minLog = Math.log10(minFreq)
  const maxLog = Math.log10(maxFreq)
  const logValue = Math.log10(freq)
  return ((logValue - minLog) / (maxLog - minLog)) * 100
}

// Maps 0-100 slider value to 0.1-100 Q factor logarithmically
function sliderToQFactor(sliderValue: number): number {
  const minQ = 0.1
  const maxQ = 100
  const minLog = Math.log10(minQ)
  const maxLog = Math.log10(maxQ)
  const logValue = minLog + (sliderValue / 100) * (maxLog - minLog)
  return Math.pow(10, logValue)
}

function qFactorToSlider(q: number): number {
  const minQ = 0.1
  const maxQ = 100
  const minLog = Math.log10(minQ)
  const maxLog = Math.log10(maxQ)
  const logValue = Math.log10(q)
  return ((logValue - minLog) / (maxLog - minLog)) * 100
}

// Musical note helpers
function freqToMidi(freq: number): number {
  return 12 * Math.log2(freq / getA4Freq()) + A4_MIDI
}

function midiToFreq(midi: number): number {
  return getA4Freq() * Math.pow(2, (midi - A4_MIDI) / 12)
}

function snapToMusicalNote(freq: number): number {
  const midi = Math.round(freqToMidi(freq))
  return midiToFreq(midi)
}

function freqToNoteName(freq: number): string {
  const midi = Math.round(freqToMidi(freq))
  const noteIndex = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  return `${NOTE_NAMES[noteIndex]}${octave}`
}

// Update signal parameters
function updateSignalType(type: typeof signalType) {
  signalType = type
  const overtonesControl = document.getElementById('overtones')?.parentElement
  if (overtonesControl) {
    overtonesControl.style.display = type === 'sine' ? 'block' : 'none'
  }
  if (isPlaying) {
    stopAudio()
    startAudio()
  }
}

function updateFrequency(freq: number) {
  if (autoMusicalMode) {
    freq = snapToMusicalNote(freq)
  }
  signalFrequency = freq
  if (sourceNode && 'frequency' in sourceNode) {
    sourceNode.frequency.value = freq
  }
  const freqText = autoMusicalMode
    ? `${Math.round(freq)} Hz (${freqToNoteName(freq)})`
    : `${freq} Hz`
  document.getElementById('freqValue')!.textContent = freqText
}

function updateAmplitude(amp: number) {
  signalAmplitude = amp
  if (gainNode) {
    gainNode.gain.value = amp
  }
  document.getElementById('ampValue')!.textContent = amp.toFixed(2)
}

function updateOvertones(num: number) {
  numOvertones = num
  document.getElementById('overtonesValue')!.textContent = num.toString()
  if (isPlaying) {
    stopAudio()
    startAudio()
  }
}

// Update resonator parameters
function updateCircuitType(type: typeof circuitType) {
  circuitType = type
  if (isPlaying) {
    stopAudio()
    startAudio()
  }
  updateCircuitInfo()
  drawCircuitDiagram()
  updateFormulaBox()
  drawPoleZeroPlot()
  scheduleSPlane3DRender()
}

function toggleBypass() {
  isBypassed = !isBypassed
  updateBypassButtonState()
  if (isPlaying) {
    stopAudio()
    startAudio()
  }
}

function updateBypassButtonState() {
  const btn = document.getElementById('bypassBtn') as HTMLButtonElement
  if (btn) {
    if (isBypassed) {
      btn.textContent = 'Enable Filter'
      btn.classList.add('bypassed')
    } else {
      btn.textContent = 'Bypass'
      btn.classList.remove('bypassed')
    }
  }
}

function updateResonantFrequency(freq: number) {
  if (autoMusicalMode) {
    freq = snapToMusicalNote(freq)
  }
  resonantFrequency = freq
  if (filterNode) {
    filterNode.frequency.value = freq
  }
  updateCircuitInfo()
  drawCircuitDiagram()
  updateFormulaBox()
  drawPoleZeroPlot()
  scheduleSPlane3DRender()
}

function updateQFactor(q: number) {
  qFactor = q
  if (filterNode) {
    filterNode.Q.value = q
  }
  updateCircuitInfo()
  drawCircuitDiagram()
  updateFormulaBox()
  drawPoleZeroPlot()
  scheduleSPlane3DRender()
}

// Update circuit info display
function updateCircuitInfo() {
  const infoEl = document.getElementById('circuitInfo')!
  if (circuitType === 'none') {
    infoEl.textContent = 'No filter applied - direct signal path'
  } else {
    const behavior =
      circuitType === 'series' ? 'Bandpass (passes resonant frequency)' : 'Notch (blocks resonant frequency)'
    infoEl.innerHTML = `
      <strong>${circuitType === 'series' ? 'Series' : 'Parallel'} RLC Circuit</strong><br>
      ${behavior}
    `
  }
}

// Update formula box with calculations
function updateFormulaBox() {
  const formulaContent = document.querySelector('.formula-content')!

  if (circuitType === 'none') {
    formulaContent.innerHTML = 'Select a circuit type to see formulas'
    return
  }

  // Check if sliders already exist (avoid full re-render)
  const existingSlider = document.getElementById('resFrequency')
  if (existingSlider) {
    // Just update the values, don't re-render
    updateFormulaValues()
    return
  }

  // Initial render
  formulaContent.innerHTML = `
    <div class="formula-grid">
      <div class="formula">
        <div class="formula-header">
          <div class="formula-label">Resonant Frequency</div>
        </div>
        <div class="formula-equation"><span class="formula-symbol">f₀</span> <span class="formula-equals">=</span> 1 / (2π√LC)</div>
        <div class="formula-result" id="resFreqResult">${autoMusicalMode ? `${Math.round(resonantFrequency)} Hz (${freqToNoteName(resonantFrequency)})` : `${resonantFrequency} Hz`}</div>
        <input type="range" class="formula-slider" id="resFrequency" min="0" max="100" value="${resFrequencyToSlider(resonantFrequency)}" step="0.1">
      </div>

      <div class="formula">
        <div class="formula-header">
          <div class="formula-label">Q Factor</div>
        </div>
        <div class="formula-equation" id="qEquation"><span class="formula-symbol">Q</span> <span class="formula-equals">=</span> ${circuitType === 'series' ? 'ω₀L / R' : 'R / (ω₀L)'}</div>
        <div class="formula-result" id="qFactorResult">${qFactor.toFixed(2)}</div>
        <input type="range" class="formula-slider" id="qFactor" min="0" max="100" value="${qFactorToSlider(qFactor)}" step="0.1">
      </div>

      <div class="formula">
        <div class="formula-header">
          <div class="formula-label">Inductance (fixed)</div>
        </div>
        <div class="formula-equation"><span class="formula-symbol">L</span> <span class="formula-equals">=</span> reference</div>
        <div class="formula-result" id="inductanceResult"></div>
      </div>

      <div class="formula">
        <div class="formula-header">
          <div class="formula-label">Capacitance</div>
        </div>
        <div class="formula-equation"><span class="formula-symbol">C</span> <span class="formula-equals">=</span> 1 / (4π²f₀²L)</div>
        <div class="formula-result" id="capacitanceResult"></div>
      </div>

      <div class="formula">
        <div class="formula-header">
          <div class="formula-label">Resistance</div>
        </div>
        <div class="formula-equation" id="resistanceEquation"></div>
        <div class="formula-result" id="resistanceResult"></div>
      </div>

      <div class="formula">
        <div class="formula-header">
          <div class="formula-label">Bandwidth</div>
        </div>
        <div class="formula-equation"><span class="formula-symbol">BW</span> <span class="formula-equals">=</span> f₀ / Q</div>
        <div class="formula-result" id="bandwidthResult"></div>
      </div>
    </div>
  `

  // Attach event listeners once
  attachFormulaSliderListeners()

  // Update the calculated values
  updateFormulaValues()
}

function updateFormulaValues() {
  const { R, L, C } = calculateComponentValues()
  const bandwidth = resonantFrequency / qFactor

  // Update only the text content
  const resFreqResult = document.getElementById('resFreqResult')
  const qFactorResult = document.getElementById('qFactorResult')
  const inductanceResult = document.getElementById('inductanceResult')
  const capacitanceResult = document.getElementById('capacitanceResult')
  const resistanceResult = document.getElementById('resistanceResult')
  const resistanceEquation = document.getElementById('resistanceEquation')
  const bandwidthResult = document.getElementById('bandwidthResult')

  if (resFreqResult) {
    resFreqResult.textContent = autoMusicalMode
      ? `${Math.round(resonantFrequency)} Hz (${freqToNoteName(resonantFrequency)})`
      : `${resonantFrequency} Hz`
  }
  if (qFactorResult) qFactorResult.textContent = qFactor.toFixed(2)
  if (inductanceResult) inductanceResult.textContent = formatValue(L, 'H')
  if (capacitanceResult) capacitanceResult.textContent = formatValue(C, 'F')
  if (resistanceResult) resistanceResult.textContent = formatValue(R, 'Ω')
  if (resistanceEquation) {
    resistanceEquation.innerHTML = circuitType === 'series' ? 'Q = ω₀L / R' : 'Q = R / (ω₀L)'
  }
  if (bandwidthResult) bandwidthResult.textContent = `${bandwidth.toFixed(2)} Hz`
}

function attachFormulaSliderListeners() {
  const resFreqSlider = document.getElementById('resFrequency') as HTMLInputElement
  const qFactorSlider = document.getElementById('qFactor') as HTMLInputElement

  resFreqSlider?.addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement
    const freq = sliderToResFrequency(parseFloat(input.value))
    updateResonantFrequency(freq)
  })

  qFactorSlider?.addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement
    const q = sliderToQFactor(parseFloat(input.value))
    updateQFactor(q)
  })
}

// Update button text based on state
function updateButtonState() {
  const btn = document.getElementById('startBtn') as HTMLButtonElement
  if (btn) {
    btn.textContent = isPlaying ? 'Stop Signal' : 'Start Signal'
    if (isPlaying) {
      btn.classList.add('playing')
    } else {
      btn.classList.remove('playing')
    }
  }
}

// Render the UI
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="container">
    <header class="app-header">
      <h1>Resonator Circuit Explorer</h1>
      <p>Explore Series and Parallel RLC resonator circuits with real-time audio and visualization</p>
      <div class="auto-mode-toggle">
        <label>
          <input type="checkbox" id="autoMusicalMode" ${autoMusicalMode ? 'checked' : ''}>
          Auto ♪ (snap to musical notes)
        </label>
        <label>
          <input type="checkbox" id="useA432Tuning" ${useA432Tuning ? 'checked' : ''}>
          A4 = 432 Hz
        </label>
      </div>
    </header>

    <div class="panels">
      <section class="controls">
        <h2>Input Signal</h2>

        <div class="control-group">
          <label>Signal Type:</label>
          <select id="signalType">
            <option value="sine">Sine</option>
            <option value="square">Square</option>
            <option value="sawtooth">Sawtooth</option>
            <option value="triangle">Triangle</option>
            <option value="noise">White Noise</option>
          </select>
        </div>

        <div class="control-group">
          <label>Frequency: <span id="freqValue">${signalFrequency} Hz</span></label>
          <input type="range" id="frequency" min="0" max="100" value="${frequencyToSlider(signalFrequency)}" step="0.1">
        </div>

        <div class="control-group">
          <label>Amplitude: <span id="ampValue">0.30</span></label>
          <input type="range" id="amplitude" min="0" max="1" value="0.3" step="0.01">
        </div>

        <div class="control-group">
          <label>Overtones: <span id="overtonesValue">${numOvertones}</span></label>
          <input type="range" id="overtones" min="0" max="16" value="${numOvertones}" step="1">
        </div>

        <button id="startBtn" type="button">Start Signal</button>
      </section>

      <section class="controls">
        <h2>Circuit Type</h2>

        <div class="control-group">
          <label>Resonator Configuration:</label>
          <select id="circuitType">
            <option value="series" selected>Series RLC (Bandpass)</option>
            <option value="parallel">Parallel RLC (Notch)</option>
          </select>
        </div>

        <button id="bypassBtn" type="button">Bypass</button>

        <canvas id="circuitDiagramCanvas" width="400" height="80"></canvas>

        <div id="circuitInfo" class="circuit-info">
          No filter applied - direct signal path
        </div>
      </section>
    </div>

    <section class="formula-section">
      <h2>Component Calculations</h2>
      <div id="formulaBox" class="formula-box-wide">
        <div class="formula-content">Select a circuit type to see formulas</div>
      </div>
    </section>

    <section class="visualization">
      <h2>Input Waveform</h2>
      <canvas id="inputWaveformCanvas" width="800" height="150"></canvas>
    </section>

    <section class="visualization">
      <h2>Output Waveform</h2>
      <canvas id="outputWaveformCanvas" width="800" height="150"></canvas>
    </section>

    <section class="visualization">
      <h2>Pole-Zero Plot (s-plane)</h2>
      <canvas id="poleZeroCanvas" width="800" height="300"></canvas>
    </section>

    <section class="visualization">
      <h2>Transfer Function Magnitude |H(s)|</h2>
      <canvas id="sPlane3DCanvas" width="800" height="400"></canvas>
    </section>
  </div>
`

// Initialize canvases
const inputWaveformCanvas = document.getElementById('inputWaveformCanvas') as HTMLCanvasElement
const outputWaveformCanvas = document.getElementById('outputWaveformCanvas') as HTMLCanvasElement
const circuitDiagramCanvas = document.getElementById('circuitDiagramCanvas') as HTMLCanvasElement
const poleZeroCanvas = document.getElementById('poleZeroCanvas') as HTMLCanvasElement

if (inputWaveformCanvas) {
  inputWaveformCtx = inputWaveformCanvas.getContext('2d')
  clearSingleWaveform(inputWaveformCtx)
}

if (outputWaveformCanvas) {
  outputWaveformCtx = outputWaveformCanvas.getContext('2d')
  clearSingleWaveform(outputWaveformCtx)
}

if (circuitDiagramCanvas) {
  circuitDiagramCtx = circuitDiagramCanvas.getContext('2d')
  drawCircuitDiagram()
}

if (poleZeroCanvas) {
  poleZeroCtx = poleZeroCanvas.getContext('2d')
  drawPoleZeroPlot()
}

const sPlane3DCanvas = document.getElementById('sPlane3DCanvas') as HTMLCanvasElement
if (sPlane3DCanvas) {
  sPlane3DCtx = sPlane3DCanvas.getContext('2d')
  drawSPlane3D()
}

// Initialize with series RLC selected
updateCircuitInfo()
updateFormulaBox()

// Set up event listeners
document.getElementById('startBtn')?.addEventListener('click', toggleAudio)

document.getElementById('signalType')?.addEventListener('change', (e) => {
  const select = e.target as HTMLSelectElement
  updateSignalType(select.value as typeof signalType)
})

document.getElementById('frequency')?.addEventListener('input', (e) => {
  const input = e.target as HTMLInputElement
  const freq = sliderToFrequency(parseFloat(input.value))
  updateFrequency(freq)
})

document.getElementById('amplitude')?.addEventListener('input', (e) => {
  const input = e.target as HTMLInputElement
  updateAmplitude(parseFloat(input.value))
})

document.getElementById('overtones')?.addEventListener('input', (e) => {
  const input = e.target as HTMLInputElement
  updateOvertones(parseInt(input.value))
})

document.getElementById('circuitType')?.addEventListener('change', (e) => {
  const select = e.target as HTMLSelectElement
  updateCircuitType(select.value as typeof circuitType)
})

document.getElementById('bypassBtn')?.addEventListener('click', toggleBypass)

document.getElementById('autoMusicalMode')?.addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement
  autoMusicalMode = input.checked
  // Re-snap current frequencies if mode is enabled
  if (autoMusicalMode) {
    updateFrequency(signalFrequency)
    updateResonantFrequency(resonantFrequency)
  } else {
    // Just update the displays to remove note names
    const freqText = `${signalFrequency} Hz`
    document.getElementById('freqValue')!.textContent = freqText
    updateFormulaBox()
  }
})

document.getElementById('useA432Tuning')?.addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement
  useA432Tuning = input.checked
  // Re-snap current frequencies if mode is enabled
  if (autoMusicalMode) {
    updateFrequency(signalFrequency)
    updateResonantFrequency(resonantFrequency)
  }
})
