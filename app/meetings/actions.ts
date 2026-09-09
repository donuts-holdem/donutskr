"use server";

import { redirect } from "next/navigation";
import { requireActiveMember } from "@/lib/membership/server";
import type { FormState } from "@/lib/membership/types";
import { formText, requireUuid } from "@/lib/membership/validation";
import { parseSeoulDateTime } from "@/lib/classes/format";
import { domainRpc, actionError, refreshDomains } from "@/lib/domains/server";
import { confirmAction, requiredText, positiveInteger } from "@/lib/domains/validation";
import { applicationLabels, type MeetingApplicationStatus } from "@/lib/meetings/types";

export async function saveMeeting(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireActiveMember();
  let id: string;
  try {
    const existing = formText(form, "id");
    const rawCapacity = formText(form, "capacity");
    if (rawCapacity && (!/^\d+$/.test(rawCapacity) || !Number.isSafeInteger(Number(rawCapacity)))) throw new Error("정원은 0 이상의 정수로 입력해 주세요.");
    id = await domainRpc<string>(supabase, "save_club_meeting", {
      p_id: existing ? requireUuid(existing) : null, p_expected: existing ? positiveInteger(form, "revision") : null,
      p_payload: { club_id: requireUuid(formText(form, "club_id")), title: requiredText(form, "title", 160),
        description: formText(form, "description"), place: requiredText(form, "place", 300),
        scheduled_at: parseSeoulDateTime(formText(form, "scheduled_at")), capacity: rawCapacity ? Number(rawCapacity) : null,
        guest_allowed: form.get("guest_allowed") === "on", signup_open: form.get("signup_open") === "on",
        hold_hours: positiveInteger(form, "hold_hours", 12), hot: form.get("hot") === "on",
        reason: existing ? requiredText(form, "reason", 500) : null },
    });
    refreshDomains();
  } catch (error) { return actionError(error); }
  redirect("/meetings/" + id);
}
export async function applyMeeting(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireActiveMember();
  try {
    await domainRpc(supabase, "apply_club_meeting", { p_id: requireUuid(formText(form, "id")) });
    refreshDomains();
    return { success: "신청을 처리했습니다. 아래에서 참여 확정 또는 대기 상태를 확인해 주세요." };
  } catch (error) { return actionError(error); }
}
export async function respondMeeting(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireActiveMember();
  try {
    const status = await domainRpc<MeetingApplicationStatus>(supabase, "respond_meeting_application", {
      p_id: requireUuid(formText(form, "id")), p_action: formText(form, "action"),
    });
    refreshDomains();
    return { success: "현재 상태: " + applicationLabels[status] };
  } catch (error) { return actionError(error); }
}
export async function closeMeeting(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireActiveMember();
  try {
    confirmAction(form);
    await domainRpc(supabase, "close_club_meeting", { p_id: requireUuid(formText(form, "id")),
      p_expected: positiveInteger(form, "revision"), p_status: formText(form, "status"), p_reason: requiredText(form, "reason", 500) });
    refreshDomains();
    return { success: "모임을 마감했습니다. 신청 기록은 보존됩니다." };
  } catch (error) { return actionError(error); }
}
