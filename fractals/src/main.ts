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
import { BassFireEffect } from './effects/bass-fire.ts';
import { NoteSpiralEffect } from './effects/note-spiral.ts';
import { StarSpiralEffect } from './effects/star-spiral.ts';
import { PianoRollEffect } from './effects/piano-roll.ts';
import { TheoryBarEffect } from './effects/theory-bar.ts';
import { StarFieldEffect } from './effects/star-field.ts';
import { GraphSculptureEffect } from './effects/graph-sculpture.ts';
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
  stateToURL,
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
import { GRAConfigPanel } from './gra-config.ts';

// --- Song list ---

interface SongEntry {
  name: string;
  file: string;
}

// --- Playlist Categories ---

type PlaylistCategory = 'classical' | 'bossa' | 'pop' | 'video';

const popSongs: SongEntry[] = [
  // Pop & rock anthems (energy arc: groove → build → peak → epic finale)
  { name: 'Africa (Toto)', file: 'toto-africa.mid' },                                     // iconic opener
  { name: 'Billie Jean (Michael Jackson)', file: 'mj-billie-jean.mid' },                  // groove foundation
  { name: 'Don\'t Stop Believin\' (Journey)', file: 'journey-dont-stop.mid' },            // building anthem
  { name: 'Never Gonna Give You Up (Rick Astley)', file: 'rick-astley-never-gonna.mid' }, // fun energy
  { name: 'Dancing Queen (ABBA)', file: 'abba-dancing-queen.mid' },                       // disco high
  { name: 'Stayin\' Alive (Bee Gees)', file: 'bee-gees-stayin-alive.mid' },               // disco high
  { name: 'Eye of the Tiger (Survivor)', file: 'survivor-eye-of-tiger.mid' },             // pump up
  { name: 'The Final Countdown (Europe)', file: 'europe-final-countdown.mid' },           // dramatic
  { name: 'Livin\' on a Prayer (Bon Jovi)', file: 'bon-jovi-livin-prayer.mid' },          // PEAK anthem
  { name: 'Sweet Child O\' Mine (Guns N\' Roses)', file: 'gnr-sweet-child.mid' },         // rock sustain
  { name: 'Bohemian Rhapsody (Queen)', file: 'queen-bohemian-rhapsody.mid' },             // epic finale ♡
];

const videoSongs: SongEntry[] = [
  // Video game classics (energy arc: setup → build → peak at 2/3 → release)
  { name: 'Prelude (Final Fantasy VII)', file: 'ff7-prelude.mid' },                       // iconic arpeggio opener
  { name: 'Great Fairy Fountain (Zelda: OoT)', file: 'zelda-great-fairy-fountain.mid' }, // ethereal
  { name: 'Corridors of Time (Chrono Trigger)', file: 'corridors-of-time.mid' },         // dreamy
  { name: 'Pollyanna (Earthbound)', file: 'earthbound-pollyanna.mid' },                  // heartfelt
  { name: 'Song of Storms (Zelda: OoT)', file: 'zelda-song-of-storms.mid' },             // mysterious energy
  { name: 'Ground Theme (Super Mario Bros)', file: 'mario-ground-theme.mid' },           // iconic, building
  { name: 'Green Hill Zone (Sonic)', file: 'green-hill-zone.mid' },                      // energy rising
  { name: 'Gerudo Valley (Zelda: OoT)', file: 'zelda-gerudo-valley.mid' },               // high energy
  { name: 'Fight On! (Final Fantasy VII)', file: 'ff7-boss.mid' },                        // PEAK battle
  { name: 'Battle Theme (Golden Sun)', file: 'golden-sun-battle.mid' },                  // RPG intensity
  { name: 'To Zanarkand (Final Fantasy X)', file: 'to-zanarkand.mid' },                  // emotional cooldown
  { name: 'Aquatic Ambiance (Donkey Kong Country)', file: 'dkc-aquatic-ambiance.mid' },  // serene ending ♡
];

