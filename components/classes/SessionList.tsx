import Link from "next/link";
import { attendanceLabels, formatSessionDate, sessionStatus } from "@/lib/classes/format";
import type { AttendanceEntry, ClassSession } from "@/lib/classes/types";

export function SessionList({ sessions, managementPath, ownAttendance = [] }: { sessions: ClassSession[]; managementPath?: string; ownAttendance?: AttendanceEntry[] }) {
  if (!sessions.length) return <p className="border-y border-border py-8 text-sm leading-relaxed text-muted-foreground">표시할 회차가 없습니다. 회차는 승인된 소속 회원과 담당 운영진에게 공개됩니다.</p>;
  return <ol className="divide-y divide-border border-y border-border">{sessions.map(session => {
    const own = ownAttendance.find(row => row.session_id === session.id && row.roster_run === session.roster_run);
    return <li key={session.id} className="flex items-start gap-4 py-6 sm:gap-6">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border font-mono text-sm text-gold" aria-label={`${session.session_number}회차`}>{String(session.session_number).padStart(2, "0")}</span>
      <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-gold">{sessionStatus(session)}</p><h3 className="mt-2 text-base font-semibold">{managementPath ? <Link href={`${managementPath}/sessions/${session.id}`} className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold">{formatSessionDate(session.scheduled_at)}</Link> : <time dateTime={session.scheduled_at}>{formatSessionDate(session.scheduled_at)}</time>}</h3>
        {own && session.status !== "SCHEDULED" && <p className="mt-2 text-sm text-muted-foreground">내 출석: {attendanceLabels[own.mark]}{!session.attendance_locked ? " · 확정 전" : ""}{session.cancelled_at ? " · 취소된 회차" : ""}</p>}
        {session.cancellation_reason && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">취소 사유: {session.cancellation_reason}</p>}
        {managementPath && <Link href={`${managementPath}/sessions/${session.id}`} className="mt-2 inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">회차 · 출석 관리</Link>}
      </div>
    </li>;
  })}</ol>;
}
