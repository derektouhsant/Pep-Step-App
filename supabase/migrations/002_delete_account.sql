-- PepStep account deletion (Apple guideline 5.1.1(v))
--
-- Run this in the Supabase dashboard: SQL Editor → New query → paste this file → Run.
-- Do this after 001_pepstep_sync.sql. The app only has the anon key. It calls
-- supabase.rpc('delete_own_account') with the signed-in user's session.
-- Never put the service_role key in the PepStep app.
--
-- The function runs as the postgres role (security definer) and can delete only
-- auth.uid(). It removes that caller's rows from every PepStep user table, then
-- the auth user. Plan progress for the 16-week movement plan lives on
-- public.workout_plans (the program document, including the week cursor).
-- Tables in 001_pepstep_sync.sql also use on delete cascade from auth.users.
-- Apple Health samples are not stored here and are not deleted.
-- Until this function exists, the app shows an error and does not sign the user out
-- or clear synced data on the device.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  delete from public.diary_days where user_id = uid;
  delete from public.custom_foods where user_id = uid;
  delete from public.workout_sessions where user_id = uid;
  delete from public.workout_plans where user_id = uid;
  delete from public.profiles where user_id = uid;

  delete from auth.users where id = uid;
end;
$$;

alter function public.delete_own_account() owner to postgres;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;

comment on function public.delete_own_account() is
  'Deletes the signed-in user (auth.uid()) and their PepStep rows. Granted to authenticated only.';

notify pgrst, 'reload schema';
