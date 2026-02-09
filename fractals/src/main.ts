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
import { PianoRollEffect } from './effects/piano-roll.ts';
import { TheoryBarEffect } from './effects/theory-bar.ts';
import type { VisualEffect } from './effects/effect-interface.ts';
import {
  type VisualizerState,
  type CustomPreset,
  PRESET_LAYERS,
  DEFAULT_CONFIGS,
  getCurrentState,
  applyState,
  getPresetState,
  urlToState,
  updateBrowserURL as updateURL,
  getCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
  deleteAllCustomPresets,
  getFullState,
  applyFullState,
  validateStateSchema,
  migrateState,
  isFullExport,
  setCustomPresets,
  type FullExport,
} from './state.ts';
import { FractalConfigPanel } from './fractal-config.ts';

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

// --- URL Query Parameter System (uses state.ts) ---

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
// Notify musicMapper when fractal anchor preset changes
fractalEffect.setPresetChangeCallback(() => {
  musicMapper.reloadAnchors();
});
const flowFieldEffect = new FlowFieldEffect();
const kaleidoscopeEffect = new KaleidoscopeEffect();
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
const theoryBarEffect = new TheoryBarEffect();

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
    activeId: 'domainwarp',  // Fractal Dance default
  },
  {
    name: 'Foreground',
    effects: [pianoRollEffect, tonnetzEffect, fractalEffect, noteSpiralEffect],
    activeId: 'fractal',  // Fractal Dance default
  },
  {
    name: 'Overlay',
    effects: [kaleidoscopeEffect, theoryBarEffect],
    activeId: 'theory-bar',  // Fractal Dance default
  },
  {
    name: 'Melody',
    effects: [melodyAuroraEffect, melodyWebEffect, melodyClockEffect],
    activeId: null,  // Fractal Dance default
  },
  {
    name: 'Bass',
    effects: [bassWebEffect, bassClockEffect],
    activeId: null,  // Fractal Dance default
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

// Get all effects as a map for state management
function getAllEffects(): Map<string, VisualEffect> {
  const map = new Map<string, VisualEffect>();
  for (const slot of layerSlots) {
    for (const effect of slot.effects) {
      map.set(effect.id, effect);
    }
  }
  return map;
}

// Apply URL settings using state module
function applyURLSettings(): { presetApplied?: string } {
  const urlState = urlToState(window.location.search);
  const result: { presetApplied?: string } = {};

  // If no URL params, apply default Cosmic Spiral preset
  if (!urlState) {
    applySlotSelections();
    return result;
  }

  // Check if a preset was specified
  const params = new URLSearchParams(window.location.search);
  const preset = params.get('preset');
  if (preset && PRESET_LAYERS[preset]) {
    result.presetApplied = preset;
  }

  // Apply state from URL
  applyState(urlState as VisualizerState, layerSlots, getAllEffects());
  applySlotSelections();
  return result;
}

// Store URL settings result for use after DOM is ready
const urlSettingsResult = applyURLSettings();

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
        <div class="preset-buttons" style="margin-left: auto; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <span style="color: #888; font-size: 12px; margin-right: 4px;">Presets:</span>
          <button class="toggle-btn preset-btn" id="preset-spiral" title="Flow Field + Note Spiral + Bass Clock">Cosmic Spiral</button>
          <button class="toggle-btn preset-btn" id="preset-warp" title="Chladni + Note Spiral + Kaleidoscope + Bass Clock">Warp Prism</button>
          <button class="toggle-btn preset-btn" id="preset-fractal" title="Domain Warp + Fractal + Theory Bar">Fractal Dance</button>
          <button class="toggle-btn preset-btn" id="preset-piano" title="Flow Field + Piano Roll">Piano</button>
          <span style="color: #444; margin: 0 4px;">|</span>
          <div class="custom-presets-wrap" id="custom-presets"></div>
          <button class="reset-presets-btn" id="reset-presets-btn" title="Delete all custom presets">Reset</button>
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
        <div class="layer-panel-footer">
          <button class="save-preset-btn" id="save-preset-btn" title="Save current configuration as a preset">+ Save Preset</button>
          <div class="export-import-row">
            <div class="export-split-btn">
              <button class="export-file-btn" id="export-file-btn" title="Download as file">Export</button>
              <button class="export-copy-btn" id="export-copy-btn" title="Copy to clipboard">📋</button>
            </div>
            <button class="import-btn" id="import-btn" title="Import configuration from JSON">Import</button>
          </div>
          <div class="export-import-warning">Alpha – configs may break across versions</div>
        </div>
      </div>
      <div class="canvas-wrap">
        <canvas id="canvas"></canvas>
      </div>
    </div>

    <div class="debug-overlay" id="debug-overlay">
      <div class="debug-row">
        <span class="debug-label">Key</span>
        <span class="debug-value" id="key-display">--</span>
      </div>
      <div class="debug-row">
        <span class="debug-label">BPM</span>
        <span class="debug-value" id="bpm-display">--</span>
      </div>
      <div class="debug-row">
        <span class="debug-label">Chord</span>
        <span class="debug-value" id="chord-display">--</span>
      </div>
      <div class="debug-row">
        <span class="debug-label">Perf</span>
        <span class="debug-value" id="fps-display">--</span>
      </div>
    </div>
  </div>

  <!-- Modal overlay -->
  <div class="modal-overlay" id="modal-overlay">
    <div class="modal-box">
      <div class="modal-title" id="modal-title">Modal Title</div>
      <div class="modal-message" id="modal-message"></div>
      <input type="text" class="modal-input" id="modal-input" style="display: none;" placeholder="Preset name...">
      <div class="modal-buttons">
        <button class="modal-btn modal-btn-cancel" id="modal-cancel">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="modal-confirm">Confirm</button>
      </div>
    </div>
  </div>

  <!-- Import modal -->
  <div class="modal-overlay" id="import-modal-overlay">
    <div class="modal-box import-modal-box">
      <div class="modal-title">Import Configuration</div>
      <div class="import-tabs">
        <button class="import-tab active" data-tab="paste">Paste JSON</button>
        <button class="import-tab" data-tab="file">Upload File</button>
      </div>
      <div class="import-tab-content" id="import-paste-tab">
        <textarea class="import-textarea" id="import-textarea" placeholder="Paste JSON configuration here..."></textarea>
      </div>
      <div class="import-tab-content" id="import-file-tab" style="display: none;">
        <label class="import-file-label" id="import-file-label">
          <input type="file" id="import-file-input" accept=".json,application/json" style="display: none;">
          <span class="import-file-text">Click to select a JSON file</span>
        </label>
      </div>
      <div class="import-error" id="import-error"></div>
      <div class="modal-buttons">
        <button class="modal-btn modal-btn-cancel" id="import-cancel">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="import-confirm">Import</button>
      </div>
    </div>
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
const debugOverlay = document.getElementById('debug-overlay') as HTMLElement;

// Debug overlay visibility state
let debugOverlayVisible = false;

// --- Update URL to reflect current settings (using state module) ---

function updateBrowserURL(): void {
  const state = getCurrentState(layerSlots);
  updateURL(state);
}

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

let layerPanelOpen = true;  // Open by default for Fractal Dance
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

// --- Fractal Config Panel (created early for use in layer panel) ---

const fractalConfigPanel = new FractalConfigPanel();

// Refresh visuals when fractal config is saved
fractalConfigPanel.onSave = () => {
  dirty = true;
};

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

    // Config button for fractal effect (only in Foreground slot)
    let configBtn: HTMLButtonElement | null = null;
    if (slot.name === 'Foreground') {
      configBtn = document.createElement('button');
      configBtn.className = 'slot-config-link';
      configBtn.textContent = 'Config';
      configBtn.style.display = slot.activeId === 'fractal' ? 'block' : 'none';
      configBtn.addEventListener('click', () => {
        fractalConfigPanel.show();
      });
    }

    select.addEventListener('change', () => {
      slot.activeId = select.value || null;
      applySlotSelections();
      buildConfigSection(slotDiv, slot);
      clearPresetHighlights();
      dirty = true;
      markUnsavedChanges();
      updateBrowserURL();
      // Show/hide fractal config button
      if (configBtn) {
        configBtn.style.display = slot.activeId === 'fractal' ? 'block' : 'none';
      }
    });

    header.appendChild(label);
    header.appendChild(select);
    slotDiv.appendChild(header);

    // Config button on its own line (for fractal effect)
    if (configBtn) {
      slotDiv.appendChild(configBtn);
    }

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
        markUnsavedChanges();
        updateBrowserURL();
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
        markUnsavedChanges();
        updateBrowserURL();
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
          markUnsavedChanges();
          updateBrowserURL();
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
          markUnsavedChanges();
          updateBrowserURL();
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
        markUnsavedChanges();
        updateBrowserURL();
      });
      row.appendChild(input);
    }

    configDiv.appendChild(row);
  }

  container.appendChild(configDiv);
}