const bossaSongs: SongEntry[] = [
  // Bossa Nova & Brazilian Jazz (energy arc: intimate → build → peak → playful end)
  { name: 'The Girl from Ipanema (Jobim)', file: 'jobim-girl-from-ipanema.mid' },        // iconic opener
  { name: 'Corcovado (Jobim)', file: 'jobim-corcovado.mid' },                            // intimate
  { name: 'Meditation (Jobim)', file: 'jobim-meditation.mid' },                          // gentle
  { name: 'How Insensitive (Jobim)', file: 'jobim-how-insensitive.mid' },                // melancholic
  { name: 'Black Orpheus (Luiz Bonfa)', file: 'bonfa-black-orpheus.mid' },               // beautiful lift
  { name: 'Este Seu Olhar (Jobim)', file: 'jobim-este-seu-olhar.mid' },                  // romantic
  { name: 'Gabriela Theme (Jobim)', file: 'jobim-gabriela.mid' },                        // cinematic
  { name: 'Blue Bossa (Kenny Dorham)', file: 'dorham-blue-bossa.mid' },                  // grooving jazz
  { name: 'Mas Que Nada (Jorge Ben)', file: 'jorge-ben-mas-que-nada.mid' },              // HIGH PEAK
  { name: 'Tico Tico (Zequinha Abreu)', file: 'abreu-tico-tico.mid' },                   // high energy
  { name: 'So Nice / Summer Samba (Valle)', file: 'valle-so-nice.mid' },                 // upbeat cooldown
  { name: 'New Wave Bossa Nova (Zelda MM)', file: 'zelda-new-wave-bossa.mid' },          // playful ending ♡
];

const classicalSongs: SongEntry[] = [
  // Classical masters (energy arc: dreamy → build → triumphant peak → dramatic end)
  { name: 'Clair de Lune (Debussy)', file: 'clair-de-lune.mid' },                        // dreamy opening
  { name: 'Nocturne Op.9 No.2 (Chopin)', file: 'chopin-nocturne.mid' },                  // gentle, romantic
  { name: 'Prelude in C Major (Bach)', file: 'bach-prelude-c.mid' },                     // flowing
  { name: 'Für Elise (Beethoven)', file: 'beethoven-fur-elise.mid' },                    // familiar, gentle
  { name: 'Dance of Sugar Plum Fairy (Tchaikovsky)', file: 'tchaikovsky-sugar-plum.mid' }, // delicate lift
  { name: 'Canon in D (Pachelbel)', file: 'pachelbel-canon.mid' },                       // building
  { name: 'Eine Kleine Nachtmusik (Mozart)', file: 'mozart-eine-kleine.mid' },           // bright energy
  { name: 'Hall of Mountain King (Grieg)', file: 'grieg-mountain-king.mid' },            // dramatic build
  { name: 'Spring - Four Seasons (Vivaldi)', file: 'vivaldi-spring.mid' },               // high energy
  { name: 'Ode to Joy (Beethoven)', file: 'beethoven-ode-to-joy.mid' },                  // TRIUMPHANT PEAK
  { name: 'Lacrimosa - Requiem (Mozart)', file: 'mozart-lacrimosa.mid' },                // emotional cooldown
  { name: 'Toccata & Fugue (Bach)', file: 'bach-toccata-fugue.mid' },                    // dramatic finale ♡
];

const playlists: Record<PlaylistCategory, SongEntry[]> = {
  classical: classicalSongs,
  bossa: bossaSongs,
  pop: popSongs,
  video: videoSongs,
};

let currentPlaylist: PlaylistCategory = 'bossa';

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
const bassFireEffect = new BassFireEffect();
const noteSpiralEffect = new NoteSpiralEffect();
const starSpiralEffect = new StarSpiralEffect();
const pianoRollEffect = new PianoRollEffect();
const theoryBarEffect = new TheoryBarEffect();
const starFieldEffect = new StarFieldEffect();
const graphSculptureEffect = new GraphSculptureEffect();

// --- Layer slot definitions (mutually exclusive within each slot) ---

interface LayerSlot {
  name: string;
  effects: VisualEffect[];
  activeId: string | null; // null = "None"
}

