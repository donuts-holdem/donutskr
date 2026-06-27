# Admin Phase 3 — Feedback & Traceability + Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the DO:NUTS admin tell operators that a save succeeded, where the result appears on the public site, and why something they "turned on" still isn't public — and replace the inaccessible ●/○ dots with screen-reader-friendly badges.

**Architecture:** A single pure visibility predicate (`lib/visibility.ts`) computes effective public visibility and is shared by the public routes AND the admin badges (one source of truth). shadcn `sonner` provides save toasts via a redirect-`?saved=` flash pattern. shadcn `Badge` backs two accessible admin badge components. The dashboard and grouped sidebar are rebuilt as Server/Client components against existing `getAll*` data functions.

**Tech Stack:** Next.js App Router (modified — read `node_modules/next/dist/docs/` before route/API work), React Server Components + Server Actions, Tailwind v4 (CSS-first tokens in `app/globals.css`), shadcn/ui, sonner, lucide-react, Vitest + @testing-library/react (jsdom, no DB).

## Global Constraints

- Import alias `@/` only. Default to Server Components; add `"use client"` only when necessary (keep client bundles small).
- **Admin** uses shadcn primitives (`components/ui/*`) and the shadcn token layer (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-card`, `text-primary`=gold, `rounded-md`/`rounded-pill`). Do NOT convert admin to bespoke public tokens. Keep the existing admin H1 convention `text-gold text-2xl font-bold`.
- Design tokens only — no hardcoded hex/arbitrary values. New tokens go in `app/globals.css` `@theme`/`:root`/`.dark`.
- Render toasts/menus/popovers via portals (sonner `<Toaster/>` satisfies this).
- Keyboard shortcuts (none added here) must use `KeyboardEvent.code`. Korean copy for all operator-facing strings.
- **One source of truth for visibility:** admin badges and public routes must call the SAME pure predicate from `lib/visibility.ts`. No duplicated/forked visibility logic.
- Public-site rendering behavior may change ONLY as the predicate dictates (events with `status="hidden"` become hidden publicly) — this is intended and must be covered by a test. No OTHER public behavior changes.
- Tests are pure jsdom units (no DB). Extract pure helpers and unit-test them; `npm test` (= `vitest run --passWithNoTests`) stays green; `npx tsc --noEmit` and `npx eslint <changed files>` are clean (0 warnings).
- Reuse existing assets: `partitionEvents`/`todayKST` (`lib/schedule.ts`), `eventStatusLabel` (`lib/labels.ts`), `getAll*`/`getActiveSeason`/`getEvents` (`lib/data/*`), `lib/data/tabs.ts:isTabActive` as the predicate style reference.

---

## File Structure

**Create:**
- `components/ui/sonner.tsx` — shadcn Toaster wrapper (via `npx shadcn@latest add sonner`).
- `components/ui/badge.tsx` — shadcn Badge (via `npx shadcn@latest add badge`).
- `lib/visibility.ts` — pure effective-visibility predicate + state types.
- `test/visibility.test.ts` — predicate unit tests.
- `components/admin/StateBadge.tsx` — accessible boolean flag badge (노출/HOT/제휴).
- `components/admin/EffectiveVisibilityBadge.tsx` — "is it actually live + why not" badge.
- `test/state-badge.test.tsx`, `test/effective-visibility-badge.test.tsx` — badge a11y/render tests.
- `components/admin/AdminNav.tsx` — `"use client"` grouped sidebar nav (active route via `usePathname`).
- `components/admin/SaveToast.tsx` — `"use client"` reads `?saved`/`?deleted` and fires a toast, then strips the param.
- `components/admin/ViewOnSiteLink.tsx` — shared "사이트에서 보기" external link.

**Modify:**
- `app/globals.css` — add `--warning`/`--warning-foreground` token pair + `@theme inline` mapping.
- `app/admin/(protected)/layout.tsx` — use `AdminNav`, mount `<Toaster/>` + `<SaveToast/>`.
- `app/admin/(protected)/page.tsx` — real dashboard.
- `app/admin/(protected)/events/page.tsx` — `EffectiveVisibilityBadge`, ViewOnSiteLink.
- `app/admin/(protected)/programs/page.tsx` — `StateBadge` ×3, ViewOnSiteLink.
- `app/admin/(protected)/special-pages/page.tsx` — `EffectiveVisibilityBadge`, ViewOnSiteLink.
- `app/admin/(protected)/seasons/page.tsx` — ViewOnSiteLink (`/series`).
- `lib/data/events.ts` — `getEvents()` filters through the shared predicate.
- `app/(site)/[tabSlug]/page.tsx` — special-page window check uses the shared predicate.
- All save/delete actions (`app/admin/actions/*.ts`) — append `?saved=1` / `?deleted=1` to their post-action `redirect()` (and add a self-redirect to the two non-redirecting ones: `onlineLeague.ts`, `siteConfig.ts`).
- Edit pages that show a form heading (events/programs/seasons/special-pages `[id]/edit`) — add ViewOnSiteLink where an entity is being edited.

---

## Task 1: Foundation — sonner, Badge, warning token, Toaster mount

**Files:**
- Create: `components/ui/sonner.tsx`, `components/ui/badge.tsx` (both via shadcn CLI)
- Modify: `package.json` (sonner dep added by CLI), `app/globals.css`, `app/admin/(protected)/layout.tsx`
- Test: none (wiring/visual only; verified by tsc/eslint/build)

**Interfaces:**
- Produces: `<Toaster/>` from `@/components/ui/sonner`; `Badge` + `badgeVariants` from `@/components/ui/badge`; CSS utilities `bg-warning`, `text-warning`, `border-warning`, `text-warning-foreground`.

- [ ] **Step 1: Add the shadcn components**

```bash
npx shadcn@latest add sonner badge
```
Expected: creates `components/ui/sonner.tsx` and `components/ui/badge.tsx`, installs `sonner` into `package.json` dependencies. If the CLI prompts, accept defaults. Verify both files exist and `sonner` appears in `package.json`.

- [ ] **Step 2: Theme the Toaster for the dark admin**

Edit `components/ui/sonner.tsx` so the exported component renders with admin-appropriate props. The default shadcn wrapper reads theme from `next-themes`; this app has no `next-themes` and is always dark. Replace the theme wiring so it renders:

```tsx
"use client";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      richColors={false}
      toastOptions={{
        classNames: {
          toast: "bg-card text-foreground border border-border",
        },
      }}
      {...props}
    />
  );
}
```

- [ ] **Step 3: Add the `--warning` token**

In `app/globals.css`, add to BOTH `:root` and `.dark` (same value — admin is always dark):

```css
--warning: #d9a441;
--warning-foreground: #0a0908;
```

And in the `@theme inline` block, alongside the other `--color-*` mappings:

```css
--color-warning: var(--warning);
--color-warning-foreground: var(--warning-foreground);
```

Place these next to the existing `--color-primary`/`--color-destructive` mappings to match file structure.

- [ ] **Step 4: Mount the Toaster in the admin layout**

In `app/admin/(protected)/layout.tsx`, import `{ Toaster } from "@/components/ui/sonner"` and render `<Toaster />` once inside the root `<div>` (after `<main>`). Do not mount it in the public root layout.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npx eslint app/admin/\(protected\)/layout.tsx components/ui/sonner.tsx components/ui/badge.tsx app/globals.css`
Expected: exit 0, no warnings. Run `npm test` — still green (no tests changed).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(admin): add sonner + badge primitives, warning token, mount Toaster"
```

---

## Task 2: Shared effective-visibility predicate + public wiring

**Files:**
- Create: `lib/visibility.ts`, `test/visibility.test.ts`
- Modify: `lib/data/events.ts`, `app/(site)/[tabSlug]/page.tsx`
- Test: `test/visibility.test.ts`

**Interfaces:**
- Produces:
  - `type EventVisibility = "live" | "off" | "hidden-flag"`
  - `type SpecialPageVisibility = "live" | "off" | "window-before" | "window-after"`
  - `effectiveEventVisibility(event: Pick<Event,"is_visible"|"status">): EventVisibility`
  - `effectiveSpecialPageVisibility(page: Pick<SpecialPage,"is_visible"|"start_show_date"|"end_show_date">, today: string): SpecialPageVisibility`
  - `isEventPublic(event): boolean` (= visibility === "live")
  - `isSpecialPagePublic(page, today): boolean` (= visibility === "live")
- Consumes: `Event`, `SpecialPage` from `@/lib/types`; `todayKST` is supplied by callers, not imported here (keep pure & deterministic).

- [ ] **Step 1: Write the failing predicate test**

Create `test/visibility.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  effectiveEventVisibility,
  effectiveSpecialPageVisibility,
  isEventPublic,
  isSpecialPagePublic,
} from "@/lib/visibility";

describe("effectiveEventVisibility", () => {
  it("is off when is_visible is false (status irrelevant)", () => {
    expect(effectiveEventVisibility({ is_visible: false, status: "confirmed" })).toBe("off");
    expect(effectiveEventVisibility({ is_visible: false, status: "hidden" })).toBe("off");
  });
  it("is hidden-flag when visible but status is hidden", () => {
    expect(effectiveEventVisibility({ is_visible: true, status: "hidden" })).toBe("hidden-flag");
  });
  it("is live when visible and status is not hidden", () => {
    expect(effectiveEventVisibility({ is_visible: true, status: "confirmed" })).toBe("live");
    expect(effectiveEventVisibility({ is_visible: true, status: "running" })).toBe("live");
  });
  it("isEventPublic is true only for live", () => {
    expect(isEventPublic({ is_visible: true, status: "confirmed" })).toBe(true);
    expect(isEventPublic({ is_visible: true, status: "hidden" })).toBe(false);
    expect(isEventPublic({ is_visible: false, status: "confirmed" })).toBe(false);
  });
});

describe("effectiveSpecialPageVisibility", () => {
  const today = "2026-06-27";
  it("is off when is_visible is false", () => {
    expect(effectiveSpecialPageVisibility({ is_visible: false, start_show_date: null, end_show_date: null }, today)).toBe("off");
  });
  it("is window-before when today is before start_show_date", () => {
    expect(effectiveSpecialPageVisibility({ is_visible: true, start_show_date: "2026-07-01", end_show_date: null }, today)).toBe("window-before");
  });
  it("is window-after when today is after end_show_date", () => {
    expect(effectiveSpecialPageVisibility({ is_visible: true, start_show_date: null, end_show_date: "2026-06-01" }, today)).toBe("window-after");
  });
  it("is live when visible and inside the window (or no window)", () => {
    expect(effectiveSpecialPageVisibility({ is_visible: true, start_show_date: null, end_show_date: null }, today)).toBe("live");
    expect(effectiveSpecialPageVisibility({ is_visible: true, start_show_date: "2026-06-01", end_show_date: "2026-12-31" }, today)).toBe("live");
  });
  it("treats the boundary days as inside the window", () => {
    expect(effectiveSpecialPageVisibility({ is_visible: true, start_show_date: "2026-06-27", end_show_date: "2026-06-27" }, today)).toBe("live");
  });
  it("isSpecialPagePublic is true only for live", () => {
    expect(isSpecialPagePublic({ is_visible: true, start_show_date: null, end_show_date: null }, today)).toBe(true);
    expect(isSpecialPagePublic({ is_visible: true, start_show_date: "2026-07-01", end_show_date: null }, today)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run test/visibility.test.ts`
Expected: FAIL — cannot resolve `@/lib/visibility`.

- [ ] **Step 3: Implement the predicate**

Create `lib/visibility.ts`. Note the special-page boundary semantics must match the existing route check in `app/(site)/[tabSlug]/page.tsx` (`today < start` → not yet; `today > end` → expired; boundaries inclusive):

```ts
import type { Event, SpecialPage } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * Effective public visibility — the SINGLE source of truth shared by
 * the public routes (which filter on it) and the admin badges (which
 * explain it). Pure & deterministic: `today` is passed in as a
 * "YYYY-MM-DD" string (see lib/schedule.ts todayKST) so it is testable.
 * ------------------------------------------------------------------ */

export type EventVisibility = "live" | "off" | "hidden-flag";
export type SpecialPageVisibility = "live" | "off" | "window-before" | "window-after";

/** Why (or whether) an event is publicly visible. */
export function effectiveEventVisibility(
  event: Pick<Event, "is_visible" | "status">
): EventVisibility {
  if (!event.is_visible) return "off";
  if (event.status === "hidden") return "hidden-flag";
  return "live";
}

export function isEventPublic(event: Pick<Event, "is_visible" | "status">): boolean {
  return effectiveEventVisibility(event) === "live";
}

/** Why (or whether) a special page is publicly visible, given today. */
export function effectiveSpecialPageVisibility(
  page: Pick<SpecialPage, "is_visible" | "start_show_date" | "end_show_date">,
  today: string
): SpecialPageVisibility {
  if (!page.is_visible) return "off";
  if (page.start_show_date && today < page.start_show_date) return "window-before";
  if (page.end_show_date && today > page.end_show_date) return "window-after";
  return "live";
}

export function isSpecialPagePublic(
  page: Pick<SpecialPage, "is_visible" | "start_show_date" | "end_show_date">,
  today: string
): boolean {
  return effectiveSpecialPageVisibility(page, today) === "live";
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx vitest run test/visibility.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Wire the predicate into the public events query**

In `lib/data/events.ts`, `getEvents()` currently does `.eq("is_visible", true)` only — a `status="hidden"` event with `is_visible=true` leaks to the public. Apply the shared predicate so the public matches the admin badge. Keep the DB `is_visible=true` filter (cheap pre-filter) and add an in-memory predicate pass:

```ts
import { isEventPublic } from "@/lib/visibility";
// ...inside getEvents, after the rows are fetched and mapped to Event[]:
return rows.filter(isEventPublic);
```
Apply the filter to the returned `Event[]` (after the existing map). Do NOT change `getAllEvents()` (admin needs every row). Keep ordering intact (filter preserves order).

- [ ] **Step 6: Wire the predicate into the special-page route**

In `app/(site)/[tabSlug]/page.tsx`, replace the inline window check:

```ts
// before:
const today = new Date().toISOString().slice(0, 10);
if (page.start_show_date && today < page.start_show_date) notFound();
if (page.end_show_date && today > page.end_show_date) notFound();
// after:
import { todayKST } from "@/lib/schedule";
import { isSpecialPagePublic } from "@/lib/visibility";
// ...
if (!isSpecialPagePublic(page, todayKST())) notFound();
```
This is behavior-preserving for the window dimension (same boundaries) and additionally honors `is_visible` consistently. (`getSpecialPageBySlug` already filters `is_visible=true`, so the `is_visible` branch is belt-and-suspenders — keep it for one-source-of-truth.) Switching the date source from `toISOString()` (UTC) to `todayKST()` (Asia/Seoul) is intentional: it aligns the public window with the club timezone used everywhere else.

- [ ] **Step 7: Verify and commit**

Run: `npx vitest run test/visibility.test.ts && npx tsc --noEmit && npx eslint lib/visibility.ts lib/data/events.ts "app/(site)/[tabSlug]/page.tsx"`
Expected: pass / exit 0.

```bash
git add lib/visibility.ts test/visibility.test.ts lib/data/events.ts "app/(site)/[tabSlug]/page.tsx"
git commit -m "feat(visibility): shared effective-visibility predicate, wired into public routes"
```

---

## Task 3: Accessible badges + replace ●/○ in list pages

**Files:**
- Create: `components/admin/StateBadge.tsx`, `components/admin/EffectiveVisibilityBadge.tsx`, `test/state-badge.test.tsx`, `test/effective-visibility-badge.test.tsx`
- Modify: `app/admin/(protected)/events/page.tsx`, `app/admin/(protected)/programs/page.tsx`, `app/admin/(protected)/special-pages/page.tsx`
- Test: the two new test files

**Interfaces:**
- Consumes: `Badge` (`@/components/ui/badge`), predicate types + functions (`@/lib/visibility`), `todayKST` (`@/lib/schedule`), lucide-react icons.
- Produces:
  - `StateBadge({ on, kind }: { on: boolean; kind: "visible" | "hot" | "affiliate" })`
  - `EffectiveVisibilityBadge` with a discriminated `state` prop covering `EventVisibility` ∪ `SpecialPageVisibility`.

- [ ] **Step 1: Write the failing StateBadge test**

Create `test/state-badge.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StateBadge } from "@/components/admin/StateBadge";

describe("StateBadge", () => {
  it("renders an accessible label for visible on/off", () => {
    const { rerender } = render(<StateBadge on kind="visible" />);
    expect(screen.getByLabelText("노출 중")).toBeInTheDocument();
    rerender(<StateBadge on={false} kind="visible" />);
    expect(screen.getByLabelText("노출 안 함")).toBeInTheDocument();
  });
  it("conveys state with text, not color alone (visible text differs)", () => {
    const { rerender } = render(<StateBadge on kind="visible" />);
    expect(screen.getByText("노출")).toBeInTheDocument();
    rerender(<StateBadge on={false} kind="visible" />);
    expect(screen.getByText("비노출")).toBeInTheDocument();
  });
  it("labels HOT and 제휴 with on/off accessible names", () => {
    const { rerender } = render(<StateBadge on kind="hot" />);
    expect(screen.getByLabelText("HOT 표시 켜짐")).toBeInTheDocument();
    rerender(<StateBadge on={false} kind="affiliate" />);
    expect(screen.getByLabelText("제휴 표시 꺼짐")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run test/state-badge.test.tsx` → FAIL (module missing).

- [ ] **Step 3: Implement StateBadge**

Create `components/admin/StateBadge.tsx`. State must differ by TEXT (and icon), not hue alone:

```tsx
import { Eye, EyeOff, Flame, Handshake } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Kind = "visible" | "hot" | "affiliate";

const CONFIG: Record<Kind, {
  onText: string; offText: string; onAria: string; offAria: string;
  OnIcon: typeof Eye; OffIcon: typeof Eye;
}> = {
  visible: { onText: "노출", offText: "비노출", onAria: "노출 중", offAria: "노출 안 함", OnIcon: Eye, OffIcon: EyeOff },
  hot: { onText: "HOT", offText: "HOT", onAria: "HOT 표시 켜짐", offAria: "HOT 표시 꺼짐", OnIcon: Flame, OffIcon: Flame },
  affiliate: { onText: "제휴", offText: "제휴", onAria: "제휴 표시 켜짐", offAria: "제휴 표시 꺼짐", OnIcon: Handshake, OffIcon: Handshake },
};

export function StateBadge({ on, kind }: { on: boolean; kind: Kind }) {
  const c = CONFIG[kind];
  const Icon = on ? c.OnIcon : c.OffIcon;
  return (
    <Badge
      variant="outline"
      aria-label={on ? c.onAria : c.offAria}
      className={
        on
          ? "border-border bg-primary/10 text-primary gap-1 [&_svg]:size-3"
          : "border-border text-muted-foreground/70 gap-1 [&_svg]:size-3"
      }
    >
      <Icon aria-hidden />
      {on ? c.onText : c.offText}
    </Badge>
  );
}
```

- [ ] **Step 4: Run StateBadge test, verify pass.** `npx vitest run test/state-badge.test.tsx` → PASS.

- [ ] **Step 5: Write the failing EffectiveVisibilityBadge test**

Create `test/effective-visibility-badge.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EffectiveVisibilityBadge } from "@/components/admin/EffectiveVisibilityBadge";

describe("EffectiveVisibilityBadge", () => {
  it("shows live", () => {
    render(<EffectiveVisibilityBadge state="live" />);
    expect(screen.getByText("노출 중")).toBeInTheDocument();
  });
  it("explains why a turned-on entity is not public (hidden status)", () => {
    render(<EffectiveVisibilityBadge state="hidden-flag" />);
    expect(screen.getByText("노출 안 됨 · 숨김 상태")).toBeInTheDocument();
    expect(screen.getByLabelText(/숨김/)).toBeInTheDocument();
  });
  it("explains an expired window", () => {
    render(<EffectiveVisibilityBadge state="window-after" />);
    expect(screen.getByText("노출 안 됨 · 기간 종료")).toBeInTheDocument();
  });
  it("shows a pending window and an off state", () => {
    const { rerender } = render(<EffectiveVisibilityBadge state="window-before" />);
    expect(screen.getByText("노출 예정 · 기간 전")).toBeInTheDocument();
    rerender(<EffectiveVisibilityBadge state="off" />);
    expect(screen.getByText("비노출")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run, verify fail.** `npx vitest run test/effective-visibility-badge.test.tsx` → FAIL.

- [ ] **Step 7: Implement EffectiveVisibilityBadge**

Create `components/admin/EffectiveVisibilityBadge.tsx`. Only the two "operator turned it on but it's silently NOT public" states use the warning amber:

```tsx
import { Eye, EyeOff, AlertTriangle, CalendarClock, CalendarX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EventVisibility, SpecialPageVisibility } from "@/lib/visibility";

type State = EventVisibility | SpecialPageVisibility;

const CONFIG: Record<State, { text: string; aria: string; className: string; Icon: typeof Eye }> = {
  live: { text: "노출 중", aria: "공개 사이트에 노출 중", className: "border-border bg-primary/10 text-primary", Icon: Eye },
  off: { text: "비노출", aria: "노출 꺼짐", className: "border-border text-muted-foreground/70", Icon: EyeOff },
  "hidden-flag": { text: "노출 안 됨 · 숨김 상태", aria: "노출은 켜졌지만 상태가 숨김이라 공개되지 않음", className: "border-warning/30 bg-warning/15 text-warning", Icon: AlertTriangle },
  "window-before": { text: "노출 예정 · 기간 전", aria: "노출 시작일 이전이라 아직 공개되지 않음", className: "border-border text-muted-foreground/70", Icon: CalendarClock },
  "window-after": { text: "노출 안 됨 · 기간 종료", aria: "노출 종료일이 지나 공개되지 않음", className: "border-warning/30 bg-warning/15 text-warning", Icon: CalendarX },
};

export function EffectiveVisibilityBadge({ state }: { state: State }) {
  const c = CONFIG[state];
  return (
    <Badge variant="outline" aria-label={c.aria} className={`gap-1 [&_svg]:size-3 ${c.className}`}>
      <c.Icon aria-hidden />
      {c.text}
    </Badge>
  );
}
```

- [ ] **Step 8: Run, verify pass.** `npx vitest run test/effective-visibility-badge.test.tsx` → PASS.

- [ ] **Step 9: Replace ●/○ in the events list**

In `app/admin/(protected)/events/page.tsx`, replace the 노출 cell (the `event.is_visible ? "●" : "○"` block) with:

```tsx
import { EffectiveVisibilityBadge } from "@/components/admin/EffectiveVisibilityBadge";
import { effectiveEventVisibility } from "@/lib/visibility";
// ...
<TableCell>
  <EffectiveVisibilityBadge state={effectiveEventVisibility(event)} />
</TableCell>
```

- [ ] **Step 10: Replace ●/○ in the programs list**

In `app/admin/(protected)/programs/page.tsx`, replace the three dot cells (HOT/제휴/노출) with `StateBadge`:

```tsx
import { StateBadge } from "@/components/admin/StateBadge";
// ...
<TableCell><StateBadge on={program.is_hot} kind="hot" /></TableCell>
<TableCell><StateBadge on={program.is_affiliate} kind="affiliate" /></TableCell>
<TableCell><StateBadge on={program.is_visible} kind="visible" /></TableCell>
```

- [ ] **Step 11: Replace ●/○ in the special-pages list**

In `app/admin/(protected)/special-pages/page.tsx`, replace the 노출 cell with the effective badge (special pages have a show-window):

```tsx
import { EffectiveVisibilityBadge } from "@/components/admin/EffectiveVisibilityBadge";
import { effectiveSpecialPageVisibility } from "@/lib/visibility";
import { todayKST } from "@/lib/schedule";
// ...
<TableCell>
  <EffectiveVisibilityBadge state={effectiveSpecialPageVisibility(p, todayKST())} />
</TableCell>
```

- [ ] **Step 12: Verify and commit**

Run: `npx vitest run test/state-badge.test.tsx test/effective-visibility-badge.test.tsx && npx tsc --noEmit && npx eslint components/admin/StateBadge.tsx components/admin/EffectiveVisibilityBadge.tsx "app/admin/(protected)/events/page.tsx" "app/admin/(protected)/programs/page.tsx" "app/admin/(protected)/special-pages/page.tsx"`
Expected: pass / exit 0.

```bash
git add -A
git commit -m "feat(admin): accessible visibility badges replace ●/○ dots"
```

---

## Task 4: Grouped sidebar

**Files:**
- Create: `components/admin/AdminNav.tsx` (`"use client"`)
- Modify: `app/admin/(protected)/layout.tsx`
- Test: none (visual/nav; verified by tsc/eslint/build). Active-state logic is trivial and exercised manually in the verification gate.

**Interfaces:**
- Consumes: `usePathname` (`next/navigation`), `Button` (`@/components/ui/button`), `Link`.
- Produces: `<AdminNav />` — renders the 3 labeled groups with active-route indication.

- [ ] **Step 1: Create AdminNav**

Create `components/admin/AdminNav.tsx`:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const NAV_GROUPS = [
  { label: "콘텐츠", links: [
    { href: "/admin/programs", label: "프로그램" },
    { href: "/admin/events", label: "이벤트" },
    { href: "/admin/special-pages", label: "특수페이지" },
  ]},
  { label: "구조", links: [
    { href: "/admin/seasons", label: "시즌" },
    { href: "/admin/blind-structures", label: "블라인드 스트럭처" },
  ]},
  { label: "사이트 설정", links: [
    { href: "/admin/online-league", label: "온라인 리그" },
    { href: "/admin/settings", label: "설정" },
  ]},
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="관리자 메뉴" className="flex-1 px-2 py-4">
      {NAV_GROUPS.map((group) => (
        <section key={group.label} className="mb-5 last:mb-0">
          <h2 className="text-muted-foreground px-3 text-2xs font-semibold uppercase tracking-wider">
            {group.label}
          </h2>
          <ul className="mt-1 space-y-0.5">
            {group.links.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Button
                    asChild
                    variant="ghost"
                    className={
                      active
                        ? "bg-muted text-foreground border-primary w-full justify-start border-l-2"
                        : "text-muted-foreground hover:text-foreground w-full justify-start"
                    }
                  >
                    <Link href={href} aria-current={active ? "page" : undefined}>
                      {label}
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
```
Note: the `text-2xs` token already exists in `app/globals.css` (11px). If `npx tsc`/build reports it missing, fall back to `text-[length:var(--text-2xs)]` is NOT allowed — instead confirm the token and use `text-2xs`; if truly absent, use `text-xs`.

- [ ] **Step 2: Use AdminNav in the layout**

In `app/admin/(protected)/layout.tsx`, remove the `NAV_LINKS` const and the inline `<nav>…</nav>` block, import `{ AdminNav } from "@/components/admin/AdminNav"`, and render `<AdminNav />` in its place. Keep the brand header, the `<aside className="… w-56 …">`, and the email + `<SignOutButton />` footer exactly as-is. Remove the now-unused `Button` and `Link` imports if they're no longer referenced in the layout.

- [ ] **Step 3: Verify and commit**

Run: `npx tsc --noEmit && npx eslint components/admin/AdminNav.tsx "app/admin/(protected)/layout.tsx" && npm test`
Expected: exit 0 / green.

```bash
git add -A
git commit -m "feat(admin): grouped sidebar with active-route indication"
```

---

## Task 5: Real operator dashboard

**Files:**
- Modify: `app/admin/(protected)/page.tsx`
- Test: none (composition of already-tested data fns + pure `partitionEvents`; verified by tsc/eslint/build + gate)

**Interfaces:**
- Consumes: `getAllPrograms`, `getAllEvents`, `getAllSpecialPages` (`@/lib/data/*`), `getAllSeasons`, `getActiveSeason` (`@/lib/data/seasons`), `getAllStructures` (`@/lib/data/blindStructures`), `getEvents` (`@/lib/data/events`), `partitionEvents`/`todayKST` (`@/lib/schedule`), `Card`/`CardContent`/`CardHeader`/`CardTitle` (`@/components/ui/card`), `Button`, lucide icons.

- [ ] **Step 1: Rebuild the dashboard**

Replace `app/admin/(protected)/page.tsx` with the design from the spec (§A): active-season strip, 3 grouped card sections (콘텐츠/구조/사이트 설정) with counts, a 다가오는 이벤트 card, and a 라이브 사이트 card. Fetch all data in parallel:

```tsx
import Link from "next/link";
import { LayoutList, Target, FileText, CalendarRange, Layers, Radio, Settings, ExternalLink } from "lucide-react";
import { getAllPrograms } from "@/lib/data/programs";
import { getAllEvents, getEvents } from "@/lib/data/events";
import { getAllSpecialPages } from "@/lib/data/specialPages";
import { getAllSeasons, getActiveSeason } from "@/lib/data/seasons";
import { getAllStructures } from "@/lib/data/blindStructures";
import { partitionEvents, todayKST } from "@/lib/schedule";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminDashboard() {
  const [programs, allEvents, specialPages, seasons, structures, activeSeason, publicEvents] =
    await Promise.all([
      getAllPrograms(), getAllEvents(), getAllSpecialPages(),
      getAllSeasons(), getAllStructures(), getActiveSeason(), getEvents(),
    ]);
  const upcoming = partitionEvents(publicEvents, todayKST()).upcoming.slice(0, 4);

  const GROUPS = [
    { label: "콘텐츠", cards: [
      { href: "/admin/programs", Icon: LayoutList, title: "프로그램", count: programs.length, unit: "개", desc: "프로그램·요금·HOT 관리" },
      { href: "/admin/events", Icon: Target, title: "이벤트", count: allEvents.length, unit: "개", desc: "토너먼트 일정·상태 관리" },
      { href: "/admin/special-pages", Icon: FileText, title: "특수 페이지", count: specialPages.length, unit: "개", desc: "시리즈·랜딩 페이지" },
    ]},
    { label: "구조", cards: [
      { href: "/admin/seasons", Icon: CalendarRange, title: "시즌", count: seasons.length, unit: "개", desc: "시즌 생성·활성화" },
      { href: "/admin/blind-structures", Icon: Layers, title: "블라인드 스트럭처", count: structures.length, unit: "개", desc: "블라인드 템플릿 관리" },
    ]},
    { label: "사이트 설정", cards: [
      { href: "/admin/online-league", Icon: Radio, title: "온라인 리그", count: null, unit: "", desc: "리그 노출·상태" },
      { href: "/admin/settings", Icon: Settings, title: "설정", count: null, unit: "", desc: "사이트 전역 설정" },
    ]},
  ];

  const LIVE_LINKS = [
    { href: "/", label: "홈" }, { href: "/schedule", label: "일정" },
    { href: "/programs", label: "프로그램" }, { href: "/series", label: "시리즈" },
  ];

  return (
    <div>
      <h1 className="text-gold text-2xl font-bold">관리자 대시보드</h1>

      <Card className="mt-6">
        <CardContent className="flex items-center gap-2 py-3">
          <span className={`size-2 rounded-full ${activeSeason ? "bg-primary" : "bg-muted-foreground/40"}`} aria-hidden />
          <span className="sr-only">활성 시즌</span>
          <span className="text-muted-foreground text-sm">현재 활성 시즌</span>
          <span className="text-foreground font-medium">
            {activeSeason ? `${activeSeason.name} (${activeSeason.year})` : "없음"}
          </span>
        </CardContent>
      </Card>

      {GROUPS.map((group) => (
        <section key={group.label}>
          <h2 className="text-muted-foreground mb-3 mt-8 text-xs font-semibold uppercase tracking-wide">{group.label}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.cards.map((c) => (
              <Link key={c.href} href={c.href} className="group focus-visible:outline-none">
                <Card className="group-hover:border-primary/40 group-focus-visible:ring-ring/50 transition-colors group-focus-visible:ring-2">
                  <CardContent className="py-5">
                    <c.Icon className="text-muted-foreground group-hover:text-primary size-5" aria-hidden />
                    <p className="text-foreground mt-3 font-semibold">{c.title}</p>
                    <p className="text-primary mt-1 text-sm font-medium">
                      {c.count !== null ? `${c.title} ${c.count}${c.unit}` : "바로가기 →"}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">{c.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">다가오는 이벤트</CardTitle></CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">다가오는 이벤트가 없습니다.</p>
            ) : (
              <ul className="space-y-1">
                {upcoming.map((e) => (
                  <li key={e.id}>
                    <Link href={`/admin/events/${e.id}/edit`} className="hover:bg-muted/50 flex gap-3 rounded-md px-2 py-1.5">
                      <span className="text-muted-foreground text-sm tabular-nums">{e.date ?? "미정"}</span>
                      <span className="text-foreground text-sm">{e.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">라이브 사이트</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-1">
            {LIVE_LINKS.map((l) => (
              <Button key={l.href} asChild variant="ghost" size="sm" className="justify-start">
                <a href={l.href} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" aria-hidden /> {l.label}
                </a>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```
Confirm `CardHeader`/`CardTitle` are exported by `components/ui/card.tsx`; if not, add them per the shadcn card pattern in that file (they are part of standard shadcn card). Confirm `getAllStructures` is the correct export name in `lib/data/blindStructures.ts` (Explore confirmed `getAllStructures`).

- [ ] **Step 2: Verify and commit**

Run: `npx tsc --noEmit && npx eslint "app/admin/(protected)/page.tsx" && npm test`
Expected: exit 0 / green.

```bash
git add "app/admin/(protected)/page.tsx"
git commit -m "feat(admin): real operator dashboard with counts, upcoming events, live links"
```

---

## Task 6: "사이트에서 보기" links

**Files:**
- Create: `components/admin/ViewOnSiteLink.tsx`
- Modify: `app/admin/(protected)/events/page.tsx`, `programs/page.tsx`, `seasons/page.tsx`, `special-pages/page.tsx`, and the corresponding `[id]/edit` / `[slug]/edit` pages where a single entity is edited.
- Test: none (trivial link; verified by tsc/eslint)

**Interfaces:**
- Produces: `ViewOnSiteLink({ href, label }: { href: string; label?: string })` — an external link with the `ExternalLink` icon, opening in a new tab.

- [ ] **Step 1: Create the shared link component**

Create `components/admin/ViewOnSiteLink.tsx`:

```tsx
import { ExternalLink } from "lucide-react";

export function ViewOnSiteLink({ href, label = "사이트에서 보기" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs"
    >
      <ExternalLink className="size-3" aria-hidden />
      {label}
    </a>
  );
}
```

- [ ] **Step 2: Add per-row links on the list pages**

In each list page's 작업 cell, add a `ViewOnSiteLink` alongside the existing 수정/삭제 controls, using the correct public route shape (confirmed by Explore):
- events: `/schedule/${event.id}`
- programs: `/programs/${program.slug}`
- special-pages: `/${p.slug}` (served via the `[tabSlug]` catch-all)
- seasons: `/series` (all seasons surface on the single series page) — one link per row is acceptable; use label "시리즈에서 보기".

Example (events 작업 cell):
```tsx
<TableCell>
  <div className="flex items-center gap-3">
    <Button asChild variant="link" size="sm" className="h-auto p-0">
      <Link href={`/admin/events/${event.id}/edit`}>수정</Link>
    </Button>
    <ViewOnSiteLink href={`/schedule/${event.id}`} />
  </div>
</TableCell>
```

- [ ] **Step 3: Add a link on each edit page**

On the events/programs/seasons/special-pages edit pages (`[id]/edit` or `[slug]/edit`) — where a single existing entity is loaded — render a `ViewOnSiteLink` near the page heading pointing at that entity's public route. (Do NOT add it on the `new` pages — nothing to view yet.) Match each edit page's existing header markup; place the link to the right of or beneath the H1.

- [ ] **Step 4: Verify and commit**

Run: `npx tsc --noEmit && npx eslint components/admin/ViewOnSiteLink.tsx "app/admin/(protected)/events/page.tsx" "app/admin/(protected)/programs/page.tsx" "app/admin/(protected)/seasons/page.tsx" "app/admin/(protected)/special-pages/page.tsx" && npm test`
Expected: exit 0 / green.

```bash
git add -A
git commit -m "feat(admin): 사이트에서 보기 links on entity lists and edit pages"
```

---

## Task 7: Save-success toasts

**Files:**
- Create: `components/admin/SaveToast.tsx` (`"use client"`)
- Modify: `app/admin/(protected)/layout.tsx` (mount `<SaveToast/>` in Suspense), all save/delete actions in `app/admin/actions/*.ts` (append `?saved=1` / `?deleted=1` to `redirect()`), and the two non-redirecting actions (`onlineLeague.ts`, `siteConfig.ts`) gain a self-redirect.
- Test: none for the client flash (jsdom/searchParams flakiness not worth it); action redirect targets are covered by the verification gate.

**Interfaces:**
- Consumes: `useSearchParams`/`useRouter`/`usePathname` (`next/navigation`), `toast` (`sonner`).
- Produces: `<SaveToast />` — on mount, reads `?saved`/`?deleted`, fires the matching toast, then strips the param via `router.replace`.

- [ ] **Step 1: Create SaveToast**

Create `components/admin/SaveToast.tsx`:

```tsx
"use client";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function SaveToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const saved = params.get("saved");
    const deleted = params.get("deleted");
    if (!saved && !deleted) return;
    toast.success(deleted ? "삭제되었습니다" : "저장되었습니다");
    const next = new URLSearchParams(params);
    next.delete("saved");
    next.delete("deleted");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, router, pathname]);

  return null;
}
```

- [ ] **Step 2: Mount it in the layout (inside Suspense)**

`useSearchParams` requires a Suspense boundary. In `app/admin/(protected)/layout.tsx`, import `Suspense` from `react` and `{ SaveToast } from "@/components/admin/SaveToast"`, and render near `<Toaster/>`:

```tsx
<Suspense fallback={null}><SaveToast /></Suspense>
```

- [ ] **Step 3: Append flash params to redirecting actions**

In every action that ends with `redirect("/admin/<area>")` after a successful create/update, change the target to include `?saved=1`; for delete actions use `?deleted=1`. Files and the exact redirect calls (from Explore):
- `events.ts`: create/update → `redirect("/admin/events?saved=1")`; delete → `redirect("/admin/events?deleted=1")`.
- `programs.ts`: same pattern for `/admin/programs`.
- `seasons.ts`: create/update → `?saved=1`; delete → `?deleted=1`; `activateSeason` → `redirect("/admin/seasons?saved=1")`.
- `specialPages.ts`: same pattern for `/admin/special-pages`.
- `tabs.ts`: same pattern for `/admin/tabs` (even though hidden from nav, keep consistent).
- `blindStructures.ts`: `saveStructure` → `/admin/blind-structures?saved=1`; `duplicateStructure` → keep its `/edit` target but append `?saved=1`; `deleteStructure` → `?deleted=1`.

Leave the `revalidatePublic(...)` calls exactly as they are; only the `redirect()` string changes.

- [ ] **Step 4: Self-redirect the two non-redirecting actions**

`app/admin/actions/onlineLeague.ts` (`updateOnlineLeague`) and `app/admin/actions/siteConfig.ts` (`updateSiteConfig`) currently `revalidatePublic(...)` and return without redirecting. Add `import { redirect } from "next/navigation";` and end each with `redirect("/admin/online-league?saved=1")` / `redirect("/admin/settings?saved=1")` respectively (after the revalidate). This gives the operator the same save confirmation as every other form. (Server-action `redirect()` to the same path re-renders the page with the flash param — the documented pattern.)

- [ ] **Step 5: Verify and commit**

Run: `npx tsc --noEmit && npx eslint components/admin/SaveToast.tsx "app/admin/(protected)/layout.tsx" app/admin/actions/events.ts app/admin/actions/programs.ts app/admin/actions/seasons.ts app/admin/actions/specialPages.ts app/admin/actions/tabs.ts app/admin/actions/blindStructures.ts app/admin/actions/onlineLeague.ts app/admin/actions/siteConfig.ts && npm test`
Expected: exit 0 / green.

```bash
git add -A
git commit -m "feat(admin): save-success toasts via redirect flash params"
```

---

## Verification Gate (run after all tasks; manual + automated)

- `npm test` green; `npx tsc --noEmit` clean; `npx eslint .` (or the touched files) 0 warnings; `npm run build` succeeds.
- Save any form → bottom-right "저장되었습니다" toast; delete → "삭제되었습니다".
- Each entity row/edit page has a working "사이트에서 보기" link to the correct public route.
- A `status="hidden"` event shows the amber "노출 안 됨 · 숨김 상태" badge in admin AND no longer appears on the public `/schedule`. A special page past its `end_show_date` shows "노출 안 됨 · 기간 종료".
- Screen reader announces visibility state (badge `aria-label`), not a bare dot.
- Sidebar shows 3 labeled groups; the active route is indicated (gold left rule + `aria-current`).
- Dashboard shows correct counts, the active season, up to 4 upcoming events, and live-site links.

## Test Strategy (per spec §8 Phase 3)

The binding automated coverage is `test/visibility.test.ts`: the shared "유효 노출" predicate returns the correct reason for is_visible-off / status=hidden / window-before / window-after / live, and `isEventPublic`/`isSpecialPagePublic` gate exactly on `live`. The same functions are imported by both the public routes (Task 2) and the admin badges (Task 3), satisfying the "공개 라우트와 동일 함수" requirement. Badge tests assert accessible names + visible text (not color). Everything else is composition of already-tested data functions and is covered by the manual gate + build.
