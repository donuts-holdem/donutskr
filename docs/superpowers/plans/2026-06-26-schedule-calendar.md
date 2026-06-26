# Schedule Calendar (Month View) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Google-Calendar-style month view to `/schedule`, toggled against the existing list, where each event links to its detail page — in the site's bespoke dark editorial style.

**Architecture:** A pure `lib/calendar.ts` builds the month grid and groups events by date (unit-tested). A new client `ScheduleView` owns the shared header + a `리스트 | 캘린더` switcher and renders either the existing `ScheduleBoard` (list) or a new `CalendarView` (month grid). The server page partitions events (for the list) and passes the full event set + today (KST) to the calendar. No calendar library — hand-built grid for full design control.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, TypeScript, Tailwind v4, `radix-ui` Popover (portal), Vitest + Testing Library.

## Global Constraints

- Design tokens only — no hardcoded hex/spacing/z-index. Use `@theme` tokens (`bg-surface`, `text-gold`, `border-white/[0.06]`, `rounded-card`, `rounded-pill`, `text-2xs`, `text-display-*`) and Tailwind scale. (AGENTS.md)
- Public site stays bespoke — do NOT use shadcn/ui here. Use inline SVG icons like `components/schedule/fixtures.tsx` (the `IconArrow`/`Line` pattern). (AGENTS.md)
- `@/` import alias only. Default Server Components; add `"use client"` only when needed. Keep client bundles small.
- Use `KeyboardEvent.code` (never `.key`) for any keyboard shortcuts (Korean IME). No keyboard shortcuts are required by this plan.
- Render popovers via portals. (AGENTS.md)
- Korean copy on Pretendard; Latin/numerals/labels on Space Grotesk (`display` from `fixtures.tsx`). Respect `prefers-reduced-motion` (use `motion-safe:`/`motion-reduce:`).
- Date math in UTC; "today" comes from `todayKST()` (Asia/Seoul) computed on the server and passed down — never compute "today" in client render (hydration safety).
- WCAG AA: `role="grid"`/`row`/`gridcell`, icon buttons need `aria-label`, visible focus rings, links for navigation / buttons for actions.
- Tests: `npm test` (vitest). Typecheck: `npx tsc --noEmit`. Lint: `npx eslint <paths>`.

---

### Task 1: Pure calendar module `lib/calendar.ts`

**Files:**
- Create: `lib/calendar.ts`
- Test: `test/calendar.test.ts`

**Interfaces:**
- Consumes: `Event` from `@/lib/types`.
- Produces:
  - `type DayCell = { date: string; day: number; inMonth: boolean }`
  - `type Week = DayCell[]` (length 7)
  - `const WEEKDAYS: readonly string[]` (`["일",…,"토"]`)
  - `buildMonthGrid(year: number, month: number): Week[]` (month 1–12, 6 weeks, Sunday start)
  - `groupEventsByDate(events: Event[]): Map<string, Event[]>` (key `"YYYY-MM-DD"`, undated skipped)
  - `addMonths(ym: string, delta: number): string` (`"YYYY-MM"`)
  - `monthLabel(ym: string): string` (`"2026년 7월"`)
  - `formatBuyInShort(buyIn: string | null): string | null`

- [ ] **Step 1: Write the failing test**

Create `test/calendar.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Event } from "@/lib/types";
import {
  buildMonthGrid,
  groupEventsByDate,
  addMonths,
  monthLabel,
  formatBuyInShort,
  WEEKDAYS,
} from "@/lib/calendar";

function ev(date: string | null, over: Partial<Event> = {}): Event {
  return { id: date ?? "x", date, buy_in: null, status: "scheduled", ...over } as unknown as Event;
}

describe("WEEKDAYS", () => {
  it("is Sunday-first Korean labels", () => {
    expect(WEEKDAYS).toEqual(["일", "월", "화", "수", "목", "금", "토"]);
  });
});

describe("buildMonthGrid", () => {
  it("always returns 6 weeks of 7 days starting Sunday", () => {
    const weeks = buildMonthGrid(2026, 7);
    expect(weeks).toHaveLength(6);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0].date.length).toBe(10); // YYYY-MM-DD
  });

  it("July 2026 (1st is Wed) leads with the prior Sunday and flags inMonth", () => {
    const weeks = buildMonthGrid(2026, 7);
    // 2026-07-01 is a Wednesday → first cell is Sunday 2026-06-28
    expect(weeks[0][0].date).toBe("2026-06-28");
    expect(weeks[0][0].inMonth).toBe(false);
    const first = weeks[0][3];
    expect(first.date).toBe("2026-07-01");
    expect(first.inMonth).toBe(true);
    expect(first.day).toBe(1);
  });

  it("handles leap-year February", () => {
    const days = buildMonthGrid(2024, 2).flat().filter((c) => c.inMonth);
    expect(days[days.length - 1].day).toBe(29);
  });

  it("handles non-leap February", () => {
    const days = buildMonthGrid(2025, 2).flat().filter((c) => c.inMonth);
    expect(days[days.length - 1].day).toBe(28);
  });
});

describe("groupEventsByDate", () => {
  it("groups by date prefix and skips undated", () => {
    const m = groupEventsByDate([
      ev("2026-07-04T14:00:00"),
      ev("2026-07-04"),
      ev(null),
      ev("미정"),
    ]);
    expect(m.get("2026-07-04")).toHaveLength(2);
    expect([...m.keys()]).toEqual(["2026-07-04"]);
  });
});

describe("addMonths", () => {
  it("crosses year boundaries", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-07", 0)).toBe("2026-07");
  });
});

describe("monthLabel", () => {
  it("formats Korean", () => {
    expect(monthLabel("2026-07")).toBe("2026년 7월");
  });
});

describe("formatBuyInShort", () => {
  it("abbreviates thousands and falls back gracefully", () => {
    expect(formatBuyInShort("50,000 Pt")).toBe("50K");
    expect(formatBuyInShort("5,000P")).toBe("5K");
    expect(formatBuyInShort("500")).toBe("500");
    expect(formatBuyInShort("프리롤")).toBe("프리롤");
    expect(formatBuyInShort(null)).toBeNull();
    expect(formatBuyInShort("  ")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- calendar`
