import type { SupabaseClient } from "@supabase/supabase-js";

export async function uploadIfPresent(
  supabase: SupabaseClient,
  fd: FormData,
  field: string,
  existing: string | null
): Promise<string | null> {
  const file = fd.get(`${field}_file`) as File | null;
  if (!file || file.size === 0) return existing;
  const path = `${field}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}
