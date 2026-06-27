import type { Event, SpecialPage } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * Effective public visibility — the SINGLE source of truth shared by
 * the public routes (which filter on it) and the admin badges (which
 * explain it). Pure & deterministic: `today` is passed in as a
 * "YYYY-MM-DD" string (see lib/schedule.ts todayKST) so it is testable.
 * ------------------------------------------------------------------ */

export type EventVisibility = "live" | "off" | "hidden-flag";
export type SpecialPageVisibility = "live" | "off" | "window-before" | "window-after";

/** Why (or whether) an event is publicly visible. */
export function effectiveEventVisibility(
  event: Pick<Event, "is_visible" | "status">
): EventVisibility {
  if (!event.is_visible) return "off";
  if (event.status === "hidden") return "hidden-flag";
  return "live";
}

export function isEventPublic(event: Pick<Event, "is_visible" | "status">): boolean {
  return effectiveEventVisibility(event) === "live";
}

/** Why (or whether) a special page is publicly visible, given today. */
export function effectiveSpecialPageVisibility(
  page: Pick<SpecialPage, "is_visible" | "start_show_date" | "end_show_date">,
  today: string
): SpecialPageVisibility {
  if (!page.is_visible) return "off";
  if (page.start_show_date && today < page.start_show_date) return "window-before";
  if (page.end_show_date && today > page.end_show_date) return "window-after";
  return "live";
}

export function isSpecialPagePublic(
  page: Pick<SpecialPage, "is_visible" | "start_show_date" | "end_show_date">,
  today: string
): boolean {
  return effectiveSpecialPageVisibility(page, today) === "live";
}
