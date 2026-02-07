import './style.css';
import { fractalEngine } from './fractal-engine.ts';
import { analyzeMidiBuffer, type MusicTimeline } from './midi-analyzer.ts';
import { audioPlayer } from './audio-player.ts';
import { musicMapper } from './music-mapper.ts';
import { Compositor } from './effects/compositor.ts';
import { FractalEffect } from './effects/fractal-effect.ts';
import { FlowFieldEffect } from './effects/flow-field.ts';
import { KaleidoscopeEffect } from './effects/kaleidoscope.ts';
import { WaveInterferenceEffect } from './effects/wave-interference.ts';
import { ChladniEffect } from './effects/chladni.ts';
import { DomainWarpEffect } from './effects/domain-warp.ts';
import { TonnetzEffect } from './effects/tonnetz.ts';
import { MelodyAuroraEffect } from './effects/melody-aurora.ts';
import { MelodyWebEffect } from './effects/melody-web.ts';
import { MelodyClockEffect } from './effects/melody-clock.ts';
import { BassWebEffect } from './effects/bass-web.ts';
import { BassClockEffect } from './effects/bass-clock.ts';
import { NoteSpiralEffect } from './effects/note-spiral.ts';
import { PitchHistogramEffect } from './effects/pitch-histogram.ts';
import { GrooveWaveEffect } from './effects/groove-wave.ts';
import type { VisualEffect } from './effects/effect-interface.ts';

// --- Song list ---

interface SongEntry {
  name: string;
  file: string;
}

