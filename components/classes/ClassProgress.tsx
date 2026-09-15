import Link from "next/link";
import { courseProgress, formatSessionDate } from "@/lib/classes/format";
import type { ClassSession } from "@/lib/classes/types";

export function ClassProgress({ sessions, classId, basePath }: { sessions: ClassSession[]; classId: string; basePath?: string }) {
  const progress = courseProgress(sessions);
  if (!progress.total) return null;
  return <div className="rounded-card border border-border bg-glass p-5 sm:p-6">
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div><p className="text-xs font-semibold text-ink/70">완료한 수업</p><p className="mt-3 font-mono text-3xl text-gold">{progress.completed}<span className="ml-2 text-base text-ink/60">/ {progress.total}회차</span></p></div>
      <p className="text-sm text-ink/70">남은 수업 {progress.remaining}회차{progress.cancelled > 0 ? ` · 취소 ${progress.cancelled}회차` : ""}</p>
    </div>
    {progress.current && <div className="mt-5 border-t border-border pt-5"><p className="text-xs font-semibold text-gold">{progress.current.status === "IN_PROGRESS" ? "진행 중" : "다음 수업"} · {progress.current.session_number}회차</p><Link href={`${basePath ?? `/class/${classId}`}/sessions/${progress.current.id}`} className="mt-2 inline-flex min-h-11 items-center break-words text-lg font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold">{progress.current.title || `${progress.current.session_number}회차`}</Link><time dateTime={progress.current.scheduled_at} className="mt-1 block text-sm text-ink/70">{formatSessionDate(progress.current.scheduled_at)}</time></div>}
  </div>;
}
