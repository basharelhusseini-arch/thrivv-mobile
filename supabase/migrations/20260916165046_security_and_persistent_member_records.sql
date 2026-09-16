-- Member writes go through the authenticated server API. Preserve existing rows and owner-only reads.
revoke insert, update, delete, truncate, references, trigger on public.custom_recipes, public.health_scores, public.risk_user_features, public.user_health_profile, public.verification_events, public.wearable_interest_leads, public.whoop_data, public.workout_plans, public.workouts from anon, authenticated;
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
