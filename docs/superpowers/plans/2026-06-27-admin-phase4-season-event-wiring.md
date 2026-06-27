# Admin Phase 4 — Season ↔ Event Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make "activate a season → that season's events drive the home/schedule boards" real and safe, with null-season events always shown (evergreen) so nothing silently disappears.

**Architecture:** A pure `filterByActiveSeason(events, activeSeasonId)` predicate becomes the season gate; `getEvents()` calls it after the existing public-visibility filter. A pure `assignSeasonByDate(event, seasons)` backs an idempotent, null-only backfill script. Admin gains a season column + filter on the events list and an event-count on the seasons list. The dead season fields `theme_color`/`footer_sponsor_visible` are removed from the code (DB columns left intact, reversible).

**Tech Stack:** Next.js App Router (modified — read `node_modules/next/dist/docs/` before route work), RSC + Server Actions, Supabase, Tailwind v4 + shadcn, Vitest (jsdom, no DB).

## Live-data findings (verified against prod 2026-06-27 — these de-risk the phase)

- **1 season:** "DONUTS SERIES 2026 · SPRING SEASON", code=spring, year=2026, **active**, window `2026-05-16 ~ 2026-07-19`.
- **26 events, ALL already assigned to that active season.** `season_id` NULL: **0**. Assigned to a non-active season: **0**. All 26 have a real `YYYY-MM-DD` date.
- **Therefore:** the backfill has nothing to fill (it is a verified no-op on current data), and turning filtering on removes **zero** events from the boards (all 26 are in the active season). The evergreen + no-active-season safety below is belt-and-suspenders for the future.

## Global Constraints

- Import alias `@/` only. Default to Server Components; `"use client"` only when necessary.
- **One source of truth:** the season gate is the single pure `filterByActiveSeason`; both the public board path (`getEvents`) and any season-count/admin logic reason from the same `season_id` semantics. No forked filtering.
- **Evergreen safety (user-chosen, governs over a strict reading of the spec):** an event with `season_id == null` is ALWAYS shown. And when there is **no active season** (`activeSeasonId == null`), `filterByActiveSeason` returns **all** events (does NOT empty the boards). When there IS an active season, boards show `season_id === activeSeasonId` ∪ `season_id == null`; events assigned to a *non-active* season are dropped from boards (their detail pages stay reachable).
- **Backfill is conservative & idempotent:** assigns a season to an event ONLY when the event's date falls in exactly one season's `[start_date, end_date]` window; ambiguous (0 or >1 match) or missing dates → leave `null`. Touches ONLY rows where `season_id IS NULL` (never overwrites an operator-set value). Default dry-run; writes only with `--apply`.
- **Dead-field removal is code-only:** remove `theme_color`/`footer_sponsor_visible` from the TS type, mapper, action, and form. Do NOT drop the DB columns (leave them; reversible). Confirm zero public consumers before removing (verified, but the implementer re-greps).
- Public rendering may change ONLY as the season gate dictates. `getAllEvents()` (admin) stays unfiltered.
- Tests are pure jsdom units (no DB). `npm test` green, `tsc` clean, `eslint` 0 warnings on changed files.
- Korean copy for operator-facing strings. Design tokens only; admin uses shadcn primitives.

## File Structure

**Create:**
- `lib/season-rules.ts` — pure `filterByActiveSeason` + `assignSeasonByDate`.
- `test/season-rules.test.ts` — unit tests for both.
- `scripts/backfill-event-seasons.mjs` — idempotent null-only backfill (operational; run by the controller).
- `components/admin/SeasonFilterSelect.tsx` — `"use client"` select that sets `?season=` on the events list.

**Modify:**
- `lib/data/events.ts` — `getEvents()` applies the season gate.
- `app/admin/(protected)/events/page.tsx` — season column + filter.
- `app/admin/(protected)/seasons/page.tsx` — "N개 이벤트" count column.
- `lib/types.ts` — drop `theme_color`/`footer_sponsor_visible` from `Season`.
- `lib/data/seasons.ts` — drop the two fields from `mapSeason`.
- `app/admin/actions/seasons.ts` — drop the two fields from `parse`.
- `components/admin/SeasonForm.tsx` — remove the two inputs.

---

## Task 1: Pure season rules + tests

**Files:**
- Create: `lib/season-rules.ts`, `test/season-rules.test.ts`
- Test: `test/season-rules.test.ts`

