import Link from "next/link";
import { changeClassSession } from "@/app/classes/actions";
import { getSessionBoard } from "@/lib/classes/server";
import { getEntityHistory } from "@/lib/membership/operations";
import { attendanceLabels, formatSessionDate, sessionStatus } from "@/lib/classes/format";
import type { ClassSession } from "@/lib/classes/types";
import { ActionForm } from "@/components/membership/ActionForm";
import { Confirmation, ReasonField } from "@/components/membership/EntityForms";
import { OperationHistory } from "@/components/membership/OperationHistory";
import { SessionScheduleForm } from "@/components/classes/SessionScheduleForm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function SessionIdentity({ session, mode }: { session: ClassSession; mode: string }) {
  return <><input type="hidden" name="class_id" value={session.class_id} /><input type="hidden" name="session_id" value={session.id} /><input type="hidden" name="revision" value={session.revision} /><input type="hidden" name="mode" value={mode} /></>;
}

function SessionControl({ session, mode, label, description, reason = false, confirmation = false, disabled = false }: {
  session: ClassSession; mode: string; label: string; description: string; reason?: boolean; confirmation?: boolean; disabled?: boolean;
}) {
  const prefix = `${session.id}-${mode}`;
  return <ActionForm key={`${prefix}:${session.revision}`} action={changeClassSession} label={label} disabled={disabled}>
    <SessionIdentity session={session} mode={mode} /><p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    {(reason || session.status === "COMPLETED") && <ReasonField id={`${prefix}-reason`} />}
    {confirmation && <Confirmation id={`${prefix}-confirm`}>{label}의 영향과 기록 보존 안내를 확인했습니다.</Confirmation>}
  </ActionForm>;
}

