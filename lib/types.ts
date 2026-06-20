export type SeasonCode = "spring" | "summer" | "autumn" | "winter";
export type EventCategory = "festival" | "confirmed" | "upcoming" | "completed";
export type EventStatus = "scheduled" | "confirmed" | "running" | "reg_closed" | "completed" | "canceled" | "hidden";
export type RowType = "level" | "break" | "stage";
export type TabType = "internal" | "external" | "special";
export type LeagueStatus = "operating" | "revamping" | "preparing" | "suspended" | "hidden";

export interface Season {
  id: string; name: string; code: SeasonCode; year: number;
  start_date: string | null; end_date: string | null; is_active: boolean;
  hero_text: string | null; sub_text: string | null; badge_text: string | null;
  hero_image: string | null; bg_image: string | null; theme_color: string | null;
  footer_sponsor_visible: boolean;
}
export interface Event {
  id: string; season_id: string | null; round: string | null; title: string;
  event_type: string | null; date: string | null; weekday: string | null;
  location: string | null; address: string | null;
  start_time: string | null; reg_close_time: string | null; end_time: string | null;
  buy_in: string | null; entry_link: string | null; button_label: string | null;
  description: string | null; poster_image: string | null; sponsor_logo: string | null;
  category: EventCategory; status: EventStatus; is_visible: boolean; sort_order: number;
  blind_structure_id: string | null; timer_event_id: string | null; timer_event_url: string | null;
}
export interface BlindStructure { id: string; name: string; is_template: boolean; event_type: string | null; }
export interface BlindRow {
  id: string; structure_id: string; row_type: RowType; level_no: number | null;
  sb: string | null; bb: string | null; ante: string | null; duration: number | null;
  break_name: string | null; break_minutes: number | null; stage_note: string | null; sort_order: number;
}
export interface NavTab {
  id: string; name: string; key: string; type: TabType; slug: string | null; external_url: string | null;
  is_visible: boolean; sort_order: number; mobile_visible: boolean;
  start_show_date: string | null; end_show_date: string | null;
  home_card_visible: boolean; home_card_title: string | null; home_card_desc: string | null; home_card_cta: string | null;
}
export interface SpecialPage {
  id: string; slug: string; label: string | null; title: string; description: string | null;
  date: string | null; venue: string | null; address: string | null; start_time: string | null;
  entry_link: string | null; cta_label: string | null; sponsor_name: string | null; sponsor_logo: string | null;
  poster: string | null; gallery: string[]; info_cards: { label: string; value: string }[]; note_list: string[];
  blind_structure_id: string | null; start_show_date: string | null; end_show_date: string | null; is_visible: boolean;
}
export interface OnlineLeague {
  status: LeagueStatus; tab_visible: boolean; title: string | null; description: string | null;
  join_guide: string | null; steps: string[]; links: Record<string, string>;
  today_leagues: { name: string; time?: string; reg_close?: string; link?: string }[];
  notice_text: string | null; cta_label: string | null; cta_url: string | null; sheet_url: string | null;
}
export interface SiteConfig {
  signup_visible: boolean; signup_link: string | null; signup_new_tab: boolean;
  signup_button_label: string | null; signup_closed: boolean; signup_closed_text: string | null;
  leaderboard_tab_visible: boolean; leaderboard_api_url: string | null; leaderboard_personal_rank_visible: boolean;
  footer_sponsors: { name: string; logo?: string }[];
}

export type ProgramGroup = "poker" | "social" | "others";
export interface Program {
  id: string; slug: string; title: string; category: string | null; program_group: ProgramGroup;
  status: string | null; member_count: number; location: string | null;
  start_date: string | null; end_date: string | null; description: string | null;
  cover_image: string | null; manager_name: string | null; manager_role: string | null; manager_avatar: string | null;
  cta_label: string | null; entry_link: string | null; external_url: string | null;
  is_hot: boolean; is_affiliate: boolean; is_visible: boolean; sort_order: number;
}
