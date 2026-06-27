import { describe, it, expect } from "vitest";
import { filterByActiveSeason, assignSeasonByDate } from "@/lib/season-rules";
import type { Event, Season } from "@/lib/types";

const ev = (id: string, season_id: string | null, date = "2026-06-01"): Event =>
  ({ id, season_id, date, title: id } as Event);

describe("filterByActiveSeason", () => {
  const events = [ev("a", "S1"), ev("b", null), ev("c", "S2"), ev("d", "S1")];
  it("keeps active-season events and null (evergreen), drops other seasons", () => {
    const out = filterByActiveSeason(events, "S1");
    expect(out.map((e) => e.id)).toEqual(["a", "b", "d"]);
  });
  it("returns ALL events when there is no active season (does not empty boards)", () => {
    const out = filterByActiveSeason(events, null);
    expect(out.map((e) => e.id)).toEqual(["a", "b", "c", "d"]);
  });
  it("preserves input order", () => {
    expect(filterByActiveSeason(events, "S2").map((e) => e.id)).toEqual(["b", "c"]);
  });
});

describe("assignSeasonByDate", () => {
  const seasons: Pick<Season, "id" | "start_date" | "end_date">[] = [
    { id: "spring", start_date: "2026-03-01", end_date: "2026-05-31" },
    { id: "summer", start_date: "2026-06-01", end_date: "2026-08-31" },
    { id: "nodates", start_date: null, end_date: null },
  ];
  it("assigns the single season whose window contains the date", () => {
    expect(assignSeasonByDate({ date: "2026-07-15" }, seasons)).toBe("summer");
  });
  it("is inclusive of window boundaries", () => {
    expect(assignSeasonByDate({ date: "2026-06-01" }, seasons)).toBe("summer");
    expect(assignSeasonByDate({ date: "2026-05-31" }, seasons)).toBe("spring");
  });
  it("returns null when no window contains the date", () => {
    expect(assignSeasonByDate({ date: "2026-01-01" }, seasons)).toBeNull();
  });
  it("returns null on ambiguous overlap (>1 match)", () => {
    const overlap = [
      { id: "x", start_date: "2026-06-01", end_date: "2026-07-01" },
      { id: "y", start_date: "2026-06-15", end_date: "2026-07-15" },
    ];
    expect(assignSeasonByDate({ date: "2026-06-20" }, overlap)).toBeNull();
  });
  it("returns null for an undated event or a season missing dates", () => {
    expect(assignSeasonByDate({ date: null }, seasons)).toBeNull();
    expect(assignSeasonByDate({ date: "2026-06-01" }, [{ id: "z", start_date: null, end_date: null }])).toBeNull();
  });
  it("matches only the YYYY-MM-DD prefix of a longer date string", () => {
    expect(assignSeasonByDate({ date: "2026-07-15 (수)" }, seasons)).toBe("summer");
  });
});
