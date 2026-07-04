import { describe, it, expect } from "vitest";
import { mapEvent } from "@/lib/data/events";
import { mapRow } from "@/lib/data/blindStructures";

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