const songs: SongEntry[] = [
  // --- Classical ---
  { name: 'Toccata and Fugue in D minor (Bach)', file: 'bach-toccata-fugue.mid' },       // ~1708
  // --- Games (1988-2001) ---
  { name: 'Area 0 (The Guardian Legend)', file: 'guardian-legend-area0.mid' },           // 1988
  { name: "Schala's Theme (Chrono Trigger)", file: 'schala.mid' },                       // 1995
  { name: "Into the Wilderness (Wild Arms)", file: 'wa1-opening.mid' },                  // 1996
  { name: 'Fight On! (Final Fantasy VII)', file: 'ff7-boss.mid' },                       // 1997
  { name: "Hero's Theme (Final Fantasy Tactics)", file: 'fft-heros-theme.mid' },         // 1997
  { name: 'Tank! (Cowboy Bebop)', file: 'cowboy-bebop-tank.mid' },                       // 1998
  { name: 'Stab the Sword of Justice (Star Ocean 2)', file: 'so2-battle.mid' },          // 1998
  { name: 'Liberi Fatali (Final Fantasy VIII)', file: 'ff8-liberi-fatali.mid' },         // 1999
  { name: "Dart's Theme (Legend of Dragoon)", file: 'legend-of-dragoon-dart.mid' },      // 1999
  { name: 'Hometown Domina (Legend of Mana)', file: 'legend-of-mana-domina.mid' },       // 1999
  { name: 'To Zanarkand (Final Fantasy X)', file: 'to-zanarkand.mid' },                  // 2001
  // --- Coda ---
  { name: "Aerith's Theme (Final Fantasy VII)", file: 'aeris-theme.mid' },               // 1997 ♡
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

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// --- Compositor + effects ---

const compositor = new Compositor();
const fractalEffect = new FractalEffect();
const flowFieldEffect = new FlowFieldEffect();
const kaleidoscopeEffect = new KaleidoscopeEffect();
const pitchHistogramEffect = new PitchHistogramEffect();
const waveEffect = new WaveInterferenceEffect();
const chladniEffect = new ChladniEffect();
const domainWarpEffect = new DomainWarpEffect();
const tonnetzEffect = new TonnetzEffect();
const melodyAuroraEffect = new MelodyAuroraEffect();
const melodyWebEffect = new MelodyWebEffect();
const melodyClockEffect = new MelodyClockEffect();
const bassWebEffect = new BassWebEffect();
const bassClockEffect = new BassClockEffect();
const noteSpiralEffect = new NoteSpiralEffect();
const grooveWaveEffect = new GrooveWaveEffect();

// --- Layer slot definitions (mutually exclusive within each slot) ---

interface LayerSlot {
  name: string;
  effects: VisualEffect[];
  activeId: string | null; // null = "None"
}

const layerSlots: LayerSlot[] = [
  {
    name: 'Background',
    effects: [domainWarpEffect, waveEffect, chladniEffect, flowFieldEffect],
    activeId: 'flowfield',
  },
  {
    name: 'Foreground',
    effects: [tonnetzEffect, fractalEffect, noteSpiralEffect],
    activeId: 'note-spiral',
  },
  {
    name: 'Overlay',
    effects: [grooveWaveEffect, pitchHistogramEffect, kaleidoscopeEffect],
    activeId: null,
  },
  {
    name: 'Melody',
    effects: [melodyAuroraEffect, melodyWebEffect, melodyClockEffect],
    activeId: null,
  },
  {
    name: 'Bass',
    effects: [bassWebEffect, bassClockEffect],
    activeId: 'bass-clock',
  },
];

// Register all effects with compositor (all start disabled, we'll enable per slot)
for (const slot of layerSlots) {
  for (const effect of slot.effects) {
    compositor.addLayer(effect, false);
  }
}

// Apply initial active selections
function applySlotSelections(): void {
  for (const slot of layerSlots) {
    for (const effect of slot.effects) {
      compositor.setEnabled(effect.id, effect.id === slot.activeId);
    }
  }
}
applySlotSelections();

// --- HTML ---

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="container">
    <header class="top-bar">
      <div class="top-row">
        <h1>The Fractured Jukebox</h1>
        <div class="song-picker-wrap">
          <select id="song-picker">
            <option value="">-- Select a Song --</option>
            ${songs.map((s, i) => `<option value="${i}">${s.name}</option>`).join('')}
          </select>
        </div>
        <button class="toggle-btn" id="layers-toggle">Animations</button>
        <a href="config.html" target="_blank" class="toggle-btn">Fractal Config</a>
        <div class="preset-buttons" style="margin-left: auto; display: flex; gap: 8px;">
          <button class="toggle-btn preset-btn" id="preset-spiral" title="Flow Field + Note Spiral + Bass Clock">Cosmic Spiral</button>
          <button class="toggle-btn preset-btn" id="preset-fractal" title="Chladni + Fractal + 7-fold Kaleidoscope">Fractal Cathedral</button>
        </div>
      </div>
      <div class="transport">
        <button class="transport-btn" id="play-btn" disabled>&#9654;</button>
        <input type="range" id="seek-bar" min="0" max="100" step="0.1" value="0" disabled>
        <span class="time-display" id="time-display">0:00 / 0:00</span>
      </div>
    </header>

    <div class="main-area">
      <div class="layer-panel" id="layer-panel">
        <div class="layer-panel-header">Animations</div>
        <div id="layer-list"></div>
      </div>
      <div class="canvas-wrap">
        <canvas id="canvas"></canvas>
      </div>
    </div>

    <footer class="bottom-bar" style="display: none;">
      <div class="song-info">
        <span class="info-badge" id="key-display">Key: --</span>
        <span class="info-badge" id="bpm-display">BPM: --</span>
        <span class="info-badge" id="chord-display">--</span>
        <span class="info-badge" id="fps-display">-- fps</span>
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
const layersToggle = document.getElementById('layers-toggle') as HTMLButtonElement;
const layerPanel = document.getElementById('layer-panel')!;
const layerList = document.getElementById('layer-list')!;

// --- Mouse tracking for interactive effects ---

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  flowFieldEffect.setMouse(x, y);
});

canvas.addEventListener('mouseleave', () => {
  flowFieldEffect.setMouse(-1, -1);
});

// --- Animations panel toggle ---

