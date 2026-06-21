"use server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { revalidatePublic } from "@/lib/revalidate";
import { uploadIfPresent } from "@/lib/upload";

function parse(fd: FormData) {
  const s = (k: string) => { const v = fd.get(k); return v === null || v === "" ? null : String(v); };
  return {
    slug: String(fd.get("slug")), title: String(fd.get("title")), category: s("category"),
    program_group: String(fd.get("program_group") || "poker"), status: s("status"),
    member_count: Number(fd.get("member_count") || 0), location: s("location"),
    start_date: s("start_date"), end_date: s("end_date"), description: s("description"),
    manager_name: s("manager_name"), manager_role: s("manager_role"), manager_avatar: s("manager_avatar"),
    cta_label: s("cta_label"), entry_link: s("entry_link"), external_url: s("external_url"),
    is_hot: fd.get("is_hot") === "on", is_affiliate: fd.get("is_affiliate") === "on",
    is_visible: fd.get("is_visible") === "on", sort_order: Number(fd.get("sort_order") || 0),
  };
}

export async function createProgram(fd: FormData) {
  const supabase = await requireAdmin();
  const values: ReturnType<typeof parse> & { cover_image: string | null } = { ...parse(fd), cover_image: null };
  values.cover_image = await uploadIfPresent(supabase, fd, "cover_image", null);
  const { error } = await supabase.from("programs").insert(values);
  if (error) throw error;
  revalidatePublic(["/programs"]);
  redirect("/admin/programs");
}

export async function updateProgram(id: string, fd: FormData) {
  const supabase = await requireAdmin();
  const values: ReturnType<typeof parse> & { cover_image: string | null } = { ...parse(fd), cover_image: null };
  values.cover_image = await uploadIfPresent(supabase, fd, "cover_image", (fd.get("cover_image_existing") as string) || null);
  const { error } = await supabase.from("programs").update(values).eq("id", id);
  if (error) throw error;
  revalidatePublic([`/programs/${values.slug}`]);
  redirect("/admin/programs");
}

export async function deleteProgram(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("programs").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  revalidatePublic(["/programs"]);
  redirect("/admin/programs");
}
