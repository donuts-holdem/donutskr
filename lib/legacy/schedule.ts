import type { Event } from "@/lib/legacy/types";
import { deriveEventStatus } from "@/lib/legacy/event-status";

/* ------------------------------------------------------------------ *
 * Schedule partition — splits the calendar into "다가오는 일정" (예정)
 * and "지난 일정" (결과). The temporal axis is the page's primary
 * structure, so the split is self-correcting: it reads the DERIVED status
 * (lib/event-status), which is itself driven by the event's date + times
 * in KST. Pure & side-effect free so it can be unit-tested and run on the
 * server.
 * ------------------------------------------------------------------ */

const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];
/**
 * Korean weekday ("일".."토") derived from a "YYYY-MM-DD" date, or null if
 * unparseable. Computed in UTC so it is deterministic across server/browser
 * (the calendar date's day-of-week doesn't depend on the viewer's timezone).
 */
export function weekdayKO(date: string | null): string | null {
  const m = DATE_PREFIX.exec(date ?? "");
  if (!m) return null;
  return WEEKDAY_KO[new Date(`${m[1]}T00:00:00Z`).getUTCDay()] ?? null;
}

/**
 * Whether an event belongs in the past/archive bucket. An event is archived
 * once its DERIVED status is terminal (completed / canceled); everything else
 * — scheduled, running, reg_closed, hidden — leads the live season. Undated
 * and today/future events derive to non-terminal, so they stay upcoming.
 */
export function isPast(
  event: Pick<Event, "status" | "date" | "start_time" | "reg_close_time">,
  now: Date = new Date(),
): boolean {
  const d = deriveEventStatus(event, now);
  return d === "completed" || d === "canceled";
}

/** Today's date in the club's timezone (Asia/Seoul) as "YYYY-MM-DD". */
export function todayKST(now: Date = new Date()): string {
  // en-CA formats as ISO "YYYY-MM-DD"; pinning the zone avoids server-UTC
  // / browser-locale drift and keeps SSR + hydration deterministic.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Partition events into upcoming and past buckets.
 * - upcoming keeps the incoming (date asc, then start_time asc, then id) order.
 * - past is reversed to most-recent-first, the way an archive reads.
 */
export function partitionEvents(
  events: Event[],
  now: Date = new Date()
): { upcoming: Event[]; past: Event[] } {
  const upcoming: Event[] = [];
  const past: Event[] = [];
  for (const event of events) {
    (isPast(event, now) ? past : upcoming).push(event);
  }
  past.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return { upcoming, past };
}
