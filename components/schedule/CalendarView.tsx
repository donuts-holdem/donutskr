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
      <div
        role="gridcell"
        aria-hidden="true"
        className="min-h-20 border-b border-r border-white/[0.06] p-1.5 sm:min-h-28"
      >
        <span className={`${numClass} text-white/20`}>{cell.day}</span>
      </div>
    );
  }

  return (
    <div
      role="gridcell"
      aria-label={`${Number(cell.date.slice(5, 7))}월 ${cell.day}일, 이벤트 ${events.length}개`}
      className="min-h-20 border-b border-r border-white/[0.06] p-1.5 sm:min-h-28"
    >
      <span className={`${numClass} ${isToday ? "ring-1 ring-gold/80 text-gold" : "text-white/70"}`}>{cell.day}</span>
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
          <h2 className={`${display.className} min-w-28 text-center text-base font-bold tabular-nums text-white sm:text-lg`}>
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

      {/* Calendar — weekday header + day grid sit flush in one column */}
      <div className="flex flex-col">
        {/* Weekday header (Korean, Pretendard — no Space Grotesk/uppercase) */}
        <div className="grid grid-cols-7 border-l border-t border-white/[0.06]">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="border-b border-r border-white/[0.06] py-2 text-center text-2xs font-medium tracking-[0.08em] text-white/40"
            >
              {w}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="relative motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150" key={month}>
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
