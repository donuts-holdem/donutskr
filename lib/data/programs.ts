import { createServerSupabase } from "@/lib/supabase/server";
import type { Program, ProgramGroup } from "@/lib/types";

export function mapProgram(r: any): Program {
  return {
    id: String(r.id ?? ""), slug: String(r.slug ?? ""), title: String(r.title ?? ""),
    category: r.category ?? null, program_group: (r.program_group ?? "poker") as ProgramGroup,
    status: r.status ?? null, member_count: Number(r.member_count ?? 0), location: r.location ?? null,
    start_date: r.start_date ?? null, end_date: r.end_date ?? null, description: r.description ?? null,
    cover_image: r.cover_image ?? null, manager_name: r.manager_name ?? null,
    manager_role: r.manager_role ?? null, manager_avatar: r.manager_avatar ?? null,
    cta_label: r.cta_label ?? null, entry_link: r.entry_link ?? null, external_url: r.external_url ?? null,
    is_hot: Boolean(r.is_hot), is_affiliate: Boolean(r.is_affiliate),
    is_visible: r.is_visible ?? true, sort_order: Number(r.sort_order ?? 0),
  };
}
export async function getPrograms(): Promise<Program[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("programs").select("*").is("deleted_at", null).eq("is_visible", true).order("sort_order", { ascending: true });
  if (error) throw error; return (data ?? []).map(mapProgram);
}
export async function getHotPrograms(): Promise<Program[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("programs").select("*").is("deleted_at", null).eq("is_visible", true).eq("is_hot", true).order("sort_order", { ascending: true });
  if (error) throw error; return (data ?? []).map(mapProgram);
}
export async function getProgramsByGroup(group: ProgramGroup): Promise<Program[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("programs").select("*").is("deleted_at", null).eq("is_visible", true).eq("program_group", group).order("sort_order", { ascending: true });
  if (error) throw error; return (data ?? []).map(mapProgram);
}
export async function getAffiliatePartners(): Promise<Program[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("programs").select("*").is("deleted_at", null).eq("is_visible", true).eq("is_affiliate", true).order("sort_order", { ascending: true });
  if (error) throw error; return (data ?? []).map(mapProgram);
}
export async function getProgramBySlug(slug: string): Promise<Program | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("programs").select("*").eq("slug", slug).is("deleted_at", null).maybeSingle();
  if (error) throw error; return data ? mapProgram(data) : null;
}
