# State Management & URL Sharing

## State Management (`src/state.ts`)

Centralized state management module for the visualizer. Handles multiple serialization formats.

### Core Types

```typescript
interface VisualizerState {
  version: number;       // Schema version for migrations
  layers: {              // Effect assignments by slot
    bg: string | null;
    fg: string | null;
    overlay: string | null;
    melody: string | null;
    bass: string | null;
  };
  configs: {             // Effect-specific settings (only non-defaults)
    [effectId: string]: { [key: string]: string | number | boolean };
  };
  anchors?: FractalAnchors;  // Fractal config (JSON/localStorage only, never in URL)
}

interface CustomPreset {
  id: string;
  name: string;
  state: VisualizerState;
  created: number;  // timestamp
}
```

### Functions

| Function | Purpose |
|----------|---------|
| `getCurrentState(layerSlots)` | Extract current state (layers + effect configs) |
| `getFullState(layerSlots)` | Extract full state including fractal anchors |
| `applyState(state, ...)` | Apply layers and effect configs |
| `applyFullState(state, ...)` | Apply full state including fractal anchors |
| `stateToURL(state)` | Encode to compressed URL (no anchors) |
| `urlToState(queryString)` | Decode URL to state |
| `stateToJSON(state)` | Export to JSON (full fidelity) |
| `jsonToState(json)` | Import from JSON |
| `getCustomPresets()` | Get all user-saved presets |
| `saveCustomPreset(name, state)` | Save current state as named preset |
| `deleteCustomPreset(id)` | Delete a custom preset |
| `deleteAllCustomPresets()` | Clear all custom presets |

### Storage Keys

- `fractured-jukebox-presets` — Array of custom presets (JSON)
- `fractal-anchors` — Current fractal anchor configuration

### URL vs Full State

- URL: Layers + effect configs only (shareable, compact)
- JSON/localStorage: Everything including fractal anchors (for custom presets)

This separation keeps URLs clean while allowing full configuration persistence.

## URL Sharing System

The browser URL updates automatically to reflect the current visual configuration. Users can copy the URL directly from the address bar to share. Song selection is not included (URLs are for visual presets only).

### Parameters

| Param | Example | Description |
|-------|---------|-------------|
| `preset` | `?preset=warp` | Apply a preset (spiral, warp, fractal, piano) |
| `bg` | `?bg=chladni` | Background layer (omit for none) |
| `fg` | `?fg=spiral` | Foreground layer (omit for none) |
| `overlay` | `?overlay=kaleido` | Overlay layer (omit for none) |
| `melody` | `?melody=clock` | Melody layer (omit for none) |
| `bass` | `?bass=clock` | Bass layer (omit for none) |
| `{prefix}.{key}` | `?ff.w=1` | Effect config (see below) |

### URL Compression

Layer values and config params use short names:

| Effect ID | Layer Name | Config Prefix | Config Keys |
|-----------|------------|---------------|-------------|
| flowfield | `flow` | `ff` | `w`=useWhite |
| note-spiral | `spiral` | `ns` | `t`=tightness, `s`=shapes |
| piano-roll | `piano` | `pr` | `p`=pianoSound |
| domainwarp | `warp` | `dw` | |
| chladni | `chladni` | `ch` | |
| kaleidoscope | `kaleido` | `ks` | |
| fractal | `fractal` | `fr` | |
| theory-bar | `theory` | `tb` | `h`=barHeight |
| bass-clock | `clock` | `bc` | |
| melody-clock | `clock` | `mc` | |
| tonnetz | `tonnetz` | `tn` | |
| wave-interference | `waves` | `wi` | |

Booleans: `1`/`0`. Example: `?bg=flow&fg=spiral&ff.w=1`

### URL Behavior

- Initial page load: Clean URL (default Cosmic Spiral applied)
- Click any preset: `?preset=spiral`, `?preset=warp`, etc.
- Custom configs: `?bg=chladni&fg=note-spiral&ns.s=ring`

**Fallback:** Unrecognized params are ignored; defaults to Cosmic Spiral preset.

## Custom Presets

Users can save their own presets via the **+ Save** button. Custom presets:
- Store full state (layers, effect configs, fractal anchors)
- Appear as gold buttons next to built-in presets
- Can be deleted individually (x button) or all at once (Reset button)
- Persist in localStorage across sessions

**UI Elements:**
- **+ Save**: Opens modal to name and save current configuration
- **Custom preset buttons**: Click to apply, hover x to delete
- **Reset**: Deletes all custom presets (with warning modal)

**Warning Modals:** Destructive actions (delete preset, reset all) show a styled confirmation modal with cancel/confirm buttons.

## State Schema Change Procedure

All state mappings live in `src/state.ts`. The schema uses a single integer version (`CURRENT_VERSION`).

### Additions (OK to proceed without asking)

| Change | Update in `state.ts` |
|--------|---------------------|
| New effect | `EFFECT_SHORT_NAMES`, `EFFECT_PREFIXES` |
| New config key | `CONFIG_SHORTS`, `DEFAULT_CONFIGS` |
| New preset | `PRESET_LAYERS`, `PRESET_CONFIGS` |
| New layer slot | `SLOT_KEYS`, `VisualizerState.layers` interface |

Also update the effect's `getConfig()` / `setConfigValue()` methods.

### Breaking Changes (ASK USER FIRST)

- Rename effect ID
- Rename config key
- Remove effect or config
- Change value semantics (e.g., range 0-1 → 0-100)

For breaking changes:
1. Get user approval
2. Bump `CURRENT_VERSION` in `state.ts`
3. Add migration to `MIGRATIONS` object:

```typescript
const MIGRATIONS: Record<number, Migrator> = {
  2: (state) => {
    // Example: rename effect
    if (state.layers.bg === 'old-name') state.layers.bg = 'new-name';
    return { ...state, version: 2 };
  },
};
```

### Defensive Parsing (always enforced)

- Missing fields → use defaults
- Unknown fields → ignore silently
- Invalid values → use default for that field
- No version field → assume version 1, migrate forward

### Auto-migration Entry Points

- `urlToState()` — parses URL, migrates
- `jsonToState()` — parses JSON, migrates
- `loadFromLocalStorage()` — loads stored state, migrates
