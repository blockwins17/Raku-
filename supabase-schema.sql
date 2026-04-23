-- Raku tasks schema
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It's idempotent — safe to re-run.

create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid,
  title      text not null,
  status     text not null default 'today'
             check (status in ('today', 'later', 'completed')),
  created_at timestamptz not null default now()
);

-- Row Level Security on, with temporary anon-wide-open policies.
-- We'll tighten these when we add auth.
alter table public.tasks enable row level security;

drop policy if exists "anon read tasks"   on public.tasks;
drop policy if exists "anon insert tasks" on public.tasks;
drop policy if exists "anon update tasks" on public.tasks;

create policy "anon read tasks"
  on public.tasks for select
  to anon
  using (true);

create policy "anon insert tasks"
  on public.tasks for insert
  to anon
  with check (true);

create policy "anon update tasks"
  on public.tasks for update
  to anon
  using (true)
  with check (true);
