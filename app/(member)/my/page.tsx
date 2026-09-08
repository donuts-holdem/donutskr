import { getMemberAffiliations } from "@/lib/membership/server";
import { signOutMember } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "내 회원 정보 | DO:NUTS CLASS" };

export default async function MyPage() {
  const member = await getMemberAffiliations();
  const fields = [
    ["이름", member.profile.name], ["아이디", member.profile.username],
    ["이메일", member.email ?? "미등록"], ["전화번호", member.profile.phone],
    ["학교", member.school], ["클래스", member.classes.map(item => item.name).join(", ") || "없음"],
    ["동아리", member.clubs.map(club => club.name).join(", ") || "없음"],
  ];
  return <section aria-labelledby="my-heading" className="max-w-2xl">
    <p className="text-xs font-semibold tracking-widest text-gold">MY MEMBERSHIP</p><h1 id="my-heading" className="mt-4 text-3xl font-bold">내 회원 정보</h1>
    <dl className="mt-8 divide-y divide-border border-y border-border">{fields.map(([label, value]) => <div key={label} className="grid grid-cols-3 gap-4 py-5 text-sm"><dt className="text-ink/60">{label}</dt><dd className="col-span-2 break-words">{value}</dd></div>)}</dl>
    <p className="mt-6 text-sm leading-relaxed text-ink/60">회원 정보와 소속 변경은 운영진에게 요청해 주세요.</p>
    <form action={signOutMember} className="mt-8"><Button type="submit" variant="outline" className="h-11 rounded-pill px-6">로그아웃</Button></form>
  </section>;
}
