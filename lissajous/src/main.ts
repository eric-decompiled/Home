import "./style.css";

// Set up the UI
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <div class="container">
    <div class="sidebar left">
      <div class="info">
        <h2>Lissajous Curves</h2>
        <p>When two oscillations move at right angles to each other, they trace out these patterns. The magic lies in their frequency ratio:</p>
        <p>A <strong>3:2</strong> ratio (perfect fifth) means x completes 3 cycles while y completes 2. For example if x is determined by a sine wave tuned to C and the y by one tuned to G the P5 pattern will emerge. More dissonant intervals create more complex patterns</p>
        <p style="font-size: 11px; color: #888; margin-top: 15px;"><em>Tip: Enable "Auto Sweep Phase" animate the pattern through all of its possible orientations.</em></p>
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
        <button id="phaseSweep" class="play-btn sweep-enabled">Enable Auto Sweep</button>
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
        </div>
        <div class="control-group">
          <label>Animation Speed: <span id="speedValue">1.00x</span></label>
          <input type="range" id="speed" min="0" max="50" value="25" step="1">
        </div>
        <div class="control-group">
          <label>Sweep Speed: <span id="sweepSpeedValue">1.00x</span></label>
          <input type="range" id="sweepSpeed" min="0" max="50" value="25" step="0.5">
        </div>
      </div>
    </div>
  </div>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const ctx = canvas.getContext("2d")!;

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

function initAudio() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function playInterval() {
  const audio = initAudio();

  // CRITICAL FOR iOS: resume() must be called synchronously in the user gesture handler
  // Do not await here - just call it and let it resolve
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
  // This keeps the ratio intact while making it more pleasant to listen to
  while (freq2 > 1200) {
    freq1 /= 2;
    freq2 /= 2;
  }

  // Timing for the sequence: solo lower, solo upper, then together
  const soloNoteDuration = 0.4;
  const gap = 0.1;
  const togetherDuration = 2.0;
  const totalDuration =
    soloNoteDuration + gap + soloNoteDuration + gap + togetherDuration;

  // Create oscillators for the sequence
  // First: lower note solo
  const osc1Solo = audio.createOscillator();
  const gain1Solo = audio.createGain();
  osc1Solo.type = "sine";
  osc1Solo.frequency.value = freq1;
  osc1Solo.connect(gain1Solo);
  gain1Solo.connect(audio.destination);

  // Second: upper note solo
  const osc2Solo = audio.createOscillator();
  const gain2Solo = audio.createGain();
  osc2Solo.type = "sine";
  osc2Solo.frequency.value = freq2;
  osc2Solo.connect(gain2Solo);
  gain2Solo.connect(audio.destination);

  // Third: both together
  const osc1Together = audio.createOscillator();
  const osc2Together = audio.createOscillator();
  const gain1Together = audio.createGain();
  const gain2Together = audio.createGain();
  const masterGain = audio.createGain();

  osc1Together.type = "sine";
  osc2Together.type = "sine";
  osc1Together.frequency.value = freq1;
  osc2Together.frequency.value = freq2;

  osc1Together.connect(gain1Together);
  osc2Together.connect(gain2Together);
  gain1Together.connect(masterGain);
  gain2Together.connect(masterGain);
  masterGain.connect(audio.destination);

  // ADSR parameters
  const attackTime = 0.05;
  const decayTime = 0.1;
  const sustainLevel = 0.25;
  const releaseTime = 0.15;

  // Schedule lower note solo
  const t1Start = now;
  gain1Solo.gain.setValueAtTime(0, t1Start);
  gain1Solo.gain.linearRampToValueAtTime(0.4, t1Start + attackTime);
  gain1Solo.gain.linearRampToValueAtTime(
    sustainLevel,
    t1Start + attackTime + decayTime,
  );
  gain1Solo.gain.setValueAtTime(
    sustainLevel,
    t1Start + soloNoteDuration - releaseTime,
  );
  gain1Solo.gain.linearRampToValueAtTime(0, t1Start + soloNoteDuration);
  osc1Solo.start(t1Start);
  osc1Solo.stop(t1Start + soloNoteDuration);

  // Schedule upper note solo
  const t2Start = t1Start + soloNoteDuration + gap;
  gain2Solo.gain.setValueAtTime(0, t2Start);
  gain2Solo.gain.linearRampToValueAtTime(0.4, t2Start + attackTime);
  gain2Solo.gain.linearRampToValueAtTime(
    sustainLevel,
    t2Start + attackTime + decayTime,
  );
  gain2Solo.gain.setValueAtTime(
    sustainLevel,
    t2Start + soloNoteDuration - releaseTime,
  );
  gain2Solo.gain.linearRampToValueAtTime(0, t2Start + soloNoteDuration);
  osc2Solo.start(t2Start);
  osc2Solo.stop(t2Start + soloNoteDuration);

  // Schedule both notes together
  const t3Start = t2Start + soloNoteDuration + gap;
  masterGain.gain.value = 0.7;
  gain1Together.gain.setValueAtTime(0, t3Start);
  gain2Together.gain.setValueAtTime(0, t3Start);
  gain1Together.gain.linearRampToValueAtTime(0.3, t3Start + attackTime);
  gain2Together.gain.linearRampToValueAtTime(0.3, t3Start + attackTime);
  gain1Together.gain.linearRampToValueAtTime(
    0.2,
    t3Start + attackTime + decayTime,
  );
  gain2Together.gain.linearRampToValueAtTime(
    0.2,
    t3Start + attackTime + decayTime,
  );
  gain1Together.gain.setValueAtTime(0.2, t3Start + togetherDuration - 0.3);
  gain2Together.gain.setValueAtTime(0.2, t3Start + togetherDuration - 0.3);
  gain1Together.gain.linearRampToValueAtTime(0, t3Start + togetherDuration);
  gain2Together.gain.linearRampToValueAtTime(0, t3Start + togetherDuration);
  osc1Together.start(t3Start);
  osc2Together.start(t3Start);
  osc1Together.stop(t3Start + togetherDuration);
  osc2Together.stop(t3Start + togetherDuration);

  // Update button state
  playButton.disabled = true;
  playButton.textContent = "♪ Playing...";

  setTimeout(() => {
    playButton.disabled = false;
    playButton.textContent = "▶ Play Sound";
  }, totalDuration * 1000);
}

