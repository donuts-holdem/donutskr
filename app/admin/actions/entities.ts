"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { formText, requireUuid } from "@/lib/membership/validation";
import { refreshOperations } from "@/lib/membership/operations";
import { operationErrorMessage } from "@/lib/membership/operation-errors";
import { parseSeoulDateTime } from "@/lib/classes/format";
import type { AffiliationKind, FormState } from "@/lib/membership/types";

function kindOf(form: FormData): AffiliationKind {
  const kind = formText(form, "kind");
  if (kind !== "CLASS" && kind !== "CLUB") throw new Error("운영할 영역을 다시 선택해 주세요.");
  return kind;
}

function revisionOf(form: FormData) {
  const value = Number(formText(form, "revision"));
  if (!Number.isInteger(value) || value < 1) throw new Error("새로고침한 뒤 다시 시도해 주세요.");
  return value;
}

function reasonOf(form: FormData) {
  const value = formText(form, "reason");
  if (!value || value.length > 500) throw new Error("변경 사유를 1~500자로 입력해 주세요.");
  return value;
}

function inputError(error: unknown): FormState {
  return { error: error instanceof Error ? error.message : "입력값을 확인해 주세요." };
}

export async function saveOperatingEntity(_state: FormState, form: FormData): Promise<FormState> {
  const supabase = await requireAdmin();
  let kind: AffiliationKind; let id: string | null; let revision: number | null; let payload: Record<string, unknown>;
  try {
    kind = kindOf(form);
    id = formText(form, "entity_id") ? requireUuid(formText(form, "entity_id")) : null;
    revision = id ? revisionOf(form) : null;
    const name = formText(form, "name");
    const description = formText(form, "description");
    if (!name || name.length > 120 || description.length > 4000) throw new Error("이름은 120자, 소개는 4,000자 이내로 입력해 주세요.");
    payload = { name, description, reason: id ? reasonOf(form) : null };
    if (!id) {
      const leaders = [...new Set(form.getAll("leader_ids").map(value => requireUuid(String(value))))];
      if (!leaders.length) throw new Error("담당 리더를 한 명 이상 선택해 주세요.");
      payload.leader_ids = leaders;
    }
    if (kind === "CLASS") {
      const place = formText(form, "place");
      const weekday = formText(form, "weekday");
      const startTime = formText(form, "start_time");
      if (!place || place.length > 200 || !/^[0-6]$/.test(weekday) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime)) throw new Error("장소, 기본 요일과 시작 시간을 확인해 주세요.");
      Object.assign(payload, { place, weekday: Number(weekday), start_time: startTime, active: form.get("active") === "on" });
      if (!id) {
        const times = form.getAll("session_at").map(value => parseSeoulDateTime(String(value)));
        if (!times.length) throw new Error("회차를 한 개 이상 등록해 주세요.");
        payload.session_times = times;
      }
    } else {
      const logo = formText(form, "logo_url");
      if (logo) {
        const url = new URL(logo);
        if (url.protocol !== "https:" || url.username || url.password || logo.length > 2048) throw new Error("로고는 인증 정보가 없는 HTTPS 이미지 주소를 입력해 주세요.");
      }
      const atc = formText(form, "default_atc");
      if (atc && (!/^\d+$/.test(atc) || !Number.isSafeInteger(Number(atc)))) throw new Error("기본 ATC는 0 이상의 정수로 입력해 주세요.");
      Object.assign(payload, { school_id: requireUuid(formText(form, "school_id")), logo_url: logo || null, default_atc: atc ? Number(atc) : null });
    }
  } catch (error) { return inputError(error); }
  const result = await supabase.rpc("save_operating_entity", { p_kind: kind, p_entity_id: id, p_expected_revision: revision, p_payload: payload });
  if (result.error) return { error: operationErrorMessage(result.error) };
  refreshOperations();
  if (!id) redirect(`/admin/${kind === "CLASS" ? "classes" : "clubs"}/${result.data}`);
  return { success: "기본 정보를 저장했습니다. 회차 날짜와 기존 회원의 학교는 별도로 유지됩니다." };
}

export async function changeOperatingLeader(_state: FormState, form: FormData): Promise<FormState> {
  const supabase = await requireAdmin();
  let kind: AffiliationKind; let entityId: string; let userId: string;
  const mode = formText(form, "mode");
  try {
    kind = kindOf(form); entityId = requireUuid(formText(form, "entity_id")); userId = requireUuid(formText(form, "user_id"));
    if (mode !== "ASSIGN" && mode !== "REMOVE") throw new Error("리더 처리 방식을 확인해 주세요.");
    if (mode === "REMOVE" && form.get("confirm") !== "on") throw new Error("권한 해제 안내를 확인해 주세요.");
  } catch (error) { return inputError(error); }
  const result = await supabase.rpc(mode === "ASSIGN" ? "assign_membership_leader" : "remove_membership_leader",
    { p_kind: kind, p_entity_id: entityId, p_user_id: userId });
  if (result.error) return { error: operationErrorMessage(result.error) };
  refreshOperations();
  return { success: mode === "ASSIGN" ? "리더를 지정했습니다. 소속과 출석 명단에는 자동으로 추가되지 않습니다." : "리더 권한을 해제했습니다." };
}

export async function removeOperatingMember(_state: FormState, form: FormData): Promise<FormState> {
  const supabase = await requireAdmin();
  let payload: { p_kind: AffiliationKind; p_entity_id: string; p_user_id: string; p_reason: string };
  try {
    if (form.get("confirm") !== "on") throw new Error("소속 해제와 기록 보존 안내를 확인해 주세요.");
    payload = { p_kind: kindOf(form), p_entity_id: requireUuid(formText(form, "entity_id")), p_user_id: requireUuid(formText(form, "user_id")), p_reason: reasonOf(form) };
  } catch (error) { return inputError(error); }
  const result = await supabase.rpc("remove_entity_member", payload);
  if (result.error) return { error: operationErrorMessage(result.error) };
  refreshOperations();
  return { success: "이 소속을 해제했습니다. 과거 출석·XP와 다른 소속, 별도 리더 권한은 유지됩니다." };
}

export async function retireOperatingEntity(_state: FormState, form: FormData): Promise<FormState> {
  const supabase = await requireAdmin();
  let kind: AffiliationKind; let payload: Record<string, unknown>;
  const deleting = formText(form, "mode") === "DELETE";
  try {
    kind = kindOf(form);
    if (!["DELETE", "ARCHIVE"].includes(formText(form, "mode")) || form.get("confirm") !== "on") throw new Error("처리 방식과 기록 보존 안내를 확인해 주세요.");
    payload = { p_kind: kind, p_entity_id: requireUuid(formText(form, "entity_id")), p_expected_revision: revisionOf(form), p_delete_unused: deleting, p_reason: reasonOf(form) };
  } catch (error) { return inputError(error); }
  const result = await supabase.rpc("retire_operating_entity", payload);
  if (result.error) return { error: operationErrorMessage(result.error) };
  refreshOperations();
  if (deleting) redirect(`/admin/${kind === "CLASS" ? "classes" : "clubs"}`);
  return { success: "읽기 전용으로 보관했습니다. 기존 소속과 운영 이력은 삭제하지 않았습니다." };
}
