import { describe, it, expect } from "vitest";
import type { Event } from "@/lib/types";
import {
  buildMonthGrid,
  groupEventsByDate,
  addMonths,
  monthLabel,
  splitOrganizerLabel,
  WEEKDAYS,
} from "@/lib/calendar";

function ev(date: string | null, over: Partial<Event> = {}): Event {
  return { id: date ?? "x", date, buy_in: null, status: "scheduled", ...over } as unknown as Event;
}

describe("WEEKDAYS", () => {
  it("is Sunday-first Korean labels", () => {
    expect(WEEKDAYS).toEqual(["일", "월", "화", "수", "목", "금", "토"]);
  });
});

describe("buildMonthGrid", () => {
  it("always returns 6 weeks of 7 days starting Sunday", () => {
    const weeks = buildMonthGrid(2026, 7);
    expect(weeks).toHaveLength(6);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0].date.length).toBe(10); // YYYY-MM-DD
  });

  it("July 2026 (1st is Wed) leads with the prior Sunday and flags inMonth", () => {
    const weeks = buildMonthGrid(2026, 7);
    // 2026-07-01 is a Wednesday → first cell is Sunday 2026-06-28
    expect(weeks[0][0].date).toBe("2026-06-28");
    expect(weeks[0][0].inMonth).toBe(false);
    const first = weeks[0][3];
    expect(first.date).toBe("2026-07-01");
    expect(first.inMonth).toBe(true);
    expect(first.day).toBe(1);
  });

  it("handles leap-year February", () => {
    const days = buildMonthGrid(2024, 2).flat().filter((c) => c.inMonth);
    expect(days[days.length - 1].day).toBe(29);
  });

  it("handles non-leap February", () => {
    const days = buildMonthGrid(2025, 2).flat().filter((c) => c.inMonth);
    expect(days[days.length - 1].day).toBe(28);
  });
});

describe("groupEventsByDate", () => {
  it("groups by date prefix and skips undated", () => {
    const m = groupEventsByDate([
      ev("2026-07-04T14:00:00"),
      ev("2026-07-04"),
      ev(null),
      ev("미정"),
    ]);
    expect(m.get("2026-07-04")).toHaveLength(2);
    expect([...m.keys()]).toEqual(["2026-07-04"]);
  });
});

describe("addMonths", () => {
  it("crosses year boundaries", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-07", 0)).toBe("2026-07");
  });
});

describe("monthLabel", () => {
  it("formats Korean", () => {
    expect(monthLabel("2026-07")).toBe("2026년 7월");
  });
});

describe("splitOrganizerLabel", () => {
  it("splits the organizer off a title that starts with it (no duplicate display)", () => {
    expect(splitOrganizerLabel("도너츠 P.K.O 이벤트", "도너츠")).toEqual({
      organizer: "도너츠",
      title: "P.K.O 이벤트",
    });
    expect(splitOrganizerLabel("도너츠 토너먼트", "도너츠")).toEqual({
      organizer: "도너츠",
      title: "토너먼트",
    });
  });
  it("matches the leading organizer case-insensitively, preserving the title's casing", () => {
    expect(splitOrganizerLabel("DONUTS Summer Open", "donuts")).toEqual({
      organizer: "DONUTS",
      title: "Summer Open",
    });
  });
  it("prefixes the organizer when the title does not start with it", () => {
    expect(splitOrganizerLabel("여름 특별전", "포커루루")).toEqual({
      organizer: "포커루루",
      title: "여름 특별전",
    });
  });
  it("returns the plain title when no organizer is set", () => {
    expect(splitOrganizerLabel("도너츠 토너먼트", null)).toEqual({
      organizer: null,
      title: "도너츠 토너먼트",
    });
    expect(splitOrganizerLabel("도너츠 토너먼트", "  ")).toEqual({
      organizer: null,
      title: "도너츠 토너먼트",
    });
  });
  it("handles a title that is exactly the organizer", () => {
    expect(splitOrganizerLabel("도너츠", "도너츠")).toEqual({
      organizer: "도너츠",
      title: "",
    });
  });
});
