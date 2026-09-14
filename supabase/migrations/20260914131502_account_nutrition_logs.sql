-- Additive, account-scoped storage. Existing local logs are imported by their signed-in owner.
-- Application cookies authenticate through server routes; direct client access is denied.
create table public.nutrition_log_entries (
  user_id uuid not null references public.users(id) on delete cascade,
  entry_id text not null check (entry_id ~ '^[a-zA-Z0-9:_-]{1,128}$'),
  date date not null,
  meal jsonb not null check (jsonb_typeof(meal) = 'object'),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, entry_id)
);
create index nutrition_log_entries_user_date_idx on public.nutrition_log_entries (user_id, date, created_at) where deleted_at is null;
alter table public.nutrition_log_entries enable row level security;
revoke all on public.nutrition_log_entries from public, anon, authenticated, service_role;
grant select, insert, update on public.nutrition_log_entries to service_role;
comment on table public.nutrition_log_entries is 'Private nutrition entries. Tombstones prevent repeated local imports from restoring deleted meals. No reward or scoring triggers.';
