"use server";
import { requireAdmin } from "@/lib/auth";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role";
import { requestPasswordReset } from "@/app/auth/actions";
import { refreshOperations } from "@/lib/membership/operations";
import { refreshDomains, actionError } from "@/lib/domains/server";
import { formText, requireUuid, databaseErrorMessage } from "@/lib/membership/validation";
import type { FormState } from "@/lib/membership/types";
import { revalidatePath } from "next/cache";

function refreshMember(id: string) {
  refreshOperations();refreshDomains();revalidatePath(`/admin/members/directory/${id}`);
}
function failure(error: { message: string; code?: string }): FormState {
  const messages: Record<string, string> = { stale_preview: "정보가 변경되었습니다. 새로고침해 주세요.", invalid_profile: "이름과 전화번호를 확인해 주세요.", reason_required: "처리 사유를 입력해 주세요." };
  return { error: messages[error.message] ?? databaseErrorMessage(error) };
}
export async function saveMemberProfile(_: FormState, form: FormData): Promise<FormState> {
  const client=await requireAdmin();
  try {
    const id=requireUuid(formText(form,"user_id"));const school=formText(form,"school_id");const expected=Number(formText(form,"revision"));
    if(!Number.isSafeInteger(expected)||expected<1)return {error:"회원 정보를 새로고침해 주세요."};
    const {error}=await client.rpc("update_member_profile",{p_user:id,p_expected:expected,p_payload:{name:formText(form,"name"),phone:formText(form,"phone").replace(/[\s()-]/g,""),school_id:school==="other"?null:requireUuid(school),other_school_name:school==="other"?formText(form,"other_school_name"):null},p_reason:formText(form,"reason")});
    if(error)return failure(error);refreshMember(id);return {success:"회원 정보를 저장했습니다."};
  }catch(error){return actionError(error);}
}
export async function setMemberAffiliation(_: FormState, form: FormData): Promise<FormState> {
  const client=await requireAdmin();
  try {
    const id=requireUuid(formText(form,"user_id"));
    const {error}=await client.rpc("admin_set_member_affiliation",{p_user:id,p_kind:formText(form,"kind"),p_entity:requireUuid(formText(form,"entity_id")),p_active:formText(form,"active")==="true",p_reason:formText(form,"reason")});
    if(error)return failure(error);refreshMember(id);return {success:"소속을 변경했습니다."};
  }catch(error){return actionError(error);}
}
export async function sendMemberRecovery(_: FormState, form: FormData): Promise<FormState> {
  const client=await requireAdmin();
  try {
    const id=requireUuid(formText(form,"user_id"));const {data,error}=await client.rpc("admin_member_directory",{p_filters:{user_id:id}});
    if(error)return failure(error);const member=data.members?.[0];
    if(!member||member.status==="WITHDRAWN")return {error:"재설정할 수 없는 회원입니다."};
    const request=new FormData();request.set("email",member.email);return await requestPasswordReset({},request);
  }catch(error){return actionError(error);}
}
export async function withdrawMember(_: FormState, form: FormData): Promise<FormState> {
  const client=await requireAdmin();
  try {
    const id=requireUuid(formText(form,"user_id")),reason=formText(form,"reason");
    if(form.get("confirm")!=="on"||!reason||reason.length>500)return {error:"탈퇴 사유와 삭제할 정보를 확인해 주세요."};
    const started=await client.rpc("begin_member_withdrawal",{p_user:id,p_reason:reason});
    if(started.error)return failure(started.error);refreshMember(id);
    // Auth soft deletion removes identities, credentials, factors and sessions, retaining history FKs.
    const erased=await createServiceRoleSupabase().auth.admin.deleteUser(id,true);
    if(erased.error)return {error:"회원 접근은 차단됐습니다. 개인정보 정리를 완료하려면 다시 시도해 주세요."};
    const finished=await client.rpc("finish_member_withdrawal",{p_user:id});
    if(finished.error)return {error:"회원 접근은 차단됐습니다. 마지막 기록 정리를 다시 시도해 주세요."};
    refreshMember(id);return {success:"탈퇴와 개인정보 정리를 완료했습니다."};
  }catch(error){return actionError(error);}
}
