import './style.css'

type DisplayStyle = 'spectrogram' | 'eq' | 'waveform'

class SpectrogramVisualizer {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private microphone: MediaStreamAudioSourceNode | null = null
  private animationId: number | null = null
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private dataArray: Uint8Array<ArrayBuffer> | null = null
  private fftSize: number = 2048
  private maxFrequency: number = 5000
  private stream: MediaStream | null = null
  private displayStyle: DisplayStyle = 'eq'
  private smoothedData: number[] = []
  private peakHoldData: number[] = []
  private peakHoldTime: number[] = []

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement
    this.ctx = this.canvas.getContext('2d')!
    this.setupCanvas()
  }

  private setupCanvas() {
    // Set canvas to a larger size for better visibility
    this.canvas.width = 1200
    this.canvas.height = 700

    // Fill with black background initially
    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  async start() {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      })

      // Create audio context and analyser
      this.audioContext = new AudioContext()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = this.fftSize
      this.analyser.smoothingTimeConstant = 0.8  // Higher smoothing for stability

      // Create data array for frequency data
      const bufferLength = this.analyser.frequencyBinCount
      this.dataArray = new Uint8Array(bufferLength)

      // Initialize smoothing arrays
      this.smoothedData = new Array(this.canvas.width).fill(0)
      this.peakHoldData = new Array(this.canvas.width).fill(0)
      this.peakHoldTime = new Array(this.canvas.width).fill(0)

      // Connect microphone to analyser
      this.microphone = this.audioContext.createMediaStreamSource(this.stream)
      this.microphone.connect(this.analyser)

      // Start visualization
      this.draw()

      return true
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Could not access microphone. Please grant permission and try again.')
      return false
    }
  }

  stop() {
    // Stop animation
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }

    // Disconnect and close audio
    if (this.microphone) {
      this.microphone.disconnect()
      this.microphone = null
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.analyser = null
    this.dataArray = null
  }

  setFFTSize(size: number) {
    this.fftSize = size
    if (this.analyser) {
      this.analyser.fftSize = size
      const bufferLength = this.analyser.frequencyBinCount
      this.dataArray = new Uint8Array(bufferLength)
    }
  }

  setMaxFrequency(freq: number) {
    this.maxFrequency = freq
  }

  setDisplayStyle(style: DisplayStyle) {
    this.displayStyle = style
    // Clear canvas when changing modes
    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  private draw = () => {
    this.animationId = requestAnimationFrame(this.draw)

    if (!this.analyser || !this.dataArray) return

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray)

    // Route to appropriate drawing method based on display style
    switch (this.displayStyle) {
      case 'spectrogram':
        this.drawSpectrogram()
        break
      case 'eq':
        this.drawEQ()
        break
      case 'waveform':
        this.drawWaveform()
        break
    }
  }

  private drawSpectrogram() {
    if (!this.dataArray) return

    // Shift existing spectrogram to the left by 1 pixel
    const imageData = this.ctx.getImageData(1, 0, this.canvas.width - 1, this.canvas.height)
    this.ctx.putImageData(imageData, 0, 0)

    // Draw new column on the right
    const sampleRate = this.audioContext!.sampleRate
    const nyquist = sampleRate / 2
    const maxBin = Math.floor((this.maxFrequency / nyquist) * this.dataArray.length)

    for (let i = 0; i < this.canvas.height; i++) {
      // Map canvas height to frequency bins (inverted so low freq at bottom)
      const binIndex = Math.floor((1 - i / this.canvas.height) * maxBin)
      const value = this.dataArray[binIndex] || 0

      // Create a color based on amplitude (hot colormap for spectrogram)
      const color = this.amplitudeToColor(value)

      this.ctx.fillStyle = color
      this.ctx.fillRect(this.canvas.width - 1, i, 1, 1)
    }

    // Draw frequency labels on the left side
    this.drawFrequencyLabels()
  }

  private drawEQ() {
    if (!this.dataArray) return

    // Clear canvas
    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    const sampleRate = this.audioContext!.sampleRate
    const nyquist = sampleRate / 2
    const maxBin = Math.floor((this.maxFrequency / nyquist) * this.dataArray.length)

    // Update smoothed data for each pixel
    const smoothingFactor = 0.7  // Higher = more smoothing
    const peakDecayRate = 0.98  // How fast peaks decay
    const currentTime = performance.now()

    for (let x = 0; x < this.canvas.width; x++) {
      // Map pixel position to frequency bin (with averaging for smoothness)
      const binFloat = (x / this.canvas.width) * maxBin
      const binIndex = Math.floor(binFloat)

      // Average multiple bins for each pixel to reduce noise
      let sum = 0
      const binRange = 3  // Average this many bins
      for (let i = 0; i < binRange; i++) {
        sum += this.dataArray[Math.min(binIndex + i, this.dataArray.length - 1)] || 0
      }
      const rawValue = sum / binRange

      // Apply exponential smoothing
      this.smoothedData[x] = (smoothingFactor * this.smoothedData[x]) + ((1 - smoothingFactor) * rawValue)

      // Peak hold with decay
      if (this.smoothedData[x] > this.peakHoldData[x]) {
        this.peakHoldData[x] = this.smoothedData[x]
        this.peakHoldTime[x] = currentTime
      } else {
        // Decay peaks over time
        const timeSincePeak = currentTime - this.peakHoldTime[x]
        if (timeSincePeak > 100) {  // Hold for 100ms
          this.peakHoldData[x] *= peakDecayRate
        }
      }
    }

    // Detect formants in specific frequency ranges
    // F1 is typically 200-1000 Hz, F2 is 800-3000 Hz
    const F1_MIN = 200
    const F1_MAX = 1000
    const F2_MIN = 800
    const F2_MAX = 3000

    const minPeakHeight = 30
    const peakWindowSize = 10  // Look for peaks in this window

    // Find F1 (first formant in 200-1000 Hz range)
    let F1: {x: number, value: number, freq: number} | null = null
    const f1StartX = Math.floor((F1_MIN / this.maxFrequency) * this.canvas.width)
    const f1EndX = Math.floor((F1_MAX / this.maxFrequency) * this.canvas.width)

    for (let x = f1StartX; x < f1EndX; x++) {
      const value = this.smoothedData[x]

      if (value > minPeakHeight) {
        // Check if this is a local maximum
        let isMaximum = true
        for (let dx = -peakWindowSize; dx <= peakWindowSize; dx++) {
          const checkX = x + dx
          if (checkX >= f1StartX && checkX < f1EndX && dx !== 0) {
            if (this.smoothedData[checkX] > value) {
              isMaximum = false
              break
            }
          }
        }

        if (isMaximum) {
          const freq = Math.round((x / this.canvas.width) * this.maxFrequency)
          if (!F1 || value > F1.value) {
            F1 = {x, value, freq}
          }
        }
      }
    }

    // Find F2 (second formant in 800-3000 Hz range)
    let F2: {x: number, value: number, freq: number} | null = null
    const f2StartX = Math.floor((F2_MIN / this.maxFrequency) * this.canvas.width)
    const f2EndX = Math.min(
      Math.floor((F2_MAX / this.maxFrequency) * this.canvas.width),
      this.canvas.width
    )

    for (let x = f2StartX; x < f2EndX; x++) {
      const value = this.smoothedData[x]

      if (value > minPeakHeight) {
        // Check if this is a local maximum
        let isMaximum = true
        for (let dx = -peakWindowSize; dx <= peakWindowSize; dx++) {
          const checkX = x + dx
          if (checkX >= f2StartX && checkX < f2EndX && dx !== 0) {
            if (this.smoothedData[checkX] > value) {
              isMaximum = false
              break
            }
          }
        }

        if (isMaximum) {
          const freq = Math.round((x / this.canvas.width) * this.maxFrequency)
          // Skip if too close to F1
          if (!F1 || Math.abs(freq - F1.freq) > 400) {
            if (!F2 || value > F2.value) {
              F2 = {x, value, freq}
            }
          }
        }
      }
    }

    // Detect vowel based on F1 and F2 frequencies
    const detectedVowel = this.detectVowel(F1?.freq, F2?.freq)

    console.log('F1:', F1?.freq, 'F2:', F2?.freq, 'Vowel:', detectedVowel)

    // Draw filled area under curve
    this.ctx.beginPath()
    this.ctx.moveTo(0, this.canvas.height)

    for (let x = 0; x < this.canvas.width; x++) {
      const amplitude = (this.smoothedData[x] / 255) * this.canvas.height
      const y = this.canvas.height - amplitude
      this.ctx.lineTo(x, y)
    }

    this.ctx.lineTo(this.canvas.width, this.canvas.height)
    this.ctx.closePath()

    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height)
    gradient.addColorStop(0, 'rgba(100, 200, 255, 0.8)')
    gradient.addColorStop(0.5, 'rgba(50, 150, 255, 0.5)')
    gradient.addColorStop(1, 'rgba(20, 100, 200, 0.2)')

    this.ctx.fillStyle = gradient
    this.ctx.fill()

    // Draw the smoothed spectrum line
    this.ctx.beginPath()
    for (let x = 0; x < this.canvas.width; x++) {
      const amplitude = (this.smoothedData[x] / 255) * this.canvas.height
      const y = this.canvas.height - amplitude

      if (x === 0) {
        this.ctx.moveTo(x, y)
      } else {
        this.ctx.lineTo(x, y)
      }
    }

    this.ctx.strokeStyle = '#4df'
    this.ctx.lineWidth = 2
    this.ctx.stroke()

    // Highlight F1 and F2 specifically
    if (F1) {
      const amplitude = (F1.value / 255) * this.canvas.height
      const y = this.canvas.height - amplitude

      // Draw F1 marker (green)
      this.ctx.beginPath()
      this.ctx.arc(F1.x, y, 10, 0, Math.PI * 2)
      this.ctx.fillStyle = 'rgba(50, 255, 50, 0.9)'
      this.ctx.fill()
      this.ctx.strokeStyle = '#fff'
      this.ctx.lineWidth = 3
      this.ctx.stroke()

      // Draw F1 label
      this.ctx.fillStyle = '#0f0'
      this.ctx.font = 'bold 24px monospace'
      this.ctx.fillText(`F1: ${F1.freq} Hz`, F1.x - 50, y - 25)
    }

    if (F2) {
      const amplitude = (F2.value / 255) * this.canvas.height
      const y = this.canvas.height - amplitude

      // Draw F2 marker (yellow)
      this.ctx.beginPath()
      this.ctx.arc(F2.x, y, 10, 0, Math.PI * 2)
      this.ctx.fillStyle = 'rgba(255, 255, 50, 0.9)'
      this.ctx.fill()
      this.ctx.strokeStyle = '#fff'
      this.ctx.lineWidth = 3
      this.ctx.stroke()

      // Draw F2 label
      this.ctx.fillStyle = '#ff0'
      this.ctx.font = 'bold 24px monospace'
      this.ctx.fillText(`F2: ${F2.freq} Hz`, F2.x - 50, y - 25)
    }

    // Display detected vowel
    if (detectedVowel) {
      this.ctx.fillStyle = '#fff'
      this.ctx.font = 'bold 72px monospace'
      this.ctx.textAlign = 'center'
      this.ctx.fillText(`"${detectedVowel}"`, this.canvas.width / 2, 90)
      this.ctx.textAlign = 'left'
    }

    // Draw frequency labels
    this.drawEQLabels()
  }

  private drawWaveform() {
    if (!this.analyser) return

    // Get time domain data for waveform
    const bufferLength = this.analyser.fftSize
    const waveformData = new Uint8Array(bufferLength)
    this.analyser.getByteTimeDomainData(waveformData)

    // Clear canvas
    this.ctx.fillStyle = '#000'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw waveform
    this.ctx.lineWidth = 2
    this.ctx.strokeStyle = '#0f0'
    this.ctx.beginPath()

    const sliceWidth = this.canvas.width / bufferLength
    let x = 0

    for (let i = 0; i < bufferLength; i++) {
      const v = waveformData[i] / 128.0
      const y = (v * this.canvas.height) / 2

      if (i === 0) {
        this.ctx.moveTo(x, y)
      } else {
        this.ctx.lineTo(x, y)
      }

      x += sliceWidth
    }

    this.ctx.stroke()

    // Draw center line
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    this.ctx.lineWidth = 1
    this.ctx.beginPath()
    this.ctx.moveTo(0, this.canvas.height / 2)
    this.ctx.lineTo(this.canvas.width, this.canvas.height / 2)
    this.ctx.stroke()
  }

  private amplitudeToColor(amplitude: number): string {
    // Hot colormap: black -> red -> yellow -> white
    const normalized = amplitude / 255

    if (normalized < 0.33) {
      // Black to red
      const r = Math.floor(normalized * 3 * 255)
      return `rgb(${r}, 0, 0)`
    } else if (normalized < 0.66) {
      // Red to yellow
      const g = Math.floor((normalized - 0.33) * 3 * 255)
      return `rgb(255, ${g}, 0)`
    } else {
      // Yellow to white
      const b = Math.floor((normalized - 0.66) * 3 * 255)
      return `rgb(255, 255, ${b})`
    }
  }

  private drawFrequencyLabels() {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    this.ctx.font = '10px monospace'

    // Draw labels at key frequencies
    const frequencies = [0, 500, 1000, 2000, 3000, 4000, 5000]

    for (const freq of frequencies) {
      if (freq > this.maxFrequency) continue

      const y = this.canvas.height * (1 - freq / this.maxFrequency)
      this.ctx.fillText(`${freq}`, 5, y + 3)

      // Draw a subtle line
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      this.ctx.beginPath()
      this.ctx.moveTo(40, y)
      this.ctx.lineTo(this.canvas.width, y)
      this.ctx.stroke()
    }
  }

  private drawEQLabels() {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    this.ctx.font = '10px monospace'

    // Draw labels at key frequencies along the bottom
    const frequencies = [0, 500, 1000, 2000, 3000, 4000, 5000]

    for (const freq of frequencies) {
      if (freq > this.maxFrequency) continue

      const x = (freq / this.maxFrequency) * this.canvas.width
      this.ctx.fillText(`${freq}`, x - 10, this.canvas.height - 5)

      // Draw a subtle line
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.canvas.height - 20)
      this.ctx.stroke()
    }
  }

  private detectVowel(f1: number | undefined, f2: number | undefined): string | null {
    if (!f1 || !f2) return null

    // Typical formant ranges for vowels (approximate, varies by speaker)
    // Based on average adult male formants
    const vowelMap = [
      { vowel: 'ee', f1: 270, f2: 2290, tolerance: 200 },   // beat
      { vowel: 'i', f1: 390, f2: 1990, tolerance: 200 },    // bit
      { vowel: 'eh', f1: 530, f2: 1840, tolerance: 200 },   // bet
      { vowel: 'ae', f1: 660, f2: 1720, tolerance: 250 },   // bat
      { vowel: 'ah', f1: 730, f2: 1090, tolerance: 250 },   // father
      { vowel: 'aw', f1: 570, f2: 840, tolerance: 200 },    // bought
      { vowel: 'oh', f1: 490, f2: 910, tolerance: 200 },    // boat
      { vowel: 'oo', f1: 300, f2: 870, tolerance: 200 },    // boot
      { vowel: 'uh', f1: 520, f2: 1190, tolerance: 250 },   // but
      { vowel: 'er', f1: 490, f2: 1350, tolerance: 200 },   // bird
    ]

    let bestMatch: { vowel: string; distance: number } | null = null

    for (const vowel of vowelMap) {
      // Calculate Euclidean distance in formant space
      const distance = Math.sqrt(
        Math.pow(f1 - vowel.f1, 2) + Math.pow(f2 - vowel.f2, 2)
      )

      // Only consider if within tolerance
      if (distance < vowel.tolerance * 2) {
        if (!bestMatch || distance < bestMatch.distance) {
          bestMatch = { vowel: vowel.vowel, distance }
        }
      }
    }

    return bestMatch ? bestMatch.vowel : null
  }
}

