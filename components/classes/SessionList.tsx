import Link from "next/link";
import { attendanceLabels, formatSessionDate, sessionStatus } from "@/lib/classes/format";
import type { AttendanceEntry, ClassSession } from "@/lib/classes/types";

export function SessionList({ sessions, managementPath, memberPath, ownAttendance = [] }: { sessions: ClassSession[]; managementPath?: string; memberPath?: string; ownAttendance?: AttendanceEntry[] }) {
  if (!sessions.length) return <p className="border-y border-border py-8 text-sm leading-relaxed text-muted-foreground">공개된 회차가 없습니다.</p>;
  return <ol className="divide-y divide-border border-y border-border">{sessions.map(session => {
    const own = ownAttendance.find(row => row.session_id === session.id && row.roster_run === session.roster_run);
    const path = managementPath ?? memberPath;
    const title = session.title || `${session.session_number}회차`;
    return <li key={session.id} className="flex items-start gap-4 py-6 sm:gap-6">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border font-mono text-sm text-gold" aria-label={`${session.session_number}회차`}>{String(session.session_number).padStart(2, "0")}</span>
      <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-gold">{sessionStatus(session)}</p><h3 className="mt-2 break-words text-lg font-semibold">{path ? <Link href={`${path}/sessions/${session.id}`} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold">{title}</Link> : title}</h3>
        <time dateTime={session.scheduled_at} className="mt-1 block text-sm text-muted-foreground">{formatSessionDate(session.scheduled_at)}</time>
        {session.description && <p className="mt-3 line-clamp-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink/70">{session.description}</p>}
        {own && session.status !== "SCHEDULED" && <p className="mt-2 text-sm text-muted-foreground">내 출석: {attendanceLabels[own.mark]}{!session.attendance_locked ? " · 확정 전" : ""}{session.cancelled_at ? " · 취소된 회차" : ""}</p>}
        {session.cancellation_reason && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">취소 사유: {session.cancellation_reason}</p>}
        {managementPath && <Link href={`${managementPath}/sessions/${session.id}`} className="mt-2 inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold">회차 · 출석 관리</Link>}
      </div>
    </li>;
  })}</ol>;
}
