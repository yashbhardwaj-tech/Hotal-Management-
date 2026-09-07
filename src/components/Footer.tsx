import type { CSSProperties } from "react";
import { t } from "../theme";

const EMAILS = ["theraoplace@gmail.com", "sumityadavgk@gmail.com"];
const PHONE = "9521055957";

export function Footer() {
  return (
    <footer style={s.footer}>
      <div className="pad" style={s.inner}>
        <div>
          <h3 style={s.title}>Hotel Rao Place</h3>
          <p style={s.sub}>In-room dining · Delivery available 24×7</p>
        </div>

        <div style={s.contact}>
          <span style={s.label}>Reviews & enquiries</span>

          {EMAILS.map((email) => (
            <a key={email} href={`mailto:${email}`} style={s.link}>
              {email}
            </a>
          ))}

          <a href={`tel:+91${PHONE}`} style={s.phone}>
            +91 {PHONE}
          </a>
        </div>
      </div>

      <div style={s.copy}>
        © {new Date().getFullYear()} Hotel Rao Place. All rights reserved.
      </div>
    </footer>
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
    gap: 28,
    flexWrap: "wrap",
  },

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

  contact: { display: "flex", flexDirection: "column", gap: 6 },

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

  copy: {
    borderTop: "1px solid rgba(255,255,255,.1)",
    padding: "14px 34px",
    textAlign: "center",
    fontSize: 10.5,
    color: "rgba(255,255,255,.38)",
  },
};

export default Footer;