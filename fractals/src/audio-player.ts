import { WorkletSynthesizer, Sequencer } from 'spessasynth_lib';

// --- SpessaSynth-based MIDI Player ---

/** Unwrap RIFF-MIDI container if present, returning raw SMF data */
function unwrapRiff(buffer: ArrayBuffer): ArrayBuffer {
  const view = new DataView(buffer);
  if (view.byteLength > 20 &&
      view.getUint8(0) === 0x52 && view.getUint8(1) === 0x49 &&
      view.getUint8(2) === 0x46 && view.getUint8(3) === 0x46) {
    for (let i = 8; i < view.byteLength - 4; i++) {
      if (view.getUint8(i) === 0x4D && view.getUint8(i + 1) === 0x54 &&
          view.getUint8(i + 2) === 0x68 && view.getUint8(i + 3) === 0x64) {
        return buffer.slice(i);
      }
    }
  }
  return buffer;
}

let audioCtx: AudioContext | null = null;
let synth: WorkletSynthesizer | null = null;
let sequencer: Sequencer | null = null;
let analyser: AnalyserNode | null = null;
let analyserData: Uint8Array<ArrayBuffer> | null = null;
let initPromise: Promise<void> | null = null;
let pendingMidiBuffer: ArrayBuffer | null = null;
let pianoMode = false;

// Smooth time tracking (interpolate between sequencer updates)
let lastSeqTime = 0;
let lastRealTime = 0;
let smoothTime = 0;

function resetTimeTracking() {
  lastSeqTime = 0;
  lastRealTime = audioCtx?.currentTime ?? 0;
  smoothTime = 0;
}

async function init(): Promise<void> {
  if (synth) return;

  audioCtx = new AudioContext();
  await audioCtx.audioWorklet.addModule(new URL('/spessasynth_processor.min.js', import.meta.url).href);

  synth = new WorkletSynthesizer(audioCtx);

  // Create analyser for loudness metering
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;
  analyserData = new Uint8Array(analyser.frequencyBinCount);

  // Connect: synth -> analyser -> destination
  synth.connect(analyser);
  analyser.connect(audioCtx.destination);

  const sfResponse = await fetch('TimGM6mb.sf2');
  const sfBuffer = await sfResponse.arrayBuffer();
  await synth.soundBankManager.addSoundBank(sfBuffer, 'gm');
  await synth.isReady;
}

function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = init();
  }
  return initPromise;
}

function applyPianoMode(): void {
  if (!synth || !pianoMode) return;
  // Set all non-drum channels to piano (program 0)
  // Channel 9 (0-indexed) is drums in General MIDI
  for (let ch = 0; ch < 16; ch++) {
    if (ch !== 9) {
      synth.programChange(ch, 0); // 0 = Acoustic Grand Piano
    }
  }
}

export const audioPlayer = {
  /** Store the MIDI buffer. Audio init is deferred to play(). */
  loadMidi(midiBuffer: ArrayBuffer) {
    midiBuffer = unwrapRiff(midiBuffer);
    pendingMidiBuffer = midiBuffer;
    // If synth is already up, load immediately
    if (synth) {
      this._loadSequencer(midiBuffer);
      pendingMidiBuffer = null;
    }
  },

  _loadSequencer(midiBuffer: ArrayBuffer) {
    if (!synth) return;
    resetTimeTracking();
    if (sequencer) {
      sequencer.pause();
      synth.stopAll(true);
      sequencer.loadNewSongList([{ binary: midiBuffer }]);
      sequencer.currentTime = 0;
      sequencer.pause();
    } else {
      sequencer = new Sequencer(synth);
      sequencer.loadNewSongList([{ binary: midiBuffer }]);
      sequencer.currentTime = 0;
      sequencer.pause();
    }
    // Apply piano mode if enabled
    applyPianoMode();
  },

  async play() {
    // Init audio on first user-gesture play
    await ensureInit();

    // If we had a pending buffer that wasn't loaded yet, load now
    if (pendingMidiBuffer) {
      this._loadSequencer(pendingMidiBuffer);
      pendingMidiBuffer = null;
    }
    if (!sequencer) return;

    if (audioCtx && audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    resetTimeTracking();
    sequencer.play();
  },

  pause() {
    sequencer?.pause();
  },

  stop() {
    resetTimeTracking();
    if (sequencer) {
      sequencer.pause();
      sequencer.currentTime = 0;
    }
    if (synth) {
      synth.stopAll(true);
    }
  },

  seek(time: number) {
    resetTimeTracking();
    if (sequencer) {
      sequencer.currentTime = Math.max(0, time);
    }
  },

  getCurrentTime(): number {
    if (!sequencer || !audioCtx) return 0;

    // Get sequencer's reported time
    const seqTime = sequencer.currentHighResolutionTime;
    const realTime = audioCtx.currentTime;

    // Backward jump = seek or song change, reset tracking
    if (seqTime < lastSeqTime - 0.01) {
      lastSeqTime = seqTime;
      lastRealTime = realTime;
      smoothTime = seqTime;
      return seqTime;
    }

    // Sequencer time updated - sync to it
    if (seqTime !== lastSeqTime) {
      lastSeqTime = seqTime;
      lastRealTime = realTime;
      smoothTime = seqTime;
    } else if (!sequencer.paused) {
      // Sequencer hasn't updated yet - interpolate using audio context time
      const delta = realTime - lastRealTime;
      // Cap interpolation to prevent runaway (max 0.5s ahead)
      smoothTime = lastSeqTime + Math.min(delta, 0.5);
    }

    return smoothTime;
  },

  getDuration(): number {
    if (!sequencer) return 0;
    return sequencer.duration;
  },

  isPlaying(): boolean {
    if (!sequencer) return false;
    return !sequencer.paused;
  },

  isFinished(): boolean {
    if (!sequencer) return false;
    return sequencer.isFinished;
  },

  setPianoMode(enabled: boolean) {
    pianoMode = enabled;
    if (synth) {
      // Stop all sounding notes so new sound takes effect immediately
      synth.stopAll(false);
      if (enabled) {
        applyPianoMode();
      } else if (sequencer) {
        // Reload to restore original instruments
        const currentTime = sequencer.currentTime;
        const wasPlaying = !sequencer.paused;
        sequencer.currentTime = currentTime; // triggers re-send of program changes
        if (wasPlaying) sequencer.play();
      }
    }
  },

  isPianoMode(): boolean {
    return pianoMode;
  },

  /** Get current audio loudness level (0-1) */
  getLoudness(): number {
    if (!analyser || !analyserData) return 0;

    // Get frequency data
    analyser.getByteFrequencyData(analyserData);

    // Calculate RMS-style average
    let sum = 0;
    for (let i = 0; i < analyserData.length; i++) {
      sum += analyserData[i];
    }
    const avg = sum / analyserData.length;

    // Normalize to 0-1 (byte data is 0-255)
    return avg / 255;
  },
};
