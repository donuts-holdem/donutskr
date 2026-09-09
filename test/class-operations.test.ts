import { describe, expect, it } from "vitest";
import { parseSeoulDateTime, toSeoulInput } from "@/lib/classes/format";

describe("class schedule dates", () => {
  it("converts the Seoul input to UTC independently of the server timezone", () => {
    expect(parseSeoulDateTime("2026-09-10T19:30")).toBe("2026-09-10T10:30:00.000Z");
    expect(toSeoulInput("2026-09-10T10:30:00.000Z")).toBe("2026-09-10T19:30");
  });
  it.each(["", "2026-02-30T12:00", "2026-09-10", "2026-09-10T24:00", "2026-09-10T12:99", "2026-09-10T12:00Z"])("rejects an invalid local date: %s", value => {
    expect(() => parseSeoulDateTime(value)).toThrow();
  });
  it("handles leap days and midnight date boundaries", () => {
    expect(parseSeoulDateTime("2028-02-29T00:00")).toBe("2028-02-28T15:00:00.000Z");
    expect(() => parseSeoulDateTime("2026-02-29T00:00")).toThrow();
  });
});
