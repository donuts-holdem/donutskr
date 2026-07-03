import { describe, it, expect } from "vitest";
import { mapProgramOption } from "@/lib/data/programOptions";

describe("mapProgramOption", () => {
  it("normalizes a row and coerces types", () => {
    const o = mapProgramOption({ id: 42, kind: "group", value: "poker", label: "포커", sort_order: "10" });
    expect(o).toEqual({ id: "42", kind: "group", value: "poker", label: "포커", sort_order: 10 });
  });
  it("defaults kind to group and sort_order to 0 when absent", () => {
    const o = mapProgramOption({ value: "recruiting", label: "모집중" });
    expect(o.kind).toBe("group");
    expect(o.sort_order).toBe(0);
    expect(o.id).toBe("");
  });
  it("preserves the status kind", () => {
    const o = mapProgramOption({ id: "1", kind: "status", value: "closed", label: "마감", sort_order: 30 });
    expect(o.kind).toBe("status");
    expect(o.label).toBe("마감");
  });
  it("keeps display order when sorting by sort_order", () => {
    const rows = [
      { id: "3", kind: "group", value: "others", label: "기타", sort_order: 30 },
      { id: "1", kind: "group", value: "poker", label: "포커", sort_order: 10 },
      { id: "2", kind: "group", value: "social", label: "소셜", sort_order: 20 },
    ];
    const ordered = rows.map(mapProgramOption).sort((a, b) => a.sort_order - b.sort_order);
    expect(ordered.map((o) => o.value)).toEqual(["poker", "social", "others"]);
  });
});
