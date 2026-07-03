"use server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublic } from "@/lib/revalidate";
import type { ProgramOptionKind } from "@/lib/types";

function parseKind(v: FormDataEntryValue | null): ProgramOptionKind {
  return v === "status" ? "status" : "group";
}
function trimmed(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export async function createProgramOption(fd: FormData) {
  const supabase = await requireAdmin();
  const kind = parseKind(fd.get("kind"));
  const value = trimmed(fd, "value");
  const label = trimmed(fd, "label");
  if (!value || !label) redirect("/admin/program-options?error=1");
  const { error } = await supabase
    .from("program_options")
    .insert({ kind, value, label, sort_order: Number(fd.get("sort_order") || 0) });
  if (error) throw error;
  revalidatePublic(["/programs"]);
  redirect("/admin/program-options?saved=1");
}

export async function updateProgramOption(id: string, fd: FormData) {
  const supabase = await requireAdmin();
  const value = trimmed(fd, "value");
  const label = trimmed(fd, "label");
  if (!value || !label) redirect("/admin/program-options?error=1");
  const { error } = await supabase
    .from("program_options")
    .update({ value, label, sort_order: Number(fd.get("sort_order") || 0) })
    .eq("id", id);
  if (error) throw error;
  revalidatePublic(["/programs"]);
  redirect("/admin/program-options?saved=1");
}

export async function deleteProgramOption(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("program_options")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePublic(["/programs"]);
  redirect("/admin/program-options?deleted=1");
}
