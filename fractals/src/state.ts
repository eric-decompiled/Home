/**
 * State Management Module
 *
 * Centralizes visualizer state for URL sharing, JSON export/import, and localStorage persistence.
 * Handles compression for compact URLs while maintaining full fidelity for JSON/localStorage.
 */

import type { VisualEffect } from './effects/effect-interface.ts';
import { getCustomColors, loadCustomColors } from './effects/effect-utils.ts';

// --- Version & Migration ---

export const CURRENT_VERSION = 1;

type Migrator = (state: VisualizerState) => VisualizerState;

// Add migrations here when breaking changes are needed (requires user approval)
// Example:
// 2: (state) => {
//   // Rename effect: 'old-name' → 'new-name'
//   if (state.layers.bg === 'old-name') state.layers.bg = 'new-name';
//   return { ...state, version: 2 };
// },
const MIGRATIONS: Record<number, Migrator> = {};

/**
 * Migrate state from older versions to current version
 */
export function migrateState(state: VisualizerState): VisualizerState {
  let current = { ...state };

  // No version field → assume version 1
  if (typeof current.version !== 'number') {
    current.version = 1;
  }

  // Apply migrations sequentially
  while (current.version < CURRENT_VERSION) {
    const migrator = MIGRATIONS[current.version + 1];
    if (!migrator) break;
    current = migrator(current);
  }

  return current;
}

// --- State Interface ---

export interface LayerConfig {
  effectId: string | null;
  opacity?: number;
  blend?: string;
}

export interface EffectConfigs {
  [effectId: string]: {
    [key: string]: string | number | boolean;
  };
}

// Fractal anchor for a single harmonic degree
export interface FractalAnchor {
  real: number;
  imag: number;
  type: number;  // fractal type enum (3=BurningShip, 4=Tricorn, etc.)
  orbitRadius: number;  // base radius for orbit ellipse
  orbitSkew?: number;   // aspect ratio: 1=circle, <1=wide, >1=tall (default 1)
  orbitRotation?: number; // ellipse rotation in radians (default 0)
  beatSpread?: number;  // angle between beat points in radians (default π/2 = 90°)
}

// Full anchors for all degrees (0-7, where 0 mirrors 1)
export type FractalAnchors = Record<number, FractalAnchor>;

export interface VisualizerState {
  version: number;
  layers: {
    bg: string | null;
    fg: string | null;
    overlay: string | null;
    melody: string | null;
    bass: string | null;
    hud: string | null;
  };
  configs: EffectConfigs;
  anchors?: FractalAnchors;  // Optional - only in JSON/localStorage, never in URL
  customColors?: Record<number, string>;  // Optional - pitch class (0-11) to hex color
}

// --- Custom Presets ---

export interface CustomPreset {
  id: string;
  name: string;
  state: VisualizerState;
  created: number;  // timestamp
}

/**
 * Full export format including current state and custom presets
 */
export interface FullExport {
  exportVersion: number;
  currentState: VisualizerState;
  customPresets: CustomPreset[];
  exportedAt: number;
}

const PRESETS_STORAGE_KEY = 'fractured-jukebox-presets';

// --- URL Compression Mappings ---

export const SLOT_KEYS = ['bg', 'fg', 'overlay', 'melody', 'bass', 'hud'] as const;
export type SlotKey = typeof SLOT_KEYS[number];

// Effect ID ↔ short name for layer params (single words where possible)
export const EFFECT_SHORT_NAMES: Record<string, string> = {
  'flowfield': 'flow',
  'starfield': 'stars-bg',
  'note-spiral': 'spiral',
  'note-star': 'stars',
  'piano-roll': 'piano',
  'graph-chain': 'chain',
  'domainwarp': 'warp',
  'chladni': 'chladni',
  'kaleidoscope': 'kaleido',
  'feedback-trail': 'trail',
  'fractal': 'fractal',
  'bass-clock': 'clock',
  'bass-fire': 'fire',
  'bass-web': 'web',
  'melody-clock': 'clock',
  'melody-web': 'web',
  'melody-aurora': 'aurora',
  'melody-fire': 'fire',
  'tonnetz': 'tonnetz',
  'wave-interference': 'waves',
  'theory-bar': 'theory',
};

export const SHORT_NAME_TO_EFFECT = Object.fromEntries(
  Object.entries(EFFECT_SHORT_NAMES).map(([k, v]) => [v, k])
);

// Effect ID ↔ 2-letter prefix for config params
export const EFFECT_PREFIXES: Record<string, string> = {
  'flowfield': 'ff',
  'starfield': 'sf',
  'note-spiral': 'ns',
  'note-star': 'nt',
  'piano-roll': 'pr',
  'graph-chain': 'gc',
  'domainwarp': 'dw',
  'chladni': 'ch',
  'kaleidoscope': 'ks',
  'feedback-trail': 'ft',
  'fractal': 'fr',
  'bass-clock': 'bc',
  'bass-fire': 'bf',
  'bass-web': 'bw',
  'melody-clock': 'mc',
  'melody-web': 'mw',
  'melody-aurora': 'ma',
  'melody-fire': 'mf',
  'tonnetz': 'tn',
  'wave-interference': 'wi',
  'theory-bar': 'tb',
};

