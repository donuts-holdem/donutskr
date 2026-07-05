"use server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth";
import { mapRow } from "@/lib/data/blindStructures";
import { buildTimerStructure, type BuildStructureError } from "@/lib/timer/parse";
import type { TimerLevel, TimerPrize } from "@/lib/types";

// Every mutating action guards on the caller's expected `version` and bumps it,
// so a stale client write no-ops (0 rows) and reports a conflict instead of
// clobbering newer state. Successful version-guarded actions return the bumped
// version so clients can adopt it immediately (rapid sequential clicks must not
// wait for the realtime echo). Returns are discriminated unions, Korean errors.
export type TimerActionResult = { ok: true; version?: number } | { ok: false; error: string };
export type CreateTimerResult = { ok: true; id: string } | { ok: false; error: string };

const CONFLICT: TimerActionResult = { ok: false, error: "conflict" };

function nowIso(): string {
  return new Date().toISOString();
}

function revalidateTimer(id: string): void {
  revalidatePath("/admin/timers");
  revalidatePath(`/admin/timers/${id}`);
}

// Best-effort audit trail — a failed log insert must not fail the action.
async function logAction(
  supabase: SupabaseClient, timerId: string, action: string, payload?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from("timer_logs").insert({ timer_id: timerId, action, payload: payload ?? null });
  } catch {
    // swallow — logging is non-critical
  }
}

function timerErrMsg(e: BuildStructureError): string {
  if (e.field === "structure") return "타이머로 만들 수 있는 레벨이 없습니다";
  const labels: Record<string, string> = {
    sb: "SB", bb: "BB", ante: "앤티", duration: "진행 시간", break_minutes: "휴식 시간",
  };
  const field = labels[e.field] ?? e.field;
  const pos = e.sortOrder + 1;
  if (e.raw === "") return `${pos}번째 행의 ${field} 값이 비어 있습니다`;
  return `${pos}번째 행의 ${field} '${e.raw}' 값을 숫자로 변환할 수 없습니다`;
}

// --------------------------------------------------------------------------
// Create
// --------------------------------------------------------------------------
export async function createTimerFromEvent(eventId: string): Promise<CreateTimerResult> {
  const supabase = await requireAdmin();

  const { data: event, error: evErr } = await supabase
    .from("events")
    .select("id, title, buy_in, starting_stack, blind_structure_id")
    .eq("id", eventId).is("deleted_at", null).maybeSingle();
  if (evErr) throw evErr;
  if (!event) return { ok: false, error: "이벤트를 찾을 수 없습니다" };
  if (!event.blind_structure_id) return { ok: false, error: "이벤트에 블라인드 스트럭처가 지정되지 않았습니다" };

  const { data: rawRows, error: rowsErr } = await supabase
    .from("blind_structure_rows").select("*").eq("structure_id", event.blind_structure_id).order("sort_order");
  if (rowsErr) throw rowsErr;

  const built = buildTimerStructure((rawRows ?? []).map(mapRow));
  if (!built.ok) return { ok: false, error: timerErrMsg(built.error) };

  const { data: created, error: insErr } = await supabase
    .from("timer_sessions")
    .insert({
      event_id: event.id, title: event.title, buy_in: event.buy_in ?? null,
      starting_stack: event.starting_stack ?? null, structure: built.structure,
    })
    .select("id").single();
  if (insErr) {
    // 23505 = unique_violation on timer_sessions_one_live_per_event
    if ((insErr as { code?: string }).code === "23505") {
      return { ok: false, error: "이미 이 이벤트의 진행 중인 타이머가 있습니다" };
    }
    throw insErr;
  }

  await logAction(supabase, created.id, "create", { event_id: event.id, levels: built.structure.length });
  revalidateTimer(created.id);
  return { ok: true, id: created.id };
}

// --------------------------------------------------------------------------
// Clock controls
// --------------------------------------------------------------------------
// start/pause retry once on a version conflict when the row is still in the
// opposite run-state: at a level boundary the background commitAdvance bumps
// the version at exactly the moment a TD hits pause (hand-for-hand!), and a
// dropped pause there is operationally serious. A retry against the fresh
// version is safe — the intent ("make it paused/running") is state-idempotent.
export async function startTimer(id: string, version: number): Promise<TimerActionResult> {
  const supabase = await requireAdmin();
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: cur, error: curErr } = await supabase
      .from("timer_sessions").select("status, version").eq("id", id).is("deleted_at", null).maybeSingle();
    if (curErr) throw curErr;
    if (!cur) return CONFLICT;
    if (cur.status !== "paused") return CONFLICT; // finished, or already running
    const v = attempt === 0 ? version : cur.version;
    if (attempt === 0 && cur.version !== version) continue; // stale — retry with fresh

    const { data, error } = await supabase
      .from("timer_sessions")
      .update({ status: "running", started_at: nowIso(), version: v + 1 })
      .eq("id", id).eq("version", v).select("id");
    if (error) throw error;
    if (data && data.length > 0) {
      await logAction(supabase, id, "start");
      revalidateTimer(id);
      return { ok: true, version: v + 1 };
    }
  }
  return CONFLICT;
}