export async function SessionBoard({ classId, sessionId, basePath }: { classId: string; sessionId: string; basePath: string }) {
  const data = await getSessionBoard(classId, sessionId);
  const events = await getEntityHistory(data.supabase, "CLASS", classId, sessionId);
  const { course, session, attendance } = data;
  const archived = Boolean(course.archived_at);
  const running = session.status === "IN_PROGRESS";
  const completed = session.status === "COMPLETED";
  const editable = !archived && !session.cancelled_at && !session.attendance_locked && (running || completed);
  const missing = attendance.filter(row => row.mark === "UNCONFIRMED").length;
  const additions = data.people.members.filter(member => member.active && !attendance.some(row => row.user_id === member.id));
  return <div className="mx-auto max-w-5xl space-y-10">
    <header className="border-b border-border pb-8"><Button asChild variant="link" className="mb-4 h-11 px-0"><Link href={`${basePath}/${classId}`}>{course.name} 운영으로</Link></Button><p className="text-xs font-semibold tracking-widest text-gold">SESSION {String(session.session_number).padStart(2, "0")} / {sessionStatus(session)}</p><h1 className="mt-4 text-3xl font-semibold">{session.session_number}회차 · 출석 기록</h1><p className="mt-4 text-sm text-muted-foreground"><time dateTime={session.scheduled_at}>{formatSessionDate(session.scheduled_at)}</time> / 한국 시간</p><p className="mt-2 text-sm text-muted-foreground">{course.place}</p>{archived && <p className="mt-4 text-sm text-gold">보관된 클래스입니다. 회차와 출석은 읽기 전용입니다.</p>}{session.cancelled_at && <p className="mt-4 whitespace-pre-wrap break-words text-sm text-gold">취소 사유: {session.cancellation_reason}</p>}</header>
    <div className="grid items-start gap-10 lg:grid-cols-3">
      <section className="min-w-0 space-y-6 lg:col-span-2" aria-labelledby="attendance-heading">
        <div><h2 id="attendance-heading" className="text-xl font-semibold">{session.status === "SCHEDULED" && session.roster_run > 0 ? "이전 시작 시점의 명단" : "출석 명단"}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{session.status === "SCHEDULED" ? "시작할 때 승인된 소속 회원의 명단을 고정합니다. 시작을 되돌린 기록은 보존하며, 다시 시작하면 새 명단을 만듭니다." : `명단 ${session.roster_run}차 스냅샷. 이후 소속 변경은 이 명단을 자동 변경하지 않습니다. 리더는 승인된 소속이 있는 경우에만 포함됩니다.`}</p></div>
        <dl className="grid grid-cols-3 gap-3 border-y border-border py-5">{[["출석", attendance.filter(row => row.mark === "PRESENT").length], ["결석", attendance.filter(row => row.mark === "ABSENT").length], ["미확인", missing]].map(([label, count]) => <div key={String(label)}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-2 font-mono text-2xl text-gold">{count}</dd></div>)}</dl>
        {completed && !session.attendance_locked && !session.cancelled_at && <p role="status" className="rounded-lg border border-gold/30 bg-glass p-4 text-sm leading-relaxed text-gold">완료 상태를 유지한 채 출석을 정정하고 있습니다. 기존 XP는 유지되며, 다시 확정하면 변경된 출석에 맞춰 차이만 반영됩니다.</p>}
        {editable ? <ActionForm key={`attendance:${session.id}:${session.revision}`} action={changeClassSession} label="출석 상태 저장">
          <SessionIdentity session={session} mode="SAVE_ATTENDANCE" />
          {!attendance.length ? <p className="text-sm text-muted-foreground">명단이 비어 있습니다. 승인된 소속 회원이 있다면 아래에서 추가해 주세요.</p> : <ul className="divide-y divide-border">{attendance.map(row => <li key={row.user_id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="break-words font-medium">{row.snapshot_name}</p><p className="mt-1 break-words text-xs text-muted-foreground">회원 번호 {row.user_id.slice(0, 8)}</p></div><div className="min-w-32"><Label htmlFor={`mark-${row.user_id}`} className="sr-only">{row.snapshot_name} 출석 상태</Label><Select name={`mark:${row.user_id}`} defaultValue={row.mark} required><SelectTrigger id={`mark-${row.user_id}`} className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(attendanceLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div></li>)}</ul>}
          {completed && <ReasonField id={`${session.id}-attendance-reason`} label="완료 후 출석 정정 사유" />}
          <p className="text-sm leading-relaxed text-muted-foreground">저장만으로 출석이 확정되거나 XP가 지급되지는 않습니다. 모든 회원을 확인한 뒤 출석을 확정해 주세요.</p>
        </ActionForm> : !attendance.length ? <p className="py-4 text-sm text-muted-foreground">기록된 명단이 없습니다.</p> : <ul className="divide-y divide-border">{attendance.map(row => <li key={row.user_id} className="flex flex-wrap items-baseline justify-between gap-3 py-4"><div><p className="break-words font-medium">{row.snapshot_name}</p><p className="mt-1 text-xs text-muted-foreground">회원 번호 {row.user_id.slice(0, 8)}</p></div><span className="text-sm text-gold">{attendanceLabels[row.mark]}</span></li>)}</ul>}
        {editable && <div className="space-y-5">
          <details className="rounded-lg border border-border p-5"><summary className="cursor-pointer py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">미확인 회원만 일괄 결석 처리</summary><div className="mt-4"><SessionControl session={session} mode="MISSING_AS_ABSENT" label="미확인 회원만 결석으로 저장" description={`현재 미확인 ${missing}명만 결석으로 변경합니다. 이미 출석·결석으로 표시한 회원은 변경하지 않습니다.`} confirmation disabled={missing === 0} /></div></details>
          <details className="rounded-lg border border-border p-5"><summary className="cursor-pointer py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">승인된 소속 회원을 명단에 추가</summary><div className="mt-4"><ActionForm key={`add-attendee:${session.revision}`} action={changeClassSession} label="출석 명단에 추가" disabled={!additions.length}>
            <SessionIdentity session={session} mode="ADD_ATTENDEE" /><p className="text-sm leading-relaxed text-muted-foreground">소속 승인을 받은 회원만 추가할 수 있습니다. 추가한 회원은 미확인 상태로 시작합니다.</p>
            <div className="space-y-2"><Label htmlFor={`${session.id}-add-member`}>추가할 소속 회원</Label><Select name="user_id" required><SelectTrigger id={`${session.id}-add-member`} className="h-11 w-full"><SelectValue placeholder="회원 선택" /></SelectTrigger><SelectContent>{additions.map(member => <SelectItem key={member.id} value={member.id}>{member.name} (회원 번호 {member.id.slice(0, 8)})</SelectItem>)}</SelectContent></Select></div>
            <ReasonField id={`${session.id}-add-reason`} label="명단 추가 사유" />{!additions.length && <p className="text-sm text-muted-foreground">추가할 수 있는 승인 회원이 없습니다.</p>}
          </ActionForm></div></details>
        </div>}
      </section>
      <aside className="min-w-0 space-y-6" aria-label="회차 운영 작업">
        {!archived && !session.cancelled_at && <>
          {session.status === "SCHEDULED" && <SessionControl session={session} mode="START" label="회차 시작 · 명단 고정" description="현재 승인된 클래스 소속 회원을 출석 명단으로 고정합니다. 시작 시 출석은 모두 미확인입니다." />}
          {(running || completed) && !session.attendance_locked && <SessionControl session={session} mode="LOCK" label={completed ? "정정 확정 · XP 반영" : "출석 확정"} description={missing ? `미확인 ${missing}명의 출석·결석을 먼저 저장해 주세요.` : completed ? "정정한 출석을 확정하고 기존 XP와의 차이만 기록합니다. 재확정으로 XP가 중복 지급되지 않습니다." : "명단 전체를 확인했습니다. 출석 확정 후 회차를 완료하면 출석한 회원에게 100 XP가 지급됩니다."} disabled={missing > 0} />}
          {(running || completed) && session.attendance_locked && <SessionControl session={session} mode="UNLOCK" label="출석 확정 해제" description="사유를 기록하고 출석을 다시 수정합니다. 완료된 회차는 완료 상태와 기존 XP를 유지합니다." reason />}
          {running && session.attendance_locked && <SessionControl session={session} mode="COMPLETE" label="회차 완료 · 출석 XP 반영" description="회차를 완료하고 확정된 출석에 100 XP를 반영합니다. 마지막 남은 회차라면 클래스가 자동 종료됩니다." />}
          {running && !session.attendance_saved_at && !session.attendance_locked && <details className="rounded-lg border border-border p-5"><summary className="cursor-pointer py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring">시작을 잘못 눌렀나요?</summary><div className="mt-4"><SessionControl session={session} mode="REVERT_START" label="예정 상태로 되돌리기" description="출석을 저장·확정하기 전에만 가능합니다. 이번 시작 기록과 명단을 삭제하지 않고, 다음 시작에서 새 명단을 만듭니다." reason confirmation /></div></details>}
          {(session.status === "SCHEDULED" || data.isAdmin) && <details className="rounded-lg border border-border p-5"><summary className="cursor-pointer py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">회차 날짜 · 시간 변경</summary><div className="mt-4"><SessionScheduleForm key={`schedule:${session.revision}`} session={session} sessions={data.sessions} /></div></details>}
          <details className="rounded-lg border border-border p-5"><summary className="cursor-pointer py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring">회차 취소</summary><div className="mt-4"><SessionControl session={session} mode="CANCEL" label="회차 취소" description="출석과 운영 이력은 보존합니다. 이 회차에서 지급된 출석 XP가 있다면 그 금액만 회수합니다. 모든 회차가 완료·취소되면 클래스가 종료됩니다." reason confirmation /></div></details>
          {data.isAdmin && !course.first_started_at && !course.first_closed_at && session.status === "SCHEDULED" && data.sessions.length > 1 && <details className="rounded-lg border border-border p-5"><summary className="cursor-pointer py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring">미사용 예정 회차 삭제</summary><div className="mt-4"><SessionControl session={session} mode="DELETE" label="이 예정 회차 삭제" description="클래스를 한 번이라도 시작한 뒤에는 삭제할 수 없습니다. 최소 한 회차는 남겨야 하며 삭제 기록은 감사 이력에 보존됩니다." reason confirmation /></div></details>}
        </>}
        {!archived && session.cancelled_at && (data.isAdmin || !course.closed_at || completed) && <SessionControl session={session} mode="RESTORE_CANCEL" label="오류 정정용 취소 복구" description={course.closed_at && !completed ? "기존 미완료 회차를 복구하여 클래스를 다시 엽니다. 소속 신청은 중지 상태를 유지하며 새 회차 추가는 금지됩니다. 종료 당시 명단과 기존 처리 이력은 보존됩니다." : "취소 전 진행 상태와 명단을 복구합니다. 완료·출석 확정 조건을 만족하면 출석 XP도 차이만 복구합니다."} reason confirmation />}
        {!archived && session.cancelled_at && course.closed_at && !completed && !data.isAdmin && <p className="rounded-lg border border-border p-5 text-sm leading-relaxed text-muted-foreground">종료된 클래스의 미완료 회차는 관리자가 사유를 기록하고 복구할 수 있습니다.</p>}
        <p className="border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">출석은 회차 시작 당시 소속을 기준으로 기록합니다. 완료 후 정정, 취소와 복구는 모두 처리자·사유·변경 전후 값으로 남습니다.</p>
      </aside>
    </div>
    <OperationHistory events={events} />
  </div>;
}