export const PREFIX_TO_EFFECT = Object.fromEntries(
  Object.entries(EFFECT_PREFIXES).map(([k, v]) => [v, k])
);

// Config key ↔ short key mappings (per effect)
export const CONFIG_SHORTS: Record<string, Record<string, string>> = {
  'flowfield': { 'useWhite': 'w' },
  'note-spiral': {
    'spiralTightness': 't',
    'setShapes': 's',
    'intensity': 'i',
    'trailMax': 'l',
    'darkBackdrop': 'd',
    'glowOutlines': 'g',
  },
  'piano-roll': { 'pianoSound': 'p' },
  'graph-chain': {
    'tonnetzWindowBars': 'w',
    'nodeSize': 'n',
    'edgeWidth': 'e',
    'glowIntensity': 'g',
  },
};

// Build reverse mappings
export const SHORT_TO_CONFIG: Record<string, Record<string, string>> = {};
for (const [effectId, keys] of Object.entries(CONFIG_SHORTS)) {
  SHORT_TO_CONFIG[effectId] = Object.fromEntries(
    Object.entries(keys).map(([k, v]) => [v, k])
  );
}

// --- Preset Definitions ---

export const PRESET_LAYERS: Record<string, (string | null)[]> = {
  // [bg, fg, overlay, melody, bass, hud]
  stars: ['starfield', 'note-star', null, null, 'bass-fire', null],
  clock: ['flowfield', 'note-spiral', null, 'melody-clock', 'bass-clock', 'theory-bar'],
  warp: ['chladni', 'note-spiral', 'kaleidoscope', 'melody-aurora', 'bass-clock', null],
  fractal: [null, 'fractal', 'kaleidoscope', 'melody-web', null, 'theory-bar'],
  piano: ['flowfield', 'piano-roll', null, null, null, null],
  'star-aurora': [null, 'note-star', 'kaleidoscope', 'melody-aurora', 'bass-fire', null],
  'kali-graph': [null, 'graph-chain', 'kaleidoscope', null, null, null],
};

// Preset-specific effect configs (applied when preset is selected)
export const PRESET_CONFIGS: Record<string, EffectConfigs> = {
  stars: {},
  clock: {
    'note-spiral': { setShapes: '' },
  },
  warp: {
    'note-spiral': { setShapes: 'ring,trails' },
    'kaleidoscope': { foldCount: 6.48 },
  },
  fractal: {
    'fractal': { preset: 'phoenix-journey' },
    'kaleidoscope': { foldCount: 6 },
  },
  piano: {},
  'star-aurora': {
    'kaleidoscope': { foldCount: 6 },
  },
  'kali-graph': {
    'graph-chain': {
      tonnetzWindowBars: 1,
      nodeSize: 3,
      edgeWidth: 1,
      glowIntensity: 1,
    },
    'kaleidoscope': {
      foldCount: 12,
    },
  },
};

// --- Default Config Values ---
// NOTE: Effects now provide their own defaults via getDefaults().
// DEFAULT_CONFIGS is kept for URL encoding (stateToURL) to filter out default values.
// Keep this synced with effect getDefaults() methods.

export const DEFAULT_CONFIGS: Record<string, Record<string, unknown>> = {
  'starfield': {
    density: 1.2,
    twinkleAmount: 0.3,
    nebulaOpacity: 0.55,
    parallaxStrength: 0.12,
  },
  'flowfield': {
    particleCount: 800,
    flowSpeed: 0.4,
    noiseScale: 0.003,
    fadeRate: 0.018,
    mouseStrength: 60,
    useWhite: false,
  },
  'note-spiral': {
    setShapes: 'firefly',
    spiralTightness: 1.25,
    intensity: 1.0,
    trailMax: 24,
    darkBackdrop: true,
    glowOutlines: true,
  },
  'piano-roll': {
    fallDuration: 3.0,
    keyboardHeight: 0.12,
    pianoSound: false,
  },
  'bass-clock': { showNumerals: true },
  'bass-web': { showNumerals: true },
  'chladni': { lineWidth: 0.08 },
  'kaleidoscope': {
    foldCount: 7,
    rotationSpeed: 0.2,
    mirrorMode: 'rotate',
    centerOffsetX: 0,
    centerOffsetY: 0,
  },
  'domainwarp': {
    warpAmount: 2.0,
    warpScale: 3.5,
    colorByChord: true,
  },
  'theory-bar': { barHeight: 72 },
  'bass-fire': { showNumerals: true },
  'wave-interference': { decayRate: 8 },
  'note-star': { intensity: 1.0 },
  'melody-clock': { showNotes: true },
  'graph-chain': {
    tonnetzWindowBars: 1,
    nodeSize: 3,
    edgeWidth: 1.0,
    glowIntensity: 1.0,
  },
  'fractal': {
    preset: 'beat-voyage',
  },
};

// --- State Helpers ---

/**
 * Get current state from layer slots and effects
 */
