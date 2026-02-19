/**
 * Anticipation Analysis Script
 *
 * Analyzes MIDI files to detect issues with the note anticipation system.
 * Outputs timing data to help debug "stuck" or "jumping" notes.
 *
 * Usage: npx tsx scripts/analyze-anticipation.ts <midi-file> [--compare <midi-file2>]
 */

import * as fs from 'fs';
import * as path from 'path';

// --- MIDI Parsing (minimal, just what we need) ---

interface MidiNote {
  time: number;
  duration: number;
  midi: number;
  velocity: number;
  channel: number;
}

interface MidiData {
  bpm: number;
  notes: MidiNote[];
  duration: number;
}

function parseMidi(buffer: Buffer): MidiData {
  // Minimal MIDI parser - extract tempo and notes
  let pos = 0;

  // Check header
  const header = buffer.toString('ascii', 0, 4);
  if (header !== 'MThd') throw new Error('Not a valid MIDI file');

  pos = 8; // Skip header chunk
  const format = buffer.readUInt16BE(pos);
  const numTracks = buffer.readUInt16BE(pos + 2);
  const division = buffer.readUInt16BE(pos + 4);
  pos += 6;

  // Default tempo
  let microsecondsPerBeat = 500000; // 120 BPM
  const notes: MidiNote[] = [];
  const activeNotes: Map<string, { time: number; velocity: number }> = new Map();

  // Parse tracks
  for (let track = 0; track < numTracks; track++) {
    // Find track header
    while (pos < buffer.length - 4) {
      if (buffer.toString('ascii', pos, pos + 4) === 'MTrk') break;
      pos++;
    }
    if (pos >= buffer.length - 4) break;

    pos += 4;
    const trackLength = buffer.readUInt32BE(pos);
    pos += 4;

    const trackEnd = pos + trackLength;
    let trackTime = 0;
    let runningStatus = 0;

    while (pos < trackEnd) {
      // Read delta time (variable length)
      let delta = 0;
      let byte;
      do {
        byte = buffer[pos++];
        delta = (delta << 7) | (byte & 0x7F);
      } while (byte & 0x80);

      trackTime += delta;
      const timeInSeconds = (trackTime / division) * (microsecondsPerBeat / 1000000);

      // Read event
      let status = buffer[pos];
      if (status < 0x80) {
        // Running status
        status = runningStatus;
      } else {
        pos++;
        if (status < 0xF0) runningStatus = status;
      }

      const channel = status & 0x0F;
      const eventType = status & 0xF0;

      if (eventType === 0x90) {
        // Note on
        const note = buffer[pos++];
        const velocity = buffer[pos++];
        const key = `${channel}:${note}`;

        if (velocity > 0) {
          activeNotes.set(key, { time: timeInSeconds, velocity: velocity / 127 });
        } else {
          // Note off (velocity 0)
          const start = activeNotes.get(key);
          if (start) {
            notes.push({
              time: start.time,
              duration: timeInSeconds - start.time,
              midi: note,
              velocity: start.velocity,
              channel,
            });
            activeNotes.delete(key);
          }
        }
      } else if (eventType === 0x80) {
        // Note off
        const note = buffer[pos++];
        pos++; // velocity
        const key = `${channel}:${note}`;
        const start = activeNotes.get(key);
        if (start) {
          notes.push({
            time: start.time,
            duration: timeInSeconds - start.time,
            midi: note,
            velocity: start.velocity,
            channel,
          });
          activeNotes.delete(key);
        }
      } else if (status === 0xFF) {
        // Meta event
        const metaType = buffer[pos++];
        let metaLength = 0;
        let b;
        do {
          b = buffer[pos++];
          metaLength = (metaLength << 7) | (b & 0x7F);
        } while (b & 0x80);

        if (metaType === 0x51 && metaLength === 3) {
          // Tempo
          microsecondsPerBeat = (buffer[pos] << 16) | (buffer[pos + 1] << 8) | buffer[pos + 2];
        }
        pos += metaLength;
      } else if (eventType === 0xA0 || eventType === 0xB0 || eventType === 0xE0) {
        pos += 2;
      } else if (eventType === 0xC0 || eventType === 0xD0) {
        pos += 1;
      } else if (status === 0xF0 || status === 0xF7) {
        // SysEx
        let sysexLength = 0;
        let b;
        do {
          b = buffer[pos++];
          sysexLength = (sysexLength << 7) | (b & 0x7F);
        } while (b & 0x80);
        pos += sysexLength;
      }
    }
  }

  // Sort notes by time
  notes.sort((a, b) => a.time - b.time);

  const bpm = 60000000 / microsecondsPerBeat;
  const duration = notes.length > 0 ? Math.max(...notes.map(n => n.time + n.duration)) : 0;

  return { bpm, notes, duration };
}

