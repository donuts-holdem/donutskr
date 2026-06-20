"use server";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePublic } from "@/lib/revalidate";

export async function saveStructure(id: string | null, name: string, rows: any[]) {
  const supabase = await createServerSupabase();
  let structureId = id;
  if (!structureId) {
    const { data, error } = await supabase.from("blind_structures").insert({ name, is_template: true }).select("id").single();
    if (error) throw error;
    structureId = data.id;
  } else {
    const { error } = await supabase.from("blind_structures").update({ name }).eq("id", structureId);
    if (error) throw error;
  }
  // Delete existing rows
  await supabase.from("blind_structure_rows").delete().eq("structure_id", structureId);
  // Bulk insert with re-assigned sort_order
  if (rows.length > 0) {
    const insertRows = rows.map((r, i) => ({
      structure_id: structureId,
      row_type: r.row_type,
      level_no: r.row_type === "level" ? (r.level_no ?? null) : null,
      sb: r.row_type === "level" ? (r.sb || null) : null,
      bb: r.row_type === "level" ? (r.bb || null) : null,
      ante: r.row_type === "level" ? (String(r.ante ?? "") || null) : null,
      duration: r.row_type === "level" ? (r.duration ?? null) : null,
      break_name: r.row_type === "break" ? (r.break_name || null) : null,
      break_minutes: r.row_type === "break" ? (r.break_minutes ?? null) : null,
      stage_note: r.row_type === "stage" ? (r.stage_note || null) : null,
      sort_order: i,
    }));
    const { error } = await supabase.from("blind_structure_rows").insert(insertRows);
    if (error) throw error;
  }
  revalidatePublic();
  redirect("/admin/blind-structures");
}

export async function deleteStructure(id: string) {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("blind_structures").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  revalidatePublic();
  redirect("/admin/blind-structures");
}
