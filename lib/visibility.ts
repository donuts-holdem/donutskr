import type { Event, Program, SpecialPage } from "@/lib/types";

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

/**
 * Whether a program is past its end date and should drop off the public site.
 * `end_date` is INCLUSIVE — a program stays live through its final day. Programs
 * without an end date never expire. `today` is a "YYYY-MM-DD" string (KST; see
 * lib/schedule.ts todayKST) so the check is pure and testable. Admin views keep
 * showing expired programs (with a "종료됨" badge) — this only gates the public site.
 */
export function isProgramExpired(
  program: Pick<Program, "end_date">,
  today: string
): boolean {
  if (!program.end_date) return false;
  return program.end_date.slice(0, 10) < today;
}

export function isProgramPublic(
  program: Pick<Program, "end_date">,
  today: string
): boolean {
  return !isProgramExpired(program, today);
}
