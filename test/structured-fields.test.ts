import { describe, it, expect } from "vitest";
import {
  StructuredFieldError,
  parseJsonField,
  coerceStringList,
  coerceLabelValueList,
  coerceStringRecord,
  coerceTodayLeagues,
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

describe("coerceStringList", () => {
  it("keeps non-empty strings, drops empties, coerces non-strings", () => {
    expect(coerceStringList(["a", "", "  ", 3, null])).toEqual(["a", "3"]);
  });
  it("returns [] for non-array", () => {
    expect(coerceStringList(null)).toEqual([]);
    expect(coerceStringList({})).toEqual([]);
  });
});

describe("coerceLabelValueList", () => {
  it("round-trips full shapes", () => {
    const input = [{ label: "날짜", value: "6/9" }];
    expect(coerceLabelValueList(input)).toEqual(input);
  });
  it("tolerates partial shapes without dropping the row", () => {
    expect(coerceLabelValueList([{ label: "날짜" }])).toEqual([{ label: "날짜", value: "" }]);
  });
  it("drops fully-empty rows and non-arrays", () => {
    expect(coerceLabelValueList([{ label: "", value: "" }])).toEqual([]);
    expect(coerceLabelValueList("nope")).toEqual([]);
  });
});

describe("coerceStringRecord", () => {
  it("builds a string map, skips blank keys", () => {
    expect(coerceStringRecord({ 카카오: "url", "": "x", n: 5 })).toEqual({ 카카오: "url", n: "5" });
  });
  it("returns {} for arrays/non-objects", () => {
    expect(coerceStringRecord(["a"])).toEqual({});
    expect(coerceStringRecord(null)).toEqual({});
  });
});

describe("coerceTodayLeagues", () => {
  it("keeps name, includes optional fields only when present", () => {
    expect(coerceTodayLeagues([{ name: "리그A", time: "20:00", link: "" }])).toEqual([
      { name: "리그A", time: "20:00" },
    ]);
  });
  it("drops rows without a name", () => {
    expect(coerceTodayLeagues([{ time: "20:00" }])).toEqual([]);
  });
  it("returns [] for non-array input", () => {
    expect(coerceTodayLeagues(null)).toEqual([]);
  });
  it("includes reg_close when present and omits it when empty", () => {
    expect(coerceTodayLeagues([{ name: "리그B", reg_close: "19:00" }])).toEqual([
      { name: "리그B", reg_close: "19:00" },
    ]);
    expect(coerceTodayLeagues([{ name: "리그C", reg_close: "" }])).toEqual([{ name: "리그C" }]);
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
