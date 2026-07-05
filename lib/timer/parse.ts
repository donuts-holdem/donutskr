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

/**
 * Flatten blind-structure rows into the timer's level/break list. 'stage' rows
 * are skipped (they are display separators, not clock segments). Any unparseable
 * chip value or missing duration returns an error identifying the offending row.
 */
export function buildTimerStructure(rows: BlindRow[]): BuildStructureResult {
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
  const structure: TimerLevel[] = [];

  for (const row of sorted) {
    if (row.row_type === "stage") continue;

    if (row.row_type === "level") {
      const sb = parseChipValue(row.sb);
      if (sb === null) return { ok: false, error: { sortOrder: row.sort_order, field: "sb", raw: row.sb ?? "" } };
      const bb = parseChipValue(row.bb);
      if (bb === null) return { ok: false, error: { sortOrder: row.sort_order, field: "bb", raw: row.bb ?? "" } };
      const ante = parseChipValue(row.ante);
      if (ante === null) return { ok: false, error: { sortOrder: row.sort_order, field: "ante", raw: row.ante ?? "" } };
      if (row.duration == null) return { ok: false, error: { sortOrder: row.sort_order, field: "duration", raw: "" } };
      structure.push({ type: "level", level_no: row.level_no, name: null, sb, bb, ante, duration_min: row.duration });
    } else {
      // break
      if (row.break_minutes == null) return { ok: false, error: { sortOrder: row.sort_order, field: "break_minutes", raw: "" } };
      structure.push({ type: "break", level_no: null, name: row.break_name, sb: 0, bb: 0, ante: 0, duration_min: row.break_minutes });
    }
  }

  if (structure.length === 0) return { ok: false, error: { sortOrder: -1, field: "structure", raw: "" } };
  return { ok: true, structure };
}
