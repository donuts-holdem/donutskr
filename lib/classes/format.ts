import type { AttendanceMark, ClassRecord, ClassSession } from "@/lib/classes/types";

export const weekdays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
export const attendanceLabels: Record<AttendanceMark, string> = { UNCONFIRMED: "미확인", PRESENT: "출석", ABSENT: "결석" };

export function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "short",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(value));
}

export function toSeoulInput(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function parseSeoulDateTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("한국 시간 기준 날짜와 시간을 입력해 주세요.");
  const date = new Date(`${value}+09:00`);
  if (!Number.isFinite(date.getTime()) || toSeoulInput(date.toISOString()) !== value) throw new Error("유효한 날짜와 시간을 입력해 주세요.");
  return date.toISOString();
}

export function classStatus(course: ClassRecord) {
  return course.archived_at ? "보관됨" : course.closed_at ? "종료" : "운영 중";
}

export function sessionStatus(session: ClassSession) {
  if (session.cancelled_at) return "취소";
  if (session.status === "COMPLETED") return session.attendance_locked ? "완료" : "완료 · 출석 정정 중";
  return session.status === "IN_PROGRESS" ? (session.attendance_locked ? "진행 중 · 출석 확정" : "진행 중") : "예정";
}
