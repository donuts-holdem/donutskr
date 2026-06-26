# Schedule Calendar (Month View) — Design

Date: 2026-06-26
Status: Approved (brainstorming)
Area: `/schedule` public page

## Goal

Add a Google-Calendar-style **month grid** view to `/schedule` so visitors can
scan tournaments/events by date and click any event to open its detail page.
The calendar lives alongside the existing list (예정/지난 tabs) as a toggle, and
must match the site's bespoke dark editorial design (Pretendard + Space Grotesk,
gold accents on warm-dark palette, design tokens only).

## Decisions (from brainstorming)

- **Placement**: same `/schedule` page with a `리스트 | 캘린더` view toggle (not a
  separate route, not a replacement).
- **View granularity**: month grid only. Prev/next month + "오늘". No week/day views.
- **Mobile**: keep the 7-column grid but compact (gold dot markers); tapping a day
  reveals that day's events as a list below the grid (Google-mobile pattern).
- **Implementation**: hand-built grid with native `Date`/`Intl` + a small pure
  module — no calendar library. Chosen over react-day-picker because ~80% of the
  work is bespoke rendering (event chips, overflow, selected-day list) where a
  date-picker library helps least and constrains the design most; the month-grid
  math is ~20 lines and unit-testable, and keeps the client bundle small.

## Architecture

### Component tree

```
app/(site)/schedule/page.tsx          (server)
  → getEvents(), partitionEvents(), todayKST(), read searchParams
  → <ScheduleView ... />

ScheduleView (client, NEW)
  - Shared header (eyebrow "Schedule" + title "일정" + subline)
  - Primary toggle [ 리스트 | 캘린더 ], synced to ?view=
  - renders <ScheduleBoard> (list) OR <CalendarView> (calendar)

  ├─ ScheduleBoard (existing, MODIFIED)
  │    - header removed (moved up into ScheduleView)
  │    - 예정/지난 tabs now synced to ?tab= (renamed from ?view=)
  │
  └─ CalendarView (client, NEW)
       - month nav (‹ 2026년 7월 › + 오늘), synced to ?month=
       - weekday header (일 월 화 수 목 금 토)
       - 6×7 day grid (desktop chips / mobile dots)
       - mobile: selected-day event list below the grid
       - "날짜 미정" strip for undated events
       - radix Popover (portal) for "+N" overflow (desktop)
```

### URL parameters (resolves the current `?view=upcoming|past` clash)

| Param | Meaning | Default |
|-------|---------|---------|
| `?view=calendar` | primary display mode | absent = list |
| `?tab=past` | list sub-tab (예정/지난) — renamed from `?view=` | absent = upcoming |
| `?month=2026-07` | calendar's visible month | absent = current month (KST) |

Back-compat: legacy `?category=completed` → list + `tab=past`.

### Data flow

- `page.tsx` already calls `getEvents()` (visible, sorted by sort_order then date)
  and `partitionEvents()` for the list. The calendar is **date-native** — it needs
  no upcoming/past split; the full event list is passed through and placed on each
  event's date cell (past and future alike; past months reached via navigation).
- Default calendar month = the month of `todayKST()`.

### New pure module `lib/calendar.ts` (unit-tested)

- `buildMonthGrid(year, month)` → `Week[]` where each `Week` is 7 cells
  `{ date: "YYYY-MM-DD", day: number, inMonth: boolean }`. Always 6 weeks, filling
  leading/trailing days from adjacent months. Week starts Sunday. Computed in UTC
  to avoid timezone drift. **No "today" inside** — the component compares each
  cell's `date` to `todayKST()` so the module stays pure/deterministic.
- `groupEventsByDate(events)` → `Map<"YYYY-MM-DD", Event[]>` (key = `date` prefix;
  undated events excluded — surfaced separately).
- `addMonths(ym, delta)` → "YYYY-MM" (handles 12→1 boundary), `monthLabel(ym)` →
  "2026년 7월".

## Calendar UX (desktop)

- **Month nav bar**: `‹`/`›` icon buttons (`aria-label` 이전 달/다음 달), centered
  "2026년 7월" (Space Grotesk numerals), `오늘` button jumps to current month.
- **Weekday header**: 일 월 화 수 목 금 토, neutral (no weekend color — editorial
  restraint).
- **Day cell**: `border border-white/[0.06]`, min-height ~7rem (desktop), holds 2–3
  chips. Day number = Space Grotesk tabular. Today = gold ring + gold number.
  Adjacent-month days = `text-white/20` (events shown muted). Past in-month days =
  slightly muted number.
- **Event chip**: small row — start time (if any) + truncated title, status-colored
  left marker. Upcoming/active (future + 확정/진행중) = gold accent; completed/past =
  neutral gray (matches the list result variant). Chip is a `<Link>` to
  `/schedule/{id}`; hover lifts surface slightly.
- **Overflow "+N"**: when a day exceeds the chip cap, the last line shows `+N` which
  opens a **radix Popover rendered via portal** listing all that day's events as
  links, themed with `bg-surface border rounded-card`.
- **Undated ("미정") events**: cannot be placed on a date — rendered in a compact
  "날짜 미정 · N" strip below the grid, each linking to detail.

## Responsive

- **Desktop (sm+)**: full 7-col grid, chips + `+N` popover.
- **Mobile (<sm)**: 7-col grid, compact — each cell shows the day number plus up to
  3 **gold dot markers** for event days (no text chips). Tapping a cell sets
  `selectedDate` and renders a **selected-day list** below the grid: "7월 4일 (토)"
  header + that day's events as detail-linking rows. Default `selectedDate` = today
  (if in the shown month), else the month's first event day, else none (no list
  shown when the month has no events).

## Visual tokens

- Container `bg-surface`; grid lines `border-white/[0.06]`; header hairline.
- Numerals/labels Space Grotesk; Korean Pretendard.
- Today = gold; upcoming/active event = gold accent; completed/past = neutral gray.
- `rounded-card` / `rounded-pill` only; no weekend tint.

## Accessibility (WCAG AA)

- Grid `role="grid"`, weeks `role="row"`, cells `role="gridcell"`,
  `aria-label="7월 4일, 이벤트 2개"`.
- Month nav / 오늘 / `+N` / mobile day cells = `<button>` (icon buttons get
  `aria-label`); event chips = `<Link>` (native focus). Visible focus rings;
  `prefers-reduced-motion` honored.
- Arrow-key roving between days is **out of scope for v1** — AA is met via focusable
  links/buttons; noted as a follow-up enhancement.

## Testing

- `lib/calendar.ts` pure-function unit tests: 6-week generation, leading/trailing
  fill, leap-year February, Sunday week start, `groupEventsByDate`, `addMonths`
  boundary (Dec→Jan).

## Out of scope (YAGNI)

Week/day views, drag-to-create/move, multi-day events, arrow-key roving focus,
ICS/subscribe export.
