import Link from "next/link";
import { changeOperatingLeader, removeOperatingMember } from "@/app/admin/actions/entities";
import { ActionForm } from "@/components/membership/ActionForm";
import { Confirmation, EntityIdentity, ReasonField } from "@/components/membership/EntityForms";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AffiliationKind, EntityPeople, LeaderCandidate } from "@/lib/membership/types";

export function EntityPeoplePanel({ kind, id, people, candidates, isAdmin, archived }: {
  kind: AffiliationKind; id: string; people: EntityPeople; candidates: LeaderCandidate[]; isAdmin: boolean; archived: boolean;
}) {
  const available = candidates.filter(person => !people.leaders.some(leader => leader.id === person.id));
  return <div className="space-y-10">
    <section aria-labelledby={`${id}-leaders`}>
      <h2 id={`${id}-leaders`} className="text-xl font-semibold">담당 리더</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">운영 권한과 소속은 별개입니다. 리더도 참여하려면 별도의 신청과 승인이 필요합니다.</p>
      {!people.leaders.length && <p role="status" className="mt-4 text-sm text-gold">지정된 리더가 없습니다. 관리자가 운영을 이어가고 후임을 지정해 주세요.</p>}
      <ul className="mt-4 divide-y divide-border">{people.leaders.map(leader => <li key={leader.id} className="py-4">
        <p className="break-words text-sm font-medium">{leader.label === "Administrator" ? "관리자" : leader.label}{!leader.eligible && <span className="ml-2 text-coral-300">운영 자격 확인 필요</span>}</p>
        {isAdmin && !archived && <details className="mt-3"><summary className="cursor-pointer py-2 text-sm text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring">리더 권한 해제</summary><div className="mt-3 max-w-md"><ActionForm action={changeOperatingLeader} label="리더 해제" disabled={!people.leaders.some(other => other.id !== leader.id && other.eligible)}>
          <EntityIdentity kind={kind} id={id} /><input type="hidden" name="user_id" value={leader.id} /><input type="hidden" name="mode" value="REMOVE" />
          <p className="text-sm text-muted-foreground">다른 운영 가능한 리더가 있어야 해제할 수 있습니다. 마지막 리더의 이용 정지는 회원 관리에서 즉시 처리할 수 있습니다.</p>
          <Confirmation id={`remove-leader-${id}-${leader.id}`}>이 소속의 운영 권한을 해제합니다.</Confirmation>
        </ActionForm></div></details>}
      </li>)}</ul>
      {isAdmin && !archived && <details className="mt-4 rounded-lg border border-border p-4"><summary className="cursor-pointer py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">담당 리더 추가</summary><div className="mt-4"><ActionForm action={changeOperatingLeader} label="리더 지정" disabled={!available.length}>
        <EntityIdentity kind={kind} id={id} /><input type="hidden" name="mode" value="ASSIGN" />
        <div className="space-y-2"><Label htmlFor={`${id}-new-leader`}>관리자 또는 인증된 정회원</Label><Select name="user_id" required><SelectTrigger id={`${id}-new-leader`} className="h-11 w-full"><SelectValue placeholder="리더 선택" /></SelectTrigger><SelectContent>{available.map(person => <SelectItem key={person.id} value={person.id}>{person.label}{person.is_admin ? " / 관리자" : ""}</SelectItem>)}</SelectContent></Select></div>
        {!available.length && <p className="text-sm text-muted-foreground">추가로 지정할 수 있는 후보가 없습니다.</p>}
      </ActionForm></div></details>}
    </section>
    <section aria-labelledby={`${id}-members`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 id={`${id}-members`} className="text-xl font-semibold">소속 회원</h2><span className="text-sm text-muted-foreground">현재 {people.members.filter(member => member.active).length}명</span></div>
      {!archived && <Link href={isAdmin ? "/admin/members" : "/leader/approvals"} className="mt-3 inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">대기 중인 소속 신청 처리</Link>}
      {!people.members.length ? <p className="mt-5 text-sm text-muted-foreground">승인된 소속 회원이 없습니다. 리더 지정은 회원 가입 승인을 대신하지 않습니다.</p> : <ul className="mt-3 divide-y divide-border">{people.members.map(member => <li key={member.id} className="py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-medium">{member.name} <span className="text-sm font-normal text-muted-foreground">회원 번호 {member.id.slice(0, 8)}</span></h3><span className="text-xs text-muted-foreground">{!member.active ? "이전 소속" : member.status === "SUSPENDED" ? "소속 유지 · 이용 정지" : member.status === "WITHDRAWN" ? "탈퇴" : "소속 중"}</span></div>
        {isAdmin && !archived && member.active && <details className="mt-2"><summary className="cursor-pointer py-2 text-sm text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring">소속 해제</summary><div className="mt-3 max-w-md"><ActionForm action={removeOperatingMember} label="이 소속만 해제">
          <EntityIdentity kind={kind} id={id} /><input type="hidden" name="user_id" value={member.id} />
          <p className="text-sm leading-relaxed text-muted-foreground">다른 소속, 과거 출석·XP와 별도 리더 권한은 유지합니다. 다시 소속되려면 신청·승인이 필요합니다.</p>
          <ReasonField id={`remove-member-${id}-${member.id}-reason`} /><Confirmation id={`remove-member-${id}-${member.id}-confirm`}>이 소속만 해제하고 과거 기록은 보존합니다.</Confirmation>
        </ActionForm></div></details>}
      </li>)}</ul>}
    </section>
  </div>;
}
