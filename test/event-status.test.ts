import { describe, it, expect } from "vitest";
import { deriveEventStatus, toStoredStatus } from "@/lib/site/event-status";
import type { DerivedEventStatus } from "@/lib/site/types";

/* ------------------------------------------------------------------ *
 * deriveEventStatus — the single source of an event's DISPLAY status,
 * computed from its stored intent (auto/canceled/hidden) plus the
 * schedule times, read in KST at `now`. Table-driven so every temporal
 * band, the midnight-crossing reg-close, missing time fields, legacy
 * stored strings, and the canceled/hidden overrides are pinned.
 * ------------------------------------------------------------------ */

// A KST wall-clock instant as a real Date (Asia/Seoul is a fixed UTC+9).
const kst = (iso: string) => new Date(`${iso}+09:00`);

type Row = {
  name: string;
  event: {
    status?: string | null;
    date?: string | null;
    start_time?: string | null;
    reg_close_time?: string | null;
  };
  now: Date;
  expect: DerivedEventStatus;
};

const rows: Row[] = [
  // ---- operator overrides win over the clock -----------------------
  {
    name: "stored canceled → canceled (even for a future dated event)",
    event: { status: "canceled", date: "2999-01-01", start_time: "14:00" },
    now: kst("2026-07-04T12:00:00"),
    expect: "canceled",
  },
  {
    name: "stored hidden → hidden",
    event: { status: "hidden", date: "2026-07-04", start_time: "14:00" },
    now: kst("2026-07-04T12:00:00"),
    expect: "hidden",
  },

  // ---- date-only bands ---------------------------------------------
  {
    name: "auto, no date → scheduled",
    event: { status: "auto", date: null },
    now: kst("2026-07-04T12:00:00"),
    expect: "scheduled",
  },
  {
    name: "auto, unparseable date (미정) → scheduled",
    event: { status: "auto", date: "미정" },
    now: kst("2026-07-04T12:00:00"),
    expect: "scheduled",
  },
  {
    name: "auto, future date → scheduled",
    event: { status: "auto", date: "2026-07-05", start_time: "14:00", reg_close_time: "16:00" },
    now: kst("2026-07-04T23:59:00"),
    expect: "scheduled",
  },
  {
    name: "auto, past date → completed",
    event: { status: "auto", date: "2026-07-03", start_time: "14:00", reg_close_time: "16:00" },
    now: kst("2026-07-04T00:01:00"),
    expect: "completed",
  },

  // ---- same-day intra-day bands (start 14:00, reg 16:00) -----------
  {
    name: "today, before start → scheduled",
    event: { status: "auto", date: "2026-07-04", start_time: "14:00", reg_close_time: "16:00" },
    now: kst("2026-07-04T13:59:00"),
    expect: "scheduled",
  },
  {
    name: "today, exactly at start → running",
    event: { status: "auto", date: "2026-07-04", start_time: "14:00", reg_close_time: "16:00" },
    now: kst("2026-07-04T14:00:00"),
    expect: "running",
  },
  {
    name: "today, between start and reg-close → running",
    event: { status: "auto", date: "2026-07-04", start_time: "14:00", reg_close_time: "16:00" },
    now: kst("2026-07-04T15:00:00"),
    expect: "running",
  },
  {
    name: "today, exactly at reg-close → reg_closed",
    event: { status: "auto", date: "2026-07-04", start_time: "14:00", reg_close_time: "16:00" },
    now: kst("2026-07-04T16:00:00"),
    expect: "reg_closed",
  },
  {
    name: "today, after reg-close but before end (reg+4h) → reg_closed",
    event: { status: "auto", date: "2026-07-04", start_time: "14:00", reg_close_time: "16:00" },
    now: kst("2026-07-04T19:59:00"),
    expect: "reg_closed",
  },
  {
    name: "today, after end (reg+4h) → completed",
    event: { status: "auto", date: "2026-07-04", start_time: "14:00", reg_close_time: "16:00" },
    now: kst("2026-07-04T20:01:00"),
    expect: "completed",
  },

  // ---- midnight-crossing reg-close (start 20:00, reg 01:00) --------
  {
    name: "midnight-cross, before start → scheduled",
    event: { status: "auto", date: "2026-07-04", start_time: "20:00", reg_close_time: "01:00" },
    now: kst("2026-07-04T19:00:00"),
    expect: "scheduled",
  },
  {
    name: "midnight-cross, after start, before next-day reg → running",
    event: { status: "auto", date: "2026-07-04", start_time: "20:00", reg_close_time: "01:00" },
    now: kst("2026-07-04T23:30:00"),
    expect: "running",
  },
  {
    name: "midnight-cross, past midnight but before next-day reg (00:30) → still running",
    event: { status: "auto", date: "2026-07-04", start_time: "20:00", reg_close_time: "01:00" },
    now: kst("2026-07-05T00:30:00"),
    expect: "running",
  },
  {
    name: "midnight-cross, next day between reg (01:00) and end (05:00) → reg_closed",
    event: { status: "auto", date: "2026-07-04", start_time: "20:00", reg_close_time: "01:00" },
    now: kst("2026-07-05T02:00:00"),
    expect: "reg_closed",
  },
  {
    name: "midnight-cross, next day past end (reg 01:00 + 4h = 05:00) → completed",
    event: { status: "auto", date: "2026-07-04", start_time: "20:00", reg_close_time: "01:00" },
    now: kst("2026-07-05T06:00:00"),
    expect: "completed",
  },
  {
    name: "yesterday-dated NON-crossing event at 00:30 → completed (unchanged)",
    event: { status: "auto", date: "2026-07-04", start_time: "14:00", reg_close_time: "16:00" },
    now: kst("2026-07-05T00:30:00"),
    expect: "completed",
  },

  // ---- missing time fields -----------------------------------------
  {
    name: "today, start 미정 → scheduled all day",
    event: { status: "auto", date: "2026-07-04", start_time: "미정", reg_close_time: null },
    now: kst("2026-07-04T15:00:00"),
    expect: "scheduled",
  },
  {
    name: "today, start set but no reg-close, within start+6h → running",
    event: { status: "auto", date: "2026-07-04", start_time: "14:00", reg_close_time: null },
    now: kst("2026-07-04T15:00:00"),
    expect: "running",
  },
  {
    name: "today, start set but no reg-close, past start+6h → completed",
    event: { status: "auto", date: "2026-07-04", start_time: "14:00", reg_close_time: null },
    now: kst("2026-07-04T20:30:00"),
    expect: "completed",
  },

  // ---- legacy stored strings (pre-migration safety) ----------------
  {
    name: "legacy completed → completed (kept)",
    event: { status: "completed", date: "2999-01-01" },
    now: kst("2026-07-04T12:00:00"),
    expect: "completed",
  },
  {
    name: "legacy scheduled with future date → scheduled (treated as auto)",
    event: { status: "scheduled", date: "2026-07-05" },
    now: kst("2026-07-04T12:00:00"),
    expect: "scheduled",
  },
  {
    name: "legacy confirmed today before start → scheduled (treated as auto)",
    event: { status: "confirmed", date: "2026-07-04", start_time: "14:00" },
    now: kst("2026-07-04T10:00:00"),
    expect: "scheduled",
  },
  {
    name: "unknown stored value with past date → completed (treated as auto)",
    event: { status: "weird", date: "2026-07-03" },
    now: kst("2026-07-04T12:00:00"),
    expect: "completed",
  },
  {
    name: "null stored status → treated as auto",
    event: { status: null, date: "2026-07-05" },
    now: kst("2026-07-04T12:00:00"),
    expect: "scheduled",
  },
];

