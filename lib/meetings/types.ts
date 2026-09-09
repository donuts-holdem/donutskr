export interface ClubMeeting {
  id: string; club_id: string; created_by: string; title: string; description: string; place: string;
  scheduled_at: string; capacity: number | null; guest_allowed: boolean; signup_open: boolean;
  hold_hours: number; hot: boolean; status: "OPEN" | "COMPLETED" | "CANCELLED";
  completed_at: string | null; archived_at: string | null; revision: number; created_at: string;
}
export type MeetingApplicationStatus = "CONFIRMED" | "WAITLIST" | "OFFERED" | "DECLINED" | "EXPIRED" | "CANCELLED" | "INELIGIBLE" | "ENDED";
export interface MeetingApplication {
  id: string; meeting_id: string; user_id: string; status: MeetingApplicationStatus;
  queue_number: number; offered_at: string | null; offer_expires_at: string | null;
  confirmed_at: string | null; ended_at: string | null; created_at: string;
  name?: string; username?: string;
}
export interface MeetingBoard {
  meeting: ClubMeeting; can_manage: boolean; eligible: boolean; club_name: string;
  confirmed: number; reserved: number; waiting: number;
  application: MeetingApplication | null; people: MeetingApplication[];
}
export const applicationLabels: Record<MeetingApplicationStatus, string> = {
  CONFIRMED: "참여 확정", WAITLIST: "대기 중", OFFERED: "자리 제안 · 직접 확정 필요",
  DECLINED: "자리 제안 거절", EXPIRED: "확정 시간 만료", CANCELLED: "신청 취소",
  INELIGIBLE: "참여 자격 변경", ENDED: "모임 종료로 대기 마감",
};
