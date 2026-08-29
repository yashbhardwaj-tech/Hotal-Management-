// components/Neworderalert.tsx

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  playAlertSound,
  unlockAudio,
  REPEAT_SECONDS,
} from "../utils/alertSounds";
import { t, inr } from "../theme";

/* =========================================================
   TYPES
========================================================= */

export interface AlertOrder {
  id: string;
  userName?: string;
  total: number;
  items: { name: string; quantity: number; portion?: string }[];
  customer?: { phone?: string; address?: string };
}

interface NewOrderAlertProps {
  /** Unaccepted orders, newest first. */
  orders: AlertOrder[];
  onAccept: (orderId: string) => Promise<void> | void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  /** Fires the first time the browser lets audio through. */
  onAudioUnlocked?: () => void;
}

/* =========================================================
   ALERT
========================================================= */

export function NewOrderAlert({
  orders,
  onAccept,
  soundEnabled,
  onToggleSound,
  onAudioUnlocked,
}: NewOrderAlertProps) {
  const [accepting, setAccepting] = useState<string | null>(null);

  const announcedRef = useRef<Set<string>>(new Set());
  const repeatRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const current = orders[0];
  const queued = orders.length - 1;

  /* Browsers keep AudioContext suspended until the page has been
     interacted with. These listeners are deliberately NOT
     `{ once: true }` — the first click can land before the
     context exists, and a one-shot listener would never retry. */
  useEffect(() => {
    const handler = () => {
      if (unlockAudio()) onAudioUnlocked?.();
    };

    window.addEventListener("pointerdown", handler);
    window.addEventListener("keydown", handler);

    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, [onAudioUnlocked]);

  /* Ring once per order id, then every few seconds while
     anything is still waiting — a kitchen is noisy and one
     ring gets missed. */
  useEffect(() => {
    if (!soundEnabled || orders.length === 0) {
      clearInterval(repeatRef.current);
      return;
    }

    const unseen = orders.filter((order) => !announcedRef.current.has(order.id));

    if (unseen.length > 0) {
      unseen.forEach((order) => announcedRef.current.add(order.id));
      playAlertSound();
    }

    clearInterval(repeatRef.current);
    repeatRef.current = setInterval(playAlertSound, REPEAT_SECONDS * 1000);

    return () => clearInterval(repeatRef.current);
  }, [orders, soundEnabled]);

  useEffect(() => () => clearInterval(repeatRef.current), []);

  /* Title bar counter, for when the tab is in the background */
  useEffect(() => {
    document.title =
      orders.length > 0
        ? `(${orders.length}) New order — Rao Place`
        : "Rao Place — Kitchen";

    return () => {
      document.title = "Rao Place — Kitchen";
    };
  }, [orders.length]);

  if (!current) return null;

  const handleAccept = async (): Promise<void> => {
    setAccepting(current.id);

    try {
      await onAccept(current.id);
    } finally {
      setAccepting(null);
    }
  };

  return (
    <div style={styles.backdrop} role="alertdialog" aria-live="assertive">
      <div style={styles.card}>
        <div style={styles.pulseRing}>
          <div style={styles.bell}>🔔</div>
        </div>

        <span style={styles.eyebrow}>NEW ORDER</span>

        <h2 style={styles.title}>
          {current.userName || "A guest"} just ordered
        </h2>

        <div style={styles.items}>
          {current.items.slice(0, 6).map((item, index) => (
            <div key={index} style={styles.item}>
              <span style={styles.qty}>{item.quantity}×</span>

              <span style={{ flex: 1 }}>
                {item.name}
                {item.portion && (
                  <span style={styles.portion}> · {item.portion}</span>
                )}
              </span>
            </div>
          ))}

          {current.items.length > 6 && (
            <p style={styles.more}>
              and {current.items.length - 6} more
              {current.items.length - 6 === 1 ? " item" : " items"}
            </p>
          )}
        </div>

        <div style={styles.totalRow}>
          <span style={styles.totalLabel}>Order total</span>
          <strong style={styles.total}>{inr(current.total)}</strong>
        </div>

        {current.customer?.address && (
          <p style={styles.address}>
            {current.customer.address}
            {current.customer.phone && (
              <>
                {" · "}
                <a
                  href={`tel:${current.customer.phone}`}
                  style={styles.phoneLink}
                >
                  {current.customer.phone}
                </a>
              </>
            )}
          </p>
        )}

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void handleAccept()}
          disabled={accepting === current.id}
          style={styles.acceptButton}
          autoFocus
        >
          {accepting === current.id ? "Accepting…" : "Accept order"}
        </button>

        <div style={styles.footRow}>
          {queued > 0 ? (
            <span style={styles.queued}>
              {queued} more waiting behind this one
            </span>
          ) : (
            <span style={styles.queued}>Accepting starts preparation</span>
          )}

          <button
            type="button"
            className="btn"
            onClick={() => onToggleSound(!soundEnabled)}
            style={styles.soundButton}
          >
            {soundEnabled ? "🔊 Sound on" : "🔇 Sound off"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 200,
    background: "rgba(18,36,30,.62)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    display: "grid",
    placeItems: "center",
    padding: 20,
  },

  card: {
    width: "100%",
    maxWidth: 430,
    padding: "30px 30px 24px",
    background: t.surface,
    borderRadius: t.rLg,
    boxShadow: "0 30px 80px rgba(0,0,0,.4)",
    textAlign: "center",
    animation: "fadeUp .3s ease both",
  },

  pulseRing: {
    width: 68,
    height: 68,
    margin: "0 auto 18px",
    borderRadius: "50%",
    background: t.brassSoft,
    display: "grid",
    placeItems: "center",
    boxShadow: `0 0 0 0 ${t.brass}`,
    animation: "alertPulse 1.8s infinite",
  },

  bell: { fontSize: 30, lineHeight: 1 },

  eyebrow: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.26em",
    color: t.brass,
  },

  title: {
    margin: "10px 0 20px",
    fontFamily: t.display,
    fontWeight: 400,
    fontSize: 24,
    lineHeight: 1.25,
    color: t.ink,
  },

  items: {
    padding: "14px 16px",
    borderRadius: 12,
    background: t.surfaceAlt,
    border: `1px solid ${t.lineSoft}`,
    textAlign: "left",
  },

  item: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "4px 0",
    fontSize: 13,
    color: t.text,
  },

  qty: {
    minWidth: 26,
    padding: "2px 6px",
    borderRadius: 5,
    background: t.surface,
    border: `1px solid ${t.line}`,
    fontSize: 10.5,
    fontWeight: 800,
    color: t.muted,
    textAlign: "center",
  },

  portion: { color: t.brass, fontWeight: 600 },

  more: { margin: "6px 0 0", fontSize: 11, color: t.faint },

  totalRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },

  totalLabel: { fontSize: 12, color: t.muted },

  total: { fontFamily: t.display, fontSize: 24, color: t.ink },

  address: {
    margin: "10px 0 0",
    fontSize: 11.5,
    lineHeight: 1.55,
    color: t.faint,
    textAlign: "left",
  },

  phoneLink: { color: t.brass, textDecoration: "none", fontWeight: 600 },

  acceptButton: {
    width: "100%",
    marginTop: 22,
    padding: 16,
    borderRadius: 12,
    background: t.ink,
    color: "#fff",
    fontSize: 14.5,
  },

  footRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 14,
  },

  queued: { fontSize: 11, color: t.faint },

  soundButton: {
    padding: "5px 10px",
    borderRadius: 8,
    background: t.surfaceAlt,
    border: `1px solid ${t.line}`,
    color: t.muted,
    fontSize: 11,
  },
};