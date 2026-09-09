import { saveOperatingEntity, retireOperatingEntity } from "@/app/admin/actions/entities";
import { ActionForm } from "@/components/membership/ActionForm";
import { ClassCreationDates } from "@/components/classes/ClassCreationDates";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { weekdays } from "@/lib/classes/format";
import type { ClassRecord } from "@/lib/classes/types";
import type { ClubRecord } from "@/lib/clubs/types";
import type { AffiliationKind, LeaderCandidate, School } from "@/lib/membership/types";

export function EntityIdentity({ kind, id, revision }: { kind: AffiliationKind; id?: string; revision?: number }) {
  return <><input type="hidden" name="kind" value={kind} />{id && <input type="hidden" name="entity_id" value={id} />}{revision && <input type="hidden" name="revision" value={revision} />}</>;
}

export function ReasonField({ id, label = "변경 사유" }: { id: string; label?: string }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Textarea id={id} name="reason" maxLength={500} required className="min-h-20" /></div>;
}

export function Confirmation({ id, children }: { id: string; children: React.ReactNode }) {
  return <div className="flex items-start gap-3"><Checkbox id={id} name="confirm" required /><Label htmlFor={id} className="leading-relaxed">{children}</Label></div>;
}

function CreationLeaders({ candidates, currentUserId, prefix }: { candidates: LeaderCandidate[]; currentUserId: string; prefix: string }) {
  return <fieldset className="space-y-3"><legend className="mb-2 text-sm font-semibold">담당 리더 · 최소 1명</legend>
    <p className="text-sm leading-relaxed text-muted-foreground">현재 관리자 계정을 기본으로 선택합니다. 리더 지정만으로 소속이나 출석 명단에 추가되지는 않습니다.</p>
    <div className="max-h-64 space-y-3 overflow-y-auto rounded-lg border border-border p-4">{candidates.map(person => <div key={person.id} className="flex items-start gap-3"><Checkbox id={`${prefix}-${person.id}`} name="leader_ids" value={person.id} defaultChecked={person.id === currentUserId} /><Label htmlFor={`${prefix}-${person.id}`} className="break-words leading-relaxed">{person.label}{person.is_admin ? " / 관리자" : " / 정회원"}</Label></div>)}</div>
  </fieldset>;
}

