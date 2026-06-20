create type season_code as enum ('spring','summer','autumn','winter');
create type event_category as enum ('festival','confirmed','upcoming','completed');
create type event_status as enum ('scheduled','confirmed','running','reg_closed','completed','canceled','hidden');
create type row_type as enum ('level','break','stage');
create type tab_type as enum ('internal','external','special');
create type league_status as enum ('operating','revamping','preparing','suspended','hidden');

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code season_code not null,
  year int not null,
  start_date date,
  end_date date,
  is_active boolean not null default false,
  hero_text text, sub_text text, badge_text text,
  hero_image text, bg_image text, theme_color text,
  footer_sponsor_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.blind_structures (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_template boolean not null default false,
  event_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.blind_structure_rows (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.blind_structures(id) on delete cascade,
  row_type row_type not null,
  level_no int,
  sb text, bb text, ante text,
  duration int,
  break_name text, break_minutes int, stage_note text,
  sort_order int not null default 0
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id),
  round text,
  title text not null,
  event_type text,
  date date,
  weekday text,
  location text, address text,
  start_time text, reg_close_time text, end_time text,
  buy_in text,
  entry_link text, button_label text,
  description text,
  poster_image text, sponsor_logo text,
  category event_category not null default 'upcoming',
  status event_status not null default 'scheduled',
  is_visible boolean not null default true,
  sort_order int not null default 0,
  blind_structure_id uuid references public.blind_structures(id),
  timer_event_id text, timer_event_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.navigation_tabs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key text not null unique,
  type tab_type not null default 'internal',
  slug text, external_url text,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  mobile_visible boolean not null default true,
  start_show_date date, end_show_date date,
  home_card_visible boolean not null default false,
  home_card_title text, home_card_desc text, home_card_cta text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.special_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text, title text not null, description text,
  date date, venue text, address text, start_time text,
  entry_link text, cta_label text,
  sponsor_name text, sponsor_logo text,
  poster text, gallery jsonb not null default '[]',
  info_cards jsonb not null default '[]',
  note_list jsonb not null default '[]',
  blind_structure_id uuid references public.blind_structures(id),
  start_show_date date, end_show_date date,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.online_league_settings (
  id int primary key default 1 check (id = 1),
  status league_status not null default 'preparing',
  tab_visible boolean not null default true,
  title text, description text, join_guide text,
  steps jsonb not null default '[]',
  links jsonb not null default '{}',
  today_leagues jsonb not null default '[]',
  notice_text text, cta_label text, cta_url text, sheet_url text,
  updated_at timestamptz not null default now()
);

create table public.site_config (
  id int primary key default 1 check (id = 1),
  signup_visible boolean not null default true,
  signup_link text, signup_new_tab boolean not null default true,
  signup_button_label text, signup_closed boolean not null default false,
  signup_closed_text text,
  leaderboard_tab_visible boolean not null default true,
  leaderboard_api_url text, leaderboard_personal_rank_visible boolean not null default true,
  footer_sponsors jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

insert into public.online_league_settings (id) values (1) on conflict do nothing;
insert into public.site_config (id) values (1) on conflict do nothing;

create unique index seasons_one_active on public.seasons (is_active) where is_active and deleted_at is null;
create index events_sort_idx on public.events (sort_order, date);
create index blind_rows_idx on public.blind_structure_rows (structure_id, sort_order);
create index tabs_sort_idx on public.navigation_tabs (sort_order);
