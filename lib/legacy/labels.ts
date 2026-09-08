import type { DerivedEventStatus, StoredEventStatus } from "@/lib/legacy/types";

export const EVENT_STATUS_LABELS: Record<DerivedEventStatus, string> = {
  scheduled: "예정",
  running: "진행중",
  reg_closed: "레지마감",
  completed: "완료",
  canceled: "취소",
  hidden: "숨김",
};

export const STORED_EVENT_STATUS_LABELS: Record<StoredEventStatus, string> = {
  auto: "자동",
  canceled: "취소",
  hidden: "숨김",
};

export const EVENT_STATUS_OPTIONS = (
  Object.keys(STORED_EVENT_STATUS_LABELS) as StoredEventStatus[]
).map((value) => ({ value, label: STORED_EVENT_STATUS_LABELS[value] }));

export function eventStatusLabel(status: string): string {
  return EVENT_STATUS_LABELS[status as DerivedEventStatus] ??
    STORED_EVENT_STATUS_LABELS[status as StoredEventStatus] ?? status;
}
