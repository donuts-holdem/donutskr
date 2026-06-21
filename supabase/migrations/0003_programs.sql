create type program_group as enum ('poker','social','others');

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text,
  program_group program_group not null default 'poker',
  status text,
  member_count int not null default 0,
  location text,
  start_date date, end_date date,
  description text,
  cover_image text,
  manager_name text, manager_role text, manager_avatar text,
  cta_label text, entry_link text,
  external_url text,
  is_hot boolean not null default false,
  is_affiliate boolean not null default false,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.programs enable row level security;
create policy "auth write programs" on public.programs for all to authenticated using (true) with check (true);
create policy "public read programs" on public.programs for select using (deleted_at is null and is_visible);

create index programs_group_idx on public.programs (program_group, sort_order);
create index programs_hot_idx on public.programs (is_hot, sort_order);
