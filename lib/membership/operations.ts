import "server-only";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireActiveMember } from "@/lib/membership/server";
import { requireUuid } from "@/lib/membership/validation";
import type { AffiliationKind, EntityOperation, EntityPeople, LeaderCandidate } from "@/lib/membership/types";

export function routeUuid(value: string) {
  try { return requireUuid(value); } catch { notFound(); }
}

// Database page size is a transport concern, never a maximum course size.
export async function allRows<T>(read: (from: number, to: number) => PromiseLike<{
  data: T[] | null; error: { message: string } | null;
}>, errorMessage: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const result = await read(from, from + 999);
    if (result.error) throw new Error(errorMessage);
    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

export async function requireEntityOperator(kind: AffiliationKind, entityId: string) {
  const session = await requireActiveMember();
  requireUuid(entityId);
  const permission = await session.supabase.rpc("can_review_affiliation", { p_kind: kind, p_entity_id: entityId });
  if (permission.error || permission.data !== true) throw new Error("이 소속을 운영할 권한이 없습니다.");
  return session;
}

export async function getLeaderCandidates(supabase: SupabaseClient): Promise<LeaderCandidate[]> {
  const result = await supabase.rpc("get_entity_leader_candidates");
  if (result.error) throw new Error("리더 후보를 불러오지 못했습니다.");
  return result.data as LeaderCandidate[];
}

export async function getEntityPeople(supabase: SupabaseClient, kind: AffiliationKind, id: string): Promise<EntityPeople> {
  const result = await supabase.rpc("get_entity_people", { p_kind: kind, p_entity_id: id });
  if (result.error) throw new Error("소속 회원과 리더를 불러오지 못했습니다.");
  return result.data as EntityPeople;
}

export async function getEntityHistory(supabase: SupabaseClient, kind: AffiliationKind, id: string, sessionId?: string) {
  let query = supabase.from("entity_operation_log").select("id,action,actor_id,reason,before_state,after_state,created_at")
    .eq("kind", kind).eq("entity_id", id);
  if (sessionId) query = query.eq("session_id", sessionId);
  const result = await query.order("created_at", { ascending: false }).limit(50).returns<EntityOperation[]>();
  if (result.error) throw new Error("운영 변경 이력을 불러오지 못했습니다.");
  return result.data ?? [];
}

export function refreshOperations() {
  for (const path of ["/class", "/club", "/home", "/my", "/admin/classes", "/admin/clubs", "/admin/members",
    "/admin/members/settings", "/admin/members/directory", "/leader/class", "/leader/club", "/leader/approvals"]) revalidatePath(path);
  for (const path of ["/class/[id]", "/club/[id]", "/admin/classes/[id]", "/admin/clubs/[id]", "/leader/class/[id]",
    "/leader/club/[id]", "/admin/classes/[id]/sessions/[sessionId]", "/leader/class/[id]/sessions/[sessionId]"]) revalidatePath(path, "page");
}
