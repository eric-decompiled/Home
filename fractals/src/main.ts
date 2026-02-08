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
import { PianoRollEffect } from './effects/piano-roll.ts';
import type { VisualEffect } from './effects/effect-interface.ts';

// --- Song list ---

interface SongEntry {
  name: string;
  file: string;
}

const songs: SongEntry[] = [
  { name: 'Toccata & Fugue in D minor (Bach)', file: 'bach-toccata-fugue.mid' },         // ~1708
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
const pianoRollEffect = new PianoRollEffect();
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
    activeId: 'flowfield',  // Cosmic Spiral default
  },
  {
    name: 'Foreground',
    effects: [pianoRollEffect, tonnetzEffect, fractalEffect, noteSpiralEffect],
    activeId: 'note-spiral',  // Cosmic Spiral default
  },
  {
    name: 'Overlay',
    effects: [grooveWaveEffect, pitchHistogramEffect, kaleidoscopeEffect],
    activeId: null,  // Cosmic Spiral default
  },
  {
    name: 'Melody',
    effects: [melodyAuroraEffect, melodyWebEffect, melodyClockEffect],
    activeId: null,  // Cosmic Spiral default
  },
  {
    name: 'Bass',
    effects: [bassWebEffect, bassClockEffect],
    activeId: 'bass-clock',  // Cosmic Spiral default
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
        <h1>Fractured Jukebox</h1>
        <div class="song-picker-wrap">
          <select id="song-picker">
            <option value="">-- Select a Song --</option>
            ${songs.map((s, i) => `<option value="${i}">${s.name}</option>`).join('')}
          </select>
        </div>
        <button class="toggle-btn" id="layers-toggle">Animations</button>
        <div class="preset-buttons" style="margin-left: auto; display: flex; gap: 8px; align-items: center;">
          <span style="color: #888; font-size: 12px; margin-right: 4px;">Presets:</span>
          <button class="toggle-btn preset-btn" id="preset-spiral" title="Flow Field + Note Spiral + Bass Clock">Cosmic Spiral</button>
          <button class="toggle-btn preset-btn" id="preset-warp" title="Chladni + Note Spiral + Kaleidoscope + Bass Clock">Warp Prism</button>
          <button class="toggle-btn preset-btn" id="preset-fractal" title="Domain Warp + Fractal + Groove Wave">Fractal Dance</button>
          <button class="toggle-btn preset-btn" id="preset-piano" title="Flow Field + Piano Roll">Piano</button>
        </div>
      </div>
      <div class="transport">
        <button class="transport-btn" id="play-btn" disabled>&#9654;</button>
        <input type="range" id="seek-bar" min="0" max="100" step="0.1" value="0" disabled>
        <span class="time-display" id="time-display">0:00 / 0:00</span>
        <button class="transport-btn" id="fullscreen-btn" title="Fullscreen">&#x26F6;</button>
      </div>
    </header>

    <div class="main-area">
      <div class="layer-panel" id="layer-panel">
        <div class="layer-panel-header">
          <span>Animations</span>
          <button class="panel-close-btn" id="panel-close-btn">&times;</button>
        </div>
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
const fullscreenBtn = document.getElementById('fullscreen-btn') as HTMLButtonElement;

// --- Fullscreen toggle ---
const appContainer = document.getElementById('app') as HTMLElement;

// Check for fullscreen support (including vendor prefixes)
const docEl = document.documentElement as any;
const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
const exitFS = (document as any).exitFullscreen || (document as any).webkitExitFullscreen || (document as any).mozCancelFullScreen || (document as any).msExitFullscreen;
const getFullscreenEl = () => (document as any).fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement || (document as any).msFullscreenElement;

// Check if running as installed PWA (already fullscreen)
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

// TODO: iOS web fullscreen - PWA works but need better UX for prompting "Add to Home Screen"
// Hide fullscreen button on iOS Safari (no fullscreen API support)
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
if (!requestFS && isIOS && !isStandalone) {
  fullscreenBtn.style.display = 'none';
}

// In standalone mode, hide button (already fullscreen)
if (isStandalone) {
  fullscreenBtn.style.display = 'none';
}

fullscreenBtn.addEventListener('click', () => {

  if (!getFullscreenEl()) {
    const req = (appContainer as any).requestFullscreen || (appContainer as any).webkitRequestFullscreen || (appContainer as any).mozRequestFullScreen || (appContainer as any).msRequestFullscreen;
    if (req) req.call(appContainer);
  } else {
    if (exitFS) exitFS.call(document);
  }
});

function onFullscreenChange() {
  const topBar = document.querySelector('.top-bar') as HTMLElement;
  if (getFullscreenEl()) {
    fullscreenBtn.innerHTML = '&#x2715;'; // ✕ exit
    fullscreenBtn.title = 'Exit fullscreen (Esc)';
  } else {
    fullscreenBtn.innerHTML = '&#x26F6;'; // ⛶ expand
    fullscreenBtn.title = 'Fullscreen';
    canvas.classList.remove('cursor-hidden');
    topBar.classList.remove('visible');
  }
}

document.addEventListener('fullscreenchange', onFullscreenChange);
document.addEventListener('webkitfullscreenchange', onFullscreenChange);
document.addEventListener('mozfullscreenchange', onFullscreenChange);
document.addEventListener('MSFullscreenChange', onFullscreenChange);

// Hide cursor after inactivity in fullscreen
let cursorTimeout: number | null = null;
const CURSOR_HIDE_DELAY = 2500;

function showCursor() {
  canvas.classList.remove('cursor-hidden');
  if (cursorTimeout) clearTimeout(cursorTimeout);
  if (getFullscreenEl()) {
    cursorTimeout = window.setTimeout(() => {
      canvas.classList.add('cursor-hidden');
    }, CURSOR_HIDE_DELAY);
  }
}

canvas.addEventListener('mousemove', showCursor);
canvas.addEventListener('mousedown', showCursor);

// Show controls when mouse near top in fullscreen
const topBar = document.querySelector('.top-bar') as HTMLElement;
const TOP_REVEAL_ZONE = 80; // pixels from top to trigger reveal
let controlsTimeout: number | null = null;

function handleFullscreenMouse(e: MouseEvent) {
  if (!getFullscreenEl()) return;

  showCursor();

  if (e.clientY < TOP_REVEAL_ZONE) {
    topBar.classList.add('visible');
    if (controlsTimeout) clearTimeout(controlsTimeout);
  } else if (!topBar.matches(':hover')) {
    // Hide after delay when mouse leaves top zone (and not hovering controls)
    if (controlsTimeout) clearTimeout(controlsTimeout);
    controlsTimeout = window.setTimeout(() => {
      topBar.classList.remove('visible');
    }, 1500);
  }
}

// Keep controls visible while interacting with them
topBar.addEventListener('mouseenter', () => {
  if (controlsTimeout) clearTimeout(controlsTimeout);
  topBar.classList.add('visible');
});

topBar.addEventListener('mouseleave', () => {
  if (getFullscreenEl()) {
    controlsTimeout = window.setTimeout(() => {
      topBar.classList.remove('visible');
    }, 1000);
  }
});

document.addEventListener('mousemove', handleFullscreenMouse);

// Touch support: tap near top or swipe down to reveal controls
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
  // Tap near top reveals controls
  if (getFullscreenEl() && touchStartY < TOP_REVEAL_ZONE) {
    topBar.classList.add('visible');
  }
}, { passive: true });

