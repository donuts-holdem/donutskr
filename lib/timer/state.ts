import type { TimerLevel, TimerSession } from "@/lib/types";

export interface DerivedTimerState {
  /** Visual level index after auto-advancing past exhausted segments. */
  levelIndex: number;
  row: TimerLevel;
  /** Seconds left in the current segment, clamped ≥ 0. */
  remainingSec: number;
  isBreak: boolean;
  /** Next 'level'-type row after the current index, or null if none ahead. */
  nextLevelRow: TimerLevel | null;
  /** Seconds until the next 'break' row begins, or null if none ahead. */
  timeToNextBreakSec: number | null;
  nextBreakDurationMin: number | null;
  regOpen: boolean;
  isFinished: boolean;
  /** level_no for level rows, null for breaks. */
  displayLevelNo: number | null;
}

function clampIndex(i: number, len: number): number {
  if (len === 0) return 0;
  if (i < 0) return 0;
  if (i >= len) return len - 1;
  return i;
}

/**
 * Pure derivation of the visible clock from a session's anchor state.
 *
 * Anchor model: elapsed-in-segment = elapsed_offset_sec + (running ? now-started_at : 0).
 * Starting at level_index we walk forward through the structure, consuming each
 * segment's full duration while elapsed still overflows it and a next row exists.
 * This "visual auto-advance" is read-only — the DB row is never mutated here; a
 * separate server action (commitAdvance) persists the boundary crossing.
 */
export function deriveTimerState(session: TimerSession, nowMs: number): DerivedTimerState {
  const structure = session.structure;
  const isFinished = session.status === "finished";

  // Empty structure — degenerate but must not throw.
  if (structure.length === 0) {
    const empty: TimerLevel = { type: "level", level_no: null, name: null, sb: 0, bb: 0, ante: 0, duration_min: 0 };
    return {
      levelIndex: 0, row: empty, remainingSec: 0, isBreak: false, nextLevelRow: null,
      timeToNextBreakSec: null, nextBreakDurationMin: null,
      regOpen: session.reg_close_level == null, isFinished, displayLevelNo: null,
    };
  }

  const running = session.status === "running" && session.started_at != null;
  const runSec = running ? Math.max(0, (nowMs - Date.parse(session.started_at as string)) / 1000) : 0;
  let elapsed = session.elapsed_offset_sec + runSec;

  let index = clampIndex(session.level_index, structure.length);
  while (index < structure.length - 1 && elapsed >= structure[index].duration_min * 60) {
    elapsed -= structure[index].duration_min * 60;
    index += 1;
  }

  const row = structure[index];
  const durationSec = row.duration_min * 60;
  let remainingSec = Math.max(0, durationSec - elapsed);
  // Finished sessions freeze the display at 0.
  if (isFinished) remainingSec = 0;

  const isBreak = row.type === "break";

  let nextLevelRow: TimerLevel | null = null;
  for (let i = index + 1; i < structure.length; i++) {
    if (structure[i].type === "level") { nextLevelRow = structure[i]; break; }
  }

  // Time until the next break begins: remaining in this segment plus the full
  // duration of every segment between here and that break (exclusive).
  let timeToNextBreakSec: number | null = null;
  let nextBreakDurationMin: number | null = null;
  let acc = remainingSec;
  for (let i = index + 1; i < structure.length; i++) {
    if (structure[i].type === "break") {
      timeToNextBreakSec = acc;
      nextBreakDurationMin = structure[i].duration_min;
      break;
    }
    acc += structure[i].duration_min * 60;
  }

  return {
    levelIndex: index,
    row,
    remainingSec,
    isBreak,
    nextLevelRow,
    timeToNextBreakSec,
    nextBreakDurationMin,
    regOpen: regOpenFor(structure, index, session.reg_close_level),
    isFinished,
    displayLevelNo: row.type === "level" ? row.level_no : null,
  };
}

/**
 * Registration is open until the END of level `reg_close_level`. On a level row
 * reg is open while level_no ≤ reg_close_level (that level is still in progress);
 * on a break row reg is closed once the level that just finished ≥ reg_close_level.
 */
function regOpenFor(structure: TimerLevel[], index: number, regCloseLevel: number | null): boolean {
  if (regCloseLevel == null) return true;
  const row = structure[index];
  if (row.type === "level") {
    return row.level_no == null ? true : row.level_no <= regCloseLevel;
  }
  let precedingLevelNo: number | null = null;
  for (let i = index - 1; i >= 0; i--) {
    if (structure[i].type === "level" && structure[i].level_no != null) {
      precedingLevelNo = structure[i].level_no;
      break;
    }
  }
  if (precedingLevelNo == null) return true;
  return precedingLevelNo < regCloseLevel;
}

export function totalChips(session: TimerSession): number {
  return session.entries * (session.starting_stack ?? 0);
}

export function avgStack(session: TimerSession): number | null {
  return session.players > 0 ? Math.floor(totalChips(session) / session.players) : null;
}

export function avgStackBB(session: TimerSession, bb: number): number | null {
  const avg = avgStack(session);
  if (avg == null || bb <= 0) return null;
  return Math.floor(avg / bb);
}
