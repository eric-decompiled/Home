// Generate a chromatic test MIDI with a cool melody
// Uses @tonejs/midi

import pkg from '@tonejs/midi';
const { Midi } = pkg;
import { writeFileSync } from 'fs';

const midi = new Midi();
midi.header.setTempo(120);
midi.header.timeSignatures.push({ ticks: 0, timeSignature: [4, 4] });

// Melody track
const melody = midi.addTrack();
melody.name = 'Chromatic Melody';
melody.channel = 0;

// Bass track
const bass = midi.addTrack();
bass.name = 'Bass';
bass.channel = 1;

// A = 69 (MIDI), we'll write in A but go chromatic
const A4 = 69;
const A3 = 57;
const A2 = 45;

const bpm = 120;
const beatDur = 60 / bpm; // 0.5 seconds per beat

let time = 0;

// Helper to add note
function addMelody(note, beats, velocity = 100) {
  melody.addNote({ midi: note, time, duration: beats * beatDur * 0.9, velocity });
  time += beats * beatDur;
}

function addBass(note, beats, velocity = 80) {
  bass.addNote({ midi: note, time, duration: beats * beatDur * 0.9, velocity });
}

// ===== Section 1: Chromatic ascending run from A =====
// A -> A# -> B -> C -> C# -> D -> D# -> E (all 12 chromatic notes over 2 bars)
const chromaticRun = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // semitones from A
for (let i = 0; i < chromaticRun.length; i++) {
  addBass(A2, 0.5);
  addMelody(A4 + chromaticRun[i], 0.5, 90);
}
time += beatDur; // rest

// ===== Section 2: Chromatic descending with rhythm =====
// E -> Eb -> D -> Db -> C -> B -> Bb -> A with syncopation
const descRun = [7, 6, 5, 4, 3, 2, 1, 0];
for (let i = 0; i < descRun.length; i++) {
  const beats = i % 2 === 0 ? 0.75 : 0.25; // dotted eighth + sixteenth pattern
  addBass(A2 + (i % 2 === 0 ? 0 : 5), beats);
  addMelody(A4 + descRun[i], beats, 85 + i * 2);
}
time += beatDur;

// ===== Section 3: Chromatic thirds (spicy intervals) =====
// Move in minor 3rds chromatically
const thirds = [
  [0, 3], [1, 4], [2, 5], [3, 6], [4, 7], [5, 8], [6, 9], [7, 10]
];
for (const [low, high] of thirds) {
  addBass(A2 + low, 0.5);
  melody.addNote({ midi: A4 + low, time, duration: 0.45, velocity: 80 });
  melody.addNote({ midi: A4 + high, time, duration: 0.45, velocity: 90 });
  time += beatDur * 0.5;
}
time += beatDur;

// ===== Section 4: Chromatic melody with "outside" notes =====
// A cool phrase that goes outside the key
const coolMelody = [
  { note: 0, dur: 1 },     // A
  { note: 2, dur: 0.5 },   // B
  { note: 4, dur: 0.5 },   // C#
  { note: 6, dur: 0.5 },   // D# (chromatic!)
  { note: 5, dur: 0.5 },   // D
  { note: 7, dur: 1 },     // E
  { note: 8, dur: 0.5 },   // F (chromatic!)
  { note: 6, dur: 0.5 },   // D# (chromatic!)
  { note: 7, dur: 0.5 },   // E
  { note: 9, dur: 1 },     // F#
  { note: 8, dur: 0.5 },   // F (chromatic approach)
  { note: 7, dur: 1.5 },   // E (resolve)
];

let bassNote = A2;
for (const { note, dur } of coolMelody) {
  addBass(bassNote, dur);
  addMelody(A4 + note, dur, 95);
  bassNote = A2 + (note % 7); // bass follows loosely
}
time += beatDur;

// ===== Section 5: Chromatic bass line with diatonic melody =====
// Bass walks chromatically while melody stays in key
const chromaticBass = [0, 1, 2, 3, 4, 5, 6, 7]; // A up chromatically
const diatonicMel = [12, 11, 9, 7, 9, 11, 12, 14]; // A major scale descending then up
for (let i = 0; i < 8; i++) {
  addBass(A2 + chromaticBass[i], 0.5);
  addMelody(A4 + diatonicMel[i], 0.5, 85);
}
time += beatDur;

// ===== Section 6: Fast chromatic flourish =====
// Quick chromatic run up and down
const flourish = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
for (const semitone of flourish) {
  addMelody(A4 + semitone, 0.125, 70 + semitone * 2);
}
addBass(A2, 3);
time += beatDur;

// ===== Section 7: Whole tone scale (very chromatic feel) =====
// 0, 2, 4, 6, 8, 10 (whole tone)
const wholeTone = [0, 2, 4, 6, 8, 10, 12];
for (const note of wholeTone) {
  addBass(A2 + 3, 0.5); // C bass (outside key)
  addMelody(A4 + note, 0.5, 90);
}
time += beatDur;

// ===== Ending: Chromatic approach to final A =====
addBass(A2 - 1, 0.5); // G# approach
addMelody(A4 + 11, 0.5, 80); // G#
addBass(A2, 2);
addMelody(A4 + 12, 2, 100); // Final A

// Write the file
const output = midi.toArray();
writeFileSync('public/midi/chromatic-test.mid', Buffer.from(output));
console.log('Created chromatic-test.mid');
