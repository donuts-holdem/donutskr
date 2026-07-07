# Intro Animation — "The Shuffle" (riffle-shuffle page-load sequence)

**Date:** 2026-07-07
**Status:** Approved (design)
**Scope:** Homepage only (`app/(site)`)

## Goal

A premium, poker-native page-load intro that plays once per browser session on
the homepage: a deck riffle-shuffles into one, the DO:NUTS wordmark reveals over
it, then a curtain wipe hands off to the hero. Cinematic but restrained —
consistent with the site's editorial/members'-club aesthetic, never casino.

## User decisions (locked)

- **Central motion:** card **riffle shuffle** — deck splits into two halves that
  interleave/cascade back into a single stack.
- **Frequency:** once per session (`sessionStorage`); refresh / in-session
  navigation does not replay it.

## Sequence (total ~1.8–2.2s)

1. Full-screen overlay in `--color-bg` (`#0A0908`) covers the viewport from the
   first server-rendered paint. The hero is server-rendered underneath — the
   overlay never gates LCP or mounts the hero late.
2. A single deck (stack of inline-SVG cards) splits into two halves that lift
   apart, then **riffle together**: cards from each half interleave with a
   staggered cascade and settle into one clean stack (GSAP timeline; per-card
   stagger + slight rotation/arc is where the "손기술" rhythm lives).
3. The **"DO:NUTS Poker Club"** wordmark reveals over the settled stack —
   masked / staggered (GSAP SplitText), gold with the brand pink on "NUTS".
4. The overlay wipes up (clip-path / transform) to reveal the hero; the stack
   clears out. Control hands to the existing hero, already present in the DOM.

## Behavior rules

- **Once per session:** a `sessionStorage` flag (`donuts:intro-seen`) gates
  replay. To avoid a flash of the hero before the overlay mounts, an inline
  pre-hydration script in the document sets a marker on `<html>` (e.g.
  `data-intro="play"` / removes it when the flag is already set) so the overlay's
  covering state is decided before first paint. The overlay's default (covering)
  state is expressed in CSS, not spun up from a client `useEffect`.
- **Skippable:** click, any key, or scroll ends the intro immediately (timeline
  seeks to end / overlay removed). A subtle "건너뛰기" affordance is visible.
- **prefers-reduced-motion:** no choreography. The overlay is not shown (or is
  removed instantly); the hero shows immediately. Honors the existing global
  `@media (prefers-reduced-motion: reduce)` block in `app/globals.css`.
- **No layout shift:** animate only `transform` / `opacity` / `clip-path`.
  Overlay is `position: fixed` above the page; removing it changes no layout.

## Architecture / components

- **`components/home/IntroShuffle.tsx`** (`"use client"`) — the intro overlay.
  - Owns the GSAP timeline via the `useGSAP()` hook and refs (no direct DOM
    queries into the rest of the page).
  - Reads the `sessionStorage` flag + reduced-motion on mount; if either says
    "skip", it renders nothing (or unmounts immediately) and never runs GSAP.
  - Sets the flag when it plays, so the next in-session load skips it.
  - Renders its own inline-SVG card stack + wordmark; self-contained.
  - Exposes a skip control (button + global click/key/scroll listeners) and
    cleans listeners up on unmount.
- **Inline pre-hydration script** — added in `app/(site)/layout.tsx` (or a small
  server component) to set the `<html data-intro>` marker before paint so the
  CSS covering state is correct on first render and there is no FOUC.
- **`components/home/HomeMagazine.tsx`** — unchanged structurally; the intro
  overlay is layered above it. The hero stays server-rendered and `priority`.
- **Isolation:** GSAP is imported only inside `IntroShuffle.tsx` (a client leaf),
  never in `app/layout.tsx`, so it doesn't bloat other routes. Consider
  `dynamic(..., { ssr: false })` for the GSAP-heavy body while keeping the CSS
  covering state server-rendered.

## Dependency justification (AGENTS.md gate)

Adding **`gsap`** (now fully free, incl. SplitText) is justified: a multi-step,
timeline-sequenced riffle with per-card interleave stagger, arc/rotation, and a
coordinated wordmark reveal is impractical to choreograph reliably in pure CSS.
GSAP is the industry-standard tool for exactly this and stays isolated to one
client leaf (~25–35 KB, off the critical path, not in the shared layout bundle).
No other animation dependency is added; existing `tw-animate-css` continues to
cover component enter/exit.

## Design tokens

- Reuse `--color-bg`, `--color-gold`, `--color-gold-deep`, `--color-pink`.
- Add intro timing tokens to `@theme` (e.g. `--ease-shuffle`, `--duration-intro`)
  rather than inlining magic numbers, per the tokens-only rule. GSAP easing
  mirrors these where a JS curve is needed.

## Accessibility

- Overlay marked `aria-hidden` where appropriate; it must not trap focus or
  block the hero's semantics underneath.
- Skip control is a real `<button>`, keyboard-focusable, with a visible focus
  state; `code`-based key handling (not `key`) per project IME rule.
- Full reduced-motion path shows the hero with no motion.

## Out of scope

- Site-wide route-transition animations (this is homepage first-load only).
- Chip-shuffle / card-dealing variants (deferred; riffle shuffle is the chosen
  concept).
- Any change to hero content, copy, or the schedule/reveal behavior.

## Success criteria

- Plays once per session on the homepage; silent on refresh / in-session nav.
- Zero CLS; hero LCP unaffected (overlay does not delay hero paint).
- No FOUC (no flash of hero before overlay, no flash of overlay when it should
  be skipped).
- Fully skippable and reduced-motion-safe.
- GSAP confined to the intro leaf; no bundle regression on other routes.