**Interfaces:**
- Consumes: `Event`, `Season` from `@/lib/types`.
- Produces:
  - `filterByActiveSeason(events: Event[], activeSeasonId: string | null): Event[]`
  - `assignSeasonByDate(event: Pick<Event,"date">, seasons: Pick<Season,"id"|"start_date"|"end_date">[]): string | null`

- [ ] **Step 1: Write the failing test** — `test/season-rules.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { filterByActiveSeason, assignSeasonByDate } from "@/lib/season-rules";
import type { Event, Season } from "@/lib/types";

const ev = (id: string, season_id: string | null, date = "2026-06-01"): Event =>
  ({ id, season_id, date, title: id } as Event);

describe("filterByActiveSeason", () => {
  const events = [ev("a", "S1"), ev("b", null), ev("c", "S2"), ev("d", "S1")];
  it("keeps active-season events and null (evergreen), drops other seasons", () => {
    const out = filterByActiveSeason(events, "S1");
    expect(out.map((e) => e.id)).toEqual(["a", "b", "d"]);
  });
  it("returns ALL events when there is no active season (does not empty boards)", () => {
    const out = filterByActiveSeason(events, null);
    expect(out.map((e) => e.id)).toEqual(["a", "b", "c", "d"]);
  });
  it("preserves input order", () => {
    expect(filterByActiveSeason(events, "S2").map((e) => e.id)).toEqual(["b", "c"]);
  });
});

describe("assignSeasonByDate", () => {
  const seasons: Pick<Season, "id" | "start_date" | "end_date">[] = [
    { id: "spring", start_date: "2026-03-01", end_date: "2026-05-31" },
    { id: "summer", start_date: "2026-06-01", end_date: "2026-08-31" },
    { id: "nodates", start_date: null, end_date: null },
  ];
  it("assigns the single season whose window contains the date", () => {
    expect(assignSeasonByDate({ date: "2026-07-15" }, seasons)).toBe("summer");
  });
  it("is inclusive of window boundaries", () => {
    expect(assignSeasonByDate({ date: "2026-06-01" }, seasons)).toBe("summer");
    expect(assignSeasonByDate({ date: "2026-05-31" }, seasons)).toBe("spring");
  });
  it("returns null when no window contains the date", () => {
    expect(assignSeasonByDate({ date: "2026-01-01" }, seasons)).toBeNull();
  });
  it("returns null on ambiguous overlap (>1 match)", () => {
    const overlap = [
      { id: "x", start_date: "2026-06-01", end_date: "2026-07-01" },
      { id: "y", start_date: "2026-06-15", end_date: "2026-07-15" },
    ];
    expect(assignSeasonByDate({ date: "2026-06-20" }, overlap)).toBeNull();
  });
  it("returns null for an undated event or a season missing dates", () => {
    expect(assignSeasonByDate({ date: null }, seasons)).toBeNull();
    expect(assignSeasonByDate({ date: "2026-06-01" }, [{ id: "z", start_date: null, end_date: null }])).toBeNull();
  });
  it("matches only the YYYY-MM-DD prefix of a longer date string", () => {
    expect(assignSeasonByDate({ date: "2026-07-15 (수)" }, seasons)).toBe("summer");
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run test/season-rules.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement** — `lib/season-rules.ts`:

```ts
import type { Event, Season } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * Pure season rules. The board gate and the backfill assignment are
 * both pure so they can be unit-tested without a DB. Dates are
 * "YYYY-MM-DD" strings compared lexically (same convention as
 * lib/schedule.ts).
 * ------------------------------------------------------------------ */

const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;
function dateKey(date: string | null): string | null {
  const m = DATE_PREFIX.exec(date ?? "");
  return m ? m[1] : null;
}

/**
 * The public board gate. An event shows when it belongs to the active
 * season OR has no season (evergreen). When there is no active season,
 * everything shows — boards must never silently empty.
 */
export function filterByActiveSeason(events: Event[], activeSeasonId: string | null): Event[] {
  if (activeSeasonId == null) return events;
  return events.filter((e) => e.season_id === activeSeasonId || e.season_id == null);
}

/**
 * Backfill assignment: the single season whose [start_date, end_date]
 * window (inclusive) contains the event's date, else null. Ambiguous
 * (0 or >1) and missing dates → null (conservative; leave evergreen).
 */
