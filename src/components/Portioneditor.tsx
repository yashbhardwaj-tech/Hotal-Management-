// components/PortionEditor.tsx

import type { CSSProperties } from "react";
import { t } from "../theme";
import { DEFAULT_PORTION_LABELS, type Portion } from "../utils/portions";

/* =========================================================
   PORTION EDITOR
   Optional. Off by default, so single-price dishes stay as
   simple as they were.
========================================================= */

interface PortionEditorProps {
  enabled: boolean;
  portions: Portion[];
  basePrice: string;
  onToggle: (enabled: boolean) => void;
  onChange: (portions: Portion[]) => void;
}

export function PortionEditor({
  enabled,
  portions,
  basePrice,
  onToggle,
  onChange,
}: PortionEditorProps) {
  const handleToggle = (next: boolean): void => {
    onToggle(next);

    /* Seed Half/Full on first enable. Full is prefilled with
       whatever price was already typed, Half at ~60% of it —
       the usual split, and easy to overwrite. */
    if (next && portions.length === 0) {
      const full = Number(basePrice) || 0;

      onChange(
        DEFAULT_PORTION_LABELS.map((label) => ({
          label,
          price:
            label === "Full"
              ? full
              : Math.round((full * 0.6) / 5) * 5,
        })),
      );
    }
  };

  const update = (index: number, patch: Partial<Portion>): void => {
    onChange(
      portions.map((portion, i) =>
        i === index ? { ...portion, ...patch } : portion,
      ),
    );
  };

  const remove = (index: number): void => {
    onChange(portions.filter((_, i) => i !== index));
  };

  const add = (): void => {
    onChange([...portions, { label: "", price: 0 }]);
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.toggleRow}>
        <div>
          <span style={styles.toggleLabel}>Offer this in sizes</span>

          <p style={styles.toggleHint}>
            For dishes ordered as half or full, like Paneer Butter Masala.
          </p>
        </div>

        <button
          type="button"
          className="btn"
          role="switch"
          aria-checked={enabled}
          onClick={() => handleToggle(!enabled)}
          style={{
            ...styles.switch,
            background: enabled ? t.green : t.line,
          }}
        >
          <span
            style={{
              ...styles.knob,
              transform: enabled ? "translateX(20px)" : "translateX(0)",
            }}
          />
        </button>
      </div>

      {enabled && (
        <div style={styles.rows}>
          {portions.map((portion, index) => (
            <div key={index} style={styles.row}>
              <input
                className="inp"
                type="text"
                value={portion.label}
                onChange={(event) =>
                  update(index, { label: event.target.value })
                }
                placeholder="Half"
                style={styles.labelInput}
              />

              <div style={styles.priceWrap}>
                <span style={styles.rupee}>₹</span>

                <input
                  className="inp"
                  type="number"
                  min="0"
                  value={portion.price || ""}
                  onChange={(event) =>
                    update(index, { price: Number(event.target.value) })
                  }
                  placeholder="0"
                  style={styles.priceInput}
                />
              </div>

              <button
                type="button"
                className="btn"
                onClick={() => remove(index)}
                disabled={portions.length <= 1}
                style={styles.remove}
                aria-label={`Remove ${portion.label || "size"}`}
              >
                ✕
              </button>
            </div>
          ))}

          {portions.length < 4 && (
            <button
              type="button"
              className="btn"
              onClick={add}
              style={styles.addRow}
            >
              + Add another size
            </button>
          )}

          <p style={styles.note}>
            The single price above is ignored while sizes are on — guests pick
            a size before adding to their tray.
          </p>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    padding: "14px 16px",
    borderRadius: 12,
    border: `1px solid ${t.line}`,
    background: t.surfaceAlt,
  },

  toggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },

  toggleLabel: { fontSize: 13, fontWeight: 700, color: t.text },

  toggleHint: {
    margin: "3px 0 0",
    fontSize: 11,
    lineHeight: 1.5,
    color: t.faint,
    maxWidth: 300,
  },

  switch: {
    width: 44,
    height: 24,
    flexShrink: 0,
    borderRadius: 20,
    border: "none",
    padding: 2,
    display: "flex",
    alignItems: "center",
    transition: "background-color .2s",
  },

  knob: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,.25)",
    transition: "transform .2s",
  },

  rows: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: `1px solid ${t.line}`,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  row: { display: "flex", gap: 8, alignItems: "center" },

  labelInput: {
    flex: 1,
    minWidth: 0,
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${t.line}`,
    background: t.surface,
    fontSize: 13,
    color: t.text,
  },

  priceWrap: {
    width: 120,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    borderRadius: 10,
    border: `1px solid ${t.line}`,
    background: t.surface,
    overflow: "hidden",
  },

  rupee: { paddingLeft: 12, fontSize: 13, color: t.faint },

  priceInput: {
    width: "100%",
    border: "none",
    background: "none",
    padding: "10px 10px",
    fontSize: 13,
    color: t.text,
  },

  remove: {
    width: 32,
    height: 32,
    flexShrink: 0,
    borderRadius: 9,
    background: t.surface,
    border: `1px solid ${t.line}`,
    color: t.faint,
    fontSize: 11,
  },

  addRow: {
    padding: "9px 12px",
    borderRadius: 10,
    background: "none",
    border: `1px dashed ${t.line}`,
    color: t.muted,
    fontSize: 12,
  },

  note: { margin: 0, fontSize: 10.5, lineHeight: 1.5, color: t.faint },
};