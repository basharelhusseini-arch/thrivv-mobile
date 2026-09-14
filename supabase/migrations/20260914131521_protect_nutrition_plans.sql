-- Existing plans are read and mutated through cookie-authenticated, owner-scoped server routes.
-- Preserve every row; remove direct Data API access and unnecessary privileged operations.
alter table public.nutrition_plans enable row level security;
revoke all on public.nutrition_plans from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.nutrition_plans to service_role;
