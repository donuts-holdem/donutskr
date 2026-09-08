"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { requireReviewer } from "@/lib/membership/server";
import { databaseErrorMessage, formText, requireUuid } from "@/lib/membership/validation";
import type { FormState } from "@/lib/membership/types";

function refreshMembership() {
  for (const path of ["/admin/members", "/admin/members/settings", "/leader/approvals", "/membership/status", "/signup", "/home", "/my"]) revalidatePath(path);
}

export async function reviewMembership(_state: FormState, form: FormData): Promise<FormState> {
  const supabase = await requireReviewer();
  let requestId: string;
  try { requestId = requireUuid(formText(form, "request_id")); }
  catch { return { error: "신청을 다시 선택해 주세요." }; }
  const decision = formText(form, "decision");
  const reason = formText(form, "reason");
  if ((decision !== "APPROVED" && decision !== "REJECTED") || reason.length > 500 || (decision === "REJECTED" && !reason)) {
    return { error: "처리 방식과 반려 사유를 확인해 주세요. 사유는 500자 이내로 입력합니다." };
  }
  const request = await supabase.from("signup_requests").select("requested_class_id,requested_club_id").eq("id", requestId).maybeSingle();
  if (request.error || !request.data) return { error: "신청을 찾을 수 없거나 조회 권한이 없습니다." };
  const permission = await supabase.rpc("can_review_signup", {
    p_class_id: request.data.requested_class_id, p_club_id: request.data.requested_club_id,
  });
  if (permission.error || permission.data !== true) return { error: "이 신청을 처리할 권한이 없습니다." };
  const { error } = await supabase.rpc("review_signup_request", {
    p_request_id: requestId, p_decision: decision, p_reason: reason || null,
  });
  if (error) return { error: databaseErrorMessage(error) };
  refreshMembership();
  return { success: decision === "APPROVED" ? "가입을 승인했습니다." : "신청을 반려했습니다." };
}

export async function saveMembershipSettings(_state: FormState, form: FormData): Promise<FormState> {
  const supabase = await requireAdmin();
  const open = form.get("signup_open") === "on";
  const version = formText(form, "consent_version");
  const privacyUrl = formText(form, "privacy_url");
  if (version.length > 80) return { error: "동의 문서 버전은 80자 이내로 입력해 주세요." };
  if (privacyUrl) {
    try {
      const url = new URL(privacyUrl);
      if (url.protocol !== "https:" || url.username || url.password) throw new Error();
    } catch { return { error: "개인정보 안내에는 HTTPS 문서 주소를 입력해 주세요." }; }
  }
  if (open && (!version || !privacyUrl)) return { error: "가입을 열기 전에 실제 개인정보 안내와 문서 버전을 등록해 주세요." };
  if (open) {
    const classes = await supabase.from("classes").select("id", { count: "exact", head: true }).eq("active", true);
    if (classes.error || !classes.count) return { error: "신청 가능한 클래스를 먼저 등록해 주세요." };
  }
  const { error } = await supabase.from("membership_settings").update({
    signup_open: open, consent_version: version || null, privacy_url: privacyUrl || null,
  }).eq("singleton", true).select("singleton").single();
  if (error) return { error: databaseErrorMessage(error) };
  refreshMembership();
  return { success: "가입 설정을 저장했습니다." };
}

export async function createMembershipCatalogEntry(_state: FormState, form: FormData): Promise<FormState> {
  const supabase = await requireAdmin();
  const kind = formText(form, "kind");
  const name = formText(form, "name");
  if (!name || name.length > 120) return { error: "이름을 120자 이내로 입력해 주세요." };
  if (kind === "school") {
    const { error } = await supabase.from("schools").insert({ name }).select("id").single();
    if (error) return { error: databaseErrorMessage(error) };
  } else if (kind === "class") {
    const place = formText(form, "place");
    const weekday = formText(form, "weekday");
    const startTime = formText(form, "start_time");
    if (!place || place.length > 200 || !/^[0-6]$/.test(weekday) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
      return { error: "장소, 요일, 시작 시간을 확인해 주세요." };
    }
    const { error } = await supabase.from("classes").insert({ name, place, weekday: Number(weekday), start_time: startTime }).select("id").single();
    if (error) return { error: databaseErrorMessage(error) };
  } else if (kind === "club") {
    let schoolId: string;
    try { schoolId = requireUuid(formText(form, "school_id")); }
    catch { return { error: "동아리의 학교를 선택해 주세요." }; }
    const { error } = await supabase.from("clubs").insert({ name, school_id: schoolId }).select("id").single();
    if (error) return { error: databaseErrorMessage(error) };
  } else return { error: "등록할 소속 종류를 확인해 주세요." };
  refreshMembership();
  return { success: "가입 선택지에 등록했습니다." };
}

export async function assignMembershipLeader(_state: FormState, form: FormData): Promise<FormState> {
  const supabase = await requireAdmin();
  let entityId: string;
  let userId: string;
  const [kind, rawEntityId] = formText(form, "assignment").split(":");
  try { entityId = requireUuid(rawEntityId ?? ""); userId = requireUuid(formText(form, "user_id")); }
  catch { return { error: "리더를 맡을 회원과 담당 소속을 선택해 주세요." }; }
  if (kind !== "CLASS" && kind !== "CLUB") return { error: "담당 소속을 선택해 주세요." };
  const { error } = await supabase.rpc("assign_membership_leader", { p_kind: kind, p_entity_id: entityId, p_user_id: userId });
  if (error) return { error: databaseErrorMessage(error) };
  refreshMembership();
  return { success: "담당 리더를 지정했습니다. 다른 소속의 권한은 부여되지 않습니다." };
}
