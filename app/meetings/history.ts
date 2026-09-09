"use server";

import { requireActiveMember } from "@/lib/membership/server";
import type { ClubMeeting, MeetingApplication } from "@/lib/meetings/types";

export interface MeetingHistoryItem extends MeetingApplication { meeting: ClubMeeting }
export interface MeetingHistory { items: MeetingHistoryItem[]; count: number; page: number; past: boolean; error?: string }

export async function getMyMeetingHistory(past = false, requestedPage = 1): Promise<MeetingHistory> {
  const { supabase, user } = await requireActiveMember();
  const page = Math.max(1, Math.min(Number.isSafeInteger(requestedPage) ? requestedPage : 1, 100000));
  let query = supabase.from("meeting_applications").select("*,meeting:club_meetings!inner(*)", { count: "exact" })
    .eq("user_id", user.id).order("queue_number", { ascending: false }).range((page - 1) * 50, page * 50 - 1);
  if (!past) query = query.eq("meeting.status", "OPEN").in("status", ["CONFIRMED", "WAITLIST", "OFFERED"]);
  const { data, error, count } = await query.returns<MeetingHistoryItem[]>();
  return { items: data ?? [], count: count ?? 0, past, page, ...(error ? { error: "모임 신청 내역을 불러오지 못했습니다." } : {}) };
}
