"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceRoleSupabase } from "@/lib/supabase/service-role";
import { getMembershipSession } from "@/lib/membership/server";
import { databaseErrorMessage, formText, parseApplication, parseEmail, parseNewPassword } from "@/lib/membership/validation";
import type { FormState } from "@/lib/membership/types";

function callbackUrl(next = "/membership/status") {
  const configured = process.env.SITE_URL;
  if (!configured) throw new Error("SITE_URL is required for authentication emails.");
  const origin = new URL(configured);
  if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash ||
    (origin.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && origin.protocol === "http:"))) {
    throw new Error("SITE_URL must be the canonical application origin.");
  }
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", next);
  return url.toString();
}

async function allowAuthAttempt(kind: string, identifier: string) {
  const key = createHash("sha256").update(`${kind}:${identifier.toLowerCase()}`).digest("hex");
  const { data, error } = await createServiceRoleSupabase().rpc("consume_member_auth_attempt", { p_key: key });
  if (error) throw new Error("Authentication throttle is unavailable.");
  return data === true;
}

export async function loginMember(_state: FormState, form: FormData): Promise<FormState> {
  const username = formText(form, "username").toLowerCase();
  const password = form.get("password");
  const invalid = { error: "아이디 또는 비밀번호를 확인해 주세요. 이메일 인증도 완료해야 합니다." };
  if (!/^[a-z][a-z0-9_]{3,23}$/.test(username) || typeof password !== "string" || !password || password.length > 256) return invalid;
  let destination = "/membership/status";
  try {
    if (!await allowAuthAttempt("login", username)) return { error: "로그인 시도가 많습니다. 15분 후 다시 시도해 주세요." };
    const service = createServiceRoleSupabase();
    const { data: email, error: lookupError } = await service.rpc("resolve_member_login_email", { p_username: username });
    if (lookupError) return { error: "로그인 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요." };
    const supabase = await createServerSupabase();
    // An unknown username takes the same password-auth path and generic error.
    const result = await supabase.auth.signInWithPassword({
      email: typeof email === "string" ? email : "unregistered-member@invalid.example",
      password,
    });
    if (result.error || typeof email !== "string" || !result.data.user) return invalid;
    const profile = await supabase.from("member_profiles").select("status").eq("id", result.data.user.id).maybeSingle();
    if (profile.error) {
      await supabase.auth.signOut({ scope: "local" });
      return { error: "회원 상태를 확인하지 못했습니다. 잠시 후 다시 로그인해 주세요." };
    }
    if (profile.data?.status === "ACTIVE" && result.data.user.email_confirmed_at) destination = "/home";
  } catch {
    return { error: "로그인 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  redirect(destination);
}

export async function signupMember(_state: FormState, form: FormData): Promise<FormState> {
  let payload: ReturnType<typeof parseApplication>;
  try { payload = parseApplication(form); }
  catch (error) { return { error: error instanceof Error ? error.message : "가입 정보를 확인해 주세요." }; }
  let destination = "/membership/status";
  try {
    const { supabase, user } = await getMembershipSession();
    if (user) {
      const { error } = await supabase.rpc("submit_membership_application", { p_payload: payload });
      if (error) return { error: databaseErrorMessage(error) };
    } else {
      let email: string;
      let password: string;
      try { email = parseEmail(form); password = parseNewPassword(form); }
      catch (error) { return { error: error instanceof Error ? error.message : "이메일과 비밀번호를 확인해 주세요." }; }
      if (!await allowAuthAttempt("signup", email)) return { error: "가입 시도가 많습니다. 15분 후 다시 시도해 주세요." };
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: callbackUrl(), data: { donuts_membership: payload } },
      });
      if (error) {
        if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
          return { error: "인증 메일 요청이 많습니다. 잠시 후 다시 시도해 주세요." };
        }
        return { error: "가입을 완료하지 못했습니다. 아이디 중복 여부와 입력 정보, 가입 가능 상태를 확인해 주세요." };
      }
      if (!data.session) destination = "/signup/complete";
    }
  } catch {
    return { error: "가입 서비스를 사용할 수 없습니다. 운영진에게 문의해 주세요." };
  }
  revalidatePath("/admin/members");
  redirect(destination);
}

export async function requestPasswordReset(_state: FormState, form: FormData): Promise<FormState> {
  let email: string;
  try { email = parseEmail(form); }
  catch { return { error: "가입할 때 사용한 이메일을 입력해 주세요." }; }
  const success = { success: "등록된 이메일이라면 비밀번호 재설정 안내를 보냈습니다. 스팸함도 확인해 주세요." };
  try {
    if (!await allowAuthAttempt("recovery", email)) return success;
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callbackUrl("/reset-password") });
    if (error) return { error: "인증 메일을 요청하지 못했습니다. 잠시 후 다시 시도해 주세요." };
    return success;
  } catch {
    return { error: "비밀번호 재설정 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요." };
  }
}

export async function resetMemberPassword(_state: FormState, form: FormData): Promise<FormState> {
  let password: string;
  try { password = parseNewPassword(form); }
  catch (error) { return { error: error instanceof Error ? error.message : "새 비밀번호를 확인해 주세요." }; }
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "재설정 링크가 만료되었습니다. 안내 메일을 다시 요청해 주세요." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "비밀번호를 변경하지 못했습니다. 이전과 다른 비밀번호로 다시 시도해 주세요." };
  await supabase.auth.signOut();
  redirect("/login?notice=password_changed");
}

export async function signOutMember() {
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw new Error("로그아웃하지 못했습니다. 다시 시도해 주세요.");
  redirect("/login");
}
