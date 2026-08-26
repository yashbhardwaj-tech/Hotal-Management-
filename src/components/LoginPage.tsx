import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
} from "firebase/auth";
import { useNavigate } from "react-router";
import { auth } from "../firebase/firebase";
import { t, globalCss } from "../theme";
import hotelimage from "./../assets/hotel image .jpeg";

function LoginPage() {
  const navigate = useNavigate();

  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  /* Already signed in? Skip the login screen entirely. */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/dashboard", { replace: true });
      } else {
        setCheckingSession(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleOrderNow = async (): Promise<void> => {
    setError(null);
    setSigningIn(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      await signInWithPopup(auth, provider);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const code = (err as { code?: string })?.code || "";

      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setError("Sign-in was closed. Tap Order Now to try again.");
      } else if (code === "auth/popup-blocked") {
        setError("Your browser blocked the sign-in window. Allow pop-ups for this site.");
      } else {
        setError("Sign-in didn't complete. Check your connection and try again.");
      }

      console.error("Login failed:", err);
    } finally {
      setSigningIn(false);
    }
  };

  if (checkingSession) {
    return (
      <div style={s.bootScreen}>
        <style>{globalCss}</style>
        <div className="spin" style={s.bootSpinner} />
      </div>
    );
  }

  return (
    <div style={s.page}>
      <style>{globalCss}</style>

      <div className="split" style={s.split}>
        {/* ============ LEFT: the room, not a stock gradient ============ */}
        <aside className="split-art" style={s.art}>
          <div style={s.artOverlay} />

          <div style={s.artContent}>
            <div style={s.artTop}>
              <span style={s.artMark}>RP</span>
              <span style={s.artBrand}>hotel rao place</span>
            </div>

            <div>
              <span style={s.artEyebrow}>IN-ROOM DINING</span>

              <h2 style={s.artHeadline}>
                The kitchen is open.
                <br />
                Your table is your room.
              </h2>

              <p style={s.artText}>
                Order from the full menu and track every dish from the pass to
                your door.
              </p>
            </div>

            <div style={s.artFooter}>
              <span style={s.artFooterItem}>24 hours</span>
              <span style={s.artDot} />
              <span style={s.artFooterItem}>No service charge</span>
              <span style={s.artDot} />
              <span style={s.artFooterItem}>Live order status</span>
            </div>
          </div>
        </aside>

        {/* ============ RIGHT: the action ============ */}
        <main style={s.panel}>
          <div className="fade-up" style={s.card}>
            <div style={s.mobileMark}>RP</div>

            <span style={s.eyebrow}>ROOM SERVICE</span>

            <h1 style={s.title}>
              Hungry?
              <br />
              <span style={s.titleAccent}>Order now.</span>
            </h1>

            <p style={s.subtitle}>
              One tap signs you in with Google and opens the menu. No forms, no
              passwords.
            </p>

            {/* PRIMARY ACTION — opens Google auth immediately */}
            <button
              type="button"
              className="btn btn-brass"
              onClick={handleOrderNow}
              disabled={signingIn}
              style={s.orderButton}
            >
              {signingIn ? (
                <>
                  <span className="spin" style={s.buttonSpinner} />
                  <span>Opening Google…</span>
                </>
              ) : (
                <>
                  <span>Order Now</span>
                  <span style={s.arrow}>→</span>
                </>
              )}
            </button>

            <div style={s.googleNote}>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt=""
                width={16}
                height={16}
              />
              Continues with your Google account
            </div>

            {error && (
              <div role="alert" style={s.error}>
                {error}
              </div>
            )}

            <div style={s.divider}>
              <span style={s.dividerLine} />
              <span style={s.dividerText}>WHAT HAPPENS NEXT</span>
              <span style={s.dividerLine} />
            </div>

            <ol style={s.steps}>
              {[
                "Browse tonight's menu",
                "Add dishes to your tray",
                "Track it to your door",
              ].map((step, index) => (
                <li key={step} style={s.step}>
                  <span style={s.stepNum}>{index + 1}</span>
                  {step}
                </li>
              ))}
            </ol>

            <p style={s.terms}>
              By continuing you agree to our{" "}
              <span style={s.termsLink}>Terms of Service</span> and{" "}
              <span style={s.termsLink}>Privacy Policy</span>.
            </p>
          </div>

          <p style={s.secure}>
            <span style={s.secureDot} />
            Secured by Firebase Authentication
          </p>
        </main>
      </div>
    </div>
  );
}

/* =========================================================
   STYLES
========================================================= */

