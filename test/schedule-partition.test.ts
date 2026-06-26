import { describe, it, expect } from "vitest";
import type { Event } from "@/lib/types";
import { isPast, partitionEvents } from "@/lib/schedule";

const TODAY = "2026-06-26";

function mk(status: string, date: string | null): Event {
  return { id: `${status}-${date}`, status, date } as unknown as Event;
}

describe("isPast", () => {
  it("completed wins over a future date → past", () => {
    expect(isPast(mk("completed", "2026-12-31"), TODAY)).toBe(true);
  });
  it("canceled → past", () => {
    expect(isPast(mk("canceled", "2026-12-31"), TODAY)).toBe(true);
  });
  it("running with a past date → upcoming (lead with live)", () => {
    expect(isPast(mk("running", "2026-01-01"), TODAY)).toBe(false);
  });
  it("scheduled with a past date → past (self-correcting)", () => {
    expect(isPast(mk("scheduled", "2026-05-01"), TODAY)).toBe(true);
  });
  it("scheduled with a future date → upcoming", () => {
    expect(isPast(mk("scheduled", "2026-07-01"), TODAY)).toBe(false);
  });
  it("today is still upcoming, not past", () => {
    expect(isPast(mk("scheduled", "2026-06-26"), TODAY)).toBe(false);
  });
  it("null / 미정 date → upcoming", () => {
    expect(isPast(mk("scheduled", null), TODAY)).toBe(false);
    expect(isPast(mk("scheduled", "미정"), TODAY)).toBe(false);
  });
});

describe("partitionEvents", () => {
  it("buckets and sorts past most-recent-first", () => {
    const events = [
      mk("scheduled", "2026-07-10"), // upcoming
      mk("completed", "2026-05-01"), // past
      mk("scheduled", "2026-05-15"), // past (date < today)
      mk("scheduled", null), // upcoming (undated)
    ];
    const { upcoming, past } = partitionEvents(events, TODAY);
    expect(upcoming.map((e) => e.date)).toEqual(["2026-07-10", null]);
    expect(past.map((e) => e.date)).toEqual(["2026-05-15", "2026-05-01"]);
  });
});
