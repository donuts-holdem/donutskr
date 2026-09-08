import Link from "next/link";
import { redirect } from "next/navigation";
import { getMembershipSession, getOwnApplication } from "@/lib/membership/server";
import { signOutMember } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "가입 승인 상태 | DO:NUTS CLASS" };

export default async function MembershipStatusPage() {
  const { user, profile } = await getMembershipSession();
  if (!user) redirect("/login");
  if (!profile) redirect("/signup");
  if (profile.status === "ACTIVE" && user.email_confirmed_at) redirect("/home");
  const application = await getOwnApplication();
  const blocked = profile.status === "SUSPENDED" || profile.status === "WITHDRAWN";
  const rejected = application?.status === "REJECTED";
  return <section aria-labelledby="status-heading">
    <p className="text-xs font-semibold tracking-widest text-gold">MEMBERSHIP STATUS</p>
    <h1 id="status-heading" className="mt-4 text-2xl font-bold">{blocked ? "회원 이용이 제한되어 있습니다." : rejected ? "가입 신청을 다시 확인해 주세요." : "운영진의 승인을 기다리고 있습니다."}</h1>
    <dl className="my-8 divide-y divide-border border-y border-border text-sm">
      <div className="flex justify-between gap-4 py-4"><dt className="text-ink/60">이름</dt><dd>{profile.name}</dd></div>
      <div className="flex justify-between gap-4 py-4"><dt className="text-ink/60">아이디</dt><dd>{profile.username}</dd></div>
      <div className="flex justify-between gap-4 py-4"><dt className="text-ink/60">이메일 인증</dt><dd className="text-gold">{user.email_confirmed_at ? "완료" : "인증 필요"}</dd></div>
    </dl>
    <p className="text-sm leading-relaxed text-ink/70">{blocked ? "상태 변경이 필요한 경우 운영진에게 문의해 주세요." : rejected ? application?.decision_reason : "현장에서 담당 운영진의 승인을 받으면 회원 서비스를 이용할 수 있습니다."}</p>
    <div className="mt-8 flex flex-wrap gap-3">
      {rejected && !blocked && <Button asChild className="h-11 rounded-pill"><Link href="/signup">정보 수정 후 다시 신청</Link></Button>}
      {!blocked && <Button asChild variant="outline" className="h-11 rounded-pill"><a href="/membership/status">승인 상태 새로고침</a></Button>}
      <form action={signOutMember}><Button variant="ghost" type="submit" className="h-11 rounded-pill">로그아웃</Button></form>
    </div>
  </section>;
}
