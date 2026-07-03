-- 0014_program_options.sql
-- P1-3: admin-managed program group/status option lists.
-- Group was a fixed enum (program_group) + hardcoded Korean labels; status was a
-- free-text column the form constrained to hardcoded keys. Operators now
-- add/edit/remove both option lists in the admin, so the lists move into a data
-- table and program_group drops its enum guardrail.

create table if not exists public.program_options (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('group','status')),
  value text not null,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (kind, value)
);

-- RLS: 인증 사용자 = 관리자 쓰기 + 소프트삭제 제외 공개 read (0002/0003 패턴).
-- 재실행 안전: 정책을 먼저 drop 후 다시 생성한다.
alter table public.program_options enable row level security;
drop policy if exists "auth write program_options" on public.program_options;
create policy "auth write program_options" on public.program_options for all to authenticated using (true) with check (true);
drop policy if exists "public read program_options" on public.program_options;
create policy "public read program_options" on public.program_options for select using (deleted_at is null);

-- updated_at 자동 갱신 트리거 (0004 패턴).
drop trigger if exists set_updated_at on public.program_options;
create trigger set_updated_at before update on public.program_options for each row execute function public.set_updated_at();

-- 현행 옵션 seed (idempotent). 라벨은 lib/labels.ts / lib/program-display.ts 현행값.
insert into public.program_options (kind, value, label, sort_order) values
  ('group',  'poker',      '포커', 10),
  ('group',  'social',     '소셜', 20),
  ('group',  'others',     '기타', 30),
  ('status', 'recruiting', '모집중', 10),
  ('status', 'ongoing',    '진행중', 20),
  ('status', 'closed',     '마감',   30),
  ('status', 'completed',  '종료',   40)
on conflict (kind, value) do nothing;

-- programs.program_group enum → text 전환 (0013 이벤트 상태 패턴).
-- 옵션이 데이터로 관리되므로 고정 enum 제약을 제거한다. 저장된 값은 그대로 보존된다.
alter table public.programs alter column program_group drop default;
alter table public.programs alter column program_group type text using program_group::text;
alter table public.programs alter column program_group set default 'poker';

-- program_group enum 타입은 이제 참조되지 않으므로 제거.
drop type if exists program_group;
