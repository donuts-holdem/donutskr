import type { EventStatus } from "@/lib/types";

const LABEL: Record<EventStatus, string> = {
  scheduled: "예정",
  confirmed: "확정",
  running: "진행중",
  reg_closed: "레지마감",
  completed: "완료",
  canceled: "취소",
  hidden: "숨김",
};

const STYLE: Record<EventStatus, string> = {
  scheduled: "bg-amber-100 text-amber-800",
  confirmed: "bg-gold text-bg",
  running: "bg-coral-from text-ink",
  reg_closed: "bg-ink/20 text-ink/60",
  completed: "bg-ink/10 text-ink/40",
  canceled: "bg-ink/10 text-ink/30",
  hidden: "bg-ink/10 text-ink/30",
};

export function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <span
      className={`inline-block rounded-pill px-2.5 py-0.5 text-xs font-medium ${STYLE[status]}`}
    >
      {LABEL[status]}
    </span>
  );
}
