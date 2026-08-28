// components/Brand.tsx

import type { CSSProperties } from "react";
import { t } from "../theme";
import hotelLogo from "../assets/hotel image .jpeg";

/* =========================================================
   BRAND
   Replaces the "RP" monogram tile. Same 40x40 footprint, so
   the surrounding header layout is untouched.
========================================================= */

interface BrandProps {
  size?: number;
  radius?: number;
  /** Falls back to the monogram if the file can't be loaded. */
  fallback?: string;
}

export function BrandMark({
  size = 40,
  radius = 12,
  fallback = "RP",
}: BrandProps) {
  return (
    <div
      style={{
        ...styles.mark,
        width: size,
        height: size,
        borderRadius: radius,
        fontSize: size * 0.38,
      }}
    >
      <img
        src={hotelLogo}
        alt="Hotel Rao Place"
        style={styles.img}
        onError={(event) => {
          const target = event.currentTarget;
          target.style.display = "none";

          const parent = target.parentElement;
          if (parent && !parent.dataset.fallbackApplied) {
            parent.dataset.fallbackApplied = "true";
            parent.textContent = fallback;
          }
        }}
      />
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  mark: {
    flexShrink: 0,
    overflow: "hidden",
    background: t.ink,
    color: t.brass,
    display: "grid",
    placeItems: "center",
    fontFamily: t.display,
    letterSpacing: "0.05em",
  },

  img: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
};