export function getCurrentState(
  layerSlots: { activeId: string | null; effects: VisualEffect[] }[]
): VisualizerState {
  const state: VisualizerState = {
    version: 1,
    layers: {
      bg: layerSlots[0].activeId,
      fg: layerSlots[1].activeId,
      overlay: layerSlots[2].activeId,
      melody: layerSlots[3].activeId,
      bass: layerSlots[4].activeId,
      hud: layerSlots[5]?.activeId ?? null,
    },
    configs: {},
  };

  // Collect configs from all active effects
  for (const slot of layerSlots) {
    if (slot.activeId) {
      const effect = slot.effects.find(e => e.id === slot.activeId);
      if (effect) {
        const configs = effect.getConfig();
        const defaults = effect.getDefaults();
        const effectConfigs: Record<string, string | number | boolean> = {};
        let hasNonDefault = false;

        for (const cfg of configs) {
          // Skip action buttons and specially-handled keys
          if (cfg.key === 'setShapes' || cfg.key === 'activeShapes') continue;

          const defaultVal = defaults[cfg.key];
          if (cfg.value !== defaultVal) {
            effectConfigs[cfg.key] = cfg.value as string | number | boolean;
            hasNonDefault = true;
          }
        }

        // Special case: serialize shapes for note-spiral (use setShapes to match PRESET_CONFIGS)
        if (effect.id === 'note-spiral') {
          const shapeCfg = configs.find(c => c.key === 'activeShapes');
          if (shapeCfg && shapeCfg.value !== defaults['setShapes']) {
            effectConfigs['setShapes'] = shapeCfg.value as string;
            hasNonDefault = true;
          }
        }

        if (hasNonDefault) {
          state.configs[effect.id] = effectConfigs;
        }
      }
    }
  }

  // Include custom colors if any are set
  const customColors = getCustomColors();
  if (Object.keys(customColors).length > 0) {
    state.customColors = customColors;
  }

  return state;
}

/**
 * Apply state to layer slots and effects
 */
export function applyState(
  state: VisualizerState,
  layerSlots: { activeId: string | null; effects: VisualEffect[] }[],
  allEffects: Map<string, VisualEffect>
): void {
  // Apply layers
  const slotKeys: SlotKey[] = ['bg', 'fg', 'overlay', 'melody', 'bass', 'hud'];
  for (let i = 0; i < slotKeys.length; i++) {
    const effectId = state.layers[slotKeys[i]];
    // Validate effect exists in this slot (or is null)
    if (effectId === null || layerSlots[i].effects.some(e => e.id === effectId)) {
      layerSlots[i].activeId = effectId;
    }
  }

  // Apply configs
  for (const [effectId, configs] of Object.entries(state.configs)) {
    const effect = allEffects.get(effectId);
    if (effect) {
      for (const [key, value] of Object.entries(configs)) {
        effect.setConfigValue(key, value);
      }
    }
  }

  // Apply custom colors
  loadCustomColors(state.customColors);
}

// --- Preset Detection ---

/**
 * Check if current layers match a preset
 */
export function detectPreset(
  layerSlots: { activeId: string | null }[]
): string | null {
  for (const [presetName, layers] of Object.entries(PRESET_LAYERS)) {
    let matches = true;
    for (let i = 0; i < layers.length; i++) {
      if (layerSlots[i].activeId !== layers[i]) {
        matches = false;
        break;
      }
    }
    if (matches) return presetName;
  }
  return null;
}

/**
 * Get state for a preset
 */
export function getPresetState(presetName: string): VisualizerState | null {
  const layers = PRESET_LAYERS[presetName];
  if (!layers) return null;

  return {
    version: 1,
    layers: {
      bg: layers[0],
      fg: layers[1],
      overlay: layers[2],
      melody: layers[3],
      bass: layers[4],
      hud: layers[5] ?? null,
    },
    configs: PRESET_CONFIGS[presetName] || {},
  };
}

// --- URL Encoding/Decoding ---

/**
 * Encode state to URL query string (compressed)
 */
