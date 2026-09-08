import { describe, it, expect } from "vitest";
import type { Event } from "@/lib/legacy/types";
import { isPast, partitionEvents } from "@/lib/legacy/schedule";

// A KST wall-clock instant (Asia/Seoul is a fixed UTC+9).
const NOW = new Date("2026-06-26T12:00:00+09:00");

function mk(
  status: string,
  date: string | null,
  extra: Partial<Event> = {},
): Event {
  return { id: `${status}-${date}`, status, date, ...extra } as unknown as Event;
}

describe("isPast (derived-status driven)", () => {
  it("stored canceled → past", () => {
    expect(isPast(mk("canceled", "2026-12-31"), NOW)).toBe(true);
  });
  it("auto with a past date derives completed → past", () => {
    expect(isPast(mk("auto", "2026-05-01"), NOW)).toBe(true);
  });
  it("auto with a future date → upcoming", () => {
    expect(isPast(mk("auto", "2026-07-01"), NOW)).toBe(false);
  });
  it("today is still upcoming, not past", () => {
    expect(isPast(mk("auto", "2026-06-26"), NOW)).toBe(false);
  });
  it("an event that ended earlier today derives completed → past", () => {
    // started 08:00, reg-close 09:00 → end 13:00; now is 12:00 → still reg_closed…
    expect(isPast(mk("auto", "2026-06-26", { start_time: "08:00", reg_close_time: "09:00" }), NOW)).toBe(false);
    // …but by 14:00 KST it is past end (09:00 + 4h) → completed.
    const later = new Date("2026-06-26T14:00:00+09:00");
    expect(isPast(mk("auto", "2026-06-26", { start_time: "08:00", reg_close_time: "09:00" }), later)).toBe(true);
  });
  it("null / 미정 date → upcoming", () => {
    expect(isPast(mk("auto", null), NOW)).toBe(false);
    expect(isPast(mk("auto", "미정"), NOW)).toBe(false);
  });
});

describe("partitionEvents", () => {
  it("buckets and sorts past most-recent-first", () => {
    const events = [
      mk("auto", "2026-07-10"), // upcoming
      mk("canceled", "2026-05-01"), // past (override)
      mk("auto", "2026-05-15"), // past (date < today → completed)
      mk("auto", null), // upcoming (undated)
    ];
    const { upcoming, past } = partitionEvents(events, NOW);
    expect(upcoming.map((e) => e.date)).toEqual(["2026-07-10", null]);
    expect(past.map((e) => e.date)).toEqual(["2026-05-15", "2026-05-01"]);
  });
});
