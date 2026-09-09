import Link from "next/link";
import { redirect } from "next/navigation";
import { getMembershipSession, getSignupCatalog } from "@/lib/membership/server";
import { SignupForm } from "@/components/membership/SignupForm";

export const metadata = { title: "현장 가입 신청 | DO:NUTS CLASS" };

export default async function SignupPage() {
  const { supabase, user, profile, isAdmin } = await getMembershipSession();
  if (isAdmin) redirect("/home");
  if (profile) redirect("/membership/status");
  const catalog = await getSignupCatalog(supabase);
  if (!catalog.settings.signup_open || !catalog.settings.privacy_url || !catalog.settings.consent_version || !catalog.classes.length) {
    return <section><p className="text-xs font-semibold tracking-widest text-gold">REGISTRATION</p><h1 className="mt-4 text-2xl font-bold">가입 신청을 준비하고 있습니다.</h1><p className="mt-4 text-sm leading-relaxed text-ink/70">현장 운영진에게 가입 가능 일정을 문의해 주세요. 기존 회원은 로그인할 수 있습니다.</p><Link href="/login" className="mt-6 inline-flex py-3 text-gold underline">회원 로그인</Link></section>;
  }
  return (
    <section aria-labelledby="signup-heading">
      <h1 id="signup-heading" className="text-2xl font-bold">현장 가입 신청</h1>
      <p className="mb-8 mt-3 text-sm leading-relaxed text-ink/60">구글 신청폼 작성과 현장 방문 후 진행해 주세요. 실제 참여할 클래스와 소속을 선택합니다.</p>
      <SignupForm catalog={catalog} email={user?.email} profile={profile} />
      <Link href="/login" className="mt-6 inline-flex py-3 text-sm text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold">이미 계정이 있나요? 로그인</Link>
    </section>
  );
}
