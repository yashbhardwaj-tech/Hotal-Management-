// components/Categoryfield.tsx

import { useState } from "react";
import type { CSSProperties } from "react";
import { t } from "../theme";

/* =========================================================
   CATEGORY FIELD
   A select over the categories you have created, plus an
   inline "new category" input so you never have to leave the
   dish form to add one.
========================================================= */

interface CategoryFieldProps {
  value: string;
  categories: string[];
  /** How many dishes use each category — blocks deleting one in use. */
  usage: Record<string, number>;
  saving?: boolean;
  onChange: (category: string) => void;
  onCreate: (name: string) => Promise<void>;
  onDelete: (name: string) => Promise<void>;
  onError: (message: string) => void;
}

export function CategoryField({
  value,
  categories,
  usage,
  saving,
  onChange,
  onCreate,
  onDelete,
  onError,
}: CategoryFieldProps) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [managing, setManaging] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleCreate = async (): Promise<void> => {
    const name = draft.trim();

    if (!name) return;

    /* Case-insensitive, so "Starters" and "starters" don't
       both end up in the dropdown. */
    const clash = categories.find(
      (category) => category.toLowerCase() === name.toLowerCase(),
    );

    if (clash) {
      onError(`"${clash}" already exists.`);
      onChange(clash);
      setDraft("");
      setCreating(false);
      return;
    }

    setBusy(true);

    try {
      await onCreate(name);
      onChange(name);
      setDraft("");
      setCreating(false);
    } catch {
      onError("Couldn't add that category.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (name: string): Promise<void> => {
    if (usage[name] > 0) return;

    setBusy(true);

    try {
      await onDelete(name);
      if (value === name) onChange("");
    } catch {
      onError("Couldn't remove that category.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {creating ? (
        <div style={styles.createRow}>
          <input
            className="inp"
            type="text"
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleCreate();
              }
              if (event.key === "Escape") {
                setCreating(false);
                setDraft("");
              }
            }}
            placeholder="Tandoori, South Indian, Chinese…"
            style={styles.input}
          />

          <button
            type="button"
            className="btn btn-brass"
            onClick={() => void handleCreate()}
            disabled={busy || !draft.trim()}
            style={styles.createButton}
          >
            {busy ? "…" : "Add"}
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => {
              setCreating(false);
              setDraft("");
            }}
            style={styles.cancelButton}
            aria-label="Cancel"
          >
            ✕
          </button>
        </div>
      ) : (
        <select
          className="inp"
          value={value}
          disabled={saving}
          onChange={(event) => {
            if (event.target.value === "__new__") {
              setCreating(true);
              return;
            }
            onChange(event.target.value);
          }}
          style={styles.input}
        >
          <option value="">Select a category</option>

          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}

          <option value="__new__">+ Create a new category…</option>
        </select>
      )}

      <div style={styles.footRow}>
        <span style={styles.count}>
          {categories.length}{" "}
          {categories.length === 1 ? "category" : "categories"}
        </span>

        {categories.length > 0 && (
          <button
            type="button"
            className="btn"
            onClick={() => setManaging((open) => !open)}
            style={styles.manageLink}
          >
            {managing ? "Done" : "Manage"}
          </button>
        )}
      </div>

      {managing && (
        <div style={styles.manageBox}>
          {categories.map((category) => {
            const inUse = (usage[category] ?? 0) > 0;

            return (
              <div key={category} style={styles.manageRow}>
                <span style={styles.manageName}>{category}</span>

                <span style={styles.manageUsage}>
                  {inUse
                    ? `${usage[category]} ${usage[category] === 1 ? "dish" : "dishes"}`
                    : "unused"}
                </span>

                <button
                  type="button"
                  className="btn"
                  onClick={() => void handleDelete(category)}
                  disabled={inUse || busy}
                  title={
                    inUse
                      ? "Move these dishes to another category first"
                      : `Remove ${category}`
                  }
                  style={{
                    ...styles.manageRemove,
                    ...(inUse ? styles.manageRemoveOff : {}),
                  }}
                >
                  Remove
                </button>
              </div>
            );
          })}

          <p style={styles.manageNote}>
            A category in use can't be removed — reassign its dishes first.
          </p>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  input: {
    width: "100%",
    padding: "11px 13px",
    borderRadius: 10,
    border: `1px solid ${t.line}`,
    background: t.surface,
    fontSize: 13.5,
    color: t.text,
  },

  createRow: { display: "flex", gap: 8, alignItems: "center" },

  createButton: {
    flexShrink: 0,
    padding: "11px 16px",
    borderRadius: 10,
    background: t.brass,
    color: "#fff",
    fontSize: 12.5,
  },

  cancelButton: {
    flexShrink: 0,
    width: 38,
    height: 38,
    borderRadius: 10,
    background: t.surfaceAlt,
    border: `1px solid ${t.line}`,
    color: t.muted,
    fontSize: 12,
  },

  footRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 7,
  },

  count: { fontSize: 10.5, color: t.faint },

  manageLink: {
    padding: 0,
    background: "none",
    color: t.brass,
    fontSize: 10.5,
    fontWeight: 600,
    textDecoration: "underline",
    textUnderlineOffset: 3,
  },

  manageBox: {
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 10,
    background: t.surfaceAlt,
    border: `1px solid ${t.lineSoft}`,
  },

  manageRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 0",
    borderBottom: `1px solid ${t.lineSoft}`,
  },

  manageName: { flex: 1, fontSize: 12.5, fontWeight: 600, color: t.text },

  manageUsage: { fontSize: 10.5, color: t.faint, whiteSpace: "nowrap" },

  manageRemove: {
    padding: "4px 9px",
    borderRadius: 7,
    background: t.redSoft,
    border: "1px solid #EBD3D0",
    color: t.red,
    fontSize: 10.5,
  },

  manageRemoveOff: {
    background: t.surface,
    border: `1px solid ${t.line}`,
    color: t.faint,
  },

  manageNote: {
    margin: "9px 0 0",
    fontSize: 10,
    lineHeight: 1.5,
    color: t.faint,
  },
};