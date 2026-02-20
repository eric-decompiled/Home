import "./style.css";

// Sync theme from main site's localStorage or system preference (disable transitions during init)
document.documentElement.classList.add('theme-loading');
const storedTheme = localStorage.getItem('decompiled-theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const isLight = storedTheme ? storedTheme === 'light' : !prefersDark;
if (isLight) {
  document.body.classList.add('light-mode');
}
requestAnimationFrame(() => document.documentElement.classList.remove('theme-loading'));

// Set up the UI
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <div class="container">
    <div class="sidebar left">
      <div class="info">
        <div class="info-header">
          <h2>Lissajous Curves</h2>
          <button class="info-btn" id="infoBtn" title="Learn more">i</button>
        </div>
        <p>Select a musical interval to see its visual pattern. Simple ratios like the Perfect Fifth (3:2) create elegant curves, while complex intervals produce intricate patterns.</p>
              </div>

      <div class="presets">
        <h3>Intervals</h3>
        <div class="preset-grid">
          <button class="preset-btn" data-preset="unison">Unison (1:1)</button>
          <button class="preset-btn" data-preset="minor2nd">m2 (16:15)</button>
          <button class="preset-btn" data-preset="major2nd">M2 (9:8)</button>
          <button class="preset-btn" data-preset="minor3rd">m3 (6:5)</button>
          <button class="preset-btn" data-preset="major3rd">M3 (5:4)</button>
          <button class="preset-btn" data-preset="perfect4th">P4 (4:3)</button>
          <button class="preset-btn" data-preset="tritone">TT (7:5)</button>
          <button class="preset-btn active" data-preset="perfect5th">P5 (3:2)</button>
          <button class="preset-btn" data-preset="minor6th">m6 (8:5)</button>
          <button class="preset-btn" data-preset="major6th">M6 (5:3)</button>
          <button class="preset-btn" data-preset="minor7th">m7 (9:5)</button>
          <button class="preset-btn" data-preset="major7th">M7 (15:8)</button>
          <button class="preset-btn" data-preset="octave">Oct (2:1)</button>
          <button id="playSound" class="preset-btn listen-btn" title="Play Interval">▶ Listen</button>
        </div>
        <div class="sound-options">
          <label><input type="radio" name="sound" value="synth" checked> Synth</label>
          <label><input type="radio" name="sound" value="piano"> E. Piano</label>
          <label><input type="radio" name="sound" value="organ"> Pad</label>
          <label><input type="radio" name="sound" value="bell"> Bell</label>
        </div>
      </div>
    </div>

    <canvas id="canvas"></canvas>

    <div class="sidebar right">
      <div class="controls">
        <div class="control-section">
          <h4 class="section-label">Frequency Ratio</h4>
          <div class="control-group">
            <label>X: <span id="freqXValue">3</span></label>
            <input type="range" id="freqX" min="1" max="32" value="3" step="1">
          </div>
          <div class="control-group">
            <label>Y: <span id="freqYValue">2</span></label>
            <input type="range" id="freqY" min="1" max="32" value="2" step="1">
          </div>
        </div>

        <div class="control-section">
          <h4 class="section-label">Animation</h4>
          <div class="control-group">
            <label>Phase: <span id="phaseValue">1.57</span></label>
            <input type="range" id="phase" min="0" max="6.28" value="1.57" step="0.01" disabled>
          </div>
          <div class="control-group">
            <label>Speed: <span id="speedValue">1.00x</span></label>
            <input type="range" id="speed" min="0" max="50" value="25" step="1">
          </div>
          <div class="control-group">
            <label>Sweep: <span id="sweepSpeedValue">1.00x</span></label>
            <input type="range" id="sweepSpeed" min="0" max="50" value="25" step="0.5">
          </div>
        </div>

        <div class="control-section">
          <h4 class="section-label">Effects</h4>
          <div class="toggle-row">
            <span class="toggle-label">Animate</span>
            <button id="phaseSweep" class="toggle-btn active" title="Toggle phase animation">
              <span class="toggle-indicator"></span>
            </button>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Glow Trail</span>
            <button id="trailToggle" class="toggle-btn active" title="Toggle glow trail">
              <span class="toggle-indicator"></span>
            </button>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Curve Glow</span>
            <button id="curveGlowToggle" class="toggle-btn active" title="Toggle curve glow">
              <span class="toggle-indicator"></span>
            </button>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Feedback</span>
            <button id="feedbackToggle" class="toggle-btn" title="Toggle feedback echo effect">
              <span class="toggle-indicator"></span>
            </button>
          </div>
        </div>

        <div class="theme-row">
          <span class="theme-label">Theme</span>
          <div class="theme-controls">
            <span class="theme-icon">🌙</span>
            <button class="theme-toggle" title="Toggle light/dark mode"></button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="modal-overlay" id="infoModal">
    <div class="modal">
      <button class="modal-close" id="modalClose">&times;</button>
      <h2>About Lissajous Curves</h2>

      <h3>What Are They?</h3>
      <p>Lissajous curves (also called Bowditch curves) are the patterns traced when two perpendicular oscillations are combined. Mathematically, they're described by:</p>
      <code>x = A sin(at + δ), y = B sin(bt)</code>
      <p>The ratio <strong>a:b</strong> determines the curve's shape, while the phase shift <strong>δ</strong> controls its orientation.</p>

      <h3>History</h3>
      <p>First studied by Nathaniel Bowditch in 1815, these curves were later explored extensively by French physicist Jules Antoine Lissajous in 1857. He created an elegant apparatus using tuning forks and mirrors to project the patterns onto a screen, demonstrating the visual relationship between sound frequencies.</p>

      <h3>Music Connection</h3>
      <p>The frequency ratios that produce pleasing musical intervals also create the most elegant visual patterns. The Perfect Fifth (3:2) and Perfect Fourth (4:3) form simple, closed curves. The Octave (2:1) traces a figure-eight. Dissonant intervals like the Minor Second (16:15) create dense, complex patterns that never quite close.</p>

      <h3>Just Intonation</h3>
      <p>This app uses <em>just intonation</em> ratios rather than the equal temperament found on modern pianos. In just intonation, intervals are defined by simple whole-number ratios, producing pure, beatless harmonies—and the cleanest Lissajous patterns.</p>
    </div>
  </div>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const ctx = canvas.getContext("2d")!;

// Feedback effect canvases
const feedbackCanvas = document.createElement('canvas');
const feedbackCtx = feedbackCanvas.getContext('2d')!;
const tempCanvas = document.createElement('canvas');
const tempCtx = tempCanvas.getContext('2d')!;
// Content canvas for drawing curve/particle without background
const contentCanvas = document.createElement('canvas');
const contentCtx = contentCanvas.getContext('2d')!;

// Feedback parameters
const feedbackDecay = 0.92;
const feedbackZoom = 1.006;
const feedbackRotation = 0.002;

// Helper to get CSS variable value
function getCSSVar(name: string): string {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

// Responsive canvas sizing
function getCanvasSize() {
  const maxWidth = Math.min(800, window.innerWidth - 40);
  const aspectRatio = 4 / 3;
  const width = maxWidth;
  const height = width / aspectRatio;
  return { width, height };
}

function resizeCanvas() {
  const { width, height } = getCanvasSize();
  canvas.width = width;
  canvas.height = height;
  // Update center and amplitude based on new size
  centerX = width / 2;
  centerY = height / 2;
  amplitude = Math.min(width, height) * 0.33;

  // Resize feedback canvases
  feedbackCanvas.width = width;
  feedbackCanvas.height = height;
  tempCanvas.width = width;
  tempCanvas.height = height;
  contentCanvas.width = width;
  contentCanvas.height = height;
  // Clear feedback on resize
  feedbackCtx.clearRect(0, 0, width, height);
}

// Set initial canvas size
let centerX = 400;
let centerY = 300;
let amplitude = 200;
resizeCanvas();

// Handle window resize
window.addEventListener("resize", resizeCanvas);

// Get controls
const freqXSlider = document.querySelector<HTMLInputElement>("#freqX")!;
const freqYSlider = document.querySelector<HTMLInputElement>("#freqY")!;
const phaseSlider = document.querySelector<HTMLInputElement>("#phase")!;
const speedSlider = document.querySelector<HTMLInputElement>("#speed")!;
const sweepSpeedSlider =
  document.querySelector<HTMLInputElement>("#sweepSpeed")!;
const phaseSweepButton =
  document.querySelector<HTMLButtonElement>("#phaseSweep")!;
const playButton = document.querySelector<HTMLButtonElement>("#playSound")!;

const freqXValue = document.querySelector<HTMLSpanElement>("#freqXValue")!;
const freqYValue = document.querySelector<HTMLSpanElement>("#freqYValue")!;
const phaseValue = document.querySelector<HTMLSpanElement>("#phaseValue")!;
const speedValue = document.querySelector<HTMLSpanElement>("#speedValue")!;
const sweepSpeedValue =
  document.querySelector<HTMLSpanElement>("#sweepSpeedValue")!;

// Audio setup
let audioContext: AudioContext | null = null;
let soundType: 'piano' | 'synth' | 'organ' | 'bell' = 'synth';

function initAudio() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

// Sound type radio button handler
document.querySelectorAll('input[name="sound"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    soundType = (e.target as HTMLInputElement).value as typeof soundType;
  });
});