buildLayerPanel();

// --- Preset buttons ---

const presetPianoBtn = document.getElementById('preset-piano') as HTMLButtonElement;
const presetSpiralBtn = document.getElementById('preset-spiral') as HTMLButtonElement;
const presetFractalBtn = document.getElementById('preset-fractal') as HTMLButtonElement;
const presetWarpBtn = document.getElementById('preset-warp') as HTMLButtonElement;

// Highlight preset button based on URL settings or default to Cosmic Spiral
if (urlSettingsResult.presetApplied) {
  const btn = {
    piano: presetPianoBtn,
    spiral: presetSpiralBtn,
    fractal: presetFractalBtn,
    warp: presetWarpBtn,
  }[urlSettingsResult.presetApplied];
  if (btn) btn.classList.add('active');
} else if (!urlToState(window.location.search)) {
  // Default to Fractal Dance if no URL params
  presetFractalBtn.classList.add('active');
}

function applyPreset(preset: 'piano' | 'spiral' | 'fractal' | 'warp'): void {
  // Reset all effect configs to defaults first
  for (const [effectId, defaults] of Object.entries(DEFAULT_CONFIGS)) {
    const effect = getAllEffects().get(effectId);
    if (effect) {
      for (const [key, value] of Object.entries(defaults)) {
        effect.setConfigValue(key, value as string | number | boolean);
      }
    }
  }

  // Get preset state and apply it
  const presetState = getPresetState(preset);
  if (presetState) {
    applyState(presetState, layerSlots, getAllEffects());
  }

  applySlotSelections();
  buildLayerPanel();
  dirty = true;
  clearUnsavedChanges();

  // Update button active states
  presetPianoBtn.classList.toggle('active', preset === 'piano');
  presetSpiralBtn.classList.toggle('active', preset === 'spiral');
  presetFractalBtn.classList.toggle('active', preset === 'fractal');
  presetWarpBtn.classList.toggle('active', preset === 'warp');

  updateBrowserURL();
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
  // Also clear custom preset highlights
  document.querySelectorAll('.custom-preset-btn').forEach(btn => btn.classList.remove('active'));
}

