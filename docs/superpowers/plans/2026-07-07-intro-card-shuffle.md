# Intro Card-Shuffle Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a premium, once-per-session riffle-shuffle page-load intro to the DO:NUTS homepage that reveals the wordmark and wipes to the hero.

**Architecture:** A single client-leaf overlay component (`IntroShuffle`) renders over the server-rendered homepage. A GSAP timeline choreographs a card riffle → wordmark reveal → curtain wipe. Pure gating logic (session flag + reduced-motion) lives in `lib/intro.ts` and is fully unit-tested; an inline pre-hydration script sets `<html data-intro>` before paint so sessions that already saw the intro never flash it. GSAP is confined to this one leaf, off the shared layout bundle.

**Tech Stack:** Next.js 16 (App Router) · React 19 · Tailwind v4 (CSS-first, tokens in `app/globals.css`) · GSAP + `@gsap/react` · Vitest + Testing Library (jsdom).

## Global Constraints

- **Design tokens only** — colors/spacing/radius via `@theme` tokens and Tailwind scale; never arbitrary values like `bg-[#141211]` or `text-[10.5px]`. Available tokens include `bg-bg`, `text-ink`, `text-gold`, `text-gold-deep`, `text-pink`, `text-cream`, `bg-cream`, `bg-surface`, `border-border`. (from AGENTS.md)
- **Import alias `@/` only.** (AGENTS.md)
- **Default to Server Components; add `"use client"` only when necessary.** (AGENTS.md)
- **Keyboard shortcuts use `KeyboardEvent.code`, never `event.key`** (Korean IME). (AGENTS.md)
- **Honor `prefers-reduced-motion`** — the global block in `app/globals.css:139` already neutralizes transitions; the intro must additionally not run its JS timeline for these users. (AGENTS.md)
- **New dependency justification:** `gsap` + `@gsap/react` are justified in the spec (timeline-sequenced riffle impractical in pure CSS) and must stay isolated to the intro leaf — never imported in `app/layout.tsx`.
- **Session flag key:** `donuts:intro-seen` (exact string, used by both the helper and the inline script).
- **Tests live in `test/`**, run with `npm run test` (`vitest run`). jsdom lacks `matchMedia` — tests that touch reduced-motion must stub `window.matchMedia`.

---

## File Structure

- **Create `lib/intro.ts`** — pure gating helpers (`shouldPlayIntro`, `hasSeenIntro`, `prefersReducedMotion`, `markIntroSeen`), the `INTRO_SEEN_KEY` constant, and the `INTRO_PREHYDRATION_JS` inline-script string. No React, no GSAP. Fully unit-testable.
- **Create `test/intro.test.ts`** — unit tests for `lib/intro.ts`.
- **Modify `app/globals.css`** — add intro timing tokens to `@theme` and an `.intro-overlay` rule + `html[data-intro="seen"]` hide rule.
- **Create `components/home/IntroShuffle.tsx`** — `"use client"` overlay: inline pre-hydration `<script>`, SVG/div card stack, masked wordmark, skip control, GSAP timeline via `useGSAP`.
- **Create `test/intro-shuffle.test.tsx`** — component tests (renders null when seen/reduced-motion; renders overlay + marks seen on fresh session; skip control is a button).
- **Modify `app/(site)/page.tsx`** — mount `<IntroShuffle />` above `<HomeMagazine />` on the homepage only.
- **Modify `package.json`** — add `gsap` and `@gsap/react` dependencies.

---

## Task 1: Gating helpers (`lib/intro.ts`)

