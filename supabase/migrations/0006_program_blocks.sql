-- Phase 5: structured block editor for program descriptions.
-- Additive + reversible. The legacy `description` text column is retained and
-- remains the public fallback until a program is verified. Public output is
-- unchanged until an operator flips `description_verified` per program.
--
-- Rollback:
--   alter table public.programs drop column if exists description_verified;
--   alter table public.programs drop column if exists description_blocks;

alter table public.programs
  add column if not exists description_blocks jsonb;

alter table public.programs
  add column if not exists description_verified boolean not null default false;
