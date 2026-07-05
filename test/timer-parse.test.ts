import { describe, it, expect } from "vitest";
import { parseChipValue, buildTimerStructure } from "@/lib/timer/parse";
import type { BlindRow } from "@/lib/types";

const row = (over: Partial<BlindRow>): BlindRow => ({
  id: "r", structure_id: "s", row_type: "level", level_no: null,
  sb: null, bb: null, ante: null, duration: null,
  break_name: null, break_minutes: null, stage_note: null, sort_order: 0,
  ...over,
});

describe("parseChipValue", () => {
  it("parses digits, commas and whitespace", () => {
    expect(parseChipValue("1,000")).toBe(1000);
    expect(parseChipValue(" 300 ")).toBe(300);
    expect(parseChipValue("500")).toBe(500);
  });
  it("treats blank/dash/null as an explicit 0", () => {
    expect(parseChipValue("")).toBe(0);
    expect(parseChipValue("-")).toBe(0);
    expect(parseChipValue(null)).toBe(0);
  });
  it("returns null for unparseable values", () => {
    expect(parseChipValue("100/200")).toBeNull();
    expect(parseChipValue("1k")).toBeNull();
    expect(parseChipValue("없음")).toBeNull();
  });
});

describe("buildTimerStructure", () => {
  it("skips stage rows and maps levels + breaks in sort order", () => {
    const res = buildTimerStructure([
      row({ row_type: "stage", stage_note: "Day 1", sort_order: 0 }),
      row({ row_type: "level", level_no: 1, sb: "100", bb: "200", ante: "200", duration: 20, sort_order: 1 }),
      row({ row_type: "break", break_name: "휴식", break_minutes: 10, sort_order: 2 }),
      row({ row_type: "level", level_no: 2, sb: "200", bb: "400", ante: "400", duration: 20, sort_order: 3 }),
    ]);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.structure).toHaveLength(3);
    expect(res.structure[0]).toMatchObject({ type: "level", level_no: 1, sb: 100, bb: 200, ante: 200, duration_min: 20 });
    expect(res.structure[1]).toMatchObject({ type: "break", level_no: null, name: "휴식", sb: 0, bb: 0, ante: 0, duration_min: 10 });
    expect(res.structure[2]).toMatchObject({ type: "level", level_no: 2, duration_min: 20 });
  });

  it("sorts by sort_order before building", () => {
    const res = buildTimerStructure([
      row({ level_no: 2, sb: "200", bb: "400", ante: "0", duration: 20, sort_order: 5 }),
      row({ level_no: 1, sb: "100", bb: "200", ante: "0", duration: 20, sort_order: 1 }),
    ]);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.structure.map((r) => r.level_no)).toEqual([1, 2]);
  });

  it("carries sortOrder + field + raw on a parse error", () => {
    const res = buildTimerStructure([
      row({ level_no: 1, sb: "100", bb: "100/200", ante: "0", duration: 20, sort_order: 3 }),
    ]);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toEqual({ sortOrder: 3, field: "bb", raw: "100/200" });
  });

  it("errors when a level duration is missing", () => {
    const res = buildTimerStructure([
      row({ level_no: 1, sb: "100", bb: "200", ante: "0", duration: null, sort_order: 0 }),
    ]);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.field).toBe("duration");
  });

  it("rejects an empty structure", () => {
    const res = buildTimerStructure([row({ row_type: "stage", stage_note: "x", sort_order: 0 })]);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.field).toBe("structure");
  });
});
