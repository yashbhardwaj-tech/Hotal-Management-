// components/ProtectedAdminRoute.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { isAdmin, signInWithGoogle } from "../utils/auth";
import { t, globalCss } from "../theme";
import Admin from "./Admin";

type Gate = "checking" | "anonymous" | "denied" | "allowed";

function ProtectedAdminRoute() {
  const navigate = useNavigate();

  const [gate, setGate] = useState<Gate>("checking");
  const [signingIn, setSigningIn] = useState(false);

  /* The dashboard is public, so someone can land on /admin
     directly without ever having signed in. Wait for Firebase
     to restore the session, then check the flag. */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setGate("anonymous");
        return;
      }

      setGate((await isAdmin(user)) ? "allowed" : "denied");
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async (): Promise<void> => {
    setSigningIn(true);

    try {
      const user = await signInWithGoogle();
      setGate((await isAdmin(user)) ? "allowed" : "denied");
    } catch (error) {
      console.error("Admin sign-in failed:", error);
    } finally {
      setSigningIn(false);
    }
  };

  if (gate === "allowed") return <Admin />;

  return (
    <div style={s.page}>
      <style>{globalCss}</style>

      <div style={s.card}>
        {gate === "checking" && (
          <>
            <div style={s.dots}>
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  style={{ ...s.dot, animationDelay: `${index * 0.15}s` }}
                />
              ))}
            </div>

            <p style={s.checkingText}>Checking your access…</p>
          </>
        )}

        {gate === "anonymous" && (
          <>
            <div style={s.mark}>RP</div>

            <h1 style={s.title}>Staff sign-in</h1>

            <p style={s.text}>
              The kitchen dashboard is for staff. Sign in with the Google
              account that has been granted admin access.
            </p>

            <button
              type="button"
              className="btn btn-brass"
              onClick={() => void handleSignIn()}
              disabled={signingIn}
              style={s.primaryButton}
            >
              {signingIn ? "Opening Google…" : "Sign in with Google"}
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => navigate("/")}
              style={s.linkButton}
            >
              Back to the menu
            </button>
          </>
        )}

        {gate === "denied" && (
          <>
            <div style={{ ...s.mark, background: t.redSoft, color: t.red }}>
              !
            </div>

            <h1 style={s.title}>Not an admin yet</h1>

            <p style={s.text}>
              You're signed in as{" "}
              <strong style={{ color: t.text }}>
                {auth.currentUser?.email}
              </strong>
              , but this account doesn't have admin access.
            </p>

            <p style={s.hint}>
              An existing admin can grant it in Firestore: open{" "}
              <code style={s.code}>users</code> → your document → set{" "}
              <code style={s.code}>isAdmin</code> to <code style={s.code}>true</code>,
              then reload this page.
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate("/")}
              style={s.primaryButtonDark}
            >
              Back to the menu
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: t.cream,
    color: t.text,
    fontFamily: t.body,
    display: "grid",
    placeItems: "center",
    padding: 24,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    padding: "38px 34px",
    background: t.surface,
    border: `1px solid ${t.line}`,
    borderRadius: t.rLg,
    textAlign: "center",
    boxShadow: "0 16px 44px rgba(18,36,30,.08)",
  },

  mark: {
    width: 52,
    height: 52,
    margin: "0 auto 20px",
    borderRadius: 15,
    background: t.ink,
    color: t.brass,
    display: "grid",
    placeItems: "center",
    fontFamily: t.display,
    fontSize: 18,
    letterSpacing: "0.05em",
  },

  title: {
    margin: "0 0 10px",
    fontFamily: t.display,
    fontWeight: 400,
    fontSize: 25,
    color: t.ink,
  },

  text: {
    margin: "0 auto 24px",
    maxWidth: 320,
    fontSize: 13,
    lineHeight: 1.65,
    color: t.muted,
  },

  hint: {
    margin: "0 auto 24px",
    maxWidth: 330,
    fontSize: 11.5,
    lineHeight: 1.7,
    color: t.faint,
  },

  code: {
    padding: "1px 5px",
    borderRadius: 4,
    background: t.surfaceAlt,
    border: `1px solid ${t.lineSoft}`,
    fontSize: 11,
    color: t.muted,
  },

  primaryButton: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    background: t.brass,
    color: "#fff",
    fontSize: 13.5,
  },

  primaryButtonDark: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    background: t.ink,
    color: "#fff",
    fontSize: 13.5,
  },

  linkButton: {
    marginTop: 14,
    background: "none",
    color: t.faint,
    fontSize: 12,
    textDecoration: "underline",
    textUnderlineOffset: 3,
  },

  dots: { display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 },

  dot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: t.brass,
    display: "inline-block",
    animation: "bounceDot 1.1s infinite ease-in-out",
  },

  checkingText: { margin: 0, fontSize: 12.5, color: t.faint },
};

export default ProtectedAdminRoute;