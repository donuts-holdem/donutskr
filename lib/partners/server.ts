import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth";
import { requireActiveMember } from "@/lib/membership/server";
import { allRows, routeUuid } from "@/lib/membership/operations";
import type { Partner } from "@/lib/partners/types";

const fields = "id,name,description,logo_url,url,sort_order,revision";

async function readPartners(supabase: SupabaseClient): Promise<Partner[]> {
  return allRows<Partner>((from, to) => supabase.from("partners").select(fields)
    .order("sort_order").order("id").range(from, to), "파트너를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
}

export const getPartners = cache(async (): Promise<Partner[]> => {
  const { supabase } = await requireActiveMember();
  return readPartners(supabase);
});

export async function getAdminPartners(): Promise<Partner[]> {
  return readPartners(await requireAdmin());
}

export async function getAdminPartner(id: string): Promise<Partner> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase.from("partners").select(fields).eq("id", routeUuid(id)).maybeSingle<Partner>();
  if (error) throw new Error("파트너를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  if (!data) notFound();
  return data;
}
