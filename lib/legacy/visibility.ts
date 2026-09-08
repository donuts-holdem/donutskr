import type { Event } from "@/lib/legacy/types";

export type EventVisibility = "live" | "off" | "hidden-flag";

export function effectiveEventVisibility(
  event: Pick<Event, "is_visible" | "status">,
): EventVisibility {
  if (!event.is_visible) return "off";
  if (event.status === "hidden") return "hidden-flag";
  return "live";
}

export function isEventPublic(event: Pick<Event, "is_visible" | "status">): boolean {
  return effectiveEventVisibility(event) === "live";
}