Expected: FAIL — `Cannot find module '@/lib/calendar'`.

- [ ] **Step 3: Implement `lib/calendar.ts`**

```ts
import type { Event } from "@/lib/types";

export type DayCell = { date: string; day: number; inMonth: boolean };
export type Week = DayCell[]; // length 7

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const pad = (n: number) => String(n).padStart(2, "0");
const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;

// 6-week (42-cell) grid for year/month (month 1-12), week starting Sunday.
// Computed in UTC so the cell dates never drift with the host timezone.
export function buildMonthGrid(year: number, month: number): Week[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay()); // back up to Sunday on/before the 1st
  const weeks: Week[] = [];
  for (let w = 0; w < 6; w++) {
    const week: Week = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(start);
      cur.setUTCDate(start.getUTCDate() + w * 7 + d);
      const y = cur.getUTCFullYear();
      const m = cur.getUTCMonth() + 1;
      week.push({
        date: `${y}-${pad(m)}-${pad(cur.getUTCDate())}`,
        day: cur.getUTCDate(),
        inMonth: y === year && m === month,
      });
    }
    weeks.push(week);
  }
  return weeks;
}

// Group events by "YYYY-MM-DD". Undated ("미정"/null) events are skipped.
export function groupEventsByDate(events: Event[]): Map<string, Event[]> {
  const map = new Map<string, Event[]>();
  for (const e of events) {
    const m = DATE_PREFIX.exec(e.date ?? "");
    if (!m) continue;
    const arr = map.get(m[1]);
    if (arr) arr.push(e);
    else map.set(m[1], [e]);
  }
  return map;
}

// "2026-07" + delta -> "YYYY-MM", crossing year boundaries.
export function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

// "2026-07" -> "2026년 7월"
export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${y}년 ${m}월`;
}

