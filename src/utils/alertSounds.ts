// utils/alertSounds.ts

/* =========================================================
   ORDER ALERT SOUND
   A two-tone doorbell, synthesised with WebAudio — no asset
   to ship, no 404 if a file moves, and it works offline.

   Tuning lives in the two constants below.
========================================================= */

/** Loudness. 1 is the designed level; 5 is about as high as
    the compressor holds without the tone turning harsh. */
const ALERT_VOLUME = 5;

/** Seconds between repeats while an order sits unaccepted. */
export const REPEAT_SECONDS = 5;

/* =========================================================
   CONTEXT
   One shared context for the whole app. Creating a new one
   per play leaks nodes and eventually hits the browser cap.
========================================================= */

let sharedContext: AudioContext | null = null;

const getContext = (): AudioContext | null => {
  if (!sharedContext) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (!Ctor) return null;

    sharedContext = new Ctor();
  }

  return sharedContext;
};

/**
 * Browsers keep AudioContext suspended until the page has been
 * interacted with. Returns true once it is actually running.
 */
export const unlockAudio = (): boolean => {
  const context = getContext();
  if (!context) return false;

  if (context.state === "suspended") void context.resume();

  return context.state === "running";
};

/* =========================================================
   VOICE
========================================================= */

interface ToneOptions {
  freq: number;
  start: number;
  duration: number;
  peak: number;
}

const tone = (
  context: AudioContext,
  master: GainNode,
  { freq, start, duration, peak }: ToneOptions,
): void => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(freq, start);

  /* Fast attack, exponential decay. A flat envelope sounds
     like a fault tone rather than a bell. */
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(master);

  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
};

/* =========================================================
   PLAY
========================================================= */

export const playAlertSound = (): void => {
  if (!unlockAudio()) return;

  const context = getContext();
  if (!context) return;

  const master = context.createGain();
  master.gain.value = ALERT_VOLUME * 0.35;

  /* Keeps the peaks in check so a high volume stays a bell
     rather than a clipped buzz. */
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -12;
  compressor.ratio.value = 12;

  master.connect(compressor);
  compressor.connect(context.destination);

  const now = context.currentTime + 0.02;

  /* Ding-dong, twice */
  [0, 0.34].forEach((offset) => {
    tone(context, master, {
      freq: 880,
      start: now + offset,
      duration: 0.3,
      peak: 0.9,
    });

    tone(context, master, {
      freq: 659.25,
      start: now + offset + 0.16,
      duration: 0.42,
      peak: 0.9,
    });
  });

  /* Release the graph once the last note has rung out */
  window.setTimeout(() => {
    master.disconnect();
    compressor.disconnect();
  }, 2000);
};