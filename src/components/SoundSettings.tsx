// components/SoundSettings.tsx

import type { CSSProperties } from "react";
import { t } from "../theme";
import { ALERT_SOUNDS, playAlertSound, type SoundId } from "../utils/alertSounds";

/* =========================================================
   SOUND SETTINGS
   Drop this on the admin page, press each preset, keep the
   one that carries across your kitchen. The choice, volume
   and repeat gap all persist to localStorage.
========================================================= */

interface SoundSettingsProps {
  soundId: SoundId;
  volume: number;
  repeatSeconds: number;
  onChange: (next: {
    soundId?: SoundId;
    volume?: number;
    repeatSeconds?: number;
  }) => void;
}

export function SoundSettings({
  soundId,
  volume,
  repeatSeconds,
  onChange,
}: SoundSettingsProps) {
  const preview = (id: SoundId): void => {
    onChange({ soundId: id });
    playAlertSound(id, volume);
  };

  return (
    <section style={styles.panel}>
      <div style={styles.head}>
        <div>
          <h3 style={styles.title}>Order alert sound</h3>
          <p style={styles.sub}>
            Press one to hear it. The selected sound plays when a new order
            arrives.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-brass"
          onClick={() => playAlertSound(soundId, volume)}
          style={styles.testButton}
        >
          ▶ Test current
        </button>
      </div>

      <div style={styles.grid}>
        {ALERT_SOUNDS.map((sound) => {
          const selected = sound.id === soundId;

          return (
            <button
              key={sound.id}
              type="button"
              className="btn lift"
              onClick={() => preview(sound.id)}
              style={{
                ...styles.option,
                ...(selected ? styles.optionOn : {}),
              }}
            >
              <div style={styles.optionTop}>
                <span style={styles.optionName}>{sound.name}</span>

                {selected && <span style={styles.tick}>✓</span>}
              </div>

              <span style={styles.optionDesc}>{sound.description}</span>
            </button>
          );
        })}
      </div>

      <div style={styles.sliders}>
        <label style={styles.slider}>
          <span style={styles.sliderLabel}>
            Volume
            <strong style={styles.sliderValue}>
              {Math.round(volume * 50)}%
            </strong>
          </span>

          <input
            type="range"
            min="2"
            max="30"
            step="1"
            value={volume}
            onChange={(event) => {
              const next = Number(event.target.value);
              onChange({ volume: next });
              playAlertSound(soundId, next);
            }}
            style={styles.range}
          />
        </label>

        <label style={styles.slider}>
          <span style={styles.sliderLabel}>
            Repeat every
            <strong style={styles.sliderValue}>{repeatSeconds}s</strong>
          </span>

          <input
            type="range"
            min="5"
            max="60"
            step="5"
            value={repeatSeconds}
            onChange={(event) =>
              onChange({ repeatSeconds: Number(event.target.value) })
            }
            style={styles.range}
          />
        </label>
      </div>

      <p style={styles.note}>
        The repeat keeps sounding while an order sits unaccepted. It stops the
        moment you accept.
      </p>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  panel: {
    background: t.surface,
    border: `1px solid ${t.lineSoft}`,
    borderRadius: t.rLg,
    padding: 24,
    marginBottom: 20,
  },

  head: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 18,
  },

  title: {
    margin: 0,
    fontFamily: t.display,
    fontWeight: 400,
    fontSize: 21,
    color: t.ink,
  },

  sub: {
    margin: "4px 0 0",
    maxWidth: 420,
    fontSize: 12,
    lineHeight: 1.5,
    color: t.faint,
  },

  testButton: {
    padding: "9px 16px",
    borderRadius: 10,
    background: t.brass,
    color: "#fff",
    fontSize: 12.5,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
    gap: 10,
  },

  option: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 5,
    padding: "13px 15px",
    borderRadius: 12,
    background: t.surface,
    border: `1px solid ${t.line}`,
    color: t.text,
    textAlign: "left",
  },

  optionOn: {
    background: t.brassSoft,
    borderColor: t.brass,
  },

  optionTop: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  optionName: { fontSize: 13.5, fontWeight: 700 },

  tick: { color: t.brass, fontSize: 13, fontWeight: 800 },

  optionDesc: {
    fontSize: 10.5,
    lineHeight: 1.45,
    color: t.faint,
  },

  sliders: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 20,
    marginTop: 22,
    paddingTop: 20,
    borderTop: `1px solid ${t.lineSoft}`,
  },

  slider: { display: "block" },

  sliderLabel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: t.muted,
  },

  sliderValue: { color: t.brass, fontSize: 12, letterSpacing: 0 },

  range: { width: "100%", accentColor: t.brass },

  note: {
    margin: "16px 0 0",
    fontSize: 10.5,
    color: t.faint,
  },
};