export function stateToURL(state: VisualizerState): string {
  const params = new URLSearchParams();

  // Check if layers match a preset
  const layersArray = [
    state.layers.bg,
    state.layers.fg,
    state.layers.overlay,
    state.layers.melody,
    state.layers.bass,
    state.layers.hud,
  ];

  let matchedPreset: string | null = null;
  for (const [presetName, presetLayers] of Object.entries(PRESET_LAYERS)) {
    let matches = true;
    for (let i = 0; i < presetLayers.length; i++) {
      if (layersArray[i] !== presetLayers[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      matchedPreset = presetName;
      break;
    }
  }

  // Only include preset param if not the default (stars)
  if (matchedPreset && matchedPreset !== 'stars') {
    params.set('preset', matchedPreset);
  } else if (!matchedPreset) {
    // Encode layers using short names (only non-null)
    for (let i = 0; i < SLOT_KEYS.length; i++) {
      const effectId = layersArray[i];
      if (effectId) {
        const shortName = EFFECT_SHORT_NAMES[effectId] || effectId;
        params.set(SLOT_KEYS[i], shortName);
      }
    }
  }

  // Encode configs (compressed) - skip configs that match preset or default values
  const presetConfigs = matchedPreset ? PRESET_CONFIGS[matchedPreset] || {} : {};
  for (const [effectId, configs] of Object.entries(state.configs)) {
    const prefix = EFFECT_PREFIXES[effectId] || effectId;
    const shortKeys = CONFIG_SHORTS[effectId] || {};
    const presetEffectConfigs = presetConfigs[effectId] || {};
    const defaultEffectConfigs = DEFAULT_CONFIGS[effectId] || {};

    for (const [key, value] of Object.entries(configs)) {
      // Skip if this config matches what the preset expects
      if (presetEffectConfigs[key] === value) continue;

      // Skip if this config matches the default and preset doesn't override it
      if (!(key in presetEffectConfigs) && defaultEffectConfigs[key] === value) continue;

      const shortKey = shortKeys[key] || key;
      let strValue = String(value);
      if (strValue === 'true') strValue = '1';
      else if (strValue === 'false') strValue = '0';
      params.set(`${prefix}.${shortKey}`, strValue);
    }
  }

  return params.toString();
}

/**
 * Decode URL query string to state
 */
export function urlToState(queryString: string): Partial<VisualizerState> | null {
  const params = new URLSearchParams(queryString);
  const state: Partial<VisualizerState> = {
    version: 1,
    layers: {
      bg: null,
      fg: null,
      overlay: null,
      melody: null,
      bass: null,
      hud: null,
    },
    configs: {},
  };

  // Check for preset
  const preset = params.get('preset');
  if (preset && PRESET_LAYERS[preset]) {
    const presetLayers = PRESET_LAYERS[preset];
    state.layers = {
      bg: presetLayers[0],
      fg: presetLayers[1],
      overlay: presetLayers[2],
      melody: presetLayers[3],
      bass: presetLayers[4],
      hud: presetLayers[5] ?? null,
    };
    // Apply preset configs
    state.configs = { ...PRESET_CONFIGS[preset] };
  }

  // Check for explicit layer params (override preset)
  let hasLayerParams = false;
  for (const key of SLOT_KEYS) {
    const val = params.get(key);
    if (val !== null) {
      hasLayerParams = true;
      if (val === 'none' || val === '') {
        state.layers![key as SlotKey] = null;
      } else {
        // Expand short name to full effect ID
        state.layers![key as SlotKey] = SHORT_NAME_TO_EFFECT[val] ?? val;
      }
    }
  }

  // If no preset and no layer params, return null (use defaults)
  if (!preset && !hasLayerParams) {
    // Check for config params
    let hasConfigParams = false;
    params.forEach((_, key) => {
      if (key.includes('.')) hasConfigParams = true;
    });
    if (!hasConfigParams) return null;
  }

  // Parse effect configs
  params.forEach((value, key) => {
    if (key.includes('.')) {
      const [effectPart, configPart] = key.split('.', 2);

      // Expand prefix to effect ID
      const effectId = PREFIX_TO_EFFECT[effectPart];
      if (!effectId) return;

      // Expand short config key
      const configKey = SHORT_TO_CONFIG[effectId]?.[configPart] || configPart;

      // Parse value
      let parsedValue: string | number | boolean = value;
      if (value === '1' || value === 'true') parsedValue = true;
      else if (value === '0' || value === 'false') parsedValue = false;
      else if (!isNaN(Number(value))) parsedValue = Number(value);

      if (!state.configs![effectId]) state.configs![effectId] = {};
      state.configs![effectId][configKey] = parsedValue;
    }
  });

  // Migrate if needed
  return migrateState(state as VisualizerState);
}

/**
 * Update browser URL with current state (no page reload)
 */
export function updateBrowserURL(state: VisualizerState): void {
  const queryString = stateToURL(state);
  const newURL = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;
  history.replaceState(null, '', newURL);
}

// --- JSON Export/Import ---

/**
 * Export state to JSON string (full fidelity, no compression)
 */
export function stateToJSON(state: VisualizerState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Import state from JSON string (with migration)
 */
export function jsonToState(json: string): VisualizerState | null {
  try {
    const parsed = JSON.parse(json);
    // Validate minimal structure
    if (typeof parsed.layers !== 'object') return null;
    // Migrate and return
    return migrateState(parsed as VisualizerState);
  } catch {
    return null;
  }
}

// --- localStorage Persistence ---

const STORAGE_KEY = 'fractured-jukebox-state';

/**
 * Save state to localStorage
 */
export function saveToLocalStorage(state: VisualizerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, stateToJSON(state));
  } catch (e) {
    console.warn('Failed to save state to localStorage:', e);
  }
}

/**
 * Load state from localStorage (with migration)
 */
export function loadFromLocalStorage(): VisualizerState | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    // jsonToState already applies migration
    return jsonToState(json);
  } catch (e) {
    console.warn('Failed to load state from localStorage:', e);
    return null;
  }
}

/**
 * Clear saved state from localStorage
 */
export function clearLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear localStorage:', e);
  }
}

// --- Custom Presets Management ---

/**
 * Generate a unique ID for a preset
 */
function generatePresetId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Get all custom presets
 */
