export type SessionStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
export type AttendanceMark = "UNCONFIRMED" | "PRESENT" | "ABSENT";

export interface ClassRecord {
  id: string;
  name: string;
  description: string;
  place: string;
  weekday: number;
  start_time: string;
  active: boolean;
  first_started_at: string | null;
  closed_at: string | null;
  first_closed_at: string | null;
  archived_at: string | null;
  revision: number;
  created_at: string;
}

export interface ClassSession {
  id: string;
  class_id: string;
  session_number: number;
  scheduled_at: string;
  status: SessionStatus;
  first_started_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  roster_run: number;
  attendance_saved_at: string | null;
  attendance_locked: boolean;
  revision: number;
}

export interface AttendanceEntry {
  session_id: string;
  roster_run: number;
  user_id: string;
  snapshot_name: string;
  snapshot_username: string | null;
  mark: AttendanceMark;
  checked_at: string | null;
}
