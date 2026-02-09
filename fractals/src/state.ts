/**
 * State Management Module
 *
 * Centralizes visualizer state for URL sharing, JSON export/import, and localStorage persistence.
 * Handles compression for compact URLs while maintaining full fidelity for JSON/localStorage.
 */

import type { VisualEffect } from './effects/effect-interface.ts';

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
export interface FractalOrbit {
  dr: number;  // real offset
  di: number;  // imaginary offset
}

export interface FractalAnchor {
  real: number;
  imag: number;
  type: number;  // fractal type enum (3=BurningShip, 4=Tricorn, etc.)
  orbits: [FractalOrbit, FractalOrbit, FractalOrbit, FractalOrbit];
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
  };
  configs: EffectConfigs;
  anchors?: FractalAnchors;  // Optional - only in JSON/localStorage, never in URL
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

export const SLOT_KEYS = ['bg', 'fg', 'overlay', 'melody', 'bass'] as const;
export type SlotKey = typeof SLOT_KEYS[number];

// Effect ID ↔ short name for layer params (single words where possible)
export const EFFECT_SHORT_NAMES: Record<string, string> = {
  'flowfield': 'flow',
  'note-spiral': 'spiral',
  'piano-roll': 'piano',
  'domainwarp': 'warp',
  'chladni': 'chladni',
  'kaleidoscope': 'kaleido',
  'fractal': 'fractal',
  'bass-clock': 'clock',
  'bass-web': 'web',
  'melody-clock': 'clock',
  'melody-web': 'web',
  'melody-aurora': 'aurora',
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
  'note-spiral': 'ns',
  'piano-roll': 'pr',
  'domainwarp': 'dw',
  'chladni': 'ch',
  'kaleidoscope': 'ks',
  'fractal': 'fr',
  'bass-clock': 'bc',
  'bass-web': 'bw',
  'melody-clock': 'mc',
  'melody-web': 'mw',
  'melody-aurora': 'ma',
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
  spiral: ['flowfield', 'note-spiral', 'theory-bar', null, 'bass-clock'],
  warp: ['chladni', 'note-spiral', 'kaleidoscope', null, 'bass-clock'],
  fractal: ['domainwarp', 'fractal', 'theory-bar', null, null],
  piano: ['flowfield', 'piano-roll', 'theory-bar', null, null],
};

// Preset-specific effect configs (applied when preset is selected)
export const PRESET_CONFIGS: Record<string, EffectConfigs> = {
  spiral: {},
  warp: {
    'note-spiral': { setShapes: 'ring' },
  },
  fractal: {
    'domainwarp': { colorByChord: false },
  },
  piano: {},
};

// --- Default Config Values ---

export const DEFAULT_CONFIGS: Record<string, Record<string, unknown>> = {
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
    trailMax: 48,
    darkBackdrop: true,
    glowOutlines: true,
  },
  'piano-roll': { pianoSound: false },
  'bass-clock': { radius: 0.45 },
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
  'theory-bar': { barHeight: 64 },
};

