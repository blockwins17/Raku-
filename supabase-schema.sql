-- Kumo schema (idempotent — safe to re-run).
-- Paste into Supabase → SQL Editor → New query → Run.

-- ──────────────── tasks (v1, already exists for most users) ────────────────
create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid,
  title      text not null,
  status     text not null default 'today'
             check (status in ('today', 'later', 'completed')),
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

drop policy if exists "anon read tasks"   on public.tasks;
drop policy if exists "anon insert tasks" on public.tasks;
drop policy if exists "anon update tasks" on public.tasks;

create policy "anon read tasks"   on public.tasks for select to anon using (true);
create policy "anon insert tasks" on public.tasks for insert to anon with check (true);
create policy "anon update tasks" on public.tasks for update to anon using (true) with check (true);

-- ──────────────── subtasks (for AI breakdown mode) ────────────────
create table if not exists public.subtasks (
  id                uuid primary key default gen_random_uuid(),
  parent_task_id    uuid references public.tasks(id) on delete cascade,
  user_id           uuid,
  title             text not null,
  estimated_minutes int  not null default 10,
  status            text not null default 'todo'
                    check (status in ('todo', 'doing', 'done')),
  order_index       int  not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists subtasks_parent_idx on public.subtasks(parent_task_id);

alter table public.subtasks enable row level security;

drop policy if exists "anon read subtasks"   on public.subtasks;
drop policy if exists "anon insert subtasks" on public.subtasks;
drop policy if exists "anon update subtasks" on public.subtasks;
drop policy if exists "anon delete subtasks" on public.subtasks;

create policy "anon read subtasks"   on public.subtasks for select to anon using (true);
create policy "anon insert subtasks" on public.subtasks for insert to anon with check (true);
create policy "anon update subtasks" on public.subtasks for update to anon using (true) with check (true);
create policy "anon delete subtasks" on public.subtasks for delete to anon using (true);

-- ──────────────── capture_raw (from Chrome extension) ────────────────
create table if not exists public.capture_raw (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid,
  mode        text not null,              -- 'organize_assignments' | 'explain_simple'
  source      text not null default 'extension_v0',
  url         text,
  course_name text,
  raw_text    text,
  created_at  timestamptz not null default now()
);

alter table public.capture_raw enable row level security;

drop policy if exists "anon read capture_raw"   on public.capture_raw;
drop policy if exists "anon insert capture_raw" on public.capture_raw;

create policy "anon read capture_raw"   on public.capture_raw for select to anon using (true);
create policy "anon insert capture_raw" on public.capture_raw for insert to anon with check (true);

-- ──────────────── sms_sessions (Twilio inbound tracker) ────────────────
create table if not exists public.sms_sessions (
  id           uuid primary key default gen_random_uuid(),
  phone        text unique not null,      -- E.164 phone #
  user_id      uuid,                      -- linked once auth exists
  last_inbound text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists sms_sessions_phone_idx on public.sms_sessions(phone);

alter table public.sms_sessions enable row level security;

drop policy if exists "anon read sms_sessions"   on public.sms_sessions;
drop policy if exists "anon insert sms_sessions" on public.sms_sessions;
drop policy if exists "anon update sms_sessions" on public.sms_sessions;

create policy "anon read sms_sessions"   on public.sms_sessions for select to anon using (true);
create policy "anon insert sms_sessions" on public.sms_sessions for insert to anon with check (true);
create policy "anon update sms_sessions" on public.sms_sessions for update to anon using (true) with check (true);

-- ──────────────── user_state (for pause / killswitch) ────────────────
create table if not exists public.user_state (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid unique,
  pause_until   timestamptz,
  pause_reason  text,
  updated_at    timestamptz not null default now()
);

alter table public.user_state enable row level security;

drop policy if exists "anon read user_state"   on public.user_state;
drop policy if exists "anon insert user_state" on public.user_state;
drop policy if exists "anon update user_state" on public.user_state;

create policy "anon read user_state"   on public.user_state for select to anon using (true);
create policy "anon insert user_state" on public.user_state for insert to anon with check (true);
create policy "anon update user_state" on public.user_state for update to anon using (true) with check (true);
