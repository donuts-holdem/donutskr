"use server";

import { requireAdmin } from "@/lib/auth";
import { requireActiveMember } from "@/lib/membership/server";
import { formText, requireUuid } from "@/lib/membership/validation";
import type { FormState } from "@/lib/membership/types";
import { actionError, domainRpc, refreshDomains } from "@/lib/domains/server";
import { runDomainJobs } from "@/lib/notifications/worker";

export async function markNotification(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireActiveMember();
  try {
    await domainRpc(supabase, "mark_notification_read", { p_id: requireUuid(formText(form, "id")) });
    refreshDomains(); return { success: "읽음으로 표시했습니다." };
  } catch (error) { return actionError(error); }
}
export async function processDomainJobs(): Promise<FormState> {
  await requireAdmin();
  try {
    const result = await runDomainJobs(); refreshDomains();
    return { success: result.emailEnabled
      ? "모임 작업 완료. 이메일 발송 " + result.sent + "건, 실패·재시도 " + result.failed + "건."
      : "모임 작업을 처리했습니다. 이메일 발송은 비활성 상태이며 대기열을 유지합니다." };
  } catch (error) { return actionError(error); }
}
