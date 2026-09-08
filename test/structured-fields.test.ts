import { describe, it, expect } from "vitest";
import {
  StructuredFieldError,
  parseJsonField,
  coerceSponsors,
} from "@/lib/admin/structured-fields";

describe("parseJsonField", () => {
  it("returns null for empty/whitespace", () => {
    expect(parseJsonField("", "x")).toBeNull();
    expect(parseJsonField("   ", "x")).toBeNull();
    expect(parseJsonField(null, "x")).toBeNull();
  });
  it("parses valid JSON", () => {
    expect(parseJsonField('["a","b"]', "x")).toEqual(["a", "b"]);
  });
  it("throws StructuredFieldError on malformed JSON (no silent fallback)", () => {
    expect(() => parseJsonField("[oops", "갤러리")).toThrow(StructuredFieldError);
    expect(() => parseJsonField("[oops", "갤러리")).toThrow(/갤러리/);
  });
});

describe("coerceSponsors", () => {
  it("keeps name, includes logo/url only when present", () => {
    expect(coerceSponsors([{ name: "스폰서", logo: "l.png", url: "" }])).toEqual([
      { name: "스폰서", logo: "l.png" },
    ]);
  });
  it("drops nameless rows and non-arrays", () => {
    expect(coerceSponsors([{ logo: "x" }])).toEqual([]);
    expect(coerceSponsors(null)).toEqual([]);
  });
});
