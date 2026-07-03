import { describe, it, expect } from "vitest";
import { mapProgram } from "@/lib/data/programs";

describe("mapProgram", () => {
  it("normalizes a row and defaults", () => {
    const p = mapProgram({ id: "1", slug: "series", title: "도너츠 시리즈", program_group: "poker", is_hot: true });
    expect(p.slug).toBe("series");
    expect(p.is_hot).toBe(true);
    expect(p.member_count).toBe(0);
    expect(p.is_visible).toBe(true);
    expect(p.is_affiliate).toBe(false);
    expect(p.entry_link).toBeNull();
  });
  it("preserves entry_link", () => {
    const p = mapProgram({ slug: "series", title: "x", program_group: "poker", entry_link: "/series" });
    expect(p.entry_link).toBe("/series");
  });
});
