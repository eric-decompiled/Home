// --- Visual Effect System Types ---

import type { TrackInfo } from '../midi-analyzer.ts';

export type RGB = [number, number, number];

export interface ActiveVoice {
  midi: number;        // MIDI note number
  pitchClass: number;  // 0-11
  velocity: number;    // 0-1
  track: number;       // index into MusicParams.tracks
  onset: boolean;      // true on frame this note began sounding
}

export interface UpcomingNote {
  midi: number;        // MIDI note number
  pitchClass: number;  // 0-11
  velocity: number;    // 0-1
  time: number;        // absolute start time in seconds
  duration: number;    // note duration in seconds
  timeUntil: number;   // seconds until note starts (can be negative if currently playing)
  track: number;       // track index
}

export interface UpcomingChord {
  time: number;        // absolute start time in seconds
  root: number;        // pitch class 0-11
  quality: string;     // chord quality
  degree: number;      // scale degree 1-7
  numeral: string;     // roman numeral representation
  timeUntil: number;   // seconds until chord starts (negative = current/past)
}

export interface MusicParams {
  currentTime: number;
  dt: number;
  bpm: number;
  beatDuration: number;
  beatsPerBar: number;
  beatPosition: number;    // 0-1 within current beat
  barPosition: number;     // 0-1 within current bar
  beatIndex: number;       // which beat in bar (0-3)

  // Beat events (from BeatSync)
  onBeat: boolean;         // true on frame when beat boundary crossed
  onBar: boolean;          // true on frame when bar boundary crossed
  beatStability: number;   // 0-1, how confident the beat grid is
  nextBeatIn: number;      // seconds until next beat (for anticipation)
  nextBarIn: number;       // seconds until next bar

  // === GROOVE CURVES (from neuroscience research) ===
  // Model the two-phase dopamine response: anticipation (caudate) + arrival (NAcc)

  // Anticipation: 0→1 as beat approaches, accelerating (power of 2)
  // Use for: tension build, approaching motion, pre-beat glow
  beatAnticipation: number;
  barAnticipation: number;

  // Arrival: peaks at 1 on boundary, fast decay (~0.5s to near-zero)
  // Use for: impact flash, hit response, post-beat resonance
  beatArrival: number;
  barArrival: number;

  // Groove: smooth cosine peaking AT the beat (not before/after)
  // Use for: continuous motion that "lands" on the beat
  beatGroove: number;
  barGroove: number;

  chordRoot: number;       // pitch class 0-11
  chordDegree: number;     // 1-7 (0 = chromatic)
  chordQuality: string;

  // Harmonic tension system (for chromatic tension-driven visuals)
  tension: number;                // 0-1 current harmonic tension (tonic=0, dominant=high)
  harmonicTensionSmooth: number;  // 0-1 slow-following average (for glow buildup)
  harmonicTensionRelease: number; // 0-1 release intensity (peaks on resolution, decays)
  onHarmonicRelease: boolean;     // true on frame when harmonic release triggers

  // Rhythmic tension system (for white light rings)
  rhythmicTension: number;        // 0-1 current rhythmic tension (syncopation + anticipation)
  rhythmicTensionSmooth: number;  // 0-1 slow-following average
  rhythmicRelease: number;        // 0-1 release intensity (peaks on strong beats)
  onRhythmicRelease: boolean;     // true on frame when rhythmic release triggers (strong beats)

  key: number;             // pitch class 0-11
  keyMode: 'major' | 'minor';
  useFlats: boolean;       // true if key signature uses flats (F, Bb, Eb, etc.)
  keyRotation: number;     // rotation offset in radians to align tonic at 12 o'clock

  melodyPitchClass: number;  // -1 if none
  melodyMidiNote: number;    // actual MIDI note number, -1 if none
  melodyVelocity: number;    // 0-1
  melodyOnset: boolean;      // true on frame of new note
  bassPitchClass: number;    // -1 if none
  bassMidiNote: number;      // actual MIDI note number, -1 if none
  bassVelocity: number;      // 0-1

  // Drum onsets this frame
  kick: boolean;
  snare: boolean;
  hihat: boolean;
  tom: boolean;              // Toms - often signal fills/transitions
  crash: boolean;            // Crash cymbals - mark section boundaries

  // Section detection (from per-bar drum analysis)
  drumDensity: number;       // 0-1, current bar density vs song max
  fillIntensity: number;     // 0-1, high during fills (rapid snare/tom)
  isBreakdown: boolean;      // true when drums are silent/sparse
  isFill: boolean;           // true during detected fill bars
  isTransition: boolean;     // true when any transition marker fires (fill, crash, energy spike, post-breakdown)
  energyDelta: number;       // -1 to 1, change in energy from previous bar

  // Transition anticipation (lookahead-based)
  nextTransitionIn: number;  // seconds until next transition bar (0 if currently in transition)
  transitionAnticipation: number; // 0→1 building toward transition (use for pre-stab glow/tension)

  // Audio loudness (0-1) from analyser
  loudness: number;

  // For color consistency across effects
  paletteIndex: number;

  // Multi-voice instrument tracking
  activeVoices: ActiveVoice[];
  tracks: TrackInfo[];

  // Lookahead for piano roll / falling notes visualization
  upcomingNotes: UpcomingNote[];  // notes within lookahead window (default 4 seconds)

  // Chord lookahead - full fidelity for animations
  upcomingChords: UpcomingChord[];  // chords around current time

  // Simplified per-bar chords for Theory Bar display (first chord of each bar)
  barChords: UpcomingChord[];  // [prev bar, current bar, next bar, next-next bar]

  // Tension color: I→V interpolation based on harmonic tension
  // Low tension = tonic color (I), high tension = dominant color (V)
  tensionColor: RGB;
}

export interface EffectConfig {
  key: string;
  label: string;
  type: 'range' | 'select' | 'toggle' | 'buttons' | 'multi-toggle' | 'hidden';
  value: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export type BlendMode = 'source-over' | 'screen' | 'multiply' | 'overlay' | 'lighten' | 'color-dodge';

export interface VisualEffect {
  readonly id: string;
  readonly name: string;
  readonly isPostProcess: boolean;
  readonly isHUD?: boolean;  // HUD effects render after post-process (not transformed)
  readonly defaultBlend: BlendMode;
  readonly defaultOpacity: number;

  init(width: number, height: number): void;
  resize(width: number, height: number): void;
  update(dt: number, music: MusicParams): void;
  render(): HTMLCanvasElement;
  isReady(): boolean;
  dispose(): void;

  getConfig(): EffectConfig[];
  getDefaults(): Record<string, number | string | boolean>;
  setConfigValue(key: string, value: number | string | boolean): void;
}

export interface LayerState {
  effect: VisualEffect;
  enabled: boolean;
  opacity: number;
  blend: BlendMode;
}
