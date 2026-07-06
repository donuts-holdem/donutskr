import type { BlindRow, TimerLevel } from "@/lib/types";

/**
 * Parse a blind-row chip value (sb/bb/ante) into an integer. Blind rows store
 * these as free text so operators can write "없음", "100/200", etc.
 * - null / "" / "-" → 0 (treated as an explicit zero/absent value)
 * - digits (with commas/whitespace) → the integer
 * - anything else (ranges, "1k", letters) → null, meaning UNPARSEABLE. Callers
 *   keep the raw text and surface it as a warning rather than failing.
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
export interface BuildStructureWarning {
  sortOrder: number;
  levelNo: number | null;
  field: "sb" | "bb" | "ante";
  raw: string;
}
export type BuildStructureResult =
  | { ok: true; structure: TimerLevel[]; warnings: BuildStructureWarning[] }
  | { ok: false; errors: BuildStructureError[] };

/** Duration for a lone final level with no time set and no prior level to inherit from. */
const FALLBACK_FINAL_LEVEL_MIN = 20;

/**
 * Flatten blind-structure rows into the timer's level/break list. 'stage' rows
 * are skipped (they are display separators, not clock segments).
 *
 * - Non-numeric chip text ("PLO", "없음") is NOT an error: the raw text flows
 *   into the timer and is displayed verbatim; each occurrence is reported as a
 *   warning so the operator knows.
 * - A missing duration is an error — the clock cannot run without it — EXCEPT
 *   on the FINAL level, which by data-entry convention means "play until the
 *   tournament ends" and inherits the previous level's duration.
 * - ALL errors are collected (not first-only) so the caller can offer a single
 *   fix-up pass over every offending row.
 */
export function buildTimerStructure(rows: BlindRow[]): BuildStructureResult {
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
  const clockRows = sorted.filter((r) => r.row_type !== "stage");
  const structure: TimerLevel[] = [];
  const warnings: BuildStructureWarning[] = [];
  const errors: BuildStructureError[] = [];

  const chip = (row: BlindRow, field: "sb" | "bb" | "ante"): number | string => {
    const raw = row[field];
    const parsed = parseChipValue(raw);
    if (parsed !== null) return parsed;
    const text = (raw ?? "").trim();
    warnings.push({ sortOrder: row.sort_order, levelNo: row.level_no, field, raw: text });
    return text;
  };

  for (let i = 0; i < clockRows.length; i++) {
    const row = clockRows[i];

    if (row.row_type === "level") {
      const sb = chip(row, "sb");
      const bb = chip(row, "bb");
      const ante = chip(row, "ante");

      let duration = row.duration;
      if (duration == null) {
        const isLast = i === clockRows.length - 1;
        if (isLast) {
          const prevLevel = [...structure].reverse().find((l) => l.type === "level" && l.duration_min > 0);
          duration = prevLevel?.duration_min ?? FALLBACK_FINAL_LEVEL_MIN;
        } else {
          errors.push({ sortOrder: row.sort_order, field: "duration", raw: "" });
          duration = 0; // placeholder — errors are returned before this is used
        }
      }
      structure.push({ type: "level", level_no: row.level_no, name: null, sb, bb, ante, duration_min: duration });
    } else {
      // break
      if (row.break_minutes == null) {
        errors.push({ sortOrder: row.sort_order, field: "break_minutes", raw: "" });
        continue;
      }
      structure.push({ type: "break", level_no: null, name: row.break_name, sb: 0, bb: 0, ante: 0, duration_min: row.break_minutes });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  if (structure.length === 0) return { ok: false, errors: [{ sortOrder: -1, field: "structure", raw: "" }] };
  return { ok: true, structure, warnings };
}
