-- 0018: merge header_visible into is_visible (single "노출" flag).
--
-- The tabs table only drives the public header menu, so the two flags
-- ("노출" site-wide active + "헤더 노출" show-in-header) were redundant and
-- confused admins. A tab is now simply visible (in the header) or not.
--
-- DEPLOY ORDER: apply AFTER the app deploy that stops reading header_visible
-- (the old code's header query filters on it — dropping the column first
-- would empty the public nav).
--
-- Re-run guard: skips cleanly when the column is already gone.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'navigation_tabs'
      and column_name = 'header_visible'
  ) then
    -- A tab was actually shown only when BOTH flags were on.
    update public.navigation_tabs set is_visible = (is_visible and header_visible);
    alter table public.navigation_tabs drop column header_visible;
  end if;
end $$;
