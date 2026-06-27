# Admin Phase 6 — Integration Sweep & Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close the one real functional gap surfaced by the integration review (can't un-assign a Select-backed FK), fix the remaining a11y/usability bugs, and clear the accumulated cleanup backlog from Phases 3–5 — leaving the admin polished and consistent.

**Architecture:** Mostly mechanical fixes across existing admin components/pages. The only write-behavior change is Task 1 (FK "없음" unset), which gets a round-trip test. The rest are a11y attributes, token compliance, dead-code removal, a loading skeleton, and a shared-constant extraction.

**Tech Stack:** Next.js App Router, RSC + Server Actions, Tailwind v4 + shadcn, Vitest (jsdom, no DB).

## Global Constraints

- Import alias `@/` only. Admin uses shadcn primitives + the shadcn token layer; design tokens only (no inline `style` colors, no hardcoded hex). Korean copy for operator-facing strings.
- `SelectItem` value must be non-empty → use a `"none"` sentinel, and the server action maps `"none"` → null (never write the literal string into a uuid FK column).
- No behavior change beyond Task 1's FK-unset (which is the intended fix). No public-site change.
- Tests pure jsdom (no DB). `npm test` green, `tsc` clean, eslint 0 warnings on changed files.

## File Structure

**Create:** `lib/program-sanitize.ts` (shared marked/sanitize config), `app/admin/(protected)/loading.tsx` (skeleton).
**Modify:** `components/admin/EventForm.tsx`, `components/admin/SpecialPageForm.tsx`, `app/admin/actions/events.ts`, `app/admin/actions/specialPages.ts`, `components/admin/BlockEditor.tsx`, `components/admin/ViewOnSiteLink.tsx`, `components/admin/SeasonFilterSelect.tsx`, `app/admin/(protected)/page.tsx`, the admin `*/new/page.tsx` + `*/[id]/edit/page.tsx` H1s, `lib/data/events.ts`, `lib/types.ts`, `test/backfill-parity.test.ts`, `app/(site)/programs/[slug]/page.tsx`, `components/program/ProgramBlocks.tsx`, `app/admin/(protected)/programs/[id]/edit/page.tsx`.

---

## Task 1: FK "없음" unset (season_id + blind_structure_id)

**Files:**
- Modify: `components/admin/EventForm.tsx`, `components/admin/SpecialPageForm.tsx`, `app/admin/actions/events.ts`, `app/admin/actions/specialPages.ts`
- Test: `test/fk-unset.test.tsx` (new) — round-trip render test

**Problem:** The `season_id` (EventForm) and `blind_structure_id` (EventForm + SpecialPageForm) Radix `Select`s have no "없음" item; once a value is saved, the placeholder no longer shows and there is no UI path back to null. Radix cannot emit an empty value.

**Interfaces:** the action FK reader maps `"none"` → null.

