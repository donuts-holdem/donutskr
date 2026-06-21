import { createServerSupabase } from "@/lib/supabase/server";
import type { BlindStructure, BlindRow, RowType } from "@/lib/types";

export function mapStructure(r: any): BlindStructure {
  return { id: String(r.id ?? ""), name: String(r.name ?? ""), is_template: Boolean(r.is_template), event_type: r.event_type ?? null };
}

export function mapRow(r: any): BlindRow {
  return {
    id: String(r.id ?? ""), structure_id: String(r.structure_id ?? ""), row_type: (r.row_type ?? "level") as RowType,
    level_no: r.level_no ?? null, sb: r.sb ?? null, bb: r.bb ?? null, ante: r.ante ?? null,
    duration: r.duration ?? null, break_name: r.break_name ?? null, break_minutes: r.break_minutes ?? null,
    stage_note: r.stage_note ?? null, sort_order: Number(r.sort_order ?? 0),
  };
}

export async function getAllStructures(): Promise<BlindStructure[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("blind_structures").select("*").is("deleted_at", null).order("name");
  if (error) throw error;
  return (data ?? []).map(mapStructure);
}

export async function getStructureWithRows(id: string): Promise<{ structure: BlindStructure; rows: BlindRow[] } | null> {
  const supabase = await createServerSupabase();
  const { data: s } = await supabase.from("blind_structures").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (!s) return null;
  const { data: rows } = await supabase.from("blind_structure_rows").select("*").eq("structure_id", id).order("sort_order");
  return { structure: mapStructure(s), rows: (rows ?? []).map(mapRow) };
}
