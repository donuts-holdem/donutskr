import Link from "next/link";
import { redirect } from "next/navigation";
import { getMembershipSession, getSignupCatalog } from "@/lib/membership/server";
import { SignupForm } from "@/components/membership/SignupForm";
import { getSiteConfig } from "@/lib/site/data/siteConfig";

export const metadata = { title: "현장 가입 신청 | DO:NUTS CLASS" };

export default async function SignupPage() {
  const { supabase, user, profile, isAdmin } = await getMembershipSession();
  if (isAdmin) redirect("/home");
  if (profile) redirect("/membership/status");
  const catalog = await getSignupCatalog(supabase);
  if (!catalog.settings.signup_open || !catalog.settings.privacy_url || !catalog.settings.consent_version || !catalog.classes.length) {
    const site = await getSiteConfig();
    return <section><p className="text-xs font-semibold tracking-widest text-gold">REGISTRATION</p><h1 className="mt-4 text-2xl font-bold">현장 가입 준비 중</h1><div className="mt-6 flex flex-wrap gap-5">{site.signup_link && <a href={site.signup_link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-gold underline focus-visible:outline-2 focus-visible:outline-gold">사전 신청<span className="sr-only"> · 새 탭</span></a>}<Link href="/login" className="inline-flex min-h-11 items-center text-gold underline focus-visible:outline-2 focus-visible:outline-gold">회원 로그인</Link></div></section>;
  }
  return (
    <section aria-labelledby="signup-heading">
      <h1 id="signup-heading" className="text-2xl font-bold">현장 가입 신청</h1>
      <p className="mb-8 mt-3 text-sm leading-relaxed text-ink/70">사전 신청과 현장 방문 후 가입해 주세요.</p>
      <SignupForm catalog={catalog} email={user?.email} profile={profile} />
      <Link href="/login" className="mt-6 inline-flex py-3 text-sm text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold">이미 계정이 있나요? 로그인</Link>
    </section>
  );
}