// Compact buy-in for an in-cell chip: "50,000 Pt" -> "50K"; "프리롤" -> "프리롤".
export function formatBuyInShort(buyIn: string | null): string | null {
  if (!buyIn) return null;
  const trimmed = buyIn.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return trimmed; // no number → show as-is (e.g. "프리롤")
  const n = Number(digits);
  if (n >= 1000) {
    const k = n / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}K`;
  }
  return String(n);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- calendar`
Expected: PASS (all groups green).

- [ ] **Step 5: Commit**

```bash
git add lib/calendar.ts test/calendar.test.ts
git commit -m "feat(schedule): add pure calendar grid + helpers module"
```

---

### Task 2: Lift shared shell into `ScheduleView`; refactor `ScheduleBoard`

Move the page header + Pretendard wrapper out of `ScheduleBoard` into a new `ScheduleView`, and rename the list's tab URL param from `?view=` to `?tab=` (freeing `?view=` for the list/calendar mode). After this task the page renders identically to today (list only) but through the new shell. The calendar is added in later tasks.

**Files:**
- Create: `components/schedule/ScheduleView.tsx`
- Modify: `components/schedule/ScheduleBoard.tsx`
- Modify: `app/(site)/schedule/page.tsx`

**Interfaces:**
- Consumes: `ScheduleBoard` (modified signature below), `display` from `@/components/schedule/fixtures`, `Event` from `@/lib/types`.
- Produces:
  - `ScheduleBoard({ upcoming, past, initialTab }: { upcoming: Event[]; past: Event[]; initialTab?: "upcoming" | "past" })` — header removed, writes `?tab=`.
  - `ScheduleView({ events, upcoming, past, today, initialMode, initialTab, initialMonth }: { events: Event[]; upcoming: Event[]; past: Event[]; today: string; initialMode?: "list" | "calendar"; initialTab?: "upcoming" | "past"; initialMonth: string })`.

- [ ] **Step 1: Modify `ScheduleBoard.tsx` — drop the header/wrapper, rename param to `tab`**

In `components/schedule/ScheduleBoard.tsx`:

1. Change the component signature and state (replace the existing `export function ScheduleBoard(... initialView ...)` block down through the `setView` function) with:

```tsx
export function ScheduleBoard({
  upcoming,
  past,
  initialTab = "upcoming",
}: {
  upcoming: Event[];
  past: Event[];
  initialTab?: View;
}) {
  const [view, setViewState] = useState<View>(initialTab === "past" ? "past" : "upcoming");

  // Reflect the active tab in the URL (?tab=) so it is deep-linkable.
  function setView(value: View) {
    setViewState(value);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (value === "upcoming") url.searchParams.delete("tab");
    else url.searchParams.set("tab", value);
    window.history.replaceState(null, "", url);
  }
```

2. Replace the outermost wrapper return. The current return opens with:

```tsx
  return (
    <div
      className="flex flex-col gap-10 py-12 text-white touch-manipulation sm:gap-12 sm:py-16"
      style={{ fontFamily: PRETENDARD }}
    >
      {/* Header — eyebrow + display title... */}
      <header className="flex flex-col gap-3 border-b border-white/[0.08] pb-7">
        ...Schedule / 일정 / subline...
      </header>

      {/* Temporal segmented control (primary axis) */}
      <div role="tablist" ...>
```

Change it to drop the wrapper `<div>` and the `<header>`, keeping everything from the segmented control onward. New start of return:

```tsx
  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      {/* Temporal segmented control (primary axis) */}
      <div role="tablist" aria-label="일정 보기" className="inline-flex self-start rounded-pill bg-surface p-1">
```

and the matching closing `</div>` at the very end stays (now closes this `flex flex-col` instead of the old outer wrapper). Delete the now-unused `PRETENDARD` const at the top of the file (it moves to `ScheduleView`).

- [ ] **Step 2: Create `components/schedule/ScheduleView.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { Event } from "@/lib/types";
import { ScheduleBoard } from "@/components/schedule/ScheduleBoard";
import { display } from "@/components/schedule/fixtures";

const PRETENDARD = '"Pretendard Variable", Pretendard, system-ui, sans-serif';

type Mode = "list" | "calendar";

/* Inline icons (bespoke SVGs, matching fixtures.tsx) */
function IconList({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden="true">
      <path d="M8 6h13 M8 12h13 M8 18h13 M3.5 6h.01 M3.5 12h.01 M3.5 18h.01" />
    </svg>
  );
}
function IconCalendar({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 3v3 M17 3v3 M4 8h16 M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

const MODES: { key: Mode; label: string; Icon: typeof IconList }[] = [
  { key: "list", label: "리스트", Icon: IconList },
  { key: "calendar", label: "캘린더", Icon: IconCalendar },
];

export function ScheduleView({
  events,
  upcoming,
  past,
  today,
  initialMode = "list",
  initialTab = "upcoming",
  initialMonth,
}: {
  events: Event[];
  upcoming: Event[];
  past: Event[];
  today: string;
  initialMode?: Mode;
  initialTab?: "upcoming" | "past";
  initialMonth: string;
}) {
  const [mode, setModeState] = useState<Mode>(initialMode === "calendar" ? "calendar" : "list");

  function setMode(value: Mode) {
    setModeState(value);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (value === "list") url.searchParams.delete("view");
    else url.searchParams.set("view", value);
    window.history.replaceState(null, "", url);
  }

  return (
    <div
      className="flex flex-col gap-8 py-12 text-white touch-manipulation sm:py-16"
      style={{ fontFamily: PRETENDARD }}
    >
      <header className="flex flex-col gap-3 border-b border-white/[0.08] pb-7">
        <span className={`${display.className} text-2xs font-medium uppercase tracking-[0.22em] text-gold/80`}>
          Schedule
        </span>
        <h1 className="text-balance text-display-lg font-bold leading-[1.05] tracking-[-0.03em] text-white sm:text-display-2xl">
          일정
        </h1>
        <p className="text-sm text-white/50">DO:NUTS 포커 시리즈의 토너먼트와 이벤트 일정입니다.</p>
      </header>

      {/* List / Calendar switcher */}
      <div role="tablist" aria-label="일정 보기 방식" className="inline-flex self-start rounded-pill bg-surface p-1">
        {MODES.map(({ key, label, Icon }) => {
          const active = mode === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(key)}
              className={`inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none ${
                active ? "bg-white/[0.10] text-white" : "text-white/45 hover:text-white/80"
              }`}
            >
              <Icon />
              {label}
            </button>
          );
        })}
      </div>

      <ScheduleBoard upcoming={upcoming} past={past} initialTab={initialTab} />
    </div>
  );
}
```

(Note: `CalendarView` is wired into this switcher in Task 6. For now both modes render the list so the shell is verifiable; `events`/`today`/`initialMonth`/`mode` props are accepted but the calendar branch is added later.)

- [ ] **Step 3: Modify `app/(site)/schedule/page.tsx` to render `ScheduleView`**

Replace the file body with:

```tsx
import type { Metadata } from "next";
import { getEvents } from "@/lib/data/events";
import { partitionEvents, todayKST } from "@/lib/schedule";
import { ScheduleView } from "@/components/schedule/ScheduleView";

export const metadata: Metadata = {
  title: "일정 | DO:NUTS",
  description: "DO:NUTS 포커 클럽 이벤트 일정",
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; tab?: string; category?: string; month?: string }>;
}) {
  const [sp, events] = await Promise.all([searchParams, getEvents()]);
  const today = todayKST();
  const { upcoming, past } = partitionEvents(events, today);

  const initialMode = sp.view === "calendar" ? "calendar" : "list";
  // ?tab= is the list sub-tab; legacy ?category=completed maps to the past tab.
  const initialTab =
    sp.tab === "past" || (!sp.tab && sp.category === "completed") ? "past" : "upcoming";
  const initialMonth = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : today.slice(0, 7);

  return (
    <ScheduleView
      events={events}
      upcoming={upcoming}
      past={past}
      today={today}
      initialMode={initialMode}
      initialTab={initialTab}
      initialMonth={initialMonth}
    />
  );
}
```

- [ ] **Step 4: Verify typecheck, lint, tests, build**

Run: `npx tsc --noEmit && npx eslint "app/(site)/schedule" components/schedule && npm test`
Expected: no type errors, no lint errors, all tests pass (34 existing + Task 1's calendar tests).

- [ ] **Step 5: Commit**

```bash
git add components/schedule/ScheduleView.tsx components/schedule/ScheduleBoard.tsx "app/(site)/schedule/page.tsx"
git commit -m "refactor(schedule): lift header/shell into ScheduleView, list tab → ?tab="
```

---

### Task 3: `CalendarView` desktop — month nav, grid, stakes chips, empty/undated

Build the desktop calendar (chips in cells). Overflow popover is a separate task; mobile is a separate task. Rendered standalone and verified by a render test.

**Files:**
- Create: `components/schedule/CalendarView.tsx`
- Test: `test/calendar-view.test.tsx`

**Interfaces:**
- Consumes: `buildMonthGrid`, `groupEventsByDate`, `addMonths`, `monthLabel`, `formatBuyInShort`, `WEEKDAYS`, `DayCell as DayCellT` from `@/lib/calendar`; `isPast` from `@/lib/schedule`; `display`, `FixtureRow`, `ACTIVE_STATUS`, `parseEventDate` from `@/components/schedule/fixtures`; `Event` from `@/lib/types`.
- Produces: `CalendarView({ events, today, initialMonth }: { events: Event[]; today: string; initialMonth: string })`. Internal `EventChip`, `DayCell` (mobile branches are stubbed here and completed in Task 5 — see notes).

- [ ] **Step 1: Write the failing render test**

Create `test/calendar-view.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { Event } from "@/lib/types";
import { CalendarView } from "@/components/schedule/CalendarView";

function ev(over: Partial<Event>): Event {
  return {
    id: "e1",
    title: "도너츠 토너먼트",
    date: "2026-07-04",
    buy_in: "50,000 Pt",
    status: "confirmed",
    location: "챔스홀덤",
    weekday: "토",
    start_time: "14:00",
  } as unknown as Event;
}

describe("CalendarView", () => {
  const today = "2026-07-04";

  it("shows the month label and a clickable stakes chip linking to detail", () => {
    render(<CalendarView events={[ev({})]} today={today} initialMonth="2026-07" />);
    expect(screen.getByText("2026년 7월")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /도너츠 토너먼트/ });
    expect(link).toHaveAttribute("href", "/schedule/e1");
    expect(within(link).getByText("50K")).toBeInTheDocument();
  });

  it("renders an undated strip for events without a date", () => {
    render(
      <CalendarView
        events={[{ ...ev({}), id: "u1", date: null } as unknown as Event]}
        today={today}
        initialMonth="2026-07"
      />
    );
    expect(screen.getByText(/날짜 미정/)).toBeInTheDocument();
  });

  it("shows an empty-month hint when no events fall in the month", () => {
    render(<CalendarView events={[]} today={today} initialMonth="2026-07" />);
    expect(screen.getByText("이 달에는 예정된 일정이 없어요")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- calendar-view`
Expected: FAIL — `Cannot find module '@/components/schedule/CalendarView'`.

- [ ] **Step 3: Implement `components/schedule/CalendarView.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Event } from "@/lib/types";
import { isPast } from "@/lib/schedule";
import {
  display,
  FixtureRow,
  ACTIVE_STATUS,
  parseEventDate,
} from "@/components/schedule/fixtures";
import {
  WEEKDAYS,
  buildMonthGrid,
  groupEventsByDate,
  addMonths,
  monthLabel,
  formatBuyInShort,
  type DayCell as DayCellT,
} from "@/lib/calendar";

const MAX_CHIPS = 3;

function ymParts(ym: string): [number, number] {
  const [y, m] = ym.split("-").map(Number);
  return [y, m];
}

function isEventGold(event: Event, today: string): boolean {
  return !isPast(event, today) && ACTIVE_STATUS.has(event.status);
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

// In-cell "stakes chip": buy-in (gold tabular) + title, links to detail.
function EventChip({ event, today }: { event: Event; today: string }) {
  const gold = isEventGold(event, today);
  const stake = formatBuyInShort(event.buy_in);
  return (
    <Link
      href={`/schedule/${event.id}`}
      className={`flex items-center gap-1.5 overflow-hidden rounded-md px-1.5 py-1 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 ${
        gold ? "" : "opacity-70"
      }`}
    >
      {stake && (
        <span className={`${display.className} shrink-0 text-2xs font-bold tabular-nums ${gold ? "text-gold" : "text-white/55"}`}>
          {stake}
        </span>
      )}
      <span className="truncate text-2xs text-white/85">{event.title}</span>
    </Link>
  );
}

// NOTE: mobile branches (the <button> selecting a day, dot markers) are added in
// Task 5. Here the cell renders the desktop layer only.
function DayCell({ cell, events, today }: { cell: DayCellT; events: Event[]; today: string }) {
  const isToday = cell.date === today;
  const visible = events.slice(0, MAX_CHIPS);
  const overflow = events.length - visible.length;
  const numClass = `${display.className} inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums`;

  if (!cell.inMonth) {
    return (
      <div className="min-h-[5rem] border-b border-r border-white/[0.06] p-1.5 sm:min-h-[7rem]">
        <span className={`${numClass} text-white/20`}>{cell.day}</span>
      </div>
    );
  }

  return (
    <div
      role="gridcell"
      aria-label={`${Number(cell.date.slice(5, 7))}월 ${cell.day}일, 이벤트 ${events.length}개`}
      className="min-h-[5rem] border-b border-r border-white/[0.06] p-1.5 sm:min-h-[7rem]"
    >
      <span className={`${numClass} ${isToday ? "bg-gold text-bg" : "text-white/70"}`}>{cell.day}</span>
      <div className="mt-1 flex flex-col gap-0.5">
        {visible.map((e) => (
          <EventChip key={e.id} event={e} today={today} />
        ))}
        {overflow > 0 && (
          <span className={`${display.className} px-1.5 text-2xs font-medium text-white/45`}>+{overflow}</span>
        )}
      </div>
    </div>
  );
}

export function CalendarView({
  events,
  today,
  initialMonth,
}: {
  events: Event[];
  today: string;
  initialMonth: string;
}) {
  const [month, setMonthState] = useState(initialMonth);
  const byDate = useMemo(() => groupEventsByDate(events), [events]);
  const undated = useMemo(() => events.filter((e) => !parseEventDate(e.date)), [events]);
  const [y, m] = ymParts(month);
  const weeks = useMemo(() => buildMonthGrid(y, m), [y, m]);

  const monthHasEvents = useMemo(
    () => weeks.flat().some((c) => c.inMonth && (byDate.get(c.date)?.length ?? 0) > 0),
    [weeks, byDate]
  );

  function changeMonth(next: string) {
    setMonthState(next);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("month", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Month nav */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="이전 달"
            onClick={() => changeMonth(addMonths(month, -1))}
            className="rounded-pill p-2 text-white/55 transition-colors hover:bg-white/[0.06] hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
          >
            <Chevron dir="left" />
          </button>
          <h2 className={`${display.className} min-w-[7rem] text-center text-base font-bold tabular-nums text-white sm:text-lg`}>
            {monthLabel(month)}
          </h2>
          <button
            type="button"
            aria-label="다음 달"
            onClick={() => changeMonth(addMonths(month, 1))}
            className="rounded-pill p-2 text-white/55 transition-colors hover:bg-white/[0.06] hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
          >
            <Chevron dir="right" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => changeMonth(today.slice(0, 7))}
          className={`${display.className} rounded-pill border border-white/15 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.06em] text-white/70 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70`}
        >
          오늘
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-l border-t border-white/[0.06]">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className={`${display.className} border-b border-r border-white/[0.06] py-2 text-center text-2xs font-medium uppercase tracking-[0.08em] text-white/40`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="relative -mt-5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150" key={month}>
        <div role="grid" aria-label={monthLabel(month)} className="grid grid-cols-7 border-l border-white/[0.06]">
          {weeks.map((week, wi) => (
            <div role="row" key={wi} className="contents">
              {week.map((cell) => (
                <DayCell key={cell.date} cell={cell} events={cell.inMonth ? byDate.get(cell.date) ?? [] : []} today={today} />
              ))}
            </div>
          ))}
        </div>
        {!monthHasEvents && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-sm text-white/35">
            이 달에는 예정된 일정이 없어요
          </p>
        )}
      </div>

      {/* Undated events */}
      {undated.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-white/[0.08] pt-5">
          <span className={`${display.className} text-2xs font-medium uppercase tracking-[0.16em] text-white/40`}>
            날짜 미정 · {undated.length}
          </span>
          <ul className="flex flex-col">
            {undated.map((e) => (
              <FixtureRow key={e.id} event={e} variant={isPast(e, today) ? "result" : "fixture"} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- calendar-view`
Expected: PASS (month label, stakes chip href + "50K", undated strip, empty hint).

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit && npx eslint components/schedule/CalendarView.tsx`
Then:

```bash
git add components/schedule/CalendarView.tsx test/calendar-view.test.tsx
git commit -m "feat(schedule): add desktop month calendar (nav, grid, stakes chips)"
```

---

### Task 4: Overflow "+N" popover (desktop, portal)

Replace the plain `+N` text with a radix Popover (rendered via portal) listing all of that day's events.

**Files:**
- Modify: `components/schedule/CalendarView.tsx`
- Test: `test/calendar-view.test.tsx` (add a case)

**Interfaces:**
- Consumes: `Popover` from `radix-ui` (namespace import: `import { Popover } from "radix-ui"`).
- Produces: internal `OverflowPopover({ date, events, today, count })`; `DayCell` renders it instead of the `+N` span.

- [ ] **Step 1: Add the failing test case**

Append to `test/calendar-view.test.tsx` inside the `describe("CalendarView", ...)` block:

```tsx
  it("collapses overflow into a +N trigger button", () => {
    const many: Event[] = Array.from({ length: 5 }, (_, i) => ({
      id: `m${i}`,
      title: `이벤트 ${i}`,
      date: "2026-07-04",
      buy_in: "10,000 Pt",
      status: "confirmed",
    } as unknown as Event));
    render(<CalendarView events={many} today={"2026-07-04"} initialMonth="2026-07" />);
    // 3 chips shown + a "+2" overflow trigger (5 total, MAX_CHIPS=3)
    expect(screen.getByRole("button", { name: "2개 더 보기" })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- calendar-view`
Expected: FAIL — no button named "2개 더 보기".

- [ ] **Step 3: Implement the popover**

In `components/schedule/CalendarView.tsx`:

1. Add to imports at the top:

```tsx
import { Popover } from "radix-ui";
```

2. Add a Korean weekday helper (used in the popover header) near `ymParts`:

```tsx
function koWeekday(date: string): string {
  const [yy, mm, dd] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay()];
}
```

3. Add the `OverflowPopover` component (above `DayCell`):

```tsx
function OverflowPopover({
  date,
  events,
  today,
  count,
}: {
  date: string;
  events: Event[];
  today: string;
  count: number;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`${count}개 더 보기`}
          className={`${display.className} rounded-md px-1.5 py-0.5 text-left text-2xs font-medium text-white/45 transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70`}
        >
          +{count}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-72 rounded-card border border-white/[0.10] bg-surface p-2 shadow-xl focus-visible:outline-none"
          style={{ fontFamily: '"Pretendard Variable", Pretendard, system-ui, sans-serif' }}
        >
          <p className={`${display.className} px-2 py-1.5 text-2xs font-medium uppercase tracking-[0.12em] text-white/40`}>
            {Number(date.slice(5, 7))}월 {Number(date.slice(8, 10))}일 ({koWeekday(date)})
          </p>
          <ul className="flex flex-col">
            {events.map((e) => (
              <FixtureRow key={e.id} event={e} variant={isPast(e, today) ? "result" : "fixture"} />
            ))}
          </ul>
          <Popover.Arrow className="fill-[color:var(--color-surface)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
```

4. In `DayCell`, replace the `+N` span:

```tsx
        {overflow > 0 && (
          <span className={`${display.className} px-1.5 text-2xs font-medium text-white/45`}>+{overflow}</span>
        )}
```

with:

```tsx
        {overflow > 0 && (
          <OverflowPopover date={cell.date} events={events} today={today} count={overflow} />
        )}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- calendar-view`
Expected: PASS (the "+2" trigger has accessible name "2개 더 보기").

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit && npx eslint components/schedule/CalendarView.tsx`
Then:

```bash
git add components/schedule/CalendarView.tsx test/calendar-view.test.tsx
git commit -m "feat(schedule): overflow days into a portal popover (+N)"
```

---

### Task 5: Mobile — dot markers + selected-day list

Make each in-month cell a tappable button on mobile that selects the day (desktop chips stay), and render the selected day's events as a list below the grid. Adjacent-month cells navigate to that month on mobile tap.

**Files:**
- Modify: `components/schedule/CalendarView.tsx`
- Test: `test/calendar-view.test.tsx` (add a case)

**Interfaces:**
- Produces: `CalendarView` gains internal `selected` state; `DayCell` gains props `selected: boolean`, `onSelect: (date: string) => void`, `onNavigateMonth: (ym: string) => void`. Both the mobile button layer (`sm:hidden`) and the desktop layer (`hidden sm:flex`) render; CSS toggles which is visible.

- [ ] **Step 1: Add the failing test case**

Append inside `describe("CalendarView", ...)`:

```tsx
  it("renders a selected-day list region for the mobile view", () => {
    render(
      <CalendarView
        events={[ev({})]}
        today={"2026-07-04"}
        initialMonth="2026-07"
      />
    );
    // default selected day = today (in month) → its heading appears (sm:hidden, still in DOM)
    expect(screen.getByRole("heading", { name: /7월 4일/ })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- calendar-view`
Expected: FAIL — no "7월 4일" heading yet.

- [ ] **Step 3: Implement mobile layer + selected-day list**

In `components/schedule/CalendarView.tsx`:

1. Update `DayCell` to render both layers and accept the new props. Replace the whole `DayCell` function with:

```tsx
function DayCell({
  cell,
  events,
  today,
  selected,
  onSelect,
  onNavigateMonth,
}: {
  cell: DayCellT;
  events: Event[];
  today: string;
  selected: boolean;
  onSelect: (date: string) => void;
  onNavigateMonth: (ym: string) => void;
}) {
  const isToday = cell.date === today;
  const visible = events.slice(0, MAX_CHIPS);
  const overflow = events.length - visible.length;
  const numClass = `${display.className} inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums`;

  if (!cell.inMonth) {
    const ym = cell.date.slice(0, 7);
    return (
      <div className="min-h-[5rem] border-b border-r border-white/[0.06] p-1.5 sm:min-h-[7rem]">
        {/* mobile: tap to jump to that month */}
        <button
          type="button"
          aria-label={`${Number(ym.slice(5, 7))}월로 이동`}
          onClick={() => onNavigateMonth(ym)}
          className="rounded-md p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 sm:hidden"
        >
          <span className={`${numClass} text-white/20`}>{cell.day}</span>
        </button>
        <span className={`${numClass} hidden text-white/20 sm:inline-flex`}>{cell.day}</span>
      </div>
    );
  }

  return (
    <div
      role="gridcell"
      aria-label={`${Number(cell.date.slice(5, 7))}월 ${cell.day}일, 이벤트 ${events.length}개`}
      className="min-h-[5rem] border-b border-r border-white/[0.06] p-1.5 sm:min-h-[7rem]"
    >
      {/* mobile: whole cell selects the day */}
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(cell.date)}
        className={`flex w-full flex-col items-start gap-1 rounded-md p-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 sm:hidden ${
          selected ? "bg-white/[0.06]" : ""
        }`}
      >
        <span className={`${numClass} ${isToday ? "bg-gold text-bg" : selected ? "text-white" : "text-white/70"}`}>
          {cell.day}
        </span>
        {events.length > 0 && (
          <span className="flex gap-0.5" aria-hidden="true">
            {events.slice(0, 3).map((e) => (
              <span key={e.id} className={`h-1 w-1 rounded-full ${isEventGold(e, today) ? "bg-gold" : "bg-white/30"}`} />
            ))}
          </span>
        )}
      </button>

      {/* desktop: passive number + chip links */}
      <div className="hidden flex-col sm:flex">
        <span className={`${numClass} ${isToday ? "bg-gold text-bg" : "text-white/70"}`}>{cell.day}</span>
        <div className="mt-1 flex flex-col gap-0.5">
          {visible.map((e) => (
            <EventChip key={e.id} event={e} today={today} />
          ))}
          {overflow > 0 && (
            <OverflowPopover date={cell.date} events={events} today={today} count={overflow} />
          )}
        </div>
      </div>
    </div>
  );
}
```

2. In `CalendarView`, add selected-day state + default, after the `weeks` memo:

```tsx
  const monthEventDays = useMemo(
    () =>
      weeks
        .flat()
        .filter((c) => c.inMonth && (byDate.get(c.date)?.length ?? 0) > 0)
        .map((c) => c.date),
    [weeks, byDate]
  );
  const defaultSelected = today.startsWith(month) ? today : monthEventDays[0] ?? null;
  const [selected, setSelected] = useState<string | null>(defaultSelected);
```

3. In `changeMonth`, reset the selected day for the new month:

```tsx
  function changeMonth(next: string) {
    setMonthState(next);
    setSelected(next === today.slice(0, 7) ? today : null);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("month", next);
    window.history.replaceState(null, "", url);
  }
```

4. Pass the new props to `DayCell` in the grid render:

```tsx
              {week.map((cell) => (
                <DayCell
                  key={cell.date}
                  cell={cell}
                  events={cell.inMonth ? byDate.get(cell.date) ?? [] : []}
                  today={today}
                  selected={selected === cell.date}
                  onSelect={setSelected}
                  onNavigateMonth={changeMonth}
                />
              ))}
```

5. Add the mobile selected-day list AFTER the grid block and BEFORE the undated block:

```tsx
      {/* Mobile selected-day list */}
      {selected && (
        <div className="flex flex-col gap-2 sm:hidden">
          <h3 className="text-sm font-semibold text-white">
            {Number(selected.slice(5, 7))}월 {Number(selected.slice(8, 10))}일{" "}
            <span className="text-white/45">({koWeekday(selected)})</span>
          </h3>
          {(byDate.get(selected)?.length ?? 0) > 0 ? (
            <ul className="flex flex-col">
              {byDate.get(selected)!.map((e) => (
                <FixtureRow key={e.id} event={e} variant={isPast(e, today) ? "result" : "fixture"} />
              ))}
            </ul>
          ) : (
            <p className="py-4 text-sm text-white/40">이 날에는 일정이 없어요.</p>
          )}
        </div>
      )}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- calendar-view`
Expected: PASS (the "7월 4일" heading renders; existing cases still pass).

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit && npx eslint components/schedule/CalendarView.tsx`
Then:

```bash
git add components/schedule/CalendarView.tsx test/calendar-view.test.tsx
git commit -m "feat(schedule): mobile calendar (dot markers + selected-day list)"
```

---

### Task 6: Wire the calendar into the switcher + full verification

Render `CalendarView` from `ScheduleView` when the calendar mode is active, and verify the whole feature (build + browser).

**Files:**
- Modify: `components/schedule/ScheduleView.tsx`

**Interfaces:**
- Consumes: `CalendarView` from `@/components/schedule/CalendarView`.

- [ ] **Step 1: Wire `CalendarView` into `ScheduleView`**

In `components/schedule/ScheduleView.tsx`:

1. Add the import:

```tsx
import { CalendarView } from "@/components/schedule/CalendarView";
```

2. Replace the final `<ScheduleBoard ... />` line with a conditional:

```tsx
      {mode === "calendar" ? (
        <CalendarView events={events} today={today} initialMonth={initialMonth} />
      ) : (
        <ScheduleBoard upcoming={upcoming} past={past} initialTab={initialTab} />
      )}
```

- [ ] **Step 2: Typecheck, lint, tests, build**

Run:

```bash
npx tsc --noEmit && npx eslint "app/(site)/schedule" components/schedule lib/calendar.ts && npm test && npm run build
```

Expected: clean typecheck/lint, all tests pass (existing + `calendar` + `calendar-view`), build succeeds with `/schedule` listed.

- [ ] **Step 3: Manual browser verification (dev server already runs on :3000)**

Verify, capturing a screenshot at each step:
1. `http://localhost:3000/schedule` → list view unchanged (예정/지난 tabs, `?tab=` updates on tab click).
2. Click **캘린더** → URL gains `?view=calendar`; current month grid renders with stakes chips; today cell has the gold marker.
3. Click `›` / `‹` / **오늘** → month label + grid change; `?month=` updates.
4. A day with >3 events shows `+N`; clicking opens the portal popover listing all events, each linking to detail.
5. Click a stakes chip → navigates to `/schedule/{id}`.
6. Resize to mobile width → cells show gold dots; tapping a day shows the selected-day list below; tapping an adjacent-month day jumps months.
7. Undated events (if any) appear in the "날짜 미정" strip.

- [ ] **Step 4: Commit**

```bash
git add components/schedule/ScheduleView.tsx
git commit -m "feat(schedule): enable list/calendar view switch"
```

---

## Self-Review

**Spec coverage:**
- View toggle on same page (`?view=`) → Tasks 2, 6. ✓
- List sub-tab rename (`?tab=`, legacy `?category=completed`) → Task 2. ✓
- Month-only grid, prev/next/오늘, `?month=` → Task 3. ✓
- Pure `lib/calendar.ts` (buildMonthGrid/groupEventsByDate/addMonths/monthLabel) + tests → Task 1. ✓
- Stakes-chip signature (buy-in gold tabular + title, time dropped, no-buy-in fallback) → Task 3 (`EventChip`, `formatBuyInShort`). ✓
- Status color (gold upcoming/active, neutral past) → Task 3 (`isEventGold` via `isPast` + `ACTIVE_STATUS`). ✓
- Adjacent-month faint, no events, click → that month → Tasks 3 (desktop faint) + 5 (mobile navigate). ✓
- Today gold ring → Task 3. ✓
- "+N" portal popover → Task 4. ✓
- Undated strip → Task 3. ✓
- Empty-month hint → Task 3. ✓
- Mobile dots + selected-day list (time restored via FixtureRow) → Task 5. ✓
- Motion: month cross-fade `motion-safe:fade-in`, reduced-motion honored → Task 3. ✓
- A11y: grid roles, icon-button `aria-label`, focus rings, links vs buttons → Tasks 3–5. ✓
- Tests for the pure module → Task 1. ✓

**Placeholder scan:** none — every code step contains complete code.

**Type consistency:** `DayCellT` (= `DayCell` from lib) used in components; `EventChip`/`DayCell`/`OverflowPopover` signatures consistent across Tasks 3–5; `ScheduleBoard` prop `initialTab` matches the call in `ScheduleView`; `formatBuyInShort` returns `string | null` and is guarded before render. ✓

**Note for executors:** the `-mt-5` on the grid wrapper offsets the parent `gap-5` so the day grid sits flush under the weekday header; keep both in sync if spacing changes.