export async function pauseTimer(id: string, version: number): Promise<TimerActionResult> {
  const supabase = await requireAdmin();
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: cur, error: curErr } = await supabase
      .from("timer_sessions")
      .select("status, version, started_at, elapsed_offset_sec")
      .eq("id", id).is("deleted_at", null).maybeSingle();
    if (curErr) throw curErr;
    if (!cur) return CONFLICT;
    if (cur.status !== "running") return CONFLICT; // already paused/finished
    const v = attempt === 0 ? version : cur.version;
    if (attempt === 0 && cur.version !== version) continue; // stale — retry with fresh

    const ranSec = cur.started_at ? Math.max(0, Math.floor((Date.now() - Date.parse(cur.started_at)) / 1000)) : 0;
    const { data, error } = await supabase
      .from("timer_sessions")
      .update({ status: "paused", started_at: null, elapsed_offset_sec: cur.elapsed_offset_sec + ranSec, version: v + 1 })
      .eq("id", id).eq("version", v).select("id");
    if (error) throw error;
    if (data && data.length > 0) {
      await logAction(supabase, id, "pause");
      revalidateTimer(id);
      return { ok: true, version: v + 1 };
    }
  }
  return CONFLICT;
}

// deltaSec > 0 ADDS time to the clock (raises remaining ⇒ lowers elapsed_offset).
// When running we first fold the in-flight run into the offset and re-anchor
// started_at to now, so the adjustment is exact regardless of elapsed run time.
export async function adjustTime(id: string, version: number, deltaSec: number): Promise<TimerActionResult> {
  const supabase = await requireAdmin();
  const { data: cur, error: curErr } = await supabase
    .from("timer_sessions")
    .select("status, started_at, elapsed_offset_sec, level_index, structure")
    .eq("id", id).eq("version", version).maybeSingle();
  if (curErr) throw curErr;
  if (!cur) return CONFLICT;

  const running = cur.status === "running" && cur.started_at != null;
  const ranSec = running ? Math.max(0, Math.floor((Date.now() - Date.parse(cur.started_at as string)) / 1000)) : 0;
  const folded = cur.elapsed_offset_sec + ranSec;
  let newOffset = Math.max(0, folded - Math.round(deltaSec));

  // A manual subtract must never roll the clock INTO the next level (a TD
  // hitting -1분 at 00:20 expects 00:00, not a level-up + blinds jump). Cap
  // the elapsed at the current level's full duration.
  if (deltaSec < 0) {
    const structure = (Array.isArray(cur.structure) ? cur.structure : []) as TimerLevel[];
    const durationSec = (structure[cur.level_index]?.duration_min ?? 0) * 60;
    if (durationSec > 0) newOffset = Math.min(newOffset, durationSec);
  }

  const { data, error } = await supabase
    .from("timer_sessions")
    .update({ elapsed_offset_sec: newOffset, started_at: running ? nowIso() : cur.started_at, version: version + 1 })
    .eq("id", id).eq("version", version).select("id");
  if (error) throw error;
  if (!data || data.length === 0) return CONFLICT;
  await logAction(supabase, id, "adjust", { deltaSec });
  revalidateTimer(id);
  return { ok: true, version: version + 1 };
}