// --- Modal helpers ---

const modalOverlay = document.getElementById('modal-overlay')!;
const modalTitle = document.getElementById('modal-title')!;
const modalMessage = document.getElementById('modal-message')!;
const modalInput = document.getElementById('modal-input') as HTMLInputElement;
const modalCancel = document.getElementById('modal-cancel')!;
const modalConfirm = document.getElementById('modal-confirm')!;

let modalResolve: ((value: string | null) => void) | null = null;

function showModal(options: {
  title: string;
  message?: string;
  showInput?: boolean;
  inputValue?: string;
  confirmText?: string;
  confirmClass?: 'primary' | 'danger';
}): Promise<string | null> {
  modalTitle.textContent = options.title;
  modalMessage.textContent = options.message || '';
  modalMessage.style.display = options.message ? 'block' : 'none';

  if (options.showInput) {
    modalInput.style.display = 'block';
    modalInput.value = options.inputValue || '';
    setTimeout(() => modalInput.focus(), 50);
  } else {
    modalInput.style.display = 'none';
  }

  modalConfirm.textContent = options.confirmText || 'Confirm';
  modalConfirm.className = 'modal-btn modal-btn-' + (options.confirmClass || 'primary');

  modalOverlay.classList.add('visible');

  return new Promise(resolve => {
    modalResolve = resolve;
  });
}

function hideModal(result: string | null): void {
  modalOverlay.classList.remove('visible');
  if (modalResolve) {
    modalResolve(result);
    modalResolve = null;
  }
}