// --- Anticipation Params (must match note-star.ts / note-spiral.ts) ---

const MIN_VISIBLE_MS = 80;

function getAnticipationParams(bpm: number): { lookahead: number; lowerBound: number } {
  // Power law fit from empirical testing (R² = 0.87)
  // Tested on: FF Prelude (82 BPM), To Zanarkand (90 BPM), Don't Stop Believing (112 BPM), Sweet Child O' Mine (128 BPM)
  const lookahead = 10.0 * Math.pow(bpm, -0.68);
  const lowerBound = lookahead / 40;  // 2.5% - smaller gap
  return { lookahead, lowerBound };
}

// --- Analysis ---

interface AnticipationEvent {
  time: number;           // When this event occurs in song time
  midi: number;
  noteTime: number;       // When the note actually plays
  timeUntil: number;      // Time until note plays
  visibleDuration: number; // How long this note is visible in anticipation
  gapToOnset: number;     // Gap between anticipation end and note onset
}

interface AnalysisResult {
  file: string;
  bpm: number;
  beatDuration: number;
  lookaheadMs: number;
  lowerBoundMs: number;
  visibleWindowMs: number;
  totalNotes: number;
  notesInRange: number;   // Notes in spiral range (21-108)

  // Timing stats
  avgGapMs: number;
  maxGapMs: number;
  minGapMs: number;

  // Anomalies
  stuckNotes: number;     // Notes visible for too long
  jumpingNotes: number;   // Notes with irregular timing
  missingNotes: number;   // Notes that never appear in anticipation

  // Per-note analysis
  anomalies: AnticipationEvent[];
}

function analyzeAnticipation(midi: MidiData, filename: string): AnalysisResult {
  const bpm = midi.bpm;
  const beatDuration = 60 / bpm;
  const params = getAnticipationParams(bpm);

  let lookahead = beatDuration * params.lookahead;
  let lowerBound = beatDuration * params.lowerBound;

  // Apply minimum visibility window
  const minVisibleSec = MIN_VISIBLE_MS / 1000;
  if (lookahead - lowerBound < minVisibleSec) {
    lookahead = lowerBound + minVisibleSec;
  }

  const visibleWindow = lookahead - lowerBound;

  // Filter notes in spiral range
  const MIDI_LO = 21;
  const MIDI_HI = 108;
  const spiralNotes = midi.notes.filter(n => n.midi >= MIDI_LO && n.midi < MIDI_HI);

  // Simulate anticipation for each note
  const events: AnticipationEvent[] = [];
  const anomalies: AnticipationEvent[] = [];

  let stuckNotes = 0;
  let jumpingNotes = 0;
  let missingNotes = 0;

  for (const note of spiralNotes) {
    // When does this note become visible in anticipation?
    const appearTime = note.time - lookahead;
    const disappearTime = note.time - lowerBound;
    const visibleDuration = disappearTime - appearTime;
    const gapToOnset = lowerBound;

    const event: AnticipationEvent = {
      time: appearTime,
      midi: note.midi,
      noteTime: note.time,
      timeUntil: lookahead,
      visibleDuration,
      gapToOnset,
    };
    events.push(event);

    // Check for anomalies

    // 1. Note visible for too long (stuck) - more than 2x expected window
    if (visibleDuration > visibleWindow * 2) {
      stuckNotes++;
      anomalies.push({ ...event, visibleDuration });
    }

    // 2. Gap to onset too large - could cause "jump" appearance
    if (gapToOnset > 50 / 1000) { // More than 50ms gap
      jumpingNotes++;
      anomalies.push({ ...event, gapToOnset });
    }

    // 3. Note would never be visible (appears and disappears instantly)
    if (visibleDuration < 16 / 1000) { // Less than 1 frame at 60fps
      missingNotes++;
      anomalies.push({ ...event, visibleDuration });
    }
  }

  // Calculate timing stats
  const gaps = events.map(e => e.gapToOnset * 1000);
  const avgGapMs = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
  const maxGapMs = gaps.length > 0 ? Math.max(...gaps) : 0;
  const minGapMs = gaps.length > 0 ? Math.min(...gaps) : 0;

  return {
    file: filename,
    bpm,
    beatDuration,
    lookaheadMs: lookahead * 1000,
    lowerBoundMs: lowerBound * 1000,
    visibleWindowMs: visibleWindow * 1000,
    totalNotes: midi.notes.length,
    notesInRange: spiralNotes.length,
    avgGapMs,
    maxGapMs,
    minGapMs,
    stuckNotes,
    jumpingNotes,
    missingNotes,
    anomalies: anomalies.slice(0, 20), // First 20 anomalies
  };
}

