/**
 * BeatSync - Generalized beat tracking abstraction
 *
 * Based on MIR research for music visualization:
 * - Real-Time Beat Tracking with Zero Latency (TISMIR)
 * - Essentia rhythm analysis patterns
 *
 * Provides unified interface for MIDI-based or audio-based beat tracking.
 */

// --- Types ---

export interface TempoEvent {
  time: number;   // seconds
  bpm: number;
}

export interface TimeSignatureEvent {
  time: number;
  numerator: number;
  denominator: number;
}

export interface BeatState {
  // Core timing (0-1 normalized)
  beatPhase: number;      // position within beat (0 = on beat, 0.5 = off-beat)
  barPhase: number;       // position within bar

  // Tempo
  bpm: number;            // current tempo
  beatDuration: number;   // seconds per beat
  beatsPerBar: number;    // time signature numerator

  // Beat events (for triggering effects)
  beatIndex: number;      // which beat in bar (0-indexed)
  onBeat: boolean;        // true on frame when beat boundary crossed
  onBar: boolean;         // true on frame when bar boundary crossed

  // Confidence (for graceful degradation)
  stability: number;      // 0-1, how stable/confident the beat grid is

  // Anticipation (for animation lead-in)
  nextBeatIn: number;     // seconds until next beat
  nextBarIn: number;      // seconds until next bar
}

export interface BeatSync {
  update(currentTime: number, dt: number): BeatState;
  reset(): void;
}

// --- Internal types for precomputed segments ---

interface TempoSegment {
  startTime: number;
  bpm: number;
  beatsPerBar: number;
  startBeat: number;      // cumulative beat count at segment start
  startBar: number;       // cumulative bar count at segment start
}

// --- MIDI-based BeatSync implementation ---

export function createMidiBeatSync(
  tempoEvents: TempoEvent[],
  timeSigEvents: TimeSignatureEvent[]
): BeatSync {
  // Ensure we have at least one event
  const tempos = tempoEvents.length > 0 ? tempoEvents : [{ time: 0, bpm: 120 }];
  const timeSigs = timeSigEvents.length > 0 ? timeSigEvents : [{ time: 0, numerator: 4, denominator: 4 }];

  // Sort events by time
  tempos.sort((a, b) => a.time - b.time);
  timeSigs.sort((a, b) => a.time - b.time);

  // Precompute segments with cumulative beat/bar counts
  const segments = buildSegments(tempos, timeSigs);

  // Track previous beat for boundary crossing detection
  let prevTotalBeats = 0;
  let prevTotalBars = 0;

  return {
    update(currentTime: number, dt: number): BeatState {
      const seg = findSegment(currentTime, segments);
      const elapsed = currentTime - seg.startTime;
      const beatsPerSecond = seg.bpm / 60;
      const beatsElapsed = elapsed * beatsPerSecond;
      const totalBeats = seg.startBeat + beatsElapsed;
      const beatDuration = 60 / seg.bpm;

      // Beat phase: fractional part of total beats
      const beatPhase = totalBeats - Math.floor(totalBeats);

      // Which beat in the bar (0-indexed)
      const beatInBar = Math.floor(totalBeats) % seg.beatsPerBar;

      // Bar counting: total bars elapsed
      const barsFromBeats = Math.floor(totalBeats / seg.beatsPerBar);
      const totalBars = seg.startBar + barsFromBeats - Math.floor(seg.startBeat / seg.beatsPerBar);
      const barPhase = (totalBeats % seg.beatsPerBar) / seg.beatsPerBar;

      // Beat boundary crossing detection
      const prevBeatFloor = Math.floor(prevTotalBeats);
      const currBeatFloor = Math.floor(totalBeats);
      const onBeat = currBeatFloor > prevBeatFloor && dt > 0;

      // Bar boundary crossing detection
      const prevBarFloor = Math.floor(prevTotalBars);
      const currBarFloor = Math.floor(totalBars);
      const onBar = currBarFloor > prevBarFloor && dt > 0;

      // Update previous values for next frame
      prevTotalBeats = totalBeats;
      prevTotalBars = totalBars;

      // Anticipation: time until next beat/bar
      const nextBeatIn = (1 - beatPhase) * beatDuration;
      const barDuration = beatDuration * seg.beatsPerBar;
      const nextBarIn = (1 - barPhase) * barDuration;

      return {
        beatPhase,
        barPhase,
        bpm: seg.bpm,
        beatDuration,
        beatsPerBar: seg.beatsPerBar,
        beatIndex: beatInBar,
        onBeat,
        onBar,
        stability: 1.0,  // MIDI timing is exact
        nextBeatIn,
        nextBarIn,
      };
    },

    reset() {
      prevTotalBeats = 0;
      prevTotalBars = 0;
    },
  };
}

// --- Helper functions ---

function buildSegments(
  tempos: TempoEvent[],
  timeSigs: TimeSignatureEvent[]
): TempoSegment[] {
  // Merge tempo and time sig events into unified segments
  // Each segment has consistent tempo AND time signature
  const changePoints = new Set<number>();
  for (const t of tempos) changePoints.add(t.time);
  for (const ts of timeSigs) changePoints.add(ts.time);
  const times = Array.from(changePoints).sort((a, b) => a - b);

  const segments: TempoSegment[] = [];
  let cumulativeBeats = 0;
  let cumulativeBars = 0;
  let prevTime = 0;
  let prevBpm = tempos[0].bpm;
  let prevBeatsPerBar = timeSigs[0].numerator;

  for (const time of times) {
    // Calculate beats elapsed in previous segment
    if (time > prevTime && segments.length > 0) {
      const elapsed = time - prevTime;
      const beatsElapsed = elapsed * (prevBpm / 60);
      cumulativeBeats += beatsElapsed;
      cumulativeBars += beatsElapsed / prevBeatsPerBar;
    }

    // Find current tempo and time sig at this point
    const bpm = getTempoAt(time, tempos);
    const beatsPerBar = getTimeSigAt(time, timeSigs);

    segments.push({
      startTime: time,
      bpm,
      beatsPerBar,
      startBeat: cumulativeBeats,
      startBar: cumulativeBars,
    });

    prevTime = time;
    prevBpm = bpm;
    prevBeatsPerBar = beatsPerBar;
  }

  // Handle case where no events exist
  if (segments.length === 0) {
    segments.push({
      startTime: 0,
      bpm: 120,
      beatsPerBar: 4,
      startBeat: 0,
      startBar: 0,
    });
  }

  return segments;
}

function findSegment(time: number, segments: TempoSegment[]): TempoSegment {
  // Binary search for the segment containing this time
  let lo = 0;
  let hi = segments.length - 1;

  while (lo < hi) {
    const mid = Math.ceil((lo + hi + 1) / 2);
    if (segments[mid].startTime <= time) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  return segments[lo];
}

function getTempoAt(time: number, tempos: TempoEvent[]): number {
  for (let i = tempos.length - 1; i >= 0; i--) {
    if (tempos[i].time <= time) return tempos[i].bpm;
  }
  return 120;
}

function getTimeSigAt(time: number, timeSigs: TimeSignatureEvent[]): number {
  for (let i = timeSigs.length - 1; i >= 0; i--) {
    if (timeSigs[i].time <= time) return timeSigs[i].numerator;
  }
  return 4;
}

// --- Default/idle BeatSync for when no song is loaded ---

export function createIdleBeatSync(bpm = 120, beatsPerBar = 4): BeatSync {
  return createMidiBeatSync(
    [{ time: 0, bpm }],
    [{ time: 0, numerator: beatsPerBar, denominator: 4 }]
  );
}