// Play button handler
playButton.addEventListener("click", playInterval);

// Convert slider value (0-50) to logarithmic speed
// At 0: 0.01x (slowest)
// At 25: 1x (halfway point)
// At 50: 10x (fastest)
function sliderToSpeed(sliderValue: number): number {
  if (sliderValue === 0) return 0.01;
  // Logarithmic scale: speed = 0.01 * 10^(sliderValue/25)
  // This gives us: 0.01 at value=0, 1.0 at value=25, 10.0 at value=50
  const speed = 0.01 * Math.pow(10, sliderValue / 25);
  return speed;
}

// Convert speed back to slider value (for presets)
function speedToSlider(speed: number): number {
  if (speed <= 0.01) return 0;
  // Inverse: sliderValue = 25 * log10(speed/0.01)
  return 25 * Math.log10(speed / 0.01);
}

// Lissajous parameters - Start with Perfect 5th (3:2)
let freqX = 3;
let freqY = 2;
let phase = Math.PI / 2;
let speed = 0.01; // Base speed value (corresponds to 1x at slider value 25)
let sweepSpeed = 0.01; // 1x sweep speed (corresponds to 1x at slider value 25)
let phaseSweepEnabled = false;

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

// Function to update sliders
function updateSliders() {
  freqXSlider.value = freqX.toString();
  freqYSlider.value = freqY.toString();
  phaseSlider.value = phase.toString();
  speedSlider.value = speedToSlider(speed).toString();
  sweepSpeedSlider.value = speedToSlider(sweepSpeed).toString();

  freqXValue.textContent = freqX.toFixed(1);
  freqYValue.textContent = freqY.toFixed(1);
  phaseValue.textContent = phase.toFixed(2);

  // Format speed display
  const speedMultiplier = speed / 0.01;
  speedValue.textContent = speedMultiplier.toFixed(2) + "x";

  const sweepMultiplier = sweepSpeed / 0.01;
  sweepSpeedValue.textContent = sweepMultiplier.toFixed(2) + "x";
}

// Preset button handlers
document.querySelectorAll(".preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const presetName = (btn as HTMLElement).dataset
      .preset as keyof typeof presets;
    const preset = presets[presetName];

    freqX = preset.freqX;
    freqY = preset.freqY;
    phase = preset.phase;
    t = 0; // Reset animation

    updateSliders();
  });
});

// Update controls
freqXSlider.addEventListener("input", (e) => {
  freqX = parseFloat((e.target as HTMLInputElement).value);
  freqXValue.textContent = freqX.toFixed(1);
});

freqYSlider.addEventListener("input", (e) => {
  freqY = parseFloat((e.target as HTMLInputElement).value);
  freqYValue.textContent = freqY.toFixed(1);
});

phaseSlider.addEventListener("input", (e) => {
  phase = parseFloat((e.target as HTMLInputElement).value);
  phaseValue.textContent = phase.toFixed(2);
});

speedSlider.addEventListener("input", (e) => {
  const sliderValue = parseFloat((e.target as HTMLInputElement).value);
  speed = sliderToSpeed(sliderValue);
  const speedMultiplier = speed / 0.01;
  speedValue.textContent = speedMultiplier.toFixed(2) + "x";
});

sweepSpeedSlider.addEventListener("input", (e) => {
  const sliderValue = parseFloat((e.target as HTMLInputElement).value);
  sweepSpeed = sliderToSpeed(sliderValue);
  const sweepMultiplier = sweepSpeed / 0.01;
  sweepSpeedValue.textContent = sweepMultiplier.toFixed(2) + "x";
});

phaseSweepButton.addEventListener("click", () => {
  phaseSweepEnabled = !phaseSweepEnabled;

  // Update button text and style
  if (phaseSweepEnabled) {
    phaseSweepButton.textContent = "Disable Auto Sweep";
    phaseSweepButton.classList.remove("sweep-enabled");
  } else {
    phaseSweepButton.textContent = "Enable Auto Sweep";
    phaseSweepButton.classList.add("sweep-enabled");
  }

  // Disable manual phase control when sweep is enabled
  phaseSlider.disabled = phaseSweepEnabled;
});

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
  }

  // Clear canvas
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw the Lissajous curve trail
  ctx.strokeStyle = "#0f3460";
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let i = 0; i < 1000; i++) {
    const angle = (i / 1000) * Math.PI * 2;
    const x = centerX + amplitude * Math.sin(freqX * angle + phase);
    const y = centerY + amplitude * Math.sin(freqY * angle);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  // Calculate current position
  const x = centerX + amplitude * Math.sin(freqX * t + phase);
  const y = centerY + amplitude * Math.sin(freqY * t);

  // Draw the moving point
  ctx.fillStyle = "#16c79a";
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();

  // Add glow effect
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#16c79a";
  ctx.fillStyle = "#16c79a";
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Update time
  t += speed;

  // Request next frame
  requestAnimationFrame(animate);
}

// Start animation
animate();