- [ ] **Step 1: Write the failing test** — `test/fk-unset.test.tsx`: render `EventForm` with `event={{ season_id: "S1", ... }}` and assert a `없음` option exists in the season select; render with `season_id: null` and assert the trigger shows the placeholder. (Use `getAllByText`/`getByText`; Radix renders under jsdom via test/setup polyfills. Keep it a focused render assertion — the value→null mapping is asserted by reading the rendered option, since actions aren't unit-testable without a DB.) Also a pure-helper test if you extract the mapping (see Step 3).

- [ ] **Step 2: Add the sentinel item to each select.** In `EventForm.tsx` season_id select and blind_structure_id select, and `SpecialPageForm.tsx` blind_structure_id select, add as the FIRST item:
```tsx
<SelectItem value="none">없음</SelectItem>
```
And set the Select `defaultValue={event?.season_id ?? "none"}` (and likewise `?? "none"` for blind_structure_id) so an already-null value shows "없음" selected and an operator can switch back to it. Keep the existing real options after the sentinel.

- [ ] **Step 3: Map `"none"` → null in the actions.** In `app/admin/actions/events.ts` and `app/admin/actions/specialPages.ts`, add a small FK reader and use it for `season_id`/`blind_structure_id`:
```ts
const fk = (k: string) => { const v = s(k); return v === "none" ? null : v; };
```
Replace `season_id: s("season_id")` → `season_id: fk("season_id")` and `blind_structure_id: s("blind_structure_id")` → `blind_structure_id: fk("blind_structure_id")` in BOTH the create and update parse paths of each action. (Optionally extract `fk`/the mapping into a tiny exported pure helper and unit-test `mapNoneToNull("none") === null` / passes through a uuid — your call; if extracted, test it.)

- [ ] **Step 4: Run tests + verify** — `npx vitest run test/fk-unset.test.tsx`, `npx tsc --noEmit`, `npx eslint` on the 4 files. Confirm: sentinel present, null shows "없음", actions map "none"→null so a cleared FK round-trips to null (not the literal string).

- [ ] **Step 5: Commit** — `git commit -m "fix(admin): allow clearing season/blind-structure FKs via 없음 option"`

---

## Task 2: Accessibility fixes

**Files:** Modify `components/admin/BlockEditor.tsx`, `components/admin/ViewOnSiteLink.tsx`, `app/admin/(protected)/page.tsx`, `components/admin/SeasonFilterSelect.tsx`. Test: none new (attribute additions; existing tests stay green).

- [ ] **Step 1:** `BlockEditor.tsx` — the run hyperlink toggle button (the bare `🔗` button) gets `aria-label="링크"`. Confirm the emoji stays `aria-hidden` or is inside the labeled button (the `aria-label` overrides the accessible name regardless).
- [ ] **Step 2:** `ViewOnSiteLink.tsx` — add a visually-hidden new-tab cue inside the link: `<span className="sr-only">(새 창)</span>` (the link already has `target="_blank" rel="noopener noreferrer"`).
- [ ] **Step 3:** `app/admin/(protected)/page.tsx` — the 라이브 사이트 links open `target="_blank"`; add the same `<span className="sr-only">(새 창)</span>` to each.
- [ ] **Step 4:** `SeasonFilterSelect.tsx` — `SelectTrigger` gets `aria-label="시즌 필터"`.
- [ ] **Step 5:** `npx tsc --noEmit` + `npx eslint` the 4 files + `npm test` green. Commit `a11y(admin): accessible names for link toggle, new-tab links, season filter`.

---

## Task 3: Dashboard polish

**Files:** Modify `app/admin/(protected)/page.tsx`. Test: none (cosmetic).

- [ ] **Step 1:** Fix the count line that repeats the title. The card renders `c.title` as the heading and then `` `${c.title} ${c.count}${c.unit}` `` below it → "프로그램" / "프로그램 5개". Change the count expression to `` `${c.count}${c.unit}` `` (e.g. "5개"); keep the `"바로가기 →"` branch for null-count cards.
- [ ] **Step 2:** Remove the redundant `<span className="sr-only">활성 시즌</span>` in the active-season strip (the visible text "현재 활성 시즌" already conveys it; the dot is `aria-hidden`).
- [ ] **Step 3:** `npx tsc --noEmit` + `npx eslint` + `npm test`. Commit `fix(admin): dashboard count line + redundant sr-only`.

---

## Task 4: Design-token compliance (admin H1s + danger zones)

**Files:** Modify the admin `*/new/page.tsx` and `*/[id]/edit/page.tsx` headings. Test: none.

- [ ] **Step 1:** Replace every `style={{ color: "var(--color-gold)" }}` admin H1 with `className="text-gold ..."` (the `text-gold` token exists). Pages (per the review): events/new, events/[id]/edit, programs/new, programs/[id]/edit, special-pages/new, special-pages/[id]/edit, seasons/new, seasons/[id]/edit, blind-structures/new, blind-structures/[id]/edit, tabs/new, tabs/[id]/edit. (Grep `style={{ color: "var(--color-gold)"` to find all; match each page's existing H1 size/weight classes.)
- [ ] **Step 2:** Convert the "위험 구역" blocks' inline `style` (in events/[id]/edit, programs/[id]/edit, seasons/[id]/edit) to Tailwind utilities + tokens (e.g. `mt-8 pt-6 border-t border-border` and `text-muted-foreground text-xs`). Preserve the visual intent; no behavior change.
- [ ] **Step 3:** Grep to confirm no `style={{ color: "var(--color-gold)"` remains under `app/admin`. `npx tsc --noEmit` + `npx eslint` changed files + `npm test`. Commit `style(admin): tokenize edit/new H1s and danger-zone blocks`.

---

## Task 5: Dead-code & micro-correctness

**Files:** Modify `components/admin/BlockEditor.tsx`, `lib/data/events.ts`, `lib/types.ts`, `test/backfill-parity.test.ts`, and optionally `components/ui/badge.tsx` + `components/ui/sonner.tsx`. Test: existing stay green.

- [ ] **Step 1:** `BlockEditor.tsx` — remove the dead `<input type="hidden" name={\`block_image_${imgIdx}_src\`} …>` (the action reads `block.src` from the serialized JSON, never this input). Confirm by grepping the actions for `_src`.
- [ ] **Step 2:** `lib/data/events.ts` `getEvents` — run the events query and `getActiveSeason()` concurrently via `Promise.all` (currently sequential). Keep the existing filter order (`isEventPublic` then `filterByActiveSeason`).
- [ ] **Step 3:** `lib/types.ts` — hoist the mid-file `import type { Block } from "@/lib/program-blocks"` to the top with the other imports.
- [ ] **Step 4:** `test/backfill-parity.test.ts` — change the `it.each` title `%s` → `$slug`.
- [ ] **Step 5 (only if trivially safe):** `components/ui/badge.tsx` base `rounded-4xl` → `rounded-pill` (the project pill token); add the missing blank line after `"use client"` in `components/ui/sonner.tsx`. Skip if it risks visual regression on existing badges — these are cosmetic.
- [ ] **Step 6:** `npx tsc --noEmit` + `npx eslint` changed files + `npm test` (the parity test still passes). Commit `chore(admin): remove dead input, parallelize getEvents, import + test cleanups`.

---

## Task 6: Admin loading skeleton

**Files:** Create `app/admin/(protected)/loading.tsx`. Test: none.

- [ ] **Step 1:** Add `app/admin/(protected)/loading.tsx` — a simple skeleton shown during admin route data fetches (the dashboard fires 7 parallel queries; edit pages await data). Use shadcn tokens: a heading shimmer + a few `bg-muted animate-pulse rounded-md` card/table-row shells inside the main content area. Keep it generic (it covers all admin routes). No `"use client"` needed (it's a Server Component fallback).
- [ ] **Step 2:** `npx tsc --noEmit` + `npx eslint app/admin/\(protected\)/loading.tsx` + `npm test`. Commit `feat(admin): loading skeleton for admin routes`.

---

## Task 7: Extract shared SANITIZE_CONFIG

**Files:** Create `lib/program-sanitize.ts`; modify `app/(site)/programs/[slug]/page.tsx`, `components/program/ProgramBlocks.tsx`, `app/admin/(protected)/programs/[id]/edit/page.tsx`. Test: none (pure refactor; render tests stay green).

- [ ] **Step 1:** Create `lib/program-sanitize.ts` exporting `PROGRAM_SANITIZE_CONFIG` — the exact sanitize-html options object currently duplicated (allowedTags incl. img/h1/h2; a: href/name/target/rel; img: src/alt/title/width/height; schemes http/https/mailto). Also export a small `renderProgramMarkdown(description: string): Promise<string>` if it reduces duplication (optional) — otherwise just the config.
- [ ] **Step 2:** Replace the three inline config copies with imports of `PROGRAM_SANITIZE_CONFIG`. Confirm the object is byte-identical to what was there (do not change sanitize behavior).
- [ ] **Step 3:** `npx tsc --noEmit` + `npx eslint` the 4 files + `npm test` (ProgramBlocks render test + any program tests still pass). Commit `refactor: extract shared PROGRAM_SANITIZE_CONFIG`.

---

## Verification Gate (after all tasks)

- `npm test` green; `tsc` clean; eslint 0 warnings on changed files; `npm run build` succeeds (or note remote-DB-only failures).
- An event/special-page with a season/blind-structure assigned can be cleared back to "없음" and the action writes null (not the string "none").
- Block-editor link toggle, view-on-site links, and the season filter have accessible names; new-tab links announce "(새 창)".
- Dashboard cards show "5개" (not "프로그램 5개"); no duplicate sr-only on the season strip.
- No `style={{ color: "var(--color-gold)" }}` remains under `app/admin`; danger zones use tokens.
- An admin loading skeleton appears on slow navigations; `SANITIZE_CONFIG` lives in one module.

## Test Strategy

The only write-behavior change (Task 1 FK unset) gets the round-trip render test + (if the mapping is extracted) a pure `mapNoneToNull` unit test. Everything else is attribute/token/dead-code/refactor verified by tsc + eslint + the existing suite staying green (the parity, conservation, badge, and render tests must remain passing).