export function getCustomPresets(): CustomPreset[] {
  try {
    const json = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!json) return [];
    const presets = JSON.parse(json) as CustomPreset[];
    // Migrate any old presets
    return presets.map(p => ({
      ...p,
      state: migrateState(p.state),
    }));
  } catch (e) {
    console.warn('Failed to load custom presets:', e);
    return [];
  }
}

/**
 * Save a new custom preset
 */
export function saveCustomPreset(name: string, state: VisualizerState): CustomPreset {
  const presets = getCustomPresets();
  const preset: CustomPreset = {
    id: generatePresetId(),
    name: name.trim() || 'Untitled',
    state: { ...state, version: CURRENT_VERSION },
    created: Date.now(),
  };
  presets.push(preset);
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.warn('Failed to save custom preset:', e);
  }
  return preset;
}

/**
 * Delete a custom preset by ID
 */
export function deleteCustomPreset(id: string): boolean {
  const presets = getCustomPresets();
  const index = presets.findIndex(p => p.id === id);
  if (index === -1) return false;
  presets.splice(index, 1);
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    return true;
  } catch (e) {
    console.warn('Failed to delete custom preset:', e);
    return false;
  }
}

/**
 * Delete all custom presets
 */
export function deleteAllCustomPresets(): void {
  try {
    localStorage.removeItem(PRESETS_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to delete all custom presets:', e);
  }
}

/**
 * Set all custom presets (for import)
 */
export function setCustomPresets(presets: CustomPreset[]): void {
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.warn('Failed to set custom presets:', e);
  }
}

/**
 * Rename a custom preset
 */
export function renameCustomPreset(id: string, newName: string): boolean {
  const presets = getCustomPresets();
  const preset = presets.find(p => p.id === id);
  if (!preset) return false;
  preset.name = newName.trim() || 'Untitled';
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    return true;
  } catch (e) {
    console.warn('Failed to rename custom preset:', e);
    return false;
  }
}

// --- Fractal Anchors ---

const ANCHORS_STORAGE_KEY = 'fractal-anchors';

/**
 * Load fractal anchors from localStorage
 */
export function loadFractalAnchors(): FractalAnchors | null {
  try {
    const json = localStorage.getItem(ANCHORS_STORAGE_KEY);
    if (!json) return null;
    return JSON.parse(json) as FractalAnchors;
  } catch (e) {
    console.warn('Failed to load fractal anchors:', e);
    return null;
  }
}

/**
 * Save fractal anchors to localStorage
 */
export function saveFractalAnchors(anchors: FractalAnchors): void {
  try {
    localStorage.setItem(ANCHORS_STORAGE_KEY, JSON.stringify(anchors));
  } catch (e) {
    console.warn('Failed to save fractal anchors:', e);
  }
}

// --- Anchor Presets ---

const ANCHOR_PRESETS_KEY = 'fractured-jukebox-anchor-presets';

export interface AnchorPreset {
  id: string;
  name: string;
  anchors: FractalAnchors;
  builtIn?: boolean;
}

// Orbit radii by family type (based on boundary sensitivity)
// See research/fractal-theory.md "Orbit Design Theory" for rationale
const RADIUS_SMALL = 0.025;   // Sensitive families (Burning Ship, Magnet, Barnsley)
const RADIUS_MEDIUM = 0.05;   // Default for most families
const RADIUS_LARGE = 0.10;    // Stable families (Newton, Sine)