// --- Dense Note Analysis ---

interface DenseRegion {
  startTime: number;
  endTime: number;
  noteCount: number;
  avgInterval: number;
  issue: string;
}

function findDenseRegions(midi: MidiData, windowMs: number = 100): DenseRegion[] {
  const notes = midi.notes.filter(n => n.midi >= 21 && n.midi < 108);
  const regions: DenseRegion[] = [];

  const windowSec = windowMs / 1000;

  for (let i = 0; i < notes.length; i++) {
    const start = notes[i].time;
    const end = start + windowSec;

    // Count notes in this window
    let count = 0;
    let lastTime = start;
    let intervals: number[] = [];

    for (let j = i; j < notes.length && notes[j].time < end; j++) {
      count++;
      if (j > i) {
        intervals.push(notes[j].time - lastTime);
      }
      lastTime = notes[j].time;
    }

    if (count >= 8) { // Very dense - 8+ notes in 100ms
      const avgInterval = intervals.length > 0
        ? intervals.reduce((a, b) => a + b, 0) / intervals.length
        : 0;

      regions.push({
        startTime: start,
        endTime: end,
        noteCount: count,
        avgInterval: avgInterval * 1000,
        issue: avgInterval < 0.015 ? 'VERY_FAST' : 'DENSE',
      });

      // Skip past this region
      i += count - 1;
    }
  }

  return regions;
}

// --- Simultaneous Note Analysis ---

interface SimultaneousCluster {
  time: number;
  count: number;
  midiNotes: number[];
  spreadMs: number;
}

function findSimultaneousClusters(midi: MidiData, toleranceMs: number = 10): SimultaneousCluster[] {
  const notes = midi.notes.filter(n => n.midi >= 21 && n.midi < 108);
  const clusters: SimultaneousCluster[] = [];

  const toleranceSec = toleranceMs / 1000;
  let i = 0;

  while (i < notes.length) {
    const clusterStart = notes[i].time;
    const clusterNotes: number[] = [notes[i].midi];
    let clusterEnd = clusterStart;

    // Find all notes within tolerance of the cluster start
    let j = i + 1;
    while (j < notes.length && notes[j].time - clusterStart <= toleranceSec) {
      clusterNotes.push(notes[j].midi);
      clusterEnd = notes[j].time;
      j++;
    }

    if (clusterNotes.length >= 4) { // 4+ simultaneous notes
      clusters.push({
        time: clusterStart,
        count: clusterNotes.length,
        midiNotes: clusterNotes,
        spreadMs: (clusterEnd - clusterStart) * 1000,
      });
    }

    i = j > i + 1 ? j : i + 1;
  }

  return clusters;
}

// --- Frame Simulation ---

interface FrameAnalysis {
  time: number;
  anticipationCount: number;
  activeCount: number;
  totalVisible: number;
  issue?: string;
}

