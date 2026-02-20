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

import { WorkletSynthesizer } from 'spessasynth_lib'

// Voice range presets (MIDI note numbers)
const VOICE_RANGES = [
  { name: 'Bass', low: 40, high: 52 },       // E2-E3
  { name: 'Baritone', low: 45, high: 57 },   // A2-A3
  { name: 'Tenor', low: 48, high: 60 },      // C3-C4
  { name: 'Alto', low: 53, high: 65 },       // F3-F4
  { name: 'Mezzo', low: 57, high: 69 },      // A3-A4
  { name: 'Soprano', low: 60, high: 72 },    // C4-C5
];

// Instrument presets (General MIDI program numbers)
const INSTRUMENTS = [
  { name: 'Piano', program: 0 },
  { name: 'Vibraphone', program: 11 },
  { name: 'Organ', program: 19 },
  { name: 'Nylon Guitar', program: 24 },
  { name: 'Strings', program: 48 },
  { name: 'Choir', program: 52 },
  { name: 'Flute', program: 73 },
  { name: 'Clarinet', program: 71 },
];

// Interval definitions with just intonation ratios
const INTERVALS = [
  { name: 'Unison', semitones: 0, ratio: 1/1, shortName: 'P1' },
  { name: 'Minor 2nd', semitones: 1, ratio: 16/15, shortName: 'm2' },
  { name: 'Major 2nd', semitones: 2, ratio: 9/8, shortName: 'M2' },
  { name: 'Minor 3rd', semitones: 3, ratio: 6/5, shortName: 'm3' },
  { name: 'Major 3rd', semitones: 4, ratio: 5/4, shortName: 'M3' },
  { name: 'Perfect 4th', semitones: 5, ratio: 4/3, shortName: 'P4' },
  { name: 'Tritone', semitones: 6, ratio: 45/32, shortName: 'TT' },
  { name: 'Perfect 5th', semitones: 7, ratio: 3/2, shortName: 'P5' },
  { name: 'Minor 6th', semitones: 8, ratio: 8/5, shortName: 'm6' },
  { name: 'Major 6th', semitones: 9, ratio: 5/3, shortName: 'M6' },
  { name: 'Minor 7th', semitones: 10, ratio: 9/5, shortName: 'm7' },
  { name: 'Major 7th', semitones: 11, ratio: 15/8, shortName: 'M7' },
  { name: 'Octave', semitones: 12, ratio: 2/1, shortName: 'P8' },
];

// Optimal phase shifts for visual clarity
const PHASE_SHIFTS: Record<number, number> = {
  0: 0,           // Unison
  1: Math.PI/4,   // m2
  2: Math.PI/4,   // M2
  3: Math.PI/6,   // m3
  4: Math.PI/5,   // M3
  5: Math.PI/4,   // P4
  6: Math.PI/4,   // TT
  7: Math.PI/6,   // P5
  8: Math.PI/5,   // m6
  9: Math.PI/6,   // M6
  10: Math.PI/5,  // m7
  11: Math.PI/4,  // M7
  12: 0,          // Octave
};

// App state
let audioContext: AudioContext | null = null;
let synth: WorkletSynthesizer | null = null;
let synthReady = false;
let currentInterval: typeof INTERVALS[0] | null = null;
let currentBaseNote = 60;
let isAscending = true;
let stats = { correct: 0, incorrect: 0, streak: 0 };
let answered = false;

// Per-interval stats for adaptive weighting
const intervalStats: { correct: number; total: number }[] =
  INTERVALS.map(() => ({ correct: 0, total: 0 }));

// Pick interval with weighted probability
function pickWeightedInterval(): number {
  const weights = INTERVALS.map((_, i) => {
    // Base weight
    let weight = 1.0;

    // Strongly bias against unison (index 0)
    if (i === 0) weight *= 0.1;

    // Adjust based on performance
    const stat = intervalStats[i];
    if (stat.total >= 3) {
      const successRate = stat.correct / stat.total;
      // Lower success rate = higher weight (practice more)
      // Higher success rate = lower weight (already mastered)
      // Range: 0.5 (100% success) to 2.0 (0% success)
      weight *= 2.0 - successRate * 1.5;
    }

    return weight;
  });

  // Weighted random selection
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random <= 0) return i;
  }

  return weights.length - 1;
}

