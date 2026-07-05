import { describe, it, expect } from "vitest";
import { deriveTimerState, totalChips, avgStack, avgStackBB } from "@/lib/timer/state";
import type { TimerLevel, TimerSession } from "@/lib/types";

const L = (level_no: number, duration_min: number, sb = 100, bb = 200): TimerLevel => ({
  type: "level", level_no, name: null, sb, bb, ante: 0, duration_min,
});
const B = (duration_min: number): TimerLevel => ({
  type: "break", level_no: null, name: "휴식", sb: 0, bb: 0, ante: 0, duration_min,
});

// L1(20m) L2(20m) BREAK(10m) L3(20m)
const structure: TimerLevel[] = [L(1, 20), L(2, 20), B(10), L(3, 20)];

const T0 = "2026-07-05T00:00:00.000Z";
const t0 = Date.parse(T0);
const at = (sec: number) => t0 + sec * 1000;

const session = (over: Partial<TimerSession>): TimerSession => ({
  id: "t", event_id: null, title: "T", buy_in: null, starting_stack: 30000,
  structure, status: "paused", started_at: null, elapsed_offset_sec: 0, level_index: 0,
  entries: 0, players: 0, reg_close_level: null, prizes: [], finished_at: null,
  version: 0, created_at: "", updated_at: "",
  ...over,
});

describe("deriveTimerState — running countdown", () => {
  it("counts down from started_at + offset", () => {
    const s = session({ status: "running", started_at: T0, level_index: 0 });
    const d = deriveTimerState(s, at(300)); // 5 min in
    expect(d.levelIndex).toBe(0);
    expect(d.remainingSec).toBe(1200 - 300);
    expect(d.displayLevelNo).toBe(1);
    expect(d.isBreak).toBe(false);
  });
});

describe("deriveTimerState — pause freezes", () => {
  it("ignores wall clock while paused", () => {
    const s = session({ status: "paused", started_at: null, elapsed_offset_sec: 300, level_index: 0 });
    const d = deriveTimerState(s, at(999999));
    expect(d.remainingSec).toBe(1200 - 300);
    expect(d.levelIndex).toBe(0);
  });
});

describe("deriveTimerState — visual auto-advance", () => {
  it("advances one boundary", () => {
    const s = session({ status: "running", started_at: T0, level_index: 0 });
    const d = deriveTimerState(s, at(1300)); // 100s into L2
    expect(d.levelIndex).toBe(1);
    expect(d.remainingSec).toBe(1200 - 100);
    expect(d.displayLevelNo).toBe(2);
  });

  it("advances multiple boundaries into a break", () => {
    const s = session({ status: "running", started_at: T0, level_index: 0 });
    const d = deriveTimerState(s, at(1200 + 1200 + 300)); // 300s into the break
    expect(d.levelIndex).toBe(2);
    expect(d.isBreak).toBe(true);
    expect(d.remainingSec).toBe(600 - 300);
    expect(d.displayLevelNo).toBeNull();
    expect(d.nextLevelRow?.level_no).toBe(3);
  });
});

describe("deriveTimerState — last row exhausted", () => {
  it("clamps remaining to 0 when elapsed exceeds the final level", () => {
    const s = session({ status: "paused", started_at: null, elapsed_offset_sec: 999999, level_index: 3 });
    const d = deriveTimerState(s, at(0));
    expect(d.levelIndex).toBe(3);
    expect(d.remainingSec).toBe(0);
    expect(d.nextLevelRow).toBeNull();
    expect(d.timeToNextBreakSec).toBeNull();
  });
});

describe("deriveTimerState — timeToNextBreakSec", () => {
  it("sums remaining + full durations up to the next break", () => {
    const s = session({ status: "paused", elapsed_offset_sec: 0, level_index: 0 });
    const d = deriveTimerState(s, at(0));
    expect(d.timeToNextBreakSec).toBe(1200 + 1200); // rest of L1 + all of L2
    expect(d.nextBreakDurationMin).toBe(10);
  });
});

describe("deriveTimerState — regOpen boundary", () => {
  it("open on a level ≤ reg_close_level, closed once past it", () => {
    const open = deriveTimerState(session({ reg_close_level: 2, level_index: 0 }), at(0));
    expect(open.regOpen).toBe(true);
    const closed = deriveTimerState(session({ reg_close_level: 2, level_index: 3 }), at(0));
    expect(closed.regOpen).toBe(false); // L3 > 2
  });
  it("open for every level when reg_close_level is null", () => {
    expect(deriveTimerState(session({ reg_close_level: null, level_index: 3 }), at(0)).regOpen).toBe(true);
  });
});

describe("chip helpers", () => {
  it("totalChips = entries × starting_stack", () => {
    expect(totalChips(session({ entries: 100, starting_stack: 30000 }))).toBe(3_000_000);
  });
  it("avgStack divides total by players (not entries)", () => {
    expect(avgStack(session({ entries: 100, players: 40, starting_stack: 30000 }))).toBe(75_000);
  });
  it("avgStack is null when no players survive", () => {
    expect(avgStack(session({ entries: 100, players: 0, starting_stack: 30000 }))).toBeNull();
  });
  it("avgStackBB divides the average stack by the big blind", () => {
    expect(avgStackBB(session({ entries: 100, players: 40, starting_stack: 30000 }), 1000)).toBe(75);
    expect(avgStackBB(session({ entries: 100, players: 0, starting_stack: 30000 }), 1000)).toBeNull();
  });
});
