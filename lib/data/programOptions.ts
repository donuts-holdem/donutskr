import { createServerSupabase } from "@/lib/supabase/server";
import type { ProgramOption, ProgramOptionKind } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapProgramOption(r: any): ProgramOption {
  return {
    id: String(r.id ?? ""),
    kind: (r.kind ?? "group") as ProgramOptionKind,
    value: String(r.value ?? ""),
    label: String(r.label ?? ""),
    sort_order: Number(r.sort_order ?? 0),
  };
}

// Public / form use: the live options of one kind, in display order.
export async function getProgramOptions(kind: ProgramOptionKind): Promise<ProgramOption[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("program_options")
    .select("*")
    .eq("kind", kind)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("value", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapProgramOption);
}

// Admin management: every live option across kinds, grouped then ordered.
export async function getAllProgramOptions(): Promise<ProgramOption[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("program_options")
    .select("*")
    .is("deleted_at", null)
    .order("kind", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("value", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapProgramOption);
}
