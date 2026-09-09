import Link from "next/link";
import { requestPasswordReset } from "@/app/auth/actions";
import { ActionForm } from "@/components/membership/ActionForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = { title: "비밀번호 찾기 | DO:NUTS CLASS" };

export default function ForgotPasswordPage() {
  return <section><h1 className="text-2xl font-bold">비밀번호 찾기</h1><p className="mb-8 mt-3 text-sm leading-relaxed text-ink/60">로그인에 사용하는 이메일로 비밀번호 재설정 안내를 보내드립니다.</p>
    <ActionForm action={requestPasswordReset} label="재설정 메일 요청" pendingLabel="메일 요청 중...">
      <div className="space-y-2"><Label htmlFor="email">이메일</Label><Input id="email" name="email" className="h-11" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} required /></div>
    </ActionForm>
    <Link href="/login" className="mt-6 inline-flex py-3 text-sm text-gold underline">로그인으로 돌아가기</Link>
  </section>;
}