// Set the current level's remaining time to an exact value — the standard TD
// move after a ruling ("put 10 minutes back on the clock").
export async function setRemaining(id: string, version: number, remainingSec: number): Promise<TimerActionResult> {
  const supabase = await requireAdmin();
  if (!Number.isInteger(remainingSec) || remainingSec < 0) {
    return { ok: false, error: "남은 시간은 0 이상의 초여야 합니다" };
  }
  const { data: cur, error: curErr } = await supabase
    .from("timer_sessions")
    .select("status, level_index, structure")
    .eq("id", id).eq("version", version).maybeSingle();
  if (curErr) throw curErr;
  if (!cur) return CONFLICT;

  const structure = (Array.isArray(cur.structure) ? cur.structure : []) as TimerLevel[];
  const durationSec = (structure[cur.level_index]?.duration_min ?? 0) * 60;
  if (durationSec <= 0) return { ok: false, error: "현재 레벨 정보를 찾을 수 없습니다" };
  if (remainingSec > durationSec) {
    return { ok: false, error: `이 레벨의 최대 시간은 ${Math.floor(durationSec / 60)}분입니다` };
  }

  const running = cur.status === "running";
  const { data, error } = await supabase
    .from("timer_sessions")
    .update({
      elapsed_offset_sec: durationSec - remainingSec,
      started_at: running ? nowIso() : null,
      version: version + 1,
    })
    .eq("id", id).eq("version", version).select("id");
  if (error) throw error;
  if (!data || data.length === 0) return CONFLICT;
  await logAction(supabase, id, "set_remaining", { remainingSec });
  revalidateTimer(id);
  return { ok: true, version: version + 1 };
}

export async function jumpToLevel(id: string, version: number, index: number): Promise<TimerActionResult> {
  const supabase = await requireAdmin();
  const { data: cur, error: curErr } = await supabase
    .from("timer_sessions").select("status, structure").eq("id", id).eq("version", version).maybeSingle();
  if (curErr) throw curErr;
  if (!cur) return CONFLICT;

  const structure = (Array.isArray(cur.structure) ? cur.structure : []) as TimerLevel[];
  if (!Number.isInteger(index) || index < 0 || index >= structure.length) {
    return { ok: false, error: "잘못된 레벨 번호입니다" };
  }
  const running = cur.status === "running";
  const { data, error } = await supabase
    .from("timer_sessions")
    .update({ level_index: index, elapsed_offset_sec: 0, started_at: running ? nowIso() : null, version: version + 1 })
    .eq("id", id).eq("version", version).select("id");
  if (error) throw error;
  if (!data || data.length === 0) return CONFLICT;
  await logAction(supabase, id, "jump", { index });
  revalidateTimer(id);
  return { ok: true, version: version + 1 };
}

// Persist a boundary the client already crossed visually. Idempotent: a no-op
// (expectedIndex ≤ current) returns ok without a write. Carries the overflow
// past the completed segments into elapsed_offset_sec.
export async function commitAdvance(id: string, version: number, expectedIndex: number): Promise<TimerActionResult> {
  const supabase = await requireAdmin();
  const { data: cur, error: curErr } = await supabase
    .from("timer_sessions")
    .select("status, started_at, elapsed_offset_sec, level_index, structure")
    .eq("id", id).eq("version", version).maybeSingle();
  if (curErr) throw curErr;
  if (!cur) return CONFLICT;

  if (expectedIndex <= cur.level_index) return { ok: true }; // already advanced
  const structure = (Array.isArray(cur.structure) ? cur.structure : []) as TimerLevel[];
  if (expectedIndex >= structure.length) return { ok: false, error: "잘못된 레벨 번호입니다" };

  const running = cur.status === "running" && cur.started_at != null;
  const ranSec = running ? Math.max(0, Math.floor((Date.now() - Date.parse(cur.started_at as string)) / 1000)) : 0;
  let elapsed = cur.elapsed_offset_sec + ranSec;
  for (let i = cur.level_index; i < expectedIndex; i++) {
    elapsed -= (structure[i]?.duration_min ?? 0) * 60;
  }
  const overflow = Math.max(0, Math.floor(elapsed));

  const { data, error } = await supabase
    .from("timer_sessions")
    .update({ level_index: expectedIndex, elapsed_offset_sec: overflow, started_at: running ? nowIso() : cur.started_at, version: version + 1 })
    .eq("id", id).eq("version", version).select("id");
  if (error) throw error;
  if (!data || data.length === 0) return CONFLICT;
  // Multi-boundary catch-ups (e.g. admin reopened after 40min) log from→to so
  // the audit trail shows the span, not just the destination.
  await logAction(supabase, id, "advance", { from: cur.level_index, to: expectedIndex });
  revalidateTimer(id);
  return { ok: true, version: version + 1 };
}

