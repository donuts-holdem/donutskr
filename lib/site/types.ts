export interface HeaderTab {
  label: string; href: string; external: boolean; mobileHidden: boolean;
}

export interface SiteConfig {
  signup_visible: boolean; signup_link: string | null; signup_new_tab: boolean;
  signup_button_label: string | null; signup_closed: boolean;
  signup_closed_text: string | null;
  footer_sponsors: { name: string; logo?: string; url?: string }[];
}
