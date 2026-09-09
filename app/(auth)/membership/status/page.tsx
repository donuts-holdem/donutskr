import { redirect } from "next/navigation";
import { getMembershipSession } from "@/lib/membership/server";
import { signOutMember } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export const metadata = { title: "회원 이용 상태 | DO:NUTS CLASS" };

export default async function MembershipStatusPage() {
  const { user, profile, isAdmin } = await getMembershipSession();
  if (!user) redirect("/login");
  if (isAdmin) redirect("/home");
  if (!profile) redirect("/signup");
  if (profile.status === "ACTIVE" && user.email_confirmed_at) redirect("/home");
  const blocked = profile.status === "SUSPENDED" || profile.status === "WITHDRAWN";
  return <section aria-labelledby="status-heading">
    <p className="text-xs font-semibold tracking-widest text-gold">MEMBERSHIP STATUS</p>
    <h1 id="status-heading" className="mt-4 text-2xl font-bold">{blocked ? "회원 이용이 제한되어 있습니다." : !user.email_confirmed_at ? "이메일 인증을 완료해 주세요." : "회원 이용 상태를 확인해 주세요."}</h1>
    <dl className="my-8 divide-y divide-border border-y border-border text-sm">
      <div className="flex justify-between gap-4 py-4"><dt className="text-ink/60">이름</dt><dd>{profile.name}</dd></div>
      <div className="flex justify-between gap-4 py-4"><dt className="text-ink/60">로그인 이메일</dt><dd className="break-all">{user.email}</dd></div>
      <div className="flex justify-between gap-4 py-4"><dt className="text-ink/60">이메일 인증</dt><dd className="text-gold">{user.email_confirmed_at ? "완료" : "인증 필요"}</dd></div>
    </dl>
    <p className="text-sm leading-relaxed text-ink/70">{blocked ? "상태 변경이 필요한 경우 운영진에게 문의해 주세요. 이메일을 다시 인증해도 정지·탈퇴 상태는 해제되지 않습니다." : user.email_confirmed_at ? "이메일 인증은 완료되었습니다. 새로고침 후에도 이 화면이 계속되면 운영진에게 문의해 주세요." : "가입 메일의 인증 링크를 열면 정회원으로 이용할 수 있습니다. 클래스·클럽 소속 승인은 별도로 진행됩니다."}</p>
    <div className="mt-8 flex flex-wrap gap-3">
      {!blocked && <Button asChild variant="outline" className="h-11 rounded-pill"><a href="/membership/status">회원 상태 새로고침</a></Button>}
      <form action={signOutMember}><Button variant="ghost" type="submit" className="h-11 rounded-pill">로그아웃</Button></form>
    </div>
  </section>;
}
