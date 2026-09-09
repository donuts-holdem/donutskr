"use server";

import { revalidatePath } from "next/cache";
import { requireActiveMember } from "@/lib/membership/server";
import { databaseErrorMessage, formText, requireUuid } from "@/lib/membership/validation";
import type { FormState } from "@/lib/membership/types";

export async function applyForAffiliation(_state: FormState, form: FormData): Promise<FormState> {
  const { supabase, profile, user } = await requireActiveMember();
  if (!profile || profile.status !== "ACTIVE" || !user.email_confirmed_at) {
    return { error: "소속 신청은 이메일 인증을 완료한 회원 계정으로 진행해 주세요." };
  }
  const kind = formText(form, "kind");
  if (kind !== "CLASS" && kind !== "CLUB") return { error: "신청할 소속을 확인해 주세요." };
  let entityId: string;
  try { entityId = requireUuid(formText(form, "entity_id")); }
  catch { return { error: "신청할 소속을 다시 선택해 주세요." }; }
  const { error } = await supabase.rpc("request_affiliation", { p_kind: kind, p_entity_id: entityId });
  if (error) return { error: databaseErrorMessage(error) };
  for (const path of ["/class", "/club", "/home", "/my", "/leader/approvals", "/admin/members"]) revalidatePath(path);
  return { success: "소속을 신청했습니다. 담당자가 확인 후 승인합니다." };
}