modalCancel.addEventListener('click', () => hideModal(null));
modalConfirm.addEventListener('click', () => {
  const value = modalInput.style.display !== 'none' ? modalInput.value : 'confirmed';
  hideModal(value);
});
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) hideModal(null);
});
modalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    hideModal(modalInput.value);
  } else if (e.key === 'Escape') {
    hideModal(null);
  }
});

// --- Custom Presets UI ---

const customPresetsWrap = document.getElementById('custom-presets')!;
const savePresetBtn = document.getElementById('save-preset-btn')!;
const resetPresetsBtn = document.getElementById('reset-presets-btn')!;

let activeCustomPresetId: string | null = null;
let hasUnsavedChanges = false;

function markUnsavedChanges(): void {
  if (!hasUnsavedChanges) {
    hasUnsavedChanges = true;
    savePresetBtn.classList.add('has-changes');
  }
}

function clearUnsavedChanges(): void {
  hasUnsavedChanges = false;
  savePresetBtn.classList.remove('has-changes');
}

function renderCustomPresets(): void {
  const presets = getCustomPresets();
  customPresetsWrap.innerHTML = '';

  for (const preset of presets) {
    const btn = document.createElement('button');
    btn.className = 'custom-preset-btn' + (preset.id === activeCustomPresetId ? ' active' : '');
    btn.title = `Load "${preset.name}"`;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = preset.name;
    btn.appendChild(nameSpan);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'custom-preset-delete';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = 'Delete preset';
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const result = await showModal({
        title: 'Delete Preset',
        message: `Delete "${preset.name}"? This cannot be undone.`,
        confirmText: 'Delete',
        confirmClass: 'danger',
      });
      if (result) {
        deleteCustomPreset(preset.id);
        if (activeCustomPresetId === preset.id) {
          activeCustomPresetId = null;
        }
        renderCustomPresets();
      }
    });
    btn.appendChild(deleteBtn);

    btn.addEventListener('click', () => {
      applyCustomPreset(preset);
    });

    customPresetsWrap.appendChild(btn);
  }

  // Show/hide reset button based on whether there are presets
  resetPresetsBtn.style.display = presets.length > 0 ? 'block' : 'none';
}

function applyCustomPreset(preset: CustomPreset): void {
  // Reset to defaults first
  for (const [effectId, defaults] of Object.entries(DEFAULT_CONFIGS)) {
    const effect = getAllEffects().get(effectId);
    if (effect) {
      for (const [key, value] of Object.entries(defaults)) {
        effect.setConfigValue(key, value as string | number | boolean);
      }
    }
  }

  // Apply the preset state (including fractal anchors if present)
  applyFullState(preset.state, layerSlots, getAllEffects());
  applySlotSelections();
  buildLayerPanel();
  dirty = true;
  clearUnsavedChanges();

  // Update highlights
  clearPresetHighlights();
  activeCustomPresetId = preset.id;
  renderCustomPresets();

  updateBrowserURL();
}

savePresetBtn.addEventListener('click', async () => {
  const result = await showModal({
    title: 'Save Preset',
    message: 'Enter a name for this preset:',
    showInput: true,
    inputValue: '',
    confirmText: 'Save',
  });
  if (result && result.trim()) {
    const state = getFullState(layerSlots);
    const preset = saveCustomPreset(result.trim(), state);
    activeCustomPresetId = preset.id;
    clearPresetHighlights();
    clearUnsavedChanges();
    renderCustomPresets();
  }
});

resetPresetsBtn.addEventListener('click', async () => {
  const presets = getCustomPresets();
  const result = await showModal({
    title: 'Reset All Custom Presets',
    message: `This will permanently delete all ${presets.length} custom preset${presets.length === 1 ? '' : 's'}. This action cannot be undone.`,
    confirmText: 'Delete All',
    confirmClass: 'danger',
  });
  if (result) {
    deleteAllCustomPresets();
    activeCustomPresetId = null;
    renderCustomPresets();
  }
});

// --- Export/Import ---

