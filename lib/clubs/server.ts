import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getLeaderAssignments, requireActiveMember } from "@/lib/membership/server";
import { allRows, getEntityPeople, getLeaderCandidates, routeUuid } from "@/lib/membership/operations";
import type { ClubRecord } from "@/lib/clubs/types";
import type { School } from "@/lib/membership/types";

export async function getClubIndex() {
  const context = await requireActiveMember();
  const assignments = context.isAdmin ? null : await getLeaderAssignments(context.supabase, context.user.id);
  const clubs = assignments && !assignments.clubIds.length ? [] : await allRows<ClubRecord>((from, to) => {
    let query = context.supabase.from("clubs").select("*");
    if (assignments) query = query.in("id", assignments.clubIds);
    return query.order("name").order("id").range(from, to).returns<ClubRecord[]>();
  }, "클럽 운영 목록을 불러오지 못했습니다.");
  const schools = await allRows<School>((from, to) => context.supabase.from("schools").select("id,name,active")
    .order("name").order("id").range(from, to).returns<School[]>(), "학교 목록을 불러오지 못했습니다.");
  const candidates = context.isAdmin ? await getLeaderCandidates(context.supabase) : [];
  return { ...context, clubs, schools, candidates };
}

export const getClubOverview = cache(async (rawId: string) => {
  const id = routeUuid(rawId);
  const context = await requireActiveMember();
  const record = await context.supabase.from("clubs").select("*").eq("id", id).maybeSingle<ClubRecord>();
  if (record.error) throw new Error("클럽 정보를 불러오지 못했습니다.");
  if (!record.data) notFound();
  const school = await context.supabase.from("schools").select("name").eq("id", record.data.school_id).maybeSingle<{ name: string }>();
  const permission = await context.supabase.rpc("can_review_affiliation", { p_kind: "CLUB", p_entity_id: id });
  if (school.error || permission.error) throw new Error("클럽 운영 정보를 불러오지 못했습니다.");
  return { ...context, club: record.data, school: school.data?.name ?? "학교 미등록", canManage: permission.data === true };
});

export async function getManagedClub(id: string) {
  const overview = await getClubOverview(id);
  if (!overview.canManage) notFound();
  const people = await getEntityPeople(overview.supabase, "CLUB", overview.club.id);
  const candidates = overview.isAdmin ? await getLeaderCandidates(overview.supabase) : [];
  const schools = overview.isAdmin ? await allRows<School>((from, to) => overview.supabase.from("schools")
    .select("id,name,active").order("name").order("id").range(from, to).returns<School[]>(), "학교 목록을 불러오지 못했습니다.") : [];
  return { ...overview, people, candidates, schools };
}
