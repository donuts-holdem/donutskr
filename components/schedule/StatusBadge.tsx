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
  scheduled: "border border-gold/40 text-gold",
  confirmed: "bg-gold text-bg",
  running: "bg-coral-cta text-white",
  reg_closed: "border border-white/15 text-white/55",
  completed: "border border-white/10 text-white/40",
  canceled: "border border-white/10 text-white/35",
  hidden: "border border-white/10 text-white/35",
};

export function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-3 py-1 text-2xs font-semibold uppercase tracking-[0.06em] ${STYLE[status]}`}
    >
      {LABEL[status]}
    </span>
  );
}