const exportFileBtn = document.getElementById('export-file-btn')!;
const exportCopyBtn = document.getElementById('export-copy-btn')!;
const importBtn = document.getElementById('import-btn')!;
const importModalOverlay = document.getElementById('import-modal-overlay')!;
const importTextarea = document.getElementById('import-textarea') as HTMLTextAreaElement;
const importFileInput = document.getElementById('import-file-input') as HTMLInputElement;
const importFileLabel = document.getElementById('import-file-label')!;
const importError = document.getElementById('import-error')!;
const importCancel = document.getElementById('import-cancel')!;
const importConfirm = document.getElementById('import-confirm')!;
const importTabs = document.querySelectorAll('.import-tab');
const importPasteTab = document.getElementById('import-paste-tab')!;
const importFileTab = document.getElementById('import-file-tab')!;

let importedFileContent: string | null = null;

// Create full export data
function createExportData(): FullExport {
  return {
    exportVersion: 1,
    currentState: getFullState(layerSlots),
    customPresets: getCustomPresets(),
    exportedAt: Date.now(),
  };
}

// Export file - download JSON
exportFileBtn.addEventListener('click', () => {
  const exportData = createExportData();
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fractured-jukebox-config-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// Export copy - copy JSON to clipboard
exportCopyBtn.addEventListener('click', async () => {
  const exportData = createExportData();
  const json = JSON.stringify(exportData, null, 2);
  try {
    await navigator.clipboard.writeText(json);
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = json;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
  exportCopyBtn.classList.add('copied');
  exportCopyBtn.textContent = '✓';
  setTimeout(() => {
    exportCopyBtn.classList.remove('copied');
    exportCopyBtn.textContent = '📋';
  }, 1000);
});

// Import button - show modal
importBtn.addEventListener('click', () => {
  importTextarea.value = '';
  importFileInput.value = '';
  importedFileContent = null;
  importError.textContent = '';
  importFileLabel.classList.remove('has-file');
  importFileLabel.querySelector('.import-file-text')!.textContent = 'Click to select a JSON file';
  // Reset to paste tab
  importTabs.forEach(t => t.classList.remove('active'));
  importTabs[0].classList.add('active');
  importPasteTab.style.display = 'block';
  importFileTab.style.display = 'none';
  importModalOverlay.classList.add('visible');
});

// Tab switching
importTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.getAttribute('data-tab');
    importTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    importPasteTab.style.display = tabName === 'paste' ? 'block' : 'none';
    importFileTab.style.display = tabName === 'file' ? 'block' : 'none';
    importError.textContent = '';
  });
});

// File input change
importFileInput.addEventListener('change', () => {
  const file = importFileInput.files?.[0];
  if (file) {
    importFileLabel.classList.add('has-file');
    importFileLabel.querySelector('.import-file-text')!.textContent = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      importedFileContent = e.target?.result as string;
      importError.textContent = '';
    };
    reader.onerror = () => {
      importError.textContent = 'Failed to read file';
      importedFileContent = null;
    };
    reader.readAsText(file);
  }
});

// Cancel import
importCancel.addEventListener('click', () => {
  importModalOverlay.classList.remove('visible');
});

// Click outside to close
importModalOverlay.addEventListener('click', (e) => {
  if (e.target === importModalOverlay) {
    importModalOverlay.classList.remove('visible');
  }
});

// Confirm import
importConfirm.addEventListener('click', () => {
  const activeTab = document.querySelector('.import-tab.active')?.getAttribute('data-tab');
  let jsonString: string;

  if (activeTab === 'paste') {
    jsonString = importTextarea.value.trim();
  } else {
    if (!importedFileContent) {
      importError.textContent = 'Please select a file first';
      return;
    }
    jsonString = importedFileContent;
  }

  if (!jsonString) {
    importError.textContent = 'Please enter or upload JSON configuration';
    return;
  }

  // Try to parse JSON
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch {
    importError.textContent = 'Invalid JSON format';
    return;
  }

  // Validate schema
  const validationError = validateStateSchema(data);
  if (validationError) {
    importError.textContent = validationError;
    return;
  }

  // Apply the state - handle both FullExport and legacy VisualizerState formats
  if (isFullExport(data)) {
    // New format with presets
    const state = migrateState(data.currentState);
    applyFullState(state, layerSlots, getAllEffects());

    // Import custom presets
    if (data.customPresets && data.customPresets.length > 0) {
      setCustomPresets(data.customPresets);
    }
  } else {
    // Legacy format - just state
    const state = migrateState(data as VisualizerState);
    applyFullState(state, layerSlots, getAllEffects());
  }

  applySlotSelections();
  buildLayerPanel();
  dirty = true;
  clearUnsavedChanges();
  clearPresetHighlights();
  activeCustomPresetId = null;
  renderCustomPresets();
  updateBrowserURL();

  // Close modal
  importModalOverlay.classList.remove('visible');
});

