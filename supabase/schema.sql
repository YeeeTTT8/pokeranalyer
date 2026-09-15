-- Poker Assistant — Supabase schema.
-- Paste this whole file into the Supabase SQL Editor and click "Run".
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE and drops policies first).

-- ---------------------------------------------------------------------------
-- Tables. Each row is owned by the authenticated user (owner = auth.uid()).
-- The app's own string ids are the primary keys; the JSONB columns keep the
-- existing client data model unchanged.
-- ---------------------------------------------------------------------------
create table if not exists public.sessions (
  id             text primary key,
  owner          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date           text,
  name           text default '',
  default_buy_in numeric default 0,
  players        jsonb not null default '[]'::jsonb,
  created_at     bigint,
  updated_at     timestamptz not null default now()
);

create table if not exists public.hands (
  id         text primary key,
  owner      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  hero       jsonb not null default '[]'::jsonb,
  board      jsonb not null default '[]'::jsonb,
  equity     numeric,
  opponents  integer,
  assumption text,
  result     text,
  notes      text default '',
  saved_at   bigint,
  updated_at timestamptz not null default now()
);

create index if not exists sessions_owner_idx on public.sessions(owner);
create index if not exists hands_owner_idx    on public.hands(owner);

-- ---------------------------------------------------------------------------
-- Row Level Security: a user can only see and modify their own rows.
-- ---------------------------------------------------------------------------
alter table public.sessions enable row level security;
alter table public.hands    enable row level security;

drop policy if exists "sessions own select" on public.sessions;
drop policy if exists "sessions own insert" on public.sessions;
drop policy if exists "sessions own update" on public.sessions;
drop policy if exists "sessions own delete" on public.sessions;

create policy "sessions own select" on public.sessions
  for select using (owner = auth.uid());
create policy "sessions own insert" on public.sessions
  for insert with check (owner = auth.uid());
create policy "sessions own update" on public.sessions
  for update using (owner = auth.uid()) with check (owner = auth.uid());
create policy "sessions own delete" on public.sessions
  for delete using (owner = auth.uid());

drop policy if exists "hands own select" on public.hands;
drop policy if exists "hands own insert" on public.hands;
drop policy if exists "hands own update" on public.hands;
drop policy if exists "hands own delete" on public.hands;

create policy "hands own select" on public.hands
  for select using (owner = auth.uid());
create policy "hands own insert" on public.hands
  for insert with check (owner = auth.uid());
create policy "hands own update" on public.hands
  for update using (owner = auth.uid()) with check (owner = auth.uid());
create policy "hands own delete" on public.hands
  for delete using (owner = auth.uid());

-- ---------------------------------------------------------------------------
-- Realtime: let the app receive live changes to your own rows across devices.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sessions'
  ) then
    alter publication supabase_realtime add table public.sessions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'hands'
  ) then
    alter publication supabase_realtime add table public.hands;
  end if;
end $$;