let layerPanelOpen = false;
layersToggle.addEventListener('click', () => {
  layerPanelOpen = !layerPanelOpen;
  layersToggle.classList.toggle('active', layerPanelOpen);
  layerPanel.classList.toggle('open', layerPanelOpen);
});

// --- Build layer panel UI ---

function buildLayerPanel(): void {
  layerList.innerHTML = '';

  for (const slot of layerSlots) {
    // Slot header
    const slotDiv = document.createElement('div');
    slotDiv.className = 'layer-slot';

    const header = document.createElement('div');
    header.className = 'slot-header';

    const label = document.createElement('span');
    label.className = 'slot-label';
    label.textContent = slot.name;

    // Effect picker dropdown
    const select = document.createElement('select');
    select.className = 'slot-select';

    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = 'None';
    if (!slot.activeId) noneOpt.selected = true;
    select.appendChild(noneOpt);

    for (const effect of slot.effects) {
      const opt = document.createElement('option');
      opt.value = effect.id;
      opt.textContent = effect.name;
      if (effect.id === slot.activeId) opt.selected = true;
      select.appendChild(opt);
    }

    select.addEventListener('change', () => {
      slot.activeId = select.value || null;
      applySlotSelections();
      buildConfigSection(slotDiv, slot);
      dirty = true;
    });

    header.appendChild(label);
    header.appendChild(select);
    slotDiv.appendChild(header);

    // Config section for active effect
    buildConfigSection(slotDiv, slot);

    layerList.appendChild(slotDiv);
  }
}

function buildConfigSection(container: HTMLDivElement, slot: LayerSlot): void {
  // Remove old config
  const old = container.querySelector('.slot-config');
  if (old) old.remove();

  if (!slot.activeId) return;
  const effect = slot.effects.find(e => e.id === slot.activeId);
  if (!effect) return;

  const configs = effect.getConfig();
  if (configs.length === 0) return;

  const configDiv = document.createElement('div');
  configDiv.className = 'slot-config';

  for (const cfg of configs) {
    const row = document.createElement('div');
    row.className = 'config-row';

    const label = document.createElement('label');
    label.textContent = cfg.label;
    row.appendChild(label);

    if (cfg.type === 'range') {
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(cfg.min ?? 0);
      input.max = String(cfg.max ?? 1);
      input.step = String(cfg.step ?? 0.1);
      input.value = String(cfg.value);
      const valDisplay = document.createElement('span');
      valDisplay.className = 'config-value';
      valDisplay.textContent = String(cfg.value);
      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        effect.setConfigValue(cfg.key, v);
        valDisplay.textContent = String(v);
      });
      row.appendChild(input);
      row.appendChild(valDisplay);
    } else if (cfg.type === 'select') {
      const sel = document.createElement('select');
      for (const opt of cfg.options ?? []) {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        if (opt === cfg.value) o.selected = true;
        sel.appendChild(o);
      }
      sel.addEventListener('change', () => {
        effect.setConfigValue(cfg.key, sel.value);
      });
      row.appendChild(sel);
    } else if (cfg.type === 'toggle') {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = cfg.value as boolean;
      input.addEventListener('change', () => {
        effect.setConfigValue(cfg.key, input.checked);
      });
      row.appendChild(input);
    }

    configDiv.appendChild(row);
  }

  container.appendChild(configDiv);
}

buildLayerPanel();

// --- Preset buttons ---

const presetSpiralBtn = document.getElementById('preset-spiral') as HTMLButtonElement;
const presetFractalBtn = document.getElementById('preset-fractal') as HTMLButtonElement;

