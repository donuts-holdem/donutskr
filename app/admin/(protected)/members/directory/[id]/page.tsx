import Link from "next/link";
import { notFound } from "next/navigation";
import { getMemberAdminCatalog, getMemberDirectory, memberStatusLabels } from "@/lib/membership/admin-directory";
import type { DirectoryMember } from "@/lib/membership/admin-directory";
import { routeUuid } from "@/lib/membership/operations";
import { saveMemberProfile, sendMemberRecovery, setMemberAffiliation } from "@/app/admin/actions/member-profile";
import { changeMemberSuspension, removeMembershipLeader } from "@/app/admin/actions/members";
import { ActionForm } from "@/components/membership/ActionForm";
import { Confirmation, ReasonField } from "@/components/membership/EntityForms";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MemberProfileFields } from "@/app/admin/(protected)/members/directory/[id]/MemberProfileFields";
import { MemberWithdrawalForm } from "@/app/admin/(protected)/members/directory/[id]/MemberWithdrawalForm";

export const metadata = { title: "회원 상세 | DO:NUTS Admin" };

function MemberAffiliations({ member, kind, catalog }: { member: DirectoryMember; kind: "CLASS" | "CLUB"; catalog: { id: string; name: string }[] }) {
  const label = kind === "CLASS" ? "클래스" : "클럽";
  const base = kind === "CLASS" ? "/admin/classes" : "/admin/clubs";
  const memberships = kind === "CLASS" ? member.classes : member.clubs;
  const active = memberships.filter(row => row.active);
  const previous = memberships.filter(row => !row.active);
  const choices = catalog.filter(option => !active.some(row => row.id === option.id));
  const withdrawn = member.status === "WITHDRAWN";
  return <section className="min-w-0 space-y-5" aria-labelledby={`${kind}-title`}>
    <h2 id={`${kind}-title`} className="text-xl font-semibold">{label}</h2>
    {!active.length ? <p className="text-sm text-muted-foreground">{label} 소속이 없습니다.</p> : <ul className="divide-y divide-border border-y border-border">
      {active.map(entity => <li key={entity.id} className="space-y-3 py-4">
        <Link href={`${base}/${entity.id}`} className="inline-flex min-h-11 items-center break-words font-medium text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{entity.name}</Link>
        {!withdrawn && <details className="rounded-lg border border-border p-4"><summary className="cursor-pointer py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring">소속 해제</summary><div className="mt-4"><ActionForm action={setMemberAffiliation} label="소속 해제">
          <input type="hidden" name="user_id" value={member.id} /><input type="hidden" name="kind" value={kind} /><input type="hidden" name="entity_id" value={entity.id} /><input type="hidden" name="active" value="false" />
          <p className="text-sm text-muted-foreground">기존 출석·XP 기록은 유지됩니다.</p>
          <ReasonField id={`${kind}-${entity.id}-remove-reason`} label="해제 사유" />
        </ActionForm></div></details>}
      </li>)}
    </ul>}
    {!withdrawn && member.status === "ACTIVE" && choices.length > 0 && <details className="rounded-lg border border-border p-4"><summary className="cursor-pointer py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">{label} 추가</summary><div className="mt-4"><ActionForm action={setMemberAffiliation} label={`${label} 추가`}>
      <input type="hidden" name="user_id" value={member.id} /><input type="hidden" name="kind" value={kind} /><input type="hidden" name="active" value="true" />
      <div className="space-y-2"><Label htmlFor={`${kind}-add-entity`}>{label} 선택</Label><Select name="entity_id" required><SelectTrigger id={`${kind}-add-entity`} className="min-h-11 w-full"><SelectValue placeholder={`${label} 선택`} /></SelectTrigger><SelectContent>{choices.map(entity => <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>)}</SelectContent></Select></div>
      <ReasonField id={`${kind}-add-reason`} label="추가 사유" />
    </ActionForm></div></details>}
    {!withdrawn && member.status !== "ACTIVE" && <p className="text-sm text-muted-foreground">정회원 상태에서 소속을 추가할 수 있습니다.</p>}
    {previous.length > 0 && <details className="rounded-lg border border-border p-4"><summary className="cursor-pointer py-2 text-sm text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring">이전 소속 {previous.length}개</summary><ul className="mt-3 space-y-2">{previous.map(entity => <li key={entity.id}><Link href={`${base}/${entity.id}`} className="inline-flex min-h-11 items-center break-words text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{entity.name}</Link></li>)}</ul></details>}
  </section>;
}

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [directory, catalog] = await Promise.all([getMemberDirectory({ user_id: routeUuid(id) }), getMemberAdminCatalog()]);
  const member = directory.members[0];
  if (!member) notFound();
  const withdrawn = member.status === "WITHDRAWN";
  const suspended = member.status === "SUSPENDED";
  const leaders = member.leaders ?? [];
  return <div className="max-w-4xl space-y-8">
    <header className="space-y-4 border-b border-border pb-6">
      <Link href="/admin/members/directory" className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-gold focus-visible:outline-2 focus-visible:outline-ring">회원 목록</Link>
      <div className="flex flex-wrap items-baseline gap-3"><h1 className="break-words text-2xl font-semibold text-gold">{member.name}</h1><span className="text-sm text-muted-foreground">{memberStatusLabels[member.status]}</span></div>
      {!withdrawn && <p className="break-all text-sm text-muted-foreground">{member.email}</p>}
      <p className="text-xs text-muted-foreground">회원 번호 {member.id.slice(0, 8)}</p>
    </header>
    {member.withdrawal_status === "AUTH_PENDING" && <section className="space-y-4 rounded-card border border-coral-to/40 p-5">
      <h2 className="font-semibold text-coral-to">개인정보 정리를 완료해 주세요</h2>
      <p className="text-sm text-muted-foreground">회원 접근은 차단되었습니다. 남은 개인정보 정리를 다시 시도해 주세요.</p>
      <MemberWithdrawalForm memberId={member.id} retry />
    </section>}
    {withdrawn && member.withdrawal_status !== "AUTH_PENDING" && <p className="text-sm text-muted-foreground">탈퇴한 회원입니다. 활동 기록은 익명으로 보존됩니다.</p>}
    {!withdrawn && <section className="max-w-2xl space-y-5" aria-labelledby="profile-title">
      <h2 id="profile-title" className="text-xl font-semibold">기본 정보</h2>
      <ActionForm key={`${member.id}:${member.revision}`} action={saveMemberProfile} label="회원 정보 저장">
        <MemberProfileFields member={member} schools={catalog.schools.filter(school => school.active || school.id === member.school_id)} />
        <ReasonField id="profile-reason" />
      </ActionForm>
    </section>}
    <div className="grid gap-8 border-t border-border pt-8 md:grid-cols-2">
      <MemberAffiliations member={member} kind="CLASS" catalog={catalog.classes.filter(course => course.active && !course.closed_at && !course.archived_at)} />
      <MemberAffiliations member={member} kind="CLUB" catalog={catalog.clubs.filter(club => !club.archived_at)} />
    </div>
    {leaders.length > 0 && <section className="space-y-5 border-t border-border pt-8" aria-labelledby="member-leaders-title">
      <h2 id="member-leaders-title" className="text-xl font-semibold">담당 리더 권한</h2>
      <p className="text-sm text-muted-foreground">마지막 리더는 후임을 지정한 뒤 해제할 수 있습니다.</p>
      <ul className="grid gap-4 sm:grid-cols-2">{leaders.map(leader => <li key={`${leader.kind}:${leader.id}`} className="space-y-3 rounded-lg border border-border p-4">
        <Link href={`/admin/${leader.kind === "CLASS" ? "classes" : "clubs"}/${leader.id}`} className="inline-flex min-h-11 items-center font-medium text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{leader.name} · {leader.kind === "CLASS" ? "클래스장" : "클럽장"}</Link>
        {!withdrawn && <ActionForm action={removeMembershipLeader} label="리더 해제"><input type="hidden" name="kind" value={leader.kind} /><input type="hidden" name="entity_id" value={leader.id} /><input type="hidden" name="user_id" value={member.id} /></ActionForm>}
      </li>)}</ul>
    </section>}
    {!withdrawn && <section className="max-w-2xl space-y-5 border-t border-border pt-8" aria-labelledby="account-title">
      <h2 id="account-title" className="text-xl font-semibold">계정 관리</h2>
      <ActionForm action={sendMemberRecovery} label="비밀번호 재설정 메일 보내기"><input type="hidden" name="user_id" value={member.id} /></ActionForm>
      <details className="rounded-lg border border-border p-4"><summary className="cursor-pointer py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">{suspended ? "이용 정지 해제" : "회원 이용 정지"}</summary><div className="mt-4"><ActionForm action={changeMemberSuspension} label={suspended ? "정지 해제" : "이용 정지"}>
        <input type="hidden" name="user_id" value={member.id} /><input type="hidden" name="mode" value={suspended ? "RESTORE" : "SUSPEND"} />
        <p className="text-sm leading-relaxed text-muted-foreground">{suspended ? "소속과 기록은 유지되며, 리더 권한은 자동으로 복구되지 않습니다." : "회원 이용을 차단하고 리더 권한을 해제합니다. 소속과 기록은 유지됩니다."}</p>
        <ReasonField id="member-status-reason" /><Confirmation id="member-status-confirm">소속과 리더 권한의 변경 내용을 확인했습니다.</Confirmation>
      </ActionForm></div></details>
      <div className="border-t border-border pt-5"><MemberWithdrawalForm memberId={member.id} /></div>
    </section>}
  </div>;
}
