import Link from "next/link";
import { getSessionOverview } from "@/lib/classes/server";
import { attendanceLabels, formatSessionDate, sessionStatus } from "@/lib/classes/format";

export const metadata = { title: "수업 내용 | DO:NUTS CLASS" };

export default async function MemberSessionPage({ params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = await params;
  const data = await getSessionOverview(id, sessionId);
  const { course, session } = data;
  const own = data.attendance.find(row => row.roster_run === session.roster_run);
  const previousAttendance = data.attendance.filter(row => session.status === "SCHEDULED" || row.roster_run !== session.roster_run);
  const index = data.sessions.findIndex(item => item.id === session.id);
  const previous = data.sessions[index - 1];
  const next = data.sessions[index + 1];
  return <article className="mx-auto max-w-3xl space-y-8">
    <header className="border-b border-border pb-8">
      <Link href={`/class/${id}`} className="inline-flex min-h-11 items-center break-words text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">{course.name}</Link>
      <p className="mt-5 text-xs font-semibold tracking-widest text-gold">SESSION {String(session.session_number).padStart(2, "0")} / {sessionStatus(session)}</p>
      <h1 className="mt-4 break-words text-3xl font-semibold sm:text-4xl">{session.title || `${session.session_number}회차`}</h1>
      <time dateTime={session.scheduled_at} className="mt-5 block text-sm text-ink/70">{formatSessionDate(session.scheduled_at)}</time>
      <p className="mt-2 text-sm text-ink/70">{course.place}</p>
      {session.cancelled_at && <p className="mt-5 whitespace-pre-wrap break-words text-sm text-gold">취소 사유: {session.cancellation_reason}</p>}
    </header>
    <section aria-labelledby="session-content-heading"><h2 id="session-content-heading" className="text-xl font-semibold">수업 내용</h2><p className="mt-5 whitespace-pre-wrap break-words text-base leading-relaxed text-ink/80">{session.description || "수업 내용이 아직 등록되지 않았습니다."}</p></section>
    <section aria-labelledby="session-attendance-heading" className="border-y border-border py-6">
      <h2 id="session-attendance-heading" className="text-lg font-semibold">내 출석</h2>
      <p className="mt-3 text-sm text-gold">{session.status === "SCHEDULED" ? "수업 시작 전" : own ? `${attendanceLabels[own.mark]}${!session.attendance_locked ? " · 확정 전" : ""}${session.cancelled_at ? " · 취소된 회차" : ""}` : "출석 기록이 없습니다."}</p>
      {own?.checked_at && session.status !== "SCHEDULED" && <p className="mt-2 text-xs text-ink/60">확인 <time dateTime={own.checked_at}>{formatSessionDate(own.checked_at)}</time></p>}
      {previousAttendance.length > 0 && <details className="mt-4"><summary className="cursor-pointer py-2 text-sm text-ink/70 focus-visible:outline-2 focus-visible:outline-gold">이전 출석 기록</summary><ul className="mt-2 space-y-2">{previousAttendance.map(row => <li key={row.roster_run} className="text-sm text-ink/70">명단 {row.roster_run}차 · {attendanceLabels[row.mark]}{row.checked_at && <> · <time dateTime={row.checked_at}>{formatSessionDate(row.checked_at)}</time></>}</li>)}</ul></details>}
    </section>
    {data.canManage && <Link href={`${data.isAdmin ? "/admin/classes" : "/leader/class"}/${id}/sessions/${sessionId}`} className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">수업 내용 · 출석 관리</Link>}
    {(previous || next) && <nav aria-label="다른 회차" className="grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
      {previous && <Link href={`/class/${id}/sessions/${previous.id}`} className="min-w-0 rounded-card border border-border p-4 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold"><span className="text-xs text-ink/60">이전 · {previous.session_number}회차</span><span className="mt-2 block break-words text-sm font-semibold">{previous.title || `${previous.session_number}회차`}</span></Link>}
      {next && <Link href={`/class/${id}/sessions/${next.id}`} className="min-w-0 rounded-card border border-border p-4 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold"><span className="text-xs text-ink/60">다음 · {next.session_number}회차</span><span className="mt-2 block break-words text-sm font-semibold">{next.title || `${next.session_number}회차`}</span></Link>}
    </nav>}
  </article>;
}
