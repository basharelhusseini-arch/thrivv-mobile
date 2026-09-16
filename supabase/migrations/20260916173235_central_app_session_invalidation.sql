-- Password changes invalidate app cookies as well as Supabase sessions. No password is copied.
create table public.app_session_security (
  user_id uuid primary key references auth.users(id) on delete cascade,
  invalid_before timestamptz not null
);
alter table public.app_session_security enable row level security;
revoke all on public.app_session_security from public, anon, authenticated;
grant select on public.app_session_security to service_role;
grant select, insert, update on public.app_session_security to supabase_auth_admin;
create policy auth_security_state on public.app_session_security to supabase_auth_admin using (true) with check (true);
create function public.thrivv_password_changed() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if old.encrypted_password is distinct from new.encrypted_password then
    insert into public.app_session_security(user_id,invalid_before) values(new.id,clock_timestamp())
    on conflict(user_id) do update set invalid_before=excluded.invalid_before;
  end if;
  return new;
end; $$;
revoke all on function public.thrivv_password_changed() from public, anon, authenticated;
grant execute on function public.thrivv_password_changed() to supabase_auth_admin;
create trigger thrivv_password_changed after update of encrypted_password on auth.users
for each row execute function public.thrivv_password_changed();

-- Minimal read-only auth metadata for service-only validity checks; no credential access.
grant usage on schema auth to service_role;
grant select(id,banned_until) on auth.users to service_role;
grant select(id,user_id,created_at,not_after) on auth.sessions to service_role;
create function public.thrivv_session_valid(p_user uuid, p_issued_at double precision, p_session uuid default null)
returns boolean language sql stable security invoker set search_path = public, pg_temp as $$
  select exists (
    select 1 from auth.users u where u.id=p_user and (u.banned_until is null or u.banned_until <= now())
    and not exists (select 1 from public.app_session_security s where s.user_id=u.id and s.invalid_before >= to_timestamp(p_issued_at))
    and exists (select 1 from auth.sessions s where s.user_id=u.id and (s.not_after is null or s.not_after > now())
      and ((p_session is not null and s.id=p_session) or (p_session is null and s.created_at < to_timestamp(p_issued_at)+interval '1 second')))
  );
$$;
revoke all on function public.thrivv_session_valid(uuid,double precision,uuid) from public, anon, authenticated;
grant execute on function public.thrivv_session_valid(uuid,double precision,uuid) to service_role;
