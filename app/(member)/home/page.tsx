import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getMemberAffiliations } from "@/lib/membership/server";

export const metadata = { title: "회원 홈 | DO:NUTS CLASS" };
const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

export default async function MemberHomePage() {
  const member = await getMemberAffiliations();
  return <div className="space-y-12">
    <section aria-labelledby="home-heading" className="border-b border-border pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-xs font-semibold tracking-widest text-gold">YOUR MEMBERSHIP</p><span className="rounded-pill border border-gold/30 px-3 py-1 text-xs text-gold">{member.isAdmin ? "관리자" : "정회원"}</span></div>
      <h1 id="home-heading" className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{member.profile?.name ?? "관리자"}님,<br />도너츠에서 만나요.</h1>
      <p className="mt-5 text-sm text-ink/60">{member.school}{member.clubs.length > 0 ? ` / ${member.clubs.map(club => club.name).join(", ")}` : ""}</p>
      {member.isLeader && <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">{[{ href: "/leader/approvals", label: "소속 신청 승인" }, { href: "/leader/class", label: "클래스 · 출석 운영" }, { href: "/leader/club", label: "클럽 운영" }].map(link => <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-gold focus-visible:outline-2 focus-visible:outline-gold">{link.label}<ArrowUpRight className="size-4" aria-hidden="true" /></Link>)}</div>}
    </section>
    <section aria-labelledby="my-class-heading">
      <div className="flex items-baseline justify-between gap-4"><h2 id="my-class-heading" className="text-xl font-semibold">내 클래스</h2><span className="text-xs text-ink/50">MEMBERSHIP</span></div>
      {member.classes.length ? <ul className="mt-5 divide-y divide-border">{member.classes.map(item => <li key={item.id} className="flex flex-col justify-between gap-4 border-l-2 border-gold py-4 pl-5 sm:flex-row sm:items-center"><h3 className="font-semibold"><Link href={`/class/${item.id}`} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold">{item.name}</Link></h3><div className="text-sm leading-relaxed text-ink/70"><p>기본 {weekdays[item.weekday]}요일 / {item.start_time.slice(0, 5)}</p><p className="mt-1">{item.place}</p><p className="mt-1 text-xs">실제 회차와 출석은 클래스를 선택해 확인하세요.</p></div></li>)}</ul> : <p className="mt-5 text-sm text-ink/60">아직 승인된 클래스가 없습니다. 소속 승인과 관계없이 정회원 서비스를 이용할 수 있습니다.</p>}
      <Link href="/class" className="mt-5 inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-gold focus-visible:outline-2 focus-visible:outline-gold">클래스 찾기 · 신청 상태<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
    </section>
    <section aria-labelledby="public-events-heading" className="border-t border-border pt-8">
      <h2 id="public-events-heading" className="text-xl font-semibold">도너츠의 일정과 시리즈</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink/60">기존 공개 일정과 시리즈도 계속 함께합니다.</p>
      <div className="mt-5 flex flex-wrap gap-6">{[{ href: "/schedule", label: "전체 일정" }, { href: "/series", label: "도너츠 시리즈" }].map(link => <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-gold focus-visible:outline-2 focus-visible:outline-gold">{link.label}<ArrowUpRight className="size-4" aria-hidden="true" /></Link>)}</div>
    </section>
  </div>;
}