canvas.addEventListener('touchend', () => {
  // Hide controls after delay if shown by touch
  if (getFullscreenEl() && topBar.classList.contains('visible')) {
    if (controlsTimeout) clearTimeout(controlsTimeout);
    controlsTimeout = window.setTimeout(() => {
      topBar.classList.remove('visible');
    }, 3000);
  }
}, { passive: true });

canvas.addEventListener('touchmove', (e) => {
  if (!getFullscreenEl()) return;
  const deltaY = e.touches[0].clientY - touchStartY;
  // Swipe down from top edge reveals controls
  if (touchStartY < 50 && deltaY > 30) {
    topBar.classList.add('visible');
  }
}, { passive: true });

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

let layerPanelOpen = true;
layerPanel.classList.add('open');
layersToggle.classList.add('active');
layersToggle.addEventListener('click', () => {
  layerPanelOpen = !layerPanelOpen;
  layersToggle.classList.toggle('active', layerPanelOpen);
  layerPanel.classList.toggle('open', layerPanelOpen);
});

// Close button for mobile
const panelCloseBtn = document.getElementById('panel-close-btn')!;
panelCloseBtn.addEventListener('click', () => {
  layerPanelOpen = false;
  layersToggle.classList.remove('active');
  layerPanel.classList.remove('open');
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

    // Config link for fractal effect (only in Foreground slot)
    let configLink: HTMLAnchorElement | null = null;
    if (slot.name === 'Foreground') {
      configLink = document.createElement('a');
      configLink.href = 'config.html';
      configLink.target = '_blank';
      configLink.className = 'slot-config-link';
      configLink.textContent = 'Config';
      configLink.style.display = slot.activeId === 'fractal' ? 'inline-block' : 'none';
    }

    select.addEventListener('change', () => {
      slot.activeId = select.value || null;
      applySlotSelections();
      buildConfigSection(slotDiv, slot);
      clearPresetHighlights();
      dirty = true;
      // Show/hide fractal config link
      if (configLink) {
        configLink.style.display = slot.activeId === 'fractal' ? 'inline-block' : 'none';
      }
    });

    header.appendChild(label);
    header.appendChild(select);
    if (configLink) header.appendChild(configLink);
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
        clearPresetHighlights();
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
        clearPresetHighlights();
      });
      row.appendChild(sel);
    } else if (cfg.type === 'buttons') {
      const btnWrap = document.createElement('div');
      btnWrap.className = 'config-buttons';
      for (const opt of cfg.options ?? []) {
        const btn = document.createElement('button');
        btn.className = 'config-btn' + (opt === cfg.value ? ' active' : '');
        btn.textContent = opt;
        btn.addEventListener('click', () => {
          effect.setConfigValue(cfg.key, opt);
          btnWrap.querySelectorAll('.config-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          clearPresetHighlights();
        });
        btnWrap.appendChild(btn);
      }
      row.appendChild(btnWrap);
    } else if (cfg.type === 'multi-toggle') {
      // Multiple selections allowed - buttons toggle independently
      const activeSet = new Set((cfg.value as string).split(',').filter(s => s));
      const btnWrap = document.createElement('div');
      btnWrap.className = 'config-buttons';
      for (const opt of cfg.options ?? []) {
        const btn = document.createElement('button');
        btn.className = 'config-btn' + (activeSet.has(opt) ? ' active' : '');
        btn.textContent = opt;
        btn.addEventListener('click', () => {
          effect.setConfigValue(cfg.key, opt);
          btn.classList.toggle('active');
          clearPresetHighlights();
        });
        btnWrap.appendChild(btn);
      }
      row.appendChild(btnWrap);
    } else if (cfg.type === 'toggle') {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = cfg.value as boolean;
      input.addEventListener('change', () => {
        effect.setConfigValue(cfg.key, input.checked);
        clearPresetHighlights();
      });
      row.appendChild(input);
    }

    configDiv.appendChild(row);
  }

  container.appendChild(configDiv);
}

