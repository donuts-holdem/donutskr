import { createServerSupabase } from "@/lib/supabase/server";
import type { SiteConfig } from "@/lib/site/types";

const DEFAULT_SITE_CONFIG: SiteConfig = {
  signup_visible: false,
  signup_link: null,
  signup_new_tab: false,
  signup_button_label: null,
  signup_closed: false,
  signup_closed_text: null,
  footer_sponsors: [],
};

function mapSiteConfig(r: Partial<SiteConfig>): SiteConfig {
  return {
    signup_visible: Boolean(r.signup_visible),
    signup_link: r.signup_link ?? null,
    signup_new_tab: Boolean(r.signup_new_tab),
    signup_button_label: r.signup_button_label ?? null,
    signup_closed: Boolean(r.signup_closed),
    signup_closed_text: r.signup_closed_text ?? null,
    footer_sponsors: Array.isArray(r.footer_sponsors) ? r.footer_sponsors : [],
  };
}

export async function getSiteConfig(): Promise<SiteConfig> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("site_config")
    .select("*")
    .eq("id", 1)
    .single();
  if (error || !data) return DEFAULT_SITE_CONFIG;
  return mapSiteConfig(data);
}
