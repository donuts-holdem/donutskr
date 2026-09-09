import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AffiliationKind, AffiliationRequest, ApplicationStatus, MemberProfile, MembershipClass,
  MembershipClub, MembershipSettings, ReviewApplication, School, SignupCatalog,
} from "@/lib/membership/types";

export const getMembershipSession = cache(async () => {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null, isAdmin: false };
  const permission = await supabase.rpc("is_admin");
  if (permission.error) throw new Error("권한을 확인하지 못했습니다.");
  const isAdmin = permission.data === true;
  if (isAdmin) await requireAdmin();
  const { data, error } = await supabase.from("member_profiles").select(
    "id,username,name,phone,school_id,other_school_name,status,consented_at,consent_version,created_at",
  ).eq("id", user.id).maybeSingle<MemberProfile>();
  if (error) throw new Error("회원 정보를 불러오지 못했습니다.");
  return { supabase, user, profile: data, isAdmin };
});

export async function requireActiveMember() {
  const session = await getMembershipSession();
  if (!session.user) redirect("/login");
  // Administrators may inspect member pages without fabricating a member profile.
  if (session.isAdmin) return { ...session, user: session.user };
  if (!session.profile) redirect("/signup");
  if (!session.user.email_confirmed_at || session.profile.status !== "ACTIVE") redirect("/membership/status");
  return { ...session, user: session.user, profile: session.profile };
}

export async function getSignupCatalog(client?: SupabaseClient): Promise<SignupCatalog> {
  const supabase = client ?? await createServerSupabase();
  const [schools, classes, clubs, settings] = await Promise.all([
    supabase.from("schools").select("id,name,active").eq("active", true).order("sort_order").order("name").returns<School[]>(),
    supabase.from("classes").select("id,name,place,weekday,start_time").eq("active", true).is("closed_at", null).is("archived_at", null).order("weekday").order("start_time").returns<MembershipClass[]>(),
    supabase.from("clubs").select("id,name,school_id").is("archived_at", null).order("name").returns<MembershipClub[]>(),
    supabase.from("membership_settings").select("signup_open,consent_version,privacy_url").eq("singleton", true).single<MembershipSettings>(),
  ]);
  if (schools.error || classes.error || clubs.error || settings.error) throw new Error("가입 설정을 불러오지 못했습니다.");
  return { schools: schools.data ?? [], classes: classes.data ?? [], clubs: clubs.data ?? [], settings: settings.data };
}

export async function getLeaderAssignments(supabase: SupabaseClient, userId: string) {
  const [classes, clubs] = await Promise.all([
    supabase.from("class_leaders").select("class_id").eq("user_id", userId),
    supabase.from("club_leaders").select("club_id").eq("user_id", userId),
  ]);
  if (classes.error || clubs.error) throw new Error("리더 권한을 불러오지 못했습니다.");
  return { classIds: (classes.data ?? []).map(row => String(row.class_id)), clubIds: (clubs.data ?? []).map(row => String(row.club_id)) };
}

export async function requireReviewer() {
  const session = await getMembershipSession();
  if (!session.user) redirect("/login");
  if (session.isAdmin) return session.supabase;
  const active = await requireActiveMember();
  const assignments = await getLeaderAssignments(active.supabase, active.user.id);
  if (!assignments.classIds.length && !assignments.clubIds.length) redirect("/home");
  return active.supabase;
}

export async function getReviewQueue(supabase: SupabaseClient, page = 1, status: ApplicationStatus = "PENDING") {
  const { data, error, count } = await supabase.from("affiliation_requests").select(
    "id,user_id,kind,status,class_id,club_id,decision_reason,created_at,member:member_profiles!affiliation_requests_user_id_fkey(id,name,username,phone,status,other_school_name,school:schools(name)),requested_class:classes(name),requested_club:clubs(name)",
    { count: "exact" },
  ).eq("status", status).order("created_at").range((page - 1) * 50, page * 50 - 1).returns<ReviewApplication[]>();
  if (error) throw new Error("소속 신청 목록을 불러오지 못했습니다.");
  return { requests: data ?? [], count: count ?? 0 };
}

export async function getMemberAffiliations() {
  const { supabase, user, profile, isAdmin } = await requireActiveMember();
  const [classes, clubs, school, leaders] = await Promise.all([
    supabase.from("class_memberships").select("classes(id,name,place,weekday,start_time)").eq("user_id", user.id).eq("active", true).returns<{ classes: MembershipClass | null }[]>(),
    supabase.from("club_memberships").select("clubs(id,name,school_id)").eq("user_id", user.id).eq("active", true).returns<{ clubs: MembershipClub | null }[]>(),
    profile?.school_id ? supabase.from("schools").select("name").eq("id", profile.school_id).maybeSingle<{ name: string }>() : Promise.resolve({ data: null, error: null }),
    getLeaderAssignments(supabase, user.id),
  ]);
  if (classes.error || clubs.error || school.error) throw new Error("소속 정보를 불러오지 못했습니다.");
  return {
    profile, email: user.email, isAdmin,
    school: school.data?.name ?? profile?.other_school_name ?? (isAdmin ? "운영자 계정" : "학교 미지정"),
    classes: (classes.data ?? []).flatMap(row => row.classes ? [row.classes] : []),
    clubs: (clubs.data ?? []).flatMap(row => row.clubs ? [row.clubs] : []),
    isLeader: isAdmin || leaders.classIds.length > 0 || leaders.clubIds.length > 0,
  };
}

export async function getAffiliationDirectory(kind: AffiliationKind) {
  const session = await requireActiveMember();
  const catalog = await getSignupCatalog(session.supabase);
  const [memberships, requests] = await Promise.all([
    session.supabase.from(kind === "CLASS" ? "class_memberships" : "club_memberships")
      .select(kind === "CLASS" ? "class_id" : "club_id").eq("user_id", session.user.id).eq("active", true)
      .returns<{ class_id?: string; club_id?: string }[]>(),
    session.supabase.from("affiliation_requests")
      .select("id,user_id,kind,status,class_id,club_id,decision_reason,created_at")
      .eq("user_id", session.user.id).eq("kind", kind).order("created_at", { ascending: false })
      .returns<AffiliationRequest[]>(),
  ]);
  if (memberships.error || requests.error) throw new Error("소속과 신청 상태를 불러오지 못했습니다.");
  return {
    catalog, isAdmin: session.isAdmin,
    canApply: session.profile?.status === "ACTIVE" && Boolean(session.user.email_confirmed_at),
    joinedIds: (memberships.data ?? []).map(row => row.class_id ?? row.club_id),
    requests: requests.data ?? [],
  };
}
