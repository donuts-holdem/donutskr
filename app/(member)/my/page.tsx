import Link from "next/link";
import { getMemberAffiliations } from "@/lib/membership/server";
import { signOutMember } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { MyClassActivity } from "@/components/classes/MyClassActivity";

export const metadata = { title: "내 회원 정보 | DO:NUTS CLASS" };

export default async function MyPage() {
  const member = await getMemberAffiliations();
  const fields = [
    ["이름", member.profile?.name ?? "관리자"],
    ["이메일", member.email ?? "미등록"], ["전화번호", member.profile?.phone ?? "회원 프로필 없음"],
    ["학교", member.school], ["클래스", member.classes.map(item => item.name).join(", ") || "없음"],
    ["동아리", member.clubs.map(club => club.name).join(", ") || "없음"],
  ];
  return <section aria-labelledby="my-heading" className="max-w-2xl">
    <p className="text-xs font-semibold tracking-widest text-gold">MY MEMBERSHIP</p><h1 id="my-heading" className="mt-4 text-3xl font-bold">내 회원 정보</h1>
    <dl className="mt-8 divide-y divide-border border-y border-border">{fields.map(([label, value]) => <div key={label} className="grid grid-cols-3 gap-4 py-5 text-sm"><dt className="text-ink/60">{label}</dt><dd className="col-span-2 break-words">{value}</dd></div>)}</dl>
    <p className="mt-6 text-sm leading-relaxed text-ink/60">회원 정보 수정과 기존 소속 해제는 운영진에게 요청해 주세요. 추가 소속은 각 목록에서 직접 신청할 수 있습니다.</p>
    <div className="mt-4 flex flex-wrap gap-6"><Link href="/class" className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">클래스 신청 · 상태</Link><Link href="/club" className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">클럽 신청 · 상태</Link></div>
    {(member.classes.length > 0 || member.clubs.length > 0) && <section className="mt-6" aria-labelledby="my-affiliation-records"><h2 id="my-affiliation-records" className="text-sm font-semibold">내 소속 · 보관 기록</h2><ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">{member.classes.map(item => <li key={`class:${item.id}`}><Link href={`/class/${item.id}`} className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">클래스 / {item.name}</Link></li>)}{member.clubs.map(item => <li key={`club:${item.id}`}><Link href={`/club/${item.id}`} className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">클럽 / {item.name}</Link></li>)}</ul></section>}
    {member.profile && <MyClassActivity />}
    <form action={signOutMember} className="mt-8"><Button type="submit" variant="outline" className="h-11 rounded-pill px-6">로그아웃</Button></form>
  </section>;
}