const layerSlots: LayerSlot[] = [
  {
    name: 'Background',
    effects: [starFieldEffect, domainWarpEffect, waveEffect, chladniEffect, flowFieldEffect],
    activeId: 'flowfield',  // Fractal Dance default
  },
  {
    name: 'Foreground',
    effects: [pianoRollEffect, tonnetzEffect, fractalEffect, noteSpiralEffect, starSpiralEffect, graphSculptureEffect],
    activeId: 'graph-sculpture',  // Graph Sculpture default
  },
  {
    name: 'Overlay',
    effects: [kaleidoscopeEffect],
    activeId: null,
  },
  {
    name: 'Melody',
    effects: [melodyAuroraEffect, melodyWebEffect, melodyClockEffect],
    activeId: null,
  },
  {
    name: 'Bass',
    effects: [bassWebEffect, bassClockEffect, bassFireEffect],
    activeId: null,
  },
  {
    name: 'HUD',
    effects: [theoryBarEffect],
    activeId: 'theory-bar',  // Fractal Dance default
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

  // If no URL params, apply default Warp preset (including configs)
  if (!urlState) {
    const defaultPreset = getPresetState('warp');
    if (defaultPreset) {
      applyState(defaultPreset, layerSlots, getAllEffects());
    }
    applySlotSelections();
    result.presetApplied = 'warp';
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
        <button class="hamburger-btn" id="hamburger-btn" title="Menu">
          <span></span><span></span><span></span>
        </button>
        <div class="mobile-presets mobile-only">
          <button class="mobile-preset-btn" id="mobile-bar-warp">Warp</button>
          <button class="mobile-preset-btn" id="mobile-bar-spiral">Spiral</button>
          <button class="mobile-preset-btn" id="mobile-bar-clock">Clock</button>
          <button class="mobile-preset-btn" id="mobile-bar-sculpture">Sculpt</button>
        </div>
        <div class="transport-compact">
          <button class="transport-btn" id="prev-btn" title="Previous track">&#x23EE;</button>
          <button class="transport-btn" id="play-btn" disabled>&#9654;</button>
          <button class="transport-btn" id="next-btn" title="Next track">&#x23ED;</button>
        </div>
        <div class="playlist-category-wrap desktop-only">
          <button class="toggle-btn playlist-btn active" id="playlist-bossa" title="Bossa nova">Bossa</button>
          <button class="toggle-btn playlist-btn" id="playlist-classical" title="Classical">Classical</button>
          <button class="toggle-btn playlist-btn" id="playlist-pop" title="Pop & rock">Classics</button>
          <button class="toggle-btn playlist-btn" id="playlist-video" title="Video games">Games</button>
        </div>
        <div class="song-picker-wrap">
          <select id="song-picker">
            ${bossaSongs.map((s, i) => `<option value="${i}"${i === 3 ? ' selected' : ''}>${s.name}</option>`).join('')}
          </select>
        </div>
        <div class="seek-wrap">
          <input type="range" id="seek-bar" min="0" max="100" step="0.1" value="0" disabled>
          <span class="time-display" id="time-display">0:00 / 0:00</span>
        </div>
        <div class="preset-buttons desktop-only">
          <button class="toggle-btn preset-btn" id="preset-warp" title="Chladni + Note Spiral + Kaleidoscope">Warp</button>
          <button class="toggle-btn preset-btn" id="preset-spiral" title="Starfield + Star Spiral + Bass Fire">Spiral</button>
          <button class="toggle-btn preset-btn" id="preset-clock" title="Starfield + Note Spiral + Bass Clock">Clock</button>
          <button class="toggle-btn preset-btn" id="preset-fractal" title="Flow Field + Fractal + Theory Bar" style="display:none;">Fractal</button>
          <button class="toggle-btn preset-btn" id="preset-sculpture" title="Graph Sculpture + Theory Bar">Sculpture</button>
          <button class="toggle-btn preset-btn" id="preset-piano" title="Flow Field + Piano Roll">Piano</button>
          <button class="toggle-btn" id="layers-toggle">Custom</button>
          <div class="custom-presets-wrap" id="custom-presets"></div>
          <button class="reset-presets-btn" id="reset-presets-btn" title="Delete all custom presets" style="display:none;">Reset</button>
        </div>
        <button class="transport-btn" id="fullscreen-btn" title="Fullscreen">&#x26F6;</button>
      </div>
    </header>

    <!-- Mobile menu -->
    <div class="mobile-menu" id="mobile-menu">
      <div class="mobile-menu-header">
        <span>Menu</span>
        <button class="mobile-menu-close" id="mobile-menu-close">&times;</button>
      </div>
      <div class="mobile-menu-section">
        <div class="mobile-menu-label">Playlist</div>
        <div class="mobile-menu-buttons">
          <button class="toggle-btn playlist-btn active" id="mobile-playlist-bossa">Bossa</button>
          <button class="toggle-btn playlist-btn" id="mobile-playlist-classical">Classical</button>
          <button class="toggle-btn playlist-btn" id="mobile-playlist-pop">Classics</button>
          <button class="toggle-btn playlist-btn" id="mobile-playlist-video">Games</button>
        </div>
      </div>
      <div class="mobile-menu-section">
        <div class="mobile-menu-label">View</div>
        <div class="mobile-menu-buttons">
          <button class="toggle-btn preset-btn" id="mobile-preset-warp">Warp</button>
          <button class="toggle-btn preset-btn" id="mobile-preset-spiral">Spiral</button>
          <button class="toggle-btn preset-btn" id="mobile-preset-clock">Clock</button>
          <button class="toggle-btn preset-btn" id="mobile-preset-fractal" style="display:none;">Fractal</button>
          <button class="toggle-btn preset-btn" id="mobile-preset-sculpture">Sculpture</button>
          <button class="toggle-btn preset-btn" id="mobile-preset-piano">Piano</button>
        </div>
      </div>
      <div class="mobile-menu-section">
        <button class="toggle-btn" id="mobile-layers-toggle">Custom Layers</button>
      </div>
    </div>
    <div class="mobile-menu-backdrop" id="mobile-menu-backdrop"></div>

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
        <div class="mobile-play-overlay" id="mobile-play-overlay">
          <button class="mobile-play-btn" id="mobile-play-btn">
            <svg viewBox="0 0 24 24" width="64" height="64">
              <path fill="currentColor" d="M8 5v14l11-7z"/>
            </svg>
            <span>Tap to Play</span>
          </button>
        </div>
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
      <div class="debug-row">
        <span class="debug-label">Audio</span>
        <span class="debug-value" id="audio-debug">--</span>
      </div>
      <div class="debug-logs" id="debug-logs" style="display:none; font-size:9px; max-height:150px; overflow-y:auto; margin-top:8px; border-top:1px solid #333; padding-top:8px;"></div>
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
  <div id="toast" class="toast"></div>
`;

// --- Toast notification ---
function showToast(message: string, duration = 4000): void {
  const toast = document.getElementById('toast')!;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// --- DOM refs ---

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const songPicker = document.getElementById('song-picker') as HTMLSelectElement;
const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
const seekBar = document.getElementById('seek-bar') as HTMLInputElement;
const timeDisplay = document.getElementById('time-display')!;
const keyDisplay = document.getElementById('key-display')!;
const bpmDisplay = document.getElementById('bpm-display')!;
const chordDisplay = document.getElementById('chord-display')!;
const fpsDisplay = document.getElementById('fps-display')!;
const audioDebugDisplay = document.getElementById('audio-debug')!;
const debugLogsDisplay = document.getElementById('debug-logs')!;
const layersToggle = document.getElementById('layers-toggle') as HTMLButtonElement;
const layerPanel = document.getElementById('layer-panel')!;
const layerList = document.getElementById('layer-list')!;
const fullscreenBtn = document.getElementById('fullscreen-btn') as HTMLButtonElement;
const debugOverlay = document.getElementById('debug-overlay') as HTMLElement;
const playlistClassicalBtn = document.getElementById('playlist-classical') as HTMLButtonElement;
const playlistBossaBtn = document.getElementById('playlist-bossa') as HTMLButtonElement;
const playlistPopBtn = document.getElementById('playlist-pop') as HTMLButtonElement;
const playlistVideoBtn = document.getElementById('playlist-video') as HTMLButtonElement;
const mobilePlayOverlay = document.getElementById('mobile-play-overlay')!;
const mobilePlayBtn = document.getElementById('mobile-play-btn')!;

// Mobile menu elements
const hamburgerBtn = document.getElementById('hamburger-btn')!;
const mobileMenu = document.getElementById('mobile-menu')!;
const mobileMenuClose = document.getElementById('mobile-menu-close')!;
const mobileMenuBackdrop = document.getElementById('mobile-menu-backdrop')!;

// Debug overlay visibility state
let debugOverlayVisible = false;

// --- Mobile play overlay ---
// Show on touch devices to ensure clean user gesture for audio unlock
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isTouchDevice) {
  mobilePlayOverlay.classList.add('visible');
}

mobilePlayBtn.addEventListener('click', async () => {
  mobilePlayOverlay.classList.remove('visible');
  // Trigger play which will unlock audio
  if (!isPlaying) {
    await audioPlayer.play();
    isPlaying = true;
    playBtn.textContent = '\u23F8';
  }
});

// Triple-tap on canvas to toggle theory bar with slide animation
let tapCount = 0;
let tapTimeout: number | null = null;
canvas.addEventListener('touchend', (e) => {
  // Ignore multi-touch (pinch zoom)
  if (e.changedTouches.length > 1) return;

  tapCount++;
  if (tapTimeout) clearTimeout(tapTimeout);
  tapTimeout = window.setTimeout(() => {
    if (tapCount >= 3) {
      // Toggle theory bar with animation
      const layer = compositor.getLayer('theory-bar');
      if (layer) {
        const willShow = !layer.enabled;
        if (willShow) {
          // Enable and animate in
          compositor.setEnabled('theory-bar', true);
          theoryBarEffect.animateIn();
        } else {
          // Animate out, then disable
          theoryBarEffect.animateOut(() => {
            compositor.setEnabled('theory-bar', false);
          });
        }
        dirty = true;
      }
    }
    tapCount = 0;
  }, 500);
}, { passive: true });

// Triple-click on canvas to toggle theory bar (mirrors triple-tap on mobile)
let clickCount = 0;
let clickTimeout: number | null = null;
canvas.addEventListener('click', () => {
  // Only count clicks outside fullscreen (fullscreen click handles play/pause)
  if (getFullscreenEl()) return;

  clickCount++;
  if (clickTimeout) clearTimeout(clickTimeout);
  clickTimeout = window.setTimeout(() => {
    if (clickCount >= 3) {
      // Toggle theory bar with animation
      const layer = compositor.getLayer('theory-bar');
      if (layer) {
        const willShow = !layer.enabled;
        if (willShow) {
          compositor.setEnabled('theory-bar', true);
          theoryBarEffect.animateIn();
        } else {
          theoryBarEffect.animateOut(() => {
            compositor.setEnabled('theory-bar', false);
          });
        }
        dirty = true;
      }
    }
    clickCount = 0;
  }, 400);
});

// --- Mobile menu ---
function openMobileMenu(): void {
  mobileMenu.classList.add('open');
  mobileMenuBackdrop.classList.add('visible');
}

function closeMobileMenu(): void {
  mobileMenu.classList.remove('open');
  mobileMenuBackdrop.classList.remove('visible');
}

hamburgerBtn.addEventListener('click', openMobileMenu);
mobileMenuClose.addEventListener('click', closeMobileMenu);
mobileMenuBackdrop.addEventListener('click', closeMobileMenu);

// Swipe to close mobile menu
let menuTouchStartX = 0;
let menuTouchStartY = 0;
mobileMenu.addEventListener('touchstart', (e) => {
  menuTouchStartX = e.touches[0].clientX;
  menuTouchStartY = e.touches[0].clientY;
}, { passive: true });

mobileMenu.addEventListener('touchend', (e) => {
  const deltaX = e.changedTouches[0].clientX - menuTouchStartX;
  const deltaY = e.changedTouches[0].clientY - menuTouchStartY;
  // Swipe left to close (must be mostly horizontal)
  if (deltaX < -50 && Math.abs(deltaY) < Math.abs(deltaX)) {
    closeMobileMenu();
  }
}, { passive: true });

// Mobile menu playlist buttons
document.getElementById('mobile-playlist-bossa')!.addEventListener('click', () => {
  switchPlaylist('bossa');
  updateMobilePlaylistButtons();
});
document.getElementById('mobile-playlist-classical')!.addEventListener('click', () => {
  switchPlaylist('classical');
  updateMobilePlaylistButtons();
});
document.getElementById('mobile-playlist-pop')!.addEventListener('click', () => {
  switchPlaylist('pop');
  updateMobilePlaylistButtons();
});
document.getElementById('mobile-playlist-video')!.addEventListener('click', () => {
  switchPlaylist('video');
  updateMobilePlaylistButtons();
});

function updateMobilePlaylistButtons(): void {
  document.getElementById('mobile-playlist-bossa')!.classList.toggle('active', currentPlaylist === 'bossa');
  document.getElementById('mobile-playlist-classical')!.classList.toggle('active', currentPlaylist === 'classical');
  document.getElementById('mobile-playlist-pop')!.classList.toggle('active', currentPlaylist === 'pop');
  document.getElementById('mobile-playlist-video')!.classList.toggle('active', currentPlaylist === 'video');
}

// Mobile menu preset buttons (will wire up after preset functions are defined)
// Mobile layers toggle (will wire up after layers toggle is set up)

// --- Playlist category switching ---

function switchPlaylist(category: PlaylistCategory): void {
  if (currentPlaylist === category) return;
  currentPlaylist = category;

  // Update button states
  playlistClassicalBtn.classList.toggle('active', category === 'classical');
  playlistBossaBtn.classList.toggle('active', category === 'bossa');
  playlistPopBtn.classList.toggle('active', category === 'pop');
  playlistVideoBtn.classList.toggle('active', category === 'video');

  // Rebuild song picker options (keep current song playing)
  const currentSongs = playlists[category];
  songPicker.innerHTML = currentSongs.map((s, i) => `<option value="${i}">${s.name}</option>`).join('');
  songPicker.value = '0';
  updateBrowserURL();
}

function getCurrentSongs(): SongEntry[] {
  return playlists[currentPlaylist];
}

// --- Update URL to reflect current settings (using state module) ---

function updateBrowserURL(): void {
  const state = getCurrentState(layerSlots);
  const baseQuery = stateToURL(state);

  // Add playlist and track params (only if non-default)
  const params = new URLSearchParams(baseQuery);

  // Playlist/track use short param names, separate from effect state
  // Default is bossa playlist, track 0
  if (currentPlaylist !== 'bossa') {
    params.set('l', currentPlaylist);
  }
  if (songPicker.value !== '0') {
    params.set('t', songPicker.value);
  }

  const queryString = params.toString();
  const newURL = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;
  history.replaceState(null, '', newURL);
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

let layerPanelOpen = false;  // Closed by default
// layersToggle and layerPanel start without 'active'/'open' classes
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

// Mobile menu layers toggle
const mobileLayersToggle = document.getElementById('mobile-layers-toggle')!;
mobileLayersToggle.addEventListener('click', () => {
  layerPanelOpen = true;
  layersToggle.classList.add('active');
  layerPanel.classList.add('open');
  closeMobileMenu();
});

// --- Fractal Config Panel (created early for use in layer panel) ---

const fractalConfigPanel = new FractalConfigPanel();

// Refresh visuals when fractal config is saved
fractalConfigPanel.onSave = () => {
  dirty = true;
};

// --- GRA Config Panel (for graph-sculpture effect) ---

const graConfigPanel = new GRAConfigPanel();

// Config panels start closed - user can open via Config buttons

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

    // Config button for fractal and graph-sculpture effects (only in Foreground slot)
    let configBtn: HTMLButtonElement | null = null;
    if (slot.name === 'Foreground') {
      configBtn = document.createElement('button');
      configBtn.className = 'slot-config-link';
      configBtn.textContent = 'Config';
      const hasConfig = slot.activeId === 'fractal' || slot.activeId === 'graph-sculpture';
      configBtn.style.display = hasConfig ? 'block' : 'none';
      configBtn.addEventListener('click', () => {
        if (slot.activeId === 'fractal') {
          fractalConfigPanel.show();
        } else if (slot.activeId === 'graph-sculpture') {
          graConfigPanel.show();
        }
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
      // Show/hide config button for fractal and graph-sculpture
      if (configBtn) {
        const hasConfig = slot.activeId === 'fractal' || slot.activeId === 'graph-sculpture';
        configBtn.style.display = hasConfig ? 'block' : 'none';
      }
    });

    header.appendChild(label);
    header.appendChild(select);
    slotDiv.appendChild(header);

    // Config button on its own line (for effects with config panels)
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
      const valueStr = typeof cfg.value === 'string' ? cfg.value : String(cfg.value ?? '');
      const activeSet = new Set(valueStr.split(',').filter(s => s));
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

type PresetName = 'spiral' | 'clock' | 'warp' | 'fractal' | 'piano' | 'sculpture';
const presetButtons: Record<PresetName, HTMLButtonElement> = {
  spiral: document.getElementById('preset-spiral') as HTMLButtonElement,
  clock: document.getElementById('preset-clock') as HTMLButtonElement,
  warp: document.getElementById('preset-warp') as HTMLButtonElement,
  fractal: document.getElementById('preset-fractal') as HTMLButtonElement,
  piano: document.getElementById('preset-piano') as HTMLButtonElement,
  sculpture: document.getElementById('preset-sculpture') as HTMLButtonElement,
};

// Highlight preset button based on URL settings or default to Sculpture
if (urlSettingsResult.presetApplied) {
  const btn = presetButtons[urlSettingsResult.presetApplied as PresetName];
  if (btn) btn.classList.add('active');
} else if (!urlToState(window.location.search)) {
  // Default to Sculpture if no URL params
  presetButtons.sculpture.classList.add('active');
}

function applyPreset(preset: PresetName): void {
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
  for (const [name, btn] of Object.entries(presetButtons)) {
    btn.classList.toggle('active', name === preset);
  }
  // Also update mobile preset buttons
  if (typeof mobilePresetButtons !== 'undefined') {
    for (const [name, btn] of Object.entries(mobilePresetButtons)) {
      btn.classList.toggle('active', name === preset);
    }
  }
  // Also update mobile bar preset buttons
  if (typeof mobileBarPresets !== 'undefined') {
    for (const [name, btn] of Object.entries(mobileBarPresets)) {
      btn.classList.toggle('active', name === preset);
    }
  }

  updateBrowserURL();
}

for (const [name, btn] of Object.entries(presetButtons)) {
  btn.addEventListener('click', () => applyPreset(name as PresetName));
}

// Mobile preset buttons
const mobilePresetButtons: Record<PresetName, HTMLButtonElement> = {
  spiral: document.getElementById('mobile-preset-spiral') as HTMLButtonElement,
  clock: document.getElementById('mobile-preset-clock') as HTMLButtonElement,
  warp: document.getElementById('mobile-preset-warp') as HTMLButtonElement,
  fractal: document.getElementById('mobile-preset-fractal') as HTMLButtonElement,
  piano: document.getElementById('mobile-preset-piano') as HTMLButtonElement,
  sculpture: document.getElementById('mobile-preset-sculpture') as HTMLButtonElement,
};

for (const [name, btn] of Object.entries(mobilePresetButtons)) {
  btn.addEventListener('click', () => {
    applyPreset(name as PresetName);
    closeMobileMenu();
  });
}

// Sync mobile preset buttons with desktop on initial load
if (urlSettingsResult.presetApplied) {
  const mobileBtn = mobilePresetButtons[urlSettingsResult.presetApplied as PresetName];
  if (mobileBtn) mobileBtn.classList.add('active');
}

// Mobile bar preset buttons (in top bar)
const mobileBarPresets: Record<string, HTMLButtonElement> = {
  spiral: document.getElementById('mobile-bar-spiral') as HTMLButtonElement,
  clock: document.getElementById('mobile-bar-clock') as HTMLButtonElement,
  warp: document.getElementById('mobile-bar-warp') as HTMLButtonElement,
  sculpture: document.getElementById('mobile-bar-sculpture') as HTMLButtonElement,
};

for (const [name, btn] of Object.entries(mobileBarPresets)) {
  btn.addEventListener('click', () => applyPreset(name as PresetName));
}

// Sync mobile bar presets on initial load
if (urlSettingsResult.presetApplied && mobileBarPresets[urlSettingsResult.presetApplied]) {
  mobileBarPresets[urlSettingsResult.presetApplied].classList.add('active');
}

// Clear preset highlights when manual changes are made
function clearPresetHighlights(): void {
  for (const btn of Object.values(presetButtons)) {
    btn.classList.remove('active');
  }
  for (const btn of Object.values(mobilePresetButtons)) {
    btn.classList.remove('active');
  }
  for (const btn of Object.values(mobileBarPresets)) {
    btn.classList.remove('active');
  }
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

// Track DPR for coordinate transforms
let canvasDPR = 1;

function resizeCanvas(): void {
  const wrap = document.querySelector('.canvas-wrap')!;
  const rect = wrap.getBoundingClientRect();
  const isMobile = window.innerWidth <= 768;
  const isPortrait = window.innerHeight > window.innerWidth;
  const padding = window.innerWidth <= 480 ? 0 : 16;
  const availW = rect.width - padding;
  const availH = rect.height - padding;

  // Device pixel ratio for sharp rendering (cap at 2 for mobile performance)
  canvasDPR = Math.min(window.devicePixelRatio || 1, 2);

  // Minimum dimensions proportional to viewport
  const minHeight = Math.floor(window.innerHeight * 0.7);
  const minWidth = Math.floor(window.innerWidth * 0.8);

  // On mobile portrait, fill available space (relax 16:9 constraint)
  if (isMobile && isPortrait) {
    // Use a more portrait-friendly aspect ratio but don't go extreme
    const maxAspect = 4 / 3; // Don't go narrower than 4:3
    const naturalAspect = availW / availH;
    if (naturalAspect < maxAspect) {
      // Very tall/narrow - constrain to 4:3
      displayWidth = Math.floor(Math.max(minWidth, availW));
      displayHeight = Math.floor(Math.max(minHeight, displayWidth / maxAspect));
    } else {
      // Fill available space
      displayWidth = Math.floor(Math.max(minWidth, availW));
      displayHeight = Math.floor(Math.max(minHeight, availH));
    }
  } else {
    // Desktop/landscape: maintain 16:9
    const aspect = 16 / 9;
    if (availW / availH > aspect) {
      displayHeight = Math.floor(Math.max(minHeight, availH));
      displayWidth = Math.floor(Math.max(minWidth, displayHeight * aspect));
    } else {
      displayWidth = Math.floor(Math.max(minWidth, availW));
      displayHeight = Math.floor(Math.max(minHeight, displayWidth / aspect));
    }
  }

  // Set canvas buffer size (DPR-scaled for sharpness)
  canvas.width = Math.floor(displayWidth * canvasDPR);
  canvas.height = Math.floor(displayHeight * canvasDPR);

  // Set CSS size (logical pixels)
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';

  // Resize compositor with DPR-scaled dimensions
  compositor.resize(canvas.width, canvas.height);
  dirty = true;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);
// Listen for visual viewport changes (mobile browser chrome show/hide)
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', resizeCanvas);
}
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
  const song = getCurrentSongs()[index];
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
    const response = await fetch(`${import.meta.env.BASE_URL}midi/${song.file}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    midiBuffer = await response.arrayBuffer();
  } catch (e) {
    console.error('Failed to fetch MIDI:', e);
    showToast(`Failed to load: ${song.file}`);
    chordDisplay.textContent = 'Load failed';
    timeline = null;
    return;
  }

  try {
    timeline = analyzeMidiBuffer(midiBuffer);
  } catch (e) {
    console.error('Failed to analyze MIDI:', e);
    showToast(`Failed to analyze: ${song.file}`);
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

// Playlist category buttons
playlistClassicalBtn.addEventListener('click', () => switchPlaylist('classical'));
playlistBossaBtn.addEventListener('click', () => switchPlaylist('bossa'));
playlistPopBtn.addEventListener('click', () => switchPlaylist('pop'));
playlistVideoBtn.addEventListener('click', () => switchPlaylist('video'));

songPicker.addEventListener('change', async () => {
  if (songPicker.value === 'custom') return; // Already loaded
  const idx = parseInt(songPicker.value);
  if (!isNaN(idx)) {
    await loadSong(idx);
    updateBrowserURL();
    if (!isPlaying) playBtn.click();
  }
});

// Previous/Next track buttons
prevBtn.addEventListener('click', async () => {
  // If past 3 seconds, rewind to start instead of going to previous track
  const currentTime = audioPlayer.getCurrentTime();
  if (currentTime > 3) {
    audioPlayer.seek(0);
    musicMapper.reset();
    seekBar.value = '0';
    updateTimeDisplay(0);
    return;
  }

  const currentIdx = parseInt(songPicker.value);
  if (isNaN(currentIdx) || songPicker.value === 'custom') return;
  const currentSongs = getCurrentSongs();
  const prevIdx = (currentIdx - 1 + currentSongs.length) % currentSongs.length;
  songPicker.value = String(prevIdx);
  await loadSong(prevIdx);
  updateBrowserURL();
  if (!isPlaying) playBtn.click();
});

nextBtn.addEventListener('click', async () => {
  const currentIdx = parseInt(songPicker.value);
  if (isNaN(currentIdx) || songPicker.value === 'custom') return;
  const currentSongs = getCurrentSongs();
  const nextIdx = (currentIdx + 1) % currentSongs.length;
  songPicker.value = String(nextIdx);
  await loadSong(nextIdx);
  updateBrowserURL();
  if (!isPlaying) playBtn.click();
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

    // Update audio debug info
    if (debugOverlayVisible) {
      const audioDebug = audioPlayer.getDebugInfo();
      audioDebugDisplay.textContent = audioDebug.status;
      debugLogsDisplay.innerHTML = audioDebug.logs.map(l => `<div>${l}</div>`).join('');
      debugLogsDisplay.style.display = audioDebug.logs.length > 0 ? 'block' : 'none';
    }
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
      const currentSongs = getCurrentSongs();
      if (!isNaN(currentIdx) && currentIdx < currentSongs.length - 1) {
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
      const params = musicMapper.update(dt, currentTime, timeline.chords, timeline.drums, timeline.notes, timeline.barDrumInfo);

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
    const radius = idle.orbitRadius ?? 0.08;
    const cr = idle.real + radius * t * 0.5;
    const ci = idle.imag + radius * t * 0.5;

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

// Load playlist and track from URL params, or use defaults
const startupParams = new URLSearchParams(window.location.search);
const urlList = startupParams.get('l') as PlaylistCategory | null;
const urlTrack = startupParams.get('t');

if (urlList && playlists[urlList]) {
  currentPlaylist = urlList;
  // Update button states
  playlistClassicalBtn.classList.toggle('active', urlList === 'classical');
  playlistBossaBtn.classList.toggle('active', urlList === 'bossa');
  playlistPopBtn.classList.toggle('active', urlList === 'pop');
  playlistVideoBtn.classList.toggle('active', urlList === 'video');
  // Rebuild song picker
  const songs = playlists[urlList];
  songPicker.innerHTML = songs.map((s, i) => `<option value="${i}">${s.name}</option>`).join('');
}

const trackIdx = urlTrack !== null ? parseInt(urlTrack) : 0;
const validTrackIdx = !isNaN(trackIdx) && trackIdx >= 0 && trackIdx < playlists[currentPlaylist].length ? trackIdx : 0;
songPicker.value = String(validTrackIdx);
loadSong(validTrackIdx);