// Initialize the application
const visualizer = new SpectrogramVisualizer('spectrogram')

const startBtn = document.getElementById('startBtn') as HTMLButtonElement
const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement
const displayStyleSelect = document.getElementById('displayStyle') as HTMLSelectElement
const fftSizeSelect = document.getElementById('fftSize') as HTMLSelectElement
const maxFreqSlider = document.getElementById('maxFreq') as HTMLInputElement
const maxFreqValue = document.getElementById('maxFreqValue') as HTMLSpanElement

startBtn.addEventListener('click', async () => {
  const success = await visualizer.start()
  if (success) {
    startBtn.disabled = true
    stopBtn.disabled = false
  }
})

stopBtn.addEventListener('click', () => {
  visualizer.stop()
  startBtn.disabled = false
  stopBtn.disabled = true
})

displayStyleSelect.addEventListener('change', () => {
  const style = displayStyleSelect.value as DisplayStyle
  visualizer.setDisplayStyle(style)
})

fftSizeSelect.addEventListener('change', () => {
  const size = parseInt(fftSizeSelect.value)
  visualizer.setFFTSize(size)
})

maxFreqSlider.addEventListener('input', () => {
  const freq = parseInt(maxFreqSlider.value)
  visualizer.setMaxFrequency(freq)
  maxFreqValue.textContent = `${freq} Hz`
})
