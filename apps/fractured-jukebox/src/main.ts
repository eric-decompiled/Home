import './style.css';

// Sync theme from main site's localStorage or system preference (disable transitions during init)
document.documentElement.classList.add('theme-loading');
const storedTheme = localStorage.getItem('decompiled-theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const isLight = storedTheme ? storedTheme === 'light' : !prefersDark;
if (isLight) {
  document.documentElement.classList.add('light-mode');
}
requestAnimationFrame(() => document.documentElement.classList.remove('theme-loading'));

import { fractalEngine } from './fractal-engine.ts';
import { analyzeMidiBuffer, type MusicTimeline } from './midi-analyzer.ts';
import { audioPlayer, unlockAudio } from './audio-player.ts';
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
import { MelodyFireEffect } from './effects/melody-fire.ts';
import { BassWebEffect } from './effects/bass-web.ts';
import { BassClockEffect } from './effects/bass-clock.ts';
import { BassNumeralsEffect } from './effects/bass-numerals.ts';
import { MelodyNotesEffect } from './effects/melody-notes.ts';
import { BassFireEffect } from './effects/bass-fire.ts';
import { NoteSpiralEffect } from './effects/note-spiral.ts';
import { NoteStarEffect } from './effects/note-star.ts';
import { PianoRollEffect } from './effects/piano-roll.ts';
import { TheoryBarEffect } from './effects/theory-bar.ts';
import { StarFieldEffect } from './effects/star-field.ts';
import { GraphChainEffect } from './effects/graph-chain.ts';
import { FeedbackTrailEffect } from './effects/feedback-trail.ts';
import type { VisualEffect } from './effects/effect-interface.ts';
import {
  type VisualizerState,
  PRESET_LAYERS,
  getCurrentState,
  applyState,
  getPresetState,
  urlToState,
  stateToURL,
  saveCustomPreset,
  getCustomPresets,
  deleteCustomPreset,
} from './state.ts';
// Lazy-loaded fractal config module
let fractalConfigModule: typeof import('./fractal-config.ts') | null = null;
let fractalConfigPanel: InstanceType<typeof import('./fractal-config.ts').FractalConfigPanel> | null = null;
let fractalConfigPromise: Promise<typeof import('./fractal-config.ts')> | null = null;

async function ensureFractalConfigModule(): Promise<typeof import('./fractal-config.ts')> {
  if (fractalConfigModule) return fractalConfigModule;
  if (fractalConfigPromise) return fractalConfigPromise;

  fractalConfigPromise = import('./fractal-config.ts');
  fractalConfigModule = await fractalConfigPromise;
  return fractalConfigModule;
}

async function getFractalConfigPanel(): Promise<InstanceType<typeof import('./fractal-config.ts').FractalConfigPanel>> {
  if (fractalConfigPanel) return fractalConfigPanel;

  const mod = await ensureFractalConfigModule();
  fractalConfigPanel = new mod.FractalConfigPanel();
  fractalConfigPanel.onSave = () => {
    dirty = true;
    musicMapper.reloadAnchors();
  };
  fractalConfigPanel.onPresetsChange = () => {
    const foregroundSlot = layerSlots.find(s => s.name === 'Foreground');
    if (foregroundSlot && foregroundSlot.activeId === 'fractal') {
      const slotDiv = layerPanel.querySelector('.layer-slot[data-slot="Foreground"]') as HTMLDivElement;
      if (slotDiv) {
        buildConfigSection(slotDiv, foregroundSlot);
      }
    }
  };
  return fractalConfigPanel;
}

// Synchronous getter for user presets (returns empty if module not loaded yet)
function loadUserPresets(): Array<{ id: string; name: string }> {
  if (!fractalConfigModule) return [];
  return fractalConfigModule.loadUserPresets();
}
import { setCustomColor, clearCustomColors, getCustomColors, samplePaletteColor } from './effects/effect-utils.ts';
import { updateTweens } from './animation.ts';

// --- Song list ---

interface SongEntry {
  name: string;
  file: string;
  data?: ArrayBuffer;  // For uploaded MIDIs stored in memory
  duration?: number;   // Duration in seconds (from MIDI analysis)
}

// --- Playlist Categories ---

type PlaylistCategory = 'classical' | 'pop' | 'video' | 'uploads';

const popSongs: SongEntry[] = [
  // Classics - grouped by artist (with featured openers)
  { name: 'The Girl from Ipanema (Jobim)', file: 'jobim-girl-from-ipanema.mid', duration: 315 },
  { name: 'Eye of the Tiger (Survivor)', file: 'survivor-eye-of-tiger.mid', duration: 245 },
  { name: 'Never Gonna Give You Up (Rick Astley)', file: 'rick-astley-never-gonna.mid', duration: 213 },
  { name: 'Black Orpheus (Luiz Bonfa)', file: 'bonfa-black-orpheus.mid', duration: 195 },
  // ABBA
  { name: 'Money Money Money (ABBA)', file: 'abba-money-money-money.mid', duration: 183 },
  // Bee Gees
  { name: 'Stayin\' Alive (Bee Gees)', file: 'bee-gees-stayin-alive.mid', duration: 285 },
  // Bon Jovi
  { name: 'Livin\' on a Prayer (Bon Jovi)', file: 'bon-jovi-livin-prayer.mid', duration: 250 },
  // Bonnie Tyler
  { name: 'Total Eclipse of the Heart (Bonnie Tyler)', file: 'bonnie-tyler-total-eclipse.mid', duration: 334 },
  // Guns N' Roses
  { name: 'Sweet Child O\' Mine (Guns N\' Roses)', file: 'gnr-sweet-child.mid', duration: 356 },
  // Gary Numan
  { name: 'Cars (Gary Numan)', file: 'gary-numan-cars.mid', duration: 225 },
  // Michael Jackson
  { name: 'Billie Jean (Michael Jackson)', file: 'mj-billie-jean.mid', duration: 294 },
  { name: 'Thriller (Michael Jackson)', file: 'mj-thriller.mid', duration: 358 },
  // Queen
  { name: 'Bohemian Rhapsody (Queen)', file: 'queen-bohemian-rhapsody.mid', duration: 355 },
];

const videoSongs: SongEntry[] = [
  // Video game classics (energy arc: setup → build → peak at 2/3 → release)
  { name: 'Gerudo Valley (Zelda: OoT)', file: 'zelda-gerudo-valley.mid', duration: 147 },
  { name: 'Corridors of Time (Chrono Trigger)', file: 'corridors-of-time.mid', duration: 180 },
  { name: 'Balamb Garden (Final Fantasy VIII)', file: 'ff8-balamb-garden.mid', duration: 255 },
  { name: 'Ground Theme (Super Mario Bros)', file: 'mario-ground-theme.mid', duration: 95 },
  { name: 'Battle Theme (Golden Sun)', file: 'golden-sun-battle.mid', duration: 115 },
  { name: 'Great Fairy Fountain (Zelda: OoT)', file: 'zelda-great-fairy-fountain.mid', duration: 135 },
  { name: 'Green Hill Zone (Sonic)', file: 'green-hill-zone.mid', duration: 55 },
  { name: 'Man with Machine Gun (Final Fantasy VIII)', file: 'ff8-man-with-machine-gun.mid', duration: 195 },
  { name: 'Fight On! (Final Fantasy VII)', file: 'ff7-boss.mid', duration: 230 },
  { name: 'To Zanarkand (Final Fantasy X)', file: 'to-zanarkand.mid', duration: 195 },
  { name: 'Aquatic Ambiance (Donkey Kong Country)', file: 'dkc-aquatic-ambiance.mid', duration: 240 },
];

const classicalSongs: SongEntry[] = [
  // Grouped by composer (chronological era)
  // Baroque
  { name: 'Toccata & Fugue (Bach)', file: 'bach-toccata-fugue.mid', duration: 545 },
  { name: 'Prelude in C Major (Bach)', file: 'bach-prelude-c.mid', duration: 135 },
  { name: 'Canon in D (Pachelbel)', file: 'pachelbel-canon.mid', duration: 270 },
  { name: 'Spring - Four Seasons (Vivaldi)', file: 'vivaldi-spring.mid', duration: 205 },
  // Classical
  { name: 'Eine Kleine Nachtmusik (Mozart)', file: 'mozart-eine-kleine.mid', duration: 355 },
  { name: 'Lacrimosa - Requiem (Mozart)', file: 'mozart-lacrimosa.mid', duration: 195 },
  { name: 'Für Elise (Beethoven)', file: 'beethoven-fur-elise.mid', duration: 180 },
  { name: 'Pathetique Adagio (Beethoven)', file: 'beethoven-pathetique-adagio.mid', duration: 310 },
  { name: 'Ode to Joy (Beethoven)', file: 'beethoven-ode-to-joy.mid', duration: 245 },
  // Romantic
  { name: 'Nocturne Op.9 No.2 (Chopin)', file: 'chopin-nocturne.mid', duration: 275 },
  { name: 'Dance of Sugar Plum Fairy (Tchaikovsky)', file: 'tchaikovsky-sugar-plum.mid', duration: 95 },
  // Impressionist
  { name: 'Clair de Lune (Debussy)', file: 'clair-de-lune.mid', duration: 305 },
];

// User-uploaded songs (persisted to localStorage)
const uploadedSongs: SongEntry[] = [];

// Load uploads from localStorage
function loadUploadsFromStorage(): void {
  try {
    const stored = localStorage.getItem('uploadedMidis');
    if (!stored) return;
    const items = JSON.parse(stored) as Array<{ name: string; file: string; dataBase64: string }>;
    for (const item of items) {
      // Convert base64 back to ArrayBuffer
      const binary = atob(item.dataBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      uploadedSongs.push({
        name: item.name,
        file: item.file,
        data: bytes.buffer,
      });
    }
  } catch (e) {
    console.warn('Failed to load uploads from storage:', e);
  }
}

// Save uploads to localStorage
function saveUploadsToStorage(): void {
  try {
    const items = uploadedSongs.map(song => {
      // Convert ArrayBuffer to base64
      const bytes = new Uint8Array(song.data!);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return {
        name: song.name,
        file: song.file,
        dataBase64: btoa(binary),
      };
    });
    localStorage.setItem('uploadedMidis', JSON.stringify(items));
  } catch (e) {
    console.warn('Failed to save uploads to storage:', e);
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      showToast('Storage full - upload not saved');
    }
  }
}

// Load stored uploads on startup
loadUploadsFromStorage();

const playlists: Record<PlaylistCategory, SongEntry[]> = {
  classical: classicalSongs,
  pop: popSongs,
  video: videoSongs,
  uploads: uploadedSongs,
};

let currentPlaylist: PlaylistCategory = 'pop';

// --- State ---

let timeline: MusicTimeline | null = null;
let dirty = true;
let lastTime = 0;
let displayWidth = 800;
let displayHeight = 600;
let loadToken = 0; // Increments on each load to detect stale callbacks
let idlePhase = 0;
let needsInitialRender = true; // Render first frame when paused

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
(window as any).compositor = compositor; // Expose for profiling
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
const melodyFireEffect = new MelodyFireEffect();
const bassWebEffect = new BassWebEffect();
const bassClockEffect = new BassClockEffect();
const bassFireEffect = new BassFireEffect();
const bassNumeralsEffect = new BassNumeralsEffect();
const melodyNotesEffect = new MelodyNotesEffect();
const noteSpiralEffect = new NoteSpiralEffect();
const noteStarEffect = new NoteStarEffect();
const pianoRollEffect = new PianoRollEffect();
const theoryBarEffect = new TheoryBarEffect();
const starFieldEffect = new StarFieldEffect();
const graphChainEffect = new GraphChainEffect();
const feedbackTrailEffect = new FeedbackTrailEffect();

// --- Layer slot definitions (mutually exclusive within each slot) ---

interface LayerSlot {
  name: string;
  effects: VisualEffect[];
  activeId: string | null; // null = "None"
}

const layerSlots: LayerSlot[] = [
  {
    name: 'Foreground',
    effects: [noteStarEffect, noteSpiralEffect, graphChainEffect, fractalEffect, tonnetzEffect, pianoRollEffect],
    activeId: 'graph-chain',  // Graph Sculpture default
  },
  {
    name: 'Background',
    effects: [starFieldEffect, domainWarpEffect, waveEffect, chladniEffect, flowFieldEffect],
    activeId: 'flowfield',  // Fractal Dance default
  },
  {
    name: 'Overlay',
    effects: [kaleidoscopeEffect, feedbackTrailEffect],
    activeId: null,
  },
  {
    name: 'Melody',
    effects: [melodyAuroraEffect, melodyWebEffect, melodyClockEffect, melodyFireEffect],
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

// Bass numerals overlay (rendered when checkbox checked but no bass effect selected)
compositor.addLayer(bassNumeralsEffect, false);

// Melody notes overlay (rendered when checkbox checked but no melody effect selected)
compositor.addLayer(melodyNotesEffect, false);

// Display toggle states (declared early so applySlotSelections can use them)
let showBassNumerals = true;
let showMelodyNotes = true;

// Overlay toggle states (both can be enabled independently)
let kaleidoscopeEnabled = false;
let feedbackTrailEnabled = false;

// Apply initial active selections
function applySlotSelections(): void {
  for (const slot of layerSlots) {
    if (slot.name === 'Overlay') {
      // Overlay slot uses independent toggles, not mutually exclusive
      compositor.setEnabled('kaleidoscope', kaleidoscopeEnabled);
      compositor.setEnabled('feedback-trail', feedbackTrailEnabled);
    } else {
      for (const effect of slot.effects) {
        compositor.setEnabled(effect.id, effect.id === slot.activeId);
      }
    }
  }
  // Bass/melody overlays: show when checkbox checked AND no effect selected
  updateBassNumeralsOverlay();
  updateMelodyNotesOverlay();
}

function updateBassNumeralsOverlay(): void {
  const bassSlot = layerSlots.find(s => s.name === 'Bass');
  const noBassEffectSelected = !bassSlot?.activeId;
  compositor.setEnabled('bass-numerals', showBassNumerals && noBassEffectSelected);
}

function updateMelodyNotesOverlay(): void {
  const melodySlot = layerSlots.find(s => s.name === 'Melody');
  const activeId = melodySlot?.activeId;
  // Show overlay if no effect, or effect doesn't draw its own notes
  const effectsWithoutNotes = ['melody-aurora', 'melody-web', 'melody-fire'];
  const needsOverlay = !activeId || effectsWithoutNotes.includes(activeId);
  compositor.setEnabled('melody-notes', showMelodyNotes && needsOverlay);
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

// Helper to apply overlays from state result
function applyOverlaysFromState(overlays: string[]): void {
  kaleidoscopeEnabled = overlays.includes('kaleidoscope');
  feedbackTrailEnabled = overlays.includes('feedback-trail');
}

// Apply URL settings using state module
function applyURLSettings(): { presetApplied?: string } {
  const urlState = urlToState(window.location.search);
  const result: { presetApplied?: string } = {};

  // If no URL params, apply default preset (including configs)
  if (!urlState) {
    const defaultPreset = getPresetState('stars');
    if (defaultPreset) {
      const { overlays } = applyState(defaultPreset, layerSlots, getAllEffects());
      applyOverlaysFromState(overlays);
      // Sync toggle variables from preset configs (stars disables numerals/notes)
      const presetConfigs = defaultPreset.configs ?? {};
      const bassFireConfig = presetConfigs['bass-fire'] as Record<string, unknown> | undefined;
      const melodyConfig = presetConfigs['melody-clock'] as Record<string, unknown> | undefined;
      showBassNumerals = (bassFireConfig?.showNumerals ?? true) as boolean;
      showMelodyNotes = (melodyConfig?.showNotes ?? true) as boolean;
    }
    applySlotSelections();
    result.presetApplied = 'stars';
    return result;
  }

  // Check if a preset was specified
  const params = new URLSearchParams(window.location.search);
  const preset = params.get('preset');
  if (preset && PRESET_LAYERS[preset]) {
    result.presetApplied = preset;
  }

  // Apply state from URL
  const { overlays } = applyState(urlState as VisualizerState, layerSlots, getAllEffects());
  applyOverlaysFromState(overlays);
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
        <div class="preset-buttons desktop-only">
          <button class="toggle-btn" id="layers-toggle">Custom</button>
          <button class="toggle-btn preset-btn" id="preset-stars" title="Starfield + Note Star + Bass Fire">Stars</button>
          <button class="toggle-btn preset-btn" id="preset-clock" title="Starfield + Note Spiral + Bass Clock">Clock</button>
          <button class="toggle-btn preset-btn" id="preset-warp" title="Chladni + Note Spiral + Kaleidoscope">Warp</button>
          <button class="toggle-btn preset-btn" id="preset-piano" title="Flow Field + Piano Roll">Piano</button>
        </div>
        <div class="mobile-presets mobile-only">
          <button class="mobile-preset-btn" id="mobile-bar-stars">Stars</button>
          <button class="mobile-preset-btn" id="mobile-bar-clock">Clock</button>
          <button class="mobile-preset-btn" id="mobile-bar-warp">Warp</button>
          <button class="mobile-preset-btn mobile-preset-extra" id="mobile-bar-piano">Piano</button>
        </div>
        <div class="playback-bar">
          <div class="transport-compact">
            <button class="transport-btn" id="fullscreen-btn" title="Fullscreen">
              <svg viewBox="0 0 24 24" width="14" height="14" class="expand-icon"><path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
              <svg viewBox="0 0 24 24" width="14" height="14" class="compress-icon" style="display:none"><path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
            </button>
            <button class="transport-btn" id="prev-btn" title="Previous track">
              <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
            <button class="transport-btn" id="play-btn" disabled>
              <svg viewBox="0 0 24 24" width="14" height="14" class="play-icon"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
              <svg viewBox="0 0 24 24" width="14" height="14" class="pause-icon" style="display:none"><path fill="currentColor" d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>
            </button>
            <button class="transport-btn" id="next-btn" title="Next track">
              <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M6 18l8.5-6L6 6v12zm2 0V6l6.5 6L8 18zM16 6v12h2V6z"/></svg>
            </button>
          </div>
          <div class="seek-wrap">
            <input type="range" id="seek-bar" min="0" max="100" step="0.1" value="0" disabled>
            <span class="time-display" id="time-display">0:00 / 0:00</span>
          </div>
        </div>
        <div class="song-select-group">
          <div class="playlist-category-wrap desktop-only">
            <button class="toggle-btn playlist-btn active" id="playlist-pop" title="Pop & rock">Classics</button>
            <button class="toggle-btn playlist-btn" id="playlist-classical" title="Classical">Classical</button>
            <button class="toggle-btn playlist-btn" id="playlist-video" title="Video games">Games</button>
            <button class="toggle-btn playlist-btn playlist-uploads" id="playlist-uploads" title="Your uploaded MIDIs" style="display:none">Uploads</button>
          </div>
          <div class="playlist-picker-wrap mobile-only">
            <button class="playlist-picker-btn" id="playlist-picker-btn">
              <span class="playlist-picker-text" id="playlist-picker-text">Classics</span>
              <svg class="playlist-picker-arrow" viewBox="0 0 12 12" width="10" height="10"><path fill="currentColor" d="M2 4l4 4 4-4z"/></svg>
            </button>
            <div class="playlist-picker-menu" id="playlist-picker-menu">
              <div class="playlist-picker-item active" data-playlist="pop">Classics</div>
              <div class="playlist-picker-item" data-playlist="classical">Classical</div>
              <div class="playlist-picker-item" data-playlist="video">Games</div>
              <div class="playlist-picker-item playlist-uploads" data-playlist="uploads" style="display:none">Uploads</div>
            </div>
          </div>
          <div class="song-picker-wrap">
            <button class="song-picker-btn" id="song-picker-btn">
              <span class="song-picker-text" id="song-picker-text">${popSongs[0].name}</span>
              <svg class="song-picker-arrow" viewBox="0 0 12 12" width="10" height="10"><path fill="currentColor" d="M2 4l4 4 4-4z"/></svg>
            </button>
            <div class="song-picker-menu" id="song-picker-menu">
              ${popSongs.map((s, i) => `<div class="song-picker-item${i === 0 ? ' active' : ''}" data-index="${i}">${s.name}</div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </header>

    <div class="main-area">
      <div class="layer-panel" id="layer-panel">
        <div class="layer-panel-header">
          <div class="layer-panel-title">
            <span>Visuals</span>
            <button class="layer-info-btn" id="layer-info-btn" title="How this works">?</button>
          </div>
          <button class="panel-close-btn" id="panel-close-btn">&times;</button>
        </div>
        <div id="layer-list">
          <div class="colors-section" id="colors-section">
            <div class="colors-header">
              <span>Note Colors</span>
              <button class="colors-reset-btn" id="colors-reset-btn" title="Reset to defaults">Reset</button>
            </div>
            <div class="colors-grid" id="colors-grid"></div>
          </div>
          <div class="saved-presets" id="saved-presets" style="display: none;">
            <div class="saved-label">Saved Presets</div>
            <div class="saved-buttons" id="saved-buttons"></div>
          </div>
          <div class="experimental-presets" id="experimental-presets">
            <div class="experimental-label">Experimental Presets</div>
            <div class="experimental-buttons">
              <button class="toggle-btn preset-btn" id="preset-fractal" title="Flow Field + Fractal + Theory Bar">Fractal</button>
              <button class="toggle-btn preset-btn" id="preset-StarAurora" title="Stars + Aurora + Kaleidoscope">StarAurora</button>
              <button class="toggle-btn preset-btn" id="preset-KaliGraph" title="Graph Chain + Kaleidoscope">KaliGraph</button>
            </div>
          </div>
          <div class="quality-section" id="quality-section">
            <div class="quality-label">Render Quality</div>
            <div class="quality-buttons">
              <button class="toggle-btn quality-btn" id="quality-low" title="480p (854×480) - fastest">Fast</button>
              <button class="toggle-btn quality-btn" id="quality-medium" title="720p (1280×720) - balanced">Balanced</button>
              <button class="toggle-btn quality-btn active" id="quality-high" title="1080p (1920×1080) - sharpest">Sharp</button>
            </div>
          </div>
          <div class="theme-section" id="theme-section">
            <div class="theme-toggle-row">
              <span class="theme-label"><span class="theme-icon">🌙</span> Theme</span>
              <button class="theme-toggle" id="theme-toggle" title="Toggle light/dark mode"></button>
            </div>
          </div>
        </div>
        <div class="layer-panel-footer">
          <div class="layer-panel-footer-buttons">
            <button class="copy-link-btn" id="copy-link-btn" title="Copy a link with your current preset, layers, and effect settings">Copy Link</button>
            <button class="save-preset-btn" id="save-preset-btn" title="Save current settings as a preset">Save</button>
          </div>
        </div>
      </div>
      <div class="canvas-wrap">
        <canvas id="canvas"></canvas>
        <div class="play-overlay visible" id="play-overlay">
          <div class="play-overlay-info play-overlay-left">
            <div class="play-overlay-title">Views</div>
            <div class="play-overlay-item"><span class="play-overlay-label">Stars</span> — Travelling Stars</div>
            <div class="play-overlay-item"><span class="play-overlay-label">Clock</span> — Musical Mechanics</div>
            <div class="play-overlay-item"><span class="play-overlay-label">Warp</span> — Mandala Kaleidoscope</div>
            <div class="play-overlay-item"><span class="play-overlay-label">Piano</span> — Classic Visualizer</div>
          </div>
          <button class="play-overlay-btn" id="play-overlay-btn">
            <svg viewBox="0 0 24 24" width="64" height="64">
              <path fill="currentColor" d="M8 5v14l11-7z"/>
            </svg>
            <span>${'ontouchstart' in window ? 'Tap to Play' : 'Click to Play'}</span>
          </button>
          <div class="play-overlay-info play-overlay-right">
            <div class="play-overlay-title">Music</div>
            <div class="play-overlay-item"><span class="play-overlay-label">Classics</span> — Pop & Rock Hits</div>
            <div class="play-overlay-item"><span class="play-overlay-label">Classical</span> — Bach to Debussy</div>
            <div class="play-overlay-item"><span class="play-overlay-label">Games</span> — Game Soundtracks</div>
            <div class="play-overlay-item"><span class="play-overlay-label">Upload</span> — Your Own MIDI Files</div>
          </div>
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
    </div>
  </div>

  <div id="toast" class="toast"></div>

  <div class="layer-info-modal" id="layer-info-modal">
    <div class="layer-info-content">
      <div class="layer-info-header">
        <h3>Custom Visuals</h3>
        <button class="layer-info-close" id="layer-info-close">&times;</button>
      </div>
      <div class="layer-info-body">
        <p>Build your own visualizer by combining different layers. Each layer responds to different aspects of the music—melody, bass, rhythm, and harmony.</p>

        <div class="layer-info-section">
          <h4>Foreground</h4>
          <p class="layer-info-desc">Main visual elements showing notes and harmony.</p>
          <ul>
            <li><strong>Star</strong> – Glowing stars spiral inward as notes play, with beams for sustained notes</li>
            <li><strong>Spiral</strong> – All voices mapped to a spiral; pitch = angle, octave = radius</li>
            <li><strong>Piano Roll</strong> – Classic falling notes with a piano keyboard</li>
            <li><strong>Graph</strong> – Force-directed network that grows with the music</li>
            <li><strong>Fractal</strong> – Julia/Mandelbrot sets mapped to song key and harmony</li>
          </ul>
        </div>

        <div class="layer-info-section">
          <h4>Background</h4>
          <p class="layer-info-desc">Full-canvas animated backdrops that set the mood.</p>
          <ul>
            <li><strong>Starfield</strong> – Drifting stars that pulse with the beat</li>
            <li><strong>Flow Field</strong> – Flowing particles guided by harmonic energy</li>
            <li><strong>Chladni</strong> – Vibrating plate patterns that morph with chords</li>
            <li><strong>Domain Warp</strong> – Psychedelic noise warped by bass and melody</li>
          </ul>
        </div>

        <div class="layer-info-section">
          <h4>Overlay</h4>
          <p class="layer-info-desc">Post-processing effects applied on top.</p>
          <ul>
            <li><strong>Kaleidoscope</strong> – Mirror symmetry that rotates with the beat</li>
            <li><strong>Feedback Trail</strong> – Motion blur trails that follow the visuals</li>
            <li><strong>Theory Bar</strong> – Shows chord progressions and Roman numeral analysis</li>
          </ul>
        </div>

        <div class="layer-info-section">
          <h4>Melody & Bass</h4>
          <p class="layer-info-desc">Dedicated trackers for the top and bottom voices.</p>
          <ul>
            <li><strong>Melody Clock</strong> – Clock hand follows the melody line</li>
            <li><strong>Bass Clock</strong> – Tracks chord roots for harmonic movement</li>
            <li><strong>Webs</strong> – Connect recent notes as a network of relationships</li>
          </ul>
        </div>

        <div class="layer-info-section">
          <h4>Presets</h4>
          <p class="layer-info-desc">Curated combinations to get you started.</p>
          <ul>
            <li><strong>Stars</strong> – Starfield + Star + Bass Fire</li>
            <li><strong>Clock</strong> – Starfield + Spiral + Melody Clock + Bass Clock + Theory Bar</li>
            <li><strong>Warp</strong> – Chladni + Spiral + Kaleidoscope + Melody Clock + Bass Clock</li>
            <li><strong>Piano</strong> – Flow Field + Piano Roll</li>
            <li><strong>Fractal</strong> – Fractal + Kaleidoscope + Melody Web + Theory Bar</li>
            <li><strong>StarAurora</strong> – Star + Kaleidoscope + Melody Aurora + Bass Fire</li>
            <li><strong>KaliGraph</strong> – Graph + Kaleidoscope</li>
          </ul>
        </div>

        <p class="layer-info-tip">Tip: Start with a preset and customize from there. Only one effect per slot can be active at a time.</p>
      </div>
    </div>
  </div>

  <div class="save-modal-overlay" id="save-modal-overlay">
    <div class="save-modal">
      <div class="save-modal-header">Save Preset</div>
      <div class="save-modal-summary" id="save-modal-summary"></div>
      <input type="text" class="save-modal-input" id="save-modal-input" placeholder="Preset name" maxlength="24" autocomplete="off" />
      <div class="save-modal-buttons">
        <button class="save-modal-cancel" id="save-modal-cancel">Cancel</button>
        <button class="save-modal-confirm" id="save-modal-confirm">Save</button>
      </div>
    </div>
  </div>
`;

// --- Toast notification ---
function showToast(message: string, duration = 4000, type: 'error' | 'info' = 'error'): void {
  const toast = document.getElementById('toast')!;
  toast.textContent = message;
  toast.classList.remove('error', 'info');
  toast.classList.add('show', type);
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// --- DOM refs ---

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

// Custom song picker dropdown
const songPickerWrap = document.querySelector('.song-picker-wrap') as HTMLElement;
const songPickerBtn = document.getElementById('song-picker-btn') as HTMLButtonElement;
const songPickerText = document.getElementById('song-picker-text') as HTMLElement;
const songPickerMenu = document.getElementById('song-picker-menu') as HTMLElement;

// Custom scroll indicator (always visible) - wrapper needed for positioning
const scrollWrap = document.createElement('div');
scrollWrap.className = 'song-picker-scroll-wrap';
const scrollTrack = document.createElement('div');
scrollTrack.className = 'song-picker-scroll-track';
const scrollThumb = document.createElement('div');
scrollThumb.className = 'song-picker-scroll-thumb';
scrollTrack.appendChild(scrollThumb);
scrollWrap.appendChild(scrollTrack);
// Insert after menu, position via CSS
songPickerMenu.insertAdjacentElement('afterend', scrollWrap);

function updateScrollIndicator(): void {
  const isOpen = songPickerWrap.classList.contains('open');
  const { scrollTop, scrollHeight, clientHeight } = songPickerMenu;
  // Check if scrollable (with small tolerance for rounding)
  const scrollable = scrollHeight > clientHeight + 1;

  if (!isOpen) {
    scrollWrap.style.display = 'none';
    return;
  }

  scrollWrap.style.display = scrollable ? 'block' : 'none';
  if (scrollable) {
    // Match wrap height to menu height
    scrollWrap.style.height = `${clientHeight}px`;
    const trackHeight = clientHeight - 16; // Account for padding
    const thumbHeight = Math.max(30, (clientHeight / scrollHeight) * trackHeight);
    const maxScroll = scrollHeight - clientHeight;
    const thumbTop = maxScroll > 0 ? (scrollTop / maxScroll) * (trackHeight - thumbHeight) : 0;
    scrollThumb.style.height = `${thumbHeight}px`;
    scrollThumb.style.top = `${thumbTop}px`;
  }
}

songPickerMenu.addEventListener('scroll', updateScrollIndicator);
// Update when menu opens/closes (double rAF ensures layout is complete)
const menuObserver = new MutationObserver(() => {
  requestAnimationFrame(() => {
    requestAnimationFrame(updateScrollIndicator);
  });
});
menuObserver.observe(songPickerWrap, { attributes: true, attributeFilter: ['class'] });

// Create a songPicker interface that mimics select behavior
const songPicker = {
  _value: '0',
  _changeListeners: [] as (() => void)[],

  get value(): string {
    return this._value;
  },

  set value(v: string) {
    this._value = v;
    const idx = parseInt(v);
    // Update text from menu item (late binding - avoids dependency on getCurrentSongs)
    const items = songPickerMenu.querySelectorAll('.song-picker-item');
    if (!isNaN(idx) && items[idx]) {
      songPickerText.textContent = items[idx].textContent || '';
      // Update active state
      items.forEach((item, i) => {
        item.classList.toggle('active', i === idx);
      });
    }
  },

  set innerHTML(html: string) {
    // Parse option tags and create menu items
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<select>${html}</select>`, 'text/html');
    const options = doc.querySelectorAll('option');
    songPickerMenu.innerHTML = Array.from(options).map((opt, i) =>
      `<div class="song-picker-item${i === 0 ? ' active' : ''}" data-index="${opt.value}">${opt.textContent}</div>`
    ).join('');
    // Re-bind click handlers
    songPickerMenu.querySelectorAll('.song-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = item.getAttribute('data-index') || '0';
        songPicker.value = idx;
        songPickerWrap.classList.remove('open');
        songPicker._changeListeners.forEach(fn => fn());
      });
    });
    // Update text to first item
    if (options.length > 0) {
      songPickerText.textContent = options[0].textContent || '';
    }
  },

  get parentElement() {
    return songPickerWrap;
  },

  addEventListener(event: string, handler: () => void) {
    if (event === 'change') {
      this._changeListeners.push(handler);
    }
  }
};

// Playlist picker dropdown (mobile) - define before use
const playlistPickerWrap = document.querySelector('.playlist-picker-wrap') as HTMLElement;
const playlistPickerBtn = document.getElementById('playlist-picker-btn') as HTMLButtonElement;
const playlistPickerText = document.getElementById('playlist-picker-text') as HTMLElement;
const playlistPickerMenu = document.getElementById('playlist-picker-menu') as HTMLElement;

// Toggle dropdown
songPickerBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  songPickerWrap.classList.toggle('open');
  playlistPickerWrap.classList.remove('open');
});

// Close on outside click
document.addEventListener('click', () => {
  songPickerWrap.classList.remove('open');
  playlistPickerWrap.classList.remove('open');
});

// Handle initial menu item clicks
songPickerMenu.querySelectorAll('.song-picker-item').forEach(item => {
  item.addEventListener('click', () => {
    const idx = item.getAttribute('data-index') || '0';
    songPicker.value = idx;
    songPickerWrap.classList.remove('open');
    songPicker._changeListeners.forEach(fn => fn());
  });
});

// Keyboard navigation for song picker
let focusedItemIndex = -1;

function updateFocusedItem(newIndex: number): void {
  const items = songPickerMenu.querySelectorAll('.song-picker-item');
  if (items.length === 0) return;

  // Clamp index
  focusedItemIndex = Math.max(0, Math.min(newIndex, items.length - 1));

  // Update visual focus
  items.forEach((item, i) => {
    item.classList.toggle('focused', i === focusedItemIndex);
  });

  // Scroll into view
  items[focusedItemIndex]?.scrollIntoView({ block: 'nearest' });
}

songPickerBtn.addEventListener('keydown', (e) => {
  const isOpen = songPickerWrap.classList.contains('open');
  const items = songPickerMenu.querySelectorAll('.song-picker-item');

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (!isOpen) {
      songPickerWrap.classList.add('open');
      focusedItemIndex = parseInt(songPicker.value) || 0;
      updateFocusedItem(focusedItemIndex);
    } else {
      updateFocusedItem(focusedItemIndex + 1);
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (!isOpen) {
      songPickerWrap.classList.add('open');
      focusedItemIndex = parseInt(songPicker.value) || 0;
      updateFocusedItem(focusedItemIndex);
    } else {
      updateFocusedItem(focusedItemIndex - 1);
    }
  } else if (e.key === 'Enter' && isOpen) {
    e.preventDefault();
    if (focusedItemIndex >= 0 && focusedItemIndex < items.length) {
      const item = items[focusedItemIndex];
      const idx = item.getAttribute('data-index') || '0';
      songPicker.value = idx;
      songPickerWrap.classList.remove('open');
      songPicker._changeListeners.forEach(fn => fn());
    }
  } else if (e.key === 'Escape' && isOpen) {
    e.preventDefault();
    songPickerWrap.classList.remove('open');
  }
});

// Toggle playlist dropdown
playlistPickerBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  playlistPickerWrap.classList.toggle('open');
  songPickerWrap.classList.remove('open');
});

// Playlist picker item clicks
playlistPickerMenu.querySelectorAll('.playlist-picker-item').forEach(item => {
  item.addEventListener('click', async () => {
    const playlist = item.getAttribute('data-playlist') as PlaylistCategory;
    await switchPlaylist(playlist);
    updatePlaylistPickerState();
    playlistPickerWrap.classList.remove('open');
  });
});

// Sync playlist picker with current state
function updatePlaylistPickerState(): void {
  const labels: Record<PlaylistCategory, string> = {
    pop: 'Classics',
    classical: 'Classical',
    video: 'Games',
    uploads: 'Uploads',
  };
  playlistPickerText.textContent = labels[currentPlaylist];
  playlistPickerMenu.querySelectorAll('.playlist-picker-item').forEach(item => {
    const playlist = item.getAttribute('data-playlist');
    item.classList.toggle('active', playlist === currentPlaylist);
  });
}

const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
const playIcon = playBtn.querySelector('.play-icon') as SVGElement;
const pauseIcon = playBtn.querySelector('.pause-icon') as SVGElement;
const setPlayBtnState = (playing: boolean) => {
  playIcon.style.display = playing ? 'none' : 'block';
  pauseIcon.style.display = playing ? 'block' : 'none';
  const overlay = document.getElementById('play-overlay');
  if (playing) {
    // Dismiss play overlay whenever playback starts
    overlay?.classList.remove('visible');
  } else if (timeline) {
    // Show play overlay when paused (only if a song is loaded)
    overlay?.classList.add('visible');
  }
};
const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
const seekBar = document.getElementById('seek-bar') as HTMLInputElement;
const timeDisplay = document.getElementById('time-display')!;
const keyDisplay = document.getElementById('key-display')!;
const bpmDisplay = document.getElementById('bpm-display')!;
const chordDisplay = document.getElementById('chord-display')!;
const fpsDisplay = document.getElementById('fps-display')!;
const layersToggle = document.getElementById('layers-toggle') as HTMLButtonElement;
const layerPanel = document.getElementById('layer-panel')!;
let layerPanelOpen = false;
const layerList = document.getElementById('layer-list')!;
const colorsGrid = document.getElementById('colors-grid')!;
const colorsSection = document.getElementById('colors-section')!;
const savedPresetsSection = document.getElementById('saved-presets')!;
const experimentalPresetsSection = document.getElementById('experimental-presets')!;
const qualitySection = document.getElementById('quality-section')!;
const themeSection = document.getElementById('theme-section')!;
const themeToggle = document.getElementById('theme-toggle') as HTMLButtonElement;
const colorsResetBtn = document.getElementById('colors-reset-btn') as HTMLButtonElement;
const fullscreenBtn = document.getElementById('fullscreen-btn') as HTMLButtonElement;
const debugOverlay = document.getElementById('debug-overlay') as HTMLElement;
const playlistClassicalBtn = document.getElementById('playlist-classical') as HTMLButtonElement;
const playlistPopBtn = document.getElementById('playlist-pop') as HTMLButtonElement;
const playlistVideoBtn = document.getElementById('playlist-video') as HTMLButtonElement;
const playlistUploadsBtn = document.getElementById('playlist-uploads') as HTMLButtonElement;
const playOverlay = document.getElementById('play-overlay')!;

// Show uploads button if there are stored uploads
if (uploadedSongs.length > 0) {
  playlistUploadsBtn.style.display = '';
  (playlistPickerMenu.querySelector('[data-playlist="uploads"]') as HTMLElement).style.display = '';
}

// Initialize layer panel open state
if (layerPanelOpen) {
  layersToggle.classList.add('active');
  layerPanel.classList.add('open');
}

// Hamburger button (opens layer panel on mobile)
const hamburgerBtn = document.getElementById('hamburger-btn')!;

// Debug overlay visibility state
let debugOverlayVisible = false;

// --- Play overlay ---
// Show on all platforms to ensure clean user gesture for audio unlock
// Click anywhere on overlay to start playback
playOverlay.addEventListener('click', async () => {
  playOverlay.classList.remove('visible');
  // Trigger play which will unlock audio
  if (!audioPlayer.isPlaying()) {
    await audioPlayer.play();
  }
});

// Helper to toggle theory bar and sync with layer panel
let theoryBarHintShown = false;
function toggleTheoryBar(fromGesture = false): void {
  const layer = compositor.getLayer('theory-bar');
  if (!layer) return;

  const willShow = !layer.enabled;

  // Update layerSlots to match
  const hudSlot = layerSlots.find(s => s.name === 'HUD');
  if (hudSlot) {
    hudSlot.activeId = willShow ? 'theory-bar' : null;
  }

  if (willShow) {
    compositor.setEnabled('theory-bar', true);
    theoryBarEffect.animateIn();
  } else {
    theoryBarEffect.animateOut(() => {
      compositor.setEnabled('theory-bar', false);
    });
  }

  // Show info toast once per session on first gesture toggle
  if (fromGesture && !theoryBarHintShown) {
    theoryBarHintShown = true;
    const isTouch = 'ontouchstart' in window;
    if (isTouch) {
      showToast('Long-press to toggle theory bar', 3000, 'info');
    } else {
      const isMac = /Mac/.test(navigator.platform);
      const modifier = isMac ? '⌘' : 'Ctrl';
      showToast(`${modifier}+click to toggle theory bar`, 3000, 'info');
    }
  }

  dirty = true;
  buildLayerPanel();
}

// --- Hamburger opens layer panel (like Custom button) ---
hamburgerBtn.addEventListener('click', () => {
  layerPanelOpen = !layerPanelOpen;
  layersToggle.classList.toggle('active', layerPanelOpen);
  layerPanel.classList.toggle('open', layerPanelOpen);
});

// --- Playlist category switching ---

function switchPlaylist(category: PlaylistCategory): void {
  if (currentPlaylist === category) return;

  currentPlaylist = category;

  // Update button states
  playlistClassicalBtn.classList.toggle('active', category === 'classical');
  playlistPopBtn.classList.toggle('active', category === 'pop');
  playlistVideoBtn.classList.toggle('active', category === 'video');
  playlistUploadsBtn.classList.toggle('active', category === 'uploads');
  updatePlaylistPickerState();

  // Rebuild song picker options (don't auto-load, let user choose)
  const currentSongs = playlists[category];
  if (category === 'uploads') {
    rebuildUploadsPicker(0);
  } else {
    songPicker.innerHTML = currentSongs.map((s, i) => `<option value="${i}">${s.name}</option>`).join('');
    updateDeleteButton();  // Hide delete button for non-uploads
  }

  // Select first song in picker but don't load it
  if (currentSongs.length > 0) {
    songPicker.value = '0';
  }

  // Open song picker for browsing
  playlistPickerWrap.classList.remove('open');
  songPickerWrap.classList.add('open');
  // Defer focus to ensure DOM is updated
  requestAnimationFrame(() => {
    songPickerBtn.focus();
    focusedItemIndex = 0;
    updateFocusedItem(focusedItemIndex);
  });
}

function getCurrentSongs(): SongEntry[] {
  return playlists[currentPlaylist];
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
const isAndroid = /Android/.test(navigator.userAgent);

// Fullscreen button icons (like play/pause toggle)
const expandIcon = fullscreenBtn.querySelector('.expand-icon') as SVGElement;
const compressIcon = fullscreenBtn.querySelector('.compress-icon') as SVGElement;

const setFullscreenBtnState = (isFullscreen: boolean) => {
  expandIcon.style.display = isFullscreen ? 'none' : 'block';
  compressIcon.style.display = isFullscreen ? 'block' : 'none';
  fullscreenBtn.title = isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen';
};

if (!requestFS && isIOS && !isStandalone) {
  fullscreenBtn.style.display = 'none';
}

// In standalone mode, hide button (already fullscreen)
if (isStandalone) {
  fullscreenBtn.style.display = 'none';
}

if (isAndroid) {
  document.body.classList.add('android');
}

fullscreenBtn.addEventListener('click', () => {

  if (!getFullscreenEl()) {
    const req = (appContainer as any).requestFullscreen || (appContainer as any).webkitRequestFullscreen || (appContainer as any).mozRequestFullScreen || (appContainer as any).msRequestFullscreen;
    if (req) req.call(appContainer);
  } else {
    if (exitFS) exitFS.call(document);
  }
});

// Android fullscreen: auto-hide controls after inactivity (like iOS landscape)
let androidControlsTimeout: number | null = null;
const ANDROID_CONTROLS_HIDE_DELAY = 2500;

function hideAndroidControls(): void {
  if (!isAndroid || !getFullscreenEl()) return;
  const topBar = document.querySelector('.top-bar') as HTMLElement;
  topBar.classList.add('android-hidden');
}

function showAndroidControls(): void {
  if (!isAndroid || !getFullscreenEl()) return;
  const topBar = document.querySelector('.top-bar') as HTMLElement;
  topBar.classList.remove('android-hidden');
  // Reset hide timer
  if (androidControlsTimeout) clearTimeout(androidControlsTimeout);
  androidControlsTimeout = window.setTimeout(hideAndroidControls, ANDROID_CONTROLS_HIDE_DELAY);
}

function closeLayerPanel(): void {
  layerPanelOpen = false;
  layersToggle.classList.remove('active');
  layerPanel.classList.remove('open');
}

function onFullscreenChange() {
  const topBar = document.querySelector('.top-bar') as HTMLElement;
  const isFullscreen = !!getFullscreenEl();
  setFullscreenBtnState(isFullscreen);

  if (isFullscreen) {
    // Close layer panel when entering fullscreen
    closeLayerPanel();
    // Android: start visible, then auto-hide
    if (isAndroid) {
      topBar.classList.remove('android-hidden');
      if (androidControlsTimeout) clearTimeout(androidControlsTimeout);
      androidControlsTimeout = window.setTimeout(hideAndroidControls, ANDROID_CONTROLS_HIDE_DELAY);
    }
  } else {
    canvas.classList.remove('cursor-hidden');
    topBar.classList.remove('visible');
    // Android: clear state
    if (isAndroid) {
      topBar.classList.remove('android-hidden');
      if (androidControlsTimeout) {
        clearTimeout(androidControlsTimeout);
        androidControlsTimeout = null;
      }
    }
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
let longPressTimeout: number | null = null;
const LONG_PRESS_DURATION = 500;

canvas.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
  // Android: any touch shows controls
  if (isAndroid && getFullscreenEl()) {
    showAndroidControls();
  }
  // Tap near top reveals controls (non-Android)
  else if (getFullscreenEl() && touchStartY < TOP_REVEAL_ZONE) {
    topBar.classList.add('visible');
  }
  // Start long-press timer for theory bar toggle
  longPressTimeout = window.setTimeout(() => {
    toggleTheoryBar(true);
    longPressTimeout = null;
  }, LONG_PRESS_DURATION);
}, { passive: true });

canvas.addEventListener('touchend', () => {
  // Cancel long-press
  if (longPressTimeout) {
    clearTimeout(longPressTimeout);
    longPressTimeout = null;
  }
  // Hide controls after delay if shown by touch (non-Android)
  if (!isAndroid && getFullscreenEl() && topBar.classList.contains('visible')) {
    if (controlsTimeout) clearTimeout(controlsTimeout);
    controlsTimeout = window.setTimeout(() => {
      topBar.classList.remove('visible');
    }, 3000);
  }
}, { passive: true });

canvas.addEventListener('touchmove', (e) => {
  // Cancel long-press on any movement
  if (longPressTimeout) {
    clearTimeout(longPressTimeout);
    longPressTimeout = null;
  }
  if (!getFullscreenEl()) return;
  // Android: any touch shows controls
  if (isAndroid) {
    showAndroidControls();
    return;
  }
  const deltaY = e.touches[0].clientY - touchStartY;
  // Swipe down from top edge reveals controls
  if (touchStartY < 50 && deltaY > 30) {
    topBar.classList.add('visible');
  }
}, { passive: true });

// --- iOS landscape pseudo-fullscreen ---
// Hide our control bar in landscape on iOS (like true fullscreen)
let iosLandscapeMode = false;
let iosControlsTimeout: number | null = null;
const IOS_CONTROLS_HIDE_DELAY = 2500;

function isLandscape(): boolean {
  return window.innerWidth > window.innerHeight;
}

function hideIOSControls(): void {
  if (!iosLandscapeMode) return;
  topBar.classList.add('ios-hidden');
  // Trigger resize after transition to expand canvas
  setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
}

function showIOSControls(): void {
  if (!iosLandscapeMode) return;
  topBar.classList.remove('ios-hidden');
  // Reset hide timer
  if (iosControlsTimeout) clearTimeout(iosControlsTimeout);
  iosControlsTimeout = window.setTimeout(hideIOSControls, IOS_CONTROLS_HIDE_DELAY);
}

function enterIOSLandscapeMode(): void {
  if (iosLandscapeMode) return;
  iosLandscapeMode = true;
  document.body.classList.add('ios-landscape-fullscreen');
  // Trigger resize to use full viewport
  setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
  // Start hide timer
  iosControlsTimeout = window.setTimeout(hideIOSControls, IOS_CONTROLS_HIDE_DELAY);
}

function exitIOSLandscapeMode(): void {
  if (!iosLandscapeMode) return;
  iosLandscapeMode = false;
  document.body.classList.remove('ios-landscape-fullscreen');
  topBar.classList.remove('ios-hidden');
  if (iosControlsTimeout) {
    clearTimeout(iosControlsTimeout);
    iosControlsTimeout = null;
  }
  // Trigger resize to restore normal layout
  setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
}

// Enable on iOS mobile devices
const isMobileIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !isStandalone;
if (isMobileIOS) {
  function checkIOSOrientation(): void {
    if (isLandscape()) {
      enterIOSLandscapeMode();
    } else {
      exitIOSLandscapeMode();
    }
  }

  // Listen for orientation changes
  window.addEventListener('resize', checkIOSOrientation);
  window.addEventListener('orientationchange', checkIOSOrientation);

  // Show controls on any touch anywhere on screen
  document.addEventListener('touchstart', showIOSControls, { passive: true });

  // Initial check
  setTimeout(checkIOSOrientation, 100);
}

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

// Layer panel closed by default
layersToggle.addEventListener('click', () => {
  // Exit fullscreen when opening the panel
  if (!layerPanelOpen && getFullscreenEl() && exitFS) {
    exitFS.call(document);
  }
  layerPanelOpen = !layerPanelOpen;
  layersToggle.classList.toggle('active', layerPanelOpen);
  layerPanel.classList.toggle('open', layerPanelOpen);
});

// Close button for mobile
const panelCloseBtn = document.getElementById('panel-close-btn')!;
panelCloseBtn.addEventListener('click', closeLayerPanel);

// Layer info modal
const layerInfoBtn = document.getElementById('layer-info-btn')!;
const layerInfoModal = document.getElementById('layer-info-modal')!;
const layerInfoClose = document.getElementById('layer-info-close')!;

layerInfoBtn.addEventListener('click', () => {
  layerInfoModal.classList.add('visible');
});

layerInfoClose.addEventListener('click', () => {
  layerInfoModal.classList.remove('visible');
});

layerInfoModal.addEventListener('click', (e) => {
  if (e.target === layerInfoModal) {
    layerInfoModal.classList.remove('visible');
  }
});

// --- Fractal Config Panel (lazy-loaded when needed) ---
// Panel is loaded on-demand via getFractalConfigPanel()

// --- Note names for color pickers ---
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// --- Build colors grid UI with drag-and-drop ---
let dragSourcePc: number | null = null;

// Touch drag state for mobile color swapping
let touchDragPc: number | null = null;
let touchDragTimer: ReturnType<typeof setTimeout> | null = null;
let touchTargetPc: number | null = null;
let touchDragCompleted = false; // Prevents click after drag

function getColorValue(pc: number, customColors: Record<number, string>): string {
  if (customColors[pc]) return customColors[pc];
  const defaultColor = samplePaletteColor(pc, 0.65);
  return '#' + defaultColor.map(c => c.toString(16).padStart(2, '0')).join('');
}

// Update a single swatch's color without rebuilding the grid
function updateSwatchColor(pitchClass: number, color: string): void {
  const row = colorsGrid.querySelector(`[data-pitch-class="${pitchClass}"]`) as HTMLElement;
  if (!row) return;
  const swatch = row.querySelector('.color-swatch') as HTMLElement;
  const input = row.querySelector('.color-input-hidden') as HTMLInputElement;
  if (swatch) swatch.style.backgroundColor = color;
  if (input) input.value = color;
}

function buildColorsGrid(): void {
  colorsGrid.innerHTML = '';

  const customColors = getCustomColors();

  for (let pc = 0; pc < 12; pc++) {
    const row = document.createElement('div');
    row.className = 'color-row';
    row.dataset.pitchClass = String(pc);

    const label = document.createElement('span');
    label.className = 'color-label';
    label.textContent = NOTE_NAMES[pc];
    row.appendChild(label);

    // Color swatch (draggable visual indicator)
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.draggable = true;
    swatch.dataset.pitchClass = String(pc);

    // Get default color from palette (sample at 0.65 for representative color)
    const defaultColor = samplePaletteColor(pc, 0.65);
    const defaultHex = '#' + defaultColor.map(c => c.toString(16).padStart(2, '0')).join('');

    // Use custom color if set, otherwise default
    const currentColor = customColors[pc] ?? defaultHex;
    swatch.style.backgroundColor = currentColor;
    swatch.dataset.defaultColor = defaultHex;

    // Hidden color input for picking colors
    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'color-input-hidden';
    input.value = currentColor;
    input.dataset.pitchClass = String(pc);
    input.dataset.defaultColor = defaultHex;

    // Click swatch to open color picker (skip if just finished a touch drag)
    swatch.addEventListener('click', (e) => {
      if (touchDragCompleted) {
        touchDragCompleted = false;
        return;
      }
      e.stopPropagation();
      input.click();
    });

    input.addEventListener('input', () => {
      const pitchClass = Number(input.dataset.pitchClass);
      const defaultColor = input.dataset.defaultColor!;
      swatch.style.backgroundColor = input.value;
      // If user picked the default color, clear the custom color
      if (input.value.toLowerCase() === defaultColor.toLowerCase()) {
        setCustomColor(pitchClass, null);
      } else {
        setCustomColor(pitchClass, input.value);
      }
      markUnsavedChanges();
    });

    // Drag and drop handlers
    swatch.addEventListener('dragstart', (e) => {
      dragSourcePc = pc;
      swatch.classList.add('dragging');
      e.dataTransfer!.effectAllowed = 'move';
      e.dataTransfer!.setData('text/plain', String(pc));
    });

    swatch.addEventListener('dragend', () => {
      swatch.classList.remove('dragging');
      dragSourcePc = null;
      // Remove all drag-over states
      document.querySelectorAll('.color-swatch.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });
    });

    swatch.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
      if (dragSourcePc !== null && dragSourcePc !== pc) {
        swatch.classList.add('drag-over');
      }
    });

    swatch.addEventListener('dragleave', () => {
      swatch.classList.remove('drag-over');
    });

    swatch.addEventListener('drop', (e) => {
      e.preventDefault();
      swatch.classList.remove('drag-over');

      if (dragSourcePc === null || dragSourcePc === pc) return;

      // Swap colors between source and target
      const customColors = getCustomColors();
      const sourceColor = getColorValue(dragSourcePc, customColors);
      const targetColor = getColorValue(pc, customColors);

      // Set new colors (these become custom regardless of defaults)
      setCustomColor(dragSourcePc, targetColor);
      setCustomColor(pc, sourceColor);

      // Update only the two swapped swatches (avoid full rebuild)
      updateSwatchColor(dragSourcePc, targetColor);
      updateSwatchColor(pc, sourceColor);
      markUnsavedChanges();
    });

    // Touch handlers for mobile drag-to-swap
    swatch.addEventListener('touchstart', () => {
      // Start long-press timer to enter drag mode
      touchDragTimer = setTimeout(() => {
        touchDragPc = pc;
        swatch.classList.add('dragging');
        // Vibrate to indicate drag mode started
        if (navigator.vibrate) navigator.vibrate(50);
      }, 400);
    }, { passive: true });

    swatch.addEventListener('touchmove', (e) => {
      // Cancel long-press if finger moves before timer fires
      if (touchDragPc === null && touchDragTimer) {
        clearTimeout(touchDragTimer);
        touchDragTimer = null;
        return;
      }

      if (touchDragPc === null) return;

      // Prevent scrolling while dragging
      e.preventDefault();

      // Find which swatch the finger is over
      const touch = e.touches[0];
      const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
      const swatchUnderTouch = elementUnderTouch?.closest('.color-swatch') as HTMLElement | null;

      // Clear previous highlight
      document.querySelectorAll('.color-swatch.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });

      if (swatchUnderTouch && swatchUnderTouch !== swatch) {
        const targetPc = Number(swatchUnderTouch.dataset.pitchClass);
        touchTargetPc = targetPc;
        swatchUnderTouch.classList.add('drag-over');
      } else {
        touchTargetPc = null;
      }
    }, { passive: false }); // Non-passive to allow preventDefault

    swatch.addEventListener('touchend', () => {
      if (touchDragTimer) {
        clearTimeout(touchDragTimer);
        touchDragTimer = null;
      }

      // Mark drag completed to prevent click handler from firing
      const wasDragging = touchDragPc !== null;
      if (wasDragging) {
        touchDragCompleted = true;
      }

      // Perform swap if we have a valid target
      if (touchDragPc !== null && touchTargetPc !== null && touchDragPc !== touchTargetPc) {
        const customColors = getCustomColors();
        const sourceColor = getColorValue(touchDragPc, customColors);
        const targetColor = getColorValue(touchTargetPc, customColors);

        setCustomColor(touchDragPc, targetColor);
        setCustomColor(touchTargetPc, sourceColor);

        updateSwatchColor(touchDragPc, targetColor);
        updateSwatchColor(touchTargetPc, sourceColor);
        markUnsavedChanges();
      }

      // Clean up
      document.querySelectorAll('.color-swatch.dragging').forEach(el => {
        el.classList.remove('dragging');
      });
      document.querySelectorAll('.color-swatch.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });
      touchDragPc = null;
      touchTargetPc = null;
    });

    swatch.addEventListener('touchcancel', () => {
      if (touchDragTimer) {
        clearTimeout(touchDragTimer);
        touchDragTimer = null;
      }
      document.querySelectorAll('.color-swatch.dragging').forEach(el => {
        el.classList.remove('dragging');
      });
      document.querySelectorAll('.color-swatch.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });
      touchDragPc = null;
      touchTargetPc = null;
    }, { passive: true });

    row.appendChild(swatch);
    row.appendChild(input);
    colorsGrid.appendChild(row);
  }
}

// Reset colors to defaults
colorsResetBtn.addEventListener('click', () => {
  clearCustomColors();
  buildColorsGrid();
  markUnsavedChanges();
});

// --- Bass numerals toggle ---
function syncBassNumerals(value: boolean): void {
  showBassNumerals = value;
  bassClockEffect.setConfigValue('showNumerals', value);
  bassFireEffect.setConfigValue('showNumerals', value);
  bassWebEffect.setConfigValue('showNumerals', value);
  updateBassNumeralsOverlay();
}

// --- Melody notes toggle ---
function syncMelodyNotes(value: boolean): void {
  showMelodyNotes = value;
  melodyClockEffect.setConfigValue('showNotes', value);
  // melody-web and melody-aurora don't have note labels to toggle
  updateMelodyNotesOverlay();
}

// --- Overlay/toggle persistence ---
// Only load localStorage values if we have URL params (not default preset)
// When loading the default 'stars' preset, the preset should be authoritative
const hasUrlParams = window.location.search.length > 1;

// Load saved overlay preferences only if URL has params (otherwise preset is authoritative)
// Note: numerals/letters toggles are NOT persisted - they follow presets/effect selection
if (hasUrlParams) {
  const savedKaleidoscope = localStorage.getItem('kaleidoscopeEnabled');
  if (savedKaleidoscope !== null) {
    kaleidoscopeEnabled = savedKaleidoscope === 'true';
  }
  const savedFeedbackTrail = localStorage.getItem('feedbackTrailEnabled');
  if (savedFeedbackTrail !== null) {
    feedbackTrailEnabled = savedFeedbackTrail === 'true';
  }
}
// Apply loaded overlay states
applySlotSelections();

// --- Build layer panel UI ---

function buildLayerPanel(): void {
  layerList.innerHTML = '';

  // Add saved presets at the very top
  layerList.appendChild(savedPresetsSection);

  // Add official presets section
  const officialPresetsSection = document.getElementById('official-presets');
  if (officialPresetsSection) {
    layerList.appendChild(officialPresetsSection);
  } else {
    const presetsDiv = document.createElement('div');
    presetsDiv.className = 'official-presets';
    presetsDiv.id = 'official-presets';
    presetsDiv.innerHTML = `
      <div class="official-label">Presets</div>
      <div class="official-buttons">
        <button class="toggle-btn preset-btn" id="panel-preset-stars" title="Starfield + Note Star + Bass Fire">Stars</button>
        <button class="toggle-btn preset-btn" id="panel-preset-clock" title="Starfield + Note Spiral + Bass Clock">Clock</button>
        <button class="toggle-btn preset-btn" id="panel-preset-warp" title="Chladni + Note Spiral + Kaleidoscope">Warp</button>
        <button class="toggle-btn preset-btn" id="panel-preset-piano" title="Flow Field + Piano Roll">Piano</button>
      </div>
    `;
    layerList.appendChild(presetsDiv);

    // Wire up click handlers for dynamically created buttons
    presetsDiv.querySelectorAll('.preset-btn').forEach(btn => {
      const name = btn.id.replace('panel-preset-', '') as PresetName;
      btn.addEventListener('click', () => applyPreset(name));
    });
  }

  for (const slot of layerSlots) {
    // HUD and Overlay slots are rendered together at the end in the "Overlays" section
    if (slot.name === 'HUD' || slot.name === 'Overlay') {
      continue;
    }

    // Slot header
    const slotDiv = document.createElement('div');
    slotDiv.className = 'layer-slot';
    slotDiv.dataset.slot = slot.name;

    const header = document.createElement('div');
    header.className = 'slot-header';

    const label = document.createElement('span');
    label.className = 'slot-label';
    label.textContent = slot.name;

    // Effect picker radio buttons
    const radioGroup = document.createElement('div');
    radioGroup.className = 'slot-radios';
    const slotId = slot.name.toLowerCase().replace(/\s+/g, '-');

    // "None" option
    const noneLabel = document.createElement('label');
    noneLabel.className = 'slot-radio' + (!slot.activeId ? ' active' : '');
    const noneInput = document.createElement('input');
    noneInput.type = 'radio';
    noneInput.name = `slot-${slotId}`;
    noneInput.value = '';
    noneInput.checked = !slot.activeId;
    noneLabel.appendChild(noneInput);
    noneLabel.appendChild(document.createTextNode('None'));
    radioGroup.appendChild(noneLabel);

    // Effect options
    for (const effect of slot.effects) {
      const effLabel = document.createElement('label');
      effLabel.className = 'slot-radio' + (effect.id === slot.activeId ? ' active' : '');
      const effInput = document.createElement('input');
      effInput.type = 'radio';
      effInput.name = `slot-${slotId}`;
      effInput.value = effect.id;
      effInput.checked = effect.id === slot.activeId;
      effLabel.appendChild(effInput);
      effLabel.appendChild(document.createTextNode(effect.name));
      radioGroup.appendChild(effLabel);
    }

    // Config button for fractal effect (only in Foreground slot)
    let configBtn: HTMLButtonElement | null = null;
    if (slot.name === 'Foreground') {
      configBtn = document.createElement('button');
      configBtn.className = 'slot-config-link';
      configBtn.textContent = 'Custom';
      configBtn.style.display = slot.activeId === 'fractal' ? 'block' : 'none';
      configBtn.addEventListener('click', async () => {
        if (slot.activeId === 'fractal') {
          const panel = await getFractalConfigPanel();
          panel.show();
        }
      });
    }

    // Create display toggle checkbox for Bass/Melody slots (before radio handler so it can reference it)
    let slotCheckbox: HTMLInputElement | null = null;
    if (slot.name === 'Bass') {
      slotCheckbox = document.createElement('input');
      slotCheckbox.type = 'checkbox';
      slotCheckbox.checked = showBassNumerals;
      slotCheckbox.addEventListener('change', () => {
        syncBassNumerals(slotCheckbox!.checked);
      });
    } else if (slot.name === 'Melody') {
      slotCheckbox = document.createElement('input');
      slotCheckbox.type = 'checkbox';
      slotCheckbox.checked = showMelodyNotes;
      slotCheckbox.addEventListener('change', () => {
        syncMelodyNotes(slotCheckbox!.checked);
      });
    }

    // Radio change handler
    radioGroup.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      slot.activeId = target.value || null;
      // Update active class on labels
      radioGroup.querySelectorAll('.slot-radio').forEach(lbl => lbl.classList.remove('active'));
      target.parentElement?.classList.add('active');
      applySlotSelections();
      buildConfigSection(slotDiv, slot);
      clearPresetHighlights();
      dirty = true;
      markUnsavedChanges();
      // Show/hide config button for fractal
      if (configBtn) {
        configBtn.style.display = slot.activeId === 'fractal' ? 'block' : 'none';
      }
      // Auto-toggle display checkbox based on effect selection
      if (slotCheckbox) {
        let shouldShow = false;
        if (slot.name === 'Bass') {
          // All bass effects draw numerals, so turn on when any is selected
          shouldShow = slot.activeId !== null;
          slotCheckbox.checked = shouldShow;
          syncBassNumerals(shouldShow);
        } else if (slot.name === 'Melody') {
          // Only melody-clock draws its own notes; others use overlay
          shouldShow = slot.activeId === 'melody-clock';
          slotCheckbox.checked = shouldShow;
          syncMelodyNotes(shouldShow);
        }
      }
    });

    header.appendChild(label);
    slotDiv.appendChild(header);
    slotDiv.appendChild(radioGroup);

    // Config button on its own line (for effects with config panels)
    if (configBtn) {
      slotDiv.appendChild(configBtn);
    }

    // Add display toggle for Bass/Melody slots
    if (slotCheckbox) {
      const toggleDiv = document.createElement('div');
      toggleDiv.className = 'slot-display-toggle';
      const toggleLabel = document.createElement('label');
      toggleLabel.className = 'display-toggle';
      toggleLabel.appendChild(slotCheckbox);
      const toggleSwitch = document.createElement('span');
      toggleSwitch.className = 'toggle-switch';
      toggleLabel.appendChild(toggleSwitch);
      toggleLabel.appendChild(document.createTextNode(slot.name === 'Bass' ? 'Show Numerals' : 'Show Notes'));
      toggleDiv.appendChild(toggleLabel);
      slotDiv.appendChild(toggleDiv);
    }

    // Config section for active effect
    buildConfigSection(slotDiv, slot);

    layerList.appendChild(slotDiv);
  }

  // --- Overlays section (Kaleidoscope, Feedback, Theory Bar) ---
  const overlaysSection = document.createElement('div');
  overlaysSection.className = 'layer-slot overlays-section';

  const overlaysHeader = document.createElement('div');
  overlaysHeader.className = 'slot-header';
  const overlaysLabel = document.createElement('span');
  overlaysLabel.className = 'slot-label';
  overlaysLabel.textContent = 'Overlays';
  overlaysHeader.appendChild(overlaysLabel);
  overlaysSection.appendChild(overlaysHeader);

  const overlaysToggles = document.createElement('div');
  overlaysToggles.className = 'overlay-toggles';

  // Kaleidoscope toggle
  const kaliToggleDiv = document.createElement('div');
  kaliToggleDiv.className = 'slot-display-toggle';
  const kaliLabel = document.createElement('label');
  kaliLabel.className = 'display-toggle';
  const kaliCheckbox = document.createElement('input');
  kaliCheckbox.type = 'checkbox';
  kaliCheckbox.checked = kaleidoscopeEnabled;
  kaliCheckbox.addEventListener('change', () => {
    kaleidoscopeEnabled = kaliCheckbox.checked;
    localStorage.setItem('kaleidoscopeEnabled', String(kaleidoscopeEnabled));
    applySlotSelections();
    clearPresetHighlights();
    dirty = true;
    markUnsavedChanges();
  });
  kaliLabel.appendChild(kaliCheckbox);
  const kaliSwitch = document.createElement('span');
  kaliSwitch.className = 'toggle-switch';
  kaliLabel.appendChild(kaliSwitch);
  kaliLabel.appendChild(document.createTextNode('Kaleidoscope'));
  kaliToggleDiv.appendChild(kaliLabel);
  overlaysToggles.appendChild(kaliToggleDiv);

  // Feedback Trail toggle
  const feedbackToggleDiv = document.createElement('div');
  feedbackToggleDiv.className = 'slot-display-toggle';
  const feedbackLabel = document.createElement('label');
  feedbackLabel.className = 'display-toggle';
  const feedbackCheckbox = document.createElement('input');
  feedbackCheckbox.type = 'checkbox';
  feedbackCheckbox.checked = feedbackTrailEnabled;
  feedbackCheckbox.addEventListener('change', () => {
    feedbackTrailEnabled = feedbackCheckbox.checked;
    localStorage.setItem('feedbackTrailEnabled', String(feedbackTrailEnabled));
    applySlotSelections();
    clearPresetHighlights();
    dirty = true;
    markUnsavedChanges();
  });
  feedbackLabel.appendChild(feedbackCheckbox);
  const feedbackSwitch = document.createElement('span');
  feedbackSwitch.className = 'toggle-switch';
  feedbackLabel.appendChild(feedbackSwitch);
  feedbackLabel.appendChild(document.createTextNode('Feedback Trail'));
  feedbackToggleDiv.appendChild(feedbackLabel);
  overlaysToggles.appendChild(feedbackToggleDiv);

  // Theory Bar toggle
  const hudSlot = layerSlots.find(s => s.name === 'HUD');
  if (hudSlot) {
    const theoryToggleDiv = document.createElement('div');
    theoryToggleDiv.className = 'slot-display-toggle';
    const theoryLabel = document.createElement('label');
    theoryLabel.className = 'display-toggle';
    const theoryCheckbox = document.createElement('input');
    theoryCheckbox.type = 'checkbox';
    theoryCheckbox.checked = hudSlot.activeId === 'theory-bar';
    theoryCheckbox.addEventListener('change', () => {
      hudSlot.activeId = theoryCheckbox.checked ? 'theory-bar' : null;
      toggleTheoryBar();
      dirty = true;
      markUnsavedChanges();
    });
    theoryLabel.appendChild(theoryCheckbox);
    const theorySwitch = document.createElement('span');
    theorySwitch.className = 'toggle-switch';
    theoryLabel.appendChild(theorySwitch);
    theoryLabel.appendChild(document.createTextNode('Theory Bar'));
    theoryToggleDiv.appendChild(theoryLabel);
    overlaysToggles.appendChild(theoryToggleDiv);
  }

  overlaysSection.appendChild(overlaysToggles);
  layerList.appendChild(overlaysSection);

  // Append experimental, quality, colors, and theme sections at the end (moves them into scrollable area)
  layerList.appendChild(experimentalPresetsSection);
  layerList.appendChild(qualitySection);
  layerList.appendChild(colorsSection);
  layerList.appendChild(themeSection);
}

function buildConfigSection(container: HTMLDivElement, slot: LayerSlot): void {
  // Remove old config area
  const old = container.querySelector('.slot-config-area');
  if (old) old.remove();

  // Skip config area for Bass/Melody slots (they have display toggles instead)
  if (slot.name === 'Bass' || slot.name === 'Melody') return;

  // Always create a config area wrapper to reserve space and avoid layout shift
  const configArea = document.createElement('div');
  configArea.className = 'slot-config-area';

  if (!slot.activeId) {
    container.appendChild(configArea);
    return;
  }
  const effect = slot.effects.find(e => e.id === slot.activeId);
  if (!effect) {
    container.appendChild(configArea);
    return;
  }

  const configDiv = document.createElement('div');
  configDiv.className = 'slot-config';

  // Add fractal preset selector if fractal effect and user presets exist
  if (slot.activeId === 'fractal') {
    const userPresets = loadUserPresets();
    if (userPresets.length > 0) {
      const presetRow = document.createElement('div');
      presetRow.className = 'config-row fractal-preset-row';

      const presetBtnWrap = document.createElement('div');
      presetBtnWrap.className = 'config-buttons fractal-preset-buttons';

      // Default button
      const defaultBtn = document.createElement('button');
      const selectedId = fractalConfigPanel?.getSelectedPresetId() ?? null;
      defaultBtn.className = 'config-btn fractal-preset-default' + (selectedId === null ? ' active' : '');
      defaultBtn.textContent = 'Default';
      defaultBtn.addEventListener('click', async () => {
        const panel = await getFractalConfigPanel();
        panel.selectPreset(null);
        presetBtnWrap.querySelectorAll('.config-btn').forEach(b => b.classList.remove('active'));
        defaultBtn.classList.add('active');
      });
      presetBtnWrap.appendChild(defaultBtn);

      // User preset buttons
      for (const preset of userPresets) {
        const btn = document.createElement('button');
        btn.className = 'config-btn fractal-preset-user' + (selectedId === preset.id ? ' active' : '');
        btn.textContent = preset.name;
        btn.addEventListener('click', async () => {
          const panel = await getFractalConfigPanel();
          panel.selectPreset(preset.id);
          presetBtnWrap.querySelectorAll('.config-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
        presetBtnWrap.appendChild(btn);
      }

      presetRow.appendChild(presetBtnWrap);
      configDiv.appendChild(presetRow);
    }
  }

  const configs = effect.getConfig();
  if (configs.length === 0 && configDiv.children.length === 0) return;

  for (const cfg of configs) {
    // Hidden configs are for URL params only, not rendered in UI
    if (cfg.type === 'hidden') continue;

    const row = document.createElement('div');
    row.className = 'config-row' + (cfg.inline ? ' inline' : '');

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
      });
      row.appendChild(input);
    }

    configDiv.appendChild(row);
  }

  configArea.appendChild(configDiv);
  container.appendChild(configArea);
}

buildLayerPanel();
buildColorsGrid();

// Note: fractalConfigPanel.onPresetsChange is set inside getFractalConfigPanel()

// --- Preset buttons ---

type PresetName = 'stars' | 'warp' | 'clock' | 'fractal' | 'piano' | 'StarAurora' | 'KaliGraph';
const presetButtons: Record<PresetName, HTMLButtonElement> = {
  stars: document.getElementById('preset-stars') as HTMLButtonElement,
  warp: document.getElementById('preset-warp') as HTMLButtonElement,
  clock: document.getElementById('preset-clock') as HTMLButtonElement,
  fractal: document.getElementById('preset-fractal') as HTMLButtonElement,
  piano: document.getElementById('preset-piano') as HTMLButtonElement,
  StarAurora: document.getElementById('preset-StarAurora') as HTMLButtonElement,
  KaliGraph: document.getElementById('preset-KaliGraph') as HTMLButtonElement,
};

// Initial preset sync happens after all button refs are defined (see below)

function applyPreset(preset: PresetName): void {
  // Reset all effect configs to defaults first
  for (const effect of getAllEffects().values()) {
    const defaults = effect.getDefaults();
    for (const [key, value] of Object.entries(defaults)) {
      effect.setConfigValue(key, value);
    }
  }

  // Get preset state and apply it
  const presetState = getPresetState(preset);
  if (presetState) {
    const { overlays } = applyState(presetState, layerSlots, getAllEffects());
    applyOverlaysFromState(overlays);
  }

  // Sync UI toggles with applied effect configs
  // Check preset configs for showNumerals/showNotes, default to true if not specified
  const presetConfigs = presetState?.configs ?? {};
  // Check all bass effect configs for showNumerals (different presets use different effects)
  const bassClockConfig = presetConfigs['bass-clock'] as Record<string, unknown> | undefined;
  const bassFireConfig = presetConfigs['bass-fire'] as Record<string, unknown> | undefined;
  const melodyConfig = presetConfigs['melody-clock'] as Record<string, unknown> | undefined;

  // Use explicit false from any bass config, otherwise default to true
  const bassNumeralsVal = (bassClockConfig?.showNumerals ?? bassFireConfig?.showNumerals) ?? true;
  showBassNumerals = bassNumeralsVal as boolean;
  syncBassNumerals(showBassNumerals);

  const melodyNotesVal = melodyConfig?.showNotes ?? true;
  showMelodyNotes = melodyNotesVal as boolean;
  syncMelodyNotes(showMelodyNotes);

  applySlotSelections();
  buildLayerPanel();
  buildColorsGrid();
  dirty = true;
  clearUnsavedChanges();

  // Update all preset button highlights
  syncPresetButtons(preset);
}

for (const [name, btn] of Object.entries(presetButtons)) {
  btn.addEventListener('click', () => applyPreset(name as PresetName));
}

// Mobile bar preset buttons (in top bar)
const mobileBarPresets: Record<string, HTMLButtonElement> = {
  stars: document.getElementById('mobile-bar-stars') as HTMLButtonElement,
  warp: document.getElementById('mobile-bar-warp') as HTMLButtonElement,
  clock: document.getElementById('mobile-bar-clock') as HTMLButtonElement,
  piano: document.getElementById('mobile-bar-piano') as HTMLButtonElement,
};

for (const [name, btn] of Object.entries(mobileBarPresets)) {
  btn.addEventListener('click', () => applyPreset(name as PresetName));
}

// Sync all preset buttons on initial load (after all button refs are defined)
syncPresetButtons(urlSettingsResult.presetApplied as PresetName ?? (urlToState(window.location.search) ? null : 'stars'));

// Quality buttons for fixed render resolution
// Maps UI names to compositor preset names (fast/balanced/sharp)
const qualityMap = {
  low: 'fast' as const,
  medium: 'balanced' as const,
  high: 'sharp' as const,
};
const qualityButtons = {
  low: document.getElementById('quality-low') as HTMLButtonElement,
  medium: document.getElementById('quality-medium') as HTMLButtonElement,
  high: document.getElementById('quality-high') as HTMLButtonElement,
};

// Track current quality and whether user manually set it
const QUALITY_KEY = 'fractals-quality';
let currentQualityLevel: keyof typeof qualityMap = 'high';
let userSetQuality = false;

// Load stored quality preference, default to sharp (auto-downgrade handles slow devices)
function detectDefaultQuality(): keyof typeof qualityMap {
  const stored = localStorage.getItem(QUALITY_KEY);
  if (stored && (stored === 'low' || stored === 'medium' || stored === 'high')) {
    userSetQuality = true;
    return stored;
  }
  return 'high';
}

function setQuality(level: keyof typeof qualityMap, isUserAction = false): void {
  currentQualityLevel = level;
  if (isUserAction) {
    userSetQuality = true;
    // Persist user's manual choice
    localStorage.setItem(QUALITY_KEY, level);
  }
  compositor.setQualityPreset(qualityMap[level]);
  // Update button states
  for (const [name, btn] of Object.entries(qualityButtons)) {
    btn.classList.toggle('active', name === level);
  }
  // Trigger resize to apply new resolution
  resizeCanvas();
}

// Apply auto-detected or stored quality on startup
currentQualityLevel = detectDefaultQuality();
compositor.setQualityPreset(qualityMap[currentQualityLevel]);
// Update button states to reflect initial quality
for (const [name, btn] of Object.entries(qualityButtons)) {
  btn.classList.toggle('active', name === currentQualityLevel);
}

for (const [name, btn] of Object.entries(qualityButtons)) {
  btn.addEventListener('click', () => setQuality(name as keyof typeof qualityMap, true));
}

// Theme toggle - sync with main site's localStorage
const THEME_KEY = 'decompiled-theme';

function setTheme(theme: 'light' | 'dark') {
  const isLight = theme === 'light';
  document.documentElement.classList.toggle('light-mode', isLight);
  document.body.classList.toggle('light-mode', isLight);
  localStorage.setItem(THEME_KEY, theme);
  const themeIcon = document.querySelector('.theme-icon');
  if (themeIcon) themeIcon.textContent = isLight ? '☀️' : '🌙';
}

// Sync body class and icon with early init (documentElement already has class from top of file)
if (document.documentElement.classList.contains('light-mode')) {
  document.body.classList.add('light-mode');
  const themeIcon = document.querySelector('.theme-icon');
  if (themeIcon) themeIcon.textContent = '☀️';
}

themeToggle.addEventListener('click', () => {
  const isCurrentlyLight = document.documentElement.classList.contains('light-mode');
  setTheme(isCurrentlyLight ? 'dark' : 'light');
});

// Track DPR for coordinate transforms (declared here so setQuality can call resizeCanvas)
let canvasDPR = 1;

// Start on Balanced if we've previously auto-downgraded (but respect user's manual choice)
if (localStorage.getItem('autoDowngraded') === 'true' && !userSetQuality) {
  setQuality('medium');
}

// Helper to get current overlays array
function getEnabledOverlays(): string[] {
  const overlays: string[] = [];
  if (kaleidoscopeEnabled) overlays.push('kaleidoscope');
  if (feedbackTrailEnabled) overlays.push('feedback-trail');
  return overlays;
}

// Copy Link button - generates shareable URL and copies to clipboard
const copyLinkBtn = document.getElementById('copy-link-btn') as HTMLButtonElement;
copyLinkBtn.addEventListener('click', async () => {
  const state = getCurrentState(layerSlots, getEnabledOverlays());
  const baseQuery = stateToURL(state);
  const params = new URLSearchParams(baseQuery);

  // Add playlist and track params
  if (currentPlaylist !== 'pop') {
    params.set('l', currentPlaylist);
  }
  if (songPicker.value !== '0') {
    params.set('t', songPicker.value);
  }

  const queryString = params.toString();
  const url = queryString
    ? `${window.location.origin}${window.location.pathname}?${queryString}`
    : `${window.location.origin}${window.location.pathname}`;

  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard!', 2000, 'info');
  } catch {
    // Fallback for older browsers
    showToast('Could not copy link', 2000);
  }
});

// Sync all preset button highlights to match the given preset (or clear if null)
function syncPresetButtons(preset: PresetName | null): void {
  for (const [name, btn] of Object.entries(presetButtons)) {
    btn.classList.toggle('active', name === preset);
  }
  for (const [name, btn] of Object.entries(mobileBarPresets)) {
    btn.classList.toggle('active', name === preset);
  }
  // Sync panel preset buttons (dynamically created)
  document.querySelectorAll('.official-buttons .preset-btn').forEach(btn => {
    const name = btn.id.replace('panel-preset-', '');
    btn.classList.toggle('active', name === preset);
  });
  // Also clear custom preset highlights
  document.querySelectorAll('.custom-preset-btn').forEach(btn => btn.classList.remove('active'));
}

// Clear preset highlights when manual changes are made
function clearPresetHighlights(): void {
  syncPresetButtons(null);
}


// Save Preset modal elements
const saveModalOverlay = document.getElementById('save-modal-overlay')!;
const saveModalSummary = document.getElementById('save-modal-summary')!;
const saveModalInput = document.getElementById('save-modal-input') as HTMLInputElement;
const saveModalCancel = document.getElementById('save-modal-cancel')!;
const saveModalConfirm = document.getElementById('save-modal-confirm')!;

function getPresetSummary(): string {
  const parts: string[] = [];
  for (const slot of layerSlots) {
    if (slot.activeId) {
      const effect = slot.effects.find(e => e.id === slot.activeId);
      if (effect) parts.push(effect.name);
    }
  }
  if (kaleidoscopeEnabled) parts.push('Kaleidoscope');
  if (feedbackTrailEnabled) parts.push('Feedback Trail');
  return parts.length > 0 ? parts.join(' · ') : 'No effects selected';
}

function openSaveModal(): void {
  saveModalSummary.textContent = getPresetSummary();
  saveModalInput.value = '';
  saveModalOverlay.classList.add('visible');
  saveModalInput.focus();
}

function closeSaveModal(): void {
  saveModalOverlay.classList.remove('visible');
}

function confirmSavePreset(): void {
  const name = saveModalInput.value.trim();
  if (!name) {
    saveModalInput.focus();
    return;
  }

  const state = getCurrentState(layerSlots, getEnabledOverlays());
  saveCustomPreset(name, state);
  renderSavedPresets();
  closeSaveModal();
  showToast(`Saved "${name}"`, 2000, 'info');
}

// Save Preset button - opens save modal
const savePresetBtn = document.getElementById('save-preset-btn') as HTMLButtonElement;
savePresetBtn.addEventListener('click', openSaveModal);

saveModalCancel.addEventListener('click', closeSaveModal);
saveModalConfirm.addEventListener('click', confirmSavePreset);
saveModalOverlay.addEventListener('click', (e) => {
  if (e.target === saveModalOverlay) closeSaveModal();
});
saveModalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') confirmSavePreset();
  if (e.key === 'Escape') closeSaveModal();
});

// Render saved presets in the layer panel
function renderSavedPresets(): void {
  const container = document.getElementById('saved-buttons');
  if (!container) return; // Not yet in DOM
  const presets = getCustomPresets();

  if (presets.length === 0) {
    savedPresetsSection.style.display = 'none';
    return;
  }

  savedPresetsSection.style.display = 'block';
  container.innerHTML = '';

  for (const preset of presets) {
    const btn = document.createElement('button');
    btn.className = 'custom-preset-btn';
    btn.textContent = preset.name;
    btn.addEventListener('click', () => {
      const { overlays } = applyState(preset.state, layerSlots, getAllEffects());
      applyOverlaysFromState(overlays);
      applySlotSelections();
      clearPresetHighlights();
    });

    // Delete button
    const del = document.createElement('button');
    del.className = 'custom-preset-delete';
    del.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
    del.title = 'Delete preset';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${preset.name}"?`)) {
        deleteCustomPreset(preset.id);
        renderSavedPresets();
      }
    });
    btn.appendChild(del);
    container.appendChild(btn);
  }
}

// Initial render of saved presets
renderSavedPresets();

// Stub functions for preset change tracking
function markUnsavedChanges(): void {}
function clearUnsavedChanges(): void {}

// --- Canvas sizing ---

function resizeCanvas(): void {
  const wrap = document.querySelector('.canvas-wrap')!;
  const rect = wrap.getBoundingClientRect();
  // Use wrapper dimensions for portrait detection (more reliable than window in DevTools)
  const isPortrait = rect.height > rect.width;
  const isMobile = rect.width <= 768;
  const padding = rect.width <= 480 ? 0 : 16;
  const availW = rect.width - padding;
  const availH = rect.height - padding;

  // Device pixel ratio for sharp rendering (cap at 2 for mobile performance)
  canvasDPR = Math.min(window.devicePixelRatio || 1, 2);

  // On mobile portrait, rotate the canvas 90deg to display 16:9 content
  if (isMobile && isPortrait) {
    // Create a landscape 16:9 canvas that will be rotated to fill portrait space
    const aspect = 16 / 9;
    // After 90deg rotation: canvas width becomes visual height, canvas height becomes visual width
    // We want the rotated canvas to fit: visual width ≤ availW, visual height ≤ availH
    // So: canvas.height ≤ availW, canvas.width ≤ availH
    if (availH / availW > aspect) {
      // Width-constrained: rotated height (canvas.height) limited by availW
      displayHeight = Math.floor(availW);
      displayWidth = Math.floor(availW * aspect);
    } else {
      // Height-constrained: rotated width (canvas.width) limited by availH
      displayWidth = Math.floor(availH);
      displayHeight = Math.floor(availH / aspect);
    }
    canvas.style.transform = 'rotate(90deg)';
  } else {
    // Desktop/landscape: maintain 16:9, fit within available space, no rotation
    canvas.style.transform = '';
    const aspect = 16 / 9;
    if (availW / availH > aspect) {
      // Height-constrained
      displayHeight = Math.floor(availH);
      displayWidth = Math.floor(displayHeight * aspect);
    } else {
      // Width-constrained
      displayWidth = Math.floor(availW);
      displayHeight = Math.floor(displayWidth / aspect);
    }
  }

  // Set canvas buffer size (DPR-scaled for sharpness)
  canvas.width = Math.floor(displayWidth * canvasDPR);
  canvas.height = Math.floor(displayHeight * canvasDPR);

  // Set CSS size (must match buffer aspect ratio to avoid distortion)
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

/**
 * Reset all playback state for a song switch.
 * Call this before loading a new song.
 */
/**
 * Reset analysis state when seeking within a song.
 * Resets musicMapper and compositor but keeps playback running.
 */
function resetForSeek(seekTime: number) {
  if (!timeline) return;

  audioPlayer.seek(seekTime);
  musicMapper.reset();
  musicMapper.setTempo(
    timeline.tempo,
    timeline.timeSignature,
    timeline.tempoEvents,
    timeline.timeSignatureEvents
  );
  musicMapper.setKey(timeline.key, timeline.keyMode, timeline.useFlats);
  musicMapper.setSongDuration(timeline.duration, timeline.chords, timeline.notes);
  compositor.resetAll();
  // Reset chord display cache
  lastChordDisplayIdx = -1;
  lastChordDisplayText = '';
  dirty = true;
}

/**
 * Unified song loading function.
 * Destroys old state, loads new song, optionally auto-plays.
 * Returns true if load succeeded, false if failed or superseded.
 */
async function loadSong(index: number, autoPlay = false): Promise<boolean> {
  const myToken = ++loadToken;

  // 1. STOP - destroy everything
  audioPlayer.destroy();
  timeline = null;
  musicMapper.reset();
  compositor.resetAll();

  // 2. DISABLE UI
  playBtn.disabled = true;
  seekBar.disabled = true;
  seekBar.value = '0';
  seekBar.style.setProperty('--progress', '0');
  lastDisplayedSecond = -1;
  timeDisplay.textContent = '0:00 / 0:00';
  keyDisplay.textContent = 'Key: ...';
  keyDisplay.style.color = '';
  bpmDisplay.textContent = 'BPM: ...';
  chordDisplay.textContent = 'Loading...';

  // 3. LOAD
  const song = getCurrentSongs()[index];
  let midiBuffer: ArrayBuffer;

  if (song.data) {
    // Use in-memory data for uploaded songs
    midiBuffer = song.data;
  } else {
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
      return false;
    }
  }

  if (myToken !== loadToken) return false;  // Superseded

  // 4. ANALYZE
  try {
    timeline = analyzeMidiBuffer(midiBuffer);
  } catch (e) {
    console.error('Failed to analyze MIDI:', e);
    showToast(`Failed to analyze: ${song.file}`);
    chordDisplay.textContent = 'Analysis failed';
    timeline = null;
    return false;
  }

  if (myToken !== loadToken) return false;  // Superseded

  // 5. INITIALIZE (fresh resources)
  musicMapper.setTempo(
    timeline.tempo,
    timeline.timeSignature,
    timeline.tempoEvents,
    timeline.timeSignatureEvents
  );
  musicMapper.setKey(timeline.key, timeline.keyMode, timeline.useFlats);
  musicMapper.setSongDuration(timeline.duration, timeline.chords, timeline.notes);
  audioPlayer.loadMidi(midiBuffer);  // Creates fresh sequencer
  needsInitialRender = true;

  // 6. ENABLE UI
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

  // 7. AUTO-PLAY if requested
  if (autoPlay && myToken === loadToken) {
    await audioPlayer.play();
  }

  return true;
}

let lastDisplayedSecond = -1;
function updateTimeDisplay(currentTime: number) {
  const currentSecond = Math.floor(currentTime);
  // Only update DOM when the displayed second changes
  if (currentSecond !== lastDisplayedSecond) {
    lastDisplayedSecond = currentSecond;
    const total = timeline?.duration ?? 0;
    timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(total)}`;
  }
}

// --- Custom MIDI file loading ---

// Rebuild uploads picker
function rebuildUploadsPicker(selectedIdx: number = 0): void {
  songPicker.innerHTML = uploadedSongs.map((s, i) => `<option value="${i}">${s.name}</option>`).join('');
  if (uploadedSongs.length > 0) {
    songPicker.value = String(selectedIdx);
  }
  updateDeleteButton();
}

// Delete button for removing uploads
let uploadDeleteBtn: HTMLButtonElement | null = null;

function updateDeleteButton(): void {
  const shouldShow = currentPlaylist === 'uploads' && uploadedSongs.length > 0;
  if (uploadDeleteBtn) {
    uploadDeleteBtn.style.display = shouldShow ? '' : 'none';
  }
}

function createDeleteButton(): void {
  uploadDeleteBtn = document.createElement('button');
  uploadDeleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
  uploadDeleteBtn.title = 'Remove this upload';
  uploadDeleteBtn.className = 'toggle-btn upload-delete-btn';
  uploadDeleteBtn.style.display = 'none';
  uploadDeleteBtn.style.marginLeft = '4px';
  uploadDeleteBtn.style.color = '#ff6b6b';
  uploadDeleteBtn.addEventListener('click', removeCurrentUpload);
  songPicker.parentElement?.appendChild(uploadDeleteBtn);
}

// Remove current upload
async function removeCurrentUpload(): Promise<void> {
  const idx = parseInt(songPicker.value);
  if (isNaN(idx) || idx < 0 || idx >= uploadedSongs.length) return;

  const wasPlaying = audioPlayer.isPlaying();
  uploadedSongs.splice(idx, 1);
  saveUploadsToStorage();

  if (uploadedSongs.length === 0) {
    // No more uploads, stop playback and switch to pop playlist
    audioPlayer.destroy();
    playlistUploadsBtn.style.display = 'none';
    (playlistPickerMenu.querySelector('[data-playlist="uploads"]') as HTMLElement).style.display = 'none';
    await switchPlaylist('pop');
  } else {
    // Select next song (or previous if at end)
    const newIdx = Math.min(idx, uploadedSongs.length - 1);
    rebuildUploadsPicker(newIdx);
    await loadSong(newIdx, wasPlaying);
  }
}

async function loadMidiFile(file: File) {
  const myToken = ++loadToken;

  // 1. STOP - destroy everything
  audioPlayer.destroy();
  timeline = null;
  musicMapper.reset();
  compositor.resetAll();

  // 2. DISABLE UI
  playBtn.disabled = true;
  seekBar.disabled = true;
  seekBar.value = '0';
  seekBar.style.setProperty('--progress', '0');
  lastDisplayedSecond = -1;
  timeDisplay.textContent = '0:00 / 0:00';
  keyDisplay.textContent = 'Key: ...';
  keyDisplay.style.color = '';
  bpmDisplay.textContent = 'BPM: ...';
  chordDisplay.textContent = file.name; // Show filename while loading

  try {
    const midiBuffer = await file.arrayBuffer();

    if (myToken !== loadToken) return;  // Superseded

    timeline = analyzeMidiBuffer(midiBuffer);

    if (myToken !== loadToken) return;  // Superseded

    // Use song name from MIDI metadata, fallback to filename without extension
    const baseName = file.name.replace(/\.(mid|midi)$/i, '');
    const displayName = timeline.name || baseName;

    // Add to uploads playlist (in memory)
    const uploadEntry: SongEntry = {
      name: `⬆ ${displayName}`,
      file: file.name,
      data: midiBuffer,
    };

    // Check if already exists (by filename), update if so
    const existingIdx = uploadedSongs.findIndex(s => s.file === file.name);
    if (existingIdx >= 0) {
      uploadedSongs[existingIdx] = uploadEntry;
    } else {
      uploadedSongs.push(uploadEntry);
    }

    // Persist to localStorage
    saveUploadsToStorage();

    // Show uploads button now that we have uploads
    playlistUploadsBtn.style.display = '';
    (playlistPickerMenu.querySelector('[data-playlist="uploads"]') as HTMLElement).style.display = '';

    // Switch to uploads playlist and select this song
    currentPlaylist = 'uploads';
    playlistClassicalBtn.classList.remove('active');
    playlistPopBtn.classList.remove('active');
    playlistVideoBtn.classList.remove('active');
    playlistUploadsBtn.classList.add('active');
    updatePlaylistPickerState();

    // Rebuild song picker with uploads (with remove option)
    const uploadIdx = existingIdx >= 0 ? existingIdx : uploadedSongs.length - 1;
    rebuildUploadsPicker(uploadIdx);

    // Initialize state (fresh resources)
    musicMapper.setTempo(
      timeline.tempo,
      timeline.timeSignature,
      timeline.tempoEvents,
      timeline.timeSignatureEvents
    );
    musicMapper.setKey(timeline.key, timeline.keyMode, timeline.useFlats);
    musicMapper.setSongDuration(timeline.duration, timeline.chords, timeline.notes);
    audioPlayer.loadMidi(midiBuffer);
    needsInitialRender = true;

    // Enable UI
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

    // File uploads don't auto-play - user clicks play
  } catch (e) {
    console.error('Failed to load MIDI:', e);
    chordDisplay.textContent = 'Load failed - invalid MIDI?';
    timeline = null;
  }
}

// --- Event listeners ---

// Playlist category buttons
playlistClassicalBtn.addEventListener('click', () => switchPlaylist('classical'));
playlistPopBtn.addEventListener('click', () => switchPlaylist('pop'));
playlistVideoBtn.addEventListener('click', () => switchPlaylist('video'));
playlistUploadsBtn.addEventListener('click', () => switchPlaylist('uploads'));

// Enter on playlist button opens song picker
[playlistClassicalBtn, playlistPopBtn, playlistVideoBtn, playlistUploadsBtn].forEach(btn => {
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      songPickerWrap.classList.add('open');
      songPickerBtn.focus();
      // Initialize focus on current song
      focusedItemIndex = parseInt(songPicker.value) || 0;
      updateFocusedItem(focusedItemIndex);
    }
  });
});

songPicker.addEventListener('change', async () => {
  // Unlock audio immediately during user gesture (before any await)
  unlockAudio();

  if (songPicker.value === 'custom') return; // Already loaded
  const idx = parseInt(songPicker.value);
  if (!isNaN(idx)) {
    await loadSong(idx, true);  // Auto-play selected song
  }
});

// Previous/Next track buttons
prevBtn.addEventListener('click', async () => {
  // Unlock audio immediately during user gesture (before any await)
  unlockAudio();

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
  await loadSong(prevIdx, true);  // Auto-play
});

nextBtn.addEventListener('click', async () => {
  // Unlock audio immediately during user gesture (before any await)
  unlockAudio();

  const currentIdx = parseInt(songPicker.value);
  if (isNaN(currentIdx) || songPicker.value === 'custom') return;
  const currentSongs = getCurrentSongs();
  const nextIdx = (currentIdx + 1) % currentSongs.length;
  songPicker.value = String(nextIdx);
  await loadSong(nextIdx, true);  // Auto-play
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

// Create delete button for uploads
createDeleteButton();

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
  if (!timeline || playBtn.disabled) return;

  // Query truth directly - no cached variable
  if (audioPlayer.isPlaying()) {
    audioPlayer.pause();
  } else {
    await audioPlayer.play();
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

  // '<' for previous/rewind
  if (e.key === '<') {
    prevBtn.click();
  }

  // '>' for next
  if (e.key === '>') {
    nextBtn.click();
  }

  // '{' and '}' to cycle playlists
  const playlistOrder: PlaylistCategory[] = ['pop', 'classical', 'video', 'uploads'];
  const playlistButtons: Record<PlaylistCategory, HTMLButtonElement> = {
    pop: playlistPopBtn,
    classical: playlistClassicalBtn,
    video: playlistVideoBtn,
    uploads: playlistUploadsBtn,
  };

  if (e.key === '{') {
    const idx = playlistOrder.indexOf(currentPlaylist);
    const prevIdx = (idx - 1 + playlistOrder.length) % playlistOrder.length;
    const newCategory = playlistOrder[prevIdx];
    switchPlaylist(newCategory);
    playlistButtons[newCategory].focus();
  }
  if (e.key === '}') {
    const idx = playlistOrder.indexOf(currentPlaylist);
    const nextIdx = (idx + 1) % playlistOrder.length;
    const newCategory = playlistOrder[nextIdx];
    switchPlaylist(newCategory);
    playlistButtons[newCategory].focus();
  }

  // '?' to show keyboard shortcuts
  if (e.key === '?') {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    const mod = isMac ? '⌘' : 'Ctrl';
    showToast(`Space: play · </>: prev/next · {/}: playlist · ${mod}+click: theory`, 5000, 'info');
  }
});

// Click/tap canvas to play/pause (Cmd+click toggles theory bar)
canvas.addEventListener('click', (e) => {
  // Cmd+click (Mac) or Ctrl+click (Windows) toggles theory bar
  if (e.metaKey || e.ctrlKey) {
    toggleTheoryBar(true);
    return;
  }
  if (!timeline) return;
  // In fullscreen, don't toggle if tapping near top (that's for controls)
  if (getFullscreenEl() && e.clientY <= 100) return;
  playBtn.click();
});

let seeking = false;
seekBar.addEventListener('mousedown', () => { seeking = true; });
seekBar.addEventListener('touchstart', () => { seeking = true; });

seekBar.addEventListener('input', () => {
  const t = parseFloat(seekBar.value);
  resetForSeek(t);
  updateTimeDisplay(t);
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

// Binary search for chord lookup: find last chord with time <= target
function binarySearchChord(chords: { time: number }[], target: number): number {
  let lo = 0, hi = chords.length - 1, result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (chords[mid].time <= target) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

let lastChordDisplayIdx = -1;
let lastChordDisplayText = '';

function updateChordDisplay(currentTime: number) {
  if (!timeline) return;

  // Binary search for current chord
  const chordIdx = binarySearchChord(timeline.chords, currentTime);

  // Only update DOM if chord changed
  if (chordIdx === lastChordDisplayIdx) return;
  lastChordDisplayIdx = chordIdx;

  if (chordIdx < 0) return;
  const currentChord = timeline.chords[chordIdx];

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

    display = `${chordName}  ${numeral}`;
  }

  // Add tension bar (visual indicator)
  const tensionBar = getTensionBar(currentChord.tension);
  const newText = `${display} ${tensionBar}`;

  // Only update DOM if text actually changed (handles tension bar updates)
  if (newText !== lastChordDisplayText) {
    lastChordDisplayText = newText;
    chordDisplay.textContent = newText;
  }
}

// Pre-computed tension bar strings (avoids per-frame string allocation)
const TENSION_BARS = ['▫▫▫▫▫', '▪▫▫▫▫', '▪▪▫▫▫', '▪▪▪▫▫', '▪▪▪▪▫', '▪▪▪▪▪'];

// Visual tension indicator using block characters
function getTensionBar(tension: number): string {
  return TENSION_BARS[Math.round(tension * 5)];
}

// --- Worker frame callback ---

// --- Animation pause (for background tabs / performance issues) ---
let animationPaused = false;

// Pause animation when tab is hidden (audio continues)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    animationPaused = true;
  } else {
    animationPaused = false;
    lastTime = 0; // Reset delta time to avoid jump
    lowFpsStartTime = null; // Reset low FPS detection
  }
});

// Low FPS detection - pause + warn after sustained poor performance
let lowFpsStartTime: number | null = null;
const LOW_FPS_THRESHOLD = 20;
const LOW_FPS_DURATION = 3000; // 3 seconds

// Quality auto-downgrade - switch to Balanced when FPS is consistently low
const QUALITY_DOWNGRADE_THRESHOLD = 20;  // Sub 20 FPS triggers downgrade consideration
const QUALITY_DOWNGRADE_DURATION = 3000; // 3 seconds sustained low FPS
let qualityDowngradeStartTime: number | null = null;
let hasAutoDowngraded = localStorage.getItem('autoDowngraded') === 'true';

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

    // Low FPS detection (only when tab is visible and playing)
    const isCurrentlyPlaying = audioPlayer.isPlaying();
    if (isCurrentlyPlaying && !document.hidden && currentFps < LOW_FPS_THRESHOLD) {
      if (!lowFpsStartTime) {
        lowFpsStartTime = now;
      } else if (now - lowFpsStartTime > LOW_FPS_DURATION) {
        // Sustained low FPS - pause and warn
        audioPlayer.pause();
        showToast('Performance issue - try Fast quality or simpler preset');
        lowFpsStartTime = null;
      }
    } else {
      lowFpsStartTime = null;
    }

    // Quality auto-downgrade (separate from pause detection)
    // Only auto-downgrade if: playing, visible, not already downgraded, user hasn't manually set quality
    if (isCurrentlyPlaying && !document.hidden && !hasAutoDowngraded && !userSetQuality) {
      // Only downgrade from Sharp to Balanced (not from Balanced to Fast)
      if (currentQualityLevel === 'high' && currentFps < QUALITY_DOWNGRADE_THRESHOLD) {
        if (!qualityDowngradeStartTime) {
          qualityDowngradeStartTime = now;
        } else if (now - qualityDowngradeStartTime > QUALITY_DOWNGRADE_DURATION) {
          // Sustained low FPS on Sharp - downgrade to Balanced
          setQuality('medium', false);  // Not a user action
          hasAutoDowngraded = true;
          localStorage.setItem('autoDowngraded', 'true');
          showToast('Switched to Balanced (720p) for smoother playback', 3000, 'info');
          qualityDowngradeStartTime = null;
        }
      } else {
        qualityDowngradeStartTime = null;
      }
    }
  }
};

// --- Animation / render loop ---

let seekBarFrameCount = 0;
function loop(time: number): void {
  // Update tween animations
  updateTweens(time);

  // Skip rendering when animation is paused (tab hidden), but keep loop alive
  if (animationPaused) {
    requestAnimationFrame(loop);
    return;
  }

  const dt = lastTime === 0 ? 0 : (time - lastTime) / 1000;
  lastTime = time;
  seekBarFrameCount++;

  // Sync button state to truth EVERY frame
  const playing = timeline && audioPlayer.isPlaying();
  setPlayBtnState(!!playing);

  // Check for song completion FIRST (sequencer pauses itself when done, so isPlaying() is false)
  if (timeline && audioPlayer.isFinished()) {
    const currentTime = audioPlayer.getCurrentTime();
    if (currentTime > 0.5) {  // Sanity check - not at start of song
      // Auto-play next song
      const currentIdx = parseInt(songPicker.value);
      const currentSongs = getCurrentSongs();
      if (!isNaN(currentIdx) && currentIdx < currentSongs.length - 1) {
        const nextIdx = currentIdx + 1;
        songPicker.value = String(nextIdx);
        loadSong(nextIdx, true);  // autoPlay = true
        requestAnimationFrame(loop);
        return;  // Exit loop - loadSong handles everything async
      } else {
        // End of playlist - reset to beginning
        resetForSeek(0);
        updateTimeDisplay(0);
      }
    }
  }

  if (playing && timeline) {
    // --- MIDI mode ---
    const currentTime = audioPlayer.getCurrentTime();

    // Throttle seek bar updates to every 4 frames (~15fps)
    if (!seeking && (seekBarFrameCount & 3) === 0) {
      seekBar.value = String(currentTime);
      seekBar.style.setProperty('--progress', String(currentTime / timeline.duration));
    }
    updateTimeDisplay(currentTime);
    updateChordDisplay(currentTime);

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
  } else if (timeline) {
    // Paused with a song loaded - render initial frame then freeze
    if (needsInitialRender) {
      const idleMusic = musicMapper.getIdleMusicParams(0);
      compositor.update(0, idleMusic);
      dirty = true;
      needsInitialRender = false;
    }
  } else {
    // No song loaded - show idle animation
    const idle = musicMapper.getIdleAnchor();
    idlePhase += 0.3 * dt;
    const t = Math.sin(Math.PI * idlePhase);
    const radius = idle.orbitRadius ?? 0.08;
    const cr = idle.real + radius * t * 0.5;
    const ci = idle.imag + radius * t * 0.5;

    fractalEffect.setFractalParams(
      cr, ci, 1.0, 150, renderFidelity,
      idle.type, -0.5, idlePhase * 0.3,
      0  // Default to C (tonic) when no song loaded
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

// Load playlist and track from URL params, or use defaults
const startupParams = new URLSearchParams(window.location.search);
const urlList = startupParams.get('l') as PlaylistCategory | null;
const urlTrack = startupParams.get('t');

if (urlList && urlList !== 'uploads' && playlists[urlList]) {
  currentPlaylist = urlList;
  // Update button states
  playlistClassicalBtn.classList.toggle('active', urlList === 'classical');
  playlistPopBtn.classList.toggle('active', urlList === 'pop');
  playlistVideoBtn.classList.toggle('active', urlList === 'video');
  updatePlaylistPickerState();
  // Rebuild song picker
  const songs = playlists[urlList];
  songPicker.innerHTML = songs.map((s, i) => `<option value="${i}">${s.name}</option>`).join('');
}

const trackIdx = urlTrack !== null ? parseInt(urlTrack) : 0;
const validTrackIdx = !isNaN(trackIdx) && trackIdx >= 0 && trackIdx < playlists[currentPlaylist].length ? trackIdx : 0;
songPicker.value = String(validTrackIdx);
loadSong(validTrackIdx);

// Trigger button glow pulse after UI fade-in completes
setTimeout(() => {
  midiBtn.classList.add('glow-pulse');
}, 800);
