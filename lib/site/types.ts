// Retained public schedule/series models. New CLASS domains own their types.
export type StoredEventStatus = "auto" | "canceled" | "hidden";
export type DerivedEventStatus =
  | "scheduled" | "running" | "reg_closed" | "completed" | "canceled" | "hidden";
export type EventStatus = DerivedEventStatus;
export type RowType = "level" | "break" | "stage";

export interface Season {
  id: string; name: string; year: number;
  start_date: string | null; end_date: string | null; is_active: boolean;
  hero_text: string | null; sub_text: string | null; badge_text: string | null;
  hero_image: string | null; bg_image: string | null;
}

export interface Event {
  id: string; season_id: string | null; title: string;
  date: string | null;
  location: string | null; organizer: string | null;
  start_time: string | null; reg_close_time: string | null;
  buy_in: string | null; entry_link: string | null; button_label: string | null;
  description: string | null; poster_image: string | null;
  starting_stack: number | null;
  status: StoredEventStatus; is_visible: boolean;
  blind_structure_id: string | null;
}

export interface BlindStructure {
  id: string; name: string; is_template: boolean; event_type: string | null;
}

export interface BlindRow {
  id: string; structure_id: string; row_type: RowType; level_no: number | null;
  sb: string | null; bb: string | null; ante: string | null; duration: number | null;
  break_name: string | null; break_minutes: number | null;
  stage_note: string | null; sort_order: number;
}

export interface HeaderTab {
  label: string; href: string; external: boolean; mobileHidden: boolean;
}

export interface SiteConfig {
  signup_visible: boolean; signup_link: string | null; signup_new_tab: boolean;
  signup_button_label: string | null; signup_closed: boolean;
  signup_closed_text: string | null;
  footer_sponsors: { name: string; logo?: string; url?: string }[];
}
