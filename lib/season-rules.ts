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
