import type { StoredEventStatus, DerivedEventStatus } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * Event status — the SINGLE source of an event's DISPLAY state.
 *
 * Operators store only an INTENT: "auto" (let the schedule drive it) or a
 * manual override ("canceled" / "hidden"). The public-facing status
 * (예정 → 진행중 → 레지마감 → 완료) is DERIVED from the event's date +
 * start_time + reg_close_time, read in the club's timezone (KST) at the
 * current instant. Pure & side-effect free so it runs identically on the
 * server (UTC on Vercel) and the client, and is unit-testable.
 *
 * Because the derivation is read at request time, a time-based transition
 * only appears as fast as the page re-renders (ISR/revalidate). That lag is
 * acceptable — no real-time push is required.
 * ------------------------------------------------------------------ */

// The club runs on Asia/Seoul, a fixed UTC+9 with no DST — so a KST wall
// clock maps to an epoch by subtracting a constant offset.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// End-of-event heuristics (no explicit end time is stored). Named so the
// business rule reads at a glance and is tunable in one place.
export const REG_CLOSE_TO_END_MS = 4 * 60 * 60 * 1000; // reg-close + 4h
export const START_TO_END_MS = 6 * 60 * 60 * 1000; // start + 6h (no reg-close)
const DAY_MS = 24 * 60 * 60 * 1000;

const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;
const TIME_PREFIX = /^(\d{1,2}):(\d{2})/;

/** Epoch ms of a KST wall-clock time. `minutes` may exceed 59 / span days. */
function kstEpoch(y: number, mo: number, d: number, minutes: number): number {
  return Date.UTC(y, mo - 1, d, 0, minutes) - KST_OFFSET_MS;
}

/** Minutes-from-midnight for an "HH:mm" string, or null if missing/"미정". */
function parseMinutes(time: string | null | undefined): number | null {
  const t = time?.trim();
  if (!t || t === "미정") return null;
  const m = TIME_PREFIX.exec(t);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Collapse any stored / legacy / derived string to the three stored intents. */
export function toStoredStatus(status: string | null | undefined): StoredEventStatus {
  if (status === "canceled") return "canceled";
  if (status === "hidden") return "hidden";
  return "auto";
}

type DeriveInput = {
  status?: string | null;
  date?: string | null;
  start_time?: string | null;
  reg_close_time?: string | null;
};

/**
 * The event's DISPLAY status at `now` (KST-aware).
 * - Manual overrides win: stored "canceled"/"hidden" pass straight through.
 * - Legacy stored "completed" is honoured as terminal (pre-migration safety).
 * - Everything else ("auto" + legacy scheduled/confirmed/…) is time-derived.
 */
export function deriveEventStatus(event: DeriveInput, now: Date): DerivedEventStatus {
  const stored = event.status;
  if (stored === "canceled") return "canceled";
  if (stored === "hidden") return "hidden";
  // Legacy terminal string: keep it terminal even if migration hasn't run yet.
  if (stored === "completed") return "completed";

  const dm = DATE_PREFIX.exec(event.date ?? "");
  if (!dm) return "scheduled"; // undated ("미정"/null) → upcoming intent

  // ---- resolve the event's bands as KST epochs ----------------------
  // No calendar-day shortcut here: a midnight-crossing reg-close (and its
  // +4h end) belongs to the NEXT KST day, so a yesterday-dated event can
  // still be running/reg_closed shortly after midnight. Classifying purely
  // by the band epochs keeps "익일 해석" true on both sides of midnight;
  // events whose end has passed (including anything 2+ days old) fall out
  // as completed naturally.
  const y = Number(dm[1]);
  const mo = Number(dm[2]);
  const d = Number(dm[3]);
  const nowMs = now.getTime();

  const startMin = parseMinutes(event.start_time);
  const regMin = parseMinutes(event.reg_close_time);

  const startMs = startMin != null ? kstEpoch(y, mo, d, startMin) : null;
  // A reg-close earlier than the start clock means it rolls past midnight
  // (e.g. 20:00 start, 01:00 close → next day).
  const regMs =
    regMin != null
      ? kstEpoch(y, mo, d, regMin) + (startMin != null && regMin < startMin ? DAY_MS : 0)
      : null;

  const endMs =
    regMs != null
      ? regMs + REG_CLOSE_TO_END_MS
      : startMs != null
        ? startMs + START_TO_END_MS
        : kstEpoch(y, mo, d + 1, 0); // no times → end of the KST day

  if (startMs == null) {
    // Start time unknown: can't resolve a running band, so stay 예정 for the
    // day (a reg-close alone still gates 레지마감 → 완료).
    if (regMs != null) {
      if (nowMs < regMs) return "scheduled";
      return nowMs < endMs ? "reg_closed" : "completed";
    }
    return nowMs < endMs ? "scheduled" : "completed";
  }

  if (nowMs < startMs) return "scheduled";
  if (nowMs >= endMs) return "completed";
  if (regMs != null) return nowMs < regMs ? "running" : "reg_closed";
  return "running"; // started, no reg-close → live until the start+6h end
}
