/* =========================================================
   THEME — Cheetah Hotels
   A single source of truth for colour, type and spacing.
   Imported by LoginPage, Dashboard and Admin.
========================================================= */

export const t = {
    /* Surfaces */
    cream: "#F7F4ED",
    surface: "#FFFFFF",
    surfaceAlt: "#FBF9F4",

    /* Ink — deep forest green, the house colour */
    ink: "#12241E",
    inkSoft: "#1C3529",

    /* Brass accent */
    brass: "#B08D3F",
    brassSoft: "#F3EBD8",

    /* Text */
    text: "#1B1B18",
    muted: "#7A7568",
    faint: "#A8A296",

    /* Lines */
    line: "#E4DFD3",
    lineSoft: "#EFEBE1",

    /* Status */
    green: "#2F6B4F",
    greenSoft: "#E8F1EC",
    blue: "#2B5F8A",
    blueSoft: "#E7F0F7",
    amber: "#A97514",
    amberSoft: "#FBF1DC",
    red: "#9E3B34",
    redSoft: "#F8EAE8",

    /* Type */
    display: 'Georgia, "Times New Roman", "Noto Serif", serif',
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',

    /* Radius */
    r: 14,
    rLg: 20,
};

/* =========================================================
   GLOBAL CSS
   Inline styles can't do hover, focus, keyframes or media
   queries — this covers what the style objects can't.
   Render as <style>{globalCss}</style> at the top of a page.
========================================================= */

export const globalCss = `
  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: ${t.cream};
    -webkit-font-smoothing: antialiased;
  }

  ::selection { background: ${t.brassSoft}; }

  /* ---- Buttons ---- */
  .btn {
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-weight: 650;
    letter-spacing: 0.01em;
    transition: transform .15s ease, box-shadow .15s ease,
                background-color .15s ease, border-color .15s ease, color .15s ease;
  }
  .btn:active { transform: translateY(1px); }
  .btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }

  .btn-primary:hover:not(:disabled) {
    background: ${t.inkSoft};
    box-shadow: 0 10px 22px rgba(18,36,30,.22);
  }
  .btn-brass:hover:not(:disabled) {
    background: #9C7B33;
    box-shadow: 0 10px 22px rgba(176,141,63,.28);
  }
  .btn-ghost:hover:not(:disabled) {
    background: ${t.surfaceAlt};
    border-color: ${t.brass};
    color: ${t.ink};
  }
  .btn-danger:hover:not(:disabled) {
    background: ${t.red};
    color: #fff;
    border-color: ${t.red};
  }

  /* ---- Focus ring: visible for keyboards, quiet for mice ---- */
  :focus-visible {
    outline: 2px solid ${t.brass};
    outline-offset: 2px;
    border-radius: 6px;
  }

  /* ---- Cards ---- */
  .lift { transition: transform .2s ease, box-shadow .2s ease; }
  .lift:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 34px rgba(18,36,30,.10);
  }

  .row-hover { transition: background-color .15s ease; }
  .row-hover:hover { background: ${t.surfaceAlt}; }

  /* ---- Inputs ---- */
  .inp {
    font-family: inherit;
    transition: border-color .15s ease, box-shadow .15s ease;
  }
  .inp:focus {
    outline: none;
    border-color: ${t.brass};
    box-shadow: 0 0 0 3px ${t.brassSoft};
  }

  /* ---- Skeleton shimmer ---- */
  .skel {
    background: linear-gradient(90deg, #ECE8DE 25%, #F5F2EA 37%, #ECE8DE 63%);
    background-size: 400% 100%;
    animation: shimmer 1.2s ease-in-out infinite;
    border-radius: 8px;
  }
  @keyframes shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
  }

  /* ---- Toast ---- */
  @keyframes toastIn {
    from { opacity: 0; transform: translateY(12px) scale(.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .toast { animation: toastIn .22s cubic-bezier(.2,.8,.3,1); }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up { animation: fadeUp .35s ease both; }

  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin .8s linear infinite; }

  /* ---- Scrollbars ---- */
  .thin::-webkit-scrollbar { width: 8px; }
  .thin::-webkit-scrollbar-thumb {
    background: ${t.line}; border-radius: 8px;
  }
  .thin::-webkit-scrollbar-track { background: transparent; }

  /* ---- Responsive ---- */
  @media (max-width: 1080px) {
    .content-grid { grid-template-columns: minmax(0,1fr) !important; }
    .cart-panel { position: static !important; }
    .stats-grid { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
  }
  @media (max-width: 720px) {
    .pad { padding-left: 18px !important; padding-right: 18px !important; }
    .hero { flex-direction: column; align-items: flex-start !important; gap: 20px; }
    .form-grid { grid-template-columns: minmax(0,1fr) !important; }
    .stats-grid { grid-template-columns: minmax(0,1fr) !important; }
    .split { grid-template-columns: minmax(0,1fr) !important; }
    .split-art { display: none !important; }
    .food-row {
      grid-template-columns: 52px minmax(0,1fr) !important;
      grid-template-areas: "icon info" "price price" "act act" !important;
      row-gap: 10px;
    }
  }
    @keyframes alertPulse {
  0%   { box-shadow: 0 0 0 0 rgba(176,141,63,.55); }
  70%  { box-shadow: 0 0 0 18px rgba(176,141,63,0); }
  100% { box-shadow: 0 0 0 0 rgba(176,141,63,0); }
}

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: .01ms !important;
      transition-duration: .01ms !important;
    }
  }
`;

/* =========================================================
   SHARED HELPERS
========================================================= */

export const inr = (n: number): string =>
    `₹${Number(n || 0).toLocaleString("en-IN")}`;

const categoryEmoji: Record<string, string> = {
    "Main Course": "🍛",
    Rice: "🍚",
    Breads: "🫓",
    Drinks: "🥤",
    Desserts: "🍮",
    Starters: "🥗",
    Breakfast: "🍳",
};

export const emojiFor = (
    food: { emoji?: string; category?: string } | undefined,
): string => food?.emoji || categoryEmoji[food?.category || ""] || "🍽️";

