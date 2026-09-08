import Link from "next/link";
import { redirect } from "next/navigation";
import { loginMember } from "@/app/auth/actions";
import { getMembershipSession } from "@/lib/membership/server";
import { ActionForm } from "@/components/membership/ActionForm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = { title: "회원 로그인 | DO:NUTS CLASS" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { user, profile } = await getMembershipSession();
  if (user && profile) redirect(profile.status === "ACTIVE" && user.email_confirmed_at ? "/home" : "/membership/status");
  const { notice } = await searchParams;
  return (
    <section aria-labelledby="login-heading">
      <h1 id="login-heading" className="text-2xl font-bold">회원 로그인</h1>
      <p className="mb-8 mt-3 text-sm leading-relaxed text-ink/60">가입할 때 정한 아이디로 로그인하세요.</p>
      {notice === "invalid_link" && <p role="alert" className="mb-6 text-sm text-gold">인증 링크가 만료되었거나 유효하지 않습니다. 같은 브라우저에서 최신 메일의 링크를 열어 주세요.</p>}
      {notice === "password_changed" && <p role="status" className="mb-6 text-sm text-gold">비밀번호를 변경했습니다. 새 비밀번호로 로그인해 주세요.</p>}
      <ActionForm action={loginMember} label="로그인" pendingLabel="로그인 중...">
        <div className="space-y-2"><Label htmlFor="username">아이디</Label><Input id="username" name="username" className="h-11" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={24} required /></div>
        <div className="space-y-2"><Label htmlFor="password">비밀번호</Label><Input id="password" name="password" className="h-11" type="password" autoComplete="current-password" maxLength={256} required /></div>
      </ActionForm>
      <div className="mt-6 flex flex-wrap justify-between gap-4 text-sm">
        <Link href="/signup" className="py-3 text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold">현장 가입 신청</Link>
        <Link href="/forgot-password" className="py-3 text-ink/70 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold">비밀번호 찾기</Link>
      </div>
    </section>
  );
}