// Built-in anchor presets showcasing different families
// Each uses family-appropriate orbit radius based on boundary sensitivity
export const BUILTIN_ANCHOR_PRESETS: AnchorPreset[] = [
  {
    id: 'beat-voyage',
    name: 'Beat Voyage',
    builtIn: true,
    anchors: {
      0: { real: 0.2800, imag: 0.5300, type: 0, orbitRadius: 0.0500, orbitSkew: 1.00, orbitRotation: 0.00, beatSpread: 1.57 },
      1: { real: -0.8649, imag: 0.2083, type: 6, orbitRadius: 0.3199, orbitSkew: 1.50, orbitRotation: 1.83, beatSpread: 0.16 },
      2: { real: -0.8149, imag: 0.3799, type: 0, orbitRadius: 0.1094, orbitSkew: 1.00, orbitRotation: 4.00, beatSpread: 0.69 },
      3: { real: -0.6572, imag: 0.7617, type: 8, orbitRadius: 0.2480, orbitSkew: 1.00, orbitRotation: -0.09, beatSpread: 0.46 },
      4: { real: -0.6267, imag: -0.8198, type: 9, orbitRadius: 0.2671, orbitSkew: 0.62, orbitRotation: -1.43, beatSpread: 0.24 },
      5: { real: 0.6866, imag: -0.5589, type: 9, orbitRadius: 0.4612, orbitSkew: 0.59, orbitRotation: -1.93, beatSpread: 0.31 },
      6: { real: 0.4743, imag: -0.2137, type: 5, orbitRadius: 0.1000, orbitSkew: 2.00, orbitRotation: -1.02, beatSpread: 0.15 },
      7: { real: -0.8474, imag: -0.4560, type: 0, orbitRadius: 0.1794, orbitSkew: 1.00, orbitRotation: 0.49, beatSpread: 0.57 },
    },
  },
  {
    id: 'classic-mix',
    name: 'Classic Mix',
    builtIn: true,
    anchors: {
      0: { real: -0.4, imag: 0.6, type: 6, orbitRadius: RADIUS_MEDIUM },     // Celtic
      1: { real: -0.4, imag: 0.6, type: 6, orbitRadius: RADIUS_MEDIUM },     // Celtic
      2: { real: -1.75, imag: -0.02, type: 3, orbitRadius: RADIUS_SMALL },   // Burning Ship
      3: { real: 0.285, imag: 0.01, type: 5, orbitRadius: RADIUS_MEDIUM },   // Phoenix
      4: { real: -0.8, imag: 0.156, type: 6, orbitRadius: RADIUS_MEDIUM },   // Celtic
      5: { real: -1.75, imag: 0.0, type: 8, orbitRadius: RADIUS_SMALL },     // PerpBurn
      6: { real: 0.285, imag: 0.53, type: 5, orbitRadius: RADIUS_MEDIUM },   // Phoenix
      7: { real: -1.75, imag: -0.05, type: 3, orbitRadius: RADIUS_SMALL },   // Burning Ship
    },
  },
  {
    id: 'newton-basins',
    name: 'Newton Basins',
    builtIn: true,
    anchors: {
      0: { real: 0.5, imag: 0.5, type: 10, orbitRadius: RADIUS_LARGE },
      1: { real: 0.5, imag: 0.5, type: 10, orbitRadius: RADIUS_LARGE },
      2: { real: -0.3, imag: 0.8, type: 10, orbitRadius: RADIUS_LARGE },
      3: { real: 0.7, imag: -0.2, type: 10, orbitRadius: RADIUS_LARGE },
      4: { real: 0.0, imag: 1.0, type: 10, orbitRadius: RADIUS_LARGE },
      5: { real: -0.5, imag: 0.5, type: 10, orbitRadius: RADIUS_LARGE },
      6: { real: 0.3, imag: 0.7, type: 10, orbitRadius: RADIUS_LARGE },
      7: { real: -0.7, imag: 0.3, type: 10, orbitRadius: RADIUS_LARGE },
    },
  },
  {
    id: 'nova-layers',
    name: 'Nova Layers',
    builtIn: true,
    anchors: {
      0: { real: 0.3, imag: 0.0, type: 11, orbitRadius: RADIUS_MEDIUM },
      1: { real: 0.3, imag: 0.0, type: 11, orbitRadius: RADIUS_MEDIUM },
      2: { real: 0.4, imag: 0.1, type: 11, orbitRadius: RADIUS_MEDIUM },
      3: { real: 0.2, imag: -0.2, type: 11, orbitRadius: RADIUS_MEDIUM },
      4: { real: 0.35, imag: 0.15, type: 11, orbitRadius: RADIUS_MEDIUM },
      5: { real: 0.5, imag: 0.0, type: 11, orbitRadius: RADIUS_MEDIUM },
      6: { real: 0.25, imag: 0.25, type: 11, orbitRadius: RADIUS_MEDIUM },
      7: { real: 0.45, imag: -0.1, type: 11, orbitRadius: RADIUS_MEDIUM },
    },
  },
  {
    id: 'magnet-flames',
    name: 'Magnet Flames',
    builtIn: true,
    anchors: {
      0: { real: 0.0, imag: 0.0, type: 13, orbitRadius: RADIUS_SMALL },
      1: { real: 0.0, imag: 0.0, type: 13, orbitRadius: RADIUS_SMALL },
      2: { real: 0.5, imag: 0.5, type: 13, orbitRadius: RADIUS_SMALL },
      3: { real: -0.5, imag: 0.5, type: 13, orbitRadius: RADIUS_SMALL },
      4: { real: 0.3, imag: -0.3, type: 13, orbitRadius: RADIUS_SMALL },
      5: { real: 1.0, imag: 0.0, type: 13, orbitRadius: RADIUS_SMALL },
      6: { real: -0.3, imag: 0.6, type: 13, orbitRadius: RADIUS_SMALL },
      7: { real: 0.7, imag: 0.4, type: 13, orbitRadius: RADIUS_SMALL },
    },
  },
  {
    id: 'organic-ferns',
    name: 'Organic Ferns',
    builtIn: true,
    anchors: {
      0: { real: 0.6, imag: 1.1, type: 14, orbitRadius: RADIUS_SMALL },
      1: { real: 0.6, imag: 1.1, type: 14, orbitRadius: RADIUS_SMALL },
      2: { real: 0.5, imag: 1.0, type: 15, orbitRadius: RADIUS_MEDIUM },
      3: { real: 0.7, imag: 0.9, type: 14, orbitRadius: RADIUS_SMALL },
      4: { real: 0.55, imag: 1.05, type: 16, orbitRadius: RADIUS_MEDIUM },
      5: { real: 0.65, imag: 1.15, type: 14, orbitRadius: RADIUS_SMALL },
      6: { real: 0.45, imag: 0.95, type: 15, orbitRadius: RADIUS_MEDIUM },
      7: { real: 0.75, imag: 1.2, type: 16, orbitRadius: RADIUS_SMALL },
    },
  },
  {
    id: 'angular-mix',
    name: 'Angular Mix',
    builtIn: true,
    anchors: {
      0: { real: -0.4, imag: 0.6, type: 4, orbitRadius: RADIUS_MEDIUM },
      1: { real: -0.4, imag: 0.6, type: 4, orbitRadius: RADIUS_MEDIUM },
      2: { real: -0.5, imag: 0.5, type: 17, orbitRadius: RADIUS_MEDIUM },
      3: { real: -1.75, imag: -0.02, type: 3, orbitRadius: RADIUS_SMALL },
      4: { real: -0.3, imag: 0.7, type: 4, orbitRadius: RADIUS_MEDIUM },
      5: { real: -0.6, imag: 0.4, type: 17, orbitRadius: RADIUS_MEDIUM },
      6: { real: -1.7, imag: 0.05, type: 3, orbitRadius: RADIUS_SMALL },
      7: { real: -0.45, imag: 0.55, type: 4, orbitRadius: RADIUS_MEDIUM },
    },
  },
  {
    id: 'celtic-knots',
    name: 'Celtic Knots',
    builtIn: true,
    anchors: {
      // All Celtic (6) - knot patterns spread across c-plane
      // Larger orbits (0.18-0.35) for visible motion in Celtic family
      0: { real: -0.40, imag: 0.60, type: 6, orbitRadius: 0.22 },   // chromatic: upper left
      1: { real: -0.80, imag: 0.16, type: 6, orbitRadius: 0.20 },   // I tonic: cardioid edge
      2: { real: -0.45, imag: -0.50, type: 6, orbitRadius: 0.25 },  // ii: lower left
      3: { real: 0.30, imag: 0.55, type: 6, orbitRadius: 0.22 },    // iii: upper right
      4: { real: -1.00, imag: 0.30, type: 6, orbitRadius: 0.28 },   // IV: far left bulb
      5: { real: 0.35, imag: -0.40, type: 6, orbitRadius: 0.30 },   // V: lower right (tension)
      6: { real: -0.20, imag: 0.70, type: 6, orbitRadius: 0.20 },   // vi: top
      7: { real: -0.75, imag: -0.25, type: 6, orbitRadius: 0.35 },  // vii: lower far (max tension)
    },
  },
  {
    id: 'phoenix-journey',
    name: 'Phoenix Journey',
    builtIn: true,
    anchors: {
      // Phoenix (5) exploration - radial journey from center outward
      // Lower tension (I, IV, vi) = closer to origin, calmer shapes
      // Higher tension (V, vii) = farther out, more dramatic boundaries
      0: { real: 0.28, imag: 0.01, type: 5, orbitRadius: 0.08 },   // chromatic: near origin
      1: { real: 0.28, imag: 0.01, type: 5, orbitRadius: 0.08 },   // I tonic: calm center
      2: { real: 0.35, imag: 0.35, type: 5, orbitRadius: 0.10 },   // ii: upper right quadrant
      3: { real: 0.45, imag: 0.20, type: 5, orbitRadius: 0.10 },   // iii: mid-right
      4: { real: 0.30, imag: -0.25, type: 5, orbitRadius: 0.09 },  // IV: lower right
      5: { real: 0.56, imag: 0.43, type: 5, orbitRadius: 0.12 },   // V: outer boundary (tension)
      6: { real: 0.40, imag: 0.10, type: 5, orbitRadius: 0.09 },   // vi: between I and iii
      7: { real: 0.52, imag: 0.52, type: 5, orbitRadius: 0.14 },   // vii: max tension, outer corner
    },
  },
];

