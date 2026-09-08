import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { resetMemberPassword } from "@/app/auth/actions";
import { ActionForm } from "@/components/membership/ActionForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = { title: "새 비밀번호 | DO:NUTS CLASS" };

export default async function ResetPasswordPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password");
  return <section><h1 className="text-2xl font-bold">새 비밀번호 설정</h1><p className="mb-8 mt-3 text-sm leading-relaxed text-ink/60">10자 이상, 72바이트 이하로 설정해 주세요.</p>
    <ActionForm action={resetMemberPassword} label="비밀번호 변경" pendingLabel="변경 중...">
      <div className="space-y-2"><Label htmlFor="password">새 비밀번호</Label><Input id="password" name="password" className="h-11" type="password" autoComplete="new-password" minLength={10} maxLength={72} required /></div>
      <div className="space-y-2"><Label htmlFor="password-confirm">새 비밀번호 확인</Label><Input id="password-confirm" name="password_confirm" className="h-11" type="password" autoComplete="new-password" minLength={10} maxLength={72} required /></div>
    </ActionForm>
  </section>;
}