// --------------------------------------------------------------------------
// Counts / structure / meta
// --------------------------------------------------------------------------
// Returns the bumped version on success so rapid-fire auto-saves can adopt it
// without waiting for the realtime echo (otherwise the second keystroke in a
// row fires with a stale version and self-conflicts).
export type SetCountsResult = { ok: true; version: number } | { ok: false; error: string };
export async function setCounts(id: string, version: number, entries: number, players: number): Promise<SetCountsResult> {
  const supabase = await requireAdmin();
  if (!Number.isInteger(entries) || !Number.isInteger(players) || entries < 0 || players < 0) {
    return { ok: false, error: "엔트리·인원은 0 이상의 정수여야 합니다" };
  }
  if (players > entries) return { ok: false, error: "생존 인원은 총 엔트리보다 많을 수 없습니다" };

  const { data, error } = await supabase
    .from("timer_sessions")
    .update({ entries, players, version: version + 1 })
    .eq("id", id).eq("version", version).select("id");
  if (error) throw error;
  if (!data || data.length === 0) return { ok: false, error: "conflict" };
  await logAction(supabase, id, "counts", { entries, players });
  revalidateTimer(id);
  return { ok: true, version: version + 1 };
}

function validateStructure(structure: unknown): string | null {
  if (!Array.isArray(structure) || structure.length === 0) return "레벨이 하나 이상 필요합니다";
  for (const row of structure as TimerLevel[]) {
    if (row?.type !== "level" && row?.type !== "break") return "행 타입이 올바르지 않습니다";
    for (const f of ["sb", "bb", "ante"] as const) {
      if (typeof row[f] !== "number" || !Number.isFinite(row[f]) || row[f] < 0) return "블라인드 값은 0 이상의 숫자여야 합니다";
    }
    if (typeof row.duration_min !== "number" || !Number.isInteger(row.duration_min) || row.duration_min < 1) {
      return "진행 시간은 1분 이상의 정수여야 합니다";
    }
  }
  return null;
}

function sameLevelRow(a: TimerLevel, b: TimerLevel): boolean {
  return a.type === b.type && a.sb === b.sb && a.bb === b.bb && a.ante === b.ante
    && a.duration_min === b.duration_min && (a.name ?? null) === (b.name ?? null);
}

export async function updateStructure(id: string, version: number, structure: TimerLevel[]): Promise<TimerActionResult> {
  const supabase = await requireAdmin();
  const invalid = validateStructure(structure);
  if (invalid) return { ok: false, error: invalid };

  const { data: cur, error: curErr } = await supabase
    .from("timer_sessions")
    .select("status, level_index, elapsed_offset_sec, structure")
    .eq("id", id).eq("version", version).maybeSingle();
  if (curErr) throw curErr;
  if (!cur) return CONFLICT;

  // level_index is a POSITION: once the tournament has started, inserting or
  // deleting rows before it would silently re-point the live clock at a
  // different level (blinds jump mid-level). Lock the completed prefix — rows
  // strictly before the current index must survive the edit unchanged, which
  // also pins the current index itself. Editing the current/future rows stays
  // free (shortening the current level, adding levels, etc.).
  const started = cur.status === "running" || cur.level_index > 0 || cur.elapsed_offset_sec > 0;
  if (started) {
    const prev = (Array.isArray(cur.structure) ? cur.structure : []) as TimerLevel[];
    if (structure.length <= cur.level_index) {
      return { ok: false, error: "진행 중인 레벨보다 짧은 스트럭처로는 저장할 수 없습니다" };
    }
    for (let i = 0; i < cur.level_index; i++) {
      if (!structure[i] || !sameLevelRow(prev[i], structure[i])) {
        return { ok: false, error: "진행 중에는 완료된 레벨(현재 레벨 이전)을 수정·삭제할 수 없습니다" };
      }
    }
  }

  const clampedIndex = Math.min(Math.max(0, cur.level_index), structure.length - 1);
  const { data, error } = await supabase
    .from("timer_sessions")
    .update({ structure, level_index: clampedIndex, version: version + 1 })
    .eq("id", id).eq("version", version).select("id");
  if (error) throw error;
  if (!data || data.length === 0) return CONFLICT;
  await logAction(supabase, id, "structure", { levels: structure.length });
  revalidateTimer(id);
  return { ok: true, version: version + 1 };
}

