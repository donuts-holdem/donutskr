import Link from "next/link";

export const metadata = { title: "이메일 확인 | DO:NUTS CLASS" };

export default function SignupCompletePage() {
  return <section aria-labelledby="complete-heading">
    <p className="text-xs font-semibold tracking-widest text-gold">CHECK YOUR EMAIL</p>
    <h1 id="complete-heading" className="mt-4 text-2xl font-bold">가입 이메일을 확인해 주세요.</h1>
    <p className="mt-5 text-sm leading-relaxed text-ink/70">가입 이메일의 인증 링크를 이 브라우저에서 열어 주세요.</p>
    <p className="mt-4 text-sm leading-relaxed text-ink/60">이미 가입한 이메일이라면 해당 이메일로 로그인하거나 비밀번호를 재설정해 주세요.</p>
    <div className="mt-8 flex flex-wrap gap-5"><Link href="/login" className="py-3 text-sm text-gold underline">로그인</Link><Link href="/forgot-password" className="py-3 text-sm text-ink/70 underline">비밀번호 찾기</Link></div>
  </section>;
}
