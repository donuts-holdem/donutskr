"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { formText, requireUuid } from "@/lib/membership/validation";
import type { FormState } from "@/lib/membership/types";
import { domainRpc, actionError, refreshDomains } from "@/lib/domains/server";
import { confirmAction, requiredText } from "@/lib/domains/validation";

export async function createSuccessor(_: FormState, form: FormData): Promise<FormState> {
  const client = await requireAdmin();
  let id: string;
  try {
    id = await domainRpc<string>(client, "create_class_succession", {
      p_predecessor: requireUuid(formText(form, "predecessor_id")),
      p_successor: requireUuid(formText(form, "successor_id")), p_mode: formText(form, "mode"),
    });
    refreshDomains();
  } catch (error) { return actionError(error); }
  redirect("/admin/successors?id=" + id);
}
export async function executeSuccessor(_: FormState, form: FormData): Promise<FormState> {
  const client = await requireAdmin();
  try {
    confirmAction(form);
    await domainRpc(client, "execute_class_succession", { p_id: requireUuid(formText(form, "id")),
      p_fingerprint: requiredText(form, "fingerprint", 100), p_confirm: true, p_reason: requiredText(form, "reason", 500) });
    refreshDomains();
    return { success: "후속 클래스 처리를 완료했습니다. 앱 알림이 등록되고 이메일은 발송 대기열에 기록됩니다." };
  } catch (error) { return actionError(error); }
}
