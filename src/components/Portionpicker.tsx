// components/PortionPicker.tsx

import type { CSSProperties } from "react";
import { t, inr } from "../theme";
import type { Portion } from "../utils/portions";

/* =========================================================
   PORTION PICKER
   A small sheet, shown only for dishes that actually have
   sizes. Single-size dishes add straight to the tray with no
   extra tap.
========================================================= */

interface PortionPickerProps {
  open: boolean;
  dishName: string;
  portions: Portion[];
  onPick: (portion: Portion) => void;
  onClose: () => void;
}

export function PortionPicker({
  open,
  dishName,
  portions,
  onPick,
  onClose,
}: PortionPickerProps) {
  if (!open) return null;

  return (
    <div style={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className="fade-up"
        style={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={`Choose a size for ${dishName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={styles.head}>
          <div>
            <span style={styles.eyebrow}>CHOOSE A SIZE</span>
            <h3 style={styles.title}>{dishName}</h3>
          </div>

          <button
            type="button"
            className="btn"
            onClick={onClose}
            style={styles.close}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={styles.options}>
          {portions.map((portion) => (
            <button
              key={portion.label}
              type="button"
              className="btn lift"
              onClick={() => onPick(portion)}
              style={styles.option}
            >
              <span style={styles.optionLabel}>{portion.label}</span>
              <span style={styles.optionPrice}>{inr(portion.price)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 70,
    background: "rgba(18,36,30,.45)",
    backdropFilter: "blur(3px)",
    display: "grid",
    placeItems: "center",
    padding: 20,
  },

  sheet: {
    width: "100%",
    maxWidth: 360,
    padding: 22,
    background: t.surface,
    borderRadius: t.rLg,
    boxShadow: "0 24px 70px rgba(0,0,0,.3)",
  },

  head: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 18,
  },

  eyebrow: {
    fontSize: 9.5,
    fontWeight: 800,
    letterSpacing: "0.22em",
    color: t.brass,
  },

  title: {
    margin: "6px 0 0",
    fontFamily: t.display,
    fontWeight: 400,
    fontSize: 20,
    color: t.ink,
  },

  close: {
    width: 28,
    height: 28,
    flexShrink: 0,
    borderRadius: 8,
    background: t.surfaceAlt,
    border: `1px solid ${t.line}`,
    color: t.muted,
    fontSize: 11,
  },

  options: { display: "flex", flexDirection: "column", gap: 10 },

  option: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "15px 18px",
    borderRadius: 12,
    background: t.surface,
    border: `1px solid ${t.line}`,
    color: t.text,
    fontSize: 14,
  },

  optionLabel: { fontWeight: 650 },

  optionPrice: { fontFamily: t.display, fontSize: 18, color: t.ink },
};