describe("deriveEventStatus", () => {
  for (const row of rows) {
    it(row.name, () => {
      expect(deriveEventStatus(row.event, row.now)).toBe(row.expect);
    });
  }

  it("uses KST wall-clock, not the host UTC day boundary", () => {
    // 2026-07-04 23:30 KST is still 2026-07-04 in Seoul (14:30 UTC).
    const now = kst("2026-07-04T23:30:00");
    expect(deriveEventStatus({ status: "auto", date: "2026-07-04", start_time: "23:00" }, now)).toBe("running");
    // …but the same instant in a naive UTC read would already be the 4th at 14:30.
    expect(deriveEventStatus({ status: "auto", date: "2026-07-05" }, now)).toBe("scheduled");
  });
});

describe("toStoredStatus", () => {
  it("keeps the three operator intents", () => {
    expect(toStoredStatus("auto")).toBe("auto");
    expect(toStoredStatus("canceled")).toBe("canceled");
    expect(toStoredStatus("hidden")).toBe("hidden");
  });
  it("collapses legacy/derived strings to auto", () => {
    expect(toStoredStatus("scheduled")).toBe("auto");
    expect(toStoredStatus("confirmed")).toBe("auto");
    expect(toStoredStatus("running")).toBe("auto");
    expect(toStoredStatus("reg_closed")).toBe("auto");
    expect(toStoredStatus("completed")).toBe("auto");
    expect(toStoredStatus("weird")).toBe("auto");
    expect(toStoredStatus(null)).toBe("auto");
    expect(toStoredStatus(undefined)).toBe("auto");
  });
});
