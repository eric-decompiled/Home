// --- SpessaSynth-based MIDI Player ---

import { Sequencer, WorkletSynthesizer } from "spessasynth_lib";

/** Unwrap RIFF-MIDI container if present, returning raw SMF data */
function unwrapRiff(buffer: ArrayBuffer): ArrayBuffer {
  const view = new DataView(buffer);
  if (
    view.byteLength > 20 &&
    view.getUint8(0) === 0x52 &&
    view.getUint8(1) === 0x49 &&
    view.getUint8(2) === 0x46 &&
    view.getUint8(3) === 0x46
  ) {
    for (let i = 8; i < view.byteLength - 4; i++) {
      if (
        view.getUint8(i) === 0x4d &&
        view.getUint8(i + 1) === 0x54 &&
        view.getUint8(i + 2) === 0x68 &&
        view.getUint8(i + 3) === 0x64
      ) {
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

// Mobile audio unlock: create and resume AudioContext on first user gesture
// Exported so it can be called at the start of click handlers before async work
export function unlockAudio(): void {
  // Create AudioContext immediately during user gesture (required for iOS)
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  // Resume if suspended (required for Chrome/Safari mobile)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

// Listen for first user interaction to unlock audio
if (typeof window !== "undefined") {
  const unlockEvents = ["touchstart", "touchend", "mousedown", "keydown"];
  const unlockHandler = () => {
    unlockAudio();
    // Remove listeners after first unlock
    unlockEvents.forEach((e) =>
      document.removeEventListener(e, unlockHandler, true),
    );
  };
  unlockEvents.forEach((e) =>
    document.addEventListener(e, unlockHandler, true),
  );
}

// Smooth time tracking (interpolate between sequencer updates)
let lastSeqTime = 0;
let lastRealTime = 0;
let smoothTime = 0;
let seekTarget: number | null = null;  // Set after seek to override stale sequencer time

function resetTimeTracking(targetTime = 0) {
  lastSeqTime = targetTime;
  lastRealTime = audioCtx?.currentTime ?? 0;
  smoothTime = targetTime;
  seekTarget = targetTime;
}

async function init(): Promise<void> {
  if (synth) return;

  // Reuse existing AudioContext from unlock, or create new one
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  // Ensure resumed (may have been created before user gesture)
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

  await audioCtx.audioWorklet.addModule(
    new URL("/spessasynth_processor.min.js", import.meta.url).href,
  );

  synth = new WorkletSynthesizer(audioCtx);

  // Create analyser for loudness metering
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.8;
  analyserData = new Uint8Array(analyser.frequencyBinCount);

  // Connect: synth -> analyser -> destination
  synth.connect(analyser);
  analyser.connect(audioCtx.destination);

  const sfResponse = await fetch(`${import.meta.env.BASE_URL}TimGM6mb.sf2`);
  if (!sfResponse.ok) {
    throw new Error(`SoundFont fetch failed: ${sfResponse.status}`);
  }
  const sfBuffer = await sfResponse.arrayBuffer();

  await synth.soundBankManager.addSoundBank(sfBuffer, "gm");
  await synth.isReady;
}

function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = init();
  }
  return initPromise;
}

export const audioPlayer = {
  /** Destroy the current sequencer and stop all sounds. Call before loading a new song. */
  destroy() {
    if (sequencer) {
      sequencer.pause();
      sequencer = null;
    }
    if (synth) {
      synth.stopAll(true);
    }
    pendingMidiBuffer = null;
    resetTimeTracking();
  },

  /** Store the MIDI buffer. Audio init is deferred to play(). */
  loadMidi(midiBuffer: ArrayBuffer) {
    // Destroy old sequencer first - fresh start
    this.destroy();

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
    // Always create a fresh sequencer
    sequencer = new Sequencer(synth);
    sequencer.loadNewSongList([{ binary: midiBuffer }]);
    sequencer.currentTime = 0;
    sequencer.pause();
  },

  async play(): Promise<boolean> {
    // Unlock audio immediately during user gesture (before any await)
    unlockAudio();

    // Init synth and soundfont (async)
    await ensureInit();

    // If we had a pending buffer that wasn't loaded yet, load now
    if (pendingMidiBuffer) {
      this._loadSequencer(pendingMidiBuffer);
      pendingMidiBuffer = null;
    }
    if (!sequencer) return false;

    if (audioCtx && audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    // Preserve current position when resuming (don't reset to 0)
    const currentPos = sequencer.currentHighResolutionTime;
    resetTimeTracking(currentPos);
    sequencer.play();
    return true;
  },

  pause() {
    sequencer?.pause();
  },

  stop() {
    this.destroy();
  },

  seek(time: number) {
    const target = Math.max(0, time);
    resetTimeTracking(target);
    if (sequencer) {
      sequencer.currentTime = target;
    }
  },

  getCurrentTime(): number {
    if (!sequencer || !audioCtx) return 0;

    // Get sequencer's reported time
    const seqTime = sequencer.currentHighResolutionTime;
    const realTime = audioCtx.currentTime;

    // After a seek, the sequencer may report stale time briefly.
    // Trust our seek target until sequencer catches up.
    if (seekTarget !== null) {
      // Check if sequencer has caught up to near the seek target
      if (Math.abs(seqTime - seekTarget) < 1.0) {
        // Sequencer is close to target, clear the override
        seekTarget = null;
        lastSeqTime = seqTime;
        lastRealTime = realTime;
        smoothTime = seqTime;
        return seqTime;
      } else {
        // Sequencer still reporting stale time, use seek target
        return smoothTime;
      }
    }

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

  isPlaying(): boolean {
    if (!sequencer) return false;
    return !sequencer.paused;
  },

  isFinished(): boolean {
    if (!sequencer) return false;
    return sequencer.isFinished;
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