**Files:**
- Create: `lib/intro.ts`
- Test: `test/intro.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `INTRO_SEEN_KEY: string` (`"donuts:intro-seen"`)
  - `INTRO_PREHYDRATION_JS: string` — self-contained script body (no wrapping `<script>` tags)
  - `hasSeenIntro(): boolean`
  - `prefersReducedMotion(): boolean`
  - `shouldPlayIntro(): boolean` — `!hasSeenIntro() && !prefersReducedMotion()`
  - `markIntroSeen(): void`

- [ ] **Step 1: Write the failing test**

Create `test/intro.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- test/intro.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/intro"`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/intro.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- test/intro.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/intro.ts test/intro.test.ts
git commit -m "feat(intro): add session/reduced-motion gating helpers"
```

---

## Task 2: Install GSAP + intro styles/tokens

**Files:**
- Modify: `package.json` (dependencies)
- Modify: `app/globals.css` (`@theme` tokens + `.intro-overlay` rules)

**Interfaces:**
- Consumes: nothing.
- Produces: CSS class `.intro-overlay` (fixed, full-bleed, `z-index: 60`, above the `z-50` header/dialogs) and the `html[data-intro="seen"] .intro-overlay { display: none }` hide rule; `@theme` tokens `--duration-intro-out`, `--ease-shuffle`; the `gsap` and `@gsap/react` packages available for Task 3.

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install gsap@^3.13.0 @gsap/react@^2.1.2
```
Expected: `package.json` gains `gsap` and `@gsap/react` under `dependencies`; install completes without peer-dependency errors (React 19 is supported).

- [ ] **Step 2: Add tokens + overlay CSS**

In `app/globals.css`, inside the existing `@theme { … }` block (near the other tokens, e.g. after `--color-cream`), add:

```css
  /* Intro animation timing (card-shuffle overlay). */
  --duration-intro-out: 500ms;
  --ease-shuffle: cubic-bezier(0.22, 1, 0.36, 1);
```

Then, after the `@theme` block (top-level, alongside the other bespoke rules such as the reduced-motion block), add:

```css
/* Homepage intro overlay. Sits above all site chrome (header/dialogs are z-50).
   The pre-hydration script (lib/intro.ts) sets html[data-intro] before paint;
   sessions that already saw the intro (or prefer reduced motion) get it hidden
   instantly, so there is never a flash of the overlay. */
.intro-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: var(--color-bg);
  transition: opacity var(--duration-intro-out) var(--ease-shuffle);
}
html[data-intro="seen"] .intro-overlay {
  display: none;
}
```

- [ ] **Step 3: Verify build + tokens compile**

