import { describe, it, expect } from "vitest";
import { mapEvent } from "@/lib/data/events";
import { mapRow } from "@/lib/data/blindStructures";
import { isTabActive } from "@/lib/data/tabs";

describe("mapEvent", () => {
  it("normalizes a row and defaults nulls", () => {
    const e = mapEvent({ id: "1", title: "9회차", category: "confirmed", status: "confirmed" });
    expect(e.title).toBe("9회차");
    expect(e.is_visible).toBe(true);
    expect(e.timer_event_id).toBeNull();
  });
});

describe("mapRow (blind row keeps text ante)", () => {
  it("preserves non-numeric ante (PLO)", () => {
    const r = mapRow({ id: "r1", structure_id: "s1", row_type: "level", ante: "없음", sort_order: 2 });
    expect(r.ante).toBe("없음");
    expect(r.sort_order).toBe(2);
  });
});

describe("isTabActive (date-window visibility)", () => {
  const base = { id: "t", name: "챌린지", key: "challenge", type: "special" as const,
    slug: "challenge", external_url: null, is_visible: true, sort_order: 0, mobile_visible: true,
    home_card_visible: false, home_card_title: null, home_card_desc: null, home_card_cta: null };
  it("hidden after end_show_date", () => {
    expect(isTabActive({ ...base, start_show_date: "2026-07-01", end_show_date: "2026-07-20" }, "2026-07-21")).toBe(false);
  });
  it("visible inside window", () => {
    expect(isTabActive({ ...base, start_show_date: "2026-07-01", end_show_date: "2026-07-20" }, "2026-07-10")).toBe(true);
  });
  it("visible when no window set", () => {
    expect(isTabActive({ ...base, start_show_date: null, end_show_date: null }, "2026-07-10")).toBe(true);
  });
});