function applyPreset(preset: 'spiral' | 'fractal'): void {
  if (preset === 'spiral') {
    // Cosmic Spiral: Flow Field + Note Spiral + Bass Clock
    layerSlots[0].activeId = 'flowfield';    // Background
    layerSlots[1].activeId = 'note-spiral';  // Foreground
    layerSlots[2].activeId = null;           // Overlay
    layerSlots[3].activeId = null;           // Melody
    layerSlots[4].activeId = 'bass-clock';   // Bass
  } else if (preset === 'fractal') {
    // Fractal Cathedral: Chladni + Fractal + 7-fold Kaleidoscope
    layerSlots[0].activeId = 'chladni';       // Background
    layerSlots[1].activeId = 'fractal';       // Foreground
    layerSlots[2].activeId = 'kaleidoscope';  // Overlay
    layerSlots[3].activeId = null;            // Melody
    layerSlots[4].activeId = null;            // Bass
  }

  applySlotSelections();
  buildLayerPanel();
  dirty = true;

  // Update button active states
  presetSpiralBtn.classList.toggle('active', preset === 'spiral');
  presetFractalBtn.classList.toggle('active', preset === 'fractal');
}

presetSpiralBtn.addEventListener('click', () => applyPreset('spiral'));
presetFractalBtn.addEventListener('click', () => applyPreset('fractal'));

// Mark initial preset as active (Cosmic Spiral is the default)
presetSpiralBtn.classList.add('active');

// --- Canvas sizing ---

function resizeCanvas(): void {
  const wrap = document.querySelector('.canvas-wrap')!;
  const rect = wrap.getBoundingClientRect();
  const padding = window.innerWidth <= 480 ? 0 : 16;
  const availW = rect.width - padding;
  const availH = rect.height - padding;

  // 16:9 landscape aspect ratio
  const aspect = 16 / 9;

  if (availW / availH > aspect) {
    // Height-constrained
    displayHeight = Math.floor(Math.max(180, availH));
    displayWidth = Math.floor(displayHeight * aspect);
  } else {
    // Width-constrained
    displayWidth = Math.floor(Math.max(320, availW));
    displayHeight = Math.floor(displayWidth / aspect);
  }

  canvas.width = displayWidth;
  canvas.height = displayHeight;
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';
  compositor.resize(displayWidth, displayHeight);
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
  compositor.resetAll();
  lastKeyRegionIndex = -1;

  keyDisplay.textContent = 'Key: ...';
  keyDisplay.style.color = '';
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

  musicMapper.setTempo(
    timeline.tempo,
    timeline.timeSignature,
    timeline.tempoEvents,
    timeline.timeSignatureEvents
  );
  musicMapper.setKey(timeline.key, timeline.keyMode);
  musicMapper.setKeyRegions(timeline.keyRegions);
  musicMapper.setTracks(timeline.tracks);
  audioPlayer.loadMidi(midiBuffer);

  const modeLabel = timeline.keyMode === 'minor' ? 'm' : '';
  keyDisplay.textContent = `Key: ${noteNames[timeline.key]}${modeLabel}`;
  bpmDisplay.textContent = `BPM: ${Math.round(timeline.tempo)}`;
  chordDisplay.textContent = `${timeline.timeSignature[0]}/${timeline.timeSignature[1]}`;

  seekBar.max = String(timeline.duration);
  seekBar.step = '0.016';
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

// --- Custom MIDI file loading ---

async function loadMidiFile(file: File) {
  audioPlayer.stop();
  isPlaying = false;
  playBtn.textContent = '\u25B6';
  musicMapper.reset();
  compositor.resetAll();
  lastKeyRegionIndex = -1;

  keyDisplay.textContent = 'Key: ...';
  keyDisplay.style.color = '';
  bpmDisplay.textContent = 'BPM: ...';
  chordDisplay.textContent = file.name;

  try {
    const midiBuffer = await file.arrayBuffer();
    timeline = analyzeMidiBuffer(midiBuffer);

    musicMapper.setTempo(
      timeline.tempo,
      timeline.timeSignature,
      timeline.tempoEvents,
      timeline.timeSignatureEvents
    );
    musicMapper.setKey(timeline.key, timeline.keyMode);
    musicMapper.setKeyRegions(timeline.keyRegions);
    musicMapper.setTracks(timeline.tracks);
    audioPlayer.loadMidi(midiBuffer);

    const modeLabel = timeline.keyMode === 'minor' ? 'm' : '';
    keyDisplay.textContent = `Key: ${noteNames[timeline.key]}${modeLabel}`;
    bpmDisplay.textContent = `BPM: ${Math.round(timeline.tempo)}`;

    // Use song name from MIDI metadata, fallback to filename without extension
    const baseName = file.name.replace(/\.(mid|midi)$/i, '');
    const displayName = timeline.name || baseName;
    chordDisplay.textContent = `${timeline.timeSignature[0]}/${timeline.timeSignature[1]}`;

    // Add/update custom song option in picker
    let customOption = songPicker.querySelector('option[value="custom"]') as HTMLOptionElement | null;
    if (!customOption) {
      customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.style.color = '#f0a500';  // Gold color for uploaded songs
      songPicker.insertBefore(customOption, songPicker.options[1]); // After "-- Select --"
    }
    customOption.textContent = `⬆ ${displayName}`;
    songPicker.value = 'custom';

    seekBar.max = String(timeline.duration);
    seekBar.step = '0.016';
    seekBar.value = '0';
    seekBar.disabled = false;
    playBtn.disabled = false;

    updateTimeDisplay(0);
    dirty = true;
  } catch (e) {
    console.error('Failed to load MIDI:', e);
    chordDisplay.textContent = 'Load failed - invalid MIDI?';
    timeline = null;
  }
}

// --- Event listeners ---

songPicker.addEventListener('change', async () => {
  if (songPicker.value === 'custom') return; // Already loaded
  const idx = parseInt(songPicker.value);
  if (!isNaN(idx)) {
    await loadSong(idx);
    if (!isPlaying) playBtn.click();
  }
});

// --- Custom MIDI file input (drag & drop + file picker) ---

// Create hidden file input for MIDI
const midiFileInput = document.createElement('input');
midiFileInput.type = 'file';
midiFileInput.accept = '.mid,.midi,audio/midi,audio/x-midi';
midiFileInput.style.display = 'none';
document.body.appendChild(midiFileInput);

midiFileInput.addEventListener('change', () => {
  const file = midiFileInput.files?.[0];
  if (file) loadMidiFile(file);
});

// Add "Load MIDI" button next to song picker
const midiBtn = document.createElement('button');
midiBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -1px; margin-right: 4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>MIDI';
midiBtn.title = 'Load your own MIDI file (or drag & drop)';
midiBtn.className = 'toggle-btn';
midiBtn.style.marginLeft = '8px';
midiBtn.addEventListener('click', () => midiFileInput.click());
songPicker.parentElement?.appendChild(midiBtn);

// Drag & drop MIDI on canvas
canvas.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  canvas.style.outline = '3px dashed #fff';
});

