import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ApplicationStatus, MemberProfile, MembershipApplication, MembershipClass,
  MembershipClub, MembershipSettings, ReviewApplication, School, SignupCatalog,
} from "@/lib/membership/types";

export const getMembershipSession = cache(async () => {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data, error } = await supabase.from("member_profiles").select(
    "id,username,name,phone,school_id,other_school_name,status,consented_at,consent_version,created_at",
  ).eq("id", user.id).maybeSingle<MemberProfile>();
  if (error) throw new Error("회원 정보를 불러오지 못했습니다.");
  return { supabase, user, profile: data };
});

export async function requireActiveMember() {
  const session = await getMembershipSession();
  if (!session.user) redirect("/login");
  if (!session.profile) redirect("/signup");
  if (!session.user.email_confirmed_at || session.profile.status !== "ACTIVE") redirect("/membership/status");
  return { ...session, user: session.user, profile: session.profile };
}

export async function getSignupCatalog(client?: SupabaseClient): Promise<SignupCatalog> {
  const supabase = client ?? await createServerSupabase();
  const [schools, classes, clubs, settings] = await Promise.all([
    supabase.from("schools").select("id,name,active").eq("active", true).order("sort_order").order("name").returns<School[]>(),
    supabase.from("classes").select("id,name,place,weekday,start_time").eq("active", true).order("weekday").order("start_time").returns<MembershipClass[]>(),
    supabase.from("clubs").select("id,name,school_id").order("name").returns<MembershipClub[]>(),
    supabase.from("membership_settings").select("signup_open,consent_version,privacy_url").eq("singleton", true).single<MembershipSettings>(),
  ]);
  if (schools.error || classes.error || clubs.error || settings.error) throw new Error("가입 설정을 불러오지 못했습니다.");
  return { schools: schools.data ?? [], classes: classes.data ?? [], clubs: clubs.data ?? [], settings: settings.data };
}

export async function getOwnApplication() {
  const session = await getMembershipSession();
  if (!session.user) redirect("/login");
  const { data, error } = await session.supabase.from("signup_requests").select(
    "id,user_id,status,requested_class_id,requested_club_id,requested_school_id,requested_other_school,decision_reason,created_at",
  ).eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle<MembershipApplication>();
  if (error) throw new Error("가입 신청을 불러오지 못했습니다.");
  return data;
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
  const { data: admin, error } = await session.supabase.rpc("is_admin");
  if (error) throw new Error("권한을 확인하지 못했습니다.");
  if (admin === true) return requireAdmin();
  const active = await requireActiveMember();
  const assignments = await getLeaderAssignments(active.supabase, active.user.id);
  if (!assignments.classIds.length && !assignments.clubIds.length) redirect("/home");
  return active.supabase;
}

export async function getReviewQueue(supabase: SupabaseClient, page = 1, status: ApplicationStatus = "PENDING") {
  const { data, error, count } = await supabase.from("signup_requests").select(
    "id,user_id,status,requested_class_id,requested_club_id,requested_school_id,requested_other_school,decision_reason,created_at,member:member_profiles!signup_requests_user_id_fkey(id,name,username,phone),requested_class:classes(name),requested_club:clubs(name),requested_school:schools(name)",
    { count: "exact" },
  ).eq("status", status).order("created_at").range((page - 1) * 50, page * 50 - 1).returns<ReviewApplication[]>();
  if (error) throw new Error("가입 신청 목록을 불러오지 못했습니다.");
  return { requests: data ?? [], count: count ?? 0 };
}

export async function getMemberAffiliations() {
  const { supabase, user, profile } = await requireActiveMember();
  const [classes, clubs, school, leaders] = await Promise.all([
    supabase.from("class_memberships").select("classes(id,name,place,weekday,start_time)").eq("user_id", user.id).eq("active", true).returns<{ classes: MembershipClass | null }[]>(),
    supabase.from("club_memberships").select("clubs(id,name,school_id)").eq("user_id", user.id).eq("active", true).returns<{ clubs: MembershipClub | null }[]>(),
    profile.school_id ? supabase.from("schools").select("name").eq("id", profile.school_id).maybeSingle<{ name: string }>() : Promise.resolve({ data: null, error: null }),
    getLeaderAssignments(supabase, user.id),
  ]);
  if (classes.error || clubs.error || school.error) throw new Error("소속 정보를 불러오지 못했습니다.");
  return {
    profile, email: user.email,
    school: school.data?.name ?? profile.other_school_name ?? "학교 미지정",
    classes: (classes.data ?? []).flatMap(row => row.classes ? [row.classes] : []),
    clubs: (clubs.data ?? []).flatMap(row => row.clubs ? [row.clubs] : []),
    isLeader: leaders.classIds.length > 0 || leaders.clubIds.length > 0,
  };
}