export interface TimerMetaInput {
  title: string;
  startingStack: number | null;
  regCloseLevel: number | null;
  prizes: TimerPrize[];
}
export async function updateTimerMeta(id: string, version: number, meta: TimerMetaInput): Promise<TimerActionResult> {
  const supabase = await requireAdmin();
  const title = meta.title?.trim();
  if (!title) return { ok: false, error: "제목을 입력하세요" };
  if (meta.startingStack != null && (!Number.isInteger(meta.startingStack) || meta.startingStack < 0)) {
    return { ok: false, error: "스타팅 스택은 0 이상의 정수여야 합니다" };
  }
  if (meta.regCloseLevel != null && (!Number.isInteger(meta.regCloseLevel) || meta.regCloseLevel < 1)) {
    return { ok: false, error: "레지 마감 레벨은 1 이상의 정수여야 합니다" };
  }
  if (!Array.isArray(meta.prizes)) return { ok: false, error: "상금 정보가 올바르지 않습니다" };
  for (const p of meta.prizes) {
    if (!Number.isInteger(p?.place) || p.place < 1 || typeof p?.amount !== "string") {
      return { ok: false, error: "상금 정보가 올바르지 않습니다" };
    }
  }

  const { data, error } = await supabase
    .from("timer_sessions")
    .update({ title, starting_stack: meta.startingStack, reg_close_level: meta.regCloseLevel, prizes: meta.prizes, version: version + 1 })
    .eq("id", id).eq("version", version).select("id");
  if (error) throw error;
  if (!data || data.length === 0) return CONFLICT;
  await logAction(supabase, id, "meta");
  revalidateTimer(id);
  return { ok: true, version: version + 1 };
}

// --------------------------------------------------------------------------
// Lifecycle
// --------------------------------------------------------------------------
export async function finishTimer(id: string, version: number): Promise<TimerActionResult> {
  const supabase = await requireAdmin();
  const { data: cur, error: curErr } = await supabase
    .from("timer_sessions")
    .select("status, started_at, elapsed_offset_sec, event_id, entries, players")
    .eq("id", id).eq("version", version).neq("status", "finished").maybeSingle();
  if (curErr) throw curErr;
  if (!cur) return CONFLICT;

  // Snapshot the result onto the event BEFORE flipping status: if this write
  // fails the timer stays finishable, so a retry can still record the result.
  // Does NOT touch events.status.
  if (cur.event_id) {
    const { error: evErr } = await supabase
      .from("events")
      .update({ final_entries: cur.entries, final_players: cur.players, result_recorded_at: nowIso() })
      .eq("id", cur.event_id);
    if (evErr) throw evErr;
  }

  // Fold the in-flight run into the offset so a later reopen resumes from the
  // actual tournament position instead of the last-committed one.
  const ranSec = cur.status === "running" && cur.started_at
    ? Math.max(0, Math.floor((Date.now() - Date.parse(cur.started_at)) / 1000))
    : 0;
  const { data, error } = await supabase
    .from("timer_sessions")
    .update({
      status: "finished", finished_at: nowIso(), started_at: null,
      elapsed_offset_sec: cur.elapsed_offset_sec + ranSec, version: version + 1,
    })
    .eq("id", id).eq("version", version).neq("status", "finished").select("id");
  if (error) throw error;
  if (!data || data.length === 0) return CONFLICT;

  await logAction(supabase, id, "finish");
  revalidateTimer(id);
  return { ok: true, version: version + 1 };
}

export async function reopenTimer(id: string, version: number): Promise<TimerActionResult> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("timer_sessions")
    .update({ status: "paused", finished_at: null, version: version + 1 })
    .eq("id", id).eq("version", version).eq("status", "finished").select("id");
  if (error) {
    // 23505: a newer live timer for the same event now holds the partial
    // unique index slot — reopening would create a second live timer.
    if ((error as { code?: string }).code === "23505") {
      return { ok: false, error: "이 이벤트에 이미 진행 중인 타이머가 있어 재개할 수 없습니다" };
    }
    throw error;
  }
  if (!data || data.length === 0) return CONFLICT;
  await logAction(supabase, id, "reopen");
  revalidateTimer(id);
  return { ok: true, version: version + 1 };
}

// Soft delete, blocked while a tournament is live (guards against losing an
// in-progress timer). Allowed only when finished or when nothing has started.
export async function deleteTimer(id: string): Promise<TimerActionResult> {
  const supabase = await requireAdmin();
  // Guard inside the UPDATE itself (no TOCTOU): delete only when finished or
  // untouched. A live tournament that gains entries between render and click
  // is still protected.
  const { data, error } = await supabase
    .from("timer_sessions")
    .update({ deleted_at: nowIso() })
    .eq("id", id).is("deleted_at", null)
    .or("status.eq.finished,entries.eq.0")
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    const { data: exists } = await supabase
      .from("timer_sessions").select("id").eq("id", id).is("deleted_at", null).maybeSingle();
    return exists
      ? { ok: false, error: "진행 중인 토너먼트는 삭제할 수 없습니다. 먼저 종료하세요" }
      : { ok: false, error: "타이머를 찾을 수 없습니다" };
  }
  await logAction(supabase, id, "delete");
  revalidateTimer(id);
  return { ok: true };
}
