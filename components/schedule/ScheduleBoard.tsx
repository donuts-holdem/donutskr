"use client";

import { useMemo, useState } from "react";
import type { Event } from "@/lib/types";
import { display, FixtureRow, parseEventDate } from "@/components/schedule/fixtures";

/* ------------------------------------------------------------------ *
 * ScheduleBoard — the full season calendar in the editorial language of
 * the magazine home and the programs directory. The primary structure is
 * TEMPORAL: a "예정 | 지난" segmented control splits the live season from
 * the archive so the two never compete in one scroll — the sports
 * Fixtures/Results pattern. Both buckets are partitioned on the server
 * (date vs today, status as override) and grouped by month here.
 * ------------------------------------------------------------------ */

type View = "upcoming" | "past";

const VIEWS: { key: View; label: string }[] = [
  { key: "upcoming", label: "예정" },
  { key: "past", label: "지난" },
];

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

// Group in first-appearance order (events arrive pre-sorted), so the board
// honors the upstream order. Undated fixtures collect into a trailing group.
function groupByMonth(events: Event[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  const index = new Map<string | null, MonthGroup>();

  for (const event of events) {
    const key = monthKey(event);
    let group = index.get(key);
    if (!group) {
      const pd = parseEventDate(event.date);
      group = { key, year: pd?.year ?? null, month: pd?.month ?? null, events: [] };
      index.set(key, group);
      groups.push(group);
    }
    group.events.push(event);
  }

  // Undated group always sinks to the bottom.
  return groups.sort((a, b) => Number(a.key === null) - Number(b.key === null));
}

function MonthBoard({
  groups,
  variant,
}: {
  groups: MonthGroup[];
  variant: "fixture" | "result";
}) {
  return (
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
              <h2 className="text-base font-semibold text-white/70">날짜 미정</h2>
            )}
            <span className="h-px flex-1 self-center bg-white/[0.08]" />
          </div>

          <ul role="list" className="flex flex-col">
            {group.events.map((event) => (
              <FixtureRow key={event.id} event={event} variant={variant} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// A live event in the season gets a gold pulse banner at the top of the
// upcoming view — the single most time-sensitive thing on the page.
function LiveBanner({ events }: { events: Event[] }) {
  const live = events.filter((e) => e.status === "running");
  if (live.length === 0) return null;
  const extra = live.length - 1;

  return (
    <div className="flex items-center gap-3 rounded-pill border border-gold/40 bg-gold/[0.06] px-4 py-2.5">
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-gold/70 opacity-75 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
      </span>
      <span
        className={`${display.className} shrink-0 text-2xs font-semibold uppercase tracking-[0.16em] text-gold`}
      >
        진행중 · Live
      </span>
      <span className="min-w-0 truncate text-sm text-white/85">
        {live[0].title}
        {extra > 0 && <span className="text-white/45"> 외 {extra}</span>}
      </span>
    </div>
  );
}

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

  const upcomingGroups = useMemo(() => groupByMonth(upcoming), [upcoming]);
  const pastGroups = useMemo(() => groupByMonth(past), [past]);

  const counts: Record<View, number> = { upcoming: upcoming.length, past: past.length };

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      {/* Temporal segmented control (primary axis) */}
      <div role="tablist" aria-label="일정 보기" className="inline-flex self-start rounded-pill bg-surface p-1">
        {VIEWS.map((v) => {
          const active = view === v.key;
          return (
            <button
              key={v.key}
              type="button"
              role="tab"
              id={`schedule-tab-${v.key}`}
              aria-selected={active}
              aria-controls={`schedule-panel-${v.key}`}
              onClick={() => setView(v.key)}
              className={`inline-flex items-center gap-2 rounded-pill px-5 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg motion-reduce:transition-none ${
                active
                  ? "bg-white/[0.10] text-white"
                  : "text-white/45 hover:text-white/80"
              }`}
            >
              {v.label}
              <span
                className={`${display.className} text-2xs tabular-nums ${
                  active ? "text-white/55" : "text-white/30"
                }`}
              >
                {counts[v.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Upcoming panel — full ink, gold accents, LIVE banner. Both panels
          stay in the DOM (only hidden) so past events remain crawlable. */}
      <div
        role="tabpanel"
        id="schedule-panel-upcoming"
        aria-labelledby="schedule-tab-upcoming"
        hidden={view !== "upcoming"}
        className="flex-col gap-8 data-[on=true]:flex"
        data-on={view === "upcoming"}
      >
        <LiveBanner events={upcoming} />
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-white/[0.08] bg-surface py-20 text-center">
            <p className="text-sm font-medium text-white/80">
              예정된 일정을 준비하고 있어요.
            </p>
            <p className="text-sm text-white/45">다음 시즌 일정이 곧 공개됩니다.</p>
            {past.length > 0 && (
              <button
                type="button"
                onClick={() => setView("past")}
                className={`${display.className} mt-1 inline-flex items-center gap-1.5 rounded-pill border border-white/15 px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] text-white/70 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg`}
              >
                지난 일정 보기
              </button>
            )}
          </div>
        ) : (
          <MonthBoard groups={upcomingGroups} variant="fixture" />
        )}
      </div>

      {/* Past panel — monochrome, compressed result rows, most-recent-first. */}
      <div
        role="tabpanel"
        id="schedule-panel-past"
        aria-labelledby="schedule-tab-past"
        hidden={view !== "past"}
        className="flex-col gap-8 data-[on=true]:flex"
        data-on={view === "past"}
      >
        {past.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.08] bg-surface py-20 text-center">
            <p className="text-sm font-medium text-white/80">아직 지난 일정이 없어요.</p>
            <p className="text-sm text-white/45">첫 시즌이 끝나면 여기에 기록이 쌓입니다.</p>
          </div>
        ) : (
          <MonthBoard groups={pastGroups} variant="result" />
        )}
      </div>
    </div>
  );
}
