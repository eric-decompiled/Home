import './style.css';
import { fractalEngine } from './fractal-engine.ts';
import { analyzeMidiBuffer, type MusicTimeline } from './midi-analyzer.ts';
import { audioPlayer } from './audio-player.ts';
import { musicMapper } from './music-mapper.ts';

// --- Song list ---

interface SongEntry {
  name: string;
  file: string;
}

const songs: SongEntry[] = [
  { name: 'Prelude (Final Fantasy)', file: 'ff1-prelude.mid' },
  { name: "Schala's Theme (Chrono Trigger)", file: 'schala.mid' },
  { name: 'To Zanarkand (Final Fantasy X)', file: 'to-zanarkand.mid' },
  { name: "You're Not Alone (Final Fantasy IX)", file: 'ff9-youre-not-alone.mid' },
  { name: "Frog's Theme (Chrono Trigger)", file: 'frog-theme.mid' },
  { name: 'Fight On! (Final Fantasy VII)', file: 'ff7-boss.mid' },
  { name: 'J-E-N-O-V-A (Final Fantasy VII)', file: 'ff7-jenova.mid' },
  { name: 'Hallelujah (Leonard Cohen)', file: 'hallelujah.mid' },
];

// --- State ---

let timeline: MusicTimeline | null = null;
let dirty = true;
let lastTime = 0;
let displayWidth = 800;
let displayHeight = 600;
let isPlaying = false;
let idlePhase = 0;

// --- Adaptive fidelity ---
const MAX_FIDELITY = 0.45;
let renderFidelity = 0.45;

// --- FPS monitoring ---
let fpsFrameCount = 0;
let fpsLastSample = 0;
let currentFps = 0;
let currentRenderMs = 0;

// Note names for key display
const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// --- HTML ---

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="container">
    <header class="top-bar">
      <h1>Fractal Jukebox</h1>
      <div class="song-picker-wrap">
        <select id="song-picker">
          <option value="">-- Select a Song --</option>
          ${songs.map((s, i) => `<option value="${i}">${s.name}</option>`).join('')}
        </select>
      </div>
      <a href="config.html" target="_blank" class="config-link">Config</a>
      <div class="song-info">
        <span class="info-badge" id="key-display">Key: --</span>
        <span class="info-badge" id="bpm-display">BPM: --</span>
        <span class="info-badge" id="chord-display">--</span>
        <span class="info-badge" id="fps-display">-- fps</span>
      </div>
    </header>

    <div class="canvas-wrap">
      <canvas id="canvas"></canvas>
    </div>

    <footer class="bottom-bar">
      <div class="transport">
        <button class="transport-btn" id="play-btn" disabled>&#9654;</button>
        <input type="range" id="seek-bar" min="0" max="100" step="0.1" value="0" disabled>
        <span class="time-display" id="time-display">0:00 / 0:00</span>
      </div>
    </footer>
  </div>
