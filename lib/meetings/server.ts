import "server-only";
import { requireActiveMember, getLeaderAssignments } from "@/lib/membership/server";
import { allRows, routeUuid } from "@/lib/membership/operations";
import { domainRpc } from "@/lib/domains/server";
import type { MeetingSummary, MeetingBoard } from "@/lib/meetings/types";
import type { ClubRecord } from "@/lib/clubs/types";

export async function getMeetingIndex(manage = false, clubId?: string) {
  const context = await requireActiveMember();
  const assignments = await getLeaderAssignments(context.supabase, context.user.id);
  const clubs = await allRows<ClubRecord>((from, to) => {
    let query = context.supabase.from("clubs").select("*").is("archived_at", null).order("name").order("id").range(from, to);
    if (!context.isAdmin) query = query.in("id", assignments.clubIds);
    return query;
  }, "운영 클럽을 불러오지 못했습니다.");
  const meetings = await domainRpc<MeetingSummary[]>(context.supabase, "get_meeting_summaries", { p_manage: manage, p_club: clubId ? routeUuid(clubId) : null });
  return { ...context, clubs, meetings };
}
export async function getMeetingBoard(id: string) {
  const context = await requireActiveMember();
  const board = await domainRpc<MeetingBoard>(context.supabase, "get_club_meeting_board", { p_id: routeUuid(id) });
  return { ...context, board };
}
