"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { formText } from "@/lib/membership/validation";
import { parsePartnerFields, parsePartnerOrder, parsePartnerReference } from "@/lib/partners/validation";
import type { FormState } from "@/lib/membership/types";

function refreshPartners() {
  for (const path of ["/partners", "/home", "/admin/partners"]) revalidatePath(path);
  revalidatePath("/admin/partners/[id]", "page");
}

function inputError(error: unknown): FormState {
  return { error: error instanceof Error ? error.message : "입력값을 확인해 주세요." };
}

function databaseError(error: { message: string }): FormState {
  const messages: Record<string, string> = {
    stale_partner: "파트너 정보가 변경되었습니다. 새로고침한 뒤 다시 시도해 주세요.",
    invalid_partner: "파트너 이름과 링크를 확인해 주세요.",
    invalid_partner_order: "파트너 목록을 새로고침한 뒤 순서를 변경해 주세요.",
    forbidden: "파트너를 관리할 권한이 없습니다.",
  };
  return { error: messages[error.message] ?? "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
}

export async function savePartner(_state: FormState, form: FormData): Promise<FormState> {
  const supabase = await requireAdmin();
  let reference; let payload;
  try {
    reference = formText(form, "id") ? parsePartnerReference(form) : null;
    payload = parsePartnerFields(form);
  } catch (error) { return inputError(error); }
  const result = await supabase.rpc("save_partner", {
    p_id: reference?.id ?? null, p_expected_revision: reference?.revision ?? null, p_payload: payload,
  });
  if (result.error) return databaseError(result.error);
  refreshPartners();
  if (!reference) redirect(`/admin/partners/${result.data}`);
  return { success: "저장했습니다." };
}

export async function deletePartner(_state: FormState, form: FormData): Promise<FormState> {
  const supabase = await requireAdmin();
  let reference;
  try {
    if (form.get("confirm") !== "on") throw new Error("파트너 삭제를 확인해 주세요.");
    reference = parsePartnerReference(form);
  } catch (error) { return inputError(error); }
  const result = await supabase.rpc("delete_partner", { p_id: reference.id, p_expected_revision: reference.revision });
  if (result.error) return databaseError(result.error);
  refreshPartners();
  redirect("/admin/partners");
}

export async function reorderPartners(_state: FormState, form: FormData): Promise<FormState> {
  const supabase = await requireAdmin();
  let order;
  try { order = parsePartnerOrder(form); } catch (error) { return inputError(error); }
  const result = await supabase.rpc("reorder_partners", { p_order: order });
  if (result.error) return databaseError(result.error);
  refreshPartners();
  return { success: "순서를 저장했습니다." };
}
