import Link from "next/link";
import { addClassSession } from "@/app/classes/actions";
import { getClassIndex, getManagedClass } from "@/lib/classes/server";
import { getEntityHistory } from "@/lib/membership/operations";
import { classStatus, formatSessionDate, toSeoulInput, weekdays } from "@/lib/classes/format";
import { ClassEditor, EntityRetirement } from "@/components/membership/EntityForms";
import { EntityPeoplePanel } from "@/components/membership/EntityPeoplePanel";
import { OperationHistory } from "@/components/membership/OperationHistory";
import { SessionList } from "@/components/classes/SessionList";
import { ActionForm } from "@/components/membership/ActionForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export async function ClassManagementIndex({ basePath }: { basePath: string }) {
  const data = await getClassIndex();
  return <div className="mx-auto max-w-5xl space-y-10">
    <header className="border-b border-border pb-8"><p className="text-xs font-semibold tracking-widest text-gold">CLASS OPERATIONS</p><h1 className="mt-4 text-3xl font-semibold">{data.isAdmin ? "클래스 관리" : "담당 클래스"}</h1><p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">실제 회차를 중심으로 일정을 운영하고, 승인된 회원의 출석을 기록합니다. 모든 회차가 완료되거나 취소되면 클래스가 종료됩니다.</p><Link href={data.isAdmin ? "/admin/members" : "/leader/approvals"} className="mt-4 inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring">소속 신청 승인</Link></header>
    {!data.classes.length ? <p className="py-6 text-sm text-muted-foreground">{data.isAdmin ? "아직 클래스가 없습니다. 담당 리더와 첫 회차를 함께 등록해 주세요." : "현재 담당하는 클래스가 없습니다."}</p> : <ul className="divide-y divide-border">{data.classes.map(course => <li key={course.id} className="flex flex-wrap items-start justify-between gap-4 py-6"><div><p className="text-xs font-semibold text-gold">{classStatus(course)}{!course.archived_at && !course.closed_at ? ` / ${course.active ? "소속 신청 중" : "소속 신청 중지"}` : ""}</p><h2 className="mt-2 text-xl font-semibold"><Link href={`${basePath}/${course.id}`} className="hover:underline focus-visible:outline-2 focus-visible:outline-ring">{course.name}</Link></h2><p className="mt-3 text-sm text-muted-foreground">{weekdays[course.weekday]} {course.start_time.slice(0, 5)} / {course.place}</p></div><Button asChild variant="outline" className="h-11"><Link href={`${basePath}/${course.id}`}>{course.archived_at ? "보관 기록 보기" : "클래스 운영"}</Link></Button></li>)}</ul>}
    {data.isAdmin && <details className="rounded-card border border-border bg-card p-5 sm:p-8"><summary className="cursor-pointer py-2 text-lg font-semibold focus-visible:outline-2 focus-visible:outline-ring">새 클래스 생성</summary><div className="mt-6 max-w-2xl"><ClassEditor candidates={data.candidates} currentUserId={data.user.id} /></div></details>}
  </div>;
}

export async function ClassManagement({ id, basePath }: { id: string; basePath: string }) {
  const data = await getManagedClass(id);
  const events = await getEntityHistory(data.supabase, "CLASS", id);
  const { course } = data;
  const last = data.sessions[data.sessions.length - 1];
  const nextDate = last ? toSeoulInput(new Date(Date.parse(last.scheduled_at) + 7 * 24 * 60 * 60 * 1000).toISOString()) : "";
  return <div className="mx-auto max-w-5xl space-y-10">
    <header className="border-b border-border pb-8"><Button asChild variant="link" className="mb-4 h-11 px-0"><Link href={basePath}>클래스 운영 목록</Link></Button><p className="text-xs font-semibold tracking-widest text-gold">{classStatus(course)} / CLASS</p><h1 className="mt-4 break-words text-3xl font-semibold">{course.name}</h1><p className="mt-4 text-sm text-muted-foreground">{course.place} / 기본 {weekdays[course.weekday]} {course.start_time.slice(0, 5)}</p>{course.description && <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{course.description}</p>}
      {course.archived_at ? <p className="mt-4 text-sm text-gold">보관된 클래스입니다. 모든 기록은 읽기 전용입니다.</p> : course.closed_at ? <p className="mt-4 text-sm text-gold">{formatSessionDate(course.closed_at)} 종료. 출석 정정은 가능하며, 미완료 회차의 취소 복구는 관리자만 할 수 있습니다.</p> : course.first_closed_at && <p className="mt-4 text-sm text-gold">오류 정정을 위해 복구된 클래스입니다. 새 회차 추가로 연장할 수 없습니다.</p>}
    </header>
    <div className="grid items-start gap-10 lg:grid-cols-3">
      <section className="min-w-0 space-y-6 lg:col-span-2" aria-labelledby="class-sessions-heading"><div className="flex items-baseline justify-between gap-3"><h2 id="class-sessions-heading" className="text-xl font-semibold">회차 · 출석</h2><p className="text-sm text-muted-foreground">총 {data.sessions.length}회차 / 한국 시간</p></div>
        <SessionList sessions={data.sessions} managementPath={`${basePath}/${id}`} />
        {data.isAdmin && !course.archived_at && !course.first_closed_at && <details className="rounded-lg border border-border p-5"><summary className="cursor-pointer py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">회차 추가</summary><div className="mt-4"><ActionForm key={`add:${course.revision}`} action={addClassSession} label="예정 회차 추가"><input type="hidden" name="class_id" value={id} /><input type="hidden" name="revision" value={course.revision} /><div className="space-y-2"><Label htmlFor="additional-session-date">실제 회차 날짜 · 한국 시간</Label><Input id="additional-session-date" name="scheduled_at" type="datetime-local" defaultValue={nextDate} required className="h-11" /></div><p className="text-sm leading-relaxed text-muted-foreground">회차 수에 상한은 없습니다. 시작 이력이 생긴 뒤에는 기존 회차 삭제 대신 취소를 사용합니다.</p></ActionForm></div></details>}
        {data.isAdmin && !course.archived_at && <details className="rounded-lg border border-border p-5"><summary className="cursor-pointer py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">클래스 기본 정보 편집</summary><div className="mt-5"><ClassEditor course={course} candidates={data.candidates} currentUserId={data.user.id} /></div></details>}
      </section>
      <aside className="min-w-0 space-y-8"><EntityPeoplePanel kind="CLASS" id={id} people={data.people} candidates={data.candidates} isAdmin={data.isAdmin} archived={Boolean(course.archived_at)} />{data.isAdmin && !course.archived_at && <EntityRetirement kind="CLASS" id={id} revision={course.revision} />}</aside>
    </div>
    <OperationHistory events={events} />
  </div>;
}