`;

// --- DOM refs ---

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const songPicker = document.getElementById('song-picker') as HTMLSelectElement;
const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
const seekBar = document.getElementById('seek-bar') as HTMLInputElement;
const timeDisplay = document.getElementById('time-display')!;
const keyDisplay = document.getElementById('key-display')!;
const bpmDisplay = document.getElementById('bpm-display')!;
const chordDisplay = document.getElementById('chord-display')!;
const fpsDisplay = document.getElementById('fps-display')!;

// --- Canvas sizing ---

function resizeCanvas(): void {
  const wrap = document.querySelector('.canvas-wrap')!;
  const rect = wrap.getBoundingClientRect();
  const availW = rect.width - 16; // padding
  const availH = rect.height - 16;

  // Fit 4:3 aspect ratio within available space
  if (availW / availH > 4 / 3) {
    displayHeight = Math.floor(Math.max(240, availH));
    displayWidth = Math.floor(displayHeight * 4 / 3);
  } else {
    displayWidth = Math.floor(Math.max(320, availW));
    displayHeight = Math.floor(displayWidth * 3 / 4);
  }

  canvas.width = displayWidth;
  canvas.height = displayHeight;
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';
  dirty = true;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// --- Time formatting ---

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// --- Song loading ---

async function loadSong(index: number) {
  const song = songs[index];
  audioPlayer.stop();
  isPlaying = false;
  playBtn.textContent = '\u25B6';
  musicMapper.reset();

  keyDisplay.textContent = 'Key: ...';
  bpmDisplay.textContent = 'BPM: ...';
  chordDisplay.textContent = 'Loading...';

  let midiBuffer: ArrayBuffer;
  try {
    const response = await fetch(`midi/${song.file}`);
    midiBuffer = await response.arrayBuffer();
  } catch (e) {
    console.error('Failed to fetch MIDI:', e);
    chordDisplay.textContent = 'Load failed';
    timeline = null;
    return;
  }

  try {
    timeline = analyzeMidiBuffer(midiBuffer);
  } catch (e) {
    console.error('Failed to analyze MIDI:', e);
    chordDisplay.textContent = 'Analysis failed';
    timeline = null;
    return;
  }

  musicMapper.setTempo(timeline.tempo, timeline.timeSignature);
  audioPlayer.loadMidi(midiBuffer);

  const modeLabel = timeline.keyMode === 'minor' ? 'm' : '';
  keyDisplay.textContent = `Key: ${noteNames[timeline.key]}${modeLabel}`;
  fractalEngine.setKeyPalette(timeline.key);
  bpmDisplay.textContent = `BPM: ${Math.round(timeline.tempo)}`;
  chordDisplay.textContent = `${timeline.timeSignature[0]}/${timeline.timeSignature[1]}`;

  seekBar.max = String(timeline.duration);
  seekBar.value = '0';
  seekBar.disabled = false;
  playBtn.disabled = false;

  updateTimeDisplay(0);
  dirty = true;
}

function updateTimeDisplay(currentTime: number) {
  const total = timeline?.duration ?? 0;
  timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(total)}`;
}

// --- Event listeners ---

songPicker.addEventListener('change', () => {
  const idx = parseInt(songPicker.value);
  if (!isNaN(idx)) loadSong(idx);
});

playBtn.addEventListener('click', async () => {
  if (!timeline) return;

  if (isPlaying) {
    audioPlayer.pause();
    isPlaying = false;
    playBtn.textContent = '\u25B6';
  } else {
    await audioPlayer.play();
    isPlaying = true;
    playBtn.textContent = '\u275A\u275A';
  }
});

let seeking = false;
seekBar.addEventListener('mousedown', () => { seeking = true; });
seekBar.addEventListener('touchstart', () => { seeking = true; });

seekBar.addEventListener('input', () => {
  if (!timeline) return;
  const t = parseFloat(seekBar.value);
  audioPlayer.seek(t);
  musicMapper.reset();
  musicMapper.setTempo(timeline.tempo, timeline.timeSignature);
  updateTimeDisplay(t);
  dirty = true;
});

seekBar.addEventListener('mouseup', () => { seeking = false; });
seekBar.addEventListener('touchend', () => { seeking = false; });


// --- Chord display update ---

const romanNumerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

function updateChordDisplay(currentTime: number) {
  if (!timeline) return;

  let currentChord = null;
  for (let i = timeline.chords.length - 1; i >= 0; i--) {
    if (timeline.chords[i].time <= currentTime) {
      currentChord = timeline.chords[i];
      break;
    }
  }

  if (currentChord) {
    const root = noteNames[currentChord.root];
    const qualityLabels: Record<string, string> = {
      major: '', minor: 'm', dom7: '7', min7: 'm7',
      dim: 'dim', aug: 'aug', unknown: '?',
    };
    const chordName = `${root}${qualityLabels[currentChord.quality]}`;
    // Show Roman numeral degree if diatonic
    const degree = currentChord.degree;
    if (degree > 0) {
      const isMinorQuality = currentChord.quality === 'minor' || currentChord.quality === 'min7' || currentChord.quality === 'dim';
      const numeral = isMinorQuality ? romanNumerals[degree].toLowerCase() : romanNumerals[degree];
      chordDisplay.textContent = `${chordName}  ${numeral}`;
    } else {
      chordDisplay.textContent = chordName;
    }
  }
}

