-- Add education content without changing dated session or attendance lifecycles.
begin;

alter table public.class_sessions
  add column title text not null default '' check (char_length(title) <= 120),
  add column description text not null default '' check (char_length(description) <= 4000);

create function public.save_class_session_content(p_class_id uuid, p_session_id uuid,
  p_expected_revision integer, p_title text, p_description text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  session public.class_sessions%rowtype;
  course public.classes%rowtype;
  saved public.class_sessions%rowtype;
  title_value text := nullif(btrim(p_title), '');
  description_value text := coalesce(btrim(p_description), '');
begin
  perform pg_advisory_xact_lock(hashtextextended('donuts:membership-write', 25));
  if auth.uid() is null or not public.can_review_affiliation('CLASS', p_class_id) then
    raise exception 'forbidden';
  end if;
  select * into session from public.class_sessions
    where id = p_session_id and class_id = p_class_id for update;
  if not found then raise exception 'invalid_entity'; end if;
  select * into course from public.classes where id = p_class_id for update;
  if course.archived_at is not null then raise exception 'entity_archived'; end if;
  if session.revision is distinct from p_expected_revision then raise exception 'stale_operation'; end if;
  if title_value is null or title_value !~ '[^[:space:]]' or char_length(title_value) > 120 or char_length(description_value) > 4000 then
    raise exception 'invalid_entity';
  end if;

  update public.class_sessions set title = title_value, description = description_value, revision = revision + 1
    where id = session.id returning * into saved;
  perform public.record_entity_operation('CLASS', session.class_id, 'SESSION_CONTENT_UPDATED', null,
    jsonb_build_object('title', session.title, 'description', session.description, 'revision', session.revision),
    jsonb_build_object('title', saved.title, 'description', saved.description, 'revision', saved.revision), session.id);
end $$;

-- Members can read an aggregate without gaining access to other affiliations or profiles.
create function public.get_club_member_count(p_club_id uuid) returns integer
language plpgsql stable security definer set search_path = '' as $$
declare result integer;
begin
  if auth.uid() is null or not (public.is_admin() or public.is_active_member()) then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.clubs where id = p_club_id) then raise exception 'invalid_entity'; end if;
  select count(*)::integer into result from public.club_memberships where club_id = p_club_id and active;
  return result;
end $$;

revoke all on function public.save_class_session_content(uuid, uuid, integer, text, text),
  public.get_club_member_count(uuid) from public, anon, authenticated;
grant execute on function public.save_class_session_content(uuid, uuid, integer, text, text),
  public.get_club_member_count(uuid) to authenticated;

commit;
