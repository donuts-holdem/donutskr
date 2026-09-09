"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { formText, requireUuid } from "@/lib/membership/validation";
import { refreshOperations, requireEntityOperator } from "@/lib/membership/operations";
import { operationErrorMessage } from "@/lib/membership/operation-errors";
import { parseSeoulDateTime } from "@/lib/classes/format";
import type { FormState } from "@/lib/membership/types";

function revisionOf(form: FormData) {
  const revision = Number(formText(form, "revision"));
  if (!Number.isInteger(revision) || revision < 1) throw new Error("새로고침 후 최신 회차 상태에서 다시 시도해 주세요.");
  return revision;
}

export async function addClassSession(_state: FormState, form: FormData): Promise<FormState> {
  const supabase = await requireAdmin();
  let payload: Record<string, unknown>;
  try { payload = { p_class_id: requireUuid(formText(form, "class_id")), p_expected_revision: revisionOf(form), p_scheduled_at: parseSeoulDateTime(formText(form, "scheduled_at")) }; }
  catch (error) { return { error: error instanceof Error ? error.message : "회차 날짜를 확인해 주세요." }; }
  const result = await supabase.rpc("add_class_session", payload);
  if (result.error) return { error: operationErrorMessage(result.error) };
  refreshOperations();
  return { success: "회차를 추가했습니다. 기존 회차의 번호와 기록은 유지됩니다." };
}

export async function rescheduleClassSessions(_state: FormState, form: FormData): Promise<FormState> {
  let classId: string; let payload: Record<string, unknown>;
  try {
    classId = requireUuid(formText(form, "class_id"));
    const moveFuture = form.get("move_future") === "on";
    const reason = formText(form, "reason");
    if (!reason || reason.length > 500) throw new Error("일정 변경 사유를 1~500자로 입력해 주세요.");
    if (moveFuture && form.get("confirm_shift") !== "on") throw new Error("이후 예정 회차의 변경 전·후 날짜를 확인해 주세요.");
    const expected: unknown = JSON.parse(formText(form, "expected"));
    if (!expected || typeof expected !== "object" || Array.isArray(expected)) throw new Error("변경 대상을 다시 확인해 주세요.");
    payload = { p_session_id: requireUuid(formText(form, "session_id")), p_scheduled_at: parseSeoulDateTime(formText(form, "scheduled_at")),
      p_move_future: moveFuture, p_expected: expected, p_reason: reason };
  } catch (error) { return { error: error instanceof Error ? error.message : "일정 변경값을 확인해 주세요." }; }
  const { supabase } = await requireEntityOperator("CLASS", classId);
  const result = await supabase.rpc("reschedule_class_sessions", payload);
  if (result.error) return { error: operationErrorMessage(result.error) };
  refreshOperations();
  return { success: "확인한 회차의 날짜와 시간을 변경했습니다." };
}

export async function changeClassSession(_state: FormState, form: FormData): Promise<FormState> {
  let classId: string; let mode: string; let payload: Record<string, unknown>;
  try {
    classId = requireUuid(formText(form, "class_id"));
    mode = formText(form, "mode");
    const allowed = ["START", "REVERT_START", "SAVE_ATTENDANCE", "MISSING_AS_ABSENT", "ADD_ATTENDEE", "LOCK", "UNLOCK", "COMPLETE", "CANCEL", "RESTORE_CANCEL", "DELETE"];
    if (!allowed.includes(mode)) throw new Error("회차 작업을 다시 선택해 주세요.");
    if (["MISSING_AS_ABSENT", "CANCEL", "RESTORE_CANCEL", "DELETE", "REVERT_START"].includes(mode) && form.get("confirm") !== "on") throw new Error("작업 안내를 확인해 주세요.");
    const marks: Record<string, string> = {};
    if (mode === "SAVE_ATTENDANCE") {
      for (const [key, value] of form.entries()) {
        if (!key.startsWith("mark:")) continue;
        const userId = requireUuid(key.slice(5));
        if (typeof value !== "string" || !["UNCONFIRMED", "PRESENT", "ABSENT"].includes(value)) throw new Error("각 회원의 출석 상태를 확인해 주세요.");
        marks[userId] = value;
      }
    }
    payload = { p_session_id: requireUuid(formText(form, "session_id")), p_expected_revision: revisionOf(form), p_action: mode,
      p_reason: formText(form, "reason") || null, p_marks: mode === "SAVE_ATTENDANCE" ? marks : null,
      p_user_id: mode === "ADD_ATTENDEE" ? requireUuid(formText(form, "user_id")) : null };
  } catch (error) { return { error: error instanceof Error ? error.message : "회차 입력값을 확인해 주세요." }; }
  const context = await requireEntityOperator("CLASS", classId);
  const result = await context.supabase.rpc("change_class_session", payload);
  if (result.error) return { error: operationErrorMessage(result.error) };
  refreshOperations();
  if (mode === "DELETE") redirect(`${context.isAdmin ? "/admin/classes" : "/leader/class"}/${classId}`);
  return { success: "회차 작업을 반영하고 변경 이력을 기록했습니다." };
}
