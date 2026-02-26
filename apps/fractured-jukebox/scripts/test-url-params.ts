/**
 * Unit tests for URL parameter encoding/decoding roundtrip.
 * Run with: npx tsx scripts/test-url-params.ts
 */

import {
  stateToURL,
  urlToState,
  getCurrentState,
  PRESET_LAYERS,
  DEFAULT_CONFIGS,
  VisualizerState,
} from '../src/state.ts';

// ANSI colors for output
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(green('✓') + ` ${message}`);
    passed++;
  } else {
    console.log(red('✗') + ` ${message}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  if (match) {
    console.log(green('✓') + ` ${message}`);
    passed++;
  } else {
    console.log(red('✗') + ` ${message}`);
    console.log(`   Expected: ${JSON.stringify(expected)}`);
    console.log(`   Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

// Mock layer slots for testing
function createMockLayerSlots(fg: string | null, bg: string | null) {
  return [
    { activeId: fg, effects: [] },
    { activeId: bg, effects: [] },
  ];
}

console.log(yellow('\n=== URL Parameter Roundtrip Tests ===\n'));

// Test 1: Default preset (warp) should produce empty/minimal URL
console.log(yellow('Test 1: Default preset (warp) encodes minimally'));
{
  const state: VisualizerState = {
    version: 1,
    layers: {
      bg: 'chladni',
      fg: 'note-spiral',
      overlay: null,
      overlays: ['kaleidoscope'],
      melody: 'melody-clock',
      bass: 'bass-clock',
      hud: null,
    },
    configs: {},
  };
  const url = stateToURL(state);
  assert(url === '' || !url.includes('preset=warp'), 'Warp preset produces minimal URL (no preset param)');
}

// Test 2: Non-default preset roundtrip
console.log(yellow('\nTest 2: Stars preset roundtrip'));
{
  const state: VisualizerState = {
    version: 1,
    layers: {
      bg: 'starfield',
      fg: 'note-star',
      overlay: null,
      overlays: [],
      melody: null,
      bass: 'bass-fire',
      hud: null,
    },
    configs: {},
  };
  const url = stateToURL(state);
  assert(url.includes('preset=stars'), 'Stars preset is encoded');

  const decoded = urlToState(url);
  assertEqual(decoded?.layers?.bg, 'starfield', 'Background decoded correctly');
  assertEqual(decoded?.layers?.fg, 'note-star', 'Foreground decoded correctly');
  assertEqual(decoded?.layers?.bass, 'bass-fire', 'Bass layer decoded correctly');
}

// Test 3: Custom layers (non-preset) roundtrip
console.log(yellow('\nTest 3: Custom layers roundtrip'));
{
  const state: VisualizerState = {
    version: 1,
    layers: {
      bg: 'flowfield',
      fg: 'graph-chain',
      overlay: null,
      overlays: ['feedback-trail', 'crt-overlay'],
      melody: 'melody-aurora',
      bass: 'bass-web',
      hud: 'theory-bar',
    },
    configs: {},
  };
  const url = stateToURL(state);
  assert(!url.includes('preset='), 'Custom layers do not use preset param');
  assert(url.includes('bg=flow'), 'Background encoded with short name');
  assert(url.includes('fg=chain'), 'Foreground encoded with short name');
  assert(url.includes('overlay=trail'), 'Overlay contains trail');

  const decoded = urlToState(url);
  assertEqual(decoded?.layers?.bg, 'flowfield', 'Background decoded correctly');
  assertEqual(decoded?.layers?.fg, 'graph-chain', 'Foreground decoded correctly');
  assertEqual(decoded?.layers?.melody, 'melody-aurora', 'Melody decoded correctly');
  assertEqual(decoded?.layers?.bass, 'bass-web', 'Bass decoded correctly');
  assertEqual(decoded?.layers?.hud, 'theory-bar', 'HUD decoded correctly');
}

// Test 4: Effect configs roundtrip
console.log(yellow('\nTest 4: Effect configs roundtrip'));
{
  const state: VisualizerState = {
    version: 1,
    layers: {
      bg: 'starfield',
      fg: 'note-star',
      overlay: null,
      overlays: [],
      melody: null,
      bass: 'bass-fire',
      hud: null,
    },
    configs: {
      'starfield': {
        density: 2.0, // non-default
        twinkleAmount: 0.5, // non-default
      },
      'note-star': {
        intensity: 1.5, // non-default
      },
    },
  };
  const url = stateToURL(state);
  assert(url.includes('sf.'), 'Starfield config prefix present');

  const decoded = urlToState(url);
  assertEqual(decoded?.configs?.['starfield']?.density, 2.0, 'Starfield density decoded');
  assertEqual(decoded?.configs?.['starfield']?.twinkleAmount, 0.5, 'Starfield twinkle decoded');
  assertEqual(decoded?.configs?.['note-star']?.intensity, 1.5, 'Note-star intensity decoded');
}

// Test 5: Default configs are NOT encoded
console.log(yellow('\nTest 5: Default configs are filtered out'));
{
  const state: VisualizerState = {
    version: 1,
    layers: {
      bg: 'flowfield',
      fg: 'note-spiral',
      overlay: null,
      overlays: [],
      melody: null,
      bass: null,
      hud: null,
    },
    configs: {
      'flowfield': {
        useWhite: false, // default value
      },
      'note-spiral': {
        darkBackdrop: true, // default value
        spiralTightness: 1.25, // default value
      },
    },
  };
  const url = stateToURL(state);
  assert(!url.includes('ff.w='), 'Default flowfield.useWhite not encoded');
  assert(!url.includes('ns.d='), 'Default note-spiral.darkBackdrop not encoded');
  assert(!url.includes('ns.t='), 'Default note-spiral.spiralTightness not encoded');
}

// Test 6: Flux effect roundtrip
console.log(yellow('\nTest 6: Flux effect roundtrip'));
{
  const state: VisualizerState = {
    version: 1,
    layers: {
      bg: 'flux',
      fg: 'note-spiral',
      overlay: null,
      overlays: [],
      melody: null,
      bass: null,
      hud: null,
    },
    configs: {
      'flux': {
        warpMult: 5, // non-default
        colorByChord: true, // non-default
      },
    },
  };
  const url = stateToURL(state);
  assert(url.includes('bg=flux'), 'Flux encoded in bg');
  assert(url.includes('fx.'), 'Flux config prefix present');

  const decoded = urlToState(url);
  assertEqual(decoded?.layers?.bg, 'flux', 'Flux decoded as bg');
  assertEqual(decoded?.configs?.['flux']?.warpMult, 5, 'Flux warpMult decoded');
  assertEqual(decoded?.configs?.['flux']?.colorByChord, true, 'Flux colorByChord decoded');
}

// Test 7: Multiple overlays roundtrip
console.log(yellow('\nTest 7: Multiple overlays roundtrip'));
{
  const state: VisualizerState = {
    version: 1,
    layers: {
      bg: 'chladni',
      fg: 'fractal',
      overlay: null,
      overlays: ['kaleidoscope', 'crt-overlay'],
      melody: null,
      bass: null,
      hud: null,
    },
    configs: {},
  };
  const url = stateToURL(state);
  assert(url.includes('overlay=kaleido,crt') || url.includes('overlay=kaleido%2Ccrt'), 'Multiple overlays encoded');

  const decoded = urlToState(url);
  assert(
    decoded?.layers?.overlays?.includes('kaleidoscope') &&
    decoded?.layers?.overlays?.includes('crt-overlay'),
    'Both overlays decoded'
  );
}

// Test 8: Boolean config values
console.log(yellow('\nTest 8: Boolean config encoding'));
{
  const state: VisualizerState = {
    version: 1,
    layers: {
      bg: null,
      fg: 'note-spiral',
      overlay: null,
      overlays: [],
      melody: null,
      bass: null,
      hud: null,
    },
    configs: {
      'note-spiral': {
        darkBackdrop: false, // non-default (default is true)
        glowOutlines: false, // non-default (default is true)
      },
    },
  };
  const url = stateToURL(state);
  assert(url.includes('=0'), 'Boolean false encoded as 0');

  const decoded = urlToState(url);
  assertEqual(decoded?.configs?.['note-spiral']?.darkBackdrop, false, 'Boolean false decoded');
}

// Summary
console.log(yellow('\n=== Summary ==='));
console.log(`${green(String(passed))} passed, ${failed > 0 ? red(String(failed)) : '0'} failed`);

// --warn flag: always exit 0 (for CI that shouldn't block deploy)
const warnOnly = process.argv.includes('--warn');
if (warnOnly && failed > 0) {
  console.log(yellow('\n⚠ Tests failed but --warn flag set, not blocking build'));
}
process.exit(warnOnly ? 0 : (failed > 0 ? 1 : 0));