// --- Worker frame callback ---

fractalEngine.onFrameReady = (renderMs: number) => {
  currentRenderMs = renderMs;
  fpsFrameCount++;

  // Adaptive fidelity based on worker render time
  // Target ~42ms (24fps) per render on the worker thread
  const TARGET_MS = 42;
  if (renderMs > TARGET_MS * 0.8) {
    renderFidelity = Math.max(0.15, renderFidelity * 0.93);
  } else if (renderMs < TARGET_MS * 0.4) {
    renderFidelity = Math.min(MAX_FIDELITY, renderFidelity + 0.01);
  }

  const now = performance.now();
  if (now - fpsLastSample >= 1000) {
    currentFps = fpsFrameCount;
    fpsFrameCount = 0;
    fpsLastSample = now;
    fpsDisplay.textContent = `${currentFps} fps | ${currentRenderMs.toFixed(0)}ms | ${renderFidelity.toFixed(2)}x`;
  }
};

// --- Animation / render loop ---

function loop(time: number): void {
  const dt = lastTime === 0 ? 0 : (time - lastTime) / 1000;
  lastTime = time;

  if (isPlaying && timeline) {
    const currentTime = audioPlayer.getCurrentTime();

    // Check if song ended (guard: only after playback has actually started)
    if (currentTime > 0.5 && (audioPlayer.isFinished() || currentTime >= timeline.duration)) {
      audioPlayer.pause();
      isPlaying = false;
      playBtn.textContent = '\u25B6';
      audioPlayer.seek(0);
      musicMapper.reset();
    } else {
      // Update seek bar
      if (!seeking) {
        seekBar.value = String(currentTime);
      }
      updateTimeDisplay(currentTime);
      updateChordDisplay(currentTime);

      // Get fractal params from music
      const params = musicMapper.update(dt, currentTime, timeline.chords, timeline.drums, timeline.notes);
      fractalEngine.setParams(
        params.cReal,
        params.cImag,
        1.0,
        params.baseIter,
        renderFidelity
      );
      fractalEngine.setFractalType(params.fractalType, params.phoenixP);
      fractalEngine.setRotation(params.rotation);
      fractalEngine.setPalette(params.paletteIndex);
      fractalEngine.setMelodyTint(params.melodyPitchClass, params.melodyVelocity);
      dirty = true;
    }
  } else {
    // Idle or paused: gentle orbit around center using first orbit point
    const idle = musicMapper.getIdleAnchor();
    idlePhase += 0.3 * dt;
    const t = Math.sin(Math.PI * idlePhase);
    const orbit = idle.orbits?.[0] ?? { dr: 0.08, di: 0 };
    const cr = idle.real + orbit.dr * t * 0.5;
    const ci = idle.imag + orbit.di * t * 0.5;
    fractalEngine.setFractalType(idle.type);
    fractalEngine.setRotation(idlePhase * 0.3);
    if (timeline) fractalEngine.setPalette(timeline.key);
    fractalEngine.setParams(cr, ci, 1.0, 150, renderFidelity);
    dirty = true;
  }

  fractalEngine.update(dt);

  // Send render to worker if dirty and worker is idle
  if (dirty && !fractalEngine.isRendering()) {
    fractalEngine.requestRender(canvas, displayWidth, displayHeight);
    dirty = false;
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// Auto-load default song
songPicker.value = '1';
loadSong(1);