// Lissajous state
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let sweepPhase = 0;
let targetPhase = 0;
let revealProgress = 0;
let isRevealing = false;

// Helper to get CSS variable values for canvas drawing
function getCSSVar(name: string): string {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

// Settings
let playMode: 'melodic' | 'harmonic' | 'both' = 'both';
let showLissajous = true;
let currentInstrument = 0;
let rangeLow = 48;  // C3
let rangeHigh = 60; // C4

// Pending note timeouts (to cancel when switching intervals)
let pendingTimeouts: number[] = [];

// Create the UI
function createUI() {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = `
    <div class="container">
      <div class="sidebar">
        <div class="panel">
          <h2>Interval Trainer</h2>
          <p>Listen to the interval and identify it. The Lissajous figure will reveal the answer after you guess.</p>
          <p>Simpler ratios (like 3:2 for a fifth) create cleaner, more stable patterns.</p>
        </div>
        <div class="panel">
          <h2>Settings</h2>
          <div class="setting-row">
            <label>Instrument</label>
            <div class="instrument-grid" id="instrumentGrid">
              ${INSTRUMENTS.map((inst, i) => `
                <button class="instrument-btn${i === 0 ? ' active' : ''}" data-index="${i}">${inst.name}</button>
              `).join('')}
            </div>
          </div>
          <div class="setting-row">
            <label>Voice Range</label>
            <div class="voice-grid" id="voiceGrid">
              ${VOICE_RANGES.map((v, i) => `
                <button class="voice-btn${i === 2 ? ' active' : ''}" data-index="${i}">${v.name}</button>
              `).join('')}
            </div>
            <div class="range-display" id="rangeDisplay">C3 - C4</div>
          </div>
          <div class="setting-row">
            <label>Play Mode</label>
            <select id="playMode">
              <option value="both" selected>Melodic then Harmonic</option>
              <option value="melodic">Melodic Only</option>
              <option value="harmonic">Harmonic Only</option>
            </select>
          </div>
          <div class="setting-row checkbox-row">
            <input type="checkbox" id="showLissajous" checked>
            <label for="showLissajous">Show Lissajous Animation</label>
          </div>
        </div>
      </div>

      <div class="center">
        <h1>Interval Trainer</h1>
        <div class="canvas-container">
          <canvas id="lissajous"></canvas>
        </div>
        <div class="direction" id="direction"></div>
        <button class="play-btn" id="playBtn">Play Interval</button>
        <div class="feedback waiting" id="feedback">Click "Play Interval" to begin</div>
      </div>

      <div class="sidebar">
        <div class="panel">
          <h2>Your Answer</h2>
          <div class="interval-grid" id="intervalGrid">
            ${INTERVALS.map((interval, i) => `
              <button class="interval-btn" data-index="${i}" disabled>
                ${interval.name}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="panel">
          <h2>Statistics</h2>
          <div class="stats">
            <div class="stat">
              <div class="stat-value" id="correctCount">0</div>
              <div class="stat-label">Correct</div>
            </div>
            <div class="stat">
              <div class="stat-value incorrect-stat" id="incorrectCount">0</div>
              <div class="stat-label">Incorrect</div>
            </div>
            <div class="stat">
              <div class="stat-value" id="streakCount">0</div>
              <div class="stat-label">Streak</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Initialize audio with SpessaSynth
async function initAudio() {
  if (synth) {
    if (audioContext?.state === 'suspended') {
      await audioContext.resume();
    }
    return;
  }

  audioContext = new AudioContext();
  await audioContext.audioWorklet.addModule(
    new URL('/spessasynth_processor.min.js', import.meta.url).href
  );

  synth = new WorkletSynthesizer(audioContext);
  synth.connect(audioContext.destination);

  const sfResponse = await fetch('TimGM6mb.sf2');
  const sfBuffer = await sfResponse.arrayBuffer();
  await synth.soundBankManager.addSoundBank(sfBuffer, 'gm');
  await synth.isReady;
  synthReady = true;

  // Set initial instrument
  setInstrument(currentInstrument);
}

// Set the current instrument
function setInstrument(index: number) {
  if (!synth || !synthReady) return;
  const program = INSTRUMENTS[index].program;
  // Channel 0 for our notes
  synth.programChange(0, program);
}

// Stop all pending notes
function stopAllNotes() {
  // Clear pending timeouts
  pendingTimeouts.forEach(id => clearTimeout(id));
  pendingTimeouts = [];
  // Stop any playing notes
  if (synth && synthReady) {
    synth.stopAll(false);
  }
}

// Play a MIDI note
function playNote(midiNote: number, delayMs: number, durationMs: number) {
  if (!synth || !synthReady) return;

  const startId = setTimeout(() => {
    synth!.noteOn(0, midiNote, 80); // channel 0, velocity 80
    const stopId = setTimeout(() => {
      synth!.noteOff(0, midiNote);
    }, durationMs);
    pendingTimeouts.push(stopId);
  }, delayMs);
  pendingTimeouts.push(startId);
}

// Play the current interval
function playInterval() {
  if (!synth || !synthReady || !currentInterval) return;

  // Stop any currently playing notes
  stopAllNotes();

  const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
  playBtn.disabled = true;

  const note1 = isAscending ? currentBaseNote : currentBaseNote + currentInterval.semitones;
  const note2 = isAscending ? currentBaseNote + currentInterval.semitones : currentBaseNote;

  let totalDuration = 0;

  if (playMode === 'melodic' || playMode === 'both') {
    // Play melodically: first note, then second
    playNote(note1, 0, 500);
    playNote(note2, 600, 500);
    totalDuration = 1100;
  }

  if (playMode === 'harmonic' || playMode === 'both') {
    const harmonicDelay = playMode === 'both' ? 1300 : 0;
    // Play harmonically: both together
    playNote(note1, harmonicDelay, 1500);
    playNote(note2, harmonicDelay, 1500);
    totalDuration = harmonicDelay + 1500;
  }

  // Re-enable button after playback
  setTimeout(() => {
    if (!answered) {
      playBtn.disabled = false;
    }
  }, totalDuration + 100);
}

// Generate a new interval to guess
function newInterval() {
  const index = pickWeightedInterval();
  currentInterval = INTERVALS[index];
  isAscending = Math.random() > 0.5;
  answered = false;

  // Pick random base note from range (ensuring interval fits)
  const maxBase = rangeHigh - currentInterval.semitones;
  const minBase = rangeLow;
  if (maxBase >= minBase) {
    currentBaseNote = minBase + Math.floor(Math.random() * (maxBase - minBase + 1));
  } else {
    currentBaseNote = rangeLow; // fallback if range too small
  }

  // Reset Lissajous for reveal
  targetPhase = PHASE_SHIFTS[currentInterval.semitones];
  revealProgress = 0;
  isRevealing = false;
  sweepPhase = 0;

  // Update direction indicator
  const dirEl = document.getElementById('direction');
  if (dirEl) {
    dirEl.textContent = isAscending ? '(ascending)' : '(descending)';
  }
}

// Check the user's answer
function checkAnswer(index: number) {
  if (!currentInterval || answered) return;

  // Stop any currently playing notes
  stopAllNotes();

  answered = true;
  const correct = INTERVALS[index].semitones === currentInterval.semitones;

  // Update stats
  if (correct) {
    stats.correct++;
    stats.streak++;
  } else {
    stats.incorrect++;
    stats.streak = 0;
  }

  // Track per-interval stats for adaptive weighting
  const intervalIndex = currentInterval.semitones;
  intervalStats[intervalIndex].total++;
  if (correct) {
    intervalStats[intervalIndex].correct++;
  }

  updateStats();

  // Show feedback
  const feedback = document.getElementById('feedback');
  if (feedback) {
    if (correct) {
      feedback.textContent = `Correct! ${currentInterval.name} (${currentInterval.shortName})`;
      feedback.className = 'feedback correct';
    } else {
      feedback.textContent = `Incorrect. It was ${currentInterval.name} (${currentInterval.shortName})`;
      feedback.className = 'feedback incorrect';
    }
  }

  // Highlight buttons and disable them
  const buttons = document.querySelectorAll('.interval-btn');
  buttons.forEach((btn, i) => {
    (btn as HTMLButtonElement).disabled = true;
    if (i === currentInterval!.semitones) {
      btn.classList.add('correct');
    } else if (i === index && !correct) {
      btn.classList.add('incorrect');
    }
  });

  // Update play button text
  const playBtn = document.getElementById('playBtn');
  if (playBtn) playBtn.textContent = 'Next Interval';

  // Start Lissajous reveal animation
  isRevealing = true;

  // Auto-advance after delay (3s for reveal animation)
  setTimeout(() => {
    resetForNext();
  }, 3000);
}

// Reset UI and auto-play next round
function resetForNext() {
  // Ensure all notes are stopped
  stopAllNotes();

  const buttons = document.querySelectorAll('.interval-btn');
  buttons.forEach(btn => {
    btn.classList.remove('correct', 'incorrect');
    (btn as HTMLButtonElement).disabled = false;
  });

  const feedback = document.getElementById('feedback');
  if (feedback) {
    feedback.textContent = 'Listening... Select your answer';
    feedback.className = 'feedback waiting';
  }

  const playBtn = document.getElementById('playBtn');
  if (playBtn) playBtn.textContent = 'Replay';

  // Generate and play next interval
  newInterval();
  playInterval();
}

// Update stats display
function updateStats() {
  const correctEl = document.getElementById('correctCount');
  const incorrectEl = document.getElementById('incorrectCount');
  const streakEl = document.getElementById('streakCount');

  if (correctEl) correctEl.textContent = stats.correct.toString();
  if (incorrectEl) incorrectEl.textContent = stats.incorrect.toString();
  if (streakEl) streakEl.textContent = stats.streak.toString();
}

// Canvas setup
function setupCanvas() {
  canvas = document.getElementById('lissajous') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  const container = canvas.parentElement!;
  // Fill the container, accounting for padding
  const size = Math.min(container.clientWidth, container.clientHeight) - 16;

  canvas.width = size;
  canvas.height = size;
}

// Lissajous animation
function animate() {
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Get theme colors from CSS variables
  const bgTertiary = getCSSVar('--bg-tertiary');
  const accentPrimary = getCSSVar('--accent-primary');
  const accentSecondary = getCSSVar('--accent-secondary');

  // Clear canvas
  ctx.fillStyle = bgTertiary;
  ctx.fillRect(0, 0, width, height);

  if (!showLissajous) {
    // Draw beamed eighth notes as placeholder
    const cx = width / 2;
    const cy = height / 2;
    const scale = Math.min(width, height) / 400;
    const noteSize = 28 * scale;
    const stemHeight = noteSize * 3.5;
    const noteSpacing = noteSize * 2.8;
    const time = Date.now() / 1000;

    // Gentle floating animation
    const floatY = Math.sin(time * 1.5) * 5 * scale;
    const floatRotate = Math.sin(time * 1.2) * 0.02;

    ctx.save();
    ctx.translate(cx, cy + floatY);
    ctx.rotate(floatRotate);

    // Outer glow
    ctx.shadowColor = accentPrimary;
    ctx.shadowBlur = 25 * scale;

    // Create gradient for notes - use accent color with lighter midpoint
    const gradient = ctx.createLinearGradient(-noteSpacing, -stemHeight, noteSpacing, noteSize * 2);
    gradient.addColorStop(0, accentPrimary);
    gradient.addColorStop(0.5, accentPrimary);
    gradient.addColorStop(1, accentPrimary);

    ctx.fillStyle = gradient;
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';

    // Note head positions
    const note1x = -noteSpacing * 0.5;
    const note2x = noteSpacing * 0.5;
    const noteY = noteSize;

    // Stem positions (on right side of note heads)
    const stem1x = note1x + noteSize * 0.85;
    const stem2x = note2x + noteSize * 0.85;
    const stemBottom = noteY;
    const stemTop = -stemHeight;

    // Draw stems
    ctx.lineWidth = noteSize * 0.22;
    ctx.beginPath();
    ctx.moveTo(stem1x, stemBottom);
    ctx.lineTo(stem1x, stemTop);
    ctx.moveTo(stem2x, stemBottom);
    ctx.lineTo(stem2x, stemTop);
    ctx.stroke();

    // Draw single beam connecting stems
    ctx.lineWidth = noteSize * 0.5;
    ctx.beginPath();
    ctx.moveTo(stem1x, stemTop);
    ctx.lineTo(stem2x, stemTop);
    ctx.stroke();

    // Draw note heads (tilted filled ellipses)
    for (let n = 0; n < 2; n++) {
      const nx = n === 0 ? note1x : note2x;

      ctx.save();
      ctx.translate(nx, noteY);
      ctx.rotate(-0.35);

      ctx.shadowBlur = 20 * scale;
      ctx.beginPath();
      ctx.ellipse(0, 0, noteSize, noteSize * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner highlight
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.ellipse(-noteSize * 0.2, -noteSize * 0.15, noteSize * 0.3, noteSize * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = gradient;

      ctx.restore();
    }

    // Sparkle effects - parse accent color for rgba
    ctx.shadowBlur = 0;
    for (let i = 0; i < 5; i++) {
      const sparkleTime = time * 2 + i * 1.3;
      const sparkleX = Math.sin(sparkleTime * 0.7 + i) * noteSpacing * 1.2;
      const sparkleY = Math.cos(sparkleTime * 0.5 + i * 2) * stemHeight * 0.7;
      const sparkleSize = (Math.sin(sparkleTime * 3) * 0.5 + 0.5) * 4 * scale;
      const sparkleAlpha = Math.sin(sparkleTime * 2) * 0.3 + 0.4;

      ctx.globalAlpha = sparkleAlpha;
      ctx.fillStyle = accentPrimary;
      ctx.beginPath();
      ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    requestAnimationFrame(animate);
    return;
  }

  // Get current interval ratio for Lissajous
  let freqX = 1;
  let freqY = 1;

  if (currentInterval) {
    // Use simpler integer approximations for visual clarity
    const ratio = currentInterval.ratio;
    if (ratio === 1) {
      freqX = 1; freqY = 1;
    } else if (ratio === 2) {
      freqX = 1; freqY = 2;
    } else if (ratio === 3/2) {
      freqX = 2; freqY = 3;
    } else if (ratio === 4/3) {
      freqX = 3; freqY = 4;
    } else if (ratio === 5/4) {
      freqX = 4; freqY = 5;
    } else if (ratio === 5/3) {
      freqX = 3; freqY = 5;
    } else if (ratio === 6/5) {
      freqX = 5; freqY = 6;
    } else if (ratio === 8/5) {
      freqX = 5; freqY = 8;
    } else if (ratio === 9/8) {
      freqX = 8; freqY = 9;
    } else if (ratio === 9/5) {
      freqX = 5; freqY = 9;
    } else if (ratio === 15/8) {
      freqX = 8; freqY = 15;
    } else if (ratio === 16/15) {
      freqX = 15; freqY = 16;
    } else if (ratio === 45/32) {
      freqX = 32; freqY = 45;
    }
  }

  // Continuous phase sweep animation
  const time = Date.now() / 1000;

  // Animate the sweep phase - continuous spinning when not revealing
  if (isRevealing) {
    revealProgress = Math.min(1, revealProgress + 0.02);
    // Slow down and settle to target phase when revealing answer
    sweepPhase = targetPhase + (1 - revealProgress) * Math.sin(time * 2) * 0.5;
  } else {
    // Continuous rotation when waiting for guess
    sweepPhase = time * 0.5; // Slow continuous rotation
  }

  // Draw Lissajous curve
  const centerX = width / 2;
  const centerY = height / 2;
  const amplitude = Math.min(width, height) * 0.4;

  // Draw the curve with a gradient trail
  ctx.beginPath();
  const points = 1000;

  for (let i = 0; i <= points; i++) {
    const t = (i / points) * Math.PI * 2 * Math.max(freqX, freqY);
    const x = centerX + amplitude * Math.sin(freqX * t + sweepPhase);
    const y = centerY + amplitude * Math.sin(freqY * t);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  // Style based on reveal state
  if (isRevealing && revealProgress > 0.5) {
    ctx.strokeStyle = accentPrimary;
    ctx.shadowColor = accentPrimary;
    ctx.shadowBlur = 15;
  } else {
    ctx.strokeStyle = accentPrimary;
    ctx.shadowColor = accentPrimary;
    ctx.shadowBlur = 8;
  }
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw animated point
  const t = Date.now() / 1000;
  const pointX = centerX + amplitude * Math.sin(freqX * t * 0.8 + sweepPhase);
  const pointY = centerY + amplitude * Math.sin(freqY * t * 0.8);

  ctx.beginPath();
  ctx.arc(pointX, pointY, 6, 0, Math.PI * 2);
  ctx.fillStyle = accentSecondary;
  ctx.shadowColor = accentSecondary;
  ctx.shadowBlur = 15;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Show ratio text when revealed
  if (isRevealing && revealProgress > 0.8 && currentInterval) {
    ctx.fillStyle = accentPrimary;
    ctx.font = '20px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${freqX}:${freqY}`, centerX, height - 20);
  }

  requestAnimationFrame(animate);
}

// Event listeners
function setupEventListeners() {
  const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
  const intervalGrid = document.getElementById('intervalGrid');
  const instrumentGrid = document.getElementById('instrumentGrid');
  const voiceGrid = document.getElementById('voiceGrid');
  const rangeDisplay = document.getElementById('rangeDisplay');
  const playModeSelect = document.getElementById('playMode') as HTMLSelectElement;
  const showLissajousCheck = document.getElementById('showLissajous') as HTMLInputElement;

  // Helper to convert MIDI note to name
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  function midiToName(midi: number): string {
    const octave = Math.floor(midi / 12) - 1;
    const note = noteNames[midi % 12];
    return `${note}${octave}`;
  }

  function updateRangeDisplay() {
    if (rangeDisplay) {
      rangeDisplay.textContent = `${midiToName(rangeLow)} - ${midiToName(rangeHigh)}`;
    }
  }

  playBtn.addEventListener('click', async () => {
    await initAudio();

    // If no current interval or already answered, start new round
    if (!currentInterval || answered) {
      newInterval();
      playInterval();

      const feedback = document.getElementById('feedback');
      if (feedback) {
        feedback.textContent = 'Listening... Select your answer';
        feedback.className = 'feedback waiting';
      }

      // Enable answer buttons
      const buttons = document.querySelectorAll('.interval-btn');
      buttons.forEach(btn => {
        btn.classList.remove('correct', 'incorrect');
        (btn as HTMLButtonElement).disabled = false;
      });

      playBtn.textContent = 'Replay';
    } else {
      // Replay current interval
      playInterval();
    }
  });

  intervalGrid?.addEventListener('click', (e) => {
    const target = e.target as HTMLButtonElement;
    if (target.classList.contains('interval-btn') && !target.disabled) {
      const index = parseInt(target.dataset.index || '0');
      checkAnswer(index);
    }
  });

  instrumentGrid?.addEventListener('click', (e) => {
    const target = e.target as HTMLButtonElement;
    if (target.classList.contains('instrument-btn')) {
      // Update active state
      instrumentGrid.querySelectorAll('.instrument-btn').forEach(btn => btn.classList.remove('active'));
      target.classList.add('active');

      currentInstrument = parseInt(target.dataset.index || '0');
      setInstrument(currentInstrument);
    }
  });

  voiceGrid?.addEventListener('click', async (e) => {
    const target = e.target as HTMLButtonElement;
    if (target.classList.contains('voice-btn')) {
      // Update active state
      voiceGrid.querySelectorAll('.voice-btn').forEach(btn => btn.classList.remove('active'));
      target.classList.add('active');

      const index = parseInt(target.dataset.index || '0');
      const range = VOICE_RANGES[index];
      rangeLow = range.low;
      rangeHigh = range.high;
      updateRangeDisplay();

      // Regenerate base note for current interval if exists
      if (currentInterval) {
        const maxBase = rangeHigh - currentInterval.semitones;
        const minBase = rangeLow;
        if (maxBase >= minBase) {
          currentBaseNote = minBase + Math.floor(Math.random() * (maxBase - minBase + 1));
        } else {
          currentBaseNote = rangeLow;
        }
      }

      // Play a preview note so user can hear the range
      await initAudio();
      if (synth && synthReady) {
        stopAllNotes();
        const previewNote = Math.floor((range.low + range.high) / 2);
        synth.noteOn(0, previewNote, 60);
        setTimeout(() => synth?.noteOff(0, previewNote), 300);
      }
    }
  });

  playModeSelect?.addEventListener('change', () => {
    playMode = playModeSelect.value as typeof playMode;
  });

  showLissajousCheck?.addEventListener('change', () => {
    showLissajous = showLissajousCheck.checked;
  });
}

// Initialize
function init() {
  createUI();
  setupCanvas();
  setupEventListeners();
  animate();
}

init();
