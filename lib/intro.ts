// Client-only gating for the homepage intro animation. All functions are
// SSR-safe (guard on `window`) so they can be imported into a client leaf that
// still server-renders. See docs/superpowers/specs/2026-07-07-intro-card-shuffle-design.md.

export const INTRO_SEEN_KEY = "donuts:intro-seen";

/**
 * Runs before hydration (injected via a <script> tag) to set `data-intro` on
 * <html> so CSS can hide the overlay before first paint for sessions that have
 * already seen it or prefer reduced motion — preventing any flash. On any error
 * (storage blocked, etc.) it fails closed to "seen" (overlay hidden).
 */
export const INTRO_PREHYDRATION_JS = `try{var d=document.documentElement;var seen=window.sessionStorage.getItem('${INTRO_SEEN_KEY}')!==null;var rm=window.matchMedia('(prefers-reduced-motion: reduce)').matches;d.setAttribute('data-intro',(seen||rm)?'seen':'play');}catch(e){document.documentElement.setAttribute('data-intro','seen');}`;

export function hasSeenIntro(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(INTRO_SEEN_KEY) !== null;
  } catch {
    return true; // storage blocked → skip the intro, matching the script fallback
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function shouldPlayIntro(): boolean {
  return !hasSeenIntro() && !prefersReducedMotion();
}

export function markIntroSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    /* storage blocked — nothing to persist */
  }
}
