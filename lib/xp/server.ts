import "server-only";
import { requireActiveMember } from "@/lib/membership/server";
import type { AttendanceMark, SessionStatus } from "@/lib/classes/types";

export interface ClassActivity {
  total_xp: number;
  level: number;
  level_start_xp: number;
  next_level_xp: number;
  attendance: {
    session_id: string; class_id: string; class_name: string; session_number: number;
    scheduled_at: string; status: SessionStatus; cancelled_at: string | null;
    attendance_locked: boolean; mark: AttendanceMark;
  }[];
  ledger: { id: string; delta: number; reason: string; created_at: string; class_name: string; session_number: number }[];
}

export async function getMyClassActivity(): Promise<ClassActivity> {
  const { supabase } = await requireActiveMember();
  const result = await supabase.rpc("get_my_class_activity");
  if (result.error) throw new Error("출석과 활동 XP를 불러오지 못했습니다.");
  return result.data as ClassActivity;
}
