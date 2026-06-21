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
    expect(p.external_url).toBeNull();
  });
  it("preserves external_url for series→/series link", () => {
    const p = mapProgram({ slug: "series", title: "x", program_group: "poker", external_url: "/series" });
    expect(p.external_url).toBe("/series");
  });
});