// Initial render
renderCustomPresets();

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
  musicMapper.setSongDuration(timeline.duration, timeline.chords);
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

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ignore if typing in an input
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

  // Space bar to toggle play/pause
  if (e.code === 'Space' && timeline) {
    e.preventDefault();  // prevent page scroll
    playBtn.click();
  }

  // 'D' to toggle debug overlay
  if (e.code === 'KeyD') {
    debugOverlayVisible = !debugOverlayVisible;
    debugOverlay.classList.toggle('visible', debugOverlayVisible);
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

const qualityLabels: Record<string, string> = {
  major: '', minor: 'm', dim: 'dim', aug: 'aug',
  sus4: 'sus4', sus2: 'sus2',
  maj7: 'maj7', dom7: '7', min7: 'm7', hdim7: 'ø7', dim7: 'o7',
  unknown: '?',
};

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
    const chordName = `${root}${qualityLabels[currentChord.quality] ?? ''}`;
    const degree = currentChord.degree;

    // Build Roman numeral with quality indicators
    let display = chordName;
    if (degree > 0) {
      const isMinorQuality = ['minor', 'min7', 'dim', 'hdim7', 'dim7'].includes(currentChord.quality);
      let numeral = isMinorQuality ? romanNumerals[degree].toLowerCase() : romanNumerals[degree];

      // Add quality suffix to numeral
      if (currentChord.quality === 'dim') numeral += '°';
      else if (currentChord.quality === 'hdim7') numeral += 'ø7';
      else if (currentChord.quality === 'dim7') numeral += '°7';
      else if (currentChord.quality === 'dom7') numeral += '7';
      else if (currentChord.quality === 'min7') numeral += '7';
      else if (currentChord.quality === 'maj7') numeral += 'maj7';

      // Secondary dominant: show as V/x
      if (currentChord.isSecondary && currentChord.secondaryTarget > 0) {
        const targetNumeral = romanNumerals[currentChord.secondaryTarget];
        display = `${chordName}  V/${targetNumeral}`;
      } else {
        display = `${chordName}  ${numeral}`;
      }
    }

    // Add tension bar (visual indicator)
    const tensionBar = getTensionBar(currentChord.tension);

    // Chromatic indicator
    const chromaticMark = currentChord.isChromatic ? ' *' : '';

    chordDisplay.textContent = `${display}${chromaticMark} ${tensionBar}`;
  }
}

// Visual tension indicator using block characters
function getTensionBar(tension: number): string {
  const filled = Math.round(tension * 5);
  return '▪'.repeat(filled) + '▫'.repeat(5 - filled);
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

    // Ambiguity indicator: ? for high ambiguity
    const ambiguityMark = region.ambiguity > 0.6 ? '?' : '';

    // Show if this is a modulation (not the first region)
    if (regionIndex > 0) {
      keyDisplay.textContent = `Key: ${keyName}${modeLabel}${ambiguityMark} →`;
      keyDisplay.style.color = '#ffcc00'; // highlight modulation
    } else {
      keyDisplay.textContent = `Key: ${keyName}${modeLabel}${ambiguityMark}`;
      keyDisplay.style.color = region.ambiguity > 0.6 ? '#888' : '';
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
    // Idle (paused or no song)
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

    // When paused with a timeline, still show chord/key data at current position
    let idleMusic;
    if (timeline) {
      const pausedTime = parseFloat(seekBar.value) || 0;
      idleMusic = musicMapper.getMusicParams(dt, pausedTime);
    } else {
      idleMusic = musicMapper.getIdleMusicParams(dt);
    }

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

// Auto-load default song (To Zanarkand)
const defaultSongIdx = songs.findIndex(s => s.file === 'to-zanarkand.mid');
songPicker.value = String(defaultSongIdx >= 0 ? defaultSongIdx : 0);
loadSong(defaultSongIdx >= 0 ? defaultSongIdx : 0);