export function assignSeasonByDate(
  event: Pick<Event, "date">,
  seasons: Pick<Season, "id" | "start_date" | "end_date">[]
): string | null {
  const d = dateKey(event.date);
  if (!d) return null;
  const matches = seasons.filter(
    (s) => s.start_date != null && s.end_date != null && d >= s.start_date && d <= s.end_date
  );
  return matches.length === 1 ? matches[0].id : null;
}
```

- [ ] **Step 4: Run, verify pass** — `npx vitest run test/season-rules.test.ts` → PASS.

- [ ] **Step 5: Verify + commit**

```bash
npx tsc --noEmit && npx eslint lib/season-rules.ts test/season-rules.test.ts
git add lib/season-rules.ts test/season-rules.test.ts
git commit -m "feat(seasons): pure season gate + date-window backfill rule"
```

---

## Task 2: Idempotent backfill script (operational)

**Files:**
- Create: `scripts/backfill-event-seasons.mjs`
- Test: none (the assignment logic is unit-tested in Task 1; this script is the operational shell, run by the controller)

**Interfaces:**
- Consumes: `assignSeasonByDate` (re-implemented inline in the .mjs since the script is plain ESM outside the TS build — keep it byte-for-byte equivalent to `lib/season-rules.ts` and reference that file in a comment as the source of truth).

- [ ] **Step 1: Write the script** — `scripts/backfill-event-seasons.mjs`. It loads `.env.local`, reads non-deleted seasons + events with `season_id IS NULL`, computes assignments, prints a dry-run report, and writes ONLY with `--apply`:

```js
// Idempotent, null-only backfill of events.season_id by date window.
// Assignment rule mirrors lib/season-rules.ts assignSeasonByDate (source of truth).
// Usage: node scripts/backfill-event-seasons.mjs           (dry-run)
//        node scripts/backfill-event-seasons.mjs --apply    (write)
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;
const dateKey = (d) => (DATE_PREFIX.exec(d ?? "")?.[1] ?? null);
function assignSeasonByDate(date, seasons) {
  const d = dateKey(date);
  if (!d) return null;
  const matches = seasons.filter(
    (s) => s.start_date != null && s.end_date != null && d >= s.start_date && d <= s.end_date
  );
  return matches.length === 1 ? matches[0].id : null;
}

const apply = process.argv.includes("--apply");
const { data: seasons } = await sb.from("seasons").select("id,name,start_date,end_date").is("deleted_at", null);
const { data: events } = await sb
  .from("events").select("id,title,date,season_id").is("deleted_at", null).is("season_id", null);

console.log(`seasons: ${seasons.length}, null-season events: ${events.length}`);
const plan = [];
for (const e of events) {
  const sid = assignSeasonByDate(e.date, seasons);
  if (sid) plan.push({ id: e.id, title: e.title, date: e.date, season_id: sid });
}
console.log(`would assign: ${plan.length} (the remaining ${events.length - plan.length} stay null/evergreen)`);
for (const p of plan) console.log(`  ${p.date} | ${p.title} -> ${p.season_id}`);

if (!apply) { console.log("\nDRY-RUN. Re-run with --apply to write."); process.exit(0); }
for (const p of plan) {
  const { error } = await sb.from("events").update({ season_id: p.season_id }).eq("id", p.id);
  if (error) { console.error("update failed", p.id, error); process.exit(1); }
}
console.log(`applied ${plan.length} updates.`);
```

- [ ] **Step 2: Verify it parses + lints** — `npx eslint scripts/backfill-event-seasons.mjs` (0 warnings; the repo eslint may not cover `scripts/` — if so, just `node --check scripts/backfill-event-seasons.mjs`).

- [ ] **Step 3: Commit**

```bash
git add scripts/backfill-event-seasons.mjs
git commit -m "chore(seasons): idempotent null-only season backfill script"
```

> **Controller note (not a subagent step):** after this task, run `node scripts/backfill-event-seasons.mjs` (dry-run) — on current prod data it reports 0 null-season events and writes nothing. No `--apply` needed now; the script exists for future events created without a season.

---

## Task 3: Activate the season gate in getEvents

**Files:**
- Modify: `lib/data/events.ts`
- Test: none new (the gate is unit-tested in Task 1; this is the integration wiring)

**Interfaces:**
- Consumes: `filterByActiveSeason` (`@/lib/season-rules`), `getActiveSeason` (`@/lib/data/seasons`).

- [ ] **Step 1: Wire the gate** — in `lib/data/events.ts`, `getEvents()` currently ends `return (data ?? []).map(mapEvent).filter(isEventPublic);`. Fetch the active season and apply the gate:

```ts
import { filterByActiveSeason } from "@/lib/season-rules";
import { getActiveSeason } from "@/lib/data/seasons";
// ...inside getEvents, after the query:
  const active = await getActiveSeason();
  const events = (data ?? []).map(mapEvent).filter(isEventPublic);
  return filterByActiveSeason(events, active?.id ?? null);