// Default preset is Cosmic Spiral - set config before building panel
flowFieldEffect.setConfigValue('useWhite', true);

buildLayerPanel();

// --- Preset buttons ---

const presetPianoBtn = document.getElementById('preset-piano') as HTMLButtonElement;
const presetSpiralBtn = document.getElementById('preset-spiral') as HTMLButtonElement;
const presetFractalBtn = document.getElementById('preset-fractal') as HTMLButtonElement;
const presetWarpBtn = document.getElementById('preset-warp') as HTMLButtonElement;

// Default preset is Cosmic Spiral
presetSpiralBtn.classList.add('active');

function applyPreset(preset: 'piano' | 'spiral' | 'fractal' | 'warp'): void {
  if (preset === 'piano') {
    // Piano: Flow Field + Piano Roll
    layerSlots[0].activeId = 'flowfield';     // Background
    layerSlots[1].activeId = 'piano-roll';    // Foreground
    layerSlots[2].activeId = null;            // Overlay
    layerSlots[3].activeId = null;            // Melody
    layerSlots[4].activeId = null;            // Bass
  } else if (preset === 'spiral') {
    // Cosmic Spiral: Flow Field (white) + Note Spiral + Bass Clock
    layerSlots[0].activeId = 'flowfield';    // Background
    layerSlots[1].activeId = 'note-spiral';  // Foreground
    layerSlots[2].activeId = null;           // Overlay
    layerSlots[3].activeId = null;           // Melody
    layerSlots[4].activeId = 'bass-clock';   // Bass
    flowFieldEffect.setConfigValue('useWhite', true);
  } else if (preset === 'fractal') {
    // Fractal Dance: Domain Warp + Fractal + Groove Wave
    layerSlots[0].activeId = 'domain-warp';   // Background
    layerSlots[1].activeId = 'fractal';       // Foreground
    layerSlots[2].activeId = 'groove-wave';   // Overlay
    layerSlots[3].activeId = null;            // Melody
    layerSlots[4].activeId = null;            // Bass
  } else if (preset === 'warp') {
    // Warp Prism: Chladni + Note Spiral (ring) + Kaleidoscope + Bass Clock
    layerSlots[0].activeId = 'chladni';       // Background
    layerSlots[1].activeId = 'note-spiral';   // Foreground
    layerSlots[2].activeId = 'kaleidoscope';  // Overlay
    layerSlots[3].activeId = null;            // Melody
    layerSlots[4].activeId = 'bass-clock';    // Bass
    noteSpiralEffect.setConfigValue('setShapes', 'ring');
  }

  applySlotSelections();
  buildLayerPanel();
  dirty = true;

  // Update button active states
  presetPianoBtn.classList.toggle('active', preset === 'piano');
  presetSpiralBtn.classList.toggle('active', preset === 'spiral');
  presetFractalBtn.classList.toggle('active', preset === 'fractal');
  presetWarpBtn.classList.toggle('active', preset === 'warp');
}

presetPianoBtn.addEventListener('click', () => applyPreset('piano'));
presetSpiralBtn.addEventListener('click', () => applyPreset('spiral'));
presetFractalBtn.addEventListener('click', () => applyPreset('fractal'));
presetWarpBtn.addEventListener('click', () => applyPreset('warp'));

// Clear preset highlights when manual changes are made
function clearPresetHighlights(): void {
  presetPianoBtn.classList.remove('active');
  presetSpiralBtn.classList.remove('active');
  presetFractalBtn.classList.remove('active');
  presetWarpBtn.classList.remove('active');
}

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
// Also resize on fullscreen change (after a brief delay for the transition)
document.addEventListener('fullscreenchange', () => {
  setTimeout(resizeCanvas, 50);
});

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

// Click/tap canvas to play/pause in fullscreen
canvas.addEventListener('click', (e) => {
  if (getFullscreenEl() && timeline) {
    // Don't toggle if tapping near top (that's for controls)
    if (e.clientY > 100) {
      playBtn.click();
    }
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
