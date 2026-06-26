"use client";

import { useMemo, useState } from "react";
import type { Event, EventCategory } from "@/lib/types";
import {
  ARCHIVED_STATUS,
  display,
  FixtureRow,
  parseEventDate,
} from "@/components/schedule/fixtures";

/* ------------------------------------------------------------------ *
 * ScheduleBoard — the full season calendar, set in the same editorial
 * language as the magazine home and the programs directory: Pretendard
 * for Korean, Space Grotesk for Latin labels / numerals, gold hairline
 * accents on the warm-dark palette. The home previews this season as a
 * fixture board; here the whole calendar gets the same row, grouped by
 * month so a long list still reads at a glance, with a category filter
 * to narrow it.
 * ------------------------------------------------------------------ */

const PRETENDARD = '"Pretendard Variable", Pretendard, system-ui, sans-serif';

type FilterOption = EventCategory | "all";

const FILTERS: { label: string; value: FilterOption }[] = [
  { label: "전체", value: "all" },
  { label: "페스티벌", value: "festival" },
  { label: "확정", value: "confirmed" },
  { label: "예정", value: "upcoming" },
  { label: "지난 일정", value: "completed" },
];

const FILTER_VALUES = new Set<string>(FILTERS.map((f) => f.value));

// Bucket key for grouping: "2026-06", or null when the date is undecided.
function monthKey(event: Event): string | null {
  const pd = parseEventDate(event.date);
  return pd ? `${pd.year}-${String(pd.month).padStart(2, "0")}` : null;
}

type MonthGroup = {
  key: string | null;
  year: number | null;
  month: number | null;
  events: Event[];
};

// Group in first-appearance order (events arrive admin-sorted by sort_order,
// then date), so the board honors the curated order. Undated fixtures collect
// into a trailing "일정 미정" group.
function groupByMonth(events: Event[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  const index = new Map<string | null, MonthGroup>();

  for (const event of events) {
    const key = monthKey(event);
    let group = index.get(key);
    if (!group) {
      const pd = parseEventDate(event.date);
      group = {
        key,
        year: pd?.year ?? null,
        month: pd?.month ?? null,
        events: [],
      };
      index.set(key, group);
      groups.push(group);
    }
    group.events.push(event);
  }

  // Undated group always sinks to the bottom.
  return groups.sort((a, b) => Number(a.key === null) - Number(b.key === null));
}

// A run of month groups under an optional section eyebrow ("다가오는 일정" /
// "지난 일정"). The label only appears when the board carries both runs, so a
// single-run view stays quiet.
function BoardSection({
  label,
  accent,
  groups,
}: {
  label: string | null;
  accent?: boolean;
  groups: MonthGroup[];
}) {
  return (
    <section className="flex flex-col gap-8" aria-label={label ?? undefined}>
      {label && (
        <p
          className={`${display.className} text-2xs font-semibold uppercase tracking-[0.2em] ${
            accent ? "text-gold/80" : "text-white/35"
          }`}
        >
          {label}
        </p>
      )}
      <div className="flex flex-col gap-10 sm:gap-12">
        {groups.map((group) => (
          <div key={group.key ?? "tbd"} className="flex flex-col gap-1">
            {/* Month divider */}
            <div className="flex items-baseline gap-3 pb-1">
              {group.month != null ? (
                <>
                  <h2 className="text-base font-semibold text-white">{group.month}월</h2>
                  <span
                    className={`${display.className} text-2xs font-medium uppercase tracking-[0.16em] text-gold/70`}
                  >
                    {group.year}
                  </span>
                </>
              ) : (
                <h2 className="text-base font-semibold text-white/70">일정 미정</h2>
              )}
              <span className="h-px flex-1 self-center bg-white/[0.08]" />
              <span className={`${display.className} text-2xs tabular-nums text-white/35`}>
                {group.events.length}
              </span>
            </div>

            <ul role="list" className="flex flex-col">
              {group.events.map((event) => (
                <FixtureRow key={event.id} event={event} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ScheduleBoard({
  events,
  initialFilter = "all",
}: {
  events: Event[];
  initialFilter?: string;
}) {
  const [active, setActiveState] = useState<FilterOption>(
    FILTER_VALUES.has(initialFilter) ? (initialFilter as FilterOption) : "all"
  );

  // Reflect the active filter in the URL (?category=) so the view is
  // deep-linkable and survives back/forward — mirrors ProgramBoard.
  function setActive(value: FilterOption) {
    setActiveState(value);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (value === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", value);
    window.history.replaceState(null, "", url);
  }

  // A schedule should lead with what's next: live/upcoming fixtures come first,
  // the completed archive trails behind a quiet "지난 일정" label. Each run is
  // grouped by month.
  const { liveGroups, archiveGroups, total } = useMemo(() => {
    const filtered =
      active === "all" ? events : events.filter((e) => e.category === active);
    const live = filtered.filter((e) => !ARCHIVED_STATUS.has(e.status));
    const archive = filtered.filter((e) => ARCHIVED_STATUS.has(e.status));
    return {
      liveGroups: groupByMonth(live),
      archiveGroups: groupByMonth(archive),
      total: filtered.length,
    };
  }, [events, active]);

  const hasBoth = liveGroups.length > 0 && archiveGroups.length > 0;

  return (
    <div
      className="flex flex-col gap-10 py-12 text-white touch-manipulation sm:gap-12 sm:py-16"
      style={{ fontFamily: PRETENDARD }}
    >
      {/* Header — eyebrow + display title, matching the home / programs
          SectionHead vocabulary. */}
      <header className="flex flex-col gap-3 border-b border-white/[0.08] pb-7">
        <span
          className={`${display.className} text-2xs font-medium uppercase tracking-[0.22em] text-gold/80`}
        >
          Schedule
        </span>
        <h1 className="text-balance text-display-lg font-bold leading-[1.05] tracking-[-0.03em] text-white sm:text-display-2xl">
          일정
        </h1>
        <p className="text-sm text-white/50">
          DO:NUTS 포커 시리즈의 토너먼트와 이벤트 일정입니다.
        </p>
      </header>

      {/* Filter tabs */}
      <nav
        aria-label="일정 카테고리"
        className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:px-0"
      >
        {FILTERS.map((f) => {
          const isActive = active === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setActive(f.value)}
              aria-pressed={isActive}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none ${
                isActive
                  ? "bg-white/[0.10] text-white"
                  : "text-white/50 hover:bg-white/[0.05] hover:text-white/85"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </nav>

      {/* Board */}
      {total === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.08] bg-surface py-20 text-center">
          <p className="text-sm font-medium text-white/80">
            해당 카테고리의 일정이 없어요.
          </p>
          <p className="text-sm text-white/45">
            다른 카테고리를 골라보거나 곧 열릴 일정을 기다려 주세요.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-14 sm:gap-16">
          {liveGroups.length > 0 && (
            <BoardSection
              label={hasBoth ? "다가오는 일정" : null}
              accent
              groups={liveGroups}
            />
          )}
          {archiveGroups.length > 0 && (
            <BoardSection label={hasBoth ? "지난 일정" : null} groups={archiveGroups} />
          )}
        </div>
      )}
    </div>
  );
}