export function ClassEditor({ course, candidates, currentUserId }: { course?: ClassRecord; candidates: LeaderCandidate[]; currentUserId: string }) {
  const prefix = course?.id ?? "create-class";
  return <ActionForm key={`${prefix}:${course?.revision ?? 0}`} action={saveOperatingEntity} label={course ? "클래스 기본 정보 저장" : "클래스 생성"} disabled={!course && !candidates.length}>
    <EntityIdentity kind="CLASS" id={course?.id} revision={course?.revision} />
    <div className="space-y-2"><Label htmlFor={`${prefix}-name`}>클래스명</Label><Input id={`${prefix}-name`} name="name" defaultValue={course?.name} maxLength={120} required className="h-11" /></div>
    <div className="space-y-2"><Label htmlFor={`${prefix}-description`}>클래스 소개</Label><Textarea id={`${prefix}-description`} name="description" defaultValue={course?.description} maxLength={4000} /></div>
    <div className="space-y-2"><Label htmlFor={`${prefix}-place`}>장소</Label><Input id={`${prefix}-place`} name="place" defaultValue={course?.place} maxLength={200} required className="h-11" /></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor={`${prefix}-weekday`}>기본 요일</Label><Select name="weekday" defaultValue={course ? String(course.weekday) : undefined} required><SelectTrigger id={`${prefix}-weekday`} className="h-11 w-full"><SelectValue placeholder="요일 선택" /></SelectTrigger><SelectContent>{weekdays.map((day, index) => <SelectItem key={day} value={String(index)}>{day}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor={`${prefix}-time`}>기본 시작 시간</Label><Input id={`${prefix}-time`} type="time" name="start_time" defaultValue={course?.start_time.slice(0, 5)} required className="h-11" /></div>
    </div>
    <div className="flex items-start gap-3"><Checkbox id={`${prefix}-active`} name="active" defaultChecked={course?.active ?? true} disabled={Boolean(course?.closed_at)} /><Label htmlFor={`${prefix}-active`} className="leading-relaxed">소속 신청 받기</Label></div>
    {course ? <><p className="text-sm leading-relaxed text-muted-foreground">기본 요일·시간 변경은 이미 등록된 회차에 영향을 주지 않습니다. 회차 상세에서 개별 변경 또는 이후 예정 회차 이동을 사용해 주세요.</p><ReasonField id={`${prefix}-reason`} /></> : <><CreationLeaders candidates={candidates} currentUserId={currentUserId} prefix={`${prefix}-leader`} /><ClassCreationDates /></>}
  </ActionForm>;
}

export function ClubEditor({ club, schools, candidates, currentUserId }: { club?: ClubRecord; schools: School[]; candidates: LeaderCandidate[]; currentUserId: string }) {
  const prefix = club?.id ?? "create-club";
  const options = schools.filter(school => school.active || school.id === club?.school_id);
  return <ActionForm key={`${prefix}:${club?.revision ?? 0}`} action={saveOperatingEntity} label={club ? "클럽 기본 정보 저장" : "클럽 생성"} disabled={!options.length || (!club && !candidates.length)}>
    <EntityIdentity kind="CLUB" id={club?.id} revision={club?.revision} />
    <div className="space-y-2"><Label htmlFor={`${prefix}-name`}>클럽명</Label><Input id={`${prefix}-name`} name="name" defaultValue={club?.name} maxLength={120} required className="h-11" /></div>
    <div className="space-y-2"><Label htmlFor={`${prefix}-school`}>클럽의 학교</Label><Select name="school_id" defaultValue={club?.school_id} required><SelectTrigger id={`${prefix}-school`} className="h-11 w-full"><SelectValue placeholder="학교 선택" /></SelectTrigger><SelectContent>{options.map(school => <SelectItem key={school.id} value={school.id}>{school.name}{!school.active ? " (기존 학교)" : ""}</SelectItem>)}</SelectContent></Select></div>
    <p className="text-sm leading-relaxed text-muted-foreground">다른 학교 회원도 신청할 수 있습니다. 클럽의 학교를 바꿔도 회원 개인의 학교는 바뀌지 않습니다.</p>
    <div className="space-y-2"><Label htmlFor={`${prefix}-description`}>클럽 소개</Label><Textarea id={`${prefix}-description`} name="description" defaultValue={club?.description} maxLength={4000} /></div>
    <div className="space-y-2"><Label htmlFor={`${prefix}-logo`}>로고 이미지 주소 · 선택</Label><Input id={`${prefix}-logo`} name="logo_url" type="url" defaultValue={club?.logo_url ?? ""} maxLength={2048} placeholder="https://..." className="h-11" /></div>
    <div className="space-y-2"><Label htmlFor={`${prefix}-atc`}>기본 ATC · 선택</Label><Input id={`${prefix}-atc`} name="default_atc" type="number" min={0} step={1} defaultValue={club?.default_atc ?? ""} className="h-11" /></div>
    {club ? <ReasonField id={`${prefix}-reason`} /> : <CreationLeaders candidates={candidates} currentUserId={currentUserId} prefix={`${prefix}-leader`} />}
    {!options.length && <p className="text-sm text-muted-foreground">가입 설정에서 학교를 먼저 등록해 주세요.</p>}
  </ActionForm>;
}

export function EntityRetirement({ kind, id, revision }: { kind: AffiliationKind; id: string; revision: number }) {
  return <details className="rounded-lg border border-border p-5">
    <summary className="cursor-pointer py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">보관 · 미사용 항목 삭제</summary>
    <div className="mt-5 space-y-8">
      <ActionForm action={retireOperatingEntity} label="기록을 보존하고 보관"><EntityIdentity kind={kind} id={id} revision={revision} /><input type="hidden" name="mode" value="ARCHIVE" />
        <p className="text-sm leading-relaxed text-muted-foreground">대기 신청과 남은 회차를 먼저 정리해 주세요. 보관 후에는 신청·운영·수정이 차단되며 이력은 읽기 전용으로 남습니다.</p>
        <ReasonField id={`${id}-archive-reason`} label="보관 사유" /><Confirmation id={`${id}-archive-confirm`}>읽기 전용 보관이며 일반 복구 기능은 제공하지 않음을 확인했습니다.</Confirmation>
      </ActionForm>
      <ActionForm action={retireOperatingEntity} label="미사용 항목 영구 삭제"><EntityIdentity kind={kind} id={id} revision={revision} /><input type="hidden" name="mode" value="DELETE" />
        <p className="text-sm leading-relaxed text-muted-foreground">신청·소속·참여 이력이 없는 항목만 삭제할 수 있습니다. 사용한 항목은 보관해 주세요. 삭제한 항목은 되돌릴 수 없습니다.</p>
        <ReasonField id={`${id}-delete-reason`} label="삭제 사유" /><Confirmation id={`${id}-delete-confirm`}>실제 사용 이력이 없는 항목을 영구 삭제합니다.</Confirmation>
      </ActionForm>
    </div>
  </details>;
}
