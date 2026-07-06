import type { BlindRow, TimerLevel } from "@/lib/types";

/**
 * Parse a blind-row chip value (sb/bb/ante) into an integer. Blind rows store
 * these as free text so operators can write "없음", "100/200", etc.
 * - null / "" / "-" → 0 (treated as an explicit zero/absent value)
 * - digits (with commas/whitespace) → the integer
 * - anything else (ranges, "1k", letters) → null, meaning UNPARSEABLE. Callers
 *   surface this as an error rather than silently coercing.
 */
export function parseChipValue(raw: string | null): number | null {
  if (raw === null) return 0;
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "-") return 0;
  const compact = trimmed.replace(/[,\s]/g, "");
  if (/^\d+$/.test(compact)) return parseInt(compact, 10);
  return null;
}

export interface BuildStructureError {
  sortOrder: number;
  field: string;
  raw: string;
}
export type BuildStructureResult =
  | { ok: true; structure: TimerLevel[] }
  | { ok: false; error: BuildStructureError };

/** Duration for a lone final level with no time set and no prior level to inherit from. */
const FALLBACK_FINAL_LEVEL_MIN = 20;

/**
 * Flatten blind-structure rows into the timer's level/break list. 'stage' rows
 * are skipped (they are display separators, not clock segments). Any unparseable
 * chip value or missing duration returns an error identifying the offending row —
 * except an empty duration on the FINAL level, which by data-entry convention
 * means "play until the tournament ends"; it inherits the previous level's
 * duration (the clock freezes at 0:00 on the last level, so the TD just plays on
 * or adds time).
 */
export function buildTimerStructure(rows: BlindRow[]): BuildStructureResult {
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
  const clockRows = sorted.filter((r) => r.row_type !== "stage");
  const structure: TimerLevel[] = [];

  for (let i = 0; i < clockRows.length; i++) {
    const row = clockRows[i];

    if (row.row_type === "level") {
      const sb = parseChipValue(row.sb);
      if (sb === null) return { ok: false, error: { sortOrder: row.sort_order, field: "sb", raw: row.sb ?? "" } };
      const bb = parseChipValue(row.bb);
      if (bb === null) return { ok: false, error: { sortOrder: row.sort_order, field: "bb", raw: row.bb ?? "" } };
      const ante = parseChipValue(row.ante);
      if (ante === null) return { ok: false, error: { sortOrder: row.sort_order, field: "ante", raw: row.ante ?? "" } };

      let duration = row.duration;
      if (duration == null) {
        const isLast = i === clockRows.length - 1;
        if (!isLast) return { ok: false, error: { sortOrder: row.sort_order, field: "duration", raw: "" } };
        const prevLevel = [...structure].reverse().find((l) => l.type === "level");
        duration = prevLevel?.duration_min ?? FALLBACK_FINAL_LEVEL_MIN;
      }
      structure.push({ type: "level", level_no: row.level_no, name: null, sb, bb, ante, duration_min: duration });
    } else {
      // break
      if (row.break_minutes == null) return { ok: false, error: { sortOrder: row.sort_order, field: "break_minutes", raw: "" } };
      structure.push({ type: "break", level_no: null, name: row.break_name, sb: 0, bb: 0, ante: 0, duration_min: row.break_minutes });
    }
  }

  if (structure.length === 0) return { ok: false, error: { sortOrder: -1, field: "structure", raw: "" } };
  return { ok: true, structure };
}