function simulateFrames(midi: MidiData, fps: number = 60): FrameAnalysis[] {
  const frameDuration = 1 / fps;
  const bpm = midi.bpm;
  const beatDuration = 60 / bpm;
  const params = getAnticipationParams(bpm);
  let lookahead = beatDuration * params.lookahead;
  let lowerBound = beatDuration * params.lowerBound;

  // Apply minimum visibility window
  const minVisibleSec = MIN_VISIBLE_MS / 1000;
  if (lookahead - lowerBound < minVisibleSec) {
    lookahead = lowerBound + minVisibleSec;
  }

  const notes = midi.notes.filter(n => n.midi >= 21 && n.midi < 108);
  const frames: FrameAnalysis[] = [];
  const issues: FrameAnalysis[] = [];

  // Binary search helper
  const findFirstNoteAfter = (time: number): number => {
    let lo = 0, hi = notes.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (notes[mid].time < time) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  // Simulate frames
  for (let t = 0; t < midi.duration; t += frameDuration) {
    // Count notes in anticipation window
    const anticipationStart = t;
    const anticipationEnd = t + lookahead;
    const lowerBoundTime = t + lowerBound;

    let anticipationCount = 0;
    let activeCount = 0;

    // Count anticipation notes (timeUntil > lowerBound && timeUntil <= lookahead)
    const startIdx = findFirstNoteAfter(lowerBoundTime);
    for (let i = startIdx; i < notes.length && notes[i].time <= anticipationEnd; i++) {
      anticipationCount++;
    }

    // Count active notes (currently playing)
    for (let i = findFirstNoteAfter(t - 2); i < notes.length && notes[i].time <= t; i++) {
      if (notes[i].time + notes[i].duration >= t) {
        activeCount++;
      }
    }

    const totalVisible = anticipationCount + activeCount;
    const frame: FrameAnalysis = { time: t, anticipationCount, activeCount, totalVisible };

    // Flag frames with many anticipation notes (potential visual chaos)
    if (anticipationCount > 20) {
      frame.issue = `HIGH_ANTICIPATION_${anticipationCount}`;
      issues.push(frame);
    }

    frames.push(frame);
  }

  // Return only problematic frames
  return issues;
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npx tsx scripts/analyze-anticipation.ts <midi-file> [--compare <midi-file2>]');
    console.log('');
    console.log('Examples:');
    console.log('  npx tsx scripts/analyze-anticipation.ts public/midi/gnr-sweet-child.mid');
    console.log('  npx tsx scripts/analyze-anticipation.ts public/midi/gnr-sweet-child.mid --compare public/midi/ff7-prelude.mid');
    process.exit(1);
  }

  const files: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--compare') {
      i++;
      if (args[i]) files.push(args[i]);
    } else {
      files.push(args[i]);
    }
  }

  const results: AnalysisResult[] = [];

  for (const file of files) {
    const fullPath = path.resolve(file);
    if (!fs.existsSync(fullPath)) {
      console.error(`File not found: ${file}`);
      continue;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Analyzing: ${path.basename(file)}`);
    console.log('='.repeat(60));

    const buffer = fs.readFileSync(fullPath);
    const midi = parseMidi(buffer);
    const result = analyzeAnticipation(midi, path.basename(file));
    results.push(result);

    // Print summary
    console.log(`\nBPM: ${result.bpm.toFixed(1)}`);
    console.log(`Beat Duration: ${(result.beatDuration * 1000).toFixed(1)}ms`);
    console.log(`\nAnticipation Window:`);
    console.log(`  Lookahead: ${result.lookaheadMs.toFixed(1)}ms`);
    console.log(`  Lower Bound: ${result.lowerBoundMs.toFixed(1)}ms`);
    console.log(`  Visible Window: ${result.visibleWindowMs.toFixed(1)}ms`);

    console.log(`\nNote Stats:`);
    console.log(`  Total Notes: ${result.totalNotes}`);
    console.log(`  In Spiral Range: ${result.notesInRange}`);

    console.log(`\nTiming:`);
    console.log(`  Avg Gap to Onset: ${result.avgGapMs.toFixed(2)}ms`);
    console.log(`  Min Gap: ${result.minGapMs.toFixed(2)}ms`);
    console.log(`  Max Gap: ${result.maxGapMs.toFixed(2)}ms`);

    console.log(`\nAnomalies:`);
    console.log(`  Stuck Notes: ${result.stuckNotes}`);
    console.log(`  Jumping Notes: ${result.jumpingNotes}`);
    console.log(`  Missing Notes: ${result.missingNotes}`);

    // Dense regions
    const denseRegions = findDenseRegions(midi);
    if (denseRegions.length > 0) {
      console.log(`\nDense Regions (8+ notes in 100ms):`);
      for (const region of denseRegions.slice(0, 5)) {
        console.log(`  ${region.startTime.toFixed(2)}s: ${region.noteCount} notes, avg ${region.avgInterval.toFixed(1)}ms apart [${region.issue}]`);
      }
      if (denseRegions.length > 5) {
        console.log(`  ... and ${denseRegions.length - 5} more`);
      }
    }

    // Sample anomalies
    if (result.anomalies.length > 0) {
      console.log(`\nSample Anomalies:`);
      for (const a of result.anomalies.slice(0, 5)) {
        console.log(`  t=${a.noteTime.toFixed(2)}s MIDI=${a.midi} visible=${(a.visibleDuration*1000).toFixed(1)}ms gap=${(a.gapToOnset*1000).toFixed(1)}ms`);
      }
    }

    // Simultaneous clusters
    const clusters = findSimultaneousClusters(midi);
    if (clusters.length > 0) {
      console.log(`\nSimultaneous Note Clusters (4+ notes within 10ms):`);
      console.log(`  Total: ${clusters.length}`);
      const maxCluster = clusters.reduce((a, b) => a.count > b.count ? a : b);
      console.log(`  Largest: ${maxCluster.count} notes at ${maxCluster.time.toFixed(2)}s`);
      for (const c of clusters.slice(0, 3)) {
        console.log(`  ${c.time.toFixed(2)}s: ${c.count} notes, spread ${c.spreadMs.toFixed(1)}ms`);
      }
    }

    // Frame simulation for high-density moments
    const problemFrames = simulateFrames(midi);
    if (problemFrames.length > 0) {
      console.log(`\nHigh-Density Frames (20+ anticipation notes):`);
      console.log(`  Total problem frames: ${problemFrames.length}`);
      const maxFrame = problemFrames.reduce((a, b) => a.anticipationCount > b.anticipationCount ? a : b);
      console.log(`  Peak: ${maxFrame.anticipationCount} anticipation notes at ${maxFrame.time.toFixed(2)}s`);
    }
  }

  // Comparison
  if (results.length > 1) {
    console.log(`\n${'='.repeat(60)}`);
    console.log('COMPARISON');
    console.log('='.repeat(60));

    const headers = ['Metric', ...results.map(r => r.file.substring(0, 20))];
    const rows = [
      ['BPM', ...results.map(r => r.bpm.toFixed(1))],
      ['Visible Window (ms)', ...results.map(r => r.visibleWindowMs.toFixed(1))],
      ['Notes in Range', ...results.map(r => String(r.notesInRange))],
      ['Stuck Notes', ...results.map(r => String(r.stuckNotes))],
      ['Jumping Notes', ...results.map(r => String(r.jumpingNotes))],
      ['Missing Notes', ...results.map(r => String(r.missingNotes))],
    ];

    // Simple table output
    const colWidths = headers.map((_, i) =>
      Math.max(...[headers[i], ...rows.map(r => r[i])].map(s => s.length)) + 2
    );

    console.log(headers.map((h, i) => h.padEnd(colWidths[i])).join(''));
    console.log('-'.repeat(colWidths.reduce((a, b) => a + b, 0)));
    for (const row of rows) {
      console.log(row.map((c, i) => c.padEnd(colWidths[i])).join(''));
    }
  }

  // Write detailed JSON output
  const outputPath = 'anticipation-analysis.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed results written to: ${outputPath}`);
}

main().catch(console.error);
