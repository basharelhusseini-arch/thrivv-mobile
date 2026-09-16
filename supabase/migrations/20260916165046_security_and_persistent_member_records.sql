-- Member writes go through the authenticated server API. Preserve existing rows and owner-only reads.
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
alter function public.update_user_health_profile_timestamp() set search_path = public, pg_temp;
alter function public.get_user_confidence_score(uuid) set search_path = public, pg_temp;
alter function public.update_custom_recipes_updated_at() set search_path = public, pg_temp;
alter function public.whoop_data_set_updated_at() set search_path = public, pg_temp;

create table public.member_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  fields jsonb not null check (jsonb_typeof(fields) = 'object'),
  created_at timestamptz not null default now(),
  unique(id, user_id)
);
create index member_habits_user on public.member_habits(user_id, created_at);
create table public.member_habit_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  habit_id uuid not null,
  date date not null,
  completed boolean not null,
  fields jsonb not null default '{}' check (jsonb_typeof(fields) = 'object'),
  completed_at timestamptz,
  foreign key(habit_id, user_id) references public.member_habits(id, user_id) on delete cascade,
  unique(habit_id, user_id, date)
);
create index member_habit_entries_user on public.member_habit_entries(user_id, date);
create table public.member_workout_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  workout_id text not null references public.workouts(id) on delete cascade,
  fields jsonb not null check (jsonb_typeof(fields) = 'object'),
  completed_at timestamptz not null default now()
);
create index member_workout_progress_user on public.member_workout_progress(user_id, workout_id, completed_at);
alter table public.member_habits enable row level security;
alter table public.member_habit_entries enable row level security;
alter table public.member_workout_progress enable row level security;
revoke all on public.member_habits, public.member_habit_entries, public.member_workout_progress from public, anon, authenticated;
grant select, insert, update, delete on public.member_habits, public.member_habit_entries, public.member_workout_progress to service_role;

create function public.thrivv_update_habit(p_user uuid, p_id uuid, p_fields jsonb)
returns jsonb language sql security invoker set search_path = public, pg_temp as $$
  update public.member_habits set fields = fields || p_fields where id = p_id and user_id = p_user returning to_jsonb(member_habits.*);
$$;
revoke all on function public.thrivv_update_habit(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.thrivv_update_habit(uuid,uuid,jsonb) to service_role;

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