// Electric Piano (Rhodes-style): warm tine sound with bell-like attack
function playPianoNote(audio: AudioContext, freq: number, startTime: number, duration: number, volume: number) {
  const masterGain = audio.createGain();
  masterGain.connect(audio.destination);
  masterGain.gain.value = volume * 0.5;

  // Main tone: fundamental with slight detune for warmth
  const fundamental = audio.createOscillator();
  const fundGain = audio.createGain();
  fundamental.type = 'sine';
  fundamental.frequency.value = freq;
  fundamental.connect(fundGain);
  fundGain.connect(masterGain);

  // Second partial slightly detuned
  const partial2 = audio.createOscillator();
  const partial2Gain = audio.createGain();
  partial2.type = 'sine';
  partial2.frequency.value = freq * 2.001; // Slight inharmonicity
  partial2.connect(partial2Gain);
  partial2Gain.connect(masterGain);

  // Bell/tine component: higher frequency that decays quickly
  const tine = audio.createOscillator();
  const tineGain = audio.createGain();
  tine.type = 'sine';
  tine.frequency.value = freq * 3.5; // Inharmonic for bell character
  tine.connect(tineGain);
  tineGain.connect(masterGain);

  // Sub-octave for warmth
  const sub = audio.createOscillator();
  const subGain = audio.createGain();
  sub.type = 'sine';
  sub.frequency.value = freq * 0.5;
  sub.connect(subGain);
  subGain.connect(masterGain);

  // Envelope for fundamental - slow decay, warm sustain
  fundGain.gain.setValueAtTime(0, startTime);
  fundGain.gain.linearRampToValueAtTime(0.7, startTime + 0.005);
  fundGain.gain.exponentialRampToValueAtTime(0.4, startTime + 0.3);
  fundGain.gain.exponentialRampToValueAtTime(0.2, startTime + duration * 0.7);
  fundGain.gain.linearRampToValueAtTime(0.001, startTime + duration);

  // Envelope for 2nd partial - slightly faster decay
  partial2Gain.gain.setValueAtTime(0, startTime);
  partial2Gain.gain.linearRampToValueAtTime(0.3, startTime + 0.005);
  partial2Gain.gain.exponentialRampToValueAtTime(0.1, startTime + 0.2);
  partial2Gain.gain.exponentialRampToValueAtTime(0.05, startTime + duration * 0.5);
  partial2Gain.gain.linearRampToValueAtTime(0.001, startTime + duration);

  // Envelope for tine - fast attack, quick decay (bell character)
  tineGain.gain.setValueAtTime(0, startTime);
  tineGain.gain.linearRampToValueAtTime(0.25, startTime + 0.002);
  tineGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
  tineGain.gain.linearRampToValueAtTime(0.001, startTime + 0.3);

  // Envelope for sub - gentle presence
  subGain.gain.setValueAtTime(0, startTime);
  subGain.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
  subGain.gain.exponentialRampToValueAtTime(0.08, startTime + 0.4);
  subGain.gain.linearRampToValueAtTime(0.001, startTime + duration);

  // Start and stop all oscillators
  [fundamental, partial2, tine, sub].forEach(osc => {
    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}

// Warm synth: 3 detuned sawtooth oscillators for thick, chorused sound
function playWarmSynthNote(audio: AudioContext, freq: number, startTime: number, duration: number, volume: number) {
  const masterGain = audio.createGain();
  masterGain.connect(audio.destination);
  masterGain.gain.value = volume * 0.3;

  const detuneCents = [-5, 0, 5];
  const oscillators: OscillatorNode[] = [];

  detuneCents.forEach(detune => {
    const osc = audio.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    osc.connect(masterGain);
    oscillators.push(osc);
  });

  // Slow attack, long sustain envelope
  const attack = 0.1;
  const sustain = 0.4;
  const release = 0.5;

  masterGain.gain.setValueAtTime(0, startTime);
  masterGain.gain.linearRampToValueAtTime(volume * 0.3, startTime + attack);
  masterGain.gain.setValueAtTime(volume * 0.3 * sustain, startTime + duration - release);
  masterGain.gain.linearRampToValueAtTime(0.001, startTime + duration);

  oscillators.forEach(osc => {
    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}

// Soft Pad: warm, gentle sustained sound with slow attack
function playOrganNote(audio: AudioContext, freq: number, startTime: number, duration: number, volume: number) {
  const masterGain = audio.createGain();
  masterGain.connect(audio.destination);

  // Layer 1: Two detuned triangle waves for warmth
  const tri1 = audio.createOscillator();
  const tri2 = audio.createOscillator();
  tri1.type = 'triangle';
  tri2.type = 'triangle';
  tri1.frequency.value = freq;
  tri2.frequency.value = freq;
  tri1.detune.value = -8;
  tri2.detune.value = 8;

  const triGain = audio.createGain();
  tri1.connect(triGain);
  tri2.connect(triGain);
  triGain.connect(masterGain);
  triGain.gain.value = 0.4;

  // Layer 2: Soft sine an octave below for body
  const sub = audio.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = freq * 0.5;
  const subGain = audio.createGain();
  sub.connect(subGain);
  subGain.connect(masterGain);
  subGain.gain.value = 0.25;

  // Layer 3: Gentle fifth above for shimmer
  const fifth = audio.createOscillator();
  fifth.type = 'sine';
  fifth.frequency.value = freq * 1.5;
  const fifthGain = audio.createGain();
  fifth.connect(fifthGain);
  fifthGain.connect(masterGain);
  fifthGain.gain.value = 0.1;

  // Soft pad envelope: slow attack, full sustain, gentle release
  const attack = 0.15;
  const release = 0.3;

  masterGain.gain.setValueAtTime(0, startTime);
  masterGain.gain.linearRampToValueAtTime(volume * 0.35, startTime + attack);
  masterGain.gain.setValueAtTime(volume * 0.35, startTime + duration - release);
  masterGain.gain.linearRampToValueAtTime(0.001, startTime + duration);

  [tri1, tri2, sub, fifth].forEach(osc => {
    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}

// Bell/Vibraphone: tuned bar percussion with warm shimmer
function playBellNote(audio: AudioContext, freq: number, startTime: number, duration: number, volume: number) {
  const masterGain = audio.createGain();
  masterGain.connect(audio.destination);
  masterGain.gain.value = volume * 0.4;

  // Vibraphone-style partials: fundamental + harmonics with slight inharmonicity
  const partials = [
    { ratio: 1, amp: 1.0, decay: 1.0 },      // Fundamental
    { ratio: 2.76, amp: 0.4, decay: 0.7 },   // Slightly sharp 2nd partial (characteristic of bars)
    { ratio: 5.4, amp: 0.2, decay: 0.5 },    // Higher partial
    { ratio: 8.9, amp: 0.1, decay: 0.3 },    // Shimmer
  ];

  partials.forEach(({ ratio, amp, decay }) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq * ratio;
    osc.connect(gain);
    gain.connect(masterGain);

    // Each partial has its own decay envelope
    const partialDuration = duration * decay;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(amp, startTime + 0.003);
    gain.gain.exponentialRampToValueAtTime(amp * 0.3, startTime + partialDuration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + partialDuration);

    osc.start(startTime);
    osc.stop(startTime + duration);
  });

  // Add a soft sub-octave for warmth
  const sub = audio.createOscillator();
  const subGain = audio.createGain();
  sub.type = 'sine';
  sub.frequency.value = freq * 0.5;
  sub.connect(subGain);
  subGain.connect(masterGain);

  subGain.gain.setValueAtTime(0, startTime);
  subGain.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
  subGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.6);

  sub.start(startTime);
  sub.stop(startTime + duration);
}

// Play a note with the selected sound type
function playNote(audio: AudioContext, freq: number, startTime: number, duration: number, volume: number) {
  switch (soundType) {
    case 'piano':
      playPianoNote(audio, freq, startTime, duration, volume);
      break;
    case 'synth':
      playWarmSynthNote(audio, freq, startTime, duration, volume);
      break;
    case 'organ':
      playOrganNote(audio, freq, startTime, duration, volume);
      break;
    case 'bell':
      playBellNote(audio, freq, startTime, duration, volume);
      break;
  }
}

function playInterval() {
  const audio = initAudio();

  // CRITICAL FOR iOS: resume() must be called synchronously in the user gesture handler
  if (audio.state === 'suspended') {
    audio.resume();
  }

  const now = audio.currentTime;

  // Base frequency (C3 = 130.81 Hz, a warm, rich tone)
  const baseFreq = 130.81;

  // Calculate the two frequencies based on the ratio
  let freq1 = baseFreq * freqY; // Lower note
  let freq2 = baseFreq * freqX; // Higher note

  // If the higher frequency is too shrill (above ~1200 Hz), bring both down an octave
  while (freq2 > 1200) {
    freq1 /= 2;
    freq2 /= 2;
  }

  // Timing for the sequence: solo lower, solo upper, then together
  const soloNoteDuration = 0.5;
  const gap = 0.1;
  const togetherDuration = 2.0;
  const totalDuration = soloNoteDuration + gap + soloNoteDuration + gap + togetherDuration;

  // Schedule lower note solo
  const t1Start = now;
  playNote(audio, freq1, t1Start, soloNoteDuration, 0.6);

  // Schedule upper note solo
  const t2Start = t1Start + soloNoteDuration + gap;
  playNote(audio, freq2, t2Start, soloNoteDuration, 0.6);

  // Schedule both notes together
  const t3Start = t2Start + soloNoteDuration + gap;
  playNote(audio, freq1, t3Start, togetherDuration, 0.5);
  playNote(audio, freq2, t3Start, togetherDuration, 0.5);

  // Update button state
  playButton.disabled = true;
  playButton.classList.add("playing");
  playButton.textContent = "♪ Playing";

  setTimeout(() => {
    playButton.disabled = false;
    playButton.classList.remove("playing");
    playButton.textContent = "▶ Listen";
  }, totalDuration * 1000);
}

// Play button handler
playButton.addEventListener("click", playInterval);

// Convert slider value (0-50) to logarithmic speed
// At 0: 0.1x (slowest)
// At 25: 1x (normal)
// At 50: 10x (fastest)
function sliderToSpeed(sliderValue: number): number {
  // Logarithmic scale: speed = 0.001 * 10^(sliderValue/25)
  // This gives us: 0.001 at value=0, 0.01 at value=25, 0.1 at value=50
  const speed = 0.001 * Math.pow(10, sliderValue / 25);
  return speed;
}

// Convert speed back to slider value (for presets)
function speedToSlider(speed: number): number {
  if (speed <= 0.001) return 0;
  // Inverse: sliderValue = 25 * log10(speed/0.001)
  return 25 * Math.log10(speed / 0.001);
}

// Lissajous parameters - Start with Perfect 5th (3:2)
let freqX = 3;
let freqY = 2;
let phase = Math.PI / 2;
let speed = 0.01; // Base speed value (corresponds to 1x at slider value 25)
let sweepSpeed = 0.01; // 1x sweep speed (corresponds to 1x at slider value 25)

// Base speed for 1x display
const baseSpeed = 0.01;
let phaseSweepEnabled = true;
let trailEnabled = true;
let curveGlowEnabled = true;
let feedbackEnabled = false;

// Animation variables
let t = 0;

// Preset configurations - All chromatic intervals (just intonation)
// Phase shifts optimized to maximize visual clarity and avoid aliasing
const presets = {
  unison: { freqX: 1, freqY: 1, phase: Math.PI / 2 }, // 1:1 - Unison (Perfect circle)
  minor2nd: { freqX: 16, freqY: 15, phase: Math.PI / 4 }, // 16:15 - Minor 2nd (~0.785)
  major2nd: { freqX: 9, freqY: 8, phase: Math.PI / 4 + Math.PI / 32 }, // 9:8 - Major 2nd (~0.883)
  minor3rd: { freqX: 6, freqY: 5, phase: Math.PI / 2 - Math.PI / 11 }, // 6:5 - Minor 3rd (~1.285)
  major3rd: { freqX: 5, freqY: 4, phase: Math.PI / 4 - Math.PI / 48 }, // 5:4 - Major 3rd (~0.720)
  perfect4th: { freqX: 4, freqY: 3, phase: Math.PI / 3 + Math.PI / 48 }, // 4:3 - Perfect 4th (~1.112)
  tritone: { freqX: 7, freqY: 5, phase: Math.PI / 3 - Math.PI / 24 }, // 7:5 - Tritone (~0.916)
  perfect5th: { freqX: 3, freqY: 2, phase: Math.PI / 2 }, // 3:2 - Perfect 5th
  minor6th: { freqX: 8, freqY: 5, phase: Math.PI / 5 }, // 8:5 - Minor 6th (~0.628)
  major6th: { freqX: 5, freqY: 3, phase: Math.PI / 5 - Math.PI / 64 }, // 5:3 - Major 6th (~0.579)
  minor7th: { freqX: 9, freqY: 5, phase: Math.PI / 5 + Math.PI / 32 }, // 9:5 - Minor 7th (~0.726)
  major7th: { freqX: 15, freqY: 8, phase: Math.PI / 4 + Math.PI / 48 }, // 15:8 - Major 7th (~0.850)
  octave: { freqX: 2, freqY: 1, phase: 0 }, // 2:1 - Octave (figure 8)
};

// Update slider progress fill
function updateSliderProgress(slider: HTMLInputElement) {
  const min = parseFloat(slider.min);
  const max = parseFloat(slider.max);
  const value = parseFloat(slider.value);
  const progress = (value - min) / (max - min);
  slider.style.setProperty('--progress', progress.toString());
}

// Update all slider progress fills
function updateAllSliderProgress() {
  [freqXSlider, freqYSlider, phaseSlider, speedSlider, sweepSpeedSlider].forEach(updateSliderProgress);
}

// Function to update sliders
function updateSliders() {
  freqXSlider.value = freqX.toString();
  freqYSlider.value = freqY.toString();
  phaseSlider.value = phase.toString();
  speedSlider.value = speedToSlider(speed).toString();
  sweepSpeedSlider.value = speedToSlider(sweepSpeed).toString();

  freqXValue.textContent = freqX.toFixed(0);
  freqYValue.textContent = freqY.toFixed(0);
  phaseValue.textContent = phase.toFixed(2);

  // Format speed display
  const speedMultiplier = speed / baseSpeed;
  speedValue.textContent = speedMultiplier.toFixed(2) + "x";

  const sweepMultiplier = sweepSpeed / baseSpeed;
  sweepSpeedValue.textContent = sweepMultiplier.toFixed(2) + "x";

  // Update progress fills
  updateAllSliderProgress();
}

// Preset button handlers
document.querySelectorAll(".preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const presetName = (btn as HTMLElement).dataset.preset as keyof typeof presets;
    // Skip if this is the listen button (no preset data)
    if (!presetName) return;

    // Update active state
    document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const preset = presets[presetName];

    freqX = preset.freqX;
    freqY = preset.freqY;
    phase = preset.phase;
    t = 0; // Reset animation

    updateSliders();

    // Auto-play the interval
    if (!playButton.disabled) {
      playInterval();
    }
  });
});

// Update controls
freqXSlider.addEventListener("input", (e) => {
  const slider = e.target as HTMLInputElement;
  freqX = Math.round(parseFloat(slider.value));
  freqXValue.textContent = freqX.toFixed(0);
  updateSliderProgress(slider);
});

freqYSlider.addEventListener("input", (e) => {
  const slider = e.target as HTMLInputElement;
  freqY = Math.round(parseFloat(slider.value));
  freqYValue.textContent = freqY.toFixed(0);
  updateSliderProgress(slider);
});

phaseSlider.addEventListener("input", (e) => {
  const slider = e.target as HTMLInputElement;
  phase = parseFloat(slider.value);
  phaseValue.textContent = phase.toFixed(2);
  updateSliderProgress(slider);
});

speedSlider.addEventListener("input", (e) => {
  const slider = e.target as HTMLInputElement;
  const sliderValue = parseFloat(slider.value);
  speed = sliderToSpeed(sliderValue);
  const speedMultiplier = speed / baseSpeed;
  speedValue.textContent = speedMultiplier.toFixed(2) + "x";
  updateSliderProgress(slider);
});

sweepSpeedSlider.addEventListener("input", (e) => {
  const slider = e.target as HTMLInputElement;
  const sliderValue = parseFloat(slider.value);
  sweepSpeed = sliderToSpeed(sliderValue);
  const sweepMultiplier = sweepSpeed / baseSpeed;
  sweepSpeedValue.textContent = sweepMultiplier.toFixed(2) + "x";
  updateSliderProgress(slider);
});

phaseSweepButton.addEventListener("click", () => {
  phaseSweepEnabled = !phaseSweepEnabled;

  // Update button style
  phaseSweepButton.classList.toggle("active", phaseSweepEnabled);

  // Disable manual phase control when sweep is enabled
  phaseSlider.disabled = phaseSweepEnabled;
});

const trailToggleButton = document.querySelector<HTMLButtonElement>("#trailToggle")!;
trailToggleButton.addEventListener("click", () => {
  trailEnabled = !trailEnabled;
  trailToggleButton.classList.toggle("active", trailEnabled);

  // Clear trail when disabled
  if (!trailEnabled) {
    trail.length = 0;
  }
});

const curveGlowToggleButton = document.querySelector<HTMLButtonElement>("#curveGlowToggle")!;
curveGlowToggleButton.addEventListener("click", () => {
  curveGlowEnabled = !curveGlowEnabled;
  curveGlowToggleButton.classList.toggle("active", curveGlowEnabled);
});

const feedbackToggleButton = document.querySelector<HTMLButtonElement>("#feedbackToggle")!;
feedbackToggleButton.addEventListener("click", () => {
  feedbackEnabled = !feedbackEnabled;
  feedbackToggleButton.classList.toggle("active", feedbackEnabled);

  // Clear feedback buffer when disabled
  if (!feedbackEnabled) {
    feedbackCtx.clearRect(0, 0, canvas.width, canvas.height);
  }
});

// Trail history for glowing effect
const trailLength = 60;
const trail: { x: number; y: number }[] = [];

// Animation loop
function animate() {
  // Update phase if sweep is enabled
  if (phaseSweepEnabled) {
    phase += sweepSpeed;
    // Loop back to 0 when reaching 2π
    if (phase > Math.PI * 2) {
      phase = 0;
    }
    // Update slider and display
    phaseSlider.value = phase.toString();
    phaseValue.textContent = phase.toFixed(2);
    updateSliderProgress(phaseSlider);
  }

  // Get theme colors from CSS variables
  const canvasBg = getCSSVar('--canvas-bg');
  const canvasCurve = getCSSVar('--canvas-curve');
  const accentPrimary = getCSSVar('--accent-primary');

  const w = canvas.width;
  const h = canvas.height;

  // Clear content canvas (transparent)
  contentCtx.clearRect(0, 0, w, h);

  // Draw the curve to content canvas (with optional glow)
  if (curveGlowEnabled) {
    contentCtx.shadowBlur = 10;
    contentCtx.shadowColor = accentPrimary;
  }
  contentCtx.strokeStyle = canvasCurve;
  contentCtx.lineWidth = 2;
  contentCtx.beginPath();

  for (let i = 0; i < 1000; i++) {
    const angle = (i / 1000) * Math.PI * 2;
    const x = centerX + amplitude * Math.sin(freqX * angle + phase);
    const y = centerY + amplitude * Math.sin(freqY * angle);

    if (i === 0) {
      contentCtx.moveTo(x, y);
    } else {
      contentCtx.lineTo(x, y);
    }
  }
  contentCtx.stroke();
  contentCtx.shadowBlur = 0;

  // Calculate current position
  const x = centerX + amplitude * Math.sin(freqX * t + phase);
  const y = centerY + amplitude * Math.sin(freqY * t);

  // Update and draw trail if enabled
  if (trailEnabled) {
    trail.unshift({ x, y });
    if (trail.length > trailLength) {
      trail.pop();
    }

    // Draw glowing trail with gradient
    const isLightMode = document.body.classList.contains('light-mode');
    for (let i = trail.length - 1; i >= 0; i--) {
      const point = trail[i];
      const progress = 1 - i / trailLength;
      const alpha = progress * 0.8;
      const size = 4 + progress * 6;

      // Gradient from accent secondary to primary along trail
      // Dark: e94560 -> 16c79a, Light: c94b4b -> d4763a
      let r, g, b;
      if (isLightMode) {
        r = Math.round(201 + (212 - 201) * progress); // c94b4b -> d4763a
        g = Math.round(75 + (118 - 75) * progress);
        b = Math.round(75 + (58 - 75) * progress);
      } else {
        r = Math.round(233 + (22 - 233) * progress); // e94560 -> 16c79a
        g = Math.round(69 + (199 - 69) * progress);
        b = Math.round(96 + (154 - 96) * progress);
      }

      contentCtx.beginPath();
      contentCtx.arc(point.x, point.y, size, 0, Math.PI * 2);
      contentCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      contentCtx.fill();
    }
  }

  // Draw the main moving point with glow
  contentCtx.shadowBlur = 25;
  contentCtx.shadowColor = accentPrimary;
  contentCtx.fillStyle = accentPrimary;
  contentCtx.beginPath();
  contentCtx.arc(x, y, 10, 0, Math.PI * 2);
  contentCtx.fill();

  // Inner bright core
  contentCtx.shadowBlur = 0;
  contentCtx.fillStyle = '#ffffff';
  contentCtx.beginPath();
  contentCtx.arc(x, y, 4, 0, Math.PI * 2);
  contentCtx.fill();

  // Clear main canvas with background
  ctx.fillStyle = canvasBg;
  ctx.fillRect(0, 0, w, h);

  // Apply feedback effect if enabled
  if (feedbackEnabled) {
    const cx = w / 2;
    const cy = h / 2;
    const isLightMode = document.body.classList.contains('light-mode');

    // Save current feedback to temp canvas
    tempCtx.clearRect(0, 0, w, h);
    tempCtx.drawImage(feedbackCanvas, 0, 0);

    // Clear feedback buffer
    feedbackCtx.clearRect(0, 0, w, h);

    // Draw old feedback with decay, zoom, and rotation
    feedbackCtx.save();
    feedbackCtx.globalAlpha = feedbackDecay;
    feedbackCtx.translate(cx, cy);
    feedbackCtx.rotate(feedbackRotation);
    feedbackCtx.scale(feedbackZoom, feedbackZoom);
    feedbackCtx.translate(-cx, -cy);
    feedbackCtx.drawImage(tempCanvas, 0, 0);
    feedbackCtx.restore();
    feedbackCtx.globalAlpha = 1;

    // Add current content frame to feedback
    // Light mode: use source-over to accumulate dark trails
    // Dark mode: use lighter to accumulate bright trails
    feedbackCtx.globalCompositeOperation = isLightMode ? 'source-over' : 'lighter';
    feedbackCtx.globalAlpha = isLightMode ? 0.7 : 0.6;
    feedbackCtx.drawImage(contentCanvas, 0, 0);
    feedbackCtx.globalAlpha = 1;
    feedbackCtx.globalCompositeOperation = 'source-over';

    // Draw feedback to main canvas
    // Light mode: multiply darkens the background
    // Dark mode: lighter brightens the background
    ctx.globalCompositeOperation = isLightMode ? 'multiply' : 'lighter';
    ctx.globalAlpha = isLightMode ? 0.85 : 0.5;
    ctx.drawImage(feedbackCanvas, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // Draw current content on top
  ctx.drawImage(contentCanvas, 0, 0);

  // Update time
  t += speed;

  // Request next frame
  requestAnimationFrame(animate);
}

// Initialize slider progress fills
updateAllSliderProgress();

// Info modal
const infoBtn = document.querySelector<HTMLButtonElement>('#infoBtn')!;
const infoModal = document.querySelector<HTMLDivElement>('#infoModal')!;
const modalClose = document.querySelector<HTMLButtonElement>('#modalClose')!;

infoBtn.addEventListener('click', () => {
  infoModal.classList.add('open');
});

modalClose.addEventListener('click', () => {
  infoModal.classList.remove('open');
});

infoModal.addEventListener('click', (e) => {
  if (e.target === infoModal) {
    infoModal.classList.remove('open');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && infoModal.classList.contains('open')) {
    infoModal.classList.remove('open');
  }

  // Spacebar to play interval (but not if typing in an input, modal is open, or already playing)
  if (e.code === 'Space' && e.target === document.body && !infoModal.classList.contains('open')) {
    e.preventDefault();
    if (!playButton.disabled && !playButton.classList.contains('playing')) {
      playInterval();
    }
  }
});

// Theme toggle
const THEME_KEY = 'decompiled-theme';
const themeToggle = document.querySelector<HTMLButtonElement>('.theme-toggle')!;
const themeIcon = document.querySelector<HTMLSpanElement>('.theme-icon')!;

function updateThemeIcon() {
  const isLight = document.body.classList.contains('light-mode');
  themeIcon.textContent = isLight ? '☀️' : '🌙';
}

// Initialize icon
updateThemeIcon();

themeToggle.addEventListener('click', () => {
  const isCurrentlyLight = document.body.classList.contains('light-mode');
  const newTheme = isCurrentlyLight ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, newTheme);
  document.body.classList.toggle('light-mode', !isCurrentlyLight);
  updateThemeIcon();
});

// Start animation
animate();
