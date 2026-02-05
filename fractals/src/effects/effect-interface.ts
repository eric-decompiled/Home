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

export interface MusicParams {
  currentTime: number;
  dt: number;
  bpm: number;
  beatDuration: number;
  beatsPerBar: number;
  beatPosition: number;    // 0-1 within current beat
  barPosition: number;     // 0-1 within current bar
  beatIndex: number;       // which beat in bar (0-3)

  chordRoot: number;       // pitch class 0-11
  chordDegree: number;     // 1-7 (0 = chromatic)
  chordQuality: string;
  tension: number;         // 0-1
  key: number;             // pitch class 0-11
  keyMode: 'major' | 'minor';

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

  // For color consistency across effects
  paletteIndex: number;

  // Multi-voice instrument tracking
  activeVoices: ActiveVoice[];
  tracks: TrackInfo[];
}

export interface EffectConfig {
  key: string;
  label: string;
  type: 'range' | 'select' | 'toggle';
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
  readonly defaultBlend: BlendMode;
  readonly defaultOpacity: number;

  init(width: number, height: number): void;
  resize(width: number, height: number): void;
  update(dt: number, music: MusicParams): void;
  render(): HTMLCanvasElement;
  isReady(): boolean;
  dispose(): void;

  getConfig(): EffectConfig[];
  setConfigValue(key: string, value: number | string | boolean): void;
}

export interface LayerState {
  effect: VisualEffect;
  enabled: boolean;
  opacity: number;
  blend: BlendMode;
}
