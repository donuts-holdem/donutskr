-- Minimal, non-destructive development seed after all migrations.
-- Never import the handoff demo passwords into Auth or production data.
insert into public.site_config (id) values (1) on conflict (id) do nothing;
