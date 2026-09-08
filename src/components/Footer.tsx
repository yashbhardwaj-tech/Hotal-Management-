import type { CSSProperties } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useIsMobile } from "../utils/useIsMobile";
import { t } from "../theme";

/* =========================================================
   CONTACT
   One place to change the number. WHATSAPP_URL is what the
   QR encodes, so editing PHONE here regenerates the code —
   there is no image file to replace.
========================================================= */

const EMAILS = ["theraoplace@gmail.com", "sumityadavgk@gmail.com"];
const PHONE = "9521055957";
const COUNTRY_CODE = "91";

const WHATSAPP_MESSAGE = "Hi, I need help with my order from Hotel Rao Place.";

const WHATSAPP_URL = `https://wa.me/${COUNTRY_CODE}${PHONE}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE,
)}`;

export function Footer() {
  const isMobile = useIsMobile();

  return (
    <footer style={s.footer}>
      <div style={s.inner}>
        {/* ---------- Brand ---------- */}

        <div style={s.block}>
          <h3 style={s.title}>Hotel Rao Place</h3>
          <p style={s.sub}>In-room dining · Delivery available 24×7</p>
        </div>

        {/* ---------- Reach us ---------- */}

        <div style={s.block}>
          <span style={s.label}>Reviews and enquiries</span>

          {EMAILS.map((email) => (
            <a key={email} href={`mailto:${email}`} style={s.link}>
              {email}
            </a>
          ))}

          <a href={`tel:+${COUNTRY_CODE}${PHONE}`} style={s.phone}>
            +{COUNTRY_CODE} {PHONE}
          </a>
        </div>

        {/* ---------- WhatsApp support ----------
            A QR is unscannable on the device displaying it, so
            phones get a tap-through button instead. */}

        <div style={s.block}>
          <span style={s.label}>WhatsApp support</span>

          {isMobile ? (
            <>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={s.waButton}
              >
                <WhatsAppMark />
                Chat with us
              </a>

              <p style={s.waNote}>Opens WhatsApp with our number ready.</p>
            </>
          ) : (
            <div style={s.qrRow}>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={s.qrBox}
                aria-label="Open WhatsApp chat"
              >
                <QRCodeSVG
                  value={WHATSAPP_URL}
                  size={104}
                  level="M"
                  bgColor="#FFFFFF"
                  fgColor={t.ink}
                />
              </a>

              <p style={s.qrNote}>
                Scan with your phone camera to message the kitchen on WhatsApp.
              </p>
            </div>
          )}
        </div>
      </div>

      <div style={s.copy}>
        © {new Date().getFullYear()} Hotel Rao Place. All rights reserved.
      </div>
    </footer>
  );
}

/* Inline so the footer doesn't pull in an icon package for
   one glyph. */
function WhatsAppMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.38-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.28-1.38a9.87 9.87 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm0 18.15a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.53 3.7-8.22 8.23-8.22 4.53 0 8.22 3.69 8.22 8.22 0 4.54-3.69 8.24-8.23 8.24z" />
    </svg>
  );
}

const s: Record<string, CSSProperties> = {
  footer: {
    marginTop: 40,
    background: t.ink,
    color: "rgba(255,255,255,.72)",
  },

  inner: {
    maxWidth: 1440,
    margin: "0 auto",
    padding: "34px",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 30,
    flexWrap: "wrap",
  },

  block: { display: "flex", flexDirection: "column", gap: 6, minWidth: 200 },

  title: {
    margin: 0,
    fontFamily: t.display,
    fontWeight: 400,
    fontSize: 21,
    color: "#fff",
  },

  sub: {
    margin: "6px 0 0",
    fontSize: 12,
    color: "rgba(255,255,255,.5)",
  },

  label: {
    fontSize: 9.5,
    fontWeight: 800,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: t.brass,
    marginBottom: 3,
  },

  link: {
    fontSize: 12.5,
    color: "rgba(255,255,255,.78)",
    textDecoration: "none",
  },

  phone: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: 700,
    color: "#fff",
    textDecoration: "none",
    letterSpacing: "0.02em",
  },

  qrRow: { display: "flex", alignItems: "center", gap: 14 },

  qrBox: {
    display: "block",
    padding: 8,
    borderRadius: 12,
    background: "#fff",
    lineHeight: 0,
    flexShrink: 0,
  },

  qrNote: {
    margin: 0,
    maxWidth: 160,
    fontSize: 11,
    lineHeight: 1.55,
    color: "rgba(255,255,255,.55)",
  },

  waButton: {
    marginTop: 2,
    padding: "11px 18px",
    borderRadius: 11,
    background: "#25D366",
    color: "#08301A",
    fontSize: 13.5,
    fontWeight: 700,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    alignSelf: "flex-start",
  },

  waNote: {
    margin: "8px 0 0",
    fontSize: 11,
    color: "rgba(255,255,255,.5)",
  },

  copy: {
    borderTop: "1px solid rgba(255,255,255,.1)",
    padding: "14px 34px",
    textAlign: "center",
    fontSize: 10.5,
    color: "rgba(255,255,255,.38)",
  },
};

export default Footer;