```
Keep the existing DB query, `is_visible` filter, ordering, and the `isEventPublic` pass unchanged. `getAllEvents()` and `getEventById()` stay untouched (admin + detail pages must not be season-gated).

- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit && npx eslint lib/data/events.ts && npm test
git add lib/data/events.ts
git commit -m "feat(seasons): gate public event boards by active season (evergreen-safe)"
```

---

## Task 4: Admin events list — season column + filter

**Files:**
- Create: `components/admin/SeasonFilterSelect.tsx` (`"use client"`)
- Modify: `app/admin/(protected)/events/page.tsx`
- Test: none (server composition + a thin client select; verified by tsc/eslint/gate)

**Interfaces:**
- Consumes: `getAllEvents`, `getAllSeasons`, shadcn `Select`, `useRouter` (`next/navigation`).

- [ ] **Step 1: Create the filter select** — `components/admin/SeasonFilterSelect.tsx`:

```tsx
"use client";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Season } from "@/lib/types";

export function SeasonFilterSelect({ seasons, value }: { seasons: Season[]; value: string }) {
  const router = useRouter();
  return (
    <Select value={value} onValueChange={(v) => router.push(v === "all" ? "/admin/events" : `/admin/events?season=${v}`)}>
      <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">전체 시즌</SelectItem>
        <SelectItem value="none">미배정 (상시노출)</SelectItem>
        {seasons.map((s) => (
          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Wire the events list page** — `app/admin/(protected)/events/page.tsx`. Make it read `searchParams` (a Promise in this Next version — mirror `app/(site)/schedule/page.tsx`), load seasons, build an id→name map, filter the rows, add a 시즌 column, and render the filter above the table:

```tsx
import { getAllSeasons } from "@/lib/data/seasons";
import { SeasonFilterSelect } from "@/components/admin/SeasonFilterSelect";
// ...
export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const [events, seasons, sp] = await Promise.all([getAllEvents(), getAllSeasons(), searchParams]);
  const seasonName = new Map(seasons.map((s) => [s.id, s.name]));
  const filter = sp.season ?? "all";
  const rows = events.filter((e) =>
    filter === "all" ? true : filter === "none" ? e.season_id == null : e.season_id === filter
  );
  // header row: add <TableHead>시즌</TableHead> between 제목 and 상태
  // body row: add <TableCell className="text-muted-foreground">{event.season_id ? seasonName.get(event.season_id) ?? "—" : "미배정"}</TableCell>
  // empty-state colSpan: bump to match the new column count
  // above <Table>: <SeasonFilterSelect seasons={seasons} value={filter} /> in the header flex row (or a row beneath the H1)
}
```
Use `rows` instead of `events` in the `.map` and the empty-state condition. Increment the empty-state `colSpan` to the new total column count (currently 5 after Phase 3 added the badge: 제목/상태/노출/작업 → confirm the exact current count by reading the file, then +1 for 시즌). Place the `SeasonFilterSelect` where it reads cleanly (e.g. a `mb-4` row under the H1/＋버튼 header).

- [ ] **Step 3: Verify + commit**

```bash
npx tsc --noEmit && npx eslint "app/admin/(protected)/events/page.tsx" components/admin/SeasonFilterSelect.tsx && npm test
git add -A
git commit -m "feat(admin): season column + season filter on events list"
```

---

## Task 5: Seasons list — event count

**Files:**
- Modify: `app/admin/(protected)/seasons/page.tsx`
- Test: none (server composition; verified by tsc/eslint/gate)

**Interfaces:**
- Consumes: `getAllEvents` (`@/lib/data/events`) in addition to the existing seasons fetch.

- [ ] **Step 1: Add the count column** — in `app/admin/(protected)/seasons/page.tsx`, also fetch all events, count by `season_id`, and render a "N개 이벤트" column. Read the current file first to match its table structure (it has 이름/코드/연도/활성/작업 + the Phase-3 ViewOnSiteLink):

```tsx
import { getAllEvents } from "@/lib/data/events";
// ...
const [seasons, events] = await Promise.all([getAllSeasons(), getAllEvents()]);
const countBySeason = new Map<string, number>();
for (const e of events) if (e.season_id) countBySeason.set(e.season_id, (countBySeason.get(e.season_id) ?? 0) + 1);
// add <TableHead>이벤트</TableHead> (before 활성) and a cell: {countBySeason.get(season.id) ?? 0}개
// bump the empty-state colSpan by 1
```

- [ ] **Step 2: Verify + commit**

```bash
npx tsc --noEmit && npx eslint "app/admin/(protected)/seasons/page.tsx" && npm test
git add "app/admin/(protected)/seasons/page.tsx"
git commit -m "feat(admin): event count per season on seasons list"
```

---

## Task 6: Remove dead season fields (code-only)

**Files:**
- Modify: `lib/types.ts`, `lib/data/seasons.ts`, `app/admin/actions/seasons.ts`, `components/admin/SeasonForm.tsx`
- Test: none new (existing season tests must stay green)

**Interfaces:**
- Produces: a `Season` type without `theme_color`/`footer_sponsor_visible`.

- [ ] **Step 1: Confirm zero public consumers** — re-grep to be safe:

```bash
grep -rn "theme_color\|footer_sponsor_visible" app components lib --include="*.ts" --include="*.tsx"
```
Expected: matches ONLY in the four files being edited (types, mapSeason, seasons action, SeasonForm) — NO `app/(site)/**` or other component renders them. If any public consumer appears, STOP and report (the field is not actually dead).

- [ ] **Step 2: Remove from the type** — `lib/types.ts`, `Season` interface: delete `theme_color: string | null;` and `footer_sponsor_visible: boolean;`.

- [ ] **Step 3: Remove from the mapper** — `lib/data/seasons.ts` `mapSeason`: delete the `theme_color` and `footer_sponsor_visible` lines. (The DB still returns the columns from `select("*")`; we simply stop mapping them — harmless.)

- [ ] **Step 4: Remove from the action** — `app/admin/actions/seasons.ts` `parse()`: delete the `theme_color` and `footer_sponsor_visible` keys so they are no longer written on insert/update. (The DB columns keep their existing values; they are just no longer updated.)

- [ ] **Step 5: Remove from the form** — `components/admin/SeasonForm.tsx`: delete the 테마 색상 `Input` block and the 푸터 스폰서 표시 `Checkbox` block (and any now-unused `Checkbox` import if it's the only use — check).

- [ ] **Step 6: Verify + commit**

```bash
npx tsc --noEmit && npx eslint lib/types.ts lib/data/seasons.ts app/admin/actions/seasons.ts components/admin/SeasonForm.tsx && npm test
git add -A
git commit -m "refactor(seasons): remove dead theme_color/footer_sponsor_visible from code"
```

> The physical DB columns are intentionally left in place (reversible). Dropping them is a separate, optional follow-up.

---

## Verification Gate (after all tasks)

- `npm test` green; `npx tsc --noEmit` clean; `npx eslint` 0 warnings on changed files; `npm run build` succeeds (or note remote-DB-only failures).
- Run `node scripts/backfill-event-seasons.mjs` (dry-run): reports 0 null-season events on current data, writes nothing.
- Home + schedule boards still show all 26 current events (all in the active season). Deactivating the active season (in admin) would fall back to showing all events (no empty board) — confirm the evergreen-safety branch.
- Admin events list shows a 시즌 column and the season filter narrows rows; seasons list shows "N개 이벤트".
- Season edit form no longer has 테마 색상 / 푸터 스폰서 표시; saving a season still works; the public site is unchanged by their removal.

## Test Strategy (per spec §8 Phase 4)

`test/season-rules.test.ts` is the binding coverage: `filterByActiveSeason` asserted with null-`season_id` + non-active-season fixtures (evergreen rule: active ∪ null; no-active-season → all), and `assignSeasonByDate` asserted for in-window / boundary / no-match / ambiguous / missing-dates / date-prefix. The same `filterByActiveSeason` is the function `getEvents` calls (one source of truth), and the same `assignSeasonByDate` logic is mirrored in the backfill script. Admin list features are composition of already-tested data functions and are covered by the manual gate.
