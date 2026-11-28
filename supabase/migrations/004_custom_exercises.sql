-- Custom exercises a person adds when the move is not in the PepStep library.
-- Run in the Supabase SQL editor (Dashboard → SQL → New query) after
-- 001_pepstep_sync.sql. Safe to run more than once.
--
-- Until this table exists, PepStep keeps those exercises on the device
-- and the rest of diary and workout sync still works.
-- Custom foods already live in public.custom_foods from 001.
--
-- The anon key stays in the app. This script never uses the service role.
-- Each signed-in user can only select, insert, update, and delete their own rows.
-- Deleting the auth user removes these rows (on delete cascade), including
-- through delete_own_account(), which deletes auth.users.

create table if not exists public.custom_exercises (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  body_part text not null default 'full-body',
  log text not null default 'strength',
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'custom_exercises_log_check'
      and conrelid = 'public.custom_exercises'::regclass
  ) then
    alter table public.custom_exercises
      add constraint custom_exercises_log_check
      check (log in ('strength', 'duration'));
  end if;
end $$;

create index if not exists custom_exercises_user_idx on public.custom_exercises (user_id);

alter table public.custom_exercises enable row level security;

drop policy if exists "custom_exercises_own" on public.custom_exercises;
create policy "custom_exercises_own" on public.custom_exercises
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on table public.custom_exercises from public;
revoke all on table public.custom_exercises from anon;
grant select, insert, update, delete on table public.custom_exercises to authenticated;

comment on table public.custom_exercises is
  'Exercises a user added because they were not in the PepStep library. Owner-only via RLS.';

-- Per-serving macros for foods a person adds. These columns already exist
-- when 001_pepstep_sync.sql has been run. The adds are safe to repeat.
alter table public.custom_foods
  add column if not exists serving text not null default '1 serving',
  add column if not exists calories double precision not null default 0,
  add column if not exists carbs double precision not null default 0,
  add column if not exists protein double precision not null default 0,
  add column if not exists fat double precision not null default 0;

comment on column public.custom_foods.calories is 'Calories for one serving.';
comment on column public.custom_foods.protein is 'Protein grams for one serving.';
comment on column public.custom_foods.carbs is 'Carbohydrate grams for one serving.';
comment on column public.custom_foods.fat is 'Fat grams for one serving.';
comment on column public.custom_foods.serving is 'Serving size label, such as 1 cup or 100 g.';

notify pgrst, 'reload schema';