/**
 * Get all anchor presets (built-in + custom)
 */
export function getAnchorPresets(): AnchorPreset[] {
  const custom = getCustomAnchorPresets();
  return [...BUILTIN_ANCHOR_PRESETS, ...custom];
}

/**
 * Get custom anchor presets from localStorage
 */
export function getCustomAnchorPresets(): AnchorPreset[] {
  try {
    const json = localStorage.getItem(ANCHOR_PRESETS_KEY);
    if (!json) return [];
    return JSON.parse(json) as AnchorPreset[];
  } catch {
    return [];
  }
}

/**
 * Save a custom anchor preset
 */
export function saveAnchorPreset(name: string, anchors: FractalAnchors): AnchorPreset {
  const presets = getCustomAnchorPresets();
  const id = `custom-${Date.now()}`;
  const preset: AnchorPreset = { id, name, anchors };
  presets.push(preset);
  localStorage.setItem(ANCHOR_PRESETS_KEY, JSON.stringify(presets));
  return preset;
}

/**
 * Delete a custom anchor preset
 */
export function deleteAnchorPreset(id: string): void {
  const presets = getCustomAnchorPresets().filter(p => p.id !== id);
  localStorage.setItem(ANCHOR_PRESETS_KEY, JSON.stringify(presets));
}

/**
 * Apply an anchor preset (saves to current anchors)
 */
export function applyAnchorPreset(preset: AnchorPreset): void {
  saveFractalAnchors(preset.anchors);
}

