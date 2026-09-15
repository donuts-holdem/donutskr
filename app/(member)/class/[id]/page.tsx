import Link from "next/link";
import { getClassOverview } from "@/lib/classes/server";
import { classStatus, weekdays } from "@/lib/classes/format";
import { SessionList } from "@/components/classes/SessionList";
import { ClassProgress } from "@/components/classes/ClassProgress";

export const metadata = { title: "클래스 · 내 회차 | DO:NUTS CLASS" };
export default async function MemberClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getClassOverview(id);
  const { course } = data;
  return <section className="space-y-8"><header className="border-b border-border pb-8"><Link href="/class" className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">클래스 목록</Link><p className="mt-5 text-xs font-semibold tracking-widest text-gold">{classStatus(course)} / CLASS</p><h1 className="mt-4 break-words text-3xl font-semibold sm:text-4xl">{course.name}</h1><p className="mt-5 text-sm text-ink/70">{course.place} / 기본 {weekdays[course.weekday]} {course.start_time.slice(0, 5)}</p>{course.description && <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink/70">{course.description}</p>}{data.canManage && <Link href={`${data.isAdmin ? "/admin/classes" : "/leader/class"}/${id}`} className="mt-4 inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">클래스 · 출석 운영</Link>}</header>
    {(data.hasAffiliation || data.canManage) && <ClassProgress sessions={data.sessions} classId={id} />}
    <div className="space-y-6"><h2 className="text-xl font-semibold">수업 일정</h2>{!data.sessions.length && <p className="text-sm text-ink/70">소속 승인 후 수업 일정과 내용을 확인할 수 있습니다.</p>}<SessionList sessions={data.sessions} memberPath={`/class/${id}`} ownAttendance={data.ownAttendance} /></div>
    {course.active && !course.closed_at && !course.archived_at && <Link href="/class" className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">소속 신청 · 승인 상태 확인</Link>}
  </section>;
}