canvas.addEventListener('dragleave', () => {
  canvas.style.outline = '';
});

canvas.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  canvas.style.outline = '';

  const file = e.dataTransfer?.files?.[0];
  if (file && (file.name.endsWith('.mid') || file.name.endsWith('.midi'))) {
    loadMidiFile(file);
  }
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

// Space bar to toggle play/pause
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && timeline) {
    e.preventDefault();  // prevent page scroll
    playBtn.click();
  }
});

let seeking = false;
seekBar.addEventListener('mousedown', () => { seeking = true; });
seekBar.addEventListener('touchstart', () => { seeking = true; });

seekBar.addEventListener('input', () => {
  const t = parseFloat(seekBar.value);

  if (timeline) {
    audioPlayer.seek(t);
    musicMapper.reset();
    musicMapper.setTempo(
      timeline.tempo,
      timeline.timeSignature,
      timeline.tempoEvents,
      timeline.timeSignatureEvents
    );
    musicMapper.setKey(timeline.key, timeline.keyMode);
    musicMapper.setKeyRegions(timeline.keyRegions);
  }

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

// --- Key display update (shows modulations) ---

let lastKeyRegionIndex = -1;

function updateKeyDisplay(currentTime: number) {
  if (!timeline || timeline.keyRegions.length === 0) return;

  // Find current key region
  let regionIndex = 0;
  for (let i = timeline.keyRegions.length - 1; i >= 0; i--) {
    if (timeline.keyRegions[i].startTime <= currentTime) {
      regionIndex = i;
      break;
    }
  }

  // Only update if changed
  if (regionIndex !== lastKeyRegionIndex) {
    lastKeyRegionIndex = regionIndex;
    const region = timeline.keyRegions[regionIndex];
    const modeLabel = region.mode === 'minor' ? 'm' : '';
    const keyName = noteNames[region.key];

    // Show if this is a modulation (not the first region)
    if (regionIndex > 0) {
      keyDisplay.textContent = `Key: ${keyName}${modeLabel} \u2192`; // arrow indicates modulation
      keyDisplay.style.color = '#ffcc00'; // highlight modulation
    } else {
      keyDisplay.textContent = `Key: ${keyName}${modeLabel}`;
      keyDisplay.style.color = '';
    }
  }
}

// --- Worker frame callback ---

fractalEngine.onFrameReady = (renderMs: number) => {
  currentRenderMs = renderMs;
  fpsFrameCount++;

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
    // --- MIDI mode ---
    const currentTime = audioPlayer.getCurrentTime();

    if (currentTime > 0.5 && (audioPlayer.isFinished() || currentTime >= timeline.duration)) {
      // Auto-play next song
      const currentIdx = parseInt(songPicker.value);
      if (!isNaN(currentIdx) && currentIdx < songs.length - 1) {
        const nextIdx = currentIdx + 1;
        songPicker.value = String(nextIdx);
        loadSong(nextIdx).then(() => {
          audioPlayer.play();
          isPlaying = true;
          playBtn.textContent = '\u275A\u275A';
        });
      } else {
        // End of playlist
        audioPlayer.pause();
        isPlaying = false;
        playBtn.textContent = '\u25B6';
        audioPlayer.seek(0);
        musicMapper.reset();
      }
    } else {
      if (!seeking) {
        seekBar.value = String(currentTime);
        seekBar.style.setProperty('--progress', String(currentTime / timeline.duration));
      }
      updateTimeDisplay(currentTime);
      updateChordDisplay(currentTime);
      updateKeyDisplay(currentTime);

      // Get fractal params from music (always computed — fractal effect reads them)
      const params = musicMapper.update(dt, currentTime, timeline.chords, timeline.drums, timeline.notes);

      // Generic music params for all other effects
      const musicParams = musicMapper.getMusicParams(dt, currentTime);

      // Set fractal-specific params
      fractalEffect.setFractalParams(
        params.cReal, params.cImag, 1.0,
        params.baseIter, renderFidelity,
        params.fractalType, params.phoenixP,
        params.rotation, params.paletteIndex
      );
      compositor.update(dt, musicParams);

      dirty = true;
    }
  } else {
    // Idle
    const idle = musicMapper.getIdleAnchor();
    idlePhase += 0.3 * dt;
    const t = Math.sin(Math.PI * idlePhase);
    const orbit = idle.orbits?.[0] ?? { dr: 0.08, di: 0 };
    const cr = idle.real + orbit.dr * t * 0.5;
    const ci = idle.imag + orbit.di * t * 0.5;

    fractalEffect.setFractalParams(
      cr, ci, 1.0, 150, renderFidelity,
      idle.type, -0.5, idlePhase * 0.3,
      timeline ? timeline.key : 0  // Default to C (tonic) when no song loaded
    );

    const idleMusic = musicMapper.getIdleMusicParams(dt);

    compositor.update(dt, idleMusic);

    dirty = true;
  }

  if (dirty) {
    compositor.render(canvas);
    dirty = false;
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// Auto-load default song
songPicker.value = '0';
loadSong(0);
