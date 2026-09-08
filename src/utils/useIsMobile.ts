import { useEffect, useState } from "react";

/* One breakpoint, shared. The tray and the QR both need to know
   whether they're on a phone, and JS beats a CSS class here
   because the two need to render different markup, not just
   different styling. */
const QUERY = "(max-width: 900px)";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window === "undefined" ? false : window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);

    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);

    /* Re-read on mount too — the viewport can change between the
       initial state and the effect running. */
    setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);

    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

export default useIsMobile;