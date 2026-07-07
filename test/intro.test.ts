import { afterEach, describe, expect, it, vi } from "vitest";
import {
  INTRO_SEEN_KEY,
  INTRO_PREHYDRATION_JS,
  hasSeenIntro,
  markIntroSeen,
  prefersReducedMotion,
  shouldPlayIntro,
} from "@/lib/intro";

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent() {
          return false;
        },
      }) as unknown as MediaQueryList,
  );
}

afterEach(() => {
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe("intro gating", () => {
  it("uses the exact documented session key", () => {
    expect(INTRO_SEEN_KEY).toBe("donuts:intro-seen");
  });

  it("hasSeenIntro reflects the session flag", () => {
    expect(hasSeenIntro()).toBe(false);
    window.sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    expect(hasSeenIntro()).toBe(true);
  });

  it("markIntroSeen persists the flag", () => {
    markIntroSeen();
    expect(window.sessionStorage.getItem(INTRO_SEEN_KEY)).toBe("1");
    expect(hasSeenIntro()).toBe(true);
  });

  it("prefersReducedMotion follows matchMedia", () => {
    stubMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
    stubMatchMedia(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("shouldPlayIntro only on a fresh session without reduced motion", () => {
    stubMatchMedia(false);
    expect(shouldPlayIntro()).toBe(true);

    stubMatchMedia(true);
    expect(shouldPlayIntro()).toBe(false);

    stubMatchMedia(false);
    markIntroSeen();
    expect(shouldPlayIntro()).toBe(false);
  });

  it("inline script references the same key and always sets a data-intro value", () => {
    expect(INTRO_PREHYDRATION_JS).toContain(INTRO_SEEN_KEY);
    expect(INTRO_PREHYDRATION_JS).toContain("data-intro");
  });
});
