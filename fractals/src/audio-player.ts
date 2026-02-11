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

// Debug logging for mobile troubleshooting
const debugLog: string[] = [];
const MAX_DEBUG_LOGS = 20;
function logDebug(msg: string): void {
  const timestamp = new Date().toISOString().substr(11, 12);
  debugLog.push(`[${timestamp}] ${msg}`);
  if (debugLog.length > MAX_DEBUG_LOGS) debugLog.shift();
  console.log(`[AudioPlayer] ${msg}`);
}

// Mobile audio unlock: create and resume AudioContext on first user gesture
let audioUnlocked = false;
function unlockAudio(): void {
  if (audioUnlocked) return;
  audioUnlocked = true;
  logDebug('unlockAudio called');

  // Create AudioContext immediately during user gesture (required for iOS)
  if (!audioCtx) {
    audioCtx = new AudioContext();
    logDebug(`AudioContext created, state: ${audioCtx.state}`);
  }

  // Resume if suspended (required for Chrome/Safari mobile)
  if (audioCtx.state === 'suspended') {
    logDebug('Calling audioCtx.resume()');
    audioCtx.resume().then(() => {
      logDebug(`AudioContext resumed, state: ${audioCtx?.state}`);
    }).catch(e => {
      logDebug(`Resume failed: ${e.message}`);
    });
  }
}

// Listen for first user interaction to unlock audio
if (typeof window !== 'undefined') {
  const unlockEvents = ['touchstart', 'touchend', 'mousedown', 'keydown'];
  const unlockHandler = () => {
    unlockAudio();
    // Remove listeners after first unlock
    unlockEvents.forEach(e => document.removeEventListener(e, unlockHandler, true));
  };
  unlockEvents.forEach(e => document.addEventListener(e, unlockHandler, true));
}

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
  if (synth) {
    logDebug('init: synth already exists');
    return;
  }

  logDebug('init: starting');

  // Reuse existing AudioContext from unlock, or create new one
  if (!audioCtx) {
    audioCtx = new AudioContext();
    logDebug(`init: created AudioContext, state: ${audioCtx.state}`);
  } else {
    logDebug(`init: reusing AudioContext, state: ${audioCtx.state}`);
  }

  // Ensure resumed (may have been created before user gesture)
  if (audioCtx.state === 'suspended') {
    logDebug('init: resuming suspended AudioContext');
    await audioCtx.resume();
    logDebug(`init: resumed, state: ${audioCtx.state}`);
  }

  try {
    logDebug('init: loading audio worklet');
    await audioCtx.audioWorklet.addModule(new URL('/spessasynth_processor.min.js', import.meta.url).href);
    logDebug('init: worklet loaded');

    synth = new WorkletSynthesizer(audioCtx);
    logDebug('init: synth created');

    // Create analyser for loudness metering
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    analyserData = new Uint8Array(analyser.frequencyBinCount);

    // Connect: synth -> analyser -> destination
    synth.connect(analyser);
    analyser.connect(audioCtx.destination);
    logDebug('init: audio graph connected');

    logDebug('init: fetching SoundFont');
    const sfResponse = await fetch(`${import.meta.env.BASE_URL}TimGM6mb.sf2`);
    if (!sfResponse.ok) {
      throw new Error(`SoundFont fetch failed: ${sfResponse.status}`);
    }
    const sfBuffer = await sfResponse.arrayBuffer();
    logDebug(`init: SoundFont loaded, ${sfBuffer.byteLength} bytes`);

    await synth.soundBankManager.addSoundBank(sfBuffer, 'gm');
    await synth.isReady;
    logDebug('init: complete, synth ready');
  } catch (e) {
    logDebug(`init ERROR: ${e instanceof Error ? e.message : e}`);
    throw e;
  }
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
    logDebug('play() called');

    // Unlock audio immediately during user gesture (before any await)
    unlockAudio();

    // Init synth and soundfont (async)
    try {
      await ensureInit();
      logDebug('play: init complete');
    } catch (e) {
      logDebug(`play: init failed: ${e instanceof Error ? e.message : e}`);
      return;
    }

    // If we had a pending buffer that wasn't loaded yet, load now
    if (pendingMidiBuffer) {
      logDebug('play: loading pending MIDI');
      this._loadSequencer(pendingMidiBuffer);
      pendingMidiBuffer = null;
    }
    if (!sequencer) {
      logDebug('play: no sequencer!');
      return;
    }

    if (audioCtx && audioCtx.state === 'suspended') {
      logDebug('play: resuming suspended AudioContext');
      await audioCtx.resume();
    }

    logDebug(`play: starting sequencer, audioCtx.state=${audioCtx?.state}`);
    resetTimeTracking();
    sequencer.play();
    logDebug('play: sequencer.play() called');
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

  /** Get debug info for troubleshooting */
  getDebugInfo(): { status: string; logs: string[] } {
    const status = [
      `unlocked: ${audioUnlocked}`,
      `ctx: ${audioCtx ? audioCtx.state : 'null'}`,
      `synth: ${synth ? 'yes' : 'no'}`,
      `seq: ${sequencer ? 'yes' : 'no'}`,
      `pending: ${pendingMidiBuffer ? 'yes' : 'no'}`,
    ].join(', ');
    return { status, logs: [...debugLog] };
  },
};
