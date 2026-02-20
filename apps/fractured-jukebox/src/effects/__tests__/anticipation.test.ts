/**
 * Anticipation System Unit Tests
 *
 * Tests the BPM-scaled anticipation window logic to catch timing issues.
 * Run with: npx vitest run src/effects/__tests__/anticipation.test.ts
 */

import { describe, it, expect } from 'vitest';

// --- Anticipation Params (must match note-star.ts / note-spiral.ts) ---

const MIN_VISIBLE_MS = 80;

function getAnticipationParams(bpm: number): { lookahead: number; lowerBound: number } {
  // Power law fit from empirical testing (R² = 0.87)
  const lookahead = 10.0 * Math.pow(bpm, -0.68);
  const lowerBound = lookahead / 40;  // 2.5% - smaller gap
  return { lookahead, lowerBound };
}

function computeWindow(bpm: number) {
  const beatDuration = 60 / bpm;
  const params = getAnticipationParams(bpm);
  let lookahead = beatDuration * params.lookahead;
  let lowerBound = beatDuration * params.lowerBound;

  // Ensure minimum visibility window
  const minVisibleSec = MIN_VISIBLE_MS / 1000;
  if (lookahead - lowerBound < minVisibleSec) {
    lookahead = lowerBound + minVisibleSec;
  }

  return {
    beatDuration,
    lookaheadMs: lookahead * 1000,
    lowerBoundMs: lowerBound * 1000,
    visibleWindowMs: (lookahead - lowerBound) * 1000,
  };
}

// --- Tests ---

describe('Power Law Fit', () => {
  it('follows power law: lookahead = 10.0 * bpm^(-0.68)', () => {
    const at60 = getAnticipationParams(60);
    const at120 = getAnticipationParams(120);
    const at180 = getAnticipationParams(180);

    // Power law: 10.0 * bpm^(-0.68) - verify formula is applied
    expect(at60.lookahead).toBeCloseTo(10.0 * Math.pow(60, -0.68), 3);
    expect(at120.lookahead).toBeCloseTo(10.0 * Math.pow(120, -0.68), 3);
    expect(at180.lookahead).toBeCloseTo(10.0 * Math.pow(180, -0.68), 3);

    // Verify decreasing with BPM
    expect(at60.lookahead).toBeGreaterThan(at120.lookahead);
    expect(at120.lookahead).toBeGreaterThan(at180.lookahead);
  });

  it('has non-zero visible window for all BPMs', () => {
    for (const bpm of [60, 80, 100, 120, 140, 160, 180, 200]) {
      const window = computeWindow(bpm);
      expect(window.visibleWindowMs).toBeGreaterThan(0);
      expect(window.lowerBoundMs).toBeGreaterThan(0);
      expect(window.lookaheadMs).toBeGreaterThan(window.lowerBoundMs);
    }
  });

  it('has smooth continuous transitions', () => {
    // Power law gives ~23% decrease per 10 BPM at low BPM, less at high BPM
    // This is much smoother than old presets (53% drops!)
    for (let bpm = 60; bpm < 200; bpm += 10) {
      const current = computeWindow(bpm);
      const next = computeWindow(bpm + 10);
      const ratio = next.visibleWindowMs / current.visibleWindowMs;

      // Should never drop more than 25% between 10 BPM steps
      expect(ratio).toBeGreaterThan(0.75);
      // Always decreasing or flat (when minimum floor kicks in)
      expect(ratio).toBeLessThanOrEqual(1.0);
    }
  });
});

describe('Window Calculations', () => {
  it('calculates correct values for 128 BPM (Sweet Child O Mine)', () => {
    const window = computeWindow(128);
    expect(window.beatDuration).toBeCloseTo(0.469, 2);
    // Power law gives ~160ms lookahead at 128 BPM - much better than old 102ms!
    expect(window.lookaheadMs).toBeGreaterThan(150);
    expect(window.visibleWindowMs).toBeGreaterThan(130);
  });

  it('calculates correct values for 82 BPM (FF Prelude)', () => {
    const window = computeWindow(82);
    expect(window.beatDuration).toBeCloseTo(0.732, 2);
    // Power law gives ~340ms lookahead at 82 BPM
    expect(window.lookaheadMs).toBeGreaterThan(330);
    expect(window.visibleWindowMs).toBeGreaterThan(290);
  });

  it('maintains minimum visibility time of 80ms', () => {
    // Even at extreme BPMs, notes should be visible for at least 80ms
    // (~5 frames at 60fps, enforced by MIN_VISIBLE_MS)
    for (const bpm of [60, 100, 140, 180, 220, 250]) {
      const window = computeWindow(bpm);
      expect(window.visibleWindowMs).toBeGreaterThanOrEqual(80);
    }
  });
});

describe('Exponential Brightness Ramp', () => {
  // Test the alpha calculation: (Math.exp(t * 3) - 1) / (Math.E ** 3 - 1)
  function computeAlpha(t: number): number {
    return (Math.exp(t * 3) - 1) / (Math.E ** 3 - 1);
  }

  it('starts near zero at lookahead start', () => {
    expect(computeAlpha(0)).toBeCloseTo(0, 2);
  });

  it('reaches 1 at note onset', () => {
    expect(computeAlpha(1)).toBeCloseTo(1, 2);
  });

  it('stays dim for most of the window', () => {
    // At t=0.5 (halfway), should still be relatively dim
    expect(computeAlpha(0.5)).toBeLessThan(0.3);
  });

  it('rapidly brightens in final portion', () => {
    // At t=0.9, should be quite bright
    expect(computeAlpha(0.9)).toBeGreaterThan(0.7);
  });
});

describe('Note Filtering', () => {
  interface Note {
    midi: number;
    timeUntil: number;
  }

  function filterNotes(notes: Note[], bpm: number): Note[] {
    const beatDuration = 60 / bpm;
    const params = getAnticipationParams(bpm);
    let lookahead = beatDuration * params.lookahead;
    let lowerBound = beatDuration * params.lowerBound;

    // Apply minimum visibility
    const minVisibleSec = MIN_VISIBLE_MS / 1000;
    if (lookahead - lowerBound < minVisibleSec) {
      lookahead = lowerBound + minVisibleSec;
    }

    return notes.filter(n =>
      n.midi >= 21 && n.midi < 108 &&
      n.timeUntil > lowerBound &&
      n.timeUntil <= lookahead
    );
  }

  it('filters notes outside MIDI range', () => {
    const notes = [
      { midi: 20, timeUntil: 0.1 },  // Below range
      { midi: 60, timeUntil: 0.1 },  // In range
      { midi: 108, timeUntil: 0.1 }, // Above range
    ];
    const filtered = filterNotes(notes, 100);
    expect(filtered.length).toBe(1);
    expect(filtered[0].midi).toBe(60);
  });

  it('filters notes outside time window', () => {
    const bpm = 120;
    const beatDur = 0.5;
    // With linear interpolation at 120 BPM: t=0.5, lookahead=0.4 beats = 200ms
    // lowerBound = 0.4/20 = 0.02 beats = 10ms
    const params = getAnticipationParams(bpm);
    const lookahead = beatDur * params.lookahead;
    const lowerBound = beatDur * params.lowerBound;

    const notes = [
      { midi: 60, timeUntil: 0.001 },   // Too close (below lower bound)
      { midi: 60, timeUntil: 0.1 },     // In window
      { midi: 60, timeUntil: 0.3 },     // Too far (above lookahead)
    ];

    const filtered = filterNotes(notes, bpm);
    expect(filtered.length).toBe(1);
    expect(filtered[0].timeUntil).toBe(0.1);
  });
});
