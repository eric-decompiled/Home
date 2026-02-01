import './style.css';
import { fractalEngine, palettes } from './fractal-engine.ts';
import { analyzeMidiBuffer, type MusicTimeline } from './midi-analyzer.ts';
import { audioPlayer } from './audio-player.ts';
import { musicMapper } from './music-mapper.ts';

// --- Song list ---

interface SongEntry {
  name: string;
  file: string;
}

const songs: SongEntry[] = [
  { name: "Schala's Theme (Chrono Trigger)", file: 'schala.mid' },
  { name: 'To Zanarkand (Final Fantasy X)', file: 'to-zanarkand.mid' },
  { name: 'Prelude (Final Fantasy I)', file: 'ff1-prelude.mid' },
  { name: 'The Rebel Army (Final Fantasy II)', file: 'ff2-rebel-army.mid' },
  { name: 'Eternal Wind (Final Fantasy III)', file: 'ff3-eternal-wind.mid' },
  { name: 'Theme of Love (Final Fantasy IV)', file: 'ff4-theme-of-love.mid' },
  { name: 'Ahead on our Way (Final Fantasy V)', file: 'ff5-ahead-on-our-way.mid' },
  { name: "Terra's Theme (Final Fantasy VI)", file: 'ff6-terras-theme.mid' },
  { name: "Aerith's Theme (Final Fantasy VII)", file: 'aeris-theme.mid' },
  { name: 'Prelude (Final Fantasy VII)', file: 'ff7-prelude.mid' },
  { name: 'Eyes on Me (Final Fantasy VIII)', file: 'ff8-eyes-on-me.mid' },
  { name: "You're Not Alone (Final Fantasy IX)", file: 'ff9-youre-not-alone.mid' },
];

// --- State ---

let timeline: MusicTimeline | null = null;
let dirty = true;
let lastTime = 0;
let displayWidth = 800;
let displayHeight = 600;
let isPlaying = false;
let idleSweepAngle = 0;

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
      <div class="song-info">
        <span class="info-badge" id="key-display">Key: --</span>
        <span class="info-badge" id="bpm-display">BPM: --</span>
        <span class="info-badge" id="chord-display">--</span>
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
      <div class="settings">
        <div class="setting-group">
          <label>Color</label>
          <div class="palette-grid" id="palette-grid"></div>
        </div>
        <div class="setting-group">
          <label>Quality: <span id="fidelity-val">0.60x</span></label>
          <input type="range" id="fidelity" min="0.1" max="1" step="0.05" value="0.6">
        </div>
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
const paletteGrid = document.getElementById('palette-grid')!;
const fidelitySlider = document.getElementById('fidelity') as HTMLInputElement;
const fidelityVal = document.getElementById('fidelity-val')!;

// --- Palette buttons ---

function createPaletteGradient(palette: typeof palettes[0]): string {
  const stops = palette.stops.map(
    (s) => `rgb(${s.color[0]},${s.color[1]},${s.color[2]}) ${s.pos * 100}%`
  );
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

palettes.forEach((p, i) => {
  const btn = document.createElement('button');
  btn.className = 'palette-btn' + (i === 4 ? ' active' : '');
  btn.style.background = createPaletteGradient(p);
  btn.title = p.name;
  btn.addEventListener('click', () => {
    fractalEngine.setPalette(i);
    document.querySelectorAll('.palette-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    dirty = true;
  });
  paletteGrid.appendChild(btn);
});

function updatePaletteUI(index: number) {
  const btns = paletteGrid.querySelectorAll('.palette-btn');
  btns.forEach((b, i) => b.classList.toggle('active', i === index));
}

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

fidelitySlider.addEventListener('input', () => {
  const f = parseFloat(fidelitySlider.value);
  fidelityVal.textContent = f.toFixed(2) + 'x';
  fractalEngine.setParams(
    fractalEngine.getCReal(),
    fractalEngine.getCImag(),
    fractalEngine.getZoom(),
    fractalEngine.getMaxIterations(),
    f
  );
  dirty = true;
});

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

// --- Animation / render loop ---

function loop(time: number): void {
  const dt = lastTime === 0 ? 0 : (time - lastTime) / 1000;
  lastTime = time;

  if (isPlaying && timeline) {
    const currentTime = audioPlayer.getCurrentTime();

    // Check if song ended
    if (audioPlayer.isFinished() || currentTime >= timeline.duration) {
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
        fractalEngine.getZoom(),
        params.baseIter,
        fractalEngine.getFidelity()
      );
      fractalEngine.setFractalType(params.fractalType, params.phoenixP);
      fractalEngine.setPalette(params.paletteIndex);
      fractalEngine.setNoteTints(
        params.melodyPitchClass, params.melodyVelocity,
        params.bassPitchClass, params.bassVelocity
      );
      updatePaletteUI(params.paletteIndex);
      dirty = true;
    }
  } else {
    // Idle or paused: Burning Ship tonic anchor with gentle breathing
    idleSweepAngle += 0.15 * dt;
    const cr = -0.31 + 0.012 * Math.cos(idleSweepAngle);
    const ci = -1.15 + 0.012 * Math.sin(idleSweepAngle);
    fractalEngine.setFractalType(3);
    fractalEngine.setParams(cr, ci, 1.0, 150, fractalEngine.getFidelity());
    dirty = true;
  }

  fractalEngine.update(dt);
  fractalEngine.decayTints(dt);

  if (dirty) {
    dirty = false;
    fractalEngine.render(canvas, displayWidth, displayHeight);
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// Auto-load default song
songPicker.value = '0';
loadSong(0);
