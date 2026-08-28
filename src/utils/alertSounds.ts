// utils/alertSounds.ts

/* =========================================================
   ALERT SOUNDS
   All synthesised with WebAudio — no asset files, no 404s,
   works offline. Each preset is a function that schedules
   its notes onto a shared context.

   Volume note: the old chime peaked at 0.22 gain, which is
   quiet in a kitchen. These run through a master gain you
   can push past 1.0 without clipping the individual voices.
========================================================= */

export type SoundId =
  | "doorbell"
  | "chime"
  | "bell"
  | "pips"
  | "marimba"
  | "buzzer"
  | "siren";

export interface AlertSound {
  id: SoundId;
  name: string;
  description: string;
}

export const ALERT_SOUNDS: AlertSound[] = [
  {
    id: "doorbell",
    name: "Doorbell",
    description: "Two-tone ding-dong, twice. Familiar, not alarming.",
  },
  {
    id: "chime",
    name: "Chime",
    description: "Rising four-note arpeggio. Soft, hotel-lobby feel.",
  },
  {
    id: "bell",
    name: "Service bell",
    description: "Struck brass bell with a long ring-out.",
  },
  {
    id: "pips",
    name: "Pips",
    description: "Three sharp high beeps. Cuts through background noise.",
  },
  {
    id: "marimba",
    name: "Marimba",
    description: "Warm wooden mallet triplet. Pleasant on repeat.",
  },
  {
    id: "buzzer",
    name: "Kitchen buzzer",
    description: "Harsh double buzz. Loudest option, hard to ignore.",
  },
  {
    id: "siren",
    name: "Siren",
    description: "Two rising sweeps. Most urgent — use sparingly.",
  },
];

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

/** Returns true when the context is actually running. */
export const unlockAudio = (): boolean => {
  const context = getContext();
  if (!context) return false;

  if (context.state === "suspended") void context.resume();

  return context.state === "running";
};

/* =========================================================
   VOICE HELPERS
========================================================= */

interface ToneOptions {
  freq: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  peak?: number;
  /** Sweep to this frequency over the duration. */
  glideTo?: number;
}

const tone = (
  context: AudioContext,
  master: GainNode,
  { freq, start, duration, type = "sine", peak = 1, glideTo }: ToneOptions,
): void => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, start);

  if (glideTo) {
    oscillator.frequency.linearRampToValueAtTime(glideTo, start + duration);
  }

  /* Fast attack, exponential decay — a flat envelope sounds
     like a fault tone rather than an instrument. */
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(master);

  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
};

/* A struck bell is a fundamental plus inharmonic partials —
   pure sine alone sounds like a hearing test. */
const struck = (
  context: AudioContext,
  master: GainNode,
  base: number,
  start: number,
  duration: number,
  peak: number,
): void => {
  const partials = [
    { ratio: 1, gain: 1 },
    { ratio: 2.01, gain: 0.5 },
    { ratio: 2.98, gain: 0.28 },
    { ratio: 4.15, gain: 0.14 },
  ];

  partials.forEach((partial) => {
    tone(context, master, {
      freq: base * partial.ratio,
      start,
      duration: duration * (1 - partial.ratio * 0.08),
      peak: peak * partial.gain,
      type: "sine",
    });
  });
};

/* =========================================================
   PRESETS
========================================================= */

const PRESETS: Record<
  SoundId,
  (context: AudioContext, master: GainNode, now: number) => void
> = {
  doorbell: (context, master, now) => {
    [0, 0.22].forEach((offset) => {
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
  },

  chime: (context, master, now) => {
    /* C6 E6 G6 C7 */
    [1046.5, 1318.5, 1568, 2093].forEach((freq, index) => {
      tone(context, master, {
        freq,
        start: now + index * 0.11,
        duration: 0.55,
        peak: 0.65,
        type: "triangle",
      });
    });
  },

  bell: (context, master, now) => {
    struck(context, master, 784, now, 1.6, 0.85);
    struck(context, master, 784, now + 0.7, 1.4, 0.5);
  },

  pips: (context, master, now) => {
    [0, 0.16, 0.32].forEach((offset) => {
      tone(context, master, {
        freq: 1760,
        start: now + offset,
        duration: 0.1,
        peak: 0.8,
        type: "sine",
      });
    });
  },

  marimba: (context, master, now) => {
    [1174.7, 1396.9, 1760].forEach((freq, index) => {
      const start = now + index * 0.13;

      tone(context, master, {
        freq,
        start,
        duration: 0.35,
        peak: 0.85,
        type: "triangle",
      });

      /* Octave above, quieter — gives the wooden knock */
      tone(context, master, {
        freq: freq * 2,
        start,
        duration: 0.14,
        peak: 0.28,
        type: "sine",
      });
    });
  },

  buzzer: (context, master, now) => {
    [0, 0.42].forEach((offset) => {
      tone(context, master, {
        freq: 320,
        start: now + offset,
        duration: 0.3,
        peak: 0.5,
        type: "square",
      });
      tone(context, master, {
        freq: 322,
        start: now + offset,
        duration: 0.3,
        peak: 0.5,
        type: "square",
      });
    });
  },

  siren: (context, master, now) => {
    [0, 0.5].forEach((offset) => {
      tone(context, master, {
        freq: 620,
        glideTo: 1180,
        start: now + offset,
        duration: 0.42,
        peak: 0.55,
        type: "sawtooth",
      });
    });
  },
};

/* =========================================================
   PLAY
   `volume` is a multiplier: 1 is the designed level, 2 is
   roughly twice as loud. Values above ~3 will distort.
========================================================= */

export const playAlertSound = (id: SoundId, volume = 1.6): void => {
  if (!unlockAudio()) return;

  const context = getContext();
  if (!context) return;

  const master = context.createGain();
  master.gain.value = Math.min(volume, 3) * 0.35;

  /* Gentle limiter so the square and sawtooth presets don't
     clip when the volume is pushed up. */
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -12;
  compressor.ratio.value = 12;

  master.connect(compressor);
  compressor.connect(context.destination);

  PRESETS[id](context, master, context.currentTime + 0.02);

  /* Release the graph once the longest preset has finished */
  window.setTimeout(() => {
    master.disconnect();
    compressor.disconnect();
  }, 3000);
};