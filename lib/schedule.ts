import type { Event } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * Schedule partition — splits the calendar into "다가오는 일정" (예정)
 * and "지난 일정" (결과). The temporal axis is the page's primary
 * structure, so the split must be self-correcting: it is driven by the
 * event DATE versus today, with terminal STATUS as an override. Pure
 * and side-effect free so it can be unit-tested and run on the server.
 * ------------------------------------------------------------------ */

// Human-asserted terminal states win over the clock (an event finished
// early, or a placeholder date, still belongs in the archive).
const TERMINAL = new Set(["completed", "canceled"]);

const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;

/**
 * Whether an event belongs in the past/archive bucket.
 * Precedence: terminal status → live status → undated → date vs today.
 * `today` is a "YYYY-MM-DD" string (see todayKST) compared lexically.
 */
export function isPast(event: Pick<Event, "status" | "date">, today: string): boolean {
  if (TERMINAL.has(event.status)) return true; // completed / canceled → past
  if (event.status === "running") return false; // live → lead with it
  const m = DATE_PREFIX.exec(event.date ?? "");
  if (!m) return false; // undated ("미정") → upcoming intent, never archive
  return m[1] < today; // strictly before today is past; today is still upcoming
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
  today: string
): { upcoming: Event[]; past: Event[] } {
  const upcoming: Event[] = [];
  const past: Event[] = [];
  for (const event of events) {
    (isPast(event, today) ? past : upcoming).push(event);
  }
  past.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return { upcoming, past };
}
