import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getLeaderAssignments, requireActiveMember } from "@/lib/membership/server";
import { allRows, getEntityPeople, getLeaderCandidates, routeUuid } from "@/lib/membership/operations";
import type { AttendanceEntry, ClassRecord, ClassSession } from "@/lib/classes/types";

export async function getClassIndex() {
  const context = await requireActiveMember();
  const assignments = context.isAdmin ? null : await getLeaderAssignments(context.supabase, context.user.id);
  const classes = assignments && !assignments.classIds.length ? [] : await allRows<ClassRecord>((from, to) => {
    let query = context.supabase.from("classes").select("*");
    if (assignments) query = query.in("id", assignments.classIds);
    return query.order("created_at", { ascending: false }).order("id").range(from, to).returns<ClassRecord[]>();
  }, "클래스 운영 목록을 불러오지 못했습니다.");
  const candidates = context.isAdmin ? await getLeaderCandidates(context.supabase) : [];
  return { ...context, classes, candidates };
}

export const getClassOverview = cache(async (rawId: string) => {
  const id = routeUuid(rawId);
  const context = await requireActiveMember();
  const record = await context.supabase.from("classes").select("*").eq("id", id).maybeSingle<ClassRecord>();
  if (record.error) throw new Error("클래스 정보를 불러오지 못했습니다.");
  if (!record.data) notFound();
  const permission = await context.supabase.rpc("can_review_affiliation", { p_kind: "CLASS", p_entity_id: id });
  if (permission.error) throw new Error("클래스 운영 권한을 불러오지 못했습니다.");
  const sessions = await allRows<ClassSession>((from, to) => context.supabase.from("class_sessions")
    .select("*").eq("class_id", id).order("session_number").range(from, to).returns<ClassSession[]>(), "회차를 불러오지 못했습니다.");
  const ownAttendance = await allRows<AttendanceEntry>((from, to) => context.supabase.from("class_attendance")
    .select("session_id,roster_run,user_id,snapshot_name,snapshot_username,mark,checked_at,class_sessions!inner(class_id)")
    .eq("user_id", context.user.id).eq("class_sessions.class_id", id).order("session_id").order("roster_run")
    .range(from, to).returns<AttendanceEntry[]>(), "내 출석 기록을 불러오지 못했습니다.");
  return { ...context, course: record.data, sessions, ownAttendance, canManage: permission.data === true };
});

export async function getManagedClass(id: string) {
  const overview = await getClassOverview(id);
  if (!overview.canManage) notFound();
  const people = await getEntityPeople(overview.supabase, "CLASS", overview.course.id);
  const candidates = overview.isAdmin ? await getLeaderCandidates(overview.supabase) : [];
  return { ...overview, people, candidates };
}

export async function getSessionBoard(classId: string, rawSessionId: string) {
  const detail = await getManagedClass(classId);
  const sessionId = routeUuid(rawSessionId);
  const session = detail.sessions.find(item => item.id === sessionId);
  if (!session) notFound();
  const attendance = await allRows<AttendanceEntry>((from, to) => detail.supabase.from("class_attendance")
    .select("session_id,roster_run,user_id,snapshot_name,snapshot_username,mark,checked_at")
    .eq("session_id", sessionId).eq("roster_run", session.roster_run).order("snapshot_name").order("user_id")
    .range(from, to).returns<AttendanceEntry[]>(), "출석 명단을 불러오지 못했습니다.");
  return { ...detail, session, attendance };
}
