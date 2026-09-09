import "server-only";
import { requireActiveMember, getLeaderAssignments } from "@/lib/membership/server";
import { allRows, routeUuid } from "@/lib/membership/operations";
import { domainRpc } from "@/lib/domains/server";
import type { ClubMeeting, MeetingBoard } from "@/lib/meetings/types";
import type { ClubRecord } from "@/lib/clubs/types";

export async function getMeetingIndex(manage = false) {
  const context = await requireActiveMember();
  const assignments = await getLeaderAssignments(context.supabase, context.user.id);
  const clubs = await allRows<ClubRecord>((from, to) => {
    let query = context.supabase.from("clubs").select("*").is("archived_at", null).order("name").order("id").range(from, to);
    if (!context.isAdmin) query = query.in("id", assignments.clubIds);
    return query;
  }, "운영 클럽을 불러오지 못했습니다.");
  const meetings = manage && !context.isAdmin && !assignments.clubIds.length ? [] : await allRows<ClubMeeting>((from, to) => {
    let query = context.supabase.from("club_meetings").select("*").order("scheduled_at", { ascending: !manage }).order("id").range(from, to);
    if (manage && !context.isAdmin) query = query.eq("created_by", context.user.id).in("club_id", assignments.clubIds);
    if (!manage) query = query.or("completed_at.is.null,completed_at.gt." + new Date(Date.now() - 86400000).toISOString());
    return query;
  }, "클럽 모임을 불러오지 못했습니다.");
  return { ...context, clubs, meetings };
}
export async function getMeetingBoard(id: string) {
  const context = await requireActiveMember();
  const board = await domainRpc<MeetingBoard>(context.supabase, "get_club_meeting_board", { p_id: routeUuid(id) });
  return { ...context, board };
}