export function getDefaultConfigValue(effectId: string, key: string): unknown {
  return DEFAULT_CONFIGS[effectId]?.[key];
}

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
    },
    configs: {},
  };

  // Collect configs from all active effects
  for (const slot of layerSlots) {
    if (slot.activeId) {
      const effect = slot.effects.find(e => e.id === slot.activeId);
      if (effect) {
        const configs = effect.getConfig();
        const effectConfigs: Record<string, string | number | boolean> = {};
        let hasNonDefault = false;

        for (const cfg of configs) {
          // Skip action buttons and specially-handled keys
          if (cfg.key === 'setShapes' || cfg.key === 'activeShapes') continue;

          const defaultVal = getDefaultConfigValue(effect.id, cfg.key);
          if (cfg.value !== defaultVal) {
            effectConfigs[cfg.key] = cfg.value as string | number | boolean;
            hasNonDefault = true;
          }
        }

        // Special case: serialize shapes for note-spiral (use setShapes to match PRESET_CONFIGS)
        if (effect.id === 'note-spiral') {
          const shapeCfg = configs.find(c => c.key === 'activeShapes');
          if (shapeCfg && shapeCfg.value !== 'firefly') {
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
  const slotKeys: SlotKey[] = ['bg', 'fg', 'overlay', 'melody', 'bass'];
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

  if (matchedPreset) {
    params.set('preset', matchedPreset);
  } else {
    // Encode layers using short names (only non-null)
    for (let i = 0; i < SLOT_KEYS.length; i++) {
      const effectId = layersArray[i];
      if (effectId) {
        const shortName = EFFECT_SHORT_NAMES[effectId] || effectId;
        params.set(SLOT_KEYS[i], shortName);
      }
    }
  }

  // Encode configs (compressed) - skip configs that match preset defaults
  const presetConfigs = matchedPreset ? PRESET_CONFIGS[matchedPreset] || {} : {};
  for (const [effectId, configs] of Object.entries(state.configs)) {
    const prefix = EFFECT_PREFIXES[effectId] || effectId;
    const shortKeys = CONFIG_SHORTS[effectId] || {};
    const presetEffectConfigs = presetConfigs[effectId] || {};

    for (const [key, value] of Object.entries(configs)) {
      // Skip if this config matches what the preset expects
      if (presetEffectConfigs[key] === value) continue;

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

// Orbit patterns by family type (based on boundary sensitivity)
// See research/fractal-theory.md "Orbit Design Theory" for rationale

// Small circular - for sensitive families (Burning Ship, Magnet, Barnsley)
const ORBIT_SMALL: [FractalOrbit, FractalOrbit, FractalOrbit, FractalOrbit] = [
  { dr: 0.025, di: 0 },
  { dr: 0, di: 0.025 },
  { dr: -0.025, di: 0 },
  { dr: 0, di: -0.025 },
];

// Medium circular - default for most families
const ORBIT_MEDIUM: [FractalOrbit, FractalOrbit, FractalOrbit, FractalOrbit] = [
  { dr: 0.05, di: 0 },
  { dr: 0, di: 0.05 },
  { dr: -0.05, di: 0 },
  { dr: 0, di: -0.05 },
];

// Large circular - for stable families (Newton, Sine)
const ORBIT_LARGE: [FractalOrbit, FractalOrbit, FractalOrbit, FractalOrbit] = [
  { dr: 0.10, di: 0 },
  { dr: 0, di: 0.10 },
  { dr: -0.10, di: 0 },
  { dr: 0, di: -0.10 },
];

// Pendulum (horizontal) - good for Sine's periodic structure
const ORBIT_PENDULUM: [FractalOrbit, FractalOrbit, FractalOrbit, FractalOrbit] = [
  { dr: 0.12, di: 0 },
  { dr: -0.12, di: 0 },
  { dr: 0.12, di: 0 },
  { dr: -0.12, di: 0 },
];

// Breathing (expand/contract) - good for Magnet convergence
const ORBIT_BREATHING: [FractalOrbit, FractalOrbit, FractalOrbit, FractalOrbit] = [
  { dr: 0.03, di: 0.03 },
  { dr: 0, di: 0 },
  { dr: 0.03, di: 0.03 },
  { dr: 0, di: 0 },
];

// Asymmetric (emphasis on beat 1) - good for angular families
const ORBIT_ASYMMETRIC: [FractalOrbit, FractalOrbit, FractalOrbit, FractalOrbit] = [
  { dr: 0.06, di: 0 },
  { dr: 0, di: 0.03 },
  { dr: -0.04, di: 0 },
  { dr: 0, di: -0.03 },
];

// Built-in anchor presets showcasing different families
// Each uses family-appropriate orbit patterns based on boundary sensitivity
export const BUILTIN_ANCHOR_PRESETS: AnchorPreset[] = [
  {
    id: 'classic-mix',
    name: 'Classic Mix',
    builtIn: true,
    anchors: {
      0: { real: -0.4, imag: 0.6, type: 6, orbits: ORBIT_MEDIUM },     // Celtic - medium
      1: { real: -0.4, imag: 0.6, type: 6, orbits: ORBIT_MEDIUM },     // Celtic
      2: { real: -1.75, imag: -0.02, type: 3, orbits: ORBIT_SMALL },   // Burning Ship - sensitive
      3: { real: 0.285, imag: 0.01, type: 5, orbits: ORBIT_MEDIUM },   // Phoenix
      4: { real: -0.8, imag: 0.156, type: 6, orbits: ORBIT_MEDIUM },   // Celtic
      5: { real: -1.75, imag: 0.0, type: 8, orbits: ORBIT_SMALL },     // PerpBurn - sensitive
      6: { real: 0.285, imag: 0.53, type: 5, orbits: ORBIT_MEDIUM },   // Phoenix
      7: { real: -1.75, imag: -0.05, type: 3, orbits: ORBIT_SMALL },   // Burning Ship
    },
  },
  {
    id: 'newton-basins',
    name: 'Newton Basins',
    builtIn: true,
    anchors: {
      // Newton is very stable - use large orbits for visible motion
      0: { real: 0.5, imag: 0.5, type: 10, orbits: ORBIT_LARGE },
      1: { real: 0.5, imag: 0.5, type: 10, orbits: ORBIT_LARGE },
      2: { real: -0.3, imag: 0.8, type: 10, orbits: ORBIT_LARGE },
      3: { real: 0.7, imag: -0.2, type: 10, orbits: ORBIT_LARGE },
      4: { real: 0.0, imag: 1.0, type: 10, orbits: ORBIT_LARGE },
      5: { real: -0.5, imag: 0.5, type: 10, orbits: ORBIT_LARGE },
      6: { real: 0.3, imag: 0.7, type: 10, orbits: ORBIT_LARGE },
      7: { real: -0.7, imag: 0.3, type: 10, orbits: ORBIT_LARGE },
    },
  },
  {
    id: 'nova-layers',
    name: 'Nova Layers',
    builtIn: true,
    anchors: {
      // Nova is Julia-like, medium sensitivity
      0: { real: 0.3, imag: 0.0, type: 11, orbits: ORBIT_MEDIUM },
      1: { real: 0.3, imag: 0.0, type: 11, orbits: ORBIT_MEDIUM },
      2: { real: 0.4, imag: 0.1, type: 11, orbits: ORBIT_MEDIUM },
      3: { real: 0.2, imag: -0.2, type: 11, orbits: ORBIT_MEDIUM },
      4: { real: 0.35, imag: 0.15, type: 11, orbits: ORBIT_MEDIUM },
      5: { real: 0.5, imag: 0.0, type: 11, orbits: ORBIT_MEDIUM },
      6: { real: 0.25, imag: 0.25, type: 11, orbits: ORBIT_MEDIUM },
      7: { real: 0.45, imag: -0.1, type: 11, orbits: ORBIT_MEDIUM },
    },
  },
  {
    id: 'sine-waves',
    name: 'Sine Waves',
    builtIn: true,
    anchors: {
      // Sine is periodic - use pendulum motion along real axis
      0: { real: 1.0, imag: 0.0, type: 12, orbits: ORBIT_PENDULUM },
      1: { real: 1.0, imag: 0.0, type: 12, orbits: ORBIT_PENDULUM },
      2: { real: 1.2, imag: 0.3, type: 12, orbits: ORBIT_PENDULUM },
      3: { real: 0.8, imag: -0.4, type: 12, orbits: ORBIT_LARGE },
      4: { real: 1.1, imag: 0.2, type: 12, orbits: ORBIT_PENDULUM },
      5: { real: 1.3, imag: 0.0, type: 12, orbits: ORBIT_PENDULUM },
      6: { real: 0.9, imag: 0.5, type: 12, orbits: ORBIT_LARGE },
      7: { real: 1.4, imag: -0.2, type: 12, orbits: ORBIT_PENDULUM },
    },
  },
  {
    id: 'magnet-flames',
    name: 'Magnet Flames',
    builtIn: true,
    anchors: {
      // Magnet converges to z=1 - use breathing pattern, small radius
      0: { real: 0.0, imag: 0.0, type: 13, orbits: ORBIT_BREATHING },
      1: { real: 0.0, imag: 0.0, type: 13, orbits: ORBIT_BREATHING },
      2: { real: 0.5, imag: 0.5, type: 13, orbits: ORBIT_BREATHING },
      3: { real: -0.5, imag: 0.5, type: 13, orbits: ORBIT_SMALL },
      4: { real: 0.3, imag: -0.3, type: 13, orbits: ORBIT_BREATHING },
      5: { real: 1.0, imag: 0.0, type: 13, orbits: ORBIT_SMALL },
      6: { real: -0.3, imag: 0.6, type: 13, orbits: ORBIT_BREATHING },
      7: { real: 0.7, imag: 0.4, type: 13, orbits: ORBIT_SMALL },
    },
  },
  {
    id: 'organic-ferns',
    name: 'Organic Ferns',
    builtIn: true,
    anchors: {
      // Barnsley has conditional branching - use small/asymmetric orbits
      0: { real: 0.6, imag: 1.1, type: 14, orbits: ORBIT_SMALL },
      1: { real: 0.6, imag: 1.1, type: 14, orbits: ORBIT_SMALL },
      2: { real: 0.5, imag: 1.0, type: 15, orbits: ORBIT_ASYMMETRIC },
      3: { real: 0.7, imag: 0.9, type: 14, orbits: ORBIT_SMALL },
      4: { real: 0.55, imag: 1.05, type: 16, orbits: ORBIT_ASYMMETRIC },
      5: { real: 0.65, imag: 1.15, type: 14, orbits: ORBIT_SMALL },
      6: { real: 0.45, imag: 0.95, type: 15, orbits: ORBIT_ASYMMETRIC },
      7: { real: 0.75, imag: 1.2, type: 16, orbits: ORBIT_SMALL },
    },
  },
  {
    id: 'angular-mix',
    name: 'Angular Mix',
    builtIn: true,
    anchors: {
      // Angular families (Tricorn, Multicorn, Burning Ship) - asymmetric emphasis
      0: { real: -0.4, imag: 0.6, type: 4, orbits: ORBIT_ASYMMETRIC },
      1: { real: -0.4, imag: 0.6, type: 4, orbits: ORBIT_ASYMMETRIC },
      2: { real: -0.5, imag: 0.5, type: 17, orbits: ORBIT_MEDIUM },
      3: { real: -1.75, imag: -0.02, type: 3, orbits: ORBIT_SMALL },
      4: { real: -0.3, imag: 0.7, type: 4, orbits: ORBIT_ASYMMETRIC },
      5: { real: -0.6, imag: 0.4, type: 17, orbits: ORBIT_MEDIUM },
      6: { real: -1.7, imag: 0.05, type: 3, orbits: ORBIT_SMALL },
      7: { real: -0.45, imag: 0.55, type: 4, orbits: ORBIT_ASYMMETRIC },
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
  const validSlots = ['bg', 'fg', 'overlay', 'melody', 'bass'];
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
      if (!Array.isArray(a.orbits) || a.orbits.length !== 4) {
        return `${prefix}Invalid anchor orbits for degree ${degree}`;
      }
      for (let i = 0; i < 4; i++) {
        const orbit = a.orbits[i] as Record<string, unknown>;
        if (typeof orbit?.dr !== 'number' || typeof orbit?.di !== 'number') {
          return `${prefix}Invalid orbit ${i} for degree ${degree}`;
        }
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
