import { formatSessionDate } from "@/lib/classes/format";
import type { EntityOperation } from "@/lib/membership/types";

const labels: Record<string, string> = {
  ENTITY_CREATED: "생성", ENTITY_UPDATED: "기본 정보 변경", ENTITY_ARCHIVED: "보관", ENTITY_DELETED: "미사용 항목 삭제",
  LEADER_ASSIGNED: "리더 지정", LEADER_REMOVED: "리더 해제", AFFILIATION_REMOVED: "소속 해제", SESSION_ADDED: "회차 추가",
  SESSION_DELETED: "회차 삭제", SESSION_RESCHEDULED: "회차 일정 변경", CLASS_CLOSED: "모든 회차 종료",
  CLASS_REOPENED_FOR_CORRECTION: "오류 정정용 클래스 복구", START: "회차 시작", REVERT_START: "시작 되돌림",
  SAVE_ATTENDANCE: "출석 저장", MISSING_AS_ABSENT: "미확인 회원 일괄 결석", ADD_ATTENDEE: "출석 명단 추가",
  LOCK: "출석 확정", UNLOCK: "출석 확정 해제", COMPLETE: "회차 완료", CANCEL: "회차 취소", RESTORE_CANCEL: "취소 복구",
};

export function OperationHistory({ events }: { events: EntityOperation[] }) {
  return <section className="border-t border-border pt-8" aria-label="운영 변경 이력"><h2 className="text-xl font-semibold">변경 이력</h2><p className="mt-2 text-sm text-muted-foreground">최근 50건 · 전체 감사 기록은 삭제하지 않고 보존합니다.</p>
    {!events.length ? <p className="mt-5 text-sm text-muted-foreground">기록된 변경이 없습니다.</p> : <ol className="mt-5 divide-y divide-border">{events.map(event => <li key={event.id} className="py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-sm font-semibold">{labels[event.action] ?? event.action}</h3><time dateTime={event.created_at} className="text-xs text-muted-foreground">{formatSessionDate(event.created_at)}</time></div>
      {event.reason && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{event.reason === "All sessions completed or cancelled" ? "모든 회차가 완료 또는 취소되어 자동 종료되었습니다." : event.reason}</p>}
      <details className="mt-2"><summary className="cursor-pointer py-2 text-xs text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring">처리자 · 변경 전후 기록</summary><p className="my-3 break-all font-mono text-xs text-muted-foreground">처리자 Auth ID: {event.actor_id}</p><div className="grid gap-4 md:grid-cols-2">{[["변경 전", event.before_state], ["변경 후", event.after_state]].map(([label, value]) => <div key={String(label)} className="min-w-0"><p className="mb-2 text-xs font-semibold">{String(label)}</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-bg p-3 font-mono text-xs leading-relaxed">{JSON.stringify(value, null, 2)}</pre></div>)}</div></details>
    </li>)}</ol>}
  </section>;
}