Run: `npm run test -- test/intro.test.ts` (sanity: still green) and `npx tsc --noEmit`
Expected: no errors. (Optional: `npm run build` to confirm Tailwind processes the new tokens — expected to succeed.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app/globals.css
git commit -m "feat(intro): add gsap deps and intro overlay tokens/styles"
```

---

## Task 3: `IntroShuffle` overlay component

**Files:**
- Create: `components/home/IntroShuffle.tsx`
- Test: `test/intro-shuffle.test.tsx`

**Interfaces:**
- Consumes: `shouldPlayIntro`, `markIntroSeen`, `INTRO_PREHYDRATION_JS` from `@/lib/intro`; `gsap` (default) from `gsap`; `useGSAP` from `@gsap/react`.
- Produces: default export `IntroShuffle` — a client component taking no props. Renders the pre-hydration `<script>` + `.intro-overlay` on a fresh, motion-OK session and unmounts itself when the timeline completes or is skipped; renders `null` (after mount) when the intro should not play.

**Design notes (no placeholders):**
- Cards: exactly **5** `<div>` cards, `bg-cream text-bg`, Tailwind-scale sizing (`w-24 h-36 rounded-lg`), each with a suit glyph. Red suits use `text-pink`, black suits use `text-bg`.
- Wordmark: two masked lines (`overflow-hidden`), inner spans translated up on reveal via GSAP `yPercent`. Line 1 "DO:NUTS" (`text-gold`, "NUTS" in `text-pink`), line 2 "Poker Club" (`text-cream`). Uses the existing `Space_Grotesk` display font import pattern already used in `HomeMagazine.tsx`.
- Skip: a real `<button>` labeled "건너뛰기" (`text-cream`, focus-visible ring), plus global `keydown` (any key, via `event.code` presence — any key press skips) and `wheel` listeners; clicking the overlay also skips. All skip paths call `timelineRef.current?.progress(1)`, which runs the timeline's `onComplete` → unmount.
- Timeline (GSAP): split the stack into two halves → lift/rotate apart → riffle back together with a center-out stagger → reveal wordmark lines → wipe the overlay up (`yPercent: -100`). Exact durations are named constants; tuning during review is expected.

- [ ] **Step 1: Write the failing test**

Create `test/intro-shuffle.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock GSAP so no real animation runs under jsdom. The timeline is a chainable
// stub; progress() is a spy so we can assert skip behavior.
const timelineStub = {
  to: vi.fn(() => timelineStub),
  from: vi.fn(() => timelineStub),
  set: vi.fn(() => timelineStub),
  add: vi.fn(() => timelineStub),
  progress: vi.fn(() => timelineStub),
  kill: vi.fn(() => timelineStub),
};
vi.mock("gsap", () => ({
  default: {
    timeline: vi.fn(() => timelineStub),
    set: vi.fn(),
    registerPlugin: vi.fn(),
  },
}));
// useGSAP: run the callback in an effect (like the real hook) and honor cleanup.
vi.mock("@gsap/react", async () => {
  const React = await import("react");
  return {
    useGSAP: (cb: () => void | (() => void)) => {
      React.useEffect(() => cb(), []); // eslint-disable-line react-hooks/exhaustive-deps
    },
  };
});

import { shouldPlayIntro, markIntroSeen, INTRO_SEEN_KEY } from "@/lib/intro";
vi.mock("@/lib/intro", async (orig) => {
  const actual = await orig<typeof import("@/lib/intro")>();
  return { ...actual, shouldPlayIntro: vi.fn(), markIntroSeen: vi.fn() };
});

import IntroShuffle from "@/components/home/IntroShuffle";

afterEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

describe("IntroShuffle", () => {
  it("renders nothing once the intro should not play (seen / reduced motion)", async () => {
    vi.mocked(shouldPlayIntro).mockReturnValue(false);
    const { container } = render(<IntroShuffle />);
    await waitFor(() => {
      expect(container.querySelector(".intro-overlay")).toBeNull();
    });
    expect(markIntroSeen).not.toHaveBeenCalled();
  });

  it("plays and marks the session on a fresh visit", async () => {
    vi.mocked(shouldPlayIntro).mockReturnValue(true);
    render(<IntroShuffle />);
    // Overlay present with a keyboard-focusable skip button.
    expect(document.querySelector(".intro-overlay")).not.toBeNull();
    const skip = screen.getByRole("button", { name: "건너뛰기" });
    expect(skip.tagName).toBe("BUTTON");
    await waitFor(() => expect(markIntroSeen).toHaveBeenCalledTimes(1));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- test/intro-shuffle.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/home/IntroShuffle"`.

- [ ] **Step 3: Write the component**

Create `components/home/IntroShuffle.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import { Space_Grotesk } from "next/font/google";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { INTRO_PREHYDRATION_JS, markIntroSeen, shouldPlayIntro } from "@/lib/intro";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"] });

// Five-card deck. `red` picks the brand pink for hearts/diamonds; the rest sit
// in the near-black ink so the faces read on the cream card.
const CARDS = [
  { suit: "♠", red: false },
  { suit: "♥", red: true },
  { suit: "♣", red: false },
  { suit: "♦", red: true },
  { suit: "♠", red: false },
];

export default function IntroShuffle() {
  const rootRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [visible, setVisible] = useState(true);

  useGSAP(
    () => {
      if (!shouldPlayIntro()) {
        setVisible(false);
        return;
      }
      markIntroSeen();

      const cards = gsap.utils.toArray<HTMLElement>(".intro-card");
      const left = cards.filter((_, i) => i % 2 === 0);
      const right = cards.filter((_, i) => i % 2 === 1);

      const tl = gsap.timeline({ onComplete: () => setVisible(false) });
      timelineRef.current = tl;

      // Deck starts stacked dead-center with a faint fan.
      gsap.set(cards, {
        xPercent: -50,
        yPercent: -50,
        left: "50%",
        top: "50%",
        rotate: (i) => (i - 2) * 1.5,
        y: (i) => i * -1,
      });

      tl.to(left, { x: -90, rotate: -8, duration: 0.35, ease: "power2.out" })
        .to(right, { x: 90, rotate: 8, duration: 0.35, ease: "power2.out" }, "<")
        .to(cards, {
          x: 0,
          rotate: (i) => (i - 2) * 1.5,
          duration: 0.55,
          ease: "power3.inOut",
          stagger: { each: 0.05, from: "center" },
        })
        .from(
          ".intro-word-inner",
          { yPercent: 120, duration: 0.6, ease: "power3.out", stagger: 0.1 },
          "-=0.15",
        )
        .to(".intro-stack", { opacity: 0, duration: 0.4, ease: "power1.in" }, "+=0.4")
        .to(rootRef.current, { yPercent: -100, duration: 0.6, ease: "power3.inOut" }, "-=0.1");

      const skip = () => timelineRef.current?.progress(1);
      window.addEventListener("keydown", skip);
      window.addEventListener("wheel", skip, { passive: true });
      return () => {
        window.removeEventListener("keydown", skip);
        window.removeEventListener("wheel", skip);
      };
    },
    { scope: rootRef },
  );

  if (!visible) return null;

  return (
    <>
      {/* Runs before hydration so seen/reduced-motion sessions never flash the overlay. */}
      <script dangerouslySetInnerHTML={{ __html: INTRO_PREHYDRATION_JS }} />
      <div
        ref={rootRef}
        className="intro-overlay flex items-center justify-center overflow-hidden"
        aria-hidden="true"
        onClick={() => timelineRef.current?.progress(1)}
      >
        <div className="intro-stack relative h-36 w-24">
          {CARDS.map((c, i) => (
            <div
              key={i}
              className="intro-card absolute flex h-36 w-24 items-center justify-center rounded-lg bg-cream text-4xl shadow-lg"
            >
              <span className={c.red ? "text-pink" : "text-bg"}>{c.suit}</span>
            </div>
          ))}
        </div>

        <div
          className={`${display.className} pointer-events-none absolute bottom-[22%] flex flex-col items-center gap-2 text-center`}
        >
          <span className="overflow-hidden py-1 leading-none">
            <span className="intro-word-inner block text-4xl font-bold tracking-[-0.02em] text-gold sm:text-5xl">
              DO:<span className="text-pink">NUTS</span>
            </span>
          </span>
          <span className="overflow-hidden py-1 leading-none">
            <span className="intro-word-inner block text-lg font-medium uppercase tracking-[0.3em] text-cream">
              Poker Club
            </span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => timelineRef.current?.progress(1)}
          className="absolute bottom-8 right-8 rounded-pill border border-border px-4 py-2 text-2xs font-medium uppercase tracking-[0.2em] text-cream/70 transition-colors hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
        >
          건너뛰기
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- test/intro-shuffle.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/home/IntroShuffle.tsx test/intro-shuffle.test.tsx
git commit -m "feat(intro): add IntroShuffle card-shuffle overlay component"
```

---

## Task 4: Mount on the homepage + verify end-to-end

**Files:**
- Modify: `app/(site)/page.tsx`

**Interfaces:**
- Consumes: default `IntroShuffle` from `@/components/home/IntroShuffle`.
- Produces: the intro rendered on the homepage route only (not on `/lab`, `/admin`, or other routes).

- [ ] **Step 1: Mount the overlay**

In `app/(site)/page.tsx`, add the import and wrap the return in a fragment so `IntroShuffle` renders first (its inline script must precede the overlay in DOM order):

```tsx
import { IntroShuffle } from "@/components/home/IntroShuffle";
```

Wait — the component is a default export. Use:

```tsx
import IntroShuffle from "@/components/home/IntroShuffle";
```

Change the returned JSX from:

```tsx
  return (
    <HomeMagazine
      events={events}
      programs={programs}
      signupLink={config.signup_link}
      groupLabels={groupLabels}
      statusLabels={statusLabels}
    />
  );
```

to:

```tsx
  return (
    <>
      <IntroShuffle />
      <HomeMagazine
        events={events}
        programs={programs}
        signupLink={config.signup_link}
        groupLabels={groupLabels}
        statusLabels={statusLabels}
      />
    </>
  );
```

- [ ] **Step 2: Typecheck + full test run**

Run: `npx tsc --noEmit && npm run test`
Expected: no type errors; all tests pass (including the two new suites).

- [ ] **Step 3: Manual browser verification**

Run `npm run dev`, then in the browser (use the claude-in-chrome tools or manually):

1. **Fresh session** (new tab / cleared session storage): load `/` → the shuffle intro plays, wordmark reveals, overlay wipes up to the hero. No horizontal scroll, no layout jump.
2. **Refresh** the same tab → intro does **not** replay; hero shows immediately with no flash of the overlay.
3. **Reduced motion**: enable OS "Reduce motion" (or DevTools rendering emulation) → reload with cleared session storage → intro is skipped, hero shows immediately.
4. **Skip**: fresh session, press any key / scroll / click during the intro → it jumps to the end immediately.
5. **Other route**: load `/lab` or `/admin` → no intro overlay present.

Confirm each of the 5 behaviors before marking complete.

- [ ] **Step 4: Commit**

```bash
git add "app/(site)/page.tsx"
git commit -m "feat(intro): play card-shuffle intro on the homepage"
```

---

## Self-Review

**Spec coverage:**
- Riffle-shuffle sequence → Task 3 timeline. ✓
- Once-per-session (`donuts:intro-seen`) → Task 1 (`markIntroSeen`/`hasSeenIntro`), Task 3 (marks on play). ✓
- Pre-hydration anti-FOUC script + `<html data-intro>` + CSS hide → Task 1 (`INTRO_PREHYDRATION_JS`), Task 2 (CSS), Task 3 (renders `<script>`). ✓
- Skippable (click/key/scroll + visible button) → Task 3. ✓
- `prefers-reduced-motion` path → Task 1 (`prefersReducedMotion`/`shouldPlayIntro`), Task 3 (early unmount), Task 2 (script sets `seen`). ✓
- No CLS / hero LCP unaffected → overlay is `position: fixed` above server-rendered hero; hero never deferred (Task 4 mounts alongside, not instead of). ✓
- GSAP isolated to the leaf → Task 3 only; never in `app/layout.tsx`. ✓
- Tokens (colors) + timing tokens → Task 2 tokens; Task 3 uses `bg-cream/text-gold/text-pink/text-cream/border-border`. ✓
- Homepage-only scope → Task 4. ✓
- Accessibility (real button, focus ring, `code`-based keys) → Task 3 (any-key skip via `keydown`; button is focusable with `focus-visible` ring). ✓

**Placeholder scan:** No TBD/TODO; all steps carry concrete code and commands. ✓

**Type consistency:** `shouldPlayIntro`/`markIntroSeen`/`INTRO_PREHYDRATION_JS`/`INTRO_SEEN_KEY` names match across Tasks 1/2/3. Component is a **default export** consumed as a default import in Tasks 3-test and 4. Timeline stub methods (`to/from/set/progress`) match the component's usage. ✓

**Note on the `event.code` rule:** the skip handler treats *any* key as "skip", so it reads no specific `key`/`code` value — the IME hazard (mapping a specific key) does not arise. If a future change keys off a specific shortcut, use `event.code`.
