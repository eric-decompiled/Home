import { WorkletSynthesizer, Sequencer } from 'spessasynth_lib';

// --- SpessaSynth-based MIDI Player ---

let audioCtx: AudioContext | null = null;
let synth: WorkletSynthesizer | null = null;
let sequencer: Sequencer | null = null;
let initPromise: Promise<void> | null = null;
let pendingMidiBuffer: ArrayBuffer | null = null;

async function init(): Promise<void> {
  if (synth) return;

  audioCtx = new AudioContext();
  await audioCtx.audioWorklet.addModule(new URL('/spessasynth_processor.min.js', import.meta.url).href);

  synth = new WorkletSynthesizer(audioCtx);
  synth.connect(audioCtx.destination);

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

export const audioPlayer = {
  /** Store the MIDI buffer. Audio init is deferred to play(). */
  loadMidi(midiBuffer: ArrayBuffer) {
    pendingMidiBuffer = midiBuffer;
    // If synth is already up, load immediately
    if (synth) {
      this._loadSequencer(midiBuffer);
      pendingMidiBuffer = null;
    }
  },

  _loadSequencer(midiBuffer: ArrayBuffer) {
    if (!synth) return;
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

    sequencer.play();
  },

  pause() {
    sequencer?.pause();
  },

  stop() {
    if (sequencer) {
      sequencer.pause();
      sequencer.currentTime = 0;
    }
    if (synth) {
      synth.stopAll(true);
    }
  },

  seek(time: number) {
    if (sequencer) {
      sequencer.currentTime = Math.max(0, time);
    }
  },

  getCurrentTime(): number {
    if (!sequencer) return 0;
    return sequencer.currentHighResolutionTime;
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
};
