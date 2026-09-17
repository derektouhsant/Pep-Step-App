-- PepStep cloud sync
-- Run in the Supabase SQL editor (Dashboard → SQL → New query) or via the Supabase CLI.
-- Users can only read/write their own rows (RLS). The anon key is safe in the browser
-- because these policies block cross-user access.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  goals jsonb not null default '{}'::jsonb,
  last_sets jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.diary_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  water integer not null default 0,
  meals jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table if not exists public.custom_foods (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  serving text not null default '1 serving',
  calories double precision not null default 0,
  carbs double precision not null default 0,
  protein double precision not null default 0,
  fat double precision not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.workout_sessions (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Workout',
  plan_id text,
  started_at timestamptz,
  finished_at timestamptz,
  exercises jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.workout_plans (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'Plan',
  source text not null default 'diy',
  exercises jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists diary_days_user_day_idx on public.diary_days (user_id, day);
create index if not exists custom_foods_user_idx on public.custom_foods (user_id);
create index if not exists workout_sessions_user_idx on public.workout_sessions (user_id, finished_at);
create index if not exists workout_plans_user_idx on public.workout_plans (user_id);

alter table public.profiles enable row level security;
alter table public.diary_days enable row level security;
alter table public.custom_foods enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_plans enable row level security;

drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "diary_days_own" on public.diary_days;
create policy "diary_days_own" on public.diary_days
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "custom_foods_own" on public.custom_foods;
create policy "custom_foods_own" on public.custom_foods
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "workout_sessions_own" on public.workout_sessions;
create policy "workout_sessions_own" on public.workout_sessions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "workout_plans_own" on public.workout_plans;
create policy "workout_plans_own" on public.workout_plans
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.diary_days to authenticated;
grant select, insert, update, delete on public.custom_foods to authenticated;
grant select, insert, update, delete on public.workout_sessions to authenticated;
grant select, insert, update, delete on public.workout_plans to authenticated;
