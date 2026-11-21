-- Optional starter answers on the existing profile row.
-- Run in the Supabase SQL editor (Dashboard → SQL → New query) after
-- 001_pepstep_sync.sql. Safe to run more than once.
--
-- PepStep stores these answers on the device either way. Once this column
-- exists, a signed-in user's answers sync with the rest of the profile.
-- Until then, diary, workout, and goal sync keeps working and starter
-- answers stay on the device.
--
-- The row policies from 001 already limit profiles to auth.uid().
-- No new table and no service role key.

alter table public.profiles
  add column if not exists onboarding jsonb;

comment on column public.profiles.onboarding is
  'Optional starter answers (movement goal, experience, days per week, exercise comfort). Not medical information.';

notify pgrst, 'reload schema';