/**
 * Get current state including fractal anchors (for JSON export / preset save)
 */
export function getFullState(
  layerSlots: { activeId: string | null; effects: VisualEffect[] }[]
): VisualizerState {
  const state = getCurrentState(layerSlots);
  const anchors = loadFractalAnchors();
  if (anchors) {
    state.anchors = anchors;
  }
  return state;
}

/**
 * Apply full state including fractal anchors
 */
export function applyFullState(
  state: VisualizerState,
  layerSlots: { activeId: string | null; effects: VisualEffect[] }[],
  allEffects: Map<string, VisualEffect>
): void {
  // Apply layers and effect configs
  applyState(state, layerSlots, allEffects);

  // Apply fractal anchors if present
  if (state.anchors) {
    saveFractalAnchors(state.anchors);
  }
}

/**
 * Validate a single VisualizerState
 */
function validateVisualizerState(state: Record<string, unknown>, prefix = ''): string | null {
  // Check version
  if (typeof state.version !== 'number') {
    return `${prefix}Missing or invalid "version" field`;
  }

  // Check layers
  if (!state.layers || typeof state.layers !== 'object') {
    return `${prefix}Missing or invalid "layers" field`;
  }

  const layers = state.layers as Record<string, unknown>;
  const validSlots = ['bg', 'fg', 'overlay', 'melody', 'bass', 'hud'];
  for (const slot of validSlots) {
    if (!(slot in layers)) {
      return `${prefix}Missing layer slot: "${slot}"`;
    }
    const val = layers[slot];
    if (val !== null && typeof val !== 'string') {
      return `${prefix}Invalid layer "${slot}": expected string or null`;
    }
  }

  // Check configs
  if (!state.configs || typeof state.configs !== 'object') {
    return `${prefix}Missing or invalid "configs" field`;
  }

  const configs = state.configs as Record<string, unknown>;
  for (const [effectId, effectConfig] of Object.entries(configs)) {
    if (typeof effectConfig !== 'object' || effectConfig === null) {
      return `${prefix}Invalid config for effect "${effectId}": expected object`;
    }
    for (const [key, value] of Object.entries(effectConfig as Record<string, unknown>)) {
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        return `${prefix}Invalid config value for "${effectId}.${key}"`;
      }
    }
  }

  // Check anchors (optional)
  if (state.anchors !== undefined) {
    if (typeof state.anchors !== 'object' || state.anchors === null) {
      return `${prefix}Invalid "anchors" field: expected object`;
    }

    const anchors = state.anchors as Record<string, unknown>;
    for (const [degree, anchor] of Object.entries(anchors)) {
      if (typeof anchor !== 'object' || anchor === null) {
        return `${prefix}Invalid anchor for degree ${degree}`;
      }
      const a = anchor as Record<string, unknown>;
      if (typeof a.real !== 'number' || typeof a.imag !== 'number' || typeof a.type !== 'number') {
        return `${prefix}Invalid anchor for degree ${degree}`;
      }
      // Must have orbitRadius (or legacy orbits array for backwards compat)
      if (typeof a.orbitRadius !== 'number' && !Array.isArray(a.orbits)) {
        return `${prefix}Invalid anchor for degree ${degree}: missing orbitRadius`;
      }
    }
  }

  return null;
}

/**
 * Validate imported data schema (supports both FullExport and legacy VisualizerState)
 * Returns null if valid, error message string if invalid
 */
export function validateStateSchema(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return 'Invalid format: expected an object';
  }

  const obj = data as Record<string, unknown>;

  // Check if this is the new FullExport format
  if ('exportVersion' in obj && 'currentState' in obj && 'customPresets' in obj) {
    // Validate FullExport format
    if (typeof obj.exportVersion !== 'number') {
      return 'Invalid "exportVersion" field';
    }

    // Validate currentState
    if (!obj.currentState || typeof obj.currentState !== 'object') {
      return 'Invalid "currentState" field';
    }
    const stateError = validateVisualizerState(obj.currentState as Record<string, unknown>, 'currentState: ');
    if (stateError) return stateError;

    // Validate customPresets array
    if (!Array.isArray(obj.customPresets)) {
      return 'Invalid "customPresets" field: expected array';
    }

    for (let i = 0; i < obj.customPresets.length; i++) {
      const preset = obj.customPresets[i] as Record<string, unknown>;
      if (!preset || typeof preset !== 'object') {
        return `Invalid preset at index ${i}`;
      }
      if (typeof preset.id !== 'string' || typeof preset.name !== 'string') {
        return `Invalid preset at index ${i}: missing id or name`;
      }
      if (!preset.state || typeof preset.state !== 'object') {
        return `Invalid preset "${preset.name}": missing state`;
      }
      const presetStateError = validateVisualizerState(preset.state as Record<string, unknown>, `Preset "${preset.name}": `);
      if (presetStateError) return presetStateError;
    }

    return null;
  }

  // Legacy format: just a VisualizerState
  return validateVisualizerState(obj);
}

/**
 * Check if data is FullExport format
 */
export function isFullExport(data: unknown): data is FullExport {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return 'exportVersion' in obj && 'currentState' in obj && 'customPresets' in obj;
}