const s: Record<string, React.CSSProperties> = {
  bootScreen: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: t.cream,
  },

  bootSpinner: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    border: `2px solid ${t.line}`,
    borderTopColor: t.brass,
  },

  page: {
    minHeight: "100vh",
    background: t.cream,
    color: t.text,
    fontFamily: t.body,
  },

  split: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "1.05fr 1fr",
  },

  /* ---------- Art panel ---------- */

  art: {
    position: "relative",
    backgroundImage: `url("${hotelimage}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
  },

  artOverlay: {
    position: "absolute",
    inset: 0,
    background: `linear-gradient(160deg, rgba(18,36,30,.72), rgba(18,36,30,.94))`,
  },

  artContent: {
    position: "relative",
    zIndex: 1,
    flex: 1,
    padding: "48px 52px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    color: "#fff",
  },

  artTop: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  artMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    border: `1px solid rgba(255,255,255,.28)`,
    display: "grid",
    placeItems: "center",
    fontFamily: t.display,
    fontSize: 15,
    letterSpacing: "0.06em",
    color: t.brass,
  },

  artBrand: {
    fontSize: 12,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,.72)",
  },

  artEyebrow: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.28em",
    color: t.brass,
  },

  artHeadline: {
    fontFamily: t.display,
    fontWeight: 400,
    fontSize: 42,
    lineHeight: 1.14,
    letterSpacing: "-0.02em",
    margin: "18px 0 16px",
  },

  artText: {
    margin: 0,
    maxWidth: 380,
    fontSize: 14,
    lineHeight: 1.7,
    color: "rgba(255,255,255,.7)",
  },

  artFooter: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    paddingTop: 22,
    borderTop: "1px solid rgba(255,255,255,.14)",
  },

  artFooterItem: {
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,.6)",
  },

  artDot: {
    width: 3,
    height: 3,
    borderRadius: "50%",
    background: t.brass,
  },

  /* ---------- Panel ---------- */

  panel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 28px",
  },

  card: {
    width: "100%",
    maxWidth: 400,
  },

  mobileMark: {
    width: 46,
    height: 46,
    borderRadius: 14,
    background: t.ink,
    color: t.brass,
    display: "grid",
    placeItems: "center",
    fontFamily: t.display,
    fontSize: 17,
    letterSpacing: "0.06em",
    marginBottom: 26,
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.26em",
    color: t.brass,
  },

  title: {
    fontFamily: t.display,
    fontWeight: 400,
    fontSize: 40,
    lineHeight: 1.1,
    letterSpacing: "-0.025em",
    margin: "14px 0 14px",
    color: t.ink,
  },

  titleAccent: {
    fontStyle: "italic",
    color: t.brass,
  },

  subtitle: {
    margin: "0 0 28px",
    fontSize: 14,
    lineHeight: 1.65,
    color: t.muted,
  },

  orderButton: {
    width: "100%",
    height: 56,
    borderRadius: 14,
    background: t.brass,
    color: "#fff",
    fontSize: 15,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    boxShadow: "0 6px 18px rgba(176,141,63,.24)",
  },

  buttonSpinner: {
    width: 15,
    height: 15,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,.35)",
    borderTopColor: "#fff",
  },

  arrow: { fontSize: 18, lineHeight: 1 },

  googleNote: {
    marginTop: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 12,
    color: t.faint,
  },

  error: {
    marginTop: 16,
    padding: "11px 14px",
    borderRadius: 10,
    background: t.redSoft,
    border: `1px solid #EBD3D0`,
    color: t.red,
    fontSize: 12.5,
    lineHeight: 1.5,
  },

  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "30px 0 18px",
  },

  dividerLine: {
    flex: 1,
    height: 1,
    background: t.line,
  },

  dividerText: {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: "0.2em",
    color: t.faint,
    whiteSpace: "nowrap",
  },

  steps: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 11,
  },

  step: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    fontSize: 13,
    color: t.muted,
  },

  stepNum: {
    width: 22,
    height: 22,
    flexShrink: 0,
    borderRadius: "50%",
    background: t.brassSoft,
    color: t.brass,
    display: "grid",
    placeItems: "center",
    fontSize: 10,
    fontWeight: 800,
  },

  terms: {
    margin: "26px 0 0",
    fontSize: 11,
    lineHeight: 1.7,
    color: t.faint,
  },

  termsLink: {
    color: t.muted,
    fontWeight: 650,
  },

  secure: {
    marginTop: 26,
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 11,
    color: t.faint,
  },

  secureDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: t.green,
  },
};

export default LoginPage;