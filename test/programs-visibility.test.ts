import { describe, it, expect } from "vitest";
import { isProgramExpired, isProgramPublic } from "@/lib/visibility";
import { todayKST } from "@/lib/schedule";

/* ------------------------------------------------------------------ *
 * The public program list hides anything past its (inclusive) end date
 * in KST; admin views keep showing it. isProgramExpired is the pure
 * rule the SQL filter (lib/data/programs.ts) mirrors, so a table of
 * end_date × today cases pins the boundary behaviour.
 * ------------------------------------------------------------------ */

const TODAY = "2026-07-04";

describe("isProgramExpired", () => {
  const cases: { name: string; end_date: string | null; expired: boolean }[] = [
    { name: "no end date never expires", end_date: null, expired: false },
    { name: "future end date is live", end_date: "2026-07-05", expired: false },
    { name: "end date == today is live (inclusive)", end_date: "2026-07-04", expired: false },
    { name: "past end date is expired", end_date: "2026-07-03", expired: true },
    { name: "far past end date is expired", end_date: "2025-01-01", expired: true },
    { name: "ISO timestamp end date compares on the date part", end_date: "2026-07-04T23:59:59Z", expired: false },
  ];

  for (const c of cases) {
    it(c.name, () => {
      expect(isProgramExpired({ end_date: c.end_date }, TODAY)).toBe(c.expired);
      // isProgramPublic is the exact complement.
      expect(isProgramPublic({ end_date: c.end_date }, TODAY)).toBe(!c.expired);
    });
  }
});

describe("todayKST boundary (feeds the expiry filter)", () => {
  it("just before KST midnight stays on the current day", () => {
    // 2026-07-04 14:59 UTC == 2026-07-04 23:59 KST
    expect(todayKST(new Date("2026-07-04T14:59:00Z"))).toBe("2026-07-04");
  });
  it("at KST midnight rolls over to the next day", () => {
    // 2026-07-04 15:00 UTC == 2026-07-05 00:00 KST
    expect(todayKST(new Date("2026-07-04T15:00:00Z"))).toBe("2026-07-05");
  });
  it("a program ending 2026-07-04 is live at 23:59 KST, expired at 00:00 KST next day", () => {
    const program = { end_date: "2026-07-04" };
    expect(isProgramExpired(program, todayKST(new Date("2026-07-04T14:59:00Z")))).toBe(false);
    expect(isProgramExpired(program, todayKST(new Date("2026-07-04T15:00:00Z")))).toBe(true);
  });
});
